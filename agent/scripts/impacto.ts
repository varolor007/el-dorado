// El impacto de un cambio, en código y sin IA: qué clases de cambio hay entre lo entendido de antes y el de después,
// qué pasos se rehacen y quién hace cada uno, qué pasos se conservan, qué piezas del viaje dejan de valer y lo que
// costaría, estimado de lo que gastó cada asiento en las investigaciones de esa cuenta. Todo por claves, para que la
// web lo diga antes de rehacer nada. Sin nada de Node: la web lo puede usar igual.

import { CAMBIOS, CLASES_DE_CAMBIO, LEE, PIEZAS_DE_UN_PASO } from "../data/momentos.ts";
import type { ClaseDeCambio, IdDePaso, PiezaDelViaje } from "../data/momentos.ts";
import { COSAS } from "../data/gustos.ts";
import { CODIGO, PASOS } from "../data/pasos.ts";
import type { Entendido, Gusto } from "./formas.ts";

const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const ordenado = (gustos: Gusto[]): { thing: string; weight: string }[] =>
  gustos.map((g) => ({ thing: g.thing, weight: g.weight })).sort((a, b) => a.thing.localeCompare(b.thing));

/**
 * Las clases de cambio entre lo entendido de antes y el de después, en el orden de `CLASES_DE_CAMBIO`. Lo que cambia
 * fuera de lo que se sabe leer es «other», y se rehace entero. Las palabras del viajero (`said`) no cuentan: lo que
 * se sacó de ellas está ya en sus campos.
 */
export function clasesDelCambio(antes: Entendido, despues: Entendido): ClaseDeCambio[] {
  const hay = new Set<ClaseDeCambio>();
  const conocidos = new Set([
    "language",
    "currency",
    "destination",
    "origin",
    "dates",
    "travellers",
    "budget",
    "looking_for",
    "pace",
    "tastes",
    "limits",
    "booked",
    "said",
    "moving",
  ]);
  if (!igual(antes.destination, despues.destination) || !igual(antes.moving, despues.moving)) hay.add("destination");
  if (!igual(antes.origin, despues.origin)) hay.add("origin");
  if (!igual(antes.dates, despues.dates)) hay.add("dates");
  const ta = antes.travellers;
  const td = despues.travellers;
  if (ta.adults !== td.adults || !igual(ta.children, td.children)) hay.add("travellers");
  if (ta.rooms !== td.rooms) hay.add("rooms");
  // Los papeles van por filas: cada pasaporte con cada edad, sin contar cuántos viajan así. Un viajero más con un
  // pasaporte y una edad que ya estaban no cambia la tabla: solo la habitación y el precio, como dice la hoja.
  if (!igual(filasDeLosPapeles(antes), filasDeLosPapeles(despues))) hay.add("passports");
  if (antes.budget !== despues.budget) hay.add("budget");
  if (antes.currency !== despues.currency) hay.add("currency");
  if (antes.language !== despues.language) hay.add("language");
  if (antes.pace !== despues.pace) hay.add("pace");
  const deAlojamiento = (g: Gusto): boolean => Object.hasOwn(COSAS, g.thing);
  if (!igual(ordenado(antes.tastes.filter(deAlojamiento)), ordenado(despues.tastes.filter(deAlojamiento))))
    hay.add("lodging_taste");
  const otros = (g: Gusto): boolean => !deAlojamiento(g);
  if (!igual(ordenado(antes.tastes.filter(otros)), ordenado(despues.tastes.filter(otros)))) hay.add("taste");
  if (!igual(antes.looking_for, despues.looking_for)) hay.add("looking_for");
  if (!igual(antes.limits, despues.limits)) hay.add("limits");
  if (!igual(antes.booked, despues.booked)) hay.add("booked");
  const campos = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  for (const campo of campos)
    if (!conocidos.has(campo) && !igual((antes as never)[campo], (despues as never)[campo])) hay.add("other");
  return CLASES_DE_CAMBIO.filter((c) => hay.has(c));
}

/**
 * Las filas de la tabla de los papeles de lo entendido, en su orden y sin cuántos viajan en cada una: lo mismo que
 * `filasDe` en `agent/launcher/papeles.ts` (una prueba lo mira), sin nada de Node. Si no cambian, la tabla que llenó
 * el de los papeles sigue valiendo para las mismas casillas.
 */
export function filasDeLosPapeles(e: Entendido): { passport: string; age: "adult" | number }[] {
  const { adults, children, passports } = e.travellers;
  const deMas = (passports[0] ?? e.origin?.country ?? "").toUpperCase();
  const edades: ("adult" | number)[] = [...Array.from({ length: adults }, () => "adult" as const), ...children];
  const filas: { passport: string; age: "adult" | number }[] = [];
  edades.forEach((age, i) => {
    const passport = (passports[i] ?? deMas).toUpperCase();
    if (!filas.some((f) => f.passport === passport && f.age === age)) filas.push({ passport, age });
  });
  return filas;
}

const ORDEN = PASOS.map((p) => p.id as IdDePaso);
const enOrden = (pasos: Iterable<IdDePaso>): IdDePaso[] => {
  const hay = new Set(pasos);
  return ORDEN.filter((id) => hay.has(id));
};

/**
 * Los pasos que se rehacen con unas clases de cambio: los que leen lo que cambió y todo lo que sale de ellos, por
 * `LEE`. Lo que no sale de ellos se conserva. Con cualquier cambio, el viaje se vuelve a montar.
 */
export function pasosQueSeRehacen(clases: readonly ClaseDeCambio[]): IdDePaso[] {
  const rehacer = new Set<IdDePaso>(clases.flatMap((c) => CAMBIOS[c].pasos));
  if (rehacer.size === 0) return [];
  for (let crece = true; crece;) {
    crece = false;
    for (const id of ORDEN)
      if (!rehacer.has(id) && LEE[id].some((x) => rehacer.has(x))) {
        rehacer.add(id);
        crece = true;
      }
  }
  rehacer.add("trip");
  return enOrden(rehacer);
}

/** Lo que gastó de media cada asiento en una investigación entera de esa cuenta, y de cuántas sale. */
export type EstimadoPorAsiento = Record<string, { usd: number; de: number }>;

export type PasoDelImpacto = { step: IdDePaso; who: string };

export type Impacto = {
  /** Las clases de cambio, por su clave. */
  changes: ClaseDeCambio[];
  /** Los pasos que se rehacen, en su orden, y quién hace cada uno: el código o el asiento. */
  redo: PasoDelImpacto[];
  /** Los pasos que se conservan, con lo que ya hicieron: no se vuelven a pedir ni a pagar. */
  keep: IdDePaso[];
  /** Los que pueden tener que rehacerse según lo que salga: no se rehacen solos. */
  maybe: PasoDelImpacto[];
  /** Las piezas del viaje que dejan de valer. */
  pieces: PiezaDelViaje[];
  /** Si rehacerlo pide trabajo de la IA: entonces se ve antes y se da el adelante. */
  spends: boolean;
  /**
   * Lo que costaría, en dólares: la suma de lo que gastó de media cada asiento que se vuelve a lanzar, en las
   * investigaciones de esa cuenta. Null si de alguno no se sabe: entonces no se dice una cifra.
   */
  cost: { usd: number | null; unknown: string[] };
};

const quienDa = (id: IdDePaso): string => PASOS.find((p) => p.id === id)?.quien ?? CODIGO;

/**
 * El impacto de unas clases de cambio. Los pasos que dependen de que el viajero escribiera algo (el que escucha) no
 * se rehacen nunca por un cambio: lo que cambia ya viene escrito en sus campos.
 */
export function impactoDe(clases: readonly ClaseDeCambio[], estimado: EstimadoPorAsiento = {}): Impacto {
  const rehacen = pasosQueSeRehacen(clases);
  const redo = rehacen.map((step) => ({ step, who: quienDa(step) }));
  const keep = ORDEN.filter((id) => !rehacen.includes(id));
  const posibles = new Set(clases.flatMap((c) => CAMBIOS[c].quizas).filter((id) => !rehacen.includes(id)));
  const maybe = enOrden(posibles).map((step) => ({ step, who: quienDa(step) }));
  const piezas = new Set<PiezaDelViaje>(rehacen.flatMap((id) => PIEZAS_DE_UN_PASO[id]));
  const pieces = (
    ["lodging", "transport", "days", "prices", "date_warnings", "papers", "ways", "guide"] as const
  ).filter((p) => piezas.has(p));
  const asientos = [...new Set(redo.map((x) => x.who).filter((w) => w !== CODIGO))];
  const unknown = asientos.filter((a) => estimado[a] === undefined);
  const usd = unknown.length > 0 ? null : Math.round(asientos.reduce((s, a) => s + estimado[a].usd, 0) * 100) / 100;
  return { changes: [...clases], redo, keep, maybe, pieces, spends: asientos.length > 0, cost: { usd, unknown } };
}
