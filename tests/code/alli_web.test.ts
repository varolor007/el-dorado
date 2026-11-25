// Las capas del destino en la web (14.6): lo que cuesta un precio para tu grupo, cuándo abre un sitio en tus días, el
// billete suelto de un trayecto que no se anda, lo que te conviene para moverte, el presupuesto de lo que tienes
// delante, que cada clave de las capas tiene su frase en los dos idiomas, y lo que la casa cuenta en vivo de ellas.
// Cada cifra de la web sale de la misma cuenta que el presupuesto: la tarjeta, la ficha, cada tramo, «Allí» y las
// cuentas dicen siempre lo mismo. Con datos inventados: sin internet y sin gastar.

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
import { comprobarSucesos, comprobarViaje, type Viaje } from "../../agent/output/viaje.ts";
import { cuentaDeMoverse, sueltoPara } from "../../agent/scripts/capa_moverse.ts";
import { entradaDe } from "../../agent/scripts/capas.ts";
import { delGrupo, presupuestoDe, trayectosQueNoSeAndan } from "../../agent/scripts/presupuesto.ts";
import { caminosDe } from "../../agent/tools/caminos.ts";
import {
  abreTusDias,
  billeteSuelto,
  grupoDelViaje,
  loQueTeConviene,
  paraTuGrupo,
  porPersona,
  presupuestoQueSeEnsena,
  sitioDe,
  zonasDeLlegar,
} from "../../web/src/lib/alli.ts";
import { irEntre } from "../../web/src/lib/formato.ts";
import { IDIOMAS, TEXTOS } from "../../web/src/lib/textos.ts";
import { viajeParaLaGuia } from "../cases/inventado/guia.ts";

const F = { url: "https://sitios.inventado.example/entradas", visto: "2031-02-20" };
const precio = (para: PrecioDeCapa["para"], cuanto: number | "free", edades: PrecioDeCapa["edades"] = null) => ({
  para,
  edades,
  cuanto: cuanto === "free" ? ("free" as const) : { importe: cuanto, moneda: "EUR" },
  fuente: F,
});

const grupo = (adultos: number, ninos: number[] = []) => ({ adultos, ninos, moneda: "EUR" });

test("lo que cuesta para tu grupo: la cuenta del presupuesto, cada uno con su precio", () => {
  const conNinos = [precio("adult", 10), precio("child", "free", { desde: null, hasta: 12 })];
  assert.deepEqual(paraTuGrupo(conNinos, grupo(2, [8])), {
    importes: [{ importe: 20, moneda: "EUR" }],
    faltan: 0,
    gratis: false,
    cuantos: 3,
  });
  // Un niño mayor que lo que cubre el de niño paga como un adulto, como en el presupuesto (antes la web: que falta).
  assert.deepEqual(paraTuGrupo(conNinos, grupo(2, [15]))?.importes, [{ importe: 30, moneda: "EUR" }]);
  // Gratis para todos, con un precio para cualquiera.
  assert.equal(paraTuGrupo([precio("any", "free")], grupo(2, [4]))?.gratis, true);
  // Sin precios, no se sabe; los de familia y de grupo no se suman.
  assert.equal(paraTuGrupo(null, grupo(2)), null);
  assert.equal(paraTuGrupo([precio("family", 30)], grupo(2, [5]))?.faltan, 3);
  // Un niño con un precio de niño sin edades: no se sabe si es el suyo, y falta (antes la web le ponía el de bebé).
  assert.equal(paraTuGrupo([precio("infant", "free"), precio("child", 5)], grupo(0, [1]))?.faltan, 1);
  // Si valen varios, el que más conviene: el de cualquiera a 3 antes que el de adulto a 7 (antes la web decía 7).
  assert.deepEqual(porPersona([precio("any", 3), precio("adult", 7)], "EUR")?.cuanto, { importe: 3, moneda: "EUR" });
  assert.deepEqual(paraTuGrupo([precio("any", 3), precio("adult", 7)], grupo(2))?.importes, [
    { importe: 6, moneda: "EUR" },
  ]);
  // Céntimos que se suman bien.
  assert.deepEqual(paraTuGrupo([precio("adult", 2.1)], grupo(3))?.importes, [{ importe: 6.3, moneda: "EUR" }]);
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

test("un trayecto que no se anda: el billete suelto de la cuenta de moverse, para el grupo; si no, nada", () => {
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
  // El taxi no es transporte público: el suelto es el del autobús, para dos.
  assert.deepEqual(billeteSuelto(m, grupo(2)), { importe: 4, moneda: "EUR", faltan: 0, cuantos: 2, fuentes: [F] });
  // Un niño, con una página que solo da el de adulto: paga el de adulto, la misma regla que en el presupuesto.
  assert.deepEqual(billeteSuelto(m, grupo(1, [8])), { importe: 4, moneda: "EUR", faltan: 0, cuantos: 2, fuentes: [F] });
  assert.equal(billeteSuelto({ ...m, billetes: [{ ...m.billetes[2], precios: null }] }, grupo(2)), null);
  assert.equal(billeteSuelto({ ...m, falta: "late" }, grupo(2)), null);
  assert.equal(billeteSuelto(undefined, grupo(2)), null);
  // Es el mismo suelto con que la cuenta de moverse paga cada trayecto, para cualquier número de trayectos.
  for (const n of [1, 2, 5]) {
    const c = cuentaDeMoverse([{ fecha: "2027-02-12", viajes: n }], m);
    assert.equal(c.sueltos, (sueltoPara(m)?.precio ?? Number.NaN) * n);
  }
});

test("las zonas de llegar, por su nombre si el viaje lo trae; si no, numeradas si son varias", () => {
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
  const zonas = [
    { id: "z1", nombre: "El Centro" },
    { id: "z2", nombre: "El Puerto" },
  ];
  assert.deepEqual(
    [...(zonasDeLlegar([llegar("z2"), llegar("z1")], zonas) ?? [])],
    [
      ["z2", "El Puerto"],
      ["z1", "El Centro"],
    ],
  );
  // Con los nombres y una ruta de varias zonas, se nombra aunque todas vayan a la misma; con una zona, no hace falta.
  assert.deepEqual([...(zonasDeLlegar([llegar("z1")], zonas) ?? [])], [["z1", "El Centro"]]);
  assert.equal(zonasDeLlegar([llegar("z1")], zonas.slice(0, 1)), null);
  assert.equal(sitioDe("https://www.inventado.example/x?y=1"), "inventado.example");
});

/** El viaje de la guía, con sus capas, el nombre de sus zonas y su presupuesto hecho por la casa. */
function viajeConCapas(): Viaje {
  const v = viajeParaLaGuia({ capas: true });
  v.zonasDeLaRuta = [{ id: "z1", nombre: "El Centro" }];
  v.alojamientos.forEach((a) => (a.zona = "El Centro"));
  v.presupuesto = presupuestoDe(
    v,
    { moverse: v.moverse, saber: v.saber, entradas: v.entradas },
    { zonas: v.zonasDeLaRuta },
  );
  return v;
}

const sinCambios = { ritmo: false, paradas: false, alojamiento: false, transporte: false };
const parteDe = (p: Presupuesto | undefined, manera: string, cual: string) =>
  p?.maneras.find((m) => m.manera === manera)?.partes.find((x) => x.parte === cual);

test("el presupuesto que se enseña: el de lo que tienes delante, rehecho con tus días", () => {
  const v = viajeConCapas();
  // Sin cambios, el mismo que hizo la casa.
  assert.deepEqual(presupuestoQueSeEnsena(v, v.dias, sinCambios), { presupuesto: v.presupuesto, deAntes: null });
  // Quitas la torre: las entradas bajan lo que cuesta la suya, y no es «de antes».
  const sin = v.dias.map((d) => ({ ...d, paradas: d.paradas.filter((id) => id !== "p1") }));
  const r = presupuestoQueSeEnsena(v, sin, { ...sinCambios, paradas: true });
  assert.equal(r.deAntes, null);
  const torre = delGrupo(entradaDe(v.entradas, "p1")!.precios, { adultos: v.adultos, ninos: v.ninos }, "EUR")!;
  assert.equal(
    parteDe(r.presupuesto, "cheapest", "tickets")!.total,
    parteDe(v.presupuesto, "cheapest", "tickets")!.total! - torre.importes[0].importe,
  );
  // Otro ritmo que junta todo en un día: los trayectos cambian, y moverte allí con ellos.
  const juntos = [
    { ...v.dias[0], paradas: v.dias.flatMap((d) => d.paradas) },
    ...v.dias.slice(1).map((d) => ({ ...d, paradas: [] })),
  ];
  const antes = trayectosQueNoSeAndan(v, v.maneras[1]).map((d) => d.trayectos);
  const ahora = trayectosQueNoSeAndan({ ...v, dias: juntos }, v.maneras[1]).map((d) => d.trayectos);
  assert.notDeepEqual(ahora, antes);
  assert.equal(
    parteDe(
      presupuestoQueSeEnsena(v, juntos, { ...sinCambios, ritmo: true }).presupuesto,
      "best_value",
      "getting_around",
    )!.total,
    loQueTeConviene(v, v.maneras[1], juntos).grupo.total,
  );
  // Un viaje de antes, sin las zonas de su ruta: llegar se queda el de antes y, si cambiaste donde duermes, se dice.
  const deAntes = { ...v, zonasDeLaRuta: undefined };
  assert.equal(presupuestoQueSeEnsena(deAntes, sin, { ...sinCambios, paradas: true }).deAntes, null);
  assert.equal(presupuestoQueSeEnsena(deAntes, v.dias, { ...sinCambios, alojamiento: true }).deAntes, "arrival");
  // Uno que falta no se rehace: no hay nada que enseñar.
  const falta: Viaje = { ...v, presupuesto: { maneras: [], comidas: null, falta: "failed" } };
  assert.deepEqual(presupuestoQueSeEnsena(falta, sin, sinCambios), { presupuesto: falta.presupuesto, deAntes: null });
});

test("una sola cuenta: la tarjeta, la ficha y las cuentas dicen lo mismo de las entradas", () => {
  const v = viajeConCapas();
  for (const ninos of [[], [8], [1, 15]]) {
    const w: Viaje = { ...v, ninos };
    const p = presupuestoDe(w, { moverse: w.moverse, entradas: w.entradas }, { zonas: w.zonasDeLaRuta });
    const tickets = p.maneras[0].partes.find((x) => x.parte === "tickets")!;
    // Lo que dice cada parada (la tarjeta y la ficha usan paraTuGrupo), sumado donde se sabe entero, es la parte.
    let suma = 0;
    let faltan = 0;
    for (const id of new Set(w.dias.flatMap((d) => d.paradas))) {
      const g = paraTuGrupo(entradaDe(w.entradas, id)?.precios ?? null, grupoDelViaje(w));
      if (g === null || g.faltan > 0) faltan++;
      else suma += g.importes.find((x) => x.moneda === "EUR")?.importe ?? 0;
    }
    assert.equal(tickets.total, suma);
    assert.equal(tickets.faltan, faltan);
  }
});

test("una sola cuenta de los tramos: los que la web dice que no se andan son los que paga moverte allí", () => {
  const v = viajeConCapas();
  const c = caminosDe(v.caminos);
  const punto = new Map(v.paradas.map((p) => [p.id, p.punto]));
  for (const manera of v.maneras) {
    const cama = v.alojamientos.find((a) => a.id === manera.alojamiento)!.punto;
    // Los tramos de la web de cada día: de donde duermes a la primera, de una a otra y de la última a donde duermes.
    const deLaWeb = v.dias.map((d) => {
      if (d.paradas.length === 0) return 0;
      const puntos = [cama, ...d.paradas.map((id) => punto.get(id)!), cama];
      let n = 0;
      for (let i = 0; i + 1 < puntos.length; i++)
        if (irEntre(puntos[i], puntos[i + 1], c, "en").cogiendo.length > 0) n++;
      return n;
    });
    assert.deepEqual(
      trayectosQueNoSeAndan(v, manera).map((d) => d.trayectos),
      deLaWeb,
    );
    // Y «Allí» dice la misma cifra que moverte allí en las cuentas.
    assert.equal(
      loQueTeConviene(v, manera, v.dias).grupo.total,
      parteDe(v.presupuesto, manera.id, "getting_around")!.total,
    );
  }
  // En el viaje inventado, la manera más barata duerme lejos de las paradas: hay trayectos que no se andan.
  assert.ok(trayectosQueNoSeAndan(v, v.maneras[0]).some((d) => d.trayectos > 0));
});

test("el nombre de las zonas, en la forma del viaje: cada una con su id y su nombre, sin repetir", () => {
  const v = viajeConCapas();
  assert.deepEqual(comprobarViaje(v), []);
  const pegas = (zonas: unknown) =>
    comprobarViaje({ ...v, zonasDeLaRuta: zonas as Viaje["zonasDeLaRuta"] }).filter((x) =>
      x.donde.startsWith("zonasDeLaRuta"),
    );
  assert.equal(pegas([{ id: "z1", nombre: "" }]).length, 1);
  assert.equal(
    pegas([
      { id: "z1", nombre: "A" },
      { id: "z1", nombre: "B" },
    ]).length,
    1,
  );
  assert.equal(pegas("z1").length, 1);
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
