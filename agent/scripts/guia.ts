// Lo que el código le prepara al que escribe la guía: el viaje cerrado, día a día, con lo que dicen de cada parada sus
// fuentes abiertas, lo que se anda de un punto a otro (de la tabla de caminos o de la cuenta de la casa), dónde se
// duerme y cómo se llega, y lo que hay que llevar hecho. Y, desde las capas del destino (14.6), lo que el viaje cerrado
// sabe de allí: lo que cuesta y cuándo abre cada parada ese día, dónde se come cada día, cómo moverse y lo que cuesta,
// y lo que conviene saber. Lo que no trae el viaje no se le da: una capa que falta no está. Los precios y los horarios
// que se le dan son los del viaje, sin su página: el cuaderno los vuelve a poner, de los datos, con su fecha. El
// asiento no calcula ni elige: cuenta lo que hay.

import type { ClaseDelDestino } from "../data/capa_destino.ts";
import type { ClaseDeBillete, ClaseDePago, DeDondeSeLlega, ModoDeMoverse } from "../data/capa_moverse.ts";
import type { ParaQuien } from "../data/capas.ts";
import { PARA_COMER, TOPES_DE_LA_GUIA } from "../data/guia.ts";
import type {
  CosaDelDestino,
  DeMoverse,
  DelDestino,
  EntradaDeUnSitio,
  Franja,
  Horario,
  PrecioDeCapa,
} from "../output/capas.ts";
import type { Alojamiento, Manera, Parada, Punto, Transporte, Viaje } from "../output/viaje.ts";
import { caminosDe, trayectoEntre } from "../tools/caminos.ts";
import { andando } from "../tools/distancias.ts";
import { abreElDia, diaDeLaSemana, entradaDe } from "./capas.ts";
import { SIN_SABER, type Entendido } from "./formas.ts";
import { diasDe } from "./ruta.ts";

type NoSe = typeof SIN_SABER;

/** Un precio de una capa, como se le da al que escribe: para quién, sus edades, cuánto o «free», y su moneda. */
export type PrecioParaLaGuia = {
  for: ParaQuien;
  ages: { from: number | null; to: number | null } | null;
  amount: number | "free";
  currency: string | null;
};

/** Lo que cuesta y cuándo abre una parada el día que se va: solo si el viaje sabe algo de ello. */
export type EntradaParaLaGuia = {
  prices: PrecioParaLaGuia[] | NoSe;
  /** Si abre ese día: `no` es que ese día cierra. */
  open_that_day: "yes" | "no" | NoSe;
  /** Las horas que abre ese día, HH:MM; vacío si cierra o no se sabe. */
  hours_that_day: { opens: string; closes: string }[];
  book_ahead: "yes" | "no" | NoSe;
};

/** Un sitio donde comer un día: una zona o un mercado cerca de una parada de ese día, con lo que se anda hasta él. */
export type ComerParaLaGuia = {
  name: string | NoSe;
  kind: "food_area" | "market";
  says: string;
  near: string;
  metres: number;
};

/** Cómo moverse allí, por sus claves y sus números: de donde se llega, lo que hay, los billetes y cómo se paga. */
export type MoverseParaLaGuia = {
  arrivals: {
    from: DeDondeSeLlega;
    from_name: string | NoSe;
    mode: ModoDeMoverse;
    minutes: number | NoSe;
    prices: PrecioParaLaGuia[] | NoSe;
    until: string | NoSe;
  }[];
  transport: { mode: ModoDeMoverse; until: string | NoSe }[];
  tickets: {
    kind: ClaseDeBillete;
    days: number | null;
    rides: number | null;
    modes: ModoDeMoverse[];
    prices: PrecioParaLaGuia[] | NoSe;
  }[];
  payment: ClaseDePago[];
  car_needed: "yes" | "no" | NoSe;
};

/** Una cosa de lo que conviene saber, sin día: su clase, su nombre si lo tiene, su frase y lo que suele costar. */
export type SaberParaLaGuia = {
  kind: ClaseDelDestino;
  name: string | NoSe;
  says: string;
  costs: { from: number; to: number; currency: string } | NoSe;
};

/** De dónde sale un tramo: de la fuente de rutas o de la cuenta de la casa, que es aproximada. */
export type MedidoPor = "source" | "estimate";

export type TramoParaLaGuia = {
  from: string;
  to: string;
  metres: number;
  minutes: number;
  on_foot: boolean;
  measured_by: MedidoPor;
};

export type ParadaParaLaGuia = {
  id: string;
  name: string;
  kind: string;
  why: string;
  minutes: number;
  best_time: string;
  book_ahead: "yes" | "no" | typeof SIN_SABER;
  must: boolean;
  about: string;
  /** Lo que cuesta y cuándo abre ese día, si el viaje lo sabe (14.6). */
  ticket?: EntradaParaLaGuia;
};

export type DiaParaLaGuia = {
  date: string;
  weekday: string;
  /** El título del día, de sus paradas; en un día libre no lo hay, y es `unknown`. */
  title: string;
  /** Un día libre: sin paradas ni tramos, el ritmo lo deja para el viajero. Lo que se escribe de él, sin sitios. */
  free: boolean;
  stops: ParadaParaLaGuia[];
  legs: TramoParaLaGuia[];
  /** Dónde se come ese día, si el viaje lo sabe (14.6). */
  eat?: ComerParaLaGuia[];
};

/** Lo que hay que llevar hecho, por sus claves: el asiento lo cuenta, y el cuaderno pone su plazo. */
export type CosaParaLaGuia =
  | { item: number; kind: "book_ahead"; stop: string; name: string; date: string }
  | {
      item: number;
      kind: "paper";
      country: string;
      question: string;
      state: string;
      before: string;
      valid_until: string;
      travellers: number;
    }
  | { item: number; kind: "dates"; class: string; topic: string; name: string; trip_days: string[] };

export type ParaLaGuia = {
  trip: {
    language: string;
    destination: { name: string; country: string };
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    pace: string;
    looking_for: string[];
  };
  days: DiaParaLaGuia[];
  stay: {
    lodging: string | typeof SIN_SABER;
    zone: string | typeof SIN_SABER;
    transport: { kind: string; from: string; to: string; out: string; back: string } | typeof SIN_SABER;
  };
  todo: CosaParaLaGuia[];
  /** Cómo moverse allí, si el viaje lo sabe (14.6). */
  around?: MoverseParaLaGuia;
  /** Lo que conviene saber que no es de un día, si el viaje lo sabe (14.6). */
  know?: SaberParaLaGuia[];
};

/**
 * La manera con que se hace el viaje: la que se cerró, que es con la que el viajero se quedó. Si el viaje no lleva
 * su cierre, la que se pida o la única que tiene. Sin ella no se sabe dónde se duerme.
 */
export function maneraDeLaGuia(v: Viaje, pedida?: string | null): Manera | null {
  const cerrada = v.cierre?.manera ?? null;
  if (cerrada !== null) return v.maneras.find((m) => m.id === cerrada) ?? null;
  if (pedida != null) return v.maneras.find((m) => m.id === pedida) ?? null;
  return v.maneras.length === 1 ? v.maneras[0] : null;
}

/** El alojamiento y el transporte de una manera, si los tiene. */
export function deLaManera(v: Viaje, m: Manera | null): { duerme: Alojamiento | null; llega: Transporte | null } {
  if (m === null) return { duerme: null, llega: null };
  return {
    duerme: v.alojamientos.find((a) => a.id === m.alojamiento) ?? null,
    llega: m.transporte === null ? null : (v.transportes.find((t) => t.id === m.transporte) ?? null),
  };
}

/** Las paradas de cada día, en su orden. Una parada que el día nombra y no existe es un viaje roto. */
export function paradasDelDia(v: Viaje, i: number): Parada[] {
  const porId = new Map(v.paradas.map((p) => [p.id, p]));
  return v.dias[i].paradas.map((id) => {
    const p = porId.get(id);
    if (p === undefined) throw new Error(`el día ${v.dias[i].fecha} nombra la parada ${id}, que no está en el viaje`);
    return p;
  });
}

/** Un tramo de la guía, medido igual que en la web: con la tabla de caminos si la hay, y si no, con la cuenta. */
export function tramoEntre(v: Viaje, de: Punto, a: Punto): Omit<TramoParaLaGuia, "to" | `from`> {
  const t = trayectoEntre(de, a, caminosDe(v.caminos));
  return {
    metres: t.metros,
    minutes: t.minutos,
    on_foot: t.aPie,
    measured_by: t.segun === "fuente" ? "source" : "estimate",
  };
}

/**
 * Lo que dicen de una parada sus fuentes abiertas, por su identificador: la descripción y el principio de su artículo,
 * como se guardaron al buscar los sitios. Lo que no se tenga es `unknown`.
 */
export type LoQueDicen = Map<string, string>;

/** Lo que se le da al que escribe la guía. */
export function paraLaGuia(v: Viaje, e: Entendido | null, m: Manera | null, dicen: LoQueDicen = new Map()): ParaLaGuia {
  if (v.dias.length === 0) throw new Error("un viaje sin días no tiene guía");
  if (v.dias.length > TOPES_DE_LA_GUIA.dias) throw new Error("el viaje tiene más días de los que caben en una guía");
  const { duerme, llega } = deLaManera(v, m);
  const semana = new Map(diasDe(v.entrada, v.salida).days.map((d) => [d.date, d.weekday]));
  const comer = comerPorDias(v);
  const days = v.dias.map((d, i): DiaParaLaGuia => {
    const paradas = paradasDelDia(v, i);
    if (paradas.length > TOPES_DE_LA_GUIA.paradasPorDia) throw new Error(`el día ${d.fecha} tiene demasiadas paradas`);
    const legs: TramoParaLaGuia[] = [];
    if (duerme !== null && paradas.length > 0)
      legs.push({ from: "stay", to: paradas[0].id, ...tramoEntre(v, duerme.punto, paradas[0].punto) });
    for (let j = 1; j < paradas.length; j++)
      legs.push({
        from: paradas[j - 1].id,
        to: paradas[j].id,
        ...tramoEntre(v, paradas[j - 1].punto, paradas[j].punto),
      });
    return {
      date: d.fecha,
      weekday: semana.get(d.fecha) ?? SIN_SABER,
      title: paradas.length === 0 || d.titulo.trim() === "" ? SIN_SABER : d.titulo,
      free: paradas.length === 0,
      stops: paradas.map((p) => ({
        id: p.id,
        name: p.nombre,
        kind: p.clase,
        why: p.porQue,
        minutes: p.minutos,
        best_time: p.mejorHora ?? "any",
        book_ahead: p.reservar === undefined ? SIN_SABER : p.reservar ? "yes" : "no",
        must: p.imprescindible,
        about: dicen.get(p.id) ?? SIN_SABER,
        ...conEntrada(v, p.id, d.fecha),
      })),
      legs,
      ...(comer.porDia.has(d.fecha) ? { eat: comer.porDia.get(d.fecha)!.map(comerParaLaGuia) } : {}),
    };
  });
  const noches = diasDe(v.entrada, v.salida).nights;
  return {
    trip: {
      language: v.idioma,
      destination: { name: v.destino.nombre, country: v.destino.pais },
      check_in: v.entrada,
      check_out: v.salida,
      nights: noches,
      adults: v.adultos,
      children: v.ninos.length,
      pace: v.ritmo,
      looking_for: e?.looking_for ?? [],
    },
    days,
    stay: {
      lodging: duerme?.nombre ?? SIN_SABER,
      zone: duerme?.zona ?? SIN_SABER,
      transport:
        llega === null
          ? SIN_SABER
          : { kind: llega.clase, from: llega.de, to: llega.a, out: llega.sale, back: llega.vuelve ?? SIN_SABER },
    },
    todo: cosasQueLlevarHechas(v, days),
    ...conLoDeAlli(v, comer.sinDia),
  };
}

// Las capas del destino en la guía (14.6). Lo mismo le sirve al cuaderno: los dos salen de estas cuentas.

/** Una capa que el viaje trae y no falta. Una que falta, o que no está, no se nombra. */
export const capaQueVale = <T extends { falta: unknown }>(c: T | undefined): T | null =>
  c === undefined || c.falta !== null ? null : c;

const precioParaLaGuia = (p: PrecioDeCapa): PrecioParaLaGuia => ({
  for: p.para,
  ages: p.edades === null ? null : { from: p.edades.desde, to: p.edades.hasta },
  amount: p.cuanto === "free" ? "free" : p.cuanto.importe,
  currency: p.cuanto === "free" ? null : p.cuanto.moneda,
});
const preciosParaLaGuia = (ps: PrecioDeCapa[] | null): PrecioParaLaGuia[] | NoSe =>
  ps === null ? SIN_SABER : ps.map(precioParaLaGuia);

/** El horario que manda una fecha, como en `abreElDia`: el que la incluye con sus fechas, o el de todo el año. */
export function horarioDelDia(horarios: Horario[] | null, fecha: string): Horario | null {
  if (horarios === null) return null;
  const validos = horarios.filter(
    (h) => (h.desde === null || h.desde <= fecha) && (h.hasta === null || fecha <= h.hasta),
  );
  return validos.find((h) => h.desde !== null || h.hasta !== null) ?? validos[0] ?? null;
}

/** Las franjas que abre un sitio una fecha: ninguna si ese día cierra o no se sabe. */
export function franjasDelDia(horarios: Horario[] | null, fecha: string): Franja[] {
  const h = horarioDelDia(horarios, fecha);
  if (h === null || abreElDia(horarios, fecha) !== true) return [];
  const dia = diaDeLaSemana(fecha);
  return h.franjas.filter((f) => f.dias.includes(dia));
}

/** Si una entrada sabe algo que contar: un precio, un horario o si hay que reservar. */
export const entradaConAlgo = (e: EntradaDeUnSitio | null): e is EntradaDeUnSitio =>
  e !== null && (e.precios !== null || e.horarios !== null || e.reservar !== null);

/** Lo que cuesta y cuándo abre una parada el día que se va, si el viaje lo sabe; si no, nada. */
function conEntrada(v: Viaje, parada: string, fecha: string): { ticket?: EntradaParaLaGuia } {
  const e = entradaDe(capaQueVale(v.entradas) ?? undefined, parada);
  if (!entradaConAlgo(e)) return {};
  const abre = abreElDia(e.horarios, fecha);
  return {
    ticket: {
      prices: preciosParaLaGuia(e.precios),
      open_that_day: abre === null ? SIN_SABER : abre ? "yes" : "no",
      hours_that_day: franjasDelDia(e.horarios, fecha).map((f) => ({ opens: f.abre, closes: f.cierra })),
      book_ahead: e.reservar === null ? SIN_SABER : e.reservar.haceFalta ? "yes" : "no",
    },
  };
}

/** Un sitio donde comer, el día que le toca: la cosa del destino, la parada que le queda más cerca y lo que se anda. */
export type ComerUnDia = { cosa: CosaDelDestino; parada: Parada; metros: number };

/**
 * Dónde se come cada día: cada zona o mercado de lo que conviene saber, con su punto, va al día de la parada que le
 * queda más cerca si se anda en `PARA_COMER.metros` o menos; cada día, los más cerca primero y no más de su tope. Lo
 * que no cae en ningún día (sin punto, lejos o de más) queda sin día, para «Antes de ir», con lo demás de comer.
 */
export function comerPorDias(v: Viaje): { porDia: Map<string, ComerUnDia[]>; sinDia: CosaDelDestino[] } {
  const porDia = new Map<string, ComerUnDia[]>();
  const sinDia: CosaDelDestino[] = [];
  const saber = capaQueVale(v.saber);
  if (saber === null) return { porDia, sinDia };
  const porId = new Map(v.paradas.map((p) => [p.id, p]));
  const deCadaDia = v.dias.map((d) => ({
    fecha: d.fecha,
    paradas: d.paradas.flatMap((id) => (porId.has(id) ? [porId.get(id)!] : [])),
  }));
  const candidatos: (ComerUnDia & { fecha: string })[] = [];
  for (const cosa of saber.cosas) {
    if (cosa.clase !== "food_area" && cosa.clase !== "market") {
      sinDia.push(cosa);
      continue;
    }
    let mejor: (ComerUnDia & { fecha: string }) | null = null;
    if (cosa.punto !== null)
      for (const d of deCadaDia)
        for (const p of d.paradas) {
          const metros = andando(p.punto, cosa.punto);
          if (metros <= PARA_COMER.metros && (mejor === null || metros < mejor.metros))
            mejor = { cosa, parada: p, metros, fecha: d.fecha };
        }
    if (mejor === null) sinDia.push(cosa);
    else candidatos.push(mejor);
  }
  for (const c of [...candidatos].sort((a, b) => a.metros - b.metros)) {
    const suyos = porDia.get(c.fecha) ?? [];
    if (suyos.length >= PARA_COMER.porDia) {
      sinDia.push(c.cosa);
      continue;
    }
    suyos.push({ cosa: c.cosa, parada: c.parada, metros: c.metros });
    porDia.set(c.fecha, suyos);
  }
  // Lo de sin día, en el orden en que lo trae el viaje.
  const orden = new Map(saber.cosas.map((c, i) => [c, i]));
  sinDia.sort((a, b) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0));
  return { porDia, sinDia };
}

const comerParaLaGuia = (c: ComerUnDia): ComerParaLaGuia => ({
  name: c.cosa.nombre ?? SIN_SABER,
  kind: c.cosa.clase as "food_area" | "market",
  says: c.cosa.frase,
  near: c.parada.id,
  metres: c.metros,
});

/** Si cómo moverse trae algo que contar: una manera de llegar, un transporte, un billete, un pago o el coche. */
export const moverseConAlgo = (m: DeMoverse | null): m is DeMoverse =>
  m !== null && m.llegar.length + m.transportes.length + m.billetes.length + m.pagos.length + (m.coche ? 1 : 0) > 0;

/** Cómo moverse y lo que conviene saber sin día, si el viaje los sabe. */
function conLoDeAlli(v: Viaje, sinDia: CosaDelDestino[]): { around?: MoverseParaLaGuia; know?: SaberParaLaGuia[] } {
  const m = capaQueVale(v.moverse);
  const fuera: { around?: MoverseParaLaGuia; know?: SaberParaLaGuia[] } = {};
  if (moverseConAlgo(m))
    fuera.around = {
      arrivals: m.llegar.map((x) => ({
        from: x.desde.clase,
        from_name: x.desde.nombre ?? SIN_SABER,
        mode: x.modo,
        minutes: x.minutos ?? SIN_SABER,
        prices: preciosParaLaGuia(x.precios),
        until: x.hastaLas ?? SIN_SABER,
      })),
      transport: m.transportes.map((x) => ({ mode: x.modo, until: x.hastaLas ?? SIN_SABER })),
      tickets: m.billetes.map((x) => ({
        kind: x.clase,
        days: x.dias,
        rides: x.viajes,
        modes: [...x.modos],
        prices: preciosParaLaGuia(x.precios),
      })),
      payment: m.pagos.map((x) => x.clase),
      car_needed: m.coche === null ? SIN_SABER : m.coche.haceFalta ? "yes" : "no",
    };
  if (sinDia.length > 0)
    fuera.know = sinDia.map((c) => ({
      kind: c.clase,
      name: c.nombre ?? SIN_SABER,
      says: c.frase,
      costs: c.cuesta === null ? SIN_SABER : { from: c.cuesta.desde, to: c.cuesta.hasta, currency: c.cuesta.moneda },
    }));
  return fuera;
}

/** Las maneras de moverse que trae el viaje: las de llegar, las de allí y las que cubren sus billetes. */
export function modosDelViaje(dado: ParaLaGuia): Set<ModoDeMoverse> {
  const a = dado.around;
  if (a === undefined) return new Set();
  return new Set([
    ...a.arrivals.map((x) => x.mode),
    ...a.transport.map((x) => x.mode),
    ...a.tickets.flatMap((x) => x.modes),
  ]);
}

/** Lo que conviene saber, si el viaje lo trae: para que la puerta conozca sus nombres. */
export const delDestinoDe = (v: Viaje): DelDestino | null => capaQueVale(v.saber);

/**
 * Lo que hay que llevar hecho, en un orden fijo: las paradas que se reservan con tiempo, los papeles que piden algo
 * (con su plazo, si lo tiene) y lo de las fechas que cambia el viaje. Lo cuenta el código, no el asiento.
 */
export function cosasQueLlevarHechas(v: Viaje, days: DiaParaLaGuia[]): CosaParaLaGuia[] {
  const cosas: CosaParaLaGuia[] = [];
  for (const d of days)
    for (const p of d.stops)
      if (p.book_ahead === "yes" || p.ticket?.book_ahead === "yes")
        cosas.push({ item: cosas.length, kind: "book_ahead", stop: p.id, name: p.name, date: d.date });
  for (const c of v.papeles?.casillas ?? []) {
    if (c.estado === "in_order") continue;
    cosas.push({
      item: cosas.length,
      kind: "paper",
      country: c.pais,
      question: c.pregunta,
      state: c.estado,
      before: c.antesDe ?? SIN_SABER,
      valid_until: c.hasta ?? SIN_SABER,
      travellers: v.papeles?.viajeros[c.viajero]?.cuantos ?? 0,
    });
  }
  for (const a of v.calendario?.avisos ?? []) {
    if (a.clase === "favours") continue;
    cosas.push({
      item: cosas.length,
      kind: "dates",
      class: a.clase,
      topic: a.tema,
      name: a.nombre ?? SIN_SABER,
      trip_days: a.dias,
    });
  }
  return cosas.slice(0, TOPES_DE_LA_GUIA.antes).map((c, i) => ({ ...c, item: i }));
}

/** Las horas del reloj que trae el viaje: solo las de su transporte, si las lleva. */
export function horasDelViaje(llega: Transporte | null): string[] {
  const horas: string[] = [];
  for (const cuando of [llega?.sale, llega?.vuelve]) {
    const h = /T(\d{2}):(\d{2})/.exec(cuando ?? "");
    if (h !== null) horas.push(`${Number(h[1])}:${h[2]}`);
  }
  return horas;
}
