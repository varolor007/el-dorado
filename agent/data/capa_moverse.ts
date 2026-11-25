// El de moverse (14.2), en datos: las maneras de moverse por un destino, de dónde se llega, las clases de billete y
// de pago, y lo que puede salir a internet. Son de partida y generales: los ajusta su sesión y, sus números, el PM.

/** Las maneras de moverse allí, de la más pública a la más tuya. */
export const MODOS_DE_MOVERSE = [
  "metro",
  "tram",
  "bus",
  "train",
  "ferry",
  "cable",
  "shuttle",
  "taxi",
  "ride_hailing",
  "car",
  "bike",
  "walk",
] as const;
export type ModoDeMoverse = (typeof MODOS_DE_MOVERSE)[number];

/** De dónde se llega: el aeropuerto, la estación o el puerto. */
export const DE_DONDE_SE_LLEGA = ["airport", "station", "port"] as const;
export type DeDondeSeLlega = (typeof DE_DONDE_SE_LLEGA)[number];

/**
 * Las clases de billete: uno suelto, un abono de un día, uno de varios días, un bono de varios viajes y una tarjeta
 * recargable. Con ellas el código compara sueltos contra abono por los trayectos que no se andan.
 */
export const BILLETES = ["single", "day_pass", "multi_day_pass", "multi_ride", "travel_card"] as const;
export type ClaseDeBillete = (typeof BILLETES)[number];

/** Cómo se paga: sin contacto, con tarjeta, en efectivo, con una aplicación o con una tarjeta de allí. */
export const PAGOS = ["contactless", "card", "cash", "app", "travel_card"] as const;
export type ClaseDePago = (typeof PAGOS)[number];

/** Por qué no hay una manera de ir de donde se llega a donde se duerme: no se encontró, o no la hay sin coche. */
export const POR_QUE_NO_SE_LLEGA = ["not_found", "no_public_way"] as const;

/** Lo que puede salir a internet, de partida (es del PM). */
export const TOPES_DE_MOVERSE = { busquedas: 10, paginas: 16 };

// Lo que mira la puerta 11 y lo que usa la cuenta de lo que conviene (14.2).

/** Las maneras que son transporte público: las que se pagan con un billete o un abono, y las que cuenta la cuenta. */
export const MODOS_PUBLICOS: readonly ModoDeMoverse[] = ["metro", "tram", "bus", "train", "ferry", "cable"];

/** Lo más que entrega de cada lista: más no es un dato, es ruido. Son de partida. */
export const LO_MAS_DE_MOVERSE = {
  arrivals: 12,
  transport: 12,
  tickets: 12,
  payment: 5,
  between_bases: 12,
  unknowns: 10,
};

/** Lo más que vale un abono, en días: más es un abono de residente, no de viajero. */
export const DIAS_DE_UN_ABONO = 31;

/**
 * Cuántos días puede haber entre el día de la casa y el día en que se vio una página: el run puede pasar la medianoche.
 * Lo que se vio otro día no es de este viaje.
 */
export const DIAS_DE_HOLGURA = 1;

/**
 * Las palabras de decir qué es lo mejor, en inglés y en español: el de moverse da los datos y no elige. Lo que
 * conviene con tus días lo dice la cuenta del código. Valen para cualquier frase suya, aunque no la lea el viajero.
 */
export const DE_LO_MEJOR = new RegExp(
  "(?<![\\p{L}\\p{N}])(" +
    [
      "best|better|recommend\\p{L}*|should|worth|ideal|easiest|fastest|quickest|cheapest|most convenient|go for",
      "mejor\\p{L}*|recomend\\p{L}*|recomiend\\p{L}*|conviene\\p{L}*|deber[ií]a\\p{L}*|vale la pena|ideal\\p{L}*",
      "m[aá]s (?:r[aá]pid|c[oó]mod|barat|f[aá]cil)\\p{L}*",
    ].join("|") +
    ")(?![\\p{L}\\p{N}])",
  "iu",
);
