// Las fotos: elegir cuáles se le pasan al asiento que mira un alojamiento, con un tope, y bajarlas a una carpeta de
// fuera del repositorio. De la habitación de ese precio van las primeras, que el enchufe ordena por lo que enseñan.
// Las del alojamiento no dicen de qué son: si no caben todas, van repartidas por toda la lista. El código no mira
// ninguna: solo las elige por regla y las baja.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { dentroDelRepositorio } from "../launcher/mesa.ts";

export type Tope = { habitacion: number; hotel: number };
/** Menos fotos y mejor elegidas: mirar cuarenta en grande, una a una, es lo que más tarda y más gasta. */
export const TOPE: Tope = { habitacion: 8, hotel: 16 };

/** Una foto por bajar: su sitio en el material, sin la extensión, que la dice la propia foto al llegar. */
export type Pedida = { ruta: string; url: string };

export type Eleccion = {
  pedidas: Pedida[];
  habitacion: { dadas: number; total: number };
  hotel: { dadas: number; total: number };
};

const dos = (n: number): string => String(n).padStart(2, "0");

/** Reparte el tope por toda la lista, a pasos iguales, para no quedarse solo con las primeras. */
export function muestra<T>(todas: T[], tope: number): T[] {
  if (todas.length <= tope) return [...todas];
  const salida: T[] = [];
  for (let i = 0; i < tope; i++) salida.push(todas[Math.floor((i * todas.length) / tope)]);
  return salida;
}

export function elegirFotos(deLaHabitacion: string[], delHotel: string[], tope: Tope = TOPE): Eleccion {
  const habitacion = [...new Set(deLaHabitacion)];
  const hotel = [...new Set(delHotel)].filter((url) => !habitacion.includes(url));
  const dadasDeHabitacion = habitacion.slice(0, tope.habitacion);
  const dadasDelHotel = muestra(hotel, tope.hotel);
  return {
    pedidas: [
      ...dadasDeHabitacion.map((url, i) => ({ ruta: `photos/room-${dos(i + 1)}`, url })),
      ...dadasDelHotel.map((url, i) => ({ ruta: `photos/hotel-${dos(i + 1)}`, url })),
    ],
    habitacion: { dadas: dadasDeHabitacion.length, total: habitacion.length },
    hotel: { dadas: dadasDelHotel.length, total: hotel.length },
  };
}

/** Solo se baja de direcciones https con nombre: ni máquinas de dentro, ni números, ni claves en la dirección. */
export function direccionSegura(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username !== "" || u.password !== "" || u.port !== "") return false;
  const maquina = u.hostname.toLowerCase();
  if (/^[\d.]+$/.test(maquina) || maquina.includes(":") || maquina.startsWith("[")) return false;
  if (!maquina.includes(".") || /(^|\.)(localhost|local|internal|lan|home|corp|invalid)$/.test(maquina)) return false;
  return true;
}

/** El tipo de una imagen, por sus primeros bytes y no por lo que diga quien la manda. */
export function tipoDeImagen(b: Uint8Array): "jpg" | "png" | "webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const letras = (desde: number): string => String.fromCharCode(...b.slice(desde, desde + 4));
  if (b.length > 12 && letras(0) === "RIFF" && letras(8) === "WEBP") return "webp";
  return null;
}

export type Traer = (url: string, maximoBytes: number) => Promise<Uint8Array>;

const deInternet: Traer = async (url, maximoBytes) => {
  const respuesta = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!respuesta.ok) throw new Error(`contesta ${respuesta.status}`);
  if (Number(respuesta.headers.get("content-length") ?? 0) > maximoBytes) throw new Error("pesa demasiado");
  return new Uint8Array(await respuesta.arrayBuffer());
};

export type Bajada = { ruta: string; archivo: string; url: string; bytes: number };
export type Fallo = { ruta: string; url: string; motivo: string };
export type Opciones = { traer?: Traer; aLaVez?: number; maximoBytes?: number; segura?: (url: string) => boolean };

/** Baja las fotos pedidas a una carpeta de fuera del repositorio. Lo que falla no para lo demás: se apunta. */
export async function bajarFotos(
  pedidas: Pedida[],
  carpeta: string,
  o: Opciones = {},
): Promise<{ bajadas: Bajada[]; fallos: Fallo[] }> {
  if (dentroDelRepositorio(carpeta)) throw new Error("las fotos no se bajan dentro del repositorio");
  const traer = o.traer ?? deInternet;
  const maximo = o.maximoBytes ?? 10_000_000;
  const segura = o.segura ?? direccionSegura;
  const bajadas: Bajada[] = [];
  const fallos: Fallo[] = [];
  const cola = [...pedidas];

  async function trabaja(): Promise<void> {
    for (let p = cola.shift(); p !== undefined; p = cola.shift()) {
      try {
        if (!segura(p.url)) throw new Error("la dirección no es de fiar");
        const bytes = await traer(p.url, maximo);
        if (bytes.length === 0) throw new Error("llegó vacía");
        if (bytes.length > maximo) throw new Error("pesa demasiado");
        const tipo = tipoDeImagen(bytes);
        if (tipo === null) throw new Error("no es una imagen");
        const archivo = `${p.ruta}.${tipo}`;
        mkdirSync(dirname(join(carpeta, archivo)), { recursive: true });
        writeFileSync(join(carpeta, archivo), bytes);
        bajadas.push({ ruta: p.ruta, archivo, url: p.url, bytes: bytes.length });
      } catch (e) {
        fallos.push({ ruta: p.ruta, url: p.url, motivo: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, o.aLaVez ?? 6) }, trabaja));
  const porRuta = (a: { ruta: string }, b: { ruta: string }): number => a.ruta.localeCompare(b.ruta);
  return { bajadas: bajadas.sort(porRuta), fallos: fallos.sort(porRuta) };
}
