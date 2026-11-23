// Otra pasada a ciegas: dos asientos miran el mismo alojamiento sin saber el uno del otro, y el código compara sus
// niveles, campo a campo. No dice quién acierta: dice dónde dos miradas iguales no ven lo mismo, que es donde un
// nivel está mal escrito o la prueba no alcanza.

import { CAMPOS, SIN_ORDEN, SIN_SABER } from "../data/niveles.ts";

export type Parecido = "igual" | "vecino" | "distinto" | "uno no sabe" | "ninguno sabe" | "falta";
export type Comparado = { campo: string; a: string | null; b: string | null; parecido: Parecido };
export type Acuerdo = { campos: Comparado[]; iguales: number; de: number };

function nivelDe(entrega: unknown, campo: string): string | null {
  const campos = (entrega as { fields?: Record<string, { level?: unknown }> } | null)?.fields;
  const nivel = campos?.[campo]?.level;
  return typeof nivel === "string" ? nivel : null;
}

export function acuerdo(entregaA: unknown, entregaB: unknown): Acuerdo {
  const campos: Comparado[] = [];
  for (const [campo, niveles] of Object.entries(CAMPOS)) {
    const a = nivelDe(entregaA, campo);
    const b = nivelDe(entregaB, campo);
    let parecido: Parecido;
    if (a === null || b === null) parecido = "falta";
    else if (a === SIN_SABER && b === SIN_SABER) parecido = "ninguno sabe";
    else if (a === SIN_SABER || b === SIN_SABER) parecido = "uno no sabe";
    else if (a === b) parecido = "igual";
    else if (!SIN_ORDEN.includes(campo) && Math.abs(niveles.indexOf(a) - niveles.indexOf(b)) === 1) parecido = "vecino";
    else parecido = "distinto";
    campos.push({ campo, a, b, parecido });
  }
  const iguales = campos.filter((c) => c.parecido === "igual" || c.parecido === "ninguno sabe").length;
  return { campos, iguales, de: campos.length };
}
