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

## Lo que queda por saber

- LiteAPI: sus condiciones sobre IA y caché, lo que cuesta el exceso de búsquedas y cuántas fotos da.
- Booking.com: criterios, plazos y comisión, y si aprobaría el uso de IA.
- Qué aerolíneas de bajo coste cubre cada fuente de vuelos.
- En qué queda la demanda de Google a SerpApi (plazo para volver a presentarla, hacia el 30-nov-2026).
- Si se pueden usar las fotos de la web de cada hotel, y con qué condiciones.

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
