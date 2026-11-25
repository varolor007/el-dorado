// La casa lleva una investigación sola: da los pasos de código, lanza cada asiento que espera, lo recoge y sigue,
// hasta que el viaje está hecho o algo la para. Quién piensa en cada asiento se le pasa de fuera: con uno inventado
// se prueba sin gastar, y el de verdad se enchufa con su punto del plan. Este archivo no llama a ninguna IA.
//
// Dos cosas no pasan nunca: ningún asiento se lanza sin el adelante del viajero, que es su botón; y ninguno se lanza
// cuando lo gastado ya llegó al techo que aceptó con él.
//
// Lo que corre por detrás (el del calendario) se lanza sin esperarlo: la casa sigue con lo demás, y cuando acaba,
// da los pasos que pueda con lo que dejó. Solo se le espera cuando hace falta lo suyo. Mientras trabaja, su puesto
// está en marcha en esta casa, y nadie lo vuelve a lanzar ni lo da por cortado.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAPAS_DE_IA } from "../data/capas.ts";
import { ASIENTOS_A_LA_VEZ, PASOS, TOPE_DE_UN_ASIENTO, topeDe, VUELTAS_DE_LA_CASA } from "../data/pasos.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { escribirActa } from "./acta.ts";
import { lanzarAsiento, type Gasto, type Lanzador, type Tope } from "./asiento.ts";
import { conducir } from "./conductor.ts";
import { pararRun, sigue, type Estado, type Fuentes } from "./investigar.ts";
import { guardarJson } from "./mesa.ts";
import { porDondeVa } from "./pasos.ts";
import { puestosDe } from "./puesto.ts";
import { aplicarReintento } from "./reintentar.ts";
import { acaboSinEntregar, apuntarTrabajo, gastoDe, gastoParaElTecho, trabajosDe, type EnMarcha } from "./trabajos.ts";

export const ADELANTE = "adelante.json";

/** Los asientos que trabajan por detrás en esta casa, por su run y su puesto. */
const deFondo = new Map<string, Promise<void>>();
const claveDe = (run: string, puesto: string): string => `${resolve(run)}|${puesto}`;

/** Los pasos de un run se dan de uno en uno: dos a la vez sobre la misma carpeta se pisarían. */
const turnos = new Map<string, Promise<unknown>>();
function enSuTurno<T>(run: string, hacer: () => Promise<T>): Promise<T> {
  const clave = resolve(run);
  const ahora = (turnos.get(clave) ?? Promise.resolve()).then(hacer, hacer);
  const hecho = ahora.catch(() => undefined);
  turnos.set(clave, hecho);
  void hecho.then(() => {
    if (turnos.get(clave) === hecho) turnos.delete(clave);
  });
  return ahora;
}

/** Espera a todo lo que trabaja por detrás en un run, y a lo que lancen al acabar: para cerrarlo, o para probarlo. */
export async function esperarLoDeDetras(run: string): Promise<void> {
  const suyo = `${resolve(run)}|`;
  for (;;) {
    const vivos = [...deFondo].filter(([clave]) => clave.startsWith(suyo)).map(([, p]) => p);
    if (vivos.length === 0) return;
    await Promise.all(vivos);
  }
}

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
  gasto: Gasto & { sabido: boolean; deCortados: number };
  /** Los puestos que se lanzaron en esta llamada, en su orden. */
  lanzados: string[];
};

export type AlLlevar = {
  tope?: Tope;
  aLaVez?: number;
  ahora?: () => Date;
  /** Sin conductor (false), un run parado por un asiento se queda parado sin que nadie lo mire. */
  conductor?: boolean;
  /**
   * Lo más que puede gastar una llamada de una capa del destino, en dólares, por su asiento; null si no se sabe
   * acotar (14.7). Es para la capa que se corta sin que su lanzador diga nada de lo que gastó: con ella se da por
   * perdida y la investigación sigue, contando para el techo esa cota. Sin ella, como cualquier asiento: con techo,
   * no se sigue a ciegas. La que se corta y dice lo gastado hasta ahí no la usa: usa la cota que dice su lanzador.
   */
  cota?: (asiento: string) => number | null;
};

const CON_LA_COTA = " contando lo más que pudo gastar lo que se cortó";

/** Los asientos de las capas del destino: son opcionales, y el viaje sale sin ellas si faltan (14.1). */
const ASIENTOS_DE_LAS_CAPAS = new Set(
  PASOS.filter((p) => (CAPAS_DE_IA as readonly string[]).includes(p.id)).map((p) => p.quien),
);

/** La cota de una capa que acabó sin decir lo que gastó, si vale; si no, null. */
function cotaDe(asiento: string, cota: AlLlevar["cota"]): number | null {
  if (!ASIENTOS_DE_LAS_CAPAS.has(asiento) || cota === undefined) return null;
  const n = cota(asiento);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * La cota de un trabajo de una capa del destino, acabe como acabe (entregando, fallando, cortado o cerrado por la
 * casa): si es de un cortado que dijo lo gastado hasta ahí, lo que pudo quedar fuera, que dice su lanzador; si no dijo
 * nada de lo que gastó, lo más que pudo gastar, si se sabe acotar (14.7). Un asiento que no es una capa no lleva
 * cota: sin saber todo lo que gastó, con techo no se sigue a ciegas, como siempre.
 */
function cotaDelTrabajo(asiento: string, gasto: Gasto | null, delLanzador: number | null, o: AlLlevar): number | null {
  if (!ASIENTOS_DE_LAS_CAPAS.has(asiento)) return null;
  if (gasto?.cortado === true) return delLanzador;
  return gasto === null ? cotaDe(asiento, o.cota) : null;
}

/**
 * Lo que trabaja ahora en esta casa, por run y por puesto (14.7): lo que su lanzador dice que lleva gastado, para
 * mirar el techo también con lo que está en marcha, y cómo cortarlo si es una capa y se llega al techo.
 */
type Vivo = EnMarcha & { capa: boolean; corte: AbortController; dicho: boolean };
const vivos = new Map<string, Map<string, Vivo>>();
const vivosDe = (run: string): Map<string, Vivo> => {
  const clave = resolve(run);
  let m = vivos.get(clave);
  if (m === undefined) vivos.set(clave, (m = new Map()));
  return m;
};
/** Lo que llevan dicho los que trabajan en un run, para el techo. */
function enMarchaDe(run: string): Map<string, EnMarcha> {
  return new Map([...vivosDe(run)].filter(([, v]) => v.dicho).map(([id, v]) => [id, { usd: v.usd, cota: v.cota }]));
}

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
function cerrarLosCortados(run: string, ahora: () => Date, o: AlLlevar): void {
  const puestos = puestosDe(run);
  for (const t of trabajosDe(run)) {
    if (t.estado !== "queued" && t.estado !== "working") continue;
    // Lo que trabaja por detrás en esta casa no está cortado: sigue.
    if (deFondo.has(claveDe(run, t.puesto))) continue;
    const puesto = puestos.find((p) => p.id === t.puesto);
    const entregado = puesto !== undefined && existsSync(join(puesto.carpeta, "out", "delivery.json"));
    // Con la misma regla que lo que acaba en esta casa: una capa así cuenta su cota, si la hay (14.7).
    const cota = t.cota ?? cotaDelTrabajo(t.asiento, t.gasto, null, o);
    apuntarTrabajo(run, {
      ...t,
      estado: entregado ? "done" : "failed",
      hasta: ahora().toISOString(),
      fallo: entregado ? null : "la casa se cortó mientras trabajaba",
      ...(cota === null ? {} : { cota }),
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

async function llevarlo(run: string, f: Fuentes, lanzador: Lanzador, o: AlLlevar): Promise<Llevado> {
  const ahora = o.ahora ?? ((): Date => new Date());
  const tope = o.tope ?? TOPE_DE_UN_ASIENTO;
  const lanzados: string[] = [];
  // Lo que avisa cada vuelta se junta: quien llama una vez no pierde lo que se dijo por el camino.
  const avisos: string[] = [];
  cerrarLosCortados(run, ahora, o);
  // Si el viajero pidió otra vuelta del paso que paró el run, es ahora cuando se quita la parada y se sigue.
  aplicarReintento(run);

  const lanzarUno = async (id: string): Promise<void> => {
    const puesto = puestosDe(run).find((p) => p.id === id);
    if (puesto === undefined) throw new Error(`falta el puesto ${id}`);
    const base = { puesto: id, asiento: puesto.asiento, desde: ahora().toISOString(), hasta: null, gasto: null };
    apuntarTrabajo(run, { ...base, estado: "working", fallo: null });
    // Mientras trabaja, lo que su lanzador dice que lleva cuenta para el techo; si con ello se llega, las capas que
    // sigan trabajando se cortan: son opcionales, y el viaje sale sin ellas (14.7).
    const capa = ASIENTOS_DE_LAS_CAPAS.has(puesto.asiento);
    const vivo: Vivo = { usd: 0, cota: null, capa, corte: new AbortController(), dicho: false };
    vivosDe(run).set(id, vivo);
    const alContar = (g: Gasto, c: number | null): void => {
      Object.assign(vivo, { usd: g.usd, cota: c, dicho: true });
      const techo = adelanteDe(run)?.techo ?? null;
      const contado = techo === null ? null : gastoParaElTecho(run, enMarchaDe(run));
      if (techo === null || contado === null || contado < techo) return;
      for (const v of vivosDe(run).values()) if (v.capa) v.corte.abort();
    };
    let r: Awaited<ReturnType<typeof lanzarAsiento>>;
    try {
      // Cada asiento, con su tope: el de las entradas lleva uno más corto, porque los días lo esperan (14.4).
      r = await lanzarAsiento(puesto, lanzador, topeDe(puesto.asiento, tope), { corte: vivo.corte.signal, alContar });
    } finally {
      vivosDe(run).delete(id);
      if (vivosDe(run).size === 0) vivos.delete(resolve(run));
    }
    const entregado = existsSync(join(puesto.carpeta, "out", "delivery.json"));
    const cortado = r.fueraDeTope || r.cortadoDeFuera;
    const estado = cortado ? "stopped" : r.error !== null || !entregado ? "failed" : "done";
    const fallo = estado === "done" ? null : (r.error ?? "acabó sin dejar su entrega");
    // Una capa cuenta para el techo su cota, acabe como acabe (14.7).
    const cota = cotaDelTrabajo(puesto.asiento, r.gasto, r.cota, o);
    apuntarTrabajo(run, {
      ...base,
      estado,
      hasta: ahora().toISOString(),
      gasto: r.gasto,
      fallo,
      ...(cota === null ? {} : { cota }),
    });
  };

  /** Si se puede gastar: con el adelante del viajero y sin pasar de su techo, ni seguir a ciegas. */
  const sePuedeGastar = (): boolean => {
    const adelante = adelanteDe(run);
    if (adelante === null) return false;
    const contado = gastoParaElTecho(run, enMarchaDe(run));
    return adelante.techo === null || (contado !== null && contado < adelante.techo);
  };

  /**
   * Lanza sin esperarlo lo que corre por detrás, si se puede gastar y nadie lo ha lanzado ya. Al acabar, se dan los
   * pasos que se puedan con lo que dejó, y se lanza lo que haya salido de ello por detrás (otra vuelta, si volvió).
   */
  const lanzarPorDetras = (ids: string[]): void => {
    for (const id of ids) {
      const clave = claveDe(run, id);
      if (deFondo.has(clave) || trabajosDe(run).some((t) => t.puesto === id) || !sePuedeGastar()) continue;
      lanzados.push(id);
      const alAcabar = async (): Promise<void> => {
        try {
          const despues = await enSuTurno(run, () => sigue(run, f));
          if (despues.parado === null) lanzarPorDetras(despues.porDetras ?? []);
        } catch {
          // Si un paso se rompe aquí, se romperá igual en la próxima vuelta de la casa, que lo dice y para.
        }
      };
      const marcha = lanzarUno(id)
        .catch(() => undefined)
        .then(alAcabar)
        .finally(() => deFondo.delete(clave));
      deFondo.set(clave, marcha);
    }
  };

  for (let vuelta = 0; vuelta < VUELTAS_DE_LA_CASA; vuelta++) {
    const estado = await enSuTurno(run, () => sigue(run, f));
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
      if (await conducir(run, { lanzar, puedeGastar: sePuedeGastar })) continue;
      return con({ parado: estado.parado });
    }
    if (estado.hecho || estado.parado !== null) return con();
    // Sin nadie a quien esperar (es el turno del viajero), lo de detrás sigue trabajando mientras tanto.
    if (estado.esperan.length === 0) {
      lanzarPorDetras(estado.porDetras ?? []);
      return con();
    }
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

    // Ni por encima de lo que aceptó gastar. Si de algo no se sabe lo que costó, no se sigue a ciegas; de una capa
    // del destino cortada, se cuenta lo más que pudo gastar (14.7).
    const contado = gastoParaElTecho(run, enMarchaDe(run));
    if (adelante.techo !== null && contado === null)
      return para("el gasto", [{ donde: "spend", que: "de un asiento no se sabe lo que gastó: no se sigue a ciegas" }]);
    if (adelante.techo !== null && contado !== null && contado >= adelante.techo)
      return para("el gasto", [
        {
          donde: "spend",
          que:
            `lo gastado, ${contado.toFixed(2)} USD${contado > gastoDe(run).usd ? CON_LA_COTA : ""}, ` +
            `llegó al techo de ${adelante.techo.toFixed(2)} USD que aceptó el viajero`,
        },
      ]);

    lanzarPorDetras(estado.porDetras ?? []);
    // Lo que ya trabaja por detrás no se vuelve a lanzar: ahora que hace falta, se le espera.
    const nuevos = estado.esperan.filter((id) => !deFondo.has(claveDe(run, id)));
    await porTandas(
      estado.esperan,
      o.aLaVez ?? ASIENTOS_A_LA_VEZ,
      (id) => deFondo.get(claveDe(run, id)) ?? lanzarUno(id),
    );
    lanzados.push(...nuevos);
  }
  const estado = await enSuTurno(run, () => sigue(run, f));
  for (const aviso of estado.avisos) if (!avisos.includes(aviso)) avisos.push(aviso);
  if (estado.hecho || estado.parado !== null)
    return { ...estado, avisos, sinAdelante: false, gasto: gastoDe(run), lanzados };
  const parado = pararRun(run, pasoDe(run, estado.esperan[0] ?? ""), "la casa", [
    { donde: "house", que: `la investigación no acabó en ${VUELTAS_DE_LA_CASA} vueltas de la casa` },
  ]);
  return { ...estado, avisos, esperan: [], parado, sinAdelante: false, gasto: gastoDe(run), lanzados };
}
