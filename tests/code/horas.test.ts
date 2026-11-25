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
    // Lo que no se entiende no se adivina.
    ["13:00 PM", null],
    ["0:30 AM", null],
    ["24:00", null],
    ["12:60", null],
    ["15", null],
    ["a partir de las 15:00", null],
    ["", null],
    [null, null],
    [15, null],
  ];
  for (const [escrita, es] of casos) assert.equal(hora24(escrita), es, JSON.stringify(escrita));
});
