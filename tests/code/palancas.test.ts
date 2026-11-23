// Las pruebas de las palancas con precio: lo que el código pide otra vez a las fuentes para saber qué ahorra un cambio
// de fechas. Con la fuente inventada y sin internet.

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Vuelo } from "../../agent/tools/fuentes/tipos.ts";
import { cambiosDePartida, mover, pedirPalancas } from "../../agent/tools/palancas.ts";
import { ESTANCIA, fuenteInventada, VISTO } from "../cases/inventado/inventado.ts";

/** Un vuelo inventado, a cien, para las fechas que se le pidan. */
function vueloInventado(ida: string, vuelta: string): Vuelo {
  return {
    fuente: "inventada",
    visto: VISTO,
    origen: "OOO",
    destino: "VVV",
    sale: `${ida}T08:00:00Z`,
    vuelve: `${vuelta}T19:00:00Z`,
    aerolinea: null,
    numero: null,
    precio: 100,
    moneda: "EUR",
    escalasIda: 0,
    escalasVuelta: 0,
    minutos: 80,
    guardado: true,
    enlace: null,
  };
}

test("una fecha se mueve por días, también de un mes a otro", () => {
  assert.equal(mover("2027-03-05", -1), "2027-03-04");
  assert.equal(mover("2027-02-28", 2), "2027-03-02");
  assert.throws(() => mover("ayer", 1), /no es una fecha/);
});

test("los cambios de partida: las mismas noches movidas, y una noche más o menos al final", () => {
  assert.deepEqual(cambiosDePartida([-1, 0, 1], [-1]), [
    { palanca: "shift_dates", entrada: -1, salida: -1 },
    { palanca: "shift_dates", entrada: 1, salida: 1 },
    { palanca: "nights", entrada: 0, salida: -1 },
  ]);
});

test("las palancas se piden enteras, para sus fechas: el alojamiento y, si lo hay, el transporte", async () => {
  const cambios = cambiosDePartida([-1], [-1]);
  const vuelos = async (ida: string, vuelta: string) => [vueloInventado(ida, vuelta)];
  const movidos = await pedirPalancas(fuenteInventada(), ESTANCIA, ["a1", "a2"], cambios, { vuelos });
  assert.equal(movidos.length, 4);
  const [a1] = movidos;
  assert.deepEqual(
    { ...a1, nota: undefined },
    {
      palanca: "shift_dates",
      alojamiento: "a1",
      entrada: "2027-03-04",
      salida: "2027-03-07",
      dias: -1,
      noches: 0,
      total: 168,
      transporte: 100,
      nota: undefined,
    },
  );
  const unaMenos = movidos.find((m) => m.palanca === "nights" && m.alojamiento === "a2");
  assert.equal(unaMenos?.salida, "2027-03-07");
  assert.equal(unaMenos?.noches, -1);
  assert.equal(unaMenos?.total, 146);
});

test("un precio de otras fechas no vale, lo mande quien lo mande", async () => {
  const fuente = fuenteInventada();
  const tramposa = { ...fuente, precios: async () => fuente.precios(["a1"], ESTANCIA) };
  const [m] = await pedirPalancas(tramposa, ESTANCIA, ["a1"], cambiosDePartida([-1], []));
  assert.equal(m.total, null);
  assert.equal(m.nota, "sin precio para esas fechas");
});

test("si la fuente falla, o no hay transporte para esas fechas, queda sin precio y con su motivo", async () => {
  const rota = {
    ...fuenteInventada(),
    precios: async () => {
      throw new Error("no responde");
    },
  };
  const [m] = await pedirPalancas(rota, ESTANCIA, ["a1"], cambiosDePartida([1], []));
  assert.equal(m.total, null);
  assert.match(m.nota, /la fuente no contesta: no responde/);
  const sinVuelos = await pedirPalancas(fuenteInventada(), ESTANCIA, ["a1"], cambiosDePartida([1], []), {
    vuelos: async () => [],
  });
  assert.equal(sinVuelos[0].transporte, null);
  assert.equal(sinVuelos[0].nota, "sin precio de transporte para esas fechas");
});

test("un cambio que no deja ninguna noche, o que cae antes de poder viajar, no se pide", async () => {
  let pedidas = 0;
  const fuente = fuenteInventada();
  const contada = {
    ...fuente,
    precios: async (ids: string[], e: typeof ESTANCIA) => (pedidas++, fuente.precios(ids, e)),
  };
  const sinNoches = await pedirPalancas(contada, ESTANCIA, ["a1"], [{ palanca: "nights", entrada: 0, salida: -3 }]);
  assert.equal(sinNoches[0].nota, "con ese cambio no queda ninguna noche");
  const antes = await pedirPalancas(contada, ESTANCIA, ["a1"], cambiosDePartida([-2], []), { desde: "2027-03-04" });
  assert.equal(antes[0].nota, "cae antes del primer día en que se puede viajar");
  assert.equal(pedidas, 0);
});
