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

/** Cuántos días antes y después se mueven la ida y la vuelta si el viajero puede mover sus fechas. */
export const DIAS_ALREDEDOR = 2;

/** Cuántas escalas por trayecto, como mucho: directo o con una. Lo que lleva más no entra en la parrilla. */
export const ESCALAS_MAXIMAS = 1;

/** Cuántas peticiones de precios hace un viaje, como mucho: una por par, y otra por par si se mueven las fechas. */
export const PETICIONES_DE_TRANSPORTE = PARES * 2;

/** El redondeo del punto del que sale el viajero, en decimales de grado: uno es unos once kilómetros. */
export const DECIMALES_DEL_ORIGEN = 1;
