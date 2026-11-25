// El presupuesto entero (14.5) en la investigación: cuando se monta el viaje, se le ponen las capas que haya en el run
// (cómo moverse, lo que conviene saber y las entradas de sus paradas) y se hace la cuenta, que es código. Lo que
// queda en el run:
//
//   presupuesto.json   el presupuesto entero, por manera, con de dónde sale cada parte
//
// La cuenta es de `agent/scripts/presupuesto.ts`; aquí solo se leen del run las capas y las zonas de la ruta. Sin IA.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeLasEntradas, DeMoverse, DelDestino } from "../output/capas.ts";
import type { Viaje } from "../output/viaje.ts";
import type { ZonaResuelta } from "../scripts/formas.ts";
import { presupuestoDe, type CapasParaLaCuenta, type ZonaParaLaCuenta } from "../scripts/presupuesto.ts";
import { capaDelRun, guardarEnElRun } from "./capas.ts";
import { SABER } from "./capa_destino.ts";
import { ENTRADAS } from "./capa_entradas.ts";
import { MOVERSE } from "./capa_moverse.ts";

export const PRESUPUESTO = "presupuesto.json";

/** Las capas del run, como las ve el viaje: las entradas, solo de sus paradas. La que no está, no va. */
export function capasDelRun(run: string, paradas: readonly string[]): CapasParaLaCuenta {
  const moverse = capaDelRun<DeMoverse>(run, MOVERSE);
  const saber = capaDelRun<DelDestino>(run, SABER);
  const todas = capaDelRun<DeLasEntradas>(run, ENTRADAS);
  const entradas =
    todas === undefined ? undefined : { ...todas, sitios: todas.sitios.filter((s) => paradas.includes(s.parada)) };
  return {
    ...(moverse === undefined ? {} : { moverse }),
    ...(saber === undefined ? {} : { saber }),
    ...(entradas === undefined ? {} : { entradas }),
  };
}

/**
 * Las zonas de la ruta del run, por su id y por el nombre con que el viaje dice la zona de cada alojamiento: con ellas
 * se sabe a qué zona hay que llegar desde donde se aterriza. Sin la ruta, ninguna.
 */
export function zonasDelRun(run: string): ZonaParaLaCuenta[] {
  const ruta = join(run, "ruta.json");
  if (!existsSync(ruta)) return [];
  try {
    const { zonas } = JSON.parse(readFileSync(ruta, "utf8")) as { zonas?: ZonaResuelta[] };
    return (zonas ?? []).map((z) => ({ id: z.id, nombre: z.label }));
  } catch {
    return [];
  }
}

/** El viaje con sus capas y su presupuesto entero, que se guarda también en el run. */
export function conLasCapas(run: string, v: Viaje): Viaje {
  const capas = capasDelRun(
    run,
    v.paradas.map((p) => p.id),
  );
  const conEllas: Viaje = { ...v, ...capas };
  const presupuesto = presupuestoDe(conEllas, capas, { zonas: zonasDelRun(run) });
  guardarEnElRun(run, PRESUPUESTO, presupuesto);
  return { ...conEllas, presupuesto };
}
