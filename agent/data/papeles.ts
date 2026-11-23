// Los papeles, en datos: la lista fija de preguntas que se recorre para cada viajero y cada país, y los dominios
// oficiales de los que puede salir una respuesta. No se guardan respuestas, porque cambian: se guarda qué preguntar y
// a quién creer. La lista de dominios es una semilla: crece con cada país que se pruebe, y la revisa una persona.

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

/** Los dominios oficiales por país, en dos letras. Un dominio vale también para lo que cuelga de él. */
export const DOMINIOS_OFICIALES: Record<string, string[]> = {
  ES: ["exteriores.gob.es", "interior.gob.es", "sanidad.gob.es"],
  PT: ["vistos.mne.gov.pt", "portaldascomunidades.mne.gov.pt", "sef.pt", "aima.gov.pt"],
  EU: ["europa.eu"],
};

/** Verdadero si una dirección es de un dominio oficial de ese país, o de uno de los comunes. */
export function esOficial(url: string, pais: string): boolean {
  let maquina: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    maquina = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  const dominios = [...(DOMINIOS_OFICIALES[pais.toUpperCase()] ?? []), ...DOMINIOS_OFICIALES.EU];
  return dominios.some((d) => maquina === d || maquina.endsWith("." + d));
}
