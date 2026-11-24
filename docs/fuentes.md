# Las fuentes de datos de la búsqueda

Mirado el 22-nov-2026, a petición del PM, para decidir de dónde trae el código los alojamientos y los vuelos. Solo
lectura: no se registró nada ni se llamó a ninguna API. Lo hicieron dos búsquedas, cada una con sus fuentes; la sesión
comprobó aparte lo que más pesa, y lo dice en cada caso. Lo que no se pudo confirmar en una página oficial va como
«sin confirmar». Las condiciones y los precios cambian: antes de construir, se vuelven a leer.

## Lo que más pesa: las condiciones sobre la IA

El asiento que mira el alojamiento pasa fotos y opiniones por una IA. Las fuentes grandes lo limitan en sus
condiciones:

- **Booking.com** (condiciones de socio, comprobado por la sesión en su texto): no se puede usar ningún sistema de IA
  en relación con el acuerdo sin su aprobación previa por escrito, ni usar sus materiales para crear o mejorar uno; y
  nunca se guardan resultados en caché.
- **Tripadvisor**: sus condiciones restringen el uso con IA y no dejan guardar nada salvo el identificador del sitio
  (comprobado por la sesión en su página oficial; el detalle de la excepción, de una fuente secundaria).
- **Google Places**: con dirección de facturación en el Espacio Económico Europeo, su contenido solo vale para una
  lista de usos en la que no está el viaje, y prohíbe usarlo para probar o mejorar modelos de IA (de la búsqueda).
- **LiteAPI**: sus condiciones sobre IA y sobre caché no se encontraron. Hay que preguntarlo por escrito antes de
  construir ese asiento sobre sus fotos y sus opiniones.

## Alojamiento

| Fuente | ¿Se entra ya? | Precio | Qué da | La pega |
|---|---|---|---|---|
| LiteAPI (Nuitee) | Sí, con registro; clave de pruebas al momento | Gratis mientras no se pase de 5.000 búsquedas por reserva; el exceso «puede cobrarse», sin tarifa publicada. Se gana el margen | Búsqueda por punto y radio (mínimo 1.000 m), nota mínima, opiniones mínimas, estrellas, servicios y tipo; precio en vivo de esas noches y ese grupo; cancelación, habitaciones, fotos y texto de opiniones; enlace a una página de reserva suya | Condiciones sobre IA y caché, sin confirmar. Sin fotos de viajeros documentadas. La proporción de búsquedas por reserva, con poco tráfico |
| Booking.com Demand API | Con aprobación: socio gestionado, con contrato | Comisión; su cifra, sin confirmar | Punto y radio, nota mínima, estrellas, servicios, cancelación gratis; precio; fotos, habitaciones y opiniones con texto | Criterios y plazos, sin publicar. Sin caché. La IA, solo con su aprobación por escrito |
| Expedia (redirección) | Cerrado: solicitudes nuevas en pausa | | Listados con enlace a Expedia, Hotels.com y Vrbo | Sus datos no pueden entrar en ningún modelo de IA |
| Tripadvisor (Terra) | Sí, de pago por uso | 1.000 sitios gratis una vez; después, de 0,015 a 0,009 USD cada uno | Cercanos por radio (8 km como mucho), nota mínima; opiniones con texto y fotos de viajeros; sin precio por fechas | Sin caché; la IA, restringida. Vale para enseñar, no para el asiento |
| Google Places | Sí | Por 1.000 consultas: de 20 a 40 USD | Nota, número de opiniones, fotos, cinco opiniones; sin precios de estancia | No usable por una empresa europea para viajes, según sus condiciones |
| SerpApi o SearchApi (datos de Google Hotels) | Sí | SerpApi: 250 gratis al mes; 25 USD por 1.000. SearchApi: 40 USD por 10.000 | Precio por agencia, nota, opiniones, fotos | No es oficial: saca los datos de Google, que los demandó. Riesgo legal y de que se corte |
| Hotelbeds, RateHawk, Agoda, Expedia Rapid | Con contrato | Sin publicar | Pensadas para quien reserva dentro | No encajan con proponer y enlazar |
| Airbnb | No hay API pública de búsqueda | | | |
| Amadeus Self-Service, Hotellook | Cerrados (17-jul-2026 y 20-oct-2025) | | | |

Comprobado por la sesión: la búsqueda por punto y radio de LiteAPI, con su mínimo de 1.000 m; el cierre de Amadeus; la
cláusula de IA y de caché de Booking. Lo demás, de la búsqueda.

## Vuelos y trenes

| Fuente | ¿Se entra ya? | Precio | Qué da | La pega |
|---|---|---|---|---|
| Aviasales Data API (Travelpayouts) | Sí, con registro | Gratis; paga comisión por reserva (un 40 % de su ingreso, sobre el 1,1 al 1,3 % del billete) | Precios guardados de búsquedas de otros usuarios (de 2 a 7 días), por ruta y por mes, con su enlace; calendario de días baratos | No es precio en vivo. Sin maleta, sin condiciones y sin detalle de escalas |
| SerpApi o SearchApi (datos de Google Flights) | Sí | Como en alojamiento | En vivo: varios aeropuertos por consulta, escalas, maleta, billetes separados y calendario | La misma: no es oficial y tiene riesgo legal. No da comisión |
| Duffel | Sí, con verificación | 3 USD por reserva más un 1 %; 0,005 USD por búsqueda por encima de 1.500 por reserva | En vivo, con maleta y condiciones | Hecho para reservar dentro; su contrato prohíbe usarlo de comparador (de la búsqueda; la sesión no lo pudo confirmar). No lista Ryanair ni Wizz Air |
| Skyscanner | Con aprobación: más de 100.000 visitas al mes | Sin confirmar | En vivo; sin caché | Para más adelante |
| KAYAK (afiliados) | Por solicitud; criterios sin publicar | Sin confirmar | En vivo, con maleta y familias de tarifa | Resultado incierto |
| Aviasales Search API, Kiwi Tequila | Cerradas para nosotros: 50.000 usuarios al mes o invitación | | | Aviasales, además, prohíbe las búsquedas hechas por código |
| Amadeus Self-Service | Cerrado el 17-jul-2026 | | | |
| Google | No hay API oficial para terceros | | | |
| Trenes (Trainline, Omio, Rail Europe, Distribusion) | Solo enlaces de afiliado o contrato | Comisión, sin confirmar | Ninguna API abierta de precios | Al principio, solo enlaces |

Comprobado por la sesión: el cierre de Amadeus; que Duffel cobra el exceso de búsquedas; que la Data API de Aviasales es
gratis con registro y da precios guardados de 2 a 7 días. Lo demás, de la búsqueda.

## Lo que recomienda la sesión

1. **Fuente de datos desde la primera versión**, para que la búsqueda sea código.
2. **Alojamiento: empezar con LiteAPI.** Es la única que se abre con un registro y contesta la consulta entera (todos
   los de un radio, con sus mínimos, y su precio de esas noches). Antes de construir el asiento que mira, preguntarles
   por escrito si sus fotos y sus opiniones pueden pasar por una IA y qué se puede guardar.
3. **Pedir ya el acceso a Booking.com**, con el permiso de IA por escrito: tarda y es la mejor a medio plazo.
4. **Vuelos: empezar con la Data API de Aviasales**, gratis, para la parrilla y los días baratos, con cada precio
   marcado con su fecha y su enlace para confirmarlo en vivo. El precio en vivo dentro del agente llega con KAYAK o
   Skyscanner, cuando haya tráfico.
5. **Los servicios que sacan datos de Google, no como base**: funcionan hoy, pero el riesgo legal y de que se corten
   es de quien los usa.

Registrarse en una fuente y aceptar sus condiciones es del PM. Probar con sus claves no gasta IA.

## Las alternativas, sin depender de aprobaciones (22-nov)

El PM: «no podemos depender puramente de las API», «sin ellas tampoco podemos hacer escrutinio», «hay muchas compañías
que lo hacen de diferentes maneras; tenemos que encontrar la nuestra». Lo que se le ocurre a la sesión, a su decisión:

1. **Separar la lista del escrutinio.** La lista (todos los de un radio, con sus mínimos y su precio) sí sale hoy de
   una fuente que se abre con un registro, sin aprobación: LiteAPI, que además se presenta como hecha para agentes de
   IA y tiene su propio servidor para ellos (visto por la sesión en su web; sus condiciones, sin leer). El problema
   real es solo el escrutinio.
2. **El viajero trae su lista.** Pega los enlaces de los alojamientos que está mirando, o sus capturas, y el agente
   los escudriña y los compara. Sin búsqueda propia: el valor es el criterio.
3. **El agente mira desde el navegador del viajero.** Una extensión lee las páginas que el viajero abre, con su
   sesión, y las pasa por el criterio. Así trabajan las extensiones de comparar precios. Cambia la forma del producto.
4. **La web propia de cada hotel.** El agente lee, como lo haría una persona y uno a uno, la web oficial de cada
   finalista: sus fotos y sus habitaciones. Sin fotos de viajeros.
5. **Comprar el escrutinio ya hecho.** Hay quien vende, con licencia, el resumen de las opiniones de muchas webs por
   temas (TrustYou: una nota y resúmenes por tipo de viajero, de más de 80 fuentes; precio sin publicar) y quien vende
   fichas y fotos de hoteles con sus derechos.
6. **Que lo lea otro por nosotros.** Los servicios que sacan datos de Google o de las agencias. Funciona hoy; el
   riesgo legal y de que se corte es de quien lo usa.
7. **Un programa nuestro que lea las webs.** Se puede hacer leyendo a cara descubierta, despacio y lo que las webs
   dejan leer, pero las grandes lo bloquean. Hacerlo escondido (saltarse sus bloqueos, hacerse pasar por una persona)
   es donde está el riesgo legal y lo que más se rompe: la sesión no lo recomienda ni lo construiría así.

## La herramienta de datos, a demanda (22-nov)

El PM descartó el índice propio de abajo: «requiere mantener una base de datos actualizada y no puede ser; yo pienso
más en una herramienta que nos permita obtener la información cada vez. Al menos de momento, hasta que funcione; luego
ya discutiré con un abogado una estrategia de acuerdos con las grandes bases de datos».

Lo que propone la sesión, a su decisión:

- **Una herramienta nuestra, sin base que mantener.** Se le pide una zona, unas noches, un grupo y unos mínimos, y
  devuelve en cada búsqueda la lista en nuestro formato: precio, nota, fotos y opiniones. No guarda nada que haya que
  tener al día.
- **Con enchufes.** Por dentro, cada fuente es un enchufe que se cambia sin tocar el resto del agente. Hoy se enchufa
  lo que hay; cuando haya acuerdos con las grandes, se cambia el enchufe.
- **Lo que se enchufa hoy, en dos niveles:**
  - A, limpio: LiteAPI (la lista, el precio, la nota, las fotos oficiales y las opiniones) y la web propia de cada
    finalista, leída en el momento. Empezar es gratis.
  - B, más completo y con riesgo: además, un servicio que lee Google Hotels por nosotros (SerpApi o parecido): fotos y
    opiniones de viajeros y el precio de varias agencias, a unos 25 USD por 1.000 consultas. El riesgo legal y de que
    se corte es de quien lo usa: lo decide el PM. Al ser un enchufe, se quita sin tocar lo demás.
- **Fuera**: un lector nuestro que lea las agencias a escondidas, saltándose sus bloqueos.
- **Los vuelos, igual**: la misma herramienta, con la Data API de Aviasales enchufada.

## Cómo funciona un servicio como SerpApi, y las formas de tener algo así (22-nov)

Explicado al PM, que quiere entenderlo antes de decidir. Un servicio así tiene tres capas:

1. **Entrar**: abre la página que abriría una persona (la de Google Hotels para esa ciudad y esas noches) sin que la
   web lo corte. Las webs grandes se defienden de los programas, y el negocio de estos servicios es pasar esa defensa:
   muchas direcciones repartidas, navegadores que parecen de persona y resolver las comprobaciones. Es lo caro y es lo
   que se discute en los juzgados.
2. **Leer**: saca de la página los datos (nombres, precios, notas, fotos) y los devuelve ordenados.
3. **Mantener**: cada vez que la web cambia su página, la lectura se rompe y hay que rehacerla.

Las formas de tenerlo:

| Forma | Quién hace cada capa | Para nosotros |
|---|---|---|
| Comprarlo hecho (SerpApi, SearchApi) | Ellos, las tres | Lo más rápido; se paga por consulta; solo las webs que cubren. El riesgo, de quien lo usa |
| Alquilar la entrada y leer nosotros | Un proveedor entra; nosotros leemos, con código o con una IA | Vale para cualquier web; la responsabilidad pasa a ser más nuestra: antes, el abogado |
| Montarlo entero | Nosotros, las tres | Es una empresa en sí misma, lo que más se rompe y lo que la sesión no construye |
| Leer desde el navegador del viajero | Entra el viajero; nosotros solo leemos | Sin esconder nada; pide una extensión |

De partida, la cuenta de comprarlo hecho: una búsqueda con diez finalistas son unas 21 consultas (la lista, y las fotos
y las opiniones de cada uno); a 25 USD por 1.000, unos 50 céntimos de dólar por búsqueda, y menos en los planes grandes.

## Darle la vuelta al problema (22-nov)

El PM: «¿no hay otra forma más inteligente? Tipo imprimir páginas en PDF y así no te bloquean». El PDF no evita el
bloqueo: a un programa lo cortan al abrir la página, antes de poder imprimirla. Lo que cuenta es quién abre la página.
De ahí, tres familias, a su decisión y con lo que falta por comprobar:

1. **Que la abra quien puede: el viajero.** Él abre la página en su navegador, y nos pasa el enlace, una captura o la
   página guardada en PDF; o una extensión lo hace por él con un toque. No hay nada que saltarse.
2. **Las puertas que las grandes están abriendo para agentes de IA.**
   - La IA de Google tiene una herramienta oficial que consulta Google Maps (sitios, opiniones, fotos, direcciones):
     5.000 consultas gratis al mes en el nivel de pago y después 14 USD por 1.000. Por comprobar: si vale con
     facturación en Europa, sus condiciones y si deja ver las fotos o solo un resumen. Ese asiento correría con la IA
     de Google.
   - LiteAPI tiene su servidor para agentes, con registro.
   - Booking.com tiene el suyo, oficial, solo para socios aprobados: es la puerta de los acuerdos de después.
   - Tripadvisor tiene búsqueda para agentes, solo si el contrato la incluye.
3. **Donde la información está hecha para repartirse.** Muchos hoteles de cuatro y cinco estrellas publican su ficha
   técnica en PDF para agencias (los metros de cada habitación, la piscina, el gimnasio, los horarios), y sus webs
   llevan datos ordenados para los buscadores. Se leen sin bloqueo y son de primera mano. Por comprobar: cuántos la
   tienen.

## Lo que manda el PM, y el reparto que sale (22-nov)

El PM: lo del PDF era solo una idea; el problema «sigue siendo extracción de datos cuando se pida, en el momento, y no
que el usuario nos traiga nada». Con eso, y sin base que mantener ni depender de aprobaciones, quedan fuera «trae tu
lista» y la extensión.

Leer en el momento, desde nuestros servidores, las páginas de las agencias tiene tres salidas y ninguna más: su permiso
(los acuerdos de después), que otro entre por nosotros (un lector comprado) o entrar a escondidas (que no se hace). Lo
inteligente es no leer esas páginas: la misma información está en sitios que la dan en el momento y sin bloqueo.

| Lo que hace falta | De dónde, en el momento | Por comprobar |
|---|---|---|
| La lista de un radio, con sus mínimos y su precio | LiteAPI, por código | Sus condiciones sobre IA y el coste del exceso |
| Lo que dicen los viajeros | El texto de opiniones de LiteAPI; Google Maps, por la herramienta oficial de la IA de Google; y un buscador hecho para IA, que ya tiene la web leída y se consulta por hotel | Google en Europa; qué buscador, sus condiciones y su precio |
| Las fotos | Las de LiteAPI, por habitación; la web del hotel; las de Google Maps | Si la herramienta de Google deja verlas |
| Los datos duros | La ficha técnica en PDF y la web del hotel | Cuántos la tienen |
| Los vuelos | La Data API de Aviasales (guardados) y el servidor para agentes de Kiwi (en vivo) | Las condiciones de uso comercial de Kiwi |
| Lo que siga faltando | Un lector comprado, como un enchufe más | Lo decide el PM, por su riesgo |

Lo siguiente que propone la sesión: una prueba con hoteles de verdad de una ciudad, fuente a fuente, para ver cuánto de
la ficha de cómo es se llena con cada una.

## Más formas, y lo que se comprobó (22-nov)

El PM: «eso es lo que se conoce; tiene que haber más maneras». Lo que salió, con lo que la sesión comprobó ese día.

**1. La puerta de los agentes de IA con carné.** Las agencias publican qué robots pueden leer sus páginas, y varias
dejan pasar por su nombre a los lectores que usan las IA cuando leen para una persona. Leído por la sesión en las
reglas de cada web (su `robots.txt`):

| Web | Lo que publican para esos lectores |
|---|---|
| Expedia y Hotels.com | Un grupo «AI Search» con los lectores de las tres grandes IA: todo permitido, salvo las páginas de cuenta |
| Tripadvisor | Cierra a los robots que recogen para entrenar; a los lectores de dos de las grandes IA los trata como al resto, con lo general permitido |
| Booking.com | Sin reglas propias para IA; las páginas de hotel no están cerradas a los robots |
| Airbnb | Cierra a los robots de entrenar; a los lectores les deja la página del piso, pero no sus fotos, sus opiniones ni la búsqueda |

En la práctica, la prueba de la sesión con un lector corriente, desde aquí, no pasó en ninguna: Expedia cortó por
exceso de peticiones, Hotels.com dio error y Booking.com devolvió la página vacía. La puerta es para el lector oficial
de cada IA, desde sus direcciones: falta probarlo con la herramienta oficial, que gasta y lanza el PM. Las reglas
publicadas no son las condiciones de uso: lo que diga el abogado.

**2. Preguntar a un índice hecho para IA.** Comprobado: una sola consulta por un hotel de Lisboa devolvió su nota en
Booking.com, sus horarios, sus servicios, lo que dice Expedia (estrellas, azotea, gimnasio, lo que cuesta el
aparcamiento) y el número de habitaciones según otras dos webs, sin abrir ninguna página suya. Da texto, de hotel en
hotel; no da listas enteras ni deja mirar fotos.

**3. Otras, sin comprobar** (de memoria; se miran antes de usarlas):

- Mapas con datos de viajeros que no son Google: Foursquare (nota sobre diez, fotos y consejos de usuarios, búsqueda por
  radio) y HERE.
- OpenStreetMap, a demanda y gratis, para la lista de un radio, con la web de cada hotel.
- El precio directo del hotel, leyendo el motor de reservas de su propia web: lo que los comparadores no suelen dar.
- Imágenes abiertas: fotos aéreas, fotos de calle y fotos con posición de sitios como Flickr.
- KAYAK para afiliados: una sola solicitud para hoteles y vuelos.
- Las copias públicas de la web: descartado para Tripadvisor, que cierra a ese robot.

Ninguna de estas da los pisos de Airbnb.

## Cómo funciona la web de una agencia, y por dónde sale su información (22-nov)

El PM quiere repasar la arquitectura paso a paso, para ver en qué punto se puede sacar la información. La vista
entera, de dentro afuera; el detalle de cada paso, en conversación.

1. **El origen.** El hotel sube sus fotos, sus habitaciones y sus precios, y los viajeros escriben sus opiniones. Todo
   va a las bases de datos de la agencia. Privado.
2. **Las llamadas internas.** Los servicios de dentro (precios, contenido, opiniones) contestan a las llamadas de su
   propia web y de su propia app: «dame los precios de este hotel para estas noches». Es el dato más limpio, pero es
   su interfaz privada, hecha solo para ellos: quien la usa sin permiso entra a escondidas. Su versión con permiso es
   la API de socios.
3. **La página.** Su servidor monta la página con parte de los datos ya dentro: el texto que se ve y un bloque
   ordenado para los buscadores (el nombre, la dirección, la nota, cuántas opiniones, las direcciones de las fotos). Y
   publica la lista de todas sus páginas, para que los buscadores las encuentren.
4. **El portero.** Delante de todo hay una defensa que decide quién pasa: las personas, sí; los robots conocidos (los
   buscadores y, donde lo publican, los lectores de las IA), comprobando su dirección; un programa desconocido, no. No
   es un sitio del que sacar nada: es el filtro. La pregunta no es por dónde se entra, sino con el carné de quién.
5. **El navegador del viajero.** Recibe la página y su código hace más llamadas (los precios de esas noches, más
   opiniones, la galería) y la pinta.
6. **Las fotos.** Viven en otro servidor, hecho para repartir archivos deprisa. Quien tiene la dirección de una foto
   suele poder abrirla.

Por dónde sale la información a propósito:

| Salida | Qué sale | Cómo se llega |
|---|---|---|
| A los buscadores | El texto de cada página y su bloque ordenado | Preguntando a un índice (solución parcial, anotada por el PM) |
| A los lectores de las IA | La página, como a un buscador | Con la herramienta oficial de la IA; por probar |
| A los socios | Lo mismo que las llamadas internas, con permiso | La API de socios: los acuerdos de después |
| A los comparadores (Google Hotels, KAYAK, Trivago) | Sus precios, que la agencia les manda | Por las puertas de esos comparadores: KAYAK para afiliados, las herramientas de Google |
| El servidor de fotos | Los archivos de las fotos | Con la dirección de cada foto, conseguida por una vía permitida; sus derechos, al abogado |
| La pantalla del viajero | Todo lo que ve | Una extensión: fuera, por decisión del PM |

## La solución propia: nuestro índice (22-nov), descartada por el PM

El PM: «creo que tenemos que salir con una solución propietaria en este aspecto», para la información de los hoteles y
para las fotos. Lo que propone la sesión, a su decisión. Las licencias de las fuentes abiertas van de memoria: se
comprueban antes de construir.

**La idea**: lo nuestro no es leer las webs de las agencias, sino tener la ficha propia de cada alojamiento. El
escrutinio se hace una vez por alojamiento, se guarda como dato nuestro (sus niveles, con su prueba y su fecha) y se
refresca cada cierto tiempo. La búsqueda pasa a ser una consulta de código sobre nuestra base.

| Qué | De dónde, siendo nuestro | Qué da | Su límite |
|---|---|---|---|
| Qué alojamientos hay y dónde | Mapas y registros abiertos: OpenStreetMap, Overture Maps, los sitios abiertos de Foursquare y los registros oficiales de turismo | Nombre, tipo, dónde está y su web | Sin nota ni precio; calidad desigual |
| Cómo es por dentro | La web propia de cada hotel, leída por un lector nuestro con IA, a cara descubierta | Habitaciones con sus metros, fotos oficiales, gimnasio, piscina: la ficha de cómo es | Fotos oficiales; un piso particular no tiene web |
| Lo que se mide desde fuera | Fotos aéreas abiertas, mapas y fotos de calle abiertas | El tamaño de la piscina, la distancia real a la playa o al metro, cómo es la calle | La cobertura cambia por país |
| Fotos y opiniones de viajeros | Las de nuestros propios viajeros, que cuentan cómo era; después, la extensión | Lo que no enseña el hotel | Al principio, vacío |
| El precio y la nota | No pueden ser propios: de una API (LiteAPI) o del enlace | Precio en vivo y nota | Los de esa fuente |

**Lo que no cubre**: la nota de Booking.com, las fotos de viajeros de otras webs y los pisos de Airbnb. Para eso, que
el viajero traiga su lista o, después, la extensión.

**Lo que no se hace**: leer a escondidas las webs de las agencias, saltándose sus bloqueos.

**Antes de construir**: una prueba pequeña con los hoteles de una ciudad (cuántos tienen web que se deja leer, qué se
saca y cuánto cuesta por hotel), y que un abogado mire cómo se guardan y se enseñan las fotos.

## Las rutas: cómo se va de un sitio a otro, lo que tarda y lo que cuesta (24-nov)

Mirado el 24-nov-2026, a petición del PM («ok, primero esto»), para el punto 3.14 del plan: de dónde salen el tiempo
de verdad de un trayecto, las maneras de ir que hay y lo que cuesta cada una. Solo lectura: no se registró nada ni se
llamó a ninguna API. Lo hicieron cuatro búsquedas, cada una con sus fuentes; la sesión comprobó aparte, en sus
páginas, las dos que mejor encajan (Geoapify y TripGo). Lo que no se pudo leer en una página oficial va como «sin
confirmar».

### Lo que hace falta

- De cada trayecto (del alojamiento a un sitio, de un sitio a otro y, en un viaje de varias bases, de una base a
  otra), por cada manera de ir: lo que se tarda de verdad, lo que hay de camino, si esa manera existe allí y lo que
  cuesta.
- En cualquier parte del mundo, y para cualquier clase de viaje.
- Que se pueda guardar con el viaje, enseñar en nuestro mapa y pasar por el que explica, que es una IA.
- Cuánto se pide, medido con el viaje de prueba: enseñar un viaje son 16 trayectos, 32 con las tres maneras de
  dormir; elegir alojamiento con tiempos de verdad son unos 400 pares (32 alojamientos con precio por 12 sitios),
  por cada manera de ir.

### Lo que más pesa: guardar, la IA y el mapa

| Fuente | Guardar con el viaje | Pasarlo por una IA | En nuestro mapa |
|---|---|---|---|
| Geoapify | Sí: «you can store and redistribute your results», en la página del producto; sus condiciones (versión de feb-2024) no lo tocan | Sin cláusula | Sin cláusula; pide atribución |
| openrouteservice (HeiGIT) | Sin confirmar. Sus resultados llevan licencia de compartir igual (CC BY-SA 4.0), según un resumen de sus condiciones | Sin confirmar | Sí, con atribución |
| TripGo (SkedGo) | Sin cláusula | Sin cláusula en lo leído (de la cláusula 17 en adelante, sin leer) | No lo tocan. No deja mezclar sus resultados con los de otros sin que se distingan (8(e)) y pide «Powered by SkedGo/TripGo», bien visible, en la misma pantalla |
| Google Routes (condiciones para Europa) | No: solo coordenadas, y 30 días | No se puede «crear contenido» a partir del suyo; sin permiso expreso para una IA que escriba al usuario | El tiempo y la distancia, sí; las líneas y las paradas, no junto a un mapa |
| HERE | 30 días | Prohibido sin acuerdo escrito, también la IA generativa | Sí, con atribución |
| TomTom | No | No lo prohíbe expresamente | No lo dice |
| Mapbox | No | Prohibido «operar» una IA con sus servicios; tampoco deja las consultas hechas por código | Sí, con atribución |
| Stadia Maps | No: solo en el cliente, 7 días | Sin cláusula para rutas | Sin confirmar |
| GraphHopper | Solo caché temporal en el cliente | Sin cláusula | Sí |

### Qué da cada una

| Fuente | ¿Se entra ya? | Precio | Qué da | La pega |
|---|---|---|---|---|
| Geoapify | Sí, sin tarjeta | 3.000 créditos gratis al día; después, desde 59 USD al mes (10.000 al día). Un trayecto, 1 crédito; una matriz de 32 por 12, 320 | A pie, en coche, en bici y en transporte público: con los horarios oficiales donde los hay («transit») y, donde no, con las líneas de OpenStreetMap («approximated_transit»). Matriz de hasta 1.000 casillas. Dice cubrir el transporte público de todo el mundo | No da tarifas ni precio de taxi. Sus páginas no dicen si la matriz admite el transporte público ni si da las horas de salida. Su página de precios deja el plan gratis en producción; sus condiciones dicen «con algunas limitaciones». Atribución obligatoria en el plan gratis |
| openrouteservice (HeiGIT) | Sí, con cuenta gratis | Gratis: 2.000 rutas y 500 matrices al día (de un resumen del buscador: su página no se pudo leer) | A pie, en coche y en bici; matriz de 3.500 casillas | Sin transporte público fuera de Alemania. Lo de compartir igual sobre lo guardado, por mirar |
| TripGo (SkedGo) | Sí, sin tarjeta | Gratis: 10.000 consultas al mes; por 5 USD al mes, 75.000 | Transporte público, taxi, coche con conductor, coche propio, a pie y largo recorrido, juntos de puerta a puerta, con lo que cuesta cuando lo sabe: un coste vacío quiere decir que no se sabe, no que sea gratis. Dice por su API qué regiones y qué maneras cubre | Más de 500 ciudades y regiones: no es el mundo entero. Sus condiciones se pueden cambiar sin aviso. Los campos de precio, vistos en su especificación por una sola búsqueda |
| Google Routes | Sí, con tarjeta | 10.000 gratis al mes; después, 5 USD por 1.000 (en la matriz, por casilla) | A pie, en coche, en bici y en transporte público, con líneas, paradas y horas; la tarifa, solo donde la sabe; peajes en algunas ciudades | Sus condiciones, arriba. Sin precio de taxi |
| HERE | Sí, con tarjeta | Gratis al mes: 30.000 rutas y 5.000 de transporte público; después, de 0,70 a 4,66 EUR por 1.000 | A pie, en coche y en transporte público en 67 países; peajes. Las tarifas, «pronto» | La IA, prohibida sin acuerdo |
| TomTom y Mapbox | Sí | Gratis al mes: 20.000 y 100.000 | A pie y en coche | Sin transporte público, y no dejan guardar |
| GraphHopper, Stadia Maps y TravelTime | Sí | El plan gratis, solo para uso no comercial | A pie y en coche; TravelTime, además, transporte público en 143 países | No valen para vender; Stadia y TravelTime tampoco dejan guardar |
| Transitous (de la comunidad) | Sí, sin clave | Gratis | El transporte público de muchos países, con tarifas en pruebas | Prohíbe el uso comercial y pide que el proyecto sea abierto |
| Transitland y Navitia | Sin confirmar: sus páginas no se pudieron leer | | Transitland, transporte público solo en Estados Unidos; Navitia, con tarifas donde las hay | |
| Taxi: Uber, FreeNow, Bolt, Lyft y TaxiFareFinder | Uber y FreeNow, cerradas; Bolt y Lyft, sin confirmar; TaxiFareFinder, con clave a petición | TaxiFareFinder: 5.000 consultas gratis al día | El precio estimado de una carrera, en sus ciudades | TaxiFareFinder prohíbe guardar y las llamadas hechas por código |
| Tren, bus y ferry: Omio, Trainline, 12Go, Busbud, Distribusion, FlixBus, Kiwi y Rome2Rio | Ninguna abierta: Omio pide tráfico; Trainline, solo enlaces; 12Go, Busbud, Distribusion y FlixBus, a petición; Kiwi, por invitación; Rome2Rio, sin confirmar (su documentación ya no está) | Comisión, sin confirmar | Precios y horarios, para quien tiene acuerdo | Al principio, solo enlaces |
| Por Travelpayouts: intui.travel y GetTransfer | A petición (de resúmenes del buscador: su ayuda no se pudo abrir) | Comisión: en intui.travel, un 10 % | Traslados con su precio, en más de 175 países | El resto de sus programas de tierra (12Go, Kiwitaxi, Localrent, Economybookings), solo enlaces |
| Peajes y gasolina: TollGuru | Sí | 14 días de prueba; después, desde 80 USD al mes | Lo que cuesta un trayecto en coche | Sin plan gratis |

### Lo que sale de aquí

- **Lo que se tarda y si se puede ir, a pie, en coche y en transporte público**: hay una fuente que encaja con lo que
  hace El Dorado (guardar, enseñar en nuestro mapa, sin cláusula contra la IA) y es gratis a este tamaño: Geoapify.
  Enseñar un viaje gasta menos de 100 créditos; elegir alojamiento con tiempos de verdad, unos 320 por cada manera
  de ir. Caben varios viajes al día en el plan gratis, y decenas si para elegir alojamiento se sigue con la cuenta
  aproximada de hoy.
- **Lo que cuesta cada manera**: ninguna fuente abierta lo da en todo el mundo. TripGo lo da donde cubre. Google lo
  da donde lo sabe, pero no deja guardarlo ni contarlo con una IA.
- **Entre ciudades, en tren, bus o ferry, con su precio**: solo con acuerdos, que piden tráfico o una web en marcha.
  Mientras, enlaces.
- **El enlace de cada día a Google Maps**, que la web ya lleva, no usa su API: sigue valiendo para la ruta exacta.
- **Las grandes (Google, HERE, TomTom, Mapbox) no encajan** con un viaje que se guarda y que explica una IA: lo
  prohíben sus condiciones, no su precio.

### Google Maps, como ventana y no como fuente (24-nov)

El PM propuso usar Google Maps pidiendo permiso al viajero y haciéndolo desde su propio navegador. Mirado ese día
en las páginas de Google:

- **Un enlace a Google Maps** no pide clave («You don't need a Google API key to use Maps URLs») y admite el origen,
  el destino y la manera de ir; sin decir la manera, Google enseña las que más encajan. Es lo que lleva la web: el
  viajero ve en Google cómo ir de verdad, con sus horarios y lo que cuesta si lo sabe. Lo que enseña Google se queda
  en Google.
- **El mapa de Google incrustado** en la página también es gratis y sin límite («All Maps Embed API requests are
  available at no charge with unlimited usage»), con su modo de cómo ir. Pide una clave de Google y, por tanto, un
  proyecto en su nube; si además pide tarjeta, sin confirmar. Queda como mejora.
- **Traerse los números a El Dorado** es otra cosa. Una página no puede leer lo que enseña Google en otra pestaña
  o en un marco. Solo hay dos caminos: la API de Google con nuestra clave, corriendo en el navegador del viajero,
  que es la misma API con las mismas condiciones (no guardar, no crear contenido con una IA), y el acuerdo es entre
  Google y nosotros, no con el viajero: no se encontró ninguna excepción por su permiso; o una extensión que lea la
  página de Google Maps, que el PM descartó el 22-nov, solo valdría en Chrome de escritorio, se rompe cada vez que
  Google cambia su página, y las condiciones de uso de Google Maps no dejan copiar su contenido.

Así que Google sirve para que el viajero vea, y no para que El Dorado sepa. Los números que El Dorado necesita
suyos (para elegir dónde dormir por lo que se tarda de verdad, ordenar los días y decirlo) tienen que salir de
otra fuente.

### Las opciones, para el PM

1. **Geoapify** (la que recomienda la sesión). Da el tiempo de verdad y si se puede ir, por las tres maneras. Lo que
   cuesta cada una sigue sin saberse: se dice la distancia y el tiempo, como pidió el PM para cuando no se sabe.
   Gratis a este tamaño.
2. **Geoapify y, donde cubre, TripGo**. Añade lo que cuesta el transporte público y el taxi en sus más de 500
   ciudades y regiones. Pide enseñar su marca bien visible y no mezclar sus datos con los de otros; y sus
   condiciones no dicen nada de guardar ni de la IA: antes, preguntárselo por escrito. Gratis a este tamaño.
3. **Google Routes**. La más completa, con tarjeta y 5 USD por cada 1.000 consultas pasadas las 10.000 gratis del
   mes. No encaja con sus condiciones para Europa: habría que pedirla en vivo cada vez, sin guardarla y sin que la
   cuente el que explica.

Antes de construir sobre la que se elija: probarla con una clave gratis en cuatro o cinco destinos de clases
distintas (una gran ciudad de otro continente, un pueblo, un sitio de naturaleza y una ruta por un país), para ver
qué transporte público conoce de verdad y cuál aproxima; y preguntar por escrito lo que sus condiciones no dicen (a
Geoapify, la IA y las limitaciones del plan gratis en producción).

## Lo que queda por saber

- LiteAPI: sus condiciones sobre IA y caché, lo que cuesta el exceso de búsquedas y cuántas fotos da.
- Booking.com: criterios, plazos y comisión, y si aprobaría el uso de IA.
- Qué aerolíneas de bajo coste cubre cada fuente de vuelos.
- En qué queda la demanda de Google a SerpApi (plazo para volver a presentarla, hacia el 30-nov-2026).
- Si se pueden usar las fotos de la web de cada hotel, y con qué condiciones.
- Geoapify: qué transporte público conoce de verdad en cada clase de destino y cuál aproxima; si su matriz lo admite;
  y, por escrito, si deja pasar sus resultados por una IA y qué limita del plan gratis en producción.
- TripGo: por escrito, si deja guardar sus resultados con un viaje y pasarlos por una IA, y cómo hay que enseñarlos
  al lado de los de otra fuente.
- openrouteservice: sus condiciones y sus planes, que no se pudieron leer.

## Fuentes

Alojamiento:

- https://docs.liteapi.travel/reference/get_data-hotels
- https://docs.liteapi.travel/docs/rate-request-parameters-guide
- https://docs.nuitee.com/docs/faq
- https://developers.booking.com/demand/docs/getting-started/prerequisites
- https://developers.booking.com/demand/docs/accommodations/filter-sorting
- https://developers.expediagroup.com/travel-redirect-api/api
- https://developers.expediagroup.com/xap-apis/api/resources/terms-and-conditions
- https://docs.terra.tripadvisor.com/docs/api-master-terms
- https://docs.terra.tripadvisor.com/docs/caching-policy
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses
- https://serpapi.com/google-hotels-api
- https://serpapi.com/pricing
- https://www.searchapi.io/pricing
- https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook
- https://www.airbnb.com/help/article/3418

Vuelos y trenes:

- https://support.travelpayouts.com/hc/en-us/articles/203956163
- https://support.travelpayouts.com/hc/en-us/articles/203956083-Requirements-for-Aviasales-data-API-access
- https://support.travelpayouts.com/hc/en-us/articles/4402565416594
- https://travelpayouts.com/en/offers/aviasales-affiliate-program
- https://serpapi.com/google-flights-api
- https://serpapi.com/blog/court-dismisses-googles-amended-complaint-against-serpapi/
- https://duffel.com/pricing
- https://duffel.com/services-agreement
- https://skyscannerpartnersupport.zendesk.com/hc/en-us/articles/10881149122717-What-is-the-acceptance-criteria-for-the-Travel-API
- https://affiliates.kayak.com/apis/flights
- https://amadeus.com/en/industry-messaging/statement-regarding-amadeus-for-developers-portal
- https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers
- https://skift.com/2026/09/03/amadeus-brings-travel-tech-into-claude/
- https://developers.google.com/travel/flights
- https://www.thetrainline.com/about-us/affiliates

Rutas:

- https://www.geoapify.com/pricing/
- https://www.geoapify.com/pricing-details/
- https://www.geoapify.com/routing-api/
- https://apidocs.geoapify.com/docs/routing/
- https://apidocs.geoapify.com/docs/route-matrix/
- https://www.geoapify.com/terms-and-conditions/
- https://giscience.github.io/openrouteservice/hosted-api-restrictions
- https://skedgo.com/tripgo-api/pricing/
- https://skedgo.com/home/terms-of-use/
- https://developer.tripgo.com/faq/
- https://cloud.google.com/terms/maps-platform/eea
- https://cloud.google.com/terms/maps-platform/eea/maps-service-terms
- https://developers.google.com/maps/comms/eea/routes
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/documentation/routes/usage-and-billing
- https://www.here.com/get-started/pricing
- https://www.here.com/en-gb/terms/here-platform-terms
- https://docs.here.com/transit/docs/coverage-transit
- https://docs.tomtom.com/pricing
- https://docs.tomtom.com/legal/terms-and-conditions
- https://www.mapbox.com/pricing
- https://www.mapbox.com/legal/product-terms
- https://www.graphhopper.com/pricing/
- https://www.graphhopper.com/terms/
- https://stadiamaps.com/pricing/
- https://stadiamaps.com/terms-of-service/
- https://traveltime.com/pricing
- https://traveltime.com/terms-and-conditions
- https://transitous.org/api/
- https://doc.navitia.io/
- https://www.taxifarefinder.com/apifaq.php
- https://developer.uber.com/docs/riders/references/api/v1.2/estimates-price-get
- https://www.thetrainline.com/about-us/partnerships/affiliates
- https://www.busbud.com/partner/busbud-api/
- https://docs.distribusion.com/dt/api/getting-started/intro
- https://global.flixbus.com/company/partners/affiliate-partners
- https://partner.intui.travel/en/
- https://tollguru.com/toll-api-pricing-plans
- https://developers.google.com/maps/documentation/urls/get-started
- https://developers.google.com/maps/documentation/embed/get-started
- https://developers.google.com/maps/documentation/embed/usage-and-billing
- https://www.google.com/help/terms_maps/
