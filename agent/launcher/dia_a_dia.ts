// El día a día a ratos (8.6), en la casa: un mensaje tuyo para tus días («menos museos», «un día de playa») abre una
// investigación que parte de la versión que ves (`rehacer`, del 8.1) con lo que pides en `pedido`; por él, el código
// vuelve a los datos abiertos si pides algo que no estaba, y el del día a día vuelve a elegir y a ordenar los sitios
// con tus palabras y explica qué ha cambiado y por qué. El ritmo reparte otra vez los días, la puerta 9 los mira, y
// el que cruza y el que explica solo se vuelven a lanzar si cambia lo que deciden: si con la tabla nueva queda mejor
// el mismo alojamiento, por lo mismo, y lo que entregaron sigue pasando sus puertas, se quedan con ello.
//
// Lo que se cuenta de cada mensaje sale del disco: `rehecho.json` (lo que pediste) y `dias.json` (lo que eligió y lo
// que explicó, que pasó la puerta de palabras de la puerta 9).

import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { MENSAJES_DE_UN_VIAJE, MIRAR_ENTRADAS, SITIOS_DE_UNA_CLASE } from "../data/dia_a_dia.ts";
import { RONDAS } from "../data/palancas.ts";
import { PARADO } from "../data/pasos.ts";
import { puertaCruce } from "../gates/puerta_cruce.ts";
import { puertaExplica } from "../gates/puerta_explica.ts";
import { pegasDelTexto } from "../gates/textos.ts";
import {
  comprobarMensaje,
  esUnMensaje,
  pedidoDeUnDia,
  sitiosSinMirar,
  type PedidoDeEntradas,
  type PedidoDeUnDia,
} from "../scripts/dia_a_dia.ts";
import { sitiosParaElegir } from "../scripts/dias.ts";
import { diasElegidos } from "../scripts/elecciones.ts";
import type { ParaExplicar } from "../scripts/explica.ts";
import type { EntregaDeCruce, EntregaDeSitios, Entendido, Tabla } from "../scripts/formas.ts";
import { avisosDeSiempre } from "../scripts/monta_viaje.ts";
import { diasDe } from "../scripts/ruta.ts";
import type { Sitio } from "../tools/sitios.ts";
import type { Presupuesto } from "../output/capas.ts";
import { guardarJson, leerDiario, type ViajeEnLaMesa } from "./mesa.ts";
import type { Pieza } from "./puesto.ts";
import { leerElecciones, viajeDeLaVersion } from "./momentos.ts";
import { rehacer, rehechoDe } from "./rehacer.ts";

/** Por qué no se manda un mensaje, por su clave. */
export class FalloDeUnDia extends Error {}

/** Lo que guarda `sitios.json`: los sitios de los datos abiertos y, si un mensaje pidió algo que no estaba, eso. */
export type DeLosSitios = {
  sitios: Sitio[];
  resumenes: Record<string, string>;
  avisos?: string[];
  /** Las clases que se buscaron por los mensajes de este viaje, y el run que buscó las últimas. */
  buscados?: string[];
  buscadosEn?: string;
  /** Los sitios que se dan a elegir además de los de siempre, porque los pidió un mensaje: de todos, sin repetir. */
  anadidos?: string[];
  /** Los que añadió el mensaje del run `buscadosEn`, y solo esos: lo que encontró ese mensaje. */
  anadidosEn?: string[];
};

const leer = <T>(run: string, nombre: string): T => JSON.parse(readFileSync(join(run, nombre), "utf8")) as T;
const hay = (run: string, nombre: string): boolean => existsSync(join(run, nombre));
const noches = (e: Entendido): number => diasDe(e.dates.check_in, e.dates.check_out).nights;

/** Los sitios que se dan a elegir en un run: los de siempre y, si un mensaje pidió algo que no estaba, esos. */
export function sitiosQueSeDan(run: string, viaje: Entendido): ReturnType<typeof sitiosParaElegir> {
  const d = leer<DeLosSitios>(run, "sitios.json");
  return sitiosParaElegir(d.sitios, noches(viaje), new Map(Object.entries(d.resumenes ?? {})), d.anadidos ?? []);
}

/** Lo que pide un run que sale de un mensaje tuyo; null si no sale de uno. */
export function mensajeDelRun(run: string): PedidoDeUnDia | null {
  const p = rehechoDe(run)?.pedido;
  return esUnMensaje(p) ? p : null;
}

/** El run de la versión que se enseña. */
function runDeLaVersion(v: ViajeEnLaMesa): string | null {
  const x = v.ficha.versiones.find((y) => y.n === v.ficha.version);
  return x === undefined ? null : join(v.carpeta, "runs", String(x.run));
}

/** Cuántos mensajes se mandaron de un viaje en la ventana de horas de su tope. */
function mensajesDesde(v: ViajeEnLaMesa, cuando: Date): number {
  const desde = cuando.getTime() - MENSAJES_DE_UN_VIAJE.horas * 3_600_000;
  return leerDiario(v).filter((a) => a.que === "day_message" && Date.parse(a.cuando) >= desde).length;
}

export type AlPedirUnDia = { said: unknown; day?: unknown; cuando?: Date };

/**
 * Lo que pediría un mensaje tuyo para tus días, sobre la versión que ves, sin abrir nada: lo comprueba y mira qué
 * pides que no estaba. Lanza `MensajeQueNoVale` si tus palabras no valen y `FalloDeUnDia` si no es el momento, el día
 * no es del viaje o pasa del tope de mensajes.
 */
export function prepararUnDia(v: ViajeEnLaMesa, o: AlPedirUnDia): PedidoDeUnDia {
  const cuando = o.cuando ?? new Date();
  if (v.ficha.estado !== "on_map" && v.ficha.estado !== "closed") throw new FalloDeUnDia("not_now");
  const said = comprobarMensaje(o.said);
  const viaje = viajeDeLaVersion(v);
  const desde = runDeLaVersion(v);
  if (viaje === null || desde === null || !hay(desde, "sitios.json")) throw new FalloDeUnDia("not_now");
  const choices = leerElecciones(v);
  const days = diasElegidos(viaje, choices);
  const day = o.day === undefined || o.day === null ? null : o.day;
  if (day !== null && !(typeof day === "number" && Number.isInteger(day) && day >= 0 && day < days.length))
    throw new FalloDeUnDia("bad_day");
  if (mensajesDesde(v, cuando) >= MENSAJES_DE_UN_VIAJE.deUnViaje) throw new FalloDeUnDia("too_many_messages");
  const entendido = leer<Entendido>(desde, "entendido.json");
  return pedidoDeUnDia({
    said,
    day,
    days,
    choices,
    sitios: sitiosQueSeDan(desde, entendido).map((l) => ({ clase: l.kind })),
  });
}

/**
 * Tu mensaje, mandado: abre la investigación que lo rehace con lo que pides en `pedido` (sin lanzar nada ni gastar:
 * la lleva quien lo pida, tras tu botón). Lanza lo mismo que `prepararUnDia`, y lo que lance `rehacer`.
 */
export function pedirUnDia(v: ViajeEnLaMesa, o: AlPedirUnDia): { run: string; n: number; pedido: PedidoDeUnDia } {
  const cuando = o.cuando ?? new Date();
  const pedido = prepararUnDia(v, { ...o, cuando });
  const { run, n } = rehacer(v, { clases: ["day"], pedido, cuando });
  return { run, n, pedido };
}

/** Cuántas veces se pulsó el botón de mirar las entradas de un viaje en la ventana de horas de su tope. */
function entradasDesde(v: ViajeEnLaMesa, cuando: Date): number {
  const desde = cuando.getTime() - MENSAJES_DE_UN_VIAJE.horas * 3_600_000;
  return leerDiario(v).filter((a) => a.que === MIRAR_ENTRADAS && Date.parse(a.cuando) >= desde).length;
}

/**
 * Lo que pediría tu botón de mirar las entradas (14.7), sobre la versión que ves, sin abrir nada: los sitios de tus
 * paradas que no se miraron (todos, o los que pides de entre ellos, hasta los de una llamada). Lanza `FalloDeUnDia`
 * si no es el momento, si no hay ninguno que mirar (`nothing_to_look`) o si pasa del tope, que es el de los mensajes.
 */
export function prepararLasEntradas(v: ViajeEnLaMesa, o: { sights?: unknown; cuando?: Date }): PedidoDeEntradas {
  const cuando = o.cuando ?? new Date();
  if (v.ficha.estado !== "on_map" && v.ficha.estado !== "closed") throw new FalloDeUnDia("not_now");
  const viaje = viajeDeLaVersion(v);
  if (viaje === null) throw new FalloDeUnDia("not_now");
  const pedidos =
    o.sights === undefined || o.sights === null
      ? undefined
      : Array.isArray(o.sights) && o.sights.every((x) => typeof x === "string")
        ? (o.sights as string[])
        : null;
  if (pedidos === null) throw new FalloDeUnDia("bad_sights");
  const sights = sitiosSinMirar(viaje, pedidos);
  if (sights.length === 0) throw new FalloDeUnDia("nothing_to_look");
  if (entradasDesde(v, cuando) >= MENSAJES_DE_UN_VIAJE.deUnViaje) throw new FalloDeUnDia("too_many_messages");
  return { kind: MIRAR_ENTRADAS, sights, choices: leerElecciones(v) };
}

/**
 * Tu botón de mirar las entradas, pulsado: abre la investigación que las mira, con la clase «tickets» (el de las
 * entradas, solo para esos sitios; los días y la cuenta, otra vez), sin lanzar nada: la lleva quien lo pida.
 */
export function pedirLasEntradas(
  v: ViajeEnLaMesa,
  o: { sights?: unknown; cuando?: Date },
): { run: string; n: number; pedido: PedidoDeEntradas } {
  const cuando = o.cuando ?? new Date();
  const pedido = prepararLasEntradas(v, { ...o, cuando });
  const { run, n } = rehacer(v, { clases: ["tickets"], pedido, cuando });
  return { run, n, pedido };
}

/**
 * Lo que pediste y no estaba, de los datos abiertos, antes de que elija el del día a día: los sitios de esas clases
 * en la caja del destino, que se dan a elegir además de los de siempre. Sin IA. Se pide una vez: lo que se buscó
 * queda en `sitios.json`. Sin fuente, o si falla, se sigue con lo que había, y se dice.
 */
export async function ampliarLosSitios(
  run: string,
  viaje: Entendido,
  f: {
    sitiosDeClases?: (viaje: Entendido, clases: string[]) => Promise<Sitio[]>;
    resumenes: (s: Sitio[]) => Promise<Map<string, string>>;
  },
): Promise<string[]> {
  const pedido = mensajeDelRun(run);
  if (pedido === null || pedido.look_for.length === 0 || !hay(run, "sitios.json")) return [];
  const d = leer<DeLosSitios>(run, "sitios.json");
  // Se busca una vez por run: un run que se retoma no vuelve a pedirlo.
  if (d.buscadosEn === basename(run)) return [];
  const avisos: string[] = [];
  let traidos: Sitio[] = [];
  if (f.sitiosDeClases === undefined) avisos.push("sin datos abiertos para buscar lo que pidió el viajero");
  else {
    try {
      traidos = await f.sitiosDeClases(viaje, pedido.look_for);
    } catch (error) {
      avisos.push(`sin lo que pidió el viajero: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const tope = SITIOS_DE_UNA_CLASE * pedido.look_for.length;
  // Ya se dan los de siempre y lo que añadieron los mensajes de antes: eso no se vuelve a añadir ni a contar.
  const antes = d.anadidos ?? [];
  const yaDados = new Set(sitiosParaElegir(d.sitios, noches(viaje), new Map(), antes).map((s) => s.id));
  const vistos = new Set<string>();
  const elegibles = traidos.filter((s) => !yaDados.has(s.id) && !vistos.has(s.id) && vistos.add(s.id)).slice(0, tope);
  const porId = new Set(d.sitios.map((s) => s.id));
  const nuevos = elegibles.filter((s) => !porId.has(s.id));
  let resumenes = { ...d.resumenes };
  try {
    if (nuevos.length > 0) resumenes = { ...resumenes, ...Object.fromEntries(await f.resumenes(nuevos)) };
  } catch {
    avisos.push("sin lo que dicen los artículos de lo que pidió el viajero");
  }
  guardarJson(join(run, "sitios.json"), {
    ...d,
    sitios: [...d.sitios, ...nuevos],
    resumenes,
    avisos: [...new Set([...(d.avisos ?? []), ...avisos])],
    buscados: [...new Set([...(d.buscados ?? []), ...pedido.look_for])],
    buscadosEn: basename(run),
    anadidos: [...new Set([...antes, ...elegibles.map((s) => s.id)])],
    anadidosEn: elegibles.map((s) => s.id),
  } satisfies DeLosSitios);
  return avisos;
}

/** Lo que ve el del día a día de un mensaje tuyo (`in/message.json`); null si el run no sale de uno. */
export function mensajeParaElegir(run: string): Record<string, unknown> | null {
  const p = mensajeDelRun(run);
  if (p === null) return null;
  const d = hay(run, "sitios.json") ? leer<DeLosSitios>(run, "sitios.json") : null;
  return {
    said: p.said,
    open_day: p.day === null ? null : p.day + 1,
    days: p.days.map((x, i) => ({ day: i + 1, date: x.fecha, stops: x.paradas })),
    removed: p.removed,
    looked_for: d?.buscadosEn === basename(run) ? p.look_for : [],
    new_sights: loQueEncontro(run, d),
  };
}

/** Los sitios que encontró el mensaje de un run, y solo los suyos: ni los de los mensajes de antes. */
function loQueEncontro(run: string, d: DeLosSitios | null): string[] {
  return d !== null && d.buscadosEn === basename(run) ? (d.anadidosEn ?? []) : [];
}

/** Lo que mira la puerta 9 de la entrega con un mensaje: lo que quitaste, y los números que puede decir. */
export function materialDelMensaje(run: string): { quitadas: string[]; numeros: number[] } | undefined {
  const p = mensajeDelRun(run);
  if (p === null) return undefined;
  return { quitadas: p.removed, numeros: [...p.days.keys()].map((i) => i + 1) };
}

// Conservar al que cruza y al que explica, si con un mensaje no cambia lo que deciden.

/** El run del que sale uno que rehace un día, si sale solo de un mensaje para un día. */
function deDondeSale(run: string): string | null {
  const r = rehechoDe(run);
  if (r === null || r.cambio.length !== 1 || r.cambio[0] !== "day") return null;
  const base = join(dirname(run), String(r.de));
  return existsSync(base) ? base : null;
}

/** Lo que decide la tabla: los alojamientos que siguen, con su total, su nota y sus marcas, y cada palanca. */
function loQueDecide(t: Tabla): string {
  return JSON.stringify({
    rows: t.rows.map((r) => [r.id, r.lodging, r.total, r.score, r.discarded, [...r.marks].sort()]),
    levers: t.levers.map((l) => [l.id, l.lever, l.base_row, l.status, l.total, l.saves]),
  });
}

/** Copia del run de antes los puestos de un asiento con su nombre de base, con sus horas, como los copia `rehacer`. */
function copiarPuestos(desde: string, hasta: string, base: string): number {
  const patron = new RegExp(`^${base}-v\\d+$`);
  const carpeta = join(desde, "puestos");
  const ids = existsSync(carpeta) ? readdirSync(carpeta).filter((x) => patron.test(x)) : [];
  for (const id of ids)
    for (const nombre of [`puestos/${id}`, `sellos/${id}.json`, `${id}.puertas.json`, `ordenes/${id}.txt`]) {
      const origen = join(desde, nombre);
      if (existsSync(origen)) cpSync(origen, join(hasta, nombre), { recursive: true, preserveTimestamps: true });
    }
  return ids.length;
}

/** Los archivos de una carpeta, con su ruta dentro de ella. */
function archivosDe(carpeta: string, dentro = ""): string[] {
  return readdirSync(join(carpeta, dentro), { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? archivosDe(carpeta, join(dentro, x.name)) : [join(dentro, x.name)],
  );
}

/**
 * Si lo que se le daría ahora a un asiento es lo mismo que se le dio la primera vez en el run de antes: pieza a pieza,
 * con su contenido, ni una más ni una menos. Lo que leyó entonces es de donde salen sus frases: si algo de eso cambió
 * (lo que se tarda a tus paradas, por ejemplo), lo que escribió puede nombrar lo que ya no es, aunque pase su puerta.
 */
export function mismoMaterial(desde: string, base: string, piezas: readonly Pieza[]): boolean {
  const dado = join(desde, "puestos", `${base}-v1`, "in");
  if (!existsSync(dado)) return false;
  const antes = archivosDe(dado).sort();
  const ahora = piezas.map((p) => p.ruta).sort();
  if (JSON.stringify(antes) !== JSON.stringify(ahora)) return false;
  return piezas.every((p) => {
    const entonces = readFileSync(join(dado, p.ruta));
    const hoy = "copiaDe" in p ? readFileSync(p.copiaDe) : Buffer.from(p.contenido);
    return entonces.equals(hoy);
  });
}

const sinPuestos = (run: string, base: string): boolean =>
  !existsSync(join(run, "puestos")) ||
  !readdirSync(join(run, "puestos")).some((x) => new RegExp(`^${base}-v\\d+$`).test(x));

/**
 * Antes de lanzar al que cruza en una ronda de un run que sale de un mensaje: si con la tabla nueva deciden lo mismo
 * que con la de antes (los mismos alojamientos, con sus totales, sus notas y sus marcas, y lo mismo en cada palanca),
 * lo que se le daría ahora es lo mismo que se le dio entonces (`piezas`, también lo que se tarda a tus paradas) y lo
 * que entregó sigue pasando su puerta con ella, se queda con ello: se copian sus puestos y no se lanza. Devuelve si
 * lo conservó.
 */
export function conservarElCruce(
  run: string,
  ronda: number,
  tabla: Tabla,
  viaje: Entendido,
  piezas: readonly Pieza[],
  presupuesto?: Presupuesto,
): boolean {
  const desde = deDondeSale(run);
  const base = `cruce-${ronda}`;
  if (desde === null || !hay(desde, `${base}.json`) || !hay(desde, `tabla-${ronda}.json`) || !sinPuestos(run, base))
    return false;
  if (loQueDecide(leer<Tabla>(desde, `tabla-${ronda}.json`)) !== loQueDecide(tabla)) return false;
  if (!mismoMaterial(desde, base, piezas)) return false;
  const entrega = leer<{ entrega: EntregaDeCruce }>(desde, `${base}.json`).entrega;
  if (!puertaCruce(entrega, { tabla, viaje, presupuesto }).verde) return false;
  return copiarPuestos(desde, run, base) > 0;
}

/**
 * Antes de lanzar al que explica en un run que sale de un mensaje: si cada ronda del que cruza se conservó tal cual,
 * lo que se le daría ahora (`piezas`) es lo mismo que se le dio entonces y lo que explicó sigue pasando la puerta 7
 * con ello, se queda con ello. La puerta 7 no mide si una frase nombra lo que cambió: por eso, el material igual.
 */
export function conservarLaExplicacion(
  run: string,
  dado: ParaExplicar,
  viaje: Entendido,
  piezas: readonly Pieza[],
  presupuesto?: Presupuesto,
): boolean {
  const desde = deDondeSale(run);
  if (desde === null || !hay(desde, "explica.json") || !sinPuestos(run, "explica")) return false;
  if (!mismoMaterial(desde, "explica", piezas)) return false;
  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const antes = hay(desde, `cruce-${ronda}.json`);
    if (antes !== hay(run, `cruce-${ronda}.json`)) return false;
    if (
      antes &&
      readFileSync(join(desde, `cruce-${ronda}.json`), "utf8") !==
        readFileSync(join(run, `cruce-${ronda}.json`), "utf8")
    )
      return false;
  }
  const entrega = leer<{ entrega: unknown }>(desde, "explica.json").entrega;
  if (!puertaExplica(entrega, { viaje, dado, avisos: avisosDeSiempre(viaje.language), presupuesto }).verde)
    return false;
  return copiarPuestos(desde, run, "explica") > 0;
}

// Lo que se cuenta de un mensaje.

/** Cómo va el último mensaje de un viaje, para su dueño: lo que dijiste, por dónde va y lo que cambió, y por qué. */
export type MensajeDeCara = {
  /** El número del run que lo lleva. */
  run: number;
  said: string;
  day: number | null;
  /** La versión de la que salió, y la que dejó, si ya la dejó. */
  from: number;
  version: number | null;
  state: "working" | "done" | "stopped";
  /** Las clases que se buscaron en los datos abiertos, y cuántos sitios nuevos dio a elegir este mensaje. */
  looked_for: string[];
  found: number;
  /** Lo que explicó el del día a día de lo que cambió, si pasó la puerta de palabras; si no, null. */
  changed: string | null;
};

/** El último mensaje de un viaje, si el último run que rehace sale de uno; null si no hay ninguno. */
export function mensajeDeCara(v: ViajeEnLaMesa, corre: boolean): MensajeDeCara | null {
  const runs = join(v.carpeta, "runs");
  for (const r of [...v.ficha.runs].reverse()) {
    const run = join(runs, String(r.n));
    const p = mensajeDelRun(run);
    if (p === null) continue;
    const de = rehechoDe(run);
    const version = v.ficha.versiones.find((x) => x.run === r.n && x.cierre === undefined)?.n ?? null;
    const d = hay(run, "sitios.json") ? leer<DeLosSitios>(run, "sitios.json") : null;
    const entrega = hay(run, "dias.json")
      ? leer<{ entrega: EntregaDeSitios & { changed?: unknown } }>(run, "dias.json").entrega
      : null;
    const dicho = typeof entrega?.changed === "string" ? entrega.changed : null;
    // Lo que explicó ya pasó la puerta 9; se vuelve a mirar aquí, por si acaso: lo que no pasa no se enseña.
    const changed = dicho !== null && pegasDelTexto(dicho, { sinNumerosLargos: true }).length === 0 ? dicho : null;
    const state = version !== null ? "done" : corre && !hay(run, PARADO) ? "working" : "stopped";
    return {
      run: Number(basename(run)),
      said: p.said,
      day: p.day,
      from: de?.version ?? 0,
      version,
      state,
      looked_for: p.look_for,
      found: loQueEncontro(run, d).length,
      changed,
    };
  }
  return null;
}
