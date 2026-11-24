// Las comprobaciones del del calendario. La hoja no le da una puerta con número: van aquí, en su propio archivo, y
// las mira la casa como las de cualquier puerta. Que cada página citada se abrió de verdad lo mira la puerta de
// todos; aquí, lo demás que se puede medir: cada hallazgo, de su lista y con su fuente, sus días y la fecha que da su
// página; cinco como mucho; nada «más barato» sin un precio; otras fechas solo para quien puede moverlas, dentro de lo
// que se puede mover, con las mismas noches y que mejoren algo de verdad, por las cuentas del código. Lo que no se
// puede medir (si un hallazgo pesa lo que dice) no lo mira nadie aquí: lo cubre el banco.

import {
  AVISOS_DE_FECHAS,
  CLASES_DE_AVISO,
  DE_DONDE_SE_SALE,
  DIAS_QUE_PIDE,
  LETRAS_DE_UN_NOMBRE_DE_FUERA,
  LO_MAS_QUE_SE_MUEVE,
  TEMAS_DEL_CALENDARIO,
  VENTANAS,
} from "../data/calendario.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO } from "../data/viaje.ts";
import { esDireccion } from "../launcher/consultado.ts";
import { diasEntre, loQueCambia } from "../launcher/calendario.ts";
import type { Aviso, Entendido } from "../scripts/formas.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { pegasDeFrases } from "./textos.ts";

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const SIN_SABER = "unknown";
const esFecha = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/** Un texto del asiento: en una línea, corto, sin enlaces ni marcas. */
const esTexto = (v: unknown, largo: number = FRASE_DEL_VIAJERO): v is string =>
  typeof v === "string" && v.trim() !== "" && v.length <= largo && !/[\u0000-\u001f<>{}]|https?:|www\./i.test(v);

/** Las palabras de ahorrar o de abaratar: sin un precio de su página, no se dicen (RC5). */
const DE_AHORRAR =
  /\b(cheap\w*|less expensive|lower (price|fare|rate)s?|save[sd]?|saving\w*|bargain\w*|discount\w*)\b/i;

export type ParaElCalendario = {
  /** Lo entendido del viaje, sin las palabras del viajero: sus fechas y si se pueden mover. */
  viaje: Entendido;
  /** El primer día en que se puede viajar: una ventana no empieza antes. */
  desde: string;
};

export function puertaCalendario(v: unknown, p: ParaElCalendario): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  if (v.seat !== "calendar") rojo("seat", "no es la entrega del del calendario");
  const { check_in: entrada, check_out: salida, flexible } = p.viaje.dates;

  // Los hallazgos: cinco como mucho, cada uno de su lista, con sus días y con su página.
  const hallazgos = Array.isArray(v.findings) ? v.findings : null;
  if (hallazgos === null) rojo("findings", "falta, o no es una lista: una lista vacía también se dice");
  else if (hallazgos.length > AVISOS_DE_FECHAS)
    rojo("findings", `son ${hallazgos.length} hallazgos, y se cuentan ${AVISOS_DE_FECHAS} como mucho (RC3)`);
  const buenos: boolean[] = [];
  (hallazgos ?? []).forEach((h, i) => {
    const donde = `findings[${i}]`;
    const antes = rojos.length;
    if (!esObjeto(h)) {
      rojo(donde, "no es un objeto");
      buenos.push(false);
      return;
    }
    if (!(CLASES_DE_AVISO as readonly unknown[]).includes(h.kind))
      rojo(`${donde}.kind`, "la clase no es de su lista (RC4)");
    if (!(TEMAS_DEL_CALENDARIO as readonly unknown[]).includes(h.topic))
      rojo(`${donde}.topic`, "el tema no es de su lista");
    if (h.name !== SIN_SABER && !esTexto(h.name, LETRAS_DE_UN_NOMBRE_DE_FUERA))
      rojo(
        `${donde}.name`,
        `el nombre no es un nombre corto, de ${LETRAS_DE_UN_NOMBRE_DE_FUERA} letras como mucho, o unknown`,
      );
    // Los días que pide el destino no son unos días del calendario: van sin fechas, y con su número.
    if (h.topic === "days_needed") {
      if (h.from !== SIN_SABER || h.to !== SIN_SABER)
        rojo(`${donde}.from`, "los días que pide el destino van sin fechas: from y to son unknown");
      if (!(Number.isInteger(h.days) && (h.days as number) >= 1 && (h.days as number) <= DIAS_QUE_PIDE))
        rojo(`${donde}.days`, `los días que pide el destino son un número entero, de 1 a ${DIAS_QUE_PIDE}`);
    } else {
      if (!esFecha(h.from) || !esFecha(h.to) || h.to < h.from)
        rojo(`${donde}.from`, "sus días no van de una fecha a otra, YYYY-MM-DD (RC2, RC7)");
      if (h.days !== undefined) rojo(`${donde}.days`, "solo lleva días el que dice los días que pide el destino");
    }
    if (typeof h.source !== "string" || !esDireccion(h.source))
      rojo(`${donde}.source`, "no dice la página abierta de donde sale (RC1)");
    else if (!h.source.trim().toLowerCase().startsWith("https://"))
      rojo(`${donde}.source`, "la página no es https: la web no la abre");
    if (h.seen !== SIN_SABER && !esFecha(h.seen))
      rojo(`${donde}.seen`, "no es la fecha que da la página, ni unknown (W6)");
    const precio = h.price;
    const conPrecio =
      esObjeto(precio) &&
      typeof precio.amount === "number" &&
      Number.isFinite(precio.amount) &&
      precio.amount > 0 &&
      typeof precio.currency === "string" &&
      /^[A-Za-z]{3}$/.test(precio.currency);
    if (precio !== SIN_SABER && !conPrecio)
      rojo(`${donde}.price`, "el precio no es un importe con su moneda, ni unknown");
    if (!esTexto(h.what)) rojo(`${donde}.what`, "no dice en una línea corta qué es");
    else if (precio === SIN_SABER && DE_AHORRAR.test(h.what))
      rojo(`${donde}.what`, "habla de ahorrar o de más barato sin un precio de su página (RC5)");
    buenos.push(rojos.length === antes);
  });
  if (p.viaje.origin === null && Array.isArray(hallazgos))
    hallazgos.forEach((h, i) => {
      if (esObjeto(h) && DE_DONDE_SE_SALE.includes(h.topic as never))
        rojo(`findings[${i}].topic`, "no se sabe de dónde sale el viajero: no hay festivos de su casa que buscar");
    });

  // Las ventanas: solo si las fechas se mueven, dentro de lo que se puede mover y mejorando algo de verdad.
  const ventanas = Array.isArray(v.windows) ? v.windows : null;
  if (ventanas === null) rojo("windows", "falta, o no es una lista: una lista vacía también se dice");
  else if (!flexible && ventanas.length > 0)
    rojo("windows", "las fechas del viajero no se mueven: no se proponen otras (RC6)");
  else if (ventanas.length > VENTANAS)
    rojo("windows", `son ${ventanas.length} ventanas, y se proponen ${VENTANAS} como mucho`);
  const todos = hallazgos !== null && buenos.every(Boolean) ? (hallazgos as Aviso[]) : null;
  const entradas = new Set<string>();
  const enAlgunaVentana = new Set<number>();
  if (flexible)
    (ventanas ?? []).forEach((w, i) => {
      const donde = `windows[${i}]`;
      if (!esObjeto(w)) return rojo(donde, "no es un objeto");
      if (!esFecha(w.check_in)) return rojo(`${donde}.check_in`, "no es una fecha, YYYY-MM-DD");
      const mueve = diasEntre(entrada, w.check_in);
      if (mueve === 0) rojo(`${donde}.check_in`, "son las mismas fechas del viaje");
      if (Math.abs(mueve) > LO_MAS_QUE_SE_MUEVE)
        rojo(
          `${donde}.check_in`,
          `se mueve ${Math.abs(mueve)} días, y se puede mover ${LO_MAS_QUE_SE_MUEVE} como mucho`,
        );
      if (w.check_in < p.desde) rojo(`${donde}.check_in`, "empieza antes del primer día en que se puede viajar");
      if (entradas.has(w.check_in)) rojo(`${donde}.check_in`, "la misma ventana sale dos veces");
      entradas.add(w.check_in);
      const porQue = Array.isArray(w.because) ? w.because : null;
      if (
        porQue === null ||
        porQue.length === 0 ||
        !porQue.every((n) => Number.isInteger(n) && n >= 0 && n < (hallazgos?.length ?? 0)) ||
        new Set(porQue).size !== porQue.length
      )
        return rojo(`${donde}.because`, "no dice, por su posición, qué hallazgos la mueven");
      if (todos === null) return;
      // Lo que la ventana cambia lo cuenta el código, con los días de cada hallazgo: el asiento no hace cuentas.
      const cambio = loQueCambia(todos, entrada, salida, w.check_in);
      if (cambio.evita.length === 0 && cambio.alcanza.length === 0)
        rojo(donde, "con sus días, no evita nada malo ni alcanza nada bueno del viaje: no mejora nada");
      for (const n of porQue as number[]) {
        if (!cambio.evita.includes(n) && !cambio.alcanza.includes(n))
          rojo(`${donde}.because`, `el hallazgo ${n} no cambia de las fechas del viaje a las de la ventana`);
        enAlgunaVentana.add(n);
      }
      for (const n of [...cambio.evita, ...cambio.alcanza, ...cambio.pierde, ...cambio.entra]) enAlgunaVentana.add(n);
    });

  // Un hallazgo que no toca ni el viaje ni ninguna ventana no cambia nada para este viajero.
  if (todos !== null)
    todos.forEach((h, i) => {
      if (h.topic === "days_needed" || enAlgunaVentana.has(i)) return;
      const enElViaje = h.from <= salida && h.to >= entrada;
      if (!enElViaje) rojo(`findings[${i}]`, "no toca los días del viaje ni los de ninguna ventana");
    });

  for (const [donde, que] of pegasDeFrases(v.unknowns, "unknowns", FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO))
    rojo(donde, que);
  return { verde: rojos.length === 0, rojos };
}
