// El de moverse (14.2) en la investigación: lo que se le da, lo que se hace con lo que entrega y lo que se guarda.
// Corre por detrás desde que hay ruta y sin frenar nada; lo suyo tiene que estar cuando se monta el viaje, y si falla
// o no llega, el viaje se hace igual y lo dice. Lo lleva `deUnaCapa`, en `investigar.ts`, como a las otras capas.
//
// Lo que queda en el run:
//
//   moverse.json   lo que entregó y pasó su puerta, en la forma del viaje; o por qué falta
//
// Es de la sesión de 14.2: su contrato (`agent/contracts/getting-around/`), su puerta 11 (`puertaDeMoverse`, que hoy
// solo mira la forma) y la cuenta de sueltos o abono. Este archivo no llama a ninguna IA ni lanza nada.

import { topesDeInternet } from "../data/internet.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { pegasDeMoverse, type DeMoverse } from "../output/capas.ts";
import { paraEnsenarMoverse, type EntregaDeMoverse } from "../scripts/capa_moverse.ts";
import { pieza, rutaParaLasCapas, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import type { Pieza } from "./puesto.ts";

export const MOVERSE = "moverse.json";
const ASIENTO = "getting-around";

/** Lo que ve: el destino, sus zonas, sus fechas, y lo que puede buscar y abrir. Por dónde se llega aún no se sabe. */
export function piezasDeMoverse(m: Material): Pieza[] {
  return [
    pieza("trip.json", viajeParaLasCapas(m)),
    pieza("route.json", rutaParaLasCapas(m)),
    pieza("limits.json", topesDeInternet(ASIENTO)),
  ];
}

/**
 * Su puerta. Hasta que esté la puerta 11, solo la forma: que sea su entrega y que pase lo que el viaje comprueba de
 * esta capa, con las zonas de la ruta.
 */
export function puertaDeMoverse(e: unknown, m: Material): Rojo[] {
  if ((e as { seat?: unknown })?.seat !== ASIENTO) return [{ donde: "seat", que: "no es la entrega del de moverse" }];
  return pegasDeMoverse(
    paraEnsenarMoverse(e as EntregaDeMoverse),
    m.zonas.map((z) => z.id),
  );
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
