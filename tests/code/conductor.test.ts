// El acta del run y el conductor: lo que pasó en un run, sacado del disco, y el asiento que mira un run parado por un
// asiento y elige una de dos salidas, que hace la casa. Con asientos de mentira y el caso inventado: sin gastar.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { ACTA, CLASES_DEL_CONDUCTOR, CONDUCTOR, DECISIONES, SALIDAS_DEL_VIAJERO } from "../../agent/data/conductor.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { puertaConductor } from "../../agent/gates/puerta_conductor.ts";
import { actaDe, actaDeCara, escribirActa, paradaDeCara } from "../../agent/launcher/acta.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import { puestosDe } from "../../agent/launcher/puesto.ts";
import { trabajosDe } from "../../agent/launcher/trabajos.ts";
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

const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "conductor");

async function conRun(prueba: (run: string) => Promise<void>): Promise<void> {
  const run = runNuevo();
  try {
    await prueba(run);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
}

/** Lo que le pasa a cada puesto: trabajar bien, entregar en rojo, romperse o, si es el conductor, entregar esto. */
type Guion = {
  ruta?: (vuelta: number) => "bien" | "rojo" | "rompe";
  conductor?: ((parada: Objeto) => Objeto) | "rompe";
};

/** Un lanzador de mentira con guion: la ruta hace lo que diga su vuelta, y el conductor entrega lo que se le diga. */
/** Los asientos que corren por detrás: aquí trabajan bien y de balde, y no se cuentan entre los lanzados. */
const DE_DETRAS = new Set(["calendar", "papers"]);

function lanzadorConGuion(g: Guion): Lanzador & { lanzados: string[] } {
  const lanzador = (async (_orden, puesto) => {
    const run = resolve(puesto.carpeta, "..", "..");
    if (DE_DETRAS.has(puesto.asiento)) {
      trabaja(run, puesto.id);
      return { ...GASTO, usd: 0 };
    }
    lanzador.lanzados.push(puesto.id);
    if (puesto.asiento === "conductor") {
      if (g.conductor === "rompe") throw Object.assign(new Error("la IA no contestó"), { gasto: GASTO });
      const parada = leerJson(join(puesto.carpeta, "in", "stop.json"));
      const entrega = (g.conductor ?? entregaDelConductor)(parada);
      const textos = seisPasos(readdirSync(join(puesto.carpeta, "in")).sort(), entrega);
      for (const nombre of [...PASOS, ENTREGA]) writeFileSync(join(puesto.carpeta, "out", nombre), textos[nombre]);
      return GASTO;
    }
    const vuelta = Number(/-v(\d+)$/.exec(puesto.id)?.[1] ?? 1);
    const que = puesto.asiento === "route-planner" ? (g.ruta?.(vuelta) ?? "bien") : "bien";
    if (que === "rompe") throw Object.assign(new Error("la IA se cortó a medias"), { gasto: GASTO });
    // Un rojo de forma: la entrega dice ser de otro asiento.
    trabaja(run, puesto.id, que === "rojo" ? (_a, e) => void (e.seat = "someone-else") : undefined);
    return GASTO;
  }) as Lanzador & { lanzados: string[] };
  lanzador.lanzados = [];
  return lanzador;
}

/** Una vuelta más con su indicación: lo que haría un conductor ante un rojo de forma con arreglo claro. */
const otraVuelta = (): Objeto => ({
  seat: "conductor",
  decision: "retry_with_hint",
  hint: "The field seat is always route-planner (DELIVERY.md, its first field).",
  kind: "seat_kept_failing",
  options: ["retry"],
  message: "",
  why: "The same red of form came back three times; the fix is clear.",
});

const huella = (ruta: string): string => createHash("sha256").update(readFileSync(ruta)).digest("hex");

test("el acta de un run hecho: cada paso, cada trabajo con su vuelta, tiempo y gasto, nada repetido", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({}));
    assert.equal(r.hecho, true);
    // La deja la casa al volver, y es la que se rehace del disco.
    assert.ok(existsSync(join(run, ACTA)));
    const acta = leerJson(join(run, ACTA));
    assert.deepEqual(acta, JSON.parse(JSON.stringify(actaDe(run))));
    assert.equal(acta.hecho, true);
    assert.equal(acta.parada, null);
    assert.equal(acta.conductor, null);
    assert.ok(acta.pasos.every((p: Objeto) => p.estado === "done"));
    assert.equal(acta.trabajos.length, trabajosDe(run).length);
    // Lo de detrás (el calendario y los papeles) también está en el acta: aquí trabaja de balde.
    const deDetras = (t: Objeto): boolean => DE_DETRAS.has(t.asiento);
    assert.equal(acta.trabajos.filter(deDetras).length, DE_DETRAS.size);
    for (const t of acta.trabajos) {
      assert.equal(t.estado, "done");
      assert.equal(t.usd, deDetras(t) ? 0 : GASTO.usd);
      assert.equal(typeof t.ms, "number");
    }
    assert.equal(acta.trabajos.find((t: Objeto) => t.puesto === "ruta-v1").paso, "route");
    assert.equal(acta.trabajos.find((t: Objeto) => t.puesto === "ruta-v1").puertas, "green");
    assert.deepEqual(acta.vueltas_en_rojo, []);
    assert.deepEqual(acta.repetido, { ms: acta.repetido.ms, usd: 0, trabajos: 0 });
    assert.ok(Math.abs(acta.total.usd - GASTO.usd * (acta.trabajos.length - DE_DETRAS.size)) < 1e-9);
    assert.equal(acta.total.sabido, true);
    // No lleva el texto de ninguna entrega: ni lo que escribió el que explica, ni un resumen de un alojamiento.
    const texto = JSON.stringify(acta);
    for (const entrega of puestosDe(run).map((p) => join(p.carpeta, "out", "delivery.json")))
      for (const [, valor] of Object.entries(leerJson(entrega)))
        if (typeof valor === "string" && valor.length > 30) assert.ok(!texto.includes(valor), valor);
    // Rehacerla da lo mismo: no cuenta nada dos veces.
    assert.deepEqual(JSON.parse(JSON.stringify(escribirActa(run))), acta);
  });
});

test("una vuelta en rojo que se arregla en la siguiente: el acta dice sus rojos y lo que costó repetirla", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({ ruta: (v) => (v === 1 ? "rojo" : "bien") }));
    assert.equal(r.hecho, true);
    const acta = actaDe(run);
    assert.deepEqual(
      acta.vueltas_en_rojo.map((v) => [v.puesto, v.vuelta, v.paso]),
      [["ruta-v1", 1, "route"]],
    );
    assert.ok(acta.vueltas_en_rojo[0].rojos.some((x) => x.donde === "seat"));
    assert.equal(acta.trabajos.find((t) => t.puesto === "ruta-v1")?.puertas, "red");
    assert.equal(acta.repetido.trabajos, 1);
    assert.equal(acta.repetido.usd, GASTO.usd);
    // Sin parada no hay conductor.
    assert.ok(!existsSync(join(run, CONDUCTOR)));
  });
});

test("parado por un rojo de forma: el conductor pide una vuelta más, la casa la monta y el viaje sale", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ ruta: (v) => (v <= 3 ? "rojo" : "bien"), conductor: otraVuelta });
    // La entrega de la tercera vuelta, antes de que el conductor la mire: nadie la toca.
    let antes: string | null = null;
    const espia = (async (orden, puesto, corte) => {
      if (puesto.asiento === "conductor") antes = huella(join(run, "puestos", "ruta-v3", "out", "delivery.json"));
      return lanzador(orden, puesto, corte);
    }) as Lanzador;
    const r = await llevar(run, fuentesInventadas(), espia);
    assert.equal(r.hecho, true);
    assert.equal(r.parado, null);
    assert.deepEqual(
      lanzador.lanzados.filter((p) => p.startsWith("ruta") || p.startsWith("conductor")),
      ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1", "ruta-v4"],
    );
    assert.equal(huella(join(run, "puestos", "ruta-v3", "out", "delivery.json")), antes);
    // Lo devuelto a la cuarta lleva lo que estaba mal, la entrega devuelta y la indicación del conductor.
    const devuelto = leerJson(join(run, "puestos", "ruta-v4", "in", "returned.json"));
    assert.equal(devuelto.from_the_conductor, otraVuelta().hint);
    assert.ok(devuelto.what_was_wrong.some((x: Objeto) => x.donde === "seat"));
    assert.equal(devuelto.delivery.seat, "someone-else");
    // Y el mismo material que la tercera, sin más.
    const material = (p: string): string[] => readdirSync(join(run, "puestos", p, "in")).sort();
    assert.deepEqual(material("ruta-v4"), material("ruta-v3"));
    // La cuarta pasó las mismas puertas que cualquiera.
    assert.equal(leerJson(join(run, "ruta-v4.puertas.json")).verde, true);
    const acta = actaDe(run);
    assert.equal(acta.conductor?.estado, "retry");
    assert.equal(acta.conductor?.vuelta_extra, "ruta-v4");
    assert.equal(acta.repetido.trabajos, 3);
    assert.equal(acta.del_conductor.usd, GASTO.usd);
    // Lo que se cuenta en vivo: que se paró, que el conductor miró y que dio una vuelta más.
    const vivo = leerVivo(run).map((s) => `${s.clase}:${s.ref ?? ""}`);
    assert.ok(vivo.includes("stopped:route") && vivo.includes("conductor:looking") && vivo.includes("conductor:retry"));
  });
});

test("si la vuelta de más vuelve en rojo, el run se queda parado y ya no se llama al conductor", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ ruta: () => "rojo", conductor: otraVuelta });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.parado?.en, "route");
    assert.deepEqual(lanzador.lanzados, ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1", "ruta-v4"]);
    // Otra llamada a la casa no lanza nada más: ni otro conductor, ni otra vuelta.
    const otra = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(otra.parado?.en, "route");
    assert.equal(lanzador.lanzados.length, 5);
    assert.ok(!puestosDe(run).some((p) => p.id === "ruta-v5" || p.id === "conductor-2"));
    const acta = actaDe(run);
    assert.equal(acta.parada?.clase, "seat_kept_failing");
    assert.equal(acta.parada?.puesto, "ruta-v4");
    assert.equal(acta.vueltas_en_rojo.length, 4);
    // La web dice lo del código: la parada nueva no es la que miró el conductor.
    assert.deepEqual(paradaDeCara(run), {
      at: "route",
      kind: "seat_kept_failing",
      options: ["retry", "change_request"],
      said: null,
      looking: false,
    });
  });
});

test("un run parado porque un asiento no entregó: el conductor puede pedir que trabaje otra vez", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = lanzadorConGuion({ ruta: (v) => (v === 1 ? "rompe" : "bien"), conductor: otraVuelta });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.hecho, true);
    assert.equal(actaDe(run).conductor?.para.clase, "seat_did_not_finish");
    // Lo devuelto dice que no entregó, y no lleva entrega.
    const devuelto = leerJson(join(run, "puestos", "ruta-v2", "in", "returned.json"));
    assert.equal(devuelto.delivery, null);
    assert.match(devuelto.what_was_wrong[0].que, /no entregó: la IA se cortó a medias/);
    // El conductor también ve las vueltas de quien no entregó.
    const vueltas = JSON.parse(readFileSync(join(run, "puestos", "conductor-1", "in", "rounds.json"), "utf8"));
    assert.deepEqual(
      vueltas.map((v: Objeto) => [v.pass, v.state, v.checks]),
      [[1, "failed", "none"]],
    );
  });
});

test("el conductor que cuenta la parada: la web la dice por claves, y su frase solo si pasa su puerta", async () => {
  for (const [message, enseña] of [
    ["No pude comprobar esta parte del viaje. Puedes volver a intentarlo.", true],
    ["Te garantizo que a la próxima sale.", false],
    ["Inténtalo en 5 minutos.", false],
    ["", false],
  ] as const) {
    await conRun(async (run) => {
      darElAdelante(run, 5);
      const conductor = (parada: Objeto): Objeto => ({
        ...entregaDelConductor(parada),
        kind: "nothing_found",
        options: ["change_request"],
        message,
      });
      const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({ ruta: () => "rojo", conductor }));
      assert.equal(r.parado?.en, "route");
      assert.deepEqual(paradaDeCara(run), {
        at: "route",
        kind: "nothing_found",
        options: ["change_request"],
        // El idioma del viajero del caso inventado.
        said: enseña ? { text: message, lang: leerJson(join(run, "entendido.json")).language } : null,
        looking: false,
      });
      assert.equal(actaDe(run).conductor?.estado, "told");
      assert.ok(leerVivo(run).some((s) => s.clase === "conductor" && s.ref === "told"));
    });
  }
});

test("un conductor que devuelve una salida que no existe no hace nada: el run sigue parado", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const conductor = (): Objeto => ({ ...otraVuelta(), decision: "skip_the_step" });
    const lanzador = lanzadorConGuion({ ruta: () => "rojo", conductor });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.parado?.en, "route");
    assert.deepEqual(lanzador.lanzados, ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1"]);
    const c = actaDe(run).conductor;
    assert.equal(c?.estado, "red");
    assert.ok(c?.rojos.some((x) => x.donde === "decision"));
    assert.ok(existsSync(join(run, "parado.json")));
    assert.ok(!puestosDe(run).some((p) => p.id === "ruta-v4"));
    // La web dice lo del código.
    assert.equal(paradaDeCara(run)?.kind, "seat_kept_failing");
  });
});

test("un conductor que intenta dar por buena una puerta o cambiar una entrega no lo consigue", async () => {
  const trampas: ((p: Objeto) => Objeto)[] = [
    () => ({ ...otraVuelta(), verdict: "green" }),
    () => ({ ...otraVuelta(), decision: "stop_and_tell", hint: "", delivery: { seat: "route-planner" } }),
    () => ({ ...otraVuelta(), retries: 5 }),
    () => ({ ...otraVuelta(), options: ["retry", "continue_without"] }),
    () => ({ ...otraVuelta(), kind: "spend_ceiling" }),
  ];
  for (const conductor of trampas) {
    await conRun(async (run) => {
      darElAdelante(run, 5);
      const lanzador = lanzadorConGuion({ ruta: () => "rojo", conductor });
      let antes: string | null = null;
      const espia = (async (orden, puesto, corte) => {
        if (puesto.asiento === "conductor") antes = huella(join(run, "puestos", "ruta-v3", "out", "delivery.json"));
        return lanzador(orden, puesto, corte);
      }) as Lanzador;
      const r = await llevar(run, fuentesInventadas(), espia);
      assert.equal(r.parado?.en, "route");
      assert.equal(actaDe(run).conductor?.estado, "red");
      assert.ok(!puestosDe(run).some((p) => p.id === "ruta-v4"));
      assert.equal(huella(join(run, "puestos", "ruta-v3", "out", "delivery.json")), antes);
      assert.equal(leerJson(join(run, "ruta-v3.puertas.json")).verde, false);
      assert.ok(!existsSync(join(run, "ruta.json")));
    });
  }
});

test("si el conductor falla, el run se queda parado como estaba, con su acta", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), lanzadorConGuion({ ruta: () => "rojo", conductor: "rompe" }));
    assert.equal(r.parado?.en, "route");
    const acta = leerJson(join(run, ACTA));
    assert.equal(acta.conductor.estado, "failed");
    assert.equal(acta.trabajos.find((t: Objeto) => t.puesto === "conductor-1").estado, "failed");
    // Lo que gastó hasta fallar cuenta, aparte.
    assert.equal(acta.del_conductor.usd, GASTO.usd);
    assert.equal(paradaDeCara(run)?.kind, "seat_kept_failing");
  });
});

test("el conductor no se lanza en el techo de gasto, ni a una parada que no es de un asiento", async () => {
  // En el techo: lo gastado por las tres vueltas llega a lo que aceptó el viajero.
  await conRun(async (run) => {
    darElAdelante(run, GASTO.usd * 3);
    const lanzador = lanzadorConGuion({ ruta: () => "rojo", conductor: otraVuelta });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.equal(r.parado?.en, "route");
    assert.deepEqual(lanzador.lanzados, ["ruta-v1", "ruta-v2", "ruta-v3"]);
    assert.ok(!existsSync(join(run, CONDUCTOR)));
  });
  // Con una vuelta de más que llegaría al techo: el conductor se lanza, pero su vuelta no, que la frena la casa.
  await conRun(async (run) => {
    darElAdelante(run, GASTO.usd * 4);
    const lanzador = lanzadorConGuion({ ruta: (v) => (v <= 3 ? "rojo" : "bien"), conductor: otraVuelta });
    const r = await llevar(run, fuentesInventadas(), lanzador);
    assert.deepEqual(lanzador.lanzados, ["ruta-v1", "ruta-v2", "ruta-v3", "conductor-1"]);
    assert.equal(r.parado?.paso, "el gasto");
    assert.ok(r.gasto.usd <= GASTO.usd * 4 + 1e-9);
  });
  // Una parada del código (aquí, sin ningún sitio que ver) no es de ningún asiento.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const fuentes = { ...fuentesInventadas(), sitios: async () => [] };
    const lanzador = lanzadorConGuion({ conductor: otraVuelta });
    const r = await llevar(run, fuentes, lanzador);
    assert.equal(r.parado?.en, "sights");
    assert.deepEqual(lanzador.lanzados, []);
    assert.equal(paradaDeCara(run)?.kind, "nothing_found");
    assert.deepEqual(paradaDeCara(run)?.options, ["change_request"]);
  });
});

test("lo que ve el conductor: la parada, el acta, cada vuelta con sus líneas y el contrato del que paró", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    await llevar(run, fuentesInventadas(), lanzadorConGuion({ ruta: () => "rojo" }));
    const material = join(run, "puestos", "conductor-1", "in");
    assert.deepEqual(readdirSync(material).sort(), ["record.json", "rounds.json", "seat-contract", "stop.json"]);
    assert.deepEqual(readdirSync(join(material, "seat-contract")).sort(), [
      "DELIVERY.md",
      "GUIDE.md",
      "README.md",
      "RULES.md",
    ]);
    const parada = leerJson(join(material, "stop.json"));
    assert.deepEqual(Object.keys(parada).sort(), [
      "allowed_options",
      "can_retry",
      "house_kind",
      "language",
      "seat",
      "step",
    ]);
    assert.equal(parada.seat, "route-planner");
    assert.deepEqual(parada.allowed_options, ["retry", "change_request"]);
    const vueltas = JSON.parse(readFileSync(join(material, "rounds.json"), "utf8"));
    assert.deepEqual(
      vueltas.map((v: Objeto) => v.pass),
      [1, 2, 3],
    );
    // Del viajero, solo su idioma: ni sus fechas, ni a dónde va, ni lo que escribió.
    const entendido = leerJson(join(run, "entendido.json"));
    const todo = readdirSync(material)
      .filter((n) => n.endsWith(".json"))
      .map((n) => readFileSync(join(material, n), "utf8"))
      .join("\n");
    for (const dato of [entendido.destination.name, entendido.dates.check_in, entendido.dates.check_out])
      assert.ok(!todo.includes(dato), dato);
  });
});

test("la puerta del conductor: sus trampas", () => {
  const c = { puedeOtraVuelta: true, salidas: ["retry", "change_request"] as const };
  const rojo = (e: unknown, o = c): string[] => puertaConductor(e, o).rojos.map((r) => r.donde);
  assert.equal(puertaConductor(otraVuelta(), c).verde, true);
  assert.equal(puertaConductor(entregaDelConductor({ allowed_options: ["retry"] }), c).verde, true);
  assert.deepEqual(rojo(null), ["delivery"]);
  assert.deepEqual(rojo([]), ["delivery"]);
  assert.deepEqual(rojo(otraVuelta(), { ...c, puedeOtraVuelta: false }), ["decision"]);
  assert.deepEqual(rojo({ ...otraVuelta(), hint: "" }), ["hint"]);
  assert.deepEqual(rojo({ ...otraVuelta(), hint: "x".repeat(401) }), ["hint"]);
  assert.deepEqual(rojo({ ...otraVuelta(), hint: "one\ntwo" }), ["hint"]);
  assert.deepEqual(rojo({ ...otraVuelta(), decision: "stop_and_tell" }), ["hint"]);
  assert.deepEqual(rojo({ ...otraVuelta(), seat: "route-planner" }), ["seat"]);
  assert.deepEqual(rojo({ ...otraVuelta(), kind: "house_broke" }), ["kind"]);
  assert.deepEqual(rojo({ ...otraVuelta(), options: [] }), ["options"]);
  assert.deepEqual(rojo({ ...otraVuelta(), options: ["retry", "retry"] }), ["options"]);
  assert.deepEqual(rojo({ ...otraVuelta(), options: ["continue_without"] }), ["options"]);
  assert.deepEqual(rojo({ ...otraVuelta(), why: 7 }), ["why"]);
  assert.deepEqual(rojo({ ...otraVuelta(), message: null }), ["message"]);
  const { why: _why, ...sinPorque } = otraVuelta();
  assert.deepEqual(rojo(sinPorque), ["why", "why"]);
  assert.deepEqual(rojo({ ...otraVuelta(), next_step: "trip" }), ["next_step"]);
  // Una frase que no pasa la puerta de palabras no es un rojo: no se enseña, y lo demás vale.
  for (const frase of ["The best price, guaranteed.", "Call +34 600 000 000.", "See www.example.com", "Wait 10 min"]) {
    const v = puertaConductor({ ...otraVuelta(), message: frase }, c);
    assert.equal(v.verde, true, frase);
    assert.equal(v.salida?.message, "", frase);
    assert.ok(v.pegasDeLaFrase.length > 0, frase);
  }
});

test("el contrato del conductor dice sus campos y sus listas, los mismos que mira su puerta", () => {
  const entrega = readFileSync(join(CONTRATO, "DELIVERY.md"), "utf8");
  const campos = [...entrega.matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(campos, Object.keys(otraVuelta()));
  assert.match(entrega, /\| `seat` \| Always `"conductor"` \|/);
  for (const d of DECISIONES) assert.ok(entrega.includes(`\`${d}\``), d);
  for (const k of CLASES_DEL_CONDUCTOR) assert.ok(entrega.includes(`\`${k}\``), k);
  for (const s of SALIDAS_DEL_VIAJERO) assert.ok(entrega.includes(`\`${s}\``), s);
  for (const nombre of ["README.md", "GUIDE.md", "RULES.md"]) assert.ok(existsSync(join(CONTRATO, nombre)));
  // No sale a internet.
  assert.ok(!existsSync(join(CONTRATO, "INTERNET.md")));
});

test("el acta de cara al dueño no lleva el porqué de ningún fallo", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    await llevar(run, fuentesInventadas(), lanzadorConGuion({ ruta: () => "rompe", conductor: "rompe" }));
    const deCara = JSON.stringify(actaDeCara(actaDe(run)));
    assert.ok(!deCara.includes("la IA"));
    assert.ok(JSON.stringify(actaDe(run)).includes("la IA se cortó a medias"));
  });
});
