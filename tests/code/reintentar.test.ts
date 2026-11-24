// «Volver a intentarlo» (2.5): un run parado por un asiento se retoma donde se paró, con una vuelta más de ese asiento
// y solo de ese, sin volver a gastar lo demás. Con asientos de mentira y el caso inventado: sin gastar.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { CONDUCTOR, REINTENTOS, REINTENTOS_POR_RUN } from "../../agent/data/conductor.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { actaDe, paradaDeCara } from "../../agent/launcher/acta.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import { pararRun } from "../../agent/launcher/investigar.ts";
import { aplicarReintento, FalloAlReintentar, reintentar, vueltaSiguiente } from "../../agent/launcher/reintentar.ts";
import { apuntarTrabajo, gastoDe, trabajosDe } from "../../agent/launcher/trabajos.ts";
import { leerVivo } from "../../agent/launcher/vivo.ts";
import {
  entregaDelConductor,
  fuentesInventadas,
  GASTO,
  leerJson,
  runNuevo,
  seisPasos,
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

type Que = "bien" | "rojo" | "rompe";
/** Lo que hace cada puesto, por su id; lo que no dice nada, trabaja bien. El conductor, lo que se le diga. */
type Guion = { puesto?: (id: string) => Que; conductor?: (parada: Objeto) => Objeto };

const DE_DETRAS = new Set(["calendar", "papers"]);

/** Un lanzador de mentira con guion, que apunta cada puesto que lanza, menos lo de detrás. */
function lanzadorConGuion(g: Guion): Lanzador & { lanzados: string[] } {
  const lanzador = (async (_orden, puesto) => {
    const run = resolve(puesto.carpeta, "..", "..");
    if (DE_DETRAS.has(puesto.asiento)) {
      trabaja(run, puesto.id);
      return { ...GASTO, usd: 0 };
    }
    lanzador.lanzados.push(puesto.id);
    if (puesto.asiento === "conductor") {
      const parada = leerJson(join(puesto.carpeta, "in", "stop.json"));
      const entrega = (g.conductor ?? entregaDelConductor)(parada);
      const textos = seisPasos(readdirSync(join(puesto.carpeta, "in")).sort(), entrega);
      for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
      return GASTO;
    }
    const que = g.puesto?.(puesto.id) ?? "bien";
    if (que === "rompe") throw Object.assign(new Error("el filtro del modelo marcó el mensaje"), { gasto: GASTO });
    trabaja(run, puesto.id, que === "rojo" ? (_a, e) => void (e.seat = "someone-else") : undefined);
    return GASTO;
  }) as Lanzador & { lanzados: string[] };
  lanzador.lanzados = [];
  return lanzador;
}

const vuelta = (id: string): number => Number(/-v(\d+)$/.exec(id)?.[1] ?? 1);
const otraVuelta = (): Objeto => ({
  seat: "conductor",
  decision: "retry_with_hint",
  hint: "The field seat is always route-planner (DELIVERY.md, its first field).",
  kind: "seat_kept_failing",
  options: ["retry"],
  message: "",
  why: "The same red of form came back three times; the fix is clear.",
});
const vivo = (run: string): string[] => leerVivo(run).map((s) => `${s.clase}:${s.ref ?? ""}:${s.n ?? ""}`);
const niega = (hacer: () => unknown, clave: string): void =>
  assert.throws(hacer, (e: unknown) => e instanceof FalloAlReintentar && e.message === clave);

test("la vuelta siguiente de un puesto: con su número, y la primera de los que no lo llevan", () => {
  assert.equal(vueltaSiguiente("ruta-v3"), "ruta-v4");
  assert.equal(vueltaSiguiente("escucha-1-v1"), "escucha-1-v2");
  assert.equal(vueltaSiguiente("a2-p1"), "a2-p1-v2");
  assert.equal(vueltaSiguiente("a2-p1-v2"), "a2-p1-v3");
});

test("un asiento que no entrega: se repite solo ese, y el viaje sale sin volver a gastar lo demás", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ puesto: (id) => (id === "sitios-v1" ? "rompe" : "bien") });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.parado?.en, "pick");
    // El conductor miró y lo contó, ofreciendo volver a intentarlo: la web sigue desde aquí.
    assert.equal(actaDe(run).conductor?.estado, "told");
    assert.deepEqual(paradaDeCara(run), {
      at: "pick",
      kind: "seat_kept_failing",
      options: ["retry"],
      said: null,
      looking: false,
      resumes: true,
    });
    const antes = [...lanzador.lanzados];
    const gastado = gastoDe(run).usd;
    const huellas = new Map(trabajosDe(run).map((t) => [t.puesto, JSON.stringify(t)]));

    const hecho = reintentar(run, new Date("2027-01-01T10:00:00Z"));
    assert.deepEqual(hecho, {
      n: 1,
      cuando: "2027-01-01T10:00:00.000Z",
      clase: "seat_did_not_finish",
      en: "pick",
      de: "sitios-v1",
      asiento: "sights-picker",
      puesto: "sitios-v2",
    });
    // Hasta que la casa lo lleva, el run sigue parado; la vuelta nueva, montada con el mismo material, sin más.
    assert.ok(existsSync(join(run, "parado.json")));
    // Ya se cuenta que se pidió; no una parada nueva, que aún es la de antes.
    assert.ok(vivo(run).includes("retry:pick:1"));
    assert.ok(!vivo(run).includes("stopped:pick:1"));
    const material = (p: string): string[] => readdirSync(join(run, "puestos", p, "in")).sort();
    assert.deepEqual(material("sitios-v2"), material("sitios-v1"));
    assert.ok(!material("sitios-v2").includes("returned.json"));

    const otra = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(otra.hecho, true);
    const nuevos = lanzador.lanzados.slice(antes.length);
    assert.equal(nuevos[0], "sitios-v2");
    // Nada de lo que ya estaba se vuelve a lanzar, ni el conductor.
    for (const id of nuevos) assert.ok(!antes.includes(id), id);
    assert.ok(!nuevos.some((id) => id.startsWith("conductor")));
    for (const [puesto, t] of huellas)
      assert.equal(JSON.stringify(trabajosDe(run).find((x) => x.puesto === puesto)), t);
    assert.ok(Math.abs(gastoDe(run).usd - gastado - GASTO.usd * nuevos.length) < 1e-9);
    // El acta y lo contado en vivo dicen que el viajero pidió otra vuelta, y de qué.
    const acta = actaDe(run);
    assert.deepEqual(
      acta.reintentos.map((x) => [x.n, x.en, x.asiento, x.puesto]),
      [[1, "pick", "sights-picker", "sitios-v2"]],
    );
    assert.equal(acta.del_viajero.trabajos, 1);
    assert.ok(Math.abs(acta.del_viajero.usd - GASTO.usd) < 1e-9);
    const contado = vivo(run);
    assert.ok(contado.indexOf("stopped:pick:") < contado.indexOf("retry:pick:1"));
    assert.ok(contado.indexOf("retry:pick:1") < contado.indexOf("done::"));
  });
});

test("en rojo tras sus vueltas y la del conductor: se pide otra, con lo devuelto, sin el conductor", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({
      puesto: (id) => (id.startsWith("ruta") && vuelta(id) <= 4 ? "rojo" : "bien"),
      conductor: otraVuelta,
    });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.parado?.en, "route");
    assert.deepEqual(lanzador.lanzados, ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1", "ruta-v4"]);
    // La parada nueva no es la que miró el conductor: la web dice lo del código.
    assert.deepEqual(paradaDeCara(run), {
      at: "route",
      kind: "seat_kept_failing",
      options: ["retry", "change_request"],
      said: null,
      looking: false,
      resumes: true,
    });

    reintentar(run);
    // Lo devuelto a la quinta: lo que estaba mal en la cuarta y su entrega, como en cualquier vuelta; sin indicación.
    const devuelto = leerJson(join(run, "puestos", "ruta-v5", "in", "returned.json"));
    assert.equal(devuelto.delivery.seat, "someone-else");
    assert.ok(devuelto.what_was_wrong.some((x: Objeto) => x.donde === "seat"));
    assert.equal(devuelto.from_the_conductor, undefined);
    const material = (p: string): string[] => readdirSync(join(run, "puestos", p, "in")).sort();
    assert.deepEqual(material("ruta-v5"), material("ruta-v4"));

    const otra = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(otra.hecho, true);
    // La quinta pasó las mismas puertas que cualquiera, y el conductor sigue siendo uno.
    assert.equal(leerJson(join(run, "ruta-v5.puertas.json")).verde, true);
    assert.equal(lanzador.lanzados.filter((p) => p.startsWith("conductor")).length, 1);
    assert.equal(lanzador.lanzados.filter((p) => p.startsWith("ruta")).length, 5);
  });
});

test("un reintento que vuelve a fallar: se para otra vez, se puede volver a pedir, y con un tope", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ puesto: (id) => (id.startsWith("ruta") ? "rojo" : "bien") });
    await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(paradaDeCara(run)?.resumes, true);
    for (let n = 1; n <= REINTENTOS_POR_RUN; n++) {
      assert.equal(reintentar(run).n, n);
      const r = await llevar(run, fuentesInventadas(), lanzador);
      assert.equal(r.parado?.en, "route");
      assert.equal(actaDe(run).parada?.puesto, `ruta-v${3 + n}`);
    }
    // Cada pulsación, una vuelta de un asiento, y ni una más; el conductor, una vez.
    assert.deepEqual(
      lanzador.lanzados,
      ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1", "ruta-v4", "ruta-v5", "ruta-v6"].slice(
        0,
        4 + REINTENTOS_POR_RUN,
      ),
    );
    // En el tope no se ofrece repetirlo: queda cambiar lo pedido. Y la casa no lo hace aunque se lo pidan.
    assert.deepEqual(paradaDeCara(run)?.options, ["change_request"]);
    assert.equal(paradaDeCara(run)?.resumes, false);
    niega(() => reintentar(run), "too_many");
    // Lo contado: cada pulsación y cada parada que vino después, una vez cada una.
    const contado = vivo(run);
    for (let n = 1; n <= REINTENTOS_POR_RUN; n++) {
      assert.equal(contado.filter((s) => s === `retry:route:${n}`).length, 1);
      assert.equal(contado.filter((s) => s === `stopped:route:${n}`).length, 1);
    }
    assert.equal(leerJson(join(run, REINTENTOS)).length, REINTENTOS_POR_RUN);
  });
});

test("no se retoma lo que no paró un asiento: sin parada, con el viaje hecho, o una parada del código", async () => {
  // Sin parada.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    niega(() => reintentar(run), "not_now");
  });
  // Con el viaje ya hecho.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({}));
    assert.equal(r.hecho, true);
    niega(() => reintentar(run), "not_now");
  });
  // Nada que elegir: sin ningún sitio que ver, para el código, y lo que queda es cambiar lo pedido.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const fuentes = { ...fuentesInventadas(), sitios: async () => [] };
    await llevar(run, fuentes, lanzadorConGuion({}));
    assert.equal(paradaDeCara(run)?.resumes, false);
    niega(() => reintentar(run), "not_now");
    assert.ok(!existsSync(join(run, REINTENTOS)));
  });
  // El techo de gasto: no se retoma así (empezar otra vez es lo de antes, y lo que se gasta lo decide el PM).
  await conRun(async (run) => {
    darElAdelante(run, GASTO.usd * 2);
    const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({ puesto: () => "rojo" }), { conductor: false });
    assert.equal(r.parado?.paso, "el gasto");
    assert.equal(paradaDeCara(run)?.kind, "spend_ceiling");
    assert.equal(paradaDeCara(run)?.resumes, false);
    niega(() => reintentar(run), "not_now");
  });
  // Mientras el conductor mira la parada, tampoco.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    await llevar(run, fuentesInventadas(), lanzadorConGuion({ puesto: () => "rojo" }), { conductor: false });
    const parado = actaDe(run).parada;
    writeFileSync(
      join(run, CONDUCTOR),
      JSON.stringify({
        puesto: "conductor-1",
        para: { puesto: parado?.puesto, asiento: parado?.asiento, vuelta: 3, clase: parado?.clase, en: parado?.en },
        estado: "working",
        rojos: [],
        decision: null,
        kind: null,
        options: [],
        message: null,
        hint: "",
        vuelta_extra: null,
      }),
    );
    assert.equal(paradaDeCara(run)?.looking, true);
    assert.equal(paradaDeCara(run)?.resumes, false);
    niega(() => reintentar(run), "not_now");
  });
});

test("la casa que se rompió a medias: volver a intentarlo sigue donde se cortó, sin repetir nada", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({});
    // La casa se rompe tras la ruta: como lo deja la puerta al romperse, con la parada de la casa.
    let rota = true;
    const fuentes = fuentesInventadas();
    const buscar = fuentes.alojamiento;
    const conFallo = {
      ...fuentes,
      alojamiento: new Proxy(buscar, {
        get(objetivo, nombre, receptor) {
          if (rota) throw new Error("se rompió");
          return Reflect.get(objetivo, nombre, receptor);
        },
      }),
    };
    await assert.rejects(llevar(run, conFallo, lanzador));
    pararRun(run, "search", "la casa", [{ donde: "house", que: "la casa se rompió mientras investigaba" }]);
    assert.equal(paradaDeCara(run)?.kind, "house_broke");
    assert.equal(paradaDeCara(run)?.resumes, true);
    const antes = [...lanzador.lanzados];
    rota = false;
    assert.deepEqual(reintentar(run).puesto, null);
    const r = await llevar(run, conFallo, lanzador);
    assert.equal(r.hecho, true);
    for (const id of lanzador.lanzados.slice(antes.length)) assert.ok(!antes.includes(id), id);
    assert.equal(leerJson(join(run, REINTENTOS))[0].aplicado, true);
  });
});

test("un corte de la casa a medio reintento: la pulsación siguiente lo acaba, sin contar otra", async () => {
  // Cortada tras apuntar la pulsación y antes de montar la vuelta (o de llevarla): el run sigue parado.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ puesto: (id) => (id === "ruta-v1" ? "rompe" : "bien") });
    await llevar(run, fuentesInventadas(), lanzador, { conductor: false });
    assert.equal(reintentar(run).puesto, "ruta-v2");
    // Lo que deja un corte a medio montar: un puesto sin sello, y sin su orden.
    rmSync(join(run, "sellos", "ruta-v2.json"));
    rmSync(join(run, "ordenes", "ruta-v2.txt"));
    assert.ok(existsSync(join(run, "parado.json")));
    assert.equal(paradaDeCara(run)?.resumes, true);
    assert.equal(reintentar(run).n, 1);
    assert.ok(existsSync(join(run, "sellos", "ruta-v2.json")) && existsSync(join(run, "ordenes", "ruta-v2.txt")));
    const r = await llevar(run, fuentesInventadas(), lanzador, { conductor: false });
    assert.equal(r.hecho, true);
    assert.equal(leerJson(join(run, REINTENTOS)).length, 1);
    assert.equal(lanzador.lanzados.filter((p) => p.startsWith("ruta")).length, 2);
  });
  // Cortada con la vuelta nueva trabajando: al llevarla otra vez se da por fallida, para, y se puede volver a pedir.
  // Sin techo, como lo da la web: con uno, lo que gastó la vuelta cortada no se sabe y la casa no sigue a ciegas.
  await conRun(async (run) => {
    darElAdelante(run, null);
    const lanzador = lanzadorConGuion({ puesto: (id) => (id === "ruta-v1" ? "rompe" : "bien") });
    await llevar(run, fuentesInventadas(), lanzador);
    reintentar(run);
    assert.equal(aplicarReintento(run), true);
    assert.equal(aplicarReintento(run), false);
    apuntarTrabajo(run, {
      puesto: "ruta-v2",
      asiento: "route-planner",
      estado: "working",
      desde: new Date().toISOString(),
      hasta: null,
      gasto: null,
      fallo: null,
    });
    const parado = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(parado.parado?.en, "route");
    assert.equal(actaDe(run).parada?.puesto, "ruta-v2");
    assert.equal(actaDe(run).parada?.clase, "seat_did_not_finish");
    // Sin el conductor otra vez, y sin relanzar la vuelta cortada.
    assert.equal(lanzador.lanzados.filter((p) => p.startsWith("conductor")).length, 1);
    assert.ok(!lanzador.lanzados.includes("ruta-v2"));
    assert.equal(reintentar(run).puesto, "ruta-v3");
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.hecho, true);
  });
});

test("los que miran alojamientos: la vuelta nueva ocupa su sitio en la lista y se recoge como cualquiera", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ puesto: (id) => (id === "a2-p1" || id === "sitios-v1" ? "rompe" : "bien") });
    await llevar(run, fuentesInventadas(), lanzador, { conductor: false });
    assert.equal(actaDe(run).parada?.puesto, "sitios-v1");
    // Hoy uno que mira no para el run por sí solo (su alojamiento se queda sin mirar): la parada se escribe a mano.
    rmSync(join(run, "parado.json"));
    pararRun(run, "look", "mirar", [{ donde: "a2-p1", que: "no entregó" }]);
    assert.equal(actaDe(run).parada?.asiento, "lodging-viewer");
    assert.equal(reintentar(run).puesto, "a2-p1-v2");
    const quienes = leerJson(join(run, "mirar.json")).quienes.map((q: Objeto) => q.puesto);
    assert.ok(quienes.includes("a2-p1-v2") && !quienes.includes("a2-p1"));
    // Sigue parado por el que elige los sitios: se pide otra vez, y sale el viaje con el alojamiento mirado.
    await llevar(run, fuentesInventadas(), lanzador, { conductor: false });
    assert.equal(actaDe(run).parada?.puesto, "sitios-v1");
    assert.equal(reintentar(run).puesto, "sitios-v2");
    const r = await llevar(run, fuentesInventadas(), lanzador, { conductor: false });
    assert.equal(r.hecho, true);
    assert.equal(lanzador.lanzados.filter((p) => p.startsWith("a2-p1")).length, 2);
    const a2 = leerJson(join(run, "como_es.json")).alojamientos[1];
    assert.equal(a2.pasadas[0].puesto, "a2-p1-v2");
    assert.equal(a2.pasadas[0].comoEs.verde, true);
    assert.ok(readFileSync(join(run, "vivo.jsonl"), "utf8").includes('"clase":"retry"'));
  });
});
