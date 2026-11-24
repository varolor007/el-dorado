// Las pruebas de la búsqueda de transporte (4.4): los aeropuertos de salida y de llegada, la parrilla de pares y de
// días, y lo que llega a la investigación. Con aeropuertos y vuelos inventados, sin internet y sin gastar.

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DIAS_ALREDEDOR, PARES, PETICIONES_DE_TRANSPORTE } from "../../agent/data/transporte.ts";
import { puertaEntendido } from "../../agent/gates/puerta_entendido.ts";
import { sigue, type Estado, type Fuentes } from "../../agent/launcher/investigar.ts";
import { comprobarViaje, type Viaje } from "../../agent/output/viaje.ts";
import { entendidoDe, respuestasDe, respuestasDeLoEntendido } from "../../agent/scripts/empezar.ts";
import type { Entendido, Tabla } from "../../agent/scripts/formas.ts";
import {
  alrededorDe,
  buscarTransporte,
  ciudadPorNombre,
  deAlLado,
  deLaZona,
  deLasFechas,
  elTransporte,
  lugaresDeLlegada,
  lugaresDeSalida,
  paresDe,
  vuelosMovidos,
  type LugarDeVuelo,
  type Parrilla,
} from "../../agent/scripts/transporte.ts";
import { enlaceDeBusqueda, leerLugares, leerSemana } from "../../agent/tools/fuentes/aviasales.ts";
import type { Vuelo } from "../../agent/tools/fuentes/tipos.ts";
import { fuentesInventadas, leerJson, runNuevo, trabaja } from "../cases/inventado/asientos.ts";
import {
  AEROPUERTOS,
  CIUDADES,
  ENTENDIDO,
  transporteInventado,
  vueloInventado,
} from "../cases/inventado/investigacion.ts";

const DATOS = { aeropuertos: AEROPUERTOS, ciudades: CIUDADES };
/** El viaje inventado, sin aeropuertos dichos: los tiene que encontrar la casa. */
const SIN_AEROPUERTOS: Entendido = {
  ...ENTENDIDO,
  destination: { ...ENTENDIDO.destination, airport: null },
  origin: { name: "Origen Inventado", country: "YY", airport: null, centre: { lat: 40, lon: -3 } },
};
const codigos = (l: LugarDeVuelo[]): string[] => l.map((x) => x.codigo);

test("los lugares de la fuente: aeropuertos con vuelos y alguna ruta sin escala, con el nombre de su ciudad", () => {
  const aeropuertos = [
    {
      code: "AAA",
      city_code: "AAC",
      country_code: "YY",
      iata_type: "airport",
      flightable: true,
      name: "A Intl",
      coordinates: { lat: 1, lon: 2 },
    },
    {
      code: "BBB",
      city_code: "BBC",
      country_code: "YY",
      iata_type: "railway",
      flightable: true,
      name: "B Station",
      coordinates: { lat: 1, lon: 2 },
    },
    {
      code: "CCC",
      city_code: "CCC",
      country_code: "YY",
      iata_type: "airport",
      flightable: false,
      name: "C Field",
      coordinates: { lat: 1, lon: 2 },
    },
    {
      code: "DDD",
      city_code: "DDD",
      country_code: "YY",
      iata_type: "airport",
      flightable: true,
      name: "D sin rutas",
      coordinates: { lat: 1, lon: 2 },
    },
    {
      code: "EEE",
      city_code: "EEE",
      country_code: "YY",
      iata_type: "airport",
      flightable: true,
      name: "E",
      coordinates: { lat: 100, lon: 2 },
    },
    {
      code: "ab1",
      city_code: "AAC",
      country_code: "YY",
      iata_type: "airport",
      flightable: true,
      coordinates: { lat: 1, lon: 2 },
    },
  ];
  const ciudades = [
    { code: "AAC", name: "Ciudad A", country_code: "YY", coordinates: { lat: 1.1, lon: 2.1 } },
    { code: "PPP", name: "Pueblo", country_code: "YY", coordinates: { lat: 3, lon: 4 } },
    { code: "QQQ", name: "Sin punto", country_code: "YY" },
  ];
  const rutas = [
    { departure_airport_iata: "AAA", arrival_airport_iata: "XXX", transfers: 0 },
    { departure_airport_iata: "AAA", arrival_airport_iata: "XXX", transfers: 0 },
    { departure_airport_iata: "AAA", arrival_airport_iata: "YYY", transfers: 0 },
    { departure_airport_iata: "AAA", arrival_airport_iata: "ZZZ", transfers: 1 },
    { departure_airport_iata: "BBB", arrival_airport_iata: "XXX", transfers: 0 },
    { departure_airport_iata: "CCC", arrival_airport_iata: "XXX", transfers: 0 },
    { departure_airport_iata: "EEE", arrival_airport_iata: "XXX", transfers: 0 },
  ];
  const l = leerLugares(aeropuertos, ciudades, rutas);
  assert.deepEqual(l.aeropuertos, [
    { codigo: "AAA", ciudad: "AAC", nombre: "Ciudad A", pais: "YY", lat: 1, lon: 2, rutas: 2 },
  ]);
  assert.deepEqual(
    l.ciudades.map((c) => c.codigo),
    ["AAC", "PPP"],
  );
  // Lo que no tiene la forma de siempre no rompe nada: no hay lugares.
  assert.deepEqual(leerLugares(null, "x", { a: 1 }), { aeropuertos: [], ciudades: [] });
});

test("la semana de alrededor: cada precio con su día de verdad, el día en que se vio, sus escalas y su enlace", () => {
  const t = { origen: "OOO", destino: "VVV", ida: "2027-03-05", vuelta: "2027-03-08", moneda: "EUR", mercado: "yy" };
  const json = {
    data: [
      {
        depart_date: "2027-03-04",
        return_date: "2027-03-07",
        value: 70,
        number_of_changes: 1,
        found_at: "2027-03-01T10:00:00Z",
        origin: "OOO",
        destination: "VVV",
      },
      { depart_date: "2027-03-06", return_date: "2027-03-09", value: 90 },
      { depart_date: "mañana", return_date: "2027-03-09", value: 90 },
      { depart_date: "2027-03-06", return_date: "2027-03-09", value: "barato" },
      { depart_date: "2027-03-06", value: 50 },
    ],
  };
  const vuelos = leerSemana(json, t, "2027-03-02T00:00:00Z");
  assert.equal(vuelos.length, 2);
  assert.deepEqual(
    { sale: vuelos[0].sale, vuelve: vuelos[0].vuelve, visto: vuelos[0].visto, escalas: vuelos[0].escalasIda },
    { sale: "2027-03-04", vuelve: "2027-03-07", visto: "2027-03-01T10:00:00Z", escalas: 1 },
  );
  assert.equal(vuelos[0].enlace, "https://www.aviasales.com/search/OOO0403VVV07031");
  assert.equal(vuelos[0].pasajeros, 1);
  assert.equal(vuelos[0].guardado, true);
  // Sin el día en que se vio, el de la petición.
  assert.equal(vuelos[1].visto, "2027-03-02T00:00:00Z");
  assert.equal(vuelos[1].escalasIda, null);
  assert.deepEqual(leerSemana({ success: false }, t, "x"), []);
});

test("el enlace a la búsqueda solo se hace con códigos y fechas que son lo que parecen", () => {
  assert.equal(enlaceDeBusqueda("OOO", "VVV", "2027-12-31", null), "https://www.aviasales.com/search/OOO3112VVV1");
  assert.equal(enlaceDeBusqueda("../x", "VVV", "2027-12-31", null), null);
  assert.equal(enlaceDeBusqueda("OOO", "VVV", "31/12/2027", null), null);
  assert.equal(enlaceDeBusqueda("OOO", "VVV", "2027-12-31", "luego"), null);
});

test("alrededor de un punto: el más cercano con vuelos y, si es otro, el más grande hasta el tope", () => {
  const llegada = alrededorDe({ lat: 10, lon: 20 }, AEROPUERTOS, 2);
  // Junto a la villa hay uno pequeño; el más grande de alrededor está en otro país, y para una ciudad vale.
  assert.deepEqual(codigos(llegada), ["VVV", "XXX"]);
  assert.deepEqual(
    llegada.map((l) => l.porQue),
    ["nearest", "biggest"],
  );
  assert.ok(llegada[0].km! < 5 && llegada[1].km! < 150);
  // Los aeropuertos de una misma ciudad van juntos, y se piden por el código de la ciudad.
  const salida = alrededorDe({ lat: 40, lon: -3 }, AEROPUERTOS, 2);
  assert.deepEqual(codigos(salida), ["OOO"]);
  assert.deepEqual(salida[0].aeropuertos, ["OOB", "OOO"]);
  assert.equal(salida[0].rutas, 48);
});

test("un sitio sin aeropuerto cerca: el más cercano con vuelos, con su distancia, y se dice", () => {
  const lejos = { ...SIN_AEROPUERTOS, destination: { ...SIN_AEROPUERTOS.destination, centre: { lat: -20, lon: 55 } } };
  const { lugares, aviso } = lugaresDeLlegada(lejos, DATOS);
  assert.deepEqual(codigos(lugares), ["III"]);
  assert.equal(lugares[0].porQue, "far");
  assert.match(aviso ?? "", /el aeropuerto con vuelos más cercano a Villa Inventada está a \d+ km \(Isla Lejana\)/);
  // Sin ningún aeropuerto en los datos, ninguno, y se dice.
  assert.deepEqual(lugaresDeLlegada(SIN_AEROPUERTOS, { aeropuertos: [], ciudades: [] }).lugares, []);
});

test("a una región o un país se llega por sus aeropuertos más grandes, de dentro y de su país", () => {
  const region: Entendido = {
    ...SIN_AEROPUERTOS,
    destination: {
      ...SIN_AEROPUERTOS.destination,
      kind: "region",
      box: { west: 19, south: 9, east: 21, north: 11 },
    },
  };
  const { lugares } = lugaresDeLlegada(region, DATOS);
  assert.deepEqual(codigos(lugares), ["HHH", "VVV"]);
  assert.ok(lugares.every((l) => l.porQue === "in_area"));
  // Si dentro no hay ninguno, los de alrededor de su centro.
  assert.deepEqual(codigos(deLaZona({ west: 0, south: 0, east: 1, north: 1 }, "ZZ", AEROPUERTOS, 3)), []);
  const vacia = { ...region, destination: { ...region.destination, box: { west: 0, south: 0, east: 1, north: 1 } } };
  assert.deepEqual(codigos(lugaresDeLlegada(vacia, DATOS).lugares), ["VVV", "XXX", "HHH"]);
});

test("de dónde se sale: sin origen no hay transporte; con su punto, sus aeropuertos; sin punto, por su nombre", () => {
  const sinOrigen = lugaresDeSalida({ ...SIN_AEROPUERTOS, origin: null }, DATOS);
  assert.deepEqual(sinOrigen.lugares, []);
  assert.match(sinOrigen.aviso ?? "", /no se sabe de dónde se sale/);

  assert.deepEqual(codigos(lugaresDeSalida(SIN_AEROPUERTOS, DATOS).lugares), ["OOO"]);
  // Sin punto, por el nombre de su ciudad en los datos, sin mirar mayúsculas ni acentos.
  const porNombre = { ...SIN_AEROPUERTOS, origin: { name: "orígen  INVENTADO", country: "YY", airport: null } };
  assert.deepEqual(codigos(lugaresDeSalida(porNombre, DATOS).lugares), ["OOO"]);
  // Una ciudad sin aeropuerto: el de alrededor de su punto.
  const pueblo = { ...SIN_AEROPUERTOS, origin: { name: "Pueblo sin aeropuerto", country: "YY", airport: null } };
  assert.deepEqual(codigos(lugaresDeSalida(pueblo, DATOS).lugares), ["OOO"]);
  // De otro país, o que no está, no se sabe: no se supone.
  assert.equal(ciudadPorNombre("Origen Inventado", "ZZ", CIUDADES), null);
  const nadie = { ...SIN_AEROPUERTOS, origin: { name: "Ningún Sitio", country: "YY", airport: null } };
  const r = lugaresDeSalida(nadie, DATOS);
  assert.deepEqual(r.lugares, []);
  assert.match(r.aviso ?? "", /no se sabe dónde está «Ningún Sitio»/);
  // Un aeropuerto dicho se usa tal cual, aunque la fuente no diga sus lugares.
  assert.deepEqual(codigos(lugaresDeSalida(ENTENDIDO, null).lugares), ["OOO"]);
  assert.deepEqual(codigos(lugaresDeLlegada(ENTENDIDO, null).lugares), ["VVV"]);
});

test("los pares: primero los de delante, sin ir de una ciudad a sí misma, y nunca más del tope", () => {
  const l = (codigo: string, aeropuertos = [codigo]): LugarDeVuelo => ({
    codigo,
    nombre: codigo,
    pais: null,
    punto: null,
    aeropuertos,
    rutas: 1,
    km: null,
    porQue: "nearest",
  });
  assert.deepEqual(paresDe([l("AAA"), l("BBB")], [l("CCC"), l("AAA")]), [
    ["AAA", "CCC"],
    ["BBB", "CCC"],
    ["BBB", "AAA"],
  ]);
  // Una ciudad y uno de sus aeropuertos son el mismo sitio.
  assert.deepEqual(paresDe([l("LLL", ["LL1", "LL2"])], [l("LL1")]), []);
  const muchos = ["A", "B", "C", "D"].map((x) => l(x.repeat(3)));
  const otros = ["E", "F", "G", "H"].map((x) => l(x.repeat(3)));
  assert.equal(paresDe(muchos, otros).length, PARES);
});

test("con fechas fijas también se miran tres días a cada lado: dos peticiones por par", async () => {
  const fuente = transporteInventado();
  const p = await buscarTransporte(SIN_AEROPUERTOS, fuente);
  assert.equal(SIN_AEROPUERTOS.dates.flexible, false);
  assert.deepEqual(codigos(p.salida), ["OOO"]);
  assert.deepEqual(codigos(p.llegada), ["VVV", "XXX"]);
  assert.deepEqual(
    p.pares.map((x) => [x.de, x.a, x.fechas, x.alrededor]),
    [
      ["OOO", "VVV", "prices", "prices"],
      ["OOO", "XXX", "prices", "prices"],
    ],
  );
  assert.equal(DIAS_ALREDEDOR, 3);
  assert.equal(p.dias, 3);
  assert.equal(p.peticiones, 4);
  assert.ok(p.peticiones <= PETICIONES_DE_TRANSPORTE);
  assert.equal(fuente.pedidos.filter((x) => x.como !== "lugares").length, 4);
  // El mercado es el del país de salida, y la moneda, la del viajero.
  assert.deepEqual(
    { mercado: fuente.pedidos[1].t?.mercado, moneda: fuente.pedidos[1].t?.moneda },
    { mercado: "yy", moneda: "EUR" },
  );
  for (const v of p.opciones) assert.ok(v.visto !== "" && v.precio > 0 && v.pasajeros === 1);
  assert.deepEqual(p.avisos, []);
  // Por par: el de las fechas, el de un día antes y el de tres días después; el de dos escalas queda fuera, y el de
  // cuatro días, también.
  assert.equal(p.opciones.length, 6);
  assert.equal(p.fuera.escalas, 2);
  assert.equal(p.opciones[0].precio, 70);
  assert.equal(p.opciones[0].sale.slice(0, 10), "2027-03-04");
  assert.ok(p.opciones.some((v) => v.sale.startsWith("2027-03-08")));
  assert.ok(!p.opciones.some((v) => v.sale.startsWith("2027-03-09")));
  // El transporte del viaje sigue siendo el de sus fechas: lo de al lado se ofrece, no se elige.
  const deLasSuyas = deLasFechas(p, "2027-03-05", "2027-03-08");
  assert.equal(deLasSuyas.length, 2);
  assert.equal(elTransporte(p.opciones, "EUR", "2027-03-05", "2027-03-08")?.precio, 160);
  assert.equal(elTransporte(p.opciones, "USD", "2027-03-05", "2027-03-08"), null);
  // Con precio para sus fechas, no hace falta ofrecer el de al lado.
  assert.equal(deAlLado(p, "EUR", "2027-03-05", "2027-03-08"), null);
  // Se puedan mover o no las fechas, la parrilla es la misma.
  const movibles = await buscarTransporte(
    { ...SIN_AEROPUERTOS, dates: { ...SIN_AEROPUERTOS.dates, flexible: true } },
    transporteInventado(),
  );
  assert.deepEqual(movibles.opciones, p.opciones);
  // Lo que sale antes del primer día en que se puede viajar no vale.
  const pronto = await buscarTransporte(SIN_AEROPUERTOS, transporteInventado(), { desde: "2027-03-05" });
  assert.equal(pronto.fuera.antes, 2);
});

test("sin precio para las fechas, se ofrece el más barato de los días de al lado, sin ponerlo como suyo", () => {
  const vuelo = (sale: string, vuelve: string, precio: number, moneda = "EUR"): Vuelo => ({
    ...vueloInventado(sale, vuelve),
    precio,
    moneda,
  });
  const opciones = [
    vuelo("2027-03-04", "2027-03-07", 90),
    vuelo("2027-03-06", "2027-03-09", 80),
    vuelo("2027-03-06", "2027-03-09", 40, "USD"),
  ];
  const l = deAlLado({ opciones }, "EUR", "2027-03-05", "2027-03-08");
  assert.equal(l?.precio, 80);
  assert.equal(elTransporte(opciones, "EUR", "2027-03-05", "2027-03-08"), null);
  assert.equal(deAlLado({ opciones: [] }, "EUR", "2027-03-05", "2027-03-08"), null);
});

test("una fuente sin días de alrededor: una petición por par, y lo de las fechas", async () => {
  const fuente = transporteInventado({ semana: false });
  const p = await buscarTransporte(SIN_AEROPUERTOS, fuente);
  assert.equal(p.dias, 0);
  assert.equal(p.peticiones, 2);
  assert.ok(p.pares.every((x) => x.alrededor === "not_asked"));
});

test("una fuente que no contesta no para nada: se dice, y lo que contestó no se guarda", async () => {
  const p = await buscarTransporte(ENTENDIDO, transporteInventado({ falla: true }));
  assert.deepEqual(p.opciones, []);
  assert.deepEqual(p.avisos, ["sin transporte: la fuente no contesta"]);
  assert.ok(!JSON.stringify(p).includes("un trozo"));
  // Sin sus lugares, y sin aeropuertos dichos, no hay de dónde salir.
  const sinLugares = await buscarTransporte(SIN_AEROPUERTOS, transporteInventado({ falla: true }));
  assert.deepEqual(sinLugares.pares, []);
  assert.ok(sinLugares.avisos.includes("transporte: la fuente no dice sus aeropuertos"));
});

test("fechas sin precio: la parrilla se hace igual, vacía, y lo dice", async () => {
  const p = await buscarTransporte(ENTENDIDO, transporteInventado({ vacia: true }));
  assert.equal(p.pares[0].fechas, "none");
  assert.deepEqual(p.opciones, []);
  assert.deepEqual(p.avisos, ["transporte: no hay ningún precio guardado para esas fechas"]);
});

test("sin origen no se pide nada a la fuente", async () => {
  const fuente = transporteInventado();
  const p = await buscarTransporte({ ...SIN_AEROPUERTOS, origin: null }, fuente);
  assert.equal(fuente.pedidos.length, 0);
  assert.equal(p.peticiones, 0);
  assert.match(p.avisos[0], /no se sabe de dónde se sale/);
});

test("el punto de salida va redondeado a una décima: la puerta 1 no deja pasar uno que diga más", () => {
  const r = respuestasDe(
    { nombre: "Villa", pais: "ZZ", clase: "city", centro: { lat: 10, lon: 20 }, caja: null },
    { entrada: "2027-03-05", salida: "2027-03-08" },
    { idioma: "es", moneda: "EUR" },
  );
  r.origen = { nombre: "Origen", pais: "YY", centro: { lat: 40.4168, lon: -3.7038 } };
  const e = entendidoDe(r).entendido!;
  assert.deepEqual(e.origin?.centre, { lat: 40.4, lon: -3.7 });
  assert.equal(e.origin?.airport, null);
  assert.equal(respuestasDeLoEntendido(e, []).origen?.centro?.lat, 40.4);
  // Sin punto, no va: la casa busca su ciudad por el nombre.
  r.origen = { nombre: "Origen", pais: "YY" };
  assert.equal(entendidoDe(r).entendido?.origin?.centre, undefined);
  r.origen = { nombre: "Origen", pais: "YY", centro: { lat: 400, lon: 0 } };
  assert.equal(entendidoDe(r).entendido?.origin?.centre, undefined);

  const conPunto = (centre: unknown) => ({ ...ENTENDIDO, origin: { ...ENTENDIDO.origin, centre } });
  assert.equal(puertaEntendido(conPunto({ lat: 40.4, lon: -3.7 })).verde, true);
  const exacto = puertaEntendido(conPunto({ lat: 40.4168, lon: -3.7 }));
  assert.deepEqual(
    exacto.rojos.map((x) => x.donde),
    ["origin.centre"],
  );
  assert.deepEqual(
    puertaEntendido(conPunto({ lat: "x" })).rojos.map((x) => x.donde),
    ["origin.centre"],
  );
});

/** Lleva una investigación inventada hasta el final, haciendo trabajar a cada asiento que espera. */
async function investiga(run: string, fuentes: () => Fuentes): Promise<Estado> {
  let estado = await sigue(run, fuentes());
  for (let i = 0; i < 30 && estado.esperan.length > 0; i++) {
    for (const id of estado.esperan) trabaja(run, id);
    estado = await sigue(run, fuentes());
  }
  return estado;
}

test("la investigación encuentra sola los aeropuertos y lleva el transporte a la tabla y al viaje", async () => {
  const fuente = transporteInventado();
  const run = runNuevo({ ...SIN_AEROPUERTOS, dates: { ...SIN_AEROPUERTOS.dates, flexible: true } });
  try {
    const estado = await investiga(run, () => ({ ...fuentesInventadas(), transporte: fuente }));
    assert.equal(estado.hecho, true);
    const b = leerJson(join(run, "busqueda.json")) as { vuelos: unknown[]; transporte: Parrilla; avisos: string[] };
    assert.equal(b.transporte.pares.length, 2);
    assert.equal(b.vuelos.length, 2);
    assert.ok(b.transporte.opciones.length > b.vuelos.length);
    const tabla = leerJson(join(run, "tabla-1.json")) as Tabla;
    // El precio guardado es el de un billete: en la tabla va para los dos que viajan.
    assert.ok(tabla.rows.every((r) => r.transport_total === 320));
    const viaje = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(viaje), []);
    assert.equal(viaje.transportes.length, 1);
    assert.deepEqual([viaje.transportes[0].de, viaje.transportes[0].a], ["OOO", "VVV"]);
    // Las palancas de los días piden los mismos aeropuertos, y ven lo que la parrilla ya tenía de esos días.
    const movidos = leerJson(join(run, "movidos.json")) as unknown as { dias: number; transporte: number | null }[];
    assert.equal(movidos.find((m) => m.dias === -1)?.transporte, 140);
    const palancas = fuente.pedidos.filter((x) => x.como === "fechas").slice(2);
    assert.ok(palancas.length > 0 && palancas.every((x) => x.t?.origen === "OOO" && x.t?.destino === "VVV"));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("sin fuente de transporte, el viaje se hace igual, sin transporte, y lo dice", async () => {
  const run = runNuevo();
  try {
    const estado = await investiga(run, () => ({ ...fuentesInventadas(), transporte: undefined }));
    assert.equal(estado.hecho, true);
    const b = leerJson(join(run, "busqueda.json")) as { avisos: string[]; transporte: null };
    assert.equal(b.transporte, null);
    assert.ok(b.avisos.includes("transporte: no se busca, porque no hay fuente de transporte"));
    assert.equal((leerJson(join(run, "viaje.json")) as Viaje).transportes.length, 0);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("el vuelo inventado sigue siendo el de las fechas que se le piden", () => {
  assert.equal(vueloInventado("2027-03-04", "2027-03-07").precio, 100);
});

test("sin precio para las fechas, el viaje dice el de un día de al lado, y no lo suma a nada", async () => {
  const base = transporteInventado();
  const fuente = { ...base, fechas: async () => [] };
  const run = runNuevo(SIN_AEROPUERTOS);
  try {
    const estado = await investiga(run, () => ({ ...fuentesInventadas(), transporte: fuente }));
    assert.equal(estado.hecho, true);
    const tabla = leerJson(join(run, "tabla-1.json")) as Tabla;
    assert.ok(tabla.rows.every((r) => r.transport === null));
    assert.ok(tabla.notes.some((n) => n.startsWith("transport: on days next to these") && n.includes("2027-03-04")));
    const viaje = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(viaje), []);
    assert.equal(viaje.transportes.length, 0);
    // El más barato de al lado, un día antes, para los dos que viajan, y guardado.
    assert.equal(viaje.transporteAlLado?.sale.slice(0, 10), "2027-03-04");
    assert.equal(viaje.transporteAlLado?.precio.total, 140);
    assert.ok(viaje.maneras.every((m) => m.transporte === null));
    // Que no es de sus fechas lo comprueba el código.
    const mal = {
      ...viaje,
      transporteAlLado: { ...viaje.transporteAlLado!, sale: viaje.entrada, vuelve: viaje.salida },
    };
    assert.ok(comprobarViaje(mal).some((p) => p.donde === "transporteAlLado"));
    const lejos = { ...viaje, transporteAlLado: { ...viaje.transporteAlLado!, sale: "2027-03-01" } };
    assert.ok(comprobarViaje(lejos).some((p) => p.donde === "transporteAlLado"));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("las palancas de los días no vuelven a pedir lo que la parrilla ya tiene de esos días", async () => {
  const fuente = transporteInventado();
  const p = await buscarTransporte(SIN_AEROPUERTOS, fuente);
  const elegido = elTransporte(p.opciones, "EUR", "2027-03-05", "2027-03-08")!;
  const movidos = vuelosMovidos(SIN_AEROPUERTOS, fuente, elegido, p);
  const antes = fuente.pedidos.length;
  // Un día antes ya está en la parrilla: no se pide.
  assert.equal((await movidos("2027-03-04", "2027-03-07"))[0].precio, 70);
  assert.equal(fuente.pedidos.length, antes);
  // Dos días antes no está: se pide, para esas fechas y esos aeropuertos.
  await movidos("2027-03-03", "2027-03-06");
  assert.equal(fuente.pedidos.length, antes + 1);
  assert.deepEqual(fuente.pedidos.at(-1)?.t?.ida, "2027-03-03");
});
