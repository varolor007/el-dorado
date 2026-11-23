// La única salida a internet de las fuentes. Las claves no están en el código ni en el repositorio: se leen del
// entorno y, donde un proxy las pone solo, viaja un valor de relleno que el proxy cambia por la de verdad.

export type Pedido = {
  metodo?: "GET" | "POST";
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
  esperaMs?: number;
};

export class ErrorDeFuente extends Error {
  fuente: string;
  estado: number;

  constructor(fuente: string, estado: number, mensaje: string) {
    super(`${fuente}: ${mensaje}`);
    this.name = "ErrorDeFuente";
    this.fuente = fuente;
    this.estado = estado;
  }
}

/** La clave de una fuente, de su variable del entorno; sin ella, el relleno que cambia el proxy. */
export function clave(variable: string): string {
  return process.env[variable] || "proxy-injected";
}

export function ahora(): string {
  return new Date().toISOString();
}

export async function pedirJson(fuente: string, url: string, p: Pedido = {}): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: p.metodo ?? "GET",
      headers: { "Content-Type": "application/json", ...p.cabeceras },
      body: p.cuerpo === undefined ? undefined : JSON.stringify(p.cuerpo),
      signal: AbortSignal.timeout(p.esperaMs ?? 60_000),
    });
  } catch (e) {
    throw new ErrorDeFuente(fuente, 0, `no responde (${(e as Error).message})`);
  }
  const texto = await respuesta.text();
  if (!respuesta.ok) throw new ErrorDeFuente(fuente, respuesta.status, texto.slice(0, 300));
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorDeFuente(fuente, respuesta.status, "la respuesta no es JSON");
  }
}

// Ayudas para leer respuestas de fuera sin fiarse de su forma.
export type Objeto = Record<string, unknown>;

export function objeto(v: unknown): Objeto {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : {};
}

export function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export function numero(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
