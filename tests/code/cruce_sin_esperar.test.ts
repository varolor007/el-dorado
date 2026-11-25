// El que cruza no espera a las capas (14.7): van por detrás y sin frenar el viaje, como dice la hoja. Si ya acabaron
// cuando le toca, lleva el presupuesto entero delante; si no, va sin él, y su puerta (la 6) no le deja decir ninguna
// cifra del presupuesto entero (CR10). El que explica sí las espera. Con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { puertaCruce } from "../../agent/gates/puerta_cruce.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import type { Tabla } from "../../agent/scripts/formas.ts";
import {
  fuentesInventadas,
  GASTO,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
} from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const CAPAS_DE_DETRAS = ["getting-around", "local-knowledge"];
const enIn = (run: string, puesto: string, nombre: string): string => join(run, "puestos", puesto, "in", nombre);

/**
 * Un lanzador de mentira cuyas capas de detrás no acaban hasta que se lanza el que cruza (o, si nunca se lanza, hasta
 * un tope, para que la prueba no se cuelgue). Apunta en qué orden acaba cada uno y si alguna capa llegó a su tope.
 */
function conCapasLentas(dice?: (cuenta: any) => string): Lanzador & { orden: string[]; tope: boolean } {
  let cruza!: () => void;
  const lanzado = new Promise<void>((r) => (cruza = r));
  const base = lanzadorDeMentira();
  const lanzador = (async (orden, puesto, corte) => {
    if (CAPAS_DE_DETRAS.includes(puesto.asiento)) {
      const tope = new Promise<"tope">((r) => setTimeout(() => r("tope"), 5000).unref());
      if ((await Promise.race([lanzado, tope])) === "tope") lanzador.tope = true;
    }
    if (puesto.asiento === "trip-crosser") {
      cruza();
      if (dice !== undefined) {
        trabaja(resolve(puesto.carpeta, "..", ".."), puesto.id, (_asiento, e) => {
          const cuenta = existsSync(join(puesto.carpeta, "in", "budget.json"))
            ? JSON.parse(readFileSync(join(puesto.carpeta, "in", "budget.json"), "utf8"))
            : null;
          e.unknowns = [dice(cuenta)];
        });
        lanzador.orden.push(puesto.asiento);
        return GASTO;
      }
    }
    const gasto = await base(orden, puesto, corte);
    lanzador.orden.push(puesto.asiento);
    return gasto;
  }) as Lanzador & { orden: string[]; tope: boolean };
  lanzador.orden = [];
  lanzador.tope = false;
  return lanzador;
}

test("el que cruza no espera a las capas de detrás: va sin el presupuesto, y el que explica sí lo lleva", async () => {
  const run = runNuevo();
  try {
    darElAdelante(run, null);
    const l = conCapasLentas();
    const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true, JSON.stringify(r.parado));
    assert.equal(l.tope, false, "una capa esperó a su tope: el que cruza la esperaba a ella");
    // El que cruza acabó antes que las dos capas, y sin el presupuesto en su material.
    const cruce = l.orden.indexOf("trip-crosser");
    for (const capa of CAPAS_DE_DETRAS) assert.ok(cruce < l.orden.indexOf(capa), `${capa} acabó antes que el cruce`);
    assert.equal(existsSync(enIn(run, "cruce-1-v1", "budget.json")), false);
    // El que explica, en cambio, las esperó: lleva la cuenta entera, la misma del viaje.
    assert.ok(l.orden.indexOf("trip-explainer") > Math.max(...CAPAS_DE_DETRAS.map((c) => l.orden.indexOf(c))));
    const delQueExplica = JSON.parse(readFileSync(enIn(run, "explica-v1", "budget.json"), "utf8"));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(
      delQueExplica.ways.map((x: { way: string; total: number }) => [x.way, x.total]),
      v.presupuesto!.maneras.map((m) => [m.manera, m.total]),
    );
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
});

test("si las capas ya acabaron cuando le toca, el que cruza lleva su presupuesto entero, y su cifra pasa", async () => {
  const run = runNuevo();
  try {
    darElAdelante(run, null);
    const l = lanzadorDeMentira();
    const suyo: Lanzador = async (orden, puesto, corte) => {
      if (puesto.asiento === "trip-crosser") {
        const cuenta = JSON.parse(readFileSync(join(puesto.carpeta, "in", "budget.json"), "utf8"));
        trabaja(resolve(puesto.carpeta, "..", ".."), puesto.id, (_a, e) => {
          e.unknowns = [`The whole trip comes to ${cuenta.rows[0].total} ${cuenta.rows[0].currency}.`];
        });
        return GASTO;
      }
      return l(orden, puesto, corte);
    };
    const r = await llevar(run, fuentesInventadas(), suyo, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true, JSON.stringify(r.parado));
    const tabla = leerJson(join(run, "tabla-1.json")) as Tabla;
    const delCruce = JSON.parse(readFileSync(enIn(run, "cruce-1-v1", "budget.json"), "utf8"));
    assert.deepEqual(
      delCruce.rows.map((x: { row: string }) => x.row),
      tabla.rows.filter((x) => x.discarded === "").map((x) => x.id),
    );
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
});

test("trampa: sin el presupuesto delante, el que cruza no dice ninguna cifra del presupuesto entero", async () => {
  const run = runNuevo();
  try {
    darElAdelante(run, null);
    const l = conCapasLentas((cuenta) => {
      assert.equal(cuenta, null, "las capas aún trabajan: no hay cuenta que darle");
      return "The whole trip comes to 512 EUR with what is known.";
    });
    const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, false);
    assert.equal(r.parado?.en, "cross");
    assert.ok(r.parado?.rojos.some((x) => /presupuesto entero y dice 512, y el presupuesto no es suyo/.test(x.que)));
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
});

test("la puerta 6, sin cuenta, da rojo a una frase del presupuesto entero aunque su cifra sea de la tabla", () => {
  const tabla = { rows: [], levers: [], minimum_score: 0 } as unknown as Tabla;
  const v = puertaCruce({ unknowns: ["The whole trip comes to 300 EUR."] }, { tabla, viaje: ENTENDIDO });
  assert.ok(v.rojos.some((x) => /presupuesto entero y dice 300, y el presupuesto no es suyo/.test(x.que)));
});
