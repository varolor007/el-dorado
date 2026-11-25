// El de moverse (14.2) en código, sin nada de Node: la forma de lo que entrega su asiento (`getting-around`) y cómo
// se pasa a la del viaje. La forma mínima la dejó el suelo (14.1); su sesión la afina con su contrato y su puerta 11.
// Aquí irá también la cuenta de lo que conviene con los días: billetes sueltos o un abono (14.2).

import type { ClaseDeBillete, ClaseDePago, DeDondeSeLlega, ModoDeMoverse } from "../data/capa_moverse.ts";
import { POR_QUE_NO_SE_LLEGA } from "../data/capa_moverse.ts";
import type { DeMoverse } from "../output/capas.ts";
import { fuenteDe, preciosDe, sabido, type PrecioEntregado } from "./capas.ts";
import type { SIN_SABER } from "./formas.ts";

type NoSe = typeof SIN_SABER;

export type EntregaDeMoverse = {
  seat: "getting-around";
  /** Cada manera de ir de donde se llega a una zona de la ruta. */
  arrivals: {
    from: { kind: DeDondeSeLlega; code: string | NoSe; name: string | NoSe };
    to_zone: string;
    mode: ModoDeMoverse;
    minutes: number | NoSe;
    prices: PrecioEntregado[] | NoSe;
    until: string | NoSe;
    source: string;
    seen: string;
  }[];
  /** Si no hay ninguna manera de llegar, por qué; si la hay, null. */
  no_arrival: (typeof POR_QUE_NO_SE_LLEGA)[number] | null;
  transport: { mode: ModoDeMoverse; zones: string[]; until: string | NoSe; source: string; seen: string }[];
  tickets: {
    kind: ClaseDeBillete;
    days: number | null;
    rides: number | null;
    modes: ModoDeMoverse[];
    prices: PrecioEntregado[] | NoSe;
    source: string;
    seen: string;
  }[];
  payment: { kind: ClaseDePago; source: string; seen: string }[];
  car_needed: { needed: boolean; source: string; seen: string } | NoSe;
  unknowns: string[];
};

/** Lo que se enseña de lo que entregó, en la forma del viaje. Ninguna frase suya. */
export function paraEnsenarMoverse(e: EntregaDeMoverse): DeMoverse {
  return {
    llegar: e.arrivals.map((a) => ({
      desde: { clase: a.from.kind, codigo: sabido(a.from.code), nombre: sabido(a.from.name) },
      aZona: a.to_zone,
      modo: a.mode,
      minutos: sabido(a.minutes),
      precios: preciosDe(a.prices),
      hastaLas: sabido(a.until),
      fuente: fuenteDe(a),
    })),
    sinLlegar: e.no_arrival,
    transportes: e.transport.map((t) => ({
      modo: t.mode,
      zonas: [...t.zones],
      hastaLas: sabido(t.until),
      fuente: fuenteDe(t),
    })),
    billetes: e.tickets.map((b) => ({
      clase: b.kind,
      dias: b.days,
      viajes: b.rides,
      modos: [...b.modes],
      precios: preciosDe(b.prices),
      fuente: fuenteDe(b),
    })),
    pagos: e.payment.map((p) => ({ clase: p.kind, fuente: fuenteDe(p) })),
    coche: e.car_needed === "unknown" ? null : { haceFalta: e.car_needed.needed, fuente: fuenteDe(e.car_needed) },
    falta: null,
  };
}
