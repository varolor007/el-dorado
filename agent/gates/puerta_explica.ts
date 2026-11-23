// La puerta 7: ¿sin promesas y con su aviso? Lo que el código comprueba, desde fuera, de lo que escribe el asiento
// que explica. Mide de dónde sale cada cosa: que cada número del texto está en lo que se le dio, que ninguna palabra
// es de la lista prohibida (las promesas y las de dentro), que cada manera tiene su línea de lo que gana y de lo que
// pierde, que lo que no se sabe está dicho, y que lo que se entrega lleva el aviso de IA y el de los precios. No
// mide si el texto engaña sin números: eso lo cubre un revisor que no lo escribió.

import { AVISOS } from "../data/palabras.ts";
import type { ParaExplicar } from "../scripts/explica.ts";
import type { Entendido } from "../scripts/formas.ts";
import { numerosEn } from "./puerta_cruce.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe, pegasDelTexto } from "./textos.ts";

/** Lo que tuvo delante el asiento, y los avisos que la casa pone en lo que se entrega. */
export type MaterialDeExplicar = { viaje: Entendido; dado: ParaExplicar; avisos: string[] };

const LO_QUE_LLEVA = ["seat", "language", "ways", "levers", "unknowns"];

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

export function puertaExplica(entrega: unknown, m: MaterialDeExplicar): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "trip-explainer") rojo("seat", "la entrega no es del asiento que explica");
  if (entrega.language !== m.viaje.language)
    rojo("language", `no escribe en el idioma del viajero: ${m.viaje.language}`);
  for (const nombre of ["ways", "levers", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  const numeros = numerosEn([m.dado.ways, m.dado.levers, m.viaje]);
  /** Un texto para el viajero: con algo dicho, sin palabras prohibidas y sin números que no se le dieron. */
  const texto = (donde: string, v: unknown): void => {
    if (!esTexto(v)) return rojo(donde, "está en blanco");
    for (const pega of pegasDelTexto(v)) rojo(donde, pega);
    for (const n of numerosDe(v)) if (!numeros.has(n)) rojo(donde, `dice ${n}, que no está en lo que se le dio`);
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

  // Los avisos de siempre, que pone la casa.
  const deSiempre = AVISOS[m.viaje.language];
  if (deSiempre === undefined) rojo("avisos", `no hay avisos escritos en ${m.viaje.language}`);
  else {
    if (!m.avisos.includes(deSiempre.ia)) rojo("avisos", "falta el aviso de que está hecho con IA");
    if (!m.avisos.includes(deSiempre.precios)) rojo("avisos", "falta el aviso de que los precios son orientativos");
  }
  return { verde: rojos.length === 0, rojos };
}
