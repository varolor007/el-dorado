// Lo que el código hace alrededor del asiento que elige los sitios: le prepara la lista de los datos abiertos y,
// cuando entrega, convierte lo que eligió en las paradas del viaje, con su sitio en el mapa, su fuente y su foto.
// Repartirlas por días es cosa del ritmo.

import { SITIOS_PARA_ELEGIR, SITIOS_POR_NOCHE } from "../data/dias.ts";
import type { Foto, Parada } from "../output/viaje.ts";
import type { Sitio } from "../tools/sitios.ts";
import type { EntregaDeSitios, Lugar } from "./formas.ts";
import { lugarDe } from "./ruta.ts";

/** Cuántos sitios se dan a elegir para un viaje de esas noches. */
export function cuantosSitios(noches: number): number {
  const porNoches = SITIOS_POR_NOCHE * Math.max(1, Math.round(noches));
  return Math.min(SITIOS_PARA_ELEGIR.maximo, Math.max(SITIOS_PARA_ELEGIR.minimo, porNoches));
}

/** Los sitios que se le dan a elegir: los más conocidos, tantos como pidan las noches, con lo que dice su artículo. */
export function sitiosParaElegir(sitios: Sitio[], noches: number, resumenes: Map<string, string> = new Map()): Lugar[] {
  return sitios.slice(0, cuantosSitios(noches)).map((s) => lugarDe(s, resumenes.get(s.id)));
}

/** Una foto solo se enseña con su autor y su licencia: sin ellos, la parada va sin foto. */
function fotoQueSePuedeEnsenar(f: Foto | undefined): Foto | null {
  return f === undefined || f.autor === null || f.licencia === null ? null : f;
}

/**
 * Las paradas del viaje, por orden de importancia, a partir de lo que eligió el asiento. Solo se llama con una
 * entrega que pasó su puerta: aquí un sitio que no está en los datos es un error.
 */
export function paradasDe(entrega: EntregaDeSitios, sitios: Sitio[], fotos: Map<string, Foto> = new Map()): Parada[] {
  const porId = new Map(sitios.map((s) => [s.id, s]));
  return entrega.go.map((elegido) => {
    const s = porId.get(elegido.id);
    if (s === undefined) throw new Error(`se eligió ${elegido.id}, que no está en los datos`);
    const parada: Parada = {
      id: s.id,
      nombre: s.nombre,
      clase: s.clase,
      punto: s.punto,
      porQue: elegido.why,
      minutos: elegido.minutes,
      imprescindible: elegido.must,
      foto: s.archivo === null ? null : fotoQueSePuedeEnsenar(fotos.get(s.archivo)),
      origen: { fuente: s.fuente, visto: s.visto, enlace: s.articulo ?? `https://www.wikidata.org/wiki/${s.id}` },
    };
    if (elegido.best_time !== "any") parada.mejorHora = elegido.best_time;
    if (elegido.book_ahead !== "unknown") parada.reservar = elegido.book_ahead === "yes";
    return parada;
  });
}
