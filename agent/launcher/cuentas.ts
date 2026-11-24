// Las cuentas: quién eres, tu sesión y tu clave de IA. Las guarda la casa, en la mesa, sin servicios de fuera.
//
//   cuentas/<id>.json            la cuenta: su correo, su contraseña (nunca tal cual) y su clave de IA, cifrada
//   cuentas/por-correo/<huella>  de un correo a su cuenta; el nombre del archivo es una huella, no el correo
//   sesiones/<huella>.json       cada sesión abierta; el nombre es la huella de su llave, que no se guarda
//   sesiones/de/<id>/<huella>    las sesiones de cada cuenta, para llevar su tope
//
// La contraseña se guarda pasada por scrypt, con su sal. La llave de una sesión es larga y al azar, y de ella solo se
// guarda la huella: quien lea la mesa no puede entrar con lo que encuentre. La clave de IA se guarda cifrada con un
// secreto que vive en el entorno de la casa, no en la mesa.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptDeNode,
  timingSafeEqual,
} from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FRENOS_DE_LA_PUERTA } from "../data/frenos.ts";
import { carpetaDeLaMesa, dentroDelRepositorio, guardarJson } from "./mesa.ts";

/** Lo que mide una contraseña, lo que dura una sesión y lo que mide una clave de IA. */
export const CONTRASENA = { minimo: 10, maximo: 200 };
export const DIAS_DE_UNA_SESION = 30;
export const CLAVE_DE_IA = { minimo: 20, maximo: 400 };

/** Con qué se pasa la contraseña: lo bastante caro para que probar muchas no salga a cuenta. */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, largo: 64, maxmem: 64 * 1024 * 1024 };

type Guardada = { sal: string; huella: string; N: number; r: number; p: number };
type ClaveCifrada = { iv: string; marca: string; cifrada: string; pista: string; cuando: string };

export type Cuenta = {
  formato: "cuenta/1";
  id: string;
  correo: string;
  creada: string;
  contrasena: Guardada;
  clave: ClaveCifrada | null;
};

/** Lo que se dice de una cuenta hacia fuera: nunca su contraseña ni su clave, solo si tiene una y cómo acaba. */
export type CuentaPublica = { id: string; email: string; key: { hint: string; since: string } | null };

/** Por qué no se pudo: una clave que la web sabe decir, no una frase. */
export class FalloDeCuenta extends Error {}

const ID = /^u-[0-9a-f]{32}$/;
const huellaDe = (texto: string): string => createHash("sha256").update(texto).digest("hex");

function carpetas(mesa: string): { cuentas: string; correos: string; sesiones: string; deCadaCuenta: string } {
  if (dentroDelRepositorio(mesa)) throw new Error("la mesa no puede estar dentro del repositorio");
  const raiz = resolve(mesa);
  return {
    cuentas: join(raiz, "cuentas"),
    correos: join(raiz, "cuentas", "por-correo"),
    sesiones: join(raiz, "sesiones"),
    deCadaCuenta: join(raiz, "sesiones", "de"),
  };
}

/** Cuántas cuentas hay en la casa. */
export function cuantasCuentas(mesa: string = carpetaDeLaMesa()): number {
  const donde = carpetas(mesa).correos;
  return existsSync(donde) ? readdirSync(donde).length : 0;
}

/** El correo, como se compara: sin espacios alrededor y en minúsculas. Null si no tiene forma de correo. */
export function correoQueVale(correo: unknown): string | null {
  if (typeof correo !== "string") return null;
  const limpio = correo.normalize("NFKC").trim().toLowerCase();
  if (limpio.length > 254 || !/^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(limpio)) return null;
  // Nada que no se vea: un correo con letras invisibles o de control sería otra cuenta con la misma cara.
  return /[\p{Cc}\p{Cf}]/u.test(limpio) ? null : limpio;
}

function contrasenaQueVale(contrasena: unknown, correo: string): contrasena is string {
  if (typeof contrasena !== "string") return false;
  const largo = [...contrasena].length;
  return largo >= CONTRASENA.minimo && largo <= CONTRASENA.maximo && contrasena.toLowerCase() !== correo;
}

function pasar(contrasena: string, sal: Buffer, c: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resuelve, falla) =>
    scryptDeNode(contrasena.normalize("NFKC"), sal, SCRYPT.largo, { ...c, maxmem: SCRYPT.maxmem }, (e, clave) =>
      e ? falla(e) : resuelve(clave),
    ),
  );
}

function leerCuenta(mesa: string, id: string): Cuenta | null {
  if (!ID.test(id)) return null;
  try {
    const c = JSON.parse(readFileSync(join(carpetas(mesa).cuentas, `${id}.json`), "utf8")) as Cuenta;
    return c.formato === "cuenta/1" && c.id === id ? c : null;
  } catch {
    return null;
  }
}

function porCorreo(mesa: string, correo: string): Cuenta | null {
  try {
    return leerCuenta(mesa, readFileSync(join(carpetas(mesa).correos, huellaDe(correo)), "utf8").trim());
  } catch {
    return null;
  }
}

/** Si un correo ya tiene cuenta, comparado como se guarda. */
export function hayCuentaDe(correo: unknown, mesa: string = carpetaDeLaMesa()): boolean {
  const limpio = correoQueVale(correo);
  return limpio !== null && porCorreo(mesa, limpio) !== null;
}

/**
 * La lista de correos que piensan con la cuenta de la casa, leída de su entorno: separados por comas, y cada uno
 * comparado como se guarda. Uno que no tiene forma de correo no se salta: la casa no arranca, para que nadie crea
 * que está en la lista sin estarlo.
 */
export function correosDeLaCasa(escrito: string | undefined): string[] {
  const dichos = (escrito ?? "").split(",").filter((x) => x.trim() !== "");
  return [
    ...new Set(
      dichos.map((dicho) => {
        const correo = correoQueVale(dicho);
        if (correo === null) throw new Error("en la lista de correos de la casa hay uno que no tiene forma de correo");
        return correo;
      }),
    ),
  ];
}

export function publica(c: Cuenta): CuentaPublica {
  return { id: c.id, email: c.correo, key: c.clave === null ? null : { hint: c.clave.pista, since: c.clave.cuando } };
}

export type AlRegistrar = { correo: unknown; contrasena: unknown; mesa?: string; cuando?: Date };
export type AlEntrar = AlRegistrar & { sesiones?: number };

/** Abre una cuenta con un correo y una contraseña. Un correo, una cuenta. */
export async function registrar(o: AlRegistrar): Promise<Cuenta> {
  const mesa = o.mesa ?? carpetaDeLaMesa();
  const correo = correoQueVale(o.correo);
  if (correo === null) throw new FalloDeCuenta("bad_email");
  if (!contrasenaQueVale(o.contrasena, correo)) throw new FalloDeCuenta("bad_password");
  const donde = carpetas(mesa);
  mkdirSync(donde.correos, { recursive: true, mode: 0o700 });
  const sal = randomBytes(16);
  const huella = await pasar(o.contrasena, sal, SCRYPT);
  const cuenta: Cuenta = {
    formato: "cuenta/1",
    id: `u-${randomBytes(16).toString("hex")}`,
    correo,
    creada: (o.cuando ?? new Date()).toISOString(),
    contrasena: { sal: sal.toString("hex"), huella: huella.toString("hex"), N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
    clave: null,
  };
  // El correo se reserva de una vez: si dos se registran a la vez con el mismo, solo uno se lo queda.
  try {
    writeFileSync(join(donde.correos, huellaDe(correo)), cuenta.id, { flag: "wx", mode: 0o600 });
  } catch {
    throw new FalloDeCuenta("exists");
  }
  guardarJson(join(donde.cuentas, `${cuenta.id}.json`), cuenta);
  return cuenta;
}

/** Una sal de mentira, para que comprobar un correo que no existe tarde lo mismo que uno que sí. */
const SAL_DE_NADIE = randomBytes(16);

/**
 * Abre una sesión si el correo y la contraseña casan. Si no, null, sea porque no hay tal cuenta o porque la
 * contraseña no es: quien prueba no llega a saber cuál de las dos.
 */
export async function entrar(o: AlEntrar): Promise<{ sesion: string; cuenta: Cuenta } | null> {
  const mesa = o.mesa ?? carpetaDeLaMesa();
  const correo = correoQueVale(o.correo);
  const contrasena = typeof o.contrasena === "string" ? o.contrasena.slice(0, CONTRASENA.maximo * 4) : "";
  const cuenta = correo === null ? null : porCorreo(mesa, correo);
  const g = cuenta?.contrasena ?? {
    sal: SAL_DE_NADIE.toString("hex"),
    huella: "",
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  };
  const dada = await pasar(contrasena, Buffer.from(g.sal, "hex"), g);
  const buena = Buffer.from(g.huella, "hex");
  if (cuenta === null || buena.length !== dada.length || !timingSafeEqual(dada, buena)) return null;
  return { sesion: abrirSesion(cuenta, mesa, o.cuando ?? new Date(), o.sesiones), cuenta };
}

/**
 * Abre una sesión de una cuenta y devuelve su llave. Una cuenta no tiene más de un tope de sesiones: las caducadas
 * se quitan, y si aún sobran, se cierra la más vieja.
 */
export function abrirSesion(
  cuenta: Cuenta,
  mesa: string = carpetaDeLaMesa(),
  cuando: Date = new Date(),
  tope: number = FRENOS_DE_LA_PUERTA.sesionesDeUnaCuenta,
): string {
  const donde = carpetas(mesa);
  const suyas = join(donde.deCadaCuenta, cuenta.id);
  mkdirSync(suyas, { recursive: true, mode: 0o700 });
  const abiertas: { huella: string; creada: string }[] = [];
  for (const huella of readdirSync(suyas)) {
    const principal = join(donde.sesiones, `${huella}.json`);
    type Abierta = { cuenta?: string; creada?: string; caduca?: string };
    let s: Abierta | null;
    try {
      s = JSON.parse(readFileSync(principal, "utf8")) as Abierta;
    } catch {
      s = null;
    }
    if (s === null || s.cuenta !== cuenta.id || !(Date.parse(s.caduca ?? "") > cuando.getTime())) {
      if (s?.cuenta === cuenta.id) rmSync(principal, { force: true });
      rmSync(join(suyas, huella), { force: true });
    } else {
      let orden = "";
      try {
        orden = readFileSync(join(suyas, huella), "utf8");
      } catch {
        // Sin orden, cuenta como la más vieja.
      }
      abiertas.push({ huella, creada: `${s.creada ?? ""}|${orden}` });
    }
  }
  abiertas.sort((a, b) => a.creada.localeCompare(b.creada));
  for (const vieja of abiertas.slice(0, Math.max(0, abiertas.length - Math.max(1, tope) + 1))) {
    rmSync(join(donde.sesiones, `${vieja.huella}.json`), { force: true });
    rmSync(join(suyas, vieja.huella), { force: true });
  }
  const sesion = randomBytes(32).toString("base64url");
  const huella = huellaDe(sesion);
  guardarJson(join(donde.sesiones, `${huella}.json`), {
    cuenta: cuenta.id,
    creada: cuando.toISOString(),
    caduca: new Date(cuando.getTime() + DIAS_DE_UNA_SESION * 86_400_000).toISOString(),
  });
  // Lo que ordena las sesiones de una cuenta abiertas en el mismo instante: el reloj fino de esta casa.
  writeFileSync(join(suyas, huella), String(process.hrtime.bigint()).padStart(24, "0"), { mode: 0o600 });
  return sesion;
}

/** De quién es una sesión, si existe y no ha caducado. */
export function sesionDe(sesion: unknown, mesa: string = carpetaDeLaMesa(), cuando: Date = new Date()): Cuenta | null {
  if (typeof sesion !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(sesion)) return null;
  const ruta = join(carpetas(mesa).sesiones, `${huellaDe(sesion)}.json`);
  try {
    const s = JSON.parse(readFileSync(ruta, "utf8")) as { cuenta: string; caduca: string };
    if (!(Date.parse(s.caduca) > cuando.getTime())) {
      salir(sesion, mesa);
      return null;
    }
    return leerCuenta(mesa, s.cuenta);
  } catch {
    return null;
  }
}

/** Cierra una sesión. Cerrar una que no existe no es un error. */
export function salir(sesion: unknown, mesa: string = carpetaDeLaMesa()): void {
  if (typeof sesion !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(sesion)) return;
  const donde = carpetas(mesa);
  const huella = huellaDe(sesion);
  const ruta = join(donde.sesiones, `${huella}.json`);
  try {
    const { cuenta } = JSON.parse(readFileSync(ruta, "utf8")) as { cuenta: string };
    if (ID.test(cuenta)) rmSync(join(donde.deCadaCuenta, cuenta, huella), { force: true });
  } catch {
    // No estaba abierta, o no se deja leer: se quita igual.
  }
  rmSync(ruta, { force: true });
}

// La clave de IA del viajero: cifrada con el secreto de la casa. De ella solo se enseña cómo acaba.

/** El secreto de la casa, leído de su entorno: 32 bytes, escritos en hexadecimal o en base64. */
export function secretoDe(escrito: string | undefined): Buffer {
  const texto = (escrito ?? "").trim();
  const secreto = /^[0-9a-fA-F]{64}$/.test(texto) ? Buffer.from(texto, "hex") : Buffer.from(texto, "base64");
  if (secreto.length !== 32) throw new Error("el secreto de la casa tiene que ser de 32 bytes");
  return secreto;
}

export function claveQueVale(clave: unknown): clave is string {
  return (
    typeof clave === "string" &&
    clave.length >= CLAVE_DE_IA.minimo &&
    clave.length <= CLAVE_DE_IA.maximo &&
    /^[\x21-\x7e]+$/.test(clave)
  );
}

/** Guarda la clave de IA de una cuenta, cifrada. La de antes, si la había, se pisa. */
export function guardarClave(
  id: string,
  clave: unknown,
  secreto: Buffer,
  mesa: string,
  cuando: Date = new Date(),
): Cuenta {
  const cuenta = leerCuenta(mesa, id);
  if (cuenta === null) throw new FalloDeCuenta("no_account");
  if (!claveQueVale(clave)) throw new FalloDeCuenta("bad_key");
  const iv = randomBytes(12);
  // La cuenta va atada a lo cifrado: una clave copiada al archivo de otra cuenta no se descifra.
  const cifra = createCipheriv("aes-256-gcm", secreto, iv).setAAD(Buffer.from(id));
  const cifrada = Buffer.concat([cifra.update(clave, "utf8"), cifra.final()]);
  cuenta.clave = {
    iv: iv.toString("hex"),
    marca: cifra.getAuthTag().toString("hex"),
    cifrada: cifrada.toString("hex"),
    pista: clave.slice(-4),
    cuando: cuando.toISOString(),
  };
  guardarJson(join(carpetas(mesa).cuentas, `${id}.json`), cuenta);
  return cuenta;
}

/** La clave de IA de una cuenta, descifrada; null si no tiene, o si lo guardado no se deja descifrar. */
export function claveDe(id: string, secreto: Buffer, mesa: string): string | null {
  const c = leerCuenta(mesa, id)?.clave;
  if (c === null || c === undefined) return null;
  try {
    const descifra = createDecipheriv("aes-256-gcm", secreto, Buffer.from(c.iv, "hex")).setAAD(Buffer.from(id));
    descifra.setAuthTag(Buffer.from(c.marca, "hex"));
    return Buffer.concat([descifra.update(Buffer.from(c.cifrada, "hex")), descifra.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Borra la clave de IA de una cuenta. */
export function borrarClave(id: string, mesa: string): Cuenta {
  const cuenta = leerCuenta(mesa, id);
  if (cuenta === null) throw new FalloDeCuenta("no_account");
  cuenta.clave = null;
  guardarJson(join(carpetas(mesa).cuentas, `${id}.json`), cuenta);
  return cuenta;
}
