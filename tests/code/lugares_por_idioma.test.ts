// El buscador de lugares con el nombre de un país en tu idioma (el PM, 26-nov: «Tailandia» daba un pueblo de Colombia,
// y «Thailand» el país escrito en tailandés). Sin internet: lo que dice el idioma, y el orden de lo que llega.

import assert from "node:assert/strict";
import { test } from "node:test";
import { nombreDelPais, paisesQueEmpiezan, rangoDe, sinTildes } from "../../web/src/lib/lugares.ts";

test("un país se encuentra por su nombre en tu idioma o en inglés, con tres letras como poco", () => {
  assert.equal(paisesQueEmpiezan("Tailandia", "es")[0]?.codigo, "TH");
  assert.equal(paisesQueEmpiezan("tailandia", "es")[0]?.ingles, "Thailand");
  assert.equal(paisesQueEmpiezan("Thailand", "es")[0]?.nombre, "Tailandia");
  assert.equal(paisesQueEmpiezan("Japon", "es")[0]?.codigo, "JP");
  assert.deepEqual(
    paisesQueEmpiezan("Tai", "es").map((p) => p.codigo),
    ["TH", "TW"],
  );
  assert.deepEqual(paisesQueEmpiezan("Ta", "es"), []);
  assert.deepEqual(paisesQueEmpiezan("Villa Inventada", "es"), []);
  assert.equal(sinTildes("  Japón "), "japon");
});

test("un país que da el buscador sale con su nombre en tu idioma, no en su alfabeto", () => {
  assert.equal(nombreDelPais("TH", "es", "ประเทศไทย"), "Tailandia");
  assert.equal(nombreDelPais("JP", "en", "日本"), "Japan");
  assert.equal(nombreDelPais(null, "es", "ประเทศไทย"), "ประเทศไทย");
  assert.equal(nombreDelPais("JP", "x-raro-!", "日本"), "日本");
});

test("lo grande sale antes que lo pequeño: un país, una región, una ciudad, un pueblo, una aldea", () => {
  const de = (valor: string) => ({ properties: { osm_value: valor } });
  const orden = ["hamlet", "city", "country", "village", "state", "street"]
    .map(de)
    .sort((a, b) => rangoDe(a) - rangoDe(b));
  assert.deepEqual(
    orden.map((x) => x.properties.osm_value),
    ["country", "state", "city", "village", "hamlet", "street"],
  );
  assert.equal(rangoDe(null), rangoDe({}));
});
