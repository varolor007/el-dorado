// Las pruebas del asiento que cruza: su contrato y el código dicen lo mismo, y la puerta 6 caza cada trampa.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { PALANCAS, PALANCAS_DE_UNA_MANERA, SE_PUEDE_PEDIR } from "../../agent/data/palancas.ts";
import { numerosEn, puertaCruce, type MaterialDeCruce } from "../../agent/gates/puerta_cruce.ts";
import { ESTADOS_EN_EL_CRUCE } from "../../agent/scripts/formas.ts";
import { ENTENDIDO, entregaDeCruce, tablaInventada } from "../cases/inventado/investigacion.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "trip-crosser");
const leer = (nombre: string): string => readFileSync(join(CONTRATO, nombre), "utf8");

const TABLA = await tablaInventada();
const MATERIAL: MaterialDeCruce = { tabla: TABLA, viaje: ENTENDIDO };

type Entrega = Record<string, any>;
function rojosDe(cambia: (e: Entrega) => void, material: MaterialDeCruce = MATERIAL): string[] {
  const entrega = structuredClone(entregaDeCruce(material.tabla)) as Entrega;
  cambia(entrega);
  return puertaCruce(entrega, material).rojos.map((r) => `${r.donde}: ${r.que}`);
}

test("el contrato nombra los estados, las palancas de una manera y lo que se puede pedir", () => {
  const entrega = leer("DELIVERY.md");
  for (const estado of ESTADOS_EN_EL_CRUCE) assert.ok(entrega.includes("`" + estado + "`"), estado);
  for (const palanca of PALANCAS_DE_UNA_MANERA) assert.ok(entrega.includes("`" + palanca + "`"), palanca);
  for (const dias of SE_PUEDE_PEDIR.shift_dates) assert.ok(entrega.includes("`" + dias + "`"), String(dias));
  for (const marca of ["cheapest", "best_value", "different"]) assert.ok(entrega.includes("`" + marca + "`"));
});

test("las normas del que cruza van de la CR1 a la CR7, y el contrato dice que no hace cuentas", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(CR\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(codigos, ["CR1", "CR2", "CR3", "CR4", "CR5", "CR6", "CR7"]);
  assert.match(leer("README.md"), /You do not calculate/);
  assert.match(leer("README.md"), /You do not use the internet/);
});

test("los números de la tabla se recogen todos, también los que van dentro de un texto", () => {
  const numeros = numerosEn({ a: 12.5, b: [-3, "2027-03-04"], c: { d: "r7" } });
  assert.deepEqual(
    [...numeros].sort((x, y) => x - y),
    [-3, 3, 4, 12.5, 2027],
  );
});

test("lo que entrega un asiento aplicado pasa la puerta", () => {
  assert.deepEqual(
    rojosDe(() => {}),
    [],
  );
});

test("trampa: un total que no es el de la tabla", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways.cheapest.total = 370)),
    ["ways.cheapest: su total es 370 y el de la tabla es 376"],
  );
});

test("trampa: la más barata no es la que marcó el código, o es una fila descartada", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways.cheapest = { row: "r1", total: 346 })),
    [
      "ways.cheapest: la fila r1 está descartada: missing something the traveller marked as a must: gym (token)",
      "ways.cheapest: es la fila r1 y el código marcó la r2",
    ],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways.best_value = { row: "r5", total: 416 })),
    ["ways.best_value: es la fila r5 y el código marcó la r2"],
  );
});

test("trampa: la distinta es la misma fila que otra, o no lleva su palanca, o dice otra zona y es la misma", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways.different = { row: "r2", total: 376, lever: "other_lodging", why: "the same one again" })),
    ["ways.different: es la misma fila que otra manera: no es distinta"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways.different.lever = "shift_dates")),
    ["ways.different: no lleva una palanca que cambie una fila por otra"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways.different = { row: "r3", total: 486, lever: "other_zone", why: "another place to sleep" })),
    ["ways.different: dice que es otra zona y está en la misma que la de partida"],
  );
});

test("sin manera distinta hay que decir por qué", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways.different = "none")),
    ["unknowns: no hay manera distinta y no dice por qué"],
  );
  assert.deepEqual(
    rojosDe((e) => {
      e.ways.different = "none";
      e.unknowns = ["No other row is a real alternative for this traveller."];
    }),
    [],
  );
});

test("trampa: falta una palanca de la lista fija, o sale dos veces, o no es de la lista", () => {
  assert.deepEqual(
    rojosDe((e) => e.levers.pop()),
    ["levers: falta la palanca train_for_flight: la lista es fija"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[7].lever = "open_jaw")),
    ["levers[7]: la palanca open_jaw sale dos veces", "levers: falta la palanca train_for_flight: la lista es fija"],
  );
  assert.deepEqual(
    rojosDe((e) => e.levers.push({ lever: "teleport", status: "discarded", rows: [], reason: "it does not exist" })),
    ["levers[8]: teleport no es una palanca de la lista"],
  );
});

test("trampa: dice que probó una palanca sin filas, o con filas de otra, o que no se puede y la tabla la trae", () => {
  assert.deepEqual(
    rojosDe((e) => (e.levers[0].rows = [])),
    ["levers[0]: dice que la probó y no nombra ninguna fila de la tabla"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[0].rows = ["l1"])),
    ["levers[0]: la fila l1 es de otra palanca: other_lodging"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[0] = { lever: "shift_dates", status: "not_available", rows: [], reason: "no data" })),
    ["levers[0]: dice que no se puede probar y la tabla la trae probada"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[4] = { lever: "other_airport", status: "tested", rows: ["l1"], reason: "tested" })),
    ["levers[4]: la fila l1 es de otra palanca: other_lodging", "levers[4]: dice que la probó y la tabla no la trae"],
  );
});

test("trampa: un número suyo en un motivo", () => {
  assert.deepEqual(
    rojosDe((e) => (e.levers[1].reason = "one night less saves about 75 euros")),
    ["levers[1]: dice 75, que no está en la tabla"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[1].reason = "one night less saves 70")),
    [],
  );
});

test("trampa: cuenta una palanca que no ahorra, o con otro ahorro, o que no tiene precio, o dos veces", () => {
  assert.deepEqual(
    rojosDe((e) => (e.tell = [{ lever_row: "l1", saves: -110, why: "a nicer place" }])),
    ["tell[0]: cuenta una palanca que no ahorra"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.tell[0].saves = 80)),
    ["tell[0]: dice que ahorra 80 y la tabla dice 81"],
  );
  assert.deepEqual(
    rojosDe((e) => e.tell.push({ ...e.tell[0] })),
    ["tell[2]: cuenta dos veces la palanca l6"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.tell = [{ lever_row: "l99", saves: 10, why: "x" }])),
    ["tell[0]: la palanca l99 no está en la tabla"],
  );
});

test("trampa: pide más en la segunda ronda, o algo que el código no sabe pedir", () => {
  const segunda: MaterialDeCruce = { ...MATERIAL, tabla: { ...TABLA, round: 2 } };
  assert.deepEqual(
    rojosDe((e) => (e.requests = [{ lever: "shift_dates", row: "r2", days: -3 }]), segunda),
    ["requests: pide más en la ronda 2: son 2 como mucho"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.requests = [{ lever: "shift_dates", row: "r2", days: -3 }])),
    [],
  );
  assert.deepEqual(
    rojosDe((e) => (e.requests = [{ lever: "other_airport", row: "r2" }])),
    ["requests[0]: other_airport no es algo que el código sepa pedir"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.requests = [{ lever: "shift_dates", row: "r1", days: 7 }])),
    ["requests[0]: pide un precio para una fila descartada", "requests[0]: los días que mueve no son de su lista"],
  );
});

test("trampa: una mirada que cita una fila que no existe, o sin estado", () => {
  assert.deepEqual(
    rojosDe((e) => (e.checks = [{ what: "the cheapest cannot be cancelled", status: "problem", refs: ["r9"] }])),
    ["checks[0]: cita r9, que no está en la tabla"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.checks[0].status = "fine")),
    ["checks[0]: su estado no es de su lista"],
  );
});

test("trampa: una fila que no es de las fechas del viaje", () => {
  const otrasFechas = structuredClone(MATERIAL);
  otrasFechas.viaje.dates.check_in = "2027-03-04";
  const rojos = rojosDe(() => {}, otrasFechas);
  assert.ok(rojos.includes("ways.cheapest: la fila no es de las fechas del viaje"));
});

test("las palancas de la lista dicen cómo se leen, para el asiento", () => {
  for (const p of PALANCAS) assert.ok(p.what.length > 10, p.id);
});
