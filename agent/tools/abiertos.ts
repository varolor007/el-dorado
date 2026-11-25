// Lo que dicen los datos abiertos de los sitios elegidos (14.4), sin leer su web: su horario y si se paga, de
// OpenStreetMap, y su web oficial, de Wikidata. Son datos libres y piden citar la fuente: cada dato lleva la página de
// donde sale. El horario se guarda tal cual lo escribe la fuente; lo que de él se entiende lo lee el código después
// (`agent/tools/horarios.ts`), y lo que no, no se sabe. No se adivina nada: un objeto de OpenStreetMap solo es de un
// sitio si lo dice Wikidata o si él mismo lleva el identificador del sitio.
//
// Cómo se llega a cada uno: Wikidata dice su web y, si lo sabe, su objeto de OpenStreetMap; ese objeto se pide a la
// API de OpenStreetMap. Del que Wikidata no lo sabe, se busca por su nombre junto a su punto en el buscador de
// OpenStreetMap, y vale solo el resultado que lleve el identificador del sitio. El buscador pide una consulta por
// segundo: se le pide de una en una.

import type { DatosAbiertos } from "../scripts/capa_entradas.ts";
import type { FuenteDeUnDato } from "../output/capas.ts";
import { enlaceSinClaves } from "./enlaces.ts";
import { AGENTE, type Respuesta, type Salida, type Sitio, type Traer } from "./sitios.ts";

const WIKIDATA = "https://query.wikidata.org/sparql";
const API_DE_OSM = "https://api.openstreetmap.org/api/0.6";
const BUSCADOR_DE_OSM = "https://nominatim.openstreetmap.org/search";

/** Lo que se espera entre dos consultas al buscador de OpenStreetMap: pide una por segundo como mucho. */
export const ESPERA_DEL_BUSCADOR = 1100;
/** Lo que se aparta la caja de búsqueda del punto del sitio, en grados: unos quinientos metros. */
const CERCA = 0.005;

const TIPOS = ["node", "way", "relation"] as const;
type Tipo = (typeof TIPOS)[number];
type Objeto = { tipo: Tipo; id: number; etiquetas: Record<string, string> };

const esId = (id: string): boolean => /^Q\d{1,12}$/.test(id);
const esNumero = (v: unknown): v is string => typeof v === "string" && /^\d{1,15}$/.test(v);

const deInternet: Traer = async (url) => {
  const r = await fetch(url, {
    headers: { "User-Agent": AGENTE, Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  const espera = Number(r.headers.get("retry-after"));
  return { estado: r.status, cuerpo: await r.text(), esperar: Number.isFinite(espera) && espera > 0 ? espera : null };
};

/** Pide una dirección y devuelve su JSON; si dice que se espere, espera y lo vuelve a pedir, unas pocas veces. */
async function pedir(url: string, o: Salida): Promise<unknown> {
  const traer = o.traer ?? deInternet;
  const dormir = o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const intentos = o.intentos ?? 3;
  for (let intento = 1; ; intento++) {
    const r: Respuesta = await traer(url);
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

/** Lo que contesta la API de OpenStreetMap: cada objeto, con su tipo, su número y sus etiquetas. */
export function leerObjetos(json: unknown): Objeto[] {
  const elementos = (json as { elements?: unknown[] })?.elements;
  return (Array.isArray(elementos) ? elementos : []).flatMap((e) => {
    const x = e as { type?: unknown; id?: unknown; tags?: unknown };
    if (!TIPOS.includes(x.type as Tipo) || !Number.isSafeInteger(x.id)) return [];
    return [{ tipo: x.type as Tipo, id: x.id as number, etiquetas: etiquetasDe(x.tags) }];
  });
}

/** Lo que contesta el buscador de OpenStreetMap: cada resultado como un objeto, con sus etiquetas de más. */
export function leerBusqueda(json: unknown): Objeto[] {
  return (Array.isArray(json) ? json : []).flatMap((e) => {
    const x = e as { osm_type?: unknown; osm_id?: unknown; extratags?: unknown };
    if (!TIPOS.includes(x.osm_type as Tipo) || !Number.isSafeInteger(x.osm_id)) return [];
    return [{ tipo: x.osm_type as Tipo, id: x.osm_id as number, etiquetas: etiquetasDe(x.extratags) }];
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

/** Los objetos de un tipo, de una vez; si falla uno, de uno en uno, y el que no está se deja. */
async function objetosDe(tipo: Tipo, ids: number[], o: Salida): Promise<Objeto[]> {
  if (ids.length === 0) return [];
  try {
    return leerObjetos(await pedir(`${API_DE_OSM}/${tipo}s.json?${tipo}s=${ids.join(",")}`, o));
  } catch {
    const salida: Objeto[] = [];
    for (const id of ids)
      try {
        salida.push(...leerObjetos(await pedir(`${API_DE_OSM}/${tipo}/${id}.json`, o)));
      } catch {
        // Un objeto que ya no está (borrado, o mal dicho en Wikidata) no es de nadie.
      }
    return salida;
  }
}

/** La consulta al buscador de OpenStreetMap: el nombre del sitio, solo cerca de su punto, con sus etiquetas de más. */
export function busquedaDe(s: Sitio): string {
  const { lat, lon } = s.punto;
  const caja = [lon - CERCA, lat + CERCA, lon + CERCA, lat - CERCA].map((n) => n.toFixed(5)).join(",");
  const q = new URLSearchParams({
    q: s.nombre,
    format: "jsonv2",
    extratags: "1",
    limit: "5",
    viewbox: caja,
    bounded: "1",
  });
  return `${BUSCADOR_DE_OSM}?${q}`;
}

/**
 * Lo que dicen los datos abiertos de unos sitios. Si una de las fuentes falla, se sigue con lo que dijeron las otras;
 * si fallan todas, se dice. Lo que no dicen es null.
 */
export async function abiertosDe(sitios: Sitio[], o: Salida = {}, hoy: Date = new Date()): Promise<DatosAbiertos[]> {
  const visto = hoy.toISOString().slice(0, 10);
  const dormir = o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
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

  // Los objetos que dice Wikidata, por tipo; cada uno vale para su sitio si no lleva el de otro.
  const deCadaSitio = new Map<string, Objeto>();
  try {
    for (const tipo of TIPOS) {
      const pedidos = validos.flatMap((s) => (wikidata.get(s.id)?.objetos ?? []).filter((x) => x.tipo === tipo));
      const ids = [...new Set(pedidos.map((x) => x.id))].sort((a, b) => a - b);
      const traidos = await objetosDe(tipo, ids, o);
      for (const s of validos) {
        if (deCadaSitio.has(s.id)) continue;
        const suyos =
          wikidata
            .get(s.id)
            ?.objetos.filter((x) => x.tipo === tipo)
            .map((x) => x.id) ?? [];
        const uno = traidos.find((x) => suyos.includes(x.id) && esDelSitio(x, s.id, true));
        if (uno !== undefined) deCadaSitio.set(s.id, uno);
      }
    }
  } catch (error) {
    fallos.push(error instanceof Error ? error.message : String(error));
  }

  // Los que siguen sin objeto, al buscador: vale solo el que lleve el identificador del sitio.
  let busquedas = 0;
  for (const s of validos) {
    if (deCadaSitio.has(s.id)) continue;
    if (busquedas++ > 0) await dormir(ESPERA_DEL_BUSCADOR);
    try {
      const uno = leerBusqueda(await pedir(busquedaDe(s), o)).find((x) => esDelSitio(x, s.id, false));
      if (uno !== undefined) deCadaSitio.set(s.id, uno);
    } catch (error) {
      fallos.push(error instanceof Error ? error.message : String(error));
      // Si el buscador no contesta, no se le sigue pidiendo.
      break;
    }
  }
  if (wikidata.size === 0 && deCadaSitio.size === 0 && fallos.length > 0) throw new Error(fallos[0]);
  return validos.map((s) => datosDe(s.id, wikidata.get(s.id), deCadaSitio.get(s.id) ?? null, visto));
}
