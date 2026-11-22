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

## Pendientes

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
