// Los niveles de la ficha de cómo es un alojamiento, escritos como código: los mismos que lee el asiento en su
// contrato. Con ellos la puerta 5 comprueba que cada nivel es de su lista. Una prueba mira que el contrato y este
// archivo digan lo mismo.

export const SIN_SABER = "unknown";

/** Cada campo de la ficha, con sus niveles de mejor a peor; los del estilo no tienen orden: solo se nombra. */
export const CAMPOS: Record<string, string[]> = {
  look: ["new_or_renovated", "good_condition", "dated", "worn"],
  upkeep: ["well_kept", "some_complaints", "neglected"],
  style: ["modern_plain", "classic", "character", "chain", "rustic"],
  room_space: ["roomy", "fits", "tight"],
  room_light: ["bright", "average", "dark"],
  bathroom: ["modern", "correct", "dated"],
  view: ["open", "street", "inner_or_wall"],
  gym: ["full", "maintenance", "token", "none"],
  pool: ["swim", "bathe", "dip", "none"],
};

/** Los campos sin orden: dos niveles distintos no están ni cerca ni lejos. */
export const SIN_ORDEN = ["style"];

/** Los campos que son de la habitación de ese precio: una foto del hotel en general no los prueba. */
export const DE_LA_HABITACION = ["look", "style", "room_space", "room_light", "bathroom", "view"];

/** Lo que se ve: su prueba lleva al menos una foto. Cómo se ve la habitación no lo dice una opinión sola. */
export const PIDEN_FOTO = ["look"];

/** Lo que solo cuentan los viajeros: una foto oficial no lo prueba. Cómo lo mantienen no sale en las fotos. */
export const SOLO_DE_OPINIONES = ["upkeep"];

/** Lo que puede enseñar una foto, en el inventario. */
export const MUESTRA = ["room", "bathroom", "view", "gym", "pool", "common", "food", "exterior", "other"];

/** Para probar un campo, la foto tiene que estar inventariada como algo que lo enseña. */
export const ENSENA: Record<string, string[]> = {
  look: ["room", "bathroom", "view"],
  upkeep: [],
  style: ["room", "bathroom", "view"],
  room_space: ["room", "bathroom", "view"],
  room_light: ["room", "bathroom", "view"],
  bathroom: ["room", "bathroom", "view"],
  view: ["room", "bathroom", "view"],
  gym: ["gym"],
  pool: ["pool"],
};

/** Las instalaciones que pueden no existir, y cómo las nombra la lista de servicios de una ficha. */
export const INSTALACIONES: Record<string, RegExp> = {
  gym: /\b(gym|fitness)/i,
  pool: /\bpool\b(?!\s*table)|swimming/i,
};

/**
 * De qué hablan las opiniones. La lista es cerrada para que la web lo diga en el idioma del viajero sin que pase por
 * ella una frase del asiento; lo que no cabe en ninguno va en `other`, que no se enseña.
 */
export const OTRO_TEMA = "other";
export const TEMAS_DE_OPINIONES = [
  "cleanliness",
  "maintenance",
  "noise",
  "room_size",
  "bed",
  "bathroom",
  "light",
  "temperature",
  "smell",
  "view",
  "breakfast",
  "food",
  "staff",
  "location",
  "access",
  "parking",
  "wifi",
  "gym",
  "pool",
  "common_areas",
  "kitchen",
  "privacy",
  "safety",
  "value",
  OTRO_TEMA,
];
export const TONOS = ["good", "bad", "mixed"];
export const MENCIONES = ["one", "a_few", "several"];
export const CLASES_DE_PRUEBA = ["photo", "review", "sheet"];
export const ETIQUETAS_DE_AVISO = ["seen", "deduced"];

/** Lo que de la ficha de datos puede citarse como prueba, por su ruta. */
export const DE_LA_FICHA = [
  "room.name",
  "room.size_m2",
  "room.beds",
  "room.declared_views",
  "services",
  "stay.check_in",
  "stay.check_out",
  "photos",
];
