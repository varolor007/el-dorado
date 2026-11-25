// Las cuentas de la pestaña «Allí» y de las capas del destino en la web (14.6), sin pantalla: lo que cuesta un precio
// para tu grupo, cuándo abre un sitio en tus días, el billete suelto de un trayecto que no se anda, lo que te conviene
// para moverte y el presupuesto de lo que tienes delante. No tienen reglas suyas: cada cuenta es la de la casa
// (`agent/scripts/presupuesto.ts` y `agent/scripts/capa_moverse.ts`), con tus días, para que la tarjeta de una
// parada, su ficha, cada tramo, «Allí» y las cuentas digan siempre la misma cifra.

import type {
  DeMoverse,
  Franja,
  Horario,
  ManeraDeLlegar,
  PrecioDeCapa,
  Presupuesto,
} from "../../../agent/output/capas.ts";
import type { Dia, Manera, Viaje } from "../../../agent/output/viaje.ts";
import { COMIDAS_AL_DIA } from "../../../agent/data/presupuesto.ts";
import { sueltoDelGrupo } from "../../../agent/scripts/capa_moverse.ts";
import { abreElDia, diaDeLaSemana } from "../../../agent/scripts/capas.ts";
import {
  cadaUnoDelGrupo,
  conOtrosDias,
  cuentaDeMoverseDelViaje,
  elDeUnAdulto,
  loQueCuestaLlegar,
  presupuestoDe,
  type LoQueCuestaLlegar,
} from "../../../agent/scripts/presupuesto.ts";

/** Quiénes viajan y en qué moneda va el viaje: con ella se elige el precio que conviene, como en el presupuesto. */
export type GrupoDelViaje = { adultos: number; ninos: number[]; moneda: string };

/** El grupo de un viaje, con la moneda de sus maneras. */
export const grupoDelViaje = (v: Pick<Viaje, "adultos" | "ninos" | "maneras">): GrupoDelViaje => ({
  adultos: v.adultos,
  ninos: v.ninos,
  moneda: v.maneras[0]?.moneda ?? "",
});

/** Lo que cuesta algo para tu grupo: lo sumado, por moneda; de cuántos de vosotros no se sabe; y si es todo gratis. */
export type ParaTuGrupo = {
  importes: { importe: number; moneda: string }[];
  faltan: number;
  gratis: boolean;
  cuantos: number;
};

/**
 * Lo que cuesta para el grupo: la cuenta del presupuesto (`cadaUnoDelGrupo`), que da a cada uno el precio que le toca
 * y, si valen varios, el que más conviene. Sin precios, null: no se sabe.
 */
export function paraTuGrupo(precios: PrecioDeCapa[] | null, grupo: GrupoDelViaje): ParaTuGrupo | null {
  const c = cadaUnoDelGrupo(precios, { adultos: grupo.adultos, ninos: grupo.ninos }, grupo.moneda);
  return c === null ? null : { importes: c.importes, faltan: c.faltan, gratis: c.gratis, cuantos: c.cuantos };
}

/** Lo que cuesta para una persona adulta, si la página lo dice: el mismo precio que le pone el presupuesto. */
export function porPersona(precios: PrecioDeCapa[] | null, moneda: string): PrecioDeCapa | null {
  return elDeUnAdulto(precios, moneda);
}

/**
 * Lo que cuesta una manera de llegar de donde aterrizas, para tu grupo: la cuenta del presupuesto
 * (`loQueCuestaLlegar`), que paga un taxi por coche y lo demás por persona. Lo que dice la lista de llegar de «Allí»
 * es lo que suma «de donde aterrizas a donde duermes» en las cuentas, por cada vez.
 */
export function paraLlegar(x: Pick<ManeraDeLlegar, "modo" | "precios">, grupo: GrupoDelViaje): LoQueCuestaLlegar {
  return loQueCuestaLlegar(x, { adultos: grupo.adultos, ninos: grupo.ninos }, grupo.moneda);
}

/** Un día del viaje y lo que se sabe de si abre: sí, con sus horas; no; o no se sabe. */
export type AbreUnDia = { fecha: string; abre: boolean | null; franjas: Franja[] };

/** El horario que manda en una fecha, como lo cuenta `abreElDia`: el que tiene fechas y la incluye, o el de siempre. */
function horarioDeUnDia(horarios: Horario[], fecha: string): Horario | null {
  const validos = horarios.filter(
    (h) => (h.desde === null || h.desde <= fecha) && (h.hasta === null || fecha <= h.hasta),
  );
  return validos.find((h) => h.desde !== null || h.hasta !== null) ?? validos[0] ?? null;
}

/** Si abre cada día de tus fechas, y a qué horas: lo que dice su horario, sin suponer nada. */
export function abreTusDias(horarios: Horario[] | null, fechas: readonly string[]): AbreUnDia[] {
  return fechas.map((fecha) => {
    const abre = abreElDia(horarios, fecha);
    const h = horarios === null ? null : horarioDeUnDia(horarios, fecha);
    const dia = diaDeLaSemana(fecha);
    return { fecha, abre, franjas: abre === true && h !== null ? h.franjas.filter((f) => f.dias.includes(dia)) : [] };
  });
}

/**
 * Lo que cuesta un trayecto que no se anda, para tu grupo: el billete suelto con que la cuenta de moverse paga cada
 * trayecto (`sueltoDelGrupo`), el mismo que entra en «moverte allí». Null si no se sabe.
 */
export function billeteSuelto(m: DeMoverse | undefined, grupo: GrupoDelViaje): ReturnType<typeof sueltoDelGrupo> {
  return sueltoDelGrupo(m, grupo.adultos, grupo.ninos, grupo.moneda || null);
}

/**
 * Cómo se nombra la zona a la que llega cada manera de llegar: por su nombre, si el viaje trae las zonas de su ruta y
 * la ruta tiene más de una; si no las trae (un viaje de antes) y van a varias, por su número en el orden en que salen.
 * Si no hace falta nombrarla (una ruta de una zona, o todas van a la misma sin nombres), null.
 */
export function zonasDeLlegar(
  llegar: ManeraDeLlegar[],
  zonas: Viaje["zonasDeLaRuta"] = undefined,
): Map<string, string | number> | null {
  const ids = [...new Set(llegar.map((x) => x.aZona))];
  if (zonas !== undefined && zonas.length > 1) {
    const conNombre = ids.flatMap((z) => zonas.filter((x) => x.id === z).map((x) => [z, x.nombre] as const));
    if (conNombre.length === ids.length) return new Map(conNombre);
  }
  if (ids.length <= 1) return null;
  return new Map(ids.map((z, i) => [z, zonas?.find((x) => x.id === z)?.nombre ?? i + 1]));
}

/** El nombre de la web de una fuente, para decir de dónde sale un dato sin enseñar la dirección entera. */
export function sitioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Lo que has cambiado en tu viaje desde que se hizo su presupuesto: el ritmo, las paradas que quitas, añades o mueves,
 * y dónde duermes o cómo llegas.
 */
export type TusCambios = {
  ritmo: boolean;
  paradas: boolean;
  alojamiento: boolean;
  transporte: boolean;
};

/** Lo que no se puede rehacer en la web: llegar de donde aterrizas a donde duermes, sin las zonas de la ruta. */
export type DeAntes = "arrival" | null;

/** Las capas del viaje, como las quiere la cuenta. */
const capasDe = (v: Viaje) => ({
  ...(v.moverse === undefined ? {} : { moverse: v.moverse }),
  ...(v.saber === undefined ? {} : { saber: v.saber }),
  ...(v.entradas === undefined ? {} : { entradas: v.entradas }),
});

/**
 * El presupuesto de lo que tienes delante: la cuenta de la casa (`presupuestoDe`), rehecha con tus días (tu ritmo,
 * tus paradas) y con donde duermes y cómo llegas en tu viaje (`viaje` ya con lo tuyo). Lo único que la web no puede
 * rehacer es llegar a donde duermes en un viaje de antes, que no trae las zonas de su ruta: entonces esa parte se
 * queda la de antes y, si cambiaste donde duermes o cómo llegas, se dice («arrival»).
 */
export function presupuestoQueSeEnsena(
  viaje: Viaje,
  dias: Dia[],
  cambios: TusCambios,
): { presupuesto: Presupuesto | undefined; deAntes: DeAntes } {
  const antes = viaje.presupuesto;
  if (antes === undefined || antes.falta !== null) return { presupuesto: antes, deAntes: null };
  const tuyo: Viaje = { ...viaje, dias };
  try {
    if (viaje.zonasDeLaRuta !== undefined)
      return { presupuesto: presupuestoDe(tuyo, capasDe(viaje), { zonas: viaje.zonasDeLaRuta }), deAntes: null };
    const rehecho = conOtrosDias(tuyo, capasDe(viaje), antes);
    return { presupuesto: rehecho, deAntes: cambios.alojamiento || cambios.transporte ? "arrival" : null };
  } catch {
    // Si algo del viaje no deja hacer la cuenta, se enseña la que trae, y se dice que es la de antes.
    return { presupuesto: antes, deAntes: "arrival" };
  }
}

/**
 * Lo que te conviene para moverte, con tus días, tu grupo y donde duermes: la cuenta del presupuesto, entera. Su total
 * es el de «moverte allí» en las cuentas.
 */
export function loQueTeConviene(viaje: Viaje, manera: Manera | undefined, dias: Dia[]) {
  return cuentaDeMoverseDelViaje({ ...viaje, dias }, manera);
}

/** Una horquilla de dinero: de cuánto a cuánto. */
export type Horquilla = { desde: number; hasta: number };

/**
 * Las comidas del presupuesto, como se enseñan: es una cuenta, por día y por persona (tantas comidas de pago al día, a
 * lo que suele costar una allí, que es lo que dice la página); y, si sois más de uno o hay días, para el grupo en el
 * viaje, dicho como tal. Null si no se sabe.
 */
export function comidasQueSeEnsenan(
  c: Presupuesto["comidas"],
  dias: number,
  personas: number,
): {
  alDia: number;
  una: Horquilla;
  porPersona: Horquilla;
  delViaje: Horquilla | null;
  moneda: string;
  fuentes: NonNullable<Presupuesto["comidas"]>["fuentes"];
} | null {
  if (c === null) return null;
  const redondo = (n: number): number => Math.round(n * 100) / 100;
  const veces = Math.max(0, dias) * Math.max(1, personas);
  return {
    alDia: COMIDAS_AL_DIA,
    una: { desde: redondo(c.desde / COMIDAS_AL_DIA), hasta: redondo(c.hasta / COMIDAS_AL_DIA) },
    porPersona: { desde: c.desde, hasta: c.hasta },
    delViaje: veces === 0 ? null : { desde: redondo(c.desde * veces), hasta: redondo(c.hasta * veces) },
    moneda: c.moneda,
    fuentes: c.fuentes,
  };
}
