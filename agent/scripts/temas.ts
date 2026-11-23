// Las opiniones, por temas: cuántas hablan bien y cuántas mal de cada cosa. Es un recuento por palabras, sin IA: dice
// dónde mirar, no qué concluir. Leerlas de verdad es trabajo de un asiento.

import type { Opinion } from "../tools/fuentes/tipos.ts";

export const TEMAS: Record<string, RegExp> = {
  gimnasio: /\b(gym|fitness|gimnasio)/i,
  piscina: /\b(pool|piscina)/i,
  ruido: /(nois|loud|ruid)/i,
  limpieza: /(clean|limpi|dirty|suci)/i,
  tamaño: /(small|tiny|spacious|cramped|pequeñ|ampli)/i,
  vistas: /\b(view|vista)/i,
  desayuno: /(breakfast|desayun)/i,
  cama: /\b(bed|beds|mattress|cama|colch)/i,
};

export type Recuento = Record<string, { bueno: number; malo: number }>;

export function porTemas(opiniones: Opinion[]): Recuento {
  const recuento: Recuento = {};
  for (const [tema, patron] of Object.entries(TEMAS)) {
    recuento[tema] = {
      bueno: opiniones.filter((o) => patron.test(o.bueno)).length,
      malo: opiniones.filter((o) => patron.test(o.malo)).length,
    };
  }
  return recuento;
}

export function entreFechas(opiniones: Opinion[]): { desde: string | null; hasta: string | null } {
  const fechas = opiniones
    .map((o) => o.fecha)
    .filter((f): f is string => f !== null)
    .sort();
  return { desde: fechas[0] ?? null, hasta: fechas[fechas.length - 1] ?? null };
}
