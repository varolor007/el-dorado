// Cómo se lanza un asiento: la casa le monta su puesto, le manda la orden que lo abre, espera hasta su tope y, al
// volver, pasa la puerta de todos. Quién piensa en el asiento se le pasa de fuera (el lanzador): así se prueba con uno
// inventado, sin gastar, y el de verdad se enchufa cuando el PM lo decida.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { puertaMetodo, type VeredictoDelMetodo } from "../gates/puerta_metodo.ts";
import { leerSello, type Puesto } from "./puesto.ts";

const ORDEN = resolve(import.meta.dirname, "..", "contracts", "common", "LAUNCH.md");

/** Lo que hace trabajar al asiento: recibe la orden y vuelve cuando el asiento ha acabado. */
export type Lanzador = (orden: string, puesto: Puesto) => Promise<void>;

export type Tope = { segundos: number };

export type Resultado = {
  puesto: Puesto;
  tardoMs: number;
  fueraDeTope: boolean;
  error: string | null;
  metodo: VeredictoDelMetodo;
};

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
  let reloj: NodeJS.Timeout | undefined;
  const limite = new Promise<void>((resuelve) => {
    reloj = setTimeout(() => {
      fueraDeTope = true;
      resuelve();
    }, tope.segundos * 1000);
  });
  try {
    await Promise.race([lanzador(ordenDeApertura(p), p), limite]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(reloj);
  }
  if (fueraDeTope) error = `no acabó en su tope de ${tope.segundos} segundos`;
  return { puesto: p, tardoMs: Date.now() - empieza, fueraDeTope, error, metodo: recogerAsiento(p) };
}
