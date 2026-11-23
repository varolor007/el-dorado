"use client";

// Lo que la web necesita saber de quien mira: su tema, su idioma, el ancho de su pantalla; y el reproductor de los
// sucesos de una investigación.

import { useEffect, useRef, useState } from "react";
import type { Suceso } from "../../../agent/output/viaje.ts";
import type { Tema } from "./estiloDelMapa.ts";
import { idiomaDe, type Idioma } from "./textos.ts";

function useConsulta(consulta: string): boolean {
  const [vale, setVale] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const mira = (): void => setVale(m.matches);
    mira();
    m.addEventListener("change", mira);
    return () => m.removeEventListener("change", mira);
  }, [consulta]);
  return vale;
}

export function useTema(): Tema {
  return useConsulta("(prefers-color-scheme: dark)") ? "oscuro" : "claro";
}

export function useMovil(): boolean {
  return useConsulta("(max-width: 860px)");
}

/** El alto de la pantalla, para saber cuánto mapa tapa la hoja en el móvil. */
export function useAlto(): number {
  const [alto, setAlto] = useState(800);
  useEffect(() => {
    const mide = (): void => setAlto(window.innerHeight);
    mide();
    window.addEventListener("resize", mide);
    return () => window.removeEventListener("resize", mide);
  }, []);
  return alto;
}

export function useIdioma(): Idioma {
  const [idioma, setIdioma] = useState<Idioma>("en");
  useEffect(() => {
    setIdioma(idiomaDe(new URLSearchParams(window.location.search).get("lang"), navigator.language));
  }, []);
  return idioma;
}

/** La foto de fuera, encogida al ancho que se pida por el servidor de la web. */
export function foto(url: string, ancho: 128 | 256 | 384 | 640 | 1080): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${ancho}&q=72`;
}

export type Reproductor = {
  vistos: Suceso[];
  avance: number;
  acabado: boolean;
  otraVez: () => void;
  alFinal: () => void;
};

/** Va soltando los sucesos de una investigación a su tiempo. Si se pide menos movimiento, los suelta todos de golpe. */
export function useReproductor(sucesos: Suceso[], andando: boolean): Reproductor {
  const [ahora, setAhora] = useState(0);
  const empezo = useRef<number | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const total = sucesos.length === 0 ? 0 : sucesos[sucesos.length - 1].t;

  useEffect(() => {
    if (!andando || total === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAhora(total);
      return;
    }
    empezo.current = null;
    let cuadro = 0;
    const paso = (t: number): void => {
      empezo.current ??= t;
      const pasado = t - empezo.current;
      setAhora(Math.min(pasado, total));
      if (pasado < total) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [andando, total, vuelta]);

  const cuantos = sucesos.filter((s) => s.t <= ahora).length;
  const vistos = sucesos.slice(0, andando ? cuantos : 0);
  return {
    vistos,
    avance: total === 0 ? 0 : ahora / total,
    acabado: andando && ahora >= total && total > 0,
    otraVez: () => {
      setAhora(0);
      setVuelta((n) => n + 1);
    },
    alFinal: () => setAhora(total),
  };
}
