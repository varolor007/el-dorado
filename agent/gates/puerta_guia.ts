// La puerta 10: ¿la guía dice lo que dice el viaje? Lo que el código comprueba, desde fuera, de la guía. Dos partes,
// las dos de la misma puerta:
//
// - Lo que escribe el que escribe la guía: que cuenta cada día, cada parada, cada tramo y cada cosa que llevar hecha,
//   una vez y sin otras, y dónde comer el día que el viaje lo sabe, y solo ese; que no nombra un sitio que no es del
//   viaje (los que se quedaron fuera, los demás sitios del destino que se conocen y cualquier nombre que no está en su
//   material); que sus números son los del viaje; que cada precio y cada hora que dice son de los que trae el viaje
//   (los del transporte, las entradas, cómo moverse y lo que suele costar comer); que un tramo que no se anda no dice
//   un transporte que el viaje no trae; que no lleva palabras prohibidas, enlaces, correos ni teléfonos; y que lo que
//   no se sabe está dicho.
// - El cuaderno ya montado: que cada foto lleva su autor y su licencia, cada precio su fecha y cada enlace es una
//   dirección https sin claves; que todo es del viaje cerrado, de la versión de la que sale, también lo de allí (la
//   entrada y el horario de cada parada, dónde comer, cómo moverte y antes de ir), cada dato con su página y su día;
//   y que lleva el aviso de IA y el de los precios, con la fecha de los precios.
//
// No mide si la guía cuenta bien lo que cuenta: eso lo cubre quien la lee.

import { HORAS, DE_DINERO, LARGO_EN_LA_GUIA, MODOS_EN_UN_TEXTO, TOPES_DE_LA_GUIA } from "../data/guia.ts";
import { avisosDe } from "../data/palabras.ts";
import type { Viaje } from "../output/viaje.ts";
import { entradaDelCuaderno, fuentesDeAlli, type Cuaderno } from "../scripts/cuaderno.ts";
import { entradaDe } from "../scripts/capas.ts";
import { andando } from "../tools/distancias.ts";
import { capaQueVale, comerPorDias, modosDelViaje, moverseConAlgo, type ParaLaGuia } from "../scripts/guia.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe, numerosDeMas, pegasDelTexto } from "./textos.ts";
import { enlaceSinClaves } from "../tools/enlaces.ts";

export type EntregaDeLaGuia = {
  seat: "guide-writer";
  language: string;
  cover: { title: string; intro: string };
  days: {
    date: string;
    title: string;
    intro: string;
    stops: { id: string; what: string; why: string; when: string }[];
    legs: { from: string; to: string; says: string }[];
    /** Dónde parar a comer ese día: solo si el material lo trae (14.6). */
    eat?: string;
  }[];
  todo: { item: number; says: string }[];
  unknowns: string[];
};

/**
 * Lo que tuvo delante el asiento, y lo que la puerta sabe además: los nombres de los demás sitios del destino que se
 * conocen (los de los datos abiertos que no son paradas de sus días, y los que se quedaron fuera del viaje), y las
 * horas que trae el viaje, si trae alguna.
 */
export type MaterialDeLaGuia = { dado: ParaLaGuia; otrosSitios: string[]; horas: string[] };

const LO_QUE_LLEVA = ["seat", "language", "cover", "days", "todo", "unknowns"];
/** Los campos del material que son una frase de otro: sus números no son de la casa. */
const FRASES = new Set(["about", "why", "looking_for", "says"]);
/** Los idiomas que escriben con mayúscula cada nombre común: en ellos no se buscan nombres por su mayúscula. */
const CON_MAYUSCULA_EN_TODO = new Set(["de", "lb"]);

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Los números que puede decir la guía: los campos que son números, los de los nombres y las fechas, cuántos viajan,
 * cuántos días y paradas tiene, y los metros dichos en kilómetros (con un decimal o con dos). Los que van dentro de una
 * frase de otro (lo que dicen las fuentes, el porqué de una parada, las palabras del viajero) no cuentan.
 */
export function numerosDeLaGuia(dado: ParaLaGuia): Set<number> {
  const dados = new Set<number>();
  const suma = (n: number): void => {
    if (!Number.isFinite(n)) return;
    dados.add(n);
    dados.add(Math.abs(n));
  };
  const recorre = (algo: unknown, campo: string): void => {
    if (typeof algo === "number") {
      suma(algo);
      if (campo === "metres") {
        suma(Math.round(algo / 100) / 10);
        suma(Math.round(algo / 10) / 100);
      }
    } else if (typeof algo === "string") {
      if (!FRASES.has(campo)) for (const n of numerosDe(algo)) suma(n);
    } else if (Array.isArray(algo)) for (const x of algo) recorre(x, campo);
    else if (esObjeto(algo)) for (const [k, x] of Object.entries(algo)) recorre(x, k);
  };
  recorre(dado, "");
  const t = dado.trip;
  for (const n of [t.adults + t.children, dado.days.length, t.nights + 1]) suma(n);
  for (let i = 1; i <= dado.days.length; i++) suma(i);
  for (const d of dado.days) suma(d.stops.length);
  return dados;
}

/** Las palabras de un texto, tal como van escritas. */
const palabrasDe = (texto: string): string[] => texto.match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? [];

/** Las palabras con mayúscula que no abren una frase: lo que tiene pinta de nombre propio. */
function nombresEn(texto: string): string[] {
  const nombres: string[] = [];
  for (const frase of texto.split(/(?<=[.!?:;¡¿«"“(\n])\s*|\s+[-\u2013]\s+/)) {
    const palabras = palabrasDe(frase);
    palabras.forEach((p, i) => {
      if (i > 0 && p.length > 1 && /^\p{Lu}/u.test(p) && !/^I['’]/u.test(p)) nombres.push(p);
    });
  }
  return nombres;
}

/** Los meses, los días de la semana y los países del viaje, en inglés y en el idioma del viajero. */
function deSiempre(idioma: string, paises: string[]): string[] {
  const dichas: string[] = [];
  for (const i of [...new Set(["en", idioma])]) {
    let regiones: Intl.DisplayNames | null = null;
    try {
      regiones = new Intl.DisplayNames([i], { type: "region" });
    } catch {
      regiones = null;
    }
    for (const pais of paises) if (/^[A-Z]{2}$/.test(pais)) dichas.push(regiones?.of(pais) ?? "");
    try {
      for (let mes = 0; mes < 12; mes++)
        for (const forma of ["long", "short"] as const)
          dichas.push(new Intl.DateTimeFormat(i, { month: forma, timeZone: "UTC" }).format(Date.UTC(2031, mes, 1)));
      for (let dia = 0; dia < 7; dia++)
        for (const forma of ["long", "short"] as const)
          dichas.push(
            new Intl.DateTimeFormat(i, { weekday: forma, timeZone: "UTC" }).format(Date.UTC(2031, 0, 5 + dia)),
          );
    } catch {
      // Un idioma que no se conoce no tiene meses: quedan los de inglés.
    }
  }
  return dichas;
}

/** Todas las palabras del material, de cualquier campo: lo que el asiento pudo leer. */
function palabrasDelMaterial(dado: ParaLaGuia): Set<string> {
  const dichas = new Set<string>();
  const recorre = (algo: unknown): void => {
    if (typeof algo === "string") for (const p of palabrasDe(algo)) dichas.add(p.toLowerCase());
    else if (Array.isArray(algo)) for (const x of algo) recorre(x);
    else if (esObjeto(algo)) for (const x of Object.values(algo)) recorre(x);
  };
  recorre(dado);
  return dichas;
}

/** Un nombre, entero, en un texto: ni empieza ni acaba dentro de otra palabra. Sin distinguir mayúsculas. */
function nombra(texto: string, nombre: string): boolean {
  const escapado = nombre
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return escapado !== "" && new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, "iu").test(texto);
}

/** Las horas del reloj de un texto, escritas como «10:30», o «10» si solo dice la hora. */
function horasEn(texto: string): string[] {
  const halladas: string[] = [];
  for (const forma of HORAS)
    for (const m of texto.matchAll(new RegExp(forma.source, forma.flags)))
      halladas.push(m[2] === undefined ? String(Number(m[1])) : `${Number(m[1])}:${m[2]}`);
  return halladas;
}

/** Las horas que trae el material de las capas: cuándo abre y cierra cada parada y hasta qué hora funciona algo. */
export function horasDelMaterial(dado: ParaLaGuia): string[] {
  const horas: string[] = [];
  const recorre = (algo: unknown, campo: string): void => {
    if (typeof algo === "string" && ["opens", "closes", "until"].includes(campo)) {
      const h = /^(\d{1,2}):(\d{2})$/.exec(algo);
      if (h !== null) horas.push(`${Number(h[1])}:${h[2]}`);
    } else if (Array.isArray(algo)) for (const x of algo) recorre(x, campo);
    else if (esObjeto(algo)) for (const [k, x] of Object.entries(algo)) recorre(x, k);
  };
  recorre(dado, "");
  return horas;
}

/** Los importes que trae el material: lo que cuesta cada entrada, cada billete y cada manera de llegar, y comer. */
export function importesDelMaterial(dado: ParaLaGuia): Set<number> {
  const importes = new Set<number>();
  const recorre = (algo: unknown, campo: string): void => {
    if (typeof algo === "number" && campo === "amount") importes.add(algo);
    else if (Array.isArray(algo)) for (const x of algo) recorre(x, campo);
    else if (esObjeto(algo)) {
      if (campo === "costs" && typeof algo.from === "number" && typeof algo.to === "number") {
        importes.add(algo.from);
        importes.add(algo.to);
      }
      for (const [k, x] of Object.entries(algo)) recorre(x, k);
    }
  };
  recorre(dado, "");
  return importes;
}

/** Un importe dicho con su moneda, delante o detrás: «10 €», «€10», «10,50 EUR», «12 euros». */
const IMPORTE = "(\\d+(?:[.,]\\d{1,2})?)";
const CON_IMPORTE = new RegExp(
  `(?:(?:${DE_DINERO.source})\\s?${IMPORTE})|(?:(?<![\\p{N}.,])${IMPORTE}\\s?(?:${DE_DINERO.source}))`,
  "giu",
);

/** Los importes que dice un texto junto a una moneda, como números. */
export function importesEn(texto: string): number[] {
  const hallados: number[] = [];
  for (const m of texto.matchAll(CON_IMPORTE)) {
    const crudo = m[1] ?? m[2];
    if (crudo !== undefined) hallados.push(Number(crudo.replace(",", ".")));
  }
  return hallados;
}

/** Verdadero si hay algo que la guía tiene que decir que no se sabe: una parada sin fuentes o un tramo a ojo. */
export function hayAlgoSinSaberEnLaGuia(dado: ParaLaGuia): boolean {
  return (
    dado.days.some(
      (d) => d.stops.some((p) => p.about === "unknown") || d.legs.some((l) => l.measured_by === "estimate"),
    ) || dado.todo.some((c) => c.kind === "paper" && c.before === "unknown" && c.state !== "warning")
  );
}

/**
 * El veredicto de la puerta 10 sobre lo escrito: los rojos, que vuelven al asiento, y los avisos, que no paran nada y
 * se guardan con el veredicto para quien lo revise.
 */
export type VeredictoDeLaGuia = Veredicto & { avisos: Rojo[] };

export function puertaGuia(entrega: unknown, m: MaterialDeLaGuia): VeredictoDeLaGuia {
  const rojos: Rojo[] = [];
  const avisos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const aviso = (donde: string, que: string): void => void avisos.push({ donde, que });
  if (!esObjeto(entrega))
    return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }], avisos };
  const { dado } = m;

  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "guide-writer") rojo("seat", "la entrega no es del que escribe la guía");
  if (entrega.language !== dado.trip.language)
    rojo("language", `no escribe en el idioma del viajero: ${dado.trip.language}`);
  for (const nombre of ["days", "todo", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  // Lo que se puede nombrar: las paradas de sus días, el destino, donde se duerme, el transporte, los meses y los
  // días. Y lo que no: los demás sitios que se conocen, salvo que su nombre vaya dentro del de una parada.
  const permitidos = [
    ...dado.days.flatMap((d) => [...d.stops.map((p) => p.name), d.title]),
    dado.trip.destination.name,
    ...(dado.stay.lodging === "unknown" ? [] : [dado.stay.lodging]),
    ...(dado.stay.zone === "unknown" ? [] : [dado.stay.zone]),
    ...(dado.stay.transport === "unknown" ? [] : [dado.stay.transport.from, dado.stay.transport.to]),
    // Lo de allí que nombra el viaje: una zona o un mercado donde comer, un plato, un barrio; y de dónde se llega.
    ...dado.days.flatMap((d) => (d.eat ?? []).map((x) => x.name)),
    ...(dado.know ?? []).map((x) => x.name),
    ...(dado.around?.arrivals ?? []).map((x) => x.from_name),
  ].filter((x) => x !== "unknown");
  const prohibidos = [...new Set(m.otrosSitios)].filter(
    (otro) => otro.trim().length >= 3 && !permitidos.some((p) => nombra(p, otro)),
  );
  const delMaterial = palabrasDelMaterial(dado);
  for (const p of deSiempre(dado.trip.language, [dado.trip.destination.country])) delMaterial.add(p.toLowerCase());
  for (const p of deSiempre(dado.trip.language, [dado.trip.destination.country]).flatMap(palabrasDe))
    delMaterial.add(p.toLowerCase());
  const conNombres = !CON_MAYUSCULA_EN_TODO.has(dado.trip.language);
  const numeros = numerosDeLaGuia(dado);
  const todasLasHoras = [...m.horas, ...horasDelMaterial(dado)];
  const horas = new Set(todasLasHoras);
  const horasSueltas = new Set(todasLasHoras.map((h) => h.split(":")[0]));
  const importes = importesDelMaterial(dado);
  const modos = modosDelViaje(dado);

  /** Un texto para el viajero: dicho, corto, sin palabras prohibidas, y solo con lo que hay en el viaje. */
  const texto = (donde: string, v: unknown, largo: number = LARGO_EN_LA_GUIA.texto): void => {
    if (!esTexto(v)) return rojo(donde, "está en blanco");
    if (v.length > largo) rojo(donde, `tiene ${v.length} letras, y caben ${largo}`);
    for (const pega of pegasDelTexto(v, { sinNumerosLargos: true })) rojo(donde, pega);
    // Sin precios en el material, el dinero es todo suyo. Con ellos, cada importe que dice es uno de los del viaje.
    if (importes.size === 0 && DE_DINERO.test(v))
      rojo(donde, "habla de dinero: los precios los pone el cuaderno, con su fecha");
    for (const n of importesEn(v))
      if (importes.size > 0 && !importes.has(n)) rojo(donde, `dice el precio ${n}, que no está en el viaje`);
    for (const h of horasEn(v))
      if (h.includes(":") ? !horas.has(h) : !horasSueltas.has(h))
        rojo(donde, `dice la hora ${h}, que no está en el viaje`);
    for (const n of numerosDeMas(v, numeros)) rojo(donde, `dice ${n}, que no está en el viaje`);
    for (const otro of prohibidos) if (nombra(v, otro)) rojo(donde, `nombra «${otro}», que no es una parada del viaje`);
    // Una palabra con mayúscula que no está en el material no es un rojo: el código no distingue un sitio inventado
    // de «Gótico» o de «Christmas». Se avisa, para quien revise; un sitio conocido que no es del viaje, sí es rojo.
    if (conNombres)
      for (const nombre of new Set(nombresEn(v)))
        if (!delMaterial.has(nombre.toLowerCase())) aviso(donde, `nombra «${nombre}», que no está en el viaje`);
  };

  // La portada.
  if (!esObjeto(entrega.cover)) rojo("cover", "no es un objeto con title e intro");
  else {
    for (const campo of Object.keys(entrega.cover))
      if (campo !== "title" && campo !== "intro") rojo(`cover.${campo}`, "no es de la entrega");
    texto("cover.title", entrega.cover.title, LARGO_EN_LA_GUIA.titulo);
    texto("cover.intro", entrega.cover.intro);
  }

  // Cada día, una vez y en su orden, con cada parada y cada tramo suyos.
  const escritos = lista(entrega.days);
  if (escritos.length > TOPES_DE_LA_GUIA.dias) rojo("days", "trae más días de los que caben");
  dado.days.forEach((dia, i) => {
    const donde = `days[${i}]`;
    const crudo = escritos[i];
    if (!esObjeto(crudo)) return rojo(donde, `falta el día ${dia.date}`);
    if (crudo.date !== dia.date) return rojo(`${donde}.date`, `tenía que ser el día ${dia.date}, en su orden`);
    const conComer = (dia.eat ?? []).length > 0;
    for (const campo of Object.keys(crudo))
      if (!["date", "title", "intro", "stops", "legs", ...(conComer ? ["eat"] : [])].includes(campo))
        rojo(
          `${donde}.${campo}`,
          campo === "eat" ? "ese día el viaje no sabe dónde comer: no se dice" : "no es de la entrega",
        );
    texto(`${donde}.title`, crudo.title, LARGO_EN_LA_GUIA.titulo);
    texto(`${donde}.intro`, crudo.intro);
    if (conComer) texto(`${donde}.eat`, crudo.eat);
    const ids = dia.stops.map((p) => p.id);
    const vistas = new Set<string>();
    lista(crudo.stops).forEach((p, j) => {
      const aqui = `${donde}.stops[${j}]`;
      if (!esObjeto(p) || !esTexto(p.id)) return rojo(aqui, "no dice de qué parada habla");
      if (!ids.includes(p.id)) return rojo(aqui, `${p.id} no es una parada de este día`);
      if (vistas.has(p.id)) return rojo(aqui, `la parada ${p.id} sale dos veces`);
      vistas.add(p.id);
      for (const campo of Object.keys(p))
        if (!["id", "what", "why", "when"].includes(campo)) rojo(`${aqui}.${campo}`, "no es de la entrega");
      texto(`${aqui}.what`, p.what);
      texto(`${aqui}.why`, p.why);
      texto(`${aqui}.when`, p.when);
    });
    for (const id of ids) if (!vistas.has(id)) rojo(`${donde}.stops`, `falta la parada ${id}`);
    const tramos = dia.legs.map((l) => `${l.from}>${l.to}`);
    const contados = new Set<string>();
    lista(crudo.legs).forEach((l, j) => {
      const aqui = `${donde}.legs[${j}]`;
      if (!esObjeto(l) || !esTexto(l.from) || !esTexto(l.to)) return rojo(aqui, "no dice de dónde a dónde");
      const par = `${l.from}>${l.to}`;
      if (!tramos.includes(par)) return rojo(aqui, `de ${l.from} a ${l.to} no es un tramo de este día`);
      if (contados.has(par)) return rojo(aqui, `el tramo de ${l.from} a ${l.to} sale dos veces`);
      contados.add(par);
      for (const campo of Object.keys(l))
        if (!["says", "to", `from`].includes(campo)) rojo(`${aqui}.${campo}`, "no es de la entrega");
      texto(`${aqui}.says`, l.says);
      // Un tramo que no se anda no se cuenta a pie: los minutos son de coger algo.
      const dadoDelTramo = dia.legs.find((x) => `${x.from}>${x.to}` === par);
      if (
        dadoDelTramo !== undefined &&
        !dadoDelTramo.on_foot &&
        esTexto(l.says) &&
        /\b(?:on foot|walk\w*|andando|a pie|caminando)\b/iu.test(l.says)
      )
        rojo(`${aqui}.says`, "lo cuenta a pie, y ese tramo no se anda");
      // Un tramo que no se anda solo dice un transporte de los que trae el viaje.
      if (dadoDelTramo !== undefined && !dadoDelTramo.on_foot && esTexto(l.says))
        for (const [modo, palabra] of Object.entries(MODOS_EN_UN_TEXTO[dado.trip.language] ?? MODOS_EN_UN_TEXTO.en))
          if (palabra?.test(l.says) && !modos.has(modo as never))
            rojo(`${aqui}.says`, `dice que se va en ${modo}, y el viaje no lo trae`);
    });
    for (const par of tramos)
      if (!contados.has(par)) rojo(`${donde}.legs`, `falta el tramo ${par.replace(">", " a ")}`);
  });
  for (let i = dado.days.length; i < escritos.length; i++) rojo(`days[${i}]`, "no es un día del viaje");

  // Lo que hay que llevar hecho: una frase por cosa, ni más ni menos.
  const cosas = dado.todo.map((c) => c.item);
  const dichas = new Set<number>();
  lista(entrega.todo).forEach((c, i) => {
    const donde = `todo[${i}]`;
    if (!esObjeto(c) || !Number.isInteger(c.item)) return rojo(donde, "no dice de qué cosa habla");
    const item = c.item as number;
    if (!cosas.includes(item)) return rojo(donde, `la cosa ${item} no es de las que se le dieron`);
    if (dichas.has(item)) return rojo(donde, `la cosa ${item} sale dos veces`);
    dichas.add(item);
    for (const campo of Object.keys(c))
      if (campo !== "item" && campo !== "says") rojo(`${donde}.${campo}`, "no es de la entrega");
    texto(`${donde}.says`, c.says);
  });
  for (const item of cosas) if (!dichas.has(item)) rojo("todo", `falta la frase de la cosa ${item}`);

  // Lo que no se sabe, dicho.
  const noSe = lista(entrega.unknowns);
  if (noSe.length > TOPES_DE_LA_GUIA.noSeSabe)
    rojo("unknowns", `lleva ${noSe.length}, y caben ${TOPES_DE_LA_GUIA.noSeSabe}`);
  noSe.forEach((v, i) => texto(`unknowns[${i}]`, v));
  if (hayAlgoSinSaberEnLaGuia(dado) && noSe.length === 0)
    rojo("unknowns", "hay cosas que no se saben y no se le dicen al viajero");
  return { verde: rojos.length === 0, rojos, avisos };
}

/** Una dirección que se puede abrir: https, sin usuario ni clave dentro, tampoco en su consulta. */
const direccionQueVale = (texto: unknown): boolean => enlaceSinClaves(texto);

/**
 * El cuaderno ya montado, contra el viaje cerrado del que sale: que es de ese viaje y de esa versión, que cada día y
 * cada parada son del viaje, que cada foto lleva su autor y su licencia, que cada precio dice cuándo se vio y es el
 * del viaje, que cada enlace se puede abrir sin claves, y que lleva sus avisos y la fecha de los precios.
 */
export function puertaCuaderno(c: Cuaderno, v: Viaje, version: number = v.version): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (c.viaje !== v.id || c.version !== version) rojo("viaje", "el cuaderno no es de este viaje ni de esta versión");
  if (c.idioma !== v.idioma) rojo("idioma", "no está en el idioma del viajero");
  if (c.dias.length !== v.dias.length) rojo("dias", "no tiene los días del viaje");
  const paradas = new Map(v.paradas.map((p) => [p.id, p]));
  const fotos: { donde: string; f: Cuaderno["portada"]["foto"] }[] = [{ donde: "portada.foto", f: c.portada.foto }];
  c.dias.forEach((d, i) => {
    const delViaje = v.dias[i];
    if (delViaje === undefined || d.fecha !== delViaje.fecha) return rojo(`dias[${i}]`, "no es un día del viaje");
    const ids = d.paradas.map((p) => p.id);
    if (ids.join("|") !== delViaje.paradas.join("|")) rojo(`dias[${i}].paradas`, "no son las paradas de ese día");
    d.paradas.forEach((p, j) => {
      const suya = paradas.get(p.id);
      if (suya === undefined || suya.nombre !== p.nombre)
        rojo(`dias[${i}].paradas[${j}]`, "no es una parada del viaje");
      fotos.push({ donde: `dias[${i}].paradas[${j}].foto`, f: p.foto });
      if (p.fuente.enlace !== null && !direccionQueVale(p.fuente.enlace))
        rojo(`dias[${i}].paradas[${j}].fuente`, "su enlace no es una dirección https sin claves");
    });
  });
  for (const { donde, f } of fotos) {
    if (f === null) continue;
    if (!esTexto(f.autor) || !esTexto(f.licencia)) rojo(donde, "una foto sin su autor o sin su licencia");
    if (!direccionQueVale(f.url)) rojo(donde, "la foto no es una dirección https sin claves");
    if (f.pagina !== null && !direccionQueVale(f.pagina)) rojo(donde, "la página de la foto no es una dirección https");
  }
  // Cada precio y cada enlace, del viaje cerrado: los de ese día, si se cerró con su flujo; si no, los del viaje.
  const precios = [
    ...(c.duermes === null ? [] : [{ donde: "duermes.precio", p: c.duermes.precio, pieza: "lodging" as const }]),
    ...(c.llegas === null ? [] : [{ donde: "llegas.precio", p: c.llegas.precio, pieza: "transport" as const }]),
    ...c.reservas.map((r, i) => ({
      donde: `reservas[${i}].precio`,
      p: r.precio,
      pieza: r.que === "stay" ? ("lodging" as const) : ("transport" as const),
    })),
  ];
  for (const { donde, p } of precios)
    if (Number.isNaN(Date.parse(p.visto))) rojo(donde, "el precio no dice cuándo se vio");
  for (const [i, r] of c.reservas.entries())
    r.enlaces.forEach((e, j) => {
      if (!direccionQueVale(e.url))
        rojo(`reservas[${i}].enlaces[${j}]`, "el enlace no es una dirección https sin claves");
      if (e.precio !== null && Number.isNaN(Date.parse(e.precio.visto)))
        rojo(`reservas[${i}].enlaces[${j}]`, "el precio de otro vendedor no dice cuándo se vio");
    });
  const cierre = Array.isArray(v.cierre?.precios) && Array.isArray(v.cierre?.enlaces) ? v.cierre : null;
  if (cierre === null) {
    const deLaCasa = [...v.alojamientos.map((a) => a.precio), ...v.transportes.map((t) => t.precio)];
    for (const { donde, p } of precios)
      if (
        p.segun !== "seen" ||
        p.otraHabitacion ||
        !deLaCasa.some((x) => x.total === p.total && x.moneda === p.moneda && x.visto === p.visto)
      )
        rojo(donde, "ese precio no es uno del viaje");
    for (const [i, r] of c.reservas.entries())
      r.enlaces.forEach((e, j) => {
        if (!deLaCasa.some((x) => x.enlace === e.url) || e.comprobado !== null || e.precio !== null)
          rojo(`reservas[${i}].enlaces[${j}]`, "ese enlace no es uno del viaje");
      });
    if (c.total !== null) rojo("total", "lleva un total, y el viaje no se cerró con sus precios de ese día");
  } else {
    for (const { donde, p, pieza } of precios) {
      const suyo = cierre.precios.find((x) => x.pieza === pieza);
      if (suyo === undefined) {
        rojo(donde, "esa pieza no tiene precio en el viaje cerrado");
        continue;
      }
      // Lo que tiene que decir, contado aquí y no con las cuentas del cuaderno: el de ese día si lo hay, y si no, el
      // que se vio, dicho como tal.
      const de = suyo.hoy ?? suyo.antes;
      const debe = {
        total: de.total,
        moneda: de.moneda,
        visto: de.visto,
        segun: suyo.hoy !== null ? "closing" : suyo.cambio === "gone" ? "gone" : "unknown",
        otraHabitacion: suyo.hoy !== null && suyo.habitacion === "other",
      };
      if (
        p.total !== debe.total ||
        p.moneda !== debe.moneda ||
        p.visto !== debe.visto ||
        p.segun !== debe.segun ||
        p.otraHabitacion !== debe.otraHabitacion
      )
        rojo(donde, "ese precio no es el del viaje cerrado: el de ese día, o el que se vio dicho como tal");
    }
    const queDuerme = v.alojamientos.find((a) => a.id === cierre.alojamiento)?.nombre;
    if (c.duermes !== null && c.duermes.nombre !== queDuerme)
      rojo("duermes", "no es donde se duerme en el viaje cerrado");
    const total = cierre.total.hoy ?? cierre.total.antes;
    const segun = cierre.total.hoy === null ? "unknown" : "closing";
    if (c.total === null || c.total.total !== total || c.total.moneda !== cierre.moneda || c.total.segun !== segun)
      rojo("total", "no lleva el total del viaje cerrado");
    for (const pieza of ["lodging", "transport"] as const) {
      const suyos = cierre.enlaces.filter((e) => e.pieza === pieza);
      const que = pieza === "lodging" ? "stay" : "transport";
      const i = c.reservas.findIndex((r) => r.que === que);
      const r = c.reservas[i];
      if (r === undefined) {
        if (suyos.length > 0) rojo("reservas", "falta dónde se reserva una pieza que tiene sus enlaces");
        continue;
      }
      // El precio de otro vendedor, con el día en que se buscó: el de su oferta, o el del precio que se vio.
      const diaDeOtro = (x: { ref: string; url: string }): string =>
        v.alojamientos.find((a) => a.id === x.ref)?.otrasOfertas.find((o) => o.enlace === x.url)?.visto ?? antes;
      const antes = cierre.precios.find((x) => x.pieza === pieza)?.antes.visto ?? "";
      r.enlaces.forEach((e, j) => {
        const aqui = `reservas[${i}].enlaces[${j}]`;
        const x = suyos.find((y) => y.url === e.url);
        if (x === undefined) return rojo(aqui, "ese enlace no es uno del viaje cerrado");
        if (x.comprobado === "down") return rojo(aqui, "ese enlace no respondió al cerrar el viaje");
        const precio = x.precio === null ? null : { ...x.precio, visto: diaDeOtro(x) };
        if (
          e.clase !== x.clase ||
          e.vendedor !== x.vendedor ||
          e.comprobado !== x.comprobado ||
          JSON.stringify(e.precio) !== JSON.stringify(precio)
        )
          rojo(
            aqui,
            "ese enlace no dice lo que dice el viaje cerrado: su clase, su vendedor, su precio o si respondió",
          );
      });
      for (const x of suyos)
        if (x.comprobado !== "down" && !r.enlaces.some((e) => e.url === x.url))
          rojo(`reservas[${i}]`, "falta un enlace del viaje cerrado");
      if (r.caidos !== suyos.filter((x) => x.comprobado === "down").length)
        rojo(`reservas[${i}]`, "no dice cuántos enlaces no respondieron al cerrar");
    }
  }
  rojos.push(...rojosDeLoDeAlli(c, v));
  if (precios.length > 0 && (c.preciosDel === null || Number.isNaN(Date.parse(c.preciosDel))))
    rojo("preciosDel", "lleva precios y no dice de cuándo son");
  const avisos = avisosDe(v.idioma);
  if (c.avisos.ia !== avisos.ia) rojo("avisos", "falta el aviso de que está hecha con IA");
  if (c.avisos.precios !== avisos.precios) rojo("avisos", "falta el aviso de que los precios son orientativos");
  return { verde: rojos.length === 0, rojos };
}

const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const esDe = (lista: readonly unknown[], x: unknown): boolean => lista.some((y) => igual(x, y));

/**
 * Lo de allí del cuaderno, contra las capas del viaje cerrado (14.6): cada entrada es la de su parada ese día, cada
 * sitio donde comer es uno de lo que conviene saber y le toca ese día, cada cosa de cómo moverte y de antes de ir es
 * una del viaje, y cada dato dice de qué página sale y el día en que se vio. Una capa que falta no se nombra.
 */
export function rojosDeLoDeAlli(c: Cuaderno, v: Viaje): Rojo[] {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const entradas = capaQueVale(v.entradas) ?? undefined;
  const saber = capaQueVale(v.saber);
  const moverse = capaQueVale(v.moverse);
  const comer = comerPorDias(v);
  c.dias.forEach((d, i) => {
    d.paradas.forEach((p, j) => {
      const suya = p.entrada ?? null;
      if (suya === null) return;
      const debe = entradaDelCuaderno(entradaDe(entradas, p.id), d.fecha);
      if (!igual(suya, debe))
        rojo(`dias[${i}].paradas[${j}].entrada`, "no es la entrada ni el horario de esa parada ese día en el viaje");
    });
    const deComer = d.comer ?? [];
    const leToca = (comer.porDia.get(d.fecha) ?? []).map((x) => ({
      cosa: x.cosa,
      cerca: x.parada.id,
      metros: x.metros,
    }));
    deComer.forEach((x, j) => {
      const aqui = `dias[${i}].comer[${j}]`;
      if (saber === null || !esDe(saber.cosas, x.cosa))
        return rojo(aqui, "no es un sitio de lo que conviene saber del viaje");
      if (!esDe(leToca, x)) rojo(aqui, "no le toca a ese día, o no está a lo que se anda de esa parada");
      const parada = v.paradas.find((y) => y.id === x.cerca);
      if (parada === undefined || x.cosa.punto === null || andando(parada.punto, x.cosa.punto) !== x.metros)
        rojo(aqui, "lo que se anda hasta él no es la cuenta de la casa");
    });
    if (deComer.length === 0 && (d.comerDice ?? null) !== null)
      rojo(`dias[${i}].comerDice`, "dice dónde comer, y ese día no hay dónde");
  });
  const m = c.moverse ?? null;
  if (m !== null) {
    if (!moverseConAlgo(moverse)) rojo("moverse", "el viaje no sabe cómo moverse allí, y el cuaderno lo cuenta");
    else {
      for (const clave of ["llegar", "transportes", "billetes", "pagos"] as const)
        (m[clave] as unknown[]).forEach((x, j) => {
          if (!esDe(moverse[clave] as unknown[], x)) rojo(`moverse.${clave}[${j}]`, "no es una del viaje");
        });
      if (!igual(m.coche, moverse.coche)) rojo("moverse.coche", "no dice lo que dice el viaje del coche");
    }
  }
  (c.saber ?? []).forEach((x, j) => {
    if (saber === null || !esDe(saber.cosas, x))
      rojo(`saber[${j}]`, "no es una cosa de lo que conviene saber del viaje");
  });
  // Cada dato de allí, con su página que se puede abrir y el día en que se vio.
  for (const f of fuentesDeAlli(c))
    if (!direccionQueVale(f.url) || !/^\d{4}-\d{2}-\d{2}/.test(f.visto) || Number.isNaN(Date.parse(f.visto)))
      rojo("fuentes", `un dato de allí no dice de qué página sale o cuándo se vio: ${f.url}`);
  return rojos;
}
