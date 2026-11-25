// Los números de cerrar el viaje, en datos: cuánto vale un precio antes de darlo por caducado, desde cuánto se le
// pregunta al viajero si sigue cuando un precio sube, cómo se comprueba que un enlace responde y qué se puede esperar
// de la hora de llegada. Son de partida, y son del PM: se ajustan con casos reales.

/**
 * La edad máxima de un precio, en horas, desde que se vio hasta que se cierra el viaje con él. Un precio pedido
 * ahora a su fuente (el del alojamiento) vale un día; uno guardado de búsquedas de otros (el de un vuelo), una
 * semana. Pasada su edad, el precio no se da por bueno: se dice que está caducado y queda sin confirmar.
 */
export const EDAD_MAXIMA_DE_UN_PRECIO = { ahora: 24, guardado: 24 * 7 };

/**
 * Lo que tiene que cambiar un precio para decir que ha cambiado: un céntimo. Cualquier cambio se dice; lo que
 * decide el viajero lo decide con todo delante.
 */
export const CAMBIO_QUE_SE_DICE = 0.01;

/**
 * Cuándo se para el cierre y se le pregunta al viajero si sigue: si el total del viaje sube un 10 % o más, o si una
 * pieza se ha quedado sin precio. Mientras no diga que sigue, el viaje se queda en el mapa como estaba.
 */
export const SUBIDA_QUE_SE_PREGUNTA = 0.1;

/**
 * Cómo se comprueba que un enlace responde, sin tumbar una web ni gastar: una sola petición por enlace, de una en
 * una, que solo pide la cabecera (y, si la web no la admite, el primer byte), con su tiempo máximo, sin seguir más
 * de unas pocas redirecciones, y unos pocos enlaces por cierre. Los de Google Maps no se comprueban: los hace la
 * casa con su forma fija y sin clave.
 */
export const COMPROBAR_ENLACES = { segundos: 6, redirecciones: 3, porCierre: 12 };

/**
 * La hora de llegada frente a la de entrada al alojamiento. La hora del destino no se sabe: se calcula por su
 * longitud (una hora cada 15 grados), con este margen de horas de más o de menos. Lo que cae dentro del margen no
 * se da por bueno ni por malo: se dice que no se sabe. Llegar más de estas horas antes de la entrada es esperar a la
 * habitación, y se dice.
 */
export const LA_HORA_DE_LLEGADA = { margen: 2, antesDeLaEntrada: 3 };

/** Lo que espera la casa a cada fuente al volver a pedir un precio, en segundos. */
export const ESPERA_A_LAS_FUENTES = 30;

/** Las vueltas del que explica al cerrar: si su entrega vuelve en rojo, dos veces más como mucho, como siempre. */
export const VUELTAS_DEL_ORDEN = 2;
