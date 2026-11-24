// El freno del primer vistazo. El vistazo no pide cuenta, así que cualquiera que llegue a la web pediría a las
// fuentes con el cupo de la casa. Lleva tres cosas: una memoria corta (el mismo vistazo, la misma respuesta durante
// unos minutos, sin volver a pedir), un tope de vistazos nuevos por ventana de tiempo, en toda la casa y para cada
// quien pide si la web dice quién es, y un tope de los que se buscan a la vez. Lo que se pide mientras ya se está
// buscando lo mismo espera a esa misma búsqueda, y no cuenta dos veces.
//
// No guarda nada en el disco: si la casa se reinicia, la memoria y las cuentas empiezan de cero.

import { FRENO_DEL_VISTAZO } from "../data/vistazo.ts";

export type Freno = typeof FRENO_DEL_VISTAZO;

/** Por qué el freno no deja buscar ahora, y cuántos segundos hay que esperar para volver a probar. */
export class Frenado extends Error {
  espera: number;
  constructor(espera: number) {
    super("busy");
    this.espera = espera;
  }
}

export type FrenoDelVistazo = {
  /** La respuesta de esa clave: de la memoria, de la búsqueda que ya corre o de una nueva, si el freno deja. */
  pedir<T>(clave: string, cliente: string | null, buscar: () => Promise<T>): Promise<{ valor: T; deMemoria: boolean }>;
  /** Cuántos vistazos nuevos se han buscado en la ventana que corre. Para las pruebas. */
  nuevos(): number;
};

export function frenoDelVistazo(f: Partial<Freno> = {}, hoy: () => Date = () => new Date()): FrenoDelVistazo {
  const freno: Freno = { ...FRENO_DEL_VISTAZO, ...f };
  const ventana = freno.minutosDeVentana * 60_000;
  const vida = freno.minutosEnMemoria * 60_000;
  const memoria = new Map<string, { valor: unknown; hasta: number }>();
  const enMarcha = new Map<string, Promise<unknown>>();
  /** Cuándo se buscó cada vistazo nuevo de la ventana, en toda la casa y por quien lo pidió. */
  let todos: number[] = [];
  const porCliente = new Map<string, number[]>();

  const recientes = (lista: number[], ahora: number): number[] => lista.filter((t) => ahora - t < ventana);
  /** Lo que falta para que el más viejo de la ventana salga de ella, en segundos. */
  const falta = (lista: number[], ahora: number): number => Math.max(1, Math.ceil((lista[0] + ventana - ahora) / 1000));

  return {
    async pedir(clave, cliente, buscar) {
      const ahora = hoy().getTime();
      const guardado = memoria.get(clave);
      if (guardado !== undefined && guardado.hasta > ahora) return { valor: guardado.valor as never, deMemoria: true };
      if (guardado !== undefined) memoria.delete(clave);
      const yaVa = enMarcha.get(clave);
      if (yaVa !== undefined) return { valor: (await yaVa) as never, deMemoria: true };

      todos = recientes(todos, ahora);
      if (todos.length >= freno.porVentana) throw new Frenado(falta(todos, ahora));
      if (enMarcha.size >= freno.aLaVez) throw new Frenado(5);
      if (cliente !== null) {
        const suyos = recientes(porCliente.get(cliente) ?? [], ahora);
        if (suyos.length >= freno.porCliente) throw new Frenado(falta(suyos, ahora));
        if (porCliente.size > 10_000) porCliente.clear();
        porCliente.set(cliente, [...suyos, ahora]);
      }
      todos.push(ahora);

      const busqueda = buscar();
      enMarcha.set(clave, busqueda);
      try {
        const valor = await busqueda;
        // Lo que falla no se guarda: se puede volver a probar, y cuenta otra vez.
        while (memoria.size >= freno.enMemoria) memoria.delete(memoria.keys().next().value as string);
        memoria.set(clave, { valor, hasta: hoy().getTime() + vida });
        return { valor, deMemoria: false };
      } finally {
        enMarcha.delete(clave);
      }
    },
    nuevos: () => recientes(todos, hoy().getTime()).length,
  };
}
