// El ritmo: reparte las paradas en los días del viaje, sin IA. Elige las que caben según el ritmo (tranquilo, normal
// o intenso), junta en el mismo día lo que está cerca, ordena cada día para no cruzar la ciudad dos veces y dice lo
// que se anda de una parada a la siguiente. La misma entrada da siempre los mismos días. No sale a internet ni usa
// nada de fuera: lo corren igual la casa y la web, al instante.

import { CABE, CERCA_DE_UN_DIA, DIA_ENTERO, MOTIVOS_DE_FUERA } from "../data/dias.ts";
import { TRAYECTO_DE_UN_DIA } from "../data/moverse.ts";
import type { Dia, Parada, Punto, Ritmo } from "../output/viaje.ts";
import { caminosDe, costeEntre, trayectoEntre, type Caminos, type TablaDeCaminos } from "../tools/caminos.ts";
import { centroDe, enLineaRecta } from "../tools/distancias.ts";

export { CABE } from "../data/dias.ts";
export { andando, enLineaRecta, RODEO } from "../tools/distancias.ts";

/** Lo cerca que tiene que estar una parada del centro de un día, en línea recta, para juntarse con él. */
export const SALTO = CERCA_DE_UN_DIA;

export type Motivo = (typeof MOTIVOS_DE_FUERA)[number];
/** Los días, lo que se queda fuera y por qué se queda fuera cada parada. */
export type Reparto = { dias: Dia[]; fuera: string[]; porQue: Record<string, Motivo> };

/**
 * En qué orden se abren los días libres: primero los de en medio, que son días enteros, y al final el de llegada y
 * el de salida, que casi nunca lo son. Lo más importante cae así en un día entero.
 */
export function ordenDeApertura(cuantos: number): number[] {
  const alBorde = (i: number): number => Math.min(i, cuantos - 1 - i);
  return Array.from({ length: cuantos }, (_, i) => i).sort((a, b) => alBorde(b) - alBorde(a) || a - b);
}

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

/**
 * Lo que cuesta salir de la base y pasar por las paradas en ese orden: sin tabla de caminos, en línea recta; con ella,
 * en minutos, con las cuestas y los rodeos que dijo la fuente.
 */
function recorrido(orden: Parada[], base: Punto, c?: Caminos): number {
  let total = 0;
  let desde = base;
  for (const p of orden) {
    total += costeEntre(desde, p.punto, c);
    desde = p.punto;
  }
  return total;
}

/**
 * Ordena las paradas de un día para andar lo menos posible saliendo de la base. Con pocas paradas se prueban todos
 * los órdenes; con muchas, se va siempre a la más cercana. A igualdad, gana el orden en que llegaron.
 */
function enOrden(paradas: Parada[], base: Punto, c?: Caminos): Parada[] {
  if (paradas.length <= 7) {
    let mejor = paradas;
    let menos = Infinity;
    for (const orden of ordenes(paradas)) {
      const metros = recorrido(orden, base, c);
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
      if (costeEntre(desde, quedan[i].punto, c) < costeEntre(desde, quedan[mejor].punto, c)) mejor = i;
    }
    const [siguiente] = quedan.splice(mejor, 1);
    orden.push(siguiente);
    desde = siguiente.punto;
  }
  return orden;
}

/**
 * Lo que hay de camino entre las paradas de un día, en su orden, y lo que suma el día con sus visitas. Cada trayecto
 * se cuenta andando si se puede andar; si no, con la manera más rápida de las que tienen sentido. Con la tabla de
 * caminos, lo que dijo la fuente; lo que no está en ella, con la cuenta de la casa.
 */
export function medirDia(orden: Parada[], c?: Caminos): { metros: number[]; minutos: number; tramos: number[] } {
  const tramos = orden.slice(1).map((p, i) => trayectoEntre(orden[i].punto, p.punto, c));
  const visitas = orden.reduce((suma, p) => suma + p.minutos, 0);
  return {
    metros: tramos.map((t) => t.metros),
    minutos: visitas + tramos.reduce((suma, t) => suma + t.minutos, 0),
    tramos: tramos.map((t) => t.minutos),
  };
}

/**
 * Si un día se puede hacer: ningún trayecto pasa de lo que cabe en un día y las visitas, con lo que se tarda en ir
 * de una a otra, caben en un día entero. Es la misma regla que mira la puerta 9: el código no reparte un día que su
 * puerta rechazaría.
 */
export function cabeElDia(orden: Parada[], c?: Caminos): boolean {
  const { tramos, minutos } = medirDia(orden, c);
  return tramos.every((m) => m <= TRAYECTO_DE_UN_DIA) && minutos <= DIA_ENTERO;
}

/** Si de donde se duerme a una parada se llega dentro de un día, con la manera que tenga sentido. */
export function alAlcance(base: Punto, p: Parada, c?: Caminos): boolean {
  return trayectoEntre(base, p.punto, c).minutos <= TRAYECTO_DE_UN_DIA;
}

/** Lo que el viajero ha cambiado a mano: lo que quitó, lo que añadió de lo que se quedó fuera y lo que movió de día. */
export type Cambios = { quitadas?: string[]; anadidas?: string[]; fijadas?: Record<string, number> };

/**
 * Reparte las paradas en los días. Las paradas llegan por orden de importancia: las primeras entran antes, y las
 * imprescindibles, antes que ninguna. Lo que el viajero cambió a mano manda sobre el ritmo: lo que quitó no vuelve
 * solo, lo que movió a un día se queda en ese día y lo que añadió entra aunque el día ya esté lleno. Lo que reparte
 * el código cabe siempre: una parada que no entra en ningún día sin pasarse de un tope se queda fuera, y se dice por
 * qué, también si es imprescindible. Antes fuera y dicho que un día que no se puede hacer. Con la tabla de caminos
 * del viaje, lo que se tarda de verdad cuenta al ordenar y al medir cada día; sin ella, o donde no llega, la cuenta
 * de la casa. Con los días que se sabe que cierra cada parada (`cierra`, por su id, de las entradas), el código no la
 * pone un día que cierra: la pasa a otro, y si en ninguno de los que abre cabe, se queda fuera y dice que es porque
 * cierra. Lo que no se sabe no mueve nada. Lo que el viajero movió o añadió va donde él dijo: eso se avisa, no se
 * impide.
 */
export function repartir(
  paradas: Parada[],
  fechas: string[],
  ritmo: Ritmo,
  base: Punto,
  cambios: Cambios = {},
  tabla?: TablaDeCaminos | null,
  cierra: Readonly<Record<string, readonly string[]>> = {},
): Reparto {
  const c = caminosDe(tabla);
  const abre = (p: Parada, i: number): boolean => !(cierra[p.id] ?? []).includes(dias[i].fecha);
  const cabe = CABE[ritmo];
  const quitadas = [...new Set(cambios.quitadas ?? [])].filter((id) => paradas.some((p) => p.id === id));
  const anadidas = cambios.anadidas ?? [];
  const fijadas = cambios.fijadas ?? {};
  const porImportancia = [
    ...paradas.filter((p) => p.imprescindible),
    ...paradas.filter((p) => !p.imprescindible),
  ].filter((p) => !quitadas.includes(p.id));
  const dias = fechas.map((fecha) => ({ fecha, paradas: [] as Parada[], minutos: 0 }));
  const fuera: string[] = [...quitadas];
  const porQue: Record<string, Motivo> = Object.fromEntries(quitadas.map((id) => [id, "removed"]));
  const seQueda = (p: Parada, motivo: Motivo): void => {
    fuera.push(p.id);
    porQue[p.id] = motivo;
  };
  if (dias.length === 0) {
    for (const p of porImportancia) seQueda(p, "full");
    return { dias: [], fuera, porQue };
  }

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
    return (zonas.find((z) => abre(p, z.i)) ?? zonas[0])?.i ?? 0;
  };

  // 1. Lo que el viajero movió a un día va a ese día, quepa o no.
  for (const p of porImportancia) {
    const i = fijadas[p.id];
    if (i !== undefined && Number.isInteger(i) && i >= 0 && i < dias.length) pon(i, p);
  }

  // 2. Las demás, por importancia. Cada una va al día que tiene cerca y en el que cabe. Si no hay ninguno, abre un
  // día nuevo mientras queden días libres. Si no quedan, lo imprescindible prueba en cualquier día en el que quepa,
  // aunque no sea el de al lado y haya que coger algo para llegar; y lo que ni así entra se queda fuera, con su
  // porqué: antes fuera que cruzar la ciudad por rellenar un hueco. Así dos sitios que están al lado caen en el
  // mismo día, y un día se abre cuando hace falta, no por tener algo en cada fecha: un día puede quedar libre.
  const libres = porImportancia.filter((p) => !puestas.has(p.id));
  const porAbrir = ordenDeApertura(dias.length).filter((i) => dias[i].paradas.length === 0);
  for (const p of libres) {
    if (anadidas.includes(p.id)) continue;
    // Lo que queda a más de un día de donde se duerme no entra en ningún día, se coja lo que se coja: es otro sitio
    // donde dormir.
    if (!alAlcance(base, p, c)) {
      seQueda(p, "far");
      continue;
    }
    const porCercania = conParadas()
      .map((z) => ({ i: z.i, d: dias[z.i], lejos: enLineaRecta(z.centro, p.punto) }))
      .sort((a, b) => a.lejos - b.lejos || a.i - b.i);
    const hayHueco = (d: (typeof dias)[number]): boolean =>
      d.paradas.length < cabe.paradas && d.minutos + p.minutos <= cabe.minutos;
    const cabeEn = (d: (typeof dias)[number]): boolean =>
      hayHueco(d) && cabeElDia(enOrden([...d.paradas, p], base, c), c);
    // Lo mismo de siempre, pero solo entre los días que abre; y sin mirar si abre, para saber si es eso lo que falla.
    const buscar = (siAbre: boolean): { destino: number; abrir: number } => {
      const vale = (i: number): boolean => !siAbre || abre(p, i);
      const abrir = porAbrir.findIndex(vale);
      let destino = porCercania.find((x) => x.lejos <= SALTO && vale(x.i) && cabeEn(x.d))?.i ?? -1;
      if (destino < 0) destino = abrir < 0 ? -1 : porAbrir[abrir];
      if (destino < 0 && p.imprescindible) destino = porCercania.find((x) => vale(x.i) && cabeEn(x.d))?.i ?? -1;
      return { destino, abrir: destino >= 0 && destino === porAbrir[abrir] ? abrir : -1 };
    };
    const { destino, abrir } = buscar(true);
    if (destino < 0) {
      // Si cabría un día que cierra, es que cierra; si en algún día había hueco, lo que falla es la distancia; si no,
      // es que los días están llenos.
      const cierraLosQueCaben = (cierra[p.id] ?? []).length > 0 && buscar(false).destino >= 0;
      seQueda(p, cierraLosQueCaben ? "closed" : porCercania.some((x) => hayHueco(x.d)) ? "far" : "full");
      continue;
    }
    if (abrir >= 0) porAbrir.splice(abrir, 1);
    pon(destino, p);
  }

  // 4. Lo que el viajero añadió entra al final en su zona, aunque el día ya esté lleno: no le quita el sitio a nadie.
  for (const p of libres) {
    if (anadidas.includes(p.id) && !puestas.has(p.id)) pon(masCercano(p), p);
  }

  return {
    dias: dias.map((d) => {
      const orden = enOrden(d.paradas, base, c);
      // El día se llama como su parada más importante.
      const titulo = porImportancia.find((p) => d.paradas.includes(p))?.nombre ?? "";
      return { fecha: d.fecha, titulo, paradas: orden.map((p) => p.id), metros: medirDia(orden, c).metros };
    }),
    fuera,
    porQue,
  };
}
