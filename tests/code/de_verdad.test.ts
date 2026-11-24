// La orden de las pruebas de verdad, probada sin gastar: la investigación inventada, de una vez, con una IA de
// mentira en el sitio de Claude. Lo que se mira es lo que hace la orden: da el adelante con su techo, lleva el run,
// cuenta lo que pasa y dice al final cómo acabó, lo que tardó y lo que gastó.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { adelanteDe } from "../../agent/launcher/casa.ts";
import { investigarDeVerdad, resumenDe } from "../../agent/launcher/de_verdad.ts";
import { lanzadorDirecto } from "../../agent/launcher/ia.ts";
import type { Suceso } from "../../agent/output/viaje.ts";
import { fuentesInventadas, pensarDeMentira, runNuevo } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const PRECIO = { entrada: 4, salida: 20 };
const HOY = (): Date => new Date("2027-01-01T00:00:00Z");

test("lleva la investigación entera con su adelante, cuenta lo que pasa y dice cómo acabó y lo que gastó", async () => {
  const run = runNuevo();
  try {
    const contado: Suceso[] = [];
    const pensar = pensarDeMentira();
    const hecho = await investigarDeVerdad({
      run,
      techo: 5,
      fuentes: fuentesInventadas(),
      lanzador: lanzadorDirecto(pensar, PRECIO),
      alContar: (s) => contado.push(s),
      cadaMs: 5,
    });
    assert.equal(hecho.llevado.hecho, true);
    assert.deepEqual(adelanteDe(run)?.techo, 5);
    // Lo contado llega entero y en su orden, hasta el final.
    assert.equal(contado.at(-1)?.clase, "done");
    assert.ok(contado.every((s, i) => i === 0 || s.t >= contado[i - 1].t));
    const resumen = resumenDe(hecho);
    assert.match(resumen[0], /^Hecho\. El viaje, en .*viaje\.json$/);
    // Nueve llamadas, a 12.000 de entrada y 3.000 de salida cada una, con el precio que se le dio.
    const gasto = (9 * (12_000 * PRECIO.entrada + 3_000 * PRECIO.salida)) / 1_000_000;
    assert.ok(
      resumen.some((l) => l.includes(`Gastó ${gasto.toFixed(2)} USD, en 9 llamadas`)),
      resumen.join("\n"),
    );
    assert.equal(resumen.filter((l) => /^ {2}\S+ \([a-z-]+\): done, \d+ s, \d+\.\d\d USD$/.test(l)).length, 9);
    assert.equal(resumen.at(-1), `El run, en ${run}`);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("con un techo que no llega, para, no sigue gastando y lo dice", async () => {
  const run = runNuevo();
  try {
    const pensar = pensarDeMentira();
    const hecho = await investigarDeVerdad({
      run,
      techo: 0.01,
      fuentes: fuentesInventadas(),
      lanzador: lanzadorDirecto(pensar, PRECIO),
      cadaMs: 5,
    });
    assert.equal(hecho.llevado.hecho, false);
    assert.notEqual(hecho.llevado.parado, null);
    assert.ok(pensar.llamadas.length < 9);
    assert.match(resumenDe(hecho)[0], /^Parado en /);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("con lo entendido en un archivo, abre el viaje en la mesa y lo lleva; sin nada que llevar, no", async () => {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const antes = process.env.ELDORADO_MESA;
  process.env.ELDORADO_MESA = mesa;
  try {
    const entendido = join(mesa, "entendido-de-prueba.json");
    writeFileSync(entendido, JSON.stringify(ENTENDIDO));
    const comun = { techo: 5, fuentes: fuentesInventadas(), lanzador: lanzadorDirecto(pensarDeMentira(), PRECIO) };
    const hecho = await investigarDeVerdad({ ...comun, entendido, ahora: HOY, cadaMs: 5 });
    assert.equal(hecho.llevado.hecho, true);
    assert.ok(hecho.run.startsWith(join(mesa, "viajes")));
    await assert.rejects(investigarDeVerdad(comun), /falta lo entendido o la carpeta del run/);
  } finally {
    if (antes === undefined) delete process.env.ELDORADO_MESA;
    else process.env.ELDORADO_MESA = antes;
    rmSync(mesa, { recursive: true, force: true });
  }
});
