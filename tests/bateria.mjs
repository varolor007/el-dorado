// La batería: lo que tiene que estar en verde antes de cada commit. Corre todas las pruebas del código, con el caso
// inventado y sin internet, y mira los tipos. Tarda segundos y no gasta nada.
//
//   node tests/bateria.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pruebas = readdirSync(join(raiz, "tests", "code"))
  .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.mjs"))
  .map((f) => join("tests", "code", f));

function corre(nombre, orden, argumentos) {
  const r = spawnSync(orden, argumentos, { cwd: raiz, stdio: "inherit" });
  if (r.error) {
    console.error(`${nombre}: no se pudo lanzar (${r.error.message})`);
    return false;
  }
  return r.status === 0;
}

let verde = corre("las pruebas", process.execPath, ["--test", ...pruebas]);

const tscLocal = join(raiz, "node_modules", ".bin", "tsc");
if (existsSync(tscLocal)) {
  verde = corre("los tipos", tscLocal, ["--noEmit", "-p", "tsconfig.json"]) && verde;
} else {
  console.error("los tipos: falta instalar las dependencias de desarrollo (npm install)");
  verde = false;
}

console.log(verde ? "\nBatería en verde." : "\nBatería en ROJO.");
process.exit(verde ? 0 : 1);
