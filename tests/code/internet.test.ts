// El buscador y el lector de webs: solo el asiento que lo dice en su contrato sale a internet, con sus topes; la casa
// guarda lo que buscó y lo que abrió de verdad, y la puerta de todos no deja citar una página que no se abrió. Con
// una IA de mentira que «busca» y «abre» sin red, y con las librerías de mentira de las dos maneras de pensar.

import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { TOPES_DE_INTERNET, USD_POR_BUSQUEDA, VUELTAS_CON_INTERNET } from "../../agent/data/internet.ts";
import { ENTREGA, PASOS } from "../../agent/gates/puerta_metodo.ts";
import { lanzarAsiento, recogerAsiento } from "../../agent/launcher/asiento.ts";
import {
  abiertas,
  direccionComparable,
  direccionesEn,
  leerConsultado,
  loQueNoPuedeSalir,
  type Consultado,
} from "../../agent/launcher/consultado.ts";
import { gastoDe, lanzadorDirecto, peticionDe, type Pensar, type Peticion } from "../../agent/launcher/ia.ts";
import {
  consultadoDeClaudeCode,
  contadorDeTopes,
  leerSalida,
  opcionesDe,
  pensarConClaudeCode,
} from "../../agent/launcher/ia_de_claude_code.ts";
import { consultadoDe, pensarConClaude, type ClienteDeIA } from "../../agent/launcher/ia_de_verdad.ts";
import { montarPuesto, type Pieza, type Puesto } from "../../agent/launcher/puesto.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const TEMPORAL = mkdtempSync(join(tmpdir(), "el-dorado-internet-"));
after(() => rmSync(TEMPORAL, { recursive: true, force: true }));

// Unos contratos de prueba: el método común de verdad, un asiento que sale a internet y otro que no.
const CONTRATOS = join(TEMPORAL, "contracts");
cpSync(join(RAIZ, "agent", "contracts", "common"), join(CONTRATOS, "common"), { recursive: true });
for (const asiento of ["seat-online", "seat-offline"]) {
  mkdirSync(join(CONTRATOS, asiento));
  for (const nombre of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md"])
    writeFileSync(join(CONTRATOS, asiento, nombre), `# ${nombre} of ${asiento}`);
}
writeFileSync(join(CONTRATOS, "seat-online", "INTERNET.md"), "# What this seat looks for on the web");

const PIEZAS: Pieza[] = [
  { ruta: "trip.json", contenido: JSON.stringify({ destination: "Ciudad Inventada", link: "https://dada.invalid/x" }) },
];
let cuenta = 0;
const monta = (asiento: string, piezas: Pieza[] = PIEZAS): Puesto =>
  montarPuesto(join(TEMPORAL, `run-${++cuenta}`), "p1", asiento, piezas, { contratos: CONTRATOS });

const ABIERTA = "https://oficial.invalid/requisitos";
const CONSULTADO: Consultado = {
  busquedas: [
    {
      consulta: "requisitos de entrada Ciudad Inventada",
      resultados: [
        { url: ABIERTA, titulo: "Requisitos" },
        { url: "https://otra.invalid/blog", titulo: "Un blog" },
      ],
      fallo: null,
    },
  ],
  paginas: [{ url: ABIERTA, final: null, titulo: "Requisitos", cuando: "2026-11-24T10:00:00Z" }],
  fallidas: [{ url: "https://caida.invalid/", porque: "url_not_accessible" }],
};

/** Lo que contestaría el asiento, con las notas y la entrega que se le digan. */
function respuesta(notas: string[], entrega: Record<string, unknown> = {}): string {
  const partes: Record<string, string> = {
    "1-acknowledgement.md": "I received trip.json.",
    "2-plan.md": "Search, open the official page, then decide.",
    "3-notes.md": notas.join("\n"),
    "4-computations.md": "None needed.",
    "5-self-critique.md": "Nothing missing.",
    "delivery.json": JSON.stringify({ seat: "seat-online", ...entrega }),
  };
  return [...PASOS, ENTREGA].map((n) => `=== ${n} ===\n${partes[n]}`).join("\n\n");
}

/** Una IA de mentira que «busca» y «abre» lo que se le diga, sin red, y apunta lo que se le pidió. */
function busca(
  texto: string,
  consultado: Consultado | null = CONSULTADO,
  mas = {},
): { pensar: Pensar; pedidas: Peticion[] } {
  const pedidas: Peticion[] = [];
  const pensar: Pensar = async (p) => {
    pedidas.push(p);
    return { texto, fin: "end", entrada: 1000, salida: 200, ...(consultado ? { consultado } : {}), ...mas };
  };
  return { pensar, pedidas };
}

test("dos maneras de escribir la misma página dicen lo mismo; otra página, no", () => {
  const misma = [
    "https://oficial.invalid/requisitos",
    "HTTPS://Oficial.INVALID/requisitos/",
    "http://oficial.invalid:80/requisitos#visados",
    "https://oficial.invalid:443/requisitos//",
  ];
  for (const d of misma) assert.equal(direccionComparable(d), "https://oficial.invalid/requisitos", d);
  assert.notEqual(direccionComparable("https://oficial.invalid/Requisitos"), direccionComparable(ABIERTA));
  assert.notEqual(direccionComparable("https://oficial.invalid/requisitos?pais=xx"), direccionComparable(ABIERTA));
  assert.notEqual(direccionComparable("https://oficial.invalid.otro.invalid/requisitos"), direccionComparable(ABIERTA));
  // Un usuario delante del sitio no engaña: el sitio es el que va tras la arroba.
  assert.equal(
    direccionComparable("https://oficial.invalid@otra.invalid/requisitos"),
    "https://otra.invalid/requisitos",
  );
  for (const no of ["in/trip.json", "ftp://oficial.invalid/x", "mailto:x@y.invalid", ""])
    assert.equal(direccionComparable(no), null, no);
  assert.deepEqual(direccionesEn("See https://a.invalid/x, and (https://b.invalid/y)."), [
    "https://a.invalid/x",
    "https://b.invalid/y",
  ]);
});

test("solo sale a internet el asiento que lo dice en su contrato, con los topes de la casa", () => {
  const con = monta("seat-online");
  const sin = monta("seat-offline");
  assert.ok(existsSync(join(con.carpeta, "contract", "common", "WEB.md")));
  assert.ok(!existsSync(join(sin.carpeta, "contract", "common", "WEB.md")));
  const p = peticionDe(con);
  assert.deepEqual(p.internet, TOPES_DE_INTERNET);
  assert.match(p.contrato, /How a seat uses the web/);
  assert.match(p.contrato, /What this seat looks for on the web/);
  assert.match(p.partes[0] && "texto" in p.partes[0] ? p.partes[0].texto : "", /at most 8 searches and at most 12/);
  const q = peticionDe(sin);
  assert.equal(q.internet, undefined);
  assert.doesNotMatch(q.contrato, /How a seat uses the web/);
  assert.doesNotMatch("texto" in q.partes[0] ? q.partes[0].texto : "", /on the web/);
});

test("a un asiento que sale a internet no se le da un correo ni una clave; el nombre de una foto, sí", () => {
  assert.equal(loQueNoPuedeSalir(["viaja ana.inventada@correo.invalid"]), "un correo");
  assert.equal(loQueNoPuedeSalir(["la clave sk-ant-inventada-0123456789"]), "una clave");
  assert.equal(loQueNoPuedeSalir(["la foto faro@2x.png", "nada más"]), null);
  const conCorreo = monta("seat-online", [{ ruta: "trip.json", contenido: '{"email": "ana@correo.invalid"}' }]);
  assert.throws(
    () => peticionDe(conCorreo),
    (e: Error) => /lleva un correo/.test(e.message) && !e.message.includes("ana@"),
  );
  // Al que no sale a internet, la casa no se lo mira: no busca.
  const sinInternet = monta("seat-offline", [{ ruta: "trip.json", contenido: '{"email": "ana@correo.invalid"}' }]);
  assert.doesNotThrow(() => peticionDe(sinInternet));
});

test("la memoria: lo que buscó y abrió queda en el run, fuera del puesto, sin lo que decían", async () => {
  const p = monta("seat-online");
  const { pensar } = busca(respuesta([`- A visa is needed. [${ABIERTA}] [seen]`]));
  const r = await lanzarAsiento(p, lanzadorDirecto(pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.equal(r.error, null);
  const run = resolve(p.carpeta, "..", "..");
  const guardado = JSON.parse(readFileSync(join(run, "consultado", "p1.json"), "utf8"));
  assert.deepEqual(guardado, CONSULTADO);
  assert.ok(!existsSync(join(p.carpeta, "consultado")));
  assert.deepEqual(abiertas(leerConsultado(p)), [ABIERTA]);
  assert.deepEqual(r.metodo.rojos, []);
  // Una búsqueda y nada más que cobre aparte: lo que leyó y escribió, más esa búsqueda.
  assert.ok(Math.abs((r.gasto?.usd ?? 0) - (0.008 + USD_POR_BUSQUEDA)) < 1e-12);
});

test("la puerta: la misma página escrita de otra forma vale; una que no se abrió es un rojo", async () => {
  const p = monta("seat-online");
  const notas = [
    "- A visa is needed. [HTTPS://OFICIAL.invalid/requisitos/#visa] [seen]",
    "- A blog says it is easy. [https://otra.invalid/blog] [seen]",
    "- The fair is in May. [https://nunca.invalid/feria, in/trip.json] [seen]",
    "- So book early. [https://nunca.invalid/feria] [deduced]",
    "- The page did not open. [https://caida.invalid/] [seen]",
  ];
  const entrega = {
    source: "https://inventada.invalid/datos",
    from_material: "https://dada.invalid/x",
    ok: `${ABIERTA}/`,
  };
  const { pensar } = busca(respuesta(notas, entrega));
  const r = await lanzarAsiento(p, lanzadorDirecto(pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.deepEqual(
    r.metodo.rojos.map((x) => `${x.donde}: ${x.que}`),
    [
      "out/3-notes.md:2: la nota cita la página https://otra.invalid/blog, que no se abrió",
      "out/3-notes.md:3: la nota cita la página https://nunca.invalid/feria, que no se abrió",
      "out/3-notes.md:4: la nota cita la página https://nunca.invalid/feria, que no se abrió",
      "out/3-notes.md:5: la nota cita la página https://caida.invalid/, que no se abrió",
      "out/delivery.json.source: el dato cita la página https://inventada.invalid/datos, " +
        "que no se abrió ni venía en su material",
    ],
  );
  // Sin la memoria, lo que se abrió tampoco vale: la puerta no se fía de lo que diga el asiento.
  rmSync(join(resolve(p.carpeta, "..", ".."), "consultado"), { recursive: true });
  assert.ok(recogerAsiento(p).rojos.some((x) => x.que.includes(`la página HTTPS://OFICIAL.invalid/requisitos/#visa`)));
});

test("un asiento sin internet no cita páginas, salvo en su entrega las de su material", async () => {
  const p = monta("seat-offline");
  const texto = respuesta([`- A visa is needed. [${ABIERTA}] [seen]`], {
    seat: "seat-offline",
    a: "https://dada.invalid/x#y",
    b: ABIERTA,
  });
  const { pensar, pedidas } = busca(texto, null);
  const r = await lanzarAsiento(p, lanzadorDirecto(pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.equal(pedidas[0].internet, undefined);
  assert.ok(!existsSync(join(resolve(p.carpeta, "..", ".."), "consultado")));
  assert.deepEqual(
    r.metodo.rojos.map((x) => `${x.donde}: ${x.que}`),
    [
      `out/3-notes.md:1: la nota cita la página ${ABIERTA}, y este asiento no sale a internet`,
      `out/delivery.json.b: el dato cita la página ${ABIERTA}, que no venía en su material`,
    ],
  );
});

test("un asiento sin internet que vuelve habiendo salido, o uno que pasa de sus topes, no entrega", async () => {
  const sin = monta("seat-offline");
  const fuera = busca(respuesta(["- x. [in/trip.json] [seen]"]));
  const r = await lanzarAsiento(sin, lanzadorDirecto(fuera.pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.equal(r.error, "un asiento sin internet salió a internet");
  assert.ok(r.gasto !== null);
  // Lo que se consultó queda guardado igual, para quien lleva el run.
  assert.deepEqual(leerConsultado(sin), CONSULTADO);

  const muchas: Consultado = {
    ...CONSULTADO,
    busquedas: Array.from({ length: TOPES_DE_INTERNET.busquedas + 1 }, (_, i) => ({
      consulta: `búsqueda ${i}`,
      resultados: [],
      fallo: null,
    })),
  };
  const con = monta("seat-online");
  const pasa = busca(respuesta([]), muchas);
  const s = await lanzarAsiento(con, lanzadorDirecto(pasa.pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.equal(s.error, `buscó más de ${TOPES_DE_INTERNET.busquedas} veces, su tope`);
  assert.ok(Math.abs((s.gasto?.usd ?? 0) - (0.008 + (TOPES_DE_INTERNET.busquedas + 1) * USD_POR_BUSQUEDA)) < 1e-12);
  const paginas: Consultado = {
    busquedas: [],
    paginas: Array.from({ length: TOPES_DE_INTERNET.paginas }, (_, i) => ({
      url: `https://p.invalid/${i}`,
      final: null,
      titulo: null,
      cuando: null,
    })),
    fallidas: [{ url: "https://p.invalid/caida", porque: "error" }],
  };
  const otra = monta("seat-online");
  const abre = busca(respuesta([]), paginas);
  const t = await lanzarAsiento(otra, lanzadorDirecto(abre.pensar, { entrada: 4, salida: 20 }), { segundos: 5 });
  assert.equal(t.error, `abrió más de ${TOPES_DE_INTERNET.paginas} páginas, su tope`);
});

test("lo que cuestan las búsquedas: las que dice la IA o, si no, las de lo consultado", () => {
  const precio = { entrada: 4, salida: 20 };
  const base = { entrada: 1000, salida: 200 };
  assert.ok(Math.abs(gastoDe({ ...base, busquedas: 3 }, precio).usd - (0.008 + 3 * USD_POR_BUSQUEDA)) < 1e-12);
  assert.ok(Math.abs(gastoDe({ ...base, consultado: CONSULTADO }, precio).usd - (0.008 + USD_POR_BUSQUEDA)) < 1e-12);
  assert.equal(gastoDe({ ...base, busquedas: 0, consultado: CONSULTADO }, precio).usd, 0.008);
  assert.equal(gastoDe({ ...base, usd: 0.5, busquedas: 9, consultado: CONSULTADO }, null).usd, 0.5);
  assert.equal(gastoDe({ ...base, turnos: 3 }, precio).turnos, 3);
});

// La llamada directa, con una librería de mentira: contesta en el orden que se le dé.

type Pedido = { cuerpo: Record<string, unknown> };
function libreria(respuestas: unknown[]): { cliente: (clave: string) => ClienteDeIA; pedidos: Pedido[] } {
  const pedidos: Pedido[] = [];
  const cliente = (): ClienteDeIA =>
    ({
      messages: {
        stream: (cuerpo: Record<string, unknown>) => {
          pedidos.push({ cuerpo: structuredClone(cuerpo) });
          const r = respuestas[Math.min(pedidos.length - 1, respuestas.length - 1)];
          return { finalMessage: async () => r };
        },
      },
    }) as unknown as ClienteDeIA;
  return { cliente, pedidos };
}

const uso = (busquedas?: number) => ({
  input_tokens: 100,
  output_tokens: 50,
  ...(busquedas === undefined ? {} : { server_tool_use: { web_search_requests: busquedas, web_fetch_requests: 1 } }),
});
const caller = { type: "direct" };
const BUSCA_Y_ABRE = [
  { type: "text", text: "Let me look." },
  { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "requisitos" }, caller },
  {
    type: "web_search_tool_result",
    tool_use_id: "s1",
    caller,
    content: [{ type: "web_search_result", url: ABIERTA, title: "Requisitos", page_age: null, encrypted_content: "x" }],
  },
  { type: "server_tool_use", id: "f1", name: "web_fetch", input: { url: ABIERTA }, caller },
  {
    type: "web_fetch_tool_result",
    tool_use_id: "f1",
    caller,
    content: {
      type: "web_fetch_result",
      url: ABIERTA,
      retrieved_at: "2026-11-24T10:00:00Z",
      content: {
        type: "document",
        title: "Requisitos",
        citations: null,
        source: { type: "text", data: "Lo de la página." },
      },
    },
  },
  { type: "server_tool_use", id: "f2", name: "web_fetch", input: { url: "https://caida.invalid/" }, caller },
  {
    type: "web_fetch_tool_result",
    tool_use_id: "f2",
    caller,
    content: { type: "web_fetch_tool_result_error", error_code: "url_not_accessible" },
  },
  { type: "server_tool_use", id: "f3", name: "web_fetch", input: { url: "https://sin-respuesta.invalid/" }, caller },
];
const PETICION: Peticion = {
  contrato: "El contrato.",
  partes: [{ texto: "La orden." }],
  internet: { busquedas: 2, paginas: 3 },
};
const CON = { modelo: "modelo-inventado", esfuerzo: null };

test("la llamada directa: el buscador y el lector de la API, con sus topes; sin internet, nada", async () => {
  const con = libreria([
    { content: [{ type: "text", text: "=== 1-acknowledgement.md ===\nOk." }], stop_reason: "end_turn", usage: uso() },
  ]);
  await pensarConClaude("clave-inventada", CON, con.cliente)(PETICION);
  assert.deepEqual(con.pedidos[0].cuerpo.tools, [
    { type: "web_search_20260209", name: "web_search", max_uses: 2 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, max_content_tokens: 20_000 },
  ]);
  const sin = libreria([{ content: [{ type: "text", text: "Ok." }], stop_reason: "end_turn", usage: uso() }]);
  const r = await pensarConClaude("clave-inventada", CON, sin.cliente)({ ...PETICION, internet: null });
  assert.ok(!("tools" in sin.pedidos[0].cuerpo));
  assert.equal(r.consultado, undefined);
});

test("la llamada directa: tras una pausa sigue con lo de antes, y saca lo que buscó y abrió", async () => {
  const { cliente, pedidos } = libreria([
    { content: BUSCA_Y_ABRE, stop_reason: "pause_turn", usage: uso(1) },
    { content: [{ type: "text", text: "=== 1-acknowledgement.md ===\nOk." }], stop_reason: "end_turn", usage: uso(0) },
  ]);
  const r = await pensarConClaude("clave-inventada", CON, cliente)(PETICION);
  assert.equal(pedidos.length, 2);
  const segundo = pedidos[1].cuerpo.messages as Anthropic.MessageParam[];
  assert.equal(segundo.length, 2);
  assert.equal(segundo[1].role, "assistant");
  assert.deepEqual(segundo[1].content, BUSCA_Y_ABRE);
  // Las herramientas no cambian entre vueltas.
  assert.deepEqual(pedidos[1].cuerpo.tools, pedidos[0].cuerpo.tools);
  assert.equal(r.texto, "Let me look.=== 1-acknowledgement.md ===\nOk.");
  assert.deepEqual([r.fin, r.entrada, r.salida, r.turnos, r.busquedas], ["end", 200, 100, 2, 1]);
  assert.deepEqual(r.consultado, {
    busquedas: [{ consulta: "requisitos", resultados: [{ url: ABIERTA, titulo: "Requisitos" }], fallo: null }],
    paginas: [{ url: ABIERTA, final: null, titulo: "Requisitos", cuando: "2026-11-24T10:00:00Z" }],
    fallidas: [
      { url: "https://caida.invalid/", porque: "url_not_accessible" },
      { url: "https://sin-respuesta.invalid/", porque: "no result" },
    ],
  });
  // Lo que decía la página no sale de la llamada.
  assert.doesNotMatch(JSON.stringify(r.consultado), /Lo de la página/);
});

test("la llamada directa: una búsqueda fallida no da resultados, y sin acabar no entrega", async () => {
  const fallida = consultadoDe([
    { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" }, caller },
    {
      type: "web_search_tool_result",
      tool_use_id: "s1",
      caller,
      content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" },
    },
  ] as unknown as Anthropic.ContentBlock[]);
  assert.deepEqual(fallida.busquedas, [{ consulta: "q", resultados: [], fallo: "max_uses_exceeded" }]);
  const { cliente, pedidos } = libreria([{ content: [], stop_reason: "pause_turn", usage: uso() }]);
  const r = await pensarConClaude("clave-inventada", CON, cliente)(PETICION);
  assert.equal(pedidos.length, VUELTAS_CON_INTERNET);
  assert.equal(r.fin, "unfinished");
});

// Claude Code, con su salida de mentira.

const linea = (x: unknown): string => JSON.stringify(x);
const RESULTADO = {
  type: "result",
  subtype: "success",
  is_error: false,
  num_turns: 4,
  result: "=== 1-acknowledgement.md ===\nOk.",
  stop_reason: "end_turn",
  total_cost_usd: 0.2,
  usage: { input_tokens: 100, output_tokens: 50 },
};
const SUCESOS = [
  {
    type: "assistant",
    message: { content: [{ type: "tool_use", id: "t1", name: "WebSearch", input: { query: "requisitos" } }] },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "Results" }] },
    tool_use_result: {
      query: "requisitos",
      results: [{ tool_use_id: "x", content: [{ title: "Requisitos", url: ABIERTA }] }],
    },
  },
  {
    type: "assistant",
    message: { content: [{ type: "tool_use", id: "t2", name: "WebFetch", input: { url: ABIERTA, prompt: "p" } }] },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "t2", content: "Lo de la página." }] },
    tool_use_result: { code: 200, url: ABIERTA, result: "Lo de la página." },
  },
  {
    type: "assistant",
    message: { content: [{ type: "tool_use", id: "t3", name: "WebFetch", input: { url: "https://lleva.invalid/" } }] },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "t3", content: "Redirect to another host" }] },
    tool_use_result: { code: 301, url: "https://lleva.invalid/" },
  },
  {
    type: "assistant",
    message: { content: [{ type: "tool_use", id: "t4", name: "WebFetch", input: { url: "https://falla.invalid/" } }] },
  },
  { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t4", is_error: true, content: "fail" }] } },
];

test("Claude Code: con internet, su buscador y su lector y nada más; sin él, ninguna herramienta", () => {
  const con = opcionesDe(CON, "/x/contrato.md", true);
  assert.equal(con[con.indexOf("--tools") + 1], "WebSearch,WebFetch");
  assert.equal(con[con.indexOf("--allowedTools") + 1], "WebSearch,WebFetch");
  const sin = opcionesDe(CON, "/x/contrato.md");
  assert.equal(sin[sin.indexOf("--tools") + 1], "");
  assert.ok(!sin.includes("--allowedTools"));
});

test("Claude Code: de su salida, lo que buscó y abrió; lo que lleva a otra parte o falla, no", () => {
  const r = leerSalida([...SUCESOS, RESULTADO].map(linea).join("\n"), undefined, true);
  assert.deepEqual([r.usd, r.turnos], [0.2, 4]);
  assert.deepEqual(r.consultado, {
    busquedas: [{ consulta: "requisitos", resultados: [{ url: ABIERTA, titulo: "Requisitos" }], fallo: null }],
    paginas: [{ url: ABIERTA, final: null, titulo: null, cuando: null }],
    fallidas: [
      { url: "https://lleva.invalid/", porque: "code 301" },
      { url: "https://falla.invalid/", porque: "error" },
    ],
  });
  assert.doesNotMatch(JSON.stringify(r.consultado), /Lo de la página/);
  // Sin internet y sin pedir nada, no hay memoria; si pidió algo sin tenerlo, sí, para que la casa lo diga.
  assert.equal(leerSalida(linea(RESULTADO)).consultado, undefined);
  assert.equal(leerSalida([SUCESOS[0], RESULTADO].map(linea).join("\n")).consultado?.busquedas.length, 1);
  assert.equal(consultadoDeClaudeCode([SUCESOS[2]]).fallidas[0].porque, "no result");
});

test("Claude Code: la casa cuenta lo que pide según llega y lo corta al pasar de su tope o al pedir otra cosa", () => {
  const cuenta = contadorDeTopes({ busquedas: 1, paginas: 1 });
  assert.equal(cuenta(SUCESOS[0]), null);
  assert.equal(cuenta(SUCESOS[2]), null);
  assert.equal(cuenta(SUCESOS[4]), "Claude Code pasó de su tope de 1 páginas");
  assert.match(
    contadorDeTopes({ busquedas: 1, paginas: 1 })({
      type: "assistant",
      message: { content: [{ type: "tool_use", id: "b", name: "Bash", input: {} }] },
    }) ?? "",
    /no se le dio: Bash/,
  );
  assert.match(contadorDeTopes(null)(SUCESOS[0]) ?? "", /este asiento no tiene ninguna/);
});

test("Claude Code, entero, con un claude de mentira que pide una página de más: se le corta y se dice", async () => {
  const carpeta = mkdtempSync(join(TEMPORAL, "claude-"));
  const binario = join(carpeta, "claude");
  const apunte = join(carpeta, "args.json");
  const lineas = [...SUCESOS, RESULTADO].map(linea);
  writeFileSync(
    binario,
    `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync(${JSON.stringify(apunte)}, JSON.stringify(process.argv.slice(2)));
process.stdin.resume();
process.stdin.on("end", () => {
  const lineas = ${JSON.stringify(lineas)};
  let i = 0;
  const sigue = () => { if (i < lineas.length) { process.stdout.write(lineas[i++] + "\\n"); setTimeout(sigue, 5); } };
  sigue();
  setTimeout(() => {}, 3000);
});
`,
  );
  chmodSync(binario, 0o755);
  const pensar = pensarConClaudeCode({
    con: CON,
    token: "token-inventado-0123456789",
    binario,
    entorno: { PATH: process.env.PATH },
  });
  const corto = { ...PETICION, internet: { busquedas: 5, paginas: 1 } };
  await assert.rejects(pensar(corto), /pasó de su tope de 1 páginas/);
  const args = JSON.parse(readFileSync(apunte, "utf8")) as string[];
  assert.equal(args[args.indexOf("--tools") + 1], "WebSearch,WebFetch");
  // Con topes que caben, contesta, con lo que buscó y abrió.
  const r = await pensar({ ...PETICION, internet: { busquedas: 5, paginas: 5 } });
  assert.equal(r.consultado?.paginas.length, 1);
});
