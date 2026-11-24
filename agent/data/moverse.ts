// Cómo se va de un sitio a otro, en datos. El viajero no dice de antemano cómo se mueve: de cada trayecto, El Dorado
// dice las maneras que tienen sentido por su distancia (el PM, 24-nov: «habrá cosas a las que puedas ir de cualquier
// manera y otras que ni de coña»). Lo que se anda en un rato no se manda en coche, y lo que está lejos no se manda a
// pie. Lo que cuesta cada manera y si la hay donde se viaja lo dirá una fuente, cuando la haya: hasta entonces se
// dice la distancia y un tiempo aproximado, que sale de estas cuentas y no de una ruta de verdad.

/** Las maneras de ir, y entre qué distancias tiene sentido cada una, en metros de camino. */
export const MANERAS_DE_IR = [
  { id: "walk", desde: 0, hasta: 3500 },
  { id: "transit", desde: 1000, hasta: 60_000 },
  { id: "car", desde: 1000, hasta: Number.POSITIVE_INFINITY },
] as const;
export type ManeraDeIr = (typeof MANERAS_DE_IR)[number]["id"];

/**
 * Lo que se tarda con cada manera que no es andar, de partida: unos minutos fijos (esperar, aparcar), los primeros
 * kilómetros despacio, como en una ciudad, y el resto deprisa, como por carretera. En metros por minuto.
 */
export const RITMO_DE_IR: Record<Exclude<ManeraDeIr, "walk">, { fijos: number; cerca: number; lejos: number }> = {
  transit: { fijos: 8, cerca: 250, lejos: 500 },
  car: { fijos: 5, cerca: 400, lejos: 900 },
};
/** Hasta dónde se va «despacio», en metros. */
export const TRAMO_DE_CERCA = 10_000;

/** El trayecto más largo que cabe dentro de un día, de ida, en minutos. Más allá es otro sitio donde dormir. */
export const TRAYECTO_DE_UN_DIA = 90;

/**
 * Lo más que se le pide a la fuente de rutas para un viaje, en casillas (un camino de un punto a otro, por una
 * manera). Su plan gratuito da 3.000 al día: así caben unos cinco viajes. Es de partida.
 */
export const CASILLAS_POR_VIAJE = 600;

/**
 * Hasta dónde se le pide el coche, en línea recta y en metros: más allá, nada cabe en un día, vaya como vaya. Es
 * holgado a propósito: por autopista se llega más lejos que con la cuenta de la casa.
 */
export const EN_COCHE_HASTA = 100_000;

/**
 * Cuánto de más se puede pedir al juntar pares en una matriz, sobre lo que hace falta: una matriz pide todos sus
 * cruces, y alguno no se necesita. Un cuarto.
 */
export const HOLGURA_DE_UNA_MATRIZ = 0.25;
