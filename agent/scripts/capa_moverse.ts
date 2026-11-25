// El de moverse (14.2) en código, sin nada de Node (la web lo usa igual): la forma de lo que entrega su asiento
// (`getting-around`), cómo se pasa a la del viaje, y la cuenta de lo que conviene con los días: con los trayectos que
// no se andan y los billetes que trajo el asiento, qué sale más barato por persona, billetes sueltos, un abono, un
// bono o una mezcla. La cuenta es del código: el asiento no elige. Lo que no se sabe no se inventa: se dice.

import type { ClaseDeBillete, ClaseDePago, DeDondeSeLlega, ModoDeMoverse } from "../data/capa_moverse.ts";
import { MODOS_PUBLICOS, POR_QUE_NO_SE_LLEGA } from "../data/capa_moverse.ts";
import type { Billete, DeMoverse, FuenteDeUnDato, PrecioDeCapa } from "../output/capas.ts";
import type { Dia, Parada, Punto, TablaDeCaminos } from "../output/viaje.ts";
import { caminosDe, trayectoEntre } from "../tools/caminos.ts";
import { fuenteDe, preciosDe, sabido, type PrecioEntregado } from "./capas.ts";
import type { SIN_SABER } from "./formas.ts";

type NoSe = typeof SIN_SABER;

// 1. Lo que entrega el asiento, y lo que se enseña.

export type EntregaDeMoverse = {
  seat: "getting-around";
  /** Cada manera de ir de donde se llega a una zona de la ruta. */
  arrivals: {
    from: { kind: DeDondeSeLlega; code: string | NoSe; name: string | NoSe };
    to_zone: string;
    mode: ModoDeMoverse;
    minutes: number | NoSe;
    prices: PrecioEntregado[] | NoSe;
    until: string | NoSe;
    source: string;
    seen: string;
  }[];
  /** Si no hay ninguna manera de llegar, por qué; si la hay, null. */
  no_arrival: (typeof POR_QUE_NO_SE_LLEGA)[number] | null;
  transport: { mode: ModoDeMoverse; zones: string[]; until: string | NoSe; source: string; seen: string }[];
  tickets: {
    kind: ClaseDeBillete;
    days: number | null;
    rides: number | null;
    modes: ModoDeMoverse[];
    prices: PrecioEntregado[] | NoSe;
    source: string;
    seen: string;
  }[];
  payment: { kind: ClaseDePago; source: string; seen: string }[];
  car_needed: { needed: boolean; source: string; seen: string } | NoSe;
  /**
   * Cómo se va de una base a la siguiente, en un viaje de más de una. La forma del viaje todavía no tiene dónde
   * enseñarlo: se queda en lo que entregó, guardado en el run con la capa.
   */
  between_bases: {
    from_base: string;
    to_base: string;
    mode: ModoDeMoverse;
    minutes: number | NoSe;
    prices: PrecioEntregado[] | NoSe;
    source: string;
    seen: string;
  }[];
  unknowns: string[];
};

/** Lo que se enseña de lo que entregó, en la forma del viaje. Ninguna frase suya. */
export function paraEnsenarMoverse(e: EntregaDeMoverse): DeMoverse {
  return {
    llegar: e.arrivals.map((a) => ({
      desde: { clase: a.from.kind, codigo: sabido(a.from.code), nombre: sabido(a.from.name) },
      aZona: a.to_zone,
      modo: a.mode,
      minutos: sabido(a.minutes),
      precios: preciosDe(a.prices),
      hastaLas: sabido(a.until),
      fuente: fuenteDe(a),
    })),
    sinLlegar: e.no_arrival,
    transportes: e.transport.map((t) => ({
      modo: t.mode,
      zonas: [...t.zones],
      hastaLas: sabido(t.until),
      fuente: fuenteDe(t),
    })),
    billetes: e.tickets.map((b) => ({
      clase: b.kind,
      dias: b.days,
      viajes: b.rides,
      modos: [...b.modes],
      precios: preciosDe(b.prices),
      fuente: fuenteDe(b),
    })),
    pagos: e.payment.map((p) => ({ clase: p.kind, fuente: fuenteDe(p) })),
    coche: e.car_needed === "unknown" ? null : { haceFalta: e.car_needed.needed, fuente: fuenteDe(e.car_needed) },
    falta: null,
  };
}

// 2. El precio de una persona.

/**
 * Lo que paga una persona según una lista de precios, en una moneda: el importe, «free», o null si no se sabe. Un
 * adulto (edad null) paga el de adulto, o el de cualquiera sin edades. Un niño paga el que dice su edad entre sus
 * edades; si no hay, el de cualquiera sin edades; un precio de niño sin edades no se le pone, porque no se sabe si es
 * el suyo. Los de familia, grupo, estudiante o mayor no se ponen a nadie: no se sabe si le tocan. Si valen varios
 * (con tarjeta o en papel), el más caro: la cuenta no se queda corta.
 */
export function precioPara(
  precios: PrecioDeCapa[] | null,
  edad: number | null,
  moneda: string,
): number | "free" | null {
  if (precios === null) return null;
  const dentro = (p: PrecioDeCapa): boolean =>
    p.edades !== null &&
    edad !== null &&
    (p.edades.desde === null || p.edades.desde <= edad) &&
    (p.edades.hasta === null || edad <= p.edades.hasta);
  const deEdad = (p: PrecioDeCapa): boolean =>
    p.para !== "family" && p.para !== "group" && p.para !== "student" && p.para !== "senior" && dentro(p);
  const valen =
    edad === null
      ? precios.filter((p) => p.para === "adult" || (p.para === "any" && p.edades === null))
      : precios.some(deEdad)
        ? precios.filter(deEdad)
        : precios.filter((p) => p.para === "any" && p.edades === null);
  const enLaMoneda = valen.filter((p) => p.cuanto === "free" || p.cuanto.moneda === moneda);
  if (enLaMoneda.length === 0) return null;
  const importes = enLaMoneda.map((p) => (p.cuanto === "free" ? 0 : p.cuanto.importe));
  const mas = Math.max(...importes);
  return mas === 0 ? "free" : mas;
}

/** Las monedas de unos billetes, por cuántos precios llevan cada una; en empate, la primera que sale. */
function monedasDe(billetes: Billete[]): string[] {
  const cuantas = new Map<string, number>();
  for (const b of billetes)
    for (const p of b.precios ?? [])
      if (p.cuanto !== "free") cuantas.set(p.cuanto.moneda, (cuantas.get(p.cuanto.moneda) ?? 0) + 1);
  return [...cuantas.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

// 3. Los trayectos que no se andan, día a día.

/** Los trayectos de un día que no se andan: los que hay que hacer con un billete. */
export type ViajesDeUnDia = { fecha: string; viajes: number };

/**
 * Los trayectos que no se andan de cada día del viaje, con la misma cuenta de caminos que la casa y la web: de una
 * parada a la siguiente y, si se dice dónde se duerme, de allí a la primera y de la última a allí. Un día sin ninguno
 * no sale. No dice con qué se hace cada uno: eso no se sabe.
 */
export function viajesDeLosDias(
  v: { dias: Dia[]; paradas: Parada[]; caminos?: TablaDeCaminos },
  dondeDuermes: Punto | null = null,
): ViajesDeUnDia[] {
  const caminos = caminosDe(v.caminos);
  const punto = new Map(v.paradas.map((p) => [p.id, p.punto]));
  const salida: ViajesDeUnDia[] = [];
  for (const d of v.dias) {
    const puntos = d.paradas.flatMap((id) => punto.get(id) ?? []);
    if (puntos.length === 0) continue;
    const camino = dondeDuermes === null ? puntos : [dondeDuermes, ...puntos, dondeDuermes];
    let viajes = 0;
    for (let i = 0; i + 1 < camino.length; i++) if (!trayectoEntre(camino[i], camino[i + 1], caminos).aPie) viajes++;
    if (viajes > 0) salida.push({ fecha: d.fecha, viajes });
  }
  return salida;
}

// 4. La cuenta de lo que conviene.

/** Lo que se compra, en la cuenta: qué billete (por su sitio en la capa), cuántos, a cuánto y lo que cubre. */
export type CompraDeMoverse = {
  billete: number;
  clase: ClaseDeBillete;
  cuantos: number;
  precio: number;
  total: number;
  /** Los días que cubre un abono, desde el primero; vacío en los demás. */
  dias: string[];
  /** Los trayectos que cubre. */
  viajes: number;
};

/** Lo que sale de la cuenta, por claves: lo que la web dice con sus palabras. */
export const LO_QUE_CONVIENE = ["nothing", "singles", "pass", "rides", "mix", "unknown"] as const;
export type LoQueConviene = (typeof LO_QUE_CONVIENE)[number];

/** Por qué la cuenta no se sabe: sin la capa, sin billetes, o sin un precio con que cubrir algún trayecto. */
export const POR_QUE_NO_SE_SABE = ["no_layer", "no_tickets", "no_price"] as const;

/**
 * La cuenta de moverse de una persona, con sus números. `sueltos` es lo que costaría todo con billetes sueltos (null
 * si no se sabe su precio); `total`, lo más barato que sale con lo que se sabe (null si algún trayecto no se puede
 * pagar con un precio sabido); `ahorra`, la diferencia, si se saben los dos. `sinPrecio` cuenta los billetes que no
 * entran por no tener precio para esta persona en esta moneda: con ellos, quizá saldría otra cosa.
 */
export type CuentaDeMoverse = {
  edad: number | null;
  viajes: number;
  dias: number;
  moneda: string | null;
  conviene: LoQueConviene;
  compras: CompraDeMoverse[];
  sueltos: number | null;
  total: number | null;
  ahorra: number | null;
  sinPrecio: number;
  fuentes: FuenteDeUnDato[];
  porQue: (typeof POR_QUE_NO_SE_SABE)[number] | null;
};

const centimos = (n: number): number => Math.round(n * 100) / 100;
const diaDe = (fecha: string): number => Math.round(Date.parse(`${fecha}T00:00:00Z`) / 86_400_000);
/** Si un billete sirve para el transporte público: cubre alguna de sus maneras. */
const esPublico = (b: Billete): boolean => b.modos.some((m) => MODOS_PUBLICOS.includes(m));

type Opcion = { billete: number; clase: ClaseDeBillete; precio: number; dias: number; viajes: number };

/**
 * Qué sale más barato a una persona (un adulto con edad null, o un niño con su edad) para los trayectos que no se
 * andan de sus días, con los billetes de la capa: sueltos, abonos de uno o de varios días seguidos, bonos de varios
 * viajes, o una mezcla. Solo cuentan los billetes del transporte público con un precio sabido para esa persona, en una
 * moneda: la que se pide, si alguno la lleva, o la que más sale entre sus precios. Una tarjeta recargable no entra:
 * sin la tarifa de cada viaje con ella, no se sabe lo que cuesta. No sabe con qué manera se hace cada trayecto: un
 * billete suelto vale para cualquiera, al precio del suelto más caro. La misma entrada da siempre la misma cuenta.
 */
export function cuentaDeMoverse(
  dias: readonly ViajesDeUnDia[],
  m: DeMoverse | undefined,
  edad: number | null = null,
  pedida: string | null = null,
): CuentaDeMoverse {
  const conDias = [...dias].filter((d) => d.viajes > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const viajes = conDias.reduce((s, d) => s + d.viajes, 0);
  const base: CuentaDeMoverse = {
    edad,
    viajes,
    dias: conDias.length,
    moneda: null,
    conviene: "unknown",
    compras: [],
    sueltos: null,
    total: null,
    ahorra: null,
    sinPrecio: 0,
    fuentes: [],
    porQue: null,
  };
  if (viajes === 0) return { ...base, conviene: "nothing", total: 0, sueltos: 0, ahorra: 0 };
  if (m === undefined || m.falta !== null) return { ...base, porQue: "no_layer" };
  const publicos = m.billetes.map((b, i) => ({ b, i })).filter(({ b }) => esPublico(b) && b.clase !== "travel_card");
  if (publicos.length === 0) return { ...base, porQue: "no_tickets" };
  const monedas = monedasDe(publicos.map((x) => x.b));
  const moneda = pedida !== null && monedas.includes(pedida) ? pedida : (monedas[0] ?? pedida);
  if (moneda === null) return { ...base, sinPrecio: publicos.length, porQue: "no_price" };

  // Cada billete con su precio para esta persona; el que no lo tiene, contado aparte.
  const opciones: Opcion[] = [];
  let sinPrecio = 0;
  for (const { b, i } of publicos) {
    const p = precioPara(b.precios, edad, moneda);
    if (p === null) {
      sinPrecio++;
      continue;
    }
    const precio = p === "free" ? 0 : p;
    if (b.clase === "day_pass" || b.clase === "multi_day_pass")
      opciones.push({ billete: i, clase: b.clase, precio, dias: b.dias ?? 1, viajes: 0 });
    else if (b.clase === "multi_ride" || b.clase === "single")
      opciones.push({ billete: i, clase: b.clase, precio, dias: 0, viajes: b.viajes ?? 1 });
  }
  const abonos = opciones.filter((o) => o.dias > 0);
  const deViajes = opciones.filter((o) => o.viajes > 0);
  // El suelto: el más caro de los de un viaje, que vale para cualquier trayecto.
  const deUno = deViajes.filter((o) => o.clase === "single" && o.viajes === 1);
  const suelto = deUno.length === 0 ? null : deUno.reduce((a, b) => (b.precio > a.precio ? b : a));
  const bonos = deViajes.filter((o) => o !== suelto && !(o.clase === "single" && o.viajes === 1));
  const porViajes = suelto === null ? bonos : [suelto, ...bonos];

  // Cubrir n trayectos sin abono: lo más barato con sueltos y bonos, que se pueden comprar varios.
  const cubrir: { coste: number; con: number | null }[] = [{ coste: 0, con: null }];
  for (let n = 1; n <= viajes; n++) {
    let mejor = { coste: Number.POSITIVE_INFINITY, con: null as number | null };
    porViajes.forEach((o, k) => {
      const coste = o.precio + cubrir[Math.max(0, n - o.viajes)].coste;
      if (coste < mejor.coste - 1e-9) mejor = { coste, con: k };
    });
    cubrir.push(mejor);
  }

  // Los abonos, día a día: en cada día con trayectos, o no se cubre, o empieza un abono de sus días seguidos.
  const nDias = conDias.length;
  type Paso = { coste: number; desde: [number, number] | null; abono: number | null };
  const tabla: Paso[][] = Array.from({ length: nDias + 1 }, () =>
    Array.from({ length: viajes + 1 }, () => ({ coste: Number.POSITIVE_INFINITY, desde: null, abono: null })),
  );
  tabla[0][0] = { coste: 0, desde: null, abono: null };
  const fecha = conDias.map((d) => diaDe(d.fecha));
  for (let i = 0; i < nDias; i++)
    for (let r = 0; r <= viajes; r++) {
      const aqui = tabla[i][r];
      if (!Number.isFinite(aqui.coste)) continue;
      const sin = tabla[i + 1][r + conDias[i].viajes];
      if (aqui.coste < sin.coste - 1e-9)
        tabla[i + 1][r + conDias[i].viajes] = { coste: aqui.coste, desde: [i, r], abono: null };
      abonos.forEach((o, k) => {
        let j = i;
        while (j < nDias && fecha[j] < fecha[i] + o.dias) j++;
        const coste = aqui.coste + o.precio;
        if (coste < tabla[j][r].coste - 1e-9) tabla[j][r] = { coste, desde: [i, r], abono: k };
      });
    }
  let final: number | null = null;
  for (let r = 0; r <= viajes; r++) {
    const coste = tabla[nDias][r].coste + cubrir[r].coste;
    if (Number.isFinite(coste) && (final === null || coste < tabla[nDias][final].coste + cubrir[final].coste - 1e-9))
      final = r;
  }
  const sueltos = suelto === null ? null : centimos(suelto.precio * viajes);
  const fuentesDe = (idx: number[]): FuenteDeUnDato[] => {
    const vistas = new Set<string>();
    return idx.map((i) => m.billetes[i].fuente).filter((f) => !vistas.has(f.url) && vistas.add(f.url) !== undefined);
  };
  if (final === null) return { ...base, moneda, sueltos, sinPrecio, porQue: "no_price" };

  // Lo que se compra, deshaciendo la cuenta.
  const compras: CompraDeMoverse[] = [];
  let i = nDias;
  let r = final;
  while (i > 0) {
    const p = tabla[i][r];
    const [pi, pr] = p.desde!;
    if (p.abono !== null) {
      const o = abonos[p.abono];
      const cubiertos = conDias.slice(pi, i);
      compras.unshift({
        billete: o.billete,
        clase: o.clase,
        cuantos: 1,
        precio: o.precio,
        total: o.precio,
        dias: cubiertos.map((d) => d.fecha),
        viajes: cubiertos.reduce((s, d) => s + d.viajes, 0),
      });
    }
    [i, r] = [pi, pr];
  }
  const deBonos = new Map<number, { o: Opcion; cuantos: number; viajes: number }>();
  for (let n = final; n > 0;) {
    const k = cubrir[n].con!;
    const o = porViajes[k];
    const ya = deBonos.get(k) ?? { o, cuantos: 0, viajes: 0 };
    ya.cuantos++;
    ya.viajes += Math.min(o.viajes, n);
    deBonos.set(k, ya);
    n = Math.max(0, n - o.viajes);
  }
  for (const k of [...deBonos.keys()].sort((a, b) => a - b)) {
    const { o, cuantos, viajes: cubre } = deBonos.get(k)!;
    compras.push({
      billete: o.billete,
      clase: o.clase,
      cuantos,
      precio: o.precio,
      total: centimos(o.precio * cuantos),
      dias: [],
      viajes: cubre,
    });
  }
  const total = centimos(compras.reduce((s, c) => s + c.total, 0));
  const clases = new Set(
    compras.map((c) =>
      c.dias.length > 0 ? "pass" : c.clase === "single" && c.billete === suelto?.billete ? "singles" : "rides",
    ),
  );
  const conviene: LoQueConviene = clases.size === 1 ? ([...clases][0] as LoQueConviene) : "mix";
  return {
    ...base,
    moneda,
    conviene,
    compras,
    sueltos,
    total,
    ahorra: sueltos === null ? null : centimos(sueltos - total),
    sinPrecio,
    fuentes: fuentesDe(compras.map((c) => c.billete)),
  };
}

/**
 * La cuenta de moverse de un grupo: la de cada adulto y la de cada niño, con su edad, y su suma. El total es null si
 * la de alguno no se sabe, o si no salen en la misma moneda; `faltan` cuenta a cuántos no se les sabe.
 */
export function cuentaDelGrupo(
  dias: readonly ViajesDeUnDia[],
  m: DeMoverse | undefined,
  adultos: number,
  ninos: readonly number[],
  pedida: string | null = null,
): { porPersona: CuentaDeMoverse[]; total: number | null; moneda: string | null; faltan: number } {
  const porPersona = [
    ...Array.from({ length: adultos }, () => cuentaDeMoverse(dias, m, null, pedida)),
    ...ninos.map((edad) => cuentaDeMoverse(dias, m, edad, pedida)),
  ];
  const faltan = porPersona.filter((c) => c.total === null).length;
  const monedas = new Set(porPersona.filter((c) => c.total !== 0).map((c) => c.moneda));
  const moneda = monedas.size === 1 ? [...monedas][0] : monedas.size === 0 ? (porPersona[0]?.moneda ?? null) : null;
  const total =
    faltan > 0 || monedas.size > 1 ? null : centimos(porPersona.reduce((s, c) => s + (c.total as number), 0));
  return { porPersona, total, moneda, faltan };
}

// 5. Llegar de donde se aterriza.

/**
 * Las maneras de llegar a una zona, con lo que paga por ellas una persona en una moneda: cada una con su sitio en la
 * capa, su modo, sus minutos y su precio (null si no se sabe), ordenadas de la más barata a la más cara, y las que no
 * se saben al final. Es de ida: la vuelta, si se cuenta, es otra igual. No elige: ordena.
 */
export function manerasDeLlegar(
  m: DeMoverse | undefined,
  zona: string,
  edad: number | null,
  moneda: string,
): { manera: number; modo: ModoDeMoverse; minutos: number | null; precio: number | null; fuente: FuenteDeUnDato }[] {
  if (m === undefined || m.falta !== null) return [];
  return m.llegar
    .map((x, manera) => ({ x, manera }))
    .filter(({ x }) => x.aZona === zona)
    .map(({ x, manera }) => {
      const p = precioPara(x.precios, edad, moneda);
      return { manera, modo: x.modo, minutos: x.minutos, precio: p === "free" ? 0 : p, fuente: x.fuente };
    })
    .sort((a, b) =>
      a.precio === null
        ? b.precio === null
          ? a.manera - b.manera
          : 1
        : b.precio === null
          ? -1
          : a.precio - b.precio || a.manera - b.manera,
    );
}
