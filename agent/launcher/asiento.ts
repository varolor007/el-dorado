// Cómo se lanza un asiento: la casa le monta su puesto, le manda la orden que lo abre, espera hasta su tope y, al
// volver, pasa la puerta de todos. Quién piensa en el asiento se le pasa de fuera (el lanzador): así se prueba con uno
// inventado, sin gastar, y el de verdad se enchufa cuando el PM lo decida.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { puertaMetodo, type VeredictoDelMetodo } from "../gates/puerta_metodo.ts";
import { abiertas, intentadas, leerConsultadoEnSusVueltas } from "./consultado.ts";
import { leerSello, type Puesto } from "./puesto.ts";

const ORDEN = resolve(import.meta.dirname, "..", "contracts", "common", "LAUNCH.md");

/**
 * Lo que gasta un asiento de la clave del viajero: sus turnos, lo que leyó y escribió la IA, y lo que cuesta. Si es
 * de un asiento cortado (`cortado`), es lo que se contó hasta el corte: lo de la vuelta que estaba en marcha puede
 * no estar dentro (14.7).
 */
export type Gasto = { turnos: number; entrada: number; salida: number; usd: number; cortado?: true };

/**
 * Lo que hace trabajar al asiento: recibe la orden y vuelve cuando el asiento ha acabado, con lo que gastó si lo
 * sabe. Si falla, lanza un error, que puede llevar en `gasto` lo que gastó hasta entonces. Si se le acaba el tope,
 * la casa se lo avisa por la señal, para que corte y no siga gastando.
 */
export type Lanzador = (orden: string, puesto: Puesto, corte?: AbortSignal) => Promise<Gasto | void>;

/**
 * El tope de un asiento, y lo que se le deja, después de cortarlo, para acabar de cerrar y decir lo que gastó: unos
 * segundos (`gracia`), y no más. Lo que diga después ya no se espera.
 */
export type Tope = { segundos: number; gracia?: number };

/** Lo que se espera a un asiento cortado para que diga lo que gastó, si su tope no dice otra cosa (14.7). */
export const GRACIA_AL_CORTAR = { segundos: 8 };

/**
 * El error con el que acaba un lanzador cortado (por tiempo, por el aviso de la casa o por pasar de su tope de
 * internet): lleva lo gastado hasta el corte, marcado como de un asiento cortado, y, si se puede acotar, lo más que
 * pudo quedar sin contar (`cota`, en dólares). Sin gasto que valga, es un error como cualquiera.
 */
export function errorDeUnCortado(mensaje: string, gasto: Gasto | null, cota: number | null): Error {
  if (gasto === null || !gastoQueVale(gasto)) return new Error(mensaje);
  const vale = typeof cota === "number" && Number.isFinite(cota) && cota >= 0;
  return Object.assign(new Error(mensaje), { gasto: { ...gasto, cortado: true as const }, cota: vale ? cota : null });
}

export type Resultado = {
  puesto: Puesto;
  tardoMs: number;
  fueraDeTope: boolean;
  error: string | null;
  /** Lo que gastó, si el lanzador lo dijo y son números que valen; si no, null: no se sabe. */
  gasto: Gasto | null;
  /** De un asiento cortado: lo más que pudo quedar sin contar, en dólares, si el lanzador lo dijo; si no, null. */
  cota: number | null;
  metodo: VeredictoDelMetodo;
};

const cuenta = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Un gasto vale si cada número suyo es un número de verdad y no baja de cero. */
export function gastoQueVale(g: unknown): g is Gasto {
  if (typeof g !== "object" || g === null) return false;
  const x = g as Record<string, unknown>;
  return cuenta(x.turnos) && cuenta(x.entrada) && cuenta(x.salida) && cuenta(x.usd);
}

/**
 * La orden que abre un asiento: el texto fijo del contrato común, que va entre su contrato y su material. Es la
 * misma para todos: de qué puesto es lo dice lo que la acompaña.
 */
export function ordenDeApertura(): string {
  const texto = readFileSync(ORDEN, "utf8");
  const corte = texto.indexOf("\n---\n");
  if (corte < 0) throw new Error("la orden de apertura no tiene su raya de corte");
  return texto.slice(corte + 5).trim();
}

/**
 * Recoge un asiento que ya trabajó: pasa la puerta de todos sobre su puesto, con las páginas que abrió de verdad y
 * las que intentó abrir sin conseguirlo, de la memoria de lo consultado que guardó la casa en el run.
 */
export function recogerAsiento(p: Puesto): VeredictoDelMetodo {
  // Con lo que abrió en sus vueltas de antes: corregir una entrega no obliga a abrir otra vez la misma página.
  const consultado = leerConsultadoEnSusVueltas(p);
  return puertaMetodo(p.carpeta, leerSello(p), abiertas(consultado), intentadas(consultado));
}

/** El gasto que dice un lanzador, si vale: con su marca de cortado, si la lleva, y sin nada más. */
function gastoDicho(g: unknown): Gasto | null {
  if (!gastoQueVale(g)) return null;
  const limpio: Gasto = { turnos: g.turnos, entrada: g.entrada, salida: g.salida, usd: g.usd };
  return g.cortado === true ? { ...limpio, cortado: true } : limpio;
}

/** Lo que lleva colgado el error de un lanzador: su gasto y, si es de un cortado, su cota. */
function deSuError(e: unknown): { gasto: Gasto | null; cota: number | null } {
  const x = (typeof e === "object" && e !== null ? e : {}) as { gasto?: unknown; cota?: unknown };
  const gasto = gastoDicho(x.gasto);
  const cota = x.cota;
  const vale = gasto?.cortado === true && typeof cota === "number" && Number.isFinite(cota) && cota >= 0;
  return { gasto, cota: vale ? cota : null };
}

export async function lanzarAsiento(p: Puesto, lanzador: Lanzador, tope: Tope): Promise<Resultado> {
  const salida = join(p.carpeta, "out");
  if (!existsSync(salida) || readdirSync(salida).length > 0)
    throw new Error(`el puesto ${p.id} ya se usó: cada puesto se lanza una sola vez`);

  const empieza = Date.now();
  let error: string | null = null;
  let fueraDeTope = false;
  let gasto: Gasto | null = null;
  let cota: number | null = null;
  let reloj: NodeJS.Timeout | undefined;
  const corte = new AbortController();
  const limite = new Promise<"tope">((resuelve) => {
    reloj = setTimeout(() => {
      fueraDeTope = true;
      // Al asiento se le avisa de que se acabó su tiempo: lo que gaste después ya no lo espera nadie.
      corte.abort();
      resuelve("tope");
    }, tope.segundos * 1000);
  });
  // Lo que hace el lanzador, dicho siempre como un valor: así se le puede seguir esperando después del corte.
  type Acabado = { bien: true; dicho: Gasto | void } | { bien: false; e: unknown };
  const marcha: Promise<Acabado> = (async () => lanzador(ordenDeApertura(), p, corte.signal))().then(
    (dicho) => ({ bien: true, dicho }),
    (e: unknown) => ({ bien: false, e }),
  );
  try {
    let acabo = await Promise.race([marcha, limite]);
    if (acabo === "tope") {
      // Cortado: se le deja un poco para cerrar y decir lo que gastó hasta ahí (14.7), con su tope, y no más.
      let espera: NodeJS.Timeout | undefined;
      const gracia = new Promise<"tope">((resuelve) => {
        espera = setTimeout(() => resuelve("tope"), (tope.gracia ?? GRACIA_AL_CORTAR.segundos) * 1000);
      });
      acabo = await Promise.race([marcha, gracia]);
      clearTimeout(espera);
    }
    if (acabo !== "tope" && !fueraDeTope) {
      if (acabo.bien) gasto = gastoDicho(acabo.dicho);
      else {
        const e = acabo.e;
        error = e instanceof Error ? e.message : String(e);
        // Un asiento que falla puede haber gastado antes de fallar: si el lanzador lo dice con su error, cuenta.
        ({ gasto, cota } = deSuError(e));
      }
    } else if (acabo !== "tope" && !acabo.bien) {
      // Tras el corte solo vale lo que el lanzador diga como gasto de un cortado: lo contado hasta el corte. Un
      // lanzador que vuelve como si hubiera acabado no dice qué quedó fuera, y no se le cree.
      const dicho = deSuError(acabo.e);
      if (dicho.gasto?.cortado === true) ({ gasto, cota } = dicho);
    }
  } finally {
    clearTimeout(reloj);
  }
  if (fueraDeTope) error = `no acabó en su tope de ${tope.segundos} segundos`;
  return { puesto: p, tardoMs: Date.now() - empieza, fueraDeTope, error, gasto, cota, metodo: recogerAsiento(p) };
}
