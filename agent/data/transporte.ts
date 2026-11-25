// La búsqueda de transporte, en datos: cuántos aeropuertos se miran, hasta dónde, cuántos pares y cuántos días de
// alrededor. Son de partida: se ajustan con casos reales, en el ensayo. Ninguna regla lleva el nombre de un sitio.

/** De cuántos sitios con vuelos se sale, y a cuántos se llega, como mucho. Un sitio es una ciudad de la fuente. */
export const LUGARES_DE_SALIDA = 2;
export const LUGARES_DE_LLEGADA = { city: 2, region: 3, country: 3 } as const;

/** Cuántos pares de salida y llegada se piden, como mucho: el tope de la parrilla. */
export const PARES = 6;

/**
 * Hasta dónde se busca un aeropuerto alrededor de un punto, en kilómetros en línea recta. Más lejos solo se mira si
 * no hay ninguno, y entonces es el más cercano con vuelos, y se dice a cuánto está.
 */
export const KILOMETROS_ALREDEDOR = 150;

/**
 * Cuántos días antes y después de la ida y de la vuelta se miran, siempre, también con fechas fijas: lo de al lado
 * se ofrece, y el transporte del viaje sigue siendo el de sus fechas (el PM, 24-nov). La semana de la fuente los da
 * en una sola petición por par.
 */
export const DIAS_ALREDEDOR = 3;

/** Cuántas escalas por trayecto, como mucho: directo o con una. Lo que lleva más no entra en la parrilla. */
export const ESCALAS_MAXIMAS = 1;

/** Cuántas peticiones de precios hace un viaje, como mucho: una por par para sus fechas y otra para los de al lado. */
export const PETICIONES_DE_TRANSPORTE = PARES * 2;

/** El redondeo del punto del que sale el viajero, en decimales de grado: uno es unos once kilómetros. */
export const DECIMALES_DEL_ORIGEN = 1;

// El transporte, a ratos (8.3): buscarlo otra vez, movido a donde pide el viajero. Son de partida, como lo de arriba.

/** Cuántos días se puede mover la ida o la vuelta al buscar otra vez: la parrilla mira además los suyos alrededor. */
export const DIAS_QUE_SE_MUEVE_UN_VUELO = DIAS_ALREDEDOR;

/**
 * Los horarios que se pueden pedir, por la hora de salida en la hora del sitio de donde sale: desde y hasta (sin
 * llegar a ella). «Sin madrugar» es salir de las nueve en adelante.
 */
export const HORARIOS = {
  any: [0, 24],
  not_early: [9, 24],
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24],
} as const satisfies Record<string, readonly [number, number]>;
export type Horario = keyof typeof HORARIOS;

/** Cuántas opciones se enseñan de una búsqueda, las más baratas primero. */
export const OPCIONES_QUE_SE_ENSENAN = 12;

/** Cuántas veces se puede buscar otra vez el transporte de un viaje, en tantas horas: cada una pide a la fuente. */
export const BUSQUEDAS_DE_TRANSPORTE = { deUnViaje: 12, horas: 24 };

/**
 * Cuántas veces se puede elegir otro transporte de un viaje, en tantas horas: cada una rehace y puede gastar (el que
 * cruza, y los papeles o dónde dormir si cambian). De partida, como los cambios: seis por viaje cada 24 horas. Es
 * del PM.
 */
export const ELECCIONES_DE_TRANSPORTE = { deUnViaje: 6, horas: 24 };
