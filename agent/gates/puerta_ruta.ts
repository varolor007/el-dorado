// La puerta 3: ¿las noches suman? Lo que el código comprueba, desde fuera, de la ruta que entrega su asiento. Mide
// cuentas, forma y de dónde sale cada cosa: que las noches de las bases suman las del viaje, que cada traslado tiene
// su duración y su fuente, que cada base tiene sus noches, que lo imprescindible está dentro o dice por qué no, y que
// cada zona tiene su centro (anclas que existen en los datos) y su radio. No mide si la ruta es buena: eso lo ve el
// viajero, que la puede cambiar.

import { COSAS } from "../data/gustos.ts";
import { ANCLAS_POR_ZONA, CERCA_POR_ZONA, MEDIOS, NOCHES_POR_BASE, RADIOS, ZONAS_POR_BASE } from "../data/ruta.ts";
import { FORMAS_DE_VIAJE, SIN_SABER, type Entendido, type Lugar } from "../scripts/formas.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";
import { esNombre } from "./textos.ts";

// Qué es un nombre (corto, en una línea y sin direcciones) se dice en `textos.ts`, para que lo use también quien lee
// nombres de fuera. Sigue saliendo de aquí, que es donde estaba.
export { esNombre };

/** Lo que tuvo delante el asiento: el viaje, sus noches, los sitios de los datos y los traslados que se saben. */
export type MaterialDeRuta = {
  viaje: Entendido;
  noches: number;
  lugares: Lugar[];
  traslados: { ref: string; minutes: number }[];
};

const LO_QUE_LLEVA = ["seat", "shape", "bases", "transfers", "entry", "exit", "musts", "left_out", "unknowns"];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const entero = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Los imprescindibles que son de la ruta: los que no son una cosa del alojamiento. */
export function imprescindiblesDeLaRuta(viaje: Entendido): string[] {
  return viaje.tastes.filter((g) => g.weight === "must" && !Object.hasOwn(COSAS, g.thing)).map((g) => g.thing);
}

export function puertaRuta(entrega: unknown, m: MaterialDeRuta): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  // 1. La forma.
  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "route-planner") rojo("seat", "la entrega no es del asiento de la ruta");
  const forma = entrega.shape;
  if (!(esTexto(forma) && (FORMAS_DE_VIAJE as readonly string[]).includes(forma)))
    rojo("shape", "la forma del viaje no es de su lista");
  for (const nombre of ["bases", "transfers", "musts", "left_out", "unknowns"])
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");

  // 2. Las bases: sus noches suman las del viaje, y con más de una, cada una lleva su mínimo.
  const bases = lista(entrega.bases);
  const deLugar = new Set(m.lugares.map((l) => l.id));
  const idsDeBase: string[] = [];
  const idsDeZona: string[] = [];
  let suma = 0;
  if (bases.length === 0) rojo("bases", "no hay ninguna base");
  if (forma === "route" && bases.length < 2) rojo("bases", "una ruta lleva dos bases o más");
  if ((forma === "single_base" || forma === "base_with_day_trips") && bases.length > 1)
    rojo("bases", "dice que hay una sola base y entrega más de una");
  // Si el viajero dijo que no quiere ver más de un sitio, se duerme en uno: con excursiones, si hacen falta (26-nov).
  if (m.viaje.moving?.several_places === false && (forma === "route" || bases.length > 1))
    rojo("shape", "el viajero quiere dormir en un solo sitio: una base, con excursiones si hacen falta");
  bases.forEach((cruda, i) => {
    const donde = `bases[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.id)) return rojo(donde, "no dice qué base es");
    if (idsDeBase.includes(cruda.id)) rojo(donde, `la base ${cruda.id} sale dos veces`);
    idsDeBase.push(cruda.id);
    if (!esNombre(cruda.name)) rojo(donde, "no dice dónde se duerme, con un nombre corto");
    if (!esTexto(cruda.why)) rojo(donde, "no dice por qué se duerme ahí");
    if (!entero(cruda.nights) || cruda.nights < 1) rojo(donde, "sus noches no son un número entero de noches");
    else {
      suma += cruda.nights;
      if (bases.length > 1 && cruda.nights < NOCHES_POR_BASE)
        rojo(donde, `lleva ${cruda.nights} noche y el mínimo por base es ${NOCHES_POR_BASE}`);
    }

    // 3. Las zonas: cada una, con su centro (anclas que existen) y su radio.
    const zonas = lista(cruda.zones);
    if (zonas.length < 1 || zonas.length > ZONAS_POR_BASE)
      rojo(donde, `lleva ${zonas.length} zonas, y son de una a ${ZONAS_POR_BASE}`);
    zonas.forEach((z, j) => {
      const aqui = `${donde}.zones[${j}]`;
      if (!esObjeto(z) || !esTexto(z.id)) return rojo(aqui, "no dice qué zona es");
      if (idsDeZona.includes(z.id)) rojo(aqui, `la zona ${z.id} sale dos veces`);
      idsDeZona.push(z.id);
      if (!esNombre(z.name)) rojo(aqui, "no tiene un nombre corto, de una línea y sin direcciones");
      if (!esTexto(z.why)) rojo(aqui, "no dice qué hay ahí");
      if (!(typeof z.radius_m === "number" && RADIOS.includes(z.radius_m))) rojo(aqui, "su radio no es de su lista");
      const anclas = lista(z.anchors);
      if (anclas.length < 1 || anclas.length > ANCLAS_POR_ZONA)
        rojo(aqui, `lleva ${anclas.length} anclas, y son de una a ${ANCLAS_POR_ZONA}: sin ellas no tiene centro`);
      for (const a of anclas)
        if (!esTexto(a) || !deLugar.has(a)) rojo(aqui, `su ancla ${String(a)} no está en los datos`);
      const cerca = lista(z.near);
      if (!Array.isArray(z.near)) rojo(aqui, "lo que tiene cerca no es una lista");
      if (cerca.length > CERCA_POR_ZONA)
        rojo(aqui, `nombra ${cerca.length} sitios cerca y el tope es ${CERCA_POR_ZONA}`);
      for (const c of cerca)
        if (!esTexto(c) || !deLugar.has(c)) rojo(aqui, `nombra ${String(c)}, que no está en los datos`);
    });
  });
  if (bases.length > 0 && suma !== m.noches) rojo("bases", `sus noches suman ${suma} y el viaje tiene ${m.noches}`);

  // 4. Los traslados: uno entre cada base y la siguiente, con su duración y su fuente.
  const traslados = lista(entrega.transfers);
  const sabidos = new Map(m.traslados.map((t) => [t.ref, t.minutes]));
  for (let i = 0; i + 1 < idsDeBase.length; i++) {
    const hay = traslados.some((t) => esObjeto(t) && t.from === idsDeBase[i] && t.to === idsDeBase[i + 1]);
    if (!hay) rojo("transfers", `falta el traslado de ${idsDeBase[i]} a ${idsDeBase[i + 1]}`);
  }
  traslados.forEach((cruda, i) => {
    const donde = `transfers[${i}]`;
    if (!esObjeto(cruda)) return rojo(donde, "no es un traslado");
    const de = idsDeBase.indexOf(String(cruda.from));
    if (de < 0 || idsDeBase[de + 1] !== cruda.to) rojo(donde, "no va de una base a la siguiente");
    if (!esTexto(cruda.by) || !MEDIOS.includes(cruda.by)) rojo(donde, "no dice en qué se va, de su lista");
    if (cruda.minutes === SIN_SABER || cruda.source === SIN_SABER) {
      // Sin traslados en su material el asiento no puede saber lo que duran, y su contrato le dice que ponga
      // «unknown» y lo cuente: no es un rojo suyo. Que un viaje así no se puede planear todavía lo dice la casa.
      if (m.traslados.length > 0)
        rojo(donde, "no tiene su duración o su fuente, y su material trae traslados: sin ellas no se sabe si caben");
      else if (lista(entrega.unknowns).length === 0)
        rojo(donde, "no se sabe lo que dura y no lo dice en lo que no se sabe");
      return;
    }
    if (!esTexto(cruda.source) || !sabidos.has(cruda.source))
      return rojo(donde, `cita el traslado ${String(cruda.source)}, que no está en su material`);
    if (cruda.minutes !== sabidos.get(cruda.source)) rojo(donde, "su duración no es la de su fuente");
  });

  // 5. Por dónde se entra y por dónde se sale: la primera base y la última.
  for (const [nombre, base] of [
    ["entry", idsDeBase[0]],
    ["exit", idsDeBase[idsDeBase.length - 1]],
  ] as const) {
    const v = entrega[nombre];
    if (!esObjeto(v) || !esTexto(v.why)) rojo(nombre, "no dice por dónde ni por qué");
    else if (v.base !== base) rojo(nombre, "no es la base por la que empieza o acaba el orden de la ruta");
  }

  // 6. Lo imprescindible del viajero que es de la ruta: dentro, o con su porqué.
  const dichos = lista(entrega.musts).filter(esObjeto);
  for (const cosa of imprescindiblesDeLaRuta(m.viaje)) {
    const dicho = dichos.find((x) => x.what === cosa);
    if (dicho === undefined) rojo("musts", `no dice qué pasa con «${cosa}», que es imprescindible para el viajero`);
  }
  lista(entrega.musts).forEach((cruda, i) => {
    const donde = `musts[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.what)) return rojo(donde, "no dice de qué imprescindible habla");
    if (typeof cruda.covered !== "boolean") rojo(donde, "no dice si queda dentro o fuera");
    if (!esTexto(cruda.where_or_why)) rojo(donde, "no dice dónde queda cubierto ni por qué no");
  });

  // 7. Lo que se queda fuera y lo que no se sabe, dicho.
  lista(entrega.left_out).forEach((cruda, i) => {
    if (!esObjeto(cruda) || !esTexto(cruda.what) || !esTexto(cruda.why))
      rojo(`left_out[${i}]`, "no dice qué se queda fuera o por qué");
  });
  if (!lista(entrega.unknowns).every(esTexto)) rojo("unknowns", "cada cosa que no se sabe va en una frase");

  return { verde: rojos.length === 0, rojos };
}
