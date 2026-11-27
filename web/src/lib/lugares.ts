// Qué de lo que devuelve el buscador de lugares (Photon, sobre OpenStreetMap) se puede elegir como destino. Vale
// cualquier sitio al que se viaja: un país, una región, una ciudad, un pueblo o un barrio, y también lo que no tiene
// calles: una isla, un parque nacional, un valle, una costa, una sierra o un lago. No vale lo que hay dentro de un
// sitio: una calle, un portal o un negocio. Lo que llega de fuera se comprueba aquí antes de dárselo a la web.

import type { CLASES_DE_DESTINO } from "../../../agent/scripts/formas.ts";

/** La clase de un destino, con las palabras de la casa: una ciudad, una región o un país. */
export type ClaseDeLugar = (typeof CLASES_DE_DESTINO)[number];

/** Un sitio que se puede elegir. La caja, si la hay, va como la da Photon: oeste, norte, este y sur. */
export type Lugar = {
  nombre: string;
  donde: string;
  /** El país del sitio, por sus dos letras, si el buscador lo dice. */
  pais: string | null;
  clase: ClaseDeLugar;
  lat: number;
  lon: number;
  caja: number[] | null;
};

// Photon dice qué es cada sitio de dos maneras. Su capa (`type`) ordena lo que tiene calles o frontera, del país al
// portal, y deja lo demás, la naturaleza entre ello, en «other». Y su etiqueta de OpenStreetMap (`osm_key` y
// `osm_value`) dice qué es de verdad: es lo que distingue un valle de una farmacia.

/** Las capas de Photon que son un destino. Una calle (`street`) y un portal o un negocio (`house`) no lo son. */
const POR_CAPA = new Map<string, ClaseDeLugar>([
  ["country", "country"],
  ["state", "region"],
  ["county", "region"],
  ["island", "region"],
  ["city", "city"],
  ["town", "city"],
  ["village", "city"],
  ["district", "city"],
  ["locality", "city"],
]);

/**
 * Las etiquetas de OpenStreetMap que son un destino, sea cual sea su capa. La naturaleza y las comarcas son una región
 * para la casa: un trozo de mapa con varios sitios que ver, que no es una ciudad ni un país. Las de un sitio con
 * calles están para un Photon que no diga su capa.
 */
const ETIQUETAS: Record<ClaseDeLugar, string[]> = {
  country: ["place=country"],
  city: [
    "place=city",
    "place=town",
    "place=village",
    "place=hamlet",
    "place=municipality",
    "place=borough",
    "place=suburb",
    "place=quarter",
    "place=neighbourhood",
    "place=locality",
  ],
  region: [
    // Las comarcas y las islas.
    "place=state",
    "place=province",
    "place=county",
    "place=district",
    "place=region",
    "place=island",
    "place=islet",
    "place=archipelago",
    // Los parques y las reservas.
    "boundary=national_park",
    "boundary=protected_area",
    "leisure=nature_reserve",
    // La montaña.
    "natural=mountain_range",
    "natural=peak",
    "natural=volcano",
    "natural=ridge",
    "natural=valley",
    "natural=gorge",
    "natural=glacier",
    "natural=plateau",
    "natural=cliff",
    "natural=cave_entrance",
    // La costa y el agua.
    "natural=coastline",
    "natural=beach",
    "natural=bay",
    "natural=cape",
    "natural=peninsula",
    "natural=isthmus",
    "natural=strait",
    "natural=reef",
    "natural=water",
    "natural=wetland",
    "natural=hot_spring",
    "natural=geyser",
    "waterway=waterfall",
    // El bosque y el desierto.
    "natural=wood",
    "landuse=forest",
    "natural=desert",
    "natural=dune",
  ],
};

const POR_ETIQUETA = new Map<string, ClaseDeLugar>(
  (Object.keys(ETIQUETAS) as ClaseDeLugar[]).flatMap((clase) =>
    ETIQUETAS[clase].map((etiqueta): [string, ClaseDeLugar] => [etiqueta, clase]),
  ),
);

/** De qué clase es lo que devuelve el buscador, o nada si no es un sitio que se pueda elegir como destino. */
export function claseDeLugar(propiedades: Record<string, unknown>): ClaseDeLugar | null {
  const texto = (x: unknown): string => (typeof x === "string" ? x : "");
  const etiqueta = `${texto(propiedades.osm_key)}=${texto(propiedades.osm_value)}`;
  // Primero la etiqueta, que es más fina que la capa: la naturaleza sale de aquí, la ponga Photon en la capa que sea.
  return POR_ETIQUETA.get(etiqueta) ?? POR_CAPA.get(texto(propiedades.type)) ?? null;
}

const numero = (x: unknown, tope: number): x is number =>
  typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= tope;

/** La caja de un sitio, como la da Photon (oeste, norte, este y sur). Solo pasa si son cuatro números del mapa. */
export function cajaDe(extension: unknown): number[] | null {
  if (!Array.isArray(extension) || extension.length !== 4) return null;
  const [oeste, norte, este, sur] = extension as unknown[];
  if (!numero(oeste, 180) || !numero(este, 180) || !numero(norte, 90) || !numero(sur, 90) || sur > norte) return null;
  return [oeste, norte, este, sur];
}

/** Un resultado del buscador, hecho un sitio que se puede elegir: con nombre, en el mapa y de una clase que valga. */
export function lugarDe(resultado: unknown): Lugar | null {
  const r = (resultado ?? {}) as { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> };
  const p = r.properties ?? {};
  const coordenadas = r.geometry?.coordinates;
  const [lon, lat] = Array.isArray(coordenadas) ? (coordenadas as unknown[]) : [];
  const clase = claseDeLugar(p);
  if (typeof p.name !== "string" || p.name.trim() === "" || clase === null) return null;
  if (!numero(lat, 90) || !numero(lon, 180)) return null;
  const donde = [p.state, p.country].filter((x) => typeof x === "string" && x !== p.name).join(", ");
  const pais = typeof p.countrycode === "string" && /^[A-Za-z]{2}$/.test(p.countrycode) ? p.countrycode : null;
  return { nombre: p.name, donde, pais: pais?.toUpperCase() ?? null, clase, lat, lon, caja: cajaDe(p.extent) };
}

/**
 * De dónde sale alguien: el nombre de un sitio, su país, si se sabe, y su punto, con el que la casa busca sus
 * aeropuertos. El punto lo redondea la casa antes de guardarlo.
 */
export type Origen = { nombre: string; pais: string | null; centro?: { lat: number; lon: number } | null };

/**
 * De dónde sale alguien, por lo que el buscador dice que hay en un punto: su ciudad o, si no la dice, lo más parecido
 * (su comarca, su región, o el nombre de lo que haya), y su país. Nada si no hay ni un nombre.
 */
export function origenDe(resultado: unknown): Origen | null {
  const p = ((resultado ?? {}) as { properties?: Record<string, unknown> }).properties ?? {};
  const nombre = [p.city, p.county, p.state, p.name].find((x) => typeof x === "string" && x.trim() !== "");
  if (typeof nombre !== "string") return null;
  const pais = typeof p.countrycode === "string" && /^[A-Za-z]{2}$/.test(p.countrycode) ? p.countrycode : null;
  // El punto de lo que se encontró, con una décima de grado: basta para los aeropuertos y no dice dónde está nadie.
  const c = ((resultado ?? {}) as { geometry?: { coordinates?: unknown } }).geometry?.coordinates;
  const [lon, lat] = Array.isArray(c) ? c : [];
  const enElMapa = typeof lat === "number" && typeof lon === "number" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const centro = enElMapa ? { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 } : null;
  return { nombre: nombre.trim().slice(0, 80), pais: pais?.toUpperCase() ?? null, centro };
}

// Los países, por su nombre en el idioma de quien busca. El buscador (Photon) solo entiende algunos idiomas, y en los
// demás busca en los nombres de cada sitio: «Tailandia» daba un pueblo de Colombia, y no el país, que en sus datos se
// llama en tailandés (el PM, 26-nov). Los nombres salen del navegador o del servidor (`Intl.DisplayNames`), para todos
// los países a la vez, sin una lista nuestra.

/** Una palabra sin mayúsculas ni tildes, para comparar lo que se escribe con un nombre. */
export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Los códigos de dos letras que pueden ser un país: los que el idioma sabe nombrar. */
function codigosDePais(nombres: Intl.DisplayNames): string[] {
  const codigos: string[] = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const codigo = String.fromCharCode(a, b);
      try {
        const nombre = nombres.of(codigo);
        if (nombre !== undefined && nombre !== codigo) codigos.push(codigo);
      } catch {
        // Un código que el idioma no conoce no es un país.
      }
    }
  return codigos;
}

/**
 * Los países cuyo nombre, en ese idioma, empieza por lo que se ha escrito (tres letras como poco), con su nombre ahí
 * y en inglés, que es como se le pide al buscador. Como mucho, los dos primeros por orden alfabético.
 */
export function paisesQueEmpiezan(
  escrito: string,
  idioma: string,
): { codigo: string; nombre: string; ingles: string }[] {
  const q = sinTildes(escrito);
  if (q.length < 3) return [];
  let suyo: Intl.DisplayNames;
  let ingles: Intl.DisplayNames;
  try {
    suyo = new Intl.DisplayNames([idioma], { type: "region" });
    ingles = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return [];
  }
  return (
    codigosDePais(suyo)
      .map((codigo) => ({ codigo, nombre: suyo.of(codigo) as string, ingles: ingles.of(codigo) as string }))
      // Por su nombre en tu idioma o en inglés: hay quien escribe «Thailand» en la web en español.
      .filter((p) => sinTildes(p.nombre).startsWith(q) || sinTildes(p.ingles).startsWith(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, idioma))
      .slice(0, 2)
  );
}

/** Lo grande antes que lo pequeño: un país, una región, una ciudad, un pueblo, una aldea. Lo demás, detrás. */
const RANGO = ["country", "state", "region", "island", "archipelago", "city", "town", "village", "hamlet"];

/** El rango de un resultado del buscador, por su etiqueta: cuanto más bajo, antes sale. */
export function rangoDe(resultado: unknown): number {
  const p = ((resultado ?? {}) as { properties?: Record<string, unknown> }).properties ?? {};
  const valor = typeof p.osm_value === "string" ? p.osm_value : "";
  const i = RANGO.indexOf(valor);
  return i === -1 ? RANGO.length : i;
}

/**
 * El nombre de un país en el idioma de quien busca, por su código; si el idioma no lo sabe, el que dio el buscador. Así
 * un país no sale escrito en su alfabeto («ประเทศไทย», «日本») en una web en español o en inglés.
 */
export function nombreDelPais(codigo: string | null, idioma: string, delBuscador: string): string {
  if (codigo === null) return delBuscador;
  try {
    const nombre = new Intl.DisplayNames([idioma], { type: "region" }).of(codigo);
    return nombre === undefined || nombre === codigo ? delBuscador : nombre;
  } catch {
    return delBuscador;
  }
}
