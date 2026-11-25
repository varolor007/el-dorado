// La casa por momentos (8.1): tus elecciones guardadas en la casa, el estado de cada pieza, el impacto de un cambio,
// rehacer solo lo que dejó de valer, las versiones con volver a una de antes, y quién responde dónde. Con el caso
// inventado y asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { CAMBIOS, CLASES_DE_CAMBIO, DEL_RUN, LEE, LO_QUE_DEJA, REHECHO } from "../../agent/data/momentos.ts";
import { CODIGO, PASOS } from "../../agent/data/pasos.ts";
import { LA_CASA, QUIEN_RESPONDE, quienResponde } from "../../agent/data/responde.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { gastoPorAsiento } from "../../agent/launcher/gasto.ts";
import { sigue } from "../../agent/launcher/investigar.ts";
import {
  abrirViaje,
  leerDiario,
  leerVersion,
  leerViaje,
  nuevoRun,
  pasar,
  volverA,
  type ViajeEnLaMesa,
} from "../../agent/launcher/mesa.ts";
import {
  estadoDelViaje,
  guardarElecciones,
  leerElecciones,
  porRehacer,
  versionesDe,
} from "../../agent/launcher/momentos.ts";
import { FalloAlRehacer, rehacer, rehechoDe } from "../../agent/launcher/rehacer.ts";
import { apuntarTrabajo } from "../../agent/launcher/trabajos.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import {
  comprobarElecciones,
  diasElegidos,
  EleccionQueNoVale,
  paraElCierre,
  SIN_ELEGIR,
} from "../../agent/scripts/elecciones.ts";
import { estadoDe, estadoDelPrecio } from "../../agent/scripts/estado.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { clasesDelCambio, impactoDe, pasosQueSeRehacen } from "../../agent/scripts/impacto.ts";
import { fechasDe, repartir } from "../../agent/scripts/ritmo.ts";
import { conTusDias } from "../../agent/scripts/cierre.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson, trabaja } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const CONTRATOS = resolve(import.meta.dirname, "..", "..", "agent", "contracts");
const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

// ---------- quién responde

test("quién responde: cada asiento de la tabla tiene contrato, y cada contrato de cara al viajero sale", () => {
  const asientos = readdirSync(CONTRATOS).filter((x) => x !== "common");
  const nombrados = new Set(
    QUIEN_RESPONDE.flatMap((x) => [x.responde, x.mensaje, x.alFinal]).filter(
      (x): x is string => typeof x === "string" && x !== LA_CASA && x !== "piece_owner",
    ),
  );
  for (const a of nombrados) assert.ok(asientos.includes(a), `${a} no tiene contrato`);
  // El conductor y el de la ruta no le hablan al viajero: el uno mira un run parado; el otro, lo que da el código.
  for (const a of asientos.filter((x) => x !== "conductor" && x !== "route-planner"))
    assert.ok(nombrados.has(a), `${a} no responde en ningún sitio`);
  assert.equal(new Set(QUIEN_RESPONDE.map((x) => x.sitio)).size, QUIEN_RESPONDE.length);
  // Lo que dice la hoja: el día, el código y, con un mensaje, el del día a día; un cambio, la casa y luego cada dueño.
  assert.deepEqual(quienResponde("day"), { sitio: "day", responde: LA_CASA, mensaje: "sights-picker" });
  assert.equal(quienResponde("change")?.alFinal, "piece_owner");
  assert.equal(quienResponde("no_such_place"), null);
});

// ---------- el impacto

test("los datos del impacto: cada paso lee pasos que existen, y cada clase de cambio tira pasos que existen", () => {
  const ids = PASOS.map((p) => p.id);
  for (const [id, lee] of Object.entries(LEE)) {
    assert.ok(ids.includes(id), id);
    for (const x of lee) assert.ok(ids.includes(x), `${id} lee ${x}`);
  }
  for (const c of CLASES_DE_CAMBIO)
    for (const x of [...CAMBIOS[c].pasos, ...CAMBIOS[c].quizas]) assert.ok(ids.includes(x));
  for (const id of ids) assert.ok(id in LO_QUE_DEJA, `${id} no dice lo que deja`);
});

test("el impacto, como en la hoja: fechas nuevas rehacen casi todo; un viajero más, la habitación y el precio", () => {
  const fechas = impactoDe(["dates"]);
  assert.deepEqual(fechas.keep, ["understood"]);
  assert.ok(fechas.pieces.includes("prices") && fechas.pieces.includes("date_warnings"));
  // Un viajero más: la búsqueda, y lo que sale de ella; ni los días ni los avisos de las fechas, ni los papeles.
  const uno = impactoDe(["travellers"]);
  assert.deepEqual(
    uno.redo.map((x) => x.step),
    ["search", "look", "table", "cross", "explain", "trip"],
  );
  assert.ok(uno.pieces.includes("lodging") && uno.pieces.includes("prices"));
  // Los papeles, solo si cambian sus filas (8.5): otro pasaporte, u otra edad.
  assert.ok(!uno.pieces.includes("papers"));
  assert.ok(!uno.pieces.includes("days") && !uno.pieces.includes("date_warnings"));
  // Un gusto de donde duermes: solo el alojamiento y las maneras; nada de buscar otra vez ni de mirar.
  const gusto = impactoDe(["lodging_taste"]);
  assert.deepEqual(
    gusto.redo.map((x) => x.step),
    ["table", "cross", "explain", "trip"],
  );
  assert.deepEqual(gusto.pieces, ["lodging", "ways", "guide"]);
  // Quién hace cada paso: el código o su asiento. Y el que escucha no se rehace nunca por un cambio.
  assert.deepEqual(gusto.redo[0], { step: "table", who: CODIGO });
  assert.deepEqual(gusto.redo[1], { step: "cross", who: "trip-crosser" });
  for (const c of CLASES_DE_CAMBIO) assert.ok(!pasosQueSeRehacen([c]).includes("understood"), c);
  // Sin cambio, nada que rehacer.
  assert.deepEqual(pasosQueSeRehacen([]), []);
  // Solo el ritmo: código, sin IA, y no gasta.
  const ritmo = impactoDe(["pace"]);
  assert.equal(ritmo.spends, false);
  assert.ok(ritmo.redo.every((x) => x.who === CODIGO));
  // Otro transporte puede tirar los papeles, si hay otra escala: se dice, y no se rehacen solos.
  assert.deepEqual(impactoDe(["transport"]).maybe, [{ step: "papers", who: "papers" }]);
});

test("las clases de un cambio salen de comparar lo entendido de antes con el de después", () => {
  const con = (cambio: Partial<Entendido>): Entendido => ({ ...ENTENDIDO, ...cambio });
  assert.deepEqual(clasesDelCambio(ENTENDIDO, ENTENDIDO), []);
  assert.deepEqual(clasesDelCambio(ENTENDIDO, con({ dates: { ...ENTENDIDO.dates, check_in: "2027-03-04" } })), [
    "dates",
  ]);
  const tres = con({ travellers: { ...ENTENDIDO.travellers, adults: 3, passports: ["YY", "YY", "YY"] } });
  assert.deepEqual(clasesDelCambio(ENTENDIDO, tres), ["travellers"]);
  const otro = con({ travellers: { ...ENTENDIDO.travellers, adults: 3, passports: ["YY", "YY", "XX"] } });
  assert.deepEqual(clasesDelCambio(ENTENDIDO, otro), ["travellers", "passports"]);
  // Un gusto de una cosa del alojamiento, y uno que no lo es.
  const gym = ENTENDIDO.tastes.map((g) => (g.thing === "gym" ? { ...g, weight: "like" as const } : g));
  assert.deepEqual(clasesDelCambio(ENTENDIDO, con({ tastes: gym })), ["lodging_taste"]);
  const faro = ENTENDIDO.tastes.filter((g) => g.thing !== "the lighthouse");
  assert.deepEqual(clasesDelCambio(ENTENDIDO, con({ tastes: faro })), ["taste"]);
  // Lo que no se sabe leer se rehace entero.
  const raro = { ...ENTENDIDO, algo: 1 } as unknown as Entendido;
  assert.deepEqual(clasesDelCambio(ENTENDIDO, raro), ["other"]);
  assert.deepEqual(impactoDe(["other"]).keep, ["understood"]);
});

test("lo que costaría rehacer: lo que gastó de media cada asiento en esa cuenta, o que no se sabe", () => {
  const estimado = { "lodging-viewer": { usd: 0.25, de: 2 }, "trip-crosser": { usd: 0.05, de: 2 } };
  const sin = impactoDe(["lodging"], estimado);
  assert.equal(sin.cost.usd, null);
  assert.deepEqual(sin.cost.unknown, ["trip-explainer"]);
  const con = impactoDe(["lodging"], { ...estimado, "trip-explainer": { usd: 0.1, de: 1 } });
  assert.equal(con.cost.usd, 0.4);
  assert.equal(con.spends, true);
});

// ---------- un viaje inventado en una mesa, hecho con asientos de mentira

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

/** Lo que hay en una carpeta, archivo a archivo con su contenido: para ver que una versión no se ha tocado. */
function foto(carpeta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) for (const [k, x] of Object.entries(foto(ruta))) salida[`${nombre}/${k}`] = x;
    else salida[nombre] = readFileSync(ruta, "utf8");
  }
  return salida;
}

/** Rehace con un cambio y lo lleva con asientos de mentira: los puestos que se lanzaron, por su asiento. */
async function rehacerYLlevar(
  mesa: string,
  id: string,
  clases: Parameters<typeof rehacer>[1]["clases"],
  entendido?: Entendido,
): Promise<{ run: string; asientos: string[]; v: ViajeEnLaMesa }> {
  const { run } = rehacer(leerViaje(id, "ana", mesa), { clases, entendido, cuando: ahora() });
  darElAdelante(run, null, ahora());
  const lanzador = lanzadorDeMentira();
  const r = await llevar(run, fuentesInventadas(), lanzador);
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  const sellos = readdirSync(join(run, "sellos"));
  const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
  assert.ok(sellos.length >= r.lanzados.length);
  return { run, asientos: [...new Set(asientos)].sort(), v: leerViaje(id, "ana", mesa) };
}

test("lo que deja un run está dicho: cada archivo es de un paso o del run entero", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const run = join(v.carpeta, "runs", "1");
    const conocidos = [...Object.values(LO_QUE_DEJA).flat(), ...DEL_RUN];
    for (const nombre of readdirSync(run)) {
      const es = statSync(join(run, nombre)).isDirectory() ? `${nombre}/` : nombre;
      assert.ok(conocidos.includes(es) || /\.puertas\.json$/.test(nombre), `${es} no es de nadie`);
    }
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("otro alojamiento: se busca, se mira y se cruza otra vez; la ruta, los sitios y los avisos, no", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = foto(join(v.carpeta, "versiones", "1"));
    const uno = join(v.carpeta, "runs", "1");
    const r = await rehacerYLlevar(mesa, v.ficha.id, ["lodging"]);
    assert.deepEqual(r.asientos, ["lodging-viewer", "trip-crosser", "trip-explainer"]);
    // Lo que se conserva es lo de antes, tal cual: no se volvió a pedir.
    for (const nombre of ["sitios.json", "ruta.json", "papeles.json", "calendario.json", "escuchado.json"])
      assert.equal(readFileSync(join(r.run, nombre), "utf8"), readFileSync(join(uno, nombre), "utf8"), nombre);
    // Ni sus trabajos ni su gasto: el run nuevo solo cuenta lo que lanzó.
    const trabajos = leerJson(join(r.run, "trabajos.json")) as unknown as { asiento: string }[];
    assert.ok(trabajos.every((t) => r.asientos.includes(t.asiento)));
    // Una versión nueva, que dice de cuál viene y por qué; la de antes, intacta.
    assert.equal(r.v.ficha.version, 2);
    assert.deepEqual(versionesDe(r.v).at(-1), {
      n: 2,
      when: r.v.ficha.versiones[1].cuando,
      why: "change",
      from: 1,
      changes: ["lodging"],
      shown: true,
    });
    assert.deepEqual(foto(join(v.carpeta, "versiones", "1")), antes);
    assert.deepEqual(rehechoDe(r.run)?.conserva, [
      "understood",
      "sights",
      "route",
      "papers",
      "pick",
      "days",
      "calendar",
    ]);
    assert.ok(leerDiario(r.v).some((a) => a.que === "redo"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("un día con un mensaje tuyo: el del día a día otra vez; no se busca ni se mira", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const uno = join(v.carpeta, "runs", "1");
    const r = await rehacerYLlevar(mesa, v.ficha.id, ["day"]);
    // Con lo que eligió, la tabla decide lo mismo: el que cruza y el que explica se quedan con lo suyo (8.6).
    assert.deepEqual(r.asientos, ["sights-picker"]);
    for (const nombre of ["busqueda.json", "mirar.json", "como_es.json", "ruta.json"])
      assert.equal(readFileSync(join(r.run, nombre), "utf8"), readFileSync(join(uno, nombre), "utf8"), nombre);
    // Los que miraron cada alojamiento siguen ahí, con lo que entregaron: no se les vuelve a lanzar.
    assert.ok(existsSync(join(r.run, "puestos", "a1-p1", "out", "delivery.json")));
    assert.equal(r.v.ficha.versiones.at(-1)?.cambio?.[0], "day");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("otras fechas: casi todo otra vez, con lo entendido nuevo; lo escuchado no se vuelve a preguntar", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const nuevas = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: "2027-03-12", check_out: "2027-03-15" } };
    assert.deepEqual(clasesDelCambio(ENTENDIDO, nuevas), ["dates"]);
    const r = await rehacerYLlevar(mesa, v.ficha.id, ["dates"], nuevas);
    assert.ok(!r.asientos.includes("listener"));
    for (const a of ["route-planner", "papers", "calendar", "sights-picker", "lodging-viewer", "trip-crosser"])
      assert.ok(r.asientos.includes(a), a);
    const viaje = leerVersion(r.v)?.viaje as Viaje;
    assert.equal(viaje.entrada, "2027-03-12");
    assert.equal((leerVersion(r.v, 1)?.viaje as Viaje).entrada, ENTENDIDO.dates.check_in);
    assert.equal(leerJson(join(r.v.carpeta, "entendido.json")).dates.check_in, "2027-03-12");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("un corte de la casa a medio rehacer se retoma: no se relanza lo que entregó ni lo que se conserva", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    // Un corte de antes al abrir el run: una carpeta a medias y otra con su número que la ficha no conoce.
    mkdirSync(join(v.carpeta, "runs", ".2.a-medias"), { recursive: true });
    cpSync(join(v.carpeta, "runs", "1"), join(v.carpeta, "runs", "2"), { recursive: true });
    const { run } = rehacer(v, { clases: ["lodging"], cuando: ahora() });
    assert.ok(!existsSync(join(v.carpeta, "runs", ".2.a-medias")));
    assert.ok(!existsSync(join(run, "busqueda.json")));
    darElAdelante(run, null, ahora());
    // La casa da los pasos de código y monta a los que miran; uno entrega y la casa se corta mientras trabajaba.
    await sigue(run, fuentesInventadas());
    trabaja(run, "a1-p1");
    apuntarTrabajo(run, {
      puesto: "a1-p1",
      asiento: "lodging-viewer",
      estado: "working",
      desde: ahora().toISOString(),
      hasta: null,
      gasto: null,
      fallo: null,
    });
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador);
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true);
    assert.ok(!r.lanzados.includes("a1-p1"));
    const lanzados = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento);
    for (const a of ["route-planner", "sights-picker", "papers", "calendar", "listener"])
      assert.ok(!lanzados.includes(a), a);
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.version, 2);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("rehacer pide un viaje en el mapa y algo que rehacer; mientras no acaba, sus piezas, por rehacer", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    assert.throws(
      () => rehacer(v, { clases: [] }),
      (e) => e instanceof FalloAlRehacer && e.message === "nothing_to_redo",
    );
    const malo = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_out: "2020-01-01" } };
    assert.throws(() => rehacer(v, { clases: ["dates"], entendido: malo, cuando: ahora() }), /unclear/);
    const { run } = rehacer(v, { clases: ["lodging_taste"], cuando: ahora() });
    assert.equal(existsSync(join(run, REHECHO)), true);
    const w = leerViaje(v.ficha.id, "ana", mesa);
    // El run nuevo no ha acabado: lo que deja sin valer está por rehacer, en la versión que se enseña.
    assert.deepEqual(porRehacer(w), ["lodging", "ways", "guide"]);
    assert.equal(Object.values(estadoDelViaje(w, ahora())!.lodging)[0], "redo");
    assert.throws(() => rehacer(w, { clases: ["lodging"] }), /not_on_map/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("lo que gastó cada asiento en una cuenta: con ello se estima lo que cuesta rehacer", async () => {
  const { mesa } = await viajeEnElMapa();
  try {
    const g = gastoPorAsiento("ana", mesa);
    // Cada asiento de mentira dice 0,05 dólares; los que miran son cinco en el run.
    assert.equal(g["trip-crosser"].usd, 0.05);
    assert.equal(Math.round(g["lodging-viewer"].usd * 100) / 100, 0.25);
    assert.deepEqual(gastoPorAsiento("otro", mesa), {});
    assert.equal(impactoDe(["lodging"], g).cost.usd, 0.35);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- tus elecciones, y el estado de cada pieza

test("tus elecciones se miran contra el viaje, y de ellas salen tus días, como en la web", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = leerVersion(v)?.viaje as Viaje;
    const [p1, p2] = viaje.paradas.map((p) => p.id);
    const no = (crudo: unknown, campo: string): void =>
      assert.throws(
        () => comprobarElecciones(viaje, crudo),
        (e) => e instanceof EleccionQueNoVale && e.message === campo,
      );
    no({ way: "the_best" }, "way");
    no({ lodging: "no-such" }, "lodging");
    no({ removed: [p1, p1] }, "removed");
    no({ removed: [p1], added: [p1] }, "added");
    no({ moved: { [p2]: 99 } }, "moved");
    no({ tastes: [{ thing: "spa", weight: "must" }] }, "tastes");
    no({ algo: 1 }, "algo");
    assert.deepEqual(comprobarElecciones(viaje, {}), SIN_ELEGIR);
    assert.equal(paraElCierre(viaje, SIN_ELEGIR), null);
    const e = comprobarElecciones(viaje, { way: "cheapest", pace: "full", removed: [p1], moved: { [p2]: 0 } });
    // El mismo reparto que hace la web, desde donde duermes con esa manera.
    const cama = viaje.alojamientos.find((a) => a.id === viaje.maneras.find((m) => m.id === "cheapest")?.alojamiento);
    const web = repartir(
      viaje.paradas,
      fechasDe(viaje.entrada, viaje.salida),
      "full",
      cama!.punto,
      { quitadas: [p1], anadidas: [], fijadas: { [p2]: 0 } },
      viaje.caminos,
    );
    assert.deepEqual(
      diasElegidos(viaje, e),
      web.dias.map((d) => ({ fecha: d.fecha, paradas: d.paradas })),
    );
    assert.ok(!diasElegidos(viaje, e).some((d) => d.paradas.includes(p1)));
    assert.equal(diasElegidos(viaje, e)[0].paradas.includes(p2), true);
    const cierre = paraElCierre(viaje, e)!;
    assert.equal(conTusDias(viaje, cierre.dias, cierre.ritmo).ritmo, "full");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el estado de cada pieza sale de la versión y de tus elecciones, sin guardarse", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = leerVersion(v)?.viaje as Viaje;
    const visto = viaje.alojamientos[0].precio.visto;
    const propuesto = estadoDe(viaje, SIN_ELEGIR, visto);
    assert.ok(Object.values(propuesto.lodging).every((x) => x === "proposed" || x === "discarded"));
    assert.ok(Object.values(propuesto.stops).every((x) => x === "proposed"));
    assert.ok(Object.values(propuesto.days).every((x) => x === "proposed"));
    const [p1, p2] = viaje.paradas.map((p) => p.id);
    const fuera = viaje.fuera[0];
    const e = comprobarElecciones(viaje, {
      way: "cheapest",
      removed: [p1],
      moved: { [p2]: 0 },
      ...(fuera === undefined ? {} : { added: [fuera] }),
    });
    const tuyo = estadoDe(viaje, e, visto);
    const cama = viaje.maneras.find((m) => m.id === "cheapest")!.alojamiento;
    assert.equal(tuyo.lodging[cama], "chosen");
    assert.equal(tuyo.stops[p1], "removed");
    assert.equal(tuyo.stops[p2], "moved");
    if (fuera !== undefined) assert.equal(tuyo.stops[fuera], "added");
    assert.ok(Object.values(tuyo.days).every((x) => x === "chosen"));
    // Un precio: visto ahora, guardado de hace días o caducado, con los números de cerrar el viaje.
    assert.equal(estadoDelPrecio(visto, visto, false), "now");
    const dias = (n: number): string => new Date(Date.parse(visto) + n * 86_400_000).toISOString();
    assert.equal(estadoDelPrecio(visto, dias(3), false), "saved");
    assert.equal(estadoDelPrecio(visto, dias(30), false), "stale");
    assert.equal(estadoDelPrecio(visto, dias(0.1), true), "saved");
    assert.equal(tuyo.prices[cama].state, "now");
    const descartado = viaje.alojamientos.find((a) => a.descartado != null);
    if (descartado !== undefined) assert.equal(tuyo.lodging[descartado.id], "discarded");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("tus elecciones viven en la casa, por versión: se guardan encima, y solo con el viaje en el mapa", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = leerVersion(v)?.viaje as Viaje;
    const p1 = viaje.paradas[0].id;
    guardarElecciones(v, { way: "cheapest", removed: [p1] }, ahora());
    guardarElecciones(v, { way: "different", pace: "calm" }, ahora());
    const leidas = leerElecciones(leerViaje(v.ficha.id, "ana", mesa));
    assert.equal(leidas.way, "different");
    assert.deepEqual(leidas.removed, []);
    assert.equal(v.ficha.versiones.length, 1);
    assert.throws(() => guardarElecciones(v, { way: "no" }), EleccionQueNoVale);
    // Una versión nueva empieza sin elegir; al volver a la de antes, vuelven sus elecciones.
    await rehacerYLlevar(mesa, v.ficha.id, ["lodging_taste"]);
    const w = leerViaje(v.ficha.id, "ana", mesa);
    assert.deepEqual(leerElecciones(w), SIN_ELEGIR);
    volverA(w, 1, ahora());
    assert.equal(leerElecciones(w).way, "different");
    pasar(w, "researching", ahora());
    assert.throws(() => guardarElecciones(w, {}), /en el mapa/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- la puerta de la casa

test("la puerta: tus elecciones, tus piezas, el impacto, tus versiones y volver, solo para su dueño", async () => {
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
    // Antes de estar en el mapa no se elige.
    assert.equal((await pide("GET", `/viajes/${id}/elecciones`, ana)).estado, 409);
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed", ahora());
    const run = nuevoRun(v, ahora());
    darElAdelante(run, null, ahora());
    await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    const viaje = leerVersion(leerViaje(id, dueno, mesa))?.viaje as Viaje;
    const [p1, p2] = viaje.paradas.map((p) => p.id);

    // Tus elecciones: solo tú; lo que no es del viaje se dice por su campo.
    assert.equal((await pide("GET", `/viajes/${id}/elecciones`, otro)).estado, 404);
    assert.deepEqual((await pide("GET", `/viajes/${id}/elecciones`, ana)).cuerpo.choices, SIN_ELEGIR);
    const malo = await pide("PUT", `/viajes/${id}/elecciones`, ana, { choices: { way: "la mejor" } });
    assert.deepEqual([malo.estado, malo.cuerpo.error, malo.cuerpo.field], [400, "bad_choice", "way"]);
    assert.equal((await pide("PUT", `/viajes/${id}/elecciones`, otro, { choices: {} })).estado, 404);
    const tuyas = { way: "cheapest", pace: "full", removed: [p1], moved: { [p2]: 0 } };
    // Lo que se guarda dice de qué versión es: si no es la que se enseña, no se guarda encima de otra.
    const deOtra = await pide("PUT", `/viajes/${id}/elecciones`, ana, { version: 2, choices: tuyas });
    assert.deepEqual([deOtra.estado, deOtra.cuerpo.error], [409, "not_shown"]);
    const sinNumero = await pide("PUT", `/viajes/${id}/elecciones`, ana, { version: "1", choices: tuyas });
    assert.deepEqual([sinNumero.estado, sinNumero.cuerpo.error], [400, "bad_request"]);
    assert.deepEqual((await pide("GET", `/viajes/${id}/elecciones`, ana)).cuerpo.choices, SIN_ELEGIR);
    assert.equal((await pide("PUT", `/viajes/${id}/elecciones`, ana, { version: 1, choices: tuyas })).estado, 200);
    // Al volver, siguen ahí.
    const leidas = (await pide("GET", `/viajes/${id}/elecciones`, ana)).cuerpo;
    assert.equal(leidas.choices.way, "cheapest");
    assert.deepEqual(leidas.choices.removed, [p1]);

    // Tus piezas, por claves.
    const piezas = (await pide("GET", `/viajes/${id}/piezas`, ana)).cuerpo.pieces;
    assert.equal(piezas.stops[p1], "removed");
    assert.equal((await pide("GET", `/viajes/${id}/piezas`, otro)).estado, 404);

    // El impacto, sin gastar ni cambiar nada: por sus clases o con lo entendido de después.
    const porClase = (await pide("POST", `/viajes/${id}/impacto`, ana, { changes: ["lodging"] })).cuerpo.impact;
    assert.deepEqual(
      porClase.redo.map((x: { step: string }) => x.step),
      ["search", "look", "table", "cross", "explain", "trip"],
    );
    assert.equal(porClase.cost.usd, 0.35);
    const tres = { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, adults: 3, passports: ["YY", "YY", "YY"] } };
    const porLoEntendido = (await pide("POST", `/viajes/${id}/impacto`, ana, { understood: tres })).cuerpo.impact;
    assert.deepEqual(porLoEntendido.changes, ["travellers"]);
    assert.equal((await pide("POST", `/viajes/${id}/impacto`, ana, { changes: ["todo"] })).cuerpo.error, "bad_change");
    assert.equal((await pide("POST", `/viajes/${id}/impacto`, otro, { changes: ["lodging"] })).estado, 404);
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);

    // Cerrar sin mandar los días: el cierre parte de lo que elegiste y quedó guardado.
    assert.equal((await pide("POST", `/viajes/${id}/cerrar`, ana, {})).estado, 202);
    await puerta.esperar();
    const cerrado = (await pide("GET", `/viajes/${id}/version`, ana)).cuerpo.trip as Viaje;
    assert.equal(cerrado.cierre?.manera, "cheapest");
    assert.equal(cerrado.ritmo, "full");
    assert.ok(!cerrado.dias.some((d) => d.paradas.includes(p1)));
    assert.ok(cerrado.dias[0].paradas.includes(p2));

    // Tus versiones, y volver a la de antes del cierre: el viaje vuelve a estar en el mapa, sin borrar nada.
    const lista = (await pide("GET", `/viajes/${id}/versiones`, ana)).cuerpo;
    assert.deepEqual(
      lista.versions.map((x: { why: string }) => x.why),
      ["first", "closed"],
    );
    assert.equal(lista.shown, 2);
    assert.equal((await pide("POST", `/viajes/${id}/volver`, otro, { version: 1 })).estado, 404);
    assert.equal((await pide("POST", `/viajes/${id}/volver`, ana, { version: 9 })).cuerpo.error, "bad_version");
    const vuelto = await pide("POST", `/viajes/${id}/volver`, ana, { version: 1 });
    assert.equal(vuelto.cuerpo.trip.state, "on_map");
    assert.equal(vuelto.cuerpo.trip.version, 1);
    assert.equal(leerViaje(id, dueno, mesa).ficha.versiones.length, 2);
    // Y otra vez a la cerrada: vuelve a estar cerrado.
    assert.equal((await pide("POST", `/viajes/${id}/volver`, ana, { version: 2 })).cuerpo.trip.state, "closed");
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- lo que deja la revisión de la tanda 6

test("lo entendido del viaje es siempre el de la versión que se enseña: al rehacer, al salir y al volver", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const delViaje = (): Entendido => leerJson(join(v.carpeta, "entendido.json")) as unknown as Entendido;
    const nuevas = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: "2027-03-12", check_out: "2027-03-15" } };
    const { run } = rehacer(leerViaje(v.ficha.id, "ana", mesa), {
      clases: ["dates"],
      entendido: nuevas,
      cuando: ahora(),
    });
    // Mientras se rehace, el del viaje es el de la versión que se enseña; el nuevo va en su run.
    assert.equal(delViaje().dates.check_in, ENTENDIDO.dates.check_in);
    assert.equal(leerJson(join(run, "entendido.json")).dates.check_in, "2027-03-12");
    darElAdelante(run, null, ahora());
    await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    assert.equal(delViaje().dates.check_in, "2027-03-12");
    const w = leerViaje(v.ficha.id, "ana", mesa);
    volverA(w, 1, ahora());
    assert.equal(delViaje().dates.check_in, ENTENDIDO.dates.check_in);
    volverA(w, 2, ahora());
    assert.equal(delViaje().dates.check_in, "2027-03-12");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
