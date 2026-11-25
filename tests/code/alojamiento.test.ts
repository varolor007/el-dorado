// El alojamiento, a ratos (8.2): tus gustos cruzados al instante, la búsqueda otra vez con otra zona, otros mínimos u
// otro tope, mirar solo a los nuevos (y a pocos), el que cruza otra vez, tu elección hasta el cierre, y una pregunta
// sobre un alojamiento con su prueba y su puerta. Con el caso inventado y asientos de mentira: sin internet y sin
// gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { NUEVOS_QUE_SE_MIRAN, ZONA_QUE_SE_PIDE } from "../../agent/data/alojamiento.ts";
import { pegasDeLaPregunta, puertaRespuesta } from "../../agent/gates/puerta_respuesta.ts";
import {
  buscarConLoPedido,
  carpetaDeLaPregunta,
  conTusGustos,
  gastoDeUnaMirada,
  impactoDelAlojamiento,
  llevarLaPregunta,
  pedirPregunta,
  preguntaDeCara,
  tusGustosDePartida,
} from "../../agent/launcher/alojamiento.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { elegir } from "../../agent/launcher/cerrar.ts";
import {
  abrirViaje,
  leerVersion,
  leerViaje,
  nuevoCierre,
  nuevoRun,
  pasar,
  type ViajeEnLaMesa,
} from "../../agent/launcher/mesa.ts";
import { guardarElecciones, leerElecciones } from "../../agent/launcher/momentos.ts";
import { rehacer } from "../../agent/launcher/rehacer.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import {
  centroDeLoQueVes,
  comprobarPedido,
  conTuAlojamiento,
  gustosConLosTuyos,
  MARCADO,
  PedidoQueNoVale,
  type PedidoDeAlojamiento,
} from "../../agent/scripts/alojamiento.ts";
import type { Busqueda } from "../../agent/scripts/busqueda_alojamiento.ts";
import type { FuenteAlojamiento } from "../../agent/tools/fuentes/tipos.ts";
import { fuenteDeDosBarrios, fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ALOJAMIENTOS, PRECIOS, precioPara } from "../cases/inventado/inventado.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

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

const viajeDe = (v: ViajeEnLaMesa): Viaje => leerVersion(v)?.viaje as Viaje;
const NADA: PedidoDeAlojamiento = { zone: null, minimums: null, max_price: null, tastes: null };

/** Rehace con lo pedido desde la ficha y lo lleva con asientos de mentira: el run y los asientos que se lanzaron. */
async function pedirYLlevar(
  mesa: string,
  id: string,
  pedido: PedidoDeAlojamiento,
  fuentes = fuentesInventadas(),
): Promise<{ run: string; lanzados: string[]; avisos: string[]; v: ViajeEnLaMesa }> {
  const v = leerViaje(id, "ana", mesa);
  const busca = pedido.zone !== null || pedido.minimums !== null || pedido.max_price !== null;
  const { run } = rehacer(v, { clases: busca ? ["lodging"] : ["lodging_taste"], pedido: { lodging: pedido } });
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentes, lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
  return { run, lanzados: asientos, avisos: r.avisos, v: leerViaje(id, "ana", mesa) };
}

// ---------- lo pedido, en código

test("lo que pides desde la ficha se mira antes de llegar a una fuente: cada campo, en sus topes", () => {
  const destino = { lat: 10, lon: 20 };
  assert.deepEqual(comprobarPedido({ max_price: 250.456 }, destino), { ...NADA, max_price: 250.46 });
  const zona = { lat: 10.01, lon: 20.01, radius_m: 1000 };
  assert.deepEqual(comprobarPedido({ zone: zona }, destino).zone, zona);
  const no = (crudo: unknown, campo: string): void =>
    assert.throws(
      () => comprobarPedido(crudo, destino),
      (e: unknown) => e instanceof PedidoQueNoVale && e.message === campo,
    );
  no({}, "search");
  no({ zone: { ...zona, radius_m: 10 } }, "zone");
  no({ zone: { ...zona, radius_m: ZONA_QUE_SE_PIDE.radioMaximo + 1 } }, "zone");
  // Una zona en la otra punta del mundo no es de este viaje.
  no({ zone: { lat: -40, lon: 100, radius_m: 1000 } }, "zone");
  no({ minimums: { score: 11, reviews: 10, stars: 3 } }, "minimums");
  no({ minimums: { score: 8, reviews: 10.5, stars: 3 } }, "minimums");
  no({ max_price: -1 }, "max_price");
  no(
    {
      tastes: [
        { thing: "gym", weight: "must" },
        { thing: "gym", weight: "like" },
      ],
    },
    "tastes",
  );
  no({ tastes: [{ thing: "the lighthouse", weight: "must" }] }, "tastes");
  no({ max_price: 100, otra: 1 }, "otra");
});

test("los gustos que marcas mandan sobre los de lo entendido, con su marca y sin palabras que no escribiste", () => {
  const g = gustosConLosTuyos(ENTENDIDO.tastes, [
    { thing: "gym", weight: "indifferent" },
    { thing: "pool", weight: "like" },
  ]);
  assert.equal(g.find((x) => x.thing === "gym")?.weight, "indifferent");
  // La cita de lo que sí dijo se queda; lo que solo marcó lleva su marca.
  assert.equal(g.find((x) => x.thing === "gym")?.quote, "con un gimnasio de verdad");
  assert.equal(g.find((x) => x.thing === "pool")?.quote, MARCADO);
  // Lo que no es una cosa del alojamiento, como estaba.
  assert.ok(g.some((x) => x.thing === "the lighthouse"));
  assert.equal(gustosConLosTuyos(ENTENDIDO.tastes, null), ENTENDIDO.tastes);
});

test("la búsqueda con lo pedido: en tu zona y sin ensanchar, con tus mínimos sin bajarlos, y hasta tu tope", () => {
  const base = {
    donde: [{ id: "z1", nombre: "z1", lat: 1, lon: 2, radio: 800 }],
    minimos: [],
    radios: [1, 3],
    tope: null,
  };
  const run = mkdtempSync(join(tmpdir(), "el-dorado-run-"));
  try {
    // Sin rehacer por la ficha, la de siempre.
    assert.deepEqual(buscarConLoPedido(run, base), base);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

// ---------- tus gustos, al instante

test("tus gustos al instante, en código: con los de partida, lo de la versión; lo imprescindible, fuera", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const tal = conTusGustos(v, null)!;
    // Con los gustos con que se hizo, la nota y el descarte de cada uno son los de la versión: la misma cuenta.
    for (const a of viaje.alojamientos) {
      const c = tal.find((x) => x.id === a.id)!;
      assert.equal(c.score, a.puntos ?? null, a.id);
      assert.equal(c.discarded?.clase ?? null, a.descartado?.clase ?? null, a.id);
    }
    assert.deepEqual(tusGustosDePartida(v), [
      { thing: "gym", weight: "must" },
      { thing: "views", weight: "like" },
    ]);
    const descartado = viaje.alojamientos.find((a) => a.descartado != null)!;
    assert.equal(descartado.descartado?.cosa, "gym");
    // Si el gimnasio te da igual, ya no lo descarta; si quieres vistas sí o sí, descarta a quien da a la calle.
    const sinGym = conTusGustos(v, [{ thing: "gym", weight: "indifferent" }])!;
    assert.equal(sinGym.find((x) => x.id === descartado.id)?.discarded, null);
    const conVistas = conTusGustos(v, [{ thing: "views", weight: "must" }])!;
    const aLaCalle = viaje.alojamientos.filter((a) => a.comoEs.some((x) => x.campo === "view" && x.nivel === "street"));
    assert.ok(aLaCalle.length > 0);
    for (const a of aLaCalle) assert.notEqual(conVistas.find((x) => x.id === a.id)?.discarded ?? null, null, a.id);
    const conVistasSinGym = conTusGustos(v, [
      { thing: "views", weight: "must" },
      { thing: "gym", weight: "indifferent" },
    ])!;
    for (const a of aLaCalle) assert.equal(conVistasSinGym.find((x) => x.id === a.id)?.discarded?.cosa, "views");
    // No gasta ni guarda nada.
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.runs.length, 1);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- otra búsqueda

test("otro tope de gasto: la misma búsqueda; a quien ya se miró no se le mira, y lo de antes se queda", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = viajeDe(v);
    const r = await pedirYLlevar(mesa, v.ficha.id, { ...NADA, max_price: 260 });
    const { busqueda } = leerJson(join(r.run, "busqueda.json")) as { busqueda: Busqueda };
    assert.ok(busqueda.finalistas.length > 0);
    assert.ok(busqueda.finalistas.every((f) => f.precioCompleto <= 260));
    // Todos los finalistas ya se habían mirado: no se lanza al que mira, y su mirada pasa otra vez sus puertas.
    assert.ok(!r.lanzados.includes("lodging-viewer"));
    assert.deepEqual([...new Set(r.lanzados)].sort(), ["trip-crosser", "trip-explainer"]);
    const comoEs = leerJson(join(r.run, "como_es.json")) as {
      alojamientos: { pasadas: { comoEs: { verde: boolean } }[] }[];
    };
    assert.ok(comoEs.alojamientos.every((a) => a.pasadas.every((p) => p.comoEs.verde)));
    // Una versión nueva; en ella, solo lo de ese tope. La de antes, como estaba.
    assert.equal(r.v.ficha.version, 2);
    const despues = viajeDe(r.v);
    assert.ok(despues.alojamientos.every((a) => a.precio.total <= 260));
    assert.deepEqual(leerVersion(r.v, 1)?.viaje, antes);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

/** La fuente inventada con tres alojamientos más, baratos y que cumplen: salen como candidatos nuevos. */
function conNuevos(): FuenteAlojamiento {
  const base = fuenteDeDosBarrios();
  const nuevos = ["n1", "n2", "n3"].map((id, i) => ({ ...ALOJAMIENTOS[1], id, nombre: `Nuevo ${i + 1}` }));
  return {
    ...base,
    async lista(...a) {
      return [...(await base.lista(...a)), ...nuevos];
    },
    async precios(ids, e) {
      const deLosNuevos = nuevos
        .filter((x) => ids.includes(x.id))
        .map((x, i) => precioPara({ ...PRECIOS[0], id: x.id, total: 100 + i }, e));
      return [...(await base.precios(ids, e)), ...deLosNuevos];
    },
  };
}

test("otra zona con candidatos nuevos: se mira a pocos, los demás, sin mirar, y se cruza otra vez", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const zona = { lat: viaje.destino.punto.lat, lon: viaje.destino.punto.lon, radius_m: 2000 };
    const r = await pedirYLlevar(
      mesa,
      v.ficha.id,
      { ...NADA, zone: zona },
      { ...fuentesInventadas(), alojamiento: conNuevos() },
    );
    const { busqueda } = leerJson(join(r.run, "busqueda.json")) as { busqueda: Busqueda };
    // Se buscó en la zona pedida, tal cual, sin ensanchar.
    assert.deepEqual(
      busqueda.zonas?.map((z) => [z.lat, z.lon, z.radio]),
      [[zona.lat, zona.lon, zona.radius_m]],
    );
    // Los nuevos son los finalistas que no se habían mirado en la versión de la que se parte.
    const mirados = new Set(viaje.alojamientos.filter((a) => a.comoEs.length > 0).map((a) => a.id));
    const ids = busqueda.finalistas.map((f) => f.alojamiento.id);
    const nuevos = ids.filter((id) => !mirados.has(id));
    assert.ok(nuevos.length > NUEVOS_QUE_SE_MIRAN && nuevos.includes("n1"));
    // Del que mira, una pasada por cada nuevo que cabe, y no más; el que cruza y el que explica, otra vez.
    assert.equal(r.lanzados.filter((a) => a === "lodging-viewer").length, NUEVOS_QUE_SE_MIRAN);
    assert.ok(r.lanzados.includes("trip-crosser") && r.lanzados.includes("trip-explainer"));
    const { quienes } = leerJson(join(r.run, "mirar.json")) as { quienes: { alojamiento: string }[] };
    assert.equal(quienes.length, ids.filter((id) => mirados.has(id)).length + NUEVOS_QUE_SE_MIRAN);
    assert.ok(r.avisos.some((x) => x.includes("se quedan sin mirar")));
    // El que no cupo va al viaje sin su ficha de cómo es.
    const sinMirar = nuevos.find((id) => !quienes.some((q) => q.alojamiento === id))!;
    assert.deepEqual(viajeDe(r.v).alojamientos.find((a) => a.id === sinMirar)?.comoEs, []);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("tus gustos, en las maneras: se cruza y se explica otra vez con ellos, sin buscar ni mirar", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const descartado = viajeDe(v).alojamientos.find((a) => a.descartado != null)!;
    const r = await pedirYLlevar(mesa, v.ficha.id, { ...NADA, tastes: [{ thing: "gym", weight: "indifferent" }] });
    assert.deepEqual([...new Set(r.lanzados)].sort(), ["trip-crosser", "trip-explainer"]);
    assert.equal(viajeDe(r.v).alojamientos.find((a) => a.id === descartado.id)?.descartado, null);
    // Y la versión nueva parte de esos gustos.
    assert.equal(tusGustosDePartida(r.v).find((g) => g.thing === "gym")?.weight, "indifferent");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("lo que cuesta, antes: una mirada por cada nuevo que cabe, no una investigación entera", () => {
  const estimado = {
    "lodging-viewer": { usd: 0.75, de: 1 },
    "trip-crosser": { usd: 0.05, de: 1 },
    "trip-explainer": { usd: 0.1, de: 1 },
  };
  const otra = impactoDelAlojamiento({ ...NADA, max_price: 100 }, estimado, 0.15);
  assert.equal(otra.impact.cost.usd, Math.round((0.15 * NUEVOS_QUE_SE_MIRAN + 0.15) * 100) / 100);
  assert.deepEqual(otra.looks, { at_most: NUEVOS_QUE_SE_MIRAN, each_usd: 0.15 });
  assert.ok(otra.impact.redo.some((x) => x.step === "look"));
  // Sin saber lo de una mirada, no se dice una cifra.
  assert.equal(impactoDelAlojamiento({ ...NADA, max_price: 100 }, estimado, null).impact.cost.usd, null);
  const gustos = impactoDelAlojamiento({ ...NADA, tastes: [] }, estimado, 0.15);
  assert.ok(!gustos.impact.redo.some((x) => x.step === "look" || x.step === "search"));
  assert.equal(gustos.looks.at_most, 0);
});

// ---------- tu elección, hasta el cierre

test("tu elección: otro alojamiento de los que hay, guardado sin versión nueva; el cierre cierra con él", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const m = viaje.maneras.find((x) => x.id === "cheapest")!;
    const otro = viaje.alojamientos.find((a) => a.id !== m.alojamiento && a.descartado == null)!;
    const con = conTuAlojamiento(viaje, m, otro.id);
    const suyo = viaje.alojamientos.find((a) => a.id === m.alojamiento)!;
    assert.equal(con.total, Math.round((m.total - suyo.precio.total + otro.precio.total) * 100) / 100);
    assert.equal(conTuAlojamiento(viaje, m, null), m);
    const descartado = viaje.alojamientos.find((a) => a.descartado != null)!;
    assert.throws(() => conTuAlojamiento(viaje, m, descartado.id), /bad_lodging/);
    guardarElecciones(v, { way: "cheapest", lodging: otro.id }, ahora());
    assert.equal(leerElecciones(v).lodging, otro.id);
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.versiones.length, 1);
    const cierre = nuevoCierre(v, ahora());
    const e = elegir(v, cierre.carpeta, "cheapest", ahora(), { alojamiento: otro.id });
    assert.equal(e.alojamiento, otro.id);
    assert.throws(() => elegir(v, cierre.carpeta, "cheapest", ahora(), { alojamiento: "no-esta" }), /bad_lodging/);
    // El de la manera no se apunta: no es otro.
    assert.equal(elegir(v, cierre.carpeta, "cheapest", ahora(), { alojamiento: m.alojamiento }).alojamiento, undefined);
    assert.deepEqual(centroDeLoQueVes(viaje).lat > 0, true);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- una pregunta sobre un alojamiento

test("una pregunta: el que mira contesta con su material y su prueba, y su frase pasa su puerta", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const mirado = viaje.alojamientos.find((a) => a.comoEs.length > 0)!;
    assert.throws(() => pedirPregunta(v, { alojamiento: mirado.id, pregunta: "x" }), /bad_question/);
    assert.throws(() => pedirPregunta(v, { alojamiento: "no-esta", pregunta: "Has it a gym?" }), /bad_lodging/);
    const p = pedirPregunta(v, { alojamiento: mirado.id, pregunta: "Does the gym have free weights?", hoy: ahora() });
    const carpeta = carpetaDeLaPregunta(v, p.n);
    const e = await llevarLaPregunta(v, p.n, lanzadorDeMentira());
    assert.deepEqual(e, { estado: "ready" });
    // El puesto tuvo el mismo material que cuando se miró, y la pregunta.
    const dentro = readdirSync(join(carpeta, "puestos", "pregunta-v1", "in")).sort();
    assert.ok(dentro.includes("question.json") && dentro.includes("sheet.json") && dentro.includes("photos"));
    const cara = preguntaDeCara(v, false)!;
    assert.equal(cara.state, "ready");
    assert.equal(cara.answer, "yes");
    assert.equal(cara.says, "The gym photo shows free weights on a rack.");
    assert.equal(cara.evidence[0].kind, "photo");
    assert.match(cara.evidence[0].photo ?? "", /^https:/);
    // Lo que gastó cuenta para estimar la siguiente.
    assert.equal(gastoDeUnaMirada("ana", mesa), 0.05);
    // Sin adelante, nada arranca.
    const q = pedirPregunta(v, { alojamiento: mirado.id, pregunta: "Is it quiet at night?", hoy: ahora() });
    rmSync(join(carpetaDeLaPregunta(v, q.n), "adelante.json"));
    const sin = await llevarLaPregunta(v, q.n, lanzadorDeMentira());
    assert.equal(sin.estado, "stopped");
    assert.ok(!existsSync(join(carpetaDeLaPregunta(v, q.n), "respuesta.json")));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la puerta de la respuesta: de su lista, con su prueba, y una frase sin enlaces ni promesas", () => {
  const material = {
    hoja: { lodging_id: "a1" },
    fotos: ["hotel-01.jpg", "room-01.jpg"],
    opiniones: ["r1", "r2"],
    pregunta: "q1",
    textoDeLaPregunta: "Does the gym have free weights?",
    textoDeLasOpiniones: "[]",
  };
  const buena = {
    seat: "lodging-viewer",
    mode: "question",
    lodging_id: "a1",
    question_id: "q1",
    about: "lodging",
    answer: "partly",
    evidence: [{ kind: "review", ref: "r2", what: "a guest mentions dumbbells only" }],
    says: "A guest mentions dumbbells, but no photo shows a bench.",
    unknowns: [],
  };
  assert.equal(puertaRespuesta(buena, material).verde, true);
  const rojo = (cambio: Record<string, unknown>, donde: string): void => {
    const v = puertaRespuesta({ ...buena, ...cambio }, material);
    assert.ok(
      v.rojos.some((r) => r.donde === donde),
      `${donde}: ${JSON.stringify(v.rojos)}`,
    );
  };
  rojo({ answer: "maybe" }, "answer");
  rojo({ evidence: [] }, "evidence");
  rojo({ evidence: [{ kind: "photo", ref: "hotel-09.jpg", what: "a gym" }] }, "evidence[0]");
  rojo({ evidence: [{ kind: "review", ref: "r9", what: "a gym" }] }, "evidence[0]");
  rojo({ says: "Book now at www.example.com" }, "says");
  rojo({ says: "Call +34 600 000 000 to ask" }, "says");
  rojo({ lodging_id: "a2" }, "lodging_id");
  rojo({ question_id: "q2" }, "question_id");
  rojo({ otra: 1 }, "otra");
  // Sin saber, sin prueba: vale.
  assert.equal(puertaRespuesta({ ...buena, answer: "unknown", evidence: [] }, material).verde, true);
  assert.deepEqual(pegasDeLaPregunta("Does the gym have free weights?", 200), []);
  assert.notDeepEqual(pegasDeLaPregunta("see https://example.com", 200), []);
  assert.notDeepEqual(pegasDeLaPregunta("a".repeat(201), 200), []);
});

test("la puerta de la respuesta: sin dinero, con los números de su material y la habitación con su foto", () => {
  const material = {
    hoja: { lodging_id: "a1", room: { size_m2: 22 }, services: ["pool"] },
    fotos: ["hotel-01.jpg", "room-01.jpg"],
    opiniones: ["r1"],
    pregunta: "q1",
    textoDeLaPregunta: "Is the pool open all year?",
    textoDeLasOpiniones: JSON.stringify([{ ref: "r1", text: "the pool is about 12 m long and open from 8" }]),
  };
  const buena = {
    seat: "lodging-viewer",
    mode: "question",
    lodging_id: "a1",
    question_id: "q1",
    about: "lodging",
    answer: "partly",
    evidence: [{ kind: "review", ref: "r1", what: "a guest says it is 12 m long and opens at 8" }],
    says: "A guest says the pool is about 12 m long and opens at 8, nothing about the winter.",
    unknowns: [],
  };
  const verde = (cambio: Record<string, unknown>, m = material): boolean =>
    puertaRespuesta({ ...buena, ...cambio }, m).verde;
  assert.equal(verde({}), true);
  // Las trampas que encontró la revisión: un precio y un descuento inventados.
  assert.equal(verde({ says: "A day pass costs 45 euros, and the pool is 12 m long." }), false);
  assert.equal(verde({ says: "Te hacemos un 20 % de descuento si reservas hoy." }), false);
  assert.equal(verde({ says: "The pool is 30 m long." }), false, "un número que no sale de su material");
  assert.equal(verde({ says: "It has a pool for €10." }), false);
  assert.equal(verde({ says: "Book today and get a discount." }), false);
  assert.equal(verde({ says: "Photo room-01 and review r1 say the room is 22 m2." }), true, "sus referencias valen");
  // MI4: una pregunta de la habitación no se prueba con una foto del hotel, ni se dice que es del alojamiento.
  const deLaHabitacion = { ...material, textoDeLaPregunta: "Does the room have a view of the sea?" };
  const conFotoDelHotel = { evidence: [{ kind: "photo", ref: "hotel-01.jpg", what: "a sea view" }] };
  assert.equal(verde({ about: "room", ...conFotoDelHotel }, deLaHabitacion), false);
  assert.equal(verde(conFotoDelHotel, deLaHabitacion), false, "dice que es del alojamiento, y no lo es");
  assert.equal(verde({ about: "room", ...conFotoDelHotel }), false, "dice que es de la habitación");
  const conFotoDeLaSuya = { evidence: [{ kind: "photo", ref: "room-01.jpg", what: "the sea from the window" }] };
  assert.equal(
    verde({ about: "room", ...conFotoDeLaSuya, says: "The room photo shows the sea." }, deLaHabitacion),
    true,
  );
  assert.equal(verde({ about: "kitchen" }), false);
});

// ---------- la puerta de la casa

test("la puerta: tus gustos, lo que costaría, otra búsqueda y una pregunta, solo para su dueño", async () => {
  const { puertaALaWeb, CABECERA_DE_LA_SESION } = await import("../../agent/launcher/puerta_a_la_web.ts");
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const lanzador = lanzadorDeMentira();
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => fuentesInventadas(),
    hoy: ahora,
    comprobarEnlace: async () => "ok",
    lanzadorDeLaCasa: lanzador,
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
    // Antes de estar en el mapa, nada de esto.
    assert.equal((await pide("POST", `/viajes/${id}/gustos`, ana, {})).estado, 409);
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed", ahora());
    const run = nuevoRun(v, ahora());
    darElAdelante(run, null, ahora());
    await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    const viaje = viajeDe(leerViaje(id, dueno, mesa));

    // Tus gustos, al instante: sin gastar ni guardar.
    const gustos = await pide("POST", `/viajes/${id}/gustos`, ana, {
      tastes: [{ thing: "gym", weight: "indifferent" }],
    });
    assert.equal(gustos.estado, 200);
    assert.ok(gustos.cuerpo.lodgings.every((x: { discarded: unknown }) => x.discarded === null));
    assert.equal(gustos.cuerpo.from[0].thing, "gym");
    assert.equal((await pide("POST", `/viajes/${id}/gustos`, ana, { tastes: [{ thing: "sauna" }] })).estado, 400);
    assert.equal((await pide("POST", `/viajes/${id}/gustos`, otro, {})).estado, 404);

    // Lo que costaría, sin cambiar nada; lo que no vale, por su campo.
    const imp = await pide("POST", `/viajes/${id}/alojamiento/impacto`, ana, { search: { max_price: 260 } });
    assert.equal(imp.estado, 200);
    assert.equal(imp.cuerpo.looks.at_most, NUEVOS_QUE_SE_MIRAN);
    assert.equal(imp.cuerpo.impact.spends, true);
    const mal = await pide("POST", `/viajes/${id}/alojamiento/impacto`, ana, { search: { zone: { lat: 0 } } });
    assert.deepEqual([mal.estado, mal.cuerpo.error, mal.cuerpo.field], [400, "bad_search", "zone"]);
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);

    // Una pregunta, con tu adelante: la contesta el que mira, y la frase llega a la web.
    const mirado = viaje.alojamientos.find((a) => a.comoEs.length > 0)!;
    const pregunta = { lodging: mirado.id, question: "Does the gym have free weights?" };
    assert.equal((await pide("POST", `/viajes/${id}/alojamiento/pregunta`, otro, pregunta)).estado, 404);
    const mala = await pide("POST", `/viajes/${id}/alojamiento/pregunta`, ana, { ...pregunta, question: "" });
    assert.deepEqual([mala.estado, mala.cuerpo.error], [400, "bad_question"]);
    assert.equal((await pide("POST", `/viajes/${id}/alojamiento/pregunta`, ana, pregunta)).estado, 202);
    await puerta.esperar();
    const contestada = (await pide("GET", `/viajes/${id}/alojamiento/pregunta`, ana)).cuerpo;
    assert.equal(contestada.question.state, "ready");
    assert.equal(contestada.question.answer, "yes");
    assert.equal(contestada.each_usd, 0.05);

    // Otra búsqueda, con tu adelante: una versión nueva, y la de antes se queda.
    const hecho = await pide("POST", `/viajes/${id}/alojamiento`, ana, { search: { max_price: 260 } });
    assert.equal(hecho.estado, 202, JSON.stringify(hecho.cuerpo));
    await puerta.esperar();
    const w = leerViaje(id, dueno, mesa);
    assert.equal(w.ficha.version, 2);
    assert.ok(viajeDe(w).alojamientos.every((a) => a.precio.total <= 260));
    assert.equal((await pide("POST", `/viajes/${id}/alojamiento`, otro, { search: { max_price: 260 } })).estado, 404);
    assert.equal((await pide("POST", `/viajes/${id}/alojamiento`, ana, { search: {} })).cuerpo.field, "search");

    // Tu elección llega al cierre: se cierra con el alojamiento que elegiste, y con su total.
    const nuevo = viajeDe(w);
    const m = nuevo.maneras.find((x) => x.id === "cheapest") ?? nuevo.maneras[0];
    const otroAlojamiento = nuevo.alojamientos.find((a) => a.id !== m.alojamiento && a.descartado == null);
    if (otroAlojamiento !== undefined) {
      const choices = { way: m.id, lodging: otroAlojamiento.id };
      assert.equal((await pide("PUT", `/viajes/${id}/elecciones`, ana, { choices })).estado, 200);
      assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, {})).estado, 202);
      await puerta.esperar();
      const cerrado = (await pide("GET", `/viajes/${id}/version`, ana)).cuerpo.trip as Viaje;
      assert.equal(cerrado.cierre?.alojamiento, otroAlojamiento.id);
      assert.equal(cerrado.maneras.find((x) => x.id === m.id)?.alojamiento, otroAlojamiento.id);
    }
    assert.ok(readFileSync(join(mesa, "viajes", id, "diario.jsonl"), "utf8").includes("lodging_change"));
  } finally {
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
});
