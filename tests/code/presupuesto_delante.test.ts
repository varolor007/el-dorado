// El presupuesto entero delante del que cruza y del que explica (14.7): la cuenta está hecha antes de que corran, les
// llega en su material, en inglés, y a sus puertas, que con ella dejan decir sus cifras y ninguna otra. Con el caso
// inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import type { Tabla } from "../../agent/scripts/formas.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import {
  fuentesInventadas,
  GASTO,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
} from "../cases/inventado/asientos.ts";

const leerIn = (run: string, puesto: string, nombre: string): any =>
  JSON.parse(readFileSync(join(run, "puestos", puesto, "in", nombre), "utf8"));

test("el que cruza y el que explica tienen el presupuesto entero delante, y es el que lleva el viaje", async () => {
  const run = runNuevo();
  try {
    darElAdelante(run, null);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true);
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    const tabla = leerJson(join(run, "tabla-1.json")) as Tabla;
    // Al que cruza, una cuenta por cada fila que no está descartada, en inglés.
    const delCruce = leerIn(run, "cruce-1-v1", "budget.json");
    assert.deepEqual(
      delCruce.rows.map((x: { row: string }) => x.row),
      tabla.rows.filter((x) => x.discarded === "").map((x) => x.id),
    );
    for (const fila of delCruce.rows) {
      assert.ok(fila.parts.some((p: { part: string }) => p.part === "tickets"));
      assert.equal(typeof fila.total, "number");
    }
    // Al que explica, la de las maneras: la misma que lleva el viaje.
    const delQueExplica = leerIn(run, "explica-v1", "budget.json");
    assert.deepEqual(
      delQueExplica.ways.map((x: { way: string; total: number }) => [x.way, x.total]),
      v.presupuesto!.maneras.map((m) => [m.manera, m.total]),
    );
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
});

/** Un lanzador de mentira cuyo que explica dice una cifra del presupuesto entero: la de su cuenta, o otra. */
function queDiceElPresupuesto(deMas: number): Lanzador {
  return async (_orden, puesto) => {
    trabaja(resolve(puesto.carpeta, "..", ".."), puesto.id, (asiento, e) => {
      if (asiento !== "trip-explainer") return;
      const cuenta = JSON.parse(readFileSync(join(puesto.carpeta, "in", "budget.json"), "utf8"));
      const manera = cuenta.ways[0];
      const ways = e.ways as { why: string }[];
      ways[0].why = `The whole trip comes to ${manera.total + deMas} ${manera.currency} with what is known.`;
    });
    return GASTO;
  };
}

test("la puerta del que explica mira las cifras del presupuesto entero con su cuenta: la suya pasa", async () => {
  for (const [deMas, pasa] of [
    [0, true],
    [7, false],
  ] as const) {
    const run = runNuevo();
    try {
      darElAdelante(run, null);
      const r = await llevar(run, fuentesInventadas(), queDiceElPresupuesto(deMas), { conductor: false });
      await esperarLoDeDetras(run);
      assert.equal(r.hecho, pasa, JSON.stringify(r.parado));
      if (!pasa) {
        assert.equal(r.parado?.en, "explain");
        assert.ok(r.parado?.rojos.some((x) => /presupuesto entero/.test(x.que)));
      }
    } finally {
      await esperarLoDeDetras(run);
      rmSync(run, { recursive: true, force: true });
    }
  }
});
