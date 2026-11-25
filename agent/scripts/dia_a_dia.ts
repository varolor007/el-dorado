// El día a día a ratos (8.6), en código y sin IA: qué clases de sitio pide un mensaje tuyo y cuáles no estaban, qué
// alojamiento del viaje te deja más cerca de cada día, lo que se le cuenta al del día a día de cómo están tus días, y
// el impacto de un mensaje antes de mandarlo. Sin nada de Node: la web lo usa igual.

import { CLASES_DE_UN_MENSAJE, LARGO_DE_UN_MENSAJE, PALABRAS_DE_UNA_CLASE, UN_MENSAJE } from "../data/dia_a_dia.ts";
import { CODIGO } from "../data/pasos.ts";
import { RAICES } from "../data/sitios.ts";
import { cuentasDeUnDia, type NoCabe } from "../gates/puerta_dias.ts";
import type { Dia, Punto, Viaje } from "../output/viaje.ts";
import { caminosDe, trayectoEntre } from "../tools/caminos.ts";
import type { TusDias } from "./cierre.ts";
import { SIN_ELEGIR, type Elecciones } from "./elecciones.ts";
import { costesDe, impactoDe, type EstimadoPorAsiento, type Impacto } from "./impacto.ts";

/** Lo que pide un mensaje tuyo a la casa, tal cual queda en `rehecho.json` (`pedido`). */
export type PedidoDeUnDia = {
  kind: typeof UN_MENSAJE;
  /** Tus palabras, como las escribiste. */
  said: string;
  /** El día que tenías abierto, desde el cero; null si los mirabas todos. */
  day: number | null;
  /** Tus días como estaban, con tus elecciones: lo que ve el del día a día. */
  days: TusDias;
  /** Lo que habías quitado: no vuelve solo. */
  removed: string[];
  /** Tus elecciones sobre la versión de la que sale: pasan a la nueva en lo que siga siendo suyo. */
  choices: Elecciones;
  /** Las clases de sitio que pides y no estaban: el código vuelve a los datos abiertos por ellas. */
  look_for: string[];
};

/** Un mensaje que no vale, por su clave. */
export class MensajeQueNoVale extends Error {}

const sinTildes = (texto: string): string => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Tus palabras, si valen: un texto de una línea, ni vacío ni largo. Lanza `MensajeQueNoVale` si no. */
export function comprobarMensaje(crudo: unknown): string {
  if (typeof crudo !== "string") throw new MensajeQueNoVale("bad_message");
  const said = crudo.replace(/\s+/g, " ").trim();
  if (said === "") throw new MensajeQueNoVale("empty_message");
  if (said.length > LARGO_DE_UN_MENSAJE) throw new MensajeQueNoVale("long_message");
  return said;
}

/** Las clases de sitio que nombra un mensaje, en el orden de la lista: «un día de playa» nombra la playa. */
export function clasesNombradas(said: string): string[] {
  const texto = ` ${sinTildes(said).replace(/[^a-z0-9]+/g, " ")} `;
  return Object.entries(PALABRAS_DE_UNA_CLASE)
    .filter(([, palabras]) => palabras.some((p) => texto.includes(` ${p} `)))
    .map(([clase]) => clase);
}

/**
 * Las clases que nombra un mensaje y de las que no había ningún sitio entre los que se dieron a elegir: por esas, y
 * solo por esas, el código vuelve a los datos abiertos. «Menos museos» nombra museos, pero los había: no se busca.
 */
export function loQueNoEstaba(said: string, sitios: readonly { clase: string }[]): string[] {
  const hay = new Set(sitios.map((s) => s.clase));
  return clasesNombradas(said)
    .filter((c) => !hay.has(c))
    .slice(0, CLASES_DE_UN_MENSAJE);
}

/** Los identificadores de la fuente de unas clases nuestras: con ellos se le piden los sitios de esas clases. */
export function raicesDeLasClases(clases: readonly string[]): string[] {
  return [...new Set(RAICES.filter((r) => clases.includes(r.clase)).map((r) => r.raiz))];
}

/** Lo que se tarda, de media, de un punto a las paradas de un día; null si el día no tiene paradas. */
function mediaHasta(desde: Punto, puntos: Punto[], c: ReturnType<typeof caminosDe>): number | null {
  if (puntos.length === 0) return null;
  const suma = puntos.reduce((s, p) => s + trayectoEntre(desde, p, c).minutos, 0);
  return Math.round(suma / puntos.length);
}

/** El alojamiento que te deja más cerca de un día: cuál y lo que se tarda, de media, a sus paradas. */
export type MasCerca = { fecha: string; alojamiento: string | null; minutos: number | null };

/**
 * Qué alojamiento de los del viaje (los que no se descartaron) te deja más cerca de cada día: el de menos minutos de
 * media hasta sus paradas, con la tabla de caminos del viaje si la trae. A igualdad, el primero del viaje. Un día sin
 * paradas no tiene ninguno.
 */
export function masCercaDeCadaDia(v: Viaje, dias: TusDias): MasCerca[] {
  const c = caminosDe(v.caminos);
  const punto = new Map(v.paradas.map((p) => [p.id, p.punto]));
  const camas = v.alojamientos.filter((a) => a.descartado == null);
  return dias.map((d) => {
    const puntos = d.paradas.flatMap((id) => punto.get(id) ?? []);
    let mejor: { alojamiento: string; minutos: number } | null = null;
    for (const a of camas) {
      const m = mediaHasta(a.punto, puntos, c);
      if (m !== null && (mejor === null || m < mejor.minutos)) mejor = { alojamiento: a.id, minutos: m };
    }
    return { fecha: d.fecha, alojamiento: mejor?.alojamiento ?? null, minutos: mejor?.minutos ?? null };
  });
}

/** Lo que pide un mensaje tuyo, montado con tus días como estaban y lo que no estaba entre los sitios. */
export function pedidoDeUnDia(o: {
  said: string;
  day: number | null;
  days: TusDias;
  choices?: Elecciones;
  sitios: readonly { clase: string }[];
}): PedidoDeUnDia {
  const choices = o.choices ?? SIN_ELEGIR;
  return {
    kind: UN_MENSAJE,
    said: o.said,
    day: o.day,
    days: o.days,
    removed: [...choices.removed],
    choices,
    look_for: loQueNoEstaba(o.said, o.sitios),
  };
}

/** Si lo que pide un momento es un mensaje tuyo para un día. */
export function esUnMensaje(pedido: unknown): pedido is PedidoDeUnDia {
  const p = pedido as Partial<PedidoDeUnDia> | null;
  return p !== null && typeof p === "object" && p.kind === UN_MENSAJE && typeof p.said === "string";
}

/**
 * Los pasos que un mensaje para un día solo rehace si hace falta: el que cruza y el que explica. La tabla mide cada
 * parada desde cada alojamiento y se vuelve a montar, en código; si con ella no cambia qué alojamiento queda mejor ni
 * lo que cuesta, y lo que entregaron sigue pasando sus puertas, se quedan con lo que hicieron, sin volver a pagarlo.
 */
export const SOLO_SI_CAMBIA = ["cross", "explain"] as const;

/**
 * El impacto de un mensaje tuyo, antes de mandarlo: el del día a día otra vez y, si pides algo que no estaba, los
 * sitios de los datos abiertos (código). El que cruza y el que explica, solo si cambia lo que deciden: van en
 * `maybe`: lo que costaría (`cost`) cuenta lo que seguro se lanza, y lo más que puede ser (`most`), también a ellos.
 */
export function impactoDeUnDia(estimado: EstimadoPorAsiento = {}, buscaSitios = false): Impacto {
  const base = impactoDe(["day"], estimado);
  const solo = new Set<string>(SOLO_SI_CAMBIA);
  const sitios = buscaSitios ? [{ step: "sights" as const, who: CODIGO }] : [];
  const redo = [...sitios, ...base.redo.filter((x) => !solo.has(x.step))];
  const maybe = [
    ...base.maybe.filter((x) => !(buscaSitios && x.step === "sights")),
    ...base.redo.filter((x) => solo.has(x.step)),
  ];
  const keep = base.keep.filter((id) => !(buscaSitios && id === "sights"));
  return { changes: base.changes, redo, keep, maybe, pieces: base.pieces, ...costesDe(redo, maybe, estimado) };
}

/**
 * Tus días, con tus elecciones, por las mismas cuentas de la puerta 9: de cada fecha que no cabe, por qué (sus horas
 * no caben en un día entero, o un salto no cabe en un día). Lo que mueves o añades entra aunque no quepa, porque es
 * tu elección: no se impide, se dice en ese día, y al cerrar queda sin confirmar.
 */
export function noCabenTusDias(
  v: Viaje,
  dias: readonly Pick<Dia, "fecha" | "paradas" | "metros">[],
): Record<string, NoCabe[]> {
  const porId = new Map(v.paradas.map((p) => [p.id, p]));
  const c = caminosDe(v.caminos);
  const salida: Record<string, NoCabe[]> = {};
  for (const d of dias) {
    const { noCabe } = cuentasDeUnDia(d, porId, c);
    if (noCabe.length > 0) salida[d.fecha] = noCabe;
  }
  return salida;
}
