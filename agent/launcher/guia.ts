// La guía de un viaje cerrado: «Quiero mi guía», el que escribe la guía, la puerta 10, la maqueta y la guía guardada
// con la versión del viaje de la que sale. Cada guía que se pide tiene su carpeta en la del viaje, en la mesa:
//
//   guias/<n>/pedida.json    de qué versión del viaje sale, con qué manera y cuándo se pidió
//   guias/<n>/adelante.json  el botón del viajero, con su techo de gasto si lo dio
//   guias/<n>/puestos/ ...   el puesto del que escribe la guía, con sus vueltas, sus sellos y sus trabajos
//   guias/<n>/escrita.json   lo que escribió y pasó la puerta 10
//   guias/<n>/fotos/         las fotos de las paradas, bajadas y encogidas, para que el documento se lea sin internet
//   guias/<n>/guia.json      el cuaderno
//   guias/<n>/guia.html      el cuaderno pintado: el documento que se descarga
//   guias/<n>/parada.json    por qué no salió, si no salió
//
// Una guía no se vuelve a escribir: si el viaje cambia, la que había dice que se ha quedado atrás, y se pide otra.
// Este archivo no llama a ninguna IA: monta el puesto, lanza al asiento con el lanzador que se le dé (con el adelante
// del viajero y bajo su techo), lo recoge y monta el cuaderno.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOPE_DE_UN_ASIENTO } from "../data/pasos.ts";
import { puertaCuaderno, puertaGuia, type EntregaDeLaGuia, type MaterialDeLaGuia } from "../gates/puerta_guia.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import type { Viaje } from "../output/viaje.ts";
import { montarCuaderno, pintarCuaderno, type Cuaderno, type Incrustadas } from "../scripts/cuaderno.ts";
import type { Entendido } from "../scripts/formas.ts";
import { deLaManera, horasDelViaje, maneraDeLaGuia, paraLaGuia, type LoQueDicen } from "../scripts/guia.ts";
import { lugarDe } from "../scripts/ruta.ts";
import { bajarFotos, type Encoger, type Traer } from "../tools/fotos.ts";
import type { Sitio } from "../tools/sitios.ts";
import { lanzarAsiento, ordenDeApertura, recogerAsiento, type Lanzador, type Tope } from "./asiento.ts";
import { adelanteDe, darElAdelante } from "./casa.ts";
import { apuntar, guardarJson, leerVersion, type ViajeEnLaMesa } from "./mesa.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";
import { acaboSinEntregar, apuntarTrabajo, gastoDe, trabajosDe } from "./trabajos.ts";

export const GUIAS = "guias";
/** Las vueltas que tiene el que escribe la guía cuando la puerta 10 le devuelve lo suyo: dos, como todos. */
export const VUELTAS_DE_LA_GUIA = 2;

/** Por qué no se puede pedir una guía, por su clave: la frase la pone la web. */
export class FalloDeLaGuia extends Error {}

export type Pedida = { n: number; version: number; manera: string | null; cuando: string };

export type EstadoDeLaGuia =
  { estado: "working"; espera: string | null } | { estado: "ready" } | { estado: "stopped"; rojos: Rojo[] };

const carpetaDeGuias = (v: ViajeEnLaMesa): string => join(v.carpeta, GUIAS);
export const carpetaDeLaGuia = (v: ViajeEnLaMesa, n: number): string => join(carpetaDeGuias(v), String(n));
const leer = <T>(carpeta: string, nombre: string): T => JSON.parse(readFileSync(join(carpeta, nombre), "utf8")) as T;
const hay = (carpeta: string, nombre: string): boolean => existsSync(join(carpeta, nombre));
const json = (dato: unknown): string => JSON.stringify(dato, null, 2);

/** Las guías que se han pedido de un viaje, de la primera a la última. */
export function guiasDe(v: ViajeEnLaMesa): number[] {
  const carpeta = carpetaDeGuias(v);
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta)
    .filter((x) => /^[1-9]\d*$/.test(x) && existsSync(join(carpeta, x, "pedida.json")))
    .map(Number)
    .sort((a, b) => a - b);
}

/** El viaje de una versión, y lo entendido con que se hizo. */
function deLaVersion(v: ViajeEnLaMesa, version: number): { viaje: Viaje; entendido: Entendido | null } {
  const guardada = leerVersion(v, version);
  if (guardada === null) throw new FalloDeLaGuia("no_trip");
  return { viaje: guardada.viaje as Viaje, entendido: (guardada.entendido as Entendido | undefined) ?? null };
}

/**
 * «Quiero mi guía»: la pide su dueño, con el viaje cerrado. Sale de la versión que se enseña, con la manera que dice
 * (si el viaje tiene más de una, la que se pida), y con el adelante del viajero. Devuelve su número.
 */
export function pedirGuia(
  v: ViajeEnLaMesa,
  o: { manera?: string | null; techo?: number | null; hoy?: Date } = {},
): Pedida {
  const hoy = o.hoy ?? new Date();
  if (v.ficha.estado !== "closed" || v.ficha.version === null) throw new FalloDeLaGuia("not_closed");
  const { viaje } = deLaVersion(v, v.ficha.version);
  const manera = maneraDeLaGuia(viaje, o.manera ?? null);
  if (manera === null && (o.manera != null || viaje.maneras.length > 1)) throw new FalloDeLaGuia("which_way");
  const hechas = guiasDe(v);
  const n = (hechas.at(-1) ?? 0) + 1;
  const carpeta = carpetaDeLaGuia(v, n);
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  const pedida: Pedida = { n, version: v.ficha.version, manera: manera?.id ?? null, cuando: hoy.toISOString() };
  darElAdelante(carpeta, o.techo ?? null, hoy);
  guardarJson(join(carpeta, "pedida.json"), pedida);
  apuntar(v, "guide", { guia: n, version: pedida.version, manera: pedida.manera }, hoy);
  return pedida;
}

type DeLosSitios = { sitios: Sitio[]; resumenes: Record<string, string> };

/**
 * Lo que tiene delante el que escribe la guía, y lo que la puerta 10 sabe además: lo que dicen de cada parada sus
 * fuentes abiertas y los demás sitios del destino que se conocen, de los datos que se guardaron al buscar los sitios
 * en la investigación de esa versión. Si no se guardaron, la guía se escribe solo con el viaje.
 */
export function materialDeLaGuia(v: ViajeEnLaMesa, p: Pedida): MaterialDeLaGuia & { viaje: Viaje } {
  const { viaje, entendido } = deLaVersion(v, p.version);
  const manera = maneraDeLaGuia(viaje, p.manera);
  const run = v.ficha.versiones.find((x) => x.n === p.version)?.run;
  let sitios: DeLosSitios = { sitios: [], resumenes: {} };
  const ruta = run === undefined ? null : join(v.carpeta, "runs", String(run), "sitios.json");
  if (ruta !== null && existsSync(ruta)) {
    try {
      sitios = JSON.parse(readFileSync(ruta, "utf8")) as DeLosSitios;
    } catch {
      sitios = { sitios: [], resumenes: {} };
    }
  }
  const dicen: LoQueDicen = new Map();
  for (const s of sitios.sitios ?? []) {
    const lugar = lugarDe(s, sitios.resumenes?.[s.id]);
    if (lugar.about !== "unknown") dicen.set(s.id, lugar.about);
  }
  const enSusDias = new Set(viaje.dias.flatMap((d) => d.paradas));
  const otrosSitios = [
    ...(sitios.sitios ?? []).filter((s) => !enSusDias.has(s.id)).map((s) => s.nombre),
    ...viaje.paradas.filter((x) => !enSusDias.has(x.id)).map((x) => x.nombre),
  ];
  const dado = paraLaGuia(viaje, entendido, manera, dicen);
  return { viaje, dado, otrosSitios, horas: horasDelViaje(deLaManera(viaje, manera).llega) };
}

const piezasDe = (m: MaterialDeLaGuia): Pieza[] => [
  { ruta: "trip.json", contenido: json(m.dado.trip) },
  { ruta: "days.json", contenido: json(m.dado.days) },
  { ruta: "stay.json", contenido: json(m.dado.stay) },
  { ruta: "todo.json", contenido: json(m.dado.todo) },
];

function puestoDe(carpeta: string): Puesto | null {
  const suyos = puestosDe(carpeta).filter((p) => /^guia-v\d+$/.test(p.id));
  return suyos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).pop() ?? null;
}

function montar(carpeta: string, piezas: Pieza[], vuelta: number): Puesto {
  const puesto = montarPuesto(carpeta, `guia-v${vuelta}`, "guide-writer", piezas);
  mkdirSync(join(carpeta, "ordenes"), { recursive: true });
  writeFileSync(join(carpeta, "ordenes", `${puesto.id}.txt`), ordenDeApertura());
  return puesto;
}

function parar(carpeta: string, rojos: Rojo[]): EstadoDeLaGuia {
  guardarJson(join(carpeta, "parada.json"), { rojos });
  return { estado: "stopped", rojos };
}

/**
 * Un paso de la guía, desde lo que hay en el disco: monta el puesto si falta, recoge lo que entregó, lo pasa por la
 * puerta de todos y la 10 y, si sale rojo, se lo devuelve a su asiento, dos veces como mucho. Cuando lo escrito pasa,
 * queda en `escrita.json`, y el cuaderno se monta con `montarLaGuia`.
 */
export function sigueLaGuia(v: ViajeEnLaMesa, n: number): EstadoDeLaGuia {
  const carpeta = carpetaDeLaGuia(v, n);
  if (hay(carpeta, "parada.json"))
    return { estado: "stopped", rojos: leer<{ rojos: Rojo[] }>(carpeta, "parada.json").rojos };
  if (hay(carpeta, "guia.json")) return { estado: "ready" };
  if (hay(carpeta, "escrita.json")) return { estado: "working", espera: null };
  const pedida = leer<Pedida>(carpeta, "pedida.json");
  const m = materialDeLaGuia(v, pedida);
  const piezas = piezasDe(m);
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
  if (metodo.entrega !== null) {
    try {
      rojos.push(...puertaGuia(metodo.entrega, m).rojos);
    } catch {
      rojos.push({ donde: "delivery", que: "la entrega no tiene la forma de su contrato: la puerta no la pudo leer" });
    }
  }
  guardarJson(join(carpeta, `${puesto.id}.puertas.json`), { verde: rojos.length === 0, rojos });
  if (rojos.length === 0) {
    guardarJson(join(carpeta, "escrita.json"), metodo.entrega);
    return { estado: "working", espera: null };
  }
  const vuelta = Number(/-v(\d+)$/.exec(puesto.id)?.[1] ?? 1);
  if (vuelta > VUELTAS_DE_LA_GUIA) return parar(carpeta, rojos);
  rojos = rojos.slice(0, 40);
  const devuelto: Pieza = {
    ruta: "returned.json",
    contenido: json({ what_was_wrong: rojos, delivery: metodo.entrega }),
  };
  return { estado: "working", espera: montar(carpeta, [...piezas, devuelto], vuelta + 1).id };
}

/** Las fotos del cuaderno ya bajadas, por su dirección, como se ponen dentro de la página. */
function incrustadasDe(carpeta: string, c: Cuaderno): Incrustadas {
  const fotos: Incrustadas = new Map();
  const todas = [c.portada.foto, ...c.dias.flatMap((d) => d.paradas.map((p) => p.foto))];
  const urls = [...new Set(todas.flatMap((f) => (f === null ? [] : [f.url])))];
  urls.forEach((url, i) => {
    const archivo = join(carpeta, "fotos", `f${i + 1}.jpg`);
    if (existsSync(archivo)) fotos.set(url, `data:image/jpeg;base64,${readFileSync(archivo).toString("base64")}`);
  });
  return fotos;
}

/**
 * Baja las fotos del cuaderno, encogidas, a la carpeta de la guía: el documento las lleva dentro y se lee sin
 * internet. Lo que no se baja se queda con su dirección, y se ve si hay internet.
 */
export async function bajarLasFotos(
  c: Cuaderno,
  carpeta: string,
  o: { traer?: Traer; encoger?: Encoger } = {},
): Promise<void> {
  const todas = [c.portada.foto, ...c.dias.flatMap((d) => d.paradas.map((p) => p.foto))];
  const urls = [...new Set(todas.flatMap((f) => (f === null ? [] : [f.url])))];
  if (urls.length === 0) return;
  await bajarFotos(
    urls.map((url, i) => ({ ruta: `f${i + 1}`, url })),
    join(carpeta, "fotos"),
    {
      ...(o.traer === undefined ? {} : { traer: o.traer }),
      ...(o.encoger === undefined ? {} : { encoger: o.encoger }),
      aLaVez: 4,
    },
  );
}

/**
 * Monta el cuaderno con lo escrito que pasó la puerta 10 y el viaje de su versión, lo pasa por la segunda parte de la
 * puerta 10 y lo guarda con su página. Si no pasa, la guía se para y se dice.
 */
export async function montarLaGuia(
  v: ViajeEnLaMesa,
  n: number,
  o: { hoy?: Date; traer?: Traer; encoger?: Encoger; sinFotos?: boolean } = {},
): Promise<EstadoDeLaGuia> {
  const carpeta = carpetaDeLaGuia(v, n);
  const pedida = leer<Pedida>(carpeta, "pedida.json");
  const m = materialDeLaGuia(v, pedida);
  const escrita = leer<EntregaDeLaGuia>(carpeta, "escrita.json");
  const cuaderno = montarCuaderno(m.viaje, m.dado, escrita, { manera: pedida.manera, hecha: o.hoy ?? new Date() });
  const veredicto = puertaCuaderno(cuaderno, m.viaje);
  if (!veredicto.verde) return parar(carpeta, veredicto.rojos);
  if (o.sinFotos !== true) {
    try {
      await bajarLasFotos(cuaderno, carpeta, o);
    } catch {
      // Sin fotos dentro, el documento sigue valiendo: las enseña desde su dirección.
    }
  }
  writeFileSync(
    join(carpeta, "guia.html"),
    pintarCuaderno(cuaderno, { incrustadas: incrustadasDe(carpeta, cuaderno) }),
    {
      mode: 0o600,
    },
  );
  guardarJson(join(carpeta, "guia.json"), cuaderno);
  apuntar(v, "guide_ready", { guia: n, version: pedida.version }, o.hoy ?? new Date());
  return { estado: "ready" };
}

export type AlLlevarLaGuia = { tope?: Tope; hoy?: () => Date; traer?: Traer; encoger?: Encoger; sinFotos?: boolean };

/**
 * Lleva una guía pedida hasta que sale o se para: lanza al que escribe la guía con el adelante del viajero, sin pasar
 * de su techo, y lo recoge; cuando lo escrito pasa la puerta 10, monta el cuaderno. Se puede llamar las veces que
 * haga falta: sigue desde lo que hay en el disco.
 */
export async function llevarLaGuia(
  v: ViajeEnLaMesa,
  n: number,
  lanzador: Lanzador,
  o: AlLlevarLaGuia = {},
): Promise<EstadoDeLaGuia> {
  const carpeta = carpetaDeLaGuia(v, n);
  const ahora = o.hoy ?? ((): Date => new Date());
  for (let vuelta = 0; vuelta <= VUELTAS_DE_LA_GUIA + 1; vuelta++) {
    const e = sigueLaGuia(v, n);
    if (e.estado !== "working") return e;
    if (e.espera === null) return montarLaGuia(v, n, { ...o, hoy: ahora() });
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
  const e = sigueLaGuia(v, n);
  if (e.estado === "working" && e.espera === null) return montarLaGuia(v, n, { ...o, hoy: ahora() });
  return e.estado === "working" ? parar(carpeta, [{ donde: "house", que: "la guía no salió en sus vueltas" }]) : e;
}

/** Cómo está una guía, para su dueño: su número, de qué versión sale, si se ha quedado atrás y cuándo se hizo. */
export type GuiaDeCara = {
  n: number;
  state: "working" | "ready" | "stopped";
  version: number;
  behind: boolean;
  asked: string;
  made: string | null;
  way: string | null;
};

/** La última guía de un viaje, como se le cuenta a la web; null si nunca se pidió. Ningún porqué de un rojo. */
export function guiaDeCara(
  v: ViajeEnLaMesa,
  enMarcha: boolean,
  n: number | null = guiasDe(v).at(-1) ?? null,
): GuiaDeCara | null {
  if (n === null || !guiasDe(v).includes(n)) return null;
  const carpeta = carpetaDeLaGuia(v, n);
  const pedida = leer<Pedida>(carpeta, "pedida.json");
  const state = hay(carpeta, "guia.json") ? "ready" : hay(carpeta, "parada.json") || !enMarcha ? "stopped" : "working";
  const made = state === "ready" ? leer<Cuaderno>(carpeta, "guia.json").hecha : null;
  return {
    n,
    state,
    version: pedida.version,
    behind: v.ficha.version !== pedida.version,
    asked: pedida.cuando,
    made,
    way: pedida.manera,
  };
}

/** El documento de una guía hecha, como se descarga: con el aviso de que se ha quedado atrás, si el viaje cambió. */
export function documentoDeLaGuia(v: ViajeEnLaMesa, n: number | null = guiasDe(v).at(-1) ?? null): string | null {
  if (n === null || !guiasDe(v).includes(n)) return null;
  const carpeta = carpetaDeLaGuia(v, n);
  if (!hay(carpeta, "guia.json")) return null;
  const cuaderno = leer<Cuaderno>(carpeta, "guia.json");
  const atras = v.ficha.version !== cuaderno.version;
  if (!atras && hay(carpeta, "guia.html")) return readFileSync(join(carpeta, "guia.html"), "utf8");
  return pintarCuaderno(cuaderno, { incrustadas: incrustadasDe(carpeta, cuaderno), atras });
}
