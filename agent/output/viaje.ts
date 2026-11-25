// La forma del viaje para la web: lo que la casa le entrega a la web y lo que le cuenta en vivo. Es el contrato entre
// las dos. La web se construye contra él y el agente tiene que producirlo. Aquí no hay cuentas ni búsquedas: solo la
// forma, y lo que el código puede comprobar de ella antes de enseñarla.

import {
  CLASES_DE_AVISO,
  LETRAS_DE_UN_NOMBRE_DE_FUERA,
  TEMAS_DEL_CALENDARIO,
  type ClaseDeAviso,
  type TemaDelCalendario,
} from "../data/calendario.ts";
import { MOTIVOS_DE_FUERA } from "../data/dias.ts";
import { DUDAS, ESTADOS_DE_PAPEL, LADOS, PREGUNTAS, type EstadoDePapel } from "../data/papeles.ts";
import { avisosDe } from "../data/palabras.ts";
import { pegasDelTexto } from "../gates/textos.ts";
import { CASILLAS_POR_VIAJE } from "../data/moverse.ts";
import { DIAS_ALREDEDOR } from "../data/transporte.ts";
import { enlaceSinClaves } from "../tools/enlaces.ts";
import { pegasDeLasCapas, type DeLasEntradas, type DeMoverse, type DelDestino, type Presupuesto } from "./capas.ts";

// Las capas del destino (bloque 14): su forma en el viaje va en su propio archivo, y se exporta también desde aquí.
export * from "./capas.ts";

export type Punto = { lat: number; lon: number };

/** El trozo de mapa que encuadra un destino. */
export type Encuadre = { oeste: number; sur: number; este: number; norte: number };

/** Una foto que no es nuestra: siempre con su autor, su licencia y la página de donde sale. */
export type Foto = { url: string; autor: string | null; licencia: string | null; pagina: string | null };

/** De dónde sale un dato, cuándo se vio y dónde se puede ver. */
export type Origen = { fuente: string; visto: string; enlace: string | null };

export type Precio = { total: number; moneda: string; vendedor: string | null; visto: string; enlace: string | null };

/** Un sitio que ver. Lo elige el del día a día; en qué día cae lo decide el código. */
export type Parada = {
  id: string;
  nombre: string;
  /** Qué es, en una palabra de las de `data/sitios.ts`: museum, castle, worship, viewpoint, nature, park, landmark. */
  clase: string;
  punto: Punto;
  /** Por qué ir, en el idioma del viajero. */
  porQue: string;
  /** Lo que lleva verlo. */
  minutos: number;
  imprescindible: boolean;
  foto: Foto | null;
  origen: Origen;
  /** A qué hora conviene: morning, afternoon, evening o any. Si no se dice, da igual. */
  mejorHora?: string;
  /** Verdadero si hay que reservar con tiempo; falso si no; si no se sabe, no se dice. */
  reservar?: boolean;
};

/** Lo que hay de un punto a otro por una manera de ir, como lo dio la fuente de rutas. */
export type Tramo = { metros: number; minutos: number };

/** Un camino de la tabla: de dónde, a dónde y lo que dio la fuente a pie y en coche, sin tráfico. */
export type CaminoGuardado = { de: Punto; a: Punto; aPie?: Tramo; enCoche?: Tramo };

/**
 * La tabla de caminos de un viaje: lo que la fuente de rutas dijo que hay entre sus puntos, de qué fuente y cuándo.
 * Lo que no está en ella se mide con la cuenta de la casa, que es aproximada.
 */
export type TablaDeCaminos = { fuente: string; visto: string; caminos: CaminoGuardado[] };

/** Un día: sus paradas, en orden, y lo que se anda de cada una a la siguiente. */
export type Dia = { fecha: string; titulo: string; paradas: string[]; metros: number[] };

/** De dónde sale el nivel de un rasgo: de una foto, de las opiniones o de la ficha de la fuente. */
export const PRUEBAS = ["photo", "review", "sheet"] as const;

/**
 * Un rasgo de cómo es un alojamiento: el nivel que puso el que mira y de qué clase es su prueba; si es una foto, cuál.
 * Aquí no viaja ninguna frase del asiento: la web dice el campo, el nivel y la prueba en el idioma del viajero.
 */
export type Rasgo = { campo: string; nivel: string; prueba: (typeof PRUEBAS)[number] | null; foto: string | null };

/** Lo que dicen las opiniones de un tema: para bien, para mal o de todo, y en cuántas. Todo, por su clave. */
export type Dicho = { tema: string; tono: string; menciones: string };

/** Lo que la casa no pudo saber de un alojamiento, por su clave: la frase la pone la web. */
export const AVISOS_DE_FICHA = ["no_detail", "room_unknown", "no_room_photos", "no_reviews"] as const;
export type AvisoDeFicha = (typeof AVISOS_DE_FICHA)[number];

export type Alojamiento = {
  id: string;
  nombre: string;
  punto: Punto;
  estrellas: number | null;
  nota: number | null;
  opiniones: number | null;
  /** La habitación de ese precio. */
  habitacion: string | null;
  metros: number | null;
  precio: Precio;
  /** Lo que piden otros vendedores por las mismas noches. */
  otrasOfertas: Precio[];
  /** Sus fotos: primero las de la habitación de ese precio y después las del alojamiento. */
  fotos: string[];
  /** Cuántas de las primeras son de la habitación de ese precio. Si es cero, lo que se ve no es esa habitación. */
  fotosDeHabitacion: number;
  comoEs: Rasgo[];
  /** Lo que se dice de él en las opiniones, por temas. */
  seDice: Dicho[];
  avisos: AvisoDeFicha[];
  /** La zona de la ruta en la que está, por su nombre. */
  zona?: string | null;
  /**
   * La mitad de las paradas del viaje queda a estos minutos, o menos: andando si `aPie`; si no, en coche o en
   * transporte, y entonces son aproximados.
   */
  andando?: number | null;
  /** Falso si este viaje no se anda desde donde se duerme: entonces los minutos son de coger algo. */
  aPie?: boolean;
  /** Nuestra nota, de 0 a 10: la zona, cómo es, las opiniones y las condiciones. */
  puntos?: number | null;
  /** Si una criba lo descarta para este viajero, por qué: la frase la monta la web. */
  descartado?: { clase: string; cosa: string; detalle: string } | null;
};

/** En qué se llega: las clases de transporte que sabe decir la web. */
export const TRANSPORTES = ["flight", "train", "bus", "car"] as const;

export type Transporte = {
  id: string;
  clase: (typeof TRANSPORTES)[number];
  de: string;
  a: string;
  sale: string;
  vuelve: string | null;
  escalas: number | null;
  precio: Precio;
  /** Verdadero si el precio es de una búsqueda de hace días, y no de ahora. */
  guardado: boolean;
};

export const MANERAS = ["cheapest", "best_value", "different"] as const;

/** Una manera de hacer el viaje: dónde duermes y cómo llegas. Los días son los mismos en las tres. */
export type Manera = {
  id: (typeof MANERAS)[number];
  alojamiento: string;
  transporte: string | null;
  total: number;
  moneda: string;
  gana: string;
  pierde: string;
  /** Por qué es esta manera, en una frase. */
  porQue?: string;
};

/** Lo que ahorra un cambio: un día antes, otro hotel, otra zona. La resta la hace el código. */
export type Palanca = { id: string; clase: string; ahorra: number; moneda: string; que: string; aCambio: string };

/** El primer vistazo: lo que se sabe en segundos y sin IA. */
export type Vistazo = {
  devueltos: number;
  pasan: number;
  conPrecio: number;
  desde: number | null;
  moneda: string;
  /** Los mínimos con los que se buscó: los de partida o, donde hay poco, los del escalón al que hubo que bajar. */
  minimos: { nota: number; opiniones: number; estrellas: number };
  /** Verdadero si con los mínimos de partida no había bastantes y hubo que bajarlos. */
  bajados: boolean;
  /** Verdadero si en las zonas de la ruta no había con qué elegir y se buscó más lejos. */
  ensanchado: boolean;
  puntos: { punto: Punto; precio: number | null }[];
  /**
   * Lo mismo, zona a zona, en el primer vistazo de antes de investigar: la caja del destino partida en trozos, y el
   * punto de cada uno, en medio de lo que tiene. El de un viaje hecho no lo lleva: sus zonas son las de la ruta.
   */
  zonas?: ZonaDelVistazo[];
  /** A cuántos de los que pasan se les pidió precio: en el primer vistazo, no a todos. */
  mirados?: number;
  /** Verdadero si algo no llegó a tiempo (los precios): lo que se dice es lo que hubo. */
  aMedias?: boolean;
  /** Los días baratos para volar ese mes, si se sabe de dónde se sale; null si no se sabe o no hay. */
  vuelos?: DiasParaVolar | null;
};

export type ZonaDelVistazo = {
  id: string;
  punto: Punto;
  devueltos: number;
  pasan: number;
  conPrecio: number;
  desde: number | null;
};

/**
 * El precio más barato visto para cada día de salida de un mes, para un viaje de tantas noches, por billete y por
 * viajero. Es un precio guardado de búsquedas de otros, de hace días: no es el de ahora.
 */
export type DiasParaVolar = {
  /** Los códigos del par principal de la búsqueda de transporte: el de su ciudad, o el aeropuerto que se dijo. */
  origen: string;
  destino: string;
  /** Sus nombres, como los da la fuente. Un vistazo de antes no los trae. */
  nombres?: { origen: string; destino: string };
  /** AAAA-MM. */
  mes: string;
  noches: number;
  moneda: string;
  fuente: string;
  visto: string;
  dias: { dia: string; precio: number }[];
};

/**
 * Un aviso de las fechas, como lo enseña la web: su clase y su tema por su clave, el nombre propio que da su fuente
 * (una fiesta, un evento) si lo tiene, sus días y los del viaje que toca, y la página de donde sale con la fecha que
 * da. Ninguna frase del del calendario: la única que viaja es la del que explica, que pasó la puerta 7.
 */
export type AvisoDeFechas = {
  clase: ClaseDeAviso;
  tema: TemaDelCalendario;
  nombre: string | null;
  desde: string | null;
  hasta: string | null;
  /** Los días del viaje que toca, de la entrada a la salida, en orden: los cuenta el código. */
  dias: string[];
  /** Los días que pide el destino, y cuántos de más (o de menos, si es negativo) tiene el viaje. */
  pide?: { dias: number; deMas: number };
  precio: { importe: number; moneda: string } | null;
  fuente: string;
  visto: string | null;
  /**
   * Lo que es y lo que le cambia el viaje esos días, en el idioma del viajero: lo escribe el que explica y pasa la
   * puerta 7. Un viaje de antes, o uno cuyo explicador no lo contó, no la trae.
   */
  frase?: string;
};

/**
 * Otras fechas, para quien puede moverlas: las mismas noches, movidas tantos días (negativo, antes). Lo que evita,
 * alcanza, pierde y en lo que entra son posiciones en los avisos, y lo cuenta el código con sus días.
 */
export type VentanaDeFechas = {
  entrada: string;
  salida: string;
  seMueve: number;
  porQue: number[];
  evita: number[];
  alcanza: number[];
  pierde: number[];
  entra: number[];
  /** Lo que gana y lo que pierde, en el idioma del viajero: del que explica, como la de cada aviso. */
  frase?: string;
};

/** Por qué faltan los avisos de las fechas: el asiento falló o no llegó, o lo que entregó no pasó su puerta. */
export const FALTAS_DEL_CALENDARIO = ["failed", "rejected"] as const;

/** Los avisos de las fechas de un viaje: lo que encontró el del calendario, o por qué falta. */
export type DelCalendario = {
  avisos: AvisoDeFechas[];
  ventanas: VentanaDeFechas[];
  falta: (typeof FALTAS_DEL_CALENDARIO)[number] | null;
};

/** Una fila de la tabla de los papeles: un pasaporte, una edad (null si es adulto) y cuántos viajan así. Sin nombre. */
export type FilaDePapeles = { pasaporte: string; edad: number | null; cuantos: number };

/**
 * Una casilla de la tabla de los papeles, como la enseña la web: de qué fila (su posición), qué país y qué pregunta,
 * por sus claves; su estado, sus fuentes con su lado y su fecha, y los plazos que cuenta el código: hasta cuándo
 * tiene que valer el pasaporte y antes de qué día hay que hacer algo (y si ese día ya pasó). Ninguna frase del asiento.
 */
export type CasillaDePapel = {
  viajero: number;
  pais: string;
  pregunta: (typeof PREGUNTAS)[number];
  estado: EstadoDePapel;
  duda: (typeof DUDAS)[number] | null;
  fuentes: { url: string; lado: (typeof LADOS)[number]; estado: Exclude<EstadoDePapel, "doubtful">; visto: string }[];
  hasta: string | null;
  antesDe: string | null;
  tarde: boolean;
  coste: { importe: number; moneda: string } | null;
};

/**
 * Lo que no se pregunta, y por qué: lo de menores a un adulto, la escala hasta que se sepa el transporte, y nada a
 * quien viaja por el país de su propio pasaporte.
 */
export const NO_PREGUNTADO = ["no_minors", "transit_unknown", "own_country"] as const;

/**
 * La tabla de los papeles de un viaje (puerta 2): sus filas, sus casillas, lo que no se pregunta, si algo bloquea, por
 * qué falta si falta, y si el viajero decidió seguir igual.
 */
export type DeLosPapeles = {
  viajeros: FilaDePapeles[];
  casillas: CasillaDePapel[];
  fuera: { viajero: number; pregunta: (typeof PREGUNTAS)[number]; porQue: (typeof NO_PREGUNTADO)[number] }[];
  bloquea: boolean;
  falta: "failed" | "rejected" | null;
  sigue: boolean;
};

/** Las piezas que se reservan de un viaje cerrado: dónde se duerme y cómo se llega. */
export const PIEZAS = ["lodging", "transport"] as const;
export type ClaseDePieza = (typeof PIEZAS)[number];

/**
 * Cómo está el precio de hoy de una pieza frente al que se vio: igual, sube o baja (la fuente lo dio hoy), ya no está
 * (la fuente contestó y no lo tiene) o no se sabe (no se le pudo preguntar).
 */
export const CAMBIOS_DE_PRECIO = ["same", "up", "down", "gone", "unknown"] as const;
export type CambioDePrecio = (typeof CAMBIOS_DE_PRECIO)[number];

/** La edad de un precio al cerrar: visto ahora, guardado de hace días dentro de su edad, o caducado. */
export const EDADES_DE_UN_PRECIO = ["now", "saved", "stale"] as const;
export type EdadDeUnPrecio = (typeof EDADES_DE_UN_PRECIO)[number];

/** El precio de hoy de una pieza: el que se vio, el de hoy si lo hay, y lo que ha cambiado, que cuenta el código. */
export type PrecioDeHoy = {
  pieza: ClaseDePieza;
  /** El identificador de la pieza en el viaje: el de su alojamiento o el de su transporte. */
  ref: string;
  antes: Precio;
  hoy: Precio | null;
  cambio: CambioDePrecio;
  /** El de hoy menos el que se vio, en su moneda; null si no hay de hoy. */
  diferencia: number | null;
  /** La edad del de hoy; null si no hay. */
  edad: EdadDeUnPrecio | null;
  /** Si se puede cancelar, según la fuente hoy; null si no lo dice. */
  cancelable: boolean | null;
  /** Para qué noches dio la fuente el precio de hoy, si lo dice. */
  noches: { entrada: string; salida: string } | null;
  /**
   * Si el precio de hoy de un alojamiento es de la misma habitación que se miró: la fuente da hoy lo más barato que
   * tiene, que puede ser otra. Null en lo que no es un alojamiento o no tiene precio de hoy.
   */
  habitacion: HabitacionDeHoy | null;
};

/** La habitación del precio de hoy frente a la que se miró: la misma, otra, o no se sabe (falta un nombre). */
export const HABITACION_DE_HOY = ["same", "other", "unknown"] as const;
export type HabitacionDeHoy = (typeof HABITACION_DE_HOY)[number];

/**
 * Qué es un enlace de reserva: la página donde se vio ese precio, la búsqueda en la web de la fuente con las fechas
 * ya puestas, o la web del propio alojamiento, que no es donde se vio el precio.
 */
export const CLASES_DE_ENLACE = ["where_priced", "other_seller", "search", "own_site"] as const;
/** Lo que se supo de un enlace al cerrar: responde, no se pudo saber (la web no deja mirar) o no responde. */
export const COMPROBACIONES_DE_ENLACE = ["ok", "unchecked", "down"] as const;
export type ComprobacionDeEnlace = (typeof COMPROBACIONES_DE_ENLACE)[number];

export type EnlaceDeReserva = {
  pieza: ClaseDePieza;
  ref: string;
  clase: (typeof CLASES_DE_ENLACE)[number];
  url: string;
  /** Quién vende en esa página, si se sabe. */
  vendedor: string | null;
  /** El precio que se vio en esa página, si es de otro vendedor; null si es el de la pieza o no lo hay. */
  precio: { total: number; moneda: string } | null;
  comprobado: ComprobacionDeEnlace;
};

/** Por qué va una reserva en su sitio del orden: lo que no se cancela, lo que se mueve de precio, lo que se agota. */
export const RAZONES_DEL_ORDEN = [
  "not_cancellable",
  "cancel_unknown",
  "saved_price",
  "price_moves",
  "cancellable",
  "book_ahead",
] as const;
export type RazonDelOrden = (typeof RAZONES_DEL_ORDEN)[number];

/** Una reserva, en su orden: de qué pieza o de qué parada (si se reserva con tiempo) y por qué ahí. */
export type Reserva = {
  n: number;
  que: ClaseDePieza | "sight";
  ref: string;
  porQue: RazonDelOrden[];
  /**
   * De una parada que hay que reservar, su enlace a las entradas (14.7): la página donde se reserva, si la dijo el de
   * las entradas, o si no su web oficial; con lo que se supo de él al cerrar. Lo demás no lo lleva.
   */
  enlace?: { url: string; clase: "booking" | "official_site"; comprobado: ComprobacionDeEnlace };
  /** Lo que conviene saber de ella, en el idioma del viajero: del que explica, y pasó la puerta 7. */
  frase?: string;
};

/** Un papel con plazo: de qué casilla de la tabla, para cuándo tiene que estar y si ese día ya pasó. */
export type PlazoDePapel = {
  casilla: number;
  pais: string;
  pregunta: (typeof PREGUNTAS)[number];
  antesDe: string;
  tarde: boolean;
  frase?: string;
};

/** Lo que queda sin confirmar al cerrar, por su clave: la frase la pone la web. */
export const SIN_CONFIRMAR = [
  "price_gone",
  "price_unknown",
  "price_stale",
  "saved_price",
  "cancel_unknown",
  "other_room",
  "arrival_unknown",
  "arrival_off",
  "no_link",
  "link_down",
  "link_unchecked",
  "papers_doubtful",
  "papers_late",
  "day_does_not_fit",
  "stop_closed",
] as const;
export type SinConfirmar = { que: (typeof SIN_CONFIRMAR)[number]; ref: string | null };

/**
 * La hora de llegada frente a la entrada al alojamiento: cuadra, se llega horas antes (esperar a la habitación),
 * se llega al día siguiente (una noche sin usar) o el día de antes (una noche sin cama), no se sabe por la hora del
 * destino, o no se puede decir porque no hay transporte, no hay horas o no se sabe desde cuándo se entra.
 */
export const LLEGADAS = [
  "ok",
  "early",
  "next_day",
  "day_before",
  "unsure",
  "no_transport",
  "no_hours",
  "no_check_in",
] as const;
export type Llegada = (typeof LLEGADAS)[number];

/** Por qué un viaje cerrado no lleva las frases del que explica: no hay IA, falló, o lo que escribió no pasó. */
export const SIN_FRASES = ["no_ai", "failed", "rejected"] as const;

/**
 * El viaje cerrado: con qué manera, los precios de ese día, el orden de las reservas, los plazos de los papeles, lo
 * que queda sin confirmar y los enlaces. Todo por claves y números: la única frase es la del que explica.
 */
export type Cierre = {
  /** Cuándo se cerró: la hora con la que se miden las edades de los precios. */
  cuando: string;
  /** La versión del viaje que se cerró. */
  version: number;
  manera: (typeof MANERAS)[number];
  alojamiento: string;
  transporte: string | null;
  moneda: string;
  /** El total de la manera como se vio, y el de hoy; null si alguna pieza no tiene precio de hoy. */
  total: { antes: number; hoy: number | null };
  precios: PrecioDeHoy[];
  /** Si el cambio de precio pidió el sí del viajero, y si lo dio. */
  subida: { pide: boolean; sigue: boolean };
  enlaces: EnlaceDeReserva[];
  /** Los enlaces a Google Maps: donde se duerme, cada parada y cada día. */
  mapas: { alojamiento: string; paradas: Record<string, string>; dias: { fecha: string; url: string | null }[] };
  reservas: Reserva[];
  papeles: PlazoDePapel[];
  sinConfirmar: SinConfirmar[];
  llegada: Llegada;
  /** Desde qué hora se entra al alojamiento, si la fuente lo dice (HH:MM). */
  entradaDesde: string | null;
  /** Lo que no se sabe, en el idioma del viajero: del que explica. Solo si lleva sus frases. */
  dudas?: string[];
  sinFrases: (typeof SIN_FRASES)[number] | null;
};

export const RITMOS = ["calm", "normal", "full"] as const;
export type Ritmo = (typeof RITMOS)[number];

export type Viaje = {
  id: string;
  version: number;
  /** Verdadero si alguna parte está hecha a mano, de muestra, y no por el agente. */
  muestra: boolean;
  idioma: string;
  destino: { nombre: string; pais: string; punto: Punto; encuadre: Encuadre };
  entrada: string;
  salida: string;
  adultos: number;
  ninos: number[];
  /** En cuántas habitaciones duerme el grupo: lo dijo el viajero, y los precios son para esas. */
  habitaciones: number;
  ritmo: Ritmo;
  paradas: Parada[];
  dias: Dia[];
  /** Las paradas que no caben con este ritmo: se quedan fuera, a mano para añadirlas. */
  fuera: string[];
  /** Por qué se queda fuera cada una: la quitó el viajero, queda lejos de las demás o los días están llenos. */
  porQueFuera: Record<string, (typeof MOTIVOS_DE_FUERA)[number]>;
  alojamientos: Alojamiento[];
  transportes: Transporte[];
  /**
   * Si las fechas del viaje no tienen precio de transporte y un día de al lado sí (hasta tres antes o después), el
   * más barato de esos. Se ofrece: no está en ninguna manera ni en ningún total. Un viaje de antes no lo trae.
   */
  transporteAlLado?: Transporte;
  maneras: Manera[];
  palancas: Palanca[];
  avisos: string[];
  vistazo: Vistazo | null;
  /**
   * La tabla de caminos, si la fuente de rutas contestó: con ella reparte la web los días y dice cada trayecto con los
   * mismos números que la casa. Un viaje de antes, o sin la fuente, no la trae.
   */
  caminos?: TablaDeCaminos;
  /** Los avisos de las fechas, del del calendario, o por qué faltan. Un viaje de antes no los trae. */
  calendario?: DelCalendario;
  /** La tabla de los papeles, con sus fuentes y sus plazos, o por qué falta. Un viaje de antes no la trae. */
  papeles?: DeLosPapeles;
  /** Cómo moverse allí y lo que cuesta, o por qué falta (14.2). Un viaje de antes no lo trae. */
  moverse?: DeMoverse;
  /** Lo que conviene saber del destino, o por qué falta (14.3). Un viaje de antes no lo trae. */
  saber?: DelDestino;
  /** Lo que cuesta y cuándo abre cada sitio elegido, o por qué falta (14.4). Un viaje de antes no lo trae. */
  entradas?: DeLasEntradas;
  /** El presupuesto entero, por manera, con de dónde sale cada parte (14.5). Un viaje de antes no lo trae. */
  presupuesto?: Presupuesto;
  /** El viaje cerrado: los precios de ese día, el orden y los enlaces. Solo la versión cerrada lo lleva. */
  cierre?: Cierre;
};

/** Lo que la casa cuenta en vivo. Solo datos: la frase la monta la web, en el idioma de quien mira. */
export const SUCESOS = [
  "zone",
  "lodgings_found",
  "lodgings_pass",
  "lodgings_priced",
  "finalist",
  "looking",
  "looked",
  "sights_found",
  "sight",
  "day",
  "way",
  "lever",
  "done",
  // La investigación se paró: `ref` dice en qué paso. El porqué no viaja a la web.
  "stopped",
  // El conductor mira una parada: `ref` es `looking` mientras mira, `retry` si da una vuelta más a ese paso y `told`
  // si lo cuenta.
  "conductor",
  // El viajero pidió otra vuelta del paso que paró la investigación: `ref` dice el paso, y `n`, cuál de sus
  // pulsaciones es. Una parada que venga después lleva ese mismo `n`.
  "retry",
  // Lo que encontraron las capas del destino (14.6): `n` cosas de cómo moverse, de lo que conviene saber y sitios con
  // su entrada o su horario. Solo el número: lo encontrado se ve en el viaje.
  "ways_around",
  "good_to_know",
  "tickets_known",
] as const;

export type Suceso = {
  /** Milisegundos desde que empezó la investigación. */
  t: number;
  clase: (typeof SUCESOS)[number];
  punto?: Punto;
  /** En metros. */
  radio?: number;
  n?: number;
  /** A qué se refiere: el identificador de un alojamiento, de una parada, de una manera o de una palanca. */
  ref?: string;
  nombre?: string;
  puntos?: Punto[];
};

export type Pega = { donde: string; que: string };

const fecha = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const enElMapa = (p: Punto): boolean =>
  Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

function repetidos(ids: string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

function pegasDelPrecio(p: Precio, donde: string): Pega[] {
  const pegas: Pega[] = [];
  if (!(p.total > 0)) pegas.push({ donde, que: "el precio no es un importe" });
  if (!/^[A-Z]{3}$/.test(p.moneda)) pegas.push({ donde, que: "el precio no dice su moneda" });
  if (Number.isNaN(Date.parse(p.visto))) pegas.push({ donde, que: "el precio no dice cuándo se vio" });
  // El enlace lo pone una fuente y la web lo abre: solo una dirección https, sin usuario ni clave dentro. Lo mira
  // ya el enchufe al leerlo; aquí se repite, porque esta es la última puerta antes de la web.
  if (p.enlace !== null) {
    let u: URL | null = null;
    try {
      u = new URL(p.enlace);
    } catch {
      // No es una dirección: se queda en null, y es una pega.
    }
    if (u === null || u.protocol !== "https:" || u.username !== "" || u.password !== "")
      pegas.push({ donde, que: "el enlace del precio no es una dirección https sin claves" });
  }
  return pegas;
}

/** Lo que se comprueba de una tabla de caminos: su fuente, su fecha, su tamaño y que cada camino sea de verdad. */
function pegasDeLosCaminos(t: TablaDeCaminos): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });
  if (typeof t.fuente !== "string" || t.fuente.trim() === "" || Number.isNaN(Date.parse(t.visto)))
    pega("caminos", "no dice de qué fuente sale ni cuándo");
  if (!Array.isArray(t.caminos)) return [...pegas, { donde: "caminos", que: "no es una lista" }];
  if (t.caminos.length > CASILLAS_POR_VIAJE) pega("caminos", `trae más de ${CASILLAS_POR_VIAJE} caminos`);
  const tramo = (x: Tramo | undefined): boolean =>
    x === undefined || (Number.isFinite(x.metros) && x.metros >= 0 && Number.isFinite(x.minutos) && x.minutos > 0);
  const vistos = new Set<string>();
  t.caminos.forEach((c, i) => {
    const donde = `caminos[${i}]`;
    if (!enElMapa(c.de) || !enElMapa(c.a)) return pega(donde, "un punto no está en el mapa");
    const par = `${c.de.lat.toFixed(5)},${c.de.lon.toFixed(5)}>${c.a.lat.toFixed(5)},${c.a.lon.toFixed(5)}`;
    if (vistos.has(par)) pega(donde, "el camino sale dos veces");
    vistos.add(par);
    if (c.aPie === undefined && c.enCoche === undefined) pega(donde, "no dice ni a pie ni en coche");
    if (!tramo(c.aPie) || !tramo(c.enCoche)) pega(donde, "unos metros o unos minutos no son un número");
  });
  return pegas;
}

/** Una dirección que la web puede abrir: https, sin usuario ni clave dentro. */
function enlaceQueVale(texto: unknown): boolean {
  if (typeof texto !== "string") return false;
  try {
    const u = new URL(texto);
    return u.protocol === "https:" && u.username === "" && u.password === "";
  } catch {
    return false;
  }
}

/** Lo que se comprueba de los avisos de las fechas: cada uno por sus claves, con su fuente, y cada ventana bien. */
export function pegasDelCalendario(c: DelCalendario, entrada: string, salida: string): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });
  /** Una frase del que explica: un texto para el viajero, corto, en una línea y sin enlaces ni promesas. */
  const pegasDeLaFrase = (frase: unknown, donde: string): void => {
    if (typeof frase !== "string" || frase.trim() === "") return pega(donde, "su frase no es un texto");
    for (const que of pegasDelTexto(frase, { sinNumerosLargos: true })) pega(donde, `su frase ${que}`);
  };
  if (c.falta !== null && !FALTAS_DEL_CALENDARIO.includes(c.falta)) pega("calendario", "no dice por qué falta");
  if (!Array.isArray(c.avisos) || !Array.isArray(c.ventanas))
    return [...pegas, { donde: "calendario", que: "no es una lista" }];
  c.avisos.forEach((a, i) => {
    const donde = `calendario.avisos[${i}]`;
    if (!CLASES_DE_AVISO.includes(a.clase) || !TEMAS_DEL_CALENDARIO.includes(a.tema))
      pega(donde, "su clase o su tema no son de su lista");
    if (
      a.nombre !== null &&
      (typeof a.nombre !== "string" ||
        a.nombre.trim() === "" ||
        a.nombre.length > LETRAS_DE_UN_NOMBRE_DE_FUERA ||
        /[\u0000-\u001f<>]|https?:/i.test(a.nombre))
    )
      pega(donde, "su nombre no es un nombre corto");
    if (!enlaceQueVale(a.fuente)) pega(donde, "su fuente no es una dirección https sin claves");
    if (a.visto !== null && !fecha(a.visto)) pega(donde, "la fecha de su fuente no es una fecha");
    if (
      (a.desde === null) !== (a.hasta === null) ||
      (a.desde !== null && !(fecha(a.desde) && fecha(a.hasta!) && a.desde <= a.hasta!))
    )
      pega(donde, "sus días no van de una fecha a otra");
    if (!a.dias.every((d) => fecha(d) && d >= entrada && d <= salida)) pega(donde, "toca días que no son del viaje");
    if (a.precio !== null && !(a.precio.importe > 0 && /^[A-Z]{3}$/.test(a.precio.moneda)))
      pega(donde, "su precio no es un importe con su moneda");
    if (a.frase !== undefined) pegasDeLaFrase(a.frase, donde);
  });
  const hay = (xs: number[]): boolean => xs.every((n) => Number.isInteger(n) && n >= 0 && n < c.avisos.length);
  c.ventanas.forEach((v, i) => {
    const donde = `calendario.ventanas[${i}]`;
    if (!fecha(v.entrada) || !fecha(v.salida) || v.salida <= v.entrada) pega(donde, "sus fechas no van en orden");
    if (!Number.isInteger(v.seMueve) || v.seMueve === 0) pega(donde, "no dice cuántos días se mueve");
    if (![v.porQue, v.evita, v.alcanza, v.pierde, v.entra].every(hay)) pega(donde, "cita un aviso que no existe");
    if (v.evita.length === 0 && v.alcanza.length === 0) pega(donde, "una ventana que no mejora nada no se enseña");
    if (v.frase !== undefined) pegasDeLaFrase(v.frase, donde);
  });
  // Las frases van todas o ninguna: las escribió el que explica, una por aviso y una por ventana.
  const conFrase = [...c.avisos, ...c.ventanas].filter((x) => x.frase !== undefined).length;
  if (conFrase > 0 && conFrase !== c.avisos.length + c.ventanas.length)
    pega("calendario", "unos avisos llevan su frase y otros no");
  if (conFrase > 0 && c.falta !== null) pega("calendario", "faltan los avisos, y aun así lleva frases");
  return pegas;
}

/** Lo que se comprueba de la tabla de los papeles: cada casilla por sus claves, con fuentes https y sus fechas. */
export function pegasDeLosPapeles(p: DeLosPapeles): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });
  if (!Array.isArray(p.viajeros) || !Array.isArray(p.casillas) || !Array.isArray(p.fuera))
    return [{ donde: "papeles", que: "no es una tabla" }];
  if (p.falta !== null && p.falta !== "failed" && p.falta !== "rejected") pega("papeles", "no dice por qué falta");
  p.viajeros.forEach((f, i) => {
    if (!/^[A-Z]{2}$/.test(f.pasaporte) || !(Number.isInteger(f.cuantos) && f.cuantos > 0))
      pega(`papeles.viajeros[${i}]`, "no es un pasaporte con cuántos viajan con él");
    if (f.edad !== null && !(Number.isInteger(f.edad) && f.edad >= 0 && f.edad < 18))
      pega(`papeles.viajeros[${i}]`, "la edad de un menor no es la de un menor");
  });
  const fila = (n: number): boolean => Number.isInteger(n) && n >= 0 && n < p.viajeros.length;
  p.casillas.forEach((c, i) => {
    const donde = `papeles.casillas[${i}]`;
    if (!fila(c.viajero) || !/^[A-Z]{2}$/.test(c.pais) || !PREGUNTAS.includes(c.pregunta))
      pega(donde, "no dice de qué viajero, país o pregunta es");
    if (!ESTADOS_DE_PAPEL.includes(c.estado)) pega(donde, "su estado no es de su lista");
    if ((c.estado === "doubtful") !== (c.duda !== null) || (c.duda !== null && !DUDAS.includes(c.duda)))
      pega(donde, "lo dudoso no dice por qué, o lo dice lo que no es dudoso");
    for (const f of c.fuentes)
      if (!enlaceQueVale(f.url) || !LADOS.includes(f.lado) || !fecha(f.visto))
        pega(donde, "una fuente no es una dirección https con su lado y su fecha");
    if (c.estado !== "doubtful" && c.fuentes.length === 0) pega(donde, "lo que no es dudoso lleva su fuente");
    if ((c.hasta !== null && !fecha(c.hasta)) || (c.antesDe !== null && !fecha(c.antesDe)))
      pega(donde, "un plazo no es una fecha");
    if (c.tarde && c.antesDe === null) pega(donde, "dice que llega tarde sin un plazo");
    if (c.coste !== null && !(c.coste.importe > 0 && /^[A-Z]{3}$/.test(c.coste.moneda)))
      pega(donde, "su coste no es un importe con su moneda");
  });
  if (p.bloquea !== p.casillas.some((c) => c.estado === "blocks"))
    pega("papeles", "lo que bloquea no casa con la tabla");
  for (const f of p.fuera)
    if (!fila(f.viajero) || !NO_PREGUNTADO.includes(f.porQue))
      pega("papeles.fuera", "lo que no se pregunta no dice por qué");
  return pegas;
}

/**
 * Lo que se comprueba de un viaje cerrado antes de dárselo a la web: cada cosa por su clave y de su lista, sus piezas
 * las de su manera, cada enlace una dirección https sin claves y cada frase del que explica, un texto para el
 * viajero. Si todo cuadra lo mira la puerta 8, que lo cuenta otra vez desde lo que dio cada fuente.
 */
export function pegasDelCierre(c: Cierre, v: Viaje): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });
  const deSuLista = <T extends string>(lista: readonly T[], x: unknown): boolean => lista.includes(x as T);
  if (Number.isNaN(Date.parse(c.cuando))) pega("cierre", "no dice cuándo se cerró");
  const m = v.maneras.find((x) => x.id === c.manera);
  if (m === undefined) return [...pegas, { donde: "cierre", que: "su manera no es de este viaje" }];
  if (m.alojamiento !== c.alojamiento || m.transporte !== c.transporte)
    pega("cierre", "sus piezas no son las de su manera");
  if (!/^[A-Z]{3}$/.test(c.moneda)) pega("cierre", "no dice su moneda");
  if (!(c.total.antes > 0) || (c.total.hoy !== null && !(c.total.hoy > 0))) pega("cierre", "un total no es un importe");
  const piezas = [c.alojamiento, ...(c.transporte === null ? [] : [c.transporte])];
  c.precios.forEach((p, i) => {
    const donde = `cierre.precios[${i}]`;
    if (!deSuLista(PIEZAS, p.pieza) || !piezas.includes(p.ref)) pega(donde, "no es una pieza de su manera");
    if (!deSuLista(CAMBIOS_DE_PRECIO, p.cambio)) pega(donde, "su cambio no es de su lista");
    if (p.edad !== null && !deSuLista(EDADES_DE_UN_PRECIO, p.edad)) pega(donde, "su edad no es de su lista");
    pegas.push(...pegasDelPrecio(p.antes, donde));
    if (p.hoy !== null) pegas.push(...pegasDelPrecio(p.hoy, `${donde}.hoy`));
    if ((p.hoy === null) !== (p.diferencia === null) || (p.hoy === null) !== (p.edad === null))
      pega(donde, "lo de hoy no casa con lo que dice de él");
  });
  if (c.precios.length !== piezas.length) pega("cierre", "no lleva el precio de hoy de cada pieza");
  c.enlaces.forEach((e, i) => {
    const donde = `cierre.enlaces[${i}]`;
    if (!enlaceSinClaves(e.url)) pega(donde, "no es una dirección https sin claves");
    if (!deSuLista(CLASES_DE_ENLACE, e.clase) || !deSuLista(COMPROBACIONES_DE_ENLACE, e.comprobado))
      pega(donde, "su clase o lo que se supo de él no son de su lista");
    if (!piezas.includes(e.ref)) pega(donde, "no es de una pieza de su manera");
  });
  const mapas = [c.mapas.alojamiento, ...Object.values(c.mapas.paradas), ...c.mapas.dias.flatMap((d) => d.url ?? [])];
  if (!mapas.every((u) => enlaceSinClaves(u) && new URL(u).hostname === "www.google.com"))
    pega("cierre.mapas", "un enlace de los mapas no es de Google Maps");
  for (const id of Object.keys(c.mapas.paradas))
    if (!v.paradas.some((p) => p.id === id)) pega("cierre.mapas", `la parada ${id} no existe`);
  c.reservas.forEach((r, i) => {
    const donde = `cierre.reservas[${i}]`;
    if (r.n !== i + 1) pega(donde, "no va en su orden");
    const existe = r.que === "sight" ? v.paradas.some((p) => p.id === r.ref) : piezas.includes(r.ref);
    if (!existe) pega(donde, "no es de una pieza ni de una parada del viaje");
    if (!r.porQue.every((x) => deSuLista(RAZONES_DEL_ORDEN, x))) pega(donde, "un porqué no es de su lista");
  });
  c.papeles.forEach((p, i) => {
    if (!fecha(p.antesDe) || !PREGUNTAS.includes(p.pregunta) || !/^[A-Z]{2}$/.test(p.pais))
      pega(`cierre.papeles[${i}]`, "no es un plazo con su fecha");
  });
  for (const s of c.sinConfirmar)
    if (!deSuLista(SIN_CONFIRMAR, s.que)) pega("cierre.sinConfirmar", "una clave no es de su lista");
  if (!deSuLista(LLEGADAS, c.llegada)) pega("cierre", "su llegada no es de su lista");
  if (c.entradaDesde !== null && !/^\d{2}:\d{2}$/.test(c.entradaDesde))
    pega("cierre", "su hora de entrada no es una hora");
  if (c.sinFrases !== null && !deSuLista(SIN_FRASES, c.sinFrases)) pega("cierre", "no dice por qué no lleva frases");
  // Las frases del que explica van todas o ninguna: una por reserva y una por plazo, y lo que no se sabe.
  const frases = [...c.reservas, ...c.papeles].map((x) => x.frase);
  const con = frases.filter((x) => x !== undefined).length;
  if (con > 0 && con !== frases.length) pega("cierre", "unas reservas llevan su frase y otras no");
  if ((con > 0 || c.dudas !== undefined) && c.sinFrases !== null)
    pega("cierre", "dice que no lleva frases, y las lleva");
  for (const [i, f] of [...frases.filter((x) => x !== undefined), ...(c.dudas ?? [])].entries()) {
    if (typeof f !== "string" || f.trim() === "") pega(`cierre.frases[${i}]`, "una frase no es un texto");
    else for (const que of pegasDelTexto(f, { sinNumerosLargos: true })) pega(`cierre.frases[${i}]`, `su frase ${que}`);
  }
  return pegas;
}

/** Lo que el código puede comprobar de un viaje antes de dárselo a la web. No mira si el viaje es bueno. */
export function comprobarViaje(v: Viaje): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });

  if (!fecha(v.entrada) || !fecha(v.salida) || v.salida <= v.entrada)
    pega("fechas", "la salida no es después de la entrada");
  if (!enElMapa(v.destino.punto)) pega("destino", "el destino no está en el mapa");
  const e = v.destino.encuadre;
  if (!(e.oeste < e.este && e.sur < e.norte)) pega("destino", "el encuadre no encierra nada");

  // Las paradas: cada una, una vez, en el mapa, y su foto con su autor y su licencia.
  for (const id of repetidos(v.paradas.map((p) => p.id))) pega(`paradas.${id}`, "la parada sale dos veces");
  for (const p of v.paradas) {
    const donde = `paradas.${p.id}`;
    if (!enElMapa(p.punto)) pega(donde, "la parada no está en el mapa");
    if (!(p.minutos > 0)) pega(donde, "no dice lo que lleva verla");
    if (p.porQue.trim() === "") pega(donde, "no dice por qué ir");
    if (p.origen.fuente.trim() === "" || Number.isNaN(Date.parse(p.origen.visto))) pega(donde, "no dice de dónde sale");
    if (p.foto !== null && (p.foto.autor === null || p.foto.licencia === null))
      pega(donde, "su foto no lleva su autor o su licencia");
  }

  // Los días: dentro de las fechas, con paradas que existen, cada una en un solo día, y lo que se anda entre ellas.
  const deParada = new Set(v.paradas.map((p) => p.id));
  const puestas: string[] = [];
  v.dias.forEach((d, i) => {
    const donde = `dias[${i}]`;
    if (!fecha(d.fecha) || d.fecha < v.entrada || d.fecha > v.salida) pega(donde, "el día no es de este viaje");
    if (i > 0 && d.fecha <= v.dias[i - 1].fecha) pega(donde, "los días no van en orden");
    for (const id of d.paradas) if (!deParada.has(id)) pega(donde, `lleva la parada ${id}, que no existe`);
    if (d.metros.length !== Math.max(0, d.paradas.length - 1)) pega(donde, "no dice lo que se anda entre sus paradas");
    if (d.metros.some((m) => !(m >= 0))) pega(donde, "una distancia no es un número");
    puestas.push(...d.paradas);
  });
  for (const id of repetidos(puestas)) pega("dias", `la parada ${id} está en dos días`);
  const motivos: readonly string[] = MOTIVOS_DE_FUERA;
  for (const id of v.fuera) {
    if (!deParada.has(id)) pega("fuera", `la parada ${id} no existe`);
    else if (puestas.includes(id)) pega("fuera", `la parada ${id} está fuera y en un día a la vez`);
    if (!motivos.includes(v.porQueFuera?.[id])) pega("fuera", `la parada ${id} está fuera y no dice por qué`);
  }
  for (const p of v.paradas) {
    if (!puestas.includes(p.id) && !v.fuera.includes(p.id)) pega(`paradas.${p.id}`, "ni está en un día ni está fuera");
  }

  // Dónde se duerme y cómo se llega.
  for (const id of repetidos(v.alojamientos.map((a) => a.id))) pega(`alojamientos.${id}`, "sale dos veces");
  for (const a of v.alojamientos) {
    if (!enElMapa(a.punto)) pega(`alojamientos.${a.id}`, "no está en el mapa");
    pegas.push(...pegasDelPrecio(a.precio, `alojamientos.${a.id}`));
    a.otrasOfertas.forEach((o, i) => pegas.push(...pegasDelPrecio(o, `alojamientos.${a.id}.otrasOfertas[${i}]`)));
    if (!Number.isInteger(a.fotosDeHabitacion) || a.fotosDeHabitacion < 0 || a.fotosDeHabitacion > a.fotos.length)
      pega(`alojamientos.${a.id}`, "no dice cuántas de sus fotos son de la habitación de ese precio");
    // Lo que se lee de un alojamiento lo dice la web con sus claves: ninguna frase suelta llega hasta aquí.
    const clave = (x: unknown): boolean => typeof x === "string" && /^[a-z_]+$/.test(x);
    for (const r of a.comoEs) {
      if (!clave(r.campo) || !clave(r.nivel)) pega(`alojamientos.${a.id}`, "un rasgo no va por su clave");
      if (r.prueba !== null && !PRUEBAS.includes(r.prueba))
        pega(`alojamientos.${a.id}`, "una prueba no es de su lista");
    }
    for (const d of a.seDice)
      if (![d.tema, d.tono, d.menciones].every(clave))
        pega(`alojamientos.${a.id}`, "lo que se dice no va por su clave");
    for (const x of a.avisos)
      if (!AVISOS_DE_FICHA.includes(x)) pega(`alojamientos.${a.id}`, "un aviso de la ficha no es de su lista");
  }
  for (const t of v.transportes) {
    pegas.push(...pegasDelPrecio(t.precio, `transportes.${t.id}`));
    if (!TRANSPORTES.includes(t.clase)) pega(`transportes.${t.id}`, "la clase de transporte no es de su lista");
  }
  const l = v.transporteAlLado;
  if (l !== undefined) {
    pegas.push(...pegasDelPrecio(l.precio, "transporteAlLado"));
    if (v.transportes.length > 0)
      pega("transporteAlLado", "las fechas ya tienen transporte: no hace falta el de al lado");
    const dias = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    const sale = l.sale.slice(0, 10);
    const vuelve = (l.vuelve ?? "").slice(0, 10);
    const cerca = (a: string, b: string): boolean => fecha(a) && Math.abs(dias(b, a)) <= DIAS_ALREDEDOR;
    if (!cerca(sale, v.entrada) || !cerca(vuelve, v.salida) || (sale === v.entrada && vuelve === v.salida))
      pega("transporteAlLado", "no es de un día de al lado");
  }
  if (v.caminos !== undefined) pegas.push(...pegasDeLosCaminos(v.caminos));
  if (v.calendario !== undefined) pegas.push(...pegasDelCalendario(v.calendario, v.entrada, v.salida));
  if (v.papeles !== undefined) pegas.push(...pegasDeLosPapeles(v.papeles));
  pegas.push(...pegasDeLasCapas(v, v));
  if (v.cierre !== undefined) pegas.push(...pegasDelCierre(v.cierre, v));
  if (!RITMOS.includes(v.ritmo)) pega("ritmo", "el ritmo no es de su lista");
  if (!Number.isInteger(v.habitaciones) || v.habitaciones < 1 || v.habitaciones > Math.max(1, v.adultos))
    pega("habitaciones", "no dice en cuántas habitaciones duerme el grupo");

  // Las maneras: tres como mucho, cada una una vez, con piezas que existen y una moneda sola.
  if (v.maneras.length > MANERAS.length) pega("maneras", "hay más de tres maneras");
  for (const id of repetidos(v.maneras.map((m) => m.id))) pega(`maneras.${id}`, "sale dos veces");
  for (const m of v.maneras) {
    const donde = `maneras.${m.id}`;
    if (!v.alojamientos.some((a) => a.id === m.alojamiento)) pega(donde, "su alojamiento no existe");
    if (m.transporte !== null && !v.transportes.some((t) => t.id === m.transporte))
      pega(donde, "su transporte no existe");
    if (!(m.total > 0)) pega(donde, "no lleva su total");
    if (m.gana.trim() === "" || m.pierde.trim() === "") pega(donde, "no dice qué gana o qué pierde");
  }
  if (new Set(v.maneras.map((m) => m.moneda)).size > 1) pega("maneras", "mezclan monedas");
  for (const p of v.palancas) if (!(p.ahorra > 0)) pega(`palancas.${p.id}`, "una palanca que no ahorra no se cuenta");

  // Los avisos: cada uno, una frase, y entre ellos los dos de siempre, en el idioma del viaje.
  if (!Array.isArray(v.avisos) || !v.avisos.every((a) => typeof a === "string" && a.trim() !== ""))
    pega("avisos", "un aviso no es una frase");
  else {
    const deSiempre = avisosDe(v.idioma);
    if (!v.avisos.includes(deSiempre.ia)) pega("avisos", "falta el aviso de que está hecho con IA");
    if (!v.avisos.includes(deSiempre.precios)) pega("avisos", "falta el aviso de que los precios son orientativos");
  }

  return pegas;
}

/**
 * Lo que el código comprueba de un primer vistazo antes de dárselo a la web: que las cuentas cuadren (no pasan más de
 * los que hay, ni tienen precio más de los que pasan), que cada precio sea un importe y cada punto esté en el mapa.
 */
export function comprobarVistazo(v: Vistazo): Pega[] {
  const pegas: Pega[] = [];
  const pega = (donde: string, que: string): void => void pegas.push({ donde, que });
  const cuenta = (n: unknown): boolean => Number.isInteger(n) && (n as number) >= 0;
  const importe = (n: unknown): boolean => typeof n === "number" && Number.isFinite(n) && n > 0;
  const cuadra = (donde: string, x: { devueltos: number; pasan: number; conPrecio: number; desde: number | null }) => {
    if (![x.devueltos, x.pasan, x.conPrecio].every(cuenta)) pega(donde, "una cuenta no es un número entero");
    if (x.pasan > x.devueltos) pega(donde, "pasan más de los que hay");
    if (x.conPrecio > x.pasan) pega(donde, "tienen precio más de los que pasan");
    if ((x.desde === null) !== (x.conPrecio === 0)) pega(donde, "el «desde» no casa con los que tienen precio");
    if (x.desde !== null && !importe(x.desde)) pega(donde, "el «desde» no es un importe");
  };
  cuadra("vistazo", v);
  if (!/^[A-Z]{3}$/.test(v.moneda)) pega("vistazo", "no dice su moneda");
  if (v.mirados !== undefined && (!cuenta(v.mirados) || v.mirados > v.pasan || v.conPrecio > v.mirados))
    pega("vistazo", "a los que se pidió precio no casan con los que pasan y los que lo tienen");
  v.puntos.forEach((p, i) => {
    if (!enElMapa(p.punto)) pega(`puntos[${i}]`, "no está en el mapa");
    if (p.precio !== null && !importe(p.precio)) pega(`puntos[${i}]`, "su precio no es un importe");
  });
  if (v.zonas !== undefined) {
    for (const id of repetidos(v.zonas.map((z) => z.id))) pega(`zonas.${id}`, "sale dos veces");
    for (const z of v.zonas) {
      cuadra(`zonas.${z.id}`, z);
      if (!enElMapa(z.punto)) pega(`zonas.${z.id}`, "no está en el mapa");
    }
    const suma = (campo: "devueltos" | "pasan" | "conPrecio"): number => v.zonas!.reduce((s, z) => s + z[campo], 0);
    if (suma("devueltos") !== v.devueltos || suma("pasan") !== v.pasan || suma("conPrecio") !== v.conPrecio)
      pega("zonas", "las zonas no suman lo que dice el vistazo");
  }
  const d = v.vuelos;
  if (d !== undefined && d !== null) {
    if (!/^[A-Z]{3}$/.test(d.origen) || !/^[A-Z]{3}$/.test(d.destino))
      pega("vuelos", "un aeropuerto no son tres letras");
    const n = d.nombres;
    if (n !== undefined && (n.origen.trim() === "" || n.destino.trim() === ""))
      pega("vuelos", "un sitio con vuelos no tiene nombre");
    if (!/^\d{4}-\d{2}$/.test(d.mes)) pega("vuelos", "el mes no es un mes");
    if (!/^[A-Z]{3}$/.test(d.moneda)) pega("vuelos", "no dice su moneda");
    if (!(Number.isInteger(d.noches) && d.noches > 0)) pega("vuelos", "no dice de cuántas noches es el viaje");
    if (d.fuente.trim() === "" || Number.isNaN(Date.parse(d.visto))) pega("vuelos", "no dice de dónde sale");
    d.dias.forEach((x, i) => {
      if (!fecha(x.dia) || !x.dia.startsWith(d.mes)) pega(`vuelos.dias[${i}]`, "el día no es de ese mes");
      if (!importe(x.precio)) pega(`vuelos.dias[${i}]`, "el precio no es un importe");
      if (i > 0 && x.dia <= d.dias[i - 1].dia) pega(`vuelos.dias[${i}]`, "los días no van en orden");
    });
  }
  return pegas;
}

/** Los sucesos van en orden de tiempo, son de una clase conocida y acaban con el final. */
export function comprobarSucesos(sucesos: Suceso[]): Pega[] {
  const pegas: Pega[] = [];
  sucesos.forEach((s, i) => {
    if (!SUCESOS.includes(s.clase)) pegas.push({ donde: `sucesos[${i}]`, que: `no se sabe qué es ${String(s.clase)}` });
    if (!(s.t >= 0) || (i > 0 && s.t < sucesos[i - 1].t))
      pegas.push({ donde: `sucesos[${i}]`, que: "no va en su orden" });
    if (s.punto !== undefined && !enElMapa(s.punto)) pegas.push({ donde: `sucesos[${i}]`, que: "no está en el mapa" });
  });
  if (sucesos.length > 0 && sucesos[sucesos.length - 1].clase !== "done")
    pegas.push({ donde: "sucesos", que: "la investigación no acaba" });
  return pegas;
}
