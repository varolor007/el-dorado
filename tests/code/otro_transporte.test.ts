// El transporte, a ratos (8.3), con el caso inventado y asientos de mentira: buscarlo otra vez movido a donde se
// pide, lo que cambia cada opción con los números del código, elegir una (otro vuelo en los mismos días, otro día
// con sus noches nuevas, un aeropuerto en otro país con sus papeles), la versión nueva sin pisar la de antes, y
// cerrar con el transporte elegido. Nada sale a internet ni gasta.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CAMBIOS, CLASES_DE_CAMBIO } from "../../agent/data/momentos.ts";
import { ELECCIONES_DE_TRANSPORTE, HORARIOS } from "../../agent/data/transporte.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import {
  abrirViaje,
  apuntar,
  leerDiario,
  leerVersion,
  leerViaje,
  nuevoRun,
  pasar,
  type ViajeEnLaMesa,
} from "../../agent/launcher/mesa.ts";
import {
  buscarElTransporte,
  FalloDelTransporte,
  loQuePideLaOpcion,
  transporteDeCara,
} from "../../agent/launcher/otro_transporte.ts";
import { papelesDelRun } from "../../agent/launcher/papeles.ts";
import { rehacer, rehechoDe } from "../../agent/launcher/rehacer.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { impactoDe } from "../../agent/scripts/impacto.ts";
import {
  antesYAhora,
  buscarOtraVez,
  comprobarPedido,
  conTuTransporte,
  enSuHorario,
  moverDia,
  pedidoDelTransporte,
  PedidoQueNoVale,
  SIN_MOVER,
  type Comparado,
} from "../../agent/scripts/otro_transporte.ts";
import { TEXTOS } from "../../web/src/lib/textos.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ENTENDIDO, transporteInventado, vueloInventado } from "../cases/inventado/investigacion.ts";
import { ESTANCIA } from "../cases/inventado/inventado.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

/** Lo que se compara con el viaje inventado: su vuelo de viernes, a 160 por billete, para dos, y su país. */
const comparado = (o: Partial<Comparado> = {}): Comparado => ({
  entendido: ENTENDIDO,
  actual: { precio: { total: 320, moneda: "EUR", vendedor: null, visto: "", enlace: null } },
  viajeros: 2,
  mirados: ["ZZ"],
  ...o,
});

test("las clases del transporte: otro vuelo, la tabla y el que cruza; un país nuevo, los papeles", () => {
  assert.ok(CLASES_DE_CAMBIO.includes("flight") && CLASES_DE_CAMBIO.includes("new_country"));
  const otroVuelo = impactoDe(["flight"]);
  assert.deepEqual(
    otroVuelo.redo.map((x) => x.step),
    ["table", "cross", "explain", "trip"],
  );
  // Ni se busca el alojamiento ni se mira otra vez: las noches son las mismas.
  for (const paso of ["search", "look", "route", "sights", "pick"] as const) assert.ok(otroVuelo.keep.includes(paso));
  assert.deepEqual(
    otroVuelo.maybe.map((x) => x.step),
    ["papers"],
  );
  const conPais = impactoDe(["flight", "new_country"]);
  assert.ok(conPais.redo.some((x) => x.step === "papers"));
  assert.deepEqual(conPais.maybe, []);
  // Otro día cambia las noches: es un cambio de fechas, con su misma pieza.
  assert.ok(impactoDe(["dates"]).redo.some((x) => x.step === "search"));
  assert.deepEqual(CAMBIOS.new_country.pasos, ["papers"]);
  // Cada clase nueva se dice en los dos idiomas.
  for (const idioma of ["en", "es"] as const)
    for (const c of ["flight", "new_country"]) assert.ok(TEXTOS[idioma].momentos.cambios[c], `${idioma} ${c}`);
});

test("lo que se pide al buscar otra vez se mira campo a campo", () => {
  assert.deepEqual(comprobarPedido({}), SIN_MOVER);
  assert.deepEqual(comprobarPedido({ out: -1, back: 2, arrival: "XXX", hours: "not_early", direct: true }), {
    ...SIN_MOVER,
    out: -1,
    back: 2,
    arrival: "XXX",
    hours: "not_early",
    direct: true,
  });
  const campo = (crudo: unknown): string => {
    try {
      comprobarPedido(crudo);
      return "";
    } catch (error) {
      assert.ok(error instanceof PedidoQueNoVale);
      return error.message;
    }
  };
  assert.equal(campo({ out: 9 }), "out");
  assert.equal(campo({ back: 1.5 }), "back");
  assert.equal(campo({ departure: "no vale" }), "departure");
  assert.equal(campo({ hours: "midnight" }), "hours");
  assert.equal(campo({ direct: "yes" }), "direct");
  assert.equal(campo({ price: 1 }), "price");
  assert.equal(campo([]), "move");
  // «Sin madrugar» es salir de las nueve: por la hora del sitio de donde sale.
  assert.equal(enSuHorario({ sale: "2027-02-12T08:00:00+01:00" }, "not_early"), false);
  assert.equal(enSuHorario({ sale: "2027-02-12T09:00:00+01:00" }, "not_early"), true);
  assert.equal(enSuHorario({ sale: "2027-02-12" }, "morning"), false);
  assert.equal(enSuHorario({ sale: "2027-02-12" }, "any"), true);
  assert.deepEqual(Object.keys(HORARIOS), ["any", "not_early", "morning", "afternoon", "evening"]);
});

test("buscar otra vez: la parrilla, movida; cada opción, con sus noches, sus países y lo que cambia", async () => {
  const fuente = transporteInventado();
  const b = await buscarOtraVez(comparado(), fuente, SIN_MOVER);
  // Las de las fechas del viaje y las de alrededor, la más barata primero; la de dos escalas no entra.
  assert.deepEqual(
    b.opciones.map((o) => [o.vuelo.precio, o.nights.changed]),
    [
      [70, true],
      [90, true],
      [160, false],
    ],
  );
  const mismas = b.opciones.find((o) => !o.nights.changed)!;
  assert.deepEqual(mismas.changes, ["flight"]);
  assert.equal(mismas.difference, 0);
  assert.equal(mismas.total, 320);
  const antes = b.opciones[0];
  // Otro día: otras noches, y nunca un precio sumado a las de antes; es un cambio de fechas.
  assert.deepEqual(antes.changes, ["dates"]);
  assert.deepEqual(antes.nights, {
    check_in: moverDia(ESTANCIA.entrada, -1),
    check_out: moverDia(ESTANCIA.salida, -1),
    count: 3,
    changed: true,
  });
  assert.equal(antes.difference, -180);
  // Los sitios que se pueden pedir: los del viaje y los de alrededor, también los de otro país.
  assert.ok(b.buscado.llegada.some((l) => l.codigo === "XXX" && l.pais === "WW"));
  assert.ok(b.buscado.salida.some((l) => l.codigo === "OOO"));

  // Por otro aeropuerto, en otro país: sus papeles, también.
  const otro = await buscarOtraVez(comparado(), transporteInventado(), { ...SIN_MOVER, arrival: "XXX" });
  const allí = otro.opciones.find((o) => !o.nights.changed)!;
  assert.equal(allí.vuelo.destino, "XXX");
  assert.deepEqual(allí.new_countries, ["WW"]);
  assert.deepEqual(allí.changes, ["flight", "new_country"]);
  // Un sitio que no es de los que se pueden pedir no se busca.
  await assert.rejects(buscarOtraVez(comparado(), transporteInventado(), { ...SIN_MOVER, arrival: "QQQ" }), /arrival/);

  // El horario y los directos filtran, y se dice cuántas quedan fuera.
  const tarde = await buscarOtraVez(comparado(), transporteInventado(), { ...SIN_MOVER, hours: "evening" });
  assert.equal(tarde.opciones.length, 0);
  assert.equal(tarde.fueraPorLoPedido, 3);
  // Movida la ida un día después: la parrilla mira alrededor de las fechas nuevas.
  const movida = await buscarOtraVez(comparado(), transporteInventado(), { ...SIN_MOVER, out: 1, back: 1 });
  assert.equal(movida.buscado.ida, moverDia(ESTANCIA.entrada, 1));
  // Una vuelta antes de la ida no se busca, ni sin saber de dónde se sale.
  await assert.rejects(buscarOtraVez(comparado(), fuente, { ...SIN_MOVER, back: -3, out: 0 }), /back/);
  const sinOrigen = { ...ENTENDIDO, origin: null };
  await assert.rejects(buscarOtraVez(comparado({ entendido: sinOrigen }), fuente, SIN_MOVER), /origin/);
  // Sin transporte en el viaje, no hay diferencia que decir.
  const sinVuelo = await buscarOtraVez(comparado({ actual: null }), transporteInventado(), SIN_MOVER);
  assert.ok(sinVuelo.opciones.every((o) => o.difference === null));
});

async function viajeEnElMapa(): Promise<{ mesa: string; v: ViajeEnLaMesa }> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: ahora() });
  pasar(v, "confirmed", ahora());
  const run = nuevoRun(v, ahora());
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.hecho, true);
  return { mesa, v: leerViaje(v.ficha.id, "ana", mesa) };
}

/** Elige una opción de una búsqueda, rehace y lo lleva con asientos de mentira: los asientos que se lanzaron. */
async function elegirYLlevar(mesa: string, id: string, n: number, opcion: string) {
  const v = leerViaje(id, "ana", mesa);
  const pide = loQuePideLaOpcion(v, n, opcion);
  const { run } = rehacer(v, { ...pide, cuando: ahora() });
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
  return { run, asientos: [...new Set(asientos)].sort(), v: leerViaje(id, "ana", mesa), pide };
}

test("otro vuelo los mismos días, por otro país: la tabla, el que cruza y los papeles con él; nada más", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const uno = join(v.carpeta, "runs", "1");
    const antes = leerVersion(v)?.viaje as Viaje;
    // Abres el transporte: el vuelo, con sus horas, sus escalas y su precio con su fecha.
    const cara = transporteDeCara(v) as Record<string, any>;
    assert.equal(cara.transport.a, "VVV");
    assert.equal(cara.flight.out, `${ESTANCIA.entrada}T08:00:00Z`);
    assert.equal(cara.flight.stops_out, 0);
    assert.equal(cara.flight.saved, true);
    assert.equal(cara.none, null);
    assert.equal(cara.search, null);
    assert.deepEqual([cara.new_countries, cara.country_unknown], [[], false]);
    const b = await buscarElTransporte(v, transporteInventado(), { arrival: "XXX" }, ahora());
    assert.equal(b.version, 1);
    assert.deepEqual(readdirSync(join(v.carpeta, "transporte")), ["1.json"]);
    const opcion = b.opciones.find((o) => !o.nights.changed)!;
    const r = await elegirYLlevar(mesa, v.ficha.id, b.n, opcion.id);
    assert.deepEqual(r.pide.clases, ["flight", "new_country"]);
    assert.equal(r.pide.entendido, undefined);
    assert.deepEqual(r.asientos, ["papers", "trip-crosser", "trip-explainer"]);
    // La búsqueda del alojamiento y lo mirado, tal cual: las noches son las mismas.
    for (const nombre of ["busqueda.json", "mirar.json", "ruta.json", "sitios.json"])
      assert.equal(readFileSync(join(r.run, nombre), "utf8"), readFileSync(join(uno, nombre), "utf8"), nombre);
    assert.equal(pedidoDelTransporte(rehechoDe(r.run)?.pedido)?.flight.destino, "XXX");
    // La versión nueva llega por el otro aeropuerto, y los papeles miran también ese país.
    const nueva = leerVersion(r.v)?.viaje as Viaje;
    assert.equal(r.v.ficha.version, 2);
    assert.equal(nueva.transportes[0].a, "XXX");
    assert.ok(nueva.maneras.every((m) => m.transporte === nueva.transportes[0].id));
    assert.ok(papelesDelRun(r.run)?.casillas.some((c) => c.pais === "WW"));
    // La de antes no se pisa.
    assert.equal((leerVersion(r.v, 1)?.viaje as Viaje).transportes[0].a, "VVV");
    assert.deepEqual(r.v.ficha.versiones.at(-1)?.cambio, ["flight", "new_country"]);
    // Lo que cambió, con los números de las dos versiones; la búsqueda era de la de antes y ya no se elige.
    const despues = transporteDeCara(r.v) as Record<string, any>;
    assert.equal(despues.flight.to, "XXX");
    assert.equal(despues.search, null);
    assert.deepEqual(despues.before.ways, antesYAhora(antes, nueva));
    assert.equal(despues.before.version, 1);
    assert.throws(() => loQuePideLaOpcion(r.v, b.n, opcion.id), /old_search/);
    // Con sus papeles mirados, el tuyo no avisa de nada.
    assert.deepEqual(despues.new_countries, []);
    // La trampa de la revisión: el que tienes llega por un país que la tabla de los papeles no tiene, y nadie lo
    // decía. Ahora lo dice, sin cambiar nada.
    const enDisco = join(r.v.carpeta, "versiones", "2", "viaje.json");
    const sinWW = JSON.parse(readFileSync(enDisco, "utf8")) as Viaje;
    sinWW.papeles!.casillas = sinWW.papeles!.casillas.filter((c) => c.pais !== "WW");
    writeFileSync(enDisco, JSON.stringify(sinWW));
    assert.deepEqual((transporteDeCara(r.v) as Record<string, any>).new_countries, ["WW"]);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("un vuelo en otro día: otras noches, un cambio de fechas, y se busca otra vez dónde dormir", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const b = await buscarElTransporte(v, transporteInventado(), {}, ahora());
    const opcion = b.opciones.find((o) => o.nights.changed && o.vuelo.precio === 90)!;
    const r = await elegirYLlevar(mesa, v.ficha.id, b.n, opcion.id);
    assert.deepEqual(r.pide.clases, ["dates"]);
    assert.equal((r.pide.entendido as Entendido).dates.check_in, moverDia(ESTANCIA.entrada, 3));
    const nueva = leerVersion(r.v)?.viaje as Viaje;
    // El viaje es de las noches nuevas, y su vuelo es el de esas fechas: nada de otras noches.
    assert.equal(nueva.entrada, moverDia(ESTANCIA.entrada, 3));
    assert.equal(nueva.transportes[0].sale.slice(0, 10), nueva.entrada);
    assert.equal(nueva.transportes[0].precio.total, 180);
    const busqueda = leerJson(join(r.run, "busqueda.json"));
    assert.equal(busqueda.busqueda.estancia.entrada, nueva.entrada);
    assert.deepEqual(r.v.ficha.versiones.at(-1)?.cambio, ["dates"]);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("elegir pide una búsqueda de la versión que ves y una opción suya; sin fuente, no se busca", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const fallo = (f: () => unknown): string => {
      try {
        f();
        return "";
      } catch (error) {
        assert.ok(error instanceof FalloDelTransporte);
        return error.message;
      }
    };
    assert.equal(
      fallo(() => loQuePideLaOpcion(v, 1, "o1")),
      "bad_search",
    );
    const b = await buscarElTransporte(v, transporteInventado(), {}, ahora());
    assert.equal(
      fallo(() => loQuePideLaOpcion(v, b.n, "o99")),
      "bad_option",
    );
    assert.equal(
      fallo(() => loQuePideLaOpcion(v, "1", "o1")),
      "bad_search",
    );
    await assert.rejects(buscarElTransporte(v, undefined, {}, ahora()), /no_source/);
    // La trampa de la revisión: una búsqueda que falla después de preguntar a la fuente (aquí, un aeropuerto que la
    // fuente no tiene) también cuenta para su freno. La que falla en la fuente se guarda sin opciones, y cuenta.
    const intentos = (): number => leerDiario(v).filter((a) => a.que === "transport_search").length;
    const antes = intentos();
    const fuente = transporteInventado();
    await assert.rejects(buscarElTransporte(v, fuente, { arrival: "QQQ" }, ahora()), PedidoQueNoVale);
    assert.ok(fuente.pedidos.length > 0, "se le preguntó a la fuente");
    assert.equal(intentos(), antes + 1);
    assert.equal((await buscarElTransporte(v, transporteInventado({ falla: true }), {}, ahora())).opciones.length, 0);
    assert.equal(intentos(), antes + 2);
    // Lo que se elige sale de lo guardado: el precio es el que dijo la fuente.
    assert.equal(loQuePideLaOpcion(v, b.n, b.opciones[0].id).pedido.flight.precio, b.opciones[0].vuelo.precio);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el pedido del transporte en un run se lee con su forma, o no se lee", () => {
  const vuelo = vueloInventado(ESTANCIA.entrada, ESTANCIA.salida);
  assert.equal(pedidoDelTransporte({ moment: "transport", flight: vuelo, countries: ["WW"] })?.flight.precio, 160);
  assert.equal(pedidoDelTransporte({ moment: "lodging", flight: vuelo, countries: [] }), null);
  assert.equal(pedidoDelTransporte({ moment: "transport", flight: { ...vuelo, precio: "100" }, countries: [] }), null);
  assert.equal(pedidoDelTransporte({ moment: "transport", flight: vuelo, countries: ["ww"] }), null);
  assert.equal(pedidoDelTransporte(null), null);
});

test("cerrar con el transporte elegido: la manera lo lleva, con su total; de otra moneda, no", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = leerVersion(v)?.viaje as Viaje;
    const m = viaje.maneras[0];
    const otro = { ...viaje.transportes[0], id: "t2", precio: { ...viaje.transportes[0].precio, total: 150 } };
    const conDos: Viaje = { ...viaje, transportes: [...viaje.transportes, otro] };
    const cambiada = conTuTransporte(conDos, m, "t2");
    assert.equal(cambiada.transporte, "t2");
    assert.equal(cambiada.total, Math.round((m.total - viaje.transportes[0].precio.total + 150) * 100) / 100);
    assert.equal(conTuTransporte(conDos, m, null), m);
    assert.equal(conTuTransporte(conDos, m, m.transporte), m);
    assert.throws(() => conTuTransporte(conDos, m, "t9"));
    const ajeno = { ...otro, id: "t3", precio: { ...otro.precio, moneda: "USD" } };
    assert.throws(() => conTuTransporte({ ...conDos, transportes: [...conDos.transportes, ajeno] }, m, "t3"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la puerta: abrir el transporte, buscarlo otra vez y elegir, solo su dueño y con su freno", async () => {
  const { puertaALaWeb, CABECERA_DE_LA_SESION } = await import("../../agent/launcher/puerta_a_la_web.ts");
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => fuentesInventadas(),
    hoy: ahora,
    comprobarEnlace: async () => "ok",
    lanzadorDeLaCasa: lanzadorDeMentira(),
    correosDeLaCasa: ["ana@inventado.example"],
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
    const id = (await pide("POST", "/viajes", ana, { understood: ENTENDIDO })).cuerpo.trip.id as string;
    const dueno = leerJson(join(mesa, "viajes", id, "ficha.json")).dueno as string;
    // Antes de estar en el mapa no hay transporte que abrir ni que buscar.
    assert.equal((await pide("GET", `/viajes/${id}/transporte`, ana)).estado, 409);
    assert.equal((await pide("POST", `/viajes/${id}/transporte`, ana, { move: {} })).estado, 409);
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed", ahora());
    const run = nuevoRun(v, ahora());
    darElAdelante(run, null, ahora());
    await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);

    const abierto = await pide("GET", `/viajes/${id}/transporte`, ana);
    assert.equal(abierto.estado, 200);
    assert.equal(abierto.cuerpo.transport.flight.to, "VVV");
    assert.equal((await pide("GET", `/viajes/${id}/transporte`, otro)).estado, 404);
    assert.equal((await pide("POST", `/viajes/${id}/transporte`, otro, { move: {} })).estado, 404);

    const malo = await pide("POST", `/viajes/${id}/transporte`, ana, { move: { out: 30 } });
    assert.deepEqual([malo.estado, malo.cuerpo.error, malo.cuerpo.field], [400, "bad_move", "out"]);
    const buscada = await pide("POST", `/viajes/${id}/transporte`, ana, { move: { arrival: "XXX" } });
    assert.equal(buscada.estado, 200);
    const s = buscada.cuerpo.search;
    assert.equal(s.n, 1);
    const mismas = s.options.find((o: any) => !o.nights.changed);
    assert.deepEqual(mismas.changes, ["flight", "new_country"]);
    // Lo que se ve de la última búsqueda queda guardado.
    assert.equal((await pide("GET", `/viajes/${id}/transporte`, ana)).cuerpo.transport.search.n, 1);
    // El impacto de esa opción, antes de nada.
    const impacto = (await pide("POST", `/viajes/${id}/impacto`, ana, { changes: mismas.changes })).cuerpo.impact;
    assert.equal(impacto.spends, true);

    assert.equal(
      (await pide("POST", `/viajes/${id}/transporte/elegir`, otro, { search: 1, option: "o1" })).estado,
      404,
    );
    const mala = await pide("POST", `/viajes/${id}/transporte/elegir`, ana, { search: 1, option: "o99" });
    assert.deepEqual([mala.estado, mala.cuerpo.error], [400, "bad_option"]);
    const elegida = await pide("POST", `/viajes/${id}/transporte/elegir`, ana, { search: 1, option: mismas.id });
    assert.equal(elegida.estado, 202);
    assert.deepEqual(elegida.cuerpo.changes, ["flight", "new_country"]);
    await puerta.esperar();
    const despues = (await pide("GET", `/viajes/${id}/transporte`, ana)).cuerpo.transport;
    assert.equal(despues.version, 2);
    assert.equal(despues.flight.to, "XXX");
    assert.equal(despues.before.version, 1);

    // Cerrar cierra con el transporte que tienes; uno que no es del viaje no se cierra.
    const mal = await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "best_value", transport: "t9" });
    assert.deepEqual([mal.estado, mal.cuerpo.error], [400, "bad_transport"]);
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, { way: "best_value" })).estado, 202);
    await puerta.esperar();
    const cerrado = (await pide("GET", `/viajes/${id}/version`, ana)).cuerpo.trip as Viaje;
    assert.equal(cerrado.transportes.find((t) => t.id === cerrado.cierre?.transporte)?.a, "XXX");

    // El freno: tantas búsquedas por viaje en sus horas, contadas del diario.
    const otroViaje = (await pide("POST", "/viajes", ana, { understood: ENTENDIDO })).cuerpo.trip.id as string;
    const w = leerViaje(otroViaje, dueno, mesa);
    pasar(w, "confirmed", ahora());
    const run2 = nuevoRun(w, ahora());
    darElAdelante(run2, null, ahora());
    await llevar(run2, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run2);
    let ultimo = 200;
    for (let i = 0; i < 13; i++)
      ultimo = (await pide("POST", `/viajes/${otroViaje}/transporte`, ana, { move: {} })).estado;
    assert.equal(ultimo, 429);
    // Y elegir otro transporte, el suyo: tantas veces por viaje en sus horas, contadas del diario.
    for (let i = 0; i < ELECCIONES_DE_TRANSPORTE.deUnViaje; i++) apuntar(w, "transport_choice", {}, ahora());
    const frenada = await pide("POST", `/viajes/${otroViaje}/transporte/elegir`, ana, { search: 1, option: "o1" });
    assert.deepEqual([frenada.estado, frenada.cuerpo.error], [429, "too_many_choices"]);
    assert.equal(leerViaje(otroViaje, dueno, mesa).ficha.runs.length, 1, "no rehace nada");
    for (const idioma of ["en", "es"] as const)
      assert.notEqual(TEXTOS[idioma].transporte.fallo("too_many_choices"), TEXTOS[idioma].transporte.fallo("otra"));
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
});
