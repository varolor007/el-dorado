// El viaje grabado, para la web en seco. Lleva datos de una búsqueda de verdad, así que no vive en el repositorio:
// en una máquina de trabajo se lee de la mesa; en una web desplegada, de la dirección privada que diga el entorno
// (ELDORADO_GRABADO_URL). Si no hay ninguno, lo dice, y la web enseña solo el mapa del mundo.

import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grabadoQueVale } from "../../../lib/grabado.ts";

export const dynamic = "force-dynamic";

const CABECERAS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const SIN_VIAJE = { error: "no hay ningún viaje grabado" };

async function deFuera(direccion: string): Promise<Response> {
  try {
    const r = await fetch(direccion, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const grabado = grabadoQueVale(r.ok ? await r.json() : null);
    if (grabado === null) return Response.json(SIN_VIAJE, { status: 404 });
    return new Response(JSON.stringify(grabado), { headers: CABECERAS });
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
    const grabado = grabadoQueVale({ viaje: JSON.parse(viaje), sucesos: JSON.parse(sucesos) });
    if (grabado === null) return Response.json(SIN_VIAJE, { status: 404 });
    return new Response(JSON.stringify(grabado), { headers: CABECERAS });
  } catch {
    return Response.json(SIN_VIAJE, { status: 404 });
  }
}
