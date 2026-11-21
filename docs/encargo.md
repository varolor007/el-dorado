# El encargo (etapa 1)

La ficha sale de las respuestas del PM del 21-nov. Las preguntas al viajero, aprobadas ese día. Su proceso, en cajas,
se rehace con él paso a paso (su «hay mucho más de lo que me has propuesto», del 21-nov): aún sin firma.

## La ficha

| Campo | Qué |
|---|---|
| Dominio | Viajes: el transporte hasta el destino, el alojamiento, cómo moverse allí y qué hacer cada día |
| Objetivo | Proponer el viaje entero que pide el viajero al mejor precio, con cada precio comprobable. |
| Entrada | Lo que escribe el viajero: de dónde sale; a dónde va o qué busca («playa en marzo»); las fechas y cuánto se pueden mover; quiénes viajan; el presupuesto, y sus gustos (escalas, tipo de alojamiento, ritmo) |
| Salida | En la web: un mapa interactivo del viaje (la ruta, dónde dormir y qué ver cada día) junto a dos o tres opciones ordenadas por su precio total, cada una con su transporte, su alojamiento, su día a día y su presupuesto. Cada precio, con su enlace y su fecha. Cómo se construye, por decidir |
| Frecuencia | Cada vez que alguien planifica un viaje |
| Tipo | Primero, de una tirada: un botón y corre hasta el viaje propuesto. Después, por momentos: el viajero vuelve a cada vertical (el transporte, el alojamiento, el día a día) y la cambia, como en DaVi |
| Conectores | Ninguno en la primera versión: los precios salen de la web. Después, una API de vuelos y hoteles, que se conecta aparte |
| Para quién | Para vender en Cortex, a cualquier viajero |
| Aviso | «Hecho con IA: puede tener errores; revísalo antes de usarlo. Los precios son orientativos: compruébalos al reservar.» |

## Lo que decido y te cuento

- **El precio total, no el de cartel**: con tasas, equipaje, traslados y lo que el alojamiento cobra aparte. Es lo que
  compara un profesional, y lo barato de cartel suele salir caro.
- **Dos o tres opciones, no diez**: la más barata, la mejor por lo que cuesta y, si cabe, una distinta (otra fecha u
  otro aeropuerto). Más opciones no ayudan a decidir.
- **El agente propone y enlaza; no reserva ni paga.** Reservar sería un conector y mover dinero: eso, si llega, va
  aparte.
- **Un precio sin su enlace y su fecha no sale**, y lo que no encuentra, lo dice: nunca rellena con un precio
  inventado.

## Las preguntas al viajero (aprobadas por el PM, 21-nov)

El viajero elige el destino, en el mapa o escrito, y da sus fechas. Para arrancar faltan cinco cosas, todas con toques
y sin escribir. Solo se pregunta lo que nada más sabe él; lo demás lo mira el agente y avisa.

1. **¿De dónde sales?** Su ciudad, propuesta por su ubicación; solo confirma.
2. **¿Quiénes vais?** Adultos y niños, con la edad de los niños. El pasaporte de cada uno, ya puesto por su país; lo
   cambia si no es ese.
3. **¿Tus fechas son fijas?** Fijas, puedo moverlas unos días o me vale cualquier semana del mes.
4. **¿Cuánto quieres gastar?** Una cifra, o tres niveles: ajustado, medio o cómodo. También vale «no lo sé»: entonces
   ve el viaje en tres precios.
5. **¿Qué buscas en este viaje?** Descansar, ver lo imprescindible, naturaleza, comer bien, salir o de todo un poco.
   Puede marcar varias.

Y una casilla opcional, «Ya tengo algo reservado»: los vuelos, el alojamiento o un día fijo, como una boda.

**Lo que no se pregunta**: se supone, se dice y se cambia después en su vertical. Vuelos directos o con escala y la
maleta; el tipo de alojamiento y la zona; si alquila coche; y la ruta, si eligió un país y no una ciudad.

**Lo que mira el agente solo con las fechas, y avisa antes de arrancar**: el clima y la temporada, las fiestas y los
eventos que encarecen o cierran, cuántos días pide el destino, lo que se agota con antelación y los papeles
(pasaporte, visado, vacunas y avisos). Si las fechas se pueden mover, propone otras mejores.

## Tu proceso, en cajas (versión 1, en revisión con el PM, paso a paso)

Lo hablado el 21-nov, aún sin cerrar: antes de las cajas de abajo van «¿Cuándo y cuántos días?» y «Los papeles», en
caja propia; y la búsqueda sigue este orden: el esqueleto del viaje, sin precios (dónde se duerme cada noche, por dónde
se entra y se sale); el transporte largo, primero; el alojamiento, sobre los vuelos que quedan; cruzar, por la suma, que
hace el código; y las alternativas. Lo que se considera en cada uno (cómo se valora un vuelo y un alojamiento, qué
descarta y cómo se pondera), en conversación.

Los pasos del trabajo, como los haría un agente de viajes con oficio; nunca las partes de lo que entrega.

1. **Entender el viaje.** Lo que es fijo (fechas, quiénes, presupuesto) y lo que se puede mover (días, aeropuertos,
   zona), porque ahí está el ahorro.
2. **Abrir el abanico.** Aeropuertos y fechas cercanas, rutas con escala, tren o autobús, y las zonas donde merece la
   pena dormir.
3. **Buscar el transporte.** Vuelos y trenes en la web, cada precio con su enlace y su fecha.
4. **Buscar el alojamiento.** Por zona, con el precio total de la estancia y lo que incluye.
5. **Montar el día a día.** Qué ver, en qué orden y cómo moverse, con las distancias reales.
6. **Combinar y comparar.** Dos o tres viajes completos, cada uno con su precio total, ordenados.
7. **Comprobar.** Que todo cuadra: las horas de llegada con la entrada al alojamiento, los enlaces que funcionan, cada
   precio con su fecha y nada inventado.

Por momentos, después: las cajas 3, 4 y 5 son las verticales a las que vuelve el viajero, y cada vuelta pasa otra vez
por la 6 y la 7.

## La puerta 1: ¿encargo claro?

| Comprueba | Estado |
|---|---|
| El objetivo cabe en una frase | sí |
| Salida, frecuencia y entrada, definidas | sí; de la salida, cómo se construye, por decidir |
| La salida, sin conectores en la primera versión | sí: los precios, de la web |
| El tipo, dicho | sí: de una tirada primero; por momentos, después, con sus momentos por decidir |
| Tu proceso, de 4 a 8 cajas, en pasos del trabajo y firmado | en revisión con el PM, paso a paso |
