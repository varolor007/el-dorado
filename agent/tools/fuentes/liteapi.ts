// El enchufe de LiteAPI: la lista de una zona, el precio de unas noches, el detalle y las opiniones de un alojamiento.
// Leer la respuesta (las funciones «leer») va aparte de pedirla, para probarlo con datos inventados y sin internet.

import { INSTALACIONES } from "../../data/niveles.ts";
import { enLineaRecta } from "../distancias.ts";
import { ahora, clave, lista, numero, objeto, pedirJson, texto } from "./http.ts";
import type {
  Alojamiento,
  Detalle,
  Estancia,
  FuenteAlojamiento,
  Habitacion,
  Minimos,
  Opinion,
  Precio,
} from "./tipos.ts";

const BASE = "https://api.liteapi.travel/v3.0";
const NOMBRE = "liteapi";
const POR_TANDA = 50;

const cabeceras = (): Record<string, string> => ({ "X-API-Key": clave("LITEAPI_KEY") });

/**
 * Qué servicios de la fuente son una instalación de las nuestras, por su número: los que se llaman como ella y no
 * son «cerca de aquí». Sale del catálogo de servicios de la propia fuente, no de una lista escrita a mano.
 */
export function leerCatalogo(json: unknown): Map<number, string> {
  const nuestras = new Map<number, string>();
  for (const crudo of lista(objeto(json).data)) {
    const s = objeto(crudo);
    const id = numero(s.facility_id);
    const nombre = texto(s.facility);
    if (id === null || nombre === null || /nearby/i.test(nombre)) continue;
    for (const [instalacion, patron] of Object.entries(INSTALACIONES))
      if (patron.test(nombre)) nuestras.set(id, instalacion);
  }
  return nuestras;
}

export function leerLista(json: unknown, visto: string, catalogo?: Map<number, string>): Alojamiento[] {
  const salida: Alojamiento[] = [];
  for (const crudo of lista(objeto(json).data)) {
    const h = objeto(crudo);
    const id = texto(h.id);
    const lat = numero(h.latitude);
    const lon = numero(h.longitude);
    if (id === null || lat === null || lon === null) continue;
    salida.push({
      fuente: NOMBRE,
      visto,
      id,
      nombre: texto(h.name) ?? id,
      lat,
      lon,
      nota: numero(h.rating),
      opiniones: numero(h.reviewCount),
      estrellas: numero(h.stars),
      tipo: h.hotelTypeId === undefined || h.hotelTypeId === null ? null : String(h.hotelTypeId),
      // Lo que declara solo se sabe si la fuente manda sus servicios y se tiene su catálogo para leerlos.
      ...(catalogo !== undefined && Array.isArray(h.facilityIds)
        ? { declara: [...new Set(h.facilityIds.flatMap((n) => catalogo.get(Number(n)) ?? []))].sort() }
        : {}),
    });
  }
  return salida;
}

/** De cada alojamiento, su tarifa más barata para esas noches. */
export function leerPrecios(json: unknown, e: Estancia, visto: string): Precio[] {
  const salida: Precio[] = [];
  for (const crudo of lista(objeto(json).data)) {
    const h = objeto(crudo);
    const id = texto(h.hotelId);
    if (id === null) continue;
    let mejor: Precio | null = null;
    for (const tipo of lista(h.roomTypes)) {
      for (const cruda of lista(objeto(tipo).rates)) {
        const tarifa = objeto(cruda);
        const venta = objeto(tarifa.retailRate);
        const total = objeto(lista(venta.total)[0]);
        const importe = numero(total.amount);
        if (importe === null) continue;
        let aparte = 0;
        for (const t of lista(venta.taxesAndFees)) {
          const tasa = objeto(t);
          if (tasa.included !== true) aparte += numero(tasa.amount) ?? 0;
        }
        const etiqueta = texto(objeto(tarifa.cancellationPolicies).refundableTag);
        const candidata: Precio = {
          fuente: NOMBRE,
          visto,
          id,
          total: importe,
          tasasAparte: Math.round(aparte * 100) / 100,
          moneda: texto(total.currency) ?? e.moneda,
          habitacion: texto(tarifa.name),
          idHabitacion:
            tarifa.mappedRoomId === undefined || tarifa.mappedRoomId === null ? null : String(tarifa.mappedRoomId),
          regimen: texto(tarifa.boardName),
          cancelable: etiqueta === null ? null : etiqueta === "RFN",
          entrada: e.entrada,
          salida: e.salida,
          adultos: e.adultos,
          vendedor: NOMBRE,
          enlace: null,
        };
        if (mejor === null || candidata.total + candidata.tasasAparte < mejor.total + mejor.tasasAparte)
          mejor = candidata;
      }
    }
    if (mejor !== null) salida.push(mejor);
  }
  return salida;
}

/** Las clases de foto de una habitación que van por delante, por lo que enseñan de ella. */
const PRIMERO = ["bedroom", "hotel room", "bathroom", "view", "window"];

/**
 * El orden de las fotos de una habitación: la principal y, después, una de cada clase por turnos (el dormitorio, la
 * habitación, el baño, la vista y la ventana), para que las primeras enseñen de todo y no ocho veces la cama. Lo demás
 * va al final. Dentro de cada clase se respeta el orden de la fuente.
 */
export function porTurnos(fotos: { url: string; orden: number }[]): string[] {
  const principal = fotos.filter((f) => f.orden < 0).map((f) => f.url);
  const resto = fotos.filter((f) => f.orden >= PRIMERO.length).map((f) => f.url);
  const colas = PRIMERO.map((_, clase) => fotos.filter((f) => f.orden === clase).map((f) => f.url));
  const turnos: string[] = [];
  while (colas.some((cola) => cola.length > 0))
    for (const cola of colas) if (cola.length > 0) turnos.push(cola.shift()!);
  return [...principal, ...turnos, ...resto];
}

function leerHabitacion(crudo: unknown): Habitacion | null {
  const r = objeto(crudo);
  if (r.id === undefined || r.id === null) return null;
  const camas: string[] = [];
  for (const c of lista(r.bedTypes)) {
    const cama = objeto(c);
    const tipo = texto(cama.bedType);
    if (tipo !== null) camas.push(`${numero(cama.quantity) ?? 1} x ${tipo}`);
  }
  const conClase: { url: string; orden: number }[] = [];
  for (const f of lista(r.photos)) {
    const foto = objeto(f);
    const url = texto(foto.url);
    if (url === null || conClase.some((x) => x.url === url)) continue;
    const clase = PRIMERO.indexOf((texto(foto.imageClass1) ?? "").toLowerCase());
    conClase.push({ url, orden: foto.mainPhoto === true ? -1 : clase < 0 ? PRIMERO.length : clase });
  }
  const fotos = porTurnos(conClase);
  const vistas: string[] = [];
  for (const v of lista(r.views)) {
    const nombre = typeof v === "string" ? texto(v) : (texto(objeto(v).view) ?? texto(objeto(v).name));
    if (nombre !== null) vistas.push(nombre);
  }
  return {
    id: String(r.id),
    nombre: texto(r.roomName) ?? String(r.id),
    metros: numero(r.roomSizeSquare),
    camas,
    fotos,
    vistas,
  };
}

export function leerDetalle(json: unknown, visto: string): Detalle {
  const d = objeto(objeto(json).data);
  const habitaciones: Habitacion[] = [];
  for (const r of lista(d.rooms)) {
    const h = leerHabitacion(r);
    if (h !== null) habitaciones.push(h);
  }
  const fotos: string[] = [];
  for (const f of lista(d.hotelImages)) {
    const url = texto(objeto(f).url);
    if (url !== null && !fotos.includes(url)) fotos.push(url);
  }
  const servicios: string[] = [];
  for (const s of [...lista(d.facilities), ...lista(d.hotelFacilities)]) {
    const nombre = typeof s === "string" ? texto(s) : texto(objeto(s).name);
    if (nombre !== null && !servicios.includes(nombre)) servicios.push(nombre);
  }
  const horas = objeto(d.checkinCheckoutTimes);
  const analisis = objeto(d.sentiment_analysis);
  const resumen: { tema: string; nota: number | null }[] = [];
  for (const c of lista(analisis.categories)) {
    const tema = texto(objeto(c).name);
    if (tema !== null) resumen.push({ tema, nota: numero(objeto(c).rating) });
  }
  const contras: string[] = [];
  for (const c of lista(analisis.cons)) if (typeof c === "string") contras.push(c);
  return {
    fuente: NOMBRE,
    visto,
    id: texto(d.id) ?? "",
    habitaciones,
    fotos,
    servicios,
    entradaDesde: texto(horas.checkin_start),
    salidaHasta: texto(horas.checkout),
    web: texto(d.website),
    resumen,
    contras,
  };
}

export function leerOpiniones(json: unknown): Opinion[] {
  const salida: Opinion[] = [];
  for (const crudo of lista(objeto(json).data)) {
    const o = objeto(crudo);
    salida.push({
      fecha: texto(o.date)?.slice(0, 10) ?? null,
      nota: numero(o.averageScore),
      viajero: texto(o.type),
      bueno: texto(o.pros) ?? "",
      malo: texto(o.cons) ?? "",
      de: texto(o.source),
    });
  }
  return salida;
}

/** El radio más corto que acepta la fuente, en metros. Con menos, contesta que no. */
export const RADIO_MINIMO = 1000;

/** La dirección de la lista: los mínimos se piden a la fuente, y después los vuelve a comprobar el código. */
export function direccionDeLista(e: Estancia, m: Minimos): string {
  const estrellas: number[] = [];
  for (let n = Math.ceil(m.estrellas); n <= 5; n++) estrellas.push(n);
  const q = new URLSearchParams({
    countryCode: e.pais,
    latitude: String(e.lat),
    longitude: String(e.lon),
    radius: String(Math.max(e.radio, RADIO_MINIMO)),
    minRating: String(m.nota),
    minReviewsCount: String(m.opiniones),
    starRating: estrellas.join(","),
    limit: "5000",
  });
  return `${BASE}/data/hotels?${q}`;
}

/**
 * Si se pidió un radio más corto que el mínimo de la fuente, a la fuente se le pide su mínimo y aquí se quita lo
 * que cae más lejos de lo que se pidió: una zona de quinientos metros es de quinientos metros.
 */
export function dentroDelRadio(todos: Alojamiento[], e: Estancia): Alojamiento[] {
  if (e.radio >= RADIO_MINIMO) return todos;
  return todos.filter((a) => enLineaRecta({ lat: a.lat, lon: a.lon }, { lat: e.lat, lon: e.lon }) <= e.radio);
}

export function cuerpoDePrecios(ids: string[], e: Estancia): Record<string, unknown> {
  const ocupacion: Record<string, unknown> = { adults: e.adultos };
  if (e.ninos.length > 0) ocupacion.children = e.ninos;
  return {
    hotelIds: ids,
    checkin: e.entrada,
    checkout: e.salida,
    occupancies: [ocupacion],
    currency: e.moneda,
    guestNationality: e.nacionalidad,
    timeout: 25,
    maxRatesPerHotel: 1,
    roomMapping: true,
  };
}

let catalogoPedido: Promise<Map<number, string>> | null = null;

/** El catálogo de servicios se pide una vez por proceso. Si falla, se sigue sin él: no se sabrá qué declara nadie. */
function elCatalogo(): Promise<Map<number, string> | undefined> {
  catalogoPedido ??= pedirJson(NOMBRE, `${BASE}/data/facilities`, { cabeceras: cabeceras() }).then(leerCatalogo);
  return catalogoPedido.catch(() => {
    catalogoPedido = null;
    return undefined;
  });
}

export const liteapi: FuenteAlojamiento = {
  nombre: NOMBRE,

  async lista(e, m) {
    const catalogo = await elCatalogo();
    const json = await pedirJson(NOMBRE, direccionDeLista(e, m), { cabeceras: cabeceras() });
    return dentroDelRadio(leerLista(json, ahora(), catalogo), e);
  },

  async precios(ids, e) {
    const salida: Precio[] = [];
    for (let i = 0; i < ids.length; i += POR_TANDA) {
      const cuerpo = cuerpoDePrecios(ids.slice(i, i + POR_TANDA), e);
      const json = await pedirJson(NOMBRE, `${BASE}/hotels/rates`, {
        metodo: "POST",
        cuerpo,
        cabeceras: cabeceras(),
        esperaMs: 120_000,
      });
      salida.push(...leerPrecios(json, e, ahora()));
    }
    return salida;
  },

  async detalle(id) {
    const q = new URLSearchParams({ hotelId: id });
    return leerDetalle(await pedirJson(NOMBRE, `${BASE}/data/hotel?${q}`, { cabeceras: cabeceras() }), ahora());
  },

  async opiniones(id, cuantas) {
    const q = new URLSearchParams({ hotelId: id, limit: String(cuantas), timeout: "12" });
    return leerOpiniones(await pedirJson(NOMBRE, `${BASE}/data/reviews?${q}`, { cabeceras: cabeceras() }));
  },
};
