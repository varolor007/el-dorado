// Lo que ha gastado cada viaje de una cuenta y lo que va a gastar el siguiente: con una mesa hecha a mano, con el
// viaje inventado y trabajos apuntados como los apuntaría la casa. Sin IA y sin gastar.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gastoDeLaCuenta } from "../../agent/launcher/gasto.ts";
import { abrirViaje, guardarVersion, nuevoRun, pasar, type ViajeEnLaMesa } from "../../agent/launcher/mesa.ts";
import { apuntarTrabajo, type Trabajo } from "../../agent/launcher/trabajos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const cerca = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

function trabajo(puesto: string, usd: number | null, hasta: string, estado: Trabajo["estado"] = "done"): Trabajo {
  return {
    puesto,
    asiento: "route-planner",
    estado,
    desde: hasta,
    hasta: estado === "queued" ? null : hasta,
    gasto: usd === null ? null : { turnos: 1, entrada: 10, salida: 5, usd },
    fallo: null,
  };
}

/** Un run con sus trabajos; si acaba en el mapa, deja lo que deja un run hecho y se guarda su versión. */
function investiga(v: ViajeEnLaMesa, trabajos: Trabajo[], enElMapa: boolean, cuando: Date): string {
  if (v.ficha.estado === "started") pasar(v, "confirmed", cuando);
  const run = nuevoRun(v, cuando);
  for (const t of trabajos) apuntarTrabajo(run, t);
  if (enElMapa) {
    writeFileSync(join(run, "viaje.json"), "{}");
    writeFileSync(join(run, "sucesos.json"), "[]");
    guardarVersion(v, v.ficha.runs.length, "primera", cuando);
  }
  return run;
}

function conMesa(prueba: (mesa: string) => void): void {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  try {
    prueba(mesa);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

test("sin investigaciones no hay gasto, y lo siguiente no se dice con una cifra", () => {
  conMesa((mesa) => {
    assert.deepEqual(gastoDeLaCuenta("ana", mesa), {
      viajes: [],
      total: { usd: 0, llamadas: 0, sabido: true, deCortados: 0 },
      siguiente: null,
    });
    // Un viaje abierto que aún no se ha investigado no ha gastado: no sale.
    abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    assert.deepEqual(gastoDeLaCuenta("ana", mesa).viajes, []);
  });
});

test("cada viaje suma todas sus investigaciones, con sus llamadas y la última; el total, todos", () => {
  conMesa((mesa) => {
    const dia = (d: number): Date => new Date(`2027-01-0${d}T10:00:00Z`);
    const uno = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: dia(1), id: "uno" });
    investiga(
      uno,
      [trabajo("a", 0.1, "2027-01-01T10:01:00Z"), trabajo("b", 0.2, "2027-01-01T10:02:00Z")],
      true,
      dia(1),
    );
    investiga(uno, [trabajo("a", 0.4, "2027-01-03T10:05:00Z")], true, dia(3));
    const dos = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: dia(2), id: "dos" });
    // Uno parado a medias: de un trabajo acabado no se sabe lo que gastó, y otro aún espera en cola.
    investiga(
      dos,
      [
        trabajo("a", 0.3, "2027-01-02T10:01:00Z"),
        trabajo("b", null, "2027-01-02T10:02:00Z", "failed"),
        trabajo("c", null, "", "queued"),
      ],
      false,
      dia(2),
    );
    // Lo de otra cuenta no cuenta.
    const suyo = abrirViaje({ dueno: "luis", entendido: ENTENDIDO, mesa, cuando: dia(4), id: "de-luis" });
    investiga(suyo, [trabajo("a", 9, "2027-01-04T10:00:00Z")], true, dia(4));

    const g = gastoDeLaCuenta("ana", mesa);
    assert.deepEqual(
      g.viajes.map((v) => [v.id, v.llamadas, v.sabido, v.ultima, v.investigaciones]),
      [
        ["uno", 3, true, "2027-01-03T10:05:00Z", 2],
        ["dos", 2, false, "2027-01-02T10:02:00Z", 1],
      ],
    );
    assert.ok(cerca(g.viajes[0].usd, 0.7) && cerca(g.viajes[1].usd, 0.3));
    assert.equal(g.viajes[0].destino, ENTENDIDO.destination.name);
    assert.equal(g.viajes[0].entrada, ENTENDIDO.dates.check_in);
    assert.ok(cerca(g.total.usd, 1));
    assert.deepEqual([g.total.llamadas, g.total.sabido], [5, false]);
    // Lo siguiente: la media de las enteras (las dos de «uno»); la parada no cuenta.
    assert.equal(g.siguiente?.de, 2);
    assert.ok(cerca(g.siguiente?.usd ?? 0, 0.35));
    assert.deepEqual(
      gastoDeLaCuenta("luis", mesa).viajes.map((v) => v.id),
      ["de-luis"],
    );
  });
});

test("una investigación que acabó en el mapa sin saberse todo lo que gastó no da la cifra de lo siguiente", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "uno" });
    investiga(
      v,
      [trabajo("a", 0.1, "2027-01-01T10:01:00Z"), trabajo("b", null, "2027-01-01T10:02:00Z")],
      true,
      new Date(),
    );
    const g = gastoDeLaCuenta("ana", mesa);
    assert.equal(g.total.sabido, false);
    assert.equal(g.siguiente, null);
  });
});

test("una ficha rota o de otro, en la carpeta de la mesa, no se cuela", () => {
  conMesa((mesa) => {
    mkdirSync(join(mesa, "viajes", "roto"), { recursive: true });
    writeFileSync(join(mesa, "viajes", "roto", "ficha.json"), "{ no es json");
    assert.deepEqual(gastoDeLaCuenta("ana", mesa).viajes, []);
    assert.deepEqual(gastoDeLaCuenta("../ana", mesa).viajes, []);
  });
});

test("lo que gastan las preguntas sobre un alojamiento cuenta en su viaje, no en la media de una investigación", () => {
  conMesa((mesa) => {
    const dia = new Date("2027-01-01T10:00:00Z");
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando: dia, id: "uno" });
    investiga(v, [trabajo("a", 0.5, "2027-01-01T10:01:00Z")], true, dia);
    // La trampa de la revisión: la carpeta `preguntas/` no se leía.
    const pregunta = join(v.carpeta, "preguntas", "1");
    mkdirSync(pregunta, { recursive: true });
    apuntarTrabajo(pregunta, { ...trabajo("pregunta-v1", 0.05, "2027-01-02T10:00:00Z"), asiento: "lodging-viewer" });
    const g = gastoDeLaCuenta("ana", mesa);
    assert.ok(cerca(g.viajes[0].usd, 0.55));
    assert.equal(g.viajes[0].llamadas, 2);
    assert.equal(g.viajes[0].ultima, "2027-01-02T10:00:00Z");
    assert.ok(cerca(g.siguiente?.usd ?? 0, 0.5));
  });
});
