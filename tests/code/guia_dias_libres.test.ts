// La guía de un viaje con días libres (12.1 y 12.2): el ritmo deja sin paradas el día que se llega y el que se va, y
// la guía sale igual. El material dice que el día es libre, el contrato dice qué se escribe de él, la puerta 10 no le
// deja meter ninguna parada y el cuaderno lo pinta sin croquis. Con el viaje inventado y un asiento de mentira.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { puertaGuia, type MaterialDeLaGuia } from "../../agent/gates/puerta_guia.ts";
import {
  carpetaDeLaGuia,
  documentoDeLaGuia,
  llevarLaGuia,
  materialDeLaGuia,
  pedirGuia,
} from "../../agent/launcher/guia.ts";
import { comprobarViaje } from "../../agent/output/viaje.ts";
import { JPEG, type Objeto } from "../cases/inventado/asientos.ts";
import {
  entregaDeLaGuia,
  HOY,
  lanzadorDeLaGuia,
  viajeCerradoEnLaMesa,
  viajeConDiasLibres,
} from "../cases/inventado/guia.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "guide-writer");

function conMaterial(prueba: (m: MaterialDeLaGuia) => void): void {
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje: viajeConDiasLibres() });
  try {
    prueba(materialDeLaGuia(v, pedirGuia(v, { manera: "best_value", hoy: HOY })));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

const rojosDe = (entrega: Objeto, m: MaterialDeLaGuia): string[] =>
  puertaGuia(entrega, m).rojos.map((r) => `${r.donde}: ${r.que}`);

test("el viaje con el primer y el último día libres es un viaje que vale", () => {
  assert.deepEqual(comprobarViaje(viajeConDiasLibres()), []);
});

test("el material dice qué día es libre: sin paradas, sin tramos y sin título que copiar", () => {
  conMaterial(({ dado }) => {
    assert.deepEqual(
      dado.days.map((d) => [d.free, d.title, d.stops.length, d.legs.length]),
      [
        [true, "unknown", 0, 0],
        [false, "El centro", 3, 3],
        [true, "unknown", 0, 0],
      ],
    );
  });
});

test("el contrato dice qué se escribe de un día libre, sin inventarle paradas ni sitios", () => {
  const todo = ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md"]
    .map((n) => readFileSync(join(CONTRATO, n), "utf8"))
    .join("\n");
  assert.match(todo, /`free`/);
  assert.match(todo, /GW10\. A free day stays free/);
  assert.match(todo, /no stop of the trip, not even one of another day/);
});

test("la guía de un viaje con el primer y el último día libres sale, y el cuaderno los pinta sin croquis", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje: viajeConDiasLibres() });
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    const e = await llevarLaGuia(v, p.n, lanzadorDeLaGuia(), {
      hoy: () => HOY,
      traer: async () => JPEG,
      encoger: async (b) => b,
    });
    assert.deepEqual(e, { estado: "ready" });
    const cuaderno = JSON.parse(readFileSync(join(carpetaDeLaGuia(v, p.n), "guia.json"), "utf8"));
    assert.deepEqual(
      cuaderno.dias.map((d: { libre?: boolean; paradas: unknown[] }) => [d.libre ?? false, d.paradas.length]),
      [
        [true, 0],
        [false, 3],
        [true, 0],
      ],
    );
    const html = documentoDeLaGuia(v) ?? "";
    // Dos croquis: el del vistazo y el del día con paradas. Los días libres, sin croquis y dichos como tales.
    assert.equal(html.match(/<svg class="croquis"/g)?.length, 2);
    assert.equal(html.match(/Este día no tiene paradas: es tuyo, para llevarlo a tu aire\./g)?.length, 2);
    assert.equal(html.match(/Día libre/g)?.length, 4);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("trampa: una guía que le mete una parada a un día libre no pasa la puerta 10", () => {
  conMaterial((m) => {
    assert.deepEqual(rojosDe(entregaDeLaGuia(m.dado), m), []);
    // En su lista de paradas, aunque la parada sea del viaje.
    const conParada = entregaDeLaGuia(m.dado) as { days: Objeto[] };
    conParada.days[0].stops = [{ id: "p1", what: "Una torre.", why: "Porque sí.", when: "Por la mañana." }];
    assert.ok(rojosDe(conParada, m).some((r) => /days\[0\]\.stops: es un día libre: no lleva paradas/.test(r)));
    // Con un tramo.
    const conTramo = entregaDeLaGuia(m.dado) as { days: Objeto[] };
    conTramo.days[2].legs = [{ from: "stay", to: "p1", says: "Un paseo." }];
    assert.ok(rojosDe(conTramo, m).some((r) => /days\[2\]\.legs: es un día libre: no lleva tramos/.test(r)));
    // En lo que cuenta: una parada de otro día, para llenarlo.
    const enElTexto = entregaDeLaGuia(m.dado) as { days: Objeto[] };
    enElTexto.days[2].intro = "Antes de irte, vuelve a la Torre Inventada.";
    assert.ok(rojosDe(enElTexto, m).some((r) => /days\[2\]\.intro: es un día libre, y le pone una parada/.test(r)));
    // Y un sitio conocido que no es del viaje, como en cualquier día.
    const conOtro = entregaDeLaGuia(m.dado) as { days: Objeto[] };
    conOtro.days[0].title = "El Palacio Olvidado";
    assert.ok(rojosDe(conOtro, m).some((r) => /days\[0\]\.title: nombra «Palacio Olvidado»/.test(r)));
    // En blanco, como copiaba el asiento de mentira, tampoco.
    const enBlanco = entregaDeLaGuia(m.dado) as { days: Objeto[] };
    enBlanco.days[0].title = "";
    assert.ok(rojosDe(enBlanco, m).some((r) => /days\[0\]\.title: está en blanco/.test(r)));
  });
});
