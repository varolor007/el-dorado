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
// Es de la sesión de 14.4: su contrato (`agent/contracts/tickets/`), su puerta 13 (`puertaDeLasEntradas`, que hoy solo
// mira la forma), los datos abiertos de verdad (`abiertos` en `fuentes_de_verdad.ts`) y que el ritmo use los días que
// cierra (`diasQueCierra`, en `agent/scripts/capas.ts`). Este archivo no llama a ninguna IA ni lanza nada.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITIOS_EN_TOTAL, SITIOS_POR_LLAMADA } from "../data/capa_entradas.ts";
import type { FaltaDeUnaCapa } from "../data/capas.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { pegasDeLasEntradas, type DeLasEntradas } from "../output/capas.ts";
import { paraEnsenarEntradas, type DatosAbiertos, type EntregaDeLasEntradas } from "../scripts/capa_entradas.ts";
import type { Sitio } from "../tools/sitios.ts";
import { guardarEnElRun, pieza, viajeParaLasCapas, type CapaDeIA, type Material } from "./capas.ts";
import type { Pieza } from "./puesto.ts";

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
 * y lo que dicen de ellos los datos abiertos. Ni el nombre de nadie ni sus precios.
 */
export function piezasDeLasEntradas(m: Material, sitios: Sitio[]): Pieza[] {
  const ids = new Set(sitios.map((s) => s.id));
  return [
    pieza("trip.json", {
      ...viajeParaLasCapas(m),
      travellers: { adults: m.viaje.travellers.adults, children: [...m.viaje.travellers.children] },
    }),
    pieza(
      "sights.json",
      sitios.map((s) => ({ id: s.id, name: s.nombre, kind: s.clase, point: s.punto })),
    ),
    pieza(
      "open_data.json",
      m.abiertos.filter((a) => ids.has(a.sitio)),
    ),
    pieza("limits.json", { sights_in_this_call: sitios.length }),
  ];
}

/** Su puerta, para una tanda. Hasta que esté la puerta 13, solo la forma: cada sitio, de los de su tanda. */
export function puertaDeLasEntradas(e: unknown, m: Material, tanda: number): Rojo[] {
  if ((e as { seat?: unknown })?.seat !== ASIENTO)
    return [{ donde: "seat", que: "no es la entrega del de las entradas" }];
  const suyos = (tandasDeSitios(m.elegidos)[tanda] ?? []).map((s) => s.id);
  return pegasDeLasEntradas(paraEnsenarEntradas([e as EntregaDeLasEntradas], [], []), suyos);
}

/** Lo que se guarda cuando falta entera: nada, y por qué. */
export const sinEntradas = (falta: FaltaDeUnaCapa): DeLasEntradas => ({ sitios: [], falta });

export const capaDeLasEntradas: CapaDeIA<EntregaDeLasEntradas, DeLasEntradas> = {
  paso: "tickets",
  asiento: ASIENTO,
  archivo: ENTRADAS,
  base: "entradas",
  tandas: (m) => tandasDeSitios(m.elegidos).map((sitios) => piezasDeLasEntradas(m, sitios)),
  puerta: (e, m, tanda) => puertaDeLasEntradas(e, m, tanda),
  // Lo que no se miró (pasó del tope o su tanda falló) va con lo que dicen los datos abiertos.
  ensenar: (entregas, m) =>
    paraEnsenarEntradas(
      entregas,
      m.elegidos.map((s) => s.id),
      m.abiertos,
    ),
  sinElla: sinEntradas,
};

/**
 * Lo que se dice al repartir los días si las entradas fallaron, no pasaron su puerta o tardaron más que su tope: que
 * se reparten sin sus horarios. Si su asiento aún no tiene contrato, no es un fallo: no se dice nada.
 */
export function losDiasSinEntradas(e: DeLasEntradas | undefined): string[] {
  if (e === undefined || e.falta === null || e.falta === "no_contract") return [];
  return [`los días se reparten sin los horarios de las entradas (${e.falta})`];
}
