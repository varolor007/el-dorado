// La puerta 11: ¿cada manera de moverse, con su precio y su página? Lo que el código puede medir de lo que entrega el
// de moverse, sobre su entrega tal cual (en inglés, como su contrato), antes de pasarla a la forma del viaje:
//
// - que sea su entrega, con sus campos y nada más, y cada lista bajo su tope;
// - que cada manera, cada transporte, cada billete, cada pago y cada precio diga su página (https, de fuera) y el día
//   en que se vio, que es el de hoy; que la página se abrió de verdad lo mira la puerta de todos, con la memoria de lo
//   consultado, antes que esta (RM1);
// - que cada precio lleve su importe con su moneda, o «free», sin aproximar (RM2, RM3): un número, no un texto, ni
//   cero, ni con más de dos decimales; y que una lista de precios vacía no haga de «no se sabe»;
// - que lo que no se sabe esté dicho: sin billetes con precio, sin manera de llegar o sin saber por dónde se llega,
//   alguna frase en `unknowns`;
// - que ninguna frase prometa ni diga qué es lo mejor (RM4), y que cada número de una frase esté en sus datos (RM7);
// - que haya al menos una manera de ir de donde se llega a donde se duerme, o diga por qué no (RM5), y que todo vaya
//   a zonas y bases de la ruta (RM6);
// - y lo que el viaje comprueba de esta capa (`pegasDeMoverse`), con las zonas de la ruta.
//
// Lo que no puede medir: si una página es de verdad la del operador, el aeropuerto o el ayuntamiento, y no una que
// repite sus tarifas; si un precio es el que dice la página; si una manera de llegar existe o está al día; si falta
// un billete o una manera que la página sí trae. Eso lo cubre el banco, con casos de verdad.

import {
  BILLETES,
  DE_DONDE_SE_LLEGA,
  DE_LO_MEJOR,
  DIAS_DE_HOLGURA,
  DIAS_DE_UN_ABONO,
  LO_MAS_DE_MOVERSE,
  MODOS_DE_MOVERSE,
  PAGOS,
  POR_QUE_NO_SE_LLEGA,
} from "../data/capa_moverse.ts";
import { PARA_QUIEN, LETRAS_DE_UN_NOMBRE } from "../data/capas.ts";
import { FRASE_DEL_VIAJERO } from "../data/viaje.ts";
import { enlaceDeFuera } from "../launcher/consultado.ts";
import { pegasDeMoverse } from "../output/capas.ts";
import { paraEnsenarMoverse, type EntregaDeMoverse } from "../scripts/capa_moverse.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { numerosDe, numerosDeMas, pegaDeNombreDeFuera, pegasDeFrases, pegasDelTexto } from "./textos.ts";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const SIN_SABER = "unknown";
const esFecha = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const esHora = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
const diaDe = (fecha: string): number => Math.round(Date.parse(`${fecha}T00:00:00Z`) / 86_400_000);

/** Lo que la puerta sabe del viaje: hoy, las zonas y las bases de la ruta, y por dónde se llega si se sabe. */
export type ParaMoverse = {
  hoy: string;
  zonas: string[];
  bases: string[];
  /** El aeropuerto por el que se llega, si lo sabe la casa; si no, null. */
  llegada: string | null;
};

/** Los campos de la entrega, ni uno más ni uno menos. */
const CAMPOS = [
  "seat",
  "arrivals",
  "no_arrival",
  "transport",
  "tickets",
  "payment",
  "car_needed",
  "between_bases",
  "unknowns",
];

export function puertaMoverse(v: unknown, p: ParaMoverse): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  if (v.seat !== "getting-around") rojo("seat", "no es la entrega del de moverse");
  for (const c of CAMPOS) if (!(c in v)) rojo(c, "falta: una lista vacía o «unknown» también se dicen");
  for (const c of Object.keys(v)) if (!CAMPOS.includes(c)) rojo(c, "no es un campo de su entrega");
  const lista = (campo: keyof typeof LO_MAS_DE_MOVERSE): unknown[] => {
    const x = v[campo];
    if (!Array.isArray(x)) {
      if (campo in v) rojo(campo, "no es una lista");
      return [];
    }
    if (x.length > LO_MAS_DE_MOVERSE[campo])
      rojo(campo, `son ${x.length}, y caben ${LO_MAS_DE_MOVERSE[campo]} como mucho`);
    return x;
  };
  const llegadas = lista("arrivals");
  const transportes = lista("transport");
  const billetes = lista("tickets");
  const pagos = lista("payment");
  const entreBases = lista("between_bases");

  // Los números que da, para buscar después los de sus frases.
  const dados = new Set<number>();
  const apunta = (n: unknown): void => void (typeof n === "number" && Number.isFinite(n) && dados.add(n));
  const apuntaHora = (h: unknown): void => {
    if (typeof h === "string") for (const n of numerosDe(h)) dados.add(n);
  };

  // La página y el día de cualquier dato (RM1, RM2).
  const fuente = (x: Objeto, donde: string): void => {
    if (!enlaceDeFuera(x.source))
      rojo(`${donde}.source`, "no dice la página que abrió, una dirección https de fuera, en su forma normal (RM1)");
    if (!esFecha(x.seen)) rojo(`${donde}.seen`, "no dice el día en que se vio, YYYY-MM-DD (RM2)");
    else if (Math.abs(diaDe(x.seen) - diaDe(p.hoy)) > DIAS_DE_HOLGURA)
      rojo(`${donde}.seen`, `no es hoy, ${p.hoy}: un precio es el del día en que se vio (RM2)`);
  };
  const modo = (x: unknown, donde: string): void => {
    if (!(MODOS_DE_MOVERSE as readonly unknown[]).includes(x)) rojo(donde, "no es una manera de su lista");
  };
  const minutos = (x: unknown, donde: string): void => {
    if (x === SIN_SABER) return;
    if (!(typeof x === "number" && Number.isInteger(x) && x > 0 && x < 24 * 60))
      rojo(donde, "no son unos minutos enteros, los de la página, ni unknown (RM3)");
    else apunta(x);
  };
  const hasta = (x: unknown, donde: string): void => {
    if (x !== SIN_SABER && !esHora(x)) rojo(donde, "no es una hora, HH:MM o 24:00, ni unknown");
    else apuntaHora(x);
  };
  // Los precios: una lista de importes con su moneda o «free», cada uno con su página; o «unknown» (RM2, RM3).
  const precios = (x: unknown, donde: string): boolean => {
    if (x === SIN_SABER) return false;
    if (!Array.isArray(x)) {
      rojo(donde, "no es una lista de precios, ni unknown");
      return false;
    }
    if (x.length === 0) rojo(donde, "una lista vacía no dice nada: lo que no se encontró es unknown (RM3)");
    x.forEach((q, i) => {
      const aqui = `${donde}[${i}]`;
      if (!esObjeto(q)) return rojo(aqui, "no es un precio");
      if (!(PARA_QUIEN as readonly unknown[]).includes(q.for))
        rojo(`${aqui}.for`, "no dice para quién es, de su lista");
      if (q.ages !== null) {
        const a = q.ages as Objeto;
        const edad = (n: unknown): boolean =>
          n === null || (Number.isInteger(n) && (n as number) >= 0 && (n as number) < 130);
        if (!esObjeto(a) || !edad(a.from) || !edad(a.to) || (a.from === null && a.to === null))
          rojo(`${aqui}.ages`, "no son unas edades, de un número entero a otro, ni null");
        else if (a.from !== null && a.to !== null && (a.from as number) > (a.to as number))
          rojo(`${aqui}.ages`, "las edades van al revés");
        else {
          apunta(a.from);
          apunta(a.to);
        }
      }
      if (q.amount === "free") {
        if (q.currency !== null) rojo(`${aqui}.currency`, "lo que es gratis no lleva moneda: null");
      } else if (typeof q.amount !== "number" || !Number.isFinite(q.amount) || q.amount <= 0)
        rojo(`${aqui}.amount`, "no es un importe de la página, más que cero, ni free (RM3)");
      else if (Math.abs(Math.round(q.amount * 100) - q.amount * 100) > 1e-6)
        rojo(`${aqui}.amount`, "lleva más de dos decimales: no es el de la página, es una cuenta (RM9)");
      else {
        apunta(q.amount);
        if (typeof q.currency !== "string" || !/^[A-Z]{3}$/.test(q.currency))
          rojo(`${aqui}.currency`, "no lleva su moneda, en sus tres letras mayúsculas (RM2)");
      }
      fuente(q, aqui);
    });
    return x.length > 0;
  };

  // De donde se llega a donde se duerme (RM5, RM6, RM8).
  llegadas.forEach((x, i) => {
    const donde = `arrivals[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    const de = x.from;
    if (!esObjeto(de) || !(DE_DONDE_SE_LLEGA as readonly unknown[]).includes(de.kind))
      rojo(`${donde}.from`, "no dice de dónde se llega: airport, station o port");
    else {
      if (de.code !== SIN_SABER) {
        const bien =
          typeof de.code === "string" &&
          (de.kind === "airport" ? /^[A-Z]{3}$/.test(de.code) : /^[A-Z0-9]{2,8}$/.test(de.code));
        if (!bien) rojo(`${donde}.from.code`, "no es un código de la página (un aeropuerto, tres letras), ni unknown");
      }
      if (de.name !== SIN_SABER) {
        if (typeof de.name !== "string" || de.name.trim() === "" || de.name.length > LETRAS_DE_UN_NOMBRE)
          rojo(`${donde}.from.name`, `no es un nombre de ${LETRAS_DE_UN_NOMBRE} letras como mucho, ni unknown (RM8)`);
        else if (pegaDeNombreDeFuera(de.name) !== null)
          rojo(`${donde}.from.name`, `el nombre ${pegaDeNombreDeFuera(de.name)}: es solo el nombre (RM8)`);
      }
    }
    if (typeof x.to_zone !== "string" || !p.zonas.includes(x.to_zone))
      rojo(`${donde}.to_zone`, "no es una zona de la ruta, por su id (RM6)");
    modo(x.mode, `${donde}.mode`);
    minutos(x.minutes, `${donde}.minutes`);
    precios(x.prices, `${donde}.prices`);
    hasta(x.until, `${donde}.until`);
    fuente(x, donde);
  });
  if (!(v.no_arrival === null || (POR_QUE_NO_SE_LLEGA as readonly unknown[]).includes(v.no_arrival)))
    rojo("no_arrival", "no es null, ni un porqué de su lista: not_found o no_public_way (RM5)");
  if (llegadas.length === 0 && v.no_arrival === null)
    rojo("arrivals", "no hay ninguna manera de ir de donde se llega a donde se duerme, ni dice por qué (RM5)");
  if (llegadas.length > 0 && v.no_arrival !== null)
    rojo("no_arrival", "dice que no se llega, y trae maneras de llegar");

  // Lo que hay allí.
  transportes.forEach((x, i) => {
    const donde = `transport[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    modo(x.mode, `${donde}.mode`);
    if (
      !Array.isArray(x.zones) ||
      x.zones.length === 0 ||
      !x.zones.every((z) => typeof z === "string" && p.zonas.includes(z)) ||
      new Set(x.zones).size !== x.zones.length
    )
      rojo(`${donde}.zones`, "no son zonas de la ruta, por su id, al menos una y sin repetir (RM6)");
    hasta(x.until, `${donde}.until`);
    fuente(x, donde);
  });

  // Los billetes y los abonos, cada uno con lo que es.
  let conPrecio = 0;
  const vistos = new Set<string>();
  billetes.forEach((x, i) => {
    const donde = `tickets[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    const clase = x.kind;
    if (!(BILLETES as readonly unknown[]).includes(clase))
      rojo(`${donde}.kind`, "no es una clase de billete de su lista");
    const dias = x.days;
    const viajes = x.rides;
    const entero = (n: unknown, desde: number, hasta: number): boolean =>
      Number.isInteger(n) && (n as number) >= desde && (n as number) <= hasta;
    if (clase === "day_pass" && dias !== 1) rojo(`${donde}.days`, "un abono de un día vale 1 día");
    else if (clase === "multi_day_pass" && !entero(dias, 2, DIAS_DE_UN_ABONO))
      rojo(`${donde}.days`, `un abono de varios días vale de 2 a ${DIAS_DE_UN_ABONO} días`);
    else if (clase !== "day_pass" && clase !== "multi_day_pass" && dias !== null)
      rojo(`${donde}.days`, "solo un abono dice cuántos días vale: null");
    if (clase === "multi_ride" && !entero(viajes, 2, 100)) rojo(`${donde}.rides`, "un bono da 2 viajes o más");
    else if (clase === "single" && viajes !== null && viajes !== 1 && viajes !== 2)
      rojo(`${donde}.rides`, "un billete suelto es de un viaje (o de ida y vuelta, 2), o null");
    else if (clase !== "multi_ride" && clase !== "single" && viajes !== null)
      rojo(`${donde}.rides`, "solo un bono o un suelto dicen sus viajes: null");
    apunta(dias);
    apunta(viajes);
    if (
      !Array.isArray(x.modes) ||
      x.modes.length === 0 ||
      !x.modes.every((m) => (MODOS_DE_MOVERSE as readonly unknown[]).includes(m))
    )
      rojo(`${donde}.modes`, "no dice lo que cubre, al menos una manera de su lista");
    const clave = JSON.stringify([clase, dias, viajes, Array.isArray(x.modes) ? [...x.modes].sort() : x.modes]);
    if (vistos.has(clave)) rojo(donde, "el mismo billete sale dos veces: sus precios van juntos, en uno");
    vistos.add(clave);
    if (precios(x.prices, `${donde}.prices`)) conPrecio++;
    fuente(x, donde);
  });
  pagos.forEach((x, i) => {
    const donde = `payment[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    if (!(PAGOS as readonly unknown[]).includes(x.kind)) rojo(`${donde}.kind`, "no es una manera de pagar de su lista");
    fuente(x, donde);
  });
  if (v.car_needed !== SIN_SABER) {
    const c = v.car_needed;
    if (!esObjeto(c) || typeof c.needed !== "boolean") rojo("car_needed", "no dice si hace falta coche, ni unknown");
    else fuente(c, "car_needed");
  }
  entreBases.forEach((x, i) => {
    const donde = `between_bases[${i}]`;
    if (!esObjeto(x)) return rojo(donde, "no es un objeto");
    if (
      typeof x.from_base !== "string" ||
      typeof x.to_base !== "string" ||
      !p.bases.includes(x.from_base) ||
      !p.bases.includes(x.to_base) ||
      x.from_base === x.to_base
    )
      rojo(donde, "no va de una base de la ruta a otra, por su id (RM6)");
    modo(x.mode, `${donde}.mode`);
    minutos(x.minutes, `${donde}.minutes`);
    precios(x.prices, `${donde}.prices`);
    fuente(x, donde);
  });
  if (p.bases.length < 2 && entreBases.length > 0)
    rojo("between_bases", "la ruta tiene una sola base: no hay de una a otra");

  // Lo que no se sabe, dicho; y sus frases, sin promesas, sin elegir y sin números que no estén en sus datos.
  const frases = Array.isArray(v.unknowns) ? v.unknowns : null;
  for (const [donde, que] of pegasDeFrases(v.unknowns, "unknowns", FRASE_DEL_VIAJERO, LO_MAS_DE_MOVERSE.unknowns))
    rojo(donde, que);
  const callado: string[] = [];
  if (conPrecio === 0) callado.push("ningún billete lleva su precio");
  if (llegadas.length === 0) callado.push("no hay manera de llegar");
  if (p.llegada === null && !llegadas.some((x) => esObjeto(x) && esObjeto(x.from) && x.from.code !== SIN_SABER))
    callado.push("la casa no sabía por dónde se llega");
  if (callado.length > 0 && (frases === null || frases.length === 0))
    rojo("unknowns", `${callado.join("; ")}: lo que no se sabe se dice en unknowns (RM3)`);
  const ids = [...p.zonas, ...p.bases, ...(p.llegada === null ? [] : [p.llegada])];
  (frases ?? []).forEach((f, i) => {
    if (typeof f !== "string") return;
    const donde = `unknowns[${i}]`;
    for (const pega of pegasDelTexto(f, { sinNumerosLargos: true })) rojo(donde, `su frase ${pega} (RM4)`);
    const mejor = DE_LO_MEJOR.exec(f);
    if (mejor !== null) rojo(donde, `dice «${mejor[0]}»: el de moverse no dice qué es lo mejor (RM4)`);
    const deMas = numerosDeMas(f, dados, ids);
    if (deMas.length > 0) rojo(donde, `dice ${deMas.join(", ")}, que no está en sus datos (RM7)`);
  });

  // Lo que el viaje comprueba de esta capa, con las zonas de la ruta: solo si la forma ya es la suya.
  if (rojos.length === 0)
    for (const pega of pegasDeMoverse(paraEnsenarMoverse(v as unknown as EntregaDeMoverse), p.zonas))
      rojo(pega.donde, pega.que);
  return { verde: rojos.length === 0, rojos };
}
