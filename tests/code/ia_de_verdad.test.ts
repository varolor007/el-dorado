// La pieza que llama a Claude: lo que le manda, en la forma de su API, y cómo lee lo que contesta. Con una librería
// de mentira en su sitio: no se llama a nadie y no se gasta.

import assert from "node:assert/strict";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { iaDe } from "../../agent/launcher/arrancar.ts";
import {
  claveQueFunciona,
  conQueDe,
  MAXIMO_DE_UNA_RESPUESTA,
  mensajesDe,
  pensarConClaude,
  type ClienteDeIA,
} from "../../agent/launcher/ia_de_verdad.ts";
import type { Peticion } from "../../agent/launcher/ia.ts";

const CLAVE = "clave-de-ia-inventada-0001";
const CON = { modelo: "modelo-inventado", esfuerzo: null };
const PETICION: Peticion = {
  contrato: "El contrato del asiento.",
  partes: [{ texto: "La orden." }, { foto: { tipo: "image/jpeg", base64: "AAAA" } }, { texto: "El material." }],
};

type Pedido = { cuerpo: Record<string, unknown>; opciones: Record<string, unknown>; clave: string };

/** Una librería de mentira: apunta lo que se le pide y contesta, o falla, como se le diga. */
function deMentira(contesta: () => unknown): { cliente: (clave: string) => ClienteDeIA; pedidos: Pedido[] } {
  const pedidos: Pedido[] = [];
  const cliente = (clave: string): ClienteDeIA =>
    ({
      messages: {
        stream: (cuerpo: Record<string, unknown>, opciones: Record<string, unknown>) => {
          pedidos.push({ cuerpo, opciones, clave });
          return { finalMessage: async () => contesta() };
        },
      },
      models: {
        retrieve: async (modelo: string) => {
          pedidos.push({ cuerpo: { modelo }, opciones: {}, clave });
          return contesta();
        },
      },
    }) as unknown as ClienteDeIA;
  return { cliente, pedidos };
}

const mensaje = (mas: Record<string, unknown> = {}): unknown => ({
  content: [
    { type: "thinking", thinking: "Lo que piensa por dentro." },
    { type: "text", text: "=== 1-acknowledgement.md ===\n" },
    { type: "text", text: "Recibido." },
  ],
  stop_reason: "end_turn",
  usage: { input_tokens: 1000, output_tokens: 300, cache_creation_input_tokens: 200, cache_read_input_tokens: 50 },
  ...mas,
});

/** Un fallo de la librería, de la clase que sea, con su número. */
const fallo = (estado: number): Error =>
  Anthropic.APIError.generate(estado, { type: "error" }, "fallo inventado", new Headers());

test("con qué se piensa lo dice el entorno: sin modelo no hay IA, y lo mal escrito no vale", () => {
  assert.equal(conQueDe({}), null);
  assert.equal(conQueDe({ ELDORADO_MODELO: "  " }), null);
  assert.deepEqual(conQueDe({ ELDORADO_MODELO: " modelo-inventado " }), { modelo: "modelo-inventado", esfuerzo: null });
  assert.deepEqual(conQueDe({ ELDORADO_MODELO: "modelo-inventado", ELDORADO_ESFUERZO: "high" }), {
    modelo: "modelo-inventado",
    esfuerzo: "high",
  });
  assert.throws(() => conQueDe({ ELDORADO_MODELO: "un modelo con espacios" }), /no tiene forma de modelo/);
  assert.throws(() => conQueDe({ ELDORADO_MODELO: "modelo-inventado", ELDORADO_ESFUERZO: "muchísimo" }), /esfuerzo/);
  // La casa enchufa la IA solo si el entorno dice el modelo, y entonces pide también su precio.
  assert.deepEqual(iaDe({}), {});
  assert.throws(() => iaDe({ ELDORADO_MODELO: "modelo-inventado" }), /falta el precio de la IA/);
  const ia = iaDe({ ELDORADO_MODELO: "modelo-inventado", ELDORADO_PRECIO_ENTRADA: "4", ELDORADO_PRECIO_SALIDA: "20" });
  assert.deepEqual([typeof ia.lanzador, typeof ia.claveQueFunciona], ["function", "function"]);
});

test("lo que se le manda va en un solo mensaje, con los textos y las fotos en su orden", () => {
  assert.deepEqual(mensajesDe(PETICION), [
    {
      role: "user",
      content: [
        { type: "text", text: "La orden." },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } },
        { type: "text", text: "El material." },
      ],
    },
  ]);
  const rara: Peticion = { contrato: "", partes: [{ foto: { tipo: "image/tiff", base64: "AAAA" } }] };
  assert.throws(() => mensajesDe(rara), /una clase que la IA no mira/);
});

test("la llamada: el modelo del entorno, la clave del viajero, el contrato de sistema, sin herramientas", async () => {
  const { cliente, pedidos } = deMentira(() => mensaje());
  const corte = new AbortController().signal;
  const r = await pensarConClaude(CLAVE, CON, cliente)(PETICION, corte);
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].clave, CLAVE);
  assert.deepEqual(pedidos[0].cuerpo, {
    model: "modelo-inventado",
    max_tokens: MAXIMO_DE_UNA_RESPUESTA,
    thinking: { type: "adaptive" },
    system: "El contrato del asiento.",
    messages: mensajesDe(PETICION),
  });
  // Si se acaba su tope, la casa corta la llamada: la señal viaja con el pedido.
  assert.equal(pedidos[0].opciones.signal, corte);
  // Lo que piensa por dentro no cuenta: solo lo que dice. Y lo leído suma también lo que salió de la memoria.
  assert.deepEqual(r, { texto: "=== 1-acknowledgement.md ===\nRecibido.", fin: "end", entrada: 1250, salida: 300 });
  // El esfuerzo solo se manda si el entorno lo dice.
  await pensarConClaude(CLAVE, { modelo: "modelo-inventado", esfuerzo: "low" }, cliente)(PETICION);
  assert.deepEqual(pedidos[1].cuerpo.output_config, { effort: "low" });
  assert.ok(!("tools" in pedidos[1].cuerpo) && !("output_config" in pedidos[0].cuerpo));
});

test("cómo acabó la respuesta: entera, cortada por larga, o la IA no quiso contestar", async () => {
  for (const [parada, fin] of [
    ["end_turn", "end"],
    ["stop_sequence", "end"],
    ["max_tokens", "max_tokens"],
    ["refusal", "refusal"],
  ]) {
    const { cliente } = deMentira(() => mensaje({ stop_reason: parada, content: [] }));
    const r = await pensarConClaude(CLAVE, CON, cliente)(PETICION);
    assert.deepEqual([r.fin, r.texto], [fin, ""], parada);
  }
  const sinMemoria = deMentira(() => mensaje({ usage: { input_tokens: 10, output_tokens: 2 } }));
  assert.equal((await pensarConClaude(CLAVE, CON, sinMemoria.cliente)(PETICION)).entrada, 10);
});

test("un fallo de la IA se dice para quien lleva el run, sin la clave ni lo que contestó la IA", async () => {
  const casos: [Error, RegExp][] = [
    [fallo(401), /no admite esa clave/],
    [fallo(403), /no tiene permiso/],
    [fallo(404), /no conoce el modelo/],
    [fallo(429), /demasiado seguido/],
    [fallo(400), /no admite lo que se le mandó/],
    [fallo(529), /fallo 529/],
    [new Anthropic.APIConnectionError({ message: `no se llega con ${CLAVE}` }), /no se llega a la IA/],
    [new Anthropic.APIUserAbortError(), /se cortó/],
    [new Error(`algo raro con ${CLAVE}`), /la llamada a la IA falló/],
  ];
  for (const [error, dice] of casos) {
    const { cliente } = deMentira(() => {
      throw error;
    });
    await assert.rejects(pensarConClaude(CLAVE, CON, cliente)(PETICION), (e: Error) => {
      assert.match(e.message, dice);
      assert.ok(!e.message.includes(CLAVE) && !e.message.includes("fallo inventado"), e.message);
      return true;
    });
  }
});

test("una clave se comprueba preguntando por el modelo, sin gastar; sin red, no se da por mala", async () => {
  const buena = deMentira(() => ({ id: "modelo-inventado" }));
  assert.equal(await claveQueFunciona(CLAVE, CON, buena.cliente), true);
  assert.deepEqual(buena.pedidos, [{ cuerpo: { modelo: "modelo-inventado" }, opciones: {}, clave: CLAVE }]);
  for (const estado of [401, 403, 404]) {
    const mala = deMentira(() => {
      throw fallo(estado);
    });
    assert.equal(await claveQueFunciona(CLAVE, CON, mala.cliente), false, String(estado));
  }
  const caida = deMentira(() => {
    throw fallo(529);
  });
  await assert.rejects(claveQueFunciona(CLAVE, CON, caida.cliente), /fallo 529/);
});
