// El que conoce el destino (14.3) en la investigación: lo que se le da, lo que se hace con lo que entrega y lo que
// se guarda. Corre por detrás desde que hay ruta y sin frenar nada; lo suyo tiene que estar cuando se monta el viaje,
// y si falla o no llega, el viaje se hace igual y lo dice. Lo lleva `deUnaCapa`, en `investigar.ts`.
//
// Lo que queda en el run:
//
//   saber.json   lo que entregó y pasó su puerta, en la forma del viaje; o por qué falta
//
// Es de la sesión de 14.3: su contrato (`agent/contracts/local-knowledge/`) y su puerta 12 (`puertaDelDestino`, que
// hoy solo mira la forma). Este archivo no llama a ninguna IA ni lanza nada.

import { LETRAS_DE_UNA_COSA, TOPE_POR_CLASE } from "../data/capa_destino.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import { topesDeInternet } from "../data/internet.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { pegasDelDestino, type DelDestino } from "../output/capas.ts";
import { paraEnsenarDestino, type EntregaDelDestino } from "../scripts/capa_destino.ts";
import { pieza, rutaParaLasCapas, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import type { Pieza } from "./puesto.ts";

export const SABER = "saber.json";
const ASIENTO = "local-knowledge";

/** Lo que ve: lo mismo que el de moverse y lo que busca el viajero; sus clases, con su tope, y su largo. */
export function piezasDelDestino(m: Material): Pieza[] {
  return [
    pieza("trip.json", { ...viajeParaLasCapas(m), looking_for: m.viaje.looking_for }),
    pieza("route.json", rutaParaLasCapas(m)),
    pieza("limits.json", { per_kind: TOPE_POR_CLASE, letters: LETRAS_DE_UNA_COSA, ...topesDeInternet(ASIENTO) }),
  ];
}

/** Su puerta. Hasta que esté la puerta 12, solo la forma, con las zonas de la ruta. */
export function puertaDelDestino(e: unknown, m: Material): Rojo[] {
  if ((e as { seat?: unknown })?.seat !== ASIENTO)
    return [{ donde: "seat", que: "no es la entrega del que conoce el destino" }];
  return pegasDelDestino(
    paraEnsenarDestino(e as EntregaDelDestino),
    m.zonas.map((z) => z.id),
  );
}

/** Lo que se guarda cuando falta entera: nada, y por qué. */
export const sinDestino = (falta: FaltaDeUnaCapa): DelDestino => ({ cosas: [], falta });

export const capaDelDestino: CapaDeIA<EntregaDelDestino, DelDestino> = {
  paso: "local_knowledge",
  asiento: ASIENTO,
  archivo: SABER,
  base: "saber",
  tandas: (m) => [piezasDelDestino(m)],
  puerta: (e, m) => puertaDelDestino(e, m),
  ensenar: ([e]) => (e == null ? sinDestino("failed") : paraEnsenarDestino(e)),
  sinElla: sinDestino,
};
