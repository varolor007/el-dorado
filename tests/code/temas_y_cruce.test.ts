import assert from "node:assert/strict";
import { test } from "node:test";
import { casar, metros, parecido } from "../../agent/scripts/cruce.ts";
import { entreFechas, porTemas } from "../../agent/scripts/temas.ts";
import { ALOJAMIENTOS, DE_ZONA, OPINIONES } from "../cases/inventado/inventado.ts";

test("las opiniones se cuentan por temas, lo bueno y lo malo por separado", () => {
  const t = porTemas(OPINIONES);
  assert.deepEqual(t.piscina, { bueno: 1, malo: 0 });
  assert.deepEqual(t.gimnasio, { bueno: 0, malo: 1 });
  assert.deepEqual(t.ruido, { bueno: 0, malo: 1 });
  assert.deepEqual(t.limpieza, { bueno: 1, malo: 0 });
  assert.deepEqual(t.cama, { bueno: 0, malo: 1 });
  assert.deepEqual(t.vistas, { bueno: 0, malo: 0 });
});

test("las fechas de las opiniones, sin contar las que no la traen", () => {
  assert.deepEqual(entreFechas(OPINIONES), { desde: "2026-12-01", hasta: "2026-12-20" });
  assert.deepEqual(entreFechas([]), { desde: null, hasta: null });
});

test("la distancia entre dos puntos, en metros", () => {
  assert.ok(Math.abs(metros(10, 20, 10.001, 20) - 111.2) < 1);
  assert.equal(metros(10, 20, 10, 20), 0);
});

test("el parecido de dos nombres no mira el orden, los acentos ni las palabras de relleno", () => {
  assert.equal(parecido("Hotel Faro Inventado", "Faro Inventado Hotel"), 1);
  assert.equal(parecido("Posada del Río Inventado", "Posada del Rio Inventado"), 1);
  assert.equal(parecido("Hotel Faro Inventado", "Bar de la Esquina"), 0);
});

test("casa al que está cerca y se llama parecido, y a ningún otro", () => {
  const faro = ALOJAMIENTOS[0];
  assert.equal(casar(faro, DE_ZONA)?.nombre, "Faro Inventado Hotel");
  // la posada de la otra fuente se llama igual, pero está a más de cincuenta kilómetros
  assert.equal(casar(ALOJAMIENTOS[1], DE_ZONA), null);
  // cerca del mirador solo hay un bar que no se parece en nada
  assert.equal(casar(ALOJAMIENTOS[2], DE_ZONA), null);
  assert.equal(casar({ nombre: "Hotel Faro Inventado", lat: null, lon: null }, DE_ZONA), null);
});
