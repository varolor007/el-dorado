// Las tres cribas de un alojamiento, en código y sin IA. Primera: lo que no vale se descarta, con su motivo.
// Segunda: lo que tiene precio se suma al precio. Tercera: lo que no tiene precio recibe una nota de 0 a 10, con
// pesos de partida que se mueven con los gustos del viajero. Y el cruce de los gustos con la ficha de cómo es: el
// asiento describe, y aquí se decide si eso es lo que el viajero pidió. Si falta un dato, no se inventa ni baja la
// nota: esa parte no cuenta, y se dice «sin confirmar».

import {
  DESCARTA,
  MAS_POR_GUSTO,
  OPINIONES,
  PESOS_DEL_ALOJAMIENTO,
  PRECIO_POR_GASTO,
  QUEJA_REPETIDA,
  QUEJAS_GRAVES,
  ZONA,
} from "../data/cribas.ts";
import { COSAS, valorDelNivel } from "../data/gustos.ts";
import { CAMPOS, GRAVE_REPETIDA, GRAVES, INSTALACIONES, SIN_ORDEN, SIN_SABER } from "../data/niveles.ts";
import { medianaAndando, type Punto } from "../tools/distancias.ts";
import type { Ficha } from "./busqueda_alojamiento.ts";
import type { EntregaDeMirar, Gusto } from "./formas.ts";

export type Candidato = { ficha: Ficha; mirado: EntregaDeMirar | null };
/** Con qué se criba: los gustos del viajero y los sitios a los que va a ir. */
export type Contexto = { gustos: Gusto[]; paradas: Punto[] };

export type Parte = keyof typeof PESOS_DEL_ALOJAMIENTO;
export type Nota = { nota: number | null; partes: Record<Parte, number | null>; sinConfirmar: string[] };
/** Por qué se descarta un alojamiento: su clase, la cosa que falla y su detalle (el nivel, o cuántas lo dicen). */
export type Descarte = { clase: keyof typeof DESCARTA; cosa: string; detalle: string };

export type Cribado = {
  id: string;
  /** Por qué se descarta, o null si sigue. */
  descarte: Descarte | null;
  descartado: string | null;
  /** Lo que se paga de verdad: el total más lo que se cobra aparte. */
  total: number;
  nota: Nota;
  /** La mitad de lo que se va a ver queda a estos minutos andando, o menos. */
  minutosAndando: number | null;
};

const entre = (v: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, v));
const redondea = (v: number): number => Math.round(v * 10) / 10;

function nivelDe(mirado: EntregaDeMirar | null, campo: string): string | null {
  const nivel = mirado?.fields?.[campo]?.level;
  return typeof nivel === "string" && nivel !== SIN_SABER && CAMPOS[campo]?.includes(nivel) ? nivel : null;
}

/** Criba 1. Por qué no vale un alojamiento para este viajero, o null si vale. */
export function descarteDe(c: Candidato, ctx: Contexto): Descarte | null {
  for (const g of ctx.gustos) {
    const cosa = COSAS[g.thing];
    if (g.weight !== "must" || cosa === undefined) continue;
    const nivel = nivelDe(c.mirado, cosa.campo);
    if (nivel !== null && !cosa.cumplen.includes(nivel))
      return { clase: "missing_must", cosa: g.thing, detalle: nivel };
  }
  // Una queja grave descarta si la confirma el que mira, leyendo las opiniones, y en más de una. El código no
  // descarta por palabras: una palabra no dice si pasó, ni cuándo, ni si el huésped cuenta que no pasó.
  for (const q of c.mirado?.serious ?? []) {
    if (GRAVES.includes(q.kind) && GRAVE_REPETIDA.includes(q.mentions))
      return { clase: "serious_complaints", cosa: q.kind, detalle: q.mentions };
  }
  return null;
}

/**
 * Las quejas graves que el código señala por palabras en varias opiniones y que nadie ha confirmado, porque el
 * alojamiento no se miró o se miró antes de que el que mira las confirmara. No descartan: se dicen, sin confirmar.
 */
export function quejasSinConfirmar(c: Candidato): string[] {
  if (c.mirado !== null && c.mirado.serious !== undefined) return [];
  return Object.entries(QUEJAS_GRAVES)
    .filter(([, patron]) => c.ficha.opiniones.filter((o) => patron.test(o.malo)).length >= QUEJA_REPETIDA)
    .map(([queja]) => queja);
}

/** El motivo de un descarte, en una frase, como lo lee un asiento en la tabla. */
export function motivoDe(d: Descarte | null): string | null {
  return d === null ? null : `${DESCARTA[d.clase]}: ${d.cosa} (${d.detalle})`;
}

export function motivoDeDescarte(c: Candidato, ctx: Contexto): string | null {
  return motivoDe(descarteDe(c, ctx));
}

/** Lo imprescindible del viajero que no se pudo comprobar en este alojamiento. */
export function imprescindiblesSinSaber(c: Candidato, ctx: Contexto): string[] {
  return ctx.gustos
    .filter(
      (g) => g.weight === "must" && COSAS[g.thing] !== undefined && nivelDe(c.mirado, COSAS[g.thing].campo) === null,
    )
    .map((g) => g.thing);
}

/** La zona: de los minutos andando a los que queda la mitad de lo que se va a ver. */
function notaDeLaZona(minutos: number | null): number | null {
  if (minutos === null) return null;
  return redondea(entre(((ZONA.minutosDeCero - minutos) / (ZONA.minutosDeCero - ZONA.minutosDeDiez)) * 10, 0, 10));
}

/** Cómo es de verdad: la media de sus niveles, con lo que al viajero le gusta pesando más. */
function notaDeComoEs(mirado: EntregaDeMirar | null, gustos: Gusto[]): number | null {
  const pesoDe = new Map<string, number>();
  for (const campo of Object.keys(CAMPOS)) {
    // Sin orden no hay mejor ni peor; y que no haya gimnasio o piscina solo resta si el viajero los quiere.
    if (SIN_ORDEN.includes(campo)) continue;
    pesoDe.set(campo, campo in INSTALACIONES ? 0 : 1);
  }
  for (const g of gustos) {
    const cosa = COSAS[g.thing];
    if (cosa === undefined) continue;
    pesoDe.set(cosa.campo, g.weight === "indifferent" ? 0 : MAS_POR_GUSTO);
  }
  let suma = 0;
  let pesos = 0;
  for (const [campo, peso] of pesoDe) {
    const nivel = nivelDe(mirado, campo);
    const valor = nivel === null ? null : valorDelNivel(campo, nivel);
    if (peso === 0 || valor === null) continue;
    suma += valor * peso;
    pesos += peso;
  }
  return pesos === 0 ? null : redondea(suma / pesos);
}

/** Las opiniones, corregidas: una nota con pocas opiniones tira hacia la media. */
function notaDeLasOpiniones(nota: number | null, cuantas: number | null): number | null {
  if (nota === null || cuantas === null) return null;
  const corregida = (nota * cuantas + OPINIONES.media * OPINIONES.comoSiHubiera) / (cuantas + OPINIONES.comoSiHubiera);
  return redondea(
    entre(((corregida - OPINIONES.notaDeCero) / (OPINIONES.notaDeDiez - OPINIONES.notaDeCero)) * 10, 0, 10),
  );
}

/** Criba 3. La nota de un alojamiento, de 0 a 10, con sus partes; lo que no tiene dato no cuenta, y se dice. */
export function notaDe(c: Candidato, ctx: Contexto, minutos: number | null): Nota {
  const partes: Record<Parte, number | null> = {
    zona: notaDeLaZona(minutos),
    comoEs: notaDeComoEs(c.mirado, ctx.gustos),
    opiniones: notaDeLasOpiniones(c.ficha.alojamiento.nota, c.ficha.alojamiento.opiniones),
    // El encaje con quién va (camas, cocina, ascensor) todavía no tiene de dónde salir.
    encaje: null,
    condiciones: c.ficha.precio.cancelable === null ? null : c.ficha.precio.cancelable ? 10 : 0,
  };
  let suma = 0;
  let pesos = 0;
  const sinConfirmar: string[] = [];
  for (const [parte, peso] of Object.entries(PESOS_DEL_ALOJAMIENTO) as [Parte, number][]) {
    const valor = partes[parte];
    if (valor === null) sinConfirmar.push(parte);
    else {
      suma += valor * peso;
      pesos += peso;
    }
  }
  return { nota: pesos === 0 ? null : redondea(suma / pesos), partes, sinConfirmar };
}

/** Las tres cribas, de una vez, sobre unos candidatos. La misma entrada da siempre lo mismo. */
export function cribar(candidatos: Candidato[], ctx: Contexto): Cribado[] {
  return candidatos.map((c) => {
    const a = c.ficha.alojamiento;
    const minutos = medianaAndando({ lat: a.lat, lon: a.lon }, ctx.paradas);
    const descarte = descarteDe(c, ctx);
    return {
      id: a.id,
      descarte,
      descartado: motivoDe(descarte),
      total: c.ficha.precioCompleto,
      nota: notaDe(c, ctx, minutos),
      minutosAndando: minutos,
    };
  });
}

export type Elegible = { id: string; total: number; nota: number | null };

/** La más barata entre las que pasan de la nota mínima. Sin ninguna que pase, no hay más barata que valga. */
export function laMasBarata(filas: Elegible[], notaMinima: number): string | null {
  const validas = filas.filter((f) => f.nota !== null && f.nota >= notaMinima);
  validas.sort((a, b) => a.total - b.total || (b.nota ?? 0) - (a.nota ?? 0) || a.id.localeCompare(b.id));
  return validas[0]?.id ?? null;
}

/**
 * La mejor por lo que cuesta: la nota, menos lo que pesa pagar de más sobre la más barata de todas. Cuánto pesa lo
 * dice lo que el viajero quiere gastar.
 */
export function laMejorPorLoQueCuesta(filas: Elegible[], notaMinima: number, gasto: string): string | null {
  const validas = filas.filter((f) => f.nota !== null && f.nota >= notaMinima && f.total > 0);
  if (validas.length === 0) return null;
  const suelo = Math.min(...validas.map((f) => f.total));
  const pesa = PRECIO_POR_GASTO[gasto] ?? PRECIO_POR_GASTO.medium;
  const valor = (f: Elegible): number => (f.nota ?? 0) - pesa * (f.total / suelo - 1);
  validas.sort((a, b) => valor(b) - valor(a) || a.total - b.total || a.id.localeCompare(b.id));
  return validas[0].id;
}
