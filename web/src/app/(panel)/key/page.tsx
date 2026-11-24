"use client";

// Tu clave de IA y lo que ha gastado. La clave se guarda en tu cuenta, cifrada; aquí solo se enseña cómo acaba.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ponerClave, quitarClave, useCuenta, type Fallo } from "../../../lib/cuenta.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { useIdioma } from "../../../lib/usar.ts";

export default function Clave() {
  const t = TEXTOS[useIdioma()];
  const cuenta = useCuenta();
  const [clave, setClave] = useState("");
  const [fallo, setFallo] = useState<Fallo>(null);
  const [ocupada, setOcupada] = useState(false);
  const dentro = typeof cuenta === "object" && cuenta !== null ? cuenta : null;

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
        <p className="suave">{t.clave.cuerpo}</p>
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
        {dentro?.key == null && <p className="dato">{t.clave.sinClave}</p>}
      </form>
      <section className="tarjeta">
        <h2 className="titulo">{t.clave.gasto}</h2>
        <p className="dato">{t.clave.sinGasto}</p>
      </section>
    </main>
  );
}
