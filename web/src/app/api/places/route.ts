// El buscador de lugares: completa lo que se escribe con Photon, un buscador abierto sobre OpenStreetMap, sin clave.
// La web no le habla directamente: pasa por aquí, que solo deja pedir esto y recorta lo que vuelve.

export const dynamic = "force-dynamic";

type Lugar = { nombre: string; donde: string; clase: string; lat: number; lon: number; caja: number[] | null };

const VALEN = new Set(["city", "town", "village", "country", "state", "county", "island", "locality", "district"]);

export async function GET(pedido: Request): Promise<Response> {
  const url = new URL(pedido.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const idioma = url.searchParams.get("lang") === "es" ? "es" : "en";
  if (q.length < 2) return Response.json({ lugares: [] });
  // Photon habla inglés, alemán y francés: lo demás se pide en el idioma de cada sitio.
  const lang = idioma === "en" ? "&lang=en" : "";
  const direccion = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12${lang}`;
  try {
    const r = await fetch(direccion, {
      headers: { "User-Agent": "eldorado-web/0.1" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return Response.json({ lugares: [], error: `el buscador contesta ${r.status}` }, { status: 502 });
    const datos = (await r.json()) as {
      features?: { geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> }[];
    };
    const lugares: Lugar[] = [];
    for (const f of datos.features ?? []) {
      const p = f.properties ?? {};
      const [lon, lat] = f.geometry?.coordinates ?? [];
      const clase = String(p.type ?? p.osm_value ?? "");
      if (typeof p.name !== "string" || typeof lat !== "number" || typeof lon !== "number" || !VALEN.has(clase))
        continue;
      const donde = [p.state, p.country].filter((x) => typeof x === "string" && x !== p.name).join(", ");
      if (lugares.some((l) => l.nombre === p.name && l.donde === donde)) continue;
      const caja = Array.isArray(p.extent) && p.extent.length === 4 ? (p.extent as number[]) : null;
      lugares.push({ nombre: p.name, donde, clase, lat, lon, caja });
    }
    return Response.json({ lugares: lugares.slice(0, 6) });
  } catch {
    return Response.json({ lugares: [], error: "el buscador no responde" }, { status: 502 });
  }
}
