// La puerta de la casa, vista desde el navegador: todo lo que la web le pide a la casa pasa por aquí. La llave de
// la web y la sesión del viajero no bajan nunca al navegador. Lo que se admite y cómo, en `lib/casa.ts`.

import { aLaCasa, type DeLaWeb } from "../../../../lib/casa.ts";

export const dynamic = "force-dynamic";

async function pasa(peticion: Request, contexto: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await contexto.params;
  const direccion = new URL(peticion.url);
  const p: DeLaWeb = {
    metodo: peticion.method,
    partes: path,
    consulta: direccion.search,
    cabeceras: {
      origen: peticion.headers.get("origin"),
      sitio: peticion.headers.get("host"),
      tipo: peticion.headers.get("content-type"),
      cookie: peticion.headers.get("cookie"),
    },
    cuerpo: peticion.method === "GET" ? null : await peticion.text(),
  };
  const r = await aLaCasa(p, process.env);
  const cabeceras = new Headers({ "content-type": r.tipo, "cache-control": "no-store" });
  if (r.cookie !== null) cabeceras.append("set-cookie", r.cookie);
  if (typeof r.cuerpo !== "string" && r.cuerpo !== null) cabeceras.set("x-accel-buffering", "no");
  return new Response(r.cuerpo, { status: r.estado, headers: cabeceras });
}

export { pasa as GET, pasa as POST, pasa as PUT, pasa as DELETE };
