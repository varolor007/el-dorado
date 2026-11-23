// Cada enchufe lee bien una respuesta con la forma de su fuente, y no se fía de lo que venga roto. Las respuestas son
// inventadas: tienen la forma de las de verdad y ningún dato de verdad.

import assert from "node:assert/strict";
import { test } from "node:test";
import { leerCalendario, leerVuelos, vistoEnEnlace, type Trayecto } from "../../agent/tools/fuentes/aviasales.ts";
import { encendida } from "../../agent/tools/fuentes/enchufes.ts";
import { clave, ErrorDeFuente, pedirJson, REINTENTOS, reloj } from "../../agent/tools/fuentes/http.ts";
import {
  cuerpoDePrecios,
  dentroDelRadio,
  direccionDeLista,
  leerCatalogo,
  leerDetalle,
  leerLista,
  leerOpiniones,
  leerPrecios,
  RADIO_MINIMO,
} from "../../agent/tools/fuentes/liteapi.ts";
import { cuerpoDeZona, leerOfertas } from "../../agent/tools/fuentes/parallel.ts";
import { ALOJAMIENTOS, ESTANCIA, MINIMOS, VISTO } from "../cases/inventado/inventado.ts";

test("LiteAPI: la lista, y lo que viene sin identificador o sin posición no entra", () => {
  const json = {
    data: [
      {
        id: "x1",
        name: "Hotel Uno Inventado",
        latitude: 10.1,
        longitude: 20.1,
        rating: 9.1,
        reviewCount: 300,
        stars: 4,
        hotelTypeId: 204,
      },
      { id: "x2", name: "Hotel Dos Inventado", latitude: 10.2, longitude: 20.2 },
      { name: "Sin identificador", latitude: 1, longitude: 1 },
      { id: "x4", name: "Sin posición" },
    ],
  };
  const lista = leerLista(json, VISTO);
  assert.equal(lista.length, 2);
  assert.deepEqual(lista[0], {
    fuente: "liteapi",
    visto: VISTO,
    id: "x1",
    nombre: "Hotel Uno Inventado",
    lat: 10.1,
    lon: 20.1,
    nota: 9.1,
    opiniones: 300,
    estrellas: 4,
    tipo: "204",
  });
  assert.equal(lista[1].nota, null);
  assert.deepEqual(leerLista({ error: "algo" }, VISTO), []);
  assert.deepEqual(leerLista("no es un objeto", VISTO), []);
});

test("LiteAPI: qué instalaciones declara cada alojamiento sale del catálogo de la propia fuente", () => {
  const catalogo = leerCatalogo({
    data: [
      { facility_id: 11, facility: "Fitness center" },
      { facility_id: 537, facility: "Free use of nearby fitness center" },
      { facility_id: 579, facility: "Billiards or pool table" },
      { facility_id: 832, facility: "Indoor/outdoor pool" },
      { facility_id: 5, facility: "Free WiFi" },
      { facility: "Sin número" },
    ],
  });
  assert.deepEqual(
    [...catalogo.entries()],
    [
      [11, "gym"],
      [832, "pool"],
    ],
  );
  const hotel = (id: string, facilityIds: unknown) => ({ id, name: id, latitude: 10, longitude: 20, facilityIds });
  const json = { data: [hotel("con", [5, 832, 11, 11]), hotel("cerca", [537, 579]), hotel("sin-lista", undefined)] };
  const [con, cerca, sinLista] = leerLista(json, VISTO, catalogo);
  assert.deepEqual(con.declara, ["gym", "pool"]);
  // Un gimnasio «cerca de aquí» y una mesa de billar no son un gimnasio ni una piscina.
  assert.deepEqual(cerca.declara, []);
  // Una lista vacía no dice que no tenga nada: no se sabe, y por ella no se descarta a nadie.
  assert.equal(leerLista({ data: [hotel("vacia", [])] }, VISTO, catalogo)[0].declara, undefined);
  // Si la fuente no manda sus servicios, o no se tiene su catálogo, no se sabe: no es lo mismo que no tener.
  assert.equal(sinLista.declara, undefined);
  assert.equal(leerLista(json, VISTO)[0].declara, undefined);
});

test("LiteAPI: de cada alojamiento, la tarifa más barata contando lo que se paga aparte", () => {
  const tarifa = (nombre: string, total: number, aparte: number, etiqueta: string) => ({
    name: nombre,
    mappedRoomId: 77,
    boardName: "Room Only",
    retailRate: {
      total: [{ amount: total, currency: "EUR" }],
      taxesAndFees: [
        { included: false, amount: aparte },
        { included: true, amount: 50 },
      ],
    },
    cancellationPolicies: { refundableTag: etiqueta },
  });
  const json = {
    data: [
      {
        hotelId: "x1",
        roomTypes: [{ rates: [tarifa("Cara", 300, 0, "RFN")] }, { rates: [tarifa("Barata", 200, 10, "NRFN")] }],
      },
      { hotelId: "x2", roomTypes: [] },
    ],
  };
  const precios = leerPrecios(json, ESTANCIA, VISTO);
  assert.equal(precios.length, 1);
  assert.equal(precios[0].habitacion, "Barata");
  assert.equal(precios[0].total, 200);
  assert.equal(precios[0].tasasAparte, 10);
  assert.equal(precios[0].cancelable, false);
  assert.equal(precios[0].idHabitacion, "77");
  assert.equal(precios[0].entrada, ESTANCIA.entrada);
  assert.equal(precios[0].adultos, ESTANCIA.adultos);
});

test("LiteAPI: la imagen de relleno de la fuente no es una foto, ni de la habitación ni del alojamiento", () => {
  const relleno = "https://fotos.invalid/rooms-large-pictures/room-placeholder.jpg";
  const json = {
    data: {
      id: "x1",
      rooms: [
        { id: 1, roomName: "Solo relleno", photos: [{ url: relleno, mainPhoto: true }] },
        { id: 2, roomName: "Con foto", photos: [{ url: relleno }, { url: "https://fotos.invalid/placeholder/a.jpg" }] },
      ],
      hotelImages: [{ url: "https://fotos.invalid/Placeholder.png?w=640" }, { url: "https://fotos.invalid/h.jpg" }],
    },
  };
  const d = leerDetalle(json, VISTO);
  assert.deepEqual(d.habitaciones[0].fotos, []);
  // Lo dice el nombre del archivo, no la carpeta: una foto de verdad en una carpeta con ese nombre se queda.
  assert.deepEqual(d.habitaciones[1].fotos, ["https://fotos.invalid/placeholder/a.jpg"]);
  assert.deepEqual(d.fotos, ["https://fotos.invalid/h.jpg"]);
});

test("LiteAPI: el detalle trae las habitaciones con sus metros y sus fotos, y los servicios sin repetir", () => {
  const json = {
    data: {
      id: "x1",
      rooms: [
        {
          id: 77,
          roomName: "Doble",
          roomSizeSquare: 24,
          bedTypes: [{ bedType: "Double bed", quantity: 1 }],
          photos: [{ url: "https://fotos.invalid/a.jpg" }, {}],
          views: [],
        },
        { roomName: "Sin identificador" },
      ],
      hotelImages: [{ url: "https://fotos.invalid/h.jpg" }],
      facilities: [{ name: "Fitness center" }],
      hotelFacilities: ["Fitness center", "Pool"],
      checkinCheckoutTimes: { checkin_start: "03:00 PM", checkout: "12:00 PM" },
      sentiment_analysis: { categories: [{ name: "Cleanliness", rating: 9.2 }], cons: ["Ruido"] },
    },
  };
  const d = leerDetalle(json, VISTO);
  assert.equal(d.habitaciones.length, 1);
  assert.deepEqual(d.habitaciones[0], {
    id: "77",
    nombre: "Doble",
    metros: 24,
    camas: ["1 x Double bed"],
    fotos: ["https://fotos.invalid/a.jpg"],
    vistas: [],
  });
  assert.deepEqual(d.fotos, ["https://fotos.invalid/h.jpg"]);
  assert.deepEqual(d.servicios, ["Fitness center", "Pool"]);
  assert.equal(d.entradaDesde, "03:00 PM");
  assert.equal(d.web, null);
  assert.deepEqual(d.contras, ["Ruido"]);
  assert.equal(leerDetalle({}, VISTO).habitaciones.length, 0);
});

test("LiteAPI: las opiniones, con lo bueno y lo malo aunque vengan vacíos", () => {
  const o = leerOpiniones({
    data: [
      { date: "2026-11-21T00:00:00Z", averageScore: 9, type: "couple", pros: "Bien", cons: "", source: "Inventada" },
      {},
    ],
  });
  assert.deepEqual(o[0], { fecha: "2026-11-21", nota: 9, viajero: "couple", bueno: "Bien", malo: "", de: "Inventada" });
  assert.deepEqual(o[1], { fecha: null, nota: null, viajero: null, bueno: "", malo: "", de: null });
});

test("LiteAPI: lo que se pide lleva los mínimos, las fechas y los niños", () => {
  const url = new URL(direccionDeLista(ESTANCIA, MINIMOS));
  assert.equal(url.searchParams.get("minRating"), "8.5");
  assert.equal(url.searchParams.get("minReviewsCount"), "200");
  assert.equal(url.searchParams.get("starRating"), "4,5");
  // Si no se piden estrellas, no se filtra por ellas: así vuelve también lo que no las lleva.
  const sinEstrellas = new URL(direccionDeLista(ESTANCIA, { ...MINIMOS, estrellas: 0 }));
  assert.equal(sinEstrellas.searchParams.has("starRating"), false);
  assert.equal(url.searchParams.get("radius"), "1500");
  // La fuente no acepta menos de mil metros: se le piden mil, y lo que cae más lejos de lo pedido se quita aquí.
  const corta = { ...ESTANCIA, radio: 500 };
  assert.equal(new URL(direccionDeLista(corta, MINIMOS)).searchParams.get("radius"), String(RADIO_MINIMO));
  const cerca = { ...ALOJAMIENTOS[0], lat: ESTANCIA.lat + 0.003, lon: ESTANCIA.lon };
  const lejos = { ...ALOJAMIENTOS[1], lat: ESTANCIA.lat + 0.008, lon: ESTANCIA.lon };
  assert.deepEqual(
    dentroDelRadio([cerca, lejos], corta).map((a) => a.id),
    [cerca.id],
  );
  assert.equal(dentroDelRadio([cerca, lejos], ESTANCIA).length, 2);
  const cuerpo = cuerpoDePrecios(["x1"], { ...ESTANCIA, ninos: [4, 9] });
  assert.deepEqual(cuerpo.occupancies, [{ adults: 2, children: [4, 9] }]);
  assert.equal(cuerpo.checkin, ESTANCIA.entrada);
  assert.deepEqual(cuerpoDePrecios(["x1"], ESTANCIA).occupancies, [{ adults: 2 }]);
});

const TRAYECTO: Trayecto = {
  origen: "AAA",
  destino: "BBB",
  ida: "2027-03-05",
  vuelta: "2027-03-08",
  moneda: "EUR",
  mercado: "es",
};

test("Aviasales: cada precio lleva el día en que se vio, que viene dentro del enlace", () => {
  assert.equal(vistoEnEnlace("/search/AAA0503BBB1?t=x&search_date=18112026&expected_price=20"), "2026-11-18");
  assert.equal(vistoEnEnlace("/search/sin-fecha"), null);
  assert.equal(vistoEnEnlace(null), null);
  const json = {
    data: [
      {
        price: 40,
        departure_at: "2027-03-05T10:00:00+01:00",
        return_at: "2027-03-08T18:00:00+01:00",
        airline: "ZZ",
        flight_number: 123,
        transfers: 0,
        return_transfers: 1,
        duration: 90,
        origin_airport: "AAA",
        destination_airport: "BBB",
        link: "/search/x?search_date=02012027",
      },
      { price: 55, departure_at: "2027-03-05T07:00:00+01:00" },
      { departure_at: "2027-03-05T07:00:00+01:00" },
    ],
  };
  const vuelos = leerVuelos(json, TRAYECTO, VISTO);
  assert.equal(vuelos.length, 2);
  assert.equal(vuelos[0].visto, "2027-01-02");
  assert.equal(vuelos[0].guardado, true);
  assert.equal(vuelos[0].numero, "123");
  assert.equal(vuelos[0].enlace, "https://www.aviasales.com/search/x?search_date=02012027");
  assert.equal(vuelos[1].visto, VISTO);
  assert.equal(vuelos[1].enlace, null);
  assert.deepEqual(leerVuelos({ data: [], success: true }, TRAYECTO, VISTO), []);
});

test("Aviasales: trampa: un enlace que sale de la web de la fuente no llega", () => {
  const vuelo = (link: string) => ({ price: 40, departure_at: "2027-03-05T10:00:00+01:00", link });
  const fuera = [
    "//reservas.invalid/pagar",
    "\\\\reservas.invalid\\pagar",
    "https://reservas.invalid/pagar",
    "https://www.aviasales.com.reservas.invalid/pagar",
    "http://www.aviasales.com/search/x",
    "//usuario:clave@www.aviasales.com/search/x",
    "javascript:alert(1)",
  ];
  const vuelos = leerVuelos({ data: fuera.map(vuelo) }, TRAYECTO, VISTO);
  // El vuelo se queda, con su precio: lo que no llega es el enlace que no es de la fuente.
  assert.equal(vuelos.length, fuera.length);
  fuera.forEach((link, i) => assert.equal(vuelos[i].enlace, null, link));
  // Con una arroba o un punto delante, pegado detrás de la web sería de otra máquina; resuelto contra ella, es un
  // camino dentro de la web de la fuente, y ahí se queda.
  const dentro = ["@reservas.invalid/pagar", ".reservas.invalid/pagar", "search/y?a=1"];
  assert.deepEqual(
    leerVuelos({ data: dentro.map(vuelo) }, TRAYECTO, VISTO).map((v) => v.enlace),
    [
      "https://www.aviasales.com/@reservas.invalid/pagar",
      "https://www.aviasales.com/.reservas.invalid/pagar",
      "https://www.aviasales.com/search/y?a=1",
    ],
  );
});

test("Aviasales: trampa: un día que no existe no es cuándo se vio; vale el momento en que se pidió", () => {
  assert.equal(vistoEnEnlace("/search/x?search_date=99999999"), null);
  assert.equal(vistoEnEnlace("/search/x?search_date=31022027"), null);
  assert.equal(vistoEnEnlace("/search/x?search_date=00002027"), null);
  assert.equal(vistoEnEnlace("/search/x?search_date=29022028"), "2028-02-29");
  const json = { data: [{ price: 40, departure_at: "2027-03-05T10:00:00+01:00", link: "/x?search_date=99999999" }] };
  const [vuelo] = leerVuelos(json, TRAYECTO, VISTO);
  assert.equal(vuelo.visto, VISTO);
  assert.equal(vuelo.enlace, "https://www.aviasales.com/x?search_date=99999999");
});

test("Aviasales: los días baratos del mes, en orden", () => {
  const dias = leerCalendario(
    { data: { "2027-03-09": { price: 31 }, "2027-03-02": { price: 25 }, "2027-03-04": {} } },
    "EUR",
    VISTO,
  );
  assert.deepEqual(
    dias.map((d) => [d.dia, d.precio]),
    [
      ["2027-03-02", 25],
      ["2027-03-09", 31],
    ],
  );
});

test("Parallel: los alojamientos de una zona, con la oferta de cada vendedor", () => {
  const json = {
    results: [
      {
        name: "Hotel Uno Inventado",
        latitude: 10.1,
        longitude: 20.1,
        property_type: "hotel",
        hotel_class: 4,
        rating: "great",
        offers: [
          {
            seller: "Vendedor Inventado",
            total_price: 300,
            currency: "EUR",
            free_cancellation: true,
            url: "https://reservas.invalid/1",
          },
        ],
      },
      { latitude: 1, longitude: 1 },
    ],
  };
  const ofertas = leerOfertas(json, VISTO);
  assert.equal(ofertas.length, 1);
  assert.equal(ofertas[0].nivel, "great");
  assert.deepEqual(ofertas[0].ofertas, [
    {
      vendedor: "Vendedor Inventado",
      total: 300,
      moneda: "EUR",
      cancelable: true,
      enlace: "https://reservas.invalid/1",
    },
  ]);
  const cuerpo = cuerpoDeZona("Barrio Inventado", { ...ESTANCIA, ninos: [6] }, ["hotel"], 40);
  assert.equal(cuerpo.location, "Barrio Inventado");
  assert.deepEqual(cuerpo.children_ages, [6]);
  assert.equal(cuerpo.check_out_date, ESTANCIA.salida);
});

/** Las ofertas que lee el enchufe de un alojamiento inventado al que la fuente le pone estas. */
const ofertasDe = (...offers: Record<string, unknown>[]) =>
  leerOfertas({ results: [{ name: "Hotel Uno Inventado", offers }] }, VISTO)[0].ofertas;

test("Parallel: trampa: un enlace que no es https, o con claves dentro, no llega; la oferta sigue, sin enlace", () => {
  const malos = [
    "javascript:alert(document.domain)",
    "http://reservas.invalid/1",
    "intent://reservas.invalid/#Intent;scheme=https;end",
    "data:text/html,<script>alert(1)</script>",
    "https://usuario:clave@reservas.invalid/1",
    "https://usuario@reservas.invalid/1",
    "//reservas.invalid/1",
    "reservas.invalid/1",
    "no es una dirección",
    7,
  ];
  const oferta = (url: unknown) => ({ seller: "Vendedor Inventado", total_price: 300, currency: "EUR", url });
  const ofertas = ofertasDe(...malos.map(oferta));
  assert.equal(ofertas.length, malos.length);
  ofertas.forEach((o, i) => assert.deepEqual([o.total, o.enlace], [300, null], String(malos[i])));
  // El que vale llega como lo entiende quien lo abre: sin espacios alrededor ni saltos de línea dentro.
  assert.equal(ofertasDe(oferta(" https://reservas.invalid/1\n"))[0].enlace, "https://reservas.invalid/1");
});

test("Parallel: la moneda de una oferta va en mayúsculas, y si no son tres letras la oferta no entra", () => {
  const oferta = (currency: unknown) => ({ seller: "Vendedor Inventado", total_price: 300, currency });
  assert.deepEqual(
    ofertasDe(oferta("eur"), oferta(" Usd "), oferta("EUR")).map((o) => o.moneda),
    ["EUR", "USD", "EUR"],
  );
  // Tampoco entra la que no dice su moneda: en cuál está un precio no se supone.
  const sinMoneda = [oferta("euros"), oferta("€"), oferta("E1R"), oferta(""), oferta(978), oferta(null), {}];
  assert.deepEqual(ofertasDe(...sinMoneda), []);
});

test("los enchufes se apagan con una variable, y las claves salen del entorno o viajan de relleno", () => {
  assert.equal(encendida("parallel", {}), true);
  assert.equal(encendida("parallel", { ELDORADO_APAGAR: "parallel" }), false);
  assert.equal(encendida("liteapi", { ELDORADO_APAGAR: " Parallel , aviasales" }), true);
  assert.equal(encendida("aviasales", { ELDORADO_APAGAR: " Parallel , aviasales" }), false);
  assert.equal(clave("ELDORADO_VARIABLE_QUE_NO_EXISTE"), "proxy-injected");
});

/** Pone una red de mentira que contesta, por orden, lo que se le diga, y cuenta lo que se espera. */
async function conRedFalsa<T>(respuestas: Response[], que: () => Promise<T>): Promise<{ sale: T; esperas: number[] }> {
  const deVerdad = { fetch: globalThis.fetch, dormir: reloj.dormir };
  const esperas: number[] = [];
  globalThis.fetch = async () => respuestas.shift() ?? new Response("{}", { status: 500 });
  reloj.dormir = async (ms) => void esperas.push(ms);
  try {
    return { sale: await que(), esperas };
  } finally {
    globalThis.fetch = deVerdad.fetch;
    reloj.dormir = deVerdad.dormir;
  }
}

test("si una fuente dice que se le pide demasiado seguido, se espera lo que diga y se vuelve a pedir", async () => {
  const respuestas = [
    new Response("", { status: 429, headers: { "retry-after": "4" } }),
    new Response("", { status: 503 }),
    new Response('{"data":[1]}', { status: 200 }),
  ];
  const { sale, esperas } = await conRedFalsa(respuestas, () => pedirJson("inventada", "https://fuente.invalid/x"));
  assert.deepEqual(sale, { data: [1] });
  assert.deepEqual(esperas, [4000, REINTENTOS.segundos[1] * 1000]);
});

test("si la fuente no deja de pedir que se espere, o falla de otra manera, se dice y no se inventa nada", async () => {
  const pesada = Array.from({ length: REINTENTOS.veces + 1 }, () => new Response("too many", { status: 429 }));
  const { sale, esperas } = await conRedFalsa(pesada, () =>
    pedirJson("inventada", "https://fuente.invalid/x").catch((e: unknown) => e),
  );
  assert.ok(sale instanceof ErrorDeFuente && sale.estado === 429);
  assert.equal(esperas.length, REINTENTOS.veces);
  const rota = await conRedFalsa([new Response("no", { status: 400 })], () =>
    pedirJson("inventada", "https://fuente.invalid/x").catch((e: unknown) => e),
  );
  assert.ok(rota.sale instanceof ErrorDeFuente && rota.sale.estado === 400);
  assert.deepEqual(rota.esperas, []);
});

test("trampa: con la clave de una fuente no se sigue una redirección; sin clave, se pide como siempre", async () => {
  const deVerdad = globalThis.fetch;
  const pedidos: RequestInit[] = [];
  globalThis.fetch = async (_url, pedido) => {
    pedidos.push(pedido ?? {});
    // Con «error», la red de verdad no sigue la redirección: falla, y la clave no sale hacia otra máquina.
    if (pedido?.redirect === "error") throw new TypeError("fetch failed");
    return new Response('{"data":[1]}', { status: 200 });
  };
  try {
    const conClave = { cabeceras: { "X-API-Key": "una-clave-inventada" } };
    const fallo = await pedirJson("inventada", "https://fuente.invalid/x", conClave).catch((e: unknown) => e);
    assert.ok(fallo instanceof ErrorDeFuente && fallo.estado === 0);
    assert.deepEqual(await pedirJson("inventada", "https://fuente.invalid/x"), { data: [1] });
    assert.deepEqual(await pedirJson("inventada", "https://fuente.invalid/x", { cabeceras: {} }), { data: [1] });
  } finally {
    globalThis.fetch = deVerdad;
  }
  assert.deepEqual(
    pedidos.map((p) => p.redirect),
    ["error", undefined, undefined],
  );
});
