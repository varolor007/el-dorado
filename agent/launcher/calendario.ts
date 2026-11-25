// El del calendario en la investigación: lo que se le da, las cuentas que se hacen con lo que entrega y lo que se
// guarda. Corre por detrás, desde el principio y sin frenar la investigación; sus avisos tienen que estar cuando se
// monta el viaje, y si falla o no llega, el viaje se hace igual y se dice que faltan.
//
// Lo que queda en el run:
//
//   calendario.json   lo que entregó y pasó su puerta, con las cuentas del código; o por qué falta
//
// Este archivo no llama a ninguna IA ni lanza nada: dice qué hay que mandar al asiento y qué hacer con lo que vuelve.
// Las cuentas de días las hace aquí el código: qué días del viaje toca cada hallazgo, cuántos días se mueve una
// ventana y qué evita, alcanza, pierde o en qué entra con ello.

import { loQueSeBusca } from "../data/buscar.ts";
import { AVISOS_DE_FECHAS, LO_MAS_QUE_SE_MUEVE, VENTANAS } from "../data/calendario.ts";
import type { AvisoDeFechas, DelCalendario, FALTAS_DEL_CALENDARIO, VentanaDeFechas } from "../output/viaje.ts";
import type { Aviso, Entendido, EntregaDelCalendario } from "../scripts/formas.ts";
import type { Pieza } from "./puesto.ts";

export const CALENDARIO = "calendario.json";

/** Lo que guarda el run: lo entregado, si pasó su puerta, y lo que se enseña, ya con sus cuentas. */
export type DelCalendarioGuardado = DelCalendario & { entrega: EntregaDelCalendario | null; cuando: string };

const DIA = 86_400_000;
const enMs = (fecha: string): number => Date.parse(`${fecha}T00:00:00Z`);
const deMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Los días que hay de una fecha a otra: negativo si la segunda va antes. */
export const diasEntre = (de: string, a: string): number => Math.round((enMs(a) - enMs(de)) / DIA);

/** Una fecha, movida tantos días. */
export const moverFecha = (fecha: string, dias: number): string => deMs(enMs(fecha) + dias * DIA);

/** Los días de un tramo que caen entre otros dos, ambos incluidos, en orden. */
export function diasQueToca(desde: string, hasta: string, entrada: string, salida: string): string[] {
  const de = Math.max(enMs(desde), enMs(entrada));
  const a = Math.min(enMs(hasta), enMs(salida));
  const dias: string[] = [];
  for (let ms = de; ms <= a; ms += DIA) dias.push(deMs(ms));
  return dias;
}

/** Si un hallazgo toca unas fechas. Uno sin días (los que pide el destino) no toca ninguna. */
function toca(h: Aviso, entrada: string, salida: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.from) || !/^\d{4}-\d{2}-\d{2}$/.test(h.to)) return false;
  return diasQueToca(h.from, h.to, entrada, salida).length > 0;
}

/** Lo que el asiento puede ver del viaje: el destino, las fechas, de qué país se sale y qué busca. Nada de quién va. */
export function piezasDelCalendario(viaje: Entendido, hoy: string): Pieza[] {
  const json = (dato: unknown): string => JSON.stringify(dato, null, 2);
  const { check_in, check_out, flexible } = viaje.dates;
  const trip = {
    today: hoy,
    destination: {
      name: viaje.destination.name,
      country: viaje.destination.country,
      kind: viaje.destination.kind,
    },
    home_country: viaje.origin?.country ?? "unknown",
    dates: { check_in, check_out, nights: diasEntre(check_in, check_out), flexible },
    // Busca en internet con lo que lee: de lo que busca el viajero, solo lo de la lista fija, nunca sus palabras.
    looking_for: loQueSeBusca(viaje.looking_for),
    language: viaje.language,
  };
  const limits = {
    findings_allowed: AVISOS_DE_FECHAS,
    windows_allowed: flexible ? VENTANAS : 0,
    max_shift_days: LO_MAS_QUE_SE_MUEVE,
  };
  return [
    { ruta: "trip.json", contenido: json(trip) },
    { ruta: "limits.json", contenido: json(limits) },
  ];
}

/**
 * Lo que una ventana cambia frente a las fechas del viaje, por los días de cada hallazgo: lo que evita (lo malo que
 * tocaba el viaje y ella no), lo que alcanza (lo bueno que toca ella y el viaje no), lo que pierde (lo bueno que
 * tocaba el viaje y ella no) y en lo que entra (lo malo que toca ella y el viaje no).
 */
export function loQueCambia(
  hallazgos: Aviso[],
  entrada: string,
  salida: string,
  otraEntrada: string,
): Omit<VentanaDeFechas, "porQue"> {
  const noches = diasEntre(entrada, salida);
  const otraSalida = moverFecha(otraEntrada, noches);
  const cambio: Omit<VentanaDeFechas, "porQue"> = {
    entrada: otraEntrada,
    salida: otraSalida,
    seMueve: diasEntre(entrada, otraEntrada),
    evita: [],
    alcanza: [],
    pierde: [],
    entra: [],
  };
  hallazgos.forEach((h, i) => {
    const enElViaje = toca(h, entrada, salida);
    const enLaVentana = toca(h, otraEntrada, otraSalida);
    if (enElViaje === enLaVentana) return;
    if (h.kind === "favours") (enLaVentana ? cambio.alcanza : cambio.pierde).push(i);
    else (enElViaje ? cambio.evita : cambio.entra).push(i);
  });
  return cambio;
}

/** Lo que se enseña de lo que entregó el asiento, con las cuentas del código. Ninguna frase suya. */
export function paraEnsenar(e: EntregaDelCalendario, viaje: Entendido): DelCalendario {
  const { check_in: entrada, check_out: salida } = viaje.dates;
  const noches = diasEntre(entrada, salida);
  const sabido = (x: string): string | null => (x === "unknown" ? null : x);
  const avisos: AvisoDeFechas[] = e.findings.map((h) => {
    const desde = sabido(h.from);
    const hasta = sabido(h.to);
    const aviso: AvisoDeFechas = {
      clase: h.kind,
      tema: h.topic,
      nombre: sabido(h.name),
      desde,
      hasta,
      dias: desde !== null && hasta !== null ? diasQueToca(desde, hasta, entrada, salida) : [],
      precio: h.price === "unknown" ? null : { importe: h.price.amount, moneda: h.price.currency.toUpperCase() },
      fuente: h.source,
      visto: sabido(h.seen),
    };
    if (h.topic === "days_needed" && typeof h.days === "number")
      aviso.pide = { dias: h.days, deMas: noches + 1 - h.days };
    return aviso;
  });
  const ventanas: VentanaDeFechas[] = viaje.dates.flexible
    ? e.windows.map((v) => ({ ...loQueCambia(e.findings, entrada, salida, v.check_in), porQue: [...v.because] }))
    : [];
  return { avisos, ventanas, falta: null };
}

/** Lo que se guarda cuando falta: sin avisos, y por qué. */
export const sinCalendario = (falta: (typeof FALTAS_DEL_CALENDARIO)[number], cuando: Date): DelCalendarioGuardado => ({
  avisos: [],
  ventanas: [],
  falta,
  entrega: null,
  cuando: cuando.toISOString(),
});
