// El que conoce el destino (14.3): su puerta 12, trampa a trampa; lo que se le da y lo que no; su asiento de mentira,
// que pasa la puerta de verdad; y, en la investigación entera, que cita solo páginas que abrió y que usa su contrato.
// Con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { LO_MAS_DE_COSAS, TOPE_POR_CLASE } from "../../agent/data/capa_destino.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import type { Material } from "../../agent/launcher/capas.ts";
import { piezasDelDestino, puertaDelDestino } from "../../agent/launcher/capa_destino.ts";
import { paginasEn } from "../../agent/launcher/consultado.ts";
import { puertaDestino, type ParaElDestino } from "../../agent/gates/puerta_destino.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { paraEnsenarDestino } from "../../agent/scripts/capa_destino.ts";
import {
  fuentesInventadas,
  GASTO,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
  type Objeto,
} from "../cases/inventado/asientos.ts";
import { entregaDelDestino, PAGINA_DEL_DESTINO } from "../cases/inventado/destino.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const HOY = "2031-02-20";
const ZONAS = [
  {
    id: "z1",
    base: "b1",
    name: "Old town",
    label: "Barrio Viejo",
    centre: { lat: 40, lon: -3 },
    radius_m: 1200,
    why: "the old quarter",
    near: [],
  },
  {
    id: "z2",
    base: "b1",
    name: "Harbour",
    label: "El puerto",
    centre: { lat: 40.02, lon: -3 },
    radius_m: 800,
    why: "",
    near: [],
  },
];
const PARA: ParaElDestino = { zonas: ZONAS, hoy: HOY };
const MATERIAL: Material = {
  viaje: ENTENDIDO,
  hoy: HOY,
  ruta: { shape: "single_base", bases: [{ id: "b1", name: "Villa Inventada", nights: 3 }] },
  zonas: ZONAS,
  elegidos: [],
  abiertos: [],
};
const VIAJE = { today: HOY, currency: "EUR" };
const RUTA = { zones: ZONAS };

/** La entrega buena del de mentira, con lo que se le cambie. */
const buena = (): Objeto => entregaDelDestino(VIAJE, RUTA, true) as unknown as Objeto;
const conCosa = (i: number, cambio: Objeto): Objeto => {
  const e = buena();
  e.items[i] = { ...e.items[i], ...cambio };
  return e;
};
const rojosDe = (e: unknown): string[] => puertaDestino(e, PARA).rojos.map((r) => `${r.donde}: ${r.que}`);
const pasa = (e: unknown): void => assert.deepEqual(rojosDe(e), []);
const noPasa = (e: unknown, que: RegExp): void => {
  const rojos = rojosDe(e);
  assert.ok(
    rojos.some((r) => que.test(r)),
    `se esperaba ${que}, y salió: ${JSON.stringify(rojos)}`,
  );
};
// Las cosas del de mentira, por su clase.
const I = { barrio: 0, horas: 1, mercado: 2, practico: 3, plato: 4, comida: 5 };

// ---------- la buena pasa

test("puerta 12: la entrega del de mentira pasa, y también la forma del viaje", () => {
  pasa(buena());
  assert.deepEqual(puertaDelDestino(buena(), MATERIAL), []);
  const d = paraEnsenarDestino(buena() as never);
  assert.equal(d.falta, null);
  assert.deepEqual(d.cosas.at(-1)?.cuesta, { desde: 12, hasta: 18, moneda: "EUR" });
  // Sin internet no dice nada, y lo dice: también pasa.
  pasa(entregaDelDestino(VIAJE, RUTA, false));
});

test("puerta 12: no es su entrega, o no trae sus listas", () => {
  noPasa(null, /delivery: no es un objeto/);
  noPasa({ ...buena(), seat: "calendar" }, /seat: no es la entrega/);
  noPasa({ ...buena(), items: "nada" }, /items: falta/);
  noPasa({ ...buena(), unknowns: undefined }, /unknowns: no es una lista/);
  noPasa({ ...buena(), unknowns: ["See https://otra.example"] }, /unknowns\[0\]: lleva una dirección/);
});

// ---------- su clase y sus topes

test("puerta 12: cada cosa en una clase de la lista, sin pasar del tope de su clase ni del total", () => {
  noPasa(conCosa(I.plato, { kind: "restaurant" }), /items\[4\]\.kind: la clase no es de su lista/);
  const platos = buena();
  const plato = platos.items[I.plato];
  platos.items = [
    ...platos.items,
    ...Array.from({ length: TOPE_POR_CLASE.dish }, (_, n) => ({ ...plato, says: `D${n}` })),
  ];
  noPasa(platos, new RegExp(`trae ${TOPE_POR_CLASE.dish + 1} de dish, y caben ${TOPE_POR_CLASE.dish}`));
  const muchas = buena();
  muchas.items = Array.from({ length: LO_MAS_DE_COSAS + 1 }, (_, n) => ({
    ...muchas.items[I.practico],
    says: `P${n}`,
  }));
  noPasa(muchas, new RegExp(`son ${LO_MAS_DE_COSAS + 1} cosas, y caben ${LO_MAS_DE_COSAS}`));
  noPasa({ ...buena(), items: [...buena().items, buena().items[I.plato]] }, /la misma cosa sale dos veces/);
});

// ---------- su página y su fecha

test("puerta 12: cada cosa, con su página https y su fecha, que no es de después de hoy", () => {
  noPasa(conCosa(I.horas, { source: "unknown" }), /items\[1\]\.source: no dice la página/);
  noPasa(conCosa(I.horas, { source: "http://turismo.inventado.example/guia" }), /items\[1\]\.source/);
  noPasa(conCosa(I.horas, { seen: "unknown" }), /items\[1\]\.seen: no es una fecha/);
  noPasa(conCosa(I.horas, { seen: "2031-02-30" }), /items\[1\]\.seen: no es una fecha/);
  noPasa(conCosa(I.horas, { seen: "2031-02-21" }), /items\[1\]\.seen: es de después de hoy/);
  pasa(conCosa(I.horas, { seen: "2030-06-01" }));
});

// ---------- sus zonas

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

test("puerta 12: una página que el navegador abriría, pero no escrita en su forma normal, no vale", () => {
  for (const raro of RAROS(PAGINA_DEL_DESTINO))
    noPasa(conCosa(0, { source: raro }), /^items\[0\]\.source: .*forma normal/);
});

test("puerta 12: cada zona es de la ruta; un barrio, una zona de comer y un mercado, con la suya", () => {
  noPasa(conCosa(I.barrio, { zone: "z9" }), /items\[0\]\.zone: habla de una zona que no es de la ruta/);
  noPasa(conCosa(I.barrio, { zone: 3 }), /items\[0\]\.zone: habla de una zona que no es de la ruta/);
  noPasa(conCosa(I.barrio, { zone: null }), /un neighbourhood va atado a una zona/);
  noPasa(conCosa(I.mercado, { zone: null, point: "unknown" }), /un market va atado a una zona/);
  noPasa(
    { ...buena(), items: [...buena().items, { ...buena().items[I.barrio], says: "Also busy at noon." }] },
    /ya hay un barrio para esta zona/,
  );
  // Su sitio, dentro de su zona: el centro de la otra zona está a unos dos kilómetros.
  noPasa(conCosa(I.mercado, { point: ZONAS[0].centre }), /items\[2\]\.point: está fuera de su zona/);
  noPasa(conCosa(I.horas, { point: ZONAS[0].centre }), /items\[1\]\.point: un sitio va con la zona/);
  noPasa(conCosa(I.mercado, { point: { lat: 200, lon: 0 } }), /items\[2\]\.point: no es un sitio del mapa/);
  pasa(conCosa(I.mercado, { point: { lat: 40.025, lon: -3 } }));
});

// ---------- sus precios

test("puerta 12: ningún precio sin su horquilla, su moneda y su página", () => {
  noPasa(conCosa(I.comida, { costs: "unknown" }), /items\[5\]\.costs: lo que cuesta una comida va con su horquilla/);
  noPasa(conCosa(I.comida, { costs: { from: 12, to: 18 } }), /items\[5\]\.costs: no es de tanto a tanto/);
  noPasa(conCosa(I.comida, { costs: { from: 18, to: 12, currency: "EUR" } }), /items\[5\]\.costs/);
  noPasa(conCosa(I.comida, { costs: { from: 0, to: 12, currency: "EUR" } }), /items\[5\]\.costs/);
  noPasa(conCosa(I.comida, { costs: { from: 12, to: 18, currency: "euros" } }), /items\[5\]\.costs/);
  noPasa(conCosa(I.comida, { name: "Menú del día" }), /lo que cuesta una comida no lleva nombre/);
  noPasa(
    conCosa(I.practico, { costs: { from: 1, to: 2, currency: "EUR" } }),
    /items\[3\]\.costs: solo lo de comer dice lo que cuesta/,
  );
  // Un precio en la frase: con su horquilla, y con sus números.
  noPasa(conCosa(I.plato, { says: "About €15 a plate.", figures: [15] }), /dice un precio sin su horquilla/);
  noPasa(conCosa(I.plato, { says: "About 15 EUR a plate.", figures: [15] }), /dice un precio sin su horquilla/);
  noPasa(
    conCosa(I.comida, { says: "A set lunch costs 15 EUR.", figures: [15] }),
    /dice un precio que no es el de su horquilla/,
  );
  pasa(conCosa(I.comida, { says: "A set lunch costs 12 to 18 EUR." }));
  pasa(conCosa(I.comida, { says: "Un menú cuesta de 12 € a 18 €." }));
  // Hablar de la moneda no es un precio.
  pasa(
    conCosa(I.practico, {
      kind: "money",
      says: "The currency is the euro (EUR); cards are widely taken.",
      figures: [],
    }),
  );
});

// ---------- sus números y sus palabras

test("puerta 12: cada número de una frase está en sus datos, y las horas, tal cual", () => {
  noPasa(conCosa(I.practico, { figures: [230] }), /items\[3\]\.says: dice 112, que no está en sus cifras/);
  noPasa(conCosa(I.horas, { figures: [] }), /items\[1\]\.says: dice 13:30, que no está en sus cifras/);
  noPasa(conCosa(I.horas, { figures: ["14:00"] }), /dice 13:30/);
  pasa(conCosa(I.horas, { says: "Lunch is served from 9:30.", figures: ["09:30"] }));
  noPasa(conCosa(I.horas, { figures: "13:30" }), /items\[1\]\.figures: no es una lista/);
  noPasa(conCosa(I.horas, { figures: ["1:30 pm"] }), /items\[1\]\.figures: no es una lista/);
  noPasa(conCosa(I.horas, { figures: ["13:30", 1, 2, 3, 4, 5, 6] }), /son 7 cifras, y caben 6/);
  noPasa(conCosa(I.practico, { says: "Call +34 600 123 456 for help.", figures: [34, 600, 123, 456] }), /número largo/);
});

test("puerta 12: ninguna palabra prohibida, ningún enlace, y una frase corta", () => {
  noPasa(conCosa(I.barrio, { says: "Guaranteed quiet at night." }), /items\[0\]\.says: la frase dice «Guaranteed»/);
  noPasa(conCosa(I.barrio, { says: "The perfect place to stay." }), /dice «perfect»/);
  noPasa(conCosa(I.barrio, { says: "Te va a encantar el barrio." }), /dice «Te va a encantar»/);
  noPasa(conCosa(I.barrio, { says: "More at turismo.example.com" }), /lleva un enlace/);
  noPasa(conCosa(I.barrio, { says: "x".repeat(161) }), /no es una frase de 160 letras/);
  noPasa(conCosa(I.barrio, { says: "" }), /no es una frase/);
});

// ---------- lo de comer, sin restaurantes ni opiniones

test("puerta 12: lo de comer, sin el nombre de un restaurante ni opiniones, en lo que el código puede ver", () => {
  noPasa(conCosa(I.mercado, { name: "Restaurante El Faro" }), /items\[2\]\.name: parece el nombre de un sitio/);
  noPasa(conCosa(I.plato, { name: "Café Central" }), /items\[4\]\.name: parece el nombre de un sitio/);
  noPasa(
    conCosa(I.plato, { says: "Best at the restaurant Casa Pepe." }),
    /items\[4\]\.says: nombra un sitio donde se come/,
  );
  noPasa(conCosa(I.plato, { says: "Pruébalo en la taberna «El Puerto»." }), /nombra un sitio donde se come/);
  noPasa(conCosa(I.plato, { says: "Rated 4.5/5 by visitors.", figures: [4.5, 5] }), /habla de opiniones/);
  noPasa(conCosa(I.mercado, { says: "Its stalls have great reviews." }), /habla de opiniones/);
  noPasa(conCosa(I.mercado, { says: "Tiene una estrella Michelin." }), /habla de opiniones/);
  // Hablar de restaurantes en general sí se puede; y fuera de lo de comer, la palabra no se mira.
  pasa(conCosa(I.mercado, { says: "Small restaurants and stalls around the hall." }));
  pasa(conCosa(I.barrio, { says: "Lively bars at night, quiet by day." }));
  // El nombre de un mercado o de un plato, sí.
  pasa(conCosa(I.mercado, { name: "Mercado de Abastos" }));
});

test("puerta 12: en ninguna clase un canal ni una dirección dicha; en evitar y en lo práctico, ningún negocio", () => {
  // Un canal, en cualquier clase.
  for (const [i, says] of [
    [I.practico, "Message on WhatsApp before you arrive."],
    [I.barrio, "Locals use Telegram groups to sell tickets."],
    [I.horas, "Call ahead: many places close at lunch."],
    [I.practico, "Escribe a la oficina antes de ir."],
    [I.practico, "Llama al ayuntamiento para saberlo."],
    [I.practico, "For emergencies, dial 112."],
  ] as const)
    noPasa(conCosa(i, { says, figures: [112] }), new RegExp(`items\\[${i}\\]\\.says: manda a hablar con alguien`));
  // Una dirección escrita con palabras, en cualquier clase.
  for (const says of [
    "See tinyurl com slash abc for the timetable.",
    "Check islandferries dot com for the timetable.",
    "Mira islaferries punto es antes de ir.",
    "Los billetes, en la web con la arroba de la oficina.",
  ])
    noPasa(conCosa(I.horas, { says }), /items\[1\]\.says: escribe una dirección con palabras/);
  // Un negocio con nombre, en lo que conviene evitar y en lo práctico.
  const evitar = (says: string) => conCosa(I.practico, { kind: "avoid", says });
  for (const says of [
    "Book with Juan's Taxis at the port.",
    "Avoid Sol Tours on the main square.",
    "Taxis García overcharge at night.",
    "No reserves con Marta en la plaza.",
    "Avoid the restaurant Casa Pepe by the port.",
  ]) {
    noPasa(evitar(says), /items\[3\]\.says: nombra un negocio/);
    noPasa(conCosa(I.practico, { says }), /items\[3\]\.says: nombra un negocio/);
  }
  noPasa(conCosa(I.practico, { name: "Juan's Taxis" }), /items\[3\]\.name: nombra un negocio/);
  // Lo de siempre sigue pasando: el móvil, los taxis en general, las urgencias como un número, un plato llamado así.
  for (const says of [
    "Taxis wait at the port; agree the fare first.",
    "Mobile data is cheap: a local SIM works everywhere.",
    "The emergency number is 112.",
    "Shops close for lunch; the old town is quiet then.",
  ])
    pasa(conCosa(I.practico, { says, figures: [112] }));
  pasa(conCosa(I.plato, { says: "Un plato llamado así por el puerto." }));
  pasa(evitar("Avoid the main square at noon: it is crowded."));
});

// ---------- lo que ve

test("lo que ve el que conoce el destino: el destino, la ruta, las fechas y lo que busca; nunca quién viaja", () => {
  const piezas = Object.fromEntries(
    piezasDelDestino(MATERIAL).map((p) => [p.ruta, JSON.parse("contenido" in p ? String(p.contenido) : "null")]),
  );
  assert.deepEqual(Object.keys(piezas).sort(), ["limits.json", "route.json", "trip.json"]);
  const viaje = piezas["trip.json"];
  assert.deepEqual(Object.keys(viaje).sort(), ["currency", "dates", "destination", "language", "looking_for", "today"]);
  const todo = JSON.stringify(piezas);
  for (const nada of ["travellers", "passports", "budget", "said", "email", "origin"]) assert.ok(!todo.includes(nada));
  // Ninguna página: así, la puerta de todos solo le deja citar las que abrió de verdad, en cualquiera de sus vueltas.
  assert.deepEqual(paginasEn(todo), []);
  assert.deepEqual(
    piezas["route.json"].zones.map((z: Objeto) => z.id),
    ["z1", "z2"],
  );
  assert.equal(piezas["limits.json"].items_allowed, LO_MAS_DE_COSAS);
  assert.deepEqual(piezas["limits.json"].per_kind, TOPE_POR_CLASE);
});

// ---------- en la investigación entera

const conRun = async (hacer: (run: string) => Promise<void>): Promise<void> => {
  const run = runNuevo();
  try {
    await hacer(run);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
};

test("en la investigación: lanza su contrato de verdad, y lo suyo llega al viaje con su página", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    assert.equal(r.hecho, true);
    const contrato = readFileSync(join(run, "puestos", "saber-v1", "contract", "seat", "README.md"), "utf8");
    assert.match(contrato, /^# The local-knowledge seat\n/);
    assert.ok(!contrato.includes("for tests only"));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(v.saber?.falta, null);
    assert.ok(v.saber!.cosas.every((c) => c.fuente.url === PAGINA_DEL_DESTINO));
    // Ningún dato de quién viaja en lo que se le dio.
    const dado = readFileSync(join(run, "puestos", "saber-v1", "in", "trip.json"), "utf8");
    assert.ok(!dado.includes("travellers"));
  });
});

test("en la investigación: una cosa que cita una página que no abrió no pasa", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const bueno = lanzadorDeMentira();
    const lanzador: Lanzador = async (orden, puesto, corte) => {
      if (puesto.asiento !== "local-knowledge") return bueno(orden, puesto, corte);
      trabaja(join(puesto.carpeta, "..", ".."), puesto.id, (_a: string, e: Objeto) => {
        e.items[0].source = "https://otra.inventado.example/blog";
      });
      return GASTO;
    };
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.hecho, true);
    const puertas = leerJson(join(run, "saber-v1.puertas.json"));
    assert.equal(puertas.verde, false);
    assert.ok(puertas.rojos.some((x: Objeto) => /otra\.inventado\.example.*no se abrió/.test(x.que)));
  });
});
