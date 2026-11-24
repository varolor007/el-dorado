// Arranca la casa: su puerta a la web, escuchando solo en esta máquina. La web le habla con su llave; nadie más
// llega a ella si no es por un túnel que se le ponga delante.
//
//   ELDORADO_LLAVE=<la llave de la web> ELDORADO_SECRETO=<32 bytes> node agent/launcher/arrancar.ts
//
// La llave es la misma que tiene la web en su entorno. El secreto cifra la clave de IA de cada cuenta: si se pierde,
// esas claves no se pueden descifrar, y cada viajero tendría que poner la suya otra vez. El puerto, en
// ELDORADO_PUERTO (4320 si no se dice), y la mesa, en ELDORADO_MESA. Detrás de un proxy, con NODE_USE_ENV_PROXY=1.
//
// Quién piensa en los asientos lo dice el entorno: con ELDORADO_MODELO, la casa llama a Claude con la clave de cada
// viajero, y entonces hace falta también lo que cuesta, en dólares por millón (ELDORADO_PRECIO_ENTRADA y
// ELDORADO_PRECIO_SALIDA), y se puede decir cuánto se esfuerza (ELDORADO_ESFUERZO). Sin modelo, el botón de
// investigar dice que no hay IA, y lo demás (las cuentas, los viajes y lo que se cuenta en vivo) funciona.

import { secretoDe } from "./cuentas.ts";
import { fuentesDeVerdad } from "./fuentes_de_verdad.ts";
import { lanzadorDirecto, precioDe } from "./ia.ts";
import { claveQueFunciona, conQueDe, pensarConClaude } from "./ia_de_verdad.ts";
import { carpetaDeLaMesa } from "./mesa.ts";
import { puertaALaWeb, type OpcionesDeLaPuerta } from "./puerta_a_la_web.ts";

/** El puerto en el que escucha la casa si no se le dice otro. */
export const PUERTO = 4320;

/**
 * La IA de la casa, según lo que diga el entorno: quién piensa en los asientos y quién comprueba una clave. Sin
 * modelo no hay IA. Con modelo hace falta su precio: sin saber lo que cuesta no se respeta el techo de nadie.
 */
export function iaDe(
  entorno: Record<string, string | undefined>,
): Pick<OpcionesDeLaPuerta, "lanzador" | "claveQueFunciona"> {
  const con = conQueDe(entorno);
  if (con === null) return {};
  const precio = precioDe(entorno);
  return {
    lanzador: (clave) => lanzadorDirecto(pensarConClaude(clave, con), precio),
    claveQueFunciona: (clave) => claveQueFunciona(clave, con),
  };
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
    console.log(
      ia.lanzador === undefined ? "Sin IA: el entorno no dice con qué modelo se piensa." : "Con la IA enchufada.",
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
