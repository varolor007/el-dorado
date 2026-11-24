// El acta del run: lo que pasó en él, sacado de lo que hay en su carpeta. Cada paso con su estado; cada trabajo de la
// IA con su asiento, su vuelta, lo que tardó, lo que gastó y cómo acabó; cada vuelta en rojo con sus rojos; dónde paró
// y por qué; y lo que tardó y gastó entero, con lo que se fue en vueltas repetidas. No la escribe ninguna IA.
//
// Como todo lo demás, no se apunta al pasar: se rehace leyendo el disco. Un corte no deja nada sin contar ni lo cuenta
// dos veces. No lleva el texto de las entregas ni datos del viajero: solo lo que ya guarda el run de cada trabajo.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTA,
  CONDUCTOR,
  SALIDAS_DE_CADA_CLASE,
  type ClaseDeParada,
  type Decision,
  type SalidaDelViajero,
} from "../data/conductor.ts";
import { PARADO, PASOS, type EstadoDeUnPaso, type EstadoDeUnTrabajo } from "../data/pasos.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { guardarJson } from "./mesa.ts";
import { porDondeVa } from "./pasos.ts";
import { puestosDe, type Puesto } from "./puesto.ts";
import { gastoDe, trabajosDe } from "./trabajos.ts";

/** El asiento del conductor, por el nombre de su contrato. */
export const ASIENTO_DEL_CONDUCTOR = "conductor";

/** La vuelta de un puesto, por su nombre (`ruta-v2`); el que no lleva vuelta, como los que miran, va en la primera. */
export const vueltaDe = (puesto: string): number => Number(/-v(\d+)$/.exec(puesto)?.[1] ?? 1);
/** El trabajo al que pertenece un puesto, sin su vuelta: `ruta-v2` es de `ruta`. */
export const baseDe = (puesto: string): string => puesto.replace(/-v\d+$/, "");

/** El paso de la investigación de un asiento, por `agent/data/pasos.ts`. */
const pasoDe = (asiento: string): string =>
  asiento === ASIENTO_DEL_CONDUCTOR ? "conductor" : (PASOS.find((p) => p.quien === asiento)?.id ?? "other");

export type TrabajoDelActa = {
  puesto: string;
  asiento: string;
  paso: string;
  vuelta: number;
  estado: EstadoDeUnTrabajo;
  desde: string | null;
  hasta: string | null;
  /** Lo que tardó, en milisegundos; null si no acabó o no se sabe. */
  ms: number | null;
  /** Lo que gastó, en dólares; null si no se sabe. */
  usd: number | null;
  turnos: number | null;
  /** Por qué no acabó bien, si no acabó bien. Es para quien lleva el run. */
  fallo: string | null;
  /** Cómo le fue en sus puertas: null si no hay veredicto (no entregó, o aún no se ha recogido). */
  puertas: "green" | "red" | null;
};

export type VueltaEnRojo = { puesto: string; asiento: string; paso: string; vuelta: number; rojos: Rojo[] };

/** Por qué se paró un run, dicho por el código: su clase y, si fue un asiento, de qué puesto. */
export type Causa = {
  clase: ClaseDeParada;
  /** El puesto que paró el run, si lo paró un asiento: el último de su trabajo. */
  puesto: string | null;
  asiento: string | null;
  vuelta: number | null;
};

export type ParadaDelActa = { en: string | null; paso: string; rojos: Rojo[] } & Causa;

/** Lo que dejó el conductor, como lo escribe `conductor.ts`. */
export type DelConductor = {
  puesto: string;
  /** A qué parada se le llamó. */
  para: { puesto: string; asiento: string; vuelta: number; clase: ClaseDeParada; en: string | null };
  /** `working` mientras no ha entregado; `red` si su entrega no pasó su puerta; `failed` si no entregó. */
  estado: "working" | "red" | "failed" | "retry" | "told";
  rojos: Rojo[];
  decision: Decision | null;
  kind: ClaseDeParada | null;
  options: SalidaDelViajero[];
  /** Su frase para el viajero, solo si pasó la puerta de palabras, con el idioma en que se le pidió. */
  message: { text: string; lang: string } | null;
  /** Su indicación para el dueño y el puesto de la vuelta de más, si la pidió y pasó su puerta. */
  hint: string;
  vuelta_extra: string | null;
};

export type Acta = {
  pasos: { id: string; estado: EstadoDeUnPaso }[];
  trabajos: TrabajoDelActa[];
  vueltas_en_rojo: VueltaEnRojo[];
  parada: ParadaDelActa | null;
  conductor: DelConductor | null;
  hecho: boolean;
  total: {
    /** De que empezó el primer trabajo a que acabó el último: lo que se esperó de verdad, con los que van a la vez. */
    ms: number | null;
    /** Lo que tardaron todos los trabajos, sumados. */
    ms_de_los_trabajos: number;
    usd: number;
    turnos: number;
    trabajos: number;
    /** Falso si de algún trabajo acabado no se sabe lo que gastó. */
    sabido: boolean;
  };
  /** Lo que se fue en vueltas repetidas: los trabajos de la segunda vuelta en adelante. */
  repetido: { ms: number; usd: number; trabajos: number };
  /** Lo que se fue en el conductor. */
  del_conductor: { ms: number; usd: number; trabajos: number };
};

function leer(ruta: string): unknown {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

const esRojo = (r: unknown): r is Rojo =>
  typeof r === "object" && r !== null && typeof (r as Rojo).donde === "string" && typeof (r as Rojo).que === "string";

/** El veredicto que dejó la casa de un puesto al recogerlo, si lo dejó. */
export function veredictoDe(run: string, puesto: string): { verde: boolean; rojos: Rojo[] } | null {
  const v = leer(join(run, `${puesto}.puertas.json`)) as { verde?: unknown; rojos?: unknown } | null;
  if (v === null || typeof v.verde !== "boolean") return null;
  return { verde: v.verde, rojos: Array.isArray(v.rojos) ? v.rojos.filter(esRojo) : [] };
}

/** Lo que dejó el conductor en el run, si lo dejó y tiene su forma. */
export function delConductor(run: string): DelConductor | null {
  const c = leer(join(run, CONDUCTOR)) as DelConductor | null;
  return c !== null && typeof c.puesto === "string" && typeof c.estado === "string" ? c : null;
}

const ms = (desde: string | null, hasta: string | null): number | null => {
  if (desde === null || hasta === null) return null;
  const d = Date.parse(hasta) - Date.parse(desde);
  return Number.isFinite(d) && d >= 0 ? d : null;
};

/** El último puesto de cada trabajo: el de la vuelta más alta. */
function ultimos(puestos: Puesto[]): Map<string, Puesto> {
  const de = new Map<string, Puesto>();
  for (const p of puestos) {
    const antes = de.get(baseDe(p.id));
    if (antes === undefined || vueltaDe(p.id) > vueltaDe(antes.id)) de.set(baseDe(p.id), p);
  }
  return de;
}

/** Cómo se ve una parada desde lo que hay en el disco: qué la causó y, si fue un asiento, cuál. */
export function causaDe(run: string): ParadaDelActa | null {
  const p = leer(join(run, PARADO)) as { en?: unknown; paso?: unknown; rojos?: unknown } | null;
  if (p === null) return null;
  const en = typeof p.en === "string" ? p.en : null;
  const paso = typeof p.paso === "string" ? p.paso : "";
  const rojos = Array.isArray(p.rojos) ? p.rojos.filter(esRojo) : [];
  const sin = (clase: ClaseDeParada): ParadaDelActa => ({
    en,
    paso,
    rojos,
    clase,
    puesto: null,
    asiento: null,
    vuelta: null,
  });
  const donde = new Set(rojos.map((r) => r.donde));
  if (donde.has("spend")) return sin("spend_ceiling");
  if (donde.has("house")) return sin("house_broke");

  const puestos = puestosDe(run);
  const trabajos = trabajosDe(run);
  // Un asiento que trabajó y no entregó: el rojo lleva su puesto.
  const roto = puestos.find(
    (x) =>
      donde.has(x.id) && trabajos.some((t) => t.puesto === x.id && (t.estado === "failed" || t.estado === "stopped")),
  );
  if (roto !== undefined)
    return {
      en,
      paso,
      rojos,
      clase: "seat_did_not_finish",
      puesto: roto.id,
      asiento: roto.asiento,
      vuelta: vueltaDe(roto.id),
    };

  // Un asiento que entregó en rojo en su última vuelta, en el paso donde se paró: el más reciente de los suyos.
  const quien = PASOS.find((x) => x.id === en)?.quien;
  const orden = (id: string): number => trabajos.findIndex((t) => t.puesto === id);
  const enRojo = [...ultimos(puestos.filter((x) => x.asiento === quien)).values()]
    .filter((x) => veredictoDe(run, x.id)?.verde === false)
    .sort((a, b) => orden(a.id) - orden(b.id) || a.id.localeCompare(b.id, undefined, { numeric: true }))
    .pop();
  if (enRojo !== undefined)
    return {
      en,
      paso,
      rojos,
      clase: "seat_kept_failing",
      puesto: enRojo.id,
      asiento: enRojo.asiento,
      vuelta: vueltaDe(enRojo.id),
    };

  // Lo demás lo paró el código: un viaje que aún no se sabe hacer, o que no hay con qué hacerlo.
  if (donde.has("bases") || donde.has("dias")) return sin("not_possible_yet");
  if (donde.has("sitios") || donde.has("alojamiento") || donde.has("rows")) return sin("nothing_found");
  return sin("house_broke");
}

/** El acta de un run, leída de su carpeta. No escribe nada. */
export function actaDe(run: string): Acta {
  const trabajos: TrabajoDelActa[] = trabajosDe(run).map((t) => {
    const v = veredictoDe(run, t.puesto);
    return {
      puesto: t.puesto,
      asiento: t.asiento,
      paso: pasoDe(t.asiento),
      vuelta: vueltaDe(t.puesto),
      estado: t.estado,
      desde: t.desde,
      hasta: t.hasta,
      ms: ms(t.desde, t.hasta),
      usd: t.gasto?.usd ?? null,
      turnos: t.gasto?.turnos ?? null,
      fallo: t.fallo,
      puertas: v === null ? null : v.verde ? "green" : "red",
    };
  });
  const vueltas_en_rojo: VueltaEnRojo[] = puestosDe(run)
    .flatMap((p) => {
      const v = veredictoDe(run, p.id);
      return v === null || v.verde
        ? []
        : [{ puesto: p.id, asiento: p.asiento, paso: pasoDe(p.asiento), vuelta: vueltaDe(p.id), rojos: v.rojos }];
    })
    .sort((a, b) => a.puesto.localeCompare(b.puesto, undefined, { numeric: true }));

  const gasto = gastoDe(run);
  const desdes = trabajos.flatMap((t) => (t.desde === null ? [] : [Date.parse(t.desde)])).filter(Number.isFinite);
  const hastas = trabajos.flatMap((t) => (t.hasta === null ? [] : [Date.parse(t.hasta)])).filter(Number.isFinite);
  const suma = (lista: TrabajoDelActa[]): { ms: number; usd: number; trabajos: number } => ({
    ms: lista.reduce((s, t) => s + (t.ms ?? 0), 0),
    usd: lista.reduce((s, t) => s + (t.usd ?? 0), 0),
    trabajos: lista.length,
  });
  const delConductorSolo = trabajos.filter((t) => t.asiento === ASIENTO_DEL_CONDUCTOR);
  const deLosDemas = trabajos.filter((t) => t.asiento !== ASIENTO_DEL_CONDUCTOR);
  return {
    pasos: porDondeVa(run).map((p) => ({ id: p.id, estado: p.estado })),
    trabajos,
    vueltas_en_rojo,
    parada: causaDe(run),
    conductor: delConductor(run),
    hecho: existsSync(join(run, "viaje.json")),
    total: {
      ms: desdes.length > 0 && hastas.length > 0 ? Math.max(0, Math.max(...hastas) - Math.min(...desdes)) : null,
      ms_de_los_trabajos: suma(trabajos).ms,
      usd: gasto.usd,
      turnos: gasto.turnos,
      trabajos: trabajos.length,
      sabido: gasto.sabido,
    },
    repetido: suma(deLosDemas.filter((t) => t.vuelta > 1)),
    del_conductor: suma(delConductorSolo),
  };
}

/** Rehace el acta del run y la deja en `acta.json`. */
export function escribirActa(run: string): Acta {
  const acta = actaDe(run);
  if (existsSync(run)) guardarJson(join(run, ACTA), acta);
  return acta;
}

/**
 * El acta como se le da a su dueño: lo que pasó por claves y números, y nada de dentro. Ni el nombre de un asiento
 * o de un puesto, ni el porqué de un rojo o de un fallo (pueden llevar lo que escribió un asiento, o lo que decía una
 * opinión), ni lo que el conductor escribió para la casa. Lo que el conductor le dice al viajero ya va, si pasó su
 * puerta, en lo que cuenta la parada (`paradaDeCara`).
 */
export type ActaDeCara = {
  pasos: Acta["pasos"];
  trabajos: Pick<TrabajoDelActa, "paso" | "vuelta" | "estado" | "ms" | "usd" | "turnos" | "puertas">[];
  vueltas_en_rojo: { paso: string; vuelta: number; rojos: number }[];
  parada: { en: string | null; clase: ClaseDeParada } | null;
  conductor: Pick<DelConductor, "estado" | "decision" | "kind" | "options"> | null;
  hecho: boolean;
  total: Acta["total"];
  repetido: Acta["repetido"];
  del_conductor: Acta["del_conductor"];
};

export function actaDeCara(acta: Acta): ActaDeCara {
  const c = acta.conductor;
  return {
    pasos: acta.pasos.map((p) => ({ id: p.id, estado: p.estado })),
    trabajos: acta.trabajos.map((t) => ({
      paso: t.paso,
      vuelta: t.vuelta,
      estado: t.estado,
      ms: t.ms,
      usd: t.usd,
      turnos: t.turnos,
      puertas: t.puertas,
    })),
    vueltas_en_rojo: acta.vueltas_en_rojo.map((v) => ({ paso: v.paso, vuelta: v.vuelta, rojos: v.rojos.length })),
    parada: acta.parada === null ? null : { en: acta.parada.en, clase: acta.parada.clase },
    conductor: c === null ? null : { estado: c.estado, decision: c.decision, kind: c.kind, options: c.options },
    hecho: acta.hecho,
    total: acta.total,
    repetido: acta.repetido,
    del_conductor: acta.del_conductor,
  };
}

/** Lo que se le dice al viajero de un run parado: qué clase de parada es, qué puede hacer y, si la hay, una frase. */
export type ParadaDeCara = {
  at: string | null;
  kind: ClaseDeParada;
  options: SalidaDelViajero[];
  said: { text: string; lang: string } | null;
  /** El conductor está mirando la parada: aún no se sabe qué se puede hacer. */
  looking: boolean;
};

export function paradaDeCara(run: string): ParadaDeCara | null {
  const causa = causaDe(run);
  if (causa === null) return null;
  const c = delConductor(run);
  // Lo que dijo el conductor vale para la parada a la que se le llamó, y solo si pasó su puerta.
  const suya = c !== null && c.para.puesto === causa.puesto && c.estado === "told" && c.kind !== null ? c : null;
  return {
    at: causa.en,
    kind: suya?.kind ?? causa.clase,
    options: suya !== null && suya.options.length > 0 ? suya.options : SALIDAS_DE_CADA_CLASE[causa.clase],
    said: suya?.message ?? null,
    looking: c !== null && c.para.puesto === causa.puesto && c.estado === "working",
  };
}
