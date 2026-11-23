// La prueba del repositorio: lo que tiene que cumplir todo lo que se sube, mirado por el código.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { test } from "node:test";
import { carpetaDeLaMesa } from "../../agent/launcher/mesa.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const FUERA = new Set([".git", "node_modules", ".next"]);
// Las copias de trabajo de quien revisa, que no son del repositorio: cada una es el repositorio entero otra vez.
const COPIAS = join(".claude", "worktrees");
const DE_TEXTO = /\.(md|ts|tsx|mjs|js|css|json|html|yml|yaml|txt)$/;

function archivos(carpeta: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(carpeta)) {
    if (FUERA.has(nombre)) continue;
    const ruta = join(carpeta, nombre);
    if (relative(RAIZ, ruta) === COPIAS) continue;
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else salida.push(relative(RAIZ, ruta));
  }
  return salida;
}

const TODOS = archivos(RAIZ);
const TEXTOS = TODOS.filter((a) => DE_TEXTO.test(a) && !a.endsWith("package-lock.json"));
// La raya larga, la media, el punto medio y los puntos suspensivos, escritos por su código para no ponerlos aquí.
const PROHIBIDOS = new RegExp("[" + [0x2014, 0x2013, 0xb7, 0x2026].map((c) => String.fromCodePoint(c)).join("") + "]");
// Las marcas de los modelos de IA, partidas para que esta misma línea no sea un identificador.
const MODELO = new RegExp(
  ["clau" + "de-(opus|sonnet|haiku|fable|\\d)", "gp" + "t-\\d", "gem" + "ini-\\d"].join("|"),
  "i",
);

test("ningún texto lleva rayas largas, puntos medios ni el carácter de puntos suspensivos", () => {
  const malos: string[] = [];
  for (const a of TEXTOS) {
    readFileSync(join(RAIZ, a), "utf8")
      .split("\n")
      .forEach((linea, i) => {
        if (PROHIBIDOS.test(linea)) malos.push(`${a}:${i + 1}`);
      });
  }
  assert.deepEqual(malos, []);
});

test("ningún identificador de modelo en el repositorio", () => {
  const malos = TEXTOS.filter((a) => MODELO.test(readFileSync(join(RAIZ, a), "utf8")));
  assert.deepEqual(malos, []);
});

test("el código, a 120 caracteres por línea", () => {
  const largas: string[] = [];
  // Los datos de las biblias y los textos de la web son prosa, no código: sus frases no se parten a 120.
  const prosa = (x: string): boolean => x.endsWith(".datos.mjs") || x === "web/src/lib/textos.ts";
  for (const a of TODOS.filter((x) => /\.(ts|tsx|mjs)$/.test(x) && !prosa(x))) {
    readFileSync(join(RAIZ, a), "utf8")
      .split("\n")
      .forEach((linea, i) => {
        if (linea.length > 120) largas.push(`${a}:${i + 1} (${linea.length})`);
      });
  }
  assert.deepEqual(largas, []);
});

test("ningún dato de un viaje en el repositorio: solo el caso inventado", () => {
  // Los archivos de configuración de cada paquete: el del agente, en la raíz, y el de la web, en su carpeta.
  const permitidos = new Set(["package.json", "package-lock.json", "tsconfig.json", ".prettierrc.json"]);
  const deLaWeb = new Set([
    "web/package.json",
    "web/package-lock.json",
    "web/tsconfig.json",
    "web/tsconfig.bateria.json",
  ]);
  const datos = TODOS.filter(
    (a) =>
      /\.(json|csv|jsonl)$/.test(a) && !permitidos.has(a) && !deLaWeb.has(a) && !a.startsWith("tests/cases/inventado/"),
  );
  assert.deepEqual(datos, []);
});

test("ningún carácter invisible en lo que se sube: los que hagan falta van escritos por su código", () => {
  // Los que no se ven y cambian lo que se lee: marcas de control, espacios raros y los que giran el sentido del texto.
  const rangos = [
    [0x00, 0x08],
    [0x0b, 0x0c],
    [0x0e, 0x1f],
    [0x7f, 0xa0],
    [0x2009, 0x2009],
    [0x200b, 0x200f],
    [0x202a, 0x202f],
    [0x2060, 0x2069],
    [0xfeff, 0xfeff],
  ];
  const invisible = (c: string): boolean => rangos.some(([de, a]) => c.codePointAt(0)! >= de && c.codePointAt(0)! <= a);
  const malos = TEXTOS.filter((a) => [...readFileSync(join(RAIZ, a), "utf8")].some(invisible));
  assert.deepEqual(malos, []);
});

test("ninguna clave en el repositorio", () => {
  const sospechosos = TEXTOS.filter((a) =>
    /(api[_-]?key|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i.test(
      readFileSync(join(RAIZ, a), "utf8"),
    ),
  );
  assert.deepEqual(sospechosos, []);
});

test("la mesa no puede estar dentro del repositorio", () => {
  assert.throws(() => carpetaDeLaMesa({ ELDORADO_MESA: join(RAIZ, "mesa") }), /dentro del repositorio/);
  assert.throws(() => carpetaDeLaMesa({ ELDORADO_MESA: RAIZ }), /dentro del repositorio/);
  assert.ok(!carpetaDeLaMesa({}).startsWith(RAIZ));
});

test("cada carpeta del agente y de las pruebas está en el mapa", () => {
  const mapa = readFileSync(join(RAIZ, "MAP.md"), "utf8");
  const carpetas = new Set<string>();
  for (const a of TODOS) {
    const partes = a.split("/");
    if ((partes[0] === "agent" || partes[0] === "tests") && partes.length > 2)
      carpetas.add(partes.slice(0, partes.length - 1).join("/"));
  }
  const sinMapa = [...carpetas].filter((c) => !mapa.includes("`" + c + "/`"));
  assert.deepEqual(sinMapa, []);
});
