// El conductor en el run: cuándo se le llama, qué se le da, cómo se recoge lo que entrega y cómo hace la casa lo que
// elige. Solo se le llama cuando un run para porque un asiento entregó en rojo en todas sus vueltas, o porque no
// entregó; una vez por run. Elige una de dos salidas, y la ejecuta el código:
//
// - «retry_with_hint»: una vuelta más del dueño, una sola, con su indicación dentro de lo devuelto. La entrega nueva
//   pasa las mismas puertas que cualquiera; si sale en rojo, el run vuelve a pararse y ya no se le llama.
// - «stop_and_tell»: el run sigue parado, y lo que dice (qué clase de parada es y qué puede hacer el viajero, por
//   claves; y una frase, si pasa la puerta de palabras) es lo que enseña la web.
//
// Lo que no puede nunca, y no tiene cómo: cambiar una entrega (no toca ningún puesto; el de la vuelta nueva lo monta
// la casa con el material del anterior), dar una puerta por buena (la vuelta nueva pasa las mismas), saltarse un paso
// (no hay salida para eso), lanzar más de una vuelta (se le llama una vez, y su vuelta es una) ni gastar por encima
// del techo (no se le lanza si no hay adelante o se llegó al techo, y su vuelta la lanza la casa con el mismo freno).
// Si falla o desobedece, el run se queda parado como estaba, con su acta.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  CONDUCTOR,
  PASOS_QUE_SE_PUEDEN_SALTAR,
  SALIDAS_DEL_VIAJERO,
  VUELTAS_DEL_CONDUCTOR,
  type SalidaDelViajero,
} from "../data/conductor.ts";
import { PARADO } from "../data/pasos.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { puertaConductor } from "../gates/puerta_conductor.ts";
import {
  actaDe,
  ASIENTO_DEL_CONDUCTOR,
  baseDe,
  causaDe,
  delConductor,
  veredictoDe,
  vueltaDe,
  type DelConductor,
  type ParadaDelActa,
} from "./acta.ts";
import { ordenDeApertura, recogerAsiento } from "./asiento.ts";
import { conSuLinea } from "./investigar.ts";
import { guardarJson } from "./mesa.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";
import { trabajosDe } from "./trabajos.ts";
import { contar } from "./vivo.ts";

/** El puesto del conductor: uno por run. */
export const PUESTO_DEL_CONDUCTOR = "conductor-1";
const CONTRATOS = resolve(import.meta.dirname, "..", "contracts");

const entregado = (p: Puesto): boolean => existsSync(join(p.carpeta, "out", "delivery.json"));
const puestoDe = (run: string, id: string): Puesto | undefined => puestosDe(run).find((p) => p.id === id);

function guardar(run: string, c: DelConductor): void {
  guardarJson(join(run, CONDUCTOR), c);
  contar(run);
}

/**
 * La parada a la que le toca el conductor, si le toca: un run parado por un asiento (en rojo en su última vuelta, o
 * sin entregar), aún sin viaje, y sin que se le haya llamado antes a otra parada de este run.
 */
export function paradaParaElConductor(run: string): ParadaDelActa | null {
  if (existsSync(join(run, "viaje.json"))) return null;
  const causa = causaDe(run);
  if (causa === null || causa.puesto === null || causa.asiento === null) return null;
  if (causa.clase !== "seat_kept_failing" && causa.clase !== "seat_did_not_finish") return null;
  if (causa.asiento === ASIENTO_DEL_CONDUCTOR) return null;
  const c = delConductor(run);
  if (c !== null && c.para.puesto !== causa.puesto) return null;
  // Si la casa se cortó tras montar su puesto y antes de apuntarlo, el puesto ya dice que se le llamó.
  if (c === null && puestoDe(run, PUESTO_DEL_CONDUCTOR) !== undefined) return null;
  return causa;
}

/** Lo que puede hacer el viajero con esta parada: seguir sin esa parte, solo si ese paso se puede saltar. */
function salidasDe(causa: ParadaDelActa): SalidaDelViajero[] {
  return SALIDAS_DEL_VIAJERO.filter(
    (s) => s !== "continue_without" || (causa.en !== null && PASOS_QUE_SE_PUEDEN_SALTAR.includes(causa.en)),
  );
}

/** El idioma del viajero, y nada más de él: es en el que se le escribe la frase. */
function idiomaDe(run: string): string {
  try {
    const e = JSON.parse(readFileSync(join(run, "entendido.json"), "utf8")) as { language?: unknown };
    return typeof e.language === "string" && /^[a-z]{2}$/.test(e.language) ? e.language : "en";
  } catch {
    return "en";
  }
}

/** Cada vuelta del trabajo que paró el run, con sus rojos y la línea que señala cada uno. */
function vueltasDe(run: string, causa: ParadaDelActa): unknown[] {
  const base = baseDe(causa.puesto as string);
  const trabajos = trabajosDe(run);
  return puestosDe(run)
    .filter((p) => baseDe(p.id) === base && p.asiento === causa.asiento)
    .sort((a, b) => vueltaDe(a.id) - vueltaDe(b.id))
    .map((p) => {
      const t = trabajos.find((x) => x.puesto === p.id);
      const v = veredictoDe(run, p.id);
      const rojos: Rojo[] =
        v !== null ? v.rojos : t?.fallo ? [{ donde: "delivery", que: `no entregó: ${t.fallo}` }] : [];
      return {
        pass: vueltaDe(p.id),
        state: t?.estado ?? "by_hand",
        checks: v === null ? "none" : v.verde ? "green" : "red",
        reds: conSuLinea(p, rojos),
      };
    });
}

/** Todo lo que hay dentro de una carpeta, con su ruta desde ella. */
function archivos(carpeta: string): string[] {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

function piezasDelConductor(run: string, causa: ParadaDelActa): Pieza[] {
  const json = (d: unknown): string => JSON.stringify(d, null, 2);
  const contrato = join(CONTRATOS, causa.asiento as string);
  return [
    {
      ruta: "stop.json",
      contenido: json({
        step: causa.en,
        house_kind: causa.clase,
        seat: causa.asiento,
        can_retry: VUELTAS_DEL_CONDUCTOR > 0,
        allowed_options: salidasDe(causa),
        language: idiomaDe(run),
      }),
    },
    { ruta: "record.json", contenido: json(actaDe(run)) },
    { ruta: "rounds.json", contenido: json(vueltasDe(run, causa)) },
    ...archivos(contrato).map((a) => ({ ruta: `seat-contract/${relative(contrato, a)}`, copiaDe: a })),
  ];
}

/**
 * La vuelta de más del dueño: su puesto siguiente, montado por la casa con el mismo material del anterior y, en lo
 * devuelto, lo que estaba mal, la entrega que se devuelve (si la hubo) y la indicación del conductor. No toca el
 * puesto anterior: lo que entregó sigue como estaba.
 */
function montarLaVueltaDeMas(run: string, c: DelConductor): void {
  const extra = c.vuelta_extra as string;
  if (puestoDe(run, extra) !== undefined) return;
  const antes = puestoDe(run, c.para.puesto);
  if (antes === undefined) throw new Error(`falta el puesto ${c.para.puesto}`);
  const material = join(antes.carpeta, "in");
  const piezas: Pieza[] = archivos(material)
    .map((a) => ({ ruta: relative(material, a), copiaDe: a }))
    .filter((p) => p.ruta !== "returned.json");
  const v = veredictoDe(run, antes.id);
  const fallo = trabajosDe(run).find((t) => t.puesto === antes.id)?.fallo ?? "acabó sin dejar su entrega";
  const rojos: Rojo[] = v !== null ? v.rojos : [{ donde: "delivery", que: `no entregó: ${fallo}` }];
  let entrega: unknown = null;
  if (entregado(antes))
    try {
      entrega = JSON.parse(readFileSync(join(antes.carpeta, "out", "delivery.json"), "utf8"));
    } catch {
      entrega = null;
    }
  const devuelto = { what_was_wrong: conSuLinea(antes, rojos), delivery: entrega, from_the_conductor: c.hint };
  piezas.push({ ruta: "returned.json", contenido: JSON.stringify(devuelto, null, 2) });
  const puesto = montarPuesto(run, extra, antes.asiento, piezas);
  mkdirSync(join(run, "ordenes"), { recursive: true });
  writeFileSync(join(run, "ordenes", `${puesto.id}.txt`), ordenDeApertura());
}

/**
 * Hace lo que eligió el conductor, si eligió la vuelta de más: monta su puesto y quita la parada. Se puede llamar las
 * veces que haga falta: la parada solo se quita mientras esa vuelta no ha empezado. Si ya trabajó, lo que diga el run
 * es lo suyo. Devuelve verdadero si el run vuelve a andar.
 */
function aplicar(run: string, c: DelConductor): boolean {
  if (c.estado !== "retry" || c.vuelta_extra === null) return false;
  montarLaVueltaDeMas(run, c);
  const extra = puestoDe(run, c.vuelta_extra);
  const empezada =
    trabajosDe(run).some((t) => t.puesto === c.vuelta_extra) || (extra !== undefined && entregado(extra));
  if (empezada || !existsSync(join(run, PARADO))) return false;
  rmSync(join(run, PARADO));
  contar(run);
  return true;
}

export type AlConducir = {
  /** Lanza un puesto y apunta su trabajo, como cualquier asiento de la casa. */
  lanzar: (puesto: string) => Promise<void>;
  /** Si se puede gastar ahora: con el adelante del viajero y por debajo de su techo. */
  puedeGastar: () => boolean;
};

/**
 * Lleva al conductor en un run parado, si le toca: lo monta, lo lanza, recoge lo que entrega, pasa su puerta y hace
 * lo que eligió. Devuelve verdadero si el run vuelve a andar (una vuelta más del dueño); falso si sigue parado.
 */
export async function conducir(run: string, o: AlConducir): Promise<boolean> {
  const causa = paradaParaElConductor(run);
  if (causa === null) return false;
  let c = delConductor(run);
  if (c !== null && c.estado !== "working") return aplicar(run, c);
  if (c === null) {
    // Sin adelante o en el techo no se le llama: el run se queda parado como estaba.
    if (!o.puedeGastar()) return false;
    c = {
      puesto: PUESTO_DEL_CONDUCTOR,
      para: {
        puesto: causa.puesto as string,
        asiento: causa.asiento as string,
        vuelta: causa.vuelta ?? 1,
        clase: causa.clase,
        en: causa.en,
      },
      estado: "working",
      rojos: [],
      decision: null,
      kind: null,
      options: [],
      message: null,
      hint: "",
      vuelta_extra: null,
    };
    guardar(run, c);
  }
  const acabar = (estado: DelConductor["estado"], rojos: Rojo[], mas: Partial<DelConductor> = {}): DelConductor => {
    const hecho: DelConductor = { ...(c as DelConductor), estado, rojos, ...mas };
    guardar(run, hecho);
    return hecho;
  };

  const puesto =
    puestoDe(run, PUESTO_DEL_CONDUCTOR) ??
    montarPuesto(run, PUESTO_DEL_CONDUCTOR, ASIENTO_DEL_CONDUCTOR, piezasDelConductor(run, causa));
  if (!entregado(puesto)) {
    const trabajo = trabajosDe(run).find((t) => t.puesto === puesto.id);
    if (trabajo === undefined) {
      if (!o.puedeGastar()) {
        acabar("failed", [{ donde: "spend", que: "no se lanzó: sin el adelante del viajero o en su techo" }]);
        return false;
      }
      await o.lanzar(puesto.id);
    }
    if (!entregado(puesto)) {
      const fallo = trabajosDe(run).find((t) => t.puesto === puesto.id)?.fallo ?? "acabó sin dejar su entrega";
      acabar("failed", [{ donde: puesto.id, que: fallo }]);
      return false;
    }
  }

  // Su entrega pasa la puerta de todos y la suya. En rojo no se hace nada: el run sigue parado como estaba.
  const metodo = recogerAsiento(puesto);
  const suya =
    metodo.entrega === null
      ? null
      : puertaConductor(metodo.entrega, { puedeOtraVuelta: VUELTAS_DEL_CONDUCTOR > 0, salidas: salidasDe(causa) });
  const rojos = [...metodo.rojos, ...(suya?.rojos ?? [])];
  guardarJson(join(run, `${puesto.id}.puertas.json`), { verde: rojos.length === 0 && suya !== null, rojos });
  if (suya === null || suya.salida === null || rojos.length > 0) {
    acabar("red", rojos.length > 0 ? rojos : [{ donde: "delivery", que: "no hay entrega que mirar" }]);
    return false;
  }
  const s = suya.salida;
  const comun = { decision: s.decision, kind: s.kind, options: s.options };
  if (s.decision === "stop_and_tell") {
    const message = s.message === "" ? null : { text: s.message, lang: idiomaDe(run) };
    acabar("told", [], { ...comun, message });
    return false;
  }
  const extra = `${baseDe(causa.puesto as string)}-v${(causa.vuelta ?? 1) + 1}`;
  return aplicar(run, acabar("retry", [], { ...comun, hint: s.hint, vuelta_extra: extra }));
}
