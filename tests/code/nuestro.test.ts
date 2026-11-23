import assert from "node:assert/strict";
import { test } from "node:test";
import { NOTA_MINIMA, PESOS_DEL_ALOJAMIENTO, PESOS_DEL_VUELO, QUEJAS_GRAVES } from "../../agent/data/cribas.ts";
import { COSAS, valorDelNivel } from "../../agent/data/gustos.ts";
import { CAMPOS, SIN_ORDEN } from "../../agent/data/niveles.ts";
import { AVISOS, EL_MAS_BARATO, PROHIBIDAS, QUE_ENCONTRAMOS } from "../../agent/data/palabras.ts";
import { PALANCAS } from "../../agent/data/palancas.ts";
import { DOMINIOS_OFICIALES, esOficial, PREGUNTAS } from "../../agent/data/papeles.ts";

const suma = (pesos: Record<string, number>): number =>
  Math.round(Object.values(pesos).reduce((a, b) => a + b, 0) * 1000) / 1000;

test("los pesos de partida suman uno, y la nota mínima es una nota", () => {
  assert.equal(suma(PESOS_DEL_ALOJAMIENTO), 1);
  assert.equal(suma(PESOS_DEL_VUELO), 1);
  assert.ok(NOTA_MINIMA > 0 && NOTA_MINIMA < 10);
});

test("cada gusto cruza con un campo de la ficha y con niveles de ese campo, y ninguno con un campo sin orden", () => {
  for (const [cosa, c] of Object.entries(COSAS)) {
    assert.ok(CAMPOS[c.campo] !== undefined, `${cosa}: no existe el campo ${c.campo}`);
    assert.ok(!SIN_ORDEN.includes(c.campo), `${cosa}: el campo ${c.campo} no tiene orden`);
    assert.ok(c.cumplen.length > 0);
    for (const nivel of c.cumplen) assert.ok(CAMPOS[c.campo].includes(nivel), `${cosa}: ${nivel} no es de su campo`);
  }
});

test("el mejor nivel de un campo vale diez, el peor cero, y uno que no es de su lista no vale nada", () => {
  assert.equal(valorDelNivel("gym", "full"), 10);
  assert.equal(valorDelNivel("gym", "none"), 0);
  assert.equal(valorDelNivel("room_space", "fits"), 5);
  assert.equal(valorDelNivel("gym", "unknown"), null);
  assert.equal(valorDelNivel("no_existe", "full"), null);
});

test("la lista de palancas es fija, sin repetidos, y dice cuáles pide el código y a qué esperan las demás", () => {
  const ids = PALANCAS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("shift_dates") && ids.includes("other_lodging") && ids.includes("other_zone"));
  for (const p of PALANCAS) assert.equal(p.laPideElCodigo, p.espera === null, p.id);
});

test("las palabras prohibidas cazan una promesa y una palabra de dentro, y dejan pasar una frase con su hecho", () => {
  const caza = (frase: string): boolean => PROHIBIDAS.some((p) => p.patron.test(frase));
  assert.ok(caza("We guarantee the lowest fare"));
  assert.ok(caza("Te va a encantar este hotel"));
  assert.ok(caza("Es el mejor precio"));
  assert.ok(caza("According to row r3 of the table"));
  assert.ok(caza("El modelo de lenguaje eligió este"));
  assert.ok(!caza("55 euros menos, a doce minutos andando de lo del segundo día"));
  assert.ok(!caza("De puerta a puerta son cuatro horas, y tu asiento va incluido"));
});

test("«el más barato» solo vale con su «que encontramos»", () => {
  const vale = (frase: string): boolean => !EL_MAS_BARATO.test(frase) || QUE_ENCONTRAMOS.test(frase);
  assert.ok(!vale("Es el más barato."));
  assert.ok(vale("Es el más barato que encontramos."));
  assert.ok(vale("It is the cheapest we found."));
  assert.ok(vale("Sale 40 euros más."));
});

test("los avisos de siempre están en cada idioma en que se escribe", () => {
  for (const idioma of ["en", "es"]) {
    assert.ok(AVISOS[idioma].ia.length > 20);
    assert.ok(AVISOS[idioma].precios.length > 20);
  }
});

test("las preguntas de los papeles son once, sin repetidos", () => {
  assert.equal(PREGUNTAS.length, 11);
  assert.equal(new Set(PREGUNTAS).size, 11);
});

test("un dominio oficial lo es con https y con lo que cuelga de él, y no lo es uno que solo se le parece", () => {
  assert.ok(Object.keys(DOMINIOS_OFICIALES).every((pais) => /^[A-Z]{2}$/.test(pais)));
  assert.ok(esOficial("https://www.exteriores.gob.es/es/ServiciosAlCiudadano", "es"));
  assert.ok(esOficial("https://home-affairs.ec.europa.eu/policies", "PT"));
  assert.ok(!esOficial("http://www.exteriores.gob.es/", "ES"));
  assert.ok(!esOficial("https://exteriores.gob.es.viajes-baratos.example/", "ES"));
  assert.ok(!esOficial("no es una dirección", "ES"));
});

test("las quejas graves se cazan como las escribe quien las sufre", () => {
  assert.ok(QUEJAS_GRAVES.chinches.test("we found bed bugs in the mattress"));
  assert.ok(QUEJAS_GRAVES.moho.test("mould on the bathroom ceiling"));
  assert.ok(!QUEJAS_GRAVES.chinches.test("the bed was comfortable"));
});
