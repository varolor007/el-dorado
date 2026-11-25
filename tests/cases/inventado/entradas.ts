// El de las entradas de mentira (14.4): lo que entregaría con lo que tiene en su puesto. Lo afina la sesión de 14.4,
// para que pase su puerta 13 de verdad. Sin internet y sin gastar.

import type { EntregaDeLasEntradas } from "../../../agent/scripts/capa_entradas.ts";

type Objeto = Record<string, any>;

/** La página inventada de los sitios, que abre el de las entradas de mentira. */
export const PAGINA_DE_LAS_ENTRADAS = "https://sitios.inventado.example/entradas";

/**
 * Lo que entregaría: sin internet, cada sitio de su tanda sin saber nada. El que trabaja en su puesto abre la página de
 * los sitios: el primero cuesta 10 por adulto, es gratis para los niños y cierra los lunes; los demás, gratis y
 * abiertos todos los días.
 */
export function entregaDeLasEntradas(
  viaje: Objeto | null,
  sitios: Objeto[] | null,
  conPagina: boolean,
): EntregaDeLasEntradas {
  const visto = String(viaje?.today ?? "2026-11-20");
  const moneda = String(viaje?.currency ?? "EUR");
  const de = { source: PAGINA_DE_LAS_ENTRADAS, seen: visto };
  const todos = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  return {
    seat: "tickets",
    sights: (sitios ?? []).map((s, i) =>
      !conPagina
        ? { id: s.id, prices: "unknown", hours: "unknown", booking: "unknown", official_site: "unknown" }
        : {
            id: s.id,
            prices:
              i === 0
                ? [
                    { for: "adult", ages: null, amount: 10, currency: moneda, ...de },
                    { for: "child", ages: { from: null, to: 12 }, amount: "free", currency: null, ...de },
                  ]
                : [{ for: "any", ages: null, amount: "free", currency: null, ...de }],
            hours: [
              {
                from: "unknown",
                to: "unknown",
                open: [
                  { days: i === 0 ? todos.filter((d) => d !== "mon") : [...todos], opens: "09:00", closes: "18:00" },
                ],
                closed_on: [],
                ...de,
              },
            ],
            booking: { needed: false, where: "unknown", ...de },
            official_site: "unknown",
          },
    ),
    unknowns: [],
  };
}
