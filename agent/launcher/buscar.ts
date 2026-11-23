// Lanza una búsqueda desde la terminal y deja lo que saca en la mesa, fuera del repositorio.
//
//   node agent/launcher/buscar.ts --pais <país del destino> --lat <latitud> --lon <longitud> \
//     --entrada AAAA-MM-DD --salida AAAA-MM-DD --moneda <tres letras> --nacionalidad <país del pasaporte> \
//     [--lugar "<zona, ciudad>"] [--origen <aeropuerto> --destino <aeropuerto> --mercado <país de salida>]
//
// Detrás de un proxy, con NODE_USE_ENV_PROXY=1 delante. No usa IA: solo las fuentes de datos.

import { puertaBusqueda } from "../gates/puerta_busqueda.ts";
import { anadirOfertas, buscarAlojamiento } from "../scripts/busqueda_alojamiento.ts";
import { diasBaratos, vuelosPorFechas, type Trayecto } from "../tools/fuentes/aviasales.ts";
import { encendida } from "../tools/fuentes/enchufes.ts";
import { liteapi } from "../tools/fuentes/liteapi.ts";
import { ofertasDeZona } from "../tools/fuentes/parallel.ts";
import type { DiaBarato, Estancia, Minimos, Vuelo } from "../tools/fuentes/tipos.ts";
import { guardarRun } from "./mesa.ts";

export function argumentos(crudos: string[]): Record<string, string> {
  const salida: Record<string, string> = {};
  for (let i = 0; i < crudos.length; i++) {
    if (!crudos[i].startsWith("--")) continue;
    const siguiente = crudos[i + 1];
    salida[crudos[i].slice(2)] = siguiente === undefined || siguiente.startsWith("--") ? "si" : crudos[++i];
  }
  return salida;
}

function numero(a: Record<string, string>, nombre: string, porDefecto?: number): number {
  const v = a[nombre] === undefined ? porDefecto : Number(a[nombre]);
  if (v === undefined || Number.isNaN(v)) throw new Error(`falta --${nombre}, o no es un número`);
  return v;
}

function fecha(a: Record<string, string>, nombre: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a[nombre] ?? "")) throw new Error(`falta --${nombre}, en AAAA-MM-DD`);
  return a[nombre];
}

/** Lo que es del viajero (su moneda, su pasaporte, el país del que sale) se dice: no se supone ninguno. */
function dosLetras(a: Record<string, string>, nombre: string): string {
  if (!/^[A-Za-z]{2}$/.test(a[nombre] ?? "")) throw new Error(`falta --${nombre}, un país en dos letras`);
  return a[nombre].toUpperCase();
}

function tresLetras(a: Record<string, string>, nombre: string): string {
  if (!/^[A-Za-z]{3}$/.test(a[nombre] ?? "")) throw new Error(`falta --${nombre}, una moneda en tres letras`);
  return a[nombre].toUpperCase();
}

function noches(e: Estancia): number {
  return Math.round((Date.parse(e.salida) - Date.parse(e.entrada)) / 86_400_000);
}

async function principal(): Promise<number> {
  const a = argumentos(process.argv.slice(2));
  if (!/^[A-Za-z]{2}$/.test(a.pais ?? "")) throw new Error("falta --pais, en dos letras");
  const estancia: Estancia = {
    lat: numero(a, "lat"),
    lon: numero(a, "lon"),
    radio: numero(a, "radio", 1500),
    entrada: fecha(a, "entrada"),
    salida: fecha(a, "salida"),
    adultos: numero(a, "adultos", 2),
    ninos: (a.ninos ?? "")
      .split(",")
      .filter((x) => x !== "")
      .map(Number),
    moneda: tresLetras(a, "moneda"),
    nacionalidad: dosLetras(a, "nacionalidad"),
    pais: a.pais.toUpperCase(),
  };
  if (noches(estancia) < 1) throw new Error("la salida tiene que ser después de la entrada");
  const minimos: Minimos = {
    nota: numero(a, "nota", 8.5),
    opiniones: numero(a, "opiniones", 200),
    estrellas: numero(a, "estrellas", 4),
  };
  const cuantos = numero(a, "finalistas", 5);
  const avisos: string[] = [];

  if (!encendida("liteapi")) throw new Error("la fuente de alojamiento está apagada");
  const busqueda = await buscarAlojamiento(liteapi, estancia, minimos, { finalistas: cuantos });

  if (a.lugar !== undefined && encendida("parallel")) {
    try {
      const casados = anadirOfertas(busqueda, await ofertasDeZona(a.lugar, estancia), a.lugar);
      avisos.push(`otras ofertas: casaron ${casados} de ${busqueda.finalistas.length} finalistas`);
    } catch (e) {
      avisos.push(`sin otras ofertas: ${(e as Error).message}`);
    }
  }

  let vuelos: Vuelo[] = [];
  let dias: DiaBarato[] = [];
  if (a.origen !== undefined && a.destino !== undefined && encendida("aviasales")) {
    const trayecto: Trayecto = {
      origen: a.origen.toUpperCase(),
      destino: a.destino.toUpperCase(),
      ida: estancia.entrada,
      vuelta: estancia.salida,
      moneda: estancia.moneda,
      mercado: dosLetras(a, "mercado").toLowerCase(),
    };
    try {
      vuelos = await vuelosPorFechas(trayecto);
      if (vuelos.length === 0) avisos.push("vuelos: la fuente no tiene precio guardado para esas fechas exactas");
      dias = await diasBaratos(trayecto, estancia.entrada.slice(0, 7), noches(estancia));
    } catch (e) {
      avisos.push(`sin vuelos: ${(e as Error).message}`);
    }
  }

  const puerta = puertaBusqueda(busqueda, cuantos);
  const ruta = guardarRun("alojamiento", { busqueda, vuelos, dias, puerta, avisos });

  console.log(
    `devueltos ${busqueda.devueltos} | pasan los mínimos ${busqueda.dentro.length} ` +
      `| con precio ${busqueda.conPrecio.length}`,
  );
  for (const f of busqueda.finalistas) {
    const h = f.habitacion;
    const sitio =
      h === null ? "habitación sin identificar" : `${h.nombre}, ${h.metros ?? "?"} m2, ${h.fotos.length} fotos`;
    const otras = f.otrasOfertas.map((o) => `${o.vendedor} ${o.total}`).join(", ");
    console.log(
      `- ${f.alojamiento.nombre} [${f.motivo}] ${f.precioCompleto} ${f.precio.moneda} ` +
        `| nota ${f.alojamiento.nota} | ${sitio}`,
    );
    if (otras !== "") console.log(`    otras ofertas: ${otras}`);
    for (const aviso of f.avisos) console.log(`    aviso: ${aviso}`);
  }
  if (vuelos.length > 0)
    console.log(
      `vuelos para esas fechas: ${vuelos.length}, desde ${vuelos[0].precio} ${vuelos[0].moneda} ` +
        `(visto el ${vuelos[0].visto})`,
    );
  if (dias.length > 0) {
    const importes = dias.map((d) => d.precio);
    console.log(`días con precio en el mes: ${dias.length}, de ${Math.min(...importes)} a ${Math.max(...importes)}`);
  }
  for (const aviso of [...busqueda.avisos, ...avisos]) console.log(`aviso: ${aviso}`);
  console.log(puerta.verde ? "puerta de la búsqueda: verde" : `puerta de la búsqueda: ROJA (${puerta.rojos.length})`);
  for (const r of puerta.rojos.slice(0, 10)) console.log(`  rojo en ${r.donde}: ${r.que}`);
  console.log(`guardado en ${ruta}`);
  return puerta.verde ? 0 : 1;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(`no se pudo buscar: ${(e as Error).message}`);
      process.exit(2);
    },
  );
}
