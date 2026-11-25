// El presupuesto entero (14.5) en la investigación: cuando se monta el viaje, se le ponen las capas que haya en el run
// (cómo moverse, lo que conviene saber y las entradas de sus paradas) y se hace la cuenta, que es código. Lo que
// queda en el run:
//
//   presupuesto.json   el presupuesto entero, por manera, con de dónde sale cada parte
//
// La cuenta es de `agent/scripts/presupuesto.ts`; su sesión (14.5) la rellena allí, no aquí. Sin IA.

import type { DeLasEntradas, DeMoverse, DelDestino } from "../output/capas.ts";
import type { Viaje } from "../output/viaje.ts";
import { presupuestoDe, type CapasParaLaCuenta } from "../scripts/presupuesto.ts";
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

/** El viaje con sus capas y su presupuesto entero, que se guarda también en el run. */
export function conLasCapas(run: string, v: Viaje): Viaje {
  const capas = capasDelRun(
    run,
    v.paradas.map((p) => p.id),
  );
  const conEllas: Viaje = { ...v, ...capas };
  const presupuesto = presupuestoDe(conEllas, capas);
  guardarEnElRun(run, PRESUPUESTO, presupuesto);
  return { ...conEllas, presupuesto };
}
