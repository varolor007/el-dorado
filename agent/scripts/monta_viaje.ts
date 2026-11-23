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
  Transporte,
  Viaje,
  Vistazo,
} from "../output/viaje.ts";
import { AVISOS } from "../data/palabras.ts";
import { MANERAS } from "../output/viaje.ts";
import { elegirFotos } from "../tools/fotos.ts";
import type { Vuelo } from "../tools/fuentes/tipos.ts";
import type { Busqueda, Ficha } from "./busqueda_alojamiento.ts";
import { cribar } from "./cribas.ts";
import type { Entendido, EntregaDeCruce, EntregaDeExplicar, EntregaDeMirar, Tabla, ZonaResuelta } from "./formas.ts";
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
  /** Las maneras. Sin su total, se pone el del alojamiento; con el de la tabla, ese, que lleva el transporte. */
  maneras: (Omit<Manera, "total" | "moneda"> & { total?: number })[];
  transportes?: Transporte[];
  /** Lo que el código sabe de cada alojamiento además de su ficha: su zona, lo que se anda, su nota y su descarte. */
  deCadaAlojamiento?: Record<string, Pick<Alojamiento, "zona" | "andando" | "puntos" | "descartado">>;
  palancas: Palanca[];
  avisos: string[];
  /** Lo que el que mira entregó de cada alojamiento, por su identificador. */
  mirados: Record<string, Mirado>;
};

export function montarViaje(b: Busqueda, d: Decidido): Viaje {
  const alojamientos = b.finalistas.map((f) => ({
    ...alojamientoParaLaWeb(f, d.mirados[f.alojamiento.id] ?? null),
    ...d.deCadaAlojamiento?.[f.alojamiento.id],
  }));
  const maneras: Manera[] = d.maneras.flatMap((m) => {
    const a = alojamientos.find((x) => x.id === m.alojamiento);
    return a === undefined ? [] : [{ ...m, total: m.total ?? a.precio.total, moneda: a.precio.moneda }];
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
    transportes: d.transportes ?? [],
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
  // Cada zona donde se buscó, con su nombre; si se buscó en un solo sitio, ese.
  const zonas = b.zonas ?? [];
  if (zonas.length === 0)
    pasa(0, {
      clase: "zone",
      punto: { lat: b.estancia.lat, lon: b.estancia.lon },
      radio: b.estancia.radio,
      nombre: v.destino.nombre,
    });
  zonas.forEach((z, i) =>
    pasa(i === 0 ? 0 : 1100, {
      clase: "zone",
      punto: { lat: z.lat, lon: z.lon },
      radio: z.radio,
      nombre: z.nombre,
      n: z.devueltos,
    }),
  );
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

// El viaje hecho por el agente: las mismas piezas, pero decididas por sus asientos y por el código, no a mano.

/** Los avisos que lleva siempre lo que se entrega, en el idioma del viajero; si no los hay en el suyo, en inglés. */
export function avisosDeSiempre(idioma: string): string[] {
  const a = AVISOS[idioma] ?? AVISOS.en;
  return [a.ia, a.precios];
}

export type Hecho = {
  id: string;
  viaje: Entendido;
  busqueda: Busqueda;
  zonas: ZonaResuelta[];
  mirados: Record<string, EntregaDeMirar | null>;
  /** Las paradas elegidas, por orden de importancia. */
  paradas: Parada[];
  /** La tabla con la que cerró el que cruza. */
  tabla: Tabla;
  cruce: EntregaDeCruce;
  explica: EntregaDeExplicar;
  transporte: Vuelo | null;
};

/** Junta lo que dejó cada paso de la investigación en la forma que espera la web. No decide nada. */
export function montarViajeHecho(h: Hecho): Viaje {
  const fila = new Map(h.tabla.rows.map((r) => [r.id, r]));
  const texto = new Map(h.explica.ways.map((w) => [w.id, w]));
  const maneras: Decidido["maneras"] = [];
  for (const id of MANERAS) {
    const cerrada = h.cruce.ways[id];
    const r = typeof cerrada === "string" ? undefined : fila.get(cerrada.row);
    const t = texto.get(id);
    if (r === undefined || t === undefined) continue;
    maneras.push({
      id,
      alojamiento: r.lodging,
      transporte: r.transport,
      total: r.total,
      gana: t.gains,
      pierde: t.loses,
      porQue: t.why,
    });
  }
  const palancas: Palanca[] = h.explica.levers.flatMap((dicha) => {
    const l = h.tabla.levers.find((x) => x.id === dicha.lever_row);
    if (l === undefined || typeof l.saves !== "number" || !(l.saves > 0)) return [];
    return [
      {
        id: l.id,
        clase: l.lever,
        ahorra: l.saves,
        moneda: h.tabla.currency,
        que: dicha.what,
        aCambio: dicha.in_exchange,
      },
    ];
  });
  const candidatos = h.busqueda.finalistas.map((ficha) => ({ ficha, mirado: h.mirados[ficha.alojamiento.id] ?? null }));
  const cribados = cribar(candidatos, { gustos: h.viaje.tastes, paradas: h.paradas.map((p) => p.punto) });
  const deCadaAlojamiento: NonNullable<Decidido["deCadaAlojamiento"]> = {};
  for (const c of cribados) {
    const r = h.tabla.rows.find((x) => x.lodging === c.id);
    deCadaAlojamiento[c.id] = {
      zona: h.zonas.find((z) => z.id === r?.zone)?.label ?? null,
      andando: c.minutosAndando,
      puntos: c.nota.nota,
      descartado: c.descarte,
    };
  }
  const v = h.transporte;
  const transportes: Transporte[] =
    v === null
      ? []
      : [
          {
            id: "t1",
            clase: "flight",
            de: v.origen,
            a: v.destino,
            sale: v.sale,
            vuelve: v.vuelve,
            escalas: v.escalasIda,
            precio: { total: v.precio, moneda: v.moneda, vendedor: v.aerolinea, visto: v.visto, enlace: v.enlace },
            guardado: v.guardado,
          },
        ];
  return montarViaje(h.busqueda, {
    id: h.id,
    idioma: h.viaje.language,
    muestra: false,
    destino: { nombre: h.viaje.destination.name, pais: h.viaje.destination.country },
    ritmo: h.viaje.pace,
    paradas: h.paradas,
    maneras,
    transportes,
    deCadaAlojamiento,
    palancas,
    avisos: [...avisosDeSiempre(h.viaje.language), ...h.explica.unknowns],
    mirados: h.mirados,
  });
}
