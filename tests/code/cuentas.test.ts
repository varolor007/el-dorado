// Las cuentas: registrarse, entrar, la sesión y la clave de IA, cifrada. Todo inventado, en una mesa temporal.

import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  borrarClave,
  claveDe,
  claveQueVale,
  CONTRASENA,
  correoQueVale,
  DIAS_DE_UNA_SESION,
  entrar,
  FalloDeCuenta,
  guardarClave,
  publica,
  registrar,
  salir,
  secretoDe,
  sesionDe,
} from "../../agent/launcher/cuentas.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const CORREO = "ana@inventado.example";
const BUENA = "una contraseña larga";
const CLAVE = "clave-de-ia-inventada-0001";
const SECRETO = Buffer.alloc(32, 7);

async function conMesa(prueba: (mesa: string) => Promise<void>): Promise<void> {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  try {
    await prueba(mesa);
  } finally {
    rmSync(mesa, { recursive: true, force: true });
  }
}

const falla = (clave: string) => (e: unknown) => e instanceof FalloDeCuenta && e.message === clave;

test("un correo vale si tiene forma de correo, y se compara sin mayúsculas ni espacios alrededor", () => {
  assert.equal(correoQueVale("  Ana@Inventado.Example "), CORREO);
  assert.equal(correoQueVale("ａｎａ@inventado.example"), CORREO);
  for (const malo of [
    "",
    "ana",
    "ana@",
    "@b.c",
    "a@b",
    "a@b.",
    "a@.c",
    "a b@c.d",
    "a@b c.d",
    "a@@b.c",
    7,
    null,
    undefined,
  ])
    assert.equal(correoQueVale(malo), null, String(malo));
  assert.equal(correoQueVale(`${"a".repeat(65)}@b.c`), null);
  // Una letra que no se ve haría otra cuenta con la misma cara.
  assert.equal(correoQueVale("an\u200ba@inventado.example"), null);
});

test("registrarse guarda la cuenta en la mesa, sin la contraseña tal cual, y un correo es una cuenta", async () => {
  await conMesa(async (mesa) => {
    const cuenta = await registrar({
      correo: CORREO,
      contrasena: BUENA,
      mesa,
      cuando: new Date("2031-01-02T10:00:00Z"),
    });
    assert.match(cuenta.id, /^u-[0-9a-f]{32}$/);
    assert.deepEqual([cuenta.correo, cuenta.creada, cuenta.clave], [CORREO, "2031-01-02T10:00:00.000Z", null]);
    assert.deepEqual(publica(cuenta), { id: cuenta.id, email: CORREO, key: null });
    // En la mesa: la cuenta y la huella de su correo. Ni la contraseña ni el correo en un nombre de archivo.
    assert.deepEqual(readdirSync(join(mesa, "cuentas")).sort(), ["por-correo", `${cuenta.id}.json`]);
    const [huella] = readdirSync(join(mesa, "cuentas", "por-correo"));
    assert.match(huella, /^[0-9a-f]{64}$/);
    const escrito = readFileSync(join(mesa, "cuentas", `${cuenta.id}.json`), "utf8");
    assert.ok(!escrito.includes(BUENA));
    assert.equal(cuenta.contrasena.huella.length, 128);
    await assert.rejects(
      registrar({ correo: " ANA@inventado.example", contrasena: "otra contraseña larga", mesa }),
      falla("exists"),
    );
    // Dos cuentas con la misma contraseña no la guardan igual: cada una lleva su sal.
    const otra = await registrar({ correo: "luis@inventado.example", contrasena: BUENA, mesa });
    assert.notEqual(otra.contrasena.huella, cuenta.contrasena.huella);
    assert.notEqual(otra.id, cuenta.id);
  });
  await assert.rejects(registrar({ correo: CORREO, contrasena: BUENA, mesa: join(RAIZ, "mesa") }), /repositorio/);
});

test("una contraseña vale por su largo, y no puede ser el correo", async () => {
  await conMesa(async (mesa) => {
    const con = (contrasena: unknown): Promise<unknown> => registrar({ correo: CORREO, contrasena, mesa });
    for (const mala of [
      "",
      "a".repeat(CONTRASENA.minimo - 1),
      "a".repeat(CONTRASENA.maximo + 1),
      CORREO,
      1234567890123,
      null,
    ])
      await assert.rejects(con(mala), falla("bad_password"), String(mala));
    await assert.rejects(registrar({ correo: "no es un correo", contrasena: BUENA, mesa }), falla("bad_email"));
    // Lo que no valió no dejó nada: el correo sigue libre.
    assert.equal((await registrar({ correo: CORREO, contrasena: "ñ".repeat(CONTRASENA.minimo), mesa })).correo, CORREO);
  });
});

test("entrar abre una sesión con el correo y su contraseña, y si no casan no dice por qué", async () => {
  await conMesa(async (mesa) => {
    const cuenta = await registrar({ correo: CORREO, contrasena: BUENA, mesa });
    const dentro = await entrar({ correo: " Ana@Inventado.example", contrasena: BUENA, mesa });
    assert.equal(dentro?.cuenta.id, cuenta.id);
    assert.match(dentro?.sesion ?? "", /^[A-Za-z0-9_-]{43}$/);
    assert.equal(sesionDe(dentro?.sesion, mesa)?.id, cuenta.id);
    for (const [correo, contrasena] of [
      [CORREO, "otra contraseña larga"],
      [CORREO, BUENA + " "],
      [CORREO, ""],
      ["nadie@inventado.example", BUENA],
      ["no es un correo", BUENA],
      [undefined, undefined],
    ])
      assert.equal(await entrar({ correo, contrasena, mesa }), null);
    // De la sesión se guarda su huella, no su llave: con lo que hay en la mesa no se entra.
    const [archivo] = readdirSync(join(mesa, "sesiones"));
    assert.ok(!archivo.includes(dentro!.sesion));
    assert.equal(sesionDe(archivo.replace(".json", "").slice(0, 43), mesa), null);
    for (const otra of ["", "x", "../" + dentro!.sesion, dentro!.sesion + "x", 7, null])
      assert.equal(sesionDe(otra, mesa), null);
  });
});

test("una sesión caduca, y salir la cierra sin tocar las demás", async () => {
  await conMesa(async (mesa) => {
    await registrar({ correo: CORREO, contrasena: BUENA, mesa });
    const cuando = new Date("2031-01-01T00:00:00Z");
    const una = (await entrar({ correo: CORREO, contrasena: BUENA, mesa, cuando }))!.sesion;
    const otra = (await entrar({ correo: CORREO, contrasena: BUENA, mesa, cuando }))!.sesion;
    assert.notEqual(una, otra);
    const dias = (n: number): Date => new Date(cuando.getTime() + n * 86_400_000);
    assert.ok(sesionDe(una, mesa, dias(DIAS_DE_UNA_SESION - 1)) !== null);
    salir(una, mesa);
    salir(una, mesa);
    salir("no es una sesión", mesa);
    assert.equal(sesionDe(una, mesa, cuando), null);
    assert.ok(sesionDe(otra, mesa, cuando) !== null);
    // Caducada, deja de valer y se borra.
    assert.equal(sesionDe(otra, mesa, dias(DIAS_DE_UNA_SESION)), null);
    assert.deepEqual(
      readdirSync(join(mesa, "sesiones")).filter((x) => x !== "de"),
      [],
    );
    // Y en la lista de sesiones de la cuenta, tampoco queda.
    assert.deepEqual(
      readdirSync(
        join(
          mesa,
          "sesiones",
          "de",
          (await entrar({ correo: CORREO, contrasena: BUENA, mesa, cuando: dias(DIAS_DE_UNA_SESION + 1) }))!.cuenta.id,
        ),
      ).length,
      1,
    );
  });
});

test("la clave de IA se guarda cifrada con el secreto de la casa, y solo se enseña cómo acaba", async () => {
  await conMesa(async (mesa) => {
    const ana = await registrar({ correo: CORREO, contrasena: BUENA, mesa });
    const luis = await registrar({ correo: "luis@inventado.example", contrasena: BUENA, mesa });
    assert.equal(claveDe(ana.id, SECRETO, mesa), null);
    const con = guardarClave(ana.id, CLAVE, SECRETO, mesa, new Date("2031-01-02T10:00:00Z"));
    assert.deepEqual(publica(con).key, { hint: "0001", since: "2031-01-02T10:00:00.000Z" });
    assert.equal(claveDe(ana.id, SECRETO, mesa), CLAVE);
    const archivo = join(mesa, "cuentas", `${ana.id}.json`);
    assert.ok(!readFileSync(archivo, "utf8").includes(CLAVE));
    // Con otro secreto no se descifra; y la clave de una cuenta, copiada a otra, tampoco.
    assert.equal(claveDe(ana.id, Buffer.alloc(32, 8), mesa), null);
    const deLuis = JSON.parse(readFileSync(join(mesa, "cuentas", `${luis.id}.json`), "utf8"));
    writeFileSync(join(mesa, "cuentas", `${luis.id}.json`), JSON.stringify({ ...deLuis, clave: con.clave }));
    assert.equal(claveDe(luis.id, SECRETO, mesa), null);
    // Guardar la misma dos veces no deja lo mismo escrito; una nueva pisa la de antes; y se borra.
    const otraVez = guardarClave(ana.id, CLAVE, SECRETO, mesa);
    assert.notEqual(otraVez.clave?.cifrada, con.clave?.cifrada);
    guardarClave(ana.id, "otra-clave-de-ia-inventada-9999", SECRETO, mesa);
    assert.equal(claveDe(ana.id, SECRETO, mesa), "otra-clave-de-ia-inventada-9999");
    assert.equal(borrarClave(ana.id, mesa).clave, null);
    assert.equal(claveDe(ana.id, SECRETO, mesa), null);
    for (const mala of [
      "",
      "corta",
      "con espacios dentro de la clave",
      "con\nsalto-de-linea-dentro",
      "ñ".repeat(30),
      7,
      null,
    ])
      assert.throws(() => guardarClave(ana.id, mala, SECRETO, mesa), falla("bad_key"), String(mala));
    assert.throws(() => guardarClave("u-" + "0".repeat(32), CLAVE, SECRETO, mesa), falla("no_account"));
    assert.throws(() => guardarClave("../" + ana.id, CLAVE, SECRETO, mesa), falla("no_account"));
    assert.ok(claveQueVale(CLAVE) && !claveQueVale(" " + CLAVE));
  });
});

test("el secreto de la casa son 32 bytes, en hexadecimal o en base64, y sin él no se arranca", () => {
  assert.deepEqual(secretoDe("07".repeat(32)), SECRETO);
  assert.deepEqual(secretoDe(SECRETO.toString("base64")), SECRETO);
  for (const malo of [undefined, "", "corto", "07".repeat(31), "07".repeat(33)])
    assert.throws(() => secretoDe(malo), /32 bytes/, String(malo));
});
