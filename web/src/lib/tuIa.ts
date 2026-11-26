// Lo que se dice de tu IA en tu cuenta, sin pantalla: lo usan la página de tu cuenta y sus pruebas.

/**
 * Si tu correo piensa con la cuenta de la casa, eso manda: no te hace falta clave, y la que guardes se queda para más
 * adelante. Si no, tu clave, o que todavía no hay ninguna. Una casa de antes, que no dice con qué piensa, va por la
 * clave.
 */
export function tuIa(c: { key: object | null; thinks_with?: "house" | "key" | null }): "house" | "key" | "none" {
  if (c.thinks_with === "house") return "house";
  return c.key !== null ? "key" : "none";
}
