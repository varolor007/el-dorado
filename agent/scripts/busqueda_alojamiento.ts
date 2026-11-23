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
  Opinion,
  Precio,
} from "../tools/fuentes/tipos.ts";
import { casar } from "./cruce.ts";
import { enLineaRecta } from "../tools/distancias.ts";
import { completo, elegir, type ConPrecio, type Finalista } from "./finalistas.ts";
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
  /** Las opiniones leídas, enteras: las lee después el asiento que mira el alojamiento. */
  opiniones: Opinion[];
  temas: Recuento;
  opinionesLeidas: number;
  opinionesDesde: string | null;
  opinionesHasta: string | null;
  /** Lo que piden otros vendedores por las mismas noches, cuando otra fuente lo sabe. */
  otrasOfertas: OfertaDeZona["ofertas"];
  avisos: string[];
};

/** Una zona donde se busca: la marca el asiento de la ruta, y su centro lo pone el código. */
export type ZonaDeBusqueda = { id: string; nombre: string; lat: number; lon: number; radio: number };

export type Busqueda = {
  estancia: Estancia;
  minimos: Minimos;
  fuente: string;
  /** Las zonas donde se buscó, con lo que devolvió cada una, cuando se buscó por zonas. */
  zonas?: (ZonaDeBusqueda & { devueltos: number })[];
  devueltos: number;
  dentro: Alojamiento[];
  fuera: Descarte[];
  conPrecio: ConPrecio[];
  finalistas: Ficha[];
  avisos: string[];
};

export type Opciones = {
  finalistas?: number;
  opiniones?: number;
  /**
   * Las instalaciones que el viajero marcó como imprescindibles (el gimnasio, la piscina). El alojamiento del que la
   * fuente dice lo que tiene, y no la declara, se descarta antes de elegir a quién mirar: mirarlo sería gastar para
   * nada. Del que la fuente no dice nada, no se sabe, y sigue.
   */
  imprescindibles?: string[];
};

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function buscarAlojamiento(
  fuente: FuenteAlojamiento,
  e: Estancia,
  m: Minimos,
  o: Opciones = {},
): Promise<Busqueda> {
  return completar(fuente, e, m, await fuente.lista(e, m), o, []);
}

/** La zona en la que cae un alojamiento: la más cercana de las que lo tienen dentro; si no, la más cercana. */
function zonaDe(a: Alojamiento, zonas: ZonaDeBusqueda[]): string | null {
  if (zonas.length === 0) return null;
  const lejos = zonas.map((z) => ({ z, metros: enLineaRecta({ lat: a.lat, lon: a.lon }, { lat: z.lat, lon: z.lon }) }));
  const dentro = lejos.filter((x) => x.metros <= x.z.radio);
  return (dentro.length > 0 ? dentro : lejos).sort((x, y) => x.metros - y.metros || x.z.id.localeCompare(y.z.id))[0].z
    .id;
}

/**
 * La misma búsqueda, en varias zonas: trae la lista de cada una, las junta sin repetir y sigue igual. Para que cada
 * zona tenga quien la represente, su alojamiento más barato pasa a mirarse de cerca; el resto, por la regla de todos.
 */
export async function buscarEnZonas(
  fuente: FuenteAlojamiento,
  e: Estancia,
  zonas: ZonaDeBusqueda[],
  m: Minimos,
  o: Opciones = {},
): Promise<Busqueda> {
  if (zonas.length === 0) throw new Error("no hay ninguna zona donde buscar");
  const devueltos: Alojamiento[] = [];
  const porZona: (ZonaDeBusqueda & { devueltos: number })[] = [];
  for (const z of zonas) {
    const lista = await fuente.lista({ ...e, lat: z.lat, lon: z.lon, radio: z.radio }, m);
    porZona.push({ ...z, devueltos: lista.length });
    for (const a of lista) if (!devueltos.some((x) => x.id === a.id)) devueltos.push(a);
  }
  const b = await completar(fuente, e, m, devueltos, o, zonas);
  return { ...b, zonas: porZona };
}

async function completar(
  fuente: FuenteAlojamiento,
  e: Estancia,
  m: Minimos,
  devueltos: Alojamiento[],
  o: Opciones,
  zonas: ZonaDeBusqueda[],
): Promise<Busqueda> {
  const avisos: string[] = [];
  const porMinimos = separar(devueltos, m);
  const fuera = [...porMinimos.fuera];
  if (fuera.length > 0) avisos.push(`la fuente devolvió ${fuera.length} que no cumplen los mínimos; descartados`);
  const dentro: Alojamiento[] = [];
  for (const a of porMinimos.dentro) {
    const falta = (o.imprescindibles ?? []).find((cosa) => a.declara !== undefined && !a.declara.includes(cosa));
    if (falta === undefined) dentro.push(a);
    else
      fuera.push({
        id: a.id,
        nombre: a.nombre,
        lat: a.lat,
        lon: a.lon,
        motivo: `no declara ${falta}, que es imprescindible`,
      });
  }
  if (dentro.length < porMinimos.dentro.length)
    avisos.push(
      `${porMinimos.dentro.length - dentro.length} cumplen los mínimos y no declaran lo imprescindible; descartados`,
    );

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

  // Con varias zonas, el más barato de cada una pasa primero; los demás, por la regla de todos.
  const cuantos = o.finalistas ?? 5;
  const elegidos: Finalista[] = [];
  if (zonas.length > 1) {
    for (const z of zonas) {
      const deLaZona = conPrecio
        .filter((c) => completo(c.precio) > 0 && zonaDe(c.alojamiento, zonas) === z.id)
        .filter((c) => !elegidos.some((x) => x.alojamiento.id === c.alojamiento.id))
        .sort((a, b) => completo(a.precio) - completo(b.precio) || a.alojamiento.id.localeCompare(b.alojamiento.id));
      if (deLaZona.length > 0 && elegidos.length < cuantos)
        elegidos.push({ ...deLaZona[0], motivo: "el más barato de su zona" });
    }
  }
  const resto = conPrecio.filter((c) => !elegidos.some((x) => x.alojamiento.id === c.alojamiento.id));
  elegidos.push(...elegir(resto, cuantos - elegidos.length, m.nota - 0.5));

  const finalistas: Ficha[] = [];
  for (const f of elegidos) {
    const ficha: Ficha = {
      motivo: f.motivo,
      alojamiento: f.alojamiento,
      precio: f.precio,
      precioCompleto: completo(f.precio),
      habitacion: null,
      detalle: null,
      opiniones: [],
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
      ficha.opiniones = opiniones;
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

/**
 * Añade a cada finalista lo que piden otros vendedores, casando por posición y nombre. El nombre del sitio donde se
 * busca no cuenta para casar: lo llevan muchos. Devuelve cuántos casan.
 */
export function anadirOfertas(b: Busqueda, deZona: OfertaDeZona[], lugar = ""): number {
  let casados = 0;
  for (const ficha of b.finalistas) {
    const igual = casar(ficha.alojamiento, deZona, undefined, lugar);
    if (igual === null) continue;
    ficha.otrasOfertas = igual.ofertas.filter((x) => x.total !== null);
    casados++;
  }
  return casados;
}
