// Los sitios que ver, de datos abiertos y en el momento: qué hay en una caja del mapa, qué es cada cosa, dónde está y
// cuánto se habla de ella (Wikidata), qué dice de ella su artículo (Wikipedia) y una foto con su autor y su licencia
// (Wikimedia Commons). No se guarda una base propia: se pide cada vez. Son datos libres y piden citar la fuente: cada
// sitio la lleva. Aquí no se elige qué merece el tiempo del viajero: eso es de un asiento.

import { ATRACCION, BLANDAS, DIVISIONES, GENERICA, NO_SE_VA_A_VER, NUNCA_UN_SITIO, RAICES } from "../data/sitios.ts";
import { nombreDeFuera } from "../gates/textos.ts";
import type { Encuadre, Foto, Punto } from "../output/viaje.ts";

export type Sitio = {
  /** Su identificador en Wikidata. */
  id: string;
  nombre: string;
  /** Qué es, en una palabra de las nuestras. */
  clase: string;
  /** Lo que dice la fuente que es, con sus palabras: para leerlo, no para decidir con ello. */
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

/**
 * La clase nuestra de un sitio, o null si nada de lo que es lo hace un sitio que ver. No mira cómo se llama ni en
 * qué idioma: mira de qué clases desciende lo que la fuente dice que es, y gana la primera de la lista. Lo que no es
 * de ninguna (una empresa, un suceso) no es un sitio. El árbol de clases de la fuente tiene ruido, así que lo que
 * quita solo quita a lo que no es de una clase concreta: una ciudad o un distrito no entran como barrio ni como
 * patrimonio, y un estadio o una estación no entran por ser patrimonio, salvo que la fuente diga que son una
 * atracción. Un castillo, un anfiteatro o una isla siguen siendo sitios.
 */
export function claseDe(clases: string[], raicesDe: Map<string, string[]>): string | null {
  const raices = new Set(clases.flatMap((c) => raicesDe.get(c) ?? []));
  // Un país no es un sitio que ver, aunque sea también una isla o un archipiélago.
  if (NUNCA_UN_SITIO.some((n) => raices.has(n.raiz))) return null;
  const suyas = RAICES.filter((r) => raices.has(r.raiz)).map((r) => r.clase);
  // Gana la primera de la lista que sea concreta; una blanda (un barrio, un patrimonio a secas) solo si no hay otra.
  const clase = suyas.find((c) => !BLANDAS.includes(c)) ?? suyas[0] ?? null;
  if (clase === null || !BLANDAS.includes(clase)) return clase;
  if (DIVISIONES.some((d) => raices.has(d.raiz))) return null;
  if (clase === GENERICA && NO_SE_VA_A_VER.some((n) => raices.has(n.raiz)) && !raices.has(ATRACCION)) return null;
  return clase;
}

/**
 * Lo que se pide: cuánta fama como mínimo, cuántos y en qué idioma. Con `raices`, solo lo que desciende de esas
 * clases de la fuente (sus identificadores, `Q` y un número): así se vuelve a los datos abiertos por algo que pidió
 * el viajero y no estaba, como una playa o un mercado.
 */
export type Pedido = {
  minimoDeEnlaces?: number;
  cuantos?: number;
  idioma?: string;
  raices?: string[];
  /** Solo lo de este país, por su código de dos letras: la caja de un país coge también lo de sus vecinos. */
  pais?: string;
};

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

/** Lo que se pide, ya mirado: solo números y letras que no pueden cambiar la consulta. */
type Mirado = { idioma: string; minimo: number; filas: number; deClase: string; pais: string | null };

function mirar(caja: Encuadre, p: Pedido): Mirado {
  const numeros = [caja.oeste, caja.sur, caja.este, caja.norte];
  if (!numeros.every(Number.isFinite) || !(caja.oeste < caja.este && caja.sur < caja.norte))
    throw new Error("la caja no encierra nada");
  // Solo identificadores de la fuente: nada de lo que se le pase entra en la consulta como texto.
  const raices = (p.raices ?? []).filter((r) => /^Q\d{1,12}$/.test(r));
  if (p.raices !== undefined && raices.length === 0) throw new Error("no hay ninguna clase que pedir");
  if (p.pais !== undefined && !/^[A-Z]{2}$/.test(p.pais)) throw new Error("el país no son dos letras");
  return {
    idioma: idiomaSeguro(p.idioma ?? "en"),
    minimo: Math.max(1, Math.floor(p.minimoDeEnlaces ?? 5)),
    // Se piden más filas de las que hacen falta: muchas son de cosas que no son un sitio que ver, y se caen después.
    filas: Math.min(500, Math.max(1, Math.floor(p.cuantos ?? 120)) * 6),
    deClase:
      raices.length === 0
        ? ""
        : `\n    ?item wdt:P31/wdt:P279* ?raiz . VALUES ?raiz { ${raices.map((r) => `wd:${r}`).join(" ")} }`,
    pais: p.pais ?? null,
  };
}

/**
 * Con país, de lo más conocido de la caja se piden más, porque una parte es de los vecinos y se cae al mirar el país.
 * El país se mira sobre esos, y no sobre todo lo que hay en la caja: eso no acaba a tiempo.
 */
const conocidosQueSePiden = (m: Mirado): number => (m.pais === null ? m.filas : Math.min(1500, m.filas * 3));

const caja = (c: Encuadre, sangria: string): string => `${sangria}SERVICE wikibase:box {
${sangria}  ?item wdt:P625 ?donde .
${sangria}  bd:serviceParam wikibase:cornerSouthWest "Point(${c.oeste} ${c.sur})"^^geo:wktLiteral .
${sangria}  bd:serviceParam wikibase:cornerNorthEast "Point(${c.este} ${c.norte})"^^geo:wktLiteral .
${sangria}}`;

const CABEZA = `SELECT ?item ?lat ?lon ?enlaces
  (SAMPLE(?nombreSuyo) AS ?nombre) (SAMPLE(?nombreIngles) AS ?nombreEn) (SAMPLE(?descripcion) AS ?about)
  (SAMPLE(?articuloSuyo) AS ?articulo) (SAMPLE(?articuloIngles) AS ?articuloEn) (SAMPLE(?imagen) AS ?foto)
  (GROUP_CONCAT(DISTINCT ?claseNombre; separator="|") AS ?clases)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?clase), "/entity/"); separator="|") AS ?clasesQ) WHERE {`;

/** Lo de cada cosa ya elegida: su país, si se pide, sus nombres, su foto, sus clases y sus artículos. */
function detalles(m: Mirado, filas: number): string {
  const delPais = m.pais === null ? "" : `  ?item wdt:P17/wdt:P297 "${m.pais}" .\n`;
  return `${delPais}  BIND(geof:latitude(?donde) AS ?lat) BIND(geof:longitude(?donde) AS ?lon)
  OPTIONAL { ?item wdt:P18 ?imagen . }
  OPTIONAL { ?item wdt:P31 ?clase . }
  OPTIONAL {
    ?item wdt:P31 ?claseConNombre . ?claseConNombre rdfs:label ?claseNombre . FILTER(LANG(?claseNombre) = "en")
  }
  OPTIONAL { ?item rdfs:label ?nombreSuyo . FILTER(LANG(?nombreSuyo) = "${m.idioma}") }
  OPTIONAL { ?item rdfs:label ?nombreIngles . FILTER(LANG(?nombreIngles) = "en") }
  OPTIONAL { ?item schema:description ?descripcion . FILTER(LANG(?descripcion) = "en") }
  OPTIONAL { ?articuloSuyo schema:about ?item ; schema:isPartOf <https://${m.idioma}.wikipedia.org/> . }
  OPTIONAL { ?articuloIngles schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
} GROUP BY ?item ?lat ?lon ?enlaces ORDER BY DESC(?enlaces) LIMIT ${filas}`;
}

/**
 * La consulta a Wikidata de una caja pequeña, de una vez: todo lo que tiene sitio en la caja y del que se habla lo
 * bastante, lo más conocido antes. Lo más conocido se elige primero, en una subconsulta, y solo de eso se piden los
 * nombres, las fotos y los artículos: pedirlo de todo lo que hay en la caja no acaba a tiempo.
 */
export function consultaDeSitios(c: Encuadre, p: Pedido = {}): string {
  const m = mirar(c, p);
  return `${CABEZA}
  { SELECT ?item ?donde ?enlaces WHERE {
${caja(c, "    ")}
    ?item wikibase:sitelinks ?enlaces . FILTER(?enlaces >= ${m.minimo})${m.deClase}
  } ORDER BY DESC(?enlaces) LIMIT ${conocidosQueSePiden(m)} }
${detalles(m, m.filas)}`;
}

/** Lo más conocido de un trozo de una caja grande: solo qué es y de cuánto se habla, sin nada más. */
export function consultaDeLoConocido(c: Encuadre, p: Pedido = {}): string {
  const m = mirar(c, p);
  return `SELECT ?item ?enlaces WHERE {
${caja(c, "  ")}
  ?item wikibase:sitelinks ?enlaces . FILTER(?enlaces >= ${m.minimo})${m.deClase}
} ORDER BY DESC(?enlaces) LIMIT ${conocidosQueSePiden(m)}`;
}

/** Lo de unas cosas ya elegidas por su número de la fuente, con su sitio en el mapa y lo demás. */
export function consultaDeLosElegidos(items: string[], p: Pedido = {}): string {
  const m = mirar({ oeste: 0, sur: 0, este: 1, norte: 1 }, p);
  const qs = [...new Set(items)].filter(esQ);
  if (qs.length === 0) throw new Error("no hay nada elegido que pedir");
  return `${CABEZA}
  VALUES ?item { ${qs.map((q) => `wd:${q}`).join(" ")} }
  ?item wdt:P625 ?donde . ?item wikibase:sitelinks ?enlaces .
${detalles(m, m.filas)}`;
}

/** El lado más grande, en grados, de lo que se pide de una vez: una caja mayor se parte en trozos de este lado. */
export const LADO_DE_UN_TROZO = 5;

/** Los trozos de una caja, de izquierda a derecha y de abajo arriba; una caja pequeña es un solo trozo. */
export function trozosDe(c: Encuadre, lado = LADO_DE_UN_TROZO): Encuadre[] {
  const trozos: Encuadre[] = [];
  for (let oeste = c.oeste; oeste < c.este; oeste += lado)
    for (let sur = c.sur; sur < c.norte; sur += lado)
      trozos.push({ oeste, sur, este: Math.min(oeste + lado, c.este), norte: Math.min(sur + lado, c.norte) });
  return trozos;
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

/** Lo que hay en la caja, antes de saber si es un sitio que ver: lo que dice la fuente, y sus clases por su número. */
export type Candidato = Omit<Sitio, "clase"> & { clasesQ: string[] };

const esQ = (v: string): boolean => /^Q\d+$/.test(v);

/**
 * Un trozo de una dirección, leído como texto. La fuente lo manda con sus signos de dirección, y un «%» suelto no se
 * puede leer: null, y quien lo pedía se queda sin ello, en vez de caerse todo lo demás.
 */
function deDireccion(trozo: string): string | null {
  try {
    return decodeURIComponent(trozo).replaceAll("_", " ");
  } catch {
    return null;
  }
}

/** Lo que devuelve Wikidata de una caja, leído sin fiarse de su forma: un candidato por identificador. */
export function leerCandidatos(json: unknown, visto: string): Candidato[] {
  const candidatos = new Map<string, Candidato>();
  for (const cruda of lista(objeto(objeto(json).results).bindings)) {
    const fila = objeto(cruda);
    const id = /\/(Q\d+)$/.exec(valor(fila, "item") ?? "")?.[1];
    // Lo que falta no es un cero: una fila sin sus coordenadas no es un sitio en medio del mar.
    const numero = (campo: string): number => {
      const crudo = valor(fila, campo);
      return crudo === null || crudo === undefined || String(crudo).trim() === "" ? Number.NaN : Number(crudo);
    };
    const lat = numero("lat");
    const lon = numero("lon");
    const enlaces = numero("enlaces");
    // La etiqueta la escribe quien quiera en los datos abiertos, y de aquí va a la pantalla del viajero y, como
    // nombre de zona, a otra fuente: si no es un nombre (corto, en una línea y sin direcciones), la cosa no entra.
    const nombre = nombreDeFuera(valor(fila, "nombre") ?? valor(fila, "nombreEn") ?? "");
    if (id === undefined || candidatos.has(id) || nombre === null) continue;
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180) || !(enlaces >= 0)) continue;
    const foto = valor(fila, "foto");
    const archivo = foto === null ? null : (foto.split("/Special:FilePath/")[1] ?? null);
    candidatos.set(id, {
      id,
      nombre,
      clases: (valor(fila, "clases") ?? "").split("|").filter((c) => c !== ""),
      clasesQ: (valor(fila, "clasesQ") ?? "").split("|").filter(esQ),
      punto: { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) },
      enlaces,
      descripcion: valor(fila, "about"),
      articulo: deWikimedia(valor(fila, "articulo")) ?? deWikimedia(valor(fila, "articuloEn")),
      articuloEnIngles: deWikimedia(valor(fila, "articuloEn")),
      archivo: archivo === null ? null : deDireccion(archivo),
      fuente: "wikidata",
      visto,
    });
  }
  return [...candidatos.values()];
}

/** La consulta que dice, de unas clases, de cuáles de las nuestras desciende cada una. */
export function consultaDeRaices(clases: string[]): string {
  const nuestras = [
    ...new Set([...RAICES, ...NO_SE_VA_A_VER, ...DIVISIONES, ...NUNCA_UN_SITIO].map((r) => r.raiz)),
    ATRACCION,
  ];
  const valores = (qs: string[]): string =>
    [...new Set(qs)]
      .filter(esQ)
      .map((q) => `wd:${q}`)
      .join(" ");
  const deCuales = `VALUES ?c { ${valores(clases)} } VALUES ?raiz { ${valores(nuestras)} }`;
  return `SELECT ?c ?raiz WHERE { ${deCuales} ?c wdt:P279* ?raiz . }`;
}

/** Lo que devuelve esa consulta: de cada clase, las nuestras de las que desciende. */
export function leerRaices(json: unknown, raicesDe: Map<string, string[]> = new Map()): Map<string, string[]> {
  for (const cruda of lista(objeto(objeto(json).results).bindings)) {
    const fila = objeto(cruda);
    const c = /\/(Q\d+)$/.exec(valor(fila, "c") ?? "")?.[1];
    const raiz = /\/(Q\d+)$/.exec(valor(fila, "raiz") ?? "")?.[1];
    if (c === undefined || raiz === undefined) continue;
    const suyas = raicesDe.get(c) ?? [];
    if (!suyas.includes(raiz)) raicesDe.set(c, [...suyas, raiz]);
  }
  return raicesDe;
}

/** De los candidatos, los que son un sitio que ver, con su clase; lo más conocido antes, y hasta el tope. */
export function clasificar(candidatos: Candidato[], raicesDe: Map<string, string[]>, cuantos = 120): Sitio[] {
  const sitios: Sitio[] = [];
  for (const { clasesQ, ...c } of candidatos) {
    const clase = claseDe(clasesQ, raicesDe);
    if (clase !== null) sitios.push({ ...c, clase });
  }
  return sitios.sort((a, b) => b.enlaces - a.enlaces || a.id.localeCompare(b.id)).slice(0, cuantos);
}

/** Lo más que se lee del autor o de la licencia de una foto, con sus marcas: de ahí sale lo que se enseña. */
const LETRAS_CON_MARCAS = 2000;

const sinMarcas = (html: unknown): string | null => {
  if (typeof html !== "string") return null;
  // Se corta antes de limpiar: quitar las marcas a un texto enorme hecho de «<» tarda con el cuadrado de su largo,
  // y la casa se queda parada. Si el corte cae dentro de una marca, lo que queda de ella tampoco es texto.
  const corto = html.length > LETRAS_CON_MARCAS ? html.slice(0, LETRAS_CON_MARCAS).replace(/<[^>]*$/, "") : html;
  const limpio = corto
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return limpio === "" ? null : limpio.slice(0, 160);
};

/**
 * Cuando el autor de una foto no está escrito para que lo lea un programa, Commons lo dice con una frase suya y,
 * dentro, a quién se lo supone. El autor es ese nombre, no la frase; y si la frase no trae nombre, no hay autor.
 */
const AUTOR_SUPUESTO = /^No machine-readable author provided\.?\s*(?:(.+?)\s+assumed(?:\s*\(.*\))?\.?)?$/i;

export const autorDe = (artista: unknown): string | null => {
  const limpio = sinMarcas(artista);
  if (limpio === null) return null;
  const supuesto = AUTOR_SUPUESTO.exec(limpio);
  if (supuesto === null) return limpio;
  return supuesto[1]?.trim() || null;
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
      autor: autorDe(objeto(meta.Artist).value),
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
export const AGENTE = "ElDoradoTravelPlanner/0.1 (open data; non-commercial prototype)";

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
    let r: Respuesta;
    try {
      r = await traer(url);
    } catch (error) {
      // Sin respuesta a tiempo: se vuelve a pedir una vez, como con 502 y 504.
      if (intento >= 2) throw error;
      await dormir(5000);
      continue;
    }
    if (r.estado === 200) {
      try {
        return JSON.parse(r.cuerpo);
      } catch {
        throw new Error("los datos abiertos no contestan con datos");
      }
    }
    // Con 502 y 504 la fuente estaba saturada o no acabó a tiempo: se vuelve a pedir una vez, no más.
    const reintentable =
      r.estado === 429 || r.estado === 503 || ((r.estado === 502 || r.estado === 504) && intento < 2);
    if (!reintentable || intento >= intentos) throw new Error(`los datos abiertos contestan ${r.estado}`);
    await dormir(Math.min(60, r.esperar ?? 5 * intento) * 1000);
  }
}

const WIKIDATA = "https://query.wikidata.org/sparql";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

const aWikidata = (consulta: string): string => `${WIKIDATA}?format=json&query=${encodeURIComponent(consulta)}`;

/** Cuántos trozos de una caja grande se piden a la vez: la fuente deja pocas consultas a la vez por cliente. */
const TROZOS_A_LA_VEZ = 3;
/** De cuántos en cuántos se piden los datos de lo elegido: la consulta va en la dirección, y tiene un largo. */
const ELEGIDOS_DE_UNA_VEZ = 150;

/**
 * Lo más conocido de una caja grande, como candidatos: lo más conocido de cada trozo, juntos y ordenados, y los datos
 * solo de lo elegido, de lo más conocido abajo, hasta tener bastantes. Con país, los de otro país se caen ahí.
 */
async function candidatosPorTrozos(c: Encuadre, p: Pedido, o: Salida): Promise<Candidato[]> {
  const conocidos = new Map<string, number>();
  const trozos = trozosDe(c);
  for (let i = 0; i < trozos.length; i += TROZOS_A_LA_VEZ) {
    const tanda = trozos.slice(i, i + TROZOS_A_LA_VEZ);
    const respuestas = await Promise.all(tanda.map((t) => pedir(aWikidata(consultaDeLoConocido(t, p)), o)));
    for (const json of respuestas)
      for (const cruda of lista(objeto(objeto(json).results).bindings)) {
        const fila = objeto(cruda);
        const id = /\/(Q\d+)$/.exec(valor(fila, "item") ?? "")?.[1];
        const enlaces = Number(valor(fila, "enlaces"));
        if (id !== undefined && Number.isFinite(enlaces)) conocidos.set(id, Math.max(enlaces, conocidos.get(id) ?? 0));
      }
  }
  const m = mirar(c, p);
  const elegidos = [...conocidos.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, conocidosQueSePiden(m))
    .map(([id]) => id);
  const visto = new Date().toISOString();
  const candidatos: Candidato[] = [];
  for (let i = 0; i < elegidos.length && candidatos.length < m.filas; i += ELEGIDOS_DE_UNA_VEZ) {
    const consulta = consultaDeLosElegidos(elegidos.slice(i, i + ELEGIDOS_DE_UNA_VEZ), p);
    candidatos.push(...leerCandidatos(await pedir(aWikidata(consulta), o), visto));
  }
  return candidatos.slice(0, m.filas);
}

/**
 * Los sitios de una caja del mapa, lo más conocido antes. Una caja pequeña (una ciudad, una región) se pide de una
 * vez; una grande (un país), por trozos, porque de una vez no acaba a tiempo (Indonesia, 26-nov).
 */
export async function sitiosDe(caja: Encuadre, p: Pedido = {}, o: Salida = {}): Promise<Sitio[]> {
  const candidatos =
    trozosDe(caja).length === 1
      ? leerCandidatos(await pedir(aWikidata(consultaDeSitios(caja, p)), o), new Date().toISOString())
      : await candidatosPorTrozos(caja, p, o);
  // De qué desciende cada clase se pregunta aparte, de cien en cien: así no depende de cómo se llame ni en qué idioma.
  const clases = [...new Set(candidatos.flatMap((c) => c.clasesQ))].sort();
  const raicesDe = new Map<string, string[]>();
  for (let i = 0; i < clases.length; i += 100) {
    const consulta = consultaDeRaices(clases.slice(i, i + 100));
    leerRaices(await pedir(`${WIKIDATA}?format=json&query=${encodeURIComponent(consulta)}`, o), raicesDe);
  }
  return clasificar(candidatos, raicesDe, p.cuantos ?? 120);
}

/**
 * Los sitios de un destino, pidiendo cada vez menos fama hasta que salgan bastantes: de una capital sobran con el
 * primer escalón; de un pueblo o de un valle, hay que bajar. Se queda con el primer escalón que basta o, si ninguno
 * basta, con el que más trajo.
 */
export async function sitiosConEscalera(
  caja: Encuadre,
  escalera: number[],
  bastan: number,
  p: Pedido = {},
  o: Salida = {},
): Promise<Sitio[]> {
  let mejor: Sitio[] = [];
  for (const minimoDeEnlaces of escalera) {
    const sitios = await sitiosDe(caja, { ...p, minimoDeEnlaces }, o);
    if (sitios.length > mejor.length) mejor = sitios;
    if (sitios.length >= bastan) break;
  }
  return mejor;
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

/**
 * Las primeras frases del artículo de cada sitio que lo tenga, por su identificador: en inglés, de partida, o en el
 * idioma que se diga, de su artículo en ese idioma (el carrusel, 26-nov).
 */
export async function resumenesDe(sitios: Sitio[], o: Salida = {}, idioma = "en"): Promise<Map<string, string>> {
  const lengua = idiomaSeguro(idioma);
  const delArticulo = new RegExp(`^https://${lengua}\\.wikipedia\\.org/wiki/(.+)$`);
  const titulo = (s: Sitio): string | null => {
    const m = delArticulo.exec((lengua === "en" ? s.articuloEnIngles : s.articulo) ?? "");
    return m === null ? null : deDireccion(m[1]);
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
    const resumenes = leerResumenes(await pedir(`https://${lengua}.wikipedia.org/w/api.php?${q}`, o));
    for (const x of tanda) {
      const texto = resumenes.get(x.titulo);
      if (texto !== undefined) porId.set(x.id, texto);
    }
  }
  return porId;
}
