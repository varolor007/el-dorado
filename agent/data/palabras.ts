// Las palabras prohibidas en lo que lee el viajero: las promesas y las de dentro. El Dorado no promete («el más
// barato que encontramos», no «el más barato») y nunca explica cómo funciona por dentro. Están en los idiomas en que
// se escribe hoy; al añadir un idioma, se añaden las suyas.

export type Prohibida = { clase: "promesa" | "de_dentro"; patron: RegExp; porQue: string };

/**
 * Una palabra o una frase, entera: ni empieza ni acaba dentro de otra. La «\b» de siempre no vale, porque no cuenta
 * como letra una vocal con tilde: «encantará» se le escapaba.
 */
export function entera(fuente: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${fuente})(?![\\p{L}\\p{N}])`, "iu");
}

export const PROHIBIDAS: Prohibida[] = [
  { clase: "promesa", patron: entera("guarantee[ds]?"), porQue: "promete" },
  { clase: "promesa", patron: entera("garantiz\\p{L}*|garant[ií]as?"), porQue: "promete" },
  { clase: "promesa", patron: entera("best price|mejor precio"), porQue: "promete el mejor precio" },
  { clase: "promesa", patron: entera("unbeatable|inmejorables?|imbatibles?"), porQue: "promete" },
  {
    clase: "promesa",
    patron: entera("you(?:'ll| will) love|(?:te|os|le|les) (?:va|van) a encantar|(?:te|os|le|les) encantar[áa]n?"),
    porQue: "promete",
  },
  { clase: "promesa", patron: entera("without a doubt|sin (?:ninguna )?duda"), porQue: "da por seguro" },
  { clase: "promesa", patron: entera("perfect|perfect[oa]s?"), porQue: "un adjetivo sin su hecho" },
  { clase: "de_dentro", patron: entera("LLM|language model|modelo de lenguaje"), porQue: "habla de dentro" },
  // Solo lo que no tiene otro sentido en un viaje: «prompt» y «script» son también palabras de todos los días.
  { clase: "de_dentro", patron: entera("JSON|system prompt|prompt engineering"), porQue: "habla de dentro" },
  {
    clase: "de_dentro",
    patron: entera("(?:row|fila|lever|palanca)\\s+[a-z]{1,2}\\d+"),
    porQue: "cita una fila de la tabla",
  },
  {
    clase: "de_dentro",
    // Los asientos, por su nombre. «The seat» o «the house» a secas son palabras de cualquier guía, y no se miran.
    patron: entera(
      "route planner|lodging viewer|sights picker|trip crosser|trip explainer|the crosser|el que cruza|" +
        "el que mira el alojamiento|el asiento que \\p{L}+",
    ),
    porQue: "nombra a un asiento",
  },
];

/**
 * «El más barato», en singular o en plural, solo vale si la misma frase dice entre qué se compara: lo que
 * encontramos, o las maneras que se le enseñan al viajero. «Of the» a secas no lo dice.
 */
export const EL_MAS_BARATO = entera("(?:the )?cheapest|más barat[oa]s?");
export const QUE_ENCONTRAMOS = entera(
  "we (?:have |could )?f(?:ou|i)nd|que (?:hemos encontrado|encontramos|hemos visto|vimos)|" +
    "of (?:the|these) (?:two|three|ways|options)|de (?:las|los|estas|estos) (?:dos|tres|maneras|opciones)",
);

/** Lo más largo que puede ser un texto para el viajero, en letras. Una o dos frases caben de sobra. */
export const LARGO_DE_UN_TEXTO = 500;

/** Los avisos que lleva siempre lo que se entrega, por idioma. Los pone el código, no un asiento. */
export const AVISOS: Record<string, { ia: string; precios: string }> = {
  en: {
    ia: "Made with AI: it may contain mistakes. Check what matters before you book.",
    precios: "Prices are indicative: each one shows the day it was seen and may have changed.",
  },
  es: {
    ia: "Hecho con IA: puede tener errores. Comprueba lo importante antes de reservar.",
    precios: "Los precios son orientativos: cada uno dice el día en que se vio y puede haber cambiado.",
  },
};

/** Los dos avisos de siempre, en el idioma del viajero; si en el suyo no están escritos, en inglés: nunca sin ellos. */
export function avisosDe(idioma: string): { ia: string; precios: string } {
  return Object.hasOwn(AVISOS, idioma) ? AVISOS[idioma] : AVISOS.en;
}
