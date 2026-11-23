"use client";

// El mapa: la página entera. Pinta el mundo con el estilo de El Dorado y, encima, lo que le digan: los puntos de los
// alojamientos, la zona que se busca, la línea de un día y las marcas (las paradas y las camas), que son piezas de
// React colgadas del mapa. No decide nada: enseña.

import maplibregl, { type GeoJSONSource, type Map as MapaDeMapLibre, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Encuadre, Punto } from "../../../agent/output/viaje.ts";
import { estiloDelMapa, type Tema } from "../lib/estiloDelMapa.ts";

export type Marca = { id: string; punto: Punto; pieza: ReactNode; encima?: number };
export type Camara = { encuadre: Encuadre; cerca?: number } | { centro: Punto; cerca: number };
export type Zona = { punto: Punto; radio: number };

type Props = {
  tema: Tema;
  globo?: boolean;
  camara: Camara;
  /** El hueco que tapa la hoja, para que el encuadre caiga en lo que se ve. */
  hueco: { izquierda: number; abajo: number; arriba: number };
  tenues?: Punto[];
  vivos?: Punto[];
  zona?: Zona | null;
  ruta?: Punto[];
  otrasRutas?: Punto[][];
  marcas: Marca[];
};

const ORO: Record<Tema, string> = { claro: "#C9982A", oscuro: "#F0C24B" };
const TINTA: Record<Tema, string> = { claro: "#0E1217", oscuro: "#E9EBED" };
const PAPEL: Record<Tema, string> = { claro: "#FAFBFC", oscuro: "#171C22" };

type Geo = GeoJSON.FeatureCollection;
const nada: Geo = { type: "FeatureCollection", features: [] };
const dePuntos = (puntos: Punto[]): Geo => ({
  type: "FeatureCollection",
  features: puntos.map((p) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  })),
});
const deLineas = (lineas: Punto[][]): Geo => ({
  type: "FeatureCollection",
  features: lineas
    .filter((l) => l.length > 1)
    .map((l) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: l.map((p) => [p.lon, p.lat]) },
    })),
});

/** Un círculo sobre el mapa, de un radio en metros, como polígono. */
function deZona(z: Zona | null | undefined): Geo {
  if (!z) return nada;
  const borde: number[][] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * 2 * Math.PI;
    const dLat = (z.radio / 111_320) * Math.cos(a);
    const dLon = (z.radio / (111_320 * Math.cos((z.punto.lat * Math.PI) / 180))) * Math.sin(a);
    borde.push([z.punto.lon + dLon, z.punto.lat + dLat]);
  }
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [borde] } }],
  };
}

/** El estilo del mapa con las capas de lo nuestro ya puestas, vacías. */
function estiloCompleto(tema: Tema): StyleSpecification {
  const base = estiloDelMapa(tema);
  const oro = ORO[tema];
  const vacia = { type: "geojson" as const, data: nada };
  return {
    ...base,
    sources: { ...base.sources, tenues: vacia, vivos: vacia, zona: vacia, ruta: vacia, otras: vacia },
    layers: [
      ...base.layers,
      { id: "zona-fondo", type: "fill", source: "zona", paint: { "fill-color": oro, "fill-opacity": 0.07 } },
      {
        id: "zona-borde",
        type: "line",
        source: "zona",
        paint: { "line-color": oro, "line-width": 1.4, "line-dasharray": [2, 3], "line-opacity": 0.9 },
      },
      {
        id: "tenues",
        type: "circle",
        source: "tenues",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 15, 3],
          "circle-color": TINTA[tema],
          "circle-opacity": 0.28,
        },
      },
      {
        id: "vivos",
        type: "circle",
        source: "vivos",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.4, 15, 5],
          "circle-color": oro,
          "circle-stroke-color": PAPEL[tema],
          "circle-stroke-width": 1,
          "circle-opacity": 0.95,
        },
      },
      {
        id: "otras",
        type: "line",
        source: "otras",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": TINTA[tema], "line-width": 1.6, "line-opacity": 0.22, "line-dasharray": [1, 2.5] },
      },
      {
        id: "ruta-halo",
        type: "line",
        source: "ruta",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": PAPEL[tema], "line-width": 7, "line-opacity": 0.9 },
      },
      {
        id: "ruta",
        type: "line",
        source: "ruta",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": oro, "line-width": 3 },
      },
      {
        id: "ruta-flechas",
        type: "symbol",
        source: "ruta",
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 70,
          "icon-image": "flecha",
          "icon-size": 0.5,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: { "icon-color": TINTA[tema] },
      },
    ],
  };
}

/** La punta de flecha que marca el sentido de la ruta, dibujada aquí para no cargar una imagen. */
function flecha(): { width: number; height: number; data: Uint8Array } {
  const lado = 32;
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const c = lienzo.getContext("2d")!;
  c.fillStyle = "#000";
  c.beginPath();
  c.moveTo(9, 6);
  c.lineTo(25, 16);
  c.lineTo(9, 26);
  c.lineTo(13, 16);
  c.closePath();
  c.fill();
  return { width: lado, height: lado, data: new Uint8Array(c.getImageData(0, 0, lado, lado).data.buffer) };
}

export function Mapa({ tema, globo, camara, hueco, tenues, vivos, zona, ruta, otrasRutas, marcas }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaDeMapLibre | null>(null);
  const [listo, setListo] = useState(0);
  const puestas = useRef(new Map<string, { marca: maplibregl.Marker; el: HTMLDivElement }>());
  const [, repinta] = useState(0);

  // El mapa se crea una vez; al cambiar de tema, cambia de estilo y vuelve a avisar de que está listo.
  useEffect(() => {
    const m = new maplibregl.Map({
      container: caja.current!,
      style: estiloCompleto(tema),
      center: [8, 28],
      zoom: 1.5,
      minZoom: 1.2,
      maxZoom: 18,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: true,
      fadeDuration: 150,
    });
    m.touchZoomRotate.disableRotation();
    m.on("styleimagemissing", (e) => {
      if (e.id === "flecha" && !m.hasImage("flecha")) m.addImage("flecha", flecha(), { sdf: true });
    });
    m.on("style.load", () => {
      setListo((n) => n + 1);
    });
    m.once("idle", () => document.body.setAttribute("data-mapa", "listo"));
    mapa.current = m;
    return () => {
      for (const { marca } of puestas.current.values()) marca.remove();
      puestas.current.clear();
      m.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El mundo, plano o como un globo que se aplana solo al acercarse.
  useEffect(() => {
    if (listo > 0) mapa.current?.setProjection({ type: globo ? "globe" : "mercator" });
  }, [globo, listo]);

  const primerTema = useRef(tema);
  useEffect(() => {
    if (primerTema.current === tema) return;
    primerTema.current = tema;
    mapa.current?.setStyle(estiloCompleto(tema));
  }, [tema]);

  // Lo que se pinta en capas: cada vez que cambia el dato o se recarga el estilo.
  const pon = (fuente: string, dato: Geo): void => {
    (mapa.current?.getSource(fuente) as GeoJSONSource | undefined)?.setData(dato);
  };
  useEffect(() => pon("tenues", dePuntos(tenues ?? [])), [tenues, listo]);
  useEffect(() => pon("vivos", dePuntos(vivos ?? [])), [vivos, listo]);
  useEffect(() => pon("zona", deZona(zona)), [zona, listo]);
  useEffect(() => pon("ruta", deLineas([ruta ?? []])), [ruta, listo]);
  useEffect(() => pon("otras", deLineas(otrasRutas ?? [])), [otrasRutas, listo]);

  // La cámara vuela a lo que se le pida, dejando libre lo que tapa la hoja.
  const clave = JSON.stringify([camara, hueco]);
  useEffect(() => {
    const m = mapa.current;
    if (!m || listo === 0) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const padding = { left: hueco.izquierda + 40, right: 40, top: hueco.arriba + 40, bottom: hueco.abajo + 40 };
    if ("encuadre" in camara) {
      const e = camara.encuadre;
      m.fitBounds(
        [
          [e.oeste, e.sur],
          [e.este, e.norte],
        ],
        { padding, duration: quieto ? 0 : 2200, maxZoom: camara.cerca ?? 15.5, essential: true },
      );
    } else {
      m.flyTo({
        center: [camara.centro.lon, camara.centro.lat],
        zoom: camara.cerca,
        padding,
        duration: quieto ? 0 : 1600,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, listo]);

  // Las marcas: cada una, un elemento del mapa donde React cuelga su pieza.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const vivas = new Set(marcas.map((x) => x.id));
    for (const [id, puesta] of puestas.current) {
      if (!vivas.has(id)) {
        puesta.marca.remove();
        puestas.current.delete(id);
      }
    }
    let nuevas = false;
    for (const x of marcas) {
      const puesta = puestas.current.get(x.id);
      if (puesta) {
        puesta.marca.setLngLat([x.punto.lon, x.punto.lat]);
        puesta.el.style.zIndex = String(x.encima ?? 1);
      } else {
        const el = document.createElement("div");
        el.style.zIndex = String(x.encima ?? 1);
        const marca = new maplibregl.Marker({ element: el }).setLngLat([x.punto.lon, x.punto.lat]).addTo(m);
        puestas.current.set(x.id, { marca, el });
        nuevas = true;
      }
    }
    if (nuevas) repinta((n) => n + 1);
  }, [marcas]);

  return (
    <>
      <div ref={caja} className="mapa" />
      {marcas.map((x) => {
        const puesta = puestas.current.get(x.id);
        return puesta ? createPortal(x.pieza, puesta.el, x.id) : null;
      })}
    </>
  );
}
