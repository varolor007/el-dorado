// La forma del viaje para la web: lo que la casa le entrega a la web y lo que le cuenta en vivo. Es el contrato entre
// las dos. La web se construye contra él y el agente tiene que producirlo. Aquí no hay cuentas ni búsquedas: solo la
// forma, y lo que el código puede comprobar de ella antes de enseñarla.

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
  /** La mitad de las paradas del viaje queda a estos minutos andando, o menos. */
  andando?: number | null;
  /** Nuestra nota, de 0 a 10: la zona, cómo es, las opiniones y las condiciones. */
  puntos?: number | null;
  /** Si una criba lo descarta para este viajero, por qué: la frase la monta la web. */
  descartado?: { clase: string; cosa: string; detalle: string } | null;
};

export type Transporte = {
  id: string;
  clase: "flight" | "train" | "bus" | "car";
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
  puntos: { punto: Punto; precio: number | null }[];
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
  ritmo: Ritmo;
  paradas: Parada[];
  dias: Dia[];
  /** Las paradas que no caben con este ritmo: se quedan fuera, a mano para añadirlas. */
  fuera: string[];
  alojamientos: Alojamiento[];
  transportes: Transporte[];
  maneras: Manera[];
  palancas: Palanca[];
  avisos: string[];
  vistazo: Vistazo | null;
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
  for (const id of v.fuera) {
    if (!deParada.has(id)) pega("fuera", `la parada ${id} no existe`);
    else if (puestas.includes(id)) pega("fuera", `la parada ${id} está fuera y en un día a la vez`);
  }
  for (const p of v.paradas) {
    if (!puestas.includes(p.id) && !v.fuera.includes(p.id)) pega(`paradas.${p.id}`, "ni está en un día ni está fuera");
    if (p.imprescindible && v.fuera.includes(p.id)) pega(`paradas.${p.id}`, "es imprescindible y se ha quedado fuera");
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
  for (const t of v.transportes) pegas.push(...pegasDelPrecio(t.precio, `transportes.${t.id}`));

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
