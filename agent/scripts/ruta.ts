// Lo que el código hace alrededor del asiento de la ruta: le cuenta los días, le prepara los sitios de los datos
// abiertos y, cuando entrega, pone a cada zona su centro (el punto medio de sus anclas) y lo que se anda desde él
// hasta lo que nombra. El asiento decide dónde dormir; las cuentas son de aquí.

import { LUGARES_PARA_LA_RUTA } from "../data/ruta.ts";
import { centroDe, minutosEntre } from "../tools/distancias.ts";
import type { Sitio } from "../tools/sitios.ts";
import type { EntregaDeRuta, Lugar, ZonaResuelta } from "./formas.ts";
import { fechasDe } from "./ritmo.ts";

const DIAS_DE_LA_SEMANA = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type Dias = { nights: number; days: { date: string; weekday: string }[] };

/** Los días del viaje, contados: las noches y cada día con su fecha y su día de la semana. */
export function diasDe(entrada: string, salida: string): Dias {
  const fechas = fechasDe(entrada, salida);
  if (fechas.length < 2) throw new Error("la salida tiene que ser después de la entrada");
  return {
    nights: fechas.length - 1,
    days: fechas.map((date) => ({ date, weekday: DIAS_DE_LA_SEMANA[new Date(date + "T00:00:00Z").getUTCDay()] })),
  };
}

/** Un sitio de los datos abiertos, como se le da a un asiento. Lo que dice su artículo, si se tiene, va detrás. */
export function lugarDe(s: Sitio, resumen?: string): Lugar {
  const about = [s.descripcion, resumen].filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return {
    id: s.id,
    name: s.nombre,
    kind: s.clase,
    lat: s.punto.lat,
    lon: s.punto.lon,
    popularity: s.enlaces,
    about: about.length === 0 ? "unknown" : about.join(" "),
    source: s.articulo ?? `https://www.wikidata.org/wiki/${s.id}`,
  };
}

/** Los sitios que se le dan al asiento de la ruta: los más conocidos, hasta su tope. */
export function lugaresParaLaRuta(sitios: Sitio[]): Lugar[] {
  return sitios.slice(0, LUGARES_PARA_LA_RUTA).map((s) => lugarDe(s));
}

/**
 * Las zonas de una ruta ya entregada, con sus cuentas: el centro de cada una y los minutos andando desde él hasta
 * cada sitio que nombra. Solo se llama con una entrega que pasó su puerta: aquí un ancla que no existe es un error.
 */
export function resolverZonas(entrega: EntregaDeRuta, lugares: Lugar[]): ZonaResuelta[] {
  const porId = new Map(lugares.map((l) => [l.id, l]));
  const lugar = (id: string): Lugar => {
    const l = porId.get(id);
    if (l === undefined) throw new Error(`la ruta nombra ${id}, que no está en los datos`);
    return l;
  };
  return entrega.bases.flatMap((base) =>
    base.zones.map((z) => {
      const centre = centroDe(z.anchors.map(lugar));
      return {
        id: z.id,
        base: base.id,
        name: z.name,
        label: z.anchors.map((id) => lugar(id).name).join(", "),
        centre: { lat: Number(centre.lat.toFixed(6)), lon: Number(centre.lon.toFixed(6)) },
        radius_m: z.radius_m,
        why: z.why,
        near: z.near.map((id) => ({ id, name: lugar(id).name, walk_minutes: minutosEntre(centre, lugar(id)) })),
      };
    }),
  );
}
