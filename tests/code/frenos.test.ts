// Los frenos de la puerta de la casa: entrar, registrarse, las contraseñas a la vez, las sesiones de una cuenta,
// los viajes de toda la casa, los que escuchan en vivo y comprobar claves. Con la casa escuchando en esta máquina,
// el caso inventado y sin gastar: ninguna IA de verdad.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FRENOS_DE_LA_PUERTA } from "../../agent/data/frenos.ts";
import { abrirSesion, DIAS_DE_UNA_SESION, registrar, sesionDe } from "../../agent/launcher/cuentas.ts";
import { Ocupado, ventanas, turnos } from "../../agent/launcher/frenos.ts";
import {
  CABECERA_DE_LA_SESION,
  CABECERA_DEL_CLIENTE,
  INTENTOS_DE_ENTRAR,
  puertaALaWeb,
  type OpcionesDeLaPuerta,
} from "../../agent/launcher/puerta_a_la_web.ts";
import { fuentesInventadas, lanzadorDeMentira, type Objeto } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";
import { FRENO_DE_LUGARES, frenoDeLugares, quienPide } from "../../web/src/lib/freno.ts";

const LLAVE = "una-llave-larga-e-inventada-para-la-web";
const CONTRASENA = "una contraseña larga";
const correoDe = (nombre: string): string => `${nombre}@inventado.example`;
const HOY = (): Date => new Date("2027-01-01T00:00:00Z");

type Pide = (
  metodo: string,
  ruta: string,
  o?: { cliente?: string; sesion?: string; cuerpo?: unknown },
) => Promise<{ estado: number; cuerpo: Objeto }>;

async function conCasa(
  prueba: (c: { pide: Pide; url: string; comprobadas: string[] }) => Promise<void>,
  o: { frenos?: OpcionesDeLaPuerta["frenos"]; conComprobar?: boolean } = {},
): Promise<void> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-frenos-"));
  const comprobadas: string[] = [];
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: fuentesInventadas,
    hoy: HOY,
    cadaMs: 15,
    lanzador: () => lanzadorDeMentira(),
    ...(o.frenos === undefined ? {} : { frenos: o.frenos }),
    ...(o.conComprobar
      ? {
          claveQueFunciona: async (clave: string) => {
            comprobadas.push(clave);
            return false;
          },
        }
      : {}),
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as AddressInfo).port}`;
  const pide: Pide = async (metodo, ruta, p = {}) => {
    const cabeceras: Record<string, string> = { authorization: `Bearer ${LLAVE}` };
    if (p.cliente !== undefined) cabeceras[CABECERA_DEL_CLIENTE] = p.cliente;
    if (p.sesion !== undefined) cabeceras[CABECERA_DE_LA_SESION] = p.sesion;
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: cabeceras,
      body: p.cuerpo === undefined ? undefined : JSON.stringify(p.cuerpo),
    });
    return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Objeto };
  };
  try {
    await prueba({ pide, url, comprobadas });
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
}

const alta = (pide: Pide, nombre: string, cliente?: string): ReturnType<Pide> =>
  pide("POST", "/cuentas", { cliente, cuerpo: { email: correoDe(nombre), password: CONTRASENA } });
const entra = (pide: Pide, email: string, password: string, cliente?: string): ReturnType<Pide> =>
  pide("POST", "/sesiones", { cliente, cuerpo: { email, password } });

test("el freno de entrar cuenta el correo como se entra: con letras de ancho completo es el mismo", async () => {
  await conCasa(async ({ pide }) => {
    assert.equal((await alta(pide, "ana")).estado, 201);
    // La «a» de ancho completo entra en la misma cuenta.
    const ancha = "ａna@inventado.example";
    assert.equal((await entra(pide, ancha, CONTRASENA, "cliente-de-ana")).estado, 200);
    // Y sus fallos cuentan con los del correo de siempre: no da otros cinco intentos.
    for (let i = 0; i < INTENTOS_DE_ENTRAR.fallos; i++) {
      const email = i % 2 === 0 ? correoDe("ana") : ancha.toUpperCase();
      assert.equal((await entra(pide, email, `mala ${i} larga`, "cliente-malo")).estado, 401);
    }
    const frenado = await entra(pide, ancha, CONTRASENA, "cliente-malo");
    assert.equal(frenado.estado, 429);
    assert.equal(frenado.cuerpo.error, "too_many_attempts");
    assert.ok(frenado.cuerpo.wait > 0);
  });
});

test("quien prueba contraseñas desde un sitio espera; el dueño, desde el suyo, entra", async () => {
  await conCasa(async ({ pide }) => {
    await alta(pide, "ana");
    for (let i = 0; i < INTENTOS_DE_ENTRAR.fallos; i++)
      assert.equal((await entra(pide, correoDe("ana"), `mala ${i} larga`, "cliente-malo")).estado, 401);
    assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-malo")).estado, 429);
    assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-de-ana")).estado, 200);
  });
  // Quien prueba muchos correos desde un mismo sitio también espera, aunque no repita ninguno.
  await conCasa(
    async ({ pide }) => {
      await alta(pide, "luis");
      for (let i = 0; i < 3; i++)
        assert.equal((await entra(pide, correoDe(`nadie${i}`), CONTRASENA, "cliente-rocia")).estado, 401);
      const frenado = await entra(pide, correoDe("luis"), CONTRASENA, "cliente-rocia");
      assert.deepEqual([frenado.estado, frenado.cuerpo.error], [429, "too_many_attempts"]);
      assert.equal((await entra(pide, correoDe("luis"), CONTRASENA, "cliente-de-luis")).estado, 200);
    },
    { frenos: { fallos: { porCliente: 3 } } },
  );
});

test("si con un correo se falla desde muchos sitios, espera quien no entró antes desde el suyo", async () => {
  await conCasa(
    async ({ pide }) => {
      await alta(pide, "ana");
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-de-ana")).estado, 200);
      for (let i = 0; i < 4; i++)
        assert.equal((await entra(pide, correoDe("ana"), "mala pero larga", `cliente-${i}-malo`)).estado, 401);
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-nuevo")).estado, 429);
      // Desde donde ya entró, su dueño sigue entrando.
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-de-ana")).estado, 200);
    },
    { frenos: { fallos: { porCorreo: 4 } } },
  );
});

test("llenar la memoria del freno con correos inventados no le quita el freno a una cuenta de verdad", async () => {
  await conCasa(
    async ({ pide }) => {
      await alta(pide, "ana");
      for (let i = 0; i < INTENTOS_DE_ENTRAR.fallos; i++)
        await entra(pide, correoDe("ana"), `mala ${i} larga`, "cliente-malo");
      for (let i = 0; i < 12; i++) await entra(pide, correoDe(`inventado${i}`), CONTRASENA, `cliente-${i}-otro`);
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-malo")).estado, 429);
    },
    { frenos: { enMemoria: 4 } },
  );
});

test("la memoria de un freno, al llenarse, quita lo caducado y lo más viejo que no frena, nunca todo", () => {
  let ahora = Date.parse("2027-01-01T00:00:00Z");
  const v = ventanas(2, 10, () => new Date(ahora), 3);
  v.apunta("frenada");
  v.apunta("frenada");
  assert.ok(v.espera("frenada") > 0);
  for (let i = 0; i < 20; i++) v.apunta(`otra-${i}`);
  assert.ok(v.cuantas() <= 3);
  assert.ok(v.espera("frenada") > 0);
  // Pasada la ventana, lo caducado se va solo.
  ahora += 10 * 60_000;
  assert.equal(v.espera("frenada"), 0);
  v.apunta("nueva");
  assert.equal(v.cuantas() <= 3, true);
});

test("registrarse tiene freno por cliente y en toda la casa, y la casa tiene un tope de cuentas", async () => {
  await conCasa(
    async ({ pide }) => {
      assert.equal((await alta(pide, "ana", "cliente-uno")).estado, 201);
      assert.equal((await alta(pide, "luis", "cliente-uno")).estado, 201);
      const frenado = await alta(pide, "eva", "cliente-uno");
      assert.deepEqual([frenado.estado, frenado.cuerpo.error], [429, "too_many_attempts"]);
      assert.equal((await alta(pide, "eva", "cliente-dos")).estado, 201);
      const casa = await alta(pide, "rosa", "cliente-tres");
      assert.deepEqual([casa.estado, casa.cuerpo.error], [503, "busy"]);
      assert.ok(casa.cuerpo.wait > 0);
    },
    { frenos: { registros: { porCliente: 2, enLaCasa: 3 } } },
  );
  await conCasa(
    async ({ pide }) => {
      assert.equal((await alta(pide, "ana")).estado, 201);
      assert.equal((await alta(pide, "luis")).estado, 201);
      assert.deepEqual(await alta(pide, "eva"), { estado: 503, cuerpo: { error: "house_full" } });
    },
    { frenos: { cuentasDeLaCasa: 2 } },
  );
});

test("cada intento de entrar o registrarse cuenta para su cliente, salga bien o mal", async () => {
  await conCasa(
    async ({ pide }) => {
      await alta(pide, "ana", "cliente-uno");
      for (let i = 0; i < 2; i++)
        assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-uno")).estado, 200);
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-uno")).estado, 429);
      assert.equal((await entra(pide, correoDe("ana"), CONTRASENA, "cliente-dos")).estado, 200);
    },
    { frenos: { intentos: { porCliente: 3 } } },
  );
});

test("las contraseñas se pasan unas pocas a la vez: si la cola está llena, ocupado", async () => {
  await conCasa(
    async ({ pide }) => {
      await alta(pide, "ana");
      const a_la_vez = await Promise.all(
        [0, 1, 2, 3, 4, 5].map((i) => entra(pide, correoDe("ana"), CONTRASENA, `cliente-${i}-ana`)),
      );
      const estados = a_la_vez.map((r) => r.estado);
      assert.ok(estados.includes(200), estados.join(","));
      assert.ok(estados.includes(503), estados.join(","));
      for (const r of a_la_vez.filter((x) => x.estado === 503)) assert.equal(r.cuerpo.error, "busy");
    },
    { frenos: { contrasenas: { aLaVez: 1, enCola: 0 } } },
  );
});

test("los turnos dejan hacer unos pocos a la vez, ponen en cola a los siguientes y al resto, ocupado", async () => {
  const turno = turnos(1, 1, 5);
  let suelta = (): void => {};
  const primero = turno(() => new Promise<string>((r) => (suelta = () => r("primero"))));
  const segundo = turno(async () => "segundo");
  await assert.rejects(
    turno(async () => "tercero"),
    (e: unknown) => e instanceof Ocupado && e.espera === 5,
  );
  suelta();
  assert.deepEqual(await Promise.all([primero, segundo]), ["primero", "segundo"]);
  assert.equal(await turno(async () => "otra vez"), "otra vez");
});

test("una cuenta no tiene más sesiones abiertas que su tope: al abrir una de más, se cierra la más vieja", async () => {
  await conCasa(
    async ({ pide }) => {
      const primera = (await alta(pide, "ana")).cuerpo.session as string;
      const segunda = (await entra(pide, correoDe("ana"), CONTRASENA)).cuerpo.session as string;
      const tercera = (await entra(pide, correoDe("ana"), CONTRASENA)).cuerpo.session as string;
      assert.deepEqual(await pide("GET", "/cuenta", { sesion: primera }), {
        estado: 401,
        cuerpo: { error: "no_session" },
      });
      assert.equal((await pide("GET", "/cuenta", { sesion: segunda })).estado, 200);
      assert.equal((await pide("GET", "/cuenta", { sesion: tercera })).estado, 200);
    },
    { frenos: { sesionesDeUnaCuenta: 2 } },
  );
});

test("al abrir una sesión, las caducadas de esa cuenta se quitan y no cuentan para su tope", async () => {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-frenos-"));
  try {
    const cuenta = await registrar({ correo: correoDe("ana"), contrasena: CONTRASENA, mesa });
    const antes = new Date("2027-01-01T00:00:00Z");
    const despues = new Date(antes.getTime() + (DIAS_DE_UNA_SESION + 1) * 86_400_000);
    const viejas = [abrirSesion(cuenta, mesa, antes, 2), abrirSesion(cuenta, mesa, antes, 2)];
    const nuevas = [abrirSesion(cuenta, mesa, despues, 2), abrirSesion(cuenta, mesa, despues, 2)];
    for (const s of viejas) assert.equal(sesionDe(s, mesa, antes), null);
    for (const s of nuevas) assert.equal(sesionDe(s, mesa, despues)?.id, cuenta.id);
    assert.equal(readdirSync(join(mesa, "sesiones", "de", cuenta.id)).length, 2);
    assert.equal(readdirSync(join(mesa, "sesiones")).filter((x) => x.endsWith(".json")).length, 2);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("en toda la casa caben los viajes que caben, además de los de cada dueño", async () => {
  await conCasa(
    async ({ pide }) => {
      const ana = (await alta(pide, "ana")).cuerpo.session as string;
      const luis = (await alta(pide, "luis")).cuerpo.session as string;
      const abre = (sesion: string): ReturnType<Pide> =>
        pide("POST", "/viajes", { sesion, cuerpo: { understood: ENTENDIDO } });
      assert.equal((await abre(ana)).estado, 201);
      assert.equal((await abre(luis)).estado, 201);
      assert.deepEqual(await abre(luis), { estado: 503, cuerpo: { error: "house_full" } });
    },
    { frenos: { viajes: { enLaCasa: 2 } } },
  );
});

test("escuchar en vivo tiene tope por viaje, por cuenta y en toda la casa", async () => {
  await conCasa(
    async ({ pide, url }) => {
      const ana = (await alta(pide, "ana")).cuerpo.session as string;
      const luis = (await alta(pide, "luis")).cuerpo.session as string;
      const abre = async (sesion: string): Promise<string> =>
        (await pide("POST", "/viajes", { sesion, cuerpo: { understood: ENTENDIDO } })).cuerpo.trip.id as string;
      const [uno, dos] = [await abre(ana), await abre(ana)];
      const tres = await abre(luis);
      const abiertos: ReadableStreamDefaultReader[] = [];
      const escucha = async (sesion: string, id: string): Promise<number> => {
        const r = await fetch(`${url}/viajes/${id}/eventos`, {
          headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: sesion },
        });
        if (r.status === 200) abiertos.push(r.body!.getReader());
        else await r.body?.cancel();
        return r.status;
      };
      try {
        assert.equal(await escucha(ana, uno), 200);
        assert.equal(await escucha(ana, dos), 200);
        // Ana ya escucha todo lo que puede, aunque sea a otro viaje suyo.
        assert.equal(await escucha(ana, dos), 429);
        assert.equal(await escucha(luis, tres), 200);
        // Y la casa entera está llena: tampoco Luis abre otro.
        assert.equal(await escucha(luis, tres), 429);
      } finally {
        for (const lector of abiertos) await lector.cancel();
      }
    },
    { frenos: { oyentes: { deUnaCuenta: 2, enLaCasa: 3 } } },
  );
});

test("comprobar una clave de IA tiene freno por cuenta: la puerta no sirve para probar claves", async () => {
  await conCasa(
    async ({ pide, comprobadas }) => {
      const ana = (await alta(pide, "ana")).cuerpo.session as string;
      const pon = (n: number): ReturnType<Pide> =>
        pide("PUT", "/cuenta/clave", { sesion: ana, cuerpo: { key: `clave-de-ia-inventada-${n}000` } });
      assert.deepEqual(await pon(1), { estado: 400, cuerpo: { error: "key_rejected" } });
      assert.deepEqual(await pon(2), { estado: 400, cuerpo: { error: "key_rejected" } });
      const frenado = await pon(3);
      assert.deepEqual([frenado.estado, frenado.cuerpo.error], [429, "too_many_attempts"]);
      assert.equal(comprobadas.length, 2);
    },
    { conComprobar: true, frenos: { claves: { porCuenta: 2 } } },
  );
});

test("los números de los frenos están en los datos, y son los de partida", () => {
  assert.equal(INTENTOS_DE_ENTRAR.fallos, FRENOS_DE_LA_PUERTA.fallos.porCorreoYCliente);
  for (const n of [
    FRENOS_DE_LA_PUERTA.fallos.porCorreo,
    FRENOS_DE_LA_PUERTA.registros.enLaCasa,
    FRENOS_DE_LA_PUERTA.contrasenas.aLaVez,
    FRENOS_DE_LA_PUERTA.oyentes.enLaCasa,
    FRENOS_DE_LA_PUERTA.claves.porCuenta,
  ])
    assert.ok(Number.isInteger(n) && n > 0);
  assert.ok(FRENOS_DE_LA_PUERTA.fallos.porCorreo > FRENOS_DE_LA_PUERTA.fallos.porCorreoYCliente);
  assert.ok(FRENOS_DE_LA_PUERTA.oyentes.deUnaCuenta >= FRENOS_DE_LA_PUERTA.oyentes.deUnViaje);
});

test("el buscador de lugares de la web tiene freno por cliente y en toda la web", async () => {
  let ahora = 0;
  const f = frenoDeLugares({ porCliente: 2, enLaWeb: 3, segundosDeVentana: 60 }, () => ahora);
  assert.deepEqual([f.pasa("203.0.113.7"), f.pasa("203.0.113.7")], [0, 0]);
  assert.ok(f.pasa("203.0.113.7") > 0);
  assert.equal(f.pasa("203.0.113.8"), 0);
  assert.ok(f.pasa("203.0.113.9") > 0);
  ahora += 60_000;
  assert.equal(f.pasa("203.0.113.7"), 0);
  assert.equal(quienPide("203.0.113.7, 10.0.0.1"), "203.0.113.7");
  assert.equal(quienPide(""), null);
  assert.equal(quienPide(null), null);

  // Y la pasarela de la web lo usa: pasado su tope, contesta que espere sin llegar al buscador.
  const { GET } = await import("../../web/src/app/api/places/route.ts");
  const deVerdad = globalThis.fetch;
  let alBuscador = 0;
  globalThis.fetch = (async () => {
    alBuscador += 1;
    return Response.json({ features: [] });
  }) as typeof fetch;
  try {
    const pide = (ip: string): Promise<Response> =>
      GET(new Request("http://web/api/places?q=lugar", { headers: { "x-forwarded-for": ip } }));
    for (let i = 0; i < FRENO_DE_LUGARES.porCliente; i++) assert.equal((await pide("198.51.100.1")).status, 200);
    const frenado = await pide("198.51.100.1");
    assert.equal(frenado.status, 429);
    const dicho = (await frenado.json()) as Objeto;
    assert.deepEqual([dicho.lugares, dicho.origen, dicho.error], [[], null, "busy"]);
    assert.ok(dicho.wait > 0 && dicho.wait <= FRENO_DE_LUGARES.segundosDeVentana);
    assert.equal((await pide("198.51.100.2")).status, 200);
    assert.equal(alBuscador, FRENO_DE_LUGARES.porCliente + 1);
  } finally {
    globalThis.fetch = deVerdad;
  }
});
