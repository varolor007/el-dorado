"use client";

// Lo común del viaje a ratos (8.1). Las versiones de tu viaje, con volver a una de antes; y el impacto de un cambio,
// antes de rehacer nada: qué deja de valer, qué se rehace y cómo, qué se queda y lo que costaría, con tu adelante si
// gasta. Lo usan los momentos que cambian algo (el alojamiento, el transporte, el día a día y los cambios). Todo por
// claves y números: ninguna frase de un asiento, ni su nombre.

import { useEffect, useState } from "react";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import type { VersionDeTuViaje } from "../lib/elecciones.ts";
import { diaCorto } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";

type Comun = { t: Textos; idioma: string };

/** Un gasto de IA, con sus céntimos: suele ser de unos pocos dólares o menos. */
const conCentimos = (usd: number, moneda: string, idioma: string): string =>
  new Intl.NumberFormat(idioma, { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(usd);

/**
 * Las versiones de tu viaje: cuándo y por qué salió cada una, y volver a una de antes. Volver no borra ninguna: la
 * casa pasa a enseñar esa, y se recarga el viaje.
 */
export function TusVersiones({ t, idioma, id, versiones }: Comun & { id: string; versiones: VersionDeTuViaje[] }) {
  const [volviendo, setVolviendo] = useState<number | null>(null);
  const [fallo, setFallo] = useState(false);
  const vuelve = async (n: number): Promise<void> => {
    setVolviendo(n);
    setFallo(false);
    const r = await pideALaCasa("POST", `viajes/${id}/volver`, { version: n });
    if (r.estado === 200) return window.location.reload();
    setVolviendo(null);
    setFallo(true);
  };
  const m = t.momentos;
  return (
    <div className="grupo versiones">
      <h2 className="titulo">{m.versiones}</h2>
      <ol className="versiones__lista">
        {[...versiones].reverse().map((v) => (
          <li key={v.n} className="versiones__una" data-vista={v.shown}>
            <div>
              <b>{m.version(v.n)}</b>
              <span className="dato">
                {[
                  diaCorto(v.when.slice(0, 10), idioma),
                  m.porQue[v.why] ?? v.why,
                  ...v.changes.map((c) => m.cambios[c] ?? c),
                  ...(v.from === null ? [] : [m.deLa(v.from)]),
                ].join(", ")}
              </span>
            </div>
            {v.shown ? (
              <span className="pastilla">{m.laQueVes}</span>
            ) : (
              <button type="button" className="enlace" disabled={volviendo !== null} onClick={() => void vuelve(v.n)}>
                {volviendo === v.n ? m.volviendo : m.volver}
              </button>
            )}
          </li>
        ))}
      </ol>
      {fallo && <p className="aviso">{m.noVuelve}</p>}
    </div>
  );
}

/**
 * Tu último cambio se paró sin dar su versión: tu viaje sigue como estaba, y se dice. Volver a intentarlo repite
 * solo el paso que se paró, y gasta: se dice antes. Dejarlo lo quita de la vista en este navegador; el cambio parado
 * se queda en la casa, y otro cambio parte de la versión que ves.
 */
export function TuCambioParado({
  t,
  id,
  cambio,
  sePuede,
}: Comun & { id: string; cambio: { run: number; changes: string[] }; sePuede: boolean }) {
  const clave = `eldorado:cambio-parado:${id}:${cambio.run}`;
  const [dejado, setDejado] = useState(true);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    try {
      setDejado(window.localStorage.getItem(clave) === "1");
    } catch {
      setDejado(false);
    }
  }, [clave]);
  if (dejado) return null;
  const m = t.momentos;
  const deja = (): void => {
    setDejado(true);
    try {
      window.localStorage.setItem(clave, "1");
    } catch {
      // Sin almacén, se deja solo mientras dure la página.
    }
  };
  const otraVez = async (): Promise<void> => {
    setMandando(true);
    setFallo(false);
    const r = await pideALaCasa("POST", `viajes/${id}/reintentar`);
    // Con el reintento en marcha, el viaje vuelve a investigar: se recarga, y la página lo sigue en vivo.
    if (r.estado === 202) return window.location.reload();
    setMandando(false);
    setFallo(true);
  };
  return (
    <div className="grupo cambio-parado" role="status">
      <h2 className="titulo">{m.parado.titulo}</h2>
      <p className="suave">{m.parado.texto(cambio.changes.map((c) => m.cambios[c] ?? c).join(", "))}</p>
      <p className="dato">{sePuede ? m.parado.gasta : m.parado.otraVezNo}</p>
      <div className="pie-columna">
        {sePuede && (
          <button type="button" className="boton boton--ancho" disabled={mandando} onClick={() => void otraVez()}>
            {mandando ? m.parado.mandando : m.parado.otraVez}
          </button>
        )}
        <button type="button" className="enlace" disabled={mandando} onClick={deja}>
          {m.parado.dejar}
        </button>
      </div>
      {fallo && <p className="aviso">{m.parado.fallo}</p>}
    </div>
  );
}

/**
 * El impacto de un cambio, antes de rehacerlo. Si rehacerlo gasta IA, se dice antes y se pide tu adelante; si no,
 * se rehace con un toque. Lo que costaría es una estimación de lo que han gastado tus viajes, o se dice que no se sabe;
 * y si hay algo que quizá haya que rehacer con IA, también lo más que puede costar.
 * `alAdelante` es lo que hace el momento que lo enseña al pulsar; sin él, no hay botón.
 */
export function ElImpacto({
  t,
  idioma,
  impacto,
  moneda = "USD",
  alAdelante,
  alAhoraNo,
  mandando = false,
}: Comun & {
  impacto: Impacto;
  moneda?: string;
  alAdelante?: () => void;
  alAhoraNo?: () => void;
  mandando?: boolean;
}) {
  const m = t.momentos;
  // Lo entendido se queda siempre: no se dice.
  const seQueda = impacto.keep.filter((x) => x !== "understood");
  const fichas = (cosas: string[]) => (
    <ul className="impacto__fichas">
      {cosas.map((c) => (
        <li key={c} className="pastilla">
          {c}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="grupo impacto">
      <h2 className="titulo">{m.impacto}</h2>
      {impacto.changes.length > 0 && (
        <p className="suave">{impacto.changes.map((c) => m.cambios[c] ?? c).join(", ")}</p>
      )}
      {impacto.pieces.length > 0 && (
        <>
          <span className="rotulo">{m.dejaDeValer}</span>
          {fichas(impacto.pieces.map((p) => m.piezas[p] ?? p))}
        </>
      )}
      <span className="rotulo">{m.seRehace}</span>
      <ul className="impacto__lista">
        {impacto.redo.map((x) => (
          <li key={x.step}>
            <span>{m.pasos[x.step] ?? x.step}</span>
            <span className="dato">{x.who === "code" ? m.sinIA : m.conIA}</span>
          </li>
        ))}
      </ul>
      {impacto.maybe.length > 0 && (
        <>
          <span className="rotulo">{m.quizas}</span>
          {fichas(impacto.maybe.map((x) => m.pasos[x.step] ?? x.step))}
        </>
      )}
      {seQueda.length > 0 && (
        <>
          <span className="rotulo">{m.seQueda}</span>
          {fichas(seQueda.map((x) => m.pasos[x] ?? x))}
        </>
      )}
      <p className="dato impacto__cuesta">
        {!impacto.spends
          ? impacto.most === undefined
            ? m.noGasta
            : m.noGastaSeguro
          : impacto.cost.usd === null
            ? m.noSeSabe
            : m.cuesta(conCentimos(impacto.cost.usd, moneda, idioma))}
      </p>
      {impacto.maybe.length > 0 && impacto.most !== undefined && (
        <p className="dato impacto__cuesta impacto__hasta">
          {impacto.most.usd === null ? m.hastaNoSeSabe : m.hasta(conCentimos(impacto.most.usd, moneda, idioma))}
        </p>
      )}
      {(alAdelante !== undefined || alAhoraNo !== undefined) && (
        <div className="pie-columna">
          {alAdelante !== undefined && (
            <button type="button" className="boton boton--ancho" disabled={mandando} onClick={alAdelante}>
              {impacto.spends ? m.adelante : m.rehacer}
            </button>
          )}
          {alAhoraNo !== undefined && (
            <button type="button" className="enlace" onClick={alAhoraNo}>
              {m.ahoraNo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
