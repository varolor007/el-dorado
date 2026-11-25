// El de moverse (14.2) en la investigación: lo que se le da, lo que se hace con lo que entrega y lo que se guarda.
// Corre por detrás desde que hay ruta y sin frenar nada; lo suyo tiene que estar cuando se monta el viaje, y si falla
// o no llega, el viaje se hace igual y lo dice. Lo lleva `deUnaCapa`, en `investigar.ts`, como a las otras capas.
//
// Lo que queda en el run:
//
//   moverse.json   lo que entregó y pasó su puerta, en la forma del viaje; o por qué falta
//
// Su contrato está en `agent/contracts/getting-around/`, su puerta 11 en `agent/gates/puerta_moverse.ts`, y la cuenta
// de sueltos o abono en `agent/scripts/capa_moverse.ts`. Este archivo no llama a ninguna IA ni lanza nada.

import { LO_MAS_DE_MOVERSE } from "../data/capa_moverse.ts";
import { topesDeInternet } from "../data/internet.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { puertaMoverse, type ParaMoverse } from "../gates/puerta_moverse.ts";
import type { DeMoverse } from "../output/capas.ts";
import { paraEnsenarMoverse, type EntregaDeMoverse } from "../scripts/capa_moverse.ts";
import { pieza, rutaParaLasCapas, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import type { Pieza } from "./puesto.ts";

export const MOVERSE = "moverse.json";
const ASIENTO = "getting-around";

/**
 * Lo que ve, como dice la hoja: el destino, sus fechas, sus zonas, por dónde se llega (el aeropuerto que sepa la casa,
 * o que no se sabe) y cuántos son; nunca quién viaja, sus edades ni sus precios. Y lo que puede buscar y abrir.
 */
export function piezasDeMoverse(m: Material): Pieza[] {
  const { busquedas, paginas } = topesDeInternet(ASIENTO);
  return [
    pieza("trip.json", {
      ...viajeParaLasCapas(m),
      arrival: { airport: m.viaje.destination.airport ?? "unknown" },
      travellers: { adults: m.viaje.travellers.adults, children: m.viaje.travellers.children.length },
    }),
    pieza("route.json", rutaParaLasCapas(m)),
    pieza("limits.json", { searches: busquedas, pages: paginas, ...LO_MAS_DE_MOVERSE }),
  ];
}

/** Lo que la puerta 11 sabe del viaje: hoy, las zonas y las bases de la ruta, y el aeropuerto si se sabe. */
export const paraLaPuerta = (m: Material): ParaMoverse => ({
  hoy: m.hoy,
  zonas: m.zonas.map((z) => z.id),
  bases: m.ruta.bases.map((b) => b.id),
  llegada: m.viaje.destination.airport ?? null,
});

/** Su puerta: la 11. */
export function puertaDeMoverse(e: unknown, m: Material): Rojo[] {
  return puertaMoverse(e, paraLaPuerta(m)).rojos;
}

/** Lo que se guarda cuando falta entera: nada, y por qué. */
export const sinMoverse = (falta: FaltaDeUnaCapa): DeMoverse => ({
  llegar: [],
  sinLlegar: null,
  transportes: [],
  billetes: [],
  pagos: [],
  coche: null,
  falta,
});

export const capaDeMoverse: CapaDeIA<EntregaDeMoverse, DeMoverse> = {
  paso: "getting_around",
  asiento: ASIENTO,
  archivo: MOVERSE,
  base: "moverse",
  tandas: (m) => [piezasDeMoverse(m)],
  puerta: (e, m) => puertaDeMoverse(e, m),
  ensenar: ([e]) => (e == null ? sinMoverse("failed") : paraEnsenarMoverse(e)),
  sinElla: sinMoverse,
};
