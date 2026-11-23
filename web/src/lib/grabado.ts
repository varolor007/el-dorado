// Lo que se deja pasar como viaje grabado. Llega de fuera (de la mesa o de una dirección privada), así que antes de
// enseñarlo pasa lo mismo que comprueba la casa antes de dárselo a la web: un viaje con una forma de antes, o roto,
// no se enseña a medias ni rompe una pantalla. Se dice que no hay viaje, y la web enseña solo el mapa del mundo.

import { comprobarSucesos, comprobarViaje, type Suceso, type Viaje } from "../../../agent/output/viaje.ts";

type Grabado = { viaje: Viaje; sucesos: Suceso[] };

export function grabadoQueVale(dato: unknown): Grabado | null {
  const d = dato as { viaje?: unknown; sucesos?: unknown } | null;
  if (d === null || typeof d !== "object" || typeof d.viaje !== "object" || d.viaje === null) return null;
  if (!Array.isArray(d.sucesos)) return null;
  try {
    const viaje = d.viaje as Viaje;
    const sucesos = d.sucesos as Suceso[];
    if (comprobarViaje(viaje).length > 0 || comprobarSucesos(sucesos).length > 0) return null;
    return { viaje, sucesos };
  } catch {
    // Le falta una parte entera: la comprobación ni siquiera pudo recorrerlo.
    return null;
  }
}
