// Lo que lleva una investigación de punta a punta, paso a paso y desde el disco: los sitios, la ruta, la búsqueda,
// mirar los finalistas y elegir los sitios, los días, la tabla con sus palancas, las tres maneras, la explicación y el
// viaje para la web. Cada paso de código corre solo; cuando toca un asiento, le monta su puesto, deja su orden y
// para. Quien lance los asientos vuelve a llamar, y sigue por donde iba. Este archivo no llama a ninguna IA.
//
//   node agent/launcher/investigar.ts empezar <entendido.json>
//   node agent/launcher/investigar.ts sigue <carpeta del run>
//
// Detrás de un proxy, con NODE_USE_ENV_PROXY=1 delante. Es la versión de mano de lo que lanza los pasos: la casa de
// verdad, que los lanza sola y lo cuenta en vivo, llega con su tanda.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CANDIDATOS_QUE_BASTAN,
  ESCALERA_DE_MINIMOS,
  ESCALERA_DE_RADIO,
  MUCHOS_SIN_PRECIO,
  FINALISTAS,
  RADIO_MAXIMO,
} from "../data/cribas.ts";
import { DEMASIADO_LEJOS } from "../data/dias.ts";
import { PARADO } from "../data/pasos.ts";
import { COSAS } from "../data/gustos.ts";
import { INSTALACIONES } from "../data/niveles.ts";
import { DIAS_QUE_SE_MUEVEN, NOCHES_QUE_SE_MUEVEN, PALANCAS, RONDAS } from "../data/palancas.ts";
import { puertaBusqueda, type Rojo } from "../gates/puerta_busqueda.ts";
import { puertaCruce } from "../gates/puerta_cruce.ts";
import { puertaDias, puertaSitios } from "../gates/puerta_dias.ts";
import { puertaExplica } from "../gates/puerta_explica.ts";
import { puertaRuta } from "../gates/puerta_ruta.ts";
import { comprobarSucesos, comprobarViaje, type Foto, type Parada } from "../output/viaje.ts";
import { anadirOfertas, buscarDondeHaya, type Busqueda } from "../scripts/busqueda_alojamiento.ts";
import { cuantosSitios, paradasDe, sitiosParaElegir } from "../scripts/dias.ts";
import { paraExplicar } from "../scripts/explica.ts";
import type {
  Entendido,
  EntregaDeCruce,
  EntregaDeExplicar,
  EntregaDeMirar,
  EntregaDeRuta,
  EntregaDeSitios,
  Tabla,
  ZonaResuelta,
} from "../scripts/formas.ts";
import { avisosDeSiempre, montarViajeHecho, sucesosDe } from "../scripts/monta_viaje.ts";
import { fechasDe, repartir } from "../scripts/ritmo.ts";
import { diasDe, lugaresParaLaRuta, resolverZonas } from "../scripts/ruta.ts";
import { montarTabla } from "../scripts/tabla.ts";
import { buscarTransporte, deLasFechas, elTransporte, vuelosMovidos, type Parrilla } from "../scripts/transporte.ts";
import type { Opciones as OpcionesDeFotos } from "../tools/fotos.ts";
import type {
  DiaBarato,
  Estancia,
  FuenteAlojamiento,
  FuenteTransporte,
  OfertaDeZona,
  Vuelo,
} from "../tools/fuentes/tipos.ts";
import { cambiosDePartida, pedirPalancas, type Cambio, type PrecioMovido } from "../tools/palancas.ts";
import type { Sitio } from "../tools/sitios.ts";
import { ordenDeApertura, recogerAsiento } from "./asiento.ts";
import { abrirViaje, dentroDelRepositorio, guardarJson, guardarVersion, nuevoRun, pasar, viajeDelRun } from "./mesa.ts";
import { puertaEntendido } from "../gates/puerta_entendido.ts";
import { prepararMirar, recogerMirar, type Recogido } from "./mirar.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";
import { acaboSinEntregar } from "./trabajos.ts";
import { contar } from "./vivo.ts";

/** Lo de fuera que usa una investigación. Se le pasa: con lo de verdad investiga, y con lo inventado se prueba. */
export type Fuentes = {
  alojamiento: FuenteAlojamiento;
  sitios: (viaje: Entendido) => Promise<Sitio[]>;
  resumenes: (sitios: Sitio[]) => Promise<Map<string, string>>;
  fotos: (archivos: string[]) => Promise<Map<string, Foto>>;
  /** La fuente de transporte: sus aeropuertos y sus precios. Sin ella, el viaje va sin transporte, y se dice. */
  transporte?: FuenteTransporte;
  /** El precio más barato de cada día de salida de un mes (AAAA-MM), para el primer vistazo. */
  diasBaratos?: (viaje: Entendido, mes: string, noches: number) => Promise<DiaBarato[]>;
  /** Lo que piden otros vendedores en una zona dicha con palabras. */
  ofertas?: (lugar: string, e: Estancia) => Promise<OfertaDeZona[]>;
  bajarFotos?: OpcionesDeFotos;
  /** El primer día en que se puede viajar: un cambio de fechas que cae antes no se pide. */
  desde?: string;
};

/** Cuántas veces vuelve un trabajo en rojo a su asiento antes de pararse: dos, como dice la hoja. */
export const VUELTAS = 2;

/** Dónde se paró un run: el paso, por su nombre en `agent/data/pasos.ts`, dicho para quien lo lleva, y por qué. */
type Parado = { en?: string; paso: string; rojos: Rojo[] };
export { PARADO };

export type Estado = {
  /** Los puestos que esperan a su asiento. Vacío si no se espera a nadie. */
  esperan: string[];
  hecho: boolean;
  /** Si una puerta paró la investigación y ya no quedan vueltas, cuál y por qué. */
  parado: Parado | null;
  avisos: string[];
};

type Guardado<T> = { entrega: T; rojos: Rojo[] };

const ruta = (run: string, nombre: string): string => join(run, nombre);
const hay = (run: string, nombre: string): boolean => existsSync(ruta(run, nombre));
const leer = <T>(run: string, nombre: string): T => JSON.parse(readFileSync(ruta(run, nombre), "utf8")) as T;
/** Guarda algo del run y cuenta lo que con ello haya pasado: lo que se ve en vivo sale de lo que hay en el disco. */
function guardar(run: string, nombre: string, dato: unknown): void {
  guardarJson(ruta(run, nombre), dato);
  contar(run);
}
const json = (dato: unknown): string => JSON.stringify(dato, null, 2);

/**
 * La estancia que se busca, sacada de lo que he entendido. La moneda y el pasaporte son del viajero: si faltan, no
 * se supone ninguno, porque de ellos depende el precio que da la fuente.
 */
export function estanciaDe(viaje: Entendido): Estancia {
  const pasaporte = viaje.travellers.passports[0] ?? viaje.origin?.country;
  if (pasaporte === undefined || !/^[A-Za-z]{2}$/.test(pasaporte))
    throw new Error("no se sabe con qué pasaporte viaja el viajero ni de qué país sale: sin eso no hay precio");
  if (!/^[A-Za-z]{3}$/.test(viaje.currency ?? ""))
    throw new Error("no se sabe en qué moneda ve los precios el viajero");
  return {
    lat: viaje.destination.centre.lat,
    lon: viaje.destination.centre.lon,
    radio: 1500,
    entrada: viaje.dates.check_in,
    salida: viaje.dates.check_out,
    adultos: viaje.travellers.adults,
    ninos: viaje.travellers.children,
    habitaciones: viaje.travellers.rooms,
    moneda: viaje.currency.toUpperCase(),
    nacionalidad: pasaporte.toUpperCase(),
    pais: viaje.destination.country.toUpperCase(),
  };
}

// Los asientos de uno en uno: su puesto lleva el número de su vuelta, y un rojo lo devuelve con lo que estaba mal.

function puestoDe(run: string, base: string): Puesto | null {
  const suyos = puestosDe(run).filter((p) => new RegExp(`^${base}-v\\d+$`).test(p.id));
  return suyos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).pop() ?? null;
}

function montar(run: string, base: string, asiento: string, piezas: Pieza[], vuelta = 1): Puesto {
  const puesto = montarPuesto(run, `${base}-v${vuelta}`, asiento, piezas);
  mkdirSync(join(run, "ordenes"), { recursive: true });
  writeFileSync(join(run, "ordenes", `${puesto.id}.txt`), ordenDeApertura());
  return puesto;
}

const entregado = (p: Puesto): boolean => existsSync(join(p.carpeta, "out", "delivery.json"));

type DelAsiento<T> = { espera: string } | { parado: Rojo[] } | { entrega: T };

/** Una entrega con una forma que la puerta no esperaba es un rojo, con su vuelta: nunca rompe la casa. */
function sinRomperse(puerta: (e: unknown) => Rojo[], entrega: unknown): Rojo[] {
  try {
    return puerta(entrega);
  } catch {
    return [{ donde: "delivery", que: "la entrega no tiene la forma de su contrato: la puerta no la pudo leer" }];
  }
}

/**
 * Recoge a un asiento: si no ha entregado, se le espera; si su entrega pasa la puerta de todos y la suya, se da por
 * buena; si no, vuelve a su asiento con lo que estaba mal, dos veces como mucho.
 */
function recoger<T>(
  run: string,
  base: string,
  asiento: string,
  piezas: Pieza[],
  puerta: (e: unknown) => Rojo[],
): DelAsiento<T> {
  const puesto = puestoDe(run, base);
  if (puesto === null) return { espera: montar(run, base, asiento, piezas).id };
  if (!entregado(puesto)) {
    // Si la casa se cortó entre sellar el puesto y dejar su orden, la orden se deja ahora.
    const orden = join(run, "ordenes", `${puesto.id}.txt`);
    if (!existsSync(orden)) {
      mkdirSync(join(run, "ordenes"), { recursive: true });
      writeFileSync(orden, ordenDeApertura());
    }
    return { espera: puesto.id };
  }
  const metodo = recogerAsiento(puesto);
  const rojos = [...metodo.rojos, ...(metodo.entrega === null ? [] : sinRomperse(puerta, metodo.entrega))];
  guardar(run, `${puesto.id}.puertas.json`, { verde: rojos.length === 0, rojos });
  if (rojos.length === 0) return { entrega: metodo.entrega as T };
  const vuelta = Number(/-v(\d+)$/.exec(puesto.id)?.[1] ?? 1);
  if (vuelta > VUELTAS) return { parado: rojos };
  const devuelto: Pieza = {
    ruta: "returned.json",
    contenido: json({ what_was_wrong: rojos, delivery: metodo.entrega }),
  };
  return { espera: montar(run, base, asiento, [...piezas, devuelto], vuelta + 1).id };
}

/** Las noches del viaje. */
const nochesDe = (viaje: Entendido): number => diasDe(viaje.dates.check_in, viaje.dates.check_out).nights;

// Cada paso, por su orden.

type DeLosSitios = { sitios: Sitio[]; resumenes: Record<string, string> };

async function traerSitios(run: string, viaje: Entendido, f: Fuentes): Promise<void> {
  const sitios = await f.sitios(viaje);
  let resumenes = new Map<string, string>();
  const avisos: string[] = [];
  try {
    resumenes = await f.resumenes(sitios.slice(0, cuantosSitios(nochesDe(viaje))));
  } catch (error) {
    avisos.push(`sin lo que dicen los artículos: ${error instanceof Error ? error.message : String(error)}`);
  }
  guardar(run, "sitios.json", { sitios, resumenes: Object.fromEntries(resumenes), avisos });
}

function piezasDeLaRuta(run: string, viaje: Entendido): Pieza[] {
  const { sitios } = leer<DeLosSitios>(run, "sitios.json");
  return [
    { ruta: "trip.json", contenido: json(viaje) },
    { ruta: "days.json", contenido: json(diasDe(viaje.dates.check_in, viaje.dates.check_out)) },
    { ruta: "places.json", contenido: json(lugaresParaLaRuta(sitios)) },
    { ruta: "warnings.json", contenido: "[]" },
    { ruta: "transfers.json", contenido: "[]" },
  ];
}

type DeLaRuta = { entrega: EntregaDeRuta; zonas: ZonaResuelta[] };

async function buscar(run: string, viaje: Entendido, f: Fuentes): Promise<Rojo[]> {
  const { zonas } = leer<DeLaRuta>(run, "ruta.json");
  const e = estanciaDe(viaje);
  const dondeBuscar = zonas.map((z) => ({
    id: z.id,
    nombre: z.label,
    lat: z.centre.lat,
    lon: z.centre.lon,
    radio: z.radius_m,
  }));
  // Lo que el viajero marcó como imprescindible y la fuente puede declarar: el gimnasio, la piscina.
  const imprescindibles = viaje.tastes
    .filter((g) => g.weight === "must" && COSAS[g.thing] !== undefined && COSAS[g.thing].campo in INSTALACIONES)
    .map((g) => COSAS[g.thing].campo);
  const comoBuscar = {
    minimos: ESCALERA_DE_MINIMOS,
    bastan: CANDIDATOS_QUE_BASTAN,
    radios: ESCALERA_DE_RADIO,
    radioMaximo: RADIO_MAXIMO,
    muchosSinPrecio: MUCHOS_SIN_PRECIO,
  };
  const busqueda = await buscarDondeHaya(f.alojamiento, e, dondeBuscar, comoBuscar, {
    finalistas: FINALISTAS,
    imprescindibles,
  });
  const avisos: string[] = [];
  if (f.ofertas !== undefined) {
    for (const z of zonas) {
      // A la otra fuente se le dice la zona con nombres de los datos, no con palabras de un asiento.
      const lugar = `${z.label.split(", ")[0]}, ${viaje.destination.name}`;
      try {
        const casados = anadirOfertas(busqueda, await f.ofertas(lugar, e), lugar);
        avisos.push(`otras ofertas en ${z.label}: casan ${casados}`);
      } catch (error) {
        // El mensaje de un fallo trae un trozo de lo que contestó la fuente: no se guarda con los avisos.
        void error;
        avisos.push(`sin otras ofertas en ${z.label}: la fuente no contesta`);
      }
    }
  }
  // La parrilla de aeropuertos y de días (4.4). Lo que va en `vuelos` es lo de las fechas del viaje: con eso se elige
  // su transporte; lo de los días de alrededor queda en la parrilla, para las palancas y para después.
  let vuelos: Vuelo[] = [];
  let transporte: Parrilla | null = null;
  if (f.transporte !== undefined) {
    try {
      transporte = await buscarTransporte(viaje, f.transporte, { desde: f.desde });
      vuelos = deLasFechas(transporte, e.entrada, e.salida);
      avisos.push(...transporte.avisos);
    } catch (error) {
      void error;
      avisos.push("sin transporte: la fuente no contesta");
    }
  } else avisos.push("transporte: no se busca, porque no hay fuente de transporte");
  const puerta = puertaBusqueda(busqueda, FINALISTAS);
  guardar(run, "busqueda.json", { busqueda, vuelos, transporte, puerta, avisos });
  return puerta.rojos;
}

/** Por qué una búsqueda no deja a nadie: no hay nada, nada pasa los mínimos o nada tiene precio para ese grupo. */
function sinAlojamiento(b: Busqueda): string {
  if (b.devueltos === 0) return "la fuente no tiene ningún alojamiento en las zonas de la ruta";
  if (b.dentro.length === 0)
    return `de ${b.devueltos} alojamientos, ninguno llega a los mínimos, ni bajándolos hasta el último escalón`;
  return (
    `de ${b.dentro.length} alojamientos que pasan los mínimos, ninguno tiene precio para esas noches y ese grupo ` +
    `en ${b.estancia.habitaciones} ${b.estancia.habitaciones === 1 ? "habitación" : "habitaciones"}: puede ser por ` +
    "las fechas, o porque el grupo no cabe así"
  );
}

type DeLaBusqueda = { vuelos: Vuelo[]; transporte?: Parrilla | null; busqueda: Busqueda };

/**
 * El transporte del viaje: el más barato por viajero que se sabe para sus fechas y en su moneda, o ninguno. Un
 * precio en otra moneda no se puede sumar al del alojamiento, ni uno de otros días a sus noches: no cuentan.
 */
function transporteDe(run: string): Vuelo | null {
  const { vuelos, busqueda } = leer<DeLaBusqueda>(run, "busqueda.json");
  const e = busqueda.estancia;
  return elTransporte(vuelos, e.moneda, e.entrada, e.salida);
}

function piezasDeLosSitios(run: string, viaje: Entendido): Pieza[] {
  const { sitios, resumenes } = leer<DeLosSitios>(run, "sitios.json");
  const { entrega, zonas } = leer<DeLaRuta>(run, "ruta.json");
  const route = {
    shape: entrega.shape,
    bases: entrega.bases.map((b) => ({ id: b.id, name: b.name, nights: b.nights })),
    zones: zonas,
  };
  return [
    { ruta: "trip.json", contenido: json(viaje) },
    { ruta: "route.json", contenido: json(route) },
    { ruta: "days.json", contenido: json(diasDe(viaje.dates.check_in, viaje.dates.check_out)) },
    {
      ruta: "sights.json",
      contenido: json(sitiosParaElegir(sitios, nochesDe(viaje), new Map(Object.entries(resumenes)))),
    },
    { ruta: "warnings.json", contenido: "[]" },
  ];
}

/**
 * Lo que entregó el que mira de cada finalista: su primera pasada que pasó las dos puertas, o nada. Se lee lo que se
 * recogió en su momento, con su veredicto: un run que se retoma no vuelve a juzgar lo que ya juzgó, ni con una puerta
 * que haya cambiado después ni con un puesto que alguien haya tocado.
 */
function miradosDe(run: string): Record<string, EntregaDeMirar | null> {
  const mirados: Record<string, EntregaDeMirar | null> = {};
  if (!hay(run, "como_es.json")) return mirados;
  for (const a of leer<Recogido>(run, "como_es.json").alojamientos) {
    const buena = a.pasadas.find((p) => p.entrega !== null && p.metodo.verde && p.comoEs.verde);
    mirados[a.alojamiento] = (buena?.entrega as EntregaDeMirar | undefined) ?? null;
  }
  return mirados;
}

type DeLosDias = { entrega: EntregaDeSitios; paradas: Parada[] };

async function repartirLosDias(run: string, viaje: Entendido, entrega: EntregaDeSitios, f: Fuentes): Promise<Rojo[]> {
  const { sitios } = leer<DeLosSitios>(run, "sitios.json");
  const elegidos = new Set(entrega.go.map((x) => x.id));
  const archivos = sitios.flatMap((s) => (elegidos.has(s.id) && s.archivo !== null ? [s.archivo] : []));
  let fotos = new Map<string, Foto>();
  const avisos: string[] = [];
  try {
    fotos = await f.fotos(archivos);
  } catch (error) {
    avisos.push(`sin fotos de los sitios: ${error instanceof Error ? error.message : String(error)}`);
  }
  const paradas = paradasDe(entrega, sitios, fotos);
  const fechas = fechasDe(viaje.dates.check_in, viaje.dates.check_out);
  const reparto = repartir(paradas, fechas, viaje.pace, viaje.destination.centre);
  const dados = sitiosParaElegir(sitios, nochesDe(viaje)).map((s) => s.id);
  const puerta = puertaDias({
    paradas,
    dias: reparto.dias,
    fuera: reparto.fuera,
    porQue: reparto.porQue,
    sitios: dados,
  });
  guardar(run, "dias.json", { entrega, paradas, reparto, puerta, avisos });
  return puerta.rojos;
}

type DelCruce = Guardado<EntregaDeCruce>;

/** Lo que el que cruza sabe de cada alojamiento de la tabla: sus niveles, lo mejor, lo peor y sus avisos. */
function alojamientosParaCruzar(b: Busqueda, mirados: Record<string, EntregaDeMirar | null>): unknown[] {
  return b.finalistas.map((f) => {
    const m = mirados[f.alojamiento.id] ?? null;
    return {
      id: f.alojamiento.id,
      label: f.alojamiento.nombre,
      looked_at: m !== null,
      levels: Object.fromEntries(Object.entries(m?.fields ?? {}).map(([campo, n]) => [campo, n.level])),
      good: m?.summary_good ?? "unknown",
      bad: m?.summary_bad ?? "unknown",
      warnings: (m?.warnings ?? []).map((a) => a.what),
      conflicts: (m?.conflicts ?? []).map((c) => c.what),
    };
  });
}

async function montarLaTabla(run: string, viaje: Entendido, f: Fuentes, ronda: number): Promise<Tabla> {
  const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
  const { zonas } = leer<DeLaRuta>(run, "ruta.json");
  const { paradas } = leer<DeLosDias>(run, "dias.json");
  const transporte = transporteDe(run);
  const e = estanciaDe(viaje);
  const parrilla = leer<DeLaBusqueda>(run, "busqueda.json").transporte ?? null;
  const vuelos =
    transporte === null || f.transporte === undefined
      ? undefined
      : vuelosMovidos(viaje, f.transporte, transporte, parrilla);
  const ids = busqueda.finalistas.map((x) => x.alojamiento.id);
  if (!hay(run, "movidos.json")) {
    const cambios = cambiosDePartida(DIAS_QUE_SE_MUEVEN, NOCHES_QUE_SE_MUEVEN);
    guardar(run, "movidos.json", await pedirPalancas(f.alojamiento, e, ids, cambios, { vuelos, desde: f.desde }));
  }
  // Lo que pidió el que cruza en la ronda anterior, contestado.
  const pedidos: PrecioMovido[] = [];
  if (ronda > 1) {
    const anterior = leer<DelCruce>(run, `cruce-${ronda - 1}.json`).entrega;
    const tablaAnterior = leer<Tabla>(run, `tabla-${ronda - 1}.json`);
    for (const p of anterior.requests) {
      const fila = tablaAnterior.rows.find((r) => r.id === p.row);
      if (fila === undefined) continue;
      const cambio: Cambio =
        p.lever === "nights"
          ? { palanca: "nights", entrada: 0, salida: p.nights ?? 0 }
          : { palanca: "shift_dates", entrada: p.days ?? 0, salida: p.days ?? 0 };
      pedidos.push(...(await pedirPalancas(f.alojamiento, e, [fila.lodging], [cambio], { vuelos, desde: f.desde })));
    }
  }
  const notas = PALANCAS.filter((p) => !p.laPideElCodigo).map((p) => `${p.id}: not priced, it waits for ${p.espera}`);
  if (transporte === null) notas.push("transport: no price for these dates, so every total is lodging only");
  const tabla = montarTabla({
    viaje,
    busqueda,
    zonas,
    mirados: miradosDe(run),
    paradas: paradas.map((p) => p.punto),
    transporte,
    movidos: leer<PrecioMovido[]>(run, "movidos.json"),
    pedidos,
    ronda,
    notas,
  });
  guardar(run, `tabla-${ronda}.json`, tabla);
  return tabla;
}

function piezasDelCruce(run: string, viaje: Entendido, ronda: number): Pieza[] {
  const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
  const { zonas } = leer<DeLaRuta>(run, "ruta.json");
  const palancas = PALANCAS.map((p) => ({
    id: p.id,
    what: p.what,
    priced_by_house: p.laPideElCodigo,
    waits_for: p.espera ?? "nothing",
  }));
  const piezas: Pieza[] = [
    { ruta: "trip.json", contenido: json(viaje) },
    { ruta: "table.json", contenido: json(leer<Tabla>(run, `tabla-${ronda}.json`)) },
    { ruta: "levers.json", contenido: json(palancas) },
    { ruta: "lodgings.json", contenido: json(alojamientosParaCruzar(busqueda, miradosDe(run))) },
    { ruta: "route.json", contenido: json(zonas) },
    { ruta: "days.json", contenido: json(diasDe(viaje.dates.check_in, viaje.dates.check_out)) },
  ];
  if (ronda > 1)
    piezas.push({ ruta: "previous.json", contenido: json(leer<DelCruce>(run, `cruce-${ronda - 1}.json`).entrega) });
  return piezas;
}

/** La última ronda del cruce que se cerró: su tabla y lo que entregó el asiento. */
function cruceCerrado(run: string): { tabla: Tabla; cruce: EntregaDeCruce } {
  for (let ronda = RONDAS; ronda >= 1; ronda--)
    if (hay(run, `cruce-${ronda}.json`))
      return {
        tabla: leer<Tabla>(run, `tabla-${ronda}.json`),
        cruce: leer<DelCruce>(run, `cruce-${ronda}.json`).entrega,
      };
  throw new Error("el cruce no se ha cerrado");
}

function loQueSeExplica(run: string, viaje: Entendido): ReturnType<typeof paraExplicar> {
  const { tabla, cruce } = cruceCerrado(run);
  const { zonas } = leer<DeLaRuta>(run, "ruta.json");
  const fechas = { entrada: viaje.dates.check_in, salida: viaje.dates.check_out };
  return paraExplicar(tabla, cruce, miradosDe(run), zonas, fechas);
}

function montarElViaje(run: string, viaje: Entendido, explica: EntregaDeExplicar): Rojo[] {
  const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
  const { zonas } = leer<DeLaRuta>(run, "ruta.json");
  const { paradas } = leer<DeLosDias>(run, "dias.json");
  const { tabla, cruce } = cruceCerrado(run);
  const hecho = montarViajeHecho({
    id: `viaje-${viaje.destination.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${viaje.dates.check_in}`,
    viaje,
    busqueda,
    zonas,
    mirados: miradosDe(run),
    paradas,
    tabla,
    cruce,
    explica,
    transporte: transporteDe(run),
  });
  const sucesos = sucesosDe(busqueda, hecho);
  // Los días que se entregan salen del alojamiento donde se duerme, no del centro del destino: pasan la puerta 9
  // otra vez, porque los que la pasaron al repartir no son estos.
  const dados = sitiosParaElegir(leer<DeLosSitios>(run, "sitios.json").sitios, nochesDe(viaje)).map((s) => s.id);
  const deLosDias = puertaDias({
    paradas: hecho.paradas,
    dias: hecho.dias,
    fuera: hecho.fuera,
    porQue: hecho.porQueFuera,
    sitios: dados,
  }).rojos;
  // La nota y el descarte de cada alojamiento son los de la tabla con la que cerró el que cruza: si no casan, lo
  // que se enseña no es lo que se decidió.
  const deLaTabla: Rojo[] = [];
  for (const fila of tabla.rows) {
    const a = hecho.alojamientos.find((x) => x.id === fila.lodging);
    if (a === undefined) continue;
    const nota = typeof fila.score === "number" ? fila.score : null;
    if ((a.puntos ?? null) !== nota || (a.descartado != null) !== (fila.discarded !== ""))
      deLaTabla.push({ donde: `alojamientos.${a.id}`, que: "su nota o su descarte no son los de la tabla del cruce" });
  }
  const pegas = [...comprobarViaje(hecho), ...comprobarSucesos(sucesos), ...deLosDias, ...deLaTabla];
  if (pegas.length > 0) return pegas;
  guardar(run, "viaje.json", hecho);
  guardar(run, "sucesos.json", sucesos);
  return [];
}

/** Deja un run parado, en un paso y con su porqué, y lo cuenta. Sigue parado hasta que se quite `parado.json`. */
export function pararRun(run: string, en: string, paso: string, rojos: Rojo[]): Parado {
  guardar(run, PARADO, { en, paso, rojos });
  return { en, paso, rojos };
}

/**
 * Da los pasos de código que se puedan dar, hasta que toque esperar a un asiento, pare una puerta o esté hecho. Al
 * volver, lo que haya pasado queda contado, pase lo que pase: también si un paso se rompe a medias.
 */
export async function sigue(run: string, f: Fuentes): Promise<Estado> {
  if (dentroDelRepositorio(run)) throw new Error("un run no puede estar dentro del repositorio");
  try {
    return await darLosPasos(run, f);
  } finally {
    if (existsSync(run)) contar(run);
  }
}

async function darLosPasos(run: string, f: Fuentes): Promise<Estado> {
  const avisos: string[] = [];
  // Un run parado sigue parado: quien lo retome lee por qué, y no pasa por encima de una puerta en rojo. Reabrirlo
  // es una decisión de quien lo lleva, que quita `parado.json` cuando ha arreglado la causa.
  if (hay(run, PARADO)) return { esperan: [], hecho: false, parado: leer<Parado>(run, PARADO), avisos };
  const viaje = leer<Entendido>(run, "entendido.json");
  const espera = (...puestos: string[]): Estado => ({ esperan: puestos, hecho: false, parado: null, avisos });
  const para = (en: string, paso: string, rojos: Rojo[]): Estado => {
    return { esperan: [], hecho: false, parado: pararRun(run, en, paso, rojos), avisos };
  };
  // Lo entendido se mira antes de gastar nada: un dato mal escrito no llega ni a una fuente ni a un asiento.
  const claro = puertaEntendido(viaje);
  if (!claro.verde) return para("understood", "lo entendido (puerta 1)", claro.rojos);

  // 1. Los sitios, de datos abiertos. 2. La ruta y su puerta.
  if (!hay(run, "sitios.json")) await traerSitios(run, viaje, f);
  if (!hay(run, "ruta.json")) {
    const { sitios } = leer<DeLosSitios>(run, "sitios.json");
    const lugares = lugaresParaLaRuta(sitios);
    // Sin sitios en los datos no hay con qué anclar una zona: la ruta no podría pasar su puerta, la escriba quien
    // la escriba. Se para aquí, antes de gastar un asiento.
    if (lugares.length === 0)
      return para("sights", "los sitios que ver", [
        {
          donde: "sitios",
          que: "los datos abiertos no traen ningún sitio de este destino: no hay con qué hacer la ruta",
        },
      ]);
    const noches = diasDe(viaje.dates.check_in, viaje.dates.check_out).nights;
    const r = recoger<EntregaDeRuta>(
      run,
      "ruta",
      "route-planner",
      piezasDeLaRuta(run, viaje),
      (e) => puertaRuta(e, { viaje, noches, lugares, traslados: [] }).rojos,
    );
    if ("espera" in r) return espera(r.espera);
    if ("parado" in r) return para("route", "la ruta (puerta 3)", r.parado);
    guardar(run, "ruta.json", { entrega: r.entrega, zonas: resolverZonas(r.entrega, lugares) });
  }

  // Un viaje de varias bases todavía no se puede planear: la casa no sabe lo que dura ir de una a otra ni buscar
  // en más de una. Se para aquí y se dice, con un solo asiento gastado: no se devuelve la ruta para que la meta
  // en una base, que sería otro viaje.
  const deLaRuta = leer<DeLaRuta>(run, "ruta.json").entrega;
  if (deLaRuta.bases.length > 1)
    return para("route", "la ruta", [
      {
        donde: "bases",
        que:
          `este viaje pide ${deLaRuta.bases.length} bases, y El Dorado todavía no sabe medir los traslados entre ` +
          "bases ni buscar alojamiento en más de una: aún no puede planearlo",
      },
    ]);

  // 3. La búsqueda de alojamiento en las zonas de la ruta, y su puerta.
  if (!hay(run, "busqueda.json")) {
    const rojos = await buscar(run, viaje, f);
    if (rojos.length > 0) return para("search", "la búsqueda (puerta 4)", rojos);
  }
  // Sin ningún alojamiento con precio no hay viaje que cruzar: se para aquí y se dice por qué, antes de gastar más.
  const encontrado = leer<{ busqueda: Busqueda }>(run, "busqueda.json").busqueda;
  if (encontrado.finalistas.length === 0)
    return para("search", "la búsqueda de alojamiento", [{ donde: "alojamiento", que: sinAlojamiento(encontrado) }]);

  // 4. A la vez: mirar cada finalista y elegir los sitios. Después, los días y su puerta.
  if (!hay(run, "dias.json")) {
    const { busqueda } = leer<{ busqueda: Busqueda }>(run, "busqueda.json");
    const pendientes: string[] = [];
    if (!hay(run, "mirar.json")) {
      const p = await prepararMirar(busqueda, run, { pasadas: 1, fotos: f.bajarFotos });
      avisos.push(...p.avisos);
      pendientes.push(...p.puestos.map((x) => x.id));
    } else {
      const { quienes } = leer<{ quienes: { puesto: string }[] }>(run, "mirar.json");
      const deMirar = puestosDe(run).filter((p) => quienes.some((q) => q.puesto === p.id));
      // A quien ya trabajó y no entregó no se le espera más: su alojamiento se queda sin mirar, y se dice.
      pendientes.push(...deMirar.filter((p) => !entregado(p) && !acaboSinEntregar(run, p.id)).map((p) => p.id));
    }
    const { sitios, resumenes } = leer<DeLosSitios>(run, "sitios.json");
    const dados = sitiosParaElegir(sitios, nochesDe(viaje), new Map(Object.entries(resumenes)));
    const dicho = Object.fromEntries(dados.map((s) => [s.id, `${s.name} ${s.about}`]));
    const noches = diasDe(viaje.dates.check_in, viaje.dates.check_out).nights;
    const r = recoger<EntregaDeSitios>(
      run,
      "sitios",
      "sights-picker",
      piezasDeLosSitios(run, viaje),
      (e) => puertaSitios(e, { sitios: dados.map((s) => s.id), noches, dicho }).rojos,
    );
    if ("parado" in r) return para("pick", "los sitios (puerta 9)", r.parado);
    if ("espera" in r) pendientes.push(r.espera);
    if (pendientes.length > 0 || !("entrega" in r)) return espera(...pendientes);
    // Lo que no pasó sus puertas al mirar no para el viaje: ese alojamiento queda sin mirar, y se dice.
    const mirado = recogerMirar(run);
    for (const a of mirado.alojamientos)
      if (!a.pasadas.some((p) => p.metodo.verde && p.comoEs.verde)) avisos.push(`${a.nombre}: se queda sin mirar`);
    const rojos = await repartirLosDias(run, viaje, r.entrega, f);
    if (rojos.length > 0) return para("days", "los días (puerta 9)", rojos);
  }
  // Si la mayor parte de lo elegido se queda fuera por lejos, es que ni cogiendo algo se llega desde una sola base
  // dentro de un día: ese viaje pide dormir en más de un sitio, y eso todavía no se sabe planear. Se para y se dice.
  const repartido = leer<DeLosDias & { reparto: { porQue?: Record<string, string> } }>(run, "dias.json");
  // Un run de antes de que el reparto dijera sus porqués no los lleva: entonces no hay ninguno que contar.
  const lejos = Object.values(repartido.reparto.porQue ?? {}).filter((m) => m === "far").length;
  if (repartido.paradas.length > 0 && lejos / repartido.paradas.length > DEMASIADO_LEJOS)
    return para("days", "los días", [
      {
        donde: "dias",
        que:
          `${lejos} de los ${repartido.paradas.length} sitios elegidos quedan a más de lo que se puede ir y volver ` +
          "en un día desde una sola base: este viaje pide dormir en más de un sitio, y El Dorado todavía no sabe " +
          "planear uno de varias bases",
      },
    ]);

  // 5. La tabla y sus palancas, y el que cruza: dos rondas como mucho.
  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    if (!hay(run, `cruce-${ronda}.json`)) {
      const tabla = hay(run, `tabla-${ronda}.json`)
        ? leer<Tabla>(run, `tabla-${ronda}.json`)
        : await montarLaTabla(run, viaje, f, ronda);
      // Si ninguna fila puede ser una manera, no hay nada que cruzar ni que explicar: se para aquí y se dice.
      const validas = tabla.rows.filter(
        (x) => x.discarded === "" && typeof x.score === "number" && x.score >= tabla.minimum_score,
      );
      if (validas.length === 0) {
        const descartadas = tabla.rows.filter((x) => x.discarded !== "").length;
        return para("table", "la tabla", [
          {
            donde: "rows",
            que:
              `de los ${tabla.rows.length} alojamientos mirados, ninguno vale para este viajero: ` +
              `${descartadas} descartados por una criba y ${tabla.rows.length - descartadas} por debajo de la nota ` +
              "mínima o sin nota",
          },
        ]);
      }
      const r = recoger<EntregaDeCruce>(
        run,
        `cruce-${ronda}`,
        "trip-crosser",
        piezasDelCruce(run, viaje, ronda),
        (e) => puertaCruce(e, { tabla, viaje }).rojos,
      );
      if ("espera" in r) return espera(r.espera);
      if ("parado" in r) return para("cross", "el cruce (puerta 6)", r.parado);
      guardar(run, `cruce-${ronda}.json`, { entrega: r.entrega, rojos: [] });
    }
    if (leer<DelCruce>(run, `cruce-${ronda}.json`).entrega.requests.length === 0) break;
  }

  // 6. El que explica y, con lo suyo, el viaje para la web.
  if (!hay(run, "viaje.json") && hay(run, "explica.json")) {
    // Lo que explicó y ya pasó su puerta no se vuelve a juzgar: se lee, y con ello se monta el viaje.
    const pegas = montarElViaje(run, viaje, leer<Guardado<EntregaDeExplicar>>(run, "explica.json").entrega);
    if (pegas.length > 0) return para("trip", "el viaje para la web", pegas);
  }
  if (!hay(run, "viaje.json")) {
    const dado = loQueSeExplica(run, viaje);
    const piezas: Pieza[] = [
      { ruta: "trip.json", contenido: json(viaje) },
      { ruta: "ways.json", contenido: json(dado.ways) },
      { ruta: "levers.json", contenido: json(dado.levers) },
      { ruta: "checks.json", contenido: json(dado.checks) },
    ];
    const r = recoger<EntregaDeExplicar>(
      run,
      "explica",
      "trip-explainer",
      piezas,
      (e) => puertaExplica(e, { viaje, dado, avisos: avisosDeSiempre(viaje.language) }).rojos,
    );
    if ("espera" in r) return espera(r.espera);
    if ("parado" in r) return para("explain", "la explicación (puerta 7)", r.parado);
    guardar(run, "explica.json", { entrega: r.entrega, rojos: [] });
    const pegas = montarElViaje(run, viaje, r.entrega);
    if (pegas.length > 0) return para("trip", "el viaje para la web", pegas);
  }
  // Si el run es de un viaje de la mesa, lo que dejó se guarda como una versión más, una sola vez.
  const suyo = viajeDelRun(run);
  if (suyo !== null) guardarVersion(suyo.viaje, suyo.n, suyo.n === 1 ? "first" : "change");
  return { esperan: [], hecho: true, parado: null, avisos };
}

/** A nombre de quién quedan los viajes que se abren desde la terminal, mientras no los abra una cuenta. */
export const DE_MANO = "by-hand";

/**
 * Abre en la mesa un viaje con lo que he entendido de él, ya confirmado por quien lo lanza, y su primera
 * investigación. Devuelve la carpeta de ese run.
 */
export function empezar(entendido: string, cuando: Date = new Date(), dueno: string = DE_MANO): string {
  // Lo entendido se mira antes de abrir nada, y con la fecha de hoy: un viaje que ya pasó no se abre.
  const claro = puertaEntendido(JSON.parse(readFileSync(resolve(entendido), "utf8")), {
    hoy: cuando.toISOString().slice(0, 10),
  });
  if (!claro.verde)
    throw new Error(`lo entendido no está claro: ${claro.rojos.map((r) => `${r.donde}: ${r.que}`).join("; ")}`);
  const viaje = abrirViaje({ dueno, entendido: JSON.parse(readFileSync(resolve(entendido), "utf8")), cuando });
  pasar(viaje, "confirmed", cuando);
  return nuevoRun(viaje, cuando);
}

async function principal(): Promise<number> {
  const [orden, donde] = process.argv.slice(2);
  if (orden === "empezar" && donde !== undefined) {
    console.log(empezar(donde));
    return 0;
  }
  if (orden === "sigue" && donde !== undefined) {
    const { fuentesDeVerdad } = await import("./fuentes_de_verdad.ts");
    const run = resolve(donde);
    const estado = await sigue(run, fuentesDeVerdad());
    for (const aviso of estado.avisos) console.log(`Aviso: ${aviso}`);
    if (estado.parado !== null) {
      console.log(`Parado en ${estado.parado.paso}:`);
      for (const r of estado.parado.rojos) console.log(`  ${r.donde}: ${r.que}`);
      return 1;
    }
    if (estado.hecho) {
      console.log(`Hecho. El viaje, en ${join(run, "viaje.json")}`);
      return 0;
    }
    console.log(`Esperan a su asiento: ${estado.esperan.join(", ")}`);
    console.log(`La orden que abre cada uno, en ${join(run, "ordenes")}`);
    return 0;
  }
  console.error("Uso: investigar.ts empezar <entendido.json>  o  investigar.ts sigue <carpeta del run>");
  return 2;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(2);
    },
  );
}
