// La puerta de la casa a la web: lo único que la web puede pedir. La web entra con su llave y dice de quién es cada
// petición; la casa solo da cada viaje a su dueño, y cuenta en vivo lo que pasa mientras se investiga.
//
// Lo que sale por aquí lo lee un viajero: van claves y números, nunca el porqué de un rojo, ni el nombre de un
// asiento, ni una ruta del disco. La clave de IA del viajero entra con su botón y vive solo en la memoria de esta
// casa mientras investiga: no se escribe en ningún sitio.
//
//   GET  /salud                      sin llave: que la casa está
//   GET  /viajes                     los viajes del dueño
//   POST /viajes                     abre un viaje con lo entendido hasta ahora
//   GET  /viajes/<id>                cómo está, y por dónde va su investigación
//   PUT  /viajes/<id>/entendido      cambia lo entendido, mientras no esté confirmado
//   POST /viajes/<id>/empezar        el botón: confirma, da el adelante con su techo y lanza la investigación
//   GET  /viajes/<id>/eventos        lo que pasa, en vivo (sucesos del servidor)
//   GET  /viajes/<id>/version[/<n>]  el viaje que se enseña, o una versión de antes

import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { PARADO, PASOS } from "../data/pasos.ts";
import { puertaEntendido } from "../gates/puerta_entendido.ts";
import type { Lanzador } from "./asiento.ts";
import { adelanteDe, darElAdelante, llevar, type AlLlevar } from "./casa.ts";
import { pararRun, type Fuentes } from "./investigar.ts";
import {
  abrirViaje,
  apuntar,
  cambiarLoEntendido,
  leerVersion,
  leerViaje,
  nuevoRun,
  pasar,
  ultimoRun,
  viajesDe,
  type ViajeEnLaMesa,
} from "./mesa.ts";
import { porDondeVa } from "./pasos.ts";
import { gastoDe, trabajosDe } from "./trabajos.ts";
import { leerVivo } from "./vivo.ts";

/** Lo más que pesa lo que manda la web en una petición, los viajes que puede tener un dueño y los que le escuchan. */
export const PESO_DE_UNA_PETICION = 64 * 1024;
export const VIAJES_DE_UN_DUENO = 200;
export const OYENTES_DE_UN_VIAJE = 8;
/** La cabecera donde la web dice de quién es la petición. */
export const CABECERA_DEL_DUENO = "x-eldorado-owner";

export type OpcionesDeLaPuerta = {
  mesa: string;
  /** La llave con la que entra la web. Larga: no es una contraseña de persona. */
  llave: string;
  fuentes: () => Fuentes;
  /** Quien piensa en los asientos, para la clave de IA de un viajero. Sin él, el botón dice que no hay IA. */
  lanzador?: (clave: string) => Lanzador;
  hoy?: () => Date;
  alLlevar?: AlLlevar;
  /** Cada cuánto mira la casa si hay algo nuevo que contar a quien escucha, y cada cuánto le da señal de vida. */
  cadaMs?: number;
  latidoMs?: number;
};

export type Puerta = {
  servidor: Server;
  /** Los viajes que se están investigando ahora mismo en esta casa. */
  enMarcha: () => string[];
  /** Espera a que acaben las investigaciones en marcha: para las pruebas y para apagar con orden. */
  esperar: () => Promise<void>;
  cerrar: () => Promise<void>;
};

type Peticion = { metodo: string; partes: string[]; consulta: URLSearchParams; dueno: string; cuerpo: unknown };
type Respuesta = { estado: number; cuerpo: unknown };

class Fallo extends Error {
  estado: number;
  mas: Record<string, unknown>;
  constructor(estado: number, clave: string, mas: Record<string, unknown> = {}) {
    super(clave);
    this.estado = estado;
    this.mas = mas;
  }
}

const NO_HAY = (): Fallo => new Fallo(404, "not_found");
const objeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function leerJson(ruta: string): Record<string, unknown> | null {
  try {
    const leido: unknown = JSON.parse(readFileSync(ruta, "utf8"));
    return objeto(leido) ? leido : null;
  } catch {
    return null;
  }
}

/** Lo que se dice de un viaje en una lista: quién es, cómo está y a dónde va. */
function resumen(v: ViajeEnLaMesa): Record<string, unknown> {
  const e = leerJson(join(v.carpeta, "entendido.json"));
  const destino = objeto(e?.destination) ? e.destination : {};
  const fechas = objeto(e?.dates) ? e.dates : {};
  const texto = (x: unknown): string | null => (typeof x === "string" ? x.slice(0, 200) : null);
  return {
    id: v.ficha.id,
    state: v.ficha.estado,
    version: v.ficha.version,
    versions: v.ficha.versiones.map((x) => ({ n: x.n, when: x.cuando })),
    created: v.ficha.creado,
    changed: v.ficha.cambiado,
    destination: texto(destino.name),
    country: texto(destino.country),
    check_in: texto(fechas.check_in),
    check_out: texto(fechas.check_out),
  };
}

/** A qué paso de la investigación pertenece un asiento: al viajero se le dice el paso, nunca el asiento. */
const pasoDelAsiento = (asiento: string): string => PASOS.find((p) => p.quien === asiento)?.id ?? "other";

/** Cómo está un viaje y por dónde va su investigación, dicho para la web. */
function estadoDe(v: ViajeEnLaMesa, enMarcha: boolean): Record<string, unknown> {
  const run = ultimoRun(v);
  if (run === null) return { trip: resumen(v), research: null };
  const gasto = gastoDe(run);
  return {
    trip: resumen(v),
    research: {
      running: enMarcha,
      steps: porDondeVa(run).map((p) => ({ id: p.id, state: p.estado, waiting: p.esperan.length })),
      jobs: trabajosDe(run).map((t) => ({
        step: pasoDelAsiento(t.asiento),
        state: t.estado,
        usd: t.gasto?.usd ?? null,
      })),
      spent: { usd: gasto.usd, turns: gasto.turnos, known: gasto.sabido },
      ceiling: adelanteDe(run)?.techo ?? null,
      stopped: existsSync(join(run, PARADO))
        ? { at: (leerJson(join(run, PARADO))?.en as string | undefined) ?? null }
        : null,
      told: leerVivo(run).length,
    },
  };
}

/** Lo que se contó, sin la hora de reloj: a la web le basta el orden y los milisegundos desde el principio. */
function contado(run: string, desde: number): unknown[] {
  return leerVivo(run, desde).map((s) => {
    const { cuando: _cuando, ...suceso } = s as typeof s & { cuando?: string };
    return suceso;
  });
}

export function puertaALaWeb(o: OpcionesDeLaPuerta): Puerta {
  if (o.llave.length < 24) throw new Error("la llave de la web es demasiado corta");
  const llave = Buffer.from(o.llave);
  const hoy = o.hoy ?? ((): Date => new Date());
  const marchas = new Map<string, Promise<void>>();
  const oyentes = new Map<string, number>();
  const abiertos = new Set<ServerResponse>();

  const conLlave = (req: IncomingMessage): boolean => {
    const dada = Buffer.from(/^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "");
    return dada.length === llave.length && timingSafeEqual(dada, llave);
  };

  // Un viaje que no es del dueño, o que no existe, es lo mismo para quien pregunta: no hay tal viaje.
  const suViaje = (p: Peticion): ViajeEnLaMesa => {
    try {
      return leerViaje(p.partes[1] ?? "", p.dueno, o.mesa);
    } catch {
      throw NO_HAY();
    }
  };

  function empezar(p: Peticion): Respuesta {
    const v = suViaje(p);
    const id = v.ficha.id;
    if (marchas.has(id)) throw new Fallo(409, "already_running");
    if (o.lanzador === undefined) throw new Fallo(503, "no_ai");
    const pedido = objeto(p.cuerpo) ? p.cuerpo : {};
    const techo = pedido.ceiling;
    const clave = pedido.key;
    if (typeof techo !== "number" || !Number.isFinite(techo) || techo <= 0) throw new Fallo(400, "bad_ceiling");
    if (typeof clave !== "string" || clave.length < 8 || clave.length > 400 || /\s/.test(clave))
      throw new Fallo(400, "bad_key");
    // Lo entendido se mira antes de confirmar nada: dice qué campo no está claro, no con qué palabras.
    const claro = puertaEntendido(leerJson(join(v.carpeta, "entendido.json")), {
      hoy: hoy().toISOString().slice(0, 10),
    });
    if (!claro.verde) throw new Fallo(422, "unclear", { fields: [...new Set(claro.rojos.map((r) => r.donde))] });
    let run: string;
    try {
      if (v.ficha.estado === "started") pasar(v, "confirmed", hoy());
      run = nuevoRun(v, hoy());
    } catch {
      throw new Fallo(409, "not_now");
    }
    darElAdelante(run, techo, hoy());
    apuntar(v, "button", { boton: "start", techo }, hoy());
    const marcha = llevar(run, o.fuentes(), o.lanzador(clave), o.alLlevar)
      .then(() => undefined)
      .catch(() => {
        // Si la casa se rompe a medias, el run no se queda colgado: queda parado, y se cuenta.
        const donde = porDondeVa(run).find((x) => x.estado !== "done")?.id ?? "trip";
        if (!existsSync(join(run, PARADO)))
          pararRun(run, donde, "la casa", [{ donde: "house", que: "la casa se rompió mientras investigaba" }]);
      })
      .finally(() => marchas.delete(id));
    marchas.set(id, marcha);
    return { estado: 202, cuerpo: { run: v.ficha.runs.length } };
  }

  function atender(p: Peticion): Respuesta {
    const [raiz, id, que, cual] = p.partes;
    if (raiz !== "viajes" || p.partes.length > 4) throw NO_HAY();
    if (id === undefined) {
      if (p.metodo === "GET") return { estado: 200, cuerpo: { trips: listar(p.dueno) } };
      if (p.metodo === "POST") {
        if (!objeto(p.cuerpo) || !objeto(p.cuerpo.understood)) throw new Fallo(400, "bad_request");
        if (viajesDe(p.dueno, o.mesa).length >= VIAJES_DE_UN_DUENO) throw new Fallo(429, "too_many_trips");
        const v = abrirViaje({ dueno: p.dueno, entendido: p.cuerpo.understood, mesa: o.mesa, cuando: hoy() });
        return { estado: 201, cuerpo: { trip: resumen(v) } };
      }
      throw new Fallo(405, "method");
    }
    if (que === undefined) {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const v = suViaje(p);
      return { estado: 200, cuerpo: estadoDe(v, marchas.has(v.ficha.id)) };
    }
    if (que === "entendido" && cual === undefined) {
      if (p.metodo !== "PUT") throw new Fallo(405, "method");
      if (!objeto(p.cuerpo) || !objeto(p.cuerpo.understood)) throw new Fallo(400, "bad_request");
      const v = suViaje(p);
      if (v.ficha.estado !== "started") throw new Fallo(409, "not_now");
      cambiarLoEntendido(v, p.cuerpo.understood, hoy());
      return { estado: 200, cuerpo: { trip: resumen(v) } };
    }
    if (que === "empezar" && cual === undefined) {
      if (p.metodo !== "POST") throw new Fallo(405, "method");
      return empezar(p);
    }
    if (que === "version") {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const v = suViaje(p);
      const n = cual === undefined ? v.ficha.version : /^[1-9]\d{0,5}$/.test(cual) ? Number(cual) : Number.NaN;
      const version = Number.isNaN(n) ? null : leerVersion(v, n);
      if (version === null) throw NO_HAY();
      return { estado: 200, cuerpo: { n, trip: version.viaje, events: version.sucesos } };
    }
    throw NO_HAY();
  }

  function listar(dueno: string): unknown[] {
    return viajesDe(dueno, o.mesa).flatMap((ficha) => {
      try {
        return [resumen(leerViaje(ficha.id, dueno, o.mesa))];
      } catch {
        return [];
      }
    });
  }

  /** Lo que pasa en un viaje, en vivo: su estado cuando cambia y lo nuevo que se haya contado. */
  function escuchar(p: Peticion, req: IncomingMessage, res: ServerResponse): void {
    const v = suViaje(p);
    const id = v.ficha.id;
    if ((oyentes.get(id) ?? 0) >= OYENTES_DE_UN_VIAJE) throw new Fallo(429, "too_many_listeners");
    oyentes.set(id, (oyentes.get(id) ?? 0) + 1);
    abiertos.add(res);
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    const pedido = Number(p.consulta.get("desde") ?? "0");
    let enviados = Number.isInteger(pedido) && pedido >= 0 ? pedido : 0;
    let ultimo = "";
    const mira = (): void => {
      let ahora: ViajeEnLaMesa;
      try {
        ahora = leerViaje(id, p.dueno, o.mesa);
      } catch {
        return;
      }
      const run = ultimoRun(ahora);
      const nuevos = run === null ? [] : contado(run, enviados);
      const estado = JSON.stringify(estadoDe(ahora, marchas.has(id)));
      if (estado === ultimo && nuevos.length === 0) return;
      ultimo = estado;
      res.write(`event: state\ndata: ${JSON.stringify({ ...JSON.parse(estado), from: enviados, events: nuevos })}\n\n`);
      enviados += nuevos.length;
    };
    mira();
    const reloj = setInterval(mira, o.cadaMs ?? 500);
    const latido = setInterval(() => res.write(": vivo\n\n"), o.latidoMs ?? 15_000);
    const soltar = (): void => {
      clearInterval(reloj);
      clearInterval(latido);
      if (abiertos.delete(res)) oyentes.set(id, Math.max(0, (oyentes.get(id) ?? 1) - 1));
    };
    req.on("close", soltar);
    res.on("close", soltar);
  }

  async function cuerpoDe(req: IncomingMessage): Promise<unknown> {
    if (req.method === "GET") return null;
    const trozos: Buffer[] = [];
    let peso = 0;
    for await (const trozo of req) {
      peso += (trozo as Buffer).length;
      if (peso > PESO_DE_UNA_PETICION) throw new Fallo(413, "too_large");
      trozos.push(trozo as Buffer);
    }
    if (peso === 0) return null;
    try {
      return JSON.parse(Buffer.concat(trozos).toString("utf8"));
    } catch {
      throw new Fallo(400, "bad_json");
    }
  }

  const responder = (res: ServerResponse, estado: number, cuerpo: unknown): void => {
    if (res.headersSent) return void res.end();
    res.writeHead(estado, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(cuerpo));
  };

  const servidor = createServer((req, res) => {
    void (async (): Promise<void> => {
      try {
        const direccion = new URL(req.url ?? "/", "http://casa");
        const partes = direccion.pathname.split("/").filter((x) => x !== "");
        if (partes.length === 1 && partes[0] === "salud" && req.method === "GET")
          return responder(res, 200, { ok: true });
        if (!conLlave(req)) throw new Fallo(401, "unauthorized");
        const dueno = req.headers[CABECERA_DEL_DUENO];
        if (typeof dueno !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(dueno)) throw new Fallo(400, "no_owner");
        const p: Peticion = {
          metodo: req.method ?? "GET",
          partes,
          consulta: direccion.searchParams,
          dueno,
          cuerpo: null,
        };
        if (partes[0] === "viajes" && partes[2] === "eventos" && partes.length === 3) {
          if (p.metodo !== "GET") throw new Fallo(405, "method");
          return escuchar(p, req, res);
        }
        p.cuerpo = await cuerpoDe(req);
        const r = atender(p);
        responder(res, r.estado, r.cuerpo);
      } catch (e) {
        // Lo que falla por dentro no se cuenta fuera: a la web le llega una clave, y nada más.
        if (e instanceof Fallo) responder(res, e.estado, { error: e.message, ...e.mas });
        else responder(res, 500, { error: "house" });
      }
    })();
  });

  return {
    servidor,
    enMarcha: () => [...marchas.keys()],
    esperar: async () => {
      while (marchas.size > 0) await Promise.all([...marchas.values()]);
    },
    cerrar: async () => {
      for (const res of abiertos) res.end();
      await new Promise<void>((resuelve) => servidor.close(() => resuelve()));
    },
  };
}
