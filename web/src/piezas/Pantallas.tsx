"use client";

// Lo que va dentro de la hoja en cada etapa: el saludo del mapa del mundo, el primer vistazo, la investigación en
// vivo, tu viaje (con sus pestañas: los días, dónde dormir, las cuentas y los avisos) y la ficha de un alojamiento.
// Son piezas que enseñan: lo que se decide vive en la página.

import { useState } from "react";
import { COSAS } from "../../../agent/data/gustos.ts";
import type { Alojamiento, DeLosPapeles, Manera, Parada, Ritmo, Suceso, Viaje } from "../../../agent/output/viaje.ts";
import { RITMOS } from "../../../agent/output/viaje.ts";
import type { Reparto } from "../../../agent/scripts/ritmo.ts";
import { caminosDe, type Caminos } from "../../../agent/tools/caminos.ts";
import {
  andar,
  coordenadas,
  diaCorto,
  diaDeLaSemana,
  diaEnGoogleMaps,
  dinero,
  duracion,
  irEntre,
} from "../lib/formato.ts";
import type { Ir } from "../lib/formato.ts";
import { enGoogleMaps, noches, reloj, trayectoEnGoogleMaps } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { foto, type Reproductor } from "../lib/usar.ts";
import { MeQuedo, Reservar } from "./Cerrar.tsx";
import { masCercaDeCadaDia, noCabenTusDias } from "../../../agent/scripts/dia_a_dia.ts";
import { conTuAlojamiento } from "../../../agent/scripts/alojamiento.ts";
import { conTuTransporte } from "../../../agent/scripts/otro_transporte.ts";
import { TuMensaje } from "./DiaADia.tsx";
import { Alli, CosteDelTrayecto, diceSiReservar, ElPresupuesto, EntradaDeLaParada, FichaDeLaEntrada } from "./Alli.tsx";
import { presupuestoQueSeEnsena, type TusCambios } from "../lib/alli.ts";

type Comun = { t: Textos; idioma: string };

/** El mundo: `grabado` es el nombre del destino del viaje grabado, si hay alguno. */
type DelMundo = Comun & { grabado: string | null; alProbar: () => void; noEsTuyo?: boolean; conCasa?: boolean };

export function Mundo({ t, grabado, alProbar, noEsTuyo, conCasa }: DelMundo) {
  return (
    <>
      <div className="cabecera">
        <h1 className="lugar">{t.mundo.saludo}</h1>
        <p className="suave">{t.mundo.cuerpo}</p>
      </div>
      {grabado !== null && (
        <button type="button" className="boton boton--hueco" onClick={alProbar}>
          {t.mundo.ejemplo}
        </button>
      )}
      {noEsTuyo ? (
        <p className="aviso">{t.mundo.noEsTuyo}</p>
      ) : (
        <p className="dato">{conCasa ? t.mundo.conCasa : t.mundo.seco(grabado)}</p>
      )}
    </>
  );
}

/**
 * Cómo se llega en una manera: la clase de su transporte y si su precio es guardado. Sin transporte, su total es solo
 * dormir. Si lleva uno que el viaje no trae, se dice que lo lleva, sin clase.
 */
function comoSeLlega(viaje: Viaje, manera: Manera | undefined): { clase: string; guardado: boolean } | null {
  if (manera === undefined || manera.transporte === null) return null;
  const suyo = viaje.transportes.find((x) => x.id === manera.transporte);
  return { clase: suyo?.clase ?? "", guardado: suyo?.guardado ?? false };
}

/** La cabecera de un viaje: el sitio, las fechas, las noches y quiénes van, niños incluidos, todo leído del viaje. */
function CabeceraDelViaje({ t, idioma, viaje, rotulo }: Comun & { viaje: Viaje; rotulo: string }) {
  const n = noches(viaje.entrada, viaje.salida);
  return (
    <div className="cabecera">
      <span className="rotulo">{rotulo}</span>
      <h1 className="lugar">{viaje.destino.nombre}</h1>
      <div className="cabecera__linea">
        <span className="pastilla">
          {diaCorto(viaje.entrada, idioma)} → {diaCorto(viaje.salida, idioma)}
        </span>
        <span className="pastilla">{t.vistazo.noches(n)}</span>
        <span className="pastilla">{t.vistazo.adultos(viaje.adultos)}</span>
        {viaje.ninos.length > 0 && <span className="pastilla">{t.vistazo.ninos(viaje.ninos)}</span>}
        <span className="pastilla">{t.vistazo.habitaciones(viaje.habitaciones)}</span>
      </div>
    </div>
  );
}

export function Vistazo({ t, idioma, viaje }: Comun & { viaje: Viaje }) {
  const v = viaje.vistazo;
  // Sin precio de transporte para las fechas, el de un día de al lado, si lo hay: se ofrece, no se suma.
  const alLado = viaje.transportes.length === 0 ? viaje.transporteAlLado : undefined;
  const elDia = (d: string): string => `${diaDeLaSemana(d.slice(0, 10), idioma)} ${diaCorto(d.slice(0, 10), idioma)}`;
  const numero = (n: number): string => new Intl.NumberFormat(idioma).format(n);
  return (
    <>
      <CabeceraDelViaje t={t} idioma={idioma} viaje={viaje} rotulo={t.vistazo.rotulo} />
      <span className="dato">{coordenadas(viaje.destino.punto)}</span>
      {v !== null && (
        <div className="cifras">
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
            <span>{t.vistazo.desde(noches(viaje.entrada, viaje.salida))}</span>
          </div>
        </div>
      )}
      {v !== null && (
        <p className="dato">{t.vistazo.minimos(v.minimos.nota, v.minimos.opiniones, v.minimos.estrellas)}</p>
      )}
      {v !== null && v.bajados && <p className="aviso">{t.vistazo.bajados}</p>}
      {v !== null && v.ensanchado && <p className="aviso">{t.vistazo.ensanchado}</p>}
      {viaje.transportes.length === 0 && <p className="aviso">{t.vistazo.sinTransporte}</p>}
      {alLado !== undefined && (
        <p className="dato">
          {t.vistazo.alLado(
            elDia(alLado.sale),
            elDia(alLado.vuelve ?? ""),
            dinero(alLado.precio.total, alLado.precio.moneda, idioma),
          )}
        </p>
      )}
    </>
  );
}

type Linea = { n: string | null; texto: string };

/**
 * Las líneas de lo que va pasando: los recuentos, con su número delante; lo demás, en una frase. Lo que sigue a un
 * número concuerda con él, y lo que nombra las noches, con las del viaje.
 */
export function fraseDeSuceso(s: Suceso, t: Textos, idioma: string, deNoches: number): Linea | null {
  const n = s.n === undefined ? null : new Intl.NumberFormat(idioma).format(s.n);
  const nombre = s.nombre ?? "";
  switch (s.clase) {
    case "zone":
      return { n: null, texto: t.vivo.zone(nombre) };
    case "lodgings_found":
      return { n, texto: t.vivo.lodgings_found(s.n ?? 0) };
    case "lodgings_pass":
      return { n, texto: t.vivo.lodgings_pass(s.n ?? 0) };
    case "lodgings_priced":
      return { n, texto: t.vivo.lodgings_priced(s.n ?? 0, deNoches) };
    case "finalist":
      return { n: null, texto: t.vivo.finalist(nombre) };
    case "looking":
      return { n: null, texto: t.vivo.looking(nombre) };
    case "looked":
      return { n: null, texto: t.vivo.looked(nombre) };
    case "sights_found":
      return { n, texto: t.vivo.sights_found(s.n ?? 0) };
    case "day":
      return { n: null, texto: t.vivo.day(s.n ?? 0, nombre) };
    case "way":
      return { n: null, texto: t.vivo.way(t.viaje.manera[s.ref as Manera["id"]] ?? "") };
    case "lever":
      return { n: null, texto: t.vivo.lever() };
    case "done":
      return { n: null, texto: t.vivo.done() };
    case "stopped":
      return { n: null, texto: t.vivo.stopped() };
    case "retry":
      return { n: null, texto: t.vivo.retry(t.casa.pasos[s.ref ?? ""] ?? "") };
    case "ways_around":
      return { n, texto: t.vivo.ways_around(s.n ?? 0) };
    case "good_to_know":
      return { n, texto: t.vivo.good_to_know(s.n ?? 0) };
    case "tickets_known":
      return { n, texto: t.vivo.tickets_known(s.n ?? 0) };
    case "conductor": {
      const texto = t.vivo.conductor(s.ref ?? "");
      return texto === null ? null : { n: null, texto };
    }
    default:
      return null;
  }
}

/**
 * Un grupo de toques: una pregunta con sus respuestas, de las que se marca una o varias. Empieza sin ninguna marcada:
 * la web no contesta por el viajero.
 */
function Toques({ titulo, opciones, varias }: { titulo: string; opciones: string[]; varias?: boolean }) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const toca = (o: string): void =>
    setMarcadas((m) => (varias ? (m.includes(o) ? m.filter((x) => x !== o) : [...m, o]) : [o]));
  return (
    <div className="toques" role="group" aria-label={titulo}>
      <span className="rotulo">{titulo}</span>
      <div className="cabecera__linea">
        {opciones.map((o) => (
          <button key={o} type="button" className="toque" aria-pressed={marcadas.includes(o)} onClick={() => toca(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Un contador de un toque: uno menos, cuántos hay y uno más. Para lo que no cabe en una lista corta de respuestas. */
export function Contador(x: {
  texto: string;
  n: number;
  minimo: number;
  /** Si lo hay, de ahí no se pasa. */
  maximo?: number;
  menos: string;
  mas: string;
  alCambiar: (n: number) => void;
}) {
  return (
    <span className="cabecera__linea">
      <button
        type="button"
        className="toque"
        aria-label={`${x.menos}: ${x.texto}`}
        disabled={x.n <= x.minimo}
        onClick={() => x.alCambiar(x.n - 1)}
      >
        −
      </button>
      <span className="pastilla" aria-live="polite">
        {x.texto}
      </span>
      <button
        type="button"
        className="toque"
        aria-label={`${x.mas}: ${x.texto}`}
        disabled={x.maximo !== undefined && x.n >= x.maximo}
        onClick={() => x.alCambiar(x.n + 1)}
      >
        +
      </button>
    </span>
  );
}

/**
 * Hasta qué edad se ofrece decir la de un niño: la mayoría de edad más común. La casa aún no dice su tope; cuando lo
 * diga, se lee de ella. Si el viaje lleva a alguien mayor, su edad se enseña igual.
 */
const EDAD_MAYOR_DE_NINO = 17;

/**
 * Quiénes vais: los adultos y los niños, cada uno con su contador, y la edad de cada niño. Parte de lo que lleva el
 * viaje y vale para cualquier grupo: uno solo, una pareja o una familia. La edad de un niño que se añade no se supone.
 */
function Quienes({ t, viaje }: { t: Textos; viaje: Viaje }) {
  const p = t.preguntas;
  const [adultos, setAdultos] = useState(viaje.adultos);
  const [edades, setEdades] = useState<(number | null)[]>(viaje.ninos);
  // Las habitaciones las dice el viajero. En cada una duerme al menos un adulto: no puede haber más que adultos.
  const [habitaciones, setHabitaciones] = useState(viaje.habitaciones);
  const cuantosAdultos = (n: number): void => {
    setAdultos(n);
    setHabitaciones((h) => Math.min(h, n));
  };
  const cuantosNinos = (n: number): void => setEdades((e) => (n < e.length ? e.slice(0, n) : [...e, null]));
  const tope = Math.max(EDAD_MAYOR_DE_NINO, ...edades.map((e) => e ?? 0));
  return (
    <div className="toques" role="group" aria-label={p.quienes}>
      <span className="rotulo">{p.quienes}</span>
      <div className="cabecera__linea">
        <Contador
          texto={t.vistazo.adultos(adultos)}
          n={adultos}
          minimo={1}
          menos={p.menos}
          mas={p.mas}
          alCambiar={cuantosAdultos}
        />
        <Contador
          texto={p.ninos(edades.length)}
          n={edades.length}
          minimo={0}
          menos={p.menos}
          mas={p.mas}
          alCambiar={cuantosNinos}
        />
        <Contador
          texto={t.vistazo.habitaciones(habitaciones)}
          n={habitaciones}
          minimo={1}
          maximo={adultos}
          menos={p.menos}
          mas={p.mas}
          alCambiar={setHabitaciones}
        />
      </div>
      {edades.length > 0 && (
        <div className="cabecera__linea">
          {edades.map((edad, i) => (
            <select
              key={i}
              className="toque"
              aria-label={p.edad(i + 1)}
              value={edad ?? ""}
              onChange={(e) => setEdades((todas) => todas.map((x, j) => (j === i ? Number(e.target.value) : x)))}
            >
              <option value="" disabled>
                {p.edadSinDecir}
              </option>
              {Array.from({ length: tope + 1 }, (_, anos) => (
                <option key={anos} value={anos}>
                  {p.anos(anos)}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}

/** Las preguntas, mientras ya busca. En seco no cambian nada: enseñan cómo se contestan, con toques y sin escribir. */
function Preguntas({ t, viaje }: { t: Textos; viaje: Viaje }) {
  const p = t.preguntas;
  return (
    <div className="preguntas">
      <h2 className="titulo">{p.titulo}</h2>
      <Toques titulo={p.origen} opciones={p.origenOpciones} />
      <Quienes t={t} viaje={viaje} />
      <Toques titulo={p.fechas} opciones={p.fechasOpciones} />
      <Toques titulo={p.gasto} opciones={p.gastoOpciones} />
      <Toques titulo={p.buscas} opciones={p.buscasOpciones} varias />
      <label className="toques">
        <span className="rotulo">{p.libre}</span>
        <input className="campo" id="algo-mas" type="text" autoComplete="off" />
      </label>
      <p className="dato">{p.seco}</p>
    </div>
  );
}

export function EnVivo({ t, idioma, viaje, r }: Comun & { viaje: Viaje; r: Reproductor }) {
  // Mientras se mira un alojamiento se dice que se está mirando; al acabar, esa línea pasa a ser la de lo mirado.
  const mirados = new Set(r.vistos.filter((s) => s.clase === "looked").map((s) => s.ref));
  const deNoches = noches(viaje.entrada, viaje.salida);
  const lineas = r.vistos
    .map((s, i) => ({ s, i, f: fraseDeSuceso(s, t, idioma, deNoches) }))
    .filter((x) => x.f !== null && !(x.s.clase === "looking" && mirados.has(x.s.ref)))
    .reverse()
    .slice(0, 6);
  const sitios = r.vistos.filter((s) => s.clase === "sight");
  return (
    <>
      <div className="cabecera">
        <span className="rotulo">{t.vivo.rotulo}</span>
        <h1 className="titulo">{r.acabado ? t.vivo.done() : t.vivo.titulo}</h1>
        <div
          className="avance"
          role="progressbar"
          aria-valuenow={Math.round(r.avance * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${r.avance * 100}%` }} />
        </div>
      </div>
      <ol className="sucesos" aria-live="polite">
        {lineas.map(({ s, i, f }, orden) => (
          <li key={i} className={orden === 0 ? "suceso suceso--ultimo" : "suceso"}>
            <span className="dato">{reloj(s.t)}</span>
            <p>
              {f!.n !== null && <b>{f!.n} </b>}
              {f!.texto}
            </p>
          </li>
        ))}
      </ol>
      {sitios.length > 0 && (
        <div className="cabecera__linea">
          {sitios.map((s) => (
            <span key={s.ref} className="pastilla pastilla--oro">
              {s.nombre}
            </span>
          ))}
        </div>
      )}
      {!r.acabado && <Preguntas t={t} viaje={viaje} />}
    </>
  );
}

export type Pestana = "days" | "stay" | "money" | "there" | "notes" | "book";

type DeViaje = Comun & {
  viaje: Viaje;
  reparto: Reparto;
  pestana: Pestana;
  dia: number | null;
  ritmo: Ritmo;
  manera: Manera["id"];
  parada: string | null;
  quitadas: string[];
  anadidas: string[];
  aLaPestana: (p: Pestana) => void;
  alDia: (d: number | null) => void;
  alRitmo: (r: Ritmo) => void;
  aLaManera: (m: Manera["id"]) => void;
  aLaParada: (id: string | null) => void;
  alAlojamiento: (id: string) => void;
  alQuitar: (id: string) => void;
  alAnadir: (id: string) => void;
  alMover: (id: string, dia: number) => void;
  /** El identificador del viaje si es tuyo y está en el mapa: entonces se puede cerrar. */
  tuyo?: string | null;
  /** La versión que se enseña de un viaje tuyo: solo se sigue el cierre que es de ella. */
  version?: number | null;
  /** Lo que moviste de día (8.6): la parada dice que la moviste tú. */
  fijadas?: Record<string, number>;
  /** Volver a poner una parada que quitaste: vuelve a lo propuesto, sin forzarla en un día. */
  alReponer?: (id: string) => void;
  /** El identificador del viaje si es tuyo y se le puede mandar un mensaje para tus días (8.6). */
  paraMensajes?: string | null;
  /** Abre el transporte de tu viaje (8.3). */
  alTransporte?: () => void;
  /** Dónde duermes y cómo llegas, si elegiste otros que los de la manera (8.2, 8.3): la manera se pinta con ellos. */
  alojamiento?: string | null;
  transporte?: string | null;
};

/**
 * El viaje con la manera elegida como se va a cerrar: con tu alojamiento, tu transporte y su total, sumados por el
 * código de la casa (`conTuAlojamiento` y `conTuTransporte`). Lo que no se puede sumar (de otra moneda, o que ya no
 * es del viaje) se queda como estaba. Un viaje cerrado se enseña como se cerró.
 */
function conLoTuyo(x: DeViaje): Viaje {
  const { viaje } = x;
  if (viaje.cierre || (x.alojamiento == null && x.transporte == null)) return viaje;
  const intenta = (m: Manera, f: (m: Manera) => Manera): Manera => {
    try {
      return f(m);
    } catch {
      return m;
    }
  };
  const maneras = viaje.maneras.map((m) =>
    m.id !== x.manera
      ? m
      : intenta(
          intenta(m, (n) => conTuAlojamiento(viaje, n, x.alojamiento ?? null)),
          (n) => conTuTransporte(viaje, n, x.transporte ?? null),
        ),
  );
  return { ...viaje, maneras };
}

function FotoDeParada({ p, n }: { p: Parada; n: number | null }) {
  return (
    <span
      className="parada-fila__foto"
      style={p.foto ? { backgroundImage: `url(${foto(p.foto.url, 128)})` } : undefined}
    >
      {p.foto ? null : p.nombre.slice(0, 1)}
      {n !== null && <span className="parada-fila__n">{n}</span>}
    </span>
  );
}

function Dias(x: DeViaje) {
  const { t, idioma, viaje, reparto } = x;
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p]));
  const abierto = x.dia === null ? null : (reparto.dias[x.dia] ?? null);
  // Donde se duerme con la manera elegida, y la primera parada del día abierto: de una a otra se empieza el día.
  const cama =
    viaje.alojamientos.find((a) => a.id === viaje.maneras.find((m) => m.id === x.manera)?.alojamiento) ?? null;
  const primera = abierto === null ? undefined : deParada.get(abierto.paradas[0] ?? "");
  const fuera = reparto.fuera.filter((id) => !x.quitadas.includes(id));
  // Con la tabla de caminos del viaje, cada trayecto dice lo que dijo la fuente; sin ella, la cuenta de la casa.
  const c = caminosDe(viaje.caminos);
  const desdeLaCama = cama !== null && primera !== undefined ? irEntre(cama.punto, primera.punto, c, idioma) : null;
  // Qué alojamiento del viaje te deja más cerca del día abierto, como lo cuenta la casa (8.6).
  const cerca =
    abierto === null || x.dia === null
      ? null
      : (masCercaDeCadaDia(viaje, [{ fecha: abierto.fecha, paradas: abierto.paradas }])[0] ?? null);
  const cercana = viaje.alojamientos.find((a) => a.id === cerca?.alojamiento) ?? null;
  // Tus días, por las mismas cuentas de la puerta 9: el que no cabe lo dice, y se queda como lo dejaste (8.6).
  const noCaben = noCabenTusDias(viaje, reparto.dias);
  const noCabeElAbierto = abierto === null ? [] : (noCaben[abierto.fecha] ?? []);
  // Quiénes viajan, para lo que cuesta cada entrada y cada trayecto para el grupo (14.6).
  const grupo = { adultos: viaje.adultos, ninos: viaje.ninos };
  return (
    <>
      <div className="grupo">
        <div className="mando mando--dias" role="group" aria-label={t.pestanas.days}>
          <button type="button" aria-pressed={x.dia === null} onClick={() => x.alDia(null)}>
            <small>{t.viaje.todos}</small>
            <b>{reparto.dias.length}</b>
          </button>
          {reparto.dias.map((d, i) => (
            <button key={d.fecha} type="button" aria-pressed={x.dia === i} onClick={() => x.alDia(i)}>
              <small>{diaDeLaSemana(d.fecha, idioma)}</small>
              <b>{Number(d.fecha.slice(8, 10))}</b>
            </button>
          ))}
        </div>
        <div className="grupo__cab">
          <span className="rotulo">{t.viaje.ritmo}</span>
        </div>
        <div className="mando" role="group" aria-label={t.viaje.ritmo}>
          {RITMOS.map((r) => (
            <button key={r} type="button" aria-pressed={x.ritmo === r} onClick={() => x.alRitmo(r)}>
              {t.viaje.ritmos[r]}
            </button>
          ))}
        </div>
      </div>

      {abierto === null && (
        <div className="resumen-dias">
          {reparto.dias.map((d, i) => {
            const paradas = d.paradas.flatMap((id) => deParada.get(id) ?? []);
            const andado = d.metros.reduce((s, m) => s + m, 0);
            return (
              <button key={d.fecha} type="button" className="dia-tarjeta" onClick={() => x.alDia(i)}>
                <span className="dia-tarjeta__n">
                  <small>{diaDeLaSemana(d.fecha, idioma)}</small>
                  <b>{Number(d.fecha.slice(8, 10))}</b>
                </span>
                <span className="dia-tarjeta__texto">
                  <b>{d.titulo || t.viaje.sinParadas}</b>
                  {noCaben[d.fecha] !== undefined && (
                    <span className="pastilla pastilla--ojo">{t.diaADia.noCabeCorto}</span>
                  )}
                  <span className="dato">
                    {t.viaje.paradas(paradas.length)}
                    {andado > 0 ? `, ${andar(andado, idioma).lejos}` : ""}
                  </span>
                  <span className="dia-tarjeta__ruta">{paradas.map((p) => p.nombre).join(" → ")}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {abierto !== null && x.dia !== null && (
        <div className="grupo">
          <h2 className="titulo">
            {t.viaje.dia(x.dia + 1)}
            {abierto.titulo ? `, ${abierto.titulo}` : ""}
          </h2>
          <span className="dato">
            {diaCorto(abierto.fecha, idioma)}, {t.viaje.paradas(abierto.paradas.length)}
            {abierto.metros.length > 0
              ? `, ${
                  andar(
                    abierto.metros.reduce((s, m) => s + m, 0),
                    idioma,
                  ).lejos
                }`
              : ""}
          </span>
          {abierto.paradas.length === 0 && <p className="suave">{t.viaje.sinParadas}</p>}
          {noCabeElAbierto.length > 0 && (
            <div className="aviso dia__nocabe" role="note">
              {noCabeElAbierto.map((que) => (
                <p key={que}>{t.diaADia.noCabe[que] ?? que}</p>
              ))}
              <p className="dato">{t.diaADia.tuEleccion}</p>
            </div>
          )}
          {cercana !== null && cerca?.minutos != null && (
            <span className="dato">
              {cercana.id === cama?.id
                ? t.diaADia.laTuya(cerca.minutos)
                : t.diaADia.masCerca(cercana.nombre, cerca.minutos)}
            </span>
          )}
          <div className="paradas">
            {/* De donde duermes a la primera parada: lo que hay y cómo se va. Si no se anda, lo enseña Google. */}
            {cama !== null && primera !== undefined && desdeLaCama !== null && (
              <div className="tramo">
                <span className="tramo__texto">
                  <span className="dato">{t.viaje.desdeLaCama(tramo(t, desdeLaCama))}</span>
                  {desdeLaCama.cogiendo.length > 0 && (
                    <a
                      className="enlace"
                      href={trayectoEnGoogleMaps(cama.punto, primera.punto, false)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.viaje.comoIr}
                    </a>
                  )}
                  {desdeLaCama.cogiendo.length > 0 && (
                    <CosteDelTrayecto t={t} idioma={idioma} moverse={viaje.moverse} grupo={grupo} />
                  )}
                </span>
              </div>
            )}
            {abierto.paradas
              .flatMap((id) => deParada.get(id) ?? [])
              .map((p, i, todas) => (
                <div key={p.id}>
                  <button
                    type="button"
                    className="parada-fila"
                    aria-expanded={x.parada === p.id}
                    onClick={() => x.aLaParada(p.id)}
                  >
                    <FotoDeParada p={p} n={i + 1} />
                    <span className="parada-fila__texto">
                      <b>{p.nombre}</b>
                      <span className="parada-fila__porque">{p.porQue}</span>
                      <span className="cabecera__linea">
                        <span className="dato">{duracion(p.minutos)}</span>
                        {p.imprescindible && <span className="pastilla pastilla--oro">{t.viaje.imprescindible}</span>}
                        {p.mejorHora !== undefined && t.parada.hora[p.mejorHora] !== undefined && (
                          <span className="pastilla">{t.parada.hora[p.mejorHora]}</span>
                        )}
                        {p.reservar === true && !diceSiReservar(x.viaje.entradas, p.id) && (
                          <span className="pastilla">{t.parada.reservar}</span>
                        )}
                        <EntradaDeLaParada
                          t={t}
                          idioma={idioma}
                          entradas={x.viaje.entradas}
                          parada={p.id}
                          fecha={abierto.fecha}
                          grupo={grupo}
                        />
                        {x.anadidas.includes(p.id) && <span className="pastilla">{t.acciones.tuya}</span>}
                        {!x.anadidas.includes(p.id) && x.fijadas?.[p.id] !== undefined && (
                          <span className="pastilla">{t.diaADia.movida}</span>
                        )}
                      </span>
                    </span>
                  </button>
                  {x.parada === p.id && (
                    <div className="acciones">
                      <a className="toque" href={enGoogleMaps(p.punto, p.nombre)} target="_blank" rel="noreferrer">
                        {t.viaje.enMapas}
                      </a>
                      {reparto.dias.map((d, n) =>
                        n === x.dia ? null : (
                          <button key={d.fecha} type="button" className="toque" onClick={() => x.alMover(p.id, n)}>
                            {t.acciones.mover} {n + 1}
                          </button>
                        ),
                      )}
                      <button type="button" className="toque toque--quita" onClick={() => x.alQuitar(p.id)}>
                        {t.acciones.quitar}
                      </button>
                      {p.foto?.autor && p.foto.licencia && (
                        <span className="credito">{t.foto(p.foto.autor, p.foto.licencia)}</span>
                      )}
                    </div>
                  )}
                  {x.parada === p.id && (
                    <FichaDeLaEntrada
                      t={t}
                      idioma={idioma}
                      entradas={x.viaje.entradas}
                      parada={p.id}
                      fecha={abierto.fecha}
                      fechas={reparto.dias.map((d) => d.fecha)}
                      grupo={grupo}
                    />
                  )}
                  {i < todas.length - 1 && (
                    <div className="tramo">
                      <span className="tramo__texto">
                        <span className="dato">{tramo(t, irEntre(p.punto, todas[i + 1].punto, c, idioma))}</span>
                        {/* Lo que no se anda: cómo ir de verdad lo enseña Google, con sus horarios y sus precios. */}
                        {irEntre(p.punto, todas[i + 1].punto, c, idioma).cogiendo.length > 0 && (
                          <a
                            className="enlace"
                            href={trayectoEnGoogleMaps(p.punto, todas[i + 1].punto, false)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t.viaje.comoIr}
                          </a>
                        )}
                        {irEntre(p.punto, todas[i + 1].punto, c, idioma).cogiendo.length > 0 && (
                          <CosteDelTrayecto t={t} idioma={idioma} moverse={viaje.moverse} grupo={grupo} />
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
          {abierto.paradas.length > 1 && (
            <a
              className="enlace"
              href={
                diaEnGoogleMaps(
                  abierto.paradas.flatMap((id) => deParada.get(id)?.punto ?? []),
                  seAndaElDia(abierto, deParada, c),
                ) ?? undefined
              }
              target="_blank"
              rel="noreferrer"
            >
              {t.viaje.diaEnMapas}
            </a>
          )}
        </div>
      )}

      {/* Lo que el código dejó fuera, con su porqué: no cabe con este ritmo, o queda lejos de todo lo demás. */}
      {[
        { ids: fuera.filter((id) => reparto.porQue[id] !== "far"), rotulo: t.viaje.fuera },
        { ids: fuera.filter((id) => reparto.porQue[id] === "far"), rotulo: t.viaje.fueraLejos },
      ].map(
        (grupo, i) =>
          grupo.ids.length > 0 && (
            <div className="grupo" key={i}>
              <span className="rotulo">{grupo.rotulo(grupo.ids.length)}</span>
              <div className="cabecera__linea">
                {grupo.ids.map((id) => (
                  <button key={id} type="button" className="toque" onClick={() => x.alAnadir(id)}>
                    + {deParada.get(id)?.nombre}
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
      {x.quitadas.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.acciones.quitadas(x.quitadas.length)}</span>
          <div className="cabecera__linea">
            {x.quitadas.map((id) => (
              <button key={id} type="button" className="toque" onClick={() => (x.alReponer ?? x.alAnadir)(id)}>
                {t.acciones.reponer}: {deParada.get(id)?.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
      {x.paraMensajes != null && (
        <TuMensaje t={t} idioma={idioma} id={x.paraMensajes} dia={x.dia} version={x.version ?? null} />
      )}
    </>
  );
}

function Dormir(x: DeViaje) {
  const { t, idioma, viaje } = x;
  const enManeras = new Set(viaje.maneras.map((m) => m.alojamiento));
  const otros = viaje.alojamientos.filter((a) => !enManeras.has(a.id));
  return (
    <>
      <div className="grupo">
        <div className="grupo__cab">
          <h2 className="titulo">{t.viaje.maneras(viaje.maneras.length)}</h2>
        </div>
        <div className="maneras">
          {viaje.maneras.map((m) => {
            const a = viaje.alojamientos.find((al) => al.id === m.alojamiento);
            const elegida = x.manera === m.id;
            return (
              <div key={m.id} className="manera" data-elegida={elegida}>
                <button type="button" className="manera__cab" aria-pressed={elegida} onClick={() => x.aLaManera(m.id)}>
                  <span className="manera__nombre">{t.viaje.manera[m.id]}</span>
                  <span className="manera__precio">{dinero(m.total, m.moneda, idioma)}</span>
                  <span className="manera__donde">{a?.nombre}</span>
                </button>
                {elegida && (
                  <div className="manera__cuerpo">
                    {m.porQue !== undefined && <p className="manera__porque">{m.porQue}</p>}
                    {a && (a.zona != null || a.andando != null) && (
                      <p className="dato">{t.dormir.donde(a.zona ?? null, a.andando ?? null, a.aPie ?? true)}</p>
                    )}
                    <p className="manera__gana">
                      <b>{t.viaje.gana}. </b>
                      {m.gana}
                    </p>
                    <p className="manera__gana">
                      <b>{t.viaje.pierde}. </b>
                      {m.pierde}
                    </p>
                    {a && (
                      <button type="button" className="enlace" onClick={() => x.alAlojamiento(a.id)}>
                        {t.dormir.ficha}
                      </button>
                    )}
                    {x.tuyo != null && (
                      <MeQuedo
                        t={t}
                        idioma={idioma}
                        viaje={viaje}
                        id={x.tuyo}
                        manera={m.id}
                        dias={x.reparto.dias}
                        ritmo={x.ritmo}
                        version={x.version ?? null}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {otros.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.dormir.otros(otros.length)}</span>
          {otros.map((a) => (
            <button
              key={a.id}
              type="button"
              className="otro"
              data-descartado={a.descartado != null}
              onClick={() => x.alAlojamiento(a.id)}
            >
              <span>
                {a.nombre}
                {a.descartado != null && <em className="otro__novale">{t.dormir.noVale}</em>}
              </span>
              <b>{dinero(a.precio.total, a.precio.moneda, idioma)}</b>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Lo que has cambiado desde que se hizo el presupuesto del viaje (14.6): el ritmo, las paradas, y dónde duermes o cómo
 * llegas si ya no son los precios de su presupuesto. Con algo cambiado, el presupuesto que se enseña es el de antes.
 */
function tusCambios(x: DeViaje, viaje: Viaje, marcada: Manera | undefined): TusCambios {
  const partes = viaje.presupuesto?.maneras.find((m) => m.manera === marcada?.id)?.partes ?? [];
  const otro = (parte: string, precio: number | undefined): boolean => {
    const p = partes.find((y) => y.parte === parte);
    return p?.total != null && precio !== undefined && Math.abs(p.total - precio) > 0.01;
  };
  const transporte = viaje.transportes.find((y) => y.id === marcada?.transporte);
  return {
    ritmo: x.ritmo !== viaje.ritmo,
    paradas: x.quitadas.length > 0 || x.anadidas.length > 0 || Object.keys(x.fijadas ?? {}).length > 0,
    alojamiento: otro("lodging", viaje.alojamientos.find((y) => y.id === marcada?.alojamiento)?.precio.total),
    transporte: otro("transport", transporte?.precio.total),
  };
}

function Cuentas(x: DeViaje) {
  const { t, idioma, viaje } = x;
  const tope = Math.max(...viaje.maneras.map((m) => m.total), 1);
  // Lo que lleva cada total depende de su manera: se dice de la que está marcada, con su transporte si lo tiene.
  const marcada = viaje.maneras.find((m) => m.id === x.manera) ?? viaje.maneras[0];
  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{t.cuentas.lado(viaje.maneras.length)}</h2>
        <div className="barras">
          {viaje.maneras.map((m) => (
            <button
              key={m.id}
              type="button"
              className="barra"
              aria-pressed={x.manera === m.id}
              onClick={() => x.aLaManera(m.id)}
            >
              <span className="barra__nombre">{t.viaje.manera[m.id]}</span>
              <span className="barra__precio">{dinero(m.total, m.moneda, idioma)}</span>
              <span className="barra__via">
                <i style={{ width: `${(m.total / tope) * 100}%` }} />
              </span>
            </button>
          ))}
        </div>
        {marcada !== undefined && (
          <p className="dato">{t.cuentas.incluye(t.viaje.manera[marcada.id], comoSeLlega(viaje, marcada))}</p>
        )}
        {x.alTransporte !== undefined && (
          <button type="button" className="enlace" onClick={x.alTransporte}>
            {t.transporte.abrir}
          </button>
        )}
      </div>
      <ElPresupuesto
        t={t}
        idioma={idioma}
        manera={marcada?.id ?? ""}
        dias={x.reparto.dias.length}
        {...presupuestoQueSeEnsena(viaje.presupuesto, tusCambios(x, viaje, marcada))}
      />
      {viaje.palancas.length > 0 && (
        <div className="grupo">
          <h2 className="titulo">{t.viaje.palancas}</h2>
          {viaje.palancas.map((p) => (
            <div className="palanca" key={p.id}>
              <span className="palanca__ahorra">{t.viaje.ahorra(dinero(p.ahorra, p.moneda, idioma))}</span>
              <b>{p.que}</b>
              <span>{p.aCambio}</span>
            </div>
          ))}
        </div>
      )}
      <p className="dato">{t.cuentas.fecha}</p>
    </>
  );
}

/**
 * Lo que hay en tus fechas (5.3): cada aviso por su clase y su tema, con el nombre que da su fuente, sus días y los
 * tuyos que toca, y el enlace a la página de donde sale. Y, si puedes moverlas, otras fechas con lo que cambia.
 */
function TusFechas({ t, idioma, viaje }: Comun & { viaje: Viaje }) {
  const c = viaje.calendario;
  if (c === undefined) return null;
  const f = t.fechas;
  const dia = (x: string): string => diaCorto(x, idioma);
  // La fecha de una página va con su año: puede ser de otro.
  const conAno = (x: string): string =>
    new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${x}T00:00:00Z`),
    );
  const total = noches(viaje.entrada, viaje.salida) + 1;
  const deAviso = (n: number): string => {
    const a = c.avisos[n];
    return a === undefined ? "" : (a.nombre ?? f.tema[a.tema] ?? a.tema);
  };
  return (
    <div className="grupo fechas">
      <h2 className="titulo">{f.titulo}</h2>
      {c.falta !== null && <p className="aviso">{f.faltan[c.falta]}</p>}
      {c.falta === null && c.avisos.length === 0 && <p className="aviso">{f.nada}</p>}
      {c.avisos.length > 0 && (
        <ul className="fechas__lista">
          {c.avisos.map((a, i) => (
            <li key={i} className={`fecha fecha--${a.clase}`}>
              <span className="fecha__clase">{f.clase[a.clase] ?? a.clase}</span>
              <b>{a.nombre ?? f.tema[a.tema] ?? a.tema}</b>
              {a.frase !== undefined && <span className="fecha__frase">{a.frase}</span>}
              {a.nombre !== null && <span className="fecha__tema">{f.tema[a.tema] ?? a.tema}</span>}
              {a.desde !== null && a.hasta !== null && (
                <span className="dato">
                  {f.deA(dia(a.desde), dia(a.hasta))}. {f.tuyos(a.dias.length, total)}
                </span>
              )}
              {a.pide !== undefined && <span className="dato">{f.pide(a.pide.dias, a.pide.dias + a.pide.deMas)}</span>}
              {a.precio !== null && (
                <span className="dato">{f.precio(dinero(a.precio.importe, a.precio.moneda, idioma))}</span>
              )}
              <a className="enlace" href={a.fuente} target="_blank" rel="noopener noreferrer nofollow">
                {f.fuente(a.visto === null ? null : conAno(a.visto))}
              </a>
            </li>
          ))}
        </ul>
      )}
      {c.ventanas.length > 0 && (
        <>
          <h3 className="fechas__sub">{f.ventanas}</h3>
          {c.ventanas.map((v) => (
            <div key={v.entrada} className="fecha fecha--ventana">
              <b>{f.ventana(dia(v.entrada), dia(v.salida), v.seMueve)}</b>
              {v.frase !== undefined && <span className="fecha__frase">{v.frase}</span>}
              {(
                [
                  ["evita", v.evita],
                  ["alcanza", v.alcanza],
                  ["pierde", v.pierde],
                  ["entra", v.entra],
                ] as const
              )
                .filter(([, ns]) => ns.length > 0)
                .map(([clave, ns]) => (
                  <span key={clave} className="dato">
                    {f[clave]}: {ns.map(deAviso).join(", ")}
                  </span>
                ))}
            </div>
          ))}
        </>
      )}
      {c.avisos.length > 0 && <p className="credito">{f.nota}</p>}
    </div>
  );
}

/**
 * Tus papeles (5.4, puerta 2): por cada viajero, lo que piden las fuentes oficiales pregunta a pregunta, con su
 * fuente y los plazos que cuenta el código. Lo que no piden nada va junto, en una línea. Si algo bloquea, o faltan,
 * se dice antes que nada; y, si es tu turno, puedes seguir igual.
 */
export function TusPapeles({
  t,
  idioma,
  papeles: p,
  alSeguir,
  ocupado = false,
}: Comun & { papeles: DeLosPapeles; alSeguir?: () => void; ocupado?: boolean }) {
  const f = t.papeles;
  const fecha = (x: string): string =>
    new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${x}T00:00:00Z`),
    );
  const paran = p.bloquea || p.falta !== null;
  const escalas = p.fuera.some((x) => x.porQue === "transit_unknown");
  return (
    <div className="grupo papeles">
      <h2 className="titulo">{f.titulo}</h2>
      {p.falta !== null && (
        <p className="aviso" role={alSeguir ? "alert" : undefined}>
          {f.faltan[p.falta]}
        </p>
      )}
      {p.bloquea && (
        <p className="aviso" role={alSeguir ? "alert" : undefined}>
          {f.bloquean}
        </p>
      )}
      {paran && p.sigue && <p className="dato">{f.seguido}</p>}
      {paran && !p.sigue && alSeguir !== undefined && (
        <>
          <p className="suave">{f.decide}</p>
          <button type="button" className="boton boton--hueco" disabled={ocupado} onClick={alSeguir}>
            {f.seguir}
          </button>
        </>
      )}
      {p.casillas.length > 0 && <p className="suave">{f.sub}</p>}
      {p.viajeros.map((v, i) => {
        const suyas = p.casillas.filter((c) => c.viajero === i);
        if (suyas.length === 0) return null;
        const nada = suyas.filter((c) => c.estado === "in_order");
        const algo = suyas.filter((c) => c.estado !== "in_order");
        // Primero lo que bloquea, después lo dudoso y lo que hay que hacer.
        const orden = ["blocks", "doubtful", "to_do", "warning"];
        algo.sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado));
        return (
          <div key={i} className="papeles__viajero">
            <h3 className="fechas__sub">{f.viajero(v.pasaporte, v.edad, v.cuantos)}</h3>
            <ul className="fechas__lista">
              {algo.map((c) => (
                <li key={`${c.pais}-${c.pregunta}`} className={`fecha fecha--papel-${c.estado}`}>
                  <span className="fecha__clase">{f.estado[c.estado] ?? c.estado}</span>
                  <b>{f.pregunta[c.pregunta] ?? c.pregunta}</b>
                  {c.duda !== null && <span className="fecha__tema">{f.duda[c.duda] ?? c.duda}</span>}
                  {c.hasta !== null && <span className="dato">{f.hasta(fecha(c.hasta))}</span>}
                  {c.antesDe !== null && <span className="dato">{f.antesDe(fecha(c.antesDe), c.tarde)}</span>}
                  {c.coste !== null && (
                    <span className="dato">{f.coste(dinero(c.coste.importe, c.coste.moneda, idioma))}</span>
                  )}
                  {c.fuentes.map((x) => (
                    <a key={x.url} className="enlace" href={x.url} target="_blank" rel="noopener noreferrer nofollow">
                      {f.fuente(f.lado[x.lado] ?? x.lado, fecha(x.visto))}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
            {nada.length > 0 && (
              <p className="dato">
                {f.enRegla}: {nada.map((c) => f.pregunta[c.pregunta] ?? c.pregunta).join(", ")}
              </p>
            )}
          </div>
        );
      })}
      {p.fuera.some((x) => x.porQue === "own_country") && <p className="dato">{f.fuera.own_country}</p>}
      {escalas && p.casillas.length > 0 && <p className="credito">{f.fuera.transit_unknown}</p>}
    </div>
  );
}

function Avisos({ t, idioma, viaje, manera, reparto }: DeViaje) {
  const c = caminosDe(viaje.caminos);
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p]));
  // También cuenta lo de donde duermes a la primera parada de cada día.
  const cama = viaje.alojamientos.find((a) => a.id === viaje.maneras.find((m) => m.id === manera)?.alojamiento);
  const seAndaDesdeLaCama = (d: { paradas: string[] }): boolean => {
    const primera = deParada.get(d.paradas[0] ?? "");
    return (
      cama === undefined || primera === undefined || irEntre(cama.punto, primera.punto, c, "en").cogiendo.length === 0
    );
  };
  // Si la fuente de rutas dio algún coche, sus tiempos son sin tráfico, y se dice así.
  const conCoche = (viaje.caminos?.caminos ?? []).some((x) => x.enCoche !== undefined);
  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{t.viaje.avisos}</h2>
        {/* Si el viaje no se anda entero, se dice antes que nada: los tiempos que no son a pie son aproximados. */}
        {(viaje.alojamientos.some((a) => a.aPie === false) ||
          viaje.dias.some((d) => !seAndaElDia(d, deParada, c)) ||
          reparto.dias.some((d) => !seAndaDesdeLaCama(d))) && (
          <p className="aviso">{conCoche ? t.viaje.noSeAndaSinTrafico : t.viaje.noSeAnda}</p>
        )}
        {viaje.avisos.map((a) => (
          <p className="aviso" key={a}>
            {a}
          </p>
        ))}
      </div>
      <TusFechas t={t} idioma={idioma} viaje={viaje} />
      {viaje.papeles !== undefined && <TusPapeles t={t} idioma={idioma} papeles={viaje.papeles} />}
      <p className="credito">
        {viaje.muestra ? `${t.viaje.muestra} ` : ""}
        {t.ia}
      </p>
    </>
  );
}

export function TuViaje(x: DeViaje) {
  const { t, idioma, viaje, reparto } = x;
  const elegida = viaje.maneras.find((m) => m.id === x.manera) ?? viaje.maneras[0];
  const puestas = reparto.dias.reduce((s, d) => s + d.paradas.length, 0);
  const andado = reparto.dias.reduce((s, d) => s + d.metros.reduce((a, m) => a + m, 0), 0);
  // Si algún trayecto entre paradas no se anda, o no se anda desde donde se duerme, se dice: nada va «andando» que
  // no se ande.
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p]));
  const c = caminosDe(viaje.caminos);
  const trayectosAPie = reparto.dias.every((d) => seAndaElDia(d, deParada, c));
  const todoAPie = trayectosAPie && viaje.alojamientos.every((a) => a.aPie !== false);
  // Un viaje cerrado abre con lo que hay que reservar.
  const pestanas: Pestana[] = [...(viaje.cierre ? (["book"] as const) : []), "days", "stay", "money", "there", "notes"];
  // El total de arriba es el de la manera elegida: dice si es de las noches solas o también de cómo se llega. Con el
  // viaje cerrado, es el de la manera con que se cerró, con los precios de ese día; si ese día no hubo total, el que
  // se vio, y de qué día es.
  const cierre = viaje.cierre;
  const arriba =
    (cierre && viaje.maneras.find((m) => m.id === cierre.manera)) ||
    conLoTuyo(x).maneras.find((m) => m.id === elegida?.id) ||
    elegida;
  const llega = comoSeLlega(viaje, arriba);
  const cifra = cierre ? (cierre.total.hoy ?? cierre.total.antes) : arriba?.total;
  const moneda = cierre ? cierre.moneda : arriba?.moneda;
  const visto = cierre?.precios.map((p) => p.antes.visto.slice(0, 10)).sort()[0];
  const deCuando = !cierre
    ? null
    : cierre.total.hoy !== null
      ? t.cifras.alCerrar(diaCorto(cierre.cuando.slice(0, 10), idioma))
      : visto === undefined
        ? null
        : t.cifras.vistoEl(diaCorto(visto, idioma));
  return (
    <>
      <CabeceraDelViaje t={t} idioma={idioma} viaje={viaje} rotulo={t.viaje.rotulo} />
      <div className="cifras">
        <div className="oro">
          <b>{cifra !== undefined && moneda !== undefined ? dinero(cifra, moneda, idioma) : "?"}</b>
          <span>{t.cifras.total(noches(viaje.entrada, viaje.salida), llega?.clase ?? null)}</span>
          {deCuando !== null && <span>{deCuando}</span>}
        </div>
        <div>
          <b>{puestas}</b>
          <span>{t.cifras.paradas(puestas)}</span>
        </div>
        <div>
          <b>{andar(andado, idioma).lejos}</b>
          <span>{todoAPie ? t.cifras.andando : t.cifras.entreParadas}</span>
        </div>
      </div>
      <div className="pestanas" role="tablist" aria-label={t.viaje.rotulo}>
        {pestanas.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={x.pestana === p} onClick={() => x.aLaPestana(p)}>
            {p === "book" ? t.cerrar.pestana : t.pestanas[p]}
            {p === "notes" && viaje.avisos.length > 0 && <i>{viaje.avisos.length}</i>}
          </button>
        ))}
      </div>
      <div
        className="pestana"
        role="tabpanel"
        aria-label={x.pestana === "book" ? t.cerrar.pestana : t.pestanas[x.pestana]}
      >
        {x.pestana === "book" && viaje.cierre && <Reservar t={t} idioma={idioma} viaje={viaje} cierre={viaje.cierre} />}
        {x.pestana === "days" && <Dias {...x} />}
        {x.pestana === "stay" && <Dormir {...x} viaje={conLoTuyo(x)} />}
        {x.pestana === "money" && <Cuentas {...x} viaje={conLoTuyo(x)} />}
        {x.pestana === "there" && <Alli t={t} idioma={idioma} viaje={viaje} dias={reparto.dias} />}
        {x.pestana === "notes" && <Avisos {...x} />}
      </div>
    </>
  );
}

/** Por qué no vale un alojamiento para este viajero, dicho en su idioma a partir del dato del código. */
/**
 * Un trayecto entre dos paradas, dicho: andando, con sus minutos, o con lo que tenga sentido coger. Lo que midió la
 * fuente de rutas se dice tal cual (el coche, sin tráfico); lo que sale de la cuenta de la casa, como aproximado.
 */
function tramo(t: Textos, x: Ir): string {
  if (x.cogiendo.length === 0)
    return x.segun === "fuente" ? t.viaje.andandoMedido(x.lejos, x.minutos) : t.viaje.andando(x.lejos, x.minutos);
  const maneras = x.cogiendo.map((m) => t.viaje.maneraDeIr[m] ?? m);
  return x.segun === "fuente"
    ? t.viaje.enCoche(x.lejos, x.minutos, maneras)
    : t.viaje.cogiendo(x.lejos, x.minutos, maneras);
}

/** Si todos los trayectos de un día, de parada a parada, se andan. */
function seAndaElDia(d: { paradas: string[] }, deParada: Map<string, Parada>, c: Caminos | undefined): boolean {
  const puntos = d.paradas.flatMap((id) => deParada.get(id)?.punto ?? []);
  return puntos.slice(1).every((a, i) => irEntre(puntos[i], a, c, "en").cogiendo.length === 0);
}

function descarte(t: Textos, d: NonNullable<Alojamiento["descartado"]>): string {
  if (d.clase === "missing_must") {
    const campo = COSAS[d.cosa]?.campo;
    return t.dormir.leFalta(t.campos[campo ?? ""] ?? d.cosa, t.niveles[d.detalle] ?? d.detalle);
  }
  return t.dormir.quejas(t.dormir.queja[d.cosa] ?? d.cosa, t.menciones[d.detalle] ?? d.detalle);
}

type DeFicha = Comun & { a: Alojamiento; nochesDelViaje: number; alVolver: () => void };

/** La ficha de un alojamiento. Las noches son las del viaje, para decir de cuántas es su precio. */
export function Ficha({ t, idioma, a, nochesDelViaje, alVolver }: DeFicha) {
  const fecha = new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short" }).format(new Date(a.precio.visto));
  // De la habitación de ese precio se dice lo que se sabe: su nombre, si lo hay, y sus metros o que no los da.
  const habitacion = [a.habitacion, a.metros === null ? t.ficha.sinMetros : t.ficha.metros(a.metros)]
    .filter((dato) => dato !== null && dato.trim() !== "")
    .join(", ");
  return (
    <>
      <button type="button" className="enlace atras" onClick={alVolver}>
        ← {t.ficha.volver}
      </button>
      <div className="cabecera">
        <h1 className="titulo titulo--grande">{a.nombre}</h1>
        <div className="cabecera__linea">
          {/* Sin estrellas (una casa, un piso) no se dice «0 estrellas»: no tener categoría no es tener la peor. */}
          {a.estrellas !== null && a.estrellas > 0 && (
            <span className="pastilla">{t.ficha.estrellas(a.estrellas)}</span>
          )}
          {a.nota !== null && a.opiniones !== null && (
            <span className="pastilla">{t.ficha.nota(a.nota, a.opiniones)}</span>
          )}
        </div>
        <span className="dato">{coordenadas(a.punto)}</span>
        {(a.zona != null || a.andando != null) && (
          <span className="dato">{t.dormir.donde(a.zona ?? null, a.andando ?? null, a.aPie ?? true)}</span>
        )}
        {a.puntos != null && <span className="dato">{t.dormir.puntos(a.puntos)}</span>}
      </div>
      {a.descartado != null && (
        <p className="aviso aviso--novale">
          <b>{t.dormir.noVale}. </b>
          {descarte(t, a.descartado)}
        </p>
      )}
      <div className="grupo">
        <span className="rotulo">
          {t.ficha.habitacion}: {habitacion}
        </span>
        {a.avisos.map((x) => (
          <p className="aviso" key={x}>
            {t.ficha.avisos[x] ?? x}
          </p>
        ))}
        {a.fotos.length > 0 && a.fotosDeHabitacion === 0 && <span className="rotulo">{t.ficha.fotosDelSitio}</span>}
        {a.fotos.length > 0 && (
          <div className="tira">
            {a.fotos.slice(0, 10).map((f, i) => (
              <img key={f} src={foto(f, 640)} alt={`${a.nombre}, ${i + 1}`} loading="lazy" />
            ))}
          </div>
        )}
      </div>
      <div className="grupo">
        <h2 className="titulo">{t.ficha.comoEs}</h2>
        {a.comoEs.length === 0 ? (
          <p className="suave">{t.ficha.sinMirar}</p>
        ) : (
          <>
            <div className="rasgos">
              {a.comoEs.map((r) => (
                <div key={r.campo} className={r.nivel === "unknown" ? "rasgo rasgo--nose" : "rasgo"}>
                  <span className="rotulo">{t.campos[r.campo] ?? r.campo}</span>
                  <b>{t.niveles[r.nivel] ?? r.nivel}</b>
                  {r.foto !== null ? (
                    <a className="dato enlace" href={foto(r.foto, 1080)} target="_blank" rel="noreferrer">
                      {t.ficha.prueba.photo}
                    </a>
                  ) : (
                    r.prueba !== null && <span className="dato">{t.ficha.prueba[r.prueba]}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="dato">{t.ficha.comoEsNota}</p>
          </>
        )}
      </div>
      {a.seDice.length > 0 && (
        <div className="grupo">
          <h2 className="titulo">{t.ficha.seDice}</h2>
          <div className="rasgos">
            {a.seDice.map((d) => (
              <div key={`${d.tema}-${d.tono}`} className={`rasgo rasgo--${d.tono}`}>
                <span className="rotulo">{t.temas[d.tema] ?? d.tema}</span>
                <b>{t.tonos[d.tono] ?? d.tono}</b>
                <span className="dato">{t.menciones[d.menciones] ?? d.menciones}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="palanca">
        <span className="palanca__ahorra">{dinero(a.precio.total, a.precio.moneda, idioma)}</span>
        <b>{t.ficha.precio(nochesDelViaje)}</b>
        <span>
          {a.precio.vendedor ?? ""} {t.ficha.visto(fecha)}
        </span>
      </div>
      {a.otrasOfertas.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.ficha.otras(a.otrasOfertas.length)}</span>
          <div className="cabecera__linea">
            {a.otrasOfertas.map((o) => (
              <a
                key={`${o.vendedor}-${o.total}`}
                className="pastilla"
                href={o.enlace ?? undefined}
                target="_blank"
                rel="noreferrer"
              >
                {o.vendedor}: {dinero(o.total, o.moneda, idioma)}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
