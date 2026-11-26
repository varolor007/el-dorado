"use client";

// Cambios (8.5): cambiar lo que pediste, desde donde estés. Las mismas preguntas de empezar, ya contestadas, para tocar
// solo lo que cambia: tus fechas, quién va (y sus habitaciones), lo que quieres gastar, lo que buscas y lo que te
// importa donde duermes. Antes de rehacer nada, la casa dice el impacto, sin IA; si gasta, se ve antes y se da el
// adelante. Otro destino es un viaje nuevo, y se busca arriba. Y lo que se queda atrás tras un cambio: un cierre o una
// guía de una versión de antes. Todo por claves: ninguna frase de un asiento.

import { useEffect, useMemo, useState } from "react";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import { COSAS_QUE_SE_TOCAN, conElCambio, queTrae, type GustoTocado } from "../../../agent/scripts/cambios.ts";
import { respuestasDeLoEntendido, type Respuestas } from "../../../agent/scripts/empezar.ts";
import { CUANTO_MOVERSE, GASTOS, PESOS_DE_GUSTO, type Entendido } from "../../../agent/scripts/formas.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import type { Textos } from "../lib/textos.ts";
import { DeDonde, QuienesViajan, TODOS_LOS_TOQUES_DE_BUSCAR, toquesDeBuscar, Una } from "./Empezar.tsx";
import { Hoja } from "./Hoja.tsx";
import { ElImpacto } from "./Momentos.tsx";

type Comun = { t: Textos; idioma: string };

/** Un gasto de IA, con sus céntimos, como en el impacto. */
const conCentimos = (usd: number, idioma: string): string =>
  new Intl.NumberFormat(idioma, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(usd);

/** Lo que dice la casa para cambiar lo que pediste: cómo se rehace, de qué lo entendido partes y lo que quedó atrás. */
export type ParaCambiar = {
  mode: "redo" | "again";
  understood: Entendido;
  behind: { closed: number | null; guide: number | null };
};

/** Lo que dice la casa para cambiar un viaje tuyo; null mientras llega, o si ahora no se puede cambiar. */
export function useParaCambiar(id: string | null, clave: unknown): ParaCambiar | null {
  const [para, setPara] = useState<ParaCambiar | null>(null);
  useEffect(() => {
    setPara(null);
    if (id === null) return;
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/cambiar`).then((r) => {
      if (vivo && r.estado === 200) setPara(r.cuerpo as unknown as ParaCambiar);
    });
    return () => {
      vivo = false;
    };
  }, [id, clave]);
  return para;
}

/** Lo que se ha quedado atrás tras un cambio: el cierre de una versión de antes, y la guía hecha con otra. */
export function SeQuedaronAtras({ t, atras }: Comun & { atras: ParaCambiar["behind"] }) {
  if (atras.closed === null && atras.guide === null) return null;
  return (
    <div className="grupo atras">
      {atras.closed !== null && <p className="aviso">{t.cambios.atrasCierre(atras.closed)}</p>}
      {atras.guide !== null && <p className="aviso">{t.cambios.atrasGuia(atras.guide)}</p>}
    </div>
  );
}

/** Los gustos de las cosas del alojamiento, como están en lo entendido: los que no tienes, sin decir. */
const gustosDe = (e: Entendido): Record<string, GustoTocado["weight"] | null> =>
  Object.fromEntries(COSAS_QUE_SE_TOCAN.map((c) => [c, e.tastes.find((g) => g.thing === c)?.weight ?? null]));

/**
 * Cambiar lo que pediste. `para` es lo que dice la casa (`useParaCambiar`). Al dar el adelante, la casa rehace solo
 * lo que deja de valer y se vuelve a la dirección del viaje, que cuenta en vivo lo que se rehace.
 */
export function Cambios({
  t,
  idioma,
  id,
  para,
  alVolver,
}: Comun & { id: string; para: ParaCambiar; alVolver: () => void }) {
  const p = t.preguntas;
  const x = t.empezar;
  const c = t.cambios;
  const antes = para.understood;
  const [r, setR] = useState<Respuestas>(() => respuestasDeLoEntendido(antes, TODOS_LOS_TOQUES_DE_BUSCAR));
  const [pesos, setPesos] = useState(() => gustosDe(antes));
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [deNuevo, setDeNuevo] = useState(false);
  const [siguiente, setSiguiente] = useState<number | null>(null);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const pon = (cambio: Partial<Respuestas>): void => {
    setR((ya) => ({ ...ya, ...cambio }));
    setImpacto(null);
    setDeNuevo(false);
  };
  // Desde una parada por varias bases (?one_place=1): dormir en un solo sitio llega ya marcado.
  const [unSitio, setUnSitio] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("one_place") !== "1") return;
    setR((ya) => ({ ...ya, moverse: { ...ya.moverse, variosSitios: false } }));
    setUnSitio(true);
  }, []);

  const tocados: GustoTocado[] = useMemo(
    () =>
      COSAS_QUE_SE_TOCAN.flatMap((cosa) => {
        const weight = pesos[cosa];
        return weight === null ? [] : [{ thing: cosa, weight, etiqueta: t.escucha.cosas[cosa] ?? cosa }];
      }),
    [pesos, t],
  );
  const despues = useMemo(() => conElCambio(antes, r, TODOS_LOS_TOQUES_DE_BUSCAR, tocados), [antes, r, tocados]);
  const trae = despues.entendido === null ? null : queTrae(antes, despues.entendido);
  const nada = trae !== null && trae.clases.length === 0;

  const dice = (clave: unknown): void => setFallo(c.fallo(typeof clave === "string" ? clave : "other"));

  // Antes de rehacer nada, el impacto: lo dice la casa, sin IA. Con una investigación parada, se empieza otra vez.
  const ver = async (): Promise<void> => {
    if (despues.entendido === null || trae === null || trae.viajeNuevo || nada) return;
    setFallo(null);
    if (para.mode === "again") {
      const g = await pideALaCasa("GET", "cuenta/gasto");
      const next = (g.cuerpo.spend as { next?: { usd: number } | null } | undefined)?.next;
      setSiguiente(next?.usd ?? null);
      setDeNuevo(true);
      return;
    }
    const i = await pideALaCasa("POST", `viajes/${id}/impacto`, { understood: despues.entendido });
    if (i.estado !== 200) return dice(i.cuerpo.error);
    setImpacto(i.cuerpo.impact as Impacto);
  };
  // Tu adelante: la casa lanza lo que se rehace, y la dirección del viaje lo cuenta en vivo.
  const adelante = async (): Promise<void> => {
    if (despues.entendido === null) return;
    setMandando(true);
    setFallo(null);
    const h = await pideALaCasa("POST", `viajes/${id}/cambiar`, { understood: despues.entendido, go_ahead: true });
    if (h.estado === 202) {
      const direccion = new URL(window.location.href);
      direccion.searchParams.set("at", "trip");
      return window.location.assign(direccion);
    }
    setMandando(false);
    dice(h.cuerpo.error);
  };

  const siONo = [
    { valor: true, texto: x.si },
    { valor: false, texto: x.no },
  ];
  const pie =
    impacto !== null || deNuevo ? undefined : (
      <div className="pie-columna">
        <button
          type="button"
          className="boton boton--ancho"
          disabled={despues.entendido === null || nada}
          onClick={() => void ver()}
        >
          {c.ver}
        </button>
        <button type="button" className="enlace" onClick={alVolver}>
          {c.volver}
        </button>
      </div>
    );

  return (
    <Hoja etiqueta={c.rotulo} pie={pie}>
      <div className="cabecera">
        <span className="rotulo">{c.rotulo}</span>
        <h1 className="lugar">{antes.destination.name}</h1>
        <p className="suave">{c.sub}</p>
        {unSitio && (
          <p className="cambios__marcado" role="status">
            {c.unSitio}
          </p>
        )}
      </div>
      <SeQuedaronAtras t={t} idioma={idioma} atras={para.behind} />
      {impacto !== null && (
        <ElImpacto
          t={t}
          idioma={idioma}
          impacto={impacto}
          mandando={mandando}
          alAdelante={() => void adelante()}
          alAhoraNo={() => setImpacto(null)}
        />
      )}
      {deNuevo && (
        <div className="grupo impacto">
          <h2 className="titulo">{t.momentos.impacto}</h2>
          <p className="suave">{c.deNuevo}</p>
          <p className="dato impacto__cuesta">
            {siguiente === null ? t.momentos.noSeSabe : t.momentos.cuesta(conCentimos(siguiente, idioma))}
          </p>
          <div className="pie-columna">
            <button type="button" className="boton boton--ancho" disabled={mandando} onClick={() => void adelante()}>
              {t.momentos.adelante}
            </button>
            <button type="button" className="enlace" onClick={() => setDeNuevo(false)}>
              {t.momentos.ahoraNo}
            </button>
          </div>
        </div>
      )}
      {fallo !== null && (
        <p className="aviso" role="alert">
          {fallo}
        </p>
      )}
      {impacto === null && !deNuevo && (
        <div className="preguntas cambios">
          <div className="toques" role="group" aria-label={c.fechas}>
            <span className="rotulo">{c.fechas}</span>
            <div className="cabecera__linea cambios__fechas">
              <input
                className="campo"
                type="date"
                aria-label={c.entrada}
                value={r.entrada}
                onChange={(e) => pon({ entrada: e.target.value })}
              />
              <span className="dato" aria-hidden="true">
                →
              </span>
              <input
                className="campo"
                type="date"
                aria-label={c.salida}
                value={r.salida}
                min={r.entrada}
                onChange={(e) => pon({ salida: e.target.value })}
              />
            </div>
          </div>
          <Una
            titulo={p.fechas}
            opciones={[
              { valor: false, texto: p.fechasOpciones[0] },
              { valor: true, texto: p.fechasOpciones[1] },
            ]}
            valor={r.fechasMovibles}
            alElegir={(fechasMovibles) => pon({ fechasMovibles })}
          />
          <DeDonde t={t} idioma={idioma} origen={r.origen} alElegir={(origen) => pon({ origen, moneda: r.moneda })} />
          <QuienesViajan t={t} idioma={idioma} r={r} pon={pon} />
          <Una
            titulo={p.gasto}
            opciones={GASTOS.map((valor, i) => ({ valor, texto: p.gastoOpciones[i] }))}
            valor={r.gasto}
            alElegir={(gasto) => pon({ gasto })}
          />
          <div className="toques" role="group" aria-label={p.buscas}>
            <span className="rotulo">{p.buscas}</span>
            <div className="cabecera__linea">
              {p.buscasOpciones.map((o, i) => {
                const suyos = toquesDeBuscar(i);
                const tocado = r.buscas.some((b) => suyos.includes(b));
                const sinEl = r.buscas.filter((b) => !suyos.includes(b));
                return (
                  <button
                    key={o}
                    type="button"
                    className="toque"
                    aria-pressed={tocado}
                    onClick={() => pon({ buscas: tocado ? sinEl : [...sinEl, o] })}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
          {r.destino.clase !== "city" && (
            <>
              <Una
                titulo={x.variosSitios}
                opciones={siONo}
                valor={r.moverse.variosSitios}
                alElegir={(variosSitios) => pon({ moverse: { ...r.moverse, variosSitios } })}
              />
              <Una
                titulo={x.salirDelPais}
                opciones={siONo}
                valor={r.moverse.salirDelPais}
                alElegir={(salirDelPais) => pon({ moverse: { ...r.moverse, salirDelPais } })}
              />
              <Una
                titulo={x.cuanto}
                opciones={CUANTO_MOVERSE.map((valor) => ({ valor, texto: x.cuantoOpciones[valor] }))}
                valor={r.moverse.cuanto}
                alElegir={(cuanto) => pon({ moverse: { ...r.moverse, cuanto } })}
              />
            </>
          )}
          <div className="toques">
            <h2 className="titulo">{c.gustos}</h2>
            <p className="dato">{c.gustosSub}</p>
            {COSAS_QUE_SE_TOCAN.map((cosa) => (
              <Una
                key={cosa}
                titulo={t.escucha.cosas[cosa] ?? cosa}
                opciones={PESOS_DE_GUSTO.map((valor) => ({ valor, texto: t.escucha.pesos[valor] ?? valor }))}
                valor={pesos[cosa]}
                alElegir={(peso) => {
                  setPesos((ya) => ({ ...ya, [cosa]: peso }));
                  setImpacto(null);
                }}
              />
            ))}
          </div>
          <p className="dato">{c.destino}</p>
          <div className="toques" aria-live="polite">
            {trae !== null && trae.clases.length > 0 && (
              <p className="suave">{c.loQueCambia(trae.clases.map((k) => t.momentos.cambios[k] ?? k).join(", "))}</p>
            )}
            {nada && <p className="dato">{c.nadaCambia}</p>}
            {despues.falta.length > 0 && (
              <div className="aviso">
                <div>
                  {x.falta}
                  <ul className="aviso__lista">
                    {despues.falta.map((campo) => (
                      <li key={campo}>{x.faltas[campo] ?? campo}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Hoja>
  );
}
