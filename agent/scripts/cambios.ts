// Cambios (8.5): lo que cambias de lo que pediste, con las mismas preguntas de empezar ya contestadas, y lo entendido
// que sale de ellas. Se toca solo lo que cambia: lo que sacó el que escucha de tus palabras (tus límites, lo
// reservado y lo que escribiste) se queda como estaba, porque el que escucha no se vuelve a lanzar por un cambio; y de
// tus gustos, solo los de las cosas del alojamiento se tocan aquí, con su peso. Otro destino no es un cambio de un
// viaje: es un viaje nuevo, y este se queda como está. Es código, sin IA y sin nada de Node: lo usa también la web.

import { COSAS } from "../data/gustos.ts";
import { pegasDelTexto } from "../gates/textos.ts";
import type { ClaseDeCambio } from "../data/momentos.ts";
import { FRASE_DEL_VIAJERO } from "../data/viaje.ts";
import { entendidoDe, type Respuestas } from "./empezar.ts";
import type { Entendido, Gusto } from "./formas.ts";
import { clasesDelCambio } from "./impacto.ts";

/** Un gusto de una cosa del alojamiento, como se toca en la web: la cosa, su peso y su toque en tu idioma. */
export type GustoTocado = { thing: string; weight: Gusto["weight"]; etiqueta: string };

export type ConElCambio = {
  /** Lo entendido de después, o null si falta algo que no se puede suponer. */
  entendido: Entendido | null;
  falta: string[];
};

const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Las cosas del alojamiento, en el orden de `COSAS`: lo que se puede tocar como gusto en un cambio. */
export const COSAS_QUE_SE_TOCAN = Object.keys(COSAS);

/** Lo más que mide la cita de un gusto nuevo: su toque, que se suma a lo que escribiste. */
export const LARGO_DE_UNA_CITA = 80;
/** Cómo se suma cada cita a lo que escribiste. */
const JUNTA = ". ";

/**
 * Tus gustos de después: los que no son de una cosa del alojamiento, como estaban; los de una cosa, con el peso que
 * les des. Uno nuevo lleva como cita su toque, que se suma a lo que escribiste para que la cita esté ahí, letra a
 * letra, como pide la puerta 1. Uno nuevo que te da igual no se apunta: no dice nada.
 */
function gustosDe(antes: Entendido, tocados: GustoTocado[] | null): { tastes: Gusto[]; said: Entendido["said"] } {
  if (tocados === null) return { tastes: antes.tastes, said: antes.said };
  const deCosa = (g: { thing: string }): boolean => Object.hasOwn(COSAS, g.thing);
  const tastes: Gusto[] = antes.tastes.filter((g) => !deCosa(g));
  let said = antes.said === undefined ? undefined : { ...antes.said };
  for (const t of tocados.filter(deCosa)) {
    const ya = antes.tastes.find((g) => g.thing === t.thing);
    if (ya !== undefined) {
      tastes.push({ ...ya, weight: t.weight });
      continue;
    }
    if (t.weight === "indifferent") continue;
    const cita = t.etiqueta.trim().slice(0, LARGO_DE_UNA_CITA);
    if (cita === "") continue;
    if (said !== undefined && !said.wants.includes(cita))
      said = { ...said, wants: [said.wants, cita].filter((x) => x.trim() !== "").join(JUNTA) };
    tastes.push({ thing: t.thing, weight: t.weight, quote: cita });
  }
  if (said !== undefined && said.wants.length > FRASE_DEL_VIAJERO) said = antes.said;
  return { tastes, said };
}

/**
 * Lo entendido de después de un cambio: el de antes, con lo que digan tus respuestas. Lo que no se toca en las
 * preguntas se queda tal cual (el idioma, el aeropuerto que ya se sabía, tus límites, lo reservado y tus palabras), y
 * de lo que buscas, lo que escribiste con tus palabras y no es un toque (`toques`) se queda también. No juzga si vale:
 * eso lo dice la puerta 1.
 */
export function conElCambio(
  antes: Entendido,
  r: Respuestas,
  toques: readonly string[],
  gustos: GustoTocado[] | null = null,
): ConElCambio {
  const hecho = entendidoDe(r);
  if (hecho.entendido === null) return { entendido: null, falta: hecho.falta };
  const nuevo = hecho.entendido;
  const d = nuevo.destination;
  const mismoDestino =
    d.name === antes.destination.name && d.country === antes.destination.country && d.kind === antes.destination.kind;
  const o = nuevo.origin;
  const mismoOrigen =
    o !== null && antes.origin !== null && o.name === antes.origin.name && o.country === antes.origin.country;
  const suyas = antes.looking_for.filter((f) => !toques.includes(f));
  const { tastes, said } = gustosDe(antes, gustos);
  const despues: Entendido = {
    ...nuevo,
    language: antes.language,
    destination: mismoDestino ? antes.destination : d,
    origin: o === null ? null : mismoOrigen ? antes.origin : o,
    // En el orden de antes, para que lo que no se toca no parezca un cambio; lo que se toca de nuevo, al final.
    looking_for: [
      ...antes.looking_for.filter((f) => suyas.includes(f) || nuevo.looking_for.includes(f)),
      ...nuevo.looking_for.filter((f) => !antes.looking_for.includes(f)),
    ],
    tastes,
    limits: antes.limits,
    booked: antes.booked,
  };
  if (said === undefined) delete despues.said;
  else despues.said = said;
  if (nuevo.moving === undefined) delete despues.moving;
  else if (igual(nuevo.moving, antes.moving)) despues.moving = antes.moving;
  return { entendido: despues, falta: [] };
}

/**
 * Lo que la casa no se cree de un cambio que le llega de fuera, por el campo que falla; null si vale. Lo de después
 * tiene que poder salir de las preguntas de un cambio (`conElCambio`): el mismo idioma (otro idioma no se ofrece: el
 * porqué de cada parada y lo que dice el que mira también van en él, y rehacer solo al que explica no basta), ningún
 * campo que lo de antes no tenga, y tus palabras (`said`) iguales, salvo las citas que suman a lo que querías los
 * gustos nuevos de una cosa del alojamiento: cada una, la de su gusto, corta y limpia por la puerta de palabras.
 */
export function cambioQueNoVale(antes: Entendido, despues: Entendido): string | null {
  if (despues.language !== antes.language) return "language";
  const deMas = Object.keys(despues).find((k) => !Object.hasOwn(antes, k));
  if (deMas !== undefined) return deMas;
  const a = antes.said;
  const d = despues.said;
  if (a === undefined) return d === undefined ? null : "said";
  if (d === undefined || d === null || typeof d !== "object") return "said";
  const { wants: _a, ...restoDeAntes } = a;
  const { wants: _d, ...restoDeDespues } = d;
  if (!igual(restoDeAntes, restoDeDespues) || typeof d.wants !== "string") return "said";
  if (d.wants === a.wants) return null;
  const desde = a.wants.trim() === "" ? "" : a.wants + JUNTA;
  if (!d.wants.startsWith(desde)) return "said";
  // Las citas que se pueden sumar: las de los gustos nuevos de una cosa del alojamiento.
  const nuevas = new Set(
    despues.tastes
      .filter((g) => Object.hasOwn(COSAS, g.thing) && !antes.tastes.some((x) => x.thing === g.thing))
      .map((g) => g.quote),
  );
  const citas = d.wants.slice(desde.length).split(JUNTA);
  const vistas = new Set<string>();
  for (const cita of citas) {
    if (cita.trim() === "" || cita.length > LARGO_DE_UNA_CITA || !nuevas.has(cita) || vistas.has(cita)) return "said";
    if (pegasDelTexto(cita).length > 0) return "said";
    vistas.add(cita);
  }
  return null;
}

/** Qué trae un cambio: sus clases y, si cambia el destino, que es un viaje nuevo y no un cambio de este. */
export function queTrae(antes: Entendido, despues: Entendido): { clases: ClaseDeCambio[]; viajeNuevo: boolean } {
  const clases = clasesDelCambio(antes, despues);
  return { clases, viajeNuevo: clases.includes("destination") };
}
