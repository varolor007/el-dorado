// Las pruebas de la tabla del cruce: con el caso inventado y sin internet.

import assert from "node:assert/strict";
import { test } from "node:test";
import { NOTA_MINIMA } from "../../agent/data/cribas.ts";
import { resolverZonas } from "../../agent/scripts/ruta.ts";
import { montarTabla, zonaDe } from "../../agent/scripts/tabla.ts";
import { ESTANCIA } from "../cases/inventado/inventado.ts";
import { entregaDeRuta, LUGARES, piezasDeLaTabla, SITIOS } from "../cases/inventado/investigacion.ts";

const ZONAS = resolverZonas(entregaDeRuta(), LUGARES);

test("un alojamiento cae en la zona que lo tiene dentro; si ninguna, en la más cercana", () => {
  assert.equal(zonaDe(SITIOS[1].punto, ZONAS)?.id, "z1");
  assert.equal(zonaDe(SITIOS[0].punto, ZONAS)?.id, "z2");
  assert.equal(zonaDe({ lat: 10.2, lon: 19.9 }, ZONAS)?.id, "z2");
  assert.equal(zonaDe(SITIOS[0].punto, []), null);
});

const PIEZAS = await piezasDeLaTabla();
const TABLA = montarTabla(PIEZAS);
const fila = (id: string) => TABLA.rows.find((r) => r.lodging === id)!;

test("la tabla: una fila por finalista, con su total, que es el alojamiento completo más el transporte", () => {
  assert.equal(TABLA.rows.length, 5);
  assert.deepEqual(
    TABLA.rows.map((r) => r.id),
    ["r1", "r2", "r3", "r4", "r5"],
  );
  const a2 = fila("a2");
  assert.equal(a2.lodging_total, 216);
  assert.equal(a2.transport_total, 160);
  assert.equal(a2.total, 376);
  assert.equal(a2.check_in, ESTANCIA.entrada);
  assert.equal(a2.currency, "EUR");
  assert.equal(TABLA.minimum_score, NOTA_MINIMA);
});

test("la tabla: lo que descarta una criba sigue en la tabla con su motivo, y no lleva ninguna marca", () => {
  const a1 = fila("a1");
  assert.match(a1.discarded, /imprescindible: gym \(token\)/);
  assert.deepEqual(a1.marks, []);
  // Es la más barata de todas, pero no vale: la más barata que vale es la siguiente.
  assert.ok(a1.total < fila("a2").total);
  assert.deepEqual(fila("a2").marks, ["cheapest", "best_value"]);
});

test("la tabla: cada fila dice su zona, lo que se anda y lo que no se pudo confirmar", () => {
  assert.equal(fila("a2").zone, "z1");
  assert.equal(fila("a6").zone, "z2");
  assert.equal(typeof fila("a2").walk_minutes, "number");
  assert.deepEqual(fila("a2").unconfirmed, ["encaje"]);
});

test("las palancas: otro alojamiento y otra zona, con lo que ahorran o cuestan sobre la fila de partida", () => {
  const partida = fila("a2");
  const otros = TABLA.levers.filter((l) => l.lever === "other_lodging");
  // El descartado no es una palanca: no se le cuenta al viajero un cambio que rompe un imprescindible.
  assert.deepEqual(
    otros.map((l) => l.change.lodging),
    ["a5", "a4", "a6"],
  );
  for (const l of otros) {
    assert.equal(l.base_row, partida.id);
    assert.equal(l.saves, partida.total - (l.total as number));
  }
  const zona = TABLA.levers.filter((l) => l.lever === "other_zone");
  assert.equal(zona.length, 1);
  assert.equal(zona[0].change.zone, "z2");
  assert.equal(zona[0].change.lodging, "a6");
  assert.equal(zona[0].walk_minutes_change, (fila("a6").walk_minutes as number) - (partida.walk_minutes as number));
});

test("las palancas: las mismas noches movidas, con el alojamiento y el transporte de esas fechas", () => {
  const unDiaAntes = TABLA.levers.find((l) => l.lever === "shift_dates" && l.change.days_moved === -1)!;
  // El alojamiento un día antes cuesta el 90 %, más sus tasas, y el vuelo ya no cae en viernes.
  assert.equal(unDiaAntes.total, 210 * 0.9 + 6 + 100);
  assert.equal(unDiaAntes.saves, 376 - 295);
  assert.equal(unDiaAntes.status, "priced");
  assert.equal(unDiaAntes.change.check_in, "2027-03-04");
  const unaMenos = TABLA.levers.find((l) => l.lever === "nights" && l.change.nights_changed === -1)!;
  assert.equal(unaMenos.total, 140 + 6 + 160);
});

test("las palancas: sin el transporte de esas fechas no hay total: no se mezclan precios de otras fechas", () => {
  const sinVuelo = structuredClone(PIEZAS);
  for (const m of sinVuelo.movidos) if (m.dias === -1) m.transporte = null;
  const t = montarTabla(sinVuelo);
  const l = t.levers.find((x) => x.lever === "shift_dates" && x.change.days_moved === -1)!;
  assert.equal(l.status, "no_price");
  assert.equal(l.total, "unknown");
  assert.equal(l.saves, "unknown");
});

test("sin transporte en el viaje, la tabla suma solo el alojamiento, y lo dice", async () => {
  const t = montarTabla(await piezasDeLaTabla(false));
  const a2 = t.rows.find((r) => r.lodging === "a2")!;
  assert.equal(a2.transport, null);
  assert.equal(a2.transport_total, null);
  assert.equal(a2.total, 216);
  const unDiaAntes = t.levers.find((l) => l.lever === "shift_dates" && l.change.days_moved === -1)!;
  assert.equal(unDiaAntes.total, 195);
});

test("la misma entrada da la misma tabla", () => {
  assert.deepEqual(montarTabla(structuredClone(PIEZAS)), TABLA);
});
