// Las pruebas de la tabla de caminos (3.14): lo que mide un trayecto con ella, el orden de un día y el alojamiento
// que se elige cuando la fuente de rutas dice cuestas y rodeos, el tope de casillas, la fuente que falla a medias y
// el viaje sin tabla, que se ve como siempre. Con el caso inventado y una fuente de rutas inventada, sin internet.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CASILLAS_POR_VIAJE } from "../../agent/data/moverse.ts";
import { puertaDias } from "../../agent/gates/puerta_dias.ts";
import { sigue, type Fuentes } from "../../agent/launcher/investigar.ts";
import { comprobarViaje, type Parada, type Viaje } from "../../agent/output/viaje.ts";
import { buscarAlojamiento } from "../../agent/scripts/busqueda_alojamiento.ts";
import { casillasDe, enBloques, paresDelViaje, pedirCaminos } from "../../agent/scripts/caminos.ts";
import { cribar, type Candidato } from "../../agent/scripts/cribas.ts";
import { fechasDe, repartir } from "../../agent/scripts/ritmo.ts";
import { caminosDe, trayectoEntre, type TablaDeCaminos } from "../../agent/tools/caminos.ts";
import { andando, enLineaRecta, trayecto, type Punto } from "../../agent/tools/distancias.ts";
import { fuentesInventadas, leerJson, runNuevo, trabaja } from "../cases/inventado/asientos.ts";
import { ESTANCIA, fuenteInventada, MINIMOS } from "../cases/inventado/inventado.ts";
import { ENTENDIDO, miradoInventado, SITIOS } from "../cases/inventado/investigacion.ts";
import { par, rutasInventadas } from "../cases/inventado/rutas.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const VISTO = "2027-01-10T09:00:00.000Z";
const tablaCon = (caminos: TablaDeCaminos["caminos"]): TablaDeCaminos => ({
  fuente: "inventada",
  visto: VISTO,
  caminos,
});
/** Un punto a tantos metros al norte y al este de otro, más o menos. */
const mover = (p: Punto, norte: number, este: number): Punto => ({
  lat: p.lat + norte / 111_320,
  lon: p.lon + este / (111_320 * Math.cos((p.lat * Math.PI) / 180)),
});

const BASE: Punto = { lat: 10.05, lon: 20.05 };
const parada = (id: string, punto: Punto, minutos = 60): Parada => ({
  id,
  nombre: id,
  clase: "monument",
  punto,
  porQue: "Porque sí.",
  minutos,
  imprescindible: false,
  foto: null,
  origen: { fuente: "inventada", visto: VISTO, enlace: null },
});

test("un trayecto sin tabla es el de siempre, y con ella dice lo que dio la fuente y de dónde sale", () => {
  const a = BASE;
  const b = mover(BASE, 0, 1500);
  assert.deepEqual(trayectoEntre(a, b), { ...trayecto(andando(a, b)), segun: "casa" });
  // Una tabla vacía es como no tenerla.
  assert.equal(caminosDe(tablaCon([])), undefined);

  // A pie, con su cuesta: más metros y muchos más minutos que la cuenta de la casa.
  const conCuesta = caminosDe(tablaCon([{ de: a, a: b, aPie: { metros: 2100, minutos: 45 } }]));
  assert.deepEqual(trayectoEntre(a, b, conCuesta), {
    metros: 2100,
    maneras: ["walk", "transit", "car"],
    aPie: true,
    minutos: 45,
    segun: "fuente",
  });
  // A pie, cada sentido es un camino; si el de vuelta no está, vale el de ida, que va por las mismas calles.
  const conVuelta = caminosDe(
    tablaCon([
      { de: a, a: b, aPie: { metros: 2100, minutos: 45 } },
      { de: b, a: a, aPie: { metros: 2100, minutos: 25 } },
    ]),
  );
  assert.equal(trayectoEntre(b, a, conVuelta).minutos, 25);
  assert.equal(trayectoEntre(b, a, conCuesta).minutos, 45);

  // Un rodeo que no se anda: con el coche de la fuente, sin tráfico, y valen los dos sentidos.
  const rodeo = caminosDe(
    tablaCon([{ de: a, a: b, aPie: { metros: 5200, minutos: 70 }, enCoche: { metros: 6100, minutos: 11 } }]),
  );
  const ida = trayectoEntre(a, b, rodeo);
  assert.deepEqual([ida.aPie, ida.metros, ida.minutos, ida.segun], [false, 6100, 11, "fuente"]);
  assert.equal(ida.maneras.includes("walk"), false);
  assert.deepEqual(trayectoEntre(b, a, rodeo).minutos, 11);

  // Si la fuente dice que no se anda y no dio el coche, los metros son los suyos y el tiempo, el de la casa.
  const sinCoche = caminosDe(tablaCon([{ de: a, a: b, aPie: { metros: 5200, minutos: 70 } }]));
  assert.deepEqual(trayectoEntre(a, b, sinCoche), { ...trayecto(5200), segun: "casa" });
});

test("las cuestas y los rodeos de la tabla cambian el orden de un día", () => {
  const p1 = parada("p1", mover(BASE, 0, 500));
  const p2 = parada("p2", mover(BASE, 700, 0));
  const fechas = fechasDe("2027-02-12", "2027-02-12");
  const sin = repartir([p1, p2], fechas, "normal", BASE);
  assert.deepEqual(sin.dias[0].paradas, ["p1", "p2"], "sin tabla, primero lo que está más cerca en línea recta");
  // Entre la base y p1 hay una ría que rodear: a pie son tres kilómetros.
  const tabla = tablaCon([
    { de: BASE, a: p1.punto, aPie: { metros: 3000, minutos: 50 } },
    { de: BASE, a: p2.punto, aPie: { metros: 760, minutos: 10 } },
    { de: p1.punto, a: p2.punto, aPie: { metros: 950, minutos: 13 } },
    { de: p2.punto, a: p1.punto, aPie: { metros: 950, minutos: 12 } },
  ]);
  const con = repartir([p1, p2], fechas, "normal", BASE, {}, tabla);
  assert.deepEqual(con.dias[0].paradas, ["p2", "p1"]);
  // Lo que se anda de una a otra es lo que dijo la fuente, y la puerta 9 lo mide con la misma tabla.
  assert.deepEqual(con.dias[0].metros, [950]);
  const deLaPuerta = { paradas: [p1, p2], fuera: con.fuera, porQue: con.porQue, sitios: ["p1", "p2"], caminos: tabla };
  assert.equal(puertaDias({ ...deLaPuerta, dias: con.dias }).verde, true);
  // Un día que no dice los metros de su tabla no pasa.
  const mal = puertaDias({ ...deLaPuerta, dias: [{ ...con.dias[0], metros: [1100] }] });
  assert.equal(mal.verde, false);
  assert.match(mal.rojos[0].que, /el camino tiene 950/);
});

test("lo que cabe en un día lo dice la tabla: una subida de horas no cabe aunque en línea recta esté al lado", () => {
  const p1 = parada("p1", mover(BASE, 0, 300));
  const p2 = parada("p2", mover(BASE, 0, 900));
  const fechas = fechasDe("2027-02-12", "2027-02-12");
  assert.deepEqual(repartir([p1, p2], fechas, "normal", BASE).fuera, []);
  // Desde la base a p2 hay una montaña: a pie son 4 km y, en coche, una hora y tres cuartos.
  const tabla = tablaCon([
    { de: BASE, a: p2.punto, aPie: { metros: 4000, minutos: 150 }, enCoche: { metros: 60_000, minutos: 105 } },
  ]);
  const con = repartir([p1, p2], fechas, "normal", BASE, {}, tabla);
  assert.deepEqual(con.fuera, ["p2"]);
  assert.equal(con.porQue.p2, "far");
});

test("las cribas eligen dónde dormir por lo que se tarda de verdad", async () => {
  const busqueda = await buscarAlojamiento(fuenteInventada(), ESTANCIA, MINIMOS);
  const candidatos: Candidato[] = busqueda.finalistas.map((ficha) => ({
    ficha,
    mirado: miradoInventado(ficha.alojamiento.id),
  }));
  const paradas = SITIOS.slice(0, 4).map((s) => s.punto);
  const ctx = { gustos: ENTENDIDO.tastes, paradas };
  const sin = cribar(candidatos, ctx);
  const mejorSin = [...sin].sort((a, b) => (a.minutos ?? 0) - (b.minutos ?? 0) || a.id.localeCompare(b.id))[0];
  // El que mejor queda sin tabla está, en verdad, al otro lado de una cuesta: a pie, cuarenta minutos a cada sitio.
  const suyo = candidatos.find((c) => c.ficha.alojamiento.id === mejorSin.id)!.ficha.alojamiento;
  const desde = { lat: suyo.lat, lon: suyo.lon };
  const tabla = tablaCon(paradas.map((p) => ({ de: desde, a: p, aPie: { metros: 3200, minutos: 40 } })));
  const con = cribar(candidatos, { ...ctx, caminos: tabla });
  const elMismo = con.find((c) => c.id === mejorSin.id)!;
  assert.equal(elMismo.minutosAndando, 40);
  assert.ok((elMismo.nota.partes.zona ?? 10) < (mejorSin.nota.partes.zona ?? 0));
  const mejorCon = [...con].sort((a, b) => (a.minutos ?? 0) - (b.minutos ?? 0) || a.id.localeCompare(b.id))[0];
  assert.notEqual(mejorCon.id, mejorSin.id, "con la cuesta, otro queda más cerca de lo que se va a ver");
  // Los demás, sin camino en la tabla, siguen con la cuenta de la casa.
  for (const c of con.filter((x) => x.id !== mejorSin.id))
    assert.equal(c.minutos, sin.find((x) => x.id === c.id)!.minutos);
});

test("la tabla pide solo lo que hace falta: a pie lo que se alcanza, en coche lo que no se anda", async () => {
  const bases = [BASE, mover(BASE, 200, 200)];
  const cerca = [mover(BASE, 0, 800), mover(BASE, 900, 0), mover(BASE, 600, 600)];
  const lejos = [mover(BASE, 0, 20_000)];
  const muyLejos = [mover(BASE, 0, 300_000)];
  const fuente = rutasInventadas();
  const hecho = await pedirCaminos(bases, [...cerca, ...lejos, ...muyLejos], fuente, { ahora: () => VISTO });
  const { caminos } = hecho.tabla;
  assert.equal(hecho.fallo, false);
  // Ningún par sale dos veces, ni de un punto a sí mismo.
  const pares = caminos.map((c) => par(c.de, c.a));
  assert.equal(new Set(pares).size, pares.length);
  // A pie, solo entre lo que en línea recta está a menos de lo que se anda.
  for (const c of caminos) if (c.aPie !== undefined) assert.ok(enLineaRecta(c.de, c.a) <= 3500);
  // En coche, lo que no se anda y cabe en un día, en un solo sentido; lo de 300 km, nada.
  const enCoche = caminos.filter((c) => c.enCoche !== undefined);
  assert.ok(enCoche.length > 0);
  for (const c of enCoche) {
    assert.ok(enLineaRecta(c.de, c.a) > 1000);
    assert.equal(enCoche.filter((x) => par(x.de, x.a) === par(c.a, c.de)).length, 0);
  }
  assert.ok(!caminos.some((c) => [c.de, c.a].some((p) => p.lon === muyLejos[0].lon)));
  // Lo pedido cabe en el tope, con matrices y no de uno en uno.
  assert.ok(hecho.casillas <= CASILLAS_POR_VIAJE);
  assert.ok(hecho.pedidos < caminos.length);
  assert.equal(
    hecho.casillas,
    fuente.pedidos.reduce((s, p) => s + p.origenes * p.destinos, 0),
  );
  assert.deepEqual(new Set(fuente.pedidos.map((p) => p.manera)), new Set(["walk", "car"]));
});

test("la tabla no pasa de su tope: lo que no cabe se queda con la cuenta de la casa, y se dice", async () => {
  // Cuarenta paradas a un paso unas de otras: de parada a parada, más de mil quinientos pares a pie.
  const paradas = Array.from({ length: 40 }, (_, i) => mover(BASE, 100 + (i % 8) * 150, Math.floor(i / 8) * 150));
  const bases = [BASE, mover(BASE, 50, 50)];
  const pares = paresDelViaje(bases, paradas);
  assert.ok(pares.length > CASILLAS_POR_VIAJE);
  const fuente = rutasInventadas();
  const hecho = await pedirCaminos(bases, paradas, fuente, { ahora: () => VISTO });
  assert.ok(hecho.casillas <= CASILLAS_POR_VIAJE);
  assert.ok(hecho.sinPedir > 0);
  assert.ok(hecho.avisos.some((a) => /no caben en el tope/.test(a)));
  // Lo primero que se pide es de donde se duerme a cada parada: con eso se elige dónde dormir.
  const c = caminosDe(hecho.tabla);
  for (const p of paradas) assert.equal(trayectoEntre(BASE, p, c).segun, "fuente");
  // Y con un tope más chico, menos.
  const chico = await pedirCaminos(bases, paradas, rutasInventadas(), { tope: 50, ahora: () => VISTO });
  assert.ok(chico.casillas <= 50);
});

test("las matrices juntan los orígenes que piden lo mismo, sin pasar de lo que cabe en un pedido", () => {
  const destinos = [mover(BASE, 0, 100), mover(BASE, 0, 200), mover(BASE, 0, 300)];
  const origenes = [BASE, mover(BASE, 10, 0), mover(BASE, 20, 0)];
  const pares = origenes.flatMap((de) => destinos.map((a) => ({ de, a, recta: enLineaRecta(de, a) })));
  const juntos = enBloques(pares, 1000);
  assert.equal(juntos.length, 1);
  assert.equal(casillasDe(juntos), 9);
  // Si no caben en un pedido, se parten.
  const partidos = enBloques(pares, 2);
  assert.ok(partidos.every((b) => b.origenes.length * b.destinos.length <= 2));
  assert.equal(casillasDe(partidos), 9);
});

test("si la fuente falla a medias, lo que llegó se guarda y lo demás va con la cuenta de la casa", async () => {
  const bases = [BASE, mover(BASE, 0, 3000)];
  const paradas = [mover(BASE, 0, 800), mover(BASE, 900, 0), mover(BASE, 0, 20_000)];
  const fuente = rutasInventadas({ fallaDesde: 2, casillasPorPedido: 3 });
  const hecho = await pedirCaminos(bases, paradas, fuente, { ahora: () => VISTO });
  assert.equal(hecho.fallo, true);
  assert.equal(fuente.pedidos.length, 2, "tras el fallo no se pide nada más");
  assert.ok(hecho.tabla.caminos.length > 0, "lo del primer pedido se guarda");
  assert.ok(hecho.avisos.some((a) => /no contesta/.test(a)));
  // Un par que no llegó se mide con la cuenta de la casa.
  const c = caminosDe(hecho.tabla);
  const segun = paradas.map((p) => trayectoEntre(paradas[0], p, c).segun);
  assert.ok(segun.includes("casa"));
});

test("un viaje sin tabla se ve como siempre, y uno con una tabla mal hecha no pasa", () => {
  const v = viajeInventado();
  assert.equal(v.caminos, undefined);
  assert.deepEqual(comprobarViaje(v), []);
  const base = v.alojamientos[0].punto;
  const sin = repartir(v.paradas, fechasDe(v.entrada, v.salida), v.ritmo, base);
  const vacia = repartir(v.paradas, fechasDe(v.entrada, v.salida), v.ritmo, base, {}, tablaCon([]));
  assert.deepEqual(vacia, sin);

  const buena = tablaCon([{ de: v.paradas[0].punto, a: v.paradas[1].punto, aPie: { metros: 900, minutos: 12 } }]);
  assert.deepEqual(comprobarViaje({ ...v, caminos: buena }), []);
  const mal: Viaje = {
    ...v,
    caminos: tablaCon([
      { de: v.paradas[0].punto, a: v.paradas[1].punto },
      { de: { lat: 200, lon: 0 }, a: v.paradas[1].punto, aPie: { metros: 10, minutos: 1 } },
      { de: v.paradas[0].punto, a: v.paradas[2].punto, enCoche: { metros: -5, minutos: 0 } },
      { de: v.paradas[0].punto, a: v.paradas[1].punto, aPie: { metros: 900, minutos: 12 } },
    ]),
  };
  const pegas = comprobarViaje(mal).map((p) => p.que);
  assert.ok(pegas.includes("no dice ni a pie ni en coche"));
  assert.ok(pegas.includes("un punto no está en el mapa"));
  assert.ok(pegas.includes("unos metros o unos minutos no son un número"));
  assert.ok(pegas.includes("el camino sale dos veces"));
  assert.ok(comprobarViaje({ ...v, caminos: { ...buena, fuente: "" } }).some((p) => p.donde === "caminos"));
});

/** Lleva una investigación inventada hasta el final, haciendo trabajar a cada asiento que espera. */
async function investiga(fuentes: () => Fuentes): Promise<{ run: string; avisos: string[] }> {
  const run = runNuevo();
  const avisos: string[] = [];
  let estado = await sigue(run, fuentes());
  avisos.push(...estado.avisos);
  for (let i = 0; i < 30 && estado.esperan.length > 0; i++) {
    for (const id of estado.esperan) trabaja(run, id);
    estado = await sigue(run, fuentes());
    avisos.push(...estado.avisos);
  }
  assert.equal(estado.hecho, true, JSON.stringify(estado.parado));
  return { run, avisos };
}

test("la investigación pide la tabla de caminos, la usa y la deja en el viaje para la web", async () => {
  const fuente = rutasInventadas();
  const { run } = await investiga(() => ({ ...fuentesInventadas(), rutas: fuente }));
  const guardado = leerJson(join(run, "caminos.json"));
  assert.ok(guardado.tabla.caminos.length > 0);
  assert.ok(guardado.casillas > 0 && guardado.casillas <= CASILLAS_POR_VIAJE);
  const viaje = leerJson(join(run, "viaje.json")) as Viaje;
  assert.deepEqual(viaje.caminos, guardado.tabla);
  // Los metros de cada día son los de la tabla: la web los dice con los mismos números que la casa.
  const c = caminosDe(viaje.caminos);
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p.punto]));
  for (const d of viaje.dias)
    d.paradas.slice(1).forEach((id, i) => {
      const t = trayectoEntre(deParada.get(d.paradas[i])!, deParada.get(id)!, c);
      assert.equal(d.metros[i], t.metros);
    });
  assert.ok(viaje.dias.some((d) => d.paradas.length > 1));
  assert.deepEqual(comprobarViaje(viaje), []);
});

test("sin fuente de rutas, o si no contesta, la investigación sigue con la cuenta de la casa y lo dice", async () => {
  const sin = await investiga(fuentesInventadas);
  assert.ok(sin.avisos.some((a) => /sin la fuente de rutas/.test(a)));
  assert.ok(existsSync(join(sin.run, "caminos.json")));
  assert.equal((leerJson(join(sin.run, "viaje.json")) as Viaje).caminos, undefined);

  const callada = await investiga(() => ({ ...fuentesInventadas(), rutas: rutasInventadas({ fallaDesde: 1 }) }));
  assert.ok(callada.avisos.some((a) => /no contesta/.test(a)));
  assert.equal((leerJson(join(callada.run, "viaje.json")) as Viaje).caminos, undefined);
});
