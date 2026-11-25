// Lo que la casa sabe de usar el viaje a ratos, en datos: qué lee cada paso de la investigación (para saber qué deja
// de valer cuando otro se rehace), qué pasos lee cada clase de cambio, qué piezas del viaje salen de cada paso, qué
// deja cada paso en su run (para quedarse con lo que sigue valiendo) y qué es una elección y qué un cambio. Son de
// partida y generales: ninguna lleva el nombre de un destino ni de un caso. Lo que pasa con ellas, en
// `agent/scripts/impacto.ts` y `agent/launcher/rehacer.ts`.

/** Los pasos de la investigación, por su id en `agent/data/pasos.ts`. */
export type IdDePaso =
  | "understood"
  | "sights"
  | "route"
  | "search"
  | "papers"
  | "look"
  | "pick"
  | "days"
  | "table"
  | "cross"
  | "explain"
  | "calendar"
  | "trip";

/**
 * Lo que lee cada paso de lo que dejan otros, sacado de lo que le da `agent/launcher/investigar.ts`: si uno de ellos
 * se rehace, este deja de valer. Lo entendido no va aquí: lo que lee cada paso de lo entendido va en `CAMBIOS`.
 */
export const LEE: Record<IdDePaso, IdDePaso[]> = {
  understood: [],
  sights: [],
  route: ["sights"],
  search: ["route"],
  papers: [],
  calendar: [],
  look: ["search"],
  pick: ["sights", "route"],
  // Los días se reparten desde el centro del destino, con lo que eligió el del día a día. La tabla de caminos se pidió
  // también desde los alojamientos de la búsqueda: si cambian, lo que no está en ella se mide con la cuenta de la
  // casa, como siempre. Así, un viajero más no toca los días («qué no: los días y los avisos», dice la hoja).
  days: ["sights", "pick"],
  // La tabla lee las paradas que eligió el del día a día (las mide desde cada alojamiento), no cómo caen en los días.
  table: ["route", "search", "look", "pick"],
  cross: ["route", "table"],
  explain: ["route", "look", "table", "cross", "calendar"],
  trip: ["sights", "route", "search", "papers", "look", "pick", "days", "table", "cross", "explain", "calendar"],
};

/**
 * Las clases de cambio. Las de lo entendido salen de comparar lo entendido de antes con el de después
 * (`clasesDelCambio`); las de una pieza las dice el momento que la cambia: otro alojamiento (8.2), otro transporte
 * (8.3) o un día con un mensaje tuyo (8.6).
 */
export const CLASES_DE_CAMBIO = [
  "destination",
  "origin",
  "dates",
  "travellers",
  "rooms",
  "passports",
  "budget",
  "currency",
  "language",
  "pace",
  "lodging_taste",
  "taste",
  "looking_for",
  "limits",
  "booked",
  "other",
  "lodging",
  "transport",
  "day",
] as const;
export type ClaseDeCambio = (typeof CLASES_DE_CAMBIO)[number];

/** Las piezas del viaje que puede tirar un cambio, por su clave para la web. */
export const PIEZAS_DEL_VIAJE = [
  "lodging",
  "transport",
  "days",
  "prices",
  "date_warnings",
  "papers",
  "ways",
  "guide",
] as const;
export type PiezaDelViaje = (typeof PIEZAS_DEL_VIAJE)[number];

/**
 * Lo que tira cada clase de cambio: los pasos que leen esa parte (y, por `LEE`, todo lo que sale de ellos), y los
 * que puede tirar según lo que salga (`quizas`: no se rehacen solos; lo dice el impacto, y lo decide quien lo lleva).
 * La hoja da los ejemplos: unas fechas nuevas tiran todos los precios y pueden tirar los avisos; un viajero más
 * cambia la habitación y el precio; un gusto nuevo, solo el alojamiento. La ruta y los sitios reciben las fechas
 * con su día de la semana: unas fechas nuevas los rehacen («unas fechas nuevas rehacen casi todo», dice la hoja).
 */
export const CAMBIOS: Record<ClaseDeCambio, { pasos: IdDePaso[]; quizas: IdDePaso[] }> = {
  destination: { pasos: ["sights", "route", "search", "papers", "calendar", "pick"], quizas: [] },
  origin: { pasos: ["search", "papers", "calendar"], quizas: [] },
  dates: { pasos: ["sights", "route", "search", "papers", "calendar", "pick"], quizas: [] },
  travellers: { pasos: ["search", "papers"], quizas: [] },
  rooms: { pasos: ["search"], quizas: [] },
  passports: { pasos: ["search", "papers"], quizas: [] },
  budget: { pasos: ["table"], quizas: [] },
  currency: { pasos: ["search"], quizas: [] },
  language: { pasos: ["explain"], quizas: [] },
  pace: { pasos: ["days"], quizas: [] },
  // Un gusto de una cosa del alojamiento (`agent/data/gustos.ts`) solo cambia cómo se cruza la ficha de cada uno.
  lodging_taste: { pasos: ["table"], quizas: [] },
  taste: { pasos: ["route", "pick"], quizas: [] },
  looking_for: { pasos: ["route", "pick"], quizas: [] },
  limits: { pasos: ["route", "pick", "table"], quizas: [] },
  booked: { pasos: ["route", "pick", "search", "table"], quizas: [] },
  // Lo que no se sabe leer se rehace entero: es lo más prudente.
  other: { pasos: ["sights", "route", "search", "papers", "calendar", "pick"], quizas: [] },
  // Otro alojamiento: la búsqueda otra vez, y mirar al candidato nuevo.
  lodging: { pasos: ["search", "look"], quizas: [] },
  // Otro transporte: la búsqueda otra vez; los papeles, si hay otra escala.
  transport: { pasos: ["search"], quizas: ["papers"] },
  // Un día con un mensaje tuyo: el del día a día otra vez; los sitios, si pides uno que no estaba.
  day: { pasos: ["pick"], quizas: ["sights"] },
};

/** Las piezas del viaje que salen de cada paso: si el paso se rehace, se quedan por rehacer. */
export const PIEZAS_DE_UN_PASO: Record<IdDePaso, PiezaDelViaje[]> = {
  understood: [],
  sights: ["days"],
  route: ["lodging", "days"],
  search: ["lodging", "transport", "prices"],
  papers: ["papers"],
  calendar: ["date_warnings"],
  look: ["lodging"],
  pick: ["days"],
  days: ["days"],
  table: ["lodging", "ways"],
  cross: ["ways"],
  explain: ["ways"],
  trip: ["guide"],
};

/**
 * Lo que deja cada paso en su run, además de los puestos de su asiento (los que llevan su contrato en el sello). Es
 * lo que se copia al run nuevo cuando el paso sigue valiendo. Una carpeta acaba en `/`.
 */
export const LO_QUE_DEJA: Record<IdDePaso, string[]> = {
  understood: ["escuchado.json", "escucha-1.json", "escucha-2.json", "respuestas.json", "confirmado.json"],
  sights: ["sitios.json"],
  route: ["ruta.json"],
  search: ["busqueda.json"],
  papers: ["papeles.json", "papeles-sigue.json"],
  calendar: ["calendario.json"],
  look: ["mirar.json", "como_es.json", "fotos/"],
  // La tabla de caminos se pide entre las paradas elegidas y los alojamientos: va con lo que eligió el del día a día.
  pick: ["caminos.json"],
  days: ["dias.json"],
  table: ["tabla-1.json", "tabla-2.json", "movidos.json"],
  cross: ["cruce-1.json", "cruce-2.json"],
  explain: ["explica.json"],
  trip: ["viaje.json", "sucesos.json"],
};

/**
 * Lo que la casa rehace junta aunque siga valiendo: mirar los alojamientos, elegir los sitios y repartir los días son
 * un solo tramo de `investigar.ts`, que se da mientras no estén los días. Si se rehace mirar o elegir, el reparto se
 * vuelve a contar (es código, sin IA, y con lo mismo sale lo mismo).
 */
export const SE_VUELVE_A_CONTAR: { paso: IdDePaso; si: IdDePaso[]; menos: string[] } = {
  paso: "days",
  si: ["look", "pick"],
  menos: ["dias.json"],
};

/**
 * Lo que es del run entero y no de un paso: no se copia nunca a un run que rehace. Cada run tiene su adelante, sus
 * trabajos (y con ellos su gasto), su parada, sus reintentos, su acta y lo que se contó en vivo.
 */
export const DEL_RUN = [
  "entendido.json",
  "adelante.json",
  "trabajos.json",
  "parado.json",
  "reintentos.json",
  "acta.json",
  "vivo.jsonl",
  "rehecho.json",
  "puestos/",
  "sellos/",
  "consultado/",
  "ordenes/",
];

/** Donde queda en un run que rehace de cuál viene, con qué cambio, y qué conservó y qué rehace. */
export const REHECHO = "rehecho.json";

/**
 * Qué es una elección y qué un cambio. Una elección escoge entre lo que ya está en la versión que se enseña: la
 * manera, el alojamiento o el transporte de los que trae, el ritmo y las paradas (quitar, añadir o mover de día), y
 * los gustos que marcas, antes de pedir que se rehaga nada. Se guarda encima, sin versión nueva, y no gasta. Un
 * cambio necesita rehacer un paso: deja una versión nueva, y la de antes se queda.
 */
export const ELECCIONES = ["way", "lodging", "transport", "pace", "removed", "added", "moved", "tastes"] as const;
export type Eleccion = (typeof ELECCIONES)[number];

/**
 * Lo más que se guarda de un viaje, de partida (es del PM): cuántas versiones caben y cuántos runs. Pasado el
 * tope, no se rehace: se dice, y se puede volver a una de antes.
 */
export const TOPES_DE_UN_VIAJE = { versiones: 20, runs: 30 };
