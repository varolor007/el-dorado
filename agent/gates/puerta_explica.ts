// La puerta 7: ¿sin promesas y con su aviso? Lo que el código comprueba, desde fuera, de lo que escribe el asiento
// que explica. Mide de dónde sale cada cosa: que cada número del texto está en lo que se le dio, que ninguna palabra
// es de la lista prohibida (las promesas y las de dentro), que cada manera tiene su línea de lo que gana y de lo que
// pierde, que lo que no se sabe está dicho, y que lo que se entrega lleva el aviso de IA y el de los precios. Y, si
// se le dieron los avisos de las fechas, que cuenta cada uno y cada ventana con una frase, con los números y el nombre
// de su dato, y sin abaratar nada que no tenga precio. No mide si el texto engaña sin números: eso lo cubre un revisor
// que no lo escribió.

import { avisosDe, DE_ABARATAR } from "../data/palabras.ts";
import type { FechasParaExplicar, HallazgoParaExplicar, ParaExplicar } from "../scripts/explica.ts";
import type { Entendido } from "../scripts/formas.ts";
import { numerosEn } from "./puerta_cruce.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe, numerosDeMas, pegasDelTexto } from "./textos.ts";

/** Lo que tuvo delante el asiento, y los avisos que la casa pone en lo que se entrega. */
export type MaterialDeExplicar = { viaje: Entendido; dado: ParaExplicar; avisos: string[] };

const LO_QUE_LLEVA = ["seat", "language", "ways", "levers", "unknowns"];
/** Lo que lleva además, solo si se le dieron los avisos de las fechas. */
const DE_LAS_FECHAS = "dates";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Verdadero si hay algo sin confirmar que el viajero tiene que saber. */
export function hayAlgoSinSaber(dado: ParaExplicar): boolean {
  const deLasManeras = dado.ways.ways.some(
    (w) => w.cancellable === "unknown" || w.unconfirmed.some((x) => x.startsWith("must:")),
  );
  return deLasManeras || dado.checks.some((c) => c.status !== "ok");
}

/** Los campos del material cuyo texto es un nombre: un número dentro de un nombre se puede decir. */
const NOMBRES = ["lodging_label", "zone_name"];
const ES_FECHA = /^\d{4}-\d{2}-\d{2}/;

/**
 * Los números que el que explica puede decir: los que calculó la casa. Son los campos que son números, los de los
 * nombres y las fechas, los del grupo que viaja y los de las comprobaciones del que cruza, que ya pasaron su puerta
 * contra la tabla. Los que van dentro de una frase de otro asiento o del viajero no cuentan: una frase puede traer
 * un precio o un teléfono que nadie calculó, y por ahí se colaría hasta el viajero.
 */
export function numerosDeLaCasa(m: MaterialDeExplicar): Set<number> {
  const dados = new Set<number>();
  const recorre = (algo: unknown, campo: string): void => {
    if (typeof algo === "number" && Number.isFinite(algo)) {
      dados.add(algo);
      dados.add(Math.abs(algo));
    } else if (typeof algo === "string") {
      if (NOMBRES.includes(campo) || ES_FECHA.test(algo)) for (const n of numerosDe(algo)) dados.add(n);
    } else if (Array.isArray(algo)) for (const x of algo) recorre(x, campo);
    else if (esObjeto(algo)) for (const [k, x] of Object.entries(algo)) recorre(x, k);
  };
  recorre(m.dado.ways, "");
  recorre(m.dado.levers, "");
  for (const n of numerosEn(m.dado.checks)) dados.add(n);
  const v = m.viaje;
  for (const n of numerosDe(`${v.dates.check_in} ${v.dates.check_out}`)) dados.add(n);
  const grupo = [v.travellers.adults, v.travellers.children.length, ...v.travellers.children];
  for (const n of [...grupo, v.travellers.adults + v.travellers.children.length, m.dado.ways.ways.length])
    if (Number.isFinite(n)) dados.add(n);
  return dados;
}

export function puertaExplica(entrega: unknown, m: MaterialDeExplicar): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega))
    if (!LO_QUE_LLEVA.includes(campo) && campo !== DE_LAS_FECHAS) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "trip-explainer") rojo("seat", "la entrega no es del asiento que explica");
  if (entrega.language !== m.viaje.language)
    rojo("language", `no escribe en el idioma del viajero: ${m.viaje.language}`);
  for (const nombre of ["ways", "levers", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  const numeros = numerosDeLaCasa(m);
  /** Un texto para el viajero: con algo dicho, sin palabras prohibidas y sin números que no dio la casa. */
  const texto = (donde: string, v: unknown): void => {
    if (!esTexto(v)) return rojo(donde, "está en blanco");
    for (const pega of pegasDelTexto(v)) rojo(donde, pega);
    for (const n of numerosDeMas(v, numeros)) rojo(donde, `dice ${n}, que no está en lo que se le dio`);
  };

  // Cada manera, una vez, con su porqué, lo que gana y lo que pierde.
  const dadas = m.dado.ways.ways.map((w) => w.id);
  const escritas = new Set<string>();
  lista(entrega.ways).forEach((cruda, i) => {
    const donde = `ways[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.id)) return rojo(donde, "no dice de qué manera habla");
    if (!dadas.includes(cruda.id)) return rojo(donde, `${cruda.id} no es una manera de las que se le dieron`);
    if (escritas.has(cruda.id)) return rojo(donde, `la manera ${cruda.id} sale dos veces`);
    escritas.add(cruda.id);
    texto(`${donde}.why`, cruda.why);
    texto(`${donde}.gains`, cruda.gains);
    texto(`${donde}.loses`, cruda.loses);
  });
  for (const id of dadas) if (!escritas.has(id)) rojo("ways", `falta la manera ${id}`);

  // Cada palanca que se cuenta, una vez, con lo que cambia y lo que cuesta a cambio.
  const deLasDadas = m.dado.levers.map((l) => l.lever_row);
  const contadas = new Set<string>();
  lista(entrega.levers).forEach((cruda, i) => {
    const donde = `levers[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.lever_row)) return rojo(donde, "no dice de qué palanca habla");
    if (!deLasDadas.includes(cruda.lever_row)) return rojo(donde, `${cruda.lever_row} no es una palanca de las dadas`);
    if (contadas.has(cruda.lever_row)) return rojo(donde, `la palanca ${cruda.lever_row} sale dos veces`);
    contadas.add(cruda.lever_row);
    texto(`${donde}.what`, cruda.what);
    texto(`${donde}.in_exchange`, cruda.in_exchange);
  });
  for (const id of deLasDadas) if (!contadas.has(id)) rojo("levers", `falta la palanca ${id}`);

  // Lo que no se sabe, dicho.
  lista(entrega.unknowns).forEach((v, i) => texto(`unknowns[${i}]`, v));
  if (hayAlgoSinSaber(m.dado) && lista(entrega.unknowns).length === 0)
    rojo("unknowns", "hay cosas sin confirmar y no se le dicen al viajero");

  // Los avisos de las fechas, uno a uno, si se le dieron.
  for (const [donde, que] of pegasDeLasFechas(entrega[DE_LAS_FECHAS], m)) rojo(donde, que);

  // Los avisos de siempre, que pone la casa.
  // En el idioma del viajero si están escritos en él; si no, en inglés: nunca sin ellos.
  const deSiempre = avisosDe(m.viaje.language);
  if (!m.avisos.includes(deSiempre.ia)) rojo("avisos", "falta el aviso de que está hecho con IA");
  if (!m.avisos.includes(deSiempre.precios)) rojo("avisos", "falta el aviso de que los precios son orientativos");
  return { verde: rojos.length === 0, rojos };
}

/** Los números de una fecha o de varias: el año, el mes y el día de cada una. */
const deFechas = (...fechas: string[]): number[] =>
  fechas.filter((f) => ES_FECHA.test(f)).flatMap((f) => numerosDe(f.slice(0, 10)));

/** Los números de un hallazgo: los de sus fechas y sus días, los de su nombre, y su precio si lo tiene. */
function numerosDelHallazgo(h: HallazgoParaExplicar): number[] {
  const n = [...deFechas(h.from, h.to, ...h.trip_days), h.trip_days_count];
  if (h.name !== "unknown") n.push(...numerosDe(h.name));
  if (h.days_needed !== undefined)
    n.push(h.days_needed.asks, h.days_needed.trip_has, Math.abs(h.days_needed.asks - h.days_needed.trip_has));
  if (h.price !== "unknown") n.push(h.price.amount);
  return n;
}

/** Las palabras de un texto, tal como van escritas. */
const palabrasDe = (texto: string): string[] => texto.match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? [];

/**
 * Los nombres propios de una frase del calendario: las palabras con mayúscula que no abren una frase. El `what` del
 * asiento puede traer los que no son el nombre de su dato, y por ahí no se cuelan.
 */
function nombresEn(texto: string): string[] {
  const nombres: string[] = [];
  for (const frase of texto.split(/(?<=[.!?:;])\s+/)) {
    const palabras = palabrasDe(frase);
    palabras.forEach((p, i) => {
      if (i > 0 && /^\p{Lu}/u.test(p)) nombres.push(p);
    });
  }
  return nombres;
}

/** Los nombres de siempre, que puede decir cualquier frase: los meses y los días de la semana, el destino y su país. */
function nombresDeSiempre(m: MaterialDeExplicar): Set<string> {
  const dichos = new Set<string>();
  const idiomas = [...new Set(["en", m.viaje.language])];
  const suma = (texto: string | undefined): void => {
    for (const p of palabrasDe(texto ?? "")) dichos.add(p.toLowerCase());
  };
  for (const idioma of idiomas) {
    let regiones: Intl.DisplayNames | null = null;
    try {
      regiones = new Intl.DisplayNames([idioma], { type: "region" });
    } catch {
      regiones = null;
    }
    for (const pais of [m.viaje.destination.country, m.viaje.origin?.country])
      if (pais !== undefined && /^[A-Z]{2}$/.test(pais)) suma(regiones?.of(pais));
    for (let mes = 0; mes < 12; mes++)
      for (const forma of ["long", "short"] as const)
        suma(new Intl.DateTimeFormat(idioma, { month: forma, timeZone: "UTC" }).format(Date.UTC(2031, mes, 1)));
    for (let dia = 0; dia < 7; dia++)
      for (const forma of ["long", "short"] as const)
        suma(new Intl.DateTimeFormat(idioma, { weekday: forma, timeZone: "UTC" }).format(Date.UTC(2031, 0, 5 + dia)));
  }
  suma(m.viaje.destination.name);
  suma(m.viaje.origin?.name);
  return dichos;
}

/** Lo que va entre comillas en un texto: si es un nombre, es el de su dato. */
const ENTRE_COMILLAS = /[«“"]([^»”"]+)[»”"]/gu;

/**
 * Las pegas de los avisos de las fechas contados al viajero: una frase por hallazgo y una por ventana, ni más ni
 * menos, cada una como cualquier texto suyo, con los números de su dato y de las fechas del viaje, sin otro nombre
 * propio que el de su dato y sin abaratar lo que no trae precio. Si no se le dieron, no se dicen.
 */
function pegasDeLasFechas(crudo: unknown, m: MaterialDeExplicar): [string, string][] {
  const pegas: [string, string][] = [];
  const pega = (donde: string, que: string): void => void pegas.push([donde, que]);
  const dadas: FechasParaExplicar | undefined = m.dado.dates;
  if (dadas === undefined) {
    // Sin avisos de las fechas no hay nada que contar: como mucho, dos listas vacías.
    if (crudo === undefined) return pegas;
    const vacio = esObjeto(crudo) && lista(crudo.findings).length === 0 && lista(crudo.windows).length === 0;
    if (!vacio) pega(DE_LAS_FECHAS, "no se le dieron avisos de las fechas: no hay nada que contar");
    return pegas;
  }
  if (!esObjeto(crudo)) return [[DE_LAS_FECHAS, "falta, o no es un objeto con findings y windows"]];
  for (const campo of Object.keys(crudo))
    if (campo !== "findings" && campo !== "windows") pega(`${DE_LAS_FECHAS}.${campo}`, "no es de la entrega");
  for (const campo of ["findings", "windows"])
    if (!Array.isArray(crudo[campo])) pega(`${DE_LAS_FECHAS}.${campo}`, "falta, o no es una lista");

  const { trip } = dadas;
  const delViaje = [...deFechas(trip.check_in, trip.check_out), trip.days, trip.nights];
  const deSiempre = nombresDeSiempre(m);
  const nombre = (h: HallazgoParaExplicar | undefined): string | null =>
    h === undefined || h.name === "unknown" ? null : h.name;

  /** Una frase de las fechas: un texto del viajero, con sus números, sus nombres y sin abaratar sin precio. */
  const frase = (donde: string, v: unknown, de: HallazgoParaExplicar[], extra: number[], abarata: boolean): void => {
    if (!esTexto(v)) return pega(donde, "está en blanco");
    for (const p of pegasDelTexto(v, { sinNumerosLargos: true })) pega(donde, p);
    const numeros = new Set<number>([...delViaje, ...extra, ...de.flatMap(numerosDelHallazgo)]);
    for (const n of numerosDeMas(v, numeros)) pega(donde, `dice ${n}, que no está en los datos de este aviso`);
    if (!abarata && DE_ABARATAR.test(v)) pega(donde, "habla de más barato o de ahorrar, y sus datos no traen precio");
    const suyos = de.map(nombre).filter((x): x is string => x !== null);
    const permitidas = new Set([...deSiempre, ...suyos.flatMap(palabrasDe).map((p) => p.toLowerCase())]);
    // Un nombre del `what` que no es el del dato no pasa: el nombre propio que se dice es el que viene en el dato.
    const enLaFrase = new Set(palabrasDe(v));
    for (const otro of new Set(de.flatMap((h) => nombresEn(h.what))))
      if (enLaFrase.has(otro) && !permitidas.has(otro.toLowerCase()))
        pega(donde, `nombra «${otro}», que no es el nombre que viene en su dato`);
    for (const [, citado] of v.matchAll(ENTRE_COMILLAS))
      if (!suyos.some((s) => s.toLowerCase().includes(citado.trim().toLowerCase())))
        pega(donde, `pone entre comillas «${citado.trim()}», que no es el nombre que viene en su dato`);
    // El nombre de otro aviso no va en esta frase: cada una cuenta lo suyo.
    for (const h of dadas.findings) {
      const n = nombre(h);
      if (
        n !== null &&
        !de.includes(h) &&
        !suyos.some((s) => s.includes(n)) &&
        v.toLowerCase().includes(n.toLowerCase())
      )
        pega(donde, `nombra «${n}», que es de otro aviso`);
    }
  };

  // Una frase por hallazgo, una vez cada uno.
  const contados = new Set<number>();
  lista(crudo.findings).forEach((c, i) => {
    const donde = `${DE_LAS_FECHAS}.findings[${i}]`;
    if (!esObjeto(c) || !Number.isInteger(c.finding)) return pega(donde, "no dice de qué aviso habla");
    const h = dadas.findings.find((x) => x.finding === c.finding);
    if (h === undefined) return pega(donde, `el aviso ${c.finding} no es de los que se le dieron`);
    if (contados.has(h.finding)) return pega(donde, `el aviso ${h.finding} sale dos veces: una frase por aviso`);
    contados.add(h.finding);
    frase(`${donde}.says`, c.says, [h], [], h.price !== "unknown");
  });
  for (const h of dadas.findings)
    if (!contados.has(h.finding)) pega(`${DE_LAS_FECHAS}.findings`, `falta la frase del aviso ${h.finding}`);

  // Una frase por ventana: lo que gana y lo que pierde. Una ventana no trae precio: no abarata nada.
  const contadas = new Set<number>();
  lista(crudo.windows).forEach((c, i) => {
    const donde = `${DE_LAS_FECHAS}.windows[${i}]`;
    if (!esObjeto(c) || !Number.isInteger(c.window)) return pega(donde, "no dice de qué ventana habla");
    const w = dadas.windows.find((x) => x.window === c.window);
    if (w === undefined) return pega(donde, `la ventana ${c.window} no es de las que se le dieron`);
    if (contadas.has(w.window)) return pega(donde, `la ventana ${w.window} sale dos veces: una frase por ventana`);
    contadas.add(w.window);
    const citados = [...new Set([...w.avoids, ...w.reaches, ...w.loses, ...w.enters])];
    const de = dadas.findings.filter((h) => citados.includes(h.finding));
    const suyos = [...deFechas(w.check_in, w.check_out), Math.abs(w.shift_days)];
    frase(`${donde}.says`, c.says, de, suyos, false);
  });
  for (const w of dadas.windows)
    if (!contadas.has(w.window)) pega(`${DE_LAS_FECHAS}.windows`, `falta la frase de la ventana ${w.window}`);
  return pegas;
}
