// Quién te responde, como lo dice la hoja en «La casa: lo que cruza todos los momentos»: qué asiento, o el código,
// atiende cada sitio de la web. Con ella, cada momento manda lo que dice el viajero a su dueño. Lo que lees lo dice
// siempre El Dorado: el nombre del asiento no se enseña.

/** El código de la casa, cuando no responde ningún asiento. */
export const LA_CASA = "code";

export type QuienResponde = {
  /** El sitio de la web, por su clave. */
  sitio: string;
  /** Quién lo atiende: el código, o el asiento por el nombre de su contrato. */
  responde: string;
  /** Quién contesta un mensaje tuyo en ese sitio; null si ahí no se escribe. */
  mensaje: string | null;
  /** Quién habla al final, si no es el mismo; o, en un cambio, que después lo hace el dueño de cada pieza. */
  alFinal?: string;
};

/** Después de un cambio, cada pieza la rehace su dueño: el que la hizo en la investigación. */
export const EL_DUENO_DE_CADA_PIEZA = "piece_owner";

export const QUIEN_RESPONDE: QuienResponde[] = [
  { sitio: "home", responde: LA_CASA, mensaje: null },
  { sitio: "questions", responde: LA_CASA, mensaje: null },
  { sitio: "free_box", responde: "listener", mensaje: "listener" },
  { sitio: "date_warnings", responde: "calendar", mensaje: "calendar" },
  { sitio: "paper_warnings", responde: "papers", mensaje: "papers" },
  { sitio: "live_research", responde: LA_CASA, mensaje: null, alFinal: "trip-explainer" },
  { sitio: "lodging_sheet", responde: "lodging-viewer", mensaje: "lodging-viewer" },
  { sitio: "transport_or_total", responde: "trip-crosser", mensaje: "trip-crosser" },
  // El ritmo y mover una parada, código; un mensaje tuyo, el del día a día.
  { sitio: "day", responde: LA_CASA, mensaje: "sights-picker" },
  { sitio: "guide", responde: "guide-writer", mensaje: "guide-writer" },
  { sitio: "change", responde: LA_CASA, mensaje: null, alFinal: EL_DUENO_DE_CADA_PIEZA },
];

/** Quién responde en un sitio; null si no es un sitio de la tabla. */
export function quienResponde(sitio: string): QuienResponde | null {
  return QUIEN_RESPONDE.find((x) => x.sitio === sitio) ?? null;
}
