// Lo que dice la web, en inglés y en español. Lo que ve el viajero va en su idioma; si no es ninguno de los dos, en
// inglés. Los niveles de la ficha de cómo es se traducen aquí: el asiento los entrega por su código.
//
// Nada de aquí da por hecho cómo es el viaje. Lo que depende de un número (las noches, quiénes van, las maneras, lo
// encontrado) es una función de ese número y se lee bien con uno y con varios; lo que depende de un dato del viaje
// (cómo se llega, si hay niños) se dice a partir de ese dato y, si el dato no se conoce, con una palabra que no
// suponga nada.

export const IDIOMAS = ["en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Cómo se dicen los números en un idioma: la cifra sola, el nombre que concuerda con ella y los dos juntos. */
function numeros(idioma: Idioma) {
  const formato = new Intl.NumberFormat(idioma);
  /** La cifra, como la escribe el idioma. */
  const cifra = (n: number): string => formato.format(n);
  /** El nombre que concuerda con el número: en los dos idiomas, solo el uno va en singular. */
  const plural = (n: number, uno: string, varios: string): string => (n === 1 ? uno : varios);
  /** La cifra con su nombre: «1 night», «3 nights». */
  const cuenta = (n: number, uno: string, varios: string): string => `${cifra(n)} ${plural(n, uno, varios)}`;
  return { cifra, plural, cuenta };
}

const EN = numeros("en");
const ES = numeros("es");

/** Las noches del viaje, cuando se nombran sin contarlas: «for your nights», o «for your night» si es una sola. */
const tusNochesEn = (n: number): string => EN.plural(n, "your night", "your nights");
const tusNochesEs = (n: number): string => ES.plural(n, "tu noche", "tus noches");

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
  },
  vistazo: {
    rotulo: "First look",
    noches: (n: number) => `${n} nights`,
    adultos: (n: number) => EN.cuenta(n, "adult", "adults"),
    encontrados: "places to stay in the area",
    pasan: "pass the minimums",
    desde: "from, for your nights",
    minimos: (nota: number, opiniones: number, estrellas: number) =>
      estrellas > 0
        ? `Minimums: rating ${nota}, ${opiniones} reviews, ${estrellas} stars. You can change them.`
        : `Minimums: rating ${nota}, ${opiniones} reviews. You can change them.`,
    sinVuelos: "No saved flight price for these exact dates yet.",
    empezar: "Start the research",
    gasta: "From here it uses your AI key. Nothing that spends starts without this button.",
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
  },
  viaje: {
    rotulo: "Your trip",
    muestra:
      "Sample: the places to stay were found and looked at by the agent; the sights and the three ways were set by hand.",
    todos: "All",
    dia: (n: number) => `Day ${n}`,
    ritmo: "Pace",
    ritmos: { calm: "Calm", normal: "Normal", full: "Full" },
    paradas: (n: number) => (n === 1 ? "1 stop" : `${n} stops`),
    sinParadas: "A free day.",
    andando: (lejos: string, min: number) => `${lejos} on foot, about ${min} min`,
    enMapas: "Open in Google Maps",
    diaEnMapas: "The whole day in Google Maps",
    imprescindible: "Not to miss",
    fuera: "Left out at this pace",
    maneras: "Three ways to do it",
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
    metros: (m: number) => `${m} m²`,
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
    precio: "Price for your nights",
    visto: (cuando: string) => `seen on ${cuando}`,
    otras: "Other sellers",
    nota: (n: number, op: number) => `rated ${n} by ${op} guests`,
    estrellas: (n: number) => `${n} stars`,
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
  carril: { planear: "Plan", viajes: "Trips", clave: "AI key", portada: "El Dorado, home" },
  cargando: "Unfolding the map",
  pestanas: { days: "Days", stay: "Sleep", money: "Money", notes: "Notes" },
  cifras: { total: "for your nights", paradas: "stops", andando: "on foot" },
  acciones: {
    quitar: "Remove",
    mover: "Move to day",
    anadir: "Add",
    quitadas: "Removed by you",
    reponer: "Put back",
    tuya: "Added by you",
  },
  dormir: {
    otros: "Others that passed the minimums",
    ficha: "See it",
    elegir: "Sleep here",
    donde: (zona: string | null, min: number | null) =>
      [
        zona === null ? "" : `Around ${zona}.`,
        min === null ? "" : `Half of what you will see is within ${min} min on foot.`,
      ]
        .filter((x) => x !== "")
        .join(" "),
    puntos: (n: number) => `Our score: ${n} out of 10`,
    noVale: "Not for you",
    leFalta: (cosa: string, nivel: string) => `You marked "${cosa}" as a must, and here it is "${nivel}".`,
    quejas: (queja: string, cuantas: string) =>
      `Serious complaints that repeat in recent reviews: ${queja} (${cuantas}).`,
    queja: { bed_bugs: "bed bugs", cockroaches: "cockroaches", mould: "mould", scam: "a scam" } as Record<
      string,
      string
    >,
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
    incluye: "Sleeping only. Transport joins the total when there is a price for your dates.",
    incluyeTodo:
      "Sleeping and the flight. The flight is a saved price, seen days ago: it is asked for again when you close the trip.",
    lado: "The three ways, side by side",
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
  panel: {
    titulo: "Your trips",
    sub: "Each one stays here, where you left it.",
    nuevo: "Start a trip",
    nuevoTexto: "Where and when. The rest is asked while it already searches.",
    estado: "On the map",
    espera: "Waiting for you: choose how to sleep and close the trip.",
    abrir: "Open the trip",
    vacio: "No trips yet. The first one starts on the map.",
  },
  clave: {
    titulo: "Your AI key",
    cuerpo:
      "El Dorado thinks with Claude. You pay the AI yourself, for what you use, with your own key. You paste it once: it is stored encrypted, used only for your trips, never shown whole again, and you delete it whenever you want.",
    campo: "Claude API key",
    guardar: "Save the key",
    seco: "Dry run: no key is saved here yet. This connects with your account, in a later batch.",
    sinClave: "Without a key you can look around and open the first look. Research needs it.",
    gasto: "What each trip has spent",
    sinGasto: "Nothing yet: the recorded trip was not run with your key.",
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
  },
  vistazo: {
    rotulo: "Primer vistazo",
    noches: (n) => `${n} noches`,
    adultos: (n) => ES.cuenta(n, "adulto", "adultos"),
    encontrados: "alojamientos en la zona",
    pasan: "pasan los mínimos",
    desde: "desde, por tus noches",
    minimos: (nota, opiniones, estrellas) =>
      estrellas > 0
        ? `Mínimos: nota ${nota}, ${opiniones} opiniones y ${estrellas} estrellas. Los puedes cambiar.`
        : `Mínimos: nota ${nota} y ${opiniones} opiniones. Los puedes cambiar.`,
    sinVuelos: "Todavía no hay ningún precio de vuelo guardado para estas fechas exactas.",
    empezar: "Empezar la investigación",
    gasta: "Desde aquí usa tu clave de IA. Nada que gaste arranca sin este botón.",
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
  },
  viaje: {
    rotulo: "Tu viaje",
    muestra:
      "Muestra: los alojamientos los encontró y los miró el agente; los sitios y las tres maneras están puestos a mano.",
    todos: "Todos",
    dia: (n) => `Día ${n}`,
    ritmo: "Ritmo",
    ritmos: { calm: "Tranquilo", normal: "Normal", full: "Intenso" },
    paradas: (n) => (n === 1 ? "1 parada" : `${n} paradas`),
    sinParadas: "Un día libre.",
    andando: (lejos, min) => `${lejos} andando, unos ${min} min`,
    enMapas: "Abrir en Google Maps",
    diaEnMapas: "El día entero, en Google Maps",
    imprescindible: "Imprescindible",
    fuera: "Se quedan fuera con este ritmo",
    maneras: "Tres maneras de hacerlo",
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
    metros: (m) => `${m} m²`,
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
    precio: "Precio por tus noches",
    visto: (cuando) => `visto el ${cuando}`,
    otras: "Otros vendedores",
    nota: (n, op) => `nota ${n}, de ${op} opiniones`,
    estrellas: (n) => `${n} estrellas`,
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
  carril: { planear: "Planear", viajes: "Viajes", clave: "Clave", portada: "El Dorado, portada" },
  cargando: "Desplegando el mapa",
  pestanas: { days: "Días", stay: "Dormir", money: "Cuentas", notes: "Avisos" },
  cifras: { total: "por tus noches", paradas: "paradas", andando: "andando" },
  acciones: {
    quitar: "Quitar",
    mover: "Mover al día",
    anadir: "Añadir",
    quitadas: "Las quitaste tú",
    reponer: "Volver a poner",
    tuya: "La añadiste tú",
  },
  dormir: {
    otros: "Otros que pasaron los mínimos",
    ficha: "Ver su ficha",
    elegir: "Dormir aquí",
    donde: (zona, min) =>
      [
        zona === null ? "" : `Por ${zona}.`,
        min === null ? "" : `La mitad de lo que vas a ver te queda a ${min} min andando o menos.`,
      ]
        .filter((x) => x !== "")
        .join(" "),
    puntos: (n) => `Nuestra nota: ${n} de 10`,
    noVale: "No vale para ti",
    leFalta: (cosa, nivel) => `Marcaste «${cosa}» como imprescindible, y aquí es «${nivel}».`,
    quejas: (queja, cuantas) => `Quejas graves que se repiten en las opiniones recientes: ${queja} (${cuantas}).`,
    queja: { bed_bugs: "chinches", cockroaches: "cucarachas", mould: "moho", scam: "un engaño" },
  },
  parada: {
    reservar: "Reserva con tiempo",
    sinReserva: "Sin reserva",
    hora: { morning: "Mejor por la mañana", afternoon: "Mejor por la tarde", evening: "Mejor al final del día" },
  },
  cuentas: {
    incluye: "Solo dormir. El transporte se suma al total cuando haya precio para tus fechas.",
    incluyeTodo:
      "Dormir y el vuelo. El vuelo es un precio guardado, visto hace días: se vuelve a pedir al cerrar el viaje.",
    lado: "Las tres maneras, lado a lado",
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
  panel: {
    titulo: "Tus viajes",
    sub: "Cada uno se queda aquí, donde lo dejaste.",
    nuevo: "Empezar un viaje",
    nuevoTexto: "Dónde y cuándo. Lo demás se pregunta mientras ya busca.",
    estado: "En el mapa",
    espera: "Te espera: elegir cómo dormir y cerrar el viaje.",
    abrir: "Abrir el viaje",
    vacio: "Aún no tienes viajes. El primero empieza en el mapa.",
  },
  clave: {
    titulo: "Tu clave de IA",
    cuerpo:
      "El Dorado piensa con Claude. La IA la pagas tú, por lo que uses, con tu propia clave. La pegas una vez: se guarda cifrada, se usa solo para tus viajes, no se enseña entera nunca más y la borras cuando quieras.",
    campo: "Clave de la API de Claude",
    guardar: "Guardar la clave",
    seco: "En seco: aquí todavía no se guarda ninguna clave. Se conecta con tu cuenta, en una tanda posterior.",
    sinClave: "Sin clave puedes mirar y abrir el primer vistazo. Para investigar hace falta.",
    gasto: "Lo que ha gastado cada viaje",
    sinGasto: "Nada todavía: el viaje grabado no se hizo con tu clave.",
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
