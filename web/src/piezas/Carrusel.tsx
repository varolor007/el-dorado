"use client";

// Lo que se ve mientras trabaja la IA, en cualquier paso (el PM, 26-nov): la señal de que trabaja, con lo que está
// haciendo y desde cuándo, y un carrusel de sitios de verdad del destino, con su foto, su autor y una curiosidad de su
// artículo. Nada de esto es progreso de mentira: el reloj es el de verdad y las cartas, lo ya encontrado.

import { useEffect, useState } from "react";
import { SEGUNDOS_POR_CARTA } from "../../../agent/data/carrusel.ts";
import type { Carta } from "../../../agent/scripts/carrusel.ts";
import { useCarrusel } from "../lib/carrusel.ts";
import { reloj } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { foto } from "../lib/usar.ts";

/** Lo que está haciendo la IA y desde cuándo (en milisegundos de la época); sin «desde», desde que se ve. */
export function SenalDeTrabajo({ que, desde }: { que: string | null; desde?: number }) {
  const [inicio] = useState(() => desde ?? Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const r = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(r);
  }, []);
  const empieza = desde ?? inicio;
  return (
    <p className="trabaja" role="status">
      <span className="trabaja__pulso" aria-hidden="true" />
      {que !== null && <span>{que}</span>}
      <span className="dato trabaja__reloj">{reloj(ahora - empieza)}</span>
    </p>
  );
}

type Props = {
  t: Textos;
  /** El viaje tuyo, por su identificador en la casa: de él salen las cartas. */
  viaje: string;
  /** Lo que está haciendo la IA, para la señal; null si ya lo dice la pantalla. */
  que: string | null;
  desde?: number;
};

export function Carrusel({ t, viaje, que, desde }: Props) {
  const cartas = useCarrusel(viaje, true);
  return (
    <div className="carrusel">
      <SenalDeTrabajo que={que} desde={desde} />
      {cartas.length > 0 && <Cartas t={t} cartas={cartas} />}
    </div>
  );
}

function Cartas({ t, cartas }: { t: Textos; cartas: Carta[] }) {
  const x = t.carrusel;
  const [n, setN] = useState(0);
  const [quieto, setQuieto] = useState(false);
  useEffect(() => {
    if (quieto || cartas.length < 2) return;
    const r = setInterval(() => setN((i) => (i + 1) % cartas.length), SEGUNDOS_POR_CARTA * 1000);
    return () => clearInterval(r);
  }, [quieto, cartas.length]);
  // Una foto que no llega no deja un hueco gris: esa carta sigue sin ella.
  const [sinFoto, setSinFoto] = useState<Set<string>>(() => new Set());
  const c = cartas[n % cartas.length];
  const suFoto = c.foto !== null && !sinFoto.has(c.id) ? c.foto : null;
  const credito = c.foto === null ? null : [c.foto.autor, c.foto.licencia].filter((v) => v !== null).join(", ");
  return (
    <figure
      className="carrusel__carta"
      aria-roledescription={x.rotulo}
      aria-label={x.carta(n + 1, cartas.length, c.nombre)}
      onMouseEnter={() => setQuieto(true)}
      onMouseLeave={() => setQuieto(false)}
      onFocus={() => setQuieto(true)}
      onBlur={() => setQuieto(false)}
    >
      {suFoto !== null && (
        <img
          key={c.id}
          className="carrusel__foto"
          src={foto(suFoto.url, 640)}
          alt={c.nombre}
          onError={() => setSinFoto((antes) => new Set(antes).add(c.id))}
        />
      )}
      <figcaption key={`${c.id}-texto`} className="carrusel__pie">
        <span className="rotulo">{x.mientras}</span>
        <b className="carrusel__nombre">{c.nombre}</b>
        {c.texto !== null && <p className="carrusel__texto">{c.texto}</p>}
        <span className="dato carrusel__credito">
          {credito !== null && credito !== "" && (
            <>
              {c.foto?.pagina !== null && c.foto?.pagina !== undefined ? (
                <a href={c.foto.pagina} target="_blank" rel="noopener noreferrer nofollow">
                  {x.foto(credito)}
                </a>
              ) : (
                x.foto(credito)
              )}
            </>
          )}
          {c.texto !== null && c.articulo !== null && (
            <>
              <a href={c.articulo} target="_blank" rel="noopener noreferrer nofollow">
                {x.wikipedia}
              </a>
            </>
          )}
        </span>
      </figcaption>
      {cartas.length > 1 && (
        <div className="carrusel__puntos">
          {cartas.map((d, i) => (
            <button
              key={d.id}
              type="button"
              className="carrusel__punto"
              aria-pressed={i === n % cartas.length}
              aria-label={x.carta(i + 1, cartas.length, d.nombre)}
              onClick={() => setN(i)}
            />
          ))}
        </div>
      )}
    </figure>
  );
}
