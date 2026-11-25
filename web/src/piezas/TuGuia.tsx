"use client";

// El paso a tu guía desde tu viaje: solo con el viaje cerrado, y con la manera que tienes marcada.

import Link from "next/link";
import { TEXTOS, type Idioma } from "../lib/textos.ts";

export function ATuGuia({ viaje, manera, idioma }: { viaje: string; manera: string | null; idioma: Idioma }) {
  const t = TEXTOS[idioma];
  const consulta = new URLSearchParams({ trip: viaje, ...(manera === null ? {} : { way: manera }) });
  return (
    <Link className="a-tu-guia" href={`/guide?${consulta.toString()}`}>
      <span className="rotulo">{t.guia.abrir}</span>
      <span className="suave">{t.guia.abrirTexto}</span>
      <span className="enlace" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
