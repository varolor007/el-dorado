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
