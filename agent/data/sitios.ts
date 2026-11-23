// Los sitios que ver, en datos: qué clases de cosas son un sitio al que ir, y cuáles tienen sitio en el mapa y fama
// pero no se van a ver. Cada una, por el identificador de su clase en Wikidata, comprobado
// en la propia fuente: un sitio es de una clase si lo que la fuente dice que es desciende de ella. No se mira cómo se
// llama nada ni en qué idioma, y ninguna lleva el nombre de un país: lo mismo vale para una capital, un pueblo o un
// valle.

export type Raiz = { clase: string; raiz: string; es: string };

/** La clase de lo que solo se sabe que es patrimonio o una atracción, sin decir de qué clase. */
export const GENERICA = "landmark";

const de = (clase: string, ...raices: [string, string][]): Raiz[] => raices.map(([raiz, es]) => ({ clase, raiz, es }));

/** Lo que es un sitio que ver. El orden es la prioridad: de un sitio que es varias cosas, gana la primera. */
export const RAICES: Raiz[] = [
  ...de("museum", ["Q33506", "museum"], ["Q2281788", "public aquarium"]),
  ...de("castle", ["Q23413", "castle"], ["Q57821", "fortification"]),
  ...de("palace", ["Q16560", "palace"]),
  ...de(
    "worship",
    ["Q16970", "church building"],
    ["Q44613", "monastery"],
    ["Q32815", "mosque"],
    ["Q34627", "synagogue"],
    ["Q44539", "temple"],
    ["Q697295", "shrine"],
    ["Q24398318", "religious building"],
  ),
  ...de("viewpoint", ["Q6017969", "scenic viewpoint"], ["Q1440300", "observation tower"]),
  ...de("market", ["Q330284", "marketplace"]),
  ...de("square", ["Q174782", "square"]),
  ...de("bridge", ["Q12280", "bridge"]),
  ...de("theatre", ["Q24354", "theatre building"]),
  ...de("beach", ["Q40080", "beach"]),
  ...de(
    "nature",
    ["Q34038", "waterfall"],
    ["Q23397", "lake"],
    ["Q35509", "cave"],
    ["Q8072", "volcano"],
    ["Q35666", "glacier"],
    ["Q150784", "canyon"],
    ["Q177380", "hot spring"],
    ["Q83471", "geyser"],
    ["Q8502", "mountain"],
    ["Q23442", "island"],
    ["Q185113", "cape"],
    ["Q39816", "valley"],
    ["Q4421", "forest"],
    ["Q8514", "desert"],
    ["Q39594", "bay"],
  ),
  ...de(
    "park",
    ["Q22698", "park"],
    ["Q1107656", "garden"],
    ["Q167346", "botanical garden"],
    ["Q43501", "zoo"],
    ["Q194195", "amusement park"],
  ),
  ...de("neighbourhood", ["Q123705", "neighborhood"], ["Q15243209", "historic district"], ["Q676050", "old town"]),
  ...de("street", ["Q79007", "street"]),
  ...de(
    "monument",
    ["Q4989906", "monument"],
    ["Q5003624", "memorial"],
    ["Q179700", "statue"],
    ["Q483453", "fountain"],
    ["Q39715", "lighthouse"],
    ["Q12518", "tower"],
    ["Q39614", "cemetery"],
    ["Q109607", "ruins"],
    ["Q839954", "archaeological site"],
  ),
  ...de("nature", ["Q46169", "national park"], ["Q179049", "nature reserve"], ["Q473972", "protected area"]),
  ...de(
    "landmark",
    ["Q9259", "World Heritage Site"],
    ["Q210272", "cultural heritage"],
    ["Q570116", "tourist attraction"],
  ),
];

/** Lo que la propia fuente llama una atracción. Salva a lo que, por su clase, no se iría a ver. */
export const ATRACCION = "Q570116";

/**
 * Lo que tiene sitio en el mapa y fama, y no se va a ver. Solo quita a lo que, además, no es de ninguna clase concreta
 * de sitio: el árbol de clases de la fuente tiene ruido, y un castillo acaba descendiendo de cosas que no son.
 */
export const NO_SE_VA_A_VER: Omit<Raiz, "clase">[] = [
  { raiz: "Q483110", es: "stadium" },
  { raiz: "Q1076486", es: "sports venue" },
  { raiz: "Q641226", es: "arena" },
  { raiz: "Q1777138", es: "race track" },
  { raiz: "Q55488", es: "railway station" },
  { raiz: "Q928830", es: "metro station" },
  { raiz: "Q12819564", es: "station" },
  { raiz: "Q1248784", es: "airport" },
  { raiz: "Q3918", es: "university" },
  { raiz: "Q2385804", es: "educational institution" },
  { raiz: "Q11691", es: "stock exchange" },
];

/**
 * Lo que es una división del mapa (una ciudad, un distrito, un municipio) y no un sitio al que ir. Solo quita a lo
 * que, además, no es de una clase concreta de sitio: un castillo o una isla lo siguen siendo aunque el árbol de la
 * fuente los cuelgue, más arriba, de una división.
 */
export const DIVISIONES: Omit<Raiz, "clase">[] = [{ raiz: "Q56061", es: "administrative territorial entity" }];

/** Las clases que no dicen de qué clase concreta es un sitio: ceden ante lo que no se va a ver y ante una división. */
export const BLANDAS = [GENERICA, "neighbourhood"];
