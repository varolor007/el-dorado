// La puerta 13: ¿cada entrada y cada horario, con su página? Mira lo que entrega el de las entradas en una tanda de
// sitios, con lo que el código puede medir: que cada precio, cada horario y cada reserva sale de una página que el
// asiento abrió de verdad (de la memoria de lo consultado, que guarda la casa) y no de los datos abiertos que ya se le
// dieron; que lleva su moneda y el día en que se vio; que no hay ningún sitio que no sea de su tanda, ni falta
// ninguno, de modo que lo que no se sabe está dicho; que un horario vale para las fechas del viaje o dice para cuáles;
// y que un enlace es una dirección que vale y sin claves dentro. Lo que no se puede medir (si la página es la oficial
// del sitio, si el precio es el de hoy) no lo mira nadie aquí: lo dice su contrato y lo cubre quien lo revisa.

import { DIAS_DE_LA_SEMANA, LO_MAS_DE_UNA_LISTA, PARA_QUIEN } from "../data/capas.ts";
import { direccionComparable, direccionesEn } from "../launcher/consultado.ts";
import { enlaceSinClaves } from "../tools/enlaces.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";

type Objeto = Record<string, unknown>;
const SIN_SABER = "unknown";

/** Los campos de cada cosa de la entrega, ni uno más ni uno menos. */
const DE_LA_ENTREGA = ["seat", "sights", "unknowns"];
const DE_UN_SITIO = ["id", "prices", "hours", "booking", "official_site"];
const DE_UN_PRECIO = ["for", "ages", "amount", "currency", "source", "seen"];
// «from» va entre comillas de las otras: así la prueba del repositorio no lo lee como un «import».
const DE_UN_HORARIO = [`from`, "to", "open", "closed_on", "source", "seen"];
const DE_UNA_FRANJA = ["days", "opens", "closes"];
const DE_UNA_RESERVA = ["needed", "where", "source", "seen"];

/** Lo más largo de una línea de lo que no se supo, como en los demás asientos con internet. */
export const LETRAS_DE_LO_QUE_NO_SE_SABE = 300;
/** La edad más alta que tiene sentido en un precio. */
const EDAD_MAXIMA = 120;

export type ParaLasEntradas = {
  /** Los sitios de esta tanda, por su id: todos, y solo ellos. */
  sitios: readonly string[];
  /** Las fechas del viaje, AAAA-MM-DD: un horario vale para ellas o dice para cuáles. */
  entrada: string;
  salida: string;
  /** Hoy, AAAA-MM-DD: ningún dato se vio después. */
  hoy: string;
  /**
   * Las páginas que abrió de verdad, de la memoria de lo consultado. Sin ella (null), esto no se mira aquí: lo mira
   * igual la puerta de todos, que no deja citar una página que ni se abrió ni venía en su material.
   */
  abiertas: readonly string[] | null;
  /** Las páginas de los datos abiertos que se le dieron: no son la fuente de un precio ni de un horario. */
  deLosAbiertos: readonly string[];
};

const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esFecha = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const esHora = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
const esEdad = (v: unknown): boolean =>
  v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= EDAD_MAXIMA);

export function puertaEntradas(v: unknown, p: ParaLasEntradas): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  const campos = (x: Objeto, lista: string[], donde: string): void => {
    for (const c of lista) if (!(c in x)) rojo(`${donde}.${c}`.replace(/^\./, ""), "falta");
    for (const c of Object.keys(x))
      if (!lista.includes(c)) rojo(`${donde}.${c}`.replace(/^\./, ""), "no es de la entrega");
  };
  campos(v, DE_LA_ENTREGA, "");
  if (v.seat !== "tickets") rojo("seat", "no es la entrega del de las entradas");

  const abiertas = p.abiertas === null ? null : new Set(p.abiertas.map(direccionComparable));
  const deLosAbiertos = new Set(p.deLosAbiertos.map(direccionComparable).filter((d) => d !== null));
  // La página de un dato: una dirección que vale, sin claves, que abrió de verdad y que no es de los datos abiertos.
  const fuente = (x: Objeto, donde: string): void => {
    const url = x.source;
    if (!enlaceSinClaves(url)) return rojo(`${donde}.source`, "no es la dirección https de la página de donde sale");
    const comparable = direccionComparable(url);
    if (comparable !== null && deLosAbiertos.has(comparable))
      rojo(`${donde}.source`, "es una página de los datos abiertos que se le dieron: la fuente es la web del sitio");
    else if (abiertas !== null && !abiertas.has(comparable))
      rojo(`${donde}.source`, "no es una página que abriera de verdad: un resultado de búsqueda no es una fuente");
    if (!esFecha(x.seen)) rojo(`${donde}.seen`, "no dice el día en que se vio, AAAA-MM-DD");
    else if (x.seen > p.hoy) rojo(`${donde}.seen`, "dice que se vio después de hoy");
  };

  // Cada sitio de su tanda, una vez, y ninguno más: lo que no se sabe va dicho con «unknown».
  const sitios = Array.isArray(v.sights) ? v.sights : null;
  if (sitios === null) rojo("sights", "no es una lista");
  const vistos = new Set<string>();
  (sitios ?? []).forEach((s, i) => {
    const donde = `sights[${i}]`;
    if (!esObjeto(s)) return rojo(donde, "no es un objeto");
    campos(s, DE_UN_SITIO, donde);
    const id = s.id;
    if (typeof id !== "string" || !p.sitios.includes(id)) rojo(`${donde}.id`, "no es un sitio de los que se le dieron");
    else if (vistos.has(id)) rojo(`${donde}.id`, `el sitio ${id} sale dos veces`);
    else vistos.add(id);
    precios(s.prices, `${donde}.prices`);
    horarios(s.hours, `${donde}.hours`);
    reserva(s.booking, `${donde}.booking`);
    if (s.official_site !== SIN_SABER && !enlaceSinClaves(s.official_site))
      rojo(`${donde}.official_site`, "no es una dirección https sin claves, ni unknown");
  });
  for (const id of p.sitios)
    if (sitios !== null && !vistos.has(id)) rojo("sights", `falta el sitio ${id}: lo que no se sabe, se dice`);

  function precios(x: unknown, donde: string): void {
    if (x === SIN_SABER) return;
    if (!Array.isArray(x) || x.length === 0 || x.length > LO_MAS_DE_UNA_LISTA)
      return rojo(donde, "no es una lista de precios, ni unknown");
    x.forEach((pr, j) => {
      const aqui = `${donde}[${j}]`;
      if (!esObjeto(pr)) return rojo(aqui, "no es un objeto");
      campos(pr, DE_UN_PRECIO, aqui);
      if (!(PARA_QUIEN as readonly unknown[]).includes(pr.for)) rojo(`${aqui}.for`, "no es de la lista de para quién");
      if (pr.ages !== null) {
        const a = pr.ages;
        if (!esObjeto(a) || !esEdad(a.from) || !esEdad(a.to) || (a.from === null && a.to === null))
          rojo(`${aqui}.ages`, "no son unas edades, con un número entero por un lado al menos, ni null");
        else if (a.from !== null && a.to !== null && (a.from as number) > (a.to as number))
          rojo(`${aqui}.ages`, "las edades van al revés");
      }
      // Gratis es gratis, sin moneda; un precio es un número con su moneda, nunca uno aproximado ni a medias.
      if (pr.amount === "free") {
        if (pr.currency !== null) rojo(`${aqui}.currency`, "lo que es gratis no lleva moneda: null");
      } else if (typeof pr.amount !== "number" || !Number.isFinite(pr.amount) || !(pr.amount > 0))
        rojo(`${aqui}.amount`, "no es un importe mayor que cero, ni free");
      else if (typeof pr.currency !== "string" || !/^[A-Z]{3}$/.test(pr.currency))
        rojo(`${aqui}.currency`, "no es la moneda en sus tres letras mayúsculas");
      fuente(pr, aqui);
    });
  }

  function horarios(x: unknown, donde: string): void {
    if (x === SIN_SABER) return;
    if (!Array.isArray(x) || x.length === 0 || x.length > LO_MAS_DE_UNA_LISTA)
      return rojo(donde, "no es una lista de horarios, ni unknown");
    x.forEach((h, j) => {
      const aqui = `${donde}[${j}]`;
      if (!esObjeto(h)) return rojo(aqui, "no es un objeto");
      campos(h, DE_UN_HORARIO, aqui);
      const desde = h.from === SIN_SABER ? null : h.from;
      const hasta = h.to === SIN_SABER ? null : h.to;
      if ((desde !== null && !esFecha(desde)) || (hasta !== null && !esFecha(hasta)))
        return rojo(aqui, "las fechas para las que vale no son AAAA-MM-DD ni unknown");
      if (desde !== null && hasta !== null && desde > hasta) rojo(aqui, "las fechas para las que vale van al revés");
      // Un horario de otras fechas no dice nada de este viaje.
      else if ((desde !== null && desde > p.salida) || (hasta !== null && hasta < p.entrada))
        rojo(aqui, "no vale para ningún día del viaje: es de otras fechas");
      if (!Array.isArray(h.open) || h.open.length > LO_MAS_DE_UNA_LISTA) rojo(`${aqui}.open`, "no es una lista");
      else
        h.open.forEach((f, k) => {
          const franja = `${aqui}.open[${k}]`;
          if (!esObjeto(f)) return rojo(franja, "no es un objeto");
          campos(f, DE_UNA_FRANJA, franja);
          const dias = f.days;
          if (
            !Array.isArray(dias) ||
            dias.length === 0 ||
            !dias.every((d) => (DIAS_DE_LA_SEMANA as readonly unknown[]).includes(d)) ||
            new Set(dias).size !== dias.length
          )
            rojo(`${franja}.days`, "no son días de la semana de la lista, cada uno una vez");
          if (!esHora(f.opens) || !esHora(f.closes) || f.opens === "24:00")
            rojo(franja, "sus horas no son HH:MM, de 00:00 a 24:00");
          else if (f.opens >= f.closes)
            rojo(franja, "cierra antes de abrir: un tramo que pasa la medianoche va en dos");
        });
      if (!Array.isArray(h.closed_on) || h.closed_on.length > LO_MAS_DE_UNA_LISTA)
        rojo(`${aqui}.closed_on`, "no es una lista");
      else
        h.closed_on.forEach((d, k) => {
          if (!esFecha(d)) return rojo(`${aqui}.closed_on[${k}]`, "no es una fecha AAAA-MM-DD");
          if (d < p.entrada || d > p.salida) rojo(`${aqui}.closed_on[${k}]`, "no es un día del viaje");
          else if ((desde !== null && d < desde) || (hasta !== null && d > hasta))
            rojo(`${aqui}.closed_on[${k}]`, "no es un día de las fechas para las que vale este horario");
        });
      fuente(h, aqui);
    });
  }

  function reserva(x: unknown, donde: string): void {
    if (x === SIN_SABER) return;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto, ni unknown");
    campos(x, DE_UNA_RESERVA, donde);
    if (typeof x.needed !== "boolean") rojo(`${donde}.needed`, "no dice si hay que reservar: true o false");
    if (x.where !== SIN_SABER && !enlaceSinClaves(x.where))
      rojo(`${donde}.where`, "no es una dirección https sin claves dentro, ni unknown");
    fuente(x, donde);
  }

  // Lo que no se supo: frases de una línea, cortas y sin direcciones.
  const noSe = Array.isArray(v.unknowns) ? v.unknowns : null;
  if (noSe === null) rojo("unknowns", "no es una lista: una lista vacía también se dice");
  (noSe ?? []).forEach((t, i) => {
    if (
      typeof t !== "string" ||
      t.trim() === "" ||
      t.length > LETRAS_DE_LO_QUE_NO_SE_SABE ||
      /[\n\r]/.test(t) ||
      direccionesEn(t).length > 0
    )
      rojo(
        `unknowns[${i}]`,
        `no es una frase de una línea, de ${LETRAS_DE_LO_QUE_NO_SE_SABE} letras como mucho y sin direcciones`,
      );
  });

  return { verde: rojos.length === 0, rojos };
}
