// Tus elecciones sobre una versión del viaje: la manera, el alojamiento y el transporte de los que trae, el ritmo, las
// paradas que quitas, añades o mueves de día, y los gustos con su peso si los cambias. Se miran contra el viaje: cada
// cosa tiene que ser suya. Y de ellas salen los días que tienes delante, con el mismo reparto que la web
// (`agent/scripts/ritmo.ts`) y comprobados con `conTusDias`, que es lo que lee el cierre. Sin nada de Node.
//
// Una elección no gasta ni deja versión: se guarda encima. Lo que pide rehacer un paso es un cambio
// (`agent/data/momentos.ts`).

import { COSAS } from "../data/gustos.ts";
import type { Manera, Ritmo, Viaje } from "../output/viaje.ts";
import { RITMOS } from "../output/viaje.ts";
import { conTusDias, type TusDias } from "./cierre.ts";
import { PESOS_DE_GUSTO } from "./formas.ts";
import { fechasDe, repartir } from "./ritmo.ts";

/** Lo que has elegido sobre una versión. Lo que no has tocado va en null o vacío: es lo propuesto. */
export type Elecciones = {
  way: Manera["id"] | null;
  /** Un alojamiento del viaje, si eliges otro que el de la manera. */
  lodging: string | null;
  /** Un transporte del viaje, si eliges otro que el de la manera. */
  transport: string | null;
  pace: Ritmo | null;
  /** Las paradas que quitaste. */
  removed: string[];
  /** Las que estaban fuera y añadiste. */
  added: string[];
  /** Las que moviste de día: la parada y el número del día, desde el cero. */
  moved: Record<string, number>;
  /** Tus gustos de las cosas del alojamiento, con su peso; null si no los has cambiado. */
  tastes: { thing: string; weight: (typeof PESOS_DE_GUSTO)[number] }[] | null;
};

export const SIN_ELEGIR: Elecciones = {
  way: null,
  lodging: null,
  transport: null,
  pace: null,
  removed: [],
  added: [],
  moved: {},
  tastes: null,
};

/** Una elección que no es del viaje, por su clave: qué campo no vale. */
export class EleccionQueNoVale extends Error {}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function ids(crudo: unknown, campo: string, validos: Set<string>): string[] {
  if (crudo === undefined || crudo === null) return [];
  if (!Array.isArray(crudo) || crudo.length > validos.size) throw new EleccionQueNoVale(campo);
  const vistos = new Set<string>();
  for (const id of crudo) {
    if (typeof id !== "string" || !validos.has(id) || vistos.has(id)) throw new EleccionQueNoVale(campo);
    vistos.add(id);
  }
  return [...vistos];
}

/**
 * Mira unas elecciones contra el viaje y devuelve solo lo que vale, con su forma. Lo que no es del viaje lanza
 * `EleccionQueNoVale` con el campo: no se guarda a medias.
 */
export function comprobarElecciones(v: Viaje, crudo: unknown): Elecciones {
  if (!objeto(crudo)) throw new EleccionQueNoVale("choices");
  const fuera = Object.keys(crudo).filter((k) => !(k in SIN_ELEGIR));
  if (fuera.length > 0) throw new EleccionQueNoVale(fuera[0]);
  const de = <T>(campo: string, validos: readonly T[]): T | null => {
    const x = crudo[campo];
    if (x === undefined || x === null) return null;
    if (!validos.includes(x as T)) throw new EleccionQueNoVale(campo);
    return x as T;
  };
  const way = de<Manera["id"]>(
    "way",
    v.maneras.map((m) => m.id),
  );
  const lodging = de(
    "lodging",
    v.alojamientos.filter((a) => a.descartado == null).map((a) => a.id),
  );
  const transport = de(
    "transport",
    v.transportes.map((t) => t.id),
  );
  const pace = de<Ritmo>("pace", RITMOS);
  const paradas = new Set(v.paradas.map((p) => p.id));
  const removed = ids(crudo.removed, "removed", paradas);
  const added = ids(crudo.added, "added", paradas);
  if (added.some((id) => removed.includes(id))) throw new EleccionQueNoVale("added");
  const dias = fechasDe(v.entrada, v.salida).length;
  const moved: Record<string, number> = {};
  if (crudo.moved !== undefined && crudo.moved !== null) {
    if (!objeto(crudo.moved)) throw new EleccionQueNoVale("moved");
    for (const [id, dia] of Object.entries(crudo.moved)) {
      if (!paradas.has(id) || removed.includes(id)) throw new EleccionQueNoVale("moved");
      if (typeof dia !== "number" || !Number.isInteger(dia) || dia < 0 || dia >= dias)
        throw new EleccionQueNoVale("moved");
      moved[id] = dia;
    }
  }
  let tastes: Elecciones["tastes"] = null;
  if (crudo.tastes !== undefined && crudo.tastes !== null) {
    if (!Array.isArray(crudo.tastes) || crudo.tastes.length > Object.keys(COSAS).length)
      throw new EleccionQueNoVale("tastes");
    const vistas = new Set<string>();
    tastes = crudo.tastes.map((g: unknown) => {
      if (!objeto(g) || typeof g.thing !== "string" || !(g.thing in COSAS) || vistas.has(g.thing))
        throw new EleccionQueNoVale("tastes");
      if (!PESOS_DE_GUSTO.includes(g.weight as never)) throw new EleccionQueNoVale("tastes");
      vistas.add(g.thing);
      return { thing: g.thing, weight: g.weight as (typeof PESOS_DE_GUSTO)[number] };
    });
  }
  const e: Elecciones = { way, lodging, transport, pace, removed, added, moved, tastes };
  // Un alojamiento en otra moneda que su manera no se puede sumar a su total: no se guarda (8.2).
  if (lodging !== null && v.alojamientos.find((a) => a.id === lodging)?.precio.moneda !== maneraDe(v, e)?.moneda)
    throw new EleccionQueNoVale("lodging");
  // Los días que salen de ellas tienen que ser del viaje: si no, no se guarda nada.
  try {
    conTusDias(v, diasElegidos(v, e), paceDe(v, e));
  } catch {
    throw new EleccionQueNoVale("days");
  }
  return e;
}

/** La manera elegida, como la elige la web: la que dijiste, o la que mejor sale, o la primera. */
export function maneraDe(v: Viaje, e: Elecciones): Manera | null {
  return v.maneras.find((m) => m.id === e.way) ?? v.maneras.find((m) => m.id === "best_value") ?? v.maneras[0] ?? null;
}

/** El alojamiento donde duermes: el que elegiste, o el de la manera. */
export function alojamientoDe(v: Viaje, e: Elecciones): string | null {
  return e.lodging ?? maneraDe(v, e)?.alojamiento ?? null;
}

/** El transporte con que llegas: el que elegiste, o el de la manera. */
export function transporteDe(v: Viaje, e: Elecciones): string | null {
  return e.transport ?? maneraDe(v, e)?.transporte ?? null;
}

const paceDe = (v: Viaje, e: Elecciones): Ritmo => e.pace ?? v.ritmo;

/** Si has tocado los días: el ritmo o alguna parada. Si no, los días son los de la versión. */
export function tocasteLosDias(e: Elecciones): boolean {
  return e.pace !== null || e.removed.length > 0 || e.added.length > 0 || Object.keys(e.moved).length > 0;
}

/**
 * Los días que tienes delante con tus elecciones: el mismo reparto que hace la web, al instante, desde donde
 * duermes, con tu ritmo y lo que quitaste, añadiste o moviste, y con la tabla de caminos del viaje.
 */
export function diasElegidos(v: Viaje, e: Elecciones): TusDias {
  const cama = v.alojamientos.find((a) => a.id === alojamientoDe(v, e));
  const base = cama?.punto ?? v.destino.punto;
  const r = repartir(
    v.paradas,
    fechasDe(v.entrada, v.salida),
    paceDe(v, e),
    base,
    { quitadas: e.removed, anadidas: e.added, fijadas: e.moved },
    v.caminos,
  );
  return r.dias.map((d) => ({ fecha: d.fecha, paradas: [...d.paradas] }));
}

/** Lo que el cierre lee de tus elecciones: tus días y tu ritmo, si los tocaste; si no, nada. */
export function paraElCierre(v: Viaje, e: Elecciones): { dias: TusDias; ritmo: Ritmo } | null {
  if (!tocasteLosDias(e)) return null;
  return { dias: diasElegidos(v, e), ritmo: paceDe(v, e) };
}
