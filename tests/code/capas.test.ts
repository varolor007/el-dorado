// El suelo de las capas del destino (14.1): la investigación inventada entera con las tres capas de mentira; una
// capa que falla, o que no pasa su puerta, y el viaje sale igual; los días que esperan a las entradas y los días sin
// ellas; las capas sin contrato, que no se lanzan; el impacto de cada clase de cambio con los pasos nuevos; y la forma
// del viaje con y sin capas. Con el caso inventado: sin internet y sin gastar.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CAPAS_DE_IA, FALTAS_DE_UNA_CAPA } from "../../agent/data/capas.ts";
import { ESPERA_DE_LAS_ENTRADAS } from "../../agent/data/capa_entradas.ts";
import { topesDeInternet } from "../../agent/data/internet.ts";
import { CODIGO, PASOS, TOPE_DE_UN_ASIENTO, topeDe } from "../../agent/data/pasos.ts";
import { darElAdelante, llevar } from "../../agent/launcher/casa.ts";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import { gastoPorAsiento } from "../../agent/launcher/gasto.ts";
import { sigue } from "../../agent/launcher/investigar.ts";
import { porDondeVa } from "../../agent/launcher/pasos.ts";
import { comprobarViaje, type Presupuesto, type Viaje } from "../../agent/output/viaje.ts";
import { abreElDia, diaDeLaSemana, diasQueCierra, entradaDe } from "../../agent/scripts/capas.ts";
import { impactoDe } from "../../agent/scripts/impacto.ts";
import { presupuestoDe } from "../../agent/scripts/presupuesto.ts";
import {
  fuentesInventadas,
  GASTO,
  lanzadorDeMentira,
  leerJson,
  runNuevo,
  trabaja,
  type DeMentira,
  type Objeto,
} from "../cases/inventado/asientos.ts";
import { contratosDePrueba, contratosSinCapas } from "../cases/inventado/capas.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const conRun = async (hacer: (run: string) => Promise<void>): Promise<void> => {
  const run = runNuevo();
  try {
    await hacer(run);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
};

/** Lleva un run entero con la casa y asientos de mentira. */
async function lleva(run: string, o: DeMentira = {}, lanzador?: Lanzador, contratos?: string) {
  darElAdelante(run, 5);
  const f = { ...fuentesInventadas(), ...(contratos === undefined ? {} : { contratos }) };
  return llevar(run, f, lanzador ?? lanzadorDeMentira(o));
}

// ---------- la investigación entera, con las tres capas

test("la investigación inventada, entera, con las tres capas de mentira: cada una llega al viaje", async () => {
  await conRun(async (run) => {
    const r = await lleva(run);
    assert.deepEqual(r.parado, null);
    assert.equal(r.hecho, true);
    // El de moverse y el que conoce el destino, por detrás desde la ruta; el de las entradas, con los sitios elegidos.
    for (const id of ["moverse-v1", "saber-v1", "entradas-v1"]) assert.ok(r.lanzados.includes(id), id);
    assert.ok(r.lanzados.indexOf("moverse-v1") > r.lanzados.indexOf("ruta-v1"));
    assert.ok(r.lanzados.indexOf("entradas-v1") > r.lanzados.indexOf("sitios-v1"));
    for (const nombre of ["moverse.json", "saber.json", "entradas.json", "abiertos.json", "presupuesto.json"])
      assert.ok(existsSync(join(run, nombre)), nombre);

    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(v), []);
    // Cómo moverse: una manera de llegar a una zona de la ruta, un billete suelto y dos abonos, con su página.
    assert.equal(v.moverse?.falta, null);
    assert.equal(v.moverse?.llegar.length, 1);
    assert.deepEqual(
      v.moverse?.billetes.map((b) => [b.clase, b.dias]),
      [
        ["single", null],
        ["day_pass", 1],
        ["multi_day_pass", 3],
      ],
    );
    assert.equal(v.moverse?.llegar[0].fuente.url, "https://transporte.inventado.example/tarifas");
    // Lo que conviene saber: cosas cortas, en su clase; ningún restaurante con nombre.
    assert.deepEqual(
      v.saber?.cosas.map((c) => c.clase),
      ["neighbourhood", "hours", "market", "practical", "dish", "meal_cost"],
    );
    // Las entradas: una por parada del viaje, todas miradas; una de ellas cierra los lunes.
    assert.equal(v.entradas?.falta, null);
    assert.deepEqual(v.entradas?.sitios.map((s) => s.parada).sort(), v.paradas.map((p) => p.id).sort());
    assert.ok(v.entradas?.sitios.every((s) => s.mirado));
    assert.equal(diaDeLaSemana("2031-03-10"), "mon");
    const losLunes = v.paradas.filter((p) => abreElDia(entradaDe(v.entradas, p.id)!.horarios, "2031-03-10") === false);
    assert.equal(losLunes.length, 1);
    // Lo que se le dio al de las entradas: los sitios elegidos, cuántos son y sus edades; nadie con su nombre.
    const material = leerJson(join(run, "puestos", "entradas-v1", "in", "trip.json"));
    assert.deepEqual(Object.keys(material.travellers).sort(), ["adults", "children"]);
    assert.equal(leerJson(join(run, "puestos", "entradas-v1", "in", "open_data.json")).length, v.paradas.length);
    // El presupuesto, por manera: dormir y llegar, con su precio; llegar a donde se duerme y las entradas, la cuenta
    // del código con las páginas de mentira. Las cifras de la cuenta, en presupuesto.test.ts.
    assert.deepEqual(
      v.presupuesto?.maneras.map((m) => m.manera),
      v.maneras.map((m) => m.id),
    );
    for (const m of v.presupuesto!.maneras) {
      const manera = v.maneras.find((x) => x.id === m.manera)!;
      assert.deepEqual(
        m.partes.map((p) => p.parte),
        ["lodging", "transport", "arrival", "getting_around", "tickets"],
      );
      assert.equal(m.partes[0].origen, "priced");
      assert.equal(m.moneda, manera.moneda);
      const parte = (x: string) => m.partes.find((p) => p.parte === x)!;
      for (const x of ["arrival", "tickets"]) {
        assert.equal(parte(x).origen, "computed");
        assert.ok(parte(x).fuentes.length > 0);
      }
    }
    // Las tres maneras se siguen comparando por dormir y llegar: sus totales no cambian.
    const tabla = leerJson(join(run, "tabla-1.json"));
    for (const m of v.maneras) assert.equal(m.total, tabla.rows.find((x: Objeto) => x.lodging === m.alojamiento).total);
    // Por dónde va: cada paso nuevo, hecho.
    const pasos = porDondeVa(run);
    for (const id of ["getting_around", "local_knowledge", "tickets", "budget"])
      assert.equal(pasos.find((p) => p.id === id)?.estado, "done", id);
  });
});

// ---------- una capa que falla, o que no pasa su puerta: el viaje sale igual

test("una capa que falla no para nada: el viaje sale igual, y dice por qué falta", async () => {
  await conRun(async (run) => {
    const r = await lleva(run, { falla: (asiento) => (asiento === "getting-around" ? "rompe y lo dice" : null) });
    assert.deepEqual(r.parado, null);
    assert.equal(r.hecho, true);
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(v), []);
    assert.equal(v.moverse?.falta, "failed");
    assert.deepEqual(v.moverse?.llegar, []);
    // Las otras, como siempre.
    assert.equal(v.saber?.falta, null);
    assert.equal(v.entradas?.falta, null);
  });
});

test("una capa que no pasa su puerta tras sus vueltas queda en falta, y el viaje sale igual", async () => {
  await conRun(async (run) => {
    // El que conoce el destino entrega siempre una clase que no está en la lista.
    const bueno = lanzadorDeMentira();
    const lanzador: Lanzador = async (orden, puesto, corte) => {
      if (puesto.asiento !== "local-knowledge") return bueno(orden, puesto, corte);
      trabaja(join(puesto.carpeta, "..", ".."), puesto.id, (_a: string, e: Objeto) => {
        e.items[0].kind = "restaurant";
      });
      return GASTO;
    };
    const r = await lleva(run, {}, lanzador);
    assert.equal(r.hecho, true);
    assert.ok(["saber-v1", "saber-v2", "saber-v3"].every((id) => r.lanzados.includes(id)));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(v.saber?.falta, "rejected");
    assert.deepEqual(v.saber?.cosas, []);
    assert.deepEqual(comprobarViaje(v), []);
  });
});

// ---------- los días y las entradas

test("los días esperan a las entradas: hasta que entrega, no se reparten", async () => {
  await conRun(async (run) => {
    const f = fuentesInventadas();
    let estado = await sigue(run, f);
    const hechos = new Set<string>();
    // Se trabaja todo lo que espera, menos el de las entradas, hasta que solo quede él.
    for (let i = 0; i < 20; i++) {
      const todos = [...estado.esperan, ...(estado.porDetras ?? [])].filter((id) => !hechos.has(id));
      const sinEntradas = todos.filter((id) => !id.startsWith("entradas-"));
      if (sinEntradas.length === 0) break;
      for (const id of sinEntradas) {
        trabaja(run, id);
        hechos.add(id);
      }
      estado = await sigue(run, f);
    }
    assert.deepEqual(estado.esperan, ["entradas-v1"]);
    assert.ok(!existsSync(join(run, "dias.json")));
    assert.equal(porDondeVa(run).find((p) => p.id === "tickets")?.estado, "waiting");
    trabaja(run, "entradas-v1");
    await sigue(run, f);
    assert.ok(existsSync(join(run, "dias.json")));
    assert.equal(leerJson(join(run, "entradas.json")).falta, null);
  });
});

test("si las entradas tardan más que su tope, los días se reparten sin ellas, y se dice", async () => {
  assert.deepEqual(topeDe("tickets", TOPE_DE_UN_ASIENTO), ESPERA_DE_LAS_ENTRADAS);
  assert.deepEqual(topeDe("tickets", { segundos: 1 }), { segundos: 1 });
  assert.deepEqual(topeDe("route-planner", TOPE_DE_UN_ASIENTO), TOPE_DE_UN_ASIENTO);
  await conRun(async (run) => {
    // Sin techo: de lo que se corta por su tope no se sabe lo que gastó, y con techo la casa no seguiría a ciegas.
    darElAdelante(run, null);
    const lanzador = lanzadorDeMentira({ falla: (asiento) => (asiento === "tickets" ? "cuelga" : null) });
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope: { segundos: 0.3 } });
    assert.deepEqual(r.parado, null);
    assert.equal(r.hecho, true);
    assert.ok(lanzador.cortados.includes("entradas-v1"));
    assert.ok(r.avisos.includes("los días se reparten sin los horarios de las entradas (late)"));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(v.entradas?.falta, "late");
    assert.ok(v.dias.length > 0);
    assert.deepEqual(comprobarViaje(v), []);
  });
});

test("los días que cierra cada sitio, por sus horarios: lo que no se sabe no quita nada", () => {
  const fuente = { url: "https://sitios.inventado.example/x", visto: "2031-01-01" };
  const todos = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const entradas = {
    falta: null,
    sitios: [
      {
        parada: "Q1",
        precios: null,
        horarios: [
          {
            desde: null,
            hasta: null,
            franjas: [{ dias: [...todos.slice(1)], abre: "09:00", cierra: "18:00" }],
            cierra: [],
            fuente,
          },
        ],
        reservar: null,
        web: null,
        mirado: true,
      },
      {
        parada: "Q2",
        precios: null,
        horarios: [
          {
            desde: null,
            hasta: null,
            franjas: [{ dias: [...todos], abre: "10:00", cierra: "14:00" }],
            cierra: ["2031-03-12"],
            fuente,
          },
        ],
        reservar: null,
        web: null,
        mirado: true,
      },
      { parada: "Q3", precios: null, horarios: null, reservar: null, web: null, mirado: false },
    ],
  };
  // Del 10 (lunes) al 12 (miércoles) de marzo de 2031.
  const fechas = ["2031-03-10", "2031-03-11", "2031-03-12"];
  assert.deepEqual(diasQueCierra(entradas, fechas), { Q1: ["2031-03-10"], Q2: ["2031-03-12"] });
  assert.equal(abreElDia(null, "2031-03-10"), null);
  // Un horario con fechas manda sobre el de todo el año en sus días; fuera de ellas, el de todo el año.
  const deVerano = {
    desde: "2031-06-01",
    hasta: "2031-09-30",
    franjas: [{ dias: [...todos], abre: "09:00", cierra: "21:00" }],
    cierra: [],
    fuente,
  };
  const deSiempre = entradas.sitios[0].horarios![0];
  assert.equal(abreElDia([deSiempre, deVerano], "2031-06-02"), true);
  assert.equal(abreElDia([deSiempre, deVerano], "2031-03-10"), false);
  // Sin la capa, o si falta, no se sabe nada.
  assert.deepEqual(diasQueCierra(undefined, fechas), {});
  assert.deepEqual(diasQueCierra({ sitios: [], falta: "failed" }, fechas), {});
});

// ---------- sin contrato no se lanzan

test("una capa sin contrato no se lanza: queda en falta con su porqué, no cuesta, y el viaje sale igual", async () => {
  await conRun(async (run) => {
    const r = await lleva(run, {}, undefined, contratosSinCapas());
    assert.equal(r.hecho, true);
    assert.ok(!r.lanzados.some((id) => /^(moverse|saber|entradas)-/.test(id)));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.deepEqual(comprobarViaje(v), []);
    for (const capa of [v.moverse, v.saber, v.entradas]) assert.equal(capa?.falta, "no_contract");
    // Sin contrato no es un fallo: al repartir los días no se dice nada.
    assert.ok(!r.avisos.some((a) => a.includes("entradas")));
    // El presupuesto se hace igual, con lo que se sabe.
    assert.equal(v.presupuesto?.falta, null);
  });
  // Lo que costaría rehacerlas: nada, mientras no tengan contrato.
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  try {
    const sin = gastoPorAsiento("nadie", mesa, contratosSinCapas());
    for (const asiento of ["getting-around", "local-knowledge", "tickets"])
      assert.deepEqual(sin[asiento], { usd: 0, de: 0 });
    assert.deepEqual(gastoPorAsiento("nadie", mesa, contratosDePrueba()), {});
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// ---------- los pasos, internet y el impacto

test("los pasos nuevos: su asiento, su puerta, su archivo y sus topes de internet", () => {
  const de = (id: string) => PASOS.find((p) => p.id === id)!;
  assert.deepEqual(
    CAPAS_DE_IA.map((id) => [de(id).quien, de(id).puerta, de(id).deja[0]]),
    [
      ["getting-around", 11, "moverse.json"],
      ["local-knowledge", 12, "saber.json"],
      ["tickets", 13, "entradas.json"],
    ],
  );
  assert.deepEqual([de("budget").quien, de("budget").deja], [CODIGO, ["presupuesto.json"]]);
  // Las entradas, antes de repartir los días; el presupuesto, antes de montar el viaje.
  const orden = PASOS.map((p) => p.id);
  assert.ok(orden.indexOf("tickets") < orden.indexOf("days") && orden.indexOf("budget") < orden.indexOf("trip"));
  for (const asiento of ["getting-around", "local-knowledge", "tickets"]) {
    const topes = topesDeInternet(asiento);
    assert.ok(topes.busquedas > 0 && topes.paginas > 0, asiento);
  }
  assert.deepEqual([...FALTAS_DE_UNA_CAPA], ["no_contract", "failed", "rejected", "late"]);
});

test("el impacto de cada clase con las capas: lo más prudente", () => {
  const rehace = (clase: Parameters<typeof impactoDe>[0][number]) => impactoDe([clase]).redo.map((x) => x.step);
  // Otro destino u otra ruta: todo.
  for (const clase of ["destination", "other"] as const)
    for (const paso of ["getting_around", "local_knowledge", "tickets", "budget"])
      assert.ok(rehace(clase).includes(paso as never), `${clase}: ${paso}`);
  // Otras fechas: los horarios y los precios de las entradas, y con la ruta, las otras dos.
  assert.ok(
    ["tickets", "getting_around", "local_knowledge", "budget"].every((p) => rehace("dates").includes(p as never)),
  );
  assert.ok(impactoDe(["dates"]).pieces.includes("tickets"));
  // Un viajero más: solo la cuenta del presupuesto, que es código; ninguna capa se vuelve a pedir.
  const uno = impactoDe(["travellers"]);
  assert.ok(uno.redo.some((x) => x.step === "budget" && x.who === CODIGO));
  for (const paso of ["getting_around", "local_knowledge", "tickets"])
    assert.ok(uno.keep.includes(paso as never), paso);
  assert.ok(uno.pieces.includes("budget") && !uno.pieces.includes("tickets"));
  // Otro idioma, o lo que buscas: el que conoce el destino, que escribe en él y lo lee.
  assert.ok(rehace("language").includes("local_knowledge") && rehace("looking_for").includes("local_knowledge"));
  // Otro alojamiento u otro vuelo: las capas se quedan; el presupuesto, otra vez.
  for (const clase of ["lodging", "flight"] as const) {
    const i = impactoDe([clase]);
    for (const paso of ["getting_around", "local_knowledge", "tickets"]) assert.ok(i.keep.includes(paso as never));
    assert.ok(i.redo.some((x) => x.step === "budget") && i.pieces.includes("budget"));
  }
  // Un día con un mensaje tuyo: los sitios que se eligen otra vez, y con ellos sus entradas.
  assert.ok(rehace("day").includes("tickets"));
});

// ---------- la forma del viaje, con y sin capas

/** Las cuatro capas de un viaje inventado, bien: lo mínimo de cada una. */
function conCapas(v: Viaje): Viaje {
  const fuente = { url: "https://inventado.example/pagina", visto: "2031-01-01" };
  const precio = { para: "adult" as const, edades: null, cuanto: { importe: 2, moneda: "EUR" }, fuente };
  const sinPresupuesto: Viaje = {
    ...v,
    moverse: {
      llegar: [
        {
          desde: { clase: "airport", codigo: "ZZA", nombre: null },
          aZona: "z1",
          modo: "bus",
          minutos: 30,
          precios: [precio],
          hastaLas: "23:00",
          fuente,
        },
      ],
      sinLlegar: null,
      transportes: [{ modo: "metro", zonas: ["z1"], hastaLas: null, fuente }],
      billetes: [
        { clase: "multi_day_pass", dias: 3, viajes: null, modos: ["metro", "bus"], precios: [precio], fuente },
      ],
      pagos: [{ clase: "contactless", fuente }],
      coche: null,
      falta: null,
    },
    saber: {
      cosas: [
        {
          clase: "money",
          zona: null,
          nombre: null,
          punto: null,
          frase: "Cards are taken almost everywhere.",
          cuesta: null,
          fuente,
        },
      ],
      falta: null,
    },
    entradas: {
      sitios: [
        {
          parada: v.paradas[0].id,
          precios: [{ ...precio, cuanto: "free" }],
          horarios: [
            {
              desde: null,
              hasta: null,
              franjas: [{ dias: ["mon"], abre: "09:00", cierra: "17:00" }],
              cierra: [],
              fuente,
            },
          ],
          reservar: { haceFalta: true, donde: "https://inventado.example/reservar", fuente },
          web: "https://inventado.example",
          mirado: true,
        },
      ],
      falta: null,
    },
  };
  return { ...sinPresupuesto, presupuesto: presupuestoDe(sinPresupuesto, sinPresupuesto) };
}

test("la forma del viaje: sin capas, con todas, o con alguna en falta, pasa", () => {
  const v = viajeInventado();
  assert.deepEqual(comprobarViaje(v), []);
  const con = conCapas(v);
  assert.deepEqual(comprobarViaje(con), []);
  // El presupuesto suma lo que se sabe de cada manera y cuenta lo que falta.
  const p = con.presupuesto as Presupuesto;
  assert.equal(p.maneras.length, v.maneras.length);
  for (const m of p.maneras)
    assert.equal(
      m.total,
      m.partes.reduce((s, x) => s + (x.total ?? 0), 0),
    );
  // Cada capa puede faltar sola, con su porqué.
  const enFalta: Viaje = {
    ...con,
    moverse: { llegar: [], sinLlegar: null, transportes: [], billetes: [], pagos: [], coche: null, falta: "failed" },
    saber: { cosas: [], falta: "no_contract" },
    entradas: { sitios: [], falta: "late" },
  };
  assert.deepEqual(comprobarViaje(enFalta), []);
  const soloUna: Viaje = { ...v, saber: con.saber };
  assert.deepEqual(comprobarViaje(soloUna), []);
});

test("la forma del viaje: lo que no vale de una capa se caza antes de la web", () => {
  const con = conCapas(viajeInventado());
  const pegas = (v: Viaje): string[] => comprobarViaje(v).map((p) => `${p.donde}: ${p.que}`);
  const m = con.moverse!;
  const s = con.saber!;
  const e = con.entradas!;
  const casos: [Viaje, RegExp][] = [
    // Falta con datos, o con un porqué que no es de la lista.
    [{ ...con, moverse: { ...m, falta: "failed" } }, /^moverse: dice que falta, y aun así trae datos/],
    [{ ...con, saber: { ...s, falta: "lost" as never } }, /^saber: no dice por qué falta/],
    // Un precio sin moneda, o sin página.
    [
      {
        ...con,
        moverse: {
          ...m,
          billetes: [
            { ...m.billetes[0], precios: [{ ...m.billetes[0].precios![0], cuanto: { importe: 2, moneda: "" } }] },
          ],
        },
      },
      /moverse\.billetes\[0\]\.precios\[0\]: no es un importe con su moneda/,
    ],
    [
      {
        ...con,
        moverse: { ...m, llegar: [{ ...m.llegar[0], fuente: { url: "http://x.example", visto: "2031-01-01" } }] },
      },
      /moverse\.llegar\[0\]: no dice de qué página sale/,
    ],
    // Un abono sin sus días; ninguna manera de llegar sin decir por qué.
    [{ ...con, moverse: { ...m, billetes: [{ ...m.billetes[0], dias: null }] } }, /un abono no dice cuántos días vale/],
    [{ ...con, moverse: { ...m, llegar: [] } }, /no hay ninguna manera de llegar a donde se duerme, ni dice por qué/],
    // Una cosa del destino fuera de la lista, demasiado larga, con un enlace, o más de las que caben en su clase.
    [
      { ...con, saber: { ...s, cosas: [{ ...s.cosas[0], clase: "restaurant" as never }] } },
      /no es de una clase de la lista/,
    ],
    [
      { ...con, saber: { ...s, cosas: [{ ...s.cosas[0], frase: "x".repeat(200) }] } },
      /no es una frase de hasta 160 letras/,
    ],
    [
      { ...con, saber: { ...s, cosas: [{ ...s.cosas[0], frase: "See https://x.example" }] } },
      /su frase lleva un enlace/,
    ],
    [{ ...con, saber: { ...s, cosas: Array(4).fill(s.cosas[0]) } }, /trae 4 de money, y caben 3/],
    [
      { ...con, saber: { ...s, cosas: [{ ...s.cosas[0], cuesta: { desde: 1, hasta: 2, moneda: "EUR" } }] } },
      /dice lo que cuesta algo que no es de comer/,
    ],
    // Una entrada de una parada que no es del viaje, dos veces la misma, o un horario que no es un horario.
    [{ ...con, entradas: { ...e, sitios: [{ ...e.sitios[0], parada: "Q999" }] } }, /no es de una parada del viaje/],
    [{ ...con, entradas: { ...e, sitios: [e.sitios[0], e.sitios[0]] } }, /su parada sale dos veces/],
    [
      {
        ...con,
        entradas: {
          ...e,
          sitios: [
            {
              ...e.sitios[0],
              horarios: [
                { ...e.sitios[0].horarios![0], franjas: [{ dias: ["lunes" as never], abre: "9", cierra: "17:00" }] },
              ],
            },
          ],
        },
      },
      /franjas\[0\]: no son unos días con sus horas/,
    ],
    // Un presupuesto cuyo total no es la suma, o con una manera que no es del viaje.
    [
      { ...con, presupuesto: { ...con.presupuesto!, maneras: [{ ...con.presupuesto!.maneras[0], total: 1 }] } },
      /su total no es la suma de sus partes/,
    ],
    [
      { ...con, presupuesto: { ...con.presupuesto!, maneras: [{ ...con.presupuesto!.maneras[0], manera: "otra" }] } },
      /no es de una manera del viaje/,
    ],
  ];
  for (const [v, que] of casos)
    assert.ok(
      pegas(v).some((p) => que.test(p)),
      `${que}: ${pegas(v).join("; ")}`,
    );
});

test("el presupuesto no suma lo que va en otra moneda: lo dice aparte", () => {
  const v = viajeInventado();
  const a = v.alojamientos.find((x) => x.id === v.maneras[0].alojamiento)!;
  const otra: Viaje = {
    ...v,
    alojamientos: v.alojamientos.map((x) => (x.id === a.id ? { ...x, precio: { ...x.precio, moneda: "USD" } } : x)),
  };
  const p = presupuestoDe(otra, {});
  const m = p.maneras[0];
  const dormir = m.partes.find((x) => x.parte === "lodging")!;
  assert.equal(dormir.total, null);
  assert.deepEqual(dormir.aparte, [{ importe: a.precio.total, moneda: "USD" }]);
  assert.deepEqual(m.aparte, [{ importe: a.precio.total, moneda: "USD" }]);
  assert.deepEqual(
    comprobarViaje({ ...otra, presupuesto: p }).filter((x) => x.donde.startsWith("presupuesto")),
    [],
  );
  assert.equal(p.comidas, null);
});
