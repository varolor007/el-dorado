// Los asientos de mentira y las fuentes inventadas con que se prueba una investigación entera: lo que entregaría
// cada asiento si trabajara bien, escrito en su puesto como lo dejaría uno de verdad. Sin internet y sin gastar.

import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ENTREGA, PASOS } from "../../../agent/gates/puerta_metodo.ts";
import type { Gasto, Lanzador } from "../../../agent/launcher/asiento.ts";
import type { Pensar, Respuesta } from "../../../agent/launcher/ia.ts";
import type { Fuentes } from "../../../agent/launcher/investigar.ts";
import { puestosDe } from "../../../agent/launcher/puesto.ts";
import type { Foto } from "../../../agent/output/viaje.ts";
import type { ParaExplicar } from "../../../agent/scripts/explica.ts";
import type { Entendido, Tabla } from "../../../agent/scripts/formas.ts";
import type { DiaBarato, FuenteAlojamiento } from "../../../agent/tools/fuentes/tipos.ts";
import { ALOJAMIENTOS, fuenteInventada, VISTO } from "./inventado.ts";
import {
  ENTENDIDO,
  entregaDeCruce,
  entregaDeExplicar,
  entregaDeRuta,
  entregaDeSitios,
  SITIOS,
  vueloInventado,
} from "./investigacion.ts";

/** La fuente inventada, con los alojamientos repartidos en los dos barrios: los tres primeros, en el viejo. */
export function fuenteDeDosBarrios(): FuenteAlojamiento {
  const fuente = fuenteInventada();
  return {
    ...fuente,
    async lista() {
      return ALOJAMIENTOS.map((a, i) => {
        const cerca = i < 3 ? SITIOS[1].punto : SITIOS[0].punto;
        return { ...a, lat: cerca.lat + 0.0003 * i, lon: cerca.lon };
      });
    },
  };
}

/** Los días baratos para volar de un mes inventado: el 2 es el más barato y el 6, el más caro. */
export function diasBaratosInventados(mes: string): DiaBarato[] {
  const dia = (n: string, precio: number): DiaBarato => ({
    fuente: "inventada",
    visto: VISTO,
    dia: `${mes}-${n}`,
    precio,
    moneda: "EUR",
  });
  return [dia("05", 100), dia("02", 90), dia("06", 160)];
}

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const FOTO: Foto = { url: "https://fotos.invalid/faro.jpg", autor: "Ana", licencia: "CC BY 4.0", pagina: null };

export function fuentesInventadas(): Fuentes {
  return {
    alojamiento: fuenteDeDosBarrios(),
    sitios: async () => SITIOS,
    resumenes: async () => new Map([["Q1", "It guides ships into the bay."]]),
    fotos: async (archivos) => new Map(archivos.map((a) => [a, FOTO])),
    vuelos: async (_viaje, ida, vuelta) => [vueloInventado(ida, vuelta)],
    diasBaratos: async (_viaje, mes) => diasBaratosInventados(mes),
    bajarFotos: { traer: async () => JPEG, segura: () => true, encoger: async (b) => b },
  };
}

export type Objeto = Record<string, any>;
export const leerJson = (ruta: string): Objeto => JSON.parse(readFileSync(ruta, "utf8"));

/** Lo que entregaría el que mira, hecho a la medida del material de su puesto para que pase la puerta 5. */
function miradoPara(hoja: Objeto): Objeto {
  const foto = (ref: string, what: string) => ({ kind: "photo", ref, what });
  const conMetros = typeof hoja.room === "object" && hoja.room.size_m2 !== "unknown";
  // El más barato de todos tiene un gimnasio simbólico: el viajero lo marcó como imprescindible.
  const gimnasio = hoja.lodging_id === "a1" ? "token" : "full";
  return {
    seat: "lodging-viewer",
    lodging_id: hoja.lodging_id,
    room_id: typeof hoja.room === "object" ? hoja.room.id : "unknown",
    photos: [
      { file: "room-01.jpg", shows: "room", seen: ["a double bed", "one window onto a street"] },
      { file: "hotel-01.jpg", shows: "gym", seen: ["treadmills, free weights and a rack"] },
      { file: "hotel-02.jpg", shows: "pool", seen: ["an outdoor pool with eight loungers"] },
    ],
    fields: {
      look: { level: "good_condition", evidence: [foto("room-01.jpg", "nothing worn")], note: "" },
      upkeep: { level: "well_kept", evidence: [{ kind: "review", ref: "r1", what: "a clean room" }], note: "" },
      style: { level: "chain", evidence: [foto("room-01.jpg", "standard furniture")], note: "" },
      room_space: {
        level: "fits",
        evidence: [
          ...(conMetros ? [{ kind: "sheet", ref: "room.size_m2", what: "the sheet gives the size" }] : []),
          foto("room-01.jpg", "the bed and a way around it"),
        ],
        note: "",
      },
      room_light: { level: "average", evidence: [foto("room-01.jpg", "one ordinary window")], note: "" },
      bathroom: { level: "unknown", evidence: [], note: "no photo of the bathroom" },
      view: { level: "street", evidence: [foto("room-01.jpg", "the window looks onto a street")], note: "" },
      gym: { level: gimnasio, evidence: [foto("hotel-01.jpg", "the machines of the gym")], note: "" },
      pool: { level: "bathe", evidence: [foto("hotel-02.jpg", "an outdoor pool")], note: "" },
    },
    review_themes: [{ theme: "cleanliness", tone: "good", mentions: "several", says: "a clean room", refs: ["r1"] }],
    conflicts: [],
    warnings: [],
    serious: [],
    unknowns: ["No photo shows the bathroom of this room."],
    summary_good: "A room in good condition with a gym in the building.",
    summary_bad: "unknown",
  };
}

/** Lo que entregaría cada asiento, según cuál sea y lo que tenga en su puesto. */
export function entregaCon(asiento: string, dado: (nombre: string) => any): Objeto {
  if (asiento === "route-planner") return entregaDeRuta();
  if (asiento === "lodging-viewer") return miradoPara(dado("sheet.json"));
  if (asiento === "sights-picker") return entregaDeSitios();
  if (asiento === "trip-crosser") return entregaDeCruce(dado("table.json") as Tabla);
  const paraExplicar: ParaExplicar = {
    ways: dado("ways.json"),
    levers: dado("levers.json"),
    checks: dado("checks.json"),
  };
  return entregaDeExplicar(paraExplicar);
}

function entregaDe(asiento: string, puesto: string): Objeto {
  return entregaCon(asiento, (nombre) => leerJson(join(puesto, "in", nombre)));
}

/** Los seis textos de un asiento aplicado, por el nombre de su archivo, con la entrega que se le diga. */
export function seisPasos(piezas: string[], entrega: Objeto): Record<string, string> {
  return {
    "1-acknowledgement.md": `I received ${piezas.join(", ")}.`,
    "2-plan.md": "Read everything, then decide.",
    "3-notes.md": `- What the material says. [in/${piezas[0]}] [seen]`,
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify(entrega),
  };
}

/** Un asiento de mentira trabaja en su puesto: deja sus seis archivos, en su orden, con la entrega que se le diga. */
export function trabaja(
  run: string,
  id: string,
  estropea: (asiento: string, entrega: Objeto) => void = () => {},
): void {
  const puesto = puestosDe(run).find((p) => p.id === id);
  if (puesto === undefined) throw new Error(`no existe el puesto ${id}`);
  const entrega = entregaDe(puesto.asiento, puesto.carpeta);
  estropea(puesto.asiento, entrega);
  const textos = seisPasos(readdirSync(join(puesto.carpeta, "in")), entrega);
  for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
}

/** Un run nuevo, en una carpeta temporal, con lo entendido del viaje inventado o el que se le dé. */
export function runNuevo(entendido: Entendido = ENTENDIDO): string {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-viaje-"));
  writeFileSync(join(run, "entendido.json"), JSON.stringify(entendido));
  return run;
}

/** Lo que dice haber gastado un asiento de mentira. */
export const GASTO: Gasto = { turnos: 3, entrada: 1000, salida: 200, usd: 0.05 };
const runDe = (carpetaDelPuesto: string): string => resolve(carpetaDelPuesto, "..", "..");

export type DeMentira = {
  /** Lo que dice haber gastado cada asiento; `undefined` es no decir nada. */
  gasto?: unknown;
  /** Lo que le pasa a un asiento en vez de trabajar bien. */
  falla?: (asiento: string, puesto: string) => "rompe" | "rompe y lo dice" | "calla" | "cuelga" | null;
};

/** Un lanzador de mentira: cada asiento deja en su puesto lo que entregaría, y dice lo que gastó. */
export function lanzadorDeMentira(
  o: DeMentira = {},
): Lanzador & { ordenes: string[]; cortados: string[]; aLaVez: number } {
  let trabajando = 0;
  const lanzador = (async (orden, puesto, corte) => {
    lanzador.ordenes.push(orden);
    lanzador.aLaVez = Math.max(lanzador.aLaVez, ++trabajando);
    try {
      await new Promise((r) => setImmediate(r));
      const falla = o.falla?.(puesto.asiento, puesto.id) ?? null;
      if (falla === "rompe") throw new Error("la IA no contestó");
      // Un lanzador de verdad dice con su error lo que gastó hasta fallar.
      if (falla === "rompe y lo dice") throw Object.assign(new Error("la IA se cortó a medias"), { gasto: GASTO });
      if (falla === "cuelga")
        await new Promise<void>((r) =>
          corte?.addEventListener("abort", () => (lanzador.cortados.push(puesto.id), r())),
        );
      if (falla === null) trabaja(runDe(puesto.carpeta), puesto.id);
      return "gasto" in o ? (o.gasto as Gasto) : GASTO;
    } finally {
      trabajando--;
    }
  }) as Lanzador & { ordenes: string[]; cortados: string[]; aLaVez: number };
  lanzador.ordenes = [];
  lanzador.cortados = [];
  lanzador.aLaVez = 0;
  return lanzador;
}

/** Lo que cuenta una IA de mentira de cada llamada: para mirar qué se le mandó. */
export type Llamada = { asiento: string; archivos: string[]; fotos: number; contrato: string };

/**
 * Una IA de mentira para la llamada directa. Solo ve lo que se le manda, como la de verdad: saca de ahí qué asiento
 * es y su material, y contesta los seis pasos de un asiento aplicado, cada uno bajo su marca. No toca ningún disco.
 */
export function pensarDeMentira(
  o: { fin?: Respuesta["fin"]; estropea?: (texto: string, asiento: string) => string } = {},
): Pensar & {
  llamadas: Llamada[];
} {
  const pensar = (async (p) => {
    const asiento = /\| `seat` \| Always `"([a-z-]+)"` \|/.exec(p.contrato)?.[1] ?? "";
    const archivos = new Map<string, string>();
    for (const parte of p.partes) {
      if (!("texto" in parte)) continue;
      const suyo =
        /^\[\[file ([0-9a-f]+) in\/(\S+)\]\]( \(a photo, shown next\))?(?:\n([\s\S]*)\n\[\[end \1\]\])?$/.exec(
          parte.texto,
        );
      if (suyo !== null) archivos.set(suyo[2], suyo[4] ?? "");
    }
    const fotos = p.partes.filter((x) => "foto" in x).length;
    pensar.llamadas.push({ asiento, archivos: [...archivos.keys()], fotos, contrato: p.contrato });
    const entrega = entregaCon(asiento, (nombre) => JSON.parse(archivos.get(nombre) ?? "null"));
    // Lo que hay en lo alto de `in/`, como lo vería quien abre la carpeta.
    const arriba = [...new Set([...archivos.keys()].map((ruta) => ruta.split("/")[0]))];
    const pasos = seisPasos(arriba, entrega);
    const texto = [...PASOS, ENTREGA].map((nombre) => `=== ${nombre} ===\n${pasos[nombre]}`).join("\n\n");
    return { texto: o.estropea?.(texto, asiento) ?? texto, fin: o.fin ?? "end", entrada: 12_000, salida: 3_000 };
  }) as Pensar & { llamadas: Llamada[] };
  pensar.llamadas = [];
  return pensar;
}
