// El buscador de lugares: completa lo que se escribe con Photon, un buscador abierto sobre OpenStreetMap, sin clave.
// La web no le habla directamente: pasa por aquí, que solo deja pedir esto y recorta lo que vuelve. Qué vale como
// destino, y qué se comprueba de cada uno antes de darlo, está en `lib/lugares.ts`.

import { frenoDeLugares, quienPide } from "../../../lib/freno.ts";
import { lugarDe, nombreDelPais, origenDe, paisesQueEmpiezan, rangoDe, type Lugar } from "../../../lib/lugares.ts";

export const dynamic = "force-dynamic";

/** El freno de este servidor: lo que pide cada cliente y toda la web al buscador, por ventana. */
const freno = frenoDeLugares();

/** Le pide algo al buscador. Si no se llega a él, lo intenta una vez más: es un servicio abierto y a ratos falla. */
async function alBuscador(direccion: string): Promise<Response> {
  const pide = (): Promise<Response> =>
    fetch(direccion, { headers: { "User-Agent": "eldorado-web/0.1" }, signal: AbortSignal.timeout(6000) });
  try {
    return await pide();
  } catch {
    return pide();
  }
}

/** Lo que hay en un punto, para proponer de dónde sale quien deja ver dónde está. El punto no se guarda. */
async function cerca(lat: number, lon: number): Promise<Response> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return Response.json({ origen: null }, { status: 400 });
  // Con dos decimales basta para saber la ciudad, y no se manda fuera el punto exacto de nadie.
  const direccion = `https://photon.komoot.io/reverse?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
  try {
    const r = await alBuscador(direccion);
    if (!r.ok) return Response.json({ origen: null }, { status: 502 });
    const datos = (await r.json()) as { features?: unknown } | null;
    const primero = Array.isArray(datos?.features) ? datos.features[0] : null;
    return Response.json({ origen: origenDe(primero) });
  } catch {
    return Response.json({ origen: null }, { status: 502 });
  }
}

/** Los países ya pedidos, por su código: no cambian, y así no se le pide lo mismo al buscador a cada letra. */
const paisesVistos = new Map<string, Lugar | null>();

/**
 * Un país, pedido al buscador por su nombre en inglés, que entiende, y dado con su nombre en el idioma de quien busca.
 * Solo vale el resultado que es ese país (su etiqueta y su código).
 */
async function pais(p: { codigo: string; nombre: string; ingles: string }): Promise<Lugar | null> {
  if (paisesVistos.has(p.codigo)) {
    const visto = paisesVistos.get(p.codigo) ?? null;
    return visto === null ? null : { ...visto, nombre: p.nombre };
  }
  const direccion =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(p.ingles)}&lang=en&limit=5` + "&osm_tag=place:country";
  try {
    const r = await alBuscador(direccion);
    if (!r.ok) return null;
    const datos = (await r.json()) as { features?: unknown } | null;
    const suyo = (Array.isArray(datos?.features) ? datos.features : [])
      .map((f) => lugarDe(f))
      .find((l) => l !== null && l.clase === "country" && l.pais === p.codigo);
    const lugar = suyo === undefined || suyo === null ? null : { ...suyo, nombre: p.nombre, donde: "" };
    paisesVistos.set(p.codigo, lugar);
    return lugar;
  } catch {
    return null;
  }
}

export async function GET(pedido: Request): Promise<Response> {
  const url = new URL(pedido.url);
  const cliente = quienPide(pedido.headers.get("x-forwarded-for") ?? pedido.headers.get("x-real-ip"));
  const espera = freno.pasa(cliente);
  if (espera > 0)
    return Response.json(
      { lugares: [], origen: null, error: "busy", wait: espera },
      { status: 429, headers: { "retry-after": String(espera) } },
    );
  const punto = url.searchParams.get("near");
  if (punto !== null) {
    const [lat, lon] = punto.split(",").map((x) => (x.trim() === "" ? Number.NaN : Number(x)));
    return cerca(lat ?? Number.NaN, lon ?? Number.NaN);
  }
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const idioma = url.searchParams.get("lang") === "es" ? "es" : "en";
  if (q.length < 2) return Response.json({ lugares: [] });
  // Photon habla inglés, alemán y francés: lo demás se pide en el idioma de cada sitio.
  const lang = idioma === "en" ? "&lang=en" : "";
  const direccion = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12${lang}`;
  try {
    // Los países cuyo nombre en tu idioma empieza por lo escrito, a la vez que lo demás.
    const [r, paises] = await Promise.all([
      alBuscador(direccion),
      Promise.all(paisesQueEmpiezan(q, idioma).map((p) => pais(p))),
    ]);
    if (!r.ok) return Response.json({ lugares: [], error: `el buscador contesta ${r.status}` }, { status: 502 });
    const datos = (await r.json()) as { features?: unknown } | null;
    const lugares: Lugar[] = paises.filter((l): l is Lugar => l !== null);
    // Lo grande antes que lo pequeño, sin cambiar el orden del buscador entre los del mismo tamaño.
    const resultados = (Array.isArray(datos?.features) ? [...datos.features] : [])
      .map((f, i) => ({ f, i, rango: rangoDe(f) }))
      .sort((a, b) => a.rango - b.rango || a.i - b.i)
      .map((x) => x.f);
    for (const resultado of resultados) {
      const crudo = lugarDe(resultado);
      if (crudo === null) continue;
      // Un país, con su nombre en tu idioma.
      const lugar =
        crudo.clase === "country" ? { ...crudo, nombre: nombreDelPais(crudo.pais, idioma, crudo.nombre) } : crudo;
      if (lugares.some((l) => l.nombre === lugar.nombre && l.donde === lugar.donde)) continue;
      // El país que ya salió por su nombre no sale otra vez con el suyo.
      if (lugar.clase === "country" && lugares.some((l) => l.clase === "country" && l.pais === lugar.pais)) continue;
      lugares.push(lugar);
    }
    return Response.json({ lugares: lugares.slice(0, 6) });
  } catch {
    return Response.json({ lugares: [], error: "el buscador no responde" }, { status: 502 });
  }
}
