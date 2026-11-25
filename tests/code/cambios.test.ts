// Cambios (8.5): cambiar lo que pediste con las mismas preguntas de empezar, ya contestadas; el impacto, sin IA; tu
// adelante si gasta; rehacer solo lo que deja de valer, cada paso por su dueño; y la versión nueva, con la de antes
// intacta. Con el caso inventado y asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CAMBIOS, TOPE_DE_CAMBIOS } from "../../agent/data/momentos.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { pararRun } from "../../agent/launcher/investigar.ts";
import { apuntar, leerVersion, leerViaje, nuevoRun, pasar } from "../../agent/launcher/mesa.ts";
import { filasDe } from "../../agent/launcher/papeles.ts";
import { CABECERA_DE_LA_SESION, puertaALaWeb } from "../../agent/launcher/puerta_a_la_web.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { conElCambio, queTrae } from "../../agent/scripts/cambios.ts";
import { respuestasDeLoEntendido } from "../../agent/scripts/empezar.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { clasesDelCambio, filasDeLosPapeles, impactoDe } from "../../agent/scripts/impacto.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");
const TOQUES = ["Eat well", "Comer bien", "ver lo imprescindible"];

/** Lo entendido tras escuchar: con lo que escribió el viajero y la cita de cada gusto sacada de ahí. */
const ESCUCHADO: Entendido = {
  ...ENTENDIDO,
  said: {
    wants: "con un gimnasio de verdad, si puede ser, con vistas, y no me quiero ir sin subir al faro",
    booked: "",
    heard: true,
    answers: [],
  },
};

const pasos = (clases: Parameters<typeof impactoDe>[0]): string[] => impactoDe(clases).redo.map((x) => x.step);

// ---------- lo entendido de después, de las mismas preguntas

test("las preguntas de empezar, ya contestadas y sin tocar: no cambian nada", () => {
  for (const e of [ENTENDIDO, ESCUCHADO]) {
    const r = respuestasDeLoEntendido(e, TOQUES);
    const { entendido } = conElCambio(e, r, TOQUES);
    assert.ok(entendido !== null);
    assert.deepEqual(clasesDelCambio(e, entendido), []);
  }
  // Un destino de una región, con lo de moverse dicho: tampoco.
  const region: Entendido = {
    ...ESCUCHADO,
    destination: { ...ESCUCHADO.destination, kind: "region" },
    moving: { several_places: true, leave_country: null, how_much: null },
  };
  const { entendido } = conElCambio(region, respuestasDeLoEntendido(region, TOQUES), TOQUES);
  assert.deepEqual(clasesDelCambio(region, entendido!), []);
});

test("se toca solo lo que cambia: lo que sacó el que escucha y tus palabras se quedan", () => {
  const r = respuestasDeLoEntendido(ESCUCHADO, TOQUES);
  const fechas = conElCambio(ESCUCHADO, { ...r, entrada: "2027-03-12", salida: "2027-03-15" }, TOQUES).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, fechas), ["dates"]);
  assert.deepEqual(fechas.tastes, ESCUCHADO.tastes);
  assert.deepEqual(fechas.said, ESCUCHADO.said);
  assert.equal(fechas.destination.airport, "VVV");
  assert.equal(fechas.origin?.airport, "OOO");
  // Lo que buscas con tus palabras, que no es un toque, se queda también.
  assert.ok(fechas.looking_for.includes("comer bien"));
  // Lo que no se puede suponer sigue haciendo falta.
  const sinMoneda = conElCambio(ESCUCHADO, { ...r, moneda: null }, TOQUES);
  assert.equal(sinMoneda.entendido, null);
  assert.deepEqual(sinMoneda.falta, ["currency"]);
});

test("un viajero más: la habitación y el precio; los papeles, solo si cambian sus filas", () => {
  const r = respuestasDeLoEntendido(ESCUCHADO, TOQUES);
  const tres = conElCambio(ESCUCHADO, { ...r, adultos: 3, pasaportes: ["YY", "YY", "YY"] }, TOQUES).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, tres), ["travellers"]);
  assert.ok(!pasos(["travellers"]).includes("papers"));
  assert.ok(pasos(["travellers"]).includes("search"));
  assert.ok(!impactoDe(["travellers"]).pieces.includes("papers"));
  // Con otro pasaporte, o con un niño (su edad es otra fila), los papeles también.
  const otro = conElCambio(ESCUCHADO, { ...r, adultos: 3, pasaportes: ["YY", "YY", "XX"] }, TOQUES).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, otro), ["travellers", "passports"]);
  const nino = conElCambio(ESCUCHADO, { ...r, ninos: [7], pasaportes: ["YY", "YY", "YY"] }, TOQUES).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, nino), ["travellers", "passports"]);
  assert.ok(pasos(["travellers", "passports"]).includes("papers"));
  // Las filas del impacto son las de los papeles, sin contar cuántos viajan en cada una.
  for (const e of [
    ESCUCHADO,
    tres,
    otro,
    nino,
    { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, passports: [] } },
  ])
    assert.deepEqual(
      filasDeLosPapeles(e),
      filasDe(e).map((f) => ({ passport: f.passport, age: f.age })),
    );
});

test("un gasto menor, solo la tabla y lo que sale de ella; un gusto del alojamiento, igual", () => {
  const r = respuestasDeLoEntendido(ESCUCHADO, TOQUES);
  const menos = conElCambio(ESCUCHADO, { ...r, gasto: "tight" }, TOQUES).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, menos), ["budget"]);
  assert.deepEqual(pasos(["budget"]), ["table", "cross", "explain", "trip"]);
  assert.deepEqual(CAMBIOS.budget.pasos, ["table"]);
  // Otro peso a un gusto de una cosa del alojamiento.
  const peso = conElCambio(ESCUCHADO, r, TOQUES, [
    { thing: "gym", weight: "like", etiqueta: "A gym" },
    { thing: "views", weight: "like", etiqueta: "Views" },
  ]).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, peso), ["lodging_taste"]);
  assert.equal(peso.tastes.find((g) => g.thing === "gym")?.weight, "like");
  // Un gusto nuevo: su toque es su cita, y se suma a lo que escribiste para que esté ahí.
  const nuevo = conElCambio(ESCUCHADO, r, TOQUES, [
    { thing: "gym", weight: "must", etiqueta: "A gym" },
    { thing: "views", weight: "like", etiqueta: "Views" },
    { thing: "pool", weight: "must", etiqueta: "A pool" },
    { thing: "light", weight: "indifferent", etiqueta: "Light" },
  ]).entendido!;
  assert.deepEqual(clasesDelCambio(ESCUCHADO, nuevo), ["lodging_taste"]);
  assert.deepEqual(nuevo.tastes.at(-1), { thing: "pool", weight: "must", quote: "A pool" });
  assert.ok(nuevo.said!.wants.endsWith(". A pool"));
  assert.ok(!nuevo.tastes.some((g) => g.thing === "light"));
  // El gusto que no es del alojamiento (el faro) no se toca desde aquí.
  assert.ok(nuevo.tastes.some((g) => g.thing === "the lighthouse"));
  assert.deepEqual(pasos(["lodging_taste"]), ["table", "cross", "explain", "trip"]);
});

test("otro destino no es un cambio de un viaje: es un viaje nuevo", () => {
  const r = respuestasDeLoEntendido(ESCUCHADO, TOQUES);
  const otro = conElCambio(
    ESCUCHADO,
    { ...r, destino: { ...r.destino, nombre: "Otra Villa", centro: { lat: 11, lon: 21 } } },
    TOQUES,
  ).entendido!;
  assert.deepEqual(queTrae(ESCUCHADO, otro), { clases: ["destination"], viajeNuevo: true });
  assert.equal(queTrae(ESCUCHADO, ESCUCHADO).viajeNuevo, false);
});

// ---------- en la puerta de la casa, con asientos de mentira

type Pide = (
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
) => Promise<{ estado: number; cuerpo: Record<string, any> }>;

async function conLaPuerta(prueba: (x: { pide: Pide; mesa: string }) => Promise<void>) {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => fuentesInventadas(),
    hoy: ahora,
    lanzadorDeLaCasa: lanzadorDeMentira(),
    correosDeLaCasa: ["ana@inventado.example"],
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as { port: number }).port}`;
  let sesion: string | null = null;
  const pide: Pide = async (metodo, ruta, cuerpo) => {
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${LLAVE}`, ...(sesion === null ? {} : { [CABECERA_DE_LA_SESION]: sesion }) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const leido = (await r.json().catch(() => ({}))) as Record<string, any>;
    if (ruta === "/cuentas") sesion = leido.session as string;
    return { estado: r.status, cuerpo: leido };
  };
  try {
    await pide("POST", "/cuentas", { email: "ana@inventado.example", password: "una contraseña larga" });
    await prueba({ pide, mesa });
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
}

/** Un viaje en el mapa, investigado con asientos de mentira: su id y su dueño. */
async function enElMapa(
  pide: Pide,
  mesa: string,
  entendido: Entendido = ESCUCHADO,
): Promise<{ id: string; dueno: string }> {
  const id = (await pide("POST", "/viajes", { understood: entendido })).cuerpo.trip.id as string;
  const dueno = leerJson(join(mesa, "viajes", id, "ficha.json")).dueno as string;
  const v = leerViaje(id, dueno, mesa);
  pasar(v, "confirmed", ahora());
  const run = nuevoRun(v, ahora());
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.hecho, true);
  return { id, dueno };
}

/** Lo que lanzó un run, por su asiento: solo cuenta lo suyo. */
const lanzadosEn = (run: string): string[] =>
  !existsSync(join(run, "trabajos.json"))
    ? []
    : [
        ...new Set((leerJson(join(run, "trabajos.json")) as unknown as { asiento: string }[]).map((t) => t.asiento)),
      ].sort();

const igualQue = (a: string, b: string, nombre: string): void =>
  assert.equal(readFileSync(join(a, nombre), "utf8"), readFileSync(join(b, nombre), "utf8"), nombre);

test("la puerta: el impacto antes, tu adelante si gasta, y una versión nueva; la de antes, intacta", async () => {
  await conLaPuerta(async ({ pide, mesa }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    const para = await pide("GET", `/viajes/${id}/cambiar`);
    assert.equal(para.estado, 200);
    assert.equal(para.cuerpo.mode, "redo");
    assert.deepEqual(para.cuerpo.behind, { closed: null, guide: null });
    const antes = para.cuerpo.understood as Entendido;
    const r = respuestasDeLoEntendido(antes, TOQUES);

    // Unas fechas nuevas: gasta, así que sin tu adelante no se rehace nada, y se dice lo que costaría.
    const fechas = conElCambio(antes, { ...r, entrada: "2027-03-12", salida: "2027-03-15" }, TOQUES).entendido!;
    const sin = await pide("POST", `/viajes/${id}/cambiar`, { understood: fechas });
    assert.equal(sin.estado, 409);
    assert.equal(sin.cuerpo.error, "go_ahead_needed");
    assert.equal(sin.cuerpo.impact.spends, true);
    assert.deepEqual(sin.cuerpo.impact.keep, ["understood"]);
    assert.equal(typeof sin.cuerpo.impact.cost.usd, "number");
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);
    const con = await pide("POST", `/viajes/${id}/cambiar`, { understood: fechas, go_ahead: true });
    assert.equal(con.estado, 202, JSON.stringify(con.cuerpo));
    assert.equal(con.cuerpo.mode, "redo");
    assert.equal((await pide("POST", `/viajes/${id}/cambiar`, { understood: fechas })).cuerpo.error, "already_running");
    await esperarA(pide, id, 2);
    const v = leerViaje(id, dueno, mesa);
    const uno = join(v.carpeta, "runs", "1");
    const dos = join(v.carpeta, "runs", "2");
    // Cada paso por su dueño: el calendario, los papeles, las búsquedas, el que cruza y el ritmo, otra vez. El que
    // escucha, no: lo que entendió de tus palabras sigue valiendo.
    const lanzados = lanzadosEn(dos);
    assert.ok(!lanzados.includes("listener"));
    for (const a of ["calendar", "papers", "route-planner", "sights-picker", "lodging-viewer", "trip-crosser"])
      assert.ok(lanzados.includes(a), a);
    assert.equal((leerVersion(v)?.viaje as Viaje).entrada, "2027-03-12");
    assert.equal((leerVersion(v, 1)?.viaje as Viaje).entrada, ENTENDIDO.dates.check_in);
    assert.equal(v.ficha.versiones[1].cambio?.[0], "dates");
    // Lo escuchado sigue siendo lo que confirmaste, con las fechas de ahora: no se te vuelve a preguntar.
    assert.equal(leerJson(join(dos, "escuchado.json")).escuchado, leerJson(join(uno, "escuchado.json")).escuchado);
    assert.equal((await pide("GET", `/viajes/${id}/versiones`)).cuerpo.versions.length, 2);
  });
});

/** Espera a que el viaje tenga tantas versiones, con la casa llevando su run. */
async function esperarA(pide: Pide, id: string, versiones: number): Promise<void> {
  for (let i = 0; i < 400; i++) {
    const r = await pide("GET", `/viajes/${id}`);
    const trip = r.cuerpo.trip as { state: string; versions: unknown[] };
    if (trip.versions.length >= versiones && !r.cuerpo.research?.running && trip.state !== "researching") return;
    if (r.cuerpo.research?.stopped) assert.fail(`se paró: ${JSON.stringify(r.cuerpo.research.stopped)}`);
    await new Promise((x) => setTimeout(x, 20));
  }
  assert.fail("no llegó la versión");
}

test("la puerta: un viajero más, un gusto nuevo y un gasto menor; lo que se conserva y lo que se rehace", async () => {
  await conLaPuerta(async ({ pide, mesa }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    const carpeta = (n: number): string => join(leerViaje(id, dueno, mesa).carpeta, "runs", String(n));
    const cambia = async (despues: Entendido, versiones: number): Promise<string> => {
      const r = await pide("POST", `/viajes/${id}/cambiar`, { understood: despues, go_ahead: true });
      assert.equal(r.estado, 202, JSON.stringify(r.cuerpo));
      await esperarA(pide, id, versiones);
      return carpeta(versiones);
    };
    const base = (): Entendido => leerVersion(leerViaje(id, dueno, mesa))?.entendido as Entendido;
    const r = (): ReturnType<typeof respuestasDeLoEntendido> => respuestasDeLoEntendido(base(), TOQUES);

    // Un viajero más, con el mismo pasaporte: se busca otra vez y se miran los que salgan; ni los papeles, ni los
    // sitios, ni la ruta, ni los avisos de las fechas. La tabla de los papeles cuenta a los tres.
    const tres = conElCambio(base(), { ...r(), adultos: 3, pasaportes: ["YY", "YY", "YY"] }, TOQUES).entendido!;
    const dos = await cambia(tres, 2);
    assert.deepEqual(lanzadosEn(dos), ["lodging-viewer", "trip-crosser", "trip-explainer"]);
    for (const nombre of ["sitios.json", "ruta.json", "calendario.json", "caminos.json"])
      igualQue(carpeta(1), dos, nombre);
    const papeles = leerJson(join(dos, "papeles.json"));
    assert.deepEqual(papeles.entrega, leerJson(join(carpeta(1), "papeles.json")).entrega);
    assert.equal(papeles.viajeros[0].cuantos, 3);
    const viaje = leerVersion(leerViaje(id, dueno, mesa))?.viaje as Viaje;
    assert.equal(viaje.papeles?.viajeros[0].cuantos, 3);

    // Un gusto nuevo del alojamiento: solo la tabla y lo que sale de ella. Ni se busca ni se mira.
    const gusto = conElCambio(base(), r(), TOQUES, [
      ...base()
        .tastes.filter((g) => g.thing === "gym" || g.thing === "views")
        .map((g) => ({ thing: g.thing, weight: g.weight, etiqueta: g.quote })),
      { thing: "pool", weight: "must", etiqueta: "A pool" },
    ]).entendido!;
    const tresR = await cambia(gusto, 3);
    assert.deepEqual(lanzadosEn(tresR), ["trip-crosser", "trip-explainer"]);
    for (const nombre of ["busqueda.json", "mirar.json", "como_es.json", "papeles.json", "dias.json"])
      igualQue(dos, tresR, nombre);

    // Un gasto menor: igual, la tabla y lo que sale de ella.
    const menos = conElCambio(base(), { ...r(), gasto: "tight" }, TOQUES).entendido!;
    const cuatro = await cambia(menos, 4);
    assert.deepEqual(lanzadosEn(cuatro), ["trip-crosser", "trip-explainer"]);
    igualQue(tresR, cuatro, "busqueda.json");
    const v = leerViaje(id, dueno, mesa);
    assert.deepEqual(
      v.ficha.versiones.map((x) => x.cambio?.[0] ?? null),
      [null, "travellers", "lodging_taste", "budget"],
    );
    // Las versiones de antes, con lo suyo.
    assert.equal((leerVersion(v, 1)?.entendido as Entendido).travellers.adults, 2);
    assert.equal((leerVersion(v, 4)?.entendido as Entendido).budget, "tight");
  });
});

test("la puerta: sin gasto, sin adelante; otro destino, nada igual o lo que no es tuyo, no", async () => {
  await conLaPuerta(async ({ pide, mesa }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    const antes = (await pide("GET", `/viajes/${id}/cambiar`)).cuerpo.understood as Entendido;
    const r = respuestasDeLoEntendido(antes, TOQUES);
    // Otro destino: un viaje nuevo; este no se toca.
    const lejos = conElCambio(antes, { ...r, destino: { ...r.destino, nombre: "Otra Villa" } }, TOQUES).entendido!;
    assert.equal(
      (await pide("POST", `/viajes/${id}/cambiar`, { understood: lejos, go_ahead: true })).cuerpo.error,
      "new_trip",
    );
    assert.equal(
      (await pide("POST", `/viajes/${id}/cambiar`, { understood: antes, go_ahead: true })).cuerpo.error,
      "nothing_changed",
    );
    const malo = { ...antes, dates: { ...antes.dates, check_out: "2020-01-01" } };
    const turbio = await pide("POST", `/viajes/${id}/cambiar`, { understood: malo, go_ahead: true });
    assert.equal(turbio.estado, 422);
    assert.ok(turbio.cuerpo.fields.length > 0);
    assert.equal((await pide("POST", `/viajes/no-es-mio/cambiar`, { understood: antes })).estado, 404);
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);
    // El ritmo es código: no gasta, y se rehace sin tu adelante.
    const calma = { ...antes, pace: "calm" as const };
    assert.equal(impactoDe(["pace"]).spends, false);
    const hecho = await pide("POST", `/viajes/${id}/cambiar`, { understood: calma });
    assert.equal(hecho.estado, 202, JSON.stringify(hecho.cuerpo));
    await esperarA(pide, id, 2);
    const v = leerViaje(id, dueno, mesa);
    assert.deepEqual(lanzadosEn(join(v.carpeta, "runs", "2")), []);
    assert.equal(v.ficha.versiones[1].cambio?.[0], "pace");
    // El tope de cambios de un viaje: pasado, se dice y no se rehace.
    for (let i = 0; i < TOPE_DE_CAMBIOS.deUnViaje; i++) apuntar(v, "change", { prueba: i }, ahora());
    const tope = await pide("POST", `/viajes/${id}/cambiar`, { understood: antes, go_ahead: true });
    assert.deepEqual([tope.estado, tope.cuerpo.error], [429, "too_many_changes"]);
  });
});

test("la puerta: tras cerrar, el cierre se queda atrás; tras un cambio parado, se parte de la versión", async () => {
  await conLaPuerta(async ({ pide, mesa }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, { way: "cheapest" })).estado, 202);
    for (let i = 0; i < 400 && leerViaje(id, dueno, mesa).ficha.estado !== "closed"; i++)
      await new Promise((x) => setTimeout(x, 20));
    assert.equal(leerViaje(id, dueno, mesa).ficha.estado, "closed");
    const antes = (await pide("GET", `/viajes/${id}/cambiar`)).cuerpo.understood as Entendido;
    const menos = { ...antes, budget: "tight" as const };
    assert.equal((await pide("POST", `/viajes/${id}/cambiar`, { understood: menos, go_ahead: true })).estado, 202);
    await esperarA(pide, id, 3);
    const tras = await pide("GET", `/viajes/${id}/cambiar`);
    assert.deepEqual(tras.cuerpo.behind, { closed: 2, guide: null });
    assert.equal(leerViaje(id, dueno, mesa).ficha.estado, "on_map");

    // Un cambio que se para deja el viaje investigando: cambiar lo que pediste parte de la versión que se enseña.
    const otra = { ...menos, budget: "comfortable" as const };
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "researching", ahora());
    pararRun(join(v.carpeta, "runs", String(v.ficha.runs.length)), "table", "una prueba", [
      { donde: "house", que: "parado a propósito" },
    ]);
    const parado = await pide("GET", `/viajes/${id}/cambiar`);
    assert.equal(parado.cuerpo.mode, "redo");
    assert.equal(parado.cuerpo.understood.budget, "tight");
    assert.equal((await pide("POST", `/viajes/${id}/cambiar`, { understood: otra, go_ahead: true })).estado, 202);
    await esperarA(pide, id, 4);
    assert.equal(leerViaje(id, dueno, mesa).ficha.versiones.at(-1)?.de, 3);
  });
});

test("la puerta: una primera investigación parada se empieza otra vez, siempre con tu adelante", async () => {
  await conLaPuerta(async ({ pide, mesa }) => {
    const id = (await pide("POST", "/viajes", { understood: ESCUCHADO })).cuerpo.trip.id as string;
    // Sin investigar, no hay nada que cambiar así: se cambian las preguntas.
    assert.equal((await pide("GET", `/viajes/${id}/cambiar`)).estado, 409);
    const dueno = leerJson(join(mesa, "viajes", id, "ficha.json")).dueno as string;
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed", ahora());
    const run = nuevoRun(v, ahora());
    pararRun(run, "route", "una prueba", [{ donde: "house", que: "parado a propósito" }]);
    const para = await pide("GET", `/viajes/${id}/cambiar`);
    assert.equal(para.cuerpo.mode, "again");
    const otras = { ...ESCUCHADO, dates: { ...ESCUCHADO.dates, check_in: "2027-03-12", check_out: "2027-03-15" } };
    const sin = await pide("POST", `/viajes/${id}/cambiar`, { understood: otras });
    assert.deepEqual([sin.cuerpo.error, sin.cuerpo.impact], ["go_ahead_needed", null]);
    const con = await pide("POST", `/viajes/${id}/cambiar`, { understood: otras, go_ahead: true });
    assert.equal(con.estado, 202, JSON.stringify(con.cuerpo));
    assert.equal(con.cuerpo.mode, "again");
    await esperarA(pide, id, 1);
    const w = leerViaje(id, dueno, mesa);
    assert.equal((leerVersion(w)?.viaje as Viaje).entrada, "2027-03-12");
    assert.equal(w.ficha.runs.length, 2);
  });
});

// ---------- un cambio que se para (la revisión de la tanda 6)

/** Una puerta cuyo que cruza falla mientras se le diga: para parar a propósito un cambio. */
async function conUnaPuertaQueFalla(
  prueba: (x: { pide: Pide; mesa: string; falla: { si: boolean } }) => Promise<void>,
): Promise<void> {
  const falla = { si: false };
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => fuentesInventadas(),
    hoy: ahora,
    lanzadorDeLaCasa: lanzadorDeMentira({
      falla: (asiento) => (falla.si && asiento === "trip-crosser" ? "rompe" : null),
    }),
    correosDeLaCasa: ["ana@inventado.example"],
    comprobarEnlace: async () => "ok",
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as { port: number }).port}`;
  let sesion: string | null = null;
  const pide: Pide = async (metodo, ruta, cuerpo) => {
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${LLAVE}`, ...(sesion === null ? {} : { [CABECERA_DE_LA_SESION]: sesion }) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const leido = (await r.json().catch(() => ({}))) as Record<string, any>;
    if (ruta === "/cuentas") sesion = leido.session as string;
    return { estado: r.status, cuerpo: leido };
  };
  try {
    await pide("POST", "/cuentas", { email: "ana@inventado.example", password: "una contraseña larga" });
    await prueba({ pide, mesa, falla });
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
}

/** Espera a que la investigación del viaje se pare, sin nadie llevándola. */
async function esperarParado(pide: Pide, id: string): Promise<Record<string, any>> {
  for (let i = 0; i < 400; i++) {
    const r = await pide("GET", `/viajes/${id}`);
    if (r.cuerpo.research?.stopped && !r.cuerpo.research.running) return r.cuerpo;
    await new Promise((x) => setTimeout(x, 20));
  }
  assert.fail("no se paró");
}

test("un cambio que se para: el viaje sigue como su versión, se ve, se elige, se vuelve y se reintenta", async () => {
  await conUnaPuertaQueFalla(async ({ pide, mesa, falla }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    const antes = (await pide("GET", `/viajes/${id}/cambiar`)).cuerpo.understood as Entendido;
    falla.si = true;
    const menos = { ...antes, budget: "tight" as const };
    assert.equal((await pide("POST", `/viajes/${id}/cambiar`, { understood: menos, go_ahead: true })).estado, 202);
    const parado = await esperarParado(pide, id);
    // El viaje está como su versión: en el mapa, con lo entendido de ella, y se dice que tu cambio se paró.
    assert.equal(parado.trip.state, "on_map");
    assert.equal(parado.trip.version, 1);
    assert.equal(parado.understood.budget, antes.budget);
    assert.deepEqual(parado.research.change, { from: 1, run: 2 });
    // Nada ha cambiado: sus piezas no están por rehacer.
    const piezas = (await pide("GET", `/viajes/${id}/piezas`)).cuerpo.pieces;
    assert.ok(!JSON.stringify(piezas).includes('"redo"'));
    // Se elige y se vuelve a la versión, como siempre; el run parado no se pierde.
    assert.equal(
      (await pide("PUT", `/viajes/${id}/elecciones`, { version: 1, choices: { way: "cheapest" } })).estado,
      200,
    );
    assert.equal((await pide("POST", `/viajes/${id}/volver`, { version: 1 })).estado, 200);
    const v = leerViaje(id, dueno, mesa);
    assert.equal(v.ficha.runs.length, 2);
    assert.ok(existsSync(join(v.carpeta, "runs", "2", "parado.json")));
    // Volver a intentarlo repite solo el paso que paró, y sale la versión 2.
    falla.si = false;
    const otra = await pide("POST", `/viajes/${id}/reintentar`);
    assert.equal(otra.estado, 202, JSON.stringify(otra.cuerpo));
    await esperarA(pide, id, 2);
    const w = leerViaje(id, dueno, mesa);
    assert.equal(w.ficha.runs.length, 2);
    assert.equal((leerVersion(w)?.entendido as Entendido).budget, "tight");
    assert.equal(leerJson(join(w.carpeta, "entendido.json")).budget, "tight");
  });
});

test("un cambio parado de un viaje cerrado: sigue cerrado; y no se reintenta si ya no es de la versión", async () => {
  await conUnaPuertaQueFalla(async ({ pide, mesa, falla }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, { way: "cheapest" })).estado, 202);
    for (let i = 0; i < 400 && leerViaje(id, dueno, mesa).ficha.estado !== "closed"; i++)
      await new Promise((x) => setTimeout(x, 20));
    const antes = (await pide("GET", `/viajes/${id}/cambiar`)).cuerpo.understood as Entendido;
    falla.si = true;
    const menos = { ...antes, budget: "tight" as const };
    assert.equal((await pide("POST", `/viajes/${id}/cambiar`, { understood: menos, go_ahead: true })).estado, 202);
    const parado = await esperarParado(pide, id);
    assert.equal(parado.trip.state, "closed");
    assert.equal(parado.trip.version, 2);
    // Con el viaje cerrado, lo que hay que reservar se sigue viendo, y la guía se puede pedir.
    assert.equal((await pide("GET", `/viajes/${id}/version`)).estado, 200);
    assert.notEqual((await pide("POST", `/viajes/${id}/guia`, {})).cuerpo.error, "not_closed");
    await new Promise((x) => setTimeout(x, 50));
    // Vuelves a la versión 1: el cambio parado era de la 2, y ya no se reintenta.
    for (let i = 0; i < 200 && (await pide("POST", `/viajes/${id}/volver`, { version: 1 })).estado !== 200; i++)
      await new Promise((x) => setTimeout(x, 20));
    assert.equal(leerViaje(id, dueno, mesa).ficha.version, 1);
    falla.si = false;
    const r = await pide("POST", `/viajes/${id}/reintentar`);
    assert.deepEqual([r.estado, r.cuerpo.error], [409, "not_now"]);
    assert.equal(leerViaje(id, dueno, mesa).ficha.estado, "on_map");
  });
});

test("un cambio a medias que nadie lleva tras un corte: se para, y el viaje queda como estaba", async () => {
  await conUnaPuertaQueFalla(async ({ pide, mesa }) => {
    const { id, dueno } = await enElMapa(pide, mesa);
    // Una investigación que rehace abierta y sin nadie que la lleve: así la deja una casa que se cortó.
    const { rehacer } = await import("../../agent/launcher/rehacer.ts");
    const { run } = rehacer(leerViaje(id, dueno, mesa), { clases: ["budget"], cuando: ahora() });
    darElAdelante(run, null, ahora());
    assert.equal(leerViaje(id, dueno, mesa).ficha.estado, "researching");
    const r = await pide("GET", `/viajes/${id}`);
    assert.equal(r.cuerpo.trip.state, "on_map");
    assert.ok(r.cuerpo.research.stopped);
    assert.deepEqual(r.cuerpo.research.change, { from: 1, run: 2 });
    assert.equal((await pide("POST", `/viajes/${id}/reintentar`)).estado, 202);
    await esperarA(pide, id, 2);
  });
});
