// El lado de la web de la puerta de la casa. El navegador nunca habla con la casa: habla con la web, y la web le
// pasa a la casa solo lo que la puerta admite, con su llave y con la sesión del viajero.
//
// La sesión vive en una cookie que el navegador no deja leer a ningún código de la página. Por eso la llave de la
// sesión que devuelve la casa al registrarse o al entrar no baja nunca al navegador: la web la guarda en la cookie
// y la quita de lo que contesta.

import { createHash } from "node:crypto";

export const COOKIE = "eldorado_session";
export const CABECERA_DE_LA_SESION = "x-eldorado-session";
/** Donde se le dice a la casa quién pide, resumido: para sus frenos, nunca la dirección tal cual. */
export const CABECERA_DEL_CLIENTE = "x-eldorado-client";
/** Lo que lleva freno por cliente en la casa: solo esas peticiones le dicen quién pide. */
const CON_CLIENTE = new Set(["vistazo", "cuentas", "sesiones", "cuenta/clave"]);
const DIAS = 30;

type Entorno = Record<string, string | undefined>;

export type DeLaWeb = {
  metodo: string;
  /** Lo que va detrás de `/api/house/`, ya partido. */
  partes: string[];
  consulta: string;
  cabeceras: {
    origen: string | null;
    sitio: string | null;
    tipo: string | null;
    cookie: string | null;
    /** La dirección de quien pide, como la dice el servidor de la web (`x-forwarded-for`), para el freno. */
    direccion?: string | null;
  };
  cuerpo: string | null;
};

export type ALaWeb = {
  estado: number;
  /** El cuerpo, ya escrito; o el chorro de sucesos de la casa, tal cual llega. */
  cuerpo: string | ReadableStream<Uint8Array> | null;
  tipo: string;
  /** La cookie que hay que poner o quitar, si toca. */
  cookie: string | null;
};

const ID = "[a-z0-9][a-z0-9-]{0,63}";
/** Lo único que la web le pide a la casa: cada ruta, con sus métodos. */
const ADMITIDO: [RegExp, string[]][] = [
  [/^cuentas$/, ["POST"]],
  [/^sesiones$/, ["POST", "DELETE"]],
  [/^cuenta$/, ["GET"]],
  [/^cuenta\/clave$/, ["PUT", "DELETE"]],
  [/^cuenta\/gasto$/, ["GET"]],
  [/^viajes$/, ["GET", "POST"]],
  [/^vistazo$/, ["POST"]],
  [new RegExp(`^viajes/${ID}$`), ["GET"]],
  [new RegExp(`^viajes/${ID}/entendido$`), ["PUT"]],
  [new RegExp(`^viajes/${ID}/empezar$`), ["POST"]],
  [new RegExp(`^viajes/${ID}/confirmar$`), ["POST"]],
  [new RegExp(`^viajes/${ID}/reintentar$`), ["POST"]],
  [new RegExp(`^viajes/${ID}/eventos$`), ["GET"]],
  [new RegExp(`^viajes/${ID}/acta$`), ["GET"]],
  [new RegExp(`^viajes/${ID}/version(/[1-9][0-9]{0,5})?$`), ["GET"]],
  [new RegExp(`^viajes/${ID}/cerrar$`), ["POST"]],
  [new RegExp(`^viajes/${ID}/cierre$`), ["GET"]],
];

/** Si la web le pasa esa petición a la casa: "ok", o por qué no. */
export function admitida(metodo: string, partes: string[]): "ok" | "not_found" | "method" {
  const ruta = partes.join("/");
  const suya = ADMITIDO.find(([forma]) => forma.test(ruta));
  if (suya === undefined || partes.some((p) => p === "" || p === "." || p === "..")) return "not_found";
  return suya[1].includes(metodo) ? "ok" : "method";
}

/**
 * Quién pide, resumido: la primera dirección de `x-forwarded-for` (la que pone el servidor de la web delante),
 * mezclada con la llave para que no se pueda deshacer. Sin dirección, nadie: solo cuenta el tope de toda la casa.
 */
export function clienteDe(direccion: string | null | undefined, llave: string): string | null {
  const primera = (direccion ?? "").split(",")[0].trim();
  if (primera === "" || primera.length > 64) return null;
  return createHash("sha256").update(`${llave}|${primera}`).digest("base64url").slice(0, 32);
}

/** Una petición que cambia algo tiene que venir de esta misma web: su origen es el sitio que la recibe. */
export function deEstaWeb(origen: string | null, sitio: string | null): boolean {
  if (origen === null || sitio === null) return false;
  try {
    return new URL(origen).host === sitio;
  } catch {
    return false;
  }
}

/** La sesión que trae la cookie, si tiene la forma de una. */
export function sesionDeLaCookie(cookie: string | null): string | null {
  for (const trozo of (cookie ?? "").split(";")) {
    const [nombre, ...valor] = trozo.trim().split("=");
    if (nombre === COOKIE && /^[A-Za-z0-9_-]{43}$/.test(valor.join("="))) return valor.join("=");
  }
  return null;
}

/** La cookie de la sesión: el navegador la manda sola y ningún código de la página puede leerla. */
export function cookieDeSesion(sesion: string | null, segura: boolean): string {
  const base = `${COOKIE}=${sesion ?? ""}; Path=/; HttpOnly; SameSite=Lax${segura ? "; Secure" : ""}`;
  return sesion === null ? `${base}; Max-Age=0` : `${base}; Max-Age=${DIAS * 86_400}`;
}

const JSON_ = "application/json; charset=utf-8";
const dice = (estado: number, error: string, cookie: string | null = null): ALaWeb => ({
  estado,
  cuerpo: JSON.stringify({ error }),
  tipo: JSON_,
  cookie,
});

/** Dónde está la casa y con qué llave se entra, del entorno de la web. Null si esta web no tiene casa. */
export function casaDe(entorno: Entorno): { url: string; llave: string } | null {
  const url = (entorno.ELDORADO_CASA_URL ?? "").replace(/\/+$/, "");
  const llave = entorno.ELDORADO_LLAVE ?? "";
  return /^https?:\/\/[^\s/]+/.test(url) && llave.length >= 24 ? { url, llave } : null;
}

/** Lo más que se espera a la casa en lo que no es en vivo: si no contesta, es que no está. */
export const ESPERA_A_LA_CASA_MS = 120_000;

/** Si la casa está detrás de un túnel de ngrok: entonces se le dice que no ponga su aviso para navegadores. */
export function porNgrok(url: string): boolean {
  try {
    return /(^|\.)ngrok(-free)?\.(app|dev|io)$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Le pasa a la casa una petición del navegador, si la puerta la admite, y prepara lo que se le contesta. */
export async function aLaCasa(p: DeLaWeb, entorno: Entorno, pedir: typeof fetch = fetch): Promise<ALaWeb> {
  const casa = casaDe(entorno);
  if (casa === null) return dice(503, "no_house");
  const admite = admitida(p.metodo, p.partes);
  if (admite !== "ok") return dice(admite === "method" ? 405 : 404, admite);
  const cambia = p.metodo !== "GET";
  if (cambia && !deEstaWeb(p.cabeceras.origen, p.cabeceras.sitio)) return dice(403, "forbidden");
  if (cambia && p.cuerpo !== null && p.cuerpo !== "" && !(p.cabeceras.tipo ?? "").startsWith("application/json"))
    return dice(415, "bad_type");
  const segura = (p.cabeceras.origen ?? "").startsWith("https://") || entorno.NODE_ENV === "production";
  const sesion = sesionDeLaCookie(p.cabeceras.cookie);
  const ruta = p.partes.join("/");
  const enVivo = p.metodo === "GET" && ruta.endsWith("/eventos");
  const cliente = CON_CLIENTE.has(ruta) ? clienteDe(p.cabeceras.direccion, casa.llave) : null;

  let r: Response;
  try {
    r = await pedir(`${casa.url}/${ruta}${p.consulta}`, {
      method: p.metodo,
      headers: {
        authorization: `Bearer ${casa.llave}`,
        ...(sesion === null ? {} : { [CABECERA_DE_LA_SESION]: sesion }),
        ...(cambia && p.cuerpo ? { "content-type": "application/json" } : {}),
        ...(cliente === null ? {} : { [CABECERA_DEL_CLIENTE]: cliente }),
        ...(porNgrok(casa.url) ? { "ngrok-skip-browser-warning": "1" } : {}),
      },
      body: cambia && p.cuerpo ? p.cuerpo : undefined,
      ...(enVivo ? {} : { signal: AbortSignal.timeout(ESPERA_A_LA_CASA_MS) }),
    });
  } catch {
    return dice(502, "house_down");
  }

  if (enVivo && r.ok && r.body !== null)
    return { estado: 200, cuerpo: r.body, tipo: "text/event-stream; charset=utf-8", cookie: null };
  let dicho: Record<string, unknown>;
  try {
    dicho = (await r.json()) as Record<string, unknown>;
  } catch {
    return dice(502, "house_down");
  }
  // Que a la web no la deje entrar la casa es cosa nuestra, no del viajero: no se le dice como si fuera suya.
  if (r.status === 401 && dicho.error === "unauthorized") return dice(502, "house_down");
  let cookie: string | null = null;
  if ((ruta === "cuentas" || ruta === "sesiones") && p.metodo === "POST" && r.ok && typeof dicho.session === "string") {
    cookie = cookieDeSesion(dicho.session, segura);
    delete dicho.session;
  }
  // Salir, o una sesión que ya no vale, quita la cookie.
  if (
    (ruta === "sesiones" && p.metodo === "DELETE") ||
    (r.status === 401 && dicho.error === "no_session" && sesion !== null)
  )
    cookie = cookieDeSesion(null, segura);
  return { estado: r.status, cuerpo: JSON.stringify(dicho), tipo: JSON_, cookie };
}
