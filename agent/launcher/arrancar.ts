// Arranca la casa: su puerta a la web, escuchando solo en esta máquina. La web le habla con su llave; nadie más
// llega a ella si no es por un túnel que se le ponga delante.
//
//   ELDORADO_LLAVE=<la llave de la web> ELDORADO_SECRETO=<32 bytes> node agent/launcher/arrancar.ts
//
// La llave es la misma que tiene la web en su entorno. El secreto cifra la clave de IA de cada cuenta: si se pierde,
// esas claves no se pueden descifrar, y cada viajero tendría que poner la suya otra vez. El puerto, en
// ELDORADO_PUERTO (4320 si no se dice), y la mesa, en ELDORADO_MESA. Detrás de un proxy, con NODE_USE_ENV_PROXY=1.
//
// Quién piensa en los asientos lo dice el entorno, con el modelo (ELDORADO_MODELO) y, si se quiere, cuánto se
// esfuerza (ELDORADO_ESFUERZO). Hay dos maneras, y la casa puede tener las dos, una o ninguna:
//
//   - La cuenta de Claude de la casa, por Claude Code: con ELDORADO_CORREOS_DE_LA_CASA (los correos que la usan,
//     separados por comas) y el token de la suscripción en ELDORADO_TOKEN_DE_CLAUDE (de `claude setup-token`; con
//     ese nombre y no con el de Claude Code, para que no lo lea otro Claude Code de la máquina). Solo esas cuentas
//     piensan con ella. Claude Code se busca como `claude`, o donde diga ELDORADO_CLAUDE.
//   - La clave de cada viajero, con una llamada directa: con lo que cuesta el modelo, en dólares por millón
//     (ELDORADO_PRECIO_ENTRADA y ELDORADO_PRECIO_SALIDA). Sin precio, la casa no admite claves.
//
// Sin modelo, el botón de investigar dice que no hay IA, y lo demás (las cuentas, los viajes y lo que se cuenta en
// vivo) funciona.

import { correosDeLaCasa, hayCuentaDe, secretoDe } from "./cuentas.ts";
import { fuentesDeVerdad } from "./fuentes_de_verdad.ts";
import { lanzadorDirecto, precioDe } from "./ia.ts";
import { pensarConClaudeCode, TOKEN_DE_LA_CASA } from "./ia_de_claude_code.ts";
import { claveQueFunciona, conQueDe, pensarConClaude } from "./ia_de_verdad.ts";
import { carpetaDeLaMesa } from "./mesa.ts";
import { puertaALaWeb, type OpcionesDeLaPuerta } from "./puerta_a_la_web.ts";

/** El puerto en el que escucha la casa si no se le dice otro. */
export const PUERTO = 4320;

export type IaDeLaCasa = Pick<
  OpcionesDeLaPuerta,
  "lanzador" | "claveQueFunciona" | "lanzadorDeLaCasa" | "correosDeLaCasa"
>;

/**
 * La IA de la casa, según lo que diga el entorno: quién piensa con la cuenta de la casa y para qué correos, y quién
 * piensa con la clave de un viajero y la comprueba. Sin modelo no hay IA. Con la cuenta de la casa, lo que cuesta lo
 * dice Claude Code; con las claves hace falta su precio: sin saber lo que cuesta no se respeta el techo de nadie.
 * Lo que está a medias no arranca: una lista de correos sin token, o un precio con una sola cifra.
 */
export function iaDe(entorno: Record<string, string | undefined>): IaDeLaCasa {
  const con = conQueDe(entorno);
  if (con === null) return {};
  const correos = correosDeLaCasa(entorno.ELDORADO_CORREOS_DE_LA_CASA);
  const conPrecio = [entorno.ELDORADO_PRECIO_ENTRADA, entorno.ELDORADO_PRECIO_SALIDA].some(
    (x) => (x ?? "").trim() !== "",
  );
  const ia: IaDeLaCasa = {};
  if (correos.length > 0) {
    const token = (entorno[TOKEN_DE_LA_CASA] ?? "").trim();
    if (token === "")
      throw new Error(`la lista de correos de la casa pide el token de su cuenta de Claude (${TOKEN_DE_LA_CASA})`);
    const binario = (entorno.ELDORADO_CLAUDE ?? "").trim() || "claude";
    ia.lanzadorDeLaCasa = lanzadorDirecto(pensarConClaudeCode({ con, token, binario, entorno }), null);
    ia.correosDeLaCasa = correos;
  }
  if (conPrecio || correos.length === 0) {
    const precio = precioDe(entorno);
    ia.lanzador = (clave) => lanzadorDirecto(pensarConClaude(clave, con), precio);
    ia.claveQueFunciona = (clave) => claveQueFunciona(clave, con);
  }
  return ia;
}

/**
 * Los correos de la lista de la casa que aún no tienen cuenta. Como el correo no se confirma, quien se registre antes
 * con uno de ellos pensaría con la cuenta de la casa: por eso se avisa al arrancar.
 */
export function correosSinCuenta(correos: string[], mesa: string): string[] {
  return correos.filter((c) => !hayCuentaDe(c, mesa));
}

function principal(): void {
  const llave = process.env.ELDORADO_LLAVE ?? "";
  const puerto = Number(process.env.ELDORADO_PUERTO ?? PUERTO);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error("el puerto de la casa no vale");
  const mesa = carpetaDeLaMesa();
  const ia = iaDe(process.env);
  const secreto = secretoDe(process.env.ELDORADO_SECRETO);
  const puerta = puertaALaWeb({ mesa, llave, secreto, fuentes: fuentesDeVerdad, ...ia });
  puerta.servidor.listen(puerto, "127.0.0.1", () => {
    console.log(`La casa escucha en http://127.0.0.1:${puerto}. Su mesa, en ${mesa}.`);
    if (ia.lanzador === undefined && ia.lanzadorDeLaCasa === undefined)
      console.log("Sin IA: el entorno no dice con qué modelo se piensa.");
    if (ia.lanzadorDeLaCasa !== undefined)
      console.log(`Con la cuenta de Claude de la casa, para los correos de su lista (${ia.correosDeLaCasa?.length}).`);
    if (ia.lanzador !== undefined) console.log("Con la clave de cada viajero.");
    const sinCuenta = correosSinCuenta(ia.correosDeLaCasa ?? [], mesa);
    if (sinCuenta.length > 0)
      console.warn(
        `Ojo: estos correos de la casa aún no tienen cuenta: ${sinCuenta.join(", ")}. Quien se registre antes con ` +
          "uno de ellos pensará con la cuenta de la casa: regístralos tú antes de dar la dirección a nadie.",
      );
  });
  const apaga = (): void => {
    // Se deja acabar lo que esté investigando y se cierra con orden.
    void puerta
      .esperar()
      .then(() => puerta.cerrar())
      .then(() => process.exit(0));
  };
  process.on("SIGINT", apaga);
  process.on("SIGTERM", apaga);
}

if (import.meta.main) {
  try {
    principal();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }
}
