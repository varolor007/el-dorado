// Lo que puede decir y hacer el conductor, en listas cerradas: lo que entrega es una de sus salidas, y lo ejecuta el
// código, nunca él. Lo que es del PM (si un día puede hacer más, y cuánto gasta) está aquí con lo más prudente.

/** Las dos salidas del conductor: una vuelta más del dueño con una indicación suya, o parar y contarlo. */
export const DECISIONES = ["retry_with_hint", "stop_and_tell"] as const;
export type Decision = (typeof DECISIONES)[number];

/**
 * Qué clase de parada es, dicha para el viajero por claves: la web la pone en palabras. Las cuatro primeras las puede
 * decir el conductor; las otras las dice solo el código, que es quien para por ellas.
 */
export const CLASES_DE_PARADA = [
  // Un paso no pasó sus comprobaciones, ni con sus vueltas.
  "seat_kept_failing",
  // Un paso no llegó a acabar su trabajo.
  "seat_did_not_finish",
  // Lo pedido es de una clase de viaje que todavía no se sabe planear.
  "not_possible_yet",
  // Las fuentes no dieron con qué trabajar: ni sitios, ni alojamiento, o nada que valga para lo pedido.
  "nothing_found",
  // Se llegó al techo de gasto.
  "spend_ceiling",
  // La casa tuvo un problema suyo.
  "house_broke",
] as const;
export type ClaseDeParada = (typeof CLASES_DE_PARADA)[number];

/** Las que puede elegir el conductor. Del gasto y de la casa solo habla el código. */
export const CLASES_DEL_CONDUCTOR: readonly ClaseDeParada[] = [
  "seat_kept_failing",
  "seat_did_not_finish",
  "not_possible_yet",
  "nothing_found",
];

/** Lo que puede hacer el viajero con un run parado: volver a intentarlo, cambiar lo pedido o seguir sin esa parte. */
export const SALIDAS_DEL_VIAJERO = ["retry", "change_request", "continue_without"] as const;
export type SalidaDelViajero = (typeof SALIDAS_DEL_VIAJERO)[number];

/**
 * Los pasos de los que el viajero puede seguir sin esa parte. Hoy ninguno: si alguno se puede saltar lo dice la hoja,
 * y lo decide el PM. Mientras esté vacía, «continue_without» no se ofrece nunca.
 */
export const PASOS_QUE_SE_PUEDEN_SALTAR: readonly string[] = [];

/** Lo que ofrece el código, sin conductor, a cada clase de parada. */
export const SALIDAS_DE_CADA_CLASE: Record<ClaseDeParada, SalidaDelViajero[]> = {
  seat_kept_failing: ["retry", "change_request"],
  seat_did_not_finish: ["retry"],
  not_possible_yet: ["change_request"],
  nothing_found: ["change_request"],
  spend_ceiling: ["retry"],
  house_broke: ["retry"],
};

/**
 * Cuántas vueltas de más puede pedir el conductor en un run: una. Y cuántas veces se le llama en un run: una. Lo que
 * gasta cuenta en el techo del run, como cualquier asiento.
 */
export const VUELTAS_DEL_CONDUCTOR = 1;
export const CONDUCTORES_POR_RUN = 1;

/** Lo más largo de la indicación que le deja al dueño, y de su porqué, que es para quien lleva el run. */
export const LARGO_DE_LA_INDICACION = 400;
export const LARGO_DEL_PORQUE = 600;

/**
 * Si la frase que el conductor escribe para el viajero se le enseña. Es lo único de un asiento, con la pregunta del
 * que escucha, que llegaría a la pantalla sin pasar por el que explica: aunque pase su puerta de palabras, espera la
 * firma del PM. Mientras tanto, la web dice lo que pasó con sus propias palabras, por claves.
 */
export const SE_ENSENA_LA_FRASE_DEL_CONDUCTOR = false;

/** Lo que deja el conductor en el run: a qué parada se le llamó, lo que entregó, si pasó su puerta y lo que se hizo. */
export const CONDUCTOR = "conductor.json";
/** El acta del run, que se rehace leyendo el disco. */
export const ACTA = "acta.json";
