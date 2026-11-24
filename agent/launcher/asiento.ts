// Cómo se lanza un asiento: la casa le monta su puesto, le manda la orden que lo abre, espera hasta su tope y, al
// volver, pasa la puerta de todos. Quién piensa en el asiento se le pasa de fuera (el lanzador): así se prueba con uno
// inventado, sin gastar, y el de verdad se enchufa cuando el PM lo decida.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { puertaMetodo, type VeredictoDelMetodo } from "../gates/puerta_metodo.ts";
import { leerSello, type Puesto } from "./puesto.ts";

const ORDEN = resolve(import.meta.dirname, "..", "contracts", "common", "LAUNCH.md");

/** Lo que gasta un asiento de la clave del viajero: sus turnos, lo que leyó y escribió la IA, y lo que cuesta. */
export type Gasto = { turnos: number; entrada: number; salida: number; usd: number };

/**
 * Lo que hace trabajar al asiento: recibe la orden y vuelve cuando el asiento ha acabado, con lo que gastó si lo
 * sabe. Si falla, lanza un error, que puede llevar en `gasto` lo que gastó hasta entonces. Si se le acaba el tope,
 * la casa se lo avisa por la señal, para que corte y no siga gastando.
 */
export type Lanzador = (orden: string, puesto: Puesto, corte?: AbortSignal) => Promise<Gasto | void>;

export type Tope = { segundos: number };

export type Resultado = {
  puesto: Puesto;
  tardoMs: number;
  fueraDeTope: boolean;
  error: string | null;
  /** Lo que gastó, si el lanzador lo dijo y son números que valen; si no, null: no se sabe. */
  gasto: Gasto | null;
  metodo: VeredictoDelMetodo;
};

const cuenta = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Un gasto vale si cada número suyo es un número de verdad y no baja de cero. */
export function gastoQueVale(g: unknown): g is Gasto {
  if (typeof g !== "object" || g === null) return false;
  const x = g as Record<string, unknown>;
  return cuenta(x.turnos) && cuenta(x.entrada) && cuenta(x.salida) && cuenta(x.usd);
}

/** La orden que abre el asiento: el texto fijo del contrato común, con la carpeta de su puesto. */
export function ordenDeApertura(p: Puesto): string {
  const texto = readFileSync(ORDEN, "utf8");
  const corte = texto.indexOf("\n---\n");
  if (corte < 0) throw new Error("la orden de apertura no tiene su raya de corte");
  return texto
    .slice(corte + 5)
    .trim()
    .replaceAll("{WORKPLACE}", p.carpeta);
}

/** Recoge un asiento que ya trabajó: pasa la puerta de todos sobre su puesto. */
export function recogerAsiento(p: Puesto): VeredictoDelMetodo {
  return puertaMetodo(p.carpeta, leerSello(p));
}

export async function lanzarAsiento(p: Puesto, lanzador: Lanzador, tope: Tope): Promise<Resultado> {
  const salida = join(p.carpeta, "out");
  if (!existsSync(salida) || readdirSync(salida).length > 0)
    throw new Error(`el puesto ${p.id} ya se usó: cada puesto se lanza una sola vez`);

  const empieza = Date.now();
  let error: string | null = null;
  let fueraDeTope = false;
  let gasto: Gasto | null = null;
  let reloj: NodeJS.Timeout | undefined;
  const corte = new AbortController();
  const limite = new Promise<void>((resuelve) => {
    reloj = setTimeout(() => {
      fueraDeTope = true;
      // Al asiento se le avisa de que se acabó su tiempo: lo que gaste después ya no lo espera nadie.
      corte.abort();
      resuelve();
    }, tope.segundos * 1000);
  });
  try {
    const dicho = await Promise.race([lanzador(ordenDeApertura(p), p, corte.signal), limite]);
    if (gastoQueVale(dicho))
      gasto = { turnos: dicho.turnos, entrada: dicho.entrada, salida: dicho.salida, usd: dicho.usd };
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    // Un asiento que falla puede haber gastado antes de fallar: si el lanzador lo dice con su error, cuenta.
    const hasta = (e as { gasto?: unknown } | null)?.gasto;
    if (gastoQueVale(hasta))
      gasto = { turnos: hasta.turnos, entrada: hasta.entrada, salida: hasta.salida, usd: hasta.usd };
  } finally {
    clearTimeout(reloj);
  }
  if (fueraDeTope) error = `no acabó en su tope de ${tope.segundos} segundos`;
  return { puesto: p, tardoMs: Date.now() - empieza, fueraDeTope, error, gasto, metodo: recogerAsiento(p) };
}
