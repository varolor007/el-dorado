"use client";

// Las entradas en el día a día (14.7): por qué no se miró la de una parada, y tu botón para mirar las que no se
// miraron. Antes de tu botón ves lo que costaría (la pieza del impacto del 8.1); con él, la casa mira solo esas, con
// la puerta 13, y deja una versión nueva. Todo por claves.

import { useState } from "react";
import type { SinMirar as PorQue } from "../../../agent/data/capas.ts";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import type { Textos } from "../lib/textos.ts";
import { ElImpacto } from "./Momentos.tsx";

/** Por qué solo se sabe lo que dicen los datos abiertos de una parada; sin porqué, lo de antes. */
export function SinMirar({ t, porQue }: { t: Textos; porQue: PorQue | null }) {
  return <p className="credito">{porQue === null ? t.alli.soloAbiertos : t.diaADia.sinMirar[porQue]}</p>;
}

/** Tu botón para mirar las entradas de las paradas que no se miraron: lo que costaría, y con tu adelante, a ello. */
export function MirarLasEntradas({
  t,
  idioma,
  id,
  cuantas,
}: {
  t: Textos;
  idioma: string;
  id: string;
  cuantas: number;
}) {
  const d = t.diaADia;
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [enMarcha, setEnMarcha] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const pide = async (go: boolean): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/entradas`, go ? { go: true } : {});
    setOcupado(false);
    if (r.estado === 200 && !go) return setImpacto(r.cuerpo.impact as Impacto);
    if (r.estado === 202) {
      setImpacto(null);
      return setEnMarcha(true);
    }
    setFallo(typeof r.cuerpo.error === "string" ? r.cuerpo.error : "");
  };

  if (enMarcha)
    return (
      <div className="grupo" role="status">
        <p className="dato">{d.mirandoEntradas}</p>
        <button type="button" className="enlace" onClick={() => window.location.reload()}>
          {d.verlasEntradas}
        </button>
      </div>
    );
  return (
    <div className="grupo">
      {impacto === null ? (
        <div className="mensaje__pie">
          <span className="dato">{d.mirarEntradas(cuantas)}</span>
          <button type="button" className="boton" disabled={ocupado} onClick={() => void pide(false)}>
            {ocupado ? d.mirando : d.mirarEntradasBoton}
          </button>
        </div>
      ) : (
        <ElImpacto
          t={t}
          idioma={idioma}
          impacto={impacto}
          mandando={ocupado}
          alAdelante={() => void pide(true)}
          alAhoraNo={() => setImpacto(null)}
        />
      )}
      {fallo !== null && <p className="aviso">{d.fallo(fallo)}</p>}
    </div>
  );
}
