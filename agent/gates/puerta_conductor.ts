// La puerta del conductor: lo que el código comprueba de su entrega antes de hacer lo que dice. Su entrega es una de
// dos salidas de una lista cerrada, y nada más: un campo de más, una salida que no existe, una vuelta que no le toca
// o una salida para el viajero que no está entre las suyas son un rojo, y entonces no se hace nada y el run se queda
// parado como estaba. Su frase para el viajero pasa además una puerta de palabras, como la 7; si no la pasa, no se
// enseña, pero lo demás vale.

import {
  CLASES_DEL_CONDUCTOR,
  DECISIONES,
  LARGO_DE_LA_INDICACION,
  LARGO_DEL_PORQUE,
  type ClaseDeParada,
  type Decision,
  type SalidaDelViajero,
} from "../data/conductor.ts";
import type { Rojo } from "./puerta_busqueda.ts";
import { numerosDeMas, pegasDelTexto } from "./textos.ts";

/** Lo que sabe la casa de la parada a la que se llamó al conductor. */
export type ParaElConductor = {
  /** Si le queda la vuelta de más: si no, «retry_with_hint» es un rojo. */
  puedeOtraVuelta: boolean;
  /** Lo que puede hacer el viajero con esta parada. */
  salidas: readonly SalidaDelViajero[];
};

/** Lo que vale de su entrega, ya comprobado. */
export type SalidaDelConductor = {
  decision: Decision;
  hint: string;
  kind: ClaseDeParada;
  options: SalidaDelViajero[];
  /** Su frase para el viajero, si pasó la puerta de palabras; si no, vacía. */
  message: string;
};

export type VeredictoDelConductor = {
  verde: boolean;
  rojos: Rojo[];
  /** Lo que se ejecuta, solo si es verde. */
  salida: SalidaDelConductor | null;
  /** Por qué no se enseña su frase, si traía una y no pasó. No es un rojo: la web lo dice con sus palabras. */
  pegasDeLaFrase: string[];
};

const CAMPOS = ["seat", "decision", "hint", "kind", "options", "message", "why"] as const;
/** Lo que no es letra ni frase: saltos, tabuladores, marcas de control y las que cambian el sentido de la lectura. */
const DE_CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

export function puertaConductor(entrega: unknown, c: ParaElConductor): VeredictoDelConductor {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const no = (r: Rojo[]): VeredictoDelConductor => ({ verde: false, rojos: r, salida: null, pegasDeLaFrase: [] });
  if (typeof entrega !== "object" || entrega === null || Array.isArray(entrega))
    return no([{ donde: "delivery", que: "la entrega no es un objeto" }]);
  const e = entrega as Record<string, unknown>;

  // Solo sus campos: con uno de más intentaría hacer lo que no puede (cambiar una entrega, dar una puerta por buena,
  // saltarse un paso). No se mira qué dice: no se hace.
  for (const campo of Object.keys(e))
    if (!(CAMPOS as readonly string[]).includes(campo))
      rojo(campo, "un campo que no está en su contrato: el conductor solo elige una salida, y no la ejecuta él");
  for (const campo of CAMPOS) if (!(campo in e)) rojo(campo, "falta");
  if (e.seat !== "conductor") rojo("seat", "no es la del conductor");

  const decision = e.decision as Decision;
  if (!DECISIONES.includes(decision)) rojo("decision", "no es una de sus salidas");

  const hint = typeof e.hint === "string" ? e.hint.trim() : null;
  if (hint === null) rojo("hint", "no es un texto");
  else if (decision === "retry_with_hint") {
    if (!c.puedeOtraVuelta) rojo("decision", "no le queda la vuelta de más: ya se dio, o esta parada no la admite");
    if (hint === "") rojo("hint", "una vuelta de más va con su indicación");
    if (hint.length > LARGO_DE_LA_INDICACION)
      rojo("hint", `tiene ${hint.length} letras, y caben ${LARGO_DE_LA_INDICACION}`);
    if (DE_CONTROL.test(hint)) rojo("hint", "lleva saltos de línea o marcas que no son texto");
  } else if (decision === "stop_and_tell" && hint !== "") rojo("hint", "parar no lleva indicación");

  const kind = e.kind as ClaseDeParada;
  if (!CLASES_DEL_CONDUCTOR.includes(kind)) rojo("kind", "no es una de las clases de parada que puede decir");

  const options = Array.isArray(e.options) ? (e.options as SalidaDelViajero[]) : null;
  if (options === null || options.length === 0) rojo("options", "dice al menos una salida para el viajero");
  else {
    if (new Set(options).size !== options.length) rojo("options", "una salida va una vez");
    for (const o of options)
      if (!c.salidas.includes(o)) rojo("options", `${String(o)} no es una salida de esta parada`);
  }

  if (typeof e.why !== "string" || e.why.length > LARGO_DEL_PORQUE)
    rojo("why", `es un texto de ${LARGO_DEL_PORQUE} letras como mucho`);

  // Su frase: un texto para el viajero, sin promesas ni palabras de dentro, y sin números, que aquí no hay de dónde
  // comprobarlos. Si no pasa, no se enseña, y la web lo dice por claves.
  let message = "";
  const pegasDeLaFrase: string[] = [];
  if (typeof e.message !== "string") rojo("message", "no es un texto");
  else if (e.message.trim() !== "") {
    pegasDeLaFrase.push(...pegasDelTexto(e.message, { sinNumerosLargos: true }));
    const numeros = numerosDeMas(e.message, new Set());
    if (numeros.length > 0) pegasDeLaFrase.push(`dice números (${numeros.join(", ")}): aquí no hay de dónde salgan`);
    if (pegasDeLaFrase.length === 0) message = e.message.trim();
  }

  if (rojos.length > 0) return no(rojos);
  return {
    verde: true,
    rojos: [],
    salida: { decision, hint: hint ?? "", kind, options: options ?? [], message },
    pegasDeLaFrase,
  };
}
