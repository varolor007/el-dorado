"use client";

// La investigación de un viaje tuyo, contada por la casa mientras pasa: por qué paso va, lo que se ha ido
// encontrando y lo que lleva gastado de tu clave. Si se para, lo dice, y no gasta más hasta que tú lo pidas.

import { useState } from "react";
import type { Suceso } from "../../../agent/output/viaje.ts";
import { gastoDeIA } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { empezarLaInvestigacion, type EnLaCasa } from "../lib/viajeVivo.ts";
import { TECHO_PROPUESTO } from "./Empezar.tsx";
import { fraseDeSuceso } from "./Pantallas.tsx";

type Props = { t: Textos; idioma: string; estado: EnLaCasa; sucesos: Suceso[]; deNoches: number };

export function EnCasa({ t, idioma, estado, sucesos, deNoches }: Props) {
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const i = estado.research;
  const pasos = i?.steps ?? [];
  const hechos = pasos.filter((p) => p.state === "done").length;
  const avance = pasos.length === 0 ? 0 : hechos / pasos.length;
  const ahora = pasos.find((p) => p.state !== "done")?.id ?? null;
  const parado = i?.stopped ?? null;
  const nombreDe = (paso: string | null): string => (paso === null ? "" : (t.casa.pasos[paso] ?? paso));

  // Mientras se mira un alojamiento se dice que se está mirando; al acabar, esa línea pasa a ser la de lo mirado.
  const mirados = new Set(sucesos.filter((s) => s.clase === "looked").map((s) => s.ref));
  const lineas = sucesos
    .map((s, n) => ({ s, n, f: fraseDeSuceso(s, t, idioma, deNoches) }))
    .filter((x) => x.f !== null && !(x.s.clase === "looking" && mirados.has(x.s.ref)))
    .reverse()
    .slice(0, 6);

  const otraVez = async (): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const mal = await empezarLaInvestigacion(estado.trip.id, i?.ceiling ?? TECHO_PROPUESTO);
    setOcupado(false);
    if (mal !== null)
      setFallo(
        t.empezar.fallo(
          mal.clave,
          mal.campos.map((c) => t.empezar.campos[c] ?? c),
        ),
      );
  };

  return (
    <>
      <div className="cabecera">
        <span className="rotulo">{t.vivo.rotulo}</span>
        <h1 className="titulo">{estado.trip.destination ?? t.casa.titulo}</h1>
        {parado === null && <p className="suave">{ahora === null ? t.casa.esperando : nombreDe(ahora)}</p>}
        <div
          className="avance"
          role="progressbar"
          aria-valuenow={Math.round(avance * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${avance * 100}%` }} />
        </div>
      </div>
      {parado !== null && (
        <p className="aviso" role="alert">
          {t.casa.parado(nombreDe(parado.at ?? ahora))}
        </p>
      )}
      {parado !== null && i !== null && !i.running && (
        <button type="button" className="boton boton--hueco" disabled={ocupado} onClick={() => void otraVez()}>
          {t.casa.otraVez}
        </button>
      )}
      {fallo !== null && (
        <p className="aviso" role="alert">
          {fallo}
        </p>
      )}
      <ol className="sucesos" aria-live="polite">
        {lineas.map(({ s, n, f }, orden) => (
          <li key={n} className={orden === 0 ? "suceso suceso--ultimo" : "suceso"}>
            <span className="dato">{(s.t / 1000).toFixed(1)} s</span>
            <p>
              {f!.n !== null && <b>{f!.n} </b>}
              {f!.texto}
            </p>
          </li>
        ))}
      </ol>
      {i !== null && (
        <p className="dato">
          {i.spent.known
            ? t.casa.gastado(gastoDeIA(i.spent.usd, idioma), i.ceiling === null ? null : gastoDeIA(i.ceiling, idioma))
            : t.casa.gastoSinSaber}
        </p>
      )}
    </>
  );
}
