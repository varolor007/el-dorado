// Las cribas, en datos: lo que descarta, lo que se suma al precio y los pesos de partida de la nota. Son de partida:
// se ajustan con casos reales, en el ensayo. Ninguna regla lleva el nombre de un país, una aerolínea o un hotel.

/** Criba 1. Lo que descarta un alojamiento, con el motivo que se le dice al viajero. */
export const DESCARTA = {
  sin_precio: "no tiene precio para esas noches",
  le_falta_un_imprescindible: "le falta algo que marcaste como imprescindible",
  no_cabe_el_grupo: "no cabe el grupo",
  quejas_graves: "tiene quejas graves que se repiten",
} as const;

/** Las quejas que descartan si se repiten en las opiniones recientes: cómo las nombra quien las escribe. */
export const QUEJAS_GRAVES: Record<string, RegExp> = {
  chinches: /\b(bed ?bugs?|chinches)\b/i,
  cucarachas: /\b(cockroach(es)?|roach(es)?|cucarachas?)\b/i,
  moho: /\b(mould|mold|moho)\b/i,
  engano: /\b(scam|estafa|fraud)\b/i,
};
/** Cuántas opiniones tienen que decirlo para que cuente como repetido. */
export const QUEJA_REPETIDA = 3;

/** Criba 2. Lo que tiene precio y se suma al precio. Lo que la fuente no da, se dice «sin confirmar»; no se supone. */
export const SE_SUMA = {
  alojamiento: ["tasas_que_se_pagan_alli"],
  transporte: ["maleta", "asiento", "llegar_al_aeropuerto"],
} as const;

/** Criba 3. Los pesos de partida de la nota de un alojamiento. Suman uno. */
export const PESOS_DEL_ALOJAMIENTO = {
  zona: 0.3,
  comoEs: 0.3,
  opiniones: 0.2,
  encaje: 0.1,
  condiciones: 0.1,
} as const;

/** Los pesos de partida de la nota de un vuelo. Suman uno. Esperan a la búsqueda de transporte. */
export const PESOS_DEL_VUELO = { puertaAPuerta: 0.35, escalas: 0.25, horarios: 0.25, aerolinea: 0.15 } as const;

/** Dentro de «cómo es», lo que el viajero marcó como «me gusta» pesa esto más que lo demás. */
export const MAS_POR_GUSTO = 3;

/** La zona: andando hasta lo que se va a ver, de media. Hasta aquí, un diez; desde aquí, un cero. */
export const ZONA = { minutosDeDiez: 8, minutosDeCero: 40 } as const;

/** Las opiniones se corrigen: una nota con pocas opiniones tira hacia esta media, con este peso. */
export const OPINIONES = { media: 8, comoSiHubiera: 150, notaDeCero: 6, notaDeDiez: 9.6 } as const;

/** La más barata se elige entre las que pasan de esta nota. */
export const NOTA_MINIMA = 5;

/**
 * La mejor por lo que cuesta: cuántos puntos de nota vale pagar el doble, según lo que el viajero quiere gastar.
 * Si va ajustado, el precio pesa mucho; si va cómodo, poco.
 */
export const PRECIO_POR_GASTO: Record<string, number> = { tight: 10, medium: 6, comfortable: 3 };
