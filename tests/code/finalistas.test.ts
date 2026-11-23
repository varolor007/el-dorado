import assert from "node:assert/strict";
import { test } from "node:test";
import { completo, elegir, mediana, type ConPrecio } from "../../agent/scripts/finalistas.ts";
import { ALOJAMIENTOS, PRECIOS } from "../cases/inventado/inventado.ts";

const CANDIDATOS: ConPrecio[] = PRECIOS.map((precio) => ({
  precio,
  alojamiento: ALOJAMIENTOS.find((a) => a.id === precio.id)!,
}));

test("el precio completo es el total más lo que se paga aparte", () => {
  assert.equal(completo(PRECIOS[0]), 186);
  assert.equal(completo({ ...PRECIOS[0], total: 100.105, tasasAparte: 0.2 }), 100.31);
});

test("la mediana, con pares y con impares, y sin nada", () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
  assert.equal(mediana([]), null);
});

test("elige por regla: dos baratos, dos de mejor nota por lo que cuestan y el de mejor nota bajo la mediana", () => {
  const elegidos = elegir(CANDIDATOS, 5, 8);
  assert.deepEqual(
    elegidos.map((f) => f.alojamiento.id),
    ["a1", "a2", "a5", "a4", "a6"],
  );
  assert.deepEqual(
    elegidos.map((f) => f.motivo),
    [
      "de los más baratos",
      "de los más baratos",
      "mejor nota por lo que cuesta",
      "mejor nota por lo que cuesta",
      "mejor nota sin pasar de la mediana",
    ],
  );
});

test("nadie sale dos veces, y sale lo mismo con los candidatos en otro orden", () => {
  const uno = elegir(CANDIDATOS, 5, 8).map((f) => f.alojamiento.id);
  const otro = elegir([...CANDIDATOS].reverse(), 5, 8).map((f) => f.alojamiento.id);
  assert.equal(new Set(uno).size, uno.length);
  assert.deepEqual(uno, otro);
});

test("con menos candidatos que sitios, salen los que hay; y un precio que no es un importe no entra", () => {
  assert.equal(elegir(CANDIDATOS.slice(0, 2), 5, 8).length, 2);
  const roto = { ...CANDIDATOS[0], precio: { ...CANDIDATOS[0].precio, total: 0, tasasAparte: 0 } };
  assert.equal(elegir([roto], 5, 8).length, 0);
});
