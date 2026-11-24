// Lo que puede salir a internet un asiento que lo dice en su contrato, en números. Son de partida: se ajustan con
// casos reales. El buscador y el lector de webs son los de la propia IA, no una fuente nuestra.

import { TOPES_DE_LOS_PAPELES } from "./papeles.ts";

/** Cuántas búsquedas y cuántas páginas abiertas, como mucho, por asiento. */
export const TOPES_DE_INTERNET = { busquedas: 8, paginas: 12 };

/** Si un asiento necesita otros topes, van aquí, por su nombre; el que no está, lleva los de siempre. */
export const TOPES_POR_ASIENTO: Record<string, { busquedas: number; paginas: number }> = {
  papers: TOPES_DE_LOS_PAPELES,
};

/**
 * Cuántas veces se le deja seguir a la IA cuando para a media vuelta para buscar o leer más (en la llamada directa,
 * cuando dice que hizo una pausa). Cada vez se le vuelve a mandar lo de antes: gasta.
 */
export const VUELTAS_CON_INTERNET = 6;

/**
 * Lo más que entra de una página abierta, en las unidades de cobro de la IA: lo de más no se lee. Una página de
 * requisitos o de fechas cabe de sobra.
 */
export const LO_MAS_DE_UNA_PAGINA = 20_000;

/**
 * Lo que cobra la llamada directa por cada búsqueda, en dólares, aparte de lo que lee y escribe la IA: el precio
 * público del 24-nov-2026, 10 dólares por cada mil. Abrir una página no se cobra aparte: cuenta lo que se lee de
 * ella. Con Claude Code no hace falta: lo que gasta lo dice él.
 */
export const USD_POR_BUSQUEDA = 0.01;

export function topesDeInternet(asiento: string): { busquedas: number; paginas: number } {
  return TOPES_POR_ASIENTO[asiento] ?? TOPES_DE_INTERNET;
}
