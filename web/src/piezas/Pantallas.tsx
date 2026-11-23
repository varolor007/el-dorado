"use client";

// Lo que va dentro de la hoja en cada etapa: el saludo del mapa del mundo, el primer vistazo, la investigación en
// vivo, tu viaje (con sus pestañas: los días, dónde dormir, las cuentas y los avisos) y la ficha de un alojamiento.
// Son piezas que enseñan: lo que se decide vive en la página.

import { useState } from "react";
import { COSAS } from "../../../agent/data/gustos.ts";
import type { Alojamiento, Manera, Parada, Ritmo, Suceso, Viaje } from "../../../agent/output/viaje.ts";
import { RITMOS } from "../../../agent/output/viaje.ts";
import type { Reparto } from "../../../agent/scripts/ritmo.ts";
import { andar, coordenadas, diaCorto, diaDeLaSemana, diaEnGoogleMaps, dinero, duracion } from "../lib/formato.ts";
import { enGoogleMaps, noches } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { foto, type Reproductor } from "../lib/usar.ts";

type Comun = { t: Textos; idioma: string };

/** El mundo: `grabado` es el nombre del destino del viaje grabado, si hay alguno. */
export function Mundo({ t, grabado, alProbar }: Comun & { grabado: string | null; alProbar: () => void }) {
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
      <p className="dato">{t.mundo.seco(grabado)}</p>
    </>
  );
}

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
      </div>
    </div>
  );
}

export function Vistazo({ t, idioma, viaje }: Comun & { viaje: Viaje }) {
  const v = viaje.vistazo;
  const numero = (n: number): string => new Intl.NumberFormat(idioma).format(n);
  return (
    <>
      <CabeceraDelViaje t={t} idioma={idioma} viaje={viaje} rotulo={t.vistazo.rotulo} />
      <span className="dato">{coordenadas(viaje.destino.punto)}</span>
      {v !== null && (
        <div className="cifras">
          <div>
            <b>{numero(v.devueltos)}</b>
            <span>{t.vistazo.encontrados}</span>
          </div>
          <div>
            <b>{numero(v.pasan)}</b>
            <span>{t.vistazo.pasan}</span>
          </div>
          <div className="oro">
            <b>{v.desde === null ? "?" : dinero(v.desde, v.moneda, idioma)}</b>
            <span>{t.vistazo.desde}</span>
          </div>
        </div>
      )}
      {v !== null && (
        <p className="dato">{t.vistazo.minimos(v.minimos.nota, v.minimos.opiniones, v.minimos.estrellas)}</p>
      )}
      {viaje.transportes.length === 0 && <p className="aviso">{t.vistazo.sinVuelos}</p>}
    </>
  );
}

/** Las líneas de lo que va pasando: los recuentos, con su número delante; lo demás, en una frase. */
function frase(s: Suceso, t: Textos, idioma: string): { n: string | null; texto: string } | null {
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
      return { n, texto: t.vivo.lodgings_priced(s.n ?? 0) };
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
    default:
      return null;
  }
}

/** Un grupo de toques: una pregunta con sus respuestas, de las que se marca una o varias. */
function Toques({ titulo, opciones, varias }: { titulo: string; opciones: string[]; varias?: boolean }) {
  const [marcadas, setMarcadas] = useState<string[]>([opciones[0]]);
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

/** Las preguntas, mientras ya busca. En seco no cambian nada: enseñan cómo se contestan, con toques y sin escribir. */
function Preguntas({ t, viaje }: { t: Textos; viaje: Viaje }) {
  const p = t.preguntas;
  return (
    <div className="preguntas">
      <h2 className="titulo">{p.titulo}</h2>
      <Toques titulo={p.origen} opciones={p.origenOpciones} />
      <Toques titulo={p.quienes} opciones={[t.vistazo.adultos(viaje.adultos), "1", "3", "4"]} />
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
  const lineas = r.vistos
    .map((s, i) => ({ s, i, f: frase(s, t, idioma) }))
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
            <span className="dato">{(s.t / 1000).toFixed(1)} s</span>
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

export type Pestana = "days" | "stay" | "money" | "notes";

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
};

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
  const fuera = reparto.fuera.filter((id) => !x.quitadas.includes(id));
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
          <div className="paradas">
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
                        {p.reservar === true && <span className="pastilla">{t.parada.reservar}</span>}
                        {x.anadidas.includes(p.id) && <span className="pastilla">{t.acciones.tuya}</span>}
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
                  {i < todas.length - 1 && (
                    <div className="tramo">
                      <span className="dato">
                        {t.viaje.andando(
                          andar(abierto.metros[i], idioma).lejos,
                          andar(abierto.metros[i], idioma).minutos,
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
              href={diaEnGoogleMaps(abierto.paradas.flatMap((id) => deParada.get(id)?.punto ?? [])) ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              {t.viaje.diaEnMapas}
            </a>
          )}
        </div>
      )}

      {fuera.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.viaje.fuera}</span>
          <div className="cabecera__linea">
            {fuera.map((id) => (
              <button key={id} type="button" className="toque" onClick={() => x.alAnadir(id)}>
                + {deParada.get(id)?.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
      {x.quitadas.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.acciones.quitadas}</span>
          <div className="cabecera__linea">
            {x.quitadas.map((id) => (
              <button key={id} type="button" className="toque" onClick={() => x.alAnadir(id)}>
                {t.acciones.reponer}: {deParada.get(id)?.nombre}
              </button>
            ))}
          </div>
        </div>
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
          <h2 className="titulo">{t.viaje.maneras}</h2>
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
                      <p className="dato">{t.dormir.donde(a.zona ?? null, a.andando ?? null)}</p>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {otros.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.dormir.otros}</span>
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

function Cuentas(x: DeViaje) {
  const { t, idioma, viaje } = x;
  const tope = Math.max(...viaje.maneras.map((m) => m.total), 1);
  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{t.cuentas.lado}</h2>
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
        <p className="dato">
          {viaje.maneras.some((m) => m.transporte !== null) ? t.cuentas.incluyeTodo : t.cuentas.incluye}
        </p>
      </div>
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

function Avisos({ t, viaje }: DeViaje) {
  return (
    <>
      <div className="grupo">
        <h2 className="titulo">{t.viaje.avisos}</h2>
        {viaje.avisos.map((a) => (
          <p className="aviso" key={a}>
            {a}
          </p>
        ))}
      </div>
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
  const pestanas: Pestana[] = ["days", "stay", "money", "notes"];
  return (
    <>
      <CabeceraDelViaje t={t} idioma={idioma} viaje={viaje} rotulo={t.viaje.rotulo} />
      <div className="cifras">
        <div className="oro">
          <b>{elegida ? dinero(elegida.total, elegida.moneda, idioma) : "?"}</b>
          <span>{t.cifras.total}</span>
        </div>
        <div>
          <b>{puestas}</b>
          <span>{t.cifras.paradas}</span>
        </div>
        <div>
          <b>{andar(andado, idioma).lejos}</b>
          <span>{t.cifras.andando}</span>
        </div>
      </div>
      <div className="pestanas" role="tablist" aria-label={t.viaje.rotulo}>
        {pestanas.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={x.pestana === p} onClick={() => x.aLaPestana(p)}>
            {t.pestanas[p]}
            {p === "notes" && viaje.avisos.length > 0 && <i>{viaje.avisos.length}</i>}
          </button>
        ))}
      </div>
      <div className="pestana" role="tabpanel" aria-label={t.pestanas[x.pestana]}>
        {x.pestana === "days" && <Dias {...x} />}
        {x.pestana === "stay" && <Dormir {...x} />}
        {x.pestana === "money" && <Cuentas {...x} />}
        {x.pestana === "notes" && <Avisos {...x} />}
      </div>
    </>
  );
}

/** Por qué no vale un alojamiento para este viajero, dicho en su idioma a partir del dato del código. */
function descarte(t: Textos, d: NonNullable<Alojamiento["descartado"]>): string {
  if (d.clase === "missing_must") {
    const campo = COSAS[d.cosa]?.campo;
    return t.dormir.leFalta(t.campos[campo ?? ""] ?? d.cosa, t.niveles[d.detalle] ?? d.detalle);
  }
  return t.dormir.quejas(t.dormir.queja[d.cosa] ?? d.cosa, d.detalle);
}

export function Ficha({ t, idioma, a, alVolver }: Comun & { a: Alojamiento; alVolver: () => void }) {
  const fecha = new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short" }).format(new Date(a.precio.visto));
  return (
    <>
      <button type="button" className="enlace atras" onClick={alVolver}>
        ← {t.ficha.volver}
      </button>
      <div className="cabecera">
        <h1 className="titulo titulo--grande">{a.nombre}</h1>
        <div className="cabecera__linea">
          {a.estrellas !== null && <span className="pastilla">{t.ficha.estrellas(a.estrellas)}</span>}
          {a.nota !== null && a.opiniones !== null && (
            <span className="pastilla">{t.ficha.nota(a.nota, a.opiniones)}</span>
          )}
        </div>
        <span className="dato">{coordenadas(a.punto)}</span>
        {(a.zona != null || a.andando != null) && (
          <span className="dato">{t.dormir.donde(a.zona ?? null, a.andando ?? null)}</span>
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
          {t.ficha.habitacion}: {a.habitacion ?? ""}, {a.metros === null ? t.ficha.sinMetros : t.ficha.metros(a.metros)}
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
        <b>{t.ficha.precio}</b>
        <span>
          {a.precio.vendedor ?? ""} {t.ficha.visto(fecha)}
        </span>
      </div>
      {a.otrasOfertas.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.ficha.otras}</span>
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
