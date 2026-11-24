// Las pruebas de empezar: de lo que el viajero toca a lo que he entendido, sin IA. Con sitios y respuestas
// inventados, de clases distintas: lo que sale tiene que pasar la puerta 1 para cualquier viaje.

import assert from "node:assert/strict";
import { test } from "node:test";
import { MONEDA_DE, monedaDe } from "../../agent/data/monedas.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO } from "../../agent/data/viaje.ts";
import { puertaEntendido } from "../../agent/gates/puerta_entendido.ts";
import {
  CAJA_DE_PARTIDA,
  cajaAlrededor,
  entendidoDe,
  enUnaLinea,
  LO_MAS_PROBABLE,
  respuestasDe,
  type Respuestas,
  type SitioElegido,
} from "../../agent/scripts/empezar.ts";

const HOY = "2027-01-01";
const FECHAS = { entrada: "2027-03-05", salida: "2027-03-08" };
const VILLA: SitioElegido = {
  nombre: "Villa Inventada",
  pais: "zz",
  clase: "city",
  centro: { lat: 10, lon: 20 },
  caja: { west: 19.97, south: 9.98, east: 20.03, north: 10.03 },
};
const ORIGEN = { nombre: "Origen Inventado", pais: "YY" };

/** Las respuestas de quien solo ha dicho dónde, cuándo y de dónde sale, con lo que se quiera cambiar. */
function respuestas(cambia: (r: Respuestas) => void = () => {}, destino: SitioElegido = VILLA): Respuestas {
  const r = respuestasDe(destino, FECHAS, { idioma: "es", moneda: "EUR" });
  r.origen = { ...ORIGEN };
  cambia(r);
  return r;
}
const rojosDe = (r: Respuestas): string[] => [
  ...new Set(puertaEntendido(entendidoDe(r).entendido, { hoy: HOY }).rojos.map((x) => x.donde)),
];

test("con dónde, cuándo y de dónde sales ya hay un viaje que pasa la puerta 1, y se dice lo que se supuso", () => {
  const e = entendidoDe(respuestas());
  assert.deepEqual(e.falta, []);
  assert.deepEqual(e.supuesto.sort(), [
    "budget",
    "dates.flexible",
    "pace",
    "travellers.adults",
    "travellers.passports",
    "travellers.rooms",
  ]);
  assert.deepEqual(e.entendido, {
    language: "es",
    currency: "EUR",
    destination: {
      name: "Villa Inventada",
      country: "ZZ",
      kind: "city",
      centre: VILLA.centro,
      box: VILLA.caja,
      airport: null,
    },
    origin: { name: "Origen Inventado", country: "YY", airport: null },
    dates: { check_in: FECHAS.entrada, check_out: FECHAS.salida, flexible: LO_MAS_PROBABLE.fechasMovibles },
    travellers: {
      adults: LO_MAS_PROBABLE.adultos,
      children: [],
      rooms: LO_MAS_PROBABLE.habitaciones,
      passports: ["YY", "YY"],
    },
    budget: LO_MAS_PROBABLE.gasto,
    looking_for: [],
    pace: LO_MAS_PROBABLE.ritmo,
    tastes: [],
    limits: [],
    booked: [],
  });
  assert.deepEqual(rojosDe(respuestas()), []);
});

test("lo que el viajero dice manda sobre lo más probable, y deja de ser supuesto", () => {
  const r = respuestas((x) => {
    x.adultos = 3;
    x.ninos = [0, 9];
    x.habitaciones = 2;
    x.pasaportes = ["yy", "YY", "xx", "YY", "YY"];
    x.fechasMovibles = true;
    x.gasto = "tight";
    x.ritmo = "calm";
    x.buscas = ["Comer bien", "Naturaleza", "Comer bien", "  "];
    x.libre = "  quiero vistas\nal mar  ";
    x.reservado = "el vuelo de ida";
  });
  const e = entendidoDe(r);
  assert.deepEqual([e.supuesto, e.falta], [[], []]);
  assert.deepEqual(e.entendido?.travellers, {
    adults: 3,
    children: [0, 9],
    rooms: 2,
    passports: ["YY", "YY", "XX", "YY", "YY"],
  });
  assert.deepEqual([e.entendido?.dates.flexible, e.entendido?.budget, e.entendido?.pace], [true, "tight", "calm"]);
  // Lo que tocó y, detrás, lo que escribió, en una línea y sin repetir. Lo reservado, aparte.
  assert.deepEqual(e.entendido?.looking_for, ["Comer bien", "Naturaleza", "quiero vistas al mar"]);
  assert.deepEqual(e.entendido?.booked, ["el vuelo de ida"]);
  assert.deepEqual(rojosDe(r), []);
});

test("lo que no se puede suponer se dice que falta, y entonces no hay nada que guardar", () => {
  const casos: [(r: Respuestas) => void, string[]][] = [
    [(r) => void (r.moneda = null), ["currency"]],
    [(r) => void (r.moneda = "euros"), ["currency"]],
    [(r) => void (r.destino = { ...VILLA, pais: null }), ["destination.country"]],
    [(r) => void (r.destino = { ...VILLA, pais: "Zetalandia" }), ["destination.country"]],
    [(r) => void (r.origen = { nombre: "Un sitio sin país", pais: null }), ["origin.country", "travellers.passports"]],
    [(r) => void (r.ninos = [4, null]), ["travellers.children"]],
    // Sin saber de dónde sale ni con qué pasaporte viaja no hay precio que pedir.
    [(r) => void (r.origen = null), ["travellers.passports"]],
    [(r) => void (r.pasaportes = ["YY", "no sé"]), ["travellers.passports"]],
  ];
  for (const [cambia, falta] of casos) {
    const e = entendidoDe(respuestas(cambia));
    assert.deepEqual([e.falta, e.entendido], [falta, null]);
  }
  // Sin decir de dónde sale, pero diciendo de qué país es cada uno, hay viaje: sin transporte que buscar.
  const sinOrigen = respuestas((r) => {
    r.origen = null;
    r.pasaportes = ["YY", "YY"];
  });
  assert.equal(entendidoDe(sinOrigen).entendido?.origin, null);
  assert.deepEqual(rojosDe(sinOrigen), []);
});

test("no arregla lo que el viajero dice mal: lo dice la puerta 1", () => {
  assert.deepEqual(rojosDe(respuestas((r) => void (r.habitaciones = 3))), ["travellers.rooms"]);
  assert.deepEqual(rojosDe(respuestas((r) => void (r.salida = r.entrada))), ["dates"]);
  assert.deepEqual(rojosDe(respuestas((r) => void (r.entrada = "2026-12-01"))), ["dates"]);
  assert.deepEqual(rojosDe(respuestas((r) => void (r.idioma = "castellano"))), ["language"]);
});

test("lo que alguien escribe va en una línea, sin marcas de control y sin pasar de su largo", () => {
  const b = String.fromCharCode(0x2028);
  assert.equal(enUnaLinea(`  una\tcosa\r\n y${b}otra \u0000 más  `), "una cosa y otra más");
  assert.equal(enUnaLinea("a".repeat(FRASE_DEL_VIAJERO + 50)).length, FRASE_DEL_VIAJERO);
  assert.equal(enUnaLinea("   "), "");
  const r = respuestas((x) => {
    x.libre = "x".repeat(1000);
    x.buscas = Array.from({ length: FRASES_DEL_VIAJERO + 10 }, (_, i) => `cosa ${i}`);
    x.reservado = "un\nhotel";
    x.destino = { ...VILLA, nombre: `  Villa\nInventada ${"y".repeat(200)}` };
  });
  const e = entendidoDe(r).entendido;
  assert.equal(e?.looking_for.length, FRASES_DEL_VIAJERO);
  assert.deepEqual(e?.booked, ["un hotel"]);
  assert.ok(e?.destination.name.startsWith("Villa Inventada y"));
  assert.deepEqual(rojosDe(r), []);
});

test("un sitio sin su caja recibe una alrededor de su centro, por su clase, en cualquier parte del mapa", () => {
  const sitios: SitioElegido[] = [
    { nombre: "Un pueblo", pais: "ZZ", clase: "city", centro: { lat: 10, lon: 20 }, caja: null },
    { nombre: "Un pico", pais: "ZZ", clase: "region", centro: { lat: -45.5, lon: 170.2 }, caja: null },
    // Pegado al meridiano 180: la caja lo cruza, y su oeste queda mayor que su este.
    { nombre: "Una isla", pais: "ZZ", clase: "region", centro: { lat: -17.7, lon: 179.95 }, caja: null },
    // Cerca de un polo: no se sale del mapa ni da la vuelta entera.
    { nombre: "Una base", pais: "ZZ", clase: "region", centro: { lat: 89.9, lon: 0 }, caja: null },
    { nombre: "Un país pequeño", pais: "ZZ", clase: "country", centro: { lat: 0, lon: -179.5 }, caja: null },
  ];
  for (const sitio of sitios) {
    const r = respuestas(() => {}, sitio);
    assert.deepEqual(rojosDe(r), [], sitio.nombre);
    const caja = entendidoDe(r).entendido!.destination.box;
    assert.ok(caja.south <= sitio.centro.lat && sitio.centro.lat <= caja.north, sitio.nombre);
    assert.ok(
      [caja.west, caja.east].every((x) => x >= -180 && x <= 180),
      sitio.nombre,
    );
  }
  // El lado es el de su clase: en el ecuador, de sur a norte hay eso mismo en metros.
  const c = cajaAlrededor({ lat: 0, lon: 0 }, CAJA_DE_PARTIDA.city);
  assert.ok(Math.abs((c.north - c.south) * 111_320 - CAJA_DE_PARTIDA.city) < 1);
  assert.ok(Math.abs((c.east - c.west) * 111_320 - CAJA_DE_PARTIDA.city) < 1);
  const isla = cajaAlrededor({ lat: -17.7, lon: 179.95 }, CAJA_DE_PARTIDA.region);
  assert.ok(isla.west > isla.east);
});

test("lo de moverse solo va en un país o en una región, y lo que no se ha dicho no se supone", () => {
  const region: SitioElegido = { ...VILLA, nombre: "Comarca Inventada", clase: "region" };
  assert.equal(entendidoDe(respuestas()).entendido?.moving, undefined);
  assert.deepEqual(entendidoDe(respuestas(() => {}, region)).entendido?.moving, {
    several_places: null,
    leave_country: null,
    how_much: null,
  });
  const dicho = respuestas((r) => void (r.moverse = { variosSitios: true, salirDelPais: false, cuanto: "some" }), {
    ...region,
    clase: "country",
  });
  assert.deepEqual(entendidoDe(dicho).entendido?.moving, {
    several_places: true,
    leave_country: false,
    how_much: "some",
  });
  assert.deepEqual(rojosDe(dicho), []);
  assert.ok(!entendidoDe(dicho).supuesto.some((s) => s.startsWith("moving")));
});

test("la moneda que se propone de cada país es una moneda de verdad, y de un país de verdad", () => {
  const monedas = new Set(Intl.supportedValuesOf("currency"));
  const paises = new Intl.DisplayNames("en", { type: "region" });
  assert.ok(MONEDA_DE.size > 200);
  for (const [pais, moneda] of MONEDA_DE) {
    assert.match(pais, /^[A-Z]{2}$/);
    assert.ok(monedas.has(moneda), `${pais}: ${moneda}`);
    assert.notEqual(paises.of(pais), pais, pais);
  }
  assert.equal(monedaDe("jp"), "JPY");
  assert.equal(monedaDe("ZZ"), null);
  assert.equal(monedaDe(null), null);
});
