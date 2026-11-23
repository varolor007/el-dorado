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

/** Cuántas veces se vuelve a pedir si la fuente dice que se espere, y cuánto se espera si no dice cuánto. */
export const REINTENTOS = { veces: 3, segundos: [2, 6, 15], tope: 30 };

/** Para las pruebas: cómo se espera. */
export const reloj = { dormir: (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms)) };

export async function pedirJson(fuente: string, url: string, p: Pedido = {}): Promise<unknown> {
  // Un pedido con cabeceras lleva la clave de su fuente: los tres enchufes la mandan así en cada pedido, y son los
  // únicos que mandan alguna (los datos abiertos salen por su propia puerta, en `tools/sitios.ts`, y sin clave). Si
  // la fuente redirigiera a otra máquina, la clave iría detrás: la red solo quita la cabecera Authorization, y estas
  // llevan su propio nombre. Por eso, con cabeceras, una redirección no se sigue: es un fallo de la fuente. Sin
  // cabeceras no viaja nada que guardar, y se pide como siempre, redirija o no.
  const conClave = Object.keys(p.cabeceras ?? {}).length > 0;
  for (let intento = 0; ; intento++) {
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: p.metodo ?? "GET",
        headers: { "Content-Type": "application/json", ...p.cabeceras },
        body: p.cuerpo === undefined ? undefined : JSON.stringify(p.cuerpo),
        signal: AbortSignal.timeout(p.esperaMs ?? 60_000),
        ...(conClave ? { redirect: "error" as const } : {}),
      });
    } catch (e) {
      throw new ErrorDeFuente(fuente, 0, `no responde (${(e as Error).message})`);
    }
    const texto = await respuesta.text();
    // Si la fuente dice que se le pide demasiado seguido, se espera lo que diga, o un poco más cada vez, y se repite.
    if ((respuesta.status === 429 || respuesta.status === 503) && intento < REINTENTOS.veces) {
      const dicho = Number(respuesta.headers.get("retry-after"));
      const segundos = Number.isFinite(dicho) && dicho > 0 ? dicho : REINTENTOS.segundos[intento];
      await reloj.dormir(Math.min(segundos, REINTENTOS.tope) * 1000);
      continue;
    }
    if (!respuesta.ok) throw new ErrorDeFuente(fuente, respuesta.status, texto.slice(0, 300));
    try {
      return JSON.parse(texto);
    } catch {
      throw new ErrorDeFuente(fuente, respuesta.status, "la respuesta no es JSON");
    }
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

/**
 * Un enlace que manda una fuente, para ponerlo delante del viajero: solo una dirección https entera, sin usuario ni
 * clave dentro. Cualquier otra cosa (otro protocolo, una dirección a medias, algo que no es un texto) no es un
 * enlace: null. Vuelve como la entiende quien la abre, no como venía escrita.
 */
export function enlace(v: unknown): string | null {
  if (typeof v !== "string") return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  return u.protocol === "https:" && u.username === "" && u.password === "" ? u.href : null;
}
