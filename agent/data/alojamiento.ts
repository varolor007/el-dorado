// El alojamiento, a ratos (8.2), en datos: lo que el viajero puede pedir desde la ficha de un alojamiento (otra zona,
// otros mínimos, otro tope de gasto), a cuántos candidatos nuevos se mira como mucho en cada cambio, y lo que cabe en
// una pregunta suya sobre un alojamiento. Son de partida, y lo prudente: cuántos se miran y con qué tope es del PM.
// Ninguno lleva el nombre de un destino ni de un caso.

import { RADIO_MAXIMO } from "./cribas.ts";

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

/** Las vueltas del que mira cuando la puerta le devuelve su respuesta: dos, como todos. */
export const VUELTAS_DE_LA_PREGUNTA = 2;

/** Cuántos cambios de alojamiento se pueden pedir de un viaje en unas horas: cada uno puede gastar. */
export const CAMBIOS_DE_ALOJAMIENTO = { deUnViaje: 10, horas: 24 } as const;
