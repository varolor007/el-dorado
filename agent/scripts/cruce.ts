// Saber que dos fuentes hablan del mismo alojamiento: por lo cerca que están y por lo que se parecen sus nombres. Por
// el nombre solo no vale: en la primera prueba, de cinco se encontró uno.

import { enLineaRecta } from "../tools/distancias.ts";

export function metros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return enLineaRecta({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
}

/** Las palabras que no distinguen un alojamiento de otro. El nombre del destino tampoco: se le pasa aparte. */
const RELLENO = new Set(["hotel", "hotels", "the", "by", "and", "de", "la", "el"]);

const sueltas = (texto: string): string[] =>
  texto
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p !== "");

/** Las palabras de un nombre que lo distinguen: sin las de relleno ni las del sitio donde está. */
export function palabras(nombre: string, lugar = ""): Set<string> {
  const delLugar = new Set(sueltas(lugar));
  return new Set(sueltas(nombre).filter((p) => !RELLENO.has(p) && !delLugar.has(p)));
}

/** De 0 a 1: las palabras que comparten dos nombres sobre todas las que tienen. */
export function parecido(a: string, b: string, lugar = ""): number {
  const pa = palabras(a, lugar);
  const pb = palabras(b, lugar);
  if (pa.size === 0 || pb.size === 0) return 0;
  // Las palabras del sitio no distinguen a un alojamiento, salvo cuando cada nombre lleva una distinta: dos que solo
  // se diferencian en el barrio que nombran son dos alojamientos, no uno.
  const delLugar = new Set(sueltas(lugar));
  const sitioDe = (nombre: string): string[] => sueltas(nombre).filter((p) => delLugar.has(p));
  const [sa, sb] = [sitioDe(a), sitioDe(b)];
  if (sa.length > 0 && sb.length > 0 && !sa.some((p) => sb.includes(p))) return 0;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / (pa.size + pb.size - comunes);
}

export type Punto = { nombre: string; lat: number | null; lon: number | null };
export type Limites = { metros: number; parecido: number };

export const LIMITES: Limites = { metros: 150, parecido: 0.5 };

/** El candidato que es el mismo alojamiento, o null si ninguno lo es con seguridad. */
export function casar<T extends Punto>(a: Punto, candidatos: T[], limites: Limites = LIMITES, lugar = ""): T | null {
  if (a.lat === null || a.lon === null) return null;
  let mejor: { c: T; parecido: number; metros: number } | null = null;
  for (const c of candidatos) {
    if (c.lat === null || c.lon === null) continue;
    const d = metros(a.lat, a.lon, c.lat, c.lon);
    const p = parecido(a.nombre, c.nombre, lugar);
    if (d > limites.metros || p < limites.parecido) continue;
    if (mejor === null || p > mejor.parecido || (p === mejor.parecido && d < mejor.metros))
      mejor = { c, parecido: p, metros: d };
  }
  return mejor === null ? null : mejor.c;
}
