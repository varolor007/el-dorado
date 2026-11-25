// El presupuesto entero (14.5): la cuenta, sin IA, con el caso inventado. Todo sabido, algo sin saber, un sitio
// gratis, un precio en otra moneda, niños y mayores, ningún trayecto que no se anda, sueltos contra abono en el borde
// y la misma entrada, la misma cuenta. Y las puertas 6 y 7, que no dejan decir una cifra del presupuesto que no sea
// la de la cuenta.

import assert from "node:assert/strict";
import { test } from "node:test";
import { COMIDAS_AL_DIA, PLAZAS_DE_UN_COCHE } from "../../agent/data/presupuesto.ts";
import { SALTO_MAXIMO } from "../../agent/data/dias.ts";
import { puertaCruce, type MaterialDeCruce } from "../../agent/gates/puerta_cruce.ts";
import { puertaDelOrden, puertaExplica, type MaterialDeExplicar } from "../../agent/gates/puerta_explica.ts";
import type {
  DeLasEntradas,
  DeMoverse,
  DelDestino,
  FuenteDeUnDato,
  PrecioDeCapa,
  Presupuesto,
} from "../../agent/output/capas.ts";
import { comprobarViaje, type Viaje } from "../../agent/output/viaje.ts";
import { paraElOrden } from "../../agent/scripts/cierre.ts";
import { paraExplicar } from "../../agent/scripts/explica.ts";
import {
  conOtrosDias,
  delGrupo,
  presupuestoDe,
  preciosParaUno,
  trayectosQueNoSeAndan,
  type CapasParaLaCuenta,
  type CuentaDeMoverse,
} from "../../agent/scripts/presupuesto.ts";
import { resolverZonas } from "../../agent/scripts/ruta.ts";
import { montarTabla } from "../../agent/scripts/tabla.ts";
import { ESTANCIA } from "../cases/inventado/inventado.ts";
import {
  ENTENDIDO,
  entregaDeCruce,
  entregaDeExplicar,
  entregaDeRuta,
  LUGARES,
  piezasDeLaTabla,
} from "../cases/inventado/investigacion.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const F: FuenteDeUnDato = { url: "https://inventado.example/precios", visto: "2027-01-10" };
const OTRA: FuenteDeUnDato = { url: "https://otra.inventado.example/precios", visto: "2027-01-11" };
const eur = (importe: number, para: PrecioDeCapa["para"] = "adult", edades: PrecioDeCapa["edades"] = null) =>
  ({ para, edades, cuanto: { importe, moneda: "EUR" }, fuente: F }) as PrecioDeCapa;
const gratis = (para: PrecioDeCapa["para"] = "any", edades: PrecioDeCapa["edades"] = null): PrecioDeCapa => ({
  para,
  edades,
  cuanto: "free",
  fuente: F,
});

/** Las entradas de unas paradas, con sus precios: null es que no se sabe. */
function entradas(precios: Record<string, PrecioDeCapa[] | null>): DeLasEntradas {
  return {
    sitios: Object.entries(precios).map(([parada, p]) => ({
      parada,
      precios: p,
      horarios: null,
      reservar: null,
      web: null,
      mirado: true,
    })),
    falta: null,
  };
}

/** Cómo moverse: el autobús del aeropuerto del viaje, a tres; un taxi, a 40; un billete suelto y un abono de un día. */
function moverse(): DeMoverse {
  return {
    llegar: [
      {
        desde: { clase: "airport", codigo: "ZZZ", nombre: null },
        aZona: "z1",
        modo: "bus",
        minutos: 40,
        precios: [eur(3)],
        hastaLas: null,
        fuente: F,
      },
      {
        desde: { clase: "airport", codigo: "ZZZ", nombre: null },
        aZona: "z1",
        modo: "taxi",
        minutos: 25,
        precios: [{ ...eur(40, "any"), fuente: OTRA }],
        hastaLas: null,
        fuente: OTRA,
      },
    ],
    sinLlegar: null,
    transportes: [{ modo: "metro", zonas: ["z1"], hastaLas: null, fuente: F }],
    billetes: [
      { clase: "single", dias: null, viajes: 1, modos: ["metro"], precios: [eur(2)], fuente: F },
      { clase: "day_pass", dias: 1, viajes: null, modos: ["metro"], precios: [eur(6)], fuente: F },
    ],
    pagos: [],
    coche: null,
    falta: null,
  };
}

/**
 * Una cuenta de sueltos contra abono inventada, como la que hará 14.2: cada día, lo que menos cuesta para el grupo,
 * sueltos por trayecto o un abono de un día. Solo para estas pruebas.
 */
const sueltosOAbono: CuentaDeMoverse = (m, dias, grupo, moneda) => {
  const precio = (clase: string): number | null => {
    const b = m.billetes.find((x) => x.clase === clase);
    const p = b?.precios?.[0]?.cuanto;
    return p === undefined || p === "free" || p.moneda !== moneda ? null : p.importe;
  };
  const suelto = precio("single");
  const abono = precio("day_pass");
  if (suelto === null || abono === null) return null;
  const personas = grupo.adultos + grupo.ninos.length;
  const importe = dias.reduce(
    (s, d) => s + (d.trayectos === 0 ? 0 : Math.min(d.trayectos * suelto, abono) * personas),
    0,
  );
  return { importe, moneda, fuentes: [F] };
};

const LEJOS = SALTO_MAXIMO + 1;

/** El viaje inventado con unos días que tienen trayectos que no se andan: dos el primero, ninguno el segundo. */
function conTrayectos(v: Viaje = viajeInventado()): Viaje {
  return {
    ...v,
    dias: [
      { fecha: "2027-02-12", titulo: "El centro", paradas: ["p1", "p2", "p4"], metros: [LEJOS, LEJOS] },
      { fecha: "2027-02-13", titulo: "Lo alto", paradas: ["p3"], metros: [] },
    ],
    fuera: [],
    porQueFuera: {},
  };
}

const parte = (p: Presupuesto, manera: string, cual: string) =>
  p.maneras.find((m) => m.manera === manera)!.partes.find((x) => x.parte === cual)!;

const todoSabido = (): CapasParaLaCuenta => ({
  moverse: moverse(),
  entradas: entradas({ p1: [eur(10)], p2: [gratis()], p3: [eur(4)], p4: [eur(12)] }),
});

/** La forma del presupuesto en el viaje, como la mira la casa antes de la web. */
const pegasDe = (v: Viaje, p: Presupuesto) =>
  comprobarViaje({ ...v, presupuesto: p }).filter((x) => x.donde.startsWith("presupuesto"));

// ---------- la cuenta

test("todo sabido: a dormir y llegar se les suman las entradas, moverse allí y llegar a donde se duerme", () => {
  const v = conTrayectos();
  const p = presupuestoDe(v, todoSabido(), { moverse: sueltosOAbono });
  assert.deepEqual(pegasDe(v, p), []);
  assert.equal(p.falta, null);
  for (const m of p.maneras) {
    const manera = v.maneras.find((x) => x.id === m.manera)!;
    const a = v.alojamientos.find((x) => x.id === manera.alojamiento)!;
    assert.deepEqual(
      m.partes.map((x) => [x.parte, x.origen, x.total]),
      [
        ["lodging", "priced", a.precio.total],
        ["transport", "priced", 120],
        // El autobús, para dos, a la ida y a la vuelta: lo que más conviene, frente a un taxi por 40.
        ["arrival", "computed", 3 * 2 * 2],
        // Dos trayectos el primer día: dos sueltos (4) cuestan menos que el abono (6), para dos.
        ["getting_around", "computed", 2 * 2 * 2],
        // Las entradas de los cuatro sitios de los días, para dos adultos.
        ["tickets", "computed", (10 + 0 + 4 + 12) * 2],
      ],
    );
    assert.equal(m.total, a.precio.total + 120 + 12 + 8 + 52);
    assert.equal(m.faltan, 0);
    assert.deepEqual(m.aparte, []);
    // Cada parte de la cuenta dice de qué página sale.
    for (const x of m.partes.slice(2)) assert.deepEqual(x.fuentes, [F]);
  }
  // Las maneras se siguen comparando por dormir y llegar: sus totales no se tocan.
  assert.deepEqual(
    v.maneras.map((m) => m.total),
    viajeInventado().maneras.map((m) => m.total),
  );
  // Sin comidas que decir, no hay horquilla.
  assert.equal(p.comidas, null);
});

test("algo sin saber: ni se suma ni se esconde, se cuenta lo que falta", () => {
  const v = conTrayectos();
  // Sin la entrada de un sitio, sin la de otro, y sin la cuenta de moverse.
  const capas: CapasParaLaCuenta = { moverse: moverse(), entradas: entradas({ p1: [eur(10)], p3: null }) };
  const p = presupuestoDe(v, capas);
  assert.deepEqual(pegasDe(v, p), []);
  const entradasDe = parte(p, "cheapest", "tickets");
  assert.deepEqual([entradasDe.origen, entradasDe.total, entradasDe.faltan], ["computed", 20, 3]);
  // Moverse allí no se sabe: faltan sus dos trayectos.
  const alli = parte(p, "cheapest", "getting_around");
  assert.deepEqual([alli.origen, alli.total, alli.faltan], ["unknown", null, 2]);
  assert.equal(p.maneras[0].faltan, 3 + 2);
  // Sin ninguna capa: llegar a donde se duerme, ida y vuelta; los trayectos; y una entrada por cada parada.
  const nada = presupuestoDe(v, {});
  assert.deepEqual(pegasDe(v, nada), []);
  assert.deepEqual(
    nada.maneras[0].partes.slice(2).map((x) => [x.origen, x.faltan]),
    [
      ["unknown", 2],
      ["unknown", 2],
      ["unknown", 4],
    ],
  );
  // Una capa que falta entera, con su porqué, es lo mismo que no saber.
  const enFalta = presupuestoDe(v, { entradas: { sitios: [], falta: "late" } });
  assert.equal(parte(enFalta, "cheapest", "tickets").faltan, 4);
  // Sin transporte en una manera, no se sabe de dónde se llega.
  const sinVuelo: Viaje = { ...v, maneras: v.maneras.map((m) => ({ ...m, transporte: null })) };
  assert.equal(parte(presupuestoDe(sinVuelo, todoSabido()), "cheapest", "arrival").faltan, 1);
  // En coche se llega a la puerta: no hay nada que pagar para llegar a donde se duerme.
  const enCoche: Viaje = { ...v, transportes: v.transportes.map((t) => ({ ...t, clase: "car" as const })) };
  const llegar = parte(presupuestoDe(enCoche, todoSabido()), "cheapest", "arrival");
  assert.deepEqual([llegar.origen, llegar.total, llegar.faltan], ["computed", 0, 0]);
});

test("un sitio gratis suma cero, con su página: está sabido", () => {
  const v = viajeInventado();
  const p = presupuestoDe(v, { entradas: entradas({ p1: [gratis()], p2: [gratis("adult")], p3: [gratis()] }) });
  const e = parte(p, "cheapest", "tickets");
  assert.deepEqual([e.origen, e.total, e.faltan, e.fuentes], ["computed", 0, 0, [F]]);
  assert.deepEqual(pegasDe(v, p), []);
});

test("un precio en otra moneda no se suma: se dice aparte, en su parte y en su manera", () => {
  const v = viajeInventado();
  const enDolares: PrecioDeCapa = { ...eur(15), cuanto: { importe: 15, moneda: "USD" } };
  const p = presupuestoDe(v, { entradas: entradas({ p1: [eur(10)], p2: [enDolares], p3: [gratis()] }) });
  const e = parte(p, "cheapest", "tickets");
  assert.deepEqual([e.total, e.faltan, e.aparte], [20, 0, [{ importe: 30, moneda: "USD" }]]);
  assert.deepEqual(p.maneras[0].aparte, [{ importe: 30, moneda: "USD" }]);
  assert.deepEqual(pegasDe(v, p), []);
  // Si todo lo que se sabe va en otra moneda, la parte no se sabe en la del viaje, y lo de la otra se dice.
  const solo = presupuestoDe(v, { entradas: entradas({ p1: [enDolares], p2: [enDolares], p3: [enDolares] }) });
  const s = parte(solo, "cheapest", "tickets");
  assert.deepEqual([s.origen, s.total, s.aparte], ["unknown", null, [{ importe: 90, moneda: "USD" }]]);
  assert.deepEqual(pegasDe(v, solo), []);
  // Lo mismo con lo que da la cuenta de moverse.
  const enOtra: CuentaDeMoverse = () => ({ importe: 9, moneda: "USD", fuentes: [F] });
  const m = parte(
    presupuestoDe(conTrayectos(), { moverse: moverse() }, { moverse: enOtra }),
    "cheapest",
    "getting_around",
  );
  assert.deepEqual([m.origen, m.total, m.faltan, m.aparte], ["unknown", null, 0, [{ importe: 9, moneda: "USD" }]]);
});

test("niños y mayores: cada precio, para quien es", () => {
  const precios = [
    eur(10),
    eur(5, "child", { desde: 3, hasta: 12 }),
    gratis("infant", { desde: 0, hasta: 2 }),
    eur(6, "senior", { desde: 65, hasta: null }),
    eur(4, "student"),
    eur(25, "family"),
  ];
  // Un adulto paga el de adulto: de los adultos no se sabe la edad, y nunca se le pone el de mayor ni el de estudiante.
  assert.deepEqual(
    preciosParaUno(precios, null).map((x) => x.cuanto),
    [{ importe: 10, moneda: "EUR" }],
  );
  // Con niños de 1, 8 y 15 años: el bebé, gratis; el de 8, el de niño; el de 15, que no entra en ninguno, el de adulto.
  const grupo = { adultos: 2, ninos: [1, 8, 15] };
  assert.deepEqual(delGrupo(precios, grupo, "EUR")?.importes, [{ importe: 10 + 10 + 0 + 5 + 10, moneda: "EUR" }]);
  // Un precio de niño sin edades: no se sabe si es el suyo, y el sitio entero no se sabe.
  assert.equal(delGrupo([eur(10), eur(5, "child")], grupo, "EUR"), null);
  // Un precio de adulto que dice desde qué edad no vale para un niño más pequeño.
  assert.equal(delGrupo([eur(10, "adult", { desde: 13, hasta: null })], { adultos: 1, ninos: [8] }, "EUR"), null);
  // Solo hay precio de mayor o de estudiante: para un adulto, no se sabe.
  assert.equal(delGrupo([eur(6, "senior"), eur(4, "student")], { adultos: 1, ninos: [] }, "EUR"), null);
  // En el viaje: dos adultos y tres niños, en las entradas y en el autobús del aeropuerto.
  const v: Viaje = { ...viajeInventado(), ninos: [1, 8, 15] };
  const p = presupuestoDe(v, { moverse: moverse(), entradas: entradas({ p1: precios, p2: [gratis()], p3: precios }) });
  assert.equal(parte(p, "cheapest", "tickets").total, 35 * 2);
  // El autobús, a tres por cabeza para cinco (15), frente a dos taxis (80): cinco no caben en uno.
  assert.equal(Math.ceil(5 / PLAZAS_DE_UN_COCHE), 2);
  assert.equal(parte(p, "cheapest", "arrival").total, 15 * 2);
  assert.deepEqual(pegasDe(v, p), []);
});

test("un taxi se paga por coche: para dos conviene más que el autobús si este es caro", () => {
  const caro = moverse();
  caro.llegar[0].precios = [eur(25)];
  const p = presupuestoDe(viajeInventado(), { moverse: caro });
  const llegar = parte(p, "cheapest", "arrival");
  // Dos por 25 a la ida (50) frente a un taxi por 40: el taxi, a la ida y a la vuelta, con su página.
  assert.deepEqual([llegar.total, llegar.fuentes], [80, [OTRA]]);
});

test("llegar a donde se duerme: a la zona del alojamiento de cada manera, por el nombre con que la dice", () => {
  const m = moverse();
  m.llegar = [
    { ...m.llegar[0], aZona: "z1", precios: [eur(3)] },
    { ...m.llegar[0], aZona: "z2", precios: [eur(7)] },
  ];
  const v = viajeInventado();
  const conZonas: Viaje = {
    ...v,
    alojamientos: v.alojamientos.map((a) => ({ ...a, zona: a.id === "a1" ? "Centro" : "Puerto" })),
  };
  const zonas = [
    { id: "z1", nombre: "Centro" },
    { id: "z2", nombre: "Puerto" },
  ];
  const p = presupuestoDe(conZonas, { moverse: m }, { zonas });
  // La más barata duerme en a2 (el puerto); la mejor por lo que cuesta, en a1 (el centro).
  assert.equal(parte(p, "cheapest", "arrival").total, 7 * 2 * 2);
  assert.equal(parte(p, "best_value", "arrival").total, 3 * 2 * 2);
  // Sin las zonas de la ruta, y con maneras de llegar a dos zonas distintas, no se sabe cuál.
  assert.equal(parte(presupuestoDe(v, { moverse: m }), "cheapest", "arrival").origen, "unknown");
  // De otro aeropuerto no vale.
  const otro = moverse();
  otro.llegar = otro.llegar.map((x) => ({ ...x, desde: { ...x.desde, codigo: "YYY" } }));
  assert.equal(parte(presupuestoDe(v, { moverse: otro }), "cheapest", "arrival").origen, "unknown");
});

test("ningún trayecto que no se anda: moverse allí es cero, sin preguntar a la cuenta", () => {
  const v = viajeInventado();
  assert.deepEqual(
    trayectosQueNoSeAndan(v).map((d) => d.trayectos),
    [0, 0],
  );
  let llamada = false;
  const cuenta: CuentaDeMoverse = () => ((llamada = true), null);
  const alli = parte(presupuestoDe(v, {}, { moverse: cuenta }), "cheapest", "getting_around");
  assert.deepEqual([alli.origen, alli.total, alli.faltan], ["computed", 0, 0]);
  assert.equal(llamada, false);
  // Justo en lo que se anda, se anda.
  const enElBorde: Viaje = { ...v, dias: [{ ...v.dias[0], metros: [SALTO_MAXIMO] }, v.dias[1]] };
  assert.equal(trayectosQueNoSeAndan(enElBorde)[0].trayectos, 0);
});

test("sueltos contra abono en el borde: la cuenta suma lo que da la de moverse, ni más ni menos", () => {
  const conN = (n: number): Viaje => ({
    ...conTrayectos(),
    dias: [{ fecha: "2027-02-12", titulo: "Lejos", paradas: ["p1"], metros: Array(n).fill(LEJOS) }],
  });
  const alli = (n: number) =>
    parte(presupuestoDe(conN(n), { moverse: moverse() }, { moverse: sueltosOAbono }), "cheapest", "getting_around");
  // Dos sueltos cuestan 4; tres, 6, lo mismo que el abono; cuatro, 8, y conviene el abono: para dos.
  assert.equal(alli(2).total, 4 * 2);
  assert.equal(alli(3).total, 6 * 2);
  assert.equal(alli(4).total, 6 * 2);
  // Si la cuenta no sabe (sin precio del abono), no se sabe, y faltan los trayectos.
  const sinAbono = moverse();
  sinAbono.billetes = sinAbono.billetes.filter((b) => b.clase !== "day_pass");
  const p = presupuestoDe(conN(3), { moverse: sinAbono }, { moverse: sueltosOAbono });
  assert.deepEqual(
    [parte(p, "cheapest", "getting_around").origen, parte(p, "cheapest", "getting_around").faltan],
    ["unknown", 3],
  );
  // Una cuenta que devuelve algo que no es un importe tampoco se suma.
  const rota: CuentaDeMoverse = () => ({ importe: Number.NaN, moneda: "EUR", fuentes: [] });
  assert.equal(
    parte(presupuestoDe(conN(3), { moverse: moverse() }, { moverse: rota }), "cheapest", "getting_around").total,
    null,
  );
  // Y la de hoy, mientras 14.2 no la enchufe aquí, no sabe: moverse allí queda sin saber.
  assert.equal(parte(presupuestoDe(conN(3), { moverse: moverse() }), "cheapest", "getting_around").origen, "unknown");
});

test("las comidas van aparte: una horquilla por día y por persona, que no se suma", () => {
  const saber = (cuestas: { desde: number; hasta: number; moneda: string }[]): DelDestino => ({
    cosas: cuestas.map((cuesta) => ({
      clase: "meal_cost",
      zona: null,
      nombre: null,
      punto: null,
      frase: "Lo que suele costar una comida.",
      cuesta,
      fuente: F,
    })),
    falta: null,
  });
  const v = viajeInventado();
  const p = presupuestoDe(v, {
    saber: saber([
      { desde: 8, hasta: 12, moneda: "EUR" },
      { desde: 15, hasta: 30, moneda: "EUR" },
    ]),
  });
  assert.deepEqual(p.comidas, { desde: 8 * COMIDAS_AL_DIA, hasta: 30 * COMIDAS_AL_DIA, moneda: "EUR", fuentes: [F] });
  // No entra en ningún total.
  assert.deepEqual(
    p.maneras.map((m) => m.total),
    presupuestoDe(v, {}).maneras.map((m) => m.total),
  );
  assert.deepEqual(pegasDe(v, p), []);
  // En otra moneda, en la suya; sin lo que cuesta una comida, null.
  assert.equal(presupuestoDe(v, { saber: saber([{ desde: 5, hasta: 9, moneda: "USD" }]) }).comidas?.moneda, "USD");
  assert.equal(presupuestoDe(v, { saber: { cosas: [], falta: "failed" } }).comidas, null);
});

test("la misma entrada, la misma cuenta; y con otros días, la web rehace solo lo que cambia", () => {
  const v = conTrayectos();
  const capas = todoSabido();
  const una = presupuestoDe(v, capas, { moverse: sueltosOAbono });
  const otra = presupuestoDe(structuredClone(v), structuredClone(capas), { moverse: sueltosOAbono });
  assert.deepEqual(otra, una);
  assert.equal(JSON.stringify(otra), JSON.stringify(una));
  // Quitar una parada (p4) y su trayecto: las entradas y moverse allí bajan; llegar a donde se duerme se queda.
  const sinP4: Viaje = {
    ...v,
    dias: [{ ...v.dias[0], paradas: ["p1", "p2"], metros: [LEJOS] }, v.dias[1]],
    fuera: ["p4"],
    porQueFuera: { p4: "removed" },
  };
  const despues = conOtrosDias(sinP4, capas, una, { moverse: sueltosOAbono });
  assert.equal(parte(despues, "cheapest", "tickets").total, (10 + 4) * 2);
  assert.equal(parte(despues, "cheapest", "getting_around").total, 2 * 2);
  assert.deepEqual(parte(despues, "cheapest", "arrival"), parte(una, "cheapest", "arrival"));
  assert.deepEqual(pegasDe(sinP4, despues), []);
});

// ---------- las puertas 6 y 7, con los números del presupuesto

const PIEZAS = await piezasDeLaTabla();
const TABLA = montarTabla(PIEZAS);
const CRUCE = entregaDeCruce(TABLA);
const DADO = paraExplicar(TABLA, CRUCE, PIEZAS.mirados, resolverZonas(entregaDeRuta(), LUGARES), {
  entrada: ESTANCIA.entrada,
  salida: ESTANCIA.salida,
});
const TOTAL_DE_LA_TABLA = TABLA.rows[0].total;
/** Un presupuesto cuyas cifras no están en la tabla: dormir, 50 menos que su fila; las entradas, 37. */
const CUENTA: Presupuesto = {
  maneras: [
    {
      manera: "cheapest",
      partes: [
        {
          parte: "lodging",
          origen: "priced",
          total: TOTAL_DE_LA_TABLA - 50,
          moneda: "EUR",
          fuentes: [],
          faltan: 0,
          aparte: [],
        },
        { parte: "tickets", origen: "computed", total: 37, moneda: "EUR", fuentes: [F], faltan: 1, aparte: [] },
      ],
      total: TOTAL_DE_LA_TABLA - 50 + 37,
      moneda: "EUR",
      faltan: 1,
      aparte: [],
    },
  ],
  comidas: null,
  falta: null,
};

test("la puerta 6: el que cruza no vende el total de una manera como el presupuesto entero", () => {
  const material: MaterialDeCruce = { tabla: TABLA, viaje: ENTENDIDO };
  const conFrase = (frase: string) => {
    const e = structuredClone(CRUCE) as Record<string, any>;
    e.unknowns = [...e.unknowns, frase];
    return e;
  };
  assert.deepEqual(puertaCruce(CRUCE, material).rojos, []);
  // La trampa: una cifra que sí está en la tabla, dicha como si fuera el viaje entero.
  const trampa = conFrase(`The whole trip comes to ${TOTAL_DE_LA_TABLA} EUR.`);
  assert.match(
    puertaCruce(trampa, material)
      .rojos.map((r) => r.que)
      .join(" | "),
    /presupuesto entero/,
  );
  // Con la cuenta delante, la cifra de la cuenta pasa, y la de la tabla no.
  const conCuenta = { ...material, presupuesto: CUENTA };
  assert.deepEqual(
    puertaCruce(conFrase(`The whole trip comes to ${TOTAL_DE_LA_TABLA - 13} EUR.`), conCuenta).rojos,
    [],
  );
  assert.equal(puertaCruce(trampa, conCuenta).verde, false);
  // Las fechas, las noches y el grupo se pueden decir; y una frase que no habla del presupuesto se mira como siempre.
  assert.deepEqual(
    puertaCruce(conFrase(`The budget for the ${ENTENDIDO.travellers.adults} of you is not known yet.`), material).rojos,
    [],
  );
  assert.deepEqual(puertaCruce(conFrase(`This way costs ${TOTAL_DE_LA_TABLA} EUR.`), material).rojos, []);
});

test("la puerta 7: el que explica, y al cerrar, tampoco; la cifra del presupuesto es la de la cuenta", () => {
  const material: MaterialDeExplicar = { viaje: ENTENDIDO, dado: DADO, avisos: [] };
  const bien = entregaDeExplicar(DADO) as Record<string, any>;
  const conFrase = (frase: string) => ({ ...structuredClone(bien), unknowns: [...bien.unknowns, frase] });
  const base = puertaExplica(bien, material).rojos.length;
  const trampa = conFrase(`El presupuesto del viaje entero es ${TOTAL_DE_LA_TABLA} euros.`);
  const rojos = puertaExplica(trampa, material).rojos.filter((r) => /presupuesto entero/.test(r.que));
  assert.equal(rojos.length, 1);
  const conCuenta = { ...material, presupuesto: CUENTA };
  const bueno = conFrase(`El presupuesto del viaje entero es ${TOTAL_DE_LA_TABLA - 13} euros, y falta 1 cosa.`);
  assert.equal(puertaExplica(bueno, conCuenta).rojos.filter((r) => /presupuesto entero/.test(r.que)).length, 0);
  assert.equal(puertaExplica(bueno, conCuenta).rojos.length, base);
  // Al cerrar, igual.
  const v = viajeInventado();
  const dado = paraElOrden(v, {
    reservas: [],
    papeles: [],
    sinConfirmar: [],
    llegada: "ok",
    entradaDesde: "14:00",
    precios: [],
    total: { antes: 300, hoy: 300 },
    moneda: "EUR",
  });
  const cierre = (frase: string) => ({
    seat: "trip-explainer",
    language: "es",
    closing: { steps: [], papers: [], unknowns: [frase] },
  });
  assert.deepEqual(puertaDelOrden(cierre("Lo que falta por saber se dice en tu viaje."), { dado }).rojos, []);
  assert.match(
    puertaDelOrden(cierre("Todo incluido, el viaje te sale por 300 euros."), { dado })
      .rojos.map((r) => r.que)
      .join(" | "),
    /presupuesto entero/,
  );
  const conLaSuya: Presupuesto = { ...CUENTA, maneras: [{ ...CUENTA.maneras[0], total: 412 }] };
  assert.deepEqual(
    puertaDelOrden(cierre("Todo incluido, el viaje te sale por 412 euros."), { dado, presupuesto: conLaSuya }).rojos,
    [],
  );
});
