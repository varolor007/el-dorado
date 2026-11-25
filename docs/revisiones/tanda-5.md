# La revisión de la tanda 5: cerrar el viaje y la guía

Al juntar la obra de la tanda, el 25-nov-2026, la revisaron tres adversarios que no la hicieron, cada uno en su copia
del repositorio y sin tocar nada: solo informar. Miraron todo lo que hay desde el cierre de la tanda 4. Cada hallazgo
se comprobó leyendo el código o con una prueba suelta, y lo que se arregló lleva su prueba en la batería, que pasó
de 706 pruebas a 779. Los arreglos de la mecánica y de las biblias los hicieron dos sesiones de obra, cada una en su
rama, y se juntaron y se probaron otra vez con el viaje del ensayo. Aquí queda cada hallazgo con lo que se hizo. Lo que toca a la hoja, y por tanto es del PM, va al final.

Antes de ellos, al juntar las dos ramas y probarlas con el viaje de verdad del ensayo, quien orquesta encontró y
arregló seis cosas, que quedan aquí porque ninguna la habría visto el caso inventado:

| Qué pasaba | Qué se hizo |
|---|---|
| La hora de entrada que da la fuente («03:00 PM») se leía como las tres de la madrugada | Toda hora de una fuente se pasa a veinticuatro horas, también la de una investigación ya guardada (`agent/tools/horas.ts`) |
| Comprobar un enlace podía llamar a una dirección de la red de la casa, de entrada o tras una redirección | Solo se llama a páginas de fuera, en cada salto (3.13) |
| El enlace de otro vendedor salía como «donde vimos el precio», junto a un precio que no era el de hoy | Se dice «otro vendedor», con su precio del día que se buscó y un aviso de que hoy puede ser otro (3.13) |
| El precio de hoy podía ser de otra habitación que la que se miró, y se comparaba callando | El cierre guarda si es la misma, otra o no se sabe, y si es otra lo dice y lo deja sin confirmar (8.4) |
| La guía recién hecha de un viaje cerrado decía en su documento que se había quedado atrás: tomaba el número que el viaje lleva dentro, y no la versión de la mesa | El cuaderno lleva la versión de la que se pidió, y la puerta 10 la comprueba contra esa (12.2) |
| Al juntar las dos ramas, una regla de la hoja de estilos se quedó sin cerrar y la web dejó de pintarse, con la batería en verde | Arreglada, y la batería cuenta las llaves de la hoja |

## La seguridad: lo que deja pasar lo que no debe

Sin bloqueantes.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | Ni las guías ni los cierres tenían tope: una cuenta podía pedirlos uno detrás de otro, y cada uno lanza a un asiento o pregunta a las fuentes | De un viaje, tres guías y seis intentos de cierre al día, de partida, contados del diario del viaje (2.8). Los números, del PM |
| I2 | La guía no lleva techo de gasto: la web no lo manda, y si se manda solo se mira antes de lanzar | Se deja: la web no pregunta por un techo (decisión del PM, 24-nov). Con el tope de I1, lo más que gasta un viaje en guías al día está acotado. Si la guía lleva un techo propio, del PM |
| I3 | Un nombre de fuera puede llevar a una dirección de dentro (la de los metadatos de una nube, una privada): comprobar el enlace llamaba | Antes de llamar se mira a qué dirección lleva el nombre, en cada salto, y si es de dentro no se llama (3.13). No cierra del todo: entre mirar y llamar el nombre puede cambiar. La salida del servidor a redes privadas se cierra en el servidor, al instalarlo |
| M1 | Una clave detrás de la almohadilla, o con un nombre más largo («client_secret», «X-Amz-Signature»), pasaba; y el cuaderno y la puerta 10 no miraban la consulta | Se mira también detrás de la almohadilla y el final del nombre, y el cuaderno y la puerta 10 usan la misma comprobación (3.13). Lo que vaya escrito en la ruta no se puede saber por su nombre |
| M2 | La puerta 7 del orden es más floja que la 10: no mira nombres que no están en el viaje | No se le pone esa regla: la mecánica vio que en la puerta 10 da rojos falsos con textos normales (I5), y allí deja de ser un rojo. Lo que sí mira la puerta del orden: una frase por cosa, ni más ni menos, sin enlaces ni direcciones a medias, sin promesas y solo con los números que se le dieron. Que una frase nombre a alguien que no está en el viaje lo tiene que mirar quien la lea: es del revisor, que está por decidir |
| M3 | Una dirección escrita a medias («viajes . com», «tours at correo dot com») pasaba los filtros de texto | Ya no, con las terminaciones generales; con las de país caería medio idioma (4.7) |
| M4 | El marco de la guía lleva el mismo origen que la web: si un día se le dejaran programas, tendrían la sesión | No lleva programas, y la batería lo vigila (12.2). Imprimir pide los permisos que tiene |

Visto y sin pegas: el cuaderno lo escapa todo (texto, atributos, el croquis y el título), va sin programas y no dice
de dónde viene quien abre un enlace; el documento llega a la web como dato y no como página; las rutas nuevas son
solo de su dueño y a quien no lo es se le dice que no existe; el cuerpo se valida; las fotos se bajan solo por https,
con tope de peso, se mira que sean imagen y se rehacen; al que escribe la guía no le llega el correo, el pasaporte ni
las palabras del viajero; y en lo cambiado no hay claves, identificadores de modelo ni datos de fuentes.

## La mecánica: lo que se rompe

Un bloqueante, arreglado.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1 | «Sigo» cerraba una versión vieja encima de la nueva, y las mezclaba: con un cierre esperando el sí se podía investigar otra vez, y al seguir se guardaba el viaje de la versión vieja con los sucesos, lo entendido y la investigación de la nueva | El cierre guarda la versión que eligió, con sus sucesos, su entendido y su investigación, y se niega si ya no es la que se enseña; seguir pide que el cierre sea de esa versión; no se investiga con un cierre en marcha, y al empezar otra investigación el cierre que esperaba queda abandonado (8.4) |
| I1 | Un bucle de recargas en la web: un viaje cerrado que se vuelve a investigar veía un cierre hecho, de otra versión, y recargaba sin fin | El cierre dice de qué versión es; la web solo sigue el de la que enseña, solo pregunta mientras corre y solo recarga si lo lanzó esa misma página (8.4) |
| I2 | Un cierre a medias se quedaba colgado para siempre si la casa se caía: la web lo contaba como trabajando y escondía el botón | Un cierre que no corre y no está acabado cuenta como parado, en la casa y en la web, y se puede volver a cerrar (8.4) |
| I3 | La edad de un precio se medía al pulsar y no al cerrar: tras esperar días el sí, precios de hace días salían como de hoy | La edad se mide cuando el viaje se cierra de verdad, y la puerta 8 comprueba esa hora. Si al seguir algún precio ya pasa de su edad, se vuelve a pedir antes de cerrar, una vez por cada sí (8.4). Si se vuelve a pedir siempre, o solo cuando caducó, del PM |
| I4 | La guía enseñaba los precios y los enlaces de la investigación, no los del cierre | Hecho: es el bloqueante de las biblias (12.2) |
| I5 | La regla de las mayúsculas de la puerta 10 daba rojos falsos con textos normales («Gothic», «Navidad», «I'm», la palabra tras un guion, los títulos en inglés), y cada rojo gasta una vuelta del asiento | Deja de ser un rojo y pasa a aviso, guardado con el veredicto del puesto y sin volver al asiento. Sigue en rojo nombrar entero un sitio conocido que no es del viaje (12.1) |
| I6 | Lo que gasta la guía no se contaba en el gasto de la cuenta | Se cuenta en el viaje, como lo de los cierres, y no en la media de una investigación (11.4). De paso salió otro fallo: la «última llamada» de un viaje con un cierre se guardaba letra a letra, y el orden de los viajes en la lista de gasto se rompía. Arreglado |
| M1 | La hora del destino, estimada por la longitud, se equivoca de día al otro lado de la línea de fecha y donde la hora oficial se aparta del sol | Si la fuente da la hora de llegada con su desfase, se usa tal cual (hoy ninguna la da). Si no, tres horas de margen, y «no se sabe» con la longitud a más de 150 grados (8.4). Los números, del PM |
| M2 | `hora24` no entendía «14:00:00», «15h» ni una hora dentro de una frase corta | Las entiende, si la frase lleva una sola hora; con dos, o con otro número al lado, no adivina (8.4) |
| M3 | El croquis de la guía no maneja el meridiano 180: dos paradas a cada lado quedaban en los extremos | Si las longitudes abarcan más de medio mundo, las del oeste se cuentan seguidas de las del este, y quedan juntas (12.2) |
| M4 | Se podía investigar mientras se escribe la guía: dos asientos gastando a la vez, y la guía sale ya atrasada | No se empieza otra investigación mientras se escribe la guía (8.4) |

Visto y sin pegas: los céntimos y el umbral de la subida; una moneda distinta, que no se toma por un cambio de
precio; el total cuando falta una pieza; los días del viajero (el orden, las repetidas, las de fuera del viaje, los
vacíos); las vueltas y el techo de la guía; una guía a la vez por viaje; y que la batería no depende de la zona
horaria ni de la hora de la máquina.

## Las biblias: si es lo que dicen la hoja y el plan, y si es general

Un bloqueante, arreglado.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1 | La guía no usaba el viaje cerrado para los precios ni para los enlaces: el viajero se llevaba impreso un precio que el cierre ya le había corregido, y un enlace que no respondía; y la puerta 10 comparaba contra esos mismos precios viejos | El cuaderno toma del cierre el precio de hoy de cada pieza (si hoy no lo hay, el que se vio, dicho como tal), el total, y los enlaces comprobados, cada uno con su clase y sin los que no respondieron, que se cuentan. La puerta 10 saca lo esperado del cierre con sus propias cuentas y lo compara, con doce trampas. Probado cerrando el viaje inventado por su flujo, con el hotel un 30 % más caro y su enlace caído, y con el viaje del ensayo (12.2) |
| I1 | La puerta 8 no hace lo que dice su fila de la hoja: una llegada que no cuadra, un enlace que no responde y un precio caducado cierran en verde, con su aviso | Del PM: está al final |
| I2 | Fuera del inglés y del español la puerta 10 apenas mira, y los rótulos del cuaderno salían en inglés sin decirlo | La guía solo sale en los idiomas que tienen sus rótulos y sus palabras prohibidas (hoy, inglés y español); en otro, dice que todavía no está disponible en ese idioma, sin lanzar a nadie. Ya no hay rótulos en inglés por defecto (12.1). En qué idiomas se vende, del PM |
| I3 | En un viaje cerrado la web enseñaba dos totales: arriba, el de la investigación y de la manera que estuviera elegida; en «Reservar», el de hoy | Arriba va el total de hoy de la manera con que se cerró, con su día; si ese día no hubo total, el que se vio, diciéndolo (8.4) |
| M1 | La llegada, por la longitud: la misma pega que la M1 de la mecánica | Hecho con ella |
| M2 | Los documentos no cuadraban: el plan decía que a la guía le faltaba tomar los días y la manera del cierre, y ya lo hace; la hoja daba por hecho al que explica al cerrar, que no ha corrido con IA de verdad; y cerrar sin frases cuando no hay IA estaba decidido en la hoja y pendiente en el registro | Corregidos: el paso del que explica al cerrar va sin marcar, con su nota, y cerrar sin frases queda como una decisión del PM (0.4) |
| M3 | `MAP.md` quedó con frases pegadas al juntar las dos ramas, y la fila del que explica no decía su modo de cerrar | Corregido |
| M4 | A la puerta 8 le faltaban trampas con su prueba para cinco de sus rojos | Cada una tiene la suya, y una más: la hora del cierre (8.4) |
| M5 | La hoja decía que al cerrar el código solo sale a las fuentes, y también pregunta a la web de cada enlace | Corregido en la hoja (0.4) |

Visto y sin pegas: cada commit lleva su número; los contratos, en inglés; ningún identificador de modelo, ninguna
dependencia nueva del agente, ningún dato de un viajero ni de una fuente; la regla de la pantalla se cumple (las
frases del cierre pasan la puerta 7 y los textos de la guía la 10, y lo demás va por claves); la guía toma la manera
y los días del cierre; y los días del viajero se comprueban contra el viaje.

## Lo que toca a la hoja: decide el PM

1. **La puerta 8, frente a su fila de la hoja.** La hoja dice que las horas de llegada cuadran con la entrada, que
   cada enlace responde y que ningún precio pasa de su edad. Hoy, lo que no cuadra no impide cerrar: se dice y
   queda sin confirmar. O se cambia la fila, o la puerta para, o pregunta al viajero como hace con una subida.
2. **Qué precio manda.** El nuestro viene de un mayorista sin página pública donde reservarlo. Hoy la pantalla
   enseña el nuestro de hoy y, al lado, el de otro vendedor con su enlace y el precio del día que se buscó.
3. **La marca de afiliado** en los enlaces (3.9). Hoy van sin ella.
4. **En qué idiomas se vende**, y con ellos las palabras prohibidas y los rótulos de la guía. Hoy la guía solo sale
   en inglés y en español.
5. **La guía**: si cuenta dónde comer y lo que te pierdes en autobús, que no están en el viaje; si vale que el PDF
   salga del navegador; los dibujos (12.3); y si lleva los precios de hoy del cierre (es lo que se ha hecho) o los
   de la investigación con su fecha.
6. **Los números**: la subida que pregunta (10 %), lo que vale un precio (un día el pedido ahora, siete el
   guardado), los enlaces que se comprueban (doce), el margen de la hora de llegada, y cuántas guías y cuántos
   cierres se pueden pedir de un viaje al día (tres y seis). Y si la guía lleva un techo de gasto propio.
7. **Lo que no caduca**: un cierre que espera tu sí se queda esperando sin fecha; y al cerrar, el que explica se
   lanza hasta tres veces sin otro sí que el botón.
8. **Que el código no puede saber si un texto nombra un sitio inventado**: es del revisor, que sigue por decidir.
