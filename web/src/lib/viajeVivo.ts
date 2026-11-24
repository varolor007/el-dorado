"use client";

// Un viaje tuyo que aún no está en el mapa, visto desde el navegador: abrirlo en la casa, cambiar lo que he
// entendido, pulsar el botón y escuchar lo que pasa mientras se investiga. Todo pasa por la web hasta la casa.

import { useEffect, useState } from "react";
import type { DeLosPapeles, Suceso } from "../../../agent/output/viaje.ts";
import { pideALaCasa, type ResumenDeViaje } from "./cuenta.ts";

/** Por dónde va la investigación de un viaje, como lo dice la casa: con claves y números, sin frases. */
export type Investigacion = {
  running: boolean;
  steps: { id: string; state: string; waiting: number }[];
  spent: { usd: number; turns: number; known: boolean };
  ceiling: number | null;
  /**
   * Si se ha parado: en qué paso, qué clase de parada es y qué puedes hacer, por claves; una frase del conductor, si
   * pasó su puerta de palabras, con su idioma; y si el conductor aún la está mirando.
   */
  stopped: {
    at: string | null;
    kind?: string;
    options?: string[];
    said?: { text: string; lang: string } | null;
    looking?: boolean;
    /** Volver a intentarlo sigue desde aquí: solo se repite este paso. Si no, la investigación empieza otra vez. */
    resumes?: boolean;
  } | null;
  told: number;
  /** Es tu turno: confirmar lo que he entendido, o contestar lo que te pregunto. */
  waiting_for_you?: boolean;
  heard?: LoEscuchado | null;
  /** La tabla de los papeles, en cuanto está: si algo bloquea, o faltan, es tu turno de decidir. */
  papers?: DeLosPapeles | null;
};

/**
 * Lo que he entendido de lo que escribiste, para que lo confirmes: tus palabras y claves. Un gusto lleva su cosa si
 * es de las que la casa sabe cruzar, y si no, null: entonces se dice con tus palabras.
 */
export type LoEscuchado = {
  round: number;
  can_answer: boolean;
  tastes: { thing: string | null; weight: "must" | "like" | "indifferent"; quote: string }[];
  limits: { quote: string }[];
  booked: { quote: string }[];
  clashes: { with: string; quote: string; other_quote: string }[];
  questions: { ask: string; quote: string }[];
};

/** Lo que mandas al confirmar: los gustos que se quedan, con su peso, y los límites que se quedan; o tus respuestas. */
export type TuConfirmacion =
  | { tastes: { i: number; weight: string }[]; limits: number[] }
  | { answers: { i: number; answer: string }[] }
  | { papers: "go_on" };
export type EnLaCasa = { trip: ResumenDeViaje; research: Investigacion | null };

/** Lo que falló, por su clave; y, si lo entendido no está claro, qué campos. */
export type FalloDeViaje = { clave: string; campos: string[] };

function falloDe(cuerpo: Record<string, unknown>): FalloDeViaje {
  const campos = Array.isArray(cuerpo.fields) ? cuerpo.fields.filter((c): c is string => typeof c === "string") : [];
  return { clave: typeof cuerpo.error === "string" ? cuerpo.error : "other", campos };
}

/** Abre un viaje en la casa con lo que he entendido. Devuelve su identificador, o lo que falló. */
export async function abrirViaje(understood: unknown): Promise<{ id: string } | FalloDeViaje> {
  const r = await pideALaCasa("POST", "viajes", { understood });
  const id = (r.cuerpo.trip as { id?: unknown } | undefined)?.id;
  return r.estado === 201 && typeof id === "string" ? { id } : falloDe(r.cuerpo);
}

export async function cambiarLoEntendido(id: string, understood: unknown): Promise<FalloDeViaje | null> {
  const r = await pideALaCasa("PUT", `viajes/${id}/entendido`, { understood });
  return r.estado === 200 ? null : falloDe(r.cuerpo);
}

/** El botón: confirma lo entendido y da el adelante. Lo que se gasta lo limita cada uno en su cuenta de Claude. */
export async function empezarLaInvestigacion(id: string): Promise<FalloDeViaje | null> {
  const r = await pideALaCasa("POST", `viajes/${id}/empezar`, {});
  return r.estado === 202 ? null : falloDe(r.cuerpo);
}

/** Volver a intentarlo en una investigación parada: solo el paso que la paró, y sigue sola desde ahí. */
export async function reintentarElPaso(id: string): Promise<FalloDeViaje | null> {
  const r = await pideALaCasa("POST", `viajes/${id}/reintentar`, {});
  return r.estado === 202 ? null : falloDe(r.cuerpo);
}

/** Tu confirmación, o tus respuestas: la investigación sigue sola. */
export async function confirmarLoEntendido(id: string, cuerpo: TuConfirmacion): Promise<FalloDeViaje | null> {
  const r = await pideALaCasa("POST", `viajes/${id}/confirmar`, cuerpo);
  return r.estado === 202 ? null : falloDe(r.cuerpo);
}

export type ViajeVivo = {
  /** `undefined` mientras llega; `null` si no lo hay o no es tuyo. */
  estado: EnLaCasa | null | undefined;
  /** Lo que he entendido, como lo guarda la casa. */
  entendido: unknown;
  /** Lo que la casa ha contado de su investigación, en su orden. */
  sucesos: Suceso[];
};

const SIN_VIAJE: ViajeVivo = { estado: undefined, entendido: null, sucesos: [] };
const EN_EL_MAPA = new Set(["on_map", "closed"]);

/**
 * Un viaje de la casa, en vivo: cómo está y lo que se va contando de su investigación. Mientras no está en el mapa
 * se le escucha; cuando llega, se deja de escuchar, y quien lo pinta pide su versión.
 */
export function useViajeVivo(id: string | null): ViajeVivo {
  const [viaje, setViaje] = useState<ViajeVivo>(SIN_VIAJE);
  const enElMapa = EN_EL_MAPA.has(viaje.estado?.trip.state ?? "");

  useEffect(() => {
    setViaje(SIN_VIAJE);
    if (id === null) return;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return setViaje({ ...SIN_VIAJE, estado: null });
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}`).then((r) => {
      if (!vivo) return;
      if (r.estado !== 200) return setViaje({ ...SIN_VIAJE, estado: null });
      const estado = { trip: r.cuerpo.trip, research: r.cuerpo.research ?? null } as EnLaCasa;
      setViaje((v) => ({ ...v, estado, entendido: r.cuerpo.understood ?? null }));
    });
    return () => {
      vivo = false;
    };
  }, [id]);

  const escucha = id !== null && viaje.estado !== undefined && viaje.estado !== null && !enElMapa;
  useEffect(() => {
    if (!escucha || id === null) return;
    const fuente = new EventSource(`/api/house/viajes/${id}/eventos`);
    fuente.addEventListener("state", (e) => {
      let d: { trip?: unknown; research?: unknown; from?: unknown; events?: unknown };
      try {
        d = JSON.parse((e as MessageEvent<string>).data);
      } catch {
        return;
      }
      const desde = typeof d.from === "number" ? d.from : 0;
      const nuevos = Array.isArray(d.events) ? (d.events as Suceso[]) : [];
      setViaje((v) => ({
        ...v,
        estado: { trip: d.trip, research: d.research ?? null } as EnLaCasa,
        // Si se corta y vuelve a conectar, la casa empieza a contar otra vez: lo ya contado no se repite.
        sucesos: desde <= v.sucesos.length ? [...v.sucesos.slice(0, desde), ...nuevos] : v.sucesos,
      }));
    });
    return () => fuente.close();
  }, [escucha, id]);

  return viaje;
}
