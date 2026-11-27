// El primer vistazo y su freno, con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CANDIDATOS_QUE_BASTAN, ESCALERA_DE_MINIMOS, RADIO_MAXIMO } from "../../agent/data/cribas.ts";
import { PRECIOS_DEL_VISTAZO } from "../../agent/data/vistazo.ts";
import { puertaEntendido } from "../../agent/gates/puerta_entendido.ts";
import { Frenado, frenoDelVistazo } from "../../agent/launcher/freno.ts";
import { comprobarVistazo, type Vistazo } from "../../agent/output/viaje.ts";
import { respuestasDe } from "../../agent/scripts/empezar.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import {
  claveDelVistazo,
  FalloDelVistazo,
  paraElVistazo,
  partir,
  pedidosDe,
  primerVistazo,
  trozoDe,
  type FuentesDelVistazo,
} from "../../agent/scripts/vistazo.ts";
import { lugaresDelViaje, paresDe } from "../../agent/scripts/transporte.ts";
import type { Alojamiento, FuenteAlojamiento } from "../../agent/tools/fuentes/tipos.ts";
import { fuentesInventadas } from "../cases/inventado/asientos.ts";
import { fuenteInventada, VISTO } from "../cases/inventado/inventado.ts";
import { ENTENDIDO, transporteInventado } from "../cases/inventado/investigacion.ts";

const RAPIDO = { lista: 200, precios: 200, vuelos: 200 };
const nunca = <T>(): Promise<T> => new Promise<T>(() => undefined);

test("el vistazo inventado: lo que hay, lo que pasa y desde cuánto, por zonas, y los días para volar", async () => {
  const v = await primerVistazo(ENTENDIDO, fuentesInventadas(), RAPIDO);
  assert.deepEqual(comprobarVistazo(v), []);
  assert.equal(v.devueltos, 10);
  // Con los mínimos de partida pasan siete, que no bastan: se bajan un escalón aquí mismo, sin volver a pedir.
  assert.ok(CANDIDATOS_QUE_BASTAN > 7);
  assert.deepEqual(v.minimos, ESCALERA_DE_MINIMOS[1]);
  assert.equal(v.bajados, true);
  assert.equal(v.ensanchado, false);
  assert.equal(v.pasan, 8);
  assert.equal(v.mirados, 8);
  assert.equal(v.conPrecio, 6);
  // El más barato, con lo que se paga aparte: 180 y 6.
  assert.equal(v.desde, 186);
  assert.equal(v.moneda, "EUR");
  assert.equal(v.aMedias, false);
  assert.equal(v.puntos.length, 8);
  assert.ok(v.puntos.slice(0, 6).every((p) => p.precio !== null));
  // Dos barrios, dos zonas: la del puerto con siete y la vieja con tres.
  assert.deepEqual(v.zonas!.map((z) => z.devueltos).sort(), [3, 7]);
  const vieja = v.zonas!.find((z) => z.devueltos === 3)!;
  assert.ok(Math.abs(vieja.punto.lon - 20.011) < 0.001);
  assert.deepEqual(v.vuelos, {
    origen: "OOO",
    destino: "VVV",
    // Con los aeropuertos dichos no se piden los lugares a la fuente: su nombre es su código.
    nombres: { origen: "OOO", destino: "VVV" },
    mes: "2027-03",
    // Solo tres días antes y tres después de tu fecha (el PM, 27-nov).
    desde: "2027-03-02",
    hasta: "2027-03-08",
    noches: 3,
    moneda: "EUR",
    fuente: "inventada",
    visto: VISTO,
    dias: [
      { dia: "2027-03-02", precio: 90 },
      { dia: "2027-03-05", precio: 100 },
      { dia: "2027-03-06", precio: 160 },
    ],
  });
});

test("el vistazo no pide ni detalle ni opiniones, y el precio, de unos pocos y en tandas", async () => {
  const pedido: string[] = [];
  const muchos: Alojamiento[] = Array.from({ length: 180 }, (_, i) => ({
    fuente: "inventada",
    visto: VISTO,
    id: `m${i}`,
    nombre: `Alojamiento ${i}`,
    lat: 10 + (i % 10) * 0.001,
    lon: 20 + (i % 7) * 0.001,
    nota: 9,
    opiniones: 300 + i,
    estrellas: 4,
    tipo: "hotel",
  }));
  const fuente: FuenteAlojamiento = {
    nombre: "inventada",
    lista: async () => (pedido.push("lista"), muchos),
    precios: async (ids) => (pedido.push(`precios:${ids.length}`), []),
    detalle: async () => (pedido.push("detalle"), nunca()),
    opiniones: async () => (pedido.push("opiniones"), nunca()),
  };
  const v = await primerVistazo(ENTENDIDO, { alojamiento: fuente }, RAPIDO);
  assert.deepEqual(pedido, ["lista", "precios:25", "precios:25", "precios:25", "precios:25"]);
  assert.equal(v.mirados, PRECIOS_DEL_VISTAZO);
  assert.equal(v.pasan, 180);
  assert.equal(v.conPrecio, 0);
  assert.equal(v.desde, null);
  assert.equal(v.bajados, false);
  assert.equal(v.vuelos, null);
  assert.deepEqual(comprobarVistazo(v), []);
});

test("la caja del destino, en zonas: una sola lista si cabe en el radio más ancho, y una por zona si no", () => {
  const ciudad = pedidosDe(partir(ENTENDIDO.destination.box));
  assert.equal(ciudad.length, 1);
  assert.ok(ciudad[0].radio > 1000 && ciudad[0].radio <= RADIO_MAXIMO);
  const pais = pedidosDe(partir({ west: -9, south: 36, east: 3, north: 44 }));
  assert.equal(pais.length, 9);
  assert.ok(pais.every((p) => p.radio === RADIO_MAXIMO));
  // Una caja que cruza el meridiano 180: lo de los dos lados cae en sus zonas, y lo de fuera, en ninguna.
  const isla = partir({ west: 178, south: -19, east: -178, north: -15 });
  assert.equal(trozoDe({ lat: -17, lon: 179.5 }, isla)?.id, "z5");
  assert.equal(trozoDe({ lat: -18.9, lon: -178.1 }, isla)?.id, "z9");
  assert.equal(trozoDe({ lat: -17, lon: 170 }, isla), null);
  assert.ok(pedidosDe(isla).every((p) => p.centro.lon >= -180 && p.centro.lon <= 180));
});

test("si la fuente no contesta, no hay vistazo; si contesta a medias, se dice", async () => {
  const rota: FuentesDelVistazo = {
    alojamiento: { ...fuenteInventada(), lista: async () => Promise.reject(new Error("x")) },
  };
  await assert.rejects(
    primerVistazo(ENTENDIDO, rota, RAPIDO),
    (e) => e instanceof FalloDelVistazo && e.message === "no_sources",
  );
  const lenta: FuentesDelVistazo = { alojamiento: { ...fuenteInventada(), lista: nunca } };
  await assert.rejects(
    primerVistazo(ENTENDIDO, lenta, RAPIDO),
    (e) => e instanceof FalloDelVistazo && e.message === "too_slow",
  );

  // Los precios que no llegan a tiempo: el vistazo sale igual, sin «desde», y va a medias.
  const sinPrecios = { ...fuentesInventadas(), alojamiento: { ...fuenteInventada(), precios: nunca } };
  const v = await primerVistazo(ENTENDIDO, sinPrecios, RAPIDO);
  assert.equal(v.aMedias, true);
  assert.equal(v.conPrecio, 0);
  assert.equal(v.mirados, 0);
  assert.equal(v.desde, null);
  assert.deepEqual(comprobarVistazo(v), []);

  // En un país, una zona que falla no tumba a las demás.
  let n = 0;
  const unaFalla: FuentesDelVistazo = {
    alojamiento: { ...fuenteInventada(), lista: async () => (n++ === 0 ? Promise.reject(new Error("x")) : []) },
  };
  const grande: Entendido = {
    ...ENTENDIDO,
    destination: { ...ENTENDIDO.destination, kind: "country", box: { west: -9, south: 36, east: 3, north: 44 } },
  };
  const p = await primerVistazo(grande, unaFalla, RAPIDO);
  assert.equal(p.aMedias, true);
  assert.equal(p.devueltos, 0);
});

test("los días para volar: de alrededor de tu fecha, en su moneda y el más barato de cada día", async () => {
  const transporte = transporteInventado();
  transporte.diasBaratos = async (t, mes) => {
    transporte.pedidos.push({ como: "dias", t });
    return [
      { fuente: "inventada", visto: VISTO, dia: `${mes}-03`, precio: 80, moneda: "USD" },
      { fuente: "inventada", visto: VISTO, dia: "2027-04-01", precio: 70, moneda: "EUR" },
      { fuente: "inventada", visto: VISTO, dia: `${mes}-04`, precio: 0, moneda: "EUR" },
      { fuente: "inventada", visto: VISTO, dia: `${mes}-07`, precio: 120, moneda: "EUR" },
      { fuente: "inventada", visto: "2027-01-01T00:00:00Z", dia: `${mes}-07`, precio: 110, moneda: "EUR" },
      // A más de tres días de tu fecha (el 5): no sale, aunque sea más barato.
      { fuente: "inventada", visto: VISTO, dia: `${mes}-20`, precio: 40, moneda: "EUR" },
    ];
  };
  const v = await primerVistazo(ENTENDIDO, { alojamiento: fuenteInventada(), transporte }, RAPIDO);
  assert.deepEqual(v.vuelos?.dias, [{ dia: "2027-03-07", precio: 110 }]);
  // El día en que se vio es el más antiguo: el precio es de entonces.
  assert.equal(v.vuelos?.visto, "2027-01-01T00:00:00Z");
  // Una sola petición de precios, con los aeropuertos dichos, y sin pedir los lugares, que no hacen falta.
  assert.deepEqual(
    transporte.pedidos.map((p) => p.como),
    ["dias"],
  );
  assert.deepEqual(transporte.pedidos[0].t, {
    origen: "OOO",
    destino: "VVV",
    ida: "2027-03",
    vuelta: null,
    moneda: "EUR",
    mercado: "yy",
  });
});

test("los días para volar salen de los aeropuertos de la búsqueda de transporte: el par principal", async () => {
  // Sin aeropuertos dichos: se sale por el punto (o por el nombre de la ciudad) y se llega por el más cercano.
  const sinAeropuertos: Entendido = {
    ...ENTENDIDO,
    origin: { name: "Pueblo Sin Aeropuerto", country: "YY", airport: null, centre: { lat: 40.1, lon: -3 } },
    destination: { ...ENTENDIDO.destination, airport: null },
  };
  const transporte = transporteInventado();
  const v = await primerVistazo(sinAeropuertos, { alojamiento: fuenteInventada(), transporte }, RAPIDO);
  assert.deepEqual(comprobarVistazo(v), []);
  assert.equal(v.vuelos?.origen, "OOO");
  assert.equal(v.vuelos?.destino, "VVV");
  assert.deepEqual(v.vuelos?.nombres, { origen: "Origen Inventado", destino: "Villa Inventada" });
  assert.deepEqual(
    transporte.pedidos.map((p) => p.como),
    ["lugares", "dias"],
  );
  // Son los mismos que pide la parrilla primero.
  const { salida, llegada } = await lugaresDelViaje(sinAeropuertos, transporte);
  assert.deepEqual(paresDe(salida, llegada)[0], ["OOO", "VVV"]);
  // Por el nombre de la ciudad, sin punto.
  const porNombre: Entendido = {
    ...sinAeropuertos,
    origin: { name: "Pueblo Sin Aeropuerto", country: "YY", airport: null },
  };
  const n = await primerVistazo(
    porNombre,
    { alojamiento: fuenteInventada(), transporte: transporteInventado() },
    RAPIDO,
  );
  assert.equal(n.vuelos?.origen, "OOO");
});

test("los días para volar: sin saber de dónde se sale, sin fuente o si tarda, no salen y no se espera", async () => {
  const transporte = transporteInventado();
  const f: FuentesDelVistazo = { alojamiento: fuenteInventada(), transporte };
  assert.equal((await primerVistazo({ ...ENTENDIDO, origin: null }, f, RAPIDO)).vuelos, null);
  assert.equal(transporte.pedidos.length, 0);
  // Un sitio que la fuente no sabe dónde está: no hay aeropuerto de salida, y no se piden precios.
  const perdido: Entendido = { ...ENTENDIDO, origin: { name: "Ningún Sitio", country: "YY", airport: null } };
  assert.equal((await primerVistazo(perdido, f, RAPIDO)).vuelos, null);
  assert.deepEqual(
    transporte.pedidos.map((p) => p.como),
    ["lugares"],
  );
  // Se sale y se llega por el mismo sitio: no hay vuelo que buscar.
  const mismo: Entendido = { ...ENTENDIDO, destination: { ...ENTENDIDO.destination, airport: "OOO" } };
  assert.equal((await primerVistazo(mismo, f, RAPIDO)).vuelos, null);
  assert.equal(transporte.pedidos.filter((p) => p.como === "dias").length, 0);
  // Sin fuente de transporte, o una que no sabe dar días baratos.
  assert.equal((await primerVistazo(ENTENDIDO, { alojamiento: fuenteInventada() }, RAPIDO)).vuelos, null);
  const sinDias = { ...transporteInventado(), diasBaratos: undefined };
  assert.equal((await primerVistazo(ENTENDIDO, { ...f, transporte: sinDias }, RAPIDO)).vuelos, null);
  // Si falla, o no tiene precios, o tarda (también al dar sus lugares), el vistazo sale igual, sin vuelos.
  for (const rota of [transporteInventado({ falla: true }), transporteInventado({ vacia: true })])
    assert.equal((await primerVistazo(ENTENDIDO, { ...f, transporte: rota }, RAPIDO)).vuelos, null);
  const lenta = { ...transporteInventado(), diasBaratos: nunca };
  assert.equal((await primerVistazo(ENTENDIDO, { ...f, transporte: lenta }, RAPIDO)).vuelos, null);
  const lugaresLentos = { ...transporteInventado(), lugares: nunca };
  const sinAeropuerto: Entendido = { ...ENTENDIDO, destination: { ...ENTENDIDO.destination, airport: null } };
  const inicio = Date.now();
  const v = await primerVistazo(sinAeropuerto, { ...f, transporte: lugaresLentos }, RAPIDO);
  assert.equal(v.vuelos, null);
  assert.ok(Date.now() - inicio < 2000);
});

test("lo que se pide para el vistazo sale de lo que se ha dicho, con lo más probable en lo demás", () => {
  const destino = {
    nombre: "Villa Inventada",
    pais: "ZZ",
    clase: "city" as const,
    centro: ENTENDIDO.destination.centre,
    caja: ENTENDIDO.destination.box,
  };
  const r = respuestasDe(destino, { entrada: "2027-03-05", salida: "2027-03-08" }, { idioma: "es", moneda: null });
  const e = paraElVistazo(r, "ES")!;
  assert.ok(puertaEntendido(e, { hoy: "2027-01-01" }).verde);
  assert.equal(e.currency, "EUR");
  assert.deepEqual(e.travellers.passports, ["ES", "ES"]);
  assert.equal(e.travellers.adults, 2);
  // Sin país del navegador, el del destino; y su moneda, si la tiene. Este no tiene: sin moneda no hay vistazo.
  assert.equal(paraElVistazo(r, null), null);
  assert.deepEqual(paraElVistazo({ ...r, moneda: "EUR" }, null)?.travellers.passports, ["ZZ", "ZZ"]);
  // Lo que se dijo manda: de dónde sale, la moneda.
  const dicho = { ...r, origen: { nombre: "Origen", pais: "FR" }, moneda: "USD" };
  assert.equal(paraElVistazo(dicho, "ES")?.currency, "USD");
  assert.deepEqual(paraElVistazo(dicho, "ES")?.travellers.passports, ["FR", "FR"]);
  // Una edad de niño sin decir no se supone.
  assert.equal(paraElVistazo({ ...r, ninos: [null] }, "ES"), null);
});

test("la clave del vistazo cambia con el grupo y las fechas, y no con el gasto ni con lo que busca", () => {
  const otro = { ...ENTENDIDO, budget: "comfortable" as const, looking_for: ["otra cosa"] };
  assert.equal(claveDelVistazo(otro), claveDelVistazo(ENTENDIDO));
  const mas = { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, adults: 3 } };
  assert.notEqual(claveDelVistazo(mas), claveDelVistazo(ENTENDIDO));
  const fechas = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_out: "2027-03-09" } };
  assert.notEqual(claveDelVistazo(fechas), claveDelVistazo(ENTENDIDO));
});

test("la clave del vistazo cambia si cambia de dónde se sale, y no por cómo se escribe", () => {
  const base: Entendido = { ...ENTENDIDO, origin: { name: "Pueblo Sin Aeropuerto", country: "YY", airport: null } };
  const clave = claveDelVistazo(base);
  assert.notEqual(claveDelVistazo({ ...base, origin: null }), clave);
  assert.notEqual(claveDelVistazo({ ...base, origin: { ...base.origin!, name: "Otro Pueblo" } }), clave);
  assert.notEqual(claveDelVistazo({ ...base, origin: { ...base.origin!, country: "XX" } }), clave);
  assert.notEqual(claveDelVistazo({ ...base, origin: { ...base.origin!, airport: "OOO" } }), clave);
  const conPunto = { ...base, origin: { ...base.origin!, centre: { lat: 40.1, lon: -3 } } };
  assert.notEqual(claveDelVistazo(conPunto), clave);
  assert.notEqual(
    claveDelVistazo({ ...base, origin: { ...base.origin!, centre: { lat: 40.2, lon: -3 } } }),
    claveDelVistazo(conPunto),
  );
  assert.equal(claveDelVistazo({ ...base, origin: { ...base.origin!, name: "  pueblo sin AEROPUERTO " } }), clave);
});

test("la web vuelve a pedir el vistazo al elegir de dónde se sale: su clave cambia", () => {
  const destino = {
    nombre: "Villa Inventada",
    pais: "ZZ",
    clase: "city" as const,
    centro: ENTENDIDO.destination.centre,
    caja: ENTENDIDO.destination.box,
  };
  const r = respuestasDe(destino, { entrada: "2027-03-05", salida: "2027-03-08" }, { idioma: "es", moneda: "EUR" });
  const sin = claveDelVistazo(paraElVistazo(r, "YY")!);
  const elegido = { ...r, origen: { nombre: "Origen Inventado", pais: "YY", centro: { lat: 40.04, lon: -3.01 } } };
  const e = paraElVistazo(elegido, "YY")!;
  assert.deepEqual(e.origin?.centre, { lat: 40, lon: -3 });
  assert.notEqual(claveDelVistazo(e), sin);
});

test("lo que comprueba el código de un vistazo antes de dárselo a la web", async () => {
  const bueno = await primerVistazo(ENTENDIDO, fuentesInventadas(), RAPIDO);
  const mal = (cambio: (v: Vistazo) => void): string[] => {
    const v = structuredClone(bueno);
    cambio(v);
    return comprobarVistazo(v).map((p) => p.que);
  };
  assert.ok(mal((v) => (v.pasan = v.devueltos + 1)).includes("pasan más de los que hay"));
  assert.ok(mal((v) => (v.desde = null)).includes("el «desde» no casa con los que tienen precio"));
  assert.ok(mal((v) => (v.puntos[0].punto.lat = 99)).includes("no está en el mapa"));
  assert.ok(mal((v) => (v.zonas![0].devueltos += 1)).includes("las zonas no suman lo que dice el vistazo"));
  assert.ok(mal((v) => (v.vuelos!.dias[0].dia = "2027-03-20")).includes("el día no es de los que se miran"));
  // Un vistazo de antes, sin «desde» ni «hasta», mira el mes entero.
  assert.ok(
    mal((v) => {
      delete v.vuelos!.desde;
      delete v.vuelos!.hasta;
      v.vuelos!.dias[0].dia = "2027-04-01";
    }).includes("el día no es de los que se miran"),
  );
  assert.ok(mal((v) => v.vuelos!.dias.reverse()).includes("los días no van en orden"));
  assert.ok(mal((v) => (v.mirados = 1)).length > 0);
});

test("el freno: la memoria contesta sin buscar, y lo nuevo tiene tope en la casa, por cliente y a la vez", async () => {
  let ahora = Date.parse("2027-01-01T00:00:00Z");
  const freno = frenoDelVistazo(
    { porVentana: 3, porCliente: 2, minutosDeVentana: 10, aLaVez: 1, minutosEnMemoria: 5, enMemoria: 2 },
    () => new Date(ahora),
  );
  let buscadas = 0;
  const busca = async (): Promise<number> => ++buscadas;
  assert.deepEqual(await freno.pedir("a", "cliente-uno", busca), { valor: 1, deMemoria: false });
  assert.deepEqual(await freno.pedir("a", "cliente-uno", busca), { valor: 1, deMemoria: true });
  assert.equal(buscadas, 1);
  await freno.pedir("b", "cliente-uno", busca);
  // El mismo cliente ya ha buscado dos nuevas en la ventana: la tercera espera.
  await assert.rejects(freno.pedir("c", "cliente-uno", busca), (e) => e instanceof Frenado && e.espera === 600);
  // Otro cliente puede, hasta el tope de toda la casa.
  await freno.pedir("c", "cliente-dos", busca);
  await assert.rejects(freno.pedir("d", null, busca), (e) => e instanceof Frenado);
  assert.equal(freno.nuevos(), 3);
  // Lo de la memoria no cuenta para el tope.
  assert.equal((await freno.pedir("c", "cliente-tres", busca)).deMemoria, true);
  // Pasada la ventana, se puede otra vez; y pasada la vida de la memoria, se vuelve a buscar.
  ahora += 11 * 60_000;
  assert.deepEqual(await freno.pedir("a", null, busca), { valor: 4, deMemoria: false });
});

test("el freno: lo que ya se busca no se repite, lo que falla no se guarda, y hay un tope a la vez", async () => {
  const freno = frenoDelVistazo({ porVentana: 10, porCliente: 10, aLaVez: 1 });
  let suelta = (): void => undefined;
  let buscadas = 0;
  const lenta = (): Promise<string> =>
    new Promise((r) => {
      buscadas++;
      suelta = () => r("hecho");
    });
  const una = freno.pedir("a", null, lenta);
  const otra = freno.pedir("a", null, lenta);
  await assert.rejects(freno.pedir("b", null, lenta), (e) => e instanceof Frenado);
  suelta();
  assert.deepEqual(await una, { valor: "hecho", deMemoria: false });
  assert.deepEqual(await otra, { valor: "hecho", deMemoria: true });
  assert.equal(buscadas, 1);
  await assert.rejects(freno.pedir("c", null, async () => Promise.reject(new Error("x"))));
  assert.deepEqual(await freno.pedir("c", null, async () => "bien"), { valor: "bien", deMemoria: false });
});

test("si los tres días de alrededor caen en otro mes, se pide también ese mes", async () => {
  const transporte = transporteInventado();
  const meses: string[] = [];
  transporte.diasBaratos = async (_t, mes) => {
    meses.push(mes);
    const dia = (d: string, precio: number) => ({ fuente: "inventada", visto: VISTO, dia: d, precio, moneda: "EUR" });
    return mes === "2027-02" ? [dia("2027-02-26", 70), dia("2027-02-20", 30)] : [dia("2027-03-02", 90)];
  };
  const alPrincipio: Entendido = {
    ...(ENTENDIDO as Entendido),
    dates: { ...(ENTENDIDO as Entendido).dates, check_in: "2027-03-01", check_out: "2027-03-04" },
  };
  const v = await primerVistazo(alPrincipio, { alojamiento: fuenteInventada(), transporte }, RAPIDO);
  assert.deepEqual([...meses].sort(), ["2027-02", "2027-03"]);
  assert.deepEqual(v.vuelos?.dias, [
    { dia: "2027-02-26", precio: 70 },
    { dia: "2027-03-02", precio: 90 },
  ]);
  assert.deepEqual([v.vuelos?.desde, v.vuelos?.hasta], ["2027-02-26", "2027-03-04"]);
});
