// El alojamiento, a ratos (8.2), en datos: lo que el viajero puede pedir desde la ficha de un alojamiento (otra zona,
// otros mínimos, otro tope de gasto), a cuántos candidatos nuevos se mira como mucho en cada cambio, y lo que cabe en
// una pregunta suya sobre un alojamiento. Son de partida, y lo prudente: cuántos se miran y con qué tope es del PM.
// Ninguno lleva el nombre de un destino ni de un caso.

import { RADIO_MAXIMO } from "./cribas.ts";

/** Una lista de palabras, separadas por espacios, como palabras enteras y sin mirar mayúsculas; y lo que se añada. */
const palabras = (lista: string, ...ademas: string[]): RegExp =>
  new RegExp([...ademas, `(?<![\\p{L}])(?:${lista.split(" ").join("|")})(?![\\p{L}])`].join("|"), "iu");

/**
 * Cuántos candidatos nuevos (los que no se habían mirado en la versión de la que se parte) mira el que mira el
 * alojamiento, como mucho, en un cambio de alojamiento. Los demás finalistas nuevos se quedan sin mirar, y se dice.
 * Es lo más caro de El Dorado: de partida, dos. Es del PM.
 */
export const NUEVOS_QUE_SE_MIRAN = 2;

/**
 * La zona que se puede pedir: un centro y un radio. El radio, entre estos metros; el centro, a menos de estos metros
 * del centro del destino, para que la búsqueda siga siendo de ese viaje.
 */
export const ZONA_QUE_SE_PIDE = { radioMinimo: 300, radioMaximo: RADIO_MAXIMO, lejosDelDestino: 60_000 } as const;

/** Los radios que la web ofrece para una zona pedida, en metros. */
export const RADIOS_QUE_SE_OFRECEN = [500, 1000, 2000, 5000] as const;

/** Los mínimos que se pueden pedir: la nota, las opiniones y las estrellas, entre estos topes. */
export const MINIMOS_QUE_SE_PIDEN = { nota: [0, 10], opiniones: [0, 5000], estrellas: [0, 5] } as const;

/** Las respuestas que puede dar el que mira a una pregunta del viajero, por su clave. */
export const RESPUESTAS = ["yes", "no", "partly", "unknown"] as const;

/**
 * Lo que cabe en una pregunta del viajero sobre un alojamiento: una frase corta, en una línea. Y cuántas preguntas
 * puede hacer de un viaje en unas horas, porque cada una gasta una pasada del que mira.
 */
export const PREGUNTA = { letras: 200, deUnViaje: 10, horas: 24 } as const;

/** De qué es una pregunta, según el que contesta: de la habitación de ese precio o del resto del alojamiento. */
export const DE_QUE_ES = ["room", "lodging"] as const;

/**
 * Las palabras que hacen de una pregunta una de la habitación de ese precio (MI4): su cama, su baño, su vista, su
 * luz, su espacio. Con una de ellas, el que contesta no puede decir que es del alojamiento, ni probarla con una foto
 * del hotel, que puede ser de una habitación mejor. En inglés y en español; las demás lenguas, con lo que diga él.
 */
export const DE_LA_HABITACION_EN_PALABRAS = palabras(
  "rooms? bedrooms? beds? bathrooms? baths? showers? bathtubs? tubs? toilets? windows? balcon(?:y|ies) views? " +
    "habitaci[oó]n(?:es)? dormitorios? cuartos? camas? baños? duchas? bañeras? ventanas? balc[oó]n(?:es)? vistas?",
);

/**
 * Lo que habla de dinero en la frase de una respuesta: el que mira no ve el precio (su contrato), así que si su frase
 * habla de precios, de descuentos o de porcentajes, es que lo ha puesto él o se lo ha dictado la pregunta.
 */
export const DE_PRECIO_EN_UNA_RESPUESTA = palabras(
  "prices? priced costs? costing discounts? fees? charges? charged cheap(?:er|est)? expensive percent per\\s?cent " +
    "precios? cuesta[ns]? costes? costos? descuentos? tarifas? barat[oa]s? caros? por\\s?ciento porcentajes?",
  "%",
);

/** Las vueltas del que mira cuando la puerta le devuelve su respuesta: dos, como todos. */
export const VUELTAS_DE_LA_PREGUNTA = 2;

/** Cuántos cambios de alojamiento se pueden pedir de un viaje en unas horas: cada uno puede gastar. */
export const CAMBIOS_DE_ALOJAMIENTO = { deUnViaje: 10, horas: 24 } as const;
