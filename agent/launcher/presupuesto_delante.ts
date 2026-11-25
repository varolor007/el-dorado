// El presupuesto entero delante del que cruza y del que explica (14.7). La hoja pone la cuenta antes del que explica:
// aquí se hace antes de que corran, con las capas que haya en el run, y se les da en su material, en inglés, y a sus
// puertas (la 6 y la 7), que miran con ella las cifras de una frase del presupuesto entero
// (`agent/gates/cifras_del_presupuesto.ts`). Al que cruza, una cuenta por cada fila de la tabla, porque las maneras
// aún no están; al que explica, la de las tres maneras que cerró el que cruza, la misma que llevará el viaje; y al
// cerrar, la del viaje que cierras, con tus días y lo que elegiste.
//
// La cuenta es de `agent/scripts/presupuesto.ts`, y las capas y las zonas del run, de `presupuesto.ts`. Sin IA.

import type { DeLasEntradas, Presupuesto } from "../output/capas.ts";
import { MANERAS, type Viaje } from "../output/viaje.ts";
import type { EntregaDeCruce, EntregaDeExplicar } from "../scripts/formas.ts";
import { montarViajeHecho, type Hecho } from "../scripts/monta_viaje.ts";
import { presupuestoDe, type CapasParaLaCuenta, type ZonaParaLaCuenta } from "../scripts/presupuesto.ts";
import { capasDelRun, zonasDelRun } from "./presupuesto.ts";

/** Lo del run con lo que se monta el viaje, sin lo que deciden el que cruza y el que explica. */
export type ParaLaCuenta = Omit<Hecho, "cruce" | "explica">;

/** Lo que explica nadie todavía: las maneras sin sus frases, para montar el viaje y hacer su cuenta. */
const sinFrases = (ids: readonly string[], idioma: string): EntregaDeExplicar => ({
  seat: "trip-explainer",
  language: idioma,
  ways: ids.map((id) => ({ id, why: "", gains: "", loses: "" })),
  levers: [],
  unknowns: [],
});

/** La cuenta de un viaje montado, con las capas del run, como la hace `conLasCapas` al montarlo de verdad. */
function cuentaDe(v: Viaje, run: string, zonas: ZonaParaLaCuenta[]): Presupuesto {
  const capas = capasDelRun(
    run,
    v.paradas.map((p) => p.id),
  );
  return presupuestoDe({ ...v, ...capas }, capas, { zonas });
}

/**
 * Para el que cruza: una cuenta por cada fila de la tabla que no está descartada, por el id de la fila, como si esa
 * fila fuera la manera del medio (de ella salen los días). Lo de las capas es lo mismo en todas las maneras de un
 * viaje; lo que cambia con la fila es dormir, llegar y llegar a donde se duerme.
 */
export function presupuestoParaElCruce(run: string, h: ParaLaCuenta): Presupuesto {
  const zonas = zonasDelRun(run);
  const maneras: Presupuesto["maneras"] = [];
  let comidas: Presupuesto["comidas"] = null;
  for (const fila of h.tabla.rows.filter((r) => r.discarded === "")) {
    const cruce = {
      seat: "trip-crosser",
      levers: [],
      ways: { cheapest: "none", best_value: { row: fila.id, total: fila.total }, different: "none" },
      tell: [],
      checks: [],
      requests: [],
      unknowns: [],
    } as unknown as EntregaDeCruce;
    const v = montarViajeHecho({ ...h, cruce, explica: sinFrases(["best_value"], h.viaje.language) });
    const p = cuentaDe(v, run, zonas);
    comidas = p.comidas;
    for (const m of p.maneras) maneras.push({ ...m, manera: fila.id });
  }
  return { maneras, comidas, falta: null };
}

/** Para el que explica: la cuenta de las maneras que cerró el que cruza, la misma que llevará el viaje. */
export function presupuestoParaExplicar(run: string, h: ParaLaCuenta, cruce: EntregaDeCruce): Presupuesto {
  const ids = MANERAS.filter((id) => typeof cruce.ways[id] !== "string");
  const v = montarViajeHecho({ ...h, cruce, explica: sinFrases(ids, h.viaje.language) });
  return cuentaDe(v, run, zonasDelRun(run));
}

/**
 * Al cerrar: la cuenta del viaje que cierras (con tus días, tu alojamiento y tu transporte), con sus capas y las zonas
 * del run de su versión. Sin el run, sin zonas: llegar a donde se duerme, si no se sabe a qué zona, no se sabe.
 */
export function presupuestoDelCierre(v: Viaje, run: string | null): Presupuesto {
  const deLasParadas = new Set(v.dias.flatMap((d) => d.paradas));
  const entradas: DeLasEntradas | undefined =
    v.entradas === undefined
      ? undefined
      : { ...v.entradas, sitios: v.entradas.sitios.filter((s) => deLasParadas.has(s.parada)) };
  const capas: CapasParaLaCuenta = {
    ...(v.moverse === undefined ? {} : { moverse: v.moverse }),
    ...(v.saber === undefined ? {} : { saber: v.saber }),
    ...(entradas === undefined ? {} : { entradas }),
  };
  return presupuestoDe({ ...v, ...capas }, capas, { zonas: run === null ? [] : zonasDelRun(run) });
}

/**
 * La cuenta como la ve un asiento, en inglés y sin las páginas: por manera (o por fila), su total con lo que se sabe,
 * cuántas cosas no se saben y lo que va en otra moneda, y parte a parte; y las comidas, aparte.
 */
export function presupuestoParaElAsiento(p: Presupuesto, por: "way" | "row"): Record<string, unknown> {
  const aparte = (xs: { importe: number; moneda: string }[]): { amount: number; currency: string }[] =>
    xs.map((x) => ({ amount: x.importe, currency: x.moneda }));
  return {
    what:
      "The whole budget, worked out by the house: lodging and getting there, plus tickets, getting around there and " +
      "getting from where you land to where you sleep. Meals are apart, per person and per day. A total adds only " +
      "what is known; `unknown_items` says how many things in it are not known; `other_currency` is not added.",
    [por === "way" ? "ways" : "rows"]: p.maneras.map((m) => ({
      [por]: m.manera,
      currency: m.moneda,
      total: m.total,
      unknown_items: m.faltan,
      other_currency: aparte(m.aparte),
      parts: m.partes.map((x) => ({
        part: x.parte,
        origin: x.origen,
        total: x.total ?? "unknown",
        unknown_items: x.faltan,
        other_currency: aparte(x.aparte),
      })),
    })),
    meals_per_person_per_day:
      p.comidas === null ? "unknown" : { from: p.comidas.desde, to: p.comidas.hasta, currency: p.comidas.moneda },
  };
}
