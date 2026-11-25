// La guía (12.1 y 12.2): lo que se le da al que escribe la guía, la puerta 10 con sus trampas, el cuaderno y cómo
// sale la guía de un viaje cerrado, con su versión. Con el viaje inventado y un asiento de mentira: sin gastar.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  puertaCuaderno,
  puertaGuia,
  type EntregaDeLaGuia,
  type MaterialDeLaGuia,
} from "../../agent/gates/puerta_guia.ts";
import {
  carpetaDeLaGuia,
  documentoDeLaGuia,
  FalloDeLaGuia,
  guiaDeCara,
  llevarLaGuia,
  materialDeLaGuia,
  pedirGuia,
} from "../../agent/launcher/guia.ts";
import { guardarVersion, leerVersion, leerViaje, nuevoRun, pasar } from "../../agent/launcher/mesa.ts";
import { comprobarViaje } from "../../agent/output/viaje.ts";
import { montarCuaderno, pintarCuaderno, proyectar } from "../../agent/scripts/cuaderno.ts";
import { IDIOMAS_DE_LA_GUIA, ROTULOS } from "../../agent/data/guia.ts";
import { AVISOS } from "../../agent/data/palabras.ts";
import { gastoDeLaCuenta } from "../../agent/launcher/gasto.ts";
import type { Viaje } from "../../agent/output/viaje.ts";
import { JPEG, type Objeto } from "../cases/inventado/asientos.ts";
import { SUCESOS_INVENTADOS } from "../cases/inventado/viaje.ts";
import {
  ENLACES_DEL_CIERRE,
  entregaDeLaGuia,
  HOY,
  lanzadorDeLaGuia,
  viajeCerradoEnLaMesa,
  viajeCerradoPorSuFlujo,
  viajeParaLaGuia,
} from "../cases/inventado/guia.ts";

/** Ni rayas largas, ni puntos medios, ni el carácter de puntos suspensivos, por sus códigos. */
const PROHIBIDOS = new RegExp(`[${String.fromCharCode(0x2014, 0xb7, 0x2026)}]`);
const CONTRATO = resolve(import.meta.dirname, "..", "..", "agent", "contracts", "guide-writer");

/** Una mesa con el viaje inventado cerrado, y lo que se le daría al que escribe su guía con la mejor manera. */
function conMaterial(prueba: (m: MaterialDeLaGuia & { viaje: ReturnType<typeof viajeParaLaGuia> }) => void): void {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    prueba(materialDeLaGuia(v, p));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

const rojosDe = (entrega: Objeto, m: MaterialDeLaGuia): string[] =>
  puertaGuia(entrega, m).rojos.map((r) => `${r.donde}: ${r.que}`);

test("el contrato del que escribe la guía está entero, en inglés, y dice lo que no puede añadir", () => {
  for (const nombre of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md"])
    assert.ok(existsSync(join(CONTRATO, nombre)), nombre);
  const leer = (n: string): string => readFileSync(join(CONTRATO, n), "utf8");
  assert.match(leer("DELIVERY.md"), /\| `seat` \| Always `"guide-writer"` \|/);
  assert.match(leer("RULES.md"), /\*\*GW1\. Only the places of the trip\.\*\*/);
  assert.match(leer("RULES.md"), /\*\*GW3\. No prices and no clock times\.\*\*/);
  assert.match(leer("README.md"), /You do not use the internet/);
  // Sin internet: no lleva lo que sí llevan los que salen a buscar.
  assert.ok(!existsSync(join(CONTRATO, "INTERNET.md")));
  for (const n of ["README.md", "GUIDE.md", "RULES.md", "DELIVERY.md"]) assert.doesNotMatch(leer(n), PROHIBIDOS);
});

test("al que escribe la guía se le da el viaje día a día, con sus tramos y lo que llevar hecho, sin un precio", () => {
  conMaterial((m) => {
    const { dado } = m;
    // El viaje de la prueba es un viaje que la web enseñaría.
    assert.deepEqual(comprobarViaje(m.viaje), []);
    assert.equal(dado.trip.language, "es");
    assert.equal(dado.days.length, 2);
    assert.deepEqual(
      dado.days[0].stops.map((p) => p.id),
      ["p1", "p2"],
    );
    // Lo que dicen sus fuentes, con el principio de su artículo; y lo que no se sabe, dicho como tal.
    assert.match(dado.days[0].stops[1].about, /covered market The Mercado Inventado is the oldest/);
    assert.equal(dado.days[1].stops[0].about, "unknown");
    // El primer tramo de cada día sale de donde se duerme, que es el de la manera pedida.
    assert.equal(dado.stay.lodging, "Hotel Inventado");
    assert.deepEqual(
      dado.days[0].legs.map((l) => `${l.from}>${l.to}`),
      ["stay>p1", "p1>p2"],
    );
    assert.ok(dado.days[0].legs.every((l) => l.metres > 0 && l.minutes > 0 && l.measured_by === "estimate"));
    // Lo que hay que llevar hecho: la parada que se reserva, el papel con su plazo y el aviso de las fechas.
    assert.deepEqual(
      dado.todo.map((c) => c.kind),
      ["book_ahead", "paper", "dates"],
    );
    assert.deepEqual(
      dado.todo.map((c) => c.item),
      [0, 1, 2],
    );
    // Ningún precio en lo que se le da: ni un importe ni una moneda.
    const todo = JSON.stringify(dado);
    assert.doesNotMatch(todo, /EUR|precio|total|enlace|reservas\.inventado/);
    // Los demás sitios que se conocen: el que no se eligió y el que se quedó fuera.
    assert.deepEqual([...new Set(m.otrosSitios)].sort(), ["Museo Inventado", "Palacio Olvidado"]);
  });
});

test("la puerta 10 deja pasar una guía que solo cuenta lo que hay en el viaje", () => {
  conMaterial((m) => assert.deepEqual(rojosDe(entregaDeLaGuia(m.dado), m), []));
});

test("la puerta 10 caza cada trampa: un sitio de fuera, un precio, una hora, un número, una promesa, un enlace", () => {
  conMaterial((m) => {
    const trampa = (cambia: (e: EntregaDeLaGuia) => void, espera: RegExp): void => {
      const e = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
      cambia(e);
      const rojos = rojosDe(e as unknown as Objeto, m);
      assert.ok(
        rojos.some((r) => espera.test(r)),
        `${espera} no salió en ${JSON.stringify(rojos)}`,
      );
    };
    const parada = (e: EntregaDeLaGuia) => e.days[0].stops[0];
    // Un sitio del destino que no es del viaje, aunque lo nombren sus fuentes; y el que se quedó fuera.
    trampa(
      (e) => (parada(e).what = "Una torre junto al palacio Palacio Olvidado."),
      /Palacio Olvidado.*no es una parada/,
    );
    trampa((e) => (parada(e).why = "Y después, el museo museo inventado."), /Museo Inventado.*no es una parada/);
    // Un precio, en cualquier forma; una hora del reloj.
    trampa((e) => (parada(e).when = "La entrada cuesta 12 €."), /habla de dinero/);
    trampa((e) => (parada(e).when = "Abre a las 9 de la mañana."), /dice la hora 9/);
    trampa((e) => (parada(e).when = "Mejor antes de las 10:30."), /dice la hora 10:30/);
    // Un número que no es del viaje; una promesa; un enlace; un teléfono.
    trampa((e) => (parada(e).what = "Tiene 37 metros de alto."), /dice 37, que no está en el viaje/);
    trampa((e) => (parada(e).why = "Te va a encantar."), /promete/);
    trampa((e) => (parada(e).why = "Más en torre-inventada.example."), /enlace/);
    trampa((e) => (parada(e).why = "Llama al 912 345 678."), /número largo/);
    // Un año que solo viene dentro de lo que dicen sus fuentes no es de la casa.
    trampa((e) => (parada(e).what = "Una torre de piedra de 1520."), /dice 1520/);
    // La forma: el idioma, una parada de más o de menos, un tramo que falta, una cosa sin su frase.
    trampa((e) => (e.language = "en"), /idioma del viajero/);
    trampa((e) => e.days[0].stops.pop(), /falta la parada p2/);
    trampa(
      (e) => e.days[0].stops.push({ id: "p4", what: "Un museo.", why: "Por si llueve.", when: "Cuando sea." }),
      /p4 no es una parada de este día/,
    );
    trampa((e) => e.days[0].legs.shift(), /falta el tramo stay a p1/);
    trampa((e) => e.todo.pop(), /falta la frase de la cosa 2/);
    trampa((e) => (e.unknowns = []), /no se saben y no se le dicen/);
    trampa((e) => e.days.reverse(), /en su orden/);
    trampa((e) => ((e as unknown as Objeto).extra = 1), /extra: no es de la entrega/);
  });
});

test("la puerta 10 no deja contar a pie un tramo que no se anda", () => {
  const viaje = viajeParaLaGuia();
  // La tercera parada, lejos: el tramo desde donde se duerme no se anda.
  viaje.paradas[2].punto = { lat: 10.5, lon: 20.5 };
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje });
  try {
    const m = materialDeLaGuia(v, pedirGuia(v, { manera: "best_value", hoy: HOY }));
    const tramo = m.dado.days[1].legs[0];
    assert.equal(tramo.on_foot, false);
    const e = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    assert.deepEqual(rojosDe(e as unknown as Objeto, m), []);
    e.days[1].legs[0].says = `Son ${tramo.minutes} minutos andando.`;
    assert.ok(rojosDe(e as unknown as Objeto, m).some((r) => /no se anda/.test(r)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el cuaderno junta el viaje y lo escrito; su puerta caza una foto sin autor, un precio ajeno y un aviso", () => {
  conMaterial((m) => {
    const escrita = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    const c = montarCuaderno(m.viaje, m.dado, escrita, { manera: "best_value", hecha: HOY });
    assert.deepEqual(puertaCuaderno(c, m.viaje).rojos, []);
    assert.equal(c.version, 1);
    assert.deepEqual(
      c.dias.map((d) => d.paradas.map((p) => p.n)),
      [[1, 2], [3]],
    );
    assert.equal(c.duermes?.nombre, "Hotel Inventado");
    assert.equal(c.reservas.length, 1);
    assert.equal(c.preciosDel, "2026-11-23");
    assert.equal(c.antes[1].plazo, "2027-02-09");
    // De qué va cada cosa que hay que llevar hecha lo dicen los datos del viaje, no la frase del que escribe; y un
    // aviso de las fechas sin nombre propio se queda sin rótulo.
    assert.deepEqual(
      c.antes.map((a) => a.de),
      [
        { clase: "book_ahead", nombre: "Mercado Inventado" },
        { clase: "paper", pregunta: "arrival_card", pais: "ZZ" },
        null,
      ],
    );
    const pintado = pintarCuaderno(c);
    assert.ok(pintado.includes("<b>Mercado Inventado. Hay que reservar</b>"));
    assert.ok(pintado.includes("<b>Formulario antes de llegar, ZZ</b>"));
    assert.ok(!pintado.includes("<b>unknown"));
    // La foto con su autor y su licencia; la que no los lleva, no entra.
    assert.equal(c.dias[0].paradas[0].foto?.autor, "Una Autora");
    const sinAutor = structuredClone(m.viaje);
    sinAutor.paradas[0].foto = { url: "https://fotos.invalid/x.jpg", autor: null, licencia: "CC0", pagina: null };
    assert.equal(
      montarCuaderno(sinAutor, m.dado, escrita, { manera: "best_value", hecha: HOY }).dias[0].paradas[0].foto,
      null,
    );
    // Las trampas del cuaderno ya montado.
    const roto = structuredClone(c);
    roto.dias[0].paradas[0].foto = { url: "https://fotos.invalid/x.jpg", autor: "", licencia: "CC0", pagina: null };
    roto.duermes!.precio = { ...roto.duermes!.precio, total: 1 };
    roto.avisos.ia = "";
    roto.reservas[0].enlaces[0].url = "http://reservas.inventado.example/x";
    const rojos = puertaCuaderno(roto, m.viaje).rojos.map((r) => r.que);
    for (const espera of [/sin su autor/, /no es uno del viaje/, /aviso de que está hecha con IA/, /https sin claves/])
      assert.ok(
        rojos.some((r) => espera.test(r)),
        `${espera} en ${JSON.stringify(rojos)}`,
      );
  });
});

test("el cuaderno se pinta como una página que se basta sola: sin programas, escapada, con croquis y avisos", () => {
  conMaterial((m) => {
    const escrita = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    escrita.cover.title = "<script>alert(1)</script> Villa";
    const c = montarCuaderno(m.viaje, m.dado, escrita, { manera: "best_value", hecha: HOY });
    const html = pintarCuaderno(c);
    assert.ok(html.startsWith("<!doctype html>"));
    assert.ok(!/<script/i.test(html), "no lleva ningún programa");
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /default-src 'none'/);
    assert.match(html, /<html lang="es">/);
    assert.match(html, /<svg class="croquis"/);
    assert.match(html, /@page\{size:A5/);
    assert.match(html, /Hecho con IA: puede tener errores/);
    assert.match(html, /Los precios son orientativos/);
    assert.match(html, /Foto: Una Autora, CC BY-SA 4\.0/);
    assert.match(html, /href="https:\/\/reservas\.inventado\.example\/hotel"/);
    assert.match(html, /Día 2/);
    // Ni rayas largas, ni puntos medios, ni puntos suspensivos.
    assert.doesNotMatch(html, PROHIBIDOS);
    assert.ok(!html.includes("Tu viaje ha cambiado"));
    assert.match(pintarCuaderno(c, { atras: true }), /Tu viaje ha cambiado desde que se hizo esta guía/);
    // En inglés, los rótulos en inglés; en un idioma sin rótulos, ninguno por defecto: no se pinta.
    assert.match(pintarCuaderno({ ...c, idioma: "en" }), /Where you sleep/);
    assert.throws(() => pintarCuaderno({ ...c, idioma: "fi" }), /no sale en fi/);
  });
});

test("el croquis pone el norte arriba, con la misma escala en los dos sentidos, y aguanta un solo punto", () => {
  const { donde } = proyectar(
    [
      { lat: 10, lon: 20 },
      { lat: 10.01, lon: 20.01 },
    ],
    600,
    400,
    50,
  );
  const a = donde({ lat: 10, lon: 20 });
  const b = donde({ lat: 10.01, lon: 20.01 });
  assert.ok(b.y < a.y && b.x > a.x);
  const uno = proyectar([{ lat: 10, lon: 20 }], 600, 400, 50).donde({ lat: 10, lon: 20 });
  assert.ok(Math.abs(uno.x - 300) < 1e-6 && Math.abs(uno.y - 200) < 1e-6);
});

test("«Quiero mi guía» solo con el viaje cerrado, y con su manera si tiene más de una", () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    assert.throws(
      () => pedirGuia(v, { hoy: HOY }),
      (e: unknown) => e instanceof FalloDeLaGuia && e.message === "which_way",
    );
    assert.throws(() => pedirGuia(v, { manera: "different", hoy: HOY }), /which_way/);
    pasar(v, "researching", HOY);
    assert.throws(() => pedirGuia(v, { manera: "best_value", hoy: HOY }), /not_closed/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("trampa: la versión de la guía es la de la mesa, no el número que el viaje lleva dentro", async () => {
  // Pasó con el primer viaje cerrado de verdad: cerrar deja otra versión en la mesa con el mismo número dentro del
  // viaje, y la guía recién hecha decía que se había quedado atrás.
  const viaje = viajeParaLaGuia();
  viaje.version = 7;
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje });
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    const e = await llevarLaGuia(v, p.n, lanzadorDeLaGuia(), { hoy: () => HOY, sinFotos: true });
    assert.deepEqual(e, { estado: "ready" });
    const cuaderno = JSON.parse(readFileSync(join(carpetaDeLaGuia(v, p.n), "guia.json"), "utf8"));
    assert.equal(cuaderno.version, v.ficha.version);
    assert.equal(guiaDeCara(v, false)?.behind, false);
    const documento = documentoDeLaGuia(v) ?? "";
    assert.ok(!documento.includes('class="atras"'), "la guía recién hecha dice que se ha quedado atrás");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la guía se hace con la manera con que se cerró el viaje, se pida la que se pida", () => {
  const viaje = viajeParaLaGuia();
  viaje.cierre = { manera: "cheapest" } as never;
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje });
  try {
    assert.equal(pedirGuia(v, { hoy: HOY }).manera, "cheapest");
    assert.equal(pedirGuia(v, { manera: "best_value", hoy: HOY }).manera, "cheapest");
    assert.equal(pedirGuia(v, { manera: "different", hoy: HOY }).manera, "cheapest");
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la guía sale de un viaje cerrado: con su versión, con sus fotos dentro, y dice si se queda atrás", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", techo: 1, hoy: HOY });
    assert.equal(guiaDeCara(v, true)?.state, "working");
    const lanzador = lanzadorDeLaGuia();
    const traidas: string[] = [];
    const e = await llevarLaGuia(v, p.n, lanzador, {
      hoy: () => HOY,
      traer: async (url) => (traidas.push(url), JPEG),
      encoger: async (b) => b,
    });
    assert.deepEqual(e, { estado: "ready" });
    assert.equal(lanzador.veces, 1);
    const carpeta = carpetaDeLaGuia(v, p.n);
    for (const nombre of ["pedida.json", "escrita.json", "guia.json", "guia.html", "trabajos.json"])
      assert.ok(existsSync(join(carpeta, nombre)), nombre);
    // La foto, bajada una vez y dentro del documento: se lee sin internet.
    assert.deepEqual(traidas, ["https://fotos.inventado.example/torre.jpg"]);
    const html = documentoDeLaGuia(v);
    assert.ok(html !== null && html.includes("data:image/jpeg;base64,"));
    const cara = guiaDeCara(v, false);
    assert.equal(cara?.state, "ready");
    assert.equal(cara?.version, 1);
    assert.equal(cara?.behind, false);
    assert.equal(cara?.way, "best_value");
    // Si el viaje cambia, la guía se queda como estaba, y dice que se ha quedado atrás.
    const deNuevo = leerViaje(v.ficha.id, "ana", mesa);
    const run = nuevoRun(deNuevo, HOY);
    const cambiado = viajeParaLaGuia();
    cambiado.version = 2;
    writeFileSync(join(run, "viaje.json"), JSON.stringify(cambiado));
    writeFileSync(join(run, "sucesos.json"), JSON.stringify(SUCESOS_INVENTADOS));
    guardarVersion(deNuevo, 2, "change", HOY);
    assert.equal(guiaDeCara(deNuevo, false)?.behind, true);
    assert.match(documentoDeLaGuia(deNuevo) ?? "", /Tu viaje ha cambiado/);
    assert.equal(JSON.parse(readFileSync(join(carpeta, "guia.json"), "utf8")).version, 1);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la guía vuelve a su asiento con lo que estaba mal, dos veces como mucho, y después se para", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    // La primera vuelta pone un precio; la segunda, bien.
    const una = lanzadorDeLaGuia((e, vez) => {
      if (vez === 1) (e.cover as Objeto).intro = "Todo por 300 euros.";
    });
    assert.deepEqual(await llevarLaGuia(v, p.n, una, { hoy: () => HOY, sinFotos: true }), { estado: "ready" });
    assert.equal(una.veces, 2);
    const devuelto = JSON.parse(
      readFileSync(join(carpetaDeLaGuia(v, p.n), "puestos", "guia-v2", "in", "returned.json"), "utf8"),
    );
    assert.ok(devuelto.what_was_wrong.some((r: { que: string }) => /dinero/.test(r.que)));

    const q = pedirGuia(v, { manera: "best_value", hoy: HOY });
    const siempre = lanzadorDeLaGuia((e) => ((e.cover as Objeto).intro = "Te va a encantar."));
    const e = await llevarLaGuia(v, q.n, siempre, { hoy: () => HOY, sinFotos: true });
    assert.equal(e.estado, "stopped");
    assert.equal(siempre.veces, 3);
    assert.equal(guiaDeCara(v, false)?.state, "stopped");
    assert.equal(documentoDeLaGuia(v), null);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la guía no gasta sin el botón del viajero ni por encima de su techo", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", techo: 0.01, hoy: HOY });
    rmSync(join(carpetaDeLaGuia(v, p.n), "adelante.json"));
    const nadie = lanzadorDeLaGuia();
    assert.equal((await llevarLaGuia(v, p.n, nadie, { sinFotos: true })).estado, "stopped");
    assert.equal(nadie.veces, 0);
    // Con un techo que la primera vuelta ya alcanza, la segunda no se lanza.
    const q = pedirGuia(v, { manera: "best_value", techo: 0.01, hoy: HOY });
    const cara = lanzadorDeLaGuia((e) => ((e.cover as Objeto).intro = "Te va a encantar."));
    assert.equal((await llevarLaGuia(v, q.n, cara, { sinFotos: true })).estado, "stopped");
    assert.equal(cara.veces, 1);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

// Lo que dejó la revisión de la tanda 5.

test("la puerta 10: una palabra con mayúscula que no está en el material es un aviso, no un rojo", () => {
  conMaterial((m) => {
    const conTexto = (idioma: string, dice: string): ReturnType<typeof puertaGuia> => {
      const material = structuredClone(m);
      material.dado.trip.language = idioma;
      const e = entregaDeLaGuia(material.dado) as unknown as EntregaDeLaGuia;
      e.days[0].stops[0].what = dice;
      return puertaGuia(e as unknown, material);
    };
    // Los falsos rojos de antes: en inglés, en español, tras un guion, tras un salto de línea y en un título.
    const normales: [string, string][] = [
      ["en", "I'm sure the tower is worth it, and I love it."],
      ["en", "A Gothic tower with a Roman base and a Spanish roof."],
      ["en", "Lovely at Christmas and at Easter."],
      ["en", "The Tower Of The Old Town Above The Square"],
      ["es", "Una torre de estilo Gótico, con un remate Barroco."],
      ["es", "Muy animada en Navidad."],
      ["es", "Una torre de piedra - Gótica por fuera."],
    ];
    for (const [idioma, dice] of normales) {
      const v = conTexto(idioma, dice);
      assert.deepEqual(v.rojos, [], `${dice}: ${JSON.stringify(v.rojos)}`);
    }
    // Tras un salto de línea: el salto es rojo por su regla, pero la palabra que sigue no se toma por un nombre.
    const salto = conTexto("es", "Una torre de piedra\nGótica por fuera.");
    assert.ok(!salto.rojos.some((r) => /nombra/.test(r.que)) && !salto.avisos.some((a) => /Gótica/.test(a.que)));
    // Lo que no está en el material sigue saliendo, como aviso, para quien revise.
    const cafe = conTexto("es", "Para desayunar, el Café Nicola de enfrente.");
    assert.deepEqual(cafe.rojos, []);
    assert.ok(cafe.avisos.some((a) => /nombra «Nicola», que no está en el viaje/.test(a.que)));
    assert.ok(conTexto("en", "A Gothic tower.").avisos.some((a) => /Gothic/.test(a.que)));
    // Trampa: un sitio conocido que no es del viaje, nombrado entero, sigue en rojo, en inglés y en español.
    for (const idioma of ["en", "es"]) {
      const fuera = conTexto(idioma, "Next to the Palacio Olvidado.");
      assert.ok(
        fuera.rojos.some((r) => /Palacio Olvidado.*no es una parada/.test(r.que)),
        JSON.stringify(fuera.rojos),
      );
    }
  });
});

test("los avisos de la puerta 10 se guardan con su veredicto, y la guía sale igual", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    const lanzador = lanzadorDeLaGuia((e) => {
      const dia = (e.days as Objeto[])[0];
      ((dia.stops as Objeto[])[0] as Objeto).what = "Una torre de estilo Gótico.";
    });
    assert.deepEqual(await llevarLaGuia(v, p.n, lanzador, { hoy: () => HOY, sinFotos: true }), { estado: "ready" });
    assert.equal(lanzador.veces, 1);
    const puertas = JSON.parse(readFileSync(join(carpetaDeLaGuia(v, p.n), "guia-v1.puertas.json"), "utf8"));
    assert.equal(puertas.verde, true);
    assert.ok(puertas.avisos.some((a: { que: string }) => /Gótico/.test(a.que)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("la guía solo se pide en los idiomas que tienen sus rótulos y sus palabras: en otro, se niega sin lanzar", () => {
  // Cada idioma de la guía tiene sus rótulos y sus avisos; y la web dice la negativa en inglés y en español.
  for (const idioma of IDIOMAS_DE_LA_GUIA) {
    assert.ok(Object.hasOwn(ROTULOS, idioma), idioma);
    assert.ok(Object.hasOwn(AVISOS, idioma), idioma);
  }
  const textos = readFileSync(resolve(import.meta.dirname, "..", "..", "web", "src", "lib", "textos.ts"), "utf8");
  assert.match(textos, /language: "Your guide can be made in English or Spanish/);
  assert.match(textos, /language: "Tu guía se puede hacer en inglés o en español/);
  const viaje = viajeParaLaGuia();
  viaje.idioma = "fi";
  const { mesa, v } = viajeCerradoEnLaMesa({ viaje });
  try {
    assert.throws(
      () => pedirGuia(v, { manera: "best_value", hoy: HOY }),
      (e: unknown) => e instanceof FalloDeLaGuia && e.message === "language",
    );
    // Ni una guía pedida: nada que lanzar.
    assert.equal(guiaDeCara(v, false), null);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("lo que gasta la guía cuenta en el viaje de la cuenta, y no en la media de una investigación", async () => {
  const { mesa, v } = viajeCerradoEnLaMesa();
  try {
    const antes = gastoDeLaCuenta("ana", mesa);
    assert.equal(antes.viajes[0].llamadas, 0);
    const p = pedirGuia(v, { manera: "best_value", hoy: HOY });
    // Dos vueltas: la primera pone un precio y vuelve; cada una gasta lo suyo.
    const lanzador = lanzadorDeLaGuia((e, vez) => {
      if (vez === 1) (e.cover as Objeto).intro = "Todo por 300 euros.";
    });
    await llevarLaGuia(v, p.n, lanzador, { hoy: () => HOY, sinFotos: true });
    const despues = gastoDeLaCuenta("ana", mesa);
    assert.equal(despues.viajes[0].llamadas, 2);
    assert.ok(Math.abs(despues.viajes[0].usd - 0.08) < 1e-9, String(despues.viajes[0].usd));
    assert.equal(despues.total.llamadas, 2);
    assert.equal(despues.viajes[0].ultima, HOY.toISOString());
    // Trampa: la guía no entra en lo que costaría la siguiente investigación.
    assert.deepEqual(despues.siguiente, antes.siguiente);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("el croquis junta las paradas a los dos lados del meridiano 180, con su escala de verdad", () => {
  const puntos = [
    { lat: -16.5, lon: 179.9 },
    { lat: -16.51, lon: -179.9 },
  ];
  const { donde, metrosPorPunto } = proyectar(puntos, 600, 400, 50);
  const a = donde(puntos[0]);
  const b = donde(puntos[1]);
  // Juntas en el centro, la del oeste del 180 a la derecha; y la escala, de unos pocos kilómetros, no de medio mundo.
  assert.ok(b.x > a.x, `${a.x} ${b.x}`);
  assert.ok(a.x >= 50 - 1e-6 && b.x <= 550 + 1e-6 && b.y > a.y);
  assert.ok(metrosPorPunto * 500 < 50_000, String(metrosPorPunto));
  // Trampa: lejos del 180, una longitud negativa sigue donde estaba.
  const cerca = proyectar(
    [
      { lat: 40, lon: -0.01 },
      { lat: 40, lon: 0.01 },
    ],
    600,
    400,
    50,
  ).donde;
  assert.ok(cerca({ lat: 40, lon: -0.01 }).x < cerca({ lat: 40, lon: 0.01 }).x);
});

test("el autor de una foto con la frase de Commons sale limpio en el cuaderno, o la foto no entra", () => {
  conMaterial((m) => {
    const escrita = entregaDeLaGuia(m.dado) as unknown as EntregaDeLaGuia;
    const viaje = structuredClone(m.viaje);
    viaje.paradas[0].foto!.autor = "No machine-readable author provided. Fulano assumed (based on copyright claims).";
    const c = montarCuaderno(viaje, m.dado, escrita, { manera: "best_value", hecha: HOY });
    assert.equal(c.dias[0].paradas[0].foto?.autor, "Fulano");
    assert.ok(!pintarCuaderno(c).includes("machine-readable"));
    // Trampa: la frase sin nombre dentro no es un autor, y la foto no se enseña.
    viaje.paradas[0].foto!.autor = "No machine-readable author provided.";
    const sin = montarCuaderno(viaje, m.dado, escrita, { manera: "best_value", hecha: HOY });
    assert.equal(sin.dias[0].paradas[0].foto, null);
  });
});

test("la guía de un viaje cerrado por su flujo: precio y total de ese día, y enlaces sin los caídos", async () => {
  // Visto fallar: se cerraba con el hotel un 30 % más caro y su enlace caído, y la guía enseñaba el precio de antes y
  // el enlace muerto en «dónde se reserva».
  const { mesa, v } = await viajeCerradoPorSuFlujo();
  try {
    const cerrado = leerVersion(v)!.viaje as Viaje;
    const cierre = cerrado.cierre!;
    assert.equal(cierre.precios[0].hoy?.total, 312);
    const p = pedirGuia(v, { hoy: HOY });
    assert.equal(p.manera, "best_value");
    assert.deepEqual(await llevarLaGuia(v, p.n, lanzadorDeLaGuia(), { hoy: () => HOY, sinFotos: true }), {
      estado: "ready",
    });
    const c = JSON.parse(readFileSync(join(carpetaDeLaGuia(v, p.n), "guia.json"), "utf8"));
    // El precio del hotel es el de ese día, dicho como tal; y el total, el de ese día.
    assert.equal(c.duermes.precio.total, 312);
    assert.equal(c.duermes.precio.segun, "closing");
    assert.equal(c.duermes.precio.visto, cierre.precios[0].hoy!.visto);
    assert.equal(c.llegas.precio.total, 120);
    assert.deepEqual(c.total, { total: 432, moneda: "EUR", segun: "closing" });
    // Los enlaces, con su clase y sin el que no respondió; el de otro vendedor, con su precio del día que se buscó.
    const hotel = c.reservas.find((r: { que: string }) => r.que === "stay");
    assert.equal(hotel.precio.total, 312);
    assert.deepEqual(
      hotel.enlaces.map((e: { clase: string; comprobado: string }) => [e.clase, e.comprobado]),
      [
        ["other_seller", "unchecked"],
        ["own_site", "ok"],
      ],
    );
    assert.deepEqual(hotel.enlaces[0].precio, {
      total: 255,
      moneda: "EUR",
      visto: cerrado.alojamientos[0].otrasOfertas[0].visto,
    });
    assert.equal(hotel.caidos, 1);
    const vuelo = c.reservas.find((r: { que: string }) => r.que === "transport");
    assert.deepEqual(
      vuelo.enlaces.map((e: { clase: string; url: string }) => [e.clase, e.url]),
      [["search", ENLACES_DEL_CIERRE.vuelo]],
    );
    // Y así se pinta: el precio de ese día, el total, cada enlace por lo que es, y el caído fuera.
    const html = documentoDeLaGuia(v) ?? "";
    assert.ok(!html.includes(ENLACES_DEL_CIERRE.hotel), "pinta el enlace que no respondió");
    assert.match(html, /312,00\s€, el precio al cerrar el viaje/);
    assert.match(html, /En total/);
    assert.match(html, /432,00\s€/);
    assert.match(html, /Otro vendedor: Otra Inventada/);
    assert.match(html, /255,00\s€, visto el .*, el día de la búsqueda/);
    assert.match(html, /La web del propio alojamiento, que no es donde se vio el precio/);
    assert.match(html, /Este enlace no se pudo comprobar al cerrar el viaje/);
    assert.match(html, /Un enlace no respondió al cerrar el viaje, y no se pone/);
    assert.ok(!/240,00\s€/.test(html), "enseña el precio de antes");

    // Las trampas de la puerta 10 contra el viaje cerrado: el precio de antes, el total de antes, el enlace caído,
    // un enlace que falta, uno que dice ser donde se vio el precio y un precio sin confirmar dado por de ese día.
    const trampa = (cambia: (x: typeof c) => void, espera: RegExp): void => {
      const roto = structuredClone(c);
      cambia(roto);
      const rojos = puertaCuaderno(roto, cerrado, c.version).rojos.map((r) => r.que);
      assert.ok(
        rojos.some((r) => espera.test(r)),
        `${espera} en ${JSON.stringify(rojos)}`,
      );
    };
    assert.deepEqual(puertaCuaderno(c, cerrado, c.version).rojos, []);
    trampa((x) => (x.duermes.precio = { ...x.duermes.precio, total: 240 }), /no es el del viaje cerrado/);
    trampa(
      (x) => (x.reservas[0].precio = { ...x.reservas[0].precio, segun: "seen", total: 240 }),
      /no es el del viaje cerrado/,
    );
    trampa((x) => (x.total = { ...x.total, total: 360 }), /total del viaje cerrado/);
    trampa((x) => (x.total = null), /total del viaje cerrado/);
    trampa(
      (x) =>
        x.reservas[0].enlaces.push({
          clase: "where_priced",
          url: ENLACES_DEL_CIERRE.hotel,
          vendedor: "inventada",
          precio: null,
          comprobado: "ok",
        }),
      /no respondió al cerrar/,
    );
    trampa((x) => x.reservas[0].enlaces.pop(), /falta un enlace del viaje cerrado/);
    trampa((x) => (x.reservas[0].enlaces[1].clase = "where_priced"), /no dice lo que dice el viaje cerrado/);
    trampa((x) => (x.reservas[0].enlaces[0].comprobado = "ok"), /no dice lo que dice el viaje cerrado/);
    trampa((x) => (x.reservas[0].enlaces[0].precio = null), /no dice lo que dice el viaje cerrado/);
    trampa((x) => (x.reservas[0].caidos = 0), /cuántos enlaces no respondieron/);
    trampa((x) => (x.reservas = x.reservas.slice(1)), /falta dónde se reserva/);
    trampa((x) => (x.duermes.nombre = "Pensión Inventada"), /no es donde se duerme en el viaje cerrado/);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("si al cerrar el hotel ya no tenía precio, la guía enseña el que se vio, dicho como tal", async () => {
  const { mesa, v } = await viajeCerradoPorSuFlujo({ hotelHoy: null });
  try {
    const cerrado = leerVersion(v)!.viaje as Viaje;
    const p = pedirGuia(v, { hoy: HOY });
    await llevarLaGuia(v, p.n, lanzadorDeLaGuia(), { hoy: () => HOY, sinFotos: true });
    const c = JSON.parse(readFileSync(join(carpetaDeLaGuia(v, p.n), "guia.json"), "utf8"));
    assert.deepEqual(
      [c.duermes.precio.total, c.duermes.precio.segun, c.duermes.precio.visto],
      [240, "gone", cerrado.alojamientos[0].precio.visto],
    );
    assert.deepEqual(c.total, { total: 360, moneda: "EUR", segun: "unknown" });
    assert.equal(c.preciosDel, cerrado.alojamientos[0].precio.visto.slice(0, 10));
    const html = documentoDeLaGuia(v) ?? "";
    assert.match(html, /240,00\s€, visto el .*\. Al cerrar el viaje, quien lo vende ya no lo tenía/);
    assert.match(html, /Con los precios vistos: uno no se pudo confirmar al cerrar el viaje/);
    // Trampa: el que se vio, dado por el de ese día.
    const roto = structuredClone(c);
    roto.duermes.precio.segun = "closing";
    assert.ok(puertaCuaderno(roto, cerrado, c.version).rojos.some((r) => /no es el del viaje cerrado/.test(r.que)));
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});
