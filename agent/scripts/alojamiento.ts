// El alojamiento, a ratos (8.2), en código y sin IA: lo que el viajero pide desde la ficha de un alojamiento (otra
// zona, otros mínimos, otro tope de gasto, sus gustos), mirado antes de que llegue a la casa; la manera con el
// alojamiento que eligió en lugar del suyo, con su total; y los gustos con los que se cruza la ficha de cada uno. Sin
// nada de Node: la web lo usa igual.

import { MINIMOS_QUE_SE_PIDEN, ZONA_QUE_SE_PIDE } from "../data/alojamiento.ts";
import { COSAS } from "../data/gustos.ts";
import type { Manera, Punto, Viaje } from "../output/viaje.ts";
import { enLineaRecta } from "../tools/distancias.ts";
import { PESOS_DE_GUSTO, type Gusto } from "./formas.ts";

export type PesoDeGusto = (typeof PESOS_DE_GUSTO)[number];
/** Un gusto marcado por el viajero en la web, de una cosa del alojamiento: sin palabras, solo su cosa y su peso. */
export type GustoMarcado = { thing: string; weight: PesoDeGusto };

/** Lo que pide el viajero desde la ficha de un alojamiento. Lo que no pide va en null: se queda como estaba. */
export type PedidoDeAlojamiento = {
  /** Otra zona: un centro y un radio en metros. */
  zone: { lat: number; lon: number; radius_m: number } | null;
  /** Otros mínimos: la nota, las opiniones y las estrellas. Se buscan tal cual, sin bajarlos. */
  minimums: { score: number; reviews: number; stars: number } | null;
  /** Otro tope de gasto: lo más que se paga por el alojamiento entero, en la moneda del viaje. */
  max_price: number | null;
  /** Sus gustos de las cosas del alojamiento, si los cambió. */
  tastes: GustoMarcado[] | null;
};

/** Lo que no vale de un pedido, por su campo. */
export class PedidoQueNoVale extends Error {}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const numero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Unos gustos marcados, con su forma: cada cosa, de la lista y una vez. Lanza `PedidoQueNoVale` si no. */
export function comprobarGustos(crudo: unknown): GustoMarcado[] {
  if (!Array.isArray(crudo) || crudo.length > Object.keys(COSAS).length) throw new PedidoQueNoVale("tastes");
  const vistas = new Set<string>();
  return crudo.map((g: unknown) => {
    if (!objeto(g) || typeof g.thing !== "string" || !Object.hasOwn(COSAS, g.thing) || vistas.has(g.thing))
      throw new PedidoQueNoVale("tastes");
    if (!PESOS_DE_GUSTO.includes(g.weight as PesoDeGusto)) throw new PedidoQueNoVale("tastes");
    vistas.add(g.thing);
    return { thing: g.thing, weight: g.weight as PesoDeGusto };
  });
}

/**
 * Mira un pedido contra el viaje: la zona, cerca de su destino y con un radio que se puede buscar; los mínimos,
 * dentro de sus topes; el tope de gasto, un importe. Tiene que pedir algo. Lo que no vale lanza `PedidoQueNoVale`
 * con su campo, y no llega a ninguna fuente.
 */
export function comprobarPedido(crudo: unknown, destino: Punto): PedidoDeAlojamiento {
  if (!objeto(crudo)) throw new PedidoQueNoVale("search");
  const fuera = Object.keys(crudo).filter((k) => !["zone", "minimums", "max_price", "tastes"].includes(k));
  if (fuera.length > 0) throw new PedidoQueNoVale(fuera[0]);
  const p: PedidoDeAlojamiento = { zone: null, minimums: null, max_price: null, tastes: null };
  if (crudo.zone != null) {
    const z = crudo.zone;
    const zq = ZONA_QUE_SE_PIDE;
    if (!objeto(z) || !numero(z.lat) || !numero(z.lon) || !numero(z.radius_m)) throw new PedidoQueNoVale("zone");
    if (Math.abs(z.lat) > 90 || Math.abs(z.lon) > 180) throw new PedidoQueNoVale("zone");
    if (z.radius_m < zq.radioMinimo || z.radius_m > zq.radioMaximo) throw new PedidoQueNoVale("zone");
    if (enLineaRecta({ lat: z.lat, lon: z.lon }, destino) > zq.lejosDelDestino) throw new PedidoQueNoVale("zone");
    p.zone = { lat: z.lat, lon: z.lon, radius_m: Math.round(z.radius_m) };
  }
  if (crudo.minimums != null) {
    const m = crudo.minimums;
    const t = MINIMOS_QUE_SE_PIDEN;
    const entre = (v: unknown, [a, b]: readonly [number, number], entero: boolean): v is number =>
      numero(v) && v >= a && v <= b && (!entero || Number.isInteger(v));
    if (
      !objeto(m) ||
      !entre(m.score, t.nota, false) ||
      !entre(m.reviews, t.opiniones, true) ||
      !entre(m.stars, t.estrellas, true)
    )
      throw new PedidoQueNoVale("minimums");
    p.minimums = { score: Math.round(m.score * 10) / 10, reviews: m.reviews, stars: m.stars };
  }
  if (crudo.max_price != null) {
    if (!numero(crudo.max_price) || crudo.max_price <= 0 || crudo.max_price > 10_000_000)
      throw new PedidoQueNoVale("max_price");
    p.max_price = Math.round(crudo.max_price * 100) / 100;
  }
  if (crudo.tastes != null) p.tastes = comprobarGustos(crudo.tastes);
  if (p.zone === null && p.minimums === null && p.max_price === null && p.tastes === null)
    throw new PedidoQueNoVale("search");
  return p;
}

/** Si el pedido pide buscar otra vez (otra zona, otros mínimos u otro tope), y no solo cruzar otros gustos. */
export const pideBuscar = (p: PedidoDeAlojamiento): boolean =>
  p.zone !== null || p.minimums !== null || p.max_price !== null;

/**
 * Los gustos con que se cruza la ficha de cada alojamiento: los de lo entendido, con los marcados por el viajero
 * encima. Lo que marcó de una cosa manda sobre lo que dijo de ella; lo que no es una cosa del alojamiento (un sitio
 * que ver, un plan) se queda como estaba. Lo marcado lleva su marca, y no unas palabras que el viajero no escribió.
 */
export function gustosConLosTuyos(deLoEntendido: Gusto[], marcados: GustoMarcado[] | null): Gusto[] {
  if (marcados === null) return deLoEntendido;
  const tocadas = new Set(marcados.map((g) => g.thing));
  return [
    ...deLoEntendido.filter((g) => !tocadas.has(g.thing)),
    ...marcados.map((g) => ({ ...g, quote: deLoEntendido.find((x) => x.thing === g.thing)?.quote ?? MARCADO })),
  ];
}

/** La marca de un gusto que el viajero tocó en la web y no escribió. */
export const MARCADO = "(marked on the lodging sheet)";

/**
 * La manera con el alojamiento que elegiste en lugar del suyo: el mismo transporte y su total, con el precio del
 * tuyo en lugar del de ella. Sin elegir otro, la manera tal cual. Lanza si el elegido no es del viaje, está
 * descartado o su precio va en otra moneda (no se pueden sumar).
 */
export function conTuAlojamiento(v: Viaje, m: Manera, id: string | null): Manera {
  if (id === null || id === m.alojamiento) return m;
  const suyo = v.alojamientos.find((a) => a.id === m.alojamiento);
  const tuyo = v.alojamientos.find((a) => a.id === id);
  if (suyo === undefined || tuyo === undefined || tuyo.descartado != null) throw new Error("bad_lodging");
  if (tuyo.precio.moneda !== m.moneda || suyo.precio.moneda !== m.moneda) throw new Error("bad_lodging");
  const total = Math.round((m.total - suyo.precio.total + tuyo.precio.total) * 100) / 100;
  return { ...m, alojamiento: tuyo.id, total };
}

/**
 * El centro de lo que se va a ver: la media de las paradas de los días, o el centro del destino si no hay. Es una
 * zona que la web ofrece para buscar otra vez, «cerca de lo que vas a ver».
 */
export function centroDeLoQueVes(v: Viaje): Punto {
  const enLosDias = new Set(v.dias.flatMap((d) => d.paradas));
  const puntos = v.paradas.filter((p) => enLosDias.has(p.id)).map((p) => p.punto);
  if (puntos.length === 0) return v.destino.punto;
  const media = (xs: number[]): number => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1e6) / 1e6;
  return { lat: media(puntos.map((p) => p.lat)), lon: media(puntos.map((p) => p.lon)) };
}
