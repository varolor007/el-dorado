// Las pruebas del asiento de la ruta: su contrato y el código dicen lo mismo, las cuentas de alrededor salen, y la
// puerta 3 caza cada trampa.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { LETRAS_DE_UN_NOMBRE, MEDIOS, RADIOS } from "../../agent/data/ruta.ts";
import { esNombre, imprescindiblesDeLaRuta, puertaRuta, type MaterialDeRuta } from "../../agent/gates/puerta_ruta.ts";
import { nombreDeFuera } from "../../agent/gates/textos.ts";
import { FORMAS_DE_VIAJE, type EntregaDeRuta } from "../../agent/scripts/formas.ts";
import { diasDe, lugarDe, resolverZonas } from "../../agent/scripts/ruta.ts";
import { minutosEntre } from "../../agent/tools/distancias.ts";
import { ENTENDIDO, entregaDeRuta, LUGARES, SITIOS } from "../cases/inventado/investigacion.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "route-planner");
const leer = (nombre: string): string => readFileSync(join(CONTRATO, nombre), "utf8");

const MATERIAL: MaterialDeRuta = {
  viaje: ENTENDIDO,
  noches: 3,
  lugares: LUGARES,
  traslados: [{ ref: "t1", minutes: 95 }],
};

type Entrega = Record<string, any>;
function rojosDe(cambia: (e: Entrega) => void, material: MaterialDeRuta = MATERIAL): string[] {
  const entrega = entregaDeRuta() as Entrega;
  cambia(entrega);
  return puertaRuta(entrega, material).rojos.map((r) => `${r.donde}: ${r.que}`);
}

/** Una ruta de dos bases, para las trampas de los traslados. */
function conDosBases(e: Entrega): void {
  e.shape = "route";
  e.bases[0].nights = 2;
  e.bases.push({
    id: "b2",
    name: "Otro Pueblo Inventado",
    nights: 2,
    why: "the castle is there",
    zones: [{ id: "z3", name: "El castillo", anchors: ["Q8"], radius_m: 800, near: ["Q8"], why: "by the castle" }],
  });
  e.transfers = [{ from: "b1", to: "b2", minutes: 95, by: "train", source: "t1" }];
  e.exit.base = "b2";
}
const DE_CUATRO: MaterialDeRuta = { ...MATERIAL, noches: 4 };

test("el contrato nombra las formas, los radios y los medios que el código acepta", () => {
  const entrega = leer("DELIVERY.md");
  for (const forma of FORMAS_DE_VIAJE) assert.ok(entrega.includes("`" + forma + "`"), forma);
  for (const radio of RADIOS) assert.ok(entrega.includes("`" + radio + "`"), String(radio));
  for (const medio of MEDIOS) assert.ok(entrega.includes("`" + medio + "`"), medio);
  // Lo que la puerta pide de un nombre, el contrato lo dice: un rojo por una regla que no está escrita no es justo.
  assert.equal(entrega.split(`${LETRAS_DE_UN_NOMBRE} characters at most`).length - 1, 2);
});

test("las normas del asiento de la ruta van de la RU1 a la RU7, y el contrato dice lo que no ve", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(RU\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(codigos, ["RU1", "RU2", "RU3", "RU4", "RU5", "RU6", "RU7"]);
  assert.match(leer("README.md"), /You do not see prices, hotels or flights/);
  assert.match(leer("README.md"), /You do not use the internet/);
});

test("los días se cuentan: las noches y cada día con su día de la semana", () => {
  const d = diasDe("2027-03-05", "2027-03-08");
  assert.equal(d.nights, 3);
  assert.deepEqual(
    d.days.map((x) => x.weekday),
    ["friday", "saturday", "sunday", "monday"],
  );
  assert.throws(() => diasDe("2027-03-05", "2027-03-05"), /después de la entrada/);
});

test("un sitio de los datos se le da al asiento con su fuente, y lo que no se sabe de él, dicho", () => {
  const lugar = lugarDe(SITIOS[0], "It guides ships into the bay.");
  assert.equal(lugar.id, "Q1");
  assert.equal(lugar.about, "monument in an invented city It guides ships into the bay.");
  assert.equal(lugar.source, "https://www.wikidata.org/wiki/Q1");
  assert.equal(lugarDe({ ...SITIOS[0], descripcion: null }).about, "unknown");
});

test("una ruta bien hecha pasa la puerta", () => {
  assert.deepEqual(
    rojosDe(() => {}),
    [],
  );
  assert.deepEqual(rojosDe(conDosBases, DE_CUATRO), []);
});

test("el centro de una zona es el punto medio de sus anclas, y lo que se anda lo cuenta el código", () => {
  const [vieja, puerto] = resolverZonas(entregaDeRuta(), LUGARES);
  assert.deepEqual(vieja.centre, { lat: 10.0025, lon: 20.0105 });
  assert.deepEqual(puerto.centre, SITIOS[0].punto);
  assert.equal(vieja.base, "b1");
  // Al viajero y a otras fuentes, la zona se les dice con los nombres de sus anclas, que salen de los datos.
  assert.equal(vieja.label, "Catedral Inventada, Barrio Viejo");
  assert.equal(puerto.label, "Faro Inventado");
  assert.equal(vieja.name, "Barrio Viejo");
  assert.equal(vieja.near[0].walk_minutes, minutosEntre(vieja.centre, SITIOS[1].punto));
  assert.equal(puerto.near[0].walk_minutes, 1);
  assert.deepEqual(
    puerto.near.map((x) => x.name),
    ["Faro Inventado", "Mercado del Puerto", "Parque de la Ría"],
  );
});

test("trampa: las noches de las bases no suman las del viaje", () => {
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].nights = 4)),
    ["bases: sus noches suman 4 y el viaje tiene 3"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].nights = 2.5)),
    ["bases[0]: sus noches no son un número entero de noches", "bases: sus noches suman 0 y el viaje tiene 3"],
  );
});

test("trampa: una ruta con una base de una sola noche", () => {
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.bases[0].nights = 3;
      e.bases[1].nights = 1;
    }, DE_CUATRO),
    ["bases[1]: lleva 1 noche y el mínimo por base es 2"],
  );
});

test("trampa: dice que hay una sola base y entrega dos, o dice ruta y entrega una", () => {
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.shape = "single_base";
    }, DE_CUATRO),
    ["bases: dice que hay una sola base y entrega más de una"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.shape = "route")),
    ["bases: una ruta lleva dos bases o más"],
  );
});

test("trampa: una zona sin centro, con un ancla que no está en los datos o con un radio suyo", () => {
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[0].anchors = [])),
    ["bases[0].zones[0]: lleva 0 anclas, y son de una a 3: sin ellas no tiene centro"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[0].anchors = ["Q2", "Q999"])),
    ["bases[0].zones[0]: su ancla Q999 no está en los datos"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[1].radius_m = 950)),
    ["bases[0].zones[1]: su radio no es de su lista"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[0].anchors = [{ lat: 10, lon: 20 }])),
    ["bases[0].zones[0]: su ancla [object Object] no está en los datos"],
  );
});

test("trampa: nombra cerca un sitio que no está en los datos, o repite una zona, o no dice qué hay", () => {
  assert.deepEqual(
    rojosDe((e) => e.bases[0].zones[0].near.push("Q404")),
    ["bases[0].zones[0]: nombra Q404, que no está en los datos"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[1].id = "z1")),
    ["bases[0].zones[1]: la zona z1 sale dos veces"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[1].why = " ")),
    ["bases[0].zones[1]: no dice qué hay ahí"],
  );
});

test("trampa: una zona cuyo nombre no es un nombre: sale a buscar a otras fuentes, y no puede llevar otra cosa", () => {
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[0].name = "Old town https://example.com/?q=")),
    ["bases[0].zones[0]: no tiene un nombre corto, de una línea y sin direcciones"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones[0].name = "x".repeat(LETRAS_DE_UN_NOMBRE + 1))),
    ["bases[0].zones[0]: no tiene un nombre corto, de una línea y sin direcciones"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].name = "Villa\nInventada")),
    ["bases[0]: no dice dónde se duerme, con un nombre corto"],
  );
});

test("un nombre que viene de fuera vale recortado si es un nombre, y si no lo es, no vale", () => {
  assert.equal(nombreDeFuera("  Villa Inventada "), "Villa Inventada");
  assert.equal(nombreDeFuera("Villa\nInventada"), null);
  assert.equal(nombreDeFuera("Villa Inventada, see https://example.com/pay"), null);
  assert.equal(nombreDeFuera("Villa Inventada www.example.com"), null);
  assert.equal(nombreDeFuera("   "), null);
  assert.equal(nombreDeFuera("x".repeat(LETRAS_DE_UN_NOMBRE + 1)), null);
  // Lo que se mide es el nombre, no los espacios de alrededor.
  assert.equal(nombreDeFuera(` ${"x".repeat(LETRAS_DE_UN_NOMBRE)} `), "x".repeat(LETRAS_DE_UN_NOMBRE));
  // Lo que no es un texto tampoco es un nombre, venga de donde venga.
  assert.equal(nombreDeFuera(7 as unknown as string), null);
  // Es la misma regla que la puerta 3 le aplica al nombre de una zona.
  assert.equal(esNombre("Villa Inventada"), true);
  assert.equal(esNombre("Villa\nInventada"), false);
});

test("trampa: cuatro zonas en una base, o ninguna", () => {
  assert.deepEqual(
    rojosDe((e) => (e.bases[0].zones = [])),
    ["bases[0]: lleva 0 zonas, y son de una a 3"],
  );
});

test("trampa: falta un traslado entre dos bases, o no tiene su duración, o no es la de su fuente", () => {
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.transfers = [];
    }, DE_CUATRO),
    ["transfers: falta el traslado de b1 a b2"],
  );
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.transfers[0].minutes = "unknown";
      e.transfers[0].source = "unknown";
    }, DE_CUATRO),
    ["transfers[0]: no tiene su duración o su fuente: sin ellas no se sabe si los días caben"],
  );
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.transfers[0].minutes = 40;
    }, DE_CUATRO),
    ["transfers[0]: su duración no es la de su fuente"],
  );
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.transfers[0].source = "t9";
    }, DE_CUATRO),
    ["transfers[0]: cita el traslado t9, que no está en su material"],
  );
});

test("trampa: se entra por una base que no es la primera", () => {
  assert.deepEqual(
    rojosDe((e) => {
      conDosBases(e);
      e.entry.base = "b2";
    }, DE_CUATRO),
    ["entry: no es la base por la que empieza o acaba el orden de la ruta"],
  );
});

test("lo imprescindible que es de la ruta es lo que no es una cosa del alojamiento", () => {
  assert.deepEqual(imprescindiblesDeLaRuta(ENTENDIDO), ["the lighthouse"]);
});

test("trampa: un imprescindible del viajero del que la ruta no dice nada", () => {
  assert.deepEqual(
    rojosDe((e) => (e.musts = [])),
    ["musts: no dice qué pasa con «the lighthouse», que es imprescindible para el viajero"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.musts[0].where_or_why = "")),
    ["musts[0]: no dice dónde queda cubierto ni por qué no"],
  );
});

test("trampa: un campo de más, uno de menos, o una entrega de otro asiento", () => {
  assert.deepEqual(
    rojosDe((e) => (e.hotel = "Hotel Faro Inventado")),
    ["hotel: no es de la entrega"],
  );
  assert.deepEqual(
    rojosDe((e) => delete e.left_out),
    ["left_out: falta en la entrega"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.seat = "lodging-viewer")),
    ["seat: la entrega no es del asiento de la ruta"],
  );
  assert.deepEqual(puertaRuta("no soy una entrega", MATERIAL).rojos, [
    { donde: "delivery", que: "la entrega no es un objeto" },
  ]);
});

const _tipo: EntregaDeRuta = entregaDeRuta();
void _tipo;
