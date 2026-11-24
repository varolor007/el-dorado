"use client";

// El primer vistazo de un viaje nuevo, antes del botón: lo que hay para tus fechas, cuántos pasan los mínimos y desde
// cuánto, zona a zona en el mapa, y los días baratos para volar si se sabe de dónde sales. Sin cuenta y sin IA. Si
// no llega o tarda, se dice en claro y la pantalla sigue valiendo: el botón sigue ahí.

import type { Vistazo } from "../../../agent/output/viaje.ts";
import { dinero, diaCorto, diaDeLaSemana, noches } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import type { EstadoDelVistazo } from "../lib/vistazo.ts";

type Props = {
  t: Textos;
  idioma: string;
  estado: EstadoDelVistazo;
  entrada: string;
  salida: string;
  adultos: number;
  habitaciones: number;
};

/** Los días más baratos para volar, como mucho tres, y el tuyo, si está entre los que se saben. */
function DiasParaVolar({ t, idioma, v, entrada }: { t: Textos; idioma: string; v: Vistazo; entrada: string }) {
  const d = v.vuelos;
  if (d === undefined || d === null) return <p className="dato">{t.primerVistazo.sinVuelos}</p>;
  const baratos = [...d.dias].sort((a, b) => a.precio - b.precio || a.dia.localeCompare(b.dia)).slice(0, 3);
  const tuyo = d.dias.find((x) => x.dia === entrada);
  const dia = (x: { dia: string; precio: number }, oro: boolean, rotulo?: string) => (
    <span key={`${x.dia}-${rotulo ?? ""}`} className={`pastilla${oro ? " pastilla--oro" : ""}`}>
      {diaDeLaSemana(x.dia, idioma)} {diaCorto(x.dia, idioma)}: {dinero(x.precio, d.moneda, idioma)}
      {rotulo !== undefined && ` (${rotulo})`}
    </span>
  );
  return (
    <div className="toques">
      <span className="rotulo">{t.primerVistazo.vuelos(d.origen, d.destino)}</span>
      <div className="cabecera__linea">
        {baratos.map((x, i) => dia(x, i === 0))}
        {tuyo !== undefined && !baratos.includes(tuyo) && dia(tuyo, false, t.primerVistazo.tuDia)}
      </div>
      <p className="dato">{t.primerVistazo.vuelosNota(d.noches)}</p>
    </div>
  );
}

export function PrimerVistazo({ t, idioma, estado, entrada, salida, adultos, habitaciones }: Props) {
  const x = t.primerVistazo;
  const v = estado.vistazo;
  const numero = (n: number): string => new Intl.NumberFormat(idioma).format(n);
  const zonasConAlgo = (v?.zonas ?? []).filter((z) => z.pasan > 0).length;
  return (
    <section className="toques" aria-label={x.titulo} aria-busy={estado.como === "buscando"}>
      <h2 className="titulo">{x.titulo}</h2>
      <div aria-live="polite">
        {estado.como === "buscando" && <p className="dato">{v === null ? x.buscando : x.otraVez}</p>}
        {estado.como === "fallo" && (
          <p className="aviso" role="status">
            {x.fallo(estado.fallo, estado.espera)} {x.sigue}
          </p>
        )}
      </div>
      {v !== null && (
        <>
          <div className="cifras" data-tenue={estado.como === "buscando"}>
            <div>
              <b>{numero(v.devueltos)}</b>
              <span>{t.vistazo.encontrados(v.devueltos)}</span>
            </div>
            <div>
              <b>{numero(v.pasan)}</b>
              <span>{t.vistazo.pasan(v.pasan)}</span>
            </div>
            <div className="oro">
              <b>{v.desde === null ? "?" : dinero(v.desde, v.moneda, idioma)}</b>
              <span>{t.vistazo.desde(noches(entrada, salida))}</span>
            </div>
          </div>
          {v.devueltos === 0 && <p className="aviso">{x.nada}</p>}
          <p className="dato">
            {t.primerVistazo.minimos(v.minimos.nota, v.minimos.opiniones, v.minimos.estrellas)}{" "}
            {x.paraQuien(adultos, habitaciones)}
          </p>
          {v.bajados && <p className="aviso">{x.bajados}</p>}
          {v.aMedias && <p className="aviso">{x.aMedias}</p>}
          {v.mirados !== undefined && v.mirados > 0 && v.mirados < v.pasan && (
            <p className="dato">{x.mirados(v.mirados, v.pasan)}</p>
          )}
          {zonasConAlgo > 0 && <p className="dato">{x.zonas(zonasConAlgo)}</p>}
          <DiasParaVolar t={t} idioma={idioma} v={v} entrada={entrada} />
        </>
      )}
    </section>
  );
}
