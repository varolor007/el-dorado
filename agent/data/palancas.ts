// Las palancas: la lista fija de cambios que pueden abaratar un viaje. El que cruza las recorre todas, una a una, y
// de cada una dice si la probó, si la descarta o si no se puede probar. Las que tienen precio las pide el código a
// las fuentes; las que esperan a la búsqueda de transporte se dicen como no disponibles, con su motivo.

export type Palanca = {
  id: string;
  que: string;
  /** Lo mismo, como lo lee el asiento. */
  what: string;
  /** Verdadero si el código sabe pedir hoy su precio. */
  laPideElCodigo: boolean;
  espera: string | null;
};

const pide = (id: string, que: string, what: string): Palanca => ({
  id,
  que,
  what,
  laPideElCodigo: true,
  espera: null,
});
const espera = (id: string, que: string, what: string): Palanca => ({
  id,
  que,
  what,
  laPideElCodigo: false,
  espera: "the transport search",
});

export const PALANCAS: Palanca[] = [
  pide("shift_dates", "las mismas noches, movidas un día o dos", "the same nights, moved a day or two"),
  pide("nights", "una noche más o una menos", "one night more or one night less"),
  pide("other_lodging", "otro de los alojamientos finalistas", "another of the lodgings in the table"),
  pide("other_zone", "dormir en otra zona de las de la ruta", "sleeping in another zone of the route"),
  espera("other_airport", "otro aeropuerto, al salir o al llegar", "another airport, to leave from or to arrive at"),
  espera("open_jaw", "entrar por un sitio y salir por otro", "arriving at one place and leaving from another"),
  espera("route_order", "cambiar el orden de la ruta", "changing the order of the route"),
  espera("train_for_flight", "el tren en vez del vuelo", "the train instead of the flight"),
];

/** Las palancas que pueden distinguir a la manera distinta: las que cambian una fila por otra de las mismas fechas. */
export const PALANCAS_DE_UNA_MANERA = ["other_lodging", "other_zone"];

/** Lo que el asiento que cruza puede pedir para otra ronda: cuántos días se pueden mover y cuántas noches cambiar. */
export const SE_PUEDE_PEDIR = { shift_dates: [-3, -2, -1, 1, 2, 3], nights: [-1, 1] };

/** Cuántas palancas se le cuentan al viajero, como mucho. */
export const PALANCAS_QUE_SE_CUENTAN = 4;

/** Cuánto se mueven las fechas al probar la palanca de los días, y cuántas noches de más o de menos. */
export const DIAS_QUE_SE_MUEVEN = [-2, -1, 1, 2];
export const NOCHES_QUE_SE_MUEVEN = [-1, 1];

/** Dos rondas como mucho, y tantas peticiones por ronda. */
export const RONDAS = 2;
export const PETICIONES_POR_RONDA = 6;

/**
 * Una palanca que ahorra menos que esta parte del total del que sale no se le cuenta al viajero. Va en proporción y
 * no en dinero, porque diez no es lo mismo en una moneda que en otra ni en un viaje que en otro.
 */
export const AHORRO_QUE_SE_CUENTA = 0.01;
