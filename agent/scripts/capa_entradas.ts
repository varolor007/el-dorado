// El de las entradas (14.4) en código, sin nada de Node: lo que dicen los datos abiertos de cada sitio, la forma de
// lo que entrega su asiento (`tickets`), cómo se pasa a la del viaje y los días del viaje que cierra cada parada, que
// usan el ritmo y la puerta 9 en la casa y en la web.

import type { SinMirar } from "../data/capas.ts";
import type { DeLasEntradas, EntradaDeUnSitio, FuenteDeUnDato, Horario, PrecioDeCapa } from "../output/capas.ts";
import { formaNormal } from "../tools/enlaces.ts";
import { leerHorarioDeOsm } from "../tools/horarios.ts";
import { diasQueCierra, fuenteDe, horarioDe, preciosDe, type HorarioEntregado, type PrecioEntregado } from "./capas.ts";
import { SIN_SABER } from "./formas.ts";
import { fechasDe } from "./ritmo.ts";

type NoSe = typeof SIN_SABER;

/**
 * Lo que dicen los datos abiertos de un sitio, sin leer su web: su horario tal cual lo da la fuente (en OpenStreetMap,
 * su `opening_hours`), si se paga, su web oficial y de dónde sale cada cosa. Lo que no dicen es null. `de` dice la
 * página de cada dato; sin ella, vale la primera de `fuentes`.
 */
export type DatosAbiertos = {
  sitio: string;
  horario: string | null;
  dePago: boolean | null;
  web: string | null;
  fuentes: FuenteDeUnDato[];
  de?: { horario?: FuenteDeUnDato; pago?: FuenteDeUnDato; web?: FuenteDeUnDato };
};

/** Si hay que reservar, como lo da una página: si hace falta, dónde (una dirección, o «unknown») y la página. */
export type ReservaEntregada = { needed: boolean; where: string | NoSe; source: string; seen: string };

/** Lo que entrega de un sitio: lo que cuesta para el grupo, cuándo abre, si hay que reservar y su web oficial. */
export type SitioEntregado = {
  id: string;
  prices: PrecioEntregado[] | NoSe;
  hours: HorarioEntregado[] | NoSe;
  booking: ReservaEntregada | NoSe;
  official_site: string | NoSe;
};

export type EntregaDeLasEntradas = {
  seat: "tickets";
  /** Cada sitio que se le dio, por su id, una vez: lo que cuesta para el grupo, cuándo abre y si hay que reservar. */
  sights: SitioEntregado[];
  unknowns: string[];
};

/** La página de un dato de los abiertos: la suya, si la dicen, o la primera de sus fuentes. */
const paginaDe = (a: DatosAbiertos, dato: "horario" | "pago" | "web"): FuenteDeUnDato | null =>
  a.de?.[dato] ?? a.fuentes[0] ?? null;

/**
 * Los horarios que dicen los datos abiertos de un sitio, en la forma del viaje: lo que se entiende de su horario, para
 * todo el año y con su página. Lo que no se entiende, o sin página de donde sale, no se sabe: null.
 */
export function horariosAbiertos(a: DatosAbiertos | undefined): Horario[] | null {
  if (a === undefined) return null;
  const franjas = leerHorarioDeOsm(a.horario);
  const fuente = paginaDe(a, "horario");
  if (franjas === null || fuente === null) return null;
  return [{ desde: null, hasta: null, franjas, cierra: [], fuente }];
}

/** Lo que cuesta, por los datos abiertos: solo si dicen que no se paga, y entonces es gratis para cualquiera. */
export function preciosAbiertos(a: DatosAbiertos | undefined): PrecioDeCapa[] | null {
  const fuente = a === undefined ? null : paginaDe(a, "pago");
  if (a?.dePago !== false || fuente === null) return null;
  return [{ para: "any", edades: null, cuanto: "free", fuente }];
}

/**
 * Un sitio que su asiento no miró: lo que dicen de él los datos abiertos, y por qué no se miró (pasó del tope, su
 * tanda falló, o lo añadiste después).
 */
export function entradaAbierta(
  id: string,
  a: DatosAbiertos | undefined,
  porQue: SinMirar = "over_limit",
): EntradaDeUnSitio {
  return {
    parada: id,
    precios: preciosAbiertos(a),
    horarios: horariosAbiertos(a),
    reservar: null,
    web: a?.web ?? null,
    webDeLosAbiertos: true,
    mirado: false,
    sinMirar: porQue,
  };
}

/** Si dos direcciones son la misma página, sin mirar el fragmento, la barra del final ni las mayúsculas del sitio. */
function mismaPagina(a: string, b: string): boolean {
  const comparable = (x: string): string | null => {
    try {
      const u = new URL(x);
      return `${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
    } catch {
      return null;
    }
  };
  return comparable(a) !== null && comparable(a) === comparable(b);
}

/**
 * Si el asiento abrió una página. Sin saberlo por lo consultado, la puerta de todos ya dejó solo las que abrió o las
 * de su material, y la 13, para dónde reservar y su web, solo esas o la web de los datos abiertos: lo que no es esa
 * web lo abrió. Esa, sin saberlo, se toma por no abierta, que es lo prudente.
 */
export type Abrio = (url: string) => boolean;
const abrioPorDefecto =
  (a: DatosAbiertos | undefined): Abrio =>
  (url) =>
    a?.web == null || !mismaPagina(url, a.web);

/**
 * Un sitio que miró su asiento, en la forma del viaje. Manda lo que dijo, que leyó en la web del sitio; lo que dijo
 * que no sabe se queda con lo que dicen los datos abiertos, con su página, y si tampoco lo dicen, no se sabe.
 */
export function entradaMirada(
  s: SitioEntregado,
  a: DatosAbiertos | undefined,
  abrio: Abrio = abrioPorDefecto(a),
): EntradaDeUnSitio {
  const donde = s.booking === SIN_SABER || s.booking.where === SIN_SABER ? null : formaNormal(s.booking.where);
  const suya = s.official_site === SIN_SABER ? null : formaNormal(s.official_site);
  const web = suya ?? a?.web ?? null;
  return {
    parada: s.id,
    precios: s.prices === SIN_SABER ? preciosAbiertos(a) : preciosDe(s.prices),
    horarios: s.hours === SIN_SABER ? horariosAbiertos(a) : s.hours.map(horarioDe),
    reservar:
      s.booking === SIN_SABER
        ? null
        : {
            haceFalta: s.booking.needed,
            // Dónde se reserva, solo si es una página que abrió: la web de los datos abiertos va aparte, como tal.
            donde: donde !== null && abrio(donde) ? donde : null,
            fuente: fuenteDe(s.booking),
          },
    web,
    webDeLosAbiertos: web !== null && !(suya !== null && abrio(suya)),
    mirado: true,
  };
}

/**
 * Lo que se enseña de lo que entregaron sus llamadas, en la forma del viaje: cada sitio de cada tanda que entregó, y
 * los que no se miraron (pasaron del tope, o su tanda falló), con lo que dicen los datos abiertos.
 */
export function paraEnsenarEntradas(
  entregas: (EntregaDeLasEntradas | null)[],
  sinMirar: string[],
  abiertos: DatosAbiertos[],
  porQue: Readonly<Record<string, SinMirar>> = {},
  abrio?: Abrio,
): DeLasEntradas {
  const deUno = (id: string): DatosAbiertos | undefined => abiertos.find((x) => x.sitio === id);
  const sitios: EntradaDeUnSitio[] = [];
  for (const e of entregas)
    for (const s of e?.sights ?? [])
      if (!sitios.some((x) => x.parada === s.id)) sitios.push(entradaMirada(s, deUno(s.id), abrio));
  for (const id of sinMirar)
    if (!sitios.some((s) => s.parada === id)) sitios.push(entradaAbierta(id, deUno(id), porQue[id]));
  return { sitios, falta: null };
}

/**
 * Los días del viaje que se sabe que cierra cada parada, por lo que trae el viaje: lo que usa el ritmo para no poner
 * un sitio el día que cierra, y la puerta 9 para mirarlo. Lo que no se sabe no está.
 */
export function cierraEnElViaje(v: {
  entradas?: DeLasEntradas;
  entrada: string;
  salida: string;
}): Record<string, string[]> {
  return diasQueCierra(v.entradas, fechasDe(v.entrada, v.salida));
}

/**
 * Cuánto pide un sitio que se le miren las entradas, por lo que dicen los datos abiertos: 0 si tiene puerta (dicen su
 * horario, o que se paga); 1 si no dicen nada; 2 si dicen que no se paga y no tienen horario (un mirador, una plaza).
 */
export function puertaDeUnSitio(a: DatosAbiertos | undefined): 0 | 1 | 2 {
  if (a === undefined) return 1;
  if (a.horario !== null || a.dePago === true) return 0;
  return a.dePago === false ? 2 : 1;
}

/**
 * En qué orden se miran las entradas de los sitios elegidos, para que lo que pase del tope no quede fuera al azar:
 * primero los imprescindibles para el viajero; después, los que tienen puerta antes que los que no dicen nada, y estos
 * antes que los que no la tienen; y a igualdad, por el orden de importancia del que elige los sitios. Sin nada de azar:
 * la misma entrada da siempre el mismo orden.
 */
export function ordenParaMirar<S extends { id: string }>(
  elegidos: readonly { id: string; must: boolean }[],
  sitios: readonly S[],
  abiertos: readonly DatosAbiertos[],
): S[] {
  const conSuSitio = elegidos.flatMap((e, i) => {
    const s = sitios.find((x) => x.id === e.id);
    return s === undefined
      ? []
      : [{ s, i, must: e.must, puerta: puertaDeUnSitio(abiertos.find((a) => a.sitio === e.id)) }];
  });
  const vistos = new Set<string>();
  return conSuSitio
    .filter((x) => !vistos.has(x.s.id) && vistos.add(x.s.id))
    .sort((a, b) => Number(b.must) - Number(a.must) || a.puerta - b.puerta || a.i - b.i)
    .map((x) => x.s);
}
