"use client";

// Tus elecciones sobre un viaje tuyo en el mapa, guardadas en la casa: se leen al abrirlo y se guardan al cambiarlas,
// para que vuelvan al recargar. Elegir no gasta ni deja versión. Y las versiones que ha tenido tu viaje, con volver
// a una de antes.

import { useEffect, useRef, useState } from "react";
import type { Elecciones } from "../../../agent/scripts/elecciones.ts";
import { pideALaCasa } from "./cuenta.ts";

/** Lo que se tarda en guardar después de tu último toque: varios toques seguidos son un solo guardado. */
const ESPERA_AL_GUARDAR_MS = 600;

export type Guardado = "no" | "guardando" | "guardado" | "fallo";

/**
 * Lee tus elecciones de un viaje tuyo en el mapa (`id` y su `version`), y devuelve con qué guardarlas. Sin viaje
 * tuyo, o sin casa, no hace nada: `leidas` se queda en null.
 */
export function useTusElecciones(
  id: string | null,
  version: number | null,
): { leidas: Elecciones | null; guardar: (e: Elecciones) => void; guardado: Guardado } {
  const [leidas, setLeidas] = useState<Elecciones | null>(null);
  const [guardado, setGuardado] = useState<Guardado>("no");
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setLeidas(null);
    if (id === null || version === null) return;
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/elecciones`).then((r) => {
      if (vivo && r.estado === 200 && r.cuerpo.version === version) setLeidas(r.cuerpo.choices as Elecciones);
    });
    return () => {
      vivo = false;
      // Lo que esperaba a guardarse era de esta versión: al cambiar de versión no se manda.
      if (reloj.current !== null) clearTimeout(reloj.current);
      reloj.current = null;
    };
  }, [id, version]);
  const guardar = (e: Elecciones): void => {
    if (id === null || version === null) return;
    if (reloj.current !== null) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => {
      reloj.current = null;
      setGuardado("guardando");
      // Con la versión que se ve: si la casa ya enseña otra, no lo guarda encima de ella.
      void pideALaCasa("PUT", `viajes/${id}/elecciones`, { version, choices: e }).then((r) =>
        setGuardado(r.estado === 200 ? "guardado" : "fallo"),
      );
    }, ESPERA_AL_GUARDAR_MS);
  };
  return { leidas, guardar, guardado };
}

/** Una versión de tu viaje, como la dice la casa: cuándo, por qué, de cuál salió y si es la que ves. */
export type VersionDeTuViaje = {
  n: number;
  when: string;
  why: "first" | "change" | "closed";
  from: number | null;
  changes: string[];
  shown: boolean;
};

/** Las versiones de un viaje tuyo; null mientras llegan o si no las hay. */
export function useVersiones(id: string | null, version: number | null): VersionDeTuViaje[] | null {
  const [versiones, setVersiones] = useState<VersionDeTuViaje[] | null>(null);
  useEffect(() => {
    if (id === null) return setVersiones(null);
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/versiones`).then((r) => {
      if (vivo && r.estado === 200) setVersiones(r.cuerpo.versions as VersionDeTuViaje[]);
    });
    return () => {
      vivo = false;
    };
  }, [id, version]);
  return versiones;
}
