// El que conoce el destino (14.3), en datos: las clases de lo que dice, con su tope por clase (la caja de la hoja:
// cómo es cada barrio, los horarios de allí, el dinero, lo práctico, lo que conviene evitar y dónde se come), lo largo
// de cada cosa y lo que puede salir a internet. Son de partida y generales: los ajusta su sesión y el PM.

/**
 * Las clases de lo que dice, y cuántas cosas caben en cada una: cómo es un barrio de la ruta, un horario de allí (a
 * qué hora se come, qué cierra), el dinero (la moneda, la tarjeta, la propina), lo práctico (el enchufe, el agua, el
 * móvil, las urgencias), lo que conviene evitar, una zona donde comer, un mercado, un plato del sitio y lo que suele
 * costar una comida. Ningún restaurante con nombre.
 */
export const TOPE_POR_CLASE = {
  neighbourhood: 3,
  hours: 3,
  money: 3,
  practical: 4,
  avoid: 3,
  food_area: 3,
  market: 3,
  dish: 4,
  meal_cost: 2,
} as const;
export const CLASES_DEL_DESTINO = Object.keys(TOPE_POR_CLASE) as (keyof typeof TOPE_POR_CLASE)[];
export type ClaseDelDestino = keyof typeof TOPE_POR_CLASE;

/** Lo más largo de cada cosa, en letras: una frase corta, que pasa una puerta de palabras antes de la pantalla. */
export const LETRAS_DE_UNA_COSA = 160;

/** Lo que puede salir a internet, de partida (es del PM). */
export const TOPES_DEL_DESTINO = { busquedas: 10, paginas: 16 };

// Lo que añade la puerta 12 (14.3). Generales: ninguno lleva el nombre de un destino.

/** Cuántas cosas, como mucho, en total: pocas, las que cambian el viaje. Menos que la suma de los topes por clase. */
export const LO_MAS_DE_COSAS = 16;

/** Cuántas cifras puede llevar una cosa, aparte de lo que cuesta: una hora, un voltaje, un número de urgencias. */
export const CIFRAS_DE_UNA_COSA = 6;

/** Las clases que hablan de un sitio de la ruta: van atadas a una de sus zonas, por su id. */
export const CLASES_CON_ZONA: readonly ClaseDelDestino[] = ["neighbourhood", "food_area", "market"];

/** Las clases de comer: las que pueden decir lo que cuesta, y donde no caben ni restaurantes ni opiniones. */
export const CLASES_DE_COMER: readonly ClaseDelDestino[] = ["food_area", "market", "dish", "meal_cost"];

/** La clase que dice lo que suele costar una comida: siempre con su horquilla y su moneda, que usa el presupuesto. */
export const CLASE_DEL_PRECIO: ClaseDelDestino = "meal_cost";

/**
 * Lo lejos que puede estar el sitio de una cosa del centro de su zona, en veces su radio: un mercado «de la zona»
 * puede estar en su borde, no en otra parte de la ciudad.
 */
export const VECES_EL_RADIO = 1.5;

/**
 * Las palabras de un sitio donde se come con su nombre (un restaurante, una taberna, un café), en inglés, en español
 * y las que se usan igual en muchos idiomas. Lo que la puerta puede medir: que el nombre de una cosa de comer no sea
 * uno de ellos, y que su frase no nombre uno («the restaurant Casa X»). Que un nombre propio a secas no sea un
 * restaurante no lo puede saber el código: lo dice el contrato (RL4).
 */
export const DE_UN_RESTAURANTE =
  "restaurants?|restaurantes?|ristorante|bistrot?s?|brasseries?|trattorias?|osterias?|tavernas?|tabernas?|taverns?|" +
  "eatery|eateries|diners?|caf[eé]s?|cafeter[ií]as?|pubs?|bars?|cantinas?|mes[oó]n|marisquer[ií]as?|pizzer[ií]as?|" +
  "steakhouses?|izakayas?|chiringuitos?|asadores?|parrillas?|tasca|tascas|bodegón|gastrobar";

/**
 * Las palabras de una opinión o de una nota (las estrellas, las reseñas, las guías que puntúan), en inglés y en
 * español. Lo de comer no las lleva: no hay de dónde saber si un sitio es bueno hoy.
 */
export const DE_UNA_OPINION =
  "rated|rating|ratings|reviews?|reviewed|stars?|michelin|tripadvisor|yelp|top[- ]rated|award[- ]winning|" +
  "reseñas?|opiniones|valorad[oa]s?|valoraci[oó]n|puntuaci[oó]n|estrellas?|premiad[oa]s?";
