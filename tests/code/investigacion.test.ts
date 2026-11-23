// La investigación inventada, entera: de lo que he entendido al viaje para la web, pasando por cada paso de código,
// cada asiento y cada puerta, con fuentes inventadas y asientos de mentira. Sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AVISOS } from "../../agent/data/palabras.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { estanciaDe, sigue, VUELTAS, type Estado, type Fuentes } from "../../agent/launcher/investigar.ts";
import { puestosDe } from "../../agent/launcher/puesto.ts";
import { comprobarSucesos, comprobarViaje, type Foto, type Suceso, type Viaje } from "../../agent/output/viaje.ts";
import { buscarEnZonas } from "../../agent/scripts/busqueda_alojamiento.ts";
import type { ParaExplicar } from "../../agent/scripts/explica.ts";
import type { Tabla } from "../../agent/scripts/formas.ts";
import type { FuenteAlojamiento } from "../../agent/tools/fuentes/tipos.ts";
import { ALOJAMIENTOS, ESTANCIA, fuenteInventada, MINIMOS } from "../cases/inventado/inventado.ts";
import {
  ENTENDIDO,
  entregaDeCruce,
  entregaDeExplicar,
  entregaDeRuta,
  entregaDeSitios,
  SITIOS,
  vueloInventado,
} from "../cases/inventado/investigacion.ts";

/** La fuente inventada, con los alojamientos repartidos en los dos barrios: los tres primeros, en el viejo. */
function fuenteDeDosBarrios(): FuenteAlojamiento {
  const fuente = fuenteInventada();
  return {
    ...fuente,
    async lista() {
      return ALOJAMIENTOS.map((a, i) => {
        const cerca = i < 3 ? SITIOS[1].punto : SITIOS[0].punto;
        return { ...a, lat: cerca.lat + 0.0003 * i, lon: cerca.lon };
      });
    },
  };
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const FOTO: Foto = { url: "https://fotos.invalid/faro.jpg", autor: "Ana", licencia: "CC BY 4.0", pagina: null };

function fuentesInventadas(): Fuentes {
  return {
    alojamiento: fuenteDeDosBarrios(),
    sitios: async () => SITIOS,
    resumenes: async () => new Map([["Q1", "It guides ships into the bay."]]),
    fotos: async (archivos) => new Map(archivos.map((a) => [a, FOTO])),
    vuelos: async (_viaje, ida, vuelta) => [vueloInventado(ida, vuelta)],
    bajarFotos: { traer: async () => JPEG, segura: () => true },
  };
}

type Objeto = Record<string, any>;
const leerJson = (ruta: string): Objeto => JSON.parse(readFileSync(ruta, "utf8"));

/** Lo que entregaría el que mira, hecho a la medida del material de su puesto para que pase la puerta 5. */
function miradoPara(puesto: string): Objeto {
  const hoja = leerJson(join(puesto, "in", "sheet.json"));
  const foto = (ref: string, what: string) => ({ kind: "photo", ref, what });
  const conMetros = typeof hoja.room === "object" && hoja.room.size_m2 !== "unknown";
  // El más barato de todos tiene un gimnasio simbólico: el viajero lo marcó como imprescindible.
  const gimnasio = hoja.lodging_id === "a1" ? "token" : "full";
  return {
    seat: "lodging-viewer",
    lodging_id: hoja.lodging_id,
    room_id: typeof hoja.room === "object" ? hoja.room.id : "unknown",
    photos: [
      { file: "room-01.jpg", shows: "room", seen: ["a double bed", "one window onto a street"] },
      { file: "hotel-01.jpg", shows: "gym", seen: ["treadmills, free weights and a rack"] },
      { file: "hotel-02.jpg", shows: "pool", seen: ["an outdoor pool with eight loungers"] },
    ],
    fields: {
      look: { level: "good_condition", evidence: [foto("room-01.jpg", "nothing worn")], note: "" },
      upkeep: { level: "well_kept", evidence: [{ kind: "review", ref: "r1", what: "a clean room" }], note: "" },
      style: { level: "chain", evidence: [foto("room-01.jpg", "standard furniture")], note: "" },
      room_space: {
        level: "fits",
        evidence: [
          ...(conMetros ? [{ kind: "sheet", ref: "room.size_m2", what: "the sheet gives the size" }] : []),
          foto("room-01.jpg", "the bed and a way around it"),
        ],
        note: "",
      },
      room_light: { level: "average", evidence: [foto("room-01.jpg", "one ordinary window")], note: "" },
      bathroom: { level: "unknown", evidence: [], note: "no photo of the bathroom" },
      view: { level: "street", evidence: [foto("room-01.jpg", "the window looks onto a street")], note: "" },
      gym: { level: gimnasio, evidence: [foto("hotel-01.jpg", "the machines of the gym")], note: "" },
      pool: { level: "bathe", evidence: [foto("hotel-02.jpg", "an outdoor pool")], note: "" },
    },
    review_themes: [],
    conflicts: [],
    warnings: [],
    unknowns: ["No photo shows the bathroom of this room."],
    summary_good: "A room in good condition with a gym in the building.",
    summary_bad: "unknown",
  };
}

/** Lo que entregaría cada asiento, según cuál sea y lo que tenga en su puesto. */
function entregaDe(asiento: string, puesto: string): Objeto {
  const dado = (nombre: string): any => leerJson(join(puesto, "in", nombre));
  if (asiento === "route-planner") return entregaDeRuta();
  if (asiento === "lodging-viewer") return miradoPara(puesto);
  if (asiento === "sights-picker") return entregaDeSitios();
  if (asiento === "trip-crosser") return entregaDeCruce(dado("table.json") as Tabla);
  const paraExplicar: ParaExplicar = {
    ways: dado("ways.json"),
    levers: dado("levers.json"),
    checks: dado("checks.json"),
  };
  return entregaDeExplicar(paraExplicar);
}

/** Un asiento de mentira trabaja en su puesto: deja sus seis archivos, en su orden, con la entrega que se le diga. */
function trabaja(run: string, id: string, estropea: (asiento: string, entrega: Objeto) => void = () => {}): void {
  const puesto = puestosDe(run).find((p) => p.id === id);
  assert.ok(puesto !== undefined, `no existe el puesto ${id}`);
  const entrega = entregaDe(puesto.asiento, puesto.carpeta);
  estropea(puesto.asiento, entrega);
  const piezas = readdirSync(join(puesto.carpeta, "in"));
  const textos: Record<string, string> = {
    "1-acknowledgement.md": `I received ${piezas.join(", ")}.`,
    "2-plan.md": "Read everything, then decide.",
    "3-notes.md": `- What the material says. [in/${piezas[0]}] [seen]`,
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify(entrega),
  };
  for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
}

/** Lleva una investigación hasta el final o hasta que pare, haciendo trabajar a cada asiento que espera. */
async function investiga(
  run: string,
  estropea?: (asiento: string, entrega: Objeto, puesto: string) => void,
): Promise<{ estado: Estado; lanzados: string[] }> {
  const lanzados: string[] = [];
  let estado = await sigue(run, fuentesInventadas());
  for (let i = 0; i < 30 && estado.esperan.length > 0; i++) {
    for (const id of estado.esperan) {
      trabaja(run, id, (asiento, entrega) => estropea?.(asiento, entrega, id));
      lanzados.push(id);
    }
    estado = await sigue(run, fuentesInventadas());
  }
  return { estado, lanzados };
}

function runNuevo(): string {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-viaje-"));
  writeFileSync(join(run, "entendido.json"), JSON.stringify(ENTENDIDO));
  return run;
}

test("la estancia que se busca sale de lo que he entendido", () => {
  const e = estanciaDe(ENTENDIDO);
  assert.deepEqual(
    { entrada: e.entrada, salida: e.salida, adultos: e.adultos, pais: e.pais, nacionalidad: e.nacionalidad },
    { entrada: ESTANCIA.entrada, salida: ESTANCIA.salida, adultos: 2, pais: "ZZ", nacionalidad: "YY" },
  );
  assert.equal(e.moneda, "EUR");
});

test("la moneda y el pasaporte son del viajero: si faltan, no se supone ninguno", () => {
  const sinMoneda = { ...ENTENDIDO, currency: "" };
  assert.throws(() => estanciaDe(sinMoneda), /en qué moneda/);
  const sinPasaporte = { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, passports: [] }, origin: null };
  assert.throws(() => estanciaDe(sinPasaporte), /con qué pasaporte/);
  // Sin pasaporte dicho, vale el país del que sale; nunca uno puesto por el código.
  const sinDecirlo = { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, passports: [] } };
  assert.equal(estanciaDe(sinDecirlo).nacionalidad, "YY");
  assert.equal(estanciaDe({ ...ENTENDIDO, currency: "jpy" }).moneda, "JPY");
});

test("la búsqueda por zonas junta lo de cada zona sin repetir, y el más barato de cada una se mira", async () => {
  const zonas = [
    { id: "z1", nombre: "Barrio Viejo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 800 },
    { id: "z2", nombre: "El puerto", lat: SITIOS[0].punto.lat, lon: SITIOS[0].punto.lon, radio: 800 },
  ];
  const b = await buscarEnZonas(fuenteDeDosBarrios(), ESTANCIA, zonas, MINIMOS);
  assert.equal(b.devueltos, ALOJAMIENTOS.length);
  assert.deepEqual(
    b.zonas?.map((z) => [z.id, z.devueltos]),
    [
      ["z1", 10],
      ["z2", 10],
    ],
  );
  assert.equal(b.finalistas.length, 5);
  assert.deepEqual(
    b.finalistas.slice(0, 2).map((f) => [f.alojamiento.id, f.motivo]),
    [
      ["a1", "el más barato de su zona"],
      ["a6", "el más barato de su zona"],
    ],
  );
  assert.equal(new Set(b.finalistas.map((f) => f.alojamiento.id)).size, 5);
  await assert.rejects(buscarEnZonas(fuenteDeDosBarrios(), ESTANCIA, [], MINIMOS), /ninguna zona/);
});

test("lo que no declara un imprescindible se descarta antes de mirarlo; lo que no se sabe, no", async () => {
  const zonas = [{ id: "z1", nombre: "Todo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 3000 }];
  const fuente = fuenteDeDosBarrios();
  // El más barato no tiene gimnasio; el segundo sí; de los demás, la fuente no dice nada.
  const conLoQueDeclaran: FuenteAlojamiento = {
    ...fuente,
    async lista(e, m) {
      const todos = await fuente.lista(e, m);
      return todos.map((a) =>
        a.id === "a1" ? { ...a, declara: ["pool"] } : a.id === "a2" ? { ...a, declara: ["gym"] } : a,
      );
    },
  };
  const b = await buscarEnZonas(conLoQueDeclaran, ESTANCIA, zonas, MINIMOS, { imprescindibles: ["gym"] });
  assert.ok(!b.dentro.some((a) => a.id === "a1"));
  assert.ok(!b.finalistas.some((f) => f.alojamiento.id === "a1"));
  assert.equal(b.fuera.find((d) => d.id === "a1")?.motivo, "no declara gym, que es imprescindible");
  assert.ok(b.finalistas.some((f) => f.alojamiento.id === "a2"));
  assert.ok(b.finalistas.length >= 4);
  assert.equal(b.dentro.length + b.fuera.length, b.devueltos);
  assert.ok(b.avisos.some((x) => x.includes("no declaran lo imprescindible")));
  // Sin imprescindibles, nadie se descarta por lo que declara.
  const sin = await buscarEnZonas(conLoQueDeclaran, ESTANCIA, zonas, MINIMOS);
  assert.ok(sin.dentro.some((a) => a.id === "a1"));
});

test("la investigación inventada, entera: de lo entendido al viaje, por cada asiento y cada puerta", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run);
    assert.deepEqual(estado.parado, null);
    assert.equal(estado.hecho, true);
    // Los asientos, en su orden: la ruta; a la vez, mirar los cinco finalistas y elegir los sitios; cruzar; explicar.
    assert.equal(lanzados[0], "ruta-v1");
    assert.deepEqual(lanzados.slice(1, 7).sort(), ["a1-p1", "a2-p1", "a3-p1", "a4-p1", "a5-p1", "sitios-v1"]);
    assert.deepEqual(lanzados.slice(7), ["cruce-1-v1", "explica-v1"]);

    const viaje = leerJson(join(run, "viaje.json")) as Viaje;
    const sucesos = leerJson(join(run, "sucesos.json")) as unknown as Suceso[];
    assert.deepEqual(comprobarViaje(viaje), []);
    assert.deepEqual(comprobarSucesos(sucesos), []);
    assert.equal(viaje.muestra, false);
    assert.equal(viaje.idioma, "es");
    assert.equal(viaje.alojamientos.length, 5);
    assert.equal(viaje.transportes.length, 1);

    // Las tres maneras, con el total de la tabla, que lleva el vuelo, y lo que escribió el que explica.
    assert.deepEqual(
      viaje.maneras.map((m) => m.id),
      ["cheapest", "best_value", "different"],
    );
    const tabla = leerJson(join(run, "tabla-1.json")) as Tabla;
    for (const m of viaje.maneras) {
      const fila = tabla.rows.find((r) => r.lodging === m.alojamiento)!;
      assert.equal(m.total, fila.total);
      assert.equal(m.transporte, "t1");
      assert.ok(m.gana.length > 0 && m.pierde.length > 0 && (m.porQue ?? "").length > 0);
    }

    // El más barato de todos tiene el gimnasio simbólico: se enseña descartado, con su porqué, y no es ninguna manera.
    const a1 = viaje.alojamientos.find((a) => a.id === "a1")!;
    assert.deepEqual(a1.descartado, { clase: "missing_must", cosa: "gym", detalle: "token" });
    assert.ok(!viaje.maneras.some((m) => m.alojamiento === "a1"));
    const otro = viaje.alojamientos.find((a) => a.id !== "a1")!;
    assert.equal(otro.descartado, null);
    assert.equal(typeof otro.puntos, "number");
    assert.equal(typeof otro.andando, "number");
    assert.ok(["Catedral Inventada, Barrio Viejo", "Faro Inventado"].includes(otro.zona ?? ""));

    // Las palancas que se cuentan ahorran, y llevan su texto; los días, con las paradas elegidas.
    assert.ok(viaje.palancas.length >= 1);
    for (const p of viaje.palancas) assert.ok(p.ahorra > 0 && p.que.length > 0 && p.aCambio.length > 0);
    assert.equal(viaje.paradas.length, 7);
    assert.equal(viaje.paradas[0].foto?.autor, "Ana");
    assert.equal(viaje.dias.length, 4);

    // Lo que se entrega lleva sus dos avisos, y lo que no se sabe.
    assert.ok(viaje.avisos.includes(AVISOS.es.ia) && viaje.avisos.includes(AVISOS.es.precios));
    assert.ok(viaje.avisos.some((a) => a.includes("No se sabe a qué hora llega")));

    // La investigación cuenta las dos zonas donde buscó.
    assert.deepEqual(
      sucesos.filter((s) => s.clase === "zone").map((s) => s.nombre),
      ["Catedral Inventada, Barrio Viejo", "Faro Inventado"],
    );

    // Volver a llamar con todo hecho no rehace nada.
    const otraVez = await sigue(run, fuentesInventadas());
    assert.equal(otraVez.hecho, true);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("un rojo vuelve a su asiento con lo que estaba mal, y con la entrega buena la investigación sigue", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run, (asiento, entrega, puesto) => {
      // El que cruza se inventa un total en su primera vuelta.
      if (asiento === "trip-crosser" && puesto.endsWith("-v1")) entrega.ways.cheapest.total += 1;
    });
    assert.equal(estado.hecho, true);
    assert.ok(lanzados.includes("cruce-1-v1") && lanzados.includes("cruce-1-v2"));
    const devuelto = leerJson(join(run, "puestos", "cruce-1-v2", "in", "returned.json"));
    assert.match(devuelto.what_was_wrong[0].que, /su total es .* y el de la tabla es/);
    assert.equal(devuelto.delivery.seat, "trip-crosser");
    assert.equal(leerJson(join(run, "cruce-1-v1.puertas.json")).verde, false);
    assert.equal(leerJson(join(run, "cruce-1-v2.puertas.json")).verde, true);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("si el rojo no se arregla en sus vueltas, la investigación se para y dice dónde: nunca avanza mal", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run, (asiento, entrega) => {
      if (asiento === "route-planner") entrega.bases[0].nights = 9;
    });
    assert.equal(estado.hecho, false);
    assert.equal(estado.parado?.paso, "la ruta (puerta 3)");
    assert.match(estado.parado?.rojos[0].que ?? "", /sus noches suman 9 y el viaje tiene 3/);
    assert.equal(lanzados.length, VUELTAS + 1);
    assert.ok(!existsSync(join(run, "ruta.json")) && !existsSync(join(run, "busqueda.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("si el que cruza pide más precios, hay una segunda ronda con ellos en la tabla, y ninguna más", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run, (asiento, entrega, puesto) => {
      if (asiento === "trip-crosser" && puesto.startsWith("cruce-1-")) {
        const otra = entrega.ways.different.row;
        entrega.requests = [{ lever: "shift_dates", row: otra, days: -1 }];
      }
    });
    assert.equal(estado.hecho, true);
    assert.ok(lanzados.includes("cruce-2-v1") && !lanzados.includes("cruce-3-v1"));
    const primera = leerJson(join(run, "tabla-1.json")) as Tabla;
    const segunda = leerJson(join(run, "tabla-2.json")) as Tabla;
    assert.equal(segunda.round, 2);
    assert.equal(segunda.levers.length, primera.levers.length + 1);
    const pedida = segunda.levers[segunda.levers.length - 1];
    assert.equal(pedida.lever, "shift_dates");
    assert.equal(pedida.change.days_moved, -1);
    assert.notEqual(pedida.base_row, primera.levers[0].base_row);
    assert.ok(existsSync(join(run, "puestos", "cruce-2-v1", "in", "previous.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
