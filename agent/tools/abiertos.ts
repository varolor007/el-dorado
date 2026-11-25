// Lo que dicen los datos abiertos de los sitios elegidos (14.4), sin leer su web: su horario y si se paga, de
// OpenStreetMap, y su web oficial, de Wikidata. Son datos libres y piden citar la fuente: cada dato lleva la página de
// donde sale. El horario se guarda tal cual lo escribe la fuente; lo que de él se entiende lo lee el código después
// (`agent/tools/horarios.ts`), y lo que no, no se sabe. No se adivina nada: un objeto de OpenStreetMap solo es de un
// sitio si lo dice Wikidata o si él mismo lleva el identificador del sitio; nada por nombre.
//
// Cómo se llega a cada uno: Wikidata dice su web y, si lo sabe, su objeto de OpenStreetMap. Los objetos se leen por
// Overpass, el servicio de OpenStreetMap para leer (su API es la de editar, y su buscador no es para consultas en
// serie): en una consulta para todos los sitios, los objetos que dice Wikidata, por su tipo y su número, y, de cada
// sitio, el objeto que lleve su identificador cerca de su punto, por si Wikidata no lo sabe o el que dice es de otro.
// Solo sus etiquetas.
// Overpass tiene varias instancias públicas y no todas contestan desde todas partes: se prueban en orden, las de
// `ELDORADO_OVERPASS`, con un tope de tiempo y pocos intentos. Si ninguna contesta, el horario y si se paga no se
// saben, se dice, y la web de Wikidata llega igual.

import type { DatosAbiertos } from "../scripts/capa_entradas.ts";
import type { FuenteDeUnDato } from "../output/capas.ts";
import { enlaceSinClaves } from "./enlaces.ts";
import { AGENTE, type Respuesta, type Salida, type Sitio } from "./sitios.ts";

const WIKIDATA = "https://query.wikidata.org/sparql";

/** Dónde está Overpass si el entorno no dice otra cosa: su instancia principal. */
export const OVERPASS_POR_DEFECTO = ["https://overpass-api.de/api/interpreter"];
/** Cuántas instancias se prueban como mucho, digan las que diga el entorno. */
const INSTANCIAS_COMO_MUCHO = 4;
/** El tope de tiempo de Overpass en total, en milisegundos: muy por debajo de la espera de las entradas. */
export const TOPE_DE_OVERPASS = 90_000;
/** Lo que se le da a una instancia para contestar, en milisegundos, y lo que se le pide que tarde como mucho. */
const TOPE_DE_UNA_INSTANCIA = 40_000;
const TOPE_EN_EL_SERVIDOR = 30;
/** Lo más que se espera si una instancia dice que se espere, en segundos; si pide más, se deja. */
const ESPERA_COMO_MUCHO = 30;
/** Lo lejos que puede estar del punto del sitio el objeto que lleva su identificador, en metros. */
export const CERCA = 500;
/** Cuántos sitios van en una consulta: así la dirección no se hace demasiado larga. */
const SITIOS_POR_CONSULTA = 30;

const TIPOS = ["node", "way", "relation"] as const;
type Tipo = (typeof TIPOS)[number];
type Objeto = { tipo: Tipo; id: number; etiquetas: Record<string, string> };

/** Pedir a una instancia de Overpass, con lo que se le da para contestar. */
export type TraerConTope = (url: string, ms: number) => Promise<Respuesta>;

/**
 * Cómo sale a internet: la de siempre (`traer`, `dormir`, `intentos`) y, para Overpass, sus instancias (si no se dan,
 * las del entorno), su tope de tiempo en total y dónde se dice lo que no se pudo saber.
 */
export type SalidaDeLosAbiertos = Omit<Salida, "traer"> & {
  traer?: TraerConTope;
  overpass?: string[];
  tope?: number;
  avisar?: (texto: string) => void;
  ahora?: () => number;
};

const esId = (id: string): boolean => /^Q\d{1,12}$/.test(id);
const esNumero = (v: unknown): v is string => typeof v === "string" && /^\d{1,15}$/.test(v);

const esPunto = (p: unknown): p is { lat: number; lon: number } => {
  const x = p as { lat?: unknown; lon?: unknown } | null;
  return (
    typeof x?.lat === "number" &&
    typeof x?.lon === "number" &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lon) &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lon) <= 180
  );
};

const deInternet: TraerConTope = async (url, ms) => {
  const r = await fetch(url, {
    headers: { "User-Agent": AGENTE, Accept: "application/json" },
    signal: AbortSignal.timeout(ms),
  });
  const espera = Number(r.headers.get("retry-after"));
  return { estado: r.status, cuerpo: await r.text(), esperar: Number.isFinite(espera) && espera > 0 ? espera : null };
};

const dormirDe = (o: SalidaDeLosAbiertos) => o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

/** Lo que tarde de más una respuesta se corta, aunque quien la pide no sepa cortarla. */
async function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const tarde = new Promise<never>((_, mal) => {
    reloj = setTimeout(() => mal(new Error("no contesta a tiempo")), ms);
  });
  try {
    return await Promise.race([promesa, tarde]);
  } finally {
    clearTimeout(reloj);
  }
}

/** Pide a Wikidata y devuelve su JSON; si dice que se espere, espera y lo vuelve a pedir, unas pocas veces. */
async function pedir(url: string, o: SalidaDeLosAbiertos): Promise<unknown> {
  const traer = o.traer ?? deInternet;
  const dormir = dormirDe(o);
  const intentos = o.intentos ?? 3;
  for (let intento = 1; ; intento++) {
    const r: Respuesta = await traer(url, 60_000);
    if (r.estado === 200) {
      try {
        return JSON.parse(r.cuerpo);
      } catch {
        throw new Error("los datos abiertos no contestan con datos");
      }
    }
    const reintentable = r.estado === 429 || r.estado === 503;
    if (!reintentable || intento >= intentos) throw new Error(`los datos abiertos contestan ${r.estado}`);
    await dormir(Math.min(60, r.esperar ?? 5 * intento) * 1000);
  }
}

/** La consulta a Wikidata de unos sitios: su web oficial y, si la sabe, la dirección de su objeto en OpenStreetMap. */
export function consultaDeLosAbiertos(ids: string[]): string {
  const valores = ids.filter(esId).map((id) => `wd:${id}`);
  if (valores.length === 0) throw new Error("ningún sitio tiene un identificador de Wikidata");
  return `SELECT ?item ?web ?node ?way ?relation WHERE {
  VALUES ?item { ${valores.join(" ")} }
  OPTIONAL { ?item wdt:P856 ?web . }
  OPTIONAL { ?item wdt:P11693 ?node . }
  OPTIONAL { ?item wdt:P10689 ?way . }
  OPTIONAL { ?item wdt:P402 ?relation . }
}`;
}

type DeWikidata = { webs: string[]; objetos: { tipo: Tipo; id: number }[] };

/** Lo que contesta Wikidata, sitio a sitio: sus webs que valen y sus objetos de OpenStreetMap, sin repetir. */
export function leerWikidata(json: unknown): Map<string, DeWikidata> {
  const filas = (json as { results?: { bindings?: Record<string, { value?: unknown }>[] } })?.results?.bindings;
  const salida = new Map<string, DeWikidata>();
  for (const f of Array.isArray(filas) ? filas : []) {
    const id = /\/(Q\d+)$/.exec(String(f.item?.value ?? ""))?.[1];
    if (id === undefined) continue;
    const suyo = salida.get(id) ?? { webs: [], objetos: [] };
    const web = f.web?.value;
    if (enlaceSinClaves(web) && !suyo.webs.includes(web)) suyo.webs.push(web);
    for (const tipo of TIPOS) {
      const n = f[tipo]?.value;
      if (esNumero(n) && !suyo.objetos.some((x) => x.tipo === tipo && x.id === Number(n)))
        suyo.objetos.push({ tipo, id: Number(n) });
    }
    salida.set(id, suyo);
  }
  return salida;
}

/** Las etiquetas de un objeto, solo las de texto: de OpenStreetMap no se guarda nada más (ni quién lo editó). */
function etiquetasDe(t: unknown): Record<string, string> {
  if (typeof t !== "object" || t === null) return {};
  return Object.fromEntries(Object.entries(t).filter((x): x is [string, string] => typeof x[1] === "string"));
}

/** Los objetos de lo que contesta Overpass: cada uno, con su tipo, su número y sus etiquetas; nada más. */
export function leerObjetos(json: unknown): Objeto[] {
  const elementos = (json as { elements?: unknown[] })?.elements;
  return (Array.isArray(elementos) ? elementos : []).flatMap((e) => {
    const x = e as { type?: unknown; id?: unknown; tags?: unknown };
    if (!TIPOS.includes(x.type as Tipo) || !Number.isSafeInteger(x.id)) return [];
    return [{ tipo: x.type as Tipo, id: x.id as number, etiquetas: etiquetasDe(x.tags) }];
  });
}

/** Un objeto es de un sitio si lleva su identificador; o, si lo dio Wikidata, si no lleva el de ningún otro. */
const esDelSitio = (o: Objeto, id: string, deWikidata: boolean): boolean =>
  o.etiquetas.wikidata === id || (deWikidata && o.etiquetas.wikidata === undefined);

/** La página de un objeto de OpenStreetMap, para citarla. */
export const paginaDeOsm = (o: { tipo: Tipo; id: number }): string => `https://www.openstreetmap.org/${o.tipo}/${o.id}`;

/** La página de un sitio en Wikidata, para citarla. */
export const paginaDeWikidata = (id: string): string => `https://www.wikidata.org/wiki/${id}`;

/** Si se paga, por la etiqueta `fee`: sí o no; lo que diga con otras palabras (un precio, una frase) no se sabe. */
export function dePagoDe(fee: unknown): boolean | null {
  const v = typeof fee === "string" ? fee.trim().toLowerCase() : "";
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

/**
 * La web de un sitio: la de Wikidata y, si no tiene, la que diga su objeto de OpenStreetMap. De varias, la más
 * corta, que suele ser la de su portada; a igual largo, la primera por orden. Solo las que valen y sin claves.
 */
function webDe(webs: string[], o: Objeto | null): { web: string; deOsm: boolean } | null {
  const elegir = (lista: string[]): string | null =>
    [...lista].filter(enlaceSinClaves).sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? null;
  const deWikidata = elegir(webs);
  if (deWikidata !== null) return { web: deWikidata, deOsm: false };
  const deOsm = elegir([o?.etiquetas.website, o?.etiquetas["contact:website"]].filter((w) => w !== undefined));
  return deOsm === null ? null : { web: deOsm, deOsm: true };
}

/** Lo que dicen los datos abiertos de un sitio, con la página de cada cosa. */
export function datosDe(id: string, wd: DeWikidata | undefined, o: Objeto | null, visto: string): DatosAbiertos {
  const deOsm: FuenteDeUnDato | null = o === null ? null : { url: paginaDeOsm(o), visto };
  const deWikidata: FuenteDeUnDato | null = wd === undefined ? null : { url: paginaDeWikidata(id), visto };
  const horario = o?.etiquetas.opening_hours?.trim() || null;
  const dePago = dePagoDe(o?.etiquetas.fee);
  const w = webDe(wd?.webs ?? [], o);
  const fuentes = [deOsm, deWikidata].filter((f): f is FuenteDeUnDato => f !== null);
  const de: NonNullable<DatosAbiertos["de"]> = {};
  if (horario !== null && deOsm !== null) de.horario = deOsm;
  if (dePago !== null && deOsm !== null) de.pago = deOsm;
  if (w !== null) de.web = (w.deOsm ? deOsm : deWikidata) ?? undefined;
  return { sitio: id, horario, dePago, web: w?.web ?? null, fuentes, de };
}

// ---------- Overpass

/** Una dirección de Overpass que vale: https, sin usuario ni clave, sin nada tras ella (ni `?` ni `#`). */
export function esInstancia(texto: string): boolean {
  if (texto.length > 200 || /\s/.test(texto)) return false;
  try {
    const u = new URL(texto);
    return u.protocol === "https:" && u.hostname !== "" && !u.username && !u.password && !u.search && !u.hash;
  } catch {
    return false;
  }
}

/**
 * Las instancias de Overpass, de `ELDORADO_OVERPASS` (direcciones https separadas por comas), en su orden y sin
 * repetir; sin él, la principal. Las que no valen se dejan, y se dice cuántas.
 */
export function instanciasDeOverpass(texto: string | undefined): { instancias: string[]; malas: number } {
  if (texto === undefined || texto.trim() === "") return { instancias: [...OVERPASS_POR_DEFECTO], malas: 0 };
  const dichas = texto
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
  const buenas = [...new Set(dichas.filter(esInstancia))];
  return { instancias: buenas.slice(0, INSTANCIAS_COMO_MUCHO), malas: dichas.filter((x) => !esInstancia(x)).length };
}

/** Lo que se le pide a Overpass: unos objetos por su tipo y su número, y unos sitios por su identificador y punto. */
export type PedidoAOverpass = {
  objetos: { tipo: Tipo; id: number }[];
  cerca: { id: string; punto: { lat: number; lon: number } }[];
};

/**
 * La consulta a Overpass: los objetos por su tipo y su número; de cada sitio, el objeto que lleve su identificador
 * cerca de su punto; y de todos, solo sus etiquetas. Lo que no es un número, un identificador o un punto no entra.
 */
export function consultaDeOverpass(p: PedidoAOverpass): string | null {
  const partes: string[] = [];
  for (const tipo of TIPOS) {
    const ids = [...new Set(p.objetos.filter((x) => x.tipo === tipo && esNumeroDeObjeto(x.id)).map((x) => x.id))];
    if (ids.length > 0) partes.push(`${tipo}(id:${ids.sort((a, b) => a - b).join(",")});`);
  }
  for (const s of p.cerca)
    if (esId(s.id) && esPunto(s.punto))
      partes.push(`nwr["wikidata"="${s.id}"](around:${CERCA},${s.punto.lat.toFixed(6)},${s.punto.lon.toFixed(6)});`);
  if (partes.length === 0) return null;
  return `[out:json][timeout:${TOPE_EN_EL_SERVIDOR}];\n(\n${partes.join("\n")}\n);\nout tags;`;
}

const esNumeroDeObjeto = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;

/** Lo que contesta Overpass: sus objetos; si no es lo suyo, o dice que se cortó a medias, no vale. */
export function leerOverpass(cuerpo: string): Objeto[] {
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    throw new Error("no contesta con datos");
  }
  const x = json as { elements?: unknown; remark?: unknown } | null;
  if (!Array.isArray(x?.elements)) throw new Error("no contesta con datos");
  // Si se le acaba el tiempo o la memoria, Overpass lo dice en `remark` y da lo que llevaba: a medias no vale.
  if (typeof x.remark === "string" && /error|timed out|out of memory/i.test(x.remark))
    throw new Error("contesta a medias");
  return leerObjetos(json);
}

const nombreDe = (url: string): string => new URL(url).hostname;

/**
 * Una consulta a Overpass, por sus instancias en orden: si una no contesta a tiempo, dice que se espere o contesta
 * mal, se pasa a la siguiente. Una sola vez de más, y solo a la que dijo cuánto esperar, si cabe en el tope.
 */
async function deOverpass(
  consulta: string,
  instancias: string[],
  hasta: number,
  o: SalidaDeLosAbiertos,
): Promise<{ objetos: Objeto[]; instancia: string }> {
  const traer = o.traer ?? deInternet;
  const ahora = o.ahora ?? Date.now;
  const fallos: string[] = [];
  const queEsperan: { instancia: string; esperar: number }[] = [];
  const probar = async (instancia: string): Promise<Objeto[] | null> => {
    const queda = Math.min(TOPE_DE_UNA_INSTANCIA, hasta - ahora());
    if (queda < 1000) {
      fallos.push(`${nombreDe(instancia)}: sin tiempo`);
      return null;
    }
    try {
      const r = await conTope(traer(`${instancia}?data=${encodeURIComponent(consulta)}`, queda), queda);
      if (r.estado === 200) return leerOverpass(r.cuerpo);
      if ([429, 503, 504].includes(r.estado) && r.esperar !== null && r.esperar <= ESPERA_COMO_MUCHO)
        queEsperan.push({ instancia, esperar: r.esperar });
      fallos.push(`${nombreDe(instancia)} contesta ${r.estado}`);
    } catch (error) {
      fallos.push(`${nombreDe(instancia)}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  };
  for (const instancia of instancias) {
    const objetos = await probar(instancia);
    if (objetos !== null) return { objetos, instancia };
  }
  const otra = queEsperan.sort((a, b) => a.esperar - b.esperar)[0];
  if (otra !== undefined && ahora() + otra.esperar * 1000 + 1000 < hasta) {
    await dormirDe(o)(otra.esperar * 1000);
    const objetos = await probar(otra.instancia);
    if (objetos !== null) return { objetos, instancia: otra.instancia };
  }
  throw new Error(`Overpass no contesta (${fallos.join("; ")})`);
}

/**
 * Lo que dicen los datos abiertos de unos sitios. Si una de las fuentes falla, se sigue con lo que dijeron las otras,
 * y se dice; si fallan todas, se dice con un error. Lo que no dicen es null.
 */
export async function abiertosDe(
  sitios: Sitio[],
  o: SalidaDeLosAbiertos = {},
  hoy: Date = new Date(),
): Promise<DatosAbiertos[]> {
  const visto = hoy.toISOString().slice(0, 10);
  const ahora = o.ahora ?? Date.now;
  const hasta = ahora() + (o.tope ?? TOPE_DE_OVERPASS);
  const avisar = o.avisar ?? ((texto: string) => console.warn(`datos abiertos: ${texto}`));
  const validos = sitios.filter((s) => esId(s.id));
  if (validos.length === 0) return [];
  const fallos: string[] = [];
  let wikidata = new Map<string, DeWikidata>();
  try {
    const url = `${WIKIDATA}?format=json&query=${encodeURIComponent(consultaDeLosAbiertos(validos.map((s) => s.id)))}`;
    wikidata = leerWikidata(await pedir(url, o));
  } catch (error) {
    fallos.push(error instanceof Error ? error.message : String(error));
  }

  // Overpass, en una consulta por cada tanda de sitios: los objetos que dice Wikidata y, de cada sitio, el que lleve
  // su identificador cerca de su punto (por si Wikidata no lo sabe, o el que dice es de otro).
  let instancias = o.overpass;
  if (instancias === undefined) {
    const delEntorno = instanciasDeOverpass(process.env.ELDORADO_OVERPASS);
    if (delEntorno.malas > 0) avisar(`${delEntorno.malas} de las direcciones de Overpass no valen y se dejan`);
    instancias = delEntorno.instancias;
  }
  instancias = instancias.filter(esInstancia).slice(0, INSTANCIAS_COMO_MUCHO);
  const traidos: Objeto[] = [];
  let sinOverpass: string | null = instancias.length === 0 ? "no hay ninguna dirección de Overpass que valga" : null;
  for (let i = 0; i < validos.length && sinOverpass === null; i += SITIOS_POR_CONSULTA) {
    const tanda = validos.slice(i, i + SITIOS_POR_CONSULTA);
    const consulta = consultaDeOverpass({
      objetos: tanda.flatMap((s) => wikidata.get(s.id)?.objetos ?? []),
      cerca: tanda.map((s) => ({ id: s.id, punto: s.punto })),
    });
    if (consulta === null) continue;
    try {
      const r = await deOverpass(consulta, instancias, hasta, o);
      traidos.push(...r.objetos);
      // La que contestó va delante para la tanda siguiente: no se insiste en las que no.
      instancias = [r.instancia, ...instancias.filter((x) => x !== r.instancia)];
    } catch (error) {
      sinOverpass = error instanceof Error ? error.message : String(error);
    }
  }

  // Un objeto es de su sitio si lo dice Wikidata (y no lleva el identificador de otro) o si él lleva el del sitio.
  const deCadaSitio = new Map<string, Objeto>();
  for (const s of validos) {
    const suyos = wikidata.get(s.id)?.objetos ?? [];
    const porWikidata = traidos.find(
      (x) => suyos.some((y) => y.tipo === x.tipo && y.id === x.id) && esDelSitio(x, s.id, true),
    );
    const uno = porWikidata ?? traidos.find((x) => esDelSitio(x, s.id, false));
    if (uno !== undefined) deCadaSitio.set(s.id, uno);
  }

  if (sinOverpass !== null) {
    fallos.push(sinOverpass);
    avisar(`sin el horario ni si se paga de OpenStreetMap: ${sinOverpass}`);
  }
  if (wikidata.size === 0 && deCadaSitio.size === 0 && fallos.length > 0) throw new Error(fallos[0]);
  return validos.map((s) => datosDe(s.id, wikidata.get(s.id), deCadaSitio.get(s.id) ?? null, visto));
}
