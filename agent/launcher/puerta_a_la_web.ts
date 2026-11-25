// La puerta de la casa a la web: lo único que la web puede pedir. La web entra con su llave; el viajero, con su
// cuenta: la casa sabe de quién es cada petición por su sesión, y solo da cada viaje a su dueño. Mientras se
// investiga, cuenta en vivo lo que pasa.
//
// Lo que sale por aquí lo lee un viajero: van claves y números, nunca el porqué de un rojo, ni el nombre de un
// asiento, ni una ruta del disco, ni una contraseña, ni una clave de IA. La clave de IA se guarda cifrada en su
// cuenta y solo se descifra para lanzar su investigación.
//
//   GET    /salud                      sin llave: que la casa está
//   POST   /vistazo                    el primer vistazo de lo entendido: sin sesión, con su freno, y sin guardar nada
//   POST   /cuentas                    registrarse, con correo y contraseña; deja la sesión abierta
//   POST   /sesiones                   entrar
//   DELETE /sesiones                   salir
//   GET    /cuenta                     quién soy, si tengo puesta mi clave de IA y con qué pienso
//   PUT    /cuenta/clave               pone mi clave de IA        DELETE la borra
//   GET    /cuenta/gasto               lo que ha gastado cada viaje mío, el total y lo que costaría el siguiente
//   GET    /viajes                     mis viajes
//   POST   /viajes                     abre un viaje con lo entendido hasta ahora
//   GET    /viajes/<id>                cómo está, y por dónde va su investigación
//   PUT    /viajes/<id>/entendido      cambia lo entendido, mientras no esté confirmado
//   POST   /viajes/<id>/empezar        el botón: confirma, da el adelante (con su techo, si se da) y lanza
//   POST   /viajes/<id>/confirmar      tu confirmación de lo que he entendido, o tus respuestas, o que sigues
//                                       aunque un papel bloquee ({ "papers": "go_on" }): y sigue
//   POST   /viajes/<id>/reintentar     volver a intentarlo en un run parado: solo el paso que lo paró, y sigue
//   GET    /viajes/<id>/eventos        lo que pasa, en vivo (sucesos del servidor)
//   GET    /viajes/<id>/version[/<n>]  el viaje que se enseña, o una versión de antes
//   POST   /viajes/<id>/guia           «Quiero mi guía», con el viaje cerrado, su manera ({ "way" }) y su techo
//   GET    /viajes/<id>/guia           cómo está la última guía: si sale, si salió, de qué versión y si se quedó atrás
//   GET    /viajes/<id>/guia/documento la guía hecha, como documento: la página que se ve, se imprime y se descarga

import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { FRENOS_DE_LA_PUERTA, type FrenosDeLaPuerta } from "../data/frenos.ts";
import { PARADO, PASOS } from "../data/pasos.ts";
import { puertaEntendido } from "../gates/puerta_entendido.ts";
import type { Lanzador } from "./asiento.ts";
import { actaDe, actaDeCara, paradaDeCara } from "./acta.ts";
import { adelanteDe, darElAdelante, llevar, type AlLlevar } from "./casa.ts";
import { confirmar, FalloAlConfirmar, paraConfirmar, turnoDelViajero } from "./escuchar.ts";
import { paraElViajero, seguirConLosPapeles, turnoDeLosPapeles } from "./papeles.ts";
import {
  abrirSesion,
  borrarClave,
  claveDe,
  claveQueVale,
  correoQueVale,
  cuantasCuentas,
  entrar,
  FalloDeCuenta,
  guardarClave,
  publica,
  registrar,
  salir,
  sesionDe,
  type Cuenta,
} from "./cuentas.ts";
import { gastoDeLaCuenta } from "./gasto.ts";
import { Frenado, frenoDelVistazo, type Freno } from "./freno.ts";
import { conocidos, Ocupado, turnos, ventanas } from "./frenos.ts";
import { pararRun, type Fuentes } from "./investigar.ts";
import { FalloAlReintentar, reintentar } from "./reintentar.ts";
import { documentoDeLaGuia, FalloDeLaGuia, guiaDeCara, llevarLaGuia, pedirGuia, type AlLlevarLaGuia } from "./guia.ts";
import {
  abrirViaje,
  apuntar,
  cambiarLoEntendido,
  cuantosViajes,
  leerVersion,
  leerViaje,
  nuevoRun,
  pasar,
  ultimoRun,
  viajesDe,
  type ViajeEnLaMesa,
} from "./mesa.ts";
import { comprobarVistazo } from "../output/viaje.ts";
import type { Entendido } from "../scripts/formas.ts";
import { claveDelVistazo, FalloDelVistazo, primerVistazo, type Esperas } from "../scripts/vistazo.ts";
import { porDondeVa } from "./pasos.ts";
import { gastoDe, trabajosDe } from "./trabajos.ts";
import { leerVivo } from "./vivo.ts";

/** Lo más que pesa lo que manda la web en una petición, los viajes que puede tener un dueño y los que le escuchan. */
export const PESO_DE_UNA_PETICION = 64 * 1024;
export const VIAJES_DE_UN_DUENO = FRENOS_DE_LA_PUERTA.viajes.deUnDueno;
export const OYENTES_DE_UN_VIAJE = FRENOS_DE_LA_PUERTA.oyentes.deUnViaje;
/** La cabecera donde la web pasa la sesión del viajero, que guarda en una cookie que su navegador no deja leer. */
export const CABECERA_DE_LA_SESION = "x-eldorado-session";
/** Cuántas veces se puede fallar al entrar con un correo desde un mismo sitio, y en cuánto tiempo, antes de esperar. */
export const INTENTOS_DE_ENTRAR = {
  fallos: FRENOS_DE_LA_PUERTA.fallos.porCorreoYCliente,
  minutos: FRENOS_DE_LA_PUERTA.fallos.minutos,
};
/**
 * La cabecera donde la web dice quién pide, resumido (no su dirección tal cual), para que cada freno lleve la cuenta
 * de cada uno: el primer vistazo, registrarse, entrar y comprobar una clave. Sin ella, solo cuentan el freno de cada
 * cuenta y el de toda la casa.
 */
export const CABECERA_DEL_CLIENTE = "x-eldorado-client";

export type OpcionesDeLaPuerta = {
  mesa: string;
  /** La llave con la que entra la web. Larga: no es una contraseña de persona. */
  llave: string;
  /** El secreto con el que se cifra la clave de IA de cada cuenta: 32 bytes, del entorno de la casa. */
  secreto: Buffer;
  fuentes: () => Fuentes;
  /** Quien piensa en los asientos, para la clave de IA de un viajero. Sin él, el botón dice que no hay IA. */
  lanzador?: (clave: string) => Lanzador;
  /** Si una clave de IA sirve, preguntado a la IA. Sin ello, la clave se guarda sin comprobar. */
  claveQueFunciona?: (clave: string) => Promise<boolean>;
  /**
   * Quien piensa con la cuenta de la casa, y los correos que la usan. Solo esos: cualquier otra cuenta piensa con
   * su clave o con nada, aunque la casa tenga la suya.
   */
  lanzadorDeLaCasa?: Lanzador;
  correosDeLaCasa?: string[];
  hoy?: () => Date;
  alLlevar?: AlLlevar;
  /** Cómo se lleva una guía: su tope y de dónde se bajan sus fotos. */
  alLlevarLaGuia?: AlLlevarLaGuia;
  /** Cada cuánto mira la casa si hay algo nuevo que contar a quien escucha, y cada cuánto le da señal de vida. */
  cadaMs?: number;
  latidoMs?: number;
  /** El freno del primer vistazo, si no es el de `agent/data/vistazo.ts`, y lo que espera a cada fuente. */
  freno?: Partial<Freno>;
  /** Los frenos de la puerta, si no son los de `agent/data/frenos.ts`: cada grupo, en parte. */
  frenos?: {
    [K in keyof FrenosDeLaPuerta]?: FrenosDeLaPuerta[K] extends object
      ? Partial<FrenosDeLaPuerta[K]>
      : FrenosDeLaPuerta[K];
  };
  esperasDelVistazo?: Esperas;
};

export type Puerta = {
  servidor: Server;
  /** Los viajes que se están investigando ahora mismo en esta casa. */
  enMarcha: () => string[];
  /** Espera a que acaben las investigaciones en marcha: para las pruebas y para apagar con orden. */
  esperar: () => Promise<void>;
  cerrar: () => Promise<void>;
};

type Peticion = {
  metodo: string;
  partes: string[];
  consulta: URLSearchParams;
  dueno: string;
  cuerpo: unknown;
  cuenta: Cuenta;
  /** Quien pide, como lo dice la web, resumido; null si no lo dice. */
  cliente: string | null;
};
type Entrada = { metodo: string; partes: string[]; cuerpo: unknown; sesion: unknown; cliente: string | null };
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
      // Si se paró: dónde, qué clase de parada es y qué puede hacer el viajero, por claves (y la frase del conductor,
      // solo si pasó su puerta de palabras).
      stopped: existsSync(join(run, PARADO)) ? paradaDeCara(run) : null,
      told: leerVivo(run).length,
      // Su turno: lo que he entendido, para que lo confirme; o los papeles, si algo bloquea. Solo lo lee su dueño.
      waiting_for_you: turnoDelViajero(run) || turnoDeLosPapeles(run),
      heard: paraConfirmar(run),
      papers: paraElViajero(run),
    },
  };
}

/** Lo que ha gastado una cuenta, dicho para la web: números y fechas, y de cada viaje, a dónde va. */
function gastoDeCara(g: ReturnType<typeof gastoDeLaCuenta>): Record<string, unknown> {
  return {
    trips: g.viajes.map((v) => ({
      id: v.id,
      destination: v.destino,
      check_in: v.entrada,
      check_out: v.salida,
      usd: v.usd,
      calls: v.llamadas,
      known: v.sabido,
      last: v.ultima,
      researches: v.investigaciones,
    })),
    total: { usd: g.total.usd, calls: g.total.llamadas, known: g.total.sabido },
    next: g.siguiente === null ? null : { usd: g.siguiente.usd, from: g.siguiente.de },
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
  if (o.secreto.length !== 32) throw new Error("el secreto de la casa tiene que ser de 32 bytes");
  const llave = Buffer.from(o.llave);
  const hoy = o.hoy ?? ((): Date => new Date());
  const marchas = new Map<string, Promise<void>>();
  /** Las guías que se están escribiendo ahora, por su viaje: una a la vez por viaje. */
  const guias = new Map<string, Promise<void>>();
  const oyentes = new Map<string, number>();
  const oyentesDeCuenta = new Map<string, number>();
  const abiertos = new Set<ServerResponse>();
  const deLaCasa = new Set((o.correosDeLaCasa ?? []).flatMap((c) => correoQueVale(c) ?? []));

  /** Con qué piensa una cuenta: la de la casa, solo si su correo está en la lista; si no, su clave, o nada. */
  const conQuePiensa = (c: Cuenta): "house" | "key" | null => {
    const correo = correoQueVale(c.correo);
    if (o.lanzadorDeLaCasa !== undefined && correo !== null && correo === c.correo && deLaCasa.has(correo))
      return "house";
    return o.lanzador !== undefined && c.clave !== null ? "key" : null;
  };
  /** Lo que se dice de una cuenta a la web: lo público suyo y con qué piensa, y nada de la casa. */
  const deCara = (c: Cuenta): Record<string, unknown> => ({ ...publica(c), thinks_with: conQuePiensa(c) });
  const freno = frenoDelVistazo(o.freno, hoy);

  // Los frenos de registrarse, entrar y comprobar claves. Cada uno cuenta por su clave, en su ventana.
  const f: FrenosDeLaPuerta = Object.fromEntries(
    Object.entries(FRENOS_DE_LA_PUERTA).map(([k, v]) => {
      const dado = (o.frenos as Record<string, unknown> | undefined)?.[k];
      return [k, typeof v === "object" ? { ...v, ...(dado as object | undefined) } : (dado ?? v)];
    }),
  ) as FrenosDeLaPuerta;
  const ventana = (tope: number, minutos: number) => ventanas(tope, minutos, hoy, f.enMemoria);
  const frenos = {
    fallosPorPar: ventana(f.fallos.porCorreoYCliente, f.fallos.minutos),
    fallosPorCorreo: ventana(f.fallos.porCorreo, f.fallos.minutos),
    fallosPorCliente: ventana(f.fallos.porCliente, f.fallos.minutos),
    intentosPorCliente: ventana(f.intentos.porCliente, f.intentos.minutos),
    intentosEnLaCasa: ventana(f.intentos.enLaCasa, f.intentos.minutos),
    registrosPorCliente: ventana(f.registros.porCliente, f.registros.minutos),
    registrosEnLaCasa: ventana(f.registros.enLaCasa, f.registros.minutos),
    clavesPorCuenta: ventana(f.claves.porCuenta, f.claves.minutos),
    clavesPorCliente: ventana(f.claves.porCliente, f.claves.minutos),
  };
  const yaEntraron = conocidos(5, f.enMemoria);
  const unaContrasena = turnos(f.contrasenas.aLaVez, f.contrasenas.enCola, f.contrasenas.segundosDeEspera);
  /** La clave de toda la casa en los frenos que no son de nadie. */
  const CASA = "casa";

  /** Lo que tiene que esperar un cliente que ya ha gastado lo suyo: 429, por su clave, con los segundos. */
  const siEspera = (clave: string, ...esperas: number[]): void => {
    const espera = Math.max(0, ...esperas);
    if (espera > 0) throw new Fallo(429, clave, { wait: espera });
  };

  /** Registrarse, entrar y salir: lo único que se puede pedir sin una sesión abierta. */
  async function deLaCuenta(e: Entrada, cuerpo: () => Promise<unknown>): Promise<Respuesta | null> {
    const [raiz, mas] = e.partes;
    if (mas !== undefined || (raiz !== "cuentas" && raiz !== "sesiones")) return null;
    const leido = await cuerpo();
    const dado = objeto(leido) ? leido : {};
    if (raiz === "sesiones" && e.metodo === "DELETE") {
      salir(e.sesion, o.mesa);
      return { estado: 200, cuerpo: { ok: true } };
    }
    if (e.metodo !== "POST") throw new Fallo(405, "method");
    const cliente = e.cliente;
    // El correo se cuenta igual que se entra: normalizado. Uno que no tiene forma de correo no entra en ninguna
    // cuenta, pero cuesta lo mismo: cuenta para el cliente y para toda la casa.
    const correo = correoQueVale(dado.email);
    const par = `${correo ?? "-"}|${cliente ?? "-"}`;
    if (cliente !== null) siEspera("too_many_attempts", frenos.intentosPorCliente.espera(cliente));
    const enLaCasa = frenos.intentosEnLaCasa.espera(CASA);
    if (enLaCasa > 0) throw new Fallo(503, "busy", { wait: enLaCasa });
    if (raiz === "cuentas") {
      if (cliente !== null) siEspera("too_many_attempts", frenos.registrosPorCliente.espera(cliente));
      const registros = frenos.registrosEnLaCasa.espera(CASA);
      if (registros > 0) throw new Fallo(503, "busy", { wait: registros });
      if (cuantasCuentas(o.mesa) >= f.cuentasDeLaCasa) throw new Fallo(503, "house_full");
    } else {
      siEspera(
        "too_many_attempts",
        frenos.fallosPorPar.espera(par),
        cliente === null ? 0 : frenos.fallosPorCliente.espera(cliente),
        // Lo que se falla con un correo desde muchos sitios no frena a quien entra desde donde ya entró.
        correo === null || yaEntraron.conoce(correo, cliente) ? 0 : frenos.fallosPorCorreo.espera(correo),
      );
    }
    if (cliente !== null) frenos.intentosPorCliente.apunta(cliente);
    frenos.intentosEnLaCasa.apunta(CASA);

    let dentro: { sesion: string; cuenta: Cuenta } | null;
    try {
      dentro = await unaContrasena(async () => {
        if (raiz === "sesiones")
          return entrar({
            correo: dado.email,
            contrasena: dado.password,
            mesa: o.mesa,
            cuando: hoy(),
            sesiones: f.sesionesDeUnaCuenta,
          });
        try {
          const cuenta = await registrar({
            correo: dado.email,
            contrasena: dado.password,
            mesa: o.mesa,
            cuando: hoy(),
          });
          return { cuenta, sesion: abrirSesion(cuenta, o.mesa, hoy(), f.sesionesDeUnaCuenta) };
        } catch (error) {
          if (error instanceof FalloDeCuenta) throw new Fallo(error.message === "exists" ? 409 : 400, error.message);
          throw error;
        }
      });
    } catch (error) {
      if (error instanceof Ocupado) throw new Fallo(503, "busy", { wait: error.espera });
      throw error;
    }
    if (dentro === null) {
      frenos.fallosPorPar.apunta(par);
      if (cliente !== null) frenos.fallosPorCliente.apunta(cliente);
      if (correo !== null) frenos.fallosPorCorreo.apunta(correo);
      throw new Fallo(401, "bad_login");
    }
    if (raiz === "cuentas") {
      if (cliente !== null) frenos.registrosPorCliente.apunta(cliente);
      frenos.registrosEnLaCasa.apunta(CASA);
    } else frenos.fallosPorPar.olvida(par);
    if (correo !== null) yaEntraron.apunta(correo, cliente);
    return {
      estado: raiz === "cuentas" ? 201 : 200,
      cuerpo: { account: deCara(dentro.cuenta), session: dentro.sesion },
    };
  }

  /** Mi cuenta y mi clave de IA: de la clave solo sale cómo acaba. */
  async function miCuenta(p: Peticion, cuenta: Cuenta): Promise<Respuesta | null> {
    const [raiz, que, mas] = p.partes;
    if (raiz !== "cuenta" || mas !== undefined) return null;
    if (que === undefined) {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      return { estado: 200, cuerpo: { account: deCara(cuenta) } };
    }
    if (que === "gasto") {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      return { estado: 200, cuerpo: { spend: gastoDeCara(gastoDeLaCuenta(cuenta.id, o.mesa)) } };
    }
    if (que !== "clave") throw NO_HAY();
    try {
      if (p.metodo === "PUT") {
        const dado = objeto(p.cuerpo) ? p.cuerpo.key : undefined;
        // Una clave se comprueba contra la IA antes de guardarla, si la casa tiene con qué. Lo que no tiene forma de
        // clave no llega a salir de aquí.
        if (o.claveQueFunciona !== undefined && claveQueVale(dado)) {
          // Cada comprobación es una pregunta a la IA: con freno, para que la puerta no sirva para saber qué claves
          // siguen valiendo.
          siEspera(
            "too_many_attempts",
            frenos.clavesPorCuenta.espera(cuenta.id),
            p.cliente === null ? 0 : frenos.clavesPorCliente.espera(p.cliente),
          );
          frenos.clavesPorCuenta.apunta(cuenta.id);
          if (p.cliente !== null) frenos.clavesPorCliente.apunta(p.cliente);
          let sirve: boolean;
          try {
            sirve = await o.claveQueFunciona(dado);
          } catch {
            throw new Fallo(503, "ai_unreachable");
          }
          if (!sirve) throw new Fallo(400, "key_rejected");
        }
        return { estado: 200, cuerpo: { account: deCara(guardarClave(cuenta.id, dado, o.secreto, o.mesa, hoy())) } };
      }
      if (p.metodo === "DELETE") return { estado: 200, cuerpo: { account: deCara(borrarClave(cuenta.id, o.mesa)) } };
    } catch (error) {
      if (error instanceof FalloDeCuenta) throw new Fallo(400, error.message);
      throw error;
    }
    throw new Fallo(405, "method");
  }

  /**
   * El primer vistazo: no pide sesión, porque no gasta IA, pero sí la llave de la web. Lo entendido pasa la puerta 1
   * antes de buscar nada, y no se guarda en la mesa. Lo que se le dice a la web es el vistazo y si salió de la memoria.
   */
  async function vistazo(metodo: string, cuerpo: unknown, cliente: string | null): Promise<Respuesta> {
    if (metodo !== "POST") throw new Fallo(405, "method");
    const dado = objeto(cuerpo) ? cuerpo.understood : undefined;
    const claro = puertaEntendido(dado, { hoy: hoy().toISOString().slice(0, 10) });
    if (!claro.verde) throw new Fallo(422, "unclear", { fields: [...new Set(claro.rojos.map((r) => r.donde))] });
    const e = dado as Entendido;
    try {
      const { valor, deMemoria } = await freno.pedir(claveDelVistazo(e), cliente, async () => {
        let fuentes: Fuentes;
        try {
          fuentes = o.fuentes();
        } catch {
          throw new FalloDelVistazo("no_sources");
        }
        const v = await primerVistazo(e, fuentes, o.esperasDelVistazo);
        if (comprobarVistazo(v).length > 0) throw new Error("el vistazo no cuadra");
        return v;
      });
      return { estado: 200, cuerpo: { look: valor, cached: deMemoria } };
    } catch (error) {
      if (error instanceof Frenado) throw new Fallo(429, "busy", { wait: error.espera });
      if (error instanceof FalloDelVistazo) throw new Fallo(error.message === "too_slow" ? 504 : 503, error.message);
      throw error;
    }
  }

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
    const conQue = conQuePiensa(p.cuenta);
    if (conQue !== "house" && o.lanzador === undefined) throw new Fallo(503, "no_ai");
    const pedido = objeto(p.cuerpo) ? p.cuerpo : {};
    // El techo de gasto es de quien lo quiera poner: la web no lo pregunta (el PM, 24-nov: cada uno limita su gasto
    // en su cuenta de Claude). Sin techo, la casa no para por gasto; con uno, tiene que ser un importe de verdad.
    const techo = pedido.ceiling === undefined || pedido.ceiling === null ? null : pedido.ceiling;
    if (techo !== null && (typeof techo !== "number" || !Number.isFinite(techo) || techo <= 0))
      throw new Fallo(400, "bad_ceiling");
    // Con la cuenta de la casa no hace falta clave. Si no, la clave de IA es la de su cuenta: se descifra aquí, para
    // esta investigación, y no se escribe en ningún sitio.
    const clave = conQue === "house" ? null : claveDe(p.dueno, o.secreto, o.mesa);
    if (conQue !== "house" && clave === null) throw new Fallo(409, "no_key");
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
    const lanzador =
      conQue === "house"
        ? (o.lanzadorDeLaCasa as Lanzador)
        : (o.lanzador as (clave: string) => Lanzador)(clave as string);
    marchar(id, run, lanzador);
    return { estado: 202, cuerpo: { run: v.ficha.runs.length } };
  }

  /**
   * Tu confirmación de lo que he entendido, o tus respuestas a sus preguntas: solo en tu turno, y la investigación
   * sigue sola, con la misma clave y el mismo adelante que diste con el botón.
   */
  function confirmarLoEntendido(p: Peticion): Respuesta {
    const v = suViaje(p);
    const id = v.ficha.id;
    if (marchas.has(id)) throw new Fallo(409, "already_running");
    const run = ultimoRun(v);
    const deLosPapeles = run !== null && !turnoDelViajero(run) && turnoDeLosPapeles(run);
    if (run === null || !(turnoDelViajero(run) || deLosPapeles)) throw new Fallo(409, "not_now");
    const conQue = conQuePiensa(p.cuenta);
    if (conQue !== "house" && o.lanzador === undefined) throw new Fallo(503, "no_ai");
    const clave = conQue === "house" ? null : claveDe(p.dueno, o.secreto, o.mesa);
    if (conQue !== "house" && clave === null) throw new Fallo(409, "no_key");
    let hecho: "answered" | "confirmed" | "papers_go_on";
    try {
      if (deLosPapeles) {
        try {
          hecho = seguirConLosPapeles(run, p.cuerpo, hoy());
        } catch {
          throw new FalloAlConfirmar("bad_request");
        }
      } else hecho = confirmar(run, p.cuerpo, hoy());
    } catch (error) {
      if (error instanceof FalloAlConfirmar) throw new Fallo(error.message === "not_now" ? 409 : 400, error.message);
      throw error;
    }
    apuntar(v, "confirmation", { hecho }, hoy());
    const lanzador =
      conQue === "house"
        ? (o.lanzadorDeLaCasa as Lanzador)
        : (o.lanzador as (clave: string) => Lanzador)(clave as string);
    marchar(id, run, lanzador);
    return { estado: 202, cuerpo: { done: hecho } };
  }

  /**
   * Volver a intentarlo, en el último run de un viaje parado por un asiento (o porque la casa se rompió): una vuelta
   * más de ese paso, y solo de ese, sin volver a empezar. Solo su dueño, nunca con el run en marcha, y con la misma
   * cuenta o clave con la que piensa. Lo demás del run se queda como está.
   */
  function reintentarElPaso(p: Peticion): Respuesta {
    const v = suViaje(p);
    const id = v.ficha.id;
    if (marchas.has(id)) throw new Fallo(409, "already_running");
    const run = ultimoRun(v);
    if (run === null) throw new Fallo(409, "not_now");
    const conQue = conQuePiensa(p.cuenta);
    if (conQue !== "house" && o.lanzador === undefined) throw new Fallo(503, "no_ai");
    const clave = conQue === "house" ? null : claveDe(p.dueno, o.secreto, o.mesa);
    if (conQue !== "house" && clave === null) throw new Fallo(409, "no_key");
    let hecho: { n: number; en: string | null };
    try {
      hecho = reintentar(run, hoy());
    } catch (error) {
      if (error instanceof FalloAlReintentar) throw new Fallo(409, error.message);
      throw error;
    }
    apuntar(v, "button", { boton: "retry", n: hecho.n, paso: hecho.en }, hoy());
    const lanzador =
      conQue === "house"
        ? (o.lanzadorDeLaCasa as Lanzador)
        : (o.lanzador as (clave: string) => Lanzador)(clave as string);
    marchar(id, run, lanzador);
    return { estado: 202, cuerpo: { retry: hecho.n } };
  }

  /** La casa lleva la investigación de un run, de fondo: si se rompe a medias, queda parada, y se cuenta. */
  function marchar(id: string, run: string, lanzador: Lanzador): void {
    const marcha = llevar(run, o.fuentes(), lanzador, o.alLlevar)
      .then(() => undefined)
      .catch(() => {
        // Si la casa se rompe a medias, el run no se queda colgado: queda parado, y se cuenta.
        const donde = porDondeVa(run).find((x) => x.estado !== "done")?.id ?? "trip";
        if (!existsSync(join(run, PARADO)))
          pararRun(run, donde, "la casa", [{ donde: "house", que: "la casa se rompió mientras investigaba" }]);
      })
      .finally(() => marchas.delete(id));
    marchas.set(id, marcha);
  }

  /**
   * «Quiero mi guía»: solo su dueño, con el viaje cerrado y sin otra guía en marcha, y con la misma cuenta o clave con
   * la que piensa. Sale de la versión que se enseña, con la manera que diga si el viaje tiene más de una.
   */
  function pedirLaGuia(p: Peticion): Respuesta {
    const v = suViaje(p);
    const id = v.ficha.id;
    if (guias.has(id) || marchas.has(id)) throw new Fallo(409, "already_running");
    if (v.ficha.estado !== "closed") throw new Fallo(409, "not_closed");
    const conQue = conQuePiensa(p.cuenta);
    if (conQue !== "house" && o.lanzador === undefined) throw new Fallo(503, "no_ai");
    const pedido = objeto(p.cuerpo) ? p.cuerpo : {};
    const techo = pedido.ceiling === undefined || pedido.ceiling === null ? null : pedido.ceiling;
    if (techo !== null && (typeof techo !== "number" || !Number.isFinite(techo) || techo <= 0))
      throw new Fallo(400, "bad_ceiling");
    const manera = pedido.way === undefined || pedido.way === null ? null : pedido.way;
    if (manera !== null && (typeof manera !== "string" || !/^[a-z_]{1,32}$/.test(manera)))
      throw new Fallo(400, "bad_way");
    const clave = conQue === "house" ? null : claveDe(p.dueno, o.secreto, o.mesa);
    if (conQue !== "house" && clave === null) throw new Fallo(409, "no_key");
    let n: number;
    try {
      n = pedirGuia(v, { manera, techo, hoy: hoy() }).n;
    } catch (error) {
      if (error instanceof FalloDeLaGuia) throw new Fallo(error.message === "which_way" ? 400 : 409, error.message);
      throw error;
    }
    apuntar(v, "button", { boton: "guide", guia: n, techo }, hoy());
    const lanzador =
      conQue === "house"
        ? (o.lanzadorDeLaCasa as Lanzador)
        : (o.lanzador as (clave: string) => Lanzador)(clave as string);
    // Si la casa se rompe a medias, la guía no se queda colgada: sin nadie que la lleve, se cuenta como parada.
    const marcha = llevarLaGuia(v, n, lanzador, { hoy, ...o.alLlevarLaGuia })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => guias.delete(id));
    guias.set(id, marcha);
    return { estado: 202, cuerpo: { guide: n } };
  }

  function atender(p: Peticion): Respuesta {
    const [raiz, id, que, cual] = p.partes;
    if (raiz !== "viajes" || p.partes.length > 4) throw NO_HAY();
    if (id === undefined) {
      if (p.metodo === "GET") return { estado: 200, cuerpo: { trips: listar(p.dueno) } };
      if (p.metodo === "POST") {
        if (!objeto(p.cuerpo) || !objeto(p.cuerpo.understood)) throw new Fallo(400, "bad_request");
        if (viajesDe(p.dueno, o.mesa).length >= f.viajes.deUnDueno) throw new Fallo(429, "too_many_trips");
        if (cuantosViajes(o.mesa) >= f.viajes.enLaCasa) throw new Fallo(503, "house_full");
        const v = abrirViaje({ dueno: p.dueno, entendido: p.cuerpo.understood, mesa: o.mesa, cuando: hoy() });
        return { estado: 201, cuerpo: { trip: resumen(v) } };
      }
      throw new Fallo(405, "method");
    }
    if (que === undefined) {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const v = suViaje(p);
      // A su dueño se le devuelve también lo que he entendido, con sus propias palabras: es suyo, y con ello retoma
      // las preguntas donde las dejó.
      const entendido = leerJson(join(v.carpeta, "entendido.json"));
      return { estado: 200, cuerpo: { ...estadoDe(v, marchas.has(v.ficha.id)), understood: entendido } };
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
    if (que === "confirmar" && cual === undefined) {
      if (p.metodo !== "POST") throw new Fallo(405, "method");
      return confirmarLoEntendido(p);
    }
    if (que === "reintentar" && cual === undefined) {
      if (p.metodo !== "POST") throw new Fallo(405, "method");
      return reintentarElPaso(p);
    }
    if (que === "acta" && cual === undefined) {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const run = ultimoRun(suViaje(p));
      if (run === null) throw NO_HAY();
      return { estado: 200, cuerpo: { record: actaDeCara(actaDe(run)) } };
    }
    if (que === "version") {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const v = suViaje(p);
      const n = cual === undefined ? v.ficha.version : /^[1-9]\d{0,5}$/.test(cual) ? Number(cual) : Number.NaN;
      const version = Number.isNaN(n) ? null : leerVersion(v, n);
      if (version === null) throw NO_HAY();
      return { estado: 200, cuerpo: { n, trip: version.viaje, events: version.sucesos } };
    }
    if (que === "guia" && cual === undefined) {
      if (p.metodo === "POST") return pedirLaGuia(p);
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const v = suViaje(p);
      return { estado: 200, cuerpo: { guide: guiaDeCara(v, guias.has(v.ficha.id)) } };
    }
    if (que === "guia" && cual === "documento") {
      if (p.metodo !== "GET") throw new Fallo(405, "method");
      const documento = documentoDeLaGuia(suViaje(p));
      if (documento === null) throw NO_HAY();
      return { estado: 200, cuerpo: { html: documento } };
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
    const dueno = p.dueno;
    if (
      (oyentes.get(id) ?? 0) >= f.oyentes.deUnViaje ||
      (oyentesDeCuenta.get(dueno) ?? 0) >= f.oyentes.deUnaCuenta ||
      abiertos.size >= f.oyentes.enLaCasa
    )
      throw new Fallo(429, "too_many_listeners");
    oyentes.set(id, (oyentes.get(id) ?? 0) + 1);
    oyentesDeCuenta.set(dueno, (oyentesDeCuenta.get(dueno) ?? 0) + 1);
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
      if (!abiertos.delete(res)) return;
      // Lo que llega a cero se quita, para que los contadores no crezcan con cada viaje escuchado.
      const quedan = (oyentes.get(id) ?? 1) - 1;
      if (quedan > 0) oyentes.set(id, quedan);
      else oyentes.delete(id);
      const suyos = (oyentesDeCuenta.get(dueno) ?? 1) - 1;
      if (suyos > 0) oyentesDeCuenta.set(dueno, suyos);
      else oyentesDeCuenta.delete(dueno);
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
        const metodo = req.method ?? "GET";
        const sesion = req.headers[CABECERA_DE_LA_SESION];
        const dicho = req.headers[CABECERA_DEL_CLIENTE];
        const cliente = typeof dicho === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(dicho) ? dicho : null;
        if (partes.length === 1 && partes[0] === "vistazo") {
          const r = await vistazo(metodo, await cuerpoDe(req), cliente);
          return responder(res, r.estado, r.cuerpo);
        }
        // Registrarse, entrar y salir es lo único que no pide una sesión abierta.
        const sinSesion = await deLaCuenta({ metodo, partes, cuerpo: null, sesion, cliente }, () => cuerpoDe(req));
        if (sinSesion !== null) return responder(res, sinSesion.estado, sinSesion.cuerpo);
        const cuenta = sesionDe(sesion, o.mesa, hoy());
        if (cuenta === null) throw new Fallo(401, "no_session");
        const p: Peticion = {
          metodo,
          partes,
          consulta: direccion.searchParams,
          dueno: cuenta.id,
          cuerpo: null,
          cuenta,
          cliente,
        };
        if (partes[0] === "viajes" && partes[2] === "eventos" && partes.length === 3) {
          if (p.metodo !== "GET") throw new Fallo(405, "method");
          return escuchar(p, req, res);
        }
        p.cuerpo = await cuerpoDe(req);
        const r = (await miCuenta(p, cuenta)) ?? atender(p);
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
      while (marchas.size > 0 || guias.size > 0) await Promise.all([...marchas.values(), ...guias.values()]);
    },
    cerrar: async () => {
      for (const res of abiertos) res.end();
      await new Promise<void>((resuelve) => servidor.close(() => resuelve()));
    },
  };
}
