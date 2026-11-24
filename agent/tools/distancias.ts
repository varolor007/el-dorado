// Las distancias: lo que se anda de un sitio a otro. Es la línea recta con un margen, porque las calles no van
// rectas; la ruta exacta se deja a Google Maps, con un enlace. No sale a internet ni usa nada de fuera: lo corren
// igual la casa y la web, y la misma entrada da siempre el mismo número.

import { MANERAS_DE_IR, RITMO_DE_IR, TRAMO_DE_CERCA, type ManeraDeIr } from "../data/moverse.ts";

export type Punto = { lat: number; lon: number };

const RADIO_DE_LA_TIERRA = 6_371_000;

/** Lo que se anda de más sobre la línea recta. */
export const RODEO = 1.3;

/** El paso de quien pasea por una ciudad, en metros por minuto: cuatro kilómetros y medio por hora. */
export const PASO = 75;

/** Los metros en línea recta entre dos puntos del mapa. */
export function enLineaRecta(a: Punto, b: Punto): number {
  const rad = (g: number): number => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_DE_LA_TIERRA * Math.asin(Math.sqrt(h));
}

/** Lo que se anda de un sitio a otro: la línea recta con su rodeo, redondeada a la decena. */
export function andando(a: Punto, b: Punto): number {
  return Math.round((enLineaRecta(a, b) * RODEO) / 10) * 10;
}

/** Los minutos que lleva andar unos metros, a paso de ciudad. Nunca menos de uno. */
export function minutosAndando(metros: number): number {
  return Math.max(1, Math.round(metros / PASO));
}

/** Las maneras de ir que tienen sentido para una distancia: ni coche para cruzar la calle, ni andar diez kilómetros. */
export function manerasDeIr(metros: number): ManeraDeIr[] {
  return MANERAS_DE_IR.filter((m) => metros >= m.desde && metros <= m.hasta).map((m) => m.id);
}

/** Lo que se tarda con una manera, en minutos. Andando, por el paso; con lo demás, una cuenta aproximada. */
export function minutosPor(manera: ManeraDeIr, metros: number): number {
  if (manera === "walk") return minutosAndando(metros);
  const r = RITMO_DE_IR[manera];
  const cerca = Math.min(metros, TRAMO_DE_CERCA);
  return Math.max(1, Math.round(r.fijos + cerca / r.cerca + (metros - cerca) / r.lejos));
}

/** Un trayecto: su distancia, las maneras que tienen sentido y lo que se tarda con la que se cuenta. */
export type Trayecto = { metros: number; maneras: ManeraDeIr[]; aPie: boolean; minutos: number };

/**
 * Un trayecto de unos metros de camino. Si se puede andar, se cuenta andando: es lo que no cuesta y lo que siempre
 * hay. Si no, se cuenta con la más rápida de las que tienen sentido, y ese tiempo es aproximado.
 */
export function trayecto(metros: number): Trayecto {
  const maneras = manerasDeIr(metros);
  const aPie = maneras.includes("walk");
  const minutos = aPie ? minutosAndando(metros) : Math.min(...maneras.map((m) => minutosPor(m, metros)));
  return { metros, maneras, aPie, minutos };
}

/** Los minutos andando de un sitio a otro. */
export function minutosEntre(a: Punto, b: Punto): number {
  return minutosAndando(andando(a, b));
}

/** Los metros de camino a los que queda la mitad de unos sitios, o menos: la mediana. Sin sitios, no hay. */
export function medianaDeCamino(desde: Punto, hasta: Punto[]): number | null {
  if (hasta.length === 0) return null;
  const metros = hasta.map((p) => andando(desde, p)).sort((a, b) => a - b);
  const medio = Math.floor(metros.length / 2);
  return metros.length % 2 === 1 ? metros[medio] : Math.round((metros[medio - 1] + metros[medio]) / 2);
}

/** Los minutos andando, de media, desde un sitio hasta cada uno de otros. Sin sitios a los que ir, no hay media. */
export function mediaAndando(desde: Punto, hasta: Punto[]): number | null {
  if (hasta.length === 0) return null;
  return Math.round(hasta.reduce((suma, p) => suma + minutosEntre(desde, p), 0) / hasta.length);
}

/**
 * Los minutos andando a los que queda la mitad de unos sitios, o menos: la mediana. Dice lo cerca que está un
 * alojamiento de lo que se va a ver sin que lo hunda lo que está lejos para todos, como una excursión al otro lado
 * de la ciudad. Sin sitios a los que ir, no hay medida.
 */
export function medianaAndando(desde: Punto, hasta: Punto[]): number | null {
  if (hasta.length === 0) return null;
  const minutos = hasta.map((p) => minutosEntre(desde, p)).sort((a, b) => a - b);
  const medio = Math.floor(minutos.length / 2);
  return minutos.length % 2 === 1 ? minutos[medio] : Math.round((minutos[medio - 1] + minutos[medio]) / 2);
}

/** El punto medio de unos cuantos. */
export function centroDe(puntos: Punto[]): Punto {
  if (puntos.length === 0) throw new Error("no hay puntos de los que sacar el centro");
  return {
    lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
    lon: puntos.reduce((s, p) => s + p.lon, 0) / puntos.length,
  };
}
