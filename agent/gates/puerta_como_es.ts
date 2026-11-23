// La puerta 5: ¿cada nivel, con su prueba? Lo que el código comprueba, desde fuera, de la ficha de cómo es que entrega
// el asiento que mira un alojamiento. Mide forma, de dónde sale cada cosa y que las piezas casen: que cada nivel es de
// su lista, que su prueba existe en el material, que la foto que prueba algo de la habitación es de esa habitación y
// que el inventario y las pruebas dicen lo mismo. No mide si el nivel es el acertado: eso lo cubren otra pasada a
// ciegas y los ojos del viajero.

import {
  CAMPOS,
  CLASES_DE_PRUEBA,
  DE_LA_FICHA,
  DE_LA_HABITACION,
  ENSENA,
  ETIQUETAS_DE_AVISO,
  INSTALACIONES,
  MENCIONES,
  MUESTRA,
  PIDEN_FOTO,
  SIN_SABER,
  SOLO_DE_OPINIONES,
  OTRO_TEMA,
  TEMAS_DE_OPINIONES,
  TONOS,
} from "../data/niveles.ts";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";

/** Lo que tuvo delante el asiento: su ficha de datos, los nombres de sus fotos y las referencias de sus opiniones. */
export type Material = { hoja: Record<string, unknown>; fotos: string[]; opiniones: string[] };

const LO_QUE_LLEVA = [
  "seat",
  "lodging_id",
  "room_id",
  "photos",
  "fields",
  "review_themes",
  "conflicts",
  "warnings",
  "unknowns",
  "summary_good",
  "summary_bad",
];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** El valor de la ficha de datos en una ruta como `room.size_m2`; lo que no se sabe no vale de prueba. */
function deLaHoja(hoja: Objeto, ruta: string): unknown {
  let v: unknown = hoja;
  for (const parte of ruta.split(".")) v = esObjeto(v) ? v[parte] : undefined;
  if (v === undefined || v === null || v === SIN_SABER || (Array.isArray(v) && v.length === 0)) return undefined;
  return v;
}

const esDeLaHabitacion = (foto: string): boolean => foto.startsWith("room-");

export function puertaComoEs(entrega: unknown, m: Material): Veredicto {
  const rojos: Rojo[] = [];
  const rojo = (donde: string, que: string): void => void rojos.push({ donde, que });
  if (!esObjeto(entrega)) return { verde: false, rojos: [{ donde: "delivery", que: "la entrega no es un objeto" }] };

  // 1. La forma: lleva lo que tiene que llevar y nada más, y es de este alojamiento y de esta habitación.
  for (const campo of LO_QUE_LLEVA) if (!(campo in entrega)) rojo(campo, "falta en la entrega");
  for (const campo of Object.keys(entrega)) if (!LO_QUE_LLEVA.includes(campo)) rojo(campo, "no es de la entrega");
  if (entrega.seat !== "lodging-viewer") rojo("seat", "la entrega no es del que mira el alojamiento");
  if (entrega.lodging_id !== m.hoja.lodging_id) rojo("lodging_id", "no es el alojamiento de su ficha de datos");
  const habitacion = esObjeto(m.hoja.room) ? m.hoja.room.id : SIN_SABER;
  if (entrega.room_id !== habitacion) rojo("room_id", "no es la habitación de ese precio");

  // 2. El inventario: una entrada por foto que recibió, ni una menos ni una más, y cada una con lo que enseña.
  const inventario = new Map<string, string>();
  lista(entrega.photos).forEach((cruda, i) => {
    const donde = `photos[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.file)) return rojo(donde, "no dice de qué foto es");
    if (!m.fotos.includes(cruda.file)) return rojo(donde, `inventaría ${cruda.file}, que no recibió`);
    if (inventario.has(cruda.file)) return rojo(donde, `inventaría dos veces ${cruda.file}`);
    if (!esTexto(cruda.shows) || !MUESTRA.includes(cruda.shows)) rojo(donde, "lo que enseña no es de su lista");
    if (lista(cruda.seen).length === 0 || !lista(cruda.seen).every(esTexto)) rojo(donde, "no dice lo que se ve");
    inventario.set(cruda.file, esTexto(cruda.shows) && MUESTRA.includes(cruda.shows) ? cruda.shows : "");
  });
  for (const foto of m.fotos) if (!inventario.has(foto)) rojo("photos", `falta inventariar ${foto}`);

  /** Mira que una referencia exista en el material: una foto, una opinión o un dato de la ficha. */
  const existe = (ref: unknown): boolean =>
    esTexto(ref) && (m.fotos.includes(ref) || m.opiniones.includes(ref) || deLaHoja(m.hoja, ref) !== undefined);

  // 3. Los campos: todos, cada uno con un nivel de su lista y con su prueba.
  const campos = esObjeto(entrega.fields) ? entrega.fields : {};
  for (const campo of Object.keys(campos))
    if (!(campo in CAMPOS)) rojo(`fields.${campo}`, "no es un campo de la ficha");
  let algunoSinSaber = false;
  for (const [campo, niveles] of Object.entries(CAMPOS)) {
    const donde = `fields.${campo}`;
    const c = campos[campo];
    if (!esObjeto(c)) {
      rojo(donde, "falta el campo");
      continue;
    }
    const nivel = c.level;
    if (nivel !== SIN_SABER && !(esTexto(nivel) && niveles.includes(nivel))) {
      rojo(donde, `el nivel ${JSON.stringify(nivel)} no es de su lista`);
      continue;
    }
    if (nivel === SIN_SABER) algunoSinSaber = true;
    const pruebas = lista(c.evidence);
    if (nivel !== SIN_SABER && pruebas.length === 0) rojo(donde, "tiene nivel y no tiene prueba");

    const clases = new Set<string>();
    pruebas.forEach((cruda, i) => {
      const aqui = `${donde}.evidence[${i}]`;
      if (!esObjeto(cruda) || !esTexto(cruda.kind) || !CLASES_DE_PRUEBA.includes(cruda.kind))
        return rojo(aqui, "la prueba no dice si es una foto, una opinión o la ficha");
      if (!esTexto(cruda.what)) rojo(aqui, "la prueba no dice qué se ve o qué se dice");
      const ref = cruda.ref;
      if (cruda.kind === "photo") {
        if (!esTexto(ref) || !m.fotos.includes(ref)) return rojo(aqui, `cita la foto ${String(ref)}, que no recibió`);
        if (SOLO_DE_OPINIONES.includes(campo))
          return rojo(aqui, `prueba ${campo} con una foto: eso solo lo cuentan los viajeros`);
        if (DE_LA_HABITACION.includes(campo) && !esDeLaHabitacion(ref))
          return rojo(aqui, `prueba algo de la habitación con ${ref}, que no es una foto de esa habitación`);
        const ensena = inventario.get(ref);
        if (ensena !== undefined && ensena !== "" && !ENSENA[campo].includes(ensena))
          return rojo(aqui, `prueba ${campo} con ${ref}, que en su inventario enseña ${ensena}`);
      } else if (cruda.kind === "review") {
        if (!esTexto(ref) || !m.opiniones.includes(ref))
          return rojo(aqui, `cita la opinión ${String(ref)}, que no recibió`);
      } else {
        if (!esTexto(ref) || !DE_LA_FICHA.includes(ref) || deLaHoja(m.hoja, ref) === undefined)
          return rojo(aqui, `cita de la ficha ${String(ref)}, que no está o no se sabe`);
      }
      clases.add(`${cruda.kind}:${String(ref)}`);
    });

    // Lo que se ve se prueba con una foto, y lo que cuentan los viajeros, con una opinión.
    const clasesDePrueba = [...clases].map((x) => x.split(":")[0]);
    if (nivel !== SIN_SABER && PIDEN_FOTO.includes(campo) && !clasesDePrueba.includes("photo"))
      rojo(donde, "dice cómo se ve sin una foto de la habitación");
    if (nivel !== SIN_SABER && SOLO_DE_OPINIONES.includes(campo) && !clasesDePrueba.includes("review"))
      rojo(donde, "dice cómo lo mantienen sin una opinión que lo cuente");

    // El tamaño no va solo a ojo: si la ficha dice los metros, la prueba los cita.
    if (campo === "room_space" && nivel !== SIN_SABER && deLaHoja(m.hoja, "room.size_m2") !== undefined) {
      if (!clases.has("sheet:room.size_m2")) rojo(donde, "la ficha dice los metros y la prueba no los cita");
    }

    // Lo que puede no existir: «no hay» sale de la ficha y de que nada lo enseñe; un nivel de verdad, de verlo o
    // de leerlo.
    const patron = INSTALACIONES[campo];
    if (patron !== undefined && nivel !== SIN_SABER) {
      const enLaLista = lista(m.hoja.services).some((s) => typeof s === "string" && patron.test(s));
      const enLasFotos = [...inventario.values()].includes(campo);
      const vistoOLeido = [...clases].some((x) => x.startsWith("photo:") || x.startsWith("review:"));
      if (nivel === "none") {
        if (enLaLista) rojo(donde, "dice que no hay y la ficha lo lista entre sus servicios");
        if (enLasFotos) rojo(donde, "dice que no hay y su inventario tiene una foto que lo enseña");
        if (!clases.has("sheet:services")) rojo(donde, "dice que no hay sin citar la lista de servicios");
      } else if (!vistoOLeido) {
        rojo(donde, "le pone nivel sin una foto ni una opinión: que la ficha lo liste no dice cómo es");
      }
    }
  }

  // 4. Lo que dicen las opiniones, por temas: cada tema, de su lista y con opiniones que existen.
  const dichos = new Set<string>();
  lista(entrega.review_themes).forEach((cruda, i) => {
    const donde = `review_themes[${i}]`;
    if (!esObjeto(cruda) || !esTexto(cruda.theme) || !esTexto(cruda.says)) return rojo(donde, "no dice de qué habla");
    if (!TEMAS_DE_OPINIONES.includes(cruda.theme)) rojo(donde, "el tema no es de su lista");
    else if (cruda.theme !== OTRO_TEMA) {
      const par = `${cruda.theme}:${String(cruda.tone)}`;
      if (dichos.has(par)) rojo(donde, "repite un tema con el mismo tono");
      dichos.add(par);
    }
    if (!esTexto(cruda.tone) || !TONOS.includes(cruda.tone)) rojo(donde, "el tono no es de su lista");
    if (!esTexto(cruda.mentions) || !MENCIONES.includes(cruda.mentions))
      rojo(donde, "cuántas lo dicen no es de su lista: contar es cosa del código");
    const refs = lista(cruda.refs);
    if (refs.length === 0) rojo(donde, "no cita ninguna opinión");
    for (const ref of refs)
      if (!esTexto(ref) || !m.opiniones.includes(ref)) rojo(donde, `cita la opinión ${String(ref)}, que no recibió`);
  });

  // 5. Los choques y los avisos: cada uno, con lo que lo sostiene.
  for (const nombre of ["conflicts", "warnings"]) {
    lista(entrega[nombre]).forEach((cruda, i) => {
      const donde = `${nombre}[${i}]`;
      if (!esObjeto(cruda) || !esTexto(cruda.what)) return rojo(donde, "no dice qué pasa");
      const refs = lista(cruda.refs);
      if (refs.length === 0) rojo(donde, "no cita nada del material");
      for (const ref of refs) if (!existe(ref)) rojo(donde, `cita ${String(ref)}, que no está en su material`);
      if (nombre === "warnings" && !(esTexto(cruda.label) && ETIQUETAS_DE_AVISO.includes(cruda.label)))
        rojo(donde, "el aviso no dice si se vio o se dedujo");
    });
  }
  for (const nombre of ["review_themes", "conflicts", "warnings", "unknowns"]) {
    if (nombre in entrega && !Array.isArray(entrega[nombre])) rojo(nombre, "no es una lista");
  }

  // 6. Lo que no se sabe se dice, y el resumen no se deja en blanco.
  if (!lista(entrega.unknowns).every(esTexto)) rojo("unknowns", "cada cosa que no se sabe va en una frase");
  if (algunoSinSaber && lista(entrega.unknowns).length === 0)
    rojo("unknowns", "hay campos que no se saben y no dice por qué");
  for (const nombre of ["summary_good", "summary_bad"]) {
    if (nombre in entrega && !esTexto(entrega[nombre])) rojo(nombre, "está en blanco");
  }

  return { verde: rojos.length === 0, rojos };
}
