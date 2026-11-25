// Prepara y recoge al asiento que mira el alojamiento, sobre una búsqueda ya guardada en la mesa.
//
//   node agent/launcher/mirar.ts preparar <busqueda.json> [--pasadas 2]
//   node agent/launcher/mirar.ts recoger <carpeta del run>
//
// «preparar» baja las fotos de cada finalista y le monta un puesto por pasada, a ciegas. «recoger» pasa la puerta de
// todos y la puerta 5 sobre lo que entregó cada puesto y compara las pasadas. Entre una y otra alguien tiene que
// lanzar los asientos: este archivo no llama a ninguna IA y no gasta.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { puertaComoEs, type Material } from "../gates/puerta_como_es.ts";
import type { Rojo } from "../gates/puerta_busqueda.ts";
import { acuerdo, type Acuerdo } from "../scripts/acuerdo.ts";
import type { Busqueda } from "../scripts/busqueda_alojamiento.ts";
import { hojaDeDatos, opinionesParaMirar } from "../scripts/para_mirar.ts";
import { bajarFotos, elegirFotos, type Opciones as OpcionesDeFotos } from "../tools/fotos.ts";
import { ordenDeApertura, recogerAsiento } from "./asiento.ts";
import { argumentos } from "./buscar.ts";
import { montarPuesto, puestosDe, type Pieza, type Puesto } from "./puesto.ts";

const ASIENTO = "lodging-viewer";

/** De quién es cada puesto. Se guarda fuera de los puestos: el asiento no sabe qué alojamiento mira. */
export type Quien = { puesto: string; alojamiento: string; nombre: string; pasada: number };
export type Preparado = { puestos: Puesto[]; quienes: Quien[]; avisos: string[] };

export async function prepararMirar(
  b: Busqueda,
  run: string,
  o: { pasadas?: number; fotos?: OpcionesDeFotos; solo?: string[] } = {},
): Promise<Preparado> {
  const puestos: Puesto[] = [];
  const quienes: Quien[] = [];
  const avisos: string[] = [];
  const montados = puestosDe(run);
  for (const [i, ficha] of b.finalistas.entries()) {
    // Con `solo`, a los demás no se les monta puesto: se quedan sin mirar (8.2, los candidatos nuevos que no caben).
    if (o.solo !== undefined && !o.solo.includes(ficha.alojamiento.id)) continue;
    const clave = `a${i + 1}`;
    const pasadas = Array.from({ length: o.pasadas ?? 1 }, (_, n) => n + 1);
    const quien = (puesto: string, pasada: number): Quien => ({
      puesto,
      alojamiento: ficha.alojamiento.id,
      nombre: ficha.alojamiento.nombre,
      pasada,
    });
    // Si la casa se cortó a medio preparar, lo que ya quedó montado y sellado vale: no se baja ni se monta otra vez.
    const yaEstan = pasadas.map((n) => montados.find((p) => p.id === `${clave}-p${n}`));
    if (yaEstan.every((p) => p !== undefined)) {
      yaEstan.forEach((p, n) => {
        puestos.push(p!);
        quienes.push(quien(p!.id, pasadas[n]));
      });
      continue;
    }
    const elegidas = elegirFotos(ficha.habitacion?.fotos ?? [], ficha.detalle?.fotos ?? []);
    const { bajadas, fallos } = await bajarFotos(elegidas.pedidas, join(run, "fotos", clave), o.fotos);
    if (fallos.length > 0) avisos.push(`${clave}: ${fallos.length} fotos no se pudieron bajar`);
    // La ficha de datos cuenta las fotos que de verdad llegan al puesto, no las que se pidieron.
    const deHabitacion = bajadas.filter((x) => x.ruta.startsWith("photos/room-")).length;
    elegidas.habitacion.dadas = deHabitacion;
    elegidas.hotel.dadas = bajadas.length - deHabitacion;
    const piezas: Pieza[] = [
      { ruta: "sheet.json", contenido: JSON.stringify(hojaDeDatos(ficha, b.estancia, elegidas), null, 2) },
      { ruta: "reviews.json", contenido: JSON.stringify(opinionesParaMirar(ficha.opiniones), null, 2) },
      ...bajadas.map((x) => ({ ruta: x.archivo, copiaDe: join(run, "fotos", clave, x.archivo) })),
    ];
    for (const pasada of pasadas) {
      const puesto = yaEstan[pasada - 1] ?? montarPuesto(run, `${clave}-p${pasada}`, ASIENTO, piezas);
      puestos.push(puesto);
      quienes.push(quien(puesto.id, pasada));
    }
  }
  writeFileSync(join(run, ".mirar.json.a-medias"), JSON.stringify({ quienes, avisos }, null, 2));
  renameSync(join(run, ".mirar.json.a-medias"), join(run, "mirar.json"));
  mkdirSync(join(run, "ordenes"), { recursive: true });
  for (const p of puestos) writeFileSync(join(run, "ordenes", `${p.id}.txt`), ordenDeApertura());
  return { puestos, quienes, avisos };
}

/** Lo que tuvo delante el asiento de un puesto, leído de su material. */
export function materialDe(puesto: string): Material {
  const leer = (nombre: string): unknown => JSON.parse(readFileSync(join(puesto, "in", nombre), "utf8"));
  const fotos = join(puesto, "in", "photos");
  return {
    hoja: leer("sheet.json") as Record<string, unknown>,
    fotos: existsSync(fotos) ? readdirSync(fotos).sort() : [],
    opiniones: (leer("reviews.json") as { ref: string }[]).map((o) => o.ref),
  };
}

export type Pasada = {
  puesto: string;
  pasada: number;
  metodo: { verde: boolean; rojos: Rojo[] };
  comoEs: { verde: boolean; rojos: Rojo[] };
  entrega: Record<string, unknown> | null;
};
export type Mirado = { alojamiento: string; nombre: string; pasadas: Pasada[]; acuerdo: Acuerdo | null };
export type Recogido = { verde: boolean; alojamientos: Mirado[] };

export function recogerMirar(run: string): Recogido {
  const { quienes } = JSON.parse(readFileSync(join(run, "mirar.json"), "utf8")) as { quienes: Quien[] };
  const puestos = puestosDe(run);
  const alojamientos: Mirado[] = [];
  for (const q of quienes) {
    const puesto = puestos.find((p) => p.id === q.puesto);
    if (puesto === undefined) throw new Error(`falta el puesto ${q.puesto}`);
    const metodo = recogerAsiento(puesto);
    const comoEs =
      metodo.entrega === null
        ? { verde: false, rojos: [{ donde: "delivery", que: "no hay entrega que mirar" }] }
        : puertaComoEs(metodo.entrega, materialDe(puesto.carpeta));
    let mirado = alojamientos.find((a) => a.alojamiento === q.alojamiento);
    if (mirado === undefined) {
      mirado = { alojamiento: q.alojamiento, nombre: q.nombre, pasadas: [], acuerdo: null };
      alojamientos.push(mirado);
    }
    mirado.pasadas.push({
      puesto: q.puesto,
      pasada: q.pasada,
      metodo: { verde: metodo.verde, rojos: metodo.rojos },
      comoEs,
      entrega: metodo.entrega,
    });
  }
  for (const a of alojamientos) {
    const [una, otra] = a.pasadas.filter((p) => p.entrega !== null);
    if (una !== undefined && otra !== undefined) a.acuerdo = acuerdo(una.entrega, otra.entrega);
  }
  const verde = alojamientos.every((a) => a.pasadas.every((p) => p.metodo.verde && p.comoEs.verde));
  const recogido: Recogido = { verde, alojamientos };
  writeFileSync(join(run, "como_es.json"), JSON.stringify(recogido, null, 2));
  return recogido;
}

async function principal(): Promise<number> {
  const [orden, donde] = process.argv.slice(2);
  const a = argumentos(process.argv.slice(4));
  if (orden === "preparar" && donde !== undefined) {
    const guardado = JSON.parse(readFileSync(donde, "utf8")) as { busqueda: Busqueda };
    const run = dirname(resolve(donde));
    const p = await prepararMirar(guardado.busqueda, run, { pasadas: Number(a.pasadas ?? 1) });
    console.log(`${p.puestos.length} puestos montados en ${join(run, "puestos")}`);
    console.log(`La orden que abre cada uno, en ${join(run, "ordenes")}`);
    for (const aviso of p.avisos) console.log(`Aviso: ${aviso}`);
    return 0;
  }
  if (orden === "recoger" && donde !== undefined) {
    const r = recogerMirar(resolve(donde));
    for (const m of r.alojamientos) {
      console.log(`\n${m.nombre}`);
      for (const p of m.pasadas) {
        const rojos = [...p.metodo.rojos, ...p.comoEs.rojos];
        const color = (verde: boolean): string => (verde ? "verde" : "ROJA");
        console.log(`  ${p.puesto}: la de todos, ${color(p.metodo.verde)}; la 5, ${color(p.comoEs.verde)}`);
        for (const rojo of rojos) console.log(`    ${rojo.donde}: ${rojo.que}`);
      }
      if (m.acuerdo !== null) {
        console.log(`  Las dos pasadas coinciden en ${m.acuerdo.iguales} de ${m.acuerdo.de} campos`);
        for (const c of m.acuerdo.campos.filter((x) => x.parecido !== "igual" && x.parecido !== "ninguno sabe"))
          console.log(`    ${c.campo}: ${c.a} y ${c.b} (${c.parecido})`);
      }
    }
    console.log(`\nGuardado en ${join(resolve(donde), "como_es.json")}`);
    return r.verde ? 0 : 1;
  }
  console.error("Uso: mirar.ts preparar <busqueda.json> [--pasadas 2]  o  mirar.ts recoger <carpeta del run>");
  return 2;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(2);
    },
  );
}
