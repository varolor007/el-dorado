// El buscador de lugares: completa lo que se escribe con Photon, un buscador abierto sobre OpenStreetMap, sin clave.
// La web no le habla directamente: pasa por aquí, que solo deja pedir esto y recorta lo que vuelve. Qué vale como
// destino, y qué se comprueba de cada uno antes de darlo, está en `lib/lugares.ts`.

import { frenoDeLugares, quienPide } from "../../../lib/freno.ts";
import { lugarDe, origenDe, type Lugar } from "../../../lib/lugares.ts";

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
    const r = await alBuscador(direccion);
    if (!r.ok) return Response.json({ lugares: [], error: `el buscador contesta ${r.status}` }, { status: 502 });
    const datos = (await r.json()) as { features?: unknown } | null;
    const lugares: Lugar[] = [];
    for (const resultado of Array.isArray(datos?.features) ? datos.features : []) {
      const lugar = lugarDe(resultado);
      if (lugar === null) continue;
      if (lugares.some((l) => l.nombre === lugar.nombre && l.donde === lugar.donde)) continue;
      lugares.push(lugar);
    }
    return Response.json({ lugares: lugares.slice(0, 6) });
  } catch {
    return Response.json({ lugares: [], error: "el buscador no responde" }, { status: 502 });
  }
}
