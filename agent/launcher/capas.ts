// Lo que comparten las capas del destino en la casa (bloque 14): cómo es una capa que hace un asiento, el material que
// la casa le da, si su asiento ya tiene contrato, cómo se guarda en el run y cómo pasa al viaje. Cada capa rellena lo
// suyo en su archivo (`capa_moverse.ts`, `capa_destino.ts`, `capa_entradas.ts`); la casa las lleva todas igual, con
// `deUnaCapa` en `investigar.ts`, como al del calendario: por detrás, con sus vueltas y, si falla, sin ella.
//
// Este archivo no llama a ninguna IA ni lanza nada.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CapaDeIA as IdDeCapa, FaltaDeUnaCapa } from "../data/capas.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import type { DatosAbiertos } from "../scripts/capa_entradas.ts";
import type { Entendido, ZonaResuelta } from "../scripts/formas.ts";
import type { Sitio } from "../tools/sitios.ts";
import { guardarJson } from "./mesa.ts";
import type { Pieza } from "./puesto.ts";
import { contar } from "./vivo.ts";

/** Donde están los contratos de los asientos, si no se dice otra cosa. */
export const CONTRATOS = resolve(import.meta.dirname, "..", "contracts");

/** Si un asiento tiene ya su contrato. Sin él, su paso no se lanza y su capa queda en falta («no_contract»). */
export const hayContrato = (asiento: string, contratos: string = CONTRATOS): boolean =>
  existsSync(join(contratos, asiento, "README.md"));

/**
 * Lo que la casa sabe del viaje cuando lanza una capa, para que cada una saque de ahí su material: lo entendido, sin
 * las palabras del viajero; el día de hoy; la ruta y sus zonas; y, para el de las entradas, los sitios elegidos, por
 * orden de importancia, con lo que dicen de ellos los datos abiertos. Lo demás no se le da a nadie.
 */
export type Material = {
  viaje: Entendido;
  hoy: string;
  ruta: { shape: string; bases: { id: string; name: string; nights: number }[] };
  zonas: ZonaResuelta[];
  elegidos: Sitio[];
  abiertos: DatosAbiertos[];
};

/**
 * Una capa que hace un asiento: su paso, su asiento (el nombre de su contrato), el archivo que deja en el run y el
 * nombre de sus puestos; el material de cada llamada (casi todas, una; el de las entradas, una por tanda de sitios);
 * su puerta; lo que se enseña de lo que entregaron sus llamadas (null, la que falló); y cómo queda si falta entera.
 */
export type CapaDeIA<E, F extends { falta: FaltaDeUnaCapa | null }> = {
  paso: IdDeCapa;
  asiento: string;
  archivo: string;
  base: string;
  tandas: (m: Material) => Pieza[][];
  puerta: (entrega: unknown, m: Material, tanda: number) => Rojo[];
  ensenar: (entregas: (E | null)[], m: Material) => F;
  sinElla: (falta: FaltaDeUnaCapa) => F;
};

/** Lo que guarda el run de una capa: lo que se enseña, lo que entregó cada llamada que pasó su puerta, y cuándo. */
export type CapaGuardada<E, F> = F & { entregas: (E | null)[]; cuando: string };

/** Guarda algo del run y cuenta lo que con ello haya pasado, como hace `investigar.ts`. */
export function guardarEnElRun(run: string, nombre: string, dato: unknown): void {
  guardarJson(join(run, nombre), dato);
  contar(run);
}

/** Lo que se guarda de una capa, con su hora. */
export const guardada = <E, F>(f: F, entregas: (E | null)[], cuando: Date = new Date()): CapaGuardada<E, F> => ({
  ...f,
  entregas,
  cuando: cuando.toISOString(),
});

/** Una capa del run tal cual la ve el viaje: sin lo que entregó el asiento ni la hora. Si no está, nada. */
export function capaDelRun<F>(run: string, archivo: string): F | undefined {
  const ruta = join(run, archivo);
  if (!existsSync(ruta)) return undefined;
  const { entregas: _e, cuando: _c, ...f } = JSON.parse(readFileSync(ruta, "utf8")) as CapaGuardada<unknown, F>;
  return f as F;
}

const json = (dato: unknown): string => JSON.stringify(dato, null, 2);

/**
 * Lo que ven los tres asientos del viaje, como dice la hoja: el destino, las fechas, el idioma y la moneda. Ni quién
 * viaja, ni sus precios, ni sus palabras. Cada capa añade lo suyo: el de las entradas, cuántos son y sus edades.
 */
export function viajeParaLasCapas(m: Material): Record<string, unknown> {
  const v = m.viaje;
  return {
    today: m.hoy,
    destination: { name: v.destination.name, country: v.destination.country, kind: v.destination.kind },
    dates: { check_in: v.dates.check_in, check_out: v.dates.check_out },
    language: v.language,
    currency: v.currency,
  };
}

/** La ruta para las capas: su forma, sus bases y cada zona con su centro y su radio, por su id. */
export function rutaParaLasCapas(m: Material): Record<string, unknown> {
  return {
    shape: m.ruta.shape,
    bases: m.ruta.bases,
    zones: m.zonas.map((z) => ({ id: z.id, base: z.base, label: z.label, centre: z.centre, radius_m: z.radius_m })),
  };
}

/** Una pieza en JSON. */
export const pieza = (ruta: string, dato: unknown): Pieza => ({ ruta, contenido: json(dato) });
