"use client";

// Tu panel: tus viajes, cada uno donde lo dejaste, y la puerta para empezar otro. En seco solo hay uno: el grabado.

import Link from "next/link";
import type { Punto, Viaje } from "../../../../../agent/output/viaje.ts";
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

export default function Viajes() {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const grabado = useGrabado();
  const viaje = grabado?.viaje ?? null;
  const medio = viaje?.maneras.find((m) => m.id === "best_value") ?? viaje?.maneras[0] ?? null;
  return (
    <main className="pagina">
      <header className="pagina__cab">
        <h1 className="lugar">{t.panel.titulo}</h1>
        <p className="suave">{t.panel.sub}</p>
      </header>
      <div className="viajes">
        {viaje !== null && (
          <Link className="viaje" href="/plan?at=trip">
            <Dibujo viaje={viaje} />
            <span className="viaje__texto">
              <span className="rotulo">{t.panel.estado}</span>
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
