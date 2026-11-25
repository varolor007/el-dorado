// Las capas del destino en la web (14.6): lo que cuesta un precio para tu grupo, cuándo abre un sitio en tus días, el
// billete suelto de un trayecto que no se anda, el presupuesto de antes de tus cambios, que cada clave de las capas
// tiene su frase en los dos idiomas, y lo que la casa cuenta en vivo de ellas. Con datos inventados: sin internet y
// sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DIAS_DE_LA_SEMANA, FALTAS_DE_UNA_CAPA, PARA_QUIEN } from "../../agent/data/capas.ts";
import { CLASES_DEL_DESTINO } from "../../agent/data/capa_destino.ts";
import {
  BILLETES,
  DE_DONDE_SE_LLEGA,
  MODOS_DE_MOVERSE,
  PAGOS,
  POR_QUE_NO_SE_LLEGA,
} from "../../agent/data/capa_moverse.ts";
import { ORIGENES_DE_UNA_PARTE, PARTES_DEL_PRESUPUESTO } from "../../agent/data/presupuesto.ts";
import { loQueHaPasado } from "../../agent/launcher/vivo.ts";
import type { DeMoverse, Horario, PrecioDeCapa, Presupuesto } from "../../agent/output/capas.ts";
import { comprobarSucesos } from "../../agent/output/viaje.ts";
import {
  abreTusDias,
  billeteSuelto,
  paraTuGrupo,
  precioDeCadaUno,
  presupuestoQueSeEnsena,
  sitioDe,
  zonasDeLlegar,
} from "../../web/src/lib/alli.ts";
import { IDIOMAS, TEXTOS } from "../../web/src/lib/textos.ts";

const F = { url: "https://sitios.inventado.example/entradas", visto: "2031-02-20" };
const precio = (para: PrecioDeCapa["para"], cuanto: number | "free", edades: PrecioDeCapa["edades"] = null) => ({
  para,
  edades,
  cuanto: cuanto === "free" ? ("free" as const) : { importe: cuanto, moneda: "EUR" },
  fuente: F,
});

test("lo que cuesta para tu grupo: cada uno con su precio; un niño sin precio suyo no se supone", () => {
  const conNinos = [precio("adult", 10), precio("child", "free", { desde: null, hasta: 12 })];
  assert.deepEqual(paraTuGrupo(conNinos, 2, [8]), {
    importes: [{ importe: 20, moneda: "EUR" }],
    faltan: 0,
    gratis: false,
    cuantos: 3,
  });
  // Un niño mayor que lo que cubre el de niño: la página no dice el suyo, y falta.
  assert.equal(paraTuGrupo(conNinos, 2, [15])?.faltan, 1);
  // Gratis para todos, con un precio para cualquiera.
  assert.equal(paraTuGrupo([precio("any", "free")], 2, [4])?.gratis, true);
  // Sin precios, no se sabe; los de familia y de grupo no se suman.
  assert.equal(paraTuGrupo(null, 2, []), null);
  assert.equal(paraTuGrupo([precio("family", 30)], 2, [5])?.faltan, 3);
  // Un bebé sin edades en la página: el de bebé; un adulto, el de adulto antes que el de cualquiera.
  assert.equal(precioDeCadaUno([precio("infant", "free"), precio("child", 5)], 1)?.para, "infant");
  assert.equal(precioDeCadaUno([precio("any", 3), precio("adult", 7)], null)?.para, "adult");
  // Céntimos que se suman bien.
  assert.deepEqual(paraTuGrupo([precio("adult", 2.1)], 3, [])?.importes, [{ importe: 6.3, moneda: "EUR" }]);
});

test("cuándo abre en tus días: con sus horas, cerrado o sin saber, día a día", () => {
  const sinLunes: Horario[] = [
    {
      desde: null,
      hasta: null,
      franjas: [{ dias: DIAS_DE_LA_SEMANA.filter((d) => d !== "mon"), abre: "09:00", cierra: "18:00" }],
      cierra: ["2031-03-12"],
      fuente: F,
    },
  ];
  const dias = abreTusDias(sinLunes, ["2031-03-10", "2031-03-11", "2031-03-12"]);
  assert.deepEqual(
    dias.map((d) => d.abre),
    [false, true, false],
  );
  assert.deepEqual(dias[1].franjas, [
    { dias: DIAS_DE_LA_SEMANA.filter((d) => d !== "mon"), abre: "09:00", cierra: "18:00" },
  ]);
  assert.deepEqual(abreTusDias(null, ["2031-03-10"]), [{ fecha: "2031-03-10", abre: null, franjas: [] }]);
});

test("un trayecto que no se anda: el billete suelto de transporte, si tiene precio; si no, nada", () => {
  const m: DeMoverse = {
    llegar: [],
    sinLlegar: "not_found",
    transportes: [{ modo: "bus", zonas: ["z1", "z2"], hastaLas: null, fuente: F }],
    billetes: [
      { clase: "day_pass", dias: 1, viajes: null, modos: ["bus"], precios: [precio("adult", 6)], fuente: F },
      { clase: "single", dias: null, viajes: 1, modos: ["taxi"], precios: [precio("adult", 20)], fuente: F },
      { clase: "single", dias: null, viajes: 1, modos: ["bus"], precios: [precio("adult", 2)], fuente: F },
    ],
    pagos: [],
    coche: null,
    falta: null,
  };
  assert.equal(billeteSuelto(m)?.modos[0], "bus");
  assert.equal(billeteSuelto({ ...m, billetes: [{ ...m.billetes[2], precios: null }] }), null);
  assert.equal(billeteSuelto({ ...m, falta: "late" }), null);
  assert.equal(billeteSuelto(undefined), null);
});

test("las zonas de llegar se numeran solo si son varias; y una fuente se dice por su web", () => {
  const una = { desde: { clase: "airport" as const, codigo: null, nombre: null }, modo: "bus" as const };
  const llegar = (z: string) => ({ ...una, aZona: z, minutos: null, precios: null, hastaLas: null, fuente: F });
  assert.equal(zonasDeLlegar([llegar("z1"), llegar("z1")]), null);
  assert.deepEqual(
    [...(zonasDeLlegar([llegar("z2"), llegar("z1")]) ?? [])],
    [
      ["z2", 1],
      ["z1", 2],
    ],
  );
  assert.equal(sitioDe("https://www.inventado.example/x?y=1"), "inventado.example");
});

test("el presupuesto que se enseña: el del viaje, y de antes si cambiaste algo", () => {
  const p: Presupuesto = { maneras: [], comidas: null, falta: null };
  const nada = { ritmo: false, paradas: false, alojamiento: false, transporte: false };
  assert.equal(presupuestoQueSeEnsena(p, nada).deAntes, false);
  assert.equal(presupuestoQueSeEnsena(p, { ...nada, ritmo: true }).deAntes, true);
  assert.equal(presupuestoQueSeEnsena(p, { ...nada, paradas: true }).presupuesto, p);
  // Uno que falta no es «de antes»: no hay nada que enseñar.
  assert.equal(presupuestoQueSeEnsena({ ...p, falta: "failed" }, { ...nada, ritmo: true }).deAntes, false);
});

test("cada clave de las capas tiene su frase en los dos idiomas", () => {
  for (const idioma of IDIOMAS) {
    const a = TEXTOS[idioma].alli;
    const tiene = (dicho: Record<string, string>, claves: readonly string[], que: string) => {
      for (const k of claves) assert.equal(typeof dicho[k], "string", `${idioma}: ${que} ${k}`);
    };
    tiene(a.falta, FALTAS_DE_UNA_CAPA, "falta");
    tiene(a.modo, MODOS_DE_MOVERSE, "modo");
    tiene(a.desde, DE_DONDE_SE_LLEGA, "desde");
    tiene(a.sinLlegar, POR_QUE_NO_SE_LLEGA, "sinLlegar");
    tiene(a.pago, PAGOS, "pago");
    tiene(a.para, PARA_QUIEN, "para");
    tiene(a.clase, CLASES_DEL_DESTINO, "clase");
    tiene(a.parte, PARTES_DEL_PRESUPUESTO, "parte");
    tiene(a.origen, ORIGENES_DE_UNA_PARTE, "origen");
    for (const b of BILLETES) assert.notEqual(a.billete(b, 3, 10), idioma === "en" ? "Ticket" : "Billete", b);
  }
});

test("en vivo: cada capa que trae algo lo cuenta con su número; una que falta, nada", () => {
  const run = mkdtempSync(join(tmpdir(), "el-dorado-vivo-capas-"));
  try {
    const guarda = (nombre: string, dato: unknown) => writeFileSync(join(run, nombre), JSON.stringify(dato));
    guarda("moverse.json", {
      llegar: [{}],
      transportes: [{}],
      billetes: [{}, {}],
      pagos: [{}],
      falta: null,
      entregas: [],
      cuando: "x",
    });
    guarda("saber.json", { cosas: [], falta: "failed", entregas: [], cuando: "x" });
    guarda("entradas.json", {
      sitios: [
        { parada: "a", precios: [], horarios: null },
        { parada: "b", precios: null, horarios: null },
      ],
      falta: null,
    });
    const dichos = loQueHaPasado(run).filter((s) => ["ways_around", "good_to_know", "tickets_known"].includes(s.clase));
    assert.deepEqual(
      dichos.map((s) => [s.clase, s.n]),
      [
        ["ways_around", 4],
        ["tickets_known", 1],
      ],
    );
    assert.deepEqual(comprobarSucesos([...dichos.map((s, i) => ({ ...s, t: i })), { clase: "done", t: 9 }]), []);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
