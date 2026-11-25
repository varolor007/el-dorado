// El que conoce el destino de mentira (14.3): lo que entregaría con lo que tiene en su puesto, y que pasa su puerta 12
// de verdad. Sin internet y sin gastar.

import type { EntregaDelDestino } from "../../../agent/scripts/capa_destino.ts";

type Objeto = Record<string, any>;

/** La página inventada de turismo, que abre el que conoce el destino de mentira. */
export const PAGINA_DEL_DESTINO = "https://turismo.inventado.example/guia";

/**
 * Lo que entregaría: sin internet (la llamada directa de mentira no abre páginas), nada, y lo dice. El que trabaja en
 * su puesto abre la página de turismo: cómo es la primera zona, a qué hora se come, un mercado en la segunda zona,
 * con su sitio en ella, lo práctico, un plato del sitio y lo que suele costar una comida, sin ningún restaurante con
 * nombre. Cada número de una frase, en sus cifras o en lo que cuesta.
 */
export function entregaDelDestino(viaje: Objeto | null, ruta: Objeto | null, conPagina: boolean): EntregaDelDestino {
  const visto = String(viaje?.today ?? "2026-11-20");
  const zonas: Objeto[] = ruta?.zones ?? [];
  if (!conPagina || zonas.length === 0)
    return { seat: "local-knowledge", items: [], unknowns: ["Without the web, nothing of the destination was read."] };
  const de = { source: PAGINA_DEL_DESTINO, seen: visto };
  const primera = zonas[0].id;
  const segunda = zonas[1] ?? zonas[0];
  const sinNada = { name: "unknown", point: "unknown", costs: "unknown" } as const;
  return {
    seat: "local-knowledge",
    items: [
      { kind: "neighbourhood", zone: primera, ...sinNada, says: "Old streets, quiet at night.", figures: [], ...de },
      {
        kind: "hours",
        zone: null,
        ...sinNada,
        says: "Lunch is served from 13:30; many shops close on Sunday.",
        figures: ["13:30"],
        ...de,
      },
      {
        kind: "market",
        zone: segunda.id,
        name: "Harbour market",
        point: { lat: segunda.centre.lat, lon: segunda.centre.lon },
        costs: "unknown",
        says: "Fish and fruit stalls, every morning but Monday.",
        figures: [],
        ...de,
      },
      {
        kind: "practical",
        zone: null,
        ...sinNada,
        says: "Plugs are type C, 230 V; the emergency number is 112.",
        figures: [230, 112],
        ...de,
      },
      {
        kind: "dish",
        zone: null,
        name: "Fish stew",
        point: "unknown",
        costs: "unknown",
        says: "The stew of the coast.",
        figures: [],
        ...de,
      },
      {
        kind: "meal_cost",
        zone: null,
        name: "unknown",
        point: "unknown",
        says: "A set lunch on a weekday.",
        figures: [],
        costs: { from: 12, to: 18, currency: String(viaje?.currency ?? "EUR") },
        ...de,
      },
    ],
    unknowns: [],
  };
}
