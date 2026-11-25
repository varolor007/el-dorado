# La revisión de la tanda 6: el viaje a ratos

Al juntar la obra de la tanda, el 25-nov-2026, la revisaron tres adversarios que no la hicieron, cada uno en su copia
del repositorio y sin tocar nada: solo informar. Miraron todo lo que hay desde que empezó la tanda: el cimiento (8.1)
y sus cuatro momentos, el alojamiento (8.2), el transporte (8.3), los cambios (8.5) y el día a día (8.6), hechos por
cinco sesiones de obra y juntados después por quien orquesta. Cada hallazgo se comprobó leyendo el código o con una
prueba suelta, y lo que se arregló lleva su prueba en la batería, que pasó de 839 pruebas a 860. Los arreglos los
hicieron tres sesiones de obra, cada una en su rama: cada una vio fallar su prueba antes de arreglar. Aquí queda
cada hallazgo con lo que se hizo. Lo que toca a la hoja, y por tanto es del PM, va al final.

Nada de la tanda se ha visto con IA de verdad: es un gasto, y espera el sí del PM. Se ha mirado en la web con el
viaje de verdad del ensayo, sin dar ningún adelante, y con una casa de mentira (la puerta de verdad, el caso
inventado y asientos que no piensan) para ver lo que pasa después de cada adelante. Sus pantallas, en ancho y en
móvil, en claro y en oscuro, están en la página de la revisión (https://claude.ai/artifact/KMBqFEhTmYD1HNH787LHqb).

Antes de los adversarios, al juntar las ramas y mirarlas en la web, quien orquesta encontró y arregló esto:

| Qué pasaba | Qué se hizo |
|---|---|
| Las cuatro ramas de los momentos chocaban en la puerta de la web, en los textos y en la hoja de estilos, en trozos que compartían líneas: quedarse con las dos mitades dejaba una función o una regla sin cerrar | Rehechas a mano, función a función y regla a regla; la batería ya contaba las llaves de la hoja de estilos |
| Cerrar con el alojamiento elegido (8.2) y cerrar con el transporte elegido (8.3) lo había hecho cada rama por su lado, y juntas se pisaban | Cerrar lleva los dos a la vez, cada uno en su parte del total de la manera, con su prueba (`cierre.test.ts`) |
| Dos momentos llamaban igual a su pedido que no vale, y la puerta no sabía cuál era cuál | El del transporte entra en la puerta con otro nombre |
| El viaje del ensayo no lleva vuelo: la fuente no tenía precio guardado para sus fechas, y al buscar otra vez tampoco dio nada | La pantalla lo dice en los dos casos. Las opciones de vuelo solo se han visto con datos inventados |
| El aviso «Tus días han cambiado» se quedaba para siempre: salía también tras otro cambio y al volver a una versión de antes | Solo sale en la versión de la que salió el mensaje, si dejó una más nueva (8.6) |
| La frase del segundo coste de un cambio («si también hay que rehacer lo que puede que haya que rehacer») no se entendía | «Como mucho, tanto: si también hay que rehacer lo que quizá cambie», en los dos idiomas |
| Guardar el transporte elegido no decía de qué versión eran las elecciones | Manda la versión de la que se leyeron |

## La mecánica: lo que se rompe

Un bloqueante, arreglado.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1 | Un cambio que se paraba dejaba el viaje atascado y escondido. Al rehacer, el viaje pasa a «investigando», y solo volvía al mapa al salir una versión: con la investigación parada no se podía volver a una versión, ni elegir, cerrar, pedir la guía, preguntar ni cambiar nada, y la web dejaba de enseñar el viaje. Con un viaje cerrado, el viajero dejaba de ver lo que tenía que reservar. Quien orquesta lo vio en la web | El viaje vuelve a estar como su versión, en el mapa o cerrado, cuando un cambio se para o cuando la casa lo encuentra a medias sin nadie que lo lleve. La web lo dice encima del viaje, con «Volver a intentarlo», que avisa de que gasta y repite solo el paso que paró, y «Dejarlo». Volver a una versión vale con un cambio parado (8.1) |
| I1 | Lo que pedías en un momento no pasaba a la versión siguiente: el vuelo elegido, la zona, los mínimos, el tope y los gustos marcados solo los leía su propia investigación. Elegías un vuelo, cambiabas después el gasto, y la versión nueva traía el vuelo de antes sin decirlo | Lo pedido dura por la cadena de versiones mientras sigue valiendo, con una sola función para leerlo. Se cae lo que deja de valer: un vuelo de otras fechas o de otra moneda, y con él sus países; el tope, con otras fechas u otro grupo; los gustos marcados, con un gusto nuevo. Su prueba es una cadena de ocho versiones (8.1). Si tiene que durar es del PM: se ha hecho lo que menos sorprende |
| I2 | Un gusto imprescindible del alojamiento solo rehacía la tabla, pero la búsqueda filtra en la fuente por los imprescindibles: al marcar «piscina, imprescindible» podían quedar descartados todos los de antes, y al quitarlo no entraban los que no la tienen | Poner o quitar un imprescindible que la fuente declara busca otra vez, mirando solo a los nuevos, y el impacto lo dice antes con lo que cuesta (8.2) |
| I3 | Sospecha, comprobada: una mirada de antes se copiaba sin mirar si la habitación y las fotos de la búsqueda nueva eran las mismas, y las fotos de prueba de una respuesta se traducían con la búsqueda nueva | Una mirada se copia solo si mira la misma habitación y las mismas fotos, y las direcciones de las fotos de prueba salen de lo que se guardó al mirar (8.2) |
| I4 | Guardar las elecciones no decía de qué versión eran: si tocabas algo y volvías a otra versión enseguida, lo elegido para una se guardaba en la otra | El guardado lleva su versión, la casa lo rechaza si no es la que se enseña, y la web corta la espera al cambiar de versión (8.1) |
| M1 | Elegir otro transporte no tenía tope por día, y los demás momentos que gastan sí | Seis por viaje cada 24 horas, de partida (8.3). El número es del PM |
| M2 | Un mensaje para un día no aceptaba techo de gasto | Lo acepta, como los demás (8.6). La web no manda techo en ningún momento: es la decisión del PM del 24-nov |
| M3 | Cerrar con un alojamiento elegido que no valía abría antes un cierre vacío: gastaba uno de los seis intentos del día y fallaba igual cada vez | El alojamiento se mira antes de abrir el cierre, y no se puede guardar como elección uno de otra moneda que su manera (8.2) |
| M4 | Al volver a los datos abiertos, los sitios añadidos por un mensaje se repetían y se acumulaban en el siguiente, y lo encontrado contaba también lo de mensajes anteriores | Cada mensaje cuenta lo suyo y nada se repite (8.6) |
| M5 | Rehacer escribía lo entendido del viaje y volver a una versión no lo devolvía: el viaje enseñaba lo entendido de otra versión | Lo entendido del viaje es siempre el de la versión que se enseña (8.1) |
| M6 | Un cambio de idioma solo rehace al que explica, pero el porqué de cada parada y lo que dice el que mira también van en el idioma del viajero | La web no lo ofrece, y la casa lo rechaza mientras no se decida (8.5) |
| M7 | Sospecha, comprobada en parte: una búsqueda de transporte que fallaba después de preguntar a la fuente no contaba para su tope | El intento se apunta, falle o no (8.3) |
| M8 | Sospecha, comprobada: el que explica se conservaba aunque cambiara lo que lee. Con «menos museos», los minutos a los sitios de la tabla pasaban de 5 a 7, y su frase de antes se quedaba | El que cruza y el que explica se conservan solo si lo que leerían ahora es lo mismo, pieza a pieza, que lo que leyeron (8.6). Un mensaje que cambia paradas casi siempre los vuelve a lanzar: se ahorra menos de lo que decía el punto |

Visto y sin pegas: rehacer copia con sus horas y no copia lo que es de cada investigación; una búsqueda de transporte
de otra versión se rechaza; el vuelo elegido se comprueba contra la moneda y las fechas; cambiar lo pedido sin tocar
nada no inventa cambios; lo que se hace a la vez (una investigación, una guía, una pregunta, una búsqueda) se aparta
sin huecos; cerrar con otro alojamiento y otro transporte a la vez da el mismo total que la tabla; y dos maneras con
el mismo alojamiento pintan su chincheta una vez.

## La seguridad: lo que deja pasar lo que no debe

Sin bloqueantes.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | La respuesta a una pregunta por un alojamiento podía llevar un precio o un descuento inventado hasta la pantalla: su puerta no cruzaba sus números con lo que se le dio, y la pregunta del viajero llega tal cual al asiento, así que una orden escondida en ella tenía camino | La respuesta no puede hablar de dinero, y cada número suyo tiene que estar en la ficha o en las opiniones que se le dieron; los de la pregunta no cuentan (8.2). Las palabras de dinero solo están en inglés y en español |
| M1 | Se podía guardar un gusto con nombre de prototipo («constructor»), porque tres comprobaciones miraban con `in` | Se mira solo lo propio, en esas tres y en otras dos con el mismo fallo (8.1) |
| M2 | Empezar otra vez tras una primera investigación parada abría una investigación entera sin mirar el tope de investigaciones del viaje | Lo mira (8.5) |
| M3 | Elegir otro transporte, sin tope por día | Es el M1 de la mecánica (8.3) |
| M4 | Cambiar lo pedido se creía lo que mandaba la web: un campo de más contaba como un cambio de todo, y su texto llegaba a los asientos; y las palabras del viajero podían llegar tocadas | Cambiar rechaza los campos de más y las palabras tocadas fuera de las citas de los gustos, que van cortas y por la puerta de palabras (8.5). Abrir un viaje y corregir lo entendido antes de confirmar siguen como estaban: pasan la puerta 1 |

Visto y sin pegas: cada ruta nueva es solo de su dueño, y a quien no lo es se le dice que no existe; la web le pasa
a la casa justo las rutas y los métodos nuevos; ningún asiento arranca sin adelante, y quien no es de la casa ni
tiene clave no gasta; el vuelo, su precio y sus países salen de lo que guardó la casa y nunca de lo que manda la web;
la zona, los mínimos y los aeropuertos van acotados; en la consulta a los datos abiertos no entra nada del mensaje;
las carpetas de la mesa se hacen con números de la casa; lo que cambió en tus días pasa su puerta y sus números; la
web lo pinta todo como texto; y en lo cambiado no hay claves, datos de viajeros ni identificadores de modelo.

## Las biblias: si es lo que dicen la hoja y el plan, y si es general

Sin bloqueantes.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | Tus elecciones solo pasaban a la versión nueva con un mensaje para un día: con otro alojamiento, otro transporte o un cambio de lo pedido, lo que quitaste volvía, y se perdían el ritmo, lo añadido, lo movido y «Dormir aquí». La hoja dice «lo que quitas no vuelve solo» | Pasan siempre, con la regla de lo que sigue valiendo en el viaje nuevo (8.1) |
| I2 | Después de «Dormir aquí», tu viaje seguía enseñando en la manera el alojamiento y el total de antes, cuando el cierre iba a cerrar con el tuyo | La manera elegida se pinta con tu alojamiento, tu transporte y su total, en dormir, en las cuentas y en la cifra de arriba (8.2 y 8.3) |
| I3 | Lo que gastan las preguntas por un alojamiento no entraba en el gasto de la cuenta | Entra (8.2) |
| I4 | Con un mensaje para un día, el coste de antes del botón no contaba al que cruza ni al que explica, que podían lanzarse: se pagaban hasta tres turnos habiendo visto el precio de uno | Se dicen los dos costes: lo seguro y lo más que puede ser, para cualquier cambio con algo que quizá haya que rehacer (8.6) |
| I5 | Buscar otro alojamiento, y rehacer las maneras con tus gustos, lanza también al que cruza y al que explica; la fila de la hoja solo cuenta las miradas | Se deja como está: con otro alojamiento u otros gustos la tabla cambia, y cruzar y explicar otra vez es lo que toca. Lo que no cuadra es la fila de la hoja, que es del PM |
| I6 | El transporte que ya tienes puede salir o llegar por un aeropuerto de otro país, y nadie miraba sus papeles ni lo decía | Su tarjeta dice el país cuyos papeles no se han mirado (8.3). Qué aeropuertos se ofrecen y si eso vuelve a mirar los papeles es del PM |
| I7 | La hoja no se había tocado en toda la tanda: la búsqueda de transporte seguía «por decidir», la puerta 2 decía que faltaba en el transporte y en los cambios, y ningún paso de estos momentos decía que estaba hecho | La hoja dice, caja a caja, lo que está hecho y lo que falta en los momentos 4, 5, 6 y 9, y dónde se pasa la puerta 2 (0.4) |
| I8 | Mover o añadir una parada no pasaba la puerta 9: el reparto pone lo que mueves quepa o no, y eso se guarda y se cierra. La hoja dice «cada día cabe» | Tus días pasan las mismas cuentas de la puerta 9: el que no cabe se dice en ese día y, al cerrar, queda entre lo que no está confirmado (8.6). No se impide: si debe impedirse es del PM |
| M1 | El impacto decía que dejaba de valer algo que no cambia: con otro vuelo, «dónde duermes»; con otro alojamiento, «el transporte» y «los precios» | Las piezas que dejan de valer salen también de la clase del cambio (8.1) |
| M2 | La puerta de la respuesta no miraba que la foto de prueba fuera de la habitación, ni que la respuesta venga en el idioma del viajero | Una foto que no es de la habitación no prueba una respuesta sobre ella (8.2). El idioma no lo puede medir el código |
| M3 | Los estados del plan no seguían una misma regla: los cuatro momentos estaban «hechos» sin IA de verdad, y el cierre, «en parte» justo por eso; y el 8.6 estaba «hecho» con una caja sin hacer | Los cuatro pasan a «en parte», y cada uno dice lo que le falta (0.4) |
| M4 | Dos líneas de más de 120 letras en dos contratos | Partidas |
| M5 | Los países de más del transporte se olvidaban si otro cambio rehacía los papeles | Duran mientras dure su vuelo: es el I1 de la mecánica (8.1) |

Visto y sin pegas: cada commit lleva el número de su punto; no hay identificadores de modelo ni signos prohibidos;
los contratos están en inglés y los textos de la web en los dos idiomas, con frases fijas que no nombran el vuelo
cuando el transporte puede ser otro; la respuesta a una pregunta pasa la puerta de todos y la de palabras; lo que
cambió en tus días pasa la puerta 9 y se vuelve a mirar al enseñarlo; en los cuatro momentos nada gasta sin el
botón, con su tope por día; y los documentos dicen que nada se ha visto con IA de verdad.

## Lo que se sabe y sigue sin arreglar

- Una investigación que rehace y se para a esperar tu turno de los papeles sigue escondiendo el viaje hasta que
  contestas.
- Pulsar la manera que ya está elegida borra el alojamiento que elegiste con «Dormir aquí». Ya era así.
- Un viajero más vuelve a mirar a todos los finalistas, y no solo a los nuevos.
- Con un mensaje para un día no se vuelve a lanzar al del calendario: se conserva el de la investigación.
- Lo que pides en un mensaje para un día no dura por la cadena de versiones: sus elecciones, sí.
- Al cerrar, la fecha de un día que no cabe sale escrita con números, sin su nombre.
- «Dejarlo», en un cambio parado, solo lo quita de la vista en ese navegador.

## Lo que queda a decisión del PM

Está en el registro, en «Pendientes», con sus números de partida. Lo que toca a la hoja:

- Los momentos 4 y 5 dicen que el alojamiento y el transporte se ponen en marcha con «un mensaje tuyo». Se han
  construido con mandos (la zona, los mínimos, el tope, el horario, solo directos) y sin caja de mensaje: no gasta
  IA, pero no es lo que dice la hoja.
- Buscar otro alojamiento y rehacer con tus gustos lanzan también al que cruza y al que explica; otro vuelo los
  mismos días son dos turnos de IA y no uno; otro día rehace casi todo; y añadir una cosa a lo que buscas rehace la
  ruta, la búsqueda y las miradas. Las filas de la hoja cuentan menos.
- Si lo que pides en un momento tiene que durar cuando después cambias otra cosa. Se ha construido que dure.
- Si mientras se rehace un cambio se sigue viendo la versión de antes. Hoy se ve la investigación en vivo.
- Preguntar por un alojamiento gasta con un solo botón y sin techo, diciendo antes lo que cuesta.
- El permiso de tránsito de una escala no se puede mirar: la fuente de vuelos no dice dónde se hace.
- Si un día que no cabe debe impedir guardar o cerrar. Hoy se dice y no se impide.
- Si se ofrecen aeropuertos de otro país que el del destino cuando están cerca, y si eso vuelve a mirar los papeles.
- Si se puede cambiar el idioma de un viaje ya hecho, y si otro destino es un viaje nuevo.
- Los idiomas: las palabras que piden una clase de sitio, las de dinero y las de la habitación solo están en inglés
  y en español.
- Y verlo todo con IA de verdad, que es un gasto.
