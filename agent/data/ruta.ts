// La ruta, en datos: lo que puede medir una zona donde buscar alojamiento y los topes del asiento de la ruta. Los
// mismos valores que lee el asiento en su contrato; una prueba mira que digan lo mismo.

/** Los radios que puede tener una zona, en metros. */
export const RADIOS = [500, 800, 1200, 1500, 2000, 3000];

export const ZONAS_POR_BASE = 3;
export const ANCLAS_POR_ZONA = 3;
export const CERCA_POR_ZONA = 8;

/** Con más de una base, cada una lleva al menos estas noches. */
export const NOCHES_POR_BASE = 2;

export const MEDIOS = ["train", "bus", "car", "ferry", "flight"];

/** Cuántos sitios de los datos abiertos se le dan al asiento de la ruta. */
export const LUGARES_PARA_LA_RUTA = 60;
