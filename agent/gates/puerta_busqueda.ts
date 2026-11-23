// La puerta de la búsqueda de alojamiento: lo que el código comprueba, desde fuera, antes de dar una búsqueda por
// buena. Mide cuentas, forma y que las piezas casen; no mide si un alojamiento es bueno.

import type { Busqueda } from "../scripts/busqueda_alojamiento.ts";
import { completo } from "../scripts/finalistas.ts";
import { motivoDeDescarte } from "../scripts/minimos.ts";
import type { Origen, Precio } from "../tools/fuentes/tipos.ts";

export type Rojo = { donde: string; que: string };
export type Veredicto = { verde: boolean; rojos: Rojo[] };

function conOrigen(d: Origen): boolean {
  return d.fuente.trim() !== "" && !Number.isNaN(Date.parse(d.visto));
}

function precioDeLaEstancia(p: Precio, b: Busqueda): string | null {
  if (p.entrada !== b.estancia.entrada || p.salida !== b.estancia.salida) return "es de otras fechas";
  if (p.adultos !== b.estancia.adultos) return "es para otro número de adultos";
  if (p.moneda.toUpperCase() !== b.estancia.moneda.toUpperCase())
    return `está en ${p.moneda} y se pidió ${b.estancia.moneda}`;
  if (!(p.total > 0) || p.tasasAparte < 0) return "no es un importe válido";
  return null;
}

export function puertaBusqueda(b: Busqueda, maximoDeFinalistas: number): Veredicto {
  const rojos: Rojo[] = [];
  const dentro = new Set(b.dentro.map((a) => a.id));

  for (const a of b.dentro) {
    const motivo = motivoDeDescarte(a, b.minimos);
    if (motivo !== null) rojos.push({ donde: a.id, que: `está dentro y no cumple los mínimos: ${motivo}` });
    if (!conOrigen(a)) rojos.push({ donde: a.id, que: "no dice de qué fuente sale o cuándo se vio" });
  }
  for (const d of b.fuera) if (d.motivo.trim() === "") rojos.push({ donde: d.id, que: "descartado sin motivo" });
  if (b.dentro.length + b.fuera.length !== b.devueltos)
    rojos.push({ donde: "lista", que: "los de dentro y los descartados no suman los devueltos" });

  for (const c of b.conPrecio) {
    if (c.precio.id !== c.alojamiento.id)
      rojos.push({ donde: c.alojamiento.id, que: "lleva el precio de otro alojamiento" });
    if (!dentro.has(c.alojamiento.id))
      rojos.push({ donde: c.alojamiento.id, que: "tiene precio y no pasó los mínimos" });
    const pega = precioDeLaEstancia(c.precio, b);
    if (pega !== null) rojos.push({ donde: c.alojamiento.id, que: `su precio ${pega}` });
    if (!conOrigen(c.precio))
      rojos.push({ donde: c.alojamiento.id, que: "su precio no dice de qué fuente sale o cuándo se vio" });
  }

  if (b.finalistas.length > maximoDeFinalistas)
    rojos.push({ donde: "finalistas", que: `hay ${b.finalistas.length} y el tope es ${maximoDeFinalistas}` });
  const vistos = new Set<string>();
  for (const f of b.finalistas) {
    const id = f.alojamiento.id;
    if (vistos.has(id)) rojos.push({ donde: id, que: "sale dos veces entre los finalistas" });
    vistos.add(id);
    if (!b.conPrecio.some((c) => c.alojamiento.id === id))
      rojos.push({ donde: id, que: "es finalista y no tiene precio" });
    if (f.precioCompleto !== completo(f.precio))
      rojos.push({ donde: id, que: "su precio completo no es el total más lo que se paga aparte" });
    if (f.habitacion !== null && f.habitacion.id !== f.precio.idHabitacion)
      rojos.push({ donde: id, que: "la habitación que se enseña no es la de ese precio" });
    if (f.habitacion === null && !f.avisos.some((a) => a.includes("habitación") || a.includes("detalle"))) {
      rojos.push({ donde: id, que: "falta la habitación de ese precio y no se avisa" });
    }
    if (f.motivo.trim() === "") rojos.push({ donde: id, que: "es finalista sin motivo" });
  }
  return { verde: rojos.length === 0, rojos };
}
