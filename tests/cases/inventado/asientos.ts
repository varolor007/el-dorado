// Los asientos de mentira y las fuentes inventadas con que se prueba una investigación entera: lo que entregaría
// cada asiento si trabajara bien, escrito en su puesto como lo dejaría uno de verdad. Sin internet y sin gastar.

import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENTREGA, PASOS } from "../../../agent/gates/puerta_metodo.ts";
import type { Fuentes } from "../../../agent/launcher/investigar.ts";
import { puestosDe } from "../../../agent/launcher/puesto.ts";
import type { Foto } from "../../../agent/output/viaje.ts";
import type { ParaExplicar } from "../../../agent/scripts/explica.ts";
import type { Entendido, Tabla } from "../../../agent/scripts/formas.ts";
import type { FuenteAlojamiento } from "../../../agent/tools/fuentes/tipos.ts";
import { ALOJAMIENTOS, fuenteInventada } from "./inventado.ts";
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

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const FOTO: Foto = { url: "https://fotos.invalid/faro.jpg", autor: "Ana", licencia: "CC BY 4.0", pagina: null };

export function fuentesInventadas(): Fuentes {
  return {
    alojamiento: fuenteDeDosBarrios(),
    sitios: async () => SITIOS,
    resumenes: async () => new Map([["Q1", "It guides ships into the bay."]]),
    fotos: async (archivos) => new Map(archivos.map((a) => [a, FOTO])),
    vuelos: async (_viaje, ida, vuelta) => [vueloInventado(ida, vuelta)],
    bajarFotos: { traer: async () => JPEG, segura: () => true, encoger: async (b) => b },
  };
}

export type Objeto = Record<string, any>;
export const leerJson = (ruta: string): Objeto => JSON.parse(readFileSync(ruta, "utf8"));

/** Lo que entregaría el que mira, hecho a la medida del material de su puesto para que pase la puerta 5. */
function miradoPara(puesto: string): Objeto {
  const hoja = leerJson(join(puesto, "in", "sheet.json"));
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
function entregaDe(asiento: string, puesto: string): Objeto {
  const dado = (nombre: string): any => leerJson(join(puesto, "in", nombre));
  if (asiento === "route-planner") return entregaDeRuta();
  if (asiento === "lodging-viewer") return miradoPara(puesto);
  if (asiento === "sights-picker") return entregaDeSitios();
  if (asiento === "trip-crosser") return entregaDeCruce(dado("table.json") as Tabla);
  const paraExplicar: ParaExplicar = {
    ways: dado("ways.json"),
    levers: dado("levers.json"),
    checks: dado("checks.json"),
  };
  return entregaDeExplicar(paraExplicar);
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
  const piezas = readdirSync(join(puesto.carpeta, "in"));
  const textos: Record<string, string> = {
    "1-acknowledgement.md": `I received ${piezas.join(", ")}.`,
    "2-plan.md": "Read everything, then decide.",
    "3-notes.md": `- What the material says. [in/${piezas[0]}] [seen]`,
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify(entrega),
  };
  for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
}

/** Un run nuevo, en una carpeta temporal, con lo entendido del viaje inventado o el que se le dé. */
export function runNuevo(entendido: Entendido = ENTENDIDO): string {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-viaje-"));
  writeFileSync(join(run, "entendido.json"), JSON.stringify(entendido));
  return run;
}
