// Los enlaces de un viaje (3.13): el de cada pieza, a donde se encontró su precio, y el de cada parada y cada día, a
// Google Maps. Solo direcciones https, sin usuario ni clave dentro. Sin nada de Node: lo usan la casa y la web.
//
// Los enlaces van sin marca de afiliado: si llevan la nuestra lo decide el PM (3.9). Ninguno pide clave ni la lleva.

import type { Punto } from "../output/viaje.ts";

/** Una dirección que la web puede abrir: https, sin usuario ni clave dentro. */
export function enlaceQueVale(texto: unknown): texto is string {
  if (typeof texto !== "string" || texto.length > 2048) return false;
  try {
    const u = new URL(texto);
    return u.protocol === "https:" && u.username === "" && u.password === "" && u.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Lo que no puede ir en un enlace que ve el viajero: una clave, un token o una firma de quien lo pidió. Si un enlace
 * de una fuente trae algo así, no se enseña.
 */
const CON_CLAVE = /^(?:api[_-]?key|apikey|key|token|access[_-]?token|secret|signature|sig|auth|password|pass)$/i;

/** Verdadero si un enlace vale y no lleva dentro, en su consulta, nada con nombre de clave. */
export function enlaceSinClaves(texto: unknown): texto is string {
  if (!enlaceQueVale(texto)) return false;
  const u = new URL(texto);
  for (const nombre of u.searchParams.keys()) if (CON_CLAVE.test(nombre)) return false;
  return true;
}

const punto = (p: Punto): string => `${p.lat},${p.lon}`;

/** El enlace de un sitio a Google Maps, por su nombre y su punto. No pide clave. */
export function sitioEnGoogleMaps(p: Punto, nombre?: string): string {
  const q = nombre === undefined || nombre.trim() === "" ? punto(p) : `${nombre} @${punto(p)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Las paradas intermedias que admite un enlace de Google Maps sin clave: van las que caben. */
export const PARADAS_INTERMEDIAS = 3;

/**
 * El enlace de un día entero a Google Maps, de un punto a otro por los de en medio. Va andando si todo el día se
 * anda; si no, se deja que Google proponga cómo ir. Con menos de dos puntos no hay camino.
 */
export function diaEnGoogleMaps(puntos: Punto[], aPie: boolean): string | null {
  if (puntos.length < 2) return null;
  const intermedias = puntos.slice(1, -1).slice(0, PARADAS_INTERMEDIAS).map(punto).join("|");
  const modo = aPie ? "&travelmode=walking" : "";
  const paradas = intermedias === "" ? "" : `&waypoints=${encodeURIComponent(intermedias)}`;
  return (
    `https://www.google.com/maps/dir/?api=1${modo}&origin=${punto(puntos[0])}` +
    `&destination=${punto(puntos[puntos.length - 1])}${paradas}`
  );
}
