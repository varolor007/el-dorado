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
  | "getting_around"
  | "local_knowledge"
  | "tickets"
  | "budget"
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
  // Las capas del destino (bloque 14). El de moverse y el que conoce el destino leen la ruta y sus zonas; el de las
  // entradas, los sitios elegidos. El presupuesto, lo que suma: el viaje montado y las tres capas.
  getting_around: ["route"],
  local_knowledge: ["route"],
  tickets: ["sights", "pick"],
  budget: ["search", "table", "cross", "days", "getting_around", "local_knowledge", "tickets"],
  // Los días se reparten desde el centro del destino, con lo que eligió el del día a día. La tabla de caminos se pidió
  // también desde los alojamientos de la búsqueda: si cambian, lo que no está en ella se mide con la cuenta de la
  // casa, como siempre. Así, un viajero más no toca los días («qué no: los días y los avisos», dice la hoja). Y
  // esperan a las entradas, para no poner un sitio el día que cierra.
  days: ["sights", "pick", "tickets"],
  // La tabla lee las paradas que eligió el del día a día (las mide desde cada alojamiento), no cómo caen en los días.
  table: ["route", "search", "look", "pick"],
  cross: ["route", "table"],
  explain: ["route", "look", "table", "cross", "calendar"],
  trip: [
    "sights",
    "route",
    "search",
    "papers",
    "look",
    "pick",
    "days",
    "table",
    "cross",
    "explain",
    "calendar",
    "getting_around",
    "local_knowledge",
    "tickets",
    "budget",
  ],
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
  "moving",
  "limits",
  "booked",
  "other",
  "lodging",
  "transport",
  "day",
  "flight",
  "new_country",
  "tickets",
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
  // Las capas del destino (bloque 14): cómo moverse allí, lo que conviene saber, las entradas y el presupuesto entero.
  "getting_around",
  "local_knowledge",
  "tickets",
  "budget",
] as const;
export type PiezaDelViaje = (typeof PIEZAS_DEL_VIAJE)[number];

/**
 * Lo que tira cada clase de cambio: los pasos que leen esa parte (y, por `LEE`, todo lo que sale de ellos), y los
 * que puede tirar según lo que salga (`quizas`: no se rehacen solos; lo dice el impacto, y lo decide quien lo lleva).
 * La hoja da los ejemplos: unas fechas nuevas tiran todos los precios y pueden tirar los avisos; un viajero más
 * cambia la habitación y el precio; un gusto nuevo, solo el alojamiento. La ruta y los sitios reciben las fechas
 * con su día de la semana: unas fechas nuevas los rehacen («unas fechas nuevas rehacen casi todo», dice la hoja).
 *
 * Las capas del destino (bloque 14), con lo más prudente: otro destino, otras fechas u otra ruta lo rehacen todo (por
 * la ruta, que leen las tres); otras fechas, además, los horarios y los precios de las entradas, por los sitios
 * elegidos. Un viajero más, solo la cuenta del presupuesto, que es código: las entradas ya traen el precio por edad
 * (la hoja: «con un viajero más no hace falta»). Lo que busca el viajero toca al que conoce el destino, que lo lee
 * (solo lo de la lista fija). Lo demás les llega por `LEE`.
 */
export const CAMBIOS: Record<ClaseDeCambio, { pasos: IdDePaso[]; quizas: IdDePaso[] }> = {
  destination: {
    pasos: ["sights", "route", "search", "papers", "calendar", "pick", "getting_around", "local_knowledge", "tickets"],
    quizas: [],
  },
  origin: { pasos: ["search", "papers", "calendar"], quizas: [] },
  dates: { pasos: ["sights", "route", "search", "papers", "calendar", "pick", "tickets"], quizas: [] },
  // Un viajero más, o uno menos: la habitación y el precio («un viajero más cambia la habitación y el precio», dice
  // la hoja). Los papeles solo si cambian sus filas, que es la clase «passports» (`clasesDelCambio`).
  travellers: { pasos: ["search", "budget"], quizas: [] },
  rooms: { pasos: ["search", "budget"], quizas: [] },
  passports: { pasos: ["search", "papers"], quizas: [] },
  budget: { pasos: ["table"], quizas: [] },
  currency: { pasos: ["search"], quizas: [] },
  // Otro idioma no se alcanza: la casa no lo ofrece y lo rechaza (`cambioQueNoVale`, en `agent/scripts/cambios.ts`).
  // Si algún día se ofrece, casi todo lo que escribe para el viajero va en él (el porqué de cada parada, lo que dice
  // el que mira, lo que explica, lo de allí, los avisos de las fechas): se rehace entero, como lo que no se sabe leer.
  language: {
    pasos: ["sights", "route", "search", "papers", "calendar", "pick", "getting_around", "local_knowledge", "tickets"],
    quizas: [],
  },
  pace: { pasos: ["days"], quizas: [] },
  // Un gusto de una cosa del alojamiento (`agent/data/gustos.ts`) solo cambia cómo se cruza la ficha de cada uno.
  lodging_taste: { pasos: ["table"], quizas: [] },
  taste: { pasos: ["route", "pick"], quizas: [] },
  // Lo que buscas lo leen la ruta y el del día a día, enteros; y el que conoce el destino y el del calendario, solo lo
  // de la lista fija (`loQueSeBusca`), que también puede cambiar.
  looking_for: { pasos: ["route", "pick", "calendar", "local_knowledge"], quizas: [] },
  // Ver más de un sitio y cuánto moverse los lee la ruta; lo de después sale de ella. Los sitios y los papeles no
  // cambian: es el mismo destino (salir o no del país va como destino, porque cambia los sitios).
  moving: { pasos: ["route", "search", "pick", "getting_around", "local_knowledge", "tickets"], quizas: [] },
  limits: { pasos: ["route", "pick", "table"], quizas: [] },
  booked: { pasos: ["route", "pick", "search", "table"], quizas: [] },
  // Lo que no se sabe leer se rehace entero: es lo más prudente.
  other: {
    pasos: ["sights", "route", "search", "papers", "calendar", "pick", "getting_around", "local_knowledge", "tickets"],
    quizas: [],
  },
  // Otro alojamiento: la búsqueda otra vez, y mirar al candidato nuevo.
  lodging: { pasos: ["search", "look"], quizas: [] },
  // Otro transporte: la búsqueda otra vez; los papeles, si hay otra escala.
  transport: { pasos: ["search"], quizas: ["papers"] },
  // Un día con un mensaje tuyo: el del día a día otra vez; los sitios, si pides uno que no estaba.
  day: { pasos: ["pick"], quizas: ["sights"] },
  // Otro vuelo en los mismos días (8.3): la tabla con él, y el que cruza otra vez; lo demás se queda. En otros días
  // cambian las noches, y eso es un cambio de las fechas («dates»), con su búsqueda del alojamiento para las nuevas.
  flight: { pasos: ["table"], quizas: ["papers"] },
  // Un aeropuerto del transporte en un país que no estaba en la tabla de los papeles (8.3): la tabla, otra vez, con él.
  new_country: { pasos: ["papers"], quizas: [] },
  // Mirar las entradas de unos sitios que no se miraron, con tu botón (14.7): el de las entradas, solo para ellos; lo
  // demás de las entradas se queda como estaba. Los días se vuelven a repartir con sus horarios, y la cuenta.
  tickets: { pasos: ["tickets"], quizas: [] },
};

/**
 * Los pasos que pueden decir en sus frases cifras del presupuesto entero (14.7): el que cruza y el que explica. No lo
 * leen para decidir (no está en su `LEE`), pero lo tienen delante y su puerta mira esas cifras con él. Si un cambio
 * rehace el presupuesto y los conserva, lo que dijeron se vuelve a pasar por su puerta con la cuenta nueva, y el que
 * no pasa se rehace: por eso el impacto los pone entre los que quizá se rehacen (`maybe`), y cuenta lo que costarían.
 */
export const DICEN_EL_PRESUPUESTO: readonly IdDePaso[] = ["cross", "explain"];

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
  getting_around: ["getting_around", "budget"],
  local_knowledge: ["local_knowledge"],
  tickets: ["tickets", "budget"],
  budget: ["budget"],
  trip: ["guide"],
};

/**
 * Las piezas que deja de valer una clase de cambio cuando son menos que las que salen de sus pasos: los pasos que
 * rehace sirven a más de una pieza (la búsqueda da dónde duermes, cómo llegas y todos los precios; la tabla, dónde
 * duermes y las maneras), pero el cambio solo toca una. Otro vuelo en los mismos días cambia cómo llegas, y con ello
 * las maneras y la guía; no dónde duermes. Otro alojamiento cambia dónde duermes, las maneras y la guía; no cómo
 * llegas ni los demás precios. Las clases que no están aquí tiran las piezas de sus pasos.
 */
export const PIEZAS_DE_UNA_CLASE: Partial<Record<ClaseDeCambio, PiezaDelViaje[]>> = {
  flight: ["transport", "ways", "guide", "budget"],
  lodging: ["lodging", "ways", "guide", "budget"],
  tickets: ["tickets", "days", "budget", "guide"],
};

/**
 * Las clases de cambio que vuelven a mirar las entradas de todos los sitios: las que las nombran en `CAMBIOS` (otro
 * destino, otras fechas, lo que no se sabe leer). Con las demás, si las entradas se rehacen porque cambian los sitios
 * elegidos, las de antes siguen valiendo y no se vuelven a pagar: un sitio nuevo va con lo que dicen los datos
 * abiertos, hasta que lo pidas con tu botón (la clase «tickets»). Lo mira `entradasQueSeMiran`, en `impacto.ts`.
 */
export const MIRAN_TODAS_LAS_ENTRADAS: readonly ClaseDeCambio[] = ["destination", "dates", "other"];

/**
 * Lo que deja cada paso en su run, además de los puestos de su asiento (los que llevan su contrato en el sello). Es
 * lo que se copia al run nuevo cuando el paso sigue valiendo. Una carpeta acaba en `/`.
 */
export const LO_QUE_DEJA: Record<IdDePaso, string[]> = {
  understood: ["escuchado.json", "escucha-1.json", "escucha-2.json", "respuestas.json", "confirmado.json"],
  // El carrusel sale de los sitios (el PM, 26-nov): va con ellos.
  sights: ["sitios.json", "carrusel.json"],
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
  getting_around: ["moverse.json"],
  local_knowledge: ["saber.json"],
  tickets: ["entradas.json", "abiertos.json"],
  budget: ["presupuesto.json"],
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

/**
 * Los cambios de lo que pediste (8.5) que se pueden lanzar de un viaje en esas horas, de partida y prudentes, como
 * los cierres: cada uno vuelve a lanzar asientos. Es del PM (cuántos cambios y con qué tope); hasta que lo diga, este.
 * Por encima siguen los topes de versiones y de investigaciones de un viaje (`TOPES_DE_UN_VIAJE`).
 */
export const TOPE_DE_CAMBIOS = { horas: 24, deUnViaje: 6 };
