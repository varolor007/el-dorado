// El que conoce el destino (14.3) en la investigación: lo que se le da, lo que se hace con lo que entrega y lo que
// se guarda. Corre por detrás desde que hay ruta y sin frenar nada; lo suyo tiene que estar cuando se monta el viaje,
// y si falla o no llega, el viaje se hace igual y lo dice. Lo lleva `deUnaCapa`, en `investigar.ts`.
//
// Lo que queda en el run:
//
//   saber.json   lo que entregó y pasó su puerta, en la forma del viaje; o por qué falta
//
// Su contrato, en `agent/contracts/local-knowledge/`; su puerta 12, en `agent/gates/puerta_destino.ts`, y con ella lo
// que se comprueba de la forma del viaje. Este archivo no llama a ninguna IA ni lanza nada.

import { CIFRAS_DE_UNA_COSA, LETRAS_DE_UNA_COSA, LO_MAS_DE_COSAS, TOPE_POR_CLASE } from "../data/capa_destino.ts";
import { loQueSeBusca } from "../data/buscar.ts";
import { LETRAS_DE_UN_NOMBRE } from "../data/capas.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import { topesDeInternet } from "../data/internet.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { puertaDestino } from "../gates/puerta_destino.ts";
import { pegasDelDestino, type DelDestino } from "../output/capas.ts";
import { paraEnsenarDestino, type EntregaDelDestino } from "../scripts/capa_destino.ts";
import { pieza, rutaParaLasCapas, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import type { Pieza } from "./puesto.ts";

export const SABER = "saber.json";
const ASIENTO = "local-knowledge";

/**
 * Lo que ve: el destino, sus fechas, su idioma y su moneda, y lo que busca el viajero, solo lo que es de la lista
 * fija de lo que se puede buscar (`loQueSeBusca`): busca en internet con lo que lee, y nada escrito por el viajero ni
 * resumido de sus palabras sale a internet. La ruta, con sus zonas; y sus topes: cuántas cosas en total y por clase,
 * lo largo de cada frase y de cada nombre, cuántas cifras y lo que puede salir a internet. Ni quién viaja, ni sus
 * precios.
 */
export function piezasDelDestino(m: Material): Pieza[] {
  return [
    pieza("trip.json", { ...viajeParaLasCapas(m), looking_for: loQueSeBusca(m.viaje.looking_for) }),
    pieza("route.json", rutaParaLasCapas(m)),
    pieza("limits.json", {
      items_allowed: LO_MAS_DE_COSAS,
      per_kind: TOPE_POR_CLASE,
      letters: LETRAS_DE_UNA_COSA,
      name_letters: LETRAS_DE_UN_NOMBRE,
      figures_allowed: CIFRAS_DE_UNA_COSA,
      ...topesDeInternet(ASIENTO),
    }),
  ];
}

/**
 * Su puerta, la 12 (`agent/gates/puerta_destino.ts`), con las zonas de la ruta y el día de hoy; y, si pasa, lo que
 * se comprueba de su forma en el viaje.
 */
export function puertaDelDestino(e: unknown, m: Material): Rojo[] {
  const { rojos } = puertaDestino(e, { zonas: m.zonas, hoy: m.hoy });
  if (rojos.length > 0) return rojos;
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
