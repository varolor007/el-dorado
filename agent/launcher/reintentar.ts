// «Volver a intentarlo» del viajero: retoma el run parado donde se paró, sin volver a empezar. Si lo paró un asiento
// (no entregó, o entregó en rojo en todas sus vueltas), se monta una vuelta más de ese asiento, y solo de ese, en un
// puesto limpio con el mismo material del anterior y, si hubo entrega en rojo, con lo devuelto, como en cualquier
// vuelta. Lo demás del run se queda como está, y no se vuelve a gastar. La entrega nueva pasa las mismas puertas que
// cualquiera, y la investigación sigue sola desde ahí. Si lo paró la casa (se rompió a medias), se sigue donde se
// cortó, con lo que hay en el disco.
//
// Lo que no hace: llamar al conductor (es uno por run, y tras una vuelta pedida por el viajero ya no se le llama),
// retomar una parada que no es de un asiento ni de la casa (nada que elegir, un viaje que aún no se sabe hacer, el
// techo de gasto), cambiar una entrega o un mensaje, ni pasar de `REINTENTOS_POR_RUN` pulsaciones en un run.
//
// Va en dos tiempos, para que un corte de la casa no deje nada a medias: `reintentar` apunta la pulsación y monta la
// vuelta nueva, con el run todavía parado; `aplicarReintento`, que llama la casa al llevar el run, quita la parada
// mientras esa vuelta no ha empezado. Las dos se pueden llamar las veces que haga falta: si se cortó entre una y otra,
// la pulsación siguiente sigue la misma, sin contar otra.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REINTENTOS, REINTENTOS_POR_RUN } from "../data/conductor.ts";
import { PARADO } from "../data/pasos.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import {
  baseDe,
  causaDe,
  comoSeRetoma,
  paradaDeCara,
  reintentosDe,
  veredictoDe,
  vueltaDe,
  type ParadaDelActa,
  type Reintento,
} from "./acta.ts";
import { ordenDeApertura } from "./asiento.ts";
import { conSuLinea } from "./investigar.ts";
import { guardarJson } from "./mesa.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";
import { trabajosDe } from "./trabajos.ts";
import { contar } from "./vivo.ts";

/** Por qué no se puede retomar ahora, por su clave: `not_now` (no está parado así) o `too_many` (se pasó del tope). */
export class FalloAlReintentar extends Error {}

/** Lo que dice la casa de un reintento apuntado: si ya se aplicó, en un run parado por la casa. */
type Apuntado = Reintento & { aplicado?: boolean };

const puestoDe = (run: string, id: string): Puesto | undefined => puestosDe(run).find((p) => p.id === id);
const entregado = (p: Puesto): boolean => existsSync(join(p.carpeta, "out", "delivery.json"));
/** Una vuelta empezada: ya se lanzó, o ya dejó su entrega. Sobre ella no se vuelve atrás. */
const empezada = (run: string, id: string): boolean => {
  const p = puestoDe(run, id);
  return trabajosDe(run).some((t) => t.puesto === id) || (p !== undefined && entregado(p));
};

function leerApuntados(run: string): Apuntado[] {
  return reintentosDe(run) as Apuntado[];
}

function guardarApuntados(run: string, todos: Apuntado[]): void {
  guardarJson(join(run, REINTENTOS), todos);
}

/** Todo lo que hay dentro de una carpeta, con su ruta desde ella. */
function archivos(carpeta: string): string[] {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

/** El puesto de la vuelta siguiente: `ruta-v3` pasa a `ruta-v4`; el que no lleva vuelta, como `a1-p1`, a `a1-p1-v2`. */
export const vueltaSiguiente = (puesto: string): string => `${baseDe(puesto)}-v${vueltaDe(puesto) + 1}`;

/**
 * El material de la vuelta nueva: el mismo del puesto anterior. Si entregó en rojo, lo devuelto es lo de esa entrega
 * (lo que estaba mal y la entrega), como en cualquier vuelta; si no llegó a entregar, va tal cual.
 */
function piezasDeLaVuelta(run: string, antes: Puesto, clase: ParadaDelActa["clase"]): Pieza[] {
  const material = join(antes.carpeta, "in");
  const piezas: Pieza[] = archivos(material).map((a) => ({ ruta: relative(material, a), copiaDe: a }));
  if (clase !== "seat_kept_failing" || !entregado(antes)) return piezas;
  const rojos: Rojo[] = veredictoDe(run, antes.id)?.rojos ?? [];
  let entrega: unknown = null;
  try {
    entrega = JSON.parse(readFileSync(join(antes.carpeta, "out", "delivery.json"), "utf8"));
  } catch {
    entrega = null;
  }
  const devuelto = { what_was_wrong: conSuLinea(antes, rojos), delivery: entrega };
  return [
    ...piezas.filter((p) => p.ruta !== "returned.json"),
    { ruta: "returned.json", contenido: JSON.stringify(devuelto, null, 2) },
  ];
}

/**
 * Deja montada la vuelta de un reintento, si falta: su puesto, su orden y, si es de los que miran, su sitio en
 * `mirar.json` en lugar del anterior. Lo que ya está no se vuelve a hacer.
 */
function completar(run: string, r: Apuntado): void {
  if (r.puesto === null || r.de === null) return;
  const antes = puestoDe(run, r.de);
  if (antes === undefined) throw new Error(`falta el puesto ${r.de}`);
  const nuevo =
    puestoDe(run, r.puesto) ?? montarPuesto(run, r.puesto, antes.asiento, piezasDeLaVuelta(run, antes, r.clase));
  mkdirSync(join(run, "ordenes"), { recursive: true });
  const orden = join(run, "ordenes", `${nuevo.id}.txt`);
  if (!existsSync(orden)) writeFileSync(orden, ordenDeApertura());
  // Los que miran se recogen por su lista: la vuelta nueva ocupa el sitio de la anterior.
  const mirar = join(run, "mirar.json");
  if (!existsSync(mirar)) return;
  const dicho = JSON.parse(readFileSync(mirar, "utf8")) as { quienes?: { puesto: string }[] };
  if (!Array.isArray(dicho.quienes) || !dicho.quienes.some((q) => q.puesto === r.de)) return;
  dicho.quienes = dicho.quienes.map((q) => (q.puesto === r.de ? { ...q, puesto: r.puesto as string } : q));
  guardarJson(mirar, dicho);
}

/** El reintento que espera a la casa para esta parada, si lo hay: apuntado y aún sin empezar. */
function pendiente(run: string, causa: ParadaDelActa): Apuntado | null {
  const ultimo = leerApuntados(run).at(-1);
  if (ultimo === undefined) return null;
  if (ultimo.puesto !== null) return ultimo.de === causa.puesto && !empezada(run, ultimo.puesto) ? ultimo : null;
  return causa.clase === "house_broke" && ultimo.clase === "house_broke" && ultimo.aplicado !== true ? ultimo : null;
}

/**
 * La pulsación del viajero: apunta el reintento y monta su vuelta, con el run aún parado. Lo pone en marcha la casa,
 * con `llevar`. Lanza `FalloAlReintentar` si este run no está parado de una forma que se retome así.
 */
export function reintentar(run: string, cuando: Date = new Date()): Reintento {
  if (existsSync(join(run, "viaje.json")) || !existsSync(join(run, PARADO))) throw new FalloAlReintentar("not_now");
  const causa = causaDe(run);
  const cara = paradaDeCara(run);
  if (causa === null || cara === null) throw new FalloAlReintentar("not_now");
  const como = comoSeRetoma(causa);
  // Mientras el conductor mira la parada, o si lo que queda no es volver a intentarlo, no se toca.
  if (como === null || cara.looking) throw new FalloAlReintentar("not_now");
  const ya = pendiente(run, causa);
  if (ya !== null) {
    completar(run, ya);
    return ya;
  }
  const todos = leerApuntados(run);
  if (todos.length >= REINTENTOS_POR_RUN) throw new FalloAlReintentar("too_many");
  if (!cara.options.includes("retry")) throw new FalloAlReintentar("not_now");
  const puesto = como === "seat" ? vueltaSiguiente(causa.puesto as string) : null;
  if (puesto !== null && empezada(run, puesto)) throw new FalloAlReintentar("not_now");
  const r: Apuntado = {
    n: todos.length + 1,
    cuando: cuando.toISOString(),
    clase: causa.clase,
    en: causa.en,
    de: como === "seat" ? causa.puesto : null,
    asiento: como === "seat" ? causa.asiento : null,
    puesto,
  };
  // Primero se apunta, y después se monta: si la casa se corta entre una cosa y otra, la pulsación siguiente lo acaba.
  guardarApuntados(run, [...todos, r]);
  completar(run, r);
  contar(run);
  return r;
}

/**
 * Lo que hace la casa al llevar un run con un reintento apuntado: lo acaba de montar si quedó a medias y quita la
 * parada, mientras la vuelta nueva no haya empezado. Si ya empezó, lo que diga el run es lo suyo. Devuelve verdadero
 * si quitó la parada.
 */
export function aplicarReintento(run: string): boolean {
  if (!existsSync(join(run, PARADO)) || existsSync(join(run, "viaje.json"))) return false;
  const causa = causaDe(run);
  if (causa === null) return false;
  const r = pendiente(run, causa);
  if (r === null) return false;
  completar(run, r);
  if (r.puesto === null)
    guardarApuntados(
      run,
      leerApuntados(run).map((x) => (x.n === r.n ? { ...x, aplicado: true } : x)),
    );
  rmSync(join(run, PARADO));
  contar(run);
  return true;
}
