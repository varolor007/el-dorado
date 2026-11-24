// Los topes de lo que se entiende de un viaje: hasta dónde llega un dato del viajero antes de que la casa lo dé por
// malo. Son anchos a propósito: no dicen qué viaje se puede hacer, sino qué no puede ser un viaje.

/** Las noches que puede durar un viaje. Más allá, la fecha de salida está mal escrita. */
export const NOCHES_DE_UN_VIAJE = 90;

/** Los que pueden viajar juntos: adultos y niños. */
export const VIAJEROS = { adultos: 12, ninos: 8, edadDeNino: 17 };

/** Lo más que mide una frase del viajero (lo que busca, un gusto, un límite), y cuántas puede haber de cada clase. */
export const FRASE_DEL_VIAJERO = 300;
export const FRASES_DEL_VIAJERO = 30;

/**
 * Los estados de un viaje, como los dice la hoja: empezado, confirmado, investigando, en el mapa y cerrado. Y a
 * cuáles se pasa desde cada uno: un cambio vuelve a investigar un viaje que ya está en el mapa, o cerrado, y un run
 * parado se puede volver a lanzar.
 */
export const ESTADOS_DEL_VIAJE = ["started", "confirmed", "researching", "on_map", "closed"] as const;
export type EstadoDelViaje = (typeof ESTADOS_DEL_VIAJE)[number];
export const SE_PASA_A: Record<EstadoDelViaje, readonly EstadoDelViaje[]> = {
  started: ["confirmed"],
  confirmed: ["researching"],
  researching: ["researching", "on_map"],
  on_map: ["researching", "closed"],
  closed: ["researching"],
};

/** Las preguntas de más que puede hacer el que escucha, como dice la hoja, y lo más que mide cada una. */
export const PREGUNTAS_DE_MAS = 3;
export const LARGO_DE_UNA_PREGUNTA = 200;
/** Con qué signo se pregunta, en cualquier escritura: el de siempre, el ancho, el árabe, el griego y el armenio. */
export const SIGNO_DE_PREGUNTA = /[?\uff1f\u061f\u037e;\u055e]/u;
/** Lo más que mide lo que un asiento dice de un dato suyo en una línea (su `what`), como dicen sus contratos. */
export const LO_QUE_DICE_DE_UN_DATO = 200;
