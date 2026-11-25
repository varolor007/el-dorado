// El presupuesto entero (14.5), en código y sin IA, sin nada de Node: a dormir y llegar les suma lo que se sabe de las
// entradas, de moverse allí y de llegar de donde se aterriza; las comidas, aparte, como una horquilla. Lo que no se
// sabe ni se suma ni se esconde: se cuenta. Lo que va en otra moneda no se suma: se dice aparte. Las tres maneras se
// siguen comparando por dormir y llegar: esto no cambia cuál gana.
//
// Cada parte dice de dónde sale: un precio con su fuente (dormir y llegar, del viaje), una cuenta del código con
// precios con fuente (las entradas, moverse allí y llegar a donde se duerme) o «no se sabe». La usa la casa al montar
// el viaje y la puede usar la web cuando el viajero cambia el ritmo o quita una parada (`conOtrosDias`).

import {
  COMIDAS_AL_DIA,
  PLAZAS_DE_UN_COCHE,
  PRECIOS_QUE_NO_SE_PONEN,
  SE_PAGAN_POR_COCHE,
  type PARTES_DEL_PRESUPUESTO,
} from "../data/presupuesto.ts";
import type {
  DeLasEntradas,
  DeMoverse,
  DelDestino,
  Edades,
  FuenteDeUnDato,
  Importe,
  ManeraDeLlegar,
  ParteDelPresupuesto,
  PrecioDeCapa,
  Presupuesto,
  PresupuestoDeUnaManera,
} from "../output/capas.ts";
import type { Punto, Viaje, ZonaDeLaRuta } from "../output/viaje.ts";
import { cuentaDelGrupo, viajesDeLosDias } from "./capa_moverse.ts";
import { entradaDe } from "./capas.ts";

type ClaseDeParte = (typeof PARTES_DEL_PRESUPUESTO)[number];

/** Las capas con que se hace la cuenta: cada una puede no estar o faltar. */
export type CapasParaLaCuenta = { moverse?: DeMoverse; saber?: DelDestino; entradas?: DeLasEntradas };

/** Quiénes viajan, como los cuenta un precio: cuántos adultos (sin edad) y la edad de cada niño. */
export type Grupo = { adultos: number; ninos: number[] };

/** Los trayectos de un día que no se andan: los que pasan de lo que se anda de una parada a otra. */
export type TrayectosDeUnDia = { fecha: string; trayectos: number };

/** Lo que da la cuenta de moverse allí: lo que cuesta para el grupo, en una moneda, y de qué páginas sale. */
export type LoQueCuestaMoverse = { importe: number; moneda: string; fuentes: FuenteDeUnDato[] };

/**
 * La cuenta de moverse allí (billetes sueltos o un abono, según los trayectos que no se andan en los días), que es
 * de 14.2. Null si no se sabe. Con la moneda del viaje, para que prefiera sus precios.
 */
export type CuentaDeMoverse = (
  m: DeMoverse,
  dias: TrayectosDeUnDia[],
  grupo: Grupo,
  moneda: string,
) => LoQueCuestaMoverse | null;

/** Sin cuenta, moverse allí no se sabe: para las pruebas, y para quien no quiera la de 14.2. */
export const SIN_CUENTA_DE_MOVERSE: CuentaDeMoverse = () => null;

/**
 * La cuenta de 14.2, como la quiere el presupuesto: lo más barato que le sale a cada uno del grupo (sueltos, un abono,
 * un bono o una mezcla), sumado. Null si a alguno no se le sabe, o si no salen todos en la misma moneda: una parte no
 * se suma a medias. Es la que se usa si no se dice otra.
 */
export const LA_CUENTA_DE_MOVERSE: CuentaDeMoverse = (m, dias, grupo, moneda) => {
  const viajes = dias.map((d) => ({ fecha: d.fecha, viajes: d.trayectos }));
  const r = cuentaDelGrupo(viajes, m, grupo.adultos, grupo.ninos, moneda);
  if (r.total === null) return null;
  const fuentes: FuenteDeUnDato[] = [];
  for (const f of r.porPersona.flatMap((c) => c.fuentes))
    if (!fuentes.some((x) => x.url === f.url && x.visto === f.visto)) fuentes.push({ ...f });
  return { importe: r.total, moneda: r.moneda ?? moneda, fuentes };
};

/** Una zona de la ruta, por su id y por su nombre: el alojamiento dice su zona por el nombre, y llegar, por el id. */
export type ZonaParaLaCuenta = ZonaDeLaRuta;

/** Lo que la cuenta puede recibir además del viaje: las zonas de la ruta y la cuenta de moverse. */
export type OpcionesDeLaCuenta = { zonas?: ZonaParaLaCuenta[]; moverse?: CuentaDeMoverse };

/** Una parte que no se sabe: sin total, y cuántas cosas faltan. */
export const sinSaber = (parte: ClaseDeParte, moneda: string, faltan: number): ParteDelPresupuesto => ({
  parte,
  origen: "unknown",
  total: null,
  moneda,
  fuentes: [],
  faltan,
  aparte: [],
});

const redondo = (n: number): number => Math.round(n * 100) / 100;

// 1. El precio de cada uno, para quien es.

const cubre = (e: Edades | null, edad: number): boolean =>
  e !== null && (e.desde === null || e.desde <= edad) && (e.hasta === null || edad <= e.hasta);
const deNinos = (p: PrecioDeCapa): boolean => p.para === "child" || p.para === "infant" || p.para === "youth";
const comoAdulto = (p: PrecioDeCapa): boolean => p.para === "adult" || p.para === "any";

/**
 * Los precios que le valen a uno: a un adulto (sin edad), los de adulto o los de cualquiera; a un niño, los que dicen
 * unas edades que tienen la suya; si no hay, y hay uno de niño sin edades, no se sabe si es el suyo; si tampoco, paga
 * como un adulto, si ese precio no le deja fuera por la edad. Nunca el de estudiante, mayor, familia o grupo.
 */
export function preciosParaUno(precios: PrecioDeCapa[], edad: number | null): PrecioDeCapa[] {
  const ponibles = precios.filter((p) => !(PRECIOS_QUE_NO_SE_PONEN as readonly string[]).includes(p.para));
  if (edad === null) return ponibles.filter(comoAdulto);
  const porSuEdad = ponibles.filter((p) => cubre(p.edades, edad));
  if (porSuEdad.length > 0) return porSuEdad;
  if (ponibles.some((p) => deNinos(p) && p.edades === null)) return [];
  return ponibles.filter((p) => comoAdulto(p) && p.edades === null);
}

/** El que más conviene de unos precios: gratis; si no, el más barato en la moneda del viaje; si no, en otra. */
export function elQueConviene(precios: PrecioDeCapa[], moneda: string): PrecioDeCapa | null {
  const gratis = precios.find((p) => p.cuanto === "free");
  if (gratis !== undefined) return gratis;
  const conImporte = precios.filter((p) => p.cuanto !== "free") as (PrecioDeCapa & { cuanto: Importe })[];
  const deLaMoneda = conImporte.filter((p) => p.cuanto.moneda === moneda);
  const entre =
    deLaMoneda.length > 0 ? deLaMoneda : conImporte.filter((p) => p.cuanto.moneda === conImporte[0]?.cuanto.moneda);
  return entre.reduce<PrecioDeCapa | null>(
    (mejor, p) => (mejor === null || (p.cuanto as Importe).importe < (mejor.cuanto as Importe).importe ? p : mejor),
    null,
  );
}

/** Lo que cuesta algo para el grupo: un importe por moneda (sin los gratis) y de qué páginas sale. */
export type DelGrupo = { importes: Importe[]; fuentes: FuenteDeUnDato[] };

function juntar(cuantos: { cuanto: Importe | "free"; veces: number; fuente: FuenteDeUnDato }[]): DelGrupo {
  const importes: Importe[] = [];
  const fuentes: FuenteDeUnDato[] = [];
  for (const c of cuantos) {
    if (!fuentes.some((f) => f.url === c.fuente.url && f.visto === c.fuente.visto)) fuentes.push({ ...c.fuente });
    if (c.cuanto === "free") continue;
    const { importe, moneda } = c.cuanto;
    const ya = importes.find((x) => x.moneda === moneda);
    if (ya === undefined) importes.push({ importe: redondo(importe * c.veces), moneda });
    else ya.importe = redondo(ya.importe + importe * c.veces);
  }
  return { importes, fuentes };
}

/**
 * Lo que cuesta algo que se paga por persona para cada uno del grupo, con lo que se sabe: lo sumado de los que tienen
 * su precio, a cuántos no se les sabe, cuántos sois y si es gratis para todos. Es la única cuenta del precio de un
 * grupo: la usan el presupuesto y la web, en la tarjeta y en la ficha de cada parada (14.6). Null sin precios.
 */
export type CadaUnoDelGrupo = DelGrupo & { faltan: number; cuantos: number; gratis: boolean };

export function cadaUnoDelGrupo(precios: PrecioDeCapa[] | null, grupo: Grupo, moneda: string): CadaUnoDelGrupo | null {
  if (precios === null || precios.length === 0) return null;
  const personas: (number | null)[] = [
    ...Array.from({ length: Math.max(0, grupo.adultos) }, () => null),
    ...grupo.ninos,
  ];
  const cuantos = [];
  let faltan = 0;
  for (const edad of personas) {
    const p = elQueConviene(preciosParaUno(precios, edad), moneda);
    if (p === null) faltan++;
    else cuantos.push({ cuanto: p.cuanto, veces: 1, fuente: p.fuente });
  }
  const gratis = faltan === 0 && cuantos.every((c) => c.cuanto === "free");
  return { ...juntar(cuantos), faltan, cuantos: personas.length, gratis };
}

/**
 * Lo que cuesta algo que se paga por persona, para el grupo: cada uno con el precio que le vale. Null si a alguno no
 * se le sabe: entonces no se sabe la cosa entera, y no se suma a medias.
 */
export function delGrupo(precios: PrecioDeCapa[] | null, grupo: Grupo, moneda: string): DelGrupo | null {
  const c = cadaUnoDelGrupo(precios, grupo, moneda);
  return c === null || c.faltan > 0 ? null : { importes: c.importes, fuentes: c.fuentes };
}

/** Lo que paga un adulto, el precio que le toca: para decirlo al lado de lo del grupo. Null si no se sabe. */
export const elDeUnAdulto = (precios: PrecioDeCapa[] | null, moneda: string): PrecioDeCapa | null =>
  precios === null ? null : elQueConviene(preciosParaUno(precios, null), moneda);

/** Lo que cuesta algo que se paga por coche (un taxi), para el grupo: tantos coches como hagan falta. */
export function porCoche(precios: PrecioDeCapa[] | null, grupo: Grupo, moneda: string): DelGrupo | null {
  if (precios === null) return null;
  const valen = precios.filter((p) => p.para === "any" || p.para === "adult" || p.para === "group");
  const p = elQueConviene(valen, moneda);
  if (p === null) return null;
  const coches = Math.max(1, Math.ceil((grupo.adultos + grupo.ninos.length) / PLAZAS_DE_UN_COCHE));
  return juntar([{ cuanto: p.cuanto, veces: coches, fuente: p.fuente }]);
}

// 2. Las partes que salen de las capas.

/** Lo que se va sumando de una parte: lo de su moneda, lo de otras, sus fuentes, lo sabido y lo que falta. */
class Cuenta {
  total = 0;
  sumadas = 0;
  faltan = 0;
  aparte: Importe[] = [];
  fuentes: FuenteDeUnDato[] = [];
  readonly parte: ClaseDeParte;
  readonly moneda: string;
  constructor(parte: ClaseDeParte, moneda: string) {
    this.parte = parte;
    this.moneda = moneda;
  }
  /** Una cosa: lo que cuesta para el grupo, tantas veces; o null, que no se sabe. */
  suma(c: DelGrupo | null, veces = 1): void {
    if (c === null) return void (this.faltan += veces);
    for (const f of c.fuentes)
      if (!this.fuentes.some((x) => x.url === f.url && x.visto === f.visto)) this.fuentes.push({ ...f });
    const otras = c.importes.filter((i) => i.moneda !== this.moneda);
    const suya = c.importes.find((i) => i.moneda === this.moneda);
    if (suya !== undefined || otras.length === 0) {
      this.sumadas += veces;
      this.total = redondo(this.total + (suya?.importe ?? 0) * veces);
    }
    for (const o of otras) {
      const ya = this.aparte.find((x) => x.moneda === o.moneda);
      if (ya === undefined) this.aparte.push({ importe: redondo(o.importe * veces), moneda: o.moneda });
      else ya.importe = redondo(ya.importe + o.importe * veces);
    }
  }
  /**
   * La parte: una cuenta del código si algo se sumó en su moneda, o si no había nada que contar (es cero); si no, no
   * se sabe, con lo que falta y lo que va en otra moneda dicho.
   */
  parteHecha(): ParteDelPresupuesto {
    const nada = this.sumadas === 0 && this.faltan === 0 && this.aparte.length === 0;
    if (this.sumadas > 0 || nada)
      return {
        parte: this.parte,
        origen: "computed",
        total: this.total,
        moneda: this.moneda,
        fuentes: this.fuentes,
        faltan: this.faltan,
        aparte: this.aparte,
      };
    return { ...sinSaber(this.parte, this.moneda, this.faltan), fuentes: this.fuentes, aparte: this.aparte };
  }
}

/** Quiénes viajan, del viaje. */
export const grupoDe = (v: Pick<Viaje, "adultos" | "ninos">): Grupo => ({ adultos: v.adultos, ninos: [...v.ninos] });

/** Las paradas que están en los días, una vez cada una, en su orden. */
const paradasDeLosDias = (v: Viaje): string[] => [...new Set(v.dias.flatMap((d) => d.paradas))];

/** Las entradas de los sitios que están en los días, para el grupo: cada precio, para quien es. */
export function lasEntradas(v: Viaje, moneda: string, capas: CapasParaLaCuenta): ParteDelPresupuesto {
  const c = new Cuenta("tickets", moneda);
  const grupo = grupoDe(v);
  for (const id of paradasDeLosDias(v)) c.suma(delGrupo(entradaDe(capas.entradas, id)?.precios ?? null, grupo, moneda));
  return c.parteHecha();
}

/** Dónde se duerme en una manera, para contar los trayectos de allí a la primera parada y de la última a allí. */
export const dondeDuerme = (v: Pick<Viaje, "alojamientos">, m: Viaje["maneras"][number] | undefined): Punto | null =>
  m === undefined ? null : (v.alojamientos.find((a) => a.id === m.alojamiento)?.punto ?? null);

/**
 * Los trayectos que no se andan en cada día, con la cuenta de caminos del de moverse (`viajesDeLosDias`), la misma
 * con que la web y la guía dicen cada tramo: de una parada a la siguiente y, con la manera, de donde se duerme a la
 * primera y de la última a donde se duerme. Una sola cuenta (14.6): lo que se paga es lo que se enseña.
 */
export function trayectosQueNoSeAndan(
  v: Pick<Viaje, "dias" | "paradas" | "caminos" | "alojamientos">,
  manera?: Viaje["maneras"][number],
): TrayectosDeUnDia[] {
  const deCadaDia = new Map(viajesDeLosDias(v, dondeDuerme(v, manera)).map((d) => [d.fecha, d.viajes]));
  return v.dias.map((d) => ({ fecha: d.fecha, trayectos: deCadaDia.get(d.fecha) ?? 0 }));
}

/**
 * La cuenta de lo que te conviene para moverte, entera, como la hace el presupuesto: con tus días, tu grupo y donde
 * duermes en la manera. Su total es el de «moverte allí» en las cuentas; la web y la guía la enseñan tal cual.
 */
export function cuentaDeMoverseDelViaje(
  v: Viaje,
  manera: Viaje["maneras"][number] | undefined,
  moverse: DeMoverse | undefined = v.moverse,
): { dias: TrayectosDeUnDia[]; viajes: number; grupo: ReturnType<typeof cuentaDelGrupo> } {
  const dias = trayectosQueNoSeAndan(v, manera);
  const viajes = dias.map((d) => ({ fecha: d.fecha, viajes: d.trayectos }));
  const moneda = manera?.moneda ?? v.maneras[0]?.moneda ?? null;
  return {
    dias,
    viajes: dias.reduce((s, d) => s + d.trayectos, 0),
    grupo: cuentaDelGrupo(viajes, moverse, v.adultos, v.ninos, moneda),
  };
}

/**
 * Moverse allí: lo que da la cuenta de sueltos o abono (de 14.2) con los trayectos que no se andan. Sin ninguno, es
 * cero; sin la capa o sin cuenta, no se sabe, y faltan esos trayectos.
 */
export function moverseAlli(
  v: Viaje,
  moneda: string,
  capas: CapasParaLaCuenta,
  cuenta: CuentaDeMoverse = LA_CUENTA_DE_MOVERSE,
  manera?: Viaje["maneras"][number],
): ParteDelPresupuesto {
  const dias = trayectosQueNoSeAndan(v, manera);
  const n = dias.reduce((s, d) => s + d.trayectos, 0);
  const c = new Cuenta("getting_around", moneda);
  if (n === 0) return c.parteHecha();
  const m = capas.moverse;
  const r = m === undefined || m.falta !== null ? null : cuenta(m, dias, grupoDe(v), moneda);
  const valida = r !== null && Number.isFinite(r.importe) && r.importe >= 0 && /^[A-Z]{3}$/.test(r.moneda);
  c.suma(
    valida ? { importes: r.importe > 0 ? [{ importe: r.importe, moneda: r.moneda }] : [], fuentes: r.fuentes } : null,
    1,
  );
  // Lo que falta son los trayectos, no la cuenta.
  if (!valida) c.faltan = n;
  return c.parteHecha();
}

/** De dónde se llega, por la clase del transporte del viaje. En coche se llega a la puerta. */
const DE_DONDE = { flight: "airport", train: "station", bus: "station" } as const;

/**
 * Las maneras de llegar que valen para una manera del viaje: de donde llega su transporte (por su código, si alguna
 * lo dice) a la zona donde duerme. Si el alojamiento no dice su zona y todas van a la misma, valen todas; si van a
 * varias, no se sabe cuál.
 */
function lasQueLlevan(
  llegar: ManeraDeLlegar[],
  clase: "airport" | "station",
  codigo: string,
  zona: string | null,
  zonas: ZonaParaLaCuenta[],
): ManeraDeLlegar[] {
  const deAlli = llegar.filter((x) => x.desde.clase === clase);
  const porCodigo = deAlli.filter((x) => x.desde.codigo?.toUpperCase() === codigo.toUpperCase());
  const candidatas = porCodigo.length > 0 ? porCodigo : deAlli.filter((x) => x.desde.codigo === null);
  const id = zona === null ? null : (zonas.find((z) => z.nombre === zona || z.id === zona)?.id ?? zona);
  const aSuZona = id === null ? [] : candidatas.filter((x) => x.aZona === id);
  if (aSuZona.length > 0) return aSuZona;
  return new Set(candidatas.map((x) => x.aZona)).size === 1 ? candidatas : [];
}

/**
 * Llegar de donde se aterriza a donde se duerme, en una manera: lo que más conviene al grupo de las maneras que
 * llevan a su zona, a la ida y, si el transporte vuelve, a la vuelta. Un taxi se paga por coche; lo demás, por
 * persona. Sin transporte, o sin la capa, no se sabe.
 */
export function llegarADormir(
  v: Viaje,
  m: Viaje["maneras"][number],
  capas: CapasParaLaCuenta,
  zonas: ZonaParaLaCuenta[] = [],
): ParteDelPresupuesto {
  const c = new Cuenta("arrival", m.moneda);
  const t = m.transporte === null ? undefined : v.transportes.find((x) => x.id === m.transporte);
  if (t === undefined) return sinSaber("arrival", m.moneda, 1);
  if (t.clase === "car") return c.parteHecha();
  const veces = t.vuelve === null ? 1 : 2;
  const mv = capas.moverse;
  if (mv === undefined || mv.falta !== null) return sinSaber("arrival", m.moneda, veces);
  const zona = v.alojamientos.find((a) => a.id === m.alojamiento)?.zona ?? null;
  const grupo = grupoDe(v);
  const opciones = lasQueLlevan(mv.llegar, DE_DONDE[t.clase], t.a, zona, zonas)
    .map((x) =>
      (SE_PAGAN_POR_COCHE as readonly string[]).includes(x.modo)
        ? porCoche(x.precios, grupo, m.moneda)
        : delGrupo(x.precios, grupo, m.moneda),
    )
    .filter((x): x is DelGrupo => x !== null);
  const importeEn = (x: DelGrupo, moneda: string): number | null =>
    x.importes.length === 0
      ? 0
      : x.importes.length === 1 && x.importes[0].moneda === moneda
        ? x.importes[0].importe
        : null;
  const enSuMoneda = opciones.filter((x) => importeEn(x, m.moneda) !== null);
  const mejor =
    enSuMoneda.sort((a, b) => importeEn(a, m.moneda)! - importeEn(b, m.moneda)!)[0] ??
    opciones.filter((x) => x.importes.length === 1).sort((a, b) => a.importes[0].importe - b.importes[0].importe)[0] ??
    null;
  c.suma(mejor, veces);
  return c.parteHecha();
}

/**
 * Las partes que salen de las capas: llegar de donde se aterriza, moverse allí y las entradas. Lo que no se sabe va
 * contado: una cosa por viaje a donde se duerme, un trayecto por cada uno que no se anda, una entrada por parada.
 */
export function partesDeLasCapas(
  v: Viaje,
  moneda: string,
  capas: CapasParaLaCuenta,
  opciones: OpcionesDeLaCuenta & { manera?: Viaje["maneras"][number] } = {},
): ParteDelPresupuesto[] {
  const manera = opciones.manera ?? v.maneras.find((m) => m.moneda === moneda) ?? v.maneras[0];
  const llegar =
    manera === undefined
      ? sinSaber("arrival", moneda, 1)
      : llegarADormir(v, { ...manera, moneda }, capas, opciones.zonas);
  return [llegar, moverseAlli(v, moneda, capas, opciones.moverse, manera), lasEntradas(v, moneda, capas)];
}

// 3. Las comidas, aparte.

/**
 * Las comidas, aparte y sin sumar: una horquilla por día y por persona, de lo que suele costar una comida allí (el
 * que conoce el destino), por las comidas de pago de un día. En la moneda del viaje si la dice; si no, en la suya.
 */
export function comidasDe(capas: CapasParaLaCuenta, moneda: string | null = null): Presupuesto["comidas"] {
  const s = capas.saber;
  if (s === undefined || s.falta !== null) return null;
  const conPrecio = s.cosas.filter((c) => c.clase === "meal_cost" && c.cuesta !== null);
  if (conPrecio.length === 0) return null;
  const suya = conPrecio.filter((c) => c.cuesta!.moneda === moneda);
  const elegidas = suya.length > 0 ? suya : conPrecio.filter((c) => c.cuesta!.moneda === conPrecio[0].cuesta!.moneda);
  const fuentes: FuenteDeUnDato[] = [];
  for (const c of elegidas)
    if (!fuentes.some((f) => f.url === c.fuente.url && f.visto === c.fuente.visto)) fuentes.push({ ...c.fuente });
  return {
    desde: redondo(Math.min(...elegidas.map((c) => c.cuesta!.desde)) * COMIDAS_AL_DIA),
    hasta: redondo(Math.max(...elegidas.map((c) => c.cuesta!.hasta)) * COMIDAS_AL_DIA),
    moneda: elegidas[0].cuesta!.moneda,
    fuentes,
  };
}

// 4. Dormir y llegar, la suma y el presupuesto entero.

/** Una fuente de un precio del viaje, si su enlace es una página: el de su vendedor, con el día en que se vio. */
function fuenteDelPrecio(p: { enlace: string | null; visto: string }): FuenteDeUnDato[] {
  return p.enlace === null ? [] : [{ url: p.enlace, visto: p.visto.slice(0, 10) }];
}

/** Dormir y llegar de una manera, de los precios que ya trae el viaje: son los que la comparan con las otras. */
function dormirYLlegar(v: Viaje, m: Viaje["maneras"][number]): ParteDelPresupuesto[] {
  const a = v.alojamientos.find((x) => x.id === m.alojamiento);
  const t = m.transporte === null ? undefined : v.transportes.find((x) => x.id === m.transporte);
  const dePrecio = (parte: "lodging" | "transport", p: Viaje["alojamientos"][number]["precio"]): ParteDelPresupuesto =>
    p.moneda === m.moneda
      ? {
          parte,
          origen: "priced",
          total: p.total,
          moneda: m.moneda,
          fuentes: fuenteDelPrecio(p),
          faltan: 0,
          aparte: [],
        }
      : { ...sinSaber(parte, m.moneda, 0), aparte: [{ importe: p.total, moneda: p.moneda }] };
  return [
    a === undefined ? sinSaber("lodging", m.moneda, 1) : dePrecio("lodging", a.precio),
    t === undefined ? sinSaber("transport", m.moneda, 1) : dePrecio("transport", t.precio),
  ];
}

/** Suma las partes de una manera: lo que se sabe en su moneda, lo que falta y lo que va en otra moneda, aparte. */
export function sumarPartes(manera: string, moneda: string, partes: ParteDelPresupuesto[]): PresupuestoDeUnaManera {
  const aparte: Importe[] = [];
  for (const p of partes)
    for (const a of p.aparte) {
      const ya = aparte.find((x) => x.moneda === a.moneda);
      if (ya === undefined) aparte.push({ ...a });
      else ya.importe = redondo(ya.importe + a.importe);
    }
  return {
    manera,
    partes,
    total: redondo(partes.reduce((s, p) => s + (p.total ?? 0), 0)),
    moneda,
    faltan: partes.reduce((s, p) => s + p.faltan, 0),
    aparte,
  };
}

/**
 * El presupuesto entero de un viaje ya montado, por manera, con las capas que haya: cada manera con su dormir, su
 * llegar, su llegar a donde duerme y su moverse allí, que cuenta los trayectos desde donde duerme; las entradas,
 * iguales en las tres.
 */
export function presupuestoDe(v: Viaje, capas: CapasParaLaCuenta, opciones: OpcionesDeLaCuenta = {}): Presupuesto {
  const maneras = v.maneras.map((m) =>
    sumarPartes(m.id, m.moneda, [
      ...dormirYLlegar(v, m),
      ...partesDeLasCapas(v, m.moneda, capas, { ...opciones, manera: m }),
    ]),
  );
  return { maneras, comidas: comidasDe(capas, v.maneras[0]?.moneda ?? null), falta: null };
}

/**
 * El presupuesto con otros días (otro ritmo, una parada quitada o añadida), para la web: las entradas y moverse allí,
 * otra vez con los días que hay; llegar a donde se duerme no cambia con los días y se queda el de antes, que la web
 * no sabe rehacer sin las zonas de la ruta.
 */
export function conOtrosDias(
  v: Viaje,
  capas: CapasParaLaCuenta,
  antes: Presupuesto,
  opciones: OpcionesDeLaCuenta = {},
): Presupuesto {
  const nuevo = presupuestoDe(v, capas, opciones);
  return {
    ...nuevo,
    maneras: nuevo.maneras.map((m) => {
      const llegar = antes.maneras.find((x) => x.manera === m.manera)?.partes.find((p) => p.parte === "arrival");
      if (llegar === undefined || llegar.moneda !== m.moneda) return m;
      return sumarPartes(
        m.manera,
        m.moneda,
        m.partes.map((p) => (p.parte === "arrival" ? llegar : p)),
      );
    }),
  };
}
