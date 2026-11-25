// Rehacer solo lo que dejó de valer: abre una investigación nueva a partir de la de la versión que se enseña. Se queda
// con lo que sigue valiendo (los pasos que no leen nada de lo que cambió, con lo que dejaron, los puestos de sus
// asientos y sus veredictos, sin volver a gastar en ellos) y deja el resto sin hacer. Después la lleva la casa como
// cualquier otra (`llevar`, en `casa.ts`): por las mismas puertas, con el adelante del viajero y su techo si gasta, y
// retomándola desde el disco si se corta. Al acabar deja una versión nueva; la de antes no se pisa.
//
// Qué deja de valer con cada cambio lo dice `agent/scripts/impacto.ts`, con la tabla de `agent/data/momentos.ts`.

import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LO_QUE_DEJA, REHECHO, SE_VUELVE_A_CONTAR, TOPES_DE_UN_VIAJE } from "../data/momentos.ts";
import type { ClaseDeCambio, IdDePaso } from "../data/momentos.ts";
import { CODIGO, PARADO, PASOS } from "../data/pasos.ts";
import { puertaEntendido } from "../gates/puerta_entendido.ts";
import type { Entendido } from "../scripts/formas.ts";
import { impactoDe, type Impacto } from "../scripts/impacto.ts";
import { ESCUCHADO, type Escuchado } from "./escuchar.ts";
import { apuntar, guardarJson, nuevoRun, quedarseComoSuVersion, ultimoRun, type ViajeEnLaMesa } from "./mesa.ts";
import { turnoDeLosPapeles } from "./papeles.ts";
import { porDondeVa } from "./pasos.ts";
import { puestosDe } from "./puesto.ts";

/** Lo que queda en un run que rehace otro: de cuál viene, con qué cambio, y qué conservó y qué rehace. */
export type Rehecho = {
  /** El run del que parte, y la versión que se enseñaba. */
  de: number;
  version: number;
  cambio: ClaseDeCambio[];
  conserva: IdDePaso[];
  rehace: IdDePaso[];
  /** Lo que pide el momento que lo lanza, para el paso que lo lea (otra zona, otro candidato); null si nada. */
  pedido: unknown;
  cuando: string;
};

/** Por qué no se rehace, por su clave: no está en el mapa, no hay nada que rehacer, o ya hay demasiadas versiones. */
export class FalloAlRehacer extends Error {}

export type AlRehacer = {
  /** Las clases del cambio (`clasesDelCambio`, o la de la pieza que cambia el momento). */
  clases: ClaseDeCambio[];
  /** Lo entendido de después, si el cambio es de lo entendido; si no, se queda el de la versión. */
  entendido?: Entendido;
  /** Lo que pide el momento, guardado tal cual en `rehecho.json`. */
  pedido?: unknown;
  cuando?: Date;
};

/** El run de la versión que se enseña, y la versión. */
function deLaQueSeEnsena(v: ViajeEnLaMesa): { run: number; version: number } {
  const version = v.ficha.versiones.find((x) => x.n === v.ficha.version);
  if (version === undefined) throw new FalloAlRehacer("not_on_map");
  return { run: version.run, version: version.n };
}

/**
 * Se copia con sus horas: la puerta de todos mira que un asiento escribió sus pasos en su orden, por la hora de cada
 * archivo, y una copia con horas nuevas no lo diría.
 */
const COPIA = { recursive: true, preserveTimestamps: true } as const;

/** Copia del run de antes lo que deja un paso que sigue valiendo, con los puestos de su asiento. */
function copiarElPaso(desde: string, hasta: string, id: IdDePaso, rehace: IdDePaso[]): void {
  const t = SE_VUELVE_A_CONTAR;
  const menos = t.paso === id && t.si.some((x) => rehace.includes(x)) ? t.menos : [];
  for (const nombre of LO_QUE_DEJA[id].filter((x) => !menos.includes(x))) {
    const origen = join(desde, nombre.replace(/\/$/, ""));
    if (existsSync(origen)) cpSync(origen, join(hasta, nombre.replace(/\/$/, "")), COPIA);
  }
  const asiento = PASOS.find((p) => p.id === id)?.quien ?? CODIGO;
  if (asiento === CODIGO) return;
  for (const p of puestosDe(desde).filter((x) => x.asiento === asiento)) {
    for (const nombre of [
      `puestos/${p.id}`,
      `sellos/${p.id}.json`,
      `${p.id}.puertas.json`,
      `consultado/${p.id}.json`,
      `ordenes/${p.id}.txt`,
    ]) {
      const origen = join(desde, nombre);
      if (existsSync(origen)) cpSync(origen, join(hasta, nombre), COPIA);
    }
  }
}

/**
 * Abre la investigación que rehace la de la versión que se enseña, con lo que sigue valiendo ya puesto, y devuelve
 * su carpeta y su impacto. No lanza nada ni gasta: lo lanza quien la lleve, con `llevar`, tras el adelante del
 * viajero si su impacto gasta.
 */
export function rehacer(v: ViajeEnLaMesa, o: AlRehacer): { run: string; n: number; impacto: Impacto } {
  const cuando = o.cuando ?? new Date();
  if (v.ficha.estado !== "on_map" && v.ficha.estado !== "closed") throw new FalloAlRehacer("not_on_map");
  if (v.ficha.versiones.length >= TOPES_DE_UN_VIAJE.versiones || v.ficha.runs.length >= TOPES_DE_UN_VIAJE.runs)
    throw new FalloAlRehacer("too_many_versions");
  const impacto = impactoDe(o.clases);
  if (impacto.redo.length === 0) throw new FalloAlRehacer("nothing_to_redo");
  if (o.entendido !== undefined && !puertaEntendido(o.entendido, { hoy: cuando.toISOString().slice(0, 10) }).verde)
    throw new FalloAlRehacer("unclear");
  const base = deLaQueSeEnsena(v);
  const desde = join(v.carpeta, "runs", String(base.run));
  if (!existsSync(join(desde, "viaje.json"))) throw new FalloAlRehacer("not_on_map");
  const rehace = impacto.redo.map((x) => x.step);
  const conserva = impacto.keep;
  // Lo entendido del run es el de la versión de la que se parte, o el nuevo si el cambio es suyo. El del viaje se
  // queda como el de la versión que se enseña: pasa a ser el nuevo cuando salga su versión.
  const entendido: Entendido =
    o.entendido ?? (JSON.parse(readFileSync(join(desde, "entendido.json"), "utf8")) as Entendido);
  const run = nuevoRun(v, cuando, (aparte) => {
    guardarJson(join(aparte, "entendido.json"), entendido);
    for (const id of conserva) copiarElPaso(desde, aparte, id, rehace);
    // Lo que escuchó el que escucha sigue valiendo, con lo entendido de ahora: no se le pregunta otra vez.
    if (existsSync(join(aparte, ESCUCHADO))) {
      const antes = JSON.parse(readFileSync(join(aparte, ESCUCHADO), "utf8")) as Escuchado;
      guardarJson(join(aparte, ESCUCHADO), { entendido, escuchado: antes.escuchado } satisfies Escuchado);
    }
    const rehecho: Rehecho = {
      de: base.run,
      version: base.version,
      cambio: [...o.clases],
      conserva,
      rehace,
      pedido: o.pedido ?? null,
      cuando: cuando.toISOString(),
    };
    guardarJson(join(aparte, REHECHO), rehecho);
  });
  const n = v.ficha.runs.length;
  apuntar(v, "redo", { run: n, de: base.run, version: base.version, cambio: o.clases, rehace }, cuando);
  return { run, n, impacto };
}

/** Lo que dice un run que rehace otro; null si es una investigación entera. */
export function rehechoDe(run: string): Rehecho | null {
  try {
    return JSON.parse(readFileSync(join(run, REHECHO), "utf8")) as Rehecho;
  } catch {
    return null;
  }
}

/**
 * El cambio que se paró sin dar su versión: el último run, si rehace la versión que se enseña, está parado y aún
 * no ha dejado la suya. Es el que se puede volver a intentar con el viaje como su versión. Null si no hay tal.
 */
export function cambioParado(v: ViajeEnLaMesa): { run: string; n: number; rehecho: Rehecho } | null {
  const run = ultimoRun(v);
  if (run === null || !existsSync(join(run, PARADO))) return null;
  const rehecho = rehechoDe(run);
  const n = v.ficha.runs.length;
  if (rehecho === null || rehecho.version !== v.ficha.version) return null;
  if (v.ficha.versiones.some((x) => x.run === n && x.cierre === undefined)) return null;
  return { run, n, rehecho };
}

/**
 * Si un cambio del viaje se paró, o se quedó a medias sin nadie que lo lleve (`sinNadie`: la casa se cortó, y al
 * volver no lo lleva nadie), el viaje vuelve a estar como la versión que se enseña: en el mapa o cerrado, con lo
 * entendido de ella. El run se queda, parado, para volver a intentarlo; el que estaba a medias, parado por la casa.
 * No toca un run que espera tu turno (los papeles). Devuelve verdadero si lo soltó.
 */
export function soltarElCambio(v: ViajeEnLaMesa, cuando = new Date(), sinNadie = false): boolean {
  if (v.ficha.estado !== "researching") return false;
  const run = ultimoRun(v);
  if (run === null || existsSync(join(run, "viaje.json"))) return false;
  const rehecho = rehechoDe(run);
  if (rehecho === null || rehecho.version !== v.ficha.version) return false;
  if (!existsSync(join(run, PARADO))) {
    if (!sinNadie || turnoDeLosPapeles(run)) return false;
    guardarJson(join(run, PARADO), {
      en: porDondeVa(run).find((x) => x.estado !== "done")?.id ?? "trip",
      paso: "la casa",
      rojos: [{ donde: "house", que: "la casa se cortó mientras rehacía, y nadie la llevaba" }],
    });
  }
  quedarseComoSuVersion(v, cuando);
  apuntar(v, "change_stopped", { run: v.ficha.runs.length, version: rehecho.version }, cuando);
  return true;
}
