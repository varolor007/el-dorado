// Las pruebas de las fotos: cuáles se eligen, con su tope, y cómo se bajan. Sin internet: las fotos son inventadas.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import {
  bajarFotos,
  direccionSegura,
  elegirFotos,
  encogerFoto,
  FOTO,
  muestra,
  tipoDeImagen,
  TOPE,
  type Encoger,
  type Traer,
} from "../../agent/tools/fotos.ts";
import { leerDetalle } from "../../agent/tools/fuentes/liteapi.ts";

const TEMPORAL = mkdtempSync(join(tmpdir(), "el-dorado-fotos-"));
after(() => rmSync(TEMPORAL, { recursive: true, force: true }));

/** Para las pruebas de elegir y de bajar, que no van de encoger: la foto se guarda tal cual llega. */
const TAL_CUAL: Encoger = async (bytes) => bytes;
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const WEBP = new Uint8Array(
  [..."RIFF", 0, 0, 0, 0, ..."WEBP", 1].map((c) => (typeof c === "string" ? c.charCodeAt(0) : c)),
);
const PAGINA = new TextEncoder().encode("<html>no es una foto</html>");
const url = (nombre: string): string => `https://fotos.example.com/${nombre}`;

test("se eligen las primeras de la habitación y las del hotel, cada una con su sitio y su número", () => {
  const e = elegirFotos([url("r1.jpg"), url("r2.jpg")], [url("h1.jpg"), url("h2.jpg")]);
  assert.deepEqual(e.pedidas, [
    { ruta: "photos/room-01", url: url("r1.jpg") },
    { ruta: "photos/room-02", url: url("r2.jpg") },
    { ruta: "photos/hotel-01", url: url("h1.jpg") },
    { ruta: "photos/hotel-02", url: url("h2.jpg") },
  ]);
  assert.deepEqual(e.habitacion, { dadas: 2, total: 2 });
  assert.deepEqual(e.hotel, { dadas: 2, total: 2 });
});

test("el tope se cumple, y dice cuántas se dan de cuántas hay", () => {
  const habitacion = Array.from({ length: 20 }, (_, i) => url(`r${i}.jpg`));
  const hotel = Array.from({ length: 144 }, (_, i) => url(`h${i}.jpg`));
  const e = elegirFotos(habitacion, hotel);
  assert.deepEqual(e.habitacion, { dadas: TOPE.habitacion, total: 20 });
  assert.deepEqual(e.hotel, { dadas: TOPE.hotel, total: 144 });
  assert.equal(e.pedidas.length, TOPE.habitacion + TOPE.hotel);
  // De la habitación, las primeras; del hotel, repartidas por toda la lista, y no solo las del principio.
  assert.equal(e.pedidas[TOPE.habitacion - 1].url, url(`r${TOPE.habitacion - 1}.jpg`));
  const delHotel = e.pedidas.filter((p) => p.ruta.startsWith("photos/hotel-")).map((p) => p.url);
  assert.equal(delHotel[0], url("h0.jpg"));
  const ultima = Math.floor(((TOPE.hotel - 1) * 144) / TOPE.hotel);
  assert.ok(ultima > 120 && delHotel.includes(url(`h${ultima}.jpg`)));
  assert.equal(new Set(delHotel).size, TOPE.hotel);
});

test("una foto repetida no se da dos veces, y la de la habitación no vuelve como foto del hotel", () => {
  const e = elegirFotos([url("r1.jpg"), url("r1.jpg")], [url("r1.jpg"), url("h1.jpg"), url("h1.jpg")]);
  assert.deepEqual(
    e.pedidas.map((p) => p.ruta),
    ["photos/room-01", "photos/hotel-01"],
  );
});

test("la muestra reparte por toda la lista y no cambia una lista que ya cabe", () => {
  assert.deepEqual(muestra([1, 2, 3], 5), [1, 2, 3]);
  assert.deepEqual(muestra([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5), [0, 2, 4, 6, 8]);
});

test("el tipo de una imagen se lee de sus bytes", () => {
  assert.equal(tipoDeImagen(JPG), "jpg");
  assert.equal(tipoDeImagen(PNG), "png");
  assert.equal(tipoDeImagen(WEBP), "webp");
  assert.equal(tipoDeImagen(PAGINA), null);
  assert.equal(tipoDeImagen(new Uint8Array()), null);
});

test("las fotos se bajan a su sitio", async () => {
  const carpeta = join(TEMPORAL, "bien");
  const traer: Traer = async (u) => (u.endsWith("png") ? PNG : JPG);
  const r = await bajarFotos(
    [
      { ruta: "photos/room-01", url: url("a.jpg") },
      { ruta: "photos/hotel-01", url: url("b.png") },
    ],
    carpeta,
    { traer, encoger: TAL_CUAL },
  );
  assert.deepEqual(r.fallos, []);
  // Lo que se guarda es siempre un JPEG, llegara como llegara: es lo que sale de encogerla.
  assert.deepEqual(
    r.bajadas.map((b) => b.archivo),
    ["photos/hotel-01.jpg", "photos/room-01.jpg"],
  );
  assert.deepEqual(readdirSync(join(carpeta, "photos")).sort(), ["hotel-01.jpg", "room-01.jpg"]);
  assert.deepEqual([...readFileSync(join(carpeta, "photos", "room-01.jpg"))], [...JPG]);
});

test("trampa: lo que no es una imagen, lo que pesa demasiado, lo vacío y lo que no llega no se guardan", async () => {
  const carpeta = join(TEMPORAL, "mal");
  const traer: Traer = async (u) => {
    if (u.includes("pagina")) return PAGINA;
    if (u.includes("vacia")) return new Uint8Array();
    if (u.includes("caida")) throw new Error("contesta 404");
    return JPG;
  };
  const r = await bajarFotos(
    [
      { ruta: "photos/room-01", url: url("pagina.jpg") },
      { ruta: "photos/room-02", url: url("vacia.jpg") },
      { ruta: "photos/room-03", url: url("caida.jpg") },
      { ruta: "photos/room-04", url: url("gorda.jpg") },
      { ruta: "photos/room-05", url: url("buena.jpg") },
    ],
    carpeta,
    {
      encoger: TAL_CUAL,
      traer: (u, m) => (u.includes("gorda") ? Promise.resolve(new Uint8Array(m + 1).fill(0xff)) : traer(u, m)),
    },
  );
  assert.deepEqual(
    r.fallos.map((f) => `${f.ruta}: ${f.motivo}`),
    [
      "photos/room-01: no es una imagen",
      "photos/room-02: llegó vacía",
      "photos/room-03: contesta 404",
      "photos/room-04: pesa demasiado",
    ],
  );
  assert.deepEqual(readdirSync(join(carpeta, "photos")), ["room-05.jpg"]);
});

test("trampa: no se baja de direcciones que no son de fiar", async () => {
  const malas = [
    "http://fotos.example.com/a.jpg",
    "https://127.0.0.1/a.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/a.jpg",
    "https://localhost/a.jpg",
    "https://servidor/a.jpg",
    "https://base.internal/a.jpg",
    "https://usuario:clave@fotos.example.com/a.jpg",
    "https://fotos.example.com:8443/a.jpg",
    "file:///etc/passwd",
    "no es una dirección",
  ];
  for (const mala of malas) assert.equal(direccionSegura(mala), false, mala);
  assert.equal(direccionSegura("https://static.cupid.travel/hotels/1.jpg"), true);

  let llamadas = 0;
  const traer: Traer = async () => {
    llamadas++;
    return JPG;
  };
  const r = await bajarFotos([{ ruta: "photos/room-01", url: malas[2] }], join(TEMPORAL, "ssrf"), {
    traer,
    encoger: TAL_CUAL,
  });
  assert.equal(llamadas, 0);
  assert.deepEqual(r.fallos, [{ ruta: "photos/room-01", url: malas[2], motivo: "la dirección no es de fiar" }]);
  assert.equal(existsSync(join(TEMPORAL, "ssrf")), false);
});

test("trampa: un punto al final del nombre no esconde una máquina de dentro, ni vale la de un clúster", () => {
  const malas = [
    "https://localhost./a.jpg",
    "https://servidor./a.jpg",
    "https://base.internal./a.jpg",
    "https://metadata.google.internal./computeMetadata/v1/",
    "https://impresora.local./a.jpg",
    "https://caja.localhost../a.jpg",
    "https://kubernetes.default.svc/a.jpg",
    "https://kubernetes.default.svc./a.jpg",
    "https://kubernetes.default.svc.cluster.local/a.jpg",
    "https://vault.service.consul/a.jpg",
    "https://VAULT.Service.Consul./a.jpg",
    // Un número sigue siendo un número con un punto detrás, en hexadecimal, de una pieza o dentro de corchetes.
    "https://127.0.0.1./a.jpg",
    "https://0x7f.1/a.jpg",
    "https://2130706433/a.jpg",
    "https://[::ffff:127.0.0.1]/a.jpg",
  ];
  for (const mala of malas) assert.equal(direccionSegura(mala), false, mala);
  // Un nombre de fuera con su punto al final es el mismo nombre de fuera.
  assert.equal(direccionSegura("https://static.cupid.travel./hotels/1.jpg"), true);
  assert.equal(direccionSegura("https://fotos.consulado.example.com/a.jpg"), true);
});

/** Una red de mentira que manda una foto a trozos, sin decir cuánto pesa o diciendo lo que quiera. */
function redATrozos(trozos: Uint8Array[], cabeceras: Record<string, string> = {}) {
  const cuenta = { servidos: 0, cortada: false };
  const deVerdad = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        pull(c) {
          if (cuenta.servidos < trozos.length) c.enqueue(trozos[cuenta.servidos++]);
          else c.close();
        },
        cancel() {
          cuenta.cortada = true;
        },
      }),
      { headers: cabeceras },
    );
  return { cuenta, quitar: () => void (globalThis.fetch = deVerdad) };
}

test("trampa: una foto que no dice lo que pesa, o que miente, se deja de leer al pasar del tope", async () => {
  const gorda = Array.from({ length: 50 }, () => new Uint8Array(400).fill(0xff));
  const loQueDicenQuePesa: Record<string, string>[] = [{}, { "content-length": "10" }];
  for (const cabeceras of loQueDicenQuePesa) {
    const red = redATrozos(gorda, cabeceras);
    try {
      const pedida = [{ ruta: "photos/room-01", url: url("sin-fin.jpg") }];
      const r = await bajarFotos(pedida, join(TEMPORAL, "tope"), { maximoBytes: 1000, encoger: TAL_CUAL });
      assert.deepEqual(r.bajadas, []);
      assert.deepEqual(
        r.fallos.map((f) => f.motivo),
        ["pesa demasiado"],
      );
    } finally {
      red.quitar();
    }
    // Con un tope de mil bytes y trozos de cuatrocientos, al tercero ya se sabe: los cincuenta no se leen.
    assert.ok(red.cuenta.servidos <= 6, `se leyeron ${red.cuenta.servidos} trozos`);
    assert.equal(red.cuenta.cortada, true);
  }
  assert.equal(existsSync(join(TEMPORAL, "tope")), false);
});

test("una foto que llega a trozos se guarda entera, y la que pesa justo el tope, también", async () => {
  const carpeta = join(TEMPORAL, "trozos");
  const red = redATrozos([JPG.slice(0, 3), JPG.slice(3, 5), JPG.slice(5)]);
  try {
    const pedida = [{ ruta: "photos/room-01", url: url("a.jpg") }];
    const r = await bajarFotos(pedida, carpeta, { maximoBytes: JPG.length, encoger: TAL_CUAL });
    assert.deepEqual(r.fallos, []);
    assert.equal(r.bajadas[0].bytes, JPG.length);
  } finally {
    red.quitar();
  }
  assert.deepEqual([...readFileSync(join(carpeta, "photos", "room-01.jpg"))], [...JPG]);
});

test("trampa: las fotos no se bajan dentro del repositorio", async () => {
  const dentro = resolve(import.meta.dirname, "..", "..", "fotos-de-prueba");
  await assert.rejects(() => bajarFotos([], dentro), /dentro del repositorio/);
});

test("LiteAPI: las fotos de la habitación, la principal y una de cada clase por turnos, y ninguna repetida", () => {
  const sitio = "https://fotos.example.com";
  const d = leerDetalle(
    {
      data: {
        id: "x1",
        rooms: [
          {
            id: 7,
            photos: [
              { url: `${sitio}/1.jpg`, imageClass1: "minibar" },
              { url: `${sitio}/2.jpg`, imageClass1: "bathroom" },
              { url: `${sitio}/3.jpg`, imageClass1: "furniture", mainPhoto: true },
              { url: `${sitio}/4.jpg`, imageClass1: "bedroom" },
              { url: `${sitio}/5.jpg`, imageClass1: "bedroom" },
              { url: `${sitio}/2.jpg`, imageClass1: "bathroom" },
              { url: `${sitio}/6.jpg` },
            ],
          },
        ],
        hotelImages: [{ url: `${sitio}/h/10.jpg` }, { url: `${sitio}/h/10.jpg` }, { url: `${sitio}/h/11.jpg` }],
      },
    },
    "2026-11-23T00:00:00.000Z",
  );
  assert.deepEqual(
    d.habitaciones[0].fotos.map((f) => f.slice(-5, -4)),
    ["3", "4", "2", "5", "1", "6"],
  );
  assert.deepEqual(d.fotos, [`${sitio}/h/10.jpg`, `${sitio}/h/11.jpg`]);
});

test("una foto se encoge antes de que nadie la mire: su lado mayor al tope, y vuelta a guardar como JPEG", async () => {
  const { default: sharp } = await import("sharp");
  const lienzo = (ancho: number, alto: number) =>
    sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 180, g: 120, b: 60 } } });
  const grande = new Uint8Array(await lienzo(3000, 2000).jpeg({ quality: 95 }).toBuffer());
  const enPng = new Uint8Array(await lienzo(1600, 2400).png().toBuffer());
  const chica = new Uint8Array(await lienzo(400, 300).jpeg().toBuffer());
  const medidas = async (bytes: Uint8Array): Promise<[number, number, string]> => {
    const m = await sharp(bytes).metadata();
    return [m.width, m.height, m.format];
  };
  assert.deepEqual(await medidas(await encogerFoto(grande)), [FOTO.lado, Math.round((FOTO.lado * 2) / 3), "jpeg"]);
  assert.ok((await encogerFoto(grande)).length < grande.length);
  // Una foto en vertical y en PNG: el lado mayor es el alto, y sale en JPEG.
  assert.deepEqual(await medidas(await encogerFoto(enPng)), [Math.round((FOTO.lado * 2) / 3), FOTO.lado, "jpeg"]);
  // Una foto pequeña no se agranda.
  assert.deepEqual(await medidas(await encogerFoto(chica)), [400, 300, "jpeg"]);

  // Y al bajarlas, lo que queda en la carpeta es la encogida, con lo que pesaba al llegar apuntado.
  const carpeta = join(TEMPORAL, "encogidas");
  const r = await bajarFotos([{ ruta: "photos/room-01", url: url("a.jpg") }], carpeta, { traer: async () => grande });
  assert.deepEqual(r.fallos, []);
  assert.equal(r.bajadas[0].alLlegar, grande.length);
  assert.ok(r.bajadas[0].bytes < grande.length);
  assert.equal((await medidas(readFileSync(join(carpeta, "photos", "room-01.jpg"))))[0], FOTO.lado);
});

test("trampa: lo que empieza como una imagen y no lo es no llega a ningún asiento", async () => {
  const falsa = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    ...new TextEncoder().encode("<script>esto no es una foto</script>"),
  ]);
  const r = await bajarFotos([{ ruta: "photos/room-01", url: url("a.jpg") }], join(TEMPORAL, "falsa"), {
    traer: async () => falsa,
  });
  assert.deepEqual(r.bajadas, []);
  assert.equal(r.fallos[0].motivo, "no se pudo leer como imagen");
  assert.ok(!existsSync(join(TEMPORAL, "falsa", "photos", "room-01.jpg")));
});
