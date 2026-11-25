// El horario de un sitio como lo escribe OpenStreetMap (su etiqueta `opening_hours`), leído en lo corriente: los días
// de la semana y sus horas, un día que cierra y abierto siempre. Leerlo entero es difícil (temporadas, festivos,
// amaneceres, comentarios, el enésimo lunes del mes): lo que no se entiende no se adivina, y entonces el horario no
// se sabe. Sin nada de Node: lo usan igual la casa y la web.

import { DIAS_DE_LA_SEMANA, type DiaDeLaSemana } from "../data/capas.ts";
import type { Franja } from "../output/capas.ts";

/** Los días como los escribe OpenStreetMap, en el orden de los nuestros: de lunes a domingo. */
const DIAS_DE_OSM = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/** Lo más largo que se lee: un horario corriente cabe de sobra; uno más largo es de los que no se entienden. */
export const LETRAS_DE_UN_HORARIO = 255;

const DIA = "(?:Mo|Tu|We|Th|Fr|Sa|Su)";
const TRAMO_DE_DIAS = `${DIA}(?:-${DIA})?`;
const DIAS = new RegExp(`^${TRAMO_DE_DIAS}(?:,${TRAMO_DE_DIAS})*$`);
const HORA = "(?:[01]\\d|2[0-4]):[0-5]\\d";
const TRAMO_DE_HORAS = new RegExp(`^(${HORA})-(${HORA})$`);
const CERRADO = /^(?:off|closed)$/i;

/** Una hora HH:MM en minutos desde las doce de la noche. */
const minutos = (h: string): number => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Los días de un selector como «Mo-Fr,Su», por su posición de lunes a domingo; null si no se entiende. */
function diasDe(texto: string): number[] | null {
  if (!DIAS.test(texto)) return null;
  const dias = new Set<number>();
  for (const tramo of texto.split(",")) {
    const [de, a] = tramo.split("-").map((d) => DIAS_DE_OSM.indexOf(d as (typeof DIAS_DE_OSM)[number]));
    const hasta = a ?? de;
    // Un tramo puede dar la vuelta a la semana: «Sa-Mo» es sábado, domingo y lunes.
    for (let i = de; ; i = (i + 1) % 7) {
      dias.add(i);
      if (i === hasta) break;
    }
  }
  return [...dias].sort((x, y) => x - y);
}

/** Las horas de una regla como «10:00-14:00,16:00-20:00»; null si no se entienden o un tramo va al revés. */
function horasDe(texto: string): [string, string][] | null {
  const tramos: [string, string][] = [];
  for (const parte of texto.split(",")) {
    const m = TRAMO_DE_HORAS.exec(parte.trim());
    // Un tramo que pasa de la medianoche («22:00-02:00») no se lee: no es lo corriente en un sitio que se visita.
    if (m === null || minutos(m[1]) >= minutos(m[2]) || m[1] === "24:00") return null;
    tramos.push([m[1], m[2]]);
  }
  return tramos;
}

/**
 * Las franjas de un horario de OpenStreetMap, en la forma del viaje: cada tramo de horas con los días que lo tienen.
 * Un día que no sale en ninguna, cierra. Vale para todo el año: lo que dependa de la fecha no se entiende. Lee:
 * «24/7»; reglas separadas por «;» (o por «,» tras unas horas) con sus días («Mo-Fr», «Mo,We», «Sa-Mo») y sus horas
 * («10:00-18:00», «10:00-14:00,16:00-20:00»), o «off» para un día que cierra; una regla sin días vale para todos; y
 * una de después manda sobre la de antes en sus días. Los festivos («PH») no se pueden poner en el calendario: una
 * regla solo de festivos se deja, y el horario de los demás días se lee igual. Lo demás (meses, semanas, temporadas,
 * amaneceres, comentarios, «+», «||», un día con número) no se entiende: null, que no se sabe. Y un horario que
 * cierra todos los días tampoco se toma por sabido: un sitio no se quita del viaje solo por los datos abiertos.
 */
export function leerHorarioDeOsm(texto: unknown): Franja[] | null {
  if (typeof texto !== "string") return null;
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (limpio === "" || limpio.length > LETRAS_DE_UN_HORARIO) return null;
  if (limpio === "24/7") return [{ dias: [...DIAS_DE_LA_SEMANA], abre: "00:00", cierra: "24:00" }];
  if (/["|+]/.test(limpio)) return null;
  // «Mo-Fr 10:00-18:00, Sa 10:00-14:00»: la coma tras unas horas y antes de unos días separa dos reglas.
  const reglas = limpio
    .replace(new RegExp(`(\\d{2}:\\d{2})\\s*,\\s*(?=(?:${DIA}|PH)\\b)`, "g"), "$1;")
    .split(";")
    .map((r) => r.trim())
    .filter((r) => r !== "");
  if (reglas.length === 0) return null;
  const delDia: ([string, string][] | null)[] = Array.from({ length: 7 }, () => null);
  let algunaSemanal = false;
  for (const regla of reglas) {
    // Una regla son sus días y sus horas («Mo-Fr 10:00-18:00»), o solo sus horas, que valen para todos los días.
    const partes = regla.split(" ");
    if (partes.length > 2) return null;
    const [selector, resto] = partes.length === 2 ? partes : [null, partes[0]];
    // Solo de festivos: no cambia los días de la semana. Con más días («PH,Su off») no se entiende.
    if (selector === "PH") continue;
    const dias = selector === null ? [0, 1, 2, 3, 4, 5, 6] : diasDe(selector);
    if (dias === null) return null;
    const horas = CERRADO.test(resto) ? [] : horasDe(resto);
    if (horas === null) return null;
    for (const d of dias) delDia[d] = horas;
    algunaSemanal = true;
  }
  if (!algunaSemanal) return null;
  // Las franjas: cada tramo de horas, con los días que lo tienen, por orden.
  const franjas: Franja[] = [];
  delDia.forEach((horas, d) => {
    for (const [abre, cierra] of horas ?? []) {
      const misma = franjas.find((f) => f.abre === abre && f.cierra === cierra);
      const dia: DiaDeLaSemana = DIAS_DE_LA_SEMANA[d];
      if (misma === undefined) franjas.push({ dias: [dia], abre, cierra });
      else misma.dias.push(dia);
    }
  });
  // Cerrado todos los días no es un horario: es un sitio que ya no abre, o un dato a medias. No se sabe.
  if (franjas.length === 0) return null;
  return franjas.sort((a, b) => a.abre.localeCompare(b.abre) || a.cierra.localeCompare(b.cierra));
}
