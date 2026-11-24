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
  // El que escucha solo se lanza si el viajero escribió algo; lo que deja, ya confirmado, es `escuchado.json`.
  { id: "understood", quien: "listener", puerta: 1, deja: ["escuchado.json"] },
  // El de los papeles corre por detrás desde el principio; su puerta 2 se mira antes de gastar en buscar. Si algo
  // bloquea, o no se pudo mirar, espera la decisión del viajero.
  { id: "papers", quien: "papers", puerta: 2, deja: ["papeles.json"] },
  { id: "sights", quien: CODIGO, puerta: null, deja: ["sitios.json"] },
  { id: "route", quien: "route-planner", puerta: 3, deja: ["ruta.json"] },
  { id: "search", quien: CODIGO, puerta: 4, deja: ["busqueda.json"] },
  { id: "look", quien: "lodging-viewer", puerta: 5, deja: ["mirar.json", "como_es.json"] },
  { id: "pick", quien: "sights-picker", puerta: 9, deja: ["dias.json"] },
  { id: "days", quien: CODIGO, puerta: 9, deja: ["dias.json"] },
  { id: "table", quien: CODIGO, puerta: null, deja: ["tabla-1.json"] },
  { id: "cross", quien: "trip-crosser", puerta: 6, deja: ["cruce-1.json"] },
  { id: "explain", quien: "trip-explainer", puerta: 7, deja: ["explica.json"] },
  // El del calendario corre por detrás desde el principio: hace falta cuando se monta el viaje, no antes.
  { id: "calendar", quien: "calendar", puerta: null, deja: ["calendario.json"] },
  { id: "trip", quien: CODIGO, puerta: null, deja: ["viaje.json", "sucesos.json"] },
];

/** Donde queda escrito que un run se paró, en qué paso y por qué. Mientras esté, el run sigue parado. */
export const PARADO = "parado.json";

/**
 * Cómo está un paso de un run: sin empezar, esperando a su asiento, esperando al viajero (su turno: confirmar lo que
 * he entendido), hecho o parado en una puerta.
 */
export const ESTADOS_DE_UN_PASO = ["pending", "waiting", "yours", "done", "stopped"] as const;
export type EstadoDeUnPaso = (typeof ESTADOS_DE_UN_PASO)[number];

/** Cómo está un trabajo de la IA, como lo dice la hoja: en cola, trabajando, hecho, parado en su tope o fallido. */
export const ESTADOS_DE_UN_TRABAJO = ["queued", "working", "done", "stopped", "failed"] as const;
export type EstadoDeUnTrabajo = (typeof ESTADOS_DE_UN_TRABAJO)[number];

/** Lo más que se espera a un asiento, cuántos trabajan a la vez y cuántas vueltas da la casa antes de pararse. */
export const TOPE_DE_UN_ASIENTO = { segundos: 1800 };
export const ASIENTOS_A_LA_VEZ = 6;
export const VUELTAS_DE_LA_CASA = 40;
