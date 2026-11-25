"use client";

// Tu guía, vista desde el navegador: cómo está la de un viaje tuyo, pedirla y traer su documento. Todo pasa por la
// web hasta la casa, con tu sesión; aquí no se guarda nada.

import { useCallback, useEffect, useState } from "react";
import { pideALaCasa } from "./cuenta.ts";

/** Cómo está la última guía de un viaje, como la cuenta la casa. */
export type GuiaDeLaCasa = {
  n: number;
  state: "working" | "ready" | "stopped";
  version: number;
  behind: boolean;
  asked: string;
  made: string | null;
  way: string | null;
};

/** Cada cuánto se mira una guía que se está escribiendo. */
const CADA_MS = 3000;

/**
 * La guía de un viaje tuyo y cómo está el viaje. `undefined` mientras llega; `null` en `guia` si nunca se pidió.
 * Mientras se escribe, se vuelve a mirar sola; `mira` la vuelve a pedir ahora.
 */
export function useGuia(id: string | null): {
  estado: string | null | undefined;
  guia: GuiaDeLaCasa | null | undefined;
  mira: () => void;
} {
  const [estado, setEstado] = useState<string | null | undefined>(undefined);
  const [guia, setGuia] = useState<GuiaDeLaCasa | null | undefined>(undefined);
  const [vez, setVez] = useState(0);
  const mira = useCallback(() => setVez((v) => v + 1), []);
  useEffect(() => {
    if (id === null || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
      setEstado(null);
      setGuia(null);
      return;
    }
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const una = async (): Promise<void> => {
      const [viaje, suya] = await Promise.all([
        pideALaCasa("GET", `viajes/${id}`),
        pideALaCasa("GET", `viajes/${id}/guia`),
      ]);
      if (!vivo) return;
      const trip = viaje.cuerpo.trip as { state?: string } | undefined;
      setEstado(viaje.estado === 200 && typeof trip?.state === "string" ? trip.state : null);
      const g = suya.estado === 200 ? ((suya.cuerpo.guide as GuiaDeLaCasa | null) ?? null) : null;
      setGuia(g);
      if (g?.state === "working") reloj = setTimeout(() => void una(), CADA_MS);
    };
    void una();
    return () => {
      vivo = false;
      clearTimeout(reloj);
    };
  }, [id, vez]);
  return { estado, guia, mira };
}

/** «Quiero mi guía»: con la manera que hace el viaje. Devuelve la clave del fallo, o null si se pidió. */
export async function pedirGuia(id: string, manera: string | null): Promise<string | null> {
  const r = await pideALaCasa("POST", `viajes/${id}/guia`, manera === null ? {} : { way: manera });
  return r.estado === 202 ? null : typeof r.cuerpo.error === "string" ? r.cuerpo.error : "other";
}

/** El documento de la guía hecha: la página entera, o null si no está. */
export function useDocumento(id: string | null, n: number | null): string | null | undefined {
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setHtml(undefined);
    if (id === null || n === null) return setHtml(null);
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/guia/documento`).then((r) => {
      if (vivo) setHtml(r.estado === 200 && typeof r.cuerpo.html === "string" ? r.cuerpo.html : null);
    });
    return () => {
      vivo = false;
    };
  }, [id, n]);
  return html;
}
