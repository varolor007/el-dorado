// Empezar, visto desde la web: de lo que se elige en el buscador a lo que la casa entiende por un sitio, y lo que se
// le propone al viajero por su navegador. Lo que he entendido lo hace la casa, con `agent/scripts/empezar.ts`.

import { monedaDe } from "../../../agent/data/monedas.ts";
import type { SitioElegido } from "../../../agent/scripts/empezar.ts";
import type { Lugar } from "./lugares.ts";

/** Un sitio del buscador, como lo entiende la casa. Su caja llega como la da el buscador: oeste, norte, este y sur. */
export function sitioDe(l: Lugar): SitioElegido {
  const c = l.caja;
  // Una caja que no encierra nada no vale: la casa le pone una alrededor de su centro.
  const caja =
    c === null || !(c[3] < c[1]) || c[0] === c[2] ? null : { west: c[0], south: c[3], east: c[2], north: c[1] };
  return { nombre: l.nombre, pais: l.pais, clase: l.clase, centro: { lat: l.lat, lon: l.lon }, caja };
}

/**
 * El país más probable de quien mira, por el idioma de su navegador: «pt-BR» es Brasil, y «ja», Japón. Es para
 * proponer, no para decidir: si no sale un país, no se propone nada.
 */
export function paisDelNavegador(idioma: string): string | null {
  try {
    const region = new Intl.Locale(idioma).maximize().region;
    return region !== undefined && /^[A-Z]{2}$/.test(region) ? region : null;
  } catch {
    return null;
  }
}

/** La moneda que se le propone a quien mira, por su navegador. La suya la dice él. */
export const monedaDelNavegador = (idioma: string): string | null => monedaDe(paisDelNavegador(idioma));
