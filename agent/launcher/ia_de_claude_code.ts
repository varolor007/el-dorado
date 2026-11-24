// Quien piensa con la cuenta de Claude de la casa, por Claude Code: una vuelta por asiento y sin herramientas. Es el
// otro `Pensar`, al lado de la llamada directa con la clave de un viajero (`ia_de_verdad.ts`): lo que se le manda y
// lo que se hace con lo que contesta está en `ia.ts`, y aquí solo se lanza `claude -p` y se lee lo que dice.
//
// El contrato va como instrucciones de sistema, en un archivo; la orden y el material, con las fotos en su orden, en
// un solo mensaje por la entrada (en `stream-json`, que es la forma que admite fotos). Claude Code corre en una
// carpeta vacía, con su propia carpeta de configuración también vacía, sin herramientas, sin lo que haya instalado
// en la máquina (ni CLAUDE.md, ni plugins, ni servidores MCP) y sin guardar la sesión. Su entorno es el de la máquina
// sin las llaves de la casa (ELDORADO_*) ni ninguna otra clave: solo el token de la suscripción
// (CLAUDE_CODE_OAUTH_TOKEN, de `claude setup-token`), para que gaste de la cuenta de la casa y de nada más.
//
// Con qué modelo se piensa lo dice el entorno de la casa (ELDORADO_MODELO), nunca este repositorio.

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pensar, Respuesta } from "./ia.ts";
import { mensajesDe, type ConQue } from "./ia_de_verdad.ts";

/** El token de la suscripción: lo único del entorno con lo que Claude Code puede pensar. */
export const TOKEN_DE_LA_CUENTA = "CLAUDE_CODE_OAUTH_TOKEN";
/** Lo que puede tardar una vuelta, si no se dice otra cosa, y lo que se le deja para acabar cuando se le corta. */
export const TOPE_DE_UNA_VUELTA_MS = 20 * 60_000;
const GRACIA_AL_CORTAR_MS = 5_000;
/** Lo más que se lee de lo que dice: una respuesta de un asiento cabe de sobra. */
const LO_MAS_QUE_SE_LEE = 32 * 1024 * 1024;

export type OpcionesDeClaudeCode = {
  con: ConQue;
  /** El programa de Claude Code: `claude` si no se dice otro. En las pruebas, uno de mentira. */
  binario?: string;
  /** El entorno de la máquina, del que se quita lo que no debe llegarle. */
  entorno?: Record<string, string | undefined>;
  topeMs?: number;
};

/**
 * Lo que no le llega a Claude Code del entorno de la máquina: las llaves de la casa, cualquier cosa de la API de
 * Anthropic (una clave le haría gastar de ella y no de la suscripción; una dirección, hablar con otro sitio), las
 * nubes por las que podría pensar en vez de la cuenta, y todo lo que tenga nombre de clave, de token o de secreto.
 */
export function entornoDeClaudeCode(entorno: Record<string, string | undefined>): Record<string, string> {
  const fuera = (nombre: string): boolean =>
    nombre !== TOKEN_DE_LA_CUENTA &&
    (/^ELDORADO_/i.test(nombre) ||
      /^ANTHROPIC_/i.test(nombre) ||
      /^CLAUDE_CODE_USE_/i.test(nombre) ||
      /^CLAUDE_CODE_OAUTH_/i.test(nombre) ||
      /^CLAUDE_CONFIG_DIR$/i.test(nombre) ||
      /^(AWS|GOOGLE|GCLOUD|AZURE|VERTEX|BEDROCK)_/i.test(nombre) ||
      /KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH/i.test(nombre));
  const limpio: Record<string, string> = {};
  for (const [nombre, valor] of Object.entries(entorno))
    if (valor !== undefined && !fuera(nombre)) limpio[nombre] = valor;
  return limpio;
}

/** Las opciones con las que se lanza: una vuelta, sin herramientas y sin nada de lo instalado en la máquina. */
export function opcionesDe(con: ConQue, instrucciones: string): string[] {
  return [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    // Sin esta, Claude Code no da su salida en stream-json con -p.
    "--verbose",
    "--system-prompt-file",
    instrucciones,
    "--model",
    con.modelo,
    ...(con.esfuerzo === null ? [] : ["--effort", con.esfuerzo]),
    "--max-turns",
    "1",
    "--tools",
    "",
    "--no-session-persistence",
    "--safe-mode",
    "--strict-mcp-config",
    "--restricted",
    "--disable-slash-commands",
    "--permission-mode",
    "acceptEdits",
    "--permission-prompts",
    "none",
  ];
}

/** El fallo, dicho para quien lleva el run: sin el token, ni nada que tenga forma de clave. */
function tapado(texto: string, token: string | undefined): string {
  let limpio = texto;
  if (token !== undefined && token.length >= 8) limpio = limpio.split(token).join("[token]");
  return limpio
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[clave]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[...]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Por qué no contestó, por lo que dice: el límite de la cuenta, el token o lo demás. */
function porQue(dicho: string): string {
  if (
    /usage limit|rate limit|hit your limit|limit reached|out of (extra )?usage|spend limit|5-hour limit|quota/i.test(
      dicho,
    )
  )
    return "a la cuenta de Claude de la casa se le ha acabado el límite de uso por ahora";
  if (/oauth|token|log ?in|not logged|authenticat|unauthori[sz]ed|\b401\b|\b403\b|invalid api key/i.test(dicho))
    return "Claude Code no admite el token de la cuenta de la casa";
  if (/model/i.test(dicho) && /not (found|available|exist)|unknown|invalid/i.test(dicho))
    return "Claude Code no conoce el modelo que dice el entorno";
  return "Claude Code no llegó a contestar";
}

const numero = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0);

/** Cómo acabó, dicho como lo entiende la casa. */
function finDe(parada: unknown): Respuesta["fin"] {
  if (parada === "refusal") return "refusal";
  return parada === "max_tokens" ? "max_tokens" : "end";
}

/**
 * Lee lo que dijo Claude Code en stream-json: una línea por suceso, y la que vale es la última del resultado. De ahí
 * salen la respuesta, cómo acabó, lo que leyó y escribió y lo que dice que costó. Lo que no se entiende, o un
 * resultado que es un fallo, se lanza, con el porqué y sin el token.
 */
export function leerSalida(salida: string, token?: string): Respuesta {
  let resultado: Record<string, unknown> | null = null;
  for (const linea of salida.split(/\r?\n/)) {
    if (linea.trim() === "") continue;
    try {
      const suceso: unknown = JSON.parse(linea);
      if (typeof suceso === "object" && suceso !== null && (suceso as { type?: unknown }).type === "result")
        resultado = suceso as Record<string, unknown>;
    } catch {
      // Una línea que no es JSON no es un suceso: no se le hace caso.
    }
  }
  if (resultado === null) throw new Error("Claude Code no dio su resultado");
  const dicho = typeof resultado.result === "string" ? resultado.result : "";
  const errores = Array.isArray(resultado.errors) ? resultado.errors.filter((e) => typeof e === "string") : [];
  if (resultado.is_error === true || resultado.subtype !== "success") {
    const motivo = [dicho, ...errores, String(resultado.subtype ?? "")].join(" ");
    const detalle = tapado(motivo, token);
    throw new Error(`${porQue(motivo)}${detalle === "" ? "" : ` (${detalle})`}`);
  }
  const usd = resultado.total_cost_usd;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0) throw new Error("Claude Code no dijo lo que costó");
  const uso = (typeof resultado.usage === "object" && resultado.usage !== null ? resultado.usage : {}) as Record<
    string,
    unknown
  >;
  return {
    texto: dicho,
    fin: finDe(resultado.stop_reason),
    entrada: numero(uso.input_tokens) + numero(uso.cache_creation_input_tokens) + numero(uso.cache_read_input_tokens),
    salida: numero(uso.output_tokens),
    usd,
  };
}

/**
 * Quien piensa de verdad en un asiento con la cuenta de la casa: lanza Claude Code una vuelta, le pasa el contrato y
 * el material, y lee lo que contesta. Si tarda más de su tope o la casa lo corta, se le para; si falla, se lanza el
 * porqué, sin el token dentro.
 */
export function pensarConClaudeCode(o: OpcionesDeClaudeCode): Pensar {
  const binario = o.binario ?? "claude";
  const topeMs = o.topeMs ?? TOPE_DE_UNA_VUELTA_MS;
  return async (p, corte) => {
    const entorno = o.entorno ?? process.env;
    const token = entorno[TOKEN_DE_LA_CUENTA];
    // Lo que se le manda se monta antes de lanzar nada: una foto que no se sabe mandar no gasta una vuelta.
    const mensaje = JSON.stringify({
      type: "user",
      message: { role: "user", content: mensajesDe(p)[0].content },
      parent_tool_use_id: null,
    });
    if (corte?.aborted) throw new Error("la llamada a Claude Code se cortó");
    const raiz = mkdtempSync(join(tmpdir(), "eldorado-claude-"));
    try {
      const vacia = join(raiz, "aqui");
      const configuracion = join(raiz, "config");
      mkdirSync(vacia, { mode: 0o700 });
      mkdirSync(configuracion, { mode: 0o700 });
      const instrucciones = join(raiz, "contrato.md");
      writeFileSync(instrucciones, p.contrato, { mode: 0o600 });
      const env = { ...entornoDeClaudeCode(entorno), CLAUDE_CONFIG_DIR: configuracion };
      return await new Promise<Respuesta>((resuelve, falla) => {
        let acabado = false;
        let porQueSeCorto: string | null = null;
        const trozos: Buffer[] = [];
        let peso = 0;
        const hijo = spawn(binario, opcionesDe(o.con, instrucciones), {
          cwd: vacia,
          env,
          stdio: ["pipe", "pipe", "ignore"],
        });
        const cortar = (motivo: string): void => {
          if (acabado || porQueSeCorto !== null) return;
          porQueSeCorto = motivo;
          hijo.kill("SIGTERM");
          setTimeout(() => {
            if (!acabado) hijo.kill("SIGKILL");
          }, GRACIA_AL_CORTAR_MS).unref();
        };
        const reloj = setTimeout(
          () => cortar(`Claude Code tardó más de ${Math.round(topeMs / 1000)} segundos y se le cortó`),
          topeMs,
        );
        const alCortar = (): void => cortar("la llamada a Claude Code se cortó");
        corte?.addEventListener("abort", alCortar, { once: true });
        const acaba = (): void => {
          acabado = true;
          clearTimeout(reloj);
          corte?.removeEventListener("abort", alCortar);
        };
        hijo.stdout.on("data", (trozo: Buffer) => {
          peso += trozo.length;
          if (peso > LO_MAS_QUE_SE_LEE) return cortar("Claude Code dijo más de lo que se lee");
          trozos.push(trozo);
        });
        // Si deja de leer su entrada antes de tiempo, lo que cuenta es cómo acaba, no el fallo al escribirle.
        hijo.stdin.on("error", () => undefined);
        hijo.on("error", (e: NodeJS.ErrnoException) => {
          acaba();
          falla(
            new Error(
              e.code === "ENOENT" ? "no se encuentra Claude Code en esta máquina" : "no se pudo lanzar Claude Code",
            ),
          );
        });
        hijo.on("close", (codigo) => {
          if (acabado) return;
          acaba();
          if (porQueSeCorto !== null) return falla(new Error(porQueSeCorto));
          try {
            resuelve(leerSalida(Buffer.concat(trozos).toString("utf8"), token));
          } catch (e) {
            const motivo = e instanceof Error ? e.message : "Claude Code no dio su resultado";
            falla(new Error(codigo === 0 ? motivo : `${motivo}; salió con ${codigo ?? "una señal"}`));
          }
        });
        hijo.stdin.end(`${mensaje}\n`);
      });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  };
}
