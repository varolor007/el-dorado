"use client";

// La investigación de un viaje tuyo, contada por la casa mientras pasa: por qué paso va, lo que se ha ido
// encontrando y lo que lleva gastado de tu clave. Si se para, lo dice, y no gasta más hasta que tú lo pidas.

import { useState } from "react";
import type { Suceso } from "../../../agent/output/viaje.ts";
import { gastoDeIA, reloj } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { confirmarLoEntendido, empezarLaInvestigacion, reintentarElPaso, type EnLaCasa } from "../lib/viajeVivo.ts";
import { Confirmacion } from "./Confirmacion.tsx";
import { fraseDeSuceso, TusPapeles } from "./Pantallas.tsx";

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
  // Tu turno: la investigación espera a que confirmes lo que he entendido. No es una parada.
  const tuTurno = parado === null && i?.waiting_for_you === true && i.heard != null ? i.heard : null;
  // Lo que puedes hacer, por las claves de la casa. Sin claves (una casa de antes), volver a intentarlo. Seguir sin
  // una parte no se ofrece todavía: ningún paso se puede saltar.
  const salidas = parado?.options ?? ["retry"];
  const nombreDe = (paso: string | null): string => (paso === null ? "" : (t.casa.pasos[paso] ?? paso));
  // Los papeles, en cuanto están; si algo bloquea, o faltan, y no es lo que he entendido, es tu turno de decidir.
  const papeles = i?.papers ?? null;
  const turnoDePapeles =
    parado === null && tuTurno === null && i?.waiting_for_you === true && papeles !== null && !papeles.sigue;
  const seguir = async (): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const mal = await confirmarLoEntendido(estado.trip.id, { papers: "go_on" });
    setOcupado(false);
    if (mal !== null) setFallo(t.empezar.fallo(mal.clave, []));
  };

  // Mientras se mira un alojamiento se dice que se está mirando; al acabar, esa línea pasa a ser la de lo mirado.
  const mirados = new Set(sucesos.filter((s) => s.clase === "looked").map((s) => s.ref));
  const lineas = sucesos
    .map((s, n) => ({ s, n, f: fraseDeSuceso(s, t, idioma, deNoches) }))
    .filter((x) => x.f !== null && !(x.s.clase === "looking" && mirados.has(x.s.ref)))
    .reverse()
    .slice(0, 6);

  // Volver a intentarlo sigue desde donde se paró, si la casa dice que se puede: solo se repite ese paso. Si no (una
  // casa de antes, o una parada que no se retoma así), la investigación empieza otra vez.
  const desdeAqui = parado?.resumes === true;
  const otraVez = async (): Promise<void> => {
    setOcupado(true);
    setFallo(null);
    const mal = desdeAqui ? await reintentarElPaso(estado.trip.id) : await empezarLaInvestigacion(estado.trip.id);
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
        {parado === null && (
          <p className="suave">
            {tuTurno !== null || turnoDePapeles
              ? t.escucha.rotulo
              : ahora === null
                ? t.casa.esperando
                : nombreDe(ahora)}
          </p>
        )}
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
        <div className="parado">
          <p className="aviso" role="alert">
            {t.casa.parado(nombreDe(parado.at ?? ahora))}
          </p>
          {parado.looking === true ? (
            <p className="suave">{t.casa.mirando}</p>
          ) : (
            <>
              {parado.kind !== undefined && t.casa.queHaPasado[parado.kind] !== undefined && (
                <p>{t.casa.queHaPasado[parado.kind]}</p>
              )}
              {/* Su frase, solo si la casa la dejó pasar y está en el idioma de quien mira. */}
              {parado.said != null && parado.said.lang === idioma && <p className="suave">{parado.said.text}</p>}
              {i !== null && !i.running && (
                <>
                  <p className="rotulo">{t.casa.queHacer}</p>
                  {desdeAqui && salidas.includes("retry") && <p className="suave">{t.casa.soloEstePaso}</p>}
                  <div className="parado__salidas">
                    {salidas.includes("retry") && (
                      <button
                        type="button"
                        className="boton boton--hueco"
                        disabled={ocupado}
                        onClick={() => void otraVez()}
                      >
                        {t.casa.salidas.retry}
                      </button>
                    )}
                    {/* Una página entera: la del mapa lee ?at=change al abrirse (8.5). */}
                    {salidas.includes("change_request") && (
                      <a className="boton boton--hueco" href={`/plan?trip=${estado.trip.id}&at=change`}>
                        {t.casa.salidas.change_request}
                      </a>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {fallo !== null && (
        <p className="aviso" role="alert">
          {fallo}
        </p>
      )}
      {tuTurno !== null && <Confirmacion key={tuTurno.round} t={t} viaje={estado.trip.id} escuchado={tuTurno} />}
      {papeles !== null && (turnoDePapeles || papeles.bloquea || papeles.falta !== null) && (
        <TusPapeles
          t={t}
          idioma={idioma}
          papeles={papeles}
          ocupado={ocupado}
          alSeguir={turnoDePapeles ? () => void seguir() : undefined}
        />
      )}
      <ol className="sucesos" aria-live="polite">
        {lineas.map(({ s, n, f }, orden) => (
          <li key={n} className={orden === 0 ? "suceso suceso--ultimo" : "suceso"}>
            <span className="dato">{reloj(s.t)}</span>
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
