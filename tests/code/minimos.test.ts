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
  assert.equal(fuera[2].motivo, "3 estrellas, menos de 4");
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], nota: null }, MINIMOS), "sin nota");
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], opiniones: null }, MINIMOS), "sin número de opiniones");
});

test("el que está justo en el mínimo pasa", () => {
  assert.equal(motivoDeDescarte({ ...ALOJAMIENTOS[0], nota: 8.5, opiniones: 200, estrellas: 4 }, MINIMOS), null);
});

test("las estrellas se le piden a quien las lleva: lo que no las lleva se juzga por su nota y sus opiniones", () => {
  // Una casa de 9,2 con 600 opiniones y sin estrellas pasa los mínimos de partida, que piden cuatro.
  const casa = { ...ALOJAMIENTOS[0], nota: 9.2, opiniones: 600, estrellas: null };
  assert.equal(motivoDeDescarte(casa, MINIMOS), null);
  assert.equal(motivoDeDescarte(casa, { nota: 7, opiniones: 10, estrellas: 0 }), null);
  // Pero no por no llevarlas se le perdona la nota o las opiniones.
  assert.match(motivoDeDescarte({ ...casa, nota: 8.4 }, MINIMOS) ?? "", /nota 8\.4/);
  assert.match(motivoDeDescarte({ ...casa, opiniones: 40 }, MINIMOS) ?? "", /40 opiniones/);
  // Y a quien las lleva se le siguen pidiendo.
  assert.equal(motivoDeDescarte({ ...casa, estrellas: 3 }, MINIMOS), "3 estrellas, menos de 4");
});
