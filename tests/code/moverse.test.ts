// El de moverse (14.2): su contrato, lo que ve y lo que no, su puerta 11 con cada trampa en su prueba, la página que
// no se abrió (la caza la puerta de todos), y la cuenta de lo que conviene: billetes sueltos, un abono, un bono o una
// mezcla, por persona y para el grupo, sin inventar lo que no se sabe. Con el caso inventado: sin internet y sin
// gastar.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { LO_MAS_DE_MOVERSE } from "../../agent/data/capa_moverse.ts";
import { topesDeInternet } from "../../agent/data/internet.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import type { Material } from "../../agent/launcher/capas.ts";
import { paraLaPuerta, piezasDeMoverse, puertaDeMoverse } from "../../agent/launcher/capa_moverse.ts";
import { puertaMoverse } from "../../agent/gates/puerta_moverse.ts";
import { paginasEn } from "../../agent/launcher/consultado.ts";
import type { Billete, DeMoverse, PrecioDeCapa } from "../../agent/output/capas.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import {
  cuentaDeMoverse,
  cuentaDelGrupo,
  paraEnsenarMoverse,
  precioPara,
  viajesDeLosDias,
  type EntregaDeMoverse,
} from "../../agent/scripts/capa_moverse.ts";
import {
  fuentesInventadas,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
  type Objeto,
} from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";
import { entregaDeMoverse, PAGINA_DE_MOVERSE } from "../cases/inventado/moverse.ts";

const HOY = "2031-02-11";

/** Un material inventado: el viaje del caso, hoy, una base con dos zonas. */
function material(o: { bases?: number; aeropuerto?: string | null } = {}): Material {
  const bases = Array.from({ length: o.bases ?? 1 }, (_, i) => ({ id: `b${i + 1}`, name: `Base ${i + 1}`, nights: 2 }));
  const zona = (id: string, base: string) => ({
    id,
    base,
    name: id,
    label: `Zona ${id}`,
    centre: { lat: 10, lon: 20 },
    radius_m: 800,
    why: "close to the sights",
    near: [],
  });
  return {
    viaje: {
      ...ENTENDIDO,
      destination: { ...ENTENDIDO.destination, airport: o.aeropuerto === undefined ? "VVV" : o.aeropuerto },
      travellers: { ...ENTENDIDO.travellers, children: [8] },
    },
    hoy: HOY,
    ruta: { shape: bases.length > 1 ? "route" : "base", bases },
    zonas: [zona("z1", "b1"), zona("z2", bases[bases.length - 1].id)],
    elegidos: [],
    abiertos: [],
  };
}

/** Lo que ve el asiento, por el nombre de su archivo. */
const vistoPor = (m: Material): Record<string, Objeto> =>
  Object.fromEntries(piezasDeMoverse(m).map((p) => [p.ruta, JSON.parse((p as { contenido: string }).contenido)]));

/** La entrega buena del asiento de mentira, con el material que se le da. */
function buena(m: Material = material()): EntregaDeMoverse {
  const visto = vistoPor(m);
  return entregaDeMoverse(visto["trip.json"], visto["route.json"], true);
}

const rojosDe = (e: unknown, m: Material = material()): string[] =>
  puertaMoverse(e, paraLaPuerta(m)).rojos.map((r) => `${r.donde}: ${r.que}`);

/** Textos que un navegador abre como una página https, y que no están escritos en su forma normal. */
const RAROS = (pagina: string): string[] => {
  const resto = pagina.slice("https://".length);
  return [
    `https:${resto}`,
    `https:/${resto}`,
    `https:\\\\${resto.replaceAll("/", "\\")}`,
    `h\nttps://${resto}`,
    ` ${pagina}`,
    `HTTPS://${resto}`,
    `https://user@${resto}`,
    `https://127.0.0.1/x`,
  ];
};

// ---------- el contrato y lo que ve

test("su contrato sale a internet, y dice lo que busca", () => {
  const carpeta = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "getting-around");
  for (const archivo of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md", "INTERNET.md"])
    assert.ok(readFileSync(join(carpeta, archivo), "utf8").trim().length > 0, archivo);
  assert.match(readFileSync(join(carpeta, "DELIVERY.md"), "utf8"), /\| `seat` \| Always `"getting-around"` \|/);
  const reglas = [...readFileSync(join(carpeta, "RULES.md"), "utf8").matchAll(/^- \*\*(RM\d+)\./gm)].map((x) => x[1]);
  assert.deepEqual(reglas, ["RM1", "RM2", "RM3", "RM4", "RM5", "RM6", "RM7", "RM8", "RM9"]);
  // Cada regla que cita la puerta está en el contrato.
  const puerta = readFileSync(resolve(import.meta.dirname, "..", "..", "agent", "gates", "puerta_moverse.ts"), "utf8");
  for (const citada of new Set([...puerta.matchAll(/\((RM\d+)\)/g)].map((x) => x[1])))
    assert.ok(reglas.includes(citada), citada);
});

test("lo que ve: el destino, sus fechas, sus zonas, por dónde se llega y cuántos son; nadie con su nombre", () => {
  const visto = vistoPor(material());
  assert.deepEqual(Object.keys(visto).sort(), ["limits.json", "route.json", "trip.json"]);
  assert.equal(visto["trip.json"].today, HOY);
  assert.deepEqual(visto["trip.json"].arrival, { airport: "VVV" });
  // Cuántos son, sin sus edades.
  assert.deepEqual(visto["trip.json"].travellers, { adults: 2, children: 1 });
  assert.deepEqual(
    visto["route.json"].zones.map((z: Objeto) => z.id),
    ["z1", "z2"],
  );
  const todo = JSON.stringify(visto);
  for (const callado of ["passports", "Origen Inventado", "gimnasio", "tastes", "budget", "said", "looking_for"])
    assert.ok(!todo.includes(callado), callado);
  // Ninguna página: así, la puerta de todos solo le deja citar las que abrió de verdad, en cualquiera de sus vueltas.
  assert.deepEqual(paginasEn(todo), []);
  // Sin aeropuerto sabido, dice que no se sabe.
  assert.deepEqual(vistoPor(material({ aeropuerto: null }))["trip.json"].arrival, { airport: "unknown" });
  const { busquedas, paginas } = topesDeInternet("getting-around");
  assert.deepEqual(visto["limits.json"], { searches: busquedas, pages: paginas, ...LO_MAS_DE_MOVERSE });
});

// ---------- la puerta 11

test("puerta 11: una página que el navegador abriría, pero no escrita en su forma normal, no vale", () => {
  for (const raro of RAROS(PAGINA_DE_MOVERSE)) {
    const e = structuredClone(buena()) as unknown as Objeto;
    e.arrivals[0].source = raro;
    assert.ok(
      rojosDe(e).some((r) => r.startsWith("arrivals[0].source: ") && /forma normal/.test(r)),
      JSON.stringify(raro),
    );
  }
  // La misma página sin la barra de un sitio sin camino sí vale, y se guarda con ella.
  const e = structuredClone(buena()) as unknown as Objeto;
  e.arrivals[0].source = "https://transporte.inventado.example";
  assert.deepEqual(rojosDe(e), []);
  assert.equal(
    paraEnsenarMoverse(e as unknown as EntregaDeMoverse).llegar[0].fuente.url,
    "https://transporte.inventado.example/",
  );
});

test("la entrega buena pasa la puerta 11, con página y sin ella, y se enseña sin frases suyas", () => {
  assert.deepEqual(rojosDe(buena()), []);
  // Sin internet no encontró nada, y lo dice.
  const sin = entregaDeMoverse(vistoPor(material())["trip.json"], vistoPor(material())["route.json"], false);
  assert.deepEqual(rojosDe(sin), []);
  assert.deepEqual(puertaDeMoverse(buena(), material()), []);
  const visto = paraEnsenarMoverse(buena());
  assert.equal(visto.llegar[0].desde.codigo, "VVV");
  assert.equal(visto.llegar[0].desde.nombre, null);
  assert.deepEqual(visto.transportes[0].zonas, ["z1", "z2"]);
  assert.ok(!JSON.stringify(visto).includes("child pays"));
  // Un precio con sus céntimos, como lo da la página, vale.
  const conCentimos = structuredClone(buena()) as Objeto;
  conCentimos.tickets[0].prices[0].amount = 2.4;
  assert.deepEqual(rojosDe(conCentimos), []);
  // Un número de una frase que está en sus datos sí vale.
  assert.deepEqual(rojosDe({ ...buena(), unknowns: ["The page does not say until when the 3-day pass runs."] }), []);
});

/** Una trampa: lo que se le cambia a la entrega buena, y lo que tiene que decir la puerta. */
type Trampa = [string, (e: Objeto) => void, RegExp, Material?];

const precio0 = (e: Objeto): Objeto => e.tickets[0].prices[0];

const TRAMPAS: Trampa[] = [
  ["no es su entrega", (e) => (e.seat = "calendar"), /^seat: no es la entrega del de moverse/],
  ["un campo de más", (e) => (e.best = "bus"), /^best: no es un campo de su entrega/],
  ["un campo de menos", (e) => delete e.payment, /^payment: falta/],
  [
    "una página que no es https",
    (e) => (e.arrivals[0].source = "http://x.example/a"),
    /arrivals\[0\]\.source: no dice la página/,
  ],
  [
    "una página de dentro",
    (e) => (precio0(e).source = "https://intranet.local/fares"),
    /prices\[0\]\.source: no dice la página/,
  ],
  ["un precio visto otro día", (e) => (precio0(e).seen = "2030-01-01"), /prices\[0\]\.seen: no es hoy/],
  ["un día que no es una fecha", (e) => (e.transport[0].seen = "yesterday"), /transport\[0\]\.seen: no dice el día/],
  ["un precio sin su moneda", (e) => (precio0(e).currency = null), /prices\[0\]\.currency: no lleva su moneda/],
  ["una moneda en minúsculas", (e) => (precio0(e).currency = "eur"), /no lleva su moneda/],
  [
    "un precio aproximado",
    (e) => (precio0(e).amount = "about 2"),
    /prices\[0\]\.amount: no es un importe de la página/,
  ],
  ["un precio de cero", (e) => (precio0(e).amount = 0), /no es un importe de la página, más que cero, ni free/],
  ["un precio con una cuenta detrás", (e) => (precio0(e).amount = 2.345), /lleva más de dos decimales/],
  ["lo gratis con moneda", (e) => (precio0(e).amount = "free"), /lo que es gratis no lleva moneda/],
  ["unos precios vacíos por no saber", (e) => (e.tickets[1].prices = []), /una lista vacía no dice nada/],
  ["unas edades al revés", (e) => (e.tickets[0].prices[1].ages = { from: 12, to: 4 }), /las edades van al revés/],
  ["para quien no es de la lista", (e) => (precio0(e).for = "tourist"), /no dice para quién es/],
  [
    "una zona que no es de la ruta",
    (e) => (e.arrivals[0].to_zone = "centro"),
    /arrivals\[0\]\.to_zone: no es una zona de la ruta/,
  ],
  [
    "un transporte en una zona de fuera",
    (e) => e.transport[0].zones.push("playa"),
    /transport\[0\]\.zones: no son zonas/,
  ],
  [
    "ninguna manera de llegar, sin porqué",
    (e) => (e.arrivals = []),
    /^arrivals: no hay ninguna manera de ir de donde se llega/,
  ],
  [
    "un porqué con maneras de llegar",
    (e) => (e.no_arrival = "not_found"),
    /^no_arrival: dice que no se llega, y trae maneras/,
  ],
  ["un porqué de fuera de la lista", (e) => ((e.arrivals = []), (e.no_arrival = "too_far")), /^no_arrival: no es null/],
  ["unos minutos aproximados", (e) => (e.arrivals[0].minutes = 40.5), /minutes: no son unos minutos enteros/],
  ["una hora que no es una hora", (e) => (e.arrivals[0].until = "11pm"), /until: no es una hora/],
  ["un aeropuerto con un código raro", (e) => (e.arrivals[0].from.code = "Villa"), /from\.code: no es un código/],
  [
    "un nombre con su web",
    (e) => (e.arrivals[0].from.name = "Aeropuerto www.aeropuerto.example"),
    /from\.name: el nombre lleva una dirección/,
  ],
  [
    "una manera que no es de la lista",
    (e) => (e.arrivals[0].mode = "helicopter"),
    /mode: no es una manera de su lista/,
  ],
  [
    "un abono de un día que vale dos",
    (e) => (e.tickets[1].days = 2),
    /tickets\[1\]\.days: un abono de un día vale 1 día/,
  ],
  [
    "un abono de varios días que vale uno",
    (e) => (e.tickets[2].days = 1),
    /tickets\[2\]\.days: un abono de varios días/,
  ],
  [
    "un suelto que dice sus días",
    (e) => (e.tickets[0].days = 3),
    /tickets\[0\]\.days: solo un abono dice cuántos días/,
  ],
  [
    "un bono de un viaje",
    (e) => ((e.tickets[0].kind = "multi_ride"), (e.tickets[0].rides = 1)),
    /un bono da 2 viajes o más/,
  ],
  ["un billete que no cubre nada", (e) => (e.tickets[0].modes = []), /tickets\[0\]\.modes: no dice lo que cubre/],
  [
    "el mismo billete dos veces",
    (e) => e.tickets.push(structuredClone(e.tickets[1])),
    /el mismo billete sale dos veces/,
  ],
  [
    "un pago que no es de la lista",
    (e) => (e.payment[0].kind = "cheque"),
    /payment\[0\]\.kind: no es una manera de pagar/,
  ],
  ["el coche sin su página", (e) => (e.car_needed = { needed: true }), /car_needed\.source: no dice la página/],
  [
    "de una base a otra con una sola",
    (e) =>
      e.between_bases.push({
        from_base: "b1",
        to_base: "b2",
        mode: "train",
        minutes: 60,
        prices: "unknown",
        source: PAGINA_DE_MOVERSE,
        seen: HOY,
      }),
    /between_bases\[0\]: no va de una base de la ruta a otra/,
  ],
  [
    "demasiados billetes",
    (e) => (e.tickets = Array.from({ length: 13 }, (_, i) => ({ ...e.tickets[2], days: i + 2 }))),
    /^tickets: son 13, y caben 12/,
  ],
  [
    "una frase que dice qué es lo mejor",
    (e) => e.unknowns.push("The bus is the best way into town."),
    /dice «best»: el de moverse no dice qué es lo mejor/,
  ],
  ["una frase que lo dice en español", (e) => e.unknowns.push("Conviene el abono."), /dice «Conviene»/],
  [
    "una frase que promete",
    (e) => e.unknowns.push("Fares are guaranteed until the summer."),
    /su frase dice «guaranteed»: promete/,
  ],
  [
    "un número de una frase que no está en sus datos",
    (e) => e.unknowns.push("A taxi costs around 35 into town."),
    /dice 35, que no está en sus datos \(RM7\)/,
  ],
  [
    "una frase con su web",
    (e) => e.unknowns.push("See https://transporte.inventado.example for more."),
    /lleva una dirección de la web/,
  ],
  [
    "nada con precio y nada dicho",
    (e) => ((e.tickets = []), (e.unknowns = [])),
    /^unknowns: ningún billete lleva su precio/,
  ],
  [
    "sin llegar y sin decirlo",
    (e) => ((e.arrivals = []), (e.no_arrival = "not_found"), (e.unknowns = [])),
    /^unknowns: no hay manera de llegar/,
  ],
];

test("la puerta 11 caza cada trampa, cada una con lo que hay que arreglar", () => {
  for (const [nombre, estropea, espera, m] of TRAMPAS) {
    const e = structuredClone(buena(m)) as Objeto;
    estropea(e);
    const rojos = rojosDe(e, m);
    assert.ok(
      rojos.some((r) => espera.test(r)),
      `${nombre}: ${rojos.join(" | ") || "verde"}`,
    );
  }
});

test("sin saber por dónde se llega, se dice; y de una base a otra, solo con dos bases", () => {
  const m = material({ aeropuerto: null });
  const e = buena(m) as Objeto;
  assert.equal(e.arrivals[0].from.code, "unknown");
  assert.deepEqual(rojosDe({ ...e, unknowns: [] }, m), [
    "unknowns: la casa no sabía por dónde se llega: lo que no se sabe se dice en unknowns (RM3)",
  ]);
  assert.deepEqual(rojosDe(e, m), []);
  const dos = material({ bases: 2 });
  const deUnaAOtra = {
    from_base: "b1",
    to_base: "b2",
    mode: "train",
    minutes: 95,
    prices: "unknown",
    source: PAGINA_DE_MOVERSE,
    seen: HOY,
  };
  assert.deepEqual(rojosDe({ ...buena(dos), between_bases: [deUnaAOtra] }, dos), []);
  assert.ok(
    rojosDe({ ...buena(dos), between_bases: [{ ...deUnaAOtra, to_base: "b1" }] }, dos).some((r) =>
      r.startsWith("between_bases[0]: no va de una base"),
    ),
  );
  // Un día de holgura: el run puede pasar la medianoche.
  const manana = JSON.parse(JSON.stringify(buena()).replaceAll(HOY, "2031-02-12"));
  assert.deepEqual(rojosDe(manana), []);
});

// ---------- una página que no se abrió: la caza la puerta de todos

test("un precio que cita una página que no se abrió: la puerta de todos lo para en su vuelta", async () => {
  const conRun = async (pagina: string): Promise<{ viaje: Viaje; primera: Objeto }> => {
    const run = runNuevo();
    try {
      darElAdelante(run, 5);
      const deMentira = lanzadorDeMentira();
      const lanzador = (async (orden, puesto, corte) => {
        if (puesto.asiento !== "getting-around") return deMentira(orden, puesto, corte);
        trabaja(resolve(puesto.carpeta, "..", ".."), puesto.id, (_a, e) => {
          e.tickets[0].prices[0].source = pagina;
        });
        return { turnos: 1, entrada: 10, salida: 10, usd: 0 };
      }) as Lanzador;
      const r = await llevar(run, fuentesInventadas(), lanzador);
      assert.equal(r.hecho, true);
      return {
        viaje: leerJson(join(run, "viaje.json")) as Viaje,
        primera: leerJson(join(run, "moverse-v1.puertas.json")),
      };
    } finally {
      rmSync(run, { recursive: true, force: true });
    }
  };
  // La que abrió, sí, a la primera.
  const abierta = await conRun(PAGINA_DE_MOVERSE);
  assert.equal(abierta.viaje.moverse?.falta, null);
  assert.equal(abierta.primera.verde, true);
  // La que no abrió, no: su vuelta sale en rojo, con el dato que la cita. (En la vuelta siguiente la misma página
  // llega en lo devuelto, y la puerta de todos la toma por material: lo sabe quien orquesta, y no se fija aquí.)
  const otra = await conRun("https://otra.inventada.example/precios");
  assert.equal(otra.primera.verde, false);
  assert.ok(
    otra.primera.rojos.some(
      (r: Objeto) => r.donde.endsWith("tickets[0].prices[0].source") && /que no se abrió/.test(r.que),
    ),
  );
});

// ---------- la cuenta de lo que conviene

const FUENTE = { url: PAGINA_DE_MOVERSE, visto: HOY };
const adulto = (importe: number, moneda = "EUR"): PrecioDeCapa => ({
  para: "adult",
  edades: null,
  cuanto: { importe, moneda },
  fuente: FUENTE,
});
const deNino = (importe: number | "free", desde: number, hasta: number): PrecioDeCapa => ({
  para: "child",
  edades: { desde, hasta },
  cuanto: importe === "free" ? "free" : { importe, moneda: "EUR" },
  fuente: FUENTE,
});
const billete = (clase: Billete["clase"], precios: PrecioDeCapa[] | null, o: Partial<Billete> = {}): Billete => ({
  clase,
  dias: clase === "day_pass" ? 1 : clase === "multi_day_pass" ? 3 : null,
  viajes: clase === "single" ? 1 : clase === "multi_ride" ? 10 : null,
  modos: ["bus", "metro"],
  precios,
  fuente: FUENTE,
  ...o,
});
const capa = (billetes: Billete[], o: Partial<DeMoverse> = {}): DeMoverse => ({
  llegar: [],
  sinLlegar: "not_found",
  transportes: [],
  billetes,
  pagos: [],
  coche: null,
  falta: null,
  ...o,
});
/** Las de la ciudad inventada: un suelto a 2 (1 un niño de 4 a 12), un abono de un día a 6, uno de tres días a 12. */
const CIUDAD = capa([
  billete("single", [adulto(2), deNino(1, 4, 12), deNino("free", 0, 3)]),
  billete("day_pass", [adulto(6)]),
  billete("multi_day_pass", [adulto(12)]),
]);
const dias = (...viajes: number[]) =>
  viajes.map((n, i) => ({ fecha: `2031-03-${String(10 + i).padStart(2, "0")}`, viajes: n }));

test("la cuenta: sueltos, abonos o una mezcla, lo que sale más barato por persona, con sus números", () => {
  // Sin trayectos que no se andan, nada que comprar.
  const nada = cuentaDeMoverse([], CIUDAD);
  assert.deepEqual([nada.conviene, nada.total, nada.compras], ["nothing", 0, []]);
  // Uno al día: sueltos.
  const pocos = cuentaDeMoverse(dias(1, 1, 1, 1), CIUDAD);
  assert.deepEqual(
    [pocos.conviene, pocos.total, pocos.sueltos, pocos.ahorra, pocos.moneda],
    ["singles", 8, 8, 0, "EUR"],
  );
  assert.deepEqual(pocos.compras, [
    { billete: 0, clase: "single", cuantos: 4, precio: 2, total: 8, dias: [], viajes: 4 },
  ]);
  // Cuatro al día, cuatro días: el de tres días y uno de un día.
  const muchos = cuentaDeMoverse(dias(4, 4, 4, 4), CIUDAD);
  assert.deepEqual([muchos.conviene, muchos.total, muchos.sueltos, muchos.ahorra], ["pass", 18, 32, 14]);
  assert.deepEqual(
    muchos.compras.map((c) => [c.clase, c.dias]),
    [
      ["day_pass", ["2031-03-10"]],
      ["multi_day_pass", ["2031-03-11", "2031-03-12", "2031-03-13"]],
    ],
  );
  assert.deepEqual(muchos.fuentes, [FUENTE]);
  // Tres días de cuatro y uno de uno: el de tres días y un suelto.
  const mezcla = cuentaDeMoverse(dias(4, 4, 4, 1), CIUDAD);
  assert.deepEqual([mezcla.conviene, mezcla.total], ["mix", 14]);
  // Un abono de varios días cubre los días seguidos del calendario, aunque uno no tenga trayectos.
  const salteados = cuentaDeMoverse(
    [
      { fecha: "2031-03-10", viajes: 5 },
      { fecha: "2031-03-12", viajes: 5 },
    ],
    CIUDAD,
  );
  assert.deepEqual([salteados.total, salteados.compras[0].dias], [12, ["2031-03-10", "2031-03-12"]]);
  // La misma entrada, la misma cuenta.
  assert.deepEqual(cuentaDeMoverse(dias(4, 4, 4, 1), CIUDAD), mezcla);
});

test("la cuenta con un bono de varios viajes, y con lo que paga un niño", () => {
  const conBono = capa([billete("single", [adulto(2)]), billete("multi_ride", [adulto(15)])]);
  const doce = cuentaDeMoverse(dias(3, 3, 3, 3), conBono);
  assert.deepEqual([doce.conviene, doce.total, doce.sueltos], ["mix", 19, 24]);
  assert.deepEqual(
    doce.compras.map((c) => [c.clase, c.cuantos, c.viajes]),
    [
      ["single", 2, 2],
      ["multi_ride", 1, 10],
    ],
  );
  // Un niño de ocho paga su suelto; los abonos no dicen lo que paga un niño, y paga el de adulto, como en el
  // presupuesto: cuatro sueltos de niño el primer día (4) y el abono de tres días (12).
  const nino = cuentaDeMoverse(dias(4, 4, 4, 4), CIUDAD, 8);
  assert.deepEqual([nino.conviene, nino.total, nino.sinPrecio], ["mix", 16, 0]);
  // Uno de dos años va gratis.
  assert.deepEqual(
    [cuentaDeMoverse(dias(4), CIUDAD, 2).total, cuentaDeMoverse(dias(4), CIUDAD, 2).conviene],
    [0, "singles"],
  );
  // Uno de quince, fuera de las edades del de niño: paga el de adulto.
  const quince = cuentaDeMoverse(dias(2), CIUDAD, 15);
  assert.deepEqual([quince.conviene, quince.total, quince.porQue], ["singles", 4, null]);
  // Con un precio de niño sin edades no se sabe si es el suyo: no se sabe, y se dice.
  const sinEdades = capa([billete("single", [adulto(2), { ...deNino(1, 0, 0), edades: null }])]);
  assert.deepEqual(
    [cuentaDeMoverse(dias(2), sinEdades, 8).total, cuentaDeMoverse(dias(2), sinEdades, 8).porQue],
    [null, "no_price"],
  );
  // El grupo: dos adultos y un niño de ocho; con ese niño y el precio sin edades, el total no se sabe y se cuenta.
  const grupo = cuentaDelGrupo(dias(1, 1), CIUDAD, 2, [8]);
  assert.deepEqual([grupo.total, grupo.moneda, grupo.faltan], [10, "EUR", 0]);
  const sinSaber = cuentaDelGrupo(dias(1, 1), sinEdades, 2, [8]);
  assert.deepEqual([sinSaber.total, sinSaber.faltan], [null, 1]);
});

test("la cuenta no inventa: sin la capa, sin billetes del transporte, sin precio o en otra moneda", () => {
  assert.equal(cuentaDeMoverse(dias(2), undefined).porQue, "no_layer");
  assert.equal(cuentaDeMoverse(dias(2), { ...CIUDAD, billetes: [], falta: "failed" }).porQue, "no_layer");
  const taxi = capa([billete("single", [adulto(30)], { modos: ["taxi"] })]);
  assert.deepEqual([cuentaDeMoverse(dias(2), taxi).porQue, cuentaDeMoverse(dias(2), taxi).total], ["no_tickets", null]);
  // Un abono sin precio no cubre nada, y sin suelto sabido los días que no cubre no se saben.
  const sinSuelto = capa([billete("single", null), billete("day_pass", [adulto(6)])]);
  const dos = cuentaDeMoverse(dias(3, 3), sinSuelto);
  assert.deepEqual([dos.total, dos.conviene, dos.sueltos, dos.sinPrecio], [12, "pass", null, 1]);
  assert.equal(cuentaDeMoverse(dias(3, 3), capa([billete("single", null)])).porQue, "no_price");
  // Una tarjeta recargable no entra: no se sabe lo que cuesta cada viaje con ella.
  assert.equal(cuentaDeMoverse(dias(1), capa([billete("travel_card", [adulto(5)])])).porQue, "no_tickets");
  // En otra moneda: la cuenta sale en la de sus precios, y lo dice; la de otra moneda no se mezcla.
  const enDolares = capa([billete("single", [adulto(2, "USD")]), billete("day_pass", [adulto(1, "EUR")])]);
  const usd = cuentaDeMoverse(dias(3), enDolares, null, "USD");
  assert.deepEqual([usd.moneda, usd.total, usd.sinPrecio], ["USD", 6, 1]);
  assert.deepEqual([cuentaDeMoverse(dias(3), enDolares, null, "EUR").moneda], ["EUR"]);
  // Si valen dos precios de adulto (con tarjeta o en papel), el más caro: la cuenta no se queda corta.
  assert.equal(precioPara([adulto(2), adulto(1.5)], null, "EUR"), 2);
  assert.equal(precioPara([deNino(1, 4, 12)], null, "EUR"), null);
});

test("los trayectos que no se andan de cada día, con la cuenta de caminos de la casa", () => {
  const punto = (lat: number, lon: number) => ({ lat, lon });
  const parada = (id: string, p: { lat: number; lon: number }) => ({ id, punto: p }) as Viaje["paradas"][number];
  const v = {
    paradas: [
      parada("a", punto(10, 20)),
      parada("b", punto(10, 20.003)),
      parada("c", punto(10, 20.1)),
      parada("d", punto(10.001, 20.1)),
    ],
    dias: [
      { fecha: "2031-03-10", titulo: "", paradas: ["a", "b"], metros: [] },
      { fecha: "2031-03-11", titulo: "", paradas: ["a", "c", "d"], metros: [] },
    ],
  };
  // Entre paradas: el primer día se anda entero; el segundo, uno no.
  assert.deepEqual(viajesDeLosDias(v), [{ fecha: "2031-03-11", viajes: 1 }]);
  // Durmiendo lejos de todo: ir y volver tampoco se andan.
  assert.deepEqual(viajesDeLosDias(v, punto(10.2, 20.05)), [
    { fecha: "2031-03-10", viajes: 2 },
    { fecha: "2031-03-11", viajes: 3 },
  ]);
});
