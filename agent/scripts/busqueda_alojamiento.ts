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

/** Un paso de la búsqueda: cuánto se ensanchó, con qué mínimos se miró, cuántos pasaban y cuántos tenían precio. */
export type Paso = { veces: number; minimos: Minimos; pasan: number; conPrecio: number };

export type Busqueda = {
  estancia: Estancia;
  /** Los mínimos con los que se buscó: los más bajos que hicieron falta. Los cumple todo lo que queda dentro. */
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
  /** Cómo se llegó hasta aquí: cada escalón de mínimos y cada ensanche, en su orden. El primero es el de partida. */
  pasos?: Paso[];
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
  /**
   * Lo más que el viajero quiere pagar por el alojamiento entero, con lo que se cobra aparte (8.2). Lo que pasa de ahí
   * no entra en los que tienen precio, y se dice cuántos.
   */
  tope?: number | null;
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

/** La misma búsqueda, en varias zonas y con unos mínimos fijos: sin escalera y sin ensanchar. */
export async function buscarEnZonas(
  fuente: FuenteAlojamiento,
  e: Estancia,
  zonas: ZonaDeBusqueda[],
  m: Minimos,
  o: Opciones = {},
): Promise<Busqueda> {
  return buscarDondeHaya(fuente, e, zonas, { minimos: [m], bastan: 0, radios: [1], radioMaximo: Infinity }, o);
}

/** La búsqueda por zonas, bajando los mínimos por su escalera, sin ensanchar. */
export async function buscarConEscalera(
  fuente: FuenteAlojamiento,
  e: Estancia,
  zonas: ZonaDeBusqueda[],
  escalera: Minimos[],
  bastan: number,
  o: Opciones = {},
): Promise<Busqueda> {
  return buscarDondeHaya(fuente, e, zonas, { minimos: escalera, bastan, radios: [1], radioMaximo: Infinity }, o);
}

/** Los que pasan unos mínimos y declaran lo imprescindible, y los que no, con su motivo. */
function mirar(
  lista: Alojamiento[],
  m: Minimos,
  imprescindibles: string[],
): { dentro: Alojamiento[]; fuera: Descarte[]; sinDeclarar: number } {
  const porMinimos = separar(lista, m);
  const dentro: Alojamiento[] = [];
  const fuera = [...porMinimos.fuera];
  for (const a of porMinimos.dentro) {
    const falta = imprescindibles.find((cosa) => a.declara !== undefined && !a.declara.includes(cosa));
    if (falta === undefined) dentro.push(a);
    else fuera.push({ ...sinMas(a), motivo: `no declara ${falta}, que es imprescindible` });
  }
  return { dentro, fuera, sinDeclarar: porMinimos.dentro.length - dentro.length };
}
const sinMas = (a: Alojamiento): Omit<Descarte, "motivo"> => ({ id: a.id, nombre: a.nombre, lat: a.lat, lon: a.lon });

/**
 * La búsqueda entera, donde haya algo. En las zonas de la ruta, tal como son, baja los mínimos por su escalera hasta
 * que quedan bastantes alojamientos con precio. Si ni con el último escalón hay con qué elegir, ensancha las zonas, y
 * en lo que aparece nuevo vuelve a subir la escalera: lo de fuera tiene que ganarse el sitio con los mejores mínimos
 * que den bastantes. Lo que se encontró en la zona no se pierde al ensanchar, y va por delante al elegir a quién
 * mirar: es donde la ruta dijo que tiene sentido dormir.
 *
 * No repite trabajo: la lista de cada zona se pide una vez por radio, cada precio se pide una vez, y el detalle y las
 * opiniones, solo de los finalistas. Si muchos pasan los mínimos y ninguno tiene precio, no es cosa de los mínimos ni
 * de la zona, sino de las fechas o del grupo: no sigue bajando ni ensanchando, y lo dice.
 */
export async function buscarDondeHaya(
  fuente: FuenteAlojamiento,
  e: Estancia,
  zonas: ZonaDeBusqueda[],
  p: { minimos: Minimos[]; bastan: number; radios: number[]; radioMaximo: number; muchosSinPrecio?: number },
  o: Opciones = {},
): Promise<Busqueda> {
  if (zonas.length === 0) throw new Error("no hay ninguna zona donde buscar");
  if (p.minimos.length === 0) throw new Error("no hay mínimos con los que buscar");
  if (p.radios.length === 0) throw new Error("no hay radios con los que buscar");
  const masBajos = p.minimos[p.minimos.length - 1];
  const cuantos = o.finalistas ?? 5;
  const imprescindibles = o.imprescindibles ?? [];
  const muchos = p.muchosSinPrecio ?? Infinity;
  const tope = o.tope ?? null;
  /** Los que tienen precio y pasan del tope del viajero. */
  const caros = new Set<string>();

  // Cada precio se pide una vez, se pregunte las veces que se pregunte por ese alojamiento.
  const precios = new Map<string, Precio | null>();
  const conSuPrecio = async (lista: Alojamiento[]): Promise<ConPrecio[]> => {
    const sinPedir = lista.filter((a) => !precios.has(a.id)).map((a) => a.id);
    if (sinPedir.length > 0) {
      const llegados = await fuente.precios(sinPedir, e);
      for (const id of sinPedir) precios.set(id, llegados.find((x) => x.id === id) ?? null);
    }
    return lista.flatMap((a) => {
      const precio = precios.get(a.id);
      if (precio === null || precio === undefined) return [];
      if (tope !== null && completo(precio) > tope) {
        caros.add(a.id);
        return [];
      }
      return [{ alojamiento: a, precio }];
    });
  };

  const vistos = new Map<string, Alojamiento>();
  /** Lo que se queda de cada anillo: el de la zona como es y, si hizo falta, los de cada ensanche. */
  const anillos: { minimos: Minimos; lista: Alojamiento[]; dentro: Alojamiento[]; conPrecio: ConPrecio[] }[] = [];
  const pasos: Paso[] = [];
  const avisos: string[] = [];
  let porZona: (ZonaDeBusqueda & { devueltos: number })[] = [];
  const yaHay = (): number => anillos.reduce((suma, a) => suma + a.conPrecio.length, 0);

  for (const veces of p.radios) {
    const anchas = zonas.map((z) => ({ ...z, radio: Math.min(Math.round(z.radio * veces), p.radioMaximo) }));
    porZona = [];
    const nuevos: Alojamiento[] = [];
    for (const z of anchas) {
      // La lista se pide con los mínimos más bajos de la escalera: los de cada escalón se miran aquí, uno a uno.
      const lista = await fuente.lista({ ...e, lat: z.lat, lon: z.lon, radio: z.radio }, masBajos);
      porZona.push({ ...z, devueltos: lista.length });
      for (const a of lista) {
        if (vistos.has(a.id)) continue;
        vistos.set(a.id, a);
        nuevos.push(a);
      }
    }
    let anillo = { minimos: p.minimos[0], lista: nuevos, dentro: [] as Alojamiento[], conPrecio: [] as ConPrecio[] };
    let sinDisponibilidad = false;
    for (const [i, m] of p.minimos.entries()) {
      const { dentro } = mirar(nuevos, m, imprescindibles);
      const conPrecio = await conSuPrecio(dentro);
      anillo = { minimos: m, lista: nuevos, dentro, conPrecio };
      pasos.push({ veces, minimos: m, pasan: dentro.length, conPrecio: conPrecio.length });
      if (yaHay() + conPrecio.length >= p.bastan || i === p.minimos.length - 1) break;
      if (conPrecio.length === 0 && caros.size === 0 && dentro.length >= muchos) {
        sinDisponibilidad = true;
        avisos.push(
          `${dentro.length} pasan los mínimos y ninguno tiene precio para esas noches y ese grupo: ` +
            "no es cosa de los mínimos ni de la zona, y no se sigue bajando ni ensanchando",
        );
        break;
      }
      const habia = `con nota ${m.nota}, ${m.opiniones} opiniones y ${m.estrellas} estrellas quedaban`;
      avisos.push(`${habia} ${yaHay() + conPrecio.length} con precio: se bajan los mínimos un escalón`);
    }
    anillos.push(anillo);
    const radio = Math.max(...anchas.map((z) => z.radio));
    if (yaHay() >= cuantos || sinDisponibilidad || veces === p.radios[p.radios.length - 1]) break;
    avisos.push(`a ${radio} metros solo había ${yaHay()} alojamientos con precio: se busca más ancho`);
    if (radio >= p.radioMaximo) break;
  }

  // Lo que se da por bueno: cada alojamiento, con los mínimos de su anillo. Los que se dicen son los más bajos que
  // hicieron falta: los cumple todo lo que queda dentro.
  const usados = anillos.filter((a) => a.dentro.length > 0).map((a) => a.minimos);
  const minimos = usados.length === 0 ? anillos[0].minimos : usados.sort((a, b) => a.nota - b.nota)[0];
  const dentro = anillos.flatMap((a) => a.dentro);
  const conPrecio = anillos.flatMap((a) => a.conPrecio);
  const fuera: Descarte[] = [];
  let sinDeclarar = 0;
  for (const a of anillos) {
    const visto = mirar(a.lista, a.minimos, imprescindibles);
    fuera.push(...visto.fuera);
    sinDeclarar += visto.sinDeclarar;
  }
  if (fuera.length - sinDeclarar > 0)
    avisos.push(`la fuente devolvió ${fuera.length - sinDeclarar} que no cumplen los mínimos; descartados`);
  if (sinDeclarar > 0) avisos.push(`${sinDeclarar} cumplen los mínimos y no declaran lo imprescindible; descartados`);
  if (caros.size > 0) avisos.push(`${caros.size} pasan del tope de gasto del viajero; fuera`);
  if (conPrecio.length + caros.size < dentro.length)
    avisos.push(`${dentro.length - conPrecio.length - caros.size} sin precio para esas noches`);

  // A quién se mira de cerca. Primero, lo de la zona de la ruta: con varias zonas, el más barato de cada una, para
  // que cada una tenga quien la represente, y el resto por la regla de todos. Lo que solo salió al ensanchar entra
  // después, por la misma regla, en los huecos que queden.
  const elegidos: Finalista[] = [];
  const sinElegir = (lista: ConPrecio[]): ConPrecio[] =>
    lista.filter((c) => !elegidos.some((x) => x.alojamiento.id === c.alojamiento.id));
  if (zonas.length > 1) {
    for (const z of zonas) {
      const deLaZona = sinElegir(anillos[0].conPrecio)
        .filter((c) => completo(c.precio) > 0 && zonaDe(c.alojamiento, zonas) === z.id)
        .sort((a, b) => completo(a.precio) - completo(b.precio) || a.alojamiento.id.localeCompare(b.alojamiento.id));
      if (deLaZona.length > 0 && elegidos.length < cuantos)
        elegidos.push({ ...deLaZona[0], motivo: "el más barato de su zona" });
    }
  }
  for (const a of anillos)
    elegidos.push(...elegir(sinElegir(a.conPrecio), cuantos - elegidos.length, a.minimos.nota - 0.5));

  return {
    estancia: e,
    minimos,
    fuente: fuente.nombre,
    zonas: porZona,
    devueltos: vistos.size,
    dentro,
    fuera,
    conPrecio,
    finalistas: await fichasDe(fuente, elegidos, o),
    avisos,
    pasos,
  };
}

/** La ficha de datos de cada finalista: su detalle, la habitación de ese precio y sus opiniones. Solo de ellos. */
async function fichasDe(fuente: FuenteAlojamiento, elegidos: Finalista[], o: Opciones): Promise<Ficha[]> {
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
  return finalistas;
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

  const finalistas = await fichasDe(fuente, elegidos, o);
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
