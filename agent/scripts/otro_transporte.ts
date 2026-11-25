// El transporte, a ratos (8.3): la búsqueda de transporte otra vez, movida a donde pide el viajero (otro día, otro
// aeropuerto, otro horario, solo directos), y lo que cambia cada opción, por claves y con los números del código. Un
// vuelo de otros días cambia las noches: entonces es un cambio de las fechas, y el alojamiento se busca otra vez para
// las noches nuevas; nunca se suma un precio de unas fechas a las noches de otras. Un aeropuerto en un país que no
// estaba en la tabla de los papeles pide rehacerla con él. Código, sin IA, y sin nada de Node: la web lo puede usar.

import type { ClaseDeCambio } from "../data/momentos.ts";
import {
  DIAS_QUE_SE_MUEVE_UN_VUELO,
  ESCALAS_MAXIMAS,
  HORARIOS,
  OPCIONES_QUE_SE_ENSENAN,
  type Horario,
} from "../data/transporte.ts";
import type { Manera, Transporte, Viaje } from "../output/viaje.ts";
import type { FuenteTransporte, LugaresDeVuelo, Vuelo } from "../tools/fuentes/tipos.ts";
import { paraElGrupo } from "../tools/fuentes/tipos.ts";
import type { Entendido } from "./formas.ts";
import { buscarTransporte, lugaresDeLlegada, lugaresDeSalida, type LugarDeVuelo, type Parrilla } from "./transporte.ts";

/** Lo que pide el viajero al buscar otra vez. Lo que no toca va en cero, en null o en «any». */
export type PedidoDeTransporte = {
  /** Cuántos días se mueve la ida y la vuelta, de las fechas del viaje. */
  out: number;
  back: number;
  /** El sitio con vuelos de donde se sale, o al que se llega, por su código; null: los del viaje. */
  departure: string | null;
  arrival: string | null;
  hours: Horario;
  direct: boolean;
};

export const SIN_MOVER: PedidoDeTransporte = {
  out: 0,
  back: 0,
  departure: null,
  arrival: null,
  hours: "any",
  direct: false,
};

/** Un pedido que no vale, por su clave: qué campo. */
export class PedidoQueNoVale extends Error {}

const CODIGO = /^[A-Z0-9]{2,4}$/;
const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Mira lo que manda la web y devuelve el pedido con su forma; lo que no vale lanza `PedidoQueNoVale` con su campo. */
export function comprobarPedido(crudo: unknown): PedidoDeTransporte {
  if (!objeto(crudo)) throw new PedidoQueNoVale("move");
  const fuera = Object.keys(crudo).filter((k) => !(k in SIN_MOVER));
  if (fuera.length > 0) throw new PedidoQueNoVale(fuera[0]);
  const dias = (campo: "out" | "back"): number => {
    const x = crudo[campo] ?? 0;
    if (typeof x !== "number" || !Number.isInteger(x) || Math.abs(x) > DIAS_QUE_SE_MUEVE_UN_VUELO)
      throw new PedidoQueNoVale(campo);
    return x;
  };
  const sitio = (campo: "departure" | "arrival"): string | null => {
    const x = crudo[campo] ?? null;
    if (x === null) return null;
    if (typeof x !== "string" || !CODIGO.test(x)) throw new PedidoQueNoVale(campo);
    return x;
  };
  const hours = crudo.hours ?? "any";
  if (typeof hours !== "string" || !Object.hasOwn(HORARIOS, hours)) throw new PedidoQueNoVale("hours");
  const direct = crudo.direct ?? false;
  if (typeof direct !== "boolean") throw new PedidoQueNoVale("direct");
  return {
    out: dias("out"),
    back: dias("back"),
    departure: sitio("departure"),
    arrival: sitio("arrival"),
    hours: hours as Horario,
    direct,
  };
}

const dia = (fecha: string | null): string => (fecha ?? "").slice(0, 10);

/** Una fecha (AAAA-MM-DD), movida tantos días. */
export function moverDia(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha + "T00:00:00Z") + dias * 86_400_000).toISOString().slice(0, 10);
}

const nochesEntre = (a: string, b: string): number =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);

/** La hora de salida en la hora del sitio de donde sale, como la escribe la fuente; null si no la dice. */
export function horaDeSalida(v: Pick<Vuelo, "sale">): number | null {
  const m = /^\d{4}-\d{2}-\d{2}T(\d{2}):/.exec(v.sale);
  return m === null ? null : Number(m[1]);
}

/** Si un vuelo sale en el horario pedido. Si no se sabe a qué hora sale, solo vale para «any». */
export function enSuHorario(v: Pick<Vuelo, "sale">, horario: Horario): boolean {
  if (horario === "any") return true;
  const hora = horaDeSalida(v);
  const [desde, hasta] = HORARIOS[horario];
  return hora !== null && hora >= desde && hora < hasta;
}

/** Si va directo a la ida y a la vuelta. Si la fuente no dice las escalas, no se sabe: no cuenta como directo. */
export const esDirecto = (v: Pick<Vuelo, "escalasIda" | "escalasVuelta">): boolean =>
  v.escalasIda === 0 && (v.escalasVuelta === 0 || v.escalasVuelta === null);

/** El país de un código de la fuente (de un aeropuerto o de una ciudad con vuelos), o null si no se sabe. */
export function paisDe(codigo: string, lugares: LugarDeVuelo[], datos: LugaresDeVuelo | null): string | null {
  const dicho = lugares.find((l) => l.codigo === codigo || l.aeropuertos.includes(codigo))?.pais ?? null;
  if (dicho !== null) return dicho.toUpperCase();
  const a = datos?.aeropuertos.find((x) => x.codigo === codigo || x.ciudad === codigo);
  if (a !== undefined) return a.pais.toUpperCase();
  const c = datos?.ciudades.find((x) => x.codigo === codigo);
  return c === undefined ? null : c.pais.toUpperCase();
}

/** Lo lejos que se busca otra vez: las fechas del viaje movidas, y los sitios con vuelos que se pueden pedir. */
export type LoQueSeBusca = {
  ida: string;
  vuelta: string;
  /** Los sitios de donde se puede salir y a los que se puede llegar: los del viaje y los de alrededor. */
  salida: LugarDeVuelo[];
  llegada: LugarDeVuelo[];
};

/** Una opción de la búsqueda, con lo que cambia frente al transporte que tienes. */
export type OpcionDeTransporte = {
  id: string;
  vuelo: Vuelo;
  /** Para todos los que viajan, como el del viaje. */
  total: number;
  /** Lo que sube (positivo) o baja frente al que tienes, para todos; null si no tienes o es de otra moneda. */
  difference: number | null;
  /** Las noches que salen de sus días, y si son otras que las del viaje. */
  nights: { check_in: string; check_out: string; count: number; changed: boolean };
  /** Los países de sus aeropuertos que no estaban en la tabla de los papeles. */
  new_countries: string[];
  /** Si de alguno de sus aeropuertos no se sabe el país. */
  country_unknown: boolean;
  /** Si hace escala: la fuente no dice dónde, y de esa escala no se pueden mirar los papeles. */
  stops: boolean;
  /** Las clases de cambio que pide elegirla, para el impacto. */
  changes: ClaseDeCambio[];
};

/** Lo que deja una búsqueda: qué se pidió, dónde se buscó, sus opciones y lo que dijo la fuente. */
export type OtraBusqueda = {
  pedido: PedidoDeTransporte;
  buscado: LoQueSeBusca;
  opciones: OpcionDeTransporte[];
  /** Las que dio la fuente y no entran por el horario o por no ser directas. */
  fueraPorLoPedido: number;
  avisos: string[];
};

/** Lo de un viaje con que se compara cada opción: lo entendido, el transporte que tienes y los países ya mirados. */
export type Comparado = {
  entendido: Entendido;
  /** El transporte que tienes, como el viaje lo enseña (para todos), o null si el viaje va sin él. */
  actual: Pick<Transporte, "precio"> | null;
  viajeros: number;
  /** Los países que ya tiene la tabla de los papeles. */
  mirados: string[];
};

/** Las clases de cambio de elegir un vuelo: otro vuelo en los mismos días, o unas fechas nuevas; y un país nuevo. */
export function clasesDeLaOpcion(nochesCambian: boolean, paisNuevo: boolean): ClaseDeCambio[] {
  return [nochesCambian ? "dates" : "flight", ...(paisNuevo ? (["new_country"] as const) : [])];
}

/** Lo que cambia elegir un vuelo, frente al viaje: sus noches, sus países, sus escalas y lo que sube o baja. */
export function opcionDe(
  id: string,
  vuelo: Vuelo,
  c: Comparado,
  pais: (codigo: string) => string | null,
): OpcionDeTransporte {
  const check_in = dia(vuelo.sale);
  const check_out = dia(vuelo.vuelve);
  const changed = check_in !== c.entendido.dates.check_in || check_out !== c.entendido.dates.check_out;
  const ya = new Set(
    [...c.mirados, c.entendido.destination.country, c.entendido.origin?.country ?? ""].map((x) => x.toUpperCase()),
  );
  const paises = [pais(vuelo.origen), pais(vuelo.destino)];
  const new_countries = [...new Set(paises.filter((x): x is string => x !== null && !ya.has(x)))].sort();
  const total = paraElGrupo(vuelo, c.viajeros);
  const difference =
    c.actual === null || c.actual.precio.moneda !== vuelo.moneda
      ? null
      : Math.round((total - c.actual.precio.total) * 100) / 100;
  return {
    id,
    vuelo,
    total,
    difference,
    nights: { check_in, check_out, count: nochesEntre(check_in, check_out), changed },
    new_countries,
    country_unknown: paises.some((x) => x === null),
    stops: (vuelo.escalasIda ?? 0) > 0 || (vuelo.escalasVuelta ?? 0) > 0,
    changes: clasesDeLaOpcion(changed, new_countries.length > 0),
  };
}

const unicos = (lugares: LugarDeVuelo[]): LugarDeVuelo[] => {
  const vistos = new Set<string>();
  return lugares.filter((l) => !vistos.has(l.codigo) && vistos.add(l.codigo));
};

/**
 * La búsqueda de transporte, otra vez: la misma parrilla, con las fechas del viaje movidas y, si se pide, desde otro
 * sitio o a otro. Los sitios que se pueden pedir son los del viaje y los de alrededor, como los elige la búsqueda
 * de transporte cuando el viajero no dice ninguno. Lo que falla no rompe nada: se dice.
 */
export async function buscarOtraVez(
  c: Comparado,
  fuente: FuenteTransporte,
  pedido: PedidoDeTransporte,
  o: { desde?: string } = {},
): Promise<OtraBusqueda> {
  const e = c.entendido;
  const ida = moverDia(e.dates.check_in, pedido.out);
  const vuelta = moverDia(e.dates.check_out, pedido.back);
  if (nochesEntre(ida, vuelta) < 1) throw new PedidoQueNoVale("back");
  if (o.desde !== undefined && ida < o.desde) throw new PedidoQueNoVale("out");
  if (e.origin === null) throw new PedidoQueNoVale("origin");
  let datos: LugaresDeVuelo | null = null;
  try {
    datos = await fuente.lugares();
  } catch {
    // El mensaje de un fallo lleva un trozo de lo que contestó la fuente: no se guarda.
    datos = null;
  }
  const movido: Entendido = { ...e, dates: { ...e.dates, check_in: ida, check_out: vuelta } };
  const abierto: Entendido = {
    ...movido,
    origin: { ...e.origin, airport: null },
    destination: { ...e.destination, airport: null },
  };
  const salida = unicos([...lugaresDeSalida(movido, datos).lugares, ...lugaresDeSalida(abierto, datos).lugares]);
  const llegada = unicos([...lugaresDeLlegada(movido, datos).lugares, ...lugaresDeLlegada(abierto, datos).lugares]);
  const vale = (codigo: string | null, lugares: LugarDeVuelo[]): boolean =>
    codigo === null || lugares.some((l) => l.codigo === codigo);
  if (!vale(pedido.departure, salida)) throw new PedidoQueNoVale("departure");
  if (!vale(pedido.arrival, llegada)) throw new PedidoQueNoVale("arrival");
  const conSitios: Entendido = {
    ...movido,
    origin: pedido.departure === null ? movido.origin : { ...e.origin, airport: pedido.departure },
    destination: pedido.arrival === null ? movido.destination : { ...e.destination, airport: pedido.arrival },
  };
  const parrilla: Parrilla = await buscarTransporte(conSitios, fuente, { desde: o.desde });
  const todos = [...parrilla.salida, ...parrilla.llegada, ...salida, ...llegada];
  const pais = (codigo: string): string | null => paisDe(codigo, todos, datos);
  const valen = parrilla.opciones.filter(
    (v) =>
      v.moneda === e.currency.toUpperCase() &&
      enSuHorario(v, pedido.hours) &&
      (!pedido.direct || esDirecto(v)) &&
      (v.escalasIda ?? 0) <= ESCALAS_MAXIMAS,
  );
  const opciones = valen.slice(0, OPCIONES_QUE_SE_ENSENAN).map((v, i) => opcionDe(`o${i + 1}`, v, c, pais));
  return {
    pedido,
    buscado: { ida, vuelta, salida, llegada },
    opciones,
    fueraPorLoPedido: parrilla.opciones.length - valen.length,
    avisos: parrilla.avisos,
  };
}

/** Lo entendido con las fechas de un vuelo: la ida, el día de entrada, y la vuelta, el de salida. */
export function conLasFechasDelVuelo(e: Entendido, v: Pick<Vuelo, "sale" | "vuelve">): Entendido {
  return { ...e, dates: { ...e.dates, check_in: dia(v.sale), check_out: dia(v.vuelve) } };
}

/**
 * Lo que pide el transporte a una investigación que rehace: el vuelo elegido y los países nuevos de la tabla de los
 * papeles. Queda tal cual en `rehecho.json`, en `pedido`.
 */
export type PedidoDelTransporte = { moment: "transport"; flight: Vuelo; countries: string[] };

const texto = (x: unknown): x is string => typeof x === "string";
const numero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const oNulo = <T>(x: unknown, es: (y: unknown) => y is T): boolean => x === null || x === undefined || es(x);

/** El pedido del transporte de un run que rehace, si lo es y tiene su forma; si no, null. */
export function pedidoDelTransporte(pedido: unknown): PedidoDelTransporte | null {
  if (!objeto(pedido) || pedido.moment !== "transport" || !objeto(pedido.flight)) return null;
  const v = pedido.flight;
  const forma =
    texto(v.origen) &&
    texto(v.destino) &&
    texto(v.sale) &&
    oNulo(v.vuelve, texto) &&
    numero(v.precio) &&
    numero(v.pasajeros) &&
    texto(v.moneda) &&
    texto(v.visto) &&
    typeof v.guardado === "boolean";
  const paises = Array.isArray(pedido.countries) && pedido.countries.every((x) => texto(x) && /^[A-Z]{2}$/.test(x));
  if (!forma || !paises) return null;
  return { moment: "transport", flight: v as unknown as Vuelo, countries: pedido.countries as string[] };
}

/**
 * La manera con el transporte que elegiste, si es otro que el suyo: su total, con el precio de ese transporte en
 * lugar del suyo. Sin elegir, o el mismo, la manera tal cual. Un transporte que no es del viaje, o de otra moneda que
 * la manera, lanza: no se cierra con un total que no es de nadie.
 */
export function conTuTransporte(v: Viaje, m: Manera, elegido: string | null | undefined): Manera {
  if (elegido === undefined || elegido === null || elegido === m.transporte) return m;
  const nuevo = v.transportes.find((t) => t.id === elegido);
  if (nuevo === undefined) throw new Error("el transporte elegido no está en el viaje");
  const suyo = m.transporte === null ? null : v.transportes.find((t) => t.id === m.transporte);
  if (nuevo.precio.moneda !== m.moneda || (suyo != null && suyo.precio.moneda !== m.moneda))
    throw new Error("el transporte elegido es de otra moneda que la manera");
  const total = Math.round((m.total - (suyo?.precio.total ?? 0) + nuevo.precio.total) * 100) / 100;
  return { ...m, transporte: nuevo.id, total };
}

/** Lo que cambió el total de cada manera entre dos versiones, en la misma moneda: lo que ahorras o pagas de más. */
export type AntesYAhora = { way: Manera["id"]; before: number; now: number; difference: number; currency: string };

export function antesYAhora(antes: Viaje, ahora: Viaje): AntesYAhora[] {
  return ahora.maneras.flatMap((m) => {
    const a = antes.maneras.find((x) => x.id === m.id);
    if (a === undefined || a.moneda !== m.moneda) return [];
    const difference = Math.round((m.total - a.total) * 100) / 100;
    return [{ way: m.id, before: a.total, now: m.total, difference, currency: m.moneda }];
  });
}
