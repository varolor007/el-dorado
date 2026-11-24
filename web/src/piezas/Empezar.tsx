"use client";

// Empezar un viaje de verdad: el botón, las preguntas de unos toques y lo que he entendido, con lo supuesto a la
// vista para que lo confirmes o lo corrijas. Lo entendido lo hace el código de la casa (`agent/scripts/empezar.ts`)
// y, en cuanto está completo, el viaje se abre en la casa y se va guardando: lo retomas donde lo dejaste.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MONEDA_DE, monedaDe } from "../../../agent/data/monedas.ts";
import { VIAJEROS } from "../../../agent/data/viaje.ts";
import { entendidoDe, type Respuestas } from "../../../agent/scripts/empezar.ts";
import { CUANTO_MOVERSE, GASTOS, type Entendido } from "../../../agent/scripts/formas.ts";
import type { EstadoDeLaCuenta } from "../lib/cuenta.ts";
import { diaCorto, noches } from "../lib/formato.ts";
import type { Lugar, Origen } from "../lib/lugares.ts";
import type { Textos } from "../lib/textos.ts";
import { abrirViaje, cambiarLoEntendido, empezarLaInvestigacion, type FalloDeViaje } from "../lib/viajeVivo.ts";
import { Hoja } from "./Hoja.tsx";
import { Contador } from "./Pantallas.tsx";

/** El techo de gasto que se propone, en dólares. De partida, hasta medir lo que cuesta una investigación. */
export const TECHO_PROPUESTO = 5;

type Opcion<T> = { valor: T; texto: string };

/** Una pregunta con sus respuestas, de las que se marca una. Sin marcar, el viajero aún no lo ha dicho. */
function Una<T extends string | boolean>(x: {
  titulo: string;
  opciones: Opcion<T>[];
  valor: T | null;
  alElegir: (v: T) => void;
}) {
  return (
    <div className="toques" role="group" aria-label={x.titulo}>
      <span className="rotulo">{x.titulo}</span>
      <div className="cabecera__linea">
        {x.opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            className="toque"
            aria-pressed={x.valor === o.valor}
            onClick={() => x.alElegir(o.valor)}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

/** De dónde sales: se escribe y se elige de lo que propone el buscador, o se deja ver dónde estás. */
function DeDonde({
  t,
  idioma,
  origen,
  alElegir,
}: Comun & { origen: Origen | null; alElegir: (o: Origen | null) => void }) {
  const [texto, setTexto] = useState(origen?.nombre ?? "");
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    if (!abierta || texto.trim().length < 2) return setLugares([]);
    const corta = new AbortController();
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(texto)}&lang=${idioma}`, { signal: corta.signal });
        setLugares(((await r.json()) as { lugares: Lugar[] }).lugares);
      } catch {
        // Si el buscador no responde, no se propone nada: se puede seguir escribiendo.
      }
    }, 220);
    return () => {
      clearTimeout(espera);
      corta.abort();
    };
  }, [texto, abierta, idioma]);

  const elige = (o: Origen): void => {
    setTexto(o.nombre);
    setAbierta(false);
    setAviso(false);
    alElegir(o);
  };
  const dondeEstoy = (): void => {
    if (!("geolocation" in navigator)) return setAviso(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await fetch(`/api/places?near=${p.coords.latitude.toFixed(2)},${p.coords.longitude.toFixed(2)}`);
          const o = ((await r.json()) as { origen: Origen | null }).origen;
          if (o === null) setAviso(true);
          else elige(o);
        } catch {
          setAviso(true);
        }
      },
      () => setAviso(true),
      { maximumAge: 600_000, timeout: 8000 },
    );
  };

  return (
    <div className="toques" role="group" aria-label={t.preguntas.origen}>
      <span className="rotulo">{t.preguntas.origen}</span>
      <div className="origen">
        <input
          className="campo"
          id="origen"
          value={texto}
          autoComplete="off"
          placeholder={t.empezar.origenDonde}
          aria-label={t.empezar.origenDonde}
          role="combobox"
          aria-expanded={abierta && lugares.length > 0}
          aria-controls="origenes"
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierta(true);
            // Lo escrito a medias no es un sitio: hasta que se elige de la lista, no hay de dónde salir.
            if (origen !== null) alElegir(null);
          }}
          onFocus={() => setAbierta(true)}
          onKeyDown={(e) => e.key === "Escape" && setAbierta(false)}
        />
        <button type="button" className="toque" onClick={dondeEstoy}>
          {t.empezar.dondeEstoy}
        </button>
      </div>
      {abierta && lugares.length > 0 && (
        <ul className="origen__lista" id="origenes" role="listbox">
          {lugares.map((l) => (
            <li key={`${l.nombre}-${l.donde}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="buscador__lugar"
                onClick={() => elige({ nombre: l.nombre, pais: l.pais })}
              >
                <b>{l.nombre}</b>
                <span>{l.donde}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aviso && <p className="dato">{t.empezar.sinUbicacion}</p>}
    </div>
  );
}

type Comun = { t: Textos; idioma: string };

type Props = Comun & {
  inicial: Respuestas;
  /** El identificador del viaje, si ya está abierto en la casa. */
  viaje: string | null;
  cuenta: EstadoDeLaCuenta;
  alEmpezar: (id: string) => void;
};

export function Empezar({ t, idioma, inicial, viaje, cuenta, alEmpezar }: Props) {
  const p = t.preguntas;
  const x = t.empezar;
  const [r, setR] = useState<Respuestas>(inicial);
  const [dentro, setDentro] = useState(viaje !== null);
  const [distintos, setDistintos] = useState(new Set(inicial.pasaportes ?? []).size > 1);
  const [techo, setTecho] = useState(String(TECHO_PROPUESTO));
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = useRef<string | null>(viaje);
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const pon = (cambio: Partial<Respuestas>): void => setR((antes) => ({ ...antes, ...cambio }));

  const e = useMemo(() => entendidoDe(r), [r]);
  const supuesto = (campo: string): string => (e.supuesto.includes(campo) ? ` (${x.supuesto})` : "");
  const conSesion = typeof cuenta === "object" && cuenta !== null;
  const conClave = conSesion && cuenta.key !== null;

  // Los países y las monedas, con su nombre en el idioma de quien mira.
  const paises = useMemo(() => {
    const nombres = new Intl.DisplayNames(idioma, { type: "region" });
    return [...MONEDA_DE.keys()]
      .map((codigo) => ({ codigo, nombre: nombres.of(codigo) ?? codigo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, idioma));
  }, [idioma]);
  const monedas = useMemo(() => {
    const nombres = new Intl.DisplayNames(idioma, { type: "currency" });
    return [...new Set(MONEDA_DE.values())].sort().map((codigo) => ({ codigo, nombre: nombres.of(codigo) ?? codigo }));
  }, [idioma]);

  // Guardar en la casa, de uno en uno y en su orden: el primero abre el viaje y los demás lo cambian.
  const guarda = (entendido: Entendido): Promise<FalloDeViaje | null> => {
    const turno = cola.current.then(async () => {
      if (id.current !== null) return cambiarLoEntendido(id.current, entendido);
      const abierto = await abrirViaje(entendido);
      if (!("id" in abierto)) return abierto;
      id.current = abierto.id;
      // La dirección pasa a ser la del viaje: al volver a ella, se retoma donde se dejó.
      const direccion = new URL(window.location.href);
      direccion.searchParams.set("trip", abierto.id);
      window.history.replaceState(null, "", direccion);
      return null;
    });
    cola.current = turno.catch(() => null);
    return turno;
  };
  useEffect(() => {
    if (!dentro || !conSesion || e.entendido === null) return;
    const entendido = e.entendido;
    const espera = setTimeout(() => void guarda(entendido).catch(() => null), 900);
    return () => clearTimeout(espera);
  }, [dentro, conSesion, e]);

  const confirma = async (): Promise<void> => {
    if (e.entendido === null || ocupado) return;
    const tope = Number(techo.replace(",", "."));
    if (!(Number.isFinite(tope) && tope > 0)) return setFallo(x.fallo("bad_ceiling", []));
    setOcupado(true);
    setFallo(null);
    let mal: FalloDeViaje | null;
    try {
      mal =
        (await guarda(e.entendido)) ?? (id.current === null ? null : await empezarLaInvestigacion(id.current, tope));
    } catch {
      mal = { clave: "other", campos: [] };
    }
    setOcupado(false);
    if (mal !== null)
      return setFallo(
        x.fallo(
          mal.clave,
          mal.campos.map((c) => x.campos[c] ?? c),
        ),
      );
    if (id.current !== null) alEmpezar(id.current);
  };

  const viajeros = (r.adultos ?? e.entendido?.travellers.adults ?? 2) + r.ninos.length;
  const adultos = r.adultos ?? 2;
  const habitaciones = r.habitaciones ?? 1;
  // El pasaporte: uno para todos o, si no todos tienen el mismo, el de cada uno.
  const delPrimero = r.pasaportes?.[0] ?? "";
  const todos = (codigo: string): void => pon({ pasaportes: Array.from({ length: viajeros }, () => codigo) });
  const elDe = (n: number, codigo: string): void =>
    pon({ pasaportes: Array.from({ length: viajeros }, (_, i) => (i === n ? codigo : (r.pasaportes?.[i] ?? ""))) });
  const cuantos = (masAdultos: number, edades: (number | null)[]): void => {
    const total = masAdultos + edades.length;
    // Quien se suma hereda el pasaporte del primero; quien se va, se lleva el suyo.
    const pasaportes =
      r.pasaportes === null ? null : Array.from({ length: total }, (_, i) => r.pasaportes?.[i] ?? delPrimero);
    pon({ adultos: masAdultos, ninos: edades, habitaciones: Math.min(habitaciones, masAdultos), pasaportes });
  };
  const elPais = (valor: string, etiqueta: string, alCambiar: (codigo: string) => void) => (
    <select className="toque" aria-label={etiqueta} value={valor} onChange={(ev) => alCambiar(ev.target.value)}>
      <option value="" disabled>
        {x.paisSinDecir}
      </option>
      {paises.map((pais) => (
        <option key={pais.codigo} value={pais.codigo}>
          {pais.nombre}
        </option>
      ))}
    </select>
  );
  const siONo: Opcion<boolean>[] = [
    { valor: true, texto: x.si },
    { valor: false, texto: x.no },
  ];
  const n = noches(r.entrada, r.salida);

  const pie = !conSesion ? (
    <Link className="boton boton--ancho" href="/account">
      {x.entra}
    </Link>
  ) : !conClave ? (
    <Link className="boton boton--ancho" href="/key">
      {x.ponClave}
    </Link>
  ) : !dentro ? (
    <div className="pie-columna">
      <button type="button" className="boton boton--ancho" onClick={() => setDentro(true)}>
        {t.vistazo.empezar}
      </button>
      <span className="dato">{t.vistazo.gasta}</span>
    </div>
  ) : (
    <div className="pie-columna">
      <button
        type="button"
        className="boton boton--ancho"
        disabled={e.entendido === null || ocupado}
        onClick={() => void confirma()}
      >
        {x.confirmar}
      </button>
      {fallo !== null && (
        <p className="aviso" role="alert">
          {fallo}
        </p>
      )}
    </div>
  );

  return (
    <Hoja etiqueta={x.rotulo} corta={!dentro} pie={cuenta === undefined ? undefined : pie}>
      <div className="cabecera">
        <span className="rotulo">{x.rotulo}</span>
        <h1 className="lugar">{r.destino.nombre}</h1>
        <div className="cabecera__linea">
          <span className="pastilla">
            {diaCorto(r.entrada, idioma)} → {diaCorto(r.salida, idioma)}
          </span>
          <span className="pastilla">{t.vistazo.noches(n)}</span>
        </div>
      </div>
      {dentro && (
        <div className="preguntas">
          <h2 className="titulo">{x.preguntas}</h2>
          <DeDonde
            t={t}
            idioma={idioma}
            origen={r.origen}
            alElegir={(origen) =>
              // La moneda se propone por el país del que sales, si aún no la has dicho.
              pon({ origen, moneda: r.moneda ?? monedaDe(origen?.pais) })
            }
          />
          <div className="toques" role="group" aria-label={p.quienes}>
            <span className="rotulo">{p.quienes}</span>
            <div className="cabecera__linea">
              <Contador
                texto={t.vistazo.adultos(adultos)}
                n={adultos}
                minimo={1}
                maximo={VIAJEROS.adultos}
                menos={p.menos}
                mas={p.mas}
                alCambiar={(cuantosAdultos) => cuantos(cuantosAdultos, r.ninos)}
              />
              <Contador
                texto={p.ninos(r.ninos.length)}
                n={r.ninos.length}
                minimo={0}
                maximo={VIAJEROS.ninos}
                menos={p.menos}
                mas={p.mas}
                alCambiar={(k) => cuantos(adultos, k < r.ninos.length ? r.ninos.slice(0, k) : [...r.ninos, null])}
              />
              <Contador
                texto={t.vistazo.habitaciones(habitaciones)}
                n={habitaciones}
                minimo={1}
                maximo={adultos}
                menos={p.menos}
                mas={p.mas}
                alCambiar={(k) => pon({ adultos, habitaciones: k })}
              />
            </div>
            {r.ninos.length > 0 && (
              <div className="cabecera__linea">
                {r.ninos.map((edad, i) => (
                  <select
                    key={i}
                    className="toque"
                    aria-label={p.edad(i + 1)}
                    value={edad ?? ""}
                    onChange={(ev) => pon({ ninos: r.ninos.map((v, j) => (j === i ? Number(ev.target.value) : v)) })}
                  >
                    <option value="" disabled>
                      {p.edadSinDecir}
                    </option>
                    {Array.from({ length: VIAJEROS.edadDeNino + 1 }, (_, anos) => (
                      <option key={anos} value={anos}>
                        {p.anos(anos)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            )}
          </div>
          <div className="toques" role="group" aria-label={x.pasaporte}>
            <span className="rotulo">{x.pasaporte}</span>
            <div className="cabecera__linea">
              {distintos
                ? Array.from({ length: viajeros }, (_, i) => (
                    <span key={i}>{elPais(r.pasaportes?.[i] ?? "", x.pasaporteDe(i + 1), (c) => elDe(i, c))}</span>
                  ))
                : elPais(delPrimero, x.pasaporte, todos)}
              {viajeros > 1 && (
                <button
                  type="button"
                  className="toque"
                  aria-pressed={distintos}
                  onClick={() => {
                    if (distintos && delPrimero !== "") todos(delPrimero);
                    setDistintos(!distintos);
                  }}
                >
                  {x.distintos}
                </button>
              )}
            </div>
          </div>
          <Una
            titulo={p.fechas}
            opciones={[
              { valor: false, texto: p.fechasOpciones[0] },
              { valor: true, texto: p.fechasOpciones[1] },
            ]}
            valor={r.fechasMovibles}
            alElegir={(fechasMovibles) => pon({ fechasMovibles })}
          />
          <Una
            titulo={p.gasto}
            opciones={GASTOS.map((valor, i) => ({ valor, texto: p.gastoOpciones[i] }))}
            valor={r.gasto}
            alElegir={(gasto) => pon({ gasto })}
          />
          <label className="toques">
            <span className="rotulo">{x.moneda}</span>
            <select
              className="toque toque--ancho"
              value={r.moneda ?? ""}
              onChange={(ev) => pon({ moneda: ev.target.value })}
            >
              <option value="" disabled>
                {x.monedaSinDecir}
              </option>
              {monedas.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo}, {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="toques" role="group" aria-label={p.buscas}>
            <span className="rotulo">{p.buscas}</span>
            <div className="cabecera__linea">
              {p.buscasOpciones.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="toque"
                  aria-pressed={r.buscas.includes(o)}
                  onClick={() =>
                    pon({ buscas: r.buscas.includes(o) ? r.buscas.filter((b) => b !== o) : [...r.buscas, o] })
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          {r.destino.clase !== "city" && (
            <>
              <Una
                titulo={x.variosSitios}
                opciones={siONo}
                valor={r.moverse.variosSitios}
                alElegir={(variosSitios) => pon({ moverse: { ...r.moverse, variosSitios } })}
              />
              <Una
                titulo={x.salirDelPais}
                opciones={siONo}
                valor={r.moverse.salirDelPais}
                alElegir={(salirDelPais) => pon({ moverse: { ...r.moverse, salirDelPais } })}
              />
              <Una
                titulo={x.cuanto}
                opciones={CUANTO_MOVERSE.map((valor) => ({ valor, texto: x.cuantoOpciones[valor] }))}
                valor={r.moverse.cuanto}
                alElegir={(cuanto) => pon({ moverse: { ...r.moverse, cuanto } })}
              />
            </>
          )}
          <label className="toques">
            <span className="rotulo">{x.reservado}</span>
            <input
              className="campo"
              id="reservado"
              type="text"
              autoComplete="off"
              maxLength={300}
              placeholder={x.reservadoQue}
              value={r.reservado}
              onChange={(ev) => pon({ reservado: ev.target.value })}
            />
          </label>
          <label className="toques">
            <span className="rotulo">{p.libre}</span>
            <input
              className="campo"
              id="algo-mas"
              type="text"
              autoComplete="off"
              maxLength={300}
              value={r.libre}
              onChange={(ev) => pon({ libre: ev.target.value })}
            />
          </label>

          <div className="toques" aria-live="polite">
            <h2 className="titulo">{x.entendido}</h2>
            <div className="cabecera__linea">
              <span className="pastilla">
                {r.origen === null ? r.destino.nombre : `${r.origen.nombre} → ${r.destino.nombre}`}
              </span>
              <span className="pastilla">
                {t.vistazo.adultos(adultos)}
                {supuesto("travellers.adults")}
              </span>
              {r.ninos.length > 0 && <span className="pastilla">{p.ninos(r.ninos.length)}</span>}
              <span className="pastilla">
                {t.vistazo.habitaciones(habitaciones)}
                {supuesto("travellers.rooms")}
              </span>
              <span className="pastilla">
                {p.fechas}: {p.fechasOpciones[r.fechasMovibles ? 1 : 0]}
                {supuesto("dates.flexible")}
              </span>
              <span className="pastilla">
                {p.gasto}: {p.gastoOpciones[GASTOS.indexOf(r.gasto ?? "medium")]}
                {supuesto("budget")}
              </span>
              {r.moneda !== null && <span className="pastilla">{r.moneda}</span>}
            </div>
            {r.origen === null && <p className="dato">{x.sinOrigen}</p>}
            {e.falta.length > 0 && (
              <div className="aviso">
                <div>
                  {x.falta}
                  <ul className="aviso__lista">
                    {e.falta.map((campo) => (
                      <li key={campo}>{x.faltas[campo] ?? campo}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <label className="toques">
            <span className="rotulo">{x.techo}</span>
            <input
              className="campo"
              id="techo"
              inputMode="decimal"
              value={techo}
              onChange={(ev) => setTecho(ev.target.value)}
            />
            <span className="dato">{x.techoTexto}</span>
          </label>
        </div>
      )}
    </Hoja>
  );
}
