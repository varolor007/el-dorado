// El día a día a ratos (8.6): un mensaje tuyo para tus días, con lo que no estaba buscado en los datos abiertos, el
// del día a día que vuelve a elegir y explica lo que cambió, el ritmo y la puerta 9 otra vez, lo que quitaste que no
// vuelve solo, la versión de antes sin pisar, y el que cruza y el que explica, que solo se lanzan si cambia lo que
// deciden. Con el caso inventado y asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { LARGO_DE_UN_MENSAJE, MENSAJES_DE_UN_VIAJE, PALABRAS_DE_UNA_CLASE } from "../../agent/data/dia_a_dia.ts";
import { RAICES } from "../../agent/data/sitios.ts";
import { puertaSitios } from "../../agent/gates/puerta_dias.ts";
import { adelanteDe, darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import {
  ampliarLosSitios,
  conservarElCruce,
  FalloDeUnDia,
  mensajeDeCara,
  mensajeParaElegir,
  pedirUnDia,
  prepararUnDia,
} from "../../agent/launcher/dia_a_dia.ts";
import type { Fuentes } from "../../agent/launcher/investigar.ts";
import { abrirViaje, leerVersion, leerViaje, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { guardarElecciones, leerElecciones } from "../../agent/launcher/momentos.ts";
import { rehacer } from "../../agent/launcher/rehacer.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import {
  clasesNombradas,
  comprobarMensaje,
  impactoDeUnDia,
  loQueNoEstaba,
  masCercaDeCadaDia,
  MensajeQueNoVale,
  raicesDeLasClases,
} from "../../agent/scripts/dia_a_dia.ts";
import { diasElegidos, SIN_ELEGIR } from "../../agent/scripts/elecciones.ts";
import { impactoDe } from "../../agent/scripts/impacto.ts";
import type { Tabla } from "../../agent/scripts/formas.ts";
import { consultaDeSitios, type Sitio } from "../../agent/tools/sitios.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ENTENDIDO, entregaDeSitios, SITIOS } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

/** Una playa en la ciudad inventada: lo que traerían los datos abiertos si se les pide. */
const PLAYA: Sitio = { ...SITIOS[5], id: "Q11", nombre: "Playa Inventada", clase: "beach", clases: ["beach"] };

/** Las fuentes inventadas, con datos abiertos que, si se les pide una playa, la traen; y lo que se les pidió. */
function conPlaya(): Fuentes & { pedidas: string[][] } {
  const pedidas: string[][] = [];
  return {
    ...fuentesInventadas(),
    pedidas,
    sitiosDeClases: async (_viaje, clases) => {
      pedidas.push(clases);
      return clases.includes("beach") ? [PLAYA] : [];
    },
  };
}

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

/** Manda un mensaje y lo lleva con asientos de mentira: el run, los asientos que se lanzaron y el viaje después. */
async function mandarYLlevar(
  mesa: string,
  id: string,
  said: string,
  f: Fuentes = fuentesInventadas(),
  day: number | null = null,
): Promise<{ run: string; asientos: string[]; v: ViajeEnLaMesa }> {
  const { run } = pedirUnDia(leerViaje(id, "ana", mesa), { said, day, cuando: ahora() });
  darElAdelante(run, null, ahora());
  const r = await llevar(run, f, lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
  return { run, asientos: [...new Set(asientos)].sort(), v: leerViaje(id, "ana", mesa) };
}

const viajeDe = (v: ViajeEnLaMesa, n: number | null = v.ficha.version): Viaje => leerVersion(v, n)?.viaje as Viaje;

/** El material que se le dio a un puesto, pieza a pieza, como se le daría otra vez. */
function materialDe(puesto: string): { ruta: string; contenido: string }[] {
  return Object.entries(foto(join(puesto, "in"))).map(([ruta, contenido]) => ({ ruta, contenido }));
}

/** Lo que hay en una carpeta, archivo a archivo: para ver que una versión no se ha tocado. */
function foto(carpeta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) for (const [k, x] of Object.entries(foto(ruta))) salida[`${nombre}/${k}`] = x;
    else salida[nombre] = readFileSync(ruta, "utf8");
  }
  return salida;
}

// ---------- tus palabras, sin IA

test("lo que nombra un mensaje: la clase de sitio, en inglés o en español, con tildes o sin ellas", () => {
  assert.deepEqual(clasesNombradas("un día de playa"), ["beach"]);
  assert.deepEqual(clasesNombradas("Menos MUSEOS, y algún jardín"), ["park", "museum"]);
  assert.deepEqual(clasesNombradas("a market and some viewpoints, please"), ["market", "viewpoint"]);
  // Una palabra vale entera: «playera» no es «playa», y «calamar» no es «cala».
  assert.deepEqual(clasesNombradas("una camiseta playera y calamares"), []);
  // Cada clase de la lista es una de las nuestras, y sus palabras van en minúsculas y sin tildes.
  const nuestras = new Set(RAICES.map((r) => r.clase));
  for (const [clase, palabras] of Object.entries(PALABRAS_DE_UNA_CLASE)) {
    assert.ok(nuestras.has(clase), clase);
    for (const p of palabras) assert.equal(p, p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
  }
});

test("se vuelve a los datos abiertos solo por lo que no estaba: «menos museos» no busca museos", () => {
  const dados = [{ clase: "museum" }, { clase: "market" }];
  assert.deepEqual(loQueNoEstaba("menos museos", dados), []);
  assert.deepEqual(loQueNoEstaba("un día de playa y un mercado", dados), ["beach"]);
  assert.deepEqual(raicesDeLasClases(["beach"]), ["Q40080"]);
  // A la fuente se le piden solo identificadores suyos: nada del mensaje entra en la consulta.
  const q = consultaDeSitios({ oeste: 1, sur: 1, este: 2, norte: 2 }, { raices: ["Q40080", "Q1 } UNION { ?x"] });
  assert.match(q, /VALUES \?raiz \{ wd:Q40080 \}/);
  assert.doesNotMatch(q, /UNION/);
  assert.throws(
    () => consultaDeSitios({ oeste: 1, sur: 1, este: 2, norte: 2 }, { raices: ["playa"] }),
    /ninguna clase/,
  );
});

test("un mensaje vale si es un texto de una línea, ni vacío ni largo", () => {
  assert.equal(comprobarMensaje("  menos   museos \n"), "menos museos");
  for (const malo of [42, "", "   ", "x".repeat(LARGO_DE_UN_MENSAJE + 1)])
    assert.throws(() => comprobarMensaje(malo), MensajeQueNoVale);
});

test("el impacto de un mensaje: el del día a día seguro; el que cruza y el que explica, solo si hace falta", () => {
  const estimado = {
    "sights-picker": { usd: 0.1, de: 2 },
    "trip-crosser": { usd: 0.05, de: 2 },
    "trip-explainer": { usd: 0.2, de: 2 },
  };
  const i = impactoDeUnDia(estimado);
  assert.deepEqual(
    i.redo.map((x) => x.step),
    ["pick", "days", "table", "trip"],
  );
  assert.deepEqual(
    i.maybe.map((x) => x.step),
    ["sights", "cross", "explain"],
  );
  assert.equal(i.cost.usd, 0.1);
  assert.equal(i.spends, true);
  // La trampa: el que cruza y el que explica pueden lanzarse. Lo más que puede costar los cuenta, y se dice.
  assert.deepEqual(i.most, { usd: 0.35, unknown: [] });
  const sinSaber = impactoDeUnDia({ "sights-picker": { usd: 0.1, de: 2 } });
  assert.equal(sinSaber.cost.usd, 0.1);
  assert.deepEqual(sinSaber.most, { usd: null, unknown: ["trip-crosser", "trip-explainer"] });
  // Si pides algo que no estaba, los sitios se buscan seguro: es código, y no cuesta.
  const conSitios = impactoDeUnDia(estimado, true);
  assert.equal(conSitios.redo[0].step, "sights");
  assert.ok(!conSitios.maybe.some((x) => x.step === "sights") && !conSitios.keep.includes("sights"));
  assert.equal(conSitios.cost.usd, 0.1);
  assert.equal(impactoDeUnDia({}).cost.usd, null);
});

test("lo más que puede costar vale para cualquier impacto con algo que quizá haya que rehacer", () => {
  // Otro transporte puede tirar los papeles: lo seguro no los cuenta, y lo más que puede ser, sí.
  const uno = { usd: 0.1, de: 1 };
  const estimado = { papers: { usd: 0.3, de: 1 }, "lodging-viewer": uno, "trip-crosser": uno, "trip-explainer": uno };
  const transporte = impactoDe(["transport"], estimado);
  assert.ok(transporte.maybe.some((x) => x.step === "papers"));
  assert.equal(transporte.cost.usd, 0.3);
  assert.deepEqual(transporte.most, { usd: 0.6, unknown: [] });
  // Sin nada de IA en lo que quizá haya que rehacer, no hay un segundo coste que decir.
  assert.equal(impactoDe(["pace"]).most, undefined);
  assert.equal(impactoDe(["lodging"]).most, undefined);
});

// ---------- la puerta 9 con un mensaje

test("la puerta 9 con un mensaje: dice lo que cambió, sin promesas ni números de fuera, y lo quitado no vuelve", () => {
  const dados = SITIOS.map((s) => s.id);
  const mensaje = { quitadas: ["Q5"], numeros: [1, 2, 3, 4] };
  const sin = entregaDeSitios();
  // Sin mensaje, nada cambia: sin «changed».
  assert.equal(puertaSitios(sin, { sitios: dados, noches: 3 }).verde, true);
  assert.ok(
    puertaSitios({ ...sin, changed: "x" }, { sitios: dados, noches: 3 }).rojos.some((r) => r.donde === "changed"),
  );
  // Con mensaje, tiene que decir lo que cambió.
  const rojos = (e: unknown): string[] =>
    puertaSitios(e, { sitios: dados, noches: 3, mensaje }).rojos.map((r) => r.que);
  assert.ok(rojos(sin).some((q) => /falta/.test(q)));
  assert.ok(rojos({ ...sin, changed: "Lo he cambiado." }).some((q) => /Q5 lo quitó el viajero/.test(q)));
  const bien = entregaDeSitios({ said: "menos museos", removed: ["Q5"], new_sights: [] });
  assert.deepEqual(rojos(bien), []);
  assert.ok(rojos({ ...bien, changed: "Te he quitado 7 museos." }).some((q) => /dice 7/.test(q)));
  assert.ok(rojos({ ...bien, changed: "El mejor día: mira https://ejemplo.example" }).length > 0);
  assert.deepEqual(rojos({ ...bien, changed: "El día 2 queda más tranquilo." }), []);
});

// ---------- el ritmo, otra vez: qué alojamiento te deja más cerca de cada día

test("qué alojamiento te deja más cerca de cada día: el de menos minutos de media a sus paradas", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const dias = diasElegidos(viaje, SIN_ELEGIR);
    const cerca = masCercaDeCadaDia(viaje, dias);
    assert.equal(cerca.length, dias.length);
    const camas = viaje.alojamientos.filter((a) => a.descartado == null).map((a) => a.id);
    for (const [i, c] of cerca.entries()) {
      if (dias[i].paradas.length === 0) assert.deepEqual([c.alojamiento, c.minutos], [null, null]);
      else {
        assert.ok(camas.includes(c.alojamiento as string));
        assert.ok(typeof c.minutos === "number" && c.minutos >= 0);
      }
    }
    // Un día que solo tiene paradas al lado de un alojamiento lo tiene a él como el más cercano.
    const a = viaje.alojamientos.find((x) => x.descartado == null);
    assert.ok(a !== undefined);
    const junto = { ...viaje, paradas: [{ ...viaje.paradas[0], id: "Zjunto", punto: a.punto }] };
    assert.equal(masCercaDeCadaDia(junto, [{ fecha: dias[0].fecha, paradas: ["Zjunto"] }])[0].alojamiento, a.id);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- un mensaje, de punta a punta

test("«menos museos»: el del día a día elige otra vez con tus palabras, y lo que quitaste no vuelve solo", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = foto(join(v.carpeta, "versiones", "1"));
    const uno = viajeDe(v);
    assert.ok(uno.paradas.some((p) => p.id === "Q3"));
    // Quitas el mirador a mano, y después escribes.
    guardarElecciones(v, { removed: ["Q5"], pace: "calm" }, ahora());
    const r = await mandarYLlevar(mesa, v.ficha.id, "menos museos", fuentesInventadas(), 1);
    assert.ok(r.asientos.includes("sights-picker"));
    assert.ok(!r.asientos.includes("lodging-viewer"));
    // Lo que vio el del día a día: tus palabras, tus días como estaban y lo que quitaste.
    const puesto = readdirSync(join(r.run, "puestos")).find((x) => x.startsWith("sitios-"));
    const visto = leerJson(join(r.run, "puestos", puesto as string, "in", "message.json"));
    assert.equal(visto.said, "menos museos");
    assert.equal(visto.open_day, 2);
    assert.deepEqual(visto.removed, ["Q5"]);
    assert.deepEqual(visto.looked_for, []);
    assert.ok(visto.days.every((d: { stops: string[] }) => !d.stops.includes("Q5")));
    // Una versión nueva, sin el museo; la de antes, intacta.
    assert.equal(r.v.ficha.version, 2);
    const dos = viajeDe(r.v);
    assert.ok(!dos.paradas.some((p) => p.id === "Q3"));
    assert.deepEqual(foto(join(v.carpeta, "versiones", "1")), antes);
    // Lo que quitaste no vuelve: el del día a día lo deja fuera, y ni siquiera queda para añadirlo. Tu ritmo pasa
    // a la versión nueva.
    assert.ok(!dos.paradas.some((p) => p.id === "Q5"));
    const tuyas = leerElecciones(r.v);
    assert.equal(tuyas.pace, "calm");
    assert.ok(diasElegidos(dos, tuyas).every((d) => !d.paradas.includes("Q5")));
    // Lo que explicó, para ti, que pasó la puerta de palabras.
    const cara = mensajeDeCara(r.v, false);
    assert.equal(cara?.state, "done");
    assert.equal(cara?.version, 2);
    assert.equal(cara?.from, 1);
    assert.match(cara?.changed ?? "", /He vuelto a elegir/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("«un día de playa»: se vuelve a los datos abiertos por lo que no estaba, y se da a elegir", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const f = conPlaya();
    const previsto = prepararUnDia(v, { said: "un día de playa", cuando: ahora() });
    assert.deepEqual(previsto.look_for, ["beach"]);
    const r = await mandarYLlevar(mesa, v.ficha.id, "un día de playa", f);
    assert.deepEqual(f.pedidas, [["beach"]]);
    const sitios = leerJson(join(r.run, "sitios.json"));
    assert.deepEqual(sitios.buscados, ["beach"]);
    assert.equal(sitios.buscadosEn, "2");
    assert.deepEqual(sitios.anadidos, ["Q11"]);
    const puesto = readdirSync(join(r.run, "puestos")).find((x) => x.startsWith("sitios-"));
    const dados = leerJson(join(r.run, "puestos", puesto as string, "in", "sights.json")) as unknown as {
      id: string;
    }[];
    assert.ok(dados.some((s) => s.id === "Q11"));
    assert.ok(viajeDe(r.v).paradas.some((p) => p.id === "Q11"));
    assert.deepEqual(mensajeDeCara(r.v, false)?.looked_for, ["beach"]);
    // Lo que se encontró pasa la puerta 9 al montar el viaje: es de los datos que se dieron.
    assert.equal(mensajeDeCara(r.v, false)?.found, 1);
    // Ya hay playa: otro mensaje que la pide no vuelve a buscarla, y lo encontrado sigue dándose a elegir.
    assert.deepEqual(prepararUnDia(r.v, { said: "más playa", cuando: ahora() }).look_for, []);
    // Sin fuente, se sigue con lo que había, y se dice.
    const sinFuente = await mandarYLlevar(mesa, v.ficha.id, "un lago", fuentesInventadas());
    const luego = leerJson(join(sinFuente.run, "sitios.json"));
    assert.deepEqual([luego.buscados, luego.anadidos], [["beach", "nature"], ["Q11"]]);
    assert.ok(luego.avisos.some((a: string) => /sin datos abiertos/.test(a)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("cada mensaje cuenta lo suyo: lo añadido antes no se repite ni se cuenta otra vez", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const LAGO: Sitio = { ...PLAYA, id: "Q12", nombre: "Lago Inventado", clase: "nature", clases: ["nature"] };
    // La trampa: con lo nuevo, la fuente devuelve otra vez la playa que ya se añadió.
    const todo: Fuentes = {
      ...fuentesInventadas(),
      sitiosDeClases: async (_viaje, clases) => (clases.includes("beach") ? [PLAYA] : [PLAYA, LAGO]),
    };
    const uno = await mandarYLlevar(mesa, v.ficha.id, "un día de playa", todo);
    assert.equal(mensajeDeCara(uno.v, false)?.found, 1);
    const dos = await mandarYLlevar(mesa, v.ficha.id, "un lago", todo);
    const sitios = leerJson(join(dos.run, "sitios.json"));
    assert.deepEqual(sitios.anadidos, ["Q11", "Q12"]);
    assert.equal(mensajeDeCara(dos.v, false)?.found, 1);
    assert.deepEqual(mensajeParaElegir(dos.run)?.new_sights, ["Q12"]);
    // Un mensaje que no busca nada no ha encontrado nada, aunque los de antes sí.
    const tres = await mandarYLlevar(mesa, v.ficha.id, "algo más tranquilo", todo);
    assert.equal(mensajeDeCara(tres.v, false)?.found, 0);
    assert.deepEqual(mensajeParaElegir(tres.run)?.new_sights, []);
    assert.deepEqual(leerJson(join(tres.run, "sitios.json")).anadidos, ["Q11", "Q12"]);
    // Lo que se avisó una vez no se repite en cada mensaje.
    const avisos = leerJson(join(tres.run, "sitios.json")).avisos as string[];
    assert.equal(new Set(avisos).size, avisos.length);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el que cruza solo se conserva si la tabla decide lo mismo y lo que entregó sigue pasando su puerta", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const { run } = rehacer(v, { clases: ["day"], cuando: ahora() });
    const base = join(v.carpeta, "runs", "1");
    const tabla = leerJson(join(base, "tabla-1.json")) as Tabla;
    // Otro total: lo que decide cambia, y se vuelve a lanzar.
    const material = materialDe(join(base, "puestos", "cruce-1-v1"));
    const otra = { ...tabla, rows: tabla.rows.map((x, i) => (i === 0 ? { ...x, total: x.total + 1 } : x)) };
    assert.equal(conservarElCruce(run, 1, otra, ENTENDIDO, material), false);
    assert.ok(!existsSync(join(run, "puestos", "cruce-1-v1")));
    // La trampa: decide lo mismo, pero lo que se le daría ahora no es lo que leyó (lo que se tarda a tus paradas,
    // o una pieza de más): se vuelve a lanzar.
    const lejos = { ...tabla, rows: tabla.rows.map((x) => ({ ...x, minutes_to_sights: 99 })) };
    const conOtraTabla = material.map((x) =>
      x.ruta === "table.json" ? { ...x, contenido: JSON.stringify(lejos) } : x,
    );
    assert.equal(conservarElCruce(run, 1, tabla, ENTENDIDO, conOtraTabla), false);
    assert.equal(conservarElCruce(run, 1, tabla, ENTENDIDO, [...material, { ruta: "x.json", contenido: "{}" }]), false);
    assert.equal(conservarElCruce(run, 1, tabla, ENTENDIDO, material.slice(1)), false);
    assert.ok(!existsSync(join(run, "puestos", "cruce-1-v1")));
    // La misma, con lo mismo: se queda con lo que hizo, con sus horas.
    assert.equal(conservarElCruce(run, 1, tabla, ENTENDIDO, material), true);
    const copia = join(run, "puestos", "cruce-1-v1", "out", "delivery.json");
    const deAntes = statSync(join(base, "puestos", "cruce-1-v1", "out", "delivery.json")).mtimeMs;
    assert.ok(Math.abs(statSync(copia).mtimeMs - deAntes) < 1);
    // Y una vez que hay puestos, no se copia otra vez encima.
    assert.equal(conservarElCruce(run, 1, tabla, ENTENDIDO, material), false);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el que explica no se conserva si lo que leería no es lo que leyó: lo que se tarda a tus paradas", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    // Sin el museo, lo que se tarda de cada alojamiento a tus paradas cambia: el que explica lo lee en las maneras.
    const r = await mandarYLlevar(mesa, v.ficha.id, "menos museos");
    const antes = leerJson(join(v.carpeta, "runs", "1", "puestos", "explica-v1", "in", "ways.json"));
    const ahora = leerJson(join(r.run, "puestos", "explica-v1", "in", "ways.json"));
    const minutos = (w: any) => (w.ways as { minutes_to_sights: unknown }[]).map((x) => x.minutes_to_sights);
    assert.notDeepEqual(minutos(ahora), minutos(antes));
    assert.ok(r.asientos.includes("trip-explainer"));
    // Lo que se le dio es lo de ahora, no lo de antes.
    const tabla = leerJson(join(r.run, "tabla-1.json")) as Tabla;
    assert.ok(minutos(ahora).every((m) => tabla.rows.some((x) => x.minutes_to_sights === m)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("si la tabla decide otra cosa, el que cruza vuelve; el que explica, si aquel no dice lo mismo", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    // Si la tabla de antes decía otra cosa, el que cruza se vuelve a lanzar. Si entrega lo mismo que entonces, lo que
    // explicó el que explica sigue valiendo, y pasa su puerta con lo de ahora: se queda.
    const base = join(v.carpeta, "runs", "1");
    const tabla = leerJson(join(base, "tabla-1.json")) as Tabla;
    const otra = { ...tabla, rows: tabla.rows.map((x) => ({ ...x, score: "unknown" })) };
    writeFileSync(join(base, "tabla-1.json"), JSON.stringify(otra));
    const r = await mandarYLlevar(mesa, v.ficha.id, "algo más tranquilo");
    assert.deepEqual(r.asientos, ["sights-picker", "trip-crosser"]);
    assert.equal(r.v.ficha.version, 2);
    // Si además lo que cruzó entonces no es lo que cruza ahora, el que explica también vuelve.
    const dos = join(v.carpeta, "runs", "2");
    writeFileSync(join(dos, "tabla-1.json"), JSON.stringify(otra));
    const cruce = leerJson(join(dos, "cruce-1.json"));
    writeFileSync(join(dos, "cruce-1.json"), JSON.stringify({ ...cruce, entrega: { ...cruce.entrega, tell: [] } }));
    const s = await mandarYLlevar(mesa, v.ficha.id, "algo más tranquilo todavía");
    assert.deepEqual(s.asientos, ["sights-picker", "trip-crosser", "trip-explainer"]);
    assert.equal(s.v.ficha.version, 3);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("un mensaje pide el viaje en el mapa, un día del viaje y no pasar del tope", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    assert.throws(() => prepararUnDia(v, { said: "", cuando: ahora() }), MensajeQueNoVale);
    assert.throws(() => prepararUnDia(v, { said: "menos museos", day: 99, cuando: ahora() }), /bad_day/);
    assert.throws(() => prepararUnDia(v, { said: "menos museos", day: 1.5, cuando: ahora() }), /bad_day/);
    // Lo que pide no abre nada: sin el botón no hay run.
    prepararUnDia(v, { said: "menos museos", cuando: ahora() });
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.runs.length, 1);
    // El tope de mensajes de un viaje, contados en su diario.
    const { apuntar } = await import("../../agent/launcher/mesa.ts");
    for (let i = 0; i < MENSAJES_DE_UN_VIAJE.deUnViaje; i++) apuntar(v, "day_message", {}, ahora());
    assert.throws(() => prepararUnDia(v, { said: "menos museos", cuando: ahora() }), FalloDeUnDia);
    assert.throws(() => prepararUnDia(v, { said: "menos museos", cuando: ahora() }), /too_many_messages/);
    const otroDia = new Date(ahora().getTime() + (MENSAJES_DE_UN_VIAJE.horas + 1) * 3_600_000);
    prepararUnDia(v, { said: "menos museos", cuando: otroDia });
    // Mientras corre, el viaje no está para otro mensaje.
    const empezado = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: ahora() });
    assert.throws(() => prepararUnDia(empezado, { said: "menos museos", cuando: ahora() }), /not_now/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la puerta: lo que costaría sin cambiar nada; con tu botón, sale; y cómo va, solo para su dueño", async () => {
  const { puertaALaWeb, CABECERA_DE_LA_SESION } = await import("../../agent/launcher/puerta_a_la_web.ts");
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const LLAVE = "una-llave-larga-e-inventada-para-la-web";
  const CORREO = "ana@inventado.example";
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: () => conPlaya(),
    hoy: ahora,
    comprobarEnlace: async () => "ok",
    lanzadorDeLaCasa: lanzadorDeMentira(),
    correosDeLaCasa: [CORREO],
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
    const sesionDe = async (correo: string) =>
      (await pide("POST", "/cuentas", null, { email: correo, password: "una contraseña larga" })).cuerpo
        .session as string;
    const ana = await sesionDe(CORREO);
    const otro = await sesionDe("otro@inventado.example");
    const id = (await pide("POST", "/viajes", ana, { understood: ENTENDIDO })).cuerpo.trip.id as string;
    const dueno = leerJson(join(mesa, "viajes", id, "ficha.json")).dueno as string;
    // Antes de estar en el mapa, no.
    assert.equal((await pide("POST", `/viajes/${id}/dia`, ana, { said: "menos museos" })).estado, 409);
    const v = leerViaje(id, dueno, mesa);
    pasar(v, "confirmed", ahora());
    const run = nuevoRun(v, ahora());
    darElAdelante(run, null, ahora());
    await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    assert.deepEqual((await pide("GET", `/viajes/${id}/dia`, ana)).cuerpo, { message: null });

    // Lo que costaría, sin cambiar nada.
    const previsto = await pide("POST", `/viajes/${id}/dia`, ana, { said: "un día de playa", day: 0 });
    assert.equal(previsto.estado, 200);
    assert.deepEqual(previsto.cuerpo.look_for, ["beach"]);
    assert.deepEqual(
      previsto.cuerpo.impact.redo.map((x: { step: string }) => x.step),
      ["sights", "pick", "days", "table", "trip"],
    );
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);
    // Lo que no vale se dice por su clave; y de otro, no hay tal viaje.
    assert.equal((await pide("POST", `/viajes/${id}/dia`, ana, { said: "" })).cuerpo.error, "empty_message");
    assert.equal((await pide("POST", `/viajes/${id}/dia`, ana, { said: "x", day: 9 })).cuerpo.error, "bad_day");
    assert.equal((await pide("POST", `/viajes/${id}/dia`, otro, { said: "menos museos" })).estado, 404);
    assert.equal((await pide("GET", `/viajes/${id}/dia`, otro)).estado, 404);

    // Un techo de gasto que no vale no sale, como en los demás momentos que gastan, y no abre nada.
    for (const ceiling of [0, -1, "5", {}])
      assert.deepEqual(
        await pide("POST", `/viajes/${id}/dia`, ana, { said: "un día de playa", day: 0, go: true, ceiling }),
        { estado: 400, cuerpo: { error: "bad_ceiling" } },
        String(ceiling),
      );
    assert.equal(leerViaje(id, dueno, mesa).ficha.runs.length, 1);

    // Con tu botón y tu techo: sale con él, y se cuenta cómo va.
    const sale = await pide("POST", `/viajes/${id}/dia`, ana, {
      said: "un día de playa",
      day: 0,
      go: true,
      ceiling: 2,
    });
    assert.equal(sale.estado, 202);
    const delRun = join(mesa, "viajes", id, "runs", String(sale.cuerpo.run));
    assert.equal(adelanteDe(delRun)?.techo, 2);
    await puerta.esperar();
    const va = (await pide("GET", `/viajes/${id}/dia`, ana)).cuerpo.message;
    assert.equal(va.state, "done");
    assert.equal(va.said, "un día de playa");
    assert.equal(va.version, 2);
    assert.equal(va.found, 1);
    assert.match(va.changed, /He vuelto a elegir/);
    const nuevo = (await pide("GET", `/viajes/${id}/version`, ana)).cuerpo.trip as Viaje;
    assert.ok(nuevo.paradas.some((p) => p.id === "Q11"));
  } finally {
    await puerta.cerrar?.();
    puerta.servidor.close();
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("lo añadido por un mensaje de antes, detrás del corte, ya se da: no se vuelve a añadir", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const { run } = pedirUnDia(v, { said: "un día de playa", cuando: ahora() });
    // Más sitios de los que caben antes del corte, y la playa detrás, añadida por un mensaje de antes.
    const relleno = Array.from({ length: 130 }, (_, i) => ({ ...SITIOS[9], id: `R${i}`, enlaces: 1 }));
    const d = leerJson(join(run, "sitios.json"));
    writeFileSync(
      join(run, "sitios.json"),
      JSON.stringify({ ...d, sitios: [...relleno, PLAYA], anadidos: ["Q11"], buscadosEn: "1", avisos: ["uno"] }),
    );
    const resumenes = async () => new Map<string, string>();
    const avisos = await ampliarLosSitios(run, ENTENDIDO, { sitiosDeClases: async () => [PLAYA], resumenes });
    assert.deepEqual(avisos, []);
    const luego = leerJson(join(run, "sitios.json"));
    assert.deepEqual(luego.anadidos, ["Q11"]);
    assert.deepEqual(luego.anadidosEn, []);
    assert.equal(luego.sitios.filter((s: Sitio) => s.id === "Q11").length, 1);
    assert.deepEqual(mensajeParaElegir(run)?.new_sights, []);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
