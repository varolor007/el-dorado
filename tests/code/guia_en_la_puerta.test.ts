// La guía vista desde la web (12.2): «Quiero mi guía» por la puerta de la casa, cómo está y su documento, solo para
// su dueño y solo con el viaje cerrado. Con la casa escuchando en esta máquina y un asiento de mentira: sin gastar.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CABECERA_DE_LA_SESION, puertaALaWeb } from "../../agent/launcher/puerta_a_la_web.ts";
import { pasar } from "../../agent/launcher/mesa.ts";
import { fuentesInventadas, type Objeto } from "../cases/inventado/asientos.ts";
import { HOY, lanzadorDeLaGuia, viajeCerradoEnLaMesa } from "../cases/inventado/guia.ts";

const LLAVE = "una-llave-larga-e-inventada-para-la-web";

test("la guía, por la puerta: solo con el viaje cerrado, solo su dueño, y su documento cuando sale", async () => {
  const mesa = mkdtempSync(join(tmpdir(), "el-dorado-mesa-"));
  const lanzador = lanzadorDeLaGuia();
  const puerta = puertaALaWeb({
    mesa,
    llave: LLAVE,
    secreto: Buffer.alloc(32, 7),
    fuentes: fuentesInventadas,
    hoy: () => HOY,
    lanzador: () => lanzador,
    alLlevarLaGuia: { sinFotos: true },
  });
  await new Promise<void>((r) => puerta.servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(puerta.servidor.address() as AddressInfo).port}`;
  const pide = async (metodo: string, ruta: string, sesion: string, cuerpo?: unknown) => {
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${LLAVE}`, [CABECERA_DE_LA_SESION]: sesion },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    return { estado: r.status, cuerpo: (await r.json()) as Objeto };
  };
  const cuenta = async (nombre: string): Promise<{ sesion: string; id: string }> => {
    const r = await fetch(`${url}/cuentas`, {
      method: "POST",
      headers: { authorization: `Bearer ${LLAVE}` },
      body: JSON.stringify({ email: `${nombre}@inventado.example`, password: "una contraseña larga" }),
    });
    const dicho = (await r.json()) as { session: string; account: { id: string } };
    await pide("PUT", "/cuenta/clave", dicho.session, { key: "clave-de-ia-inventada-0001" });
    return { sesion: dicho.session, id: dicho.account.id };
  };
  try {
    const ana = await cuenta("ana");
    const otro = await cuenta("otro");
    const { v } = viajeCerradoEnLaMesa({ dueno: ana.id, mesa });
    const ruta = `/viajes/${v.ficha.id}/guia`;

    // Sin guía todavía; y para otro, el viaje no existe.
    assert.deepEqual((await pide("GET", ruta, ana.sesion)).cuerpo, { guide: null });
    assert.equal((await pide("GET", ruta, otro.sesion)).estado, 404);
    assert.equal((await pide("POST", ruta, otro.sesion, { way: "best_value" })).estado, 404);
    // Con más de una manera, hay que decir cuál; una que no es, tampoco.
    assert.equal((await pide("POST", ruta, ana.sesion, {})).cuerpo.error, "which_way");
    assert.equal((await pide("POST", ruta, ana.sesion, { way: "<x>" })).cuerpo.error, "bad_way");
    assert.equal((await pide("GET", `${ruta}/documento`, ana.sesion)).estado, 404);

    const pedida = await pide("POST", ruta, ana.sesion, { way: "best_value" });
    assert.equal(pedida.estado, 202);
    assert.deepEqual(pedida.cuerpo, { guide: 1 });
    await puerta.esperar();
    const lista = (await pide("GET", ruta, ana.sesion)).cuerpo.guide as Objeto;
    assert.equal(lista.state, "ready");
    assert.equal(lista.version, 1);
    assert.equal(lista.behind, false);
    const doc = await pide("GET", `${ruta}/documento`, ana.sesion);
    assert.equal(doc.estado, 200);
    assert.match(String(doc.cuerpo.html), /^<!doctype html>/);
    assert.equal((await pide("GET", `${ruta}/documento`, otro.sesion)).estado, 404);
    // Lo que sale no lleva ni rutas del disco ni el porqué de nada.
    assert.doesNotMatch(JSON.stringify(lista), /el-dorado-mesa|puestos|rojos/);

    // Pedir guías gasta: de un viaje se piden unas pocas al día, y la que pasa del tope no lanza a nadie.
    for (const n of [2, 3]) {
      assert.deepEqual((await pide("POST", ruta, ana.sesion, { way: "best_value" })).cuerpo, { guide: n });
      await puerta.esperar();
    }
    const lanzadas = lanzador.veces;
    const demas = await pide("POST", ruta, ana.sesion, { way: "best_value" });
    assert.equal(demas.estado, 429);
    assert.equal(demas.cuerpo.error, "too_many_guides");
    await puerta.esperar();
    assert.equal(lanzador.veces, lanzadas);

    // Con el viaje abierto otra vez, no se pide guía.
    pasar(v, "researching", HOY);
    assert.equal((await pide("POST", ruta, ana.sesion, { way: "best_value" })).cuerpo.error, "not_closed");
  } finally {
    await puerta.esperar();
    await puerta.cerrar();
    rmSync(mesa, { recursive: true, force: true });
  }
});
