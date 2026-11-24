// Arranca la casa: su puerta a la web, escuchando solo en esta máquina. La web le habla con su llave; nadie más
// llega a ella si no es por un túnel que se le ponga delante.
//
//   ELDORADO_LLAVE=<la llave de la web> ELDORADO_SECRETO=<32 bytes> node agent/launcher/arrancar.ts
//
// La llave es la misma que tiene la web en su entorno. El secreto cifra la clave de IA de cada cuenta: si se pierde,
// esas claves no se pueden descifrar, y cada viajero tendría que poner la suya otra vez. El puerto, en
// ELDORADO_PUERTO (4320 si no se dice), y la mesa, en ELDORADO_MESA. Detrás de un proxy, con NODE_USE_ENV_PROXY=1.
//
// Todavía no lleva quién piense en los asientos: hasta que se enchufe la IA de verdad, el botón de investigar dice
// que no hay IA. Lo demás (las cuentas, los viajes y lo que se cuenta en vivo) funciona.

import { secretoDe } from "./cuentas.ts";
import { fuentesDeVerdad } from "./fuentes_de_verdad.ts";
import { carpetaDeLaMesa } from "./mesa.ts";
import { puertaALaWeb } from "./puerta_a_la_web.ts";

/** El puerto en el que escucha la casa si no se le dice otro. */
export const PUERTO = 4320;

function principal(): void {
  const llave = process.env.ELDORADO_LLAVE ?? "";
  const puerto = Number(process.env.ELDORADO_PUERTO ?? PUERTO);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error("el puerto de la casa no vale");
  const mesa = carpetaDeLaMesa();
  const puerta = puertaALaWeb({
    mesa,
    llave,
    secreto: secretoDe(process.env.ELDORADO_SECRETO),
    fuentes: fuentesDeVerdad,
  });
  puerta.servidor.listen(puerto, "127.0.0.1", () => {
    console.log(`La casa escucha en http://127.0.0.1:${puerto}. Su mesa, en ${mesa}.`);
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
