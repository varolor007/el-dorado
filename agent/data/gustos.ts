// Los gustos: las cosas de un alojamiento de las que el viajero puede decir si son imprescindibles, si le gustan o si
// le dan igual, y qué niveles de la ficha de cómo es las cumplen. El asiento describe; quien decide si gusta es el
// viajero, y quien lo cruza, el código. El estilo se elige con fotos de ejemplo: está por decidir, y no va aquí.

import { CAMPOS } from "./niveles.ts";

export type Cosa = { campo: string; cumplen: string[] };

export const COSAS: Record<string, Cosa> = {
  views: { campo: "view", cumplen: ["open"] },
  gym: { campo: "gym", cumplen: ["full", "maintenance"] },
  pool: { campo: "pool", cumplen: ["swim", "bathe"] },
  space: { campo: "room_space", cumplen: ["roomy"] },
  light: { campo: "room_light", cumplen: ["bright"] },
  bathroom: { campo: "bathroom", cumplen: ["modern"] },
  new: { campo: "look", cumplen: ["new_or_renovated"] },
};

/**
 * Qué es cada cosa, dicho para el que escucha: cuando un gusto del viajero es una de estas, su `thing` lleva este
 * nombre, y así la casa lo puede cruzar.
 */
export const QUE_ES: Record<keyof typeof COSAS, string> = {
  views: "an open view from the room or the lodging",
  gym: "a gym in the lodging",
  pool: "a pool in the lodging, to swim or to bathe",
  space: "a roomy room",
  light: "a bright room",
  bathroom: "a modern bathroom",
  new: "a new or renovated lodging",
};

/** Lo que vale cada nivel de un campo con orden, de 0 a 10: el mejor, 10; el peor, 0; los de en medio, repartidos. */
export function valorDelNivel(campo: string, nivel: string): number | null {
  const niveles = CAMPOS[campo];
  const i = niveles?.indexOf(nivel) ?? -1;
  if (niveles === undefined || i < 0) return null;
  return niveles.length === 1 ? 10 : Math.round((10 * (niveles.length - 1 - i)) / (niveles.length - 1));
}
