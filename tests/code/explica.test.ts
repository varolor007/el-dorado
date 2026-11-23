// Las pruebas del asiento que explica: su contrato, lo que el código le prepara y la puerta 7, con sus trampas.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { AVISOS } from "../../agent/data/palabras.ts";
import { hayAlgoSinSaber, puertaExplica, type MaterialDeExplicar } from "../../agent/gates/puerta_explica.ts";
import { paraExplicar } from "../../agent/scripts/explica.ts";
import { resolverZonas } from "../../agent/scripts/ruta.ts";
import { montarTabla } from "../../agent/scripts/tabla.ts";
import { ESTANCIA } from "../cases/inventado/inventado.ts";
import {
  ENTENDIDO,
  entregaDeCruce,
  entregaDeExplicar,
  entregaDeRuta,
  LUGARES,
  piezasDeLaTabla,
} from "../cases/inventado/investigacion.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "trip-explainer");
const leer = (nombre: string): string => readFileSync(join(CONTRATO, nombre), "utf8");

const PIEZAS = await piezasDeLaTabla();
const TABLA = montarTabla(PIEZAS);
const CRUCE = entregaDeCruce(TABLA);
const FECHAS = { entrada: ESTANCIA.entrada, salida: ESTANCIA.salida };
const DADO = paraExplicar(TABLA, CRUCE, PIEZAS.mirados, resolverZonas(entregaDeRuta(), LUGARES), FECHAS);
const AVISOS_DEL_VIAJE = [AVISOS.es.ia, AVISOS.es.precios];
const MATERIAL: MaterialDeExplicar = { viaje: ENTENDIDO, dado: DADO, avisos: AVISOS_DEL_VIAJE };

type Entrega = Record<string, any>;
function rojosDe(cambia: (e: Entrega) => void, material: MaterialDeExplicar = MATERIAL): string[] {
  const entrega = entregaDeExplicar(material.dado) as Entrega;
  cambia(entrega);
  return puertaExplica(entrega, material).rojos.map((r) => `${r.donde}: ${r.que}`);
}

test("las normas del que explica van de la EX1 a la EX6, y el contrato dice que no decide ni hace cuentas", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(EX\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(codigos, ["EX1", "EX2", "EX3", "EX4", "EX5", "EX6"]);
  assert.match(leer("README.md"), /You do not decide anything and you do not calculate anything/);
  for (const id of ["cheapest", "best_value", "different"]) assert.ok(leer("DELIVERY.md").includes("`" + id + "`"));
});

test("al que explica se le dan las maneras con las diferencias frente a la más barata ya hechas", () => {
  const [barata, , distinta] = DADO.ways.ways;
  assert.deepEqual(
    DADO.ways.ways.map((w) => w.id),
    ["cheapest", "best_value", "different"],
  );
  assert.deepEqual(barata.versus_cheapest, { costs_more: 0, walk_minutes_less: 0, score_higher: 0 });
  assert.equal(distinta.versus_cheapest.costs_more, distinta.total - barata.total);
  assert.equal(
    distinta.versus_cheapest.walk_minutes_less,
    (barata.walk_minutes as number) - (distinta.walk_minutes as number),
  );
  assert.equal(distinta.lever, "other_zone");
  assert.equal(distinta.zone_name, "El puerto");
  assert.equal(barata.is_like.gym.level, "maintenance");
  assert.equal(DADO.ways.nights, 3);
});

test("a unas fechas nuevas se les pone su día de la semana, y las de ahora al lado", () => {
  const unDiaAntes = DADO.levers.find((l) => l.change.days_moved === -1)!;
  assert.equal(unDiaAntes.saves, 81);
  assert.equal(unDiaAntes.change.check_in_weekday, "thursday");
  assert.equal(unDiaAntes.change.check_out_weekday, "sunday");
  assert.equal(unDiaAntes.change.now_check_in_weekday, "friday");
  assert.equal(unDiaAntes.chosen_because, "a real saving for the same trip");
});

test("lo que escribe un asiento aplicado pasa la puerta", () => {
  assert.deepEqual(
    rojosDe(() => {}),
    [],
  );
});

test("trampa: un número que no está en lo que se le dio", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways[0].gains = "Sale por unos 370 euros.")),
    ["ways[0].gains: dice 370, que no está en lo que se le dio"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.levers[0].in_exchange = "Sales el 4 de marzo y vuelves el 7.")),
    [],
  );
});

test("trampa: una promesa, «el más barato» a secas, o una palabra de dentro", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways[1].why = "Te va a encantar.")),
    ["ways[1].why: dice «Te va a encantar»: promete"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways[0].why = "Es el más barato.")),
    ["ways[0].why: dice «el más barato» sin su «que encontramos»: promete"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways[1].why = "Sale de la fila r5 de la tabla.")),
    ["ways[1].why: dice «fila r5»: cita una fila de la tabla"],
  );
});

test("trampa: una manera sin lo que pierde, una que falta o una que no se le dio", () => {
  assert.deepEqual(
    rojosDe((e) => (e.ways[1].loses = "")),
    ["ways[1].loses: está en blanco"],
  );
  assert.deepEqual(
    rojosDe((e) => e.ways.pop()),
    ["ways: falta la manera different"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.ways[2].id = "luxury")),
    ["ways[2]: luxury no es una manera de las que se le dieron", "ways: falta la manera different"],
  );
});

test("trampa: una palanca que falta, o una que nadie eligió contar", () => {
  assert.deepEqual(
    rojosDe((e) => e.levers.pop()),
    [`levers: falta la palanca ${DADO.levers[DADO.levers.length - 1].lever_row}`],
  );
  assert.deepEqual(
    rojosDe((e) => e.levers.push({ lever_row: "l1", what: "Otro hotel.", in_exchange: "Nada." })),
    [`levers[${DADO.levers.length}]: l1 no es una palanca de las dadas`],
  );
});

test("lo que no se sabe hay que decírselo al viajero", () => {
  assert.equal(hayAlgoSinSaber(DADO), true);
  assert.deepEqual(
    rojosDe((e) => (e.unknowns = [])),
    ["unknowns: hay cosas sin confirmar y no se le dicen al viajero"],
  );
  const todoSabido = structuredClone(MATERIAL);
  todoSabido.dado.checks = [];
  assert.equal(hayAlgoSinSaber(todoSabido.dado), false);
  assert.deepEqual(
    rojosDe((e) => (e.unknowns = []), todoSabido),
    [],
  );
});

test("trampa: en otro idioma, o sin los avisos de siempre", () => {
  assert.deepEqual(
    rojosDe((e) => (e.language = "en")),
    ["language: no escribe en el idioma del viajero: es"],
  );
  assert.deepEqual(
    rojosDe(() => {}, { ...MATERIAL, avisos: [AVISOS.es.ia] }),
    ["avisos: falta el aviso de que los precios son orientativos"],
  );
  assert.deepEqual(
    rojosDe(() => {}, { ...MATERIAL, avisos: [] }),
    ["avisos: falta el aviso de que está hecho con IA", "avisos: falta el aviso de que los precios son orientativos"],
  );
});
