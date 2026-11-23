// Las pruebas de lo que monta el viaje para la web: de la búsqueda inventada y de una ficha de cómo es inventada sale
// un viaje con su forma, sin que se cuele nada que no dijo nadie.

import assert from "node:assert/strict";
import { test } from "node:test";
import { comprobarSucesos, comprobarViaje } from "../../agent/output/viaje.ts";
import { buscarAlojamiento } from "../../agent/scripts/busqueda_alojamiento.ts";
import {
  alojamientoParaLaWeb,
  encuadreDe,
  loQueSeDice,
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
    look: { level: "good_condition", evidence: [{ kind: "photo", ref: "room-01.jpg", what: "nothing worn" }] },
    gym: { level: "token", evidence: [{ kind: "review", ref: "r1", what: "a guest says the gym is tiny" }] },
    pool: { level: "unknown", evidence: [] },
    roto: "esto no es un campo",
  },
  review_themes: [
    { theme: "noise", tone: "bad", mentions: "several", says: "tram noise at night (r4, r19)", refs: ["r4"] },
    { theme: "Room size", tone: "good", mentions: "a_few", says: "roomy for the price", refs: ["r2"] },
    { theme: "noise", tone: "bad", mentions: "one", says: "the same again", refs: ["r5"] },
    { theme: "evening light show", tone: "mixed", mentions: "several", says: "fun, and loud", refs: ["r6"] },
    { theme: "other", tone: "good", mentions: "one", says: "a cat lives in the lobby", refs: ["r7"] },
    { theme: "staff", tone: "lovely", mentions: "12", says: "kind people", refs: ["r8"] },
    "esto no es un tema",
  ],
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

test("un alojamiento sale con el precio completo, su habitación y los niveles del que mira, con su prueba", () => {
  const a = alojamientoParaLaWeb(FICHA, MIRADO);
  assert.equal(a.precio.total, FICHA.precioCompleto);
  assert.equal(a.habitacion, "Doble");
  assert.deepEqual(a.comoEs, [
    { campo: "look", nivel: "good_condition", prueba: "photo", foto: "https://fotos.invalid/h1-1.jpg" },
    { campo: "gym", nivel: "token", prueba: "review", foto: null },
    { campo: "pool", nivel: "unknown", prueba: null, foto: null },
  ]);
  // Las fotos de la habitación de ese precio, por delante de las del hotel, y dicho cuántas son.
  assert.equal(a.fotos[0], "https://fotos.invalid/h1-1.jpg");
  assert.equal(a.fotosDeHabitacion, FICHA.habitacion!.fotos.length);
  assert.ok(a.fotos.length > a.fotosDeHabitacion);
});

test("lo que se dice sale por temas de la lista, una vez cada uno, y lo que no es de la lista no se enseña", () => {
  assert.deepEqual(alojamientoParaLaWeb(FICHA, MIRADO).seDice, [
    { tema: "noise", tono: "bad", menciones: "several" },
    { tema: "room_size", tono: "good", menciones: "a_few" },
  ]);
  assert.deepEqual(loQueSeDice(null), []);
  assert.deepEqual(loQueSeDice({ review_themes: "roto" }), []);
});

test("ninguna frase del que mira llega a la web: ni sus pruebas, ni sus avisos, ni lo mejor ni lo peor", () => {
  const todo = JSON.stringify(alojamientoParaLaWeb(FICHA, MIRADO));
  for (const frase of [
    "nothing worn",
    "a guest says",
    "outdoor pool",
    "A room that is cared for",
    "tram noise",
    "r19",
    "roomy for the price",
    "cat",
  ])
    assert.ok(!todo.includes(frase), `llega a la web: ${frase}`);
});

test("lo que la casa no pudo saber de un alojamiento sale por su clave, no con un mensaje de dentro", () => {
  assert.deepEqual(alojamientoParaLaWeb(FICHA, MIRADO).avisos, []);
  const sinFotos = { ...FICHA, habitacion: { ...FICHA.habitacion!, fotos: [] } };
  assert.deepEqual(alojamientoParaLaWeb(sinFotos, null).avisos, ["no_room_photos"]);
  // Y lo que se enseña entonces son fotos del alojamiento: la web no las presenta como la habitación.
  assert.equal(alojamientoParaLaWeb(sinFotos, null).fotosDeHabitacion, 0);
  assert.ok(alojamientoParaLaWeb(sinFotos, null).fotos.length > 0);
  const sinHabitacion = { ...FICHA, habitacion: null, avisos: ["no se sabe cuál es la habitación de ese precio"] };
  assert.deepEqual(alojamientoParaLaWeb(sinHabitacion, null).avisos, ["room_unknown"]);
  const sinNada = { ...FICHA, detalle: null, habitacion: null, opinionesLeidas: 0, avisos: ["sin detalle: HTTP 500"] };
  assert.deepEqual(alojamientoParaLaWeb(sinNada, null).avisos, ["no_detail", "no_reviews"]);
});

test("un alojamiento que nadie miró sale sin rasgos, no con rasgos inventados", () => {
  const a = alojamientoParaLaWeb(FICHA, null);
  assert.deepEqual(a.comoEs, []);
  assert.deepEqual(a.seDice, []);
});

test("el viaje no pasa si en la ficha de un alojamiento se cuela una frase suelta o una clave que no existe", () => {
  const v = viajeInventado();
  assert.deepEqual(comprobarViaje(v), []);
  v.alojamientos[0].seDice = [{ tema: "the tram is loud", tono: "bad", menciones: "several" }];
  v.alojamientos[1].avisos = ["sin detalle: HTTP 500" as never];
  assert.deepEqual(
    comprobarViaje(v).map((p) => p.que),
    ["lo que se dice no va por su clave", "un aviso de la ficha no es de su lista"],
  );
});

test("el primer vistazo cuenta lo que hay y desde cuánto, con un punto por cada uno que pasa", () => {
  const v = vistazoDe(BUSQUEDA);
  assert.equal(v.devueltos, BUSQUEDA.devueltos);
  assert.equal(v.pasan, BUSQUEDA.dentro.length);
  assert.equal(v.puntos.length, BUSQUEDA.dentro.length);
  assert.equal(v.desde, Math.min(...BUSQUEDA.conPrecio.map((c) => c.precio.total + c.precio.tasasAparte)));
  // Los mínimos que se enseñan son los de la búsqueda, no unos escritos en la web.
  assert.deepEqual(v.minimos, MINIMOS);
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
