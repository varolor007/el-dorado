// La maqueta de la guía: el cuaderno. Junta el viaje cerrado y lo que escribió el que escribe la guía, ya pasado por
// la puerta 10, en un cuaderno: la portada, el viaje de un vistazo, una doble página por día con su croquis y sus
// paradas, dónde se duerme, cómo se llega, lo que hay que llevar hecho, los papeles con sus plazos y dónde se
// reserva. Y lo pinta como una página que se lee en la pantalla y se guarda como documento: la imprime el navegador
// (o se guarda como PDF desde su diálogo de imprimir), sin ninguna pieza de fuera.
//
// Aquí no piensa nadie: el cuaderno sale siempre igual de lo mismo. Los textos son los del asiento; los números, los
// rótulos, los precios con su fecha, las fotos con su autor y su licencia y los enlaces de reserva, del código. El
// croquis de cada día lo dibuja el código con los puntos del viaje: sin teselas, sin servicios y sin claves.

import { rotulosDe } from "../data/guia.ts";
import { avisosDe } from "../data/palabras.ts";
import type { CasillaDePapel, FilaDePapeles, Foto, Precio, Punto, Transporte, Viaje } from "../output/viaje.ts";
import type { EntregaDeLaGuia } from "../gates/puerta_guia.ts";
import { enlaceSinClaves } from "../tools/enlaces.ts";
import { SIN_SABER } from "./formas.ts";
import { deLaManera, paradasDelDia, type ParaLaGuia } from "./guia.ts";
import { diasDe } from "./ruta.ts";

export type FotoDelCuaderno = { url: string; autor: string; licencia: string; pagina: string | null };

export type ParadaDelCuaderno = {
  n: number;
  id: string;
  nombre: string;
  clase: string;
  punto: Punto;
  minutos: number;
  mejorHora: string | null;
  reservar: boolean | null;
  imprescindible: boolean;
  foto: FotoDelCuaderno | null;
  que: string;
  porQue: string;
  cuando: string;
  fuente: { nombre: string; enlace: string | null };
};

export type TramoDelCuaderno = {
  de: string;
  a: string;
  metros: number;
  minutos: number;
  aPie: boolean;
  aproximado: boolean;
  dice: string;
};

export type DiaDelCuaderno = {
  n: number;
  fecha: string;
  titulo: string;
  entrada: string;
  paradas: ParadaDelCuaderno[];
  tramos: TramoDelCuaderno[];
};

/** De qué va una cosa que hay que llevar hecha, por sus datos: una parada que se reserva, un papel o un aviso. */
export type DeQueVa =
  | { clase: "book_ahead"; nombre: string }
  | { clase: "paper"; pregunta: string; pais: string }
  | { clase: "dates"; nombre: string };

export type Cuaderno = {
  formato: "guia/1";
  viaje: string;
  /** La versión del viaje de la que sale. */
  version: number;
  idioma: string;
  hecha: string;
  portada: { titulo: string; entrada: string; foto: FotoDelCuaderno | null };
  destino: { nombre: string; pais: string };
  entrada: string;
  salida: string;
  noches: number;
  adultos: number;
  ninos: number;
  dias: DiaDelCuaderno[];
  duermes: {
    nombre: string;
    zona: string | null;
    punto: Punto;
    habitacion: string | null;
    estrellas: number | null;
    precio: Precio;
  } | null;
  llegas: {
    clase: Transporte["clase"];
    de: string;
    a: string;
    sale: string;
    vuelve: string | null;
    escalas: number | null;
    precio: Precio;
    guardado: boolean;
  } | null;
  papeles: { viajeros: FilaDePapeles[]; casillas: CasillaDePapel[] } | null;
  /** Lo que hay que llevar hecho: de qué va cada cosa lo dicen los datos del viaje, y la frase, el que escribe. */
  antes: { item: number; de: DeQueVa | null; dice: string; plazo: string | null; tarde: boolean }[];
  /** Dónde se reserva: solo lo que trae su enlace, de quien lo vende. */
  reservas: { que: "stay" | "transport"; nombre: string; precio: Precio }[];
  noSeSabe: string[];
  avisos: { ia: string; precios: string };
  /** El día en que se vio el precio más antiguo del cuaderno: la fecha de los precios. Null si no lleva ninguno. */
  preciosDel: string | null;
};

/** Una foto solo entra con su autor y su licencia: sin ellos, no se enseña. */
function fotoQueVale(f: Foto | null): FotoDelCuaderno | null {
  if (f === null || f.autor === null || f.licencia === null) return null;
  if (f.autor.trim() === "" || f.licencia.trim() === "") return null;
  return { url: f.url, autor: f.autor, licencia: f.licencia, pagina: f.pagina };
}

/** El cuaderno de un viaje cerrado, con lo que escribió el asiento y pasó la puerta 10. */
export function montarCuaderno(
  v: Viaje,
  dado: ParaLaGuia,
  escrita: EntregaDeLaGuia,
  o: { manera: string | null; hecha: Date },
): Cuaderno {
  const manera = o.manera === null ? null : (v.maneras.find((m) => m.id === o.manera) ?? null);
  const { duerme, llega } = deLaManera(v, manera);
  let n = 0;
  const dias = v.dias.map((d, i): DiaDelCuaderno => {
    const suyo = escrita.days.find((x) => x.date === d.fecha);
    if (suyo === undefined) throw new Error(`la guía no trae el día ${d.fecha}`);
    const delDado = dado.days[i];
    const paradas = paradasDelDia(v, i).map((p): ParadaDelCuaderno => {
      const t = suyo.stops.find((x) => x.id === p.id);
      if (t === undefined) throw new Error(`la guía no trae la parada ${p.id}`);
      return {
        n: ++n,
        id: p.id,
        nombre: p.nombre,
        clase: p.clase,
        punto: p.punto,
        minutos: p.minutos,
        mejorHora: p.mejorHora ?? null,
        reservar: p.reservar ?? null,
        imprescindible: p.imprescindible,
        foto: fotoQueVale(p.foto),
        que: t.what,
        porQue: t.why,
        cuando: t.when,
        fuente: { nombre: p.origen.fuente, enlace: p.origen.enlace },
      };
    });
    const tramos = delDado.legs.map((l): TramoDelCuaderno => {
      const t = suyo.legs.find((x) => x.from === l.from && x.to === l.to);
      if (t === undefined) throw new Error(`la guía no trae el tramo de ${l.from} a ${l.to}`);
      return {
        de: l.from,
        a: l.to,
        metros: l.metres,
        minutos: l.minutes,
        aPie: l.on_foot,
        aproximado: l.measured_by === "estimate",
        dice: t.says,
      };
    });
    return { n: i + 1, fecha: d.fecha, titulo: suyo.title, entrada: suyo.intro, paradas, tramos };
  });
  const precios: Precio[] = [];
  const reservas: Cuaderno["reservas"] = [];
  if (duerme !== null) {
    precios.push(duerme.precio);
    if (duerme.precio.enlace !== null) reservas.push({ que: "stay", nombre: duerme.nombre, precio: duerme.precio });
  }
  if (llega !== null) {
    precios.push(llega.precio);
    if (llega.precio.enlace !== null)
      reservas.push({ que: "transport", nombre: `${llega.de} ${llega.a}`, precio: llega.precio });
  }
  const plazos = new Map<number, { plazo: string | null; tarde: boolean }>();
  const deQue = new Map<number, DeQueVa>();
  const casillas = (v.papeles?.casillas ?? []).filter((c) => c.estado !== "in_order");
  for (const cosa of dado.todo) {
    // Un aviso de las fechas sin nombre propio no lleva rótulo: lo cuenta la frase del que escribe.
    if (cosa.kind === "paper") deQue.set(cosa.item, { clase: "paper", pregunta: cosa.question, pais: cosa.country });
    else if (cosa.name !== SIN_SABER) deQue.set(cosa.item, { clase: cosa.kind, nombre: cosa.name });
    if (cosa.kind === "paper") {
      const c = casillas.find(
        (x) => x.pais === cosa.country && x.pregunta === cosa.question && x.estado === cosa.state,
      );
      plazos.set(cosa.item, { plazo: c?.antesDe ?? null, tarde: c?.tarde ?? false });
    } else if (cosa.kind === "book_ahead") plazos.set(cosa.item, { plazo: null, tarde: false });
    else plazos.set(cosa.item, { plazo: cosa.trip_days[0] ?? null, tarde: false });
  }
  const vistos = precios.map((p) => p.visto.slice(0, 10)).sort();
  const portada =
    dias.flatMap((d) => d.paradas).find((p) => p.imprescindible && p.foto !== null)?.foto ??
    dias.flatMap((d) => d.paradas).find((p) => p.foto !== null)?.foto ??
    null;
  return {
    formato: "guia/1",
    viaje: v.id,
    version: v.version,
    idioma: v.idioma,
    hecha: o.hecha.toISOString(),
    portada: { titulo: escrita.cover.title, entrada: escrita.cover.intro, foto: portada },
    destino: { nombre: v.destino.nombre, pais: v.destino.pais },
    entrada: v.entrada,
    salida: v.salida,
    noches: diasDe(v.entrada, v.salida).nights,
    adultos: v.adultos,
    ninos: v.ninos.length,
    dias,
    duermes:
      duerme === null
        ? null
        : {
            nombre: duerme.nombre,
            zona: duerme.zona ?? null,
            punto: duerme.punto,
            habitacion: duerme.habitacion,
            estrellas: duerme.estrellas,
            precio: duerme.precio,
          },
    llegas:
      llega === null
        ? null
        : {
            clase: llega.clase,
            de: llega.de,
            a: llega.a,
            sale: llega.sale,
            vuelve: llega.vuelve,
            escalas: llega.escalas,
            precio: llega.precio,
            guardado: llega.guardado,
          },
    papeles:
      v.papeles === undefined || v.papeles.casillas.length === 0 ? null : { viajeros: v.papeles.viajeros, casillas },
    antes: escrita.todo.map((t) => ({
      item: t.item,
      de: deQue.get(t.item) ?? null,
      dice: t.says,
      ...(plazos.get(t.item) ?? { plazo: null, tarde: false }),
    })),
    reservas,
    noSeSabe: escrita.unknowns,
    avisos: avisosDe(v.idioma),
    preciosDel: vistos[0] ?? null,
  };
}

// Pintarlo.

/** Lo que va en una página: el texto con sus signos de HTML escapados. Nada del cuaderno entra sin pasar por aquí. */
export function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Una dirección que se puede poner en un enlace o una foto: https, sin claves; si no, ninguna. */
function direccion(url: string | null): string | null {
  return url !== null && enlaceSinClaves(url) ? new URL(url).toString() : null;
}

const fechaLarga = (idioma: string, fecha: string): string => {
  try {
    return new Intl.DateTimeFormat(idioma, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${fecha.slice(0, 10)}T12:00:00Z`),
    );
  } catch {
    return fecha.slice(0, 10);
  }
};
const fechaCorta = (idioma: string, fecha: string): string => {
  try {
    return new Intl.DateTimeFormat(idioma, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(`${fecha.slice(0, 10)}T12:00:00Z`),
    );
  } catch {
    return fecha.slice(0, 10);
  }
};
const dinero = (idioma: string, p: { total: number; moneda: string }): string => {
  try {
    return new Intl.NumberFormat(idioma, { style: "currency", currency: p.moneda }).format(p.total);
  } catch {
    return `${p.total} ${p.moneda}`;
  }
};
const metros = (idioma: string, m: number): string =>
  m < 1000
    ? `${Math.round(m)} m`
    : `${new Intl.NumberFormat(idioma, { maximumFractionDigits: 1 }).format(m / 1000)} km`;

/** Un punto del croquis: x e y en la caja, con la longitud encogida por la latitud para que no se deforme. */
type EnElCroquis = { x: number; y: number };

/**
 * Dónde cae cada punto en un croquis de `ancho` por `alto`, con su margen: el norte, arriba, y la misma escala en los
 * dos sentidos. Devuelve también cuántos metros mide un punto del croquis, para su escala.
 */
export function proyectar(
  puntos: Punto[],
  ancho: number,
  alto: number,
  margen: number,
): { donde: (p: Punto) => EnElCroquis; metrosPorPunto: number } {
  const lats = puntos.map((p) => p.lat);
  const lons = puntos.map((p) => p.lon);
  const medio = (Math.min(...lats) + Math.max(...lats)) / 2;
  const encoge = Math.cos((medio * Math.PI) / 180);
  const xs = lons.map((l) => l * encoge);
  const minX = Math.min(...xs);
  const maxY = Math.max(...lats);
  // Un solo punto, o todos en el mismo sitio: una caja de unos cuatrocientos metros alrededor.
  const MINIMO = 0.004;
  const anchoX = Math.max(Math.max(...xs) - minX, MINIMO);
  const altoY = Math.max(maxY - Math.min(...lats), MINIMO);
  const escala = Math.min((ancho - 2 * margen) / anchoX, (alto - 2 * margen) / altoY);
  // Lo que sobra se reparte a los dos lados, y lo que se ensanchó una caja pequeña, también.
  const sobraX = (ancho - 2 * margen - anchoX * escala) / 2 + ((anchoX - (Math.max(...xs) - minX)) / 2) * escala;
  const sobraY = (alto - 2 * margen - altoY * escala) / 2 + ((altoY - (maxY - Math.min(...lats))) / 2) * escala;
  return {
    donde: (p) => ({
      x: margen + sobraX + (p.lon * encoge - minX) * escala,
      y: margen + sobraY + (maxY - p.lat) * escala,
    }),
    metrosPorPunto: 111_320 / escala,
  };
}

/** La escala del croquis: un trozo redondo de metros que quepa en una cuarta parte de su ancho. */
function escalaDelCroquis(idioma: string, metrosPorPunto: number, ancho: number): { largo: number; dice: string } {
  const quepa = (ancho / 4) * metrosPorPunto;
  const redondos = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000];
  const m = [...redondos].reverse().find((r) => r <= quepa) ?? redondos[0];
  return { largo: m / metrosPorPunto, dice: metros(idioma, m) };
}

/** Un croquis en SVG: los tramos, en orden, y cada punto con su número; donde se duerme, con su casa. */
export function croquis(
  idioma: string,
  marcas: { n: number; punto: Punto; nombre: string }[],
  duerme: Punto | null,
  o: { ancho?: number; alto?: number; etiquetas?: boolean; grupos?: number[][] } = {},
): string {
  const ancho = o.ancho ?? 640;
  const alto = o.alto ?? 440;
  const todos = [...marcas.map((m) => m.punto), ...(duerme === null ? [] : [duerme])];
  if (todos.length === 0) return "";
  const { donde, metrosPorPunto } = proyectar(todos, ancho, alto, 56);
  const partes: string[] = [];
  // La cuadrícula callada del papel de mapa.
  for (let x = 40; x < ancho; x += 40) partes.push(`<line class="rejilla" x1="${x}" y1="0" x2="${x}" y2="${alto}"/>`);
  for (let y = 40; y < alto; y += 40) partes.push(`<line class="rejilla" x1="0" y1="${y}" x2="${ancho}" y2="${y}"/>`);
  const grupos = o.grupos ?? [marcas.map((_, i) => i)];
  for (const grupo of grupos) {
    const camino = [...(duerme === null ? [] : [donde(duerme)]), ...grupo.map((i) => donde(marcas[i].punto))];
    if (camino.length > 1)
      partes.push(
        `<polyline class="tramo" points="${camino.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}"/>`,
      );
  }
  if (duerme !== null) {
    const d = donde(duerme);
    partes.push(
      `<g class="casa" transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})">` +
        `<path d="M-10 2 L0 -9 L10 2 L10 11 L-10 11 Z"/></g>`,
    );
  }
  for (const m of marcas) {
    const p = donde(m.punto);
    partes.push(
      `<g class="punto" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">` +
        `<circle r="13"/><text y="4.5" text-anchor="middle">${m.n}</text></g>`,
    );
    if (o.etiquetas !== false) {
      const derecha = p.x < ancho * 0.62;
      partes.push(
        `<text class="nombre" x="${(p.x + (derecha ? 19 : -19)).toFixed(1)}" y="${(p.y + 4).toFixed(1)}" ` +
          `text-anchor="${derecha ? "start" : "end"}">${esc(m.nombre)}</text>`,
      );
    }
  }
  const e = escalaDelCroquis(idioma, metrosPorPunto, ancho);
  const largo = e.largo.toFixed(1);
  partes.push(
    `<g class="escala" transform="translate(24 ${alto - 24})">` +
      `<line x1="0" y1="0" x2="${largo}" y2="0"/><line x1="0" y1="-4" x2="0" y2="4"/>` +
      `<line x1="${largo}" y1="-4" x2="${largo}" y2="4"/>` +
      `<text x="${(e.largo / 2).toFixed(1)}" y="-8" text-anchor="middle">${esc(e.dice)}</text></g>`,
    `<g class="norte" transform="translate(${ancho - 28} 30)"><path d="M0 -14 L6 6 L0 2 L-6 6 Z"/>` +
      `<text y="20" text-anchor="middle">N</text></g>`,
  );
  const caja = `viewBox="0 0 ${ancho} ${alto}" role="img" aria-hidden="true"`;
  return `<svg class="croquis" ${caja}>${partes.join("")}</svg>`;
}

/** Los colores de El Dorado (`web/src/app/globals.css`), en claro y en oscuro, y los de imprimir, que son en blanco. */
const CLARO =
  "--fondo:#e9ebed;--papel:#fafbfc;--papel-2:#f1f3f5;--tinta:#0e1217;--tinta-suave:#4b535b;--tinta-tenue:#6b747d;" +
  "--raya:rgba(14,18,23,.11);--oro:#c9982a;--oro-fuerte:#7d5a0b;--oro-tinte:rgba(201,152,42,.15);--ojo:#a84e08;" +
  "color-scheme:light";
const OSCURO =
  "--fondo:#0e1217;--papel:#171c22;--papel-2:#1e242c;--tinta:#e9ebed;--tinta-suave:#b9bec4;--tinta-tenue:#8a929b;" +
  "--raya:rgba(233,235,237,.13);--oro:#f0c24b;--oro-fuerte:#f5cf6e;--oro-tinte:rgba(240,194,75,.14);--ojo:#f5a524;" +
  "color-scheme:dark";
const EN_PAPEL =
  "--fondo:#fff;--papel:#fff;--papel-2:#f4f4f2;--tinta:#0e1217;--tinta-suave:#3d444b;--tinta-tenue:#5f676f;" +
  "--raya:rgba(14,18,23,.16);--oro:#c9982a;--oro-fuerte:#7d5a0b;--oro-tinte:rgba(201,152,42,.15);--ojo:#a84e08;" +
  "color-scheme:light";
/** Las letras de El Dorado, si las tiene quien lo abre; si no, las de su familia. */
const LETRAS =
  '--titulos:"Fraunces","Iowan Old Style",Georgia,serif;' +
  '--texto:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  '--numeros:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

const ESTILO = [
  `:root{${CLARO};${LETRAS}}`,
  `@media (prefers-color-scheme:dark){:root{${OSCURO}}}`,
  "*,*::before,*::after{box-sizing:border-box}",
  "html{background:var(--fondo)}",
  "body{margin:0;background:var(--fondo);color:var(--tinta);font:400 15px/1.55 var(--texto);" +
    "-webkit-font-smoothing:antialiased}",
  "h1,h2,h3,p,ul,ol,figure{margin:0;padding:0}ul,ol{list-style:none}a{color:var(--oro-fuerte)}",
  ".cuaderno{max-width:1180px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:24px}",
  ".atras{background:var(--oro-tinte);border:1px solid var(--oro);border-radius:12px;padding:12px 16px}",
  ".doble{display:grid;grid-template-columns:1fr 1fr;background:var(--papel);border-radius:20px;overflow:hidden;" +
    "box-shadow:0 1px 2px rgba(14,18,23,.06),0 12px 40px rgba(14,18,23,.14)}",
  ".doble>.pagina+.pagina{border-left:1px solid var(--raya)}",
  ".pagina{padding:40px 40px 36px;display:flex;flex-direction:column;gap:18px;min-width:0}",
  ".sola{grid-template-columns:1fr}",
  ".lomo{font:500 11px/1.2 var(--numeros);letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-tenue)}",
  "h1{font:400 44px/1.05 var(--titulos);letter-spacing:-.01em}",
  "h2{font:400 30px/1.1 var(--titulos)}",
  "h3{font:italic 400 21px/1.2 var(--titulos)}",
  ".lugar{font-style:italic;font-family:var(--titulos)}",
  ".portada{min-height:520px;justify-content:flex-end}",
  ".portada .entrada{font:400 19px/1.45 var(--titulos);color:var(--tinta-suave);max-width:34em}",
  ".foto-portada{position:relative;min-height:520px;background:var(--papel-2)}",
  ".foto-portada img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}",
  ".foto-portada figcaption{position:absolute;left:12px;bottom:12px;right:12px;font:400 11px/1.3 var(--texto);" +
    "color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}",
  ".dato{display:flex;flex-wrap:wrap;gap:8px 18px;color:var(--tinta-suave)}",
  ".num{font-family:var(--numeros);font-size:13px}",
  ".croquis{width:100%;height:auto;background:var(--papel-2);border-radius:14px;border:1px solid var(--raya)}",
  ".croquis .rejilla{stroke:var(--raya);stroke-width:1}",
  ".croquis .tramo{fill:none;stroke:var(--oro);stroke-width:3;stroke-dasharray:2 7;stroke-linecap:round;" +
    "stroke-linejoin:round}",
  ".croquis .punto circle{fill:var(--oro);stroke:var(--papel);stroke-width:3}",
  ".croquis .punto text{font:600 13px var(--numeros);fill:#0e1217}",
  ".croquis .nombre{font:italic 400 15px var(--titulos);fill:var(--tinta);paint-order:stroke;" +
    "stroke:var(--papel-2);stroke-width:4px}",
  ".croquis .casa path{fill:var(--tinta);stroke:var(--papel);stroke-width:2.5;stroke-linejoin:round}",
  ".croquis .escala line{stroke:var(--tinta-suave);stroke-width:1.5}",
  ".croquis .escala text,.croquis .norte text{font:500 11px var(--numeros);fill:var(--tinta-suave)}",
  ".croquis .norte path{fill:var(--tinta-suave)}",
  ".nota{font-size:12.5px;color:var(--tinta-tenue)}",
  ".lista{display:flex;flex-direction:column;gap:10px}",
  ".lista li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:baseline}",
  ".bola{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--oro);" +
    "color:#0e1217;font:600 12px var(--numeros)}",
  ".marcas{display:flex;flex-wrap:wrap;gap:6px}",
  ".marca{font:500 11px/1 var(--texto);padding:5px 8px;border-radius:999px;background:var(--oro-tinte);" +
    "color:var(--oro-fuerte)}",
  ".marca.ojo{background:rgba(168,78,8,.1);color:var(--ojo)}",
  ".parada{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--raya)}",
  ".parada:first-child{border-top:0;padding-top:0}",
  ".parada .cabeza{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:baseline}",
  ".parada figure{border-radius:12px;overflow:hidden;background:var(--papel-2)}",
  ".parada figure img{display:block;width:100%;height:190px;object-fit:cover}",
  ".parada figcaption{font-size:11px;color:var(--tinta-tenue);padding:6px 8px}",
  ".camino{color:var(--tinta-suave);font-size:14px;padding:2px 0 2px 40px;position:relative}",
  '.camino::before{content:"";position:absolute;left:12px;top:-6px;bottom:-6px;border-left:2px dotted var(--oro)}',
  ".tabla{width:100%;border-collapse:collapse;font-size:14px}",
  ".tabla td{text-align:left;padding:8px 10px 8px 0;border-top:1px solid var(--raya);vertical-align:top}",
  ".avisos{font-size:12.5px;color:var(--tinta-tenue);display:flex;flex-direction:column;gap:4px}",
  ".mota{width:8px;height:8px;border-radius:50%;background:var(--oro);margin:7px 0 0 9px}",
  ".reserva{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 0;" +
    "border-top:1px solid var(--raya)}",
  "@media (max-width:820px){.doble{grid-template-columns:1fr}" +
    ".doble>.pagina+.pagina{border-left:0;border-top:1px solid var(--raya)}" +
    ".pagina{padding:28px 20px}h1{font-size:34px}h2{font-size:26px}.portada,.foto-portada{min-height:300px}}",
  "@page{size:A5;margin:12mm}",
  `@media print{:root{${EN_PAPEL}}` +
    "body{font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".cuaderno{max-width:none;padding:0;gap:0}" +
    ".doble{display:block;box-shadow:none;border-radius:0;background:none;break-before:page}" +
    ".cuaderno>.doble:first-child{break-before:auto}.doble.cierre{break-before:auto;margin-top:9mm}" +
    ".pagina{padding:0}.doble>.pagina+.pagina{border:0;margin-top:7mm}" +
    ".foto-portada{min-height:0;height:95mm}.portada{min-height:0;padding-top:1mm}" +
    ".parada,.camino,.reserva,tr,.lista li{break-inside:avoid}.camino{break-after:avoid}" +
    ".camino::before{top:0;bottom:0}.parada figure img{height:44mm}" +
    "h1{font-size:26pt}h2{font-size:18pt}h3{font-size:13pt}a{color:inherit;text-decoration:none}" +
    'a[href]::after{content:" (" attr(href) ")";font-size:7pt;word-break:break-all;color:var(--tinta-tenue)}}',
].join("\n");

/** Las fotos ya bajadas, por su dirección: van dentro de la página, para que el documento se lea sin internet. */
export type Incrustadas = Map<string, string>;

/** Un trozo de HTML: su etiqueta, su clase (o ninguna) y lo de dentro, ya escapado. */
const h = (etiqueta: string, clase: string | null, ...dentro: string[]): string =>
  `<${etiqueta}${clase === null ? "" : ` class="${clase}"`}>${dentro.join("")}</${etiqueta}>`;
/** Un texto, escapado, en su etiqueta. */
const t = (etiqueta: string, clase: string | null, texto: string): string => h(etiqueta, clase, esc(texto));
const si = (condicion: boolean, trozo: () => string): string => (condicion ? trozo() : "");

function imagen(f: FotoDelCuaderno, incrustadas: Incrustadas, alt: string): string {
  const src = incrustadas.get(f.url) ?? direccion(f.url);
  return src === null ? "" : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;
}

function enlace(url: string | null, texto: string): string {
  const u = direccion(url);
  if (u === null) return esc(texto);
  return `<a href="${esc(u)}" rel="noopener noreferrer" target="_blank">${esc(texto)}</a>`;
}

/**
 * La página entera del cuaderno: un documento que se basta solo, sin programas, con su estilo dentro, que se lee en
 * la pantalla (en claro o en oscuro, en ancho o en el móvil) y se imprime en A5 en blanco. `atras` pone arriba que
 * el viaje ha cambiado desde que se hizo.
 */
export function pintarCuaderno(c: Cuaderno, o: { incrustadas?: Incrustadas; atras?: boolean } = {}): string {
  const r = rotulosDe(c.idioma);
  const fotos = o.incrustadas ?? new Map<string, string>();
  const largo = (f: string): string => fechaLarga(c.idioma, f);
  const corta = (f: string): string => fechaCorta(c.idioma, f);
  const precio = (p: Precio): string => t("p", "num", r.precio(dinero(c.idioma, p), largo(p.visto)));
  const pie = (f: FotoDelCuaderno): string => t("figcaption", null, r.foto(f.autor, f.licencia));
  const doble = (...paginas: string[]): string => h("section", "doble", ...paginas.map((x) => h("div", "pagina", x)));
  const hojas: string[] = [];

  // La portada, con la foto de lo que no hay que perderse si la hay.
  const portada =
    t("p", "lomo", r.guia) +
    t("h1", null, c.portada.titulo) +
    t("p", "lugar", r.deTuViaje(c.destino.nombre)) +
    t("p", "entrada", c.portada.entrada) +
    h(
      "p",
      "dato",
      t("span", null, r.fechas(largo(c.entrada), largo(c.salida), c.noches)),
      t("span", null, r.viajeros(c.adultos, c.ninos)),
    ) +
    h("div", "avisos", t("p", null, c.avisos.ia), t("p", null, r.hecha(largo(c.hecha), c.version)));
  const fp = c.portada.foto;
  hojas.push(
    fp === null
      ? h("section", "doble sola", h("div", "pagina portada", portada))
      : h(
          "section",
          "doble",
          h("figure", "foto-portada", imagen(fp, fotos, c.destino.nombre), pie(fp)),
          h("div", "pagina portada", portada),
        ),
  );

  // El viaje de un vistazo: todos los días en un croquis, y la lista.
  const todas = c.dias.flatMap((d) => d.paradas);
  let i = 0;
  const grupos = c.dias.map((d) => d.paradas.map(() => i++));
  const marcasDe = (ps: ParadaDelCuaderno[]) => ps.map((p) => ({ n: p.n, punto: p.punto, nombre: p.nombre }));
  const duerme = c.duermes?.punto ?? null;
  const vistazo = croquis(c.idioma, marcasDe(todas), duerme, { etiquetas: todas.length <= 10, grupos });
  const losDias = c.dias.map((d) =>
    h(
      "li",
      null,
      t("span", "num", String(d.n)),
      h(
        "div",
        null,
        t("h3", null, d.titulo),
        h("p", "dato", t("span", null, corta(d.fecha)), t("span", null, r.paradas(d.paradas.length))),
        t("p", "lugar", d.paradas.map((p) => p.nombre).join(", ")),
      ),
    ),
  );
  const dondeDuermes =
    c.duermes === null
      ? ""
      : h(
          "div",
          null,
          t("p", "lomo", r.duermes),
          t("h3", null, c.duermes.nombre),
          c.duermes.zona === null ? "" : t("p", "lugar", c.duermes.zona),
        );
  hojas.push(
    doble(
      t("p", "lomo", r.deUnVistazo) + t("h2", null, c.destino.nombre) + vistazo + t("p", "nota", r.mapaSin),
      h("ol", "lista", ...losDias) + dondeDuermes,
    ),
  );

  // Una doble página por día: a la izquierda, su croquis y sus paradas; a la derecha, lo que se cuenta.
  for (const d of c.dias) {
    const lista = d.paradas.map((p) =>
      h(
        "li",
        null,
        t("span", "bola", String(p.n)),
        h("div", null, t("span", "lugar", p.nombre), " ", t("span", "num", r.minutos(p.minutos))),
      ),
    );
    const izquierda =
      h("p", "lomo", esc(r.dia(d.n)), " ", t("span", "num", corta(d.fecha))) +
      t("h2", null, d.titulo) +
      t("p", null, d.entrada) +
      croquis(c.idioma, marcasDe(d.paradas), duerme) +
      t("p", "nota", r.mapaSin) +
      h("ol", "lista", ...lista);
    const piezas: string[] = [];
    const tramoA = new Map(d.tramos.map((x) => [x.a, x]));
    for (const p of d.paradas) {
      const x = tramoA.get(p.id);
      if (x !== undefined) {
        const lejos = metros(c.idioma, x.metros);
        const cuanto = x.aPie ? r.andando(x.minutos, lejos) : r.enCoche(x.minutos, lejos);
        const desde = x.de === "stay" ? `${r.desdeDondeDuermes}. ` : "";
        const numeros = `(${cuanto}${x.aproximado ? `, ${r.aproximado}` : ""})`;
        piezas.push(h("p", "camino", esc(`${desde}${x.dice} `), t("span", "num", numeros)));
      }
      const hora = p.mejorHora === null ? undefined : r.hora[p.mejorHora];
      const marcas =
        si(p.imprescindible, () => t("span", "marca", r.imprescindible)) +
        si(hora !== undefined, () => t("span", "marca", hora!)) +
        si(p.reservar === true, () => t("span", "marca ojo", r.reservar));
      piezas.push(
        h(
          "article",
          "parada",
          h("div", "cabeza", t("span", "bola", String(p.n)), t("h3", null, p.nombre)),
          si(marcas !== "", () => h("div", "marcas", marcas)),
          p.foto === null ? "" : h("figure", null, imagen(p.foto, fotos, p.nombre), pie(p.foto)),
          t("p", null, p.que),
          t("p", null, p.porQue),
          t("p", null, p.cuando),
        ),
      );
    }
    hojas.push(doble(izquierda, piezas.join("")));
  }

  // Dónde se duerme y cómo se llega, y dónde se reserva.
  const delViaje: string[] = [];
  if (c.duermes !== null) {
    const x = c.duermes;
    delViaje.push(
      h(
        "div",
        null,
        t("p", "lomo", r.duermes),
        t("h2", null, x.nombre),
        h(
          "p",
          "dato",
          x.zona === null ? "" : t("span", "lugar", x.zona),
          x.estrellas === null ? "" : t("span", null, r.estrellas(x.estrellas)),
          x.habitacion === null ? "" : t("span", null, `${r.habitacion}: ${x.habitacion}`),
          t("span", null, r.noches(c.noches)),
        ),
        precio(x.precio),
      ),
    );
  }
  if (c.llegas !== null) {
    const x = c.llegas;
    delViaje.push(
      h(
        "div",
        null,
        t("p", "lomo", r.llegas),
        h("h2", null, esc(r.transporte[x.clase] ?? x.clase), " ", t("span", "num", `${x.de} ${x.a}`)),
        h(
          "p",
          "dato",
          t("span", null, `${r.ida}: ${largo(x.sale)}`),
          x.vuelve === null ? "" : t("span", null, `${r.vuelta}: ${largo(x.vuelve)}`),
          x.escalas === null ? "" : t("span", null, r.escalas(x.escalas)),
        ),
        precio(x.precio),
        si(x.guardado, () => t("p", "nota", r.guardado)),
      ),
    );
  }
  const reservas = si(c.reservas.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.reservas),
      ...c.reservas.map((x) => {
        const que = x.que === "stay" ? x.nombre : `${r.transporte[c.llegas?.clase ?? "flight"] ?? ""} ${x.nombre}`;
        return h("div", "reserva", h("span", null, enlace(x.precio.enlace, que)), precio(x.precio));
      }),
      t("p", "nota", r.reservaEn),
    ),
  );

  // Lo que hay que llevar hecho, con su plazo; y los papeles, con los suyos. De qué va cada cosa lo dicen los datos.
  const deQueVa = (d: DeQueVa): string =>
    d.clase === "paper"
      ? `${(r.pregunta as Record<string, string>)[d.pregunta] ?? d.pregunta}, ${d.pais}`
      : d.clase === "book_ahead"
        ? `${d.nombre}. ${r.reservar}`
        : d.nombre;
  const antes = si(c.antes.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.antes),
      h(
        "ul",
        "lista",
        ...c.antes.map((a) =>
          h(
            "li",
            null,
            t("span", "bola", String(a.item + 1)),
            h(
              "div",
              null,
              a.de === null ? "" : h("p", null, t("b", null, deQueVa(a.de))),
              t("p", null, a.dice),
              a.plazo === null ? "" : t("p", "num", largo(a.plazo)),
            ),
          ),
        ),
      ),
    ),
  );
  let papeles = "";
  if (c.papeles !== null) {
    const { viajeros, casillas } = c.papeles;
    const filas = casillas.map((x) => {
      const quien = viajeros[x.viajero];
      const plazo = [
        x.hasta === null ? "" : r.hasta(largo(x.hasta)),
        x.antesDe === null ? "" : r.antesDe(largo(x.antesDe), x.tarde),
      ]
        .filter((s) => s !== "")
        .join(". ");
      const deQuien =
        quien === undefined ? x.pais : `${r.viajero(quien.pasaporte, quien.edad, quien.cuantos)}, ${x.pais}`;
      return h(
        "tr",
        null,
        h("td", null, esc(r.pregunta[x.pregunta] ?? x.pregunta), "<br>", t("span", "nota", deQuien)),
        t("td", null, r.estado[x.estado] ?? x.estado),
        t("td", null, plazo),
      );
    });
    papeles = h(
      "div",
      null,
      t("p", "lomo", r.papeles),
      t("p", "nota", r.papelesSub),
      filas.length === 0 ? t("p", null, r.estado.in_order) : h("table", "tabla", h("tbody", null, ...filas)),
    );
  }
  hojas.push(doble(delViaje.join("") + reservas, antes + papeles));

  // Lo que no se sabe, las fuentes y las fotos con sus autores, y los avisos con la fecha de los precios.
  const noSeSabe = si(c.noSeSabe.length > 0, () =>
    h(
      "div",
      null,
      t("p", "lomo", r.noSeSabe),
      h("ul", "lista", ...c.noSeSabe.map((x) => h("li", null, h("span", "mota"), t("p", null, x)))),
    ),
  );
  const creditos = todas.map((p) => {
    const autoria = p.foto === null ? "" : r.foto(p.foto.autor, p.foto.licencia);
    const foto = p.foto === null ? "" : `. ${p.foto.pagina === null ? esc(autoria) : enlace(p.foto.pagina, autoria)}`;
    const fuente = `. ${esc(r.fuente)}: ${enlace(p.fuente.enlace, p.fuente.nombre)}`;
    return h("li", null, t("span", "num", String(p.n)), h("p", null, t("span", "lugar", p.nombre), fuente, foto));
  });
  const avisos = h(
    "div",
    "avisos",
    t("p", null, c.avisos.ia),
    t("p", null, c.avisos.precios),
    c.preciosDel === null ? "" : t("p", null, r.preciosVistos(largo(c.preciosDel))),
    t("p", null, r.hecha(largo(c.hecha), c.version)),
  );
  const fuentes = h("div", null, t("p", "lomo", r.creditos), h("ul", "lista", ...creditos));
  hojas.push(h("section", "doble cierre", h("div", "pagina", noSeSabe + fuentes), h("div", "pagina", avisos)));

  const aviso = o.atras === true ? `<p class="atras" role="status">${esc(r.atras)}</p>` : "";
  const csp = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'";
  return (
    `<!doctype html><html lang="${esc(c.idioma)}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="referrer" content="no-referrer">` +
    `<title>${esc(`${r.guia}: ${c.destino.nombre}`)}</title><style>${ESTILO}</style></head>` +
    `<body><main class="cuaderno">${aviso}${hojas.join("")}</main></body></html>`
  );
}
