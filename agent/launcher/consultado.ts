// La memoria de lo consultado: lo que un asiento con internet buscó y las páginas que abrió de verdad, sacado por la
// casa de lo que devuelve quien piensa, no de lo que dice el asiento. Se guarda en el run, fuera del puesto, un
// archivo por asiento (`consultado/<puesto>.json`), y con ella la puerta de todos mira que ninguna nota ni ningún
// dato cite una página que no se abrió. De cada página se guarda su dirección y, si se sabe, su título y cuándo se
// abrió; lo que decía, no: eso no sale del run, ni entra en el repositorio ni en la entrega.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Puesto } from "./puesto.ts";

/** Una búsqueda: lo que se preguntó y lo que devolvió el buscador, que no es haber abierto nada. */
export type Busqueda = { consulta: string; resultados: { url: string; titulo: string | null }[]; fallo: string | null };
/** Una página abierta: la dirección que se pidió, a la que se llegó si fue otra, su título y cuándo, si se saben. */
export type Pagina = { url: string; final: string | null; titulo: string | null; cuando: string | null };

export type Consultado = {
  busquedas: Busqueda[];
  paginas: Pagina[];
  /** Lo que se intentó abrir y no se abrió, con su porqué: no cuenta como abierto. */
  fallidas: { url: string; porque: string }[];
};

export const NADA_CONSULTADO: Consultado = { busquedas: [], paginas: [], fallidas: [] };

const DIRECCION = /\bhttps?:\/\/[^\s"'<>()[\]{}|\\^`]+/gi;

/**
 * Una dirección escrita de forma que dos maneras de escribir la misma página digan lo mismo: sin el fragmento, sin
 * la barra del final, con el esquema y el sitio en minúsculas y sin el puerto de siempre. `http` y `https` se toman
 * por la misma página. El camino y lo que va tras `?` se dejan como vienen: ahí las mayúsculas sí cambian la página.
 * Lo que no es una dirección de la web es null.
 */
export function direccionComparable(texto: string): string | null {
  let t = texto.trim();
  if (/^www\./i.test(t)) t = `https://${t}`;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const sitio = u.hostname.toLowerCase().replace(/\.$/, "");
  if (sitio === "") return null;
  const puerto = u.port === "" || u.port === "80" || u.port === "443" ? "" : `:${u.port}`;
  const camino = u.pathname.replace(/\/+$/, "");
  return `https://${sitio}${puerto}${camino}${u.search === "?" ? "" : u.search}`;
}

/** Si un texto es, él entero, una dirección de la web: así se distingue una cita de una página de una de un archivo. */
export const esDireccion = (texto: string): boolean =>
  /^(https?:\/\/|www\.)/i.test(texto.trim()) && direccionComparable(texto) !== null;

/** Las direcciones que hay dentro de un texto, como vienen, sin la puntuación que las cierra. */
export function direccionesEn(texto: string): string[] {
  return (texto.match(DIRECCION) ?? []).map((d) => d.replace(/[.,;:!?'"]+$/, ""));
}

/** Las páginas abiertas, escritas para compararlas: la que se pidió y, si se llegó a otra, también esa. */
export function abiertas(c: Consultado): string[] {
  const salida = new Set<string>();
  for (const p of c.paginas)
    for (const d of [p.url, p.final]) {
      const comparable = d === null ? null : direccionComparable(d);
      if (comparable !== null) salida.add(comparable);
    }
  return [...salida];
}

const archivoDe = (run: string, id: string): string => join(resolve(run), "consultado", `${id}.json`);
const runDe = (p: Puesto): string => resolve(p.carpeta, "..", "..");

/** Guarda lo consultado por un asiento en su run, de una vez: escrito aparte y con su nombre al final. */
export function guardarConsultado(p: Puesto, c: Consultado): void {
  const archivo = archivoDe(runDe(p), p.id);
  mkdirSync(join(runDe(p), "consultado"), { recursive: true, mode: 0o700 });
  writeFileSync(`${archivo}.a-medias`, JSON.stringify(c, null, 2), { mode: 0o600 });
  renameSync(`${archivo}.a-medias`, archivo);
}

/** Lo consultado por un asiento, del run; si no hay nada guardado, no consultó nada. Lo que no se lee, tampoco. */
export function leerConsultado(p: Puesto): Consultado {
  const archivo = archivoDe(runDe(p), p.id);
  if (!existsSync(archivo)) return NADA_CONSULTADO;
  try {
    const leido = JSON.parse(readFileSync(archivo, "utf8")) as Partial<Consultado>;
    const lista = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
    return {
      busquedas: lista<Busqueda>(leido.busquedas),
      paginas: lista<Pagina>(leido.paginas).filter((x) => typeof x?.url === "string"),
      fallidas: lista<{ url: string; porque: string }>(leido.fallidas),
    };
  } catch {
    return NADA_CONSULTADO;
  }
}

/**
 * Lo que no puede salir nunca en una búsqueda: si el material de un asiento con internet lleva algo con forma de
 * correo o de clave, no se le lanza. Se dice qué clase de cosa es, nunca lo que es.
 */
export function loQueNoPuedeSalir(textos: string[]): string | null {
  const todo = textos.join("\n");
  // Un nombre de foto como `faro@2x.png` no es un correo: lo que va tras la arroba acaba en una extensión de foto.
  const correos = todo.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g) ?? [];
  if (correos.some((c) => !/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(c))) return "un correo";
  if (/sk-ant-[A-Za-z0-9_-]{8,}|\bBearer\s+[A-Za-z0-9._~+/-]{16,}/.test(todo)) return "una clave";
  return null;
}
