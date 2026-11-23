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
- **Es un MVP, sin uso comercial, y el PM lo aprueba todo** (el PM): «de momento no es comercial y yo apruebo todo; ya
  lo pasaré con el abogado cuando llegue el momento de comercializar. De momento seguimos a por el MVP: dale a montar
  las bases y todo el repositorio». Las tres fuentes se usan ya, también Parallel y la IA sobre las fotos de LiteAPI;
  lo que dicen sus condiciones queda para antes de vender.
- **Las bases, antes de la hoja** (el PM): se construye ya el recolector en el repositorio, aunque el método pone la
  hoja y el plan delante. Sus commits, «Bases: ...».
- **Las bases, montadas**: el recolector con un enchufe por fuente, los pasos de la búsqueda de alojamiento, su puerta
  con dieciocho trampas, el arranque desde la terminal, la mesa fuera del repositorio, el caso inventado, la batería y
  la prueba del repositorio. La búsqueda de Lisboa corre con el código nuevo en unos veinte segundos, con la puerta en
  verde. En `MAP.md`.
- **Una dependencia de desarrollo** (la sesión): el comprobador de tipos y el formateador, solo para la batería y el
  formato. Para funcionar, el agente sigue sin ninguna.
- **El formato de la hoja es el de las hojas de Cortex** (el PM): «sí, sí, este es nuestro formato; usamos estas hojas
  como plan y biblia para nunca irnos o desviarnos del diseño del agente, y de esta nace siempre el plan posterior». Dio
  de referencia la última de DaVi, que va por momentos. De ella se toma el formato, y nada de su contenido.
- **La hoja y el plan de El Dorado, versión 1, a su firma**: ocho momentos (dos con orden y seis que se abren cuando el
  viajero quiere), con sus filas, su flujo, la casa, las puertas, los asientos, los datos y lo decidido; y el plan, en
  diez bloques, con cada caja de la hoja en su punto. Se escriben en datos y de ahí salen sus páginas (https://claude.ai/artifact/D67ow4BecJge9aiZYCSS73 y
  https://claude.ai/artifact/UKjEhSMnxTU5bj9Eeddy6t) y sus textos (`hoja.md` y `plan.md`).
- **El dibujo del run del 21-nov se retira del repositorio**: lo sustituye la hoja. Su página publicada
  (https://claude.ai/artifact/8Sbboq8J5gdjZARHRG7Gyw) sigue ahí, vieja, hasta que el PM diga de borrarla.
- **La hoja y el plan, firmados** (el PM, 23-nov: «dale, sí»). Desde aquí mandan, y empieza la primera tanda: el
  primer asiento de IA, el que mira el alojamiento.

- **La tanda 1, hecha** (la sesión, con el «dale, sí» del PM): el método común de los asientos y la puerta de todos
  (2.4), cómo se lanza un asiento (2.3), las fotos (3.6) y el que mira el alojamiento con la puerta 5 (4.2). En esta
  tanda los asientos los lanzó la sesión de trabajo, a mano: quién piensa en cada asiento en el producto sigue por
  decidir.
- **El que mira el alojamiento, a ciegas** (la sesión): no recibe ni el nombre, ni el precio, ni la nota, ni las
  estrellas, ni el resumen de opiniones que hace la fuente. Sí las fechas, porque hay cosas que existen pero no para
  ese viaje. En esta tanda no sale a internet: el contraste con otras webs espera al lector de webs (3.5).
- **Otra pasada a ciegas, de serie en la prueba** (la sesión): cada finalista lo miran dos asientos que no saben el
  uno del otro, y el código compara sus niveles. Es la medida de lo que las puertas no pueden ver.
- **La prueba con los cinco finalistas de Lisboa** (23-nov): diez asientos, diez fichas; las dos puertas, en verde en
  las diez; las dos pasadas rotulan igual 196 de 198 fotos y coinciden en 38 de 40 campos. Cada asiento tardó unos
  catorce minutos. Lo que enseñó, en `datos.md`; la página para el PM, en
  https://claude.ai/artifact/G2ATff6Kp9J9fq4hVn7xpE.
- **Una nota puede hablar de toda una carpeta** (la sesión, por lo que enseñó la primera entrega): «ninguna foto
  enseña un gimnasio» cita la carpeta de las fotos. El método y la puerta de todos lo aceptan.
- **Seguimos con el agente entero, con su web** (el PM): «medio veo que las cosas empiezan a funcionar: sigamos con
  el agente per se, la página web y todo. Te voy a dar libertad para gestionarlo E2E». La web tiene que quitar
  fricción y ser «award winning en diseño».
- **Cómo se imagina el viaje del usuario** (el PM): un mapa del mundo en plano con una barra arriba (dónde y cuándo,
  «como un buscador de Booking»); el mapa hace zoom al destino; un botón para empezar; la investigación se ve, con
  partículas y hallazgos, y va preguntando; la salida, el mapa del destino con una capa por día, paradas con su
  foto en un círculo, flechas de una a otra y enlace a Google Maps, y cuántas cosas al día según el ritmo; dónde
  dormir y sus opciones; lo que se ahorra con un día antes, otro hotel u otra zona, «aunque nos haya puesto que esos
  días no son variables»; al cerrar, los enlaces de donde se encontró cada precio; y una mini guía para descargar.
- **Portada, cuenta, clave y panel** (el PM): una portada que presente al agente, registro e inicio de sesión, una
  pestaña para la clave de IA, «de momento solo con Claude», y un panel: «como van a funcionar todos nuestros
  agentes».
- **Visto bueno, de tanda en tanda** (el PM): «me vas pidiendo confirmación cuando termines de bloque en bloque, y
  vamos haciendo sign-offs». Y revisar la web con capturas antes de enseñarla. El vídeo, lo último.
- **Una web propia, como la de DaVi** (la sesión, con lo que se leyó en `aurora-web`): Cortex no tiene todavía ni
  cuentas, ni pago, ni páginas por agente; DaVi vive en su propia web, con su portada, sus precios y su entrada, y la
  IA se paga aparte, con la clave de cada uno. El Dorado hace lo mismo, en `web/`, con el mismo montaje que el
  ensamblador: la web solo habla con la casa, y la casa le cuenta en vivo lo que pasa.
- **La hoja y el plan, versión 2** (la sesión, a la firma del PM): nueve momentos (entran la portada con el panel y
  la guía; «Al volver» pasa al panel); el día a día, diseñado, con su puerta 9; la guía, con su puerta 10; ya no son
  tres viajes sino un viaje con tres maneras de hacerlo y sus palancas; un solo botón para empezar; y el plan gana
  cuatro bloques (la web, la cuenta, la guía y enseñarlo) y ocho tandas.
- **Lo que se mueve en el mapa es trabajo de verdad** (la sesión): cada pulso es una búsqueda de verdad en ese sitio,
  y lo que se dice en vivo lo escribe el código con sus datos, no una IA. Es la respuesta a las «partículas»: que
  expliquen, no que adornen.
- **Los datos de los sitios y del mapa, abiertos y sin clave** (la sesión, tras mirarlo): los sitios, de Wikidata,
  Wikipedia y OpenStreetMap; sus fotos, de Wikimedia Commons, con su autor y su licencia; el mapa, con MapLibre y
  OpenFreeMap; el buscador, Photon. Ninguno garantiza el servicio: se enchufan como las demás fuentes. Los datos de
  Google no caben: cuestan y no dejan pintarlos sobre un mapa que no sea el suyo.
- **La versión 2, firmada** (el PM, 23-nov: «okay»). Desde aquí manda, y empieza la tanda 2: la web, en seco.
- **El primer vistazo, sin cuenta** (la sesión; el PM lo dejó «a lo que veas»): lo que no gasta IA se ve sin
  registrarse. Si las consultas a las fuentes se disparan, se le pone un tope.
- **La identidad de El Dorado** (la sesión, al visto bueno del PM): de la familia de Cortex, la tinta, el gris y las
  letras de leer y de contar; lo suyo, el oro, que solo se usa para lo que el agente encuentra, una cursiva de mapa
  antiguo para los lugares y un mapa propio y callado. Enseñada con un vídeo y doce capturas en
  https://claude.ai/artifact/9fmWumQxtsKB7pmyaLCUn3.
- **El ritmo, adelantado a la tanda 2** (la sesión): la web lo usa para su mando, y lo que se usa va antes.
- **El viaje grabado no entra en el repositorio** (la sesión): lleva datos de una búsqueda de verdad. Vive en la mesa
  y se vuelve a grabar con `grabar.ts`. El viaje de ejemplo de la portada, cuando se publique, necesita antes su
  decisión: con datos de verdad o inventados.
- **La web, en Vercel** (el PM, 23-nov: «¿te lo meto en Vercel para tener la web ahí?»): en su equipo, Aurora, desde
  esta rama y con `web` de carpeta raíz, para tocarla en vez de mirar capturas. Cada subida la vuelve a desplegar. Es
  solo la web, en seco: la casa aún no corre en ningún servidor. Como nada está publicado y enseña datos de las
  fuentes, se le pide que la deje protegida, para que solo entre su equipo.
- **El viaje grabado, en una web desplegada** (la sesión): sigue sin entrar en el repositorio. La web lo lee de una
  dirección privada que se le da en el entorno (`ELDORADO_GRABADO_URL`); sin ella, enseña solo el mapa del mundo y el
  buscador.
- **La identidad, con el visto bueno del PM, y el mundo en plano** (el PM, 23-nov, con la web ya desplegada: «dale
  con plano y sigue»). El globo se quita.
- **El mapa, precargado, y con pantalla de carga** (el PM, 23-nov: «que el mapa quede precargado para que no tarde,
  metamos una pestaña de carga»). El código del mapa y la conexión con sus teselas se piden al entrar en el panel, y
  mientras se despliega se ve el sol de El Dorado, no un hueco.
- **Por dentro es un panel** (el PM, 23-nov: «recuerda que esto será un dashboard, el mapa solo no vale»). El carril
  lleva de planear a tus viajes y a tu clave, y el viaje se lee por pestañas: los días, dónde dormir, las cuentas y
  los avisos. Tus viajes y la pantalla de la clave se adelantan a la tanda 2, en seco.
- **El campo de la clave, apagado en seco** (la sesión): una clave de verdad no se pega en una web que todavía no la
  guarda cifrada.
- **Lo que el viajero cambia a mano manda sobre el ritmo** (la sesión): lo que quita no vuelve solo, lo que mueve a un
  día se queda en ese día y lo que añade entra aunque el día esté lleno, sin quitarle el sitio a otra parada.
- **La tanda 2, hecha, al visto bueno del PM** (23-nov). La web en seco, revisada pantalla a pantalla, en ancho y en
  móvil, en claro y en oscuro, con su vídeo y sus capturas en https://claude.ai/artifact/12YETqmymoYMjmMVnWd41r. Del
  bloque 10 quedan, para su tanda, la ficha del transporte y el precio en la portada. La tanda 3 no empieza sin su
  visto bueno.

## Pendientes

Lo que pide la versión 2, a decisión del PM:

- **El viaje de ejemplo de la portada** (23-nov): con datos de verdad de las fuentes, que hay que poder publicar, o
  inventado. Antes de publicar la portada.

- **Las cuentas** (23-nov): con qué se guardan y dónde corren la web y la casa. Antes de la tanda 4.
- **El precio de El Dorado** y cómo se cobra (23-nov). La IA va aparte, con la clave del viajero.
- **Dónde se reserva un precio de LiteAPI** (23-nov): no tiene página pública. Hoy se enlazaría a otra agencia cuando
  casa y, si no, a la web del hotel. Antes de la tanda 5.
- **Los dibujos de la guía** (23-nov): una colección propia o generados para cada viaje. Antes de la tanda 5.
- **Compartir un viaje** con quien viaja contigo (23-nov): lo propone la sesión.
- **La tarjeta de El Dorado en Cortex** (23-nov): se hace en `aurora-web`, que desde aquí solo se lee. Al final.

Lo que deja la tanda 1, a decisión del PM:

- **«Descuidado», ¿un campo o dos?** (23-nov): el estado sale «descuidado» en dos hoteles cuyas fotos se ven nuevas,
  porque varias opiniones recientes hablan de averías sin arreglar o de desgaste y la norma dice que mandan las
  opiniones. Las dos pasadas lo hicieron igual. La sesión propone partirlo en dos: cómo se ve (de las fotos) y cómo
  lo mantienen (de las opiniones). Cambia la hoja: decide el PM.
- **Abaratar la mirada** (23-nov): unos catorce minutos y mucha lectura por alojamiento es demasiado para el producto.
  Lo que más pesa son las fotos en grande. Va con «Encoger las fotos», más abajo.
- **Con quién piensa cada asiento en el producto**: en la tanda 1 lo hizo la sesión de trabajo. Es la fila «La IA» de
  la hoja, por decidir.

Lo de las tres fuentes, para antes de vender, con el abogado (el PM, 23-nov):

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

- **Encoger las fotos** (23-nov): las del hotel vienen sin pie y solo en grande, y la IA no puede mirar un centenar
  en grande por alojamiento. Hoy van treinta, repartidas, y lo que no se ve es «no se sabe». Para verlas todas hay que
  encogerlas antes, con una pieza que el código no lleva (una dependencia para funcionar, que hoy no hay ninguna), o
  dar un primer vistazo aparte. Decide el PM, con lo que salga de la tanda 1.

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
