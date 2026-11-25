// El presupuesto entero (14.5), en datos: sus partes y de dónde puede salir cada una. Es código, sin IA. Las tres
// maneras se siguen comparando por dormir y llegar: el presupuesto va aparte y no cambia qué manera gana.

import { entera } from "./palabras.ts";

/**
 * Las partes que se suman: dormir, llegar (el transporte del viaje), llegar de donde se aterriza a donde se duerme,
 * moverse allí y las entradas. Las comidas no son una parte: van aparte, como una horquilla por día.
 */
export const PARTES_DEL_PRESUPUESTO = ["lodging", "transport", "arrival", "getting_around", "tickets"] as const;
export type ParteDelPresupuesto = (typeof PARTES_DEL_PRESUPUESTO)[number];

/** De dónde sale una parte: un precio con su fuente, una cuenta del código con precios con fuente, o no se sabe. */
export const ORIGENES_DE_UNA_PARTE = ["priced", "computed", "unknown"] as const;
export type OrigenDeUnaParte = (typeof ORIGENES_DE_UNA_PARTE)[number];

/**
 * Cuántas comidas de pago se cuentan por día y por persona, de partida (es del PM): la comida y la cena. El desayuno
 * va muchas veces con el alojamiento, y lo que suele costar una comida lo dice el que conoce el destino.
 */
export const COMIDAS_AL_DIA = 2;

/**
 * Las maneras de moverse que se pagan por coche y no por persona, y cuántos caben en uno, de partida (es del PM): un
 * taxi para cuatro se paga una vez; para seis, dos. Las demás se pagan por persona, con el precio de cada uno.
 */
export const SE_PAGAN_POR_COCHE = ["taxi", "ride_hailing"] as const;
export const PLAZAS_DE_UN_COCHE = 4;

/**
 * Para quién es un precio que nunca se le pone a nadie sin saber más: el de estudiante pide un carné, y los de una
 * familia o un grupo no dicen quiénes entran. Un mayor solo se cuenta como adulto: de los adultos no se sabe la edad.
 */
export const PRECIOS_QUE_NO_SE_PONEN = ["student", "family", "group", "senior"] as const;

/**
 * Qué precio se coge si a una persona le valen varios, de partida (es del PM, y está apuntado): en las entradas y en
 * llegar a donde se duerme, el más barato (lo gratis, antes); en los billetes de moverse allí, el más caro (con tarjeta
 * o en papel), para que la cuenta no se quede corta. Lo leen las dos cuentas (`elQueSeCoge`): cambiarlo es esta línea.
 */
export const SI_VALEN_VARIOS = { entradas: "cheapest", llegar: "cheapest", billetes: "dearest" } as const;
export type CualSeCoge = (typeof SI_VALEN_VARIOS)[keyof typeof SI_VALEN_VARIOS];

/**
 * Las palabras con que un texto habla del presupuesto entero, en los idiomas en que se escribe hoy. Una frase del que
 * cruza o del que explica que las dice no puede traer una cifra de dinero que no sea la de la cuenta (las puertas 6 y
 * 7): el total de una manera es dormir y llegar, no el viaje entero.
 */
export const DEL_PRESUPUESTO_ENTERO = entera(
  [
    "budgets?|whole trip|entire trip|full trip|all[- ]in(?:clusive)?|everything included|all included|all told",
    // El viaje como lo que cuesta: «the trip costs you», «overall trip spend», «the cost of your trip».
    "(?:the|your|this|our) trip (?:costs?|will cost|comes? to|totals?|adds? up to|sets? you back|runs? you)",
    // Una excursión o un billete de ida y vuelta no son el viaje: «the day trip costs», «the round trip price».
    "(?<!(?:day|boat|round|return|side|one-way)[ -])trip (?:costs?|spend(?:ing)?|price|total)",
    "(?:cost|price|spend(?:ing)?) of (?:the|your|this) trip",
    "presupuestos?|todo incluido|viaje (?:entero|completo)|todo el viaje",
    // «el viaje te sale por», «tu viaje cuesta», «el coste del viaje», «lo que gastarás en el viaje».
    "(?:el|tu|vuestro|este) viaje (?:te |os |les |nos )?" +
      "(?:sale|saldrá|cuesta|costará|suma|asciende|va a (?:costar|salir))",
    "(?:coste|costo|precio|gasto)s? (?:total )?de(?:l| tu| vuestro) viaje|gastar[áa]s? en (?:el|tu) viaje",
  ].join("|"),
);
