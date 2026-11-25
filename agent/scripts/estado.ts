// El estado de cada pieza de un viaje, sacado de lo que hay: la versión que se enseña, tus elecciones sobre ella y,
// si hay un cambio a medias, lo que dejó sin valer. No se guarda nada que se pueda calcular: esto se calcula cada vez.
// Por claves, como lo dice la hoja en «El estado de cada cosa». Sin nada de Node.

import type { PiezaDelViaje } from "../data/momentos.ts";
import type { Viaje } from "../output/viaje.ts";
import { edadDe } from "./cierre.ts";
import { alojamientoDe, SIN_ELEGIR, tocasteLosDias, transporteDe, type Elecciones } from "./elecciones.ts";

/** Una pieza: propuesta, elegida por ti, por rehacer (un cambio la dejó sin valer) o descartada. */
export const ESTADOS_DE_UNA_PIEZA = ["proposed", "chosen", "redo", "discarded"] as const;
export type EstadoDeUnaPieza = (typeof ESTADOS_DE_UNA_PIEZA)[number];

/** Una parada: propuesta, quitada por ti, añadida por ti o movida de día. */
export const ESTADOS_DE_UNA_PARADA = ["proposed", "removed", "added", "moved"] as const;
export type EstadoDeUnaParada = (typeof ESTADOS_DE_UNA_PARADA)[number];

/** Un precio: visto ahora, guardado de hace días (con su fecha), sin confirmar o caducado. */
export const ESTADOS_DE_UN_PRECIO = ["now", "saved", "unconfirmed", "stale"] as const;
export type EstadoDeUnPrecio = (typeof ESTADOS_DE_UN_PRECIO)[number];

export type EstadoDelViaje = {
  lodging: Record<string, EstadoDeUnaPieza>;
  transport: Record<string, EstadoDeUnaPieza>;
  days: Record<string, EstadoDeUnaPieza>;
  stops: Record<string, EstadoDeUnaParada>;
  prices: Record<string, { state: EstadoDeUnPrecio; seen: string }>;
};

/**
 * El estado de un precio a una hora, con los números de cerrar el viaje (`agent/data/cierre.ts`): dentro de la edad
 * de un precio pedido ahora, visto ahora; dentro de la de uno guardado, guardado; pasada, caducado.
 */
export function estadoDelPrecio(visto: string, cuando: string, guardado: boolean): EstadoDeUnPrecio {
  if (!guardado && edadDe(visto, cuando, false) === "now") return "now";
  return edadDe(visto, cuando, true) === "saved" ? "saved" : "stale";
}

/**
 * El estado de cada pieza del viaje. `porRehacer` son las piezas que dejó sin valer un cambio que aún no ha dado su
 * versión (de `impactoDe`): esas están por rehacer, y lo demás, como esté.
 */
export function estadoDe(
  v: Viaje,
  e: Elecciones = SIN_ELEGIR,
  cuando: string,
  porRehacer: readonly PiezaDelViaje[] = [],
): EstadoDelViaje {
  const tuya = e.way !== null || e.lodging !== null || e.transport !== null;
  const cama = alojamientoDe(v, e);
  const ida = transporteDe(v, e);
  const pieza = (clase: PiezaDelViaje, descartada: boolean, elegida: boolean): EstadoDeUnaPieza =>
    porRehacer.includes(clase) ? "redo" : descartada ? "discarded" : elegida && tuya ? "chosen" : "proposed";
  const lodging = Object.fromEntries(
    v.alojamientos.map((a) => [a.id, pieza("lodging", a.descartado != null, a.id === cama)]),
  );
  const transport = Object.fromEntries(v.transportes.map((t) => [t.id, pieza("transport", false, t.id === ida)]));
  const tocados = tocasteLosDias(e);
  const days = Object.fromEntries(
    v.dias.map((d) => [d.fecha, porRehacer.includes("days") ? "redo" : tocados ? "chosen" : "proposed"] as const),
  );
  const stops: Record<string, EstadoDeUnaParada> = {};
  for (const p of v.paradas)
    stops[p.id] = e.removed.includes(p.id)
      ? "removed"
      : e.added.includes(p.id)
        ? "added"
        : p.id in e.moved
          ? "moved"
          : "proposed";
  const prices: EstadoDelViaje["prices"] = {};
  const sinConfirmar = new Set((v.cierre?.sinConfirmar ?? []).map((s) => s.ref).filter((r): r is string => r !== null));
  for (const a of v.alojamientos)
    prices[a.id] = { state: estadoDelPrecio(a.precio.visto, cuando, false), seen: a.precio.visto };
  for (const t of v.transportes)
    prices[t.id] = { state: estadoDelPrecio(t.precio.visto, cuando, t.guardado), seen: t.precio.visto };
  // Un viaje cerrado lleva el precio de ese día: el de cada pieza que se cerró, y si quedó sin confirmar.
  for (const p of v.cierre?.precios ?? []) {
    if (p.hoy === null || sinConfirmar.has(p.ref)) prices[p.ref] = { state: "unconfirmed", seen: p.antes.visto };
    else prices[p.ref] = { state: estadoDelPrecio(p.hoy.visto, cuando, p.edad === "saved"), seen: p.hoy.visto };
  }
  return { lodging, transport, days, stops, prices };
}
