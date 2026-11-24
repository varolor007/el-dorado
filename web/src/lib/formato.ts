// Cómo se escribe cada cosa en la web: el dinero, las fechas, lo que se anda, las coordenadas y los enlaces al mapa.

import type { Punto } from "../../../agent/output/viaje.ts";
import type { ManeraDeIr } from "../../../agent/data/moverse.ts";
import { trayectoEntre, type Caminos } from "../../../agent/tools/caminos.ts";
import { minutosAndando, trayecto } from "../../../agent/tools/distancias.ts";

export function dinero(total: number, moneda: string, idioma: string): string {
  return new Intl.NumberFormat(idioma, { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(total);
}

/** «12 feb»: el día y el mes, en corto. */
export function diaCorto(fecha: string, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(fecha + "T00:00:00Z"),
  );
}

/** «vie»: el día de la semana, en corto. */
export function diaDeLaSemana(fecha: string, idioma: string): string {
  return new Intl.DateTimeFormat(idioma, { weekday: "short", timeZone: "UTC" }).format(new Date(fecha + "T00:00:00Z"));
}

export function noches(entrada: string, salida: string): number {
  return Math.round((Date.parse(salida) - Date.parse(entrada)) / 86_400_000);
}

/** Lo que se anda, en metros hasta el kilómetro y en kilómetros después; y en minutos, a paso de ciudad. */
export function andar(metros: number, idioma: string): { lejos: string; minutos: number } {
  const lejos =
    metros < 1000
      ? `${Math.round(metros / 10) * 10} m`
      : `${new Intl.NumberFormat(idioma, { maximumFractionDigits: 1 }).format(metros / 1000)} km`;
  return { lejos, minutos: minutosAndando(metros) };
}

/** «1 h 30 min». */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Las coordenadas, como en una carta: 38.7107° N, 9.1390° W. */
export function coordenadas(p: Punto): string {
  const lat = `${Math.abs(p.lat).toFixed(4)}° ${p.lat >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(p.lon).toFixed(4)}° ${p.lon >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

/** El enlace de un sitio a Google Maps. No pide clave. */
export function enGoogleMaps(p: Punto, nombre?: string): string {
  const q = nombre === undefined ? `${p.lat},${p.lon}` : `${nombre} @${p.lat},${p.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * Cómo se hace un trayecto: lo que hay de camino y, si se anda, lo que se tarda a pie; si no, las maneras que tienen
 * sentido y lo que se tarda con la más rápida, que es una cuenta aproximada y no una ruta.
 */
export function ir(metros: number, idioma: string): { lejos: string; minutos: number; cogiendo: ManeraDeIr[] } {
  const t = trayecto(metros);
  return { lejos: andar(metros, idioma).lejos, minutos: t.minutos, cogiendo: t.aPie ? [] : t.maneras };
}

/** Un trayecto dicho: lo que hay, lo que se tarda, lo que hay que coger y de dónde sale el tiempo. */
export type Ir = { lejos: string; minutos: number; cogiendo: ManeraDeIr[]; segun: "fuente" | "casa" };

/**
 * Cómo se hace un trayecto de un punto a otro, con la tabla de caminos del viaje si la hay: lo que dijo la fuente de
 * rutas (a pie, con sus cuestas; en coche, sin tráfico) o, si no está, la cuenta de la casa, que es aproximada.
 */
export function irEntre(de: Punto, a: Punto, c: Caminos | undefined, idioma: string): Ir {
  const t = trayectoEntre(de, a, c);
  return {
    lejos: andar(t.metros, idioma).lejos,
    minutos: t.minutos,
    cogiendo: t.aPie ? [] : t.maneras,
    segun: t.segun,
  };
}

/**
 * El enlace de un día entero a Google Maps. Va andando si todo el día se anda; si algún trayecto no, se deja que
 * Google proponga cómo ir. Google admite pocas paradas intermedias: van las que caben.
 */
export function diaEnGoogleMaps(puntos: Punto[], aPie = true): string | null {
  if (puntos.length < 2) return null;
  const a = (p: Punto): string => `${p.lat},${p.lon}`;
  const intermedias = puntos.slice(1, -1).slice(0, 3).map(a).join("|");
  const modo = aPie ? "&travelmode=walking" : "";
  const base = `https://www.google.com/maps/dir/?api=1${modo}&origin=${a(puntos[0])}`;
  const paradas = intermedias ? `&waypoints=${encodeURIComponent(intermedias)}` : "";
  return `${base}&destination=${a(puntos[puntos.length - 1])}${paradas}`;
}

/**
 * El enlace de un trayecto a Google Maps, de un punto a otro. Si se anda, va andando; si no, se deja que Google
 * proponga cómo ir: ahí ve el viajero las maneras que hay de verdad, lo que tarda cada una y, si lo sabe, lo que
 * cuesta. Es un enlace: no pide clave, y lo que enseña Google se queda en Google.
 */
export function trayectoEnGoogleMaps(de: Punto, a: Punto, aPie: boolean): string {
  const modo = aPie ? "&travelmode=walking" : "";
  return `https://www.google.com/maps/dir/?api=1${modo}&origin=${de.lat},${de.lon}&destination=${a.lat},${a.lon}`;
}

/** Lo que se ha gastado de una clave de IA, en dólares y con sus céntimos: aquí unos céntimos sí cuentan. */
export function gastoDeIA(usd: number, idioma: string): string {
  return new Intl.NumberFormat(idioma, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}
