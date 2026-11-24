"use client";

// Tu panel: tus viajes, cada uno donde lo dejaste, y la puerta para empezar otro. Con tu cuenta, los tuyos, traídos de
// la casa; el grabado se queda como ejemplo.

import Link from "next/link";
import type { Punto, Viaje } from "../../../../../agent/output/viaje.ts";
import { useMisViajes, useViajeDeLaCasa, type ResumenDeViaje } from "../../../lib/cuenta.ts";
import { diaCorto, dinero, noches } from "../../../lib/formato.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { useGrabado, useIdioma } from "../../../lib/usar.ts";

/** El viaje, dibujado en pequeño: cada día, una línea, y cada parada, un punto. Sin mapa debajo: solo su forma. */
function Dibujo({ viaje }: { viaje: Viaje }) {
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p.punto]));
  const dias = viaje.dias.map((d) => d.paradas.flatMap((id) => deParada.get(id) ?? []));
  const todos = dias.flat();
  if (todos.length === 0) return null;
  const lons = todos.map((p) => p.lon);
  const lats = todos.map((p) => p.lat);
  const ancho = Math.max(...lons) - Math.min(...lons) || 1;
  const altura = Math.max(...lats) - Math.min(...lats) || 1;
  // La longitud se encoge con la latitud, para que el dibujo no salga estirado.
  const aplasta = Math.cos((((Math.max(...lats) + Math.min(...lats)) / 2) * Math.PI) / 180);
  const escala = Math.min(280 / (ancho * aplasta), 120 / altura);
  const x = (p: Punto): number => 20 + (p.lon - Math.min(...lons)) * aplasta * escala;
  const y = (p: Punto): number => 20 + (Math.max(...lats) - p.lat) * escala;
  return (
    <svg className="dibujo" viewBox="0 0 320 160" role="img" aria-label={viaje.destino.nombre}>
      {dias.map((d, i) => (
        <polyline key={i} points={d.map((p) => `${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(" ")} />
      ))}
      {todos.map((p, i) => (
        <circle key={i} cx={x(p).toFixed(1)} cy={y(p).toFixed(1)} r="3.4" />
      ))}
    </svg>
  );
}

/** Un viaje de tu cuenta. Si ya está en el mapa, se dibuja y se abre; si no, dice cómo está. */
function Tuyo({ resumen }: { resumen: ResumenDeViaje }) {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const enElMapa = resumen.state === "on_map" || resumen.state === "closed";
  const viaje = useViajeDeLaCasa(enElMapa ? resumen.id : null)?.viaje ?? null;
  const medio = viaje?.maneras.find((m) => m.id === "best_value") ?? viaje?.maneras[0] ?? null;
  const dentro = (
    <>
      {viaje !== null && <Dibujo viaje={viaje} />}
      <span className="viaje__texto">
        <span className="rotulo">{t.panel.estados[resumen.state]}</span>
        <b className="viaje__lugar">{resumen.destination ?? t.panel.sinNombre}</b>
        <span className="cabecera__linea">
          {resumen.check_in !== null && resumen.check_out !== null && (
            <>
              <span className="pastilla">
                {diaCorto(resumen.check_in, idioma)} → {diaCorto(resumen.check_out, idioma)}
              </span>
              <span className="pastilla">{t.vistazo.noches(noches(resumen.check_in, resumen.check_out))}</span>
            </>
          )}
          {viaje !== null && (
            <span className="pastilla">{t.viaje.paradas(viaje.dias.reduce((s, d) => s + d.paradas.length, 0))}</span>
          )}
          {medio !== null && (
            <span className="pastilla pastilla--oro">{dinero(medio.total, medio.moneda, idioma)}</span>
          )}
        </span>
        {enElMapa ? <span className="enlace">{t.panel.abrir} →</span> : <span className="suave">{t.panel.aun}</span>}
      </span>
    </>
  );
  return enElMapa ? (
    <Link className="viaje" href={`/plan?trip=${resumen.id}&at=trip`}>
      {dentro}
    </Link>
  ) : (
    <div className="viaje viaje--quieto">{dentro}</div>
  );
}

export default function Viajes() {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const grabado = useGrabado();
  const mios = useMisViajes();
  const viaje = grabado?.viaje ?? null;
  const medio = viaje?.maneras.find((m) => m.id === "best_value") ?? viaje?.maneras[0] ?? null;
  return (
    <main className="pagina">
      <header className="pagina__cab">
        <h1 className="lugar">{t.panel.titulo}</h1>
        <p className="suave">{t.panel.sub}</p>
      </header>
      <div className="viajes">
        {(mios ?? []).map((resumen) => (
          <Tuyo key={resumen.id} resumen={resumen} />
        ))}
        {viaje !== null && (
          <Link className="viaje" href="/plan?at=trip">
            <Dibujo viaje={viaje} />
            <span className="viaje__texto">
              <span className="rotulo">{mios === undefined ? t.panel.estado : t.panel.ejemplo}</span>
              <b className="viaje__lugar">{viaje.destino.nombre}</b>
              <span className="cabecera__linea">
                <span className="pastilla">
                  {diaCorto(viaje.entrada, idioma)} → {diaCorto(viaje.salida, idioma)}
                </span>
                <span className="pastilla">{t.vistazo.noches(noches(viaje.entrada, viaje.salida))}</span>
                <span className="pastilla">
                  {t.viaje.paradas(viaje.dias.reduce((s, d) => s + d.paradas.length, 0))}
                </span>
                {medio !== null && (
                  <span className="pastilla pastilla--oro">{dinero(medio.total, medio.moneda, idioma)}</span>
                )}
              </span>
              <span className="viaje__espera">{t.panel.espera}</span>
              <span className="enlace">{t.panel.abrir} →</span>
            </span>
          </Link>
        )}
        <Link className="viaje viaje--nuevo" href="/plan">
          <span className="viaje__mas" aria-hidden="true">
            +
          </span>
          <span className="viaje__texto">
            <b className="viaje__lugar">{t.panel.nuevo}</b>
            <span className="suave">{t.panel.nuevoTexto}</span>
          </span>
        </Link>
      </div>
      {grabado === null && <p className="suave">{t.panel.vacio}</p>}
      {viaje?.muestra && <p className="credito">{t.viaje.muestra}</p>}
    </main>
  );
}
