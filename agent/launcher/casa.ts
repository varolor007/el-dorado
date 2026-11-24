// La casa lleva una investigación sola: da los pasos de código, lanza cada asiento que espera, lo recoge y sigue,
// hasta que el viaje está hecho o algo la para. Quién piensa en cada asiento se le pasa de fuera: con uno inventado
// se prueba sin gastar, y el de verdad se enchufa con su punto del plan. Este archivo no llama a ninguna IA.
//
// Dos cosas no pasan nunca: ningún asiento se lanza sin el adelante del viajero, que es su botón; y ninguno se lanza
// cuando lo gastado ya llegó al techo que aceptó con él.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ASIENTOS_A_LA_VEZ, TOPE_DE_UN_ASIENTO, VUELTAS_DE_LA_CASA } from "../data/pasos.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { escribirActa } from "./acta.ts";
import { lanzarAsiento, type Gasto, type Lanzador, type Tope } from "./asiento.ts";
import { conducir } from "./conductor.ts";
import { pararRun, sigue, type Estado, type Fuentes } from "./investigar.ts";
import { guardarJson } from "./mesa.ts";
import { porDondeVa } from "./pasos.ts";
import { puestosDe } from "./puesto.ts";
import { acaboSinEntregar, apuntarTrabajo, gastoDe, trabajosDe } from "./trabajos.ts";

export const ADELANTE = "adelante.json";

/** El adelante del viajero a una investigación: cuándo lo dio y hasta cuánto aceptó gastar de su clave, en dólares. */
export type Adelante = { cuando: string; techo: number | null };

/** Apunta en el run el adelante del viajero. Sin techo (null) no hay tope de gasto: solo para quien lanza a mano. */
export function darElAdelante(run: string, techo: number | null, cuando: Date = new Date()): Adelante {
  if (techo !== null && !(Number.isFinite(techo) && techo > 0)) throw new Error("el techo de gasto no vale");
  const adelante: Adelante = { cuando: cuando.toISOString(), techo };
  guardarJson(join(run, ADELANTE), adelante);
  return adelante;
}

export function adelanteDe(run: string): Adelante | null {
  if (!existsSync(join(run, ADELANTE))) return null;
  try {
    const a = JSON.parse(readFileSync(join(run, ADELANTE), "utf8")) as Adelante;
    const techo = a.techo === null || (Number.isFinite(a.techo) && a.techo > 0);
    return typeof a.cuando === "string" && techo ? a : null;
  } catch {
    return null;
  }
}

export type Llevado = Estado & {
  /** Hay asientos esperando y no se lanzan porque falta el adelante del viajero. */
  sinAdelante: boolean;
  gasto: Gasto & { sabido: boolean };
  /** Los puestos que se lanzaron en esta llamada, en su orden. */
  lanzados: string[];
};

export type AlLlevar = {
  tope?: Tope;
  aLaVez?: number;
  ahora?: () => Date;
  /** Sin conductor (false), un run parado por un asiento se queda parado sin que nadie lo mire. */
  conductor?: boolean;
};

/** Unos cuantos a la vez, y no más: cada uno empieza cuando queda sitio. */
async function porTandas<T>(cosas: T[], aLaVez: number, hacer: (cosa: T) => Promise<void>): Promise<void> {
  const cola = [...cosas];
  const uno = async (): Promise<void> => {
    for (let cosa = cola.shift(); cosa !== undefined; cosa = cola.shift()) await hacer(cosa);
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(aLaVez, cosas.length)) }, uno));
}

/** El paso de la investigación al que pertenece un puesto que espera. */
function pasoDe(run: string, puesto: string): string {
  return porDondeVa(run).find((p) => p.esperan.includes(puesto))?.id ?? "seat";
}

/**
 * Lo que quedó a medias si la casa se cortó con asientos trabajando: el que llegó a entregar está hecho, y el que
 * no, falló. Un puesto se lanza una sola vez: no se vuelve a lanzar por encima de lo que dejó escrito.
 */
function cerrarLosCortados(run: string, ahora: () => Date): void {
  const puestos = puestosDe(run);
  for (const t of trabajosDe(run)) {
    if (t.estado !== "queued" && t.estado !== "working") continue;
    const puesto = puestos.find((p) => p.id === t.puesto);
    const entregado = puesto !== undefined && existsSync(join(puesto.carpeta, "out", "delivery.json"));
    apuntarTrabajo(run, {
      ...t,
      estado: entregado ? "done" : "failed",
      hasta: ahora().toISOString(),
      fallo: entregado ? null : "la casa se cortó mientras trabajaba",
    });
  }
}

/**
 * Lleva la investigación de un run hasta que esté hecha, la pare una puerta, falte el adelante o se llegue al techo
 * de gasto. Si la para un asiento que ya tuvo sus vueltas, o que no entregó, se le llama al conductor, una vez por
 * run. Se puede llamar las veces que haga falta: sigue desde lo que hay en el disco. Al volver, deja el acta del run.
 */
export async function llevar(run: string, f: Fuentes, lanzador: Lanzador, o: AlLlevar = {}): Promise<Llevado> {
  try {
    return await llevarlo(run, f, lanzador, o);
  } finally {
    if (existsSync(run)) escribirActa(run);
  }
}

/** Si se puede gastar ahora: con el adelante del viajero, sabiendo lo gastado y por debajo de su techo. */
function sePuedeGastar(run: string): boolean {
  const adelante = adelanteDe(run);
  if (adelante === null) return false;
  if (adelante.techo === null) return true;
  const gastado = gastoDe(run);
  return gastado.sabido && gastado.usd < adelante.techo;
}

async function llevarlo(run: string, f: Fuentes, lanzador: Lanzador, o: AlLlevar): Promise<Llevado> {
  const ahora = o.ahora ?? ((): Date => new Date());
  const tope = o.tope ?? TOPE_DE_UN_ASIENTO;
  const lanzados: string[] = [];
  // Lo que avisa cada vuelta se junta: quien llama una vez no pierde lo que se dijo por el camino.
  const avisos: string[] = [];
  cerrarLosCortados(run, ahora);

  const lanzarUno = async (id: string): Promise<void> => {
    const puesto = puestosDe(run).find((p) => p.id === id);
    if (puesto === undefined) throw new Error(`falta el puesto ${id}`);
    const base = { puesto: id, asiento: puesto.asiento, desde: ahora().toISOString(), hasta: null, gasto: null };
    apuntarTrabajo(run, { ...base, estado: "working", fallo: null });
    const r = await lanzarAsiento(puesto, lanzador, tope);
    const entregado = existsSync(join(puesto.carpeta, "out", "delivery.json"));
    const estado = r.fueraDeTope ? "stopped" : r.error !== null || !entregado ? "failed" : "done";
    const fallo = estado === "done" ? null : (r.error ?? "acabó sin dejar su entrega");
    apuntarTrabajo(run, { ...base, estado, hasta: ahora().toISOString(), gasto: r.gasto, fallo });
  };

  for (let vuelta = 0; vuelta < VUELTAS_DE_LA_CASA; vuelta++) {
    const estado = await sigue(run, f);
    for (const aviso of estado.avisos) if (!avisos.includes(aviso)) avisos.push(aviso);
    const con = (mas: Partial<Llevado> = {}): Llevado => ({
      ...estado,
      avisos,
      sinAdelante: false,
      gasto: gastoDe(run),
      lanzados,
      ...mas,
    });
    // Un run parado por un asiento: el conductor lo mira, y si elige una vuelta más del dueño, el run vuelve a andar.
    if (estado.parado !== null && o.conductor !== false) {
      const lanzar = async (id: string): Promise<void> => {
        await lanzarUno(id);
        lanzados.push(id);
      };
      if (await conducir(run, { lanzar, puedeGastar: () => sePuedeGastar(run) })) continue;
      return con({ parado: estado.parado });
    }
    if (estado.hecho || estado.parado !== null || estado.esperan.length === 0) return con();
    const para = (paso: string, rojos: Rojo[]): Llevado =>
      con({ esperan: [], parado: pararRun(run, pasoDe(run, estado.esperan[0]), paso, rojos) });

    // Un asiento que ya trabajó y no entregó no se lanza otra vez sobre lo que dejó: se para aquí, y se dice.
    const rotos = estado.esperan.filter((id) => acaboSinEntregar(run, id));
    if (rotos.length > 0) {
      const parado = para(
        "un asiento no entregó",
        rotos.map((id) => ({
          donde: id,
          que: trabajosDe(run).find((t) => t.puesto === id)?.fallo ?? "acabó sin dejar su entrega",
        })),
      );
      // Con el run ya parado, la vuelta siguiente se lo pasa al conductor, si le toca.
      if (o.conductor !== false) continue;
      return parado;
    }

    // Nada que gaste arranca sin el botón del viajero.
    const adelante = adelanteDe(run);
    if (adelante === null) return con({ sinAdelante: true });

    // Ni por encima de lo que aceptó gastar. Si de algo no se sabe lo que costó, no se sigue a ciegas.
    const gastado = gastoDe(run);
    if (adelante.techo !== null && !gastado.sabido)
      return para("el gasto", [{ donde: "spend", que: "de un asiento no se sabe lo que gastó: no se sigue a ciegas" }]);
    if (adelante.techo !== null && gastado.usd >= adelante.techo)
      return para("el gasto", [
        {
          donde: "spend",
          que:
            `lo gastado, ${gastado.usd.toFixed(2)} USD, llegó al techo de ${adelante.techo.toFixed(2)} USD ` +
            "que aceptó el viajero",
        },
      ]);

    await porTandas(estado.esperan, o.aLaVez ?? ASIENTOS_A_LA_VEZ, lanzarUno);
    lanzados.push(...estado.esperan);
  }
  const estado = await sigue(run, f);
  for (const aviso of estado.avisos) if (!avisos.includes(aviso)) avisos.push(aviso);
  if (estado.hecho || estado.parado !== null)
    return { ...estado, avisos, sinAdelante: false, gasto: gastoDe(run), lanzados };
  const parado = pararRun(run, pasoDe(run, estado.esperan[0] ?? ""), "la casa", [
    { donde: "house", que: `la investigación no acabó en ${VUELTAS_DE_LA_CASA} vueltas de la casa` },
  ]);
  return { ...estado, avisos, esperan: [], parado, sinAdelante: false, gasto: gastoDe(run), lanzados };
}
