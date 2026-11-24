// La tabla del cruce: el viaje completo, fila a fila, con sus sumas, y las palancas, con sus restas. La hace el
// código y la lee el asiento que cruza, que no hace cuentas: cada número que diga tiene que estar aquí. Una fila es
// un alojamiento finalista con el transporte del viaje, para las fechas y el grupo del viajero. Una palanca es un
// cambio sobre la fila de partida (la mejor por lo que cuesta): otro alojamiento, otra zona, las mismas noches
// movidas o una noche de más o de menos, con lo que cuesta así y lo que ahorra. La misma entrada da la misma tabla.

import { NOTA_MINIMA } from "../data/cribas.ts";
import { enLineaRecta, mediaAndando, type Punto } from "../tools/distancias.ts";
import { paraElGrupo, type Vuelo } from "../tools/fuentes/tipos.ts";
import type { PrecioMovido } from "../tools/palancas.ts";
import type { Busqueda, Ficha } from "./busqueda_alojamiento.ts";
import { cribar, imprescindiblesSinSaber, laMasBarata, laMejorPorLoQueCuesta, quejasSinConfirmar } from "./cribas.ts";
import type { Contexto } from "./cribas.ts";
import { diaDeLaSemana } from "./ruta.ts";
import {
  SIN_SABER,
  type Entendido,
  type EntregaDeMirar,
  type FilaDelCruce,
  type FilaDePalanca,
  type Tabla,
  type ZonaResuelta,
} from "./formas.ts";

export type PiezasDeLaTabla = {
  viaje: Entendido;
  busqueda: Busqueda;
  zonas: ZonaResuelta[];
  /** Lo que entregó el que mira de cada finalista, por su identificador. */
  mirados: Record<string, EntregaDeMirar | null>;
  /** Los sitios a los que se va a ir: las paradas elegidas. */
  paradas: Punto[];
  /** El transporte del viaje para esas fechas: el más barato que se sabe, o null si no hay. */
  transporte: Vuelo | null;
  /** Lo que contestaron las fuentes a cada cambio de fechas, para todos los finalistas. */
  movidos: PrecioMovido[];
  /** Lo que pidió el que cruza para otra ronda, ya contestado: cada uno es una palanca sobre su propia fila. */
  pedidos?: PrecioMovido[];
  ronda: number;
  notas: string[];
};

const dinero = (v: number): number => Math.round(v * 100) / 100;

/** Las partes de la nota, como las lee el asiento en la tabla. */
const PARTE: Record<string, string> = {
  zona: "zone",
  comoEs: "what_it_is_like",
  opiniones: "reviews",
  encaje: "fit_with_the_group",
  condiciones: "conditions",
};

/** En qué zona de la ruta cae un alojamiento: la más cercana de las que lo tienen dentro; si no, la más cercana. */
export function zonaDe(punto: Punto, zonas: ZonaResuelta[]): ZonaResuelta | null {
  if (zonas.length === 0) return null;
  const conDistancia = zonas.map((z) => ({ z, metros: enLineaRecta(punto, z.centre) }));
  const dentro = conDistancia.filter((x) => x.metros <= x.z.radius_m);
  return (dentro.length > 0 ? dentro : conDistancia).sort(
    (a, b) => a.metros - b.metros || a.z.id.localeCompare(b.z.id),
  )[0].z;
}

export function montarTabla(p: PiezasDeLaTabla): Tabla {
  const e = p.busqueda.estancia;
  const ctx: Contexto = { gustos: p.viaje.tastes, paradas: p.paradas };
  const candidatos = p.busqueda.finalistas.map((ficha) => ({ ficha, mirado: p.mirados[ficha.alojamiento.id] ?? null }));
  const cribados = cribar(candidatos, ctx);
  // El transporte, para todos los que viajan: el alojamiento ya es del grupo, y un billete, de uno.
  const viajeros = e.adultos + e.ninos.length;
  const deTransporte = p.transporte === null ? null : paraElGrupo(p.transporte, viajeros);
  const notas = [...p.notas];
  if (p.transporte !== null && p.transporte.pasajeros < viajeros)
    notas.push(
      `transport: the price is a fare for ${p.transporte.pasajeros}, multiplied for the ${viajeros} travellers` +
        (e.ninos.length > 0 ? "; a child may pay a different fare, so it is not confirmed" : ""),
    );

  const rows: FilaDelCruce[] = candidatos.map((c, i) => {
    const f: Ficha = c.ficha;
    const cribado = cribados[i];
    const zona = zonaDe({ lat: f.alojamiento.lat, lon: f.alojamiento.lon }, p.zonas);
    const sinSaber = [
      ...imprescindiblesSinSaber(c, ctx).map((cosa) => `must:${cosa}`),
      // Una queja grave que el código ve por palabras y nadie ha confirmado: se dice, no descarta.
      ...quejasSinConfirmar(c).map((queja) => `serious:${queja}`),
    ];
    return {
      id: `r${i + 1}`,
      lodging: f.alojamiento.id,
      lodging_label: f.alojamiento.nombre,
      zone: zona?.id ?? null,
      transport: p.transporte === null ? null : "t1",
      check_in: e.entrada,
      check_out: e.salida,
      adults: e.adultos,
      children: e.ninos.length,
      rooms: e.habitaciones,
      lodging_total: cribado.total,
      transport_total: deTransporte,
      total: dinero(cribado.total + (deTransporte ?? 0)),
      currency: e.moneda,
      score: cribado.nota.nota ?? SIN_SABER,
      unconfirmed: [...cribado.nota.sinConfirmar.map((parte) => PARTE[parte] ?? parte), ...sinSaber],
      minutes_to_sights: cribado.minutos ?? SIN_SABER,
      cancellable: f.precio.cancelable ?? SIN_SABER,
      marks: [],
      discarded: cribado.descartado ?? "",
    };
  });

  // Lo que saca el código: la más barata que pasa de la nota mínima y la mejor por lo que cuesta.
  const elegibles = rows
    .filter((r) => r.discarded === "")
    .map((r) => ({ id: r.id, total: r.total, nota: typeof r.score === "number" ? r.score : null }));
  const barata = laMasBarata(elegibles, NOTA_MINIMA);
  const mejor = laMejorPorLoQueCuesta(elegibles, NOTA_MINIMA, p.viaje.budget);
  for (const r of rows) {
    if (r.id === barata) r.marks.push("cheapest");
    if (r.id === mejor) r.marks.push("best_value");
  }

  // Las palancas, sobre la fila de partida: la mejor por lo que cuesta; si no la hay, la primera que sigue.
  const partida = rows.find((r) => r.id === mejor) ?? rows.find((r) => r.discarded === "");
  const levers: FilaDePalanca[] = [];
  const palanca = (l: Omit<FilaDePalanca, "id">): void => void levers.push({ id: `l${levers.length + 1}`, ...l });
  const resta = (a: number | string, b: number | string): number | string =>
    typeof a === "number" && typeof b === "number" ? Math.round((a - b) * 10) / 10 : SIN_SABER;

  if (partida !== undefined) {
    const otras = rows.filter((r) => r.id !== partida.id && r.discarded === "");
    for (const r of otras) {
      palanca({
        lever: "other_lodging",
        base_row: partida.id,
        change: { row: r.id, lodging: r.lodging, lodging_label: r.lodging_label },
        status: "priced",
        total: r.total,
        saves: dinero(partida.total - r.total),
        minutes_change: resta(r.minutes_to_sights, partida.minutes_to_sights),
        score: r.score,
        note: "",
      });
    }
    // Otra zona: la más barata de cada zona que no es la de partida.
    const zonas = [...new Set(otras.map((r) => r.zone).filter((z): z is string => z !== null && z !== partida.zone))];
    for (const z of zonas.sort()) {
      const r = otras.filter((x) => x.zone === z).sort((a, b) => a.total - b.total || a.id.localeCompare(b.id))[0];
      palanca({
        lever: "other_zone",
        base_row: partida.id,
        change: { row: r.id, zone: z, lodging: r.lodging, lodging_label: r.lodging_label },
        status: "priced",
        total: r.total,
        saves: dinero(partida.total - r.total),
        minutes_change: resta(r.minutes_to_sights, partida.minutes_to_sights),
        score: r.score,
        note: "",
      });
    }
    // Las fechas: lo mismo, para otras noches. El total lleva el transporte de esas fechas, o no hay total.
    const deFechas = (m: PrecioMovido, sobre: FilaDelCruce): void => {
      const faltaTransporte = sobre.transport !== null && m.transporte === null;
      const total = m.total === null || faltaTransporte ? null : dinero(m.total + (m.transporte ?? 0));
      palanca({
        lever: m.palanca,
        base_row: sobre.id,
        // A unas fechas nuevas se les pone su día de la semana: es como las entiende quien viaja.
        change: {
          check_in: m.entrada,
          check_in_weekday: diaDeLaSemana(m.entrada),
          check_out: m.salida,
          check_out_weekday: diaDeLaSemana(m.salida),
          days_moved: m.dias,
          nights_changed: m.noches,
        },
        status: total === null ? "no_price" : "priced",
        total: total ?? SIN_SABER,
        saves: total === null ? SIN_SABER : dinero(sobre.total - total),
        minutes_change: 0,
        score: sobre.score,
        note: m.nota,
      });
    };
    for (const m of p.movidos.filter((x) => x.alojamiento === partida.lodging)) deFechas(m, partida);
    for (const m of p.pedidos ?? []) {
      const sobre = rows.find((r) => r.lodging === m.alojamiento && r.discarded === "");
      if (sobre !== undefined) deFechas(m, sobre);
    }
  }

  const aPie = cribados.every((c) => c.aPie);
  if (!aPie)
    notas.push(
      "getting around: this trip is not walked from where one sleeps; minutes_to_sights are by car or public " +
        "transport, an estimate from the distance and not a route: what there is and what it costs is not known",
    );
  return { currency: e.moneda, on_foot: aPie, minimum_score: NOTA_MINIMA, round: p.ronda, rows, levers, notes: notas };
}

/** Lo que se anda, de media, desde un alojamiento hasta unas paradas: para decir qué te deja más cerca de cada día. */
export function andandoHasta(f: Ficha, paradas: Punto[]): number | null {
  return mediaAndando({ lat: f.alojamiento.lat, lon: f.alojamiento.lon }, paradas);
}
