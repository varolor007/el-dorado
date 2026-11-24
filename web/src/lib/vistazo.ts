"use client";

// El primer vistazo, visto desde el navegador: con el destino, las fechas y lo que ya se ha dicho del grupo, la web
// se lo pide a la casa y lo enseña antes del botón. No pide cuenta ni gasta IA. Lo que se pide lo dice el código de
// la casa (`paraElVistazo`), con lo más probable en lo que aún no se ha dicho; al cambiar el grupo, las fechas o la
// moneda se vuelve a pedir, y mientras llega se sigue enseñando el de antes.

import { useEffect, useMemo, useState } from "react";
import type { Vistazo } from "../../../agent/output/viaje.ts";
import type { Respuestas } from "../../../agent/scripts/empezar.ts";
import { claveDelVistazo, paraElVistazo } from "../../../agent/scripts/vistazo.ts";
import { paisDelNavegador } from "./empezar.ts";

/** Por qué no hay vistazo, por su clave: la frase la pone la web. */
export type FalloDelVistazo = "no_sources" | "too_slow" | "busy" | "unclear" | "no_house" | "other";

export type EstadoDelVistazo =
  | { como: "buscando"; vistazo: Vistazo | null }
  | { como: "listo"; vistazo: Vistazo }
  | { como: "fallo"; fallo: FalloDelVistazo; espera: number | null; vistazo: Vistazo | null };

const CLAVES: FalloDelVistazo[] = ["no_sources", "too_slow", "busy", "unclear", "no_house"];
/** Lo más que se espera a la casa desde el navegador: la casa ya corta antes. */
const ESPERA_MS = 45_000;

/** Lo que contesta la casa, leído sin fiarse de su forma: o un vistazo, o un fallo con su clave. */
export function leerRespuesta(
  estado: number,
  cuerpo: unknown,
): { vistazo: Vistazo } | { fallo: FalloDelVistazo; espera: number | null } {
  const c = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as Record<string, unknown>;
  const look = c.look as Vistazo | undefined;
  if (estado === 200 && typeof look === "object" && look !== null && Array.isArray(look.puntos))
    return { vistazo: look };
  const clave = CLAVES.find((x) => x === c.error) ?? (estado === 502 ? "no_house" : "other");
  const espera = typeof c.wait === "number" && Number.isFinite(c.wait) && c.wait > 0 ? Math.ceil(c.wait) : null;
  return { fallo: clave, espera };
}

/** El vistazo de unas respuestas, pedido a la casa cuando cambia lo que lo cambia, y con una pausa al escribir. */
export function useVistazo(r: Respuestas, idioma: string): EstadoDelVistazo {
  const pedido = useMemo(() => {
    const pais = typeof navigator === "undefined" ? null : paisDelNavegador(navigator.language);
    const entendido = paraElVistazo({ ...r, idioma }, pais);
    return entendido === null ? null : { entendido, clave: claveDelVistazo(entendido) };
  }, [r, idioma]);
  const clave = pedido?.clave ?? null;
  const [estado, setEstado] = useState<EstadoDelVistazo>({ como: "buscando", vistazo: null });

  useEffect(() => {
    // Sin lo que hace falta para pedirlo (una edad de niño sin decir), se queda lo que había.
    if (pedido === null) return;
    const corta = new AbortController();
    // Lo que llega de un pedido que ya no vale (porque cambió lo pedido) no se enseña.
    let vale = true;
    let tarde = false;
    const espera = setTimeout(async () => {
      setEstado((antes) => ({ como: "buscando", vistazo: antes.vistazo }));
      const tope = setTimeout(() => {
        tarde = true;
        corta.abort();
      }, ESPERA_MS);
      let leido: ReturnType<typeof leerRespuesta>;
      try {
        const respuesta = await fetch("/api/house/vistazo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ understood: pedido.entendido }),
          signal: corta.signal,
        });
        leido = leerRespuesta(respuesta.status, await respuesta.json().catch(() => null));
      } catch {
        leido = { fallo: tarde ? "too_slow" : "other", espera: null };
      } finally {
        clearTimeout(tope);
      }
      if (!vale) return;
      setEstado((antes) =>
        "vistazo" in leido
          ? { como: "listo", vistazo: leido.vistazo }
          : { como: "fallo", fallo: leido.fallo, espera: leido.espera, vistazo: antes.vistazo },
      );
    }, 700);
    return () => {
      vale = false;
      clearTimeout(espera);
      corta.abort();
    };
    // Solo cuando cambia lo que cambia el vistazo: el gasto o lo que busca no lo cambian.
  }, [clave]);

  return estado;
}
