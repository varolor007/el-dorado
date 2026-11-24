// El primer paso de la investigación: el que escucha y tu confirmación. Si el viajero escribió algo, el que escucha
// lo separa en límites, gustos y lo reservado; cuando pasa su puerta, la investigación espera al viajero, que lo
// confirma, lo corrige (quita un gusto o un límite, cambia un peso) o contesta las preguntas. Con su confirmación,
// la investigación sigue sola; si contestó, el que escucha corre una vez más, ya sin preguntar. Si no escribió nada,
// no hay nada que separar y no se lanza.
//
// Lo que queda en el run, en su orden:
//
//   escucha-<n>.json   lo que entregó el que escucha en su vuelta n (1 o 2) y pasó la puerta 1
//   respuestas.json    lo que contestó el viajero a sus preguntas: con ello hay una vuelta 2
//   confirmado.json    lo que confirmó el viajero: qué gustos y límites se quedan, y con qué peso
//   escuchado.json     lo entendido de verdad, ya confirmado: con ello sigue la investigación
//
// Este archivo no llama a ninguna IA ni lanza nada: dice qué hay que mandar al asiento y qué hacer con lo que vuelve.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PARADO } from "../data/pasos.ts";
import { COSAS, QUE_ES } from "../data/gustos.ts";
import { FRASE_DEL_VIAJERO, PREGUNTAS_DE_MAS } from "../data/viaje.ts";
import { juntarConLaBase } from "../gates/puerta_escucha.ts";
import { enUnaLinea } from "../scripts/empezar.ts";
import { PESOS_DE_GUSTO, type Dicho, type Entendido, type EntregaDeEscucha, type Gusto } from "../scripts/formas.ts";
import { guardarJson } from "./mesa.ts";
import type { Pieza } from "./puesto.ts";

export const RESPUESTAS = "respuestas.json";
export const CONFIRMADO = "confirmado.json";
export const ESCUCHADO = "escuchado.json";
export const escuchaDe = (ronda: number): string => `escucha-${ronda}.json`;

export type Escuchado = { entendido: Entendido; escuchado: boolean };
export type Escucha = { ronda: number; entrega: EntregaDeEscucha };
export type Confirmado = { ronda: number; tastes: { i: number; weight: Gusto["weight"] }[]; limits: number[] };

const hay = (run: string, nombre: string): boolean => existsSync(join(run, nombre));
function leer<T>(run: string, nombre: string): T | null {
  try {
    return JSON.parse(readFileSync(join(run, nombre), "utf8")) as T;
  } catch {
    return null;
  }
}

/** Si hay algo que escuchar: el viajero escribió algo, y nadie lo ha escuchado todavía. */
export function hayQueEscuchar(e: Entendido): boolean {
  const d = e.said;
  return d !== undefined && !d.heard && (d.wants.trim() !== "" || d.booked.trim() !== "");
}

/** Lo entendido sin las palabras del viajero: así lo leen los demás asientos, y así lo lee el que escucha de base. */
export function sinPalabras(e: Entendido): Entendido {
  const { said: _said, ...resto } = e;
  return resto;
}

/** La vuelta del que escucha en que está el run: la segunda, si el viajero contestó. */
export const rondaDe = (run: string): 1 | 2 => (hay(run, RESPUESTAS) ? 2 : 1);

/** Lo que el viajero escribió, con lo que contestó si contestó. */
export function dichoDe(run: string, e: Entendido): Dicho {
  const d = e.said ?? { wants: "", booked: "", heard: false, answers: [] };
  const contestado = leer<{ answers: Dicho["answers"] }>(run, RESPUESTAS)?.answers ?? [];
  return { ...d, answers: [...d.answers, ...contestado] };
}

/** Cuántas preguntas puede hacer el que escucha en una vuelta: tres la primera, ninguna la segunda. */
export const preguntasDe = (ronda: number): number => (ronda === 1 ? PREGUNTAS_DE_MAS : 0);

/** El material del que escucha: los toques sin sus palabras, sus palabras, las cosas que se cruzan y la vuelta. */
export function piezasDeEscucha(
  base: Entendido,
  dicho: Dicho,
  ronda: number,
  previa: EntregaDeEscucha | null,
): Pieza[] {
  const json = (dato: unknown): string => JSON.stringify(dato, null, 2);
  const cosas = Object.keys(COSAS).map((name) => ({ name, what: QUE_ES[name as keyof typeof QUE_ES] }));
  const piezas: Pieza[] = [
    { ruta: "trip.json", contenido: json(sinPalabras(base)) },
    { ruta: "words.json", contenido: json({ wants: dicho.wants, booked: dicho.booked, answers: dicho.answers }) },
    { ruta: "things.json", contenido: json(cosas) },
    { ruta: "round.json", contenido: json({ round: ronda, questions_allowed: preguntasDe(ronda) }) },
  ];
  if (previa !== null) piezas.push({ ruta: "previous.json", contenido: json(previa) });
  return piezas;
}

/** La última entrega del que escucha que pasó su puerta, si la hay. */
export function ultimaEscucha(run: string): Escucha | null {
  return leer<Escucha>(run, escuchaDe(rondaDe(run)));
}

/** Si es el turno del viajero: el que escucha ya entregó, y falta su confirmación o su respuesta. */
export function turnoDelViajero(run: string): boolean {
  return !hay(run, ESCUCHADO) && !hay(run, CONFIRMADO) && !hay(run, PARADO) && hay(run, escuchaDe(rondaDe(run)));
}

/** Si el primer paso está hecho: lo escuchado está guardado, o no había nada que escuchar. */
export function escuchaHecha(run: string): boolean {
  if (hay(run, ESCUCHADO)) return true;
  const e = leer<Entendido>(run, "entendido.json");
  return e !== null && !hayQueEscuchar(e);
}

/**
 * Lo entendido de verdad, con lo que confirmó el viajero: de lo que entregó el que escucha, los gustos y los límites
 * que dejó, con el peso que les dio. No se puede añadir nada: solo quitar, o cambiar un peso.
 */
export function loConfirmado(base: Entendido, e: EntregaDeEscucha, dicho: Dicho, c: Confirmado): Entendido {
  const tastes = c.tastes.map(({ i, weight }) => ({ ...e.tastes[i], weight }));
  const limits = c.limits.map((i) => e.limits[i]);
  const junto = juntarConLaBase(sinPalabras(base), { ...e, tastes, limits }, { ...dicho, heard: true });
  return junto;
}

/** Lo que no vale de lo que manda el viajero al confirmar, por su clave. */
export class FalloAlConfirmar extends Error {}

const entero = (v: unknown, hasta: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < hasta;
const sinRepetir = (xs: number[]): boolean => new Set(xs).size === xs.length;

/**
 * El viajero confirma, corrige o contesta. Solo en su turno. Contestar es mandar `answers` (cada una, el número de
 * la pregunta y lo que contesta), y entonces no se corrige nada; confirmar es mandar los gustos que se quedan
 * (`tastes`: cada uno, su número y su peso) y los límites que se quedan (`limits`: sus números). Lo que no se manda
 * se queda como lo entregó el que escucha. Devuelve qué se hizo.
 */
export function confirmar(run: string, cuerpo: unknown, cuando: Date = new Date()): "answered" | "confirmed" {
  if (!turnoDelViajero(run)) throw new FalloAlConfirmar("not_now");
  const escucha = ultimaEscucha(run) as Escucha;
  const e = escucha.entrega;
  const dado =
    cuerpo !== null && typeof cuerpo === "object" && !Array.isArray(cuerpo) ? (cuerpo as Record<string, unknown>) : {};
  const respuestas = dado.answers;
  if (Array.isArray(respuestas) && respuestas.length > 0) {
    if (dado.tastes !== undefined || dado.limits !== undefined) throw new FalloAlConfirmar("bad_request");
    if (escucha.ronda !== 1 || respuestas.length > e.questions.length) throw new FalloAlConfirmar("bad_answers");
    const contestadas: Dicho["answers"] = [];
    const numeros: number[] = [];
    for (const r of respuestas) {
      const x = r as Record<string, unknown> | null;
      const texto = typeof x?.answer === "string" ? enUnaLinea(x.answer, FRASE_DEL_VIAJERO) : "";
      if (!entero(x?.i, e.questions.length) || texto === "") throw new FalloAlConfirmar("bad_answers");
      numeros.push(x.i as number);
      contestadas.push({ question: e.questions[x.i as number].ask, answer: texto });
    }
    if (!sinRepetir(numeros)) throw new FalloAlConfirmar("bad_answers");
    guardarJson(join(run, RESPUESTAS), { answers: contestadas, cuando: cuando.toISOString() });
    return "answered";
  }
  if (respuestas !== undefined && !Array.isArray(respuestas)) throw new FalloAlConfirmar("bad_answers");

  const gustos = dado.tastes ?? e.tastes.map((g, i) => ({ i, weight: g.weight }));
  if (!Array.isArray(gustos)) throw new FalloAlConfirmar("bad_tastes");
  const tastes: Confirmado["tastes"] = [];
  for (const g of gustos) {
    const x = g as Record<string, unknown> | null;
    if (!entero(x?.i, e.tastes.length) || !(PESOS_DE_GUSTO as readonly unknown[]).includes(x?.weight))
      throw new FalloAlConfirmar("bad_tastes");
    tastes.push({ i: x.i as number, weight: x.weight as Gusto["weight"] });
  }
  const limites = dado.limits ?? e.limits.map((_, i) => i);
  if (!Array.isArray(limites) || !limites.every((i) => entero(i, e.limits.length)))
    throw new FalloAlConfirmar("bad_limits");
  if (!sinRepetir(tastes.map((g) => g.i)) || !sinRepetir(limites as number[]))
    throw new FalloAlConfirmar("bad_request");
  const confirmado: Confirmado = { ronda: escucha.ronda, tastes, limits: limites as number[] };
  guardarJson(join(run, CONFIRMADO), { ...confirmado, cuando: cuando.toISOString() });
  return "confirmed";
}

/**
 * Lo que se le enseña al viajero de lo que he entendido, para que lo confirme: sus palabras y las claves. De lo que
 * escribe el asiento solo va la pregunta, que es para él; lo demás (qué es cada cosa, por qué choca) no sale.
 */
export function paraConfirmar(run: string): Record<string, unknown> | null {
  if (hay(run, ESCUCHADO)) return null;
  const escucha = ultimaEscucha(run);
  if (escucha === null) return null;
  const e = escucha.entrega;
  return {
    round: escucha.ronda,
    can_answer: escucha.ronda === 1 && e.questions.length > 0,
    tastes: e.tastes.map((g) => ({
      thing: Object.hasOwn(COSAS, g.thing) ? g.thing : null,
      weight: g.weight,
      quote: g.quote,
    })),
    limits: e.limits.map((l) => ({ quote: l.quote })),
    booked: e.booked.map((b) => ({ quote: b.quote })),
    clashes: e.clashes.map((c) => ({ with: c.with, quote: c.quote, other_quote: c.other_quote })),
    questions: escucha.ronda === 1 ? e.questions.map((q) => ({ ask: q.ask, quote: q.quote })) : [],
  };
}
