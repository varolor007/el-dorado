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
  moneda: string;
  escalasIda: number | null;
  escalasVuelta: number | null;
  minutos: number | null;
  /** Verdadero si el precio es de una búsqueda anterior de otra persona, y no de ahora. */
  guardado: boolean;
  enlace: string | null;
};

export type DiaBarato = Origen & { dia: string; precio: number; moneda: string };
