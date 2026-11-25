// Lo que dice la web, en inglés y en español. Lo que ve el viajero va en su idioma; si no es ninguno de los dos, en
// inglés. Los niveles de la ficha de cómo es se traducen aquí: el asiento los entrega por su código.
//
// Nada de aquí da por hecho cómo es el viaje. Lo que depende de un número (las noches, quiénes van, las maneras, lo
// encontrado) es una función de ese número y se lee bien con uno y con varios; lo que depende de un dato del viaje
// (cómo se llega, si hay niños) se dice a partir de ese dato y, si el dato no se conoce, con una palabra que no
// suponga nada.

import type { Transporte } from "../../../agent/output/viaje.ts";

export const IDIOMAS = ["en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Cómo se dicen los números en un idioma: la cifra sola, el nombre que concuerda con ella, los dos juntos y varios. */
function numeros(idioma: Idioma) {
  const formato = new Intl.NumberFormat(idioma);
  const enLista = new Intl.ListFormat(idioma, { type: "conjunction" });
  /** La cifra, como la escribe el idioma. */
  const cifra = (n: number): string => formato.format(n);
  /** El nombre que concuerda con el número: en los dos idiomas, solo el uno va en singular. */
  const plural = (n: number, uno: string, varios: string): string => (n === 1 ? uno : varios);
  /** La cifra con su nombre: «1 night», «3 nights». */
  const cuenta = (n: number, uno: string, varios: string): string => `${cifra(n)} ${plural(n, uno, varios)}`;
  /** Varias cifras seguidas: «4 and 7», «4, 7 y 9». */
  const lista = (ns: number[]): string => enLista.format(ns.map(cifra));
  return { cifra, plural, cuenta, lista };
}

const EN = numeros("en");
const ES = numeros("es");

/** Las noches del viaje, cuando se nombran sin contarlas: «for your nights», o «for your night» si es una sola. */
const tusNochesEn = (n: number): string => EN.plural(n, "your night", "your nights");
const tusNochesEs = (n: number): string => ES.plural(n, "tu noche", "tus noches");

/** Las maneras se cuentan con letra, que son tres como mucho. Si un día llegaran más, con su cifra. */
const cuantasEn = (n: number): string => ["no", "one", "two", "three"][n] ?? EN.cifra(n);
const cuantasEs = (n: number): string => ["ninguna", "una", "dos", "tres"][n] ?? ES.cifra(n);
const conMayuscula = (frase: string): string => frase.slice(0, 1).toUpperCase() + frase.slice(1);

// Cómo se llega, por la clase de su transporte. Si la clase no es de las de la casa, se dice sin nombrarla.
type ClaseDeTransporte = Transporte["clase"];
const TRANSPORTE_EN: Record<ClaseDeTransporte, string> = {
  flight: "the flight",
  train: "the train",
  bus: "the bus",
  car: "the car",
};
const TRANSPORTE_ES: Record<ClaseDeTransporte, string> = {
  flight: "el vuelo",
  train: "el tren",
  bus: "el autobús",
  car: "el coche",
};
const transporteEn = (clase: string): string =>
  Object.hasOwn(TRANSPORTE_EN, clase) ? TRANSPORTE_EN[clase as ClaseDeTransporte] : "transport";
const transporteEs = (clase: string): string =>
  Object.hasOwn(TRANSPORTE_ES, clase) ? TRANSPORTE_ES[clase as ClaseDeTransporte] : "el transporte";

const en = {
  buscador: {
    donde: "Where to?",
    // Tres ejemplos de clases distintas de sitio: una ciudad, una región y un espacio natural.
    ejemplos: "Kyoto, Patagonia, Serengeti",
    fechas: "When",
    ir: "Search",
    llegada: "Check-in",
    salida: "Check-out",
  },
  mundo: {
    saludo: "Where shall we go?",
    cuerpo:
      "Type a place and your dates. In seconds you see what is there and from how much. Then one button researches the whole trip, live, on this map.",
    ejemplo: "Try the recorded trip",
    seco: (grabado: string | null) =>
      grabado === null
        ? "Dry run: no trip is recorded yet. Any place flies the map."
        : `Dry run: only ${grabado} is recorded. Any place flies the map; only ${grabado} has data.`,
    // Con la casa conectada, buscar un sitio empieza un viaje de verdad.
    conCasa:
      "Search a place and your dates to start a trip of your own. The recorded one is a finished trip, to look at.",
    noEsTuyo: "That trip is not here. If it is yours, sign in to see it.",
  },
  vistazo: {
    rotulo: "First look",
    noches: (n: number) => EN.cuenta(n, "night", "nights"),
    adultos: (n: number) => EN.cuenta(n, "adult", "adults"),
    habitaciones: (n: number) => EN.cuenta(n, "room", "rooms"),
    // Los niños que lleva el viaje, con la edad de cada uno, que es lo que cambia un precio.
    ninos: (edades: number[]) =>
      edades.length === 0
        ? "no children"
        : `${EN.cuenta(edades.length, "child", "children")}, ${EN.plural(edades.length, "age", "ages")} ${EN.lista(edades)}`,
    // Lo que va debajo de un número en grande concuerda con él.
    encontrados: (n: number) => EN.plural(n, "place to stay in the area", "places to stay in the area"),
    bajados: "With the starting minimums there were not enough places with a price: they were lowered to these.",
    ensanchado: "There was little to choose from in the areas of the route: we also looked further out.",
    pasan: (n: number) => EN.plural(n, "passes the minimums", "pass the minimums"),
    desde: (noches: number) => `from, for ${tusNochesEn(noches)}`,
    minimos: (nota: number, opiniones: number, estrellas: number) =>
      estrellas > 0
        ? `Minimums: rating ${EN.cifra(nota)}, ${EN.cuenta(opiniones, "review", "reviews")}, ${EN.cuenta(estrellas, "star", "stars")}. You can change them.`
        : `Minimums: rating ${EN.cifra(nota)}, ${EN.cuenta(opiniones, "review", "reviews")}. You can change them.`,
    // El viaje no lleva ningún transporte. Por qué (sin origen, en coche, sin precio aún) no lo dice el viaje.
    sinTransporte: "There is no transport price yet: this first look is sleeping only.",
    // Sin precio de transporte para tus fechas, el de un día de al lado: se ofrece, no está en ningún total.
    alLado: (ida: string, vuelta: string, precio: string) =>
      `For a day next to yours there is one: leaving ${ida} and back ${vuelta}, from ${precio} for everyone, a saved price and not today's. It is not in any total.`,
    empezar: "Start the research",
    gasta: "From here the AI does the thinking. Nothing that spends starts without this button.",
  },
  primerVistazo: {
    // Lo que se ve antes del botón, sin cuenta y sin IA: lo cuenta el código de la casa con las fuentes.
    titulo: "What there is, before you decide",
    // Los mínimos de partida. Aquí aún no se pueden cambiar: eso llega con la investigación.
    minimos: (nota: number, opiniones: number, estrellas: number) =>
      estrellas > 0
        ? `Starting minimums: rating ${EN.cifra(nota)}, ${EN.cuenta(opiniones, "review", "reviews")}, ${EN.cuenta(estrellas, "star", "stars")}.`
        : `Starting minimums: rating ${EN.cifra(nota)}, ${EN.cuenta(opiniones, "review", "reviews")}.`,
    buscando: "Counting places to stay for your dates. It takes a few seconds.",
    otraVez: "Counting again with what you have changed.",
    // Con lo que se ha contado: el grupo que se ha supuesto, si no lo has dicho.
    paraQuien: (adultos: number, habitaciones: number) =>
      `Counted for ${EN.cuenta(adultos, "adult", "adults")} in ${EN.cuenta(habitaciones, "room", "rooms")}. If you change it, it is counted again.`,
    mirados: (mirados: number, pasan: number) =>
      `Priced ${EN.cifra(mirados)} of the ${EN.cifra(pasan)} that pass, to see where prices start.`,
    aMedias: "Not every price arrived in time: this is what came.",
    bajados: "With the starting minimums too few places passed: they were lowered to these.",
    nada: "The source has no place to stay in this area.",
    zonas: (n: number) =>
      n === 1
        ? "On the map, one area with its lowest price."
        : `On the map, ${EN.cifra(n)} areas, each with its lowest price.`,
    zona: (pasan: number) => EN.cuenta(pasan, "place passes", "places pass"),
    // Entre los aeropuertos que mira la búsqueda de transporte: el primero de salida y el primero de llegada.
    vuelos: (origen: string, destino: string) => `Cheapest days to fly this month, ${origen} to ${destino}`,
    vuelosNota: (noches: number) =>
      `Saved prices that other people's searches found in recent days, per traveller, return, for a trip of ${EN.cuenta(noches, "night", "nights")}. Today's fare can be different.`,
    tuDia: "your day",
    sinTuDia: "There is no saved price for your day yet.",
    sinOrigen: "Say where you leave from and the cheapest days to fly show up here.",
    sinVuelos: "No saved price to fly this month came in. The research looks again.",
    fallo: (clave: string, espera: number | null) =>
      clave === "busy"
        ? `Many people are looking right now. Try again in ${espera !== null && espera > 90 ? EN.cuenta(Math.ceil(espera / 60), "minute", "minutes") : EN.cuenta(espera ?? 30, "second", "seconds")}.`
        : clave === "too_slow"
          ? "The sources are slow right now and the first look did not arrive in time."
          : clave === "no_sources"
            ? "The sources cannot be reached right now."
            : clave === "unclear"
              ? "Something about the trip is still missing to count it."
              : "The first look could not be counted right now.",
    sigue: "You can still start the research.",
  },
  vivo: {
    rotulo: "Researching, live",
    titulo: "Your trip is being drawn",
    otra: "Watch again",
    ver: "See my trip",
    saltar: "Skip to the trip",
    zone: (lugar: string) => `Searching ${lugar}`,
    // Los recuentos llevan su número delante, en grande: aquí va lo que le sigue, que concuerda con él.
    lodgings_found: (n: number) => EN.plural(n, "place to stay found in the area", "places to stay found in the area"),
    lodgings_pass: (n: number) => EN.plural(n, "passes your minimums", "pass your minimums"),
    lodgings_priced: (n: number, noches: number) => `${EN.plural(n, "has", "have")} a price for ${tusNochesEn(noches)}`,
    finalist: (nombre: string) => `Finalist: ${nombre}`,
    // Qué se pudo mirar de cada alojamiento (sus fotos, su habitación, sus opiniones) depende de él: lo dice su ficha.
    looking: (nombre: string) => `Looking at what ${nombre} is like`,
    looked: (nombre: string) => `Looked at ${nombre}, as far as it could be seen`,
    sights_found: (n: number) => EN.plural(n, "sight worth your time", "sights worth your time"),
    sight: (nombre: string) => nombre,
    day: (n: number, nombre: string) => `Day ${n} drawn: ${nombre}`,
    way: (id: string) => `A way to do it: ${id}`,
    lever: () => "A change that saves money",
    done: () => "Your trip is on the map",
    stopped: () => "The research has stopped here",
    retry: (paso: string) => (paso === "" ? "You asked to try this step again" : `You asked to try again: ${paso}`),
    conductor: (ref: string) =>
      (
        ({
          looking: "Looking at why it stopped",
          retry: "One more try at this step",
          told: "Looked at why it stopped",
        }) as Record<string, string>
      )[ref] ?? null,
  },
  viaje: {
    rotulo: "Your trip",
    // El viaje solo dice si alguna parte está puesta a mano, no cuál.
    muestra: "Sample: part of this trip was set by hand, not by the agent.",
    todos: "All",
    dia: (n: number) => `Day ${n}`,
    ritmo: "Pace",
    ritmos: { calm: "Calm", normal: "Normal", full: "Full" },
    paradas: (n: number) => EN.cuenta(n, "stop", "stops"),
    sinParadas: "A free day.",
    andando: (lejos: string, min: number) => `${lejos} on foot, about ${min} min`,
    // A pie, medido por la fuente de rutas, con sus cuestas: no es una cuenta.
    andandoMedido: (lejos: string, min: number) => `${lejos} on foot, ${min} min`,
    // Un trayecto que no se anda: lo que hay y las maneras que tienen sentido, con un tiempo aproximado.
    cogiendo: (lejos: string, min: number, maneras: string[]) =>
      `${lejos}: ${maneras.join(" or ")}, about ${min} min (rough estimate)`,
    // Lo mismo, con el coche medido por la fuente de rutas: sin tráfico.
    enCoche: (lejos: string, min: number, maneras: string[]) =>
      `${lejos}: ${maneras.join(" or ")}; by car, ${min} min without traffic`,
    maneraDeIr: { walk: "on foot", transit: "by public transport", car: "by car" } as Record<string, string>,
    noSeAnda:
      "Part of this trip is not walked. Times by car or public transport are approximate: what transport there is and what it costs is not known yet.",
    noSeAndaSinTrafico:
      "Part of this trip is not walked. Times by car are without traffic, and times by public transport are rough estimates: what transport there is and what it costs is not known yet.",
    enMapas: "Open in Google Maps",
    diaEnMapas: "The whole day in Google Maps",
    comoIr: "See how to get there, in Google Maps",
    desdeLaCama: (tramo: string) => `From where you sleep: ${tramo}`,
    imprescindible: "Not to miss",
    // En inglés se dice igual de una parada que de varias; en español, no.
    fuera: (_n: number) => "Left out at this pace",
    // Lo que el código dejó fuera por la distancia, no por el ritmo: ni con más paradas al día entraría.
    fueraLejos: (_n: number) => "Too far to fit in your days",
    // Las maneras que tenga el viaje: una, dos o tres.
    maneras: (n: number) =>
      n === 0 ? "No way to do it yet" : `${conMayuscula(cuantasEn(n))} ${EN.plural(n, "way", "ways")} to do it`,
    manera: { cheapest: "The cheapest", best_value: "Best for what it costs", different: "A different one" },
    soloDormir: "sleeping only",
    gana: "You gain",
    pierde: "You give up",
    palancas: "What each change saves",
    ahorra: (dinero: string) => `−${dinero}`,
    avisos: "Good to know",
    verAlojamiento: "See this place",
    cerrar: "I'll take this one",
  },
  ficha: {
    volver: "Back to the trip",
    habitacion: "The room at this price",
    metros: (m: number) => `${EN.cifra(m)} m²`,
    sinMetros: "size not given",
    comoEs: "What it is really like",
    comoEsNota: "Looked at blind: without the name, the price, the rating or the stars.",
    fotosDelSitio: "Photos of the place, not of that room",
    seDice: "What guests say",
    prueba: { photo: "see the photo", review: "from the reviews", sheet: "from its listing" } as Record<string, string>,
    avisos: {
      no_detail: "The source gave no details of this place: we know its price, not what it is like.",
      room_unknown: "We do not know which room this price is for.",
      no_room_photos: "The source has no photos of the room at this price, so nobody could look at it.",
      no_reviews: "There are no reviews of this place to read.",
    } as Record<string, string>,
    precio: (noches: number) => `Price for ${tusNochesEn(noches)}`,
    visto: (cuando: string) => `seen on ${cuando}`,
    otras: (n: number) => EN.plural(n, "Another seller", "Other sellers"),
    nota: (n: number, op: number) => `rated ${EN.cifra(n)} by ${EN.cuenta(op, "guest", "guests")}`,
    estrellas: (n: number) => EN.cuenta(n, "star", "stars"),
    sinMirar: "Not looked at yet.",
  },
  campos: {
    look: "How it looks",
    upkeep: "How it is kept",
    style: "Style",
    room_space: "Space",
    room_light: "Light",
    bathroom: "Bathroom",
    view: "View",
    gym: "Gym",
    pool: "Pool",
  } as Record<string, string>,
  niveles: {
    new_or_renovated: "new or renovated",
    good_condition: "in good condition",
    dated: "dated",
    worn: "worn",
    well_kept: "well kept",
    some_complaints: "some complaints",
    neglected: "neglected, guests say",
    modern_plain: "modern and plain",
    classic: "classic",
    character: "with character",
    chain: "chain standard",
    rustic: "rustic",
    roomy: "roomy",
    fits: "tight but fits",
    tight: "tight",
    bright: "bright",
    average: "average",
    dark: "dark",
    modern: "modern",
    correct: "in good order",
    open: "open",
    street: "onto the street",
    inner_or_wall: "onto a courtyard or a wall",
    full: "full",
    maintenance: "enough to keep up",
    token: "token",
    none: "none",
    swim: "to swim",
    bathe: "to bathe",
    dip: "a plunge",
    unknown: "not known",
  } as Record<string, string>,
  temas: {
    cleanliness: "Cleanliness",
    maintenance: "Upkeep",
    noise: "Noise",
    room_size: "Room size",
    bed: "The bed",
    bathroom: "The bathroom",
    light: "Light",
    temperature: "Temperature",
    smell: "Smells",
    view: "The view",
    breakfast: "Breakfast",
    food: "Food",
    staff: "The staff",
    location: "Location",
    access: "Getting in",
    parking: "Parking",
    wifi: "Wifi",
    gym: "The gym",
    pool: "The pool",
    common_areas: "Common areas",
    kitchen: "The kitchen",
    privacy: "Privacy",
    safety: "Safety",
    value: "Value for money",
  } as Record<string, string>,
  tonos: { good: "guests like it", bad: "complaints", mixed: "mixed opinions" } as Record<string, string>,
  menciones: {
    one: "in one review",
    a_few: "in a few reviews",
    several: "in several reviews",
  } as Record<string, string>,
  carril: { planear: "Plan", viajes: "Trips", clave: "AI key", cuenta: "Account", portada: "El Dorado, home" },
  cargando: "Unfolding the map",
  pestanas: { days: "Days", stay: "Sleep", money: "Money", notes: "Notes" },
  cifras: {
    // Lo que cubre el total de la manera elegida: las noches o, si lleva transporte, también cómo se llega.
    total: (noches: number, transporte: string | null) =>
      transporte === null ? `for ${tusNochesEn(noches)}` : `${tusNochesEn(noches)} and ${transporteEn(transporte)}`,
    paradas: (n: number) => EN.plural(n, "stop", "stops"),
    andando: "on foot",
    entreParadas: "between stops",
  },
  acciones: {
    quitar: "Remove",
    mover: "Move to day",
    anadir: "Add",
    quitadas: (_n: number) => "Removed by you",
    reponer: "Put back",
    tuya: "Added by you",
  },
  dormir: {
    otros: (n: number) => EN.plural(n, "Another that passed the minimums", "Others that passed the minimums"),
    ficha: "See it",
    elegir: "Sleep here",
    donde: (zona: string | null, min: number | null, aPie: boolean) =>
      [
        zona === null ? "" : `Around ${zona}.`,
        min === null
          ? ""
          : aPie
            ? `Half of what you will see is within ${min} min on foot.`
            : `Half of what you will see is about ${min} min away by car or public transport.`,
      ]
        .filter((x) => x !== "")
        .join(" "),
    puntos: (n: number) => `Our score: ${EN.cifra(n)} out of 10`,
    noVale: "Not for you",
    leFalta: (cosa: string, nivel: string) => `You marked "${cosa}" as a must, and here it is "${nivel}".`,
    quejas: (queja: string, cuantas: string) => `Guests report something serious, ${cuantas}: ${queja}.`,
    queja: {
      pests: "pests in the room",
      mould: "mould",
      theft: "something stolen",
      scam: "a scam",
      unsafe: "not feeling safe",
    } as Record<string, string>,
  },
  parada: {
    reservar: "Book ahead",
    sinReserva: "No booking needed",
    hora: {
      morning: "Best in the morning",
      afternoon: "Best in the afternoon",
      evening: "Best at the end of the day",
    } as Record<string, string>,
  },
  cuentas: {
    // Lo que lleva el total de la manera marcada, por su nombre. Cómo se llega se dice por su clase, y que su precio
    // es guardado, solo si lo es.
    incluye: (manera: string, transporte: { clase: string; guardado: boolean } | null) => {
      if (transporte === null) return `${manera}: sleeping only. Its total carries no transport price.`;
      const como = transporteEn(transporte.clase);
      const guardado = ` The price of ${como} is a saved one, seen days ago: it is asked for again when you close the trip.`;
      return `${manera}: sleeping and ${como}.${transporte.guardado ? guardado : ""}`;
    },
    lado: (n: number) =>
      n === 0 ? "Nothing to add up yet" : n === 1 ? "What the one way costs" : `The ${cuantasEn(n)} ways, side by side`,
    fecha: "Every price carries the date it was seen. They are checked again when you close the trip.",
  },
  preguntas: {
    titulo: "While I search",
    origen: "Leaving from",
    origenOpciones: ["Where I am now", "Somewhere else"],
    quienes: "Who is going",
    ninos: (n: number) => (n === 0 ? "no children" : EN.cuenta(n, "child", "children")),
    menos: "One fewer",
    mas: "One more",
    edad: (n: number) => `Age of child ${n}`,
    edadSinDecir: "Age?",
    anos: (n: number) => (n === 0 ? "Under 1" : EN.cuenta(n, "year", "years")),
    fechas: "Your dates",
    fechasOpciones: ["Fixed", "I can move them"],
    gasto: "Spend",
    gastoOpciones: ["Tight", "Medium", "Comfortable"],
    buscas: "What you are after",
    // Para cualquier viaje, no solo una escapada a una ciudad: también la naturaleza, la playa, los niños y la carretera.
    buscasOpciones: [
      "The essentials",
      "Eat well",
      "Culture",
      "Nature",
      "Beach",
      "Rest",
      "Nightlife",
      "Plans with children",
      "A road trip",
    ],
    libre: "Anything else I should know?",
    seco: "Dry run: your answers do not change the recorded trip yet.",
  },
  // Empezar un viaje de verdad: las preguntas, lo que he entendido y el botón.
  empezar: {
    rotulo: "New trip",
    entra: "Sign in to start",
    ponClave: "Add your AI key to start",
    preguntas: "A few taps, and I start",
    origenDonde: "City you leave from",
    dondeEstoy: "Where I am now",
    sinUbicacion: "I could not tell where you are. Type the city you leave from.",
    moneda: "Prices in",
    monedaSinDecir: "Currency?",
    pasaporte: "Passport",
    pasaporteDe: (n: number) => `Passport of traveller ${n}`,
    paisSinDecir: "Country?",
    mismo: "Same for everyone",
    distintos: "Not all the same",
    moverse: "Moving around",
    variosSitios: "See more than one place",
    salirDelPais: "Leaving the country is fine",
    cuanto: "How much you want to move",
    cuantoOpciones: { little: "Little", some: "Some", a_lot: "A lot" },
    si: "Yes",
    no: "No",
    reservado: "I already have something booked",
    reservadoQue: "What is booked?",
    entendido: "What I have understood",
    sinOrigen: "Without where you leave from, I will not look for transport.",
    supuesto: "assumed",
    falta: "Before I start, tell me:",
    faltas: {
      currency: "the currency you want prices in",
      "travellers.children": "the age of each child",
      "travellers.passports": "where you leave from, or your passport",
      "destination.country": "a destination I can place in a country: search for it again",
      "origin.country": "the city you leave from, picked from the list",
    } as Record<string, string>,
    // Lo que la puerta 1 puede no ver claro, por su campo.
    campos: {
      dates: "the dates",
      "travellers.rooms": "the rooms: at least one adult in each",
      "travellers.children": "the children",
      "travellers.adults": "the adults",
      "travellers.passports": "the passports",
      currency: "the currency",
      destination: "the destination",
      origin: "where you leave from",
    } as Record<string, string>,
    confirmar: "Confirm and research",
    fallo: (clave: string, campos: string[]): string => {
      const frases: Record<string, string> = {
        no_ai: "The research is not connected on this site yet.",
        bad_ceiling: "Say how much it may spend at most: a number above zero.",
        no_key: "Add your AI key first.",
        unclear: `This is not clear yet: ${campos.join(", ")}.`,
        already_running: "This trip is already being researched.",
        not_now: "This trip cannot be started now.",
        too_many: "This step has been tried again as many times as it can. You can change what you asked.",
        too_many_trips: "You have too many trips. Open one you already have.",
        house_full: "El Dorado cannot take new trips right now. Try again later.",
        no_session: "Your session has ended. Sign in again.",
      };
      return frases[clave] ?? "Something went wrong. Try again in a moment.";
    },
  },
  // La investigación de un viaje tuyo, contada por la casa mientras pasa.
  casa: {
    titulo: "Researching your trip",
    esperando: "Getting ready",
    pasos: {
      understood: "Checking what I understood",
      sights: "Finding what there is to see",
      route: "Deciding where to sleep",
      search: "Searching places to stay",
      look: "Looking at each finalist",
      pick: "Choosing what to see",
      days: "Laying out the days",
      table: "Adding it all up",
      cross: "Crossing it with what you asked",
      explain: "Writing why",
      calendar: "Looking at your dates",
      papers: "Checking your papers",
      trip: "Drawing your trip",
    } as Record<string, string>,
    gastado: (gastado: string, techo: string | null) =>
      techo === null ? `Spent so far: ${gastado}` : `Spent so far: ${gastado} of ${techo} at most`,
    gastoSinSaber: "What it has spent is not known yet.",
    parado: (paso: string) => `It stopped here: ${paso}. Nothing more is spent until you say so.`,
    otraVez: "Try again",
    ver: "See my trip",
    // Un run parado: qué clase de parada es y qué puedes hacer, por las claves de la casa (agent/data/conductor.ts).
    mirando: "I am looking at why it stopped. Nothing else is spent meanwhile.",
    queHaPasado: {
      seat_kept_failing:
        "This step did not pass its checks, even after trying again. What it found is not shown, so that nothing unchecked reaches you.",
      seat_did_not_finish: "This step did not finish its work.",
      not_possible_yet: "This is a kind of trip I cannot plan yet.",
      nothing_found: "I found nothing to work with for what you asked.",
      spend_ceiling: "It reached the most you agreed to spend.",
      house_broke: "Something went wrong on my side.",
    } as Record<string, string>,
    queHacer: "What you can do",
    soloEstePaso: "Trying again repeats only this step. What is already done stays as it is, and is not paid again.",
    salidas: {
      retry: "Try again",
      change_request: "Change what you asked",
      continue_without: "Go on without this part",
    } as Record<string, string>,
  },
  // Tu confirmación de lo que he entendido de lo que escribiste (5.2): tus palabras, y lo demás por claves.
  escucha: {
    rotulo: "Your turn",
    titulo: "What I have understood",
    sub: "From what you wrote, in your words. Check it: nothing more is spent until you confirm.",
    otraVuelta: "With your answers, read again.",
    gustos: "What you prefer",
    limites: "What must not happen",
    reservado: "Already booked",
    choca: "What does not fit",
    nadaChoca: "Nothing clashes with what you told me.",
    nadaQueSeparar: "I found nothing to keep from what you wrote.",
    preguntas: "A few questions",
    preguntasSub: "Answer the ones you want and I will read your words again. Or confirm without answering.",
    tuRespuesta: "Your answer",
    pesos: { must: "A must", like: "I like it", indifferent: "I don't mind" } as Record<string, string>,
    cosas: {
      views: "Views",
      gym: "A gym",
      pool: "A pool",
      space: "A roomy room",
      light: "A bright room",
      bathroom: "A modern bathroom",
      new: "New or renovated",
    } as Record<string, string>,
    peso: "How much it weighs",
    quitar: "Remove",
    devolver: "Keep it",
    quitado: "Removed: I will not use it",
    conQue: {
      budget: "your budget",
      dates: "your dates",
      travellers: "who travels",
      pace: "your pace",
      moving: "how you want to move",
    } as Record<string, string>,
    noCasa: (con: string) => `does not fit with ${con}`,
    noCasaCon: (otra: string) => `does not fit with “${otra}”`,
    /** Las comillas con que se citan tus palabras. */
    comillas: '"“" "”"',
    contestar: "Send my answers",
    confirmar: "Confirm and go on",
    enviando: "Sending",
    tusPalabras: "What you wrote I will read once you start, and I will show you what I understood before going on.",
  },
  // Los avisos de las fechas (5.3): cada uno por su clase y su tema, con sus días y su fuente.
  fechas: {
    titulo: "Your dates",
    clase: {
      blocks: "It blocks",
      raises: "It raises prices",
      bothers: "It gets in the way",
      favours: "In your favour",
    } as Record<string, string>,
    tema: {
      weather: "The usual weather",
      season: "The season",
      festival: "A festival",
      event: "An event",
      public_holiday: "A public holiday there",
      holiday_at_home: "A holiday where you leave from",
      closure: "Something closes",
      sells_out: "It sells out months ahead",
      days_needed: "The days it asks for",
    } as Record<string, string>,
    deA: (desde: string, hasta: string) => (desde === hasta ? desde : `${desde} to ${hasta}`),
    tuyos: (n: number, total: number) =>
      n === 0 ? "Not on your days" : n >= total ? "All your days" : `${n} of your ${total} days`,
    pide: (dias: number, tuyos: number) => `It asks for ${EN.cuenta(dias, "day", "days")}; your trip has ${tuyos}.`,
    precio: (dinero: string) => `Price on the page: ${dinero}`,
    fuente: (visto: string | null) => (visto === null ? "Source (no date given)" : `Source, dated ${visto}`),
    ventanas: "Other dates you could take",
    ventana: (desde: string, hasta: string, dias: number) =>
      `${desde} to ${hasta}, ${EN.cuenta(Math.abs(dias), "day", "days")} ${dias < 0 ? "earlier" : "later"}`,
    evita: "You avoid",
    alcanza: "You reach",
    pierde: "You give up",
    entra: "You run into",
    faltan: {
      failed: "The check of your dates did not arrive. Your trip is made without it.",
      rejected: "The check of your dates did not pass our checks. Your trip is made without it.",
    } as Record<string, string>,
    nada: "Nothing in your dates that changes the trip.",
    nota: "From the pages linked, on the date they give. Check them before you book.",
  },
  // La tabla de los papeles (5.4): cada casilla por sus claves, con su fuente oficial y los plazos del código.
  papeles: {
    titulo: "Your papers",
    sub: "What the official sources ask for. Whether you meet it, only your documents say: check before you go.",
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
    } as Record<string, string>,
    estado: {
      in_order: "Nothing asked",
      to_do: "Something to do",
      warning: "Worth knowing",
      blocks: "It blocks",
      doubtful: "Unclear",
    } as Record<string, string>,
    duda: {
      sources_disagree: "The official sources disagree",
      no_official_source: "We have no official source for this country",
      not_found: "Not found on an official page",
    } as Record<string, string>,
    viajero: (pasaporte: string, edad: number | null, cuantos: number) =>
      `${EN.cuenta(cuantos, "traveller", "travellers")} with a ${pasaporte} passport${edad === null ? "" : `, aged ${edad}`}`,
    hasta: (fecha: string) => `The passport has to be valid until at least ${fecha}`,
    antesDe: (fecha: string, tarde: boolean) => (tarde ? `It had to be done by ${fecha}` : `Do it before ${fecha}`),
    coste: (dinero: string) => `It costs ${dinero}`,
    lado: { destination: "Government of the destination", home: "Your ministry" } as Record<string, string>,
    fuente: (lado: string, visto: string) => `${lado}, dated ${visto}`,
    enRegla: "Nothing asked",
    fuera: {
      transit_unknown: "Changing planes is checked once your transport is chosen.",
      own_country: "Nothing to check for whoever travels within the country of their own passport.",
    } as Record<string, string>,
    faltan: {
      failed: "We could not check your papers.",
      rejected: "The check of your papers did not pass our checks.",
    } as Record<string, string>,
    bloquean: "Something in your papers stops this trip.",
    decide: "Nothing more is spent until you decide. You can go on anyway, knowing it.",
    seguir: "Go on anyway",
    seguido: "You chose to go on with this.",
  },
  panel: {
    titulo: "Your trips",
    sub: "Each one stays here, where you left it.",
    nuevo: "Start a trip",
    nuevoTexto: "Where and when. The rest is asked while it already searches.",
    estado: "On the map",
    ejemplo: "An example, already on the map",
    gastoIA: (usd: string) => `AI ${usd}`,
    // Cómo está cada viaje tuyo, por su estado en la casa.
    estados: {
      started: "Not confirmed yet",
      confirmed: "Ready to research",
      researching: "Being researched",
      on_map: "On the map",
      closed: "Closed",
    },
    aun: "It will open here when it is on the map.",
    sinNombre: "A trip without a place yet",
    espera: "Waiting for you: choose how to sleep and close the trip.",
    abrir: "Open the trip",
    vacio: "No trips yet. The first one starts on the map.",
  },
  clave: {
    titulo: "Your AI key",
    cuerpo:
      "El Dorado thinks with Claude. You pay the AI yourself, for what you use, with your own key. You paste it once: it is stored encrypted, used only for your trips, never shown whole again, and you delete it whenever you want.",
    campo: "Claude API key",
    otra: "Replace it with another key",
    guardar: "Save the key",
    quitar: "Delete the key",
    puesta: "Your key, saved and encrypted",
    acaba: (pista: string) => `ends in ${pista}`,
    entra: "To save a key you need an account. Go to",
    sinClave: "Without a key you can look around and open the first look. Research needs it.",
    gasto: "What each trip has spent",
    sinGasto: "Nothing yet: no trip has been researched.",
    mirandoGasto: "Adding up what your trips have spent",
    llamadas: (n: number) => EN.cuenta(n, "AI call", "AI calls"),
    investigaciones: (n: number) => EN.cuenta(n, "research", "researches"),
    ultima: (dia: string) => `last on ${dia}`,
    sinSaberUno: "Part of it is not known: at least this.",
    total: "All your trips",
    sinSaberTotal: "Part of it is not known, so the total is at least this.",
    siguiente: (usd: string, n: number) =>
      `The next research should cost about ${usd}: what ${n === 1 ? "your finished one" : `your ${EN.cifra(n)} finished ones`} cost on average.`,
    sinSiguiente: "What the next research will cost is not known yet. It will be once one of yours has finished.",
    comoClave:
      "Your account thinks with this site's Claude account: these amounts are what it would have cost with a key, not a charge.",
    sinGastoCasa: "Spending could not be read right now.",
    deLaCasa:
      "Your account thinks with this site's own Claude account: you don't need a key to research. If you save one, it stays in your account, encrypted, for later.",
  },
  cuenta: {
    titulo: "Your account",
    sub: "With an account, your trips and your AI key are yours and nobody else's. An email and a password are enough.",
    mirando: "Checking who you are",
    crear: "Create an account",
    entrar: "Sign in",
    correo: "Email",
    contrasena: "Password",
    pista: "At least 10 characters. A long phrase is better than a short puzzle.",
    botonCrear: "Create my account",
    botonEntrar: "Sign in",
    dentro: "Signed in as",
    salir: "Sign out",
    sinClave: "No AI key yet. Research needs one.",
    conClave: (pista: string) => `Your AI key is saved. It ends in ${pista}.`,
    ponClave: "Add my AI key",
    verClave: "My AI key",
    sinCasa: "Accounts are not connected on this site yet. You can still look at the recorded trip.",
    // Lo que puede fallar, por su clave: lo dice la web, en el idioma de quien mira.
    fallo: (clave: string, espera?: number): string => {
      const minutos = Math.max(1, Math.ceil((espera ?? 60) / 60));
      const frases: Record<string, string> = {
        bad_email: "That does not look like an email address.",
        bad_password: "The password needs at least 10 characters, and it cannot be your email.",
        exists: "There is already an account with that email. Sign in instead.",
        bad_login: "The email or the password is not right.",
        too_many_attempts: `Too many tries. Wait ${minutos} ${minutos === 1 ? "minute" : "minutes"} and try again.`,
        busy: "Many people are signing in right now. Try again in a moment.",
        house_full: "El Dorado cannot take new accounts right now. Try again later.",
        bad_key: "That does not look like an API key. Paste it whole, with no spaces.",
        key_rejected: "Claude did not accept that key. Check it is whole, active, and has access to the API.",
        ai_unreachable: "We could not reach Claude to check your key. Nothing was saved. Try again in a moment.",
        no_session: "Your session has ended. Sign in again.",
        no_house: "Accounts are not connected on this site yet.",
        house_down: "We could not reach El Dorado. Try again in a moment.",
      };
      return frases[clave] ?? "Something went wrong. Try again in a moment.";
    },
  },
  // Cerrar el viaje (8.4) y los enlaces de reserva (3.13): todo por claves; la única frase de fuera es la del que explica.
  cerrar: {
    pestana: "Book",
    antes: "Before you book, we ask every price again. It takes a few seconds.",
    etapa: {
      prices: "Asking every price again",
      yours: "A price has changed",
      links: "Checking the links",
      order: "Writing the order to book",
      check: "Checking it all fits",
      done: "Your trip is closed",
      stopped: "We could not close your trip. It stays as it was: try again in a moment.",
    } as Record<string, string>,
    fallo: "We could not close your trip now. Try again in a moment.",
    subio: "Since you saw it, the total has gone up a lot, or a piece has no price today. Do you still keep this trip?",
    sigo: "Keep it, with today's prices",
    noAhora: "Not now",
    titulo: "Your trip, closed",
    cerradoEl: (fecha: string) => `Closed on ${fecha}, with that day's prices.`,
    noReserva:
      "El Dorado proposes and links: it does not book or charge. You book each thing yourself, on the seller's website.",
    precios: "Today's prices",
    cambio: (c: string, diferencia: string) =>
      ({
        same: "same as when you saw it",
        up: `up ${diferencia} since you saw it`,
        down: `down ${diferencia} since you saw it`,
        gone: "no price today",
        unknown: "we could not ask for it today",
      })[c] ?? "",
    visto: (dinero: string) => `you saw ${dinero}`,
    caducado: "older than we accept: check it where you book",
    guardado: "a saved price, from days ago",
    total: "Total today",
    totalSinSaber: "A piece has no price today, so the total is not known.",
    orden: "In this order",
    pieza: {
      lodging: "Where you sleep",
      transport: "How you get there",
      sight: "A ticket to book ahead",
    } as Record<string, string>,
    razon: {
      price_moves: "its price moves",
      saved_price: "its price is a saved one",
      not_cancellable: "it cannot be cancelled",
      cancel_unknown: "we do not know if it can be cancelled",
      cancellable: "it can be cancelled",
      book_ahead: "it is booked ahead",
    } as Record<string, string>,
    papeles: "Your papers, by when",
    sinConfirmar: "Not confirmed",
    duda: {
      price_gone: (de: string) => `${de}: no price today.`,
      price_unknown: (de: string) => `${de}: we could not ask for today's price.`,
      price_stale: (de: string) => `${de}: its price is older than we accept.`,
      saved_price: (de: string) => `${de}: the price is a saved one, seen days ago by someone else.`,
      cancel_unknown: (de: string) => `${de}: we do not know if it can be cancelled.`,
      arrival_unknown: () => "We cannot tell whether your arrival fits the check-in.",
      arrival_off: () => "Your arrival does not fall on the day you check in.",
      no_link: (de: string) => `${de}: the source gave no page to book it.`,
      link_down: (de: string) => `${de}: a link did not answer today.`,
      link_unchecked: (de: string) => `${de}: a link could not be checked.`,
      papers_doubtful: (pais: string) => `Your papers for ${pais}: something is unclear.`,
      papers_late: (pais: string) => `Your papers for ${pais}: a deadline has passed.`,
    } as Record<string, (de: string) => string>,
    llegada: {
      ok: (h: string | null) =>
        h === null ? "Your arrival fits the check-in." : `Your arrival fits the check-in, from ${h}.`,
      early: (h: string | null) =>
        `You arrive hours before the check-in${h === null ? "" : `, from ${h}`}: ask to leave your bags.`,
      next_day: () => "You arrive the day after you check in: that night is paid and not used.",
      day_before: () => "You arrive the day before you check in: that night has no bed.",
      unsure: () => "You arrive near midnight: we cannot tell which day.",
      no_transport: () => "This way has no transport, so we cannot check your arrival.",
      no_hours: () => "We do not know the times of your transport, so we cannot check your arrival.",
      no_check_in: () => "We do not know from what time you can check in.",
    } as Record<string, (h: string | null) => string>,
    enlaces: "Where to book",
    clase: {
      where_priced: "Where we saw the price",
      search: "Search with your dates",
      own_site: "The place's own website (not where we saw the price)",
    } as Record<string, string>,
    comprobado: {
      ok: "",
      unchecked: "We could not check this link.",
      down: "This link did not answer today.",
    } as Record<string, string>,
    mapas: "On Google Maps",
    dondeDuermes: "Where you sleep",
    dia: (n: number, fecha: string) => `Day ${n}, ${fecha}`,
    sinFrases: "The order is ours: this time without notes.",
  },
  portada: {
    entrar: "Open the map",
    panel: "Your trips",
    lema: "Your whole trip, drawn on the map",
    cuerpo:
      "Say where and when. El Dorado researches it live: where to sleep, how to get there and what to see each day, at the best price it can find. Every price with its link and its date.",
    pasos: [
      ["Where and when", "Two answers on a world map. Nothing else to start."],
      ["Watch it research", "Every pulse on the map is a real search. You answer a few taps while it works."],
      ["Your trip, day by day", "Each day a layer, three ways to sleep, and what each change saves."],
    ],
    cuida: "What it takes care of",
    cuidados: [
      "Nothing made up: what is not found is said as not known.",
      "No price without its link and the date it was seen.",
      "It proposes and links. It does not book or charge.",
      "A place to stay is looked at blind: the room at that price, not the suite.",
    ],
    beta: "In the making. Not open to the public yet.",
  },
  foto: (autor: string, licencia: string) => `Photo: ${autor}, ${licencia}`,
  ia: "Made with AI: it can be wrong. Prices are indicative and carry the date they were seen.",
};

type Textos = typeof en;

const es: Textos = {
  buscador: {
    donde: "¿A dónde vamos?",
    ejemplos: "Kioto, Patagonia, Serengeti",
    fechas: "Cuándo",
    ir: "Buscar",
    llegada: "Entrada",
    salida: "Salida",
  },
  mundo: {
    saludo: "¿A dónde vamos?",
    cuerpo:
      "Escribe un sitio y tus fechas. En segundos ves lo que hay y desde cuánto. Después, un botón investiga el viaje entero, en vivo, sobre este mapa.",
    ejemplo: "Prueba con el viaje grabado",
    seco: (grabado) =>
      grabado === null
        ? "En seco: aún no hay ningún viaje grabado. Cualquier sitio mueve el mapa."
        : `En seco: solo hay grabado un viaje a ${grabado}. Cualquier sitio mueve el mapa; solo ${grabado} tiene datos.`,
    conCasa: "Busca un sitio y tus fechas para empezar un viaje tuyo. El grabado es un viaje ya hecho, para mirarlo.",
    noEsTuyo: "Ese viaje no está aquí. Si es tuyo, entra con tu cuenta para verlo.",
  },
  vistazo: {
    rotulo: "Primer vistazo",
    noches: (n) => ES.cuenta(n, "noche", "noches"),
    adultos: (n) => ES.cuenta(n, "adulto", "adultos"),
    habitaciones: (n) => ES.cuenta(n, "habitación", "habitaciones"),
    ninos: (edades) =>
      edades.length === 0
        ? "sin niños"
        : `${ES.cuenta(edades.length, "niño", "niños")}, de ${ES.lista(edades)} ${edades.length === 1 ? ES.plural(edades[0], "año", "años") : "años"}`,
    encontrados: (n) => ES.plural(n, "alojamiento en la zona", "alojamientos en la zona"),
    bajados: "Con los mínimos de partida no había bastantes alojamientos con precio: se han bajado a estos.",
    ensanchado: "En las zonas de la ruta había poco donde elegir: también se ha buscado más lejos.",
    pasan: (n) => ES.plural(n, "pasa los mínimos", "pasan los mínimos"),
    desde: (noches) => `desde, por ${tusNochesEs(noches)}`,
    minimos: (nota, opiniones, estrellas) =>
      estrellas > 0
        ? `Mínimos: nota ${ES.cifra(nota)}, ${ES.cuenta(opiniones, "opinión", "opiniones")} y ${ES.cuenta(estrellas, "estrella", "estrellas")}. Los puedes cambiar.`
        : `Mínimos: nota ${ES.cifra(nota)} y ${ES.cuenta(opiniones, "opinión", "opiniones")}. Los puedes cambiar.`,
    sinTransporte: "Todavía no hay ningún precio de transporte: este primer vistazo es solo dormir.",
    alLado: (ida, vuelta, precio) =>
      `Para un día de al lado sí lo hay: saliendo el ${ida} y volviendo el ${vuelta}, desde ${precio} para todos, guardado y no de hoy. No está en ningún total.`,
    empezar: "Empezar la investigación",
    gasta: "Desde aquí piensa la IA. Nada que gaste arranca sin este botón.",
  },
  primerVistazo: {
    titulo: "Lo que hay, antes de decidir",
    minimos: (nota, opiniones, estrellas) =>
      estrellas > 0
        ? `Mínimos de partida: nota ${ES.cifra(nota)}, ${ES.cuenta(opiniones, "opinión", "opiniones")} y ${ES.cuenta(estrellas, "estrella", "estrellas")}.`
        : `Mínimos de partida: nota ${ES.cifra(nota)} y ${ES.cuenta(opiniones, "opinión", "opiniones")}.`,
    buscando: "Contando alojamientos para tus fechas. Tarda unos segundos.",
    otraVez: "Volviendo a contar con lo que has cambiado.",
    paraQuien: (adultos, habitaciones) =>
      `Contado para ${ES.cuenta(adultos, "adulto", "adultos")} en ${ES.cuenta(habitaciones, "habitación", "habitaciones")}. Si lo cambias, se vuelve a contar.`,
    mirados: (mirados, pasan) =>
      `Con precio pedido a ${ES.cifra(mirados)} de los ${ES.cifra(pasan)} que pasan, para ver desde dónde empiezan.`,
    aMedias: "No todos los precios llegaron a tiempo: esto es lo que llegó.",
    bajados: "Con los mínimos de partida pasaban muy pocos: se han bajado a estos.",
    nada: "La fuente no tiene ningún alojamiento en esta zona.",
    zonas: (n) =>
      n === 1
        ? "En el mapa, una zona con su precio más bajo."
        : `En el mapa, ${ES.cifra(n)} zonas, cada una con su precio más bajo.`,
    zona: (pasan) => ES.cuenta(pasan, "pasa", "pasan"),
    vuelos: (origen, destino) => `Los días más baratos para volar este mes, de ${origen} a ${destino}`,
    vuelosNota: (noches) =>
      `Precios guardados que encontraron búsquedas de otras personas en los últimos días, por viajero, ida y vuelta, para un viaje de ${ES.cuenta(noches, "noche", "noches")}. La tarifa de hoy puede ser otra.`,
    tuDia: "tu día",
    sinTuDia: "Para tu día aún no hay ningún precio guardado.",
    sinOrigen: "Di de dónde sales y aquí salen los días más baratos para volar.",
    sinVuelos: "No ha llegado ningún precio guardado para volar este mes. La investigación lo vuelve a mirar.",
    fallo: (clave, espera) =>
      clave === "busy"
        ? `Ahora mismo mira mucha gente. Prueba otra vez en ${espera !== null && espera > 90 ? ES.cuenta(Math.ceil(espera / 60), "minuto", "minutos") : ES.cuenta(espera ?? 30, "segundo", "segundos")}.`
        : clave === "too_slow"
          ? "Las fuentes van lentas ahora mismo y el primer vistazo no ha llegado a tiempo."
          : clave === "no_sources"
            ? "Ahora mismo no se llega a las fuentes."
            : clave === "unclear"
              ? "Aún falta algo del viaje para poder contarlo."
              : "Ahora mismo no se ha podido contar el primer vistazo.",
    sigue: "Puedes empezar la investigación igual.",
  },
  vivo: {
    rotulo: "Investigando, en vivo",
    titulo: "Tu viaje se está dibujando",
    otra: "Volver a verla",
    ver: "Ver mi viaje",
    saltar: "Ir al viaje",
    zone: (lugar) => `Buscando en ${lugar}`,
    lodgings_found: (n) => ES.plural(n, "alojamiento encontrado en la zona", "alojamientos encontrados en la zona"),
    lodgings_pass: (n) => ES.plural(n, "pasa tus mínimos", "pasan tus mínimos"),
    lodgings_priced: (n, noches) => `${ES.plural(n, "tiene", "tienen")} precio para ${tusNochesEs(noches)}`,
    finalist: (nombre) => `Finalista: ${nombre}`,
    looking: (nombre) => `Mirando cómo es ${nombre}`,
    looked: (nombre) => `Mirado ${nombre}, hasta donde se ha podido ver`,
    sights_found: (n) => ES.plural(n, "sitio que merece tu tiempo", "sitios que merecen tu tiempo"),
    sight: (nombre) => nombre,
    day: (n, nombre) => `Día ${n}, dibujado: ${nombre}`,
    way: (id) => `Una manera de hacerlo: ${id}`,
    lever: () => "Un cambio que ahorra",
    done: () => "Tu viaje está en el mapa",
    stopped: () => "La investigación se ha parado aquí",
    retry: (paso) => (paso === "" ? "Has pedido otro intento de este paso" : `Has pedido otro intento: ${paso}`),
    conductor: (ref) =>
      (
        ({
          looking: "Mirando por qué se ha parado",
          retry: "Un intento más en este paso",
          told: "Mirado por qué se ha parado",
        }) as Record<string, string>
      )[ref] ?? null,
  },
  viaje: {
    rotulo: "Tu viaje",
    muestra: "Muestra: parte de este viaje está puesta a mano, no por el agente.",
    todos: "Todos",
    dia: (n) => `Día ${n}`,
    ritmo: "Ritmo",
    ritmos: { calm: "Tranquilo", normal: "Normal", full: "Intenso" },
    paradas: (n) => ES.cuenta(n, "parada", "paradas"),
    sinParadas: "Un día libre.",
    andando: (lejos, min) => `${lejos} andando, unos ${min} min`,
    andandoMedido: (lejos, min) => `${lejos} andando, ${min} min`,
    cogiendo: (lejos, min, maneras) => `${lejos}: ${maneras.join(" o ")}, unos ${min} min (cálculo aproximado)`,
    enCoche: (lejos, min, maneras) => `${lejos}: ${maneras.join(" o ")}; en coche, ${min} min sin tráfico`,
    maneraDeIr: { walk: "a pie", transit: "en transporte", car: "en coche" },
    noSeAnda:
      "Parte de este viaje no se anda. Los tiempos en coche o en transporte son aproximados: todavía no se sabe qué transporte hay ni lo que cuesta.",
    noSeAndaSinTrafico:
      "Parte de este viaje no se anda. En coche, los tiempos son sin tráfico, y en transporte, aproximados: todavía no se sabe qué transporte hay ni lo que cuesta.",
    enMapas: "Abrir en Google Maps",
    diaEnMapas: "El día entero, en Google Maps",
    comoIr: "Ver cómo ir, en Google Maps",
    desdeLaCama: (tramo) => `Desde donde duermes: ${tramo}`,
    imprescindible: "Imprescindible",
    fuera: (n) => ES.plural(n, "Se queda fuera con este ritmo", "Se quedan fuera con este ritmo"),
    fueraLejos: (n) => ES.plural(n, "Queda demasiado lejos para tus días", "Quedan demasiado lejos para tus días"),
    maneras: (n) =>
      n === 0
        ? "Todavía no hay ninguna manera de hacerlo"
        : `${conMayuscula(cuantasEs(n))} ${ES.plural(n, "manera", "maneras")} de hacerlo`,
    manera: { cheapest: "La más barata", best_value: "La mejor por lo que cuesta", different: "Una distinta" },
    soloDormir: "solo dormir",
    gana: "Ganas",
    pierde: "Pierdes",
    palancas: "Lo que ahorra cada cambio",
    ahorra: (dinero) => `−${dinero}`,
    avisos: "Para que lo sepas",
    verAlojamiento: "Ver este alojamiento",
    cerrar: "Me quedo con este",
  },
  ficha: {
    volver: "Volver al viaje",
    habitacion: "La habitación de ese precio",
    metros: (m) => `${ES.cifra(m)} m²`,
    sinMetros: "sin metros en la ficha",
    comoEs: "Cómo es de verdad",
    comoEsNota: "Mirado a ciegas: sin el nombre, el precio, la nota ni las estrellas.",
    fotosDelSitio: "Fotos del alojamiento, no de esa habitación",
    seDice: "Lo que se dice de él",
    prueba: { photo: "ver la foto", review: "por las opiniones", sheet: "por su ficha" },
    avisos: {
      no_detail: "La fuente no ha dado el detalle de este alojamiento: sabemos su precio, no cómo es.",
      room_unknown: "No sabemos cuál es la habitación de ese precio.",
      no_room_photos: "La fuente no tiene fotos de la habitación de ese precio, así que nadie ha podido mirarla.",
      no_reviews: "No hay opiniones de este alojamiento que leer.",
    },
    precio: (noches) => `Precio por ${tusNochesEs(noches)}`,
    visto: (cuando) => `visto el ${cuando}`,
    otras: (n) => ES.plural(n, "Otro vendedor", "Otros vendedores"),
    nota: (n, op) => `nota ${ES.cifra(n)}, de ${ES.cuenta(op, "opinión", "opiniones")}`,
    estrellas: (n) => ES.cuenta(n, "estrella", "estrellas"),
    sinMirar: "Todavía no se ha mirado.",
  },
  campos: {
    look: "Cómo se ve",
    upkeep: "Cómo lo mantienen",
    style: "El estilo",
    room_space: "El espacio",
    room_light: "La luz",
    bathroom: "El baño",
    view: "La vista",
    gym: "El gimnasio",
    pool: "La piscina",
  },
  niveles: {
    new_or_renovated: "nuevo o reformado",
    good_condition: "en buen estado",
    dated: "anticuado",
    worn: "gastado",
    well_kept: "cuidado",
    some_complaints: "con alguna queja",
    neglected: "descuidado, según los viajeros",
    modern_plain: "moderno y sencillo",
    classic: "clásico",
    character: "con carácter",
    chain: "de cadena",
    rustic: "rústico",
    roomy: "amplia",
    fits: "justa, pero cabe",
    tight: "apretada",
    bright: "luminosa",
    average: "normal",
    dark: "oscura",
    modern: "moderno",
    correct: "correcto",
    open: "abierta",
    street: "a la calle",
    inner_or_wall: "a un patio o a una pared",
    full: "completo",
    maintenance: "para mantenerse",
    token: "simbólico",
    none: "no hay",
    swim: "para nadar",
    bathe: "para bañarse",
    dip: "para un chapuzón",
    unknown: "no se sabe",
  },
  temas: {
    cleanliness: "La limpieza",
    maintenance: "El mantenimiento",
    noise: "El ruido",
    room_size: "El tamaño de la habitación",
    bed: "La cama",
    bathroom: "El baño",
    light: "La luz",
    temperature: "La temperatura",
    smell: "Los olores",
    view: "Las vistas",
    breakfast: "El desayuno",
    food: "La comida",
    staff: "El personal",
    location: "La ubicación",
    access: "El acceso",
    parking: "El aparcamiento",
    wifi: "El wifi",
    gym: "El gimnasio",
    pool: "La piscina",
    common_areas: "Las zonas comunes",
    kitchen: "La cocina",
    privacy: "La intimidad",
    safety: "La seguridad",
    value: "Lo que da por lo que cuesta",
  },
  tonos: { good: "gusta", bad: "hay quejas", mixed: "hay de todo" },
  menciones: { one: "en una opinión", a_few: "en unas pocas opiniones", several: "en varias opiniones" },
  carril: { planear: "Planear", viajes: "Viajes", clave: "Clave", cuenta: "Cuenta", portada: "El Dorado, portada" },
  cargando: "Desplegando el mapa",
  pestanas: { days: "Días", stay: "Dormir", money: "Cuentas", notes: "Avisos" },
  cifras: {
    total: (noches, transporte) =>
      transporte === null ? `por ${tusNochesEs(noches)}` : `${tusNochesEs(noches)} y ${transporteEs(transporte)}`,
    paradas: (n) => ES.plural(n, "parada", "paradas"),
    andando: "andando",
    entreParadas: "entre paradas",
  },
  acciones: {
    quitar: "Quitar",
    mover: "Mover al día",
    anadir: "Añadir",
    quitadas: (n) => ES.plural(n, "La quitaste tú", "Las quitaste tú"),
    reponer: "Volver a poner",
    tuya: "La añadiste tú",
  },
  dormir: {
    otros: (n) => ES.plural(n, "Otro que pasó los mínimos", "Otros que pasaron los mínimos"),
    ficha: "Ver su ficha",
    elegir: "Dormir aquí",
    donde: (zona, min, aPie) =>
      [
        zona === null ? "" : `Por ${zona}.`,
        min === null
          ? ""
          : aPie
            ? `La mitad de lo que vas a ver te queda a ${min} min andando o menos.`
            : `La mitad de lo que vas a ver te queda a unos ${min} min en coche o en transporte.`,
      ]
        .filter((x) => x !== "")
        .join(" "),
    puntos: (n) => `Nuestra nota: ${ES.cifra(n)} de 10`,
    noVale: "No vale para ti",
    leFalta: (cosa, nivel) => `Marcaste «${cosa}» como imprescindible, y aquí es «${nivel}».`,
    quejas: (queja, cuantas) => `Los huéspedes cuentan algo grave, ${cuantas}: ${queja}.`,
    queja: {
      pests: "bichos en la habitación",
      mould: "moho",
      theft: "un robo",
      scam: "un engaño",
      unsafe: "que no se sintieron seguros",
    },
  },
  parada: {
    reservar: "Reserva con tiempo",
    sinReserva: "Sin reserva",
    hora: { morning: "Mejor por la mañana", afternoon: "Mejor por la tarde", evening: "Mejor al final del día" },
  },
  cuentas: {
    incluye: (manera, transporte) => {
      if (transporte === null) return `${manera}: solo dormir. Su total no lleva ningún precio de transporte.`;
      const como = transporteEs(transporte.clase);
      const guardado = ` Lo que cuesta ${como} es un precio guardado, visto hace días: se vuelve a pedir al cerrar el viaje.`;
      return `${manera}: dormir y ${como}.${transporte.guardado ? guardado : ""}`;
    },
    lado: (n) =>
      n === 0
        ? "Todavía no hay nada que sumar"
        : n === 1
          ? "Lo que cuesta la única manera"
          : `Las ${cuantasEs(n)} maneras, lado a lado`,
    fecha: "Cada precio lleva la fecha en que se vio. Se vuelven a pedir al cerrar el viaje.",
  },
  preguntas: {
    titulo: "Mientras busco",
    origen: "Sales de",
    origenOpciones: ["Donde estoy ahora", "Otro sitio"],
    quienes: "Quiénes vais",
    ninos: (n) => (n === 0 ? "sin niños" : ES.cuenta(n, "niño", "niños")),
    menos: "Uno menos",
    mas: "Uno más",
    edad: (n) => `Edad del niño ${n}`,
    edadSinDecir: "¿Edad?",
    anos: (n) => (n === 0 ? "Menos de 1 año" : ES.cuenta(n, "año", "años")),
    fechas: "Tus fechas",
    fechasOpciones: ["Fijas", "Puedo moverlas"],
    gasto: "Gasto",
    gastoOpciones: ["Ajustado", "Medio", "Holgado"],
    buscas: "Qué buscas",
    buscasOpciones: [
      "Lo imprescindible",
      "Comer bien",
      "Cultura",
      "Naturaleza",
      "Playa",
      "Descansar",
      "Salir de noche",
      "Planes con niños",
      "Ruta por carretera",
    ],
    libre: "¿Algo más que deba saber?",
    seco: "En seco: tus respuestas aún no cambian el viaje grabado.",
  },
  empezar: {
    rotulo: "Viaje nuevo",
    entra: "Entra para empezar",
    ponClave: "Pon tu clave de IA para empezar",
    preguntas: "Unos toques, y empiezo",
    origenDonde: "Ciudad de la que sales",
    dondeEstoy: "Donde estoy ahora",
    sinUbicacion: "No he podido saber dónde estás. Escribe la ciudad de la que sales.",
    moneda: "Precios en",
    monedaSinDecir: "¿Moneda?",
    pasaporte: "Pasaporte",
    pasaporteDe: (n) => `Pasaporte del viajero ${n}`,
    paisSinDecir: "¿País?",
    mismo: "El mismo para todos",
    distintos: "No todos el mismo",
    moverse: "Moverte",
    variosSitios: "Ver más de un sitio",
    salirDelPais: "Me vale salir del país",
    cuanto: "Cuánto quieres moverte",
    cuantoOpciones: { little: "Poco", some: "Algo", a_lot: "Mucho" },
    si: "Sí",
    no: "No",
    reservado: "Ya tengo algo reservado",
    reservadoQue: "¿Qué tienes reservado?",
    entendido: "Lo que he entendido",
    sinOrigen: "Sin saber de dónde sales, no busco transporte.",
    supuesto: "supuesto",
    falta: "Antes de empezar, dime:",
    faltas: {
      currency: "en qué moneda quieres los precios",
      "travellers.children": "la edad de cada niño",
      "travellers.passports": "de dónde sales, o tu pasaporte",
      "destination.country": "un destino que pueda situar en un país: búscalo otra vez",
      "origin.country": "la ciudad de la que sales, elegida de la lista",
    },
    campos: {
      dates: "las fechas",
      "travellers.rooms": "las habitaciones: al menos un adulto en cada una",
      "travellers.children": "los niños",
      "travellers.adults": "los adultos",
      "travellers.passports": "los pasaportes",
      currency: "la moneda",
      destination: "el destino",
      origin: "de dónde sales",
    },
    confirmar: "Confirmar e investigar",
    fallo: (clave, campos) => {
      const frases: Record<string, string> = {
        no_ai: "La investigación aún no está conectada en esta web.",
        bad_ceiling: "Di cuánto puede gastar como mucho: un número mayor que cero.",
        no_key: "Pon antes tu clave de IA.",
        unclear: `Esto aún no está claro: ${campos.join(", ")}.`,
        already_running: "Este viaje ya se está investigando.",
        not_now: "Este viaje no se puede empezar ahora.",
        too_many: "Este paso ya se ha vuelto a intentar todas las veces que caben. Puedes cambiar lo que pediste.",
        too_many_trips: "Tienes demasiados viajes. Abre uno de los que ya tienes.",
        house_full: "El Dorado no puede abrir viajes nuevos ahora. Prueba más tarde.",
        no_session: "Tu sesión ha terminado. Entra otra vez.",
      };
      return frases[clave] ?? "Algo ha ido mal. Prueba en un momento.";
    },
  },
  casa: {
    titulo: "Investigando tu viaje",
    esperando: "Preparando",
    pasos: {
      understood: "Repasando lo que he entendido",
      sights: "Buscando lo que hay que ver",
      route: "Decidiendo dónde dormir",
      search: "Buscando alojamientos",
      look: "Mirando cada finalista",
      pick: "Eligiendo qué ver",
      days: "Repartiendo los días",
      table: "Sumándolo todo",
      cross: "Cruzándolo con lo que pediste",
      explain: "Escribiendo por qué",
      calendar: "Mirando tus fechas",
      papers: "Mirando tus papeles",
      trip: "Dibujando tu viaje",
    },
    gastado: (gastado, techo) =>
      techo === null ? `Gastado hasta ahora: ${gastado}` : `Gastado hasta ahora: ${gastado} de ${techo} como mucho`,
    gastoSinSaber: "Lo que ha gastado aún no se sabe.",
    parado: (paso) => `Se ha parado aquí: ${paso}. No se gasta nada más hasta que tú digas.`,
    otraVez: "Volver a intentarlo",
    ver: "Ver mi viaje",
    mirando: "Estoy mirando por qué se ha parado. Mientras, no se gasta nada más.",
    queHaPasado: {
      seat_kept_failing:
        "Este paso no pasó sus comprobaciones, ni volviéndolo a intentar. Lo que encontró no se enseña, para que no te llegue nada sin comprobar.",
      seat_did_not_finish: "Este paso no llegó a acabar su trabajo.",
      not_possible_yet: "Es una clase de viaje que todavía no sé planear.",
      nothing_found: "No encontré con qué trabajar para lo que pediste.",
      spend_ceiling: "Se llegó a lo más que aceptaste gastar.",
      house_broke: "Algo ha fallado por mi parte.",
    },
    queHacer: "Lo que puedes hacer",
    soloEstePaso: "Volver a intentarlo repite solo este paso. Lo ya hecho se queda como está, y no se paga otra vez.",
    salidas: {
      retry: "Volver a intentarlo",
      change_request: "Cambiar lo que pediste",
      continue_without: "Seguir sin esta parte",
    },
  },
  escucha: {
    rotulo: "Tu turno",
    titulo: "Lo que he entendido",
    sub: "De lo que escribiste, con tus palabras. Míralo: no se gasta nada más hasta que lo confirmes.",
    otraVuelta: "Con tus respuestas, vuelto a leer.",
    gustos: "Lo que prefieres",
    limites: "Lo que no puede pasar",
    reservado: "Ya reservado",
    choca: "Lo que no encaja",
    nadaChoca: "Nada choca con lo que me has dicho.",
    nadaQueSeparar: "De lo que escribiste no he sacado nada que guardar.",
    preguntas: "Unas preguntas",
    preguntasSub: "Contesta las que quieras y vuelvo a leer tus palabras. O confirma sin contestar.",
    tuRespuesta: "Tu respuesta",
    pesos: { must: "Imprescindible", like: "Me gusta", indifferent: "Me da igual" },
    cosas: {
      views: "Vistas",
      gym: "Gimnasio",
      pool: "Piscina",
      space: "Una habitación amplia",
      light: "Una habitación con luz",
      bathroom: "Un baño moderno",
      new: "Nuevo o reformado",
    },
    peso: "Cuánto pesa",
    quitar: "Quitar",
    devolver: "Dejarlo",
    quitado: "Quitado: no lo usaré",
    conQue: {
      budget: "tu gasto",
      dates: "tus fechas",
      travellers: "quiénes vais",
      pace: "tu ritmo",
      moving: "cómo te quieres mover",
    },
    noCasa: (con) => `no encaja con ${con}`,
    noCasaCon: (otra) => `no encaja con «${otra}»`,
    comillas: '"«" "»"',
    contestar: "Mandar mis respuestas",
    confirmar: "Confirmar y seguir",
    enviando: "Enviando",
    tusPalabras: "Lo que has escrito lo leeré al empezar, y te enseñaré lo que he entendido antes de seguir.",
  },
  fechas: {
    titulo: "Tus fechas",
    clase: {
      blocks: "Lo impide",
      raises: "Lo encarece",
      bothers: "Molesta",
      favours: "A tu favor",
    },
    tema: {
      weather: "El tiempo de esas semanas",
      season: "La temporada",
      festival: "Una fiesta",
      event: "Un evento",
      public_holiday: "Un festivo allí",
      holiday_at_home: "Un festivo de donde sales",
      closure: "Algo cierra",
      sells_out: "Se agota con meses",
      days_needed: "Los días que pide",
    },
    deA: (desde, hasta) => (desde === hasta ? desde : `del ${desde} al ${hasta}`),
    tuyos: (n, total) => (n === 0 ? "No cae en tus días" : n >= total ? "Todos tus días" : `${n} de tus ${total} días`),
    pide: (dias, tuyos) => `Pide ${ES.cuenta(dias, "día", "días")}; tu viaje tiene ${tuyos}.`,
    precio: (dinero) => `Precio de la página: ${dinero}`,
    fuente: (visto) => (visto === null ? "Fuente (sin fecha)" : `Fuente, con fecha del ${visto}`),
    ventanas: "Otras fechas que podrías coger",
    ventana: (desde, hasta, dias) =>
      `Del ${desde} al ${hasta}, ${ES.cuenta(Math.abs(dias), "día", "días")} ${dias < 0 ? "antes" : "después"}`,
    evita: "Evitas",
    alcanza: "Llegas a",
    pierde: "Pierdes",
    entra: "Te encuentras",
    faltan: {
      failed: "No ha llegado lo que hay en tus fechas. Tu viaje se hace igual, sin ello.",
      rejected: "Lo que hay en tus fechas no pasó nuestras comprobaciones. Tu viaje se hace igual, sin ello.",
    },
    nada: "Nada en tus fechas que cambie el viaje.",
    nota: "Sale de las páginas enlazadas, con la fecha que dan. Míralas antes de reservar.",
  },
  papeles: {
    titulo: "Tus papeles",
    sub: "Lo que piden las fuentes oficiales. Si lo cumples, solo lo dicen tus documentos: compruébalo antes de ir.",
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
    duda: {
      sources_disagree: "Las fuentes oficiales no dicen lo mismo",
      no_official_source: "No tenemos una fuente oficial de este país",
      not_found: "No está en una página oficial",
    },
    viajero: (pasaporte, edad, cuantos) =>
      `${ES.cuenta(cuantos, "viajero", "viajeros")} con pasaporte ${pasaporte}${edad === null ? "" : `, de ${edad} años`}`,
    hasta: (fecha) => `El pasaporte tiene que valer al menos hasta el ${fecha}`,
    antesDe: (fecha, tarde) => (tarde ? `Había que hacerlo antes del ${fecha}` : `Hazlo antes del ${fecha}`),
    coste: (dinero) => `Cuesta ${dinero}`,
    lado: { destination: "Gobierno del destino", home: "Tu ministerio" },
    fuente: (lado, visto) => `${lado}, con fecha del ${visto}`,
    enRegla: "No piden nada",
    fuera: {
      transit_unknown: "Las escalas se miran cuando esté elegido tu transporte.",
      own_country: "Nada que mirar para quien viaja por el país de su propio pasaporte.",
    },
    faltan: {
      failed: "No hemos podido mirar tus papeles.",
      rejected: "Lo que hay de tus papeles no pasó nuestras comprobaciones.",
    },
    bloquean: "Algo de tus papeles impide este viaje.",
    decide: "No se gasta nada más hasta que decidas. Puedes seguir igual, sabiéndolo.",
    seguir: "Seguir igual",
    seguido: "Decidiste seguir con esto.",
  },
  panel: {
    titulo: "Tus viajes",
    sub: "Cada uno se queda aquí, donde lo dejaste.",
    nuevo: "Empezar un viaje",
    nuevoTexto: "Dónde y cuándo. Lo demás se pregunta mientras ya busca.",
    estado: "En el mapa",
    ejemplo: "Un ejemplo, ya en el mapa",
    gastoIA: (usd) => `IA ${usd}`,
    estados: {
      started: "Sin confirmar todavía",
      confirmed: "Listo para investigar",
      researching: "Investigándose",
      on_map: "En el mapa",
      closed: "Cerrado",
    },
    aun: "Se abrirá aquí cuando esté en el mapa.",
    sinNombre: "Un viaje sin sitio todavía",
    espera: "Te espera: elegir cómo dormir y cerrar el viaje.",
    abrir: "Abrir el viaje",
    vacio: "Aún no tienes viajes. El primero empieza en el mapa.",
  },
  clave: {
    titulo: "Tu clave de IA",
    cuerpo:
      "El Dorado piensa con Claude. La IA la pagas tú, por lo que uses, con tu propia clave. La pegas una vez: se guarda cifrada, se usa solo para tus viajes, no se enseña entera nunca más y la borras cuando quieras.",
    campo: "Clave de la API de Claude",
    otra: "Cambiarla por otra clave",
    guardar: "Guardar la clave",
    quitar: "Borrar la clave",
    puesta: "Tu clave, guardada y cifrada",
    acaba: (pista) => `acaba en ${pista}`,
    entra: "Para guardar una clave hace falta una cuenta. Ve a",
    sinClave: "Sin clave puedes mirar y abrir el primer vistazo. Para investigar hace falta.",
    gasto: "Lo que ha gastado cada viaje",
    sinGasto: "Nada todavía: ningún viaje se ha investigado.",
    mirandoGasto: "Sumando lo que han gastado tus viajes",
    llamadas: (n) => ES.cuenta(n, "llamada a la IA", "llamadas a la IA"),
    investigaciones: (n) => ES.cuenta(n, "investigación", "investigaciones"),
    ultima: (dia) => `la última, el ${dia}`,
    sinSaberUno: "Una parte no se sabe: como poco, esto.",
    total: "Todos tus viajes",
    sinSaberTotal: "Una parte no se sabe, así que el total es como poco esto.",
    siguiente: (usd, n) =>
      `La siguiente investigación debería costar unos ${usd}: lo que costó de media ${n === 1 ? "la tuya que acabó" : `cada una de las ${ES.cifra(n)} tuyas que acabaron`}.`,
    sinSiguiente: "Lo que costará la siguiente investigación aún no se sabe. Se sabrá cuando acabe una tuya.",
    comoClave:
      "Tu cuenta piensa con la cuenta de Claude de esta web: estas cifras son lo que habría costado con una clave, no un cobro.",
    sinGastoCasa: "Ahora mismo no se puede leer lo gastado.",
    deLaCasa:
      "Tu cuenta piensa con la cuenta de Claude de esta web: no te hace falta clave para investigar. Si guardas una, se queda en tu cuenta, cifrada, para más adelante.",
  },
  cuenta: {
    titulo: "Tu cuenta",
    sub: "Con una cuenta, tus viajes y tu clave de IA son tuyos y de nadie más. Basta un correo y una contraseña.",
    mirando: "Mirando quién eres",
    crear: "Crear una cuenta",
    entrar: "Entrar",
    correo: "Correo",
    contrasena: "Contraseña",
    pista: "Diez caracteres como poco. Mejor una frase larga que un acertijo corto.",
    botonCrear: "Crear mi cuenta",
    botonEntrar: "Entrar",
    dentro: "Has entrado como",
    salir: "Salir",
    sinClave: "Todavía sin clave de IA. Para investigar hace falta una.",
    conClave: (pista) => `Tu clave de IA está guardada. Acaba en ${pista}.`,
    ponClave: "Poner mi clave de IA",
    verClave: "Mi clave de IA",
    sinCasa: "Las cuentas todavía no están conectadas en este sitio. Puedes seguir mirando el viaje grabado.",
    fallo: (clave, espera) => {
      const minutos = Math.max(1, Math.ceil((espera ?? 60) / 60));
      const frases: Record<string, string> = {
        bad_email: "Eso no parece un correo.",
        bad_password: "La contraseña pide diez caracteres como poco, y no puede ser tu correo.",
        exists: "Ya hay una cuenta con ese correo. Prueba a entrar.",
        bad_login: "El correo o la contraseña no coinciden.",
        too_many_attempts: `Demasiados intentos. Espera ${minutos} ${minutos === 1 ? "minuto" : "minutos"} y prueba otra vez.`,
        busy: "Hay mucha gente entrando ahora mismo. Prueba en un momento.",
        house_full: "El Dorado no puede abrir cuentas nuevas ahora. Prueba más tarde.",
        bad_key: "Eso no parece una clave de la API. Pégala entera y sin espacios.",
        key_rejected: "Claude no ha admitido esa clave. Mira que esté entera, activa y con acceso a la API.",
        ai_unreachable:
          "No hemos podido llegar a Claude para comprobar tu clave. No se ha guardado. Prueba en un momento.",
        no_session: "Tu sesión se ha acabado. Entra otra vez.",
        no_house: "Las cuentas todavía no están conectadas en este sitio.",
        house_down: "No hemos podido llegar a El Dorado. Prueba dentro de un momento.",
      };
      return frases[clave] ?? "Algo ha fallado. Prueba dentro de un momento.";
    },
  },
  cerrar: {
    pestana: "Reservar",
    antes: "Antes de que reserves, volvemos a pedir cada precio. Tarda unos segundos.",
    etapa: {
      prices: "Volviendo a pedir cada precio",
      yours: "Un precio ha cambiado",
      links: "Comprobando los enlaces",
      order: "Escribiendo el orden para reservar",
      check: "Comprobando que todo cuadra",
      done: "Tu viaje está cerrado",
      stopped: "No hemos podido cerrar tu viaje. Se queda como estaba: prueba dentro de un momento.",
    },
    fallo: "Ahora no hemos podido cerrar tu viaje. Prueba dentro de un momento.",
    subio:
      "Desde que lo viste, el total ha subido mucho, o una pieza no tiene precio hoy. ¿Te sigues quedando con este viaje?",
    sigo: "Me quedo, con los precios de hoy",
    noAhora: "Ahora no",
    titulo: "Tu viaje, cerrado",
    cerradoEl: (fecha) => `Cerrado el ${fecha}, con los precios de ese día.`,
    noReserva: "El Dorado propone y enlaza: no reserva ni cobra. Cada reserva la haces tú, en la web de quien vende.",
    precios: "Los precios de hoy",
    cambio: (c, diferencia) =>
      ({
        same: "igual que cuando lo viste",
        up: `ha subido ${diferencia} desde que lo viste`,
        down: `ha bajado ${diferencia} desde que lo viste`,
        gone: "hoy no tiene precio",
        unknown: "hoy no hemos podido pedirlo",
      })[c] ?? "",
    visto: (dinero) => `lo viste a ${dinero}`,
    caducado: "más viejo de lo que aceptamos: míralo donde reserves",
    guardado: "un precio guardado, de hace días",
    total: "El total, hoy",
    totalSinSaber: "Una pieza no tiene precio hoy: el total no se sabe.",
    orden: "En este orden",
    pieza: {
      lodging: "Dónde duermes",
      transport: "Cómo llegas",
      sight: "Una entrada que reservar con tiempo",
    },
    razon: {
      price_moves: "su precio se mueve",
      saved_price: "su precio es guardado",
      not_cancellable: "no se puede cancelar",
      cancel_unknown: "no sabemos si se puede cancelar",
      cancellable: "se puede cancelar",
      book_ahead: "se reserva con tiempo",
    },
    papeles: "Tus papeles, para cuándo",
    sinConfirmar: "Sin confirmar",
    duda: {
      price_gone: (de) => `${de}: hoy no tiene precio.`,
      price_unknown: (de) => `${de}: no hemos podido pedir el precio de hoy.`,
      price_stale: (de) => `${de}: su precio es más viejo de lo que aceptamos.`,
      saved_price: (de) => `${de}: el precio es guardado, lo vio otra persona hace días.`,
      cancel_unknown: (de) => `${de}: no sabemos si se puede cancelar.`,
      arrival_unknown: () => "No podemos saber si tu llegada cuadra con la entrada al alojamiento.",
      arrival_off: () => "Tu llegada no cae el día en que entras al alojamiento.",
      no_link: (de) => `${de}: la fuente no dio una página donde reservarlo.`,
      link_down: (de) => `${de}: un enlace no ha respondido hoy.`,
      link_unchecked: (de) => `${de}: un enlace no se ha podido comprobar.`,
      papers_doubtful: (pais) => `Tus papeles para ${pais}: algo no está claro.`,
      papers_late: (pais) => `Tus papeles para ${pais}: un plazo ya ha pasado.`,
    },
    llegada: {
      ok: (h) =>
        h === null ? "Tu llegada cuadra con la entrada." : `Tu llegada cuadra con la entrada, desde las ${h}.`,
      early: (h) => `Llegas horas antes de la entrada${h === null ? "" : `, desde las ${h}`}: pide dejar las maletas.`,
      next_day: () => "Llegas al día siguiente de la entrada: esa noche se paga y no se usa.",
      day_before: () => "Llegas el día antes de la entrada: esa noche no tienes cama.",
      unsure: () => "Llegas cerca de medianoche: no podemos saber qué día.",
      no_transport: () => "Esta manera no lleva transporte: no podemos mirar tu llegada.",
      no_hours: () => "No sabemos las horas de tu transporte: no podemos mirar tu llegada.",
      no_check_in: () => "No sabemos desde qué hora se entra al alojamiento.",
    },
    enlaces: "Dónde se reserva",
    clase: {
      where_priced: "Donde vimos el precio",
      search: "La búsqueda, con tus fechas",
      own_site: "La web del propio alojamiento (no es donde vimos el precio)",
    },
    comprobado: {
      ok: "",
      unchecked: "No hemos podido comprobar este enlace.",
      down: "Este enlace no ha respondido hoy.",
    },
    mapas: "En Google Maps",
    dondeDuermes: "Dónde duermes",
    dia: (n, fecha) => `Día ${n}, ${fecha}`,
    sinFrases: "El orden es nuestro: esta vez, sin notas.",
  },
  portada: {
    entrar: "Abrir el mapa",
    panel: "Tus viajes",
    lema: "Tu viaje entero, dibujado en el mapa",
    cuerpo:
      "Di dónde y cuándo. El Dorado lo investiga en vivo: dónde dormir, cómo llegar y qué ver cada día, al mejor precio que encuentra. Cada precio, con su enlace y su fecha.",
    pasos: [
      ["Dónde y cuándo", "Dos respuestas sobre un mapa del mundo. Nada más para empezar."],
      [
        "Mira cómo investiga",
        "Cada pulso en el mapa es una búsqueda de verdad. Contestas unos toques mientras trabaja.",
      ],
      ["Tu viaje, día a día", "Cada día en su capa, tres maneras de dormir y lo que ahorra cada cambio."],
    ],
    cuida: "Lo que cuida",
    cuidados: [
      "Nada inventado: lo que no se encuentra se dice que no se sabe.",
      "Ningún precio sin su enlace y la fecha en que se vio.",
      "Propone y enlaza. No reserva ni cobra.",
      "Un alojamiento se mira a ciegas: la habitación de ese precio, no la suite.",
    ],
    beta: "En obras. Todavía no está abierta al público.",
  },
  foto: (autor, licencia) => `Foto: ${autor}, ${licencia}`,
  ia: "Hecho con IA: puede tener errores. Los precios son orientativos y llevan la fecha en que se vieron.",
};

export const TEXTOS: Record<Idioma, Textos> = { en, es };
export type { Textos };

/** El idioma de quien mira: el que pida la dirección (?lang=es) o el de su navegador; si no es nuestro, inglés. */
export function idiomaDe(pedido: string | null, delNavegador: string | undefined): Idioma {
  const candidatos = [pedido, delNavegador?.slice(0, 2)];
  for (const c of candidatos)
    if (c !== null && c !== undefined && (IDIOMAS as readonly string[]).includes(c)) return c as Idioma;
  return "en";
}
