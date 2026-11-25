// Lo gastado por un asiento cortado (14.7): el lanzador lleva la cuenta según llega y, cuando se le corta, acaba con
// un error que dice lo gastado hasta ahí, marcado como de un cortado, y lo más que pudo quedar fuera (la vuelta que
// estaba en marcha). La casa lo enchufa al techo de las capas del destino. Con flujos y asientos de mentira: sin
// internet y sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { actaDe, actaDeCara } from "../../agent/launcher/acta.ts";
import { errorDeUnCortado, lanzarAsiento, type Gasto, type Lanzador } from "../../agent/launcher/asiento.ts";
import { darElAdelante, esperarLoDeDetras, llevar } from "../../agent/launcher/casa.ts";
import { cotaDeLoSinContar, lanzadorDirecto, parcialDe, type Peticion } from "../../agent/launcher/ia.ts";
import { MAXIMO_DE_UNA_RESPUESTA, pensarConClaude, type ClienteDeIA } from "../../agent/launcher/ia_de_verdad.ts";
import { montarPuesto } from "../../agent/launcher/puesto.ts";
import { apuntarTrabajo, gastoDe, gastoParaElTecho, trabajosDe } from "../../agent/launcher/trabajos.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { fuentesInventadas, GASTO, lanzadorDeMentira, leerJson, runNuevo } from "../cases/inventado/asientos.ts";

const CLAVE = "sk-ant-clave-inventada-que-no-debe-salir-0123456789";
const PRECIO = { entrada: 4, salida: 20 };
const CON = { modelo: "modelo-inventado", esfuerzo: null };
const CON_INTERNET: Peticion = {
  contrato: "El contrato.",
  partes: [{ texto: "La orden." }],
  internet: { busquedas: 4, paginas: 4 },
};
const SIN_INTERNET: Peticion = { contrato: "El contrato.", partes: [{ texto: "La orden." }] };
const cerca = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** Una vuelta del flujo de mentira: acaba con su mensaje, o se queda en marcha hasta que se la corta. */
type Vuelta =
  | { acaba: unknown; cortaAlAcabar?: AbortController }
  | { cuelga: { empieza?: Record<string, number>; herramienta?: boolean; fin?: Record<string, number> } };

/** Una librería de mentira que da sus vueltas por un flujo, con sus sucesos, como la de verdad. */
function libreriaQueSeCorta(vueltas: Vuelta[]): { cliente: (clave: string) => ClienteDeIA; llamadas: () => number } {
  let i = 0;
  const cliente = (): ClienteDeIA =>
    ({
      messages: {
        stream: (_cuerpo: unknown, o: { signal?: AbortSignal }) => {
          const v = vueltas[Math.min(i++, vueltas.length - 1)];
          const oyentes: ((suceso: unknown) => void)[] = [];
          const di = (suceso: unknown): void => oyentes.forEach((f) => f(suceso));
          return {
            on(evento: string, f: (suceso: unknown) => void) {
              if (evento === "streamEvent") oyentes.push(f);
              return this;
            },
            finalMessage: async () => {
              await Promise.resolve();
              if ("acaba" in v) {
                v.cortaAlAcabar?.abort();
                return v.acaba;
              }
              if (v.cuelga.empieza) di({ type: "message_start", message: { usage: v.cuelga.empieza } });
              if (v.cuelga.herramienta)
                di({
                  type: "content_block_start",
                  index: 1,
                  content_block: { type: "server_tool_use", id: "s9", name: "web_search", input: {} },
                });
              if (v.cuelga.fin) di({ type: "message_delta", delta: {}, usage: v.cuelga.fin });
              await new Promise((_, rechaza) =>
                o.signal?.addEventListener("abort", () => rechaza(new Anthropic.APIUserAbortError()), { once: true }),
              );
            },
          };
        },
      },
    }) as unknown as ClienteDeIA;
  return { cliente, llamadas: () => i };
}

const pausa = { content: [{ type: "text", text: "Sigo." }], stop_reason: "pause_turn", usage: uso(100, 50) };
function uso(entrada: number, salida: number): Record<string, number> {
  return { input_tokens: entrada, output_tokens: salida };
}

/** Piensa con la librería de mentira y la corta a los `ms`; vuelve con el error. */
async function cortaA(ms: number, vueltas: Vuelta[], p: Peticion = CON_INTERNET): Promise<Error> {
  const { cliente } = libreriaQueSeCorta(vueltas);
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ms);
  try {
    await pensarConClaude(CLAVE, CON, cliente)(p, corte.signal);
  } catch (e) {
    return e as Error;
  } finally {
    clearTimeout(reloj);
  }
  throw new Error("no se cortó");
}

test("un flujo cortado tras varias vueltas: lo gastado es lo de esas vueltas, y fuera queda la que iba", async () => {
  const e = await cortaA(50, [
    { acaba: pausa },
    { acaba: pausa },
    { cuelga: { empieza: { input_tokens: 400, cache_read_input_tokens: 100, output_tokens: 2 } } },
  ]);
  assert.match(e.message, /se cortó/);
  const p = parcialDe(e);
  assert.ok(p !== null);
  // Dos vueltas acabadas y lo que leyó la tercera al empezar.
  assert.equal(p.entrada, 100 + 100 + 500);
  assert.equal(p.salida, 50 + 50 + 2);
  assert.equal(p.turnos, 3);
  // Fuera queda, como mucho, lo que podía escribir aún la vuelta en marcha.
  assert.deepEqual(p.sinContar, { entrada: 0, salida: MAXIMO_DE_UNA_RESPUESTA - 2, busquedas: 0 });
  assert.ok(cerca(cotaDeLoSinContar(p.sinContar, PRECIO) ?? -1, ((MAXIMO_DE_UNA_RESPUESTA - 2) * 20) / 1e6));
  // Sin precio no se dice en dólares.
  assert.equal(cotaDeLoSinContar(p.sinContar, null), null);
});

test("si la vuelta en marcha ya dijo su cuenta del final, esa vale entera y no queda nada fuera", async () => {
  const e = await cortaA(50, [
    { acaba: pausa },
    { cuelga: { empieza: uso(300, 1), fin: { input_tokens: 320, output_tokens: 900 } } },
  ]);
  const p = parcialDe(e);
  assert.equal(p?.entrada, 100 + 320);
  assert.equal(p?.salida, 50 + 900);
  assert.deepEqual(p?.sinContar, { entrada: 0, salida: 0, busquedas: 0 });
});

test("con una búsqueda en la vuelta en marcha, o sin saber aún lo que leyó, lo de fuera no se acota", async () => {
  const conBusqueda = parcialDe(
    await cortaA(50, [{ acaba: pausa }, { cuelga: { empieza: uso(300, 1), herramienta: true } }]),
  );
  assert.equal(conBusqueda?.entrada, 100 + 300);
  assert.equal(conBusqueda?.sinContar, null);
  const sinEmpezar = parcialDe(await cortaA(50, [{ acaba: pausa }, { cuelga: {} }]));
  assert.equal(sinEmpezar?.entrada, 100);
  assert.equal(sinEmpezar?.sinContar, null);
});

test("cortado justo entre dos vueltas: la siguiente no se manda, y no queda nada fuera", async () => {
  const corte = new AbortController();
  const { cliente, llamadas } = libreriaQueSeCorta([{ acaba: pausa, cortaAlAcabar: corte }, { acaba: pausa }]);
  const e = (await pensarConClaude(CLAVE, CON, cliente)(CON_INTERNET, corte.signal).catch((x: unknown) => x)) as Error;
  assert.equal(llamadas(), 1);
  const p = parcialDe(e);
  assert.equal(p?.entrada, 100);
  assert.deepEqual(p?.sinContar, { entrada: 0, salida: 0, busquedas: 0 });
});

test("un fallo antes de que la IA diga nada es un fallo como siempre, sin cuenta, y sin la clave dentro", async () => {
  const cliente = (): ClienteDeIA =>
    ({
      messages: {
        stream: () => ({
          finalMessage: async () => {
            throw new Anthropic.APIConnectionError({ message: `fallo con ${CLAVE}` });
          },
        }),
      },
    }) as unknown as ClienteDeIA;
  const e = (await pensarConClaude(CLAVE, CON, cliente)(SIN_INTERNET).catch((x: unknown) => x)) as Error;
  assert.equal(parcialDe(e), null);
  assert.ok(!e.message.includes(CLAVE));
  // El cortado tampoco lleva la clave, ni en su mensaje ni en lo que lleva colgado.
  const cortado = await cortaA(30, [{ cuelga: { empieza: uso(10, 1) } }], SIN_INTERNET);
  assert.ok(!JSON.stringify({ m: cortado.message, ...cortado }).includes(CLAVE));
});

function puestoDePrueba(): { run: string; puesto: ReturnType<typeof montarPuesto> } {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-cortado-"));
  const puesto = montarPuesto(run, "a1-p1", "lodging-viewer", [{ ruta: "sheet.json", contenido: "{}" }]);
  return { run, puesto };
}

test("el lanzador directo dice lo gastado hasta el corte, en dólares, marcado de cortado, con su cota", async () => {
  const { run, puesto } = puestoDePrueba();
  try {
    const pensar = pensarConClaude(
      CLAVE,
      CON,
      libreriaQueSeCorta([{ cuelga: { empieza: { input_tokens: 1000, output_tokens: 3 } } }]).cliente,
    );
    const r = await lanzarAsiento(puesto, lanzadorDirecto(pensar, PRECIO), { segundos: 0.1 });
    assert.equal(r.fueraDeTope, true);
    assert.match(r.error ?? "", /no acabó en su tope/);
    assert.equal(r.gasto?.cortado, true);
    assert.equal(r.gasto?.entrada, 1000);
    assert.ok(cerca(r.gasto?.usd ?? -1, (1000 * 4 + 3 * 20) / 1e6));
    assert.ok(cerca(r.cota ?? -1, ((MAXIMO_DE_UNA_RESPUESTA - 3) * 20) / 1e6));
    // Sin precio (la cuenta de la casa) no hay dólares que decir: como antes.
    const otro = puestoDePrueba();
    try {
      const sinPrecio = pensarConClaude(
        CLAVE,
        CON,
        libreriaQueSeCorta([{ cuelga: { empieza: uso(1000, 3) } }]).cliente,
      );
      const r2 = await lanzarAsiento(otro.puesto, lanzadorDirecto(sinPrecio, null), { segundos: 0.1 });
      assert.equal(r2.gasto, null);
      assert.equal(r2.cota, null);
    } finally {
      rmSync(otro.run, { recursive: true, force: true });
    }
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});

test("al cortar, la casa espera un poco a que diga lo gastado; lo que no dice como cortado no se cree", async () => {
  const cortado: Gasto = { turnos: 2, entrada: 10, salida: 5, usd: 0.3 };
  const tras = (ms: number, hacer: () => unknown): Lanzador =>
    ((_o, _p, corte) =>
      new Promise((resuelve, rechaza) =>
        corte?.addEventListener("abort", () =>
          setTimeout(() => {
            try {
              resuelve(hacer() as Gasto);
            } catch (e) {
              rechaza(e);
            }
          }, ms),
        ),
      )) as Lanzador;
  const casos: [Lanzador, Gasto | null, number | null][] = [
    [
      tras(30, () => {
        throw errorDeUnCortado("se cortó", cortado, 0.1);
      }),
      { ...cortado, cortado: true },
      0.1,
    ],
    // Vuelve como si hubiera acabado: no dice qué quedó fuera.
    [tras(30, () => GASTO), null, null],
    // Un error con gasto, pero sin la marca de cortado: tampoco.
    [
      tras(30, () => {
        throw Object.assign(new Error("se cortó"), { gasto: cortado, cota: 0.1 });
      }),
      null,
      null,
    ],
    // Tarda más que la gracia: no se le espera.
    [
      tras(2000, () => {
        throw errorDeUnCortado("se cortó", cortado, 0.1);
      }),
      null,
      null,
    ],
  ];
  for (const [lanzador, gasto, cota] of casos) {
    const { run, puesto } = puestoDePrueba();
    try {
      const antes = Date.now();
      const r = await lanzarAsiento(puesto, lanzador, { segundos: 0.05, gracia: 0.3 });
      assert.ok(Date.now() - antes < 1000, "esperó de más");
      assert.equal(r.fueraDeTope, true);
      assert.deepEqual(r.gasto, gasto);
      assert.equal(r.cota, cota);
    } finally {
      rmSync(run, { recursive: true, force: true });
    }
  }
});

// La casa, con capas que se cortan y dicen lo gastado hasta ahí.

async function conRun(prueba: (run: string) => Promise<void>): Promise<void> {
  const run = runNuevo();
  try {
    await prueba(run);
  } finally {
    await esperarLoDeDetras(run);
    rmSync(run, { recursive: true, force: true });
  }
}

const tope = { segundos: 0.3 };
const HASTA_EL_CORTE: Gasto = { turnos: 2, entrada: 5000, salida: 800, usd: 0.2 };

/** Los asientos que se dicen se quedan trabajando y, al cortarlos, dicen lo gastado hasta el corte y su cota. */
function cortanDiciendo(asientos: string[], gasto: Gasto, cota: number | null): Lanzador {
  const base = lanzadorDeMentira();
  return (orden, puesto, corte) =>
    asientos.includes(puesto.asiento)
      ? new Promise((_, rechaza) =>
          corte?.addEventListener("abort", () => rechaza(errorDeUnCortado("la llamada a la IA se cortó", gasto, cota))),
        )
      : base(orden, puesto, corte);
}

const sabidos = (run: string): number =>
  trabajosDe(run).filter((t) => t.gasto !== null && t.gasto.cortado !== true).length;

test("una capa cortada que dice lo gastado, con techo: el viaje sigue, y el techo cuenta eso más su cota", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), cortanDiciendo(["getting-around"], HASTA_EL_CORTE, 0.1), { tope });
    assert.equal(r.parado, null);
    assert.equal(r.hecho, true);
    const t = trabajosDe(run).find((x) => x.puesto === "moverse-v1");
    assert.equal(t?.estado, "stopped");
    assert.deepEqual(t?.gasto, { ...HASTA_EL_CORTE, cortado: true });
    assert.equal(t?.cota, 0.1);
    // Lo gastado cuenta lo del cortado, y dice que es de un cortado; para el techo, con lo que pudo quedar fuera.
    const g = gastoDe(run);
    assert.equal(g.sabido, false);
    assert.ok(cerca(g.deCortados, 0.2));
    assert.ok(cerca(g.usd, sabidos(run) * GASTO.usd + 0.2));
    assert.ok(cerca(gastoParaElTecho(run) ?? -1, sabidos(run) * GASTO.usd + 0.2 + 0.1));
    // En el acta, y en la de su dueño, el trabajo dice que es de un cortado.
    const acta = actaDe(run);
    assert.equal(acta.trabajos.find((x) => x.puesto === "moverse-v1")?.cortado, true);
    assert.ok(cerca(acta.total.de_cortados, 0.2));
    assert.equal(actaDeCara(acta).trabajos.filter((x) => x.cortado).length, 1);
    assert.equal((leerJson(join(run, "viaje.json")) as Viaje).moverse?.falta, "late");
  });
});

test("dos capas cortadas: cuentan las dos, y el viaje sale sin ellas", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const lanzador = cortanDiciendo(["getting-around", "local-knowledge"], HASTA_EL_CORTE, 0.1);
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope });
    assert.equal(r.hecho, true);
    assert.ok(cerca(gastoDe(run).deCortados, 0.4));
    assert.ok(cerca(gastoParaElTecho(run) ?? -1, sabidos(run) * GASTO.usd + 2 * (0.2 + 0.1)));
    const v = leerJson(join(run, "viaje.json")) as Viaje;
    assert.equal(v.moverse?.falta, "late");
    assert.equal(v.saber?.falta, "late");
  });
});

test("si lo contado con lo de las capas cortadas llega al techo, se para, como siempre", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 1);
    const lanzador = cortanDiciendo(["getting-around", "local-knowledge"], { ...HASTA_EL_CORTE, usd: 0.3 }, 0.2);
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope });
    assert.equal(r.hecho, false);
    assert.equal(r.parado?.paso, "el gasto");
    assert.match(r.parado?.rojos[0].que ?? "", /contando lo más que pudo gastar lo que se cortó/);
    assert.ok(!r.lanzados.includes("explica-v1"));
  });
});

test("una capa cortada que no puede acotar lo de fuera: con techo, no se sigue a ciegas", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), cortanDiciendo(["getting-around"], HASTA_EL_CORTE, null), {
      tope,
    });
    assert.equal(r.parado?.paso, "el gasto");
    assert.match(r.parado?.rojos[0].que ?? "", /no se sigue a ciegas/);
    // Lo gastado se dice igual.
    assert.ok(cerca(gastoDe(run).deCortados, 0.2));
  });
});

test("un asiento que no es una capa, cortado aunque diga lo gastado: sin cota, y no se sigue a ciegas", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), cortanDiciendo(["route-planner"], HASTA_EL_CORTE, 0.1), {
      tope,
    });
    const t = trabajosDe(run).find((x) => x.puesto === "ruta-v1");
    assert.equal(t?.gasto?.cortado, true);
    assert.equal(t?.cota, undefined);
    assert.equal(gastoParaElTecho(run), null);
    assert.notEqual(r.hecho, true);
  });
});

// Los hallazgos de la revisión sobre el mismo mecanismo: la misma regla en todos los caminos, y lo que corre a la vez.

const CAPAS = ["getting-around", "local-knowledge", "tickets"];

test("una capa que la casa cierra por cortada lleva la misma regla: cuenta su cota", async () => {
  await conRun(async (run) => {
    darElAdelante(run, 5);
    await llevar(run, fuentesInventadas(), lanzadorDeMentira(), { tope });
    // Como si la casa se hubiera cortado con la capa trabajando: en el disco, «working» y sin gasto.
    const t = trabajosDe(run).find((x) => x.puesto === "moverse-v1");
    assert.ok(t !== undefined);
    apuntarTrabajo(run, { ...t, estado: "working", gasto: null, hasta: null });
    rmSync(join(run, "puestos", "moverse-v1", "out", "delivery.json"), { force: true });
    await llevar(run, fuentesInventadas(), lanzadorDeMentira(), { tope, cota: () => 0.4 });
    const cerrado = trabajosDe(run).find((x) => x.puesto === "moverse-v1");
    assert.equal(cerrado?.estado, "failed");
    assert.equal(cerrado?.cota, 0.4);
    assert.notEqual(gastoParaElTecho(run), null);
  });
});

test("una capa que entrega sin decir lo que gastó lleva la misma regla: con su cota, el viaje sigue", async () => {
  const calla: Lanzador = (orden, puesto, corte) => {
    const base = lanzadorDeMentira();
    return base(orden, puesto, corte).then((g) => (CAPAS.includes(puesto.asiento) ? undefined : g));
  };
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), calla, { tope, cota: () => 0.4 });
    assert.equal(r.hecho, true);
    const t = trabajosDe(run).find((x) => x.puesto === "moverse-v1");
    assert.equal(t?.estado, "done");
    assert.equal(t?.gasto, null);
    assert.equal(t?.cota, 0.4);
  });
  // Sin cota, como cualquier asiento que no dice lo que gastó: con techo, no se sigue a ciegas.
  await conRun(async (run) => {
    darElAdelante(run, 5);
    const r = await llevar(run, fuentesInventadas(), calla, { tope });
    assert.match(r.parado?.rojos[0].que ?? "", /no se sigue a ciegas/);
  });
});

test("lo que va gastando lo que trabaja cuenta: en el techo, las capas en marcha se cortan y se para", async () => {
  const ENMARCHA: Gasto = { turnos: 1, entrada: 9000, salida: 100, usd: 0.5 };
  const base = lanzadorDeMentira();
  // Las capas dicen lo que llevan y siguen trabajando; solo acaban si se las corta.
  const lanzador: Lanzador = (orden, puesto, corte, alContar) =>
    CAPAS.includes(puesto.asiento)
      ? new Promise((_, rechaza) => {
          corte?.addEventListener("abort", () => rechaza(errorDeUnCortado("se cortó", ENMARCHA, 0.1)));
          setTimeout(() => alContar?.(ENMARCHA, 0.1), 20);
        })
      : base(orden, puesto, corte, alContar);
  await conRun(async (run) => {
    darElAdelante(run, 1);
    const antes = Date.now();
    // Con un tope largo: si se cortan, es por el techo.
    const r = await llevar(run, fuentesInventadas(), lanzador, { tope: { segundos: 30 } });
    await esperarLoDeDetras(run);
    assert.ok(Date.now() - antes < 10_000, "no las cortó el techo");
    assert.equal(r.parado?.paso, "el gasto");
    const capas = trabajosDe(run).filter((t) => CAPAS.includes(t.asiento));
    assert.ok(capas.length >= 2);
    for (const t of capas) {
      assert.equal(t.estado, "stopped");
      assert.match(t.fallo ?? "", /techo/);
      assert.equal(t.gasto?.cortado, true);
    }
    assert.ok(!r.lanzados.includes("explica-v1"));
    // Lo contado no pasa del techo más lo que dijeron las capas cortadas.
    assert.ok((gastoParaElTecho(run) ?? Infinity) >= 1);
  });
});
