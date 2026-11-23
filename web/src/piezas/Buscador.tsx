"use client";

// El buscador: dónde y cuándo, como el de un buscador de hoteles. Completa lo que se escribe y, al elegir, avisa.

import { useEffect, useRef, useState } from "react";
import type { Lugar } from "../lib/lugares.ts";
import type { Textos } from "../lib/textos.ts";

export type Busqueda = { lugar: Lugar; entrada: string; salida: string };

type Props = {
  t: Textos;
  idioma: string;
  inicial: { texto: string; entrada: string; salida: string };
  /** En el móvil, con el destino ya elegido, el buscador se recoge en una línea y se abre al tocarlo. */
  recogido?: boolean;
  alBuscar: (b: Busqueda) => void;
};

const corto = (fecha: string, idioma: string): string =>
  fecha === ""
    ? ""
    : new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short", timeZone: "UTC" }).format(
        new Date(fecha + "T00:00:00Z"),
      );

export function Buscador({ t, idioma, inicial, recogido, alBuscar }: Props) {
  const [desplegado, setDesplegado] = useState(false);
  const [texto, setTexto] = useState(inicial.texto);
  const [entrada, setEntrada] = useState(inicial.entrada);
  const [salida, setSalida] = useState(inicial.salida);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const elegido = useRef<Lugar | null>(null);

  useEffect(() => {
    setTexto(inicial.texto);
    setEntrada(inicial.entrada);
    setSalida(inicial.salida);
  }, [inicial.texto, inicial.entrada, inicial.salida]);

  // Completa mientras se escribe, con una pausa para no preguntar por cada letra.
  useEffect(() => {
    if (!abierta || texto.trim().length < 2) {
      setLugares([]);
      return;
    }
    const corta = new AbortController();
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(texto)}&lang=${idioma}`, { signal: corta.signal });
        const datos = (await r.json()) as { lugares: Lugar[] };
        setLugares(datos.lugares);
        setMarcado(0);
      } catch {
        // Si el buscador no responde, no se propone nada: se puede seguir escribiendo.
      }
    }, 220);
    return () => {
      clearTimeout(espera);
      corta.abort();
    };
  }, [texto, abierta, idioma]);

  const elige = (l: Lugar): void => {
    elegido.current = l;
    setTexto(l.nombre);
    setAbierta(false);
    if (entrada !== "" && salida !== "") {
      setDesplegado(false);
      alBuscar({ lugar: l, entrada, salida });
    }
  };
  const busca = (): void => {
    const l = elegido.current ?? lugares[marcado] ?? null;
    if (l !== null && entrada !== "" && salida !== "") elige(l);
  };

  if (recogido && !desplegado) {
    return (
      <div className="buscador buscador--recogido">
        <button type="button" className="buscador__resumen" onClick={() => setDesplegado(true)}>
          <span className="marca__sol" aria-hidden="true" />
          <b>{texto}</b>
          <span className="dato">
            {corto(entrada, idioma)} → {corto(salida, idioma)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <form
      className="buscador"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        busca();
      }}
    >
      <div className="buscador__barra">
        <label className="buscador__campo">
          <span className="rotulo">{t.buscador.donde}</span>
          <input
            id="donde"
            value={texto}
            autoComplete="off"
            placeholder="Lisboa, Kyoto, Patagonia"
            role="combobox"
            aria-expanded={abierta && lugares.length > 0}
            aria-controls="lugares"
            onChange={(e) => {
              elegido.current = null;
              setTexto(e.target.value);
              setAbierta(true);
            }}
            onFocus={() => setAbierta(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setMarcado((n) => Math.min(n + 1, lugares.length - 1));
              if (e.key === "ArrowUp") setMarcado((n) => Math.max(n - 1, 0));
              if (e.key === "Escape") setAbierta(false);
            }}
          />
        </label>
        <div className="buscador__campo buscador__campo--fechas">
          <span className="rotulo">{t.buscador.fechas}</span>
          <div className="buscador__fechas">
            <input
              id="entrada"
              type="date"
              aria-label={t.buscador.llegada}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
            />
            <span className="dato" aria-hidden="true">
              →
            </span>
            <input
              id="salida"
              type="date"
              aria-label={t.buscador.salida}
              value={salida}
              min={entrada}
              onChange={(e) => setSalida(e.target.value)}
            />
          </div>
        </div>
        <button className="buscador__ir" type="submit" aria-label={t.buscador.ir}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12.5 12.5 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {abierta && lugares.length > 0 && (
        <ul className="buscador__lista" id="lugares" role="listbox">
          {lugares.map((l, i) => (
            <li key={`${l.nombre}-${l.donde}`} role="option" aria-selected={i === marcado}>
              <button type="button" className="buscador__lugar" aria-selected={i === marcado} onClick={() => elige(l)}>
                <b>{l.nombre}</b>
                <span>{l.donde}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
