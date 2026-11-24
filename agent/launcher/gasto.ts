// Lo que ha gastado de IA cada viaje de una cuenta, sumando todas sus investigaciones, y lo que va a gastar la
// siguiente. Sin IA: sale de lo que apuntó cada trabajo (`trabajos.json` de cada run). Del disco se lee lo justo: la
// ficha de cada viaje, los trabajos de cada run y, solo de los viajes que han gastado algo, a dónde van.
//
// Lo que va a gastar lo siguiente no se inventa: es lo que costó de media una investigación entera de esa misma
// cuenta. Entera es la que acabó en el mapa (dejó su versión) y de la que se sabe todo lo que gastó. Si la cuenta no
// tiene ninguna, no se dice una cifra.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
    entera: gasto.sabido && lanzados.length > 0 && v.ficha.versiones.some((x) => x.run === n),
  };
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
    const ultimas = runs.flatMap((r) => r.ultima ?? []).sort();
    viajes.push({
      id: v.ficha.id,
      ...aDonde(v),
      usd: runs.reduce((s, r) => s + r.usd, 0),
      llamadas: runs.reduce((s, r) => s + r.llamadas, 0),
      sabido: runs.every((r) => r.sabido),
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
