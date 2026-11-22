# Las puertas: qué miden y por qué lo miden bien

Borrador del 22-nov, a petición del PM: «muy bien que haya puertas, pero me tendrás que decir qué están midiendo y por
qué lo van a medir bien». Lo que mide cada una, cómo, y lo que no puede ver, con quién lo cubre.

## Lo que una puerta mide bien

Una puerta es código: mide bien lo que no pide criterio. Son tres cosas.

1. **Las cuentas y la forma.** Que el total sea la suma de sus partes, que las noches cuadren con las fechas, que un
   nivel sea de su lista, que no falte un campo, que no haya más de tres preguntas. Es aritmética: o cuadra o no.
2. **De dónde sale cada cosa.** Que lo que el asiento dice esté de verdad en lo que leyó. La casa guarda el material en
   bruto (lo que escribió el viajero, cada página consultada, cada foto, cada dato de la plataforma), y la puerta
   compara contra eso: la cita está en el texto del viajero, el dominio está en la lista de los oficiales, la foto es
   de ese alojamiento y de esa habitación. El asiento no se certifica a sí mismo.
3. **Que las piezas casen.** Que la hora de llegada cuadre con la entrada al alojamiento, que todas las piezas de un
   viaje sean de las mismas fechas y del mismo grupo, que cada país nuevo tenga sus papeles, que cada número de un
   texto sea el de la tabla.

## Lo que una puerta no mide

**Si un juicio es acertado.** El código ve que el nivel del gimnasio es de la lista y que tiene su foto; no ve si ese
nivel es el correcto. Ve que la respuesta de un requisito viene de una página oficial; no ve si el asiento la entendió
bien. Eso se cubre de otra forma, y hay que decirlo así:

- **El banco**: casos con la respuesta sabida, hechos por nosotros a mano. Mide al asiento, no a cada run: si no
  acierta lo bastante, ese asiento no sale. Se repite cada vez que cambia su contrato o su modelo.
- **Dos fuentes que tienen que coincidir**: en los papeles. Si no coinciden, es dudoso y se enseña.
- **Otra pasada a ciegas**: en los tres viajes del final, otro asiento vuelve a mirar los alojamientos sin ver el
  primer juicio; si no coinciden, se marca.
- **El viajero**: confirma con un toque lo que el agente entendió de él, antes de buscar; y en la salida ve la prueba
  de cada cosa (el enlace, la fecha, la foto).
- **Un revisor del viaje entero**, que no lo hizo (por hablar).

## Por qué van a medir bien

- **Leen el material en bruto**, que guarda la casa, y no lo que el asiento dice de sí mismo.
- **Cada puerta se prueba antes con trampas**: casos inventados con un fallo puesto a propósito. Si la puerta no lo
  caza, la que está mal es la puerta. Y con casos buenos: no puede dar rojo a lo que está bien.
- **Sus mínimos están escritos**, y nadie los toca durante un run: ni un asiento ni el conductor.
- **Lo que trae el código de la plataforma no se copia a mano**: un precio que no pasa por una IA no se puede copiar
  mal.
- **Cada puerta se mide en el ensayo**: cuántos rojos falsos da y cuántos fallos se le escapan.

## Puerta a puerta

| Puerta | Qué mide | Cómo | Lo que no ve, y quién lo cubre |
|---|---|---|---|
| El viaje, claro | Los campos base, completos; cada gusto y cada límite, con su cita; tres preguntas de más como mucho | Campo a campo; busca cada cita, letra a letra, en lo que escribió el viajero | Si un gusto se entendió bien: el viajero lo confirma con un toque antes de buscar |
| Los papeles | La tabla, completa; cada respuesta, de un dominio oficial y con su fecha; «en regla», con dos fuentes; los plazos, calculados | Cuenta las casillas; compara el dominio con nuestra lista; busca lo citado en la página guardada; calcula las fechas | Si entendió bien la página: las dos fuentes que tienen que coincidir, el banco de casos sabidos y el enlace, siempre a la vista |
| El calendario | Cada aviso, con su clase, su fuente y su fecha; el evento cae dentro del viaje; cinco como mucho | Compara fechas y cuenta | Si el aviso importa de verdad: el banco |
| La ruta | Las noches suman; cada traslado, con su duración y su fuente; dos noches por base; lo imprescindible, dentro | Suma y cuenta | Si la ruta es buena: el viajero la ve y la cambia, y el revisor |
| La búsqueda | Todo lo que sale cumple los mínimos; el precio es de esas fechas y de ese grupo; la misma consulta da lo mismo | Son pruebas del código, no de una IA | Lo que la plataforma no tiene o tiene mal: se dice de qué fuente sale cada dato |
| Cómo es | Cada nivel, de su lista; su prueba existe y es de esa habitación; sin prueba, «no se sabe» | Compara con las fotos y las opiniones guardadas | Si el nivel es el correcto: el banco de hoteles juzgados a mano, la otra pasada a ciegas y las fotos, a la vista |
| El cruce | Cada número es el de la tabla; las piezas, de las mismas fechas y grupo; cada palanca, con su estado; dos rondas; cada país nuevo, con sus papeles | Compara número a número y campo a campo | Si había un viaje mejor sin probar: el código prueba todas las combinaciones de lo buscado, y la lista de palancas es fija |
| La explicación | Cada número del texto está en la tabla; ninguna palabra prohibida; el aviso está | Saca los números del texto y los busca; busca las palabras de la lista | Si el texto engaña sin números: el revisor |
| El final | Las horas cuadran con el alojamiento; los enlaces responden; ningún precio pasa de su edad máxima | Compara horas, abre cada enlace y resta fechas | Si el precio cambió después: se dice su fecha y que es orientativo |

## El banco

Tres bancos, hechos por nosotros y fuera del run:

- **Alojamientos juzgados a mano**: sus niveles, uno a uno.
- **Papeles sabidos**: pares de pasaporte y destino, comprobados por nosotros en su fuente, con su fecha.
- **Búsquedas con la respuesta sabida**: un viaje donde sabemos cuál es la mejor combinación.

El listón, por decidir (de partida, nueve de cada diez). Pasarlo gasta IA: con el visto bueno del PM.
