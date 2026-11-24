import assert from "node:assert/strict";
import { test } from "node:test";
import {
  trayecto,
  minutosPor,
  manerasDeIr,
  andando,
  centroDe,
  enLineaRecta,
  mediaAndando,
  medianaAndando,
  minutosAndando,
  minutosEntre,
  PASO,
  RODEO,
} from "../../agent/tools/distancias.ts";
import { SALTO_MAXIMO } from "../../agent/data/dias.ts";
import { MANERAS_DE_IR, TRAYECTO_DE_UN_DIA } from "../../agent/data/moverse.ts";

const A = { lat: 10, lon: 20 };
const UN_KM_AL_NORTE = { lat: 10 + 1000 / 111_195, lon: 20 };

test("la línea recta mide lo que hay, y de un sitio a sí mismo no hay nada", () => {
  assert.ok(Math.abs(enLineaRecta(A, UN_KM_AL_NORTE) - 1000) < 1);
  assert.equal(enLineaRecta(A, A), 0);
  assert.ok(Math.abs(enLineaRecta(A, UN_KM_AL_NORTE) - enLineaRecta(UN_KM_AL_NORTE, A)) < 0.001);
});

test("andando se anda más que en línea recta, con su margen, y sale redondeado a la decena", () => {
  assert.equal(andando(A, UN_KM_AL_NORTE), Math.round((1000 * RODEO) / 10) * 10);
  assert.equal(andando(A, UN_KM_AL_NORTE) % 10, 0);
  assert.equal(andando(A, A), 0);
});

test("los minutos salen del paso de ciudad, y nunca son menos de uno", () => {
  assert.equal(minutosAndando(PASO * 12), 12);
  assert.equal(minutosAndando(0), 1);
  assert.equal(minutosEntre(A, UN_KM_AL_NORTE), Math.round(andando(A, UN_KM_AL_NORTE) / PASO));
});

test("la media de lo que se anda hasta varios sitios; sin sitios, no hay media", () => {
  const lejos = { lat: 10 + 3000 / 111_195, lon: 20 };
  const media = mediaAndando(A, [UN_KM_AL_NORTE, lejos]);
  assert.equal(media, Math.round((minutosEntre(A, UN_KM_AL_NORTE) + minutosEntre(A, lejos)) / 2));
  assert.equal(mediaAndando(A, []), null);
});

test("el centro de unos puntos es su punto medio, y sin puntos no hay centro", () => {
  assert.deepEqual(centroDe([A, { lat: 12, lon: 22 }]), { lat: 11, lon: 21 });
  assert.throws(() => centroDe([]), /no hay puntos/);
});

test("la mediana de lo que se anda no la hunde lo que está lejos para todos", () => {
  const cerca = [1, 2, 3].map((n) => ({ lat: 10 + (n * 300) / 111_195, lon: 20 }));
  const excursion = { lat: 10.1, lon: 20 };
  const mediana = medianaAndando(A, [...cerca, excursion]);
  const media = mediaAndando(A, [...cerca, excursion]);
  assert.equal(mediana, Math.round((minutosEntre(A, cerca[1]) + minutosEntre(A, cerca[2])) / 2));
  assert.ok(mediana! < media!);
  assert.equal(medianaAndando(A, [cerca[0], cerca[1], cerca[2]]), minutosEntre(A, cerca[1]));
  assert.equal(medianaAndando(A, []), null);
});

test("de cada trayecto, las maneras que tienen sentido: ni coche para cruzar la calle, ni andar diez km", () => {
  assert.deepEqual(manerasDeIr(300), ["walk"]);
  assert.deepEqual(manerasDeIr(2000), ["walk", "transit", "car"]);
  assert.deepEqual(manerasDeIr(SALTO_MAXIMO), ["walk", "transit", "car"]);
  assert.deepEqual(manerasDeIr(SALTO_MAXIMO + 10), ["transit", "car"]);
  assert.deepEqual(manerasDeIr(90_000), ["car"]);
  // El tope de andar es el mismo en las dos listas.
  assert.equal(MANERAS_DE_IR.find((m) => m.id === "walk")!.hasta, SALTO_MAXIMO);
});

test("un trayecto se cuenta andando si se anda; si no, con lo más rápido que tenga sentido", () => {
  const cerca = trayecto(1500);
  assert.deepEqual([cerca.aPie, cerca.minutos], [true, minutosAndando(1500)]);
  const lejos = trayecto(8000);
  assert.equal(lejos.aPie, false);
  assert.equal(lejos.minutos, Math.min(minutosPor("transit", 8000), minutosPor("car", 8000)));
  // Ningún trayecto que no se anda sale más corto por estar más lejos.
  let antes = 0;
  for (let m = SALTO_MAXIMO + 10; m < 120_000; m += 990) {
    const ahora = trayecto(m).minutos;
    assert.ok(ahora >= antes, `${m} m`);
    antes = ahora;
  }
  // Y lo que cabe en un día tiene un límite: a doscientos kilómetros no se va y se vuelve en el día.
  assert.ok(trayecto(200_000).minutos > TRAYECTO_DE_UN_DIA);
  assert.ok(trayecto(30_000).minutos <= TRAYECTO_DE_UN_DIA);
});
