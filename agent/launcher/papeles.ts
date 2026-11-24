// El de los papeles en la investigación: lo que se le da, las cuentas de plazos que se hacen con lo que entrega, lo
// que se guarda y la decisión del viajero si algo bloquea. Corre por detrás desde el principio, mientras se contesta;
// antes de gastar en buscar, la puerta 2 tiene que haber dicho que nada bloquea, o el viajero, que sigue igual.
//
// Lo que queda en el run:
//
//   papeles.json        la tabla, con las cuentas del código y si algo bloquea; o por qué falta
//   papeles-sigue.json  el viajero vio lo que bloquea, o que faltan, y decidió seguir
//
// Este archivo no llama a ninguna IA ni lanza nada.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PARADO } from "../data/pasos.ts";
import {
  dominiosDe,
  HASTA_EL_TRANSPORTE,
  PREGUNTAS,
  QUE_PREGUNTA,
  SOLO_DE_MENORES,
  type EstadoDePapel,
} from "../data/papeles.ts";
import type { CasillaDePapel, DeLosPapeles, FilaDePapeles } from "../output/viaje.ts";
import type { Entendido, EntregaDeLosPapeles, Vigencia } from "../scripts/formas.ts";
import { diasEntre, moverFecha } from "./calendario.ts";
import { guardarJson } from "./mesa.ts";
import type { Pieza } from "./puesto.ts";

export const PAPELES = "papeles.json";
export const SIGUE_CON_LOS_PAPELES = "papeles-sigue.json";

/** Lo que guarda el run: la tabla como la enseña la web y lo que entregó el asiento, si pasó la puerta 2. */
export type DeLosPapelesGuardado = DeLosPapeles & { entrega: EntregaDeLosPapeles | null; cuando: string };

/** Una fila de la tabla: un pasaporte y una edad (adulto, o la de un menor), y cuántos viajan así. Sin nombre. */
export type Fila = { id: string; passport: string; age: "adult" | number; count: number };

/** Una casilla que hay que contestar: una fila, un país y una pregunta. */
export type Celda = { traveller: string; country: string; question: (typeof PREGUNTAS)[number] };

/**
 * Las filas de la tabla, de lo entendido: cada pasaporte con cada edad. El pasaporte de cada uno va en su orden,
 * primero los adultos y luego los niños; el que no está dicho es el del primero, o el del país del que se sale.
 */
export function filasDe(viaje: Entendido): Fila[] {
  const { adults, children, passports } = viaje.travellers;
  const deMas = (passports[0] ?? viaje.origin?.country ?? "").toUpperCase();
  const edades: ("adult" | number)[] = [...Array.from({ length: adults }, () => "adult" as const), ...children];
  const filas: Fila[] = [];
  edades.forEach((edad, i) => {
    const pasaporte = (passports[i] ?? deMas).toUpperCase();
    const igual = filas.find((f) => f.passport === pasaporte && f.age === edad);
    if (igual !== undefined) igual.count++;
    else filas.push({ id: `t${filas.length + 1}`, passport: pasaporte, age: edad, count: 1 });
  });
  return filas;
}

/** Los países del viaje: hoy, el del destino. Por cuáles se hace escala lo dirá el transporte. */
export const paisesDe = (viaje: Entendido): string[] => [viaje.destination.country.toUpperCase()];

/** Lo que se pregunta a una fila: la lista fija, sin lo de menores a un adulto y sin lo que espera al transporte. */
export const preguntasDe = (f: Fila): (typeof PREGUNTAS)[number][] =>
  PREGUNTAS.filter((q) => !HASTA_EL_TRANSPORTE.includes(q) && (f.age !== "adult" || !SOLO_DE_MENORES.includes(q)));

/** La tabla que hay que llenar: cada fila por cada país, con sus preguntas. */
export function celdasDe(viaje: Entendido): Celda[] {
  return filasDe(viaje).flatMap((f) =>
    paisesDe(viaje).flatMap((country) => preguntasDe(f).map((question) => ({ traveller: f.id, country, question }))),
  );
}

/** Lo que el de los papeles puede ver: los pasaportes, las edades, el destino y los días. Nada de quién es nadie. */
export function piezasDeLosPapeles(viaje: Entendido, hoy: string): Pieza[] {
  const json = (dato: unknown): string => JSON.stringify(dato, null, 2);
  const { check_in, check_out } = viaje.dates;
  const filas = filasDe(viaje);
  const paises = paisesDe(viaje);
  const trip = {
    today: hoy,
    destination: { name: viaje.destination.name, country: viaje.destination.country.toUpperCase() },
    countries: paises,
    dates: { check_in, check_out, nights: diasEntre(check_in, check_out) },
  };
  const questions = celdasDe(viaje).map((c) => ({ ...c, asks: QUE_PREGUNTA[c.question] }));
  const sources = Object.fromEntries(
    [...new Set([...paises, ...filas.map((f) => f.passport)])].map((pais) => [pais, dominiosDe(pais)]),
  );
  return [
    { ruta: "trip.json", contenido: json(trip) },
    { ruta: "travellers.json", contenido: json(filas) },
    { ruta: "questions.json", contenido: json(questions) },
    { ruta: "sources.json", contenido: json(sources) },
  ];
}

/** Una fecha, movida tantos meses: si el día no existe en ese mes, el último del mes. */
export function moverMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = total - ano * 12;
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dos = (n: number): string => String(n).padStart(2, "0");
  return `${String(ano).padStart(4, "0")}-${dos(mes + 1)}-${dos(Math.min(d, ultimo))}`;
}

/** Hasta qué día tiene que valer el pasaporte, por la regla de la fuente y las fechas del viaje. */
export function validoHasta(v: Vigencia, entrada: string, salida: string): string {
  return moverFecha(moverMeses(v.after === "arrival" ? entrada : salida, v.months), v.days);
}

/** Lo que bloquea en una tabla: alguna casilla que bloquea. */
export const bloquea = (casillas: CasillaDePapel[]): boolean => casillas.some((c) => c.estado === "blocks");

/** Lo que se enseña de lo que entregó el asiento, con las cuentas de plazos del código. Ninguna frase suya. */
export function paraEnsenarPapeles(e: EntregaDeLosPapeles, viaje: Entendido, hoy: string): DeLosPapeles {
  const { check_in: entrada, check_out: salida } = viaje.dates;
  const filas = filasDe(viaje);
  const viajeros: FilaDePapeles[] = filas.map((f) => ({
    pasaporte: f.passport,
    edad: f.age === "adult" ? null : f.age,
    cuantos: f.count,
  }));
  const casillas: CasillaDePapel[] = e.cells.map((c) => {
    const antes = c.before_arrival === "unknown" ? null : moverFecha(entrada, -c.before_arrival.days);
    return {
      viajero: filas.findIndex((f) => f.id === c.traveller),
      pais: c.country.toUpperCase(),
      pregunta: c.question,
      estado: c.status as EstadoDePapel,
      duda: c.doubt === "unknown" ? null : c.doubt,
      fuentes: c.sources.map((s) => ({ url: s.url, lado: s.side, estado: s.status, visto: s.seen })),
      hasta: c.valid_for === "unknown" ? null : validoHasta(c.valid_for, entrada, salida),
      antesDe: antes,
      tarde: antes !== null && antes < hoy,
      coste: c.cost === "unknown" ? null : { importe: c.cost.amount, moneda: c.cost.currency.toUpperCase() },
    };
  });
  const fuera = filas.flatMap((_, i) =>
    PREGUNTAS.filter((q) => !preguntasDe(filas[i]).includes(q)).map((pregunta) => ({
      viajero: i,
      pregunta,
      porQue: HASTA_EL_TRANSPORTE.includes(pregunta) ? ("transit_unknown" as const) : ("no_minors" as const),
    })),
  );
  return { viajeros, casillas, fuera, bloquea: bloquea(casillas), falta: null, sigue: false };
}

/** Lo que se guarda cuando falta: sin tabla, y por qué. Sin saber, no se puede decir que nada bloquee. */
export const sinPapeles = (viaje: Entendido, falta: "failed" | "rejected", cuando: Date): DeLosPapelesGuardado => ({
  viajeros: filasDe(viaje).map((f) => ({
    pasaporte: f.passport,
    edad: f.age === "adult" ? null : f.age,
    cuantos: f.count,
  })),
  casillas: [],
  fuera: [],
  bloquea: false,
  falta,
  sigue: false,
  entrega: null,
  cuando: cuando.toISOString(),
});

function leer<T>(run: string, nombre: string): T | null {
  try {
    return JSON.parse(readFileSync(join(run, nombre), "utf8")) as T;
  } catch {
    return null;
  }
}

/** La tabla de los papeles del run, si está, con lo que decidió el viajero. */
export function papelesDelRun(run: string): DeLosPapelesGuardado | null {
  const p = leer<DeLosPapelesGuardado>(run, PAPELES);
  return p === null ? null : { ...p, sigue: existsSync(join(run, SIGUE_CON_LOS_PAPELES)) };
}

/** Si los papeles paran el viaje: algo bloquea, o no se pudieron mirar. Entonces decide el viajero. */
export const paranElViaje = (p: DeLosPapeles): boolean => p.bloquea || p.falta !== null;

/** Si es el turno del viajero por los papeles: paran el viaje, y aún no ha dicho que sigue. */
export function turnoDeLosPapeles(run: string): boolean {
  if (existsSync(join(run, PARADO))) return false;
  const p = papelesDelRun(run);
  return p !== null && paranElViaje(p) && !p.sigue;
}

/** El viajero decide seguir aunque un papel bloquee, o aunque falten: solo en su turno, y con lo justo. */
export function seguirConLosPapeles(run: string, cuerpo: unknown, cuando: Date = new Date()): "papers_go_on" {
  const dado = cuerpo !== null && typeof cuerpo === "object" ? (cuerpo as Record<string, unknown>) : {};
  if (dado.papers !== "go_on" || Object.keys(dado).length !== 1) throw new Error("bad_request");
  guardarJson(join(run, SIGUE_CON_LOS_PAPELES), { cuando: cuando.toISOString() });
  return "papers_go_on";
}

/** Lo que se le enseña al viajero de los papeles mientras se investiga: la tabla, sin lo que entregó el asiento. */
export function paraElViajero(run: string): DeLosPapeles | null {
  const p = papelesDelRun(run);
  if (p === null) return null;
  const { entrega: _entrega, cuando: _cuando, ...tabla } = p;
  return tabla;
}
