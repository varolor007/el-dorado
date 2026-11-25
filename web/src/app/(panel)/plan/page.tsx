"use client";

// El mapa es la pieza central del panel. Aquí vive lo que se decide: en qué etapa estás (el mundo, el primer vistazo,
// la investigación o tu viaje), qué día miras, a qué ritmo, de qué manera, y lo que has quitado, añadido o movido.
// Lo que se enseña es un viaje tuyo, traído de la casa, si la dirección lo pide (?trip=<id>); si no, el grabado.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Manera, Punto, Ritmo, Suceso, Vistazo as ElVistazo } from "../../../../../agent/output/viaje.ts";
import { RITMOS } from "../../../../../agent/output/viaje.ts";
import { puertaEntendido } from "../../../../../agent/gates/puerta_entendido.ts";
import { respuestasDe, respuestasDeLoEntendido, type Respuestas } from "../../../../../agent/scripts/empezar.ts";
import type { Entendido } from "../../../../../agent/scripts/formas.ts";
import { fechasDe, repartir } from "../../../../../agent/scripts/ritmo.ts";
import { Buscador, type Busqueda } from "../../../piezas/Buscador.tsx";
import { Cargando } from "../../../piezas/Cargando.tsx";
import { Empezar, TODOS_LOS_TOQUES_DE_BUSCAR } from "../../../piezas/Empezar.tsx";
import { EnCasa } from "../../../piezas/EnCasa.tsx";
import { Hoja } from "../../../piezas/Hoja.tsx";
import { Mapa, type Camara, type Marca } from "../../../piezas/Mapa.tsx";
import { ATuGuia } from "../../../piezas/TuGuia.tsx";
import { EnVivo, Ficha, Mundo, TuViaje, Vistazo, type Pestana } from "../../../piezas/Pantallas.tsx";
import { ElImpacto, TusVersiones } from "../../../piezas/Momentos.tsx";
import { TuAlojamiento } from "../../../piezas/Alojamiento.tsx";
import type { GustoMarcado } from "../../../../../agent/scripts/alojamiento.ts";
import { CLASES_DE_CAMBIO, type ClaseDeCambio } from "../../../../../agent/data/momentos.ts";
import { impactoDe } from "../../../../../agent/scripts/impacto.ts";
import { useTusElecciones, useVersiones } from "../../../lib/elecciones.ts";
import { useCuenta, useViajeDeLaCasa } from "../../../lib/cuenta.ts";
import { monedaDelNavegador, sitioDe } from "../../../lib/empezar.ts";
import { dinero, noches } from "../../../lib/formato.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { foto, useAlto, useGrabado, useIdioma, useMovil, useReproductor, useTema } from "../../../lib/usar.ts";
import { useViajeVivo } from "../../../lib/viajeVivo.ts";

// Las cuatro primeras son las de un viaje que ya está hecho, el grabado o uno tuyo. Las dos últimas, las de un viaje
// tuyo que aún no está en el mapa: las preguntas de empezar y su investigación, contada por la casa.
type Etapa = "mundo" | "vistazo" | "vivo" | "viaje" | "preguntas" | "casa";

const encuadreDe = (puntos: Punto[], margen = 0.12) => {
  const lats = puntos.map((p) => p.lat);
  const lons = puntos.map((p) => p.lon);
  const alto = Math.max(...lats) - Math.min(...lats) || 0.01;
  const ancho = Math.max(...lons) - Math.min(...lons) || 0.01;
  return {
    oeste: Math.min(...lons) - ancho * margen,
    sur: Math.min(...lats) - alto * margen,
    este: Math.max(...lons) + ancho * margen,
    norte: Math.max(...lats) + alto * margen,
  };
};

/** El trozo de mapa que encierra un círculo de un radio en metros. */
const encuadreDelCirculo = (centro: Punto, radio: number) => {
  const dLat = radio / 111_320;
  const dLon = radio / (111_320 * Math.cos((centro.lat * Math.PI) / 180));
  return { oeste: centro.lon - dLon, sur: centro.lat - dLat, este: centro.lon + dLon, norte: centro.lat + dLat };
};

export default function Planear() {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const tema = useTema();
  const movil = useMovil();
  const alto = useAlto();
  const [pedido, setPedido] = useState<string | null | undefined>(undefined);
  useEffect(() => setPedido(new URLSearchParams(window.location.search).get("trip")), []);
  const elGrabado = useGrabado();
  const cuenta = useCuenta();
  // Un viaje tuyo se escucha en la casa mientras no está en el mapa; cuando llega, se pide su versión y se pinta.
  const vivo = useViajeVivo(pedido ?? null);
  const comoEsta = vivo.estado?.trip.state;
  const enElMapa = comoEsta === "on_map" || comoEsta === "closed";
  const elDeLaCasa = useViajeDeLaCasa(enElMapa ? (pedido ?? null) : null);
  // Mientras no se sabe qué se pide, no se enseña ninguno: ni un instante el grabado en lugar del tuyo.
  const grabado =
    pedido === undefined
      ? undefined
      : pedido === null
        ? elGrabado
        : vivo.estado === undefined
          ? undefined
          : vivo.estado === null || !enElMapa
            ? null
            : elDeLaCasa;
  // Lo que he entendido de un viaje tuyo, si la casa lo guarda con la forma de hoy.
  const entendido = useMemo(
    () => (puertaEntendido(vivo.entendido).verde ? (vivo.entendido as Entendido) : null),
    [vivo.entendido],
  );
  const [nuevo, setNuevo] = useState<Respuestas | null>(null);
  // El primer vistazo de un viaje nuevo, mientras se contestan las preguntas: sus puntos y sus zonas, en el mapa.
  const [vistazoNuevo, setVistazoNuevo] = useState<ElVistazo | null>(null);
  const [pintado, setPintado] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("mundo");
  const [lejos, setLejos] = useState<Camara | null>(null);
  const [pestana, setPestana] = useState<Pestana>("days");
  const [dia, setDia] = useState<number | null>(null);
  const [ritmoPedido, setRitmo] = useState<Ritmo | null>(null);
  const [manera, setManera] = useState<Manera["id"]>("best_value");
  const [parada, setParada] = useState<string | null>(null);
  const [ficha, setFicha] = useState<string | null>(null);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [anadidas, setAnadidas] = useState<string[]>([]);
  const [fijadas, setFijadas] = useState<Record<string, number>>({});
  // Dónde duermes, si elegiste otro que el de la manera, y tus gustos de las cosas del alojamiento (8.2).
  const [alojamientoElegido, setAlojamientoElegido] = useState<string | null>(null);
  const [gustos, setGustos] = useState<GustoMarcado[] | null>(null);
  // Tus elecciones de un viaje tuyo en el mapa viven en la casa: se leen al abrirlo y se guardan al cambiarlas.
  const version = vivo.estado?.trip.version ?? null;
  const tuyas = useTusElecciones(pedido != null && comoEsta === "on_map" ? pedido : null, version);
  const versiones = useVersiones(pedido != null && enElMapa ? pedido : null, version);
  const tocado = useRef(false);
  const toca = (): void => {
    tocado.current = true;
  };
  useEffect(() => {
    const e = tuyas.leidas;
    if (e === null) return;
    tocado.current = false;
    if (e.way !== null) setManera(e.way);
    setRitmo(e.pace);
    setQuitadas(e.removed);
    setAnadidas(e.added);
    setFijadas(e.moved);
    setAlojamientoElegido(e.lodging);
    setGustos(e.tastes);
  }, [tuyas.leidas]);

  // Para abrir una pantalla suelta: ?at=look, ?at=live o ?at=trip, con &day=2, &tab=stay o &stay=3.
  useEffect(() => {
    if (!grabado) return;
    const pedido = new URLSearchParams(window.location.search);
    const en = pedido.get("at");
    if (en !== null) setEtapa(en === "look" ? "vistazo" : en === "live" ? "vivo" : "viaje");
    if (pedido.get("day") !== null) setDia(Number(pedido.get("day")) - 1);
    const pedida = pedido.get("tab");
    if (pedida === "days" || pedida === "stay" || pedida === "money" || pedida === "notes") setPestana(pedida);
    if (pedida === "book" && grabado.viaje.cierre) setPestana("book");
    if (pedido.get("stay") !== null) setFicha(grabado.viaje.alojamientos[Number(pedido.get("stay")) - 1]?.id ?? null);
  }, [grabado]);

  // Un viaje tuyo que aún no está en el mapa va a su sitio: a las preguntas si no está confirmado, y a su
  // investigación si ya lo está. Cuando llega al mapa, se enseña.
  useEffect(() => {
    if (!comoEsta) return;
    if (comoEsta === "started") {
      if (entendido !== null) setNuevo((ya) => ya ?? respuestasDeLoEntendido(entendido, TODOS_LOS_TOQUES_DE_BUSCAR));
      setEtapa("preguntas");
    } else if (!enElMapa) setEtapa("casa");
    else setEtapa((antes) => (antes === "casa" || antes === "preguntas" ? "viaje" : antes));
  }, [comoEsta, enElMapa, entendido]);

  const viaje = grabado?.viaje ?? null;
  // Un viaje cerrado se enseña con la manera con que se cerró, y abre por lo que hay que reservar.
  const cerradaCon = viaje?.cierre?.manera;
  useEffect(() => {
    if (cerradaCon === undefined) return;
    setManera(cerradaCon);
    setPestana("book");
  }, [cerradaCon]);
  // El ritmo de partida es el del viaje, no uno puesto aquí: si quien mira lo mueve, manda el suyo.
  const ritmo: Ritmo = ritmoPedido ?? RITMOS.find((x) => x === viaje?.ritmo) ?? "normal";
  const r = useReproductor(grabado?.sucesos ?? [], etapa === "vivo");
  const elegida = viaje?.maneras.find((m) => m.id === manera) ?? viaje?.maneras[0] ?? null;
  const cama = viaje?.alojamientos.find((a) => a.id === (alojamientoElegido ?? elegida?.alojamiento)) ?? null;

  // Los días se reparten aquí, al instante, con el ritmo que pidas, desde donde duermes y con lo que has cambiado.
  const reparto = useMemo(() => {
    if (viaje === null) return { dias: [], fuera: [], porQue: {} };
    const fechas = fechasDe(viaje.entrada, viaje.salida);
    const base = cama?.punto ?? viaje.destino.punto;
    // Con la tabla de caminos del viaje, si la trae: los mismos números que la casa.
    return repartir(viaje.paradas, fechas, ritmo, base, { quitadas, anadidas, fijadas }, viaje.caminos);
  }, [viaje, ritmo, cama, quitadas, anadidas, fijadas]);
  const deParada = useMemo(() => new Map((viaje?.paradas ?? []).map((p) => [p.id, p])), [viaje]);
  // Lo que tocas se guarda en la casa, encima de lo de antes: elegir no gasta ni deja versión.
  useEffect(() => {
    if (!tocado.current || tuyas.leidas === null) return;
    tuyas.guardar({
      ...tuyas.leidas,
      way: manera,
      pace: ritmoPedido,
      removed: quitadas,
      added: anadidas,
      moved: fijadas,
      lodging: alojamientoElegido,
      tastes: gustos,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manera, ritmoPedido, quitadas, anadidas, fijadas, alojamientoElegido, gustos]);
  // Para mirar suelta la pieza del impacto: ?at=impact&change=dates, sobre el viaje que se enseña, sin gastar.
  const [impactoSuelto, setImpactoSuelto] = useState<ClaseDeCambio[] | null>(null);
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search);
    if (pedido.get("at") !== "impact") return;
    const clases = (pedido.get("change") ?? "")
      .split(",")
      .filter((c): c is ClaseDeCambio => (CLASES_DE_CAMBIO as readonly string[]).includes(c));
    setImpactoSuelto(clases.length > 0 ? clases : ["dates"]);
  }, []);

  const alBuscar = (b: Busqueda): void => {
    // Con la casa conectada, buscar un sitio es empezar un viaje de verdad. Sin ella, la web enseña el grabado.
    if (cuenta !== undefined && cuenta !== "no_house") {
      const moneda = monedaDelNavegador(navigator.language);
      setNuevo(respuestasDe(sitioDe(b.lugar), { entrada: b.entrada, salida: b.salida }, { idioma, moneda }));
      setLejos(null);
      setEtapa("preguntas");
      return;
    }
    const nombre = viaje?.destino.nombre.toLowerCase().slice(0, 5) ?? null;
    if (nombre !== null && b.lugar.nombre.toLowerCase().startsWith(nombre)) {
      setLejos(null);
      setEtapa("vistazo");
      return;
    }
    const c = b.lugar.caja;
    setLejos(
      c !== null
        ? { encuadre: { oeste: c[0], norte: c[1], este: c[2], sur: c[3] }, cerca: 12 }
        : { centro: { lat: b.lugar.lat, lon: b.lugar.lon }, cerca: 11 },
    );
    setEtapa("mundo");
  };
  const quita = (id: string): void => {
    toca();
    setQuitadas((q) => [...q.filter((x) => x !== id), id]);
    setAnadidas((a) => a.filter((x) => x !== id));
    setFijadas(({ [id]: _, ...resto }) => resto);
    setParada(null);
  };
  const anade = (id: string): void => {
    toca();
    setQuitadas((q) => q.filter((x) => x !== id));
    setAnadidas((a) => [...a.filter((x) => x !== id), id]);
  };
  // Volver a poner lo que quitaste: vuelve a lo propuesto, y el ritmo dice dónde cabe (8.6).
  const repone = (id: string): void => {
    toca();
    setQuitadas((q) => q.filter((x) => x !== id));
  };
  const mueve = (id: string, aDia: number): void => {
    toca();
    setFijadas((f) => ({ ...f, [id]: aDia }));
    setDia(aDia);
  };

  // ---------- lo que se pinta en el mapa, según la etapa
  let camara: Camara = lejos ?? { centro: { lat: 28, lon: 8 }, cerca: movil ? 0.6 : 1.55 };
  let tenues: Punto[] = [];
  let vivos: Punto[] = [];
  let zona = null;
  let ruta: Punto[] = [];
  const otrasRutas: Punto[][] = [];
  const marcas: Marca[] = [];
  const pinDeCama = (id: string, opciones: { elegida?: boolean; mirando?: boolean } = {}): void => {
    const a = viaje?.alojamientos.find((x) => x.id === id);
    if (!a) return;
    marcas.push({
      id: `cama-${a.id}`,
      punto: a.punto,
      encima: opciones.elegida ? 6 : 4,
      pieza: (
        <button
          type="button"
          className="pin-cama"
          data-elegida={opciones.elegida ?? false}
          data-mirando={opciones.mirando ?? false}
          title={a.nombre}
          onClick={() => {
            setFicha(a.id);
            setEtapa("viaje");
          }}
        >
          {dinero(a.precio.total, a.precio.moneda, idioma)}
        </button>
      ),
    });
  };
  const pinDeParada = (id: string, n: number | null, tenue = false, chica = false): void => {
    const p = deParada.get(id);
    if (!p) return;
    marcas.push({
      id: `parada-${p.id}`,
      punto: p.punto,
      encima: tenue ? 1 : parada === p.id ? 8 : 5,
      pieza: (
        <div
          className={`pin-parada${tenue ? " pin-parada--tenue" : chica ? " pin-parada--chica" : ""}`}
          data-activa={parada === p.id}
          title={p.nombre}
          role="button"
          tabIndex={0}
          style={p.foto && !tenue ? { backgroundImage: `url(${foto(p.foto.url, 128)})` } : undefined}
          onClick={() => setParada(p.id)}
          onKeyDown={(e) => e.key === "Enter" && setParada(p.id)}
        >
          {p.foto ? null : p.nombre.slice(0, 1)}
          {n !== null && <span className="pin-parada__n">{n}</span>}
        </div>
      ),
    });
  };

  // El sitio de un viaje que aún no está en el mapa: el que se acaba de buscar, o el de lo entendido.
  const sitio =
    etapa === "preguntas"
      ? (nuevo?.destino ?? null)
      : etapa === "casa" && entendido !== null
        ? {
            centro: entendido.destination.centre,
            caja: entendido.destination.box,
          }
        : null;
  if (sitio !== null) {
    const c = sitio.caja;
    // Una caja que cruza el meridiano 180 no se encuadra: se va a su centro.
    camara =
      c !== null && c.west < c.east
        ? { encuadre: { oeste: c.west, sur: c.south, este: c.east, norte: c.north }, cerca: 12 }
        : { centro: sitio.centro, cerca: 9 };
  }
  if (etapa === "preguntas" && vistazoNuevo !== null) {
    vivos = vistazoNuevo.puntos.map((p) => p.punto);
    // Las zonas, con su precio más bajo. Para que no se pisen, de las que caen muy juntas se pinta la que más tiene:
    // juntas, medido sobre el trozo de mapa que se ve, y más en el móvil, que es más estrecho y solo lleva las que
    // tienen precio.
    const caja = nuevo?.destino.caja ?? null;
    const lados =
      caja === null || caja.west >= caja.east ? null : { x: caja.east - caja.west, y: caja.north - caja.south };
    const aparte = movil ? 0.4 : 0.12;
    const puestas: Punto[] = [];
    const porTamano = [...(vistazoNuevo.zonas ?? [])]
      .filter((z) => z.pasan > 0 && (!movil || z.desde !== null))
      .sort((a, b) => b.pasan - a.pasan);
    for (const z of porTamano) {
      const cerca = (p: Punto): boolean =>
        lados !== null &&
        Math.abs(p.lon - z.punto.lon) / lados.x < aparte &&
        Math.abs(p.lat - z.punto.lat) / lados.y < aparte * (movil ? 0.8 : 0.5);
      if (puestas.some(cerca)) continue;
      puestas.push(z.punto);
      marcas.push({
        id: `zona-${z.id}`,
        punto: z.punto,
        encima: 3,
        pieza: (
          <div className="pin-zona" title={t.primerVistazo.zona(z.pasan)}>
            {z.desde !== null && <b>{dinero(z.desde, vistazoNuevo.moneda, idioma)}</b>}
            <span>{t.primerVistazo.zona(z.pasan)}</span>
          </div>
        ),
      });
    }
  }
  if (etapa === "casa") {
    // Lo que la casa va contando se pinta donde pasa: la zona que se busca, lo encontrado y lo que se mira.
    const ha = (clase: Suceso["clase"]): Suceso[] => vivo.sucesos.filter((s) => s.clase === clase);
    const z = ha("zone").at(-1);
    if (z?.punto && z.radio && ha("lodgings_priced").length === 0) {
      zona = { punto: z.punto, radio: z.radio };
      camara = { encuadre: encuadreDelCirculo(z.punto, z.radio), cerca: 14.5 };
      marcas.push({ id: "pulso-zona", punto: z.punto, encima: 2, pieza: <div className="pulso" /> });
    }
    tenues = ha("lodgings_found").flatMap((s) => s.puntos ?? []);
    vivos = ha("lodgings_pass").flatMap((s) => s.puntos ?? []);
    const mirando = [...vivo.sucesos].reverse().find((s) => s.clase === "looking" || s.clase === "looked");
    if (mirando?.clase === "looking" && mirando.punto) {
      camara = { centro: mirando.punto, cerca: 15.2 };
      marcas.push({ id: "pulso-mira", punto: mirando.punto, encima: 2, pieza: <div className="pulso" /> });
    }
  }

  if (viaje !== null && etapa === "vistazo") {
    vivos = (viaje.vistazo?.puntos ?? []).map((p) => p.punto);
    camara = { encuadre: encuadreDe(vivos.length > 0 ? vivos : [viaje.destino.punto]), cerca: 14.5 };
  }

  if (viaje !== null && etapa === "vivo") {
    const ha = (clase: Suceso["clase"]): Suceso[] => r.vistos.filter((s) => s.clase === clase);
    const z = ha("zone").at(-1);
    const conPrecio = ha("lodgings_priced").length > 0;
    let enLaZona = null;
    if (z?.punto && z.radio && !conPrecio) {
      zona = { punto: z.punto, radio: z.radio };
      enLaZona = encuadreDelCirculo(z.punto, z.radio);
      marcas.push({ id: "pulso-zona", punto: z.punto, encima: 2, pieza: <div className="pulso" /> });
    }
    tenues = ha("lodgings_found").flatMap((s) => s.puntos ?? []);
    vivos = ha("lodgings_pass").flatMap((s) => s.puntos ?? []);
    const mirando = [...r.vistos].reverse().find((s) => s.clase === "looking" || s.clase === "looked");
    for (const f of ha("finalist")) {
      pinDeCama(f.ref ?? "", { mirando: mirando?.clase === "looking" && mirando.ref === f.ref });
    }
    const sitios = ha("sight");
    for (const s of sitios) pinDeParada(s.ref ?? "", null, false, true);
    const lineas = ha("day").map((s) =>
      (viaje.dias[(s.n ?? 1) - 1]?.paradas ?? []).flatMap((id) => deParada.get(id)?.punto ?? []),
    );
    ruta = lineas.at(-1) ?? [];
    otrasRutas.push(...lineas.slice(0, -1));
    if (sitios.length > 0) vivos = [];
    // La cámara sigue a lo que pasa: primero la zona que se busca, después los que pasan y, al final, el viaje entero.
    if (sitios.length > 0) camara = { encuadre: viaje.destino.encuadre, cerca: 14 };
    else if (enLaZona !== null) camara = { encuadre: enLaZona, cerca: 14.5 };
    else camara = { encuadre: encuadreDe(vivos.length > 0 ? vivos : [viaje.destino.punto]), cerca: 14.5 };
    if (mirando?.clase === "looking" && mirando.punto && sitios.length === 0) {
      camara = { centro: mirando.punto, cerca: 15.2 };
      marcas.push({ id: "pulso-mira", punto: mirando.punto, encima: 2, pieza: <div className="pulso" /> });
    }
  }

  if (viaje !== null && etapa === "viaje") {
    const delDia = dia === null ? null : (reparto.dias[dia] ?? null);
    reparto.dias.forEach((d, i) => {
      const puntos = d.paradas.flatMap((id) => deParada.get(id)?.punto ?? []);
      if (dia !== null && i === dia) ruta = puntos;
      else otrasRutas.push(puntos);
      // Con todos los días a la vista, las paradas van pequeñas y sin número; al abrir un día, las suyas crecen.
      d.paradas.forEach((id, n) => pinDeParada(id, i === dia ? n + 1 : null, dia !== null && i !== dia, dia === null));
    });
    // Dos maneras pueden dormir en el mismo sitio: su chincheta, una vez.
    for (const id of new Set(viaje.maneras.map((m) => m.alojamiento))) pinDeCama(id, { elegida: id === cama?.id });
    if (cama && !viaje.maneras.some((m) => m.alojamiento === cama.id)) pinDeCama(cama.id, { elegida: true });
    const fichaAbierta = viaje.alojamientos.find((a) => a.id === ficha);
    if (fichaAbierta && fichaAbierta.id !== cama?.id && !viaje.maneras.some((m) => m.alojamiento === fichaAbierta.id))
      pinDeCama(fichaAbierta.id);
    const aLaVista = (delDia?.paradas ?? reparto.dias.flatMap((d) => d.paradas)).flatMap(
      (id) => deParada.get(id)?.punto ?? [],
    );
    camara = fichaAbierta
      ? { centro: fichaAbierta.punto, cerca: 15.4 }
      : { encuadre: encuadreDe([...aLaVista, ...(cama ? [cama.punto] : [])]), cerca: 15.5 };
  }

  const hueco = movil
    ? { izquierda: 0, abajo: Math.round(alto * 0.5), arriba: 64 }
    : { izquierda: 452, abajo: 0, arriba: 70 };
  const abierta = viaje?.alojamientos.find((a) => a.id === ficha) ?? null;
  const comun = { t, idioma };

  return (
    <main className="app">
      <Mapa
        tema={tema}
        alPintar={() => setPintado(true)}
        camara={camara}
        hueco={hueco}
        tenues={tenues}
        vivos={vivos}
        zona={zona}
        ruta={ruta}
        otrasRutas={otrasRutas}
        marcas={marcas}
      />
      <Buscador
        t={t}
        idioma={idioma}
        recogido={movil && etapa !== "mundo"}
        inicial={
          etapa === "preguntas" && nuevo !== null
            ? { texto: nuevo.destino.nombre, entrada: nuevo.entrada, salida: nuevo.salida }
            : etapa === "casa" && entendido !== null
              ? {
                  texto: entendido.destination.name,
                  entrada: entendido.dates.check_in,
                  salida: entendido.dates.check_out,
                }
              : {
                  texto: etapa === "mundo" ? "" : (viaje?.destino.nombre ?? ""),
                  // En el mundo, las fechas del ejemplo solo se proponen si la web va en seco: con la casa, las
                  // de un viaje nuevo las dice quien lo empieza.
                  entrada: etapa === "mundo" && cuenta !== "no_house" ? "" : (viaje?.entrada ?? ""),
                  salida: etapa === "mundo" && cuenta !== "no_house" ? "" : (viaje?.salida ?? ""),
                }
        }
        alBuscar={alBuscar}
      />

      {etapa === "mundo" && (
        <Hoja corta etiqueta={t.mundo.saludo}>
          <Mundo
            {...comun}
            grabado={viaje?.destino.nombre ?? null}
            alProbar={() => setEtapa("vistazo")}
            noEsTuyo={typeof pedido === "string" && vivo.estado === null}
            conCasa={cuenta !== undefined && cuenta !== "no_house"}
          />
        </Hoja>
      )}
      {etapa === "preguntas" && nuevo !== null && (
        <Empezar
          key={`${nuevo.destino.nombre}|${nuevo.entrada}|${nuevo.salida}`}
          {...comun}
          inicial={nuevo}
          viaje={comoEsta === "started" ? (pedido ?? null) : null}
          cuenta={cuenta}
          alVistazo={setVistazoNuevo}
          alEmpezar={(id) => {
            // La investigación ya corre en la casa: se va a la dirección del viaje, que la escucha en vivo.
            const direccion = new URL(window.location.href);
            direccion.searchParams.set("trip", id);
            direccion.searchParams.delete("at");
            window.location.assign(direccion);
          }}
        />
      )}
      {etapa === "casa" && vivo.estado && (
        <Hoja etiqueta={t.casa.titulo}>
          <EnCasa
            {...comun}
            estado={vivo.estado}
            sucesos={vivo.sucesos}
            deNoches={entendido === null ? 0 : noches(entendido.dates.check_in, entendido.dates.check_out)}
          />
        </Hoja>
      )}
      {etapa === "vistazo" && viaje !== null && (
        <Hoja
          corta
          etiqueta={t.vistazo.rotulo}
          pie={
            <div className="pie-columna">
              <button type="button" className="boton boton--ancho" onClick={() => setEtapa("vivo")}>
                {t.vistazo.empezar}
              </button>
              <span className="dato">{t.vistazo.gasta}</span>
            </div>
          }
        >
          <Vistazo {...comun} viaje={viaje} />
        </Hoja>
      )}
      {etapa === "vivo" && viaje !== null && (
        <Hoja
          etiqueta={t.vivo.rotulo}
          corta={r.acabado}
          pie={
            r.acabado ? (
              <>
                <button type="button" className="boton" onClick={() => setEtapa("viaje")}>
                  {t.vivo.ver}
                </button>
                <button type="button" className="enlace" onClick={r.otraVez}>
                  {t.vivo.otra}
                </button>
              </>
            ) : (
              <button type="button" className="enlace" onClick={() => setEtapa("viaje")}>
                {t.vivo.saltar}
              </button>
            )
          }
        >
          <EnVivo {...comun} viaje={viaje} r={r} />
        </Hoja>
      )}
      {etapa === "viaje" && viaje !== null && impactoSuelto !== null && (
        <Hoja etiqueta={t.momentos.impacto}>
          <ElImpacto {...comun} impacto={impactoDe(impactoSuelto)} alAhoraNo={() => setImpactoSuelto(null)} />
        </Hoja>
      )}
      {etapa === "viaje" && viaje !== null && abierta === null && impactoSuelto === null && (
        <Hoja etiqueta={t.viaje.rotulo}>
          <TuViaje
            {...comun}
            viaje={viaje}
            reparto={reparto}
            pestana={pestana}
            dia={dia}
            ritmo={ritmo}
            manera={elegida?.id ?? manera}
            parada={parada}
            quitadas={quitadas}
            anadidas={anadidas}
            aLaPestana={setPestana}
            alDia={(d) => {
              setDia(d);
              setParada(null);
            }}
            alRitmo={(r) => {
              toca();
              setRitmo(r);
            }}
            aLaManera={(m) => {
              toca();
              setManera(m);
              // Otra manera trae su alojamiento: el que elegiste antes era sobre la de antes.
              setAlojamientoElegido(null);
            }}
            aLaParada={(id) => setParada((actual) => (actual === id ? null : id))}
            alAlojamiento={setFicha}
            alQuitar={quita}
            alAnadir={anade}
            alMover={mueve}
            alReponer={repone}
            fijadas={fijadas}
            paraMensajes={pedido != null && (comoEsta === "on_map" || comoEsta === "closed") ? pedido : null}
            tuyo={pedido != null && comoEsta === "on_map" ? pedido : null}
            version={vivo.estado?.trip.version ?? null}
          />
          {pedido != null && comoEsta === "closed" && (
            <ATuGuia viaje={pedido} manera={elegida?.id ?? manera} idioma={idioma} />
          )}
          {tuyas.guardado === "fallo" && <p className="aviso">{t.momentos.noGuardado}</p>}
          {pedido != null && versiones !== null && versiones.length > 0 && (
            <TusVersiones {...comun} id={pedido} versiones={versiones} />
          )}
        </Hoja>
      )}
      {etapa === "viaje" && viaje !== null && abierta !== null && (
        <Hoja etiqueta={abierta.nombre}>
          <Ficha
            {...comun}
            a={abierta}
            nochesDelViaje={noches(viaje.entrada, viaje.salida)}
            alVolver={() => setFicha(null)}
          />
          {pedido != null && comoEsta === "on_map" && (
            <TuAlojamiento
              {...comun}
              id={pedido}
              viaje={viaje}
              a={abierta}
              manera={elegida}
              duermes={cama?.id ?? null}
              gustos={gustos}
              alGustos={(g) => {
                toca();
                setGustos(g);
              }}
              alElegir={(a) => {
                toca();
                setAlojamientoElegido(a);
              }}
            />
          )}
        </Hoja>
      )}
      <Cargando texto={t.cargando} fuera={pintado} />
    </main>
  );
}
