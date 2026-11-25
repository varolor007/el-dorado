// Las cuentas de cerrar el viaje, sin IA y sin nada de Node: el precio de hoy de cada pieza frente al que se vio,
// su edad, si el cambio pide el sí del viajero, la hora de llegada frente a la entrada al alojamiento, el orden de
// las reservas, los plazos de los papeles, lo que queda sin confirmar y los enlaces. Lo que pide a las fuentes y lo
// que escribe en la mesa está en `agent/launcher/cerrar.ts`; lo que comprueba la puerta 8, en
// `agent/gates/puerta_cierre.ts`, que vuelve a contar con estas mismas cuentas.

import {
  CAMBIO_QUE_SE_DICE,
  EDAD_MAXIMA_DE_UN_PRECIO,
  LA_HORA_DE_LLEGADA,
  SUBIDA_QUE_SE_PREGUNTA,
} from "../data/cierre.ts";
import type {
  CambioDePrecio,
  ClaseDePieza,
  ComprobacionDeEnlace,
  EdadDeUnPrecio,
  EnlaceDeReserva,
  HabitacionDeHoy,
  Llegada,
  Manera,
  PlazoDePapel,
  Precio,
  PrecioDeHoy,
  RazonDelOrden,
  Reserva,
  SinConfirmar,
  Viaje,
} from "../output/viaje.ts";
import { RITMOS } from "../output/viaje.ts";
import { caminosDe, trayectoEntre } from "../tools/caminos.ts";
import { diaEnGoogleMaps, enlaceSinClaves, sitioEnGoogleMaps } from "../tools/enlaces.ts";

const redondo = (n: number): number => Math.round(n * 100) / 100;

/** Una pieza del viaje elegido: dónde se duerme o cómo se llega, con el precio que se vio. */
export type PiezaElegida = {
  pieza: ClaseDePieza;
  ref: string;
  antes: Precio;
  guardado: boolean;
  /** La habitación de ese precio, por su nombre, si es un alojamiento y se sabe. */
  habitacion: string | null;
};

/** Las piezas de una manera, con el precio con que se vieron. */
export function piezasDe(v: Viaje, m: Manera): PiezaElegida[] {
  const a = v.alojamientos.find((x) => x.id === m.alojamiento);
  if (a === undefined) throw new Error("el alojamiento de la manera no está en el viaje");
  const piezas: PiezaElegida[] = [
    { pieza: "lodging", ref: a.id, antes: a.precio, guardado: false, habitacion: a.habitacion },
  ];
  if (m.transporte !== null) {
    const t = v.transportes.find((x) => x.id === m.transporte);
    if (t === undefined) throw new Error("el transporte de la manera no está en el viaje");
    piezas.push({ pieza: "transport", ref: t.id, antes: t.precio, guardado: t.guardado, habitacion: null });
  }
  return piezas;
}

/**
 * Lo que dio la fuente hoy de una pieza: su precio, si se puede cancelar y para qué noches; o que ya no lo tiene
 * (`gone`), o que no se le pudo preguntar (`unknown`).
 */
export type DeHoy =
  | {
      precio: Precio;
      cancelable: boolean | null;
      noches: { entrada: string; salida: string } | null;
      /** Verdadero si es un precio guardado de búsquedas de otros, y no pedido ahora. */
      guardado: boolean;
      /** La habitación de ese precio, por su nombre, si la fuente la dice. */
      habitacion?: string | null;
    }
  | "gone"
  | "unknown";

/** La edad de un precio a una hora: visto ahora, guardado dentro de su edad, o caducado. */
export function edadDe(visto: string, cuando: string, guardado: boolean): EdadDeUnPrecio {
  const horas = (Date.parse(cuando) - Date.parse(visto)) / 3_600_000;
  if (Number.isNaN(horas)) return "stale";
  if (!guardado) return horas <= EDAD_MAXIMA_DE_UN_PRECIO.ahora ? "now" : "stale";
  return horas <= EDAD_MAXIMA_DE_UN_PRECIO.guardado ? "saved" : "stale";
}

/** Si un precio ha cambiado, y hacia dónde: cualquier cambio de un céntimo o más se dice. */
export function cambioDe(antes: number, hoy: number): Exclude<CambioDePrecio, "gone" | "unknown"> {
  const d = redondo(hoy - antes);
  return Math.abs(d) < CAMBIO_QUE_SE_DICE ? "same" : d > 0 ? "up" : "down";
}

/** El precio de hoy de una pieza, frente al que se vio, a la hora del cierre. */
/** Un nombre de habitación, para compararlo: sin mayúsculas ni espacios de más. */
const nombreLlano = (x: string): string => x.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Si el precio de hoy de un alojamiento es de la habitación que se miró. La fuente da hoy lo más barato que tiene, y
 * puede ser otra: comparar los dos precios sin decirlo sería comparar dos cosas distintas.
 */
export function habitacionDeHoy(p: PiezaElegida, deHoy: string | null | undefined): HabitacionDeHoy | null {
  if (p.pieza !== "lodging") return null;
  if (p.habitacion === null || deHoy == null || deHoy.trim() === "") return "unknown";
  return nombreLlano(p.habitacion) === nombreLlano(deHoy) ? "same" : "other";
}

export function precioDeHoy(p: PiezaElegida, dado: DeHoy, cuando: string): PrecioDeHoy {
  const base = { pieza: p.pieza, ref: p.ref, antes: p.antes };
  const sin = { hoy: null, diferencia: null, edad: null, cancelable: null, noches: null, habitacion: null };
  if (dado === "gone" || dado === "unknown") return { ...base, ...sin, cambio: dado };
  // Un cambio de moneda no es un cambio de precio: si la fuente contesta en otra, no se puede comparar.
  if (dado.precio.moneda !== p.antes.moneda) return { ...base, ...sin, cambio: "unknown" };
  return {
    ...base,
    hoy: dado.precio,
    cambio: cambioDe(p.antes.total, dado.precio.total),
    diferencia: redondo(dado.precio.total - p.antes.total),
    edad: edadDe(dado.precio.visto, cuando, dado.guardado),
    cancelable: dado.cancelable,
    noches: dado.noches,
    habitacion: habitacionDeHoy(p, dado.habitacion),
  };
}

/** El total de hoy: la suma de los precios de hoy, o null si a alguna pieza le falta el suyo. */
export function totalDeHoy(precios: PrecioDeHoy[]): number | null {
  if (precios.some((p) => p.hoy === null)) return null;
  return redondo(precios.reduce((s, p) => s + (p.hoy as Precio).total, 0));
}

/**
 * Si el cambio de precio pide el sí del viajero antes de cerrar: si el total sube lo que dicen los datos o más, o si
 * una pieza se ha quedado sin precio de hoy.
 */
export function pideSeguir(precios: PrecioDeHoy[], antes: number): boolean {
  if (precios.some((p) => p.hoy === null)) return true;
  const hoy = totalDeHoy(precios) as number;
  return antes > 0 && (hoy - antes) / antes >= SUBIDA_QUE_SE_PREGUNTA - 1e-9;
}

// La hora de llegada.

/** Lo que se sabe para ver si la llegada cuadra con la entrada al alojamiento. */
export type ParaLaLlegada = {
  /** Si la manera lleva transporte. */
  hayTransporte: boolean;
  /** Cuándo sale, con su hora y su zona (ISO con desfase o Z); una fecha sola no tiene hora. */
  sale: string | null;
  /** Lo que dura la ida, en minutos, si la fuente lo dice. */
  minutosIda: number | null;
  /** El día de entrada al alojamiento. */
  entrada: string;
  /** Desde qué hora se entra (HH:MM), si la fuente lo dice. */
  entradaDesde: string | null;
  /** La longitud del destino: de ella sale su hora, aproximada. */
  lon: number;
};

const CON_HORA_Y_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const HORA = /^(\d{2}):(\d{2})$/;

/** Cuándo llega, en la hora aproximada del destino, con su margen: lo más pronto y lo más tarde, en milisegundos. */
function llegadaEnElDestino(x: ParaLaLlegada): { pronto: number; tarde: number } | null {
  if (x.sale === null || x.minutosIda === null || !CON_HORA_Y_ZONA.test(x.sale) || !(x.minutosIda > 0)) return null;
  const llega = Date.parse(x.sale) + x.minutosIda * 60_000;
  if (Number.isNaN(llega)) return null;
  const zona = Math.round(x.lon / 15) * 3_600_000;
  const margen = LA_HORA_DE_LLEGADA.margen * 3_600_000;
  // Se cuenta como si fuera la hora UTC de allí: así la fecha y la hora salen leyendo la de UTC.
  return { pronto: llega + zona - margen, tarde: llega + zona + margen };
}

/** Si la llegada cuadra con la entrada al alojamiento, como lo dice la hoja: lo que no se sabe no se da por bueno. */
export function llegadaDe(x: ParaLaLlegada): Llegada {
  if (!x.hayTransporte) return "no_transport";
  const r = llegadaEnElDestino(x);
  if (r === null) return "no_hours";
  const dia = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
  const [pronto, tarde] = [dia(r.pronto), dia(r.tarde)];
  if (pronto > x.entrada) return "next_day";
  if (tarde < x.entrada) return "day_before";
  if (pronto !== tarde) return "unsure";
  const h = HORA.exec(x.entradaDesde ?? "");
  if (h === null) return "no_check_in";
  const entra = Date.parse(`${x.entrada}T00:00:00Z`) + (Number(h[1]) * 60 + Number(h[2])) * 60_000;
  return r.pronto < entra - LA_HORA_DE_LLEGADA.antesDeLaEntrada * 3_600_000 ? "early" : "ok";
}

// Los enlaces (3.13).

/** Lo que la casa sabe del alojamiento elegido además de su precio: su propia web, si la fuente la da. */
export type DelAlojamiento = { web: string | null; entradaDesde: string | null };

/**
 * Los enlaces de reserva de cada pieza, sin comprobar todavía: donde se vio su precio (el de hoy, o el que se vio),
 * los de los otros vendedores que dieron precio, cada uno con el suyo del día que se buscó, y la web del propio
 * alojamiento, que no es donde se vio el precio.
 * Solo direcciones https sin claves, y cada una una vez.
 */
export function enlacesSinComprobar(
  v: Viaje,
  m: Manera,
  precios: PrecioDeHoy[],
  d: DelAlojamiento,
): Omit<EnlaceDeReserva, "comprobado">[] {
  const salida: Omit<EnlaceDeReserva, "comprobado">[] = [];
  const pon = (e: Omit<EnlaceDeReserva, "comprobado">): void => {
    if (enlaceSinClaves(e.url) && !salida.some((x) => x.url === e.url)) salida.push(e);
  };
  for (const p of precios) {
    const url = p.hoy?.enlace ?? p.antes.enlace;
    const vendedor = p.hoy?.vendedor ?? p.antes.vendedor;
    // El de un transporte es la búsqueda en la web de su fuente, con sus fechas; el de un alojamiento, donde se vio.
    if (url !== null)
      pon({
        pieza: p.pieza,
        ref: p.ref,
        clase: p.pieza === "transport" ? "search" : "where_priced",
        url,
        vendedor,
        precio: null,
      });
  }
  const a = v.alojamientos.find((x) => x.id === m.alojamiento);
  for (const o of a?.otrasOfertas ?? [])
    if (o.enlace !== null)
      pon({
        pieza: "lodging",
        ref: m.alojamiento,
        // Otro vendedor, con el precio que tenía el día que se buscó: no es el precio de hoy, y se dice así.
        clase: "other_seller",
        url: o.enlace,
        vendedor: o.vendedor,
        precio: { total: o.total, moneda: o.moneda },
      });
  if (d.web !== null)
    pon({ pieza: "lodging", ref: m.alojamiento, clase: "own_site", url: d.web, vendedor: null, precio: null });
  return salida;
}

/**
 * Los enlaces a Google Maps de un viaje, con donde se duerme: el del alojamiento, el de cada parada y el de cada día,
 * de donde se duerme por sus paradas, andando si todo se anda.
 */
export function mapasDe(v: Viaje, alojamiento: string): NonNullable<Viaje["cierre"]>["mapas"] {
  const a = v.alojamientos.find((x) => x.id === alojamiento);
  if (a === undefined) throw new Error("el alojamiento no está en el viaje");
  const deParada = new Map(v.paradas.map((p) => [p.id, p]));
  const c = caminosDe(v.caminos);
  const paradas: Record<string, string> = {};
  for (const p of v.paradas) paradas[p.id] = sitioEnGoogleMaps(p.punto, p.nombre);
  const dias = v.dias.map((d) => {
    const puntos = [a.punto, ...d.paradas.flatMap((id) => deParada.get(id)?.punto ?? [])];
    const aPie = puntos.every((p, i) => i === 0 || trayectoEntre(puntos[i - 1], p, c).aPie);
    return { fecha: d.fecha, url: diaEnGoogleMaps(puntos, aPie) };
  });
  return { alojamiento: sitioEnGoogleMaps(a.punto, a.nombre), paradas, dias };
}

// El orden.

/** Por qué va cada pieza donde va: lo que se sabe de ella, por sus claves. */
function razonesDe(p: PrecioDeHoy, guardado: boolean): RazonDelOrden[] {
  if (p.pieza === "transport") return guardado || p.edad === "saved" ? ["price_moves", "saved_price"] : ["price_moves"];
  if (p.cancelable === false) return ["not_cancellable"];
  if (p.cancelable === null) return ["cancel_unknown"];
  return ["cancellable"];
}

/** El peso de una reserva en el orden: primero lo que más se mueve de precio, al final lo que se puede cancelar. */
const PESO: Record<RazonDelOrden, number> = {
  price_moves: 0,
  saved_price: 0,
  not_cancellable: 1,
  cancel_unknown: 1,
  cancellable: 2,
  book_ahead: 3,
};

/**
 * El orden de las reservas, por el código: primero lo que más se mueve de precio (el transporte), después lo que no
 * se puede cancelar o no se sabe, después lo que se puede cancelar, y al final las paradas que hay que reservar con
 * tiempo, por su día. Lo que escribe el que explica de cada una es aparte, y pasa la puerta 7.
 */
export function reservasDe(v: Viaje, piezas: PiezaElegida[], precios: PrecioDeHoy[]): Reserva[] {
  const conPeso = precios.map((p) => {
    const porQue = razonesDe(p, piezas.find((x) => x.ref === p.ref)?.guardado ?? false);
    return { que: p.pieza, ref: p.ref, porQue, peso: Math.min(...porQue.map((r) => PESO[r])) };
  });
  conPeso.sort((a, b) => a.peso - b.peso);
  const puestas = v.dias.flatMap((d) => d.paradas);
  const conTiempo = puestas.filter((id) => v.paradas.find((p) => p.id === id)?.reservar === true);
  const todas = [
    ...conPeso.map(({ que, ref, porQue }) => ({ que, ref, porQue })),
    ...conTiempo.map((ref) => ({ que: "sight" as const, ref, porQue: ["book_ahead" as const] })),
  ];
  return todas.map((r, i) => ({ n: i + 1, ...r }));
}

/** Los plazos de los papeles: cada casilla con un «antes de», por su fecha, y si ya pasó. */
export function plazosDe(v: Viaje): PlazoDePapel[] {
  const casillas = v.papeles?.casillas ?? [];
  return casillas
    .flatMap((c, i) =>
      c.antesDe === null
        ? []
        : [{ casilla: i, pais: c.pais, pregunta: c.pregunta, antesDe: c.antesDe, tarde: c.tarde }],
    )
    .sort((a, b) => a.antesDe.localeCompare(b.antesDe) || a.casilla - b.casilla);
}

/** Lo que queda sin confirmar al cerrar, por sus claves, de lo que ya se sabe. */
export function sinConfirmarDe(
  v: Viaje,
  precios: PrecioDeHoy[],
  enlaces: EnlaceDeReserva[],
  llegada: Llegada,
): SinConfirmar[] {
  const s: SinConfirmar[] = [];
  const pon = (que: SinConfirmar["que"], ref: string | null): void => {
    if (!s.some((x) => x.que === que && x.ref === ref)) s.push({ que, ref });
  };
  for (const p of precios) {
    if (p.cambio === "gone") pon("price_gone", p.ref);
    if (p.cambio === "unknown") pon("price_unknown", p.ref);
    if (p.edad === "stale") pon("price_stale", p.ref);
    if (p.edad === "saved") pon("saved_price", p.ref);
    if (p.pieza === "lodging" && p.hoy !== null && p.cancelable === null) pon("cancel_unknown", p.ref);
    if (p.habitacion === "other") pon("other_room", p.ref);
    const suyos = enlaces.filter((e) => e.ref === p.ref);
    if (suyos.length === 0) pon("no_link", p.ref);
    for (const e of suyos) {
      if (e.comprobado === "down") pon("link_down", p.ref);
      if (e.comprobado === "unchecked") pon("link_unchecked", p.ref);
    }
  }
  if (["no_transport", "no_hours", "no_check_in", "unsure"].includes(llegada)) pon("arrival_unknown", null);
  if (llegada === "next_day" || llegada === "day_before") pon("arrival_off", null);
  for (const c of v.papeles?.casillas ?? []) {
    if (c.estado === "doubtful") pon("papers_doubtful", c.pais);
    if (c.tarde) pon("papers_late", c.pais);
  }
  return s;
}

/** Lo que se le enseña al viajero de un enlace según se comprobó: uno que no responde no se abre. */
export const SE_ABRE: Record<ComprobacionDeEnlace, boolean> = { ok: true, unchecked: true, down: false };

// Lo que se le da al que explica para el orden (su modo de cerrar), en inglés y con los números del código.

export type ParaElOrden = {
  trip: {
    language: string;
    destination: string;
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    currency: string;
  };
  steps: {
    step: number;
    what: "lodging" | "transport" | "sight";
    label: string;
    reasons: RazonDelOrden[];
    price_seen: number | "unknown";
    price_today: number | "unknown";
    change: CambioDePrecio | "unknown";
    difference: number | "unknown";
    cancellable: boolean | "unknown";
  }[];
  papers: { paper: number; country: string; question: string; before: string; late: boolean }[];
  unconfirmed: { what: SinConfirmar["que"]; about: string | null }[];
  arrival: Llegada;
  check_in_from: string | "unknown";
  total: { seen: number; today: number | "unknown" };
};

/** El material del que explica para el orden: lo que ha montado el código, con sus números, y nada de dentro. */
export function paraElOrden(
  v: Viaje,
  cierre: Pick<
    NonNullable<Viaje["cierre"]>,
    "reservas" | "papeles" | "sinConfirmar" | "llegada" | "entradaDesde" | "precios" | "total" | "moneda"
  >,
): ParaElOrden {
  const nombre = (que: string, ref: string): string => {
    if (que === "lodging") return v.alojamientos.find((a) => a.id === ref)?.nombre ?? ref;
    if (que === "transport") {
      const t = v.transportes.find((x) => x.id === ref);
      return t === undefined ? ref : `${t.clase} ${t.de}-${t.a}`;
    }
    return v.paradas.find((p) => p.id === ref)?.nombre ?? ref;
  };
  const noches = Math.round((Date.parse(v.salida) - Date.parse(v.entrada)) / 86_400_000);
  return {
    trip: {
      language: v.idioma,
      destination: v.destino.nombre,
      check_in: v.entrada,
      check_out: v.salida,
      nights: noches,
      adults: v.adultos,
      children: v.ninos.length,
      currency: cierre.moneda,
    },
    steps: cierre.reservas.map((r) => {
      const p = cierre.precios.find((x) => x.ref === r.ref && r.que !== "sight");
      return {
        step: r.n,
        what: r.que,
        label: nombre(r.que, r.ref),
        reasons: r.porQue,
        price_seen: p?.antes.total ?? "unknown",
        price_today: p?.hoy?.total ?? "unknown",
        change: p?.cambio ?? "unknown",
        difference: p?.diferencia ?? "unknown",
        cancellable: p?.cancelable ?? "unknown",
      };
    }),
    papers: cierre.papeles.map((p, i) => ({
      paper: i,
      country: p.pais,
      question: p.pregunta,
      before: p.antesDe,
      late: p.tarde,
    })),
    unconfirmed: cierre.sinConfirmar.map((s) => ({
      what: s.que,
      about: s.ref === null ? null : nombre(queEs(v, s.ref), s.ref),
    })),
    arrival: cierre.llegada,
    check_in_from: cierre.entradaDesde ?? "unknown",
    total: { seen: cierre.total.antes, today: cierre.total.hoy ?? "unknown" },
  };
}

/** De qué es un identificador del viaje: de un alojamiento, de un transporte o de otra cosa (un país, una parada). */
function queEs(v: Viaje, ref: string): string {
  if (v.alojamientos.some((a) => a.id === ref)) return "lodging";
  if (v.transportes.some((t) => t.id === ref)) return "transport";
  return v.paradas.some((p) => p.id === ref) ? "sight" : "other";
}

/** Los días como los tiene delante el viajero al cerrar: cada fecha con sus paradas, en su orden, por sus ids. */
export type TusDias = { fecha: string; paradas: string[] }[];

/**
 * El viaje con los días que tiene delante el viajero («y tus días», dice la hoja): la web los reparte con su ritmo y
 * con lo que quitó, añadió o movió, y pueden no ser los de la versión. Se mira que sean de verdad: cada fecha, del
 * viaje y en orden; cada parada, del viaje y en un solo día. Lo que se anda entre paradas lo cuenta el código, y lo
 * que no está en ningún día queda fuera, con su porqué de antes o, si no lo tenía, porque lo quitó el viajero.
 * Si algo no cuadra, lanza un error: no se cierra con unos días que no son del viaje.
 */
export function conTusDias(v: Viaje, dias: unknown, ritmo?: unknown): Viaje {
  const fechas = new Set<string>();
  for (
    let d = new Date(`${v.entrada}T00:00:00Z`);
    d <= new Date(`${v.salida}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  )
    fechas.add(d.toISOString().slice(0, 10));
  if (!Array.isArray(dias) || dias.length === 0 || dias.length > fechas.size)
    throw new Error("los días no son una lista");
  const deParada = new Map(v.paradas.map((p) => [p.id, p]));
  const puestas = new Set<string>();
  const c = caminosDe(v.caminos);
  let antes = "";
  const suyos: Viaje["dias"] = dias.map((crudo: unknown) => {
    const d = crudo as { fecha?: unknown; paradas?: unknown };
    if (typeof d?.fecha !== "string" || !fechas.has(d.fecha) || d.fecha <= antes)
      throw new Error("un día no es del viaje o no va en orden");
    antes = d.fecha;
    if (!Array.isArray(d.paradas)) throw new Error("un día no dice sus paradas");
    const ids = d.paradas.map((id) => {
      if (typeof id !== "string" || !deParada.has(id) || puestas.has(id)) throw new Error("una parada no vale");
      puestas.add(id);
      return id;
    });
    const titulo = v.dias.find((x) => x.fecha === d.fecha)?.titulo ?? "";
    const metros = ids
      .slice(1)
      .map((id, i) => trayectoEntre(deParada.get(ids[i])!.punto, deParada.get(id)!.punto, c).metros);
    return { fecha: d.fecha, titulo, paradas: ids, metros };
  });
  const fuera = v.paradas.map((p) => p.id).filter((id) => !puestas.has(id));
  const porQueFuera: Viaje["porQueFuera"] = {};
  for (const id of fuera) porQueFuera[id] = v.porQueFuera[id] ?? "removed";
  const suRitmo = RITMOS.find((r) => r === ritmo) ?? v.ritmo;
  return { ...v, dias: suyos, fuera, porQueFuera, ritmo: suRitmo };
}
