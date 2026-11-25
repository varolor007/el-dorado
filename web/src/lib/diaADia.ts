// Tu mensaje para tus días (8.6), sin React: qué se enseña de tu último mensaje según la versión que ves. Lo usa
// `web/src/piezas/DiaADia.tsx`, y se prueba sin navegador.

/** Cómo va tu último mensaje, en lo que importa para decidir qué se enseña. */
export type TuMensajeVisto = {
  state: "working" | "done" | "stopped";
  /** La versión de la que salió, y la que dejó, si ya la dejó. */
  from: number;
  version: number | null;
};

/** Lo que se enseña de tu último mensaje: si trabaja, si acabó en la que ves, si dejó una más nueva o si se paró. */
export type LoQueSeEnsena = { trabajando: boolean; acabado: boolean; nuevo: boolean; parado: boolean };

/**
 * Qué se enseña de tu último mensaje en la versión que ves. «Tus días han cambiado» solo sale si el mensaje se mandó
 * desde esta versión y dejó una más nueva: tras otro cambio, o al volver a una de antes, ya no lleva a nada nuevo, y
 * se enseña la caja para escribir otro. `visto` es que ya lo cerraste.
 */
export function loQueSeEnsena(m: TuMensajeVisto | null, version: number | null, visto: boolean): LoQueSeEnsena {
  const hecho = m?.state === "done" && m.version !== null;
  return {
    trabajando: m?.state === "working",
    acabado: hecho && m.version === version && !visto,
    nuevo: hecho && version !== null && m.from === version && (m.version as number) > version,
    parado: m?.state === "stopped" && m.from === version && !visto,
  };
}
