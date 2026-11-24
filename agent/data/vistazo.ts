// El primer vistazo, en números: cuánto se busca, cuánto se espera y cuánto se deja buscar a quien no tiene cuenta.
// Son de partida: se ajustan con casos reales. Como no pide cuenta, lo que gasta lo paga el cupo de las fuentes de la
// casa: por eso lleva freno.

/** En cuántas zonas se parte la caja del destino, por cada lado: tres por tres, nueve zonas como mucho. */
export const ZONAS_POR_LADO = 3;

/** A cuántos alojamientos se les pide precio, como mucho: los que se dicen «desde» salen de estos. */
export const PRECIOS_DEL_VISTAZO = 100;

/** De cuántos en cuántos se piden esos precios, todas las tandas a la vez: la que tarda no frena a las demás. */
export const POR_TANDA = 25;

/** Cuántas listas de una zona se piden a la vez a la fuente. */
export const LISTAS_A_LA_VEZ = 3;

/** Cuántos puntos se pintan en el mapa, como mucho: los que pasan los mínimos, con precio los primeros. */
export const PUNTOS_DEL_VISTAZO = 400;

/** Lo más que se espera, en segundos: a la lista de alojamientos, a sus precios y a los días baratos. */
export const ESPERA_DEL_VISTAZO = { lista: 12, precios: 8, vuelos: 8 };

/**
 * El freno de la puerta. Un vistazo nuevo cuenta para el tope; uno que ya estaba en la memoria, no. La memoria
 * guarda la misma respuesta para el mismo destino, las mismas fechas y el mismo grupo durante unos minutos.
 */
export const FRENO_DEL_VISTAZO = {
  /** Cuántos vistazos nuevos en toda la casa, por ventana. */
  porVentana: 30,
  /** Cuántos vistazos nuevos para quien pide, si la web dice quién es (su dirección, resumida), por ventana. */
  porCliente: 6,
  minutosDeVentana: 10,
  /** Cuántos se buscan a la vez en toda la casa. */
  aLaVez: 3,
  minutosEnMemoria: 10,
  /** Cuántos vistazos distintos guarda la memoria. */
  enMemoria: 300,
};
