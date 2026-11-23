// Lo que la web dice por una clave tiene su frase en cada idioma, y lo que la web enseña de fuera pasa antes por lo
// que comprueba la casa: una clave sin frase saldría en pantalla con su nombre de dentro.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPOS, MENCIONES, OTRO_TEMA, SIN_SABER, TEMAS_DE_OPINIONES, TONOS } from "../../agent/data/niveles.ts";
import { AVISOS_DE_FICHA, PRUEBAS } from "../../agent/output/viaje.ts";
import { grabadoQueVale } from "../../web/src/lib/grabado.ts";
import { IDIOMAS, TEXTOS } from "../../web/src/lib/textos.ts";
import { SUCESOS_INVENTADOS, viajeInventado } from "../cases/inventado/viaje.ts";

const faltan = (claves: readonly string[], dichas: Record<string, unknown>): string[] =>
  claves.filter((c) => typeof dichas[c] !== "string" || dichas[c] === "");

for (const idioma of IDIOMAS) {
  const t = TEXTOS[idioma];

  test(`la web sabe decir cada campo y cada nivel de la ficha de cómo es (${idioma})`, () => {
    assert.deepEqual(faltan(Object.keys(CAMPOS), t.campos), []);
    assert.deepEqual(faltan([...new Set(Object.values(CAMPOS).flat()), SIN_SABER], t.niveles), []);
  });

  test(`la web sabe decir cada tema de las opiniones, su tono y en cuántas se dice (${idioma})`, () => {
    const temas = TEMAS_DE_OPINIONES.filter((x) => x !== OTRO_TEMA);
    assert.deepEqual(faltan(temas, t.temas), []);
    assert.deepEqual(faltan(TONOS, t.tonos), []);
    assert.deepEqual(faltan(MENCIONES, t.menciones), []);
  });

  test(`la web sabe decir cada aviso de la ficha y cada clase de prueba (${idioma})`, () => {
    assert.deepEqual(faltan(AVISOS_DE_FICHA, t.ficha.avisos), []);
    assert.deepEqual(faltan(PRUEBAS, t.ficha.prueba), []);
  });
}

test("los dos idiomas de la web dicen las mismas claves, ni una más ni una menos", () => {
  const claves = (o: unknown, por = ""): string[] =>
    o !== null && typeof o === "object"
      ? Object.entries(o).flatMap(([k, v]) => claves(v, por === "" ? k : `${por}.${k}`))
      : [por];
  assert.deepEqual(claves(TEXTOS.es).sort(), claves(TEXTOS.en).sort());
});

test("un viaje grabado con la forma de antes, o roto, no se enseña: la web dice que no hay viaje", () => {
  const sucesos = SUCESOS_INVENTADOS;
  assert.notEqual(grabadoQueVale({ viaje: viajeInventado(), sucesos }), null);
  // La ficha de antes: con lo mejor y lo peor en una frase, y sin lo que se dice ni cuántas fotos son de la habitación.
  const deAntes = JSON.parse(JSON.stringify(viajeInventado()));
  for (const a of deAntes.alojamientos) {
    delete a.seDice;
    delete a.fotosDeHabitacion;
    a.loMejor = "Una habitación cuidada.";
  }
  assert.equal(grabadoQueVale({ viaje: deAntes, sucesos }), null);
  const conFrase = viajeInventado();
  conFrase.alojamientos[0].avisos = ["llama al 600 000 000" as never];
  assert.equal(grabadoQueVale({ viaje: conFrase, sucesos }), null);
  for (const roto of [null, 7, "viaje", {}, { viaje: {}, sucesos: [] }, { viaje: viajeInventado() }])
    assert.equal(grabadoQueVale(roto), null);
});
