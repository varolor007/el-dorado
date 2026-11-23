// El ritmo: reparte las paradas en los días del viaje, sin IA. Elige las que caben según el ritmo (tranquilo, normal
// o intenso), junta en el mismo día lo que está cerca, ordena cada día para no cruzar la ciudad dos veces y dice lo
// que se anda de una parada a la siguiente. La misma entrada da siempre los mismos días. No sale a internet ni usa
// nada de fuera: lo corren igual la casa y la web, al instante.

import type { Dia, Parada, Punto, Ritmo } from "../output/viaje.ts";
import { andando, centroDe, enLineaRecta } from "../tools/distancias.ts";

export { andando, enLineaRecta, RODEO } from "../tools/distancias.ts";

/** Cuántas paradas caben en un día, y cuántos minutos de visita, con cada ritmo. Son de partida. */
export const CABE: Record<Ritmo, { paradas: number; minutos: number }> = {
  calm: { paradas: 3, minutos: 240 },
  normal: { paradas: 5, minutos: 360 },
  full: { paradas: 7, minutos: 480 },
};

/** El salto más largo, en línea recta, que se acepta para meter una parada en un día que no es el de su zona. */
export const SALTO = 2000;

export type Reparto = { dias: Dia[]; fuera: string[] };

/** Las fechas del viaje, del día de entrada al de salida. */
export function fechasDe(entrada: string, salida: string): string[] {
  const fechas: string[] = [];
  for (let d = new Date(entrada + "T00:00:00Z"); d <= new Date(salida + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1))
    fechas.push(d.toISOString().slice(0, 10));
  return fechas;
}

const puntosDe = (d: { paradas: Parada[] }): Punto[] => d.paradas.map((p) => p.punto);

/** Todas las maneras de ordenar una lista corta. */
function ordenes<T>(lista: T[]): T[][] {
  if (lista.length <= 1) return [lista];
  return lista.flatMap((x, i) => ordenes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]));
}

/** Lo que se recorre saliendo de la base y pasando por las paradas en ese orden, en línea recta. */
function recorrido(orden: Parada[], base: Punto): number {
  let total = 0;
  let desde = base;
  for (const p of orden) {
    total += enLineaRecta(desde, p.punto);
    desde = p.punto;
  }
  return total;
}

/**
 * Ordena las paradas de un día para andar lo menos posible saliendo de la base. Con pocas paradas se prueban todos
 * los órdenes; con muchas, se va siempre a la más cercana. A igualdad, gana el orden en que llegaron.
 */
function enOrden(paradas: Parada[], base: Punto): Parada[] {
  if (paradas.length <= 7) {
    let mejor = paradas;
    let menos = Infinity;
    for (const orden of ordenes(paradas)) {
      const metros = recorrido(orden, base);
      if (metros < menos - 1e-6) {
        menos = metros;
        mejor = orden;
      }
    }
    return mejor;
  }
  const quedan = [...paradas];
  const orden: Parada[] = [];
  let desde = base;
  while (quedan.length > 0) {
    let mejor = 0;
    for (let i = 1; i < quedan.length; i++) {
      if (enLineaRecta(desde, quedan[i].punto) < enLineaRecta(desde, quedan[mejor].punto)) mejor = i;
    }
    const [siguiente] = quedan.splice(mejor, 1);
    orden.push(siguiente);
    desde = siguiente.punto;
  }
  return orden;
}

/** Lo que el viajero ha cambiado a mano: lo que quitó, lo que añadió de lo que se quedó fuera y lo que movió de día. */
export type Cambios = { quitadas?: string[]; anadidas?: string[]; fijadas?: Record<string, number> };

/**
 * Reparte las paradas en los días. Las paradas llegan por orden de importancia: las primeras entran antes, y las
 * imprescindibles, antes que ninguna. Lo que el viajero cambió a mano manda sobre el ritmo: lo que quitó no vuelve
 * solo, lo que movió a un día se queda en ese día y lo que añadió entra aunque el día ya esté lleno.
 */
export function repartir(
  paradas: Parada[],
  fechas: string[],
  ritmo: Ritmo,
  base: Punto,
  cambios: Cambios = {},
): Reparto {
  const cabe = CABE[ritmo];
  const quitadas = (cambios.quitadas ?? []).filter((id) => paradas.some((p) => p.id === id));
  const anadidas = cambios.anadidas ?? [];
  const fijadas = cambios.fijadas ?? {};
  const porImportancia = [
    ...paradas.filter((p) => p.imprescindible),
    ...paradas.filter((p) => !p.imprescindible),
  ].filter((p) => !quitadas.includes(p.id));
  const dias = fechas.map((fecha) => ({ fecha, paradas: [] as Parada[], minutos: 0 }));
  const fuera: string[] = [...quitadas];
  if (dias.length === 0) return { dias: [], fuera: [...fuera, ...porImportancia.map((p) => p.id)] };

  const puestas = new Set<string>();
  const pon = (i: number, p: Parada): void => {
    dias[i].paradas.push(p);
    dias[i].minutos += p.minutos;
    puestas.add(p.id);
  };
  const conParadas = (): { i: number; centro: Punto }[] =>
    dias.flatMap((d, i) => (d.paradas.length === 0 ? [] : [{ i, centro: centroDe(puntosDe(d)) }]));
  const masCercano = (p: Parada): number => {
    const zonas = conParadas().sort((a, b) => enLineaRecta(a.centro, p.punto) - enLineaRecta(b.centro, p.punto));
    return zonas[0]?.i ?? 0;
  };

  // 1. Lo que el viajero movió a un día va a ese día, quepa o no.
  for (const p of porImportancia) {
    const i = fijadas[p.id];
    if (i !== undefined && Number.isInteger(i) && i >= 0 && i < dias.length) pon(i, p);
  }

  // 2. Las semillas: una parada para cada día que sigue vacío, las más separadas entre sí y de los días ya ocupados
  // de entre las más importantes, para que cada día tenga su zona. La primera, la más importante.
  const libres = porImportancia.filter((p) => !puestas.has(p.id));
  const candidatas = libres.slice(0, dias.length * cabe.paradas);
  const vacios = dias.flatMap((d, i) => (d.paradas.length === 0 ? [i] : []));
  const ocupados = conParadas().map((z) => z.centro);
  const semillas: Parada[] = [];
  while (semillas.length < vacios.length && semillas.length < candidatas.length) {
    const yaHay = [...ocupados, ...semillas.map((s) => s.punto)];
    if (yaHay.length === 0) {
      semillas.push(candidatas[0]);
      continue;
    }
    let mejor: Parada | null = null;
    let lejos = -1;
    for (const c of candidatas) {
      if (semillas.includes(c)) continue;
      const d = Math.min(...yaHay.map((s) => enLineaRecta(s, c.punto)));
      if (d > lejos) {
        lejos = d;
        mejor = c;
      }
    }
    if (mejor === null) break;
    semillas.push(mejor);
  }
  // Los días vacíos se llenan de la zona más cercana a la base a la más lejana: el primero, sin prisa por llegar.
  semillas.sort((a, b) => enLineaRecta(base, a.punto) - enLineaRecta(base, b.punto));
  semillas.forEach((s, n) => pon(vacios[n], s));

  // 3. Las demás, por importancia: cada una va al día de su zona, la más cercana, si todavía cabe. Si no cabe, solo
  // va a otro día que le quede a menos de un salto: antes fuera que cruzar la ciudad por rellenar un hueco.
  for (const p of porImportancia) {
    if (puestas.has(p.id) || anadidas.includes(p.id)) continue;
    const porCercania = conParadas()
      .map((z) => ({ i: z.i, d: dias[z.i], lejos: enLineaRecta(z.centro, p.punto) }))
      .sort((a, b) => a.lejos - b.lejos);
    const cabeEn = (d: (typeof dias)[number]): boolean =>
      d.paradas.length < cabe.paradas && d.minutos + p.minutos <= cabe.minutos;
    let destino = -1;
    if (porCercania.length > 0 && cabeEn(porCercania[0].d)) destino = porCercania[0].i;
    else destino = porCercania.find((x) => x.lejos <= SALTO && cabeEn(x.d))?.i ?? -1;
    if (destino < 0) destino = dias.findIndex((d) => d.paradas.length === 0);
    if (destino < 0) {
      fuera.push(p.id);
      continue;
    }
    pon(destino, p);
  }

  // 4. Lo que el viajero añadió entra al final en su zona, aunque el día ya esté lleno: no le quita el sitio a nadie.
  for (const p of libres) {
    if (anadidas.includes(p.id) && !puestas.has(p.id)) pon(masCercano(p), p);
  }

  return {
    dias: dias.map((d) => {
      const orden = enOrden(d.paradas, base);
      // El día se llama como su parada más importante.
      const titulo = porImportancia.find((p) => d.paradas.includes(p))?.nombre ?? "";
      return {
        fecha: d.fecha,
        titulo,
        paradas: orden.map((p) => p.id),
        metros: orden.slice(1).map((p, i) => andando(orden[i].punto, p.punto)),
      };
    }),
    fuera,
  };
}
