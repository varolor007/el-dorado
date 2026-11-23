// Quién pasa a mirarse de cerca. La regla es provisional, la de la primera prueba: los más baratos, los de mejor nota
// por lo que cuestan y el de mejor nota entre los que no pasan de la mediana. Las cribas con sus pesos llegan con la
// hoja.

import type { Alojamiento, Precio } from "../tools/fuentes/tipos.ts";

export type ConPrecio = { alojamiento: Alojamiento; precio: Precio };
export type Finalista = ConPrecio & { motivo: string };

/** Lo que se paga de verdad: el total más lo que se cobra aparte. */
export function completo(p: Precio): number {
  return Math.round((p.total + p.tasasAparte) * 100) / 100;
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[medio] : Math.round(((v[medio - 1] + v[medio]) / 2) * 100) / 100;
}

/** Los puntos de nota por encima del suelo que da cada cien de precio. */
export function valor(c: ConPrecio, suelo: number): number {
  const precio = completo(c.precio);
  return precio <= 0 ? 0 : (((c.alojamiento.nota ?? suelo) - suelo) / precio) * 100;
}

function porId(a: ConPrecio, b: ConPrecio): number {
  return a.alojamiento.id.localeCompare(b.alojamiento.id);
}

export function elegir(candidatos: ConPrecio[], cuantos: number, suelo: number): Finalista[] {
  const validos = candidatos.filter((c) => completo(c.precio) > 0);
  const elegidos: Finalista[] = [];
  const quedan = (): ConPrecio[] => validos.filter((c) => !elegidos.some((x) => x.alojamiento.id === c.alojamiento.id));
  const baratos = Math.min(Math.ceil(cuantos * 0.4), cuantos);
  const deValor = Math.min(Math.ceil(cuantos * 0.4), cuantos - baratos);

  const porPrecio = quedan().sort((a, b) => completo(a.precio) - completo(b.precio) || porId(a, b));
  for (const c of porPrecio.slice(0, baratos)) elegidos.push({ ...c, motivo: "de los más baratos" });

  const porValor = quedan().sort((a, b) => valor(b, suelo) - valor(a, suelo) || porId(a, b));
  for (const c of porValor.slice(0, deValor)) elegidos.push({ ...c, motivo: "mejor nota por lo que cuesta" });

  const tope = mediana(validos.map((c) => completo(c.precio))) ?? Infinity;
  const porNota = quedan()
    .filter((c) => completo(c.precio) <= tope)
    .sort(
      (a, b) =>
        (b.alojamiento.nota ?? 0) - (a.alojamiento.nota ?? 0) ||
        (b.alojamiento.opiniones ?? 0) - (a.alojamiento.opiniones ?? 0) ||
        porId(a, b),
    );
  for (const c of porNota.slice(0, cuantos - elegidos.length))
    elegidos.push({ ...c, motivo: "mejor nota sin pasar de la mediana" });

  return elegidos;
}
