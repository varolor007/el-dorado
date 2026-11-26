"use client";

// El carrusel, visto desde el navegador: las cartas que da la casa para mirar mientras trabaja la IA (el PM, 26-nov).
// Se piden mientras se trabaja y hasta que hay alguna: llegan en cuanto la investigación tiene sus sitios.

import { useEffect, useState } from "react";
import { cartasQueValen, type Carta } from "../../../agent/scripts/carrusel.ts";
import { pideALaCasa } from "./cuenta.ts";

/** Cada cuánto se vuelven a pedir mientras aún no hay ninguna, en milisegundos. */
const CADA = 15_000;

export function useCarrusel(viaje: string | null, activo: boolean): Carta[] {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const hay = cartas.length > 0;
  useEffect(() => {
    if (viaje === null || !activo || hay) return;
    let vivo = true;
    const pide = async (): Promise<void> => {
      const r = await pideALaCasa("GET", `viajes/${viaje}/carrusel`);
      // Lo que llega se vuelve a mirar aquí: solo cartas con su forma, con fotos y enlaces https.
      if (vivo && r.estado === 200) setCartas(cartasQueValen({ cartas: r.cuerpo.cards }));
    };
    void pide();
    const reloj = setInterval(() => void pide(), CADA);
    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, [viaje, activo, hay]);
  return cartas;
}
