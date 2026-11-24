// La carpeta de cada viaje en la mesa: de quién es, cómo está, sus investigaciones y sus versiones. Todo inventado.

import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { ESTADOS_DE_UN_PASO, PASOS } from "../../agent/data/pasos.ts";
import { ESTADOS_DEL_VIAJE, SE_PASA_A } from "../../agent/data/viaje.ts";
import {
  abrirViaje,
  apuntar,
  cambiarLoEntendido,
  guardarJson,
  guardarVersion,
  leerDiario,
  leerVersion,
  leerViaje,
  nuevoRun,
  pasar,
  ultimoRun,
  viajeDelRun,
  viajesDe,
  volverA,
} from "../../agent/launcher/mesa.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const ENTENDIDO = {
  destination: { name: "Villa Inventada" },
  dates: { check_in: "2031-03-04", check_out: "2031-03-07" },
};

function conMesa(prueba: (mesa: string) => void): void {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  try {
    prueba(mesa);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

/** Lo que deja un run cuando acaba, inventado: lo justo para que haya un viaje que guardar. */
function acabar(run: string, marca: string): void {
  writeFileSync(join(run, "viaje.json"), JSON.stringify({ id: marca }));
  writeFileSync(join(run, "sucesos.json"), JSON.stringify([{ t: 0, clase: "done" }]));
}

test("cada viaje tiene su carpeta en la mesa, fuera del repositorio, y empieza empezado", () => {
  conMesa((mesa) => {
    const cuando = new Date("2031-01-02T10:00:00Z");
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, cuando });
    assert.match(v.ficha.id, /^2031-01-02-[0-9a-f]{12}$/);
    assert.equal(v.carpeta, join(mesa, "viajes", v.ficha.id));
    assert.equal(v.ficha.estado, "started");
    assert.equal(v.ficha.dueno, "ana");
    assert.equal(v.ficha.version, null);
    assert.deepEqual(JSON.parse(readFileSync(join(v.carpeta, "entendido.json"), "utf8")), ENTENDIDO);
    assert.deepEqual(
      leerDiario(v).map((a) => a.que),
      ["opened"],
    );
    // La carpeta es solo de quien la crea, y no queda ningún archivo a medias.
    assert.equal(statSync(v.carpeta).mode & 0o077, 0);
    assert.deepEqual(readdirSync(v.carpeta).sort(), ["diario.jsonl", "entendido.json", "ficha.json"]);
  });
  assert.throws(() => abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa: join(RAIZ, "mesa") }), /repositorio/);
});

test("un viaje sin dueño no se abre, y su identificador no puede salirse de la mesa", () => {
  conMesa((mesa) => {
    for (const dueno of ["", "ana maría", "../ana", "a".repeat(129)])
      assert.throws(() => abrirViaje({ dueno, entendido: ENTENDIDO, mesa }), /de quién es/);
    for (const id of ["../fuera", "Con-Mayusculas", "a/b", "", "-empieza-mal"])
      assert.throws(() => abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id }), /identificador/);
    abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "uno" });
    assert.throws(() => abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "uno" }), /ya hay un viaje/);
    assert.ok(!existsSync(join(mesa, "fuera")));
  });
});

test("un viaje solo lo abre su dueño: a otro se le dice lo mismo que si no existiera", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "el-de-ana" });
    assert.equal(leerViaje("el-de-ana", "ana", mesa).ficha.id, v.ficha.id);
    const deOtro = (): unknown => leerViaje("el-de-ana", "luis", mesa);
    const queNoExiste = (): unknown => leerViaje("ninguno", "ana", mesa);
    assert.throws(deOtro, /^Error: no hay tal viaje$/);
    assert.throws(queNoExiste, /^Error: no hay tal viaje$/);
    for (const id of ["../el-de-ana", "el-de-ana/../el-de-ana", ""])
      assert.throws(() => leerViaje(id, "ana", mesa), /^Error: no hay tal viaje$/);
    // Una ficha tocada para decir que es de otro no engaña si no es la de ese viaje.
    guardarJson(join(mesa, "viajes", "falso", "..", "el-de-ana", "ficha.json"), { ...v.ficha, id: "otro" });
    assert.throws(() => leerViaje("el-de-ana", "ana", mesa), /^Error: no hay tal viaje$/);
  });
});

test("los viajes de un dueño salen del último que cambió al primero, y los de otro no salen", () => {
  conMesa((mesa) => {
    abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "a1", cuando: new Date("2031-01-01T00:00:00Z") });
    abrirViaje({ dueno: "luis", entendido: ENTENDIDO, mesa, id: "l1", cuando: new Date("2031-01-02T00:00:00Z") });
    abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa, id: "a2", cuando: new Date("2031-01-03T00:00:00Z") });
    writeFileSync(join(mesa, "viajes", "suelto.txt"), "no es un viaje");
    assert.deepEqual(
      viajesDe("ana", mesa).map((f) => f.id),
      ["a2", "a1"],
    );
    assert.deepEqual(
      viajesDe("luis", mesa).map((f) => f.id),
      ["l1"],
    );
    assert.deepEqual(viajesDe("nadie", mesa), []);
    assert.deepEqual(viajesDe("../ana", mesa), []);
  });
  conMesa((mesa) => assert.deepEqual(viajesDe("ana", mesa), []));
});

test("los estados de un viaje son los de la hoja, y desde cada uno se pasa solo a los que tocan", () => {
  assert.deepEqual([...ESTADOS_DEL_VIAJE], ["started", "confirmed", "researching", "on_map", "closed"]);
  for (const de of ESTADOS_DEL_VIAJE) for (const a of SE_PASA_A[de]) assert.ok(ESTADOS_DEL_VIAJE.includes(a));
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    // Sin confirmar no se investiga, ni se da por hecho, ni se cierra.
    assert.throws(() => nuevoRun(v), /antes hay que confirmarlo/);
    for (const a of ["researching", "on_map", "closed"] as const)
      assert.throws(() => pasar(v, a), /no pasa de started/);
    pasar(v, "confirmed");
    assert.throws(() => pasar(v, "closed"), /no pasa de confirmed/);
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.estado, "confirmed");
    assert.deepEqual(
      leerDiario(v).map((a) => a.que),
      ["opened", "state"],
    );
  });
});

test("lo entendido se cambia hasta que se confirma; después, no sin más", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    cambiarLoEntendido(v, { ...ENTENDIDO, pace: "calm" });
    assert.equal(JSON.parse(readFileSync(join(v.carpeta, "entendido.json"), "utf8")).pace, "calm");
    pasar(v, "confirmed");
    assert.throws(() => cambiarLoEntendido(v, ENTENDIDO), /confirmado/);
  });
});

test("cada investigación tiene su carpeta en el viaje, con lo entendido de ese momento", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    assert.equal(ultimoRun(v), null);
    pasar(v, "confirmed");
    const run = nuevoRun(v, new Date("2031-01-02T10:00:00Z"));
    assert.equal(run, join(v.carpeta, "runs", "1"));
    assert.equal(ultimoRun(v), run);
    assert.equal(v.ficha.estado, "researching");
    assert.deepEqual(JSON.parse(readFileSync(join(run, "entendido.json"), "utf8")), ENTENDIDO);
    assert.deepEqual(v.ficha.runs, [{ n: 1, cuando: "2031-01-02T10:00:00.000Z" }]);
    // Del run se llega a su viaje; de una carpeta cualquiera, no.
    const suyo = viajeDelRun(run);
    assert.equal(suyo?.n, 1);
    assert.equal(suyo?.viaje.ficha.id, v.ficha.id);
    assert.equal(viajeDelRun(mesa), null);
    assert.equal(viajeDelRun(join(v.carpeta, "runs", "7")), null);
    assert.equal(viajeDelRun(join(v.carpeta, "versiones", "1")), null);
    // Un run que se paró se puede volver a lanzar: es otro run, y el de antes se queda.
    assert.equal(nuevoRun(v), join(v.carpeta, "runs", "2"));
    assert.ok(existsSync(run));
  });
});

test("una versión se guarda entera y una sola vez, y la de antes se queda", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    pasar(v, "confirmed");
    const uno = nuevoRun(v);
    // Un run que no ha dejado su viaje no deja versión, ni media.
    assert.throws(() => guardarVersion(v, 1, "first"), /no ha dejado viaje.json, sucesos.json/);
    assert.throws(() => guardarVersion(v, 9, "first"), /no es de este viaje/);
    assert.ok(!existsSync(join(v.carpeta, "versiones")));
    assert.equal(leerVersion(v), null);

    acabar(uno, "primero");
    const primera = guardarVersion(v, 1, "first", new Date("2031-01-02T10:00:00Z"));
    assert.deepEqual(primera, { n: 1, cuando: "2031-01-02T10:00:00.000Z", run: 1, motivo: "first" });
    assert.equal(v.ficha.estado, "on_map");
    assert.equal(v.ficha.version, 1);
    assert.deepEqual(readdirSync(join(v.carpeta, "versiones")), ["1"]);
    assert.deepEqual(readdirSync(join(v.carpeta, "versiones", "1")).sort(), [
      "entendido.json",
      "sucesos.json",
      "viaje.json",
    ]);
    // Se pida las veces que se pida, ese run tiene una versión; y lo que el run cambie después no la toca.
    acabar(uno, "tocado después");
    assert.deepEqual(guardarVersion(v, 1, "first"), primera);
    assert.equal(v.ficha.versiones.length, 1);
    assert.deepEqual(leerVersion(v)?.viaje, { id: "primero" });

    // Un cambio vuelve a investigar; su versión es otra, y la primera sigue ahí para volver a ella.
    const dos = nuevoRun(v);
    assert.equal(v.ficha.estado, "researching");
    acabar(dos, "segundo");
    assert.equal(guardarVersion(v, 2, "change").n, 2);
    assert.deepEqual(leerVersion(v)?.viaje, { id: "segundo" });
    assert.deepEqual(leerVersion(v, 1)?.viaje, { id: "primero" });
    volverA(v, 1);
    assert.equal(leerViaje(v.ficha.id, "ana", mesa).ficha.version, 1);
    assert.deepEqual(leerVersion(leerViaje(v.ficha.id, "ana", mesa))?.viaje, { id: "primero" });
    assert.throws(() => volverA(v, 5), /no tiene esa versión/);
    assert.equal(leerVersion(v, 5), null);
    assert.deepEqual(
      leerDiario(v).map((a) => a.que),
      ["opened", "state", "run", "version", "run", "version", "back_to"],
    );
  });
});

test("un viaje cerrado se puede volver a investigar, y uno en el mapa, cerrar", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    pasar(v, "confirmed");
    acabar(nuevoRun(v), "primero");
    guardarVersion(v, 1, "first");
    pasar(v, "closed");
    assert.throws(() => pasar(v, "on_map"), /no pasa de closed/);
    assert.throws(() => guardarVersion(v, 2, "change"), /no es de este viaje/);
    assert.equal(nuevoRun(v), join(v.carpeta, "runs", "2"));
  });
});

test("el diario solo crece, y una línea cortada a medias no rompe su lectura", () => {
  conMesa((mesa) => {
    const v = abrirViaje({ dueno: "ana", entendido: ENTENDIDO, mesa });
    apuntar(v, "step", { paso: "sights", n: 12 }, new Date("2031-01-02T10:00:00Z"));
    appendFileSync(join(v.carpeta, "diario.jsonl"), '{"cuando":"2031-01-02T10:00:01Z","que":"cortad');
    const leido = leerDiario(v);
    assert.deepEqual(
      leido.map((a) => a.que),
      ["opened", "step"],
    );
    assert.deepEqual(leido[1], { paso: "sights", n: 12, cuando: "2031-01-02T10:00:00.000Z", que: "step" });
    // Lo que se apunta no puede hacerse pasar por otra cosa: el qué y el cuándo los pone la casa.
    apuntar(v, "step", { que: "version", cuando: "1999-01-01" });
    assert.equal(leerDiario(v).at(-1)?.que, "step");
    assert.notEqual(leerDiario(v).at(-1)?.cuando, "1999-01-01");
  });
});

test("guardar es de una vez: no queda ningún archivo a medias", () => {
  conMesa((mesa) => {
    guardarJson(join(mesa, "uno.json"), { a: 1 });
    guardarJson(join(mesa, "uno.json"), { a: 2 });
    assert.deepEqual(readdirSync(mesa), ["uno.json"]);
    assert.deepEqual(JSON.parse(readFileSync(join(mesa, "uno.json"), "utf8")), { a: 2 });
  });
});

test("los pasos de una investigación: cada uno, con quién lo da, y ninguno repetido", () => {
  assert.deepEqual(
    PASOS.map((p) => p.id),
    [
      "understood",
      "sights",
      "route",
      "search",
      "look",
      "pick",
      "days",
      "table",
      "cross",
      "explain",
      "calendar",
      "trip",
    ],
  );
  assert.equal(new Set(PASOS.map((p) => p.id)).size, PASOS.length);
  // Cada asiento de la investigación tiene su contrato en el repositorio, y cada paso deja algo.
  for (const p of PASOS) {
    assert.ok(p.deja.length > 0, p.id);
    if (p.quien !== "code") assert.ok(existsSync(join(RAIZ, "agent", "contracts", p.quien, "README.md")), p.quien);
  }
  assert.deepEqual([...ESTADOS_DE_UN_PASO], ["pending", "waiting", "yours", "done", "stopped"]);
});
