// Quien piensa con la cuenta de la casa, por Claude Code: con un `claude` de mentira en su sitio, que apunta lo que
// se le pasa y contesta como lo haría, con sus fallos. No se lanza Claude Code de verdad y no se gasta.

import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lanzadorDirecto, type Peticion } from "../../agent/launcher/ia.ts";
import {
  entornoDeClaudeCode,
  leerSalida,
  opcionesDe,
  pensarConClaudeCode,
  TOKEN_DE_LA_CUENTA,
} from "../../agent/launcher/ia_de_claude_code.ts";

const TOKEN = "token-de-suscripcion-inventado-0123456789";
const CON = { modelo: "modelo-inventado", esfuerzo: "high" as const };
const PETICION: Peticion = {
  contrato: "El contrato del asiento.",
  partes: [{ texto: "La orden." }, { foto: { tipo: "image/jpeg", base64: "AAAA" } }, { texto: "El material." }],
};

/**
 * El `claude` de mentira: un guion de Node que apunta lo que recibe (sus opciones, su carpeta y lo que hay en ella,
 * los nombres de su entorno, sus instrucciones y su entrada) y contesta según MENTIRA_MODO.
 */
const GUION = `
const fs = require("node:fs");
const modo = MODO;
const args = process.argv.slice(2);
let entrada = "";
process.stdin.on("data", (t) => (entrada += t));
process.stdin.on("end", () => {
  const instrucciones = args[args.indexOf("--system-prompt-file") + 1];
  fs.writeFileSync(APUNTE, JSON.stringify({
    args, cwd: process.cwd(), enLaCarpeta: fs.readdirSync(process.cwd()),
    entorno: Object.keys(process.env), token: process.env.${TOKEN_DE_LA_CUENTA} ?? null,
    casa: process.env.HOME ?? null, enSuCasa: fs.readdirSync(process.env.HOME),
    instrucciones: fs.readFileSync(instrucciones, "utf8"), entrada,
  }));
  const di = (x) => process.stdout.write(JSON.stringify(x) + "\\n");
  const resultado = (mas) => ({
    type: "result", subtype: "success", is_error: false, num_turns: 1,
    result: "=== 1-acknowledgement.md ===\\nRecibido.",
    stop_reason: "end_turn", total_cost_usd: 0.0123,
    usage: { input_tokens: 1000, output_tokens: 300, cache_creation_input_tokens: 200, cache_read_input_tokens: 50 },
    ...mas,
  });
  di({ type: "system", subtype: "init", tools: [] });
  di({ type: "assistant", message: { content: [{ type: "text", text: "Recibido." }] } });
  if (modo === "bien") di(resultado({}));
  else if (modo === "larga") di(resultado({ stop_reason: "max_tokens" }));
  else if (modo === "negativa") di(resultado({ stop_reason: "refusal", result: "" }));
  else if (modo === "sin_coste") di(resultado({ total_cost_usd: undefined }));
  else if (modo === "limite") {
    di(resultado({ is_error: true, result: "You've hit your limit, resets 5pm", total_cost_usd: 0 }));
    process.exit(1);
  } else if (modo === "token") {
    const token = process.env.${TOKEN_DE_LA_CUENTA};
    di(resultado({ is_error: true, result: "Invalid OAuth token: " + token, total_cost_usd: 0 }));
    process.exit(1);
  } else if (modo === "vueltas")
    di(resultado({ subtype: "error_max_turns", errors: ["Reached maximum number of turns (1)"] }));
  else if (modo === "basura") process.stdout.write("esto no es json\\n{ ni esto\\n");
  else if (modo === "error") process.exit(3);
  else if (modo === "se_corta") {
    process.stdout.write('{"type":"result","subtype":"succ');
    process.kill(process.pid, "SIGKILL");
  }
  else if (modo === "tarda") setTimeout(() => di(resultado({})), 60000);
});
`;

type Apunte = {
  args: string[];
  cwd: string;
  enLaCarpeta: string[];
  entorno: string[];
  token: string | null;
  casa: string | null;
  enSuCasa: string[];
  instrucciones: string;
  entrada: string;
};

/** Un `claude` de mentira, con su modo y dónde apunta escritos dentro: del entorno no le llega nada para eso. */
function conMentira(modo: string): { binario: string; apunte: string; borra: () => void } {
  const carpeta = mkdtempSync(join(tmpdir(), "el-dorado-claude-de-mentira-"));
  const binario = join(carpeta, "claude");
  const apunte = join(carpeta, "apunte.json");
  const datos = `const MODO = ${JSON.stringify(modo)};\nconst APUNTE = ${JSON.stringify(apunte)};\n`;
  writeFileSync(binario, `#!${process.execPath}\n${datos}${GUION}`);
  chmodSync(binario, 0o755);
  return {
    binario,
    apunte,
    borra: () => rmSync(carpeta, { recursive: true, force: true }),
  };
}

/** El entorno de una máquina, como el de una sesión en la nube: con su Claude Code, sus claves y su proxy. */
function entornoDeLaMaquina(): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "",
    HOME: "/home/alguien",
    HTTPS_PROXY: "http://proxy.inventado.example:8080",
    no_proxy: "localhost",
    NODE_EXTRA_CA_CERTS: "/etc/certificados-inventados.pem",
    LANG: "es_ES.UTF-8",
    [TOKEN_DE_LA_CUENTA]: "el-token-de-la-sesion-de-la-maquina",
    ELDORADO_TOKEN_DE_CLAUDE: TOKEN,
    CLAUDE_CODE_ENTRYPOINT: "remote",
    CLAUDE_CODE_SESSION_ID: "sesion-inventada",
    CLAUDE_CONFIG_DIR: "/home/alguien/.claude",
    CLAUDECODE: "1",
    ANTHROPIC_API_KEY: "una clave que no debe llegar",
    ANTHROPIC_AUTH_TOKEN: "otra-que-no-debe-llegar",
    ANTHROPIC_BASE_URL: "https://otro-sitio.example",
    ELDORADO_SECRETO: "el-secreto-de-la-casa",
    ELDORADO_LLAVE: "la-llave-de-la-web",
    CLAUDE_CODE_USE_BEDROCK: "1",
    AWS_ACCESS_KEY_ID: "inventada",
    GEOAPIFY_API_KEY: "inventada",
    OTRO_SECRET: "inventado",
  };
}

async function piensa(modo: string, mas: { topeMs?: number; corte?: AbortSignal } = {}) {
  const m = conMentira(modo);
  try {
    const pensar = pensarConClaudeCode({
      con: CON,
      token: TOKEN,
      binario: m.binario,
      entorno: entornoDeLaMaquina(),
      topeMs: mas.topeMs,
    });
    const r = await pensar(PETICION, mas.corte).then(
      (respuesta) => ({ respuesta, fallo: null }),
      (e: Error) => ({ respuesta: null, fallo: e }),
    );
    const apunte = existsSync(m.apunte) ? (JSON.parse(readFileSync(m.apunte, "utf8")) as Apunte) : null;
    return { ...r, apunte };
  } finally {
    m.borra();
  }
}

test("Claude Code va de una vuelta, sin herramientas ni nada de lo instalado, con el modelo y el esfuerzo", () => {
  const o = opcionesDe(CON, "/tmp/x/contrato.md");
  const valor = (opcion: string): string | undefined => o[o.indexOf(opcion) + 1];
  assert.equal(o[0], "-p");
  assert.equal(valor("--input-format"), "stream-json");
  assert.equal(valor("--output-format"), "stream-json");
  assert.equal(valor("--system-prompt-file"), "/tmp/x/contrato.md");
  assert.equal(valor("--model"), "modelo-inventado");
  assert.equal(valor("--effort"), "high");
  assert.ok(!o.includes("--max-turns"));
  assert.equal(valor("--tools"), "");
  assert.equal(valor("--permission-prompts"), "none");
  for (const opcion of ["--verbose", "--no-session-persistence", "--safe-mode", "--strict-mcp-config", "--restricted"])
    assert.ok(o.includes(opcion), opcion);
  // Sin esfuerzo dicho, no se dice; y nunca se le dan herramientas ni se salta los permisos.
  assert.ok(!opcionesDe({ modelo: "m-x", esfuerzo: null }, "c").includes("--effort"));
  assert.ok(!o.some((x) => /dangerously|bypass|allowedTools|add-dir|^--mcp-config$/.test(x)));
});

test("a Claude Code solo le llega lo de su lista: la ruta, su carpeta, lo de la red y el token de la casa", () => {
  const limpio = entornoDeClaudeCode(entornoDeLaMaquina(), TOKEN, "/tmp/su-casa");
  assert.deepEqual(Object.keys(limpio).sort(), [
    TOKEN_DE_LA_CUENTA,
    "HOME",
    "HTTPS_PROXY",
    "NODE_EXTRA_CA_CERTS",
    "PATH",
    "no_proxy",
  ]);
  // El token es el de la casa, no el de la sesión de la máquina; y la carpeta de usuario es la suya.
  assert.equal(limpio[TOKEN_DE_LA_CUENTA], TOKEN);
  assert.equal(limpio.HOME, "/tmp/su-casa");
  for (const nombre of Object.keys(limpio))
    assert.ok(nombre === TOKEN_DE_LA_CUENTA || !/^(CLAUDE|ANTHROPIC_|ELDORADO_)/.test(nombre), nombre);
});

test("con un claude de mentira: el contrato, de instrucciones, y el material, en un mensaje con su foto", async () => {
  const { respuesta, fallo, apunte } = await piensa("bien");
  assert.equal(fallo, null);
  assert.deepEqual(respuesta, {
    texto: "=== 1-acknowledgement.md ===\nRecibido.",
    fin: "end",
    entrada: 1250,
    salida: 300,
    usd: 0.0123,
  });
  assert.ok(apunte !== null);
  assert.equal(apunte.instrucciones, PETICION.contrato);
  // Corre en una carpeta vacía, con su carpeta de usuario aparte y vacía, y del entorno solo le llega lo que debe.
  assert.deepEqual(apunte.enLaCarpeta, []);
  assert.deepEqual(apunte.enSuCasa, []);
  assert.ok(apunte.casa !== null && apunte.casa !== "/home/alguien" && !apunte.casa.startsWith(apunte.cwd));
  assert.equal(apunte.token, TOKEN);
  for (const nombre of apunte.entorno)
    assert.ok(
      nombre === TOKEN_DE_LA_CUENTA || !/^(CLAUDE|ANTHROPIC_|ELDORADO_|AWS_)|KEY|SECRET|BEDROCK/.test(nombre),
      `le llegó ${nombre}`,
    );
  const lineas = apunte.entrada.trim().split("\n");
  assert.equal(lineas.length, 1);
  assert.deepEqual(JSON.parse(lineas[0]), {
    type: "user",
    message: {
      role: "user",
      content: [
        { type: "text", text: "La orden." },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } },
        { type: "text", text: "El material." },
      ],
    },
    parent_tool_use_id: null,
  });
  // Lo que se le dejó en la máquina para lanzarlo se borra al acabar.
  assert.ok(!existsSync(apunte.cwd));
});

test("cómo acabó: cortada por larga, o una negativa; y el lanzador lo cuenta con lo que dijo que costó", async () => {
  assert.equal((await piensa("larga")).respuesta?.fin, "max_tokens");
  assert.equal((await piensa("negativa")).respuesta?.fin, "refusal");
  // Con la cuenta de la casa no hay precio: el gasto es lo que dice Claude Code.
  const m = conMentira("negativa");
  try {
    const lanzador = lanzadorDirecto(
      pensarConClaudeCode({ con: CON, token: TOKEN, binario: m.binario, entorno: entornoDeLaMaquina() }),
      null,
    );
    const carpeta = mkdtempSync(join(tmpdir(), "el-dorado-puesto-"));
    try {
      const puesto = { id: "p1", asiento: "a", carpeta } as never;
      for (const parte of ["contract", "in", "out"]) mkdirSync(join(carpeta, parte));
      await assert.rejects(lanzador("orden", puesto), (e: Error & { gasto?: { usd: number } }) => {
        assert.match(e.message, /no quiso contestar/);
        assert.equal(e.gasto?.usd, 0.0123);
        return true;
      });
      assert.deepEqual(readdirSync(join(carpeta, "out")), []);
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  } finally {
    m.borra();
  }
});

test("sus fallos se dicen para quien lleva el run, y nunca con el token dentro", async () => {
  const casos: [string, RegExp][] = [
    ["limite", /se le ha acabado el límite/],
    ["token", /no admite el token/],
    ["vueltas", /no llegó a contestar/],
    ["basura", /no dio su resultado; salió con 0|no dio su resultado/],
    ["error", /no dio su resultado; salió con 3/],
    ["se_corta", /no dio su resultado; salió con una señal/],
    ["sin_coste", /no dijo lo que costó/],
  ];
  for (const [modo, dice] of casos) {
    const { fallo } = await piensa(modo);
    assert.ok(fallo !== null, modo);
    assert.match(fallo.message, dice, modo);
    assert.ok(!fallo.message.includes(TOKEN), `${modo}: el fallo lleva el token`);
    assert.ok(!fallo.message.includes("sk-ant-"), `${modo}: el fallo lleva una clave`);
  }
});

test("si tarda más de su tope, o la casa lo corta, se le para y se dice", async () => {
  const antes = Date.now();
  const tarde = await piensa("tarda", { topeMs: 300 });
  assert.match(tarde.fallo?.message ?? "", /tardó más de/);
  const corte = new AbortController();
  setTimeout(() => corte.abort(), 200);
  const cortado = await piensa("tarda", { corte: corte.signal });
  assert.match(cortado.fallo?.message ?? "", /se cortó/);
  assert.ok(Date.now() - antes < 15_000, "no se esperó a que acabara");
  // Cortado antes de empezar, no se lanza.
  const ya = new AbortController();
  ya.abort();
  const nada = await piensa("bien", { corte: ya.signal });
  assert.match(nada.fallo?.message ?? "", /se cortó/);
  assert.equal(nada.apunte, null);
});

test("sin Claude Code en la máquina se dice; y lo que no se entiende de su salida no es respuesta", async () => {
  const pensar = pensarConClaudeCode({
    con: CON,
    token: TOKEN,
    binario: join(tmpdir(), "no-hay-tal-claude"),
    entorno: {},
  });
  await assert.rejects(pensarConClaudeCode({ con: CON, token: " " })(PETICION), /falta el token/);
  await assert.rejects(pensar(PETICION), /no se encuentra Claude Code/);
  assert.throws(() => leerSalida(""), /no dio su resultado/);
  assert.throws(() => leerSalida('{"type":"assistant"}\n'), /no dio su resultado/);
  // Si hay varios resultados vale el último, y lo que no es JSON se salta.
  const r = leerSalida(
    [
      "ruido",
      JSON.stringify({ type: "result", subtype: "success", result: "a", total_cost_usd: 1, usage: {} }),
      JSON.stringify({
        type: "result",
        subtype: "success",
        result: "b",
        total_cost_usd: 2,
        usage: { output_tokens: 5 },
      }),
    ].join("\n"),
  );
  assert.deepEqual(r, { texto: "b", fin: "end", entrada: 0, salida: 5, usd: 2 });
  // Una foto de una clase que no se mira no llega a lanzar nada.
  const raro: Peticion = { contrato: "c", partes: [{ foto: { tipo: "image/tiff", base64: "AA" } }] };
  await assert.rejects(pensar(raro), /no mira/);
});
