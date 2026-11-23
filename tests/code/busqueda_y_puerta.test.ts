// La búsqueda entera con la fuente inventada, y la puerta con sus trampas: cada fallo puesto a propósito tiene que
// salir en rojo. Si una trampa pasa en verde, la que está mal es la puerta.

import assert from "node:assert/strict";
import { test } from "node:test";
import { puertaBusqueda } from "../../agent/gates/puerta_busqueda.ts";
import { anadirOfertas, buscarAlojamiento, type Busqueda } from "../../agent/scripts/busqueda_alojamiento.ts";
import { DE_ZONA, ESTANCIA, MINIMOS, fuenteInventada } from "../cases/inventado/inventado.ts";

async function buena(): Promise<Busqueda> {
  return buscarAlojamiento(fuenteInventada(), ESTANCIA, MINIMOS, { finalistas: 5 });
}

test("la búsqueda entera: la lista, los mínimos, el precio, los finalistas y su ficha", async () => {
  const b = await buena();
  assert.equal(b.devueltos, 10);
  assert.equal(b.dentro.length, 7);
  assert.equal(b.fuera.length, 3);
  assert.equal(b.conPrecio.length, 6);
  assert.deepEqual(
    b.finalistas.map((f) => f.alojamiento.id),
    ["a1", "a2", "a5", "a4", "a6"],
  );
  assert.equal(b.finalistas[0].precioCompleto, 186);
  assert.equal(b.finalistas[1].habitacion?.metros, 22);
  assert.equal(b.finalistas[1].opinionesLeidas, 3);
  assert.deepEqual(b.finalistas[1].temas.piscina, { bueno: 1, malo: 0 });
  assert.ok(b.avisos.some((a) => a.includes("3 que no cumplen")));
  assert.ok(b.avisos.some((a) => a.includes("1 sin precio")));
});

test("lo que falta no se inventa: se avisa", async () => {
  const b = await buena();
  // la habitación del precio de a1 no dice sus metros, y la de a5 no está entre las del hotel
  assert.ok(b.finalistas[0].avisos.some((a) => a.includes("no dice sus metros")));
  assert.equal(b.finalistas[2].habitacion, null);
  assert.ok(b.finalistas[2].avisos.some((a) => a.includes("no se sabe cuál es la habitación")));
});

test("si la fuente falla en el detalle o en las opiniones, la búsqueda sigue y lo dice", async () => {
  const b = await buscarAlojamiento(fuenteInventada({ detalle: true, opiniones: true }), ESTANCIA, MINIMOS, {
    finalistas: 5,
  });
  assert.equal(b.finalistas.length, 5);
  assert.equal(b.finalistas[0].detalle, null);
  assert.ok(b.finalistas[0].avisos.some((a) => a.startsWith("sin detalle")));
  assert.ok(b.finalistas[0].avisos.some((a) => a.startsWith("sin opiniones")));
  assert.equal(puertaBusqueda(b, 5).verde, true);
});

test("las ofertas de otra fuente se casan por posición y por nombre", async () => {
  const b = await buena();
  assert.equal(anadirOfertas(b, DE_ZONA), 1);
  assert.deepEqual(
    b.finalistas[0].otrasOfertas.map((o) => o.total),
    [199],
  );
  assert.deepEqual(b.finalistas[1].otrasOfertas, []);
});

test("la puerta da verde a la búsqueda buena", async () => {
  assert.deepEqual(puertaBusqueda(await buena(), 5), { verde: true, rojos: [] });
});

type Trampa = { nombre: string; rompe: (b: Busqueda) => void; rojo: RegExp };

const TRAMPAS: Trampa[] = [
  {
    nombre: "uno de dentro no cumple los mínimos",
    rompe: (b) => {
      b.dentro[0].nota = 7;
    },
    rojo: /no cumple los mínimos/,
  },
  {
    nombre: "un dato sin su fuente",
    rompe: (b) => {
      b.dentro[1].fuente = "";
    },
    rojo: /de qué fuente sale/,
  },
  {
    nombre: "un dato sin la fecha en que se vio",
    rompe: (b) => {
      b.dentro[1].visto = "ayer";
    },
    rojo: /cuándo se vio/,
  },
  {
    nombre: "un descarte sin motivo",
    rompe: (b) => {
      b.fuera[0].motivo = " ";
    },
    rojo: /descartado sin motivo/,
  },
  {
    nombre: "la lista no suma",
    rompe: (b) => {
      b.devueltos = 11;
    },
    rojo: /no suman los devueltos/,
  },
  {
    nombre: "un precio de otras fechas",
    rompe: (b) => {
      b.conPrecio[0].precio.salida = "2027-03-09";
    },
    rojo: /es de otras fechas/,
  },
  {
    nombre: "un precio para otro grupo",
    rompe: (b) => {
      b.conPrecio[0].precio.adultos = 1;
    },
    rojo: /otro número de adultos/,
  },
  {
    nombre: "un precio en otra moneda",
    rompe: (b) => {
      b.conPrecio[0].precio.moneda = "USD";
    },
    rojo: /está en USD/,
  },
  {
    nombre: "un precio que no es un importe",
    rompe: (b) => {
      b.conPrecio[0].precio.total = 0;
    },
    rojo: /no es un importe válido/,
  },
  {
    nombre: "el precio de otro alojamiento",
    rompe: (b) => {
      b.conPrecio[0].precio.id = "a3";
    },
    rojo: /precio de otro alojamiento/,
  },
  {
    nombre: "un precio para uno que no pasó",
    rompe: (b) => {
      b.dentro.shift();
      b.devueltos--;
    },
    rojo: /no pasó los mínimos/,
  },
  {
    nombre: "más finalistas que el tope",
    rompe: (b) => {
      b.finalistas.push({
        ...b.finalistas[0],
        alojamiento: b.conPrecio[2].alojamiento,
        precio: b.conPrecio[2].precio,
        precioCompleto: 652,
      });
    },
    rojo: /el tope es 5/,
  },
  {
    nombre: "un finalista repetido",
    rompe: (b) => {
      b.finalistas[1] = b.finalistas[0];
    },
    rojo: /sale dos veces/,
  },
  {
    nombre: "un finalista sin precio",
    rompe: (b) => {
      b.conPrecio = b.conPrecio.filter((c) => c.alojamiento.id !== "a2");
    },
    rojo: /es finalista y no tiene precio/,
  },
  {
    nombre: "el precio completo no cuadra",
    rompe: (b) => {
      b.finalistas[0].precioCompleto = 180;
    },
    rojo: /no es el total más lo que se paga aparte/,
  },
  {
    nombre: "se enseña la suite y no la habitación de ese precio",
    rompe: (b) => {
      b.finalistas[1].habitacion = b.finalistas[1].detalle!.habitaciones[1];
    },
    rojo: /no es la de ese precio/,
  },
  {
    nombre: "falta la habitación y no se avisa",
    rompe: (b) => {
      b.finalistas[2].avisos = [];
    },
    rojo: /no se avisa/,
  },
  {
    nombre: "un finalista sin motivo",
    rompe: (b) => {
      b.finalistas[3].motivo = "";
    },
    rojo: /finalista sin motivo/,
  },
];

for (const trampa of TRAMPAS) {
  test(`la puerta caza la trampa: ${trampa.nombre}`, async () => {
    const b = await buena();
    trampa.rompe(b);
    const veredicto = puertaBusqueda(b, 5);
    assert.equal(veredicto.verde, false);
    assert.ok(
      veredicto.rojos.some((r) => trampa.rojo.test(r.que)),
      `no salió el rojo esperado; salieron: ${veredicto.rojos.map((r) => r.que).join(" | ")}`,
    );
  });
}
