"use client";

// El transporte de tu viaje, a ratos (el momento 5 de la hoja, 8.3). Lo abres: el que tienes, con sus horas, sus
// escalas, lo que se sabe de lo que incluye y su precio con su fecha; o por qué no lo hay. Lo buscas otra vez, movido
// a donde quieras (otro día, otro aeropuerto, otro horario, solo directos): código, sin IA. Cada opción dice lo que
// cambia con los números de la casa; al elegir una, se enseña su impacto antes de nada y se pide tu adelante. Y si la
// versión que ves salió de cambiar el transporte, lo de antes y lo de ahora, con quedarte con este o volver. Todo por
// claves y números: ninguna frase de un asiento, ni su nombre.

import { useEffect, useState } from "react";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import type { Manera, Transporte, Viaje } from "../../../agent/output/viaje.ts";
import { HORARIOS, DIAS_QUE_SE_MUEVE_UN_VUELO } from "../../../agent/data/transporte.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import { diaCorto, diaDeLaSemana, dinero, duracion } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { ElImpacto } from "./Momentos.tsx";

type Comun = { t: Textos; idioma: string };

/** Un vuelo como lo dice la casa: lo de la fuente que sirve para enseñarlo. */
type VueloDeCara = {
  from: string;
  to: string;
  out: string;
  back: string | null;
  airline: string | null;
  number: string | null;
  stops_out: number | null;
  stops_back: number | null;
  minutes_out: number | null;
  arrives: string | null;
  seen: string;
  saved: boolean;
};

type Lugar = { code: string; name: string; country: string | null; km: number | null };

type Opcion = {
  id: string;
  flight: VueloDeCara;
  total: number;
  currency: string;
  difference: number | null;
  nights: { check_in: string; check_out: string; count: number; changed: boolean };
  new_countries: string[];
  country_unknown: boolean;
  stops: boolean;
  changes: string[];
};

type Busqueda = { n: number; from: Lugar[]; to: Lugar[]; options: Opcion[]; left_out: number; none: boolean };

/** Lo que dice la casa del transporte de tu viaje. */
type DeLaCasa = {
  version: number;
  transport: Transporte | null;
  flight: VueloDeCara | null;
  none: string | null;
  next_to: Transporte | null;
  /** Los países de los aeropuertos del que tienes para los que no se han mirado tus papeles. */
  new_countries?: string[];
  country_unknown?: boolean;
  travellers: number;
  search: Busqueda | null;
  before: {
    version: number | null;
    ways: { way: Manera["id"]; before: number; now: number; difference: number; currency: string }[];
  } | null;
};

type Pedido = {
  out: number;
  back: number;
  departure: string | null;
  arrival: string | null;
  hours: string;
  direct: boolean;
};
const SIN_MOVER: Pedido = { out: 0, back: 0, departure: null, arrival: null, hours: "any", direct: false };

/** El nombre de un país por su código, en tu idioma; si el navegador no lo sabe, el código. */
function paisDicho(codigo: string, idioma: string): string {
  try {
    return new Intl.DisplayNames([idioma], { type: "region" }).of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}

/** El día de un momento, con su día de la semana: «Fri 12 Feb». */
const elDia = (iso: string, idioma: string): string =>
  `${diaDeLaSemana(iso.slice(0, 10), idioma)} ${diaCorto(iso.slice(0, 10), idioma)}`;

/** La hora de un momento, como la escribe la fuente (la del sitio): «08:05»; vacía si no la dice. */
const horaDe = (iso: string | null): string => /T(\d{2}:\d{2})/.exec(iso ?? "")?.[1] ?? "";

const DIAS = Array.from({ length: DIAS_QUE_SE_MUEVE_UN_VUELO * 2 + 1 }, (_, i) => i - DIAS_QUE_SE_MUEVE_UN_VUELO);

/** Un trayecto, ida o vuelta: el día, la hora y sus escalas. */
function Tramo({
  t,
  idioma,
  rotulo,
  cuando,
  escalas,
}: Comun & { rotulo: string; cuando: string; escalas: number | null }) {
  const x = t.transporte;
  const dia = cuando.slice(0, 10);
  return (
    <div className="transporte__tramo">
      <span className="rotulo">{rotulo}</span>
      <b>
        {diaDeLaSemana(dia, idioma)} {diaCorto(dia, idioma)} {horaDe(cuando)}
      </b>
      <span className="dato">{escalas === null ? x.escalasNoSe : escalas === 0 ? x.directo : x.escalas(escalas)}</span>
    </div>
  );
}

/** El vuelo que tienes, o el de una opción: de dónde a dónde, la ida y la vuelta, y lo que se sabe de él. */
function ElVuelo({ t, idioma, v }: Comun & { v: VueloDeCara }) {
  const x = t.transporte;
  const datos = [
    v.airline === null ? null : x.con(v.number === null ? v.airline : `${v.airline} ${v.number}`),
    v.minutes_out === null ? null : x.dura(duracion(v.minutes_out)),
    v.arrives === null ? null : x.llega(horaDe(v.arrives)),
  ].filter((d): d is string => d !== null);
  return (
    <>
      <span className="transporte__ruta">
        {v.from} → {v.to}
      </span>
      <div className="transporte__tramos">
        <Tramo t={t} idioma={idioma} rotulo={x.ida} cuando={v.out} escalas={v.stops_out} />
        {v.back !== null && <Tramo t={t} idioma={idioma} rotulo={x.vuelta} cuando={v.back} escalas={v.stops_back} />}
      </div>
      {datos.length > 0 && <span className="dato">{datos.join(", ")}</span>}
    </>
  );
}

/** Lo de la fuente que trae el viaje, si la casa no dice más: el viaje grabado, o mientras llega. */
const delViaje = (x: Transporte): VueloDeCara => ({
  from: x.de,
  to: x.a,
  out: x.sale,
  back: x.vuelve,
  airline: x.precio.vendedor,
  number: null,
  stops_out: x.escalas,
  stops_back: null,
  minutes_out: null,
  arrives: null,
  seen: x.precio.visto,
  saved: x.guardado,
});

export function ElTransporte({
  t,
  idioma,
  viaje,
  manera,
  id,
  cerrado = false,
  alQuedarte,
}: Comun & {
  viaje: Viaje;
  manera: Manera["id"];
  /** Tu viaje en la casa, o null si es el de muestra: entonces no se busca. */
  id: string | null;
  cerrado?: boolean;
  /** Te quedaste con el que tienes: la manera de tu viaje se pinta con él. */
  alQuedarte?: (transporte: string) => void;
}) {
  const x = t.transporte;
  const [casa, setCasa] = useState<DeLaCasa | null>(null);
  const [pedido, setPedido] = useState<Pedido>(SIN_MOVER);
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [elegida, setElegida] = useState<Opcion | null>(null);
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [quedado, setQuedado] = useState(false);

  useEffect(() => {
    if (id === null) return;
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/transporte`).then((r) => {
      if (!vivo || r.estado !== 200) return;
      const dicho = r.cuerpo.transport as DeLaCasa;
      setCasa(dicho);
      setBusqueda(dicho.search);
    });
    return () => {
      vivo = false;
    };
  }, [id]);

  // El que tienes: el de la casa, que es el que elegiste; si no, el de la manera que ves.
  const deLaManera = viaje.transportes.find((tr) => tr.id === viaje.maneras.find((m) => m.id === manera)?.transporte);
  const tuyo = casa === null ? (deLaManera ?? null) : casa.transport;
  const vuelo = casa?.flight ?? (tuyo === null ? null : delViaje(tuyo));
  const viajeros = casa?.travellers ?? viaje.adultos + viaje.ninos.length;
  const alLado = tuyo === null ? (casa?.next_to ?? viaje.transporteAlLado ?? null) : null;
  const porQueNo = casa?.none ?? (tuyo === null ? "no_price" : null);

  const buscar = async (): Promise<void> => {
    if (id === null) return;
    setBuscando(true);
    setFallo(null);
    setElegida(null);
    setImpacto(null);
    const r = await pideALaCasa("POST", `viajes/${id}/transporte`, { move: pedido });
    setBuscando(false);
    if (r.estado === 200) setBusqueda(r.cuerpo.search as Busqueda);
    else setFallo(typeof r.cuerpo.error === "string" ? r.cuerpo.error : "house_down");
  };

  const mirarLaOpcion = async (o: Opcion): Promise<void> => {
    if (id === null) return;
    setElegida(o);
    setImpacto(null);
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/impacto`, { changes: o.changes });
    if (r.estado === 200) setImpacto(r.cuerpo.impact as Impacto);
    else setFallo(typeof r.cuerpo.error === "string" ? r.cuerpo.error : "house_down");
  };

  const adelante = async (): Promise<void> => {
    if (id === null || elegida === null || busqueda === null) return;
    setMandando(true);
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/transporte/elegir`, { search: busqueda.n, option: elegida.id });
    // La investigación ya corre en la casa: el viaje la cuenta en vivo.
    if (r.estado === 202) return window.location.reload();
    setMandando(false);
    setFallo(typeof r.cuerpo.error === "string" ? r.cuerpo.error : "house_down");
  };

  const quedarte = async (): Promise<void> => {
    if (id === null || tuyo === null) return;
    setFallo(null);
    const leidas = await pideALaCasa("GET", `viajes/${id}/elecciones`);
    if (leidas.estado !== 200) return setFallo("house_down");
    const choices = { ...(leidas.cuerpo.choices as object), transport: tuyo.id };
    // Con la versión de la que se leyeron: si mientras tanto se enseña otra, la casa no las guarda encima de ella.
    const r = await pideALaCasa("PUT", `viajes/${id}/elecciones`, { version: leidas.cuerpo.version, choices });
    if (r.estado === 200) {
      setQuedado(true);
      alQuedarte?.(tuyo.id);
    } else setFallo("house_down");
  };

  const volverA = async (n: number): Promise<void> => {
    if (id === null) return;
    const r = await pideALaCasa("POST", `viajes/${id}/volver`, { version: n });
    if (r.estado === 200) return window.location.reload();
    setFallo("house_down");
  };

  const lugares = (cuales: Lugar[], campo: "departure" | "arrival", rotulo: string) =>
    cuales.length > 1 && (
      <label className="transporte__campo">
        <span className="rotulo">{rotulo}</span>
        <select
          className="toque"
          value={pedido[campo] ?? ""}
          onChange={(e) => setPedido({ ...pedido, [campo]: e.target.value === "" ? null : e.target.value })}
        >
          <option value="">{x.losTuyos}</option>
          {cuales.map((l) => (
            <option key={l.code} value={l.code}>
              {x.sitio(l.name, l.code)}
            </option>
          ))}
        </select>
      </label>
    );

  const dias = (campo: "out" | "back", rotulo: string) => (
    <label className="transporte__campo">
      <span className="rotulo">{rotulo}</span>
      <select
        className="toque"
        value={pedido[campo]}
        onChange={(e) => setPedido({ ...pedido, [campo]: Number(e.target.value) })}
      >
        {DIAS.map((n) => (
          <option key={n} value={n}>
            {x.dias(n)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{tuyo === null ? x.titulo : x.clase(tuyo.clase)}</h2>
        {tuyo !== null && vuelo !== null ? (
          <div className="transporte__tuyo">
            <ElVuelo t={t} idioma={idioma} v={vuelo} />
            <span className="transporte__precio">
              {x.precio(dinero(tuyo.precio.total, tuyo.precio.moneda, idioma), viajeros)}
            </span>
            <span className="dato">{x.visto(diaCorto(vuelo.seen.slice(0, 10), idioma))}</span>
            {vuelo.saved && <p className="aviso">{x.guardado}</p>}
            {(casa?.new_countries ?? []).length > 0 && (
              <p className="aviso">
                {x.paisSinMirar((casa?.new_countries ?? []).map((c) => paisDicho(c, idioma)).join(", "))}
              </p>
            )}
            {casa?.country_unknown === true && <p className="aviso">{x.paisNoSe}</p>}
            <p className="dato">{x.incluye}</p>
          </div>
        ) : (
          <>
            {porQueNo !== null && <p className="aviso">{x.ninguno[porQueNo] ?? x.ninguno.no_price}</p>}
            {alLado !== null && (
              <p className="dato">
                {t.vistazo.alLado(
                  elDia(alLado.sale, idioma),
                  elDia(alLado.vuelve ?? "", idioma),
                  dinero(alLado.precio.total, alLado.precio.moneda, idioma),
                )}
              </p>
            )}
          </>
        )}
      </div>

      {casa?.before && casa.before.ways.length > 0 && (
        <div className="grupo">
          <h2 className="titulo">{x.antesYAhora}</h2>
          {casa.before.version !== null && <span className="dato">{x.deLaVersion(casa.before.version)}</span>}
          <ul className="impacto__lista">
            {casa.before.ways.map((w) => (
              <li key={w.way}>
                <span>
                  {t.viaje.manera[w.way]}: {dinero(w.before, w.currency, idioma)} → {dinero(w.now, w.currency, idioma)}
                </span>
                <span className="dato">
                  {w.difference === 0
                    ? x.lomismo
                    : w.difference < 0
                      ? x.ahorras(dinero(-w.difference, w.currency, idioma))
                      : x.pagas(dinero(w.difference, w.currency, idioma))}
                </span>
              </li>
            ))}
          </ul>
          {!cerrado && (
            <div className="pie-columna">
              {quedado ? (
                <p className="dato">{x.quedado}</p>
              ) : (
                <button type="button" className="boton boton--ancho" onClick={() => void quedarte()}>
                  {x.quedarte}
                </button>
              )}
              {casa.before.version !== null && (
                <button type="button" className="enlace" onClick={() => void volverA(casa.before!.version!)}>
                  {x.volverALa(casa.before.version)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grupo">
        <h2 className="titulo">{x.buscar}</h2>
        {cerrado ? (
          <p className="dato">{x.cerrado}</p>
        ) : id === null ? (
          <p className="dato">{x.sinCasa}</p>
        ) : porQueNo === "no_origin" ? (
          <p className="dato">{x.fallo("no_origin")}</p>
        ) : (
          <>
            <p className="suave">{x.buscarDice}</p>
            <div className="transporte__pedido">
              {dias("out", x.salir)}
              {dias("back", x.volver)}
              {lugares(busqueda?.from ?? [], "departure", x.desde)}
              {lugares(busqueda?.to ?? [], "arrival", x.hasta)}
              <label className="transporte__campo">
                <span className="rotulo">{x.horario}</span>
                <select
                  className="toque"
                  value={pedido.hours}
                  onChange={(e) => setPedido({ ...pedido, hours: e.target.value })}
                >
                  {Object.keys(HORARIOS).map((h) => (
                    <option key={h} value={h}>
                      {x.horarios[h]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="toque transporte__directos"
                aria-pressed={pedido.direct}
                onClick={() => setPedido({ ...pedido, direct: !pedido.direct })}
              >
                {x.soloDirectos}
              </button>
            </div>
            <button type="button" className="boton boton--ancho" disabled={buscando} onClick={() => void buscar()}>
              {buscando ? x.mirando : x.mirar}
            </button>
          </>
        )}
        {fallo !== null && <p className="aviso">{x.fallo(fallo)}</p>}
      </div>

      {busqueda !== null && !cerrado && (
        <div className="grupo">
          <h2 className="titulo">{busqueda.none ? x.ninguna : x.opciones(busqueda.options.length)}</h2>
          {busqueda.left_out > 0 && <span className="dato">{x.fuera(busqueda.left_out)}</span>}
          <ol className="transporte__opciones">
            {busqueda.options.map((o) => (
              <li key={o.id} className="transporte__opcion" data-elegida={elegida?.id === o.id}>
                <ElVuelo t={t} idioma={idioma} v={o.flight} />
                <div className="transporte__cifras">
                  <b className="transporte__precio">{x.precio(dinero(o.total, o.currency, idioma), viajeros)}</b>
                  <span className="dato">
                    {o.difference === null
                      ? ""
                      : o.difference === 0
                        ? x.igual
                        : x.diferencia(dinero(Math.abs(o.difference), o.currency, idioma), o.difference > 0)}
                  </span>
                </div>
                <span className="dato">
                  {o.nights.changed
                    ? x.otrasNoches(
                        o.nights.count,
                        diaCorto(o.nights.check_in, idioma),
                        diaCorto(o.nights.check_out, idioma),
                      )
                    : x.mismasNoches}
                </span>
                <span className="dato">{x.visto(diaCorto(o.flight.seen.slice(0, 10), idioma))}</span>
                {o.new_countries.length > 0 && (
                  <p className="aviso">{x.paisNuevo(o.new_countries.map((c) => paisDicho(c, idioma)).join(", "))}</p>
                )}
                {o.country_unknown && <p className="aviso">{x.paisNoSe}</p>}
                {o.stops && <p className="aviso">{x.escalaNoSe}</p>}
                {elegida?.id === o.id ? (
                  <span className="pastilla pastilla--oro">{x.elegida}</span>
                ) : (
                  <button type="button" className="enlace" onClick={() => void mirarLaOpcion(o)}>
                    {x.elegir}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {elegida !== null && impacto !== null && (
        <ElImpacto
          t={t}
          idioma={idioma}
          impacto={impacto}
          alAdelante={() => void adelante()}
          alAhoraNo={() => {
            setElegida(null);
            setImpacto(null);
          }}
          mandando={mandando}
        />
      )}
    </>
  );
}
