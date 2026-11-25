// Lo que se puede buscar: la lista fija de los toques de «qué buscas», en cada idioma de la web y en el mismo orden.
// Es la única parte de lo que busca el viajero que llega a un asiento con internet (el que conoce el destino y el del
// calendario), siempre en inglés: lo que escribió con sus palabras, o lo que el que escucha resumió de ellas, no sale
// nunca a internet. La web pinta los mismos toques (`buscasOpciones` en `web/src/lib/textos.ts`); una prueba mira que
// son estos.

export const TOQUES_DE_BUSCAR = {
  en: [
    "The essentials",
    "Eat well",
    "Culture",
    "Nature",
    "Beach",
    "Rest",
    "Nightlife",
    "Plans with children",
    "A road trip",
  ],
  es: [
    "Lo imprescindible",
    "Comer bien",
    "Cultura",
    "Naturaleza",
    "Playa",
    "Descansar",
    "Salir de noche",
    "Planes con niños",
    "Ruta por carretera",
  ],
} as const satisfies Record<string, readonly string[]>;

const comoToque = (x: string): string => x.normalize("NFC").trim().toLocaleLowerCase();

/**
 * Lo que busca el viajero, como lo puede leer un asiento con internet: solo lo que es un toque de la lista fija, en
 * cualquier idioma, dicho en inglés, una vez y en el orden de la lista. Lo demás (sus palabras) no pasa.
 */
export function loQueSeBusca(lookingFor: readonly string[]): string[] {
  const dichos = new Set(lookingFor.map(comoToque));
  return TOQUES_DE_BUSCAR.en.filter((_, i) =>
    Object.values(TOQUES_DE_BUSCAR).some((lista) => dichos.has(comoToque(lista[i]))),
  );
}
