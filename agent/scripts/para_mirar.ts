// Lo que se le da al asiento que mira un alojamiento, sacado de la ficha de datos de un finalista. Va a ciegas: sin
// el nombre, sin el precio, sin la nota, sin las estrellas y sin el resumen de opiniones que hace la fuente, para que
// juzgue lo que tiene delante. Las fechas sí van, porque hay cosas que existen pero no para ese viaje.

import type { Estancia, Opinion } from "../tools/fuentes/tipos.ts";
import type { Eleccion } from "../tools/fotos.ts";
import type { Ficha } from "./busqueda_alojamiento.ts";
import { SIN_SABER } from "./niveles.ts";

export const TOPE_DE_OPINIONES = 40;
const TOPE_DE_LETRAS = 700;

export type HojaDeDatos = {
  lodging_id: string;
  stay: { check_in: string; check_out: string; adults: number; children: number };
  room: { id: string; name: string; size_m2: number | string; beds: string[]; declared_views: string[] } | string;
  services: string[];
  check_in_from: string;
  check_out_until: string;
  photos: { room_given: number; room_total: number; hotel_given: number; hotel_total: number };
};

export type OpinionParaMirar = { ref: string; date: string; traveller: string; liked: string; disliked: string };

const corta = (t: string): string => (t.length > TOPE_DE_LETRAS ? t.slice(0, TOPE_DE_LETRAS) + " [cut]" : t);

export function hojaDeDatos(f: Ficha, e: Estancia, fotos: Eleccion): HojaDeDatos {
  const h = f.habitacion;
  return {
    lodging_id: f.alojamiento.id,
    stay: { check_in: e.entrada, check_out: e.salida, adults: e.adultos, children: e.ninos.length },
    room:
      h === null
        ? SIN_SABER
        : { id: h.id, name: h.nombre, size_m2: h.metros ?? SIN_SABER, beds: h.camas, declared_views: h.vistas },
    services: f.detalle?.servicios ?? [],
    check_in_from: f.detalle?.entradaDesde ?? SIN_SABER,
    check_out_until: f.detalle?.salidaHasta ?? SIN_SABER,
    photos: {
      room_given: fotos.habitacion.dadas,
      room_total: fotos.habitacion.total,
      hotel_given: fotos.hotel.dadas,
      hotel_total: fotos.hotel.total,
    },
  };
}

/** Las opiniones más recientes, con su referencia y sin su nota. Las que no dicen nada no van. */
export function opinionesParaMirar(opiniones: Opinion[], tope: number = TOPE_DE_OPINIONES): OpinionParaMirar[] {
  return opiniones
    .filter((o) => o.bueno.trim() !== "" || o.malo.trim() !== "")
    .map((o, i) => ({ o, i }))
    .sort((a, b) => (b.o.fecha ?? "").localeCompare(a.o.fecha ?? "") || a.i - b.i)
    .slice(0, tope)
    .map(({ o }, i) => ({
      ref: `r${i + 1}`,
      date: o.fecha ?? SIN_SABER,
      traveller: o.viajero ?? SIN_SABER,
      liked: corta(o.bueno.trim()),
      disliked: corta(o.malo.trim()),
    }));
}
