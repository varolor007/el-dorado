"use client";

// Tu confirmación (5.2): lo que he entendido de lo que escribiste, en corto. Cada gusto y cada límite, con tus
// palabras; lo que no encaja; y, si hace falta, unas preguntas. Lo confirmas tal cual, lo corriges (quitas un gusto o
// un límite, le cambias el peso a un gusto) o contestas. De lo que escribe la IA solo se enseña la pregunta: lo demás
// son tus palabras y claves que la web dice en tu idioma.

import { useState } from "react";
import type { Textos } from "../lib/textos.ts";
import { confirmarLoEntendido, type LoEscuchado } from "../lib/viajeVivo.ts";

const PESOS = ["must", "like", "indifferent"] as const;

type Props = { t: Textos; viaje: string; escuchado: LoEscuchado };

export function Confirmacion({ t, viaje, escuchado }: Props) {
  const x = t.escucha;
  const [pesos, setPesos] = useState<string[]>(escuchado.tastes.map((g) => g.weight));
  const [sinGusto, setSinGusto] = useState<Set<number>>(new Set());
  const [sinLimite, setSinLimite] = useState<Set<number>>(new Set());
  const [respuestas, setRespuestas] = useState<string[]>(escuchado.questions.map(() => ""));
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const contestadas = respuestas.flatMap((r, i) => (r.trim() === "" ? [] : [{ i, answer: r }]));
  const contesta = escuchado.can_answer && contestadas.length > 0;
  const nada = escuchado.tastes.length + escuchado.limits.length + escuchado.booked.length === 0;

  const cambia = (de: Set<number>, i: number): Set<number> => {
    const otro = new Set(de);
    if (otro.has(i)) otro.delete(i);
    else otro.add(i);
    return otro;
  };

  const manda = async (): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const mal = await confirmarLoEntendido(
      viaje,
      contesta
        ? { answers: contestadas }
        : {
            tastes: pesos.flatMap((weight, i) => (sinGusto.has(i) ? [] : [{ i, weight }])),
            limits: escuchado.limits.flatMap((_, i) => (sinLimite.has(i) ? [] : [i])),
          },
    );
    setOcupado(false);
    if (mal !== null) setFallo(t.empezar.fallo(mal.clave, []));
  };

  return (
    <section className="confirmar" aria-labelledby="lo-entendido" style={{ quotes: x.comillas }}>
      <h2 className="titulo" id="lo-entendido">
        {x.titulo}
      </h2>
      <p className="suave">{escuchado.round > 1 ? x.otraVuelta : x.sub}</p>

      {nada && <p className="dato">{x.nadaQueSeparar}</p>}

      {escuchado.tastes.length > 0 && (
        <div className="toques">
          <span className="rotulo">{x.gustos}</span>
          <ul className="confirmar__lista">
            {escuchado.tastes.map((g, i) => {
              const fuera = sinGusto.has(i);
              return (
                <li key={i} className={fuera ? "confirmar__cosa confirmar__cosa--fuera" : "confirmar__cosa"}>
                  <p>
                    {g.thing !== null && <b>{x.cosas[g.thing] ?? g.thing}: </b>}
                    <q>{g.quote}</q>
                  </p>
                  {fuera ? (
                    <p className="dato">{x.quitado}</p>
                  ) : (
                    <div className="cabecera__linea" role="group" aria-label={`${x.peso}: ${g.quote}`}>
                      {PESOS.map((peso) => (
                        <button
                          key={peso}
                          type="button"
                          className="toque"
                          aria-pressed={pesos[i] === peso}
                          disabled={contesta}
                          onClick={() => setPesos(pesos.map((p, j) => (j === i ? peso : p)))}
                        >
                          {x.pesos[peso]}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="confirmar__quitar"
                    disabled={contesta}
                    onClick={() => setSinGusto(cambia(sinGusto, i))}
                  >
                    {fuera ? x.devolver : x.quitar}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {escuchado.limits.length > 0 && (
        <div className="toques">
          <span className="rotulo">{x.limites}</span>
          <ul className="confirmar__lista">
            {escuchado.limits.map((l, i) => {
              const fuera = sinLimite.has(i);
              return (
                <li key={i} className={fuera ? "confirmar__cosa confirmar__cosa--fuera" : "confirmar__cosa"}>
                  <p>
                    <q>{l.quote}</q>
                  </p>
                  {fuera && <p className="dato">{x.quitado}</p>}
                  <button
                    type="button"
                    className="confirmar__quitar"
                    disabled={contesta}
                    onClick={() => setSinLimite(cambia(sinLimite, i))}
                  >
                    {fuera ? x.devolver : x.quitar}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {escuchado.booked.length > 0 && (
        <div className="toques">
          <span className="rotulo">{x.reservado}</span>
          <ul className="confirmar__lista">
            {escuchado.booked.map((b, i) => (
              <li key={i} className="confirmar__cosa">
                <p>
                  <q>{b.quote}</q>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="toques">
        <span className="rotulo">{x.choca}</span>
        {escuchado.clashes.length === 0 ? (
          <p className="dato">{x.nadaChoca}</p>
        ) : (
          <ul className="confirmar__lista">
            {escuchado.clashes.map((c, i) => (
              <li key={i} className="confirmar__cosa confirmar__cosa--choca">
                <p>
                  <q>{c.quote}</q>{" "}
                  {c.with === "words" ? x.noCasaCon(c.other_quote) : x.noCasa(x.conQue[c.with] ?? c.with)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {escuchado.can_answer && escuchado.questions.length > 0 && (
        <div className="toques">
          <span className="rotulo">{x.preguntas}</span>
          <p className="dato">{x.preguntasSub}</p>
          {escuchado.questions.map((q, i) => (
            <label key={i} className="confirmar__pregunta">
              <span>
                <q>{q.quote}</q> {q.ask}
              </span>
              <input
                className="campo"
                type="text"
                autoComplete="off"
                maxLength={300}
                placeholder={x.tuRespuesta}
                value={respuestas[i]}
                onChange={(e) => setRespuestas(respuestas.map((r, j) => (j === i ? e.target.value : r)))}
              />
            </label>
          ))}
        </div>
      )}

      <button type="button" className="boton boton--ancho" disabled={ocupado} onClick={() => void manda()}>
        {ocupado ? x.enviando : contesta ? x.contestar : x.confirmar}
      </button>
      {fallo !== null && (
        <p className="aviso" role="alert">
          {fallo}
        </p>
      )}
    </section>
  );
}
