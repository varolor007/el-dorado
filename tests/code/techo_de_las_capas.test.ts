// El techo de gasto con las capas del destino (14.7): una capa que se corta por su tope sin decir lo que gastó se da
// por perdida y la investigación sigue, contando para el techo lo más que pudo gastar. Un asiento que no es una capa
// sigue parando el run si no se sabe su gasto. Con asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { gastoDe, gastoParaElTecho, trabajosDe } from "../../agent/launcher/trabajos.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { fuentesInventadas, GASTO, lanzadorDeMentira, leerJson, runNuevo } from "../cases/inventado/asientos.ts";

async function conRun(prueba: (run: string) => Promise<void>): Promise<void> {
  const run = runNuevo();
  try {
    await prueba(run);
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
}

const cuelgan =
  (...asientos: string[]) =>
  (asiento: string): "cuelga" | null =>
    asientos.includes(asiento) ? "cuelga" : null;
const tope = { segundos: 0.3 };

test("una capa cortada por su tope, con techo: se da por perdida, se sigue y cuenta su cota", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorDeMentira({ falla: cuelgan("getting-around") });
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope, cota: () => 0.4 });
    assert.equal(r.parado, null);
    assert.equal(r.hecho, true);
    assert.ok(lanzador.cortados.includes("moverse-v1"));
    const t = trabajosDe(run).find((x) => x.puesto === "moverse-v1");
    assert.equal(t?.estado, "stopped");
    assert.equal(t?.gasto, null);
    assert.equal(t?.cota, 0.4);
    // Lo gastado no se inventa: lo que se sabe, aparte; para el techo, con la cota.
    const sabidos = trabajosDe(run).filter((x) => x.gasto !== null).length;
    assert.equal(gastoDe(run).sabido, false);
    assert.ok(Math.abs(gastoDe(run).usd - sabidos * GASTO.usd) < 1e-9);
    assert.ok(Math.abs((gastoParaElTecho(run) ?? 0) - (sabidos * GASTO.usd + 0.4)) < 1e-9);
    // El viaje sale sin ella, y lo dice.
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(v.moverse?.falta, "late");
  });
});

test("una capa cortada por su tope, sin techo: se sigue igual", async () => {
  await conRun(async (run) => {
    darElAdelante(run, null);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ falla: cuelgan("local-knowledge") }), {
      tope,
      cota: () => 0.4,
    });
    assert.equal(r.hecho, true);
    assert.equal((leerJson(join(run, "viaje.json")) as Viaje).saber?.falta, "late");
  });
});

test("dos capas cortadas que juntas llegan al techo: se para por el techo, antes de lanzar más", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 2);
    const lanzador = lanzadorDeMentira({ falla: cuelgan("getting-around", "local-knowledge") });
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope, cota: () => 1 });
    assert.equal(r.hecho, false);
    assert.equal(r.parado?.paso, "el gasto");
    assert.match(r.parado?.rojos[0].que ?? "", /contando lo más que pudo gastar lo que se cortó/);
    assert.match(r.parado?.rojos[0].que ?? "", /llegó al techo de 2\.00 USD/);
    // Lo que espera a las capas (el que explica) no se lanzó.
    assert.ok(!r.lanzados.includes("explica-v1"));
  });
});

test("sin cota, o si no es una capa, sigue como siempre: con techo no se sigue a ciegas", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ falla: cuelgan("getting-around") }), {
      tope,
    });
    assert.equal(r.parado?.paso, "el gasto");
    assert.match(r.parado?.rojos[0].que ?? "", /no se sigue a ciegas/);
  });
  await conRun(async (run) => {
    darElAdelante(run, 5);
    // El de la ruta no es una capa: aunque haya cota, no se acota.
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ falla: cuelgan("route-planner") }), {
      tope,
      cota: () => 0.4,
    });
    assert.equal(trabajosDe(run).find((x) => x.puesto === "ruta-v1")?.cota, undefined);
    assert.notEqual(r.hecho, true);
  });
  // Una cota que no es un número no vale: cuenta como no sabida.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ falla: cuelgan("getting-around") }), {
      tope,
      cota: () => Number.NaN,
    });
    assert.match(r.parado?.rojos[0].que ?? "", /no se sigue a ciegas/);
  });
});
