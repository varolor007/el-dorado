// Lo que eliges y lo que pides pasa a la versión siguiente (la revisión de la tanda 6): tus elecciones, de la versión
// de la que parte un cambio, y lo pedido en un momento (el vuelo, sus países, la búsqueda del alojamiento), por toda
// la cadena de versiones mientras siga valiendo. Con el caso inventado y asientos de mentira: sin internet y sin
// gastar.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buscarConLoPedido, DEL_ALOJAMIENTO, type ComoBuscar } from "../../agent/launcher/alojamiento.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { abrirViaje, leerVersion, leerViaje, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { guardarElecciones, leerElecciones } from "../../agent/launcher/momentos.ts";
import { buscarElTransporte, loQuePideLaOpcion } from "../../agent/launcher/otro_transporte.ts";
import { papelesDelRun } from "../../agent/launcher/papeles.ts";
import { loPedidoDe, rehacer, type AlRehacer } from "../../agent/launcher/rehacer.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import type { PedidoDeAlojamiento } from "../../agent/scripts/alojamiento.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { pedidoDelTransporte } from "../../agent/scripts/otro_transporte.ts";
import { fuentesInventadas, lanzadorDeMentira } from "../cases/inventado/asientos.ts";
import { ENTENDIDO, transporteInventado } from "../cases/inventado/investigacion.ts";

const ahora = (): Date => new Date("2027-01-10T09:00:00Z");

async function viajeEnElMapa(): Promise<{ mesa: string; v: ViajeEnLaMesa }> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: ahora() });
  pasar(v, "confirmed", ahora());
  const run = nuevoRun(v, ahora());
  darElAdelante(run, null, ahora());
  assert.equal((await llevar(run, fuentesInventadas(), lanzadorDeMentira())).hecho, true);
  await esperarLoDeDetras(run);
  return { mesa, v: leerViaje(v.ficha.id, "ana", mesa) };
}

/** Rehace con un cambio y lo lleva: la carpeta del run y el viaje, ya con su versión nueva. */
async function cambia(mesa: string, id: string, o: AlRehacer): Promise<{ run: string; v: ViajeEnLaMesa }> {
  const { run } = rehacer(leerViaje(id, "ana", mesa), { ...o, cuando: ahora() });
  darElAdelante(run, null, ahora());
  const r = await llevar(run, fuentesInventadas(), lanzadorDeMentira());
  await esperarLoDeDetras(run);
  assert.equal(r.parado, null, JSON.stringify(r.parado));
  assert.equal(r.hecho, true);
  return { run, v: leerViaje(id, "ana", mesa) };
}

const viajeDe = (v: ViajeEnLaMesa): Viaje => leerVersion(v)?.viaje as Viaje;
const entendidoDe = (v: ViajeEnLaMesa): Entendido => leerVersion(v)?.entendido as Entendido;
const BASE: ComoBuscar = { donde: [], minimos: [], radios: [1], tope: null };

test("lo pedido dura por la cadena de versiones mientras sigue valiendo", async () => {
  const { mesa, v } = await viajeEnElMapa();
  const id = v.ficha.id;
  try {
    // 2: eliges el vuelo a XXX, los mismos días, con su país de más para los papeles.
    const b = await buscarElTransporte(v, transporteInventado(), { arrival: "XXX" }, ahora());
    const opcion = b.opciones.find((o) => !o.nights.changed)!;
    const dos = await cambia(mesa, id, loQuePideLaOpcion(v, b.n, opcion.id));
    assert.equal(viajeDe(dos.v).transportes[0].a, "XXX");

    // 3: cambias lo que quieres gastar. El vuelo elegido sigue, y no el más barato de la búsqueda.
    const tres = await cambia(mesa, id, { clases: ["budget"], entendido: { ...entendidoDe(dos.v), budget: "tight" } });
    assert.equal(pedidoDelTransporte(loPedidoDe(tres.run, "transport"))?.flight.destino, "XXX");
    assert.equal(viajeDe(tres.v).transportes[0].a, "XXX");

    // 4: buscas otra vez dónde dormir, con tus mínimos. El vuelo sigue; la búsqueda nueva va en su run.
    const minimos: PedidoDeAlojamiento = {
      zone: null,
      minimums: { score: 1, reviews: 1, stars: 0 },
      max_price: 100000,
      tastes: [{ thing: "gym", weight: "indifferent" }],
    };
    const cuatro = await cambia(mesa, id, { clases: ["lodging"], pedido: { [DEL_ALOJAMIENTO]: minimos } });
    assert.equal(viajeDe(cuatro.v).transportes[0].a, "XXX");
    assert.deepEqual(loPedidoDe(cuatro.run, "lodging"), minimos);

    // 5: un viajero más, con otro pasaporte. Los papeles se rehacen con el país de más del vuelo; se buscan los
    // mínimos que pediste, y el tope, que era del alojamiento entero para dos, ya no.
    const pasaportes = { ...entendidoDe(cuatro.v) };
    pasaportes.travellers = { ...pasaportes.travellers, adults: 3, passports: ["YY", "YY", "XX"] };
    const cinco = await cambia(mesa, id, { clases: ["travellers", "passports"], entendido: pasaportes });
    assert.ok(papelesDelRun(cinco.run)?.casillas.some((c) => c.pais === "WW"));
    assert.equal(viajeDe(cinco.v).transportes[0].a, "XXX");
    const heredado = loPedidoDe(cinco.run, "lodging") as PedidoDeAlojamiento;
    assert.deepEqual(heredado.minimums, minimos.minimums);
    assert.deepEqual(heredado.tastes, minimos.tastes);
    assert.equal(heredado.max_price, null);
    assert.deepEqual(buscarConLoPedido(cinco.run, BASE).minimos, [{ nota: 1, opiniones: 1, estrellas: 0 }]);

    // 6: otro gusto del alojamiento en lo que pediste: manda el nuevo, no el marcado antes.
    const gustos = entendidoDe(cinco.v);
    const gym = { ...gustos, tastes: gustos.tastes.map((g) => (g.thing === "gym" ? { ...g, weight: "like" } : g)) };
    const seis = await cambia(mesa, id, { clases: ["lodging_taste"], entendido: gym as Entendido });
    assert.equal((loPedidoDe(seis.run, "lodging") as PedidoDeAlojamiento).tastes, null);

    // 7: otras fechas. El vuelo ya no es de ellas, ni su país: vuelve el transporte de la búsqueda.
    const fechas = entendidoDe(seis.v);
    const otras = { ...fechas, dates: { ...fechas.dates, check_in: "2027-03-12", check_out: "2027-03-15" } };
    const siete = await cambia(mesa, id, { clases: ["dates"], entendido: otras });
    assert.equal(loPedidoDe(siete.run, "transport"), null);
    assert.ok(!(papelesDelRun(siete.run)?.casillas.some((c) => c.pais === "WW") ?? false));
    assert.equal(viajeDe(siete.v).transportes[0].a, "VVV");
    assert.deepEqual((loPedidoDe(siete.run, "lodging") as PedidoDeAlojamiento).minimums, minimos.minimums);

    // 8: otra búsqueda de alojamiento pisa la heredada.
    const otra: PedidoDeAlojamiento = { zone: null, minimums: null, max_price: 90000, tastes: null };
    const ocho = await cambia(mesa, id, { clases: ["lodging"], pedido: { [DEL_ALOJAMIENTO]: otra } });
    assert.deepEqual(loPedidoDe(ocho.run, "lodging"), otra);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("tus elecciones pasan a la versión que sale de un cambio, con lo que sigue siendo del viaje", async () => {
  const { mesa, v } = await viajeEnElMapa();
  const id = v.ficha.id;
  try {
    const viaje = viajeDe(v);
    const [p1, p2] = viaje.paradas.map((p) => p.id);
    guardarElecciones(v, { way: "cheapest", pace: "calm", removed: [p1], moved: { [p2]: 0 } }, ahora());
    // Un cambio de lo que pediste (el gasto), otro alojamiento y otro transporte: lo que quitaste no vuelve.
    const dos = await cambia(mesa, id, { clases: ["budget"], entendido: { ...entendidoDe(v), budget: "tight" } });
    const e2 = leerElecciones(dos.v);
    assert.equal(e2.way, "cheapest");
    assert.equal(e2.pace, "calm");
    assert.deepEqual(e2.removed, [p1]);
    assert.deepEqual(e2.moved, { [p2]: 0 });
    const nada: PedidoDeAlojamiento = { zone: null, minimums: null, max_price: null, tastes: null };
    const tres = await cambia(mesa, id, { clases: ["lodging"], pedido: { [DEL_ALOJAMIENTO]: nada } });
    assert.deepEqual(leerElecciones(tres.v).removed, [p1]);
    // Lo que eliges en la nueva manda en la siguiente.
    guardarElecciones(tres.v, { way: "different", removed: [] }, ahora());
    const cuatro = await cambia(mesa, id, { clases: ["pace"], entendido: { ...entendidoDe(tres.v), pace: "full" } });
    assert.equal(leerElecciones(cuatro.v).way, "different");
    assert.deepEqual(leerElecciones(cuatro.v).removed, []);
    // Si el momento pasa sus elecciones, mandan esas.
    const cinco = await cambia(mesa, id, { clases: ["day"], pedido: { choices: { way: "cheapest" } } });
    assert.equal(leerElecciones(cinco.v).way, "cheapest");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
