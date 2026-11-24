// Las fuentes de verdad de una investigación: las tres de datos ya aprobadas (LiteAPI, Aviasales y Parallel), la de
// rutas (Geoapify) y los datos abiertos de sitios y de fotos. Cada una se apaga con ELDORADO_APAGAR sin tocar lo demás:
// sin transporte, sin otras ofertas o sin rutas, la investigación sigue y lo dice; sin alojamiento o sin sitios, no
// hay viaje.

import { join } from "node:path";
import { ESCALERA_DE_ENLACES, SITIOS_QUE_BASTAN } from "../data/dias.ts";
import { aviasales } from "../tools/fuentes/aviasales.ts";
import { encendida } from "../tools/fuentes/enchufes.ts";
import { CASILLAS_DE_UNA_MATRIZ, claveDeGeoapify, matrizDeCaminos } from "../tools/fuentes/geoapify.ts";
import { liteapi } from "../tools/fuentes/liteapi.ts";
import { ofertasDeZona } from "../tools/fuentes/parallel.ts";
import { conMargen, fotosDe, resumenesDe, sitiosConEscalera } from "../tools/sitios.ts";
import type { Fuentes } from "./investigar.ts";
import { carpetaDeLaMesa } from "./mesa.ts";

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
  // Los aeropuertos de la fuente se guardan un día en la mesa, fuera del repositorio: son tres archivos grandes. La
  // misma fuente da los días baratos del primer vistazo, con los mismos aeropuertos que la parrilla.
  if (encendida("aviasales")) fuentes.transporte = aviasales(join(carpetaDeLaMesa(), "fuentes"));
  if (encendida("parallel")) fuentes.ofertas = (lugar, e) => ofertasDeZona(lugar, e);
  // La de rutas, solo para andar y para el coche: en transporte público se queda corta (el PM, 24-nov). Sin su clave
  // en el entorno no se enchufa, y la investigación lo dice.
  if (encendida("geoapify") && tieneClave())
    fuentes.rutas = {
      nombre: "geoapify",
      casillasPorPedido: CASILLAS_DE_UNA_MATRIZ,
      matriz: (origenes, destinos, manera) => matrizDeCaminos(origenes, destinos, manera),
    };
  return fuentes;
}

function tieneClave(): boolean {
  try {
    claveDeGeoapify();
    return true;
  } catch {
    return false;
  }
}
