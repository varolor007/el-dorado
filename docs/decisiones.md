# Las decisiones de El Dorado

Cada decisión, con su fecha y quién la tomó; lo viejo, tachado; lo pendiente, aparte, al final.

## 21-nov-2026

- **El agente.** Un agente de viajes, para planificar viajes al mejor precio, construido en este repositorio. El método,
  el del ensamblador de Cortex, que se lee en `varolor007/aurora-web` (el PM).
- **Para quién.** Para vender en Cortex, a cualquier viajero (el PM).
- **Los precios.** Web primero, API después: la primera versión, sin conectores, busca en la web y da cada precio con
  su enlace y su fecha, que se confirma al reservar; queda preparada para conectar una API de vuelos y hoteles (el PM).
- **La salida.** En la propia web: «quiero un mapa interactivo y demás como output en la propia web; ya veremos cómo lo
  construimos» (el PM). Cómo, pendiente.
- **El tipo.** Los dos: primero, de una tirada, de punta a punta; después, el viajero lo usa por momentos, «por
  verticales, como DaVi» (el PM).
- **Lo que decide la sesión y cuenta** (en el encargo): el precio que se compara es el total; dos o tres opciones; el
  agente propone y enlaza, no reserva ni paga; ningún precio sin su enlace y su fecha, y nada inventado.
- **Cómo se escribe** (la sesión, como en el ensamblador): el código, en TypeScript sobre Node 22; los contratos, en
  inglés; lo que ve el cliente en la web, en inglés; lo demás, en español.
- **Las preguntas al viajero.** Con el destino y las fechas, cinco preguntas con toques (de dónde sale, quiénes van,
  si las fechas son fijas, cuánto quiere gastar y qué busca) y una casilla, «Ya tengo algo reservado». Lo demás se
  supone, se dice y se cambia en su vertical (el PM: «me parece bien»). En el encargo. Son una base, no una lista
  cerrada: «puede haber más» (el PM); el agente pregunta más solo si la respuesta cambia el viaje, y hay una caja libre.
- **Cómo se valora, en tres cribas** (la sesión; el PM: «not bad, vamos mejorando»): qué se descarta, qué se suma al
  precio y qué se puntúa, con pesos de partida que se ajustan en el ensayo. Los requisitos de entrada no se guardan
  por país: se guarda la lista de preguntas y cada respuesta se busca en su fuente oficial. En `oficio.md`, borrador.
- **Un alojamiento no es su nota** (el PM): «aparte de por la puntuación de Booking o las estrellas, nos fijamos por la
  vista, cómo de aesthetic es la habitación, cómo de moderno; tiene gimnasio y piscina, ok, pero ¿es grande, tiene
  vistas, máquinas modernas? Eso hay que saber sacarlo también». Cómo se saca, en `oficio.md`.
- **El proceso se rehace paso a paso con el PM**: «hay mucho más de lo que me has propuesto». Las siete cajas de la
  versión 1 quedan en revisión.
- **Un asiento que une a los dos buscadores** (el PM): «tienen que tener uno que los una, que cruce, que optimice, que
  cambie, que vea variabilidad». Es el que cruza; las cuentas siguen siendo del código.
- **Antes de seguir con el resto del viaje, la base** (el PM): el proceso de cada asiento, con normas claras y puertas.
  En `asientos.md`, borrador, a su revisión.

## 22-nov-2026

- **La primera búsqueda de alojamiento es código** (el PM): «tiene que ser casi determinista, casi un código:
  descárgame todos los alojamientos en cierto radio, que sean más de 8, de 4 o 5 estrellas, o las otras cosas que le
  has preguntado. Son las características mínimas. Eso no necesitas mirar nada: son los datos puros que te trae la
  plataforma. Ahí lo que tiene que entrar es el que mire los alojamientos, para saber discernir bien». El buscador de
  alojamiento deja de ser un asiento; las zonas las marca el de la ruta. En `asientos.md`.
- **Las puertas, explicadas** (el PM): «me tendrás que decir qué están midiendo esas puertas y por qué lo van a medir
  bien». En `puertas.md`: lo que miden bien (las cuentas y la forma, de dónde sale cada cosa y que las piezas casen), lo
  que no (si un juicio es acertado) y con qué se cubre (el banco, dos fuentes, otra pasada a ciegas y el viajero).
- **Las fuentes de datos, miradas** (el PM: «sí»): qué hay para alojamiento y para vuelos, con sus condiciones y su
  precio, en `fuentes.md`. Lo que más pesa: las fuentes grandes limitan en sus condiciones pasar sus fotos y sus
  opiniones por una IA (Booking.com, solo con su aprobación por escrito), que es lo que hace el asiento que mira el
  alojamiento.
- **Una solución propia para los datos** (el PM): «tenemos que salir con una solución propietaria en este aspecto»,
  para la información de los hoteles y para las fotos. ~~La sesión propone un índice nuestro: la ficha de cada
  alojamiento, hecha una vez y guardada.~~ Descartado por el PM ese día: «requiere mantener una base de datos
  actualizada y no puede ser».
- **Una herramienta que saca la información cada vez** (el PM): sin base que mantener, «al menos de momento, hasta que
  funcione; luego ya discutiré con un abogado una estrategia de acuerdos con las grandes bases de datos». La sesión
  propone una herramienta nuestra con enchufes, una fuente por enchufe, que se cambian sin tocar el resto. En
  `fuentes.md`.
- **Los datos se sacan en el momento y el viajero no trae nada** (el PM): «extracción de datos cuando se pida, en el
  momento, y no que el usuario nos traiga nada». Quedan fuera «trae tu lista» y la extensión. El reparto que sale, en
  `fuentes.md`.
- **El índice para IA, posible solución parcial** (el PM: «anota esto como potencial solución parcial»): preguntar a
  un buscador hecho para IA por la nota y lo que se dice de cada finalista. Da texto, hotel a hotel y con días de
  retraso; no da la lista ni las fotos. En `fuentes.md`.
- **Se repasa cómo funciona la web de una agencia, paso a paso** (el PM), para ver en qué punto se puede sacar la
  información. La vista entera, en `fuentes.md`.
- **El mapa de los datos** (el PM): «sepárame todas las piezas de información que necesitemos y los puntos de donde
  las podemos conseguir». En `datos.md`: veinticinco piezas y catorce puntos. El cómo de cada pieza se amplía con él,
  una a una.
- **El gasto de esta cuenta** (el PM): «lo que tire de esta cuenta nos da igual». La sesión lo lee así: lo que gasta
  la propia sesión, con su IA, su búsqueda y su lector, no espera su visto bueno cada vez. Lo demás sigue como dice la
  regla 5: una clave nueva, una API de pago o un run del agente, con su visto bueno.
- **Lo mínimo para empezar, simplificado** (la sesión, a petición del PM): tres registros (LiteAPI, Aviasales y un
  índice de imágenes) y la IA de esta cuenta. La IA de Google y los vídeos de YouTube quedan como idea, fuera de la
  primera versión, salvo que el PM diga otra cosa: meten otra IA y otra cuenta.

## 23-nov-2026

- **El PM se registró en Travelpayouts y en LiteAPI** y dio sus dos claves por el formulario seguro: quedan en su
  entorno, fuera del repositorio. Las dos responden: lo comprobado, en `datos.md`.
- **El PM se registró también en Parallel**, por su índice de imágenes, y dio su clave por el formulario seguro. Al
  probarlo, la sesión vio que busca además hoteles y pisos, con el precio de Booking.com y de Airbnb y su enlace: lo
  comprobado, en `datos.md`. Falta saber de dónde saca esos datos y leer sus condiciones.
- **Las condiciones de las tres fuentes, leídas** (el PM: «lee las condiciones de todo»). En `condiciones.md`. Para
  probar y montar las bases, valen ya; para salir con un producto faltan tres respuestas, que van a pendientes.
- **La primera búsqueda entera, de prueba**, corrió con Lisboa: lo que enseñó, en `datos.md`.

## Pendientes

- **Preguntar a LiteAPI, por escrito** (23-nov): si nuestra IA puede valorar sus fotos y sus opiniones para el
  viajero, y si sus datos se pueden cruzar con los de otras fuentes; sus condiciones prohíben «obras derivadas» y
  «mapear» sus datos con terceros. Y qué cuenta como búsqueda y qué cuesta pasarse. La pregunta la manda el PM.
- **El riesgo de Parallel** (23-nov): no dice de dónde saca los precios de Booking.com y de Airbnb, y todo el riesgo
  frente a terceros es del cliente. Decide el PM, con su abogado, si se enchufa en el producto.
- **Preguntar al soporte de Travelpayouts** (23-nov): si el proyecto, declarado como web de contenido, vale para una
  web de planificar viajes con un agente de IA que aún no es pública. La manda el PM.
- **La clave de producción de LiteAPI** (23-nov): la de pruebas da datos de muestra; la de verdad pide una tarjeta y
  los datos de la empresa. Del PM.

- **Qué se enchufa hoy en la herramienta de datos** (22-nov): el nivel A, limpio (LiteAPI y la web propia de cada
  finalista), o el A más el B, con un servicio que lee Google Hotels por nosotros, de pago y con riesgo legal y de
  corte. La sesión recomienda empezar por el A. Decide el PM; registrarse y aceptar condiciones es suyo. Para los
  vuelos, la Data API de Aviasales. En `fuentes.md`.
- **Los acuerdos con las grandes** (Booking.com y demás): el PM, con un abogado, cuando el agente funcione.
- **El transporte, también código**: lo propone la sesión; decide el PM.

- **La salida en la web**: dónde vive (la web de Cortex o una propia) y con qué se pinta el mapa. En su etapa, antes
  de construirla.
- **Los momentos**: qué verticales exactamente, qué se guarda de un viaje y quién trabaja en cada una. Al diseñar el
  tipo por momentos, tras la primera versión.
- **La API de precios**: cuál, y si es de pago. Después de la primera versión.
- **Un revisor del viaje entero**, que no lo hizo: lo propone la sesión; por hablar.
- **Las fotos de los alojamientos**: de dónde se leen en la primera versión (las de viajeros piden casi siempre una
  API) y con qué derechos se enseñan en una web que se vende. Antes de construir la salida.
- **Dónde corre el agente y quién paga su IA**: en el servidor del motor de Cortex o aparte, y si la paga el cliente
  con su cuenta, como al crear un agente. Antes del ensayo.
