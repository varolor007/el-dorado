// La puerta 8: ¿todo cuadra? Lo que el código comprueba, desde fuera, de un viaje cerrado antes de dárselo a la web.
// No se fía de lo que se montó: lo vuelve a contar desde lo que dio cada fuente, lo que respondió cada enlace y lo
// que se sabe de la llegada, y da rojo a lo que no casa. Mide cuatro cosas, como dice la hoja: las noches con las
// fechas, las horas de llegada con la entrada al alojamiento (lo que no se sabe no se da por bueno), que cada enlace
// que se enseña como vivo respondió, y que ningún precio que se da por bueno pasa de su edad máxima.

import type { Cierre, PrecioDeHoy, Viaje } from "../output/viaje.ts";
import { pegasDelCierre } from "../output/viaje.ts";
import {
  edadDe,
  llegadaDe,
  mapasDe,
  pideSeguir,
  plazosDe,
  precioDeHoy,
  reservasDe,
  sinConfirmarDe,
  totalDeHoy,
  type DeHoy,
  type ParaLaLlegada,
  type PiezaElegida,
} from "../scripts/cierre.ts";
import { fechasDe } from "../scripts/ritmo.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import type { ComprobacionDeEnlace } from "../output/viaje.ts";

/** Lo que la casa tuvo delante al cerrar: lo que dio cada fuente hoy, lo que respondió cada enlace y la llegada. */
export type MaterialDelCierre = {
  piezas: PiezaElegida[];
  /** Lo que dio la fuente hoy de cada pieza, por su identificador. */
  dados: Record<string, DeHoy>;
  /** Lo que respondió cada enlace que se comprobó, por su dirección. Lo que no está aquí no se comprobó. */
  comprobados: Record<string, ComprobacionDeEnlace>;
  llegada: ParaLaLlegada;
};

const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const conjunto = (xs: { que: string; ref: string | null }[]): string =>
  JSON.stringify(xs.map((x) => `${x.que}|${x.ref ?? ""}`).sort());

export function puertaCierre(v: Viaje, m: MaterialDelCierre): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const c: Cierre | undefined = v.cierre;
  if (c === undefined) return { verde: false, rojos: [{ donde: "cierre", que: "el viaje no está cerrado" }] };
  for (const p of pegasDelCierre(c, v)) rojo(p.donde, p.que);

  // Las noches, con las fechas: el precio de hoy del alojamiento es de esas noches, y los días caen dentro.
  const fechas = fechasDe(v.entrada, v.salida);
  if (fechas.length < 2) rojo("noches", "el viaje no tiene ni una noche");
  for (const p of c.precios.filter((x) => x.pieza === "lodging" && x.hoy !== null))
    if (p.noches === null || p.noches.entrada !== v.entrada || p.noches.salida !== v.salida)
      rojo(`precios.${p.ref}`, "el precio de hoy del alojamiento no es de las noches del viaje");
  for (const d of v.dias)
    if (!fechas.includes(d.fecha)) rojo("noches", `el día ${d.fecha} no es de las fechas del viaje`);
  if (v.dias.length > fechas.length) rojo("noches", "hay más días que fechas");

  // Cada precio, el que dio su fuente, y ninguno que se da por bueno pasa de su edad máxima.
  const deNuevo: PrecioDeHoy[] = m.piezas.map((p) => precioDeHoy(p, m.dados[p.ref] ?? "unknown", c.cuando));
  if (!igual(deNuevo, c.precios)) rojo("precios", "los precios de hoy no son los que dio cada fuente");
  for (const p of c.precios) {
    if (p.hoy === null || p.edad === null) continue;
    const guardado =
      m.dados[p.ref] !== undefined &&
      typeof m.dados[p.ref] === "object" &&
      (m.dados[p.ref] as { guardado: boolean }).guardado;
    const edad = edadDe(p.hoy.visto, c.cuando, guardado);
    if (p.edad !== "stale" && edad === "stale")
      rojo(`precios.${p.ref}`, "un precio pasa de su edad máxima y se da por bueno");
    if (p.edad !== edad) rojo(`precios.${p.ref}`, "la edad del precio no es la que tiene");
  }
  if (c.total.hoy !== totalDeHoy(c.precios)) rojo("total", "el total de hoy no es la suma de los precios de hoy");
  if (c.subida.pide !== pideSeguir(c.precios, c.total.antes))
    rojo("subida", "lo que pide al viajero no casa con lo que cambió");
  if (c.subida.pide && !c.subida.sigue) rojo("subida", "un precio cambió mucho y el viajero no ha dicho que sigue");

  // La llegada, con la entrada: lo que no se sabe no se da por bueno.
  const llegada = llegadaDe(m.llegada);
  if (c.llegada !== llegada) rojo("llegada", `la llegada no es la que sale de sus horas: ${llegada}`);
  if (c.entradaDesde !== m.llegada.entradaDesde) rojo("llegada", "la hora de entrada no es la que dio la fuente");

  // Cada enlace que se enseña como vivo, respondió; el que no se comprobó, no se da por vivo.
  for (const e of c.enlaces) {
    const visto = m.comprobados[e.url] ?? "unchecked";
    if (e.comprobado !== visto) rojo(`enlaces.${e.ref}`, `un enlace dice ${e.comprobado}, y lo que se vio es ${visto}`);
  }

  // El orden, los plazos, lo que queda sin confirmar y los mapas, los del código.
  if (
    !igual(
      c.reservas.map(({ frase: _, ...r }) => r),
      reservasDe(v, m.piezas, c.precios),
    )
  )
    rojo("reservas", "el orden de las reservas no es el del código");
  if (
    !igual(
      c.papeles.map(({ frase: _, ...p }) => p),
      plazosDe(v),
    )
  )
    rojo("papeles", "los plazos no son los de la tabla");
  if (conjunto(c.sinConfirmar) !== conjunto(sinConfirmarDe(v, c.precios, c.enlaces, c.llegada)))
    rojo("sinConfirmar", "lo que queda sin confirmar no es lo que sale de lo demás");
  if (!igual(c.mapas, mapasDe(v, c.alojamiento))) rojo("mapas", "los enlaces de los mapas no son los del viaje");

  return { verde: rojos.length === 0, rojos };
}
