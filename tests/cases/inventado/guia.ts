// La guía del viaje inventado: el viaje cerrado en una mesa de mentira, con lo que dirían sus fuentes abiertas, y lo
// que entregaría un que escribe la guía aplicado, solo con su material. Para probar la guía sin internet y sin gastar.

import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Lanzador } from "../../../agent/launcher/asiento.ts";
import { elegir, llevarElCierre, seguir, type FuentesDelCierre } from "../../../agent/launcher/cerrar.ts";
import {
  abrirViaje,
  guardarVersion,
  leerViaje,
  nuevoCierre,
  nuevoRun,
  pasar,
  type ViajeEnLaMesa,
} from "../../../agent/launcher/mesa.ts";
import { ENTREGA, PASOS } from "../../../agent/gates/puerta_metodo.ts";
import type { Viaje } from "../../../agent/output/viaje.ts";
import type { ParaLaGuia } from "../../../agent/scripts/guia.ts";
import type { FuenteAlojamiento, FuenteTransporte } from "../../../agent/tools/fuentes/tipos.ts";
import type { Sitio } from "../../../agent/tools/sitios.ts";
import { leerJson, seisPasos, type Objeto } from "./asientos.ts";
import { ENTENDIDO } from "./investigacion.ts";
import { SUCESOS_INVENTADOS, viajeInventado } from "./viaje.ts";

export const HOY = new Date("2027-01-10T09:00:00Z");
const FUENTE_OFICIAL = "https://gobierno.inventado.example/entrar";

/** El viaje inventado, con lo que se lleva a una guía: sus papeles con un plazo, un aviso de sus fechas y un enlace. */
export function viajeParaLaGuia(): Viaje {
  const v = viajeInventado();
  v.paradas[1].reservar = true;
  v.paradas[0].mejorHora = "morning";
  v.paradas[0].foto = {
    url: "https://fotos.inventado.example/torre.jpg",
    autor: "Una Autora",
    licencia: "CC BY-SA 4.0",
    pagina: null,
  };
  v.alojamientos[0].precio.enlace = "https://reservas.inventado.example/hotel";
  v.papeles = {
    viajeros: [{ pasaporte: "ES", edad: null, cuantos: 2 }],
    casillas: [
      {
        viajero: 0,
        pais: "ZZ",
        pregunta: "visa",
        estado: "in_order",
        duda: null,
        fuentes: [{ url: FUENTE_OFICIAL, lado: "destination", estado: "in_order", visto: "2026-11-20" }],
        hasta: null,
        antesDe: null,
        tarde: false,
        coste: null,
      },
      {
        viajero: 0,
        pais: "ZZ",
        pregunta: "arrival_card",
        estado: "to_do",
        duda: null,
        fuentes: [{ url: FUENTE_OFICIAL, lado: "destination", estado: "to_do", visto: "2026-11-20" }],
        hasta: null,
        antesDe: "2027-02-09",
        tarde: false,
        coste: null,
      },
    ],
    fuera: [],
    bloquea: false,
    falta: null,
    sigue: false,
  };
  v.calendario = {
    avisos: [
      {
        clase: "bothers",
        tema: "weather",
        nombre: null,
        desde: "2027-02-12",
        hasta: "2027-02-14",
        dias: ["2027-02-12", "2027-02-13", "2027-02-14"],
        precio: null,
        fuente: "https://tiempo.inventado.example/villa",
        visto: "2026-11-20",
        frase: "En febrero llueve muchos días: lleva un plan bajo techo.",
      },
    ],
    ventanas: [],
    falta: null,
  };
  return v;
}

/** Lo que dicen las fuentes abiertas de los sitios del destino: las paradas, la de fuera y uno que no se eligió. */
export function sitiosInventados(): { sitios: Sitio[]; resumenes: Record<string, string> } {
  const sitio = (id: string, nombre: string, lat: number, lon: number, descripcion: string | null): Sitio => ({
    id,
    nombre,
    clase: "landmark",
    clases: [],
    punto: { lat, lon },
    enlaces: 10,
    descripcion,
    articulo: null,
    articuloEnIngles: null,
    archivo: null,
    fuente: "inventada",
    visto: "2026-11-23T10:00:00.000Z",
  });
  return {
    sitios: [
      sitio("p1", "Torre Inventada", 10.02, 20.02, "stone tower built in 1520 next to the Palacio Olvidado"),
      sitio("p2", "Mercado Inventado", 10.03, 20.03, "covered market"),
      sitio("p3", "Mirador Inventado", 10.06, 20.06, null),
      sitio("p4", "Museo Inventado", 10.08, 20.08, "museum of invented things"),
      sitio("q9", "Palacio Olvidado", 10.025, 20.025, "palace"),
    ],
    resumenes: { p2: "The Mercado Inventado is the oldest market of Villa Inventada." },
  };
}

/** Un viaje inventado ya cerrado en una mesa nueva: un run con su viaje y sus sitios, su versión, y cerrado. */
export function viajeCerradoEnLaMesa(o: { dueno?: string; mesa?: string; viaje?: Viaje } = {}): {
  mesa: string;
  v: ViajeEnLaMesa;
} {
  const mesa = o.mesa ?? mkdtempSync(join(tmpdir(), "el-dorado-mesa-guia-"));
  const v = abrirViaje({ dueno: o.dueno ?? "ana", entendido: ENTENDIDO, mesa, cuando: HOY, id: "viaje-inventado" });
  pasar(v, "confirmed", HOY);
  const run = nuevoRun(v, HOY);
  const viaje = o.viaje ?? viajeParaLaGuia();
  writeFileSync(join(run, "viaje.json"), JSON.stringify(viaje));
  writeFileSync(join(run, "sucesos.json"), JSON.stringify(SUCESOS_INVENTADOS));
  writeFileSync(join(run, "sitios.json"), JSON.stringify(sitiosInventados()));
  guardarVersion(v, 1, "first", HOY);
  pasar(v, "closed", HOY);
  return { mesa, v };
}

/** Cuándo se cierra el viaje inventado por su flujo: la víspera del día en que se pide la guía. */
export const AL_CERRAR = new Date("2027-01-09T10:00:00Z");
/** Los enlaces del viaje inventado cerrado por su flujo, y lo que responde cada uno al cerrar. */
export const ENLACES_DEL_CIERRE = {
  hotel: "https://reservas.inventado.example/hotel",
  otro: "https://otra.inventada.example/hotel?in=2027-02-12",
  web: "https://hotel.inventado.example/",
  vuelo: "https://www.aviasales.com/search/AAA1202ZZZ14021",
};

/** Una fuente de alojamiento de mentira: da hoy el total que se le diga, para las noches que se le piden. */
function alojamientoDeHoy(total: number | null): FuenteAlojamiento {
  return {
    nombre: "inventada",
    lista: async () => [],
    detalle: async () => {
      throw new Error("no hace falta");
    },
    opiniones: async () => [],
    precios: async (ids, e) =>
      total === null
        ? []
        : [
            {
              fuente: "inventada",
              visto: AL_CERRAR.toISOString(),
              id: ids[0],
              total,
              tasasAparte: 0,
              moneda: "EUR",
              habitacion: "Doble",
              idHabitacion: null,
              regimen: null,
              cancelable: true,
              entrada: e.entrada,
              salida: e.salida,
              adultos: e.adultos,
              habitaciones: e.habitaciones,
              vendedor: "inventada",
              enlace: null,
            },
          ],
  };
}

/** Una fuente de vuelos de mentira: el mismo vuelo, al precio por billete que se le diga. */
function vueloDeHoy(porBillete: number): FuenteTransporte {
  return {
    nombre: "inventada",
    lugares: async () => ({ aeropuertos: [], ciudades: [] }),
    fechas: async (t) => [
      {
        fuente: "inventada",
        visto: AL_CERRAR.toISOString(),
        origen: t.origen,
        destino: t.destino,
        sale: "2027-02-12T08:00:00+01:00",
        vuelve: "2027-02-14T18:00:00+01:00",
        aerolinea: "ZZ",
        numero: "1",
        precio: porBillete,
        pasajeros: 1,
        moneda: "EUR",
        escalasIda: 0,
        escalasVuelta: 0,
        minutos: 360,
        minutosIda: 180,
        guardado: false,
        enlace: ENLACES_DEL_CIERRE.vuelo,
      },
    ],
  };
}

/**
 * El viaje inventado, cerrado de verdad por su flujo (8.4) con fuentes de mentira y sin IA, con la mejor manera: el
 * hotel, al cerrar, cuesta lo que se diga (por defecto, un 30 % más), el viajero sigue igual, y su enlace de donde se
 * vio el precio no responde. La web del hotel responde; la del otro vendedor y el vuelo, no se pueden comprobar.
 */
export async function viajeCerradoPorSuFlujo(o: { hotelHoy?: number | null } = {}): Promise<{
  mesa: string;
  v: ViajeEnLaMesa;
}> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-guia-"));
  const viaje = viajeParaLaGuia();
  viaje.alojamientos[0].precio.enlace = ENLACES_DEL_CIERRE.hotel;
  viaje.alojamientos[0].otrasOfertas[0] = {
    ...viaje.alojamientos[0].otrasOfertas[0],
    vendedor: "Otra Inventada",
    enlace: ENLACES_DEL_CIERRE.otro,
  };
  viaje.transportes[0].sale = "2027-02-12T08:00:00+01:00";
  viaje.transportes[0].vuelve = "2027-02-14T18:00:00+01:00";
  viaje.transportes[0].precio.enlace = ENLACES_DEL_CIERRE.vuelo;
  viaje.transportes[0].precio.vendedor = "ZZ";
  const entendido = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: viaje.entrada, check_out: viaje.salida } };
  const v = abrirViaje({ dueno: "ana", entendido, mesa, cuando: AL_CERRAR, id: "viaje-inventado" });
  pasar(v, "confirmed", AL_CERRAR);
  const run = nuevoRun(v, AL_CERRAR);
  writeFileSync(join(run, "viaje.json"), JSON.stringify(viaje));
  writeFileSync(join(run, "sucesos.json"), JSON.stringify(SUCESOS_INVENTADOS));
  writeFileSync(join(run, "sitios.json"), JSON.stringify(sitiosInventados()));
  const finalista = { alojamiento: { id: "a1" }, detalle: { web: ENLACES_DEL_CIERRE.web, entradaDesde: "14:00" } };
  writeFileSync(join(run, "busqueda.json"), JSON.stringify({ busqueda: { finalistas: [finalista] } }));
  guardarVersion(v, 1, "first", AL_CERRAR);
  const fuentes: FuentesDelCierre = {
    alojamiento: alojamientoDeHoy(o.hotelHoy === undefined ? 312 : o.hotelHoy),
    transporte: vueloDeHoy(60),
    comprobar: async (url) =>
      url === ENLACES_DEL_CIERRE.hotel ? "down" : url === ENLACES_DEL_CIERRE.web ? "ok" : "unchecked",
  };
  const c = nuevoCierre(v, AL_CERRAR);
  elegir(v, c.carpeta, "best_value", AL_CERRAR);
  const al = { fuentes, lanzador: null, ahora: () => AL_CERRAR };
  let r = await llevarElCierre(v, c, al);
  if (r.etapa === "yours") {
    seguir(c.carpeta, AL_CERRAR);
    r = await llevarElCierre(v, c, al);
  }
  if (r.etapa !== "done") throw new Error(`el viaje inventado no se cerró: ${r.etapa}`);
  return { mesa, v: leerViaje(v.ficha.id, "ana", mesa) };
}

/** Lo que escribiría un que escribe la guía aplicado: solo con los nombres y los números de su material. */
export function entregaDeLaGuia(d: ParaLaGuia): Objeto {
  return {
    seat: "guide-writer",
    language: d.trip.language,
    cover: {
      title: `${d.trip.destination.name}, en ${d.days.length} días`,
      intro: `Un viaje de ${d.trip.nights} noches para ${d.trip.adults} adultos, a pie casi siempre.`,
    },
    days: d.days.map((dia) => ({
      date: dia.date,
      title: dia.title,
      intro: `Un día con ${dia.stops.length} paradas, sin prisa.`,
      stops: dia.stops.map((p) => ({
        id: p.id,
        what:
          p.about === "unknown"
            ? `${p.name}, una de las paradas de tu viaje.`
            : `${p.name}: lo que cuentan sus fuentes.`,
        why: `Vas a ${p.name} porque es de lo que más merece tu tiempo aquí.`,
        when: p.best_time === "morning" ? "Mejor por la mañana, con calma." : "Cualquier hora del día le va bien.",
      })),
      legs: dia.legs.map((l) => ({
        from: l.from,
        to: l.to,
        says: l.on_foot
          ? `Son ${l.minutes} minutos andando, ${l.metres} metros.`
          : `Unos ${l.minutes} minutos en coche o en transporte.`,
      })),
    })),
    todo: d.todo.map((c) => ({
      item: c.item,
      says:
        c.kind === "paper" && c.before !== "unknown"
          ? `Rellena el formulario antes del ${Number(c.before.slice(8, 10))} de febrero.`
          : "Llévalo hecho antes de salir.",
    })),
    unknowns: ["De algunas paradas no sabemos más que su nombre, y algunos tiempos son aproximados."],
  };
}

const material = (puesto: string, nombre: string): unknown => leerJson(join(puesto, "in", nombre));

/** El que escribe la guía, de mentira: deja sus seis pasos con lo que entregaría, o con lo que se le estropee. */
export function lanzadorDeLaGuia(
  estropea: (entrega: Objeto, vuelta: number) => void = () => {},
): Lanzador & { veces: number } {
  const lanzador = (async (_orden, puesto) => {
    lanzador.veces++;
    const dado: ParaLaGuia = {
      trip: material(puesto.carpeta, "trip.json") as ParaLaGuia["trip"],
      days: material(puesto.carpeta, "days.json") as unknown as ParaLaGuia["days"],
      stay: material(puesto.carpeta, "stay.json") as ParaLaGuia["stay"],
      todo: material(puesto.carpeta, "todo.json") as unknown as ParaLaGuia["todo"],
    };
    const entrega = entregaDeLaGuia(dado);
    estropea(entrega, lanzador.veces);
    const textos = seisPasos(readdirSync(join(puesto.carpeta, "in")), entrega);
    for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
    return { turnos: 1, entrada: 4000, salida: 1500, usd: 0.04 };
  }) as Lanzador & { veces: number };
  lanzador.veces = 0;
  return lanzador;
}
