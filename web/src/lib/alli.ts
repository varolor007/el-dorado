// Las cuentas de la pestaña «Allí» y de las capas del destino en la web (14.6), sin pantalla: lo que cuesta un precio
// para tu grupo, cuándo abre un sitio en tus días, el billete suelto de un trayecto que no se anda y si el presupuesto
// que trae el viaje sigue siendo el de lo que ves. Solo leen lo que trae el viaje, ya pasada su puerta: no calculan
// el presupuesto (eso es de la casa, `agent/scripts/presupuesto.ts`) ni deciden nada.

import type {
  DeMoverse,
  Franja,
  Horario,
  Importe,
  ManeraDeLlegar,
  PrecioDeCapa,
  Presupuesto,
} from "../../../agent/output/capas.ts";
import { abreElDia, diaDeLaSemana } from "../../../agent/scripts/capas.ts";

/** Hasta qué edad es un bebé cuando la página no da edades: lo de menos de dos años. */
const EDAD_DE_BEBE = 2;

/** Lo que cuesta algo para tu grupo: lo sumado, por moneda; de cuántos de vosotros no se sabe; y si es todo gratis. */
export type ParaTuGrupo = { importes: Importe[]; faltan: number; gratis: boolean; cuantos: number };

const cubre = (p: PrecioDeCapa, edad: number): boolean =>
  p.edades !== null &&
  (p.edades.desde === null || p.edades.desde <= edad) &&
  (p.edades.hasta === null || edad <= p.edades.hasta);

/**
 * El precio que le toca a cada uno, por lo que dice la página: a un adulto, el de adulto o el de cualquiera; a un niño,
 * el que cubre su edad, o, si la página no da edades, el de bebé o el de niño, y si no, el de cualquiera. Lo que no se
 * puede saber (un niño en una página que solo da el de adulto) no se supone: cuenta como que falta. Los de familia y
 * de grupo no se suman: dependen de condiciones que la web no sabe.
 */
export function precioDeCadaUno(precios: PrecioDeCapa[], edad: number | null): PrecioDeCapa | null {
  const sueltos = precios.filter((p) => p.para !== "family" && p.para !== "group");
  const de = (para: PrecioDeCapa["para"]) => sueltos.find((p) => p.para === para && p.edades === null) ?? null;
  if (edad === null) return de("adult") ?? sueltos.find((p) => p.para === "adult") ?? de("any");
  const porEdad = sueltos.filter((p) => p.para !== "adult" && cubre(p, edad));
  if (porEdad.length > 0) return porEdad[0];
  return (edad < EDAD_DE_BEBE ? de("infant") : null) ?? de("child") ?? de("any");
}

/** Lo que cuesta para el grupo, sumando el precio de cada uno. Sin precios, null: no se sabe. */
export function paraTuGrupo(precios: PrecioDeCapa[] | null, adultos: number, ninos: number[]): ParaTuGrupo | null {
  if (precios === null || precios.length === 0) return null;
  const edades: (number | null)[] = [...Array.from({ length: Math.max(0, adultos) }, () => null), ...ninos];
  const importes: Importe[] = [];
  let faltan = 0;
  let pagados = 0;
  for (const edad of edades) {
    const p = precioDeCadaUno(precios, edad);
    if (p === null) {
      faltan++;
      continue;
    }
    const cuanto = p.cuanto;
    if (cuanto === "free") continue;
    pagados++;
    const ya = importes.find((x) => x.moneda === cuanto.moneda);
    if (ya === undefined) importes.push({ ...cuanto });
    else ya.importe = Math.round((ya.importe + cuanto.importe) * 100) / 100;
  }
  return { importes, faltan, gratis: pagados === 0 && faltan === 0, cuantos: edades.length };
}

/** Lo que cuesta para una persona adulta, si la página lo dice: para decirlo al lado de lo del grupo. */
export function porPersona(precios: PrecioDeCapa[] | null): PrecioDeCapa | null {
  return precios === null ? null : precioDeCadaUno(precios, null);
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

/** Las maneras que no se andan, como las cuenta la web (`ManeraDeIr`): la de transporte se paga con un billete. */
const PUBLICOS = ["metro", "tram", "bus", "train", "ferry", "cable"] as const;

/**
 * Lo que cuesta un trayecto en transporte, si se sabe: el billete suelto de allí, para tu grupo. Si hay varios, el
 * del transporte que sirve más zonas; si no hay ninguno con precio, null.
 */
export function billeteSuelto(m: DeMoverse | undefined): DeMoverse["billetes"][number] | null {
  if (m === undefined || m.falta !== null) return null;
  const sueltos = m.billetes.filter(
    (b) =>
      b.clase === "single" && b.precios !== null && b.modos.some((x) => (PUBLICOS as readonly string[]).includes(x)),
  );
  const alcance = (b: DeMoverse["billetes"][number]): number =>
    m.transportes.filter((x) => b.modos.includes(x.modo)).reduce((n, x) => n + x.zonas.length, 0);
  return [...sueltos].sort((a, b) => alcance(b) - alcance(a))[0] ?? null;
}

/**
 * Cómo se nombra la zona a la que llega cada manera de llegar. El viaje no trae el nombre de las zonas de la ruta:
 * si todas van a la misma, no hace falta nombrarla; si van a varias, se cuentan por orden de aparición.
 */
export function zonasDeLlegar(llegar: ManeraDeLlegar[]): Map<string, number> | null {
  const zonas = [...new Set(llegar.map((x) => x.aZona))];
  return zonas.length <= 1 ? null : new Map(zonas.map((z, i) => [z, i + 1]));
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
 * y dónde duermes o cómo llegas. Con algo cambiado, el presupuesto que trae el viaje es el de antes.
 */
export type TusCambios = {
  ritmo: boolean;
  paradas: boolean;
  alojamiento: boolean;
  transporte: boolean;
};

/**
 * El presupuesto que se enseña y si es el de antes de tus cambios. Hoy, el que trae el viaje; cuando la casa dé la
 * cuenta con tus días (14.5), se llama aquí y deja de ser «de antes».
 */
export function presupuestoQueSeEnsena(
  presupuesto: Presupuesto | undefined,
  cambios: TusCambios,
): { presupuesto: Presupuesto | undefined; deAntes: boolean } {
  const deAntes = cambios.ritmo || cambios.paradas || cambios.alojamiento || cambios.transporte;
  return { presupuesto, deAntes: presupuesto !== undefined && presupuesto.falta === null && deAntes };
}
