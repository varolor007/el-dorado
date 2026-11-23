// La investigación inventada, entera: de lo que he entendido al viaje para la web, pasando por cada paso de código,
// cada asiento y cada puerta, con fuentes inventadas y asientos de mentira. Sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ESCALERA_DE_MINIMOS, ESCALERA_DE_RADIO, RADIO_MAXIMO } from "../../agent/data/cribas.ts";
import { AVISOS } from "../../agent/data/palabras.ts";
import { puertaBusqueda } from "../../agent/gates/puerta_busqueda.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { estanciaDe, sigue, VUELTAS, type Estado, type Fuentes } from "../../agent/launcher/investigar.ts";
import { puestosDe } from "../../agent/launcher/puesto.ts";
import { comprobarSucesos, comprobarViaje, type Foto, type Suceso, type Viaje } from "../../agent/output/viaje.ts";
import { buscarConEscalera, buscarDondeHaya, buscarEnZonas } from "../../agent/scripts/busqueda_alojamiento.ts";
import type { ParaExplicar } from "../../agent/scripts/explica.ts";
import type { Entendido, Tabla } from "../../agent/scripts/formas.ts";
import { avisosDeSiempre, vistazoDe } from "../../agent/scripts/monta_viaje.ts";
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
import { viajeInventado } from "../cases/inventado/viaje.ts";

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
    review_themes: [{ theme: "cleanliness", tone: "good", mentions: "several", says: "a clean room", refs: ["r1"] }],
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
  fuentes: () => Fuentes = fuentesInventadas,
): Promise<{ estado: Estado; lanzados: string[] }> {
  const lanzados: string[] = [];
  let estado = await sigue(run, fuentes());
  for (let i = 0; i < 30 && estado.esperan.length > 0; i++) {
    for (const id of estado.esperan) {
      trabaja(run, id, (asiento, entrega) => estropea?.(asiento, entrega, id));
      lanzados.push(id);
    }
    estado = await sigue(run, fuentes());
  }
  return { estado, lanzados };
}

function runNuevo(entendido: Entendido = ENTENDIDO): string {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-viaje-"));
  writeFileSync(join(run, "entendido.json"), JSON.stringify(entendido));
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

test("la escalera de mínimos: con bastantes alojamientos vale el primer escalón; si no, baja, y lo dice", async () => {
  const zonas = [{ id: "z1", nombre: "Todo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 3000 }];
  // Con el primer escalón quedan seis con precio. Si bastan cinco, no se baja.
  const sobra = await buscarConEscalera(fuenteDeDosBarrios(), ESTANCIA, zonas, ESCALERA_DE_MINIMOS, 5);
  assert.deepEqual(sobra.minimos, ESCALERA_DE_MINIMOS[0]);
  assert.ok(!sobra.avisos.some((x) => x.includes("se bajan los mínimos")));
  // Si hacen falta ocho, baja escalón a escalón hasta el último, y cuenta cada bajada.
  const escasa = await buscarConEscalera(fuenteDeDosBarrios(), ESTANCIA, zonas, ESCALERA_DE_MINIMOS, 8);
  assert.deepEqual(escasa.minimos, ESCALERA_DE_MINIMOS[ESCALERA_DE_MINIMOS.length - 1]);
  assert.equal(escasa.avisos.filter((x) => x.includes("se bajan los mínimos")).length, ESCALERA_DE_MINIMOS.length - 1);
  assert.match(escasa.avisos[0], /con nota 8\.5, 200 opiniones y 4 estrellas quedaban 6 con precio/);
  // Con los mínimos del último escalón pasan los que antes caían por pocas opiniones o por no llevar estrellas.
  assert.ok(escasa.dentro.length > sobra.dentro.length);
  assert.equal(escasa.dentro.length + escasa.fuera.length, escasa.devueltos);
  await assert.rejects(buscarConEscalera(fuenteDeDosBarrios(), ESTANCIA, zonas, [], 5), /no hay mínimos/);
});

test("si en la zona no hay con qué elegir, se busca más ancho, y se dice hasta dónde", async () => {
  // Una fuente que solo tiene algo a más de cinco kilómetros del centro de la zona, como pasa en un pueblo.
  const fuente = fuenteDeDosBarrios();
  const pedidos: number[] = [];
  const lejana: FuenteAlojamiento = {
    ...fuente,
    async lista(e, m) {
      pedidos.push(e.radio);
      return e.radio < 5000 ? [] : fuente.lista(e, m);
    },
  };
  const zonas = [{ id: "z1", nombre: "El pueblo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 800 }];
  const como = {
    minimos: ESCALERA_DE_MINIMOS.slice(0, 1),
    bastan: 5,
    radios: ESCALERA_DE_RADIO,
    radioMaximo: RADIO_MAXIMO,
  };
  const b = await buscarDondeHaya(lejana, ESTANCIA, zonas, como);
  assert.deepEqual(pedidos, [800, 2400, 7200]);
  assert.equal(b.zonas?.[0].radio, 7200);
  assert.equal(b.finalistas.length, 5);
  assert.deepEqual(
    b.avisos.filter((x) => x.includes("se busca más ancho")),
    [
      "a 800 metros solo había 0 alojamientos con precio: se busca más ancho",
      "a 2400 metros solo había 0 alojamientos con precio: se busca más ancho",
    ],
  );
  // Si en la zona como es ya hay con qué elegir, no se ensancha.
  pedidos.length = 0;
  const cercana = await buscarDondeHaya(fuente, ESTANCIA, zonas, como);
  assert.equal(cercana.zonas?.[0].radio, 800);
  assert.ok(!cercana.avisos.some((x) => x.includes("se busca más ancho")));
  // Y nunca más allá del tope: si no hay nada, se queda con lo que haya, y lo dice.
  const vacia: FuenteAlojamiento = { ...fuente, lista: async () => [] };
  const nada = await buscarDondeHaya(vacia, ESTANCIA, zonas, { ...como, radioMaximo: 2000 });
  assert.equal(nada.finalistas.length, 0);
  assert.equal(nada.avisos.filter((x) => x.includes("se busca más ancho")).length, 2);
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
    // De lo que dijo el que mira llegan sus niveles y lo que se dice, por sus claves: ninguna frase suya.
    assert.equal(otro.comoEs.length, 9);
    assert.deepEqual(otro.seDice, [{ tema: "cleanliness", tono: "good", menciones: "several" }]);
    assert.ok(!JSON.stringify(viaje.alojamientos).includes("A room in good condition"));

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

    // Un run que se retoma no vuelve a juzgar lo que ya juzgó: si alguien toca después la entrega de un asiento, o
    // la puerta cambia, el viaje se vuelve a montar con lo que se recogió en su momento, y su veredicto no se pisa.
    const veredicto = readFileSync(join(run, "como_es.json"), "utf8");
    const tocado = puestosDe(run).find((p) => p.id === "a2-p1")!;
    writeFileSync(join(tocado.carpeta, "out", "delivery.json"), JSON.stringify({ seat: "lodging-viewer" }));
    rmSync(join(run, "viaje.json"));
    const retomado = await sigue(run, fuentesInventadas());
    assert.equal(retomado.hecho, true);
    assert.equal(readFileSync(join(run, "como_es.json"), "utf8"), veredicto);
    const deNuevo = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(deNuevo.alojamientos.find((a) => a.id === "a2")!.comoEs.length, 9);
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

test("un rojo de una puerta de código deja el run parado: la llamada siguiente no pasa por encima", async () => {
  const run = runNuevo();
  try {
    // La fuente contesta en otra moneda que la del viajero: la puerta 4 lo para.
    const enOtraMoneda = (): Fuentes => {
      const f = fuentesInventadas();
      const precios = f.alojamiento.precios.bind(f.alojamiento);
      f.alojamiento.precios = async (ids, e) => (await precios(ids, e)).map((p) => ({ ...p, moneda: "USD" }));
      return f;
    };
    const { estado, lanzados } = await investiga(run, undefined, enOtraMoneda);
    assert.equal(estado.parado?.paso, "la búsqueda (puerta 4)");
    assert.deepEqual(lanzados, ["ruta-v1"]);
    const puestos = puestosDe(run).length;
    // Se llame las veces que se llame, y aunque la fuente ya conteste bien, sigue parado y no monta nada más.
    for (const fuentes of [enOtraMoneda, fuentesInventadas]) {
      const otraVez = await sigue(run, fuentes());
      assert.equal(otraVez.hecho, false);
      assert.deepEqual(otraVez.esperan, []);
      assert.equal(otraVez.parado?.paso, "la búsqueda (puerta 4)");
    }
    assert.equal(puestosDe(run).length, puestos);
    assert.ok(!existsSync(join(run, "viaje.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("sin sitios en los datos se para antes de gastar un asiento, y dice por qué", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run, undefined, () => ({
      ...fuentesInventadas(),
      sitios: async () => [],
    }));
    assert.equal(estado.parado?.paso, "los sitios que ver");
    assert.deepEqual(lanzados, []);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("sin ningún alojamiento con precio se para tras la búsqueda: ni se mira ni se cruza ni se explica", async () => {
  const run = runNuevo();
  try {
    const sinPrecios = (): Fuentes => {
      const f = fuentesInventadas();
      f.alojamiento.precios = async () => [];
      return f;
    };
    const { estado, lanzados } = await investiga(run, undefined, sinPrecios);
    assert.equal(estado.parado?.paso, "la búsqueda de alojamiento");
    assert.match(estado.parado!.rojos[0].que, /ninguno tiene precio para esas noches y ese grupo/);
    assert.deepEqual(lanzados, ["ruta-v1"]);
    assert.ok(!existsSync(join(run, "viaje.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("una entrega con una forma que rompería la puerta es un rojo con su vuelta, no una excepción", async () => {
  const run = runNuevo();
  try {
    const { estado, lanzados } = await investiga(run, (asiento, entrega, puesto) => {
      if (asiento === "route-planner" && puesto.endsWith("-v1")) entrega.bases = { toString: 1 };
    });
    assert.equal(estado.hecho, true);
    assert.ok(lanzados.includes("ruta-v2"));
    assert.equal(leerJson(join(run, "ruta-v1.puertas.json")).verde, false);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("si la casa se corta a medio preparar los puestos de mirar, al retomar sigue con lo que quedó", async () => {
  const run = runNuevo();
  try {
    // Hasta la búsqueda; después, un corte: un puesto montado y sellado, otro a medio montar y sin `mirar.json`.
    let estado = await sigue(run, fuentesInventadas());
    trabaja(run, "ruta-v1");
    let cortes = 0;
    const seCorta = (): Fuentes => ({
      ...fuentesInventadas(),
      bajarFotos: {
        segura: () => true,
        traer: async () => {
          if (++cortes > 3) throw new Error("corte");
          return JPEG;
        },
      },
    });
    await sigue(run, seCorta());
    rmSync(join(run, "mirar.json"), { force: true });
    rmSync(join(run, "sellos", "a2-p1.json"), { force: true });
    assert.ok(existsSync(join(run, "puestos", "a2-p1")));
    estado = await sigue(run, fuentesInventadas());
    assert.equal(estado.parado, null);
    assert.deepEqual([...estado.esperan].sort(), ["a1-p1", "a2-p1", "a3-p1", "a4-p1", "a5-p1", "sitios-v1"]);
    assert.ok(existsSync(join(run, "sellos", "a2-p1.json")) && existsSync(join(run, "ordenes", "a2-p1.txt")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("lo entendido mal escrito para el run antes de buscar nada y de lanzar a nadie", async () => {
  const run = runNuevo({ ...ENTENDIDO, pace: "relaxed" as never });
  try {
    let llamadas = 0;
    const cuenta = (): Fuentes => ({
      ...fuentesInventadas(),
      sitios: async () => {
        llamadas++;
        return SITIOS;
      },
    });
    const { estado, lanzados } = await investiga(run, undefined, cuenta);
    assert.equal(estado.parado?.paso, "lo entendido (puerta 1)");
    assert.deepEqual(lanzados, []);
    assert.equal(llamadas, 0);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("los dos avisos de siempre no se pierden con un idioma que no es un idioma", () => {
  for (const idioma of ["constructor", "toString", "__proto__", "ja"])
    assert.deepEqual(avisosDeSiempre(idioma), [AVISOS.en.ia, AVISOS.en.precios], idioma);
  assert.deepEqual(avisosDeSiempre("es"), [AVISOS.es.ia, AVISOS.es.precios]);
  // Y un viaje sin ellos, o con un aviso que no es una frase, no pasa su comprobación.
  const sin = viajeInventado();
  sin.avisos = sin.avisos.filter((a) => a !== AVISOS.es.ia);
  assert.deepEqual(
    comprobarViaje(sin).map((p) => p.que),
    ["falta el aviso de que está hecho con IA"],
  );
  const conNulo = viajeInventado();
  conNulo.avisos = [null as never, ...conNulo.avisos];
  assert.deepEqual(
    comprobarViaje(conNulo).map((p) => p.que),
    ["un aviso no es una frase"],
  );
});

test("un viaje que pide varias bases se para tras la ruta, con un solo asiento gastado, y dice por qué", async () => {
  // Cuatro noches, para que quepan dos bases de dos. El asiento entrega la ruta que el viaje necesita, con el
  // traslado sin saber, como le dice su contrato: no es un rojo suyo, y no se le devuelve para que la encoja.
  const cuatro = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_out: "2027-03-09" } };
  const run = runNuevo(cuatro);
  try {
    const { estado, lanzados } = await investiga(run, (asiento, entrega) => {
      if (asiento !== "route-planner") return;
      entrega.shape = "route";
      entrega.bases[0].nights = 2;
      entrega.bases.push({
        id: "b2",
        name: "Otro Pueblo Inventado",
        nights: 2,
        why: "the castle is there",
        zones: [{ id: "z9", name: "El castillo", anchors: ["Q8"], radius_m: 800, near: ["Q8"], why: "by the castle" }],
      });
      entrega.transfers = [{ from: "b1", to: "b2", minutes: "unknown", by: "car", source: "unknown" }];
      entrega.exit.base = "b2";
      entrega.unknowns = ["How long it takes to go from one base to the other."];
    });
    assert.equal(estado.parado?.paso, "la ruta");
    assert.match(estado.parado!.rojos[0].que, /pide 2 bases.*aún no puede planearlo/);
    assert.deepEqual(lanzados, ["ruta-v1"]);
    assert.equal(leerJson(join(run, "ruta-v1.puertas.json")).verde, true);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

/** Una fuente de pueblo: cuatro casas en la zona, que solo pasan el último escalón, y diez hoteles a seis km. */
function fuenteDePueblo(cuenta: { listas: number; precios: string[]; detalles: string[] }): FuenteAlojamiento {
  const centro = SITIOS[1].punto;
  const base = fuenteInventada();
  const casa = (i: number): (typeof ALOJAMIENTOS)[number] => ({
    ...ALOJAMIENTOS[0],
    id: `casa-${i}`,
    nombre: `Casa Inventada ${i}`,
    nota: 8.4 + i * 0.2,
    opiniones: 35 + i * 10,
    estrellas: null,
    lat: centro.lat + 0.0005 * i,
    lon: centro.lon,
  });
  const hotel = (i: number): (typeof ALOJAMIENTOS)[number] => ({
    ...ALOJAMIENTOS[0],
    id: `hotel-${i}`,
    nombre: `Hotel Lejano Inventado ${i}`,
    nota: 8.6,
    opiniones: 900,
    estrellas: 4,
    lat: centro.lat + 0.054,
    lon: centro.lon + 0.0005 * i,
  });
  const todos = [...[1, 2, 3, 4].map(casa), ...Array.from({ length: 10 }, (_, i) => hotel(i + 1))];
  const metros = (a: { lat: number; lon: number }): number => Math.abs(a.lat - centro.lat) * 111_000;
  return {
    ...base,
    async lista(e) {
      cuenta.listas++;
      return todos.filter((a) => metros(a) <= e.radio).map((a) => ({ ...a }));
    },
    async precios(ids, e) {
      cuenta.precios.push(...ids);
      const uno = (await base.precios(["a1"], e))[0];
      return ids.map((id, i) => ({ ...uno, id, total: 100 + i }));
    },
    async detalle(id) {
      cuenta.detalles.push(id);
      return base.detalle(id);
    },
  };
}

test("al ensanchar no se pierde lo de la zona: va por delante, y lo de fuera entra con sus mínimos", async () => {
  const cuenta = { listas: 0, precios: [] as string[], detalles: [] as string[] };
  const zonas = [{ id: "z1", nombre: "El pueblo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 800 }];
  const como = { minimos: ESCALERA_DE_MINIMOS, bastan: 8, radios: ESCALERA_DE_RADIO, radioMaximo: RADIO_MAXIMO };
  const b = await buscarDondeHaya(fuenteDePueblo(cuenta), ESTANCIA, zonas, como);
  // Las cuatro casas de la zona son finalistas, y el quinto sale de los hoteles de fuera.
  const finalistas = b.finalistas.map((f) => f.alojamiento.id);
  assert.deepEqual(finalistas.filter((id) => id.startsWith("casa")).sort(), ["casa-1", "casa-2", "casa-3", "casa-4"]);
  assert.equal(finalistas.filter((id) => id.startsWith("hotel")).length, 1);
  // Los mínimos que se dicen son los más bajos que hicieron falta, y los cumple todo lo que queda dentro.
  assert.deepEqual(b.minimos, ESCALERA_DE_MINIMOS[ESCALERA_DE_MINIMOS.length - 1]);
  assert.deepEqual(puertaBusqueda(b, 5).rojos, []);
  assert.equal(b.dentro.length + b.fuera.length, b.devueltos);
  // Los hoteles de fuera se miraron con el primer escalón, que ya daba bastantes.
  const pasos = b.pasos!;
  assert.deepEqual(
    pasos.map((x) => [x.veces, x.minimos.nota, x.pasan]),
    [
      [1, 8.5, 0],
      [1, 8, 0],
      [1, 7.5, 0],
      [1, 7, 4],
      [3, 8.5, 0],
      [3, 8, 0],
      [3, 7.5, 0],
      [3, 7, 0],
      [9, 8.5, 10],
    ],
  );
  // Y no repite trabajo: una lista por zona y radio, cada precio una vez, y el detalle solo de los finalistas.
  assert.equal(cuenta.listas, 3);
  assert.equal(new Set(cuenta.precios).size, cuenta.precios.length);
  assert.deepEqual([...cuenta.detalles].sort(), [...finalistas].sort());
  // Lo que hubo que bajar y ensanchar llega al primer vistazo del viaje.
  const v = vistazoDe(b);
  assert.equal(v.bajados, true);
  assert.equal(v.ensanchado, true);
  assert.deepEqual(v.minimos, ESCALERA_DE_MINIMOS[ESCALERA_DE_MINIMOS.length - 1]);
});

test("si muchos pasan los mínimos y ninguno tiene precio, no se baja ni se ensancha, y se dice", async () => {
  let listas = 0;
  const base = fuenteDeDosBarrios();
  const sinPrecios: FuenteAlojamiento = {
    ...base,
    async lista(e, m) {
      listas++;
      return base.lista(e, m);
    },
    precios: async () => [],
  };
  const zonas = [{ id: "z1", nombre: "Todo", lat: SITIOS[1].punto.lat, lon: SITIOS[1].punto.lon, radio: 3000 }];
  const como = { minimos: ESCALERA_DE_MINIMOS, bastan: 8, radios: ESCALERA_DE_RADIO, radioMaximo: RADIO_MAXIMO };
  const b = await buscarDondeHaya(sinPrecios, ESTANCIA, zonas, { ...como, muchosSinPrecio: 5 });
  assert.equal(listas, 1);
  assert.equal(b.pasos!.length, 1);
  assert.equal(b.finalistas.length, 0);
  assert.ok(b.avisos.some((x) => x.includes("ninguno tiene precio para esas noches y ese grupo")));
  assert.ok(!b.avisos.some((x) => x.includes("se bajan los mínimos") || x.includes("se busca más ancho")));
});

test("si ningún alojamiento mirado vale para el viajero, se para antes de cruzar, y se dice", async () => {
  const run = runNuevo();
  try {
    // Todos tienen un gimnasio simbólico, y el viajero lo marcó como imprescindible.
    const { estado, lanzados } = await investiga(run, (asiento, entrega) => {
      if (asiento === "lodging-viewer") entrega.fields.gym.level = "token";
    });
    assert.equal(estado.parado?.paso, "la tabla");
    assert.match(estado.parado!.rojos[0].que, /de los 5 alojamientos mirados, ninguno vale para este viajero/);
    assert.ok(!lanzados.some((id) => id.startsWith("cruce") || id.startsWith("explica")));
    assert.ok(!existsSync(join(run, "viaje.json")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("un viaje que no se anda se para tras elegir los sitios, y lo dice", async () => {
  const run = runNuevo();
  try {
    // Los mismos sitios, repartidos a decenas de kilómetros unos de otros: un parque que se recorre en coche.
    const lejanos = (): Fuentes => ({
      ...fuentesInventadas(),
      sitios: async () => SITIOS.map((s, i) => ({ ...s, punto: { lat: s.punto.lat + 0.2 * i, lon: s.punto.lon } })),
    });
    const { estado, lanzados } = await investiga(run, undefined, lejanos);
    assert.equal(estado.parado?.paso, "los días");
    assert.match(estado.parado!.rojos[0].que, /este viaje no es de los que se andan/);
    assert.ok(!lanzados.some((id) => id.startsWith("cruce") || id.startsWith("explica")));
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
