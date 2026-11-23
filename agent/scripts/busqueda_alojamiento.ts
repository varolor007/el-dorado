// La búsqueda de alojamiento, de punta a punta y sin IA: la lista de la zona, los mínimos, el precio de esas noches,
// los finalistas y la ficha de datos de cada uno. La fuente se le pasa: con la de verdad busca, y con una inventada se
// prueba. Si un dato falta, no se inventa: queda vacío y se apunta un aviso.

import type {
  Alojamiento,
  Detalle,
  Estancia,
  FuenteAlojamiento,
  Habitacion,
  Minimos,
  OfertaDeZona,
  Precio,
} from "../tools/fuentes/tipos.ts";
import { casar } from "./cruce.ts";
import { completo, elegir, type ConPrecio } from "./finalistas.ts";
import { separar, type Descarte } from "./minimos.ts";
import { entreFechas, porTemas, type Recuento } from "./temas.ts";

export type Ficha = {
  motivo: string;
  alojamiento: Alojamiento;
  precio: Precio;
  precioCompleto: number;
  /** La habitación de ese precio, que es la que hay que mirar; no la mejor del hotel. */
  habitacion: Habitacion | null;
  detalle: Detalle | null;
  temas: Recuento;
  opinionesLeidas: number;
  opinionesDesde: string | null;
  opinionesHasta: string | null;
  /** Lo que piden otros vendedores por las mismas noches, cuando otra fuente lo sabe. */
  otrasOfertas: OfertaDeZona["ofertas"];
  avisos: string[];
};

export type Busqueda = {
  estancia: Estancia;
  minimos: Minimos;
  fuente: string;
  devueltos: number;
  dentro: Alojamiento[];
  fuera: Descarte[];
  conPrecio: ConPrecio[];
  finalistas: Ficha[];
  avisos: string[];
};

export type Opciones = { finalistas?: number; opiniones?: number };

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function buscarAlojamiento(
  fuente: FuenteAlojamiento,
  e: Estancia,
  m: Minimos,
  o: Opciones = {},
): Promise<Busqueda> {
  const avisos: string[] = [];
  const devueltos = await fuente.lista(e, m);
  const { dentro, fuera } = separar(devueltos, m);
  if (fuera.length > 0) avisos.push(`la fuente devolvió ${fuera.length} que no cumplen los mínimos; descartados`);

  const precios =
    dentro.length === 0
      ? []
      : await fuente.precios(
          dentro.map((a) => a.id),
          e,
        );
  const conPrecio: ConPrecio[] = [];
  for (const a of dentro) {
    const precio = precios.find((p) => p.id === a.id);
    if (precio !== undefined) conPrecio.push({ alojamiento: a, precio });
  }
  if (conPrecio.length < dentro.length) avisos.push(`${dentro.length - conPrecio.length} sin precio para esas noches`);

  const finalistas: Ficha[] = [];
  for (const f of elegir(conPrecio, o.finalistas ?? 5, m.nota - 0.5)) {
    const ficha: Ficha = {
      motivo: f.motivo,
      alojamiento: f.alojamiento,
      precio: f.precio,
      precioCompleto: completo(f.precio),
      habitacion: null,
      detalle: null,
      temas: {},
      opinionesLeidas: 0,
      opinionesDesde: null,
      opinionesHasta: null,
      otrasOfertas: [],
      avisos: [],
    };
    try {
      ficha.detalle = await fuente.detalle(f.alojamiento.id);
      ficha.habitacion = ficha.detalle.habitaciones.find((h) => h.id === f.precio.idHabitacion) ?? null;
      if (ficha.habitacion === null) ficha.avisos.push("no se sabe cuál es la habitación de ese precio");
      else if (ficha.habitacion.metros === null) ficha.avisos.push("la habitación de ese precio no dice sus metros");
    } catch (error) {
      ficha.avisos.push(`sin detalle: ${mensaje(error)}`);
    }
    try {
      const opiniones = await fuente.opiniones(f.alojamiento.id, o.opiniones ?? 60);
      ficha.temas = porTemas(opiniones);
      ficha.opinionesLeidas = opiniones.length;
      const fechas = entreFechas(opiniones);
      ficha.opinionesDesde = fechas.desde;
      ficha.opinionesHasta = fechas.hasta;
    } catch (error) {
      ficha.avisos.push(`sin opiniones: ${mensaje(error)}`);
    }
    finalistas.push(ficha);
  }
  return {
    estancia: e,
    minimos: m,
    fuente: fuente.nombre,
    devueltos: devueltos.length,
    dentro,
    fuera,
    conPrecio,
    finalistas,
    avisos,
  };
}

/** Añade a cada finalista lo que piden otros vendedores, casando por posición y nombre. Devuelve cuántos casan. */
export function anadirOfertas(b: Busqueda, deZona: OfertaDeZona[]): number {
  let casados = 0;
  for (const ficha of b.finalistas) {
    const igual = casar(ficha.alojamiento, deZona);
    if (igual === null) continue;
    ficha.otrasOfertas = igual.ofertas.filter((x) => x.total !== null);
    casados++;
  }
  return casados;
}
