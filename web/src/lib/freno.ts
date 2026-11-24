// El freno del buscador de lugares: la web le pide a un buscador abierto, que no es nuestro, y no se le puede dejar
// pedir sin tope a cualquiera. Cuenta lo que pide cada cliente (la primera dirección de `x-forwarded-for`, solo en la
// memoria de este servidor, nunca escrita ni mandada fuera) y lo que pide toda la web, por ventana de tiempo.
//
// Es sencillo a propósito: en un servidor que se reparte en varias copias, cada copia lleva su cuenta. Los números son
// de partida, y los firma el PM.

export const FRENO_DE_LUGARES = {
  /** Cuántas búsquedas por cliente y por ventana: escribir un destino entero pide una por cada pausa al teclear. */
  porCliente: 40,
  /** Cuántas en toda la web, por ventana. */
  enLaWeb: 600,
  segundosDeVentana: 60,
  /** Cuántos clientes recuerda, como mucho. */
  enMemoria: 5000,
};

export type Freno = typeof FRENO_DE_LUGARES;

/** Quién pide, para el freno: la primera dirección que dice el servidor de la web delante. Null si no dice. */
export function quienPide(direccion: string | null | undefined): string | null {
  const primera = (direccion ?? "").split(",")[0].trim();
  return primera === "" || primera.length > 64 ? null : primera;
}

/** Un freno nuevo: `pasa` dice cuántos segundos hay que esperar (cero si pasa, y entonces cuenta). */
export function frenoDeLugares(
  f: Partial<Freno> = {},
  hoy: () => number = () => Date.now(),
): { pasa(cliente: string | null): number } {
  const freno = { ...FRENO_DE_LUGARES, ...f };
  const ventana = freno.segundosDeVentana * 1000;
  const cuentas = new Map<string, { n: number; desde: number }>();
  let todos = { n: 0, desde: 0 };
  const falta = (desde: number, ahora: number): number => Math.max(1, Math.ceil((desde + ventana - ahora) / 1000));
  return {
    pasa(cliente) {
      const ahora = hoy();
      if (ahora - todos.desde >= ventana) todos = { n: 0, desde: ahora };
      if (todos.n >= freno.enLaWeb) return falta(todos.desde, ahora);
      if (cliente !== null) {
        let suya = cuentas.get(cliente);
        if (suya !== undefined && ahora - suya.desde >= ventana) {
          cuentas.delete(cliente);
          suya = undefined;
        }
        if (suya !== undefined && suya.n >= freno.porCliente) return falta(suya.desde, ahora);
        if (suya === undefined) {
          // Lleno, se quita lo caducado; si aún no cabe, lo más viejo. Nunca se vacía de golpe.
          if (cuentas.size >= freno.enMemoria)
            for (const [clave, c] of cuentas) if (ahora - c.desde >= ventana) cuentas.delete(clave);
          if (cuentas.size >= freno.enMemoria) cuentas.delete(cuentas.keys().next().value as string);
          cuentas.set(cliente, { n: 1, desde: ahora });
        } else suya.n += 1;
      }
      todos.n += 1;
      return 0;
    },
  };
}
