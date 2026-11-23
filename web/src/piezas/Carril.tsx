"use client";

// El carril del panel: por dónde se va de una parte a otra. A un lado en una pantalla ancha; abajo en el móvil.
// También calienta el mapa en cuanto se entra en el panel, para que al abrirlo no tarde.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { TEXTOS } from "../lib/textos.ts";
import { useIdioma } from "../lib/usar.ts";

// Los dibujos del carril, en trazos: un sitio en el mapa, una lista y una llave.
const TRAZOS = {
  planear:
    "M10 2.5c-3 0-5.2 2.2-5.2 5.1 0 3.6 5.2 9.4 5.2 9.4s5.2-5.8 5.2-9.4c0-2.9-2.2-5.1-5.2-5.1z" +
    "m0 7a2 2 0 110-4 2 2 0 010 4z",
  viajes: "M3 4.5h14v3H3zm0 4.8h14v3H3zm0 4.8h9v3H3z",
  clave:
    "M12.8 2.5a4.7 4.7 0 00-4.5 6.2L2.5 14.5v3h3.2v-2h2v-2h2l1.6-1.6a4.7 4.7 0 101.5-9.4z" +
    "m1.3 4.7a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6z",
};

export function Carril() {
  const donde = usePathname();
  const t = TEXTOS[useIdioma()].carril;

  useEffect(() => {
    // El código del mapa y sus ayudantes se cargan ya, aunque estés en otra parte del panel.
    void import("maplibre-gl").then((m) => m.default.prewarm());
  }, []);

  const sitios = [
    { href: "/plan", nombre: t.planear, trazo: TRAZOS.planear },
    { href: "/trips", nombre: t.viajes, trazo: TRAZOS.viajes },
    { href: "/key", nombre: t.clave, trazo: TRAZOS.clave },
  ];
  return (
    <nav className="carril" aria-label="El Dorado">
      <Link className="carril__marca" href="/" aria-label={t.portada}>
        <span className="marca__sol" aria-hidden="true" />
      </Link>
      <ul>
        {sitios.map((s) => (
          <li key={s.href}>
            <Link href={s.href} aria-current={donde === s.href ? "page" : undefined}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d={s.trazo} />
              </svg>
              <span>{s.nombre}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
