// Las pruebas del método común: el contrato y el código dicen lo mismo, y la puerta de todos cae en cada trampa.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  ENTREGA,
  ETIQUETAS,
  huella,
  PASOS,
  PESO_MAXIMO,
  puertaMetodo,
  type Sello,
} from "../../agent/gates/puerta_metodo.ts";

const COMUN = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "common");
const leer = (nombre: string): string => readFileSync(join(COMUN, nombre), "utf8");

/** Un puesto inventado, con su material, y un asiento que lo hizo todo bien. */
function puestoBueno(): { puesto: string; sello: Sello } {
  const puesto = mkdtempSync(join(tmpdir(), "el-dorado-puesto-"));
  mkdirSync(join(puesto, "contract"));
  mkdirSync(join(puesto, "in", "photos"), { recursive: true });
  mkdirSync(join(puesto, "out"));
  writeFileSync(join(puesto, "contract", "README.md"), "Read this first");
  writeFileSync(join(puesto, "in", "sheet.json"), "{}");
  writeFileSync(join(puesto, "in", "photos", "room-01.jpg"), "una foto inventada");
  const sello: Sello = { asiento: "seat-of-test", archivos: huella(puesto) };
  const textos: Record<string, string> = {
    "1-acknowledgement.md": "I received sheet.json and the folder photos, with one file.",
    "2-plan.md": "I will look at the room first.",
    "3-notes.md": [
      "# Notes",
      "- A double bed and a window. [in/photos/room-01.jpg] [seen]",
      "- The sheet gives no size. [in/sheet.json#room] [seen]",
      "- So the size is not known. [deduced]",
    ].join("\n"),
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify({ seat: "seat-of-test" }),
  };
  [...PASOS, ENTREGA].forEach((nombre, i) => {
    writeFileSync(join(puesto, "out", nombre), textos[nombre]);
    const cuando = new Date(Date.UTC(2026, 0, 1, 10, i));
    utimesSync(join(puesto, "out", nombre), cuando, cuando);
  });
  return { puesto, sello };
}

function rojosDe(estropea: (puesto: string, sello: Sello) => void): string[] {
  const { puesto, sello } = puestoBueno();
  try {
    estropea(puesto, sello);
    return puertaMetodo(puesto, sello).rojos.map((r) => `${r.donde}: ${r.que}`);
  } finally {
    rmSync(puesto, { recursive: true, force: true });
  }
}

test("el contrato común nombra los mismos archivos que comprueba el código", () => {
  const metodo = leer("METHOD.md");
  const entrega = leer("DELIVERY.md");
  for (const nombre of [...PASOS, ENTREGA]) {
    assert.ok(metodo.includes(`out/${nombre}`), `METHOD.md no nombra ${nombre}`);
    assert.ok(entrega.includes(nombre), `DELIVERY.md no nombra ${nombre}`);
  }
});

test("el contrato común nombra las mismas etiquetas que comprueba el código", () => {
  const metodo = leer("METHOD.md");
  for (const etiqueta of ETIQUETAS) assert.ok(metodo.includes(`\`${etiqueta}\``), `METHOD.md no nombra ${etiqueta}`);
});

test("las normas de todos son diez, de la T1 a la T10, cada una una vez", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(T\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(
    codigos,
    Array.from({ length: 10 }, (_, i) => `T${i + 1}`),
  );
});

test("el orden de lectura nombra cada archivo del contrato común y los cuatro del asiento", () => {
  const orden = leer("README.md");
  for (const nombre of ["common/METHOD.md", "common/RULES.md", "common/DELIVERY.md"]) assert.ok(orden.includes(nombre));
  for (const nombre of ["seat/README.md", "seat/GUIDE.md", "seat/RULES.md", "seat/DELIVERY.md"])
    assert.ok(orden.includes(nombre));
});

test("un asiento que sigue el método pasa la puerta de todos, y la puerta devuelve su entrega", () => {
  const { puesto, sello } = puestoBueno();
  try {
    const v = puertaMetodo(puesto, sello);
    assert.deepEqual(v.rojos, []);
    assert.equal(v.verde, true);
    assert.deepEqual(v.entrega, { seat: "seat-of-test" });
  } finally {
    rmSync(puesto, { recursive: true, force: true });
  }
});

test("trampa: falta el archivo de un paso", () => {
  const rojos = rojosDe((p) => rmSync(join(p, "out", "2-plan.md")));
  assert.deepEqual(rojos, ["out/2-plan.md: falta el archivo de este paso"]);
});

test("trampa: el archivo de un paso está vacío", () => {
  const rojos = rojosDe((p) => writeFileSync(join(p, "out", "5-self-critique.md"), "  \n"));
  assert.ok(rojos.includes("out/5-self-critique.md: el archivo de este paso está vacío"));
});

test("trampa: la entrega se escribió antes que las notas", () => {
  const rojos = rojosDe((p) => {
    const antes = new Date(Date.UTC(2026, 0, 1, 10, 1, 30));
    utimesSync(join(p, "out", "delivery.json"), antes, antes);
  });
  assert.equal(rojos.length, 1);
  assert.match(rojos[0], /^out\/delivery\.json: se escribió antes que 5-self-critique\.md/);
});

test("trampa: se volvió atrás a reescribir las notas después de la autocrítica", () => {
  const rojos = rojosDe((p) => {
    const despues = new Date(Date.UTC(2026, 0, 1, 10, 4, 30));
    utimesSync(join(p, "out", "3-notes.md"), despues, despues);
  });
  assert.equal(rojos.length, 1);
  assert.match(rojos[0], /^out\/4-computations\.md: se escribió antes que 3-notes\.md/);
});

test("trampa: en la salida hay un archivo que no es del método", () => {
  const rojos = rojosDe((p) => writeFileSync(join(p, "out", "extra.md"), "algo"));
  assert.deepEqual(rojos, ["out/extra.md: no es un archivo del método"]);
});

test("trampa: se cambió el material que dio la casa", () => {
  const rojos = rojosDe((p) => writeFileSync(join(p, "in", "sheet.json"), '{"size_m2": 40}'));
  assert.deepEqual(rojos, ["in/sheet.json: la casa lo dio y se ha cambiado"]);
});

test("trampa: se borró una pieza del material", () => {
  const rojos = rojosDe((p) => rmSync(join(p, "in", "photos", "room-01.jpg")));
  assert.deepEqual(rojos, ["in/photos/room-01.jpg: la casa lo dio y ya no está"]);
});

test("trampa: se escribió dentro del contrato o del material", () => {
  const rojos = rojosDe((p) => {
    writeFileSync(join(p, "contract", "nota.md"), "algo");
    writeFileSync(join(p, "in", "photos", "room-02.jpg"), "otra foto");
  });
  assert.deepEqual(rojos, [
    "contract/nota.md: no lo dio la casa: se escribió",
    "in/photos/room-02.jpg: no lo dio la casa: se escribió",
  ]);
});

test("trampa: se escribió fuera de la salida, en lo alto del puesto", () => {
  const rojos = rojosDe((p) => writeFileSync(join(p, "apuntes.txt"), "algo"));
  assert.deepEqual(rojos, ["apuntes.txt: se escribió fuera de la salida"]);
});

test("trampa: el acuse no nombra una pieza que recibió", () => {
  const rojos = rojosDe((p) => {
    const cuando = new Date(Date.UTC(2026, 0, 1, 10, 0));
    writeFileSync(join(p, "out", "1-acknowledgement.md"), "I received sheet.json.");
    utimesSync(join(p, "out", "1-acknowledgement.md"), cuando, cuando);
  });
  assert.deepEqual(rojos, ["out/1-acknowledgement.md: no acusa la pieza photos"]);
});

test("trampa: la entrega no es JSON, no es un objeto o es de otro asiento", () => {
  const escribe = (texto: string) => (p: string) => {
    const cuando = new Date(Date.UTC(2026, 0, 1, 10, 5));
    writeFileSync(join(p, "out", "delivery.json"), texto);
    utimesSync(join(p, "out", "delivery.json"), cuando, cuando);
  };
  assert.deepEqual(rojosDe(escribe("{'seat': 'x'}")), ["out/delivery.json: la entrega no es JSON válido"]);
  assert.deepEqual(rojosDe(escribe("[1, 2]")), ["out/delivery.json: la entrega no es un objeto"]);
  assert.deepEqual(rojosDe(escribe('{"seat": "another"}')), [
    "out/delivery.json: la entrega no dice que es de seat-of-test",
  ]);
});

function conNotas(lineas: string[]): (p: string) => void {
  return (p) => {
    const cuando = new Date(Date.UTC(2026, 0, 1, 10, 2));
    writeFileSync(join(p, "out", "3-notes.md"), lineas.join("\n"));
    utimesSync(join(p, "out", "3-notes.md"), cuando, cuando);
  };
}

test("trampa: una nota sin su etiqueta", () => {
  const rojos = rojosDe(conNotas(["- A double bed. [in/photos/room-01.jpg]", "- It looks new. [probably]"]));
  assert.deepEqual(rojos, [
    "out/3-notes.md:1: la nota no acaba con su etiqueta: seen, deduced o assumed",
    "out/3-notes.md:2: la nota no acaba con su etiqueta: seen, deduced o assumed",
  ]);
});

test("trampa: una nota dice que lo vio y no dice dónde, o cita un archivo que no es de su material", () => {
  const rojos = rojosDe(
    conNotas([
      "- A double bed. [seen]",
      "- A large gym. [in/photos/hotel-09.jpg] [seen]",
      "- Great reviews everywhere. [https://example.com/hotel] [seen]",
      "- Two beds. [in/photos/room-01.jpg, in/sheet.json#room] [seen]",
      "- No photo shows a gym. [in/photos] [seen]",
      "- No video was given. [in/videos] [seen]",
    ]),
  );
  assert.deepEqual(rojos, [
    "out/3-notes.md:1: la nota dice que lo vio y no dice en qué archivo",
    "out/3-notes.md:2: la nota cita in/photos/hotel-09.jpg, que no es de su material",
    "out/3-notes.md:3: la nota cita https://example.com/hotel, que no es de su material",
    "out/3-notes.md:6: la nota cita in/videos, que no es de su material",
  ]);
});

test("trampa: las notas son un texto seguido, sin una sola nota con su forma", () => {
  const rojos = rojosDe(conNotas(["The room looks fine and the bathroom too."]));
  assert.deepEqual(rojos, ["out/3-notes.md: no hay ninguna nota con la forma del método"]);
});

test("trampa: un enlace a otro sitio dentro del puesto es un rojo, y la casa no lo sigue ni se rompe", () => {
  // Un enlace que da vueltas: el puesto dentro de sí mismo. Antes la puerta se rompía, y con ella toda la casa.
  assert.deepEqual(
    rojosDe((p) => symlinkSync("..", join(p, "in", "bucle"))),
    ["in/bucle: es un enlace a otro sitio: en un puesto no puede haber"],
  );
  // La entrega, hecha enlace a un archivo de fuera: la casa lo leería y lo devolvería al asiento en su vuelta.
  const fuera = mkdtempSync(join(tmpdir(), "el-dorado-fuera-"));
  try {
    writeFileSync(join(fuera, "secreto.json"), JSON.stringify({ seat: "seat-of-test", clave: "de fuera" }));
    const { puesto, sello } = puestoBueno();
    try {
      rmSync(join(puesto, "out", ENTREGA));
      symlinkSync(join(fuera, "secreto.json"), join(puesto, "out", ENTREGA));
      const v = puertaMetodo(puesto, sello);
      assert.equal(v.verde, false);
      assert.equal(v.entrega, null);
      assert.deepEqual(
        v.rojos.map((r) => r.donde),
        [`out/${ENTREGA}`],
      );
    } finally {
      rmSync(puesto, { recursive: true, force: true });
    }
  } finally {
    rmSync(fuera, { recursive: true, force: true });
  }
  // Y la carpeta de salida entera, hecha enlace.
  assert.deepEqual(
    rojosDe((p) => {
      rmSync(join(p, "out"), { recursive: true });
      symlinkSync(tmpdir(), join(p, "out"));
    }),
    ["out: es un enlace a otro sitio: en un puesto no puede haber"],
  );
});

test("trampa: un archivo de la salida que pesa más de lo que cabe no se abre", () => {
  const rojos = rojosDe((p) => writeFileSync(join(p, "out", "3-notes.md"), "a".repeat(PESO_MAXIMO.salida + 1)));
  assert.equal(rojos.length, 1);
  assert.match(rojos[0], /^out\/3-notes\.md: pesa \d+ bytes, y caben \d+$/);
});

test("un puesto que no existe o un sello roto no rompen la puerta: es un rojo", () => {
  const nada = puertaMetodo(join(tmpdir(), "el-dorado-no-existe"), { asiento: "x", archivos: {} });
  assert.equal(nada.verde, false);
  const { puesto } = puestoBueno();
  try {
    assert.equal(puertaMetodo(puesto, null as never).verde, false);
  } finally {
    rmSync(puesto, { recursive: true, force: true });
  }
});
