// Puerta 12: ¿lo del destino, con su página y sin promesas? Lo que el código puede medir de lo que entrega el que
// conoce el destino (14.3). Que cada página citada se abrió de verdad lo mira la puerta de todos (`puerta_metodo.ts`,
// con la memoria de lo consultado); aquí, lo demás:
//
// - cada cosa, en una clase de la lista y sin pasar del tope de su clase, ni del total;
// - cada cosa, con su página (https) y su fecha, que no es de después de hoy;
// - ningún precio sin su fuente y su moneda: lo que suele costar una comida va siempre con su horquilla, y una frase
//   que dice un precio lo dice con los números de esa horquilla;
// - ninguna palabra de la lista prohibida (las promesas, lo de dentro), ni enlaces, correos o teléfonos;
// - cada número de una frase, en sus datos: sus cifras o lo que cuesta;
// - cada zona de la que habla, de la ruta; un barrio, una zona donde comer y un mercado, siempre atados a una; y su
//   sitio, si lo da, dentro de esa zona;
// - lo de comer, sin opiniones (estrellas, reseñas) y sin el nombre de un restaurante, en lo que se puede ver: que su
//   nombre no sea de un sitio donde se come y que su frase no nombre uno.
//
// Lo que no puede medir, y queda a su contrato: que un nombre propio a secas no sea el de un restaurante, que lo dicho
// sea lo que dice la página, que esté en el idioma del viajero y que sea de lo que cambia su viaje.

import {
  CIFRAS_DE_UNA_COSA,
  CLASE_DEL_PRECIO,
  CLASES_CON_ZONA,
  CLASES_DE_COMER,
  CLASES_DEL_DESTINO,
  CLASES_SIN_NEGOCIOS,
  CON_ALGUIEN,
  DE_UN_CANAL,
  DE_UN_NEGOCIO,
  DE_UN_RESTAURANTE,
  DE_UNA_DIRECCION_DICHA,
  DE_UNA_OPINION,
  LETRAS_DE_UNA_COSA,
  LO_MAS_DE_COSAS,
  TOPE_POR_CLASE,
  VECES_EL_RADIO,
  type ClaseDelDestino,
} from "../data/capa_destino.ts";
import { LETRAS_DE_UN_NOMBRE } from "../data/capas.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO } from "../data/viaje.ts";
import { enlaceDeFuera } from "../launcher/consultado.ts";
import { enLineaRecta, type Punto } from "../tools/distancias.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { leerNumeros, pegaDeNombreDeFuera, pegasDeFrases, pegasDelTexto } from "./textos.ts";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const SIN_SABER = "unknown";
const esFecha = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lo que la puerta sabe del viaje: las zonas de la ruta, con su centro y su radio, y el día de hoy. */
export type ParaElDestino = {
  zonas: { id: string; centre: Punto; radius_m: number }[];
  hoy: string;
};

const palabras = (lista: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])(?:${lista})(?![\\p{L}\\p{N}])`, "iu");
const UN_RESTAURANTE = palabras(DE_UN_RESTAURANTE);
const UNA_OPINION = palabras(DE_UNA_OPINION);
/**
 * «The restaurant Casa X», «la taberna "El Y"»: la palabra de un sitio donde se come, y detrás un nombre propio, que
 * empieza por mayúscula. La palabra se busca sin mirar mayúsculas; lo que la sigue, mirándolas.
 */
const TRAS_UN_RESTAURANTE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${DE_UN_RESTAURANTE})(?![\\p{L}\\p{N}])\\s*[«"“'‘]?\\s*(\\p{L})`,
  "giu",
);
const nombraUnRestaurante = (frase: string): boolean =>
  [...frase.matchAll(TRAS_UN_RESTAURANTE)].some((m) => m[1] !== m[1].toLowerCase());
const UN_CANAL = palabras(DE_UN_CANAL);
const UNA_DIRECCION_DICHA = palabras(DE_UNA_DIRECCION_DICHA);
const esMayuscula = (letra: string | undefined): boolean =>
  letra !== undefined && letra !== letra.toLowerCase() && letra === letra.toUpperCase();
/** Lo que empieza en el principio de una palabra; si acaba en una palabra entera, también en su final. */
const entre = (fuente: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])${fuente}`, "giu");
/** «Juan's Taxis»: un nombre propio con su posesivo, y detrás una palabra de negocio. */
const DE_ALGUIEN = entre(`(\\p{L})\\p{L}*['’]s\\s+(?:${DE_UN_NEGOCIO})(?![\\p{L}\\p{N}])`);
/** «Sol Tours», «Taxis García»: una palabra de negocio junto a un nombre propio, las dos con mayúscula. */
const NOMBRE_Y_NEGOCIO = entre(`(\\p{L})\\p{L}*\\s+(${DE_UN_NEGOCIO})(?![\\p{L}\\p{N}])`);
const NEGOCIO_Y_NOMBRE = entre(`(${DE_UN_NEGOCIO})(?![\\p{L}\\p{N}])\\s+[«"“'‘]?(\\p{L})`);
/** «Book with Marta», «reserva con Sol»: hacerlo con alguien, por su nombre. */
const CON_UN_NOMBRE = entre(`(?:${CON_ALGUIEN})\\s+[«"“'‘]?(\\p{L})`);
/**
 * Si una frase nombra un negocio: lo que se puede ver de él, un nombre propio pegado a una palabra de negocio o
 * reservar con alguien por su nombre. Lo que no se puede ver (un nombre propio a secas) queda a su contrato.
 */
const nombraUnNegocio = (frase: string): boolean =>
  [...frase.matchAll(DE_ALGUIEN)].some((m) => esMayuscula(m[1])) ||
  [...frase.matchAll(NOMBRE_Y_NEGOCIO)].some((m) => esMayuscula(m[1]) && esMayuscula(m[2][0])) ||
  [...frase.matchAll(NEGOCIO_Y_NOMBRE)].some((m) => esMayuscula(m[1][0]) && esMayuscula(m[2])) ||
  [...frase.matchAll(CON_UN_NOMBRE)].some((m) => esMayuscula(m[1]));
/** Una nota: «4.5/5», «9/10», «4,7 de 5». */
const UNA_NOTA = /\d(?:[.,]\d)?\s*(?:\/|de|out of|sur|su|von)\s*(?:5|10|100)(?!\d)/iu;
/** Un precio escrito en la frase: un número pegado a un símbolo de moneda o a un código de tres letras. */
const SIMBOLOS = "$€£¥₹₩₽₺₫฿₱₦₴₪₡₲₵₸₭₮";
const UN_PRECIO = new RegExp(
  `[${SIMBOLOS}]\\s?\\d|\\d\\s?[${SIMBOLOS}]|(?<![\\p{L}])\\p{Lu}{3}\\s?\\d|\\d\\s?\\p{Lu}{3}(?![\\p{L}])`,
  "u",
);

/** Una hora, HH:MM o H:MM, dentro de una frase y sola, como va en las cifras. */
const UNA_HORA = /(?<!\d)(?:[01]?\d|2[0-4]):[0-5]\d(?!\d)/gu;
const UNA_HORA_SOLA = /^(?:[01]?\d|2[0-4]):[0-5]\d$/;
const normalHora = (h: string): string => h.padStart(5, "0");

export function puertaDestino(v: unknown, p: ParaElDestino): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  if (v.seat !== "local-knowledge") rojo("seat", "no es la entrega del que conoce el destino");
  const zonas = new Map(p.zonas.map((z) => [z.id, z]));

  const cosas = Array.isArray(v.items) ? v.items : null;
  if (cosas === null) rojo("items", "falta, o no es una lista: una lista vacía también se dice");
  else if (cosas.length > LO_MAS_DE_COSAS)
    rojo("items", `son ${cosas.length} cosas, y caben ${LO_MAS_DE_COSAS} como mucho: las que cambian el viaje (RL3)`);

  const porClase = new Map<ClaseDelDestino, number>();
  const barrios = new Set<string>();
  const vistas = new Set<string>();
  (cosas ?? []).forEach((x, i) => {
    const donde = `items[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    const clase = x.kind as ClaseDelDestino;
    if (!CLASES_DEL_DESTINO.includes(clase)) return rojo(`${donde}.kind`, "la clase no es de su lista (RL2)");
    porClase.set(clase, (porClase.get(clase) ?? 0) + 1);
    const deComer = CLASES_DE_COMER.includes(clase);

    // La página y su fecha.
    if (!enlaceDeFuera(x.source))
      rojo(`${donde}.source`, "no dice la página abierta de donde sale, https de fuera y en su forma normal (RL1)");
    if (!esFecha(x.seen)) rojo(`${donde}.seen`, "no es una fecha, YYYY-MM-DD: cada cosa lleva la suya (RL1)");
    else if (x.seen > p.hoy) rojo(`${donde}.seen`, "es de después de hoy: una página no se ve mañana");

    // La zona: de la ruta; y la de un barrio, una zona donde comer o un mercado, siempre.
    const zona = x.zone === null ? null : typeof x.zone === "string" ? zonas.get(x.zone) : undefined;
    if (zona === undefined) rojo(`${donde}.zone`, "habla de una zona que no es de la ruta (RL6)");
    else if (zona === null && CLASES_CON_ZONA.includes(clase))
      rojo(`${donde}.zone`, `un ${clase} va atado a una zona de la ruta, por su id (RL6)`);
    if (clase === "neighbourhood" && zona) {
      if (barrios.has(zona.id)) rojo(`${donde}.zone`, "ya hay un barrio para esta zona: uno por zona");
      barrios.add(zona.id);
    }

    // El nombre: corto, solo el nombre y, en lo de comer, no el de un sitio donde se come.
    if (x.name !== SIN_SABER) {
      if (typeof x.name !== "string" || x.name.trim() === "" || x.name.length > LETRAS_DE_UN_NOMBRE)
        rojo(`${donde}.name`, `no es un nombre de ${LETRAS_DE_UN_NOMBRE} letras como mucho, ni unknown`);
      else if (pegaDeNombreDeFuera(x.name) !== null)
        rojo(`${donde}.name`, `el nombre ${pegaDeNombreDeFuera(x.name)}: es solo el nombre`);
      else if (deComer && UN_RESTAURANTE.test(x.name))
        rojo(`${donde}.name`, "parece el nombre de un sitio donde se come: ningún restaurante con nombre (RL4)");
      else if (clase === CLASE_DEL_PRECIO) rojo(`${donde}.name`, "lo que cuesta una comida no lleva nombre: unknown");
    }

    // El sitio: solo de lo que tiene zona, y dentro de ella.
    if (x.point !== SIN_SABER) {
      const pt = x.point as Punto;
      const enElMapa =
        esObjeto(pt) && esNumero(pt.lat) && esNumero(pt.lon) && Math.abs(pt.lat) <= 90 && Math.abs(pt.lon) <= 180;
      if (!enElMapa) rojo(`${donde}.point`, "no es un sitio del mapa, ni unknown");
      else if (!zona) rojo(`${donde}.point`, "un sitio va con la zona de la ruta en la que está");
      else if (enLineaRecta(pt, zona.centre) > zona.radius_m * VECES_EL_RADIO)
        rojo(`${donde}.point`, "está fuera de su zona: lo de cada zona, cerca de lo que se ve en ella");
    }

    // Lo que cuesta: solo en lo de comer, siempre en lo que cuesta una comida, de tanto a tanto y con su moneda.
    const c = x.costs;
    const horquilla =
      esObjeto(c) &&
      esNumero(c.from) &&
      esNumero(c.to) &&
      c.from > 0 &&
      c.from <= c.to &&
      typeof c.currency === "string" &&
      /^[A-Za-z]{3}$/.test(c.currency);
    if (c !== SIN_SABER && !horquilla)
      rojo(`${donde}.costs`, "no es de tanto a tanto con su moneda, en tres letras, ni unknown (RL5)");
    else if (c !== SIN_SABER && !deComer) rojo(`${donde}.costs`, "solo lo de comer dice lo que cuesta (RL5)");
    if (clase === CLASE_DEL_PRECIO && c === SIN_SABER)
      rojo(`${donde}.costs`, "lo que cuesta una comida va con su horquilla y su moneda; si no se sabe, no va (RL5)");

    // Las cifras: números u horas, pocas.
    const esCifra = (f: unknown): boolean => esNumero(f) || (typeof f === "string" && UNA_HORA_SOLA.test(f));
    const cifras = Array.isArray(x.figures) && x.figures.every(esCifra) ? (x.figures as (number | string)[]) : null;
    if (cifras === null)
      rojo(`${donde}.figures`, "no es una lista de números u horas HH:MM: una lista vacía también se dice");
    else if (cifras.length > CIFRAS_DE_UNA_COSA)
      rojo(`${donde}.figures`, `son ${cifras.length} cifras, y caben ${CIFRAS_DE_UNA_COSA}`);

    // La frase: corta, sin promesas ni enlaces, y con sus números en sus datos.
    const frase = x.says;
    if (typeof frase !== "string" || frase.trim() === "" || frase.length > LETRAS_DE_UNA_COSA)
      return rojo(`${donde}.says`, `no es una frase de ${LETRAS_DE_UNA_COSA} letras como mucho`);
    for (const pega of pegasDelTexto(frase, { sinNumerosLargos: true })) rojo(`${donde}.says`, `la frase ${pega}`);
    // En cualquier clase: ni manda a hablar con nadie, ni escribe una dirección con palabras.
    for (const [campo, texto] of [
      ["says", frase],
      ["name", typeof x.name === "string" ? x.name : ""],
    ] as const) {
      if (UN_CANAL.test(texto))
        rojo(`${donde}.${campo}`, "manda a hablar con alguien (llamar, escribir, una mensajería): no es de su clase");
      if (UNA_DIRECCION_DICHA.test(texto)) rojo(`${donde}.${campo}`, "escribe una dirección con palabras");
      // En lo que conviene evitar y en lo práctico, ningún negocio con nombre: ni para bien ni para mal.
      if (CLASES_SIN_NEGOCIOS.includes(clase) && (nombraUnNegocio(texto) || nombraUnRestaurante(texto)))
        rojo(`${donde}.${campo}`, "nombra un negocio: en lo que conviene evitar y en lo práctico, ninguno con nombre");
    }
    const clave = `${clase}|${frase.trim().toLowerCase()}`;
    if (vistas.has(clave)) rojo(`${donde}.says`, "la misma cosa sale dos veces");
    vistas.add(clave);
    const dePrecio = horquilla ? [c.from as number, c.to as number] : [];
    const dados = new Set([...(cifras ?? []).filter(esNumero), ...dePrecio]);
    // Las horas de la frase, cada una en sus cifras tal cual; lo demás, número a número.
    const horas = new Set((cifras ?? []).filter((f): f is string => typeof f === "string").map(normalHora));
    const horasDeMas = [...frase.matchAll(UNA_HORA)].map((h) => h[0]).filter((h) => !horas.has(normalHora(h)));
    if (horasDeMas.length > 0) rojo(`${donde}.says`, `dice ${horasDeMas.join(", ")}, que no está en sus cifras (RL7)`);
    const { leidos, ilegibles } = leerNumeros(frase.replace(UNA_HORA, " "));
    const deMas = leidos.filter((l) => !l.lecturas.some((una) => una.every((n) => dados.has(n)))).map((l) => l.crudo);
    if (ilegibles) rojo(`${donde}.says`, "lleva cifras que no se saben leer");
    if (deMas.length > 0)
      rojo(`${donde}.says`, `dice ${deMas.join(", ")}, que no está en sus cifras ni en lo que cuesta (RL7)`);
    if (UN_PRECIO.test(frase)) {
      if (!horquilla) rojo(`${donde}.says`, "dice un precio sin su horquilla, su moneda y su página (RL5)");
      else {
        const enPrecio = leidos.filter((l) => l.lecturas.some((una) => una.every((n) => dePrecio.includes(n))));
        if (enPrecio.length === 0) rojo(`${donde}.says`, "dice un precio que no es el de su horquilla (RL5)");
      }
    }
    if (deComer) {
      if (UNA_OPINION.test(frase) || UNA_NOTA.test(frase))
        rojo(`${donde}.says`, "habla de opiniones o de notas: lo de comer no recomienda (RL4)");
      if (nombraUnRestaurante(frase))
        rojo(`${donde}.says`, "nombra un sitio donde se come: ningún restaurante con nombre (RL4)");
    }
  });

  for (const [clase, n] of porClase)
    if (n > TOPE_POR_CLASE[clase]) rojo("items", `trae ${n} de ${clase}, y caben ${TOPE_POR_CLASE[clase]} (RL3)`);

  for (const [donde, que] of pegasDeFrases(v.unknowns, "unknowns", FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO))
    rojo(donde, que);
  return { verde: rojos.length === 0, rojos };
}
