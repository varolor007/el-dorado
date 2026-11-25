// El transporte de tu viaje, a ratos (8.3), en la mesa: el que tienes, con sus horas, sus escalas y su precio con su
// fecha; buscarlo otra vez, movido a donde pides (código, sin IA, preguntando a la fuente); y lo que pide al rehacer
// elegir una de sus opciones. La búsqueda se guarda en la carpeta del viaje, y elegir parte de lo guardado: el vuelo
// y su precio salen de lo que dijo la fuente, nunca de lo que manda la web. Las cuentas, sin Node, en
// `agent/scripts/otro_transporte.ts`.
//
//   transporte/<n>.json   la búsqueda n: de qué versión, qué se pidió, dónde se buscó y sus opciones

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClaseDeCambio } from "../data/momentos.ts";
import type { Transporte, Viaje } from "../output/viaje.ts";
import { transporteDe as transporteElegido } from "../scripts/elecciones.ts";
import type { Entendido } from "../scripts/formas.ts";
import {
  antesYAhora,
  buscarOtraVez,
  comprobarPedido,
  conLasFechasDelVuelo,
  paisDe,
  type AntesYAhora,
  type Comparado,
  pedidoDelTransporte,
  type OtraBusqueda,
  type PedidoDelTransporte,
} from "../scripts/otro_transporte.ts";
import type { Parrilla } from "../scripts/transporte.ts";
import type { FuenteTransporte, Vuelo } from "../tools/fuentes/tipos.ts";
import { apuntar, guardarJson, leerVersion, type ViajeEnLaMesa } from "./mesa.ts";
import { leerElecciones } from "./momentos.ts";
import { loPedidoDe } from "./rehacer.ts";

export const BUSQUEDAS_DEL_TRANSPORTE = "transporte";

/** Una búsqueda guardada: su número, la versión sobre la que se hizo y cuándo. */
export type BusquedaGuardada = OtraBusqueda & { n: number; version: number; cuando: string };

/** Por qué no se busca o no se elige, por su clave. */
export class FalloDelTransporte extends Error {}

const leer = <T>(ruta: string): T | null => {
  try {
    return JSON.parse(readFileSync(ruta, "utf8")) as T;
  } catch {
    return null;
  }
};

const carpetaDe = (v: ViajeEnLaMesa): string => join(v.carpeta, BUSQUEDAS_DEL_TRANSPORTE);

/** El viaje, lo entendido y el run de la versión que se enseña. */
function laQueSeEnsena(v: ViajeEnLaMesa): { viaje: Viaje; entendido: Entendido; run: string; n: number } {
  const n = v.ficha.version;
  const version = n === null ? null : v.ficha.versiones.find((x) => x.n === n);
  const leida = leerVersion(v);
  if (n === null || version == null || leida === null) throw new FalloDelTransporte("not_now");
  return {
    viaje: leida.viaje as Viaje,
    entendido: leida.entendido as Entendido,
    run: join(v.carpeta, "runs", String(version.run)),
    n,
  };
}

/** El transporte con que llegas en la versión que se enseña: el que elegiste, o el de la manera. */
function elQueTienes(v: ViajeEnLaMesa, viaje: Viaje): Transporte | null {
  const id = transporteElegido(viaje, leerElecciones(v));
  return viaje.transportes.find((t) => t.id === id) ?? null;
}

/** Con qué se compara cada opción: lo entendido, el transporte que tienes y los países que ya tiene la tabla. */
function comparadoDe(v: ViajeEnLaMesa): Comparado & { n: number } {
  const { viaje, entendido, n } = laQueSeEnsena(v);
  const mirados = [
    entendido.destination.country.toUpperCase(),
    ...(viaje.papeles?.casillas ?? []).map((c) => c.pais.toUpperCase()),
  ];
  return {
    entendido,
    actual: elQueTienes(v, viaje),
    viajeros: viaje.adultos + viaje.ninos.length,
    mirados: [...new Set(mirados)],
    n,
  };
}

/** Las búsquedas del viaje, por su número. */
function numeros(v: ViajeEnLaMesa): number[] {
  if (!existsSync(carpetaDe(v))) return [];
  return readdirSync(carpetaDe(v))
    .map((x) => /^([1-9]\d*)\.json$/.exec(x)?.[1])
    .filter((x): x is string => x !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Una búsqueda guardada del viaje, o null si no está. */
export function busquedaDe(v: ViajeEnLaMesa, n: number): BusquedaGuardada | null {
  return leer<BusquedaGuardada>(join(carpetaDe(v), `${n}.json`));
}

/** La última búsqueda del viaje, o null si no ha buscado nunca. */
export function ultimaBusqueda(v: ViajeEnLaMesa): BusquedaGuardada | null {
  const n = numeros(v).at(-1);
  return n === undefined ? null : busquedaDe(v, n);
}

/**
 * Busca otra vez el transporte del viaje, movido a lo que pide el viajero, y lo guarda. Solo con el viaje en el
 * mapa. Lo que no vale del pedido lanza `PedidoQueNoVale` con su campo; sin fuente, o sin saber de dónde se sale,
 * `FalloDelTransporte`.
 */
export async function buscarElTransporte(
  v: ViajeEnLaMesa,
  fuente: FuenteTransporte | undefined,
  crudo: unknown,
  cuando: Date,
): Promise<BusquedaGuardada> {
  if (v.ficha.estado !== "on_map") throw new FalloDelTransporte("not_now");
  const pedido = comprobarPedido(crudo);
  const c = comparadoDe(v);
  if (c.entendido.origin === null) throw new FalloDelTransporte("no_origin");
  if (fuente === undefined) throw new FalloDelTransporte("no_source");
  let hecha: Awaited<ReturnType<typeof buscarOtraVez>>;
  try {
    hecha = await buscarOtraVez(c, fuente, pedido, { desde: cuando.toISOString().slice(0, 10) });
  } catch (error) {
    // El intento cuenta para su freno aunque la fuente falle: también se le preguntó.
    apuntar(v, "transport_search", { busqueda: null, version: c.n, fallo: true }, cuando);
    throw error;
  }
  mkdirSync(carpetaDe(v), { recursive: true, mode: 0o700 });
  const n = (numeros(v).at(-1) ?? 0) + 1;
  const guardada: BusquedaGuardada = { ...hecha, n, version: c.n, cuando: cuando.toISOString() };
  guardarJson(join(carpetaDe(v), `${n}.json`), guardada);
  apuntar(v, "transport_search", { busqueda: n, version: c.n, opciones: hecha.opciones.length }, cuando);
  return guardada;
}

/**
 * Lo que pide al rehacer elegir una opción de una búsqueda: sus clases de cambio, lo entendido con sus fechas si
 * cambian las noches, y el pedido que queda en `rehecho.json`. La búsqueda tiene que ser de la versión que se enseña:
 * si salió otra, sus diferencias ya no son de lo que tienes delante.
 */
export function loQuePideLaOpcion(
  v: ViajeEnLaMesa,
  busqueda: unknown,
  opcion: unknown,
): { clases: ClaseDeCambio[]; entendido?: Entendido; pedido: PedidoDelTransporte } {
  if (v.ficha.estado !== "on_map") throw new FalloDelTransporte("not_now");
  if (typeof busqueda !== "number" || !Number.isInteger(busqueda) || busqueda < 1)
    throw new FalloDelTransporte("bad_search");
  const b = busquedaDe(v, busqueda);
  if (b === null) throw new FalloDelTransporte("bad_search");
  if (b.version !== v.ficha.version) throw new FalloDelTransporte("old_search");
  const o = b.opciones.find((x) => x.id === opcion);
  if (o === undefined) throw new FalloDelTransporte("bad_option");
  const { entendido } = laQueSeEnsena(v);
  const pedido: PedidoDelTransporte = { moment: "transport", flight: o.vuelo, countries: o.new_countries };
  return o.nights.changed
    ? { clases: o.changes, entendido: conLasFechasDelVuelo(entendido, o.vuelo), pedido }
    : { clases: o.changes, pedido };
}

type DeLaBusqueda = { vuelos?: Vuelo[]; transporte?: Parrilla | null };

/** El vuelo de un run que es el transporte del viaje: el que eligió el viajero, o el de su búsqueda. */
function vueloDe(run: string, t: Transporte): Vuelo | null {
  // El vuelo que elegiste en este run o en una versión de antes, si sigue valiendo (`loPedidoDe`).
  const pedido = pedidoDelTransporte(loPedidoDe(run, "transport"))?.flight;
  const b = leer<DeLaBusqueda>(join(run, "busqueda.json"));
  const todos = [...(pedido === undefined ? [] : [pedido]), ...(b?.vuelos ?? []), ...(b?.transporte?.opciones ?? [])];
  return (
    todos.find(
      (x) => x.origen === t.de && x.destino === t.a && x.sale === t.sale && (x.vuelve ?? null) === (t.vuelve ?? null),
    ) ?? null
  );
}

/** Lo que la web ve del vuelo que tienes: lo de la fuente que sirve para enseñarlo, sin nada más. */
const deCara = (x: Vuelo) => ({
  from: x.origen,
  to: x.destino,
  out: x.sale,
  back: x.vuelve,
  airline: x.aerolinea,
  number: x.numero,
  stops_out: x.escalasIda,
  stops_back: x.escalasVuelta,
  minutes_out: x.minutosIda ?? null,
  arrives: x.llega ?? null,
  seen: x.visto,
  saved: x.guardado,
});

/**
 * Los países de los aeropuertos del transporte que tienes que no están en la tabla de los papeles (ni son el del
 * destino ni el de donde sales), y si de alguno no se sabe el país. Se buscan en los sitios con vuelos que se
 * miraron: los de la búsqueda del run y los de cada búsqueda otra vez del viaje. No cambia nada: solo lo dice.
 */
function paisesSinMirar(v: ViajeEnLaMesa, run: string, t: Transporte): { nuevos: string[]; sinSaber: boolean } {
  const c = comparadoDe(v);
  const parrilla = leer<DeLaBusqueda>(join(run, "busqueda.json"))?.transporte;
  const lugares = [
    ...(parrilla?.salida ?? []),
    ...(parrilla?.llegada ?? []),
    ...numeros(v).flatMap((n) => {
      const b = busquedaDe(v, n);
      return b === null ? [] : [...b.buscado.salida, ...b.buscado.llegada];
    }),
  ];
  const ya = new Set(
    [...c.mirados, c.entendido.destination.country, c.entendido.origin?.country ?? ""].map((x) => x.toUpperCase()),
  );
  // El aeropuerto que dijo el viajero es del país de donde sale, o del de su destino.
  const dicho = (codigo: string): string | null =>
    codigo === c.entendido.origin?.airport
      ? (c.entendido.origin?.country ?? null)
      : codigo === c.entendido.destination.airport
        ? c.entendido.destination.country
        : null;
  const paises = [t.de, t.a].map((x) => paisDe(x, lugares, null) ?? dicho(x)?.toUpperCase() ?? null);
  return {
    nuevos: [...new Set(paises.filter((x): x is string => x !== null && !ya.has(x)))].sort(),
    sinSaber: paises.some((x) => x === null),
  };
}

/**
 * Lo que la web ve del transporte de tu viaje: el que tienes, con lo que dijo la fuente; por qué no lo hay, si no;
 * la última búsqueda, si es de esta versión; y, si esta versión salió de cambiar el transporte, lo que cambió el
 * total de cada manera frente a la de antes.
 */
export function transporteDeCara(v: ViajeEnLaMesa): Record<string, unknown> {
  const { viaje, entendido, run, n } = laQueSeEnsena(v);
  const tienes = elQueTienes(v, viaje);
  const vuelo = tienes === null ? null : vueloDe(run, tienes);
  const porQueNo = tienes !== null ? null : entendido.origin === null ? "no_origin" : "no_price";
  const b = ultimaBusqueda(v);
  const version = v.ficha.versiones.find((x) => x.n === n);
  const deTransporte = (version?.cambio ?? []).some((c) => c === "flight" || c === "dates");
  const antes = deTransporte && version?.de !== undefined ? (leerVersion(v, version.de)?.viaje as Viaje) : null;
  const comparado: AntesYAhora[] | null = antes == null ? null : antesYAhora(antes, viaje);
  const sinMirar = tienes === null ? { nuevos: [], sinSaber: false } : paisesSinMirar(v, run, tienes);
  return {
    version: n,
    transport: tienes,
    flight: vuelo === null ? null : deCara(vuelo),
    // Los países de sus aeropuertos para los que no se han mirado tus papeles: se dice, y no se cambia nada.
    new_countries: sinMirar.nuevos,
    country_unknown: sinMirar.sinSaber,
    none: porQueNo,
    next_to: tienes === null ? (viaje.transporteAlLado ?? null) : null,
    origin: entendido.origin === null ? null : { name: entendido.origin.name, airport: entendido.origin.airport },
    dates: { check_in: entendido.dates.check_in, check_out: entendido.dates.check_out },
    travellers: viaje.adultos + viaje.ninos.length,
    search: b === null || b.version !== n ? null : busquedaDeCara(b),
    before: comparado === null ? null : { version: version?.de ?? null, ways: comparado },
  };
}

/** Lo que la web ve de una búsqueda: lo pedido, dónde se buscó y cada opción, con su vuelo de cara. */
export function busquedaDeCara(b: BusquedaGuardada): Record<string, unknown> {
  const lugar = (l: OtraBusqueda["buscado"]["salida"][number]) => ({
    code: l.codigo,
    name: l.nombre,
    country: l.pais,
    km: l.km,
  });
  return {
    n: b.n,
    when: b.cuando,
    move: b.pedido,
    dates: { check_in: b.buscado.ida, check_out: b.buscado.vuelta },
    from: b.buscado.salida.map(lugar),
    to: b.buscado.llegada.map(lugar),
    options: b.opciones.map((o) => ({
      id: o.id,
      flight: deCara(o.vuelo),
      total: o.total,
      currency: o.vuelo.moneda,
      difference: o.difference,
      nights: o.nights,
      new_countries: o.new_countries,
      country_unknown: o.country_unknown,
      stops: o.stops,
      changes: o.changes,
    })),
    left_out: b.fueraPorLoPedido,
    none: b.opciones.length === 0,
  };
}
