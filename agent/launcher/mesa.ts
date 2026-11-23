// La mesa: donde queda lo que saca cada búsqueda. Vive fuera del repositorio, porque ningún dato de un viaje entra en
// él: en la carpeta que diga ELDORADO_MESA o, si no dice nada, en la temporal de la máquina.

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..", "..");

export function carpetaDeLaMesa(entorno: Record<string, string | undefined> = process.env): string {
  const mesa = resolve(entorno.ELDORADO_MESA ?? join(tmpdir(), "el-dorado-mesa"));
  if (mesa === RAIZ || mesa.startsWith(RAIZ + sep)) throw new Error("la mesa no puede estar dentro del repositorio");
  return mesa;
}

/** Guarda un run en su carpeta, con la fecha y la hora en el nombre, y devuelve la ruta del archivo. */
export function guardarRun(nombre: string, contenido: unknown, cuando: Date = new Date()): string {
  const sello = cuando.toISOString().replace(/[:.]/g, "-");
  const carpeta = join(carpetaDeLaMesa(), `${sello}-${nombre}`);
  mkdirSync(carpeta, { recursive: true });
  const ruta = join(carpeta, "busqueda.json");
  writeFileSync(ruta, JSON.stringify(contenido, null, 2));
  return ruta;
}
