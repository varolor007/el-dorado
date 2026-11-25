// El que conoce el destino de mentira (14.3): lo que entregaría con lo que tiene en su puesto. Lo afina la sesión de
// 14.3, para que pase su puerta 12 de verdad. Sin internet y sin gastar.

import type { EntregaDelDestino } from "../../../agent/scripts/capa_destino.ts";

type Objeto = Record<string, any>;

/** La página inventada de turismo, que abre el que conoce el destino de mentira. */
export const PAGINA_DEL_DESTINO = "https://turismo.inventado.example/guia";

/**
 * Lo que entregaría: sin internet, nada. El que trabaja en su puesto abre la página de turismo: cómo es la primera
 * zona, un plato del sitio y lo que suele costar una comida, sin ningún restaurante con nombre.
 */
export function entregaDelDestino(viaje: Objeto | null, ruta: Objeto | null, conPagina: boolean): EntregaDelDestino {
  const visto = String(viaje?.today ?? "2026-11-20");
  const zona = ruta?.zones?.[0]?.id ?? null;
  if (!conPagina) return { seat: "local-knowledge", items: [], unknowns: [] };
  const de = { source: PAGINA_DEL_DESTINO, seen: visto };
  return {
    seat: "local-knowledge",
    items: [
      {
        kind: "neighbourhood",
        zone: zona,
        name: "unknown",
        point: "unknown",
        says: "Old streets, quiet at night.",
        costs: "unknown",
        ...de,
      },
      {
        kind: "dish",
        zone: null,
        name: "Fish stew",
        point: "unknown",
        says: "The stew of the coast.",
        costs: "unknown",
        ...de,
      },
      {
        kind: "meal_cost",
        zone: null,
        name: "unknown",
        point: "unknown",
        says: "A set lunch on a weekday.",
        costs: { from: 12, to: 18, currency: String(viaje?.currency ?? "EUR") },
        ...de,
      },
    ],
    unknowns: [],
  };
}
