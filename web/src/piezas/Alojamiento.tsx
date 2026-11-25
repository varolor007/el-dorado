"use client";

// El alojamiento, a ratos (8.2): lo que haces desde la ficha de un alojamiento de un viaje tuyo. Dormir aquí (tu
// elección, guardada sin versión nueva); tus gustos, cruzados al instante y sin IA con la ficha de cada uno; buscar
// otra vez con otra zona, otros mínimos u otro tope, con lo que cambia y lo que cuesta antes de tu adelante; y una
// pregunta sobre este sitio, que se contesta con su prueba. Todo por claves y números: la única frase de un asiento
// que llega es la respuesta, que ha pasado su puerta de palabras.

import { useEffect, useState } from "react";
import { RADIOS_QUE_SE_OFRECEN } from "../../../agent/data/alojamiento.ts";
import { COSAS } from "../../../agent/data/gustos.ts";
import type { Alojamiento, Manera, Viaje } from "../../../agent/output/viaje.ts";
import {
  centroDeLoQueVes,
  conTuAlojamiento,
  type GustoMarcado,
  type PesoDeGusto,
} from "../../../agent/scripts/alojamiento.ts";
import type { Impacto } from "../../../agent/scripts/impacto.ts";
import { pideALaCasa } from "../lib/cuenta.ts";
import { dinero } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { foto } from "../lib/usar.ts";
import { ElImpacto } from "./Momentos.tsx";

type Comun = { t: Textos; idioma: string };

const PESOS: PesoDeGusto[] = ["must", "like", "indifferent"];
const NOTAS = [0, 7, 7.5, 8, 8.5, 9];
const OPINIONES = [0, 10, 30, 100, 200, 500];
const ESTRELLAS = [0, 2, 3, 4, 5];

/** Un gasto de IA, con sus céntimos. */
const conCentimos = (usd: number, idioma: string): string =>
  new Intl.NumberFormat(idioma, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(usd);

type ConTusGustos = { id: string; score: number | null; discarded: unknown; unknown_musts: string[] };

/** Lo que dice la casa de una pregunta sobre un alojamiento. */
type Pregunta = {
  n: number;
  lodging: string;
  question: string;
  state: "working" | "ready" | "stopped";
  answer: string | null;
  says: string | null;
  evidence: { kind: string; photo: string | null }[];
};

type Props = Comun & {
  /** El viaje tuyo, por su identificador en la casa. */
  id: string;
  viaje: Viaje;
  a: Alojamiento;
  manera: Manera | null;
  /** Dónde duermes ahora: el que elegiste, o el de la manera. */
  duermes: string | null;
  /** Tus gustos marcados; null si no los has tocado. */
  gustos: GustoMarcado[] | null;
  alGustos: (g: GustoMarcado[]) => void;
  /** Eliges dormir aquí, o vuelves al de la manera con null. */
  alElegir: (id: string | null) => void;
};

/** Lo de un alojamiento tuyo que se puede hacer desde su ficha. */
export function TuAlojamiento(x: Props) {
  return (
    <>
      <DormirAqui {...x} />
      <TusGustos {...x} />
      <BuscarOtraVez {...x} />
      <Preguntar {...x} />
    </>
  );
}

function DormirAqui({ t, idioma, viaje, a, manera, duermes, alElegir }: Props) {
  const m = t.alojamiento;
  if (manera === null) return null;
  const aqui = duermes === a.id;
  let total: number | null = null;
  try {
    total = conTuAlojamiento(viaje, manera, a.id).total;
  } catch {
    total = null;
  }
  return (
    <div className="grupo tu-alojamiento">
      <h2 className="titulo">{m.titulo}</h2>
      {aqui ? (
        <div className="tu-alojamiento__fila">
          <span className="pastilla pastilla--oro">{m.duermes}</span>
          {a.id !== manera.alojamiento && (
            <button type="button" className="enlace" onClick={() => alElegir(null)}>
              {m.volverALaManera}
            </button>
          )}
        </div>
      ) : a.descartado != null ? (
        <p className="suave">{m.noSePuede}</p>
      ) : (
        <button type="button" className="boton boton--ancho" onClick={() => alElegir(a.id)}>
          {m.dormirAqui}
        </button>
      )}
      {total !== null && <span className="dato">{m.conEste(dinero(total, manera.moneda, idioma))}</span>}
    </div>
  );
}

/** Lo que pasa al pedir algo que gasta: el impacto, y tu adelante. */
function useCambio(id: string) {
  const [impacto, setImpacto] = useState<{ impact: Impacto; looks: { at_most: number; each_usd: number | null } }>();
  const [estado, setEstado] = useState<"nada" | "mirando" | "mandando" | "hecho">("nada");
  const [fallo, setFallo] = useState<string | null>(null);
  const ver = async (search: unknown): Promise<void> => {
    setEstado("mirando");
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/alojamiento/impacto`, { search });
    if (r.estado === 200) setImpacto(r.cuerpo as never);
    else setFallo(String(r.cuerpo.error ?? ""));
    setEstado("nada");
  };
  const ir = async (search: unknown): Promise<void> => {
    setEstado("mandando");
    const r = await pideALaCasa("POST", `viajes/${id}/alojamiento`, { search });
    if (r.estado === 202) {
      setEstado("hecho");
      setImpacto(undefined);
    } else {
      setFallo(String(r.cuerpo.error ?? ""));
      setEstado("nada");
    }
  };
  return { impacto, estado, fallo, ver, ir, olvidar: () => setImpacto(undefined) };
}

function TusGustos({ t, idioma, id, a, gustos, alGustos }: Props) {
  const m = t.alojamiento;
  const [dePartida, setDePartida] = useState<GustoMarcado[] | null>(null);
  const [aqui, setAqui] = useState<ConTusGustos | null>(null);
  const cambio = useCambio(id);
  const marcados = gustos ?? dePartida ?? [];
  useEffect(() => {
    let vivo = true;
    void pideALaCasa("POST", `viajes/${id}/gustos`, { tastes: gustos }).then((r) => {
      if (!vivo || r.estado !== 200) return;
      setDePartida(r.cuerpo.from as GustoMarcado[]);
      setAqui(((r.cuerpo.lodgings as ConTusGustos[]) ?? []).find((x) => x.id === a.id) ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [id, a.id, gustos]);
  const pesoDe = (cosa: string): PesoDeGusto | null => marcados.find((g) => g.thing === cosa)?.weight ?? null;
  const marca = (cosa: string, peso: PesoDeGusto): void =>
    alGustos([...marcados.filter((g) => g.thing !== cosa), { thing: cosa, weight: peso }]);
  return (
    <div className="grupo">
      <h2 className="titulo">{m.gustos}</h2>
      <p className="suave">{m.gustosSub}</p>
      <div className="gustos">
        {Object.keys(COSAS).map((cosa) => (
          <div key={cosa} className="gustos__una">
            <span className="rotulo">{m.cosas[cosa] ?? cosa}</span>
            <div className="gustos__pesos" role="group" aria-label={m.cosas[cosa] ?? cosa}>
              {PESOS.map((peso) => (
                <button
                  key={peso}
                  type="button"
                  className="toque"
                  aria-pressed={pesoDe(cosa) === peso}
                  onClick={() => marca(cosa, peso)}
                >
                  {m.pesos[peso]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {aqui !== null && (
        <div className="gustos__aqui">
          {aqui.discarded !== null ? (
            <b className="gustos__novale">{m.noTeVale}</b>
          ) : (
            <b>{aqui.score === null ? m.sinNota : m.conTusGustos(aqui.score)}</b>
          )}
          {aqui.unknown_musts.length > 0 && (
            <span className="dato">{m.sinSaber(aqui.unknown_musts.map((c) => m.cosas[c] ?? c).join(", "))}</span>
          )}
        </div>
      )}
      {gustos !== null && cambio.impacto === undefined && cambio.estado !== "hecho" && (
        <button
          type="button"
          className="enlace"
          disabled={cambio.estado !== "nada"}
          onClick={() => void cambio.ver({ tastes: gustos })}
        >
          {m.rehacerManeras}
        </button>
      )}
      <ElCambio t={t} idioma={idioma} cambio={cambio} search={{ tastes: gustos }} />
    </div>
  );
}

function ElCambio({ t, idioma, cambio, search }: Comun & { cambio: ReturnType<typeof useCambio>; search: unknown }) {
  const m = t.alojamiento;
  return (
    <>
      {cambio.impacto !== undefined && (
        <>
          {cambio.impacto.looks.at_most > 0 && (
            <p className="dato">
              {m.miraNuevos(
                cambio.impacto.looks.at_most,
                cambio.impacto.looks.each_usd === null ? null : conCentimos(cambio.impacto.looks.each_usd, idioma),
              )}
            </p>
          )}
          <ElImpacto
            t={t}
            idioma={idioma}
            impacto={cambio.impacto.impact}
            mandando={cambio.estado === "mandando"}
            alAdelante={() => void cambio.ir(search)}
            alAhoraNo={cambio.olvidar}
          />
        </>
      )}
      {cambio.estado === "hecho" && <p className="aviso">{m.buscando}</p>}
      {cambio.fallo !== null && <p className="aviso">{m.fallo(cambio.fallo)}</p>}
    </>
  );
}

function BuscarOtraVez({ t, idioma, id, viaje, a, gustos }: Props) {
  const m = t.alojamiento;
  const [zona, setZona] = useState<"asis" | "aqui" | "lugares">("asis");
  const [radio, setRadio] = useState<number>(1000);
  const [nota, setNota] = useState<number | null>(null);
  const [opiniones, setOpiniones] = useState<number>(0);
  const [estrellas, setEstrellas] = useState<number>(0);
  const [tope, setTope] = useState<string>("");
  const cambio = useCambio(id);
  const centro = zona === "aqui" ? a.punto : zona === "lugares" ? centroDeLoQueVes(viaje) : null;
  const topeDado = Number(tope.replace(",", "."));
  const search = {
    zone: centro === null ? null : { lat: centro.lat, lon: centro.lon, radius_m: radio },
    minimums: nota === null ? null : { score: nota, reviews: opiniones, stars: estrellas },
    max_price: tope.trim() !== "" && Number.isFinite(topeDado) && topeDado > 0 ? topeDado : null,
    // Con tus gustos, si los marcaste: se busca y se cruza con ellos.
    tastes: gustos,
  };
  const pide = search.zone !== null || search.minimums !== null || search.max_price !== null;
  const lista = (valores: number[], actual: number, al: (n: number) => void, rotulo: string, de = String) => (
    <label className="buscar__campo">
      <span className="rotulo">{rotulo}</span>
      <select className="toque" value={actual} onChange={(e) => al(Number(e.target.value))}>
        {valores.map((v) => (
          <option key={v} value={v}>
            {de(v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="grupo">
      <h2 className="titulo">{m.buscar}</h2>
      <p className="suave">{m.buscarSub}</p>
      <span className="rotulo">{m.zona}</span>
      <div className="gustos__pesos">
        {(["asis", "aqui", "lugares"] as const).map((z) => (
          <button key={z} type="button" className="toque" aria-pressed={zona === z} onClick={() => setZona(z)}>
            {m.zonas[z]}
          </button>
        ))}
      </div>
      {zona !== "asis" && (
        <div className="gustos__pesos">
          {RADIOS_QUE_SE_OFRECEN.map((r) => (
            <button key={r} type="button" className="toque" aria-pressed={radio === r} onClick={() => setRadio(r)}>
              {m.radio(r)}
            </button>
          ))}
        </div>
      )}
      <span className="rotulo">{m.minimos}</span>
      <div className="buscar__minimos">
        <label className="buscar__campo">
          <span className="rotulo">{m.nota}</span>
          <select
            className="toque"
            value={nota === null ? "" : String(nota)}
            onChange={(e) => setNota(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">{m.asis}</option>
            {NOTAS.map((v) => (
              <option key={v} value={v}>
                {new Intl.NumberFormat(idioma).format(v)}
              </option>
            ))}
          </select>
        </label>
        {nota !== null && lista(OPINIONES, opiniones, setOpiniones, m.opiniones)}
        {nota !== null && lista(ESTRELLAS, estrellas, setEstrellas, m.estrellas)}
      </div>
      <label className="buscar__campo buscar__campo--ancho">
        <span className="rotulo">
          {m.tope} ({m.enMoneda(a.precio.moneda)})
        </span>
        <input
          className="campo"
          inputMode="decimal"
          value={tope}
          placeholder={String(Math.round(a.precio.total))}
          onChange={(e) => setTope(e.target.value)}
        />
      </label>
      {cambio.impacto === undefined && cambio.estado !== "hecho" && (
        <button
          type="button"
          className="boton boton--ancho"
          disabled={!pide || cambio.estado !== "nada"}
          onClick={() => void cambio.ver(search)}
        >
          {m.verQueCambia}
        </button>
      )}
      <ElCambio t={t} idioma={idioma} cambio={cambio} search={search} />
    </div>
  );
}

function Preguntar({ t, idioma, id, a }: Props) {
  const m = t.alojamiento;
  const [texto, setTexto] = useState("");
  const [cada, setCada] = useState<number | null>(null);
  const [ultima, setUltima] = useState<Pregunta | null>(null);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/alojamiento/pregunta`).then((r) => {
      if (!vivo || r.estado !== 200) return;
      setCada((r.cuerpo.each_usd as number | null) ?? null);
      const p = r.cuerpo.question as Pregunta | null;
      setUltima(p !== null && p.lodging === a.id ? p : null);
    });
    return () => {
      vivo = false;
    };
  }, [id, a.id, vuelta]);
  // Mientras se contesta, se vuelve a preguntar a la casa cada poco.
  useEffect(() => {
    if (ultima?.state !== "working") return;
    const reloj = setTimeout(() => setVuelta((n) => n + 1), 2500);
    return () => clearTimeout(reloj);
  }, [ultima]);
  if (a.comoEs.length === 0) return null;
  const pregunta = async (): Promise<void> => {
    setMandando(true);
    setFallo(null);
    const r = await pideALaCasa("POST", `viajes/${id}/alojamiento/pregunta`, { lodging: a.id, question: texto });
    setMandando(false);
    if (r.estado === 202) {
      setTexto("");
      setVuelta((n) => n + 1);
    } else setFallo(String(r.cuerpo.error ?? ""));
  };
  return (
    <div className="grupo">
      <h2 className="titulo">{m.pregunta}</h2>
      <p className="suave">{m.preguntaSub}</p>
      {ultima !== null && (
        <div className="respuesta">
          <span className="rotulo">{m.tuPregunta}</span>
          <p className="respuesta__pregunta">{ultima.question}</p>
          {ultima.state === "working" && <p className="dato">{m.contestando}</p>}
          {ultima.state === "stopped" && <p className="aviso">{m.noSalio}</p>}
          {ultima.state === "ready" && ultima.answer !== null && (
            <>
              <b className="respuesta__si" data-respuesta={ultima.answer}>
                {m.respuesta[ultima.answer] ?? ultima.answer}
              </b>
              {ultima.says !== null && <p>{ultima.says}</p>}
              <div className="respuesta__pruebas">
                {ultima.evidence.map((p, i) =>
                  p.photo !== null ? (
                    <a key={i} href={foto(p.photo, 1080)} target="_blank" rel="noreferrer">
                      <img src={foto(p.photo, 256)} alt={t.ficha.prueba.photo} loading="lazy" />
                    </a>
                  ) : (
                    <span key={i} className="pastilla">
                      {t.ficha.prueba[p.kind] ?? p.kind}
                    </span>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      )}
      <input
        className="campo"
        value={texto}
        maxLength={200}
        placeholder={m.ejemplo}
        onChange={(e) => setTexto(e.target.value)}
      />
      <span className="dato">{cada === null ? m.noSabePregunta : m.cuestaPregunta(conCentimos(cada, idioma))}</span>
      <button
        type="button"
        className="boton boton--ancho"
        disabled={mandando || texto.trim().length < 3 || ultima?.state === "working"}
        onClick={() => void pregunta()}
      >
        {m.preguntar}
      </button>
      {fallo !== null && <p className="aviso">{m.fallo(fallo)}</p>}
    </div>
  );
}
