// Las pruebas de los sitios que ver: con respuestas inventadas, con la forma de las de verdad, y sin internet.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claseDe,
  consultaDeSitios,
  fotosDe,
  leerFotos,
  leerResumenes,
  leerSitios,
  resumenesDe,
  sitiosDe,
  type Respuesta,
} from "../../agent/tools/sitios.ts";

const CAJA = { oeste: 20, sur: 10, este: 20.2, norte: 10.1 };
const VISTO = "2026-11-23T10:00:00.000Z";

type Fila = Record<string, { value: string }>;
function fila(q: string, datos: Record<string, string | number>): Fila {
  const salida: Fila = { item: { value: `http://www.wikidata.org/entity/${q}` } };
  for (const [campo, v] of Object.entries(datos)) salida[campo] = { value: String(v) };
  return salida;
}
const DE_WIKIDATA = {
  results: {
    bindings: [
      fila("Q1", {
        lat: 10.05,
        lon: 20.05,
        enlaces: 40,
        nombre: "Museo de la Sal",
        nombreEn: "Salt Museum",
        about: "museum in an invented city",
        clases: "museum|former convent",
        articulo: "https://es.wikipedia.org/wiki/Museo_de_la_Sal",
        articuloEn: "https://en.wikipedia.org/wiki/Salt_Museum",
        foto: "http://commons.wikimedia.org/wiki/Special:FilePath/Salt%20Museum%20front.jpg",
      }),
      fila("Q1", { lat: 10.0501, lon: 20.0501, enlaces: 40, nombre: "Museo de la Sal", clases: "museum" }),
      fila("Q2", { lat: 10.06, lon: 20.06, enlaces: 55, nombreEn: "Central Station", clases: "railway station" }),
      fila("Q3", { lat: 10.07, lon: 20.07, enlaces: 60, nombreEn: "North Parish", clases: "civil parish" }),
      fila("Q4", { lat: 10.08, lon: 20.08, enlaces: 12, clases: "castle" }),
      fila("Q5", {
        lat: 10.04,
        lon: 20.04,
        enlaces: 30,
        nombreEn: "Old Quarter",
        about: "neighbourhood of an invented city",
        clases: "bairro",
        articuloEn: "https://example.com/wiki/Old_Quarter",
      }),
      fila("Q6", { lat: 999, lon: 20, enlaces: 30, nombreEn: "Nowhere Tower", clases: "tower" }),
      fila("Q7", { lat: 10.03, lon: 20.03, enlaces: 9, nombreEn: "Lookout of the Wind", clases: "scenic viewpoint" }),
      fila("Q8", { lat: 10.02, lon: 20.02, enlaces: 9, nombreEn: "Something Else", clases: "company" }),
    ],
  },
};

test("la consulta lleva la caja, el idioma y el mínimo, y no se hace con una caja que no encierra nada", () => {
  const q = consultaDeSitios(CAJA, { idioma: "es", minimoDeEnlaces: 7, cuantos: 50 });
  assert.match(q, /Point\(20 10\)/);
  assert.match(q, /Point\(20\.2 10\.1\)/);
  assert.match(q, /LANG\(\?nombreSuyo\) = "es"/);
  assert.match(q, /\?enlaces >= 7/);
  assert.match(q, /LIMIT 300/);
  assert.throws(() => consultaDeSitios({ ...CAJA, este: 19 }), /no encierra nada/);
  assert.throws(() => consultaDeSitios({ ...CAJA, norte: Number.NaN }), /no encierra nada/);
});

test("un idioma que no es un idioma no entra en la consulta", () => {
  const q = consultaDeSitios(CAJA, { idioma: 'es" } UNION { ?x ?y ?z' });
  assert.match(q, /LANG\(\?nombreSuyo\) = "en"/);
  assert.ok(!q.includes("UNION"));
});

test("de lo que devuelve la fuente salen solo los sitios que ver, una vez cada uno y lo más conocido antes", () => {
  const sitios = leerSitios(DE_WIKIDATA, VISTO);
  assert.deepEqual(
    sitios.map((s) => s.id),
    ["Q1", "Q5", "Q7"],
  );
  const museo = sitios[0];
  assert.equal(museo.nombre, "Museo de la Sal");
  assert.equal(museo.clase, "museum");
  assert.deepEqual(museo.punto, { lat: 10.05, lon: 20.05 });
  assert.equal(museo.enlaces, 40);
  assert.equal(museo.articulo, "https://es.wikipedia.org/wiki/Museo_de_la_Sal");
  assert.equal(museo.archivo, "Salt Museum front.jpg");
  assert.equal(museo.fuente, "wikidata");
  assert.equal(museo.visto, VISTO);
});

test("un sitio sin nombre, uno fuera del mapa y lo que no es un sitio no salen", () => {
  const ids = leerSitios(DE_WIKIDATA, VISTO).map((s) => s.id);
  for (const fuera of ["Q2", "Q3", "Q4", "Q6", "Q8"]) assert.ok(!ids.includes(fuera), fuera);
});

test("el artículo de un sitio solo vale si es de Wikipedia", () => {
  const barrio = leerSitios(DE_WIKIDATA, VISTO).find((s) => s.id === "Q5");
  assert.equal(barrio?.clase, "neighbourhood");
  assert.equal(barrio?.articulo, null);
  assert.equal(barrio?.articuloEnIngles, null);
});

test("el tope corta la lista por lo menos conocido", () => {
  assert.deepEqual(
    leerSitios(DE_WIKIDATA, VISTO, 2).map((s) => s.id),
    ["Q1", "Q5"],
  );
});

test("qué es un sitio: manda cómo se llama; después, cómo se describe, y al final, lo que fue", () => {
  assert.equal(claseDe("Tile Museum", "building in a city", ["convent"]), "museum");
  assert.equal(claseDe("Saint Mark", "church and monastery", ["museum"]), "church");
  assert.equal(claseDe("The Mound", null, ["scenic viewpoint"]), "viewpoint");
  assert.equal(claseDe("Central Arena", "football stadium", ["tourist attraction"]), null);
  assert.equal(claseDe("North District", null, ["district of somewhere"]), null);
  assert.equal(claseDe("Unknown Thing", null, ["company"]), null);
});

const DE_COMMONS = {
  query: {
    normalized: [{ from: "File:Salt_Museum_front.jpg", to: "File:Salt Museum front.jpg" }],
    pages: {
      "1": {
        title: "File:Salt Museum front.jpg",
        imageinfo: [
          {
            thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Salt.jpg/640px-Salt.jpg?utm_source=x",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Salt_Museum_front.jpg",
            extmetadata: {
              Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Ana">Ana &amp; Co</a>' },
              LicenseShortName: { value: "CC BY-SA 4.0" },
            },
          },
        ],
      },
      "2": { title: "File:Other.jpg", imageinfo: [{ thumburl: "https://example.com/other.jpg", extmetadata: {} }] },
      "-1": { title: "File:Missing.jpg", missing: "" },
    },
  },
};

test("de cada foto salen su miniatura, su autor sin marcas, su licencia y su página", () => {
  const fotos = leerFotos(DE_COMMONS);
  const foto = fotos.get("Salt Museum front.jpg");
  assert.deepEqual(foto, {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Salt.jpg/640px-Salt.jpg",
    autor: "Ana & Co",
    licencia: "CC BY-SA 4.0",
    pagina: "https://commons.wikimedia.org/wiki/File:Salt_Museum_front.jpg",
  });
});

test("una foto que no viene de Wikimedia o que no existe no sale", () => {
  const fotos = leerFotos(DE_COMMONS);
  assert.equal(fotos.get("Other.jpg"), undefined);
  assert.equal(fotos.get("Missing.jpg"), undefined);
});

test("el resumen de un artículo vuelve con el título por el que se pidió, aunque redirija", () => {
  const resumenes = leerResumenes({
    query: {
      normalized: [{ from: "salt museum", to: "Salt museum" }],
      redirects: [{ from: "Salt museum", to: "Salt Museum" }],
      pages: { "9": { title: "Salt Museum", extract: "The Salt Museum is   a museum.\nIt opened long ago." } },
    },
  });
  assert.equal(resumenes.get("salt museum"), "The Salt Museum is a museum. It opened long ago.");
  assert.equal(resumenes.get("Salt Museum"), "The Salt Museum is a museum. It opened long ago.");
});

function falsa(respuestas: Respuesta[]): { traer: (url: string) => Promise<Respuesta>; pedidas: string[] } {
  const pedidas: string[] = [];
  return {
    pedidas,
    traer: async (url) => {
      pedidas.push(url);
      const r = respuestas.shift();
      if (r === undefined) throw new Error("no quedan respuestas");
      return r;
    },
  };
}
const bien = (json: unknown): Respuesta => ({ estado: 200, cuerpo: JSON.stringify(json), esperar: null });

test("si la fuente pide esperar, se espera lo que dice y se vuelve a pedir", async () => {
  const red = falsa([
    { estado: 429, cuerpo: "", esperar: 7 },
    { estado: 503, cuerpo: "", esperar: null },
    bien(DE_WIKIDATA),
  ]);
  const esperas: number[] = [];
  const sitios = await sitiosDe(CAJA, {}, { traer: red.traer, dormir: async (ms) => void esperas.push(ms) });
  assert.equal(sitios.length, 3);
  assert.deepEqual(esperas, [7000, 10000]);
  assert.equal(red.pedidas.length, 3);
});

test("si la fuente falla de otra manera, o no deja de pedir que se espere, se dice y no se inventa nada", async () => {
  const rota = falsa([{ estado: 500, cuerpo: "boom", esperar: null }]);
  await assert.rejects(sitiosDe(CAJA, {}, { traer: rota.traer }), /contestan 500/);
  const pesada = falsa(Array.from({ length: 3 }, () => ({ estado: 429, cuerpo: "", esperar: 1 })));
  await assert.rejects(
    sitiosDe(CAJA, {}, { traer: pesada.traer, dormir: async () => {}, intentos: 3 }),
    /contestan 429/,
  );
  const rara = falsa([{ estado: 200, cuerpo: "<html>", esperar: null }]);
  await assert.rejects(sitiosDe(CAJA, {}, { traer: rara.traer }), /no contestan con datos/);
});

test("las fotos se piden de cuarenta en cuarenta, y cada archivo una sola vez", async () => {
  const archivos = Array.from({ length: 45 }, (_, i) => `Foto ${i}.jpg`);
  const red = falsa([bien(DE_COMMONS), bien({ query: { pages: {} } })]);
  const fotos = await fotosDe([...archivos, "Foto 1.jpg", "Salt Museum front.jpg"], { traer: red.traer });
  assert.equal(red.pedidas.length, 2);
  assert.ok(fotos.has("Salt Museum front.jpg"));
  assert.ok(red.pedidas.every((url) => url.startsWith("https://commons.wikimedia.org/w/api.php?")));
});

test("los resúmenes se piden por el título en inglés y vuelven por el identificador del sitio", async () => {
  const sitios = leerSitios(DE_WIKIDATA, VISTO);
  const red = falsa([bien({ query: { pages: { "9": { title: "Salt Museum", extract: "A museum of salt." } } } })]);
  const resumenes = await resumenesDe(sitios, { traer: red.traer });
  assert.equal(resumenes.get("Q1"), "A museum of salt.");
  assert.equal(resumenes.size, 1);
  assert.match(red.pedidas[0], /^https:\/\/en\.wikipedia\.org\/w\/api\.php\?/);
});
