// Por dónde va un run, leído de su carpeta: cada paso de `agent/data/pasos.ts`, con su estado. No guarda nada ni
// recuerda nada: lo que hay en el disco es lo que ha pasado, y por eso un run se puede retomar o volver a enseñar.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RONDAS } from "../data/palancas.ts";
import { CODIGO, PARADO, PASOS, type EstadoDeUnPaso } from "../data/pasos.ts";
import { escuchaHecha, turnoDelViajero } from "./escuchar.ts";
import { papelesDelRun, paranElViaje, turnoDeLosPapeles } from "./papeles.ts";
import { puestosDe } from "./puesto.ts";

export type PasoDelRun = {
  id: string;
  quien: string;
  puerta: number | null;
  estado: EstadoDeUnPaso;
  /** Los puestos de su asiento que aún no han entregado. */
  esperan: string[];
};

const hay = (run: string, nombre: string): boolean => existsSync(join(run, nombre));

function leer(run: string, nombre: string): unknown {
  try {
    return JSON.parse(readFileSync(join(run, nombre), "utf8"));
  } catch {
    return null;
  }
}

/** La tabla y el cruce van por rondas: en cuál está el run, y si el cruce ya está cerrado. */
function rondas(run: string): { tabla: boolean; cruce: boolean } {
  for (let r = 1; r <= RONDAS; r++) {
    if (!hay(run, `cruce-${r}.json`)) return { tabla: hay(run, `tabla-${r}.json`), cruce: false };
    const cruce = leer(run, `cruce-${r}.json`) as { entrega?: { requests?: unknown[] } } | null;
    if ((cruce?.entrega?.requests?.length ?? 0) === 0) return { tabla: true, cruce: true };
  }
  return { tabla: true, cruce: true };
}

function hecho(run: string, id: string, deja: string[]): boolean {
  if (id === "understood") return escuchaHecha(run);
  if (id === "papers") {
    const p = papelesDelRun(run);
    return p !== null && (!paranElViaje(p) || p.sigue);
  }
  if (id === "table") return rondas(run).tabla;
  if (id === "cross") return rondas(run).cruce;
  return deja.every((nombre) => hay(run, nombre));
}

/** Cada paso de la investigación, en su orden, como está en el disco. */
export function porDondeVa(run: string): PasoDelRun[] {
  const puestos = puestosDe(run);
  const parado = hay(run, PARADO) ? (leer(run, PARADO) as { en?: string } | null) : null;
  const pasos: PasoDelRun[] = PASOS.map((p) => {
    const suyos = p.quien === CODIGO ? [] : puestos.filter((x) => x.asiento === p.quien);
    const esperan = suyos.filter((x) => !existsSync(join(x.carpeta, "out", "delivery.json"))).map((x) => x.id);
    // Si los papeles no se pudieron mirar, su puesto quedó sin entregar: no se le espera, es el turno del viajero.
    const estado: EstadoDeUnPaso = hecho(run, p.id, p.deja)
      ? "done"
      : p.id === "papers" && turnoDeLosPapeles(run)
        ? "yours"
        : esperan.length > 0
          ? "waiting"
          : p.id === "understood" && turnoDelViajero(run)
            ? "yours"
            : "pending";
    const quedan = estado === "done" || estado === "yours" ? [] : esperan;
    return { id: p.id, quien: p.quien, puerta: p.puerta, estado, esperan: quedan };
  });
  if (parado !== null) {
    // Un run parado lo está en el paso que dejó escrito; si es de antes de que lo dijera, en el primero sin hacer.
    const donde = pasos.find((p) => p.id === parado.en) ?? pasos.find((p) => p.estado !== "done");
    if (donde !== undefined && donde.estado !== "done") donde.estado = "stopped";
  }
  return pasos;
}
