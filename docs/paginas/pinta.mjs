// El pintor de las dos biblias. La hoja y el plan se escriben una vez, en sus datos (hoja.datos.mjs y plan.datos.mjs),
// y de ahí salen sus páginas, que se publican, y sus textos, que se leen en el repositorio. Nada de eso se edita a
// mano.
//
//   node docs/paginas/pinta.mjs              escribe las páginas y los textos
//   node docs/paginas/pinta.mjs --comprobar  dice si alguno se ha quedado atrás, sin tocar nada

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hoja } from "./hoja.datos.mjs";
import { plan } from "./plan.datos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500" +
  "&family=Space+Grotesk:wght@500;600;700&display=swap";

// ---------- ayudas

const e = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** El texto con sus negritas (**así**) y su código (`así`) pasados a HTML. */
const t = (s) =>
  e(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
const plano = (s) => String(s).replace(/\*\*/g, "");
const punto = (i) => (typeof i === "string" ? { t: i } : i);

const ESTADOS = {
  hecho: "hecho",
  parte: "en parte",
  siguiente: "lo siguiente",
  pendiente: "pendiente",
  borrador: "en borrador",
  decidir: "por decidir",
};
const estado = (clave) => `<span class="estado ${clave}">${ESTADOS[clave]}</span>`;

const TIPOS = {
  tu: ["you", "Tú"],
  asiento: ["seat", "Asiento de IA"],
  codigo: ["script", "Código de la casa"],
  puerta: ["gate", "Puerta"],
  firma: ["gate sign", "Tu aprobación"],
  sale: ["out", "Lo que sale"],
};

/** El índice de la página: una fila de enlaces a sus partes. */
function indice(pares) {
  const enlaces = pares.map(([id, nombre]) => `<li><a href="#${id}">${e(nombre)}</a></li>`);
  return `<ul class="nav" aria-label="En esta página">${enlaces.join("")}</ul>`;
}

function cabeza(titulo) {
  const css = readFileSync(join(AQUI, "formato.css"), "utf8");
  return [
    `<title>${e(titulo)}</title>`,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    `<link rel="stylesheet" href="${FUENTES}">`,
    `<style>${css}</style>`,
  ].join("\n");
}

function lista(items) {
  return (
    "<ul>" +
    items
      .map(punto)
      .map((i) => `<li${i.n ? ' class="new"' : i.nada ? ' class="none"' : ""}>${t(i.t)}</li>`)
      .join("") +
    "</ul>"
  );
}

function tabla(b) {
  const filas = b.filas
    .map((f) => {
      const fila = Array.isArray(f) ? { c: f } : f;
      const celdas = fila.c.map((c, i) => {
        const esEstado = b.estados && i === fila.c.length - 1;
        return `<td>${esEstado ? estado(c) : t(c)}</td>`;
      });
      return `<tr${fila.n ? ' class="new"' : ""}>${celdas.join("")}</tr>`;
    })
    .join("\n");
  const cab = b.cab.map((c) => `<th>${e(c)}</th>`).join("");
  return (
    (b.titulo ? `<h3>${e(b.titulo)}</h3>\n` : "") +
    `<div class="tbl-wrap" role="region" tabindex="0" aria-label="${e(b.titulo ?? b.cab[0])}">` +
    `<table class="tbl"><thead><tr>${cab}</tr></thead><tbody>\n${filas}\n</tbody></table></div>` +
    (b.nota ? `\n<p class="note${b.notaNueva ? " new" : ""}">${t(b.nota)}</p>` : "")
  );
}

function bloque(b) {
  if (b.tipo === "p") return `<p>${t(b.texto)}</p>`;
  if (b.tipo === "tabla") return tabla(b);
  if (b.tipo === "dos") return `<div class="two">${b.bloques.map((x) => `<div>${tabla(x)}</div>`).join("\n")}</div>`;
  if (b.tipo === "metodo") {
    const pasos = b.pasos.map(
      (p) => `<li class="ph"><span class="n">${e(p.n)}</span><b>${e(p.b)}</b><span>${t(p.t)}</span></li>`,
    );
    return `<ol class="method">${pasos.join("\n")}</ol>`;
  }
  if (b.tipo === "siempre") return `<div class="always">${b.items.map((i) => `<span>${t(i)}</span>`).join("\n")}</div>`;
  if (b.tipo === "decidido") {
    return b.grupos
      .map((g) => {
        const items = g.items.map((i) => `<li><b>${t(i.b)}</b><span>${t(i.t)}</span></li>`);
        return `<p class="sec-label">${e(g.etiqueta)}</p>\n<ul class="changes">${items.join("\n")}</ul>`;
      })
      .join("\n");
  }
  if (b.tipo === "montado") {
    const celdas = (cs) =>
      '<div class="cells">' +
      cs.map((c) => `<div class="cell ${c.clase}"><b>${e(c.b)}</b>${t(c.t)}</div>`).join("") +
      "</div>";
    const capas = b.capas.map((c) =>
      c.celdas
        ? `<div class="lay ${c.clase}"><b>${e(c.b)}</b>${celdas(c.celdas)}</div>`
        : `<div class="lay ${c.clase}"><b>${e(c.b)}</b><span>${t(c.t)}</span></div>`,
    );
    const flecha = '<div class="to" aria-hidden="true">&rarr;</div>';
    return `<div class="arch" role="img" aria-label="${e(b.etiqueta)}">${capas.join(flecha)}</div>`;
  }
  throw new Error(`bloque desconocido: ${b.tipo}`);
}

function seccion(s) {
  return (
    `<section class="block" id="${s.id}" aria-labelledby="h-${s.id}">\n<h2 id="h-${s.id}">${e(s.titulo)}</h2>\n` +
    (s.intro ? `<p>${t(s.intro)}</p>\n` : "") +
    s.bloques.map(bloque).join("\n") +
    "\n</section>"
  );
}

// ---------- la hoja

function paso(p) {
  if (p.grupo) return `<span class="group${p.n ? " new" : ""}">${e(p.grupo)}</span>`;
  const [clase, tipo] = TIPOS[p.tipo];
  const clases = ["st", clase, p.opt ? "opt" : "", p.n ? "new" : ""].filter(Boolean).join(" ");
  const etiquetas =
    (p.web ? ' <span class="tag web">WEB</span>' : "") +
    (p.detras ? ' <span class="tag bg">DETRÁS</span>' : "") +
    (p.hecho ? ' <span class="tag done">HECHO</span>' : "");
  const dentro = `<span class="k">${e(p.k)}${etiquetas}</span><span class="x">${e(p.x)}</span>`;
  const cuerpo = clase.startsWith("gate")
    ? `<span class="dia" aria-hidden="true"></span><span>${dentro}</span>`
    : dentro;
  const porque = p.n ? ` data-new="${e(p.n === true ? "Por decidir." : p.n)}"` : "";
  return (
    `<button type="button" class="${clases}" data-kind="${e(tipo)}${p.hecho ? ". Ya construido" : ""}" ` +
    `data-t="${e(p.titulo ?? p.k)}" data-d="${e(plano(p.d))}"${porque}>${cuerpo}</button>`
  );
}

function rejilla(m) {
  const n = m.columnas.length;
  const cabeceras = m.columnas.map((c) => {
    const clases = ["stage", c.orden ? "seq" : "", c.siempre ? "any" : "", c.n ? "new" : ""].filter(Boolean).join(" ");
    const textos = `<b>${e(c.nombre)}</b><small>${e(c.sub)}</small><span class="when">${e(c.cuando)}</span>`;
    return `<div class="${clases}">${textos}</div>`;
  });
  const fila = (f) =>
    `<div class="row${f.clase ? " " + f.clase : ""}">\n` +
    `<div class="rl"><b>${e(f.nombre)}</b><small>${e(f.sub)}</small></div>\n` +
    f.celdas
      .map(
        (c) => `<div class="c">${c.lugar ? `<span class="who">${e(c.lugar)}</span>` : ""}${lista(c.items ?? c)}</div>`,
      )
      .join("\n") +
    "\n</div>";
  const flujo =
    `<div class="row">\n<div class="rl"><b>Flujo</b><small>quién hace cada paso, de arriba abajo</small></div>\n` +
    m.flujo.map((col) => `<div class="flow">\n${col.map(paso).join("\n")}\n</div>`).join("\n") +
    "\n</div>";
  const antes = m.filas.filter((f) => f.antes);
  const despues = m.filas.filter((f) => !f.antes);
  return (
    `<div class="scroll" role="region" tabindex="0" aria-label="Los momentos, desplazable en horizontal">\n` +
    `<div class="grid" id="grid" style="--n: ${n}; min-width: ${220 * n + 160}px;">\n` +
    '<div class="row nolines">\n<div class="rl"><b>Momento</b><small>y cuándo se abre</small></div>\n' +
    `${cabeceras.join("\n")}\n</div>\n` +
    antes.map(fila).join("\n") +
    "\n" +
    flujo +
    "\n" +
    despues.map(fila).join("\n") +
    "\n</div>\n</div>"
  );
}

const LEYENDA = [
  ['<span class="sw seat"></span>', "asiento de IA"],
  ['<span class="sw script"></span>', "código de la casa"],
  ['<span class="sw opt"></span>', "solo si hace falta"],
  ['<span class="sw-dia"></span>', "puerta: la comprueba la casa"],
  ['<span class="sw-dia sign"></span>', "tu aprobación: un toque tuyo"],
  ['<span class="sw you"></span>', "tú"],
  ['<span class="tag web">WEB</span>', "busca en internet"],
  ['<span class="tag bg">DETRÁS</span>', "corre por detrás"],
  ['<span class="tag done">HECHO</span>', "ya construido"],
  ['<span class="sw new"></span>', "por decidir o por diseñar"],
];

function paginaDeLaHoja(h) {
  const caja = (c) =>
    `<section class="box" aria-labelledby="h-${c.id}">\n<h2 id="h-${c.id}">${e(c.titulo)}</h2>\n` +
    `${lista(c.items)}\n</section>`;
  const dias = h.tiempo.dias.map(
    (d) =>
      `<li class="day${d.despues ? " later" : ""}"><span class="when">${e(d.cuando)}</span>` +
      `<b>${e(d.b)}</b><p>${t(d.t)}</p>` +
      `<span class="m">${d.momentos.map((m) => `<span class="pill">${e(m)}</span>`).join("")}</span></li>`,
  );
  const leyenda = LEYENDA.map(([marca, texto]) => `<li>${marca}${texto}</li>`).join("\n");
  const js = readFileSync(join(AQUI, "formato.js"), "utf8");
  return [
    cabeza(h.titulo),
    '<main class="page">',
    "<header>",
    `<p class="kicker">${e(h.kicker)}</p>`,
    `<h1>${e(h.h1)}</h1>`,
    `<p class="sub">${h.sub.map((x) => (x.v ? `<span class="v">${t(x.v)}</span>` : t(x))).join(" ")}</p>`,
    indice(h.nav),
    "</header>",
    `<div class="brief" id="version">\n${h.cajas.map(caja).join("\n")}\n</div>`,
    `<section class="block" id="tiempo" aria-labelledby="h-tiempo">\n<h2 id="h-tiempo">${e(h.tiempo.titulo)}</h2>`,
    `<p>${t(h.tiempo.intro)}</p>\n<ol class="days">${dias.join("\n")}</ol>\n</section>`,
    `<section class="block" id="momentos" aria-labelledby="h-momentos">\n<h2 id="h-momentos">Los momentos</h2>`,
    `<p>${t(h.momentos.intro)}</p>`,
    `<div class="bar"><ul class="legend" aria-label="Leyenda">\n${leyenda}\n</ul>`,
    '<button type="button" class="toggle" id="only-new" aria-pressed="false">',
    "Resaltar lo que está por decidir</button></div>",
    '<p class="hint">Desliza en horizontal para ver todos los momentos.</p>',
    rejilla(h.momentos),
    "</section>",
    h.secciones.map(seccion).join("\n"),
    '<div class="detail" id="detail" hidden role="region" aria-live="polite" aria-label="Detalle del paso">',
    '<div class="detail-in"><div class="detail-text"><p class="detail-kind" id="d-kind"></p>',
    '<p class="detail-title" id="d-title"></p><p class="detail-body" id="d-body"></p>',
    '<p class="detail-new" id="d-new" hidden></p></div>',
    '<button type="button" class="close" id="d-close">Cerrar</button></div></div>',
    "</main>",
    `<script>\n${js}</script>`,
    "",
  ].join("\n");
}

// ---------- los textos

const mdLista = (items) =>
  items
    .map(punto)
    .map((i) => `- ${i.t}${i.n ? " *(por decidir)*" : ""}`)
    .join("\n");

function mdTabla(b) {
  const celda = (c, ultimo) => String(b.estados && ultimo ? ESTADOS[c] : c).replace(/\|/g, "/");
  const filas = b.filas.map((f) => {
    const fila = Array.isArray(f) ? { c: f } : f;
    return `| ${fila.c.map((c, i) => celda(c, i === fila.c.length - 1)).join(" | ")} |`;
  });
  return (
    (b.titulo ? `### ${b.titulo}\n\n` : "") +
    `| ${b.cab.join(" | ")} |\n|${b.cab.map(() => "---").join("|")}|\n${filas.join("\n")}` +
    (b.nota ? `\n\n${b.nota}` : "")
  );
}

function mdBloque(b) {
  if (b.tipo === "p") return b.texto;
  if (b.tipo === "tabla") return mdTabla(b);
  if (b.tipo === "dos") return b.bloques.map(mdTabla).join("\n\n");
  if (b.tipo === "metodo") return b.pasos.map((p) => `- **${p.n}. ${p.b}.** ${p.t}`).join("\n");
  if (b.tipo === "siempre") return b.items.map((i, n) => `${n + 1}. ${i}`).join("\n");
  if (b.tipo === "decidido") {
    return b.grupos
      .map((g) => `**${g.etiqueta}**\n\n${g.items.map((i) => `- **${i.b}** ${i.t}`).join("\n")}`)
      .join("\n\n");
  }
  if (b.tipo === "montado") {
    return b.capas
      .map((c) => `- **${c.b}**: ${c.celdas ? c.celdas.map((x) => `${x.b} (${x.t})`).join("; ") : c.t}`)
      .join("\n");
  }
  throw new Error(`bloque desconocido: ${b.tipo}`);
}

const AVISO = (que, pagina, url) =>
  `> ${que} Se genera de sus datos, [paginas/${pagina}.datos.mjs](paginas/${pagina}.datos.mjs), con ` +
  `\`node docs/paginas/pinta.mjs\`, igual que su página, [paginas/${pagina}.html](paginas/${pagina}.html)` +
  (url ? `, publicada en ${url}` : "") +
  ". No se edita a mano.";

function textoDeLaHoja(h) {
  const m = h.momentos;
  const partes = [`# ${h.h1}`, AVISO("La primera biblia: qué es El Dorado.", "hoja", h.url), h.kicker + "."];
  partes.push(h.sub.map((x) => (x.v ? x.v : x)).join(" "));
  for (const c of h.cajas) partes.push(`## ${c.titulo}`, mdLista(c.items));
  partes.push(`## ${h.tiempo.titulo}`, h.tiempo.intro);
  partes.push(h.tiempo.dias.map((d) => `- **${d.cuando}. ${d.b}.** ${d.t} *(${d.momentos.join(", ")})*`).join("\n"));
  partes.push("## Los momentos", m.intro);
  m.columnas.forEach((c, i) => {
    partes.push(`### ${i + 1}. ${c.nombre}${c.n ? " *(por diseñar)*" : ""}`, `${c.sub}. Se abre: ${c.cuando}.`);
    for (const f of m.filas.filter((x) => x.antes)) {
      const celda = f.celdas[i];
      partes.push(`**${f.nombre}**${celda.lugar ? ` (${celda.lugar})` : ""}\n\n${mdLista(celda.items ?? celda)}`);
    }
    const pasos = m.flujo[i].map((p, n) => {
      if (p.grupo) return `   *${p.grupo}*`;
      const marcas = [p.opt ? "solo si hace falta" : "", p.hecho ? "hecho" : "", p.n ? "por decidir" : ""].filter(
        Boolean,
      );
      const cola = marcas.length ? ` *(${marcas.join(", ")})*` : "";
      return `${n + 1}. **${p.titulo ?? p.k}** (${TIPOS[p.tipo][1].toLowerCase()})${cola}. ${plano(p.d)}`;
    });
    partes.push(`**Flujo**\n\n${pasos.join("\n")}`);
    for (const f of m.filas.filter((x) => !x.antes)) {
      const celda = f.celdas[i];
      partes.push(`**${f.nombre}**\n\n${mdLista(celda.items ?? celda)}`);
    }
  });
  for (const s of h.secciones) {
    partes.push(`## ${s.titulo}`);
    if (s.intro) partes.push(s.intro);
    partes.push(...s.bloques.map(mdBloque));
  }
  return partes.join("\n\n") + "\n";
}

// ---------- el plan

/** Cada caja del flujo de la hoja con los puntos del plan que la construyen: [momento, caja, puntos]. */
export function cajasConSuPunto(h = hoja, p = plan) {
  const filas = [];
  h.momentos.flujo.forEach((columna, i) => {
    for (const caja of columna) {
      if (caja.grupo) continue;
      filas.push([h.momentos.columnas[i].nombre, caja.titulo ?? caja.k, (p.cajas[i] ?? {})[caja.k] ?? []]);
    }
  });
  return filas;
}

const tablaDeCajas = () => ({
  tipo: "tabla",
  cab: ["Momento", "Caja de la hoja", "Puntos"],
  filas: cajasConSuPunto().map(([momento, caja, puntos]) => [momento, caja, puntos.join(", ")]),
});

const SECCION_DE_CAJAS = {
  id: "cajas",
  titulo: "Cada caja de la hoja, en su punto",
  intro:
    "Cada caja del flujo de la hoja, con el punto que la construye. La prueba del repositorio comprueba que no falta " +
    "ninguna y que cada punto existe.",
};

function paginaDelPlan(p) {
  const resumen = {
    tipo: "tabla",
    cab: ["Bloque", "Qué deja", "Estado"],
    estados: true,
    filas: p.bloques.map((b) => [`${b.n}. ${b.nombre}`, b.deja, b.estado]),
  };
  const bloques = p.bloques.map((b) => {
    const puntos = {
      tipo: "tabla",
      cab: ["Punto", "Qué", "Estado"],
      estados: true,
      filas: b.puntos.map((x) => ({ c: [x.n, `**${x.b}** ${x.t}`, x.estado], n: x.estado === "decidir" })),
    };
    return (
      `<section class="block" id="b${b.n}" aria-labelledby="h-b${b.n}">\n` +
      `<h2 id="h-b${b.n}">${b.n}. ${e(b.nombre)} ${estado(b.estado)}</h2>\n<p>${t(b.intro)}</p>\n` +
      `<ul><li><b>Deja</b>: ${t(b.deja)}</li><li><b>Se prueba</b>: ${t(b.prueba)}</li>` +
      `<li><b>Tu visto bueno</b>: ${t(b.firma)}</li></ul>\n${tabla(puntos)}\n</section>`
    );
  });
  return [
    cabeza(p.titulo),
    '<main class="page">',
    "<header>",
    `<p class="kicker">${e(p.kicker)}</p>`,
    `<h1>${e(p.h1)}</h1>`,
    `<p class="sub">${t(p.sub)}</p>`,
    indice(p.bloques.map((b) => [`b${b.n}`, `${b.n}. ${b.nombre}`])),
    "</header>",
    `<p class="aqui"><b>Estamos aquí: ${e(p.aqui.punto)}.</b> ${t(p.aqui.texto)}</p>`,
    '<section class="block" id="estado" aria-labelledby="h-estado">\n<h2 id="h-estado">El estado</h2>',
    `${tabla(resumen)}\n</section>`,
    seccion({
      id: "orden",
      titulo: "Por dónde vamos, y por qué en este orden",
      intro: p.orden.intro,
      bloques: p.orden.bloques,
    }),
    bloques.join("\n"),
    seccion({ ...SECCION_DE_CAJAS, bloques: [tablaDeCajas()] }),
    p.secciones.map(seccion).join("\n"),
    "</main>",
    "",
  ].join("\n");
}

function textoDelPlan(p) {
  const partes = [
    `# ${p.h1}`,
    AVISO("La segunda biblia: cómo se construye El Dorado.", "plan", p.url),
    p.kicker + ".",
    p.sub,
  ];
  partes.push(`**Estamos aquí: ${p.aqui.punto}.** ${p.aqui.texto}`);
  partes.push(
    "## El estado",
    "| Bloque | Estado |\n|---|---|\n" +
      p.bloques.map((b) => `| ${b.n}. ${b.nombre} | ${ESTADOS[b.estado]} |`).join("\n"),
  );
  partes.push("## Por dónde vamos, y por qué en este orden", p.orden.intro, ...p.orden.bloques.map(mdBloque));
  for (const b of p.bloques) {
    partes.push(`## ${b.n}. ${b.nombre}`, `*${ESTADOS[b.estado]}.* ${b.intro}`);
    partes.push(`- **Deja**: ${b.deja}\n- **Se prueba**: ${b.prueba}\n- **Tu visto bueno**: ${b.firma}`);
    const filas = b.puntos.map((x) => `| ${x.n} | **${x.b}** ${x.t} | ${ESTADOS[x.estado]} |`);
    partes.push(`| Punto | Qué | Estado |\n|---|---|---|\n${filas.join("\n")}`);
  }
  partes.push(`## ${SECCION_DE_CAJAS.titulo}`, SECCION_DE_CAJAS.intro, mdTabla(tablaDeCajas()));
  for (const s of p.secciones) {
    partes.push(`## ${s.titulo}`);
    if (s.intro) partes.push(s.intro);
    partes.push(...s.bloques.map(mdBloque));
  }
  return partes.join("\n\n") + "\n";
}

// ---------- escribir o comprobar

export function todo() {
  return [
    [join(AQUI, "hoja.html"), paginaDeLaHoja(hoja)],
    [join(AQUI, "..", "hoja.md"), textoDeLaHoja(hoja)],
    [join(AQUI, "plan.html"), paginaDelPlan(plan)],
    [join(AQUI, "..", "plan.md"), textoDelPlan(plan)],
  ];
}

/** Los archivos que no coinciden con lo que saldría hoy de los datos. */
export function atrasados() {
  return todo()
    .filter(([ruta, contenido]) => {
      try {
        return readFileSync(ruta, "utf8") !== contenido;
      } catch {
        return true;
      }
    })
    .map(([ruta]) => ruta);
}

if (import.meta.main) {
  if (process.argv.includes("--comprobar")) {
    const viejos = atrasados();
    for (const v of viejos) console.error(`atrasado: ${v}`);
    process.exit(viejos.length === 0 ? 0 : 1);
  }
  for (const [ruta, contenido] of todo()) writeFileSync(ruta, contenido);
  console.log("La hoja y el plan, pintados.");
}
