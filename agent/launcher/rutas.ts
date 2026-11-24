// Para probar la fuente de rutas con sitios de verdad, desde la terminal: de cada par de puntos, lo que da por cada
// manera de ir, al lado de la cuenta aproximada de la casa. No guarda nada: lo que saca se lee y se va.
//
//   GEOAPIFY_KEY=<la clave> node agent/launcher/rutas.ts <lat,lon> <lat,lon> [<lat,lon> <lat,lon> ...]
//
// Los puntos van de dos en dos: de dónde y a dónde. Detrás de un proxy, con NODE_USE_ENV_PROXY=1 delante. Cada par
// son hasta cuatro pedidos a la fuente: uno andando, uno en coche y uno o dos en transporte.

import { MANERAS_DE_IR, type ManeraDeIr } from "../data/moverse.ts";
import { andando, trayecto, type Punto } from "../tools/distancias.ts";
import { encendida } from "../tools/fuentes/enchufes.ts";
import { caminoEntre } from "../tools/fuentes/geoapify.ts";

/** Un punto escrito como «lat,lon»; null si no lo es. */
export function puntoDe(escrito: string): Punto | null {
  const partes = escrito.split(",");
  const lat = Number(partes[0]);
  const lon = Number(partes[1]);
  const vale =
    partes.length === 2 && partes.every((p) => p.trim() !== "") && Number.isFinite(lat) && Number.isFinite(lon);
  return vale && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

const km = (metros: number): string => (metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`);

async function principal(): Promise<number> {
  const escritos = process.argv.slice(2);
  const puntos = escritos.map(puntoDe);
  if (escritos.length < 2 || escritos.length % 2 !== 0 || puntos.some((p) => p === null)) {
    console.error("Uso: rutas.ts <lat,lon> <lat,lon> [<lat,lon> <lat,lon> ...]: los puntos, de dos en dos");
    return 2;
  }
  if (!encendida("geoapify")) throw new Error("la fuente de rutas está apagada");
  for (let i = 0; i < puntos.length; i += 2) {
    const de = puntos[i] as Punto;
    const a = puntos[i + 1] as Punto;
    const casa = trayecto(andando(de, a));
    console.log(`\n${escritos[i]} -> ${escritos[i + 1]}`);
    console.log(`  la casa, de partida: ${km(casa.metros)}, ${casa.maneras.join(" o ")}, unos ${casa.minutos} min`);
    for (const manera of MANERAS_DE_IR.map((m) => m.id) as ManeraDeIr[]) {
      const c = await caminoEntre(de, a, manera);
      const dicho = c === null ? "no hay" : `${km(c.metros)}, ${c.minutos} min${c.aproximado ? " (aproximado)" : ""}`;
      console.log(`  ${manera.padEnd(8)} ${dicho}`);
    }
  }
  return 0;
}

if (import.meta.main) {
  principal().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(2);
    },
  );
}
