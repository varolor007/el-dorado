// El de los papeles y la puerta 2 (5.4): la tabla que hay que llenar, sin nombres; las cuentas de plazos del código;
// la puerta, con una entrega buena y una trampa por cada cosa que tiene que cazar; y la investigación, que para
// antes de gastar en buscar si algo bloquea, hasta que el viajero decide seguir. Sin internet y sin gastar.
//
// Los países inventados (ZZ, el destino, e YY, el del viajero) no tienen dominios oficiales en nuestra lista: donde
// hace falta, se les ponen unos de mentira mientras dura la prueba.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { DOMINIOS_OFICIALES, dominiosDe, esOficial, PREGUNTAS, UNION_EUROPEA } from "../../agent/data/papeles.ts";
import { topesDeInternet, TOPES_DE_INTERNET } from "../../agent/data/internet.ts";
import { puertaPapeles } from "../../agent/gates/puerta_papeles.ts";
import { sigue } from "../../agent/launcher/investigar.ts";
import {
  celdasDe,
  filasDe,
  moverMeses,
  paraEnsenarPapeles,
  piezasDeLosPapeles,
  seguirConLosPapeles,
  turnoDeLosPapeles,
  validoHasta,
  type Celda,
} from "../../agent/launcher/papeles.ts";
import { porDondeVa } from "../../agent/launcher/pasos.ts";
import { comprobarViaje, pegasDeLosPapeles, type Viaje } from "../../agent/output/viaje.ts";
import type { Entendido, Papel } from "../../agent/scripts/formas.ts";
import {
  fuentesInventadas,
  guardarPaginas,
  leerJson,
  runNuevo,
  trabaja,
  type Objeto,
} from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const DESTINO = "https://gobierno.zz.example";
const CASA = "https://ministerio.yy.example";

/** Con dominios de mentira para los dos países inventados, solo mientras dura lo que se le pase. */
async function conDominios(hacer: () => void | Promise<void>): Promise<void> {
  DOMINIOS_OFICIALES.ZZ = ["gobierno.zz.example"];
  DOMINIOS_OFICIALES.YY = ["ministerio.yy.example"];
  try {
    await hacer();
  } finally {
    delete DOMINIOS_OFICIALES.ZZ;
    delete DOMINIOS_OFICIALES.YY;
  }
}

// Dos adultos de YY y una niña de 9 años de YY, a ZZ, del 10 al 14 de julio de 2031.
const VIAJE: Entendido = {
  ...ENTENDIDO,
  dates: { check_in: "2031-07-10", check_out: "2031-07-14", flexible: false },
  travellers: { adults: 2, children: [9], rooms: 1, passports: ["YY", "YY", "YY"] },
};

const fuente = (lado: "destination" | "home", estado: string, camino = "entrada"): Objeto => ({
  url: `${lado === "destination" ? DESTINO : CASA}/${camino}`,
  side: lado,
  status: estado,
  seen: "2031-03-02",
});

/** Una casilla en regla con dos fuentes; la vigencia del pasaporte, con su regla; el formulario, a hacer. */
function casillaDe(c: Celda): Papel {
  const base = {
    ...c,
    status: "in_order",
    doubt: "unknown",
    sources: [fuente("destination", "in_order"), fuente("home", "in_order", "consejos")],
    valid_for: "unknown",
    before_arrival: "unknown",
    cost: "unknown",
    what: "nothing is asked for this",
  } as Objeto;
  if (c.question === "passport_validity")
    Object.assign(base, {
      status: "to_do",
      sources: [fuente("destination", "to_do")],
      valid_for: { months: 6, days: 0, after: "departure" },
      what: "the passport has to be valid six months beyond departure",
    });
  if (c.question === "arrival_card")
    Object.assign(base, {
      status: "to_do",
      sources: [fuente("destination", "to_do", "formulario")],
      before_arrival: { days: 3 },
      cost: { amount: 10, currency: "usd" },
      what: "an online form, three days before arriving",
    });
  return base as Papel;
}

const buena = (viaje: Entendido = VIAJE): Objeto => ({
  seat: "papers",
  cells: celdasDe(viaje).map(casillaDe),
  unknowns: [],
});

const rojos = (e: unknown, viaje: Entendido = VIAJE): string[] =>
  puertaPapeles(e, { viaje }).rojos.map((r) => `${r.donde}: ${r.que}`);

test("la tabla: cada pasaporte con cada edad, sin nombres; la escala espera al transporte", () => {
  assert.deepEqual(filasDe(VIAJE), [
    { id: "t1", passport: "YY", age: "adult", count: 2 },
    { id: "t2", passport: "YY", age: 9, count: 1 },
  ]);
  // Un pasaporte que no se dijo es el del primero; sin ninguno, el del país de donde se sale.
  const mezclado: Entendido = { ...VIAJE, travellers: { ...VIAJE.travellers, passports: ["XX"] } };
  assert.deepEqual(
    filasDe(mezclado).map((f) => [f.passport, f.age, f.count]),
    [
      ["XX", "adult", 2],
      ["XX", 9, 1],
    ],
  );
  const sinNada: Entendido = { ...VIAJE, travellers: { ...VIAJE.travellers, passports: [] } };
  assert.equal(filasDe(sinNada)[0].passport, "YY");
  const celdas = celdasDe(VIAJE);
  assert.equal(celdas.filter((c) => c.traveller === "t1").length, PREGUNTAS.length - 2);
  assert.equal(celdas.filter((c) => c.traveller === "t2").length, PREGUNTAS.length - 1);
  assert.ok(!celdas.some((c) => c.question === "transit"));
  assert.ok(!celdas.some((c) => c.traveller === "t1" && c.question === "minors"));
});

test("a quien viaja por el país de su pasaporte no se le pregunta; si son todos, no se lanza a nadie", async () => {
  // Uno de casa (ZZ, el destino) y otro de fuera: solo se pregunta por el de fuera.
  const mixto: Entendido = { ...VIAJE, travellers: { adults: 2, children: [], rooms: 1, passports: ["ZZ", "YY"] } };
  assert.deepEqual([...new Set(celdasDe(mixto).map((c) => c.traveller))], ["t2"]);
  const tabla = paraEnsenarPapeles({ seat: "papers", cells: [], unknowns: [] }, mixto, "2031-06-01");
  assert.deepEqual([...new Set(tabla.fuera.filter((f) => f.viajero === 0).map((f) => f.porQue))], ["own_country"]);
  assert.equal(tabla.fuera.filter((f) => f.viajero === 0).length, PREGUNTAS.length);
  assert.ok(tabla.fuera.filter((f) => f.viajero === 1).every((f) => f.porQue !== "own_country"));
  assert.deepEqual(pegasDeLosPapeles(tabla), []);
  // Todos de casa: la tabla queda vacía y el run sigue sin lanzar al asiento ni esperar a nadie por los papeles.
  const pais = VIAJE.destination.country;
  const deCasa: Entendido = { ...VIAJE, travellers: { adults: 2, children: [9], rooms: 1, passports: [pais] } };
  assert.equal(celdasDe(deCasa).length, 0);
  const run = runNuevo(deCasa);
  try {
    const estado = await sigue(run, fuentesInventadas());
    const todos = [...estado.esperan, ...(estado.porDetras ?? [])];
    assert.ok(!todos.some((id) => id.startsWith("papeles")), todos.join(", "));
    const guardada = leerJson(join(run, "papeles.json"));
    assert.deepEqual([guardada.casillas, guardada.bloquea, guardada.falta], [[], false, null]);
    assert.ok(guardada.fuera.every((f: Objeto) => f.porQue === "own_country"));
    assert.ok(!turnoDeLosPapeles(run));
    assert.equal(porDondeVa(run).find((p) => p.id === "papers")?.estado, "done");
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("lo que ve el de los papeles: pasaportes, edades, el destino y los días, y los dominios que valen", () => {
  const piezas = piezasDeLosPapeles(VIAJE, "2031-05-30");
  assert.deepEqual(
    piezas.map((p) => p.ruta),
    ["trip.json", "travellers.json", "questions.json", "sources.json"],
  );
  const todo = JSON.stringify(piezas);
  for (const callado of ["Origen Inventado", "gimnasio", "tastes", "budget", "currency", "said"])
    assert.ok(!todo.includes(callado), callado);
  const de = (ruta: string): any =>
    JSON.parse((piezas.find((p) => p.ruta === ruta) as { contenido: string }).contenido);
  assert.equal(de("questions.json").length, celdasDe(VIAJE).length);
  assert.ok(de("questions.json").every((q: Objeto) => typeof q.asks === "string" && q.asks.length > 0));
  assert.deepEqual(de("sources.json"), { ZZ: [], YY: [], shared: [] });
  assert.deepEqual(de("trip.json").countries, ["ZZ"]);
  // Los comunes de la Unión valen para un país de la Unión, no para cualquiera.
  assert.ok(dominiosDe("PT").includes("europa.eu"));
  assert.deepEqual(dominiosDe("JP"), []);
  assert.ok(!esOficial("https://home-affairs.ec.europa.eu/policies", "JP"));
  // Busca más que los demás, y esos números los firma el PM.
  const suyos = topesDeInternet("papers");
  assert.ok(suyos.busquedas > TOPES_DE_INTERNET.busquedas && suyos.paginas > TOPES_DE_INTERNET.paginas);
});

test("su contrato sale a internet, y dice lo que busca", () => {
  const carpeta = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "papers");
  for (const archivo of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md", "INTERNET.md"])
    assert.ok(readFileSync(join(carpeta, archivo), "utf8").trim().length > 0, archivo);
  assert.match(readFileSync(join(carpeta, "DELIVERY.md"), "utf8"), /\| `seat` \| Always `"papers"` \|/);
});

test("las cuentas de plazos son del código: hasta cuándo vale el pasaporte y antes de qué día", () => {
  assert.equal(moverMeses("2031-07-14", 6), "2032-01-14");
  assert.equal(moverMeses("2031-08-31", 6), "2032-02-29");
  assert.equal(moverMeses("2031-01-31", 1), "2031-02-28");
  assert.equal(validoHasta({ months: 6, days: 0, after: "departure" }, "2031-07-10", "2031-07-14"), "2032-01-14");
  assert.equal(validoHasta({ months: 0, days: 90, after: "arrival" }, "2031-07-10", "2031-07-14"), "2031-10-08");
});

test("una tabla buena pasa la puerta 2, y lo que se enseña son datos con los plazos del código", async () => {
  await conDominios(() => {
    assert.deepEqual(rojos(buena()), []);
    const tabla = paraEnsenarPapeles(buena() as never, VIAJE, "2031-07-08");
    assert.equal(tabla.bloquea, false);
    assert.deepEqual(tabla.viajeros, [
      { pasaporte: "YY", edad: null, cuantos: 2 },
      { pasaporte: "YY", edad: 9, cuantos: 1 },
    ]);
    const vigencia = tabla.casillas.find((c) => c.pregunta === "passport_validity")!;
    assert.equal(vigencia.hasta, "2032-01-14");
    const formulario = tabla.casillas.find((c) => c.pregunta === "arrival_card")!;
    assert.deepEqual(
      [formulario.antesDe, formulario.tarde, formulario.coste],
      ["2031-07-07", true, { importe: 10, moneda: "USD" }],
    );
    assert.deepEqual(
      tabla.fuera.map((f) => [f.viajero, f.pregunta, f.porQue]),
      [
        [0, "minors", "no_minors"],
        [0, "transit", "transit_unknown"],
        [1, "transit", "transit_unknown"],
      ],
    );
    assert.ok(!JSON.stringify(tabla).includes("nothing is asked"));
    assert.deepEqual(pegasDeLosPapeles(tabla), []);
  });
});

test("las trampas de la puerta 2: cada fallo puesto a propósito, cazado", async () => {
  await conDominios(() => {
    const con = (cambia: (e: Objeto) => void): Objeto => {
      const e = structuredClone(buena());
      cambia(e);
      return e;
    };
    const visa = (e: Objeto): Objeto => e.cells.find((c: Objeto) => c.question === "visa" && c.traveller === "t1");
    const iVisa = buena().cells.findIndex((c: Objeto) => c.question === "visa" && c.traveller === "t1");
    const d = `cells[${iVisa}]`;
    const trampas: [string, Objeto][] = [
      ["seat", con((e) => (e.seat = "calendar"))],
      // La tabla, completa: ni una de menos, ni repetida, ni de más.
      ["cells", con((e) => e.cells.pop())],
      [`cells[${buena().cells.length}]`, con((e) => e.cells.push(structuredClone(e.cells[0])))],
      [d, con((e) => (visa(e).question = "transit"))],
      [d, con((e) => (visa(e).traveller = "t9"))],
      [`${d}.status`, con((e) => (visa(e).status = "fine"))],
      // Cada respuesta, de un dominio oficial de su lado y con su fecha.
      [`${d}.sources[0].url`, con((e) => (visa(e).sources[0].url = "https://visados-rapidos.example/zz"))],
      [`${d}.sources[1].url`, con((e) => (visa(e).sources[1].side = "destination"))],
      [`${d}.sources[0].url`, con((e) => (visa(e).sources[0].url = "http://gobierno.zz.example/entrada"))],
      [`${d}.sources[0].seen`, con((e) => (visa(e).sources[0].seen = "unknown"))],
      [`${d}.sources[0].side`, con((e) => (visa(e).sources[0].side = "embassy"))],
      [`${d}.sources[0].status`, con((e) => (visa(e).sources[0].status = "doubtful"))],
      [`${d}.sources[1].url`, con((e) => (visa(e).sources[1].url = visa(e).sources[0].url))],
      // Lo que dice la casilla es lo que dicen sus fuentes; si chocan, es dudosa y lleva las dos.
      [`${d}.status`, con((e) => (visa(e).sources[1].status = "to_do"))],
      [`${d}.doubt`, con((e) => Object.assign(visa(e), { status: "doubtful", doubt: "sources_disagree" }))],
      [`${d}.doubt`, con((e) => Object.assign(visa(e), { status: "doubtful", doubt: "no_official_source" }))],
      [`${d}.doubt`, con((e) => Object.assign(visa(e), { status: "doubtful", doubt: "it depends" }))],
      [`${d}.doubt`, con((e) => (visa(e).doubt = "not_found"))],
      [`${d}.sources`, con((e) => Object.assign(visa(e), { status: "to_do", sources: [] }))],
      // «En regla» pide dos fuentes, o una del gobierno del destino.
      [`${d}.status`, con((e) => (visa(e).sources = [fuente("home", "in_order")]))],
      // Los plazos y el coste, solo donde van, y como los da la fuente.
      [`${d}.valid_for`, con((e) => (visa(e).valid_for = { months: 6, days: 0, after: "departure" }))],
      [`${d}.before_arrival`, con((e) => (visa(e).before_arrival = { days: 3 }))],
      [`${d}.cost`, con((e) => (visa(e).cost = { amount: 10, currency: "USD" }))],
      // Nunca «puedes entrar».
      [`${d}.what`, con((e) => (visa(e).what = "travellers can enter without a visa"))],
      [`${d}.what`, con((e) => (visa(e).what = "you are allowed to enter for 90 days"))],
      [`${d}.what`, con((e) => (visa(e).what = "see https://gobierno.zz.example/entrada"))],
      ["unknowns", con((e) => (e.unknowns = ["you may enter freely"]))],
      ["unknowns", con((e) => (e.unknowns = "nada"))],
    ];
    const vigencia = buena().cells.findIndex((c: Objeto) => c.question === "passport_validity");
    trampas.push([
      `cells[${vigencia}].valid_for`,
      con((e) => (e.cells[vigencia].valid_for = { months: "seis", days: 0, after: "departure" })),
    ]);
    const formulario = buena().cells.findIndex((c: Objeto) => c.question === "arrival_card");
    trampas.push([
      `cells[${formulario}].cost`,
      con((e) => (e.cells[formulario].cost = { amount: 0, currency: "USD" })),
    ]);
    trampas.push([
      `cells[${formulario}].before_arrival`,
      con((e) => (e.cells[formulario].before_arrival = { days: -2 })),
    ]);
    for (const [donde, entrega] of trampas) {
      const r = rojos(entrega);
      assert.ok(
        r.some((x) => x.startsWith(`${donde}:`) || x.startsWith(`${donde}.`)),
        `${donde} no se cazó: ${r.join(" | ")}`,
      );
    }
    // Dudosa porque chocan, con las dos, sí vale; y una del gobierno del destino sola basta para «en regla».
    assert.deepEqual(
      rojos(
        con((e) => {
          Object.assign(visa(e), { status: "doubtful", doubt: "sources_disagree" });
          visa(e).sources[1].status = "to_do";
        }),
      ),
      [],
    );
    assert.deepEqual(rojos(con((e) => (visa(e).sources = [fuente("destination", "in_order")]))), []);
    // Dudosa sin encontrar nada, con lo que se encontró y no vale, también.
    assert.deepEqual(
      rojos(
        con((e) =>
          Object.assign(visa(e), {
            status: "doubtful",
            doubt: "not_found",
            sources: [{ ...fuente("destination", "in_order"), url: "https://blog.example/zz" }],
          }),
        ),
      ),
      [],
    );
    for (const mal of [null, [], "x", { seat: "papers" }, { seat: "papers", cells: [null, 3], unknowns: [] }])
      assert.ok(rojos(mal).length > 0);
  });
  // Sin dominio oficial conocido del destino, nada sale «en regla»: es dudoso, y se dice que no tenemos su fuente.
  const r = rojos(buena());
  assert.ok(r.some((x) => /no tenemos fuente oficial de ZZ/.test(x)));
  const sinFuente = buena();
  for (const c of sinFuente.cells)
    Object.assign(c, { status: "doubtful", doubt: "no_official_source", sources: [], valid_for: "unknown" });
  for (const c of sinFuente.cells) Object.assign(c, { before_arrival: "unknown", cost: "unknown" });
  assert.deepEqual(rojos(sinFuente), []);
});

test("en regla: dos sitios distintos, o uno propio del gobierno del destino; a la pantalla, lo oficial", async () => {
  await conDominios(async () => {
    const visa = (e: Objeto): Objeto => e.cells.find((c: Objeto) => c.question === "visa" && c.traveller === "t1");
    const delVisado = (e: Objeto): string[] => rojos(e).filter((x) => x.includes(".status") && x.includes("RP4"));
    // Dos páginas del mismo sitio del ministerio del viajero son una sola fuente.
    const dosDelMismo = buena();
    visa(dosDelMismo).sources = [fuente("home", "in_order", "consejos"), fuente("home", "in_order", "visados")];
    assert.equal(delVisado(dosDelMismo).length, 1);
    // Un dominio común a varios países (como los de la Unión) es fuente, pero no el gobierno del destino.
    DOMINIOS_OFICIALES.EU.push("comun.example");
    UNION_EUROPEA.push("ZZ");
    try {
      const comun = buena();
      visa(comun).sources = [{ ...fuente("destination", "in_order"), url: "https://comun.example/entrada" }];
      assert.equal(delVisado(comun).length, 1);
      // Con otra fuente de otro sitio, sí: son dos.
      visa(comun).sources.push(fuente("home", "in_order", "consejos"));
      assert.deepEqual(delVisado(comun), []);
      const dado = Object.fromEntries(
        piezasDeLosPapeles(VIAJE, "2031-06-01").map((x) => [
          x.ruta,
          JSON.parse((x as { contenido: string }).contenido),
        ]),
      );
      assert.deepEqual(dado["sources.json"].shared, ["europa.eu", "comun.example"]);
    } finally {
      DOMINIOS_OFICIALES.EU.pop();
      UNION_EUROPEA.pop();
    }
    // Una sola del gobierno del destino, en su dominio propio, basta.
    const una = buena();
    visa(una).sources = [fuente("destination", "in_order")];
    assert.deepEqual(delVisado(una), []);
    // En una casilla dudosa puede ir lo que se encontró en otro sitio; a la pantalla no llega como fuente.
    const dudosa = buena();
    Object.assign(visa(dudosa), {
      status: "doubtful",
      doubt: "not_found",
      sources: [
        { url: "https://visados-rapidos.example/zz", side: "destination", status: "to_do", seen: "2031-03-02" },
        fuente("home", "in_order", "consejos"),
      ],
    });
    assert.deepEqual(rojos(dudosa), []);
    const tabla = paraEnsenarPapeles(dudosa as never, VIAJE, "2031-06-01");
    const delViajero = tabla.casillas.find((c) => c.pregunta === "visa" && c.viajero === 0)!;
    assert.deepEqual(
      delViajero.fuentes.map((f) => f.url),
      [`${CASA}/consejos`],
    );
  });
});

test("si un papel bloquea, se para antes de gastar en buscar, y sigue si el viajero lo decide", async () => {
  await conDominios(async () => {
    const run = runNuevo(VIAJE);
    try {
      let estado = await sigue(run, fuentesInventadas());
      assert.deepEqual(estado.esperan, ["papeles-v1"]);
      // El de los papeles encuentra que el ministerio del viajero desaconseja ir: bloquea.
      const entrega = buena();
      const aviso = entrega.cells.find((c: Objeto) => c.question === "travel_advisory" && c.traveller === "t1");
      Object.assign(aviso, {
        status: "blocks",
        sources: [fuente("home", "blocks", "consejos")],
        what: "advised against",
      });
      trabaja(run, "papeles-v1", (_asiento, e) => Object.assign(e, entrega));
      guardarPaginas(run, "papeles-v1", [`${DESTINO}/entrada`, `${DESTINO}/formulario`, `${CASA}/consejos`]);
      estado = await sigue(run, fuentesInventadas());
      assert.deepEqual([estado.esperan, estado.alViajero, estado.parado], [[], true, null]);
      assert.ok(turnoDeLosPapeles(run));
      assert.equal(porDondeVa(run).find((p) => p.id === "papers")?.estado, "yours");
      // Ni los sitios ni la ruta: nada que gaste en buscar.
      assert.equal(porDondeVa(run).find((p) => p.id === "sights")?.estado, "pending");
      const tabla = leerJson(join(run, "papeles.json"));
      assert.equal(tabla.bloquea, true);
      assert.equal(tabla.casillas.find((c: Objeto) => c.estado === "blocks").fuentes[0].lado, "home");
      // Otra llamada no pasa por encima.
      assert.equal((await sigue(run, fuentesInventadas())).alViajero, true);
      // Decide seguir: solo con lo justo.
      for (const mal of [{}, { papers: "go" }, { papers: "go_on", mas: 1 }, null])
        assert.throws(() => seguirConLosPapeles(run, mal));
      seguirConLosPapeles(run, { papers: "go_on" });
      assert.ok(!turnoDeLosPapeles(run));
      estado = await sigue(run, fuentesInventadas());
      assert.deepEqual(estado.esperan, ["ruta-v1"]);
      assert.equal(porDondeVa(run).find((p) => p.id === "papers")?.estado, "done");
    } finally {
      rmSync(run, { recursive: true, force: true });
    }
  });
});

test("la última puerta antes de la web mira la tabla de los papeles del viaje", async () => {
  await conDominios(() => {
    const v = viajeInventado() as Viaje;
    const tabla = paraEnsenarPapeles(buena() as never, VIAJE, "2031-06-01");
    const conTabla = (p: Objeto): Viaje => ({ ...v, papeles: p as never });
    const deLosPapeles = (v: Viaje): unknown[] => comprobarViaje(v).filter((x) => x.donde.startsWith("papeles"));
    assert.deepEqual(deLosPapeles(conTabla(tabla)), []);
    const c = tabla.casillas[0];
    const malos: Objeto[] = [
      { ...tabla, bloquea: true },
      { ...tabla, falta: "lost" },
      { ...tabla, casillas: [{ ...c, viajero: 7 }] },
      { ...tabla, casillas: [{ ...c, estado: "doubtful", duda: null }] },
      { ...tabla, casillas: [{ ...c, fuentes: [{ ...c.fuentes[0], url: "javascript:alert(1)" }] }] },
      { ...tabla, casillas: [{ ...c, fuentes: [] }] },
      { ...tabla, casillas: [{ ...c, tarde: true, antesDe: null }] },
      { ...tabla, viajeros: [{ pasaporte: "YY", edad: 40, cuantos: 1 }] },
    ];
    for (const p of malos) assert.ok(deLosPapeles(conTabla(p)).length > 0, JSON.stringify(p).slice(0, 90));
  });
});
