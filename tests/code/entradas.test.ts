// El de las entradas (14.4): el horario de OpenStreetMap leído en lo corriente, los datos abiertos de cada sitio (con
// sus respuestas inventadas, sin internet), la puerta 13 con cada trampa, lo que pasa al viaje, el ritmo y la puerta 9
// con lo que cierra cada día, y la investigación inventada entera con su contrato de verdad. Sin gastar.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { puertaDias } from "../../agent/gates/puerta_dias.ts";
import { puertaEntradas, type ParaLasEntradas } from "../../agent/gates/puerta_entradas.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import { hayContrato } from "../../agent/launcher/capas.ts";
import {
  ABIERTOS as ARCHIVO_DE_LOS_ABIERTOS,
  losDiasSinEntradas,
  tandasDeSitios,
  traerLosAbiertos,
} from "../../agent/launcher/capa_entradas.ts";
import { comprobarViaje, type DeLasEntradas, type Parada, type Viaje } from "../../agent/output/viaje.ts";
import { abreElDia } from "../../agent/scripts/capas.ts";
import {
  cierraEnElViaje,
  entradaAbierta,
  ordenParaMirar,
  paraEnsenarEntradas,
  type DatosAbiertos,
  type EntregaDeLasEntradas,
} from "../../agent/scripts/capa_entradas.ts";
import { diasElegidos, SIN_ELEGIR } from "../../agent/scripts/elecciones.ts";
import { fechasDe, repartir } from "../../agent/scripts/ritmo.ts";
import {
  abiertosDe,
  consultaDeOverpass,
  dePagoDe,
  instanciasDeOverpass,
  leerOverpass,
  leerWikidata,
  OVERPASS_POR_DEFECTO,
} from "../../agent/tools/abiertos.ts";
import { leerHorarioDeOsm } from "../../agent/tools/horarios.ts";
import type { Respuesta, Sitio } from "../../agent/tools/sitios.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson, runNuevo, trabaja } from "../cases/inventado/asientos.ts";
import { abiertosInventados } from "../cases/inventado/capas.ts";
import { entregaDeLasEntradas, PAGINA_DE_LAS_ENTRADAS } from "../cases/inventado/entradas.ts";
import { sigue } from "../../agent/launcher/investigar.ts";

// ---------- el horario de OpenStreetMap

test("el horario de OpenStreetMap: lo corriente se lee, y un día que no sale es un día que cierra", () => {
  const todos = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  assert.deepEqual(leerHorarioDeOsm("24/7"), [{ dias: todos, abre: "00:00", cierra: "24:00" }]);
  assert.deepEqual(leerHorarioDeOsm("Tu-Su 09:00-18:00"), [{ dias: todos.slice(1), abre: "09:00", cierra: "18:00" }]);
  assert.deepEqual(leerHorarioDeOsm("10:00-18:00"), [{ dias: todos, abre: "10:00", cierra: "18:00" }]);
  // Una regla de después manda en sus días; la coma tras unas horas separa dos reglas.
  assert.deepEqual(leerHorarioDeOsm("Mo-Su 10:00-18:00; Tu off"), [
    { dias: ["mon", "wed", "thu", "fri", "sat", "sun"], abre: "10:00", cierra: "18:00" },
  ]);
  assert.deepEqual(leerHorarioDeOsm("Mo-Fr 09:00-13:00,15:00-19:00, Sa 10:00-14:00"), [
    { dias: todos.slice(0, 5), abre: "09:00", cierra: "13:00" },
    { dias: ["sat"], abre: "10:00", cierra: "14:00" },
    { dias: todos.slice(0, 5), abre: "15:00", cierra: "19:00" },
  ]);
  // Un tramo de días que da la vuelta a la semana, y unos días sueltos.
  assert.deepEqual(leerHorarioDeOsm("Sa-Mo 10:00-12:00")?.[0].dias, ["mon", "sat", "sun"]);
  assert.deepEqual(leerHorarioDeOsm("Mo,We,Fr 10:00-12:00")?.[0].dias, ["mon", "wed", "fri"]);
  // Los festivos no se pueden poner en el calendario: se dejan, y lo demás se lee.
  assert.deepEqual(leerHorarioDeOsm("Mo-Fr 10:00-18:00; PH off")?.[0].dias, todos.slice(0, 5));
});

test("el horario de OpenStreetMap: lo que no se entiende no se adivina, y no se sabe", () => {
  for (const raro of [
    "Apr-Oct Mo-Su 09:00-18:00",
    "sunrise-sunset",
    "Mo-Fr",
    "PH off",
    "Mo 22:00-02:00",
    'Mo-Fr 10:00-18:00 "by appointment"',
    "Mo[1] 10:00-12:00",
    "Mo-Su 10:00-18:00+",
    "Mo-Fr 10:00-18:00 || Sa 10:00-12:00",
    "week 1-20 Mo 10:00-12:00",
    "off",
    "Mo-Su off",
    "",
    "x".repeat(300),
    null,
    42,
  ])
    assert.equal(leerHorarioDeOsm(raro), null, String(raro));
});

// ---------- los datos abiertos de cada sitio

const sitio = (id: string, nombre: string): Sitio => ({
  id,
  nombre,
  clase: "museum",
  clases: [],
  punto: { lat: 10, lon: 20 },
  enlaces: 10,
  descripcion: null,
  articulo: null,
  articuloEnIngles: null,
  archivo: null,
  fuente: "inventada",
  visto: "2026-11-20",
});

const ok = (cuerpo: unknown): Respuesta => ({ estado: 200, cuerpo: JSON.stringify(cuerpo), esperar: null });
const fila = (id: string, extra: Record<string, string> = {}) => ({
  item: { value: `http://www.wikidata.org/entity/${id}` },
  ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
});

const PRIMERA = "https://overpass.uno.example/api/interpreter";
const SEGUNDA = "https://overpass.dos.example/api/interpreter";

type ComoContesta = "bien" | "caida" | "espera" | "rota" | "a_medias" | "no_contesta";

/**
 * Unas fuentes abiertas inventadas: Wikidata y dos instancias de Overpass, con lo que se les pidió. Overpass contesta
 * como lo haría la de verdad a la consulta que se le manda: los objetos por su número y, cerca de cada punto, el que
 * lleva el identificador del sitio.
 */
function fuentesAbiertas(o: { wikidataFalla?: boolean; uno?: ComoContesta; dos?: ComoContesta } = {}) {
  const pedidos: string[] = [];
  const consultas: string[] = [];
  // Lo que hay en el mapa inventado; cada objeto lleva más cosas (quién lo editó, sus nodos), y de ahí solo valen sus
  // etiquetas.
  const mapa = [
    {
      type: "way",
      id: 11,
      user: "alguien",
      uid: 7,
      nodes: [1, 2],
      tags: { opening_hours: "Tu-Su 10:00-18:00", fee: "yes", website: "https://osm.inventado.example/" },
    },
    { type: "node", id: 22, user: "alguien", tags: { opening_hours: "24/7", fee: "no" } },
    // Wikidata dice este objeto del parque, pero el objeto dice que es de otro sitio: no vale.
    { type: "relation", id: 44, tags: { wikidata: "Q999", opening_hours: "Mo 10:00-11:00" } },
    // Cerca de la iglesia: uno de otro sitio, y el suyo.
    { type: "node", id: 30, tags: { wikidata: "Q30", opening_hours: "Mo 09:00-10:00" } },
    { type: "way", id: 33, tags: { wikidata: "Q3", opening_hours: "Mo-Fr 09:00-17:00", fee: "15€" } },
  ];
  const overpass = (consulta: string): unknown[] =>
    mapa.filter((e) => {
      const porNumero = new RegExp(`${e.type}\\(id:[\\d,]*\\b${e.id}\\b`).test(consulta);
      const q = (e.tags as Record<string, string | undefined>).wikidata;
      return porNumero || (q !== undefined && consulta.includes(`["wikidata"="${q}"](around:`));
    });
  const como = (c: ComoContesta, consulta: string): Respuesta => {
    if (c === "no_contesta") throw new Error("no contesta a tiempo");
    if (c === "caida") return { estado: 504, cuerpo: "<html>Gateway Timeout</html>", esperar: null };
    if (c === "espera") return { estado: 429, cuerpo: "", esperar: 5 };
    if (c === "rota") return { estado: 200, cuerpo: "<html>no es JSON", esperar: null };
    const elements = overpass(consulta);
    if (c === "a_medias") return ok({ elements: elements.slice(0, 1), remark: "runtime error: Query timed out" });
    return ok({ version: 0.6, generator: "Overpass API inventada", osm3s: { copyright: "ODbL" }, elements });
  };
  const traer = async (url: string): Promise<Respuesta> => {
    pedidos.push(url);
    if (url.startsWith("https://query.wikidata.org/")) {
      if (o.wikidataFalla) return { estado: 500, cuerpo: "", esperar: null };
      return ok({
        results: {
          bindings: [
            fila("Q1", { web: "https://museo.inventado.example/en/", way: "11" }),
            fila("Q1", { web: "https://museo.inventado.example/", way: "11" }),
            fila("Q2", { node: "22" }),
            fila("Q3", { web: "http://inseguro.inventado.example/" }),
            fila("Q4", { relation: "44" }),
          ],
        },
      });
    }
    for (const [base, c] of [
      [PRIMERA, o.uno ?? "bien"],
      [SEGUNDA, o.dos ?? "bien"],
    ] as const)
      if (url.startsWith(`${base}?data=`)) {
        const consulta = new URL(url).searchParams.get("data") ?? "";
        consultas.push(consulta);
        return como(c, consulta);
      }
    return { estado: 404, cuerpo: "", esperar: null };
  };
  const esperas: number[] = [];
  const avisos: string[] = [];
  return {
    traer,
    pedidos,
    consultas,
    esperas,
    avisos,
    overpass: [PRIMERA, SEGUNDA],
    dormir: async (ms: number) => void esperas.push(ms),
    avisar: (t: string) => void avisos.push(t),
  };
}

const CUATRO = [sitio("Q1", "Museo"), sitio("Q2", "Mirador"), sitio("Q3", "Iglesia"), sitio("Q4", "Parque")];

test("los datos abiertos: el horario y si se paga, de OpenStreetMap por Overpass; la web, de Wikidata", async () => {
  const f = fuentesAbiertas();
  const abiertos = await abiertosDe(CUATRO, f, new Date("2026-11-25T10:00:00Z"));
  const de = (id: string) => abiertos.find((a) => a.sitio === id)!;
  // El museo: su objeto, por Wikidata; su web, la más corta de las de Wikidata, y no la de OpenStreetMap.
  assert.deepEqual(de("Q1"), {
    sitio: "Q1",
    horario: "Tu-Su 10:00-18:00",
    dePago: true,
    web: "https://museo.inventado.example/",
    fuentes: [
      { url: "https://www.openstreetmap.org/way/11", visto: "2026-11-25" },
      { url: "https://www.wikidata.org/wiki/Q1", visto: "2026-11-25" },
    ],
    de: {
      horario: { url: "https://www.openstreetmap.org/way/11", visto: "2026-11-25" },
      pago: { url: "https://www.openstreetmap.org/way/11", visto: "2026-11-25" },
      web: { url: "https://www.wikidata.org/wiki/Q1", visto: "2026-11-25" },
    },
  });
  // El mirador: su nodo, por su número; gratis y abierto siempre.
  assert.equal(de("Q2").horario, "24/7");
  assert.equal(de("Q2").dePago, false);
  assert.equal(de("Q2").web, null);
  // La iglesia: Wikidata no sabe su objeto; cerca de su punto hay dos, y vale solo el que lleva su identificador. Su
  // web de Wikidata no es https: no vale. «15€» no dice sí ni no: no se sabe si se paga.
  assert.equal(de("Q3").horario, "Mo-Fr 09:00-17:00");
  assert.equal(de("Q3").dePago, null);
  assert.equal(de("Q3").web, null);
  assert.equal(de("Q3").de?.horario?.url, "https://www.openstreetmap.org/way/33");
  // El parque: el objeto que dice Wikidata es de otro sitio, y cerca no hay ninguno con el suyo. No se sabe nada.
  assert.equal(de("Q4").horario, null);
  assert.ok(!de("Q4").fuentes.some((x) => x.url.includes("openstreetmap")));
  // Una sola consulta para los cuatro, a la primera instancia; ni a la API de editar ni al buscador; sin esperas.
  assert.equal(f.consultas.length, 1);
  assert.ok(f.pedidos.every((u) => u.startsWith("https://query.wikidata.org/") || u.startsWith(PRIMERA)));
  assert.ok(!f.pedidos.some((u) => /api\.openstreetmap|nominatim/.test(u)));
  assert.deepEqual(f.esperas, []);
  assert.deepEqual(f.avisos, []);
  // Y de lo que se guarda, solo etiquetas: ni quién edita, ni sus nodos, ni lo que dice Overpass de sí.
  const guardado = JSON.stringify(abiertos);
  for (const nada of ["alguien", "uid", "nodes", "Overpass API inventada", "ODbL"]) assert.ok(!guardado.includes(nada));
});

test("los datos abiertos: la consulta a Overpass, por número y cerca del punto, solo etiquetas, validada", () => {
  const q = consultaDeOverpass({
    objetos: [
      { tipo: "way", id: 11 },
      { tipo: "way", id: 11 },
      { tipo: "node", id: 22 },
    ],
    cerca: [{ id: "Q3", punto: { lat: 10, lon: 20 } }],
  })!;
  assert.match(q, /^\[out:json\]\[timeout:\d+\];/);
  assert.match(q, /^node\(id:22\);$/m);
  assert.match(q, /^way\(id:11\);$/m);
  assert.match(q, /^nwr\["wikidata"="Q3"\]\(around:500,10\.000000,20\.000000\);$/m);
  assert.match(q, /out tags;$/);
  assert.doesNotMatch(q, /out (meta|body|geom)/);
  // Lo que no es un número, un identificador o un punto en su rango no entra en la consulta.
  const malos = consultaDeOverpass({
    objetos: [
      { tipo: "node", id: -1 },
      { tipo: "way", id: 1.5 },
      { tipo: "relation", id: Number.NaN },
      { tipo: "node; out meta; node" as "node", id: 5 },
    ],
    cerca: [
      { id: 'Q1"];out meta;nwr["x', punto: { lat: 10, lon: 20 } },
      { id: "Q2", punto: { lat: 91, lon: 20 } },
      { id: "Q2", punto: { lat: 10, lon: -181 } },
      { id: "Q2", punto: { lat: Number.NaN, lon: 0 } },
      { id: "q2", punto: { lat: 10, lon: 20 } },
    ],
  });
  assert.equal(malos, null);
  // Y lo que se lee de cada respuesta.
  assert.equal(dePagoDe("yes"), true);
  assert.equal(dePagoDe(" No "), false);
  assert.equal(dePagoDe("donation"), null);
  assert.equal(
    leerWikidata({ results: { bindings: [fila("Q1", { web: "https://x.example/?token=1" })] } }).get("Q1")?.webs.length,
    0,
  );
  assert.equal(leerWikidata(null).size, 0);
  assert.throws(() => leerOverpass("<html>"), /no contesta con datos/);
  assert.throws(() => leerOverpass('{"elements": "x"}'), /no contesta con datos/);
  assert.throws(() => leerOverpass('{"elements": [], "remark": "runtime error: out of memory"}'), /a medias/);
  assert.deepEqual(leerOverpass('{"elements": [{"type": "node", "id": 1, "user": "x", "lat": 1}]}'), [
    { tipo: "node", id: 1, etiquetas: {} },
  ]);
});

test("los datos abiertos: las instancias de Overpass, del entorno, validadas; sin él, la principal", () => {
  assert.deepEqual(instanciasDeOverpass(undefined), { instancias: OVERPASS_POR_DEFECTO, malas: 0 });
  assert.deepEqual(instanciasDeOverpass("  "), { instancias: OVERPASS_POR_DEFECTO, malas: 0 });
  assert.deepEqual(instanciasDeOverpass(`${PRIMERA}, ${SEGUNDA},${PRIMERA}`), {
    instancias: [PRIMERA, SEGUNDA],
    malas: 0,
  });
  const malas = [
    "http://overpass.inseguro.example/api/interpreter",
    "https://usuario:clave@overpass.example/api/interpreter",
    "https://overpass.example/api/interpreter?key=1",
    "https://overpass.example/api/interpreter#x",
    "ftp://overpass.example/",
    "no es una direccion",
  ];
  assert.deepEqual(instanciasDeOverpass([...malas, SEGUNDA].join(",")), { instancias: [SEGUNDA], malas: malas.length });
  assert.deepEqual(instanciasDeOverpass(malas.join(",")), { instancias: [], malas: malas.length });
  const muchas = Array.from({ length: 9 }, (_, i) => `https://o${i}.example/api/interpreter`).join(",");
  assert.equal(instanciasDeOverpass(muchas).instancias.length, 4);
});

test("los datos abiertos: si la primera instancia cae, contesta la segunda", async () => {
  for (const uno of ["caida", "rota", "a_medias", "no_contesta"] as const) {
    const f = fuentesAbiertas({ uno });
    const abiertos = await abiertosDe(CUATRO, f);
    assert.equal(abiertos.find((a) => a.sitio === "Q1")?.horario, "Tu-Su 10:00-18:00", uno);
    assert.equal(abiertos.find((a) => a.sitio === "Q3")?.horario, "Mo-Fr 09:00-17:00", uno);
    assert.equal(f.consultas.length, 2, uno);
    assert.ok(f.pedidos.at(-1)!.startsWith(SEGUNDA), uno);
    assert.deepEqual(f.avisos, [], uno);
  }
  // La que no contesta se corta con su tope, aunque quien la pide no sepa cortarla.
  const colgada = fuentesAbiertas();
  const traer = (url: string) => (url.startsWith(PRIMERA) ? new Promise<Respuesta>(() => {}) : colgada.traer(url));
  const r = await abiertosDe(CUATRO, { ...colgada, traer, tope: 1500 });
  assert.equal(r.find((a) => a.sitio === "Q1")?.web, "https://museo.inventado.example/");
  assert.match(colgada.avisos.join(" "), /sin el horario/);
});

test("los datos abiertos: si ninguna instancia contesta, se dice, y la web de Wikidata llega", async () => {
  const f = fuentesAbiertas({ uno: "caida", dos: "rota" });
  const abiertos = await abiertosDe(CUATRO, f);
  assert.equal(abiertos.length, 4);
  assert.ok(abiertos.every((a) => a.horario === null && a.dePago === null));
  assert.ok(abiertos.every((a) => !a.fuentes.some((x) => x.url.includes("openstreetmap"))));
  assert.equal(abiertos.find((a) => a.sitio === "Q1")?.web, "https://museo.inventado.example/");
  assert.equal(f.avisos.length, 1);
  assert.match(f.avisos[0], /sin el horario ni si se paga de OpenStreetMap: Overpass no contesta/);
  assert.match(f.avisos[0], /overpass\.uno\.example contesta 504/);
  // Una vez cada una, sin martillear.
  assert.equal(f.consultas.length, 2);
  // Si dicen que se espere, se espera lo que dicen y se vuelve una sola vez, a la que menos pidió.
  const esperan = fuentesAbiertas({ uno: "espera", dos: "caida" });
  await abiertosDe(CUATRO, esperan);
  assert.deepEqual(esperan.esperas, [5000]);
  assert.equal(esperan.consultas.length, 3);
  // Si lo que piden esperar no cabe en el tope, no se espera.
  const sinTiempo = fuentesAbiertas({ uno: "espera", dos: "espera" });
  await abiertosDe(CUATRO, { ...sinTiempo, tope: 4000 });
  assert.deepEqual(sinTiempo.esperas, []);
  assert.equal(sinTiempo.consultas.length, 2);
  // Sin ninguna dirección que valga, ni se intenta; y se dice.
  const ninguna = fuentesAbiertas();
  await abiertosDe(CUATRO, { ...ninguna, overpass: ["http://inseguro.example/api/interpreter"] });
  assert.equal(ninguna.consultas.length, 0);
  assert.match(ninguna.avisos.join(" "), /ninguna dirección de Overpass/);
});

test("los datos abiertos: si una fuente falla, se sigue con las otras; si fallan todas, se dice", async () => {
  const sinWikidata = fuentesAbiertas({ wikidataFalla: true });
  const con = await abiertosDe([sitio("Q3", "Iglesia")], sinWikidata);
  assert.equal(con[0].horario, "Mo-Fr 09:00-17:00");
  const nada = fuentesAbiertas({ wikidataFalla: true, uno: "caida", dos: "caida" });
  await assert.rejects(abiertosDe([sitio("Q3", "Iglesia")], { ...nada, intentos: 1 }), /contestan/);
  // Un sitio sin identificador de Wikidata no se pide.
  assert.deepEqual(await abiertosDe([sitio("x1", "Inventado")], fuentesAbiertas()), []);
});

// ---------- la puerta 13

const HOY = "2031-02-20";
const PARA: ParaLasEntradas = {
  sitios: ["Q1", "Q2"],
  entrada: "2031-03-08",
  salida: "2031-03-11",
  hoy: HOY,
  abiertas: [PAGINA_DE_LAS_ENTRADAS],
  deLosAbiertos: ["https://datos.inventado.example/Q1"],
};

/** Una entrega que pasa: la del de las entradas de mentira, con la página que abre. */
const buena = (): EntregaDeLasEntradas =>
  entregaDeLasEntradas(
    { today: HOY, currency: "EUR", dates: { check_in: PARA.entrada, check_out: PARA.salida } },
    [{ id: "Q1" }, { id: "Q2" }],
    true,
  );

const rojosDe = (e: unknown, p: ParaLasEntradas = PARA): string[] =>
  puertaEntradas(e, p).rojos.map((r) => `${r.donde}: ${r.que}`);

test("la puerta 13: la entrega de mentira pasa, y la que no sabe nada también, si lo dice", () => {
  assert.deepEqual(rojosDe(buena()), []);
  const nada = entregaDeLasEntradas({ today: HOY }, [{ id: "Q1" }, { id: "Q2" }], false);
  assert.deepEqual(rojosDe(nada), []);
});

test("la puerta 13: cada trampa, su rojo", () => {
  const trampas: [string, (e: any) => void, RegExp][] = [
    // Cada precio y cada horario sale de una página que abrió de verdad.
    [
      "una página que no abrió",
      (e) => (e.sights[0].prices[0].source = "https://otra.example/precios"),
      /abriera de verdad/,
    ],
    [
      "una página de los datos abiertos",
      (e) => (e.sights[0].hours[0].source = "https://datos.inventado.example/Q1"),
      /datos abiertos/,
    ],
    [
      "una página que no es https",
      (e) => (e.sights[0].prices[0].source = "http://sitios.inventado.example/entradas"),
      /https/,
    ],
    // Lleva su moneda y su fecha.
    ["un precio sin moneda", (e) => (e.sights[0].prices[0].currency = null), /moneda/],
    ["una moneda en minúsculas", (e) => (e.sights[0].prices[0].currency = "eur"), /moneda/],
    ["un precio aproximado", (e) => (e.sights[0].prices[0].amount = "about 10"), /importe/],
    ["un precio de cero", (e) => (e.sights[0].prices[0].amount = 0), /importe/],
    ["gratis con moneda", (e) => (e.sights[1].prices[0].currency = "EUR"), /gratis/],
    ["sin el día en que se vio", (e) => (e.sights[0].prices[0].seen = "unknown"), /día en que se vio/],
    ["visto después de hoy", (e) => (e.sights[0].hours[0].seen = "2031-03-01"), /después de hoy/],
    ["para quién, fuera de la lista", (e) => (e.sights[0].prices[0].for = "pensioner"), /para quién/],
    ["unas edades al revés", (e) => (e.sights[0].prices[1].ages = { from: 12, to: 3 }), /al revés/],
    // Ningún sitio que no esté entre los elegidos, y lo que no se sabe, dicho.
    ["un sitio que no se le dio", (e) => (e.sights[1].id = "Q99"), /no es un sitio de los que se le dieron/],
    ["un sitio dos veces", (e) => (e.sights[1].id = "Q1"), /sale dos veces/],
    ["un sitio que falta", (e) => e.sights.pop(), /falta el sitio Q2/],
    ["un campo de más", (e) => (e.sights[0].rating = 5), /no es de la entrega/],
    ["un campo que falta", (e) => delete e.sights[0].booking, /booking: falta/],
    ["una lista de precios vacía", (e) => (e.sights[0].prices = []), /lista de precios/],
    // Un horario vale para las fechas del viaje o dice para cuáles.
    [
      "un horario de otras fechas",
      (e) => Object.assign(e.sights[0].hours[0], { from: "2031-06-01", to: "2031-09-30" }),
      /otras fechas/,
    ],
    [
      "unas fechas al revés",
      (e) => Object.assign(e.sights[0].hours[0], { from: "2031-03-11", to: "2031-03-01" }),
      /al revés/,
    ],
    [
      "un día que cierra fuera del viaje",
      (e) => (e.sights[0].hours[0].closed_on = ["2031-04-01"]),
      /no es un día del viaje/,
    ],
    ["un día de la semana que no es", (e) => (e.sights[0].hours[0].open[0].days = ["monday"]), /días de la semana/],
    [
      "un tramo que cierra antes de abrir",
      (e) => (e.sights[0].hours[0].open[0].closes = "08:00"),
      /cierra antes de abrir/,
    ],
    ["una hora que no es", (e) => (e.sights[0].hours[0].open[0].opens = "9h"), /HH:MM/],
    // Un enlace de reserva es una dirección que vale y sin claves dentro.
    [
      "una reserva con su clave",
      (e) => (e.sights[0].booking.where = "https://reservas.example/?token=abc"),
      /sin claves/,
    ],
    ["una reserva que no es una dirección", (e) => (e.sights[0].booking.where = "at the door"), /sin claves/],
    ["no dice si hay que reservar", (e) => (e.sights[0].booking.needed = "yes"), /true o false/],
    ["una web que no es https", (e) => (e.sights[0].official_site = "http://sitio.example/"), /official_site/],
    // Lo que no se supo, en frases cortas y sin direcciones.
    ["lo que no se supo, con una dirección", (e) => (e.unknowns = ["see https://x.example/"]), /sin direcciones/],
    ["no es la entrega del de las entradas", (e) => (e.seat = "calendar"), /de las entradas/],
  ];
  for (const [nombre, estropea, rojo] of trampas) {
    const e = structuredClone(buena());
    estropea(e);
    const rojos = rojosDe(e);
    assert.ok(
      rojos.some((r) => rojo.test(r)),
      `${nombre}: ${rojos.join(" | ")}`,
    );
  }
  // Sin la memoria de lo consultado, la página no se mira aquí: la mira la puerta de todos.
  const otra = structuredClone(buena()) as any;
  otra.sights[0].prices[0].source = "https://otra.example/precios";
  assert.deepEqual(rojosDe(otra, { ...PARA, abiertas: null }), []);
  assert.deepEqual(rojosDe(null), ["delivery: no es un objeto"]);
});

// ---------- lo que pasa al viaje

const ABIERTOS: DatosAbiertos[] = [
  {
    sitio: "Q1",
    horario: "Mo-Sa 10:00-18:00",
    dePago: true,
    web: "https://q1.inventado.example/",
    fuentes: [{ url: "https://www.openstreetmap.org/way/1", visto: "2026-11-25" }],
  },
  {
    sitio: "Q2",
    horario: "Apr-Oct 10:00-18:00",
    dePago: false,
    web: null,
    fuentes: [{ url: "https://www.openstreetmap.org/node/2", visto: "2026-11-25" }],
  },
];

test("al viaje: manda lo que leyó el asiento; lo que no sabe, lo que dicen los datos abiertos, con su página", () => {
  const e = buena();
  e.sights[1].hours = "unknown";
  e.sights[1].prices = "unknown";
  const r = paraEnsenarEntradas([e], ["Q1", "Q2", "Q3"], ABIERTOS);
  const [q1, q2, q3] = r.sitios;
  assert.equal(q1.precios?.[0].fuente.url, PAGINA_DE_LAS_ENTRADAS);
  assert.equal(q1.web, "https://q1.inventado.example/");
  assert.equal(q1.reservar?.haceFalta, true);
  // El asiento no supo su horario, y los datos abiertos no se entienden: no se sabe. Sí se sabe que no se paga.
  assert.equal(q2.horarios, null);
  assert.deepEqual(q2.precios, [
    {
      para: "any",
      edades: null,
      cuanto: "free",
      fuente: { url: "https://www.openstreetmap.org/node/2", visto: "2026-11-25" },
    },
  ]);
  // El que no se miró, solo con lo que dicen los datos abiertos: sin ellos, nada.
  assert.deepEqual(q3, {
    parada: "Q3",
    precios: null,
    horarios: null,
    reservar: null,
    web: null,
    mirado: false,
    sinMirar: "over_limit",
  });
  const q1Abierto = entradaAbierta("Q1", ABIERTOS[0]);
  assert.equal(q1Abierto.mirado, false);
  assert.equal(abreElDia(q1Abierto.horarios, "2031-03-09"), false);
  assert.equal(q1Abierto.precios, null);
});

// ---------- el ritmo y la puerta 9

/** Unas paradas juntas, de una hora: cuatro, si no se dice otra cosa. */
function juntas(cuantas = 4): Parada[] {
  return "abcdefgh"
    .slice(0, cuantas)
    .split("")
    .map((id, i) => ({
      id,
      nombre: id,
      clase: "museum",
      punto: { lat: 10 + i * 0.001, lon: 20 },
      porQue: "Porque sí.",
      minutos: 60,
      imprescindible: id === "a",
      foto: null,
      origen: { fuente: "inventada", visto: "2026-11-23T10:00:00.000Z", enlace: null },
    }));
}
const BASE = { lat: 10, lon: 20 };
const TRES = fechasDe("2031-03-08", "2031-03-10");

const delDia = (r: ReturnType<typeof repartir>, id: string): string | null =>
  r.dias.find((d) => d.paradas.includes(id))?.fecha ?? null;

test("el ritmo: un sitio no va el día que se sabe que cierra; va a otro, y lo demás, igual", () => {
  const sin = repartir(juntas(), TRES, "normal", BASE);
  const dia = delDia(sin, "a")!;
  const con = repartir(juntas(), TRES, "normal", BASE, {}, null, { a: [dia] });
  assert.notEqual(delDia(con, "a"), null);
  assert.notEqual(delDia(con, "a"), dia);
  assert.deepEqual(con.fuera, []);
  // La misma entrada da siempre los mismos días.
  assert.deepEqual(repartir(juntas(), TRES, "normal", BASE, {}, null, { a: [dia] }), con);
  // Lo que no se sabe no mueve nada: un sitio sin días que cierra, o con días que no son del viaje.
  assert.deepEqual(repartir(juntas(), TRES, "normal", BASE, {}, null, { b: [], z: [dia] }), sin);
  assert.deepEqual(puertaDias({ ...conLaPuerta(con), cierra: { a: [dia] } }).rojos, []);
});

test("el ritmo: si cierra todos los días en que cabría, se queda fuera y dice que es porque cierra", () => {
  const r = repartir(juntas(), TRES, "normal", BASE, {}, null, { b: TRES });
  assert.ok(r.fuera.includes("b"));
  assert.equal(r.porQue.b, "closed");
  // Aunque sea imprescindible: la puerta 9 lo deja estar fuera por eso.
  const imprescindible = repartir(juntas(), TRES, "normal", BASE, {}, null, { a: TRES });
  assert.equal(imprescindible.porQue.a, "closed");
  assert.deepEqual(puertaDias({ ...conLaPuerta(imprescindible), cierra: { a: TRES } }).rojos, []);
  // Un día que no cabe por otra cosa sigue diciendo su porqué de siempre.
  const unDia = repartir(juntas(), ["2031-03-08"], "calm", BASE, {}, null, {});
  assert.ok(Object.values(unDia.porQue).every((m) => m === "full"));
});

test("el ritmo: lo que el viajero movió a un día va a ese día, y lo que añadió, a uno que abre si lo hay", () => {
  const DOS = TRES.slice(0, 2);
  const sin = repartir(juntas(7), DOS, "calm", BASE);
  const fuera = sin.fuera[0];
  assert.ok(fuera !== undefined);
  const cerca = repartir(juntas(7), DOS, "calm", BASE, { anadidas: [fuera] });
  const dia = delDia(cerca, fuera)!;
  const anadida = repartir(juntas(7), DOS, "calm", BASE, { anadidas: [fuera] }, null, { [fuera]: [dia] });
  assert.notEqual(delDia(anadida, fuera), dia);
  assert.notEqual(delDia(anadida, fuera), null);
  const movida = repartir(juntas(), TRES, "normal", BASE, { fijadas: { a: 0 } }, null, { a: [TRES[0]] });
  assert.equal(delDia(movida, "a"), TRES[0]);
});

/** Lo que mira la puerta 9 de un reparto. */
const conLaPuerta = (r: ReturnType<typeof repartir>) => ({
  paradas: juntas(),
  dias: r.dias,
  fuera: r.fuera,
  porQue: r.porQue,
  sitios: juntas().map((p) => p.id),
});

test("la puerta 9: lo que se sabe que cierra ese día no está en ese día", () => {
  const r = repartir(juntas(), TRES, "normal", BASE);
  const dia = delDia(r, "a")!;
  const rojos = puertaDias({ ...conLaPuerta(r), cierra: { a: [dia] } }).rojos;
  assert.ok(
    rojos.some((x) => /lleva la parada a, que ese día cierra/.test(x.que)),
    JSON.stringify(rojos),
  );
  // Sin saber lo que cierra, nada.
  assert.deepEqual(puertaDias(conLaPuerta(r)).rojos, []);
  // Decir que se queda fuera porque cierra, sin que se sepa que cierre, es un rojo.
  const fuera = { ...r, dias: r.dias.map((d) => ({ ...d, paradas: d.paradas.filter((id) => id !== "d") })) };
  const sinRazon = puertaDias({ ...conLaPuerta(fuera), fuera: ["d"], porQue: { d: "closed" } }).rojos;
  assert.ok(sinRazon.some((x) => /porque cierra/.test(x.que)));
});

// ---------- la investigación inventada, entera, con el contrato de verdad

test("la investigación inventada: el sitio que cierra no va ese día, y la web da los mismos días", async () => {
  assert.ok(hayContrato("tickets"));
  const run = runNuevo();
  try {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    assert.deepEqual(r.parado, null);
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(v), []);
    const cierra = cierraEnElViaje(v);
    // El primer sitio cierra el segundo día del viaje (un festivo) y los lunes; el viaje no lo pone esos días.
    const primero = v.entradas!.sitios[0].parada;
    assert.ok(cierra[primero]?.includes(fechasDe(v.entrada, v.salida)[1]));
    for (const d of v.dias)
      for (const id of d.paradas) assert.ok(!(cierra[id] ?? []).includes(d.fecha), `${id} ${d.fecha}`);
    assert.ok(v.dias.some((d) => d.paradas.includes(primero)));
    // La web reparte igual: con lo que cierra cada sitio, sus días son los de la casa.
    assert.deepEqual(
      diasElegidos(v, SIN_ELEGIR),
      v.dias.map((d) => ({ fecha: d.fecha, paradas: d.paradas })),
    );
    // Lo que se le dio: los datos abiertos, en inglés y con su página; y lo que se guardó de ellos.
    const dado = leerJson(join(run, "puestos", "entradas-v1", "in", "open_data.json"));
    assert.deepEqual(Object.keys(dado[0]).sort(), ["fee", "id", "opening_hours", "website"]);
    assert.equal(dado[0].opening_hours.as_written, "Tu-Su 09:00-18:00");
    assert.equal(dado[1].opening_hours, "unknown");
    const limites = leerJson(join(run, "puestos", "entradas-v1", "in", "limits.json"));
    assert.deepEqual(Object.keys(limites).sort(), ["pages", "searches", "sights_in_this_call"]);
    // Del viaje, el destino, las fechas, el idioma, la moneda y cuántos son con sus edades: ni quién, ni sus precios.
    const viajeDado = JSON.parse(readFileSync(join(run, "puestos", "entradas-v1", "in", "trip.json"), "utf8"));
    assert.deepEqual(Object.keys(viajeDado).sort(), [
      "currency",
      "dates",
      "destination",
      "language",
      "today",
      "travellers",
    ]);
    assert.deepEqual(Object.keys(viajeDado.travellers).sort(), ["adults", "children"]);
    assert.ok(existsSync(join(run, "abiertos.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("la puerta 13 en la casa: un precio de una página que no abrió vuelve al asiento", async () => {
  const run = runNuevo();
  try {
    const f = fuentesInventadas();
    let estado = await sigue(run, f);
    for (let i = 0; i < 20 && !estado.esperan.some((id) => id.startsWith("entradas-")); i++) {
      for (const id of [...estado.esperan, ...(estado.porDetras ?? [])])
        if (existsSync(join(run, "puestos", id))) trabaja(run, id);
      estado = await sigue(run, f);
    }
    assert.ok(estado.esperan.includes("entradas-v1"));
    trabaja(run, "entradas-v1", (_asiento, e) => {
      e.sights[0].prices[0].source = "https://reventa.inventado.example/precios";
    });
    estado = await sigue(run, f);
    const puertas = leerJson(join(run, "entradas-v1.puertas.json"));
    assert.equal(puertas.verde, false);
    // La puerta de todos lo ve (no se abrió ni venía en su material), y la 13 también.
    assert.ok(
      puertas.rojos.some((x: { que: string }) => /abriera de verdad/.test(x.que)),
      JSON.stringify(puertas.rojos),
    );
    assert.ok(estado.esperan.includes("entradas-v2"));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("lo que cierra en el viaje: de sus entradas; sin ellas, o si faltan, nada", () => {
  const e: DeLasEntradas = paraEnsenarEntradas([buena()], [], []);
  const v = { entradas: e, entrada: PARA.entrada, salida: PARA.salida };
  // El primero cierra los lunes (2031-03-10) y el segundo día del viaje (2031-03-09).
  assert.deepEqual(cierraEnElViaje(v), { Q1: ["2031-03-09", "2031-03-10"] });
  assert.deepEqual(cierraEnElViaje({ ...v, entradas: { sitios: [], falta: "late" } }), {});
  assert.deepEqual(cierraEnElViaje({ entrada: PARA.entrada, salida: PARA.salida }), {});
});

test("los datos abiertos inventados pasan por el mismo camino que los de verdad", async () => {
  const [a] = await abiertosInventados()([sitio("Q1", "Faro")]);
  assert.equal(entradaAbierta("Q1", a).horarios?.[0].fuente.url, "https://datos.inventado.example/Q1");
});

// ---------- el orden en que se miran, si pasan del tope

test("si hay más sitios que el tope: imprescindibles y con puerta primero, siempre igual", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `Q${i + 1}`);
  const sitios = ids.map((id) => sitio(id, id));
  // El 5 y el 20, imprescindibles; los pares tienen horario; del 3 se sabe que no se paga ni tiene horario.
  const go = ids.map((id, i) => ({ id, must: i === 4 || i === 19 }));
  const abiertos: DatosAbiertos[] = ids.map((id, i) => ({
    sitio: id,
    horario: i % 2 === 1 ? "Tu-Su 10:00-18:00" : null,
    dePago: i === 2 ? false : null,
    web: null,
    fuentes: [],
  }));
  const orden = ordenParaMirar(go, sitios, abiertos).map((s) => s.id);
  // Entre los imprescindibles, también antes el que tiene puerta.
  assert.deepEqual(orden.slice(0, 2), ["Q20", "Q5"]);
  assert.deepEqual(orden.slice(2, 5), ["Q2", "Q4", "Q6"]);
  assert.equal(orden.at(-1), "Q3");
  assert.equal(new Set(orden).size, 30);
  assert.deepEqual(
    ordenParaMirar(go, sitios, abiertos).map((s) => s.id),
    orden,
  );
  // Sin datos abiertos, el orden del que elige, con los imprescindibles delante.
  assert.deepEqual(
    ordenParaMirar(go, sitios, [])
      .map((s) => s.id)
      .slice(0, 3),
    ["Q5", "Q20", "Q1"],
  );
  // Lo que pasa del tope se dice como tal, y no como un fallo.
  const e = paraEnsenarEntradas([], orden, abiertos);
  assert.deepEqual(losDiasSinEntradas(e), [
    "6 sitios se quedan sin mirar sus entradas: pasan del tope de 24 por viaje",
  ]);
  assert.deepEqual(losDiasSinEntradas({ sitios: [], falta: "failed" }), [
    "los días se reparten sin los horarios de las entradas (failed)",
  ]);
  assert.deepEqual(losDiasSinEntradas(paraEnsenarEntradas([], ids.slice(0, 24), [])), []);
  assert.equal(tandasDeSitios(ordenParaMirar(go, sitios, abiertos)).flat().length, 24);
});

test("lo que avisan los datos abiertos queda con los avisos del run, no solo en la consola", async () => {
  const run = runNuevo();
  const sitio = { id: "Q1", nombre: "Faro Inventado", punto: { lat: 10, lon: 20 } } as Sitio;
  const traidos = await traerLosAbiertos(run, [sitio], async (sitios, avisar) => {
    avisar?.("sin el horario ni si se paga de OpenStreetMap: ninguna instancia contesta");
    return sitios.map((s) => ({ sitio: s.id, horario: null, dePago: null, web: null, fuentes: [] }));
  });
  assert.equal(traidos.length, 1);
  assert.deepEqual(leerJson(join(run, ARCHIVO_DE_LOS_ABIERTOS)).avisos, [
    "datos abiertos: sin el horario ni si se paga de OpenStreetMap: ninguna instancia contesta",
  ]);
  rmSync(run, { recursive: true, force: true });
});
