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
  CABECERA_DE_LA_SESION,
  CABECERA_DEL_CLIENTE,
  INTENTOS_DE_ENTRAR,
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
const SECRETO = Buffer.alloc(32, 7);
const CONTRASENA = "una contraseña larga";
const correoDe = (nombre: string): string => `${nombre}@inventado.example`;
const HOY = (): Date => new Date("2027-01-01T00:00:00Z");

type Casa = {
  puerta: Puerta;
  mesa: string;
  claves: string[];
  pide: (
    metodo: string,
    ruta: string,
    o?: { dueno?: string | null; sesion?: string; llave?: string | null; cuerpo?: unknown },
  ) => Promise<{
    estado: number;
    cuerpo: Objeto;
  }>;
  /** La sesión de un viajero inventado: la primera vez se registra y pone su clave de IA. */
  sesion: (nombre: string) => Promise<string>;
  url: string;
};

async function conCasa(
  prueba: (casa: Casa) => Promise<void>,
  o: {
    asientos?: DeMentira;
    sinIA?: boolean;
    sinClave?: boolean;
    conLanzador?: Lanzador;
    comprueba?: (clave: string) => Promise<boolean>;
    freno?: OpcionesDeLaPuerta["freno"];
    fuentes?: OpcionesDeLaPuerta["fuentes"];
  } = {},
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
    secreto: SECRETO,
    fuentes: o.fuentes ?? fuentesInventadas,
    hoy: HOY,
    ...(o.freno === undefined ? {} : { freno: o.freno }),
    cadaMs: 15,
    ...(o.sinIA ? {} : { lanzador }),
    ...(o.comprueba === undefined ? {} : { claveQueFunciona: o.comprueba }),
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as AddressInfo).port}`;
  const sesiones = new Map<string, string>();
  const manda = (
    metodo: string,
    ruta: string,
    cabeceras: Record<string, string>,
    cuerpo?: unknown,
  ): Promise<Response> =>
    fetch(url + ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${LLAVE}`, ...cabeceras },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  const sesion: Casa["sesion"] = async (nombre) => {
    const ya = sesiones.get(nombre);
    if (ya !== undefined) return ya;
    const r = await manda("POST", "/cuentas", {}, { email: correoDe(nombre), password: CONTRASENA });
    const abierta = ((await r.json()) as Objeto).session as string;
    sesiones.set(nombre, abierta);
    if (!o.sinClave) await manda("PUT", "/cuenta/clave", { [CABECERA_DE_LA_SESION]: abierta }, { key: CLAVE });
    return abierta;
  };
  const pide: Casa["pide"] = async (metodo, ruta, p = {}) => {
    const cabeceras: Record<string, string> = {};
    if (p.llave !== null) cabeceras.authorization = `Bearer ${p.llave ?? LLAVE}`;
    if (p.sesion !== undefined) cabeceras[CABECERA_DE_LA_SESION] = p.sesion;
    else if (p.dueno !== null) cabeceras[CABECERA_DE_LA_SESION] = await sesion(p.dueno ?? "ana");
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
    await prueba({ puerta, mesa, claves, pide, sesion, url });
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

test("sin la llave de la web no se entra, y sin una sesión abierta no se pide nada de nadie", async () => {
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
    // Ni registrarse se puede sin la llave de la web.
    assert.equal((await casa.pide("POST", "/cuentas", { llave: null, dueno: null, cuerpo: {} })).estado, 401);
    const sinSesion = { estado: 401, cuerpo: { error: "no_session" } };
    assert.deepEqual(await casa.pide("GET", "/viajes", { dueno: null }), sinSesion);
    for (const sesion of ["", "ana", "../ana", "a".repeat(43), "u-" + "0".repeat(32)])
      for (const ruta of ["/viajes", "/cuenta", "/viajes/uno/eventos"])
        assert.deepEqual(await casa.pide("GET", ruta, { sesion }), sinSesion, `${ruta} con ${sesion}`);
    assert.deepEqual(await casa.pide("GET", "/viajes"), { estado: 200, cuerpo: { trips: [] } });
  });
  const base = { mesa: tmpdir(), fuentes: fuentesInventadas };
  assert.throws(() => puertaALaWeb({ ...base, llave: "corta", secreto: SECRETO }), /demasiado corta/);
  assert.throws(() => puertaALaWeb({ ...base, llave: LLAVE, secreto: Buffer.alloc(16) }), /32 bytes/);
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
      await casa.pide("POST", `/viajes/${id}/empezar`, { dueno: "luis", cuerpo: { ceiling: 5 } }),
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

    const boton = await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } });
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
    assert.equal(cuerpo.research.jobs.length, 11);
    assert.deepEqual(Object.keys(cuerpo.research.jobs[0]).sort(), ["state", "step", "usd"]);
    assert.deepEqual(
      [...new Set(cuerpo.research.jobs.map((t: Objeto) => t.step))],
      ["calendar", "papers", "route", "look", "pick", "cross", "explain"],
    );
    assert.ok(Math.abs(cuerpo.research.spent.usd - 0.55) < 1e-9);
    assert.deepEqual([cuerpo.research.spent.turns, cuerpo.research.spent.known], [33, true]);

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
      await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } });
      await casa.puerta.esperar();
      const { cuerpo } = await casa.pide("GET", `/viajes/${id}`);
      assert.equal(cuerpo.trip.state, "researching");
      // Dónde, y por claves, qué clase de parada es y qué puede hacer: sin gasto sabido, el conductor no se lanza.
      assert.deepEqual(cuerpo.research.stopped, {
        at: "route",
        kind: "seat_did_not_finish",
        options: ["retry"],
        said: null,
        looking: false,
      });
      assert.deepEqual(
        cuerpo.research.jobs.filter((t: Objeto) => t.step !== "calendar" && t.step !== "papers"),
        [{ step: "route", state: "failed", usd: null }],
      );
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
        headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: await casa.sesion("ana") },
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
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } }), {
        estado: 503,
        cuerpo: { error: "no_ai" },
      });
      assert.equal((await casa.pide("GET", `/viajes/${id}`)).cuerpo.trip.state, "started");
    },
    { sinIA: true },
  );
  await conCasa(async (casa) => {
    const id = await abre(casa);
    for (const ceiling of [0, -3, "5", {}])
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling } }), {
        estado: 400,
        cuerpo: { error: "bad_ceiling" },
      });
    // Lo entendido mal escrito: se dice qué campo no está claro, y el viaje sigue sin confirmar.
    const mal = await abre(casa, "ana", { ...ENTENDIDO, currency: "euros" });
    assert.deepEqual(await casa.pide("POST", `/viajes/${mal}/empezar`, { cuerpo: { ceiling: 5 } }), {
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

test("el techo de gasto no es obligado: sin él, el botón lanza igual y la casa no para por gasto", async () => {
  await conCasa(async (casa) => {
    for (const cuerpo of [{}, { ceiling: null }]) {
      const id = await abre(casa);
      assert.equal((await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo })).estado, 202);
      await casa.puerta.esperar();
      const { cuerpo: dicho } = await casa.pide("GET", `/viajes/${id}`);
      assert.deepEqual([dicho.trip.state, dicho.research.ceiling, dicho.research.stopped], ["on_map", null, null]);
    }
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
      // A su dueño se le devuelve lo que he entendido, entero, para retomar las preguntas; a otro, nada.
      assert.deepEqual((await casa.pide("GET", `/viajes/${id}`)).cuerpo.understood, { ...ENTENDIDO, pace: "calm" });
      assert.equal((await casa.pide("GET", `/viajes/${id}`, { dueno: "luis" })).estado, 404);
      assert.equal((await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } })).estado, 202);
      assert.deepEqual(casa.puerta.enMarcha(), [id]);
      // Con la investigación en marcha: ni otra vez el botón, ni cambiar lo entendido sin más.
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } }), {
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
      headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: await casa.sesion("ana") },
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

    await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } });
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
      headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: await casa.sesion("ana") },
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
    const cabeceras = { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: await casa.sesion("ana") };
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

test("un run parado: el conductor lo cuenta por claves, y el acta del run la pide solo su dueño", async () => {
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      // Sin viaje aún, no hay acta.
      assert.equal((await casa.pide("GET", `/viajes/${id}/acta`)).estado, 404);
      await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } });
      await casa.puerta.esperar();
      const { cuerpo } = await casa.pide("GET", `/viajes/${id}`);
      assert.deepEqual(cuerpo.research.stopped, {
        at: "route",
        kind: "seat_kept_failing",
        options: ["retry"],
        said: null,
        looking: false,
      });
      const acta = await casa.pide("GET", `/viajes/${id}/acta`);
      assert.equal(acta.estado, 200);
      assert.equal(acta.cuerpo.record.conductor.estado, "told");
      assert.deepEqual(
        acta.cuerpo.record.trabajos
          .filter((t: Objeto) => t.paso !== "calendar" && t.paso !== "papers")
          .map((t: Objeto) => [t.paso, t.vuelta, t.estado]),
        [
          ["route", 1, "failed"],
          ["conductor", 1, "done"],
        ],
      );
      // Ni el porqué de un fallo, ni una ruta del disco, ni el nombre de un asiento o de un puesto.
      const dicho = JSON.stringify(acta.cuerpo);
      for (const callado of ["la IA se cortó", casa.mesa, "route-planner", "ruta-v1", "fallo"])
        assert.ok(!dicho.includes(callado), callado);
      assert.deepEqual(await casa.pide("GET", `/viajes/${id}/acta`, { dueno: "luis" }), {
        estado: 404,
        cuerpo: { error: "not_found" },
      });
      assert.equal((await casa.pide("POST", `/viajes/${id}/acta`)).estado, 405);
    },
    { asientos: { falla: (asiento) => (asiento === "route-planner" ? "rompe y lo dice" : null) } },
  );
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

test("registrarse deja la sesión abierta; un correo, una cuenta; y lo que no vale no abre ninguna", async () => {
  await conCasa(async (casa) => {
    const alta = await casa.pide("POST", "/cuentas", {
      dueno: null,
      cuerpo: { email: "  Ana@Inventado.Example ", password: CONTRASENA },
    });
    assert.equal(alta.estado, 201);
    assert.deepEqual(Object.keys(alta.cuerpo).sort(), ["account", "session"]);
    assert.deepEqual(Object.keys(alta.cuerpo.account).sort(), ["email", "id", "key", "thinks_with"]);
    assert.deepEqual([alta.cuerpo.account.email, alta.cuerpo.account.key], ["ana@inventado.example", null]);
    // Con esa sesión ya es ella, y nadie más.
    const quien = await casa.pide("GET", "/cuenta", { sesion: alta.cuerpo.session });
    assert.deepEqual(quien, { estado: 200, cuerpo: { account: alta.cuerpo.account } });
    // El mismo correo, se escriba como se escriba, no abre otra cuenta.
    for (const email of ["ana@inventado.example", "ANA@INVENTADO.EXAMPLE"])
      assert.deepEqual(await casa.pide("POST", "/cuentas", { dueno: null, cuerpo: { email, password: CONTRASENA } }), {
        estado: 409,
        cuerpo: { error: "exists" },
      });
    for (const email of [undefined, "", "sin arroba", "a@b", "a b@c.d", "@c.d", "a@c.", 7, `${"a".repeat(250)}@c.d`])
      assert.deepEqual(await casa.pide("POST", "/cuentas", { dueno: null, cuerpo: { email, password: CONTRASENA } }), {
        estado: 400,
        cuerpo: { error: "bad_email" },
      });
    for (const password of [undefined, "", "corta", "a".repeat(201), 1234567890, "luis@inventado.example"])
      assert.deepEqual(
        await casa.pide("POST", "/cuentas", { dueno: null, cuerpo: { email: "luis@inventado.example", password } }),
        { estado: 400, cuerpo: { error: "bad_password" } },
        String(password),
      );
    // Ni la contraseña ni nada sacado de ella sale por la puerta, ni queda escrita tal cual en la mesa.
    assert.ok(!JSON.stringify([alta.cuerpo, quien.cuerpo]).includes(CONTRASENA));
    const escrito = todoLoEscrito(casa.mesa);
    assert.ok(!escrito.includes(CONTRASENA) && !escrito.includes(alta.cuerpo.session));
  });
});

test("entrar pide el correo y su contraseña; fallar no dice cuál de los dos; salir cierra la sesión", async () => {
  await conCasa(async (casa) => {
    const primera = await casa.sesion("ana");
    const entra = (email: unknown, password: unknown): ReturnType<Casa["pide"]> =>
      casa.pide("POST", "/sesiones", { dueno: null, cuerpo: { email, password } });
    const bien = await entra(correoDe("ana"), CONTRASENA);
    assert.equal(bien.estado, 200);
    assert.equal(bien.cuerpo.account.email, correoDe("ana"));
    assert.notEqual(bien.cuerpo.session, primera);
    // Una contraseña mala y un correo que no existe contestan lo mismo.
    const mal = { estado: 401, cuerpo: { error: "bad_login" } };
    assert.deepEqual(await entra(correoDe("ana"), "otra contraseña larga"), mal);
    assert.deepEqual(await entra(correoDe("nadie"), CONTRASENA), mal);
    assert.deepEqual(await entra(undefined, undefined), mal);
    // Las dos sesiones valen a la vez; al salir de una, esa deja de valer y la otra sigue.
    assert.equal((await casa.pide("GET", "/cuenta", { sesion: bien.cuerpo.session })).estado, 200);
    assert.deepEqual(await casa.pide("DELETE", "/sesiones", { sesion: bien.cuerpo.session }), {
      estado: 200,
      cuerpo: { ok: true },
    });
    assert.equal((await casa.pide("GET", "/cuenta", { sesion: bien.cuerpo.session })).estado, 401);
    assert.equal((await casa.pide("GET", "/cuenta", { sesion: primera })).estado, 200);
    assert.equal((await casa.pide("DELETE", "/sesiones", { dueno: null })).estado, 200);
    assert.equal((await casa.pide("GET", "/sesiones", { dueno: null })).estado, 405);
  });
});

test("quien falla muchas veces al entrar con un correo tiene que esperar, aunque después acierte", async () => {
  await conCasa(async (casa) => {
    await casa.sesion("ana");
    await casa.sesion("luis");
    const entra = (nombre: string, password: string): ReturnType<Casa["pide"]> =>
      casa.pide("POST", "/sesiones", { dueno: null, cuerpo: { email: correoDe(nombre), password } });
    for (let i = 0; i < INTENTOS_DE_ENTRAR.fallos; i++)
      assert.equal((await entra("ana", `una contraseña mala ${i}`)).estado, 401);
    const frenado = await entra("ana", CONTRASENA);
    assert.equal(frenado.estado, 429);
    assert.equal(frenado.cuerpo.error, "too_many_attempts");
    assert.ok(frenado.cuerpo.wait > 0 && frenado.cuerpo.wait <= INTENTOS_DE_ENTRAR.minutos * 60);
    // El freno es de ese correo: otro entra sin esperar.
    assert.equal((await entra("luis", CONTRASENA)).estado, 200);
  });
});

test("tu clave de IA se guarda cifrada, solo se enseña cómo acaba, y se borra cuando quieras", async () => {
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      // Sin clave puesta, el botón lo dice y no abre ninguna investigación.
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } }), {
        estado: 409,
        cuerpo: { error: "no_key" },
      });
      for (const key of [
        undefined,
        "",
        "corta",
        "con espacios dentro de la clave",
        "a".repeat(401),
        12345678901234567890,
      ])
        assert.deepEqual(await casa.pide("PUT", "/cuenta/clave", { cuerpo: { key } }), {
          estado: 400,
          cuerpo: { error: "bad_key" },
        });
      const puesta = await casa.pide("PUT", "/cuenta/clave", { cuerpo: { key: CLAVE } });
      assert.equal(puesta.estado, 200);
      assert.equal(puesta.cuerpo.account.key.hint, CLAVE.slice(-4));
      const quien = await casa.pide("GET", "/cuenta");
      assert.deepEqual(quien.cuerpo.account.key, puesta.cuerpo.account.key);
      // La clave entera no sale por la puerta ni está escrita en la mesa: solo cifrada.
      assert.ok(!JSON.stringify([puesta.cuerpo, quien.cuerpo]).includes(CLAVE));
      assert.ok(!todoLoEscrito(casa.mesa).includes(CLAVE));
      // Con ella, el botón lanza, y a quien piensa en los asientos le llega la clave de verdad.
      assert.equal((await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: { ceiling: 5 } })).estado, 202);
      await casa.puerta.esperar();
      assert.deepEqual(casa.claves, [CLAVE]);
      assert.ok(!todoLoEscrito(casa.mesa).includes(CLAVE));
      // Borrada, ya no hay clave; y la de otro viajero no es la suya.
      assert.deepEqual((await casa.pide("DELETE", "/cuenta/clave")).cuerpo.account.key, null);
      assert.equal((await casa.pide("GET", "/cuenta", { dueno: "luis" })).cuerpo.account.key, null);
      assert.equal((await casa.pide("POST", "/cuenta/clave", { cuerpo: { key: CLAVE } })).estado, 405);
      assert.equal((await casa.pide("GET", "/cuenta/otra")).estado, 404);
    },
    { sinClave: true },
  );
});

test("una clave se comprueba contra la IA antes de guardarla: la que no sirve no se guarda", async () => {
  const preguntadas: string[] = [];
  let contesta: () => boolean = () => false;
  const comprueba = async (clave: string): Promise<boolean> => {
    preguntadas.push(clave);
    return contesta();
  };
  await conCasa(
    async (casa) => {
      const pone = (key: unknown): ReturnType<Casa["pide"]> => casa.pide("PUT", "/cuenta/clave", { cuerpo: { key } });
      // Lo que no tiene forma de clave no sale de la casa a preguntarle a nadie.
      assert.deepEqual(await pone("corta"), { estado: 400, cuerpo: { error: "bad_key" } });
      assert.deepEqual(preguntadas, []);
      // La IA dice que esa clave no vale, o que no tiene el modelo: no se guarda.
      assert.deepEqual(await pone(CLAVE), { estado: 400, cuerpo: { error: "key_rejected" } });
      assert.deepEqual(preguntadas, [CLAVE]);
      assert.equal((await casa.pide("GET", "/cuenta")).cuerpo.account.key, null);
      // No se llega a la IA: no se da por mala ni por buena, y tampoco se guarda. De por qué falló no sale nada.
      contesta = () => {
        throw new Error(`no se llega con ${CLAVE}`);
      };
      assert.deepEqual(await pone(CLAVE), { estado: 503, cuerpo: { error: "ai_unreachable" } });
      assert.equal((await casa.pide("GET", "/cuenta")).cuerpo.account.key, null);
      assert.ok(!todoLoEscrito(casa.mesa).includes(CLAVE));
      // La que sirve se guarda, cifrada como siempre.
      contesta = () => true;
      const puesta = await pone(CLAVE);
      assert.equal(puesta.estado, 200);
      assert.equal(puesta.cuerpo.account.key.hint, CLAVE.slice(-4));
      assert.ok(!todoLoEscrito(casa.mesa).includes(CLAVE));
    },
    { sinClave: true, comprueba },
  );
});

test("el primer vistazo: sin sesión y con la llave, lo entendido por la puerta 1, y nada en la mesa", async () => {
  let listas = 0;
  const fuentes = (): ReturnType<typeof fuentesInventadas> => {
    const f = fuentesInventadas();
    const lista = f.alojamiento.lista;
    return { ...f, alojamiento: { ...f.alojamiento, lista: (...x) => (listas++, lista(...x)) } };
  };
  await conCasa(
    async (casa) => {
      const pide = (cuerpo: unknown, o: { llave?: string | null; cliente?: string } = {}) =>
        fetch(`${casa.url}/vistazo`, {
          method: "POST",
          headers: {
            ...(o.llave === null ? {} : { authorization: `Bearer ${o.llave ?? LLAVE}` }),
            ...(o.cliente === undefined ? {} : { [CABECERA_DEL_CLIENTE]: o.cliente }),
          },
          body: JSON.stringify(cuerpo),
        }).then(async (r) => ({ estado: r.status, cuerpo: (await r.json()) as Objeto }));
      assert.deepEqual(await pide({ understood: ENTENDIDO }, { llave: null }), {
        estado: 401,
        cuerpo: { error: "unauthorized" },
      });
      assert.equal(listas, 0);
      const r = await pide({ understood: ENTENDIDO });
      assert.equal(r.estado, 200);
      assert.equal(r.cuerpo.cached, false);
      assert.equal(r.cuerpo.look.pasan, 8);
      assert.equal(r.cuerpo.look.desde, 186);
      assert.equal(r.cuerpo.look.vuelos.dias.length, 3);
      // El mismo vistazo otra vez sale de la memoria, sin volver a pedir a la fuente.
      const otra = await pide({ understood: { ...ENTENDIDO, budget: "comfortable" } });
      assert.equal(otra.cuerpo.cached, true);
      assert.equal(listas, 1);
      // Lo que no está claro no busca, y dice qué campo.
      const mal = await pide({ understood: { ...ENTENDIDO, currency: "euros" } });
      assert.deepEqual(mal, { estado: 422, cuerpo: { error: "unclear", fields: ["currency"] } });
      assert.equal((await pide({})).estado, 422);
      const pasado = { ...ENTENDIDO, dates: { ...ENTENDIDO.dates, check_in: "2026-12-01" } };
      assert.equal((await pide({ understood: pasado })).estado, 422);
      const pedidoConGet = await fetch(`${casa.url}/vistazo`, { headers: { authorization: `Bearer ${LLAVE}` } });
      assert.equal(pedidoConGet.status, 405);
      // El tope: dos vistazos nuevos por ventana, y el tercero espera, con lo que falta dicho en segundos.
      const otroGrupo = (adultos: number) => ({
        understood: { ...ENTENDIDO, travellers: { ...ENTENDIDO.travellers, adults: adultos, passports: [] } },
      });
      assert.equal((await pide(otroGrupo(3), { cliente: "cliente-inventado-1" })).estado, 200);
      const frenado = await pide(otroGrupo(4), { cliente: "cliente-inventado-1" });
      assert.equal(frenado.estado, 429);
      assert.equal(frenado.cuerpo.error, "busy");
      assert.ok(frenado.cuerpo.wait > 0);
      assert.equal(listas, 2);
      // Y no se ha guardado nada: ni un viaje, ni lo entendido.
      assert.equal(todoLoEscrito(casa.mesa), "");
    },
    { freno: { porVentana: 2 }, fuentes },
  );
});

test("el primer vistazo, sin fuentes: lo dice con su clave, y nada de por qué", async () => {
  await conCasa(
    async (casa) => {
      const r = await fetch(`${casa.url}/vistazo`, {
        method: "POST",
        headers: { authorization: `Bearer ${LLAVE}` },
        body: JSON.stringify({ understood: ENTENDIDO }),
      });
      assert.equal(r.status, 503);
      assert.deepEqual(await r.json(), { error: "no_sources" });
    },
    {
      fuentes: () => {
        throw new Error("la fuente de alojamiento está apagada en /ruta/secreta");
      },
    },
  );
});

test("lo que ha gastado cada viaje, solo a su dueño, y lo que costará el siguiente cuando ya se sabe", async () => {
  await conCasa(async (casa) => {
    const nada = await casa.pide("GET", "/cuenta/gasto");
    assert.deepEqual(nada, {
      estado: 200,
      cuerpo: { spend: { trips: [], total: { usd: 0, calls: 0, known: true }, next: null } },
    });
    const id = await abre(casa);
    await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: {} });
    await casa.puerta.esperar();
    const { cuerpo } = await casa.pide("GET", "/cuenta/gasto");
    assert.equal(cuerpo.spend.trips.length, 1);
    const viaje = cuerpo.spend.trips[0];
    assert.deepEqual(Object.keys(viaje).sort(), [
      "calls",
      "check_in",
      "check_out",
      "destination",
      "id",
      "known",
      "last",
      "researches",
      "usd",
    ]);
    assert.deepEqual([viaje.id, viaje.calls, viaje.known, viaje.researches], [id, 11, true, 1]);
    assert.ok(Math.abs(viaje.usd - 0.55) < 1e-9);
    assert.equal(typeof viaje.last, "string");
    assert.deepEqual([cuerpo.spend.total.calls, cuerpo.spend.total.known], [11, true]);
    assert.deepEqual(cuerpo.spend.next.from, 1);
    assert.ok(Math.abs(cuerpo.spend.next.usd - 0.55) < 1e-9);
    // Ni la mesa, ni el puesto, ni el asiento.
    const dicho = JSON.stringify(cuerpo);
    for (const callado of [casa.mesa, "route-planner", "trabajos"]) assert.ok(!dicho.includes(callado), callado);
    // A otro, nada de lo de ana; sin sesión, nada de nadie; y solo se lee.
    assert.deepEqual((await casa.pide("GET", "/cuenta/gasto", { dueno: "luis" })).cuerpo.spend.trips, []);
    assert.deepEqual(await casa.pide("GET", "/cuenta/gasto", { dueno: null }), {
      estado: 401,
      cuerpo: { error: "no_session" },
    });
    assert.equal((await casa.pide("PUT", "/cuenta/gasto", { cuerpo: {} })).estado, 405);
    assert.equal((await casa.pide("GET", "/cuenta/gasto/mas")).estado, 404);
  });
});

test("tu confirmación (5.2): la casa espera tu turno, solo tú confirmas, y la investigación sigue sola", async () => {
  const dicho = { wants: "con un gimnasio de verdad. no quiero ruido de noche", booked: "", heard: false, answers: [] };
  const conPalabras = { ...ENTENDIDO, tastes: [], limits: [], said: dicho };
  await conCasa(async (casa) => {
    const id = await abre(casa, "ana", conPalabras);
    // Antes del botón no hay turno que confirmar.
    assert.deepEqual(await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo: {} }), {
      estado: 409,
      cuerpo: { error: "not_now" },
    });
    assert.equal((await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: {} })).estado, 202);
    await casa.puerta.esperar();
    const espera = (await casa.pide("GET", `/viajes/${id}`)).cuerpo;
    assert.equal(espera.trip.state, "researching");
    assert.equal(espera.research.waiting_for_you, true);
    assert.equal(espera.research.stopped, null);
    assert.equal(espera.research.steps[0].state, "yours");
    // Lo demás espera; el del calendario, que corre por detrás, puede estar trabajando o haber acabado ya.
    assert.ok(
      espera.research.steps
        .slice(1)
        .every((p: Objeto) => ["calendar", "papers"].includes(p.id) || p.state === "pending"),
    );
    // Lo que ve: sus palabras y las claves; ni qué es cada cosa ni por qué, que lo escribió el asiento.
    assert.deepEqual(espera.research.heard, {
      round: 1,
      can_answer: false,
      tastes: [{ thing: "gym", weight: "must", quote: "con un gimnasio de verdad" }],
      limits: [{ quote: "no quiero ruido de noche" }],
      booked: [],
      clashes: [],
      questions: [],
    });
    // Otro no lo ve ni lo confirma; y lo que no vale no se apunta.
    assert.equal((await casa.pide("POST", `/viajes/${id}/confirmar`, { dueno: "luis", cuerpo: {} })).estado, 404);
    assert.deepEqual(await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo: { tastes: [{ i: 7 }] } }), {
      estado: 400,
      cuerpo: { error: "bad_tastes" },
    });
    assert.equal((await casa.pide("GET", `/viajes/${id}/confirmar`)).estado, 405);

    const dado = await casa.pide("POST", `/viajes/${id}/confirmar`, {
      cuerpo: { tastes: [{ i: 0, weight: "like" }], limits: [0] },
    });
    assert.deepEqual(dado, { estado: 202, cuerpo: { done: "confirmed" } });
    await casa.puerta.esperar();
    const hecho = (await casa.pide("GET", `/viajes/${id}`)).cuerpo;
    assert.equal(hecho.trip.state, "on_map");
    assert.deepEqual([hecho.research.waiting_for_you, hecho.research.heard], [false, null]);
    // Lo entendido de tu viaje es ya lo confirmado: al volver, se ve lo mismo, y no se pregunta otra vez.
    assert.deepEqual(hecho.understood.tastes, [{ thing: "gym", weight: "like", quote: "con un gimnasio de verdad" }]);
    assert.equal(hecho.understood.said.heard, true);
    assert.deepEqual(await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo: {} }), {
      estado: 409,
      cuerpo: { error: "not_now" },
    });
  });
});

test("los papeles (5.4): si no se pudieron mirar, la casa espera tu decisión, y con ella sigue", async () => {
  await conCasa(
    async (casa) => {
      const id = await abre(casa);
      assert.equal((await casa.pide("POST", `/viajes/${id}/empezar`, { cuerpo: {} })).estado, 202);
      await casa.puerta.esperar();
      const espera = (await casa.pide("GET", `/viajes/${id}`)).cuerpo;
      assert.equal(espera.research.waiting_for_you, true);
      assert.equal(espera.research.stopped, null);
      assert.equal(espera.research.steps.find((p: Objeto) => p.id === "papers").state, "yours");
      // Se buscó a la vez, y lo caro no ha empezado.
      const paso = (id: string): string => espera.research.steps.find((p: Objeto) => p.id === id).state;
      assert.deepEqual(
        [paso("route"), paso("search"), paso("look"), paso("pick")],
        ["done", "done", "pending", "pending"],
      );
      // Lo que se le dice: que faltan, por su clave, sin el porqué de quien lo lleva.
      assert.equal(espera.research.papers.falta, "failed");
      assert.equal(espera.research.papers.sigue, false);
      assert.ok(!JSON.stringify(espera).includes("la IA no contestó"));
      // Solo vale decir que sigue, y nada más.
      for (const cuerpo of [{}, { papers: "yes" }, { papers: "go_on", tastes: [] }])
        assert.deepEqual(await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo }), {
          estado: 400,
          cuerpo: { error: "bad_request" },
        });
      // Nadie más decide por su dueño.
      assert.equal(
        (await casa.pide("POST", `/viajes/${id}/confirmar`, { dueno: "eva", cuerpo: { papers: "go_on" } })).estado,
        404,
      );
      assert.deepEqual(await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo: { papers: "go_on" } }), {
        estado: 202,
        cuerpo: { done: "papers_go_on" },
      });
      await casa.puerta.esperar();
      const hecho = (await casa.pide("GET", `/viajes/${id}`)).cuerpo;
      assert.equal(hecho.trip.state, "on_map");
      const { cuerpo } = await casa.pide("GET", `/viajes/${id}/version`);
      assert.deepEqual([cuerpo.trip.papeles.falta, cuerpo.trip.papeles.sigue], ["failed", true]);
      // Ya no es su turno.
      assert.equal((await casa.pide("POST", `/viajes/${id}/confirmar`, { cuerpo: { papers: "go_on" } })).estado, 409);
    },
    { asientos: { falla: (asiento) => (asiento === "papers" ? "rompe" : null) } },
  );
});
