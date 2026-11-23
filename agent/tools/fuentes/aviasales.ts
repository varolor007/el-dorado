// El enchufe de Aviasales (por Travelpayouts): precios de vuelos guardados de búsquedas de otras personas. Son de hace
// horas o días: cada uno lleva la fecha en que se vio, y nunca se presenta como una oferta de ahora.

import { ahora, clave, lista, numero, objeto, pedirJson, texto } from "./http.ts";
import type { DiaBarato, Vuelo } from "./tipos.ts";

const BASE = "https://api.travelpayouts.com/aviasales/v3";
const NOMBRE = "aviasales";
const WEB = "https://www.aviasales.com";

const cabeceras = (): Record<string, string> => ({ "X-Access-Token": clave("TRAVELPAYOUTS_TOKEN") });

export type Trayecto = {
  origen: string;
  destino: string;
  ida: string;
  vuelta: string | null;
  moneda: string;
  mercado: string;
};

/** El día en que se vio el precio viene dentro del enlace, como DDMMAAAA. Si no es un día que exista, no se sabe. */
export function vistoEnEnlace(enlace: string | null): string | null {
  const m = /[?&]search_date=(\d{2})(\d{2})(\d{4})/.exec(enlace ?? "");
  if (m === null) return null;
  const dia = `${m[3]}-${m[2]}-${m[1]}`;
  // Ocho cifras no son una fecha: el 99 del mes 99 no existe, y el 31 de febrero tampoco.
  const fecha = new Date(`${dia}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === dia ? dia : null;
}

/**
 * El enlace de un vuelo. La fuente lo da como un camino dentro de su web: se resuelve contra ella y solo vale si se
 * queda en ella, por https y sin usuario ni clave. Pegar el camino detrás de la web no basta: con una arroba o un
 * punto delante, la máquina del enlace sería otra.
 */
export function enlaceDeVuelo(camino: string | null): string | null {
  if (camino === null) return null;
  try {
    const u = new URL(camino, WEB);
    return u.origin === new URL(WEB).origin && u.username === "" && u.password === "" ? u.href : null;
  } catch {
    return null;
  }
}

export function leerVuelos(json: unknown, t: Trayecto, pedido: string): Vuelo[] {
  const salida: Vuelo[] = [];
  for (const crudo of lista(objeto(json).data)) {
    const v = objeto(crudo);
    const precio = numero(v.price);
    const sale = texto(v.departure_at);
    if (precio === null || sale === null) continue;
    const enlace = texto(v.link);
    salida.push({
      fuente: NOMBRE,
      visto: vistoEnEnlace(enlace) ?? pedido,
      origen: texto(v.origin_airport) ?? t.origen,
      destino: texto(v.destination_airport) ?? t.destino,
      sale,
      vuelve: texto(v.return_at),
      aerolinea: texto(v.airline),
      numero: v.flight_number === undefined || v.flight_number === null ? null : String(v.flight_number),
      precio,
      moneda: t.moneda,
      escalasIda: numero(v.transfers),
      escalasVuelta: t.vuelta === null ? null : numero(v.return_transfers),
      minutos: numero(v.duration),
      guardado: true,
      enlace: enlaceDeVuelo(enlace),
    });
  }
  return salida;
}

export function leerCalendario(json: unknown, moneda: string, pedido: string): DiaBarato[] {
  const salida: DiaBarato[] = [];
  for (const [dia, crudo] of Object.entries(objeto(objeto(json).data))) {
    const precio = numero(objeto(crudo).price);
    if (precio !== null) salida.push({ fuente: NOMBRE, visto: pedido, dia, precio, moneda });
  }
  return salida.sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Los vuelos más baratos vistos para esas fechas. Si no hay ninguno guardado, devuelve una lista vacía. */
export async function vuelosPorFechas(t: Trayecto): Promise<Vuelo[]> {
  const q = new URLSearchParams({
    origin: t.origen,
    destination: t.destino,
    departure_at: t.ida,
    one_way: t.vuelta === null ? "true" : "false",
    direct: "false",
    sorting: "price",
    currency: t.moneda.toLowerCase(),
    market: t.mercado,
    limit: "30",
    page: "1",
  });
  if (t.vuelta !== null) q.set("return_at", t.vuelta);
  return leerVuelos(await pedirJson(NOMBRE, `${BASE}/prices_for_dates?${q}`, { cabeceras: cabeceras() }), t, ahora());
}

/** El precio más barato de cada día de salida de un mes (AAAA-MM), para un viaje de tantas noches. */
export async function diasBaratos(t: Trayecto, mes: string, noches: number): Promise<DiaBarato[]> {
  const q = new URLSearchParams({
    origin: t.origen,
    destination: t.destino,
    departure_at: mes,
    group_by: "departure_at",
    trip_duration: String(noches),
    currency: t.moneda.toLowerCase(),
    market: t.mercado,
  });
  const json = await pedirJson(NOMBRE, `${BASE}/grouped_prices?${q}`, { cabeceras: cabeceras() });
  return leerCalendario(json, t.moneda, ahora());
}
