// Cómo se escribe cada cosa en la web: el dinero, las fechas, lo que se anda, las coordenadas y los enlaces al mapa.

import type { Punto } from "../../../agent/output/viaje.ts";
import { minutosAndando } from "../../../agent/tools/distancias.ts";

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

/** El enlace de un día entero a Google Maps, andando. Google admite pocas paradas intermedias: van las que caben. */
export function diaEnGoogleMaps(puntos: Punto[]): string | null {
  if (puntos.length < 2) return null;
  const a = (p: Punto): string => `${p.lat},${p.lon}`;
  const intermedias = puntos.slice(1, -1).slice(0, 3).map(a).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${a(puntos[0])}`;
  const paradas = intermedias ? `&waypoints=${encodeURIComponent(intermedias)}` : "";
  return `${base}&destination=${a(puntos[puntos.length - 1])}${paradas}`;
}
