"use client";

// Las capas del destino en la web (14.6): la pestaña «Allí», con cómo llegar de donde aterrizas y cómo moverte, con lo
// que cuesta, y lo que conviene saber, por sus clases, con dónde se come; la entrada y el horario de cada parada, en
// su tarjeta y en su ficha; lo que cuesta un trayecto que no se anda; y el presupuesto entero en las cuentas.
//
// La regla de la pantalla: todo se dice por claves y números, en `textos.ts`. Lo único escrito por un asiento que se
// enseña es la frase corta de lo que conviene saber, y los nombres propios de fuera (un barrio, un plato, una
// estación): la casa solo los deja en el viaje si pasaron la puerta 12 (`agent/output/capas.ts`). Cada dato va con el
// enlace a su página y el día en que se vio; lo que no se sabe, se dice.

import type {
  CosaDelDestino,
  DeLasEntradas,
  DeMoverse,
  DelDestino,
  Dia,
  FuenteDeUnDato,
  Importe,
  Manera,
  PrecioDeCapa,
  Presupuesto,
  Viaje,
} from "../../../agent/output/viaje.ts";
import type { ReactNode } from "react";
import { abreElDia, entradaDe } from "../../../agent/scripts/capas.ts";
import {
  abreTusDias,
  billeteSuelto,
  comidasQueSeEnsenan,
  grupoDelViaje,
  loQueTeConviene,
  paraLlegar,
  paraTuGrupo,
  porPersona,
  sitioDe,
  zonasDeLlegar,
  type DeAntes,
  type GrupoDelViaje,
  type ParaTuGrupo,
} from "../lib/alli.ts";
import { diaCorto, diaDeLaSemana, enGoogleMaps } from "../lib/formato.ts";
import type { Textos } from "../lib/textos.ts";
import { SinMirar } from "./LasEntradas.tsx";

type Comun = { t: Textos; idioma: string };
/** Quiénes viajan, para lo que cuesta para el grupo: cuántos adultos, la edad de cada niño y la moneda del viaje. */
type Grupo = GrupoDelViaje;

// ---------- Lo que comparten

/** Un importe con sus céntimos solo si los tiene: un billete de 2,10 no es uno de 2. */
function importe(x: Importe, idioma: string): string {
  const decimales = Number.isInteger(x.importe) ? 0 : 2;
  return new Intl.NumberFormat(idioma, {
    style: "currency",
    currency: x.moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(x.importe);
}

/** El día en que se vio una página, con su año: puede ser de otro. */
const vistoEl = (visto: string, idioma: string): string =>
  new Intl.DateTimeFormat(idioma, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${visto}T00:00:00Z`),
  );

/** El enlace a la página de un dato, con su web y el día en que se vio. */
function Fuente({ t, idioma, f }: Comun & { f: FuenteDeUnDato }) {
  return (
    <a className="enlace" href={f.url} target="_blank" rel="noopener noreferrer nofollow">
      {t.alli.fuente(sitioDe(f.url), vistoEl(f.visto, idioma))}
    </a>
  );
}

/** Las fuentes de varios datos, sin repetir la misma página. */
function Fuentes({ t, idioma, fuentes }: Comun & { fuentes: FuenteDeUnDato[] }) {
  const unicas = fuentes.filter((f, i) => fuentes.findIndex((g) => g.url === f.url) === i);
  return (
    <>
      {unicas.map((f) => (
        <Fuente key={f.url} t={t} idioma={idioma} f={f} />
      ))}
    </>
  );
}

/** Lo que cuesta para el grupo, dicho: con su cifra, gratis, lo que falta de alguno, o que no se sabe. */
export function dichoDelGrupo(t: Textos, idioma: string, g: ParaTuGrupo | null): string {
  if (g === null || (g.importes.length === 0 && g.faltan >= g.cuantos)) return t.alli.sinPrecio;
  if (g.gratis) return t.alli.gratisGrupo(g.cuantos);
  const cifra = g.importes.length === 0 ? t.alli.gratis : g.importes.map((x) => importe(x, idioma)).join(" + ");
  const dicho = g.importes.length === 0 ? cifra : t.alli.paraElGrupo(cifra, g.cuantos - g.faltan);
  return g.faltan > 0 ? `${dicho}, ${t.alli.faltanDeVosotros(g.faltan, g.cuantos)}` : dicho;
}

/** Lo que cuesta, para el grupo y, si sois más de uno, por adulto. */
function dichoDelPrecio(
  t: Textos,
  idioma: string,
  precios: PrecioDeCapa[] | null,
  grupo: Grupo,
  g: ParaTuGrupo | null = paraTuGrupo(precios, grupo),
): string {
  const uno = porPersona(precios, grupo.moneda);
  const dicho = dichoDelGrupo(t, idioma, g);
  if (g === null || g.cuantos === 1 || uno === null || uno.cuanto === "free" || uno.para !== "adult") return dicho;
  return `${dicho} (${t.alli.porAdulto(importe(uno.cuanto, idioma))})`;
}

/**
 * Lo que cuesta una manera de llegar, con la cuenta del presupuesto: un taxi, por coche, diciendo que es por coche y
 * cuántos hacen falta; lo demás, por persona, para el grupo.
 */
function dichoDeLlegar(t: Textos, idioma: string, x: Parameters<typeof paraLlegar>[0], grupo: Grupo): string {
  const c = paraLlegar(x, grupo);
  if (c.se === "por_persona") return dichoDelPrecio(t, idioma, x.precios, grupo, c.grupo);
  if (c.precio === null || c.grupo === null) return t.alli.sinPrecio;
  if (c.precio.cuanto === "free") return t.alli.gratis;
  const cuantos = grupo.adultos + grupo.ninos.length;
  const uno = importe(c.precio.cuanto, idioma);
  return c.coches === 1 || c.grupo.importes.length !== 1
    ? t.alli.porCoche(uno, cuantos)
    : t.alli.enCoches(importe(c.grupo.importes[0], idioma), c.coches, uno, cuantos);
}

/** Cada precio de la página, para quién es y cuánto. */
function precioDicho(t: Textos, idioma: string, p: PrecioDeCapa): string {
  const edades = p.edades === null ? null : t.alli.edades(p.edades.desde, p.edades.hasta);
  const cuanto = p.cuanto === "free" ? t.alli.gratis : importe(p.cuanto, idioma);
  return t.alli.precioPara(t.alli.para[p.para] ?? p.para, edades, cuanto);
}

/** Cómo está una capa que no se enseña: no está (un viaje de antes), o falta con su porqué. Null si se enseña. */
function sinLaCapa(t: Textos, capa: { falta: string | null } | undefined): string | null {
  if (capa === undefined) return t.alli.todaviaNo;
  if (capa.falta !== null) return t.alli.falta[capa.falta] ?? t.alli.todaviaNo;
  return null;
}

// ---------- La pestaña «Allí»

/**
 * La pestaña «Allí»: cómo llegar y moverte, con lo que te conviene para tus días, lo que conviene saber y dónde se
 * come, y las entradas en resumen. `viaje` va ya con lo tuyo (donde duermes y cómo llegas), y `dias`, con tu ritmo y
 * tus paradas: lo que te conviene cambia con ellos.
 */
export function Alli({ t, idioma, viaje, dias, manera }: Comun & { viaje: Viaje; dias?: Dia[]; manera?: Manera }) {
  const grupo = grupoDelViaje(viaje);
  const tusDias = dias ?? viaje.dias;
  const marcada = manera ?? viaje.maneras[0];
  return (
    <>
      <Moverse t={t} idioma={idioma} m={viaje.moverse} grupo={grupo} zonas={viaje.zonasDeLaRuta}>
        <LoQueTeConviene t={t} idioma={idioma} viaje={viaje} dias={tusDias} manera={marcada} />
      </Moverse>
      <Saber t={t} idioma={idioma} s={viaje.saber} />
      <ResumenDeLasEntradas t={t} viaje={viaje} dias={tusDias} />
    </>
  );
}

function Moverse({
  t,
  idioma,
  m,
  grupo,
  zonas: deLaRuta,
  children,
}: Comun & { m: DeMoverse | undefined; grupo: Grupo; zonas?: Viaje["zonasDeLaRuta"]; children?: ReactNode }) {
  const falta = sinLaCapa(t, m);
  if (falta !== null || m === undefined)
    return (
      <div className="grupo alli">
        <h2 className="titulo">{t.alli.moverse}</h2>
        <p className="suave">{falta}</p>
      </div>
    );
  const zonas = zonasDeLlegar(m.llegar, deLaRuta);
  const numeradas = zonas !== null && [...zonas.values()].some((z) => typeof z === "number");
  const modo = (x: string): string => t.alli.modo[x] ?? x;
  const nada = m.llegar.length + m.transportes.length + m.billetes.length + m.pagos.length === 0 && m.coche === null;
  return (
    <div className="grupo alli">
      <h2 className="titulo">{t.alli.moverse}</h2>
      <h3 className="fechas__sub">{t.alli.llegar}</h3>
      {m.sinLlegar !== null && <p className="aviso">{t.alli.sinLlegar[m.sinLlegar]}</p>}
      {m.llegar.length > 0 && (
        <ul className="fechas__lista">
          {m.llegar.map((x, i) => {
            const zona = zonas?.get(x.aZona);
            const datos = [
              x.minutos === null ? null : t.alli.minutos(x.minutos),
              x.hastaLas === null ? null : t.alli.hastaLas(x.hastaLas),
            ].filter((d) => d !== null);
            return (
              <li key={i} className="fecha alli__cosa">
                <span className="fecha__clase">
                  {x.desde.nombre !== null
                    ? t.alli.deNombre(x.desde.nombre)
                    : (t.alli.desde[x.desde.clase] ?? x.desde.clase)}
                  {x.desde.nombre === null && x.desde.codigo !== null ? ` (${x.desde.codigo})` : ""}
                  {zona === undefined
                    ? ""
                    : `, ${typeof zona === "number" ? t.alli.aZona(zona) : t.alli.aZonaNombre(zona)}`}
                </span>
                <b>{modo(x.modo)}</b>
                {datos.length > 0 && <span className="dato">{datos.join(", ")}</span>}
                <span className="alli__precio">{dichoDeLlegar(t, idioma, x, grupo)}</span>
                <Fuente t={t} idioma={idioma} f={x.fuente} />
              </li>
            );
          })}
        </ul>
      )}
      {numeradas && <p className="credito">{t.alli.zonasSinNombre}</p>}

      {children}

      {m.transportes.length > 0 && (
        <>
          <h3 className="fechas__sub">{t.alli.transportes}</h3>
          <ul className="fechas__lista">
            {m.transportes.map((x, i) => (
              <li key={i} className="fecha alli__cosa">
                <b>{modo(x.modo)}</b>
                {x.hastaLas !== null && <span className="dato">{t.alli.hastaLas(x.hastaLas)}</span>}
                <Fuente t={t} idioma={idioma} f={x.fuente} />
              </li>
            ))}
          </ul>
        </>
      )}

      {m.billetes.length > 0 && (
        <>
          <h3 className="fechas__sub">{t.alli.billetes}</h3>
          <ul className="fechas__lista">
            {m.billetes.map((x, i) => (
              <li key={i} className="fecha alli__cosa">
                <b>{t.alli.billete(x.clase, x.dias, x.viajes)}</b>
                {x.modos.length > 0 && <span className="fecha__tema">{t.alli.cubre(x.modos.map(modo))}</span>}
                <span className="alli__precio">{dichoDelPrecio(t, idioma, x.precios, grupo)}</span>
                <Fuente t={t} idioma={idioma} f={x.fuente} />
              </li>
            ))}
          </ul>
        </>
      )}

      {m.pagos.length > 0 && (
        <div className="alli__linea">
          <span>{t.alli.pagos(m.pagos.map((p) => t.alli.pago[p.clase] ?? p.clase))}</span>
          <Fuentes t={t} idioma={idioma} fuentes={m.pagos.map((p) => p.fuente)} />
        </div>
      )}
      {m.coche !== null && (
        <div className="alli__linea">
          <span>{t.alli.coche(m.coche.haceFalta)}</span>
          <Fuente t={t} idioma={idioma} f={m.coche.fuente} />
        </div>
      )}
      {nada && m.sinLlegar === null && <p className="suave">{t.alli.nadaDe}</p>}
    </div>
  );
}

/** Las clases de lo que conviene saber, en su orden; las de comer van aparte, en «Dónde se come». */
const DE_SABER = ["neighbourhood", "hours", "money", "practical", "avoid"] as const;
const DE_COMER = ["food_area", "market", "dish", "meal_cost"] as const;

function Saber({ t, idioma, s }: Comun & { s: DelDestino | undefined }) {
  const falta = sinLaCapa(t, s);
  if (falta !== null || s === undefined)
    return (
      <div className="grupo alli">
        <h2 className="titulo">{t.alli.saber}</h2>
        <p className="suave">{falta}</p>
      </div>
    );
  const deClase = (clase: string): CosaDelDestino[] => s.cosas.filter((c) => c.clase === clase);
  const comer = DE_COMER.some((c) => deClase(c).length > 0);
  const bloque = (clases: readonly string[]) =>
    clases
      .filter((c) => deClase(c).length > 0)
      .map((c) => (
        <div key={c} className="alli__clase">
          <h3 className="fechas__sub">{t.alli.clase[c] ?? c}</h3>
          <ul className="fechas__lista">
            {deClase(c).map((x, i) => (
              <Cosa key={i} t={t} idioma={idioma} x={x} />
            ))}
          </ul>
        </div>
      ));
  return (
    <>
      <div className="grupo alli">
        <h2 className="titulo">{t.alli.saber}</h2>
        {DE_SABER.some((c) => deClase(c).length > 0) ? bloque(DE_SABER) : <p className="suave">{t.alli.nadaDe}</p>}
      </div>
      <div className="grupo alli">
        <h2 className="titulo">{t.alli.comer}</h2>
        {comer ? bloque(DE_COMER) : <p className="suave">{t.alli.nadaDe}</p>}
        <p className="credito">{t.alli.comerNota}</p>
      </div>
    </>
  );
}

/** Una cosa del destino: su nombre si lo tiene, su frase (que pasó la puerta 12), lo que suele costar y su fuente. */
function Cosa({ t, idioma, x }: Comun & { x: CosaDelDestino }) {
  return (
    <li className="fecha alli__cosa">
      {x.nombre !== null && <b>{x.nombre}</b>}
      <span className="fecha__frase">{x.frase}</span>
      {x.cuesta !== null && (
        <span className="alli__precio">
          {t.alli.cuesta(
            importe({ importe: x.cuesta.desde, moneda: x.cuesta.moneda }, idioma),
            importe({ importe: x.cuesta.hasta, moneda: x.cuesta.moneda }, idioma),
          )}
        </span>
      )}
      <span className="alli__enlaces">
        {x.punto !== null && (
          <a
            className="enlace"
            href={enGoogleMaps(x.punto, x.nombre ?? undefined)}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {t.alli.enMapa}
          </a>
        )}
        <Fuente t={t} idioma={idioma} f={x.fuente} />
      </span>
    </li>
  );
}

/** Las entradas, en resumen: cuántas paradas tienen su precio y su horario, y las que cierran el día en que van. */
function ResumenDeLasEntradas({
  t,
  viaje,
  dias,
}: {
  t: Textos;
  viaje: Viaje;
  dias: { fecha: string; paradas: string[] }[];
}) {
  const e = viaje.entradas;
  const falta = sinLaCapa(t, e);
  const puestas = dias.flatMap((d) => d.paradas.map((id) => ({ id, fecha: d.fecha })));
  if (falta !== null || e === undefined)
    return (
      <div className="grupo alli">
        <h2 className="titulo">{t.alli.entradas}</h2>
        <p className="suave">{falta}</p>
      </div>
    );
  const suyas = puestas.map((p) => ({ ...p, e: entradaDe(e, p.id) }));
  const conPrecio = suyas.filter((p) => p.e?.precios != null).length;
  const conHorario = suyas.filter((p) => p.e?.horarios != null).length;
  const cierran = suyas.filter((p) => p.e !== null && abreElDia(p.e.horarios, p.fecha) === false);
  const nombre = (id: string): string => viaje.paradas.find((p) => p.id === id)?.nombre ?? id;
  return (
    <div className="grupo alli">
      <h2 className="titulo">{t.alli.entradas}</h2>
      <p className="suave">{t.alli.resumen(conPrecio, conHorario, puestas.length)}</p>
      {cierran.length > 0 && (
        <div className="aviso" role="note">
          <span>
            {t.alli.cierranResumen(cierran.length)} {cierran.map((p) => nombre(p.id)).join(", ")}.
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- En cada parada

/** En la tarjeta de una parada: lo que cuesta para tu grupo, si ese día cierra y si hay que reservar. */
export function EntradaDeLaParada({
  t,
  idioma,
  entradas,
  parada,
  fecha,
  grupo,
}: Comun & { entradas?: DeLasEntradas; parada: string; fecha: string | null; grupo: Grupo }) {
  const e = entradaDe(entradas, parada);
  if (e === null) return null;
  const g = paraTuGrupo(e.precios, grupo);
  const cierra = fecha !== null && abreElDia(e.horarios, fecha) === false;
  return (
    <>
      {cierra && <span className="pastilla pastilla--ojo">{t.alli.cierraCorto}</span>}
      {g !== null && <span className="pastilla">{dichoDelGrupo(t, idioma, g)}</span>}
      {e.reservar?.haceFalta === true && <span className="pastilla">{t.alli.reservar(true)}</span>}
    </>
  );
}

/** Si la entrada de una parada dice si hay que reservar: entonces manda sobre lo que dijo el que elige los sitios. */
export const diceSiReservar = (entradas: DeLasEntradas | undefined, parada: string): boolean =>
  (entradaDe(entradas, parada)?.reservar ?? null) !== null;

/** En la ficha de una parada: su entrada para tu grupo, sus horas en tus días, si hay que reservar y sus páginas. */
export function FichaDeLaEntrada({
  t,
  idioma,
  entradas,
  parada,
  fecha,
  fechas,
  grupo,
}: Comun & {
  entradas?: DeLasEntradas;
  parada: string;
  fecha: string | null;
  fechas: string[];
  grupo: Grupo;
}) {
  const e = entradaDe(entradas, parada);
  if (e === null) return null;
  const dias = abreTusDias(e.horarios, fechas);
  const cierra = fecha !== null && abreElDia(e.horarios, fecha) === false;
  const dia = (f: string): string => `${diaDeLaSemana(f, idioma)} ${diaCorto(f, idioma)}`;
  return (
    <div className="entrada">
      {cierra && fecha !== null && (
        <p className="aviso" role="note">
          {t.alli.cierraTuDia(dia(fecha))}
        </p>
      )}
      <div className="entrada__parte">
        <span className="rotulo">{t.alli.entrada}</span>
        <span className="alli__precio">{dichoDelPrecio(t, idioma, e.precios, grupo)}</span>
        {e.precios !== null && e.precios.length > 1 && (
          <span className="dato">{e.precios.map((p) => precioDicho(t, idioma, p)).join(". ")}</span>
        )}
        {e.precios !== null && <Fuentes t={t} idioma={idioma} fuentes={e.precios.map((p) => p.fuente)} />}
      </div>
      <div className="entrada__parte">
        <span className="rotulo">{t.alli.tusDias}</span>
        {e.horarios === null ? (
          <span className="dato">{t.alli.sinHorario}</span>
        ) : (
          <>
            <ul className="entrada__dias">
              {dias.map((d) => (
                <li
                  key={d.fecha}
                  className={`entrada__dia${d.fecha === fecha ? " entrada__dia--puesto" : ""}${
                    d.abre === false ? " entrada__dia--cierra" : ""
                  }`}
                >
                  <span>
                    {dia(d.fecha)}
                    {d.fecha === fecha ? `, ${t.alli.elDiaPuesto}` : ""}
                  </span>
                  <span>
                    {d.abre === null
                      ? t.alli.sinHoras
                      : d.abre === false
                        ? t.alli.cerrado
                        : d.franjas.length > 0
                          ? t.alli.abre(d.franjas)
                          : t.alli.sinHoras}
                  </span>
                </li>
              ))}
            </ul>
            <Fuentes t={t} idioma={idioma} fuentes={e.horarios.map((h) => h.fuente)} />
          </>
        )}
      </div>
      {e.reservar !== null && (
        <div className="entrada__parte">
          <span className="dato">{t.alli.reservar(e.reservar.haceFalta)}</span>
          {e.reservar.donde !== null && (
            <a className="enlace" href={e.reservar.donde} target="_blank" rel="noopener noreferrer nofollow">
              {t.alli.reservarAqui}
            </a>
          )}
          <Fuente t={t} idioma={idioma} f={e.reservar.fuente} />
        </div>
      )}
      {e.web !== null && (
        <a className="enlace" href={e.web} target="_blank" rel="noopener noreferrer nofollow">
          {t.alli.web}
        </a>
      )}
      {!e.mirado && <SinMirar t={t} porQue={e.sinMirar ?? null} />}
    </div>
  );
}

// ---------- En cada trayecto que no se anda

/**
 * Lo que cuesta un trayecto en transporte, si se sabe: el billete suelto con que la cuenta de moverse paga cada
 * trayecto, para tu grupo, el mismo que entra en «moverte allí». Si no se sabe, nada.
 */
export function CosteDelTrayecto({ t, idioma, moverse, grupo }: Comun & { moverse?: DeMoverse; grupo: Grupo }) {
  const b = billeteSuelto(moverse, grupo);
  if (b === null) return null;
  const cifra = b.importe === 0 ? t.alli.gratis : importe({ importe: b.importe, moneda: b.moneda }, idioma);
  const dicho = b.cuantos === 1 ? cifra : t.alli.paraElGrupo(cifra, b.cuantos - b.faltan);
  return (
    <span className="tramo__coste">
      <span className="dato">
        {t.alli.suelto(b.faltan > 0 ? `${dicho}, ${t.alli.faltanDeVosotros(b.faltan, b.cuantos)}` : dicho)}
      </span>
      <Fuentes t={t} idioma={idioma} fuentes={b.fuentes} />
    </span>
  );
}

// ---------- Lo que te conviene para moverte

/**
 * Lo que te sale mejor para moverte con tus días y tu grupo: billetes sueltos, un abono, un bono o una mezcla, lo que
 * cuesta y lo que ahorras frente a los sueltos, con sus páginas. Es la cuenta del presupuesto: su total es el de
 * «moverte allí» en las cuentas.
 */
function LoQueTeConviene({ t, idioma, viaje, dias, manera }: Comun & { viaje: Viaje; dias: Dia[]; manera?: Manera }) {
  const m = viaje.moverse;
  if (m === undefined || m.falta !== null) return null;
  const { viajes, soloEnCoche, dias: conDias, grupo } = loQueTeConviene(viaje, manera, dias);
  const enDias = conDias.filter((d) => d.trayectos > 0).length;
  // Los tramos que solo se hacen en coche no llevan billete: lo que cuesta el coche no se sabe, y se dice.
  const enCoche = (ademas: boolean) =>
    soloEnCoche > 0 && <p className="dato">{t.alli.soloEnCoche(soloEnCoche, ademas)}</p>;
  const dinero = (n: number, moneda: string | null): string =>
    moneda === null ? String(n) : importe({ importe: n, moneda }, idioma);
  const cabecera = <h3 className="fechas__sub">{t.alli.teConviene}</h3>;
  if (viajes === 0)
    return (
      <div className="alli__conviene">
        {cabecera}
        {enCoche(false) || <p className="suave">{t.alli.convieneNada}</p>}
      </div>
    );
  // Cada uno con su cuenta; los adultos tienen la misma, y se dicen una vez.
  const personas = grupo.porPersona.filter(
    (c, i) => c.edad !== null || grupo.porPersona.findIndex((x) => x.edad === null) === i,
  );
  const adultos = viaje.adultos;
  const quien = (edad: number | null): string => (edad === null ? t.alli.cadaAdulto(adultos) : t.alli.unNino(edad));
  const compras = (c: (typeof grupo.porPersona)[number]): string =>
    c.compras
      .map((x) =>
        t.alli.compra(
          x.cuantos,
          t.alli.billete(x.clase, m.billetes[x.billete]?.dias ?? null, m.billetes[x.billete]?.viajes ?? null),
        ),
      )
      .join(" + ");
  const sueltos = grupo.porPersona.every((c) => c.sueltos !== null)
    ? Math.round(grupo.porPersona.reduce((s, c) => s + (c.sueltos ?? 0), 0) * 100) / 100
    : null;
  const ahorra = sueltos !== null && grupo.total !== null ? Math.round((sueltos - grupo.total) * 100) / 100 : null;
  const fuentes = grupo.porPersona.flatMap((c) => c.fuentes);
  const cuantos = grupo.porPersona.length;
  return (
    <div className="alli__conviene">
      {cabecera}
      <p className="dato">{t.alli.tusTrayectos(viajes, enDias)}</p>
      {enCoche(true)}
      <ul className="fechas__lista">
        {personas.map((c, i) => (
          <li key={i} className="fecha alli__cosa">
            <span className="fecha__clase">{quien(c.edad)}</span>
            {c.total === null ? (
              <span className="dato">{t.alli.convieneNoSe[c.porQue ?? "no_price"] ?? t.alli.sinPrecio}</span>
            ) : (
              <>
                <b>{t.alli.conviene[c.conviene] ?? c.conviene}</b>
                {c.compras.length > 0 && c.conviene !== "singles" && <span className="dato">{compras(c)}</span>}
                <span className="alli__precio">{dinero(c.total, c.moneda)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {grupo.total !== null && (
        <p className="alli__linea">
          <b>{t.alli.convieneGrupo(dinero(grupo.total, grupo.moneda), cuantos)}</b>
          {sueltos !== null && ahorra !== null && ahorra > 0 && (
            <span className="dato">
              {t.alli.frenteASueltos(dinero(sueltos, grupo.moneda), dinero(ahorra, grupo.moneda))}
            </span>
          )}
          {sueltos !== null && ahorra === 0 && personas.some((c) => c.conviene !== "singles") && (
            <span className="dato">{t.alli.igualQueSueltos}</span>
          )}
        </p>
      )}
      {grupo.total === null && grupo.faltan > 0 && (
        <p className="suave">{t.alli.faltanDeVosotros(grupo.faltan, cuantos)}</p>
      )}
      {fuentes.length > 0 && (
        <span className="alli__enlaces">
          <Fuentes t={t} idioma={idioma} fuentes={fuentes} />
        </span>
      )}
      <p className="credito">{t.alli.convieneNota}</p>
    </div>
  );
}

// ---------- En las cuentas

/**
 * El presupuesto entero de la manera marcada, parte a parte, con de dónde sale cada una y lo que falta; las comidas
 * aparte, como una horquilla. Es el de lo que tienes delante; lo que la web no puede rehacer, se dice qué es.
 */
export function ElPresupuesto({
  t,
  idioma,
  presupuesto,
  manera,
  deAntes = null,
  dias,
  personas = 1,
}: Comun & { presupuesto?: Presupuesto; manera: string; deAntes?: DeAntes; dias: number; personas?: number }) {
  const falta = sinLaCapa(t, presupuesto);
  const suyo = presupuesto?.maneras.find((x) => x.manera === manera);
  if (falta !== null || presupuesto === undefined || suyo === undefined)
    return (
      <div className="grupo">
        <h2 className="titulo">{t.alli.presupuesto}</h2>
        <p className="suave">{falta ?? t.alli.todaviaNo}</p>
      </div>
    );
  const c = comidasQueSeEnsenan(presupuesto.comidas, dias, personas);
  const dinero = (n: number, moneda: string): string => importe({ importe: n, moneda }, idioma);
  return (
    <div className="grupo presupuesto">
      <h2 className="titulo">{t.alli.presupuesto}</h2>
      <p className="presupuesto__total">
        <b>{t.alli.total(dinero(suyo.total, suyo.moneda))}</b>
        <span className="dato">{t.alli.faltan(suyo.faltan)}</span>
        {suyo.aparte.length > 0 && (
          <span className="dato">{t.alli.aparte(suyo.aparte.map((a) => importe(a, idioma)).join(" + "))}</span>
        )}
      </p>
      {deAntes !== null && (
        <p className="aviso" role="note">
          {t.alli.deAntes[deAntes]}
        </p>
      )}
      <ul className="presupuesto__partes">
        {suyo.partes.map((p) => (
          <li key={p.parte} className={`parte parte--${p.origen}`}>
            <span className="parte__nombre">{t.alli.parte[p.parte] ?? p.parte}</span>
            <span className="parte__cuanto">
              {p.total === null ? t.alli.origen.unknown : dinero(p.total, p.moneda)}
            </span>
            <span className="dato parte__origen">
              {p.total === null ? "" : t.alli.origen[p.origen]}
              {p.total !== null && p.faltan > 0 ? ". " : ""}
              {p.faltan > 0 ? t.alli.faltanParte(p.faltan) : ""}
            </span>
            {p.aparte.length > 0 && (
              <span className="dato parte__origen">
                {t.alli.aparte(p.aparte.map((a) => importe(a, idioma)).join(" + "))}
              </span>
            )}
            {p.fuentes.length > 0 && (
              <span className="parte__fuentes">
                <Fuentes t={t} idioma={idioma} fuentes={p.fuentes} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="presupuesto__comidas">
        {c === null ? (
          <p className="suave">{t.alli.comidasNo}</p>
        ) : (
          <>
            <b>{t.alli.comidas(dinero(c.porPersona.desde, c.moneda), dinero(c.porPersona.hasta, c.moneda))}</b>
            <span className="dato">
              {t.alli.comidasCuenta(c.alDia, dinero(c.una.desde, c.moneda), dinero(c.una.hasta, c.moneda))}
            </span>
            <Fuentes t={t} idioma={idioma} fuentes={c.fuentes} />
            {c.delViaje !== null && (
              <span className="dato">
                {t.alli.comidasViaje(
                  dinero(c.delViaje.desde, c.moneda),
                  dinero(c.delViaje.hasta, c.moneda),
                  dias,
                  personas,
                )}
              </span>
            )}
            <span className="dato">{t.alli.comidasNota}</span>
          </>
        )}
      </div>
      <p className="credito">{t.alli.comparan}</p>
    </div>
  );
}
