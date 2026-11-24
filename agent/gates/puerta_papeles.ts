// La puerta 2: ¿algún papel bloquea? Mira lo que entregó el de los papeles. La tabla, completa: cada casilla que hay
// que contestar, una vez y ninguna más. Cada respuesta, de un dominio oficial de nuestra lista para su lado y con su
// fecha. Lo que dice la casilla es lo que dicen sus fuentes: si chocan, es dudosa y lleva las dos. «En regla» pide dos
// fuentes, o una del gobierno del destino; y nada de un país sin dominio oficial conocido sale «en regla». Nunca
// dice que se puede entrar. Los plazos van como los da la fuente, para que los cuente el código.
//
// Si la tabla pasa, lo que bloquea lo dice la tabla (lo cuenta `launcher/papeles.ts`), y lo dudoso sale como aviso. Que
// cada página citada se abrió de verdad lo mira la puerta de todos.

import { conFuenteOficial, DUDAS, ESTADOS_DE_PAPEL, esOficial, LADOS } from "../data/papeles.ts";
import { FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO } from "../data/viaje.ts";
import { direccionComparable, esDireccion } from "../launcher/consultado.ts";
import { celdasDe, filasDe } from "../launcher/papeles.ts";
import type { Entendido } from "../scripts/formas.ts";
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
const entero = (v: unknown, desde: number, hasta: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= desde && v <= hasta;

/** Un texto del asiento: en una línea, corto, sin enlaces ni marcas. */
const esTexto = (v: unknown, largo: number = FRASE_DEL_VIAJERO): v is string =>
  typeof v === "string" && v.trim() !== "" && v.length <= largo && !/[\u0000-\u001f<>{}]|https?:|www\./i.test(v);

/** Lo que nunca se dice: que alguien puede entrar, o que tiene permiso (RP1). */
const PUEDE_ENTRAR = new RegExp(
  [
    String.raw`\b(you|they|travell?ers?|he|she) (can|may|are allowed to|is allowed to|will be allowed to) ` +
      String.raw`(enter|travel|go|visit)\b`,
    String.raw`\b(allowed|permitted|free) to enter\b`,
    String.raw`\bentry is (guaranteed|granted)\b`,
  ].join("|"),
  "i",
);

export type ParaLosPapeles = { viaje: Entendido };

export function puertaPapeles(v: unknown, p: ParaLosPapeles): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(v)) return { verde: false, rojos: [{ donde: "delivery", que: "no es un objeto" }] };
  if (v.seat !== "papers") rojo("seat", "no es la entrega del de los papeles");
  const filas = filasDe(p.viaje);
  const destino = p.viaje.destination.country.toUpperCase();
  const pendientes = new Map(celdasDe(p.viaje).map((c) => [`${c.traveller}|${c.country}|${c.question}`, c]));
  const vistas = new Set<string>();

  const casillas = Array.isArray(v.cells) ? v.cells : null;
  if (casillas === null) rojo("cells", "falta, o no es una lista");
  (casillas ?? []).forEach((c, i) => {
    const donde = `cells[${i}]`;
    if (!esObjeto(c)) return rojo(donde, "no es un objeto");
    const clave = `${String(c.traveller)}|${String(c.country).toUpperCase()}|${String(c.question)}`;
    if (!pendientes.has(clave)) return rojo(donde, "no es una casilla de la tabla que hay que llenar (RP7)");
    if (vistas.has(clave)) return rojo(donde, "la misma casilla sale dos veces (RP7)");
    vistas.add(clave);
    const fila = filas.find((f) => f.id === c.traveller)!;
    const pais = String(c.country).toUpperCase();
    const estado = c.status;
    if (!(ESTADOS_DE_PAPEL as readonly unknown[]).includes(estado))
      rojo(`${donde}.status`, "el estado no es de su lista");

    // Las fuentes: cada una, una página https, de su lado, con lo que dice y con la fecha que da.
    const fuentes = Array.isArray(c.sources) ? c.sources : null;
    if (fuentes === null) rojo(`${donde}.sources`, "falta, o no es una lista");
    const validas: { url: string; lado: string; estado: string }[] = [];
    const urls = new Set<string>();
    (fuentes ?? []).forEach((f, j) => {
      const aqui = `${donde}.sources[${j}]`;
      if (!esObjeto(f)) return rojo(aqui, "no es un objeto");
      if (typeof f.url !== "string" || !esDireccion(f.url))
        return rojo(`${aqui}.url`, "no es la dirección de una página");
      const comparable = direccionComparable(f.url) ?? f.url;
      if (urls.has(comparable)) rojo(`${aqui}.url`, "la misma página sale dos veces en la casilla");
      urls.add(comparable);
      if (!(LADOS as readonly unknown[]).includes(f.side)) return rojo(`${aqui}.side`, "el lado no es de su lista");
      if (f.status === "doubtful" || !(ESTADOS_DE_PAPEL as readonly unknown[]).includes(f.status))
        return rojo(`${aqui}.status`, "lo que dice la fuente no es un estado de su lista");
      const suPais = f.side === "destination" ? pais : fila.passport;
      const oficial = esOficial(f.url, suPais);
      const fechada = esFecha(f.seen);
      if (!fechada) rojo(`${aqui}.seen`, "no lleva la fecha que da la página, YYYY-MM-DD (RP2)");
      // En una casilla dudosa puede ir lo que se encontró y no vale; en las demás, no (RP2).
      if (!oficial && estado !== "doubtful")
        rojo(`${aqui}.url`, `no es de un dominio oficial de nuestra lista para ${suPais} (RP2)`);
      if (oficial && fechada) validas.push({ url: comparable, lado: f.side as string, estado: f.status as string });
    });

    // Lo que dice la casilla es lo que dicen sus fuentes, y lo dudoso dice por qué.
    const doubt = c.doubt;
    if (estado === "doubtful") {
      if (!(DUDAS as readonly unknown[]).includes(doubt))
        rojo(`${donde}.doubt`, "lo dudoso no dice por qué, de su lista");
      if (doubt === "sources_disagree" && new Set(validas.map((x) => x.estado)).size < 2)
        rojo(`${donde}.doubt`, "dice que las fuentes chocan, y no hay dos fuentes oficiales que digan cosas distintas");
      if (doubt === "no_official_source" && conFuenteOficial(pais) && conFuenteOficial(fila.passport))
        rojo(`${donde}.doubt`, "dice que no hay fuente oficial, y tenemos dominios de los dos lados");
    } else if ((ESTADOS_DE_PAPEL as readonly unknown[]).includes(estado)) {
      if (doubt !== SIN_SABER) rojo(`${donde}.doubt`, "solo lo dudoso dice por qué lo es: aquí, unknown");
      if (validas.length === 0)
        rojo(`${donde}.sources`, "no lleva ninguna fuente oficial con su fecha: es dudosa (RP2, RP5)");
      if (validas.some((x) => x.estado !== estado))
        rojo(
          `${donde}.status`,
          "sus fuentes no dicen lo mismo que la casilla: si chocan, es dudosa y lleva las dos (RP3)",
        );
      if (estado === "in_order") {
        if (!conFuenteOficial(destino) && pais === destino)
          rojo(`${donde}.status`, `no tenemos fuente oficial de ${pais}: no puede salir en regla, es dudosa (RP4)`);
        else if (validas.length < 2 && !validas.some((x) => x.lado === "destination"))
          rojo(`${donde}.status`, "en regla pide dos fuentes, o una del gobierno del destino (RP4)");
      }
    }

    // Los plazos y el coste, como los da la fuente, solo donde van: el código hace las cuentas.
    const vale = c.valid_for;
    if (c.question === "passport_validity" && vale !== SIN_SABER) {
      if (
        !esObjeto(vale) ||
        !entero(vale.months, 0, 24) ||
        !entero(vale.days, 0, 730) ||
        !["arrival", "departure"].includes(vale.after as string)
      )
        rojo(`${donde}.valid_for`, "no es una regla de meses y días desde la llegada o la salida (RP6)");
    } else if (vale !== SIN_SABER) rojo(`${donde}.valid_for`, "solo la vigencia del pasaporte lleva su regla");
    const antes = c.before_arrival;
    if (antes !== SIN_SABER && (estado !== "to_do" || !esObjeto(antes) || !entero(antes.days, 0, 365)))
      rojo(`${donde}.before_arrival`, "solo lo que hay que hacer lleva los días antes de llegar, de 0 a 365 (RP6)");
    const coste = c.cost;
    if (
      coste !== SIN_SABER &&
      (estado !== "to_do" ||
        !esObjeto(coste) ||
        typeof coste.amount !== "number" ||
        !(coste.amount > 0) ||
        typeof coste.currency !== "string" ||
        !/^[A-Za-z]{3}$/.test(coste.currency))
    )
      rojo(`${donde}.cost`, "solo lo que hay que hacer lleva su coste, un importe con su moneda");
    if (!esTexto(c.what)) rojo(`${donde}.what`, "no dice en una línea corta lo que piden las fuentes");
    else if (PUEDE_ENTRAR.test(c.what))
      rojo(`${donde}.what`, "dice que se puede entrar: solo se dice lo que piden (RP1)");
  });

  // La tabla, completa: ninguna casilla sin contestar.
  if (casillas !== null)
    for (const [clave, c] of pendientes)
      if (!vistas.has(clave))
        rojo(
          "cells",
          `falta la casilla de ${c.traveller}, ${c.country} y ${c.question}: la tabla no está completa (RP7)`,
        );

  const desconocido = v.unknowns;
  const pegas = pegasDeFrases(desconocido, "unknowns", FRASE_DEL_VIAJERO, FRASES_DEL_VIAJERO);
  for (const [donde, que] of pegas) rojo(donde, que);
  if (pegas.length === 0 && (desconocido as string[]).some((x) => PUEDE_ENTRAR.test(x)))
    rojo("unknowns", "dice que se puede entrar (RP1)");
  return { verde: rojos.length === 0, rojos };
}
