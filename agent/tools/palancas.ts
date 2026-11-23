// Las palancas con precio: lo que el código pide otra vez a las fuentes para saber qué ahorra un cambio. Las mismas
// noches movidas un día o dos, y una noche más o una menos, para los mismos alojamientos y el mismo grupo. Nunca se
// mezclan precios de fechas distintas: cada cambio se pide entero, alojamiento y transporte, para sus fechas. Lo que
// una fuente no contesta queda sin precio, con su motivo; no se supone.

import { completo } from "../scripts/finalistas.ts";
import type { Estancia, FuenteAlojamiento, Vuelo } from "./fuentes/tipos.ts";

/** Un cambio de fechas que se prueba: cuántos días se mueven la entrada y la salida. */
export type Cambio = { palanca: "shift_dates" | "nights"; entrada: number; salida: number };

/** El precio de un alojamiento con las fechas cambiadas. Sin precio, null; el transporte, si se pidió y lo hay. */
export type PrecioMovido = {
  palanca: Cambio["palanca"];
  alojamiento: string;
  entrada: string;
  salida: string;
  /** Cuántos días se mueve la entrada, y cuántas noches cambia la estancia. */
  dias: number;
  noches: number;
  total: number | null;
  /** El transporte para esas fechas: su precio, o null si no hay ninguno. Sin transporte en el viaje, no se pide. */
  transporte: number | null;
  nota: string;
};

/** Una fecha, movida unos días. */
export function mover(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error(`no es una fecha: ${fecha}`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Los cambios que se prueban de partida: las mismas noches movidas, y una noche más o menos al final. */
export function cambiosDePartida(dias: number[], noches: number[]): Cambio[] {
  return [
    ...dias.filter((d) => d !== 0).map((d) => ({ palanca: "shift_dates" as const, entrada: d, salida: d })),
    ...noches.filter((n) => n !== 0).map((n) => ({ palanca: "nights" as const, entrada: 0, salida: n })),
  ];
}

export type Opciones = {
  /** El transporte más barato para unas fechas, si el viaje lleva transporte. */
  vuelos?: (ida: string, vuelta: string) => Promise<Vuelo[]>;
  /** El primer día en que se puede viajar: un cambio que cae antes no se pide. */
  desde?: string;
};

/** Pide a la fuente el precio de unos alojamientos con cada cambio de fechas. Lo que falla queda sin precio. */
export async function pedirPalancas(
  fuente: FuenteAlojamiento,
  e: Estancia,
  ids: string[],
  cambios: Cambio[],
  o: Opciones = {},
): Promise<PrecioMovido[]> {
  const salida: PrecioMovido[] = [];
  for (const c of cambios) {
    const entrada = mover(e.entrada, c.entrada);
    const hasta = mover(e.salida, c.salida);
    const base = { palanca: c.palanca, entrada, salida: hasta, dias: c.entrada, noches: c.salida - c.entrada };
    const sinPrecio = (nota: string): void =>
      void salida.push(...ids.map((alojamiento) => ({ ...base, alojamiento, total: null, transporte: null, nota })));
    if (hasta <= entrada) {
      sinPrecio("con ese cambio no queda ninguna noche");
      continue;
    }
    if (o.desde !== undefined && entrada < o.desde) {
      sinPrecio("cae antes del primer día en que se puede viajar");
      continue;
    }
    let transporte: number | null = null;
    let notaDelTransporte = "";
    if (o.vuelos !== undefined) {
      try {
        const vuelos = await o.vuelos(entrada, hasta);
        transporte = vuelos.length === 0 ? null : Math.min(...vuelos.map((v) => v.precio));
        if (transporte === null) notaDelTransporte = "sin precio de transporte para esas fechas";
      } catch {
        // La nota va en la tabla que lee el asiento que cruza. El mensaje de un fallo lleva un trozo de lo que
        // contestó la fuente, y eso no viaja hasta un asiento: se dice que no contesta, con una frase de la casa.
        notaDelTransporte = "sin transporte: la fuente no contesta";
      }
    }
    try {
      const precios = await fuente.precios(ids, { ...e, entrada, salida: hasta });
      for (const alojamiento of ids) {
        const p = precios.find((x) => x.id === alojamiento);
        // Un precio de otras fechas o de otro grupo no vale, lo mande quien lo mande.
        const vale = p !== undefined && p.entrada === entrada && p.salida === hasta && p.adultos === e.adultos;
        salida.push({
          ...base,
          alojamiento,
          total: vale ? completo(p) : null,
          transporte,
          nota: vale ? notaDelTransporte : "sin precio para esas fechas",
        });
      }
    } catch {
      // Lo mismo que con el transporte: una frase de la casa, sin lo que contestó la fuente.
      sinPrecio("la fuente no contesta");
    }
  }
  return salida;
}
