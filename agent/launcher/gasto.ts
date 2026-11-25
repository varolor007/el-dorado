// Lo que ha gastado de IA cada viaje de una cuenta, sumando sus investigaciones, sus cierres y sus guías, y lo que va
// a gastar la siguiente investigación. Sin IA: sale de lo que apuntó cada trabajo (`trabajos.json` de cada run, de
// cada cierre y de cada guía). Del disco se lee lo justo: la
// ficha de cada viaje, los trabajos de cada run y, solo de los viajes que han gastado algo, a dónde van.
//
// Lo que va a gastar lo siguiente no se inventa: es lo que costó de media una investigación entera de esa misma
// cuenta. Entera es la que acabó en el mapa (dejó su versión) y de la que se sabe todo lo que gastó. Si la cuenta no
// tiene ninguna, no se dice una cifra.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { REHECHO } from "../data/momentos.ts";
import { viajesDe, type ViajeEnLaMesa } from "./mesa.ts";
import { gastoDe, trabajosDe } from "./trabajos.ts";

export type GastoDeUnViaje = {
  id: string;
  destino: string | null;
  entrada: string | null;
  salida: string | null;
  usd: number;
  /** Las llamadas a la IA: cada trabajo que se lanzó, acabara como acabara. */
  llamadas: number;
  /** Falso si de algún trabajo acabado no se sabe lo que gastó: entonces lo de arriba se queda corto. */
  sabido: boolean;
  /** Cuándo fue la última llamada, o null si no ha habido ninguna. */
  ultima: string | null;
  investigaciones: number;
};

export type GastoDeLaCuenta = {
  /** Los viajes que han tenido alguna investigación, del de la última llamada al de la primera. */
  viajes: GastoDeUnViaje[];
  total: { usd: number; llamadas: number; sabido: boolean };
  /** Lo que costó de media una investigación entera de esta cuenta, y de cuántas sale; null si no hay ninguna. */
  siguiente: { usd: number; de: number } | null;
};

const texto = (x: unknown): string | null => (typeof x === "string" ? x.slice(0, 200) : null);
const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A dónde va un viaje y cuándo, de lo entendido: solo para decirlo en la lista. */
function aDonde(v: ViajeEnLaMesa): Pick<GastoDeUnViaje, "destino" | "entrada" | "salida"> {
  let e: unknown = null;
  try {
    const ruta = join(v.carpeta, "entendido.json");
    if (existsSync(ruta)) e = JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    e = null;
  }
  const destino = objeto(e) && objeto(e.destination) ? e.destination : {};
  const fechas = objeto(e) && objeto(e.dates) ? e.dates : {};
  return { destino: texto(destino.name), entrada: texto(fechas.check_in), salida: texto(fechas.check_out) };
}

type DeUnRun = { usd: number; llamadas: number; sabido: boolean; ultima: string | null; entera: boolean };

function deUnRun(v: ViajeEnLaMesa, n: number): DeUnRun {
  const run = join(v.carpeta, "runs", String(n));
  const trabajos = trabajosDe(run);
  const gasto = gastoDe(run);
  const lanzados = trabajos.filter((t) => t.estado !== "queued");
  const horas = lanzados.flatMap((t) => t.hasta ?? t.desde ?? []).sort();
  return {
    usd: gasto.usd,
    llamadas: lanzados.length,
    sabido: gasto.sabido,
    ultima: horas.at(-1) ?? null,
    // Una investigación que rehace otra por un cambio no es entera: solo lanzó lo que dejó de valer.
    entera:
      gasto.sabido &&
      lanzados.length > 0 &&
      v.ficha.versiones.some((x) => x.run === n) &&
      !existsSync(join(run, REHECHO)),
  };
}

/**
 * Lo que gastaron las carpetas numeradas de un viaje que no son una investigación: los cierres (el que explica, una
 * vez por cierre) y las guías (el que escribe la guía, con sus vueltas).
 */
function deLasCarpetas(v: ViajeEnLaMesa, cuales: "cierres" | "guias"): Omit<DeUnRun, "entera"> {
  const raiz = join(v.carpeta, cuales);
  const suma = { usd: 0, llamadas: 0, sabido: true, ultima: null as string | null };
  if (!existsSync(raiz)) return suma;
  for (const n of readdirSync(raiz).filter((x) => /^[1-9]\d*$/.test(x))) {
    const carpeta = join(raiz, n);
    const lanzados = trabajosDe(carpeta).filter((t) => t.estado !== "queued");
    const gasto = gastoDe(carpeta);
    suma.usd += gasto.usd;
    suma.llamadas += lanzados.length;
    suma.sabido &&= gasto.sabido;
    for (const t of lanzados) {
      const h = t.hasta ?? t.desde;
      if (h !== null && (suma.ultima === null || h > suma.ultima)) suma.ultima = h;
    }
  }
  return suma;
}

/** Lo que ha gastado cada viaje de un dueño, el total y lo que costaría la siguiente investigación. */
export function gastoDeLaCuenta(dueno: string, mesa: string): GastoDeLaCuenta {
  const viajes: GastoDeUnViaje[] = [];
  const enteras: number[] = [];
  for (const ficha of viajesDe(dueno, mesa)) {
    if (ficha.runs.length === 0) continue;
    // `viajesDe` ya leyó la ficha y miró que es suya: no se vuelve a leer.
    const v: ViajeEnLaMesa = { carpeta: join(resolve(mesa), "viajes", ficha.id), ficha };
    const runs = v.ficha.runs.map((r) => deUnRun(v, r.n));
    for (const r of runs) if (r.entera) enteras.push(r.usd);
    // Lo que gastaron el que explica al cerrar el viaje y el que escribe su guía cuenta en el viaje, no en la media
    // de una investigación.
    const cierres = deLasCarpetas(v, "cierres");
    const guias = deLasCarpetas(v, "guias");
    // Cada última es un texto o null: va entera, no letra a letra.
    const ultimas = [...runs.map((r) => r.ultima), cierres.ultima, guias.ultima]
      .filter((x): x is string => x !== null)
      .sort();
    viajes.push({
      id: v.ficha.id,
      ...aDonde(v),
      usd: runs.reduce((s, r) => s + r.usd, 0) + cierres.usd + guias.usd,
      llamadas: runs.reduce((s, r) => s + r.llamadas, 0) + cierres.llamadas + guias.llamadas,
      sabido: runs.every((r) => r.sabido) && cierres.sabido && guias.sabido,
      ultima: ultimas.at(-1) ?? null,
      investigaciones: runs.length,
    });
  }
  viajes.sort((a, b) => (b.ultima ?? "").localeCompare(a.ultima ?? ""));
  return {
    viajes,
    total: {
      usd: viajes.reduce((s, x) => s + x.usd, 0),
      llamadas: viajes.reduce((s, x) => s + x.llamadas, 0),
      sabido: viajes.every((x) => x.sabido),
    },
    siguiente:
      enteras.length === 0 ? null : { usd: enteras.reduce((s, x) => s + x, 0) / enteras.length, de: enteras.length },
  };
}

/**
 * Lo que gastó de media cada asiento en una investigación de esa cuenta: por cada run que acabó en el mapa (también
 * los que rehicieron otro) y del que se sabe todo lo que gastó, la suma de los trabajos de ese asiento. Es con lo que
 * se estima lo que cuesta rehacer un paso (`agent/scripts/impacto.ts`). Un asiento que no ha trabajado nunca en esa
 * cuenta no sale: de él no se sabe.
 */
export function gastoPorAsiento(dueno: string, mesa: string): Record<string, { usd: number; de: number }> {
  const sumas = new Map<string, number[]>();
  for (const ficha of viajesDe(dueno, mesa)) {
    const v: ViajeEnLaMesa = { carpeta: join(resolve(mesa), "viajes", ficha.id), ficha };
    for (const r of ficha.runs) {
      const run = join(v.carpeta, "runs", String(r.n));
      const g = gastoDe(run);
      if (!g.sabido || !ficha.versiones.some((x) => x.run === r.n)) continue;
      const porAsiento = new Map<string, number>();
      for (const t of trabajosDe(run)) {
        if (t.estado === "queued" || t.gasto === null) continue;
        porAsiento.set(t.asiento, (porAsiento.get(t.asiento) ?? 0) + t.gasto.usd);
      }
      for (const [asiento, usd] of porAsiento) sumas.set(asiento, [...(sumas.get(asiento) ?? []), usd]);
    }
  }
  return Object.fromEntries(
    [...sumas].map(([asiento, usds]) => [
      asiento,
      { usd: usds.reduce((s, x) => s + x, 0) / usds.length, de: usds.length },
    ]),
  );
}
