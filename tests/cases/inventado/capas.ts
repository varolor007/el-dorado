// Las capas del destino en el caso inventado (bloque 14): dónde están sus contratos para las pruebas, lo que dicen
// los datos abiertos de los sitios inventados, y qué entrega cada asiento de mentira. Lo de cada capa va en su
// archivo (`moverse.ts`, `destino.ts`, `entradas.ts`), para que cada sesión afine el suyo sin tocar los de las otras.

import { existsSync, mkdtempSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CONTRATOS } from "../../../agent/launcher/capas.ts";
import type { DatosAbiertos } from "../../../agent/scripts/capa_entradas.ts";
import type { Sitio } from "../../../agent/tools/sitios.ts";

/** Los asientos de las tres capas, por el nombre de su contrato. */
export const ASIENTOS_DE_LAS_CAPAS = ["getting-around", "local-knowledge", "tickets"] as const;

/** Los contratos de prueba de las capas, para mientras no estén los de verdad. */
const DE_PRUEBA = resolve(import.meta.dirname, "contratos");

const hechas = new Map<string, string>();

/**
 * Una carpeta de contratos para las pruebas: la de verdad, asiento a asiento, y de las capas, el contrato de verdad si
 * ya está y, si no, el de prueba. Con `sin`, esas capas se quedan sin contrato, para ver que no se lanzan.
 */
export function contratosDePrueba(sin: readonly string[] = []): string {
  const clave = [...sin].sort().join(",");
  const ya = hechas.get(clave);
  if (ya !== undefined) return ya;
  const carpeta = mkdtempSync(join(tmpdir(), "el-dorado-contratos-"));
  for (const nombre of readdirSync(CONTRATOS))
    if (!sin.includes(nombre)) symlinkSync(join(CONTRATOS, nombre), join(carpeta, nombre));
  for (const asiento of ASIENTOS_DE_LAS_CAPAS)
    if (!sin.includes(asiento) && !existsSync(join(carpeta, asiento)))
      symlinkSync(join(DE_PRUEBA, asiento), join(carpeta, asiento));
  hechas.set(clave, carpeta);
  return carpeta;
}

/** Los contratos sin ninguna de las tres capas: como hoy en el repositorio, mientras sus sesiones las construyen. */
export const contratosSinCapas = (): string => contratosDePrueba(ASIENTOS_DE_LAS_CAPAS);

/** La página inventada de un sitio, que dan los datos abiertos. */
export const WEB_DE_UN_SITIO = (id: string): string => `https://sitios.inventado.example/${id.toLowerCase()}`;

/**
 * Lo que dirían los datos abiertos de cada sitio inventado: el primero abre de martes a domingo y se paga; los demás
 * no dicen su horario. Cada uno, con su web.
 */
export function abiertosInventados(): (sitios: Sitio[]) => Promise<DatosAbiertos[]> {
  return async (sitios) =>
    sitios.map((s, i) => ({
      sitio: s.id,
      horario: i === 0 ? "Tu-Su 09:00-18:00" : null,
      dePago: i === 0 ? true : null,
      web: WEB_DE_UN_SITIO(s.id),
      fuentes: [{ url: `https://datos.inventado.example/${s.id}`, visto: "2026-11-20" }],
    }));
}
