// Quien piensa con la cuenta de Claude de la casa, por Claude Code: una vuelta por asiento y sin herramientas. Es el
// otro `Pensar`, al lado de la llamada directa con la clave de un viajero (`ia_de_verdad.ts`): lo que se le manda y
// lo que se hace con lo que contesta está en `ia.ts`, y aquí solo se lanza `claude -p` y se lee lo que dice.
//
// El contrato va como instrucciones de sistema, en un archivo; la orden y el material, con las fotos en su orden, en
// un solo mensaje por la entrada (en `stream-json`, que es la forma que admite fotos). Claude Code corre en una
// carpeta vacía, con su propia carpeta de usuario también vacía, sin herramientas, sin lo que haya instalado en la
// máquina (ni CLAUDE.md, ni plugins, ni servidores MCP) y sin guardar la sesión. De su entorno se dice lo que pasa, y
// nada más: la ruta de los programas, lo que hace falta para salir por un proxy y fiarse de sus certificados, y el
// token de la suscripción (de `claude setup-token`), que la casa recibe como ELDORADO_TOKEN_DE_CLAUDE y le pasa como
// CLAUDE_CODE_OAUTH_TOKEN. Así gasta de la cuenta de la casa y de nada más: ni de una clave de API, ni de la sesión de
// Claude Code de la máquina en la que corra la casa, cuyas variables (CLAUDE_*, ANTHROPIC_*) no le llegan.
//
// Con qué modelo se piensa lo dice el entorno de la casa (ELDORADO_MODELO), nunca este repositorio.
//
// El asiento que dice en su contrato que sale a internet recibe dos herramientas de Claude Code y ninguna más: su
// buscador (WebSearch) y su lector de webs (WebFetch). Claude Code da las vueltas que le hagan falta, y la casa
// cuenta cada búsqueda y cada página según las pide: a la primera que pase de su tope, lo corta. De lo que dice en
// stream-json se saca lo que buscó y lo que abrió de verdad.

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { StringDecoder } from "node:string_decoder";
import { join } from "node:path";
import { paginaDeFuera, type Busqueda, type Consultado, type Pagina } from "./consultado.ts";
import type { Internet, Parcial, Pensar, Respuesta } from "./ia.ts";
import { mensajesDe, type ConQue } from "./ia_de_verdad.ts";

/** Cómo le llega a la casa el token de la suscripción, y cómo se lo pasa a Claude Code. */
export const TOKEN_DE_LA_CASA = "ELDORADO_TOKEN_DE_CLAUDE";
export const TOKEN_DE_LA_CUENTA = "CLAUDE_CODE_OAUTH_TOKEN";
/** Lo único del entorno de la máquina que pasa: para salir por un proxy y fiarse de sus certificados. */
const DE_LA_RED = new Set([
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "ALL_PROXY",
  "NODE_EXTRA_CA_CERTS",
  "NODE_USE_ENV_PROXY",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
]);
/** Las dos herramientas de Claude Code que recibe un asiento con internet: el buscador y el lector de webs. */
export const HERRAMIENTAS_DE_INTERNET = ["WebSearch", "WebFetch"] as const;
/** Lo que puede tardar una vuelta, si no se dice otra cosa, y lo que se le deja para acabar cuando se le corta. */
export const TOPE_DE_UNA_VUELTA_MS = 20 * 60_000;
const GRACIA_AL_CORTAR_MS = 5_000;
/** Lo más que se lee de lo que dice: una respuesta de un asiento cabe de sobra. */
const LO_MAS_QUE_SE_LEE = 32 * 1024 * 1024;

export type OpcionesDeClaudeCode = {
  con: ConQue;
  /** El token de la suscripción de la casa. */
  token: string;
  /** El programa de Claude Code: `claude` si no se dice otro. En las pruebas, uno de mentira. */
  binario?: string;
  /** El entorno de la máquina, del que solo pasa la ruta de los programas y lo de la red. */
  entorno?: Record<string, string | undefined>;
  topeMs?: number;
};

/**
 * El entorno de Claude Code, por lista de lo que pasa: la ruta de los programas, una carpeta de usuario propia y
 * vacía (para que no lea ajustes ni credenciales de nadie), lo de la red y el token de la suscripción. Nada más.
 */
export function entornoDeClaudeCode(
  entorno: Record<string, string | undefined>,
  token: string,
  casa: string,
): Record<string, string> {
  const limpio: Record<string, string> = {};
  for (const [nombre, valor] of Object.entries(entorno))
    if (valor !== undefined && DE_LA_RED.has(nombre.toUpperCase())) limpio[nombre] = valor;
  return { ...limpio, PATH: entorno.PATH ?? "/usr/local/bin:/usr/bin:/bin", HOME: casa, [TOKEN_DE_LA_CUENTA]: token };
}

/**
 * Las opciones con las que se lanza: sin herramientas (y sin ellas no hay más que una vuelta) y sin nada de lo
 * instalado en la máquina. No se usa `--max-turns`: la versión instalada no la lista en su ayuda. Con internet, el
 * buscador y el lector de webs, dados y permitidos de antemano, y nada más: los topes los lleva la casa.
 */
export function opcionesDe(con: ConQue, instrucciones: string, internet = false): string[] {
  const herramientas = HERRAMIENTAS_DE_INTERNET.join(",");
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
    ...(internet ? ["--tools", herramientas, "--allowedTools", herramientas] : ["--tools", ""]),
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

const objeto = (x: unknown): Record<string, unknown> | null =>
  typeof x === "object" && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
const textoDe = (x: unknown): string | null => (typeof x === "string" && x.trim() !== "" ? x : null);

/** Cada herramienta que pidió, en un suceso de stream-json: su seña, su nombre y lo que le pasó. */
export function pedidosEn(suceso: unknown): { id: string; nombre: string; entrada: Record<string, unknown> }[] {
  const s = objeto(suceso);
  if (s?.type !== "assistant") return [];
  const contenido = objeto(s.message)?.content;
  if (!Array.isArray(contenido)) return [];
  return contenido.flatMap((b) => {
    const x = objeto(b);
    if (x?.type !== "tool_use" || typeof x.id !== "string" || typeof x.name !== "string") return [];
    return [{ id: x.id, nombre: x.name, entrada: objeto(x.input) ?? {} }];
  });
}

/** Las direcciones con su título que hay dentro de lo que devolvió el buscador, se diga como se diga. */
function resultadosEn(x: unknown, salida: Busqueda["resultados"] = [], hondo = 0): Busqueda["resultados"] {
  if (hondo > 6) return salida;
  if (Array.isArray(x)) for (const y of x) resultadosEn(y, salida, hondo + 1);
  const o = objeto(x);
  if (o !== null) {
    const url = textoDe(o.url);
    if (url !== null && /^https?:\/\//i.test(url)) salida.push({ url, titulo: textoDe(o.title) });
    else for (const y of Object.values(o)) resultadosEn(y, salida, hondo + 1);
  }
  return salida;
}

/**
 * Lo que buscó y lo que abrió, sacado de los sucesos de stream-json: cada herramienta que pidió y lo que le volvió.
 * Una página cuenta como abierta solo si volvió sin fallo y, si dice su código, con uno de los que dicen que se leyó
 * (un 2xx): una que lleva a otra parte, o que no contestó, no se abrió.
 */
export function consultadoDeClaudeCode(sucesos: unknown[]): Consultado {
  const pedidos = new Map<string, { nombre: string; entrada: Record<string, unknown> }>();
  for (const s of sucesos) for (const p of pedidosEn(s)) pedidos.set(p.id, p);
  const vueltas = new Map<string, { error: boolean; detalle: Record<string, unknown> | null }>();
  for (const s of sucesos) {
    const o = objeto(s);
    if (o?.type !== "user") continue;
    const contenido = objeto(o.message)?.content;
    if (!Array.isArray(contenido)) continue;
    for (const b of contenido) {
      const x = objeto(b);
      if (x?.type !== "tool_result" || typeof x.tool_use_id !== "string") continue;
      vueltas.set(x.tool_use_id, { error: x.is_error === true, detalle: objeto(o.tool_use_result) });
    }
  }
  const busquedas: Busqueda[] = [];
  const paginas: Pagina[] = [];
  const fallidas: Consultado["fallidas"] = [];
  for (const [id, p] of pedidos) {
    const vuelta = vueltas.get(id);
    if (p.nombre === "WebSearch") {
      const consulta = textoDe(p.entrada.query) ?? "unknown";
      if (vuelta === undefined || vuelta.error)
        busquedas.push({ consulta, resultados: [], fallo: vuelta === undefined ? "no result" : "error" });
      else busquedas.push({ consulta, resultados: resultadosEn(vuelta.detalle?.results), fallo: null });
    } else if (p.nombre === "WebFetch") {
      const url = textoDe(p.entrada.url) ?? "unknown";
      const codigo = vuelta?.detalle?.code;
      if (vuelta === undefined) fallidas.push({ url, porque: "no result" });
      else if (vuelta.error) fallidas.push({ url, porque: "error" });
      else if (typeof codigo === "number" && (codigo < 200 || codigo > 299))
        fallidas.push({ url, porque: `code ${codigo}` });
      else {
        const final = textoDe(vuelta.detalle?.url);
        paginas.push({ url, final: final !== null && final !== url ? final : null, titulo: null, cuando: null });
      }
    }
  }
  return { busquedas, paginas, fallidas };
}

/**
 * Lee lo que dijo Claude Code en stream-json: una línea por suceso, y la que vale es la última del resultado. De ahí
 * salen la respuesta, cómo acabó, lo que leyó y escribió y lo que dice que costó. Lo que no se entiende, o un
 * resultado que es un fallo, se lanza, con el porqué y sin el token.
 */
export function leerSalida(salida: string, token?: string, internet = false): Respuesta {
  let resultado: Record<string, unknown> | null = null;
  const sucesos: unknown[] = [];
  for (const linea of salida.split(/\r?\n/)) {
    if (linea.trim() === "") continue;
    try {
      const suceso: unknown = JSON.parse(linea);
      sucesos.push(suceso);
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
  // Lo consultado va siempre que tuvo internet, y también si pidió una herramienta sin tenerlo: la casa lo dirá.
  const pidio = sucesos.some((x) => pedidosEn(x).length > 0);
  const turnos = resultado.num_turns;
  return {
    texto: dicho,
    fin: finDe(resultado.stop_reason),
    entrada: numero(uso.input_tokens) + numero(uso.cache_creation_input_tokens) + numero(uso.cache_read_input_tokens),
    salida: numero(uso.output_tokens),
    usd,
    ...(typeof turnos === "number" && Number.isInteger(turnos) && turnos > 1 ? { turnos } : {}),
    ...(internet || pidio ? { consultado: consultadoDeClaudeCode(sucesos) } : {}),
  };
}

/**
 * Lo que llevaba contado Claude Code cuando se le cortó (14.7), de lo que alcanzó a decir. Según su documentación,
 * cada mensaje del modelo lleva lo que leyó en ese paso (los que comparten seña repiten la misma cuenta, y se cuenta
 * una vez), pero lo que escribió es provisional, y lo que cuesta solo lo dice su resultado final, que no llega si se
 * le corta. Así que solo hay dólares si llegó a dar su resultado con un coste de verdad (más de cero: uno cortado
 * puede darlo a cero). Sin precio (gasta de la suscripción), lo que quedó sin contar no se puede acotar: null.
 */
export function parcialDeClaudeCode(salida: string, internet: boolean): Parcial {
  const sucesos: unknown[] = [];
  for (const linea of salida.split(/\r?\n/)) {
    if (linea.trim() === "") continue;
    try {
      sucesos.push(JSON.parse(linea));
    } catch {
      // Una línea a medias, la del corte, no es un suceso.
    }
  }
  const vistos = new Map<string, number>();
  for (const x of sucesos) {
    const o = objeto(x);
    const mensaje = objeto(o?.message);
    if (o?.type !== "assistant" || mensaje === null || typeof mensaje.id !== "string") continue;
    const uso = objeto(mensaje.usage) ?? {};
    vistos.set(
      mensaje.id,
      numero(uso.input_tokens) + numero(uso.cache_creation_input_tokens) + numero(uso.cache_read_input_tokens),
    );
  }
  const consultado = internet || sucesos.some((x) => pedidosEn(x).length > 0) ? consultadoDeClaudeCode(sucesos) : null;
  const resultado = sucesos.map(objeto).findLast((x) => x?.type === "result") ?? null;
  const usd = resultado?.total_cost_usd;
  const conCoste = typeof usd === "number" && Number.isFinite(usd) && usd > 0;
  const usoFinal = objeto(resultado?.usage);
  const turnos = vistos.size;
  return {
    entrada:
      conCoste && usoFinal !== null
        ? numero(usoFinal.input_tokens) +
          numero(usoFinal.cache_creation_input_tokens) +
          numero(usoFinal.cache_read_input_tokens)
        : [...vistos.values()].reduce((t, x) => t + x, 0),
    salida: conCoste && usoFinal !== null ? numero(usoFinal.output_tokens) : 0,
    ...(conCoste ? { usd } : {}),
    ...(turnos > 1 ? { turnos } : {}),
    ...(consultado === null ? {} : { consultado }),
    sinContar: null,
  };
}

/**
 * Cuenta, según llegan, las herramientas que pide: si pide una que no se le dio, o una búsqueda o una página de más,
 * dice por qué hay que cortarlo. Si no, null.
 */
export function contadorDeTopes(internet: Internet | null): (suceso: unknown) => string | null {
  let busquedas = 0;
  let paginas = 0;
  return (suceso) => {
    for (const p of pedidosEn(suceso)) {
      if (internet === null) return `Claude Code pidió una herramienta, ${p.nombre}, y este asiento no tiene ninguna`;
      if (p.nombre === "WebSearch") busquedas++;
      else if (p.nombre === "WebFetch") {
        paginas++;
        // Su lector corre en la máquina de la casa: una página no le puede hacer abrir lo que hay dentro de su red.
        if (!paginaDeFuera(typeof p.entrada.url === "string" ? p.entrada.url : ""))
          return "Claude Code pidió abrir una dirección que no es una página https de fuera";
      } else return `Claude Code pidió una herramienta que no se le dio: ${p.nombre}`;
      if (busquedas > internet.busquedas) return `Claude Code pasó de su tope de ${internet.busquedas} búsquedas`;
      if (paginas > internet.paginas) return `Claude Code pasó de su tope de ${internet.paginas} páginas`;
    }
    return null;
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
    const token = o.token;
    if (token.trim() === "") throw new Error("falta el token de la cuenta de Claude de la casa");
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
      const casa = join(raiz, "casa");
      mkdirSync(vacia, { mode: 0o700 });
      mkdirSync(casa, { mode: 0o700 });
      const instrucciones = join(raiz, "contrato.md");
      writeFileSync(instrucciones, p.contrato, { mode: 0o600 });
      const env = entornoDeClaudeCode(entorno, token, casa);
      return await new Promise<Respuesta>((resuelve, falla) => {
        let acabado = false;
        let porQueSeCorto: string | null = null;
        const trozos: Buffer[] = [];
        let peso = 0;
        const internet = p.internet ?? null;
        const contar = contadorDeTopes(internet);
        let pendiente = "";
        const decodificador = new StringDecoder("utf8");
        const hijo = spawn(binario, opcionesDe(o.con, instrucciones, internet !== null), {
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
          // Lo que pide se cuenta según llega, línea a línea: a la que pasa de su tope se le corta en cuanto la pide.
          const lineas = (pendiente + decodificador.write(trozo)).split("\n");
          pendiente = lineas.pop() ?? "";
          for (const linea of lineas) {
            let suceso: unknown;
            try {
              suceso = JSON.parse(linea);
            } catch {
              continue;
            }
            const motivo = contar(suceso);
            if (motivo !== null) return cortar(motivo);
          }
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
          // Cortado: con lo que alcanzó a decir, por si dice lo que gastó (14.7). El porqué ya va sin el token.
          if (porQueSeCorto !== null)
            return falla(
              Object.assign(new Error(porQueSeCorto), {
                parcial: parcialDeClaudeCode(Buffer.concat(trozos).toString("utf8"), internet !== null),
              }),
            );
          try {
            resuelve(leerSalida(Buffer.concat(trozos).toString("utf8"), token, internet !== null));
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
