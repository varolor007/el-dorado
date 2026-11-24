// Las pruebas del ritmo: reparte las paradas por días, por cercanía y a tu ritmo, y siempre igual.

import assert from "node:assert/strict";
import { test } from "node:test";
import { SALTO_MAXIMO } from "../../agent/data/dias.ts";
import { puertaDias } from "../../agent/gates/puerta_dias.ts";
import { comprobarViaje, RITMOS, type Parada, type Ritmo } from "../../agent/output/viaje.ts";
import { paradasDe } from "../../agent/scripts/dias.ts";
import { andando, CABE, enLineaRecta, fechasDe, ordenDeApertura, repartir } from "../../agent/scripts/ritmo.ts";
import { entregaDeSitios, SITIOS } from "../cases/inventado/investigacion.ts";
import { trayecto } from "../../agent/tools/distancias.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const BASE = { lat: 10.05, lon: 20.05 };
const FECHAS = fechasDe("2027-02-12", "2027-02-14");

/** Doce paradas inventadas en tres barrios (oeste, centro y este). La primera de cada barrio, imprescindible. */
function paradas(): Parada[] {
  const barrios = [
    { nombre: "oeste", lon: 20.0 },
    { nombre: "centro", lon: 20.05 },
    { nombre: "este", lon: 20.1 },
  ];
  const lista: Parada[] = [];
  for (let i = 0; i < 4; i++) {
    for (const b of barrios) {
      lista.push({
        id: `${b.nombre}-${i + 1}`,
        nombre: `${b.nombre} ${i + 1}`,
        clase: "monument",
        punto: { lat: 10.05 + i * 0.002, lon: b.lon + i * 0.001 },
        porQue: "Porque sí.",
        minutos: 60,
        imprescindible: i === 0,
        foto: null,
        origen: { fuente: "inventada", visto: "2026-11-23T10:00:00.000Z", enlace: null },
      });
    }
  }
  return lista;
}

test("las fechas van del día de entrada al de salida", () => {
  assert.deepEqual(FECHAS, ["2027-02-12", "2027-02-13", "2027-02-14"]);
  assert.deepEqual(fechasDe("2027-02-28", "2027-03-01"), ["2027-02-28", "2027-03-01"]);
});

test("la distancia: en línea recta, y andando con su rodeo", () => {
  const a = { lat: 0, lon: 0 };
  const b = { lat: 0, lon: 0.01 };
  assert.ok(Math.abs(enLineaRecta(a, b) - 1112) < 2);
  assert.equal(andando(a, b), 1450);
  assert.equal(andando(a, a), 0);
});

test("cada día se queda con su barrio: lo que está cerca, junto", () => {
  const r = repartir(paradas(), FECHAS, "normal", BASE);
  const barrios = r.dias.map((d) => [...new Set(d.paradas.map((id) => id.split("-")[0]))]);
  assert.deepEqual(
    barrios.map((b) => b.length),
    [1, 1, 1],
  );
  assert.equal(new Set(barrios.flat()).size, 3);
  // El primer día, el barrio de la base.
  assert.deepEqual(barrios[0], ["centro"]);
});

test("el ritmo dice cuántas caben: con el tranquilo quedan las imprescindibles y las más importantes", () => {
  for (const ritmo of ["calm", "normal", "full"] as const) {
    const r = repartir(paradas(), FECHAS, ritmo, BASE);
    for (const d of r.dias) {
      assert.ok(d.paradas.length <= CABE[ritmo].paradas, `${ritmo}: un día lleva ${d.paradas.length}`);
      assert.equal(d.metros.length, Math.max(0, d.paradas.length - 1));
    }
    const puestas = r.dias.flatMap((d) => d.paradas);
    assert.equal(puestas.length + r.fuera.length, 12);
    assert.equal(new Set([...puestas, ...r.fuera]).size, 12);
    for (const id of ["oeste-1", "centro-1", "este-1"]) assert.ok(puestas.includes(id), `${ritmo}: falta ${id}`);
  }
  const tranquilo = repartir(paradas(), FECHAS, "calm", BASE);
  assert.equal(tranquilo.dias.flatMap((d) => d.paradas).length, 9);
  // Lo que se queda fuera es lo menos importante: lo último de la lista.
  assert.deepEqual(tranquilo.fuera.sort(), ["centro-4", "este-4", "oeste-4"]);
  assert.deepEqual(repartir(paradas(), FECHAS, "full", BASE).fuera, []);
});

test("los minutos también cuentan: una visita larga deja sitio a menos paradas", () => {
  const largas = paradas().map((p) => ({ ...p, minutos: 150 }));
  const r = repartir(largas, FECHAS, "normal", BASE);
  for (const d of r.dias) assert.ok(d.paradas.length <= 2);
});

test("cada día va en el orden en que menos se anda, y se llama como su parada más importante", () => {
  const r = repartir(paradas(), FECHAS, "full", BASE);
  const centro = r.dias[0];
  assert.deepEqual(centro.paradas, ["centro-1", "centro-2", "centro-3", "centro-4"]);
  assert.ok(centro.metros.every((m) => m > 0 && m < 600));
  assert.equal(centro.titulo, "centro 1");
});

test("el orden de un día no vuelve atrás: una parada que queda de camino no se deja para el final", () => {
  // Cuatro paradas en línea, de oeste a este, dadas desordenadas; la base, al oeste.
  const enLinea = ["c", "a", "d", "b"].map((id) => ({
    ...paradas()[0],
    id,
    nombre: id,
    imprescindible: false,
    punto: { lat: 10, lon: 20 + (id.charCodeAt(0) - 96) * 0.004 },
  }));
  const r = repartir(enLinea, ["2027-02-12"], "normal", { lat: 10, lon: 20 });
  assert.deepEqual(r.dias[0].paradas, ["a", "b", "c", "d"]);
});

test("la misma entrada da siempre los mismos días", () => {
  const una = repartir(paradas(), FECHAS, "normal", BASE);
  const otra = repartir(paradas(), FECHAS, "normal", BASE);
  assert.deepEqual(una, otra);
});

test("lo que quitas no vuelve solo, y su sitio lo ocupa la siguiente", () => {
  const r = repartir(paradas(), FECHAS, "calm", BASE, { quitadas: ["centro-2", "no-existe"] });
  const puestas = r.dias.flatMap((d) => d.paradas);
  assert.ok(!puestas.includes("centro-2"));
  assert.ok(r.fuera.includes("centro-2"));
  assert.ok(puestas.includes("centro-4"));
});

test("lo que añades entra en su zona aunque el día ya esté lleno", () => {
  const antes = repartir(paradas(), FECHAS, "calm", BASE);
  assert.ok(antes.fuera.includes("este-4"));
  const r = repartir(paradas(), FECHAS, "calm", BASE, { anadidas: ["este-4"] });
  const delEste = r.dias.find((d) => d.paradas.includes("este-1"));
  assert.ok(delEste?.paradas.includes("este-4"));
  assert.equal(delEste?.paradas.length, 4);
  assert.ok(!r.fuera.includes("este-4"));
  // Las demás siguen donde estaban.
  assert.deepEqual(r.fuera.sort(), ["centro-4", "oeste-4"]);
});

test("lo que mueves a un día se queda en ese día, y ese día sigue teniendo su zona", () => {
  const antes = repartir(paradas(), FECHAS, "normal", BASE);
  const eraDelDia = antes.dias.findIndex((d) => d.paradas.includes("oeste-2"));
  const otro = (eraDelDia + 1) % FECHAS.length;
  const r = repartir(paradas(), FECHAS, "normal", BASE, { fijadas: { "oeste-2": otro, "no-existe": 0, "este-2": 9 } });
  assert.ok(r.dias[otro].paradas.includes("oeste-2"));
  assert.equal(r.dias.flatMap((d) => d.paradas).filter((id) => id === "oeste-2").length, 1);
  const puestas = r.dias.flatMap((d) => d.paradas);
  assert.equal(new Set(puestas).size, puestas.length);
  assert.equal(puestas.length + r.fuera.length, 12);
  for (const id of ["oeste-1", "centro-1", "este-1"]) assert.ok(puestas.includes(id));
});

test("sin días o sin paradas no se rompe", () => {
  assert.deepEqual(repartir(paradas(), [], "normal", BASE).dias, []);
  assert.equal(repartir(paradas(), [], "normal", BASE).fuera.length, 12);
  const vacio = repartir([], FECHAS, "normal", BASE);
  assert.deepEqual(
    vacio.dias.map((d) => d.paradas),
    [[], [], []],
  );
});

test("lo que reparte el ritmo tiene la forma del viaje para la web", () => {
  const v = viajeInventado();
  const r = repartir(v.paradas, fechasDe(v.entrada, v.salida), "full", v.destino.punto);
  v.dias = r.dias.filter((d) => d.paradas.length > 0);
  v.fuera = r.fuera;
  assert.deepEqual(comprobarViaje(v), []);
});

test("los días libres se abren de los de en medio a los de los bordes: el de llegada y el de salida, al final", () => {
  assert.deepEqual(ordenDeApertura(4), [1, 2, 0, 3]);
  assert.deepEqual(ordenDeApertura(3), [1, 0, 2]);
  assert.deepEqual(ordenDeApertura(1), [0]);
  assert.deepEqual(ordenDeApertura(0), []);
});

test("dos sitios que están al lado caen en el mismo día, y un día se abre solo cuando hace falta", () => {
  // Siete sitios en dos barrios, a dos kilómetros uno de otro, y cuatro días: dos días con paradas y dos libres.
  const elegidas = paradasDe(entregaDeSitios(), SITIOS);
  const r = repartir(elegidas, fechasDe("2027-03-05", "2027-03-08"), "normal", BASE);
  const diaDe = (id: string): number => r.dias.findIndex((d) => d.paradas.includes(id));
  // El faro y el mercado del puerto están a trescientos metros: mismo día. Y el barrio viejo, junto, en otro.
  assert.equal(diaDe("Q1"), diaDe("Q4"));
  assert.equal(new Set(["Q2", "Q5", "Q7", "Q8", "Q3"].map(diaDe)).size, 1);
  assert.notEqual(diaDe("Q1"), diaDe("Q2"));
  assert.deepEqual(r.fuera, []);
  assert.equal(r.dias.filter((d) => d.paradas.length === 0).length, 2);
  // Lo más importante, que abre el primer día, cae en un día de en medio, no en el de llegada.
  assert.equal(diaDe("Q1"), 1);
  assert.equal(diaDe("Q2"), 2);
});

test("lo que reparte el código pasa siempre su puerta: nunca un día que no se puede andar", () => {
  const sitios = (lista: Parada[]): string[] => lista.map((p) => p.id);
  const pasa = (lista: Parada[], fechas: string[], ritmo: Ritmo, base = BASE): string[] => {
    const r = repartir(lista, fechas, ritmo, base);
    return puertaDias({
      paradas: lista,
      dias: r.dias,
      fuera: r.fuera,
      porQue: r.porQue,
      sitios: sitios(lista),
    }).rojos.map((x) => x.que);
  };
  // Los tres barrios están a más de cinco kilómetros: con un solo día no se cruzan, se anda uno.
  const todas = paradas().map((p) => ({ ...p, imprescindible: true, minutos: 200 }));
  for (const ritmo of RITMOS) {
    for (const noches of [0, 1, 2, 6]) {
      const fechas = fechasDe("2027-02-12", `2027-02-${12 + noches}`);
      assert.deepEqual(pasa(todas, fechas, ritmo), [], `${ritmo}, ${noches} noches, todo imprescindible`);
      assert.deepEqual(pasa(paradas(), fechas, ritmo), [], `${ritmo}, ${noches} noches`);
      // Lo que se entrega sale de donde se duerme, no del centro: con otra base, también pasa.
      assert.deepEqual(pasa(paradas(), fechas, ritmo, { lat: 10.09, lon: 20.11 }), []);
    }
  }
});

test("un imprescindible que no cabe en ningún día se queda fuera y dice por qué: lejos, o los días llenos", () => {
  // Un solo día y tres sitios imprescindibles a más de cinco kilómetros: no se andan, pero cogiendo algo caben los
  // tres en el día. Ninguno se queda fuera, y lo que hay entre ellos pasa de lo que se anda.
  const aKilometros = paradas().filter((p) => p.imprescindible);
  const juntos = repartir(aKilometros, fechasDe("2027-02-12", "2027-02-12"), "normal", BASE);
  assert.equal(juntos.dias[0].paradas.length, 3);
  assert.deepEqual(juntos.fuera, []);
  assert.ok(juntos.dias[0].metros.every((m) => m > SALTO_MAXIMO && !trayecto(m).aPie));
  // A cientos de kilómetros no: eso no es un trayecto de un día, lo coja quien lo coja. Se hace uno, y los otros dos
  // quedan lejos.
  const lejos = aKilometros.map((p, i) => ({ ...p, punto: { lat: p.punto.lat + 2 * i, lon: p.punto.lon } }));
  const r = repartir(lejos, fechasDe("2027-02-12", "2027-02-12"), "normal", BASE);
  assert.equal(r.dias[0].paradas.length, 1);
  assert.deepEqual(Object.values(r.porQue), ["far", "far"]);
  // Un solo día, tranquilo, y cuatro visitas largas en el mismo barrio: cabe una, y las demás no por llenas.
  const largas = paradas()
    .filter((p) => p.id.startsWith("centro"))
    .map((p) => ({ ...p, imprescindible: true, minutos: 240 }));
  const lleno = repartir(largas, fechasDe("2027-02-12", "2027-02-12"), "calm", BASE);
  assert.equal(lleno.dias[0].paradas.length, 1);
  assert.deepEqual([...new Set(Object.values(lleno.porQue))], ["full"]);
  // Y el viaje que lo lleva pasa su comprobación: está fuera, pero dice por qué.
  const v = viajeInventado();
  v.paradas = largas;
  v.dias = lleno.dias;
  v.fuera = lleno.fuera;
  v.porQueFuera = lleno.porQue;
  assert.deepEqual(comprobarViaje(v), []);
  v.porQueFuera = {};
  assert.ok(comprobarViaje(v).some((p) => p.que.includes("no dice por qué")));
});

test("un imprescindible sin día libre entra en otro día si cabe, aunque no sea el de al lado", () => {
  // Dos días y tres sitios imprescindibles: dos lejos entre sí y un tercero a 2,5 km del primero, que se anda.
  const en = (id: string, lon: number): Parada => ({ ...paradas()[0], id, nombre: id, punto: { lat: 10.05, lon } });
  const tres = [en("a", 20.0), en("b", 20.1), en("c", 20.023)];
  const r = repartir(tres, fechasDe("2027-02-12", "2027-02-13"), "normal", BASE);
  assert.deepEqual(r.fuera, []);
  assert.ok(r.dias.some((d) => d.paradas.includes("a") && d.paradas.includes("c")));
});

test("lo que quitas sale una vez, aunque se diga dos, y con su porqué", () => {
  const r = repartir(paradas(), FECHAS, "normal", BASE, { quitadas: ["centro-1", "centro-1"] });
  assert.equal(r.fuera.filter((id) => id === "centro-1").length, 1);
  assert.equal(r.porQue["centro-1"], "removed");
});
