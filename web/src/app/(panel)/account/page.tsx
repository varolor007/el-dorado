"use client";

// Tu cuenta: registrarte, entrar y salir. Con ella, tus viajes y tu clave de IA son tuyos y de nadie más.

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { entrar, registrarse, salir, useCuenta, type Fallo } from "../../../lib/cuenta.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { tuIa } from "../../../lib/tuIa.ts";
import { useIdioma } from "../../../lib/usar.ts";

export default function MiCuenta() {
  const t = TEXTOS[useIdioma()];
  const cuenta = useCuenta();
  const [nueva, setNueva] = useState(true);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [fallo, setFallo] = useState<Fallo>(null);
  const [ocupada, setOcupada] = useState(false);

  const manda = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setOcupada(true);
    setFallo(await (nueva ? registrarse : entrar)(correo, contrasena));
    setContrasena("");
    setOcupada(false);
  };
  const elige = (queNueva: boolean): void => {
    setNueva(queNueva);
    setFallo(null);
  };

  return (
    <main className="pagina pagina--estrecha">
      <header className="pagina__cab">
        <h1 className="lugar">{t.cuenta.titulo}</h1>
        <p className="suave">{t.cuenta.sub}</p>
      </header>

      {cuenta === undefined && <p className="dato">{t.cuenta.mirando}</p>}
      {cuenta === "no_house" && (
        <section className="tarjeta">
          <p className="aviso">{t.cuenta.sinCasa}</p>
        </section>
      )}

      {cuenta === null && (
        <form className="tarjeta" onSubmit={(e) => void manda(e)}>
          <div className="cabecera__linea" role="group" aria-label={t.cuenta.titulo}>
            <button type="button" className="toque" aria-pressed={nueva} onClick={() => elige(true)}>
              {t.cuenta.crear}
            </button>
            <button type="button" className="toque" aria-pressed={!nueva} onClick={() => elige(false)}>
              {t.cuenta.entrar}
            </button>
          </div>
          <label className="toques" htmlFor="correo">
            <span className="rotulo">{t.cuenta.correo}</span>
            <input
              className="campo"
              id="correo"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </label>
          <label className="toques" htmlFor="contrasena">
            <span className="rotulo">{t.cuenta.contrasena}</span>
            <input
              className="campo"
              id="contrasena"
              type="password"
              autoComplete={nueva ? "new-password" : "current-password"}
              required
              minLength={nueva ? 10 : 1}
              maxLength={200}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
            {nueva && <span className="dato">{t.cuenta.pista}</span>}
          </label>
          <button type="submit" className="boton" disabled={ocupada}>
            {nueva ? t.cuenta.botonCrear : t.cuenta.botonEntrar}
          </button>
          {fallo !== null && (
            <p className="aviso aviso--novale" role="alert">
              {t.cuenta.fallo(fallo.clave, fallo.espera)}
            </p>
          )}
        </form>
      )}

      {typeof cuenta === "object" && cuenta !== null && (
        <section className="tarjeta">
          <span className="rotulo">{t.cuenta.dentro}</span>
          <b className="titulo">{cuenta.email}</b>
          <p className="dato">
            {tuIa(cuenta) === "house"
              ? t.cuenta.deLaCasa
              : cuenta.key === null
                ? t.cuenta.sinClave
                : t.cuenta.conClave(cuenta.key.hint)}
          </p>
          <div className="cabecera__linea">
            <Link className={`boton boton--chico${tuIa(cuenta) === "house" ? " boton--hueco" : ""}`} href="/key">
              {cuenta.key === null ? t.cuenta.ponClave : t.cuenta.verClave}
            </Link>
            <button type="button" className="boton boton--chico boton--hueco" onClick={() => void salir()}>
              {t.cuenta.salir}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
