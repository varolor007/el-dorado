// La investigación inventada: lo que el viajero pidió, los sitios de una ciudad que no existe y lo que entregaría cada
// asiento si trabajara bien. Con ella se prueba toda la cadena sin internet y sin gastar. Nada sale de una fuente de
// verdad.

import type { EntregaDeRuta, Entendido, Lugar } from "../../../agent/scripts/formas.ts";
import { lugarDe } from "../../../agent/scripts/ruta.ts";
import type { Sitio } from "../../../agent/tools/sitios.ts";
import { ESTANCIA, VISTO } from "./inventado.ts";

/** Lo que he entendido: tres noches para dos, con un gimnasio de verdad y el faro como imprescindibles. */
export const ENTENDIDO: Entendido = {
  language: "es",
  destination: {
    name: "Villa Inventada",
    country: "ZZ",
    kind: "city",
    centre: { lat: ESTANCIA.lat, lon: ESTANCIA.lon },
    box: { west: 19.97, south: 9.98, east: 20.03, north: 10.03 },
  },
  origin: { name: "Origen Inventado", country: "YY", airport: "OOO" },
  dates: { check_in: ESTANCIA.entrada, check_out: ESTANCIA.salida, flexible: false },
  travellers: { adults: 2, children: [], passports: ["YY", "YY"] },
  budget: "medium",
  looking_for: ["comer bien", "ver lo imprescindible"],
  pace: "normal",
  tastes: [
    { thing: "gym", weight: "must", quote: "con un gimnasio de verdad" },
    { thing: "views", weight: "like", quote: "si puede ser, con vistas" },
    { thing: "the lighthouse", weight: "must", quote: "no me quiero ir sin subir al faro" },
  ],
  limits: [],
  booked: [],
};

function sitio(id: string, nombre: string, clase: string, lat: number, lon: number, enlaces: number): Sitio {
  return {
    id,
    nombre,
    clase,
    clases: [clase],
    punto: { lat, lon },
    enlaces,
    descripcion: `${clase} in an invented city`,
    articulo: null,
    articuloEnIngles: null,
    archivo: `${nombre}.jpg`,
    fuente: "inventada",
    visto: VISTO,
  };
}

/** Diez sitios en dos barrios: el del puerto, al oeste, y el viejo, al este, a unos dos kilómetros. */
export const SITIOS: Sitio[] = [
  sitio("Q1", "Faro Inventado", "monument", 10.0, 19.99, 60),
  sitio("Q2", "Catedral Inventada", "church", 10.002, 20.011, 55),
  sitio("Q3", "Museo de la Sal", "museum", 10.003, 20.012, 40),
  sitio("Q4", "Mercado del Puerto", "market", 10.001, 19.992, 30),
  sitio("Q5", "Mirador del Viento", "viewpoint", 10.004, 20.013, 25),
  sitio("Q6", "Parque de la Ría", "park", 10.002, 19.993, 20),
  sitio("Q7", "Barrio Viejo", "neighbourhood", 10.003, 20.01, 18),
  sitio("Q8", "Castillo Inventado", "castle", 10.005, 20.014, 16),
  sitio("Q9", "Puente de Hierro", "bridge", 10.001, 20.0, 12),
  sitio("Q10", "Plaza Mayor Inventada", "square", 10.002, 20.009, 10),
];

export const LUGARES: Lugar[] = SITIOS.map((s) => lugarDe(s));

/** La ruta que entregaría un asiento aplicado: una sola base, tres noches y dos zonas donde buscar. */
export function entregaDeRuta(): EntregaDeRuta {
  return {
    seat: "route-planner",
    shape: "single_base",
    bases: [
      {
        id: "b1",
        name: "Villa Inventada",
        nights: 3,
        why: "everything the traveller comes for is inside the city",
        zones: [
          {
            id: "z1",
            name: "Barrio Viejo",
            anchors: ["Q2", "Q7"],
            radius_m: 1200,
            near: ["Q2", "Q3", "Q5", "Q8"],
            why: "between the cathedral and the old quarter, with the museum and the castle up the hill",
          },
          {
            id: "z2",
            name: "El puerto",
            anchors: ["Q1"],
            radius_m: 800,
            near: ["Q1", "Q4", "Q6"],
            why: "by the lighthouse, with the market and the park along the water",
          },
        ],
      },
    ],
    transfers: [],
    entry: { base: "b1", why: "the only base" },
    exit: { base: "b1", why: "the only base" },
    musts: [{ what: "the lighthouse", covered: true, where_or_why: "b1: the lighthouse anchors zone z2" }],
    left_out: [],
    unknowns: [],
  };
}
