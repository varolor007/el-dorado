// La maqueta de la guía: el cuaderno. Junta el viaje cerrado y lo que escribió el que escribe la guía, ya pasado por
// la puerta 10, en un cuaderno: la portada, el viaje de un vistazo, lo de allí (cómo moverte y antes de ir), una doble
// página por día con su croquis, sus paradas con su entrada y su horario de ese día, y dónde comer; dónde se duerme,
// cómo se llega, lo que hay que llevar hecho, los papeles con sus plazos y dónde se reserva. Lo de allí sale de las
// capas del destino del viaje (14.6), cada dato con su día; la capa que falta no se nombra. Y lo pinta como una
// página que se lee en la pantalla y se guarda como documento: la imprime el navegador (o se guarda como PDF desde su
// diálogo de imprimir), sin ninguna pieza de fuera.
//
// Aquí no piensa nadie: el cuaderno sale siempre igual de lo mismo. Los textos son los del asiento; los números, los
// rótulos, los precios con su fecha, las fotos con su autor y su licencia y los enlaces de reserva, del código. El
// croquis de cada día lo dibuja el código con los puntos del viaje: sin teselas, sin servicios y sin claves.

import { GRUPO_DEL_DESTINO, rotulosDe } from "../data/guia.ts";
import { avisosDe } from "../data/palabras.ts";
import type {
  Alojamiento,
  CasillaDePapel,
  ClaseDePieza,
  EnlaceDeReserva,
  FilaDePapeles,
  Foto,
  Precio,
  Manera,
  PrecioDeHoy,
  Punto,
  Transporte,
  Viaje,
} from "../output/viaje.ts";
import type { ClaseDeBillete } from "../data/capa_moverse.ts";
import type { LoQueConviene } from "./capa_moverse.ts";
import { cuentaDeMoverseDelViaje } from "./presupuesto.ts";
import type {
  CosaDelDestino,
  DeMoverse,
  EntradaDeUnSitio,
  FuenteDeUnDato,
  Franja,
  Horario,
  PrecioDeCapa,
} from "../output/capas.ts";
import type { EntregaDeLaGuia } from "../gates/puerta_guia.ts";
import { enlaceSinClaves } from "../tools/enlaces.ts";
import { autorDe } from "../tools/sitios.ts";
import { SIN_SABER } from "./formas.ts";
import { abreElDia, entradaDe } from "./capas.ts";
import {
  capaQueVale,
  comerPorDias,
  deLaManera,
  entradaConAlgo,
  franjasDelDia,
  horarioDelDia,
  moverseConAlgo,
  paradasDelDia,
  type ParaLaGuia,
} from "./guia.ts";
import { diasDe } from "./ruta.ts";

export type FotoDelCuaderno = { url: string; autor: string; licencia: string; pagina: string | null };

export type ParadaDelCuaderno = {
  n: number;
  id: string;
  nombre: string;
  clase: string;
  punto: Punto;
  minutos: number;
  mejorHora: string | null;
  reservar: boolean | null;
  imprescindible: boolean;
  foto: FotoDelCuaderno | null;
  que: string;
  porQue: string;
  cuando: string;
  fuente: { nombre: string; enlace: string | null };
  /** Lo que cuesta y cuándo abre ese día, de las entradas del viaje (14.6); null si no se sabe nada. */
  entrada?: EntradaDelCuaderno | null;
};

/**
 * La entrada de una parada el día que se va, copiada del viaje: sus precios, si abre ese día, sus franjas de ese día y
 * el horario que manda ese día (con su página y su fecha), si hay que reservar y dónde, y su web.
 */
export type EntradaDelCuaderno = {
  precios: PrecioDeCapa[] | null;
  abre: boolean | null;
  franjas: Franja[];
  horario: Horario | null;
  reservar: EntradaDeUnSitio["reservar"];
  web: string | null;
};

/** Un sitio donde comer un día: la cosa del destino, tal cual, la parada que le queda más cerca y lo que se anda. */
export type ComerDelCuaderno = { cosa: CosaDelDestino; cerca: string; metros: number };

/**
 * Lo que te conviene para moverte (14.6), de la cuenta del presupuesto (`cuentaDeMoverseDelViaje`) con los días del
 * viaje cerrado, su grupo y donde duerme su manera: su total es el de «moverte allí». La puerta 10 la vuelve a hacer.
 */
export type ConvieneDelCuaderno = {
  manera: string | null;
  viajes: number;
  /** Los trayectos que solo se hacen en coche: no llevan billete, y lo que cuesta el coche no se sabe. */
  soloEnCoche: number;
  dias: number;
  total: number | null;
  moneda: string | null;
  sueltos: number | null;
  ahorra: number | null;
  faltan: number;
  personas: {
    edad: number | null;
    conviene: LoQueConviene;
    total: number | null;
    moneda: string | null;
    compras: { clase: ClaseDeBillete; dias: number | null; viajes: number | null; cuantos: number; total: number }[];
  }[];
  fuentes: FuenteDeUnDato[];
};

/** Lo que te conviene para moverte, con la manera del cuaderno. Null si el viaje no sabe cómo moverse allí. */
export function convieneDelCuaderno(v: Viaje, manera: Manera | null): ConvieneDelCuaderno | null {
  const m = capaQueVale(v.moverse);
  if (!moverseConAlgo(m)) return null;
  const { dias, viajes, soloEnCoche, grupo } = cuentaDeMoverseDelViaje(v, manera ?? undefined, m);
  const redondo = (n: number): number => Math.round(n * 100) / 100;
  const sueltos = grupo.porPersona.every((c) => c.sueltos !== null)
    ? redondo(grupo.porPersona.reduce((s, c) => s + (c.sueltos ?? 0), 0))
    : null;
  const fuentes: FuenteDeUnDato[] = [];
  for (const f of grupo.porPersona.flatMap((c) => c.fuentes))
    if (!fuentes.some((x) => x.url === f.url && x.visto === f.visto)) fuentes.push({ ...f });
  return {
    manera: manera?.id ?? null,
    viajes,
    soloEnCoche,
    dias: dias.filter((d) => d.trayectos > 0).length,
    total: grupo.total,
    moneda: grupo.moneda,
    sueltos,
    ahorra: sueltos === null || grupo.total === null ? null : redondo(sueltos - grupo.total),
    faltan: grupo.faltan,
    personas: grupo.porPersona.map((c) => ({
      edad: c.edad,
      conviene: c.conviene,
      total: c.total,
      moneda: c.moneda,
      compras: c.compras.map((x) => ({
        clase: x.clase,
        dias: m.billetes[x.billete]?.dias ?? null,
        viajes: m.billetes[x.billete]?.viajes ?? null,
        cuantos: x.cuantos,
        total: x.total,
      })),
    })),
    fuentes,
  };
}

/** Cómo moverte, copiado del viaje: lo que hay que contar, sin su porqué de faltar. */
export type MoverseDelCuaderno = Pick<DeMoverse, "llegar" | "transportes" | "billetes" | "pagos" | "coche">;

export type TramoDelCuaderno = {
  de: string;
  a: string;
  metros: number;
  minutos: number;
  aPie: boolean;
  aproximado: boolean;
  dice: string;
};

export type DiaDelCuaderno = {
  n: number;
  fecha: string;
  titulo: string;
  entrada: string;
  paradas: ParadaDelCuaderno[];
  tramos: TramoDelCuaderno[];
  /** Un día libre: sin paradas, sin croquis. Uno de antes no lo trae. */
  libre?: boolean;
  /** Dónde comer ese día (14.6): sus sitios, de los datos, y la frase del que escribe. Uno de antes no lo trae. */
  comer?: ComerDelCuaderno[];
  comerDice?: string | null;
};

/** De qué va una cosa que hay que llevar hecha, por sus datos: una parada que se reserva, un papel o un aviso. */
export type DeQueVa =
  | { clase: "book_ahead"; nombre: string }
  | { clase: "paper"; pregunta: string; pais: string; estado: string }
  | { clase: "dates"; nombre: string };

/**
 * De dónde sale un precio del cuaderno: del cierre, el que dio la fuente ese día (`closing`); el que se vio, porque al
 * cerrar ya no estaba (`gone`) o no se pudo preguntar (`unknown`); o el de la investigación, en un viaje cerrado sin
 * su cierre (`seen`).
 */
export type SegunDelPrecio = "closing" | "gone" | "unknown" | "seen";

/** Un precio del cuaderno: su importe, cuándo se vio y de dónde sale. Sin enlace: los enlaces van en `reservas`. */
export type PrecioDelCuaderno = {
  total: number;
  moneda: string;
  visto: string;
  segun: SegunDelPrecio;
  /** Si el precio del cierre es de otra habitación que la que se miró. */
  otraHabitacion: boolean;
};

/** Un enlace de reserva del cuaderno: los del cierre, con su clase, menos los que no respondieron al cerrar. */
export type EnlaceDelCuaderno = {
  clase: EnlaceDeReserva["clase"];
  url: string;
  vendedor: string | null;
  /** El precio de otro vendedor, con el día en que se buscó: no es el del cierre, y se dice así. */
  precio: { total: number; moneda: string; visto: string } | null;
  /** Lo que se supo al cerrar: respondió, o no se pudo comprobar. Null en un viaje cerrado sin su cierre. */
  comprobado: "ok" | "unchecked" | null;
};

export type Cuaderno = {
  formato: "guia/1";
  viaje: string;
  /** La versión del viaje de la que sale. */
  version: number;
  idioma: string;
  hecha: string;
  portada: { titulo: string; entrada: string; foto: FotoDelCuaderno | null };
  destino: { nombre: string; pais: string };
  entrada: string;
  salida: string;
  noches: number;
  adultos: number;
  ninos: number;
  dias: DiaDelCuaderno[];
  duermes: {
    nombre: string;
    zona: string | null;
    punto: Punto;
    habitacion: string | null;
    estrellas: number | null;
    precio: PrecioDelCuaderno;
  } | null;
  llegas: {
    clase: Transporte["clase"];
    de: string;
    a: string;
    sale: string;
    vuelve: string | null;
    escalas: number | null;
    precio: PrecioDelCuaderno;
    guardado: boolean;
  } | null;
  papeles: { viajeros: FilaDePapeles[]; casillas: CasillaDePapel[] } | null;
  /** Lo que hay que llevar hecho: de qué va cada cosa lo dicen los datos del viaje, y la frase, el que escribe. */
  antes: { item: number; de: DeQueVa | null; dice: string; plazo: string | null; tarde: boolean }[];
  /**
   * Dónde se reserva: cada pieza que trae algún enlace, con los suyos. `caidos` cuenta los que no respondieron al
   * cerrar, que no se ponen.
   */
  reservas: {
    que: "stay" | "transport";
    nombre: string;
    precio: PrecioDelCuaderno;
    enlaces: EnlaceDelCuaderno[];
    caidos: number;
  }[];
  /** El total del cierre, el de ese día; null en un viaje cerrado sin su cierre. */
  total: { total: number; moneda: string; segun: "closing" | "unknown" } | null;
  noSeSabe: string[];
  /** Cómo moverte, si el viaje lo sabe (14.6); un cuaderno de antes no lo trae. */
  moverse?: MoverseDelCuaderno | null;
  /** Lo que te conviene para moverte con los días del viaje, si el viaje sabe cómo moverse (14.6). */
  conviene?: ConvieneDelCuaderno | null;
  /** Lo que conviene saber que no es de un día, si el viaje lo sabe (14.6). */
  saber?: CosaDelDestino[];
  avisos: { ia: string; precios: string };
  /** El día en que se vio el precio más antiguo del cuaderno: la fecha de los precios. Null si no lleva ninguno. */
  preciosDel: string | null;
};

/**
 * Una foto solo entra con su autor y su licencia: sin ellos, no se enseña. El autor, limpio como al leer la fuente: en
 * un viaje guardado antes, puede ser la frase de Commons de que no hay un autor legible, con el supuesto dentro.
 */
function fotoQueVale(f: Foto | null): FotoDelCuaderno | null {
  if (f === null || f.licencia === null || f.licencia.trim() === "") return null;
  const autor = autorDe(f.autor);
  if (autor === null || autor.trim() === "") return null;
  return { url: f.url, autor, licencia: f.licencia, pagina: f.pagina };
}

/** El cierre de un viaje, si se cerró con su flujo: con sus precios y sus enlaces. */
export const cierreDe = (v: Viaje): NonNullable<Viaje["cierre"]> | null =>
  Array.isArray(v.cierre?.precios) && Array.isArray(v.cierre?.enlaces) ? v.cierre : null;

/** El precio de una pieza en el cuaderno, por el cierre: el de ese día si lo dio la fuente, o el que se vio. */
export function precioDelCierre(x: PrecioDeHoy): PrecioDelCuaderno {
  if (x.hoy !== null) {
    const { total, moneda, visto } = x.hoy;
    return { total, moneda, visto, segun: "closing", otraHabitacion: x.habitacion === "other" };
  }
  const { total, moneda, visto } = x.antes;
  return { total, moneda, visto, segun: x.cambio === "gone" ? "gone" : "unknown", otraHabitacion: false };
}

/** El precio que se vio en la investigación: el de un viaje cerrado sin su cierre. */
const precioVisto = (p: Precio): PrecioDelCuaderno => ({
  total: p.total,
  moneda: p.moneda,
  visto: p.visto,
  segun: "seen",
  otraHabitacion: false,
});

/** El día en que se buscó el precio de otro vendedor: el de su oferta, o el del precio que se vio. */
export function vistoDeOtro(a: Alojamiento | undefined, url: string, antes: string): string {
  return a?.otrasOfertas.find((o) => o.enlace === url)?.visto ?? antes;
}

/** Un enlace del cierre en el cuaderno, con su clase y, si es de otro vendedor, su precio con el día que se buscó. */
function enlaceDelCierre(e: EnlaceDeReserva, a: Alojamiento | undefined, antes: string): EnlaceDelCuaderno {
  return {
    clase: e.clase,
    url: e.url,
    vendedor: e.vendedor,
    precio: e.precio === null ? null : { ...e.precio, visto: vistoDeOtro(a, e.url, antes) },
    comprobado: e.comprobado === "ok" ? "ok" : "unchecked",
  };
}

/** El cuaderno de un viaje cerrado, con lo que escribió el asiento y pasó la puerta 10. */
export function montarCuaderno(
  v: Viaje,
  dado: ParaLaGuia,
  escrita: EntregaDeLaGuia,
  o: { manera: string | null; hecha: Date; version?: number },
): Cuaderno {
  const manera = o.manera === null ? null : (v.maneras.find((m) => m.id === o.manera) ?? null);
  const { duerme, llega } = deLaManera(v, manera);
  const comer = comerPorDias(v);
  const entradas = capaQueVale(v.entradas) ?? undefined;
  const vistos: string[] = [];
  let n = 0;
  const dias = v.dias.map((d, i): DiaDelCuaderno => {
    const suyo = escrita.days.find((x) => x.date === d.fecha);
    if (suyo === undefined) throw new Error(`la guía no trae el día ${d.fecha}`);
    const delDado = dado.days[i];
    const paradas = paradasDelDia(v, i).map((p): ParadaDelCuaderno => {
      const t = suyo.stops.find((x) => x.id === p.id);
      if (t === undefined) throw new Error(`la guía no trae la parada ${p.id}`);
      return {
        n: ++n,
        id: p.id,
        nombre: p.nombre,
        clase: p.clase,
        punto: p.punto,
        minutos: p.minutos,
        mejorHora: p.mejorHora ?? null,
        reservar: p.reservar ?? null,
        imprescindible: p.imprescindible,
        foto: fotoQueVale(p.foto),
        que: t.what,
        porQue: t.why,
        cuando: t.when,
        fuente: { nombre: p.origen.fuente, enlace: p.origen.enlace },
        entrada: entradaDelCuaderno(entradaDe(entradas, p.id), d.fecha),
      };
    });
    const tramos = delDado.legs.map((l): TramoDelCuaderno => {
      const t = suyo.legs.find((x) => x.from === l.from && x.to === l.to);
      if (t === undefined) throw new Error(`la guía no trae el tramo de ${l.from} a ${l.to}`);
      return {
        de: l.from,
        a: l.to,
        metros: l.metres,
        minutos: l.minutes,
        aPie: l.on_foot,
        aproximado: l.measured_by === "estimate",
        dice: t.says,
      };
    });
    const deComer = (comer.porDia.get(d.fecha) ?? []).map((x) => ({
      cosa: x.cosa,
      cerca: x.parada.id,
      metros: x.metros,
    }));
    return {
      n: i + 1,
      fecha: d.fecha,
      titulo: suyo.title,
      entrada: suyo.intro,
      paradas,
      tramos,
      ...(delDado.free ? { libre: true } : {}),
      comer: deComer,
      comerDice: deComer.length > 0 ? (suyo.eat ?? null) : null,
    };
  });
  const m = capaQueVale(v.moverse);
  const moverse: MoverseDelCuaderno | null = moverseConAlgo(m)
    ? { llegar: m.llegar, transportes: m.transportes, billetes: m.billetes, pagos: m.pagos, coche: m.coche }
    : null;
  // Los precios de lo de allí cuentan para la fecha de los precios, como los del viaje.
  for (const f of fuentesDeAlli({ dias, moverse, saber: comer.sinDia }, true)) vistos.push(f.visto);
  // Los precios y los enlaces, del viaje cerrado: los de ese día. Un viaje cerrado sin su cierre lleva los de la
  // investigación, con su enlace.
  const cierre = cierreDe(v);
  const reservas: Cuaderno["reservas"] = [];
  const dePieza = (pieza: ClaseDePieza, x: Alojamiento | Transporte): PrecioDelCuaderno => {
    const delCierre = cierre?.precios.find((p) => p.pieza === pieza && p.ref === x.id);
    const precio = delCierre === undefined ? precioVisto(x.precio) : precioDelCierre(delCierre);
    vistos.push(precio.visto);
    let enlaces: EnlaceDelCuaderno[] = [];
    let caidos = 0;
    if (cierre === null) {
      if (x.precio.enlace !== null)
        enlaces = [
          {
            clase: pieza === "transport" ? "search" : "where_priced",
            url: x.precio.enlace,
            vendedor: x.precio.vendedor,
            precio: null,
            comprobado: null,
          },
        ];
    } else {
      const suyos = cierre.enlaces.filter((e) => e.pieza === pieza && e.ref === x.id);
      caidos = suyos.filter((e) => e.comprobado === "down").length;
      const a = pieza === "lodging" ? (x as Alojamiento) : undefined;
      enlaces = suyos.filter((e) => e.comprobado !== "down").map((e) => enlaceDelCierre(e, a, x.precio.visto));
      for (const e of enlaces) if (e.precio !== null) vistos.push(e.precio.visto);
    }
    if (enlaces.length > 0 || caidos > 0) {
      const que = pieza === "lodging" ? "stay" : "transport";
      const nombre = pieza === "lodging" ? (x as Alojamiento).nombre : `${(x as Transporte).de} ${(x as Transporte).a}`;
      reservas.push({ que, nombre, precio, enlaces, caidos });
    }
    return precio;
  };
  const precioDuerme = duerme === null ? null : dePieza("lodging", duerme);
  const precioLlega = llega === null ? null : dePieza("transport", llega);
  const deLlegada = llega === null ? undefined : cierre?.precios.find((p) => p.pieza === "transport");
  const guardado = deLlegada?.hoy != null ? deLlegada.edad !== "now" : (llega?.guardado ?? false);
  const plazos = new Map<number, { plazo: string | null; tarde: boolean }>();
  const deQue = new Map<number, DeQueVa>();
  const casillas = (v.papeles?.casillas ?? []).filter((c) => c.estado !== "in_order");
  for (const cosa of dado.todo) {
    // Un aviso de las fechas sin nombre propio no lleva rótulo: lo cuenta la frase del que escribe.
    if (cosa.kind === "paper")
      deQue.set(cosa.item, { clase: "paper", pregunta: cosa.question, pais: cosa.country, estado: cosa.state });
    else if (cosa.name !== SIN_SABER) deQue.set(cosa.item, { clase: cosa.kind, nombre: cosa.name });
    if (cosa.kind === "paper") {
      const c = casillas.find(
        (x) => x.pais === cosa.country && x.pregunta === cosa.question && x.estado === cosa.state,
      );
      plazos.set(cosa.item, { plazo: c?.antesDe ?? null, tarde: c?.tarde ?? false });
    } else if (cosa.kind === "book_ahead") plazos.set(cosa.item, { plazo: null, tarde: false });
    else plazos.set(cosa.item, { plazo: cosa.trip_days[0] ?? null, tarde: false });
  }
  const dias10 = vistos.map((x) => x.slice(0, 10)).sort();
  const portada =
    dias.flatMap((d) => d.paradas).find((p) => p.imprescindible && p.foto !== null)?.foto ??
    dias.flatMap((d) => d.paradas).find((p) => p.foto !== null)?.foto ??
    null;
  return {
    formato: "guia/1",
    viaje: v.id,
    // La versión es la de la mesa, que es la que cuenta para saber si la guía se ha quedado atrás: el número que el
    // viaje lleva dentro es el de su investigación, y un viaje cerrado es otra versión con ese mismo número dentro.
    version: o.version ?? v.version,
    idioma: v.idioma,
    hecha: o.hecha.toISOString(),
    portada: { titulo: escrita.cover.title, entrada: escrita.cover.intro, foto: portada },
    destino: { nombre: v.destino.nombre, pais: v.destino.pais },
    entrada: v.entrada,
    salida: v.salida,
    noches: diasDe(v.entrada, v.salida).nights,
    adultos: v.adultos,
    ninos: v.ninos.length,
    dias,
    duermes:
      duerme === null
        ? null
        : {
            nombre: duerme.nombre,
            zona: duerme.zona ?? null,
            punto: duerme.punto,
            habitacion: duerme.habitacion,
            estrellas: duerme.estrellas,
            precio: precioDuerme as PrecioDelCuaderno,
          },
    llegas:
      llega === null
        ? null
        : {
            clase: llega.clase,
            de: llega.de,
            a: llega.a,
            sale: llega.sale,
            vuelve: llega.vuelve,
            escalas: llega.escalas,
            precio: precioLlega as PrecioDelCuaderno,
            guardado,
          },
    papeles:
      v.papeles === undefined || v.papeles.casillas.length === 0 ? null : { viajeros: v.papeles.viajeros, casillas },
    antes: escrita.todo.map((t) => ({
      item: t.item,
      de: deQue.get(t.item) ?? null,
      dice: t.says,
      ...(plazos.get(t.item) ?? { plazo: null, tarde: false }),
    })),
    reservas,
    total:
      cierre === null
        ? null
        : {
            total: cierre.total.hoy ?? cierre.total.antes,
            moneda: cierre.moneda,
            segun: cierre.total.hoy === null ? "unknown" : "closing",
          },
    noSeSabe: escrita.unknowns,
    moverse,
    conviene: moverse === null ? null : convieneDelCuaderno(v, manera),
    saber: comer.sinDia,
    avisos: avisosDe(v.idioma),
    preciosDel: dias10[0] ?? null,
  };
}

/** La entrada de una parada un día, copiada del viaje; null si el viaje no sabe nada de ella. */
export function entradaDelCuaderno(e: EntradaDeUnSitio | null, fecha: string): EntradaDelCuaderno | null {
  if (!entradaConAlgo(e)) return null;
  return {
    precios: e.precios,
    abre: abreElDia(e.horarios, fecha),
    franjas: franjasDelDia(e.horarios, fecha),
    horario: horarioDelDia(e.horarios, fecha),
    reservar: e.reservar,
    web: e.web,
  };
}

/**
 * Las páginas de lo de allí que lleva el cuaderno, sin repetir: de cada entrada, cada sitio donde comer, cómo moverte
 * y antes de ir. Con `soloPrecios`, solo las de los precios, que dan la fecha de los precios.
 */
export function fuentesDeAlli(
  c: { dias: DiaDelCuaderno[]; moverse?: MoverseDelCuaderno | null; saber?: CosaDelDestino[] },
  soloPrecios = false,
): FuenteDeUnDato[] {
  const todas: FuenteDeUnDato[] = [];
  const precios = (ps: PrecioDeCapa[] | null): void => void todas.push(...(ps ?? []).map((p) => p.fuente));
  for (const d of c.dias) {
    for (const p of d.paradas) {
      const e = p.entrada ?? null;
      if (e === null) continue;
      precios(e.precios);
      if (!soloPrecios && e.horario !== null) todas.push(e.horario.fuente);
      if (!soloPrecios && e.reservar !== null) todas.push(e.reservar.fuente);
    }
    for (const x of d.comer ?? []) if (!soloPrecios || x.cosa.cuesta !== null) todas.push(x.cosa.fuente);
  }
  const m = c.moverse ?? null;
  if (m !== null) {
    for (const x of m.llegar) {
      precios(x.precios);
      if (!soloPrecios) todas.push(x.fuente);
    }
    for (const x of m.billetes) {
      precios(x.precios);
      if (!soloPrecios) todas.push(x.fuente);
    }
    if (!soloPrecios) {
      for (const x of [...m.transportes, ...m.pagos]) todas.push(x.fuente);
      if (m.coche !== null) todas.push(m.coche.fuente);
    }
  }
  for (const x of c.saber ?? []) if (!soloPrecios || x.cuesta !== null) todas.push(x.fuente);
  const vistas = new Set<string>();
  return todas.filter((f) => {
    const clave = `${f.url} ${f.visto}`;
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}

// Pintarlo.

/** Lo que va en una página: el texto con sus signos de HTML escapados. Nada del cuaderno entra sin pasar por aquí. */
export function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Una dirección que se puede poner en un enlace o una foto: https, sin claves; si no, ninguna. */
function direccion(url: string | null): string | null {
  return url !== null && enlaceSinClaves(url) ? new URL(url).toString() : null;
}

const fechaLarga = (idioma: string, fecha: string): string => {
  try {
    return new Intl.DateTimeFormat(idioma, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${fecha.slice(0, 10)}T12:00:00Z`),
    );
  } catch {
    return fecha.slice(0, 10);
  }
};
const fechaCorta = (idioma: string, fecha: string): string => {
  try {
    return new Intl.DateTimeFormat(idioma, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(`${fecha.slice(0, 10)}T12:00:00Z`),
    );
  } catch {
    return fecha.slice(0, 10);
  }
};
const dinero = (idioma: string, p: { total: number; moneda: string }): string => {
  try {
    return new Intl.NumberFormat(idioma, { style: "currency", currency: p.moneda }).format(p.total);
  } catch {
    return `${p.total} ${p.moneda}`;
  }
};
const metros = (idioma: string, m: number): string =>
  m < 1000
    ? `${Math.round(m)} m`
    : `${new Intl.NumberFormat(idioma, { maximumFractionDigits: 1 }).format(m / 1000)} km`;

/** Un punto del croquis: x e y en la caja, con la longitud encogida por la latitud para que no se deforme. */
type EnElCroquis = { x: number; y: number };

/**
 * Dónde cae cada punto en un croquis de `ancho` por `alto`, con su margen: el norte, arriba, y la misma escala en los
 * dos sentidos. Devuelve también cuántos metros mide un punto del croquis, para su escala.
 */
export function proyectar(
  puntos: Punto[],
  ancho: number,
  alto: number,
  margen: number,
): { donde: (p: Punto) => EnElCroquis; metrosPorPunto: number } {
  const lats = puntos.map((p) => p.lat);
  // Si los puntos están a los dos lados del meridiano 180, las longitudes del oeste se cuentan pasado el 180: así
  // quedan juntos, y no en los dos extremos de la caja.
  const crudas = puntos.map((p) => p.lon);
  const cruza = Math.max(...crudas) - Math.min(...crudas) > 180;
  const lonDe = (l: number): number => (cruza && l < 0 ? l + 360 : l);
  const lons = crudas.map(lonDe);
  const medio = (Math.min(...lats) + Math.max(...lats)) / 2;
  const encoge = Math.cos((medio * Math.PI) / 180);
  const xs = lons.map((l) => l * encoge);
  const minX = Math.min(...xs);
  const maxY = Math.max(...lats);
  // Un solo punto, o todos en el mismo sitio: una caja de unos cuatrocientos metros alrededor.
  const MINIMO = 0.004;
  const anchoX = Math.max(Math.max(...xs) - minX, MINIMO);
  const altoY = Math.max(maxY - Math.min(...lats), MINIMO);
  const escala = Math.min((ancho - 2 * margen) / anchoX, (alto - 2 * margen) / altoY);
  // Lo que sobra se reparte a los dos lados, y lo que se ensanchó una caja pequeña, también.
  const sobraX = (ancho - 2 * margen - anchoX * escala) / 2 + ((anchoX - (Math.max(...xs) - minX)) / 2) * escala;
  const sobraY = (alto - 2 * margen - altoY * escala) / 2 + ((altoY - (maxY - Math.min(...lats))) / 2) * escala;
  return {
    donde: (p) => ({
      x: margen + sobraX + (lonDe(p.lon) * encoge - minX) * escala,
      y: margen + sobraY + (maxY - p.lat) * escala,
    }),
    metrosPorPunto: 111_320 / escala,
  };
}

/** La escala del croquis: un trozo redondo de metros que quepa en una cuarta parte de su ancho. */
function escalaDelCroquis(idioma: string, metrosPorPunto: number, ancho: number): { largo: number; dice: string } {
  const quepa = (ancho / 4) * metrosPorPunto;
  const redondos = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000];
  const m = [...redondos].reverse().find((r) => r <= quepa) ?? redondos[0];
  return { largo: m / metrosPorPunto, dice: metros(idioma, m) };
}

/** Un croquis en SVG: los tramos, en orden, y cada punto con su número; donde se duerme, con su casa. */
export function croquis(
  idioma: string,
  marcas: { n: number; punto: Punto; nombre: string }[],
  duerme: Punto | null,
  o: { ancho?: number; alto?: number; etiquetas?: boolean; grupos?: number[][] } = {},
): string {
  const ancho = o.ancho ?? 640;
  const alto = o.alto ?? 440;
  const todos = [...marcas.map((m) => m.punto), ...(duerme === null ? [] : [duerme])];
  if (todos.length === 0) return "";
  const { donde, metrosPorPunto } = proyectar(todos, ancho, alto, 56);
  const partes: string[] = [];
  // La cuadrícula callada del papel de mapa.
  for (let x = 40; x < ancho; x += 40) partes.push(`<line class="rejilla" x1="${x}" y1="0" x2="${x}" y2="${alto}"/>`);
  for (let y = 40; y < alto; y += 40) partes.push(`<line class="rejilla" x1="0" y1="${y}" x2="${ancho}" y2="${y}"/>`);
  const grupos = o.grupos ?? [marcas.map((_, i) => i)];
  for (const grupo of grupos) {
    const camino = [...(duerme === null ? [] : [donde(duerme)]), ...grupo.map((i) => donde(marcas[i].punto))];
    if (camino.length > 1)
      partes.push(
        `<polyline class="tramo" points="${camino.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}"/>`,
      );
  }
  if (duerme !== null) {
    const d = donde(duerme);
    partes.push(
      `<g class="casa" transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})">` +
        `<path d="M-10 2 L0 -9 L10 2 L10 11 L-10 11 Z"/></g>`,
    );
  }
  for (const m of marcas) {
    const p = donde(m.punto);
    partes.push(
      `<g class="punto" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">` +
        `<circle r="13"/><text y="4.5" text-anchor="middle">${m.n}</text></g>`,
    );
    if (o.etiquetas !== false) {
      const derecha = p.x < ancho * 0.62;
      partes.push(
        `<text class="nombre" x="${(p.x + (derecha ? 19 : -19)).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" ` +
          `text-anchor="${derecha ? "start" : "end"}">${esc(m.nombre)}</text>`,
      );
    }
  }
  const e = escalaDelCroquis(idioma, metrosPorPunto, ancho);
  const largo = e.largo.toFixed(1);
  partes.push(
    `<g class="escala" transform="translate(24 ${alto - 24})">` +
      `<line x1="0" y1="0" x2="${largo}" y2="0"/><line x1="0" y1="-4" x2="0" y2="4"/>` +
      `<line x1="${largo}" y1="-4" x2="${largo}" y2="4"/>` +
      `<text x="${(e.largo / 2).toFixed(1)}" y="-8" text-anchor="middle">${esc(e.dice)}</text></g>`,
    `<g class="norte" transform="translate(${ancho - 28} 30)"><path d="M0 -14 L6 6 L0 2 L-6 6 Z"/>` +
      `<text y="20" text-anchor="middle">N</text></g>`,
  );
  const caja = `viewBox="0 0 ${ancho} ${alto}" role="img" aria-hidden="true"`;
  return `<svg class="croquis" ${caja}>${partes.join("")}</svg>`;
}

/** Los colores de El Dorado (`web/src/app/globals.css`), en claro y en oscuro, y los de imprimir, que son en blanco. */
const CLARO =
  "--fondo:#e9ebed;--papel:#fafbfc;--papel-2:#f1f3f5;--tinta:#0e1217;--tinta-suave:#4b535b;--tinta-tenue:#6b747d;" +
  "--raya:rgba(14,18,23,.11);--oro:#c9982a;--oro-fuerte:#7d5a0b;--oro-tinte:rgba(201,152,42,.15);--ojo:#a84e08;" +
  "color-scheme:light";
const OSCURO =
  "--fondo:#0e1217;--papel:#171c22;--papel-2:#1e242c;--tinta:#e9ebed;--tinta-suave:#b9bec4;--tinta-tenue:#8a929b;" +
  "--raya:rgba(233,235,237,.13);--oro:#f0c24b;--oro-fuerte:#f5cf6e;--oro-tinte:rgba(240,194,75,.14);--ojo:#f5a524;" +
  "color-scheme:dark";
const EN_PAPEL =
  "--fondo:#fff;--papel:#fff;--papel-2:#f4f4f2;--tinta:#0e1217;--tinta-suave:#3d444b;--tinta-tenue:#5f676f;" +
  "--raya:rgba(14,18,23,.16);--oro:#c9982a;--oro-fuerte:#7d5a0b;--oro-tinte:rgba(201,152,42,.15);--ojo:#a84e08;" +
  "color-scheme:light";
/** Las letras de El Dorado, si las tiene quien lo abre; si no, las de su familia. */
const LETRAS =
  '--titulos:"Fraunces","Iowan Old Style",Georgia,serif;' +
  '--texto:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  '--numeros:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

const ESTILO = [
  `:root{${CLARO};${LETRAS}}`,
  `@media (prefers-color-scheme:dark){:root{${OSCURO}}}`,
  "*,*::before,*::after{box-sizing:border-box}",
  "html{background:var(--fondo)}",
  "body{margin:0;background:var(--fondo);color:var(--tinta);font:400 15px/1.55 var(--texto);" +
    "-webkit-font-smoothing:antialiased}",
  "h1,h2,h3,p,ul,ol,figure{margin:0;padding:0}ul,ol{list-style:none}a{color:var(--oro-fuerte)}",
  ".cuaderno{max-width:1180px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:24px}",
  ".atras{background:var(--oro-tinte);border:1px solid var(--oro);border-radius:12px;padding:12px 16px}",
  ".doble{display:grid;grid-template-columns:1fr 1fr;background:var(--papel);border-radius:20px;overflow:hidden;" +
    "box-shadow:0 1px 2px rgba(14,18,23,.06),0 12px 40px rgba(14,18,23,.14)}",
  ".doble>.pagina+.pagina{border-left:1px solid var(--raya)}",
  ".pagina{padding:40px 40px 36px;display:flex;flex-direction:column;gap:18px;min-width:0}",
  ".sola{grid-template-columns:1fr}",
  ".lomo{font:500 11px/1.2 var(--numeros);letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-tenue)}",
  "h1{font:400 44px/1.05 var(--titulos);letter-spacing:-.01em}",
  "h2{font:400 30px/1.1 var(--titulos)}",
  "h3{font:italic 400 21px/1.2 var(--titulos)}",
  ".lugar{font-style:italic;font-family:var(--titulos)}",
  ".portada{min-height:520px;justify-content:flex-end}",
  ".portada .entrada{font:400 19px/1.45 var(--titulos);color:var(--tinta-suave);max-width:34em}",
  ".foto-portada{position:relative;min-height:520px;background:var(--papel-2)}",
  ".foto-portada img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}",
  ".foto-portada figcaption{position:absolute;left:12px;bottom:12px;right:12px;font:400 11px/1.3 var(--texto);" +
    "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}",
  ".dato{display:flex;flex-wrap:wrap;gap:8px 18px;color:var(--tinta-suave)}",
  ".num{font-family:var(--numeros);font-size:13px}",
  ".croquis{width:100%;height:auto;background:var(--papel-2);border-radius:14px;border:1px solid var(--raya)}",
  ".croquis .rejilla{stroke:var(--raya);stroke-width:1}",
  ".croquis .tramo{fill:none;stroke:var(--oro);stroke-width:3;stroke-dasharray:2 7;stroke-linecap:round;" +
    "stroke-linejoin:round}",
  ".croquis .punto circle{fill:var(--oro);stroke:var(--papel);stroke-width:3}",
  ".croquis .punto text{font:600 13px var(--numeros);fill:#0e1217}",
  ".croquis .nombre{font:italic 400 15px var(--titulos);fill:var(--tinta);paint-order:stroke;" +
    "stroke:var(--papel-2);stroke-width:4px}",
  ".croquis .casa path{fill:var(--tinta);stroke:var(--papel);stroke-width:2.5;stroke-linejoin:round}",
  ".croquis .escala line{stroke:var(--tinta-suave);stroke-width:1.5}",
  ".croquis .escala text,.croquis .norte text{font:500 11px var(--numeros);fill:var(--tinta-suave)}",
  ".croquis .norte path{fill:var(--tinta-suave)}",
  ".nota{font-size:12.5px;color:var(--tinta-tenue)}",
  ".lista{display:flex;flex-direction:column;gap:10px}",
  ".lista li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:baseline}",
  ".bola{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--oro);" +
    "color:#0e1217;font:600 12px var(--numeros)}",
  ".marcas{display:flex;flex-wrap:wrap;gap:6px}",
  ".marca{font:500 11px/1 var(--texto);padding:5px 8px;border-radius:999px;background:var(--oro-tinte);" +
    "color:var(--oro-fuerte)}",
  ".marca.ojo{background:rgba(168,78,8,.1);color:var(--ojo)}",
  ".parada{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--raya)}",
  ".parada:first-child{border-top:0;padding-top:0}",
  ".parada .cabeza{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:baseline}",
  ".parada figure{border-radius:12px;overflow:hidden;background:var(--papel-2)}",
  ".parada figure img{display:block;width:100%;height:190px;object-fit:cover}",
  ".parada figcaption{font-size:11px;color:var(--tinta-tenue);padding:6px 8px}",
  ".camino{color:var(--tinta-suave);font-size:14px;padding:2px 0 2px 40px;position:relative}",
  '.camino::before{content:"";position:absolute;left:12px;top:-6px;bottom:-6px;border-left:2px dotted var(--oro)}',
  ".tabla{width:100%;border-collapse:collapse;font-size:14px}",
  ".tabla td{text-align:left;padding:8px 10px 8px 0;border-top:1px solid var(--raya);vertical-align:top}",
  ".avisos{font-size:12.5px;color:var(--tinta-tenue);display:flex;flex-direction:column;gap:4px}",
  ".mota{width:8px;height:8px;border-radius:50%;background:var(--oro);margin:7px 0 0 9px}",
  ".reserva{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:1px solid var(--raya)}",
  ".enlaces{display:flex;flex-direction:column;gap:6px;padding-left:12px;border-left:2px solid var(--oro-tinte)}",
  ".ficha{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;background:var(--papel-2);" +
    "font-size:14px}",
  ".ficha .marca{display:inline-block}",
  ".comer{display:flex;flex-direction:column;gap:10px;padding-top:16px;border-top:1px solid var(--raya)}",
  ".datos li{grid-template-columns:18px 1fr}",
  ".pagina h3+.lista{margin-top:-8px}",
  "@media (max-width:820px){.doble{grid-template-columns:1fr}" +
    ".doble>.pagina+.pagina{border-left:0;border-top:1px solid var(--raya)}" +
    ".pagina{padding:28px 20px}h1{font-size:34px}h2{font-size:26px}.portada,.foto-portada{min-height:300px}}",
  "@page{size:A5;margin:12mm}",
  `@media print{:root{${EN_PAPEL}}` +
    "body{font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".cuaderno{max-width:none;padding:0;gap:0}" +
    ".doble{display:block;box-shadow:none;border-radius:0;background:none;break-before:page}" +
    ".cuaderno>.doble:first-child{break-before:auto}.doble.cierre{break-before:auto;margin-top:9mm}" +
    ".pagina{padding:0}.doble>.pagina+.pagina{border:0;margin-top:7mm}" +
    ".foto-portada{min-height:0;height:95mm}.portada{min-height:0;padding-top:1mm}" +
    ".parada,.camino,.reserva,tr,.lista li,.ficha{break-inside:avoid}.camino{break-after:avoid}" +
    ".camino::before{top:0;bottom:0}.parada figure img{height:44mm}" +
    "h1{font-size:26pt}h2{font-size:18pt}h3{font-size:13pt}a{color:inherit;text-decoration:none}" +
    'a[href]::after{content:" (" attr(href) ")";font-size:7pt;word-break:break-all;color:var(--tinta-tenue)}}',
].join("\n");

/** Las fotos ya bajadas, por su dirección: van dentro de la página, para que el documento se lea sin internet. */
export type Incrustadas = Map<string, string>;

/** Un trozo de HTML: su etiqueta, su clase (o ninguna) y lo de dentro, ya escapado. */
const h = (etiqueta: string, clase: string | null, ...dentro: string[]): string =>
  `<${etiqueta}${clase === null ? "" : ` class="${clase}"`}>${dentro.join("")}</${etiqueta}>`;
/** Un texto, escapado, en su etiqueta. */
const t = (etiqueta: string, clase: string | null, texto: string): string => h(etiqueta, clase, esc(texto));
const si = (condicion: boolean, trozo: () => string): string => (condicion ? trozo() : "");

function imagen(f: FotoDelCuaderno, incrustadas: Incrustadas, alt: string): string {
  const src = incrustadas.get(f.url) ?? direccion(f.url);
  return src === null ? "" : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;
}

function enlace(url: string | null, texto: string): string {
  const u = direccion(url);
  if (u === null) return esc(texto);
  return `<a href="${esc(u)}" rel="noopener noreferrer" target="_blank">${esc(texto)}</a>`;
}

/**
 * La página entera del cuaderno: un documento que se basta solo, sin programas, con su estilo dentro, que se lee en
 * la pantalla (en claro o en oscuro, en ancho o en el móvil) y se imprime en A5 en blanco. `atras` pone arriba que
 * el viaje ha cambiado desde que se hizo.
 */
export function pintarCuaderno(c: Cuaderno, o: { incrustadas?: Incrustadas; atras?: boolean } = {}): string {
  const r = rotulosDe(c.idioma);
  const fotos = o.incrustadas ?? new Map<string, string>();
  const largo = (f: string): string => fechaLarga(c.idioma, f);
  /** Un país por su nombre en el idioma del cuaderno; si no se sabe, por sus dos letras. */
  const pais = (codigo: string): string => {
    try {
      return new Intl.DisplayNames([c.idioma], { type: "region" }).of(codigo) ?? codigo;
    } catch {
      return codigo;
    }
  };
  const corta = (f: string): string => fechaCorta(c.idioma, f);
  const precio = (p: PrecioDelCuaderno): string => {
    const cuanto = dinero(c.idioma, p);
    const dice =
      p.segun === "closing"
        ? r.precioAlCerrar(cuanto, largo(p.visto))
        : p.segun === "seen"
          ? r.precio(cuanto, largo(p.visto))
          : r.precioSinConfirmar(cuanto, largo(p.visto), p.segun === "gone");
    return t("p", "num", dice) + si(p.otraHabitacion, () => t("p", "nota", r.otraHabitacion));
  };
  const pie = (f: FotoDelCuaderno): string => t("figcaption", null, r.foto(f.autor, f.licencia));
  const doble = (...paginas: string[]): string => h("section", "doble", ...paginas.map((x) => h("div", "pagina", x)));
  const hojas: string[] = [];
  // Lo de allí: cada precio para quién es, y cada dato con el día en que se vio.
  const visto = (f: FuenteDeUnDato): string => r.visto(largo(f.visto));
  const unPrecio = (p: PrecioDeCapa): string => {
    const edades = p.edades === null ? "" : r.edades(p.edades.desde, p.edades.hasta);
    const cuanto =
      p.cuanto === "free" ? r.gratis : dinero(c.idioma, { total: p.cuanto.importe, moneda: p.cuanto.moneda });
    return `${r.para[p.para] ?? p.para}${edades === "" ? "" : ` (${edades})`}: ${cuanto}`;
  };
  const nota = (texto: string): string => t("span", "nota", texto);
  /** Unos precios, ya en HTML, con su día: una vez al final si todos se vieron el mismo día, o cada uno el suyo. */
  const losPrecios = (ps: PrecioDeCapa[]): string => {
    const dias = new Set(ps.map((p) => p.fuente.visto));
    if (dias.size <= 1)
      return esc(ps.map(unPrecio).join("; ")) + (ps.length > 0 ? ` ${nota(`(${visto(ps[0].fuente)})`)}` : "");
    return ps.map((p) => `${esc(unPrecio(p))} ${nota(`(${visto(p.fuente)})`)}`).join("; ");
  };
  /** La entrada y el horario de una parada ese día, de los datos del viaje: lo que no se sabe no sale. */
  const laEntrada = (p: ParadaDelCuaderno): string => {
    const e = p.entrada ?? null;
    if (e === null) return "";
    const filas: string[] = [];
    if (e.precios !== null && e.precios.length > 0)
      filas.push(h("p", null, t("b", null, `${r.entrada}. `), losPrecios(e.precios)));
    if (e.abre === true && e.franjas.length > 0 && e.horario !== null)
      filas.push(
        h(
          "p",
          null,
          esc(r.abre(e.franjas.map((f) => r.deA(f.abre, f.cierra)).join(", "))),
          " ",
          nota(`(${visto(e.horario.fuente)})`),
        ),
      );
    else if (e.abre === false && e.horario !== null)
      filas.push(h("p", null, t("span", "marca ojo", r.cierraEseDia), " ", nota(`(${visto(e.horario.fuente)})`)));
    const enlaces = [
      e.reservar?.haceFalta === true && e.reservar.donde !== null ? enlace(e.reservar.donde, r.reservarEn) : "",
      e.web === null ? "" : enlace(e.web, r.webDelSitio),
    ].filter((x) => x !== "");
    if (e.reservar?.haceFalta === true && p.reservar !== true)
      filas.push(h("p", null, t("span", "marca ojo", r.reservar), " ", nota(`(${visto(e.reservar.fuente)})`)));
    if (enlaces.length > 0) filas.push(h("p", null, enlaces.join(", ")));
    return filas.length === 0 ? "" : h("div", "ficha", ...filas);
  };

  // La portada, con la foto de lo que no hay que perderse si la hay.
  const portada =
    t("p", "lomo", r.guia) +
    t("h1", null, c.portada.titulo) +
    t("p", "lugar", r.deTuViaje(c.destino.nombre)) +
    t("p", "entrada", c.portada.entrada) +
    h(
      "p",
      "dato",
      t("span", null, r.fechas(largo(c.entrada), largo(c.salida), c.noches)),
      t("span", null, r.viajeros(c.adultos, c.ninos)),
    ) +
    h("div", "avisos", t("p", null, c.avisos.ia), t("p", null, r.hecha(largo(c.hecha), c.version)));
  const fp = c.portada.foto;
  hojas.push(
    fp === null
      ? h("section", "doble sola", h("div", "pagina portada", portada))
      : h(
          "section",
          "doble",
          h("figure", "foto-portada", imagen(fp, fotos, c.destino.nombre), pie(fp)),
          h("div", "pagina portada", portada),
        ),
  );

  // El viaje de un vistazo: todos los días en un croquis, y la lista.
  const todas = c.dias.flatMap((d) => d.paradas);
  let i = 0;
  const grupos = c.dias.map((d) => d.paradas.map(() => i++));
  const marcasDe = (ps: ParadaDelCuaderno[]) => ps.map((p) => ({ n: p.n, punto: p.punto, nombre: p.nombre }));
  const duerme = c.duermes?.punto ?? null;
  const vistazo = croquis(c.idioma, marcasDe(todas), duerme, { etiquetas: todas.length <= 10, grupos });
  const losDias = c.dias.map((d) =>
    h(
      "li",
      null,
      t("span", "num", String(d.n)),
      h(
        "div",
        null,
        t("h3", null, d.titulo),
        h(
          "p",
          "dato",
          t("span", null, corta(d.fecha)),
          t("span", null, d.paradas.length === 0 ? r.libre : r.paradas(d.paradas.length)),
        ),
        si(d.paradas.length > 0, () => t("p", "lugar", d.paradas.map((p) => p.nombre).join(", "))),
      ),
    ),
  );
  const dondeDuermes =
    c.duermes === null
      ? ""
      : h(
          "div",
          null,
          t("p", "lomo", r.duermes),
          t("h3", null, c.duermes.nombre),
          c.duermes.zona === null ? "" : t("p", "lugar", c.duermes.zona),
        );
  hojas.push(
    doble(
      t("p", "lomo", r.deUnVistazo) + t("h2", null, c.destino.nombre) + vistazo + t("p", "nota", r.mapaSin),
      h("ol", "lista", ...losDias) + dondeDuermes,
    ),
  );

  // Lo de allí: cómo moverte y antes de ir, si el viaje lo sabe. Lo que no sabe no se nombra.
  const mv = c.moverse ?? null;
  const moverte: string[] = [];
  if (mv !== null) {
    if (mv.llegar.length > 0)
      moverte.push(
        t("h3", null, r.llegar),
        h(
          "ul",
          "lista datos",
          ...mv.llegar.map((x) => {
            const desde = r.desde(x.desde.nombre ?? r.deDonde[x.desde.clase]);
            const partes = [
              r.modo[x.modo] ?? x.modo,
              x.minutos === null ? "" : r.minutos(x.minutos),
              x.hastaLas === null ? "" : r.hastaLas(x.hastaLas),
            ].filter((y) => y !== "");
            return h(
              "li",
              null,
              h("span", "mota"),
              h(
                "div",
                null,
                h("p", null, t("b", null, desde), esc(`. ${partes.join(", ")}`)),
                x.precios === null || x.precios.length === 0
                  ? h("p", null, nota(visto(x.fuente)))
                  : h("p", null, losPrecios(x.precios)),
              ),
            );
          }),
        ),
      );
    if (mv.transportes.length > 0)
      moverte.push(
        t("h3", null, r.transportes),
        h(
          "ul",
          "lista datos",
          ...mv.transportes.map((x) =>
            h(
              "li",
              null,
              h("span", "mota"),
              h(
                "p",
                null,
                t("b", null, r.modo[x.modo] ?? x.modo),
                x.hastaLas === null ? "" : esc(`, ${r.hastaLas(x.hastaLas)}`),
                " ",
                nota(`(${visto(x.fuente)})`),
              ),
            ),
          ),
        ),
      );
    if (mv.billetes.length > 0)
      moverte.push(
        t("h3", null, r.billetes),
        h(
          "ul",
          "lista datos",
          ...mv.billetes.map((x) => {
            const cuanto = r.deTantos(x.dias, x.viajes);
            const modos = x.modos.map((y) => r.modo[y] ?? y).join(", ");
            return h(
              "li",
              null,
              h("span", "mota"),
              h(
                "div",
                null,
                h(
                  "p",
                  null,
                  t("b", null, r.billete[x.clase] ?? x.clase),
                  esc(
                    [cuanto, modos]
                      .filter((y) => y !== "")
                      .map((y) => `, ${y}`)
                      .join(""),
                  ),
                ),
                x.precios === null || x.precios.length === 0
                  ? h("p", null, nota(visto(x.fuente)))
                  : h("p", null, losPrecios(x.precios)),
              ),
            );
          }),
        ),
      );
    if (mv.pagos.length > 0)
      moverte.push(
        t("h3", null, r.pagos),
        h(
          "p",
          null,
          esc(mv.pagos.map((x) => r.pago[x.clase] ?? x.clase).join(", ")),
          " ",
          nota(`(${[...new Set(mv.pagos.map((x) => visto(x.fuente)))].join(", ")})`),
        ),
      );
    if (mv.coche !== null)
      moverte.push(h("p", null, t("b", null, r.coche(mv.coche.haceFalta)), " ", nota(`(${visto(mv.coche.fuente)})`)));
  }
  // Lo que te conviene para moverte: la cuenta del código, la misma de «moverte allí» (14.6).
  const cv = mv === null ? null : (c.conviene ?? null);
  if (cv !== null) {
    const enDinero = (n: number, moneda: string | null): string =>
      moneda === null ? String(n) : dinero(c.idioma, { total: n, moneda });
    const filas: string[] = [];
    // Los que solo se hacen en coche no llevan billete: se dice, y lo que cuesta el coche no se inventa.
    const enCoche = cv.soloEnCoche > 0 ? t("p", "nota", r.soloEnCoche(cv.soloEnCoche, cv.viajes > 0)) : null;
    if (cv.viajes === 0) filas.push(enCoche ?? t("p", null, r.convieneNada));
    else {
      filas.push(t("p", "nota", r.tusTrayectos(cv.viajes, cv.dias)));
      if (enCoche !== null) filas.push(enCoche);
      const adultos = cv.personas.filter((x) => x.edad === null).length;
      const personas = cv.personas.filter(
        (x, i) => x.edad !== null || cv.personas.findIndex((y) => y.edad === null) === i,
      );
      filas.push(
        h(
          "ul",
          "lista datos",
          ...personas.map((x) => {
            const quien = x.edad === null ? r.cadaAdulto(adultos) : r.unNino(x.edad);
            // Con billetes sueltos, basta con decirlo; con un abono o una mezcla, lo que se compra.
            const compras =
              x.conviene === "singles"
                ? ""
                : x.compras
                    .map((y) => {
                      const cuanto = r.deTantos(y.dias, y.viajes);
                      const billete = `${r.billete[y.clase] ?? y.clase}${cuanto === "" ? "" : ` (${cuanto})`}`;
                      return y.cuantos === 1 ? billete : `${y.cuantos} × ${billete}`;
                    })
                    .join(" + ");
            return h(
              "li",
              null,
              h("span", "mota"),
              h(
                "p",
                null,
                t("b", null, quien),
                esc(
                  x.total === null
                    ? `: ${r.convieneNoSe}`
                    : [`: ${r.conviene[x.conviene]}`, compras, enDinero(x.total, x.moneda)]
                        .filter((y) => y !== "")
                        .join(", "),
                ),
              ),
            );
          }),
        ),
      );
      if (cv.total !== null) {
        const cuantos = cv.personas.length;
        const ahorro =
          cv.sueltos !== null && cv.ahorra !== null && cv.ahorra > 0
            ? `. ${r.frenteASueltos(enDinero(cv.sueltos, cv.moneda), enDinero(cv.ahorra, cv.moneda))}`
            : "";
        filas.push(
          h(
            "p",
            null,
            t("b", null, r.paraElGrupo(enDinero(cv.total, cv.moneda), cuantos)),
            esc(ahorro),
            cv.fuentes.length > 0 ? ` ${nota(`(${[...new Set(cv.fuentes.map((f) => visto(f)))].join(", ")})`)}` : "",
          ),
        );
      } else filas.push(t("p", null, r.convieneNoSe));
    }
    moverte.push(t("h3", null, r.teConviene), ...filas);
  }
  const saber = c.saber ?? [];
  const gruposDeSaber: string[] = [];
  for (const grupo of Object.keys(r.claseDelDestino) as (keyof typeof r.claseDelDestino)[]) {
    const suyas = saber.filter((x) => GRUPO_DEL_DESTINO[x.clase] === grupo);
    if (suyas.length === 0) continue;
    gruposDeSaber.push(
      t("h3", null, r.claseDelDestino[grupo]),
      h(
        "ul",
        "lista datos",
        ...suyas.map((x) =>
          h(
            "li",
            null,
            h("span", "mota"),
            h(
              "div",
              null,
              h("p", null, x.nombre === null ? "" : t("b", null, `${x.nombre}. `), esc(x.frase)),
              h(
                "p",
                null,
                x.cuesta === null
                  ? ""
                  : esc(
                      `${r.cuesta(
                        dinero(c.idioma, { total: x.cuesta.desde, moneda: x.cuesta.moneda }),
                        dinero(c.idioma, { total: x.cuesta.hasta, moneda: x.cuesta.moneda }),
                      )} `,
                    ),
                nota(`(${visto(x.fuente)})`),
              ),
            ),
          ),
        ),
      ),
    );
  }
  const deMoverte =
    moverte.length === 0 ? "" : t("p", "lomo", c.destino.nombre) + t("h2", null, r.comoMoverte) + moverte.join("");
  const deSaber =
    gruposDeSaber.length === 0
      ? ""
      : t("p", "lomo", c.destino.nombre) + t("h2", null, r.antesDeIr) + gruposDeSaber.join("");
  if (deMoverte !== "" && deSaber !== "") hojas.push(doble(deMoverte, deSaber));
  else if (deMoverte !== "" || deSaber !== "")
    hojas.push(h("section", "doble sola", h("div", "pagina", deMoverte + deSaber)));

  // Una doble página por día: a la izquierda, su croquis y sus paradas; a la derecha, lo que se cuenta.
  for (const d of c.dias) {
    const lista = d.paradas.map((p) =>
      h(
        "li",
        null,
        t("span", "bola", String(p.n)),
        h("div", null, t("span", "lugar", p.nombre), " ", t("span", "num", r.minutos(p.minutos))),
      ),
    );
    // Un día sin paradas, el libre, no lleva croquis ni lista: su título y lo que se cuenta, y dónde comer si lo hay.
    const sinParadas = d.paradas.length === 0;
    const izquierda =
      h("p", "lomo", esc(r.dia(d.n)), " ", t("span", "num", corta(d.fecha))) +
      t("h2", null, d.titulo) +
      si(sinParadas, () => h("p", "dato", t("span", null, r.libre))) +
      t("p", null, d.entrada) +
      si(!sinParadas, () => croquis(c.idioma, marcasDe(d.paradas), duerme) + t("p", "nota", r.mapaSin)) +
      si(!sinParadas, () => h("ol", "lista", ...lista));
    const piezas: string[] = [];
    const tramoA = new Map(d.tramos.map((x) => [x.a, x]));
    for (const p of d.paradas) {
      const x = tramoA.get(p.id);
      if (x !== undefined) {
        const lejos = metros(c.idioma, x.metros);
        const cuanto = x.aPie ? r.andando(x.minutos, lejos) : r.enCoche(x.minutos, lejos);
        const desde = x.de === "stay" ? `${r.desdeDondeDuermes}. ` : "";
        const numeros = `(${cuanto}${x.aproximado ? `, ${r.aproximado}` : ""})`;
        piezas.push(h("p", "camino", esc(`${desde}${x.dice} `), t("span", "num", numeros)));
      }
      const hora = p.mejorHora === null ? undefined : r.hora[p.mejorHora];
      const marcas =
        si(p.imprescindible, () => t("span", "marca", r.imprescindible)) +
        si(hora !== undefined, () => t("span", "marca", hora!)) +
        si(p.reservar === true, () => t("span", "marca ojo", r.reservar));
      piezas.push(
        h(
          "article",
          "parada",
          h("div", "cabeza", t("span", "bola", String(p.n)), t("h3", null, p.nombre)),
          si(marcas !== "", () => h("div", "marcas", marcas)),
          p.foto === null ? "" : h("figure", null, imagen(p.foto, fotos, p.nombre), pie(p.foto)),
          t("p", null, p.que),
          t("p", null, p.porQue),
          t("p", null, p.cuando),
          laEntrada(p),
        ),
      );
    }
    const comer = d.comer ?? [];
    if (comer.length > 0) {
      const nombres = new Map(d.paradas.map((p) => [p.id, p.nombre]));
      piezas.push(
        h(
          "section",
          "comer",
          t("p", "lomo", r.dondeComer),
          d.comerDice == null ? "" : t("p", null, d.comerDice),
          h(
            "ul",
            "lista datos",
            ...comer.map((x) =>
              h(
                "li",
                null,
                h("span", "mota"),
                h(
                  "div",
                  null,
                  h("p", null, x.cosa.nombre === null ? "" : t("b", null, `${x.cosa.nombre}. `), esc(x.cosa.frase)),
                  h(
                    "p",
                    null,
                    nota(
                      `${r.cerca(metros(c.idioma, x.metros), nombres.get(x.cerca) ?? "")} (${visto(x.cosa.fuente)})`,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    if (sinParadas && piezas.length === 0) hojas.push(h("section", "doble sola", h("div", "pagina", izquierda)));
    else hojas.push(doble(izquierda, piezas.join("")));
  }

  // Dónde se duerme y cómo se llega, y dónde se reserva.
  const delViaje: string[] = [];
  if (c.duermes !== null) {
    const x = c.duermes;
    delViaje.push(
      h(
        "div",
        null,
        t("p", "lomo", r.duermes),
        t("h2", null, x.nombre),
        h(
          "p",
          "dato",
          x.zona === null ? "" : t("span", "lugar", x.zona),
          x.estrellas === null ? "" : t("span", null, r.estrellas(x.estrellas)),
          x.habitacion === null ? "" : t("span", null, `${r.habitacion}: ${x.habitacion}`),
          t("span", null, r.noches(c.noches)),
        ),
        precio(x.precio),
      ),
    );
  }
  if (c.llegas !== null) {
    const x = c.llegas;
    delViaje.push(
      h(
        "div",
        null,
        t("p", "lomo", r.llegas),
        h("h2", null, esc(r.transporte[x.clase] ?? x.clase), " ", t("span", "num", `${x.de} ${x.a}`)),
        h(
          "p",
          "dato",
          t("span", null, `${r.ida}: ${largo(x.sale)}`),
          x.vuelve === null ? "" : t("span", null, `${r.vuelta}: ${largo(x.vuelve)}`),
          x.escalas === null ? "" : t("span", null, r.escalas(x.escalas)),
        ),
        precio(x.precio),
        si(x.guardado, () => t("p", "nota", r.guardado)),
      ),
    );
  }
  if (c.total !== null) {
    const x = c.total;
    delViaje.push(
      h(
        "div",
        null,
        t("p", "lomo", r.total),
        t("p", "num", dinero(c.idioma, x)),
        si(x.segun === "unknown", () => t("p", "nota", r.totalSinConfirmar)),
      ),
    );
  }
  const reservas = si(c.reservas.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.reservas),
      ...c.reservas.map((x) => {
        const que = x.que === "stay" ? x.nombre : `${r.transporte[c.llegas?.clase ?? "flight"] ?? ""} ${x.nombre}`;
        const enlaces = x.enlaces.map((e) => {
          const rotulo =
            e.clase === "other_seller" && e.vendedor !== null
              ? `${r.enlaceDe[e.clase]}: ${e.vendedor}`
              : r.enlaceDe[e.clase];
          return h(
            "li",
            null,
            h("p", null, enlace(e.url, rotulo)),
            e.precio === null ? "" : t("p", "num", r.otroPrecio(dinero(c.idioma, e.precio), largo(e.precio.visto))),
            si(e.comprobado === "unchecked", () => t("p", "nota", r.sinComprobar)),
          );
        });
        return h(
          "div",
          "reserva",
          h("div", null, t("h3", null, que), precio(x.precio)),
          h(
            "ul",
            "enlaces",
            ...enlaces,
            si(x.enlaces.length === 0, () => h("li", null, t("p", "nota", r.sinEnlace))),
            si(x.caidos > 0, () => h("li", null, t("p", "nota", r.caidos(x.caidos)))),
          ),
        );
      }),
      t("p", "nota", r.reservaEn),
    ),
  );

  // Lo que hay que llevar hecho, con su plazo; y los papeles, con los suyos. De qué va cada cosa lo dicen los datos.
  // Un papel se dice con su país por su nombre y con cómo está: «no está claro» no es lo mismo que «hay que hacerlo».
  const deQueVa = (d: DeQueVa): string => {
    if (d.clase === "book_ahead") return `${d.nombre}. ${r.reservar}`;
    if (d.clase === "dates") return d.nombre;
    const pregunta = (r.pregunta as Record<string, string>)[d.pregunta] ?? d.pregunta;
    const estado = (r.estado as Record<string, string>)[d.estado];
    return `${pregunta}, ${pais(d.pais)}${estado === undefined ? "" : `. ${estado}`}`;
  };
  const antes = si(c.antes.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.antes),
      h(
        "ul",
        "lista",
        ...c.antes.map((a) =>
          h(
            "li",
            null,
            t("span", "bola", String(a.item + 1)),
            h(
              "div",
              null,
              a.de === null ? "" : h("p", null, t("b", null, deQueVa(a.de))),
              t("p", null, a.dice),
              a.plazo === null ? "" : t("p", "num", largo(a.plazo)),
            ),
          ),
        ),
      ),
    ),
  );
  let papeles = "";
  if (c.papeles !== null) {
    const { viajeros, casillas } = c.papeles;
    const filas = casillas.map((x) => {
      const quien = viajeros[x.viajero];
      const plazo = [
        x.hasta === null ? "" : r.hasta(largo(x.hasta)),
        x.antesDe === null ? "" : r.antesDe(largo(x.antesDe), x.tarde),
      ]
        .filter((s) => s !== "")
        .join(". ");
      const deQuien =
        quien === undefined
          ? r.paraEntrar(pais(x.pais))
          : `${r.viajero(pais(quien.pasaporte), quien.edad, quien.cuantos)}. ${r.paraEntrar(pais(x.pais))}`;
      return h(
        "tr",
        null,
        h("td", null, esc(r.pregunta[x.pregunta] ?? x.pregunta), "<br>", t("span", "nota", deQuien)),
        t("td", null, r.estado[x.estado] ?? x.estado),
        t("td", null, plazo),
      );
    });
    papeles = h(
      "div",
      null,
      t("p", "lomo", r.papeles),
      t("p", "nota", r.papelesSub),
      filas.length === 0 ? t("p", null, r.estado.in_order) : h("table", "tabla", h("tbody", null, ...filas)),
    );
  }
  hojas.push(doble(delViaje.join("") + reservas, antes + papeles));

  // Lo que no se sabe, las fuentes y las fotos con sus autores, y los avisos con la fecha de los precios.
  const noSeSabe = si(c.noSeSabe.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.noSeSabe),
      h("ul", "lista", ...c.noSeSabe.map((x) => h("li", null, h("span", "mota"), t("p", null, x)))),
    ),
  );
  const creditos = todas.map((p) => {
    const autoria = p.foto === null ? "" : r.foto(p.foto.autor, p.foto.licencia);
    const foto = p.foto === null ? "" : `. ${p.foto.pagina === null ? esc(autoria) : enlace(p.foto.pagina, autoria)}`;
    const fuente = `. ${esc(r.fuente)}: ${enlace(p.fuente.enlace, p.fuente.nombre)}`;
    return h("li", null, t("span", "num", String(p.n)), h("p", null, t("span", "lugar", p.nombre), fuente, foto));
  });
  const avisos = h(
    "div",
    "avisos",
    t("p", null, c.avisos.ia),
    t("p", null, c.avisos.precios),
    c.preciosDel === null ? "" : t("p", null, r.preciosVistos(largo(c.preciosDel))),
    t("p", null, r.hecha(largo(c.hecha), c.version)),
  );
  const deAlli = fuentesDeAlli(c);
  const fuentesDeAlliHtml =
    deAlli.length === 0
      ? ""
      : t("h3", null, r.deAlli) +
        h(
          "ul",
          "lista",
          ...deAlli.map((f) =>
            h(
              "li",
              null,
              h("span", "mota"),
              h("p", null, enlace(f.url, new URL(f.url).host), " ", nota(`(${visto(f)})`)),
            ),
          ),
        );
  const fuentes = h("div", null, t("p", "lomo", r.creditos), h("ul", "lista", ...creditos), fuentesDeAlliHtml);
  hojas.push(h("section", "doble cierre", h("div", "pagina", noSeSabe + fuentes), h("div", "pagina", avisos)));

  const aviso = o.atras === true ? `<p class="atras" role="status">${esc(r.atras)}</p>` : "";
  const csp = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'";
  return (
    `<!doctype html><html lang="${esc(c.idioma)}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="referrer" content="no-referrer">` +
    `<title>${esc(`${r.guia}: ${c.destino.nombre}`)}</title><style>${ESTILO}</style></head>` +
    `<body><main class="cuaderno">${aviso}${hojas.join("")}</main></body></html>`
  );
}
