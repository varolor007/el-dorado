// La puerta 6: ¿cada número sale de la tabla? Lo que el código comprueba, desde fuera, de lo que entrega el asiento
// que cruza. Mide cuentas y que las piezas casen: que cada número es el de la tabla del código, que cada manera es
// una fila entera (las mismas fechas y el mismo grupo), que la más barata y la mejor por lo que cuesta son las que
// marcó el código, que la distinta lleva su palanca, que cada palanca de la lista fija tiene su estado y que no hay
// más de dos rondas. No mide si había un viaje mejor sin probar: eso lo cubre que la lista de palancas sea fija.

import {
  PALANCAS,
  PALANCAS_DE_UNA_MANERA,
  PALANCAS_QUE_SE_CUENTAN,
  PETICIONES_POR_RONDA,
  RONDAS,
  SE_PUEDE_PEDIR,
} from "../data/palancas.ts";
import { ESTADOS_EN_EL_CRUCE, type Entendido, type FilaDelCruce, type Tabla } from "../scripts/formas.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe } from "./textos.ts";

export type MaterialDeCruce = { tabla: Tabla; viaje: Entendido };

const LO_QUE_LLEVA = ["seat", "levers", "ways", "tell", "checks", "requests", "unknowns"];
const ESTADOS_DE_UNA_MIRADA = ["ok", "problem", "unknown"];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Todos los números que hay en algo: los que son números y los que van dentro de un texto (una fecha, un nombre). */
export function numerosEn(algo: unknown, hallados: Set<number> = new Set()): Set<number> {
  if (typeof algo === "number" && Number.isFinite(algo)) {
    hallados.add(algo);
    hallados.add(Math.abs(algo));
  } else if (typeof algo === "string") for (const n of numerosDe(algo)) hallados.add(n);
  else if (Array.isArray(algo)) for (const x of algo) numerosEn(x, hallados);
  else if (esObjeto(algo)) for (const x of Object.values(algo)) numerosEn(x, hallados);
  return hallados;
}

export function puertaCruce(entrega: unknown, m: MaterialDeCruce): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };
  const t = m.tabla;

  // 1. La forma.
  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "trip-crosser") rojo("seat", "la entrega no es del asiento que cruza");
  for (const nombre of ["levers", "tell", "checks", "requests", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  const fila = new Map(t.rows.map((r) => [r.id, r]));
  const filaDePalanca = new Map(t.levers.map((l) => [l.id, l]));
  const numeros = numerosEn(t);
  /** Un texto del asiento no puede traer un número que no esté en la tabla. */
  const sinNumerosSuyos = (donde: string, texto: unknown): void => {
    if (typeof texto !== "string") return;
    for (const n of numerosDe(texto)) if (!numeros.has(n)) rojo(donde, `dice ${n}, que no está en la tabla`);
  };

  // 2. Las palancas: la lista fija, entera, cada una una vez y con su estado.
  const dichas = new Set<string>();
  lista(entrega.levers).forEach((cruda, i) => {
    const donde = `levers[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.lever)) return rojo(donde, "no dice de qué palanca habla");
    const palanca = PALANCAS.find((p) => p.id === cruda.lever);
    if (palanca === undefined) return rojo(donde, `${cruda.lever} no es una palanca de la lista`);
    if (dichas.has(palanca.id)) return rojo(donde, `la palanca ${palanca.id} sale dos veces`);
    dichas.add(palanca.id);
    const estado = cruda.status;
    if (!(esTexto(estado) && (ESTADOS_EN_EL_CRUCE as readonly string[]).includes(estado)))
      return rojo(donde, "su estado no es de su lista");
    if (!esTexto(cruda.reason)) rojo(donde, "no dice su motivo");
    sinNumerosSuyos(donde, cruda.reason);
    const enLaTabla = t.levers.filter((l) => l.lever === palanca.id);
    const filas = lista(cruda.rows);
    if (!Array.isArray(cruda.rows)) rojo(donde, "sus filas no son una lista");
    if (estado === "tested") {
      if (filas.length === 0) rojo(donde, "dice que la probó y no nombra ninguna fila de la tabla");
      for (const f of filas) {
        const l = typeof f === "string" ? filaDePalanca.get(f) : undefined;
        if (l === undefined) rojo(donde, `nombra la fila ${String(f)}, que no es una palanca de la tabla`);
        else if (l.lever !== palanca.id) rojo(donde, `la fila ${l.id} es de otra palanca: ${l.lever}`);
      }
    } else if (filas.length > 0) rojo(donde, "nombra filas y no dice que la probó");
    if (estado === "not_available" && enLaTabla.length > 0)
      rojo(donde, "dice que no se puede probar y la tabla la trae probada");
    if (estado === "tested" && enLaTabla.length === 0) rojo(donde, "dice que la probó y la tabla no la trae");
  });
  for (const p of PALANCAS) if (!dichas.has(p.id)) rojo("levers", `falta la palanca ${p.id}: la lista es fija`);

  // 3. Las tres maneras: cada una, una fila entera de la tabla, con su total copiado.
  const maneras = esObjeto(entrega.ways) ? entrega.ways : {};
  if (!esObjeto(entrega.ways)) rojo("ways", "no trae las maneras");
  const filaDe = (donde: string, v: unknown): FilaDelCruce | null => {
    if (!esObjeto(v) || !esTexto(v.row)) return (rojo(donde, "no dice qué fila es"), null);
    const r = fila.get(v.row);
    if (r === undefined) return (rojo(donde, `la fila ${v.row} no está en la tabla`), null);
    if (r.discarded !== "") rojo(donde, `la fila ${r.id} está descartada: ${r.discarded}`);
    if (v.total !== r.total) rojo(donde, `su total es ${String(v.total)} y el de la tabla es ${r.total}`);
    if (r.check_in !== m.viaje.dates.check_in || r.check_out !== m.viaje.dates.check_out)
      rojo(donde, "la fila no es de las fechas del viaje");
    if (r.adults !== m.viaje.travellers.adults || r.children !== m.viaje.travellers.children.length)
      rojo(donde, "la fila no es del grupo del viaje");
    return r;
  };
  const usadas: string[] = [];
  for (const marca of ["cheapest", "best_value"] as const) {
    const marcada = t.rows.find((r) => r.marks.includes(marca));
    const v = maneras[marca];
    if (marcada === undefined) {
      if (v !== "none") rojo(`ways.${marca}`, "la tabla no marca ninguna fila así: la manera tiene que ser «none»");
      continue;
    }
    const r = filaDe(`ways.${marca}`, v);
    if (r === null) continue;
    usadas.push(r.id);
    if (r.id !== marcada.id) rojo(`ways.${marca}`, `es la fila ${r.id} y el código marcó la ${marcada.id}`);
    if (marca === "cheapest" && !(typeof r.score === "number" && r.score >= t.minimum_score))
      rojo("ways.cheapest", "la más barata no pasa de la nota mínima");
  }
  const distinta = maneras.different;
  if (distinta !== "none") {
    const r = filaDe("ways.different", distinta);
    if (r !== null && esObjeto(distinta)) {
      if (usadas.includes(r.id)) rojo("ways.different", "es la misma fila que otra manera: no es distinta");
      if (!esTexto(distinta.lever) || !PALANCAS_DE_UNA_MANERA.includes(distinta.lever))
        rojo("ways.different", "no lleva una palanca que cambie una fila por otra");
      else if (distinta.lever === "other_zone") {
        const partida = t.rows.find((x) => x.marks.includes("best_value")) ?? t.rows.find((x) => usadas.includes(x.id));
        if (partida !== undefined && partida.zone === r.zone)
          rojo("ways.different", "dice que es otra zona y está en la misma que la de partida");
      }
      if (!esTexto(distinta.why)) rojo("ways.different", "no dice qué cambia");
      sinNumerosSuyos("ways.different", distinta.why);
    }
  }

  // 4. Lo que se le cuenta al viajero: palancas con precio, que ahorran, con su número copiado.
  const contadas = lista(entrega.tell);
  if (contadas.length > PALANCAS_QUE_SE_CUENTAN)
    rojo("tell", `cuenta ${contadas.length} palancas y el tope es ${PALANCAS_QUE_SE_CUENTAN}`);
  const yaContadas = new Set<string>();
  contadas.forEach((cruda, i) => {
    const donde = `tell[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.lever_row)) return rojo(donde, "no dice qué palanca cuenta");
    const l = filaDePalanca.get(cruda.lever_row);
    if (l === undefined) return rojo(donde, `la palanca ${cruda.lever_row} no está en la tabla`);
    if (yaContadas.has(l.id)) rojo(donde, `cuenta dos veces la palanca ${l.id}`);
    yaContadas.add(l.id);
    if (l.status !== "priced" || typeof l.saves !== "number")
      return rojo(donde, "cuenta una palanca que no tiene precio");
    if (!(l.saves > 0)) rojo(donde, "cuenta una palanca que no ahorra");
    if (cruda.saves !== l.saves) rojo(donde, `dice que ahorra ${String(cruda.saves)} y la tabla dice ${l.saves}`);
    const cambiada = typeof l.change.row === "string" ? fila.get(l.change.row) : undefined;
    if (cambiada !== undefined && cambiada.discarded !== "") rojo(donde, "cuenta un cambio a una fila descartada");
    if (!esTexto(cruda.why)) rojo(donde, "no dice por qué merece la pena contarla");
    sinNumerosSuyos(donde, cruda.why);
  });

  // 5. Lo que la tabla no ve, mirado.
  lista(entrega.checks).forEach((cruda, i) => {
    const donde = `checks[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.what)) return rojo(donde, "no dice qué miró");
    if (!esTexto(cruda.status) || !ESTADOS_DE_UNA_MIRADA.includes(cruda.status))
      rojo(donde, "su estado no es de su lista");
    if (!Array.isArray(cruda.refs)) rojo(donde, "no dice a qué filas se refiere, aunque sea a ninguna");
    for (const ref of lista(cruda.refs))
      if (typeof ref !== "string" || !(fila.has(ref) || filaDePalanca.has(ref)))
        rojo(donde, `cita ${String(ref)}, que no está en la tabla`);
    sinNumerosSuyos(donde, cruda.what);
  });

  // 6. Las rondas: dos como mucho, y peticiones solo en la primera, de las que el código sabe contestar.
  const peticiones = lista(entrega.requests);
  if (t.round >= RONDAS && peticiones.length > 0)
    rojo("requests", `pide más en la ronda ${t.round}: son ${RONDAS} como mucho`);
  if (peticiones.length > PETICIONES_POR_RONDA)
    rojo("requests", `hace ${peticiones.length} peticiones y el tope es ${PETICIONES_POR_RONDA}`);
  peticiones.forEach((cruda, i) => {
    const donde = `requests[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.lever)) return rojo(donde, "no dice qué palanca pide");
    const r = typeof cruda.row === "string" ? fila.get(cruda.row) : undefined;
    if (r === undefined) rojo(donde, "no dice para qué fila de la tabla");
    else if (r.discarded !== "") rojo(donde, "pide un precio para una fila descartada");
    if (cruda.lever === "shift_dates") {
      if (!SE_PUEDE_PEDIR.shift_dates.includes(cruda.days as number))
        rojo(donde, "los días que mueve no son de su lista");
    } else if (cruda.lever === "nights") {
      if (!SE_PUEDE_PEDIR.nights.includes(cruda.nights as number))
        rojo(donde, "las noches que cambia no son de su lista");
    } else rojo(donde, `${cruda.lever} no es algo que el código sepa pedir`);
  });

  if (!lista(entrega.unknowns).every(esTexto)) rojo("unknowns", "cada cosa que no se sabe va en una frase");
  if (distinta === "none" && lista(entrega.unknowns).length === 0)
    rojo("unknowns", "no hay manera distinta y no dice por qué");
  return { verde: rojos.length === 0, rojos };
}
