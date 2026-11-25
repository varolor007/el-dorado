// El de moverse de mentira (14.2): lo que entregaría con lo que tiene en su puesto, para que pase su puerta 11 de
// verdad. Sin internet y sin gastar.

import type { EntregaDeMoverse } from "../../../agent/scripts/capa_moverse.ts";

type Objeto = Record<string, any>;

/** La página inventada de quien lleva el transporte, que abre el de moverse de mentira. */
export const PAGINA_DE_MOVERSE = "https://transporte.inventado.example/tarifas";

/**
 * Lo que entregaría. Sin internet (la llamada directa de mentira no abre páginas): que no encontró cómo llegar, y lo
 * dice. El que trabaja en su puesto abre la página del transporte: un autobús del aeropuerto que le dice la casa a la
 * primera zona, el autobús en todas las zonas, un billete suelto, un abono de un día y uno de tres días, con lo que
 * paga un adulto y lo que paga un niño, y que se paga sin contacto.
 */
export function entregaDeMoverse(viaje: Objeto | null, ruta: Objeto | null, conPagina: boolean): EntregaDeMoverse {
  const visto = String(viaje?.today ?? "2026-11-20");
  const zonas: string[] = (ruta?.zones ?? []).map((z: Objeto) => String(z.id));
  const zona = zonas[0];
  const moneda = String(viaje?.currency ?? "EUR");
  const aeropuerto = viaje?.arrival?.airport;
  const precio = (amount: number, nino = false) => ({
    for: nino ? ("child" as const) : ("adult" as const),
    ages: nino ? { from: 4, to: 12 } : null,
    amount,
    currency: moneda,
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
      between_bases: [],
      unknowns: ["No page of a transport operator could be opened, so nothing is known about getting around."],
    };
  return {
    seat: "getting-around",
    arrivals: [
      {
        from: {
          kind: "airport",
          code: typeof aeropuerto === "string" && /^[A-Z]{3}$/.test(aeropuerto) ? aeropuerto : "unknown",
          name: "unknown",
        },
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
    transport: [{ mode: "bus", zones: zonas, until: "23:30", source: PAGINA_DE_MOVERSE, seen: visto }],
    tickets: [
      {
        kind: "single",
        days: null,
        rides: 1,
        modes: ["bus"],
        prices: [precio(2), precio(1, true)],
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
      {
        kind: "multi_day_pass",
        days: 3,
        rides: null,
        modes: ["bus"],
        prices: [precio(12)],
        source: PAGINA_DE_MOVERSE,
        seen: visto,
      },
    ],
    payment: [{ kind: "contactless", source: PAGINA_DE_MOVERSE, seen: visto }],
    car_needed: "unknown",
    between_bases: [],
    unknowns: ["The page of the operator does not say what a child pays for a pass."],
  };
}
