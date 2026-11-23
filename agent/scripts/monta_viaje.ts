// Monta el viaje con la forma que espera la web, a partir de lo que dejó cada paso: la búsqueda de alojamiento, la
// ficha de cómo es de cada finalista, los sitios que ver y las maneras de hacerlo. No decide nada: junta, reparte los
// días con el ritmo y hace las restas. Lo que aún no hace el agente (elegir los sitios, cerrar las maneras) llega
// aquí ya decidido, por un asiento o, en el viaje grabado, a mano.

import type {
  Alojamiento,
  Encuadre,
  Manera,
  Palanca,
  Parada,
  Punto,
  Rasgo,
  Ritmo,
  Suceso,
  Viaje,
  Vistazo,
} from "../output/viaje.ts";
import { elegirFotos } from "../tools/fotos.ts";
import type { Busqueda, Ficha } from "./busqueda_alojamiento.ts";
import { fechasDe, repartir } from "./ritmo.ts";

/** Lo que entregó el que mira un alojamiento, tal como sale de su puesto. */
export type Mirado = Record<string, unknown> | null;

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

/** Cuántas fotos de un alojamiento van a la web: las de la habitación de ese precio, por delante. */
const FOTOS_PARA_LA_WEB = { habitacion: 12, hotel: 8 };

export function alojamientoParaLaWeb(f: Ficha, mirado: Mirado): Alojamiento {
  const elegidas = elegirFotos(f.habitacion?.fotos ?? [], f.detalle?.fotos ?? []);
  // El asiento cita sus fotos por el nombre que tenían en su puesto: aquí se vuelve a su dirección.
  const direccion = new Map(elegidas.pedidas.map((p) => [p.ruta.replace("photos/", ""), p.url]));
  const deLaFoto = (ref: unknown): string | null =>
    typeof ref === "string" ? (direccion.get(ref.replace(/\.\w+$/, "")) ?? null) : null;

  const comoEs: Rasgo[] = [];
  const campos = esObjeto(mirado?.fields) ? mirado.fields : {};
  for (const [campo, crudo] of Object.entries(campos)) {
    if (!esObjeto(crudo) || typeof crudo.level !== "string") continue;
    const pruebas = Array.isArray(crudo.evidence) ? crudo.evidence.filter(esObjeto) : [];
    const conFoto = pruebas.find((p) => p.kind === "photo" && deLaFoto(p.ref) !== null);
    comoEs.push({
      campo,
      nivel: crudo.level,
      prueba: texto((conFoto ?? pruebas[0])?.what),
      foto: conFoto === undefined ? null : deLaFoto(conFoto.ref),
    });
  }
  const avisos = Array.isArray(mirado?.warnings)
    ? mirado.warnings.filter(esObjeto).flatMap((a) => (texto(a.what) === null ? [] : [String(a.what)]))
    : [];
  const deHabitacion = elegidas.pedidas.filter((p) => p.ruta.includes("/room-")).map((p) => p.url);
  const delHotel = elegidas.pedidas.filter((p) => p.ruta.includes("/hotel-")).map((p) => p.url);
  return {
    id: f.alojamiento.id,
    nombre: f.alojamiento.nombre,
    punto: { lat: f.alojamiento.lat, lon: f.alojamiento.lon },
    estrellas: f.alojamiento.estrellas,
    nota: f.alojamiento.nota,
    opiniones: f.alojamiento.opiniones,
    habitacion: f.habitacion?.nombre ?? f.precio.habitacion,
    metros: f.habitacion?.metros ?? null,
    precio: {
      total: f.precioCompleto,
      moneda: f.precio.moneda,
      vendedor: f.precio.vendedor,
      visto: f.precio.visto,
      enlace: f.precio.enlace,
    },
    otrasOfertas: f.otrasOfertas.flatMap((o) =>
      o.total === null
        ? []
        : [
            {
              total: o.total,
              moneda: o.moneda ?? f.precio.moneda,
              vendedor: o.vendedor,
              visto: f.precio.visto,
              enlace: o.enlace,
            },
          ],
    ),
    fotos: [...deHabitacion.slice(0, FOTOS_PARA_LA_WEB.habitacion), ...delHotel.slice(0, FOTOS_PARA_LA_WEB.hotel)],
    comoEs,
    loMejor: texto(mirado?.summary_good),
    loPeor: texto(mirado?.summary_bad) === "unknown" ? null : texto(mirado?.summary_bad),
    avisos: [...f.avisos, ...avisos],
  };
}

/** El primer vistazo: lo que la búsqueda sabe sin IA. Un punto por alojamiento que pasa los mínimos. */
export function vistazoDe(b: Busqueda): Vistazo {
  const totales = b.conPrecio.map((c) => c.precio.total + c.precio.tasasAparte);
  const precioDe = new Map(b.conPrecio.map((c) => [c.alojamiento.id, c.precio.total + c.precio.tasasAparte]));
  return {
    devueltos: b.devueltos,
    pasan: b.dentro.length,
    conPrecio: b.conPrecio.length,
    desde: totales.length === 0 ? null : Math.min(...totales),
    moneda: b.estancia.moneda,
    puntos: b.dentro.map((a) => ({ punto: { lat: a.lat, lon: a.lon }, precio: precioDe.get(a.id) ?? null })),
  };
}

/** El trozo de mapa que encierra unos puntos, con un margen alrededor. */
export function encuadreDe(puntos: Punto[], margen = 0.15): Encuadre {
  const lats = puntos.map((p) => p.lat);
  const lons = puntos.map((p) => p.lon);
  const alto = Math.max(...lats) - Math.min(...lats) || 0.01;
  const ancho = Math.max(...lons) - Math.min(...lons) || 0.01;
  return {
    oeste: Math.min(...lons) - ancho * margen,
    sur: Math.min(...lats) - alto * margen,
    este: Math.max(...lons) + ancho * margen,
    norte: Math.max(...lats) + alto * margen,
  };
}

/** La palanca de mover las fechas: lo que ahorra, si ahorra, el mismo alojamiento con las noches corridas. */
export function palancaDeFechas(
  id: string,
  clase: string,
  ahora: number,
  movido: number | null,
  moneda: string,
  que: string,
  aCambio: string,
): Palanca | null {
  if (movido === null || !(ahora - movido >= 1)) return null;
  return { id, clase, ahorra: Math.round((ahora - movido) * 100) / 100, moneda, que, aCambio };
}

export type Decidido = {
  id: string;
  idioma: string;
  muestra: boolean;
  destino: { nombre: string; pais: string };
  ritmo: Ritmo;
  /** Los sitios, por orden de importancia. */
  paradas: Parada[];
  /** Las maneras, sin su total: lo pone el código. */
  maneras: Omit<Manera, "total" | "moneda">[];
  palancas: Palanca[];
  avisos: string[];
  /** Lo que el que mira entregó de cada alojamiento, por su identificador. */
  mirados: Record<string, Mirado>;
};

export function montarViaje(b: Busqueda, d: Decidido): Viaje {
  const alojamientos = b.finalistas.map((f) => alojamientoParaLaWeb(f, d.mirados[f.alojamiento.id] ?? null));
  const maneras: Manera[] = d.maneras.flatMap((m) => {
    const a = alojamientos.find((x) => x.id === m.alojamiento);
    return a === undefined ? [] : [{ ...m, total: a.precio.total, moneda: a.precio.moneda }];
  });
  // Los días se reparten desde donde se duerme en la manera del medio; si no la hay, desde el centro de la búsqueda.
  const base =
    alojamientos.find((a) => a.id === (maneras.find((m) => m.id === "best_value") ?? maneras[0])?.alojamiento)?.punto ??
    ({ lat: b.estancia.lat, lon: b.estancia.lon } satisfies Punto);
  const reparto = repartir(d.paradas, fechasDe(b.estancia.entrada, b.estancia.salida), d.ritmo, base);
  const centro = { lat: b.estancia.lat, lon: b.estancia.lon };
  return {
    id: d.id,
    version: 1,
    muestra: d.muestra,
    idioma: d.idioma,
    destino: {
      ...d.destino,
      punto: centro,
      encuadre: encuadreDe([centro, ...alojamientos.map((a) => a.punto), ...d.paradas.map((p) => p.punto)]),
    },
    entrada: b.estancia.entrada,
    salida: b.estancia.salida,
    adultos: b.estancia.adultos,
    ninos: b.estancia.ninos,
    ritmo: d.ritmo,
    paradas: d.paradas,
    dias: reparto.dias,
    fuera: reparto.fuera,
    alojamientos,
    transportes: [],
    maneras,
    palancas: d.palancas,
    avisos: d.avisos,
    vistazo: vistazoDe(b),
  };
}

/**
 * Los sucesos de una investigación ya hecha, para volver a verla: salen de los números de verdad de la búsqueda y
 * del viaje. Sus tiempos no son los que tardó: van comprimidos, para enseñarla.
 */
export function sucesosDe(b: Busqueda, v: Viaje): Suceso[] {
  const sucesos: Suceso[] = [];
  let t = 0;
  const pasa = (ms: number, s: Omit<Suceso, "t">): void => {
    t += ms;
    sucesos.push({ t, ...s });
  };
  const centro = { lat: b.estancia.lat, lon: b.estancia.lon };
  pasa(0, { clase: "zone", punto: centro, radio: b.estancia.radio, nombre: v.destino.nombre });
  // Los descartes de una búsqueda guardada antes de este punto no dicen dónde están: no se pintan.
  const descartados = b.fuera.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon)).slice(0, 300);
  pasa(1400, {
    clase: "lodgings_found",
    n: b.devueltos,
    puntos: descartados.map((x) => ({ lat: x.lat, lon: x.lon })),
  });
  pasa(1800, { clase: "lodgings_pass", n: b.dentro.length, puntos: b.dentro.map((a) => ({ lat: a.lat, lon: a.lon })) });
  pasa(1600, { clase: "lodgings_priced", n: b.conPrecio.length });
  for (const a of v.alojamientos) pasa(600, { clase: "finalist", ref: a.id, punto: a.punto, nombre: a.nombre });
  for (const a of v.alojamientos) {
    pasa(700, { clase: "looking", ref: a.id, punto: a.punto, nombre: a.nombre });
    if (a.comoEs.length > 0) pasa(900, { clase: "looked", ref: a.id, punto: a.punto, nombre: a.nombre });
  }
  if (v.paradas.length > 0) pasa(900, { clase: "sights_found", n: v.paradas.length });
  for (const p of v.paradas) pasa(260, { clase: "sight", ref: p.id, punto: p.punto, nombre: p.nombre });
  v.dias.forEach((dia, i) => {
    if (dia.paradas.length > 0) pasa(700, { clase: "day", n: i + 1, nombre: dia.titulo });
  });
  for (const m of v.maneras) pasa(600, { clase: "way", ref: m.id });
  for (const p of v.palancas) pasa(500, { clase: "lever", ref: p.id });
  pasa(900, { clase: "done" });
  return sucesos;
}
