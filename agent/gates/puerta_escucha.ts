// La mitad de IA de la puerta 1: ¿el viaje, claro? Mira lo que entregó el que escucha. Cada gusto, cada límite, cada
// cosa reservada, cada choque y cada pregunta cita palabras que están de verdad, letra a letra, en lo que escribió el
// viajero; no hay más preguntas de las que se pueden hacer; lo que choca está dicho, aunque sea una lista vacía; y lo
// que queda, juntado con la base, vuelve a pasar la mitad de código. Lo que no se puede medir (si un gusto se
// entendió bien) lo cubre la confirmación del viajero.

import { COSAS } from "../data/gustos.ts";
import { LETRAS_DE_UN_NOMBRE } from "../data/ruta.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO, LARGO_DE_UNA_PREGUNTA } from "../data/viaje.ts";
import { CHOQUES, PESOS_DE_GUSTO, type Dicho, type Entendido, type EntregaDeEscucha } from "../scripts/formas.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { estaDicho, puertaEntendido } from "./puerta_entendido.ts";
import { pegasDeFrases } from "./textos.ts";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);

/** Un texto del asiento: en una línea, corto, sin enlaces ni marcas. */
const esTexto = (v: unknown, largo: number = FRASE_DEL_VIAJERO): v is string =>
  typeof v === "string" && v.trim() !== "" && v.length <= largo && !/[\u0000-\u001f<>{}]|https?:|www\./i.test(v);

/** Lo que el asiento entrega, juntado con la base: lo que la casa guarda como entendido, antes de confirmarlo. */
export function juntarConLaBase(base: Entendido, e: EntregaDeEscucha, dicho: Dicho): Entendido {
  return {
    ...base,
    tastes: e.tastes.map((g) => ({ thing: g.thing, weight: g.weight, quote: g.quote })),
    limits: e.limits.map((l) => ({ what: l.what, quote: l.quote })),
    booked: [...new Set(e.booked.map((b) => b.quote))],
    said: dicho,
  };
}

export type ParaEscuchar = {
  /** Lo entendido de base: los toques del viajero, sin sus palabras. */
  base: Entendido;
  /** Lo que escribió, y lo que contestó si es la segunda vuelta. */
  dicho: Dicho;
  /** Cuántas preguntas puede hacer: tres la primera vez, ninguna la segunda. */
  preguntas: number;
};

export function puertaEscucha(v: unknown, p: ParaEscuchar): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  if (v.seat !== "listener") rojo("seat", "no es la entrega del que escucha");

  const lista = (campo: string): Objeto[] => {
    const x = v[campo];
    if (!Array.isArray(x) || x.length > FRASES_DEL_VIAJERO) {
      rojo(campo, "falta, o no es una lista corta: una lista vacía también se dice");
      return [];
    }
    return x.map((y, i) => {
      if (esObjeto(y)) return y;
      rojo(`${campo}[${i}]`, "no es un objeto");
      return {};
    });
  };
  const cita = (donde: string, q: unknown): void => {
    if (!estaDicho(q, p.dicho)) rojo(donde, "la cita no está, letra a letra, en lo que escribió el viajero (RE1)");
  };

  lista("limits").forEach((l, i) => {
    if (!esTexto(l.what)) rojo(`limits[${i}].what`, "no dice qué no puede pasar");
    cita(`limits[${i}].quote`, l.quote);
  });

  lista("tastes").forEach((g, i) => {
    const cosa = g.thing;
    if (!esTexto(cosa, LETRAS_DE_UN_NOMBRE)) rojo(`tastes[${i}].thing`, "la cosa no es un nombre corto");
    // Una cosa que la casa sabe cruzar, escrita de otra manera, se quedaría sin cruzar en silencio.
    else if (Object.hasOwn(Object.prototype, cosa)) rojo(`tastes[${i}].thing`, "la cosa no es un nombre que valga");
    else if (!Object.hasOwn(COSAS, cosa)) {
      const igual = Object.keys(COSAS).find((k) => k === cosa.trim().toLowerCase());
      if (igual !== undefined) rojo(`tastes[${i}].thing`, `es una cosa de la lista: se escribe «${igual}» (RE5)`);
    }
    if (typeof g.weight !== "string" || !(PESOS_DE_GUSTO as readonly string[]).includes(g.weight))
      rojo(`tastes[${i}].weight`, "el peso no es de su lista");
    cita(`tastes[${i}].quote`, g.quote);
  });

  lista("booked").forEach((b, i) => {
    if (!esTexto(b.what)) rojo(`booked[${i}].what`, "no dice qué tiene reservado");
    cita(`booked[${i}].quote`, b.quote);
  });

  // Lo que choca, dicho: con qué choca, y las palabras del viajero que chocan.
  lista("clashes").forEach((c, i) => {
    if (typeof c.with !== "string" || !(CHOQUES as readonly string[]).includes(c.with))
      rojo(`clashes[${i}].with`, "no dice con qué choca, de su lista");
    if (!esTexto(c.what)) rojo(`clashes[${i}].what`, "no dice qué choca");
    cita(`clashes[${i}].quote`, c.quote);
    if (c.with === "words") cita(`clashes[${i}].other_quote`, c.other_quote);
    else if (c.other_quote !== "")
      rojo(`clashes[${i}].other_quote`, "solo lleva otra cita si choca con otras palabras");
  });

  // Las preguntas: como mucho las que se pueden hacer, cada una una pregunta corta, sobre palabras del viajero.
  const preguntas = lista("questions");
  if (preguntas.length > p.preguntas)
    rojo(
      "questions",
      p.preguntas === 0
        ? "en esta vuelta no se pregunta: el viajero ya contestó (RE3)"
        : `son ${preguntas.length} preguntas, y se pueden hacer ${p.preguntas} como mucho (RE3)`,
    );
  preguntas.forEach((q, i) => {
    if (!esTexto(q.ask, LARGO_DE_UNA_PREGUNTA) || !q.ask.includes("?"))
      rojo(`questions[${i}].ask`, `no es una pregunta corta, de ${LARGO_DE_UNA_PREGUNTA} letras como mucho`);
    if (!esTexto(q.why)) rojo(`questions[${i}].why`, "no dice qué cambia en el viaje la respuesta");
    cita(`questions[${i}].quote`, q.quote);
  });

  for (const campo of ["assumed", "unknowns"])
    for (const [donde, que] of pegasDeFrases(v[campo], campo, FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO)) rojo(donde, que);

  // Lo que queda, juntado con la base, tiene que seguir pasando la mitad de código de la puerta 1.
  if (rojos.length === 0) {
    const junto = juntarConLaBase(p.base, v as unknown as EntregaDeEscucha, p.dicho);
    for (const r of puertaEntendido(junto).rojos) rojo(r.donde, r.que);
  }
  return { verde: rojos.length === 0, rojos };
}
