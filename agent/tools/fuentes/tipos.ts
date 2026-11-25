// Los tipos que comparten todas las fuentes. Cada enchufe traduce lo suyo a esto, y el resto del agente no sabe de
// dónde vino cada dato.

/** Lo que pide el viajero para dormir en una base. Las fechas, en AAAA-MM-DD. */
export type Estancia = {
  lat: number;
  lon: number;
  /** En metros. */
  radio: number;
  entrada: string;
  salida: string;
  adultos: number;
  /** La edad de cada niño. */
  ninos: number[];
  /** En cuántas habitaciones duerme el grupo. Lo dice el viajero. */
  habitaciones: number;
  moneda: string;
  /** El país del pasaporte del viajero, en dos letras. */
  nacionalidad: string;
  /** El país donde se busca, en dos letras. */
  pais: string;
};

/** Lo que tiene que cumplir un alojamiento para seguir adelante. */
export type Minimos = { nota: number; opiniones: number; estrellas: number };

/** De dónde sale un dato y cuándo se vio, en fecha y hora ISO. */
export type Origen = { fuente: string; visto: string };

export type Alojamiento = Origen & {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  nota: number | null;
  opiniones: number | null;
  estrellas: number | null;
  tipo: string | null;
  /**
   * Las instalaciones de las nuestras (el gimnasio, la piscina) que la fuente dice que tiene. Si la fuente no lo
   * dice en su lista, no viene: no saberlo no es no tenerlo.
   */
  declara?: string[];
};

export type Precio = Origen & {
  id: string;
  total: number;
  /** Lo que se paga aparte, en el alojamiento. */
  tasasAparte: number;
  moneda: string;
  habitacion: string | null;
  idHabitacion: string | null;
  regimen: string | null;
  cancelable: boolean | null;
  entrada: string;
  salida: string;
  adultos: number;
  /** Para cuántas habitaciones es ese total. */
  habitaciones: number;
  vendedor: string | null;
  enlace: string | null;
};

export type Habitacion = {
  id: string;
  nombre: string;
  metros: number | null;
  camas: string[];
  /** Las fotos de esta habitación, con lo que más enseña de ella por delante. */
  fotos: string[];
  vistas: string[];
};

export type Opinion = {
  fecha: string | null;
  nota: number | null;
  viajero: string | null;
  bueno: string;
  malo: string;
  de: string | null;
};

export type Detalle = Origen & {
  id: string;
  habitaciones: Habitacion[];
  /** Las fotos del alojamiento en general. No dicen de qué son. */
  fotos: string[];
  servicios: string[];
  /** Desde qué hora se entra y hasta cuál se sale, en veinticuatro horas («15:00»), la escriba como la escriba. */
  entradaDesde: string | null;
  salidaHasta: string | null;
  web: string | null;
  resumen: { tema: string; nota: number | null }[];
  contras: string[];
};

/** Lo que tiene que saber hacer una fuente de alojamiento para enchufarse. */
export type FuenteAlojamiento = {
  nombre: string;
  lista(e: Estancia, m: Minimos): Promise<Alojamiento[]>;
  precios(ids: string[], e: Estancia): Promise<Precio[]>;
  detalle(id: string): Promise<Detalle>;
  opiniones(id: string, cuantas: number): Promise<Opinion[]>;
};

/** Un alojamiento visto por zona en otra fuente, con las ofertas de cada vendedor. */
export type OfertaDeZona = Origen & {
  nombre: string;
  lat: number | null;
  lon: number | null;
  tipo: string | null;
  estrellas: number | null;
  /** La nota en niveles, tal como la da la fuente. */
  nivel: string | null;
  ofertas: {
    vendedor: string | null;
    total: number | null;
    moneda: string | null;
    cancelable: boolean | null;
    enlace: string | null;
  }[];
};

export type Vuelo = Origen & {
  origen: string;
  destino: string;
  sale: string;
  vuelve: string | null;
  aerolinea: string | null;
  numero: string | null;
  precio: number;
  /** Para cuántos viajeros es ese precio. Un precio guardado es el de un billete: uno. */
  pasajeros: number;
  moneda: string;
  escalasIda: number | null;
  escalasVuelta: number | null;
  minutos: number | null;
  /** Lo que dura la ida, en minutos, si la fuente lo dice: con ello se sabe a qué hora se llega. */
  minutosIda?: number | null;
  /**
   * Cuándo llega la ida, con la hora del destino y su desfase (ISO con desfase), si la fuente lo dice: con ello no
   * hace falta estimar la hora del destino.
   */
  llega?: string | null;
  /** Verdadero si el precio es de una búsqueda anterior de otra persona, y no de ahora. */
  guardado: boolean;
  enlace: string | null;
};

export type DiaBarato = Origen & { dia: string; precio: number; moneda: string };

/** Lo que se le pide a una fuente de vuelos: de dónde a dónde (por el código de la fuente), cuándo y cómo se ve. */
export type Trayecto = {
  origen: string;
  destino: string;
  ida: string;
  vuelta: string | null;
  moneda: string;
  mercado: string;
};

/** Un aeropuerto con vuelos, de los datos de la fuente. `rutas` es a cuántos sitios vuela sin escala: su tamaño. */
export type Aeropuerto = {
  codigo: string;
  /** El código de su ciudad: con él se piden los precios de todos los aeropuertos de esa ciudad a la vez. */
  ciudad: string;
  nombre: string;
  pais: string;
  lat: number;
  lon: number;
  rutas: number;
};

/** Una ciudad de los datos de la fuente, tenga o no aeropuerto: sirve para saber dónde está un sitio por su nombre. */
export type Ciudad = { codigo: string; nombre: string; pais: string; lat: number; lon: number };

/** Lo que sabe una fuente de vuelos de los sitios: sus aeropuertos con vuelos y sus ciudades. */
export type LugaresDeVuelo = { aeropuertos: Aeropuerto[]; ciudades: Ciudad[] };

/** Lo que tiene que saber hacer una fuente de transporte para enchufarse. */
export type FuenteTransporte = {
  nombre: string;
  lugares(): Promise<LugaresDeVuelo>;
  /** Los vuelos de un sitio a otro para unas fechas exactas. Si no tiene ninguno, una lista vacía. */
  fechas(t: Trayecto): Promise<Vuelo[]>;
  /** Los vuelos en los días de alrededor de unas fechas, con una sola petición. Si no lo sabe, no lo tiene. */
  alrededor?(t: Trayecto): Promise<Vuelo[]>;
  /**
   * El precio más barato guardado de cada día de salida de un mes (AAAA-MM) para un viaje de tantas noches, por
   * viajero, con una sola petición. Lo usa el primer vistazo. Si no lo sabe, no lo tiene.
   */
  diasBaratos?(t: Trayecto, mes: string, noches: number): Promise<DiaBarato[]>;
};

/**
 * Lo que cuesta un transporte para todos los que viajan. El alojamiento se pide ya para el grupo entero; un billete,
 * casi nunca: sumar uno solo a la habitación de todos da un total que no es de nadie. No sabe de tarifas de niño: se
 * cuenta a cada viajero como uno, y quien lo usa dice que un niño puede pagar otra cosa.
 */
export function paraElGrupo(v: Pick<Vuelo, "precio" | "pasajeros">, viajeros: number): number {
  const deUno = v.precio / (v.pasajeros > 0 ? v.pasajeros : 1);
  return Math.round(deUno * viajeros * 100) / 100;
}

/**
 * Cómo se reparte un grupo en las habitaciones que dice el viajero: los adultos, lo más parejo que se pueda, y cada
 * niño, a la habitación que va quedando con menos gente. En cada habitación duerme al menos un adulto, así que no se
 * piden más habitaciones que adultos. Es la regla de la casa para pedir precio: con quién duerme cada uno lo decide
 * después quien viaja.
 */
export function repartirEnHabitaciones(
  e: Pick<Estancia, "adultos" | "ninos" | "habitaciones">,
): { adultos: number; ninos: number[] }[] {
  const cuantas = Math.max(1, Math.min(Math.round(e.habitaciones) || 1, Math.max(1, e.adultos)));
  const reparto = Array.from({ length: cuantas }, (_, i) => ({
    adultos: Math.floor(e.adultos / cuantas) + (i < e.adultos % cuantas ? 1 : 0),
    ninos: [] as number[],
  }));
  for (const edad of e.ninos) {
    const conMenos = reparto.reduce((a, b) => (b.adultos + b.ninos.length < a.adultos + a.ninos.length ? b : a));
    conMenos.ninos.push(edad);
  }
  return reparto;
}
