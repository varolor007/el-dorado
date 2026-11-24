// Lo que la web dice por una clave tiene su frase en cada idioma, y lo que la web enseña de fuera pasa antes por lo
// que comprueba la casa: una clave sin frase saldría en pantalla con su nombre de dentro.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRAVES,
  CAMPOS,
  MENCIONES,
  OTRO_TEMA,
  SIN_SABER,
  TEMAS_DE_OPINIONES,
  TONOS,
} from "../../agent/data/niveles.ts";
import { AVISOS_DE_FICHA, PRUEBAS, type Transporte } from "../../agent/output/viaje.ts";
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
    assert.deepEqual(faltan(GRAVES, t.dormir.queja), []);
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

// Nada de lo que dice la web da por hecho cómo es el viaje: lo que depende de un número se lee bien con uno y con
// varios, en los dos idiomas.

test("en vivo, lo que sigue a un recuento concuerda con él, y las noches, con las del viaje", () => {
  const { en, es } = TEXTOS;
  assert.equal(en.vivo.lodgings_found(1), "place to stay found in the area");
  assert.equal(en.vivo.lodgings_found(2), "places to stay found in the area");
  assert.equal(es.vivo.lodgings_found(1), "alojamiento encontrado en la zona");
  assert.equal(es.vivo.lodgings_found(2), "alojamientos encontrados en la zona");
  assert.equal(en.vivo.lodgings_pass(1), "passes your minimums");
  assert.equal(en.vivo.lodgings_pass(2), "pass your minimums");
  assert.equal(es.vivo.lodgings_pass(1), "pasa tus mínimos");
  assert.equal(es.vivo.lodgings_pass(2), "pasan tus mínimos");
  assert.equal(en.vivo.sights_found(1), "sight worth your time");
  assert.equal(en.vivo.sights_found(2), "sights worth your time");
  assert.equal(es.vivo.sights_found(1), "sitio que merece tu tiempo");
  assert.equal(es.vivo.sights_found(2), "sitios que merecen tu tiempo");
  // Uno o varios alojamientos, para una noche o para varias.
  assert.equal(en.vivo.lodgings_priced(1, 1), "has a price for your night");
  assert.equal(en.vivo.lodgings_priced(2, 1), "have a price for your night");
  assert.equal(en.vivo.lodgings_priced(1, 21), "has a price for your nights");
  assert.equal(es.vivo.lodgings_priced(1, 1), "tiene precio para tu noche");
  assert.equal(es.vivo.lodgings_priced(2, 1), "tienen precio para tu noche");
  assert.equal(es.vivo.lodgings_priced(2, 21), "tienen precio para tus noches");
  // El cero se dice en plural en los dos idiomas.
  assert.equal(en.vivo.lodgings_found(0), "places to stay found in the area");
  assert.equal(es.vivo.lodgings_pass(0), "pasan tus mínimos");
});

test("quiénes vais se lee bien con uno y con varios: los adultos, los niños y la edad de cada niño", () => {
  const { en, es } = TEXTOS;
  assert.deepEqual([1, 2, 5].map(en.vistazo.adultos), ["1 adult", "2 adults", "5 adults"]);
  assert.deepEqual([1, 2, 5].map(es.vistazo.adultos), ["1 adulto", "2 adultos", "5 adultos"]);
  assert.deepEqual([0, 1, 3].map(en.preguntas.ninos), ["no children", "1 child", "3 children"]);
  assert.deepEqual([0, 1, 3].map(es.preguntas.ninos), ["sin niños", "1 niño", "3 niños"]);
  assert.deepEqual([0, 1, 12].map(en.preguntas.anos), ["Under 1", "1 year", "12 years"]);
  assert.deepEqual([0, 1, 12].map(es.preguntas.anos), ["Menos de 1 año", "1 año", "12 años"]);
});

for (const idioma of IDIOMAS) {
  const t = TEXTOS[idioma];

  test(`las respuestas de las preguntas no se repiten ni llevan nada de un caso (${idioma})`, () => {
    const p = t.preguntas;
    const listas = [p.origenOpciones, p.fechasOpciones, p.gastoOpciones, p.buscasOpciones];
    for (const lista of listas) {
      // Cada respuesta es la clave de su toque: si se repite, dos toques serían el mismo.
      assert.equal(new Set(lista).size, lista.length);
      // Ninguna lleva una cifra ni el signo de una moneda: eso es de un viaje, no de todos.
      for (const o of lista) assert.doesNotMatch(o, /[0-9$€£¥]/, o);
    }
    // Lo que buscas: pocas respuestas, y las mismas en los dos idiomas.
    assert.ok(p.buscasOpciones.length >= 6 && p.buscasOpciones.length <= 9);
    assert.equal(p.buscasOpciones.length, TEXTOS.en.preguntas.buscasOpciones.length);
  });

  test(`el buscador da tres ejemplos de sitio, los tres distintos (${idioma})`, () => {
    const ejemplos = t.buscador.ejemplos.split(", ");
    assert.equal(ejemplos.length, 3);
    assert.equal(new Set(ejemplos).size, 3);
  });
}

test("lo que buscas vale también para la naturaleza, la playa, los niños y la carretera", () => {
  const juntas = (lista: string[]): string => lista.join(" | ").toLowerCase();
  const en = juntas(TEXTOS.en.preguntas.buscasOpciones);
  const es = juntas(TEXTOS.es.preguntas.buscasOpciones);
  for (const palabra of ["nature", "beach", "children", "road"]) assert.ok(en.includes(palabra), palabra);
  for (const palabra of ["naturaleza", "playa", "niños", "carretera"]) assert.ok(es.includes(palabra), palabra);
});

test("los recuentos de las pantallas del viaje se leen bien con uno y con varios", () => {
  const { en, es } = TEXTOS;
  assert.deepEqual([1, 2, 21].map(en.vistazo.noches), ["1 night", "2 nights", "21 nights"]);
  assert.deepEqual([1, 2, 21].map(es.vistazo.noches), ["1 noche", "2 noches", "21 noches"]);
  assert.deepEqual([0, 1, 2].map(en.viaje.paradas), ["0 stops", "1 stop", "2 stops"]);
  assert.deepEqual([0, 1, 2].map(es.viaje.paradas), ["0 paradas", "1 parada", "2 paradas"]);
  assert.deepEqual([1, 4].map(en.ficha.estrellas), ["1 star", "4 stars"]);
  assert.deepEqual([1, 4].map(es.ficha.estrellas), ["1 estrella", "4 estrellas"]);
  // La nota y sus opiniones, con la cifra como la escribe cada idioma.
  assert.equal(en.ficha.nota(9, 1), "rated 9 by 1 guest");
  assert.equal(en.ficha.nota(8.6, 420), "rated 8.6 by 420 guests");
  assert.equal(es.ficha.nota(9, 1), "nota 9, de 1 opinión");
  assert.equal(es.ficha.nota(8.6, 420), "nota 8,6, de 420 opiniones");
  assert.equal(en.vistazo.minimos(8, 1, 1), "Minimums: rating 8, 1 review, 1 star. You can change them.");
  assert.equal(en.vistazo.minimos(8.5, 200, 4), "Minimums: rating 8.5, 200 reviews, 4 stars. You can change them.");
  assert.equal(en.vistazo.minimos(7, 50, 0), "Minimums: rating 7, 50 reviews. You can change them.");
  assert.equal(es.vistazo.minimos(8, 1, 1), "Mínimos: nota 8, 1 opinión y 1 estrella. Los puedes cambiar.");
  assert.equal(es.vistazo.minimos(8.5, 200, 4), "Mínimos: nota 8,5, 200 opiniones y 4 estrellas. Los puedes cambiar.");
  assert.equal(es.vistazo.minimos(7, 50, 0), "Mínimos: nota 7 y 50 opiniones. Los puedes cambiar.");
  // Lo que va debajo de un número en grande, o encima de una lista, concuerda con cuántos son.
  const parejas: [(n: number) => string, string, string][] = [
    [en.vistazo.encontrados, "place to stay in the area", "places to stay in the area"],
    [es.vistazo.encontrados, "alojamiento en la zona", "alojamientos en la zona"],
    [en.vistazo.pasan, "passes the minimums", "pass the minimums"],
    [es.vistazo.pasan, "pasa los mínimos", "pasan los mínimos"],
    [en.cifras.paradas, "stop", "stops"],
    [es.cifras.paradas, "parada", "paradas"],
    [en.ficha.otras, "Another seller", "Other sellers"],
    [es.ficha.otras, "Otro vendedor", "Otros vendedores"],
    [en.dormir.otros, "Another that passed the minimums", "Others that passed the minimums"],
    [es.dormir.otros, "Otro que pasó los mínimos", "Otros que pasaron los mínimos"],
    [es.viaje.fuera, "Se queda fuera con este ritmo", "Se quedan fuera con este ritmo"],
    [es.acciones.quitadas, "La quitaste tú", "Las quitaste tú"],
    // Las noches, cuando se nombran sin contarlas.
    [en.vistazo.desde, "from, for your night", "from, for your nights"],
    [es.vistazo.desde, "desde, por tu noche", "desde, por tus noches"],
    [en.ficha.precio, "Price for your night", "Price for your nights"],
    [es.ficha.precio, "Precio por tu noche", "Precio por tus noches"],
  ];
  for (const [dice, uno, varios] of parejas) {
    assert.equal(dice(1), uno);
    assert.equal(dice(2), varios);
    assert.equal(dice(0), varios);
  }
});

test("si el viaje lleva niños, la cabecera lo dice, con la edad de cada uno", () => {
  const { en, es } = TEXTOS;
  assert.equal(en.vistazo.ninos([7]), "1 child, age 7");
  assert.equal(en.vistazo.ninos([4, 7]), "2 children, ages 4 and 7");
  assert.equal(en.vistazo.ninos([1, 4, 7]), "3 children, ages 1, 4, and 7");
  assert.equal(es.vistazo.ninos([7]), "1 niño, de 7 años");
  assert.equal(es.vistazo.ninos([1]), "1 niño, de 1 año");
  assert.equal(es.vistazo.ninos([4, 7]), "2 niños, de 4 y 7 años");
  assert.equal(es.vistazo.ninos([1, 4, 7]), "3 niños, de 1, 4 y 7 años");
});

test("el título de las maneras dice las que tiene el viaje: una, dos o tres", () => {
  const { en, es } = TEXTOS;
  assert.deepEqual([1, 2, 3].map(en.viaje.maneras), ["One way to do it", "Two ways to do it", "Three ways to do it"]);
  assert.deepEqual([1, 2, 3].map(es.viaje.maneras), [
    "Una manera de hacerlo",
    "Dos maneras de hacerlo",
    "Tres maneras de hacerlo",
  ]);
  assert.equal(en.viaje.maneras(0), "No way to do it yet");
  assert.equal(es.viaje.maneras(0), "Todavía no hay ninguna manera de hacerlo");
  // Las cuentas: con una sola manera no hay nada que poner lado a lado.
  assert.deepEqual([1, 2, 3].map(en.cuentas.lado), [
    "What the one way costs",
    "The two ways, side by side",
    "The three ways, side by side",
  ]);
  assert.deepEqual([1, 2, 3].map(es.cuentas.lado), [
    "Lo que cuesta la única manera",
    "Las dos maneras, lado a lado",
    "Las tres maneras, lado a lado",
  ]);
  assert.equal(en.cuentas.lado(0), "Nothing to add up yet");
  assert.equal(es.cuentas.lado(0), "Todavía no hay nada que sumar");
});

test("cómo se llega se dice por la clase de su transporte, y sin nombrarla si la clase no se conoce", () => {
  // Las clases de transporte de la casa. Si la casa añade una, esta lista no compila hasta que entre aquí.
  const clases: Record<Transporte["clase"], true> = { flight: true, train: true, bus: true, car: true };
  for (const idioma of IDIOMAS) {
    const t = TEXTOS[idioma];
    const sinClase = t.cifras.total(3, "zepelin");
    const dichas = Object.keys(clases).map((clase) => t.cifras.total(3, clase));
    assert.equal(new Set([...dichas, sinClase]).size, dichas.length + 1, `cada clase, con su palabra (${idioma})`);
    for (const rara of ["", "constructor", "toString", "__proto__"]) assert.equal(t.cifras.total(3, rara), sinClase);
    // Solo se habla de un vuelo si es un vuelo.
    for (const clase of ["train", "bus", "car", "zepelin"]) {
      assert.doesNotMatch(t.cifras.total(3, clase), /flight|vuelo/);
      assert.doesNotMatch(t.cuentas.incluye("M", { clase, guardado: true }), /flight|vuelo/);
    }
    assert.match(t.cuentas.incluye("M", { clase: "flight", guardado: true }), /flight|vuelo/);
    // Y de un precio guardado, solo si lo es.
    assert.match(t.cuentas.incluye("M", { clase: "train", guardado: true }), /saved|guardado/);
    assert.doesNotMatch(t.cuentas.incluye("M", { clase: "train", guardado: false }), /saved|guardado/);
    assert.doesNotMatch(t.cuentas.incluye("M", null), /saved|guardado|flight|vuelo/);
  }
  const { en, es } = TEXTOS;
  // El total de arriba: de las noches o, si la manera lleva transporte, también de cómo se llega.
  assert.equal(en.cifras.total(1, null), "for your night");
  assert.equal(en.cifras.total(3, null), "for your nights");
  assert.equal(en.cifras.total(3, "train"), "your nights and the train");
  assert.equal(en.cifras.total(1, "zepelin"), "your night and transport");
  assert.equal(es.cifras.total(1, null), "por tu noche");
  assert.equal(es.cifras.total(3, null), "por tus noches");
  assert.equal(es.cifras.total(3, "bus"), "tus noches y el autobús");
  assert.equal(es.cifras.total(1, "zepelin"), "tu noche y el transporte");
  assert.equal(
    en.cuentas.incluye("The cheapest", { clase: "car", guardado: false }),
    "The cheapest: sleeping and the car.",
  );
  assert.equal(
    es.cuentas.incluye("Una distinta", { clase: "train", guardado: false }),
    "Una distinta: dormir y el tren.",
  );
  assert.equal(
    es.cuentas.incluye("La más barata", null),
    "La más barata: solo dormir. Su total no lleva ningún precio de transporte.",
  );
});

test("ninguna frase fija de las pantallas habla de un vuelo ni cuenta las maneras: eso lo dice el viaje", () => {
  const fijas = (o: unknown, por: string): [string, string][] =>
    typeof o === "string"
      ? [[por, o]]
      : o !== null && typeof o === "object"
        ? Object.entries(o).flatMap(([k, v]) => fijas(v, `${por}.${k}`))
        : [];
  for (const idioma of IDIOMAS) {
    // La portada cuenta qué es El Dorado, no un viaje: sus tres maneras son las de la hoja.
    const pantallas = Object.entries(TEXTOS[idioma]).filter(([parte]) => parte !== "portada");
    for (const [clave, frase] of pantallas.flatMap(([parte, textos]) => fijas(textos, parte)))
      assert.doesNotMatch(frase, /flight|vuelo|three ways|tres maneras/i, `${idioma}: ${clave}`);
  }
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
