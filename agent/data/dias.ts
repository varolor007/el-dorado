// El día a día, en datos: lo que puede decir el asiento que elige los sitios y los topes de un día. Los mismos
// valores que lee el asiento en su contrato; una prueba mira que digan lo mismo.

/** Lo que puede llevar una visita, en minutos. */
export const MINUTOS_DE_VISITA = [30, 45, 60, 90, 120, 180, 240];

export const RESERVAR = ["yes", "no", "unknown"];

/** Lo imprescindible es raro: como mucho, tantos por noche. */
export const IMPRESCINDIBLES_POR_NOCHE = 2;

/** Cuántos sitios de los datos abiertos se le dan a elegir al asiento. */
export const SITIOS_PARA_ELEGIR = 60;

/** Lo que cabe en un día entero, en minutos, contando las visitas y lo que se anda entre ellas. */
export const DIA_ENTERO = 600;

/** El salto más largo, en metros andados, entre dos paradas seguidas de un mismo día. */
export const SALTO_MAXIMO = 3500;
