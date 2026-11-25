// Las capas del destino en el viaje que ve la web (bloque 14), ya pasada su puerta: cómo moverse allí, lo que conviene
// saber, la entrada y el horario de cada sitio, y el presupuesto entero. Es parte del contrato entre la casa y la web,
// como `viaje.ts`, que lo vuelve a exportar. Solo la forma, y lo que el código puede comprobar de ella: las cuentas van
// en `agent/scripts/capas.ts` y `agent/scripts/presupuesto.ts`.
//
// Las reglas de todas: cada dato dice de dónde sale (la página que abrió el asiento y el día en que la vio), y lo que
// no se sabe es null, nunca un número aproximado. Cada capa puede faltar entera, con su porqué de una lista fija, y el
// viaje sale igual. Ninguna frase de un asiento llega a la pantalla sin pasar una puerta de palabras: casi todo va por
// claves y números, y lo poco que es frase es corta.

import {
  DIAS_DE_LA_SEMANA,
  FALTAS_DE_UNA_CAPA,
  LETRAS_DE_UN_NOMBRE,
  LO_MAS_DE_UNA_LISTA,
  PARA_QUIEN,
  SIN_MIRAR,
  type DiaDeLaSemana,
  type FaltaDeUnaCapa,
  type ParaQuien,
  type SinMirar,
} from "../data/capas.ts";
import { CLASES_DEL_DESTINO, LETRAS_DE_UNA_COSA, TOPE_POR_CLASE, type ClaseDelDestino } from "../data/capa_destino.ts";
import {
  BILLETES,
  DE_DONDE_SE_LLEGA,
  MODOS_DE_MOVERSE,
  PAGOS,
  POR_QUE_NO_SE_LLEGA,
  type ClaseDeBillete,
  type ClaseDePago,
  type DeDondeSeLlega,
  type ModoDeMoverse,
} from "../data/capa_moverse.ts";
import {
  ORIGENES_DE_UNA_PARTE,
  PARTES_DEL_PRESUPUESTO,
  type OrigenDeUnaParte,
  type ParteDelPresupuesto as ClaseDeParte,
} from "../data/presupuesto.ts";
import { pegasDelTexto } from "../gates/textos.ts";
import { enlaceQueVale } from "../tools/enlaces.ts";

export { FALTAS_DE_UNA_CAPA, PARA_QUIEN, DIAS_DE_LA_SEMANA };
export type { FaltaDeUnaCapa, ParaQuien, DiaDeLaSemana };

// 1. Lo común.

/** De dónde sale un dato: la página que se abrió (https) y el día en que se vio, AAAA-MM-DD. */
export type FuenteDeUnDato = { url: string; visto: string };

/** Un importe con su moneda, en sus tres letras. */
export type Importe = { importe: number; moneda: string };

/** Unas edades, ambas incluidas; null por un lado es que no tiene tope por ahí. */
export type Edades = { desde: number | null; hasta: number | null };

/**
 * Un precio de una capa: para quién es (de una lista fija, con sus edades si la página las da), cuánto o «gratis», y
 * de dónde sale. Si no se sabe, no hay precio: la lista que lo lleva es null.
 */
export type PrecioDeCapa = {
  para: ParaQuien;
  edades: Edades | null;
  cuanto: Importe | "free";
  fuente: FuenteDeUnDato;
};

/** Una franja de un horario: los días de la semana que abre, y de qué hora a qué hora, HH:MM. */
export type Franja = { dias: DiaDeLaSemana[]; abre: string; cierra: string };

/**
 * Un horario: para qué fechas vale (null es que no lo dice: todo el año), las franjas que abre y los días concretos
 * que cierra (un festivo, una obra). Un día de la semana que no está en ninguna franja, ese día cierra. Con esto el
 * código sabe si un sitio abre un día del viaje (`abreElDia`, en `agent/scripts/capas.ts`).
 */
export type Horario = {
  desde: string | null;
  hasta: string | null;
  franjas: Franja[];
  cierra: string[];
  fuente: FuenteDeUnDato;
};

// 2. Cómo moverse allí (el de moverse, puerta 11).

/** Una manera de ir de donde se llega (el aeropuerto, la estación o el puerto) a una zona de la ruta. */
export type ManeraDeLlegar = {
  desde: { clase: DeDondeSeLlega; codigo: string | null; nombre: string | null };
  /** La zona de la ruta a la que se va, por su id. */
  aZona: string;
  modo: ModoDeMoverse;
  minutos: number | null;
  precios: PrecioDeCapa[] | null;
  /** Hasta qué hora funciona, HH:MM; null si no se sabe o si no tiene hora. */
  hastaLas: string | null;
  fuente: FuenteDeUnDato;
};

/** Un transporte de allí: cuál es, en qué zonas de la ruta sirve y hasta qué hora funciona. */
export type TransporteDeAlli = {
  modo: ModoDeMoverse;
  zonas: string[];
  hastaLas: string | null;
  fuente: FuenteDeUnDato;
};

/**
 * Un billete o un abono: su clase, cuántos días vale (un abono) o cuántos viajes (un bono), qué maneras cubre y lo
 * que cuesta. Con ellos el código compara sueltos contra abono por los trayectos que no se andan en los días.
 */
export type Billete = {
  clase: ClaseDeBillete;
  dias: number | null;
  viajes: number | null;
  modos: ModoDeMoverse[];
  precios: PrecioDeCapa[] | null;
  fuente: FuenteDeUnDato;
};

export type DeMoverse = {
  llegar: ManeraDeLlegar[];
  /** Si no hay ninguna manera de llegar a donde se duerme, por qué; si la hay, null. */
  sinLlegar: (typeof POR_QUE_NO_SE_LLEGA)[number] | null;
  transportes: TransporteDeAlli[];
  billetes: Billete[];
  pagos: { clase: ClaseDePago; fuente: FuenteDeUnDato }[];
  /** Si hace falta coche, en un viaje por una región; null si no se sabe. */
  coche: { haceFalta: boolean; fuente: FuenteDeUnDato } | null;
  falta: FaltaDeUnaCapa | null;
};

// 3. Lo que conviene saber (el que conoce el destino, puerta 12).

/**
 * Una cosa del destino, corta: su clase (de una lista fija, con su tope), la zona de la ruta de la que habla si habla
 * de una, el nombre propio de lo que nombra (un barrio, un mercado, un plato; nunca un restaurante), dónde está si es
 * un sitio, lo que dice en una frase corta en el idioma del viajero, lo que suele costar si es de eso, y su fuente.
 */
export type CosaDelDestino = {
  clase: ClaseDelDestino;
  zona: string | null;
  nombre: string | null;
  punto: { lat: number; lon: number } | null;
  frase: string;
  /** Lo que suele costar, de tanto a tanto: solo en las clases de comer. */
  cuesta: { desde: number; hasta: number; moneda: string } | null;
  fuente: FuenteDeUnDato;
};

export type DelDestino = { cosas: CosaDelDestino[]; falta: FaltaDeUnaCapa | null };

// 4. Lo que cuesta y cuándo abre cada sitio (el de las entradas, puerta 13).

/**
 * La entrada de un sitio elegido, por el id de su parada: lo que cuesta (null, no se sabe), sus horarios (null, no se
 * sabe), si hay que reservar y dónde, y su web oficial. `mirado` es falso si solo se sabe lo que dicen los datos
 * abiertos, y `sinMirar` dice por qué (14.7); un viaje de antes no lo lleva.
 */
export type EntradaDeUnSitio = {
  parada: string;
  precios: PrecioDeCapa[] | null;
  horarios: Horario[] | null;
  reservar: { haceFalta: boolean; donde: string | null; fuente: FuenteDeUnDato } | null;
  web: string | null;
  mirado: boolean;
  sinMirar?: SinMirar | null;
};

export type DeLasEntradas = { sitios: EntradaDeUnSitio[]; falta: FaltaDeUnaCapa | null };

// 5. El presupuesto entero (código).

/**
 * Una parte del presupuesto: cuál es, de dónde sale, su total en la moneda del viaje (null si no se sabe nada), las
 * fuentes de sus precios, cuántas cosas de ella no se saben, y lo que va en otra moneda, que no se suma: se dice.
 */
export type ParteDelPresupuesto = {
  parte: ClaseDeParte;
  origen: OrigenDeUnaParte;
  total: number | null;
  moneda: string;
  fuentes: FuenteDeUnDato[];
  faltan: number;
  aparte: Importe[];
};

/** El presupuesto de una manera: sus partes, su total con lo que se sabe, cuántas cosas faltan y lo de otra moneda. */
export type PresupuestoDeUnaManera = {
  manera: string;
  partes: ParteDelPresupuesto[];
  total: number;
  moneda: string;
  faltan: number;
  aparte: Importe[];
};

/**
 * El presupuesto entero, por manera, y las comidas aparte: una horquilla por día, de lo que dice el que conoce el
 * destino, o null si no se sabe. Las maneras se siguen comparando por dormir y llegar: esto no cambia cuál gana.
 */
export type Presupuesto = {
  maneras: PresupuestoDeUnaManera[];
  comidas: { desde: number; hasta: number; moneda: string; fuentes: FuenteDeUnDato[] } | null;
  falta: FaltaDeUnaCapa | null;
};

/** Las capas que puede llevar un viaje: cada una puede no estar (un viaje de antes) o faltar con su porqué. */
export type CapasDelViaje = {
  moverse?: DeMoverse;
  saber?: DelDestino;
  entradas?: DeLasEntradas;
  presupuesto?: Presupuesto;
};

// Lo que se comprueba de su forma, antes de la web. Las puertas 11, 12 y 13 miran más; esto es lo que no puede faltar.

type Pega = { donde: string; que: string };

const esFecha = (v: unknown): boolean =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const esHora = (v: unknown): boolean => typeof v === "string" && /^([01]\d|2[0-4]):[0-5]\d$/.test(v);
const esMoneda = (v: unknown): boolean => typeof v === "string" && /^[A-Z]{3}$/.test(v);
const esLista = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= LO_MAS_DE_UNA_LISTA;
const esNombre = (v: unknown): boolean =>
  v === null || (typeof v === "string" && v.trim() !== "" && v.length <= LETRAS_DE_UN_NOMBRE && !/[\n\r]/.test(v));
const esNumero = (v: unknown, minimo = 0): boolean => typeof v === "number" && Number.isFinite(v) && v >= minimo;

/** Una dirección que la web puede abrir: https, sin usuario ni clave dentro, escrita en su forma normal. */
export const enlaceDeCapa = (v: unknown): boolean => enlaceQueVale(v);

function pegasDeLaFuente(f: unknown, donde: string, pegas: Pega[]): void {
  const x = f as FuenteDeUnDato | null;
  if (typeof x !== "object" || x === null || !enlaceDeCapa(x.url) || !esFecha(x.visto))
    pegas.push({ donde, que: "no dice de qué página sale (https) ni el día en que se vio" });
}

function pegasDeLosPrecios(precios: unknown, donde: string, pegas: Pega[]): void {
  if (precios === null) return;
  if (!esLista(precios)) return void pegas.push({ donde, que: "los precios no son una lista" });
  precios.forEach((p, i) => {
    const x = p as PrecioDeCapa;
    const aqui = `${donde}[${i}]`;
    if (!PARA_QUIEN.includes(x?.para)) pegas.push({ donde: aqui, que: "no dice para quién es, de la lista" });
    if (x?.edades != null) {
      const { desde, hasta } = x.edades;
      if ((desde !== null && !esNumero(desde)) || (hasta !== null && !esNumero(hasta)))
        pegas.push({ donde: aqui, que: "unas edades no son un número" });
      else if (desde !== null && hasta !== null && desde > hasta)
        pegas.push({ donde: aqui, que: "las edades van al revés" });
    }
    const c = x?.cuanto;
    if (
      c !== "free" &&
      !(typeof c === "object" && c !== null && esNumero(c.importe) && c.importe > 0 && esMoneda(c.moneda))
    )
      pegas.push({ donde: aqui, que: "no es un importe con su moneda, ni gratis" });
    pegasDeLaFuente(x?.fuente, aqui, pegas);
  });
}

function pegasDeLosHorarios(horarios: unknown, donde: string, pegas: Pega[]): void {
  if (horarios === null) return;
  if (!esLista(horarios)) return void pegas.push({ donde, que: "los horarios no son una lista" });
  horarios.forEach((h, i) => {
    const x = h as Horario;
    const aqui = `${donde}[${i}]`;
    if ((x?.desde !== null && !esFecha(x?.desde)) || (x?.hasta !== null && !esFecha(x?.hasta)))
      pegas.push({ donde: aqui, que: "las fechas para las que vale no son fechas" });
    if (!esLista(x?.franjas)) pegas.push({ donde: aqui, que: "sus franjas no son una lista" });
    else
      x.franjas.forEach((f, j) => {
        const dias = f?.dias;
        const bien =
          Array.isArray(dias) && dias.length > 0 && dias.every((d) => DIAS_DE_LA_SEMANA.includes(d)) && esHora(f.abre);
        if (!bien || !esHora(f.cierra))
          pegas.push({ donde: `${aqui}.franjas[${j}]`, que: "no son unos días con sus horas" });
      });
    if (!esLista(x?.cierra) || !x.cierra.every(esFecha))
      pegas.push({ donde: aqui, que: "los días que cierra no son fechas" });
    pegasDeLaFuente(x?.fuente, aqui, pegas);
  });
}

function pegasDeLaFalta(falta: unknown, llenas: number, donde: string, pegas: Pega[]): void {
  if (falta !== null && !FALTAS_DE_UNA_CAPA.includes(falta as FaltaDeUnaCapa))
    pegas.push({ donde, que: "no dice por qué falta, de la lista" });
  if (falta !== null && llenas > 0) pegas.push({ donde, que: "dice que falta, y aun así trae datos" });
}

/** Lo que se comprueba de cómo moverse: cada manera, transporte, billete y pago por sus claves, con su fuente. */
export function pegasDeMoverse(m: DeMoverse, zonas: readonly string[] | null = null): Pega[] {
  const pegas: Pega[] = [];
  if (typeof m !== "object" || m === null) return [{ donde: "moverse", que: "no es una capa" }];
  const listas = [m.llegar, m.transportes, m.billetes, m.pagos];
  if (!listas.every(esLista)) return [{ donde: "moverse", que: "sus partes no son listas" }];
  const deLaRuta = (z: unknown): boolean => typeof z === "string" && (zonas === null || zonas.includes(z));
  m.llegar.forEach((x, i) => {
    const donde = `moverse.llegar[${i}]`;
    if (!DE_DONDE_SE_LLEGA.includes(x?.desde?.clase) || !esNombre(x.desde.nombre) || !esNombre(x.desde.codigo))
      pegas.push({ donde, que: "no dice de dónde se llega, de la lista" });
    if (!deLaRuta(x?.aZona)) pegas.push({ donde, que: "no va a una zona de la ruta" });
    if (!MODOS_DE_MOVERSE.includes(x?.modo)) pegas.push({ donde, que: "no dice la manera, de la lista" });
    if (x?.minutos !== null && !(esNumero(x?.minutos) && x.minutos > 0))
      pegas.push({ donde, que: "los minutos no son un número" });
    if (x?.hastaLas !== null && !esHora(x?.hastaLas)) pegas.push({ donde, que: "hasta qué hora no es una hora" });
    pegasDeLosPrecios(x?.precios, `${donde}.precios`, pegas);
    pegasDeLaFuente(x?.fuente, donde, pegas);
  });
  if (m.sinLlegar !== null && !POR_QUE_NO_SE_LLEGA.includes(m.sinLlegar))
    pegas.push({ donde: "moverse.sinLlegar", que: "no dice por qué no se llega, de la lista" });
  if (m.falta === null && m.llegar.length === 0 && m.sinLlegar === null)
    pegas.push({ donde: "moverse.llegar", que: "no hay ninguna manera de llegar a donde se duerme, ni dice por qué" });
  if (m.llegar.length > 0 && m.sinLlegar !== null)
    pegas.push({ donde: "moverse.sinLlegar", que: "dice que no se llega, y trae maneras de llegar" });
  m.transportes.forEach((x, i) => {
    const donde = `moverse.transportes[${i}]`;
    if (!MODOS_DE_MOVERSE.includes(x?.modo)) pegas.push({ donde, que: "no dice la manera, de la lista" });
    if (!esLista(x?.zonas) || !x.zonas.every(deLaRuta)) pegas.push({ donde, que: "sus zonas no son de la ruta" });
    if (x?.hastaLas !== null && !esHora(x?.hastaLas)) pegas.push({ donde, que: "hasta qué hora no es una hora" });
    pegasDeLaFuente(x?.fuente, donde, pegas);
  });
  m.billetes.forEach((x, i) => {
    const donde = `moverse.billetes[${i}]`;
    if (!BILLETES.includes(x?.clase)) pegas.push({ donde, que: "no dice la clase de billete, de la lista" });
    if (x?.dias !== null && !(Number.isInteger(x?.dias) && x.dias > 0))
      pegas.push({ donde, que: "sus días no son un número" });
    if (x?.viajes !== null && !(Number.isInteger(x?.viajes) && x.viajes > 0))
      pegas.push({ donde, que: "sus viajes no son un número" });
    if ((x?.clase === "day_pass" || x?.clase === "multi_day_pass") && x.dias === null)
      pegas.push({ donde, que: "un abono no dice cuántos días vale" });
    if (!esLista(x?.modos) || !x.modos.every((y) => MODOS_DE_MOVERSE.includes(y)))
      pegas.push({ donde, que: "lo que cubre no es de la lista" });
    pegasDeLosPrecios(x?.precios, `${donde}.precios`, pegas);
    pegasDeLaFuente(x?.fuente, donde, pegas);
  });
  m.pagos.forEach((x, i) => {
    if (!PAGOS.includes(x?.clase))
      pegas.push({ donde: `moverse.pagos[${i}]`, que: "no dice cómo se paga, de la lista" });
    pegasDeLaFuente(x?.fuente, `moverse.pagos[${i}]`, pegas);
  });
  if (m.coche !== null) {
    if (typeof m.coche?.haceFalta !== "boolean") pegas.push({ donde: "moverse.coche", que: "no dice si hace falta" });
    pegasDeLaFuente(m.coche?.fuente, "moverse.coche", pegas);
  }
  const llenas = m.llegar.length + m.transportes.length + m.billetes.length + m.pagos.length + (m.coche ? 1 : 0);
  pegasDeLaFalta(m.falta, llenas, "moverse", pegas);
  return pegas;
}

/** Lo que se comprueba de lo que conviene saber: cada cosa en su clase y bajo su tope, corta y con su fuente. */
export function pegasDelDestino(d: DelDestino, zonas: readonly string[] | null = null): Pega[] {
  const pegas: Pega[] = [];
  if (typeof d !== "object" || d === null || !esLista(d.cosas)) return [{ donde: "saber", que: "no es una lista" }];
  const cuantas = new Map<string, number>();
  d.cosas.forEach((x, i) => {
    const donde = `saber.cosas[${i}]`;
    if (!CLASES_DEL_DESTINO.includes(x?.clase))
      return void pegas.push({ donde, que: "no es de una clase de la lista" });
    cuantas.set(x.clase, (cuantas.get(x.clase) ?? 0) + 1);
    if (x.zona !== null && (typeof x.zona !== "string" || (zonas !== null && !zonas.includes(x.zona))))
      pegas.push({ donde, que: "habla de una zona que no es de la ruta" });
    if (!esNombre(x.nombre)) pegas.push({ donde, que: "su nombre no es un nombre corto" });
    if (
      x.punto !== null &&
      !(esNumero(Math.abs(x.punto?.lat)) && Math.abs(x.punto.lat) <= 90 && Math.abs(x.punto.lon) <= 180)
    )
      pegas.push({ donde, que: "su sitio no está en el mapa" });
    if (typeof x.frase !== "string" || x.frase.trim() === "" || x.frase.length > LETRAS_DE_UNA_COSA)
      pegas.push({ donde, que: `no es una frase de hasta ${LETRAS_DE_UNA_COSA} letras` });
    else
      for (const p of pegasDelTexto(x.frase, { sinNumerosLargos: true })) pegas.push({ donde, que: `su frase ${p}` });
    if (x.cuesta !== null) {
      const c = x.cuesta;
      const deComer = x.clase === "meal_cost" || x.clase === "dish" || x.clase === "market" || x.clase === "food_area";
      if (!deComer) pegas.push({ donde, que: "dice lo que cuesta algo que no es de comer" });
      if (!(esNumero(c?.desde) && esNumero(c?.hasta) && c.desde <= c.hasta && c.hasta > 0 && esMoneda(c.moneda)))
        pegas.push({ donde, que: "lo que cuesta no es de tanto a tanto, con su moneda" });
    }
    pegasDeLaFuente(x.fuente, donde, pegas);
  });
  for (const [clase, n] of cuantas)
    if (n > TOPE_POR_CLASE[clase as ClaseDelDestino])
      pegas.push({
        donde: "saber.cosas",
        que: `trae ${n} de ${clase}, y caben ${TOPE_POR_CLASE[clase as ClaseDelDestino]}`,
      });
  pegasDeLaFalta(d.falta, d.cosas.length, "saber", pegas);
  return pegas;
}

/** Lo que se comprueba de las entradas: una por parada del viaje, con sus precios, sus horarios y sus fuentes. */
export function pegasDeLasEntradas(e: DeLasEntradas, paradas: readonly string[]): Pega[] {
  const pegas: Pega[] = [];
  if (typeof e !== "object" || e === null || !Array.isArray(e.sitios))
    return [{ donde: "entradas", que: "no es una lista" }];
  const vistas = new Set<string>();
  e.sitios.forEach((x, i) => {
    const donde = `entradas.sitios[${i}]`;
    if (typeof x?.parada !== "string" || !paradas.includes(x.parada))
      return void pegas.push({ donde, que: "no es de una parada del viaje" });
    if (vistas.has(x.parada)) pegas.push({ donde, que: "su parada sale dos veces" });
    vistas.add(x.parada);
    pegasDeLosPrecios(x.precios, `${donde}.precios`, pegas);
    pegasDeLosHorarios(x.horarios, `${donde}.horarios`, pegas);
    if (x.reservar !== null) {
      if (typeof x.reservar?.haceFalta !== "boolean") pegas.push({ donde, que: "no dice si hay que reservar" });
      if (x.reservar?.donde != null && !enlaceDeCapa(x.reservar.donde))
        pegas.push({ donde, que: "dónde se reserva no es una dirección https" });
      pegasDeLaFuente(x.reservar?.fuente, `${donde}.reservar`, pegas);
    }
    if (x.web !== null && !enlaceDeCapa(x.web)) pegas.push({ donde, que: "su web no es una dirección https" });
    if (typeof x.mirado !== "boolean") pegas.push({ donde, que: "no dice si se miró" });
    if (x.sinMirar != null && (x.mirado || !SIN_MIRAR.includes(x.sinMirar)))
      pegas.push({ donde, que: "su porqué de no mirarse no es de la lista, o sí se miró" });
  });
  pegasDeLaFalta(e.falta, e.sitios.length, "entradas", pegas);
  return pegas;
}

/** Lo que se comprueba del presupuesto: cada parte de la lista, sus números y que el total sea la suma de lo sabido. */
export function pegasDelPresupuesto(p: Presupuesto, maneras: readonly string[], moneda: string | null = null): Pega[] {
  const pegas: Pega[] = [];
  if (typeof p !== "object" || p === null || !Array.isArray(p.maneras))
    return [{ donde: "presupuesto", que: "no es una lista de maneras" }];
  p.maneras.forEach((m, i) => {
    const donde = `presupuesto.maneras[${i}]`;
    if (!maneras.includes(m?.manera)) return void pegas.push({ donde, que: "no es de una manera del viaje" });
    if (!esMoneda(m.moneda) || (moneda !== null && m.moneda !== moneda))
      pegas.push({ donde, que: "su moneda no es la del viaje" });
    if (!Array.isArray(m.partes)) return void pegas.push({ donde, que: "sus partes no son una lista" });
    let suma = 0;
    let faltan = 0;
    m.partes.forEach((x, j) => {
      const aqui = `${donde}.partes[${j}]`;
      if (!PARTES_DEL_PRESUPUESTO.includes(x?.parte))
        return void pegas.push({ donde: aqui, que: "no es una parte de la lista" });
      if (!ORIGENES_DE_UNA_PARTE.includes(x.origen))
        pegas.push({ donde: aqui, que: "no dice de dónde sale, de la lista" });
      if (x.total !== null && !esNumero(x.total)) pegas.push({ donde: aqui, que: "su total no es un número" });
      if ((x.origen === "unknown") !== (x.total === null))
        pegas.push({ donde: aqui, que: "su total y lo que dice de dónde sale no casan" });
      if (x.moneda !== m.moneda) pegas.push({ donde: aqui, que: "su moneda no es la de su manera" });
      if (!(Number.isInteger(x.faltan) && x.faltan >= 0))
        pegas.push({ donde: aqui, que: "lo que falta no es un número" });
      if (!Array.isArray(x.fuentes)) pegas.push({ donde: aqui, que: "sus fuentes no son una lista" });
      else x.fuentes.forEach((f, k) => pegasDeLaFuente(f, `${aqui}.fuentes[${k}]`, pegas));
      if (
        !Array.isArray(x.aparte) ||
        !x.aparte.every((a) => esNumero(a?.importe) && esMoneda(a.moneda) && a.moneda !== m.moneda)
      )
        pegas.push({ donde: aqui, que: "lo de otra moneda no es un importe en otra moneda" });
      suma += x.total ?? 0;
      faltan += Number.isInteger(x.faltan) ? x.faltan : 0;
    });
    const vistas = m.partes.map((x) => x?.parte);
    if (new Set(vistas).size !== vistas.length) pegas.push({ donde, que: "una parte sale dos veces" });
    if (!esNumero(m.total) || Math.abs(m.total - suma) > 0.01)
      pegas.push({ donde, que: "su total no es la suma de sus partes" });
    if (m.faltan !== faltan) pegas.push({ donde, que: "lo que falta no es la suma de lo que falta en sus partes" });
  });
  if (p.comidas !== null) {
    const c = p.comidas;
    if (!(esNumero(c?.desde) && esNumero(c?.hasta) && c.desde <= c.hasta && esMoneda(c.moneda)))
      pegas.push({ donde: "presupuesto.comidas", que: "no es una horquilla por día con su moneda" });
    if (!Array.isArray(c?.fuentes)) pegas.push({ donde: "presupuesto.comidas", que: "sus fuentes no son una lista" });
    else c.fuentes.forEach((f, k) => pegasDeLaFuente(f, `presupuesto.comidas.fuentes[${k}]`, pegas));
  }
  pegasDeLaFalta(p.falta, p.maneras.length, "presupuesto", pegas);
  return pegas;
}

/** Lo que se comprueba de las capas de un viaje: las que no están no se miran, y las que faltan, solo su porqué. */
export function pegasDeLasCapas(
  c: CapasDelViaje,
  v: { paradas: { id: string }[]; maneras: { id: string; moneda: string }[] },
): Pega[] {
  const pegas: Pega[] = [];
  if (c.moverse !== undefined) pegas.push(...pegasDeMoverse(c.moverse));
  if (c.saber !== undefined) pegas.push(...pegasDelDestino(c.saber));
  if (c.entradas !== undefined)
    pegas.push(
      ...pegasDeLasEntradas(
        c.entradas,
        v.paradas.map((p) => p.id),
      ),
    );
  if (c.presupuesto !== undefined)
    pegas.push(
      ...pegasDelPresupuesto(
        c.presupuesto,
        v.maneras.map((m) => m.id),
        v.maneras[0]?.moneda ?? null,
      ),
    );
  return pegas;
}
