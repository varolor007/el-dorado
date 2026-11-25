// El presupuesto entero (14.5), en datos: sus partes y de dónde puede salir cada una. Es código, sin IA. Las tres
// maneras se siguen comparando por dormir y llegar: el presupuesto va aparte y no cambia qué manera gana.

/**
 * Las partes que se suman: dormir, llegar (el transporte del viaje), llegar de donde se aterriza a donde se duerme,
 * moverse allí y las entradas. Las comidas no son una parte: van aparte, como una horquilla por día.
 */
export const PARTES_DEL_PRESUPUESTO = ["lodging", "transport", "arrival", "getting_around", "tickets"] as const;
export type ParteDelPresupuesto = (typeof PARTES_DEL_PRESUPUESTO)[number];

/** De dónde sale una parte: un precio con su fuente, una cuenta del código con precios con fuente, o no se sabe. */
export const ORIGENES_DE_UNA_PARTE = ["priced", "computed", "unknown"] as const;
export type OrigenDeUnaParte = (typeof ORIGENES_DE_UNA_PARTE)[number];
