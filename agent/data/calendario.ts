// El del calendario, en datos: de qué puede tratar un hallazgo, cuántos se cuentan y cuánto se puede mover una
// ventana. Son de partida: se ajustan con casos reales. La forma de lo que entrega el asiento está en
// `scripts/formas.ts`.

/** Las cuatro clases de un hallazgo: bloquea, encarece, molesta o favorece. */
export const CLASES_DE_AVISO = ["blocks", "raises", "bothers", "favours"] as const;
export type ClaseDeAviso = (typeof CLASES_DE_AVISO)[number];

/**
 * De qué trata un hallazgo: el tiempo habitual, la temporada, una fiesta o un evento de allí, un festivo de allí, un
 * festivo de donde se sale, lo que cierra, lo que se agota con meses y los días que pide el destino.
 */
export const TEMAS_DEL_CALENDARIO = [
  "weather",
  "season",
  "festival",
  "event",
  "public_holiday",
  "holiday_at_home",
  "closure",
  "sells_out",
  "days_needed",
] as const;
export type TemaDelCalendario = (typeof TEMAS_DEL_CALENDARIO)[number];

/** Los temas que son de donde se sale, no del destino. */
export const DE_DONDE_SE_SALE: readonly TemaDelCalendario[] = ["holiday_at_home"];

/** Cinco avisos como mucho, como dice la hoja. */
export const AVISOS_DE_FECHAS = 5;

/** Cuántas ventanas mejores puede proponer, como mucho, a quien puede mover sus fechas. */
export const VENTANAS = 2;

/** Cuántos días se puede mover una ventana, como mucho, antes o después de las fechas del viaje. */
export const LO_MAS_QUE_SE_MUEVE = 21;

/** Lo más largo del nombre propio de una fiesta o de un evento, que se enseña tal cual, con su fuente. */
export const LETRAS_DE_UN_NOMBRE_DE_FUERA = 80;

/** Los días que puede pedir un destino, como mucho: lo de más no es un dato. */
export const DIAS_QUE_PIDE = 60;
