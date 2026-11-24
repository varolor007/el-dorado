// La tabla de caminos de un viaje, pedida a la fuente de rutas con cupo. Cuando ya se saben los sitios que se van a
// ver y dónde se puede dormir, se pide lo que hay entre ellos: a pie, solo entre lo que en línea recta está al alcance
// de andar; en coche, solo lo que no se anda y puede caber en un día. Sin pedir dos veces lo mismo, con matrices y sin
// pasar del tope de casillas del viaje. Lo que no se pide, o falla, se queda con la cuenta de la casa, y se dice.
//
// Qué se pide, por orden: de cada sitio donde se puede dormir a cada parada (con eso se elige dónde dormir), y de
// cada parada a cada otra (con eso se ordenan los días). Lo de vuelta a donde se duerme no se pide: no se mide.

import { CASILLAS_POR_VIAJE, EN_COCHE_HASTA, HOLGURA_DE_UNA_MATRIZ } from "../data/moverse.ts";
import {
  caminosDe,
  clavePunto,
  HASTA_A_PIE,
  trayectoEntre,
  type CaminoGuardado,
  type TablaDeCaminos,
  type Tramo,
} from "../tools/caminos.ts";
import { enLineaRecta, type Punto } from "../tools/distancias.ts";

/** Las dos maneras que se le piden a la fuente de rutas. El transporte público, no: se queda corta (24-nov). */
export type ManeraPedida = "walk" | "car";

/** Una fuente de rutas: la matriz de cada origen a cada destino por una manera, con null donde no hay camino. */
export type FuenteDeRutas = {
  nombre: string;
  /** Lo más que cabe en un pedido, en casillas. */
  casillasPorPedido: number;
  matriz: (origenes: Punto[], destinos: Punto[], manera: ManeraPedida) => Promise<(Tramo | null)[][]>;
};

/** Un par de puntos, en un sentido, con lo que los separa en línea recta. */
export type Par = { de: Punto; a: Punto; recta: number };

/** Un pedido: una matriz de unos orígenes a unos destinos. */
export type Bloque = { origenes: Punto[]; destinos: Punto[] };

/** Lo que queda en el run: la tabla y lo que costó, con sus avisos. */
export type DeLosCaminos = {
  tabla: TablaDeCaminos;
  /** Las casillas pedidas a la fuente, contestara o no. */
  casillas: number;
  pedidos: number;
  /** Los pares que hacían falta y no se pidieron por el tope: se quedan con la cuenta de la casa. */
  sinPedir: number;
  /** Verdadero si la fuente falló en algún pedido: lo que no llegó se queda con la cuenta de la casa. */
  fallo: boolean;
  avisos: string[];
};

const clave = (de: Punto, a: Punto): string => `${clavePunto(de)}>${clavePunto(a)}`;

/**
 * Los pares que hacen falta, en un sentido y sin repetir, por orden: primero de donde se duerme a cada parada, y
 * después de parada a parada; dentro de cada grupo, de lo más cerca a lo más lejos.
 */
export function paresDelViaje(bases: Punto[], paradas: Punto[]): Par[] {
  const vistos = new Set<string>();
  const grupo = (desde: Punto[], hasta: Punto[]): Par[] => {
    const pares: Par[] = [];
    for (const de of desde)
      for (const a of hasta) {
        const k = clave(de, a);
        if (clavePunto(de) === clavePunto(a) || vistos.has(k)) continue;
        vistos.add(k);
        pares.push({ de, a, recta: enLineaRecta(de, a) });
      }
    return pares.sort((x, y) => x.recta - y.recta);
  };
  return [...grupo(bases, paradas), ...grupo(paradas, paradas)];
}

/** Los pares de un solo sentido: en coche, el camino de vuelta es el de ida. */
function enUnSentido(pares: Par[]): Par[] {
  const vistos = new Set<string>();
  return pares.filter((p) => {
    if (vistos.has(clave(p.a, p.de))) return false;
    vistos.add(clave(p.de, p.a));
    return true;
  });
}

/**
 * Junta los pares en matrices. Cada origen lleva sus destinos; dos orígenes van en la misma matriz si lo que se pide
 * de más (los cruces que nadie necesita) no pasa de la holgura, y ninguna pasa de lo que cabe en un pedido.
 */
export function enBloques(pares: Par[], porPedido: number, holgura = HOLGURA_DE_UNA_MATRIZ): Bloque[] {
  const porOrigen = new Map<string, { de: Punto; a: Map<string, Punto> }>();
  for (const p of pares) {
    const k = clavePunto(p.de);
    if (!porOrigen.has(k)) porOrigen.set(k, { de: p.de, a: new Map() });
    porOrigen.get(k)!.a.set(clavePunto(p.a), p.a);
  }
  const bloques: Bloque[] = [];
  let filas: Punto[] = [];
  let columnas = new Map<string, Punto>();
  let hacenFalta = 0;
  const cierra = (): void => {
    if (filas.length > 0) bloques.push({ origenes: filas, destinos: [...columnas.values()] });
    filas = [];
    columnas = new Map();
    hacenFalta = 0;
  };
  for (const { de, a } of porOrigen.values()) {
    // Un origen con más destinos de los que caben en un pedido va solo, en trozos.
    if (a.size > porPedido) {
      cierra();
      const todos = [...a.values()];
      for (let i = 0; i < todos.length; i += porPedido)
        bloques.push({ origenes: [de], destinos: todos.slice(i, i + porPedido) });
      continue;
    }
    const juntas = new Map([...columnas, ...a]);
    const cuesta = (filas.length + 1) * juntas.size;
    if (filas.length > 0 && (cuesta > (hacenFalta + a.size) * (1 + holgura) || cuesta > porPedido)) cierra();
    filas.push(de);
    for (const [k, p] of a) columnas.set(k, p);
    hacenFalta += a.size;
  }
  cierra();
  return bloques;
}

export const casillasDe = (bloques: Bloque[]): number =>
  bloques.reduce((s, b) => s + b.origenes.length * b.destinos.length, 0);

/**
 * Los bloques de los primeros pares que caben en un cupo de casillas: tantos pares como se pueda, por su orden, sin
 * que sus matrices pasen del cupo. Devuelve también cuántos pares se quedan sin pedir.
 */
export function dentroDelCupo(pares: Par[], cupo: number, porPedido: number): { bloques: Bloque[]; sinPedir: number } {
  const con = (n: number): Bloque[] => enBloques(pares.slice(0, n), porPedido);
  if (casillasDe(con(pares.length)) <= cupo) return { bloques: con(pares.length), sinPedir: 0 };
  // Lo que cuestan las matrices crece con los pares, casi siempre: se busca el corte, y se comprueba al final.
  let bajo = 0;
  let alto = pares.length;
  while (alto - bajo > 1) {
    const medio = Math.floor((bajo + alto) / 2);
    if (casillasDe(con(medio)) <= cupo) bajo = medio;
    else alto = medio;
  }
  while (bajo > 0 && casillasDe(con(bajo)) > cupo) bajo--;
  return { bloques: con(bajo), sinPedir: pares.length - bajo };
}

/** Un tramo que vale: metros y minutos de verdad. Lo que no lo es, no se guarda. */
const vale = (t: Tramo | null | undefined): t is Tramo =>
  t != null && Number.isFinite(t.metros) && t.metros >= 0 && Number.isFinite(t.minutos) && t.minutos > 0;

export type Opciones = { tope?: number; ahora?: () => string };

/**
 * Pide la tabla de caminos de un viaje: primero a pie y después, con lo que quede del cupo, en coche lo que no se
 * anda. Si la fuente falla, no se le pide más: lo que llegó se guarda, y lo demás se queda con la cuenta de la casa.
 */
export async function pedirCaminos(
  bases: Punto[],
  paradas: Punto[],
  fuente: FuenteDeRutas,
  o: Opciones = {},
): Promise<DeLosCaminos> {
  const tope = o.tope ?? CASILLAS_POR_VIAJE;
  const ahora = o.ahora ?? ((): string => new Date().toISOString());
  const visto = ahora();
  const aPie = new Map<string, { de: Punto; a: Punto; t: Tramo }>();
  const enCoche = new Map<string, { de: Punto; a: Punto; t: Tramo }>();
  let casillas = 0;
  let pedidos = 0;
  let sinPedir = 0;
  let fallo = false;

  const pide = async (bloques: Bloque[], manera: ManeraPedida, guarda: typeof aPie): Promise<void> => {
    for (const b of bloques) {
      if (fallo) return;
      casillas += b.origenes.length * b.destinos.length;
      pedidos++;
      try {
        const m = await fuente.matriz(b.origenes, b.destinos, manera);
        b.origenes.forEach((de, i) =>
          b.destinos.forEach((a, j) => {
            const t = m[i]?.[j];
            if (clavePunto(de) !== clavePunto(a) && vale(t))
              guarda.set(clave(de, a), { de, a, t: { metros: Math.round(t.metros), minutos: Math.round(t.minutos) } });
          }),
        );
      } catch {
        // El mensaje de un fallo puede traer un trozo de lo que contestó la fuente: no se guarda.
        fallo = true;
      }
    }
  };

  const todos = paresDelViaje(bases, paradas);
  // 1. A pie: solo lo que en línea recta está al alcance de andar. Ningún camino a pie es más corto que la recta.
  const andables = todos.filter((p) => p.recta <= HASTA_A_PIE);
  const deAPie = dentroDelCupo(andables, tope, fuente.casillasPorPedido);
  sinPedir += deAPie.sinPedir;
  await pide(deAPie.bloques, "walk", aPie);

  // 2. En coche: lo que no se anda, según lo que ya se sabe, y puede caber en un día.
  const sabido = caminosDe(tablaDe(fuente.nombre, visto, aPie, enCoche));
  const sinAndar = enUnSentido(
    todos.filter((p) => p.recta <= EN_COCHE_HASTA && !trayectoEntre(p.de, p.a, sabido).aPie),
  );
  const deCoche = dentroDelCupo(sinAndar, Math.max(0, tope - casillas), fuente.casillasPorPedido);
  sinPedir += deCoche.sinPedir;
  if (!fallo) await pide(deCoche.bloques, "car", enCoche);
  else sinPedir += sinAndar.length - deCoche.sinPedir;

  const tabla = tablaDe(fuente.nombre, visto, aPie, enCoche);
  const avisos = [
    `rutas: ${casillas} casillas en ${pedidos} pedidos a ${fuente.nombre}, ${tabla.caminos.length} caminos guardados`,
  ];
  if (sinPedir > 0)
    avisos.push(`rutas: ${sinPedir} pares no caben en el tope de ${tope} casillas: van con la cuenta de la casa`);
  if (fallo) avisos.push(`rutas: ${fuente.nombre} no contesta; lo que no llegó va con la cuenta de la casa`);
  return { tabla, casillas, pedidos, sinPedir, fallo, avisos };
}

/** La tabla, de lo que se ha guardado a pie y en coche, un camino por par y en un orden fijo. */
function tablaDe(
  fuente: string,
  visto: string,
  aPie: Map<string, { de: Punto; a: Punto; t: Tramo }>,
  enCoche: Map<string, { de: Punto; a: Punto; t: Tramo }>,
): TablaDeCaminos {
  const porPar = new Map<string, CaminoGuardado>();
  const de = (k: string, x: { de: Punto; a: Punto }): CaminoGuardado => {
    if (!porPar.has(k)) porPar.set(k, { de: x.de, a: x.a });
    return porPar.get(k)!;
  };
  for (const [k, x] of aPie) de(k, x).aPie = x.t;
  for (const [k, x] of enCoche) de(k, x).enCoche = x.t;
  const caminos = [...porPar.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, c]) => c);
  return { fuente, visto, caminos };
}

/** Sin fuente de rutas: una tabla vacía, y el aviso de que todo va con la cuenta de la casa. */
export function sinFuenteDeRutas(porQue: string, ahora: string = new Date().toISOString()): DeLosCaminos {
  return {
    tabla: { fuente: "casa", visto: ahora, caminos: [] },
    casillas: 0,
    pedidos: 0,
    sinPedir: 0,
    fallo: false,
    avisos: [`sin la fuente de rutas (${porQue}): todo va con la cuenta de la casa`],
  };
}
