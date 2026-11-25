// Lo que ya se dijo del presupuesto entero, cuando un cambio lo rehace (14.7): el que cruza y el que explica no se
// rehacen por él, pero lo que dijeron se vuelve a pasar por su puerta con la cuenta nueva, y el que no pasa se rehace.
// El impacto lo dice y lo cuenta antes de gastar. Con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { pedirLasEntradas } from "../../agent/launcher/dia_a_dia.ts";
import { abrirViaje, leerVersion, leerViaje, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { rehechoDe } from "../../agent/launcher/rehacer.ts";
import type { DeLasEntradas } from "../../agent/output/capas.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { entradaAbierta } from "../../agent/scripts/capa_entradas.ts";
import { impactoDe } from "../../agent/scripts/impacto.ts";
import { fuentesInventadas, GASTO, trabaja } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");
const viajeDe = (v: ViajeEnLaMesa): Viaje => leerVersion(v)?.viaje as Viaje;

/**
 * Un lanzador de mentira cuyo que explica dice el total del presupuesto entero de su primera manera, de su cuenta; y
 * cuyo de las entradas, si se le dice, da otro precio a la entrada de adulto la segunda vez que se le lanza.
 */
function queDiceElTotal(otroPrecio: number | null, cruza = false): Lanzador & { asientos: string[] } {
  let entradas = 0;
  const lanzador = (async (_orden, puesto) => {
    lanzador.asientos.push(puesto.asiento);
    if (puesto.asiento === "tickets") entradas++;
    trabaja(resolve(puesto.carpeta, "..", ".."), puesto.id, (asiento, e) => {
      if (asiento === "trip-crosser" && cruza) {
        const cuenta = JSON.parse(readFileSync(join(puesto.carpeta, "in", "budget.json"), "utf8"));
        e.unknowns = [`The whole trip comes to ${cuenta.rows[0].total} ${cuenta.rows[0].currency} with what is known.`];
      }
      if (asiento === "trip-explainer") {
        const cuenta = JSON.parse(readFileSync(join(puesto.carpeta, "in", "budget.json"), "utf8"));
        const ways = e.ways as { why: string }[];
        ways[0].why = `The whole trip comes to ${cuenta.ways[0].total} ${cuenta.ways[0].currency} with what is known.`;
      }
      if (asiento === "tickets" && otroPrecio !== null && entradas > 1)
        for (const s of e.sights as { prices: { for: string; amount: unknown }[] | string }[])
          if (Array.isArray(s.prices)) for (const p of s.prices) if (p.for === "adult") p.amount = otroPrecio;
    });
    return GASTO;
  }) as Lanzador & { asientos: string[] };
  lanzador.asientos = [];
  return lanzador;
}

/** El viaje inventado en el mapa, con uno de sus sitios sin mirar: lo que pide tu botón de las entradas. */
async function conUnSitioSinMirar(l: Lanzador): Promise<{ mesa: string; v: ViajeEnLaMesa; sitio: string }> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: ahora() });
  pasar(v, "confirmed", ahora());
  const run = nuevoRun(v, ahora());
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
  await esperarLoDeDetras(run);
  assert.equal(r.hecho, true, JSON.stringify(r.parado));
  const enMapa = leerViaje(v.ficha.id, "ana", mesa);
  const viaje = viajeDe(enMapa);
  const sitio = viaje.entradas!.sitios[0].parada;
  const quita = (e: DeLasEntradas): DeLasEntradas => ({
    ...e,
    sitios: e.sitios.map((x) => (x.parada === sitio ? entradaAbierta(sitio, undefined, "over_limit") : x)),
  });
  const enLaVersion = join(enMapa.carpeta, "versiones", String(enMapa.ficha.version), "viaje.json");
  writeFileSync(enLaVersion, JSON.stringify({ ...viaje, entradas: quita(viaje.entradas!) }));
  const entradas = JSON.parse(readFileSync(join(run, "entradas.json"), "utf8")) as DeLasEntradas;
  writeFileSync(join(run, "entradas.json"), JSON.stringify(quita(entradas)));
  return { mesa, v: leerViaje(v.ficha.id, "ana", mesa), sitio };
}

test("el impacto de un cambio que rehace el presupuesto: el que cruza y el que explica, quizá", () => {
  const estimado = {
    tickets: { usd: 0.3, de: 1 },
    "trip-crosser": { usd: 0.2, de: 1 },
    "trip-explainer": { usd: 0.1, de: 1 },
  };
  const boton = impactoDe(["tickets"], estimado);
  assert.deepEqual(boton.maybe, [
    { step: "cross", who: "trip-crosser" },
    { step: "explain", who: "trip-explainer" },
  ]);
  assert.equal(boton.cost.usd, 0.3);
  assert.equal(boton.most?.usd, 0.6);
  // Lo mismo con cualquier otro cambio que mueva el presupuesto y los conserve: otro ritmo.
  assert.deepEqual(
    impactoDe(["pace"]).maybe.map((x) => x.step),
    ["cross", "explain"],
  );
  // Con uno que ya los rehace, no van entre los quizá.
  assert.deepEqual(impactoDe(["travellers"]).maybe, []);
});

test("otro precio de una entrada: lo que dijo del total el que explica no pasa, y se rehace", async () => {
  const l = queDiceElTotal(25);
  const { mesa, v } = await conUnSitioSinMirar(l);
  try {
    const antes = viajeDe(v);
    const { run } = pedirLasEntradas(v, { cuando: ahora() });
    darElAdelante(run, null, ahora());
    l.asientos.length = 0;
    const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true, JSON.stringify(r.parado));
    assert.deepEqual(l.asientos, ["tickets", "trip-explainer"]);
    const despues = viajeDe(leerViaje(v.ficha.id, "ana", mesa));
    const total = despues.presupuesto!.maneras[0].total;
    assert.notEqual(total, antes.presupuesto!.maneras[0].total);
    // Lo que dice ahora es la cifra de la cuenta nueva, no la de antes.
    assert.ok(despues.maneras[0].porQue?.includes(String(total)), despues.maneras[0].porQue);
    const rehecho = rehechoDe(run)!;
    assert.ok(rehecho.rehace.includes("explain") && !rehecho.conserva.includes("explain"));
    assert.ok(rehecho.conserva.includes("cross"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("si con la cuenta nueva lo dicho sigue pasando su puerta, se queda y no se vuelve a pagar", async () => {
  const l = queDiceElTotal(null);
  const { mesa, v } = await conUnSitioSinMirar(l);
  try {
    const antes = viajeDe(v);
    const { run } = pedirLasEntradas(v, { cuando: ahora() });
    darElAdelante(run, null, ahora());
    l.asientos.length = 0;
    const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true, JSON.stringify(r.parado));
    assert.deepEqual(l.asientos, ["tickets"]);
    const despues = viajeDe(leerViaje(v.ficha.id, "ana", mesa));
    assert.equal(despues.maneras[0].porQue, antes.maneras[0].porQue);
    assert.ok(rehechoDe(run)!.conserva.includes("explain"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("con el que cruza: si su cifra del total ya no es de la cuenta, se rehace, y el que explica", async () => {
  const l = queDiceElTotal(25, true);
  const { mesa, v } = await conUnSitioSinMirar(l);
  try {
    const { run } = pedirLasEntradas(v, { cuando: ahora() });
    darElAdelante(run, null, ahora());
    l.asientos.length = 0;
    const r = await llevar(run, fuentesInventadas(), l, { conductor: false });
    await esperarLoDeDetras(run);
    assert.equal(r.hecho, true, JSON.stringify(r.parado));
    assert.deepEqual(l.asientos, ["tickets", "trip-crosser", "trip-explainer"]);
    const rehecho = rehechoDe(run)!;
    assert.ok(rehecho.rehace.includes("cross") && rehecho.rehace.includes("explain"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
