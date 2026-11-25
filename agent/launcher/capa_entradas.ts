// El de las entradas (14.4) en la investigación: lo que dicen los datos abiertos de los sitios elegidos, lo que se le
// da al asiento en cada tanda de sitios, lo que se hace con lo que entrega y lo que se guarda. Corre en cuanto se
// saben los sitios elegidos, y repartir los días lo espera hasta su tope (`ESPERA_DE_LAS_ENTRADAS`): si falla o
// tarda más, los días se reparten sin sus horarios, y se dice. Lo lleva `deUnaCapa`, en `investigar.ts`.
//
// Lo que queda en el run:
//
//   abiertos.json   lo que dicen los datos abiertos de cada sitio elegido, o por qué no se sabe
//   entradas.json   lo que entregaron sus llamadas y pasó su puerta, en la forma del viaje; o por qué falta
//
// Su contrato está en `agent/contracts/tickets/`; su puerta 13, en `agent/gates/puerta_entradas.ts`, que mira cada
// precio y cada horario contra las páginas que abrió de verdad (la memoria de lo consultado de su puesto); los datos
// abiertos de verdad, en `agent/tools/abiertos.ts`; y lo que cierra cada día, que usan el ritmo y la puerta 9, sale de
// aquí (`cierraEnElRun`). Este archivo no llama a ninguna IA ni lanza nada.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITIOS_EN_TOTAL, SITIOS_POR_LLAMADA } from "../data/capa_entradas.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import { topesDeInternet } from "../data/internet.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { puertaEntradas } from "../gates/puerta_entradas.ts";
import { pegasDeLasEntradas, type DeLasEntradas } from "../output/capas.ts";
import { diasQueCierra } from "../scripts/capas.ts";
import { paraEnsenarEntradas, type DatosAbiertos, type EntregaDeLasEntradas } from "../scripts/capa_entradas.ts";
import type { Sitio } from "../tools/sitios.ts";
import { capaDelRun, guardarEnElRun, pieza, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import { abiertas, leerConsultado } from "./consultado.ts";
import { puestosDe, type Pieza } from "./puesto.ts";

export const ENTRADAS = "entradas.json";
export const ABIERTOS = "abiertos.json";
const ASIENTO = "tickets";

/** Lo que trae los datos abiertos de unos sitios: es una fuente, y se le pasa a la investigación con las demás. */
export type TraerAbiertos = (sitios: Sitio[]) => Promise<DatosAbiertos[]>;

/** Los sitios que se miran: los elegidos, por orden de importancia, hasta el tope; en tandas de los de cada llamada. */
export function tandasDeSitios(elegidos: Sitio[]): Sitio[][] {
  const mirados = elegidos.slice(0, SITIOS_EN_TOTAL);
  const tandas: Sitio[][] = [];
  for (let i = 0; i < mirados.length; i += SITIOS_POR_LLAMADA) tandas.push(mirados.slice(i, i + SITIOS_POR_LLAMADA));
  return tandas;
}

/**
 * Lo que dicen los datos abiertos de los sitios elegidos, una vez por run. Sin la fuente, o si falla, no se sabe nada
 * de ninguno, y se dice: el asiento lo busca igual en su web.
 */
export async function traerLosAbiertos(
  run: string,
  elegidos: Sitio[],
  traer?: TraerAbiertos,
): Promise<DatosAbiertos[]> {
  const ruta = join(run, ABIERTOS);
  if (existsSync(ruta)) return (JSON.parse(readFileSync(ruta, "utf8")) as { abiertos: DatosAbiertos[] }).abiertos;
  let abiertos: DatosAbiertos[] = [];
  const avisos: string[] = [];
  if (traer === undefined) avisos.push("sin datos abiertos de los sitios: no hay fuente");
  else
    try {
      const ids = new Set(elegidos.map((s) => s.id));
      abiertos = (await traer(elegidos)).filter((a) => ids.has(a.sitio));
    } catch (error) {
      avisos.push(`sin datos abiertos de los sitios: ${error instanceof Error ? error.message : String(error)}`);
    }
  guardarEnElRun(run, ABIERTOS, { abiertos, avisos });
  return abiertos;
}

/**
 * Lo que ve en cada llamada: el destino y las fechas, cuántos son y sus edades (nunca quiénes), los sitios de su tanda
 * y lo que dicen de ellos los datos abiertos, y sus topes. Ni el nombre de nadie ni sus precios.
 */
export function piezasDeLasEntradas(m: Material, sitios: Sitio[]): Pieza[] {
  const ids = new Set(sitios.map((s) => s.id));
  const { busquedas, paginas } = topesDeInternet(ASIENTO);
  return [
    pieza("trip.json", {
      ...viajeParaLasCapas(m),
      travellers: { adults: m.viaje.travellers.adults, children: [...m.viaje.travellers.children] },
    }),
    pieza(
      "sights.json",
      sitios.map((s) => ({ id: s.id, name: s.nombre, kind: s.clase, point: s.punto })),
    ),
    pieza("open_data.json", m.abiertos.filter((a) => ids.has(a.sitio)).map(abiertosParaElAsiento)),
    pieza("limits.json", { sights_in_this_call: sitios.length, searches: busquedas, pages: paginas }),
  ];
}

/** Lo que dicen los datos abiertos de un sitio, en inglés como su contrato: lo mismo, con la página de cada cosa. */
function abiertosParaElAsiento(a: DatosAbiertos): Record<string, unknown> {
  const pagina = (dato: "horario" | "pago" | "web"): string | null => (a.de?.[dato] ?? a.fuentes[0])?.url ?? null;
  return {
    id: a.sitio,
    opening_hours: a.horario === null ? "unknown" : { as_written: a.horario, source: pagina("horario") },
    fee: a.dePago === null ? "unknown" : { paid: a.dePago, source: pagina("pago") },
    website: a.web === null ? "unknown" : { url: a.web, source: pagina("web") },
  };
}

/** El puesto de una tanda, el último de sus vueltas: el que acaba de entregar. */
function puestoDeLaTanda(run: string, base: string) {
  const suyos = puestosDe(run).filter((p) => new RegExp(`^${base}-v\\d+$`).test(p.id));
  return suyos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).pop() ?? null;
}

/**
 * Su puerta, la 13, para una tanda. Con el run, cada precio y cada horario se mira contra las páginas que abrió de
 * verdad ese puesto; sin él, solo lo demás (las páginas las mira igual la puerta de todos). Y lo que pasa a la forma
 * del viaje, con lo que se comprueba de ella.
 */
export function puertaDeLasEntradas(e: unknown, m: Material, tanda: number, run: string | null = null): Rojo[] {
  const tandas = tandasDeSitios(m.elegidos);
  const suyos = (tandas[tanda] ?? []).map((s) => s.id);
  const base = tandas.length === 1 ? "entradas" : `entradas-${tanda + 1}`;
  const puesto = run === null ? null : puestoDeLaTanda(run, base);
  const v = puertaEntradas(e, {
    sitios: suyos,
    entrada: m.viaje.dates.check_in,
    salida: m.viaje.dates.check_out,
    hoy: m.hoy,
    abiertas: puesto === null ? null : abiertas(leerConsultado(puesto)),
    deLosAbiertos: m.abiertos.flatMap((a) => a.fuentes.map((f) => f.url)),
  });
  if (!v.verde) return v.rojos;
  return pegasDeLasEntradas(paraEnsenarEntradas([e as EntregaDeLasEntradas], [], m.abiertos), suyos);
}

/** Lo que se guarda cuando falta entera: nada, y por qué. */
export const sinEntradas = (falta: FaltaDeUnaCapa): DeLasEntradas => ({ sitios: [], falta });

/** El de las entradas de un run: su puerta mira lo que abrió de verdad cada puesto de ese run. */
export function capaDeLasEntradasDe(run: string | null): CapaDeIA<EntregaDeLasEntradas, DeLasEntradas> {
  return {
    paso: "tickets",
    asiento: ASIENTO,
    archivo: ENTRADAS,
    base: "entradas",
    tandas: (m) => tandasDeSitios(m.elegidos).map((sitios) => piezasDeLasEntradas(m, sitios)),
    puerta: (e, m, tanda) => puertaDeLasEntradas(e, m, tanda, run),
    // Lo que no se miró (pasó del tope o su tanda falló) va con lo que dicen los datos abiertos.
    ensenar: (entregas, m) =>
      paraEnsenarEntradas(
        entregas,
        m.elegidos.map((s) => s.id),
        m.abiertos,
      ),
    sinElla: sinEntradas,
  };
}

/** El de las entradas sin run: su puerta no tiene páginas abiertas que mirar, y las deja a la puerta de todos. */
export const capaDeLasEntradas = capaDeLasEntradasDe(null);

/**
 * Los días del viaje que se sabe que cierra cada parada, por las entradas del run: lo que miran el ritmo y la puerta 9.
 * Sin entradas, o si faltan, no se sabe que cierre nada, y nada se mueve.
 */
export function cierraEnElRun(run: string, fechas: readonly string[]): Record<string, string[]> {
  return diasQueCierra(capaDelRun<DeLasEntradas>(run, ENTRADAS), fechas);
}

/**
 * Lo que se dice al repartir los días si las entradas fallaron, no pasaron su puerta o tardaron más que su tope: que
 * se reparten sin sus horarios. Si su asiento aún no tiene contrato, no es un fallo: no se dice nada.
 */
export function losDiasSinEntradas(e: DeLasEntradas | undefined): string[] {
  if (e === undefined || e.falta === null || e.falta === "no_contract") return [];
  return [`los días se reparten sin los horarios de las entradas (${e.falta})`];
}
