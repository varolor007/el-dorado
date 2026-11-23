// Las pruebas de la forma del viaje para la web: un viaje bien hecho pasa, y cada fallo puesto a propósito se caza.

import assert from "node:assert/strict";
import { test } from "node:test";
import { comprobarSucesos, comprobarViaje, type Suceso, type Viaje } from "../../agent/output/viaje.ts";
import { SUCESOS_INVENTADOS, viajeInventado } from "../cases/inventado/viaje.ts";

function pegasDe(estropea: (v: Viaje) => void): string[] {
  const v = viajeInventado();
  estropea(v);
  return comprobarViaje(v).map((p) => `${p.donde}: ${p.que}`);
}

test("el viaje inventado tiene la forma que espera la web", () => {
  assert.deepEqual(
    pegasDe(() => {}),
    [],
  );
  assert.deepEqual(comprobarSucesos(SUCESOS_INVENTADOS), []);
});

test("trampa: las fechas del revés, o un día que no es del viaje", () => {
  assert.ok(pegasDe((v) => (v.salida = "2027-02-10")).includes("fechas: la salida no es después de la entrada"));
  assert.deepEqual(
    pegasDe((v) => (v.dias[1].fecha = "2027-02-20")),
    ["dias[1]: el día no es de este viaje"],
  );
  assert.deepEqual(
    pegasDe((v) => (v.dias[1].fecha = "2027-02-12")),
    ["dias[1]: los días no van en orden"],
  );
});

test("trampa: una parada en dos días, una que no existe o una que se pierde", () => {
  assert.deepEqual(
    pegasDe((v) => v.dias[1].paradas.push("p1")),
    ["dias[1]: no dice lo que se anda entre sus paradas", "dias: la parada p1 está en dos días"],
  );
  assert.deepEqual(
    pegasDe((v) => (v.dias[1].paradas = ["p9"])),
    ["dias[1]: lleva la parada p9, que no existe", "paradas.p3: ni está en un día ni está fuera"],
  );
  assert.deepEqual(
    pegasDe((v) => v.fuera.push("p1")),
    ["fuera: la parada p1 está fuera y en un día a la vez", "fuera: la parada p1 está fuera y no dice por qué"],
  );
});

test("trampa: una foto sin su autor o su licencia", () => {
  assert.deepEqual(
    pegasDe((v) => (v.paradas[0].foto!.licencia = null)),
    ["paradas.p1: su foto no lleva su autor o su licencia"],
  );
});

test("trampa: una parada fuera del mapa, sin su porqué o sin lo que lleva", () => {
  assert.deepEqual(
    pegasDe((v) => {
      v.paradas[1].punto = { lat: 120, lon: 20 };
      v.paradas[1].porQue = " ";
      v.paradas[1].minutos = 0;
    }),
    [
      "paradas.p2: la parada no está en el mapa",
      "paradas.p2: no dice lo que lleva verla",
      "paradas.p2: no dice por qué ir",
    ],
  );
});

test("trampa: un precio sin fecha, y una manera con piezas que no existen", () => {
  assert.deepEqual(
    pegasDe((v) => (v.alojamientos[0].precio.visto = "ayer")),
    ["alojamientos.a1: el precio no dice cuándo se vio"],
  );
  assert.deepEqual(
    pegasDe((v) => {
      v.maneras[0].alojamiento = "a9";
      v.maneras[1].moneda = "USD";
    }),
    ["maneras.cheapest: su alojamiento no existe", "maneras: mezclan monedas"],
  );
  assert.deepEqual(
    pegasDe((v) => (v.palancas[0].ahorra = 0)),
    ["palancas.l1: una palanca que no ahorra no se cuenta"],
  );
});

test("trampa: un precio con un enlace que no es https, o con claves dentro, no llega a la web", () => {
  const pega = "el enlace del precio no es una dirección https sin claves";
  assert.deepEqual(
    pegasDe((v) => (v.alojamientos[0].otrasOfertas[0].enlace = "javascript:alert(document.domain)")),
    [`alojamientos.a1.otrasOfertas[0]: ${pega}`],
  );
  assert.deepEqual(
    pegasDe((v) => (v.alojamientos[0].precio.enlace = "http://reservas.invalid/1")),
    [`alojamientos.a1: ${pega}`],
  );
  assert.deepEqual(
    pegasDe((v) => (v.transportes[0].precio.enlace = "https://usuario:clave@reservas.invalid/1")),
    [`transportes.${viajeInventado().transportes[0].id}: ${pega}`],
  );
  assert.deepEqual(
    pegasDe((v) => (v.alojamientos[0].precio.enlace = "reservas.invalid/1")),
    [`alojamientos.a1: ${pega}`],
  );
  // Sin enlace, o con uno https, el precio pasa.
  assert.deepEqual(
    pegasDe((v) => (v.alojamientos[0].otrasOfertas[0].enlace = "https://reservas.invalid/1?a=1")),
    [],
  );
});

test("trampa: los sucesos desordenados, de una clase que no existe o sin final", () => {
  const pegas = (s: Suceso[]): string[] => comprobarSucesos(s).map((p) => `${p.donde}: ${p.que}`);
  assert.deepEqual(pegas([SUCESOS_INVENTADOS[1], SUCESOS_INVENTADOS[0], SUCESOS_INVENTADOS[5]]), [
    "sucesos[1]: no va en su orden",
  ]);
  assert.deepEqual(pegas(SUCESOS_INVENTADOS.slice(0, 3)), ["sucesos: la investigación no acaba"]);
  assert.deepEqual(
    pegas([
      { t: 0, clase: "magic" as Suceso["clase"] },
      { t: 1, clase: "done" },
    ]),
    ["sucesos[0]: no se sabe qué es magic"],
  );
});
