import assert from "node:assert/strict";
import { test } from "node:test";
import { motivoDeDescarte, separar } from "../../agent/scripts/minimos.ts";
import { ALOJAMIENTOS, MINIMOS } from "../cases/inventado/inventado.ts";

test("los mínimos dejan dentro a los siete que cumplen y fuera a los tres que no", () => {
  const { dentro, fuera } = separar(ALOJAMIENTOS, MINIMOS);
  assert.deepEqual(
    dentro.map((a) => a.id),
    ["a1", "a2", "a3", "a4", "a5", "a6", "a7"],
  );
  assert.deepEqual(
    fuera.map((d) => d.id),
    ["b1", "b2", "b3"],
  );
});

test("cada descarte dice su motivo, y un dato que falta no se da por bueno", () => {
  const { fuera } = separar(ALOJAMIENTOS, MINIMOS);
  assert.match(fuera[0].motivo, /nota 7\.9/);
  assert.match(fuera[1].motivo, /12 opiniones/);
  assert.equal(fuera[2].motivo, "sin estrellas");
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], nota: null }, MINIMOS), "sin nota");
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], opiniones: null }, MINIMOS), "sin número de opiniones");
});

test("el que está justo en el mínimo pasa", () => {
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], nota: 8.5, opiniones: 200, estrellas: 4 }, MINIMOS), null);
});
