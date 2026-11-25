// Cerrar el viaje (8.4) y sus enlaces (3.13), con el viaje inventado y sin internet: los precios de hoy, la llegada,
// el orden, los enlaces, la puerta 8 con sus trampas, la puerta 7 del orden y el cierre entero en la mesa.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EDAD_MAXIMA_DE_UN_PRECIO } from "../../agent/data/cierre.ts";
import { puertaCierre, type MaterialDelCierre } from "../../agent/gates/puerta_cierre.ts";
import { puertaDelOrden } from "../../agent/gates/puerta_explica.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import {
  cierreDeCara,
  comprobarEnlace,
  elegir,
  etapaDe,
  llevarElCierre,
  seguir,
  type FuentesDelCierre,
} from "../../agent/launcher/cerrar.ts";
import {
  abrirViaje,
  guardarVersion,
  leerVersion,
  leerViaje,
  nuevoCierre,
  nuevoRun,
  pasar,
  type ViajeEnLaMesa,
} from "../../agent/launcher/mesa.ts";
import { comprobarViaje, type Viaje } from "../../agent/output/viaje.ts";
import {
  cambioDe,
  edadDe,
  enlacesSinComprobar,
  llegadaDe,
  mapasDe,
  paraElOrden,
  piezasDe,
  pideSeguir,
  precioDeHoy,
  reservasDe,
  type ParaLaLlegada,
} from "../../agent/scripts/cierre.ts";
import { enlaceSinClaves } from "../../agent/tools/enlaces.ts";
import type { FuenteAlojamiento, FuenteTransporte, Precio, Vuelo } from "../../agent/tools/fuentes/tipos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";
import { seisPasos } from "../cases/inventado/asientos.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const AHORA = "2026-11-25T10:00:00.000Z";
const HACE = (horas: number): string => new Date(Date.parse(AHORA) - horas * 3_600_000).toISOString();

/** El viaje inventado, con su hotel visto en una web y un vuelo, para cerrarlo. */
function viajeParaCerrar(): Viaje {
  const v = viajeInventado();
  v.alojamientos[1].precio.enlace = "https://pension.inventada.example/reserva?in=2027-02-12&out=2027-02-14";
  v.alojamientos[1].otrasOfertas = [
    {
      total: 190,
      moneda: "EUR",
      vendedor: "Otra",
      visto: v.alojamientos[1].precio.visto,
      enlace: "https://otra.example/p?token=secreto",
    },
  ];
  v.transportes[0].sale = "2027-02-12T08:00:00+01:00";
  v.transportes[0].vuelve = "2027-02-14T18:00:00+01:00";
  v.transportes[0].precio.vendedor = "ZZ";
  v.transportes[0].precio.enlace = "https://www.aviasales.com/search/AAA1202ZZZ14021";
  v.paradas[2].reservar = true;
  return v;
}

const LLEGADA: ParaLaLlegada = {
  hayTransporte: true,
  sale: "2027-02-12T08:00:00+01:00",
  minutosIda: 180,
  entrada: "2027-02-12",
  entradaDesde: "12:00",
  lon: 20,
};

test("un precio de hoy: cambia hacia arriba o abajo, o se queda; y su edad, por su clase", () => {
  assert.equal(cambioDe(100, 100.004), "same");
  assert.equal(cambioDe(100, 112), "up");
  assert.equal(cambioDe(100, 90), "down");
  assert.equal(edadDe(HACE(2), AHORA, false), "now");
  assert.equal(edadDe(HACE(EDAD_MAXIMA_DE_UN_PRECIO.ahora + 1), AHORA, false), "stale");
  assert.equal(edadDe(HACE(48), AHORA, true), "saved");
  assert.equal(edadDe(HACE(EDAD_MAXIMA_DE_UN_PRECIO.guardado + 1), AHORA, true), "stale");
  assert.equal(edadDe("no es una fecha", AHORA, false), "stale");
  const v = viajeParaCerrar();
  const [pieza] = piezasDe(v, v.maneras[0]);
  const hoy = { ...pieza.antes, total: 198, visto: HACE(0) };
  const p = precioDeHoy(pieza, { precio: hoy, cancelable: true, noches: null, guardado: false }, AHORA);
  assert.equal(p.cambio, "up");
  assert.equal(p.diferencia, 18);
  // En otra moneda no se compara: no se sabe.
  assert.equal(
    precioDeHoy(pieza, { precio: { ...hoy, moneda: "USD" }, cancelable: true, noches: null, guardado: false }, AHORA)
      .cambio,
    "unknown",
  );
  assert.equal(precioDeHoy(pieza, "gone", AHORA).hoy, null);
});

test("el sí del viajero se pide si el total sube un diez por ciento o una pieza se queda sin precio", () => {
  const v = viajeParaCerrar();
  const piezas = piezasDe(v, v.maneras[0]);
  const con = (a: number, t: number) =>
    piezas.map((x, i) =>
      precioDeHoy(
        x,
        {
          precio: { ...x.antes, total: i === 0 ? a : t, visto: AHORA },
          cancelable: true,
          noches: null,
          guardado: false,
        },
        AHORA,
      ),
    );
  assert.equal(pideSeguir(con(180, 120), 300), false);
  assert.equal(pideSeguir(con(200, 125), 300), false);
  assert.equal(pideSeguir(con(200, 130), 300), true);
  assert.equal(pideSeguir([precioDeHoy(piezas[0], "gone", AHORA)], 180), true);
});

test("la llegada frente a la entrada: lo que no se sabe no se da por bueno", () => {
  assert.equal(llegadaDe(LLEGADA), "ok");
  assert.equal(llegadaDe({ ...LLEGADA, hayTransporte: false }), "no_transport");
  assert.equal(llegadaDe({ ...LLEGADA, sale: "2027-02-12" }), "no_hours");
  assert.equal(llegadaDe({ ...LLEGADA, minutosIda: null }), "no_hours");
  assert.equal(llegadaDe({ ...LLEGADA, entradaDesde: null }), "no_check_in");
  // Sale de noche y llega al día siguiente: una noche sin usar.
  assert.equal(llegadaDe({ ...LLEGADA, sale: "2027-02-12T22:00:00+01:00", minutosIda: 600 }), "next_day");
  assert.equal(llegadaDe({ ...LLEGADA, sale: "2027-02-11T09:00:00+01:00" }), "day_before");
  // Llega muy pronto: espera a su habitación.
  assert.equal(
    llegadaDe({ ...LLEGADA, sale: "2027-02-12T05:00:00+01:00", minutosIda: 60, entradaDesde: "15:00" }),
    "early",
  );
  // Cerca de medianoche, la hora del destino, aproximada, no deja saber de qué día es.
  assert.equal(llegadaDe({ ...LLEGADA, sale: "2027-02-12T20:00:00+01:00", minutosIda: 120 }), "unsure");
});

test("el orden: primero lo que se mueve de precio, luego lo que no se cancela, y lo que se reserva con tiempo", () => {
  const v = viajeParaCerrar();
  const piezas = piezasDe(v, v.maneras[0]);
  const precios = piezas.map((x) =>
    precioDeHoy(
      x,
      {
        precio: { ...x.antes, visto: AHORA },
        cancelable: x.pieza === "lodging" ? true : null,
        noches: null,
        guardado: x.guardado,
      },
      AHORA,
    ),
  );
  const orden = reservasDe(v, piezas, precios);
  assert.deepEqual(
    orden.map((r) => [r.n, r.que, r.ref]),
    [
      [1, "transport", "t1"],
      [2, "lodging", "a2"],
      [3, "sight", "p3"],
    ],
  );
  assert.deepEqual(orden[0].porQue, ["price_moves", "saved_price"]);
  assert.deepEqual(orden[1].porQue, ["cancellable"]);
});

test("los enlaces (3.13): solo https y sin claves; cada parada y cada día, el suyo a Google Maps", () => {
  assert.equal(enlaceSinClaves("https://a.example/x?in=2027-02-12"), true);
  assert.equal(enlaceSinClaves("http://a.example/x"), false);
  assert.equal(enlaceSinClaves("https://yo:clave@a.example/x"), false);
  assert.equal(enlaceSinClaves("https://a.example/x?api_key=1"), false);
  assert.equal(enlaceSinClaves("javascript:alert(1)"), false);
  const v = viajeParaCerrar();
  const m = v.maneras[0];
  const precios = piezasDe(v, m).map((x) => precioDeHoy(x, "unknown", AHORA));
  const enlaces = enlacesSinComprobar(v, m, precios, { web: "https://pension.inventada.example/", entradaDesde: null });
  assert.deepEqual(
    enlaces.map((e) => [e.ref, e.clase]),
    [
      ["a2", "where_priced"],
      ["t1", "search"],
      ["a2", "own_site"],
    ],
  );
  // El del otro vendedor llevaba un token: no se enseña.
  assert.ok(!enlaces.some((e) => e.url.includes("token")));
  // El de otro vendedor, limpio, va con su clase y con su precio, que es el del día que se buscó y no el de hoy.
  const conOtro = viajeParaCerrar();
  conOtro.alojamientos[1].otrasOfertas = [
    { total: 171, moneda: "EUR", vendedor: "Otra Web", visto: HACE(48), enlace: "https://otra.inventada.example/p" },
  ];
  const otros = enlacesSinComprobar(conOtro, conOtro.maneras[0], precios, { web: null, entradaDesde: null });
  assert.deepEqual(
    otros.map((e) => [e.clase, e.vendedor, e.precio?.total ?? null]),
    [
      ["where_priced", "inventada", null],
      ["search", "ZZ", null],
      ["other_seller", "Otra Web", 171],
    ],
  );
  const mapas = mapasDe(v, "a2");
  assert.deepEqual(Object.keys(mapas.paradas).sort(), ["p1", "p2", "p3", "p4"]);
  assert.equal(mapas.dias.length, v.dias.length);
  for (const u of [mapas.alojamiento, ...Object.values(mapas.paradas), ...mapas.dias.map((d) => d.url!)])
    assert.match(u, /^https:\/\/www\.google\.com\/maps\//);
  // Cada día empieza donde se duerme.
  assert.ok(mapas.dias[0].url!.includes(`origin=${v.alojamientos[1].punto.lat},${v.alojamientos[1].punto.lon}`));
});

// La mesa, con el viaje inventado ya en el mapa.

function enElMapa(viaje: Viaje = viajeParaCerrar(), entradaDesde = "12:00"): { mesa: string; v: ViajeEnLaMesa } {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-cierre-"));
  const entendido = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: viaje.entrada, check_out: viaje.salida } };
  const v = abrirViaje({ dueno: "u-1", entendido, mesa, cuando: new Date(HACE(48)) });
  pasar(v, "confirmed", new Date(HACE(48)));
  const run = nuevoRun(v, new Date(HACE(48)));
  writeFileSync(join(run, "viaje.json"), JSON.stringify(viaje));
  writeFileSync(join(run, "sucesos.json"), JSON.stringify([]));
  writeFileSync(
    join(run, "busqueda.json"),
    JSON.stringify({
      busqueda: {
        finalistas: [
          { alojamiento: { id: "a2" }, detalle: { web: "https://pension.inventada.example/", entradaDesde } },
        ],
      },
    }),
  );
  guardarVersion(v, 1, "first", new Date(HACE(47)));
  return { mesa, v };
}

/** Una fuente de alojamiento que da hoy el precio que se le diga, para las noches que se le piden. */
function alojamientoHoy(
  total: number | null,
  o: { cancelable?: boolean | null; falla?: boolean; habitacion?: string | null } = {},
): FuenteAlojamiento {
  return {
    nombre: "inventada",
    lista: async () => [],
    detalle: async () => {
      throw new Error("no hace falta");
    },
    opiniones: async () => [],
    precios: async (ids, e) => {
      if (o.falla) throw new Error("la fuente no contesta");
      if (total === null) return [];
      const p: Precio = {
        fuente: "inventada",
        visto: AHORA,
        id: ids[0],
        total,
        tasasAparte: 0,
        moneda: "EUR",
        habitacion: o.habitacion === undefined ? "Doble pequeña" : o.habitacion,
        idHabitacion: null,
        regimen: null,
        cancelable: o.cancelable === undefined ? true : o.cancelable,
        entrada: e.entrada,
        salida: e.salida,
        adultos: e.adultos,
        habitaciones: e.habitaciones,
        vendedor: "inventada",
        enlace: null,
      };
      return [p];
    },
  };
}

/** Una fuente de vuelos que da hoy el mismo vuelo, por billete. */
function vueloHoy(porBillete: number): FuenteTransporte {
  return {
    nombre: "inventada",
    lugares: async () => ({ aeropuertos: [], ciudades: [] }),
    fechas: async (t) => {
      const v: Vuelo = {
        fuente: "inventada",
        visto: HACE(30),
        origen: t.origen,
        destino: t.destino,
        sale: "2027-02-12T08:00:00+01:00",
        vuelve: "2027-02-14T18:00:00+01:00",
        aerolinea: "ZZ",
        numero: "1",
        precio: porBillete,
        pasajeros: 1,
        moneda: "EUR",
        escalasIda: 0,
        escalasVuelta: 0,
        minutos: 360,
        minutosIda: 180,
        guardado: true,
        enlace: "https://www.aviasales.com/search/AAA1202ZZZ14021",
      };
      return [v];
    },
  };
}

const fuentes = (alojamiento: FuenteAlojamiento, porBillete = 60): FuentesDelCierre => ({
  alojamiento,
  transporte: vueloHoy(porBillete),
  comprobar: async (url) => (url.includes("pension") ? "ok" : "unchecked"),
});

/** Un que explica de mentira: escribe una frase por reserva y por plazo, con lo que se le diga. */
function explicaDeMentira(
  dice: (paso: Record<string, any>) => string = () => "Conviene reservarlo pronto.",
): Lanzador & { veces: number } {
  const l = (async (_orden, puesto) => {
    l.veces++;
    const dado = JSON.parse(readFileSync(join(puesto.carpeta, "in", "closing.json"), "utf8"));
    const entrega = {
      seat: "trip-explainer",
      language: dado.trip.language,
      closing: {
        steps: dado.steps.map((s: Record<string, any>) => ({ step: s.step, says: dice(s) })),
        papers: dado.papers.map((p: Record<string, any>) => ({ paper: p.paper, says: "Hazlo antes de ese día." })),
        unknowns: dado.unconfirmed.length > 0 ? ["Algo queda sin confirmar: míralo donde reserves."] : [],
      },
    };
    const textos = seisPasos(readdirSync(join(puesto.carpeta, "in")), entrega);
    for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
    return { turnos: 1, entrada: 10, salida: 10, usd: 0.01 };
  }) as Lanzador & { veces: number };
  l.veces = 0;
  return l;
}

async function cerrarCon(v: ViajeEnLaMesa, f: FuentesDelCierre, lanzador: Lanzador | null, manera = "cheapest") {
  const c = nuevoCierre(v, new Date(AHORA));
  elegir(v, c.carpeta, manera, new Date(AHORA));
  const r = await llevarElCierre(v, c, { fuentes: f, lanzador, ahora: () => new Date(AHORA) });
  return { c, r };
}

test("el cierre entero: precios de hoy, enlaces, el orden con sus frases, la puerta 8 y la versión", async () => {
  const { mesa, v } = enElMapa();
  const lanzador = explicaDeMentira();
  const { c, r } = await cerrarCon(v, fuentes(alojamientoHoy(186)), lanzador);
  assert.equal(r.etapa, "done", JSON.stringify(JSON.parse(readFileSync(join(c.carpeta, "puerta8.json"), "utf8"))));
  assert.equal(lanzador.veces, 1);
  const otra = leerViaje(v.ficha.id, "u-1", mesa);
  assert.equal(otra.ficha.estado, "closed");
  assert.equal(otra.ficha.version, 2);
  assert.equal(otra.ficha.versiones[1].cierre, 1);
  const viaje = leerVersion(otra)!.viaje as Viaje;
  assert.deepEqual(comprobarViaje(viaje), []);
  const cierre = viaje.cierre!;
  assert.equal(cierre.manera, "cheapest");
  assert.deepEqual(
    cierre.precios.map((p) => [p.ref, p.cambio, p.diferencia, p.edad]),
    [
      ["a2", "up", 6, "now"],
      ["t1", "same", 0, "saved"],
    ],
  );
  assert.equal(cierre.total.hoy, 306);
  assert.equal(cierre.llegada, "ok");
  assert.equal(cierre.entradaDesde, "12:00");
  assert.ok(cierre.reservas.every((x) => typeof x.frase === "string"));
  assert.ok(cierre.enlaces.some((e) => e.comprobado === "ok"));
  // La versión de antes sigue ahí, sin tocar.
  assert.equal((leerVersion(otra, 1)!.viaje as Viaje).cierre, undefined);
  // Lo que gastó el que explica queda apuntado en el cierre.
  assert.ok(existsSync(join(c.carpeta, "trabajos.json")));
  const { gastoDeLaCuenta } = await import("../../agent/launcher/gasto.ts");
  const gasto = gastoDeLaCuenta("u-1", mesa);
  assert.equal(gasto.viajes[0].llamadas, 1);
  assert.equal(gasto.viajes[0].usd, 0.01);
  assert.equal(cierreDeCara(otra, c).stage, "done");
});

test("trampa: una hora de entrada guardada como la escribe la fuente no se lee doce horas antes", async () => {
  // Pasó al cerrar el primer viaje de verdad: la fuente dice «03:00 PM», y se leía como las tres de la madrugada.
  for (const [guardada, es] of [
    ["03:00 PM", "15:00"],
    ["12:00 PM", "12:00"],
    ["11:30 AM", "11:30"],
    ["15:00", "15:00"],
    ["a partir de la tarde", null],
  ] as const) {
    const { mesa, v } = enElMapa(viajeParaCerrar(), guardada);
    try {
      await cerrarCon(v, fuentes(alojamientoHoy(180)), null);
      const cierre = (leerVersion(leerViaje(v.ficha.id, "u-1", mesa))!.viaje as Viaje).cierre!;
      assert.equal(cierre.entradaDesde, es, guardada);
    } finally {
      rmSync(mesa, { recursive: true, force: true });
    }
  }
});

test("trampa: el precio de hoy de otra habitación no se compara callando con el de la que se miró", async () => {
  // La fuente da hoy lo más barato que tiene. Si es de otra habitación, se dice, y queda sin confirmar.
  for (const [deHoy, es] of [
    ["Doble pequeña", "same"],
    ["  doble   PEQUEÑA ", "same"],
    ["Suite con vistas", "other"],
    [null, "unknown"],
  ] as const) {
    const { mesa, v } = enElMapa();
    try {
      await cerrarCon(v, fuentes(alojamientoHoy(180, { habitacion: deHoy })), null);
      const cierre = (leerVersion(leerViaje(v.ficha.id, "u-1", mesa))!.viaje as Viaje).cierre!;
      const delAlojamiento = cierre.precios.find((p) => p.pieza === "lodging")!;
      assert.equal(delAlojamiento.habitacion, es, String(deHoy));
      assert.equal(cierre.precios.find((p) => p.pieza === "transport")?.habitacion ?? null, null);
      assert.equal(
        cierre.sinConfirmar.some((s) => s.que === "other_room" && s.ref === delAlojamiento.ref),
        es === "other",
        String(deHoy),
      );
    } finally {
      rmSync(mesa, { recursive: true, force: true });
    }
  }
});

test("sin IA, el viaje se cierra con el orden del código y sin frases, y lo dice", async () => {
  const { v } = enElMapa();
  const { r } = await cerrarCon(v, fuentes(alojamientoHoy(180)), null);
  assert.equal(r.etapa, "done");
  const cierre = (leerVersion(v)!.viaje as Viaje).cierre!;
  assert.equal(cierre.sinFrases, "no_ai");
  assert.ok(cierre.reservas.every((x) => x.frase === undefined));
});

test("si un precio sube mucho, para y espera el sí del viajero; con él, sigue", async () => {
  const { v } = enElMapa();
  const { c, r } = await cerrarCon(v, fuentes(alojamientoHoy(240)), null);
  assert.equal(r.etapa, "yours");
  assert.equal(v.ficha.estado, "on_map");
  const cara = cierreDeCara(v, c);
  assert.equal(cara.stage, "yours");
  assert.deepEqual(
    (cara.prices as Record<string, unknown>[]).map((p) => p.change),
    ["up", "same"],
  );
  seguir(c.carpeta, new Date(AHORA));
  const despues = await llevarElCierre(v, c, {
    fuentes: fuentes(alojamientoHoy(240)),
    lanzador: null,
    ahora: () => new Date(AHORA),
  });
  assert.equal(despues.etapa, "done");
  assert.deepEqual((leerVersion(v)!.viaje as Viaje).cierre!.subida, { pide: true, sigue: true });
});

test("si la fuente no contesta o ya no tiene el precio, no se inventa: queda sin confirmar y se pregunta", async () => {
  const { v } = enElMapa();
  const { c, r } = await cerrarCon(v, fuentes(alojamientoHoy(null)), null);
  assert.equal(r.etapa, "yours");
  seguir(c.carpeta, new Date(AHORA));
  await llevarElCierre(v, c, { fuentes: fuentes(alojamientoHoy(null)), lanzador: null, ahora: () => new Date(AHORA) });
  const cierre = (leerVersion(v)!.viaje as Viaje).cierre!;
  assert.equal(cierre.precios[0].cambio, "gone");
  assert.equal(cierre.total.hoy, null);
  assert.ok(cierre.sinConfirmar.some((s) => s.que === "price_gone" && s.ref === "a2"));
  const { v: otro } = enElMapa();
  const fallo = await cerrarCon(otro, fuentes(alojamientoHoy(1, { falla: true })), null);
  assert.equal(fallo.r.etapa, "yours");
  assert.equal(etapaDe(fallo.c.carpeta), "yours");
});

test("solo se cierra un viaje en el mapa, y con una manera suya", () => {
  const { v } = enElMapa();
  const c = nuevoCierre(v, new Date(AHORA));
  assert.throws(() => elegir(v, c.carpeta, "la mejor", new Date(AHORA)), /bad_way/);
  assert.throws(() => seguir(c.carpeta, new Date(AHORA)));
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-cierre-"));
  const nuevo = abrirViaje({ dueno: "u-1", entendido: ENTENDIDO, mesa });
  assert.throws(() => nuevoCierre(nuevo), /en el mapa/);
});

test("lo del que explica pasa la puerta 7: con un número de más vuelve, y si no sale, cierra sin frases", async () => {
  const { v } = enElMapa();
  const lanzador = explicaDeMentira(() => "Te ahorras 999 euros si lo reservas hoy.");
  const { r } = await cerrarCon(v, fuentes(alojamientoHoy(180)), lanzador);
  assert.equal(r.etapa, "done");
  assert.equal(lanzador.veces, 3);
  const cierre = (leerVersion(v)!.viaje as Viaje).cierre!;
  assert.equal(cierre.sinFrases, "rejected");
});

test("la puerta 7 del orden: una frase por reserva y por plazo, sin enlaces y con los números dados", () => {
  const v = viajeParaCerrar();
  const piezas = piezasDe(v, v.maneras[0]);
  const precios = piezas.map((x) =>
    precioDeHoy(
      x,
      {
        precio: { ...x.antes, total: x.antes.total + 6, visto: AHORA },
        cancelable: true,
        noches: null,
        guardado: x.guardado,
      },
      AHORA,
    ),
  );
  const reservas = reservasDe(v, piezas, precios);
  const dado = paraElOrden(v, {
    reservas,
    papeles: [],
    sinConfirmar: [],
    llegada: "ok",
    entradaDesde: "14:00",
    precios,
    total: { antes: 300, hoy: 312 },
    moneda: "EUR",
  });
  const bien = {
    seat: "trip-explainer",
    language: "es",
    closing: {
      steps: reservas.map((r) => ({ step: r.n, says: "Ha subido 6 EUR: resérvalo el primero." })),
      papers: [],
      unknowns: [],
    },
  };
  assert.deepEqual(puertaDelOrden(bien, { dado }).rojos, []);
  const mal = structuredClone(bien);
  mal.closing.steps[0].says = "Mira https://a.example para reservarlo.";
  mal.closing.steps.pop();
  const rojos = puertaDelOrden(mal, { dado })
    .rojos.map((x) => x.que)
    .join(" | ");
  assert.match(rojos, /enlace/);
  assert.match(rojos, /falta la frase/);
  const numero = structuredClone(bien);
  numero.closing.steps[0].says = "Ha subido 77 EUR.";
  assert.match(JSON.stringify(puertaDelOrden(numero, { dado }).rojos), /77/);
});

// La puerta 8 y sus trampas: se cierra bien, y cada trampa tiene que dar rojo.

async function cerradoYSuMaterial(): Promise<{ viaje: Viaje; material: MaterialDelCierre }> {
  const { v } = enElMapa();
  const { c } = await cerrarCon(v, fuentes(alojamientoHoy(186)), null);
  const viaje = leerVersion(v)!.viaje as Viaje;
  const p = JSON.parse(readFileSync(join(c.carpeta, "precios.json"), "utf8"));
  const m = viaje.maneras.find((x) => x.id === viaje.cierre!.manera)!;
  return {
    viaje,
    material: {
      piezas: piezasDe(viaje, m),
      dados: p.dados,
      comprobados: JSON.parse(readFileSync(join(c.carpeta, "enlaces.json"), "utf8")),
      llegada: p.llegada,
    },
  };
}

test("la puerta 8 deja pasar un cierre que cuadra", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  assert.deepEqual(puertaCierre(viaje, material).rojos, []);
});

test("trampa: las noches del precio de hoy no son las del viaje", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  const dado = material.dados.a2 as Exclude<(typeof material.dados)["a2"], string>;
  dado.noches = { entrada: "2027-02-12", salida: "2027-02-13" };
  viaje.cierre!.precios[0].noches = dado.noches;
  assert.match(JSON.stringify(puertaCierre(viaje, material).rojos), /noches del viaje/);
});

test("trampa: un precio que pasó de su edad máxima, dado por bueno", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  const viejo = new Date(Date.parse(AHORA) - (EDAD_MAXIMA_DE_UN_PRECIO.guardado + 5) * 3_600_000).toISOString();
  (material.dados.t1 as { precio: { visto: string } }).precio.visto = viejo;
  viaje.cierre!.precios[1].hoy!.visto = viejo;
  assert.match(JSON.stringify(puertaCierre(viaje, material).rojos), /edad máxima/);
});

test("trampa: un enlace que se da por vivo sin haber respondido", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  const e = viaje.cierre!.enlaces.find((x) => x.comprobado === "unchecked")!;
  e.comprobado = "ok";
  assert.match(JSON.stringify(puertaCierre(viaje, material).rojos), /lo que se vio es unchecked/);
});

test("trampa: la llegada dada por buena sin horas", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  material.llegada = { ...material.llegada, minutosIda: null };
  assert.match(JSON.stringify(puertaCierre(viaje, material).rojos), /no_hours/);
});

test("trampa: un precio que no es el que dio la fuente, y un total que no suma", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  viaje.cierre!.precios[0].hoy!.total = 150;
  viaje.cierre!.total.hoy = 999;
  const rojos = JSON.stringify(puertaCierre(viaje, material).rojos);
  assert.match(rojos, /no son los que dio cada fuente/);
  assert.match(rojos, /no es la suma/);
});

test("trampa: un cierre que pedía el sí del viajero sin tenerlo, y un orden cambiado", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  viaje.cierre!.subida = { pide: true, sigue: false };
  viaje.cierre!.reservas.reverse().forEach((r, i) => (r.n = i + 1));
  const rojos = JSON.stringify(puertaCierre(viaje, material).rojos);
  assert.match(rojos, /no ha dicho que sigue/);
  assert.match(rojos, /orden de las reservas/);
});

test("trampa: un enlace con una clave dentro no llega a la web", async () => {
  const { viaje, material } = await cerradoYSuMaterial();
  viaje.cierre!.enlaces[0].url = "https://pension.inventada.example/r?api_key=abc";
  assert.match(JSON.stringify(comprobarViaje(viaje)), /sin claves/);
  assert.equal(puertaCierre(viaje, material).verde, false);
});

test("comprobar un enlace: solo la cabecera, sin seguir de más, y lo que no deja mirar no está muerto", async () => {
  const pedidos: { url: string; metodo: string }[] = [];
  const con = (respuestas: Record<string, { status: number; location?: string }>): typeof fetch =>
    (async (url: string | URL, init?: RequestInit) => {
      pedidos.push({ url: String(url), metodo: init?.method ?? "GET" });
      const r = respuestas[String(url)] ?? { status: 200 };
      return new Response(null, { status: r.status, headers: r.location ? { location: r.location } : {} });
    }) as typeof fetch;
  assert.equal(await comprobarEnlace("https://a.example/x", con({})), "ok");
  assert.equal(pedidos[0].metodo, "HEAD");
  assert.equal(await comprobarEnlace("https://a.example/y", con({ "https://a.example/y": { status: 404 } })), "down");
  assert.equal(
    await comprobarEnlace("https://a.example/z", con({ "https://a.example/z": { status: 429 } })),
    "unchecked",
  );
  // Una redirección a una dirección sin https no se sigue.
  const fuera = con({ "https://a.example/r": { status: 302, location: "http://b.example/" } });
  assert.equal(await comprobarEnlace("https://a.example/r", fuera), "unchecked");
  // Una web que no admite la cabecera se mira con el primer byte.
  pedidos.length = 0;
  const sinCabecera = (async (url: string | URL, init?: RequestInit) => {
    pedidos.push({ url: String(url), metodo: init?.method ?? "GET" });
    return new Response(null, { status: init?.method === "HEAD" ? 405 : 206 });
  }) as typeof fetch;
  assert.equal(await comprobarEnlace("https://a.example/h", sinCabecera), "ok");
  assert.deepEqual(
    pedidos.map((p) => p.metodo),
    ["HEAD", "GET"],
  );
  // Un bucle de redirecciones se deja a las pocas.
  pedidos.length = 0;
  const bucle = con({ "https://a.example/b": { status: 301, location: "https://a.example/b" } });
  assert.equal(await comprobarEnlace("https://a.example/b", bucle), "unchecked");
  assert.ok(pedidos.length <= 5);
});

test("trampa: comprobar un enlace no manda a la casa a su red, ni de entrada ni por una redirección", async () => {
  const pedidos: string[] = [];
  const con = (respuestas: Record<string, { status: number; location?: string }>): typeof fetch =>
    (async (url: string | URL) => {
      pedidos.push(String(url));
      const r = respuestas[String(url)] ?? { status: 200 };
      return new Response(null, { status: r.status, headers: r.location ? { location: r.location } : {} });
    }) as typeof fetch;
  // Lo de dentro no se pide: un número, la propia máquina, un nombre sin punto, uno de dentro, o con puerto.
  const deDentro = [
    "https://10.0.0.7/",
    "https://169.254.169.254/latest/meta-data/",
    "https://localhost/",
    "https://[::1]/",
    "https://casa/",
    "https://base.internal/",
    "https://caja.svc/",
    "https://a.example:8443/",
  ];
  for (const url of deDentro) assert.equal(await comprobarEnlace(url, con({})), "unchecked", url);
  assert.deepEqual(pedidos, []);
  // Y una web de fuera que redirige a dentro: se pide la de fuera, y a la de dentro no se llega.
  const aDentro = con({ "https://a.example/r": { status: 302, location: "https://10.0.0.7/admin" } });
  assert.equal(await comprobarEnlace("https://a.example/r", aDentro), "unchecked");
  assert.deepEqual(pedidos, ["https://a.example/r"]);
});

test("la puerta de la casa: «me quedo con este» solo para su dueño, de fondo, y la web ve el cerrado", async () => {
  const { puertaALaWeb, CABECERA_DE_LA_SESION } = await import("../../agent/launcher/puerta_a_la_web.ts");
  const { fuentesInventadas } = await import("../cases/inventado/asientos.ts");
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const comprobados: string[] = [];
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => ({ ...fuentesInventadas(), alojamiento: alojamientoHoy(186), transporte: vueloHoy(60) }),
    hoy: () => new Date(AHORA),
    comprobarEnlace: async (url) => (comprobados.push(url), "ok"),
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as { port: number }).port}`;
  const pide = async (metodo: string, ruta: string, sesion: string | null, cuerpo?: unknown) => {
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${LLAVE}`, ...(sesion === null ? {} : { [CABECERA_DE_LA_SESION]: sesion }) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Record<string, any> };
  };
  try {
    const sesionDe = async (nombre: string) =>
      (await pide("POST", "/cuentas", null, { email: `${nombre}@inventado.example`, password: "una contraseña larga" }))
        .cuerpo.session as string;
    const ana = await sesionDe("ana");
    const otro = await sesionDe("otro");
    const viaje = viajeParaCerrar();
    const entendido = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: viaje.entrada, check_out: viaje.salida } };
    const id = (await pide("POST", "/viajes", ana, { understood: entendido })).cuerpo.trip.id as string;
    const dueno = JSON.parse(readFileSync(join(mesa, "viajes", id, "ficha.json"), "utf8")).dueno as string;
    // Antes de estar en el mapa no se cierra.
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "cheapest" })).estado, 409);
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed");
    const run = nuevoRun(v);
    writeFileSync(join(run, "viaje.json"), JSON.stringify(viaje));
    writeFileSync(join(run, "sucesos.json"), "[]");
    guardarVersion(v, 1, "first");
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, otro, { way: "cheapest" })).estado, 404);
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "la mejor" })).estado, 400);
    const malos = { way: "cheapest", days: [{ fecha: "2030-01-01", paradas: [] }] };
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, malos)).cuerpo.error, "bad_days");
    assert.equal((await pide("GET", `/viajes/${id}/cierre`, ana)).estado, 404);
    const dias = [{ fecha: "2027-02-12", paradas: ["p1", "p2", "p3"] }];
    const r = await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "cheapest", days: dias, pace: "full" });
    assert.equal(r.estado, 202);
    await puerta.esperar();
    const c = await pide("GET", `/viajes/${id}/cierre`, ana);
    assert.equal(c.cuerpo.closing.stage, "done");
    assert.equal((await pide("GET", `/viajes/${id}/cierre`, otro)).estado, 404);
    const version = await pide("GET", `/viajes/${id}/version`, ana);
    assert.equal(version.cuerpo.trip.cierre.manera, "cheapest");
    assert.deepEqual(version.cuerpo.trip.dias[0].paradas, ["p1", "p2", "p3"]);
    assert.equal(version.cuerpo.trip.ritmo, "full");
    // Sin IA en la casa se cierra igual, y lo dice.
    assert.equal(version.cuerpo.trip.cierre.sinFrases, "no_ai");
    assert.ok(comprobados.length > 0);
    // Cerrado, no se vuelve a cerrar.
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "cheapest" })).estado, 409);
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
  }
});

test("se cierra con los días que tiene delante el viajero, y con su manera, guardados al cerrar", async () => {
  const { v } = enElMapa();
  const c = nuevoCierre(v, new Date(AHORA));
  // Quitó el mercado (p2), añadió el museo (p4) al segundo día y va a un ritmo tranquilo.
  const dias = [
    { fecha: "2027-02-12", paradas: ["p1"] },
    { fecha: "2027-02-13", paradas: ["p3", "p4"] },
  ];
  assert.throws(
    () => elegir(v, c.carpeta, "cheapest", new Date(AHORA), { dias: [{ fecha: "2027-03-01", paradas: [] }] }),
    /bad_days/,
  );
  assert.throws(
    () => elegir(v, c.carpeta, "cheapest", new Date(AHORA), { dias: [{ fecha: "2027-02-12", paradas: ["p1", "p1"] }] }),
    /bad_days/,
  );
  assert.throws(
    () => elegir(v, c.carpeta, "cheapest", new Date(AHORA), { dias: [{ fecha: "2027-02-12", paradas: ["nada"] }] }),
    /bad_days/,
  );
  elegir(v, c.carpeta, "best_value", new Date(AHORA), { dias, ritmo: "calm" });
  const r = await llevarElCierre(v, c, {
    fuentes: fuentes(alojamientoHoy(240)),
    lanzador: null,
    ahora: () => new Date(AHORA),
  });
  assert.equal(r.etapa, "done");
  const viaje = leerVersion(v)!.viaje as Viaje;
  assert.deepEqual(comprobarViaje(viaje), []);
  assert.equal(viaje.cierre!.manera, "best_value");
  assert.deepEqual(
    viaje.dias.map((d) => d.paradas),
    [["p1"], ["p3", "p4"]],
  );
  assert.equal(viaje.dias[1].metros.length, 1);
  assert.equal(viaje.ritmo, "calm");
  assert.deepEqual(viaje.fuera, ["p2"]);
  assert.equal(viaje.porQueFuera.p2, "removed");
  // Los enlaces de los días son los de sus días.
  assert.equal(viaje.cierre!.mapas.dias.length, 2);
  // La versión de antes sigue con sus días.
  assert.deepEqual(
    (leerVersion(v, 1)!.viaje as Viaje).dias.map((d) => d.paradas),
    [["p1", "p2"], ["p3"]],
  );
});
