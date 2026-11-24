// Las pruebas de las cribas: lo que descarta, lo que se suma, la nota con sus pesos y el cruce con los gustos. Con
// el caso inventado y sin internet.

import assert from "node:assert/strict";
import { test } from "node:test";
import { NOTA_MINIMA } from "../../agent/data/cribas.ts";
import { buscarAlojamiento, type Ficha } from "../../agent/scripts/busqueda_alojamiento.ts";
import {
  cribar,
  imprescindiblesSinSaber,
  laMasBarata,
  laMejorPorLoQueCuesta,
  motivoDeDescarte,
  notaDe,
  quejasSinConfirmar,
  type Candidato,
  type Contexto,
} from "../../agent/scripts/cribas.ts";
import type { Gusto } from "../../agent/scripts/formas.ts";
import { ESTANCIA, fuenteInventada, MINIMOS } from "../cases/inventado/inventado.ts";
import { ENTENDIDO, miradoInventado, SITIOS } from "../cases/inventado/investigacion.ts";

const BUSQUEDA = await buscarAlojamiento(fuenteInventada(), ESTANCIA, MINIMOS);
const ficha = (id: string): Ficha => {
  const f = BUSQUEDA.finalistas.find((x) => x.alojamiento.id === id);
  if (f === undefined) throw new Error(`${id} no es finalista`);
  return structuredClone(f);
};
const candidato = (id: string, niveles: Record<string, string> = {}): Candidato => ({
  ficha: ficha(id),
  mirado: miradoInventado(id, niveles),
});
const PARADAS = SITIOS.slice(0, 4).map((s) => s.punto);
const CTX: Contexto = { gustos: ENTENDIDO.tastes, paradas: PARADAS };
const gusto = (thing: string, weight: Gusto["weight"]): Gusto => ({ thing, weight, quote: "con sus palabras" });

test("criba 1: lo imprescindible descarta si el nivel no lo cumple, y dice cuál y por qué", () => {
  assert.equal(
    motivoDeDescarte(candidato("a1", { gym: "token" }), CTX),
    "missing something the traveller marked as a must: gym (token)",
  );
  assert.equal(motivoDeDescarte(candidato("a1", { gym: "maintenance" }), CTX), null);
  assert.equal(motivoDeDescarte(candidato("a1", { gym: "full" }), CTX), null);
});

test("criba 1: lo que solo te gusta no descarta, y lo que no se sabe tampoco: se dice sin confirmar", () => {
  const sinVistas = candidato("a1", { gym: "full", view: "inner_or_wall" });
  assert.equal(motivoDeDescarte(sinVistas, CTX), null);
  const sinSaber = candidato("a1", { gym: "unknown" });
  assert.equal(motivoDeDescarte(sinSaber, CTX), null);
  assert.deepEqual(imprescindiblesSinSaber(sinSaber, CTX), ["gym"]);
  assert.deepEqual(imprescindiblesSinSaber({ ficha: ficha("a1"), mirado: null }, CTX), ["gym"]);
  assert.deepEqual(imprescindiblesSinSaber(candidato("a1", { gym: "full" }), CTX), []);
});

test("criba 1: una queja grave descarta si la confirma el que mira en más de una opinión; por palabras, no", () => {
  const c = candidato("a2", { gym: "full" });
  const chinche = { fecha: "2026-12-02", nota: 2, viajero: null, bueno: "", malo: "Bed bugs in the room", de: "x" };
  const negada = { ...chinche, malo: "", bueno: "No bed bugs, no mould: spotless" };
  // Tres opiniones con la palabra no descartan: el código no sabe si pasó, ni si el huésped cuenta que no pasó.
  c.ficha.opiniones = [chinche, chinche, negada];
  c.mirado!.serious = [];
  assert.equal(motivoDeDescarte(c, CTX), null);
  // Una sola opinión que lo cuenta, confirmada por el que mira, se dice y no descarta.
  c.mirado!.serious = [{ kind: "pests", mentions: "one", refs: ["r1"] }];
  assert.equal(motivoDeDescarte(c, CTX), null);
  // En más de una, sí.
  c.mirado!.serious = [{ kind: "pests", mentions: "a_few", refs: ["r1", "r2"] }];
  assert.deepEqual(cribar([c], CTX)[0].descarte, { clase: "serious_complaints", cosa: "pests", detalle: "a_few" });
  assert.match(motivoDeDescarte(c, CTX) ?? "", /the viewer confirmed in more than one review: pests \(a_few\)/);
  // Una clase que no es de la lista no descarta, la escriba quien la escriba.
  c.mirado!.serious = [{ kind: "ugly curtains", mentions: "several", refs: ["r1"] }];
  assert.equal(motivoDeDescarte(c, CTX), null);
});

test("una queja grave que nadie ha confirmado se dice sin confirmar: ni se calla ni descarta", () => {
  const chinche = { fecha: "2026-12-02", nota: 2, viajero: null, bueno: "", malo: "Bed bugs in the room", de: "x" };
  const sinMirar: Candidato = { ficha: ficha("a2"), mirado: null };
  sinMirar.ficha.opiniones = [chinche, chinche, chinche];
  assert.deepEqual(quejasSinConfirmar(sinMirar), ["pests"]);
  assert.equal(motivoDeDescarte(sinMirar, CTX), null);
  // Con menos opiniones señaladas no se dice nada, y si el que mira ya dio su veredicto, manda el suyo.
  sinMirar.ficha.opiniones = [chinche];
  assert.deepEqual(quejasSinConfirmar(sinMirar), []);
  const mirado = candidato("a2", { gym: "full" });
  mirado.ficha.opiniones = [chinche, chinche, chinche];
  mirado.mirado!.serious = [];
  assert.deepEqual(quejasSinConfirmar(mirado), []);
});

test("criba 2: lo que se compara es el total con lo que se paga aparte", () => {
  const [a1] = cribar([candidato("a1", { gym: "full" })], CTX);
  assert.equal(a1.total, 186);
});

test("criba 3: la nota sale de sus partes, con sus pesos, y lo que no tiene dato no cuenta y se dice", () => {
  const c = candidato("a2", { gym: "full" });
  const [fila] = cribar([c], CTX);
  const n = fila.nota;
  assert.ok(n.nota !== null && n.nota > 0 && n.nota <= 10);
  assert.deepEqual(n.sinConfirmar, ["encaje"]);
  assert.equal(n.partes.encaje, null);
  assert.equal(n.partes.condiciones, 10);
  // La media ponderada de las partes con dato, a mano: 0,3 la zona, 0,3 cómo es, 0,2 las opiniones y 0,1 lo demás.
  const p = n.partes;
  const esperada = (p.zona! * 0.3 + p.comoEs! * 0.3 + p.opiniones! * 0.2 + p.condiciones! * 0.1) / 0.9;
  assert.equal(n.nota, Math.round(esperada * 10) / 10);
});

test("criba 3: sin sitios a los que ir no hay nota de zona, y sin ficha de cómo es, tampoco esa parte", () => {
  const n = notaDe({ ficha: ficha("a2"), mirado: null }, { gustos: [], paradas: [] }, null);
  assert.deepEqual(n.sinConfirmar, ["zona", "comoEs", "encaje"]);
  assert.ok(n.nota !== null);
});

test("criba 3: estar más cerca de lo que se va a ver sube la nota", () => {
  const cerca = candidato("a2", { gym: "full" });
  const lejos = candidato("a2", { gym: "full" });
  lejos.ficha.alojamiento.lat += 0.02;
  const [a, b] = cribar([cerca, lejos], CTX);
  assert.ok(a.minutosAndando! < b.minutosAndando!);
  assert.ok(a.nota.partes.zona! > b.nota.partes.zona!);
  assert.ok(a.nota.nota! > b.nota.nota!);
});

test("los gustos: lo que te gusta pesa más en la nota, y lo que te da igual no pesa", () => {
  const conVistas = candidato("a2", { view: "open" });
  const sinVistas = candidato("a2", { view: "inner_or_wall" });
  const leGusta: Contexto = { gustos: [gusto("views", "like")], paradas: PARADAS };
  const leDaIgual: Contexto = { gustos: [gusto("views", "indifferent")], paradas: PARADAS };
  const nada: Contexto = { gustos: [], paradas: PARADAS };
  const salto = (ctx: Contexto): number =>
    notaDe(conVistas, ctx, 10).partes.comoEs! - notaDe(sinVistas, ctx, 10).partes.comoEs!;
  assert.ok(salto(leGusta) > salto(nada));
  assert.equal(salto(leDaIgual), 0);
});

test("los gustos: que no haya piscina solo resta si la quieres", () => {
  const sin = candidato("a2", { pool: "none" });
  const con = candidato("a2", { pool: "swim" });
  const nada: Contexto = { gustos: [], paradas: PARADAS };
  const laQuiere: Contexto = { gustos: [gusto("pool", "like")], paradas: PARADAS };
  assert.equal(notaDe(sin, nada, 10).partes.comoEs, notaDe(con, nada, 10).partes.comoEs);
  assert.ok(notaDe(sin, laQuiere, 10).partes.comoEs! < notaDe(con, laQuiere, 10).partes.comoEs!);
});

test("las opiniones se corrigen: la misma nota con pocas opiniones vale menos", () => {
  const muchas = candidato("a2");
  const pocas = candidato("a2");
  muchas.ficha.alojamiento = { ...muchas.ficha.alojamiento, nota: 9.4, opiniones: 3000 };
  pocas.ficha.alojamiento = { ...pocas.ficha.alojamiento, nota: 9.4, opiniones: 20 };
  const ctx: Contexto = { gustos: [], paradas: [] };
  assert.ok(notaDe(muchas, ctx, null).partes.opiniones! > notaDe(pocas, ctx, null).partes.opiniones!);
});

test("la misma entrada da siempre las mismas cribas", () => {
  const candidatos = ["a1", "a2", "a4"].map((id) => candidato(id, { gym: "full" }));
  assert.deepEqual(cribar(candidatos, CTX), cribar(structuredClone(candidatos), CTX));
});

const FILAS = [
  { id: "barata-mala", total: 150, nota: NOTA_MINIMA - 0.5 },
  { id: "barata", total: 200, nota: 6 },
  { id: "media", total: 240, nota: 8 },
  { id: "cara", total: 420, nota: 9.2 },
  { id: "sin-nota", total: 100, nota: null },
];

test("la más barata es la de menos total entre las que pasan de la nota mínima", () => {
  assert.equal(laMasBarata(FILAS, NOTA_MINIMA), "barata");
  assert.equal(laMasBarata([FILAS[0], FILAS[4]], NOTA_MINIMA), null);
});

test("la mejor por lo que cuesta depende de lo que quieres gastar: cuanto más cómodo vas, menos pesa el precio", () => {
  assert.equal(laMejorPorLoQueCuesta(FILAS, NOTA_MINIMA, "tight"), "barata");
  assert.equal(laMejorPorLoQueCuesta(FILAS, NOTA_MINIMA, "medium"), "media");
  // Con la cara a 300, quien va cómodo la prefiere, y quien va con un gasto medio se queda con la del medio.
  const conLaCaraMasCerca = FILAS.map((f) => (f.id === "cara" ? { ...f, total: 300 } : f));
  assert.equal(laMejorPorLoQueCuesta(conLaCaraMasCerca, NOTA_MINIMA, "comfortable"), "cara");
  assert.equal(laMejorPorLoQueCuesta(conLaCaraMasCerca, NOTA_MINIMA, "medium"), "media");
  // Lo que no pasa de la nota mínima no entra, por barato que sea, ni lo que no tiene nota.
  assert.equal(laMejorPorLoQueCuesta([FILAS[0], FILAS[4]], NOTA_MINIMA, "medium"), null);
  assert.equal(laMejorPorLoQueCuesta([], NOTA_MINIMA, "medium"), null);
});

test("la zona se mide andando si el viaje se anda, y con lo que haya que coger si no", () => {
  // Con los sitios cerca, andando: lo que dice la criba son minutos a pie.
  const cerca = cribar([candidato("a1", { gym: "full" }), candidato("a2", { gym: "full" })], CTX);
  assert.ok(cerca.every((c) => c.aPie && c.minutos === c.minutosAndando));
  // Con los sitios a veinte kilómetros de todos los alojamientos, no se anda desde ninguno: se mide en lo que se
  // tarda cogiendo algo, y la zona deja de valer cero para todos.
  const lejos: Contexto = { ...CTX, paradas: PARADAS.map((p) => ({ lat: p.lat + 0.18, lon: p.lon })) };
  const enCoche = cribar([candidato("a1", { gym: "full" }), candidato("a2", { gym: "full" })], lejos);
  assert.ok(enCoche.every((c) => !c.aPie));
  assert.ok(enCoche.every((c) => (c.minutos ?? 0) < (c.minutosAndando ?? 0)));
  assert.ok(enCoche.every((c) => (c.nota.partes.zona ?? 0) > 0));
  // Si uno solo de los candidatos está a pie de lo que se va a ver, el viaje se anda, y quien queda lejos, pierde.
  const mezcla = [candidato("a1", { gym: "full" }), candidato("a2", { gym: "full" })];
  mezcla[1].ficha.alojamiento.lat += 0.18;
  const [aPie, lejano] = cribar(mezcla, CTX);
  assert.ok(aPie.aPie && lejano.aPie);
  assert.equal(lejano.nota.partes.zona, 0);
});
