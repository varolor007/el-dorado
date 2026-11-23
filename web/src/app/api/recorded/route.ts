// El viaje grabado, para la web en seco. Lleva datos de una búsqueda de verdad, así que no vive en el repositorio:
// en una máquina de trabajo se lee de la mesa; en una web desplegada, de la dirección privada que diga el entorno
// (ELDORADO_GRABADO_URL). Si no hay ninguno, lo dice, y la web enseña solo el mapa del mundo.

import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const CABECERAS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const SIN_VIAJE = { error: "no hay ningún viaje grabado" };

/** Lo que llega de fuera solo vale si tiene la forma de un viaje grabado: un viaje y sus sucesos. */
function vale(dato: unknown): dato is { viaje: object; sucesos: unknown[] } {
  const d = dato as { viaje?: unknown; sucesos?: unknown } | null;
  return (
    d !== null && typeof d === "object" && typeof d.viaje === "object" && d.viaje !== null && Array.isArray(d.sucesos)
  );
}

async function deFuera(direccion: string): Promise<Response> {
  try {
    const r = await fetch(direccion, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const dato: unknown = r.ok ? await r.json() : null;
    if (!vale(dato)) return Response.json(SIN_VIAJE, { status: 404 });
    return new Response(JSON.stringify({ viaje: dato.viaje, sucesos: dato.sucesos }), { headers: CABECERAS });
  } catch {
    return Response.json(SIN_VIAJE, { status: 404 });
  }
}

export async function GET(): Promise<Response> {
  const direccion = process.env.ELDORADO_GRABADO_URL;
  if (direccion !== undefined && direccion.startsWith("https://")) return deFuera(direccion);
  const mesa = process.env.ELDORADO_MESA ?? join(tmpdir(), "el-dorado-mesa");
  try {
    const [viaje, sucesos] = await Promise.all(
      ["viaje.json", "sucesos.json"].map((nombre) => readFile(join(mesa, "grabado", nombre), "utf8")),
    );
    return new Response(`{"viaje":${viaje},"sucesos":${sucesos}}`, { headers: CABECERAS });
  } catch {
    return Response.json(SIN_VIAJE, { status: 404 });
  }
}
