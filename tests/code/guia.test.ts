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
import { guardarVersion, leerViaje, nuevoRun, pasar } from "../../agent/launcher/mesa.ts";
import { comprobarViaje } from "../../agent/output/viaje.ts";
import { montarCuaderno, pintarCuaderno, proyectar } from "../../agent/scripts/cuaderno.ts";
import { JPEG, type Objeto } from "../cases/inventado/asientos.ts";
import { SUCESOS_INVENTADOS } from "../cases/inventado/viaje.ts";
import {
  entregaDeLaGuia,
  HOY,
  lanzadorDeLaGuia,
  viajeCerradoEnLaMesa,
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
    // Un nombre que no está en su material: un café de memoria.
    trampa((e) => (parada(e).when = "Para desayunar, el Café Nicola de enfrente."), /nombra «Nicola», que no está/);
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
    roto.reservas[0].precio = { ...roto.reservas[0].precio, enlace: "http://reservas.inventado.example/x" };
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
    // En inglés, los rótulos en inglés; en un idioma sin rótulos, también en inglés.
    assert.match(pintarCuaderno({ ...c, idioma: "en" }), /Where you sleep/);
    assert.match(pintarCuaderno({ ...c, idioma: "fi" }), /Where you sleep/);
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
