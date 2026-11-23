"use client";

// Lo que va dentro de la hoja en cada etapa: el saludo del mapa del mundo, el primer vistazo, la investigación en
// vivo, tu viaje y la ficha de un alojamiento. Son piezas que enseñan: lo que se decide vive en la página.

import type { Alojamiento, Manera, Parada, Ritmo, Suceso, Viaje } from "../../../agent/output/viaje.ts";
import { RITMOS } from "../../../agent/output/viaje.ts";
import type { Reparto } from "../../../agent/scripts/ritmo.ts";
import { andar, coordenadas, diaCorto, diaDeLaSemana, diaEnGoogleMaps, dinero, duracion } from "../lib/formato.ts";
import { enGoogleMaps, noches } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { foto, type Reproductor } from "../lib/usar.ts";

type Comun = { t: Textos; idioma: string };

export function Mundo({ t, hayGrabado, alProbar }: Comun & { hayGrabado: boolean; alProbar: () => void }) {
  return (
    <>
      <div className="cabecera">
        <h1 className="lugar">{t.mundo.saludo}</h1>
        <p className="suave">{t.mundo.cuerpo}</p>
      </div>
      {hayGrabado && (
        <button type="button" className="boton boton--hueco" onClick={alProbar}>
          {t.mundo.ejemplo}
        </button>
      )}
      <p className="dato">{t.mundo.seco}</p>
    </>
  );
}

export function Vistazo({ t, idioma, viaje }: Comun & { viaje: Viaje }) {
  const v = viaje.vistazo;
  const n = noches(viaje.entrada, viaje.salida);
  return (
    <>
      <div className="cabecera">
        <span className="rotulo">{t.vistazo.rotulo}</span>
        <h1 className="lugar">{viaje.destino.nombre}</h1>
        <div className="cabecera__linea">
          <span className="pastilla">
            {diaCorto(viaje.entrada, idioma)} → {diaCorto(viaje.salida, idioma)}
          </span>
          <span className="pastilla">{t.vistazo.noches(n)}</span>
          <span className="pastilla">{t.vistazo.adultos(viaje.adultos)}</span>
        </div>
        <span className="dato">{coordenadas(viaje.destino.punto)}</span>
      </div>
      {v !== null && (
        <div className="cifras">
          <div>
            <b>{new Intl.NumberFormat(idioma).format(v.devueltos)}</b>
            <span>{t.vistazo.encontrados}</span>
          </div>
          <div>
            <b>{new Intl.NumberFormat(idioma).format(v.pasan)}</b>
            <span>{t.vistazo.pasan}</span>
          </div>
          <div className="oro">
            <b>{v.desde === null ? "?" : dinero(v.desde, v.moneda, idioma)}</b>
            <span>{t.vistazo.desde}</span>
          </div>
        </div>
      )}
      <p className="dato">{t.vistazo.minimos}</p>
      <p className="aviso">{t.vistazo.sinVuelos}</p>
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

export function EnVivo({ t, idioma, viaje, r }: Comun & { viaje: Viaje; r: Reproductor }) {
  // Mientras se mira un alojamiento se dice que se está mirando; al acabar, esa línea pasa a ser la de lo mirado.
  const mirados = new Set(r.vistos.filter((s) => s.clase === "looked").map((s) => s.ref));
  const lineas = r.vistos
    .map((s, i) => ({ s, i, f: frase(s, t, idioma) }))
    .filter((x) => x.f !== null && !(x.s.clase === "looking" && mirados.has(x.s.ref)))
    .reverse()
    .slice(0, 8);
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
      <p className="dato">{viaje.muestra ? t.viaje.muestra : ""}</p>
    </>
  );
}

type DeViaje = Comun & {
  viaje: Viaje;
  reparto: Reparto;
  dia: number | null;
  ritmo: Ritmo;
  manera: Manera["id"];
  parada: string | null;
  alDia: (d: number | null) => void;
  alRitmo: (r: Ritmo) => void;
  aLaManera: (m: Manera["id"]) => void;
  aLaParada: (id: string | null) => void;
  alAlojamiento: (id: string) => void;
};

function FilaDeParada({
  t,
  p,
  n,
  activa,
  alTocar,
}: {
  t: Textos;
  p: Parada;
  n: number;
  activa: boolean;
  alTocar: () => void;
}) {
  return (
    <button type="button" className="parada-fila" aria-current={activa} onClick={alTocar}>
      <span
        className="parada-fila__foto"
        style={p.foto ? { backgroundImage: `url(${foto(p.foto.url, 128)})` } : undefined}
      >
        {p.foto ? null : p.nombre.slice(0, 1)}
        <span className="parada-fila__n">{n}</span>
      </span>
      <span className="parada-fila__texto">
        <b>{p.nombre}</b>
        <p>{p.porQue}</p>
        <span className="cabecera__linea">
          <span className="dato">{duracion(p.minutos)}</span>
          {p.imprescindible && <span className="pastilla pastilla--oro">{t.viaje.imprescindible}</span>}
        </span>
      </span>
    </button>
  );
}

export function TuViaje(x: DeViaje) {
  const { t, idioma, viaje, reparto } = x;
  const deParada = new Map(viaje.paradas.map((p) => [p.id, p]));
  const dias = reparto.dias.map((d, i) => ({ ...d, i })).filter((d) => x.dia === null || d.i === x.dia);
  const n = noches(viaje.entrada, viaje.salida);
  return (
    <>
      <div className="cabecera">
        <span className="rotulo">{t.viaje.rotulo}</span>
        <h1 className="lugar">{viaje.destino.nombre}</h1>
        <div className="cabecera__linea">
          <span className="pastilla">
            {diaCorto(viaje.entrada, idioma)} → {diaCorto(viaje.salida, idioma)}
          </span>
          <span className="pastilla">{t.vistazo.noches(n)}</span>
          <span className="pastilla">{t.vistazo.adultos(viaje.adultos)}</span>
        </div>
      </div>

      <div className="grupo">
        <div className="mando mando--dias" role="group" aria-label={t.viaje.rotulo}>
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

      {x.dia === null && (
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

      {x.dia !== null &&
        dias.map((d) => {
          const paradas = d.paradas.flatMap((id) => deParada.get(id) ?? []);
          const ruta = diaEnGoogleMaps(paradas.map((p) => p.punto));
          const andado = d.metros.reduce((s, m) => s + m, 0);
          return (
            <div className="grupo" key={d.fecha}>
              <div className="grupo__cab">
                <h2 className="titulo">
                  {t.viaje.dia(d.i + 1)}
                  {d.titulo ? `, ${d.titulo}` : ""}
                </h2>
              </div>
              <span className="dato">
                {diaCorto(d.fecha, idioma)}, {t.viaje.paradas(paradas.length)}
                {andado > 0 ? `, ${andar(andado, idioma).lejos}` : ""}
              </span>
              {paradas.length === 0 && <p className="suave">{t.viaje.sinParadas}</p>}
              <div className="paradas">
                {paradas.map((p, i) => (
                  <div key={p.id}>
                    <FilaDeParada t={t} p={p} n={i + 1} activa={x.parada === p.id} alTocar={() => x.aLaParada(p.id)} />
                    {x.parada === p.id && (
                      <div className="tramo" style={{ minHeight: 0 }}>
                        <span />
                        <span className="cabecera__linea">
                          <a className="enlace" href={enGoogleMaps(p.punto, p.nombre)} target="_blank" rel="noreferrer">
                            {t.viaje.enMapas}
                          </a>
                          {p.foto?.autor && p.foto.licencia && (
                            <span className="credito">{t.foto(p.foto.autor, p.foto.licencia)}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {i < paradas.length - 1 && (
                      <div className="tramo">
                        <span className="dato">
                          {t.viaje.andando(andar(d.metros[i], idioma).lejos, andar(d.metros[i], idioma).minutos)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {ruta !== null && x.dia !== null && (
                <a className="enlace" href={ruta} target="_blank" rel="noreferrer">
                  {t.viaje.diaEnMapas}
                </a>
              )}
            </div>
          );
        })}

      {reparto.fuera.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.viaje.fuera}</span>
          <div className="cabecera__linea">
            {reparto.fuera.map((id) => (
              <span key={id} className="pastilla">
                {deParada.get(id)?.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grupo">
        <div className="grupo__cab">
          <h2 className="titulo">{t.viaje.maneras}</h2>
          <span className="dato">{t.viaje.soloDormir}</span>
        </div>
        <div className="maneras">
          {viaje.maneras.map((m) => {
            const a = viaje.alojamientos.find((al) => al.id === m.alojamiento);
            return (
              <button
                key={m.id}
                type="button"
                className="manera"
                aria-pressed={x.manera === m.id}
                onClick={() => x.aLaManera(m.id)}
              >
                <span className="manera__nombre">{t.viaje.manera[m.id]}</span>
                <span className="manera__precio">{dinero(m.total, m.moneda, idioma)}</span>
                <span className="manera__donde">{a?.nombre}</span>
                {x.manera === m.id && (
                  <>
                    <span className="manera__gana">
                      <b>{t.viaje.gana}. </b>
                      {m.gana}
                    </span>
                    <span className="manera__gana">
                      <b>{t.viaje.pierde}. </b>
                      {m.pierde}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
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

      {viaje.avisos.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.viaje.avisos}</span>
          {viaje.avisos.map((a) => (
            <p className="aviso" key={a}>
              {a}
            </p>
          ))}
        </div>
      )}
      <p className="credito">
        {viaje.muestra ? `${t.viaje.muestra} ` : ""}
        {t.ia}
      </p>
    </>
  );
}

export function Ficha({ t, idioma, a, alVolver }: Comun & { a: Alojamiento; alVolver: () => void }) {
  const fecha = new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short" }).format(new Date(a.precio.visto));
  return (
    <>
      <button type="button" className="enlace atras" onClick={alVolver}>
        ← {t.ficha.volver}
      </button>
      <div className="cabecera">
        <h1 className="titulo" style={{ fontSize: "1.8rem" }}>
          {a.nombre}
        </h1>
        <div className="cabecera__linea">
          {a.estrellas !== null && <span className="pastilla">{t.ficha.estrellas(a.estrellas)}</span>}
          {a.nota !== null && a.opiniones !== null && (
            <span className="pastilla">{t.ficha.nota(a.nota, a.opiniones)}</span>
          )}
        </div>
        <span className="dato">{coordenadas(a.punto)}</span>
      </div>
      {a.fotos.length > 0 && (
        <div className="grupo">
          <span className="rotulo">
            {t.ficha.habitacion}: {a.habitacion ?? ""},{" "}
            {a.metros === null ? t.ficha.sinMetros : t.ficha.metros(a.metros)}
          </span>
          <div className="tira">
            {a.fotos.slice(0, 10).map((f) => (
              <img key={f} src={foto(f, 640)} alt="" loading="lazy" />
            ))}
          </div>
        </div>
      )}
      {(a.loMejor !== null || a.loPeor !== null) && (
        <div className="dos">
          {a.loMejor !== null && (
            <p>
              <span className="rotulo">{t.ficha.loMejor}</span>
              {a.loMejor}
            </p>
          )}
          {a.loPeor !== null && (
            <p>
              <span className="rotulo">{t.ficha.loPeor}</span>
              {a.loPeor}
            </p>
          )}
        </div>
      )}
      <div className="grupo">
        <h2 className="titulo">{t.ficha.comoEs}</h2>
        {a.comoEs.length === 0 ? (
          <p className="suave">{t.ficha.sinMirar}</p>
        ) : (
          <>
            <div className="rasgos">
              {a.comoEs.map((r) => (
                <div
                  key={r.campo}
                  className={r.nivel === "unknown" ? "rasgo rasgo--nose" : "rasgo"}
                  title={r.prueba ?? undefined}
                >
                  <span className="rotulo">{t.campos[r.campo] ?? r.campo}</span>
                  <b>{t.niveles[r.nivel] ?? r.nivel}</b>
                </div>
              ))}
            </div>
            <p className="dato">{t.ficha.comoEsNota}</p>
          </>
        )}
      </div>
      {a.avisos.length > 0 && (
        <div className="grupo">
          <span className="rotulo">{t.viaje.avisos}</span>
          {a.avisos.map((x) => (
            <p className="aviso" key={x}>
              {x}
            </p>
          ))}
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
