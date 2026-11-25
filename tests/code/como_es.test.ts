// Las pruebas del que mira el alojamiento: el contrato y el código dicen lo mismo, el material va a ciegas, la puerta
// 5 cae en cada trampa y dos pasadas se comparan. Todo con el caso inventado y un asiento inventado: no gasta.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { puertaComoEs, type Material } from "../../agent/gates/puerta_como_es.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { ordenDeApertura } from "../../agent/launcher/asiento.ts";
import { materialDe, prepararMirar, recogerMirar } from "../../agent/launcher/mirar.ts";
import { acuerdo } from "../../agent/scripts/acuerdo.ts";
import { buscarAlojamiento } from "../../agent/scripts/busqueda_alojamiento.ts";
import {
  CAMPOS,
  DE_LA_FICHA,
  DE_LA_HABITACION,
  ESTACION_CONTRARIA,
  ETIQUETAS_DE_AVISO,
  GRAVES,
  MENCIONES,
  MESES_DE_LA_ESTACION,
  MUESTRA,
  TEMAS_DE_OPINIONES,
  TONOS,
} from "../../agent/data/niveles.ts";
import { estacion, hojaDeDatos, opinionesParaMirar } from "../../agent/scripts/para_mirar.ts";
import { elegirFotos } from "../../agent/tools/fotos.ts";
import type { Opinion } from "../../agent/tools/fuentes/tipos.ts";
import { ESTANCIA, fuenteInventada, MINIMOS } from "../cases/inventado/inventado.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "lodging-viewer");
const leer = (nombre: string): string => readFileSync(join(CONTRATO, nombre), "utf8");
const TEMPORAL = mkdtempSync(join(tmpdir(), "el-dorado-mirar-"));
after(() => rmSync(TEMPORAL, { recursive: true, force: true }));

const BUSQUEDA = await buscarAlojamiento(fuenteInventada(), ESTANCIA, MINIMOS);
// Un finalista del caso inventado cuya habitación dice sus metros.
const FICHA = BUSQUEDA.finalistas.find((f) => f.habitacion !== null && f.habitacion.metros !== null);
assert.ok(FICHA !== undefined, "el caso inventado tiene un finalista con los metros de su habitación");
const ELEGIDAS = elegirFotos(FICHA.habitacion?.fotos ?? [], FICHA.detalle?.fotos ?? []);
const HOJA = hojaDeDatos(FICHA, ESTANCIA, ELEGIDAS);
const MATERIAL: Material = {
  hoja: HOJA as unknown as Record<string, unknown>,
  fotos: ["hotel-01.jpg", "hotel-02.jpg", "room-01.jpg"],
  opiniones: ["r1", "r2", "r3"],
};

type Entrega = Record<string, any>;

/** La ficha de cómo es que entregaría un asiento aplicado para el finalista inventado. */
function entregaBuena(): Entrega {
  const foto = (ref: string, what: string) => ({ kind: "photo", ref, what });
  return {
    seat: "lodging-viewer",
    lodging_id: FICHA!.alojamiento.id,
    room_id: "h1",
    photos: [
      { file: "room-01.jpg", shows: "room", seen: ["a double bed", "one window onto a street", "a small desk"] },
      { file: "hotel-01.jpg", shows: "gym", seen: ["two treadmills", "one bike"] },
      { file: "hotel-02.jpg", shows: "pool", seen: ["an outdoor pool with eight loungers"] },
    ],
    fields: {
      look: { level: "good_condition", evidence: [foto("room-01.jpg", "walls and floor with nothing worn")], note: "" },
      upkeep: {
        level: "well_kept",
        evidence: [{ kind: "review", ref: "r1", what: "clean, everything works" }],
        note: "",
      },
      style: { level: "chain", evidence: [foto("room-01.jpg", "standard functional furniture")], note: "" },
      room_space: {
        level: "fits",
        evidence: [
          { kind: "sheet", ref: "room.size_m2", what: "the sheet gives the size of the room" },
          foto("room-01.jpg", "the bed, a way around it and a small desk"),
        ],
        note: "",
      },
      room_light: { level: "average", evidence: [foto("room-01.jpg", "one ordinary window")], note: "" },
      bathroom: { level: "unknown", evidence: [], note: "no photo of the bathroom of this room" },
      view: { level: "street", evidence: [foto("room-01.jpg", "the window looks onto a street")], note: "" },
      gym: {
        level: "token",
        evidence: [
          foto("hotel-01.jpg", "two treadmills and one bike in a small room"),
          { kind: "review", ref: "r1", what: "a guest says the gym is tiny" },
        ],
        note: "",
      },
      pool: { level: "bathe", evidence: [foto("hotel-02.jpg", "a pool about three loungers long")], note: "" },
    },
    review_themes: [{ theme: "noise", tone: "bad", mentions: "one", says: "the street is noisy", refs: ["r1"] }],
    serious: [],
    conflicts: [],
    warnings: [
      { what: "one review says the pool was closed during their stay", label: "seen", refs: ["hotel-02.jpg", "r1"] },
    ],
    unknowns: ["No photo shows the bathroom of this room."],
    summary_good: "A pool to bathe in, shown in the photos.",
    summary_bad: "A tiny gym and a noisy street, by one review.",
  };
}

function rojosDe(estropea: (e: Entrega) => void, material: Material = MATERIAL): string[] {
  const entrega = entregaBuena();
  estropea(entrega);
  return puertaComoEs(entrega, material).rojos.map((r) => `${r.donde}: ${r.que}`);
}

// El contrato y el código, lo mismo.

test("el contrato lista los mismos campos y los mismos niveles que el código, y ninguno más", () => {
  const entrega = leer("DELIVERY.md");
  const tabla = entrega.slice(entrega.indexOf("## The fields and their levels"), entrega.indexOf("Every one of"));
  const filas = [...tabla.matchAll(/^\| (?:`([a-z_]+)`)? ?\| `([a-z_]+)` \|/gm)];
  const delContrato: Record<string, string[]> = {};
  let campo = "";
  for (const [, nuevo, nivel] of filas) {
    if (nuevo !== undefined) campo = nuevo;
    (delContrato[campo] ??= []).push(nivel);
  }
  assert.deepEqual(delContrato, CAMPOS);
});

test("el contrato nombra lo que puede enseñar una foto, los tonos, las menciones y lo que se cita de la ficha", () => {
  const entrega = leer("DELIVERY.md");
  for (const valor of [...MUESTRA, ...TONOS, ...MENCIONES, ...DE_LA_FICHA, ...ETIQUETAS_DE_AVISO])
    assert.ok(entrega.includes("`" + valor + "`"), `DELIVERY.md no nombra ${valor}`);
  for (const campo of DE_LA_HABITACION) assert.ok(entrega.includes("`" + campo + "`"));
});

test("el contrato nombra las estaciones que pone el código, y dice que no se deducen de las fechas", () => {
  const recibe = leer("README.md");
  for (const valor of [...Object.keys(MESES_DE_LA_ESTACION), "unknown", "stay.season"])
    assert.ok(recibe.includes("`" + valor + "`"), `README.md no nombra ${valor}`);
  assert.match(leer("GUIDE.md"), /Never deduce a season from the dates/);
  assert.match(leer("GUIDE.md"), /If `stay.season` is `unknown`, raise no warning about the season/);
  // Ningún ejemplo del contrato enseña a sacar el invierno de una fecha.
  assert.ok(!/"stay\.check_(in|out)"/.test(leer("DELIVERY.md")));
});

test("las normas del que mira son ocho, de la MI1 a la MI8, y el contrato dice lo que no ve", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(MI\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(codigos, ["MI1", "MI2", "MI3", "MI4", "MI5", "MI6", "MI7", "MI8"]);
  assert.match(leer("README.md"), /You do not see the price, the review score or the stars/);
  assert.match(leer("README.md"), /You do not use the internet/);
});

// El material va a ciegas.

test("la ficha de datos del asiento no lleva ni el nombre, ni el precio, ni la nota, ni las estrellas", () => {
  const texto = JSON.stringify(HOJA);
  assert.ok(!texto.includes(FICHA.alojamiento.nombre));
  assert.ok(!texto.includes(String(FICHA.precio.total)));
  for (const clave of ["nota", "rating", "score", "stars", "estrellas", "price", "precio", "total", "resumen"])
    assert.ok(!new RegExp(`"${clave}"`, "i").test(texto), `la ficha de datos lleva ${clave}`);
  // El caso inventado está entre los trópicos: allí no hay estación que decir.
  assert.deepEqual(HOJA.stay, {
    check_in: ESTANCIA.entrada,
    check_out: ESTANCIA.salida,
    season: "unknown",
    adults: 2,
    children: 0,
    rooms: 1,
  });
  assert.deepEqual(HOJA.room, { id: "h1", name: "Doble", size_m2: 22, beds: ["1 x Double bed"], declared_views: [] });
  assert.deepEqual(HOJA.photos, { room_given: 1, room_total: 1, hotel_given: 2, hotel_total: 2 });
});

test("lo que la ficha no sabe va como «unknown», no en blanco", () => {
  const sinDatos = { ...FICHA, habitacion: null, detalle: null };
  const hoja = hojaDeDatos(sinDatos, ESTANCIA, elegirFotos([], []));
  assert.equal(hoja.room, "unknown");
  assert.equal(hoja.check_in_from, "unknown");
  assert.deepEqual(hoja.services, []);
});

// La estación la pone el código, por dónde está el alojamiento: el asiento no la deduce del mes.

test("en el mismo mes, la estación al norte y al sur de los trópicos es la contraria", () => {
  assert.equal(estacion(48.2, "2027-01-15"), "winter");
  assert.equal(estacion(-33.9, "2027-01-15"), "summer");
  assert.equal(estacion(48.2, "2027-07-15"), "summer");
  assert.equal(estacion(-33.9, "2027-07-15"), "winter");
  assert.equal(estacion(60, "2027-04-01"), "spring");
  assert.equal(estacion(-45, "2027-04-01"), "autumn");
  // Los doce meses, uno a uno: cada mes tiene su estación, y la del sur es siempre la contraria a la del norte.
  for (let mes = 1; mes <= 12; mes++) {
    const entrada = `2027-${String(mes).padStart(2, "0")}-10`;
    const alNorte = estacion(40, entrada);
    assert.ok(MESES_DE_LA_ESTACION[alNorte].includes(mes), `el mes ${mes} no es de ${alNorte}`);
    assert.equal(estacion(-40, entrada), ESTACION_CONTRARIA[alNorte]);
    assert.notEqual(estacion(-40, entrada), alNorte);
  }
});

test("entre los trópicos, o sin una latitud o una fecha que valgan, la estación no se sabe", () => {
  for (const latitud of [0, 10, -10, 23.5, -23.5])
    for (const entrada of ["2027-01-15", "2027-07-15"]) assert.equal(estacion(latitud, entrada), "unknown");
  assert.equal(estacion(23.6, "2027-01-15"), "winter");
  assert.equal(estacion(-23.6, "2027-01-15"), "summer");
  for (const latitud of [null, undefined, Number.NaN, 91, -120])
    assert.equal(estacion(latitud, "2027-01-15"), "unknown");
  for (const entrada of ["", "enero", "2027-13-01", "2027-00-10"]) assert.equal(estacion(48.2, entrada), "unknown");
});

test("la ficha de datos lleva la estación de la estancia y no dice dónde está el alojamiento", () => {
  const en = (lat: number, lon: number) =>
    hojaDeDatos({ ...FICHA, alojamiento: { ...FICHA.alojamiento, lat, lon } }, ESTANCIA, ELEGIDAS);
  // La estancia del caso inventado entra en marzo: primavera al norte y otoño al sur.
  const alNorte = en(41.3777, 20.1444);
  const alSur = en(-41.3777, 20.6555);
  assert.equal(alNorte.stay.season, "spring");
  assert.equal(alSur.stay.season, "autumn");
  for (const hoja of [alNorte, alSur, HOJA]) {
    const texto = JSON.stringify(hoja);
    for (const numero of ["41.3777", "20.1444", "20.6555", String(FICHA.alojamiento.lat)])
      assert.ok(!texto.includes(numero), `la ficha de datos lleva ${numero}`);
    for (const clave of ["lat", "lon", "latitude", "longitude", "latitud", "longitud", "country", "pais", "city"])
      assert.ok(!new RegExp(`"${clave}"`, "i").test(texto), `la ficha de datos lleva ${clave}`);
  }
  // Lo único que cambia de una ficha a otra, con el alojamiento en otro sitio, es la estación.
  assert.deepEqual({ ...alSur, stay: { ...alSur.stay, season: "spring" } }, alNorte);
});

test("una estación que no se sabe no sostiene un aviso, y una que se sabe, sí", () => {
  const aviso = (e: Entrega) =>
    (e.warnings = [{ what: "an open-air terrace out of season", label: "deduced", refs: ["stay.season"] }]);
  assert.deepEqual(rojosDe(aviso), ["warnings[0]: cita stay.season, que no está en su material"]);
  const enInvierno = { ...MATERIAL.hoja, stay: { ...HOJA.stay, season: "winter" } };
  assert.deepEqual(rojosDe(aviso, { ...MATERIAL, hoja: enInvierno }), []);
});

test("las opiniones van de la más reciente a la más antigua, con su referencia y sin su nota", () => {
  const opinion = (fecha: string | null, bueno: string, malo = ""): Opinion => ({
    fecha,
    nota: 9.5,
    viajero: null,
    bueno,
    malo,
    de: "inventada",
  });
  const dadas = opinionesParaMirar(
    [
      opinion("2026-01-10", "vieja"),
      opinion(null, "sin fecha"),
      opinion("2026-06-01", "", ""),
      opinion("2026-09-01", "x".repeat(900)),
    ],
    2,
  );
  assert.deepEqual(
    dadas.map((o) => [o.ref, o.date, o.traveller]),
    [
      ["r1", "2026-09-01", "unknown"],
      ["r2", "2026-01-10", "unknown"],
    ],
  );
  assert.ok(dadas[0].liked.endsWith(" [cut]") && dadas[0].liked.length < 720);
  assert.ok(!JSON.stringify(dadas).includes("9.5"));
});

// La puerta 5.

test("una ficha de cómo es bien hecha pasa la puerta 5", () => {
  assert.deepEqual(
    rojosDe(() => {}),
    [],
  );
});

test("trampa: un nivel que no es de su lista", () => {
  assert.deepEqual(
    rojosDe((e) => (e.fields.look.level = "nice")),
    ['fields.look: el nivel "nice" no es de su lista'],
  );
  assert.deepEqual(
    rojosDe((e) => (e.fields.view.level = "swim")),
    ['fields.view: el nivel "swim" no es de su lista'],
  );
});

test("trampa: un nivel sin prueba", () => {
  assert.deepEqual(
    rojosDe((e) => (e.fields.room_light.evidence = [])),
    ["fields.room_light: tiene nivel y no tiene prueba"],
  );
});

test("trampa: la prueba cita una foto o una opinión que no recibió", () => {
  assert.deepEqual(
    rojosDe((e) => (e.fields.style.evidence[0].ref = "room-09.jpg")),
    ["fields.style.evidence[0]: cita la foto room-09.jpg, que no recibió"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.fields.gym.evidence[1].ref = "r99")),
    ["fields.gym.evidence[1]: cita la opinión r99, que no recibió"],
  );
});

test("trampa: juzga la habitación con una foto del hotel, que puede ser de una mejor", () => {
  const rojos = rojosDe((e) => {
    e.photos[1].shows = "bathroom";
    e.fields.gym = { level: "unknown", evidence: [], note: "" };
    e.fields.bathroom = {
      level: "modern",
      evidence: [{ kind: "photo", ref: "hotel-01.jpg", what: "a walk-in shower" }],
    };
  });
  assert.deepEqual(rojos, [
    "fields.bathroom.evidence[0]: prueba algo de la habitación con hotel-01.jpg, que no es una foto de esa habitación",
  ]);
});

test("trampa: prueba el gimnasio con una foto que en su inventario es de otra cosa", () => {
  assert.deepEqual(
    rojosDe((e) => (e.photos[1].shows = "common")),
    ["fields.gym.evidence[0]: prueba gym con hotel-01.jpg, que en su inventario enseña common"],
  );
});

test("trampa: cita de la ficha algo que no está, que no se sabe o que no se le dio", () => {
  const cita = (ref: string) => (e: Entrega) => (e.fields.view.evidence = [{ kind: "sheet", ref, what: "the sheet" }]);
  assert.deepEqual(rojosDe(cita("room.declared_views")), [
    "fields.view.evidence[0]: cita de la ficha room.declared_views, que no está o no se sabe",
  ]);
  assert.deepEqual(rojosDe(cita("price")), [
    "fields.view.evidence[0]: cita de la ficha price, que no está o no se sabe",
  ]);
});

test("trampa: el tamaño, a ojo, cuando la ficha dice los metros", () => {
  assert.deepEqual(
    rojosDe((e) => e.fields.room_space.evidence.shift()),
    ["fields.room_space: la ficha dice los metros y la prueba no los cita"],
  );
});

test("trampa: dice que no hay gimnasio y la ficha lo lista, o su inventario lo enseña", () => {
  const rojos = rojosDe((e) => {
    e.fields.gym = { level: "none", evidence: [{ kind: "sheet", ref: "services", what: "no gym listed" }], note: "" };
  });
  assert.deepEqual(rojos, [
    "fields.gym: dice que no hay y la ficha lo lista entre sus servicios",
    "fields.gym: dice que no hay y su inventario tiene una foto que lo enseña",
  ]);
});

test("un alojamiento sin gimnasio: «no hay» vale si la ficha no lo lista y nada lo enseña", () => {
  const sinGimnasio: Material = { ...MATERIAL, hoja: { ...MATERIAL.hoja, services: ["Outdoor pool", "Pool table"] } };
  const quita = (e: Entrega): void => {
    e.photos[1] = { file: "hotel-01.jpg", shows: "common", seen: ["a lobby"] };
    e.fields.gym = { level: "none", evidence: [{ kind: "sheet", ref: "services", what: "no gym listed" }], note: "" };
  };
  assert.deepEqual(rojosDe(quita, sinGimnasio), []);
  // Una mesa de billar no es una piscina.
  const sinPiscina: Material = { ...MATERIAL, hoja: { ...MATERIAL.hoja, services: ["Fitness center", "Pool table"] } };
  const quitaPiscina = (e: Entrega): void => {
    e.photos[2] = { file: "hotel-02.jpg", shows: "exterior", seen: ["a terrace"] };
    e.fields.pool = { level: "none", evidence: [{ kind: "sheet", ref: "services", what: "no pool listed" }], note: "" };
    e.warnings = [];
  };
  assert.deepEqual(rojosDe(quitaPiscina, sinPiscina), []);
});

test("trampa: le pone nivel a la piscina solo porque la ficha la lista", () => {
  const rojos = rojosDe((e) => {
    e.fields.pool.evidence = [{ kind: "sheet", ref: "services", what: "the sheet lists an outdoor pool" }];
  });
  assert.deepEqual(rojos, [
    "fields.pool: le pone nivel sin una foto ni una opinión: que la ficha lo liste no dice cómo es",
  ]);
});

test("trampa: el inventario se deja una foto, se inventa otra, repite o no dice qué enseña", () => {
  assert.deepEqual(
    rojosDe((e) => {
      e.photos.pop();
      e.fields.pool = { level: "unknown", evidence: [], note: "" };
      e.warnings = [];
    }),
    ["photos: falta inventariar hotel-02.jpg"],
  );
  assert.deepEqual(
    rojosDe((e) => e.photos.push({ file: "hotel-03.jpg", shows: "view", seen: ["the sea"] })),
    ["photos[3]: inventaría hotel-03.jpg, que no recibió"],
  );
  assert.deepEqual(
    rojosDe((e) => e.photos.push({ ...e.photos[0] })),
    ["photos[3]: inventaría dos veces room-01.jpg"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.photos[0] = { file: "room-01.jpg", shows: "lovely", seen: [] })),
    ["photos[0]: lo que enseña no es de su lista", "photos[0]: no dice lo que se ve"],
  );
});

test("trampa: falta un campo, sobra otro o la entrega trae lo que no es suyo", () => {
  assert.deepEqual(
    rojosDe((e) => delete e.fields.view),
    ["fields.view: falta el campo"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.fields.spa = { level: "full", evidence: [] })),
    ["fields.spa: no es un campo de la ficha"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.score = 9)),
    ["score: no es de la entrega"],
  );
  assert.deepEqual(
    rojosDe((e) => delete e.warnings),
    ["warnings: falta en la entrega"],
  );
  assert.deepEqual(puertaComoEs("una frase", MATERIAL).rojos, [
    { donde: "delivery", que: "la entrega no es un objeto" },
  ]);
});

test("trampa: mira otro alojamiento o juzga la suite en vez de la habitación de ese precio", () => {
  assert.deepEqual(
    rojosDe((e) => (e.lodging_id = "otro")),
    ["lodging_id: no es el alojamiento de su ficha de datos"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.room_id = "h2")),
    ["room_id: no es la habitación de ese precio"],
  );
});

test("trampa: hay campos que no se saben y no dice por qué", () => {
  assert.deepEqual(
    rojosDe((e) => (e.unknowns = [])),
    ["unknowns: hay campos que no se saben y no dice por qué"],
  );
});

test("trampa: en las opiniones cuenta él, pone un tono suyo o cita una que no recibió", () => {
  assert.deepEqual(
    rojosDe(
      (e) => (e.review_themes[0] = { theme: "noise", tone: "awful", mentions: "12", says: "noisy", refs: ["r7"] }),
    ),
    [
      "review_themes[0]: el tono no es de su lista",
      "review_themes[0]: cuántas lo dicen no es de su lista: contar es cosa del código",
      "review_themes[0]: cita la opinión r7, que no recibió",
    ],
  );
  assert.deepEqual(
    rojosDe((e) => (e.review_themes[0].refs = [])),
    ["review_themes[0]: no cita ninguna opinión"],
  );
});

test("trampa: un tema de las opiniones que no es de la lista, o el mismo tema dos veces con el mismo tono", () => {
  const ruido = { theme: "noise", tone: "bad", mentions: "one", says: "the street is noisy", refs: ["r1"] };
  assert.deepEqual(
    rojosDe((e) => (e.review_themes = [{ ...ruido, theme: "evening light show" }])),
    ["review_themes[0]: el tema no es de su lista"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.review_themes = [ruido, { ...ruido, says: "again" }])),
    ["review_themes[1]: repite un tema con el mismo tono"],
  );
  // El mismo tema para bien y para mal son dos cosas, y lo que no cabe en la lista va en «other», cuantas veces sea.
  const otro = { ...ruido, theme: "other" };
  assert.deepEqual(
    rojosDe((e) => (e.review_themes = [ruido, { ...ruido, tone: "good" }, otro, otro])),
    [],
  );
});

test("el contrato lista los mismos temas de las opiniones que el código, y ninguno más", () => {
  const entrega = leer("DELIVERY.md");
  const parrafo = entrega.slice(entrega.indexOf("`theme` is one of:"), entrega.indexOf("The list is closed"));
  const delContrato = [...parrafo.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).filter((t) => t !== "theme");
  assert.deepEqual(delContrato, TEMAS_DE_OPINIONES);
});

test("trampa: un choque o un aviso sin nada que lo sostenga, o un aviso sin su etiqueta", () => {
  assert.deepEqual(
    rojosDe((e) => (e.conflicts = [{ what: "the photos look newer than the reviews say", refs: [] }])),
    ["conflicts[0]: no cita nada del material"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.warnings[0] = { what: "the pool may be closed", label: "sure", refs: ["a website"] })),
    ["warnings[0]: cita a website, que no está en su material", "warnings[0]: el aviso no dice si se vio o se dedujo"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.conflicts = "none")),
    ["conflicts: no es una lista"],
  );
});

test("trampa: el resumen, en blanco", () => {
  assert.deepEqual(
    rojosDe((e) => (e.summary_bad = " ")),
    ["summary_bad: está en blanco"],
  );
});

test("trampa: cómo se ve, sin una foto de la habitación", () => {
  assert.deepEqual(
    rojosDe((e) => (e.fields.look.evidence = [{ kind: "review", ref: "r2", what: "guests say it looks new" }])),
    ["fields.look: dice cómo se ve sin una foto de la habitación"],
  );
});

test("trampa: cómo lo mantienen, probado con una foto oficial o sin ninguna opinión", () => {
  assert.deepEqual(
    rojosDe((e) => e.fields.upkeep.evidence.push({ kind: "photo", ref: "room-01.jpg", what: "it looks spotless" })),
    ["fields.upkeep.evidence[1]: prueba upkeep con una foto: eso solo lo cuentan los viajeros"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.fields.upkeep.evidence = [{ kind: "sheet", ref: "services", what: "daily housekeeping" }])),
    ["fields.upkeep: dice cómo lo mantienen sin una opinión que lo cuente"],
  );
});

test("lo que se ve y lo que cuentan los viajeros no se pisan: nueva en las fotos y descuidada en las opiniones", () => {
  assert.deepEqual(
    rojosDe((e) => {
      e.fields.look.level = "new_or_renovated";
      e.fields.upkeep.level = "neglected";
    }),
    [],
  );
});

// Otra pasada a ciegas.

test("dos pasadas se comparan campo a campo: igual, vecino, distinto y lo que una no sabe", () => {
  const otra = entregaBuena();
  otra.fields.look.level = "new_or_renovated";
  otra.fields.style.level = "modern_plain";
  otra.fields.gym.level = "full";
  otra.fields.pool.level = "unknown";
  delete otra.fields.view;
  const a = acuerdo(entregaBuena(), otra);
  const parecidos = Object.fromEntries(a.campos.map((c) => [c.campo, c.parecido]));
  assert.deepEqual(parecidos, {
    look: "vecino",
    upkeep: "igual",
    style: "distinto",
    room_space: "igual",
    room_light: "igual",
    bathroom: "ninguno sabe",
    view: "falta",
    gym: "distinto",
    pool: "uno no sabe",
  });
  assert.equal(a.iguales, 4);
  assert.equal(a.de, 9);
});

// De la búsqueda al puesto, y del puesto a la ficha recogida.

test("de una búsqueda salen los puestos a ciegas, y lo que entregan se recoge por las dos puertas", async () => {
  const run = join(TEMPORAL, "run-1");
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const p = await prepararMirar(BUSQUEDA, run, {
    pasadas: 2,
    fotos: { traer: async () => jpg, segura: () => true, encoger: async (b) => b },
  });
  assert.equal(p.puestos.length, BUSQUEDA.finalistas.length * 2);
  assert.deepEqual(p.avisos, []);

  // En el puesto no está el nombre del alojamiento: lo guarda la casa, fuera.
  const primero = p.puestos[0];
  const delPuesto = ["sheet.json", "reviews.json"].map((n) => readFileSync(join(primero.carpeta, "in", n), "utf8"));
  assert.ok(!delPuesto.join("").includes(p.quienes[0].nombre));
  assert.deepEqual(readdirSync(join(primero.carpeta, "in")).sort(), ["photos", "reviews.json", "sheet.json"]);
  assert.deepEqual(materialDe(primero.carpeta).fotos, ["hotel-01.jpg", "hotel-02.jpg", "room-01.jpg"]);
  // La orden que abre a cada uno es la misma: de qué puesto es lo dice el nombre de su archivo.
  assert.equal(readFileSync(join(run, "ordenes", `${primero.id}.txt`), "utf8"), ordenDeApertura());

  // Un asiento inventado trabaja en los dos puestos del primer finalista; los demás se quedan sin entregar.
  const delPrimero = p.quienes.filter((q) => q.alojamiento === p.quienes[0].alojamiento).map((q) => q.puesto);
  for (const id of delPrimero) {
    const puesto = p.puestos.find((x) => x.id === id);
    assert.ok(puesto !== undefined);
    const m = materialDe(puesto.carpeta);
    const entrega = entregaBuena();
    entrega.lodging_id = m.hoja.lodging_id;
    entrega.room_id = (m.hoja.room as { id: string }).id;
    if ((m.hoja.room as { size_m2: unknown }).size_m2 === "unknown") entrega.fields.room_space.evidence.shift();
    const textos: Record<string, string> = {
      "1-acknowledgement.md": "I received sheet.json, reviews.json and the folder photos.",
      "2-plan.md": "Room first, then the gym and the pool.",
      "3-notes.md": "- A double bed and one window. [in/photos/room-01.jpg] [seen]",
      "4-computations.md": "None needed.",
      "5-self-critique.md": "No photo of the bathroom: unknown.",
      "delivery.json": JSON.stringify(entrega),
    };
    for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
  }

  const r = recogerMirar(run);
  assert.equal(r.alojamientos.length, BUSQUEDA.finalistas.length);
  const mirado = r.alojamientos[0];
  assert.deepEqual(
    mirado.pasadas.map((x) => [x.metodo.rojos, x.comoEs.rojos]),
    [
      [[], []],
      [[], []],
    ],
  );
  assert.equal(mirado.acuerdo?.iguales, 9);
  // Lo que no se entregó queda en rojo, y el conjunto también.
  assert.equal(r.alojamientos[1].pasadas[0].comoEs.rojos[0].que, "no hay entrega que mirar");
  assert.equal(r.alojamientos[1].acuerdo, null);
  assert.equal(r.verde, false);
  assert.ok(readFileSync(join(run, "como_es.json"), "utf8").includes(mirado.nombre));
});

test("trampa: una queja grave que no es de la lista, repetida, o sin opiniones que la sostengan", () => {
  const plaga = { kind: "pests", mentions: "a_few", refs: ["r1"] };
  assert.deepEqual(
    rojosDe((e) => (e.serious = [plaga])),
    [],
  );
  assert.deepEqual(
    rojosDe((e) => (e.serious = [{ ...plaga, kind: "ugly curtains" }])),
    ["serious[0]: la queja grave no es de su lista"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.serious = [plaga, plaga])),
    ["serious[1]: repite una queja grave"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.serious = [{ ...plaga, mentions: "3", refs: ["r99"] }])),
    [
      "serious[0]: cuántas lo dicen no es de su lista: contar es cosa del código",
      "serious[0]: cita la opinión r99, que no recibió",
    ],
  );
  assert.deepEqual(
    rojosDe((e) => delete e.serious),
    ["serious: falta en la entrega", "serious: no es una lista"],
  );
});

test("el contrato nombra las quejas graves que el código acepta, y dice que una señal no es un veredicto", () => {
  const entrega = leer("DELIVERY.md");
  for (const clase of GRAVES) assert.ok(entrega.includes("`" + clase + "`"), clase);
  assert.match(leer("GUIDE.md"), /A flag is a place to look, not a verdict/);
});

test("al que mira se le señalan las opiniones con palabras de queja grave, sin decirle que pasó", () => {
  const opinion = (malo: string, bueno = ""): Opinion => ({
    fecha: "2026-12-01",
    nota: 5,
    viajero: null,
    bueno,
    malo,
    de: "x",
  });
  const dadas = opinionesParaMirar([
    opinion("Bed bugs and mould"),
    opinion("", "No bed bugs at all"),
    opinion("Small room"),
  ]);
  assert.deepEqual(
    dadas.map((o) => o.flag),
    [["pests", "mould"], ["pests"], []],
  );
});
