// Las pruebas de lo que monta el viaje para la web: de la búsqueda inventada y de una ficha de cómo es inventada sale
// un viaje con su forma, sin que se cuele nada que no dijo nadie.

import assert from "node:assert/strict";
import { test } from "node:test";
import { comprobarSucesos, comprobarViaje } from "../../agent/output/viaje.ts";
import { buscarAlojamiento } from "../../agent/scripts/busqueda_alojamiento.ts";
import {
  alojamientoParaLaWeb,
  encuadreDe,
  montarViaje,
  palancaDeFechas,
  sucesosDe,
  vistazoDe,
  type Decidido,
} from "../../agent/scripts/monta_viaje.ts";
import { ESTANCIA, fuenteInventada, MINIMOS } from "../cases/inventado/inventado.ts";
import { viajeInventado } from "../cases/inventado/viaje.ts";

const BUSQUEDA = await buscarAlojamiento(fuenteInventada(), ESTANCIA, MINIMOS);
const FICHA = BUSQUEDA.finalistas.find((f) => f.habitacion !== null);
assert.ok(FICHA !== undefined);

const MIRADO = {
  fields: {
    state: { level: "well_kept", evidence: [{ kind: "photo", ref: "room-01.jpg", what: "nothing worn" }] },
    gym: { level: "token", evidence: [{ kind: "review", ref: "r1", what: "a guest says the gym is tiny" }] },
    pool: { level: "unknown", evidence: [] },
    roto: "esto no es un campo",
  },
  warnings: [{ what: "outdoor pool: check that it is open" }, { nada: true }],
  summary_good: "A room that is cared for.",
  summary_bad: "unknown",
};

function decidido(): Decidido {
  const v = viajeInventado();
  return {
    id: "viaje-de-prueba",
    idioma: "es",
    muestra: true,
    destino: { nombre: "Villa Inventada", pais: "ZZ" },
    ritmo: "normal",
    paradas: v.paradas.map((p) => ({ ...p, punto: { lat: ESTANCIA.lat + 0.001, lon: ESTANCIA.lon + 0.001 } })),
    maneras: [
      {
        id: "cheapest",
        alojamiento: BUSQUEDA.finalistas[0].alojamiento.id,
        transporte: null,
        gana: "Cuesta menos.",
        pierde: "Más lejos.",
      },
      {
        id: "best_value",
        alojamiento: FICHA!.alojamiento.id,
        transporte: null,
        gana: "Mejor nota.",
        pierde: "Cuesta más.",
      },
      { id: "different", alojamiento: "no-existe", transporte: null, gana: "x", pierde: "y" },
    ],
    palancas: [],
    avisos: [],
    mirados: { [FICHA!.alojamiento.id]: MIRADO },
  };
}

test("un alojamiento sale con el precio completo, su habitación y lo que dijo el que mira", () => {
  const a = alojamientoParaLaWeb(FICHA, MIRADO);
  assert.equal(a.precio.total, FICHA.precioCompleto);
  assert.equal(a.habitacion, "Doble");
  assert.deepEqual(a.comoEs, [
    { campo: "state", nivel: "well_kept", prueba: "nothing worn", foto: "https://fotos.invalid/h1-1.jpg" },
    { campo: "gym", nivel: "token", prueba: "a guest says the gym is tiny", foto: null },
    { campo: "pool", nivel: "unknown", prueba: null, foto: null },
  ]);
  assert.equal(a.loMejor, "A room that is cared for.");
  assert.equal(a.loPeor, null);
  assert.ok(a.avisos.includes("outdoor pool: check that it is open"));
  // Las fotos de la habitación de ese precio, por delante de las del hotel.
  assert.equal(a.fotos[0], "https://fotos.invalid/h1-1.jpg");
});

test("un alojamiento que nadie miró sale sin rasgos, no con rasgos inventados", () => {
  const a = alojamientoParaLaWeb(FICHA, null);
  assert.deepEqual(a.comoEs, []);
  assert.equal(a.loMejor, null);
});

test("el primer vistazo cuenta lo que hay y desde cuánto, con un punto por cada uno que pasa", () => {
  const v = vistazoDe(BUSQUEDA);
  assert.equal(v.devueltos, BUSQUEDA.devueltos);
  assert.equal(v.pasan, BUSQUEDA.dentro.length);
  assert.equal(v.puntos.length, BUSQUEDA.dentro.length);
  assert.equal(v.desde, Math.min(...BUSQUEDA.conPrecio.map((c) => c.precio.total + c.precio.tasasAparte)));
  assert.equal(v.puntos.filter((p) => p.precio === null).length, BUSQUEDA.dentro.length - BUSQUEDA.conPrecio.length);
});

test("el viaje montado tiene la forma de la web, y una manera con un alojamiento que no existe no entra", () => {
  const v = montarViaje(BUSQUEDA, decidido());
  assert.deepEqual(comprobarViaje(v), []);
  assert.deepEqual(
    v.maneras.map((m) => m.id),
    ["cheapest", "best_value"],
  );
  assert.equal(v.maneras[1].total, FICHA.precioCompleto);
  assert.equal(v.dias.length, 4);
  assert.equal(v.dias.flatMap((d) => d.paradas).length + v.fuera.length, v.paradas.length);
  assert.deepEqual(comprobarSucesos(sucesosDe(BUSQUEDA, v)), []);
});

test("los sucesos cuentan los números de la búsqueda, y los descartes llevan su sitio en el mapa", () => {
  const v = montarViaje(BUSQUEDA, decidido());
  const s = sucesosDe(BUSQUEDA, v);
  assert.equal(s.find((x) => x.clase === "lodgings_found")?.n, BUSQUEDA.devueltos);
  assert.equal(s.find((x) => x.clase === "lodgings_found")?.puntos?.length, BUSQUEDA.fuera.length);
  assert.equal(s.find((x) => x.clase === "lodgings_pass")?.puntos?.length, BUSQUEDA.dentro.length);
  assert.equal(s.filter((x) => x.clase === "finalist").length, v.alojamientos.length);
  assert.equal(s.filter((x) => x.clase === "looked").length, 1);
  assert.equal(s.at(-1)?.clase, "done");
});

test("una palanca solo existe si ahorra, y la resta la hace el código", () => {
  assert.deepEqual(palancaDeFechas("l1", "day_before", 300, 240.5, "EUR", "Ir un día antes", "Las mismas noches."), {
    id: "l1",
    clase: "day_before",
    ahorra: 59.5,
    moneda: "EUR",
    que: "Ir un día antes",
    aCambio: "Las mismas noches.",
  });
  assert.equal(palancaDeFechas("l1", "day_before", 300, 320, "EUR", "x", "y"), null);
  assert.equal(palancaDeFechas("l1", "day_before", 300, null, "EUR", "x", "y"), null);
});

test("el encuadre encierra todos los puntos, con su margen", () => {
  const e = encuadreDe([
    { lat: 10, lon: 20 },
    { lat: 11, lon: 22 },
  ]);
  assert.ok(e.oeste < 20 && e.este > 22 && e.sur < 10 && e.norte > 11);
});
