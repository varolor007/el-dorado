// El que conoce el destino (14.3) en código, sin nada de Node: la forma de lo que entrega su asiento
// (`local-knowledge`) y cómo se pasa a la del viaje. La forma mínima la dejó el suelo (14.1); su sesión la afina con
// su contrato y su puerta 12, que mira además las palabras de cada frase y que no nombre restaurantes.

import type { ClaseDelDestino } from "../data/capa_destino.ts";
import type { DelDestino } from "../output/capas.ts";
import { fuenteDe, sabido } from "./capas.ts";
import type { SIN_SABER } from "./formas.ts";

type NoSe = typeof SIN_SABER;

export type EntregaDelDestino = {
  seat: "local-knowledge";
  /** Cada cosa, corta y en su clase: lo que dice, en el idioma del viajero, con su página y su fecha. */
  items: {
    kind: ClaseDelDestino;
    zone: string | null;
    name: string | NoSe;
    point: { lat: number; lon: number } | NoSe;
    says: string;
    costs: { from: number; to: number; currency: string } | NoSe;
    source: string;
    seen: string;
  }[];
  unknowns: string[];
};

/** Lo que se enseña de lo que entregó, en la forma del viaje: cada cosa con su frase corta, que pasó su puerta. */
export function paraEnsenarDestino(e: EntregaDelDestino): DelDestino {
  return {
    cosas: e.items.map((x) => {
      const cuesta = sabido(x.costs);
      return {
        clase: x.kind,
        zona: x.zone,
        nombre: sabido(x.name),
        punto: sabido(x.point),
        frase: x.says,
        cuesta:
          cuesta === null ? null : { desde: cuesta.from, hasta: cuesta.to, moneda: cuesta.currency.toUpperCase() },
        fuente: fuenteDe(x),
      };
    }),
    falta: null,
  };
}
