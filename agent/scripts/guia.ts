// Lo que el código le prepara al que escribe la guía: el viaje cerrado, día a día, con lo que dicen de cada parada sus
// fuentes abiertas, lo que se anda de un punto a otro (de la tabla de caminos o de la cuenta de la casa), dónde se
// duerme y cómo se llega, y lo que hay que llevar hecho. Sin un solo precio: los precios los pone el cuaderno, con su
// fecha. El asiento no calcula ni elige: cuenta lo que hay.

import { TOPES_DE_LA_GUIA } from "../data/guia.ts";
import type { Alojamiento, Manera, Parada, Punto, Transporte, Viaje } from "../output/viaje.ts";
import { caminosDe, trayectoEntre } from "../tools/caminos.ts";
import { SIN_SABER, type Entendido } from "./formas.ts";
import { diasDe } from "./ruta.ts";

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
};

export type DiaParaLaGuia = {
  date: string;
  weekday: string;
  title: string;
  stops: ParadaParaLaGuia[];
  legs: TramoParaLaGuia[];
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
};

/** La manera con que se hace el viaje: la que se pidió, o la única que tiene. Sin ella no se sabe dónde se duerme. */
export function maneraDeLaGuia(v: Viaje, pedida?: string | null): Manera | null {
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
      title: d.titulo,
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
      })),
      legs,
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
  };
}

/**
 * Lo que hay que llevar hecho, en un orden fijo: las paradas que se reservan con tiempo, los papeles que piden algo
 * (con su plazo, si lo tiene) y lo de las fechas que cambia el viaje. Lo cuenta el código, no el asiento.
 */
export function cosasQueLlevarHechas(v: Viaje, days: DiaParaLaGuia[]): CosaParaLaGuia[] {
  const cosas: CosaParaLaGuia[] = [];
  for (const d of days)
    for (const p of d.stops)
      if (p.book_ahead === "yes")
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
