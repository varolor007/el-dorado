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
import { CODIGO, PASOS } from "../data/pasos.ts";
import { puertaEntendido } from "../gates/puerta_entendido.ts";
import type { Entendido } from "../scripts/formas.ts";
import { impactoDe, type Impacto } from "../scripts/impacto.ts";
import { ESCUCHADO, type Escuchado } from "./escuchar.ts";
import { apuntar, guardarJson, nuevoRun, type ViajeEnLaMesa } from "./mesa.ts";
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
  // Lo entendido del viaje es el de la versión de la que se parte, o el nuevo si el cambio es suyo.
  const entendido: Entendido =
    o.entendido ?? (JSON.parse(readFileSync(join(desde, "entendido.json"), "utf8")) as Entendido);
  guardarJson(join(v.carpeta, "entendido.json"), entendido);
  const run = nuevoRun(v, cuando, (aparte) => {
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
