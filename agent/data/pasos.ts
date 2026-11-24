// Los pasos de una investigación, en su orden: quién da cada uno, qué puerta lo mira y qué archivo deja en la carpeta
// de su run. Es lo que la casa sabe del camino sin leer el código que lo recorre: con ello dice por dónde va un run.

export type Paso = {
  id: string;
  /** Quién lo da: el código de la casa, o el asiento, por el nombre de su contrato. */
  quien: string;
  /** La puerta que lo mira, por su número en la hoja; null si no tiene. */
  puerta: number | null;
  /** Lo que deja en el run cuando está hecho. Los de varias rondas llevan su número: `tabla-1.json`. */
  deja: string[];
};

/** El código de la casa, cuando el paso no es de ningún asiento. */
export const CODIGO = "code";

export const PASOS: Paso[] = [
  { id: "understood", quien: CODIGO, puerta: 1, deja: ["entendido.json"] },
  { id: "sights", quien: CODIGO, puerta: null, deja: ["sitios.json"] },
  { id: "route", quien: "route-planner", puerta: 3, deja: ["ruta.json"] },
  { id: "search", quien: CODIGO, puerta: 4, deja: ["busqueda.json"] },
  { id: "look", quien: "lodging-viewer", puerta: 5, deja: ["mirar.json", "como_es.json"] },
  { id: "pick", quien: "sights-picker", puerta: 9, deja: ["dias.json"] },
  { id: "days", quien: CODIGO, puerta: 9, deja: ["dias.json"] },
  { id: "table", quien: CODIGO, puerta: null, deja: ["tabla-1.json"] },
  { id: "cross", quien: "trip-crosser", puerta: 6, deja: ["cruce-1.json"] },
  { id: "explain", quien: "trip-explainer", puerta: 7, deja: ["explica.json"] },
  { id: "trip", quien: CODIGO, puerta: null, deja: ["viaje.json", "sucesos.json"] },
];

/** Donde queda escrito que un run se paró, en qué paso y por qué. Mientras esté, el run sigue parado. */
export const PARADO = "parado.json";

/** Cómo está un paso de un run: sin empezar, esperando a su asiento, hecho o parado en una puerta. */
export const ESTADOS_DE_UN_PASO = ["pending", "waiting", "done", "stopped"] as const;
export type EstadoDeUnPaso = (typeof ESTADOS_DE_UN_PASO)[number];
