// Lo que comparten las capas del destino en código, sin nada de Node (la web lo puede usar igual): la forma común de
// lo que entregan sus asientos (un precio, un horario, una fuente), cómo se pasa a la forma del viaje, y las cuentas
// que todas necesitan: qué día de la semana es una fecha, si un sitio abre un día del viaje y la entrada de una parada.
// La forma de la entrega de cada asiento va en su archivo (`capa_moverse.ts`, `capa_destino.ts`, `capa_entradas.ts`).

import { DIAS_DE_LA_SEMANA, type DiaDeLaSemana, type ParaQuien } from "../data/capas.ts";
import { PRECIOS_QUE_NO_SE_PONEN, type CualSeCoge } from "../data/presupuesto.ts";
import type {
  DeLasEntradas,
  EntradaDeUnSitio,
  Edades,
  FuenteDeUnDato,
  Horario,
  PrecioDeCapa,
} from "../output/capas.ts";
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

// El precio de cada uno: una sola regla para las entradas, llegar a donde se duerme y los billetes de moverse allí.

const cubre = (e: Edades | null, edad: number): boolean =>
  e !== null && (e.desde === null || e.desde <= edad) && (e.hasta === null || edad <= e.hasta);
const deNinos = (p: PrecioDeCapa): boolean => p.para === "child" || p.para === "infant" || p.para === "youth";
/** Un precio que vale para un adulto del que no se sabe la edad: de adulto o de cualquiera, sin decir edades. */
const deAdultoSinEdades = (p: PrecioDeCapa): boolean => (p.para === "adult" || p.para === "any") && p.edades === null;

/**
 * Los precios que le valen a uno. A un adulto, del que no se sabe la edad, los de adulto o de cualquiera que no dicen
 * edades: uno que las dice (de 18 a 25, hasta 17) no se le pone, y si todos las dicen, no se sabe; no se le supone una
 * edad. A un niño, los que dicen unas edades que tienen la suya; si no hay, y hay uno de niño sin edades, no se sabe
 * si es el suyo; si tampoco, paga como un adulto, con uno que no dice edades. Nunca el de estudiante, mayor, familia
 * o grupo. La usan el presupuesto (entradas y llegar) y la cuenta de moverse (sus billetes).
 */
export function preciosParaUno(precios: readonly PrecioDeCapa[], edad: number | null): PrecioDeCapa[] {
  const ponibles = precios.filter((p) => !(PRECIOS_QUE_NO_SE_PONEN as readonly string[]).includes(p.para));
  if (edad === null) return ponibles.filter(deAdultoSinEdades);
  const porSuEdad = ponibles.filter((p) => cubre(p.edades, edad));
  if (porSuEdad.length > 0) return porSuEdad;
  if (ponibles.some((p) => deNinos(p) && p.edades === null)) return [];
  return ponibles.filter(deAdultoSinEdades);
}

/**
 * El que se coge de unos precios que le valen a uno, por la regla que se dice (`SI_VALEN_VARIOS`): el más barato
 * (lo gratis, antes) o el más caro. Entre los de la moneda del viaje (lo gratis vale en todas); si no hay y se deja,
 * entre los de la primera otra moneda que salga, para decirlo aparte. Null si no hay ninguno.
 */
export function elQueSeCoge(
  precios: readonly PrecioDeCapa[],
  moneda: string | null,
  regla: CualSeCoge,
  otraMoneda = true,
): PrecioDeCapa | null {
  const cuanto = (p: PrecioDeCapa): number => (p.cuanto === "free" ? 0 : p.cuanto.importe);
  const suyos = precios.filter((p) => p.cuanto === "free" || p.cuanto.moneda === moneda);
  const primera = precios.find((p) => p.cuanto !== "free")?.cuanto;
  const otra = primera === undefined || primera === "free" ? null : primera.moneda;
  const entre =
    suyos.length > 0 || !otraMoneda ? suyos : precios.filter((p) => p.cuanto !== "free" && p.cuanto.moneda === otra);
  return entre.reduce<PrecioDeCapa | null>(
    (elegido, p) =>
      elegido === null || (regla === "cheapest" ? cuanto(p) < cuanto(elegido) : cuanto(p) > cuanto(elegido))
        ? p
        : elegido,
    null,
  );
}

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
