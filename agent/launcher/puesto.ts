// El puesto de un asiento: la carpeta donde trabaja, fuera del repositorio. Tiene su contrato (el método común y el
// de su asiento), su material (solo lo que puede leer) y su salida, vacía. Al montarlo, la casa apunta fuera del
// puesto la huella de todo lo que le dio: con ella, la puerta de todos ve después si se tocó algo.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { huella, INTERNET, type Sello } from "../gates/puerta_metodo.ts";
import { dentroDelRepositorio } from "./mesa.ts";

const CONTRATOS = resolve(import.meta.dirname, "..", "contracts");
/** Lo que es de la casa y no viaja al puesto: la orden que abre el asiento. */
const SOLO_DE_LA_CASA = new Set(["LAUNCH.md"]);
/** Lo común que solo lleva el asiento que sale a internet: cómo se usa la web. */
const SOLO_CON_INTERNET = new Set(["WEB.md"]);

/** Una pieza del material: su ruta dentro de `in/` y su contenido, o el archivo del que se copia. */
export type Pieza = { ruta: string; contenido: string | Uint8Array } | { ruta: string; copiaDe: string };

export type Puesto = { id: string; asiento: string; carpeta: string; sello: string };

export type Opciones = { contratos?: string };

function rutaSegura(ruta: string): boolean {
  if (ruta === "" || isAbsolute(ruta) || ruta.includes("\\")) return false;
  return ruta.split("/").every((parte) => parte !== "" && parte !== "." && parte !== "..");
}

function copiarCarpeta(desde: string, hasta: string, fuera: Set<string> = new Set()): void {
  mkdirSync(hasta, { recursive: true });
  for (const nombre of readdirSync(desde)) {
    if (!SOLO_DE_LA_CASA.has(nombre) && !fuera.has(nombre)) copyFileSync(join(desde, nombre), join(hasta, nombre));
  }
}

/**
 * El run del que cuelga un puesto (`<run>/puestos/<id>`), o `null` si el puesto está suelto. Lo que la casa guarda
 * de un asiento fuera de su puesto va ahí, y de un puesto suelto no se guarda nada: dos carpetas más arriba de una
 * carpeta cualquiera no hay un run, hay lo que caiga.
 */
export function runDe(puesto: Pick<Puesto, "carpeta">): string | null {
  const carpeta = resolve(puesto.carpeta);
  return basename(dirname(carpeta)) === "puestos" ? dirname(dirname(carpeta)) : null;
}

/** Monta el puesto `id` de un asiento dentro de la carpeta de un run y lo sella. Un puesto se monta una sola vez. */
export function montarPuesto(run: string, id: string, asiento: string, piezas: Pieza[], o: Opciones = {}): Puesto {
  const contratos = o.contratos ?? CONTRATOS;
  if (dentroDelRepositorio(run)) throw new Error("un puesto no puede estar dentro del repositorio");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`el nombre del puesto no vale: ${id}`);
  if (!/^[a-z][a-z-]*$/.test(asiento) || asiento === "common" || !existsSync(join(contratos, asiento, "README.md")))
    throw new Error(`no hay contrato para el asiento ${asiento}`);
  const malas = piezas.filter((p) => !rutaSegura(p.ruta)).map((p) => p.ruta);
  if (malas.length > 0) throw new Error(`una pieza se sale del material: ${malas.join(", ")}`);

  const carpeta = join(resolve(run), "puestos", id);
  const sello = join(resolve(run), "sellos", `${id}.json`);
  // Un puesto se sella al final. Si la casa se cortó a medio montarlo, queda una carpeta sin sello en la que nadie
  // ha trabajado: se rehace. Con sello, o con algo ya escrito en su salida, es de un asiento y no se toca.
  if (existsSync(carpeta)) {
    const salida = join(carpeta, "out");
    const trabajado = existsSync(salida) && readdirSync(salida).length > 0;
    if (existsSync(sello) || trabajado) throw new Error(`el puesto ${id} ya existe`);
    rmSync(carpeta, { recursive: true, force: true });
  }

  const conInternet = existsSync(join(contratos, asiento, INTERNET));
  copiarCarpeta(
    join(contratos, "common"),
    join(carpeta, "contract", "common"),
    conInternet ? new Set() : SOLO_CON_INTERNET,
  );
  copiarCarpeta(join(contratos, asiento), join(carpeta, "contract", "seat"));
  // El orden de lectura va en lo alto del contrato: es lo primero que abre el asiento.
  copyFileSync(join(contratos, "common", "README.md"), join(carpeta, "contract", "README.md"));

  mkdirSync(join(carpeta, "in"), { recursive: true });
  for (const pieza of piezas) {
    const destino = join(carpeta, "in", pieza.ruta);
    mkdirSync(dirname(destino), { recursive: true });
    if ("copiaDe" in pieza) copyFileSync(pieza.copiaDe, destino);
    else writeFileSync(destino, pieza.contenido);
  }
  mkdirSync(join(carpeta, "out"));

  mkdirSync(dirname(sello), { recursive: true });
  const apuntado: Sello = { asiento, archivos: huella(carpeta) };
  // El sello, de una vez: escrito aparte y con su nombre al final, para que un corte no deje medio sello.
  writeFileSync(`${sello}.a-medias`, JSON.stringify(apuntado, null, 2));
  renameSync(`${sello}.a-medias`, sello);
  return { id, asiento, carpeta, sello };
}

export function leerSello(p: Puesto): Sello {
  return JSON.parse(readFileSync(p.sello, "utf8")) as Sello;
}

/** Los puestos ya montados de un run, por el nombre de su sello. */
export function puestosDe(run: string): Puesto[] {
  const sellos = join(resolve(run), "sellos");
  if (!existsSync(sellos)) return [];
  return readdirSync(sellos)
    .filter((nombre) => nombre.endsWith(".json"))
    .sort()
    .map((nombre) => {
      const id = nombre.slice(0, -".json".length);
      const sello = join(sellos, nombre);
      const asiento = (JSON.parse(readFileSync(sello, "utf8")) as Sello).asiento;
      return { id, asiento, carpeta: join(resolve(run), "puestos", id), sello };
    });
}
