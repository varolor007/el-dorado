"use client";

// Las capas del destino en la web (bloque 14): la pestaña «Allí», con cómo moverse, lo que conviene saber y las
// entradas; el hueco de la entrada y el horario de una parada; y el del presupuesto entero en las cuentas. Es el
// suelo (14.1): enseña lo que se sabe y lo que no, por claves. La pantalla de verdad la hace 14.6, aquí mismo.

import type { DeLasEntradas, Presupuesto, Viaje } from "../../../agent/output/viaje.ts";
import { entradaDe } from "../../../agent/scripts/capas.ts";
import { dinero } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";

type Comun = { t: Textos; idioma: string };

/** Cómo está una capa: si no está, si falta (con su porqué) o cuántas cosas trae. */
function estadoDe(t: Textos, capa: { falta: string | null } | undefined, cuantas: number): string {
  if (capa === undefined) return t.alli.todaviaNo;
  if (capa.falta !== null) return t.alli.falta[capa.falta] ?? t.alli.todaviaNo;
  return cuantas === 0 ? t.alli.todaviaNo : t.alli.cuantas(cuantas);
}

/** La pestaña «Allí»: cada capa con lo que se sabe de ella, o que todavía no se sabe. */
export function Alli({ t, viaje }: Comun & { viaje: Viaje }) {
  const m = viaje.moverse;
  const capas = [
    {
      clave: "moverse",
      rotulo: t.alli.moverse,
      estado: estadoDe(t, m, m === undefined ? 0 : m.llegar.length + m.transportes.length + m.billetes.length),
    },
    { clave: "saber", rotulo: t.alli.saber, estado: estadoDe(t, viaje.saber, viaje.saber?.cosas.length ?? 0) },
    {
      clave: "entradas",
      rotulo: t.alli.entradas,
      estado: estadoDe(t, viaje.entradas, viaje.entradas?.sitios.length ?? 0),
    },
  ];
  return (
    <>
      {capas.map((c) => (
        <div className="grupo" key={c.clave}>
          <h2 className="titulo">{c.rotulo}</h2>
          <p className="suave">{c.estado}</p>
        </div>
      ))}
    </>
  );
}

/** El hueco de la entrada y el horario de una parada: nada si no se sabe. */
export function EntradaDeLaParada({ t, entradas, parada }: { t: Textos; entradas?: DeLasEntradas; parada: string }) {
  const e = entradaDe(entradas, parada);
  if (e === null || (e.precios === null && e.horarios === null)) return null;
  return <span className="pastilla">{t.alli.conEntrada}</span>;
}

/** El hueco del presupuesto entero en las cuentas, de la manera marcada: lo que se sabe y cuántas cosas faltan. */
export function ElPresupuesto({
  t,
  idioma,
  presupuesto,
  manera,
}: Comun & { presupuesto?: Presupuesto; manera: string }) {
  const suyo = presupuesto?.falta === null ? presupuesto.maneras.find((x) => x.manera === manera) : undefined;
  return (
    <div className="grupo">
      <h2 className="titulo">{t.alli.presupuesto}</h2>
      {suyo === undefined ? (
        <p className="suave">
          {presupuesto?.falta ? (t.alli.falta[presupuesto.falta] ?? t.alli.todaviaNo) : t.alli.todaviaNo}
        </p>
      ) : (
        <>
          <p className="dato">{t.alli.total(dinero(suyo.total, suyo.moneda, idioma))}</p>
          <p className="suave">{t.alli.faltan(suyo.faltan)}</p>
        </>
      )}
    </div>
  );
}
