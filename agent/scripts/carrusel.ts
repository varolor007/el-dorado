// El carrusel, sin Node: las cartas que se enseñan mientras trabaja la IA (el PM, 26-nov). Cada carta es un sitio de
// verdad del destino, con su foto, su autor y su licencia, y una curiosidad del principio de su artículo de
// Wikipedia, en el idioma del viajero. No la escribe ninguna IA, no lleva un precio ni un consejo, y no es progreso
// de mentira: lo que se ve es lo que la investigación ya ha encontrado.

import { CARTAS_DEL_CARRUSEL, LARGO_DE_UNA_CURIOSIDAD } from "../data/carrusel.ts";
import type { Foto } from "../output/viaje.ts";
import type { Sitio } from "../tools/sitios.ts";

export type Carta = {
  id: string;
  nombre: string;
  foto: Foto | null;
  /** Una o dos frases del principio de su artículo, en el idioma del viajero; si no lo hay, nada. */
  texto: string | null;
  /** De dónde sale el texto: su artículo. */
  articulo: string | null;
};

/** Lo que delata algo que no se enseña tal cual: una dirección, un correo o un teléfono. */
const NO_SE_ENSENA = /https?:\/\/|www\.|@|\+?\d[\d\s().-]{7,}\d/i;

/**
 * Una curiosidad: las primeras frases enteras que caben, sin lo que va entre paréntesis (fechas, pronunciaciones). Si
 * no cabe ni la primera, se deja sin texto: una frase a medias se lee mal.
 */
export function curiosidad(texto: string | null | undefined, largo = LARGO_DE_UNA_CURIOSIDAD): string | null {
  if (typeof texto !== "string") return null;
  const limpio = texto
    .replace(/\s*\([^()]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (limpio === "" || NO_SE_ENSENA.test(limpio)) return null;
  const frases = limpio.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [limpio];
  let salida = "";
  for (const frase of frases) {
    const con = (salida + frase).trim();
    if (con.length > largo) break;
    salida = con + " ";
  }
  const final = salida.trim();
  return final.length >= 20 ? final : null;
}

/** Los sitios que entran en el carrusel: los más conocidos con foto, y si ninguno tiene, los más conocidos. */
export function sitiosDelCarrusel(sitios: Sitio[], cuantas = CARTAS_DEL_CARRUSEL): Sitio[] {
  const conFoto = sitios.filter((s) => s.archivo !== null);
  return (conFoto.length > 0 ? conFoto : sitios).slice(0, cuantas);
}

/** Las cartas, con la foto de cada uno si se encontró y su curiosidad si la hay. Una carta sin nada no sale. */
export function cartasDeLosSitios(sitios: Sitio[], fotos: Map<string, Foto>, textos: Map<string, string>): Carta[] {
  return sitios.flatMap((s) => {
    const foto = s.archivo === null ? null : (fotos.get(s.archivo) ?? null);
    const texto = curiosidad(textos.get(s.id));
    if (foto === null && texto === null) return [];
    return [{ id: s.id, nombre: s.nombre, foto, texto, articulo: texto === null ? null : s.articulo }];
  });
}

/** Lo que se le da a la web de un carrusel guardado: solo cartas con la forma de una carta, y nada más. */
export function cartasQueValen(crudo: unknown): Carta[] {
  const cartas = (crudo as { cartas?: unknown } | null)?.cartas;
  if (!Array.isArray(cartas)) return [];
  const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
  const https = (v: unknown): string | null => {
    const t = texto(v);
    return t !== null && /^https:\/\/[^\s"<>]+$/.test(t) ? t : null;
  };
  return cartas.flatMap((c) => {
    if (typeof c !== "object" || c === null) return [];
    const x = c as Record<string, unknown>;
    const id = texto(x.id);
    const nombre = texto(x.nombre);
    if (id === null || nombre === null) return [];
    const f = x.foto as Record<string, unknown> | null;
    const url = f !== null && typeof f === "object" ? https(f.url) : null;
    const foto: Foto | null =
      url === null ? null : { url, autor: texto(f?.autor), licencia: texto(f?.licencia), pagina: https(f?.pagina) };
    const t = curiosidad(texto(x.texto));
    if (foto === null && t === null) return [];
    return [{ id, nombre, foto, texto: t, articulo: t === null ? null : https(x.articulo) }];
  });
}
