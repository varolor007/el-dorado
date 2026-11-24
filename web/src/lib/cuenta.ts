"use client";

// Tu cuenta, vista desde el navegador: quién eres, y registrarte, entrar, salir y poner tu clave de IA. Todo pasa
// por la web hasta la casa; aquí no se guarda nada, y la sesión va en una cookie que este código no puede leer.

import { useEffect, useState, useSyncExternalStore } from "react";
import { grabadoQueVale } from "./grabado.ts";
import type { Grabado } from "./usar.ts";

/** Con qué piensa tu cuenta: con la cuenta de la casa, con tu clave, o con nada todavía. */
export type ConQuePiensa = "house" | "key" | null;
export type Cuenta = {
  id: string;
  email: string;
  key: { hint: string; since: string } | null;
  thinks_with?: ConQuePiensa;
};
/** `undefined` mientras se mira; `null` sin sesión; "no_house" si esta web no tiene casa a la que preguntar. */
export type EstadoDeLaCuenta = Cuenta | null | "no_house" | undefined;

type Dicho = { estado: number; cuerpo: Record<string, unknown> };

/** Le pide algo a la casa, por la web. Si no se llega, lo dice como un fallo más, con su clave. */
export async function pideALaCasa(metodo: string, ruta: string, cuerpo?: unknown): Promise<Dicho> {
  try {
    const r = await fetch(`/api/house/${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      cache: "no-store",
    });
    return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { estado: 0, cuerpo: { error: "house_down" } };
  }
}

// Una sola cuenta para toda la web: quien la cambia avisa a todos los que la miran.
let actual: EstadoDeLaCuenta = undefined;
let pedida = false;
const oyentes = new Set<() => void>();
const pon = (cuenta: EstadoDeLaCuenta): void => {
  actual = cuenta;
  for (const avisa of oyentes) avisa();
};

async function mira(): Promise<void> {
  const r = await pideALaCasa("GET", "cuenta");
  if (r.estado === 200) pon(r.cuerpo.account as Cuenta);
  else if (r.cuerpo.error === "no_house" || r.cuerpo.error === "house_down") pon("no_house");
  else pon(null);
}

/** El fallo de una petición, por su clave; null si salió bien. Con lo que haya que esperar, si lo dice. */
export type Fallo = { clave: string; espera?: number } | null;

async function hace(metodo: string, ruta: string, cuerpo?: unknown): Promise<Fallo> {
  const r = await pideALaCasa(metodo, ruta, cuerpo);
  if (r.estado >= 200 && r.estado < 300) {
    pon(ruta === "sesiones" && metodo === "DELETE" ? null : ((r.cuerpo.account as Cuenta | undefined) ?? actual));
    return null;
  }
  if (r.cuerpo.error === "no_session") pon(null);
  const espera = typeof r.cuerpo.wait === "number" ? r.cuerpo.wait : undefined;
  return { clave: typeof r.cuerpo.error === "string" ? r.cuerpo.error : "other", espera };
}

export const registrarse = (email: string, password: string): Promise<Fallo> =>
  hace("POST", "cuentas", { email, password });
export const entrar = (email: string, password: string): Promise<Fallo> =>
  hace("POST", "sesiones", { email, password });
export const salir = (): Promise<Fallo> => hace("DELETE", "sesiones");
export const ponerClave = (key: string): Promise<Fallo> => hace("PUT", "cuenta/clave", { key });
export const quitarClave = (): Promise<Fallo> => hace("DELETE", "cuenta/clave");

export function useCuenta(): EstadoDeLaCuenta {
  const cuenta = useSyncExternalStore(
    (avisa) => {
      oyentes.add(avisa);
      return () => oyentes.delete(avisa);
    },
    () => actual,
    () => undefined,
  );
  useEffect(() => {
    if (pedida) return;
    pedida = true;
    void mira();
  }, []);
  return cuenta;
}

/** Lo que la casa dice de un viaje en una lista: quién es, cómo está y a dónde va. */
export type ResumenDeViaje = {
  id: string;
  state: "started" | "confirmed" | "researching" | "on_map" | "closed";
  version: number | null;
  destination: string | null;
  check_in: string | null;
  check_out: string | null;
};

/** Tus viajes, los de tu cuenta. `undefined` mientras llegan o si no has entrado. */
export function useMisViajes(): ResumenDeViaje[] | undefined {
  const cuenta = useCuenta();
  const quien = typeof cuenta === "object" && cuenta !== null ? cuenta.id : null;
  const [viajes, setViajes] = useState<ResumenDeViaje[] | undefined>(undefined);
  useEffect(() => {
    setViajes(undefined);
    if (quien === null) return;
    let vivo = true;
    void pideALaCasa("GET", "viajes").then((r) => {
      if (vivo)
        setViajes(r.estado === 200 && Array.isArray(r.cuerpo.trips) ? (r.cuerpo.trips as ResumenDeViaje[]) : []);
    });
    return () => {
      vivo = false;
    };
  }, [quien]);
  return viajes;
}

/**
 * Un viaje tuyo que ya está en el mapa, traído de la casa, con la misma forma que el grabado: las pantallas no
 * distinguen uno de otro. `undefined` mientras llega; `null` si no lo hay, no es tuyo o no tiene la forma de hoy.
 */
export function useViajeDeLaCasa(id: string | null): Grabado | null | undefined {
  const [viaje, setViaje] = useState<Grabado | null | undefined>(undefined);
  useEffect(() => {
    setViaje(undefined);
    if (id === null) return;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return setViaje(null);
    let vivo = true;
    void pideALaCasa("GET", `viajes/${id}/version`).then((r) => {
      if (vivo) setViaje(r.estado === 200 ? grabadoQueVale({ viaje: r.cuerpo.trip, sucesos: r.cuerpo.events }) : null);
    });
    return () => {
      vivo = false;
    };
  }, [id]);
  return viaje;
}
