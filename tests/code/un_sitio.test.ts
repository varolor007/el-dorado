// Un viaje que pide varias bases se para, y la salida tiene que ser clara (el PM, 26-nov, en su ensayo con Indonesia:
// «no me deja cambiar dónde dormir; todo tiene que ser súper intuitivo»). La parada dice qué sitios pedía, ofrece
// dormir en un solo sitio con un toque, y el de la ruta lo respeta. Sin IA y sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CAMBIOS } from "../../agent/data/momentos.ts";
import { puertaRuta, type MaterialDeRuta } from "../../agent/gates/puerta_ruta.ts";
import { paradaDeCara } from "../../agent/launcher/acta.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { clasesDelCambio } from "../../agent/scripts/impacto.ts";
import { IDIOMAS, TEXTOS } from "../../web/src/lib/textos.ts";
import { ENTENDIDO, entregaDeRuta, LUGARES } from "../cases/inventado/investigacion.ts";

type Entrega = Record<string, any>;

const deUnPais = (several: boolean | null, leave: boolean | null = false): Entendido => ({
  ...(ENTENDIDO as Entendido),
  destination: { ...(ENTENDIDO as Entendido).destination, kind: "country" },
  moving: { several_places: several, leave_country: leave, how_much: null },
});

/** La ruta del caso inventado, con dos bases. */
function conDosBases(): Entrega {
  const e = entregaDeRuta() as Entrega;
  e.shape = "route";
  e.bases[0].nights = 2;
  e.bases.push({
    id: "b2",
    name: "Otro Pueblo Inventado",
    nights: 2,
    why: "the castle is there",
    zones: [{ id: "z3", name: "El castillo", anchors: ["Q8"], radius_m: 800, near: ["Q8"], why: "by the castle" }],
  });
  e.transfers = [{ from: "b1", to: "b2", minutes: 95, by: "train", source: "t1" }];
  e.exit.base = "b2";
  return e;
}

const material = (viaje: Entendido): MaterialDeRuta => ({
  viaje,
  noches: 4,
  lugares: LUGARES,
  traslados: [{ ref: "t1", minutes: 95 }],
});
const unSitio = (r: { donde: string; que: string }): boolean => r.donde === "shape" && /un solo sitio/.test(r.que);

test("si el viajero dijo que no quiere ver más de un sitio, la puerta 3 no deja pasar una ruta de varias bases", () => {
  assert.ok(puertaRuta(conDosBases(), material(deUnPais(false))).rojos.some(unSitio));
  // Si quiere varios, o no lo dijo, una ruta vale: un «no lo dijo» no es un no.
  assert.ok(!puertaRuta(conDosBases(), material(deUnPais(true))).rojos.some(unSitio));
  assert.ok(!puertaRuta(conDosBases(), material(deUnPais(null))).rojos.some(unSitio));
  // Una base, con lo que quiere un solo sitio, pasa.
  const una = entregaDeRuta() as Entrega;
  assert.ok(!puertaRuta(una, { ...material(deUnPais(false)), noches: 3 }).rojos.some(unSitio));
  // El contrato del de la ruta lo dice.
  const guia = readFileSync("agent/contracts/route-planner/GUIDE.md", "utf8");
  assert.match(guia, /several_places` *\n?is `false`/);
});

test("dormir en un solo sitio rehace la ruta y lo de después, no los sitios ni los papeles; salir del país, sí", () => {
  assert.deepEqual(clasesDelCambio(deUnPais(true), deUnPais(false)), ["moving"]);
  assert.ok(!CAMBIOS.moving.pasos.includes("sights"));
  assert.ok(!CAMBIOS.moving.pasos.includes("papers"));
  assert.ok(CAMBIOS.moving.pasos.includes("route"));
  // Salir o no del país cambia qué sitios entran (solo los del país): eso es como otro destino.
  assert.deepEqual(clasesDelCambio(deUnPais(true, false), deUnPais(true, true)), ["destination"]);
});

test("la parada por varias bases dice cuáles eran, en su orden, para ofrecer dormir en un solo sitio", () => {
  const run = mkdtempSync(join(tmpdir(), "un-sitio-"));
  try {
    const rojo = { donde: "bases", que: "este viaje pide 3 bases: aún no puede planearlo" };
    writeFileSync(join(run, "parado.json"), JSON.stringify({ en: "route", paso: "la ruta", rojos: [rojo] }));
    const bases = [{ name: "Borobudur" }, { name: "Monte Bromo" }, { name: "Lombok" }, { sin: "nombre" }];
    writeFileSync(join(run, "ruta.json"), JSON.stringify({ entrega: { bases } }));
    const parada = paradaDeCara(run);
    assert.equal(parada?.kind, "not_possible_yet");
    assert.deepEqual(parada?.bases, ["Borobudur", "Monte Bromo", "Lombok"]);
    // Otra parada no lleva bases.
    writeFileSync(
      join(run, "parado.json"),
      JSON.stringify({ en: "sights", paso: "x", rojos: [{ donde: "sitios", que: "x" }] }),
    );
    assert.equal(paradaDeCara(run)?.bases, null);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("en la web: la parada lo dice en claro y lleva a cambiar con un solo sitio ya marcado", () => {
  for (const idioma of IDIOMAS) {
    const t = TEXTOS[idioma];
    assert.match(t.casa.variasBases(3, "A, B y C"), /3/, idioma);
    assert.ok(t.casa.salidas.one_place.length > 0, idioma);
    assert.ok(t.cambios.unSitio.length > 0, idioma);
    assert.ok(t.momentos.cambios.moving.length > 0, idioma);
  }
  assert.match(readFileSync("web/src/piezas/EnCasa.tsx", "utf8"), /at=change&one_place=1/);
  assert.match(readFileSync("web/src/piezas/Cambios.tsx", "utf8"), /get\("one_place"\) !== "1"/);
});
