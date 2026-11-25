// El presupuesto entero (14.5), en código y sin IA, sin nada de Node: a dormir y llegar les suma lo que se sabe de las
// entradas, de moverse allí y de llegar de donde se aterriza; las comidas, aparte, como una horquilla. Lo que no se
// sabe ni se suma ni se esconde: se cuenta. Lo que va en otra moneda no se suma: se dice aparte. Las tres maneras se
// siguen comparando por dormir y llegar: esto no cambia cuál gana.
//
// El suelo (14.1) deja la forma y lo que ya se sabe sin las capas (dormir y llegar, de cada manera); la cuenta de las
// entradas, de moverse y de llegar de donde se aterriza la pone su sesión (14.5), en `partesDeLasCapas`.

import type { PARTES_DEL_PRESUPUESTO } from "../data/presupuesto.ts";
import type {
  DeLasEntradas,
  DeMoverse,
  DelDestino,
  FuenteDeUnDato,
  Importe,
  ParteDelPresupuesto,
  Presupuesto,
  PresupuestoDeUnaManera,
} from "../output/capas.ts";
import type { Viaje } from "../output/viaje.ts";

/** Las capas con que se hace la cuenta: cada una puede no estar o faltar. */
export type CapasParaLaCuenta = { moverse?: DeMoverse; saber?: DelDestino; entradas?: DeLasEntradas };

/** Una parte que no se sabe: sin total, y cuántas cosas faltan. */
export const sinSaber = (
  parte: (typeof PARTES_DEL_PRESUPUESTO)[number],
  moneda: string,
  faltan: number,
): ParteDelPresupuesto => ({ parte, origen: "unknown", total: null, moneda, fuentes: [], faltan, aparte: [] });

/** Una fuente de un precio del viaje, si su enlace es una página: el de su vendedor, con el día en que se vio. */
function fuenteDelPrecio(p: { enlace: string | null; visto: string }): FuenteDeUnDato[] {
  return p.enlace === null ? [] : [{ url: p.enlace, visto: p.visto.slice(0, 10) }];
}

/** Dormir y llegar de una manera, de los precios que ya trae el viaje: son los que la comparan con las otras. */
function dormirYLlegar(v: Viaje, m: Viaje["maneras"][number]): ParteDelPresupuesto[] {
  const a = v.alojamientos.find((x) => x.id === m.alojamiento);
  const t = m.transporte === null ? undefined : v.transportes.find((x) => x.id === m.transporte);
  const dePrecio = (parte: "lodging" | "transport", p: Viaje["alojamientos"][number]["precio"]): ParteDelPresupuesto =>
    p.moneda === m.moneda
      ? {
          parte,
          origen: "priced",
          total: p.total,
          moneda: m.moneda,
          fuentes: fuenteDelPrecio(p),
          faltan: 0,
          aparte: [],
        }
      : { ...sinSaber(parte, m.moneda, 0), aparte: [{ importe: p.total, moneda: p.moneda }] };
  return [
    a === undefined ? sinSaber("lodging", m.moneda, 1) : dePrecio("lodging", a.precio),
    t === undefined ? sinSaber("transport", m.moneda, 1) : dePrecio("transport", t.precio),
  ];
}

/**
 * Las partes que salen de las capas: llegar de donde se aterriza, moverse allí y las entradas. El suelo las deja sin
 * saber, con lo que falta contado: una cosa por parte, y una por parada de los días en las entradas. La cuenta de
 * verdad (sueltos o abono, el grupo por edades) es de 14.5.
 */
export function partesDeLasCapas(v: Viaje, moneda: string, _capas: CapasParaLaCuenta): ParteDelPresupuesto[] {
  const puestas = v.dias.reduce((n, d) => n + d.paradas.length, 0);
  return [sinSaber("arrival", moneda, 1), sinSaber("getting_around", moneda, 1), sinSaber("tickets", moneda, puestas)];
}

/** Las comidas, aparte: una horquilla por día, de lo que suele costar una comida allí. El suelo la deja sin saber. */
export function comidasDe(_capas: CapasParaLaCuenta): Presupuesto["comidas"] {
  return null;
}

/** Suma las partes de una manera: lo que se sabe en su moneda, lo que falta y lo que va en otra moneda, aparte. */
export function sumarPartes(manera: string, moneda: string, partes: ParteDelPresupuesto[]): PresupuestoDeUnaManera {
  const aparte: Importe[] = [];
  for (const p of partes)
    for (const a of p.aparte) {
      const ya = aparte.find((x) => x.moneda === a.moneda);
      if (ya === undefined) aparte.push({ ...a });
      else ya.importe = Math.round((ya.importe + a.importe) * 100) / 100;
    }
  return {
    manera,
    partes,
    total: Math.round(partes.reduce((s, p) => s + (p.total ?? 0), 0) * 100) / 100,
    moneda,
    faltan: partes.reduce((s, p) => s + p.faltan, 0),
    aparte,
  };
}

/** El presupuesto entero de un viaje ya montado, por manera, con las capas que haya. */
export function presupuestoDe(v: Viaje, capas: CapasParaLaCuenta): Presupuesto {
  const maneras = v.maneras.map((m) =>
    sumarPartes(m.id, m.moneda, [...dormirYLlegar(v, m), ...partesDeLasCapas(v, m.moneda, capas)]),
  );
  return { maneras, comidas: comidasDe(capas), falta: null };
}
