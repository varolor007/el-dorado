// La mitad de código de la puerta 1: ¿el viaje, claro? Mira la forma de lo que se ha entendido antes de gastar
// nada: que cada campo base está y es de su clase, que las fechas son fechas de verdad, que los que viajan son
// personas, y que los nombres son nombres. Lo que el viajero dice con sus palabras no se juzga aquí: solo que sea
// una frase y no otra cosa. Sin esta puerta, un dato mal escrito gastaba siete asientos antes de romper la casa.

import { COSAS } from "../data/gustos.ts";
import { LETRAS_DE_UN_NOMBRE } from "../data/ruta.ts";
import { DECIMALES_DEL_ORIGEN } from "../data/transporte.ts";
import {
  FRASE_DEL_VIAJERO,
  FRASES_DEL_VIAJERO,
  LARGO_DE_UNA_PREGUNTA,
  NOCHES_DE_UN_VIAJE,
  PREGUNTAS_DE_MAS,
  VIAJEROS,
} from "../data/viaje.ts";
import { RITMOS } from "../output/viaje.ts";
import { CLASES_DE_DESTINO, CUANTO_MOVERSE, GASTOS, PESOS_DE_GUSTO, type Dicho } from "../scripts/formas.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const de = (lista: readonly string[], v: unknown): boolean => typeof v === "string" && lista.includes(v);
const entero = (v: unknown, desde: number, hasta: number): boolean =>
  typeof v === "number" && Number.isInteger(v) && v >= desde && v <= hasta;
const entre = (v: unknown, desde: number, hasta: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= desde && v <= hasta;
const letras = (v: unknown, cuantas: number): boolean =>
  typeof v === "string" && new RegExp(`^[A-Za-z]{${cuantas}}$`).test(v);

/** Un nombre: corto, en una línea, sin enlaces ni marcas. Sale después a buscar a las fuentes, con sus letras. */
const esNombre = (v: unknown): boolean =>
  typeof v === "string" &&
  v.trim() !== "" &&
  v.length <= LETRAS_DE_UN_NOMBRE &&
  !/[\u0000-\u001f<>{}]|https?:|www\./i.test(v);

/** Una frase del viajero: texto, en una línea y sin pasar de su largo. */
const esFrase = (v: unknown): boolean =>
  typeof v === "string" && v.trim() !== "" && v.length <= FRASE_DEL_VIAJERO && !/[\u0000-\u001f]/.test(v);

/** Una fecha de verdad, escrita año, mes y día: el 30 de febrero no lo es. */
export function esFecha(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const UN_DIA = 24 * 60 * 60 * 1000;

/** Lo que escribió el viajero, cada cosa por su lado: de aquí, y solo de aquí, sale cada cita. */
export const palabrasDe = (d: Dicho): string[] =>
  [d.wants, d.booked, ...d.answers.map((a) => a.answer)].filter((x) => x.trim() !== "");

/**
 * Si una cita está de verdad en lo que escribió el viajero, letra a letra: un trozo de una de sus frases, tal cual,
 * con alguna letra. Una cita no junta dos frases distintas: así no se le hace decir lo que no dijo.
 */
export function estaDicho(cita: unknown, d: Dicho): boolean {
  if (typeof cita !== "string" || cita.trim() === "" || !/\p{L}/u.test(cita)) return false;
  return palabrasDe(d).some((frase) => frase.includes(cita));
}

/** Lo que el viajero dijo con sus palabras: un texto en una línea, que puede estar vacío. */
const esTextoSuyo = (v: unknown): boolean =>
  typeof v === "string" && v.length <= FRASE_DEL_VIAJERO && !/[\u0000-\u001f]/.test(v);

/** La forma de lo dicho: sus dos cajas, si ya se escuchó, y cada pregunta con su respuesta. */
export function dichoQueVale(v: unknown): v is Dicho {
  if (!esObjeto(v) || !esTextoSuyo(v.wants) || !esTextoSuyo(v.booked) || typeof v.heard !== "boolean") return false;
  const respuestas = Array.isArray(v.answers) && v.answers.length <= PREGUNTAS_DE_MAS ? v.answers : null;
  return (
    respuestas !== null &&
    respuestas.every(
      (r) =>
        esObjeto(r) &&
        esFrase(r.question) &&
        (r.question as string).length <= LARGO_DE_UNA_PREGUNTA &&
        esFrase(r.answer),
    )
  );
}

/**
 * Lo que el código comprueba de lo entendido. `hoy`, si se da, es el primer día en que se puede viajar: una entrada
 * anterior no vale.
 */
export function puertaEntendido(v: unknown, o: { hoy?: string } = {}): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "entendido", que: "no es un objeto" }] };

  if (typeof v.language !== "string" || !/^[a-z]{2,3}$/.test(v.language))
    rojo("language", "el idioma no son dos o tres letras minúsculas");
  if (!letras(v.currency, 3)) rojo("currency", "la moneda no son tres letras: es del viajero, y no se supone");
  if (!de(GASTOS, v.budget)) rojo("budget", "el gasto no es de su lista");
  if (!de(RITMOS, v.pace)) rojo("pace", "el ritmo no es de su lista");

  // El destino: su nombre, su país, su clase, su centro y su caja, en el mapa.
  const d = v.destination;
  if (!esObjeto(d)) rojo("destination", "falta el destino");
  else {
    if (!esNombre(d.name)) rojo("destination.name", "el nombre del destino no es un nombre");
    if (!letras(d.country, 2)) rojo("destination.country", "el país no son dos letras");
    if (!de(CLASES_DE_DESTINO, d.kind)) rojo("destination.kind", "la clase de destino no es de su lista");
    if (!(d.airport === null || letras(d.airport, 3))) rojo("destination.airport", "el aeropuerto no son tres letras");
    const c = d.centre;
    if (!esObjeto(c) || !entre(c.lat, -90, 90) || !entre(c.lon, -180, 180))
      rojo("destination.centre", "el centro no está en el mapa");
    const b = d.box;
    // Una caja puede cruzar el meridiano 180: entonces su oeste es mayor que su este, y vale.
    const caja =
      esObjeto(b) &&
      entre(b.south, -90, 90) &&
      entre(b.north, -90, 90) &&
      entre(b.west, -180, 180) &&
      entre(b.east, -180, 180) &&
      b.south < b.north &&
      b.west !== b.east;
    if (!caja) rojo("destination.box", "la caja del destino no encierra nada en el mapa");
  }

  // De dónde sale: puede no saberse, y entonces no hay transporte que buscar.
  const s = v.origin;
  if (s !== null && s !== undefined) {
    if (!esObjeto(s)) rojo("origin", "no dice de dónde sale");
    else {
      if (!esNombre(s.name)) rojo("origin.name", "el nombre de donde sale no es un nombre");
      if (!letras(s.country, 2)) rojo("origin.country", "el país de salida no son dos letras");
      if (!(s.airport === null || letras(s.airport, 3))) rojo("origin.airport", "el aeropuerto no son tres letras");
      // Su punto es opcional, y redondeado: con más decimales diría dónde vive el viajero, y no hace falta.
      const p = s.centre;
      const redondo = (x: unknown): boolean =>
        typeof x === "number" &&
        Math.abs(x * 10 ** DECIMALES_DEL_ORIGEN - Math.round(x * 10 ** DECIMALES_DEL_ORIGEN)) < 1e-9;
      if (p !== undefined) {
        if (!esObjeto(p) || !entre(p.lat, -90, 90) || !entre(p.lon, -180, 180))
          rojo("origin.centre", "el punto de salida no está en el mapa");
        else if (!redondo(p.lat) || !redondo(p.lon))
          rojo("origin.centre", `el punto de salida lleva más de ${DECIMALES_DEL_ORIGEN} decimal: diría demasiado`);
      }
    }
  }

  // Las fechas: de verdad, la salida después de la entrada, y un viaje que no dura un año.
  const f = v.dates;
  if (!esObjeto(f) || !esFecha(f.check_in) || !esFecha(f.check_out)) rojo("dates", "las fechas no son fechas");
  else {
    const noches = (Date.parse(`${f.check_out}T00:00:00Z`) - Date.parse(`${f.check_in}T00:00:00Z`)) / UN_DIA;
    if (noches < 1) rojo("dates", "la salida no es después de la entrada");
    else if (noches > NOCHES_DE_UN_VIAJE)
      rojo("dates", `son ${noches} noches, y un viaje llega a ${NOCHES_DE_UN_VIAJE}`);
    if (o.hoy !== undefined && f.check_in < o.hoy) rojo("dates", "la entrada ya ha pasado");
    if (typeof f.flexible !== "boolean") rojo("dates.flexible", "no dice si las fechas se pueden mover");
  }

  // Los que viajan: personas, con el pasaporte del que depende el precio.
  const t = v.travellers;
  if (!esObjeto(t)) rojo("travellers", "no dice quién viaja");
  else {
    if (!entero(t.adults, 1, VIAJEROS.adultos))
      rojo("travellers.adults", `los adultos no son de 1 a ${VIAJEROS.adultos}`);
    const ninos = Array.isArray(t.children) ? t.children : null;
    if (ninos === null || ninos.length > VIAJEROS.ninos || !ninos.every((e) => entero(e, 0, VIAJEROS.edadDeNino)))
      rojo("travellers.children", "los niños van por su edad, de 0 a 17, y no son más de los que caben");
    // Las habitaciones las dice el viajero. En cada una duerme al menos un adulto: no puede haber más que adultos.
    const adultos = entero(t.adults, 1, VIAJEROS.adultos) ? (t.adults as number) : VIAJEROS.adultos;
    if (!entero(t.rooms, 1, adultos))
      rojo("travellers.rooms", "las habitaciones las dice el viajero: de una a tantas como adultos viajan");
    const pasaportes = Array.isArray(t.passports) ? t.passports : null;
    if (pasaportes === null || !pasaportes.every((p) => letras(p, 2)))
      rojo("travellers.passports", "cada pasaporte son las dos letras de su país");
    else if (pasaportes.length === 0 && !(esObjeto(s) && letras(s.country, 2)))
      rojo("travellers.passports", "no se sabe con qué pasaporte viaja ni de qué país sale: sin eso no hay precio");
  }

  // Lo que dice con sus palabras: frases, y cada gusto con su peso.
  const frases = (campo: string, lista: unknown): void => {
    if (!Array.isArray(lista) || lista.length > FRASES_DEL_VIAJERO || !lista.every(esFrase))
      rojo(campo, "no es una lista corta de frases");
  };
  frases("looking_for", v.looking_for);
  frases("booked", v.booked);
  const gustos = Array.isArray(v.tastes) && v.tastes.length <= FRASES_DEL_VIAJERO ? v.tastes : null;
  if (gustos === null) rojo("tastes", "no es una lista corta");
  else
    gustos.forEach((g, i) => {
      if (!esObjeto(g) || !esFrase(g.thing) || !de(PESOS_DE_GUSTO, g.weight) || !esFrase(g.quote))
        rojo(`tastes[${i}]`, "un gusto lleva su cosa, su peso y las palabras del viajero");
      // Una cosa que parece de las que se cruzan pero no está escrita como ellas se quedaría sin cruzar, en silencio.
      else if (Object.hasOwn(Object.prototype, g.thing as string) && !Object.hasOwn(COSAS, g.thing as string))
        rojo(`tastes[${i}]`, "la cosa no es un nombre que se pueda usar");
    });
  const limites = Array.isArray(v.limits) && v.limits.length <= FRASES_DEL_VIAJERO ? v.limits : null;
  if (limites === null) rojo("limits", "no es una lista corta");
  else
    limites.forEach((l, i) => {
      if (!esObjeto(l) || !esFrase(l.what) || !esFrase(l.quote))
        rojo(`limits[${i}]`, "un límite lleva qué y sus palabras");
    });

  // Lo que escribió con sus palabras, si va: con su forma, y cada cita de un gusto o de un límite, sacada de ahí.
  if (v.said !== undefined) {
    if (!dichoQueVale(v.said)) rojo("said", "lo que escribió el viajero no tiene su forma");
    else {
      const dicho = v.said;
      (Array.isArray(v.tastes) ? v.tastes : []).forEach((g, i) => {
        if (esObjeto(g) && !estaDicho(g.quote, dicho))
          rojo(`tastes[${i}].quote`, "la cita no está, letra a letra, en lo que escribió el viajero");
      });
      (Array.isArray(v.limits) ? v.limits : []).forEach((l, i) => {
        if (esObjeto(l) && !estaDicho(l.quote, dicho))
          rojo(`limits[${i}].quote`, "la cita no está, letra a letra, en lo que escribió el viajero");
      });
    }
  }

  // Lo de moverse por un país o una región: puede no ir; si va, cada cosa es un sí, un no o un «no lo ha dicho».
  const m = v.moving;
  if (m !== undefined) {
    const siNoONada = (x: unknown): boolean => x === null || typeof x === "boolean";
    if (!esObjeto(m) || !siNoONada(m.several_places) || !siNoONada(m.leave_country))
      rojo("moving", "lo de moverse no dice un sí, un no o nada de cada cosa");
    else if (!(m.how_much === null || de(CUANTO_MOVERSE, m.how_much)))
      rojo("moving.how_much", "cuánto quiere moverse no es de su lista");
  }
  return { verde: rojos.length === 0, rojos };
}
