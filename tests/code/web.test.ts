// Lo que la web dice por una clave tiene su frase en cada idioma, y lo que la web enseña de fuera pasa antes por lo
// que comprueba la casa: una clave sin frase saldría en pantalla con su nombre de dentro.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPOS, MENCIONES, OTRO_TEMA, SIN_SABER, TEMAS_DE_OPINIONES, TONOS } from "../../agent/data/niveles.ts";
import { AVISOS_DE_FICHA, PRUEBAS } from "../../agent/output/viaje.ts";
import { CLASES_DE_DESTINO } from "../../agent/scripts/formas.ts";
import { grabadoQueVale } from "../../web/src/lib/grabado.ts";
import { cajaDe, claseDeLugar, lugarDe } from "../../web/src/lib/lugares.ts";
import { IDIOMAS, TEXTOS } from "../../web/src/lib/textos.ts";
import { SUCESOS_INVENTADOS, viajeInventado } from "../cases/inventado/viaje.ts";

const faltan = (claves: readonly string[], dichas: Record<string, unknown>): string[] =>
  claves.filter((c) => typeof dichas[c] !== "string" || dichas[c] === "");

for (const idioma of IDIOMAS) {
  const t = TEXTOS[idioma];

  test(`la web sabe decir cada campo y cada nivel de la ficha de cómo es (${idioma})`, () => {
    assert.deepEqual(faltan(Object.keys(CAMPOS), t.campos), []);
    assert.deepEqual(faltan([...new Set(Object.values(CAMPOS).flat()), SIN_SABER], t.niveles), []);
  });

  test(`la web sabe decir cada tema de las opiniones, su tono y en cuántas se dice (${idioma})`, () => {
    const temas = TEMAS_DE_OPINIONES.filter((x) => x !== OTRO_TEMA);
    assert.deepEqual(faltan(temas, t.temas), []);
    assert.deepEqual(faltan(TONOS, t.tonos), []);
    assert.deepEqual(faltan(MENCIONES, t.menciones), []);
  });

  test(`la web sabe decir cada aviso de la ficha y cada clase de prueba (${idioma})`, () => {
    assert.deepEqual(faltan(AVISOS_DE_FICHA, t.ficha.avisos), []);
    assert.deepEqual(faltan(PRUEBAS, t.ficha.prueba), []);
  });
}

test("los dos idiomas de la web dicen las mismas claves, ni una más ni una menos", () => {
  const claves = (o: unknown, por = ""): string[] =>
    o !== null && typeof o === "object"
      ? Object.entries(o).flatMap(([k, v]) => claves(v, por === "" ? k : `${por}.${k}`))
      : [por];
  assert.deepEqual(claves(TEXTOS.es).sort(), claves(TEXTOS.en).sort());
});

test("un viaje grabado con la forma de antes, o roto, no se enseña: la web dice que no hay viaje", () => {
  const sucesos = SUCESOS_INVENTADOS;
  assert.notEqual(grabadoQueVale({ viaje: viajeInventado(), sucesos }), null);
  // La ficha de antes: con lo mejor y lo peor en una frase, y sin lo que se dice ni cuántas fotos son de la habitación.
  const deAntes = JSON.parse(JSON.stringify(viajeInventado()));
  for (const a of deAntes.alojamientos) {
    delete a.seDice;
    delete a.fotosDeHabitacion;
    a.loMejor = "Una habitación cuidada.";
  }
  assert.equal(grabadoQueVale({ viaje: deAntes, sucesos }), null);
  const conFrase = viajeInventado();
  conFrase.alojamientos[0].avisos = ["llama al 600 000 000" as never];
  assert.equal(grabadoQueVale({ viaje: conFrase, sucesos }), null);
  for (const roto of [null, 7, "viaje", {}, { viaje: {}, sucesos: [] }, { viaje: viajeInventado() }])
    assert.equal(grabadoQueVale(roto), null);
});

// Lo que devuelve el buscador de lugares, con la forma de Photon y con sitios inventados.
const resultado = (propiedades: Record<string, unknown>, coordenadas: unknown = [20.05, 10.05]): unknown => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: coordenadas },
  properties: { name: "Sitio Inventado", state: "Comarca Inventada", country: "País Inventado", ...propiedades },
});

test("se puede elegir un sitio con calles, del país al barrio, y también uno sin ellas: la naturaleza", () => {
  const clase = (type: string | undefined, osm_key: string, osm_value: string): string | null =>
    claseDeLugar({ type, osm_key, osm_value });
  // Lo que ya valía: lo que Photon ordena en sus capas.
  assert.equal(clase("country", "place", "country"), "country");
  assert.equal(clase("state", "boundary", "administrative"), "region");
  assert.equal(clase("county", "boundary", "administrative"), "region");
  assert.equal(clase("city", "place", "village"), "city");
  assert.equal(clase("district", "place", "suburb"), "city");
  assert.equal(clase("locality", "place", "locality"), "city");
  // Lo que se tiraba: un parque nacional, una reserva, un valle, una costa, una playa, una isla, una sierra, un lago.
  const deFuera = [
    ["boundary", "national_park"],
    ["boundary", "protected_area"],
    ["leisure", "nature_reserve"],
    ["natural", "valley"],
    ["natural", "coastline"],
    ["natural", "beach"],
    ["natural", "mountain_range"],
    ["natural", "peak"],
    ["natural", "water"],
    ["natural", "desert"],
    ["place", "island"],
    ["place", "archipelago"],
    ["place", "region"],
  ];
  for (const [llave, valor] of deFuera) {
    assert.equal(clase("other", llave, valor), "region", `${llave}=${valor}, en la capa de lo demás`);
    assert.equal(clase(undefined, llave, valor), "region", `${llave}=${valor}, sin capa`);
    // Toda clase que sale es de las de la casa.
    assert.ok((CLASES_DE_DESTINO as readonly string[]).includes(clase("other", llave, valor) ?? ""));
  }
  // Un Photon que no diga su capa: vale lo que el sitio es en OpenStreetMap.
  assert.equal(clase(undefined, "place", "town"), "city");
  assert.equal(clase(undefined, "place", "country"), "country");
});

test("lo que hay dentro de un sitio no es un destino: ni una calle, ni un portal, ni un negocio", () => {
  assert.equal(claseDeLugar({ type: "street", osm_key: "highway", osm_value: "residential" }), null);
  assert.equal(claseDeLugar({ type: "house", osm_key: "amenity", osm_value: "restaurant" }), null);
  assert.equal(claseDeLugar({ type: "house", osm_key: "tourism", osm_value: "hotel" }), null);
  assert.equal(claseDeLugar({ type: "other", osm_key: "shop", osm_value: "bakery" }), null);
  // Lo que no dice nada, o dice un nombre que no es de ninguna lista, tampoco.
  assert.equal(claseDeLugar({}), null);
  assert.equal(claseDeLugar({ type: "constructor", osm_key: "__proto__", osm_value: "toString" }), null);
  assert.equal(claseDeLugar({ type: 7, osm_key: null, osm_value: ["natural"] }), null);
});

test("la caja de un sitio solo pasa si son cuatro números del mapa", () => {
  assert.deepEqual(cajaDe([20, 10.1, 20.1, 10]), [20, 10.1, 20.1, 10]);
  // Una caja que cruza el meridiano 180 tiene el oeste más allá del este, y vale.
  assert.deepEqual(cajaDe([170, -10, -170, -20]), [170, -10, -170, -20]);
  const rotas: unknown[] = [
    null,
    "20,10.1,20.1,10",
    [20, 10.1, 20.1],
    [20, 10.1, 20.1, 10, 0],
    ["20", "10.1", "20.1", "10"],
    [20, 10.1, 20.1, null],
    [20, 10.1, Number.NaN, 10],
    // Lo que deja un número fuera de escala al leer el JSON.
    [20, JSON.parse("1e999"), 20.1, 10],
    [200, 10.1, 20.1, 10],
    [20, 95, 20.1, 10],
    // El sur, por encima del norte.
    [20, 10, 20.1, 10.1],
    [{}, [], true, 10],
  ];
  for (const rota of rotas) assert.equal(cajaDe(rota), null, String(JSON.stringify(rota)));
});

test("del buscador solo sale un sitio con nombre, en el mapa y de una clase que valga, con su caja comprobada", () => {
  const parque = { type: "other", osm_key: "boundary", osm_value: "national_park" };
  assert.deepEqual(lugarDe(resultado({ ...parque, extent: [20, 10.1, 20.1, 10] })), {
    nombre: "Sitio Inventado",
    donde: "Comarca Inventada, País Inventado",
    clase: "region",
    lat: 10.05,
    lon: 20.05,
    caja: [20, 10.1, 20.1, 10],
  });
  // Con una caja que no son cuatro números, el sitio se propone sin ella: el mapa va a su punto.
  assert.equal(lugarDe(resultado({ ...parque, extent: [20, "10.1", 20.1, 10] }))?.caja, null);
  assert.equal(lugarDe(resultado(parque))?.caja, null);
  // Sin nombre, sin punto, con un punto que no es del mapa o de una clase que no vale, no se propone.
  assert.equal(lugarDe(resultado({ ...parque, name: undefined })), null);
  assert.equal(lugarDe(resultado({ ...parque, name: "  " })), null);
  assert.equal(lugarDe(resultado(parque, null)), null);
  assert.equal(lugarDe(resultado(parque, ["20.05", "10.05"])), null);
  assert.equal(lugarDe(resultado(parque, [20.05, JSON.parse("1e999")])), null);
  assert.equal(lugarDe(resultado(parque, [20.05, 91])), null);
  assert.equal(lugarDe(resultado({ type: "house", osm_key: "amenity", osm_value: "cafe" })), null);
  for (const roto of [null, undefined, 7, "sitio", [], {}, { properties: null, geometry: null }])
    assert.equal(lugarDe(roto), null);
  // El país no se repite como «dónde» cuando el sitio es el propio país.
  const pais = { type: "country", osm_key: "place", osm_value: "country", name: "País Inventado", state: undefined };
  assert.equal(lugarDe(resultado(pais))?.donde, "");
});
