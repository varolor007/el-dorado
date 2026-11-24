// La orden de las pruebas de verdad, probada sin gastar: la investigación inventada, de una vez, con una IA de
// mentira en el sitio de Claude. Lo que se mira es lo que hace la orden: da el adelante con su techo, lleva el run,
// cuenta lo que pasa y dice al final cómo acabó, lo que tardó y lo que gastó.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { adelanteDe } from "../../agent/launcher/casa.ts";
import { investigarDeVerdad, quienPiensa, resumenDe } from "../../agent/launcher/de_verdad.ts";
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
    // Diez llamadas, con el calendario, a 12.000 de entrada y 3.000 de salida cada una, con el precio que se le dio.
    const gasto = (10 * (12_000 * PRECIO.entrada + 3_000 * PRECIO.salida)) / 1_000_000;
    assert.ok(
      resumen.some((l) => l.includes(`Gastó ${gasto.toFixed(2)} USD, en 10 llamadas`)),
      resumen.join("\n"),
    );
    assert.equal(resumen.filter((l) => /^ {2}\S+ \([a-z-]+\): done, \d+ s, \d+\.\d\d USD$/.test(l)).length, 10);
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

test("quién piensa lo dice el entorno: la cuenta de la casa si está su token; si no, una clave con su precio", () => {
  const MODELO = { ELDORADO_MODELO: "modelo-inventado" };
  const CLAVE = { ELDORADO_CLAVE_DE_CLAUDE: "clave-de-ia-inventada-0001" };
  const PRECIOS = { ELDORADO_PRECIO_ENTRADA: "4", ELDORADO_PRECIO_SALIDA: "20" };
  // Con el token de la cuenta no hace falta precio: lo que cuesta lo dice Claude Code. Y no hay cómo comprobarlo antes.
  const cuenta = quienPiensa({ ...MODELO, ELDORADO_TOKEN_DE_CLAUDE: "token-inventado" });
  assert.deepEqual([cuenta.con, cuenta.comprueba, typeof cuenta.lanzador], ["cuenta", null, "function"]);
  // Si están las dos cosas, manda la cuenta de la casa.
  assert.equal(
    quienPiensa({ ...MODELO, ...CLAVE, ...PRECIOS, ELDORADO_TOKEN_DE_CLAUDE: "token-inventado" }).con,
    "cuenta",
  );
  const clave = quienPiensa({ ...MODELO, ...CLAVE, ...PRECIOS });
  assert.deepEqual([clave.con, typeof clave.comprueba], ["clave", "function"]);
  assert.throws(() => quienPiensa({ ...MODELO, ...CLAVE }), /falta el precio de la IA/);
  assert.throws(() => quienPiensa({ ...MODELO }), /falta con qué pensar/);
  assert.throws(() => quienPiensa({ ...MODELO, ELDORADO_CLAVE_DE_CLAUDE: "corta" }), /falta con qué pensar/);
  assert.throws(() => quienPiensa({ ELDORADO_TOKEN_DE_CLAUDE: "token-inventado" }), /con qué modelo se piensa/);
});

test("sin techo de gasto, la investigación corre igual y el adelante lo dice", async () => {
  const run = runNuevo();
  try {
    const hecho = await investigarDeVerdad({
      run,
      techo: null,
      fuentes: fuentesInventadas(),
      lanzador: lanzadorDirecto(pensarDeMentira(), PRECIO),
      cadaMs: 5,
    });
    assert.deepEqual([hecho.llevado.hecho, adelanteDe(run)?.techo], [true, null]);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
