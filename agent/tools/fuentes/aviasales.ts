// El enchufe de Aviasales (por Travelpayouts): precios de vuelos guardados de búsquedas de otras personas. Son de hace
// horas o días: cada uno lleva la fecha en que se vio, y nunca se presenta como una oferta de ahora.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ahora, clave, lista, numero, objeto, pedirJson, texto } from "./http.ts";
import type { Aeropuerto, Ciudad, DiaBarato, FuenteTransporte, LugaresDeVuelo, Trayecto, Vuelo } from "./tipos.ts";

export type { Trayecto } from "./tipos.ts";

const BASE = "https://api.travelpayouts.com/aviasales/v3";
const DATOS = "https://api.travelpayouts.com/data";
const SEMANA = "https://api.travelpayouts.com/v2/prices/week-matrix";
const NOMBRE = "aviasales";
const WEB = "https://www.aviasales.com";

const cabeceras = (): Record<string, string> => ({ "X-Access-Token": clave("TRAVELPAYOUTS_TOKEN") });

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
      // La fuente no pregunta cuántos viajan: lo que guarda es lo que pagó alguien por un billete.
      pasajeros: 1,
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

/** Un día AAAA-MM-DD como lo pone la web de la fuente en sus búsquedas: DDMM. */
const ddmm = (dia: string): string => `${dia.slice(8, 10)}${dia.slice(5, 7)}`;

/**
 * El enlace a la búsqueda de ese vuelo en la web de la fuente, para un viajero: allí se ve el precio de ahora. Es
 * para los precios que no traen el suyo. Con códigos o fechas que no son lo que parecen, no hay enlace.
 */
export function enlaceDeBusqueda(origen: string, destino: string, ida: string, vuelta: string | null): string | null {
  const codigo = /^[A-Z]{3}$/;
  const dia = /^\d{4}-\d{2}-\d{2}$/;
  if (!codigo.test(origen) || !codigo.test(destino) || !dia.test(ida) || (vuelta !== null && !dia.test(vuelta)))
    return null;
  return `${WEB}/search/${origen}${ddmm(ida)}${destino}${vuelta === null ? "" : ddmm(vuelta)}1`;
}

/**
 * Los precios de la semana de alrededor (tres días antes y tres después, a la ida y a la vuelta), tal como los
 * guarda la fuente. Cada uno dice el día en que se vio y cuántas escalas lleva; no dice la aerolínea, ni de qué
 * aeropuerto de la ciudad sale.
 */
export function leerSemana(json: unknown, t: Trayecto, pedido: string): Vuelo[] {
  const salida: Vuelo[] = [];
  for (const crudo of lista(objeto(json).data)) {
    const v = objeto(crudo);
    const precio = numero(v.value);
    const sale = texto(v.depart_date);
    if (precio === null || sale === null || !/^\d{4}-\d{2}-\d{2}$/.test(sale)) continue;
    const vuelve = texto(v.return_date);
    if (t.vuelta !== null && (vuelve === null || !/^\d{4}-\d{2}-\d{2}$/.test(vuelve))) continue;
    const visto = texto(v.found_at);
    const origen = texto(v.origin) ?? t.origen;
    const destino = texto(v.destination) ?? t.destino;
    salida.push({
      fuente: NOMBRE,
      visto: visto !== null && !Number.isNaN(new Date(visto).getTime()) ? visto : pedido,
      origen,
      destino,
      sale,
      vuelve: t.vuelta === null ? null : vuelve,
      aerolinea: null,
      numero: null,
      precio,
      pasajeros: 1,
      moneda: t.moneda,
      // La fuente da un solo número de escalas para el billete: va con la ida, y la vuelta queda sin saber.
      escalasIda: numero(v.number_of_changes),
      escalasVuelta: null,
      minutos: numero(v.duration) || null,
      guardado: true,
      enlace: enlaceDeBusqueda(origen, destino, sale, t.vuelta === null ? null : vuelve),
    });
  }
  return salida;
}

/** Los vuelos guardados de los días de alrededor, en una sola petición. */
export async function vuelosDeLaSemana(t: Trayecto): Promise<Vuelo[]> {
  const q = new URLSearchParams({
    origin: t.origen,
    destination: t.destino,
    depart_date: t.ida,
    return_date: t.vuelta ?? t.ida,
    currency: t.moneda.toLowerCase(),
    market: t.mercado,
    show_to_affiliates: "true",
  });
  return leerSemana(await pedirJson(NOMBRE, `${SEMANA}?${q}`, { cabeceras: cabeceras() }), t, ahora());
}

const codigoDeLaFuente = (v: unknown): string | null => {
  const c = texto(v);
  return c !== null && /^[A-Z]{3}$/.test(c) ? c : null;
};
const punto = (v: unknown): { lat: number; lon: number } | null => {
  const c = objeto(v);
  const lat = numero(c.lat);
  const lon = numero(c.lon);
  return lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 ? null : { lat, lon };
};

/**
 * Los aeropuertos con vuelos y las ciudades, de los tres archivos de datos de la fuente. Un aeropuerto vale si la
 * fuente dice que es un aeropuerto con vuelos y si sale de él alguna ruta sin escala: las estaciones de tren o de
 * autobús que también lista no traen precios de tren, así que no cuentan.
 */
export function leerLugares(aeropuertos: unknown, ciudades: unknown, rutas: unknown): LugaresDeVuelo {
  const destinos = new Map<string, Set<string>>();
  for (const crudo of lista(rutas)) {
    const r = objeto(crudo);
    const de = codigoDeLaFuente(r.departure_airport_iata);
    const a = codigoDeLaFuente(r.arrival_airport_iata);
    if (de === null || a === null || numero(r.transfers) !== 0) continue;
    if (!destinos.has(de)) destinos.set(de, new Set());
    destinos.get(de)!.add(a);
  }
  const nombres = new Map<string, string>();
  const salidaCiudades: Ciudad[] = [];
  for (const crudo of lista(ciudades)) {
    const c = objeto(crudo);
    const codigo = codigoDeLaFuente(c.code);
    const nombre = texto(c.name);
    const pais = texto(c.country_code);
    const donde = punto(c.coordinates);
    if (codigo === null || nombre === null) continue;
    nombres.set(codigo, nombre);
    if (pais !== null && /^[A-Z]{2}$/.test(pais) && donde !== null)
      salidaCiudades.push({ codigo, nombre, pais, ...donde });
  }
  const salida: Aeropuerto[] = [];
  for (const crudo of lista(aeropuertos)) {
    const a = objeto(crudo);
    const codigo = codigoDeLaFuente(a.code);
    const ciudad = codigoDeLaFuente(a.city_code) ?? codigo;
    const pais = texto(a.country_code);
    const donde = punto(a.coordinates);
    if (codigo === null || ciudad === null || pais === null || !/^[A-Z]{2}$/.test(pais) || donde === null) continue;
    if (a.iata_type !== "airport" || a.flightable !== true) continue;
    const cuantas = destinos.get(codigo)?.size ?? 0;
    if (cuantas === 0) continue;
    salida.push({
      codigo,
      ciudad,
      nombre: nombres.get(ciudad) ?? texto(a.name) ?? codigo,
      pais,
      ...donde,
      rutas: cuantas,
    });
  }
  return { aeropuertos: salida, ciudades: salidaCiudades };
}

/** Lo que se guarda de los datos de lugares: un día. Cambian poco, y son tres archivos grandes. */
const HORAS_DE_LOS_LUGARES = 24;
let enMemoria: { cuando: number; lugares: LugaresDeVuelo } | null = null;

/**
 * Los aeropuertos y las ciudades de la fuente. Se bajan una vez al día y se guardan ya leídos en la carpeta que se
 * diga (la mesa, fuera del repositorio), o solo en memoria si no se dice ninguna.
 */
export async function lugaresDeVuelo(carpeta?: string, hoy: Date = new Date()): Promise<LugaresDeVuelo> {
  const vale = (cuando: number): boolean => hoy.getTime() - cuando < HORAS_DE_LOS_LUGARES * 3_600_000;
  if (enMemoria !== null && vale(enMemoria.cuando)) return enMemoria.lugares;
  const archivo = carpeta === undefined ? null : join(carpeta, "aviasales-lugares.json");
  if (archivo !== null && existsSync(archivo)) {
    try {
      const guardado = JSON.parse(readFileSync(archivo, "utf8")) as { cuando: number; lugares: LugaresDeVuelo };
      if (vale(guardado.cuando)) return (enMemoria = guardado).lugares;
    } catch {
      // Un archivo a medias se vuelve a bajar.
    }
  }
  const pedir = (nombre: string): Promise<unknown> =>
    pedirJson(NOMBRE, `${DATOS}/${nombre}`, { cabeceras: cabeceras(), esperaMs: 120_000 });
  const [aeropuertos, ciudades, rutas] = await Promise.all([
    pedir("en/airports.json"),
    pedir("en/cities.json"),
    pedir("routes.json"),
  ]);
  enMemoria = { cuando: hoy.getTime(), lugares: leerLugares(aeropuertos, ciudades, rutas) };
  if (archivo !== null) {
    mkdirSync(carpeta!, { recursive: true, mode: 0o700 });
    writeFileSync(archivo, JSON.stringify(enMemoria), { mode: 0o600 });
  }
  return enMemoria.lugares;
}

/** Aviasales como fuente de transporte: sus lugares, los precios de unas fechas y los de la semana de alrededor. */
export function aviasales(carpeta?: string): FuenteTransporte {
  return {
    nombre: NOMBRE,
    lugares: () => lugaresDeVuelo(carpeta),
    fechas: vuelosPorFechas,
    alrededor: vuelosDeLaSemana,
  };
}
