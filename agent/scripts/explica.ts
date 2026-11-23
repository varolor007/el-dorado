// Lo que el código le prepara al asiento que explica: las maneras ya cerradas, con sus números y con las
// diferencias frente a la más barata ya hechas, y las palancas que se van a contar. El asiento no resta: copia.

import {
  SIN_SABER,
  type EntregaDeCruce,
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
  walk_minutes: number | string;
  cancellable: boolean | string;
  unconfirmed: string[];
  /** Cómo es el alojamiento: cada campo, con su nivel y lo que se vio o se dijo. */
  is_like: Record<string, { level: string; what: string }>;
  good: string;
  bad: string;
  warnings: string[];
  /** Las diferencias frente a la más barata, ya hechas. */
  versus_cheapest: { costs_more: number | string; walk_minutes_less: number | string; score_higher: number | string };
  lever?: string;
  chosen_because?: string;
};

export type PalancaParaExplicar = {
  lever_row: string;
  lever: string;
  change: Record<string, string | number>;
  saves: number;
  total: number | string;
  walk_minutes_change: number | string;
  score: number | string;
  chosen_because: string;
};

export type ParaExplicar = {
  ways: { currency: string; nights: number; ways: ManeraParaExplicar[] };
  levers: PalancaParaExplicar[];
  checks: EntregaDeCruce["checks"];
};

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
      zone_name: zonas.find((z) => z.id === r.zone)?.name ?? SIN_SABER,
      total: r.total,
      lodging_total: r.lodging_total,
      transport_total: r.transport_total ?? "none",
      score: r.score,
      walk_minutes: r.walk_minutes,
      cancellable: r.cancellable,
      unconfirmed: r.unconfirmed,
      is_like: comoEs(mirado),
      good: mirado?.summary_good ?? SIN_SABER,
      bad: mirado?.summary_bad ?? SIN_SABER,
      warnings: (mirado?.warnings ?? []).map((a) => a.what),
      versus_cheapest: {
        costs_more: barata === null ? SIN_SABER : resta(r.total, barata.total),
        walk_minutes_less: barata === null ? SIN_SABER : resta(barata.walk_minutes, r.walk_minutes),
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
    return [
      {
        lever_row: l.id,
        lever: l.lever,
        change,
        saves: l.saves,
        total: l.total,
        walk_minutes_change: l.walk_minutes_change,
        score: l.score,
        chosen_because: dicha.why,
      },
    ];
  });

  const noches = diasDe(fechas.entrada, fechas.salida).nights;
  return { ways: { currency: tabla.currency, nights: noches, ways }, levers, checks: cruce.checks };
}
