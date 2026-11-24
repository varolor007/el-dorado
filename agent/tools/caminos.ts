// La tabla de caminos de un viaje: lo que la fuente de rutas dijo que hay entre dos puntos, a pie y en coche, y lo que
// mide un trayecto con ella. Lo que no está en la tabla sale de la cuenta de la casa (`distancias.ts`), como siempre.
// No sale a internet ni usa nada de fuera: lo corren igual la casa y la web, y la misma entrada da siempre lo mismo.
//
// A pie, cada sentido es un camino: la cuesta que se sube no es la que se baja. Si un sentido no está, vale el otro,
// que va por las mismas calles y es mejor que la línea recta. En coche, igual: la carretera es la misma.

import { MANERAS_DE_IR, type ManeraDeIr } from "../data/moverse.ts";
import { andando, enLineaRecta, manerasDeIr, PASO, RODEO, trayecto, type Punto, type Trayecto } from "./distancias.ts";

// La forma de la tabla es la del viaje: es lo que viaja a la web.
import type { CaminoGuardado, TablaDeCaminos, Tramo } from "../output/viaje.ts";
export type { CaminoGuardado, TablaDeCaminos, Tramo };

/** De dónde sale lo que mide un trayecto: de la fuente de rutas o de la cuenta de la casa. */
export type Medido = Trayecto & { segun: "fuente" | "casa" };

/** Lo más que se anda, en metros de camino: lo mismo que dice `moverse.ts`. */
export const HASTA_A_PIE = MANERAS_DE_IR.find((m) => m.id === "walk")!.hasta;

/** Cómo se escribe un punto para buscarlo: con cinco decimales, que es un metro, más o menos. */
export const clavePunto = (p: Punto): string => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
const clavePar = (de: Punto, a: Punto): string => `${clavePunto(de)}>${clavePunto(a)}`;

/** Lo que se busca en una tabla, ya ordenado por pares. Se monta una vez y se pregunta muchas. */
export type Caminos = { aPie: Map<string, Tramo>; enCoche: Map<string, Tramo> };

/** La tabla, lista para buscar en ella. Sin tabla, o vacía, todo sale de la cuenta de la casa. */
export function caminosDe(tabla: TablaDeCaminos | null | undefined): Caminos | undefined {
  // Una tabla vacía es como no tenerla: el viaje se mide y se ordena igual que sin ella.
  if (tabla == null || tabla.caminos.length === 0) return undefined;
  const c: Caminos = { aPie: new Map(), enCoche: new Map() };
  for (const x of tabla.caminos) {
    const par = clavePar(x.de, x.a);
    if (x.aPie !== undefined) c.aPie.set(par, x.aPie);
    if (x.enCoche !== undefined) c.enCoche.set(par, x.enCoche);
  }
  return c;
}

/** Lo que dio la fuente a pie de un punto a otro: en ese sentido o, si no está, en el otro; o nada. */
export const aPieEntre = (c: Caminos | undefined, de: Punto, a: Punto): Tramo | undefined =>
  c?.aPie.get(clavePar(de, a)) ?? c?.aPie.get(clavePar(a, de));

/** Lo que dio la fuente en coche de un punto a otro, en un sentido o en el otro; o nada. */
export const enCocheEntre = (c: Caminos | undefined, de: Punto, a: Punto): Tramo | undefined =>
  c?.enCoche.get(clavePar(de, a)) ?? c?.enCoche.get(clavePar(a, de));

/** Las maneras que tienen sentido cuando no se anda: las de la distancia, sin la de andar, y el coche siempre. */
function sinAndar(metros: number): ManeraDeIr[] {
  const maneras = manerasDeIr(metros).filter((m) => m !== "walk");
  return maneras.includes("car") ? maneras : [...maneras, "car"];
}

/**
 * Un trayecto de un punto a otro, con la tabla si la hay. Si la fuente dio el camino a pie y se anda, se cuenta a pie,
 * con sus metros y sus minutos, que cuentan con las cuestas. Si no se anda y dio el coche, se cuenta en coche, sin
 * tráfico. Lo que no está en la tabla sale de la cuenta de la casa, como siempre, y es aproximado: sin tabla, el
 * trayecto es el mismo de antes.
 */
export function trayectoEntre(de: Punto, a: Punto, c?: Caminos): Medido {
  const casa = andando(de, a);
  const pie = aPieEntre(c, de, a);
  const coche = enCocheEntre(c, de, a);
  if (pie === undefined && coche === undefined) return { ...trayecto(casa), segun: "casa" };
  // Si se anda lo dice la fuente cuando dio el camino a pie; si no lo dio, la cuenta de la casa.
  const seAnda = pie !== undefined ? pie.metros <= HASTA_A_PIE : casa <= HASTA_A_PIE;
  if (seAnda) {
    if (pie === undefined) return { ...trayecto(casa), segun: "casa" };
    return { metros: pie.metros, maneras: manerasDeIr(pie.metros), aPie: true, minutos: pie.minutos, segun: "fuente" };
  }
  if (coche !== undefined)
    return {
      metros: coche.metros,
      maneras: sinAndar(coche.metros),
      aPie: false,
      minutos: coche.minutos,
      segun: "fuente",
    };
  // La fuente dijo que a pie no se anda, pero no dio el coche: los metros son los del camino a pie, que son de verdad
  // y pasan de lo que se anda, y el tiempo, el de la cuenta de la casa con lo que haya que coger.
  return { ...trayecto(pie!.metros), segun: "casa" };
}

/**
 * Lo que cuesta ir de un punto a otro, para ordenar un día: sin tabla, la línea recta, como siempre; con ella, los
 * minutos sin redondear, de la fuente o de la cuenta de la casa. Así dos viajes sin tabla se ordenan igual que antes.
 */
export function costeEntre(de: Punto, a: Punto, c?: Caminos): number {
  if (c === undefined) return enLineaRecta(de, a);
  const pie = aPieEntre(c, de, a);
  const coche = enCocheEntre(c, de, a);
  if (pie === undefined && coche === undefined) {
    const metros = enLineaRecta(de, a) * RODEO;
    return metros <= HASTA_A_PIE ? metros / PASO : trayecto(metros).minutos;
  }
  return trayectoEntre(de, a, c).minutos;
}
