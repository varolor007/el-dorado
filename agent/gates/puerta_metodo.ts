// La puerta de todos: lo que el código comprueba, desde fuera, de cualquier asiento al entregar. Mide que el método se
// siguió por fuera (cada paso dejó su archivo y en su orden, se acusó cada pieza, cada nota lleva su etiqueta y lo
// visto cita un archivo que existe, no se escribió donde no toca y la entrega se puede leer). Y que cada página que
// cite una nota o un dato se abrió de verdad: está en la memoria de lo consultado de ese asiento, que guarda la casa.
// No mide si lo que dice la entrega es verdad: eso es de la puerta de cada asiento.

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { direccionComparable, direccionesEn, esDireccion } from "../launcher/consultado.ts";
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
/** La marca de un asiento que sale a internet: este archivo en la carpeta de su contrato. */
export const INTERNET = "INTERNET.md";
/** Lo que dice cada nota de sí misma: lo vio, lo dedujo o lo supuso. */
export const ETIQUETAS = ["seen", "deduced", "assumed"];

/** Lo que la casa apunta al montar un puesto: de qué asiento es y la huella de todo lo que le dio. */
export type Sello = { asiento: string; archivos: Record<string, string> };

export type VeredictoDelMetodo = Veredicto & { entrega: Record<string, unknown> | null };

/** Lo más que puede pesar un archivo del material (una foto) y uno de los que escribe el asiento, en bytes. */
export const PESO_MAXIMO = { material: 12_000_000, salida: 2_000_000 };

/**
 * Los archivos de una carpeta, sin seguir ningún enlace: un enlace no es un archivo del puesto, apunte a donde
 * apunte, y se cuenta aparte.
 */
function archivosDe(carpeta: string, prefijo: string): string[] {
  if (!existsSync(carpeta)) return [];
  const salida: string[] = [];
  for (const nombre of readdirSync(carpeta).sort()) {
    const ruta = join(carpeta, nombre);
    const que = lstatSync(ruta);
    if (que.isDirectory()) salida.push(...archivosDe(ruta, `${prefijo}${nombre}/`));
    else if (que.isFile()) salida.push(prefijo + nombre);
  }
  return salida;
}

/**
 * Lo que no puede haber en un puesto: un enlace a otro sitio, algo que no es ni un archivo ni una carpeta, o un
 * archivo que pesa más de lo que cabe. Un enlace haría que la casa leyera, y devolviera, algo de fuera del puesto, o
 * que se quedara dando vueltas. Se mira sin abrir nada.
 */
function loQueNoCabe(puesto: string): Rojo[] {
  const rojos: Rojo[] = [];
  const recorre = (carpeta: string, prefijo: string, tope: number): void => {
    if (!existsSync(carpeta)) return;
    for (const nombre of readdirSync(carpeta).sort()) {
      const ruta = join(carpeta, nombre);
      const que = lstatSync(ruta);
      const donde = prefijo + nombre;
      if (que.isSymbolicLink()) rojos.push({ donde, que: "es un enlace a otro sitio: en un puesto no puede haber" });
      else if (que.isDirectory()) recorre(ruta, `${donde}/`, tope);
      else if (!que.isFile()) rojos.push({ donde, que: "no es un archivo ni una carpeta" });
      else if (que.size > tope) rojos.push({ donde, que: `pesa ${que.size} bytes, y caben ${tope}` });
    }
  };
  if (existsSync(puesto) && lstatSync(puesto).isSymbolicLink())
    return [{ donde: "puesto", que: "la carpeta del puesto es un enlace a otro sitio" }];
  for (const [parte, tope] of [
    ["contract", PESO_MAXIMO.material],
    ["in", PESO_MAXIMO.material],
    ["out", PESO_MAXIMO.salida],
  ] as const) {
    const carpeta = join(puesto, parte);
    if (existsSync(carpeta) && lstatSync(carpeta).isSymbolicLink())
      rojos.push({ donde: parte, que: "es un enlace a otro sitio: en un puesto no puede haber" });
    else recorre(carpeta, `${parte}/`, tope);
  }
  return rojos;
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

/**
 * La puerta de todos. Antes de abrir nada mira que en el puesto solo haya archivos y carpetas suyos, y de un peso
 * que quepa; y si aun así algo no se puede leer, es un rojo, no una excepción: la casa no se rompe por lo que deja
 * un asiento.
 */
export function puertaMetodo(puesto: string, sello: Sello, abiertas: string[] = []): VeredictoDelMetodo {
  try {
    const raros = loQueNoCabe(puesto);
    if (raros.length > 0) return { verde: false, rojos: raros, entrega: null };
    return mirarElMetodo(puesto, sello, abiertas);
  } catch {
    return { verde: false, rojos: [{ donde: "puesto", que: "el puesto no se pudo leer" }], entrega: null };
  }
}

/**
 * Las notas de un texto, cada una con la línea en la que empieza. Una nota empieza con `- ` y llega hasta la
 * siguiente: lo que cuelga de ella (una lista metida, con más sangría, o un renglón que sigue justo debajo) es la
 * misma nota, y su fuente y su etiqueta van al final de su primer renglón o al final de todo. Un título, o un
 * renglón sin sangría tras un hueco, la cierra. Así una nota partida en varias líneas se lee entera, y una sin
 * etiqueta sigue siendo un rojo. Van también sus renglones, uno a uno: el que lleve su propia fuente y su etiqueta
 * se mira igual que una nota suelta.
 */
export function notasDe(texto: string): { linea: number; texto: string; renglones: string[] }[] {
  const salida: { linea: number; texto: string; renglones: string[] }[] = [];
  let abierta: { linea: number; sangria: number; trozos: string[] } | null = null;
  let hueco = false;
  const cierra = (): void => {
    if (abierta !== null)
      salida.push({ linea: abierta.linea, texto: abierta.trozos.join(" "), renglones: abierta.trozos });
    abierta = null;
  };
  texto.split("\n").forEach((cruda, i) => {
    const linea = cruda.replace(/\s+$/, "");
    if (linea === "") {
      hueco = true;
      return;
    }
    const sangria = linea.length - linea.trimStart().length;
    const esNota = /^\s*- /.test(linea);
    const cuelga = abierta !== null && (sangria > abierta.sangria || (!esNota && !hueco && !/^#/.test(linea)));
    hueco = false;
    if (cuelga) abierta?.trozos.push(linea.trim());
    else {
      cierra();
      if (esNota) abierta = { linea: i + 1, sangria, trozos: [linea.trim()] };
    }
  });
  cierra();
  return salida;
}

/** Las fuentes de una nota, separadas por comas: una coma dentro de una dirección no la parte. */
function fuentesDe(entreCorchetes: string): string[] {
  return entreCorchetes
    .split(/,\s*(?=in\/|contract\/|https?:\/\/|www\.)/i)
    .map((f) => f.trim().replace(/,+$/, ""))
    .filter((f) => f !== "");
}

/** Las direcciones que lleva el material de texto del puesto: un dato puede repetir una que le dio la casa. */
function direccionesDelMaterial(puesto: string, sello: Sello): Set<string> {
  const salida = new Set<string>();
  for (const archivo of Object.keys(sello.archivos)) {
    if (!archivo.startsWith("in/") || !/\.(json|md|txt|csv)$/i.test(archivo)) continue;
    const ruta = join(puesto, archivo);
    if (!existsSync(ruta)) continue;
    for (const d of direccionesEn(readFileSync(ruta, "utf8"))) {
      const comparable = direccionComparable(d);
      if (comparable !== null) salida.add(comparable);
    }
  }
  return salida;
}

/** Los textos de una entrega, con dónde está cada uno, para buscar en ellos las páginas que cita. */
function textosDe(valor: unknown, donde: string): { donde: string; texto: string }[] {
  if (typeof valor === "string") return [{ donde, texto: valor }];
  if (Array.isArray(valor)) return valor.flatMap((x, i) => textosDe(x, `${donde}[${i}]`));
  if (typeof valor === "object" && valor !== null)
    return Object.entries(valor).flatMap(([k, x]) => textosDe(x, `${donde}.${k}`));
  return [];
}

function mirarElMetodo(puesto: string, sello: Sello, paginas: string[]): VeredictoDelMetodo {
  const rojos: Rojo[] = [];
  const out = join(puesto, "out");
  // Sale a internet el asiento que lo dice en su contrato; lo que abrió, lo dice la memoria de lo consultado.
  const conInternet = sello.archivos[`contract/seat/${INTERNET}`] !== undefined;
  const abiertas = new Set(paginas.map(direccionComparable).filter((d): d is string => d !== null));
  const sinAbrir = (pagina: string): string | null => {
    if (!conInternet) return `cita la página ${pagina}, y este asiento no sale a internet`;
    const comparable = direccionComparable(pagina);
    return comparable !== null && abiertas.has(comparable) ? null : `cita la página ${pagina}, que no se abrió`;
  };

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
    let cuantas = 0;
    const FINAL = /(?:\[([^\]]*)\]\s*)?\[([^\]]*)\]\s*$/;
    // Lo que cita un texto que acaba con su etiqueta: lo visto, un archivo del material; una página, una abierta.
    const mirarFuentes = (donde: string, final: RegExpExecArray): void => {
      const fuentes = fuentesDe(final[1] ?? "");
      // Una página citada, lleve la etiqueta que lleve, tiene que ser una que se abrió.
      for (const f of fuentes.filter(esDireccion)) {
        const falla = sinAbrir(f);
        if (falla !== null) rojos.push({ donde, que: `la nota ${falla}` });
      }
      if (final[2].trim() !== "seen") return;
      if (fuentes.length === 0) rojos.push({ donde, que: "la nota dice que lo vio y no dice en qué archivo" });
      for (const f of fuentes.filter((x) => !esDireccion(x)).map((x) => x.split("#")[0])) {
        // Vale un archivo del material, o una carpeta suya cuando la nota habla de todo lo que hay en ella. Y un
        // archivo de su contrato, cuando la nota es de lo que dice el contrato: también lo dio la casa, sellado.
        const carpeta = f.replace(/\/+$/, "") + "/";
        const esDelMaterial =
          (f.startsWith("in/") || f.startsWith("contract/")) &&
          (sello.archivos[f] !== undefined || Object.keys(sello.archivos).some((a) => a.startsWith(carpeta)));
        if (!esDelMaterial) rojos.push({ donde, que: `la nota cita ${f}, que no es de su material` });
      }
    };
    const conEtiqueta = (x: string): RegExpExecArray | null => {
      const final = FINAL.exec(x);
      return final !== null && ETIQUETAS.includes(final[2].trim()) ? final : null;
    };
    notasDe(readFileSync(notas, "utf8")).forEach(({ linea, texto, renglones }) => {
      cuantas++;
      const donde = `out/${PASOS[2]}:${linea}`;
      // La etiqueta de una nota va al final de su primer renglón o al final de todo lo que cuelga de ella.
      const propias = renglones.map(conEtiqueta);
      const delFinal = propias.at(-1) ?? conEtiqueta(texto);
      if (propias[0] === null && delFinal === null) {
        rojos.push({ donde, que: "la nota no acaba con su etiqueta: seen, deduced o assumed" });
        return;
      }
      // Cada renglón que lleva su fuente y su etiqueta se mira: uno de dentro no se cuela por ir colgado.
      const queMirar = propias.at(-1) === null && delFinal !== null ? [...propias, delFinal] : propias;
      for (const final of queMirar) if (final !== null) mirarFuentes(donde, final);
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
        // 8. Un dato que cita una página: una que se abrió, o una que venía en su material.
        const delMaterial = direccionesDelMaterial(puesto, sello);
        for (const { donde, texto } of textosDe(entrega, `out/${ENTREGA}`))
          for (const d of direccionesEn(texto)) {
            const comparable = direccionComparable(d);
            if (comparable !== null && delMaterial.has(comparable)) continue;
            if (conInternet && abiertas.has(comparable ?? "")) continue;
            const porque = conInternet ? "que no se abrió ni venía en su material" : "que no venía en su material";
            rojos.push({ donde, que: `el dato cita la página ${d}, ${porque}` });
          }
      }
    } catch {
      rojos.push({ donde: `out/${ENTREGA}`, que: "la entrega no es JSON válido" });
    }
  }

  return { verde: rojos.length === 0, rojos, entrega };
}
