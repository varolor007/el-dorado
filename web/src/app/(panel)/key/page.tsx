"use client";

// Tu clave de IA y lo que ha gastado. En seco el campo está apagado a propósito: una clave de verdad no se pega
// en una web que todavía no la guarda como debe.

import { TEXTOS } from "../../../lib/textos.ts";
import { useGrabado, useIdioma } from "../../../lib/usar.ts";

export default function Clave() {
  const t = TEXTOS[useIdioma()];
  const viaje = useGrabado()?.viaje ?? null;
  return (
    <main className="pagina pagina--estrecha">
      <header className="pagina__cab">
        <h1 className="lugar">{t.clave.titulo}</h1>
        <p className="suave">{t.clave.cuerpo}</p>
      </header>
      <form className="tarjeta" onSubmit={(e) => e.preventDefault()}>
        <label className="toques" htmlFor="clave">
          <span className="rotulo">{t.clave.campo}</span>
          <input className="campo" id="clave" type="password" autoComplete="off" placeholder="sk-ant-" disabled />
        </label>
        <button type="submit" className="boton" disabled>
          {t.clave.guardar}
        </button>
        <p className="aviso">{t.clave.seco}</p>
        <p className="dato">{t.clave.sinClave}</p>
      </form>
      <section className="tarjeta">
        <h2 className="titulo">{t.clave.gasto}</h2>
        {viaje !== null && (
          <div className="otro otro--quieto">
            <span>{viaje.destino.nombre}</span>
            <b>0</b>
          </div>
        )}
        <p className="dato">{t.clave.sinGasto}</p>
      </section>
    </main>
  );
}
