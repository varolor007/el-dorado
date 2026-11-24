"use client";

// Tu clave de IA y lo que ha gastado cada viaje. La clave se guarda en tu cuenta, cifrada; aquí solo se ve cómo acaba.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ponerClave, quitarClave, useCuenta, useGasto, type Fallo } from "../../../lib/cuenta.ts";
import { diaCorto, gastoDeIA } from "../../../lib/formato.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { useIdioma } from "../../../lib/usar.ts";

/** Lo que ha gastado cada viaje tuyo, el total y lo que costará la siguiente investigación, si ya se sabe. */
function Gasto({ deLaCasa }: { deLaCasa: boolean }) {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const gasto = useGasto();
  if (gasto === undefined) return <p className="dato">{t.clave.mirandoGasto}</p>;
  if (gasto === null) return <p className="dato">{t.clave.sinGastoCasa}</p>;
  if (gasto.trips.length === 0) return <p className="dato">{t.clave.sinGasto}</p>;
  return (
    <>
      {deLaCasa && <p className="suave">{t.clave.comoClave}</p>}
      <div>
        {gasto.trips.map((v) => (
          <div key={v.id} className="otro otro--quieto">
            <span>
              {v.destination ?? t.panel.sinNombre}
              <span className="otro__novale">
                {[
                  v.check_in !== null && v.check_out !== null
                    ? `${diaCorto(v.check_in, idioma)} → ${diaCorto(v.check_out, idioma)}`
                    : null,
                  v.researches > 1 ? t.clave.investigaciones(v.researches) : null,
                  t.clave.llamadas(v.calls),
                  v.last !== null ? t.clave.ultima(diaCorto(v.last.slice(0, 10), idioma)) : null,
                ]
                  .filter((x) => x !== null)
                  .join(", ")}
              </span>
              {!v.known && <span className="otro__novale">{t.clave.sinSaberUno}</span>}
            </span>
            <b>{gastoDeIA(v.usd, idioma)}</b>
          </div>
        ))}
        <div className="otro otro--quieto">
          <span>
            <b>{t.clave.total}</b>
            <span className="otro__novale">{t.clave.llamadas(gasto.total.calls)}</span>
            {!gasto.total.known && <span className="otro__novale">{t.clave.sinSaberTotal}</span>}
          </span>
          <b className="oro">{gastoDeIA(gasto.total.usd, idioma)}</b>
        </div>
      </div>
      <p className="dato">
        {gasto.next === null
          ? t.clave.sinSiguiente
          : t.clave.siguiente(gastoDeIA(gasto.next.usd, idioma), gasto.next.from)}
      </p>
    </>
  );
}

export default function Clave() {
  const t = TEXTOS[useIdioma()];
  const cuenta = useCuenta();
  const [clave, setClave] = useState("");
  const [fallo, setFallo] = useState<Fallo>(null);
  const [ocupada, setOcupada] = useState(false);
  const dentro = typeof cuenta === "object" && cuenta !== null ? cuenta : null;
  const deLaCasa = dentro?.thinks_with === "house";

  const guarda = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setOcupada(true);
    const f = await ponerClave(clave.trim());
    setFallo(f);
    if (f === null) setClave("");
    setOcupada(false);
  };

  return (
    <main className="pagina pagina--estrecha">
      <header className="pagina__cab">
        <h1 className="lugar">{t.clave.titulo}</h1>
        <p className="suave">{deLaCasa ? t.clave.deLaCasa : t.clave.cuerpo}</p>
      </header>
      <form className="tarjeta" onSubmit={(e) => void guarda(e)}>
        {dentro?.key != null && (
          <div className="otro otro--quieto">
            <span>{t.clave.puesta}</span>
            <b>{t.clave.acaba(dentro.key.hint)}</b>
          </div>
        )}
        <label className="toques" htmlFor="clave">
          <span className="rotulo">{dentro?.key == null ? t.clave.campo : t.clave.otra}</span>
          <input
            className="campo"
            id="clave"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-"
            disabled={dentro === null}
            required
            minLength={20}
            maxLength={400}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>
        <div className="cabecera__linea">
          <button type="submit" className="boton" disabled={dentro === null || ocupada}>
            {t.clave.guardar}
          </button>
          {dentro?.key != null && (
            <button type="button" className="boton boton--hueco" onClick={() => void quitarClave().then(setFallo)}>
              {t.clave.quitar}
            </button>
          )}
        </div>
        {fallo !== null && (
          <p className="aviso aviso--novale" role="alert">
            {t.cuenta.fallo(fallo.clave, fallo.espera)}
          </p>
        )}
        {cuenta === "no_house" && <p className="aviso">{t.cuenta.sinCasa}</p>}
        {cuenta === null && (
          <p className="aviso">
            <span>
              {t.clave.entra}{" "}
              <Link className="enlace" href="/account">
                {t.cuenta.titulo}
              </Link>
            </span>
          </p>
        )}
        {dentro?.key == null && !deLaCasa && <p className="dato">{t.clave.sinClave}</p>}
      </form>
      <section className="tarjeta">
        <h2 className="titulo">{t.clave.gasto}</h2>
        {dentro === null ? <p className="dato">{t.clave.sinGasto}</p> : <Gasto deLaCasa={deLaCasa} />}
      </section>
    </main>
  );
}
