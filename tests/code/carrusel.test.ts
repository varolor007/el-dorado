// El carrusel: lo que se enseña mientras trabaja la IA, para que haya algo que mirar y se vea que trabaja (el PM,
// 26-nov). Sitios de verdad del destino, con su foto, su autor y su licencia, y una curiosidad de su artículo, sin IA.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CARTAS_DEL_CARRUSEL } from "../../agent/data/carrusel.ts";
import { CARRUSEL, cartasDelViaje, prepararElCarrusel } from "../../agent/launcher/carrusel.ts";
import type { ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import type { Foto } from "../../agent/output/viaje.ts";
import { cartasDeLosSitios, cartasQueValen, curiosidad, sitiosDelCarrusel } from "../../agent/scripts/carrusel.ts";
import type { Entendido } from "../../agent/scripts/formas.ts";
import { resumenesDe, type Respuesta, type Sitio } from "../../agent/tools/sitios.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const FOTO: Foto = { url: "https://fotos.invalid/faro.jpg", autor: "Ana", licencia: "CC BY 4.0", pagina: null };

function sitio(n: number, archivo: string | null = `Sitio ${n}.jpg`): Sitio {
  return {
    id: `Q${n}`,
    nombre: `Sitio ${n}`,
    clase: "landmark",
    clases: ["landmark"],
    punto: { lat: 10 + n / 100, lon: 20 },
    enlaces: 100 - n,
    descripcion: null,
    articulo: `https://es.wikipedia.org/wiki/Sitio_${n}`,
    articuloEnIngles: `https://en.wikipedia.org/wiki/Site_${n}`,
    archivo,
    fuente: "inventada",
    visto: "2027-01-10T09:00:00.000Z",
  };
}

test("una curiosidad son las primeras frases enteras que caben, sin paréntesis ni lo que no se enseña", () => {
  const largo =
    "El faro (en inventado, Faro Viejo) guía a los barcos de la bahía. Se levantó con piedra del puerto. " +
    "Hoy es un museo pequeño con vistas a toda la costa y a las islas de enfrente, que se ven en días claros.";
  assert.equal(curiosidad(largo, 120), "El faro guía a los barcos de la bahía. Se levantó con piedra del puerto.");
  assert.equal(curiosidad("Corto."), null);
  assert.equal(
    curiosidad("Una frase entera, pero tan larga que no cabe en el hueco que se le da a la curiosidad.", 30),
    null,
  );
  assert.equal(curiosidad("Su web es https://faro.invalid y abre por la mañana."), null);
  assert.equal(curiosidad("Se reserva en el +34 600 123 456 con tiempo, dice la página."), null);
  assert.equal(curiosidad(null), null);
});

test("entran los más conocidos con foto, como mucho los de su tope; y una carta sin foto ni texto no sale", () => {
  const sitios = [sitio(1, null), ...Array.from({ length: 20 }, (_, i) => sitio(i + 2))];
  const elegidos = sitiosDelCarrusel(sitios);
  assert.equal(elegidos.length, CARTAS_DEL_CARRUSEL);
  assert.ok(elegidos.every((s) => s.archivo !== null));
  assert.deepEqual(
    sitiosDelCarrusel([sitio(1, null), sitio(2, null)]).map((s) => s.id),
    ["Q1", "Q2"],
  );
  const cartas = cartasDeLosSitios(
    [sitio(2), sitio(3), sitio(4)],
    new Map([["Sitio 2.jpg", FOTO]]),
    new Map([["Q3", "El sitio tres tiene una historia larga y bonita."]]),
  );
  assert.deepEqual(
    cartas.map((c) => [c.id, c.foto !== null, c.texto !== null, c.articulo]),
    [
      ["Q2", true, false, null],
      ["Q3", false, true, "https://es.wikipedia.org/wiki/Sitio_3"],
    ],
  );
});

test("a la web solo llegan cartas con su forma: fotos y artículos https, y textos que pasan otra vez la criba", () => {
  const crudo = {
    cartas: [
      {
        id: "Q1",
        nombre: "Bien",
        foto: FOTO,
        texto: "Una curiosidad que se puede enseñar sin problema.",
        articulo: null,
      },
      { id: "Q2", nombre: "Foto rara", foto: { ...FOTO, url: "javascript:alert(1)" }, texto: null },
      { id: "Q3", nombre: "Texto con web", foto: null, texto: "Mira https://malo.invalid para saber más de él." },
      { id: "Q4", foto: FOTO },
      "no es una carta",
      {
        id: "Q5",
        nombre: "Artículo raro",
        foto: FOTO,
        texto: "Un texto normal, de los que se enseñan.",
        articulo: "http://x",
      },
    ],
  };
  const cartas = cartasQueValen(crudo);
  assert.deepEqual(
    cartas.map((c) => c.id),
    ["Q1", "Q5"],
  );
  assert.equal(cartas[1].articulo, null);
  assert.deepEqual(cartasQueValen(null), []);
  assert.deepEqual(cartasQueValen({ cartas: "x" }), []);
});

function unRun(sitios: Sitio[] | null): { run: string; borrar: () => void } {
  const carpeta = mkdtempSync(join(tmpdir(), "carrusel-"));
  const run = join(carpeta, "runs", "1");
  mkdirSync(run, { recursive: true });
  if (sitios !== null) writeFileSync(join(run, "sitios.json"), JSON.stringify({ sitios, resumenes: {}, avisos: [] }));
  return { run, borrar: () => rmSync(carpeta, { recursive: true, force: true }) };
}

const VIAJE = { ...(ENTENDIDO as Entendido), language: "es" };

test("en cuanto hay sitios, el run guarda su carrusel, con las curiosidades en el idioma del viajero", async () => {
  const { run, borrar } = unRun([sitio(1), sitio(2)]);
  try {
    const idiomas: string[] = [];
    await prepararElCarrusel(run, VIAJE, {
      fotos: async (archivos) => new Map(archivos.map((a) => [a, FOTO])),
      curiosidades: async (sitios, idioma) => {
        idiomas.push(idioma);
        return new Map([[sitios[0].id, "El primero de los sitios tiene una historia larga."]]);
      },
    });
    assert.deepEqual(idiomas, ["es"]);
    const guardado = JSON.parse(readFileSync(join(run, CARRUSEL), "utf8"));
    assert.deepEqual(
      cartasQueValen(guardado).map((c) => [c.id, c.texto !== null]),
      [
        ["Q1", true],
        ["Q2", false],
      ],
    );
    // Una vez hecho, no se vuelve a pedir.
    await prepararElCarrusel(run, VIAJE, {
      fotos: async () => {
        throw new Error("no se tenía que pedir");
      },
    });
  } finally {
    borrar();
  }
});

test("el carrusel no frena ni tumba el viaje: si una fuente falla o tarda, sale con lo que llegó", async () => {
  const falla = unRun([sitio(1)]);
  const tarda = unRun([sitio(1)]);
  const sinSitios = unRun(null);
  try {
    await prepararElCarrusel(falla.run, VIAJE, {
      fotos: async () => {
        throw new Error("Commons no contesta");
      },
      curiosidades: async () => new Map([["Q1", "Una curiosidad que sí ha llegado a tiempo."]]),
    });
    assert.equal(cartasQueValen(JSON.parse(readFileSync(join(falla.run, CARRUSEL), "utf8")))[0].foto, null);
    const empieza = Date.now();
    await prepararElCarrusel(tarda.run, VIAJE, { fotos: () => new Promise(() => {}) }, 50);
    assert.ok(Date.now() - empieza < 2000);
    assert.deepEqual(cartasQueValen(JSON.parse(readFileSync(join(tarda.run, CARRUSEL), "utf8"))), []);
    await prepararElCarrusel(sinSitios.run, VIAJE, { fotos: async () => new Map() });
    assert.equal(existsSync(join(sinSitios.run, CARRUSEL)), false);
  } finally {
    falla.borrar();
    tarda.borrar();
    sinSitios.borrar();
  }
});

test("las cartas de un viaje son las de su último run que las tenga", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "carrusel-viaje-"));
  try {
    for (const n of [1, 2, 3]) mkdirSync(join(carpeta, "runs", String(n)), { recursive: true });
    const carta = (id: string) => ({ id, nombre: id, foto: FOTO, texto: null, articulo: null });
    writeFileSync(join(carpeta, "runs", "1", CARRUSEL), JSON.stringify({ cartas: [carta("Q1")] }));
    writeFileSync(join(carpeta, "runs", "2", CARRUSEL), JSON.stringify({ cartas: [carta("Q2")] }));
    writeFileSync(join(carpeta, "runs", "3", CARRUSEL), "{ roto");
    const v = { carpeta, ficha: { runs: [{}, {}, {}] } } as unknown as ViajeEnLaMesa;
    assert.deepEqual(
      cartasDelViaje(v).map((c) => c.id),
      ["Q2"],
    );
    assert.deepEqual(cartasDelViaje({ carpeta, ficha: { runs: [] } } as unknown as ViajeEnLaMesa), []);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test("las curiosidades se piden a la Wikipedia del idioma del viajero, con su artículo en ese idioma", async () => {
  const pedidas: string[] = [];
  const traer = async (url: string): Promise<Respuesta> => {
    pedidas.push(url);
    const pagina = { title: "Sitio 1", extract: "El sitio uno es el más conocido de la ciudad." };
    return { estado: 200, cuerpo: JSON.stringify({ query: { pages: { "1": pagina } } }), esperar: null };
  };
  const textos = await resumenesDe([sitio(1)], { traer }, "es");
  assert.ok(pedidas[0].startsWith("https://es.wikipedia.org/w/api.php?"));
  assert.match(decodeURIComponent(pedidas[0]), /titles=Sitio(\+|_| )1/);
  assert.equal(textos.get("Q1"), "El sitio uno es el más conocido de la ciudad.");
  // Un idioma raro no cambia a dónde se pide: va en inglés.
  await resumenesDe([sitio(1)], { traer }, "x/../evil");
  assert.ok(pedidas[1].startsWith("https://en.wikipedia.org/w/api.php?"));
});
