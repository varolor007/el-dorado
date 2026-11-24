// Lo que el código puede comprobar de un texto que va a leer el viajero: que sea un texto y no otra cosa (corto, en
// una línea, sin enlaces ni direcciones de correo), que no lleve palabras prohibidas (las promesas y las de dentro),
// que «el más barato» vaya con su «que encontramos», y qué números dice, para buscarlos después en lo que dio la
// casa. No mide si el texto es bueno: eso lo cubre quien lo lee.

import { EL_MAS_BARATO, LARGO_DE_UN_TEXTO, PROHIBIDAS, QUE_ENCONTRAMOS } from "../data/palabras.ts";
import { LETRAS_DE_UN_NOMBRE } from "../data/ruta.ts";

/** Lo que no es letra ni frase: saltos, tabuladores, marcas de control y las que cambian el sentido de la lectura. */
const DE_CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const ENLACE = /https?:|www\.|\b[\p{L}\p{N}-]+\.(?:com|net|org|info|biz|io|co|app|shop|online|site|xyz|example)\b/iu;
const CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/u;
/** Un teléfono o una cuenta: nueve cifras o más seguidas, juntas o con espacios, puntos, guiones o paréntesis. */
const NUMERO_LARGO = /\+?\d(?:[ ().-]{0,2}\d){8,}/u;

/**
 * Lo que no puede decir un texto para el viajero. Lista vacía si no hay pegas. Con `sinNumerosLargos` tampoco pasa
 * una tira de cifras que parezca un teléfono o una cuenta: se pide donde los números del texto salen de lo que dice
 * internet y no de las cuentas de la casa.
 */
export function pegasDelTexto(crudo: string, o: { sinNumerosLargos?: boolean } = {}): string[] {
  const pegas: string[] = [];
  // Los apóstrofos curvos, a rectos: «you’ll» es «you'll».
  const texto = crudo.replace(/[‘’ʼ]/g, "'");
  if (texto.length > LARGO_DE_UN_TEXTO) pegas.push(`tiene ${texto.length} letras, y caben ${LARGO_DE_UN_TEXTO}`);
  if (DE_CONTROL.test(texto)) pegas.push("lleva saltos de línea o marcas que no son texto");
  if (ENLACE.test(texto)) pegas.push("lleva un enlace: al viajero no se le manda a ninguna dirección");
  if (CORREO.test(texto)) pegas.push("lleva una dirección de correo");
  if (o.sinNumerosLargos === true && NUMERO_LARGO.test(cifras(texto).texto))
    pegas.push("lleva un número largo, como un teléfono o una cuenta");
  for (const p of PROHIBIDAS) {
    const hallado = p.patron.exec(texto);
    if (hallado !== null) pegas.push(`dice «${hallado[0]}»: ${p.porQue}`);
  }
  for (const frase of texto.split(/(?<=[.!?])\s+/)) {
    if (EL_MAS_BARATO.test(frase) && !QUE_ENCONTRAMOS.test(frase))
      pegas.push("dice «el más barato» sin su «que encontramos»: promete");
  }
  return pegas;
}

/** Dónde empiezan las cifras de cada escritura: su cero. Con él, cualquier cifra se lee como las de siempre. */
const CEROS = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20,
  0x1040, 0x1090, 0x17e0, 0x1810, 0xff10,
];

/**
 * El texto con sus cifras escritas como las de siempre, sea cual sea su escritura, y los espacios raros (el fino, el
 * que no parte) como espacios. `ilegibles` es verdadero si lleva cifras de una escritura que aquí no se sabe leer.
 */
function cifras(texto: string): { texto: string; ilegibles: boolean } {
  let ilegibles = false;
  const salida = texto.replace(/\p{Nd}/gu, (c) => {
    const punto = c.codePointAt(0)!;
    const cero = CEROS.find((z) => punto >= z && punto <= z + 9);
    if (cero === undefined) {
      ilegibles = true;
      return "?";
    }
    return String(punto - cero);
  });
  return { texto: salida.replace(/[\u00a0\u2009\u202f]/g, " "), ilegibles };
}

/** Un número tal como está escrito, y las maneras de leerlo: cada lectura, los números que serían. */
export type Leido = { crudo: string; lecturas: number[][] };

/**
 * Las maneras de leer un número escrito con puntos, comas o apóstrofos. «1.234» puede ser mil doscientos treinta y
 * cuatro o uno coma dos tres cuatro, según el idioma: se dan las dos, y quien compara acepta la que cuadre. También
 * puede ser una lista pegada («1,2,3») o una fecha («12.02.2027»): la tercera lectura son sus partes sueltas.
 */
function lecturasDe(crudo: string): number[][] {
  const partes = crudo.split(/[.,']/);
  if (partes.length === 1) return [[Number(crudo)]];
  const signos = [...crudo.replace(/\d/g, "")];
  const lecturas: number[][] = [];
  const deMiles = (grupos: string[]): boolean =>
    grupos[0].length <= 3 && !(grupos[0].length > 1 && grupos[0].startsWith("0")) && grupos[0] !== "0"
      ? grupos.slice(1).every((g) => g.length === 3)
      : false;
  // Todo son miles: cada grupo detrás del primero tiene tres cifras.
  if (deMiles(partes)) lecturas.push([Number(partes.join(""))]);
  // El último signo separa los decimales, y lo de antes, si lleva signos, son miles con otro signo.
  const ultimo = signos[signos.length - 1];
  const enteros = partes.slice(0, -1);
  const otroSigno = signos.slice(0, -1).every((x) => x !== ultimo);
  if (ultimo !== "'" && (enteros.length === 1 || (deMiles(enteros) && otroSigno)))
    lecturas.push([Number(`${enteros.join("")}.${partes[partes.length - 1]}`)]);
  // Suelto solo se lee lo que tiene pinta de lista o de fecha: tres partes o más. «8,5» no es un ocho y un cinco.
  if (partes.length >= 3) lecturas.push(partes.map(Number));
  return lecturas.filter((l) => l.every(Number.isFinite));
}

/**
 * Los números que dice un texto, uno por uno, con sus lecturas. Cuenta también el que va pegado a una letra («45min»,
 * «999EUR»): un precio no deja de serlo por no llevar espacio. Los identificadores que el texto puede citar se le
 * pasan en `ids` y no cuentan. Los miles separados por espacios («1 234,50») se leen juntos o sueltos.
 */
export function leerNumeros(texto: string, ids: string[] = []): { leidos: Leido[]; ilegibles: boolean } {
  const normal = cifras(texto.replace(/[‘’ʼ]/g, "'"));
  let limpio = normal.texto;
  for (const id of [...ids].sort((a, b) => b.length - a.length)) {
    if (id === "") continue;
    const escapado = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    limpio = limpio.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, "giu"), " ");
  }
  const sueltos = [...limpio.matchAll(/\d+(?:[.,']\d+)*/g)].map((m) => ({ crudo: m[0], en: m.index }));
  const leidos: Leido[] = [];
  for (let i = 0; i < sueltos.length; i++) {
    // Un grupo de miles con espacios: de una a tres cifras, y detrás, a un espacio, grupos de tres.
    const grupo = [sueltos[i]];
    const abre = /^[1-9]\d{0,2}$/.test(sueltos[i].crudo);
    while (abre && i + 1 < sueltos.length) {
      const anterior = grupo[grupo.length - 1];
      const siguiente = sueltos[i + 1];
      const pegados = limpio.slice(anterior.en + anterior.crudo.length, siguiente.en) === " ";
      const enMedio = /^\d{3}$/.test(siguiente.crudo);
      const alFinal = /^\d{3}[.,]\d+$/.test(siguiente.crudo);
      if (!pegados || !/^\d+$/.test(anterior.crudo) || !(enMedio || alFinal)) break;
      grupo.push(siguiente);
      i++;
      if (alFinal) break;
    }
    if (grupo.length === 1) {
      leidos.push({ crudo: grupo[0].crudo, lecturas: lecturasDe(grupo[0].crudo) });
      continue;
    }
    const junto = Number(
      grupo
        .map((g) => g.crudo)
        .join("")
        .replace(",", "."),
    );
    const cadaUno = grupo.flatMap((g) => lecturasDe(g.crudo)[0]);
    leidos.push({ crudo: grupo.map((g) => g.crudo).join(" "), lecturas: [[junto], cadaUno] });
  }
  return { leidos, ilegibles: normal.ilegibles };
}

/** Todos los números que puede querer decir un texto, con todas sus lecturas. Sirve para saber qué se dio. */
export function numerosDe(texto: string): number[] {
  return leerNumeros(texto).leidos.flatMap((l) => l.lecturas.flat());
}

/**
 * Los números de un texto que no están entre los que se dieron, tal como están escritos. Un número vale si alguna de
 * sus lecturas cuadra entera con lo dado. Si el texto lleva cifras que no se saben leer, también es una pega: lo que
 * no se puede comprobar no pasa.
 */
export function numerosDeMas(texto: string, dados: Set<number>, ids: string[] = []): string[] {
  const { leidos, ilegibles } = leerNumeros(texto, ids);
  const deMas = leidos.filter((l) => !l.lecturas.some((una) => una.every((n) => dados.has(n)))).map((l) => l.crudo);
  return ilegibles ? [...deMas, "cifras que no se saben leer"] : deMas;
}

/**
 * Un nombre es un nombre: corto, en una línea y sin direcciones. El de un sitio o el de una zona acaba delante del
 * viajero y sale a buscar a otras fuentes, con sus palabras: no puede llevar dentro otra cosa. Vale para el que
 * escribe un asiento (lo mira la puerta 3) y para el que viene de fuera, de los datos abiertos o del viajero.
 */
export const esNombre = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "" && v.length <= LETRAS_DE_UN_NOMBRE && !/[\n\r\t<>{}]|https?:|www\./i.test(v);

/** Un nombre que viene de fuera: sin los espacios de alrededor si es un nombre, y null si no lo es. */
export function nombreDeFuera(texto: string): string | null {
  const limpio = typeof texto === "string" ? texto.trim() : "";
  return esNombre(limpio) ? limpio : null;
}

/**
 * Las pegas de una lista de frases de un asiento (lo que no sabe, lo que supone), cada una con su sitio y dicha de
 * forma que el asiento sepa qué arreglar: que sea una lista, cuántas caben, y de cada frase, que lo sea, lo que mide y
 * que no lleve una dirección de la web (el sitio se dice con palabras) ni signos que no son de una frase.
 */
export function pegasDeFrases(lista: unknown, campo: string, largo: number, cuantas: number): [string, string][] {
  if (!Array.isArray(lista)) return [[campo, "no es una lista de frases"]];
  const pegas: [string, string][] = [];
  if (lista.length > cuantas) pegas.push([campo, `lleva ${lista.length} frases, y caben ${cuantas}`]);
  lista.forEach((frase, i) => {
    const donde = `${campo}[${i}]`;
    if (typeof frase !== "string" || frase.trim() === "") pegas.push([donde, "no es una frase"]);
    else if (frase.length > largo) pegas.push([donde, `mide ${frase.length} letras, y caben ${largo}`]);
    else if (/https?:|www\./i.test(frase))
      pegas.push([donde, "lleva una dirección de la web: en una frase, el sitio se dice con palabras"]);
    else if (/[\u0000-\u001f<>{}]/.test(frase))
      pegas.push([donde, "lleva un salto de línea o signos que no son de una frase"]);
  });
  return pegas;
}
