// Una fuente de rutas inventada, para probar la tabla de caminos sin internet y sin gastar. A pie, el camino es la
// línea recta con un poco de rodeo; en coche, algo más largo y más deprisa. Se le pueden poner cuestas y rodeos a un
// par, y hacer que falle a partir de un pedido.

import type { FuenteDeRutas, ManeraPedida } from "../../../agent/scripts/caminos.ts";
import { clavePunto, type Tramo } from "../../../agent/tools/caminos.ts";
import { enLineaRecta, type Punto } from "../../../agent/tools/distancias.ts";

export type Pedido = { origenes: number; destinos: number; manera: ManeraPedida };

export type DeLaInventada = {
  /** Lo que se le pone a mano a un par, de un punto a otro: una cuesta, un rodeo o que no haya camino (null). */
  aMano?: Record<string, Partial<Record<ManeraPedida, Tramo | null>>>;
  /** Falla desde este pedido, contando desde el primero (1). */
  fallaDesde?: number;
  casillasPorPedido?: number;
};

/** La clave de un par, como la usa `aMano`. */
export const par = (de: Punto, a: Punto): string => `${clavePunto(de)}>${clavePunto(a)}`;

export function rutasInventadas(o: DeLaInventada = {}): FuenteDeRutas & { pedidos: Pedido[] } {
  const pedidos: Pedido[] = [];
  const medir = (de: Punto, a: Punto, manera: ManeraPedida): Tramo | null => {
    const puesto = o.aMano?.[par(de, a)];
    if (puesto !== undefined && manera in puesto) return puesto[manera] ?? null;
    const recta = enLineaRecta(de, a);
    if (manera === "walk")
      return { metros: Math.round(recta * 1.2), minutos: Math.max(1, Math.round((recta * 1.2) / 70)) };
    return { metros: Math.round(recta * 1.4), minutos: Math.max(1, Math.round(4 + (recta * 1.4) / 600)) };
  };
  return {
    nombre: "inventada",
    casillasPorPedido: o.casillasPorPedido ?? 1000,
    pedidos,
    matriz: async (origenes, destinos, manera) => {
      pedidos.push({ origenes: origenes.length, destinos: destinos.length, manera });
      if (o.fallaDesde !== undefined && pedidos.length >= o.fallaDesde) throw new Error("la inventada no contesta");
      return origenes.map((de) => destinos.map((a) => medir(de, a, manera)));
    },
  };
}
