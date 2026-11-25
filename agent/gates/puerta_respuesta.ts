// La puerta de la respuesta del que mira el alojamiento a una pregunta del viajero (8.2): la puerta 5 de esa entrega.
// Mide que la respuesta sea de las de su lista, que no diga sí, no o en parte sin su prueba, que cada prueba sea del
// material que tuvo delante (una foto suya, una opinión suya o un campo de su ficha), y que la frase que va a leer el
// viajero pase la puerta de palabras: corta, en una línea, sin enlaces, sin promesas y sin números largos. No mide si
// la respuesta acierta: eso lo cubre quien la lee, con su prueba delante.

import { RESPUESTAS } from "../data/alojamiento.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import type { Material } from "./puerta_como_es.ts";
import { pegasDelTexto } from "./textos.ts";

/** Los campos de la ficha en que se puede apoyar una prueba: los mismos que en la entrega de siempre. */
const CAMPOS_DE_LA_FICHA = [
  "room.name",
  "room.size_m2",
  "room.beds",
  "room.declared_views",
  "services",
  "stay.check_in",
  "stay.check_out",
  "stay.season",
  "photos",
];
const CAMPOS = ["seat", "mode", "lodging_id", "question_id", "answer", "evidence", "says", "unknowns"];

export type EntregaDeLaRespuesta = {
  seat: "lodging-viewer";
  mode: "question";
  lodging_id: string;
  question_id: string;
  answer: (typeof RESPUESTAS)[number];
  evidence: { kind: "photo" | "review" | "sheet"; ref: string; what: string }[];
  says: string;
  unknowns: string[];
};

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Lo que tuvo delante: su material de siempre y la pregunta, con su identificador. */
export type MaterialDeLaPregunta = Material & { pregunta: string };

export function puertaRespuesta(entrega: unknown, m: MaterialDeLaPregunta): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!objeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  for (const k of Object.keys(entrega)) if (!CAMPOS.includes(k)) rojo(k, "este campo no es de la entrega");
  for (const k of CAMPOS) if (!(k in entrega)) rojo(k, "falta");
  if (entrega.seat !== "lodging-viewer") rojo("seat", "no es la del que mira el alojamiento");
  if (entrega.mode !== "question") rojo("mode", "una respuesta lleva el modo «question»");
  if (entrega.lodging_id !== m.hoja.lodging_id) rojo("lodging_id", "no es el de la ficha");
  if (entrega.question_id !== m.pregunta) rojo("question_id", "no es el de la pregunta");
  const respuesta = entrega.answer;
  if (!RESPUESTAS.includes(respuesta as never)) rojo("answer", `no es una de ${RESPUESTAS.join(", ")}`);
  const pruebas = Array.isArray(entrega.evidence) ? entrega.evidence : null;
  if (pruebas === null) rojo("evidence", "no es una lista");
  else {
    if (respuesta !== "unknown" && pruebas.length === 0) rojo("evidence", "sí, no o en parte, sin su prueba");
    pruebas.forEach((p, i) => {
      const donde = `evidence[${i}]`;
      if (!objeto(p) || typeof p.ref !== "string" || typeof p.what !== "string" || p.what.trim() === "")
        return rojo(donde, "una prueba lleva su clase, su referencia y lo que se ve o se dice");
      if (p.kind === "photo" && !m.fotos.includes(p.ref)) rojo(donde, "esa foto no es de su material");
      else if (p.kind === "review" && !m.opiniones.includes(p.ref)) rojo(donde, "esa opinión no es de su material");
      else if (p.kind === "sheet" && !CAMPOS_DE_LA_FICHA.includes(p.ref)) rojo(donde, "ese campo no es de la ficha");
      else if (!["photo", "review", "sheet"].includes(p.kind as string)) rojo(donde, "su clase no es de la lista");
    });
  }
  if (typeof entrega.says !== "string" || entrega.says.trim() === "") rojo("says", "falta la frase para el viajero");
  else for (const pega of pegasDelTexto(entrega.says, { sinNumerosLargos: true })) rojo("says", pega);
  if (!Array.isArray(entrega.unknowns) || !entrega.unknowns.every((x) => typeof x === "string"))
    rojo("unknowns", "no es una lista de frases");
  return { verde: rojos.length === 0, rojos };
}

/**
 * Lo que se puede preguntar: una frase corta, en una línea y sin enlaces ni direcciones. Lista vacía si vale. Es lo
 * que dice el viajero: se le da al asiento como lo que es, una pregunta, y no como una orden.
 */
export function pegasDeLaPregunta(texto: unknown, letras: number): string[] {
  if (typeof texto !== "string" || texto.trim().length < 3) return ["no es una pregunta"];
  if (texto.length > letras) return [`tiene ${texto.length} letras, y caben ${letras}`];
  return pegasDelTexto(texto).filter((p) => !p.startsWith("dice «"));
}
