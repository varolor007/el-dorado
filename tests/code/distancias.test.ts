import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
