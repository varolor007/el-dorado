// Lo que comparten las capas del destino (bloque 14), en datos: de qué capas se habla, por qué puede faltar una entera,
// para quién es un precio y los días de la semana de un horario. Son generales: ninguna lleva el nombre de un destino.
// Lo de cada capa va en su propio archivo (`capa_moverse.ts`, `capa_destino.ts`, `capa_entradas.ts` y
// `presupuesto.ts`), y su forma en el viaje, en `agent/output/capas.ts`.

/** Los pasos de las tres capas que hace un asiento, por su id en `agent/data/pasos.ts`. */
export const CAPAS_DE_IA = ["getting_around", "local_knowledge", "tickets"] as const;
export type CapaDeIA = (typeof CAPAS_DE_IA)[number];

/**
 * Por qué falta una capa entera, como el del calendario: su asiento todavía no tiene contrato y no se lanza; falló o
 * no entregó; lo que entregó no pasó su puerta tras sus vueltas; o tardó más que su tope y se siguió sin ella. El
 * viaje sale igual, y lo dice.
 */
export const FALTAS_DE_UNA_CAPA = ["no_contract", "failed", "rejected", "late"] as const;
export type FaltaDeUnaCapa = (typeof FALTAS_DE_UNA_CAPA)[number];

/**
 * Para quién es un precio: para cualquiera, un adulto, un niño, un bebé, un joven, un estudiante, un mayor, una
 * familia o un grupo. Lo que diga la página con otras palabras va en la más cercana, con sus edades si las da.
 */
export const PARA_QUIEN = ["any", "adult", "child", "infant", "youth", "student", "senior", "family", "group"] as const;
export type ParaQuien = (typeof PARA_QUIEN)[number];

/** Los días de la semana de un horario, de lunes a domingo, como los cuenta el código con la fecha. */
export const DIAS_DE_LA_SEMANA = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DiaDeLaSemana = (typeof DIAS_DE_LA_SEMANA)[number];

/** Lo más largo de un nombre propio de fuera (un mercado, un plato, un barrio, un aeropuerto): se enseña tal cual. */
export const LETRAS_DE_UN_NOMBRE = 80;

/** Lo más que una capa puede decir de días en un horario o de cosas en una lista: más no es un dato, es un error. */
export const LO_MAS_DE_UNA_LISTA = 60;

/**
 * Por qué no se miró la entrada de un sitio, si solo se sabe lo que dicen los datos abiertos (14.7): pasó del tope de
 * sitios, su tanda falló (o tardó, o no pasó su puerta), o lo añadiste tú después y todavía no se ha mirado.
 */
export const SIN_MIRAR = ["over_limit", "failed", "added"] as const;
export type SinMirar = (typeof SIN_MIRAR)[number];
