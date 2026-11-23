// El viaje grabado, para la web en seco. Vive en la mesa, fuera del repositorio, porque lleva datos de una búsqueda
// de verdad; aquí solo se lee. Si no hay ninguno grabado, lo dice.

import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const mesa = process.env.ELDORADO_MESA ?? join(tmpdir(), "el-dorado-mesa");
  try {
    const [viaje, sucesos] = await Promise.all(
      ["viaje.json", "sucesos.json"].map((nombre) => readFile(join(mesa, "grabado", nombre), "utf8")),
    );
    return new Response(`{"viaje":${viaje},"sucesos":${sucesos}}`, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "no hay ningún viaje grabado en la mesa" }, { status: 404 });
  }
}
