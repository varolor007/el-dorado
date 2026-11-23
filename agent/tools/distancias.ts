// Las distancias: lo que se anda de un sitio a otro. Es la línea recta con un margen, porque las calles no van
// rectas; la ruta exacta se deja a Google Maps, con un enlace. No sale a internet ni usa nada de fuera: lo corren
// igual la casa y la web, y la misma entrada da siempre el mismo número.

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

/** Los minutos andando de un sitio a otro. */
export function minutosEntre(a: Punto, b: Punto): number {
  return minutosAndando(andando(a, b));
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
