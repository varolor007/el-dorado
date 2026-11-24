// Las cribas, en datos: lo que descarta, lo que se suma al precio y los pesos de partida de la nota. Son de partida:
// se ajustan con casos reales, en el ensayo. Ninguna regla lleva el nombre de un país, una aerolínea o un hotel.

/**
 * Criba 1. Lo que descarta un alojamiento, por su clase. El motivo va en inglés porque lo lee un asiento, en la
 * tabla; al viajero se lo dice la web, en su idioma, con la clase.
 */
export const DESCARTA = {
  missing_must: "missing something the traveller marked as a must",
  serious_complaints: "a serious complaint that the viewer confirmed in more than one review",
} as const;

/**
 * Las palabras con las que suele escribirse una queja grave. Con ellas el código no descarta a nadie: una palabra no
 * dice si pasó o si el huésped cuenta que no pasó. Sirven para señalarle al que mira en qué opiniones fijarse, y solo
 * en los idiomas en que están escritas: en los demás, el que mira las lee igual, sin la señal.
 */
export const QUEJAS_GRAVES: Record<string, RegExp> = {
  pests: /\b(bed ?bugs?|cockroach(es)?|roach(es)?|mice|rats?|chinches|cucarachas?|ratas?|ratones)\b/i,
  mould: /\b(mould|mold|moho)\b/i,
  theft: /\b(stolen|stole|theft|robbed|robaron|robo|robado)\b/i,
  scam: /\b(scam|fraud|estafa|estafaron)\b/i,
};
/** Cuántas opiniones señaladas hacen que, si nadie miró el alojamiento, se diga que queda una queja sin confirmar. */
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
/**
 * Solo se sabe lo que se anda: no hay transporte público en los datos. Por eso la escala es larga, y el cero está en
 * una hora andando: un sitio a media hora a pie del centro de una ciudad no es un mal sitio. Es de partida, puesta
 * con un solo viaje de prueba: se calibra con varios destinos distintos, en el ensayo.
 */
export const ZONA = { minutosDeDiez: 10, minutosDeCero: 60 } as const;

/** Las opiniones se corrigen: una nota con pocas opiniones tira hacia esta media, con este peso. */
export const OPINIONES = { media: 8, comoSiHubiera: 150, notaDeCero: 6, notaDeDiez: 9.6 } as const;

/** La más barata se elige entre las que pasan de esta nota. */
export const NOTA_MINIMA = 5;
/** Sobre cuánto va la nota de la casa: de 0 a 10. Se le dice al que explica, para que la nombre como nuestra. */
export const NOTA_SOBRE = 10;

/**
 * La mejor por lo que cuesta: cuántos puntos de nota vale pagar el doble, según lo que el viajero quiere gastar.
 * Si va ajustado, el precio pesa mucho; si va cómodo, poco.
 */
export const PRECIO_POR_GASTO: Record<string, number> = { tight: 10, medium: 6, comfortable: 3 };

/**
 * Los mínimos de un alojamiento para seguir adelante, en escalera. Se empieza por el primer escalón; si con él no
 * quedan bastantes con precio, se baja al siguiente, y se dice. En una gran ciudad sobra con el primero; en un pueblo
 * o en un sitio con poca oferta, sin la escalera no habría viaje. Son de partida: se ajustan con casos.
 */
export const ESCALERA_DE_MINIMOS = [
  { nota: 8.5, opiniones: 200, estrellas: 4 },
  { nota: 8, opiniones: 100, estrellas: 3 },
  { nota: 7.5, opiniones: 30, estrellas: 2 },
  { nota: 7, opiniones: 10, estrellas: 0 },
];
export const MINIMOS_DE_PARTIDA = ESCALERA_DE_MINIMOS[0];

/**
 * Cuánto se ensancha una zona si en ella no hay bastantes alojamientos ni bajando los mínimos: su radio, por cada
 * uno de estos números, hasta un tope en metros. En un pueblo o en un valle lo que hay puede estar a varios
 * kilómetros del centro; lo lejos que quede ya lo dice después la nota de la zona.
 */
export const ESCALERA_DE_RADIO = [1, 3, 9];
export const RADIO_MAXIMO = 25_000;

/**
 * Si tantos alojamientos pasan los mínimos y ninguno tiene precio, no es cosa de los mínimos ni de la zona, sino de
 * las fechas o de los que viajan: no se sigue bajando ni ensanchando.
 */
export const MUCHOS_SIN_PRECIO = 30;

/** Con cuántos alojamientos con precio se da un escalón por bueno, y cuántos se miran de cerca. */
export const CANDIDATOS_QUE_BASTAN = 8;
export const FINALISTAS = 5;
