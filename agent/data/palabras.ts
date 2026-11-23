// Las palabras prohibidas en lo que lee el viajero: las promesas y las de dentro. El Dorado no promete («el más
// barato que encontramos», no «el más barato») y nunca explica cómo funciona por dentro. Están en los idiomas en que
// se escribe hoy; al añadir un idioma, se añaden las suyas.

export type Prohibida = { clase: "promesa" | "de_dentro"; patron: RegExp; porQue: string };

export const PROHIBIDAS: Prohibida[] = [
  { clase: "promesa", patron: /\bguarantee[ds]?\b/i, porQue: "promete" },
  { clase: "promesa", patron: /\bgarantiz\w*|\bgarant[ií]a\b/i, porQue: "promete" },
  { clase: "promesa", patron: /\bbest price\b|\bmejor precio\b/i, porQue: "promete el mejor precio" },
  { clase: "promesa", patron: /\bunbeatable\b|\binmejorable\b|\bimbatible\b/i, porQue: "promete" },
  { clase: "promesa", patron: /\byou(?:'ll| will) love\b|\bte (?:va a encantar|encantar[áa])\b/i, porQue: "promete" },
  { clase: "promesa", patron: /\bwithout a doubt\b|\bsin (?:ninguna )?duda\b/i, porQue: "da por seguro" },
  { clase: "promesa", patron: /\bperfect\b|\bperfect[oa]s?\b/i, porQue: "un adjetivo sin su hecho" },
  { clase: "de_dentro", patron: /\bLLM\b|\blanguage model\b|\bmodelo de lenguaje\b/i, porQue: "habla de dentro" },
  { clase: "de_dentro", patron: /\bprompt\b|\bJSON\b|\bpipeline\b|\bscript\b/i, porQue: "habla de dentro" },
  { clase: "de_dentro", patron: /\b(?:row|fila|lever)\s+[a-z]{1,2}\d+\b/i, porQue: "cita una fila de la tabla" },
  { clase: "de_dentro", patron: /\bthe (?:house|crosser|seat)\b|\bel que cruza\b/i, porQue: "nombra a un asiento" },
];

/** «El más barato» solo vale con su «que encontramos», en la misma frase. */
export const EL_MAS_BARATO = /\bthe cheapest\b|\b(?:el|la|lo) más barat[oa]\b/i;
export const QUE_ENCONTRAMOS = /\bwe found\b|\bque (?:hemos encontrado|encontramos)\b|\bde l[oa]s que\b|\bof the\b/i;

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
