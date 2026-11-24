// Una investigación entera, de una vez y con la IA de verdad, desde la terminal: la casa la lleva sola, lanzando cada
// asiento con una llamada, y para si llega al techo de gasto, si se le da uno. Es la orden de las pruebas de verdad.
// Gasta de la cuenta o de la clave que se le dé: lanzarla es siempre una decisión del PM.
//
// Con la cuenta de Claude de la casa, por Claude Code (lo que cuesta lo dice él):
//   ELDORADO_TOKEN_DE_CLAUDE=<el token> ELDORADO_MODELO=<el modelo> \
//     node agent/launcher/de_verdad.ts <entendido.json> [techo en dólares]
// Con una clave de API, por la llamada directa (hace falta su precio, en dólares por millón):
//   ELDORADO_CLAVE_DE_CLAUDE=<la clave> ELDORADO_MODELO=<el modelo> ELDORADO_PRECIO_ENTRADA=<n> \
//     ELDORADO_PRECIO_SALIDA=<n> node agent/launcher/de_verdad.ts <entendido.json> [techo en dólares]
//
// Para seguir una que se cortó a medias, con lo mismo delante: de_verdad.ts sigue <carpeta del run> [techo].
// Detrás de un proxy, con NODE_USE_ENV_PROXY=1. Ni el token ni la clave se escriben ni salen en lo que imprime.

import { join, resolve } from "node:path";
import type { Suceso } from "../output/viaje.ts";
import type { Lanzador } from "./asiento.ts";
import { darElAdelante, llevar, type Llevado } from "./casa.ts";
import { claveQueVale } from "./cuentas.ts";
import { lanzadorDirecto, precioDe } from "./ia.ts";
import { pensarConClaudeCode, TOKEN_DE_LA_CASA } from "./ia_de_claude_code.ts";
import { claveQueFunciona, conQueDe, pensarConClaude } from "./ia_de_verdad.ts";
import { empezar, type Fuentes } from "./investigar.ts";
import { trabajosDe } from "./trabajos.ts";
import { leerVivo } from "./vivo.ts";

export type DeVerdad = { run: string; llevado: Llevado; segundos: number };

/**
 * Lleva una investigación de punta a punta con el adelante y el techo que se le dan, y cuenta lo que pasa mientras
 * pasa. Con `entendido` abre un viaje nuevo; con `run`, sigue uno que ya está abierto.
 */
export async function investigarDeVerdad(o: {
  entendido?: string;
  run?: string;
  /** El techo de gasto, en dólares; null, sin techo. */
  techo: number | null;
  fuentes: Fuentes;
  lanzador: Lanzador;
  ahora?: () => Date;
  alContar?: (s: Suceso) => void;
  cadaMs?: number;
}): Promise<DeVerdad> {
  const ahora = o.ahora ?? ((): Date => new Date());
  if (o.run === undefined && o.entendido === undefined) throw new Error("falta lo entendido o la carpeta del run");
  const run = o.run ?? empezar(o.entendido as string, ahora());
  // El adelante, con su techo si lo hay: sin adelante la casa no lanza ningún asiento.
  darElAdelante(run, o.techo, ahora());
  let contados = 0;
  const cuenta = (): void => {
    const nuevos = leerVivo(run, contados);
    contados += nuevos.length;
    for (const s of nuevos) o.alContar?.(s);
  };
  const empieza = Date.now();
  const reloj = setInterval(cuenta, o.cadaMs ?? 2000);
  try {
    const llevado = await llevar(run, o.fuentes, o.lanzador, { ahora });
    return { run, llevado, segundos: Math.round((Date.now() - empieza) / 1000) };
  } finally {
    clearInterval(reloj);
    cuenta();
  }
}

export type QuienPiensa = {
  lanzador: Lanzador;
  /** Con la cuenta de Claude de la casa, o con una clave de API. */
  con: "cuenta" | "clave";
  /** Si lo que se le dio sirve, preguntado sin gastar. Con la cuenta no hay cómo: se ve en la primera llamada. */
  comprueba: (() => Promise<boolean>) | null;
};

/**
 * Quién piensa, según el entorno: la cuenta de Claude de la casa, por Claude Code, si está su token; si no, una clave
 * de API, con la llamada directa y su precio. El modelo lo dice siempre el entorno.
 */
export function quienPiensa(entorno: Record<string, string | undefined>): QuienPiensa {
  const con = conQueDe(entorno);
  if (con === null) throw new Error("falta decir en el entorno con qué modelo se piensa (ELDORADO_MODELO)");
  const token = (entorno[TOKEN_DE_LA_CASA] ?? "").trim();
  if (token !== "") {
    const binario = (entorno.ELDORADO_CLAUDE ?? "").trim() || "claude";
    const pensar = pensarConClaudeCode({ con, token, binario, entorno });
    return { lanzador: lanzadorDirecto(pensar, null), con: "cuenta", comprueba: null };
  }
  const clave = (entorno.ELDORADO_CLAVE_DE_CLAUDE ?? "").trim();
  if (!claveQueVale(clave))
    throw new Error(`falta con qué pensar: ${TOKEN_DE_LA_CASA} (la cuenta de Claude) o ELDORADO_CLAVE_DE_CLAUDE`);
  const precio = precioDe(entorno);
  return {
    lanzador: lanzadorDirecto(pensarConClaude(clave, con), precio),
    con: "clave",
    comprueba: () => claveQueFunciona(clave, con),
  };
}

/** Lo que pasó, en unas líneas: cómo acabó, lo que tardó, lo que gastó y cada trabajo de la IA con lo suyo. */
export function resumenDe(r: DeVerdad): string[] {
  const { llevado, run } = r;
  const dolares = (usd: number): string => `${usd.toFixed(2)} USD`;
  const lineas: string[] = [];
  if (llevado.hecho) lineas.push(`Hecho. El viaje, en ${join(run, "viaje.json")}`);
  else if (llevado.parado !== null) {
    lineas.push(`Parado en ${llevado.parado.paso}:`);
    for (const rojo of llevado.parado.rojos) lineas.push(`  ${rojo.donde}: ${rojo.que}`);
  } else if (llevado.sinAdelante) lineas.push("Sin adelante: no se lanzó ningún asiento.");
  else lineas.push(`Sin acabar. Esperan: ${llevado.esperan.join(", ") || "nadie"}`);
  for (const aviso of llevado.avisos) lineas.push(`Aviso: ${aviso}`);
  const g = llevado.gasto;
  const gastado = `${dolares(g.usd)}${g.sabido ? "" : " o más: de algún trabajo no se sabe"}`;
  lineas.push(
    `Tardó ${Math.floor(r.segundos / 60)} min ${r.segundos % 60} s. Gastó ${gastado}, ` +
      `en ${g.turnos} llamadas (${g.entrada} de entrada y ${g.salida} de salida).`,
  );
  for (const t of trabajosDe(run)) {
    const segundos =
      t.desde !== null && t.hasta !== null ? Math.round((Date.parse(t.hasta) - Date.parse(t.desde)) / 1000) : null;
    const gasto = t.gasto === null ? "gasto sin saber" : dolares(t.gasto.usd);
    lineas.push(
      `  ${t.puesto} (${t.asiento}): ${t.estado}, ${segundos ?? "?"} s, ${gasto}${t.fallo ? `, ${t.fallo}` : ""}`,
    );
  }
  lineas.push(`El run, en ${run}`);
  return lineas;
}

async function principal(): Promise<number> {
  const args = process.argv.slice(2);
  const sigue = args[0] === "sigue";
  const [donde, techoDicho] = sigue ? args.slice(1) : args;
  const techo = techoDicho === undefined ? null : Number(techoDicho);
  if (donde === undefined || (techo !== null && !(Number.isFinite(techo) && techo > 0))) {
    console.error("Uso: de_verdad.ts <entendido.json> [techo en dólares], o de_verdad.ts sigue <run> [techo]");
    return 2;
  }
  const { fuentesDeVerdad } = await import("./fuentes_de_verdad.ts");
  const quien = quienPiensa(process.env);
  // Antes de abrir nada, se mira que la clave sirve para ese modelo: preguntarlo no gasta.
  if (quien.comprueba !== null && !(await quien.comprueba()))
    throw new Error("la IA no admite esa clave, o no tiene ese modelo");
  const conQue = quien.con === "cuenta" ? "la cuenta de Claude de la casa" : "una clave";
  console.log(
    `Con ${conQue}${techo === null ? ", sin techo de gasto" : ` y un techo de ${techo.toFixed(2)} USD`}. Empieza.`,
  );
  const hecho = await investigarDeVerdad({
    ...(sigue ? { run: resolve(donde) } : { entendido: donde }),
    techo,
    fuentes: fuentesDeVerdad(),
    lanzador: quien.lanzador,
    alContar: (s) => {
      const que = [s.clase, s.n ?? "", s.nombre ?? s.ref ?? ""].filter((x) => x !== "").join(" ");
      console.log(`  ${(s.t / 1000).toFixed(0).padStart(5)} s  ${que}`);
    },
  });
  for (const linea of resumenDe(hecho)) console.log(linea);
  return hecho.llevado.hecho ? 0 : 1;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(2);
    },
  );
}
