// La casa lleva una investigación sola: lanza cada asiento que espera, apunta cada trabajo con lo que gastó, y no
// lanza nada sin el adelante del viajero ni por encima de su techo. Con asientos de mentira: sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ESTADOS_DE_UN_TRABAJO } from "../../agent/data/pasos.ts";
import { ADELANTE, adelanteDe, darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import { sigue } from "../../agent/launcher/investigar.ts";
import { apuntarTrabajo, gastoDe, TRABAJOS, trabajosDe, type Trabajo } from "../../agent/launcher/trabajos.ts";
import { leerVivo } from "../../agent/launcher/vivo.ts";
import {
  fuentesInventadas,
  GASTO,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
  type Objeto,
} from "../cases/inventado/asientos.ts";

async function conRun(prueba: (run: string) => Promise<void>): Promise<void> {
  const run = runNuevo();
  try {
    await prueba(run);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
}

const estados = (run: string): Record<string, string> =>
  Object.fromEntries(trabajosDe(run).map((t) => [t.puesto, t.estado]));

test("sin el adelante del viajero la casa no lanza a nadie: da los pasos de código y espera", async () => {
  await conRun(async (run) => {
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.sinAdelante, true);
    assert.equal(r.hecho, false);
    assert.deepEqual(r.esperan, ["ruta-v1"]);
    assert.deepEqual(r.lanzados, []);
    assert.deepEqual(lanzador.ordenes, []);
    assert.deepEqual(trabajosDe(run), []);
    // Lo que no gasta de la clave del viajero sí se hizo: los sitios, de datos abiertos.
    assert.ok(existsSync(join(run, "sitios.json")));
    assert.ok(!existsSync(join(run, "parado.json")));
  });
});

test("con el adelante lleva la investigación entera, sola, y apunta cada trabajo con lo que gastó", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5, new Date("2031-01-02T10:00:00Z"));
    assert.deepEqual(adelanteDe(run), { cuando: "2031-01-02T10:00:00.000Z", techo: 5 });
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.deepEqual(r.parado, null);
    assert.equal(r.hecho, true);
    assert.equal(r.sinAdelante, false);
    // Los asientos, en su orden: la ruta; a la vez, los que miran y el que elige; cruzar; explicar. Cada uno, una vez.
    assert.equal(r.lanzados[0], "ruta-v1");
    assert.deepEqual(r.lanzados.slice(1, 7).sort(), ["a1-p1", "a2-p1", "a3-p1", "a4-p1", "a5-p1", "sitios-v1"]);
    assert.deepEqual(r.lanzados.slice(7), ["cruce-1-v1", "explica-v1"]);
    assert.equal(new Set(r.lanzados).size, 9);
    assert.equal(lanzador.ordenes.length, 9);
    assert.ok(lanzador.ordenes.every((orden) => orden.includes(join(run, "puestos"))));
    assert.ok(lanzador.aLaVez > 1 && lanzador.aLaVez <= 6);
    // Cada trabajo queda apuntado: hecho, con sus horas y con lo que gastó. El total es la suma.
    const trabajos = trabajosDe(run);
    assert.deepEqual(
      trabajos.map((t) => t.puesto),
      r.lanzados,
    );
    assert.ok(trabajos.every((t) => t.estado === "done" && t.fallo === null && t.desde !== null && t.hasta !== null));
    assert.deepEqual(trabajos[0].gasto, GASTO);
    assert.deepEqual(r.gasto, { turnos: 27, entrada: 9000, salida: 1800, usd: r.gasto.usd, sabido: true });
    assert.ok(Math.abs(r.gasto.usd - 0.45) < 1e-9);
    assert.ok(existsSync(join(run, "viaje.json")));
    assert.equal(leerVivo(run).at(-1)?.clase, "done");
    // Llamar otra vez sobre lo hecho no lanza a nadie más.
    const otra = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(otra.hecho, true);
    assert.deepEqual(otra.lanzados, []);
    assert.equal(lanzador.ordenes.length, 9);
  });
});

test("no se lanza nada por encima del techo de gasto que aceptó el viajero, y se dice", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 0.12);
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador);
    // La ruta gastó 0,05: cabía la tanda siguiente. Con ella se pasó del techo, y el que cruza ya no se lanza.
    assert.equal(r.hecho, false);
    assert.equal(r.parado?.en, "cross");
    assert.equal(r.parado?.paso, "el gasto");
    assert.match(r.parado?.rojos[0].que ?? "", /llegó al techo de 0\.12 USD/);
    assert.equal(r.lanzados.length, 7);
    assert.ok(!r.lanzados.some((id) => id.startsWith("cruce") || id.startsWith("explica")));
    assert.ok(!existsSync(join(run, "viaje.json")));
    assert.deepEqual(
      leerVivo(run)
        .filter((x) => x.clase === "stopped")
        .map((x) => x.ref),
      ["cross"],
    );
    // Parado sigue: otra llamada no lanza a nadie.
    const otra = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(otra.parado?.paso, "el gasto");
    assert.deepEqual(otra.lanzados, []);
    assert.equal(lanzador.ordenes.length, 7);
  });
});

test("si de un asiento no se sabe lo que gastó y hay techo, no se sigue a ciegas", async () => {
  for (const gasto of [undefined, { ...GASTO, usd: -1 }, { ...GASTO, entrada: Number.NaN }, "mucho", null]) {
    await conRun(async (run) => {
      darElAdelante(run, 5);
      const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ gasto }));
      assert.deepEqual(r.lanzados, ["ruta-v1"]);
      assert.equal(trabajosDe(run)[0].gasto, null);
      assert.equal(r.gasto.sabido, false);
      assert.equal(r.parado?.paso, "el gasto");
      assert.match(r.parado?.rojos[0].que ?? "", /no se sabe lo que gastó/);
    });
  }
  // Quien lanza a mano, sin techo, sí sigue: y queda dicho que el gasto no se sabe.
  await conRun(async (run) => {
    darElAdelante(run, null);
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira({ gasto: undefined }));
    assert.equal(r.hecho, true);
    assert.equal(r.gasto.sabido, false);
    assert.equal(r.gasto.usd, 0);
  });
});

test("un asiento que falla sin entregar para la investigación y dice cuál: no se lanza otra vez", async () => {
  for (const falla of ["rompe", "calla"] as const) {
    await conRun(async (run) => {
      darElAdelante(run, 5);
      const lanzador = lanzadorDeMentira({ falla: (asiento) => (asiento === "route-planner" ? falla : null) });
      const r = await llevar(run, fuentesInventadas(), lanzador);
      assert.equal(r.parado?.en, "route");
      assert.equal(r.parado?.paso, "un asiento no entregó");
      assert.equal(r.parado?.rojos[0].donde, "ruta-v1");
      assert.equal(r.parado?.rojos[0].que, falla === "rompe" ? "la IA no contestó" : "acabó sin dejar su entrega");
      assert.deepEqual(estados(run), { "ruta-v1": "failed" });
      // Lo que gastó hasta fallar también cuenta.
      assert.deepEqual(trabajosDe(run)[0].gasto, falla === "calla" ? GASTO : null);
      const otra = await llevar(run, fuentesInventadas(), lanzador);
      assert.equal(otra.parado?.en, "route");
      assert.equal(lanzador.ordenes.length, 1);
    });
  }
});

test("un asiento que se pasa de su tope se corta: se le avisa, queda parado y no se le espera más", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorDeMentira({ falla: (asiento) => (asiento === "sights-picker" ? "cuelga" : null) });
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope: { segundos: 0.2 } });
    assert.deepEqual(lanzador.cortados, ["sitios-v1"]);
    assert.equal(estados(run)["sitios-v1"], "stopped");
    assert.match(trabajosDe(run).find((t) => t.puesto === "sitios-v1")?.fallo ?? "", /no acabó en su tope/);
    assert.equal(r.parado?.en, "pick");
    assert.equal(r.parado?.paso, "un asiento no entregó");
    // Los que miraban a la vez sí acabaron, y quedan hechos.
    assert.equal(estados(run)["a1-p1"], "done");
  });
});

test("si uno de los que miran falla, el viaje se hace igual: ese alojamiento queda sin mirar, y se dice", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorDeMentira({
      falla: (_asiento, puesto) => (puesto === "a3-p1" ? "rompe y lo dice" : null),
    });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.deepEqual(r.parado, null);
    assert.equal(r.hecho, true);
    assert.equal(estados(run)["a3-p1"], "failed");
    // Lo que gastó hasta fallar cuenta en el total, que por eso se sabe entero.
    assert.deepEqual(trabajosDe(run).find((t) => t.puesto === "a3-p1")?.gasto, GASTO);
    assert.equal(r.gasto.sabido, true);
    assert.equal(r.gasto.turnos, 27);
    assert.equal(Object.values(estados(run)).filter((e) => e === "done").length, 8);
    assert.equal(lanzador.ordenes.length, 9);
    // Se dice, aunque se dijera en una vuelta de antes; y en lo que se cuenta en vivo, ese alojamiento se empezó a
    // mirar y no se acabó.
    const suyo = leerJson(join(run, "mirar.json")).quienes.find((q: Objeto) => q.puesto === "a3-p1");
    assert.ok(r.avisos.includes(`${suyo.nombre}: se queda sin mirar`));
    const de = (clase: string): (string | undefined)[] =>
      leerVivo(run)
        .filter((x) => x.clase === clase)
        .map((x) => x.ref);
    assert.ok(de("looking").includes(suyo.alojamiento));
    assert.ok(!de("looked").includes(suyo.alojamiento));
  });
});

test("trabajan a la vez tantos asientos como se diga, y no más", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador, { aLaVez: 2 });
    assert.equal(r.hecho, true);
    assert.equal(lanzador.aLaVez, 2);
    assert.equal(lanzador.ordenes.length, 9);
  });
});

test("si la casa se cortó con un asiento trabajando, al volver lo cierra: hecho o fallido", async () => {
  const cortado = (run: string): Trabajo => ({
    puesto: "ruta-v1",
    asiento: "route-planner",
    estado: "working",
    desde: "2031-01-02T10:00:00.000Z",
    hasta: null,
    gasto: null,
    fallo: null,
  });
  // No llegó a entregar: falló, y la investigación se para sin lanzarlo otra vez sobre lo que dejó.
  await conRun(async (run) => {
    darElAdelante(run, null);
    await sigue(run, fuentesInventadas());
    apuntarTrabajo(run, cortado(run));
    const lanzador = lanzadorDeMentira();
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.deepEqual(estados(run), { "ruta-v1": "failed" });
    assert.equal(trabajosDe(run)[0].fallo, "la casa se cortó mientras trabajaba");
    assert.equal(r.parado?.en, "route");
    assert.deepEqual(lanzador.ordenes, []);
  });
  // Llegó a entregar: está hecho, y la investigación sigue hasta el final sin volver a lanzarlo.
  await conRun(async (run) => {
    darElAdelante(run, null);
    await sigue(run, fuentesInventadas());
    apuntarTrabajo(run, cortado(run));
    trabaja(run, "ruta-v1");
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    assert.equal(r.hecho, true);
    assert.equal(estados(run)["ruta-v1"], "done");
    assert.ok(!r.lanzados.includes("ruta-v1"));
  });
});

test("el adelante: un techo que no vale no se apunta, y uno mal escrito no cuenta como adelante", async () => {
  await conRun(async (run) => {
    for (const techo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      assert.throws(() => darElAdelante(run, techo), /el techo de gasto no vale/);
    assert.equal(adelanteDe(run), null);
    for (const escrito of ["{", "[]", '{"cuando":"hoy","techo":-5}', '{"techo":5}', '{"cuando":"hoy","techo":"5"}']) {
      writeFileSync(join(run, ADELANTE), escrito);
      assert.equal(adelanteDe(run), null, escrito);
    }
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    assert.equal(r.sinAdelante, true);
    assert.deepEqual(r.lanzados, []);
  });
});

test("los trabajos de un run: se apuntan una vez cada uno, se ponen al día y se suma lo que gastaron", async () => {
  await conRun(async (run) => {
    assert.deepEqual([...ESTADOS_DE_UN_TRABAJO], ["queued", "working", "done", "stopped", "failed"]);
    assert.deepEqual(trabajosDe(run), []);
    assert.deepEqual(gastoDe(run), { turnos: 0, entrada: 0, salida: 0, usd: 0, sabido: true });
    const uno: Trabajo = {
      puesto: "a",
      asiento: "x",
      estado: "working",
      desde: "d",
      hasta: null,
      gasto: null,
      fallo: null,
    };
    apuntarTrabajo(run, uno);
    // Mientras trabaja, que aún no se sepa lo que gasta no es no saberlo.
    assert.equal(gastoDe(run).sabido, true);
    apuntarTrabajo(run, { ...uno, estado: "done", hasta: "h", gasto: GASTO });
    apuntarTrabajo(run, { ...uno, puesto: "b", estado: "failed", gasto: { ...GASTO, usd: 0.2 }, fallo: "se rompió" });
    assert.deepEqual(estados(run), { a: "done", b: "failed" });
    assert.deepEqual(gastoDe(run), { turnos: 6, entrada: 2000, salida: 400, usd: 0.25, sabido: true });
    apuntarTrabajo(run, { ...uno, puesto: "c", estado: "stopped", gasto: null });
    assert.equal(gastoDe(run).sabido, false);
    // Un archivo estropeado, o un trabajo que no lo es, no rompe la lectura.
    writeFileSync(join(run, TRABAJOS), JSON.stringify([uno, { puesto: "z" }, { ...uno, estado: "volando" }, null]));
    assert.deepEqual(trabajosDe(run), [uno]);
    writeFileSync(join(run, TRABAJOS), "{no es json");
    assert.deepEqual(trabajosDe(run), []);
  });
});

test("si uno que mira falla sin decir lo que gastó y hay techo, la casa se para antes de lanzar más", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorDeMentira({ falla: (_asiento, puesto) => (puesto === "a3-p1" ? "rompe" : null) });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.hecho, false);
    assert.equal(r.parado?.en, "cross");
    assert.equal(r.parado?.paso, "el gasto");
    assert.equal(r.gasto.sabido, false);
    assert.equal(lanzador.ordenes.length, 7);
  });
});
