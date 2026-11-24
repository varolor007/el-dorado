// El del calendario (5.3): su material, las cuentas de días que hace el código con lo que entrega y sus
// comprobaciones, con una entrega buena y una trampa por cada cosa que tienen que cazar. Sin internet y sin gastar.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { AVISOS_DE_FECHAS, LO_MAS_QUE_SE_MUEVE, VENTANAS } from "../../agent/data/calendario.ts";
import { puertaCalendario } from "../../agent/gates/puerta_calendario.ts";
import {
  diasEntre,
  diasQueToca,
  loQueCambia,
  moverFecha,
  paraEnsenar,
  piezasDelCalendario,
} from "../../agent/launcher/calendario.ts";
import { comprobarViaje, pegasDelCalendario, type Viaje } from "../../agent/output/viaje.ts";
import type { Aviso, Entendido, EntregaDelCalendario } from "../../agent/scripts/formas.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

type Objeto = Record<string, any>;

// Un viaje de cinco días que se puede mover, del 10 al 14 de julio de 2031.
const VIAJE: Entendido = {
  ...ENTENDIDO,
  dates: { check_in: "2031-07-10", check_out: "2031-07-14", flexible: true },
  said: { wants: "con un gimnasio de verdad", booked: "", heard: true, answers: [] },
};
const FIJO: Entendido = { ...VIAJE, dates: { ...VIAJE.dates, flexible: false } };
const DESDE = "2031-06-01";

const hallazgo = (x: Partial<Aviso>): Aviso => ({
  kind: "raises",
  topic: "festival",
  name: "Semana de las Luces",
  from: "2031-07-08",
  to: "2031-07-12",
  price: "unknown",
  what: "the town fills up for a week-long festival",
  source: "https://fiestas.inventado.example/luces",
  seen: "2031-02-11",
  ...x,
});

/** Una entrega buena: una fiesta que encarece, lluvia que molesta, los días que pide y una ventana que la evita. */
function buena(): EntregaDelCalendario {
  return {
    seat: "calendar",
    findings: [
      hallazgo({}),
      hallazgo({
        kind: "bothers",
        topic: "weather",
        name: "unknown",
        from: "2031-07-01",
        to: "2031-07-31",
        what: "it rains on half the days of the month",
        source: "https://tiempo.inventado.example/clima",
        seen: "unknown",
      }),
      hallazgo({
        kind: "favours",
        topic: "days_needed",
        name: "unknown",
        from: "unknown",
        to: "unknown",
        days: 3,
        what: "the tourism office suggests three days",
        source: "https://turismo.inventado.example/plan",
      }),
    ],
    windows: [{ check_in: "2031-07-13", because: [0] }],
    unknowns: [],
  };
}

const rojos = (e: unknown, viaje: Entendido = VIAJE): string[] =>
  puertaCalendario(e, { viaje, desde: DESDE }).rojos.map((r) => `${r.donde}: ${r.que}`);

test("las cuentas de días son del código: qué días toca, cuánto se mueve y qué cambia una ventana", () => {
  assert.equal(diasEntre("2031-07-10", "2031-07-14"), 4);
  assert.equal(diasEntre("2031-07-14", "2031-07-10"), -4);
  assert.equal(moverFecha("2031-02-27", 3), "2031-03-02");
  assert.deepEqual(diasQueToca("2031-07-08", "2031-07-12", "2031-07-10", "2031-07-14"), [
    "2031-07-10",
    "2031-07-11",
    "2031-07-12",
  ]);
  assert.deepEqual(diasQueToca("2031-08-01", "2031-08-02", "2031-07-10", "2031-07-14"), []);
  const e = buena();
  const cambio = loQueCambia(e.findings, "2031-07-10", "2031-07-14", "2031-07-13");
  assert.deepEqual(cambio, {
    entrada: "2031-07-13",
    salida: "2031-07-17",
    seMueve: 3,
    evita: [0],
    alcanza: [],
    pierde: [],
    entra: [],
  });
  // Al revés: una ventana que cae en la fiesta entra en ella.
  const atras = loQueCambia(e.findings, "2031-07-13", "2031-07-17", "2031-07-09");
  assert.deepEqual([atras.seMueve, atras.evita, atras.entra], [-4, [], [0]]);
});

test("lo que ve el del calendario: el destino, las fechas, de dónde sale y qué busca; nada de quién va", () => {
  const piezas = piezasDelCalendario(VIAJE, "2031-05-30");
  assert.deepEqual(
    piezas.map((p) => p.ruta),
    ["trip.json", "limits.json"],
  );
  const contenido = (ruta: string): Objeto =>
    JSON.parse((piezas.find((p) => p.ruta === ruta) as { contenido: string }).contenido);
  const trip = contenido("trip.json");
  assert.deepEqual(trip.dates, { check_in: "2031-07-10", check_out: "2031-07-14", nights: 4, flexible: true });
  assert.equal(trip.home_country, "YY");
  assert.equal(trip.today, "2031-05-30");
  const todo = JSON.stringify(piezas);
  for (const callado of ["passports", "adults", "said", "gimnasio", "tastes", "Origen Inventado", "budget"])
    assert.ok(!todo.includes(callado), callado);
  assert.deepEqual(contenido("limits.json"), {
    findings_allowed: AVISOS_DE_FECHAS,
    windows_allowed: VENTANAS,
    max_shift_days: LO_MAS_QUE_SE_MUEVE,
  });
  // Quien no puede mover sus fechas no recibe ventanas que proponer.
  assert.equal(
    JSON.parse((piezasDelCalendario(FIJO, "2031-05-30")[1] as { contenido: string }).contenido).windows_allowed,
    0,
  );
});

test("su contrato sale a internet, y dice lo que busca", () => {
  const carpeta = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "calendar");
  for (const archivo of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md", "INTERNET.md"])
    assert.ok(readFileSync(join(carpeta, archivo), "utf8").trim().length > 0, archivo);
  assert.match(readFileSync(join(carpeta, "DELIVERY.md"), "utf8"), /\| `seat` \| Always `"calendar"` \|/);
});

test("una entrega buena pasa, y lo que se enseña son datos con las cuentas del código, sin frases suyas", () => {
  assert.deepEqual(rojos(buena()), []);
  const visto = paraEnsenar(buena(), VIAJE);
  assert.equal(visto.falta, null);
  assert.deepEqual(visto.avisos[0].dias, ["2031-07-10", "2031-07-11", "2031-07-12"]);
  assert.equal(visto.avisos[0].nombre, "Semana de las Luces");
  assert.equal(visto.avisos[1].nombre, null);
  assert.equal(visto.avisos[1].visto, null);
  assert.equal(visto.avisos[1].dias.length, 5);
  // Pide tres días y el viaje tiene cinco: dos de más.
  assert.deepEqual(visto.avisos[2].pide, { dias: 3, deMas: 2 });
  assert.deepEqual(visto.avisos[2].dias, []);
  assert.deepEqual(visto.ventanas, [
    {
      entrada: "2031-07-13",
      salida: "2031-07-17",
      seMueve: 3,
      porQue: [0],
      evita: [0],
      alcanza: [],
      pierde: [],
      entra: [],
    },
  ]);
  assert.ok(!JSON.stringify(visto).includes("fills up"));
  assert.deepEqual(pegasDelCalendario(visto, "2031-07-10", "2031-07-14"), []);
  // Y con fechas fijas, ninguna ventana llega a la web aunque viniera.
  assert.deepEqual(paraEnsenar(buena(), FIJO).ventanas, []);
});

test("las trampas: cada fallo puesto a propósito, cazado", () => {
  const con = (cambia: (e: Objeto) => void): Objeto => {
    const e = buena() as unknown as Objeto;
    cambia(e);
    return e;
  };
  const trampas: [string, Objeto, Entendido?][] = [
    ["seat", con((e) => (e.seat = "listener"))],
    ["findings", con((e) => (e.findings = Array(AVISOS_DE_FECHAS + 1).fill(e.findings[0])))],
    ["findings[0].kind", con((e) => (e.findings[0].kind = "terrible"))],
    ["findings[0].topic", con((e) => (e.findings[0].topic = "nightlife"))],
    ["findings[0].from", con((e) => (e.findings[0].from = "8 de julio"))],
    ["findings[0].from", con((e) => (e.findings[0].to = "2031-07-01"))],
    ["findings[0].from", con((e) => (e.findings[0].from = "2031-02-30"))],
    ["findings[0].source", con((e) => (e.findings[0].source = "unknown"))],
    ["findings[0].source", con((e) => (e.findings[0].source = "http://fiestas.inventado.example/luces"))],
    ["findings[0].seen", con((e) => (e.findings[0].seen = "febrero"))],
    ["findings[0].name", con((e) => (e.findings[0].name = "Visit https://otra.example now"))],
    ["findings[0].name", con((e) => (e.findings[0].name = "x".repeat(81)))],
    ["findings[0].what", con((e) => (e.findings[0].what = "it is cheaper the week after"))],
    ["findings[0].what", con((e) => (e.findings[0].what = "you save a lot by moving"))],
    ["findings[0].price", con((e) => (e.findings[0].price = { amount: -3, currency: "EUR" }))],
    ["findings[0].days", con((e) => (e.findings[0].days = 4))],
    ["findings[2].days", con((e) => (e.findings[2].days = 0))],
    ["findings[2].from", con((e) => (e.findings[2].from = "2031-07-01"))],
    // Una fiesta de otras semanas que ni toca el viaje ni ninguna ventana no cambia nada.
    [
      "findings[0]",
      con((e) => ((e.findings[0].from = "2031-09-01"), (e.findings[0].to = "2031-09-03"), (e.windows = []))),
    ],
    // Las ventanas: con fechas fijas, ninguna; dentro de lo que se mueve; que mejoren algo; por lo que dicen.
    ["windows", buena() as unknown as Objeto, FIJO],
    ["windows", con((e) => (e.windows = [0, 1, 2].map((n) => ({ check_in: `2031-07-1${3 + n}`, because: [0] }))))],
    ["windows[0].check_in", con((e) => (e.windows[0].check_in = "2031-07-10"))],
    ["windows[0].check_in", con((e) => (e.windows[0].check_in = moverFecha("2031-07-10", LO_MAS_QUE_SE_MUEVE + 1)))],
    ["windows[0].check_in", con((e) => (e.windows[0].check_in = "2031-05-20"))],
    ["windows[1].check_in", con((e) => e.windows.push({ ...e.windows[0] }))],
    ["windows[0].because", con((e) => (e.windows[0].because = []))],
    ["windows[0].because", con((e) => (e.windows[0].because = [7]))],
    // La lluvia de todo el mes sigue en la ventana: no es por ella.
    ["windows[0].because", con((e) => (e.windows[0].because = [0, 1]))],
    // Moverse un día no saca de la fiesta: no mejora nada.
    ["windows[0]", con((e) => (e.windows[0].check_in = "2031-07-11"))],
    ["unknowns", con((e) => (e.unknowns = "nada"))],
  ];
  for (const [donde, entrega, viaje] of trampas) {
    const r = rojos(entrega, viaje);
    assert.ok(
      r.some((x) => x.startsWith(`${donde}:`) || x.startsWith(`${donde}.`)),
      `${donde} no se cazó: ${r.join(" | ")}`,
    );
  }
  // Sin saber de dónde sale, no hay festivos de su casa.
  const sinCasa: Entendido = { ...VIAJE, origin: null };
  assert.ok(
    rojos(
      con((e) => (e.findings[1].topic = "holiday_at_home")),
      sinCasa,
    ).some((x) => x.startsWith("findings[1].topic")),
  );
  // Con un precio de su página, sí se puede decir que algo es más caro o más barato.
  assert.deepEqual(
    rojos(
      con(
        (e) => (
          (e.findings[0].what = "rooms are cheaper after the festival"),
          (e.findings[0].price = { amount: 90, currency: "EUR" })
        ),
      ),
    ),
    [],
  );
  // Lo que no es un objeto, o rompe la forma, es un rojo, nunca una excepción.
  for (const mal of [
    null,
    [],
    "x",
    { seat: "calendar" },
    { seat: "calendar", findings: [null], windows: [null], unknowns: [] },
  ])
    assert.ok(rojos(mal).length > 0);
});

test("la última puerta antes de la web mira los avisos de las fechas del viaje", () => {
  const v = viajeInventado() as Viaje;
  const visto = paraEnsenar(buena(), VIAJE);
  const conCalendario = (c: Objeto): Viaje => ({
    ...v,
    entrada: "2031-07-10",
    salida: "2031-07-14",
    calendario: c as never,
  });
  const sinFechas = (pegas: { donde: string }[]): { donde: string }[] =>
    pegas.filter((p) => p.donde.startsWith("calendario"));
  assert.deepEqual(sinFechas(comprobarViaje(conCalendario(visto))), []);
  const malos: Objeto[] = [
    { ...visto, falta: "lost" },
    { ...visto, avisos: [{ ...visto.avisos[0], fuente: "javascript:alert(1)" }] },
    { ...visto, avisos: [{ ...visto.avisos[0], clase: "awful" }] },
    { ...visto, avisos: [{ ...visto.avisos[0], dias: ["2031-08-01"] }] },
    { ...visto, ventanas: [{ ...visto.ventanas[0], evita: [], alcanza: [] }] },
    { ...visto, ventanas: [{ ...visto.ventanas[0], porQue: [9] }] },
  ];
  for (const c of malos)
    assert.ok(sinFechas(comprobarViaje(conCalendario(c))).length > 0, JSON.stringify(c).slice(0, 80));
});
