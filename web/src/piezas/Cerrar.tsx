"use client";

// Cerrar el viaje (el momento 7 de la hoja): el botón «me quedo con este», lo que pasa mientras la casa vuelve a pedir
// cada precio, la pregunta si uno ha subido mucho, y la pestaña de un viaje cerrado: lo que cambió de precio, el
// orden de las reservas, los plazos de los papeles, lo que queda sin confirmar y dónde se reserva cada cosa. Todo por
// claves y números; la única frase que viene de fuera es la del que explica, que ya pasó la puerta 7.

import { useEffect, useRef, useState } from "react";
import type { Cierre, Dia, Manera, Ritmo, Viaje } from "../../../agent/output/viaje.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import { diaCorto, dinero } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";

type Comun = { t: Textos; idioma: string };

/** Lo que dice la casa de un cierre: por dónde va y, si espera tu sí, lo que cambió. */
type DelCierre = {
  n: number;
  stage: string;
  running: boolean;
  /** La versión del viaje que se cerraba: solo se sigue el cierre de la que se enseña. */
  version?: number | null;
  prices?: {
    piece: string;
    ref: string;
    seen: number;
    today: number | null;
    change: string;
    difference: number | null;
    currency: string;
  }[];
  total?: { antes: number; hoy: number | null };
};

/** Un cierre que ya no trabaja: espera tu sí, está hecho, o se paró. Uno a medias que no corre, se paró. */
const parado = (c: DelCierre): boolean => !c.running && c.stage !== "yours" && c.stage !== "done";

/** El nombre de una pieza, como se enseña: el del alojamiento, o de dónde a dónde va el transporte. */
function nombreDe(viaje: Viaje, ref: string): string {
  const a = viaje.alojamientos.find((x) => x.id === ref);
  if (a !== undefined) return a.nombre;
  const t = viaje.transportes.find((x) => x.id === ref);
  if (t !== undefined) return `${t.de} → ${t.a}`;
  return viaje.paradas.find((p) => p.id === ref)?.nombre ?? ref;
}

/** Cómo ha cambiado un precio, dicho: sube o baja tanto, igual, o sin precio hoy. */
function cambioDicho(t: Textos, idioma: string, cambio: string, diferencia: number | null, moneda: string): string {
  return t.cerrar.cambio(cambio, diferencia === null ? "" : dinero(Math.abs(diferencia), moneda, idioma));
}

/**
 * «Me quedo con este»: cierra el viaje con la manera elegida. Mientras la casa trabaja, se dice por dónde va; si un
 * precio ha subido mucho, se pregunta; al acabar, se vuelve a pedir el viaje, que ya es el cerrado. Solo se sigue un
 * cierre de la versión que se enseña, y solo se recarga la página tras uno que se lanzó desde ella.
 */
export function MeQuedo({
  t,
  idioma,
  viaje,
  id,
  manera,
  dias,
  ritmo,
  version,
}: Comun & {
  viaje: Viaje;
  id: string;
  /** La versión del viaje que se enseña. */
  version: number | null;
  manera: Manera["id"];
  /** Los días como los tienes delante, con tu ritmo: es tu viaje el que se cierra. */
  dias: Dia[];
  ritmo: Ritmo;
}) {
  const [cierre, setCierre] = useState<DelCierre | null>(null);
  const [fallo, setFallo] = useState<"no" | "fallo" | "muchos">("no");
  const [mandando, setMandando] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Si el cierre que se sigue se lanzó desde esta página: solo entonces, al acabar, se recarga.
  const lanzado = useRef(false);

  const mira = async (): Promise<void> => {
    const r = await pideALaCasa("GET", `viajes/${id}/cierre`);
    const c = r.estado === 200 ? (r.cuerpo.closing as DelCierre) : null;
    // El último cierre puede ser de otra versión (una de antes, ya cerrada o abandonada): no es el de este viaje.
    if (c === null || version === null || c.version !== version) return setCierre(null);
    setCierre(c);
    if (c.stage === "done" && !c.running) {
      if (lanzado.current) window.location.reload();
      return;
    }
    if (c.running) reloj.current = setTimeout(() => void mira(), 1200);
  };

  // Al volver a la página, si había un cierre esperando tu sí, o trabajando, se retoma.
  useEffect(() => {
    void mira();
    return () => {
      if (reloj.current !== null) clearTimeout(reloj.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version]);

  const manda = async (cuerpo: Record<string, unknown>): Promise<void> => {
    setMandando(true);
    setFallo("no");
    const r = await pideALaCasa("POST", `viajes/${id}/cerrar`, cuerpo);
    setMandando(false);
    if (r.estado !== 202) return setFallo(r.estado === 429 ? "muchos" : "fallo");
    lanzado.current = true;
    setCierre({ n: 0, stage: "prices", running: true, version });
    void mira();
  };

  const trabajando = cierre !== null && cierre.running;
  const espera = cierre !== null && cierre.stage === "yours" && !cierre.running;
  return (
    <div className="cerrar">
      {!trabajando && !espera && (
        <>
          <button
            type="button"
            className="boton boton--ancho"
            disabled={mandando}
            onClick={() =>
              void manda({ way: manera, days: dias.map((d) => ({ fecha: d.fecha, paradas: d.paradas })), pace: ritmo })
            }
          >
            {t.viaje.cerrar}
          </button>
          <p className="dato">{t.cerrar.antes}</p>
        </>
      )}
      {trabajando && (
        <p className="cerrar__etapa" role="status">
          <span className="cerrar__pulso" aria-hidden="true" />
          {t.cerrar.etapa[cierre.stage] ?? t.cerrar.etapa.prices}
        </p>
      )}
      {espera && (
        <div className="cerrar__pregunta" role="alert">
          <p>{t.cerrar.subio}</p>
          <ul className="cerrar__precios">
            {(cierre.prices ?? []).map((p) => (
              <li key={p.ref}>
                <span>{nombreDe(viaje, p.ref)}</span>
                <b data-cambio={p.change}>
                  {p.today !== null && dinero(p.today, p.currency, idioma)}
                  <small>{cambioDicho(t, idioma, p.change, p.difference, p.currency)}</small>
                </b>
              </li>
            ))}
          </ul>
          <div className="cerrar__botones">
            <button type="button" className="boton" disabled={mandando} onClick={() => void manda({ prices: "go_on" })}>
              {t.cerrar.sigo}
            </button>
            <button type="button" className="boton boton--hueco" onClick={() => setCierre(null)}>
              {t.cerrar.noAhora}
            </button>
          </div>
        </div>
      )}
      {cierre !== null && parado(cierre) && <p className="aviso">{t.cerrar.etapa.stopped}</p>}
      {fallo !== "no" && <p className="aviso">{fallo === "muchos" ? t.cerrar.muchos : t.cerrar.fallo}</p>}
    </div>
  );
}

/** La pestaña de un viaje cerrado: los precios de hoy, el orden, los papeles, lo que falta y dónde se reserva. */
export function Reservar({ t, idioma, viaje, cierre }: Comun & { viaje: Viaje; cierre: Cierre }) {
  const fecha = (d: string): string => diaCorto(d.slice(0, 10), idioma);
  const enlacesDe = (ref: string) => cierre.enlaces.filter((e) => e.ref === ref);
  const pasoDe = new Map(cierre.precios.map((p) => [p.ref, p]));
  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{t.cerrar.titulo}</h2>
        <p className="dato">{t.cerrar.cerradoEl(fecha(cierre.cuando))}</p>
        <p className="cerrar__nota">{t.cerrar.noReserva}</p>
      </div>

      <div className="grupo">
        <span className="rotulo">{t.cerrar.precios}</span>
        <ul className="cerrar__precios">
          {cierre.precios.map((p) => (
            <li key={p.ref}>
              <span>
                {t.cerrar.pieza[p.pieza]}: {nombreDe(viaje, p.ref)}
                <small className="suave">{t.cerrar.visto(dinero(p.antes.total, p.antes.moneda, idioma))}</small>
              </span>
              <b data-cambio={p.cambio}>
                {p.hoy !== null && dinero(p.hoy.total, p.hoy.moneda, idioma)}
                <small>{cambioDicho(t, idioma, p.cambio, p.diferencia, p.antes.moneda)}</small>
                {p.edad === "stale" && <small>{t.cerrar.caducado}</small>}
                {p.edad === "saved" && <small>{t.cerrar.guardado}</small>}
              </b>
            </li>
          ))}
        </ul>
        <p className="cerrar__total">
          {cierre.total.hoy === null ? (
            <span className="suave">{t.cerrar.totalSinSaber}</span>
          ) : (
            <>
              <span>{t.cerrar.total}</span>
              <b>{dinero(cierre.total.hoy, cierre.moneda, idioma)}</b>
            </>
          )}
        </p>
      </div>

      <div className="grupo">
        <span className="rotulo">{t.cerrar.orden}</span>
        {cierre.sinFrases !== null && <p className="dato">{t.cerrar.sinFrases}</p>}
        <ol className="cerrar__orden">
          {cierre.reservas.map((r) => {
            const precio = pasoDe.get(r.ref);
            return (
              <li key={`${r.que}-${r.ref}`}>
                <span className="cerrar__n">{r.n}</span>
                <div>
                  <b>
                    {t.cerrar.pieza[r.que]}: {nombreDe(viaje, r.ref)}
                  </b>
                  <span className="dato">{r.porQue.map((x) => t.cerrar.razon[x]).join(", ")}</span>
                  {r.frase !== undefined && <p>{r.frase}</p>}
                  {/* El enlace a sus entradas (14.7); uno que no responde no se abre. */}
                  {r.enlace !== undefined &&
                    (r.enlace.comprobado === "down" ? (
                      <span className="suave">
                        {t.cerrar.entradas[r.enlace.clase]}: {t.cerrar.comprobado.down}
                      </span>
                    ) : (
                      <a className="cerrar__enlace" href={r.enlace.url} target="_blank" rel="noreferrer nofollow">
                        <span>{t.cerrar.entradas[r.enlace.clase]}</span>
                        {r.enlace.comprobado === "unchecked" && <small>{t.cerrar.comprobado.unchecked}</small>}
                      </a>
                    ))}
                  {r.que === "sight" && cierre.mapas.paradas[r.ref] !== undefined && (
                    <a className="enlace" href={cierre.mapas.paradas[r.ref]} target="_blank" rel="noreferrer">
                      {t.viaje.enMapas}
                    </a>
                  )}
                  {precio !== undefined && (
                    <div className="cerrar__enlaces">
                      {enlacesDe(r.ref).map((e) =>
                        e.comprobado === "down" ? (
                          <span key={e.url} className="suave">
                            {t.cerrar.clase[e.clase]}: {t.cerrar.comprobado.down}
                          </span>
                        ) : (
                          <a
                            key={e.url}
                            className="cerrar__enlace"
                            href={e.url}
                            target="_blank"
                            rel="noreferrer nofollow"
                          >
                            <span>
                              {t.cerrar.clase[e.clase]}
                              {e.vendedor !== null && (e.clase === "where_priced" || e.clase === "other_seller")
                                ? `: ${e.vendedor}`
                                : ""}
                            </span>
                            {e.precio !== null && <b>{dinero(e.precio.total, e.precio.moneda, idioma)}</b>}
                            {e.comprobado === "unchecked" && <small>{t.cerrar.comprobado.unchecked}</small>}
                          </a>
                        ),
                      )}
                      {enlacesDe(r.ref).some((e) => e.clase === "other_seller" && e.precio !== null) && (
                        <small className="suave">{t.cerrar.deOtroDia}</small>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {cierre.papeles.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.cerrar.papeles}</span>
          <ul className="cerrar__lista">
            {cierre.papeles.map((p) => (
              <li key={p.casilla}>
                <b>
                  {t.papeles.pregunta[p.pregunta] ?? p.pregunta}, {p.pais}
                </b>
                <span className="dato">{t.papeles.antesDe(fecha(p.antesDe), p.tarde)}</span>
                {p.frase !== undefined && <p>{p.frase}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grupo">
        <span className="rotulo">{t.cerrar.sinConfirmar}</span>
        <p className="dato">{t.cerrar.llegada[cierre.llegada]?.(cierre.entradaDesde)}</p>
        {cierre.sinConfirmar
          .filter((s) => s.que !== "arrival_unknown" && s.que !== "arrival_off")
          .map((s) => (
            <p className="aviso" key={`${s.que}-${s.ref ?? ""}`}>
              {t.cerrar.duda[s.que]?.(s.ref === null ? "" : nombreDe(viaje, s.ref))}
            </p>
          ))}
        {(cierre.dudas ?? []).map((d) => (
          <p className="aviso" key={d}>
            {d}
          </p>
        ))}
      </div>

      <div className="grupo">
        <span className="rotulo">{t.cerrar.mapas}</span>
        <div className="cerrar__enlaces">
          <a className="cerrar__enlace" href={cierre.mapas.alojamiento} target="_blank" rel="noreferrer">
            <span>{t.cerrar.dondeDuermes}</span>
          </a>
          {cierre.mapas.dias.map((d, i) =>
            d.url === null ? null : (
              <a key={d.fecha} className="cerrar__enlace" href={d.url} target="_blank" rel="noreferrer">
                <span>{t.cerrar.dia(i + 1, fecha(d.fecha))}</span>
              </a>
            ),
          )}
        </div>
      </div>
    </>
  );
}
