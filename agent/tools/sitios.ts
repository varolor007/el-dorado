// Los sitios que ver, de datos abiertos y en el momento: qué hay en una caja del mapa, qué es cada cosa, dónde está y
// cuánto se habla de ella (Wikidata), qué dice de ella su artículo (Wikipedia) y una foto con su autor y su licencia
// (Wikimedia Commons). No se guarda una base propia: se pide cada vez. Son datos libres y piden citar la fuente: cada
// sitio la lleva. Aquí no se elige qué merece el tiempo del viajero: eso es de un asiento.

import type { Encuadre, Foto, Punto } from "../output/viaje.ts";

export type Sitio = {
  /** Su identificador en Wikidata. */
  id: string;
  nombre: string;
  /** Qué es, en una palabra de las nuestras. */
  clase: string;
  /** Lo que dice Wikidata que es, con sus palabras. */
  clases: string[];
  punto: Punto;
  /** En cuántos idiomas tiene artículo: cuánto se habla de él. */
  enlaces: number;
  descripcion: string | null;
  /** Su artículo, en el idioma del viajero si lo hay. */
  articulo: string | null;
  articuloEnIngles: string | null;
  /** El nombre de su foto en Wikimedia Commons. */
  archivo: string | null;
  fuente: string;
  visto: string;
};

/** Qué es un sitio, por cómo se le nombra. El orden importa: gana la primera que casa. */
export const CLASES: [string, RegExp][] = [
  ["museum", /museum|art gallery|aquarium|planetarium/i],
  ["palace", /palace|manor house/i],
  ["castle", /castle|\bfort\b|fortress|fortified tower|citadel|city walls?/i],
  ["church", /church|cathedral|basilica|monastery|convent|chapel|synagogue|mosque|temple|abbey|shrine/i],
  ["viewpoint", /viewpoint|observation (deck|tower)|lookout|belvedere/i],
  ["market", /market/i],
  ["park", /\bpark\b|garden|botanical|\bzoo\b|nature reserve/i],
  ["beach", /beach/i],
  ["square", /\bsquare\b|plaza/i],
  ["bridge", /bridge|aqueduct/i],
  ["neighbourhood", /neighbou?rhood|\bquarter\b|city district|bairro|old town|urban ensemble|historic cent(re|er)/i],
  ["street", /\bstreet\b|avenue|promenade|boulevard/i],
  ["theatre", /theat(re|er)|opera house|concert hall/i],
  ["monument", /monument|memorial|statue|\btower\b|triumphal arch|fountain|lighthouse|mausoleum|pantheon/i],
  ["monument", /elevator|funicular|tourist attraction|heritage|landmark|archaeological site|ruins/i],
];

/** Lo que tiene sitio en el mapa y se nombra mucho, pero no se va a ver. */
export const NO_ES_UN_SITIO =
  /stadium|\barena\b|\bstation\b|stock exchange|regulated market|airport|aerodrome|universit|race track|motorsport/i;

/** Lo que es una división del mapa (un distrito, un municipio, una parroquia) y no un sitio al que ir. */
export const ES_UNA_DIVISION =
  /^district of|freguesia|civil parish|municipality|sovereign state|^country$|province|^locality$|administrative/i;

/**
 * La clase nuestra de un sitio, o null si nada de lo que es lo hace un sitio que ver. Manda cómo se llama; después,
 * cómo se describe, y al final, lo que dice Wikidata que es, que mezcla lo que fue con lo que es.
 */
export function claseDe(nombre: string, descripcion: string | null, clases: string[]): string | null {
  if ([descripcion ?? "", ...clases].some((c) => NO_ES_UN_SITIO.test(c))) return null;
  if (clases.some((c) => ES_UNA_DIVISION.test(c))) return null;
  for (const texto of [nombre, descripcion ?? ""])
    for (const [clase, patron] of CLASES) if (patron.test(texto)) return clase;
  for (const [clase, patron] of CLASES) if (clases.some((c) => patron.test(c))) return clase;
  return null;
}

export type Pedido = { minimoDeEnlaces?: number; cuantos?: number; idioma?: string };

/**
 * Una caja, con un margen alrededor, en grados. La caja de una ciudad es la de su término, y lo que está en su
 * borde (un faro, una torre en el agua) se queda fuera por metros: al pedir sus sitios se le da un margen.
 */
export function conMargen(caja: Encuadre, grados: number): Encuadre {
  return {
    oeste: caja.oeste - grados,
    sur: caja.sur - grados,
    este: caja.este + grados,
    norte: caja.norte + grados,
  };
}

const idiomaSeguro = (idioma: string): string => (/^[a-z]{2,3}$/.test(idioma) ? idioma : "en");

/** La consulta a Wikidata: todo lo que tiene sitio en la caja y del que se habla lo bastante, lo más conocido antes. */
export function consultaDeSitios(caja: Encuadre, p: Pedido = {}): string {
  const numeros = [caja.oeste, caja.sur, caja.este, caja.norte];
  if (!numeros.every(Number.isFinite) || !(caja.oeste < caja.este && caja.sur < caja.norte))
    throw new Error("la caja no encierra nada");
  const idioma = idiomaSeguro(p.idioma ?? "en");
  const minimo = Math.max(1, Math.floor(p.minimoDeEnlaces ?? 5));
  // Se piden más filas de las que hacen falta: muchas son de cosas que no son un sitio que ver, y se caen después.
  const filas = Math.min(500, Math.max(1, Math.floor(p.cuantos ?? 120)) * 6);
  return `SELECT ?item ?lat ?lon ?enlaces
  (SAMPLE(?nombreSuyo) AS ?nombre) (SAMPLE(?nombreIngles) AS ?nombreEn) (SAMPLE(?descripcion) AS ?about)
  (SAMPLE(?articuloSuyo) AS ?articulo) (SAMPLE(?articuloIngles) AS ?articuloEn) (SAMPLE(?imagen) AS ?foto)
  (GROUP_CONCAT(DISTINCT ?claseNombre; separator="|") AS ?clases) WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?donde .
    bd:serviceParam wikibase:cornerSouthWest "Point(${caja.oeste} ${caja.sur})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${caja.este} ${caja.norte})"^^geo:wktLiteral .
  }
  ?item wikibase:sitelinks ?enlaces . FILTER(?enlaces >= ${minimo})
  BIND(geof:latitude(?donde) AS ?lat) BIND(geof:longitude(?donde) AS ?lon)
  OPTIONAL { ?item wdt:P18 ?imagen . }
  OPTIONAL { ?item wdt:P31 ?clase . ?clase rdfs:label ?claseNombre . FILTER(LANG(?claseNombre) = "en") }
  OPTIONAL { ?item rdfs:label ?nombreSuyo . FILTER(LANG(?nombreSuyo) = "${idioma}") }
  OPTIONAL { ?item rdfs:label ?nombreIngles . FILTER(LANG(?nombreIngles) = "en") }
  OPTIONAL { ?item schema:description ?descripcion . FILTER(LANG(?descripcion) = "en") }
  OPTIONAL { ?articuloSuyo schema:about ?item ; schema:isPartOf <https://${idioma}.wikipedia.org/> . }
  OPTIONAL { ?articuloIngles schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
} GROUP BY ?item ?lat ?lon ?enlaces ORDER BY DESC(?enlaces) LIMIT ${filas}`;
}

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): Objeto => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const valor = (fila: Objeto, campo: string): string | null => {
  const v = objeto(fila[campo]).value;
  return typeof v === "string" && v.trim() !== "" ? v : null;
};

/** Una dirección de Wikipedia o de Commons, y de ningún otro sitio. */
function deWikimedia(url: string | null): string | null {
  if (url === null) return null;
  try {
    const u = new URL(url);
    const maquina = u.hostname.toLowerCase();
    const buena = /(^|\.)(wikipedia|wikimedia|wikidata)\.org$/.test(maquina);
    // Las fotos llegan a veces con etiquetas de seguimiento detrás: no hacen falta.
    if (maquina === "upload.wikimedia.org") u.search = "";
    return u.protocol === "https:" && buena ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Lo que devuelve Wikidata, leído sin fiarse de su forma: un sitio por identificador, y solo lo que es un sitio. */
export function leerSitios(json: unknown, visto: string, cuantos = 120): Sitio[] {
  const sitios = new Map<string, Sitio>();
  for (const cruda of lista(objeto(objeto(json).results).bindings)) {
    const fila = objeto(cruda);
    const id = /\/(Q\d+)$/.exec(valor(fila, "item") ?? "")?.[1];
    const lat = Number(valor(fila, "lat"));
    const lon = Number(valor(fila, "lon"));
    const enlaces = Number(valor(fila, "enlaces"));
    const nombre = valor(fila, "nombre") ?? valor(fila, "nombreEn");
    if (id === undefined || sitios.has(id) || nombre === null) continue;
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180) || !(enlaces >= 0)) continue;
    const clases = (valor(fila, "clases") ?? "").split("|").filter((c) => c !== "");
    const clase = claseDe(valor(fila, "nombreEn") ?? nombre, valor(fila, "about"), clases);
    if (clase === null) continue;
    const foto = valor(fila, "foto");
    const archivo = foto === null ? null : (foto.split("/Special:FilePath/")[1] ?? null);
    sitios.set(id, {
      id,
      nombre,
      clase,
      clases,
      punto: { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) },
      enlaces,
      descripcion: valor(fila, "about"),
      articulo: deWikimedia(valor(fila, "articulo")) ?? deWikimedia(valor(fila, "articuloEn")),
      articuloEnIngles: deWikimedia(valor(fila, "articuloEn")),
      archivo: archivo === null ? null : decodeURIComponent(archivo).replaceAll("_", " "),
      fuente: "wikidata",
      visto,
    });
  }
  return [...sitios.values()].sort((a, b) => b.enlaces - a.enlaces || a.id.localeCompare(b.id)).slice(0, cuantos);
}

const sinMarcas = (html: unknown): string | null => {
  if (typeof html !== "string") return null;
  const limpio = html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return limpio === "" ? null : limpio.slice(0, 160);
};

/** Lo que devuelve Commons de unas fotos: de cada una, su miniatura, su autor, su licencia y su página. */
export function leerFotos(json: unknown): Map<string, Foto> {
  const consulta = objeto(objeto(json).query);
  const pedido = new Map<string, string>();
  for (const n of lista(consulta.normalized)) {
    const { from, to } = objeto(n);
    if (typeof from === "string" && typeof to === "string") pedido.set(to, from);
  }
  const fotos = new Map<string, Foto>();
  for (const cruda of Object.values(objeto(consulta.pages))) {
    const pagina = objeto(cruda);
    const info = objeto(lista(pagina.imageinfo)[0]);
    const titulo = typeof pagina.title === "string" ? pagina.title : null;
    const url = deWikimedia(typeof info.thumburl === "string" ? info.thumburl : null);
    if (titulo === null || url === null) continue;
    const meta = objeto(info.extmetadata);
    const foto: Foto = {
      url,
      autor: sinMarcas(objeto(meta.Artist).value),
      licencia: sinMarcas(objeto(meta.LicenseShortName).value),
      pagina: deWikimedia(typeof info.descriptionurl === "string" ? info.descriptionurl : null),
    };
    for (const nombre of [titulo, pedido.get(titulo) ?? titulo])
      fotos.set(nombre.replace(/^File:/, "").replaceAll("_", " "), foto);
  }
  return fotos;
}

/** Lo que devuelve Wikipedia de unos artículos: de cada título, sus primeras frases. */
export function leerResumenes(json: unknown): Map<string, string> {
  const consulta = objeto(objeto(json).query);
  const pedido = new Map<string, string>();
  for (const paso of [...lista(consulta.normalized), ...lista(consulta.redirects)]) {
    const { from, to } = objeto(paso);
    if (typeof from === "string" && typeof to === "string") pedido.set(to, pedido.get(from) ?? from);
  }
  const resumenes = new Map<string, string>();
  for (const cruda of Object.values(objeto(consulta.pages))) {
    const pagina = objeto(cruda);
    const texto = typeof pagina.extract === "string" ? pagina.extract.replace(/\s+/g, " ").trim() : "";
    if (typeof pagina.title !== "string" || texto === "") continue;
    const corto = texto.slice(0, 500);
    resumenes.set(pagina.title, corto);
    resumenes.set(pedido.get(pagina.title) ?? pagina.title, corto);
  }
  return resumenes;
}

// La salida a internet. Wikimedia corta a quien pide muchas cosas seguidas: se pide de pocas en pocas y, si dice que
// se espere, se espera y se vuelve a pedir, unas pocas veces.

export type Respuesta = { estado: number; cuerpo: string; esperar: number | null };
export type Traer = (url: string) => Promise<Respuesta>;
export type Salida = { traer?: Traer; dormir?: (ms: number) => Promise<void>; intentos?: number };

/** Quiénes somos para las fuentes abiertas: un nombre de programa, sin datos de nadie. */
const AGENTE = "ElDoradoTravelPlanner/0.1 (open data; non-commercial prototype)";

const deInternet: Traer = async (url) => {
  const r = await fetch(url, {
    headers: { "User-Agent": AGENTE, Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  const espera = Number(r.headers.get("retry-after"));
  return { estado: r.status, cuerpo: await r.text(), esperar: Number.isFinite(espera) && espera > 0 ? espera : null };
};

async function pedir(url: string, o: Salida): Promise<unknown> {
  const traer = o.traer ?? deInternet;
  const dormir = o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const intentos = o.intentos ?? 5;
  for (let intento = 1; ; intento++) {
    const r = await traer(url);
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

const WIKIDATA = "https://query.wikidata.org/sparql";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

/** Los sitios de una caja del mapa, lo más conocido antes. */
export async function sitiosDe(caja: Encuadre, p: Pedido = {}, o: Salida = {}): Promise<Sitio[]> {
  const url = `${WIKIDATA}?format=json&query=${encodeURIComponent(consultaDeSitios(caja, p))}`;
  return leerSitios(await pedir(url, o), new Date().toISOString(), p.cuantos ?? 120);
}

function tandas<T>(todos: T[], de: number): T[][] {
  const salida: T[][] = [];
  for (let i = 0; i < todos.length; i += de) salida.push(todos.slice(i, i + de));
  return salida;
}

/** La foto de cada archivo de Commons, con su autor y su licencia. La que no se encuentra, no sale. */
export async function fotosDe(archivos: string[], o: Salida = {}, ancho = 640): Promise<Map<string, Foto>> {
  const fotos = new Map<string, Foto>();
  for (const tanda of tandas([...new Set(archivos)], 40)) {
    const q = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(ancho),
      titles: tanda.map((a) => `File:${a}`).join("|"),
    });
    for (const [nombre, foto] of leerFotos(await pedir(`${COMMONS}?${q}`, o))) fotos.set(nombre, foto);
  }
  return fotos;
}

/** Las primeras frases del artículo en inglés de cada sitio que lo tenga, por su identificador. */
export async function resumenesDe(sitios: Sitio[], o: Salida = {}): Promise<Map<string, string>> {
  const titulo = (s: Sitio): string | null => {
    const m = /^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/.exec(s.articuloEnIngles ?? "");
    return m === null ? null : decodeURIComponent(m[1]).replaceAll("_", " ");
  };
  const conTitulo = sitios.flatMap((s) => {
    const t = titulo(s);
    return t === null ? [] : [{ id: s.id, titulo: t }];
  });
  const porId = new Map<string, string>();
  for (const tanda of tandas(conTitulo, 20)) {
    const q = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      exlimit: "20",
      redirects: "1",
      titles: tanda.map((x) => x.titulo).join("|"),
    });
    const resumenes = leerResumenes(await pedir(`https://en.wikipedia.org/w/api.php?${q}`, o));
    for (const x of tanda) {
      const texto = resumenes.get(x.titulo);
      if (texto !== undefined) porId.set(x.id, texto);
    }
  }
  return porId;
}
