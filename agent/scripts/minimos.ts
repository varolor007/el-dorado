// Los mínimos: lo que tiene que cumplir un alojamiento para seguir adelante. La fuente ya filtra, pero no se la cree:
// cada uno se vuelve a comprobar aquí, y lo que no llega se descarta con su motivo.

import type { Alojamiento, Minimos } from "../tools/fuentes/tipos.ts";

/** Lo que no pasa: quién es, dónde está (para pintarlo en el mapa mientras se investiga) y por qué. */
export type Descarte = { id: string; nombre: string; lat: number; lon: number; motivo: string };

/** Por qué no pasa un alojamiento, o null si pasa. Un dato que falta no se da por bueno. */
export function motivoDeDescarte(a: Alojamiento, m: Minimos): string | null {
  if (a.nota === null) return "sin nota";
  if (a.nota < m.nota) return `nota ${a.nota}, por debajo de ${m.nota}`;
  if (a.opiniones === null) return "sin número de opiniones";
  if (a.opiniones < m.opiniones) return `${a.opiniones} opiniones, menos de ${m.opiniones}`;
  // Las estrellas se le piden a quien las lleva. Una casa, un piso o una pensión no las llevan, y no por eso son
  // peores: se juzgan por su nota y sus opiniones (el PM, 24-nov).
  if (m.estrellas <= 0 || a.estrellas === null) return null;
  if (a.estrellas < m.estrellas) return `${a.estrellas} estrellas, menos de ${m.estrellas}`;
  return null;
}

export function separar(todos: Alojamiento[], m: Minimos): { dentro: Alojamiento[]; fuera: Descarte[] } {
  const dentro: Alojamiento[] = [];
  const fuera: Descarte[] = [];
  for (const a of todos) {
    const motivo = motivoDeDescarte(a, m);
    if (motivo === null) dentro.push(a);
    else fuera.push({ id: a.id, nombre: a.nombre, lat: a.lat, lon: a.lon, motivo });
  }
  return { dentro, fuera };
}
