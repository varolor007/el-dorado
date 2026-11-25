// Lo que miran las puertas 6 y 7 de los números del presupuesto entero (14.5): si una frase del que cruza o del que
// explica habla del presupuesto entero, cada cifra suya tiene que ser la de la cuenta del código. Sin el presupuesto
// delante, solo puede decir las fechas, las noches y el grupo: el total de una manera es dormir y llegar, y no se
// puede vender como el viaje entero. Lo demás de sus números lo siguen mirando sus puertas, contra lo que se les dio.

import { DEL_PRESUPUESTO_ENTERO } from "../data/presupuesto.ts";
import type { Presupuesto } from "../output/capas.ts";
import { numerosDe, numerosDeMas } from "./textos.ts";

/** Los números de la cuenta: los totales de cada manera y de cada parte, lo que falta, lo aparte y las comidas. */
export function numerosDelPresupuesto(p: Presupuesto): Set<number> {
  const n = new Set<number>();
  for (const m of p.maneras) {
    n.add(m.total);
    n.add(m.faltan);
    for (const a of m.aparte) n.add(a.importe);
    for (const x of m.partes) {
      if (x.total !== null) n.add(x.total);
      n.add(x.faltan);
      for (const a of x.aparte) n.add(a.importe);
    }
  }
  if (p.comidas !== null) for (const c of [p.comidas.desde, p.comidas.hasta]) n.add(c);
  return n;
}

/** Lo que una frase del presupuesto puede contar sin ser dinero: las fechas, las noches y quiénes viajan. */
export function contadosDelViaje(
  entrada: string,
  salida: string,
  adultos: number,
  ninos: number[] | number,
): Set<number> {
  const n = new Set<number>(numerosDe(`${entrada} ${salida}`));
  const noches = Math.round((Date.parse(salida) - Date.parse(entrada)) / 86_400_000);
  const cuantos = Array.isArray(ninos) ? ninos.length : ninos;
  for (const x of [noches, noches + 1, adultos, cuantos, adultos + cuantos, ...(Array.isArray(ninos) ? ninos : [])])
    if (Number.isFinite(x)) n.add(x);
  return n;
}

/**
 * Las cifras de una frase que habla del presupuesto entero y no son de la cuenta (ni una fecha, ni las noches, ni el
 * grupo). Una frase que no habla de él no se mira aquí.
 */
export function cifrasQueNoSonDeLaCuenta(
  texto: string,
  contados: Set<number>,
  presupuesto?: Presupuesto,
  ids: string[] = [],
): string[] {
  if (!DEL_PRESUPUESTO_ENTERO.test(texto)) return [];
  const valen = new Set([...contados, ...(presupuesto === undefined ? [] : numerosDelPresupuesto(presupuesto))]);
  return numerosDeMas(texto, valen, ids);
}

/**
 * Los números que una frase puede decir: los de siempre y, si habla del presupuesto entero y se le dio, los de su
 * cuenta. Sin el presupuesto delante, los de siempre.
 */
export function conLaCuenta(texto: string, numeros: Set<number>, presupuesto?: Presupuesto): Set<number> {
  if (presupuesto === undefined || !DEL_PRESUPUESTO_ENTERO.test(texto)) return numeros;
  return new Set([...numeros, ...numerosDelPresupuesto(presupuesto)]);
}

/** El rojo de una cifra así, con o sin la cuenta delante. */
export const queDiceDelPresupuesto = (n: string, conCuenta: boolean): string =>
  conCuenta
    ? `habla del presupuesto entero y dice ${n}, que no es de su cuenta`
    : `habla del presupuesto entero y dice ${n}, y el presupuesto no es suyo: no se le dio`;
