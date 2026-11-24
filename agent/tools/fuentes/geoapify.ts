// El enchufe de Geoapify: lo que se tarda y lo que hay de camino entre dos puntos, por cada manera de ir, sobre la
// red de calles y de transporte de verdad. Traduce lo suyo a un tipo común: el resto del agente no sabe de quién vino.
//
// Su clave no va en una cabecera, como las de las otras fuentes, sino en la dirección de cada pedido. Por eso se lee
// del entorno (GEOAPIFY_KEY), y nunca se deja en un mensaje de error: una dirección con clave no se enseña.
//
// El transporte público lo da de dos maneras: con los horarios oficiales, donde los tiene, y aproximado con las
// líneas del mapa abierto, donde no. Se pide primero el de verdad; si no hay, el aproximado, y se dice que lo es.

import type { ManeraDeIr } from "../../data/moverse.ts";
import type { Punto } from "../distancias.ts";
import { ahora, ErrorDeFuente, lista, numero, objeto, pedirJson } from "./http.ts";
import type { Origen } from "./tipos.ts";

const BASE = "https://api.geoapify.com/v1";
const FUENTE = "geoapify";

/** Cómo llama Geoapify a cada manera de ir, por orden de preferencia. */
const MODOS: Record<ManeraDeIr, string[]> = {
  walk: ["walk"],
  car: ["drive"],
  transit: ["transit", "approximated_transit"],
};
/** Los modos que no salen de horarios de verdad, sino de una cuenta sobre el mapa. */
const APROXIMADOS = new Set(["approximated_transit"]);

/** Lo más que cabe en una matriz de un pedido, en casillas. */
export const CASILLAS_DE_UNA_MATRIZ = 1000;

/** Un camino de un punto a otro por una manera de ir, como lo da una fuente de rutas. */
export type Camino = Origen & {
  manera: ManeraDeIr;
  metros: number;
  minutos: number;
  /** Verdadero si no sale de horarios o de una ruta de verdad, sino de una cuenta aproximada. */
  aproximado: boolean;
};

type Medido = { metros: number; segundos: number };

/** La clave, del entorno. Sin ella no se pide nada: no vale la que pone sola la red, porque va en la dirección. */
export function claveDeGeoapify(entorno: Record<string, string | undefined> = process.env): string {
  const clave = (entorno.GEOAPIFY_KEY ?? "").trim();
  if (!/^[A-Za-z0-9]{16,64}$/.test(clave))
    throw new ErrorDeFuente(FUENTE, 0, "falta su clave en el entorno (GEOAPIFY_KEY)");
  return clave;
}

const coordenadas = (p: Punto): string => `${p.lat},${p.lon}`;

export function direccionDeRuta(de: Punto, a: Punto, modo: string, clave: string): string {
  const pedido = new URLSearchParams({
    waypoints: `${coordenadas(de)}|${coordenadas(a)}`,
    mode: modo,
    format: "json",
    apiKey: clave,
  });
  return `${BASE}/routing?${pedido.toString()}`;
}

/** Lo que mide la primera ruta de una respuesta; null si no trae ninguna con su distancia y su tiempo. */
export function leerRuta(json: unknown): Medido | null {
  const r = objeto(lista(objeto(json).results)[0]);
  const metros = numero(r.distance);
  const segundos = numero(r.time);
  // La distancia viene en metros porque así se pide; si la fuente contestara en otra unidad, no se adivina.
  if (metros === null || segundos === null || metros < 0 || segundos < 0) return null;
  if (r.distance_units !== undefined && String(r.distance_units).toLowerCase() !== "meters") return null;
  return { metros, segundos };
}

export function cuerpoDeMatriz(origenes: Punto[], destinos: Punto[], modo: string): unknown {
  // Geoapify quiere la longitud delante, como GeoJSON.
  const sitio = (p: Punto): { location: [number, number] } => ({ location: [p.lon, p.lat] });
  return { mode: modo, sources: origenes.map(sitio), targets: destinos.map(sitio) };
}

/** La matriz de una respuesta, con una casilla por origen y destino; null donde la fuente no da ruta. */
export function leerMatriz(json: unknown, origenes: number, destinos: number): (Medido | null)[][] {
  const filas = lista(objeto(json).sources_to_targets);
  return Array.from({ length: origenes }, (_, i) =>
    Array.from({ length: destinos }, (_, j) => {
      const casilla = objeto(lista(filas[i])[j]);
      const metros = numero(casilla.distance);
      const segundos = numero(casilla.time);
      return metros === null || segundos === null || metros < 0 || segundos < 0 ? null : { metros, segundos };
    }),
  );
}

const camino = (m: Medido, manera: ManeraDeIr, modo: string): Camino => ({
  manera,
  metros: Math.round(m.metros),
  minutos: Math.max(1, Math.round(m.segundos / 60)),
  aproximado: APROXIMADOS.has(modo),
  fuente: FUENTE,
  visto: ahora(),
});

/** Un fallo de la fuente, sin la clave dentro: ni en su mensaje ni en nada que se enseñe. */
function sinClave(e: unknown, clave: string): Error {
  if (!(e instanceof ErrorDeFuente)) return new ErrorDeFuente(FUENTE, 0, "no se pudo pedir");
  const dicho = e.message.startsWith(`${FUENTE}: `) ? e.message.slice(FUENTE.length + 2) : e.message;
  return new ErrorDeFuente(FUENTE, e.estado, dicho.split(clave).join("<clave>").slice(0, 300));
}

/** Verdadero si la fuente dice que para ese pedido no tiene ruta, que no es lo mismo que fallar. */
const sinRuta = (e: unknown): boolean => e instanceof ErrorDeFuente && (e.estado === 400 || e.estado === 404);

/**
 * El camino de un punto a otro por una manera de ir. Null si la fuente no tiene ninguno: esa manera no existe ahí.
 * Si falla por otra cosa (la clave, el cupo, la red), lanza el fallo: que no haya camino no se inventa.
 */
export async function caminoEntre(de: Punto, a: Punto, manera: ManeraDeIr): Promise<Camino | null> {
  const clave = claveDeGeoapify();
  for (const modo of MODOS[manera]) {
    try {
      const medido = leerRuta(await pedirJson(FUENTE, direccionDeRuta(de, a, modo, clave)));
      if (medido !== null) return camino(medido, manera, modo);
    } catch (e) {
      if (!sinRuta(e)) throw sinClave(e, clave);
    }
  }
  return null;
}

/**
 * Los caminos de cada origen a cada destino por una manera de ir, de una vez. Null en la casilla sin ruta. No se
 * parte sola: si no cabe en un pedido, lo dice quien la pide.
 */
export async function matrizDeCaminos(
  origenes: Punto[],
  destinos: Punto[],
  manera: ManeraDeIr,
): Promise<(Camino | null)[][]> {
  if (origenes.length * destinos.length > CASILLAS_DE_UNA_MATRIZ)
    throw new ErrorDeFuente(FUENTE, 0, `la matriz pasa de ${CASILLAS_DE_UNA_MATRIZ} casillas`);
  const clave = claveDeGeoapify();
  const vacia = (): (Camino | null)[][] => origenes.map(() => destinos.map(() => null));
  if (origenes.length === 0 || destinos.length === 0) return vacia();
  let hecha = vacia();
  for (const modo of MODOS[manera]) {
    let medida: (Medido | null)[][];
    try {
      const url = `${BASE}/routematrix?${new URLSearchParams({ apiKey: clave }).toString()}`;
      medida = leerMatriz(
        await pedirJson(FUENTE, url, { metodo: "POST", cuerpo: cuerpoDeMatriz(origenes, destinos, modo) }),
        origenes.length,
        destinos.length,
      );
    } catch (e) {
      if (sinRuta(e)) continue;
      throw sinClave(e, clave);
    }
    // Lo que ya tiene camino con un modo mejor no se pisa con uno aproximado.
    hecha = hecha.map((fila, i) =>
      fila.map((ya, j) => ya ?? (medida[i][j] === null ? null : camino(medida[i][j], manera, modo))),
    );
    if (hecha.every((fila) => fila.every((c) => c !== null))) break;
  }
  return hecha;
}
