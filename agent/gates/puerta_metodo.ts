// La puerta de todos: lo que el código comprueba, desde fuera, de cualquier asiento al entregar. Mide que el método se
// siguió por fuera (cada paso dejó su archivo y en su orden, se acusó cada pieza, cada nota lleva su etiqueta y lo
// visto cita un archivo que existe, no se escribió donde no toca y la entrega se puede leer). No mide si lo que dice
// la entrega es verdad: eso es de la puerta de cada asiento.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Rojo, Veredicto } from "./puerta_busqueda.ts";

/** Los archivos que deja cada paso, en su orden. Son los mismos que nombra el contrato común. */
export const PASOS = [
  "1-acknowledgement.md",
  "2-plan.md",
  "3-notes.md",
  "4-computations.md",
  "5-self-critique.md",
] as const;
export const ENTREGA = "delivery.json";
/** Lo que dice cada nota de sí misma: lo vio, lo dedujo o lo supuso. */
export const ETIQUETAS = ["seen", "deduced", "assumed"];

/** Lo que la casa apunta al montar un puesto: de qué asiento es y la huella de todo lo que le dio. */
export type Sello = { asiento: string; archivos: Record<string, string> };

export type VeredictoDelMetodo = Veredicto & { entrega: Record<string, unknown> | null };

function archivosDe(carpeta: string, prefijo: string): string[] {
  if (!existsSync(carpeta)) return [];
  const salida: string[] = [];
  for (const nombre of readdirSync(carpeta).sort()) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta, `${prefijo}${nombre}/`));
    else salida.push(prefijo + nombre);
  }
  return salida;
}

/** La huella de lo que la casa le da al asiento: cada archivo de su contrato y de su material, con su resumen. */
export function huella(puesto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const parte of ["contract", "in"]) {
    for (const archivo of archivosDe(join(puesto, parte), `${parte}/`)) {
      salida[archivo] = createHash("sha256")
        .update(readFileSync(join(puesto, archivo)))
        .digest("hex");
    }
  }
  return salida;
}

/** Lo que hay en lo alto del material: lo que el acuse tiene que nombrar, pieza a pieza. */
function piezas(sello: Sello): string[] {
  const salida = new Set<string>();
  for (const archivo of Object.keys(sello.archivos)) {
    if (archivo.startsWith("in/")) salida.add(archivo.split("/")[1]);
  }
  return [...salida].sort();
}

export function puertaMetodo(puesto: string, sello: Sello): VeredictoDelMetodo {
  const rojos: Rojo[] = [];
  const out = join(puesto, "out");

  // 1. Cada paso dejó su archivo, con algo dentro.
  const escritos: { nombre: string; cuando: number }[] = [];
  for (const nombre of [...PASOS, ENTREGA]) {
    const ruta = join(out, nombre);
    if (!existsSync(ruta) || !statSync(ruta).isFile()) {
      rojos.push({ donde: `out/${nombre}`, que: "falta el archivo de este paso" });
      continue;
    }
    if (readFileSync(ruta, "utf8").trim() === "") {
      rojos.push({ donde: `out/${nombre}`, que: "el archivo de este paso está vacío" });
      continue;
    }
    escritos.push({ nombre, cuando: statSync(ruta).mtimeMs });
  }

  // 2. Y en su orden: ninguno se escribió antes que el del paso anterior.
  for (let i = 1; i < escritos.length; i++) {
    if (escritos[i].cuando < escritos[i - 1].cuando) {
      rojos.push({
        donde: `out/${escritos[i].nombre}`,
        que: `se escribió antes que ${escritos[i - 1].nombre}: los pasos van en su orden y no se vuelve atrás`,
      });
    }
  }

  // 3. En la salida no hay nada más que los seis archivos.
  const permitidos = new Set<string>([...PASOS, ENTREGA]);
  for (const archivo of archivosDe(out, "")) {
    if (!permitidos.has(archivo)) rojos.push({ donde: `out/${archivo}`, que: "no es un archivo del método" });
  }

  // 4. Fuera de la salida, el puesto está como lo dejó la casa: ni se tocó el material ni se escribió en otro sitio.
  const ahora = huella(puesto);
  for (const [archivo, resumen] of Object.entries(sello.archivos)) {
    if (ahora[archivo] === undefined) rojos.push({ donde: archivo, que: "la casa lo dio y ya no está" });
    else if (ahora[archivo] !== resumen) rojos.push({ donde: archivo, que: "la casa lo dio y se ha cambiado" });
  }
  for (const archivo of Object.keys(ahora)) {
    if (sello.archivos[archivo] === undefined) rojos.push({ donde: archivo, que: "no lo dio la casa: se escribió" });
  }
  if (existsSync(puesto)) {
    for (const nombre of readdirSync(puesto)) {
      if (!["contract", "in", "out"].includes(nombre))
        rojos.push({ donde: nombre, que: "se escribió fuera de la salida" });
    }
  }

  // 5. El acuse nombra cada pieza que recibió.
  const acuse = join(out, PASOS[0]);
  if (existsSync(acuse)) {
    const texto = readFileSync(acuse, "utf8");
    for (const pieza of piezas(sello)) {
      if (!texto.includes(pieza)) rojos.push({ donde: `out/${PASOS[0]}`, que: `no acusa la pieza ${pieza}` });
    }
  }

  // 6. Cada nota lleva su etiqueta, y lo visto, el archivo del material de donde sale.
  const notas = join(out, PASOS[2]);
  if (existsSync(notas)) {
    const lineas = readFileSync(notas, "utf8").split("\n");
    let cuantas = 0;
    lineas.forEach((linea, i) => {
      if (!/^\s*- /.test(linea)) return;
      cuantas++;
      const donde = `out/${PASOS[2]}:${i + 1}`;
      const final = /(?:\[([^\]]*)\]\s*)?\[([^\]]*)\]\s*$/.exec(linea);
      const etiqueta = final?.[2].trim() ?? "";
      if (!ETIQUETAS.includes(etiqueta)) {
        rojos.push({ donde, que: "la nota no acaba con su etiqueta: seen, deduced o assumed" });
        return;
      }
      if (etiqueta !== "seen") return;
      const fuentes = (final?.[1] ?? "")
        .split(",")
        .map((f) => f.trim().split("#")[0])
        .filter((f) => f !== "");
      if (fuentes.length === 0) rojos.push({ donde, que: "la nota dice que lo vio y no dice en qué archivo" });
      for (const f of fuentes) {
        if (!f.startsWith("in/") || sello.archivos[f] === undefined)
          rojos.push({ donde, que: `la nota cita ${f}, que no es un archivo de su material` });
      }
    });
    if (cuantas === 0 && readFileSync(notas, "utf8").trim() !== "")
      rojos.push({ donde: `out/${PASOS[2]}`, que: "no hay ninguna nota con la forma del método" });
  }

  // 7. La entrega se puede leer, es un objeto y es de este asiento.
  let entrega: Record<string, unknown> | null = null;
  const rutaEntrega = join(out, ENTREGA);
  if (existsSync(rutaEntrega) && readFileSync(rutaEntrega, "utf8").trim() !== "") {
    try {
      const leida: unknown = JSON.parse(readFileSync(rutaEntrega, "utf8"));
      if (leida === null || typeof leida !== "object" || Array.isArray(leida)) {
        rojos.push({ donde: `out/${ENTREGA}`, que: "la entrega no es un objeto" });
      } else {
        entrega = leida as Record<string, unknown>;
        if (entrega.seat !== sello.asiento)
          rojos.push({ donde: `out/${ENTREGA}`, que: `la entrega no dice que es de ${sello.asiento}` });
      }
    } catch {
      rojos.push({ donde: `out/${ENTREGA}`, que: "la entrega no es JSON válido" });
    }
  }

  return { verde: rojos.length === 0, rojos, entrega };
}
