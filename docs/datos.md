# Las piezas de información, y de dónde sale cada una

Del 22-nov, a petición del PM: «sepárame todas las piezas de información que necesitemos y los puntos de donde las
podemos conseguir, y así vamos ampliando exactamente cómo podemos hacerlo». Es el mapa; el cómo de cada pieza se amplía
una a una, con él. Lo que manda: los datos se sacan en el momento, el viajero no trae nada, no hay base que mantener y
no se lee a escondidas.

Cómo se lee: «hoy» es lo que se puede usar sin pedir permiso a nadie; «después o con riesgo», lo que pide un acuerdo,
una solicitud o un lector comprado. Entre paréntesis, cómo está: comprobado (por la sesión, el 22-nov), por probar o
sin comprobar (dicho de memoria). El detalle de cada fuente, en [fuentes.md](fuentes.md).

## Los puntos de donde se saca

| Punto | Qué es | Cómo está |
|---|---|---|
| LiteAPI | Una API de hoteles que se abre con un registro | Comprobado con la clave de pruebas del PM (23-nov); sus condiciones sobre IA, sin leer |
| El índice para IA | Un buscador que ya tiene la web leída y contesta con texto y su fuente | Comprobado con un hotel; posible solución parcial (el PM) |
| La web del hotel | Su web propia, su ficha técnica en PDF y su motor de reservas, leídos a cara descubierta | Por probar |
| Los mapas abiertos | OpenStreetMap y lo que se calcula sobre él: qué hay, dónde y a cuánto | Sin comprobar |
| Las imágenes abiertas | Fotos aéreas y fotos de calle de uso libre | Sin comprobar |
| Google Maps desde la IA de Google | Su herramienta oficial: sitios, opiniones y fotos | Por comprobar: si vale en Europa y si deja ver las fotos |
| El lector oficial de una IA | Lee las páginas de las agencias que lo dejan pasar por su nombre | Por probar; gasta: con el visto bueno del PM |
| El servidor de fotos | Donde las agencias guardan los archivos de las fotos | Por probar; sus derechos, al abogado |
| Las fuentes oficiales | Webs de gobiernos y organismos | A cara descubierta |
| Aviasales | Precios de vuelos guardados de otros usuarios, gratis | Comprobado con la clave del PM (23-nov) |
| Kiwi para agentes | Vuelos en vivo, por su servidor para agentes | Sus condiciones de uso comercial, por comprobar |
| KAYAK para afiliados | Hoteles y vuelos en vivo | Con solicitud |
| Las API de socios | Booking.com y demás | Con acuerdo: después, con el abogado |
| Parallel | Búsqueda de hoteles, pisos e imágenes hecha para agentes, de pago por consulta | Comprobado con la clave del PM (23-nov); de dónde saca sus datos y sus condiciones, sin leer |
| Un lector comprado | SerpApi y parecidos | Con riesgo legal y de corte: lo decide el PM |

## El alojamiento

| Pieza | De dónde, hoy | Después o con riesgo |
|---|---|---|
| 1. La lista: qué alojamientos hay en una zona, con su nombre, su tipo y dónde están | LiteAPI, por radio; los mapas abiertos | Las API de socios; un lector comprado |
| 2. El precio de esas noches para ese grupo, con sus tasas, y la cancelación | LiteAPI, en vivo; el precio directo, del motor de reservas del hotel (por probar) | KAYAK; las API de socios; un lector comprado |
| 3. La nota y cuántas opiniones | LiteAPI, la suya; el índice, la de Booking.com y otras (comprobado) | Google Maps desde la IA de Google |
| 4. Las estrellas y el tipo | LiteAPI; el índice (comprobado); los mapas abiertos | |
| 5. Los servicios, como dato: piscina, gimnasio, aparcamiento | LiteAPI; el índice (comprobado); la web del hotel | |
| 6. Las habitaciones: tipos, metros, camas y a qué dan | LiteAPI, tipos y camas; la web del hotel y su ficha técnica, los metros | El lector oficial de una IA |
| 7. Lo que dicen los viajeros, por temas | LiteAPI, el texto de las opiniones; el índice, a trozos | Google Maps desde la IA de Google; el lector oficial de una IA; resúmenes con licencia |
| 8. Las fotos oficiales, por habitación y por instalación | LiteAPI; la web del hotel | El servidor de fotos |
| 9. Las fotos de viajeros | Ninguna segura hoy | Google Maps desde la IA de Google; el servidor de fotos, con el lector oficial; un lector comprado |
| 10. La zona: minutos a lo que se va a hacer, transporte, seguridad y ruido | Los mapas abiertos, las distancias y el transporte; el índice, lo que se dice del barrio | Las fotos de calle abiertas |
| 11. Lo que se mide desde fuera: el tamaño de la piscina, la distancia real a la playa | Los mapas abiertos | Las fotos aéreas abiertas |
| 12. Los horarios y las normas: entrada, salida, recepción de noche | LiteAPI; el índice (comprobado); la web del hotel | |
| 13. Los pisos de particulares (Airbnb) | Sin fuente | Un lector comprado, o fuera de la primera versión |

## Los vuelos y el transporte

| Pieza | De dónde, hoy | Después o con riesgo |
|---|---|---|
| 14. Qué rutas hay: quién vuela de dónde a dónde | Aviasales; Kiwi para agentes | |
| 15. El precio por día: la parrilla y los días baratos | Aviasales, guardado de hace días | Kiwi para agentes, en vivo; KAYAK; un lector comprado |
| 16. El detalle de cada vuelo: horas, escalas, duración, aerolínea, si es un billete o varios | Kiwi para agentes (por probar) | KAYAK; un lector comprado |
| 17. La maleta y las condiciones de la tarifa | El índice, la norma general de cada aerolínea | KAYAK; un lector comprado |
| 18. Cómo es la aerolínea: puntualidad, y si está vetada | Las fuentes oficiales; el índice | |
| 19. Trenes y autobuses: horarios y precios | El índice, de forma aproximada; enlaces | Sus API, con contrato |
| 20. Llegar al aeropuerto y salir de él: tiempo y coste | Los mapas abiertos; el índice | |

## Lo demás del viaje

| Pieza | De dónde, hoy | Después o con riesgo |
|---|---|---|
| 21. Los papeles: requisitos de entrada, por pasaporte, destino y escala | Las fuentes oficiales | |
| 22. El tiempo habitual y la temporada | Datos abiertos de clima; el índice | |
| 23. Las fiestas, los eventos y lo que cierra | El índice; las fuentes oficiales | |
| 24. Qué ver, cuánto pide cada sitio y cuánto se tarda entre ellos | El índice; los mapas abiertos | |
| 25. Lo que se agota: entradas con cupo y permisos | Las fuentes oficiales; el índice | |

## Las piezas 9 y 13, ampliadas (22-nov)

El PM: «¿cómo solventamos las piezas 9 y 13?», pensando en el programa que saca la información para que después la IA
valore. Para cada una: dónde vive el dato, por dónde sale y cómo se coge. Que las puertas existen está comprobado por
la sesión; que den lo que hace falta, por probar.

### La pieza 9: las fotos de viajeros

**Dónde viven**: en Google Maps, en Tripadvisor, en las opiniones de las agencias y, cada vez más, en vídeos de
viajeros.

| Cómo se coge | Qué es | Cómo está |
|---|---|---|
| Un índice de imágenes | Igual que el índice de texto, pero de fotos: se le pregunta «gimnasio del hotel tal» y devuelve la dirección de cada foto y la página de la que sale. El archivo se abre desde el servidor de fotos y lo mira nuestro asiento | Existen y son baratos (uno, a 1 USD por 1.000 consultas de 20 fotos). Por probar: si trae fotos de viajeros o solo oficiales, y sus derechos |
| Los vídeos de viajeros | Se busca el vídeo del hotel en YouTube, por su puerta oficial, y una IA que sabe ver vídeos lo mira: la habitación, el baño, el gimnasio, tal como los grabó un viajero | La IA de Google admite la dirección de un vídeo público. Por probar: cuántos hoteles tienen vídeo. Ese asiento correría con la IA de Google |
| Google Maps desde la IA de Google | Su herramienta oficial, con las fotos y las opiniones de sus usuarios | Por comprobar: si vale en Europa y si mira las fotos o solo resume |
| El lector oficial de una IA | Sobre las páginas de opiniones de las agencias que lo dejan pasar | Por probar; con el visto bueno del PM |

### La pieza 13: los pisos de particulares

**Dónde viven**: muchos pisos no están solo en Airbnb: sus dueños los ponen también en Booking.com, en Vrbo y en otras.
Lo que es solo de Airbnb no tiene puerta para buscar: sus reglas cierran la búsqueda, las fotos y las opiniones a los
robots, y solo dejan la página de cada piso.

| Cómo se coge | Qué es | Cómo está |
|---|---|---|
| Los pisos que también están en otras agencias | LiteAPI, pidiendo apartamentos en vez de hoteles | Por probar con claves: cuántos pisos trae |
| Los datos abiertos de Inside Airbnb | Un proyecto que publica gratis, ciudad a ciudad y cada trimestre, los pisos de Airbnb: dónde están, su nota, su precio de lista, sus servicios y su calendario. Se descarga el archivo de la ciudad cuando hace falta; lo mantienen ellos | Sigue publicando (julio de 2026). Solo las ciudades que cubre; tiene hasta tres meses; su licencia, por confirmar; el precio de esas noches se confirma en el enlace |
| El índice, piso a piso | Con la lista de Inside Airbnb, se pregunta al índice por la página de cada finalista | Por probar |
| Fuera de la primera versión | Solo hoteles y apartamentos de las otras agencias | Lo decide el PM |

## Lo que hace falta para montarlo y probarlo (22-nov)

A petición del PM, antes de probar nada: las cuentas, las claves, el gasto y las decisiones. Los precios que van de
memoria se confirman al registrarse. Las claves no se pegan en el chat: se dan por el formulario seguro de la sesión.

| Qué | Para qué piezas | Qué hace falta | Coste | Quién |
|---|---|---|---|---|
| Las webs oficiales, la web y la ficha técnica de cada hotel | 5, 6, 8, 12, 21, 25 | Nada | Nada | La sesión |
| OpenStreetMap | 1, 10, 11, 20, 24 | Nada | Nada | La sesión |
| Inside Airbnb | 13 | Descargar el archivo de la ciudad | Nada | La sesión |
| LiteAPI | 1 a 8, 12, 13 | Una cuenta y su clave | Gratis hasta 5.000 búsquedas por reserva | El PM se registra |
| Aviasales, en Travelpayouts | 14, 15 | Una cuenta y su clave | Gratis | El PM se registra |
| YouTube, para buscar los vídeos | 9 | Una cuenta de Google con su clave | Gratis hasta un tope diario (de memoria) | El PM se registra |
| Un índice de imágenes | 9 | Una cuenta y su clave | Sobre 1 USD por 1.000 consultas | El PM se registra |
| La IA de los asientos, con su búsqueda y su lector | 3, 4, 5, 7, 10, 12, 17, 18, 22, 23, 24 | Una clave de la IA y un tope de gasto | Por medir: por uso | El PM da la clave y el tope |
| La IA de Google, para ver vídeos y para Google Maps | 7, 9 | Una cuenta de pago de Google | Por medir; un vídeo gasta bastante. Google Maps: 5.000 consultas gratis al mes y después 14 USD por 1.000 | El PM, si acepta un asiento con otra IA |
| Kiwi para agentes | 15, 16 | Ninguna cuenta descrita | Sin publicar | La sesión mira antes sus condiciones |
| KAYAK para afiliados | 2, 15, 16, 17 | Una solicitud | Sin publicar | El PM, después |
| Booking.com, de socio | 1, 2, 3, 7, 8 | Un acuerdo | Comisión | El PM, con su abogado, después |
| Un lector comprado | 9, 13 y lo que falte | Una cuenta | Desde 25 USD por 1.000 consultas | Solo si el PM acepta el riesgo |

**Dónde corre**: para probar, en esta sesión, con las claves del PM. Para funcionar, un servidor, como el del motor del
ensamblador, y un sitio fuera del repositorio para los archivos de cada viaje.

**Lo que decide el PM:**

- La ciudad y las fechas de la prueba.
- Si Airbnb entra en la primera versión.
- Si acepta que un asiento corra con la IA de Google.
- Si se enchufa un lector comprado.
- Si el transporte pasa también a código.
- El tope de gasto de las pruebas.

**Lo que tiene que mirar el abogado:**

- Mirar con una IA las fotos y las opiniones de cada fuente, y enseñarlas.
- Las condiciones de LiteAPI sobre IA y sobre guardar datos.
- Usar los datos de Inside Airbnb en algo que se vende.
- Lo que publican las agencias para los lectores de las IA, frente a sus condiciones de uso.
- Las condiciones de Google en Europa.

**Lo mínimo para empezar a probar**: la clave de LiteAPI, la de Aviasales y una clave de IA con un tope pequeño. Lo
que no pide nada (las webs de los hoteles, OpenStreetMap e Inside Airbnb) se puede probar ya.

## Lo comprobado con las claves del PM (23-nov)

Las dos claves están guardadas en su entorno, por el formulario seguro: no están en el repositorio ni las ve la sesión.
Las respuestas de prueba tampoco entran en el repositorio.

**LiteAPI**, con la clave de pruebas, en Lisboa:

- **La lista por punto y radio funciona.** En 1.500 m alrededor de la Baixa dice 4.344 alojamientos y los da de 200
  en 200, cada uno con su nota, cuántas opiniones, sus estrellas, su tipo y dónde está. De los 200 primeros, 121 tienen
  nota de 8 o más y cuatro estrellas o más: el filtro de mínimos se hace con código.
- **El detalle de un hotel** (uno de cinco estrellas): 62 fotos del hotel, sin leyenda; 14 tipos de habitación, cada
  uno con sus metros (de 24 a 61), sus camas y diez u once fotos propias; los servicios, con el gimnasio; los horarios
  de entrada y salida; su web, y un resumen de las opiniones por temas, con nota por tema.
- **Las opiniones**: veinte, con su fecha (las últimas, de dos días antes), su nota, el tipo de viajero y lo bueno y
  lo malo en texto.
- **El precio**: en vivo, para tres noches de febrero y dos adultos, con el nombre de la habitación, si lleva desayuno
  y si se puede cancelar. Con la clave de pruebas puede no ser el precio de verdad: por confirmar.
- **Lo que resuelve**: las fotos van por tipo de habitación, así que se puede mirar la habitación de ese precio y no
  la mejor del hotel.
- **Lo que no trae**: fotos de viajeros, ni leyendas en las fotos del hotel.

**Aviasales**, de Madrid a Lisboa, en enero:

- Devuelve los vuelos más baratos del mes, cada uno con su día y su hora, su aerolínea, su número, su duración, sus
  escalas, su precio y su enlace.
- Trae aerolíneas de bajo coste (Ryanair y easyJet), que era una duda.
- Cada precio lleva la fecha en que se vio: en la prueba, entre el mismo día y seis días antes.

**Parallel**, con la clave del PM (23-nov). Se registró por su índice de imágenes, y resultó tener también búsqueda
de hoteles, de pisos y de vuelos, hecha para agentes y con registro:

- **Hoteles**: en la Baixa de Lisboa, para tres noches de febrero y dos adultos, con filtro de cuatro y cinco estrellas
  y de nota, devolvió 40 en dos segundos. Cada uno, con su precio de esas noches en Booking.com y el enlace a su página
  de reserva con las fechas puestas, dónde está, sus estrellas, su nota en cuatro niveles, si se puede cancelar y una
  foto.
- **Pisos**: en Alfama, 40: 18 de Airbnb y 22 de Booking.com, cada uno con su precio de esas noches, su enlace a la
  página del piso con las fechas, dónde está y dos o tres fotos. Es la primera salida que aparece para la pieza 13.
- **Lo que no trae**: la nota en número ni cuántas opiniones, el texto de las opiniones, las habitaciones ni más de
  unas pocas fotos. Y da 40 resultados por consulta, no la lista entera de una zona.
- **Vuelos**: su búsqueda no está activada para esta cuenta («not supported for your organization»).
- **Imágenes**: para un hotel devolvió diez fotos de varias webs; solo una era claramente de un viajero. Flojo para la
  pieza 9, al menos en su modo rápido.
- **Precio**: 5 USD por 1.000 consultas de hoteles; de 1 a 5 USD por 1.000 de imágenes. Las cinco consultas de la
  prueba, unos céntimos.
- **Lo que no se sabe**: de dónde saca los precios de Booking.com y de Airbnb, y qué dicen sus condiciones. Puede ser
  un lector comprado con otro nombre: antes de montar nada sobre él, se leen sus condiciones y lo mira el abogado.

**Cómo casan las tres**: Parallel da el precio de Booking.com y de Airbnb con su enlace; LiteAPI, el detalle (las
habitaciones con sus metros y sus fotos, las opiniones y la nota en número), y el índice de texto, lo que se dice de
cada hotel. Cruzar un mismo hotel entre las dos primeras se hace por su nombre y su posición.

## La primera búsqueda entera, de prueba (23-nov)

Con las tres claves, una sonda de usar y tirar (no es el código del agente, ni está en el repositorio, ni sus
respuestas): Lisboa, 1.500 m alrededor de la Baixa, tres noches de febrero, dos adultos, con mínimos de nota 8,5, 200
opiniones y cuatro estrellas. Lo que enseñó:

- **La cadena corre de punta a punta para el alojamiento**: la lista, los mínimos, el precio de esas noches, cinco
  finalistas elegidos por regla y la ficha de cada uno, en un par de minutos y sin IA hasta ahí.
- **La puerta de la búsqueda hace falta.** Pedidos los mínimos a la fuente, devolvió 1.058; comprobados uno a uno por
  el código, los cumplían 216. De esos, 170 tenían precio para esas noches (de 171 a más de 13.000 EUR; la mediana,
  380).
- **La habitación de ese precio se identifica**: en los cinco finalistas, con sus fotos propias (de 5 a 24) y, en
  cuatro, sus metros (de 14 a 45).
- **Las opiniones dan para leer por temas**: sesenta por hotel, de los últimos meses, con lo bueno y lo malo; y la
  fuente trae ya un resumen por temas con sus contras («ruido del tranvía de noche», «sin ascensor»).
- **El índice caza lo que el dato tapa.** Un finalista tiene piscina según el dato, y el índice dice que es exterior y
  de temporada, de abril a noviembre: cerrada en febrero. Es la trampa que estaba apuntada.
- **La nota de la fuente no es la de Booking.com.** En un finalista, 9,5 en la fuente y 8,6 en Booking.com según el
  índice; en otro, 9,8 y 9,4. La nota se contrasta siempre con una segunda fuente.
- **Cruzar con Parallel por el nombre falla**: de cinco, encontró uno, y con la oferta mal casada. Su búsqueda es por
  zona, no por nombre: hay que cruzar por posición, zona a zona.
- **La fuente no trae la web del hotel** en ninguno de los cinco: se busca con el índice.
- **Aviasales tiene huecos**: para la ida y la vuelta exactas de esas fechas no tenía precio; para los días de
  alrededor, sí (trece días de febrero, de 19 a 43 EUR la ida y vuelta desde Madrid). Para las fechas exactas hace
  falta una fuente en vivo.

## Las fotos, bajadas de verdad (23-nov)

Con el punto 3.6 se bajaron las fotos de un finalista de Lisboa. Lo que enseñó:

- **Las de la habitación** vienen por tipo de habitación, en grande (3.000 puntos de ancho) y con una clase que les
  pone la fuente (dormitorio, baño, vista, minibar). Con esa clase, el código pone por delante lo que más enseña.
- **Las del hotel** vienen sin pie y solo en grande: de 47 a 144 por alojamiento. La fuente solo tiene en pequeño la
  foto principal, no las demás.
- **Lo que cuesta**: treinta y cinco fotos son unos doce megas y se bajan en un segundo. Lo caro no es bajarlas, sino
  que la IA las mire en grande: por eso hay tope (doce de la habitación y treinta del hotel).
- **Lo que queda abierto**: con treinta de un centenar, el gimnasio o la piscina pueden no estar entre las que ve el
  asiento, y entonces dice «no se sabe». Verlas todas pide encogerlas antes, y eso necesita una pieza que hoy el
  código no lleva: por decidir.

## La primera mirada de la IA a cinco alojamientos de verdad (23-nov)

Con el punto 4.2 se probó el asiento que mira el alojamiento con los cinco finalistas de Lisboa, dos pasadas a ciegas
por alojamiento: diez asientos, lanzados a mano por la sesión de trabajo. Las fichas quedan en la mesa, fuera del
repositorio; lo que enseñaron:

- **Entregan y pasan las puertas.** Diez de diez, con la puerta de todos y la puerta 5 en verde.
- **Dos miradas ven casi lo mismo.** Rotulan igual 196 de 198 fotos y coinciden en 38 de 40 campos. Donde no
  coinciden es donde la foto no alcanza: una piscina de la que solo se ve una esquina y una vista tras un visillo.
- **Cuando la foto no está, dice «no se sabe».** Un hotel lista una piscina y ninguna de las treinta fotos dadas la
  enseña: las dos pasadas dejan su nivel sin poner y lo explican, en vez de darle uno medio.
- **Caza lo que existe pero no para ese viaje.** Las dos piscinas son exteriores y el viaje es en febrero: lo avisan,
  marcado como deducido.
- **Las opiniones pesan más que las fotos, y a veces demasiado.** En dos hoteles con fotos de habitación nueva, el
  estado sale «descuidado» por averías sin arreglar o desgaste que repiten las opiniones recientes; en otro, la luz
  sale «oscura» por opiniones que hablan de habitaciones sin ventana, aunque la foto enseña una. Las opiniones no
  dicen de qué habitación son. Queda a decisión del PM si el estado se parte en dos campos.
- **Lo que cuesta.** De once a dieciséis minutos por asiento, con unas cincuenta o sesenta lecturas cada uno. Lo que
  más pesa son las fotos en grande, hasta cuarenta y dos por alojamiento.
- **Lo que esta prueba no mide.** Si el nivel es el acertado: eso lo dicen los ojos del PM, con la página. Y que el
  asiento no lea fuera de su puesto: aquí se le pidió, y el sello solo ve lo que escribe; en el producto se le quitan
  las herramientas.

## Lo que se ve en el mapa

- **Lo que hoy no tiene salida segura**: las fotos de viajeros (9) y los pisos de particulares (13). Sus salidas
  posibles, arriba, por probar.
- **Lo que depende de una sola fuente**: la lista y el precio en vivo del alojamiento (1 y 2), de LiteAPI.
- **Lo más flojo de los vuelos**: el precio en vivo y el detalle (15 y 16), que hoy cuelgan de Kiwi, por comprobar.
- **Lo que ya tiene dos fuentes o más**: la nota, las estrellas, los servicios y los horarios (3, 4, 5 y 12).
