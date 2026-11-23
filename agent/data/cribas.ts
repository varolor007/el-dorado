// Las cribas, en datos: lo que descarta, lo que se suma al precio y los pesos de partida de la nota. Son de partida:
// se ajustan con casos reales, en el ensayo. Ninguna regla lleva el nombre de un país, una aerolínea o un hotel.

/**
 * Criba 1. Lo que descarta un alojamiento, por su clase. El motivo va en inglés porque lo lee un asiento, en la
 * tabla; al viajero se lo dice la web, en su idioma, con la clase.
 */
export const DESCARTA = {
  missing_must: "missing something the traveller marked as a must",
  serious_complaints: "serious complaints repeated in recent reviews",
} as const;

/** Las quejas que descartan si se repiten en las opiniones recientes: cómo las nombra quien las escribe. */
export const QUEJAS_GRAVES: Record<string, RegExp> = {
  bed_bugs: /\b(bed ?bugs?|chinches)\b/i,
  cockroaches: /\b(cockroach(es)?|roach(es)?|cucarachas?)\b/i,
  mould: /\b(mould|mold|moho)\b/i,
  scam: /\b(scam|estafa|fraud)\b/i,
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

/** La zona: los minutos andando a los que queda la mitad de lo que se va a ver. Hasta aquí, diez; desde aquí, cero. */
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

/** Los mínimos de partida de un alojamiento para seguir adelante, y cuántos se miran de cerca. Se ajustan con casos. */
export const MINIMOS_DE_PARTIDA = { nota: 8.5, opiniones: 200, estrellas: 4 };
export const FINALISTAS = 5;

/** La moneda en la que se piden los precios mientras el viajero no diga otra. */
export const MONEDA_DE_PARTIDA = "EUR";
