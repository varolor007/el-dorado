// El buscador de lugares: completa lo que se escribe con Photon, un buscador abierto sobre OpenStreetMap, sin clave.
// La web no le habla directamente: pasa por aquí, que solo deja pedir esto y recorta lo que vuelve. Qué vale como
// destino, y qué se comprueba de cada uno antes de darlo, está en `lib/lugares.ts`.

import { lugarDe, type Lugar } from "../../../lib/lugares.ts";

export const dynamic = "force-dynamic";

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
