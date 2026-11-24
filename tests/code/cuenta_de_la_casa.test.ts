// Con qué cuenta piensa cada viaje: la de la casa, solo para los correos de su lista; los demás, con su clave o con
// nada. Y cómo lo enchufa la casa al arrancar, según su entorno. Con asientos de mentira: sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { correosSinCuenta, iaDe } from "../../agent/launcher/arrancar.ts";
import { correosDeLaCasa, registrar } from "../../agent/launcher/cuentas.ts";
import { CABECERA_DE_LA_SESION, puertaALaWeb, type OpcionesDeLaPuerta } from "../../agent/launcher/puerta_a_la_web.ts";
import { fuentesInventadas, lanzadorDeMentira, type Objeto } from "../cases/inventado/asientos.ts";
import { ENTENDIDO } from "../cases/inventado/investigacion.ts";

const LLAVE = "una-llave-larga-e-inventada-para-la-web";
const CLAVE = "clave-de-ia-inventada-0001";
const CONTRASENA = "una contraseña larga";
const DE_LA_CASA = "pm@inventado.example";
const HOY = (): Date => new Date("2027-01-01T00:00:00Z");

type Pide = (
  metodo: string,
  ruta: string,
  sesion: string | null,
  cuerpo?: unknown,
) => Promise<{ estado: number; cuerpo: Objeto }>;

async function conCasa(
  o: { conCasa?: boolean; conClaves?: boolean; correos?: string[] },
  prueba: (c: {
    pide: Pide;
    registra: (correo: string, conClave?: boolean) => Promise<{ estado: number; sesion: string | null }>;
    empieza: (sesion: string) => Promise<{ estado: number; cuerpo: Objeto }>;
    deLaCasa: ReturnType<typeof lanzadorDeMentira>;
    claves: string[];
  }) => Promise<void>,
): Promise<void> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const deLaCasa = lanzadorDeMentira();
  const claves: string[] = [];
  const lanzador: OpcionesDeLaPuerta["lanzador"] = (clave) => {
    claves.push(clave);
    return lanzadorDeMentira();
  };
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: fuentesInventadas,
    hoy: HOY,
    ...(o.conClaves === false ? {} : { lanzador }),
    ...(o.conCasa === false ? {} : { lanzadorDeLaCasa: deLaCasa }),
    correosDeLaCasa: o.correos ?? [DE_LA_CASA],
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as AddressInfo).port}`;
  const pide: Pide = async (metodo, ruta, sesion, cuerpo) => {
    const cabeceras: Record<string, string> = { authorization: `Bearer ${LLAVE}` };
    if (sesion !== null) cabeceras[CABECERA_DE_LA_SESION] = sesion;
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Objeto };
  };
  const registra = async (correo: string, conClave = false): Promise<{ estado: number; sesion: string | null }> => {
    const r = await pide("POST", "/cuentas", null, { email: correo, password: CONTRASENA });
    const sesion = typeof r.cuerpo.session === "string" ? r.cuerpo.session : null;
    if (conClave && sesion !== null)
      assert.equal((await pide("PUT", "/cuenta/clave", sesion, { key: CLAVE })).estado, 200);
    return { estado: r.estado, sesion };
  };
  const empieza = async (sesion: string): Promise<{ estado: number; cuerpo: Objeto }> => {
    const abierto = await pide("POST", "/viajes", sesion, { understood: ENTENDIDO });
    assert.equal(abierto.estado, 201);
    const r = await pide("POST", `/viajes/${abierto.cuerpo.trip.id}/empezar`, sesion, {});
    await puerta.esperar();
    return r;
  };
  try {
    await prueba({ pide, registra, empieza, deLaCasa, claves });
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
}

const conQue = async (pide: Pide, sesion: string): Promise<unknown> =>
  (await pide("GET", "/cuenta", sesion)).cuerpo.account.thinks_with;

test("un correo de la lista piensa con la cuenta de la casa: no le hace falta clave, ni se le descifra", async () => {
  await conCasa({}, async ({ pide, registra, empieza, deLaCasa, claves }) => {
    const { sesion } = await registra(DE_LA_CASA);
    assert.ok(sesion !== null);
    assert.equal(await conQue(pide, sesion), "house");
    const r = await empieza(sesion);
    assert.equal(r.estado, 202);
    assert.ok(deLaCasa.ordenes.length > 0, "pensó con la cuenta de la casa");
    assert.deepEqual(claves, []);
    // Aunque ponga su clave, sigue pensando con la de la casa, y la suya no se descifra.
    assert.equal((await pide("PUT", "/cuenta/clave", sesion, { key: CLAVE })).cuerpo.account.thinks_with, "house");
    assert.equal((await empieza(sesion)).estado, 202);
    assert.deepEqual(claves, []);
    // A la web solo se le dice con qué piensa: nada de la lista ni de la cuenta de la casa.
    const cuenta = (await pide("GET", "/cuenta", sesion)).cuerpo;
    assert.deepEqual(Object.keys(cuenta.account).sort(), ["email", "id", "key", "thinks_with"]);
    assert.deepEqual(Object.keys(cuenta), ["account"]);
  });
});

test("un correo fuera de la lista no usa nunca la cuenta de la casa: con su clave, o con nada", async () => {
  await conCasa({}, async ({ pide, registra, empieza, deLaCasa, claves }) => {
    const sinClave = await registra("otro@inventado.example");
    assert.ok(sinClave.sesion !== null);
    assert.equal(await conQue(pide, sinClave.sesion), null);
    assert.deepEqual(await empieza(sinClave.sesion), { estado: 409, cuerpo: { error: "no_key" } });
    const conClave = await registra("una@inventado.example", true);
    assert.ok(conClave.sesion !== null);
    assert.equal(await conQue(pide, conClave.sesion), "key");
    assert.equal((await empieza(conClave.sesion)).estado, 202);
    assert.deepEqual(claves, [CLAVE]);
    assert.equal(deLaCasa.ordenes.length, 0);
  });
});

test("lo que se parece a un correo de la lista no es de ella: con mayúsculas, espacios o letras raras", async () => {
  await conCasa({}, async ({ pide, registra, empieza, deLaCasa }) => {
    // El de la casa se registra primero; escrito de otra manera es el mismo correo, y no hay otra cuenta para él.
    assert.equal((await registra(DE_LA_CASA)).estado, 201);
    for (const mismo of [" PM@Inventado.Example ", "pm@INVENTADO.example", "\uff50\uff4d@inventado.example"])
      assert.deepEqual(await registra(mismo), { estado: 409, sesion: null }, mismo);
    // Lo que no tiene forma de correo, o lleva lo que no se ve, no abre cuenta.
    for (const malo of ["pm@inventado.example.", "pm\u200b@inventado.example", "pm@inventado.example\u0000"])
      assert.deepEqual(await registra(malo), { estado: 400, sesion: null }, JSON.stringify(malo));
    // Los parecidos que sí son otro correo abren su cuenta, pero no piensan con la de la casa.
    for (const parecido of [
      "pm+1@inventado.example",
      "\u0440m@inventado.example", // con una «р» cirílica delante
      "pm@inventado.examp1e",
      "pm.@inventado.example",
      "xpm@inventado.example",
      "pm@sub.inventado.example",
    ]) {
      const { estado, sesion } = await registra(parecido, true);
      assert.equal(estado, 201, parecido);
      assert.ok(sesion !== null);
      assert.equal(await conQue(pide, sesion), "key", parecido);
      assert.equal((await empieza(sesion)).estado, 202);
    }
    assert.equal(deLaCasa.ordenes.length, 0);
  });
});

test("sin la cuenta de la casa, la lista no da nada; y sin claves, quien no está en ella no tiene IA", async () => {
  await conCasa({ conCasa: false }, async ({ pide, registra, empieza }) => {
    const { sesion } = await registra(DE_LA_CASA);
    assert.ok(sesion !== null);
    assert.equal(await conQue(pide, sesion), null);
    assert.deepEqual(await empieza(sesion), { estado: 409, cuerpo: { error: "no_key" } });
  });
  await conCasa({ conClaves: false }, async ({ pide, registra, empieza, deLaCasa }) => {
    const otro = await registra("otro@inventado.example", true);
    assert.ok(otro.sesion !== null);
    assert.equal(await conQue(pide, otro.sesion), null);
    assert.deepEqual(await empieza(otro.sesion), { estado: 503, cuerpo: { error: "no_ai" } });
    const pm = await registra(DE_LA_CASA);
    assert.ok(pm.sesion !== null);
    assert.equal(await conQue(pide, pm.sesion), "house");
    assert.equal((await empieza(pm.sesion)).estado, 202);
    assert.ok(deLaCasa.ordenes.length > 0);
  });
  // La lista vacía: nadie piensa con la de la casa.
  await conCasa({ correos: [] }, async ({ pide, registra }) => {
    const { sesion } = await registra(DE_LA_CASA);
    assert.ok(sesion !== null);
    assert.equal(await conQue(pide, sesion), null);
  });
});

test("la lista de correos de la casa se lee como se guardan los correos, y lo que no es un correo no arranca", () => {
  assert.deepEqual(correosDeLaCasa(undefined), []);
  assert.deepEqual(correosDeLaCasa(" , "), []);
  assert.deepEqual(correosDeLaCasa(" PM@Inventado.Example, otra@inventado.example ,pm@inventado.example"), [
    "pm@inventado.example",
    "otra@inventado.example",
  ]);
  assert.throws(() => correosDeLaCasa("pm@inventado.example, no es un correo"), /no tiene forma de correo/);
  assert.throws(() => correosDeLaCasa("pm\u200b@inventado.example"), /no tiene forma de correo/);
});

test("la casa avisa de los correos de su lista que aún no tienen cuenta", async () => {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  try {
    const lista = ["pm@inventado.example", "otra@inventado.example"];
    assert.deepEqual(correosSinCuenta(lista, mesa), lista);
    await registrar({ correo: "PM@inventado.example", contrasena: CONTRASENA, mesa });
    assert.deepEqual(correosSinCuenta(lista, mesa), ["otra@inventado.example"]);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
});

test("al arrancar, la casa enchufa lo que diga su entorno: su cuenta, las claves, las dos o ninguna", () => {
  const modelo = { ELDORADO_MODELO: "modelo-inventado" };
  const precio = { ELDORADO_PRECIO_ENTRADA: "4", ELDORADO_PRECIO_SALIDA: "20" };
  const casa = { ELDORADO_CORREOS_DE_LA_CASA: "PM@inventado.example", ELDORADO_TOKEN_DE_CLAUDE: "token-inventado" };
  const enchufado = (ia: ReturnType<typeof iaDe>): string[] => Object.keys(ia).sort();
  // Sin modelo, nada; tampoco con la lista y el token.
  assert.deepEqual(iaDe({}), {});
  assert.deepEqual(iaDe(casa), {});
  // Solo la cuenta de la casa: sin precio, no admite claves.
  const soloCasa = iaDe({ ...modelo, ...casa, ELDORADO_ESFUERZO: "high" });
  assert.deepEqual(enchufado(soloCasa), ["correosDeLaCasa", "lanzadorDeLaCasa"]);
  assert.deepEqual(soloCasa.correosDeLaCasa, ["pm@inventado.example"]);
  // Las dos.
  assert.deepEqual(enchufado(iaDe({ ...modelo, ...casa, ...precio })), [
    "claveQueFunciona",
    "correosDeLaCasa",
    "lanzador",
    "lanzadorDeLaCasa",
  ]);
  // Solo las claves, como hasta ahora: con su precio.
  assert.deepEqual(enchufado(iaDe({ ...modelo, ...precio })), ["claveQueFunciona", "lanzador"]);
  assert.throws(() => iaDe(modelo), /falta el precio de la IA/);
  // Lo que está a medias no arranca: la lista sin token, un precio con una cifra, o un correo que no es correo.
  assert.throws(
    () => iaDe({ ...modelo, ELDORADO_CORREOS_DE_LA_CASA: "pm@inventado.example" }),
    /ELDORADO_TOKEN_DE_CLAUDE/,
  );
  assert.throws(() => iaDe({ ...modelo, ...casa, ELDORADO_TOKEN_DE_CLAUDE: "  " }), /ELDORADO_TOKEN_DE_CLAUDE/);
  // El token de la sesión de Claude Code de la máquina no es el de la casa: con él solo, no hay cuenta de la casa.
  assert.throws(
    () =>
      iaDe({
        ...modelo,
        ELDORADO_CORREOS_DE_LA_CASA: "pm@inventado.example",
        CLAUDE_CODE_OAUTH_TOKEN: "el-de-la-maquina",
      }),
    /ELDORADO_TOKEN_DE_CLAUDE/,
  );
  assert.throws(() => iaDe({ ...modelo, ...casa, ELDORADO_PRECIO_ENTRADA: "4" }), /falta el precio de la IA/);
  assert.throws(() => iaDe({ ...modelo, ...casa, ELDORADO_CORREOS_DE_LA_CASA: "pm" }), /no tiene forma de correo/);
  assert.throws(() => iaDe({ ...modelo, ...casa, ELDORADO_ESFUERZO: "muchísimo" }), /esfuerzo/);
});
