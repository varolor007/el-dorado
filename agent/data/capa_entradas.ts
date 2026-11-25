// El de las entradas (14.4), en datos: cuántos sitios mira por llamada y en total, cuánto se le espera antes de
// repartir los días y lo que puede salir a internet. Son de partida (son del PM): se ajustan con casos reales.

/** Cuántos sitios elegidos se le dan en cada llamada: una llamada por cada tanda de sitios, como dice la hoja. */
export const SITIOS_POR_LLAMADA = 8;

/** Cuántos sitios se miran en total, como mucho: los de más se quedan con lo que dicen los datos abiertos. */
export const SITIOS_EN_TOTAL = 24;

/**
 * Lo más que se le espera antes de repartir los días, en segundos: es su tope en la casa. Si tarda más, o falla, los
 * días se reparten sin sus horarios, y se dice.
 */
export const ESPERA_DE_LAS_ENTRADAS = { segundos: 600 };

/** Lo que puede salir a internet en cada llamada, de partida (es del PM). */
export const TOPES_DE_LAS_ENTRADAS = { busquedas: 12, paginas: 20 };
