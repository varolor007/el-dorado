// Las palancas: la lista fija de cambios que pueden abaratar un viaje. El que cruza las recorre todas, una a una, y
// de cada una dice si la probó, si la descarta o si no se puede probar. Las que tienen precio las pide el código a
// las fuentes; las que esperan a la búsqueda de transporte se dicen como no disponibles, con su motivo.

export type Palanca = {
  id: string;
  que: string;
  /** Verdadero si el código sabe pedir hoy su precio. */
  laPideElCodigo: boolean;
  espera: string | null;
};

export const PALANCAS: Palanca[] = [
  { id: "shift_dates", que: "las mismas noches, movidas un día o dos", laPideElCodigo: true, espera: null },
  { id: "nights", que: "una noche más o una menos", laPideElCodigo: true, espera: null },
  { id: "other_lodging", que: "otro de los alojamientos finalistas", laPideElCodigo: true, espera: null },
  { id: "other_zone", que: "dormir en otra zona de las de la ruta", laPideElCodigo: true, espera: null },
  { id: "other_airport", que: "otro aeropuerto, al salir o al llegar", laPideElCodigo: false, espera: "transport" },
  { id: "open_jaw", que: "entrar por un sitio y salir por otro", laPideElCodigo: false, espera: "transport" },
  { id: "route_order", que: "cambiar el orden de la ruta", laPideElCodigo: false, espera: "transport" },
  { id: "train_for_flight", que: "el tren en vez del vuelo", laPideElCodigo: false, espera: "transport" },
];

/** Cuánto se mueven las fechas al probar la palanca de los días, y cuántas noches de más o de menos. */
export const DIAS_QUE_SE_MUEVEN = [-2, -1, 1, 2];
export const NOCHES_QUE_SE_MUEVEN = [-1, 1];

/** Dos rondas como mucho, y tantas peticiones por ronda. */
export const RONDAS = 2;
export const PETICIONES_POR_RONDA = 6;

/** Una palanca que ahorra menos que esto no se le cuenta al viajero. */
export const AHORRO_QUE_SE_CUENTA = 10;
