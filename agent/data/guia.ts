// Lo nuestro de la guía, en datos: lo que mide cada texto del que la escribe, las palabras que delatan un precio o una
// hora, y los rótulos del cuaderno en cada idioma en que se escribe hoy. Los textos los escribe el asiento; los rótulos
// (los títulos de cada página, lo que dice cada casilla) los pone el código. La guía solo sale en los idiomas que
// tienen sus rótulos, sus avisos y sus palabras prohibidas: en otro, no se pide. Al añadir un idioma, se añaden los
// suyos y se pone en `IDIOMAS_DE_LA_GUIA`.

import type { ClaseDelDestino } from "./capa_destino.ts";
import type { ClaseDeBillete, ClaseDePago, DeDondeSeLlega, ModoDeMoverse } from "./capa_moverse.ts";
import type { DiaDeLaSemana, ParaQuien } from "./capas.ts";
import type { PREGUNTAS } from "./papeles.ts";

/** Lo que mide cada texto de la guía, en letras. Una o dos frases; la portada y la entrada de un día, algo más. */
export const LARGO_EN_LA_GUIA = { titulo: 80, texto: 500 };

/** Lo más que puede llevar la guía: días, paradas por día y cosas que llevar hechas. Más es un viaje que no es. */
export const TOPES_DE_LA_GUIA = { dias: 31, paradasPorDia: 12, antes: 60, noSeSabe: 6 };

/**
 * Dónde se come cada día (14.6): una zona o un mercado de lo que conviene saber, con su punto, va al día de la parada
 * que le queda más cerca si se anda en estos metros o menos; si no, va a «Antes de ir», sin día. Y lo más que se le
 * pone a un día. De partida: se ajusta con casos reales.
 */
export const PARA_COMER = { metros: 1200, porDia: 3 };

/**
 * Las maneras de moverse que se nombran con su palabra en un texto del que escribe la guía, por idioma: si un tramo
 * que no se anda dice una de estas y el viaje no la trae, la ha puesto él. El coche, el taxi y «el transporte» no
 * están: son las palabras de siempre de un tramo que no se anda, y no dicen qué hay allí.
 */
export const MODOS_EN_UN_TEXTO: Record<string, Partial<Record<ModoDeMoverse, RegExp>>> = {
  en: {
    metro: /(?<![\p{L}])(?:metro|subway|underground)(?![\p{L}])/iu,
    tram: /(?<![\p{L}])(?:trams?|streetcars?)(?![\p{L}])/iu,
    bus: /(?<![\p{L}])(?:bus|buses|coach)(?![\p{L}])/iu,
    train: /(?<![\p{L}])(?:trains?|railway)(?![\p{L}])/iu,
    ferry: /(?<![\p{L}])(?:ferry|ferries|boat)(?![\p{L}])/iu,
    cable: /(?<![\p{L}])(?:cable car|funicular|gondola)(?![\p{L}])/iu,
    shuttle: /(?<![\p{L}])(?:shuttle)(?![\p{L}])/iu,
  },
  es: {
    metro: /(?<![\p{L}])(?:metro|suburbano)(?![\p{L}])/iu,
    tram: /(?<![\p{L}])(?:tranv[ií]as?)(?![\p{L}])/iu,
    bus: /(?<![\p{L}])(?:bus|autob[uú]s|autobuses)(?![\p{L}])/iu,
    train: /(?<![\p{L}])(?:trenes|tren|cercan[ií]as)(?![\p{L}])/iu,
    ferry: /(?<![\p{L}])(?:ferry|ferri|barco)(?![\p{L}])/iu,
    cable: /(?<![\p{L}])(?:telef[eé]rico|funicular|telecabina)(?![\p{L}])/iu,
    shuttle: /(?<![\p{L}])(?:lanzadera)(?![\p{L}])/iu,
  },
};

/**
 * Un precio dicho en un texto: un signo de moneda, un código de tres letras de los más usados o el nombre de una
 * moneda. Al que escribe la guía no se le da ningún precio: los pone el cuaderno, con su fecha. Si su texto habla de
 * dinero, es que lo ha puesto él.
 */
export const DE_DINERO = new RegExp(
  "[€$£¥₹₩₺₽¢]|(?<![\\p{L}\\p{N}])(?:EUR|USD|GBP|JPY|CHF|CAD|AUD|MXN|BRL|ARS|CLP|COP|PEN|" +
    "euros?|dollars?|d[oó]lares?|pounds?|libras?|yen(?:es)?|pesos?|reales?|francos?|francs?)(?![\\p{L}\\p{N}])",
  "iu",
);

/**
 * Una hora del reloj: «10:30», «10h30», «10.30 h», «10 am», «a las 10», «at 10». Una guía puede decir «por la
 * mañana»; una hora exacta solo si está en el viaje (la de un vuelo, si la trae).
 */
export const HORAS = [
  /(?<![\p{N}])([01]?\d|2[0-3])\s?[:h]\s?([0-5]\d)(?![\p{N}])/giu,
  /(?<![\p{N}])([01]?\d|2[0-3])[.]([0-5]\d)\s?h(?![\p{L}])/giu,
  /(?<![\p{N}])(1[0-2]|0?[1-9])\s?(?:a\.?\s?m\.?|p\.?\s?m\.?)(?![\p{L}])/giu,
  /(?<![\p{L}])(?:a las|a la|at|hacia las|sobre las|desde las|hasta las)\s+([01]?\d|2[0-3])(?![\p{N}:.,])/giu,
];

/**
 * Los idiomas en que sale la guía: los que tienen sus rótulos aquí, sus avisos y sus palabras prohibidas en
 * `palabras.ts`, y sus meses y sus días para la puerta 10. En otro, la guía no se pide: no hay rótulos por defecto.
 */
export const IDIOMAS_DE_LA_GUIA = ["en", "es"] as const;

/** Las clases de un enlace de reserva, como las guarda el cierre. */
type ClaseDeEnlace = "where_priced" | "other_seller" | "search" | "own_site";

type Rotulos = {
  guia: string;
  deTuViaje: (destino: string) => string;
  fechas: (entrada: string, salida: string, noches: number) => string;
  viajeros: (adultos: number, ninos: number) => string;
  deUnVistazo: string;
  dia: (n: number) => string;
  paradas: (n: number) => string;
  duermes: string;
  llegas: string;
  papeles: string;
  papelesSub: string;
  antes: string;
  reservas: string;
  noSeSabe: string;
  creditos: string;
  mapaSin: string;
  andando: (minutos: number, metros: string) => string;
  enCoche: (minutos: number, metros: string) => string;
  aproximado: string;
  desdeDondeDuermes: string;
  minutos: (n: number) => string;
  hora: Record<string, string>;
  reservar: string;
  imprescindible: string;
  fuente: string;
  foto: (autor: string, licencia: string) => string;
  sinFoto: string;
  noches: (n: number) => string;
  habitacion: string;
  estrellas: (n: number) => string;
  precio: (dinero: string, visto: string) => string;
  /** El precio que dio la fuente al cerrar el viaje, con el día en que se vio. */
  precioAlCerrar: (dinero: string, visto: string) => string;
  /** El precio que se vio, cuando al cerrar ya no estaba o no se pudo preguntar. */
  precioSinConfirmar: (dinero: string, visto: string, yaNoEsta: boolean) => string;
  otraHabitacion: string;
  total: string;
  totalSinConfirmar: string;
  enlaceDe: Record<ClaseDeEnlace, string>;
  otroPrecio: (dinero: string, visto: string) => string;
  sinComprobar: string;
  caidos: (n: number) => string;
  sinEnlace: string;
  vendedor: string;
  transporte: Record<string, string>;
  ida: string;
  vuelta: string;
  escalas: (n: number) => string;
  guardado: string;
  pregunta: Record<(typeof PREGUNTAS)[number], string>;
  estado: Record<string, string>;
  hasta: (fecha: string) => string;
  antesDe: (fecha: string, tarde: boolean) => string;
  viajero: (pasaporte: string, edad: number | null, cuantos: number) => string;
  paraEntrar: (pais: string) => string;
  deLasFechas: string;
  hecha: (fecha: string, version: number) => string;
  atras: string;
  reservaEn: string;
  nada: string;
  preciosVistos: (fecha: string) => string;
  /** Las capas del destino en el cuaderno (14.6): cómo moverte, antes de ir, dónde comer y la entrada de cada sitio. */
  comoMoverte: string;
  antesDeIr: string;
  dondeComer: string;
  deAlli: string;
  llegar: string;
  transportes: string;
  billetes: string;
  pagos: string;
  modo: Record<ModoDeMoverse, string>;
  billete: Record<ClaseDeBillete, string>;
  pago: Record<ClaseDePago, string>;
  deDonde: Record<DeDondeSeLlega, string>;
  para: Record<ParaQuien, string>;
  claseDelDestino: Record<"neighbourhood" | "hours" | "money" | "practical" | "avoid" | "food", string>;
  diaDeLaSemana: Record<DiaDeLaSemana, string>;
  desde: (lugar: string) => string;
  hastaLas: (hora: string) => string;
  deTantos: (dias: number | null, viajes: number | null) => string;
  coche: (haceFalta: boolean) => string;
  visto: (fecha: string) => string;
  entrada: string;
  gratis: string;
  edades: (desde: number | null, hasta: number | null) => string;
  abre: (franjas: string) => string;
  cierraEseDia: string;
  deA: (abre: string, cierra: string) => string;
  reservarEn: string;
  webDelSitio: string;
  cerca: (metros: string, parada: string) => string;
  cuesta: (desde: string, hasta: string) => string;
};

/** Las clases de lo que conviene saber, como se agrupan en «Antes de ir»: lo de comer, junto. */
export const GRUPO_DEL_DESTINO: Record<ClaseDelDestino, keyof Rotulos["claseDelDestino"]> = {
  neighbourhood: "neighbourhood",
  hours: "hours",
  money: "money",
  practical: "practical",
  avoid: "avoid",
  food_area: "food",
  market: "food",
  dish: "food",
  meal_cost: "food",
};

const cuenta = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

/** Los rótulos del cuaderno, por idioma. Los números van como números: los pone el código. */
export const ROTULOS: Record<string, Rotulos> = {
  en: {
    guia: "Your guide",
    deTuViaje: (destino) => `${destino}, your trip`,
    fechas: (entrada, salida, noches) => `${entrada} to ${salida}, ${cuenta(noches, "night", "nights")}`,
    viajeros: (adultos, ninos) =>
      ninos === 0
        ? cuenta(adultos, "adult", "adults")
        : `${cuenta(adultos, "adult", "adults")} and ${cuenta(ninos, "child", "children")}`,
    deUnVistazo: "Your trip at a glance",
    dia: (n) => `Day ${n}`,
    paradas: (n) => cuenta(n, "stop", "stops"),
    duermes: "Where you sleep",
    llegas: "How you get there",
    papeles: "Your papers",
    papelesSub: "What the official sources ask for. Whether you meet it, only your documents say: check before you go.",
    antes: "Before you go",
    reservas: "Where to book",
    noSeSabe: "What we do not know",
    creditos: "Photos and sources",
    mapaSin: "A sketch from the points of your trip: north is up. For the exact way, use a map on your phone.",
    andando: (minutos, metros) => `${minutos} min on foot, ${metros}`,
    enCoche: (minutos, metros) => `about ${minutos} min by car or public transport, ${metros}`,
    aproximado: "approximate",
    desdeDondeDuermes: "From where you sleep",
    minutos: (n) => `${n} min`,
    hora: { morning: "Best in the morning", afternoon: "Best in the afternoon", evening: "Best in the evening" },
    reservar: "Book ahead",
    imprescindible: "Not to miss",
    fuente: "Source",
    foto: (autor, licencia) => `Photo: ${autor}, ${licencia}`,
    sinFoto: "No photo we can show",
    noches: (n) => cuenta(n, "night", "nights"),
    habitacion: "Room",
    estrellas: (n) => cuenta(n, "star", "stars"),
    precio: (dinero, visto) => `${dinero}, seen on ${visto}`,
    precioAlCerrar: (dinero, visto) => `${dinero}, the price when you closed the trip, seen on ${visto}`,
    precioSinConfirmar: (dinero, visto, yaNoEsta) =>
      `${dinero}, seen on ${visto}. ` +
      (yaNoEsta
        ? "When you closed the trip, the seller no longer had it"
        : "When you closed the trip, it could not be checked"),
    otraHabitacion: "This price is for another room than the one first seen",
    total: "In total",
    totalSinConfirmar: "With the prices seen: one of them could not be confirmed when you closed the trip",
    enlaceDe: {
      where_priced: "Where this price was seen",
      search: "The search with your dates",
      other_seller: "Another seller",
      own_site: "The lodging's own website, not where the price was seen",
    },
    otroPrecio: (dinero, visto) => `${dinero}, seen on ${visto}, the day of the search`,
    sinComprobar: "This link could not be checked when you closed the trip",
    caidos: (n) =>
      `${cuenta(n, "link", "links")} did not answer when you closed the trip, and ${n === 1 ? "is" : "are"} left out`,
    sinEnlace: "No link to book it answered when you closed the trip",
    vendedor: "Sold by",
    transporte: { flight: "Flight", train: "Train", bus: "Coach", car: "Car" },
    ida: "Out",
    vuelta: "Back",
    escalas: (n) => (n === 0 ? "Direct" : cuenta(n, "stop", "stops")),
    guardado: "Price from a search of days ago, not of today",
    pregunta: {
      visa: "Visa",
      passport_validity: "Passport validity",
      onward_ticket: "Ticket out",
      proof_of_funds: "Proof of means",
      arrival_card: "Form before arriving",
      vaccines: "Vaccines",
      insurance: "Insurance",
      minors: "Minors",
      transit: "Changing planes",
      travel_advisory: "Your ministry's advice",
      driving_licence: "Driving licence",
    },
    estado: {
      in_order: "Nothing asked",
      to_do: "Something to do",
      warning: "Worth knowing",
      blocks: "It blocks",
      doubtful: "Unclear",
    },
    hasta: (fecha) => `The passport has to be valid until at least ${fecha}`,
    antesDe: (fecha, tarde) => (tarde ? `It had to be done by ${fecha}` : `Do it before ${fecha}`),
    viajero: (pasaporte, edad, cuantos) =>
      `${cuenta(cuantos, "traveller", "travellers")} with a passport from ${pasaporte}` +
      (edad === null ? "" : `, aged ${edad}`),
    paraEntrar: (pais) => `To enter ${pais}`,
    deLasFechas: "In your dates",
    hecha: (fecha, version) => `Made on ${fecha}, from version ${version} of your trip.`,
    atras: "Your trip has changed since this guide was made: ask for it again to have it up to date.",
    reservaEn: "Book it at the seller's website",
    nada: "Nothing",
    preciosVistos: (fecha) => `Prices seen on ${fecha} or later`,
    comoMoverte: "Getting around",
    antesDeIr: "Good to know before you go",
    dondeComer: "Where to eat",
    deAlli: "Getting around, opening hours and good to know",
    llegar: "From where you arrive to where you sleep",
    transportes: "What there is to get around",
    billetes: "Tickets and passes",
    pagos: "How you pay",
    modo: {
      metro: "Metro",
      tram: "Tram",
      bus: "Bus",
      train: "Train",
      ferry: "Ferry",
      cable: "Cable car",
      shuttle: "Shuttle",
      taxi: "Taxi",
      ride_hailing: "Ride-hailing app",
      car: "Car",
      bike: "Bike",
      walk: "On foot",
    },
    billete: {
      single: "Single ticket",
      day_pass: "Day pass",
      multi_day_pass: "Pass for several days",
      multi_ride: "Ticket for several rides",
      travel_card: "Rechargeable card",
    },
    pago: {
      contactless: "Contactless card",
      card: "Card",
      cash: "Cash",
      app: "An app",
      travel_card: "A local travel card",
    },
    deDonde: { airport: "the airport", station: "the station", port: "the port" },
    para: {
      any: "Anyone",
      adult: "Adult",
      child: "Child",
      infant: "Baby",
      youth: "Young person",
      student: "Student",
      senior: "Senior",
      family: "Family",
      group: "Group",
    },
    claseDelDestino: {
      neighbourhood: "The neighbourhoods",
      hours: "Times of day there",
      money: "Money",
      practical: "Practical things",
      avoid: "Better to avoid",
      food: "Eating",
    },
    diaDeLaSemana: {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    },
    desde: (lugar) => `From ${lugar}`,
    hastaLas: (hora) => `until ${hora}`,
    deTantos: (dias, viajes) =>
      [dias === null ? "" : cuenta(dias, "day", "days"), viajes === null ? "" : cuenta(viajes, "ride", "rides")]
        .filter((x) => x !== "")
        .join(", "),
    coche: (haceFalta) => (haceFalta ? "A car is needed" : "No car is needed"),
    visto: (fecha) => `seen on ${fecha}`,
    entrada: "Entry",
    gratis: "free",
    edades: (desde, hasta) =>
      desde !== null && hasta !== null
        ? `aged ${desde} to ${hasta}`
        : desde !== null
          ? `aged ${desde} or more`
          : hasta !== null
            ? `up to ${hasta}`
            : "",
    abre: (franjas) => `Open that day, ${franjas}`,
    cierraEseDia: "Closed that day",
    deA: (abre, cierra) => `${abre} to ${cierra}`,
    reservarEn: "Where to book",
    webDelSitio: "Its website",
    cerca: (metros, parada) => `${metros} from ${parada}`,
    cuesta: (desde, hasta) => `Usually ${desde} to ${hasta}`,
  },
  es: {
    guia: "Tu guía",
    deTuViaje: (destino) => `${destino}, tu viaje`,
    fechas: (entrada, salida, noches) => `Del ${entrada} al ${salida}, ${cuenta(noches, "noche", "noches")}`,
    viajeros: (adultos, ninos) =>
      ninos === 0
        ? cuenta(adultos, "adulto", "adultos")
        : `${cuenta(adultos, "adulto", "adultos")} y ${cuenta(ninos, "niño", "niños")}`,
    deUnVistazo: "Tu viaje de un vistazo",
    dia: (n) => `Día ${n}`,
    paradas: (n) => cuenta(n, "parada", "paradas"),
    duermes: "Dónde duermes",
    llegas: "Cómo llegas",
    papeles: "Tus papeles",
    papelesSub:
      "Lo que piden las fuentes oficiales. Si lo cumples, solo lo dicen tus documentos: compruébalo antes de ir.",
    antes: "Lo que hay que llevar hecho",
    reservas: "Dónde se reserva",
    noSeSabe: "Lo que no sabemos",
    creditos: "Fotos y fuentes",
    mapaSin: "Un croquis con los puntos de tu viaje, con el norte arriba. Para el camino exacto, un mapa en el móvil.",
    andando: (minutos, metros) => `${minutos} min andando, ${metros}`,
    enCoche: (minutos, metros) => `unos ${minutos} min en coche o en transporte, ${metros}`,
    aproximado: "aproximado",
    desdeDondeDuermes: "Desde donde duermes",
    minutos: (n) => `${n} min`,
    hora: { morning: "Mejor por la mañana", afternoon: "Mejor por la tarde", evening: "Mejor al atardecer" },
    reservar: "Hay que reservar",
    imprescindible: "Imprescindible",
    fuente: "Fuente",
    foto: (autor, licencia) => `Foto: ${autor}, ${licencia}`,
    sinFoto: "Sin una foto que podamos enseñar",
    noches: (n) => cuenta(n, "noche", "noches"),
    habitacion: "Habitación",
    estrellas: (n) => cuenta(n, "estrella", "estrellas"),
    precio: (dinero, visto) => `${dinero}, visto el ${visto}`,
    precioAlCerrar: (dinero, visto) => `${dinero}, el precio al cerrar el viaje, visto el ${visto}`,
    precioSinConfirmar: (dinero, visto, yaNoEsta) =>
      `${dinero}, visto el ${visto}. ` +
      (yaNoEsta ? "Al cerrar el viaje, quien lo vende ya no lo tenía" : "Al cerrar el viaje, no se pudo comprobar"),
    otraHabitacion: "Este precio es de otra habitación que la que se vio primero",
    total: "En total",
    totalSinConfirmar: "Con los precios vistos: uno no se pudo confirmar al cerrar el viaje",
    enlaceDe: {
      where_priced: "Donde se vio este precio",
      search: "La búsqueda con tus fechas",
      other_seller: "Otro vendedor",
      own_site: "La web del propio alojamiento, que no es donde se vio el precio",
    },
    otroPrecio: (dinero, visto) => `${dinero}, visto el ${visto}, el día de la búsqueda`,
    sinComprobar: "Este enlace no se pudo comprobar al cerrar el viaje",
    caidos: (n) =>
      n === 1
        ? "Un enlace no respondió al cerrar el viaje, y no se pone"
        : `${n} enlaces no respondieron al cerrar el viaje, y no se ponen`,
    sinEnlace: "Al cerrar el viaje, no respondió ningún enlace para reservarlo",
    vendedor: "Lo vende",
    transporte: { flight: "Vuelo", train: "Tren", bus: "Autobús", car: "Coche" },
    ida: "Ida",
    vuelta: "Vuelta",
    escalas: (n) => (n === 0 ? "Directo" : cuenta(n, "escala", "escalas")),
    guardado: "Precio de una búsqueda de hace días, no de hoy",
    pregunta: {
      visa: "Visado",
      passport_validity: "Vigencia del pasaporte",
      onward_ticket: "Billete de salida",
      proof_of_funds: "Prueba de medios",
      arrival_card: "Formulario antes de llegar",
      vaccines: "Vacunas",
      insurance: "Seguro",
      minors: "Menores",
      transit: "Escalas",
      travel_advisory: "Lo que dice tu ministerio",
      driving_licence: "Carné de conducir",
    },
    estado: {
      in_order: "No piden nada",
      to_do: "Hay que hacer algo",
      warning: "Conviene saberlo",
      blocks: "Lo impide",
      doubtful: "No está claro",
    },
    hasta: (fecha) => `El pasaporte tiene que valer al menos hasta el ${fecha}`,
    antesDe: (fecha, tarde) => (tarde ? `Había que hacerlo antes del ${fecha}` : `Hazlo antes del ${fecha}`),
    viajero: (pasaporte, edad, cuantos) =>
      `${cuenta(cuantos, "viajero", "viajeros")} con pasaporte de ${pasaporte}` +
      (edad === null ? "" : `, de ${edad} años`),
    paraEntrar: (pais) => `Para entrar en ${pais}`,
    deLasFechas: "En tus fechas",
    hecha: (fecha, version) => `Hecha el ${fecha}, con la versión ${version} de tu viaje.`,
    atras: "Tu viaje ha cambiado desde que se hizo esta guía: pídela otra vez para tenerla al día.",
    reservaEn: "Se reserva en la web de quien lo vende",
    nada: "Nada",
    preciosVistos: (fecha) => `Precios vistos desde el ${fecha}`,
    comoMoverte: "Cómo moverte",
    antesDeIr: "Antes de ir",
    dondeComer: "Dónde comer",
    deAlli: "Cómo moverte, los horarios y lo que conviene saber",
    llegar: "De donde llegas a donde duermes",
    transportes: "Lo que hay para moverte",
    billetes: "Billetes y abonos",
    pagos: "Cómo se paga",
    modo: {
      metro: "Metro",
      tram: "Tranvía",
      bus: "Autobús",
      train: "Tren",
      ferry: "Barco",
      cable: "Teleférico",
      shuttle: "Lanzadera",
      taxi: "Taxi",
      ride_hailing: "Coche con conductor por una aplicación",
      car: "Coche",
      bike: "Bicicleta",
      walk: "Andando",
    },
    billete: {
      single: "Billete sencillo",
      day_pass: "Abono de un día",
      multi_day_pass: "Abono de varios días",
      multi_ride: "Bono de varios viajes",
      travel_card: "Tarjeta recargable",
    },
    pago: {
      contactless: "Tarjeta sin contacto",
      card: "Tarjeta",
      cash: "Efectivo",
      app: "Una aplicación",
      travel_card: "Una tarjeta de transporte de allí",
    },
    deDonde: { airport: "el aeropuerto", station: "la estación", port: "el puerto" },
    para: {
      any: "Cualquiera",
      adult: "Adulto",
      child: "Niño",
      infant: "Bebé",
      youth: "Joven",
      student: "Estudiante",
      senior: "Mayor",
      family: "Familia",
      group: "Grupo",
    },
    claseDelDestino: {
      neighbourhood: "Los barrios",
      hours: "Los horarios de allí",
      money: "El dinero",
      practical: "Lo práctico",
      avoid: "Lo que conviene evitar",
      food: "Comer",
    },
    diaDeLaSemana: {
      mon: "lunes",
      tue: "martes",
      wed: "miércoles",
      thu: "jueves",
      fri: "viernes",
      sat: "sábado",
      sun: "domingo",
    },
    desde: (lugar) => `Desde ${lugar}`,
    hastaLas: (hora) => `hasta las ${hora}`,
    deTantos: (dias, viajes) =>
      [dias === null ? "" : cuenta(dias, "día", "días"), viajes === null ? "" : cuenta(viajes, "viaje", "viajes")]
        .filter((x) => x !== "")
        .join(", "),
    coche: (haceFalta) => (haceFalta ? "Hace falta coche" : "No hace falta coche"),
    visto: (fecha) => `visto el ${fecha}`,
    entrada: "Entrada",
    gratis: "gratis",
    edades: (desde, hasta) =>
      desde !== null && hasta !== null
        ? `de ${desde} a ${hasta} años`
        : desde !== null
          ? `desde ${desde} años`
          : hasta !== null
            ? `hasta ${hasta} años`
            : "",
    abre: (franjas) => `Ese día abre de ${franjas}`,
    cierraEseDia: "Ese día cierra",
    deA: (abre, cierra) => `${abre} a ${cierra}`,
    reservarEn: "Dónde se reserva",
    webDelSitio: "Su web",
    cerca: (metros, parada) => `A ${metros} de ${parada}`,
    cuesta: (desde, hasta) => `Suele costar de ${desde} a ${hasta}`,
  },
};

/** Si la guía sale en un idioma: si tiene sus rótulos, sus avisos y sus palabras prohibidas. */
export const hayGuiaEn = (idioma: string): boolean => (IDIOMAS_DE_LA_GUIA as readonly string[]).includes(idioma);

/** Los rótulos en el idioma del viajero. En uno en que la guía no sale no hay rótulos: no se pone otro callando. */
export function rotulosDe(idioma: string): Rotulos {
  if (!hayGuiaEn(idioma) || !Object.hasOwn(ROTULOS, idioma)) throw new Error(`la guía no sale en ${idioma}`);
  return ROTULOS[idioma];
}
