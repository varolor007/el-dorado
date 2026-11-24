// Los trabajos de la IA en un run: cada asiento que se lanzó, cómo está y lo que gastó de la clave del viajero.
// Quedan en la carpeta del run, y de ahí salen lo que ve el viajero de cada trabajo y lo que lleva gastado.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ESTADOS_DE_UN_TRABAJO, type EstadoDeUnTrabajo } from "../data/pasos.ts";
import { gastoQueVale, type Gasto } from "./asiento.ts";
import { guardarJson } from "./mesa.ts";

export const TRABAJOS = "trabajos.json";

export type Trabajo = {
  puesto: string;
  asiento: string;
  estado: EstadoDeUnTrabajo;
  desde: string | null;
  hasta: string | null;
  /** Lo que gastó; null si no se sabe. */
  gasto: Gasto | null;
  /** Por qué no acabó bien, si no acabó bien. Es para quien lleva el run: no viaja a la web. */
  fallo: string | null;
};

function trabajoQueVale(t: unknown): t is Trabajo {
  if (typeof t !== "object" || t === null) return false;
  const x = t as Record<string, unknown>;
  return (
    typeof x.puesto === "string" &&
    typeof x.asiento === "string" &&
    ESTADOS_DE_UN_TRABAJO.includes(x.estado as EstadoDeUnTrabajo) &&
    (x.gasto === null || gastoQueVale(x.gasto))
  );
}

/** Los trabajos de un run, en el orden en que se lanzaron. */
export function trabajosDe(run: string): Trabajo[] {
  const ruta = join(run, TRABAJOS);
  if (!existsSync(ruta)) return [];
  try {
    const leido: unknown = JSON.parse(readFileSync(ruta, "utf8"));
    return Array.isArray(leido) ? leido.filter(trabajoQueVale) : [];
  } catch {
    return [];
  }
}

/** Apunta cómo está un trabajo: si ya estaba, lo pone al día; si no, lo añade al final. */
export function apuntarTrabajo(run: string, t: Trabajo): void {
  const todos = trabajosDe(run);
  const i = todos.findIndex((x) => x.puesto === t.puesto);
  if (i < 0) todos.push(t);
  else todos[i] = t;
  guardarJson(join(run, TRABAJOS), todos);
}

/** Verdadero si ese puesto ya trabajó y acabó sin entregar: se le acabó el tope o falló. No se le espera más. */
export function acaboSinEntregar(run: string, puesto: string): boolean {
  const t = trabajosDe(run).find((x) => x.puesto === puesto);
  return t !== undefined && (t.estado === "stopped" || t.estado === "failed");
}

/** Lo que lleva gastado un run; `sabido` es falso si de algún trabajo acabado no se sabe lo que gastó. */
export function gastoDe(run: string): Gasto & { sabido: boolean } {
  const total = { turnos: 0, entrada: 0, salida: 0, usd: 0, sabido: true };
  for (const t of trabajosDe(run)) {
    if (t.gasto === null) {
      if (t.estado !== "queued" && t.estado !== "working") total.sabido = false;
      continue;
    }
    total.turnos += t.gasto.turnos;
    total.entrada += t.gasto.entrada;
    total.salida += t.gasto.salida;
    total.usd += t.gasto.usd;
  }
  return total;
}
