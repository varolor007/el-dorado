// Las horas del reloj, como las escriben las fuentes, en veinticuatro horas.

import assert from "node:assert/strict";
import { test } from "node:test";
import { hora24 } from "../../agent/tools/horas.ts";

test("una hora escrita como sea sale en veinticuatro horas, y lo que no es una hora, no sale", () => {
  const casos: [unknown, string | null][] = [
    ["03:00 PM", "15:00"],
    ["3:00 pm", "15:00"],
    ["3 PM", "15:00"],
    ["3 p.m.", "15:00"],
    ["12:00 PM", "12:00"],
    ["12:30 AM", "00:30"],
    ["11:30 AM", "11:30"],
    ["15:00", "15:00"],
    ["9:05", "09:05"],
    ["15.30", "15:30"],
    ["15h30", "15:30"],
    [" 14:00 ", "14:00"],
    ["00:00", "00:00"],
    // Con sus segundos, o con una «h» sola.
    ["14:00:00", "14:00"],
    ["15h", "15:00"],
    // Dentro de una frase corta, si lleva una sola hora y ningún otro número.
    ["from 14:00", "14:00"],
    ["After 3 PM", "15:00"],
    ["a partir de las 15:00", "15:00"],
    ["desde las 15h", "15:00"],
    ["Check-in from 2:30 p.m.", "14:30"],
    // Lo que no se entiende no se adivina.
    ["14:00 to 22:00", null],
    ["2 PM - 11 PM", null],
    ["between 2 and 4 PM", null],
    ["from 14:00, room 2", null],
    ["14:00:61", null],
    ["at 15", null],
    ["Check-in is possible any time in the afternoon after 15:00", null],
    ["13:00 PM", null],
    ["0:30 AM", null],
    ["24:00", null],
    ["12:60", null],
    ["15", null],
    ["", null],
    [null, null],
    [15, null],
  ];
  for (const [escrita, es] of casos) assert.equal(hora24(escrita), es, JSON.stringify(escrita));
});
