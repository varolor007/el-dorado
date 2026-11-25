// El de moverse de mentira (14.2): lo que entregaría con lo que tiene en su puesto. Lo afina la sesión de 14.2, para
// que pase su puerta 11 de verdad. Sin internet y sin gastar.

import type { EntregaDeMoverse } from "../../../agent/scripts/capa_moverse.ts";

type Objeto = Record<string, any>;

/** La página inventada de quien lleva el transporte, que abre el de moverse de mentira. */
export const PAGINA_DE_MOVERSE = "https://transporte.inventado.example/tarifas";

/**
 * Lo que entregaría: sin internet (la llamada directa de mentira no abre páginas), que no encontró cómo llegar. El que
 * trabaja en su puesto abre la página del transporte: un autobús del aeropuerto a la primera zona, un billete suelto y
 * un abono de un día.
 */
export function entregaDeMoverse(viaje: Objeto | null, ruta: Objeto | null, conPagina: boolean): EntregaDeMoverse {
  const visto = String(viaje?.today ?? "2026-11-20");
  const zona = ruta?.zones?.[0]?.id;
  const precio = (amount: number) => ({
    for: "adult" as const,
    ages: null,
    amount,
    currency: String(viaje?.currency ?? "EUR"),
    source: PAGINA_DE_MOVERSE,
    seen: visto,
  });
  if (!conPagina || zona === undefined)
    return {
      seat: "getting-around",
      arrivals: [],
      no_arrival: "not_found",
      transport: [],
      tickets: [],
      payment: [],
      car_needed: "unknown",
      unknowns: [],
    };
  return {
    seat: "getting-around",
    arrivals: [
      {
        from: { kind: "airport", code: "unknown", name: "unknown" },
        to_zone: zona,
        mode: "bus",
        minutes: 40,
        prices: [precio(3)],
        until: "23:30",
        source: PAGINA_DE_MOVERSE,
        seen: visto,
      },
    ],
    no_arrival: null,
    transport: [{ mode: "bus", zones: [zona], until: "23:30", source: PAGINA_DE_MOVERSE, seen: visto }],
    tickets: [
      {
        kind: "single",
        days: null,
        rides: 1,
        modes: ["bus"],
        prices: [precio(2)],
        source: PAGINA_DE_MOVERSE,
        seen: visto,
      },
      {
        kind: "day_pass",
        days: 1,
        rides: null,
        modes: ["bus"],
        prices: [precio(6)],
        source: PAGINA_DE_MOVERSE,
        seen: visto,
      },
    ],
    payment: [{ kind: "contactless", source: PAGINA_DE_MOVERSE, seen: visto }],
    car_needed: "unknown",
    unknowns: [],
  };
}
