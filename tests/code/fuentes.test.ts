// Cada enchufe lee bien una respuesta con la forma de su fuente, y no se fía de lo que venga roto. Las respuestas son
// inventadas: tienen la forma de las de verdad y ningún dato de verdad.

import assert from "node:assert/strict";
import { test } from "node:test";
import { leerCalendario, leerVuelos, vistoEnEnlace, type Trayecto } from "../../agent/tools/fuentes/aviasales.ts";
import { encendida } from "../../agent/tools/fuentes/enchufes.ts";
import { clave } from "../../agent/tools/fuentes/http.ts";
import {
  cuerpoDePrecios,
  direccionDeLista,
  leerDetalle,
  leerLista,
  leerOpiniones,
  leerPrecios,
} from "../../agent/tools/fuentes/liteapi.ts";
import { cuerpoDeZona, leerOfertas } from "../../agent/tools/fuentes/parallel.ts";
import { ESTANCIA, MINIMOS, VISTO } from "../cases/inventado/inventado.ts";

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
  assert.equal(url.searchParams.get("radius"), "1500");
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

test("los enchufes se apagan con una variable, y las claves salen del entorno o viajan de relleno", () => {
  assert.equal(encendida("parallel", {}), true);
  assert.equal(encendida("parallel", { ELDORADO_APAGAR: "parallel" }), false);
  assert.equal(encendida("liteapi", { ELDORADO_APAGAR: " Parallel , aviasales" }), true);
  assert.equal(encendida("aviasales", { ELDORADO_APAGAR: " Parallel , aviasales" }), false);
  assert.equal(clave("ELDORADO_VARIABLE_QUE_NO_EXISTE"), "proxy-injected");
});
