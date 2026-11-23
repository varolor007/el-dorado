// El enchufe de Parallel: alojamientos de una zona con la oferta de cada vendedor (el precio de esas noches y su
// enlace). Su búsqueda es por zona, no por nombre: cuál es cuál se sabe casando por posición (scripts/cruce.ts).
// Sus condiciones no dejan guardar resultados para otros viajeros: lo que devuelve vive solo en el run que lo pidió.

import { ahora, clave, lista, numero, objeto, pedirJson, texto } from "./http.ts";
import type { Estancia, OfertaDeZona } from "./tipos.ts";

const BASE = "https://api.parallel.ai/v1";
const NOMBRE = "parallel";

const cabeceras = (): Record<string, string> => ({ "x-api-key": clave("PARALLEL_API_KEY") });

export type TipoDeAlojamiento = "hotel" | "vacation_rental";

export function leerOfertas(json: unknown, visto: string): OfertaDeZona[] {
  const salida: OfertaDeZona[] = [];
  for (const crudo of lista(objeto(json).results)) {
    const r = objeto(crudo);
    const nombre = texto(r.name);
    if (nombre === null) continue;
    const ofertas: OfertaDeZona["ofertas"] = [];
    for (const o of lista(r.offers)) {
      const oferta = objeto(o);
      ofertas.push({
        vendedor: texto(oferta.seller),
        total: numero(oferta.total_price),
        moneda: texto(oferta.currency),
        cancelable: typeof oferta.free_cancellation === "boolean" ? oferta.free_cancellation : null,
        enlace: texto(oferta.url),
      });
    }
    salida.push({
      fuente: NOMBRE,
      visto,
      nombre,
      lat: numero(r.latitude),
      lon: numero(r.longitude),
      tipo: texto(r.property_type),
      estrellas: numero(r.hotel_class),
      nivel: texto(r.rating),
      ofertas,
    });
  }
  return salida;
}

export function cuerpoDeZona(
  lugar: string,
  e: Estancia,
  tipos: TipoDeAlojamiento[],
  cuantos: number,
): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    location: lugar,
    check_in_date: e.entrada,
    check_out_date: e.salida,
    adults: e.adultos,
    property_types: tipos,
    currency: e.moneda,
    advanced_settings: { max_results: cuantos },
  };
  if (e.ninos.length > 0) cuerpo.children_ages = e.ninos;
  return cuerpo;
}

/** Los alojamientos de una zona dicha con palabras (un sitio y su ciudad), con sus ofertas. Cuarenta como mucho. */
export async function ofertasDeZona(
  lugar: string,
  e: Estancia,
  tipos: TipoDeAlojamiento[] = ["hotel"],
): Promise<OfertaDeZona[]> {
  const cuerpo = cuerpoDeZona(lugar, e, tipos, 40);
  const json = await pedirJson(NOMBRE, `${BASE}/hotels/search`, {
    metodo: "POST",
    cuerpo,
    cabeceras: cabeceras(),
    esperaMs: 90_000,
  });
  return leerOfertas(json, ahora());
}
