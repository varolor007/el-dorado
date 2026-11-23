# La revisión de la tanda 3: el agente hace el viaje

Al cerrar la tanda, el 23-nov-2026, la revisaron tres adversarios que no la hicieron, cada uno en su copia del
repositorio, sin red y sin tocar nada: solo informar. Cada hallazgo se comprobó leyendo el código o con una prueba
suelta, y lo que se arregló lleva su prueba en la batería, que pasó de 297 pruebas a 394. Aquí queda cada hallazgo
con lo que se hizo. Lo que toca a la hoja, y por tanto es del PM, va al final.

## La mecánica: lo que se rompe

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1, bloqueante | Un rojo de una puerta de código (la 4 o la 9) paraba el run, pero la llamada siguiente pasaba por encima y acababa en un viaje mal hecho | El paro queda escrito y el run sigue parado hasta que quien lo lleva lo reabre (4.8) |
| B2, bloqueante | El transporte se sumaba una sola vez a un total que era para todo el grupo | Un precio dice para cuántos es, y se cuenta para todos los que viajan (4.6). Queda comprobar con la fuente, en una llamada, que su precio guardado es por persona |
| B3, bloqueante | Si la casa se cortaba a medio preparar los puestos de mirar, el run no se podía retomar | Lo ya montado y sellado vale, lo que quedó a medias se rehace y lo que guarda la casa se escribe de una vez (4.8) |
| I1 | El ritmo repartía días que su propia puerta rechazaba, y la investigación se paraba sin arreglo | El ritmo mira lo mismo que la puerta 9 antes de poner una parada; lo que no cabe se queda fuera con su porqué (4.10) |
| I2 | Al ensanchar la búsqueda se volvía a los mínimos altos y se perdía lo que había en la zona | Lo de la zona se queda y va por delante; lo de fuera entra en los huecos (4.1) |
| I3 | Un número pegado a una letra, o con espacio de miles, no se leía bien en las puertas 6 y 7 | Lectura nueva de números, en cualquier escritura y forma (4.7) |
| I4 | La puerta 9 no miraba los números del porqué de un sitio | Solo valen los de lo que se le dijo de ese sitio (4.7) |
| I5 | Promesas que pasaban («encantará», «los más baratos») y palabras de todos los días que daban rojo («the seat») | Palabras con tilde y en plural, y fuera las que tienen otro sentido en una guía (4.7) |
| I6 | Sin alojamiento, o con todos descartados, se gastaban los asientos y el viaje salía «hecho» | Se para tras la búsqueda, o al montar la tabla, y se dice por qué (4.8) |
| I7 | Un asiento que volvía a entregar cambiaba el viaje pero no la tabla | Lo ya juzgado se lee del disco, y la nota del viaje se comprueba contra la tabla (10.7 y 4.8) |
| I8 | La puerta 7 rechazaba números de las comprobaciones del que cruza, que son de su material | Esos números valen: ya pasaron su puerta contra la tabla (4.7) |
| M2 | La manera distinta podía estar por debajo de la nota mínima | La puerta 6 lo mira y el contrato lo dice (4.7 y 4.5) |
| M3 | El ahorro mínimo que merece contarse no lo usaba nadie, y estaba en dinero | Va en proporción al total, y lo mira la puerta 6 (4.6) |
| M4 | Una entrega con una forma rara rompía la puerta y el run | Es un rojo con su vuelta (4.8) |
| M5 | Un precio movido en otra moneda se daba por bueno | No vale (4.6) |
| M6, M7 | Un sitio con clase blanda y concreta se quedaba sin clase; una fila sin coordenadas era un sitio en el punto cero | Arreglado (3.10) |
| M8 | Una lista de servicios vacía descartaba al alojamiento | Una lista vacía no dice nada (3.2) |
| M9 | Dos alojamientos vecinos con el nombre de dos barrios se daban por el mismo | Ya no (3.4) |
| M10 | El que cruza podía pedir dos veces lo mismo | Es un rojo, y el contrato lo dice (4.6 y 4.5) |
| M11 | Una ruta de dos bases quemaba las tres vueltas del asiento | Se para tras la ruta, con un asiento gastado, y se dice (4.5) |
| M12 | Los dos avisos de siempre se comprobaban contra sí mismos | Los pone la casa en todo viaje, y los pide la comprobación del viaje (1.1) |
| M13 | Lo que se bajó o se ensanchó en la búsqueda se quedaba en un archivo | Llega al primer vistazo del viaje (4.1 y 10.6) |
| M15 | Una parada quitada dos veces salía dos veces | Arreglado (4.10) |
| M1 | Una entrega a medio escribir cuenta como entregada y quema una vuelta | Pendiente: se arregla con el lanzador (2.7), que sabe cuándo acabó el asiento |
| M14 | Las quejas graves cuentan cualquier opinión, de cualquier fecha, también una negación | Pendiente: decide el PM, abajo |

## La seguridad: lo que deja pasar lo que no debe

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1, bloqueante | Texto libre de un asiento llegaba a la pantalla del viajero sin ninguna puerta: una orden metida en una opinión acababa como «lo mejor» de un alojamiento, con un enlace y un teléfono | A la ficha solo llegan claves (10.7); un texto para el viajero no lleva enlaces, correos ni teléfonos y mide quinientas letras como mucho; y los números del que explica son solo los de la casa (4.7) |
| B2, bloqueante para el 2.7 | Un asiento con herramientas de archivos puede rehacer su sello o dar un paso por hecho; un enlace simbólico rompía la casa o le hacía leer de fuera | Un enlace en un puesto es un rojo, y la puerta de todos no se rompe (2.3). Lo demás pide que el asiento trabaje confinado: queda escrito en el 2.7, antes de lanzar asientos con una clave |
| I3 | Un idioma como «constructor» dejaba el viaje sin sus dos avisos | Arreglado (4.7 y 1.1) |
| I4 | La etiqueta de un sitio de los datos abiertos y el nombre del destino salían sin mirar hacia otra fuente | Solo entra lo que es un nombre (3.10 y 1.1) |
| I5 | El enlace de una oferta llegaba a la web tal cual | Solo https y sin claves dentro, en el enchufe y en la comprobación del viaje (3.2) |
| I6 | Lo entendido se daba por bueno sin mirarlo | La mitad de código de la puerta 1, al abrir y al seguir un run (1.1) |
| I7 | La escalera de la búsqueda no tenía tope: miles de peticiones con unas fechas sin disponibilidad | Cada precio se pide una vez, y sin disponibilidad no se sigue (4.1) |
| M8 | La casa bajaba fotos de máquinas de dentro con un punto al final del nombre, y sin tope de peso real | Arreglado (3.6). Queda una lista de máquinas permitidas por fuente |
| M9 | El mensaje de error de una fuente llegaba al viajero y a un asiento | Ya no (10.7, 4.6) |
| M10, M11 | Un enlace de la fuente de vuelos podía salir de su web; con una clave se seguían redirecciones | Arreglado (3.2) |
| M12 | La prueba del repositorio no miraba por dónde está de verdad una carpeta | Arreglado en parte (4.9, 0.3). Queda un buscador de claves de verdad en GitHub |
| M13 | La mesa por defecto, en la carpeta temporal y abierta | Las carpetas de un viaje se crean solo para quien las crea (4.9). Queda exigir la mesa en el entorno |
| M14 | El buscador de lugares pasaba una caja sin mirar | Arreglado (10.4). Quedan el límite de peticiones y la puerta de la casa a la web, que son del 2.8 |
| M15 | Una marca enorme en el autor de una foto paraba la casa | Arreglado (3.10) |
| M17 | Las fechas y el grupo de un precio los copia el enchufe de lo que se pidió | Dicho en la hoja, en la puerta 4, como lo que falta |
| M20 | Peticiones repetidas | Arreglado (4.6) |
| M16, M18, M19 | Las quejas graves deciden solas; un asiento que pasa de su tope sigue gastando; lo entendido va entero a cuatro asientos | Pendientes: el primero es del PM; los otros dos van con el lanzador (2.7) |

## Las biblias y lo general: si es lo que dicen la hoja y el plan, y si sirve para cualquier viaje

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| A1, bloqueante | El vuelo, una sola vez, viaje quien viaje | Como el B2 de la mecánica (4.6) |
| A4, bloqueante | Sin alojamiento el viaje «salía», y lo que se bajaba no se le decía al viajero | Se para y se dice; lo bajado llega al primer vistazo (4.8, 4.1) |
| A5, bloqueante | El contrato de la ruta decía una cosa y su puerta otra con un viaje de varias bases | La casa para tras la ruta y lo dice; el contrato se lo cuenta al asiento (4.5) |
| A2, bloqueante | Todo el grupo, en una habitación: con una familia la búsqueda bajaba mínimos y se alejaba sin decir por qué | Si muchos pasan y ninguno tiene precio, no se baja ni se ensancha, y se dice (4.1). Repartir al grupo en habitaciones es del PM, abajo |
| A3, bloqueante | Todo se mide andando: un parque en coche salía sin sentido | Un viaje que no se anda se para y se dice (4.10). Saber cómo se mueve el viajero es del PM, abajo |
| A6 | La puerta 7 no leía números en medio mundo | Arreglado (4.7) |
| A7 | Los ejemplos de los contratos eran el viaje probado | Ejemplos inventados, de dos clases y sin idioma ni moneda (4.2, 4.5, 4.6, 4.7 y 4.9) |
| A8 | «Invierno» se deducía del mes, sin saber el hemisferio | La estación la pone el código en la ficha, por la latitud (4.2) |
| A9 | El viajero leía en inglés lo que escribió un asiento | A la ficha solo llegan claves, y la web las dice en su idioma (10.7) |
| A10 | Sesenta sitios para una noche o para tres semanas | Van con las noches (4.9). Quedan: los nombres y los resúmenes en el idioma del lugar, y los sitios de fuera de la caja |
| A14 | La web decía cosas fijas que eran del viaje de prueba | Plurales, niños, cuántas maneras, la clase del transporte, lo que buscas y el buscador con naturaleza (10.4, 10.5 y 10.6) |
| Puerta 9 | Los días que pasaban la puerta no eran los que se entregaban | Lo que se entrega pasa la puerta otra vez (4.10) |
| Cajas «hecho» | Siete cajas de la hoja decían «hecho» y eran «en parte» | La hoja tiene ahora «en parte», y cada caja dice lo que le falta |
| «Estamos aquí» | El plan y la memoria seguían en la tanda 2 | Al día |
| A11, A12, A13, A15 | Lo imprescindible que no es del alojamiento; lo que no lleva estrellas; un solo caso inventado; sueltos | En parte: el filtro de estrellas no se manda si no se piden, y hay casos inventados nuevos (una familia, un pueblo, un viaje que no se anda, varias bases). Lo demás, abajo |

## Lo que queda, y de quién es

Del PM, porque toca la hoja:

1. **Cómo se mueve el viajero.** Hoy todo se mide a pie. Para un parque en coche o una ciudad grande en metro hace
   falta que lo entendido lo diga, y de dónde salen los tiempos. Hasta entonces, un viaje que no se anda se para.
2. **Las habitaciones de un grupo.** Hoy se pide una para todos. Hay que decidir cómo se reparte una familia.
3. **Un viaje de varias bases.** Falta de dónde sacar lo que dura un traslado.
4. **Lo que no lleva estrellas.** Una casa de 9,5 sin estrellas solo entra en el último escalón de mínimos.
5. **Las quejas graves.** Hoy descartan por palabras, sin un asiento que lo confirme.
6. **La segunda mirada a ciegas.** La hoja la nombra; la investigación mira cada alojamiento una vez.
7. **Los idiomas.** La web y las palabras prohibidas, en inglés y en español.

De la obra, con su punto del plan: el asiento confinado y lo que cuelga del lanzador (2.7), la puerta de la casa a
la web (2.8), y comprobar con una llamada que el precio guardado de un vuelo es por persona (3.3).
