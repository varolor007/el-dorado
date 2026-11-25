// El día a día a ratos (8.6), en datos: lo que puede llevar un mensaje tuyo, cuántos se pueden mandar, qué palabras
// dicen qué clase de sitio pides (para volver a los datos abiertos si no estaba) y cuántos se traen. Son de partida y
// generales: ninguna palabra es de un destino ni de un caso, y las clases son las de `agent/data/sitios.ts`.

/** La clase de un mensaje tuyo en lo que pide el momento (`rehecho.json`, campo `pedido`). */
export const UN_MENSAJE = "day_message";

/** Lo más que puede llevar un mensaje tuyo, en letras. */
export const LARGO_DE_UN_MENSAJE = 300;

/**
 * Cuántos mensajes se pueden mandar de un viaje, contados en su diario por ventana de horas. Es de partida y es del
 * PM: cada mensaje lanza al del día a día, que gasta.
 */
export const MENSAJES_DE_UN_VIAJE = { deUnViaje: 3, horas: 24 };

/**
 * Las palabras que piden una clase de sitio, en los dos idiomas de la web, en minúsculas y sin tildes. Una palabra
 * vale entera: «playa» y «playas», no «playera». La clase es la de `RAICES`, en `agent/data/sitios.ts`.
 */
export const PALABRAS_DE_UNA_CLASE: Record<string, string[]> = {
  beach: ["beach", "beaches", "playa", "playas", "cala", "calas"],
  market: ["market", "markets", "marketplace", "mercado", "mercados", "mercadillo", "mercadillos"],
  viewpoint: ["viewpoint", "viewpoints", "lookout", "lookouts", "mirador", "miradores"],
  park: ["park", "parks", "garden", "gardens", "zoo", "parque", "parques", "jardin", "jardines"],
  nature: [
    "nature",
    "lake",
    "lakes",
    "waterfall",
    "waterfalls",
    "mountain",
    "mountains",
    "naturaleza",
    "lago",
    "lagos",
    "cascada",
    "cascadas",
    "montana",
    "montanas",
  ],
  museum: ["museum", "museums", "aquarium", "museo", "museos", "acuario"],
  castle: ["castle", "castles", "fortress", "castillo", "castillos", "fortaleza"],
  palace: ["palace", "palaces", "palacio", "palacios"],
  worship: ["church", "churches", "cathedral", "temple", "temples", "iglesia", "iglesias", "catedral", "templo"],
  square: ["square", "squares", "plaza", "plazas"],
  theatre: ["theatre", "theater", "theatres", "theaters", "teatro", "teatros"],
  monument: ["monument", "monuments", "ruins", "monumento", "monumentos", "ruinas"],
  neighbourhood: ["neighbourhood", "neighborhood", "old town", "barrio", "barrios", "casco antiguo"],
};

/** Cuántos sitios de una clase pedida se traen de los datos abiertos, como mucho, si no había ninguno. */
export const SITIOS_DE_UNA_CLASE = 6;

/** Cuántas clases pedidas se buscan de un mensaje, como mucho: lo demás lo dice el asiento en lo que echa en falta. */
export const CLASES_DE_UN_MENSAJE = 3;
