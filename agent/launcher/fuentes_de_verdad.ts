// Las fuentes de verdad de una investigación: las tres de datos ya aprobadas (LiteAPI, Aviasales y Parallel) y los
// datos abiertos de sitios y de fotos. Cada una se apaga con ELDORADO_APAGAR sin tocar lo demás: sin transporte o sin
// otras ofertas, la investigación sigue y lo dice; sin alojamiento o sin sitios, no hay viaje.

import { ESCALERA_DE_ENLACES, SITIOS_QUE_BASTAN } from "../data/dias.ts";
import { vuelosPorFechas } from "../tools/fuentes/aviasales.ts";
import { encendida } from "../tools/fuentes/enchufes.ts";
import { liteapi } from "../tools/fuentes/liteapi.ts";
import { ofertasDeZona } from "../tools/fuentes/parallel.ts";
import { conMargen, fotosDe, resumenesDe, sitiosConEscalera } from "../tools/sitios.ts";
import type { Fuentes } from "./investigar.ts";

/** El margen que se le da a la caja del destino al pedir sus sitios: un kilómetro, más o menos. */
const MARGEN = 0.01;

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
      const pedido = { idioma: viaje.language, cuantos: SITIOS_QUE_SE_TRAEN };
      return sitiosConEscalera(conMargen(caja, MARGEN), ESCALERA_DE_ENLACES, SITIOS_QUE_BASTAN, pedido);
    },
    // Cuántos se resumen lo decide quien llama, según las noches del viaje.
    resumenes: (sitios) => resumenesDe(sitios),
    fotos: (archivos) => fotosDe(archivos),
    desde: manana,
  };
  if (encendida("aviasales"))
    fuentes.vuelos = async (viaje, ida, vuelta) => {
      // Sin saber de dónde se sale y a dónde se llega no hay vuelo que buscar; el mercado es el del país de salida.
      const origen = viaje.origin;
      if (origen === null || origen.airport === null || viaje.destination.airport === null) return [];
      return vuelosPorFechas({
        origen: origen.airport,
        destino: viaje.destination.airport,
        ida,
        vuelta,
        moneda: viaje.currency.toUpperCase(),
        mercado: origen.country.toLowerCase(),
      });
    };
  if (encendida("parallel")) fuentes.ofertas = (lugar, e) => ofertasDeZona(lugar, e);
  return fuentes;
}
