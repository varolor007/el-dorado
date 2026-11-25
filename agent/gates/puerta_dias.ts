// La puerta 9: ¿cada día cabe? Tiene dos mitades. La primera mira lo que entrega el asiento que elige los sitios:
// que cada uno existe en los datos, que ninguno sale dos veces ni se queda sin veredicto, y que lo que escribe para
// el viajero no promete. La segunda mira los días que reparte el código: que cada parada está en los datos, que lo
// imprescindible está dentro o dice por qué no, que las horas de cada día caben y que ningún salto pasa del tope.
// No mide si la elección es buena: eso lo ve el viajero, que quita, añade y mueve.

import { DIA_ENTERO, IMPRESCINDIBLES_POR_NOCHE, MINUTOS_DE_VISITA, RESERVAR } from "../data/dias.ts";
import { TRAYECTO_DE_UN_DIA } from "../data/moverse.ts";
import type { Dia, Parada } from "../output/viaje.ts";
import { MOMENTOS_DEL_DIA } from "../scripts/formas.ts";
import { caminosDe, trayectoEntre, type TablaDeCaminos } from "../tools/caminos.ts";
import { trayecto } from "../tools/distancias.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe, numerosDeMas, pegasDelTexto } from "./textos.ts";

/**
 * Lo que tuvo delante el asiento: los sitios que se le dieron a elegir, las noches del viaje y lo que se le dijo de
 * cada sitio (su nombre y lo que cuenta su artículo), que es de donde puede sacar un número. Con un mensaje del
 * viajero (8.6), lo que había quitado, que no vuelve solo, y los números que puede decir al explicar lo que cambió:
 * los de sus días.
 */
export type MaterialDeSitios = {
  sitios: string[];
  noches: number;
  dicho?: Record<string, string>;
  mensaje?: { quitadas: string[]; numeros: number[] };
};

const LO_QUE_LLEVA = ["seat", "go", "skip", "missing", "unknowns"];
/** Con un mensaje del viajero, la entrega lleva además lo que cambió y por qué, para él. */
const CON_UN_MENSAJE = [...LO_QUE_LLEVA, "changed"];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function puertaSitios(entrega: unknown, m: MaterialDeSitios): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  const lleva = m.mensaje === undefined ? LO_QUE_LLEVA : CON_UN_MENSAJE;
  for (const campo of lleva) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!lleva.includes(campo)) rojo(campo, "no es de la entrega");
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
    else {
      for (const pega of pegasDelTexto(cruda.why, { sinNumerosLargos: true })) rojo(donde, pega);
      // Un número del porqué sale de lo que se le dijo de ese sitio, o es lo que lleva la visita: ni una hora ni un
      // precio de memoria.
      const dados = new Set(numerosDe(m.dicho?.[cruda.id] ?? ""));
      if (typeof cruda.minutes === "number") dados.add(cruda.minutes);
      for (const n of numerosDeMas(cruda.why, dados))
        rojo(donde, `dice ${n}, que no está en lo que se le dio de ese sitio`);
    }
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

  // Con un mensaje: lo que el viajero quitó no vuelve solo, y lo que cambió se le explica con palabras que pasan la
  // puerta de palabras, sin un número que no sea de sus días ni de lo que lleva una visita.
  if (m.mensaje !== undefined) {
    const vuelven = lista(entrega.go).flatMap((g) =>
      esObjeto(g) && m.mensaje?.quitadas.includes(g.id as string) ? [g.id] : [],
    );
    for (const id of vuelven) rojo("go", `el sitio ${String(id)} lo quitó el viajero: no vuelve solo`);
    if (!esTexto(entrega.changed)) rojo("changed", "no dice qué ha cambiado y por qué");
    else {
      for (const pega of pegasDelTexto(entrega.changed, { sinNumerosLargos: true })) rojo("changed", pega);
      const dados = new Set(m.mensaje.numeros);
      for (const g of lista(entrega.go)) if (esObjeto(g) && typeof g.minutes === "number") dados.add(g.minutes);
      for (const n of numerosDeMas(entrega.changed, dados)) rojo("changed", `dice ${n}, que no sale de tus días`);
    }
  }
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
  /** La tabla de caminos con la que se repartieron, si la hay: la puerta mide cada trayecto con ella. */
  caminos?: TablaDeCaminos | null;
};

/** Por qué un día no cabe, por su clave: sus horas no caben en un día entero, o un salto no cabe en un día. */
export type NoCabe = "hours" | "jump";

/** Un trayecto de un día, de su parada `j` a la siguiente: lo que dice el día, lo que tiene el camino y su tiempo. */
export type Salto = { j: number; metros: number; delCamino: number; minutos: number };

/**
 * Las cuentas de la puerta 9 para un día: lo que suman sus visitas y sus trayectos, cada trayecto con la manera que
 * tenga sentido (con la tabla de caminos, lo que dijo la fuente entre esas dos paradas; sin ella, la cuenta de la
 * casa) y por qué no cabe, si no cabe. Las mismas para el día que reparte el código y para el que dejan tus
 * elecciones: así un día tuyo pasa las mismas cuentas que la puerta.
 */
export function cuentasDeUnDia(
  dia: Pick<Dia, "paradas" | "metros">,
  porId: ReadonlyMap<string, Parada>,
  c: ReturnType<typeof caminosDe>,
): { minutos: number; saltos: Salto[]; noCabe: NoCabe[] } {
  let minutos = 0;
  for (const id of dia.paradas) minutos += porId.get(id)?.minutos ?? 0;
  const saltos = dia.metros.map((metros, j): Salto => {
    const de = porId.get(dia.paradas[j])?.punto;
    const a = porId.get(dia.paradas[j + 1])?.punto;
    const ir = c !== undefined && de !== undefined && a !== undefined ? trayectoEntre(de, a, c) : trayecto(metros);
    minutos += ir.minutos;
    return { j, metros, delCamino: ir.metros, minutos: ir.minutos };
  });
  const noCabe: NoCabe[] = [];
  if (minutos > DIA_ENTERO) noCabe.push("hours");
  if (saltos.some((x) => !(x.metros >= 0) || x.minutos > TRAYECTO_DE_UN_DIA)) noCabe.push("jump");
  return { minutos, saltos, noCabe };
}

/** Los porqués que valen para dejar fuera algo imprescindible: no los pone el viajero, los mide el código. */
const NO_CABE = ["far", "full"];

export function puertaDias(r: Repartido): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  const dados = new Set(r.sitios);
  const porId = new Map(r.paradas.map((p) => [p.id, p]));
  const c = caminosDe(r.caminos);

  for (const p of r.paradas) {
    const donde = `paradas.${p.id}`;
    if (!dados.has(p.id)) rojo(donde, "no está en los datos");
    if (!(Math.abs(p.punto.lat) <= 90 && Math.abs(p.punto.lon) <= 180)) rojo(donde, "no tiene su sitio en el mapa");
    if (p.origen.fuente.trim() === "" || Number.isNaN(Date.parse(p.origen.visto))) rojo(donde, "no dice su fuente");
  }

  const puestas: string[] = [];
  r.dias.forEach((dia, i) => {
    const donde = `dias[${i}]`;
    for (const id of dia.paradas) {
      if (!porId.has(id)) rojo(donde, `lleva la parada ${id}, que no existe`);
      if (puestas.includes(id)) rojo(donde, `la parada ${id} ya está en otro día`);
      puestas.push(id);
    }
    // Cada trayecto, con la manera que tenga sentido: andando si se anda, y si no, con lo que haya que coger.
    const { minutos, saltos } = cuentasDeUnDia(dia, porId, c);
    for (const { j, metros, delCamino, minutos: tarda } of saltos) {
      if (c !== undefined && delCamino !== metros)
        rojo(donde, `de la parada ${j + 1} a la ${j + 2} dice ${metros} m, y el camino tiene ${delCamino}`);
      if (!(metros >= 0) || tarda > TRAYECTO_DE_UN_DIA)
        rojo(donde, `de la parada ${j + 1} a la ${j + 2} hay ${metros} m: ese trayecto no cabe dentro de un día`);
    }
    if (dia.metros.length !== Math.max(0, dia.paradas.length - 1))
      rojo(donde, "no dice lo que se anda entre sus paradas");
    if (minutos > DIA_ENTERO)
      rojo(donde, `sus visitas y sus trayectos suman ${minutos} minutos, y caben ${DIA_ENTERO}`);
  });

  for (const p of r.paradas) {
    if (!puestas.includes(p.id) && !r.fuera.includes(p.id)) rojo(`paradas.${p.id}`, "ni está en un día ni está fuera");
    // Lo imprescindible está dentro, o dice por qué no: queda lejos de todo lo demás o los días están llenos.
    if (p.imprescindible && !puestas.includes(p.id) && !NO_CABE.includes(r.porQue[p.id] ?? ""))
      rojo(`paradas.${p.id}`, "es imprescindible, no está en ningún día y no dice por qué");
  }
  return { verde: rojos.length === 0, rojos };
}
