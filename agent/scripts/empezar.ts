// Empezar: de lo que el viajero busca y toca a lo que he entendido de su viaje. Es código: aquí no hay IA. La web
// lleva las respuestas (lo que ha tocado y lo que no) y de ellas sale lo que la casa guarda y la puerta 1 mira.
//
// Lo que el viajero no ha dicho se pone con lo más probable, para que el código pueda ir buscando mientras contesta,
// y se apunta como supuesto: es lo que se le enseña para que lo confirme o lo corrija. Lo que no se puede suponer
// (en qué moneda ve los precios, la edad de un niño, de qué país es) se apunta como falta, y sin ello no hay nada
// que guardar. Lo que escribe con sus palabras va tal cual, en una línea: quien lo separa en gustos y en límites es
// el que escucha, que es un asiento.
//
// Sin nada de Node: lo usa también la web.

import { LETRAS_DE_UN_NOMBRE } from "../data/ruta.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO } from "../data/viaje.ts";
import type { Punto, Ritmo } from "../output/viaje.ts";
import type { Caja, CUANTO_MOVERSE, Entendido, GASTOS } from "./formas.ts";

export type ClaseDeDestino = Entendido["destination"]["kind"];
type Gasto = (typeof GASTOS)[number];
type Cuanto = (typeof CUANTO_MOVERSE)[number];

/** Un sitio elegido en el buscador de lugares. Su país y su caja pueden no venir: no todo lo que se busca los trae. */
export type SitioElegido = {
  nombre: string;
  pais: string | null;
  clase: ClaseDeDestino;
  centro: Punto;
  caja: Caja | null;
};

/** Lo que el viajero ha dicho hasta ahora. Lo que aún no ha dicho va en null: la web no contesta por él. */
export type Respuestas = {
  /** El idioma en el que lee, y la moneda en la que ve los precios. */
  idioma: string;
  moneda: string | null;
  destino: SitioElegido;
  /** De dónde sale. Sin ello no hay transporte que buscar. */
  origen: { nombre: string; pais: string | null } | null;
  entrada: string;
  salida: string;
  fechasMovibles: boolean | null;
  adultos: number | null;
  /** La edad de cada niño; null, la de uno que aún no la tiene dicha. */
  ninos: (number | null)[];
  habitaciones: number | null;
  /** El pasaporte de cada viajero, por las dos letras de su país. */
  pasaportes: string[] | null;
  gasto: Gasto | null;
  ritmo: Ritmo | null;
  /** Lo que busca, de los toques, con las palabras que tocó. */
  buscas: string[];
  /** Solo en un país o en una región. */
  moverse: { variosSitios: boolean | null; salirDelPais: boolean | null; cuanto: Cuanto | null };
  /** Lo que ya tiene reservado, y lo que añade, con sus palabras. Vacío si no dice nada. */
  reservado: string;
  libre: string;
};

/** Lo más probable de lo que no se ha dicho: con ello se busca mientras el viajero contesta. */
export const LO_MAS_PROBABLE = {
  adultos: 2,
  habitaciones: 1,
  fechasMovibles: false,
  gasto: "medium",
  ritmo: "normal",
} as const;

/** El lado de la caja que se le pone a un sitio que no trae la suya, en metros, por su clase. */
export const CAJA_DE_PARTIDA: Record<ClaseDeDestino, number> = { city: 12_000, region: 60_000, country: 400_000 };

const METROS_POR_GRADO = 111_320;
const entre = (x: number, desde: number, hasta: number): number => Math.min(hasta, Math.max(desde, x));
/** Una longitud, de vuelta a su sitio en el mapa si se sale por el meridiano 180. */
const longitud = (x: number): number => ((((x + 180) % 360) + 360) % 360) - 180;

/** La caja de un lado dado alrededor de un punto. Cerca de un polo no se sale del mapa. */
export function cajaAlrededor(centro: Punto, lado: number): Caja {
  const dLat = lado / 2 / METROS_POR_GRADO;
  // Lejos del ecuador un grado de longitud mide menos: hacen falta más para el mismo lado, sin dar la vuelta entera.
  const dLon = Math.min(179, dLat / Math.max(0.01, Math.cos((centro.lat * Math.PI) / 180)));
  return {
    west: longitud(centro.lon - dLon),
    south: entre(centro.lat - dLat, -90, 90),
    east: longitud(centro.lon + dLon),
    north: entre(centro.lat + dLat, -90, 90),
  };
}

/** Lo que alguien escribe, en una línea y sin pasar de su largo. */
export function enUnaLinea(texto: string, largo: number = FRASE_DEL_VIAJERO): string {
  return texto
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, largo)
    .trim();
}

const pais = (v: string | null | undefined): string | null =>
  typeof v === "string" && /^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : null;

/** Las respuestas de quien acaba de elegir dónde y cuándo: todo lo demás, sin decir. */
export function respuestasDe(
  destino: SitioElegido,
  fechas: { entrada: string; salida: string },
  quien: { idioma: string; moneda: string | null },
): Respuestas {
  return {
    idioma: quien.idioma,
    moneda: quien.moneda,
    destino,
    origen: null,
    entrada: fechas.entrada,
    salida: fechas.salida,
    fechasMovibles: null,
    adultos: null,
    ninos: [],
    habitaciones: null,
    pasaportes: null,
    gasto: null,
    ritmo: null,
    buscas: [],
    moverse: { variosSitios: null, salirDelPais: null, cuanto: null },
    reservado: "",
    libre: "",
  };
}

export type LoEntendido = {
  /** Lo que he entendido, o null si falta algo que no se puede suponer. */
  entendido: Entendido | null;
  /** Los campos puestos con lo más probable, porque el viajero no los ha dicho: se le enseñan y los confirma. */
  supuesto: string[];
  /** Los campos que no se pueden suponer y que el viajero tiene que decir. */
  falta: string[];
};

/**
 * Lo que he entendido de un viaje, de las respuestas del viajero. No juzga si los datos valen (una fecha pasada, más
 * habitaciones que adultos): eso lo dice la puerta 1, que mira lo que sale de aquí.
 */
export function entendidoDe(r: Respuestas): LoEntendido {
  const supuesto: string[] = [];
  const falta: string[] = [];
  const dicho = <T>(valor: T | null, campo: string, probable: T): T => {
    if (valor !== null) return valor;
    supuesto.push(campo);
    return probable;
  };

  const moneda = typeof r.moneda === "string" && /^[A-Za-z]{3}$/.test(r.moneda.trim()) ? r.moneda.trim() : null;
  if (moneda === null) falta.push("currency");
  const paisDelDestino = pais(r.destino.pais);
  if (paisDelDestino === null) falta.push("destination.country");
  const paisDeSalida = r.origen === null ? null : pais(r.origen.pais);
  if (r.origen !== null && paisDeSalida === null) falta.push("origin.country");

  const adultos = dicho(r.adultos, "travellers.adults", LO_MAS_PROBABLE.adultos);
  const habitaciones = dicho(r.habitaciones, "travellers.rooms", LO_MAS_PROBABLE.habitaciones);
  const edades = r.ninos.filter((e): e is number => e !== null);
  if (edades.length < r.ninos.length) falta.push("travellers.children");
  // De qué país es cada uno. Si no lo ha dicho, lo más probable es el país del que sale; sin eso, no se supone.
  let pasaportes: string[] = [];
  if (r.pasaportes !== null) {
    pasaportes = r.pasaportes.map((p) => pais(p) ?? "");
    if (pasaportes.includes("")) falta.push("travellers.passports");
  } else if (paisDeSalida !== null) {
    supuesto.push("travellers.passports");
    pasaportes = Array.from({ length: adultos + r.ninos.length }, () => paisDeSalida);
  } else falta.push("travellers.passports");

  const frases = (lista: string[]): string[] =>
    [...new Set(lista.map((f) => enUnaLinea(f)).filter((f) => f !== ""))].slice(0, FRASES_DEL_VIAJERO);
  const entendido: Entendido = {
    language: r.idioma.trim().toLowerCase(),
    currency: (moneda ?? "").toUpperCase(),
    destination: {
      name: enUnaLinea(r.destino.nombre, LETRAS_DE_UN_NOMBRE),
      country: paisDelDestino ?? "",
      kind: r.destino.clase,
      centre: { lat: r.destino.centro.lat, lon: r.destino.centro.lon },
      box: r.destino.caja ?? cajaAlrededor(r.destino.centro, CAJA_DE_PARTIDA[r.destino.clase]),
      airport: null,
    },
    origin:
      r.origen === null
        ? null
        : { name: enUnaLinea(r.origen.nombre, LETRAS_DE_UN_NOMBRE), country: paisDeSalida ?? "", airport: null },
    dates: {
      check_in: r.entrada,
      check_out: r.salida,
      flexible: dicho(r.fechasMovibles, "dates.flexible", LO_MAS_PROBABLE.fechasMovibles),
    },
    travellers: { adults: adultos, children: edades, rooms: habitaciones, passports: pasaportes },
    budget: dicho(r.gasto, "budget", LO_MAS_PROBABLE.gasto),
    // Lo que tocó y, detrás, lo que escribió: hasta que lo lea el que escucha, sus palabras van aquí, tal cual.
    looking_for: frases([...r.buscas, r.libre]),
    pace: dicho(r.ritmo, "pace", LO_MAS_PROBABLE.ritmo),
    tastes: [],
    limits: [],
    booked: frases([r.reservado]),
  };
  if (r.destino.clase !== "city")
    entendido.moving = {
      several_places: r.moverse.variosSitios,
      leave_country: r.moverse.salirDelPais,
      how_much: r.moverse.cuanto,
    };
  return { entendido: falta.length === 0 ? entendido : null, supuesto, falta };
}
