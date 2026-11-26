// El carrusel en la casa: en cuanto hay sitios, se bajan las fotos y las curiosidades de los más conocidos y se guardan
// en el run (`carrusel.json`), para que la web tenga algo que enseñar mientras trabaja la IA (el PM, 26-nov). Sin IA y
// sin frenar el viaje: si algo falla o tarda, se sigue sin ello.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ESPERA_DEL_CARRUSEL } from "../data/carrusel.ts";
import type { Foto } from "../output/viaje.ts";
import { cartasDeLosSitios, cartasQueValen, sitiosDelCarrusel, type Carta } from "../scripts/carrusel.ts";
import type { Entendido } from "../scripts/formas.ts";
import type { Sitio } from "../tools/sitios.ts";
import { guardarJson, leerVersion, type ViajeEnLaMesa } from "./mesa.ts";

export const CARRUSEL = "carrusel.json";

/** Lo que hace falta para el carrusel: los sitios, sus fotos y, si la hay, una curiosidad en el idioma del viajero. */
export type FuentesDelCarrusel = {
  fotos: (archivos: string[]) => Promise<Map<string, Foto>>;
  curiosidades?: (sitios: Sitio[], idioma: string) => Promise<Map<string, string>>;
};

/** Lo que llega antes del tope, o lo de por si no; el reloj se quita al acabar, para no dejar nada colgado. */
function aTiempo<T>(p: Promise<T>, ms: number, siNo: T): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const tope = new Promise<T>((r) => {
    reloj = setTimeout(() => r(siNo), ms);
  });
  return Promise.race([p.catch(() => siNo), tope]).finally(() => clearTimeout(reloj));
}

/** Prepara el carrusel del run, si aún no lo tiene y hay sitios. Nunca falla: lo que no llega, no sale. */
export async function prepararElCarrusel(
  run: string,
  viaje: Entendido,
  f: FuentesDelCarrusel,
  ms = ESPERA_DEL_CARRUSEL * 1000,
): Promise<void> {
  if (existsSync(join(run, CARRUSEL)) || !existsSync(join(run, "sitios.json"))) return;
  try {
    const { sitios } = JSON.parse(readFileSync(join(run, "sitios.json"), "utf8")) as { sitios: Sitio[] };
    const elegidos = sitiosDelCarrusel(sitios);
    if (elegidos.length === 0) return;
    const archivos = elegidos.flatMap((s) => (s.archivo === null ? [] : [s.archivo]));
    const sinFotos = new Map<string, Foto>();
    const sinTextos = new Map<string, string>();
    const [fotos, textos] = await Promise.all([
      archivos.length === 0 ? sinFotos : aTiempo(f.fotos(archivos), ms, sinFotos),
      f.curiosidades === undefined ? sinTextos : aTiempo(f.curiosidades(elegidos, viaje.language), ms, sinTextos),
    ]);
    guardarJson(join(run, CARRUSEL), { cartas: cartasDeLosSitios(elegidos, fotos, textos), cuando: new Date() });
  } catch {
    // Un carrusel que no sale no es un fallo del viaje.
  }
}

/**
 * Las cartas del carrusel de un viaje: las de su último run que las tenga, de lo más nuevo atrás; y si ninguno las
 * tiene (un viaje de antes del carrusel), las paradas con foto de la versión que se enseña, con su porqué.
 */
export function cartasDelViaje(v: ViajeEnLaMesa): Carta[] {
  const delRun = cartasDeLosRuns(v);
  if (delRun.length > 0) return delRun;
  try {
    const paradas = (leerVersion(v)?.viaje as { paradas?: unknown } | undefined)?.paradas;
    if (!Array.isArray(paradas)) return [];
    const cartas = paradas.map((p) => {
      const x = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
      return { id: x.id, nombre: x.nombre, foto: x.foto ?? null, texto: x.porQue ?? null, articulo: null };
    });
    return cartasQueValen({ cartas }).filter((c) => c.foto !== null);
  } catch {
    return [];
  }
}

function cartasDeLosRuns(v: ViajeEnLaMesa): Carta[] {
  for (let n = v.ficha.runs.length; n >= 1; n--) {
    const archivo = join(v.carpeta, "runs", String(n), CARRUSEL);
    if (!existsSync(archivo)) continue;
    try {
      const cartas = cartasQueValen(JSON.parse(readFileSync(archivo, "utf8")));
      if (cartas.length > 0) return cartas;
    } catch {
      // Un archivo roto es como uno que no está.
    }
  }
  return [];
}
