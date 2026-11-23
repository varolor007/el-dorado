// Las fuentes de verdad de una investigación: las tres de datos ya aprobadas (LiteAPI, Aviasales y Parallel) y los
// datos abiertos de sitios y de fotos. Cada una se apaga con ELDORADO_APAGAR sin tocar lo demás: sin transporte o sin
// otras ofertas, la investigación sigue y lo dice; sin alojamiento o sin sitios, no hay viaje.

import { SITIOS_PARA_ELEGIR } from "../data/dias.ts";
import { vuelosPorFechas } from "../tools/fuentes/aviasales.ts";
import { encendida } from "../tools/fuentes/enchufes.ts";
import { liteapi } from "../tools/fuentes/liteapi.ts";
import { ofertasDeZona } from "../tools/fuentes/parallel.ts";
import { fotosDe, resumenesDe, sitiosDe } from "../tools/sitios.ts";
import { MONEDA_DE_PARTIDA } from "../data/cribas.ts";
import type { Fuentes } from "./investigar.ts";

/** Cuántos sitios se traen de los datos abiertos: más de los que se dan a elegir, por si alguno se cae. */
const SITIOS_QUE_SE_TRAEN = 80;

export function fuentesDeVerdad(hoy: Date = new Date()): Fuentes {
  if (!encendida("liteapi")) throw new Error("la fuente de alojamiento está apagada");
  if (!encendida("sitios")) throw new Error("los datos abiertos de sitios están apagados");
  const manana = new Date(hoy.getTime() + 86_400_000).toISOString().slice(0, 10);
  const fuentes: Fuentes = {
    alojamiento: liteapi,
    sitios: (viaje) => {
      const c = viaje.destination.box;
      const caja = { oeste: c.west, sur: c.south, este: c.east, norte: c.north };
      return sitiosDe(caja, { idioma: viaje.language, cuantos: SITIOS_QUE_SE_TRAEN });
    },
    resumenes: (sitios) => resumenesDe(sitios.slice(0, SITIOS_PARA_ELEGIR)),
    fotos: (archivos) => fotosDe(archivos),
    desde: manana,
  };
  if (encendida("aviasales"))
    fuentes.vuelos = (viaje, ida, vuelta) =>
      vuelosPorFechas({
        origen: viaje.origin?.airport ?? "",
        destino: viaje.destination.airport ?? "",
        ida,
        vuelta,
        moneda: MONEDA_DE_PARTIDA,
        mercado: (viaje.origin?.country ?? "es").toLowerCase(),
      });
  if (encendida("parallel")) fuentes.ofertas = (lugar, e) => ofertasDeZona(lugar, e);
  return fuentes;
}
