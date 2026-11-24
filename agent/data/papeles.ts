// Los papeles, en datos: la lista fija de preguntas que se recorre para cada viajero y cada país, y los dominios
// oficiales de los que puede salir una respuesta. No se guardan respuestas, porque cambian: se guarda qué preguntar y
// a quién creer. La lista de dominios es una semilla: crece con cada país que se pruebe, y la revisa una persona.
// Cómo se sabe qué es oficial en un país que no está en ella es del PM: mientras, sin dominio conocido, nada de ese
// país sale «en regla».

export const PREGUNTAS = [
  "visa",
  "passport_validity",
  "onward_ticket",
  "proof_of_funds",
  "arrival_card",
  "vaccines",
  "insurance",
  "minors",
  "transit",
  "travel_advisory",
  "driving_licence",
] as const;

/** Lo que pregunta cada una, como se le dice al asiento. */
export const QUE_PREGUNTA: Record<(typeof PREGUNTAS)[number], string> = {
  visa: "Whether a visa or an entry permit is needed for this stay, and which",
  passport_validity: "How long the passport has to be valid, counted from arrival or from departure",
  onward_ticket: "Whether a ticket out of the country is asked for at entry",
  proof_of_funds: "Whether money or means for the stay have to be shown at entry",
  arrival_card: "Whether an arrival card, an online form or a travel authorisation is needed before arriving",
  vaccines: "Which vaccines or health papers are required for entry",
  insurance: "Whether travel or health insurance is required for entry",
  minors: "What a minor needs to enter: papers, consent of the parents, travelling with an adult",
  transit: "What is needed to change planes in another country on the way",
  travel_advisory: "What the traveller's own ministry says about travelling there now",
  driving_licence: "Whether the traveller's driving licence is valid there, or an international one is needed",
};

/** La pregunta que solo se hace por un menor. */
export const SOLO_DE_MENORES: readonly (typeof PREGUNTAS)[number][] = ["minors"];

/**
 * La pregunta que espera al transporte: por qué países se hace escala no se sabe hasta elegir cómo se llega, y eso es
 * del momento del transporte. Hasta entonces no se pregunta, y se dice.
 */
export const HASTA_EL_TRANSPORTE: readonly (typeof PREGUNTAS)[number][] = ["transit"];

/** Cómo puede estar una casilla: en regla, hay que hacer algo, aviso, bloquea o dudoso, como dice la hoja. */
export const ESTADOS_DE_PAPEL = ["in_order", "to_do", "warning", "blocks", "doubtful"] as const;
export type EstadoDePapel = (typeof ESTADOS_DE_PAPEL)[number];

/** Por qué una casilla es dudosa: las fuentes chocan, no tenemos fuente oficial de ese país o no se encontró. */
export const DUDAS = ["sources_disagree", "no_official_source", "not_found"] as const;

/** De qué lado es una fuente: del gobierno del destino o del ministerio del país del viajero. */
export const LADOS = ["destination", "home"] as const;

/** Los dominios oficiales por país, en dos letras. Un dominio vale también para lo que cuelga de él. */
export const DOMINIOS_OFICIALES: Record<string, string[]> = {
  ES: ["exteriores.gob.es", "interior.gob.es", "sanidad.gob.es"],
  PT: ["vistos.mne.gov.pt", "portaldascomunidades.mne.gov.pt", "sef.pt", "aima.gov.pt"],
  EU: ["europa.eu"],
};

/** Los países de la Unión Europea, para los que valen también los dominios comunes (`EU`). */
export const UNION_EUROPEA = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

/** Los dominios oficiales de un país: los suyos y, si es de la Unión, los comunes. */
export function dominiosDe(pais: string): string[] {
  const p = pais.toUpperCase();
  if (p === "EU") return [];
  return [...(DOMINIOS_OFICIALES[p] ?? []), ...(UNION_EUROPEA.includes(p) ? DOMINIOS_OFICIALES.EU : [])];
}

/**
 * El dominio de nuestra lista del que es una dirección, para ese país, y si es propio suyo o común a varios (los de
 * la Unión); null si no es de ninguno, o si no es https. Dos páginas del mismo dominio son una sola fuente, y un
 * dominio común no es el gobierno de ningún país.
 */
export function dominioOficial(url: string, pais: string): { dominio: string; propio: boolean } | null {
  let maquina: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    maquina = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  const propios = DOMINIOS_OFICIALES[pais.toUpperCase()] ?? [];
  const suyo = (d: string): boolean => maquina === d || maquina.endsWith("." + d);
  const dominio = dominiosDe(pais).find(suyo);
  return dominio === undefined ? null : { dominio, propio: pais.toUpperCase() !== "EU" && propios.some(suyo) };
}

/** Si tenemos algún dominio oficial propio de ese país: sin él, nada de ese país puede salir «en regla». */
export const conFuenteOficial = (pais: string): boolean => (DOMINIOS_OFICIALES[pais.toUpperCase()] ?? []).length > 0;

/**
 * Cuánto puede buscar y abrir el de los papeles: más que los de partida, porque cada casilla se busca en dos lados (el
 * gobierno del destino y el ministerio del viajero) y una tabla de un país y un pasaporte tiene nueve casillas.
 * Una página oficial suele contestar a varias; con dos pasaportes o dos países, el doble. Los firma el PM.
 */
export const TOPES_DE_LOS_PAPELES = { busquedas: 16, paginas: 24 };

/** Verdadero si una dirección es de un dominio oficial de ese país, o de uno de los comunes si es de la Unión. */
export function esOficial(url: string, pais: string): boolean {
  let maquina: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    maquina = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  const dominios = dominiosDe(pais);
  return dominios.some((d) => maquina === d || maquina.endsWith("." + d));
}
