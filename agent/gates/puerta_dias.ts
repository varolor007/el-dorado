// La puerta 9: ¿cada día cabe? Tiene dos mitades. La primera mira lo que entrega el asiento que elige los sitios:
// que cada uno existe en los datos, que ninguno sale dos veces ni se queda sin veredicto, y que lo que escribe para
// el viajero no promete. La segunda mira los días que reparte el código: que cada parada está en los datos, que lo
// imprescindible está dentro o dice por qué no, que las horas de cada día caben y que ningún salto pasa del tope.
// No mide si la elección es buena: eso lo ve el viajero, que quita, añade y mueve.

import { DIA_ENTERO, IMPRESCINDIBLES_POR_NOCHE, MINUTOS_DE_VISITA, RESERVAR, SALTO_MAXIMO } from "../data/dias.ts";
import type { Dia, Parada } from "../output/viaje.ts";
import { MOMENTOS_DEL_DIA } from "../scripts/formas.ts";
import { minutosAndando } from "../tools/distancias.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { pegasDelTexto } from "./textos.ts";

/** Lo que tuvo delante el asiento: los sitios que se le dieron a elegir y las noches del viaje. */
export type MaterialDeSitios = { sitios: string[]; noches: number };

const LO_QUE_LLEVA = ["seat", "go", "skip", "missing", "unknowns"];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function puertaSitios(entrega: unknown, m: MaterialDeSitios): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "sights-picker") rojo("seat", "la entrega no es del asiento que elige los sitios");
  for (const nombre of ["go", "skip", "missing", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  // Cada sitio existe en los datos y tiene un veredicto, y solo uno.
  const dados = new Set(m.sitios);
  const vistos = new Set<string>();
  const veredicto = (donde: string, cruda: unknown): Objeto | null => {
    if (!esObjeto(cruda) || !esTexto(cruda.id)) return (rojo(donde, "no dice de qué sitio habla"), null);
    if (!dados.has(cruda.id)) return (rojo(donde, `elige ${cruda.id}, que no está en los datos`), null);
    if (vistos.has(cruda.id)) return (rojo(donde, `el sitio ${cruda.id} sale dos veces`), null);
    vistos.add(cruda.id);
    if (!esTexto(cruda.why)) rojo(donde, "no dice por qué");
    else for (const pega of pegasDelTexto(cruda.why)) rojo(donde, pega);
    return cruda;
  };

  let imprescindibles = 0;
  lista(entrega.go).forEach((cruda, i) => {
    const donde = `go[${i}]`;
    const v = veredicto(donde, cruda);
    if (v === null) return;
    if (!(typeof v.minutes === "number" && MINUTOS_DE_VISITA.includes(v.minutes)))
      rojo(donde, "lo que lleva la visita no es de su lista");
    if (!(esTexto(v.best_time) && (MOMENTOS_DEL_DIA as readonly string[]).includes(v.best_time)))
      rojo(donde, "la hora que conviene no es de su lista");
    if (!(esTexto(v.book_ahead) && RESERVAR.includes(v.book_ahead)))
      rojo(donde, "si hay que reservar no es de su lista");
    if (typeof v.must !== "boolean") rojo(donde, "no dice si es imprescindible");
    else if (v.must) imprescindibles++;
  });
  lista(entrega.skip).forEach((cruda, i) => void veredicto(`skip[${i}]`, cruda));
  for (const id of m.sitios) if (!vistos.has(id)) rojo("go", `el sitio ${id} se queda sin veredicto`);
  if (lista(entrega.go).length === 0) rojo("go", "no elige ningún sitio: no hay viaje que repartir");
  const tope = IMPRESCINDIBLES_POR_NOCHE * m.noches;
  if (imprescindibles > tope) rojo("go", `marca ${imprescindibles} imprescindibles y el tope es ${tope}`);

  lista(entrega.missing).forEach((cruda, i) => {
    if (!esObjeto(cruda) || !esTexto(cruda.what) || !esTexto(cruda.why))
      rojo(`missing[${i}]`, "no dice qué echa en falta o por qué");
  });
  if (!lista(entrega.unknowns).every(esTexto)) rojo("unknowns", "cada cosa que no se sabe va en una frase");
  return { verde: rojos.length === 0, rojos };
}

/**
 * Los días que repartió el código, con las paradas que salieron del asiento, los sitios de los datos y por qué se
 * queda fuera lo que se queda fuera.
 */
export type Repartido = {
  paradas: Parada[];
  dias: Dia[];
  fuera: string[];
  porQue: Record<string, string>;
  sitios: string[];
};

/** Los porqués que valen para dejar fuera algo imprescindible: no los pone el viajero, los mide el código. */
const NO_CABE = ["far", "full"];

export function puertaDias(r: Repartido): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const dados = new Set(r.sitios);
  const porId = new Map(r.paradas.map((p) => [p.id, p]));

  for (const p of r.paradas) {
    const donde = `paradas.${p.id}`;
    if (!dados.has(p.id)) rojo(donde, "no está en los datos");
    if (!(Math.abs(p.punto.lat) <= 90 && Math.abs(p.punto.lon) <= 180)) rojo(donde, "no tiene su sitio en el mapa");
    if (p.origen.fuente.trim() === "" || Number.isNaN(Date.parse(p.origen.visto))) rojo(donde, "no dice su fuente");
  }

  const puestas: string[] = [];
  r.dias.forEach((dia, i) => {
    const donde = `dias[${i}]`;
    let minutos = 0;
    for (const id of dia.paradas) {
      const p = porId.get(id);
      if (p === undefined) rojo(donde, `lleva la parada ${id}, que no existe`);
      else minutos += p.minutos;
      if (puestas.includes(id)) rojo(donde, `la parada ${id} ya está en otro día`);
      puestas.push(id);
    }
    dia.metros.forEach((metros, j) => {
      minutos += minutosAndando(metros);
      if (metros > SALTO_MAXIMO)
        rojo(donde, `de la parada ${j + 1} a la ${j + 2} hay ${metros} m andando, y el tope es ${SALTO_MAXIMO}`);
    });
    if (dia.metros.length !== Math.max(0, dia.paradas.length - 1))
      rojo(donde, "no dice lo que se anda entre sus paradas");
    if (minutos > DIA_ENTERO)
      rojo(donde, `sus visitas y lo que se anda suman ${minutos} minutos, y caben ${DIA_ENTERO}`);
  });

  for (const p of r.paradas) {
    if (!puestas.includes(p.id) && !r.fuera.includes(p.id)) rojo(`paradas.${p.id}`, "ni está en un día ni está fuera");
    // Lo imprescindible está dentro, o dice por qué no: queda lejos de todo lo demás o los días están llenos.
    if (p.imprescindible && !puestas.includes(p.id) && !NO_CABE.includes(r.porQue[p.id] ?? ""))
      rojo(`paradas.${p.id}`, "es imprescindible, no está en ningún día y no dice por qué");
  }
  return { verde: rojos.length === 0, rojos };
}
