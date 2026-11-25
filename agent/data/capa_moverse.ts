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
