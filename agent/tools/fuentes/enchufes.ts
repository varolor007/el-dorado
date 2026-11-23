// Qué fuentes están enchufadas. Cada una se apaga sin tocar el resto del agente: con ELDORADO_APAGAR, una lista
// separada por comas (por ejemplo, ELDORADO_APAGAR=parallel).

export const ENCHUFES = ["liteapi", "aviasales", "parallel", "sitios"] as const;
export type Enchufe = (typeof ENCHUFES)[number];

export function encendida(fuente: Enchufe, entorno: Record<string, string | undefined> = process.env): boolean {
  const apagadas = (entorno.ELDORADO_APAGAR ?? "").split(",").map((x) => x.trim().toLowerCase());
  return !apagadas.includes(fuente);
}
