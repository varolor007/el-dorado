// El día a día, en datos: lo que puede decir el asiento que elige los sitios y los topes de un día. Los mismos
// valores que lee el asiento en su contrato; una prueba mira que digan lo mismo.

/** Lo que puede llevar una visita, en minutos. */
export const MINUTOS_DE_VISITA = [30, 45, 60, 90, 120, 180, 240];

export const RESERVAR = ["yes", "no", "unknown"];

/** Lo imprescindible es raro: como mucho, tantos por noche. */
export const IMPRESCINDIBLES_POR_NOCHE = 2;

/**
 * Cuántos sitios de los datos abiertos se le dan a elegir al asiento: tantos por noche, con un suelo y un techo. Una
 * noche no necesita sesenta sitios, y tres semanas no caben en sesenta.
 */
export const SITIOS_POR_NOCHE = 20;
export const SITIOS_PARA_ELEGIR = { minimo: 20, maximo: 120 };

/**
 * De cuánto se tiene que hablar de un sitio para traerlo: en cuántos idiomas tiene artículo. Se empieza pidiendo
 * mucho; si el destino es pequeño y no salen bastantes sitios, se pide menos, hasta lo que tenga un solo artículo.
 */
export const ESCALERA_DE_ENLACES = [5, 2, 1];
export const SITIOS_QUE_BASTAN = 25;

/** Lo que cabe en un día entero, en minutos, contando las visitas y lo que se anda entre ellas. */
export const DIA_ENTERO = 600;

/** El salto más largo, en metros andados, entre dos paradas seguidas de un mismo día. */
export const SALTO_MAXIMO = 3500;

/** Cuántas paradas caben en un día, y cuántos minutos de visita, con cada ritmo. Son de partida. */
export const CABE = {
  calm: { paradas: 3, minutos: 240 },
  normal: { paradas: 5, minutos: 360 },
  full: { paradas: 7, minutos: 480 },
};

/**
 * Lo cerca que tiene que estar una parada, en línea recta, del centro de un día para juntarse con él. Es más corto
 * que el salto máximo: junta lo que está al lado, y el salto máximo es lo que no se pasa nunca.
 */
export const CERCA_DE_UN_DIA = 2000;

/**
 * Si más de esta parte de lo elegido se queda fuera por lejos, el viaje no es de los que se andan. El Dorado mide
 * hoy todo a pie: un viaje así no lo sabe planear todavía, y lo dice en vez de dar unos días que no se pueden hacer.
 */
export const NO_SE_ANDA = 0.5;

/** Por qué una parada no está en ningún día: el viajero la quitó, queda lejos de las demás o no cabe en los días. */
export const MOTIVOS_DE_FUERA = ["removed", "far", "full"] as const;
