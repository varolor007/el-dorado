"use client";

// Tu mensaje para tus días (8.6): lo escribes con tus palabras, ves antes lo que cambia y lo que costaría (la pieza
// del impacto del 8.1), y con tu botón la casa vuelve a elegir tus sitios con lo que has dicho. Mientras trabaja se
// dice; al acabar, lo que cambió y por qué, que llega de la casa solo si pasó su puerta de palabras, y el paso a tus
// días nuevos. Todo lo demás, por claves.

import { useEffect, useState } from "react";
import { LARGO_DE_UN_MENSAJE } from "../../../agent/data/dia_a_dia.ts";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import { loQueSeEnsena } from "../lib/diaADia.ts";
import type { Textos } from "../lib/textos.ts";
import { ElImpacto } from "./Momentos.tsx";

type Comun = { t: Textos; idioma: string };

/** Cómo va tu último mensaje, como lo dice la casa. */
type TuMensajeEnLaCasa = {
  run: number;
  said: string;
  day: number | null;
  from: number;
  version: number | null;
  state: "working" | "done" | "stopped";
  looked_for: string[];
  found: number;
  changed: string | null;
};

/** Cada cuánto se pregunta a la casa mientras trabaja en tu mensaje. */
const CADA_MS = 4000;

export function TuMensaje({
  t,
  idioma,
  id,
  dia,
  version,
}: Comun & { id: string; dia: number | null; version: number | null }) {
  const d = t.diaADia;
  const [texto, setTexto] = useState("");
  const [impacto, setImpacto] = useState<{ impact: Impacto; lookFor: string[] } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [enLaCasa, setEnLaCasa] = useState<TuMensajeEnLaCasa | null>(null);
  const [visto, setVisto] = useState(false);

  // Cómo va tu último mensaje: al abrir, y cada poco mientras se trabaja en él.
  useEffect(() => {
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout> | null = null;
    const mira = async (): Promise<void> => {
      const r = await pideALaCasa("GET", `viajes/${id}/dia`);
      if (!vivo) return;
      const m = r.estado === 200 ? ((r.cuerpo.message as TuMensajeEnLaCasa | null) ?? null) : null;
      setEnLaCasa(m);
      if (m?.state === "working") reloj = setTimeout(() => void mira(), CADA_MS);
    };
    void mira();
    return () => {
      vivo = false;
      if (reloj !== null) clearTimeout(reloj);
    };
  }, [id, ocupado]);

  const pide = async (go: boolean): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/dia`, { said: texto, day: dia, ...(go ? { go: true } : {}) });
    setOcupado(false);
    if (r.estado === 200 && !go)
      return setImpacto({ impact: r.cuerpo.impact as Impacto, lookFor: (r.cuerpo.look_for as string[]) ?? [] });
    if (r.estado === 202) {
      setImpacto(null);
      setTexto("");
      setVisto(false);
      return;
    }
    setFallo(typeof r.cuerpo.error === "string" ? r.cuerpo.error : "");
  };

  // Tu último mensaje, si es de esta versión o acaba de dejar otra: lo que cambió y el paso a verlo.
  const { trabajando, acabado, nuevo, parado } = loQueSeEnsena(enLaCasa, version, visto);

  return (
    <div className="grupo mensaje">
      {trabajando && enLaCasa !== null && (
        <div className="mensaje__estado" role="status">
          <span className="mensaje__pulso" aria-hidden="true" />
          <span>
            <b>{d.trabajando}</b>
            <span className="dato">{d.dijiste(enLaCasa.said)}</span>
          </span>
        </div>
      )}
      {(acabado || nuevo) && enLaCasa !== null && (
        <div className="mensaje__hecho" role="status">
          <span className="rotulo">{d.hecho}</span>
          <span className="dato">{d.dijiste(enLaCasa.said)}</span>
          <span className="rotulo">{d.loQueCambio}</span>
          <p>{enLaCasa.changed ?? d.sinFrase}</p>
          {nuevo ? (
            <button type="button" className="boton" onClick={() => window.location.reload()}>
              {d.verlos}
            </button>
          ) : (
            <button type="button" className="enlace" onClick={() => setVisto(true)}>
              {d.otraVez}
            </button>
          )}
        </div>
      )}
      {parado && (
        <p className="aviso">
          {d.parado}{" "}
          <button type="button" className="enlace" onClick={() => setVisto(true)}>
            {d.otraVez}
          </button>
        </p>
      )}

      {!trabajando && !nuevo && !acabado && impacto === null && (
        <>
          <label className="rotulo" htmlFor="tu-mensaje">
            {d.escribe}
          </label>
          <textarea
            id="tu-mensaje"
            className="campo mensaje__caja"
            rows={2}
            maxLength={LARGO_DE_UN_MENSAJE}
            placeholder={d.ejemplo}
            value={texto}
            disabled={ocupado}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="mensaje__pie">
            <span className="dato">{dia === null ? d.paraTodos : d.paraEsteDia(dia + 1)}</span>
            <button
              type="button"
              className="boton"
              disabled={ocupado || texto.trim() === ""}
              onClick={() => void pide(false)}
            >
              {ocupado ? d.mirando : d.mirar}
            </button>
          </div>
        </>
      )}
      {impacto !== null && (
        <>
          {impacto.lookFor.length > 0 && (
            <p className="suave">{d.buscara(impacto.lookFor.map((c) => d.clases[c] ?? c).join(", "))}</p>
          )}
          <ElImpacto
            t={t}
            idioma={idioma}
            impacto={impacto.impact}
            mandando={ocupado}
            alAdelante={() => void pide(true)}
            alAhoraNo={() => setImpacto(null)}
          />
        </>
      )}
      {fallo !== null && <p className="aviso">{d.fallo(fallo)}</p>}
    </div>
  );
}
