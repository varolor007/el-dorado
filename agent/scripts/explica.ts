// Lo que el código le prepara al asiento que explica: las maneras ya cerradas, con sus números y con las
// diferencias frente a la más barata ya hechas, y las palancas que se van a contar. El asiento no resta: copia.

import { NOTA_SOBRE } from "../data/cribas.ts";
import type { DelCalendario } from "../output/viaje.ts";
import {
  SIN_SABER,
  type EntregaDeCruce,
  type EntregaDelCalendario,
  type EntregaDeMirar,
  type FilaDelCruce,
  type Tabla,
  type ZonaResuelta,
} from "./formas.ts";
import { diasDe } from "./ruta.ts";

export type ManeraParaExplicar = {
  id: string;
  row: string;
  lodging: string;
  lodging_label: string;
  zone_name: string;
  total: number;
  lodging_total: number;
  transport_total: number | string;
  score: number | string;
  minutes_to_sights: number | string;
  cancellable: boolean | string;
  unconfirmed: string[];
  /** Cómo es el alojamiento: cada campo, con su nivel y lo que se vio o se dijo. */
  is_like: Record<string, { level: string; what: string }>;
  good: string;
  bad: string;
  warnings: string[];
  /** Las diferencias frente a la más barata, ya hechas. */
  versus_cheapest: { costs_more: number | string; minutes_less: number | string; score_higher: number | string };
  lever?: string;
  chosen_because?: string;
};

export type PalancaParaExplicar = {
  lever_row: string;
  lever: string;
  /** Sobre qué se hace el cambio: el alojamiento de partida y, si es el de una manera, cuál. */
  applies_to: { lodging_label: string; way: string };
  change: Record<string, string | number>;
  saves: number;
  total: number | string;
  minutes_change: number | string;
  score: number | string;
  chosen_because: string;
};

/**
 * Un hallazgo del calendario, para que el que explica lo cuente: sus datos, con los días del viaje que toca ya
 * contados, y el `what` del asiento del calendario, que para él es un dato y no una orden.
 */
export type HallazgoParaExplicar = {
  finding: number;
  kind: string;
  topic: string;
  name: string;
  from: string;
  to: string;
  /** Los días del viaje que toca, en orden, y cuántos son. */
  trip_days: string[];
  trip_days_count: number;
  /** Los días que pide el destino y cuántos tiene el viaje, si es de eso. */
  days_needed?: { asks: number; trip_has: number };
  price: { amount: number; currency: string } | typeof SIN_SABER;
  what: string;
};

/** Otra ventana, con lo que cambia frente al viaje por las posiciones de los hallazgos: lo cuenta el código. */
export type VentanaParaExplicar = {
  window: number;
  check_in: string;
  check_in_weekday: string;
  check_out: string;
  check_out_weekday: string;
  /** Cuántos días se mueve: negativo, antes. */
  shift_days: number;
  avoids: number[];
  reaches: number[];
  loses: number[];
  enters: number[];
};

/** Lo del calendario que pasó sus comprobaciones, para el que explica. Sin calendario, o sin nada, no va. */
export type FechasParaExplicar = {
  trip: { check_in: string; check_out: string; days: number; nights: number };
  findings: HallazgoParaExplicar[];
  windows: VentanaParaExplicar[];
};

export type ParaExplicar = {
  /**
   * `on_foot`: si el viaje se anda desde donde se duerme. Si no, los minutos son en coche o en transporte.
   * `score_out_of`: sobre cuánto va la nota de la casa, para que pueda decirla como lo que es y no como la de los
   * huéspedes.
   */
  ways: { currency: string; nights: number; on_foot: boolean; score_out_of: number; ways: ManeraParaExplicar[] };
  levers: PalancaParaExplicar[];
  checks: EntregaDeCruce["checks"];
  /** Los avisos de las fechas que se le cuentan al viajero, si el calendario está y encontró algo. */
  dates?: FechasParaExplicar;
};

/**
 * Lo del calendario para el que explica: cada hallazgo con sus datos y su `what`, y cada ventana con lo que evita y
 * alcanza, que ya contó el código. Si falta, o no hay nada que contar, null: el que explica trabaja como siempre.
 */
export function fechasParaExplicar(
  c: (DelCalendario & { entrega: EntregaDelCalendario | null }) | null,
  fechas: { entrada: string; salida: string },
): FechasParaExplicar | null {
  if (c === null || c.falta !== null || c.entrega === null) return null;
  if (c.avisos.length === 0 && c.ventanas.length === 0) return null;
  if (c.entrega.findings.length !== c.avisos.length) return null;
  const { nights, days } = diasDe(fechas.entrada, fechas.salida);
  const findings = c.avisos.map((a, i): HallazgoParaExplicar => {
    const h: HallazgoParaExplicar = {
      finding: i,
      kind: a.clase,
      topic: a.tema,
      name: a.nombre ?? SIN_SABER,
      from: a.desde ?? SIN_SABER,
      to: a.hasta ?? SIN_SABER,
      trip_days: [...a.dias],
      trip_days_count: a.dias.length,
      price: a.precio === null ? SIN_SABER : { amount: a.precio.importe, currency: a.precio.moneda },
      what: c.entrega!.findings[i].what,
    };
    if (a.pide !== undefined) h.days_needed = { asks: a.pide.dias, trip_has: a.pide.dias + a.pide.deMas };
    return h;
  });
  const windows = c.ventanas.map((v, i): VentanaParaExplicar => {
    const suyos = diasDe(v.entrada, v.salida).days;
    return {
      window: i,
      check_in: v.entrada,
      check_in_weekday: suyos[0].weekday,
      check_out: v.salida,
      check_out_weekday: suyos[suyos.length - 1].weekday,
      shift_days: v.seMueve,
      avoids: [...v.evita],
      reaches: [...v.alcanza],
      loses: [...v.pierde],
      enters: [...v.entra],
    };
  });
  return {
    trip: { check_in: fechas.entrada, check_out: fechas.salida, days: days.length, nights },
    findings,
    windows,
  };
}

const resta = (a: number | string, b: number | string): number | string =>
  typeof a === "number" && typeof b === "number" ? Math.round((a - b) * 100) / 100 : SIN_SABER;

function comoEs(mirado: EntregaDeMirar | null): ManeraParaExplicar["is_like"] {
  const salida: ManeraParaExplicar["is_like"] = {};
  for (const [campo, nivel] of Object.entries(mirado?.fields ?? {})) {
    if (nivel.level === SIN_SABER) continue;
    salida[campo] = { level: nivel.level, what: nivel.evidence[0]?.what ?? SIN_SABER };
  }
  return salida;
}

/** Lo que se le da al que explica, a partir de la tabla, de lo que cerró el que cruza y de las fichas de cómo es. */
export function paraExplicar(
  tabla: Tabla,
  cruce: EntregaDeCruce,
  mirados: Record<string, EntregaDeMirar | null>,
  zonas: ZonaResuelta[],
  fechas: { entrada: string; salida: string },
): ParaExplicar {
  const fila = (id: string): FilaDelCruce => {
    const r = tabla.rows.find((x) => x.id === id);
    if (r === undefined) throw new Error(`la fila ${id} no está en la tabla`);
    return r;
  };
  const barata = typeof cruce.ways.cheapest === "string" ? null : fila(cruce.ways.cheapest.row);
  const manera = (id: string, r: FilaDelCruce): ManeraParaExplicar => {
    const mirado = mirados[r.lodging] ?? null;
    return {
      id,
      row: r.id,
      lodging: r.lodging,
      lodging_label: r.lodging_label,
      zone_name: zonas.find((z) => z.id === r.zone)?.label ?? SIN_SABER,
      total: r.total,
      lodging_total: r.lodging_total,
      transport_total: r.transport_total ?? "none",
      score: r.score,
      minutes_to_sights: r.minutes_to_sights,
      cancellable: r.cancellable,
      unconfirmed: r.unconfirmed,
      is_like: comoEs(mirado),
      good: mirado?.summary_good ?? SIN_SABER,
      bad: mirado?.summary_bad ?? SIN_SABER,
      warnings: (mirado?.warnings ?? []).map((a) => a.what),
      versus_cheapest: {
        costs_more: barata === null ? SIN_SABER : resta(r.total, barata.total),
        minutes_less: barata === null ? SIN_SABER : resta(barata.minutes_to_sights, r.minutes_to_sights),
        score_higher: barata === null ? SIN_SABER : resta(r.score, barata.score),
      },
    };
  };

  const ways: ManeraParaExplicar[] = [];
  for (const id of ["cheapest", "best_value"] as const) {
    const w = cruce.ways[id];
    if (typeof w !== "string") ways.push(manera(id, fila(w.row)));
  }
  const distinta = cruce.ways.different;
  if (typeof distinta !== "string")
    ways.push({ ...manera("different", fila(distinta.row)), lever: distinta.lever, chosen_because: distinta.why });

  const levers: PalancaParaExplicar[] = cruce.tell.flatMap((dicha) => {
    const l = tabla.levers.find((x) => x.id === dicha.lever_row);
    if (l === undefined || typeof l.saves !== "number") return [];
    const change: Record<string, string | number> = { ...l.change };
    // A unas fechas nuevas se les pone su día de la semana, que es como las entiende quien viaja.
    if (typeof change.check_in === "string" && typeof change.check_out === "string") {
      const dias = diasDe(change.check_in, change.check_out).days;
      change.check_in_weekday = dias[0].weekday;
      change.check_out_weekday = dias[dias.length - 1].weekday;
      const deAhora = diasDe(fechas.entrada, fechas.salida).days;
      change.now_check_in = fechas.entrada;
      change.now_check_in_weekday = deAhora[0].weekday;
      change.now_check_out = fechas.salida;
      change.now_check_out_weekday = deAhora[deAhora.length - 1].weekday;
    }
    const sobre = tabla.rows.find((r) => r.id === l.base_row);
    return [
      {
        lever_row: l.id,
        lever: l.lever,
        applies_to: {
          lodging_label: sobre?.lodging_label ?? SIN_SABER,
          way: ways.find((w) => w.row === l.base_row)?.id ?? "none",
        },
        change,
        saves: l.saves,
        total: l.total,
        minutes_change: l.minutes_change,
        score: l.score,
        chosen_because: dicha.why,
      },
    ];
  });

  const noches = diasDe(fechas.entrada, fechas.salida).nights;
  // Una tabla de antes de que dijera si el viaje se anda es de un viaje que se andaba: no había otros.
  const aPie = tabla.on_foot ?? true;
  return {
    ways: { currency: tabla.currency, nights: noches, on_foot: aPie, score_out_of: NOTA_SOBRE, ways },
    levers,
    checks: cruce.checks,
  };
}
