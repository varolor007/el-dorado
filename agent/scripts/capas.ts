// Lo que comparten las capas del destino en código, sin nada de Node (la web lo puede usar igual): la forma común de
// lo que entregan sus asientos (un precio, un horario, una fuente), cómo se pasa a la forma del viaje, y las cuentas
// que todas necesitan: qué día de la semana es una fecha, si un sitio abre un día del viaje y la entrada de una parada.
// La forma de la entrega de cada asiento va en su archivo (`capa_moverse.ts`, `capa_destino.ts`, `capa_entradas.ts`).

import { DIAS_DE_LA_SEMANA, type DiaDeLaSemana, type ParaQuien } from "../data/capas.ts";
import type { DeLasEntradas, EntradaDeUnSitio, FuenteDeUnDato, Horario, PrecioDeCapa } from "../output/capas.ts";
import { formaNormal } from "../tools/enlaces.ts";
import { SIN_SABER } from "./formas.ts";

// 1. La forma común de las entregas, en inglés, como sus contratos. «unknown» es que no se sabe, nunca un número.

/** Un precio que da una página: para quién, con sus edades si las da, cuánto o «free», y la página con su fecha. */
export type PrecioEntregado = {
  for: ParaQuien;
  ages: { from: number | null; to: number | null } | null;
  amount: number | "free";
  currency: string | null;
  source: string;
  seen: string;
};

/** Un horario que da una página: para qué fechas vale, sus franjas y los días que cierra. */
export type HorarioEntregado = {
  from: string | typeof SIN_SABER;
  to: string | typeof SIN_SABER;
  open: { days: DiaDeLaSemana[]; opens: string; closes: string }[];
  closed_on: string[];
  source: string;
  seen: string;
};

/** La fuente de un dato, como la da la entrega: la página y el día en que se vio. */
/** La página y el día de un dato. La página se guarda en su forma normal, la que pinta la web. */
export const fuenteDe = (x: { source: string; seen: string }): FuenteDeUnDato => ({
  url: formaNormal(x.source) ?? x.source,
  visto: x.seen,
});

/** Un precio de una entrega, en la forma del viaje. La moneda, en sus tres letras mayúsculas. */
export function precioDe(p: PrecioEntregado): PrecioDeCapa {
  return {
    para: p.for,
    edades: p.ages === null ? null : { desde: p.ages.from, hasta: p.ages.to },
    cuanto: p.amount === "free" ? "free" : { importe: p.amount, moneda: String(p.currency ?? "").toUpperCase() },
    fuente: fuenteDe(p),
  };
}

/** Unos precios de una entrega, o «unknown»: null, que no se sabe. */
export const preciosDe = (ps: PrecioEntregado[] | typeof SIN_SABER): PrecioDeCapa[] | null =>
  ps === SIN_SABER ? null : ps.map(precioDe);

/** Un horario de una entrega, en la forma del viaje. */
export function horarioDe(h: HorarioEntregado): Horario {
  return {
    desde: h.from === SIN_SABER ? null : h.from,
    hasta: h.to === SIN_SABER ? null : h.to,
    franjas: h.open.map((f) => ({ dias: [...f.days], abre: f.opens, cierra: f.closes })),
    cierra: [...h.closed_on],
    fuente: fuenteDe(h),
  };
}

/** Lo que es «unknown» en una entrega, como null en el viaje. */
export const sabido = <T>(x: T | typeof SIN_SABER): T | null => (x === SIN_SABER ? null : x);

// 2. Las cuentas que comparten.

/** El día de la semana de una fecha AAAA-MM-DD, de lunes a domingo. */
export function diaDeLaSemana(fecha: string): DiaDeLaSemana {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return DIAS_DE_LA_SEMANA[(d + 6) % 7];
}

/**
 * Si un sitio abre una fecha, por sus horarios: verdadero si una franja del horario que vale ese día lo incluye,
 * falso si ese día no está en ninguna o es uno de los que cierra, y null si no se sabe (sin horarios, o ninguno vale
 * para esa fecha). Un horario sin fechas vale para todas; si hay uno con fechas que la incluye, manda ese.
 */
export function abreElDia(horarios: Horario[] | null, fecha: string): boolean | null {
  if (horarios === null) return null;
  const vale = (h: Horario): boolean =>
    (h.desde === null || h.desde <= fecha) && (h.hasta === null || fecha <= h.hasta);
  const validos = horarios.filter(vale);
  const conFechas = validos.filter((h) => h.desde !== null || h.hasta !== null);
  const elQueManda = conFechas[0] ?? validos[0];
  if (elQueManda === undefined) return null;
  if (validos.some((h) => h.cierra.includes(fecha))) return false;
  const dia = diaDeLaSemana(fecha);
  return elQueManda.franjas.some((f) => f.dias.includes(dia));
}

/** La entrada de una parada, si la capa está y la trae. */
export function entradaDe(e: DeLasEntradas | undefined, parada: string): EntradaDeUnSitio | null {
  if (e === undefined || e.falta !== null) return null;
  return e.sitios.find((x) => x.parada === parada) ?? null;
}

/**
 * Los días del viaje que cierra cada parada, por lo que se sabe: solo las que se sabe que cierran algún día. Lo que no
 * se sabe no está: no se quita un sitio de un día por no saber. Es lo que el ritmo y la puerta 9 tienen que mirar.
 */
export function diasQueCierra(e: DeLasEntradas | undefined, fechas: readonly string[]): Record<string, string[]> {
  const cierra: Record<string, string[]> = {};
  if (e === undefined || e.falta !== null) return cierra;
  for (const s of e.sitios) {
    const dias = fechas.filter((f) => abreElDia(s.horarios, f) === false);
    if (dias.length > 0) cierra[s.parada] = dias;
  }
  return cierra;
}
