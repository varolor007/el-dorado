// El de las entradas de mentira (14.4): lo que entregaría con lo que tiene en su puesto, de modo que pase su puerta 13
// de verdad (cada precio y cada horario, de la página que abre). Sin internet y sin gastar.

import type { EntregaDeLasEntradas } from "../../../agent/scripts/capa_entradas.ts";

type Objeto = Record<string, any>;

/** La página inventada de los sitios, que abre el de las entradas de mentira. */
export const PAGINA_DE_LAS_ENTRADAS = "https://sitios.inventado.example/entradas";

/** El día siguiente a una fecha AAAA-MM-DD. */
const elDiaDespues = (fecha: string): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Lo que entregaría: sin internet, cada sitio de su tanda sin saber nada. El que trabaja en su puesto abre la página de
 * los sitios: el primero cuesta 10 por adulto, es gratis para los niños hasta los 12, cierra los lunes y, por un
 * festivo, el segundo día del viaje, y se reserva en esa misma página; los demás, gratis y abiertos todos los días.
 */
export function entregaDeLasEntradas(
  viaje: Objeto | null,
  sitios: Objeto[] | null,
  conPagina: boolean,
): EntregaDeLasEntradas {
  const visto = String(viaje?.today ?? "2026-11-20");
  const moneda = String(viaje?.currency ?? "EUR");
  const entrada = typeof viaje?.dates?.check_in === "string" ? viaje.dates.check_in : null;
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
                closed_on: i === 0 && entrada !== null ? [elDiaDespues(entrada)] : [],
                ...de,
              },
            ],
            booking:
              i === 0
                ? { needed: true, where: PAGINA_DE_LAS_ENTRADAS, ...de }
                : { needed: false, where: "unknown", ...de },
            official_site: "unknown",
          },
    ),
    unknowns: [],
  };
}
