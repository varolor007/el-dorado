// El primer vistazo: lo que se sabe en segundos, sin IA y sin cuenta, con el destino, las fechas y el grupo. Cuántos
// alojamientos hay, cuántos pasan unos mínimos de partida y desde cuánto para esas noches, zona a zona, y los días
// baratos para volar ese mes, si se sabe de dónde se sale. Es la búsqueda de alojamiento en su forma más ligera: sin
// la ruta (todavía no la ha hecho nadie), así que parte de la caja del destino; una lista por zona como mucho, los
// mínimos bajados aquí mismo sin volver a pedir, el precio de unos pocos y nada de fichas, ni de detalle ni de
// opiniones. Lo que no llega a tiempo no se espera: se dice que va a medias.
//
// Sin nada de Node: la web usa `paraElVistazo` para saber qué pedir.

import { CANDIDATOS_QUE_BASTAN, ESCALERA_DE_MINIMOS, RADIO_MAXIMO } from "../data/cribas.ts";
import { monedaDe } from "../data/monedas.ts";
import {
  ESPERA_DEL_VISTAZO,
  LISTAS_A_LA_VEZ,
  POR_TANDA,
  PRECIOS_DEL_VISTAZO,
  PUNTOS_DEL_VISTAZO,
  ZONAS_POR_LADO,
} from "../data/vistazo.ts";
import type { DiasParaVolar, Punto, Vistazo, ZonaDelVistazo } from "../output/viaje.ts";
import { enLineaRecta } from "../tools/distancias.ts";
import type {
  Alojamiento,
  Estancia,
  FuenteAlojamiento,
  FuenteTransporte,
  Minimos,
  Trayecto,
} from "../tools/fuentes/tipos.ts";
import { entendidoDe, type Respuestas } from "./empezar.ts";
import type { Caja, Entendido } from "./formas.ts";
import { separar } from "./minimos.ts";
import { lugaresDelViaje, normalizado, parPrincipal } from "./transporte.ts";

/**
 * Lo de fuera que usa el primer vistazo: la fuente de alojamiento y, si la hay, la de transporte, que da los días
 * baratos con los mismos aeropuertos que la búsqueda de transporte.
 */
export type FuentesDelVistazo = {
  alojamiento: FuenteAlojamiento;
  transporte?: FuenteTransporte;
};

/** Por qué no hay vistazo: la fuente no contesta, o no contesta a tiempo. La frase la pone la web. */
export class FalloDelVistazo extends Error {
  constructor(clave: "no_sources" | "too_slow") {
    super(clave);
  }
}

/** Cuánto espera cada parte, en milisegundos. Las pruebas lo acortan. */
export type Esperas = { lista: number; precios: number; vuelos: number };
const ESPERAS: Esperas = {
  lista: ESPERA_DEL_VISTAZO.lista * 1000,
  precios: ESPERA_DEL_VISTAZO.precios * 1000,
  vuelos: ESPERA_DEL_VISTAZO.vuelos * 1000,
};

const PAIS = /^[A-Za-z]{2}$/;

/**
 * Lo entendido con que se pide el primer vistazo, de las respuestas de quien aún no ha contestado nada. Lo que la
 * casa no supone al investigar (la moneda, el pasaporte), aquí se pone con lo más probable, porque solo es para mirar:
 * el país es el de donde sale, si lo ha dicho, o el de su navegador, o el del destino; y la moneda, la que dijo o la
 * de ese país. Una edad de niño sin decir no se supone: sin ella no hay vistazo nuevo, y se queda el de antes.
 */
export function paraElVistazo(r: Respuestas, paisDeQuienMira: string | null): Entendido | null {
  const pais = [r.origen?.pais, paisDeQuienMira, r.destino.pais].find((p) => typeof p === "string" && PAIS.test(p));
  if (pais === undefined || pais === null) return null;
  const moneda = r.moneda ?? monedaDe(pais) ?? monedaDe(r.destino.pais);
  const viajeros = (r.adultos ?? 2) + r.ninos.length;
  const pasaportes =
    r.pasaportes === null
      ? Array.from({ length: viajeros }, () => pais.toUpperCase())
      : r.pasaportes.map((p) => (PAIS.test(p) ? p : pais.toUpperCase()));
  return entendidoDe({ ...r, moneda, pasaportes }).entendido;
}

const redondo = (x: number): number => Math.round(x * 1000) / 1000;

/**
 * Lo que cambia un primer vistazo, en una línea: el destino, las fechas, el grupo, la moneda, el pasaporte, de dónde
 * se sale (su nombre, su país, su punto o su aeropuerto: de ahí salen los aeropuertos de los días baratos) y el
 * aeropuerto de llegada. Dos peticiones con la misma línea tienen la misma respuesta; lo demás (el gasto, lo que
 * busca) no lo cambia.
 */
export function claveDelVistazo(e: Entendido): string {
  const d = e.destination;
  return JSON.stringify([
    d.country.toUpperCase(),
    redondo(d.centre.lat),
    redondo(d.centre.lon),
    [d.box.west, d.box.south, d.box.east, d.box.north].map(redondo),
    e.dates.check_in,
    e.dates.check_out,
    e.travellers.adults,
    [...e.travellers.children].sort((a, b) => a - b),
    e.travellers.rooms,
    e.currency.toUpperCase(),
    (e.travellers.passports[0] ?? e.origin?.country ?? "").toUpperCase(),
    origenDe(e.origin),
    d.airport,
  ]);
}

/** De dónde se sale, para la clave: lo que decide sus aeropuertos. */
function origenDe(o: Entendido["origin"]): unknown {
  if (o === null) return null;
  const c = o.centre;
  return [
    normalizado(o.name),
    o.country.toUpperCase(),
    o.airport ?? null,
    c == null ? null : [redondo(c.lat), redondo(c.lon)],
  ];
}

// ---------- las zonas: la caja del destino, partida en trozos

/** Un trozo de la caja. Su este puede pasar de 180 si la caja cruza el meridiano: así se cuenta sin saltos. */
type Trozo = { id: string; oeste: number; sur: number; este: number; norte: number };

const longitud = (x: number): number => ((((x + 180) % 360) + 360) % 360) - 180;

function centroDe(t: Omit<Trozo, "id">): Punto {
  return { lat: (t.sur + t.norte) / 2, lon: longitud((t.oeste + t.este) / 2) };
}

/** Del centro a una esquina, en metros: el radio del círculo que encierra el trozo. */
function mediaDiagonal(t: Omit<Trozo, "id">): number {
  const c = centroDe(t);
  const esquinas = [
    { lat: t.norte, lon: longitud(t.este) },
    { lat: t.sur, lon: longitud(t.este) },
    { lat: t.norte, lon: longitud(t.oeste) },
    { lat: t.sur, lon: longitud(t.oeste) },
  ];
  return Math.max(...esquinas.map((e) => enLineaRecta(c, e)));
}

export type Partida = { caja: Omit<Trozo, "id">; trozos: Trozo[]; ancho: number; alto: number };

/** La caja, en trozos iguales de norte a sur y de oeste a este. Cada trozo, una zona. */
export function partir(c: Caja, porLado: number = ZONAS_POR_LADO): Partida {
  const este = c.east > c.west ? c.east : c.east + 360;
  const ancho = (este - c.west) / porLado;
  const alto = (c.north - c.south) / porLado;
  const trozos: Trozo[] = [];
  for (let fila = 0; fila < porLado; fila++)
    for (let col = 0; col < porLado; col++) {
      const oeste = c.west + col * ancho;
      const norte = c.north - fila * alto;
      trozos.push({ id: `z${fila * porLado + col + 1}`, oeste, este: oeste + ancho, norte, sur: norte - alto });
    }
  return { caja: { oeste: c.west, sur: c.south, este, norte: c.north }, trozos, ancho, alto };
}

/** En qué trozo cae un punto, o null si cae fuera de la caja. */
export function trozoDe(p: Punto, partida: Partida, porLado: number = ZONAS_POR_LADO): Trozo | null {
  const { caja, ancho, alto } = partida;
  const lon = p.lon < caja.oeste ? p.lon + 360 : p.lon;
  if (p.lat < caja.sur || p.lat > caja.norte || lon < caja.oeste || lon > caja.este) return null;
  const col = Math.min(porLado - 1, Math.floor((lon - caja.oeste) / ancho));
  const fila = Math.min(porLado - 1, Math.floor((caja.norte - p.lat) / alto));
  return partida.trozos[fila * porLado + col];
}

/**
 * Dónde se le pide la lista a la fuente: si la caja cabe en un círculo del radio más ancho que se busca, uno solo, en
 * su centro; si no, uno por trozo, cada uno con su radio y sin pasar de ese tope.
 */
export function pedidosDe(partida: Partida): { centro: Punto; radio: number }[] {
  const entera = mediaDiagonal(partida.caja);
  if (entera <= RADIO_MAXIMO) return [{ centro: centroDe(partida.caja), radio: Math.ceil(entera) }];
  return partida.trozos.map((t) => ({
    centro: centroDe(t),
    radio: Math.min(Math.ceil(mediaDiagonal(t)), RADIO_MAXIMO),
  }));
}

// ---------- esperar sin quedarse esperando

type ATiempo<T> = { ok: true; v: T } | { ok: false; tarde: boolean };

function aTiempo<T>(p: Promise<T>, ms: number): Promise<ATiempo<T>> {
  return new Promise((resuelve) => {
    const reloj = setTimeout(() => resuelve({ ok: false, tarde: true }), ms);
    p.then(
      (v) => {
        clearTimeout(reloj);
        resuelve({ ok: true, v });
      },
      () => {
        clearTimeout(reloj);
        resuelve({ ok: false, tarde: false });
      },
    );
  });
}

/** Unas tareas, de tantas en tantas, en su orden. */
async function deTantasEnTantas<T>(tareas: (() => Promise<T>)[], aLaVez: number): Promise<PromiseSettledResult<T>[]> {
  const salida: PromiseSettledResult<T>[] = new Array(tareas.length);
  let siguiente = 0;
  const obrero = async (): Promise<void> => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      try {
        salida[i] = { status: "fulfilled", value: await tareas[i]() };
      } catch (reason) {
        salida[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(aLaVez, tareas.length) }, obrero));
  return salida;
}

// ---------- el vistazo

const UN_DIA = 86_400_000;
const nochesDe = (e: Entendido): number =>
  Math.round((Date.parse(`${e.dates.check_out}T00:00:00Z`) - Date.parse(`${e.dates.check_in}T00:00:00Z`)) / UN_DIA);

function estanciaDe(v: Entendido, centro: Punto, radio: number): Estancia {
  const pasaporte = v.travellers.passports[0] ?? v.origin?.country ?? "";
  if (!PAIS.test(pasaporte)) throw new Error("no se sabe con qué pasaporte se viaja: sin eso no hay precio");
  return {
    lat: centro.lat,
    lon: centro.lon,
    radio,
    entrada: v.dates.check_in,
    salida: v.dates.check_out,
    adultos: v.travellers.adults,
    ninos: v.travellers.children,
    habitaciones: v.travellers.rooms,
    moneda: v.currency.toUpperCase(),
    nacionalidad: pasaporte.toUpperCase(),
    pais: v.destination.country.toUpperCase(),
  };
}

/** Los mínimos del vistazo: los de partida, bajados aquí mismo por su escalera si con ellos no pasan bastantes. */
function minimosQueBastan(todos: Alojamiento[]): { minimos: Minimos; dentro: Alojamiento[]; bajados: boolean } {
  if (todos.length === 0) return { minimos: ESCALERA_DE_MINIMOS[0], dentro: [], bajados: false };
  for (const [i, m] of ESCALERA_DE_MINIMOS.entries()) {
    const { dentro } = separar(todos, m);
    if (dentro.length >= CANDIDATOS_QUE_BASTAN || i === ESCALERA_DE_MINIMOS.length - 1)
      return { minimos: m, dentro, bajados: i > 0 };
  }
  throw new Error("la escalera de mínimos está vacía");
}

/** A quiénes se les pide precio: de zona en zona por turnos, y en cada una, los más opinados primero. */
function aQuienPreguntar(dentro: Alojamiento[], zonaDe: Map<string, string>, cuantos: number): Alojamiento[] {
  const porZona = new Map<string, Alojamiento[]>();
  for (const a of dentro) porZona.set(zonaDe.get(a.id)!, [...(porZona.get(zonaDe.get(a.id)!) ?? []), a]);
  const colas = [...porZona.entries()]
    .sort(([x], [y]) => x.localeCompare(y, "en", { numeric: true }))
    .map(([, lista]) =>
      lista.sort(
        (a, b) => (b.opiniones ?? 0) - (a.opiniones ?? 0) || (b.nota ?? 0) - (a.nota ?? 0) || a.id.localeCompare(b.id),
      ),
    );
  const salida: Alojamiento[] = [];
  while (salida.length < cuantos && colas.some((c) => c.length > 0))
    for (const c of colas) if (c.length > 0 && salida.length < cuantos) salida.push(c.shift()!);
  return salida;
}

/**
 * Los días baratos para volar del mes del viaje, del par principal de la búsqueda de transporte (el primer sitio con
 * vuelos de salida con el primero de llegada), con una sola petición de precios. Sin saber de dónde se sale no se
 * pide nada. Todo, aeropuertos incluidos, dentro de su espera: lo que no llega no se espera.
 */
async function diasParaVolar(e: Entendido, f: FuentesDelVistazo, ms: number): Promise<DiasParaVolar | null> {
  const fuente = f.transporte;
  const origen = e.origin;
  if (fuente?.diasBaratos === undefined || origen === null) return null;
  const mes = e.dates.check_in.slice(0, 7);
  const noches = nochesDe(e);
  const moneda = e.currency.toUpperCase();
  const pedido = (async () => {
    const { salida, llegada } = await lugaresDelViaje(e, fuente);
    const par = parPrincipal(salida, llegada);
    if (par === null) return null;
    const mercado = origen.country.toLowerCase();
    const t: Trayecto = { origen: par.de.codigo, destino: par.a.codigo, ida: mes, vuelta: null, moneda, mercado };
    return { par, dias: await fuente.diasBaratos!(t, mes, noches) };
  })();
  const llegado = await aTiempo(pedido, ms);
  if (!llegado.ok || llegado.v === null) return null;
  const { par, dias: dados } = llegado.v;
  const dias = dados
    .filter((d) => d.dia.startsWith(mes) && d.moneda.toUpperCase() === moneda && d.precio > 0)
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.precio - b.precio)
    .filter((d, i, todos) => i === 0 || d.dia !== todos[i - 1].dia);
  if (dias.length === 0) return null;
  return {
    origen: par.de.codigo,
    destino: par.a.codigo,
    nombres: { origen: par.de.nombre, destino: par.a.nombre },
    mes,
    noches,
    moneda,
    fuente: dias[0].fuente,
    visto: dias.map((d) => d.visto).sort()[0],
    dias: dias.map((d) => ({ dia: d.dia, precio: d.precio })),
  };
}

/**
 * El primer vistazo de lo entendido. Lo entendido ya ha pasado la puerta 1. Si la fuente de alojamiento no contesta
 * a ninguna lista, no hay vistazo, y se dice por qué; si contesta a unas sí y a otras no, o los precios no llegan a
 * tiempo, se da lo que hay y va a medias.
 */
export async function primerVistazo(e: Entendido, f: FuentesDelVistazo, esperas: Esperas = ESPERAS): Promise<Vistazo> {
  const vuelos = diasParaVolar(e, f, esperas.vuelos);
  const partida = partir(e.destination.box);
  const masBajos = ESCALERA_DE_MINIMOS[ESCALERA_DE_MINIMOS.length - 1];
  const pedidos = pedidosDe(partida);
  const listas = await aTiempo(
    deTantasEnTantas(
      pedidos.map((p) => () => f.alojamiento.lista(estanciaDe(e, p.centro, p.radio), masBajos)),
      LISTAS_A_LA_VEZ,
    ),
    esperas.lista,
  );
  if (!listas.ok) throw new FalloDelVistazo(listas.tarde ? "too_slow" : "no_sources");
  const llegadas = listas.v.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
  if (llegadas.length === 0) throw new FalloDelVistazo("no_sources");
  let aMedias = llegadas.length < pedidos.length;

  // Cada alojamiento, una vez, y solo lo que cae dentro de la caja: los círculos la desbordan.
  const zonaDe = new Map<string, string>();
  const todos: Alojamiento[] = [];
  for (const a of llegadas.flat()) {
    if (zonaDe.has(a.id) || !Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
    const trozo = trozoDe({ lat: a.lat, lon: a.lon }, partida);
    if (trozo === null) continue;
    zonaDe.set(a.id, trozo.id);
    todos.push(a);
  }
  const { minimos, dentro, bajados } = minimosQueBastan(todos);

  // El precio de esas noches, de unos pocos, en tandas a la vez. Lo que no llega a tiempo se queda sin precio.
  const moneda = e.currency.toUpperCase();
  const preguntados = aQuienPreguntar(dentro, zonaDe, PRECIOS_DEL_VISTAZO);
  const tandas: Alojamiento[][] = [];
  for (let i = 0; i < preguntados.length; i += POR_TANDA) tandas.push(preguntados.slice(i, i + POR_TANDA));
  const estancia = estanciaDe(e, e.destination.centre, 0);
  const precioDe = new Map<string, number>();
  let mirados = 0;
  // Cada tanda cuenta por su lado, con el mismo plazo: una que tarda no se lleva los precios de las demás.
  const ids = (t: Alojamiento[]): string[] => t.map((a) => a.id);
  const precios = await Promise.all(
    tandas.map((t) => aTiempo(f.alojamiento.precios(ids(t), estancia), esperas.precios)),
  );
  precios.forEach((r, i) => {
    if (!r.ok) return void (aMedias = true);
    mirados += tandas[i].length;
    const deLaTanda = new Set(tandas[i].map((a) => a.id));
    for (const p of r.v) {
      const total = Math.round((p.total + p.tasasAparte) * 100) / 100;
      // Un precio en otra moneda, o que no es un importe, no se cuenta: no se puede comparar con los demás.
      if (!deLaTanda.has(p.id) || p.moneda.toUpperCase() !== moneda || !(total > 0)) continue;
      precioDe.set(p.id, Math.min(total, precioDe.get(p.id) ?? Infinity));
    }
  });

  const zonas: ZonaDelVistazo[] = [];
  for (const t of partida.trozos) {
    const suyos = todos.filter((a) => zonaDe.get(a.id) === t.id);
    if (suyos.length === 0) continue;
    const pasan = dentro.filter((a) => zonaDe.get(a.id) === t.id);
    const precios = pasan.flatMap((a) => (precioDe.has(a.id) ? [precioDe.get(a.id)!] : []));
    const lat = suyos.reduce((s, a) => s + a.lat, 0) / suyos.length;
    const lon = suyos.reduce((s, a) => s + (a.lon < partida.caja.oeste ? a.lon + 360 : a.lon), 0) / suyos.length;
    zonas.push({
      id: t.id,
      punto: { lat, lon: longitud(lon) },
      devueltos: suyos.length,
      pasan: pasan.length,
      conPrecio: precios.length,
      desde: precios.length === 0 ? null : Math.min(...precios),
    });
  }
  const totales = [...precioDe.values()];
  const conPrecioPrimero = [...dentro].sort((a, b) => Number(precioDe.has(b.id)) - Number(precioDe.has(a.id)));
  return {
    devueltos: todos.length,
    pasan: dentro.length,
    conPrecio: totales.length,
    desde: totales.length === 0 ? null : Math.min(...totales),
    moneda,
    minimos: { nota: minimos.nota, opiniones: minimos.opiniones, estrellas: minimos.estrellas },
    bajados,
    ensanchado: false,
    puntos: conPrecioPrimero
      .slice(0, PUNTOS_DEL_VISTAZO)
      .map((a) => ({ punto: { lat: a.lat, lon: a.lon }, precio: precioDe.get(a.id) ?? null })),
    zonas,
    mirados,
    aMedias,
    vuelos: await vuelos,
  };
}
