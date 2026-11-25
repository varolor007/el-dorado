// Las entradas en los demás momentos (14.7): por qué no se miró un sitio (el tope, su tanda o que lo añadiste); que al
// rehacer con los mismos días las de antes siguen valiendo y no se vuelven a pagar; tu botón, que mira solo los que
// no se miraron, con su puerta 13; y lo que cierra en tus días. Con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SITIOS_EN_TOTAL, SITIOS_POR_LLAMADA } from "../../agent/data/capa_entradas.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import {
  avisosDeLosAbiertos,
  porQueSinMirar,
  repartirLasEntradas,
  tandasDeSitios,
  traerLosAbiertos,
} from "../../agent/launcher/capa_entradas.ts";
import { FalloDeUnDia, pedirLasEntradas, prepararLasEntradas } from "../../agent/launcher/dia_a_dia.ts";
import { abrirViaje, leerVersion, leerViaje, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { pegasDeLasEntradas, type DeLasEntradas } from "../../agent/output/capas.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { entradaAbierta } from "../../agent/scripts/capa_entradas.ts";
import { sinConfirmarDe } from "../../agent/scripts/cierre.ts";
import { cierranTusDias, sitiosSinMirar } from "../../agent/scripts/dia_a_dia.ts";
import { impactoDe } from "../../agent/scripts/impacto.ts";
import { CODIGO } from "../../agent/data/pasos.ts";
import type { Sitio } from "../../agent/tools/sitios.ts";
import { fuentesInventadas, lanzadorDeMentira, leerJson } from "../cases/inventado/asientos.ts";
import { ENTENDIDO, SITIOS } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

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

const viajeDe = (v: ViajeEnLaMesa): Viaje => leerVersion(v)?.viaje as Viaje;

/** Deja un sitio de la versión que se ve, y de su run, como si no se hubiera mirado. */
function sinMirarUno(v: ViajeEnLaMesa, id: string): void {
  const n = v.ficha.version as number;
  const enLaVersion = join(v.carpeta, "versiones", String(n), "viaje.json");
  const viaje = JSON.parse(readFileSync(enLaVersion, "utf8")) as Viaje;
  const run = join(v.carpeta, "runs", String(v.ficha.versiones.find((x) => x.n === n)?.run));
  const enElRun = JSON.parse(readFileSync(join(run, "entradas.json"), "utf8")) as DeLasEntradas;
  const quita = (e: DeLasEntradas): DeLasEntradas => ({
    ...e,
    sitios: e.sitios.map((x) => (x.parada === id ? entradaAbierta(id, undefined, "over_limit") : x)),
  });
  writeFileSync(enLaVersion, JSON.stringify({ ...viaje, entradas: quita(viaje.entradas!) }));
  writeFileSync(join(run, "entradas.json"), JSON.stringify(quita(enElRun)));
}

// ---------- por qué no se miró

test("por qué no se miró: el que pasa del tope, por el tope; el de una tanda que no entregó, porque falló", () => {
  const muchos: Sitio[] = Array.from({ length: SITIOS_EN_TOTAL + 2 }, (_, i) => ({ ...SITIOS[0], id: `S${i}` }));
  const tandas = tandasDeSitios(muchos);
  const entregas = tandas.map((_, i) => (i === 1 ? null : { seat: "tickets" }));
  const porQue = porQueSinMirar(muchos, entregas);
  for (const s of tandas[1]) assert.equal(porQue[s.id], "failed");
  for (const s of tandas[0]) assert.equal(porQue[s.id], undefined);
  assert.equal(porQue[`S${SITIOS_EN_TOTAL}`], "over_limit");
  assert.equal(porQue[`S${SITIOS_EN_TOTAL + 1}`], "over_limit");
  // La forma lo deja decir, y no deja un porqué que no es de la lista, ni uno en lo que sí se miró.
  const bien: DeLasEntradas = { sitios: [entradaAbierta("S0", undefined, "added")], falta: null };
  assert.deepEqual(pegasDeLasEntradas(bien, ["S0"]), []);
  const raro = { sitios: [{ ...bien.sitios[0], sinMirar: "otro" }], falta: null } as unknown as DeLasEntradas;
  assert.equal(pegasDeLasEntradas(raro, ["S0"]).length, 1);
  const mirado = { sitios: [{ ...bien.sitios[0], mirado: true }], falta: null } as DeLasEntradas;
  assert.equal(pegasDeLasEntradas(mirado, ["S0"]).length, 1);
});

test("al rehacer con los mismos días: las de antes se quedan; lo nuevo, con los datos abiertos y como tuyo", () => {
  const [a, b, c] = SITIOS;
  const deAntes = [{ ...entradaAbierta(a.id, undefined), mirado: true, sinMirar: null }];
  const { aMirar, fijas } = repartirLasEntradas([a, b, c], deAntes, [c.id], []);
  assert.deepEqual(
    aMirar.map((s) => s.id),
    [c.id],
  );
  assert.deepEqual(fijas[0], deAntes[0]);
  assert.equal(fijas[1].parada, b.id);
  assert.equal(fijas[1].sinMirar, "added");
});

// ---------- lo que cuesta cada cambio con las entradas

test("el impacto: un mensaje para un día no vuelve a pagar las entradas; otras fechas sí; tu botón, solo ellas", () => {
  const quien = (clases: Parameters<typeof impactoDe>[0]): string | undefined =>
    impactoDe(clases).redo.find((x) => x.step === "tickets")?.who;
  assert.equal(quien(["day"]), CODIGO);
  assert.equal(quien(["looking_for"]), CODIGO);
  assert.equal(quien(["dates"]), "tickets");
  assert.equal(quien(["destination"]), "tickets");
  assert.equal(quien(["travellers"]), undefined);
  const boton = impactoDe(["tickets"], { tickets: { usd: 0.3, de: 1 } });
  assert.deepEqual(
    boton.redo.map((x) => x.step),
    ["tickets", "days", "budget", "trip"],
  );
  assert.equal(boton.spends, true);
  assert.equal(boton.cost.usd, 0.3);
  assert.ok(boton.keep.includes("cross") && boton.keep.includes("explain") && boton.keep.includes("pick"));
});

// ---------- tu botón

test("tu botón: mira solo los sitios que no se miraron, con su puerta, y lo demás se queda como estaba", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const antes = viajeDe(v);
    // En el caso inventado se miraron todos: no hay nada que mirar.
    assert.throws(() => prepararLasEntradas(v, { cuando: ahora() }), FalloDeUnDia);
    const elegido = antes.entradas!.sitios[0].parada;
    sinMirarUno(v, elegido);
    const conUno = leerViaje(v.ficha.id, "ana", mesa);
    assert.deepEqual(sitiosSinMirar(viajeDe(conUno)), [elegido]);
    assert.deepEqual(prepararLasEntradas(conUno, { cuando: ahora() }).sights, [elegido]);
    // Pedir uno que sí se miró no pide nada; lo pedido mal escrito no vale.
    const otro = antes.entradas!.sitios[1].parada;
    assert.throws(() => prepararLasEntradas(conUno, { sights: [otro], cuando: ahora() }), /nothing_to_look/);
    assert.throws(() => prepararLasEntradas(conUno, { sights: "todo", cuando: ahora() }), /bad_sights/);

    const { run } = pedirLasEntradas(conUno, { cuando: ahora() });
    darElAdelante(run, null, ahora());
    const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
    await esperarLoDeDetras(run);
    assert.equal(r.parado, null, JSON.stringify(r.parado));
    assert.equal(r.hecho, true);
    const asientos = r.lanzados.map((p) => leerJson(join(run, "sellos", `${p}.json`)).asiento as string);
    assert.deepEqual(asientos, ["tickets"]);
    // Al de las entradas solo se le dio ese sitio.
    const puesto = readdirSync(join(run, "puestos")).find((x) => x.startsWith("entradas"))!;
    const dados = leerJson(join(run, "puestos", puesto, "in", "sights.json")) as { id: string }[];
    assert.deepEqual(
      dados.map((x) => x.id),
      [elegido],
    );
    const despues = viajeDe(leerViaje(v.ficha.id, "ana", mesa));
    const suya = despues.entradas!.sitios.find((x) => x.parada === elegido)!;
    assert.equal(suya.mirado, true);
    assert.equal(suya.sinMirar ?? null, null);
    // Las demás, como estaban.
    for (const e of antes.entradas!.sitios.filter((x) => x.parada !== elegido))
      assert.deepEqual(
        despues.entradas!.sitios.find((x) => x.parada === e.parada),
        e,
      );
    assert.equal(despues.maneras.length, antes.maneras.length);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("tu botón tiene tope, como los mensajes: como mucho los sitios de una llamada", () => {
  const paradas = Array.from({ length: SITIOS_POR_LLAMADA + 3 }, (_, i) => ({ id: `S${i}` }));
  const v = {
    paradas,
    entradas: { sitios: paradas.map((p) => entradaAbierta(p.id, undefined, "over_limit")), falta: null },
  } as unknown as Viaje;
  assert.equal(sitiosSinMirar(v).length, SITIOS_POR_LLAMADA);
  // Sin entradas, o si faltan entera, no hay botón: no se sabe qué mirar.
  assert.deepEqual(sitiosSinMirar({ ...v, entradas: { sitios: [], falta: "failed" } }), []);
});

// ---------- lo que cierra en tus días

test("lo que cierra en tus días: lo que moviste a un día que cierra se queda, y se dice", () => {
  const cierra = { a: ["2031-03-09"], b: [] };
  const dias = [
    { fecha: "2031-03-08", paradas: ["a", "b"] },
    { fecha: "2031-03-09", paradas: ["a", "c"] },
  ];
  assert.deepEqual(cierranTusDias(cierra, dias), { "2031-03-09": ["a"] });
  assert.deepEqual(cierranTusDias({}, dias), {});
});

test("al cerrar: una parada que pusiste un día que cierra queda sin confirmar, con su día", async () => {
  const { mesa, v } = await viajeEnElMapa();
  try {
    const viaje = viajeDe(v);
    const dia = viaje.dias.find((d) => d.paradas.length > 0)!;
    const parada = dia.paradas[0];
    const fuente = { url: "https://sitios.inventado.example/horario", visto: "2027-01-10" };
    const cerrado = { desde: null, hasta: null, franjas: [], cierra: [dia.fecha], fuente };
    const entradas: DeLasEntradas = {
      falta: null,
      sitios: viaje.entradas!.sitios.map((e) => (e.parada === parada ? { ...e, horarios: [cerrado] } : e)),
    };
    const conEl = sinConfirmarDe({ ...viaje, entradas }, [], [], "ok");
    assert.ok(conEl.some((x) => x.que === "stop_closed" && x.ref === dia.fecha));
    assert.ok(!sinConfirmarDe(viaje, [], [], "ok").some((x) => x.que === "stop_closed"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("lo que avisan los datos abiertos de las entradas queda en los avisos del run, no en la consola", async () => {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-run-"));
  try {
    const traer = async (sitios: Sitio[], avisar?: (texto: string) => void) => {
      avisar?.("sin el horario ni si se paga de OpenStreetMap: 1");
      return sitios.map((s) => ({ sitio: s.id, web: null, horario: null, dePago: null, fuentes: [] }));
    };
    await traerLosAbiertos(run, [SITIOS[0]], traer as never);
    assert.deepEqual(avisosDeLosAbiertos(run), ["datos abiertos: sin el horario ni si se paga de OpenStreetMap: 1"]);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
