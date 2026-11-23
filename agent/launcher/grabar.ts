// Graba un viaje de muestra para la web, con lo que ya está en la mesa: la búsqueda, lo que entregó el que mira cada
// alojamiento y unos sitios que ver elegidos a mano (`muestra.json`). Lo deja en `<mesa>/grabado/`, que es de donde
// lo lee la web en seco. No llama a ninguna IA. Con `--palancas`, pide a la fuente el precio de las mismas noches
// corridas un día, para que las palancas lleven números de verdad.
//
//   node agent/launcher/grabar.ts <carpeta del run> <muestra.json> [--palancas]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { comprobarSucesos, comprobarViaje, type Palanca, type Parada } from "../output/viaje.ts";
import type { Busqueda } from "../scripts/busqueda_alojamiento.ts";
import { montarViaje, palancaDeFechas, sucesosDe, type Decidido, type Mirado } from "../scripts/monta_viaje.ts";
import { liteapi } from "../tools/fuentes/liteapi.ts";
import type { Estancia } from "../tools/fuentes/tipos.ts";
import { argumentos } from "./buscar.ts";
import { carpetaDeLaMesa } from "./mesa.ts";
import type { Recogido } from "./mirar.ts";

/** Lo que se decide a mano en un viaje de muestra, hasta que lo decida el agente. */
export type Muestra = Omit<Decidido, "mirados" | "palancas"> & { paradas: Parada[] };

function corrida(e: Estancia, dias: number): Estancia {
  const mueve = (f: string): string => {
    const d = new Date(f + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  return { ...e, entrada: mueve(e.entrada), salida: mueve(e.salida) };
}

const dia = (f: string): string => String(Number(f.slice(8, 10)));

/** Las palancas de fechas del alojamiento de la manera del medio, con el precio de verdad de las noches corridas. */
async function palancasDeFechas(b: Busqueda, id: string, ahora: number): Promise<Palanca[]> {
  const palancas: Palanca[] = [];
  for (const [clase, dias, que] of [
    ["day_before", -1, "Ir un día antes"],
    ["day_after", 1, "Ir un día después"],
  ] as const) {
    const e = corrida(b.estancia, dias);
    const [precio] = await liteapi.precios([id], e);
    const movido = precio === undefined ? null : precio.total + precio.tasasAparte;
    console.log(`${que.toLowerCase()} (${e.entrada} a ${e.salida}): ${movido ?? "sin precio"}; ahora, ${ahora}`);
    const p = palancaDeFechas(
      clase,
      clase,
      ahora,
      movido,
      b.estancia.moneda,
      que,
      `Las mismas noches, del ${dia(e.entrada)} al ${dia(e.salida)}, en el mismo alojamiento.`,
    );
    if (p !== null) palancas.push(p);
  }
  return palancas;
}

async function principal(): Promise<number> {
  const [run, rutaDeMuestra] = process.argv.slice(2);
  const a = argumentos(process.argv.slice(4));
  if (run === undefined || rutaDeMuestra === undefined) {
    console.error("Uso: grabar.ts <carpeta del run> <muestra.json> [--palancas]");
    return 2;
  }
  const leer = <T>(ruta: string): T => JSON.parse(readFileSync(ruta, "utf8")) as T;
  const { busqueda } = leer<{ busqueda: Busqueda }>(join(run, "busqueda.json"));
  const recogido = leer<Recogido>(join(run, "como_es.json"));
  const muestra = leer<Muestra>(rutaDeMuestra);

  const mirados: Record<string, Mirado> = {};
  for (const m of recogido.alojamientos)
    mirados[m.alojamiento] = m.pasadas.find((p) => p.entrega !== null)?.entrega ?? null;

  let palancas: Palanca[] = [];
  const delMedio = muestra.maneras.find((m) => m.id === "best_value") ?? muestra.maneras[0];
  const ficha = busqueda.finalistas.find((f) => f.alojamiento.id === delMedio?.alojamiento);
  if (a.palancas !== undefined && ficha !== undefined) {
    palancas = await palancasDeFechas(busqueda, ficha.alojamiento.id, ficha.precioCompleto);
  }

  // La palanca de cambiar de alojamiento: lo que ahorra la manera más barata frente a la del medio.
  const barata = muestra.maneras.find((m) => m.id === "cheapest");
  const fichaBarata = busqueda.finalistas.find((f) => f.alojamiento.id === barata?.alojamiento);
  if (barata !== undefined && fichaBarata !== undefined && ficha !== undefined && barata !== delMedio) {
    const otra = palancaDeFechas(
      "other_lodging",
      "other_lodging",
      ficha.precioCompleto,
      fichaBarata.precioCompleto,
      busqueda.estancia.moneda,
      `Dormir en ${fichaBarata.alojamiento.nombre}`,
      barata.pierde,
    );
    if (otra !== null) palancas.push(otra);
  }

  const viaje = montarViaje(busqueda, { ...muestra, mirados, palancas });
  const sucesos = sucesosDe(busqueda, viaje);
  const pegas = [...comprobarViaje(viaje), ...comprobarSucesos(sucesos)];
  for (const p of pegas) console.log(`pega en ${p.donde}: ${p.que}`);

  const carpeta = join(carpetaDeLaMesa(), "grabado");
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, "viaje.json"), JSON.stringify(viaje));
  writeFileSync(join(carpeta, "sucesos.json"), JSON.stringify(sucesos));
  const paradas = viaje.dias.map((d) => d.paradas.length).join(", ");
  console.log(`${viaje.destino.nombre}: ${viaje.alojamientos.length} alojamientos, ${viaje.paradas.length} paradas`);
  console.log(`días con ${paradas} paradas; fuera, ${viaje.fuera.length}; ${viaje.palancas.length} palancas`);
  console.log(`${sucesos.length} sucesos; grabado en ${resolve(carpeta)}`);
  return pegas.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(`no se pudo grabar: ${(e as Error).message}`);
      process.exit(2);
    },
  );
}
