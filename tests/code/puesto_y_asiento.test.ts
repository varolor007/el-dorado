// Las pruebas de cómo se lanza un asiento: el puesto lleva solo lo suyo, queda sellado, y la casa recoge lo que
// entrega, pase lo que pase con el asiento. El asiento, aquí, es inventado: no gasta.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { ENTREGA, huella, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { lanzarAsiento, ordenDeApertura, recogerAsiento, type Lanzador } from "../../agent/launcher/asiento.ts";
import { leerSello, montarPuesto, puestosDe, type Pieza } from "../../agent/launcher/puesto.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const TEMPORAL = mkdtempSync(join(tmpdir(), "el-dorado-asiento-"));
after(() => rmSync(TEMPORAL, { recursive: true, force: true }));

// Unos contratos de prueba: el método común de verdad y un asiento inventado.
const CONTRATOS = join(TEMPORAL, "contracts");
cpSync(join(RAIZ, "agent", "contracts", "common"), join(CONTRATOS, "common"), { recursive: true });
mkdirSync(join(CONTRATOS, "seat-of-test"));
for (const nombre of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md"])
  writeFileSync(join(CONTRATOS, "seat-of-test", nombre), `# ${nombre} of the seat of the test`);

const PIEZAS: Pieza[] = [
  { ruta: "sheet.json", contenido: '{"room": "the room of the test"}' },
  { ruta: "photos/room-01.jpg", contenido: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) },
];

let cuenta = 0;
const nuevoRun = (): string => join(TEMPORAL, `run-${++cuenta}`);
const monta = (run: string, id = "a1", piezas = PIEZAS) =>
  montarPuesto(run, id, "seat-of-test", piezas, { contratos: CONTRATOS });

/** Un asiento inventado que sigue el método. */
const aplicado: Lanzador = async (_orden, p) => {
  const textos: Record<string, string> = {
    "1-acknowledgement.md": "I received sheet.json and the folder photos.",
    "2-plan.md": "I will read the sheet and look at the photo.",
    "3-notes.md": "- The sheet names the room. [in/sheet.json] [seen]",
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify({ seat: "seat-of-test", room: "the room of the test" }),
  };
  for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(p.carpeta, "out", nombre), textos[nombre]);
};

test("el puesto lleva el contrato, el material y una salida vacía, y nada más", () => {
  const p = monta(nuevoRun());
  assert.deepEqual(readdirSync(p.carpeta).sort(), ["contract", "in", "out"]);
  assert.deepEqual(readdirSync(join(p.carpeta, "contract")).sort(), ["README.md", "common", "seat"]);
  assert.deepEqual(readdirSync(join(p.carpeta, "contract", "common")).sort(), [
    "DELIVERY.md",
    "METHOD.md",
    "README.md",
    "RULES.md",
  ]);
  assert.deepEqual(readdirSync(join(p.carpeta, "contract", "seat")).sort(), [
    "DELIVERY.md",
    "GUIDE.md",
    "README.md",
    "RULES.md",
  ]);
  assert.equal(readFileSync(join(p.carpeta, "in", "sheet.json"), "utf8"), '{"room": "the room of the test"}');
  assert.equal(readFileSync(join(p.carpeta, "in", "photos", "room-01.jpg")).length, 4);
  assert.deepEqual(readdirSync(join(p.carpeta, "out")), []);
});

test("el orden de lectura del puesto nombra archivos que están en el puesto", () => {
  const p = monta(nuevoRun());
  const orden = readFileSync(join(p.carpeta, "contract", "README.md"), "utf8");
  const nombrados = [...orden.matchAll(/`(contract\/[a-z]+\/[A-Z]+\.md)`/g)].map((m) => m[1]);
  assert.equal(nombrados.length, 7);
  for (const archivo of nombrados) assert.ok(existsSync(join(p.carpeta, archivo)), `falta ${archivo}`);
});

test("el sello queda fuera del puesto y apunta la huella de todo lo que dio la casa", () => {
  const run = nuevoRun();
  const p = monta(run);
  assert.equal(p.sello, join(run, "sellos", "a1.json"));
  const sello = leerSello(p);
  assert.equal(sello.asiento, "seat-of-test");
  assert.deepEqual(sello.archivos, huella(p.carpeta));
  assert.ok(Object.keys(sello.archivos).includes("in/photos/room-01.jpg"));
  assert.deepEqual(
    puestosDe(run).map((x) => x.id),
    ["a1"],
  );
});

test("una pieza se puede copiar de un archivo, como las fotos ya bajadas", () => {
  const foto = join(TEMPORAL, "foto-bajada.jpg");
  writeFileSync(foto, "una foto inventada");
  const p = monta(nuevoRun(), "a1", [{ ruta: "photos/hotel-01.jpg", copiaDe: foto }]);
  assert.equal(readFileSync(join(p.carpeta, "in", "photos", "hotel-01.jpg"), "utf8"), "una foto inventada");
});

test("trampa: una pieza que se sale del material no se monta", () => {
  for (const ruta of ["../fuera.txt", "/etc/fuera.txt", "photos/../../fuera.txt", "photos\\fuera.txt", ""]) {
    assert.throws(() => monta(nuevoRun(), "a1", [{ ruta, contenido: "x" }]), /se sale del material/);
  }
});

test("trampa: ni un puesto dentro del repositorio, ni un nombre raro, ni un asiento sin contrato, ni dos veces", () => {
  assert.throws(() => monta(join(RAIZ, "puestos-de-prueba")), /dentro del repositorio/);
  assert.throws(() => monta(nuevoRun(), "../a1"), /no vale/);
  assert.throws(() => montarPuesto(nuevoRun(), "a1", "no-such-seat", [], { contratos: CONTRATOS }), /no hay contrato/);
  assert.throws(() => montarPuesto(nuevoRun(), "a1", "common", [], { contratos: CONTRATOS }), /no hay contrato/);
  const run = nuevoRun();
  monta(run);
  assert.throws(() => monta(run), /ya existe/);
});

test("la orden que abre el asiento lleva la carpeta de su puesto y nada por rellenar", () => {
  const p = monta(nuevoRun());
  const orden = ordenDeApertura(p);
  assert.ok(orden.includes(`${p.carpeta}/contract/README.md`));
  assert.ok(orden.includes(`${p.carpeta}/out/`));
  assert.ok(!orden.includes("{WORKPLACE}"));
  assert.ok(!orden.includes("The order that opens a seat"));
});

test("un asiento que sigue el método se recoge en verde, con su entrega", async () => {
  const r = await lanzarAsiento(monta(nuevoRun()), aplicado, { segundos: 5 });
  assert.equal(r.error, null);
  assert.equal(r.fueraDeTope, false);
  assert.deepEqual(r.metodo.rojos, []);
  assert.deepEqual(r.metodo.entrega, { seat: "seat-of-test", room: "the room of the test" });
});

test("trampa: el asiento se rompe a medias, y la casa lo recoge en rojo, sin romperse ella", async () => {
  const roto: Lanzador = async (_orden, p) => {
    writeFileSync(join(p.carpeta, "out", "1-acknowledgement.md"), "I received sheet.json and photos.");
    throw new Error("se cayó la conexión");
  };
  const r = await lanzarAsiento(monta(nuevoRun()), roto, { segundos: 5 });
  assert.equal(r.error, "se cayó la conexión");
  assert.equal(r.metodo.verde, false);
  assert.equal(r.metodo.entrega, null);
  assert.ok(r.metodo.rojos.some((x) => x.donde === "out/delivery.json"));
});

test("trampa: el asiento no acaba en su tope", async () => {
  let reloj: NodeJS.Timeout | undefined;
  const lento: Lanzador = () => new Promise((resuelve) => (reloj = setTimeout(resuelve, 2000)));
  const r = await lanzarAsiento(monta(nuevoRun()), lento, { segundos: 0.05 });
  clearTimeout(reloj);
  assert.equal(r.fueraDeTope, true);
  assert.match(r.error ?? "", /no acabó en su tope/);
  assert.equal(r.metodo.verde, false);
});

test("trampa: el asiento toca su material, y la puerta de todos lo ve con el sello", async () => {
  const tramposo: Lanzador = async (orden, p) => {
    await aplicado(orden, p);
    writeFileSync(join(p.carpeta, "in", "sheet.json"), '{"room": "a suite"}');
  };
  const r = await lanzarAsiento(monta(nuevoRun()), tramposo, { segundos: 5 });
  assert.deepEqual(
    r.metodo.rojos.map((x) => `${x.donde}: ${x.que}`),
    ["in/sheet.json: la casa lo dio y se ha cambiado"],
  );
});

test("trampa: un puesto no se lanza dos veces", async () => {
  const p = monta(nuevoRun());
  await lanzarAsiento(p, aplicado, { segundos: 5 });
  await assert.rejects(() => lanzarAsiento(p, aplicado, { segundos: 5 }), /ya se usó/);
  assert.equal(recogerAsiento(p).verde, true);
});
