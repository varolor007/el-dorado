// Las horas del reloj, como las escriben las fuentes. Cada una tiene su manera («03:00 PM», «15:00», «3 pm»), y de
// puertas adentro una hora se escribe de una sola: en veinticuatro horas, «15:00». Sin nada de Node.

const HORA = /^\s*(\d{1,2})(?:[:.h](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\s*$/i;

/**
 * Una hora del reloj escrita como sea, en veinticuatro horas: «03:00 PM» y «3 pm» son «15:00»; «12:30 AM», «00:30».
 * Lo que no se entiende como una hora, null: mejor no saber la hora de entrada que creerse otra.
 */
export function hora24(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const m = HORA.exec(texto);
  if (m === null) return null;
  const minutos = Number(m[2] ?? 0);
  const mitad = m[3]?.toLowerCase().replace(/[.\s]/g, "") ?? null;
  let hora = Number(m[1]);
  if (minutos > 59) return null;
  if (mitad !== null) {
    if (hora < 1 || hora > 12) return null;
    hora = (hora % 12) + (mitad === "pm" ? 12 : 0);
  } else if (hora > 23 || m[2] === undefined) return null;
  return `${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}
