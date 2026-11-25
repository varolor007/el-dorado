// El de las entradas (14.4) en código, sin nada de Node: lo que dicen los datos abiertos de cada sitio, la forma de
// lo que entrega su asiento (`tickets`) y cómo se pasa a la del viaje. La forma mínima la dejó el suelo (14.1); su
// sesión la afina con su contrato y su puerta 13, y trae los datos abiertos de verdad (OpenStreetMap y Wikidata).

import type { DeLasEntradas, EntradaDeUnSitio, FuenteDeUnDato } from "../output/capas.ts";
import { fuenteDe, horarioDe, preciosDe, type HorarioEntregado, type PrecioEntregado } from "./capas.ts";
import type { SIN_SABER } from "./formas.ts";

type NoSe = typeof SIN_SABER;

/**
 * Lo que dicen los datos abiertos de un sitio, sin leer su web: su horario tal cual lo da la fuente (en OpenStreetMap,
 * su `opening_hours`), si se paga, su web oficial y de dónde sale cada cosa. Lo que no dicen es null.
 */
export type DatosAbiertos = {
  sitio: string;
  horario: string | null;
  dePago: boolean | null;
  web: string | null;
  fuentes: FuenteDeUnDato[];
};

export type EntregaDeLasEntradas = {
  seat: "tickets";
  /** Cada sitio que se le dio, por su id: lo que cuesta para el grupo, cuándo abre y si hay que reservar. */
  sights: {
    id: string;
    prices: PrecioEntregado[] | NoSe;
    hours: HorarioEntregado[] | NoSe;
    booking: { needed: boolean; where: string | NoSe; source: string; seen: string } | NoSe;
    official_site: string | NoSe;
  }[];
  unknowns: string[];
};

/**
 * Lo que se enseña de lo que entregaron sus llamadas, en la forma del viaje: cada sitio de cada tanda que entregó, y
 * los que no se miraron (pasaron del tope, o su tanda falló), con lo que dicen los datos abiertos.
 */
export function paraEnsenarEntradas(
  entregas: (EntregaDeLasEntradas | null)[],
  sinMirar: string[],
  abiertos: DatosAbiertos[],
): DeLasEntradas {
  const sitios: EntradaDeUnSitio[] = entregas.flatMap((e) =>
    (e?.sights ?? []).map((s) => ({
      parada: s.id,
      precios: preciosDe(s.prices),
      horarios: s.hours === "unknown" ? null : s.hours.map(horarioDe),
      reservar:
        s.booking === "unknown"
          ? null
          : {
              haceFalta: s.booking.needed,
              donde: s.booking.where === "unknown" ? null : s.booking.where,
              fuente: fuenteDe(s.booking),
            },
      web: s.official_site === "unknown" ? null : s.official_site,
      mirado: true,
    })),
  );
  for (const id of sinMirar) {
    if (sitios.some((s) => s.parada === id)) continue;
    const a = abiertos.find((x) => x.sitio === id);
    sitios.push({ parada: id, precios: null, horarios: null, reservar: null, web: a?.web ?? null, mirado: false });
  }
  return { sitios, falta: null };
}
