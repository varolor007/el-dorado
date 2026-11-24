// La forma de lo que deja cada paso de la investigación. Lo que entrega un asiento lleva sus campos en inglés, como
// su contrato; lo que hace el código y le da a un asiento como material, también, porque lo lee un asiento. Aquí no
// hay cuentas: solo la forma, para que cada paso sepa qué recibe y qué deja. La de la búsqueda de alojamiento está en
// `busqueda_alojamiento.ts`, y la del viaje para la web, en `output/viaje.ts`.

import type { Punto, Ritmo } from "../output/viaje.ts";

export const SIN_SABER = "unknown";

/** Una caja del mapa, como la lee un asiento. */
export type Caja = { west: number; south: number; east: number; north: number };

// 1. Lo que he entendido del viaje: los toques del viajero y lo que el que escucha sacó de sus palabras.

export const PESOS_DE_GUSTO = ["must", "like", "indifferent"] as const;
/** Un gusto: una cosa de las que se pueden cruzar, lo que pesa para el viajero y sus palabras, letra a letra. */
export type Gusto = { thing: string; weight: (typeof PESOS_DE_GUSTO)[number]; quote: string };
/** Un límite: lo que no puede pasar, con sus palabras. */
export type Limite = { what: string; quote: string };

export const CLASES_DE_DESTINO = ["city", "region", "country"] as const;
export const GASTOS = ["tight", "medium", "comfortable"] as const;

export type Entendido = {
  /** El idioma del viajero, en dos letras: en él se escribe lo que lee. */
  language: string;
  /** La moneda en la que el viajero ve los precios, con sus tres letras. Es suya: no hay una de partida. */
  currency: string;
  destination: {
    name: string;
    country: string;
    kind: (typeof CLASES_DE_DESTINO)[number];
    centre: Punto;
    box: Caja;
    /** El aeropuerto por el que se llega, si se sabe. */
    airport: string | null;
  };
  /** De dónde sale. Sin él no hay transporte que buscar. */
  origin: { name: string; country: string; airport: string | null } | null;
  dates: { check_in: string; check_out: string; flexible: boolean };
  travellers: { adults: number; children: number[]; passports: string[] };
  budget: (typeof GASTOS)[number];
  /** Lo que busca, con sus palabras o de los toques: «comer bien», «ver lo imprescindible». */
  looking_for: string[];
  pace: Ritmo;
  tastes: Gusto[];
  limits: Limite[];
  /** Lo que ya tiene reservado, con sus palabras. */
  booked: string[];
};

// 2. Los avisos de las fechas y la tabla de los papeles. Sus asientos llegan con el bloque 5; aquí, su forma.

export const CLASES_DE_AVISO = ["blocks", "raises", "bothers", "favours"] as const;
export type Aviso = {
  kind: (typeof CLASES_DE_AVISO)[number];
  what: string;
  from: string;
  to: string;
  source: string;
  seen: string;
};

export const ESTADOS_DE_PAPEL = ["in_order", "to_do", "warning", "blocks", "doubtful"] as const;
/** Una casilla de la tabla de los papeles: un viajero, un país y una pregunta de la lista fija. */
export type Papel = {
  passport: string;
  country: string;
  question: string;
  status: (typeof ESTADOS_DE_PAPEL)[number];
  says: string;
  sources: { url: string; seen: string }[];
  /** El plazo, si lo hay: lo calcula el código. */
  deadline: string | null;
};

// 3. La ruta: dónde se duerme cada noche, por dónde se entra y se sale y en qué zonas buscar.

export const FORMAS_DE_VIAJE = ["single_base", "base_with_day_trips", "route"] as const;

/** Un sitio de los datos abiertos, como se le da a un asiento: qué es, dónde está y cuánto se habla de él. */
export type Lugar = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  /** En cuántos idiomas tiene artículo: cuánto se habla de él. */
  popularity: number;
  about: string;
  source: string;
};

/** Una zona donde buscar alojamiento. Su centro no lo pone el asiento: es el de uno a tres sitios de los datos. */
export type ZonaDeRuta = { id: string; name: string; anchors: string[]; radius_m: number; near: string[]; why: string };

export type EntregaDeRuta = {
  seat: "route-planner";
  shape: (typeof FORMAS_DE_VIAJE)[number];
  bases: { id: string; name: string; nights: number; why: string; zones: ZonaDeRuta[] }[];
  transfers: { from: string; to: string; minutes: number | string; by: string; source: string }[];
  entry: { base: string; why: string };
  exit: { base: string; why: string };
  /** Lo imprescindible del viajero: dónde queda cubierto, o por qué no. */
  musts: { what: string; covered: boolean; where_or_why: string }[];
  left_out: { what: string; why: string }[];
  unknowns: string[];
};

/** La ruta, ya con sus cuentas: el centro de cada zona y lo que se anda desde él hasta lo que nombra. */
export type ZonaResuelta = {
  id: string;
  base: string;
  /** Cómo la llama el asiento, en inglés: es de dentro. */
  name: string;
  /**
   * Cómo se le dice al viajero y a otras fuentes: los nombres de sus anclas, que salen de los datos y vienen en su
   * idioma. Lo que escribe un asiento no viaja fuera ni se enseña sin pasar por aquí.
   */
  label: string;
  centre: Punto;
  radius_m: number;
  why: string;
  near: { id: string; name: string; walk_minutes: number }[];
};
export type Ruta = { entrega: EntregaDeRuta; zonas: ZonaResuelta[] };

// 4. La ficha de cómo es un alojamiento: lo que entrega el que mira.

export type Prueba = { kind: string; ref: string; what: string };
export type Nivel = { level: string; evidence: Prueba[]; note: string };
export type EntregaDeMirar = {
  seat: "lodging-viewer";
  lodging_id: string;
  room_id: string;
  photos: { file: string; shows: string; seen: string[] }[];
  fields: Record<string, Nivel>;
  review_themes: { theme: string; tone: string; mentions: string; says: string; refs: string[] }[];
  conflicts: { what: string; refs: string[] }[];
  warnings: { what: string; label: string; refs: string[] }[];
  /** Las quejas graves que confirma leyendo las opiniones. Las entregas de antes del 24-nov no lo llevan. */
  serious?: { kind: string; mentions: string; refs: string[] }[];
  unknowns: string[];
  summary_good: string;
  summary_bad: string;
};

// 5. Los sitios que merecen el tiempo del viajero: lo que entrega el del día a día. Repartirlos por días es código.

export const MOMENTOS_DEL_DIA = ["morning", "afternoon", "evening", "any"] as const;
export type SitioElegido = {
  id: string;
  /** Por qué ir, para el viajero y en su idioma. */
  why: string;
  minutes: number;
  best_time: (typeof MOMENTOS_DEL_DIA)[number];
  book_ahead: "yes" | "no" | "unknown";
  must: boolean;
};
export type EntregaDeSitios = {
  seat: "sights-picker";
  /** Por orden de importancia para este viajero. */
  go: SitioElegido[];
  skip: { id: string; why: string }[];
  /** Lo que echa en falta y no está en los datos: no entra en el viaje hasta que una fuente lo traiga. */
  missing: { what: string; why: string }[];
  unknowns: string[];
};

// 6. La tabla del cruce: el viaje completo, fila a fila, con sus sumas. La hace el código y la lee el que cruza.

export type FilaDelCruce = {
  id: string;
  lodging: string;
  lodging_label: string;
  zone: string | null;
  transport: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  lodging_total: number;
  transport_total: number | null;
  total: number;
  currency: string;
  /** La nota de 0 a 10, o «unknown» si no hay con qué ponerla. */
  score: number | string;
  /** Las partes de la nota que no tienen dato: no bajan la nota, se dicen. */
  unconfirmed: string[];
  /** La mitad de las paradas del viaje queda a estos minutos andando, o menos. */
  walk_minutes: number | string;
  cancellable: boolean | string;
  /** Lo que saca el código: la más barata que pasa de la nota mínima y la mejor por lo que cuesta. */
  marks: string[];
  /** Si una criba lo descarta, por qué. Vacío si sigue. */
  discarded: string;
};

export const ESTADOS_DE_PALANCA = ["priced", "no_price", "not_asked"] as const;
/** Una palanca probada: un cambio sobre una fila, con lo que cuesta así y lo que ahorra. La resta es del código. */
export type FilaDePalanca = {
  id: string;
  lever: string;
  base_row: string;
  /** Lo que cambia, en datos: los días, el alojamiento o la zona. */
  change: Record<string, string | number>;
  status: (typeof ESTADOS_DE_PALANCA)[number];
  total: number | string;
  /** Positivo si ahorra; negativo si sale más caro. */
  saves: number | string;
  walk_minutes_change: number | string;
  score: number | string;
  note: string;
};

export type Tabla = {
  currency: string;
  minimum_score: number;
  round: number;
  rows: FilaDelCruce[];
  levers: FilaDePalanca[];
  /** Lo que el código no pudo pedir, con su motivo. */
  notes: string[];
};

// 7. Las tres maneras: lo que entrega el que cruza, y lo que escribe el que explica.

export const ESTADOS_EN_EL_CRUCE = ["tested", "discarded", "not_available"] as const;
export type Peticion = { lever: string; row: string; days?: number; nights?: number };
export type EntregaDeCruce = {
  seat: "trip-crosser";
  /** Cada palanca de la lista fija, con lo que pasó con ella. */
  levers: { lever: string; status: (typeof ESTADOS_EN_EL_CRUCE)[number]; rows: string[]; reason: string }[];
  ways: {
    cheapest: { row: string; total: number };
    best_value: { row: string; total: number };
    different: { row: string; total: number; lever: string; why: string } | string;
  };
  /** Las palancas que merece la pena contarle al viajero, por su fila. */
  tell: { lever_row: string; saves: number; why: string }[];
  /** Lo que la tabla no ve, mirado. */
  checks: { what: string; status: "ok" | "problem" | "unknown"; refs: string[] }[];
  /** Lo que le pide al código para otra ronda. Vacío en la segunda. */
  requests: Peticion[];
  unknowns: string[];
};

export type EntregaDeExplicar = {
  seat: "trip-explainer";
  language: string;
  ways: { id: string; why: string; gains: string; loses: string }[];
  levers: { lever_row: string; what: string; in_exchange: string }[];
  /** Lo que no se sabe o está sin confirmar, dicho al viajero. */
  unknowns: string[];
};
