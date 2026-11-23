// La mesa: donde queda lo que saca cada búsqueda. Vive fuera del repositorio, porque ningún dato de un viaje entra en
// él: en la carpeta que diga ELDORADO_MESA o, si no dice nada, en la temporal de la máquina.

import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

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
