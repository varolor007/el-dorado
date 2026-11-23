// Saber que dos fuentes hablan del mismo alojamiento: por lo cerca que están y por lo que se parecen sus nombres. Por
// el nombre solo no vale: en la primera prueba, de cinco se encontró uno.

const RADIO_TIERRA = 6_371_000;

export function metros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (g: number): number => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.sqrt(a));
}

const RELLENO = new Set(["hotel", "hotels", "the", "by", "and", "de", "la", "el", "lisbon", "lisboa"]);

export function palabras(nombre: string): Set<string> {
  const limpio = nombre
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ");
  return new Set(limpio.split(/\s+/).filter((p) => p !== "" && !RELLENO.has(p)));
}

/** De 0 a 1: las palabras que comparten dos nombres sobre todas las que tienen. */
export function parecido(a: string, b: string): number {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / (pa.size + pb.size - comunes);
}

export type Punto = { nombre: string; lat: number | null; lon: number | null };
export type Limites = { metros: number; parecido: number };

export const LIMITES: Limites = { metros: 150, parecido: 0.5 };

/** El candidato que es el mismo alojamiento, o null si ninguno lo es con seguridad. */
export function casar<T extends Punto>(a: Punto, candidatos: T[], limites: Limites = LIMITES): T | null {
  if (a.lat === null || a.lon === null) return null;
  let mejor: { c: T; parecido: number; metros: number } | null = null;
  for (const c of candidatos) {
    if (c.lat === null || c.lon === null) continue;
    const d = metros(a.lat, a.lon, c.lat, c.lon);
    const p = parecido(a.nombre, c.nombre);
    if (d > limites.metros || p < limites.parecido) continue;
    if (mejor === null || p > mejor.parecido || (p === mejor.parecido && d < mejor.metros))
      mejor = { c, parecido: p, metros: d };
  }
  return mejor === null ? null : mejor.c;
}
