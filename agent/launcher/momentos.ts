// El viaje a ratos, en la mesa: tus elecciones sobre cada versión, la lista de las versiones que ha tenido el viaje
// (cuándo y por qué) y lo que está por rehacer porque un cambio aún no ha dado su versión. Las cuentas, sin Node, en
// `agent/scripts/elecciones.ts`, `estado.ts` e `impacto.ts`.
//
//   elecciones/<n>.json   lo que elegiste sobre la versión n; se guarda encima, y la versión no se toca

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PiezaDelViaje } from "../data/momentos.ts";
import type { Viaje } from "../output/viaje.ts";
import { comprobarElecciones, SIN_ELEGIR, type Elecciones } from "../scripts/elecciones.ts";
import { estadoDe, type EstadoDelViaje } from "../scripts/estado.ts";
import { impactoDe } from "../scripts/impacto.ts";
import { apuntar, guardarJson, leerVersion, ultimoRun, type ViajeEnLaMesa } from "./mesa.ts";
import { rehechoDe } from "./rehacer.ts";

const deLaVersion = (v: ViajeEnLaMesa, n: number): string => join(v.carpeta, "elecciones", `${n}.json`);

/** El viaje de una versión, o null si no la tiene. */
export function viajeDeLaVersion(v: ViajeEnLaMesa, n: number | null = v.ficha.version): Viaje | null {
  return (leerVersion(v, n)?.viaje as Viaje | undefined) ?? null;
}

/** Lo que elegiste sobre una versión; lo propuesto si no elegiste nada, o si lo guardado ya no es de ella. */
export function leerElecciones(v: ViajeEnLaMesa, n: number | null = v.ficha.version): Elecciones {
  const viaje = viajeDeLaVersion(v, n);
  if (n === null || viaje === null || !existsSync(deLaVersion(v, n))) return SIN_ELEGIR;
  try {
    const guardado = JSON.parse(readFileSync(deLaVersion(v, n), "utf8")) as { elecciones?: unknown };
    return comprobarElecciones(viaje, guardado.elecciones);
  } catch {
    return SIN_ELEGIR;
  }
}

/**
 * Guarda tus elecciones sobre la versión que se enseña, encima de las de antes: elegir no gasta ni deja versión. Solo
 * con el viaje en el mapa. Se miran contra el viaje: lo que no es suyo lanza `EleccionQueNoVale`, y no se guarda.
 */
export function guardarElecciones(v: ViajeEnLaMesa, crudo: unknown, cuando = new Date()): Elecciones {
  if (v.ficha.estado !== "on_map" || v.ficha.version === null) throw new Error("solo se elige en un viaje en el mapa");
  const viaje = viajeDeLaVersion(v);
  if (viaje === null) throw new Error("el viaje no tiene versión");
  const e = comprobarElecciones(viaje, crudo);
  mkdirSync(join(v.carpeta, "elecciones"), { recursive: true, mode: 0o700 });
  guardarJson(deLaVersion(v, v.ficha.version), {
    version: v.ficha.version,
    cuando: cuando.toISOString(),
    elecciones: e,
  });
  apuntar(v, "choice", { version: v.ficha.version, campos: Object.keys(crudo as object) }, cuando);
  return e;
}

/** Por qué tiene el viaje cada versión, por su clave: la primera, un cambio o el cierre. */
export type VersionDeCara = {
  n: number;
  when: string;
  why: "first" | "change" | "closed";
  /** La de un cambio: de qué versión partió y con qué clases. */
  from: number | null;
  changes: string[];
  shown: boolean;
};

/** Las versiones del viaje, de la primera a la última, para el viajero. */
export function versionesDe(v: ViajeEnLaMesa): VersionDeCara[] {
  return v.ficha.versiones.map((x) => ({
    n: x.n,
    when: x.cuando,
    why: x.cierre !== undefined || x.motivo === "closed" ? "closed" : x.motivo === "first" ? "first" : "change",
    from: x.de ?? null,
    changes: x.cambio ?? [],
    shown: x.n === v.ficha.version,
  }));
}

/**
 * Lo que está por rehacer: las piezas que dejó sin valer un cambio de la versión que se enseña que aún no ha dado su
 * versión (porque corre, espera el adelante o se paró). Sale del último run; si no rehace nada, no hay nada.
 */
export function porRehacer(v: ViajeEnLaMesa): PiezaDelViaje[] {
  const run = ultimoRun(v);
  if (run === null) return [];
  const r = rehechoDe(run);
  if (r === null || r.version !== v.ficha.version) return [];
  if (v.ficha.versiones.some((x) => x.run === v.ficha.runs.length)) return [];
  return impactoDe(r.cambio).pieces;
}

/** El estado de cada pieza de la versión que se enseña, con tus elecciones; null si no hay versión. */
export function estadoDelViaje(v: ViajeEnLaMesa, cuando = new Date()): EstadoDelViaje | null {
  const viaje = viajeDeLaVersion(v);
  if (viaje === null) return null;
  return estadoDe(viaje, leerElecciones(v), cuando.toISOString(), porRehacer(v));
}
