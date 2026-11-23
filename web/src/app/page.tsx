"use client";

// La portada: quién es El Dorado, en una pantalla. Un viaje que se dibuja solo, cómo funciona, lo que cuida y la
// puerta al mapa. En inglés o en español, según quien mire.

import Link from "next/link";
import type { Punto } from "../../../agent/output/viaje.ts";
import { TEXTOS } from "../lib/textos.ts";
import { useGrabado, useIdioma } from "../lib/usar.ts";

/** Un viaje de adorno para la portada, cuando no hay ninguno grabado: tres días que no son de ningún sitio. */
const DE_ADORNO: Punto[][] = [
  [
    { lat: 0.62, lon: 0.08 },
    { lat: 0.5, lon: 0.2 },
    { lat: 0.56, lon: 0.33 },
    { lat: 0.4, lon: 0.4 },
  ],
  [
    { lat: 0.3, lon: 0.5 },
    { lat: 0.42, lon: 0.6 },
    { lat: 0.26, lon: 0.7 },
  ],
  [
    { lat: 0.66, lon: 0.62 },
    { lat: 0.74, lon: 0.76 },
    { lat: 0.6, lon: 0.86 },
    { lat: 0.7, lon: 0.95 },
  ],
];

/** El viaje que se dibuja solo: cada día, una línea de oro que se traza, y cada parada, un punto que aparece. */
function ViajeQueSeDibuja({ dias }: { dias: Punto[][] }) {
  const todos = dias.flat();
  const lons = todos.map((p) => p.lon);
  const lats = todos.map((p) => p.lat);
  const ancho = Math.max(...lons) - Math.min(...lons) || 1;
  const altura = Math.max(...lats) - Math.min(...lats) || 1;
  const aplasta = Math.cos((((Math.max(...lats) + Math.min(...lats)) / 2) * Math.PI) / 180) || 1;
  const escala = Math.min(520 / (ancho * aplasta), 300 / altura);
  const x = (p: Punto): number => 40 + (p.lon - Math.min(...lons)) * aplasta * escala;
  const y = (p: Punto): number => 40 + (Math.max(...lats) - p.lat) * escala;
  let n = 0;
  return (
    <svg className="se-dibuja" viewBox="0 0 600 380" role="img" aria-label="El Dorado">
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} className="se-dibuja__red" x1={60 * (i + 1)} y1="0" x2={60 * (i + 1)} y2="380" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} className="se-dibuja__red" x1="0" y1={63 * (i + 1)} x2="600" y2={63 * (i + 1)} />
      ))}
      {dias.map((d, i) => (
        <polyline
          key={i}
          className="se-dibuja__dia"
          pathLength={1}
          style={{ animationDelay: `${0.4 + i * 1.5}s` }}
          points={d.map((p) => `${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(" ")}
        />
      ))}
      {dias.flatMap((d, i) =>
        d.map((p, j) => {
          n++;
          const retraso = 0.4 + i * 1.5 + (j / Math.max(1, d.length - 1)) * 1.2;
          return (
            <g key={`${i}-${j}`} className="se-dibuja__parada" style={{ animationDelay: `${retraso}s` }}>
              <circle cx={x(p).toFixed(1)} cy={y(p).toFixed(1)} r="11" />
              <text x={x(p).toFixed(1)} y={(y(p) + 3.6).toFixed(1)}>
                {n}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

export default function Portada() {
  const t = TEXTOS[useIdioma()];
  const viaje = useGrabado()?.viaje ?? null;
  const deParada = new Map((viaje?.paradas ?? []).map((p) => [p.id, p.punto]));
  const dias = viaje ? viaje.dias.map((d) => d.paradas.flatMap((id) => deParada.get(id) ?? [])) : DE_ADORNO;
  return (
    <div className="portada">
      <header className="portada__barra">
        <span className="portada__marca">
          <span className="marca__sol" aria-hidden="true" />
          El Dorado
        </span>
        <nav className="cabecera__linea" aria-label="El Dorado">
          <Link className="enlace" href="/trips">
            {t.portada.panel}
          </Link>
          <Link className="boton boton--tinta boton--chico" href="/plan">
            {t.portada.entrar}
          </Link>
        </nav>
      </header>

      <section className="portada__alto">
        <div className="portada__texto">
          <h1 className="portada__lema">{t.portada.lema}</h1>
          <p>{t.portada.cuerpo}</p>
          <div className="cabecera__linea">
            <Link className="boton" href="/plan">
              {t.portada.entrar}
            </Link>
            {viaje !== null && (
              <Link className="enlace" href="/plan?at=live">
                {t.mundo.ejemplo}
              </Link>
            )}
          </div>
        </div>
        <ViajeQueSeDibuja dias={dias.filter((d) => d.length > 0)} />
      </section>

      <section className="portada__pasos">
        {t.portada.pasos.map(([titulo, texto], i) => (
          <div key={titulo}>
            <span className="portada__n">{i + 1}</span>
            <h2 className="titulo">{titulo}</h2>
            <p>{texto}</p>
          </div>
        ))}
      </section>

      <section className="portada__cuida">
        <h2 className="titulo">{t.portada.cuida}</h2>
        <ul>
          {t.portada.cuidados.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <footer className="portada__pie">
        <span className="rotulo">{t.portada.beta}</span>
        <span className="credito">{t.ia}</span>
      </footer>
    </div>
  );
}
