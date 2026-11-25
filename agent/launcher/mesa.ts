// La mesa: donde queda todo lo de cada viaje. Vive fuera del repositorio, porque ningún dato de un viaje entra en
// él: en la carpeta que diga ELDORADO_MESA o, si no dice nada, en la temporal de la máquina.
//
// Cada viaje tiene su carpeta, `viajes/<id>/`, y es de su dueño:
//
//   ficha.json      quién es, de quién, cómo está, sus runs y sus versiones
//   entendido.json  lo que se ha entendido del viaje, como está ahora
//   diario.jsonl    lo que le ha ido pasando, en su orden; solo se añade
//   runs/<n>/       cada investigación, con lo que deja cada paso (`agent/data/pasos.ts`)
//   versiones/<n>/  cada versión que ha tenido el viaje, tal como salió de su run; no se vuelve a escribir
//   cierres/<n>/    cada vez que se pulsó «me quedo con este», con lo que dejó (`agent/launcher/cerrar.ts`)

import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { ESTADOS_DEL_VIAJE, SE_PASA_A, type EstadoDelViaje } from "../data/viaje.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");

/** Verdadero si una carpeta cae dentro del repositorio, donde no se guarda nada de un viaje. */
export function dentroDelRepositorio(carpeta: string): boolean {
  // Por donde está de verdad, no por cómo se llama: un enlace que acaba en el repositorio también cae dentro. De una
  // carpeta que aún no existe se mira la más honda que sí existe.
  const raiz = realpathSync(RAIZ);
  let ruta = resolve(carpeta);
  let resto = "";
  while (!existsSync(ruta) && resolve(ruta, "..") !== ruta) {
    resto = join(ruta.slice(resolve(ruta, "..").length + 1), resto);
    ruta = resolve(ruta, "..");
  }
  const real = resolve(existsSync(ruta) ? realpathSync(ruta) : ruta, resto);
  return real === raiz || real.startsWith(raiz + sep);
}

export function carpetaDeLaMesa(entorno: Record<string, string | undefined> = process.env): string {
  const mesa = resolve(entorno.ELDORADO_MESA ?? join(tmpdir(), "el-dorado-mesa"));
  if (dentroDelRepositorio(mesa)) throw new Error("la mesa no puede estar dentro del repositorio");
  return mesa;
}

/** Guarda un run en su carpeta, con la fecha y la hora en el nombre, y devuelve la ruta del archivo. */
export function guardarRun(nombre: string, contenido: unknown, cuando: Date = new Date()): string {
  const sello = cuando.toISOString().replace(/[:.]/g, "-");
  const carpeta = join(carpetaDeLaMesa(), `${sello}-${nombre}`);
  // Lo que queda en la mesa es de un viaje: la carpeta se crea solo para quien la crea.
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  const ruta = join(carpeta, "busqueda.json");
  writeFileSync(ruta, JSON.stringify(contenido, null, 2));
  return ruta;
}

/** Guarda de una vez: se escribe aparte y se cambia el nombre, para que un corte no deje un archivo a medias. */
export function guardarJson(ruta: string, dato: unknown): void {
  const aparte = join(dirname(ruta), `.${basename(ruta)}.a-medias`);
  writeFileSync(aparte, JSON.stringify(dato, null, 2), { mode: 0o600 });
  renameSync(aparte, ruta);
}

// La carpeta de cada viaje.

/** Una versión del viaje. La que sale de cerrarlo lleva el número de su cierre, y la de su run sigue siendo la otra. */
export type Version = { n: number; cuando: string; run: number; motivo: string; cierre?: number };
export type RunDelViaje = { n: number; cuando: string };

export type Ficha = {
  formato: "viaje/1";
  id: string;
  /** De quién es: lo que diga la cuenta. Nadie más lo abre. */
  dueno: string;
  creado: string;
  cambiado: string;
  estado: EstadoDelViaje;
  /** La versión que se enseña; null mientras no haya ninguna. */
  version: number | null;
  versiones: Version[];
  runs: RunDelViaje[];
};

/** Un viaje abierto: su carpeta en la mesa y su ficha, como estaba al leerla. */
export type ViajeEnLaMesa = { carpeta: string; ficha: Ficha };

export type Apunte = { cuando: string; que: string } & Record<string, unknown>;

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DUENO = /^[A-Za-z0-9._:-]{1,128}$/;
/** Lo que una versión se lleva de su run; y lo que se lleva si lo hay: lo que se contó en vivo, con sus horas. */
const DE_UNA_VERSION = ["viaje.json", "sucesos.json", "entendido.json"];
const SI_LO_HAY = ["vivo.jsonl"];

const carpetaDeViajes = (mesa: string): string => join(mesa, "viajes");
const fichaDe = (carpeta: string): string => join(carpeta, "ficha.json");

function carpetaDelViaje(mesa: string, id: string): string {
  if (dentroDelRepositorio(mesa)) throw new Error("la mesa no puede estar dentro del repositorio");
  if (!ID.test(id)) throw new Error("el identificador del viaje no vale");
  return join(carpetaDeViajes(resolve(mesa)), id);
}

function escribirFicha(v: ViajeEnLaMesa, cuando: Date): void {
  v.ficha.cambiado = cuando.toISOString();
  guardarJson(fichaDe(v.carpeta), v.ficha);
}

/** Añade una línea al diario del viaje. El diario solo crece: es la historia de lo que le pasó. */
export function apuntar(v: ViajeEnLaMesa, que: string, datos: Record<string, unknown> = {}, cuando = new Date()): void {
  const apunte: Apunte = { ...datos, cuando: cuando.toISOString(), que };
  appendFileSync(join(v.carpeta, "diario.jsonl"), JSON.stringify(apunte) + "\n", { mode: 0o600 });
}

/** El diario de un viaje, en su orden. Una última línea cortada a medias no cuenta: no rompe la lectura. */
export function leerDiario(v: ViajeEnLaMesa): Apunte[] {
  const ruta = join(v.carpeta, "diario.jsonl");
  if (!existsSync(ruta)) return [];
  const apuntes: Apunte[] = [];
  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    if (linea.trim() === "") continue;
    try {
      apuntes.push(JSON.parse(linea) as Apunte);
    } catch {
      // Una línea que no se lee es una escritura cortada: se salta.
    }
  }
  return apuntes;
}

export type AlAbrir = { dueno: string; entendido: unknown; mesa?: string; cuando?: Date; id?: string };

/** Abre un viaje nuevo en la mesa, con lo que se ha entendido de él hasta ahora. Empieza «empezado». */
export function abrirViaje(o: AlAbrir): ViajeEnLaMesa {
  const cuando = o.cuando ?? new Date();
  if (!DUENO.test(o.dueno)) throw new Error("no se sabe de quién es el viaje");
  const id = o.id ?? `${cuando.toISOString().slice(0, 10)}-${randomBytes(6).toString("hex")}`;
  const carpeta = carpetaDelViaje(o.mesa ?? carpetaDeLaMesa(), id);
  if (existsSync(carpeta)) throw new Error("ya hay un viaje con ese identificador");
  // Lo que queda en la mesa es de un viajero: la carpeta se crea solo para quien la crea.
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  const ahora = cuando.toISOString();
  const ficha: Ficha = {
    formato: "viaje/1",
    id,
    dueno: o.dueno,
    creado: ahora,
    cambiado: ahora,
    estado: "started",
    version: null,
    versiones: [],
    runs: [],
  };
  const v = { carpeta, ficha };
  guardarJson(join(carpeta, "entendido.json"), o.entendido);
  guardarJson(fichaDe(carpeta), ficha);
  apuntar(v, "opened", {}, cuando);
  return v;
}

function fichaQueVale(f: unknown): f is Ficha {
  if (typeof f !== "object" || f === null) return false;
  const x = f as Record<string, unknown>;
  return (
    x.formato === "viaje/1" &&
    typeof x.id === "string" &&
    typeof x.dueno === "string" &&
    ESTADOS_DEL_VIAJE.includes(x.estado as EstadoDelViaje) &&
    Array.isArray(x.versiones) &&
    Array.isArray(x.runs)
  );
}

/**
 * Lee un viaje de la mesa para su dueño. Si no existe, o es de otro, dice lo mismo: quien pregunta por un viaje que
 * no es suyo no llega a saber ni que existe.
 */
export function leerViaje(id: string, dueno: string, mesa: string = carpetaDeLaMesa()): ViajeEnLaMesa {
  const noHay = new Error("no hay tal viaje");
  if (!ID.test(id) || !DUENO.test(dueno)) throw noHay;
  const carpeta = carpetaDelViaje(mesa, id);
  if (!existsSync(fichaDe(carpeta))) throw noHay;
  let ficha: unknown;
  try {
    ficha = JSON.parse(readFileSync(fichaDe(carpeta), "utf8"));
  } catch {
    throw noHay;
  }
  if (!fichaQueVale(ficha) || ficha.id !== id || ficha.dueno !== dueno) throw noHay;
  return { carpeta, ficha };
}

/** Cuántos viajes hay en toda la casa, de todos los dueños. */
export function cuantosViajes(mesa: string = carpetaDeLaMesa()): number {
  const carpeta = carpetaDeViajes(resolve(mesa));
  return existsSync(carpeta) ? readdirSync(carpeta).length : 0;
}

/** Los viajes de un dueño, del último que cambió al primero. Los de otros no salen. */
export function viajesDe(dueno: string, mesa: string = carpetaDeLaMesa()): Ficha[] {
  const carpeta = carpetaDeViajes(resolve(mesa));
  if (!DUENO.test(dueno) || !existsSync(carpeta)) return [];
  const suyos: Ficha[] = [];
  for (const id of readdirSync(carpeta)) {
    try {
      suyos.push(leerViaje(id, dueno, mesa).ficha);
    } catch {
      // No es suyo, o no es un viaje: no sale.
    }
  }
  return suyos.sort((a, b) => b.cambiado.localeCompare(a.cambiado));
}

/** Pasa un viaje de un estado a otro, si desde el suyo se puede. */
export function pasar(v: ViajeEnLaMesa, estado: EstadoDelViaje, cuando = new Date()): void {
  if (!SE_PASA_A[v.ficha.estado].includes(estado)) throw new Error(`un viaje no pasa de ${v.ficha.estado} a ${estado}`);
  const de = v.ficha.estado;
  v.ficha.estado = estado;
  escribirFicha(v, cuando);
  apuntar(v, "state", { de, a: estado }, cuando);
}

/** Cambia lo entendido de un viaje que aún no se ha confirmado. Después, un cambio es otra cosa: tiene su impacto. */
export function cambiarLoEntendido(v: ViajeEnLaMesa, entendido: unknown, cuando = new Date()): void {
  if (v.ficha.estado !== "started") throw new Error("lo entendido de un viaje confirmado no se cambia sin más");
  guardarJson(join(v.carpeta, "entendido.json"), entendido);
  escribirFicha(v, cuando);
}

const carpetaDelRun = (v: ViajeEnLaMesa, n: number): string => join(v.carpeta, "runs", String(n));

/** Abre una investigación del viaje, con lo entendido como está ahora, y devuelve su carpeta. */
export function nuevoRun(v: ViajeEnLaMesa, cuando = new Date()): string {
  if (!SE_PASA_A[v.ficha.estado].includes("researching"))
    throw new Error(`un viaje ${v.ficha.estado} no se investiga: antes hay que confirmarlo`);
  const n = v.ficha.runs.length + 1;
  const run = carpetaDelRun(v, n);
  mkdirSync(run, { recursive: true, mode: 0o700 });
  copyFileSync(join(v.carpeta, "entendido.json"), join(run, "entendido.json"));
  const de = v.ficha.estado;
  v.ficha.runs.push({ n, cuando: cuando.toISOString() });
  v.ficha.estado = "researching";
  escribirFicha(v, cuando);
  apuntar(v, "run", { run: n, de }, cuando);
  return run;
}

/** La carpeta del último run de un viaje, o null si no ha tenido ninguno. */
export function ultimoRun(v: ViajeEnLaMesa): string | null {
  const n = v.ficha.runs.length;
  return n === 0 ? null : carpetaDelRun(v, n);
}

/**
 * Guarda como una versión más el viaje que dejó un run, y pasa a enseñarla. Las de antes se quedan. Una versión no
 * se vuelve a escribir: si ese run ya dejó la suya, se devuelve esa.
 */
export function guardarVersion(v: ViajeEnLaMesa, run: number, motivo: string, cuando = new Date()): Version {
  const ya = v.ficha.versiones.find((x) => x.run === run && x.cierre === undefined);
  if (ya !== undefined) return ya;
  if (!v.ficha.runs.some((r) => r.n === run)) throw new Error("ese run no es de este viaje");
  if (!SE_PASA_A[v.ficha.estado].includes("on_map")) throw new Error("este viaje no espera ninguna versión");
  const desde = carpetaDelRun(v, run);
  const faltan = DE_UNA_VERSION.filter((nombre) => !existsSync(join(desde, nombre)));
  if (faltan.length > 0) throw new Error(`el run no ha dejado ${faltan.join(", ")}: no hay viaje que guardar`);
  const n = v.ficha.versiones.length + 1;
  const hasta = join(v.carpeta, "versiones", String(n));
  if (existsSync(hasta)) throw new Error("esa versión ya está escrita");
  // Se copia aparte y se cambia el nombre de la carpeta: una versión está entera o no está.
  const aparte = join(v.carpeta, "versiones", `.${n}.a-medias`);
  mkdirSync(aparte, { recursive: true, mode: 0o700 });
  for (const nombre of DE_UNA_VERSION) copyFileSync(join(desde, nombre), join(aparte, nombre));
  for (const nombre of SI_LO_HAY)
    if (existsSync(join(desde, nombre))) copyFileSync(join(desde, nombre), join(aparte, nombre));
  renameSync(aparte, hasta);
  const version: Version = { n, cuando: cuando.toISOString(), run, motivo };
  v.ficha.versiones.push(version);
  v.ficha.version = n;
  v.ficha.estado = "on_map";
  escribirFicha(v, cuando);
  apuntar(v, "version", { version: n, run, motivo }, cuando);
  return version;
}

const carpetaDelCierre = (v: ViajeEnLaMesa, n: number): string => join(v.carpeta, "cierres", String(n));

/**
 * Abre un cierre del viaje: «me quedo con este», sobre la versión que se enseña, que tiene que estar en el mapa.
 * Cada vez que se pulsa es un cierre nuevo, con su carpeta; los de antes se quedan. Devuelve su carpeta y su número.
 */
export function nuevoCierre(v: ViajeEnLaMesa, cuando = new Date()): { carpeta: string; n: number } {
  if (v.ficha.estado !== "on_map" || v.ficha.version === null) throw new Error("solo se cierra un viaje en el mapa");
  const raiz = join(v.carpeta, "cierres");
  const hechos = existsSync(raiz)
    ? readdirSync(raiz)
        .filter((x) => /^[1-9]\d*$/.test(x))
        .map(Number)
    : [];
  const n = Math.max(0, ...hechos) + 1;
  const carpeta = carpetaDelCierre(v, n);
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });
  apuntar(v, "closing", { cierre: n, version: v.ficha.version }, cuando);
  return { carpeta, n };
}

/** La carpeta del último cierre de un viaje, y su número; null si no ha tenido ninguno. */
export function ultimoCierre(v: ViajeEnLaMesa): { carpeta: string; n: number } | null {
  const raiz = join(v.carpeta, "cierres");
  if (!existsSync(raiz)) return null;
  const n = Math.max(
    0,
    ...readdirSync(raiz)
      .filter((x) => /^[1-9]\d*$/.test(x))
      .map(Number),
  );
  return n === 0 ? null : { carpeta: carpetaDelCierre(v, n), n };
}

/**
 * Guarda el viaje cerrado como una versión más, y el viaje pasa a «cerrado». Lleva el viaje que dejó el cierre, y lo
 * entendido y los sucesos de la versión que se cerró. Una versión no se vuelve a escribir: si ese cierre ya dejó la
 * suya, se devuelve esa.
 */
export function guardarCierre(v: ViajeEnLaMesa, cierre: number, cuando = new Date()): Version {
  const ya = v.ficha.versiones.find((x) => x.cierre === cierre);
  if (ya !== undefined) return ya;
  if (!SE_PASA_A[v.ficha.estado].includes("closed")) throw new Error("este viaje no se puede cerrar ahora");
  const de = v.ficha.versiones.find((x) => x.n === v.ficha.version);
  if (de === undefined) throw new Error("el viaje no tiene versión que cerrar");
  const desde = carpetaDelCierre(v, cierre);
  if (!existsSync(join(desde, "viaje.json"))) throw new Error("el cierre no ha dejado su viaje");
  const n = v.ficha.versiones.length + 1;
  const hasta = join(v.carpeta, "versiones", String(n));
  if (existsSync(hasta)) throw new Error("esa versión ya está escrita");
  const aparte = join(v.carpeta, "versiones", `.${n}.a-medias`);
  mkdirSync(aparte, { recursive: true, mode: 0o700 });
  copyFileSync(join(desde, "viaje.json"), join(aparte, "viaje.json"));
  for (const nombre of ["sucesos.json", "entendido.json", ...SI_LO_HAY]) {
    const suyo = join(v.carpeta, "versiones", String(de.n), nombre);
    if (existsSync(suyo)) copyFileSync(suyo, join(aparte, nombre));
  }
  renameSync(aparte, hasta);
  const version: Version = { n, cuando: cuando.toISOString(), run: de.run, motivo: "closed", cierre };
  v.ficha.versiones.push(version);
  v.ficha.version = n;
  v.ficha.estado = "closed";
  escribirFicha(v, cuando);
  apuntar(v, "version", { version: n, run: de.run, motivo: "closed", cierre }, cuando);
  return version;
}

/** Vuelve a enseñar una versión de antes. No borra ninguna. */
export function volverA(v: ViajeEnLaMesa, n: number, cuando = new Date()): void {
  if (!v.ficha.versiones.some((x) => x.n === n)) throw new Error("este viaje no tiene esa versión");
  v.ficha.version = n;
  escribirFicha(v, cuando);
  apuntar(v, "back_to", { version: n }, cuando);
}

/** Lo que guarda una versión del viaje: el viaje para la web, sus sucesos y lo entendido con que se hizo. */
export function leerVersion(v: ViajeEnLaMesa, n: number | null = v.ficha.version): Record<string, unknown> | null {
  if (n === null || !v.ficha.versiones.some((x) => x.n === n)) return null;
  const de = (nombre: string): unknown =>
    JSON.parse(readFileSync(join(v.carpeta, "versiones", String(n), nombre), "utf8"));
  return { viaje: de("viaje.json"), sucesos: de("sucesos.json"), entendido: de("entendido.json") };
}

/**
 * El viaje al que pertenece la carpeta de un run, y el número de ese run; null si el run no vive en la carpeta de un
 * viaje, como los de las pruebas y los de antes de que la hubiera.
 */
export function viajeDelRun(run: string): { viaje: ViajeEnLaMesa; n: number } | null {
  const carpeta = resolve(run, "..", "..");
  const n = Number(basename(resolve(run)));
  if (basename(resolve(run, "..")) !== "runs" || !Number.isInteger(n) || !existsSync(fichaDe(carpeta))) return null;
  try {
    const ficha: unknown = JSON.parse(readFileSync(fichaDe(carpeta), "utf8"));
    return fichaQueVale(ficha) && ficha.runs.some((r) => r.n === n) ? { viaje: { carpeta, ficha }, n } : null;
  } catch {
    return null;
  }
}
