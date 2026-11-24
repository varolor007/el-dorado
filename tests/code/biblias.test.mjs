// Las dos biblias: la hoja y el plan salen de sus datos, y nada de la hoja se queda sin su punto del plan.

import assert from "node:assert/strict";
import { test } from "node:test";
import { hoja } from "../../docs/paginas/hoja.datos.mjs";
import { atrasados, cajasConSuPunto } from "../../docs/paginas/pinta.mjs";
import { plan } from "../../docs/paginas/plan.datos.mjs";

const PUNTOS = new Set(plan.bloques.flatMap((b) => b.puntos.map((p) => p.n)));

test("las páginas y los textos de la hoja y del plan están al día con sus datos", () => {
  assert.deepEqual(atrasados(), [], "hay que volver a pintar: node docs/paginas/pinta.mjs");
});

test("cada caja del flujo de la hoja tiene su punto en el plan, y cada punto existe", () => {
  const sinPunto = [];
  const puntosQueNoExisten = [];
  for (const [momento, caja, puntos] of cajasConSuPunto()) {
    if (puntos.length === 0) sinPunto.push(`${momento}: ${caja}`);
    for (const p of puntos) if (!PUNTOS.has(p)) puntosQueNoExisten.push(`${momento}: ${caja} -> ${p}`);
  }
  assert.deepEqual(sinPunto, []);
  assert.deepEqual(puntosQueNoExisten, []);
});

test("el plan no nombra cajas que la hoja no tiene", () => {
  const sobran = [];
  plan.cajas.forEach((delMomento, i) => {
    const enLaHoja = new Set(hoja.momentos.flujo[i].filter((c) => !c.grupo).map((c) => c.k));
    for (const caja of Object.keys(delMomento)) if (!enLaHoja.has(caja)) sobran.push(`${i}: ${caja}`);
  });
  assert.deepEqual(sobran, []);
});

test("la hoja tiene las mismas columnas en todas sus filas y en su flujo", () => {
  const n = hoja.momentos.columnas.length;
  assert.equal(hoja.momentos.flujo.length, n);
  for (const fila of hoja.momentos.filas) assert.equal(fila.celdas.length, n, fila.nombre);
  assert.equal(plan.cajas.length, n);
});

test("cada punto del plan tiene su número de bloque y un estado conocido, sin repetirse", () => {
  const estados = new Set(["hecho", "parte", "siguiente", "pendiente", "decidir"]);
  const vistos = new Set();
  for (const b of plan.bloques) {
    assert.ok(estados.has(b.estado), `bloque ${b.n}`);
    for (const p of b.puntos) {
      assert.ok(p.n.startsWith(`${b.n}.`), p.n);
      assert.ok(estados.has(p.estado), p.n);
      assert.ok(!vistos.has(p.n), `repetido: ${p.n}`);
      vistos.add(p.n);
    }
  }
});

test("el estado de un bloque del plan sale de los de sus puntos, y no se queda atrás", () => {
  const atras = [];
  for (const b of plan.bloques) {
    const estados = b.puntos.map((p) => p.estado);
    const sinEmpezar = estados.every((e) => e === "pendiente" || e === "decidir");
    const debe = estados.every((e) => e === "hecho") ? "hecho" : sinEmpezar ? "pendiente" : "parte";
    if (b.estado !== debe) atras.push(`el bloque ${b.n} dice «${b.estado}» y por sus puntos es «${debe}»`);
  }
  assert.deepEqual(atras, []);
});
