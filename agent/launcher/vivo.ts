// Lo que la casa cuenta en vivo de una investigación: qué ha pasado, dónde y cuánto, con su hora. Solo datos: la
// frase la monta la web, en el idioma de quien mira.
//
// No se cuenta al dar cada paso, sino mirando lo que ya hay en la carpeta del run: lo que el disco dice que ha pasado
// y aún no está contado, se cuenta. Así un corte no deja nada sin contar ni lo cuenta dos veces, y lo contado queda
// guardado, en su orden, para pintarlo en vivo o volver a enseñarlo.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONDUCTOR, REINTENTOS } from "../data/conductor.ts";
import { RONDAS } from "../data/palancas.ts";
import { PARADO } from "../data/pasos.ts";
import { MANERAS, type Punto, type Suceso } from "../output/viaje.ts";
import { sucesosDeLasCapas } from "../scripts/monta_viaje.ts";

/** El archivo del run donde queda lo contado: una línea por suceso, y solo crece. */
export const VIVO = "vivo.jsonl";

/** Cuántos puntos de alojamientos descartados se pintan como mucho en el mapa. */
const PUNTOS = 300;

type Pasado = Omit<Suceso, "t">;
type Sitio = { lat: number; lon: number };
type Objeto = Record<string, unknown>;

function leer(run: string, nombre: string): Objeto | null {
  try {
    const dato: unknown = JSON.parse(readFileSync(join(run, nombre), "utf8"));
    return typeof dato === "object" && dato !== null ? (dato as Objeto) : null;
  } catch {
    return null;
  }
}

const lista = (v: unknown): Objeto[] =>
  Array.isArray(v) ? v.filter((x): x is Objeto => typeof x === "object" && x !== null) : [];
const texto = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const enElMapa = (p: Sitio): boolean =>
  Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
const punto = (v: unknown): Punto | undefined => {
  const p = v as Sitio | null | undefined;
  return p !== null && p !== undefined && enElMapa(p) ? { lat: p.lat, lon: p.lon } : undefined;
};
const puntos = (v: unknown): Punto[] =>
  lista(v)
    .map(punto)
    .filter((p): p is Punto => p !== undefined);

/** Lo que el run tiene ya en su carpeta, dicho como sucesos y en el orden en que pasa. Sin horas. */
export function loQueHaPasado(run: string): Pasado[] {
  const pasado: Pasado[] = [];

  // La ruta: cada zona donde se va a buscar.
  for (const z of lista(leer(run, "ruta.json")?.zonas)) {
    const centro = punto(z.centre);
    if (centro !== undefined)
      pasado.push({
        clase: "zone",
        ref: texto(z.id),
        punto: centro,
        radio: Number(z.radius_m) || undefined,
        nombre: texto(z.label) ?? texto(z.name),
      });
  }

  // La búsqueda: lo que hay, lo que pasa los mínimos, lo que tiene precio y los finalistas.
  const b = leer(run, "busqueda.json")?.busqueda as Objeto | undefined;
  const finalistas = new Map<string, { punto?: Punto; nombre?: string }>();
  if (b !== undefined) {
    pasado.push({ clase: "lodgings_found", n: Number(b.devueltos) || 0, puntos: puntos(b.fuera).slice(0, PUNTOS) });
    pasado.push({ clase: "lodgings_pass", n: lista(b.dentro).length, puntos: puntos(b.dentro) });
    pasado.push({ clase: "lodgings_priced", n: lista(b.conPrecio).length });
    for (const f of lista(b.finalistas)) {
      const a = f.alojamiento as Objeto | undefined;
      const id = texto(a?.id);
      if (id === undefined) continue;
      finalistas.set(id, { punto: punto(a), nombre: texto(a?.nombre) });
      pasado.push({ clase: "finalist", ref: id, ...finalistas.get(id) });
    }
  }

  // Mirar: a quién se está mirando y a quién se ha mirado ya.
  const mirando = new Set(
    lista(leer(run, "mirar.json")?.quienes)
      .map((q) => texto(q.alojamiento))
      .filter((id): id is string => id !== undefined),
  );
  for (const id of mirando) pasado.push({ clase: "looking", ref: id, ...finalistas.get(id) });
  for (const a of lista(leer(run, "como_es.json")?.alojamientos)) {
    const id = texto(a.alojamiento);
    const mirado = lista(a.pasadas).some(
      (p) => (p.metodo as Objeto | undefined)?.verde === true && (p.comoEs as Objeto | undefined)?.verde === true,
    );
    if (id !== undefined && mirado) pasado.push({ clase: "looked", ref: id, ...finalistas.get(id) });
  }

  // Los días: los sitios elegidos y cada día con paradas.
  const dias = leer(run, "dias.json");
  if (dias !== null) {
    const paradas = lista(dias.paradas);
    if (paradas.length > 0) pasado.push({ clase: "sights_found", n: paradas.length });
    for (const p of paradas)
      pasado.push({ clase: "sight", ref: texto(p.id), punto: punto(p.punto), nombre: texto(p.nombre) });
    lista((dias.reparto as Objeto | undefined)?.dias).forEach((dia, i) => {
      if (Array.isArray(dia.paradas) && dia.paradas.length > 0)
        pasado.push({ clase: "day", n: i + 1, nombre: texto(dia.titulo) });
    });
  }

  // Las capas del destino (14.6), cuando su paso las deja: cuántas cosas trae cada una. Una que falta no cuenta nada.
  pasado.push(...loQueTraenLasCapas(run));

  // El cruce, cuando se cierra: las maneras de hacerlo.
  for (let ronda = 1; ronda <= RONDAS; ronda++) {
    const cruce = leer(run, `cruce-${ronda}.json`)?.entrega as Objeto | undefined;
    if (cruce === undefined) break;
    if (ronda < RONDAS && Array.isArray(cruce.requests) && cruce.requests.length > 0) continue;
    const maneras = (cruce.ways ?? {}) as Objeto;
    for (const id of MANERAS)
      if (typeof maneras[id] === "object" && maneras[id] !== null) pasado.push({ clase: "way", ref: id });
    break;
  }

  // El viaje, ya montado: los cambios que ahorran, y el final.
  const viaje = leer(run, "viaje.json");
  if (viaje !== null) {
    for (const p of lista(viaje.palancas)) pasado.push({ clase: "lever", ref: texto(p.id) });
    pasado.push({ clase: "done" });
  }

  // El conductor: que mira una parada y, si ya eligió, si da una vuelta más o lo cuenta.
  const conductor = leer(run, CONDUCTOR);
  if (conductor !== null) {
    pasado.push({ clase: "conductor", ref: "looking" });
    if (conductor.estado === "retry" || conductor.estado === "told")
      pasado.push({ clase: "conductor", ref: conductor.estado });
  }

  // Cada vez que el viajero pidió otra vuelta: de qué paso, y cuál de sus pulsaciones es. Nunca el asiento.
  const reintentos = lista(leerLista(run, REINTENTOS));
  for (const r of reintentos) pasado.push({ clase: "retry", ref: texto(r.en), n: Number(r.n) || undefined });

  // Si el run está parado, se dice dónde. El porqué es para quien lo lleva: no viaja en lo que se cuenta. Una parada
  // tras una vuelta pedida por el viajero es otra, aunque sea en el mismo paso: lleva cuántas se pidieron.
  // Mientras la vuelta pedida no ha empezado, la parada sigue siendo la de antes.
  const ultimo = reintentos.at(-1);
  const trabajados = new Set(lista(leerLista(run, "trabajos.json")).map((t) => texto(t.puesto)));
  const pendiente =
    ultimo !== undefined &&
    (typeof ultimo.puesto === "string" ? !trabajados.has(ultimo.puesto) : ultimo.aplicado !== true);
  const pedidas = reintentos.length - (pendiente ? 1 : 0);
  const parado = existsSync(join(run, PARADO)) ? leer(run, PARADO) : null;
  if (parado !== null && viaje === null)
    pasado.push({ clase: "stopped", ref: texto(parado.en), ...(pedidas > 0 ? { n: pedidas } : {}) });
  return pasado;
}

/** Lo que cuentan las capas del destino, por los archivos que deja cada una: la cuenta es la de lo grabado. */
function loQueTraenLasCapas(run: string): Pasado[] {
  const capa = (nombre: string) => leer(run, nombre) ?? undefined;
  const capas = { moverse: capa("moverse.json"), saber: capa("saber.json"), entradas: capa("entradas.json") };
  return sucesosDeLasCapas(capas as Parameters<typeof sucesosDeLasCapas>[0]);
}

function leerLista(run: string, nombre: string): unknown[] {
  try {
    const dato: unknown = JSON.parse(readFileSync(join(run, nombre), "utf8"));
    return Array.isArray(dato) ? dato : [];
  } catch {
    return [];
  }
}

/** Por qué se reconoce un suceso ya contado: su clase y a qué se refiere. Lo demás puede cambiar sin ser otro. */
const CON_SU_NUMERO = new Set<string>(["day", "retry", "stopped"]);
const clave = (s: Pasado): string => `${s.clase}|${s.ref ?? ""}|${CON_SU_NUMERO.has(s.clase) ? (s.n ?? "") : ""}`;

/** Lo contado de un run, en su orden, desde el suceso número `desde`. Una línea cortada a medias no cuenta. */
export function leerVivo(run: string, desde = 0): Suceso[] {
  const ruta = join(run, VIVO);
  if (!existsSync(ruta)) return [];
  const sucesos: Suceso[] = [];
  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    if (linea.trim() === "") continue;
    try {
      sucesos.push(JSON.parse(linea) as Suceso);
    } catch {
      // Una escritura cortada: se salta.
    }
  }
  return sucesos.slice(Math.max(0, desde));
}

/**
 * Cuenta lo que haya pasado en el run y aún no esté contado, con la hora a la que se cuenta, y devuelve lo nuevo.
 * `t` son los milisegundos desde el primer suceso del run. Si el run deja de estar parado y sigue, lo que venga
 * después se cuenta igual; que estuvo parado, queda contado.
 */
export function contar(run: string, cuando: Date = new Date()): Suceso[] {
  const contados = leerVivo(run);
  const ya = new Set(contados.map(clave));
  const inicio = (contados[0] as (Suceso & { cuando?: string }) | undefined)?.cuando;
  const cero = inicio === undefined ? cuando.getTime() : Date.parse(inicio);
  // El tiempo no vuelve atrás: un reloj movido no desordena lo contado.
  const t = Math.max(cuando.getTime() - cero, contados.at(-1)?.t ?? 0);
  const nuevos: Suceso[] = [];
  for (const s of loQueHaPasado(run)) {
    if (ya.has(clave(s))) continue;
    ya.add(clave(s));
    nuevos.push({ t, ...s });
  }
  if (nuevos.length > 0) {
    const lineas = nuevos.map((s) => JSON.stringify({ ...s, cuando: cuando.toISOString() })).join("\n");
    appendFileSync(join(run, VIVO), lineas + "\n", { mode: 0o600 });
  }
  return nuevos;
}
