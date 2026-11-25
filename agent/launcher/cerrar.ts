// Cerrar el viaje (el momento 7 de la hoja): «me quedo con este». Sobre la versión que se enseña y con la manera que
// tiene elegida el viajero, la casa vuelve a pedir a su fuente el precio de cada pieza, para y pregunta si un
// precio ha subido mucho o se ha quedado sin él, comprueba cada enlace sin tumbar ninguna web, le da al que explica
// el orden que ha montado el código para que escriba una frase de cada cosa (puerta 7), lo pasa todo por la puerta 8
// y lo guarda en la mesa como una versión más, ya cerrada. El Dorado propone y enlaza: no reserva ni cobra.
//
// Lo que deja en la carpeta de cada cierre (`viajes/<id>/cierres/<n>/`), en su orden, para retomarlo desde el disco:
//
//   elegido.json    qué versión y qué manera, y cuándo se pulsó
//   precios.json    lo que dio cada fuente hoy, lo que se sabe de la llegada y del alojamiento
//   seguir.json     el sí del viajero, si un precio subió mucho o se quedó sin él
//   enlaces.json    lo que respondió cada enlace
//   orden.json      lo que escribió el que explica, ya pasado por la puerta 7, o por qué no lo hay
//   puerta8.json    lo que dijo la puerta 8
//   viaje.json      el viaje cerrado, que pasa a ser una versión
//   parado.json     si la puerta 8 lo paró, por qué; si se rompió algo; o si se dejó por otra investigación
//
// Si el viajero dice que sigue días después, los precios que se pidieron entonces pueden pasar ya de su edad: se
// vuelven a pedir, y lo de antes se queda al lado (`precios-<k>.json` y, si hay que volver a preguntar,
// `seguir-<k>.json`).

import { lookup } from "node:dns/promises";
import { existsSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { COMPROBAR_ENLACES, ESPERA_A_LAS_FUENTES, VUELTAS_DEL_ORDEN } from "../data/cierre.ts";
import { TOPE_DE_UN_ASIENTO } from "../data/pasos.ts";
import { puertaCierre, type MaterialDelCierre } from "../gates/puerta_cierre.ts";
import { puertaDelOrden } from "../gates/puerta_explica.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import type { Cierre, ComprobacionDeEnlace, EnlaceDeReserva, MANERAS, Viaje } from "../output/viaje.ts";
import {
  enlacesSinComprobar,
  llegadaDe,
  mapasDe,
  paraElOrden,
  piezasDe,
  pideSeguir,
  plazosDe,
  precioDeHoy,
  reservasDe,
  sinConfirmarDe,
  totalDeHoy,
  type DeHoy,
  conTusDias,
  type DelAlojamiento,
  type TusDias,
  type ParaLaLlegada,
  type PiezaElegida,
} from "../scripts/cierre.ts";
import type { Busqueda } from "../scripts/busqueda_alojamiento.ts";
import type { Entendido } from "../scripts/formas.ts";
import { enlaceQueVale } from "../tools/enlaces.ts";
import { hora24 } from "../tools/horas.ts";
import { completo } from "../scripts/finalistas.ts";
import { paraElGrupo, type FuenteAlojamiento, type FuenteTransporte, type Vuelo } from "../tools/fuentes/tipos.ts";
import { lanzarAsiento, recogerAsiento, type Lanzador, type Tope } from "./asiento.ts";
import { direccionDeDentro, paginaDeFuera } from "./consultado.ts";
import { sinPalabras } from "./escuchar.ts";
import { estanciaDe } from "./investigar.ts";
import { guardarCierre, guardarJson, leerVersion, ultimoCierre, type ViajeEnLaMesa } from "./mesa.ts";
import { montarPuesto, puestosDe, type Pieza } from "./puesto.ts";
import { apuntarTrabajo } from "./trabajos.ts";

/** Las fuentes a las que se vuelve a pedir el precio, y quien comprueba los enlaces. */
export type FuentesDelCierre = {
  alojamiento?: FuenteAlojamiento;
  transporte?: FuenteTransporte;
  /** Lo que responde un enlace. Sin ello, ningún enlace se comprueba: todos quedan «sin comprobar». */
  comprobar?: (url: string) => Promise<ComprobacionDeEnlace>;
};

export type AlCerrar = {
  fuentes: FuentesDelCierre;
  /** Quien piensa en el que explica. Sin él, el viaje se cierra con el orden del código y sin sus frases. */
  lanzador: Lanzador | null;
  ahora?: () => Date;
  tope?: Tope;
};

/** Por dónde va un cierre, como lo ve la web: solo claves y, si espera al viajero, lo que ha cambiado. */
export const ETAPAS_DEL_CIERRE = ["prices", "yours", "links", "order", "check", "done", "stopped"] as const;
export type EtapaDelCierre = (typeof ETAPAS_DEL_CIERRE)[number];

const hay = (carpeta: string, nombre: string): boolean => existsSync(join(carpeta, nombre));
const leer = <T>(carpeta: string, nombre: string): T => JSON.parse(readFileSync(join(carpeta, nombre), "utf8")) as T;

/**
 * Lo que eligió el viajero al pulsar: la versión, la manera y, si la web los manda, los días como los tiene delante
 * (con su ritmo y lo que quitó, añadió o movió). Sin ellos, los de la versión.
 */
type Elegido = {
  version: number;
  manera: (typeof MANERAS)[number];
  cuando: string;
  dias?: TusDias;
  ritmo?: string;
};
type DeLosPrecios = {
  dados: Record<string, DeHoy>;
  llegada: ParaLaLlegada;
  alojamiento: DelAlojamiento;
  /** Si lo que cambió pide el sí del viajero antes de seguir. */
  pide?: boolean;
  /** Cuándo se pidieron a las fuentes. */
  pedidos?: string;
};
type DelOrden = {
  entrega: {
    steps: { step: number; says: string }[];
    papers: { paper: number; says: string }[];
    unknowns: string[];
  } | null;
  falta: Cierre["sinFrases"];
};

export class FalloAlCerrar extends Error {}

/** «Me quedo con este»: apunta qué versión y qué manera se cierran. La manera tiene que ser de esa versión. */
export function elegir(
  v: ViajeEnLaMesa,
  carpeta: string,
  manera: unknown,
  cuando: Date,
  tuyos: { dias?: unknown; ritmo?: unknown } = {},
): Elegido {
  const version = leerVersion(v);
  const viaje = version?.viaje as Viaje | undefined;
  if (version === null || viaje === undefined || v.ficha.version === null) throw new FalloAlCerrar("not_now");
  if (typeof manera !== "string" || !viaje.maneras.some((m) => m.id === manera)) throw new FalloAlCerrar("bad_way");
  const elegido: Elegido = {
    version: v.ficha.version,
    manera: manera as Elegido["manera"],
    cuando: cuando.toISOString(),
  };
  if (tuyos.dias !== undefined) {
    let con: Viaje;
    try {
      con = conTusDias(viaje, tuyos.dias, tuyos.ritmo);
    } catch {
      throw new FalloAlCerrar("bad_days");
    }
    elegido.dias = con.dias.map((d) => ({ fecha: d.fecha, paradas: d.paradas }));
    elegido.ritmo = con.ritmo;
  }
  guardarJson(join(carpeta, "elegido.json"), elegido);
  return elegido;
}

/** De qué versión es un cierre: la que se enseñaba cuando se pulsó. Null si aún no lo dice. */
export function versionDelCierre(carpeta: string): number | null {
  if (!hay(carpeta, "elegido.json")) return null;
  const n = leer<Partial<Elegido>>(carpeta, "elegido.json").version;
  return typeof n === "number" ? n : null;
}

/**
 * El sí del viajero a seguir con los precios de hoy: solo cuando el cierre lo está esperando y es de la versión que
 * se enseña. Si mientras esperaba salió otra versión, ese sí ya no es de lo que tiene delante.
 */
export function seguir(carpeta: string, cuando: Date, v?: ViajeEnLaMesa): void {
  if (etapaDe(carpeta) !== "yours") throw new FalloAlCerrar("not_now");
  if (v !== undefined && (v.ficha.estado !== "on_map" || versionDelCierre(carpeta) !== v.ficha.version))
    throw new FalloAlCerrar("not_now");
  guardarJson(join(carpeta, "seguir.json"), { cuando: cuando.toISOString() });
}

/** Deja parado un cierre, con su porqué, si no lo estaba ya. */
function parar(carpeta: string, paso: string, motivo: PorQueParo, rojos: Rojo[] = []): void {
  if (!hay(carpeta, "parado.json")) guardarJson(join(carpeta, "parado.json"), { paso, motivo, rojos });
}

/** Por qué se paró un cierre: la puerta 8, la casa, o porque se empezó otra investigación del viaje. */
type PorQueParo = "check" | "house" | "abandoned";

/**
 * Al empezar otra investigación del viaje, el último cierre que no acabó (el que esperaba el sí del viajero, o uno
 * que se quedó a medias) se da por abandonado: lo que dijera ya no es del viaje que va a salir, y no se puede seguir.
 */
export function abandonarElCierre(v: ViajeEnLaMesa): void {
  const c = ultimoCierre(v);
  if (c === null || ["done", "stopped"].includes(etapaDe(c.carpeta))) return;
  parar(c.carpeta, "otra investigación", "abandoned");
}

/** Cuándo se cierra de verdad: cuando el viajero dijo que seguía, si tuvo que decirlo; si no, cuando pulsó. */
function momentoDe(carpeta: string, e: Elegido): string {
  return hay(carpeta, "seguir.json") ? leer<{ cuando: string }>(carpeta, "seguir.json").cuando : e.cuando;
}

/** El primer número libre para dejar al lado lo de antes de un cierre (`precios-<k>.json`). */
function apartado(carpeta: string): number {
  const ks = readdirSync(carpeta)
    .map((x) => /^precios-([1-9]\d*)\.json$/.exec(x)?.[1])
    .filter((x): x is string => x !== undefined)
    .map(Number);
  return Math.max(0, ...ks) + 1;
}

/** Lo que tiene el viaje de la versión que se cierra, y su manera. */
function delElegido(v: ViajeEnLaMesa, carpeta: string): { e: Elegido; viaje: Viaje; entendido: Entendido } {
  const e = leer<Elegido>(carpeta, "elegido.json");
  const version = leerVersion(v, e.version);
  if (version === null) throw new Error("la versión que se cierra ya no está");
  const deLaVersion = version.viaje as Viaje;
  // Con los días que tenía delante el viajero, si los mandó: es su viaje el que se cierra.
  const viaje = e.dias === undefined ? deLaVersion : conTusDias(deLaVersion, e.dias, e.ritmo);
  return { e, viaje, entendido: version.entendido as Entendido };
}

/** Una promesa con su tiempo: si la fuente no contesta, no se le espera más. */
function conTiempo<T>(p: Promise<T>, segundos: number): Promise<T> {
  let reloj: NodeJS.Timeout | undefined;
  const tarde = new Promise<never>((_, mal) => {
    reloj = setTimeout(() => mal(new Error("la fuente no contestó a tiempo")), segundos * 1000);
  });
  return Promise.race([p, tarde]).finally(() => clearTimeout(reloj));
}

/** Lo que sabe el run de la versión del alojamiento elegido: su web y desde qué hora se entra. */
function delRun(v: ViajeEnLaMesa, version: number, alojamiento: string): DelAlojamiento {
  const run = v.ficha.versiones.find((x) => x.n === version)?.run;
  const ruta = run === undefined ? null : join(v.carpeta, "runs", String(run), "busqueda.json");
  if (ruta === null || !existsSync(ruta)) return { web: null, entradaDesde: null };
  try {
    const { busqueda } = JSON.parse(readFileSync(ruta, "utf8")) as { busqueda: Busqueda };
    const f = busqueda.finalistas.find((x) => x.alojamiento.id === alojamiento);
    const web = f?.detalle?.web ?? null;
    // Una investigación de antes pudo guardar la hora como la escribe su fuente («03:00 PM»): se lee igual.
    return { web: enlaceQueVale(web) ? web : null, entradaDesde: hora24(f?.detalle?.entradaDesde) };
  } catch {
    return { web: null, entradaDesde: null };
  }
}

/** El vuelo de hoy que es el mismo que se eligió: mismos aeropuertos, misma salida y, si se sabía, misma compañía. */
function elMismoVuelo(vuelos: Vuelo[], t: Viaje["transportes"][number]): Vuelo | null {
  const mismos = vuelos.filter(
    (x) =>
      x.origen === t.de &&
      x.destino === t.a &&
      x.sale === t.sale &&
      (x.vuelve ?? null) === (t.vuelve ?? null) &&
      (t.precio.vendedor === null || x.aerolinea === t.precio.vendedor),
  );
  return mismos.sort((a, b) => a.precio - b.precio)[0] ?? null;
}

/** Vuelve a pedir a su fuente el precio de cada pieza. Lo que falla no rompe nada: queda «no se sabe». */
async function preciosDeHoy(
  v: ViajeEnLaMesa,
  e: Elegido,
  viaje: Viaje,
  entendido: Entendido,
  f: FuentesDelCierre,
): Promise<DeLosPrecios> {
  const m = viaje.maneras.find((x) => x.id === e.manera)!;
  const dados: Record<string, DeHoy> = {};
  if (f.alojamiento === undefined) dados[m.alojamiento] = "unknown";
  else {
    try {
      const estancia = estanciaDe(entendido);
      const precios = await conTiempo(f.alojamiento.precios([m.alojamiento], estancia), ESPERA_A_LAS_FUENTES);
      const p = precios.find((x) => x.id === m.alojamiento);
      dados[m.alojamiento] =
        p === undefined
          ? "gone"
          : {
              precio: { total: completo(p), moneda: p.moneda, vendedor: p.vendedor, visto: p.visto, enlace: p.enlace },
              cancelable: p.cancelable,
              noches: { entrada: p.entrada, salida: p.salida },
              guardado: false,
              habitacion: p.habitacion,
            };
    } catch {
      dados[m.alojamiento] = "unknown";
    }
  }
  let llega: Vuelo | null = null;
  const t = m.transporte === null ? undefined : viaje.transportes.find((x) => x.id === m.transporte);
  if (t !== undefined) {
    if (f.transporte === undefined) dados[t.id] = "unknown";
    else {
      try {
        const vuelos = await conTiempo(
          f.transporte.fechas({
            origen: t.de,
            destino: t.a,
            ida: t.sale.slice(0, 10),
            vuelta: t.vuelve === null ? null : t.vuelve.slice(0, 10),
            moneda: t.precio.moneda,
            mercado: (entendido.origin?.country ?? "").toLowerCase(),
          }),
          ESPERA_A_LAS_FUENTES,
        );
        llega = elMismoVuelo(vuelos, t);
        const viajeros = viaje.adultos + viaje.ninos.length;
        dados[t.id] =
          llega === null
            ? "gone"
            : {
                precio: {
                  total: paraElGrupo(llega, viajeros),
                  moneda: llega.moneda,
                  vendedor: llega.aerolinea,
                  visto: llega.visto,
                  enlace: llega.enlace,
                },
                cancelable: null,
                noches: null,
                guardado: llega.guardado,
              };
      } catch {
        dados[t.id] = "unknown";
      }
    }
  }
  const alojamiento = delRun(v, e.version, m.alojamiento);
  return {
    dados,
    alojamiento,
    llegada: {
      hayTransporte: t !== undefined,
      sale: llega?.sale ?? t?.sale ?? null,
      minutosIda: llega?.minutosIda ?? null,
      llega: llega?.llega ?? null,
      entrada: viaje.entrada,
      entradaDesde: alojamiento.entradaDesde,
      lon: viaje.destino.punto.lon,
    },
  };
}

/** Lo que se cuenta de un cierre sin frases todavía: todo lo del código, de lo que hay en su carpeta. */
function montar(
  viaje: Viaje,
  e: Elegido,
  p: DeLosPrecios,
  comprobados: Record<string, ComprobacionDeEnlace>,
  sigue: boolean,
  cuando: string,
): { cierre: Cierre; piezas: PiezaElegida[] } {
  const m = viaje.maneras.find((x) => x.id === e.manera)!;
  const piezas = piezasDe(viaje, m);
  // La edad de cada precio se mide cuando se cierra de verdad, no cuando se pulsó.
  const precios = piezas.map((x) => precioDeHoy(x, p.dados[x.ref] ?? "unknown", cuando));
  const enlaces: EnlaceDeReserva[] = enlacesSinComprobar(viaje, m, precios, p.alojamiento).map((x) => ({
    ...x,
    comprobado: comprobados[x.url] ?? "unchecked",
  }));
  const llegada = llegadaDe(p.llegada);
  const cierre: Cierre = {
    cuando,
    version: e.version,
    manera: m.id,
    alojamiento: m.alojamiento,
    transporte: m.transporte,
    moneda: m.moneda,
    total: { antes: m.total, hoy: totalDeHoy(precios) },
    precios,
    subida: { pide: pideSeguir(precios, m.total), sigue },
    enlaces,
    mapas: mapasDe(viaje, m.alojamiento),
    reservas: reservasDe(viaje, piezas, precios),
    papeles: plazosDe(viaje),
    sinConfirmar: sinConfirmarDe(viaje, precios, enlaces, llegada),
    llegada,
    entradaDesde: p.alojamiento.entradaDesde,
    sinFrases: null,
  };
  return { cierre, piezas };
}

/** Por dónde va un cierre, leído de su carpeta. */
export function etapaDe(carpeta: string): EtapaDelCierre {
  if (hay(carpeta, "parado.json")) return "stopped";
  if (hay(carpeta, "viaje.json")) return "done";
  if (!hay(carpeta, "precios.json")) return "prices";
  if (hay(carpeta, "puerta8.json")) return "check";
  if (hay(carpeta, "orden.json")) return "check";
  if (hay(carpeta, "enlaces.json")) return "order";
  // Si el cambio de precio pide el sí del viajero y no lo ha dado, es su turno.
  if (leer<DeLosPrecios>(carpeta, "precios.json").pide === true && !hay(carpeta, "seguir.json")) return "yours";
  return "links";
}

/**
 * Por dónde va un cierre, sabiendo si la casa lo lleva ahora: uno a medias que nadie lleva (la casa se cayó mientras
 * cerraba) no está trabajando, está parado, y se puede volver a cerrar.
 */
export function etapaViva(carpeta: string, corre: boolean): EtapaDelCierre {
  const etapa = etapaDe(carpeta);
  return corre || ["yours", "done", "stopped"].includes(etapa) ? etapa : "stopped";
}

/**
 * Lo que la web ve de un cierre: de qué versión es, su etapa y, cuando espera al viajero, lo que cambió de precio.
 * `corre` dice si la casa lo está llevando ahora.
 */
export function cierreDeCara(
  v: ViajeEnLaMesa,
  c: { carpeta: string; n: number },
  corre = false,
): Record<string, unknown> {
  const etapa = etapaViva(c.carpeta, corre);
  const cara: Record<string, unknown> = { n: c.n, stage: etapa, version: versionDelCierre(c.carpeta) };
  if (hay(c.carpeta, "elegido.json")) cara.way = leer<Elegido>(c.carpeta, "elegido.json").manera;
  if (etapa === "yours") {
    const { e, viaje } = delElegido(v, c.carpeta);
    const p = leer<DeLosPrecios>(c.carpeta, "precios.json");
    const { cierre } = montar(viaje, e, p, {}, false, momentoDe(c.carpeta, e));
    cara.prices = cierre.precios.map((x) => ({
      piece: x.pieza,
      ref: x.ref,
      seen: x.antes.total,
      today: x.hoy?.total ?? null,
      change: x.cambio,
      difference: x.diferencia,
      currency: x.antes.moneda,
    }));
    cara.total = cierre.total;
  }
  if (etapa === "stopped") {
    const parado = hay(c.carpeta, "parado.json") ? leer<{ motivo?: PorQueParo }>(c.carpeta, "parado.json") : null;
    cara.why = parado === null ? "interrupted" : (parado.motivo ?? "check");
  }
  return cara;
}

/** Comprueba cada enlace, de uno en uno y con su tope por cierre; los de más se quedan sin comprobar. */
async function comprobarLosEnlaces(urls: string[], f: FuentesDelCierre): Promise<Record<string, ComprobacionDeEnlace>> {
  const vistos: Record<string, ComprobacionDeEnlace> = {};
  if (f.comprobar === undefined) return vistos;
  for (const url of [...new Set(urls)].slice(0, COMPROBAR_ENLACES.porCierre)) {
    try {
      vistos[url] = await f.comprobar(url);
    } catch {
      vistos[url] = "unchecked";
    }
  }
  return vistos;
}

/** Lanza al que explica para el orden, con sus vueltas si vuelve en rojo. Si no hay IA, o no sale, no hay frases. */
async function elOrden(
  carpeta: string,
  viaje: Viaje,
  cierre: Cierre,
  entendido: Entendido,
  o: AlCerrar,
): Promise<DelOrden> {
  if (o.lanzador === null) return { entrega: null, falta: "no_ai" };
  const ahora = o.ahora ?? ((): Date => new Date());
  const dado = paraElOrden(viaje, cierre);
  const json = (x: unknown): string => JSON.stringify(x, null, 2);
  const piezas: Pieza[] = [
    { ruta: "trip.json", contenido: json(sinPalabras(entendido)) },
    { ruta: "closing.json", contenido: json(dado) },
  ];
  let devuelto: Pieza | null = null;
  for (let vuelta = 1; vuelta <= 1 + VUELTAS_DEL_ORDEN; vuelta++) {
    const id = `orden-v${vuelta}`;
    const puesto =
      puestosDe(carpeta).find((p) => p.id === id) ??
      montarPuesto(carpeta, id, "trip-explainer", devuelto === null ? piezas : [...piezas, devuelto]);
    const base = { puesto: id, asiento: puesto.asiento, desde: ahora().toISOString(), hasta: null, gasto: null };
    apuntarTrabajo(carpeta, { ...base, estado: "working", fallo: null });
    const r = await lanzarAsiento(puesto, o.lanzador, o.tope ?? TOPE_DE_UN_ASIENTO);
    const entregado = existsSync(join(puesto.carpeta, "out", "delivery.json"));
    const estado = r.fueraDeTope ? "stopped" : r.error !== null || !entregado ? "failed" : "done";
    apuntarTrabajo(carpeta, {
      ...base,
      estado,
      hasta: ahora().toISOString(),
      gasto: r.gasto,
      fallo: estado === "done" ? null : (r.error ?? "acabó sin dejar su entrega"),
    });
    if (estado !== "done") return { entrega: null, falta: "failed" };
    const metodo = recogerAsiento(puesto);
    let rojos: Rojo[] = [...metodo.rojos];
    try {
      if (metodo.entrega !== null) rojos.push(...puertaDelOrden(metodo.entrega, { dado }).rojos);
    } catch {
      rojos = [...rojos, { donde: "delivery", que: "la entrega no tiene la forma de su contrato" }];
    }
    guardarJson(join(carpeta, `${id}.puertas.json`), { verde: rojos.length === 0, rojos });
    if (rojos.length === 0 && metodo.entrega !== null)
      return { entrega: (metodo.entrega as { closing: DelOrden["entrega"] }).closing, falta: null };
    devuelto = { ruta: "returned.json", contenido: json({ what_was_wrong: rojos, delivery: metodo.entrega }) };
  }
  return { entrega: null, falta: "rejected" };
}

/** Las frases del que explica, puestas en el cierre: una por reserva y una por plazo, y lo que no se sabe. */
function conSusFrases(cierre: Cierre, orden: DelOrden): Cierre {
  if (orden.entrega === null) return { ...cierre, sinFrases: orden.falta ?? "failed" };
  const de = orden.entrega;
  return {
    ...cierre,
    reservas: cierre.reservas.map((r) => ({ ...r, frase: de.steps.find((s) => s.step === r.n)!.says })),
    papeles: cierre.papeles.map((p, i) => ({ ...p, frase: de.papers.find((x) => x.paper === i)!.says })),
    dudas: de.unknowns,
    sinFrases: null,
  };
}

export type Cerrado = { etapa: EtapaDelCierre; version: number | null };

/**
 * Lleva un cierre desde lo que hay en su carpeta hasta que esté hecho, espere al viajero o lo pare la puerta 8. Se
 * puede llamar las veces que haga falta: sigue donde lo dejó.
 */
export async function llevarElCierre(
  v: ViajeEnLaMesa,
  c: { carpeta: string; n: number },
  o: AlCerrar,
): Promise<Cerrado> {
  const ahora = o.ahora ?? ((): Date => new Date());
  const { carpeta } = c;
  if (hay(carpeta, "parado.json")) return { etapa: "stopped", version: null };
  if (hay(carpeta, "viaje.json")) return { etapa: "done", version: guardarCierre(v, c.n, ahora()).n };
  const { e, viaje, entendido } = delElegido(v, carpeta);
  // Solo se cierra la versión que se eligió, y mientras sea la que se enseña en el mapa.
  if (v.ficha.estado !== "on_map" || v.ficha.version !== e.version) {
    parar(carpeta, "otra versión", "abandoned");
    return { etapa: "stopped", version: null };
  }
  const pedir = async (): Promise<void> => {
    const p = await preciosDeHoy(v, e, viaje, entendido, o.fuentes);
    const { cierre } = montar(viaje, e, p, {}, false, momentoDe(carpeta, e));
    guardarJson(join(carpeta, "precios.json"), { ...p, pide: cierre.subida.pide, pedidos: ahora().toISOString() });
  };

  // 2. Los precios de hoy, a su fuente. Si alguno sube mucho o falta, se pregunta antes de seguir.
  if (!hay(carpeta, "precios.json")) await pedir();
  if (etapaDe(carpeta) === "yours") return { etapa: "yours", version: null };
  // Si el viajero dijo que seguía cuando los precios pedidos ya pasaban de su edad, se vuelven a pedir antes de
  // cerrar, una vez por cada sí; y si lo de ahora vuelve a pedir su sí, se le vuelve a preguntar.
  if (hay(carpeta, "seguir.json") && !hay(carpeta, "enlaces.json")) {
    const cuando = momentoDe(carpeta, e);
    const antes = leer<DeLosPrecios>(carpeta, "precios.json");
    const { cierre } = montar(viaje, e, antes, {}, true, cuando);
    const pedidosAntes = antes.pedidos === undefined || antes.pedidos < cuando;
    if (pedidosAntes && cierre.precios.some((x) => x.edad === "stale")) {
      const k = apartado(carpeta);
      renameSync(join(carpeta, "precios.json"), join(carpeta, `precios-${k}.json`));
      await pedir();
      if (leer<DeLosPrecios>(carpeta, "precios.json").pide === true) {
        renameSync(join(carpeta, "seguir.json"), join(carpeta, `seguir-${k}.json`));
        return { etapa: "yours", version: null };
      }
    }
  }
  const p = leer<DeLosPrecios>(carpeta, "precios.json");
  const sigue = hay(carpeta, "seguir.json");
  const cuando = momentoDe(carpeta, e);

  // 5. Los enlaces: cada uno, comprobado una vez.
  if (!hay(carpeta, "enlaces.json")) {
    const { cierre } = montar(viaje, e, p, {}, sigue, cuando);
    guardarJson(
      join(carpeta, "enlaces.json"),
      await comprobarLosEnlaces(
        cierre.enlaces.map((x) => x.url),
        o.fuentes,
      ),
    );
  }
  const comprobados = leer<Record<string, ComprobacionDeEnlace>>(carpeta, "enlaces.json");
  const { cierre, piezas } = montar(viaje, e, p, comprobados, sigue, cuando);

  // 3. El que explica deja el orden: el del código, con una frase de cada cosa que pasa la puerta 7.
  if (!hay(carpeta, "orden.json"))
    guardarJson(join(carpeta, "orden.json"), await elOrden(carpeta, viaje, cierre, entendido, o));
  const cerrado: Viaje = { ...viaje, cierre: conSusFrases(cierre, leer<DelOrden>(carpeta, "orden.json")) };

  // 4. La puerta 8, con lo que dio cada fuente y lo que respondió cada enlace.
  const material: MaterialDelCierre = { piezas, dados: p.dados, comprobados, llegada: p.llegada, cuando };
  const veredicto = puertaCierre(cerrado, material);
  guardarJson(join(carpeta, "puerta8.json"), veredicto);
  if (!veredicto.verde) {
    parar(carpeta, "la puerta 8", "check", veredicto.rojos);
    return { etapa: "stopped", version: null };
  }
  // 6. Sale el viaje cerrado: una versión más, y el viaje, cerrado.
  guardarJson(join(carpeta, "viaje.json"), cerrado);
  return { etapa: "done", version: guardarCierre(v, c.n, ahora()).n };
}

/**
 * Lo que responde un enlace, sin tumbar la web ni gastar: una petición que solo pide la cabecera (y, si no la
 * admite, el primer byte), con su tiempo, siguiendo unas pocas redirecciones y solo por https. Responde si contesta
 * bien; no responde si no existe (404, 410) o su nombre no existe; si la web no deja mirar, no se sabe.
 */
/** A qué direcciones lleva el nombre de una máquina. */
export type Resolver = (nombre: string) => Promise<string[]>;
const porSuNombre: Resolver = async (nombre) => (await lookup(nombre, { all: true })).map((x) => x.address);

export async function comprobarEnlace(
  url: string,
  pedir: typeof fetch = fetch,
  resolver: Resolver = porSuNombre,
): Promise<ComprobacionDeEnlace> {
  let actual = url;
  const una = (metodo: "HEAD" | "GET"): Promise<Response> =>
    pedir(actual, {
      method: metodo,
      redirect: "manual",
      signal: AbortSignal.timeout(COMPROBAR_ENLACES.segundos * 1000),
      headers: { "user-agent": "El Dorado link check", ...(metodo === "GET" ? { range: "bytes=0-0" } : {}) },
    });
  for (let salto = 0; salto <= COMPROBAR_ENLACES.redirecciones; salto++) {
    // Solo se llama a una página de fuera: https, con nombre, sin puerto y que no sea de dentro de la red de la
    // casa. Un enlace lo trae una fuente, y una redirección, cualquiera: ni uno ni otra mandan a la casa a su red.
    if (!enlaceQueVale(actual) || !paginaDeFuera(actual)) return "unchecked";
    // Un nombre de fuera puede llevar dentro (uno que resuelve a una dirección privada o a la de los metadatos de
    // una nube): se mira a dónde lleva antes de llamar, en cada salto. Si no se puede saber, porque la máquina sale
    // por un intermediario que resuelve él, se sigue: quien llama entonces no es la casa. No cierra del todo (entre
    // mirar y llamar el nombre puede cambiar): la salida del servidor a redes privadas se cierra en el servidor.
    let lleva: string[] = [];
    try {
      lleva = await resolver(new URL(actual).hostname);
    } catch {
      lleva = [];
    }
    if (lleva.some(direccionDeDentro)) return "unchecked";
    let r: Response;
    try {
      r = await una("HEAD");
      if ([403, 405, 501].includes(r.status)) {
        r = await una("GET");
        await r.body?.cancel();
      }
    } catch (error) {
      const codigo = (error as { cause?: { code?: string } }).cause?.code;
      return codigo === "ENOTFOUND" ? "down" : "unchecked";
    }
    if (r.status >= 300 && r.status < 400) {
      const donde = r.headers.get("location");
      if (donde === null) return "unchecked";
      actual = new URL(donde, actual).href;
      continue;
    }
    if (r.status >= 200 && r.status < 300) return "ok";
    return r.status === 404 || r.status === 410 ? "down" : "unchecked";
  }
  return "unchecked";
}
