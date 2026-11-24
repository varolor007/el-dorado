// La pieza que llama a Claude de verdad, con la librería oficial de Anthropic: una llamada por asiento, con la clave
// del viajero. Es lo único del agente que habla con la IA. Lo que se le manda y lo que se hace con lo que contesta
// está en `ia.ts`; aquí solo se traduce a la forma de su API y se vuelve con lo dicho, cómo acabó y lo que leyó y
// escribió.
//
// Con qué modelo se piensa lo dice el entorno (ELDORADO_MODELO), nunca este repositorio; y cuánto se esfuerza, si
// se quiere decir (ELDORADO_ESFUERZO). El asiento no tiene herramientas: ni abre archivos ni sale a internet. Solo el
// que lo dice en su contrato recibe el buscador y el lector de webs de la propia API, con sus topes; de lo que
// devuelven se saca lo que buscó y lo que abrió de verdad.

import Anthropic from "@anthropic-ai/sdk";
import { LO_MAS_DE_UNA_PAGINA, VUELTAS_CON_INTERNET } from "../data/internet.ts";
import type { Busqueda, Consultado, Pagina } from "./consultado.ts";
import type { Internet, Parte, Pensar, Peticion, Respuesta } from "./ia.ts";

/** Lo más que puede medir una respuesta. Va por partes, para que una larga no se corte por esperar. */
export const MAXIMO_DE_UNA_RESPUESTA = 64_000;
export const ESFUERZOS = ["low", "medium", "high", "xhigh", "max"] as const;
type Esfuerzo = (typeof ESFUERZOS)[number];

/** Con qué se piensa: el modelo y, si se dice, cuánto se esfuerza. */
export type ConQue = { modelo: string; esfuerzo: Esfuerzo | null };

/** Lo que dice el entorno de con qué se piensa. Sin modelo no hay IA que enchufar: null. */
export function conQueDe(entorno: Record<string, string | undefined>): ConQue | null {
  const modelo = (entorno.ELDORADO_MODELO ?? "").trim();
  if (modelo === "") return null;
  if (!/^[a-z0-9][a-z0-9.@:-]{2,80}$/.test(modelo))
    throw new Error("el modelo que dice el entorno no tiene forma de modelo");
  const dicho = (entorno.ELDORADO_ESFUERZO ?? "").trim();
  if (dicho !== "" && !ESFUERZOS.includes(dicho as Esfuerzo))
    throw new Error("el esfuerzo que dice el entorno no es ninguno de los que hay");
  return { modelo, esfuerzo: dicho === "" ? null : (dicho as Esfuerzo) };
}

const FOTOS = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type TipoDeFoto = (typeof FOTOS)[number];

/** Lo que se le manda, en la forma de su API: un solo mensaje, con los textos y las fotos en su orden. */
export function mensajesDe(p: Peticion): Anthropic.MessageParam[] {
  const bloque = (parte: Parte): Anthropic.ContentBlockParam => {
    if ("texto" in parte) return { type: "text", text: parte.texto };
    if (!FOTOS.includes(parte.foto.tipo as TipoDeFoto))
      throw new Error(`una foto de una clase que la IA no mira: ${parte.foto.tipo}`);
    return {
      type: "image",
      source: { type: "base64", media_type: parte.foto.tipo as TipoDeFoto, data: parte.foto.base64 },
    };
  };
  return [{ role: "user", content: p.partes.map(bloque) }];
}

/**
 * El buscador y el lector de webs de la API, con sus topes por llamada. Son los mismos en cada vuelta: cambiar las
 * herramientas a media conversación invalida lo que la IA ya pensó.
 */
export function herramientasDe(internet: Internet): Anthropic.ToolUnion[] {
  return [
    { type: "web_search_20260209", name: "web_search", max_uses: internet.busquedas },
    {
      type: "web_fetch_20260209",
      name: "web_fetch",
      max_uses: internet.paginas,
      max_content_tokens: LO_MAS_DE_UNA_PAGINA,
    },
  ];
}

const texto = (x: unknown): string | null => (typeof x === "string" && x.trim() !== "" ? x : null);

/**
 * Lo que buscó y lo que abrió, sacado de lo que devolvió la API: cada búsqueda con su pregunta y sus resultados, y
 * cada página con su resultado. Una página cuenta como abierta solo si su resultado dice que se leyó; un pedido sin
 * resultado, o con un fallo, no.
 */
export function consultadoDe(bloques: Anthropic.ContentBlock[]): Consultado {
  const pedidos = new Map<string, { nombre: string; entrada: Record<string, unknown> }>();
  for (const b of bloques)
    if (b.type === "server_tool_use")
      pedidos.set(b.id, { nombre: b.name, entrada: (b.input ?? {}) as Record<string, unknown> });
  const busquedas: Busqueda[] = [];
  const paginas: Pagina[] = [];
  const fallidas: Consultado["fallidas"] = [];
  const contestados = new Set<string>();
  for (const b of bloques) {
    if (b.type === "web_search_tool_result") {
      contestados.add(b.tool_use_id);
      const consulta = texto(pedidos.get(b.tool_use_id)?.entrada.query) ?? "unknown";
      if (Array.isArray(b.content))
        busquedas.push({
          consulta,
          resultados: b.content.map((r) => ({ url: r.url, titulo: texto(r.title) })),
          fallo: null,
        });
      else busquedas.push({ consulta, resultados: [], fallo: b.content.error_code });
    } else if (b.type === "web_fetch_tool_result") {
      contestados.add(b.tool_use_id);
      const pedida = texto(pedidos.get(b.tool_use_id)?.entrada.url);
      const c = b.content;
      if (c.type === "web_fetch_result") {
        const url = pedida ?? c.url;
        paginas.push({
          url,
          final: c.url !== url ? c.url : null,
          titulo: texto(c.content?.title),
          cuando: texto(c.retrieved_at),
        });
      } else fallidas.push({ url: pedida ?? "unknown", porque: c.error_code });
    }
  }
  // Lo que se pidió y no llegó a contestarse no se abrió, pero se pidió: cuenta para el tope.
  for (const [id, p] of pedidos) {
    if (contestados.has(id)) continue;
    if (p.nombre === "web_search")
      busquedas.push({ consulta: texto(p.entrada.query) ?? "unknown", resultados: [], fallo: "no result" });
    if (p.nombre === "web_fetch") fallidas.push({ url: texto(p.entrada.url) ?? "unknown", porque: "no result" });
  }
  return { busquedas, paginas, fallidas };
}

/** Cómo acabó, dicho como lo entiende la casa. */
function finDe(parada: Anthropic.Message["stop_reason"]): Respuesta["fin"] {
  if (parada === "refusal") return "refusal";
  return parada === "max_tokens" ? "max_tokens" : "end";
}

/** Un fallo de la IA, dicho para quien lleva el run y sin nada de la clave dentro. */
function falloDe(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new Error("la IA no admite esa clave");
  if (e instanceof Anthropic.PermissionDeniedError) return new Error("esa clave no tiene permiso para ese modelo");
  if (e instanceof Anthropic.NotFoundError) return new Error("la IA no conoce el modelo que dice el entorno");
  if (e instanceof Anthropic.RateLimitError) return new Error("la IA dice que se le pide demasiado seguido");
  if (e instanceof Anthropic.BadRequestError) return new Error("la IA no admite lo que se le mandó");
  if (e instanceof Anthropic.APIUserAbortError) return new Error("la llamada a la IA se cortó");
  if (e instanceof Anthropic.APIConnectionError) return new Error("no se llega a la IA");
  if (e instanceof Anthropic.APIError) return new Error(`la IA contestó con un fallo ${e.status ?? "sin número"}`);
  return new Error("la llamada a la IA falló");
}

/** Lo que hace falta de la librería: así se le pasa una de mentira en las pruebas. */
export type ClienteDeIA = Pick<Anthropic, "messages" | "models">;
const clienteDe = (clave: string): ClienteDeIA => new Anthropic({ apiKey: clave });

/**
 * Quien piensa de verdad en un asiento: una llamada a Claude con la clave de un viajero. El contrato va como
 * instrucciones del sistema; la orden y el material, en un mensaje. Sin herramientas, salvo el asiento que sale a
 * internet: ese recibe el buscador y el lector de webs, y si la IA para a media vuelta para seguir buscando, se le
 * deja seguir, con lo de antes, hasta sus vueltas.
 */
export function pensarConClaude(
  clave: string,
  con: ConQue,
  cliente: (clave: string) => ClienteDeIA = clienteDe,
): Pensar {
  return async (p, corte) => {
    const herramientas = p.internet ? herramientasDe(p.internet) : null;
    const pregunta = mensajesDe(p);
    const dicho: Anthropic.ContentBlock[] = [];
    let entrada = 0;
    let salida = 0;
    let busquedas: number | undefined;
    let turnos = 0;
    let fin: Respuesta["fin"] = "end";
    try {
      for (;;) {
        turnos++;
        const respuesta = await cliente(clave)
          .messages.stream(
            {
              model: con.modelo,
              max_tokens: MAXIMO_DE_UNA_RESPUESTA,
              thinking: { type: "adaptive" },
              ...(con.esfuerzo === null ? {} : { output_config: { effort: con.esfuerzo } }),
              system: p.contrato,
              ...(herramientas === null ? {} : { tools: herramientas }),
              // Para seguir tras una pausa se le manda lo que ya dijo, tal cual, y nada más.
              messages:
                dicho.length === 0
                  ? pregunta
                  : [...pregunta, { role: "assistant", content: dicho as Anthropic.ContentBlockParam[] }],
            },
            { signal: corte },
          )
          .finalMessage();
        const uso = respuesta.usage;
        entrada += uso.input_tokens + (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0);
        salida += uso.output_tokens;
        const cobradas = uso.server_tool_use?.web_search_requests;
        if (typeof cobradas === "number") busquedas = (busquedas ?? 0) + cobradas;
        dicho.push(...respuesta.content);
        if (respuesta.stop_reason !== "pause_turn") {
          fin = finDe(respuesta.stop_reason);
          break;
        }
        // Sin herramientas no hay pausa que valga; con ellas, se sigue hasta sus vueltas.
        if (herramientas === null || turnos >= VUELTAS_CON_INTERNET) {
          fin = "unfinished";
          break;
        }
      }
    } catch (e) {
      throw falloDe(e);
    }
    return {
      // Lo que piensa por dentro no es su respuesta: solo cuenta el texto que dice.
      texto: dicho.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""),
      fin,
      entrada,
      salida,
      ...(turnos > 1 ? { turnos } : {}),
      ...(herramientas === null
        ? {}
        : { consultado: consultadoDe(dicho), ...(busquedas === undefined ? {} : { busquedas }) }),
    };
  };
}

/**
 * Si una clave sirve para pensar con el modelo del entorno: se le pregunta a la IA por ese modelo, que no gasta.
 * Si la clave no vale o no tiene ese modelo, falso; si no se llega a la IA, se lanza el fallo: no se da por mala
 * una clave que no se ha podido comprobar.
 */
export async function claveQueFunciona(
  clave: string,
  con: ConQue,
  cliente: (clave: string) => ClienteDeIA = clienteDe,
): Promise<boolean> {
  try {
    await cliente(clave).models.retrieve(con.modelo);
    return true;
  } catch (e) {
    const malo = [Anthropic.AuthenticationError, Anthropic.PermissionDeniedError, Anthropic.NotFoundError];
    if (malo.some((clase) => e instanceof clase)) return false;
    throw falloDe(e);
  }
}
