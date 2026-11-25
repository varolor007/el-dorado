// Las horas del reloj, como las escriben las fuentes. Cada una tiene su manera («03:00 PM», «15:00», «3 pm»,
// «14:00:00», «15h», «from 14:00»), y de puertas adentro una hora se escribe de una sola: en veinticuatro horas,
// «15:00». Sin nada de Node.

/** Una hora sola: «15:00», «15:00:00», «15h», «15h30», «3 pm», «03:00 PM». */
const HORA = /^\s*(\d{1,2})(?:[:.h](\d{2})(?::(\d{2}))?|(h))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\s*$/i;

/** Lo que parece una hora dentro de una frase, para encontrarla: con sus minutos, con «h» o con su mitad del día. */
const MITAD = String.raw`\s*(?:a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z])`;
const EN_LA_FRASE = new RegExp(
  String.raw`(?<![\d:.])\d{1,2}(?:(?:[:.h]\d{2}(?::\d{2})?|h)(?:${MITAD})?|${MITAD})(?![\d:])`,
  "gi",
);

/** Lo más larga que puede ser la frase con una hora dentro: lo de una fuente, no un párrafo. */
const FRASE_CORTA = 40;

/** Una hora sola, en veinticuatro horas; null si no lo es. */
function sola(texto: string): string | null {
  const m = HORA.exec(texto);
  if (m === null) return null;
  const minutos = Number(m[2] ?? 0);
  const mitad = m[5]?.toLowerCase().replace(/[.\s]/g, "") ?? null;
  let hora = Number(m[1]);
  if (minutos > 59 || Number(m[3] ?? 0) > 59) return null;
  if (mitad !== null) {
    if (hora < 1 || hora > 12) return null;
    hora = (hora % 12) + (mitad === "pm" ? 12 : 0);
  } else if (hora > 23 || (m[2] === undefined && m[4] === undefined)) return null;
  return `${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/**
 * Una hora del reloj escrita como sea, en veinticuatro horas: «03:00 PM» y «3 pm» son «15:00»; «12:30 AM», «00:30»;
 * «14:00:00», «14:00»; «15h», «15:00». Dentro de una frase corta se entiende si la frase lleva una sola hora y
 * ningún otro número («from 14:00», «After 3 PM»); con dos horas («14:00 to 22:00»), o con otro número al lado, no
 * se adivina cuál es. Lo que no se entiende como una hora, null: mejor no saber la hora de entrada que creerse otra.
 */
export function hora24(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const suelta = sola(texto);
  if (suelta !== null || texto.length > FRASE_CORTA) return suelta;
  const halladas = texto.match(EN_LA_FRASE) ?? [];
  if (halladas.length !== 1) return null;
  // Fuera de la hora no puede quedar ningún número: «between 2 and 4 PM» no es a las cuatro.
  if (/\d/.test(texto.replace(halladas[0], ""))) return null;
  return sola(halladas[0]);
}
