// Lo que rehace cada cambio con las capas del destino (14.7), de punta a punta con el caso inventado: otras fechas
// vuelven a mirar las entradas y rehacen la cuenta; un viajero más, solo la cuenta del presupuesto, sin ninguna capa;
// otro idioma, el que conoce el destino; lo que buscas, la ruta y con ella las capas que la leen. Y lo que costaría
// cada uno, contando las capas. Con asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { abrirViaje, leerVersion, leerViaje, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { rehacer } from "../../agent/launcher/rehacer.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { clasesDelCambio, impactoDe } from "../../agent/scripts/impacto.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");
const CAPAS = ["getting-around", "local-knowledge", "tickets"];

async function viajeEnElMapa(): Promise<{ mesa: string; v: ViajeEnLaMesa }> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: ahora() });
  pasar(v, "confirmed", ahora());
  const run = nuevoRun(v, ahora());
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.hecho, true);
  return { mesa, v: leerViaje(v.ficha.id, "ana", mesa) };
}

async function cambiarYLlevar(mesa: string, id: string, entendido: Entendido) {
  const clases = clasesDelCambio(ENTENDIDO, entendido);
  const { run } = rehacer(leerViaje(id, "ana", mesa), { clases, entendido, cuando: ahora() });
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
  const v = leerViaje(id, "ana", mesa);
  return { run, clases, asientos: [...new Set(asientos)].sort(), viaje: leerVersion(v)?.viaje as Viaje };
}

const deLasCapas = (asientos: string[]): string[] => asientos.filter((a) => CAPAS.includes(a));

test("otras fechas: las entradas se vuelven a mirar, con las capas, y la cuenta se rehace", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const nuevas = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: "2027-03-12", check_out: "2027-03-15" } };
    const r = await cambiarYLlevar(mesa, v.ficha.id, nuevas);
    assert.deepEqual(deLasCapas(r.asientos), CAPAS);
    // Al de las entradas se le dieron las fechas nuevas.
    const puesto = readdirSync(join(r.run, "puestos")).find((x) => x.startsWith("entradas"))!;
    const dado = JSON.parse(readFileSync(join(r.run, "puestos", puesto, "in", "trip.json"), "utf8"));
    assert.equal(dado.dates.check_in, "2027-03-12");
    assert.ok(r.viaje.entradas !== undefined && r.viaje.entradas.falta === null);
    assert.ok(r.viaje.presupuesto !== undefined);
    // Y lo que costaría lo cuenta con ellas.
    const estimado = Object.fromEntries(
      [
        ...CAPAS,
        "route-planner",
        "papers",
        "calendar",
        "sights-picker",
        "lodging-viewer",
        "trip-crosser",
        "trip-explainer",
      ].map((a) => [a, { usd: 0.1, de: 1 }]),
    );
    const quien = impactoDe(r.clases, estimado).redo.map((x) => x.who);
    for (const a of CAPAS) assert.ok(quien.includes(a), a);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("un viajero más: solo la cuenta del presupuesto, sin ninguna capa; las entradas, las de antes", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = leerVersion(v)?.viaje as Viaje;
    const otro = { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, adults: ENTENDIDO.travellers.adults + 1 } };
    const r = await cambiarYLlevar(mesa, v.ficha.id, otro);
    assert.deepEqual(r.clases, ["travellers"]);
    assert.deepEqual(deLasCapas(r.asientos), []);
    assert.deepEqual(r.viaje.entradas, antes.entradas);
    assert.deepEqual(r.viaje.moverse, antes.moverse);
    assert.deepEqual(r.viaje.saber, antes.saber);
    // La cuenta es la del grupo nuevo.
    assert.equal(r.viaje.adultos, antes.adultos + 1);
    assert.ok(r.viaje.presupuesto !== undefined);
    const impacto = impactoDe(r.clases);
    assert.ok(impacto.redo.some((x) => x.step === "budget" && x.who === "code"));
    assert.ok(!impacto.redo.some((x) => CAPAS.includes(x.who)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("otro idioma: el que conoce el destino otra vez, y ninguna otra capa", async () => {
  const impacto = impactoDe(["language"]);
  assert.deepEqual(
    impacto.redo.filter((x) => CAPAS.includes(x.who)).map((x) => x.who),
    ["local-knowledge"],
  );
});

test("lo que buscas: la ruta otra vez, y con ella las capas que la leen; las entradas, las de antes", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = leerVersion(v)?.viaje as Viaje;
    const otro = { ...ENTENDIDO, looking_for: [...ENTENDIDO.looking_for, "markets"] };
    const r = await cambiarYLlevar(mesa, v.ficha.id, otro);
    assert.deepEqual(r.clases, ["looking_for"]);
    assert.deepEqual(deLasCapas(r.asientos), ["getting-around", "local-knowledge"]);
    // Las entradas de los sitios que ya estaban se quedan como estaban.
    for (const e of r.viaje.entradas!.sitios) {
      const suya = antes.entradas!.sitios.find((x) => x.parada === e.parada);
      if (suya !== undefined) assert.deepEqual(e, suya);
      else assert.equal(e.sinMirar, "added");
    }
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
