// Las pruebas del día a día: el contrato del que elige los sitios y el código dicen lo mismo, lo que elige se
// convierte en paradas, y la puerta 9 caza cada trampa, en lo que entrega el asiento y en los días que reparte el
// código.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { DIA_ENTERO, MINUTOS_DE_VISITA, RESERVAR, SALTO_MAXIMO } from "../../agent/data/dias.ts";
import { puertaDias, puertaSitios, type MaterialDeSitios, type Repartido } from "../../agent/gates/puerta_dias.ts";
import { numerosDe, pegasDelTexto } from "../../agent/gates/textos.ts";
import type { Foto } from "../../agent/output/viaje.ts";
import { paradasDe, sitiosParaElegir } from "../../agent/scripts/dias.ts";
import { MOMENTOS_DEL_DIA } from "../../agent/scripts/formas.ts";
import { fechasDe, repartir } from "../../agent/scripts/ritmo.ts";
import { ENTENDIDO, entregaDeSitios, SITIOS } from "../cases/inventado/investigacion.ts";

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "sights-picker");
const leer = (nombre: string): string => readFileSync(join(CONTRATO, nombre), "utf8");

const MATERIAL: MaterialDeSitios = { sitios: SITIOS.map((s) => s.id), noches: 3 };

type Entrega = Record<string, any>;
function rojosDe(cambia: (e: Entrega) => void): string[] {
  const entrega = entregaDeSitios() as Entrega;
  cambia(entrega);
  return puertaSitios(entrega, MATERIAL).rojos.map((r) => `${r.donde}: ${r.que}`);
}

test("el contrato nombra los minutos, las horas y lo de reservar que el código acepta", () => {
  const entrega = leer("DELIVERY.md");
  for (const valor of [...MINUTOS_DE_VISITA, ...MOMENTOS_DEL_DIA, ...RESERVAR])
    assert.ok(entrega.includes("`" + valor + "`"), String(valor));
});

test("las normas del que elige los sitios van de la DI1 a la DI7, y el contrato dice lo que no ve", () => {
  const codigos = [...leer("RULES.md").matchAll(/^- \*\*(DI\d+)\./gm)].map((m) => m[1]);
  assert.deepEqual(codigos, ["DI1", "DI2", "DI3", "DI4", "DI5", "DI6", "DI7"]);
  assert.match(leer("README.md"), /You do not see prices or lodgings/);
  assert.match(leer("README.md"), /You do not use the internet/);
});

test("al asiento se le dan los sitios más conocidos, con lo que dice su artículo", () => {
  const lugares = sitiosParaElegir(SITIOS, new Map([["Q1", "It guides ships into the bay."]]));
  assert.equal(lugares.length, 10);
  assert.match(lugares[0].about, /It guides ships into the bay\.$/);
  assert.equal(lugares[1].about, "church in an invented city");
});

test("un texto para el viajero no promete ni habla de dentro, y «el más barato» va con su «que encontramos»", () => {
  assert.deepEqual(pegasDelTexto("A doce minutos andando de la catedral."), []);
  assert.deepEqual(pegasDelTexto("Te va a encantar."), ["dice «Te va a encantar»: promete"]);
  assert.deepEqual(pegasDelTexto("Es el más barato. Sale 40 euros menos."), [
    "dice «el más barato» sin su «que encontramos»: promete",
  ]);
  assert.deepEqual(pegasDelTexto("Es el más barato que encontramos. Sale 40 euros menos."), []);
});

test("los números de un texto se leen como números, con sus miles y sus decimales", () => {
  assert.deepEqual(numerosDe("55 euros menos, a 12 minutos; total 1.234 euros."), [55, 12, 1234]);
  assert.deepEqual(numerosDe("It costs 1,234.50, or 318.07 for 3 nights"), [1234.5, 318.07, 3]);
  assert.deepEqual(numerosDe("Sale 318,07 euros"), [318.07]);
  assert.deepEqual(numerosDe("la fila r3 y el sitio Q12 no cuentan"), []);
});

test("lo que elige un asiento aplicado pasa la puerta", () => {
  assert.deepEqual(
    rojosDe(() => {}),
    [],
  );
});

test("trampa: un sitio que no está en los datos, uno con dos veredictos y uno sin ninguno", () => {
  assert.deepEqual(
    rojosDe((e) => (e.go[0].id = "Q404")),
    ["go[0]: elige Q404, que no está en los datos", "go: el sitio Q1 se queda sin veredicto"],
  );
  assert.deepEqual(
    rojosDe((e) => e.skip.push({ id: "Q1", why: "Ya está arriba." })),
    ["skip[3]: el sitio Q1 sale dos veces"],
  );
  assert.deepEqual(
    rojosDe((e) => e.skip.pop()),
    ["go: el sitio Q10 se queda sin veredicto"],
  );
});

test("trampa: un porqué en blanco, o que promete", () => {
  assert.deepEqual(
    rojosDe((e) => (e.go[1].why = " ")),
    ["go[1]: no dice por qué"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.go[1].why = "Sin duda, lo mejor de la ciudad.")),
    ["go[1]: dice «Sin duda»: da por seguro"],
  );
});

test("trampa: minutos suyos, una hora o un reservar que no son de su lista", () => {
  assert.deepEqual(
    rojosDe((e) => (e.go[2].minutes = 75)),
    ["go[2]: lo que lleva la visita no es de su lista"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.go[2].best_time = "at dawn")),
    ["go[2]: la hora que conviene no es de su lista"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.go[2].book_ahead = true)),
    ["go[2]: si hay que reservar no es de su lista"],
  );
});

test("trampa: todo es imprescindible, o no se elige nada", () => {
  assert.deepEqual(
    rojosDe((e) => e.go.forEach((x: Entrega) => (x.must = true))),
    ["go: marca 7 imprescindibles y el tope es 6"],
  );
  assert.deepEqual(
    rojosDe((e) => {
      e.skip.push(...e.go.map((x: Entrega) => ({ id: x.id, why: "No cabe." })));
      e.go = [];
    }),
    ["go: no elige ningún sitio: no hay viaje que repartir"],
  );
});

test("trampa: un campo de más o la entrega de otro asiento", () => {
  assert.deepEqual(
    rojosDe((e) => (e.days = [])),
    ["days: no es de la entrega"],
  );
  assert.deepEqual(
    rojosDe((e) => (e.seat = "route-planner")),
    ["seat: la entrega no es del asiento que elige los sitios"],
  );
});

const FOTOS = new Map<string, Foto>([
  ["Faro Inventado.jpg", { url: "https://fotos.invalid/faro.jpg", autor: "Ana", licencia: "CC BY 4.0", pagina: null }],
  [
    "Catedral Inventada.jpg",
    { url: "https://fotos.invalid/cat.jpg", autor: null, licencia: "CC BY 4.0", pagina: null },
  ],
]);

test("lo elegido se convierte en paradas, por su orden, con su fuente; una foto sin autor no se enseña", () => {
  const paradas = paradasDe(entregaDeSitios(), SITIOS, FOTOS);
  assert.deepEqual(
    paradas.map((p) => p.id),
    ["Q1", "Q2", "Q4", "Q5", "Q7", "Q8", "Q3"],
  );
  assert.equal(paradas[0].imprescindible, true);
  assert.equal(paradas[0].foto?.autor, "Ana");
  assert.equal(paradas[1].foto, null);
  assert.equal(paradas[0].origen.fuente, "inventada");
  assert.equal(paradas[0].origen.enlace, "https://www.wikidata.org/wiki/Q1");
  assert.equal(paradas[2].mejorHora, "morning");
  assert.equal(paradas[0].mejorHora, undefined);
  assert.equal(paradas[5].reservar, true);
  assert.equal(paradas[0].reservar, undefined);
});

function repartido(): Repartido {
  const paradas = paradasDe(entregaDeSitios(), SITIOS, FOTOS);
  const fechas = fechasDe(ENTENDIDO.dates.check_in, ENTENDIDO.dates.check_out);
  const { dias, fuera } = repartir(paradas, fechas, "normal", ENTENDIDO.destination.centre);
  return { paradas, dias, fuera, sitios: SITIOS.map((s) => s.id) };
}
const rojosDeLosDias = (cambia: (r: Repartido) => void): string[] => {
  const r = repartido();
  cambia(r);
  return puertaDias(r).rojos.map((x) => `${x.donde}: ${x.que}`);
};

test("los días que reparte el código con lo elegido pasan la puerta", () => {
  assert.deepEqual(
    rojosDeLosDias(() => {}),
    [],
  );
});

test("trampa: una parada que no está en los datos, o sin su fuente", () => {
  assert.deepEqual(
    rojosDeLosDias((r) => (r.sitios = r.sitios.filter((id) => id !== "Q2"))),
    ["paradas.Q2: no está en los datos"],
  );
  assert.deepEqual(
    rojosDeLosDias((r) => (r.paradas[0].origen.fuente = "")),
    ["paradas.Q1: no dice su fuente"],
  );
});

test("trampa: un salto entre dos paradas seguidas que pasa del tope", () => {
  const rojos = rojosDeLosDias((r) => {
    const dia = r.dias.find((d) => d.paradas.length > 1)!;
    dia.metros[0] = SALTO_MAXIMO + 10;
  });
  assert.equal(rojos.length, 1);
  assert.match(rojos[0], /de la parada 1 a la 2 hay 3510 m andando, y el tope es 3500/);
});

test("trampa: un día en el que no caben sus horas", () => {
  const rojos = rojosDeLosDias((r) => {
    const dia = [...r.dias].sort((a, b) => b.paradas.length - a.paradas.length)[0];
    for (const p of r.paradas) if (dia.paradas.includes(p.id)) p.minutos = 400;
  });
  assert.ok(rojos.some((x) => x.includes(`y caben ${DIA_ENTERO}`)));
});

test("trampa: una parada en dos días, o un imprescindible que se queda fuera", () => {
  assert.deepEqual(
    rojosDeLosDias((r) => {
      const [uno, otro] = r.dias.filter((d) => d.paradas.length > 0);
      otro.paradas.push(uno.paradas[0]);
      otro.metros.push(100);
    }).filter((x) => x.includes("ya está en otro día")).length,
    1,
  );
  const rojos = rojosDeLosDias((r) => {
    for (const d of r.dias) {
      const i = d.paradas.indexOf("Q1");
      if (i < 0) continue;
      d.paradas.splice(i, 1);
      d.metros.splice(Math.max(0, i - 1), 1);
    }
    r.fuera.push("Q1");
  });
  assert.deepEqual(rojos, ["paradas.Q1: es imprescindible y no está en ningún día"]);
});
