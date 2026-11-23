"use client";

// El mapa es la pieza central del panel. Aquí vive lo que se decide: en qué etapa estás (el mundo, el primer vistazo,
// la investigación o tu viaje), qué día miras, a qué ritmo, de qué manera, y lo que has quitado, añadido o movido.
// En seco, todo sale del viaje grabado.

import { useEffect, useMemo, useState } from "react";
import type { Manera, Punto, Ritmo, Suceso } from "../../../../../agent/output/viaje.ts";
import { fechasDe, repartir } from "../../../../../agent/scripts/ritmo.ts";
import { Buscador, type Busqueda } from "../../../piezas/Buscador.tsx";
import { Cargando } from "../../../piezas/Cargando.tsx";
import { Hoja } from "../../../piezas/Hoja.tsx";
import { Mapa, type Camara, type Marca } from "../../../piezas/Mapa.tsx";
import { EnVivo, Ficha, Mundo, TuViaje, Vistazo, type Pestana } from "../../../piezas/Pantallas.tsx";
import { dinero } from "../../../lib/formato.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { foto, useAlto, useGrabado, useIdioma, useMovil, useReproductor, useTema } from "../../../lib/usar.ts";

type Etapa = "mundo" | "vistazo" | "vivo" | "viaje";

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
  const grabado = useGrabado();
  const [pintado, setPintado] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("mundo");
  const [lejos, setLejos] = useState<Camara | null>(null);
  const [pestana, setPestana] = useState<Pestana>("days");
  const [dia, setDia] = useState<number | null>(null);
  const [ritmo, setRitmo] = useState<Ritmo>("normal");
  const [manera, setManera] = useState<Manera["id"]>("best_value");
  const [parada, setParada] = useState<string | null>(null);
  const [ficha, setFicha] = useState<string | null>(null);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [anadidas, setAnadidas] = useState<string[]>([]);
  const [fijadas, setFijadas] = useState<Record<string, number>>({});

  // Para abrir una pantalla suelta: ?at=look, ?at=live o ?at=trip, con &day=2, &tab=stay o &stay=3.
  useEffect(() => {
    if (!grabado) return;
    const pedido = new URLSearchParams(window.location.search);
    const en = pedido.get("at");
    if (en !== null) setEtapa(en === "look" ? "vistazo" : en === "live" ? "vivo" : "viaje");
    if (pedido.get("day") !== null) setDia(Number(pedido.get("day")) - 1);
    const pedida = pedido.get("tab");
    if (pedida === "days" || pedida === "stay" || pedida === "money" || pedida === "notes") setPestana(pedida);
    if (pedido.get("stay") !== null) setFicha(grabado.viaje.alojamientos[Number(pedido.get("stay")) - 1]?.id ?? null);
  }, [grabado]);

  const viaje = grabado?.viaje ?? null;
  const r = useReproductor(grabado?.sucesos ?? [], etapa === "vivo");
  const elegida = viaje?.maneras.find((m) => m.id === manera) ?? viaje?.maneras[0] ?? null;
  const cama = viaje?.alojamientos.find((a) => a.id === elegida?.alojamiento) ?? null;

  // Los días se reparten aquí, al instante, con el ritmo que pidas, desde donde duermes y con lo que has cambiado.
  const reparto = useMemo(() => {
    if (viaje === null) return { dias: [], fuera: [] };
    const fechas = fechasDe(viaje.entrada, viaje.salida);
    return repartir(viaje.paradas, fechas, ritmo, cama?.punto ?? viaje.destino.punto, { quitadas, anadidas, fijadas });
  }, [viaje, ritmo, cama, quitadas, anadidas, fijadas]);
  const deParada = useMemo(() => new Map((viaje?.paradas ?? []).map((p) => [p.id, p])), [viaje]);

  const alBuscar = (b: Busqueda): void => {
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
    setQuitadas((q) => [...q.filter((x) => x !== id), id]);
    setAnadidas((a) => a.filter((x) => x !== id));
    setFijadas(({ [id]: _, ...resto }) => resto);
    setParada(null);
  };
  const anade = (id: string): void => {
    setQuitadas((q) => q.filter((x) => x !== id));
    setAnadidas((a) => [...a.filter((x) => x !== id), id]);
  };
  const mueve = (id: string, aDia: number): void => {
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
    for (const m of viaje.maneras) pinDeCama(m.alojamiento, { elegida: m.id === elegida?.id });
    const fichaAbierta = viaje.alojamientos.find((a) => a.id === ficha);
    if (fichaAbierta && !viaje.maneras.some((m) => m.alojamiento === fichaAbierta.id)) pinDeCama(fichaAbierta.id);
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
        inicial={{
          texto: etapa === "mundo" ? "" : (viaje?.destino.nombre ?? ""),
          entrada: viaje?.entrada ?? "",
          salida: viaje?.salida ?? "",
        }}
        alBuscar={alBuscar}
      />

      {etapa === "mundo" && (
        <Hoja corta etiqueta={t.mundo.saludo}>
          <Mundo {...comun} hayGrabado={viaje !== null} alProbar={() => setEtapa("vistazo")} />
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
      {etapa === "viaje" && viaje !== null && abierta === null && (
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
            alRitmo={setRitmo}
            aLaManera={setManera}
            aLaParada={(id) => setParada((actual) => (actual === id ? null : id))}
            alAlojamiento={setFicha}
            alQuitar={quita}
            alAnadir={anade}
            alMover={mueve}
          />
        </Hoja>
      )}
      {etapa === "viaje" && abierta !== null && (
        <Hoja etiqueta={abierta.nombre}>
          <Ficha {...comun} a={abierta} alVolver={() => setFicha(null)} />
        </Hoja>
      )}
      <Cargando texto={t.cargando} fuera={pintado} />
    </main>
  );
}
