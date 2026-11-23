// El ritmo: reparte las paradas en los días del viaje, sin IA. Elige las que caben según el ritmo (tranquilo, normal
// o intenso), junta en el mismo día lo que está cerca, ordena cada día para no cruzar la ciudad dos veces y dice lo
// que se anda de una parada a la siguiente. La misma entrada da siempre los mismos días. No sale a internet ni usa
// nada de fuera: lo corren igual la casa y la web, al instante.

import type { Dia, Parada, Punto, Ritmo } from "../output/viaje.ts";

/** Cuántas paradas caben en un día, y cuántos minutos de visita, con cada ritmo. Son de partida. */
export const CABE: Record<Ritmo, { paradas: number; minutos: number }> = {
  calm: { paradas: 3, minutos: 240 },
  normal: { paradas: 5, minutos: 360 },
  full: { paradas: 7, minutos: 480 },
};

/** Lo que se anda de más sobre la línea recta: las calles no van rectas. */
export const RODEO = 1.3;

/** El salto más largo, en línea recta, que se acepta para meter una parada en un día que no es el de su zona. */
export const SALTO = 2000;

const RADIO_DE_LA_TIERRA = 6_371_000;

/** Los metros en línea recta entre dos puntos del mapa. */
export function enLineaRecta(a: Punto, b: Punto): number {
  const rad = (g: number): number => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_DE_LA_TIERRA * Math.asin(Math.sqrt(h));
}

/** Lo que se anda de un sitio a otro: la línea recta con su rodeo, redondeada a la decena. */
export function andando(a: Punto, b: Punto): number {
  return Math.round((enLineaRecta(a, b) * RODEO) / 10) * 10;
}

export type Reparto = { dias: Dia[]; fuera: string[] };

/** Las fechas del viaje, del día de entrada al de salida. */
export function fechasDe(entrada: string, salida: string): string[] {
  const fechas: string[] = [];
  for (let d = new Date(entrada + "T00:00:00Z"); d <= new Date(salida + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1))
    fechas.push(d.toISOString().slice(0, 10));
  return fechas;
}

const puntosDe = (d: { paradas: Parada[] }): Punto[] => d.paradas.map((p) => p.punto);

function centro(puntos: Punto[]): Punto {
  return {
    lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
    lon: puntos.reduce((s, p) => s + p.lon, 0) / puntos.length,
  };
}

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

/**
 * Reparte las paradas en los días. Las paradas llegan por orden de importancia: las primeras entran antes, y las
 * imprescindibles, antes que ninguna. `quitadas` son las que el viajero no quiere: no vuelven solas.
 */
export function repartir(
  paradas: Parada[],
  fechas: string[],
  ritmo: Ritmo,
  base: Punto,
  quitadas: string[] = [],
): Reparto {
  const cabe = CABE[ritmo];
  const porImportancia = [
    ...paradas.filter((p) => p.imprescindible),
    ...paradas.filter((p) => !p.imprescindible),
  ].filter((p) => !quitadas.includes(p.id));
  const dias = fechas.map((fecha) => ({ fecha, paradas: [] as Parada[], minutos: 0 }));
  const fuera: string[] = [...quitadas];
  if (dias.length === 0) return { dias: [], fuera: [...fuera, ...porImportancia.map((p) => p.id)] };

  // Las semillas: una parada por día, las más separadas entre sí de entre las más importantes, para que cada día
  // tenga su zona. La primera, la más importante; cada una de las siguientes, la más lejana a las ya puestas.
  const candidatas = porImportancia.slice(0, dias.length * cabe.paradas);
  const semillas: Parada[] = [];
  while (semillas.length < dias.length && semillas.length < candidatas.length) {
    if (semillas.length === 0) {
      semillas.push(candidatas[0]);
      continue;
    }
    let mejor: Parada | null = null;
    let lejos = -1;
    for (const c of candidatas) {
      if (semillas.includes(c)) continue;
      const d = Math.min(...semillas.map((s) => enLineaRecta(s.punto, c.punto)));
      if (d > lejos) {
        lejos = d;
        mejor = c;
      }
    }
    if (mejor === null) break;
    semillas.push(mejor);
  }
  // Los días van de la zona más cercana a la base a la más lejana: el primero, sin prisa por llegar.
  semillas.sort((a, b) => enLineaRecta(base, a.punto) - enLineaRecta(base, b.punto));
  semillas.forEach((s, i) => {
    dias[i].paradas.push(s);
    dias[i].minutos += s.minutos;
  });

  // Las demás, por importancia: cada una va al día de su zona, la más cercana, si todavía cabe. Si no cabe, solo va
  // a otro día que le quede a menos de un salto: antes fuera que cruzar la ciudad por rellenar un hueco.
  for (const p of porImportancia) {
    if (semillas.includes(p)) continue;
    const porCercania = dias
      .map((d, i) => ({ i, d, lejos: d.paradas.length === 0 ? Infinity : enLineaRecta(centro(puntosDe(d)), p.punto) }))
      .filter((x) => x.d.paradas.length > 0)
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
    dias[destino].paradas.push(p);
    dias[destino].minutos += p.minutos;
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
