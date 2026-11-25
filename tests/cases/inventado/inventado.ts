// El caso inventado: una ciudad que no existe, con alojamientos que no existen, para probar sin internet y sin gastar.
// Nada de aquí sale de una fuente de verdad.

import type {
  Alojamiento,
  Detalle,
  Estancia,
  FuenteAlojamiento,
  Minimos,
  OfertaDeZona,
  Opinion,
  Precio,
} from "../../../agent/tools/fuentes/tipos.ts";

export const VISTO = "2027-01-10T09:00:00.000Z";

export const ESTANCIA: Estancia = {
  lat: 10.0,
  lon: 20.0,
  radio: 1500,
  entrada: "2027-03-05",
  salida: "2027-03-08",
  adultos: 2,
  ninos: [],
  habitaciones: 1,
  moneda: "EUR",
  nacionalidad: "ES",
  pais: "ZZ",
};

export const MINIMOS: Minimos = { nota: 8.5, opiniones: 200, estrellas: 4 };

function alojamiento(
  id: string,
  nombre: string,
  nota: number | null,
  opiniones: number | null,
  estrellas: number | null,
  lat = 10.0,
): Alojamiento {
  return { fuente: "inventada", visto: VISTO, id, nombre, lat, lon: 20.0, nota, opiniones, estrellas, tipo: "hotel" };
}

/** Diez alojamientos: siete cumplen los mínimos y tres no, cada uno por un motivo distinto. */
export const ALOJAMIENTOS: Alojamiento[] = [
  alojamiento("a1", "Hotel Faro Inventado", 8.6, 900, 4, 10.001),
  alojamiento("a2", "Posada del Río Inventado", 8.8, 450, 4, 10.002),
  alojamiento("a3", "Gran Hotel Mirador Inventado", 9.6, 2100, 5, 10.003),
  alojamiento("a4", "Hotel Plaza Vieja Inventado", 9.1, 700, 4, 10.004),
  alojamiento("a5", "Casa de la Colina Inventada", 9.4, 320, 4, 10.005),
  alojamiento("a6", "Hotel Puerto Inventado", 8.9, 1500, 4, 10.006),
  alojamiento("a7", "Hotel Jardín Inventado", 9.0, 260, 5, 10.007),
  alojamiento("b1", "Hostal Nota Baja Inventado", 7.9, 800, 4),
  alojamiento("b2", "Hotel Pocas Opiniones Inventado", 9.5, 12, 4),
  alojamiento("b3", "Hotel Tres Estrellas Inventado", 9.2, 600, 3),
];

function precio(
  id: string,
  total: number,
  tasasAparte: number,
  idHabitacion: string | null,
  cancelable: boolean,
): Precio {
  return {
    fuente: "inventada",
    visto: VISTO,
    id,
    total,
    tasasAparte,
    moneda: "EUR",
    habitacion: "Doble",
    idHabitacion,
    regimen: "Solo alojamiento",
    cancelable,
    entrada: ESTANCIA.entrada,
    salida: ESTANCIA.salida,
    adultos: ESTANCIA.adultos,
    habitaciones: ESTANCIA.habitaciones,
    vendedor: "inventada",
    enlace: null,
  };
}

/** a7 cumple los mínimos y no tiene precio para esas noches. */
export const PRECIOS: Precio[] = [
  precio("a1", 180, 6, "h1", false),
  precio("a2", 210, 6, "h1", true),
  precio("a3", 640, 12, "h1", true),
  precio("a4", 300, 6, "h1", true),
  precio("a5", 320, 6, "h-no-esta", false),
  precio("a6", 250, 6, "h1", true),
];

export function detalleDe(id: string): Detalle {
  return {
    fuente: "inventada",
    visto: VISTO,
    id,
    habitaciones: [
      {
        id: "h1",
        nombre: "Doble",
        metros: id === "a1" ? null : 22,
        camas: ["1 x Double bed"],
        fotos: ["https://fotos.invalid/h1-1.jpg"],
        vistas: [],
      },
      {
        id: "h2",
        nombre: "Suite",
        metros: 55,
        camas: ["1 x King bed"],
        fotos: ["https://fotos.invalid/h2-1.jpg"],
        vistas: ["Sea view"],
      },
    ],
    fotos: ["https://fotos.invalid/hotel-1.jpg", "https://fotos.invalid/hotel-2.jpg"],
    servicios: ["Fitness center", "Outdoor pool"],
    entradaDesde: "15:00",
    salidaHasta: "12:00",
    web: null,
    resumen: [{ tema: "Cleanliness", nota: 9.1 }],
    contras: ["Ruido de la calle"],
  };
}

export const OPINIONES: Opinion[] = [
  { fecha: "2026-12-01", nota: 9, viajero: "couple", bueno: "Great pool and a clean room", malo: "", de: "inventada" },
  {
    fecha: "2026-12-20",
    nota: 6,
    viajero: "family",
    bueno: "",
    malo: "The gym is tiny and the street is noisy",
    de: "inventada",
  },
  { fecha: null, nota: 8, viajero: null, bueno: "Good breakfast", malo: "Small bed", de: "inventada" },
];

/** Lo que cuesta mover la entrada, en la fuente inventada: un día antes es más barato; dos antes, más caro. */
const POR_DIA_MOVIDO: Record<string, number> = { "-2": 1.1, "-1": 0.9, "0": 1, "1": 1.05, "2": 1 };

const dias = (desde: string, hasta: string): number => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);

/**
 * El precio de la fuente inventada para unas fechas: el de la estancia de partida, a tanto la noche, y más barato o
 * más caro según cuánto se mueva la entrada. Con las fechas de partida, el de la lista, tal cual.
 */
export function precioPara(p: Precio, e: Estancia): Precio {
  const noches = dias(e.entrada, e.salida) / dias(ESTANCIA.entrada, ESTANCIA.salida);
  const movido = POR_DIA_MOVIDO[String(dias(ESTANCIA.entrada, e.entrada))] ?? 1;
  return {
    ...p,
    total: Math.round(p.total * noches * movido * 100) / 100,
    entrada: e.entrada,
    salida: e.salida,
    adultos: e.adultos,
    habitaciones: e.habitaciones,
  };
}

export type Fallos = { detalle?: boolean; opiniones?: boolean };

/** Una fuente inventada: contesta siempre lo mismo, y puede fallar a propósito. */
export function fuenteInventada(fallos: Fallos = {}): FuenteAlojamiento {
  return {
    nombre: "inventada",
    async lista() {
      return ALOJAMIENTOS.map((a) => ({ ...a }));
    },
    async precios(ids, e) {
      return PRECIOS.filter((p) => ids.includes(p.id)).map((p) => precioPara(p, e));
    },
    async detalle(id) {
      if (fallos.detalle) throw new Error("la fuente no responde");
      return detalleDe(id);
    },
    async opiniones() {
      if (fallos.opiniones) throw new Error("la fuente no responde");
      return OPINIONES.map((o) => ({ ...o }));
    },
  };
}

/** Lo que diría otra fuente de la misma zona: el Faro con otro nombre parecido, uno que no es y uno lejos. */
export const DE_ZONA: OfertaDeZona[] = [
  {
    fuente: "otra",
    visto: VISTO,
    nombre: "Faro Inventado Hotel",
    lat: 10.0011,
    lon: 20.0,
    tipo: "hotel",
    estrellas: 4,
    nivel: "great",
    ofertas: [
      {
        vendedor: "Vendedor Inventado",
        total: 199,
        moneda: "EUR",
        cancelable: true,
        enlace: "https://reservas.invalid/faro",
      },
    ],
  },
  {
    fuente: "otra",
    visto: VISTO,
    nombre: "Bar de la Esquina Inventado",
    lat: 10.002,
    lon: 20.0,
    tipo: "hotel",
    estrellas: 4,
    nivel: "good",
    ofertas: [],
  },
  {
    fuente: "otra",
    visto: VISTO,
    nombre: "Posada del Río Inventado",
    lat: 10.5,
    lon: 20.0,
    tipo: "hotel",
    estrellas: 4,
    nivel: "great",
    ofertas: [{ vendedor: "Vendedor Inventado", total: 150, moneda: "EUR", cancelable: false, enlace: null }],
  },
];
