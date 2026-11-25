// La guía con las capas del destino (14.6): lo que se le da al que escribe la guía de lo que el viaje sabe de allí (la
// entrada y el horario de cada parada ese día, dónde se come cada día, cómo moverse y lo que conviene saber), la
// puerta 10 con sus trampas nuevas, y el cuaderno con «Cómo moverte», «Antes de ir» y dónde comer, cada dato con su
// fecha. Una capa que falta no se nombra. Con el viaje inventado y un asiento de mentira: sin gastar.

import assert from "node:assert/strict";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ROTULOS } from "../../agent/data/guia.ts";
import {
  puertaCuaderno,
  puertaGuia,
  type EntregaDeLaGuia,
  type MaterialDeLaGuia,
} from "../../agent/gates/puerta_guia.ts";
import { carpetaDeLaGuia, llevarLaGuia, materialDeLaGuia, pedirGuia } from "../../agent/launcher/guia.ts";
import { puestosDe } from "../../agent/launcher/puesto.ts";
import { comprobarViaje, type Viaje } from "../../agent/output/viaje.ts";
import { montarCuaderno, pintarCuaderno, type Cuaderno } from "../../agent/scripts/cuaderno.ts";
import {
  entregaDeLaGuia,
  HOY,
  lanzadorDeLaGuia,
  PAGINAS_DE_ALLI,
  viajeCerradoEnLaMesa,
  viajeParaLaGuia,
} from "../cases/inventado/guia.ts";

/** Ni rayas largas, ni puntos medios, ni el carácter de puntos suspensivos, por sus códigos. */
const PROHIBIDOS = new RegExp(`[${String.fromCharCode(0x2014, 0xb7, 0x2026)}]`);

type ConViaje = MaterialDeLaGuia & { viaje: Viaje };

/** El material de la guía de un viaje cerrado en una mesa nueva, con la mejor manera. */
function conMaterial(viaje: Viaje, prueba: (m: ConViaje) => void): void {
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje });
  try {
    prueba(materialDeLaGuia(v, pedirGuia(v, { manera: "best_value", hoy: HOY })));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

const rojosDe = (entrega: unknown, m: MaterialDeLaGuia): string[] =>
  puertaGuia(entrega, m).rojos.map((r) => `${r.donde}: ${r.que}`);

const cuadernoDe = (m: ConViaje): Cuaderno =>
  montarCuaderno(m.viaje, m.dado, entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia, {
    manera: "best_value",
    hecha: HOY,
  });

test("al que escribe la guía se le da lo que el viaje sabe de allí: entradas, dónde comer, moverse y saber", () => {
  conMaterial(viajeParaLaGuia({ capas: true }), (m) => {
    // El viaje con sus capas es un viaje que la web enseñaría.
    assert.deepEqual(comprobarViaje(m.viaje), []);
    const [uno, dos] = m.dado.days;
    // La torre se paga y abre el viernes; el mercado es gratis y se reserva; el mirador cierra el sábado.
    assert.deepEqual(uno.stops[0].ticket, {
      prices: [
        { for: "adult", ages: null, amount: 10, currency: "EUR" },
        { for: "child", ages: { from: null, to: 12 }, amount: "free", currency: null },
      ],
      open_that_day: "yes",
      hours_that_day: [{ opens: "09:00", closes: "18:00" }],
      book_ahead: "no",
    });
    assert.equal(uno.stops[1].ticket?.book_ahead, "yes");
    assert.deepEqual(dos.stops[0].ticket, {
      prices: "unknown",
      open_that_day: "no",
      hours_that_day: [],
      book_ahead: "unknown",
    });
    // Dónde comer: cada sitio con punto, al día de la parada que le queda cerca; el que está lejos, sin día.
    assert.deepEqual(
      uno.eat?.map((x) => [x.name, x.near]),
      [["Calle de las Tascas", "p1"]],
    );
    assert.deepEqual(
      dos.eat?.map((x) => [x.name, x.near]),
      [["Mercado de la Plaza", "p3"]],
    );
    assert.ok(uno.eat!.every((x) => x.metres > 0 && x.metres <= 1200));
    assert.deepEqual(
      m.dado.know?.map((x) => x.kind),
      ["neighbourhood", "money", "practical", "dish", "meal_cost", "food_area"],
    );
    assert.equal(m.dado.know?.at(-1)?.name, "Puerto Viejo");
    // Cómo moverse, por sus claves y sus números, sin sus páginas.
    assert.deepEqual(
      m.dado.around?.transport.map((x) => x.mode),
      ["bus", "metro"],
    );
    assert.equal(m.dado.around?.car_needed, "no");
    assert.doesNotMatch(JSON.stringify(m.dado), /https?:/);
  });
});

test("una parada que se reserva según sus entradas va a lo que hay que llevar hecho", () => {
  const viaje = viajeParaLaGuia({ capas: true });
  delete viaje.paradas[1].reservar;
  conMaterial(viaje, (m) => {
    assert.equal(m.dado.days[0].stops[1].book_ahead, "unknown");
    assert.deepEqual(m.dado.todo[0], {
      item: 0,
      kind: "book_ahead",
      stop: "p2",
      name: "Mercado Inventado",
      date: "2027-02-12",
    });
  });
});

test("una capa que falta, o un viaje de antes sin capas, no se nombra: ni en el material ni en el cuaderno", () => {
  const sinCapas = viajeParaLaGuia();
  const conFaltas = viajeParaLaGuia({ capas: true });
  conFaltas.moverse = { ...conFaltas.moverse!, llegar: [], transportes: [], billetes: [], pagos: [], coche: null };
  conFaltas.moverse.falta = "failed";
  conFaltas.saber = { cosas: [], falta: "late" };
  conFaltas.entradas = { sitios: [], falta: "no_contract" };
  for (const viaje of [sinCapas, conFaltas])
    conMaterial(viaje, (m) => {
      const todo = JSON.stringify(m.dado);
      for (const clave of ['"ticket"', '"eat"', '"around"', '"know"']) assert.ok(!todo.includes(clave), clave);
      const c = cuadernoDe(m);
      assert.deepEqual(puertaCuaderno(c, m.viaje).rojos, []);
      assert.equal(c.moverse, null);
      assert.deepEqual(c.saber, []);
      assert.ok(c.dias.every((d) => d.comer?.length === 0 && d.paradas.every((p) => p.entrada === null)));
      const html = pintarCuaderno(c);
      for (const rotulo of [ROTULOS.es.comoMoverte, ROTULOS.es.antesDeIr, ROTULOS.es.dondeComer, ROTULOS.es.entrada])
        assert.ok(!html.includes(rotulo), rotulo);
    });
});

test("la puerta 10 deja pasar lo de allí que trae el viaje, y caza lo que no trae", () => {
  conMaterial(viajeParaLaGuia({ capas: true }), (m) => {
    assert.deepEqual(rojosDe(entregaDeLaGuia(m.dado), m), []);
    const trampa = (cambia: (e: EntregaDeLaGuia) => void, espera: RegExp): void => {
      const e = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
      cambia(e);
      const rojos = rojosDe(e, m);
      assert.ok(
        rojos.some((r) => espera.test(r)),
        `${espera} no salió en ${JSON.stringify(rojos)}`,
      );
    };
    const parada = (e: EntregaDeLaGuia) => e.days[0].stops[0];
    // Un precio y una hora del viaje pasan; otros, no.
    const bien = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    parada(bien).when = "Abre de 9:00 a 18:00, y la entrada cuesta 10 € por adulto; el autobús, 2 €.";
    assert.deepEqual(rojosDe(bien, m), []);
    trampa((e) => (parada(e).when = "La entrada cuesta 15 €."), /dice el precio 15, que no está en el viaje/);
    trampa((e) => (parada(e).when = "Para los dos, 20 euros."), /dice el precio 20/);
    trampa((e) => (parada(e).when = "Abre a las 11:15."), /dice la hora 11:15/);
    // Dónde comer: el día que lo sabe, siempre; el que no, nunca.
    trampa((e) => delete e.days[0].eat, /days\[0\]\.eat: está en blanco/);
    const sinComer: MaterialDeLaGuia = structuredClone(m);
    delete sinComer.dado.days[1].eat;
    const deMas = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    assert.ok(rojosDe(deMas, sinComer).some((r) => /days\[1\]\.eat: ese día el viaje no sabe dónde comer/.test(r)));
    // Un transporte que el viaje no trae, en un tramo que no se anda.
    const lejos = m.dado.days[0].legs.findIndex((l) => !l.on_foot);
    assert.ok(lejos >= 0);
    trampa((e) => (e.days[0].legs[lejos].says = "Unos 15 minutos en tranvía."), /se va en tram, y el viaje no/);
    // Un sitio de fuera sigue sin poder nombrarse, aunque sea de comer.
    trampa((e) => (e.days[0].eat = "Para comer, junto al Palacio Olvidado."), /Palacio Olvidado.*no es una parada/);
  });
});

test("la puerta 10, sin capas, sigue sin dejar decir dinero, ni el nombre de un transporte de allí", () => {
  conMaterial(viajeParaLaGuia(), (m) => {
    const e = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    e.days[0].stops[0].when = "La entrada cuesta 10 €.";
    assert.ok(rojosDe(e, m).some((r) => /habla de dinero/.test(r)));
  });
  const viaje = viajeParaLaGuia();
  viaje.paradas[2].punto = { lat: 10.5, lon: 20.5 };
  conMaterial(viaje, (m) => {
    const e = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    e.days[1].legs[0].says = "Unos minutos en autobús.";
    assert.ok(rojosDe(e, m).some((r) => /se va en bus, y el viaje no lo trae/.test(r)));
  });
});

test("el cuaderno pone lo de allí de los datos del viaje, cada dato con su día; su puerta caza lo que no es", () => {
  conMaterial(viajeParaLaGuia({ capas: true }), (m) => {
    const c = cuadernoDe(m);
    assert.deepEqual(puertaCuaderno(c, m.viaje).rojos, []);
    // La entrada de cada parada, la de ese día; dónde comer, con su frase del que escribe.
    assert.equal(c.dias[0].paradas[0].entrada?.abre, true);
    assert.deepEqual(c.dias[0].paradas[0].entrada?.franjas[0], {
      dias: ["tue", "wed", "thu", "fri", "sat", "sun"],
      abre: "09:00",
      cierra: "18:00",
    });
    assert.equal(c.dias[1].paradas[0].entrada?.abre, false);
    assert.equal(c.dias[0].comer?.[0].cosa.nombre, "Calle de las Tascas");
    assert.match(c.dias[0].comerDice ?? "", /Calle de las Tascas/);
    assert.equal(c.moverse?.billetes.length, 2);
    assert.equal(c.saber?.length, 6);
    // Los precios de allí cuentan para la fecha de los precios.
    assert.equal(c.preciosDel, PAGINAS_DE_ALLI.visto);
    // Las trampas: un precio cambiado, un sitio de comer que no es del viaje, una capa que el viaje no tiene, otro
    // horario, y una página que no se puede abrir.
    const trampa = (cambia: (x: Cuaderno, v: Viaje) => void, espera: RegExp): void => {
      const roto = structuredClone(c);
      const viaje = structuredClone(m.viaje);
      cambia(roto, viaje);
      const rojos = puertaCuaderno(roto, viaje).rojos.map((r) => `${r.donde}: ${r.que}`);
      assert.ok(
        rojos.some((r) => espera.test(r)),
        `${espera} en ${JSON.stringify(rojos)}`,
      );
    };
    trampa((x) => {
      const p = x.dias[0].paradas[0].entrada!.precios![0];
      if (p.cuanto !== "free") p.cuanto.importe = 8;
    }, /entrada: no es la entrada/);
    trampa((x) => (x.dias[1].paradas[0].entrada!.abre = true), /entrada: no es la entrada/);
    trampa((x) => (x.dias[0].comer![0].cosa.frase = "Otra frase."), /comer\[0\]: no es un sitio/);
    trampa((x) => x.dias[1].comer!.push(structuredClone(x.dias[0].comer![0])), /no le toca a ese día/);
    trampa((x) => (x.dias[0].comer![0].metros = 10), /no le toca a ese día|cuenta de la casa/);
    trampa((x) => (x.saber![0].frase = "Otra cosa."), /saber\[0\]: no es una cosa/);
    trampa((_, v) => delete v.moverse, /el viaje no sabe cómo moverse/);
    trampa((x) => (x.moverse!.billetes[0].precios = null), /moverse\.billetes\[0\]: no es una del viaje/);
    trampa((x, v) => {
      v.saber!.cosas[0].fuente.url = "http://turismo.inventado.example/guia";
      x.saber![0].fuente.url = "http://turismo.inventado.example/guia";
    }, /un dato de allí no dice de qué página sale/);
    trampa((x) => (x.dias[1].comerDice = "Come aquí." as string) && (x.dias[1].comer = []), /dice dónde comer/);
  });
});

test("el cuaderno se pinta con «Cómo moverte», «Antes de ir» y dónde comer, en los dos idiomas", () => {
  for (const idioma of ["es", "en"] as const) {
    const viaje = viajeParaLaGuia({ capas: true });
    viaje.idioma = idioma;
    conMaterial(viaje, (m) => {
      const r = ROTULOS[idioma];
      const html = pintarCuaderno(cuadernoDe(m));
      for (const dicho of [r.comoMoverte, r.antesDeIr, r.dondeComer, r.cierraEseDia, r.modo.metro, r.deAlli])
        assert.ok(html.includes(dicho), `${idioma}: ${dicho}`);
      assert.ok(html.includes(r.visto(idioma === "es" ? "20 de noviembre de 2026" : "November 20, 2026")));
      // La página donde se reserva el mercado, y las fuentes de allí, al final.
      assert.ok(html.includes(PAGINAS_DE_ALLI.reservar));
      assert.ok(html.includes(`href="${PAGINAS_DE_ALLI.transporte}"`));
      assert.doesNotMatch(html, PROHIBIDOS);
      assert.doesNotMatch(html, />unknown</);
    });
  }
  // Los rótulos nuevos, en los dos idiomas y con las mismas claves.
  assert.deepEqual(Object.keys(ROTULOS.es).sort(), Object.keys(ROTULOS.en).sort());
  for (const idioma of ["es", "en"]) assert.doesNotMatch(JSON.stringify(ROTULOS[idioma]), PROHIBIDOS);
});

test("un cuaderno guardado antes de las capas se sigue pintando", () => {
  conMaterial(viajeParaLaGuia({ capas: true }), (m) => {
    const viejo = structuredClone(cuadernoDe(m)) as Partial<Cuaderno> & Cuaderno;
    delete viejo.moverse;
    delete viejo.saber;
    for (const d of viejo.dias) {
      delete d.comer;
      delete d.comerDice;
      for (const p of d.paradas) delete p.entrada;
    }
    const html = pintarCuaderno(viejo);
    assert.ok(!html.includes(ROTULOS.es.comoMoverte));
    assert.match(html, /Torre Inventada/);
  });
});

test("la guía de un viaje con capas sale entera, y el asiento recibe lo de allí en sus archivos", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje: viajeParaLaGuia({ capas: true }) });
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    const lanzador = lanzadorDeLaGuia();
    const e = await llevarLaGuia(v, p.n, lanzador, { hoy: () => HOY, sinFotos: true });
    assert.deepEqual(e, { estado: "ready" });
    const puesto = puestosDe(carpetaDeLaGuia(v, p.n))[0];
    assert.deepEqual(readdirSync(join(puesto.carpeta, "in")).sort(), [
      "around.json",
      "days.json",
      "know.json",
      "stay.json",
      "todo.json",
      "trip.json",
    ]);
    assert.ok(existsSync(join(carpetaDeLaGuia(v, p.n), "guia.html")));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("sin capas, el asiento no recibe archivos de lo de allí", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    assert.deepEqual(await llevarLaGuia(v, p.n, lanzadorDeLaGuia(), { hoy: () => HOY, sinFotos: true }), {
      estado: "ready",
    });
    const puesto = puestosDe(carpetaDeLaGuia(v, p.n))[0];
    const dentro = readdirSync(join(puesto.carpeta, "in"));
    assert.ok(!dentro.includes("around.json") && !dentro.includes("know.json"));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
