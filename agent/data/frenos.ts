// Los frenos de la puerta de la casa, en números: lo que se deja pedir a cada cliente, a cada cuenta y a toda la
// casa antes de decir que espere. Son de partida: los firma el PM y se ajustan con casos reales. El del primer
// vistazo va aparte, en `vistazo.ts`.
//
// Un cliente es quien pide, como lo dice la web: un resumen de su dirección, nunca la dirección. Si la web no lo
// dice, solo cuentan el freno de cada cuenta y el de toda la casa.

export const FRENOS_DE_LA_PUERTA = {
  /**
   * Fallar al entrar. Quien se equivoca con un correo desde un mismo sitio espera; su dueño, desde otro sitio, no.
   * Si con ese correo se falla mucho desde muchos sitios, espera también quien no haya entrado antes desde el suyo.
   */
  fallos: {
    minutos: 15,
    /** Con un correo y desde un mismo cliente. */
    porCorreoYCliente: 5,
    /** Con un correo, desde todos los clientes juntos. */
    porCorreo: 30,
    /** Desde un cliente, con todos los correos juntos. */
    porCliente: 20,
  },
  /** Pedir entrar o registrarse, salga bien o mal: cada intento cuesta pasar una contraseña, que es caro. */
  intentos: { minutos: 15, porCliente: 30, enLaCasa: 600 },
  /** Cuentas nuevas: cada una abre viajes y sesiones en la mesa. */
  registros: { minutos: 60, porCliente: 5, enLaCasa: 60 },
  /** Cuántas cuentas caben en la casa, en total. */
  cuentasDeLaCasa: 5000,
  /** Cuántas contraseñas se pasan a la vez; las demás esperan en cola, y si la cola está llena, «ocupado». */
  contrasenas: { aLaVez: 4, enCola: 32, segundosDeEspera: 5 },
  /** Cuántas sesiones abiertas puede tener una cuenta: al abrir una de más, se cierra la más vieja. */
  sesionesDeUnaCuenta: 20,
  /** Cuántos viajes puede tener un dueño, y cuántos caben en toda la casa. */
  viajes: { deUnDueno: 200, enLaCasa: 20_000 },
  /** Cuántos escuchan en vivo a la vez: a un viaje, a los viajes de una cuenta y a toda la casa. */
  oyentes: { deUnViaje: 8, deUnaCuenta: 16, enLaCasa: 300 },
  /** Comprobar una clave de IA contra la IA: por cuenta y por cliente. */
  claves: { minutos: 60, porCuenta: 10, porCliente: 20 },
  /** Cuántas cuentas distintas recuerda cada freno en la memoria, como mucho. */
  enMemoria: 10_000,
};

export type FrenosDeLaPuerta = typeof FRENOS_DE_LA_PUERTA;
