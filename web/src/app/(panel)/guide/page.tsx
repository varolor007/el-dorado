"use client";

// Tu guía: el cuaderno de un viaje tuyo ya cerrado. Se pide («Quiero mi guía»), se escribe mientras esperas o te vas,
// y se ve aquí tal como se imprime. Se guarda como documento: imprimiéndolo (o guardándolo como PDF desde el diálogo
// de imprimir del navegador) o descargando la página, que se lee sola, sin internet. Solo la ve su dueño.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCuenta, useViajeDeLaCasa } from "../../../lib/cuenta.ts";
import { dinero } from "../../../lib/formato.ts";
import { pedirGuia, useDocumento, useGuia } from "../../../lib/guia.ts";
import { TEXTOS } from "../../../lib/textos.ts";
import { useIdioma } from "../../../lib/usar.ts";
import { Carrusel } from "../../../piezas/Carrusel.tsx";

/** El documento, en un marco sin programas: se ve como se imprime, y su altura es la de lo que lleva. */
function Documento({
  html,
  titulo,
  alMarco,
}: {
  html: string;
  titulo: string;
  alMarco: (f: HTMLIFrameElement) => void;
}) {
  const marco = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState(1200);
  useEffect(() => {
    if (marco.current !== null) alMarco(marco.current);
  }, [alMarco]);
  const mide = (): void => {
    const cuerpo = marco.current?.contentDocument?.documentElement;
    if (cuerpo !== undefined && cuerpo !== null) setAlto(cuerpo.scrollHeight + 8);
  };
  return (
    <iframe
      ref={marco}
      className="guia__marco"
      title={titulo}
      srcDoc={html}
      // Sin programas: el documento no lleva ninguno, y aunque llevara, no correría. Puede abrir sus enlaces de reserva
      // fuera e imprimirse (imprimir pide `allow-modals`, y medir su alto, `allow-same-origin`). Por eso mismo aquí
      // NUNCA va `allow-scripts`: con el mismo origen, un programa del documento tendría la sesión de la web. La
      // batería lo vigila.
      sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox"
      style={{ height: alto }}
      onLoad={() => {
        mide();
        setTimeout(mide, 400);
      }}
    />
  );
}

export default function TuGuiaPagina() {
  const idioma = useIdioma();
  const t = TEXTOS[idioma];
  const cuenta = useCuenta();
  const [id, setId] = useState<string | null | undefined>(undefined);
  const [pedidaManera, setPedidaManera] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setId(q.get("trip"));
    setPedidaManera(q.get("way"));
  }, []);
  const { estado, guia, mira } = useGuia(id ?? null);
  const delViaje = useViajeDeLaCasa(id ?? null);
  const viaje = delViaje?.viaje ?? null;
  const html = useDocumento(id ?? null, guia?.state === "ready" ? guia.n : null);
  const [manera, setManera] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState(false);
  const [elMarco, setElMarco] = useState<HTMLIFrameElement | null>(null);

  // La manera: la que traía tu viaje marcada, la de la guía de antes o, si no, la mejor por lo que cuesta.
  useEffect(() => {
    if (viaje === null || manera !== null) return;
    const ids = viaje.maneras.map((m) => m.id as string);
    const de = [viaje.cierre?.manera ?? null, pedidaManera, guia?.way ?? null, "best_value", ids[0] ?? null].find(
      (x) => x !== null && ids.includes(x),
    );
    if (de !== undefined) setManera(de);
  }, [viaje, guia, pedidaManera, manera]);

  const pide = async (): Promise<void> => {
    if (id == null) return;
    setOcupada(true);
    setFallo(await pedirGuia(id, manera));
    setOcupada(false);
    mira();
  };

  const descarga = (): void => {
    if (html == null || viaje === null) return;
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const nombre = viaje.destino.nombre
      .normalize("NFD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .toLowerCase();
    enlace.download = `${t.guia.titulo.toLowerCase().replace(/\s+/g, "-")}-${nombre}.html`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
  };

  const dentro = typeof cuenta === "object" && cuenta !== null;
  const cerrado = estado === "closed";
  const puedePedir = cerrado && guia?.state !== "working" && (guia == null || guia.state === "stopped" || guia.behind);

  return (
    <main className="pagina guia">
      <header className="pagina__cab">
        <h1 className="lugar">
          {t.guia.titulo}
          {viaje !== null && <span className="guia__destino">{viaje.destino.nombre}</span>}
        </h1>
        <p className="suave">{t.guia.sub}</p>
      </header>

      {cuenta === null && <p className="aviso">{t.guia.entra}</p>}
      {cuenta === "no_house" && <p className="aviso">{t.cuenta.sinCasa}</p>}
      {dentro && estado !== undefined && estado !== null && !cerrado && (
        <p className="aviso">
          <span>
            {t.guia.noCerrado}{" "}
            <Link className="enlace" href={`/plan?trip=${id}&at=trip`}>
              {t.guia.volver}
            </Link>
          </span>
        </p>
      )}

      {guia?.state === "ready" && guia.behind && (
        <p className="aviso aviso--oro" role="status">
          {t.guia.atras}
        </p>
      )}
      {guia?.state === "stopped" && <p className="aviso aviso--novale">{t.guia.parada}</p>}

      {puedePedir && viaje !== null && (
        <section className="tarjeta guia__pedir">
          {viaje.maneras.length > 1 && viaje.cierre == null && (
            <fieldset className="guia__maneras">
              <legend className="rotulo">{t.guia.manera}</legend>
              {viaje.maneras.map((m) => {
                const a = viaje.alojamientos.find((x) => x.id === m.alojamiento);
                return (
                  <label key={m.id} className={`otro${manera === m.id ? " otro--elegido" : ""}`}>
                    <input
                      type="radio"
                      name="manera"
                      value={m.id}
                      checked={manera === m.id}
                      onChange={() => setManera(m.id)}
                    />
                    <span>
                      {t.viaje.manera[m.id]}
                      <span className="otro__novale">{a?.nombre}</span>
                    </span>
                    <b>{dinero(m.total, m.moneda, idioma)}</b>
                  </label>
                );
              })}
            </fieldset>
          )}
          <div className="cabecera__linea">
            <button type="button" className="boton" disabled={ocupada} onClick={() => void pide()}>
              {guia == null ? t.guia.pedir : t.guia.otraVez}
            </button>
            <span className="dato">{t.guia.gasta}</span>
          </div>
          {fallo !== null && (
            <p className="aviso aviso--novale" role="alert">
              {t.guia.fallo(fallo)}
            </p>
          )}
        </section>
      )}

      {guia?.state === "working" && (
        <section className="tarjeta guia__escribe">
          {id != null ? <Carrusel t={t} viaje={id} que={t.guia.escribiendo} /> : <p>{t.guia.escribiendo}</p>}
        </section>
      )}

      {guia?.state === "ready" && html != null && (
        <section className="guia__hecha">
          <div className="guia__botones">
            <button type="button" className="boton" onClick={() => elMarco?.contentWindow?.print()}>
              {t.guia.imprimir}
            </button>
            <button type="button" className="boton boton--hueco" onClick={descarga}>
              {t.guia.descargar}
            </button>
            {guia.made !== null && (
              <span className="dato">
                {t.guia.hecha(
                  new Intl.DateTimeFormat(idioma, { day: "numeric", month: "long", year: "numeric" }).format(
                    new Date(guia.made),
                  ),
                  guia.version,
                )}
              </span>
            )}
          </div>
          <Documento html={html} titulo={t.guia.marco} alMarco={setElMarco} />
        </section>
      )}
      {id != null && cerrado && (
        <p>
          <Link className="enlace" href={`/plan?trip=${id}&at=trip`}>
            ← {t.guia.volver}
          </Link>
        </p>
      )}
    </main>
  );
}
