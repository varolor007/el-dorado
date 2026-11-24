// La puerta de la casa a la web: lo único que la web puede pedir, cada viaje solo para su dueño, y lo que pasa,
// contado en vivo. Con la casa escuchando en esta máquina, fuentes inventadas y asientos de mentira: sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Lanzador } from "../../agent/launcher/asiento.ts";
import {
  CABECERA_DEL_DUENO,
  OYENTES_DE_UN_VIAJE,
  PESO_DE_UNA_PETICION,
  puertaALaWeb,
  type OpcionesDeLaPuerta,
  type Puerta,
} from "../../agent/launcher/puerta_a_la_web.ts";
import { comprobarSucesos, comprobarViaje, type Suceso, type Viaje } from "../../agent/output/viaje.ts";
import { fuentesInventadas, lanzadorDeMentira, type DeMentira, type Objeto } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const LLAVE = "una-llave-larga-e-inventada-para-la-web";
const CLAVE = "clave-de-ia-inventada-0001";
const HOY = (): Date => new Date("2027-01-01T00:00:00Z");

type Casa = {
  puerta: Puerta;
  mesa: string;
  claves: string[];
  pide: (
    metodo: string,
    ruta: string,
    o?: { dueno?: string | null; llave?: string | null; cuerpo?: unknown },
  ) => Promise<{
    estado: number;
    cuerpo: Objeto;
  }>;
  url: string;
};

async function conCasa(
  prueba: (casa: Casa) => Promise<void>,
  o: { asientos?: DeMentira; sinIA?: boolean; conLanzador?: Lanzador } = {},
): Promise<void> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const claves: string[] = [];
  const lanzador: OpcionesDeLaPuerta["lanzador"] = (clave) => {
    claves.push(clave);
    return o.conLanzador ?? lanzadorDeMentira(o.asientos);
  };
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    fuentes: fuentesInventadas,
    hoy: HOY,
    cadaMs: 15,
    ...(o.sinIA ? {} : { lanzador }),
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as AddressInfo).port}`;
  const pide: Casa["pide"] = async (metodo, ruta, p = {}) => {
    const cabeceras: Record<string, string> = {};
    if (p.llave !== null) cabeceras.authorization = `Bearer ${p.llave ?? LLAVE}`;
    if (p.dueno !== null) cabeceras[CABECERA_DEL_DUENO] = p.dueno ?? "ana";
    const cuerpo =
      p.cuerpo === undefined || metodo === "GET"
        ? undefined
        : typeof p.cuerpo === "string"
          ? p.cuerpo
          : JSON.stringify(p.cuerpo);
    const r = await fetch(url + ruta, { method: metodo, headers: cabeceras, body: cuerpo });
    return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Objeto };
  };
  try {
    await prueba({ puerta, mesa, claves, pide, url });
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
}

async function abre(casa: Casa, dueno = "ana", entendido: unknown = ENTENDIDO): Promise<string> {
  const r = await casa.pide("POST", "/viajes", { dueno, cuerpo: { understood: entendido } });
  assert.equal(r.estado, 201);
  return r.cuerpo.trip.id as string;
}

/** Todo lo que hay escrito en una carpeta, de arriba abajo: para mirar que algo no está en ningún sitio. */
function todoLoEscrito(carpeta: string): string {
  let todo = "";
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    todo += statSync(ruta).isDirectory()
      ? todoLoEscrito(ruta)
      : nombre.endsWith(".jpg")
        ? ""
        : readFileSync(ruta, "utf8");
  }
  return todo;
}

test("sin la llave de la web no se entra, y sin decir de quién es la petición, tampoco", async () => {
  await conCasa(async (casa) => {
    assert.deepEqual(await casa.pide("GET", "/salud", { llave: null, dueno: null }), {
      estado: 200,
      cuerpo: { ok: true },
    });
    for (const llave of [null, "", "otra-llave-larga-e-inventada-para-la-web", LLAVE.slice(0, -1), LLAVE + "x"])
      assert.deepEqual(await casa.pide("GET", "/viajes", { llave }), {
        estado: 401,
        cuerpo: { error: "unauthorized" },
      });
    for (const dueno of [null, "", "ana maría", "../ana", "a".repeat(129)])
      assert.deepEqual(await casa.pide("GET", "/viajes", { dueno }), { estado: 400, cuerpo: { error: "no_owner" } });
    assert.deepEqual(await casa.pide("GET", "/viajes"), { estado: 200, cuerpo: { trips: [] } });
  });
  assert.throws(() => puertaALaWeb({ mesa: tmpdir(), llave: "corta", fuentes: fuentesInventadas }), /demasiado corta/);
});

test("cada viaje, solo para su dueño: otro no lo ve, ni llega a saber que existe", async () => {
  await conCasa(async (casa) => {
    const id = await abre(casa, "ana");
    const suyos = await casa.pide("GET", "/viajes", { dueno: "ana" });
    assert.deepEqual(
      suyos.cuerpo.trips.map((t: Objeto) => [t.id, t.state, t.destination, t.check_in]),
      [[id, "started", ENTENDIDO.destination.name, ENTENDIDO.dates.check_in]],
    );
    assert.deepEqual((await casa.pide("GET", "/viajes", { dueno: "luis" })).cuerpo, { trips: [] });
    const noHay = { estado: 404, cuerpo: { error: "not_found" } };
    for (const ruta of [`/viajes/${id}`, `/viajes/${id}/version`, `/viajes/${id}/eventos`])
      assert.deepEqual(await casa.pide("GET", ruta, { dueno: "luis" }), noHay, ruta);
    assert.deepEqual(
      await casa.pide("PUT", `/viajes/${id}/entendido`, { dueno: "luis", cuerpo: { understood: {} } }),
      noHay,
    );
    assert.deepEqual(
      await casa.pide("POST", `/viajes/${id}/empezar`, { dueno: "luis", cuerpo: { ceiling: 5, key: CLAVE } }),
      noHay,
    );
    // Lo mismo que para un viaje que no existe, o un identificador que quiere salirse de la mesa.
    for (const otro of ["ninguno", "..%2F..%2Fetc", "%2e%2e", id.toUpperCase()])
      assert.deepEqual(await casa.pide("GET", `/viajes/${otro}`, { dueno: "ana" }), noHay, otro);
    assert.equal((await casa.pide("GET", `/viajes/${id}`, { dueno: "ana" })).estado, 200);
    assert.deepEqual(casa.claves, []);
  });
});

test("el botón confirma, da el adelante con su techo y lleva la investigación hasta el mapa", async () => {
  await conCasa(async (casa) => {
    const id = await abre(casa);
    const antes = await casa.pide("GET", `/viajes/${id}`);
    assert.deepEqual([antes.cuerpo.trip.state, antes.cuerpo.research], ["started", null]);
    assert.deepEqual(await casa.pide("GET", `/viajes/${id}/version`), { estado: 404, cuerpo: { error: "not_found" } });

    const boton = await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } });
    assert.deepEqual(boton, { estado: 202, cuerpo: { run: 1 } });
    await casa.puerta.esperar();
    assert.deepEqual(casa.puerta.enMarcha(), []);

    const { cuerpo } = await casa.pide("GET", `/viajes/${id}`);
    assert.equal(cuerpo.trip.state, "on_map");
    assert.equal(cuerpo.trip.version, 1);
    assert.equal(cuerpo.research.running, false);
    assert.equal(cuerpo.research.stopped, null);
    assert.equal(cuerpo.research.ceiling, 5);
    assert.ok(cuerpo.research.steps.every((p: Objeto) => p.state === "done" && p.waiting === 0));
    // De cada trabajo de la IA se dice el paso, cómo está y lo que gastó: nunca el asiento ni su puesto.
    assert.equal(cuerpo.research.jobs.length, 9);
    assert.deepEqual(Object.keys(cuerpo.research.jobs[0]).sort(), ["state", "step", "usd"]);
    assert.deepEqual(
      [...new Set(cuerpo.research.jobs.map((t: Objeto) => t.step))],
      ["route", "look", "pick", "cross", "explain"],
    );
    assert.ok(Math.abs(cuerpo.research.spent.usd - 0.45) < 1e-9);
    assert.deepEqual([cuerpo.research.spent.turns, cuerpo.research.spent.known], [27, true]);

    // El viaje que se enseña pasa lo que se comprueba de un viaje antes de enseñarlo.
    const version = await casa.pide("GET", `/viajes/${id}/version`);
    assert.equal(version.cuerpo.n, 1);
    assert.deepEqual(comprobarViaje(version.cuerpo.trip as Viaje), []);
    assert.deepEqual(comprobarSucesos(version.cuerpo.events as Suceso[]), []);
    assert.deepEqual((await casa.pide("GET", `/viajes/${id}/version/1`)).cuerpo, version.cuerpo);
    for (const n of ["2", "0", "-1", "1e3", "uno", "1/2"])
      assert.equal((await casa.pide("GET", `/viajes/${id}/version/${n}`)).estado, 404, n);

    // La clave de IA llegó a quien piensa en los asientos, y no quedó escrita en ningún sitio de la mesa.
    assert.deepEqual(casa.claves, [CLAVE]);
    assert.ok(!todoLoEscrito(casa.mesa).includes(CLAVE));
    assert.ok(!JSON.stringify(cuerpo).includes(CLAVE));
  });
});

test("lo que sale por la puerta no lleva el porqué de un rojo, ni un asiento, ni una ruta del disco", async () => {
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } });
      await casa.puerta.esperar();
      const { cuerpo } = await casa.pide("GET", `/viajes/${id}`);
      assert.equal(cuerpo.trip.state, "researching");
      assert.deepEqual(cuerpo.research.stopped, { at: "route" });
      assert.deepEqual(cuerpo.research.jobs, [{ step: "route", state: "failed", usd: null }]);
      assert.equal(cuerpo.research.spent.known, false);
      const dicho = JSON.stringify(cuerpo);
      for (const callado of [
        "la IA no contestó",
        "no entregó",
        "route-planner",
        "ruta-v1",
        casa.mesa,
        "rojos",
        "fallo",
      ])
        assert.ok(!dicho.includes(callado), callado);
      // Y lo que se cuenta en vivo, igual.
      const r = await fetch(`${casa.url}/viajes/${id}/eventos`, {
        headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DEL_DUENO]: "ana" },
      });
      const lector = r.body!.getReader();
      const primero = new TextDecoder().decode((await lector.read()).value);
      await lector.cancel();
      assert.match(primero, /^event: state\ndata: /);
      assert.ok(primero.includes('"clase":"stopped"') && primero.includes('"ref":"route"'));
      for (const callado of ["la IA no contestó", "route-planner", casa.mesa, "cuando"])
        assert.ok(!primero.includes(callado));
    },
    { asientos: { falla: (asiento) => (asiento === "route-planner" ? "rompe" : null) } },
  );
});

test("sin IA enchufada, o con un techo, una clave o un viaje que no valen, el botón no lanza nada", async () => {
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } }), {
        estado: 503,
        cuerpo: { error: "no_ai" },
      });
      assert.equal((await casa.pide("GET", `/viajes/${id}`)).cuerpo.trip.state, "started");
    },
    { sinIA: true },
  );
  await conCasa(async (casa) => {
    const id = await abre(casa);
    for (const ceiling of [undefined, 0, -3, "5", null])
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling, key: CLAVE } }), {
        estado: 400,
        cuerpo: { error: "bad_ceiling" },
      });
    for (const key of [undefined, "", "corta", "con espacios dentro", "a".repeat(401), 12345678])
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key } }), {
        estado: 400,
        cuerpo: { error: "bad_key" },
      });
    // Lo entendido mal escrito: se dice qué campo no está claro, y el viaje sigue sin confirmar.
    const mal = await abre(casa, "ana", { ...ENTENDIDO, currency: "euros" });
    assert.deepEqual(await casa.pide("POST", `/viajes/${mal}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } }), {
      estado: 422,
      cuerpo: { error: "unclear", fields: ["currency"] },
    });
    for (const viaje of [id, mal]) {
      const { cuerpo } = await casa.pide("GET", `/viajes/${viaje}`);
      assert.deepEqual([cuerpo.trip.state, cuerpo.research], ["started", null]);
    }
    assert.deepEqual(casa.claves, []);
  });
});

test("lo entendido se cambia hasta que se confirma, y mientras se investiga no se lanza otra vez", async () => {
  let suelta = (): void => {};
  const espera = new Promise<void>((r) => (suelta = r));
  const lento = lanzadorDeMentira();
  const lanzador: Lanzador = async (orden, puesto, corte) => {
    await espera;
    return lento(orden, puesto, corte);
  };
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      const cambiado = await casa.pide("PUT", `/viajes/${id}/entendido`, {
        cuerpo: { understood: { ...ENTENDIDO, pace: "calm" } },
      });
      assert.equal(cambiado.estado, 200);
      assert.equal(
        (await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } })).estado,
        202,
      );
      assert.deepEqual(casa.puerta.enMarcha(), [id]);
      // Con la investigación en marcha: ni otra vez el botón, ni cambiar lo entendido sin más.
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } }), {
        estado: 409,
        cuerpo: { error: "already_running" },
      });
      assert.deepEqual(await casa.pide("PUT", `/viajes/${id}/entendido`, { cuerpo: { understood: ENTENDIDO } }), {
        estado: 409,
        cuerpo: { error: "not_now" },
      });
      assert.equal((await casa.pide("GET", `/viajes/${id}`)).cuerpo.research.running, true);
      suelta();
      await casa.puerta.esperar();
      assert.equal((await casa.pide("GET", `/viajes/${id}`)).cuerpo.trip.state, "on_map");
    },
    { conLanzador: lanzador },
  );
});

test("quien escucha recibe en vivo el estado y lo contado, en su orden y sin repetir nada", async () => {
  await conCasa(async (casa) => {
    const id = await abre(casa);
    const r = await fetch(`${casa.url}/viajes/${id}/eventos`, {
      headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DEL_DUENO]: "ana" },
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") ?? "", /^text\/event-stream/);
    const lector = r.body!.getReader();
    const descifra = new TextDecoder();
    let resto = "";
    const recibidos: Objeto[] = [];
    const leeHasta = async (ya: () => boolean): Promise<void> => {
      for (let i = 0; i < 2000 && !ya(); i++) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += descifra.decode(value, { stream: true });
        const trozos = resto.split("\n\n");
        resto = trozos.pop() ?? "";
        for (const trozo of trozos)
          if (trozo.startsWith("event: state\ndata: "))
            recibidos.push(JSON.parse(trozo.slice("event: state\ndata: ".length)));
      }
    };
    // Lo primero, cómo está: empezado y sin investigación.
    await leeHasta(() => recibidos.length > 0);
    assert.deepEqual([recibidos[0].trip.state, recibidos[0].research, recibidos[0].events], ["started", null, []]);

    await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5, key: CLAVE } });
    await leeHasta(() => recibidos.at(-1)?.trip.state === "on_map");
    await lector.cancel();
    const ultimo = recibidos.at(-1)!;
    assert.equal(ultimo.trip.state, "on_map");
    assert.ok(recibidos.some((x) => x.research?.running === true));
    // Lo contado llega entero, cada suceso una vez y en su orden; el último, que el viaje está en el mapa.
    const contados = recibidos.flatMap((x) => x.events as Objeto[]);
    assert.equal(contados.length, ultimo.research.told);
    assert.equal(contados.at(-1)?.clase, "done");
    let van = 0;
    for (const x of recibidos) {
      assert.equal(x.from, van);
      van += x.events.length;
    }
    assert.ok(contados.every((x, i) => i === 0 || x.t >= contados[i - 1].t));
    assert.deepEqual(comprobarSucesos(contados as unknown as Suceso[]), []);
    assert.ok(contados.every((x) => !("cuando" in x)));
    // Quien llega tarde pide desde donde iba, y recibe solo lo que le falta.
    const tarde = await fetch(`${casa.url}/viajes/${id}/eventos?desde=${contados.length - 2}`, {
      headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DEL_DUENO]: "ana" },
    });
    const otro = tarde.body!.getReader();
    const trozo = descifra.decode((await otro.read()).value);
    await otro.cancel();
    const llegado = JSON.parse(trozo.split("\n\n")[0].slice("event: state\ndata: ".length)) as Objeto;
    assert.deepEqual([llegado.from, llegado.events.length], [contados.length - 2, 2]);
  });
});

test("a un viaje no le escuchan más oyentes de los que caben, y al irse uno cabe otro", async () => {
  await conCasa(async (casa) => {
    const id = await abre(casa);
    const cabeceras = { authorization: `Bearer ${LLAVE}`, [CABECERA_DEL_DUENO]: "ana" };
    const abiertos = [];
    for (let i = 0; i < OYENTES_DE_UN_VIAJE; i++) {
      const r = await fetch(`${casa.url}/viajes/${id}/eventos`, { headers: cabeceras });
      assert.equal(r.status, 200);
      abiertos.push(r.body!.getReader());
    }
    assert.deepEqual(await casa.pide("GET", `/viajes/${id}/eventos`), {
      estado: 429,
      cuerpo: { error: "too_many_listeners" },
    });
    await abiertos.pop()!.cancel();
    let otro: Response | null = null;
    for (let i = 0; i < 50 && otro?.status !== 200; i++) {
      await new Promise((r) => setTimeout(r, 10));
      otro = await fetch(`${casa.url}/viajes/${id}/eventos`, { headers: cabeceras });
      if (otro.status !== 200) await otro.body?.cancel();
    }
    assert.equal(otro?.status, 200);
    abiertos.push(otro!.body!.getReader());
    for (const lector of abiertos) await lector.cancel();
  });
});

test("lo que no es de la puerta se rechaza: otra ruta, otro método, lo que no es JSON o pesa demasiado", async () => {
  await conCasa(async (casa) => {
    const id = await abre(casa);
    for (const ruta of [
      "/",
      "/otra",
      "/viajes/a/b/c/d",
      `/viajes/${id}/sellos`,
      `/viajes/${id}/empezar/ya`,
      "/salud/x",
    ])
      assert.equal((await casa.pide("GET", ruta)).estado, 404, ruta);
    assert.equal((await casa.pide("POST", "/salud", { llave: null })).estado, 401);
    for (const [metodo, ruta] of [
      ["DELETE", "/viajes"],
      ["DELETE", `/viajes/${id}`],
      ["GET", `/viajes/${id}/empezar`],
      ["POST", `/viajes/${id}/entendido`],
      ["POST", `/viajes/${id}/version`],
      ["POST", `/viajes/${id}/eventos`],
    ])
      assert.deepEqual(
        await casa.pide(metodo, ruta, { cuerpo: {} }),
        { estado: 405, cuerpo: { error: "method" } },
        ruta,
      );
    assert.deepEqual(await casa.pide("POST", "/viajes", { cuerpo: "{esto no es json" }), {
      estado: 400,
      cuerpo: { error: "bad_json" },
    });
    for (const cuerpo of [{}, [], { understood: "un texto" }, { understood: [] }])
      assert.deepEqual(await casa.pide("POST", "/viajes", { cuerpo }), {
        estado: 400,
        cuerpo: { error: "bad_request" },
      });
    const gordo = await casa
      .pide("POST", "/viajes", { cuerpo: { understood: { x: "a".repeat(PESO_DE_UNA_PETICION) } } })
      .catch(() => ({ estado: 413, cuerpo: { error: "too_large" } }));
    assert.equal(gordo.estado, 413);
    assert.equal((await casa.pide("GET", "/viajes")).cuerpo.trips.length, 1);
  });
});
