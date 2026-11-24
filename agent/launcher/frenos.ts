// Las piezas de los frenos de la puerta: contar lo que pide cada uno en una ventana de tiempo, y dejar pasar solo
// unos pocos a la vez. No guardan nada en el disco: si la casa se reinicia, empiezan de cero.
//
// La memoria de cada freno tiene un tope. Al llenarse no se vacía de golpe: primero se quita lo caducado, después
// lo más viejo que no esté frenando, y solo si todo frena, lo más viejo. Así llenarla de cuentas inventadas no le
// quita el freno a una de verdad.

/** Por qué no se deja pasar ahora: el freno está lleno, o la cola de espera. */
export class Ocupado extends Error {
  espera: number;
  constructor(espera: number) {
    super("busy");
    this.espera = espera;
  }
}

export type Ventanas = {
  /** Los segundos que quedan para que esa clave pueda volver a pedir; cero si puede ya. */
  espera(clave: string): number;
  /** Cuenta una vez para esa clave. */
  apunta(clave: string): void;
  /** Olvida esa clave: vuelve a empezar de cero. */
  olvida(clave: string): void;
  /** Cuántas claves recuerda. Para las pruebas. */
  cuantas(): number;
};

/** Un tope de veces por ventana de minutos, para cada clave. La ventana empieza la primera vez que se cuenta. */
export function ventanas(tope: number, minutos: number, hoy: () => Date, enMemoria = 10_000): Ventanas {
  const ventana = minutos * 60_000;
  const cuentas = new Map<string, { n: number; desde: number }>();
  const viva = (c: { desde: number }, ahora: number): boolean => ahora - c.desde < ventana;

  const hacerSitio = (ahora: number): void => {
    for (const [clave, c] of cuentas) if (!viva(c, ahora)) cuentas.delete(clave);
    if (cuentas.size < enMemoria) return;
    // El Map guarda el orden en que entró cada clave: la primera que no frena es la más vieja de las que no frenan.
    for (const [clave, c] of cuentas)
      if (c.n < tope) {
        cuentas.delete(clave);
        return;
      }
    cuentas.delete(cuentas.keys().next().value as string);
  };

  return {
    espera(clave) {
      const ahora = hoy().getTime();
      const c = cuentas.get(clave);
      if (c === undefined) return 0;
      if (!viva(c, ahora)) {
        cuentas.delete(clave);
        return 0;
      }
      return c.n >= tope ? Math.max(1, Math.ceil((c.desde + ventana - ahora) / 1000)) : 0;
    },
    apunta(clave) {
      const ahora = hoy().getTime();
      let c = cuentas.get(clave);
      if (c !== undefined && !viva(c, ahora)) {
        cuentas.delete(clave);
        c = undefined;
      }
      if (c === undefined) {
        if (cuentas.size >= enMemoria) hacerSitio(ahora);
        cuentas.set(clave, { n: 1, desde: ahora });
      } else c.n += 1;
    },
    olvida(clave) {
      cuentas.delete(clave);
    },
    cuantas: () => cuentas.size,
  };
}

/**
 * Deja hacer unas pocas cosas a la vez. Las demás esperan su turno en una cola; si la cola está llena, `Ocupado`.
 */
export function turnos(aLaVez: number, enCola: number, segundos: number): <T>(hacer: () => Promise<T>) => Promise<T> {
  let haciendo = 0;
  const cola: (() => void)[] = [];
  return async (hacer) => {
    if (haciendo >= aLaVez) {
      if (cola.length >= enCola) throw new Ocupado(segundos);
      // El que acaba le pasa su sitio al primero de la cola: haciendo no baja ni sube.
      await new Promise<void>((pasa) => cola.push(pasa));
    } else haciendo += 1;
    try {
      return await hacer();
    } finally {
      const siguiente = cola.shift();
      if (siguiente !== undefined) siguiente();
      else haciendo -= 1;
    }
  };
}

/**
 * Los clientes desde los que cada correo entró bien, los últimos unos pocos: quien entra desde donde ya entró no
 * espera por lo que otros fallan con su correo desde otros sitios.
 */
export function conocidos(
  porCorreo = 5,
  enMemoria = 10_000,
): {
  conoce(correo: string, cliente: string | null): boolean;
  apunta(correo: string, cliente: string | null): void;
} {
  const lista = new Map<string, string[]>();
  return {
    conoce: (correo, cliente) => cliente !== null && (lista.get(correo) ?? []).includes(cliente),
    apunta(correo, cliente) {
      if (cliente === null) return;
      const antes = (lista.get(correo) ?? []).filter((c) => c !== cliente);
      lista.delete(correo);
      if (lista.size >= enMemoria) lista.delete(lista.keys().next().value as string);
      lista.set(correo, [...antes, cliente].slice(-porCorreo));
    },
  };
}
