// Lo que el código puede comprobar de un texto que va a leer el viajero: que no lleve palabras prohibidas (las
// promesas y las de dentro), que «el más barato» vaya con su «que encontramos», y qué números dice, para buscarlos
// después en la tabla. No mide si el texto es bueno: eso lo cubre quien lo lee.

import { EL_MAS_BARATO, PROHIBIDAS, QUE_ENCONTRAMOS } from "../data/palabras.ts";

/** Lo que no puede decir un texto para el viajero. Lista vacía si no hay pegas. */
export function pegasDelTexto(texto: string): string[] {
  const pegas: string[] = [];
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

/**
 * Los números que dice un texto, como números. Entiende los miles con punto o con coma y los decimales con coma o
 * con punto, como se escriben en los idiomas de hoy. Un número pegado a letras (un identificador) no cuenta.
 */
export function numerosDe(texto: string): number[] {
  const numeros: number[] = [];
  for (const m of texto.matchAll(/(?<![\p{L}\d.,])\d+(?:[.,]\d+)*(?![\p{L}\d])/gu)) {
    const crudo = m[0];
    const partes = crudo.split(/[.,]/);
    let valor: number;
    if (partes.length === 1) valor = Number(crudo);
    else {
      const ultima = partes[partes.length - 1];
      // Tres cifras detrás del último signo: es un separador de miles. Si no, son decimales.
      if (ultima.length === 3) valor = Number(partes.join(""));
      else valor = Number(`${partes.slice(0, -1).join("")}.${ultima}`);
    }
    if (Number.isFinite(valor)) numeros.push(valor);
  }
  return numeros;
}
