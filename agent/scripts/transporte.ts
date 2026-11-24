// La búsqueda de transporte: código, sin IA. De lo que he entendido del viaje saca de qué sitios con vuelos se sale y
// a cuáles se llega, monta la parrilla de pares y de días y le pide a la fuente sus precios, con pocas peticiones.
// Cada opción lleva su precio por viajero, sus escalas si la fuente las dice, su enlace y el día en que se vio.
//
// Un sitio con vuelos es una ciudad de la fuente con sus aeropuertos: con su código se piden los precios de todos a
// la vez. Su tamaño es a cuántos sitios vuela sin escala, de los datos de la fuente, y no de una lista nuestra.

import {
  DIAS_ALREDEDOR,
  ESCALAS_MAXIMAS,
  KILOMETROS_ALREDEDOR,
  LUGARES_DE_LLEGADA,
  LUGARES_DE_SALIDA,
  PARES,
} from "../data/transporte.ts";
import { enLineaRecta, type Punto } from "../tools/distancias.ts";
import type { Aeropuerto, Ciudad, FuenteTransporte, LugaresDeVuelo, Trayecto, Vuelo } from "../tools/fuentes/tipos.ts";
import { paraElGrupo } from "../tools/fuentes/tipos.ts";
import type { Caja, Entendido } from "./formas.ts";

/** Por qué se mira un sitio: lo dijo el viajero, es el más cercano, el más grande cerca, de la zona o el único. */
export const POR_QUE_UN_SITIO = ["given", "nearest", "biggest", "in_area", "far"] as const;

export type LugarDeVuelo = {
  /** El código con el que se piden sus precios: el de su ciudad, o el del aeropuerto que se dijo. */
  codigo: string;
  nombre: string;
  pais: string | null;
  /** Dónde está: su aeropuerto más cercano al punto, o null si la fuente no lo dice. */
  punto: Punto | null;
  aeropuertos: string[];
  /** A cuántos sitios vuelan sin escala sus aeropuertos, sumados. */
  rutas: number;
  /** A cuántos kilómetros en línea recta del punto de donde se sale o a donde se va, si se sabe. */
  km: number | null;
  porQue: (typeof POR_QUE_UN_SITIO)[number];
};

/** Cómo contestó la fuente a un par: con precios, sin ninguno, sin contestar, o no se le preguntó. */
export type Contesta = "prices" | "none" | "failed" | "not_asked";

export type ParDeVuelo = { de: string; a: string; fechas: Contesta; alrededor: Contesta };

export type Parrilla = {
  fuente: string;
  salida: LugarDeVuelo[];
  llegada: LugarDeVuelo[];
  pares: ParDeVuelo[];
  /** Los días de alrededor que se miraron a la ida y a la vuelta: cero si las fechas no se mueven. */
  dias: number;
  ida: string;
  vuelta: string;
  /** Cada opción, la más barata primero. Las de las fechas del viaje y las de los días de alrededor. */
  opciones: Vuelo[];
  peticiones: number;
  /** Lo que la fuente dio y no entra: más escalas de las que valen, otra moneda o un día que ya no se puede. */
  fuera: { escalas: number; moneda: number; antes: number };
  avisos: string[];
};

const dia = (fecha: string | null): string => (fecha ?? "").slice(0, 10);
const diasEntre = (a: string, b: string): number =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
const km = (a: Punto, b: Punto): number => Math.round(enLineaRecta(a, b) / 1000);

/** Un nombre, para compararlo con otro: sin mayúsculas, sin acentos y sin lo que no son letras. */
export function normalizado(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Los aeropuertos, juntos por su ciudad: un sitio con vuelos por ciudad. */
export function sitiosConVuelos(aeropuertos: Aeropuerto[]): Map<string, Aeropuerto[]> {
  const porCiudad = new Map<string, Aeropuerto[]>();
  for (const a of aeropuertos) {
    if (!porCiudad.has(a.ciudad)) porCiudad.set(a.ciudad, []);
    porCiudad.get(a.ciudad)!.push(a);
  }
  return porCiudad;
}

/** Un sitio con vuelos, de los aeropuertos de su ciudad: su punto es el del más cercano al punto que se diga. */
function lugarDe(codigo: string, suyos: Aeropuerto[], desde: Punto | null, porQue: LugarDeVuelo["porQue"]) {
  const cerca = desde === null ? suyos[0] : [...suyos].sort((x, y) => km(desde, x) - km(desde, y))[0];
  return {
    codigo,
    nombre: cerca.nombre,
    pais: cerca.pais,
    punto: { lat: cerca.lat, lon: cerca.lon },
    aeropuertos: suyos.map((a) => a.codigo).sort(),
    rutas: suyos.reduce((s, a) => s + a.rutas, 0),
    km: desde === null ? null : km(desde, cerca),
    porQue,
  } satisfies LugarDeVuelo;
}

/**
 * Los sitios con vuelos alrededor de un punto: el más cercano y, si los hay, los más grandes que él hasta tantos
 * kilómetros. Si no hay ninguno tan cerca, el más cercano que haya, con su distancia.
 */
export function alrededorDe(desde: Punto, aeropuertos: Aeropuerto[], cuantos: number): LugarDeVuelo[] {
  const sitios = [...sitiosConVuelos(aeropuertos)].map(([codigo, suyos]) => lugarDe(codigo, suyos, desde, "nearest"));
  if (sitios.length === 0 || cuantos < 1) return [];
  sitios.sort((a, b) => a.km! - b.km! || a.codigo.localeCompare(b.codigo));
  const cerca = sitios.filter((s) => s.km! <= KILOMETROS_ALREDEDOR);
  if (cerca.length === 0) return [{ ...sitios[0], porQue: "far" }];
  // El más grande de alrededor solo se añade si lo es más que el más cercano: si no, no aporta nada.
  const elegidos = [cerca[0]];
  const grandes = cerca
    .slice(1)
    .filter((g) => g.rutas > cerca[0].rutas)
    .sort((a, b) => b.rutas - a.rutas || a.km! - b.km!);
  for (const g of grandes) {
    if (elegidos.length >= cuantos) break;
    elegidos.push({ ...g, porQue: "biggest" });
  }
  return elegidos;
}

const dentro = (c: Caja, p: Punto): boolean =>
  p.lat >= c.south &&
  p.lat <= c.north &&
  (c.west <= c.east ? p.lon >= c.west && p.lon <= c.east : p.lon >= c.west || p.lon <= c.east);

/** Los sitios con vuelos más grandes de una región o un país: los de su caja y, si se sabe, de su país. */
export function deLaZona(caja: Caja, pais: string | null, aeropuertos: Aeropuerto[], cuantos: number): LugarDeVuelo[] {
  const suyos = aeropuertos.filter((a) => dentro(caja, a) && (pais === null || a.pais === pais));
  return [...sitiosConVuelos(suyos)]
    .map(([codigo, de]) => lugarDe(codigo, de, null, "in_area"))
    .sort((a, b) => b.rutas - a.rutas || a.codigo.localeCompare(b.codigo))
    .slice(0, Math.max(0, cuantos));
}

/** Un código que dijo el viajero: el aeropuerto o la ciudad que es en los datos, o tal cual si no está en ellos. */
function delCodigo(codigo: string, datos: LugaresDeVuelo | null): LugarDeVuelo {
  const aeropuerto = datos?.aeropuertos.find((a) => a.codigo === codigo);
  if (aeropuerto !== undefined) return lugarDe(codigo, [aeropuerto], null, "given");
  const deLaCiudad = datos?.aeropuertos.filter((a) => a.ciudad === codigo) ?? [];
  if (deLaCiudad.length > 0) return lugarDe(codigo, deLaCiudad, null, "given");
  return {
    codigo,
    nombre: codigo,
    pais: null,
    punto: null,
    aeropuertos: [codigo],
    rutas: 0,
    km: null,
    porQue: "given",
  };
}

/** Dónde está una ciudad por su nombre y su país, en los datos de la fuente. Si hay dudas o no está, no se sabe. */
export function ciudadPorNombre(nombre: string, pais: string, ciudades: Ciudad[]): Ciudad | null {
  const buscado = normalizado(nombre);
  if (buscado === "") return null;
  const iguales = ciudades.filter((c) => c.pais === pais && normalizado(c.nombre) === buscado);
  return iguales.length >= 1 ? iguales[0] : null;
}

const enPunto = (p: unknown): Punto | null => {
  const x = p as Partial<Punto> | null | undefined;
  return typeof x?.lat === "number" &&
    typeof x.lon === "number" &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lon) &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lon) <= 180
    ? { lat: x.lat, lon: x.lon }
    : null;
};

/** De qué sitios con vuelos se sale. Sin origen, ninguno; con un aeropuerto dicho, ese. */
export function lugaresDeSalida(
  viaje: Entendido,
  datos: LugaresDeVuelo | null,
): { lugares: LugarDeVuelo[]; aviso: string | null } {
  const o = viaje.origin;
  if (o === null) return { lugares: [], aviso: "transporte: no se busca, porque no se sabe de dónde se sale" };
  if (o.airport) return { lugares: [delCodigo(o.airport, datos)], aviso: null };
  if (datos === null) return { lugares: [], aviso: "transporte: la fuente no dice sus aeropuertos" };
  const desde =
    enPunto(o.centre) ??
    (() => {
      const c = ciudadPorNombre(o.name, o.country, datos.ciudades);
      return c === null ? null : { lat: c.lat, lon: c.lon };
    })();
  if (desde === null)
    return {
      lugares: [],
      aviso: `transporte: no se sabe dónde está «${o.name}», y sin eso no hay aeropuerto de salida`,
    };
  const lugares = alrededorDe(desde, datos.aeropuertos, LUGARES_DE_SALIDA);
  if (lugares.length === 0) return { lugares, aviso: "transporte: la fuente no tiene ningún aeropuerto con vuelos" };
  return { lugares, aviso: lejos(lugares[0], o.name) };
}

/**
 * A qué sitios con vuelos se llega. A una ciudad, por el más cercano y el más grande de alrededor; a una región o un
 * país, por los más grandes de dentro, y si no tiene ninguno, por los de alrededor de su centro.
 */
export function lugaresDeLlegada(
  viaje: Entendido,
  datos: LugaresDeVuelo | null,
): { lugares: LugarDeVuelo[]; aviso: string | null } {
  const d = viaje.destination;
  if (d.airport) return { lugares: [delCodigo(d.airport, datos)], aviso: null };
  if (datos === null) return { lugares: [], aviso: "transporte: la fuente no dice sus aeropuertos" };
  const cuantos = LUGARES_DE_LLEGADA[d.kind];
  if (d.kind !== "city") {
    const pais = /^[A-Z]{2}$/.test(d.country) ? d.country : null;
    const lugares = deLaZona(d.box, pais, datos.aeropuertos, cuantos);
    if (lugares.length > 0) return { lugares, aviso: null };
  }
  const lugares = alrededorDe(d.centre, datos.aeropuertos, cuantos);
  if (lugares.length === 0) return { lugares, aviso: "transporte: la fuente no tiene ningún aeropuerto con vuelos" };
  return { lugares, aviso: lejos(lugares[0], d.name) };
}

const lejos = (l: LugarDeVuelo, de: string): string | null =>
  l.porQue === "far"
    ? `transporte: el aeropuerto con vuelos más cercano a ${de} está a ${l.km} km (${l.nombre})`
    : null;

/** Los pares que se piden: primero los de los sitios que van delante, sin repetir ciudad, y no más del tope. */
export function paresDe(salida: LugarDeVuelo[], llegada: LugarDeVuelo[], tope: number = PARES): [string, string][] {
  const pares: { de: string; a: string; orden: number }[] = [];
  salida.forEach((s, i) =>
    llegada.forEach((l, j) => {
      if (s.codigo !== l.codigo && !s.aeropuertos.some((x) => l.aeropuertos.includes(x)))
        pares.push({ de: s.codigo, a: l.codigo, orden: i + j });
    }),
  );
  return pares
    .sort((x, y) => x.orden - y.orden)
    .slice(0, Math.max(0, tope))
    .map((p) => [p.de, p.a]);
}

export type AlBuscar = {
  /** El primer día en que se puede viajar: lo que sale antes no vale. */
  desde?: string;
};

/**
 * La parrilla de un viaje: los pares por las fechas del viaje y, si el viajero puede moverlas, por los días de
 * alrededor. Una petición por par para las fechas, y otra por par para los días de alrededor si la fuente sabe
 * darlos de una vez: con el tope de pares, doce como mucho. Lo que falla no para nada: se dice.
 */
export async function buscarTransporte(
  viaje: Entendido,
  fuente: FuenteTransporte,
  o: AlBuscar = {},
): Promise<Parrilla> {
  const ida = viaje.dates.check_in;
  const vuelta = viaje.dates.check_out;
  const avisos: string[] = [];
  let datos: LugaresDeVuelo | null = null;
  const hacenFalta = !viaje.origin?.airport || !viaje.destination.airport;
  if (viaje.origin !== null && hacenFalta) {
    try {
      datos = await fuente.lugares();
    } catch {
      // El mensaje de un fallo lleva un trozo de lo que contestó la fuente: no se guarda.
      datos = null;
    }
  }
  const salida = lugaresDeSalida(viaje, datos);
  const llegada = viaje.origin === null ? { lugares: [], aviso: null } : lugaresDeLlegada(viaje, datos);
  for (const a of [salida.aviso, llegada.aviso]) if (a !== null && !avisos.includes(a)) avisos.push(a);
  const flexible = viaje.dates.flexible && fuente.alrededor !== undefined;
  const parrilla: Parrilla = {
    fuente: fuente.nombre,
    salida: salida.lugares,
    llegada: llegada.lugares,
    pares: [],
    dias: flexible ? DIAS_ALREDEDOR : 0,
    ida,
    vuelta,
    opciones: [],
    peticiones: 0,
    fuera: { escalas: 0, moneda: 0, antes: 0 },
    avisos,
  };
  const pares = paresDe(salida.lugares, llegada.lugares);
  if (pares.length === 0) {
    if (salida.lugares.length > 0 && llegada.lugares.length > 0)
      avisos.push("transporte: se sale y se llega por el mismo aeropuerto, y no hay vuelo que buscar");
    return parrilla;
  }
  const moneda = viaje.currency.toUpperCase();
  const mercado = (viaje.origin?.country ?? "").toLowerCase();
  const todas: Vuelo[] = [];
  for (const [de, a] of pares) {
    const t: Trayecto = { origen: de, destino: a, ida, vuelta, moneda, mercado };
    const par: ParDeVuelo = { de, a, fechas: "not_asked", alrededor: "not_asked" };
    const pedir = async (como: (t: Trayecto) => Promise<Vuelo[]>): Promise<Contesta> => {
      parrilla.peticiones++;
      try {
        const vuelos = await como(t);
        todas.push(...vuelos);
        return vuelos.length > 0 ? "prices" : "none";
      } catch {
        return "failed";
      }
    };
    par.fechas = await pedir((x) => fuente.fechas(x));
    if (flexible) par.alrededor = await pedir((x) => fuente.alrededor!(x));
    parrilla.pares.push(par);
  }
  const vistas = new Set<string>();
  for (const v of todas) {
    const sale = dia(v.sale);
    const vuelve = dia(v.vuelve);
    const enLaVentana =
      Math.abs(diasEntre(ida, sale)) <= parrilla.dias &&
      Math.abs(diasEntre(vuelta, vuelve)) <= parrilla.dias &&
      diasEntre(sale, vuelve) > 0;
    if (!enLaVentana) continue;
    if ((v.escalasIda ?? 0) > ESCALAS_MAXIMAS || (v.escalasVuelta ?? 0) > ESCALAS_MAXIMAS) {
      parrilla.fuera.escalas++;
      continue;
    }
    if (v.moneda !== moneda) {
      parrilla.fuera.moneda++;
      continue;
    }
    if (o.desde !== undefined && sale < o.desde) {
      parrilla.fuera.antes++;
      continue;
    }
    // La misma opción dicha dos veces (en las fechas y en la semana) se queda una vez.
    const huella = [v.origen, v.destino, v.sale, v.vuelve, v.aerolinea, v.numero, v.precio].join("|");
    if (vistas.has(huella)) continue;
    vistas.add(huella);
    parrilla.opciones.push(v);
  }
  parrilla.opciones.sort((x, y) => paraElGrupo(x, 1) - paraElGrupo(y, 1) || x.sale.localeCompare(y.sale));
  const callada = (c: Contesta): boolean => c === "failed" || c === "not_asked";
  if (parrilla.pares.every((p) => p.fechas === "failed" && callada(p.alrededor)))
    avisos.push("sin transporte: la fuente no contesta");
  else {
    const fallan = parrilla.pares.filter((p) => p.fechas === "failed" || p.alrededor === "failed");
    for (const p of fallan) avisos.push(`transporte: la fuente no contesta de ${p.de} a ${p.a}`);
    if (deLasFechas(parrilla, ida, vuelta).length === 0)
      avisos.push("transporte: no hay ningún precio guardado para esas fechas");
  }
  return parrilla;
}

/** Las opciones de la parrilla para unas fechas exactas, la más barata primero. */
export function deLasFechas(p: Pick<Parrilla, "opciones">, ida: string, vuelta: string): Vuelo[] {
  return p.opciones.filter((v) => dia(v.sale) === ida && dia(v.vuelve) === vuelta);
}

/**
 * El transporte del viaje: el más barato por viajero de los que se saben para sus fechas y en su moneda, o ninguno.
 * Es el criterio de partida: las cribas del vuelo, cuando lleguen, podrán preferir otro.
 */
export function elTransporte(vuelos: Vuelo[], moneda: string, ida?: string, vuelta?: string): Vuelo | null {
  const suyos = vuelos.filter(
    (v) =>
      v.moneda === moneda &&
      (ida === undefined || dia(v.sale) === ida) &&
      (vuelta === undefined || dia(v.vuelve) === vuelta),
  );
  return [...suyos].sort((a, b) => paraElGrupo(a, 1) - paraElGrupo(b, 1))[0] ?? null;
}

/**
 * Los vuelos de unas fechas cambiadas, para las palancas: de los mismos aeropuertos que el transporte del viaje,
 * pedidos a la fuente para esas fechas, con lo que ya tenga la parrilla de esos días. Un vuelo de otros aeropuertos
 * es otra palanca, y no entra aquí.
 */
export function vuelosMovidos(
  viaje: Entendido,
  fuente: FuenteTransporte,
  elegido: Vuelo,
  parrilla: Parrilla | null,
): (ida: string, vuelta: string) => Promise<Vuelo[]> {
  return async (ida, vuelta) => {
    const mismos = (v: Vuelo): boolean => v.origen === elegido.origen && v.destino === elegido.destino;
    const yaVistos = parrilla === null ? [] : deLasFechas(parrilla, ida, vuelta).filter(mismos);
    const t: Trayecto = {
      origen: elegido.origen,
      destino: elegido.destino,
      ida,
      vuelta,
      moneda: viaje.currency.toUpperCase(),
      mercado: (viaje.origin?.country ?? "").toLowerCase(),
    };
    const pedidos = (await fuente.fechas(t)).filter(
      (v) =>
        dia(v.sale) === ida &&
        dia(v.vuelve) === vuelta &&
        (v.escalasIda ?? 0) <= ESCALAS_MAXIMAS &&
        (v.escalasVuelta ?? 0) <= ESCALAS_MAXIMAS,
    );
    return [...yaVistos, ...pedidos];
  };
}
