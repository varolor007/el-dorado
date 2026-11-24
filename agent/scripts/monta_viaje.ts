// Monta el viaje con la forma que espera la web, a partir de lo que dejó cada paso: la búsqueda de alojamiento, la
// ficha de cómo es de cada finalista, los sitios que ver y las maneras de hacerlo. No decide nada: junta, reparte los
// días con el ritmo y hace las restas. Lo que aún no hace el agente (elegir los sitios, cerrar las maneras) llega
// aquí ya decidido, por un asiento o, en el viaje grabado, a mano.

import type {
  Alojamiento,
  AvisoDeFicha,
  Dicho,
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
import { avisosDe } from "../data/palabras.ts";
import { MENCIONES, OTRO_TEMA, TEMAS_DE_OPINIONES, TONOS } from "../data/niveles.ts";
import { MANERAS, PRUEBAS } from "../output/viaje.ts";
import { elegirFotos } from "../tools/fotos.ts";
import { paraElGrupo, type Vuelo } from "../tools/fuentes/tipos.ts";
import type { Busqueda, Ficha } from "./busqueda_alojamiento.ts";
import type { TablaDeCaminos } from "../tools/caminos.ts";
import type { DeLosPapeles, DelCalendario } from "../output/viaje.ts";
import { cribar } from "./cribas.ts";
import type { Entendido, EntregaDeCruce, EntregaDeExplicar, EntregaDeMirar, Tabla, ZonaResuelta } from "./formas.ts";
import { fechasDe, repartir } from "./ritmo.ts";

/** Lo que entregó el que mira un alojamiento, tal como sale de su puesto. */
export type Mirado = Record<string, unknown> | null;

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);

/** Cuántas fotos de un alojamiento van a la web: las de la habitación de ese precio, por delante. */
const FOTOS_PARA_LA_WEB = { habitacion: 12, hotel: 8 };

export function alojamientoParaLaWeb(f: Ficha, mirado: Mirado): Alojamiento {
  const elegidas = elegirFotos(f.habitacion?.fotos ?? [], f.detalle?.fotos ?? []);
  // El asiento cita sus fotos por el nombre que tenían en su puesto: aquí se vuelve a su dirección.
  const direccion = new Map(elegidas.pedidas.map((p) => [p.ruta.replace("photos/", ""), p.url]));
  const deLaFoto = (ref: unknown): string | null =>
    typeof ref === "string" ? (direccion.get(ref.replace(/\.\w+$/, "")) ?? null) : null;

  // De lo que entregó el que mira pasan a la web el nivel de cada campo, la clase de su prueba y su foto: nunca sus
  // frases, que están en inglés y citan su material por dentro. Lo que se lee lo dice la web, en el idioma del viajero.
  const comoEs: Rasgo[] = [];
  const campos = esObjeto(mirado?.fields) ? mirado.fields : {};
  for (const [campo, crudo] of Object.entries(campos)) {
    if (!esObjeto(crudo) || typeof crudo.level !== "string") continue;
    const pruebas = Array.isArray(crudo.evidence) ? crudo.evidence.filter(esObjeto) : [];
    const conFoto = pruebas.find((p) => p.kind === "photo" && deLaFoto(p.ref) !== null);
    const clase = (conFoto ?? pruebas[0])?.kind;
    comoEs.push({
      campo,
      nivel: crudo.level,
      prueba: PRUEBAS.find((p) => p === clase) ?? null,
      foto: conFoto === undefined ? null : deLaFoto(conFoto.ref),
    });
  }
  const seDice = loQueSeDice(mirado);
  // Lo que la casa no pudo saber sale de los datos, no de un mensaje: sin detalle, sin la habitación de ese precio,
  // sin fotos de esa habitación o sin opiniones.
  const avisos: AvisoDeFicha[] = [];
  if (f.detalle === null) avisos.push("no_detail");
  else if (f.habitacion === null) avisos.push("room_unknown");
  else if (f.habitacion.fotos.length === 0) avisos.push("no_room_photos");
  if (f.opinionesLeidas === 0) avisos.push("no_reviews");
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
    fotosDeHabitacion: Math.min(deHabitacion.length, FOTOS_PARA_LA_WEB.habitacion),
    comoEs,
    seDice,
    avisos,
  };
}

/**
 * Lo que se dice de un alojamiento, por temas: de cada tema de la lista, el tono y en cuántas opiniones. Lo que el
 * asiento puso fuera de la lista, o en `other`, no se enseña: sigue en su entrega, para el que explica.
 */
export function loQueSeDice(mirado: Mirado): Dicho[] {
  const dichos: Dicho[] = [];
  for (const crudo of Array.isArray(mirado?.review_themes) ? mirado.review_themes.filter(esObjeto) : []) {
    const tema = typeof crudo.theme === "string" ? crudo.theme.trim().toLowerCase().replace(/\s+/g, "_") : "";
    const { tone, mentions } = crudo;
    if (!TEMAS_DE_OPINIONES.includes(tema) || tema === OTRO_TEMA) continue;
    if (typeof tone !== "string" || !TONOS.includes(tone)) continue;
    if (typeof mentions !== "string" || !MENCIONES.includes(mentions)) continue;
    if (dichos.some((d) => d.tema === tema && d.tono === tone)) continue;
    dichos.push({ tema, tono: tone, menciones: mentions });
  }
  return dichos;
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
    minimos: { nota: b.minimos.nota, opiniones: b.minimos.opiniones, estrellas: b.minimos.estrellas },
    // Lo que hubo que bajar o ensanchar se le dice al viajero: sale de los pasos que dio la búsqueda.
    bajados: (b.pasos ?? []).length > 0 && b.pasos![0].minimos.nota !== b.minimos.nota,
    ensanchado: (b.pasos ?? []).some((x) => x.veces > 1),
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
  /** Sin precio de transporte para las fechas, el más barato de los días de al lado: se ofrece, no se suma. */
  alLado?: Transporte | null;
  /** Lo que el código sabe de cada alojamiento además de su ficha: su zona, lo que se anda, su nota y su descarte. */
  deCadaAlojamiento?: Record<string, Pick<Alojamiento, "zona" | "andando" | "aPie" | "puntos" | "descartado">>;
  palancas: Palanca[];
  avisos: string[];
  /** Lo que el que mira entregó de cada alojamiento, por su identificador. */
  mirados: Record<string, Mirado>;
  /** La tabla de caminos del viaje, si la hay: viaja con él, para que la web mida con los mismos números. */
  caminos?: TablaDeCaminos | null;
  /** Los avisos de las fechas, o por qué faltan: viajan tal cual, ya con las cuentas del código. */
  calendario?: DelCalendario | null;
  /** La tabla de los papeles, con lo que decidió el viajero: viaja tal cual. */
  papeles?: DeLosPapeles | null;
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
  const caminos = d.caminos != null && d.caminos.caminos.length > 0 ? d.caminos : null;
  const reparto = repartir(d.paradas, fechasDe(b.estancia.entrada, b.estancia.salida), d.ritmo, base, {}, caminos);
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
    habitaciones: b.estancia.habitaciones,
    ritmo: d.ritmo,
    paradas: d.paradas,
    dias: reparto.dias,
    fuera: reparto.fuera,
    porQueFuera: reparto.porQue,
    alojamientos,
    transportes: d.transportes ?? [],
    ...(d.alLado == null ? {} : { transporteAlLado: d.alLado }),
    maneras,
    palancas: d.palancas,
    // Los dos avisos de siempre los pone aquí la casa, en cualquier viaje que monte: no dependen de quien lo decidió.
    avisos: [...avisosDeSiempre(d.idioma), ...d.avisos.filter((a) => !avisosDeSiempre(d.idioma).includes(a))],
    vistazo: vistazoDe(b),
    // Un viaje sin tabla de caminos no la lleva: se mide con la cuenta de la casa, como siempre.
    ...(caminos === null ? {} : { caminos }),
    ...(d.calendario == null ? {} : { calendario: d.calendario }),
    ...(d.papeles == null ? {} : { papeles: d.papeles }),
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
  const a = avisosDe(idioma);
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
  /** Si las fechas no tienen precio de transporte, el más barato de los días de al lado, para decirlo. */
  alLado?: Vuelo | null;
  /** La tabla de caminos del viaje, si se pidió: lo que dijo la fuente de rutas. */
  caminos?: TablaDeCaminos | null;
  /** Los avisos de las fechas del del calendario, o por qué faltan. */
  calendario?: DelCalendario | null;
  /** La tabla de los papeles, o por qué falta. */
  papeles?: DeLosPapeles | null;
};

/** Un vuelo como lo enseña la web. El precio que se enseña es el de todos los que viajan, como el del alojamiento. */
function transporteDe(id: string, v: Vuelo, viajeros: number): Transporte {
  return {
    id,
    clase: "flight",
    de: v.origen,
    a: v.destino,
    sale: v.sale,
    vuelve: v.vuelve,
    escalas: v.escalasIda,
    precio: {
      total: paraElGrupo(v, viajeros),
      moneda: v.moneda,
      vendedor: v.aerolinea,
      visto: v.visto,
      enlace: v.enlace,
    },
    guardado: v.guardado,
  };
}

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
  const cribados = cribar(candidatos, {
    gustos: h.viaje.tastes,
    paradas: h.paradas.map((p) => p.punto),
    caminos: h.caminos,
  });
  const deCadaAlojamiento: NonNullable<Decidido["deCadaAlojamiento"]> = {};
  for (const c of cribados) {
    const r = h.tabla.rows.find((x) => x.lodging === c.id);
    deCadaAlojamiento[c.id] = {
      zona: h.zonas.find((z) => z.id === r?.zone)?.label ?? null,
      andando: c.minutos,
      aPie: c.aPie,
      puntos: c.nota.nota,
      descartado: c.descarte,
    };
  }
  const viajeros = h.viaje.travellers.adults + h.viaje.travellers.children.length;
  const v = h.transporte;
  const transportes: Transporte[] = v === null ? [] : [transporteDe("t1", v, viajeros)];
  const alLado = v === null && h.alLado != null ? transporteDe("t-al-lado", h.alLado, viajeros) : null;
  return montarViaje(h.busqueda, {
    id: h.id,
    idioma: h.viaje.language,
    muestra: false,
    destino: { nombre: h.viaje.destination.name, pais: h.viaje.destination.country },
    ritmo: h.viaje.pace,
    paradas: h.paradas,
    maneras,
    transportes,
    alLado,
    deCadaAlojamiento,
    palancas,
    avisos: h.explica.unknowns,
    mirados: h.mirados,
    caminos: h.caminos,
    calendario: conSusFrases(h.calendario ?? null, h.explica.dates),
    papeles: h.papeles,
  });
}

/**
 * Los avisos de las fechas con la frase que escribió el que explica para cada uno y para cada ventana, por su
 * posición. Si no las escribió (un viaje de antes, o sin calendario), van como datos, como siempre.
 */
export function conSusFrases(c: DelCalendario | null, dichas: EntregaDeExplicar["dates"]): DelCalendario | null {
  if (c === null || dichas === undefined || c.falta !== null) return c;
  const deAviso = new Map(dichas.findings.map((d) => [d.finding, d.says]));
  const deVentana = new Map(dichas.windows.map((d) => [d.window, d.says]));
  const todas =
    c.avisos.every((_, i) => deAviso.has(i)) &&
    c.ventanas.every((_, i) => deVentana.has(i)) &&
    c.avisos.length + c.ventanas.length > 0;
  if (!todas) return c;
  return {
    ...c,
    avisos: c.avisos.map((a, i) => ({ ...a, frase: deAviso.get(i)! })),
    ventanas: c.ventanas.map((v, i) => ({ ...v, frase: deVentana.get(i)! })),
  };
}
