// La investigación inventada: lo que el viajero pidió, los sitios de una ciudad que no existe y lo que entregaría cada
// asiento si trabajara bien. Con ella se prueba toda la cadena sin internet y sin gastar. Nada sale de una fuente de
// verdad.

import { buscarAlojamiento } from "../../../agent/scripts/busqueda_alojamiento.ts";
import { paradasDe } from "../../../agent/scripts/dias.ts";
import type {
  EntregaDeCruce,
  EntregaDeMirar,
  EntregaDeRuta,
  EntregaDeSitios,
  Entendido,
  Lugar,
  Tabla,
} from "../../../agent/scripts/formas.ts";
import { lugarDe, resolverZonas } from "../../../agent/scripts/ruta.ts";
import { montarTabla, type PiezasDeLaTabla } from "../../../agent/scripts/tabla.ts";
import type { Vuelo } from "../../../agent/tools/fuentes/tipos.ts";
import { cambiosDePartida, pedirPalancas } from "../../../agent/tools/palancas.ts";
import type { Sitio } from "../../../agent/tools/sitios.ts";
import { ESTANCIA, fuenteInventada, MINIMOS, VISTO } from "./inventado.ts";

/** Lo que he entendido: tres noches para dos, con un gimnasio de verdad y el faro como imprescindibles. */
export const ENTENDIDO: Entendido = {
  language: "es",
  destination: {
    name: "Villa Inventada",
    country: "ZZ",
    kind: "city",
    centre: { lat: ESTANCIA.lat, lon: ESTANCIA.lon },
    box: { west: 19.97, south: 9.98, east: 20.03, north: 10.03 },
  },
  origin: { name: "Origen Inventado", country: "YY", airport: "OOO" },
  dates: { check_in: ESTANCIA.entrada, check_out: ESTANCIA.salida, flexible: false },
  travellers: { adults: 2, children: [], passports: ["YY", "YY"] },
  budget: "medium",
  looking_for: ["comer bien", "ver lo imprescindible"],
  pace: "normal",
  tastes: [
    { thing: "gym", weight: "must", quote: "con un gimnasio de verdad" },
    { thing: "views", weight: "like", quote: "si puede ser, con vistas" },
    { thing: "the lighthouse", weight: "must", quote: "no me quiero ir sin subir al faro" },
  ],
  limits: [],
  booked: [],
};

function sitio(id: string, nombre: string, clase: string, lat: number, lon: number, enlaces: number): Sitio {
  return {
    id,
    nombre,
    clase,
    clases: [clase],
    punto: { lat, lon },
    enlaces,
    descripcion: `${clase} in an invented city`,
    articulo: null,
    articuloEnIngles: null,
    archivo: `${nombre}.jpg`,
    fuente: "inventada",
    visto: VISTO,
  };
}

/** Diez sitios en dos barrios: el del puerto, al oeste, y el viejo, al este, a unos dos kilómetros. */
export const SITIOS: Sitio[] = [
  sitio("Q1", "Faro Inventado", "monument", 10.0, 19.99, 60),
  sitio("Q2", "Catedral Inventada", "church", 10.002, 20.011, 55),
  sitio("Q3", "Museo de la Sal", "museum", 10.003, 20.012, 40),
  sitio("Q4", "Mercado del Puerto", "market", 10.001, 19.992, 30),
  sitio("Q5", "Mirador del Viento", "viewpoint", 10.004, 20.013, 25),
  sitio("Q6", "Parque de la Ría", "park", 10.002, 19.993, 20),
  sitio("Q7", "Barrio Viejo", "neighbourhood", 10.003, 20.01, 18),
  sitio("Q8", "Castillo Inventado", "castle", 10.005, 20.014, 16),
  sitio("Q9", "Puente de Hierro", "bridge", 10.001, 20.0, 12),
  sitio("Q10", "Plaza Mayor Inventada", "square", 10.002, 20.009, 10),
];

export const LUGARES: Lugar[] = SITIOS.map((s) => lugarDe(s));

/** La ruta que entregaría un asiento aplicado: una sola base, tres noches y dos zonas donde buscar. */
export function entregaDeRuta(): EntregaDeRuta {
  return {
    seat: "route-planner",
    shape: "single_base",
    bases: [
      {
        id: "b1",
        name: "Villa Inventada",
        nights: 3,
        why: "everything the traveller comes for is inside the city",
        zones: [
          {
            id: "z1",
            name: "Barrio Viejo",
            anchors: ["Q2", "Q7"],
            radius_m: 1200,
            near: ["Q2", "Q3", "Q5", "Q8"],
            why: "between the cathedral and the old quarter, with the museum and the castle up the hill",
          },
          {
            id: "z2",
            name: "El puerto",
            anchors: ["Q1"],
            radius_m: 800,
            near: ["Q1", "Q4", "Q6"],
            why: "by the lighthouse, with the market and the park along the water",
          },
        ],
      },
    ],
    transfers: [],
    entry: { base: "b1", why: "the only base" },
    exit: { base: "b1", why: "the only base" },
    musts: [{ what: "the lighthouse", covered: true, where_or_why: "b1: the lighthouse anchors zone z2" }],
    left_out: [],
    unknowns: [],
  };
}

/** Lo que elegiría un asiento aplicado: siete sitios que merecen la pena, por orden, y tres que no, con su porqué. */
export function entregaDeSitios(): EntregaDeSitios {
  const ir = (id: string, why: string, minutes: number, must = false): EntregaDeSitios["go"][number] => ({
    id,
    why,
    minutes,
    best_time: "any",
    book_ahead: "unknown",
    must,
  });
  return {
    seat: "sights-picker",
    go: [
      ir("Q1", "El faro al que querías subir: se ve toda la ría desde arriba.", 60, true),
      ir("Q2", "La catedral, con un claustro que se recorre en media hora.", 45, true),
      { ...ir("Q4", "El mercado del puerto, para comer de puesto en puesto.", 90), best_time: "morning" },
      { ...ir("Q5", "El mirador, sobre los tejados del barrio viejo.", 30), best_time: "evening" },
      ir("Q7", "El barrio viejo, para pasear sin rumbo entre la catedral y la plaza.", 90),
      { ...ir("Q8", "El castillo, con sus murallas sobre la ciudad.", 90), book_ahead: "yes" },
      ir("Q3", "El museo de la sal, pequeño y distinto a los demás.", 60),
    ],
    skip: [
      { id: "Q6", why: "Un parque sin nada que lo distinga, lejos de lo demás." },
      { id: "Q9", why: "Un puente que se ve de paso, sin visita." },
      { id: "Q10", why: "Una plaza por la que ya pasas al ir al barrio viejo." },
    ],
    missing: [{ what: "a beach for an afternoon", why: "the list has no beach" }],
    unknowns: [],
  };
}

const NIVELES_DE_PARTIDA: Record<string, string> = {
  look: "good_condition",
  upkeep: "well_kept",
  style: "chain",
  room_space: "fits",
  room_light: "average",
  bathroom: "correct",
  view: "street",
  gym: "token",
  pool: "none",
};

/** La ficha de cómo es que entregaría el que mira, con los niveles que se le digan y los demás de partida. */
export function miradoInventado(id: string, niveles: Record<string, string> = {}): EntregaDeMirar {
  const fields: EntregaDeMirar["fields"] = {};
  for (const [campo, nivel] of Object.entries({ ...NIVELES_DE_PARTIDA, ...niveles })) {
    const evidence = nivel === "unknown" ? [] : [{ kind: "photo", ref: "room-01.jpg", what: `${campo}: ${nivel}` }];
    fields[campo] = { level: nivel, evidence, note: "" };
  }
  return {
    seat: "lodging-viewer",
    lodging_id: id,
    room_id: "h1",
    photos: [{ file: "room-01.jpg", shows: "room", seen: ["a double bed"] }],
    fields,
    review_themes: [],
    conflicts: [],
    warnings: [],
    unknowns: [],
    summary_good: "A room in good condition.",
    summary_bad: "unknown",
  };
}

/** Un vuelo inventado, guardado de hace días, para las fechas que se le pidan: el viernes es el día caro. */
export function vueloInventado(ida: string, vuelta: string): Vuelo {
  const caro = new Date(ida + "T00:00:00Z").getUTCDay() === 5;
  return {
    fuente: "inventada",
    visto: VISTO,
    origen: "OOO",
    destino: "VVV",
    sale: `${ida}T08:00:00Z`,
    vuelve: `${vuelta}T19:00:00Z`,
    aerolinea: "Aire Inventado",
    numero: "AI100",
    precio: caro ? 160 : 100,
    moneda: "EUR",
    escalasIda: 0,
    escalasVuelta: 0,
    minutos: 80,
    guardado: true,
    enlace: null,
  };
}

/**
 * Las piezas de la tabla del viaje inventado: los cinco finalistas de la búsqueda inventada, ya mirados (el más
 * barato, con un gimnasio simbólico, que el viajero marcó como imprescindible), las dos zonas de la ruta, las
 * paradas elegidas y lo que contesta la fuente a cada cambio de fechas.
 */
export async function piezasDeLaTabla(conVuelo = true): Promise<PiezasDeLaTabla> {
  const fuente = fuenteInventada();
  const busqueda = await buscarAlojamiento(fuente, ESTANCIA, MINIMOS);
  // Los finalistas, repartidos por los dos barrios: los dos últimos caen en el puerto.
  busqueda.finalistas.forEach((f, i) => {
    const s = i >= 3 ? SITIOS[0] : SITIOS[1];
    f.alojamiento = { ...f.alojamiento, lat: s.punto.lat + 0.0005 * i, lon: s.punto.lon };
  });
  const mirados: Record<string, EntregaDeMirar> = {};
  busqueda.finalistas.forEach((f, i) => {
    const id = f.alojamiento.id;
    mirados[id] = miradoInventado(id, { gym: id === "a1" ? "token" : i % 2 === 0 ? "full" : "maintenance" });
  });
  const ids = busqueda.finalistas.map((f) => f.alojamiento.id);
  const vuelos = async (ida: string, vuelta: string): Promise<Vuelo[]> => [vueloInventado(ida, vuelta)];
  const movidos = await pedirPalancas(fuente, ESTANCIA, ids, cambiosDePartida([-2, -1, 1, 2], [-1, 1]), {
    vuelos: conVuelo ? vuelos : undefined,
  });
  return {
    viaje: ENTENDIDO,
    busqueda,
    zonas: resolverZonas(entregaDeRuta(), LUGARES),
    mirados,
    paradas: paradasDe(entregaDeSitios(), SITIOS).map((p) => p.punto),
    transporte: conVuelo ? vueloInventado(ESTANCIA.entrada, ESTANCIA.salida) : null,
    movidos,
    ronda: 1,
    notas: [],
  };
}

export async function tablaInventada(conVuelo = true): Promise<Tabla> {
  return montarTabla(await piezasDeLaTabla(conVuelo));
}

/** Lo que entregaría un asiento que cruza aplicado, sobre una tabla: copia cada número de ella. */
export function entregaDeCruce(t: Tabla): EntregaDeCruce {
  const marcada = (marca: string): Tabla["rows"][number] => t.rows.find((r) => r.marks.includes(marca))!;
  const barata = marcada("cheapest");
  const mejor = marcada("best_value");
  const otra = t.rows.find(
    (r) => r.discarded === "" && r.id !== barata.id && r.id !== mejor.id && r.zone !== mejor.zone,
  )!;
  const deLaLista = (lever: string): string[] => t.levers.filter((l) => l.lever === lever).map((l) => l.id);
  const probada = (lever: string, reason: string): EntregaDeCruce["levers"][number] => ({
    lever,
    status: "tested",
    rows: deLaLista(lever),
    reason,
  });
  const espera = (lever: string): EntregaDeCruce["levers"][number] => ({
    lever,
    status: "not_available",
    rows: [],
    reason: "the house cannot price it until there is a transport search",
  });
  const ahorra = t.levers
    .filter((l) => l.status === "priced" && typeof l.saves === "number" && l.saves > 0)
    .filter((l) => typeof l.change.row !== "string" || t.rows.find((r) => r.id === l.change.row)?.discarded === "")
    .sort((a, b) => (b.saves as number) - (a.saves as number))
    .slice(0, 2);
  return {
    seat: "trip-crosser",
    levers: [
      probada("shift_dates", "leaving a day earlier is the change of dates that saves the most"),
      probada("nights", "one night less saves, and the traveller loses a day"),
      probada("other_lodging", "the other lodgings of the table are priced"),
      probada("other_zone", "the port zone has its own lodgings"),
      espera("other_airport"),
      espera("open_jaw"),
      espera("route_order"),
      espera("train_for_flight"),
    ],
    ways: {
      cheapest: { row: barata.id, total: barata.total },
      best_value: { row: mejor.id, total: mejor.total },
      different: { row: otra.id, total: otra.total, lever: "other_zone", why: "the only way that sleeps by the port" },
    },
    tell: ahorra.map((l) => ({ lever_row: l.id, saves: l.saves as number, why: "a real saving for the same trip" })),
    checks: [{ what: "the arrival time is not in the table", status: "unknown", refs: [] }],
    requests: [],
    unknowns: [],
  };
}
