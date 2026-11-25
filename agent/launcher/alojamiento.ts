// El alojamiento, a ratos (8.2), en la casa. Lo que pide el viajero desde la ficha de un alojamiento llega aquí:
//
// - Sus gustos, cruzados al instante con la ficha de cada alojamiento de la versión que ve: lo imprescindible
//   descarta y lo que le gusta sube la nota. Código, sin IA y sin gastar (`conTusGustos`).
// - Otra zona, otros mínimos u otro tope de gasto: la misma búsqueda otra vez, en una investigación que rehace
//   (`rehacer`, con el pedido en `rehecho.json`). Al mirar, a quien ya se miró en la versión de la que se parte no
//   se le vuelve a mirar: su puesto se copia con su entrega y vuelve a pasar sus puertas. De los nuevos se mira a
//   unos pocos, como mucho (`NUEVOS_QUE_SE_MIRAN`); los demás se quedan sin mirar, y se dice.
// - Lo que cuesta cada cosa, antes: por lo que gastó cada mirada en las investigaciones de esa cuenta.
// - Una pregunta suya sobre un alojamiento que se miró («¿el gimnasio tiene pesas?»): la contesta el que mira, en su
//   modo de preguntas, con el mismo material de cuando lo miró y su prueba, y pasa su puerta antes de llegar a la web.
//   Cada pregunta tiene su carpeta en la del viaje, en la mesa:
//
//   preguntas/<n>/pedida.json     de qué versión y de qué alojamiento, la pregunta y cuándo
//   preguntas/<n>/adelante.json   el botón del viajero, con su techo de gasto si lo dio
//   preguntas/<n>/puestos/ ...    el puesto del que mira, con sus vueltas, sus sellos y sus trabajos
//   preguntas/<n>/respuesta.json  lo que contestó y pasó su puerta
//   preguntas/<n>/parada.json     por qué no salió, si no salió
//
// Este archivo no llama a ninguna IA: monta, lanza con el lanzador que se le dé (con el adelante del viajero y bajo
// su techo), recoge y comprueba.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { NUEVOS_QUE_SE_MIRAN, PREGUNTA, VUELTAS_DE_LA_PREGUNTA } from "../data/alojamiento.ts";
import { COSAS } from "../data/gustos.ts";
import type { ClaseDeCambio } from "../data/momentos.ts";
import { TOPE_DE_UN_ASIENTO } from "../data/pasos.ts";
import { quienResponde } from "../data/responde.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { pegasDeLaPregunta, puertaRespuesta, type EntregaDeLaRespuesta } from "../gates/puerta_respuesta.ts";
import type { Viaje } from "../output/viaje.ts";
import {
  gustosConLosTuyos,
  pideBuscarConLosGustos,
  type GustoMarcado,
  type PedidoDeAlojamiento,
} from "../scripts/alojamiento.ts";
import type { Busqueda, ZonaDeBusqueda } from "../scripts/busqueda_alojamiento.ts";
import { cribar, imprescindiblesSinSaber, type Descarte } from "../scripts/cribas.ts";
import type { Entendido, EntregaDeMirar } from "../scripts/formas.ts";
import { impactoDe, type EstimadoPorAsiento, type Impacto } from "../scripts/impacto.ts";
import type { TablaDeCaminos } from "../tools/caminos.ts";
import { elegirFotos } from "../tools/fotos.ts";
import type { Minimos } from "../tools/fuentes/tipos.ts";
import { lanzarAsiento, ordenDeApertura, recogerAsiento, type Lanzador, type Tope } from "./asiento.ts";
import { adelanteDe, darElAdelante } from "./casa.ts";
import { sinPalabras } from "./escuchar.ts";
import { apuntar, guardarJson, leerVersion, viajesDe, type ViajeEnLaMesa } from "./mesa.ts";
import { materialDe, type Quien, type Recogido } from "./mirar.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";
import { rehechoDe } from "./rehacer.ts";
import { acaboSinEntregar, apuntarTrabajo, gastoDe, trabajosDe } from "./trabajos.ts";

const ASIENTO = "lodging-viewer";
const hay = (carpeta: string, nombre: string): boolean => existsSync(join(carpeta, nombre));
const leer = <T>(carpeta: string, nombre: string): T => JSON.parse(readFileSync(join(carpeta, nombre), "utf8")) as T;
const json = (dato: unknown): string => JSON.stringify(dato, null, 2);

// ---------- lo pedido, en el run que rehace

/** La clave con que va lo de este momento en el `pedido` de un run que rehace: los demás momentos llevan la suya. */
export const DEL_ALOJAMIENTO = "lodging";

/** Lo que pidió el viajero desde la ficha de un alojamiento, si el run rehace por eso; null si no. */
export function pedidoDeAlojamientoDe(run: string): PedidoDeAlojamiento | null {
  const pedido = rehechoDe(run)?.pedido as Record<string, unknown> | null | undefined;
  const suyo = pedido?.[DEL_ALOJAMIENTO];
  return typeof suyo === "object" && suyo !== null ? (suyo as PedidoDeAlojamiento) : null;
}

/** Lo entendido del run con los gustos que marcó el viajero, si los pidió: con ellos se busca, se criba y se cruza. */
export function conLosGustosPedidos(run: string, viaje: Entendido): Entendido {
  const marcados = pedidoDeAlojamientoDe(run)?.tastes ?? null;
  return marcados === null ? viaje : { ...viaje, tastes: gustosConLosTuyos(viaje.tastes, marcados) };
}

/** Cómo busca la casa: dónde, con qué mínimos y hasta dónde ensancha, y con qué opciones. */
export type ComoBuscar = {
  donde: ZonaDeBusqueda[];
  minimos: Minimos[];
  radios: number[];
  tope: number | null;
};

/**
 * La búsqueda con lo que pidió el viajero encima de la de siempre: en su zona, sin ensanchar (la zona la dijo él);
 * con sus mínimos, tal cual y sin bajarlos; y sin pasar de su tope. Lo que no pidió, como siempre.
 */
export function buscarConLoPedido(run: string, base: ComoBuscar): ComoBuscar {
  const p = pedidoDeAlojamientoDe(run);
  if (p === null) return base;
  const c = { ...base };
  if (p.zone !== null) {
    c.donde = [{ id: "asked", nombre: "asked", lat: p.zone.lat, lon: p.zone.lon, radio: p.zone.radius_m }];
    c.radios = [1];
  }
  if (p.minimums !== null)
    c.minimos = [{ nota: p.minimums.score, opiniones: p.minimums.reviews, estrellas: p.minimums.stars }];
  if (p.max_price !== null) c.tope = p.max_price;
  return c;
}

// ---------- mirar solo a los nuevos

/** Las clases de cambio con que la mirada de un alojamiento sigue valiendo: el mismo cuarto, las mismas fechas. */
const MIRADA_QUE_SIGUE: ClaseDeCambio[] = ["lodging", "lodging_taste"];

/** Lo que se hizo al mirar en un run que rehace: a quién se copió su mirada, a quién se mira y quién se queda sin. */
export type MiradasReusadas = { reusadas: string[]; nuevas: string[]; sinMirar: string[] };

/**
 * En un run que rehace el alojamiento, copia de la versión de la que parte la mirada de cada finalista que ya se miró
 * y pasó sus puertas: su puesto, con su entrega y su sello, bajo el nombre que le toca ahora. No se le vuelve a lanzar
 * (ya entregó), y al recoger vuelve a pasar sus puertas. Devuelve a quién se mira: los reusados y, de los nuevos, los
 * primeros que caben. Null si el run no rehace por lo pedido desde la ficha: entonces se mira como siempre.
 */
export function reutilizarMiradas(run: string, b: Busqueda, nuevos = NUEVOS_QUE_SE_MIRAN): MiradasReusadas | null {
  const r = rehechoDe(run);
  if (r === null || pedidoDeAlojamientoDe(run) === null || !r.cambio.every((c) => MIRADA_QUE_SIGUE.includes(c)))
    return null;
  const desde = join(dirname(resolve(run)), String(r.de));
  const deAntes = new Map<string, string>();
  if (hay(desde, "como_es.json") && hay(desde, "mirar.json")) {
    for (const a of leer<Recogido>(desde, "como_es.json").alojamientos) {
      const buena = a.pasadas.find((p) => p.entrega !== null && p.metodo.verde && p.comoEs.verde);
      if (buena !== undefined) deAntes.set(a.alojamiento, buena.puesto);
    }
  }
  const hecho: MiradasReusadas = { reusadas: [], nuevas: [], sinMirar: [] };
  for (const [i, ficha] of b.finalistas.entries()) {
    const id = ficha.alojamiento.id;
    const puesto = deAntes.get(id);
    if (puesto === undefined) {
      (hecho.nuevas.length < nuevos ? hecho.nuevas : hecho.sinMirar).push(id);
      continue;
    }
    const nuevo = `a${i + 1}-p1`;
    const copia = (de: string, a: string): void => {
      if (existsSync(join(desde, de)))
        cpSync(join(desde, de), join(run, a), { recursive: true, preserveTimestamps: true });
    };
    if (!existsSync(join(run, "sellos", `${nuevo}.json`))) {
      copia(`puestos/${puesto}`, `puestos/${nuevo}`);
      copia(`${puesto}.puertas.json`, `${nuevo}.puertas.json`);
      copia(`ordenes/${puesto}.txt`, `ordenes/${nuevo}.txt`);
      // El sello, lo último: un puesto sin sello es de un corte, y se rehace.
      copia(`sellos/${puesto}.json`, `sellos/${nuevo}.json`);
    }
    hecho.reusadas.push(id);
  }
  return hecho;
}

// ---------- tus gustos, al instante

/** Cómo queda un alojamiento de la versión con tus gustos: su nota, su descarte y lo imprescindible sin saber. */
export type ConTusGustos = { id: string; score: number | null; discarded: Descarte | null; unknown_musts: string[] };

/** El run de la versión que se enseña. */
function runDeLaVersion(v: ViajeEnLaMesa, n: number | null = v.ficha.version): string | null {
  const run = v.ficha.versiones.find((x) => x.n === n)?.run;
  return run === undefined ? null : join(v.carpeta, "runs", String(run));
}

/** Lo que entregó el que mira de cada finalista de un run: la primera pasada que pasó sus dos puertas, o nada. */
function miradosDelRun(run: string): Record<string, EntregaDeMirar | null> {
  const mirados: Record<string, EntregaDeMirar | null> = {};
  if (!hay(run, "como_es.json")) return mirados;
  for (const a of leer<Recogido>(run, "como_es.json").alojamientos) {
    const buena = a.pasadas.find((p) => p.entrega !== null && p.metodo.verde && p.comoEs.verde);
    mirados[a.alojamiento] = (buena?.entrega as EntregaDeMirar | undefined) ?? null;
  }
  return mirados;
}

/** Los gustos con que se hizo un run: los de lo entendido, con los que pidió el viajero si rehacía por ellos. */
function gustosDelRun(run: string): Entendido["tastes"] {
  const escuchado = hay(run, "escuchado.json")
    ? leer<{ entendido: Entendido }>(run, "escuchado.json").entendido
    : leer<Entendido>(run, "entendido.json");
  return conLosGustosPedidos(run, sinPalabras(escuchado)).tastes;
}

/**
 * Tus gustos de las cosas del alojamiento, cruzados con la ficha de cómo es de cada alojamiento de la versión que ves,
 * con las mismas cribas que la tabla: lo imprescindible que falta descarta, y lo que te gusta pesa más en la nota.
 * Código, al instante, sin IA y sin gastar; no guarda nada. Null si la versión no tiene de dónde sacarlo.
 */
export function conTusGustos(v: ViajeEnLaMesa, marcados: GustoMarcado[] | null): ConTusGustos[] | null {
  const run = runDeLaVersion(v);
  if (run === null || !hay(run, "busqueda.json") || !hay(run, "dias.json")) return null;
  const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
  const { paradas } = leer<{ paradas: { punto: { lat: number; lon: number } }[] }>(run, "dias.json");
  let caminos: TablaDeCaminos | null = null;
  if (hay(run, "caminos.json")) {
    const t = leer<{ tabla: TablaDeCaminos }>(run, "caminos.json").tabla;
    caminos = t.caminos.length > 0 ? t : null;
  }
  const gustos = gustosConLosTuyos(gustosDelRun(run), marcados);
  const mirados = miradosDelRun(run);
  const candidatos = busqueda.finalistas.map((ficha) => ({ ficha, mirado: mirados[ficha.alojamiento.id] ?? null }));
  const ctx = { gustos, paradas: paradas.map((p) => p.punto), caminos };
  return cribar(candidatos, ctx).map((c, i) => ({
    id: c.id,
    score: c.nota.nota,
    discarded: c.descarte,
    unknown_musts: imprescindiblesSinSaber(candidatos[i], ctx),
  }));
}

/** Tus gustos de partida, para la web: los de las cosas del alojamiento con que se hizo la versión que ves. */
export function tusGustosDePartida(v: ViajeEnLaMesa): GustoMarcado[] {
  const run = runDeLaVersion(v);
  if (run === null) return [];
  return gustosDelRun(run)
    .filter((g) => Object.hasOwn(COSAS, g.thing))
    .map((g) => ({ thing: g.thing, weight: g.weight }));
}

// ---------- lo que cuesta

/**
 * Lo que gastó de media una mirada (una pasada del que mira un alojamiento) en las investigaciones y preguntas de esa
 * cuenta; null si no hay ninguna con su gasto sabido.
 */
export function gastoDeUnaMirada(dueno: string, mesa: string): number | null {
  const usds: number[] = [];
  for (const ficha of viajesDe(dueno, mesa)) {
    const carpeta = join(resolve(mesa), "viajes", ficha.id);
    const carpetas = [
      ...ficha.runs.map((r) => join(carpeta, "runs", String(r.n))),
      ...(existsSync(join(carpeta, PREGUNTAS))
        ? readdirSync(join(carpeta, PREGUNTAS)).map((n) => join(carpeta, PREGUNTAS, n))
        : []),
    ];
    for (const c of carpetas)
      for (const t of trabajosDe(c))
        if (t.asiento === ASIENTO && t.estado !== "queued" && t.gasto !== null) usds.push(t.gasto.usd);
  }
  if (usds.length === 0) return null;
  return Math.round((usds.reduce((s, x) => s + x, 0) / usds.length) * 100) / 100;
}

/** El impacto de lo que pide el viajero desde la ficha, y a cuántos nuevos se mirará como mucho y a cuánto cada uno. */
export type ImpactoDelAlojamiento = { impact: Impacto; looks: { at_most: number; each_usd: number | null } };

/**
 * Las clases de cambio de lo pedido desde la ficha: buscar otra vez (`lodging`) si pide otra zona, otros mínimos u
 * otro tope, o si sus gustos cambian un imprescindible que la búsqueda le pide a la fuente; si no, solo la tabla.
 * `dePartida` son tus gustos de la versión de la que se parte.
 */
export const clasesDelPedido = (p: PedidoDeAlojamiento, dePartida: GustoMarcado[]): ClaseDeCambio[] =>
  pideBuscarConLosGustos(p, dePartida) ? ["lodging"] : ["lodging_taste"];

/**
 * Lo que dejaría de valer y lo que costaría lo pedido: buscar otra vez (la búsqueda, mirar a los nuevos, el que cruza
 * y el que explica) o, si solo cambian tus gustos y no lo que se busca, cruzar y explicar otra vez. Lo que costaría
 * mirar no es lo de una investigación entera: es lo de una mirada por cada candidato nuevo, como mucho los que caben.
 */
export function impactoDelAlojamiento(
  p: PedidoDeAlojamiento,
  estimado: EstimadoPorAsiento,
  porMirada: number | null,
  dePartida: GustoMarcado[] = [],
): ImpactoDelAlojamiento {
  const clases = clasesDelPedido(p, dePartida);
  const busca = clases.includes("lodging");
  const conMiradas: EstimadoPorAsiento = { ...estimado };
  delete conMiradas[ASIENTO];
  if (porMirada !== null)
    conMiradas[ASIENTO] = {
      usd: porMirada * NUEVOS_QUE_SE_MIRAN,
      de: estimado[ASIENTO]?.de ?? 1,
    };
  return {
    impact: impactoDe(clases, conMiradas),
    looks: { at_most: busca ? NUEVOS_QUE_SE_MIRAN : 0, each_usd: porMirada },
  };
}

// ---------- una pregunta sobre un alojamiento

export const PREGUNTAS = "preguntas";

/** Por qué no se puede preguntar, por su clave: la frase la pone la web. */
export class FalloDeLaPregunta extends Error {}

export type PreguntaPedida = {
  n: number;
  version: number;
  alojamiento: string;
  pregunta: string;
  idioma: string;
  cuando: string;
};

const carpetaDePreguntas = (v: ViajeEnLaMesa): string => join(v.carpeta, PREGUNTAS);
export const carpetaDeLaPregunta = (v: ViajeEnLaMesa, n: number): string => join(carpetaDePreguntas(v), String(n));

/** Las preguntas que se han hecho de un viaje, de la primera a la última. */
export function preguntasDe(v: ViajeEnLaMesa): number[] {
  const carpeta = carpetaDePreguntas(v);
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta)
    .filter((x) => /^[1-9]\d*$/.test(x) && existsSync(join(carpeta, x, "pedida.json")))
    .map(Number)
    .sort((a, b) => a - b);
}

/** El puesto en que se miró un alojamiento en el run de una versión, con su entrega buena; null si no se miró. */
function puestoDeLaMirada(run: string, alojamiento: string): Puesto | null {
  if (!hay(run, "como_es.json") || !hay(run, "mirar.json")) return null;
  const a = leer<Recogido>(run, "como_es.json").alojamientos.find((x) => x.alojamiento === alojamiento);
  const buena = a?.pasadas.find((p) => p.entrega !== null && p.metodo.verde && p.comoEs.verde);
  if (buena === undefined) return null;
  const { quienes } = leer<{ quienes: Quien[] }>(run, "mirar.json");
  if (!quienes.some((q) => q.puesto === buena.puesto && q.alojamiento === alojamiento)) return null;
  return puestosDe(run).find((p) => p.id === buena.puesto) ?? null;
}

/**
 * Una pregunta del viajero sobre un alojamiento de la versión que ve, que se miró: la apunta con su adelante y
 * devuelve su número. Lo que no es una pregunta, o un alojamiento sin mirar, no llega a ningún asiento.
 */
export function pedirPregunta(
  v: ViajeEnLaMesa,
  o: { alojamiento: unknown; pregunta: unknown; techo?: number | null; hoy?: Date },
): PreguntaPedida {
  const hoy = o.hoy ?? new Date();
  if ((v.ficha.estado !== "on_map" && v.ficha.estado !== "closed") || v.ficha.version === null)
    throw new FalloDeLaPregunta("not_now");
  if (pegasDeLaPregunta(o.pregunta, PREGUNTA.letras).length > 0) throw new FalloDeLaPregunta("bad_question");
  const viaje = leerVersion(v)?.viaje as Viaje | undefined;
  const run = runDeLaVersion(v);
  if (viaje === undefined || run === null || typeof o.alojamiento !== "string")
    throw new FalloDeLaPregunta("bad_lodging");
  if (!viaje.alojamientos.some((a) => a.id === o.alojamiento)) throw new FalloDeLaPregunta("bad_lodging");
  if (puestoDeLaMirada(run, o.alojamiento) === null) throw new FalloDeLaPregunta("not_looked");
  const n = (preguntasDe(v).at(-1) ?? 0) + 1;
  const carpeta = carpetaDeLaPregunta(v, n);
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  const pedida: PreguntaPedida = {
    n,
    version: v.ficha.version,
    alojamiento: o.alojamiento,
    pregunta: (o.pregunta as string).trim(),
    idioma: viaje.idioma,
    cuando: hoy.toISOString(),
  };
  darElAdelante(carpeta, o.techo ?? null, hoy);
  guardarJson(join(carpeta, "pedida.json"), pedida);
  apuntar(v, "lodging_question", { pregunta: n, version: pedida.version, alojamiento: pedida.alojamiento }, hoy);
  return pedida;
}

/** El identificador de la pregunta en el material del asiento. */
const ID_DE_LA_PREGUNTA = "q1";

/** Lo que tiene delante el que mira para contestar: el material de cuando lo miró, y la pregunta. */
function piezasDeLaPregunta(v: ViajeEnLaMesa, p: PreguntaPedida): { piezas: Pieza[]; mirado: Puesto } {
  const run = runDeLaVersion(v, p.version);
  const mirado = run === null ? null : puestoDeLaMirada(run, p.alojamiento);
  if (mirado === null) throw new FalloDeLaPregunta("not_looked");
  const dentro = join(mirado.carpeta, "in");
  const piezas: Pieza[] = [];
  const recorre = (carpeta: string, prefijo: string): void => {
    for (const nombre of readdirSync(carpeta).sort()) {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) recorre(ruta, `${prefijo}${nombre}/`);
      else piezas.push({ ruta: `${prefijo}${nombre}`, copiaDe: ruta });
    }
  };
  recorre(dentro, "");
  piezas.push({
    ruta: "question.json",
    contenido: json({ id: ID_DE_LA_PREGUNTA, language: p.idioma, text: p.pregunta }),
  });
  return { piezas, mirado };
}

export type EstadoDeLaPregunta =
  { estado: "working"; espera: string | null } | { estado: "ready" } | { estado: "stopped"; rojos: Rojo[] };

function puestoDe(carpeta: string): Puesto | null {
  const suyos = puestosDe(carpeta).filter((p) => /^pregunta-v\d+$/.test(p.id));
  return suyos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).pop() ?? null;
}

function montar(carpeta: string, piezas: Pieza[], vuelta: number): Puesto {
  const asiento = quienResponde("lodging_sheet")?.mensaje ?? ASIENTO;
  const puesto = montarPuesto(carpeta, `pregunta-v${vuelta}`, asiento, piezas);
  mkdirSync(join(carpeta, "ordenes"), { recursive: true });
  writeFileSync(join(carpeta, "ordenes", `${puesto.id}.txt`), ordenDeApertura());
  return puesto;
}

function parar(carpeta: string, rojos: Rojo[]): EstadoDeLaPregunta {
  guardarJson(join(carpeta, "parada.json"), { rojos });
  return { estado: "stopped", rojos };
}

/**
 * Un paso de la pregunta, desde lo que hay en el disco: monta el puesto si falta, recoge lo que entregó, lo pasa por
 * la puerta de todos y la suya y, si sale rojo, se lo devuelve a su asiento, dos veces como mucho.
 */
export function siguePregunta(v: ViajeEnLaMesa, n: number): EstadoDeLaPregunta {
  const carpeta = carpetaDeLaPregunta(v, n);
  if (hay(carpeta, "parada.json"))
    return { estado: "stopped", rojos: leer<{ rojos: Rojo[] }>(carpeta, "parada.json").rojos };
  if (hay(carpeta, "respuesta.json")) return { estado: "ready" };
  const pedida = leer<PreguntaPedida>(carpeta, "pedida.json");
  let piezas: Pieza[];
  try {
    piezas = piezasDeLaPregunta(v, pedida).piezas;
  } catch {
    return parar(carpeta, [{ donde: "material", que: "el alojamiento ya no tiene su mirada en esa versión" }]);
  }
  const puesto = puestoDe(carpeta);
  if (puesto === null) return { estado: "working", espera: montar(carpeta, piezas, 1).id };
  if (!existsSync(join(puesto.carpeta, "out", "delivery.json"))) {
    if (acaboSinEntregar(carpeta, puesto.id))
      return parar(carpeta, [
        {
          donde: puesto.id,
          que: trabajosDe(carpeta).find((t) => t.puesto === puesto.id)?.fallo ?? "acabó sin dejar su entrega",
        },
      ]);
    return { estado: "working", espera: puesto.id };
  }
  const metodo = recogerAsiento(puesto);
  let rojos = [...metodo.rojos];
  if (metodo.entrega !== null)
    rojos.push(
      ...puertaRespuesta(metodo.entrega, {
        ...materialDe(puesto.carpeta),
        pregunta: ID_DE_LA_PREGUNTA,
        textoDeLaPregunta: pedida.pregunta,
        textoDeLasOpiniones: readFileSync(join(puesto.carpeta, "in", "reviews.json"), "utf8"),
      }).rojos,
    );
  guardarJson(join(carpeta, `${puesto.id}.puertas.json`), { verde: rojos.length === 0, rojos });
  if (rojos.length === 0) {
    guardarJson(join(carpeta, "respuesta.json"), metodo.entrega);
    return { estado: "ready" };
  }
  const vuelta = Number(/-v(\d+)$/.exec(puesto.id)?.[1] ?? 1);
  if (vuelta > VUELTAS_DE_LA_PREGUNTA) return parar(carpeta, rojos);
  rojos = rojos.slice(0, 40);
  const devuelto: Pieza = {
    ruta: "returned.json",
    contenido: json({ what_was_wrong: rojos, delivery: metodo.entrega }),
  };
  return { estado: "working", espera: montar(carpeta, [...piezas, devuelto], vuelta + 1).id };
}

export type AlLlevarLaPregunta = { tope?: Tope; hoy?: () => Date };

/**
 * Lleva una pregunta hasta que se contesta o se para: lanza al que mira con el adelante del viajero, sin pasar de su
 * techo, y lo recoge. Se puede llamar las veces que haga falta: sigue desde lo que hay en el disco.
 */
export async function llevarLaPregunta(
  v: ViajeEnLaMesa,
  n: number,
  lanzador: Lanzador,
  o: AlLlevarLaPregunta = {},
): Promise<EstadoDeLaPregunta> {
  const carpeta = carpetaDeLaPregunta(v, n);
  const ahora = o.hoy ?? ((): Date => new Date());
  for (let vuelta = 0; vuelta <= VUELTAS_DE_LA_PREGUNTA + 1; vuelta++) {
    const e = siguePregunta(v, n);
    if (e.estado !== "working" || e.espera === null) return e;
    // Nada que gaste arranca sin el botón del viajero, ni por encima de lo que aceptó gastar.
    const adelante = adelanteDe(carpeta);
    if (adelante === null) return parar(carpeta, [{ donde: "button", que: "no hay adelante del viajero" }]);
    const gastado = gastoDe(carpeta);
    if (adelante.techo !== null && (!gastado.sabido || gastado.usd >= adelante.techo))
      return parar(carpeta, [{ donde: "spend", que: "lo gastado llegó al techo que aceptó el viajero, o no se sabe" }]);
    const puesto = puestosDe(carpeta).find((p) => p.id === e.espera);
    if (puesto === undefined) throw new Error(`falta el puesto ${e.espera}`);
    const base = { puesto: puesto.id, asiento: puesto.asiento, desde: ahora().toISOString(), hasta: null, gasto: null };
    apuntarTrabajo(carpeta, { ...base, estado: "working", fallo: null });
    const r = await lanzarAsiento(puesto, lanzador, o.tope ?? TOPE_DE_UN_ASIENTO);
    const entregado = existsSync(join(puesto.carpeta, "out", "delivery.json"));
    const estado = r.fueraDeTope ? "stopped" : r.error !== null || !entregado ? "failed" : "done";
    const fallo = estado === "done" ? null : (r.error ?? "acabó sin dejar su entrega");
    apuntarTrabajo(carpeta, { ...base, estado, hasta: ahora().toISOString(), gasto: r.gasto, fallo });
  }
  const e = siguePregunta(v, n);
  return e.estado === "working" ? parar(carpeta, [{ donde: "house", que: "la respuesta no salió en sus vueltas" }]) : e;
}

/** Una prueba de la respuesta, para la web: su clase y, si es una foto, su dirección. Ninguna frase del asiento. */
export type PruebaDeCara = { kind: "photo" | "review" | "sheet"; photo: string | null };

/** Cómo está la última pregunta de un viaje, para su dueño. La frase pasó la puerta de palabras; los rojos, no. */
export type PreguntaDeCara = {
  n: number;
  version: number;
  lodging: string;
  question: string;
  asked: string;
  state: "working" | "ready" | "stopped";
  answer: EntregaDeLaRespuesta["answer"] | null;
  says: string | null;
  evidence: PruebaDeCara[];
};

/** La dirección de cada foto del material de un alojamiento, por el nombre que tenía en su puesto. */
function direccionesDeLasFotos(v: ViajeEnLaMesa, version: number, alojamiento: string): Map<string, string> {
  const run = runDeLaVersion(v, version);
  if (run === null || !hay(run, "busqueda.json")) return new Map();
  const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
  const f = busqueda.finalistas.find((x) => x.alojamiento.id === alojamiento);
  if (f === undefined) return new Map();
  const elegidas = elegirFotos(f.habitacion?.fotos ?? [], f.detalle?.fotos ?? []);
  return new Map(elegidas.pedidas.map((p) => [p.ruta.replace("photos/", ""), p.url]));
}

export function preguntaDeCara(
  v: ViajeEnLaMesa,
  enMarcha: boolean,
  n: number | null = preguntasDe(v).at(-1) ?? null,
): PreguntaDeCara | null {
  if (n === null || !preguntasDe(v).includes(n)) return null;
  const carpeta = carpetaDeLaPregunta(v, n);
  const p = leer<PreguntaPedida>(carpeta, "pedida.json");
  const lista = hay(carpeta, "respuesta.json");
  const state = lista ? "ready" : hay(carpeta, "parada.json") || !enMarcha ? "stopped" : "working";
  const r = lista ? leer<EntregaDeLaRespuesta>(carpeta, "respuesta.json") : null;
  const fotos = r === null ? new Map<string, string>() : direccionesDeLasFotos(v, p.version, p.alojamiento);
  return {
    n,
    version: p.version,
    lodging: p.alojamiento,
    question: p.pregunta,
    asked: p.cuando,
    state,
    answer: r?.answer ?? null,
    says: r?.says ?? null,
    evidence: (r?.evidence ?? []).map((x) => ({
      kind: x.kind,
      photo: x.kind === "photo" ? (fotos.get(x.ref.replace(/\.\w+$/, "")) ?? null) : null,
    })),
  };
}
