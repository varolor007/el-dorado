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

/**
 * Los idiomas que tienen sus listas de palabras en las puertas 11 y 12 (lo de un restaurante, lo de una opinión, lo
 * de decir qué es lo mejor, los canales): inglés y español. Con un viajero de otro idioma, ninguna frase de esas capas
 * llega a la pantalla ni a la guía, porque no ha pasado una puerta de palabras: llegan sus datos, y la web dice que esa
 * explicación todavía no está en su idioma (como la guía: el PM, 25-nov).
 */
export const IDIOMAS_CON_SUS_LISTAS = ["en", "es"] as const;
export const tieneSusListas = (idioma: string): boolean =>
  (IDIOMAS_CON_SUS_LISTAS as readonly string[]).includes(idioma);

/**
 * Las palabras de un canal, en cualquier clase: por dónde se habla con alguien (la mensajería, llamar o escribir a
 * alguien), en inglés, en español y los nombres de las aplicaciones. Una cosa del destino no manda al viajero a hablar
 * con nadie: el número de urgencias se dice como un número, sin «llama». El móvil y sus tarifas sí se pueden decir.
 */
export const DE_UN_CANAL =
  "whats ?app|telegram|wechat|viber|signal app|messenger|imessage|direct messages?|dms?|" +
  "(?:text|message|call|ring|phone|e-?mail|contact|reach|dm) (?:them|him|her|us|ahead)|message (?:on|via)|" +
  "(?:call|dial|text|ring) \\+?\\d+|write to|get in touch|" +
  "mensajer[ií]a|manda\\p{L}* (?:un )?(?:mensaje|whats ?app)|escr[ií]b\\p{L}* (?:a|al)|" +
  "llam(?:a|e|en|ar|ad|ando) (?:a|al|por)|contact[aá]\\p{L}*|ponte en contacto";

/**
 * Las maneras de escribir una dirección con palabras: «sitio dot com», «punto es», «slash», «arroba», un acortador
 * de direcciones. En cualquier clase: es una dirección aunque no lleve sus puntos.
 */
export const DE_UNA_DIRECCION_DICHA =
  "dot (?:com|net|org|info|io|co|es|eu|de|fr|it|uk)|punto (?:com|net|org|es|eu|info)|slash|backslash|" +
  "barra (?:inclinada|diagonal)|arroba|at sign|tinyurl|bit ?ly|goo ?gl|is ?gd|ow ?ly|cutt ?ly|rebrand ?ly|" +
  "(?:com|net|org) (?:slash|barra)|w ?w ?w";

/**
 * Lo de un negocio con nombre, en lo que conviene evitar y en lo práctico: una palabra de negocio pegada a un nombre
 * propio («Juan's Taxis», «Taxis Juan», «Tours García»), o reservar con alguien por su nombre («book with Marta»). Lo
 * más prudente: en esas dos clases no se nombra a nadie que venda algo, ni para bien ni para mal.
 */
export const DE_UN_NEGOCIO =
  "taxis?|cabs?|tours?|travel|transfers?|shuttles?|rentals?|hire|agency|agencies|shops?|stores?|company|companies|" +
  "co|ltd|inc|llc|hostels?|hotels?|guesthouses?|apartments?|excursions?|excursiones|viajes|alquiler(?:es)?|" +
  "traslados?|agencias?|tiendas?|empresas?|s\\.?l\\.?|s\\.?a\\.?";
/** Reservar, comprar o contratar con alguien, por su nombre. */
export const CON_ALGUIEN =
  "book(?:ing)? (?:with|through|via|from)|buy (?:from|at)|ask for|reserv\\p{L}* (?:con|en|a trav[eé]s de)|" +
  "compr\\p{L}* (?:en|a)|pregunt\\p{L}* por|contrat\\p{L}* (?:con|a)";

/** Las clases donde no se nombra ningún negocio: lo que conviene evitar y lo práctico. */
export const CLASES_SIN_NEGOCIOS: readonly ClaseDelDestino[] = ["avoid", "practical"];
