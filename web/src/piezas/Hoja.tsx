"use client";

// La hoja: lo que acompaña al mapa. Al lado en una pantalla ancha; en el móvil sube desde abajo y se recoge con su asa.

import { useState, type ReactNode } from "react";

type Props = { children: ReactNode; pie?: ReactNode; corta?: boolean; etiqueta: string };

export function Hoja({ children, pie, corta, etiqueta }: Props) {
  const [recogida, setRecogida] = useState(false);
  return (
    <section className={corta ? "hoja hoja--corta" : "hoja"} data-recogida={recogida} aria-label={etiqueta}>
      <button
        type="button"
        className="hoja__asa"
        aria-label={etiqueta}
        aria-expanded={!recogida}
        onClick={() => setRecogida((r) => !r)}
      />
      <div className="hoja__cuerpo">{children}</div>
      {pie !== undefined && <div className="hoja__pie">{pie}</div>}
    </section>
  );
}
