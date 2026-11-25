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
- **La tanda 2, con el visto bueno del PM** (23-nov: «Okay»), y con él sus dos propuestas para empezar la 3:
  - **«Descuidado» se parte en dos campos**: cómo se ve (`look`, de las fotos de la habitación) y cómo lo mantienen
    (`upkeep`, solo de lo que cuentan los viajeros). Son nueve campos y no ocho. Cambian el contrato del que mira, sus
    niveles, la puerta 5 y la hoja.
  - **Encoger las fotos antes de mirarlas**, con una pieza que el agente no lleva. Al ir a instalarla, el control de
    permisos de la sesión lo paró: un «okay» a tres cosas a la vez no le basta para meter una dependencia en un agente
    que no lleva ninguna. No se fuerza: se le pide al PM de forma expresa. Mientras, van menos fotos y mejor elegidas
    (veinticuatro y no cuarenta y dos, con una de cada clase de la habitación por turnos) y treinta opiniones.

De la tanda 3, el agente hace el viaje (23-nov). Lo que decidió la sesión al construir, con su porqué; el PM lo ve al
cerrar la tanda:

- **Los asientos de la ruta y del día a día trabajan sin salir a internet**, con lo que el código les da de los datos
  abiertos. La hoja los quiere con buscador: llega con el lector de webs (3.5). Por eso un viaje con varias bases
  todavía no pasa la puerta 3: no hay de dónde sacar los tiempos de un traslado.
- **Ningún asiento escribe coordenadas ni minutos.** El de la ruta nombra sitios de los datos, por su identificador,
  y el código pone el centro de cada zona y lo que se anda. El del día a día no añade sitios suyos: lo que echa en
  falta lo dice aparte.
- **La manera distinta es otra fila de las mismas fechas** (otro alojamiento u otra zona). Un cambio de fechas no es
  una manera: es una palanca que se cuenta. Así los días son los mismos en las tres, como dice la hoja.
- **Los dos avisos de siempre los pone el código**, no un asiento, y la puerta 7 mira que estén.
- **Un rojo vuelve a su asiento con lo que estaba mal**, en un archivo de su material, dos veces como mucho; después,
  la investigación se para y dice dónde. Es el principio del conductor (2.5), hecho de mano.
- **Lo que descarta un alojamiento es un dato con su clase**; la frase se la dice la web al viajero, en su idioma.

Lo que enseñó Lisboa de verdad, y lo que se cambió por ello:

- **Lo que no declara un imprescindible no se mira.** En la primera búsqueda, cuatro de los cinco finalistas no
  tenían gimnasio. La fuente dice en su lista qué servicios declara cada alojamiento; ahora, quien no declara lo que
  el viajero marcó como imprescindible se descarta antes de elegir a quién mirar.
- **La zona se mide por la mitad de lo que se va a ver**, y no por la media: una excursión a seis kilómetros hundía
  la nota de un hotel en pleno centro. Y su escala de partida se alarga (un cero a la hora andando, no a los
  cuarenta minutos), porque solo se sabe lo que se anda y no hay transporte público en los datos.
- **Los días se abren por cercanía**: una parada va al día que tiene cerca y con sitio, y si no lo hay abre un día
  nuevo. Un día puede quedar libre. Los de en medio se abren antes que el de llegada y el de salida.
- **Lo que una puerta pide, el contrato lo dice.** La puerta 3 devolvió la ruta por el largo del nombre de una zona,
  con un tope que no estaba en su contrato. El fallo era de la casa: el tope se escribió en el contrato y se volvió a
  pasar la puerta sobre la misma entrega.
- **Menos fotos no abarata la mirada.** Con veinticuatro fotos y no cuarenta y dos, cada mirada sigue tardando de
  once a dieciséis minutos. Lo que pesa es el método de seis pasos lanzado como una sesión entera, no las fotos.

- **Todo, generalista** (el PM, 23-nov, con Lisboa a medio hacer: «esto se hace de forma generalista; no adaptes
  absolutamente nada para el caso concreto; tiene que servir para cualquier tipo de viaje»). Se repasó todo lo
  hecho en la tanda buscando lo pegado al caso o a un país, y se quitó:
  - La moneda, el pasaporte y el mercado de los vuelos se suponían de un viajero español. Ahora son datos del
    viajero, y sin ellos no se busca.
  - La puerta 7 dejaba en rojo a un idioma sin avisos escritos. Ahora los lleva en inglés.
  - Los mínimos de un alojamiento eran fijos, y en un pueblo no pasaría casi nadie. Van en escalera: se baja un
    escalón si no quedan bastantes, y se dice. Y lo mismo con la fama que se le pide a un sitio que ver.
  - Los sitios que ver se clasificaban por palabras, algunas sacadas de los datos de una ciudad. Pasan a
    clasificarse por la identidad de su clase en la fuente, que no depende del idioma, y entran los de naturaleza.
  - La escala de la zona se había ajustado con un solo viaje: se queda, dicha como lo que es, de partida, y se
    calibra con varios destinos en el ensayo.
  Lo que sigue pegado a dos idiomas (las palabras prohibidas, las quejas graves que se buscan en las opiniones) y a
  dos países (la semilla de dominios oficiales) queda dicho abajo, en lo pendiente.
- **La imagen de relleno de una fuente no es una foto.** Donde una habitación no tiene foto, LiteAPI pone un dibujo
  de relleno, y la web lo enseñaba como si fuera la habitación. Se quita en el enchufe, que es quien conoce a su
  fuente: así la casa sabe que de esa habitación no hay nada que mirar, y lo dice.
- **Los temas de las opiniones, de una lista cerrada.** El que mira ponía a cada tema el nombre que quería, en
  inglés. Ahora elige de una lista (la limpieza, el ruido, la cama, el personal y veinte más, y «otro» para lo que
  no quepa), y la puerta 5 lo comprueba. Así lo que se dice de un alojamiento se puede enseñar en cualquier idioma
  sin que viaje una frase suya.
- **A la ficha de un alojamiento solo llegan datos.** El que mira escribe en inglés y cita su material por dentro, y
  sus frases (lo mejor, lo peor, sus avisos y sus pruebas) salían tal cual en la web, y también los avisos de la
  casa, en español y con mensajes de dentro. La hoja dice que lo que lees lo dice siempre El Dorado, en tu idioma.
  Ahora a la web solo pasan claves (el nivel de cada campo, de qué clase es su prueba y su foto, lo que se dice por
  temas y lo que no se pudo saber), la web las dice en el idioma del viajero, y la comprobación del viaje no deja
  pasar una frase suelta. «Lo mejor» y «lo peor» dejan de salir en la ficha: lo que hay que contar de un
  alojamiento lo cuenta el que explica, en el idioma del viajero. Una prueba mira que la web sepa decir cada clave
  en sus dos idiomas.
- **Un run que se retoma no vuelve a juzgar lo que ya juzgó.** Al montar el viaje, la casa volvía a pasar la puerta 5
  sobre las fichas, y con una puerta más estricta las de antes quedaban sin mirar. Lo ya recogido se lee del disco,
  con el veredicto de su momento.
- **La web no nombra ningún sitio a mano.** Dos avisos decían «solo Lisboa está grabada» y los mínimos iban escritos
  con sus números. Ahora el destino grabado y los mínimos con los que se buscó salen de los datos, y el aviso de que
  no hay precio de vuelo solo sale si no lo hay.

- **La revisión de los tres adversarios, al cerrar la tanda 3** (23-nov; el informe, en
  [revisiones/tanda-3.md](revisiones/tanda-3.md)). Lo que se decidió al arreglar sus hallazgos:
  - **Un run parado sigue parado.** El paro queda escrito (`parado.json`), y quien lleva el run lo reabre cuando ha
    arreglado la causa. Y un run que se retoma lee lo que ya juzgó: no lo vuelve a juzgar.
  - **Antes parar y decirlo que entregar algo que no vale.** Sin sitios, sin alojamiento con precio, con todos los
    alojamientos descartados, con un viaje de varias bases o con uno que no se anda, la investigación se para antes
    de gastar más y dice por qué. Antes acababa en «hecho».
  - **El transporte se cuenta para todos los que viajan.** Un precio dice para cuántos es; un precio guardado es el
    de un billete.
  - **Lo que no cabe en ningún día se queda fuera y dice por qué**, también si es imprescindible: queda lejos de lo
    demás, o los días están llenos. Es lo que ya decía la hoja. El ritmo y su puerta miran lo mismo.
  - **Los números de un texto para el viajero son los de la casa.** Los que van dentro de una frase de otro asiento
    o del viajero no se pueden repetir: por ahí se colaba un precio o un teléfono metido en una opinión. Y un texto
    para el viajero no lleva enlaces ni correos, y mide quinientas letras como mucho.
  - **Lo entendido se mira antes de gastar nada**: la mitad de código de la puerta 1.
  - **Al ensanchar una búsqueda, lo de la zona se queda** y va por delante al elegir a quién mirar.
  - **La hoja tiene «en parte».** Una caja construida a medias lo dice, con lo que le falta.
  - **Las cuentas de pruebas salen del plan**: se quedaban atrás en cada commit. El total, en el «Estamos aquí».

## 24-nov-2026

Las respuestas del PM a lo que dejó la revisión de la tanda 3 y, después, ese mismo día, su visto bueno a la tanda.

- **El visto bueno de la tanda 3** (el PM: «ok»). La tanda 3, el agente hace el viaje, queda cerrada.
- **Antes de la tanda 4, las fuentes de rutas** (el PM: «ok, primero esto»). La sesión le propuso mirar primero qué
  fuentes hay para las rutas y lo que cuestan, sin contratar nada, y traerle dos o tres opciones. Qué fuente se usa,
  y si es de pago, lo sigue decidiendo él (3.14). Mirado ese mismo día, solo leyendo: está en [fuentes.md](fuentes.md), con tres opciones. La que recomienda la
  sesión es Geoapify: da lo que se tarda y si se puede ir, a pie, en coche y en transporte público, deja guardar sus
  resultados y es gratis a este tamaño. Lo que cuesta cada manera no lo da ninguna fuente abierta en todo el mundo.

- **El buscador y el lector de webs (3.5), a la tanda 4** (el PM: «vale, lo que veas»). No estaba en ninguna tanda, y
  lo usan los asientos que consultan la web, que llegan con el bloque 5.
- **Cómo se mueve el viajero: se le ofrecen las alternativas** (el PM: «tendrás que ofrecer las alternativas,
  dependiendo de coste y disponibilidad; si no se sabe, con indicar la distancia vale; también, pensando un poco,
  habrá cosas a las que puedas ir de cualquier manera y otras que ni de coña»). No es el viajero quien dice de
  antemano cómo se mueve: de cada trayecto, El Dorado dice las maneras que tienen sentido por su distancia, con lo que
  cuestan y si las hay cuando una fuente lo sabe, y si no, la distancia. Lo que se anda en un rato no se manda en
  coche, y lo que está a treinta kilómetros no se manda andando.
  Hecho así, sin fuente de rutas: cada trayecto lleva su distancia y las maneras que tienen sentido (a pie hasta
  3,5 km de camino; en transporte, de 1 a 60 km; en coche, de 1 km en adelante), y se cuenta andando si se anda y,
  si no, con una cuenta aproximada de lo que se tarda. Un día puede llevar un trayecto que no se anda; lo que queda
  a más de hora y media de donde se duerme no entra en ningún día. La zona de un alojamiento se mide andando si el
  viaje se anda, y si desde ningún alojamiento se llega a pie a lo que se va a ver, con lo que se tarda cogiendo
  algo. Lo que cuesta cada manera y si la hay donde se viaja no se sabe todavía: pide una fuente, por decidir
  (3.14). La web y el que explica nunca dicen «andando» de lo que no se anda.
- **Las habitaciones de un grupo las dice el viajero** (el PM: «lo dice el viajero»).
- **Un alojamiento sin estrellas se juzga por su nota y sus opiniones** (el PM: «ok»). Las estrellas se le piden a
  quien las lleva.
- **Las quejas graves marcan, y las confirma el que mira** (el PM: «ok»). El código ya no descarta por palabras.
- **Encoger las fotos antes de mirarlas, con una pieza nueva en el agente** (el PM: «ok»). Es su sí expreso a la
  primera dependencia que el agente lleva para funcionar (`sharp`). Medido con las 113 fotos de la primera
  investigación: pesan un 74 % menos y se mira un 55 % menos de imagen. No baja por sí solo los diez minutos de cada
  mirada, que son del método lanzado como una sesión entera: eso va con el 2.7.
- **Las cifras de `docs/datos.md`** (el PM: «lo que veas»): se quitan los precios y las notas de alojamientos
  concretos, que son datos de una fuente, y se quedan los recuentos y lo que da cada fuente, que es para lo que está
  el documento.

- **La tanda 4 empieza por sus cimientos** (la sesión, con el visto bueno del PM a la tanda 3): la carpeta de cada
  viaje en la mesa. Lo que decide la sesión de su forma, siguiendo la mesa del ensamblador: una carpeta por viaje,
  con su ficha, su diario, que solo crece, una carpeta por investigación y otra por versión; guardar de una vez; y
  una versión, entera y una sola vez. Distinto del ensamblador, porque lo pide la hoja: cada viaje lleva su dueño y
  solo él lo abre. Los viajes que se abren desde la terminal quedan a nombre de `by-hand` mientras no haya cuentas.
  Lo que es de un viaje y no es de la investigación (el estado de cada pieza, de cada parada y de cada precio) llega
  con los momentos que lo cambian.
- **Lo que se cuenta en vivo sale de lo que hay en el disco** (la sesión): la casa no apunta un suceso al dar un
  paso, sino que mira la carpeta del run y cuenta lo que aún no está contado. Así un corte no pierde ni repite
  nada, que es lo mismo que deja retomar un run. Si la investigación se para, se cuenta en qué paso; el porqué, que
  está escrito para quien la lleva, no viaja a la web: lo que lee el viajero lo dice la web por claves.
- **Cómo lleva la casa una investigación sola** (la sesión; lo pide la hoja: «nada que gaste arranca sin un botón
  tuyo»): el adelante del viajero queda escrito en el run, con el techo de gasto que aceptó, y sin él no se lanza a
  nadie. Al llegar al techo no se lanza más, y se dice. Si de un asiento acabado no se sabe lo que gastó y hay
  techo, no se sigue a ciegas: por eso el lanzador dice lo que gastó también cuando falla. Un puesto se lanza una
  sola vez: el asiento que no entrega para la investigación, salvo si es uno de los que miran, que deja su
  alojamiento sin mirar y se dice. El techo se mira antes de cada tanda de asientos, así que puede pasarse en lo
  que gaste esa tanda.
- **La puerta de la casa a la web, como el puente del ensamblador y con dueño** (la sesión): un servidor aparte, sin
  dependencias, al que la web entra con una llave; quién es el viajero se lo dice la web en cada petición, y la
  casa solo da cada viaje a su dueño. Lo que pasa en vivo va por sucesos del servidor, y quien llega tarde pide
  desde donde iba. Lo que sale son claves y números, para que la web lo diga en el idioma de quien mira. La clave
  de IA del viajero entra con el botón y vive solo en la memoria de la casa, como en el ensamblador: la hoja dice
  «cifrada», que es para cuando haya cuentas donde guardarla, y eso es del PM (11.1).

- **La IA se llama con una llamada directa por asiento** (el PM, a la propuesta de la sesión: «lo de la llamada
  directa me parece bien»). En vez de una sesión entera por asiento, que tardaba de nueve a dieciséis minutos, la
  casa le manda su contrato y su material y recibe sus seis pasos en una respuesta. Cambia el método común, que
  estaba firmado: el asiento ya no escribe archivos, los escribe la casa con lo que él contesta. Cuánto baja, por
  medir.
  Cómo queda hecho (la sesión): el contrato va primero y el material después, cada archivo bajo su ruta y cada
  foto como foto. El asiento contesta sus seis pasos, cada uno bajo una línea con el nombre de su archivo entre
  marcas, y la casa los escribe en su orden: las puertas no cambian. No se usa la salida con forma cerrada de la
  IA porque la entrega de cada asiento no tiene todavía un esquema cerrado, solo su contrato y su puerta. Cada
  archivo del material va entre dos marcas con una seña al azar, distinta en cada llamada, para que una opinión no
  pueda hacerse pasar por el final de su archivo. Una negativa o una respuesta cortada por larga no son una
  entrega: no se escribe nada, y se sabe lo que gastaron.
- **Registrarse bien, ya, sin llave de entrada** (el PM: «quiero que se pueda registrar uno bien; no nos enredemos
  ahora con si llave, no llave; pon que se pueda registrar bien ya de la que estás y listo»). La sesión lo hace con
  correo y contraseña, guardado por la casa en la mesa, sin servicios de fuera: no pide darse de alta en nada ni
  cuesta nada. Recuperar la contraseña y confirmar el correo piden mandar correos, que es un servicio nuevo: quedan
  apuntados.
- **Cómo se guardan las cuentas** (la sesión, con el encargo del PM de arriba): la contraseña, pasada por scrypt
  con su sal; de la sesión se guarda la huella de su llave, no la llave; la clave de IA, cifrada con un secreto que
  vive en el entorno de la casa y atada a su cuenta. Entrar mal no dice si falla el correo o la contraseña, y a los
  cinco fallos con un correo se espera un cuarto de hora. Una cosa queda dicha: al registrarse, la casa contesta
  que ese correo ya tiene cuenta; para no decirlo haría falta confirmar por correo. La hoja decía «clave cifrada»,
  y así queda: ya no vive solo en la memoria.
- **El motor, a un servidor, al final** (el PM: «luego ya subiremos todo el motor a un servidor y se acabó; pero eso
  ya al final, una vez estén las pruebas hechas»).
- **La fuente de rutas sigue sin elegir** (el PM preguntó qué otras hay; se le contestó con la lista de
  [fuentes.md](fuentes.md)). Después propuso Google Maps («lo más lógico y lo más fácil es utilizar Google Maps,
  pidiendo autorización al propio user y que lo haga desde su propio Chrome; si me dices que no, pues no; si
  realmente es más problemas que beneficios, buscamos la otra alternativa»). La sesión le contesta que sí como
  ventana y no como fuente: de cada trayecto que no se anda hay ya un enlace a Google Maps, que no pide clave ni
  permiso; traerse sus números al viaje no lo dejan sus condiciones, con permiso del viajero o sin él. Para los
  números propios recomienda Geoapify, y TripGo después. El PM contesta que, si el problema es la IA, no se
  cuenta: «ponemos los datos en bruto y un script saca las mejores combinaciones». La sesión le da la razón en eso
  (quita el reparo de la IA) y le dice lo que no quita: guardar, la tabla que leen los asientos, las líneas junto
  al mapa y que la cuenta es nuestra. Queda como segunda opción, en [fuentes.md](fuentes.md).
- **Se prueba Geoapify primero** (el PM: «vale, probamos Geoapify primero»). Si se queda corta en transporte
  público, Google en vivo y con un script, solo para eso. El enlace a Google Maps de cada trayecto se queda en los
  dos casos. Su clave va en la dirección de cada pedido y no en una cabecera, así que el formulario seguro no puede
  ponerla: la pone el PM como variable del entorno (`GEOAPIFY_KEY`).
- **La librería oficial de Anthropic entra en el agente** (el PM, a la pregunta de la sesión: «si obvio esto
  metelo»). Es la segunda pieza de fuera que lleva el agente para funcionar, con `sharp`; cualquier otra sigue
  pidiendo su sí, y la prueba del repositorio lo comprueba.
  Cómo queda hecho (la sesión): una llamada por asiento, sin herramientas; el contrato va como instrucciones del
  sistema y el material en un mensaje; la respuesta llega por partes, para que una larga no se corte por esperar.
  El modelo, el esfuerzo y el precio los dice el entorno de la casa, nunca el repositorio. Una clave se comprueba
  contra la IA antes de guardarla, preguntando por el modelo, que no gasta. Y si la IA no quiere contestar, la casa
  para y lo dice: no se cambia sola a otro modelo, porque el techo de gasto del viajero se cuenta con el precio del
  modelo que se le dijo. Si el PM quiere que pruebe con otro antes de parar, es una decisión suya.
- **Geoapify, probada: vale para andar y para el coche, y se queda corta en transporte público** (la sesión, con la
  clave del PM). Once trayectos de clases distintas; las conclusiones, en [fuentes.md](fuentes.md). La sesión
  propone usarla para andar y para el coche, diciendo del coche que es sin tráfico. Para el transporte público
  queda la segunda opción que el PM ya dejó dicha (Google en vivo y con un script), que pide tarjeta: espera su
  decisión. Mientras, de cada trayecto que no se anda sigue el enlace a Google Maps.
- **Las preguntas de empezar, por el lado del código** (la sesión, con la hoja en la mano). Lo que el viajero no ha
  dicho se pone con lo más probable para poder ir buscando, y se le enseña como supuesto para que lo confirme: así
  las habitaciones y quiénes viajan los sigue diciendo él. Lo que no se puede suponer se pide: la moneda, la edad de
  un niño y de qué país es. La moneda se propone por el país del que sale. Lo de moverse por un país o una región
  entra en lo entendido como un campo nuevo, y el contrato del que hace la ruta dice cómo leerlo: es un cambio
  pequeño en un contrato ya firmado, y va con la tanda. Lo que escribe en la caja libre va tal cual a lo que busca
  hasta que exista el que escucha.
- **Las preguntas de empezar, en la web** (la sesión). El botón de empezar pide cuenta y clave y abre las preguntas;
  lo que gasta no arranca hasta que el viajero confirma lo que he entendido, con el techo de gasto de su clave. El
  techo se propone en 5 dólares, de partida, hasta medir lo que cuesta una investigación de verdad. El viaje se
  abre en la casa en cuanto está completo, para que aparezca en sus viajes y se pueda retomar. «Donde estoy ahora»
  no manda fuera el punto exacto de nadie: se redondea a dos decimales, que basta para saber la ciudad.
- **La web no pregunta por un techo de gasto** (el PM, al ver que se proponía en 5 dólares: «¿esto para qué? De
  momento funcionará con mi cuenta, y luego, cuando la gente meta sus API, eso ya es problema de que ellos limiten
  en el propio Claude su techo de gasto»). Quitado de las preguntas. La casa conserva el techo como algo que se le
  puede dar (lo usa la orden de la terminal), pero el botón de la web lanza sin él.
- **El transporte público, de momento, lo que se pueda** (el PM: «de momento lo que se pueda»). Geoapify para andar
  y para el coche, su transporte público solo donde lo sepa con horarios de verdad y dicho como tal, y el enlace a
  Google Maps de cada trayecto. Google en vivo no se contrata ahora.
- **Las pruebas del PM van con su cuenta de Claude, no con una clave** (el PM: «no vamos a meter mi API, quiero usar
  mi cuenta, ya que es para mí y no comercial; estamos testeando, así como hicimos para DaVi y el ensamblador;
  conectemos el túnel»). La casa pensará con Claude Code y su suscripción, en Docker, con un túnel de ngrok hasta la
  web de Vercel, como el ensamblador (`aurora-web/ensamblador/arranque/`). La llamada directa con la clave de cada
  viajero se queda hecha, para cuando lo usen otros.
  Cómo lo piensa la sesión, por construir (2.9): cada asiento, una llamada a Claude Code de una vuelta y sin
  herramientas, con la misma respuesta de seis pasos que la llamada directa, para no volver a los diez minutos por
  asiento de la tanda 3. Y un cuidado: con el registro abierto, la suscripción del PM no puede servir a quien se
  registre. Solo la usan las cuentas cuyo correo esté dicho en el entorno de la casa; como el correo no se confirma,
  el PM se registra antes de dar la dirección a nadie. A los demás, su clave o nada.
- **Todo en el servidor, directamente** (el PM, a la pregunta de dónde: «todo en el servidor directamente; creo que
  con DaVi no uso ngrok, pero me confirmas»). La web y la casa van juntas en su servidor, y así no hace falta túnel:
  el túnel solo sirve con la web en Vercel y el motor en otro sitio. Lo de DaVi no se pudo confirmar: su repositorio
  no está en la sesión, y abrirlo para leer no se permitió. Falta que diga en qué servidor y con qué dirección.
- **La obra se reparte: esta sesión orquesta y sesiones de obra construyen** (el PM, a las dos opciones que él mismo
  puso, pasar la sesión a otro modelo o repartir: «dale con esto», sobre la segunda). Cada sesión de obra lleva un
  punto del plan en su rama, no toca la hoja, el plan ni la memoria, y devuelve una nota; quien orquesta escribe el
  encargo, revisa lo que traen, lo junta en la rama de todos y lleva las biblias. Cuesta más en total que una sola
  sesión seguida y tarda menos, y así se lo dijo la sesión. Antes le contestó que no está todo diseñado al detalle:
  la hoja y el plan bastan para seguir, pero los contratos de los asientos que faltan, el conductor y las tandas 5
  a 8 se diseñan al construirlos.
- **El servidor, el del ensamblador** (el PM: «sí, el del ensamblador, que solo tiene el ensamblador; debería poder
  con las dos cosas, ¿no?»). La sesión le contesta que sí: la casa de El Dorado pesa poco, y lleva su tope para no
  quitarle sitio al ensamblador.
- **La web, en Vercel** (el PM, a la pregunta de con qué dirección se entra: «¿no vale con Vercel?»). Vale: la web
  sigue donde está. Lo que queda por decidir es cómo llega Vercel a la casa del servidor: o una puerta con candado
  en el servidor (una dirección gratuita con HTTPS y un puerto abierto, por el que solo entra la llave de la web), o
  un túnel como el del ensamblador, que no abre nada pero pide otra dirección de ngrok. La sesión recomienda la
  primera; abrir un puerto en su servidor es decisión del PM.
- **Las pruebas, con la cuenta del PM** (el PM: «sí, sí: en cuanto tires de mi cuenta, no de mi API, puedes empezar
  a hacer pruebas»). Es su visto bueno a las llamadas de prueba y a la primera investigación con su suscripción. La
  sesión no usa para eso el acceso de la propia sesión en la nube, que no es para el agente: hace falta su token
  (`claude setup-token`), en el servidor o, para empezar antes, en el entorno de las sesiones con el nombre
  `ELDORADO_TOKEN_DE_CLAUDE`.
- **Cómo queda la cuenta de la casa** (una sesión de obra, revisada por quien orquesta). Claude Code, una vuelta por
  asiento y sin herramientas, con un entorno hecho por lista de lo que pasa y no de lo que se quita: en una sesión
  en la nube, las variables de la propia sesión lo engancharían a ella. El token llega con nombre propio para que no
  lo lea otro Claude Code de la máquina. Con lista de correos y sin token, la casa no arranca: una lista que no
  hace nada no pasa sin que se note. Un correo de la lista que también tiene clave piensa con la cuenta de la casa.
  Las claves de otros solo se admiten si el entorno dice el precio. Y si la cuenta de la casa agota su límite, el
  viaje para y lo dice: no cambia sola a una clave.
- **Cómo queda la búsqueda de transporte** (una sesión de obra, revisada por quien orquesta). Un sitio con vuelos
  es una ciudad de la fuente con sus aeropuertos, y su tamaño, a cuántos sitios vuela sin escala: sale de los datos
  de la fuente, no de una lista nuestra. Se sale de dos sitios como mucho y se llega a dos o tres; seis pares como
  tope, y dos días a cada lado si las fechas se mueven. Directo o con una escala. El punto del que se sale se guarda
  redondeado a una décima de grado, que basta para los aeropuertos y no dice dónde vive nadie. Lo que deja para el
  PM: con fechas fijas casi nunca hay precio guardado y el viaje sale sin transporte; se puede pedir también la
  semana de alrededor, o esperar al precio en vivo (3.7).
- **Cómo queda el primer vistazo** (una sesión de obra, revisada por quien orquesta). Las zonas son la caja del
  destino partida en tres por tres, sin nombre: aún no hay ruta, y vale para cualquier sitio. Para contar se
  suponen la moneda y el pasaporte (el país de salida; si no, el del navegador; si no, el del destino). El precio
  se pide solo a cien alojamientos, y se dice. Los mínimos se bajan sin volver a pedir, y no se ensancha la zona.
  El vistazo se vuelve a pedir mientras se contesta si cambia el grupo. Como no pide cuenta, lleva freno: una
  memoria de diez minutos, treinta vistazos nuevos cada diez minutos en toda la casa, seis por visitante y tres a
  la vez. Lo que no cubre: quien llegue a la web puede gastar el tope de todos durante diez minutos (el cupo queda
  protegido; el servicio, no), y el tope por visitante se fía de quien pone su dirección. Los números son de
  partida y los confirma el PM.
- **Siempre se ofrecen tres días a cada lado, aunque las fechas sean fijas** (el PM, a la pregunta de si pedir
  también la semana de alrededor: «sí, aunque las fechas sean fijas, siempre ofrecer +-3 días; puede ser clave»).
  La búsqueda de transporte mira siempre los días de alrededor, y son tres a cada lado; la palanca de mover los
  días pasa también a tres. El transporte del viaje sigue siendo el de sus fechas: lo de los días de al lado se
  ofrece, no se elige por el viajero. Encargado a una sesión de obra.
- **Cómo queda el arranque en el servidor** (una sesión de obra, revisada por quien orquesta). La casa no abre
  ningún puerto suyo: quien la saca fuera, Caddy o ngrok, comparte su red. Con la puerta se abren el 443 y el 80,
  que Docker publica por encima del cortafuegos; con el túnel, nada. La puerta solo deja pasar las rutas y los
  métodos de la casa, con sus topes de tamaño y de tiempo, y no apunta las peticiones, para no guardar la sesión de
  nadie. Lo que no cubre: nada limita las peticiones por dirección, y `/salud` contesta sin llave. La dirección
  gratuita puede quedarse sin certificado unos días; por eso la sesión propone al PM un subdominio suyo.
- **Vercel llega a la casa por la puerta con candado, por el momento** (el PM, a las dos maneras explicadas: «esta
  opción por el momento vale»). Es la de partida de la guía.
- **El token del PM, en el entorno de las sesiones** (el PM: «listo», «todo listo creo»). Lo puso él, con el nombre
  `ELDORADO_TOKEN_DE_CLAUDE`. Con su sí a las pruebas con su cuenta, se empieza por dos llamadas mínimas desde una
  sesión auxiliar. El modelo de los asientos es el que la sesión le propuso tres veces y él no cambió; no lo dijo
  con sus palabras, y así se le cuenta.
- **Cómo queda el que escucha** (una sesión de obra, revisada por quien orquesta). Las palabras del viajero van
  dentro de lo entendido, aparte de lo que tocó, y no llegan a los demás asientos. Una cita no puede juntar dos
  frases ni corregir una errata. Si el viajero contesta preguntas no corrige a la vez, y tras la segunda lectura
  vuelve a confirmar. Lo que choca se enseña siempre, se pregunte o no. Una cosa pide la firma del PM: la pregunta
  del que escucha es lo único de un asiento que llega a la pantalla sin pasar por el que explica; va en una línea,
  con su tope de letras, sin enlaces y citando las palabras del viajero.
- **La cuenta del PM, estrenada** (la sesión). Las dos llamadas de prueba se hicieron en la sesión de siempre, que
  es donde el PM dio su sí, cuando al reiniciarse ya veía su token: la sesión auxiliar no pudo, porque allí nadie lo
  había aprobado, y no se rodeó. Con las dos bien, se lanzó la primera investigación entera.
- **Cómo quedan los caminos de verdad** (una sesión de obra, revisada por quien orquesta). Se piden de donde se
  duerme a cada parada elegida y de parada a parada, no entre todos los sitios que se dan a elegir, que no cabrían
  en ningún cupo. A pie, lo que en línea recta se alcanza andando; en coche, lo que no se anda, hasta 100 km y en un
  solo sentido. Con tope de 600 casillas por viaje: primero lo que sirve para elegir dónde dormir. Si la fuente
  falla a medias, lo que llegó se usa y lo demás va con la cuenta de la casa, con su aviso. En la web, lo medido se
  dice tal cual, el coche dice «sin tráfico», y lo que sale de la cuenta de la casa dice que es aproximado.
- **Cómo quedan el buscador y el lector de webs** (una sesión de obra, revisada por quien orquesta). Que un asiento
  sale a internet lo dice un archivo de su contrato, `INTERNET.md`, y no un campo: así lee lo que tiene que buscar
  y queda sellado con lo demás. Los topes los pone la casa, no el contrato. Un resultado del buscador no es una
  fuente: solo cuenta una página abierta. Dos direcciones son la misma página aunque cambien el esquema, las
  mayúsculas del sitio, el fragmento, la barra del final o el puerto de siempre; las mayúsculas del camino sí
  cuentan. Una página que falló cuenta para el tope. Ningún asiento puede entregar una dirección que ni abrió ni
  venía en su material. Lo que puede salir en una búsqueda: el destino, las fechas, el país del viajero y lo que
  se busca; nunca quién es. Los números de partida (8 búsquedas, 12 páginas, 6 vueltas) los confirma el PM.
- **El buscador, estrenado con la cuenta del PM** (la sesión, con su sí a las pruebas con su cuenta): una llamada
  mínima por Claude Code, con una búsqueda y una página.
- **Una nota puede ocupar varias líneas** (la sesión, por lo que enseñó la primera investigación de verdad, que
  paró en el que elige los sitios tras tres intentos). La puerta de todos sigue pidiendo lo mismo, que cada nota
  lleve su fuente y su etiqueta, pero lee la nota entera: lo que cuelga de ella con sangría es la misma nota, y la
  etiqueta va al final de su primera línea o al final de todo. Un renglón de dentro con su propia fuente se mira
  como una nota suelta, para que nada se cuele por ir colgado. No se baja el listón: una nota sin etiqueta, o que
  cita lo que no tiene, sigue siendo un rojo. Y al asiento devuelto se le enseña la línea de cada rojo.
- **La nota de la casa se dice como nuestra** (la sesión, por el viaje de la primera investigación de verdad). El
  que explica escribió «su puntuación es 5,7» de un alojamiento al que sus huéspedes dan un 8,7: era la nota de la
  casa, y se leía como la de los huéspedes. Su contrato lo dice ahora (EX4) y el código le da sobre cuánto va. A
  propuesta de la sesión, y por decidir por el PM: darle también la nota de los huéspedes, para que diga las dos.
- **La primera investigación de verdad, entera** (la sesión, con el sí del PM a las pruebas con su cuenta). Madrid
  a Lisboa, del 12 al 15 de febrero de 2027, dos adultos, con un gimnasio de verdad como imprescindible. 14
  llamadas, unos 15 minutos y el equivalente a 6,86 dólares de su suscripción. Para seguir tras la parada se quitó
  a mano la marca de parado y se retomó con el código arreglado: lo decide quien lleva el run, y queda dicho aquí.
  El modelo se dio solo en la orden de la terminal.
- **Cómo queda el conductor** (una sesión de obra, revisada por quien orquesta). El acta la escribe el código, no
  una IA. El conductor se llama una vez por run, da como mucho una vuelta de más y su gasto cuenta en el techo: lo
  más prudente. Si su entrega sale en rojo, no se le devuelve: el run se queda parado. La clase de una parada la
  saca primero el código, y la del conductor solo vale para la parada a la que se le llamó. Su frase para el
  viajero no puede llevar números y pasa la puerta de palabras, o no se enseña. Al dueño, el acta va sin el porqué
  de los fallos, que puede llevar lo que se dijo por dentro. «Cambiar lo que pediste» lleva a una búsqueda nueva.
- **Una nota puede citar un archivo de su contrato** (la sesión, por el estreno del conductor). El conductor acertó
  con la parada real de Lisboa y su entrega dio rojo por citar el método común como fuente de lo que dice el
  método. Lo que da la casa a un asiento es su material y su contrato, los dos sellados: los dos valen como fuente
  de una nota. Un archivo que no existe en ninguno de los dos sigue siendo un rojo.
- **Cómo quedan el del calendario y el de los papeles** (una sesión de obra, revisada por quien orquesta). Corren
  por detrás de verdad: la casa no los espera mientras el viajero contesta y confirma. La puerta 2 se mira justo
  tras lo entendido, antes de los sitios y la ruta, porque la hoja dice «antes de gastar en buscar»: por eso los
  papeles gastan siempre antes que la ruta. Si los papeles fallan o no pasan su puerta, el viaje no sigue solo:
  decide el viajero, como si algo bloqueara, porque sin saber no se puede decir que nada bloquee. «En regla»,
  literal de la hoja: dos fuentes oficiales con fecha, o una del gobierno del destino; sin dominio conocido del
  destino, nada sale en regla. Una ventana de fechas la da el asiento solo con su día de entrada, y lo que mejora
  o empeora lo cuenta el código. Los días que pide el destino se comparan con las noches más uno.
- **A quien viaja por el país de su pasaporte no se le pregunta por papeles** (la sesión, al revisar): ese país no
  le pide nada para entrar, y preguntarlo gastaba un asiento con búsquedas para nada. Si son todos, no se lanza.
- **Una nota puede decir que una página no se abrió, con su dirección** (la sesión, por el estreno del de los
  papeles). La casa sabe qué páginas se intentaron abrir sin éxito. Nombrarlas en una nota vale; citarlas en la
  entrega, nunca. Una página que ni se intentó abrir sigue siendo un rojo.
- **Las puertas dicen qué frase falla y por qué** (la sesión, por el estreno del del calendario): un rojo que no
  dice qué arreglar cuesta una vuelta entera. Y los contratos dicen lo que mide la puerta.
- **El del calendario y el de los papeles, estrenados solos con la cuenta del PM** (la sesión, con su sí a las
  pruebas con su cuenta): unos 1,13 dólares de equivalente entre los dos.
- **«Volver a intentarlo» repite solo el asiento que falló** (el PM, a la propuesta de la sesión: «si es un asiento
  sin problema»; la sesión lo lee como un sí y se lo dice así, por si no lo era). Encargado a una sesión de obra.
- **Los avisos de las fechas los cuenta el que explica** (el PM, a las dos maneras: «lo que consideres»; elige la
  sesión). Una frase por aviso y por ventana, en el idioma del viajero, que pasa la puerta 7: así la regla de la
  pantalla no cambia. Encargado a una sesión de obra.
- **Los papeles se miran a la vez que se busca, y lo caro los espera** (el PM, a la propuesta de la sesión: «vale
  perfe»). Cambia la hoja: la puerta 2 ya no va «antes de gastar en buscar», sino antes de mirar cada alojamiento y
  de elegir los sitios. Los sitios y la búsqueda son código y no gastan; la ruta es un asiento, unos 25 céntimos,
  y es lo que queda en riesgo si un papel bloquea. A cambio, la pantalla se mueve desde el primer segundo y el
  viaje sale unos tres minutos antes.
- **La revisión de la tanda 4** (la sesión, por la regla de la obra): tres adversarios en su copia. Lo que la
  sesión decidió al comprobar sus hallazgos queda en `revisiones/tanda-4.md`, y dos cosas las dejó como estaban,
  con su porqué: una nota puede nombrar una página que se intentó abrir sin éxito aunque diga que lo vio, y lo que
  cuelga de una nota es la misma nota. La frase del conductor deja de enseñarse hasta que la firme el PM.
- **El ensayo entero desde la web, con la cuenta del PM** (la sesión, con su sí a las pruebas con su cuenta): unos
  7,19 dólares de equivalente. Cuando el filtro de seguridad del modelo marcó el mensaje de un asiento, la sesión
  lo repitió una sola vez y sin cambiar nada, ni el mensaje ni el modelo, y dejó dicho al PM que, si volvía a
  marcarlo, pararía ahí: no se rodea un filtro de seguridad. Pasó.
- **El conductor, estrenado con la cuenta del PM** (la sesión, con su sí a las pruebas con su cuenta): sobre una
  copia de la parada real de Lisboa, pidió la vuelta de más y la investigación acabó. Unos 1,8 dólares de
  equivalente entre el conductor, esa vuelta y lo que quedaba del viaje.

## 25-nov-2026

- **La tanda 5 empieza mientras el PM mira la 4** (el PM: «Seguimos? Luego entro a la página a revisar»; la
  sesión lo lee como el sí para empezar, y se lo dice así, por si no lo era). Dos sesiones de obra a la vez:
  cerrar el viaje con sus enlaces (8.4 y 3.13) y la guía (12.1 y 12.2). El visto bueno de la tanda 4 sigue
  pendiente, con sus dos decisiones: el arranque y la frase del conductor.
- **Lo que la tanda 5 construye sin esperar al PM, con lo más prudente** (la sesión): los enlaces, sin marca de
  afiliado; la guía, sin dibujos, con las fotos que ya lleva el viaje, y guardada sin ninguna dependencia nueva;
  y los números (la edad máxima de un precio), de partida y a su firma.
- **La página de la revisión de la tanda 4** (la sesión): https://claude.ai/artifact/XhWTz37RrGYU4gYHejZ77H. Con el
  ensayo pantalla a pantalla, y la parada enseñada de las dos maneras, con la frase del conductor y sin ella, para
  que el PM elija viéndolas. Sus capturas, sin gastar: la mesa guardada del ensayo, abierta con una casa sin
  modelo ni cuenta.
- **Cómo se cierra un viaje** (la sesión de obra, con lo más prudente; los números, a firma del PM): el orden de
  las reservas lo saca entero el código (primero lo que más se mueve de precio, después lo que no se puede
  cancelar, y al final lo que se reserva con tiempo), y el que explica solo escribe una frase de cada cosa; sin IA
  se cierra igual, sin frases. Si el total sube un 10 % o más, o una pieza se queda sin precio, se para y se
  pregunta. Una llegada que no cuadra con la hora de entrada no para el cierre: se dice y queda sin confirmar. Un
  precio vale un día si se pidió ahora y siete si era guardado. Cada enlace se comprueba con una petición de su
  cabecera, doce por cierre como mucho. Y el que explica gana un modo de cerrar, en vez de abrir un asiento nuevo,
  porque la hoja dice «el que explica».
- **El viaje cerrado guarda los días que el viajero tiene delante** (la sesión, al juntar): los manda la web con su
  ritmo, y la casa comprueba que cada fecha y cada parada son del viaje. La guía sale de esos días y de la manera
  con que se cerró.
- **Toda hora de una fuente, en veinticuatro horas** (la sesión, al cerrar el primer viaje de verdad): la fuente
  escribe «03:00 PM», y se leía como las tres de la madrugada. Lo que no se entiende como una hora no se adivina.
- **El precio de hoy se compara con el de la misma habitación, o se dice que es otra** (la sesión, al cerrar el
  viaje del ensayo): la fuente da hoy lo más barato que tiene. Si su habitación no es la que se miró, el cierre lo
  dice y lo deja sin confirmar, sin parar.
- **El enlace de otro vendedor se dice como de otro vendedor** (la sesión): con su precio del día que se buscó, y
  una línea que dice que hoy puede ser otro. Antes se leía «donde vimos el precio» junto a un precio que no era el
  de hoy.
- **La guía se guarda como una página que se imprime** (la sesión de obra, con lo más prudente y a confirmar por
  el PM): un documento HTML que se basta solo, con sus fotos dentro. El PDF sale del diálogo de imprimir del
  navegador, y además se descarga la página. Un PDF hecho por la casa pide una pieza de fuera, que es del PM.
- **El mapa de cada día de la guía es un croquis** (la sesión de obra): los puntos del día, con el norte y la
  escala, dibujados por el código. Sin mapas de calles, que piden un servicio o una clave.
- **Al que escribe la guía no se le da ningún precio** (la sesión de obra): los pone el cuaderno, con su fecha. Así
  «cada precio de la guía está en el viaje» lo mide el código sin leer frases.
- **De qué va cada cosa que hay que llevar hecha lo dicen los datos** (la sesión, al mirar la guía): el nombre de la
  parada o del papel lo pone el código, y la frase, el asiento. Y lo impreso corre seguido: ocho hojas donde había
  once.
- **El visto bueno a las tandas 4 y 5, y el sí a la 6** (el PM, a su punto de situación: «por lo demás, nada, yo
  creo que ok, seguimos para lo siguiente»; la sesión lo lee así y se lo dice, por si no lo era). De lo que quedaba
  a su decisión no contestó nada en concreto: se queda como está construido, y sigue en «Pendientes». No es un sí a
  gastar.
- **Donde la guía no sale en un idioma, se dice que todavía no está disponible** (el PM: «no es que se niegue,
  simplemente di que todavía no están soportados»). Hecho en la web.
- **La tanda 6 va en dos pasos** (la sesión): primero su cimiento (8.1), con una sola sesión de obra, y después el
  alojamiento, el transporte, el día a día y los cambios, a la vez, sobre él. Si se hicieran todos a la vez, cada
  uno inventaría su manera de guardar una elección, de decir un impacto y de rehacer.
- **Qué es una elección y qué es un cambio** (la sesión de obra del 8.1, con lo más prudente): elegir es escoger
  entre lo que ya trae la versión que se ve, y se guarda encima, sin versión nueva y sin gastar; todo lo que pide
  rehacer un paso es un cambio, y deja versión. Los días no se guardan: se guardan el ritmo y lo quitado, añadido y
  movido, y se calculan como en la web. Rehacer conserva lo que no lee nada de lo que cambió, y no solo lo de
  antes. De un viaje cerrado se puede volver a una versión abierta: no borra nada. Y caben veinte versiones y
  treinta investigaciones por viaje, de partida.
- **La revisión de la tanda 5** (la sesión, por la regla de la obra): tres adversarios en su copia. Dos
  bloqueantes, arreglados: seguir un cierre podía cerrar una versión vieja encima de otra nueva, y la guía enseñaba
  los precios de la investigación y no los del cierre. Lo que la sesión decidió al comprobar sus hallazgos queda en
  `revisiones/tanda-5.md`. Tres cosas, con su porqué: una palabra con mayúscula que no está en el viaje deja de ser
  un rojo de la puerta 10 y pasa a aviso, porque daba rojos falsos con «Gótico» o «Navidad» y cada uno gasta una
  vuelta del asiento; a la puerta 7 del orden no se le pone esa regla; y la guía solo sale en los idiomas que
  tienen sus rótulos y sus palabras prohibidas, en vez de salir con los rótulos en inglés sin decirlo.
- **Pedir guías y cerrar tienen tope al día** (la sesión, con lo más prudente; los números, a firma del PM): de un
  viaje, tres guías y seis intentos de cierre.
- **La guía lleva los precios del día que se cerró el viaje** (la sesión, por lo que dice la hoja: «cada precio de
  la guía está en el viaje cerrado»), con su fecha, y el de otro vendedor con la suya.
- **La batería de GitHub se mira después de cada subida** (la sesión, por un fallo suyo): estuvo en rojo desde la
  mañana del 24-nov, 63 subidas, con la de la nube en verde. Una prueba del lanzador montaba un puesto suelto y la
  casa guardaba su respuesta dos carpetas más arriba: en la nube, donde se trabaja como administrador, cabía en la
  raíz de la máquina; en GitHub, no. En una investigación de verdad no pasaba, porque un puesto cuelga siempre de
  su run. Arreglado en el código, no solo en la prueba (2.7): de un puesto suelto no se guarda nada fuera.
- **El reloj de la investigación en vivo** (la sesión, al mirar las capturas): cada suceso dice «38 s» hasta el
  minuto y «4:03» desde ahí. En segundos con un decimal no cabía en su columna en una investigación de verdad,
  que dura un cuarto de hora.
- **Los cuatro momentos de la tanda 6, con lo más prudente** (las sesiones de obra del 8.2, 8.3, 8.5 y 8.6; cada
  cosa, a firma del PM). Del alojamiento: buscar otra vez no vuelve a mirar a quien ya se miró, y de los nuevos mira
  a dos como mucho; la zona y los mínimos que pide el viajero no se ensanchan ni se bajan solos; una pregunta por un
  alojamiento la contesta el que mira, con su prueba, y pasa su puerta antes de enseñarse. Del transporte: otro vuelo
  los mismos días es una clase nueva de cambio (`flight`), que no rehace las miradas; otro día es un cambio de
  fechas; un aeropuerto en otro país rehace los papeles con él (`new_country`); el vuelo y su precio salen siempre
  de lo guardado por la casa, nunca de lo que mande la web. De los cambios: otro destino es un viaje nuevo, y este
  se queda intacto; lo que escribió el viajero no se toca, y el que escucha no se vuelve a lanzar; un viajero más
  con un pasaporte y una edad que ya estaban no rehace los papeles: se recuentan. Del día a día: lo que quitas no
  vuelve solo; se vuelve a los datos abiertos solo por lo que no estaba; y el que cruza y el que explica no se
  lanzan otra vez si lo que deciden no cambia, y eso lo mide el código con sus mismas puertas.
- **Al juntar los cuatro momentos, cerrar lleva a la vez el alojamiento y el transporte elegidos** (la sesión, al
  juntar): cada uno cambia su parte del total de la manera, con su prueba. Las dos ramas lo habían hecho cada una
  por su lado.
- **La revisión de la tanda 6** (la sesión, por la regla de la obra): tres adversarios en su copia. Un bloqueante,
  arreglado: un cambio que se paraba dejaba el viaje atascado y escondido. Lo que decidieron la sesión y las
  sesiones de obra al arreglar sus hallazgos queda en `revisiones/tanda-6.md`. Cinco cosas, con su porqué: lo que
  pides en un momento dura por la cadena de versiones mientras sigue valiendo, porque perderlo sin decirlo es lo que
  más sorprende; otra búsqueda de alojamiento pisa entera a la de antes, y no campo a campo; el que cruza y el que
  explica se conservan solo si lo que leerían es lo mismo, aunque se ahorre menos, para que no quede una frase
  vieja; un día que no cabe se dice y no se impide, porque es elección del viajero; y los cuatro momentos pasan a
  «en parte» en el plan, como el cierre, mientras no se vean con IA de verdad.
- **Las capas del destino, propuestas en la hoja** (el PM, al repasar lo que falta para que el agente sea
  funcional: «creo que aquí seguramente falten capas»; y después: «prepárame la propuesta de las capas nuevas en la
  hoja»). Faltan: el viaje no sabe lo que cuesta cada entrada ni cuándo abre, cómo se mueve uno allí y lo que
  cuesta, ni lo que conviene saber del destino, y su total solo suma dormir y llegar. La sesión lo propone en la
  hoja, en violeta y sin tocar lo firmado, y en el plan, como bloque 14: tres asientos nuevos (el de moverse, el que
  conoce el destino y el de las entradas), cada uno con su puerta (11, 12 y 13), y el presupuesto entero, que es
  código. Lo que la sesión eligió al proponer, con lo más prudente: trabajan como el del calendario y el de los
  papeles, saliendo a internet y citando cada página que abren; lo que no encuentran es «no se sabe», nunca un
  número aproximado; el de moverse da los datos y lo que conviene lo calcula el código; no se recomienda un
  restaurante con nombre, porque no hay fuente de opiniones; las comidas van aparte, como una horquilla; y las tres
  maneras de hacer el viaje se siguen comparando por dormir y llegar. **No es una decisión: no se construye nada
  hasta la firma del PM.**
- **Las capas del destino, firmadas** (el PM, a la propuesta: «vale pues integra las capas y cuando estén le damos
  el try del 7 que decías»). Entran las tres, como estaban propuestas: corren en la investigación, por detrás, y van
  antes del ensayo. La sesión lo lee también como el visto bueno a la tanda 6, con lo suyo pendiente en este
  registro, y se lo dice. **No lo lee como el sí a gastar**: el ensayo, el «7», espera su adelante cuando las capas
  estén. Se construyen en una tanda propia, la 6 bis, para no mover el número de las que ya se nombran en estos
  documentos: primero su suelo (14.1), con una sola sesión de obra, y después las capas, a la vez, sobre él, como se
  hizo con la tanda 6.
- **El techo de gasto y las capas** (el PM, al leer lo que quedaba pendiente de las capas: «hombre, entiendo que esto
  es un problema, ¿no?»). De las tres cosas que señaló, la sesión le contestó que una lo es: con un techo de gasto
  puesto, un asiento que se corta por su tope sin decir lo que gastó para la investigación entera, y una capa es
  opcional. Se arregla en esta tanda (14.7): una capa cortada por su tope se da por perdida, el viaje sigue y lo
  dice, y su gasto se cuenta por lo más alto que pudo gastar, para que el techo siga valiendo. Las otras dos (los
  topes de las entradas, y que otro idioma u otro «qué buscas» vuelva a lanzar al que conoce el destino) son números
  y reglas de partida, y siguen en «Pendientes».
- **Las capas, construidas y juntas** (la sesión, con seis sesiones de obra a la vez sobre el suelo, cada una con lo
  más prudente y a firma del PM). Del de moverse: el día en que se vio una página es hoy, con un día de holgura; si
  valen varios precios para una persona se coge el más caro, para no quedarse corto; un abono cubre días seguidos;
  una tarjeta recargable no entra en la cuenta, y la llegada se cuenta de ida. Del que conoce el destino: dieciséis
  cosas como mucho, con sus cifras aparte, y lo de comer sin nombres propios: la puerta mira palabras de restaurante
  y de opinión, y un nombre a secas queda al contrato. Del de las entradas: los datos abiertos salen de Wikidata y de
  OpenStreetMap, también de su buscador cuando Wikidata no sabe qué objeto es, a una consulta por segundo; una
  página de datos abiertos no vale como fuente de un precio que da el asiento; lo que el asiento no sabe se queda
  con lo que dicen los datos abiertos; lo que el viajero movió a un día se queda ahí aunque cierre, y se avisa; y si
  hay más sitios que el tope se miran primero los imprescindibles y los que tienen puerta. Del presupuesto: dos
  comidas de pago al día, un taxi para cuatro, ida y vuelta al aeropuerto si el transporte vuelve, y el precio más
  barato de los que valen. De la guía: el que la escribe ve ahora los precios y las horas de allí (no los de dormir
  ni los de llegar) y puede decirlos, solo de su material; dónde comer cae en cada día por cercanía, a 1.200 metros
  y tres por día. De la web: si la página no da el precio de un niño no se supone.
- **Al juntarlas** (la sesión): la cuenta de moverse del presupuesto es la del de moverse, que cada sesión había
  dejado por su lado, con su prueba; los contratos de prueba del suelo se quitaron; y «Quién te responde» tiene las
  filas de «Allí» y de la entrada de una parada, donde se lee y no se escribe, como dice la fila de «Allí» en la web.
- **Un agujero en la puerta de todos, cerrado** (lo encontraron dos sesiones de las capas; lo arregló la sesión, en
  el 3.5): en una vuelta de más, la entrega que se le devuelve al asiento contaba como su material, y una página
  que había escrito sin abrirla pasaba. Ya no cuenta; a cambio vale lo que abrió en sus vueltas de antes. Tocaba a
  todo asiento con internet: el del calendario, el de los papeles y las tres capas.
- **OpenStreetMap se lee por su servicio de lectura** (la sesión, al leer sus condiciones, y una sesión de obra):
  el de las entradas traía el objeto de cada sitio por la API de OpenStreetMap, que es la de editar y no admite
  proyectos de solo lectura, y buscaba por nombre en su buscador, que prohíbe las consultas sistemáticas. Las dos
  cosas se quitan: se lee por Overpass, con una consulta por tanda y solo etiquetas. Qué instancia se usa va por el
  entorno y es del PM. Sin Overpass el viaje sale igual: el horario de los datos abiertos no se sabe, se dice, y el
  asiento lo lee de la web del sitio, que Wikidata sí da.
- **Una sola cuenta en todas partes** (la sesión de obra que unió las capas, con lo más prudente y a firma del PM):
  la regla del precio de cada uno es la del presupuesto, también en la tarjeta y en la ficha de una parada. Moverte
  allí cuenta los trayectos de los caminos de la casa, que son los que enseña la web, con la ida y la vuelta a
  donde duermes, para no quedarse corto: por eso puede cambiar de una manera a otra. Las cuentas se rehacen siempre
  con lo que el viajero tiene delante. Siete cifras que antes podían salir distintas en dos sitios salen ya
  iguales, con su prueba.
- **Las capas en los demás momentos** (la sesión de obra del 14.7, con lo más prudente y a firma del PM): un mensaje
  para un día, y cualquier cambio que no sea de destino o de fechas, no vuelve a mirar las entradas; lo nuevo va con
  los datos abiertos y dice que no se ha mirado, y mirarlo es un botón del viajero, que gasta, mira ocho sitios como
  mucho y tiene el tope de los mensajes (tres al día). El que cruza espera ahora a moverse y al destino, para tener
  la cuenta delante. Al cerrar, el enlace a las entradas va dentro de su paso del orden, y un sitio sin enlace sigue
  en el orden.
- **El techo de gasto no se arregla acotando** (la sesión de obra del 14.7, y la sesión): la casa ya sabe seguir sin
  una capa cortada contándole una cota, pero la cota honrada, con lo que la casa sabe hoy de una llamada, sale por
  encima de lo que cuesta una investigación entera, así que con un techo normal pararía igual. No se enchufa
  ninguna cifra. En su lugar, el lanzador va a decir lo gastado también cuando se corta, y el techo se mirará con lo
  gastado de verdad. Lo hace otra sesión de obra en esta tanda. Mientras, con un techo puesto todo sigue como antes:
  la investigación para. La web sigue sin poner techo.
- **El techo de gasto, como queda** (la sesión de obra, y la sesión): el lanzador dice ya lo gastado al cortarse.
  Con la clave de un viajero, una capa cortada deja de parar el viaje: se cuenta lo gastado y, como cota, lo que la
  vuelta en marcha aún podía escribir. Con la cuenta de Claude de la casa no cambia casi nada: cortada no dice lo
  que costó y no tiene precio con que calcularlo, así que con un techo se para como antes. Lo prudente en los dos
  casos dudosos: sin cota, no se sigue a ciegas. La web sigue sin poner techo, así que hoy no para ningún viaje.

## Pendientes

Lo que deja el 25-nov, a decisión del PM:

- **De las capas del destino** (firmadas el 25-nov): si se recomiendan sitios concretos donde comer, que pide una
  fuente de opiniones. Sus topes de partida: el de moverse y el que conoce el destino, diez búsquedas y dieciséis
  páginas; el de las entradas, doce y veinte por llamada, ocho sitios por llamada y veinticuatro en total; diez
  minutos de espera a las entradas antes de repartir los días sin ellas; y, del destino, cuántas cosas por clase y
  160 letras por cosa. Que cambiar lo que buscas vuelve a lanzar al que conoce el destino, que no lo lee (otro idioma
  no se puede cambiar hoy: la casa lo rechaza). Los
  números de partida que pusieron sus sesiones: dos comidas de pago al día y cuatro por taxi; 1.200 metros y tres
  sitios por día para comer; el día de holgura de una página vista y los 31 días de un abono. Qué precio se coge si
  valen varios: hoy, el más barato en las entradas y el más caro en los billetes. Si la llegada al aeropuerto se
  cuenta de ida y vuelta (hoy, sí, si el transporte vuelve). Qué instancias de Overpass se usan para leer
  OpenStreetMap: la principal pide que lo comercial vaya a una propia o de pago, y desde esta nube no contesta; hay
  otras dos públicas de alcance mundial (la de VK Maps, rusa, y la de Private.coffee) y varias con clave o de pago
  (`condiciones.md`). Si moverte allí cuenta la ida y la vuelta a donde duermes (hoy, sí). Las reglas del precio de
  un niño: fuera de las edades del precio de niño paga el de adulto, y con un precio de niño sin edades no se sabe.
  Que el que escribe la guía vea los precios de allí, cuando la hoja decía que no
  veía precios. Lo que te pierdes en autobús, que la hoja nombra y sigue sin hacer. Si en «Allí» se puede escribir
  un mensaje: hoy solo se lee. El botón que mira las entradas de un sitio añadido: ocho sitios como mucho, con el tope
  de los mensajes, tres al día. Que un mensaje para un día no vuelve a mirar las entradas. El orden en que se miran
  cuando pasan del tope: los imprescindibles y los que tienen puerta, primero. Que una página de datos abiertos no
  vale como fuente de un precio que da el asiento. Qué se hace cuando quitas o mueves una parada y cambia la cuenta: no se rehace a nadie, porque una elección no
  gasta, y el porqué de cada manera sigue dicho con la cuenta de antes; lo prudente sería una nota en la web. Que un
  niño sin precio suyo paga el de adulto también en los billetes, que sube lo de moverse de las familias. Si en la puerta 12 lo visto tiene que
  ser de hoy, como en las otras dos, o vale la fecha que da la página, como dice su contrato. Que en «evitar» y en
  «lo práctico» no se nombre ningún negocio, ni para bien: es una regla nueva, puesta con lo más prudente. Si una
  página que no es de quien lleva el transporte o el sitio (un blog, un agregador) vale como fuente de un precio:
  hoy vale cualquiera que el asiento abriera. Si «dónde reservar» puede ser de otro dominio que la web del sitio
  (un revendedor): hoy, sí, si el asiento la abrió. Si en el ensayo se prueba a cortar a Claude con cuidado, por su
  entrada, para que diga lo gastado: no está documentado y no se puede probar sin gastar. Y verlo con IA de verdad,
  que es un gasto.
- **Otro ensayo entero con IA de verdad**, para ver lo construido después del primero («Volver a intentarlo»,
  las fechas contadas, los papeles mientras se busca y los frenos): unos 7 dólares de equivalente de su cuenta.
  O esperar al ensayo de la tanda 7.
- **Lo que deja la revisión de la tanda 6, porque toca la hoja** (entero en `revisiones/tanda-6.md`). Los
  momentos 4 y 5 dicen que el alojamiento y el transporte se ponen en marcha con «un mensaje tuyo» («más cerca del
  centro», «sin madrugar»): se han construido con mandos (la zona, los mínimos, el tope, el horario, solo directos)
  y sin caja de mensaje, que es más barato y no gasta IA, pero no es lo que dice la hoja. Buscar otro alojamiento, y
  rehacer las maneras con tus gustos, lanza también al que cruza y al que explica, y la fila de la hoja solo cuenta
  las miradas. Si lo que pides en un momento (un vuelo, una zona, unos gustos) tiene que durar cuando después
  cambias otra cosa: se ha construido que dure mientras siga valiendo. Si mientras se rehace un cambio se sigue
  viendo la versión de antes en el mapa: hoy se ve la investigación en vivo. Preguntar por un alojamiento gasta con
  un solo botón y sin techo, diciendo antes lo que cuesta cada pregunta. El permiso de tránsito de una escala no se
  puede mirar, porque la fuente de vuelos no dice dónde se hace: hoy solo se avisa. Si un día que no cabe, porque
  moviste o añadiste una parada, debe impedir guardar o cerrar: hoy se dice y no se impide. Si se ofrecen
  aeropuertos de otro país que el del destino cuando están cerca: hoy sí, y se avisa. Y el tope de elegir otro
  transporte, seis por viaje al día, de partida. Si otra búsqueda de alojamiento pisa entera a lo pedido antes o
  solo lo que cambia. Y si se prefiere ahorrar turnos de IA con un mensaje para un día, aunque una frase del que
  explica pueda quedarse vieja: hoy no se ahorra.
- **De la tanda 5**: si los enlaces de reserva llevan nuestra marca de afiliado (3.9), los dibujos de la guía
  (12.3), y la edad máxima de un precio al cerrar.
- **Del viaje a ratos (8.1)**: cuántas versiones e investigaciones caben en un viaje (veinte y treinta), y cuánto
  se guarda y hasta cuándo; si de un viaje cerrado se puede volver a una versión abierta (hoy, sí); si vale la
  tabla de lo que rehace cada cambio, sobre todo el gasto, los límites y lo ya reservado. De las tres cosas que
  gastaban más de lo que dice la hoja, dos quedan arregladas con sus momentos (un mensaje para un día es un turno
  cuando no cambia lo que se decide, y otro alojamiento mira a dos nuevos como mucho) y una a medias: un viajero
  más ya no rehace los papeles, pero sí vuelve a mirar a todos los finalistas.
- **De los cuatro momentos de la tanda 6** (25-nov). Sus números de partida: del alojamiento, dos nuevos que se
  miran, y diez preguntas y diez cambios por viaje al día; del transporte, mover tres días, doce opciones, doce
  búsquedas por viaje al día y «sin madrugar» desde las 9; de los cambios, seis por viaje al día; del día a día,
  tres mensajes por viaje al día, de 300 letras. Lo que gasta más de lo que dice su fila de la hoja: otro vuelo los
  mismos días son dos turnos de IA y no uno (el que cruza y el que explica), otro día rehace casi todo, y añadir
  una cosa a lo que buscas rehace la ruta, la búsqueda y las miradas. Si vale que otro destino sea un viaje nuevo,
  que la hoja pone entre los cambios. Si vale que un gusto que tocas quede como cita entre tus palabras. Si el del
  día a día sale al buscador, que la hoja dice que sí y hoy no. El del calendario con un mensaje para un día, que
  no se relanza. Que el del día a día recibe tus palabras tal cual. Que volver a los datos abiertos por palabras
  solo entiende inglés y español. Los vuelos en vivo (3.7), las dos escalas y el tren. El estilo con fotos y que el
  que mira salga a otras webs. Y verlo todo con IA de verdad, que es un gasto.
- **Lo que deja la revisión de la tanda 5, porque toca la hoja** (entero en `revisiones/tanda-5.md`): la puerta 8
  avisa de una llegada que no cuadra, de un enlace que no responde y de un precio caducado, y no impide cerrar,
  cuando su fila dice más; en qué idiomas se vende, y con ello en cuáles sale la guía; que un cierre que espera el
  sí no caduca; si al seguir días después se vuelve a pedir el precio siempre o solo cuando caducó; los números de
  la hora de llegada (tres horas de margen, y 150 grados para la línea de fecha) y los topes de guías y de cierres;
  y que el código no puede saber si un texto nombra un sitio inventado, que es del revisor.
- **Del cierre**: sus números (la edad máxima de un precio, la subida que pregunta y los enlaces que se
  comprueban); si vale cerrar sin frases cuando no hay IA; y lo de siempre con LiteAPI, que su precio no tiene
  página pública donde reservarlo: hoy se enseña el nuestro de hoy y, al lado, el de otro vendedor con su enlace.
  Y lanzar el primer cierre con IA de verdad.
- **De la guía**: dónde parar a comer y lo que te pierdes en autobús, que la hoja nombra y no están en el viaje
  (añadirlos es añadir sitios: por ejemplo, sitios de paso de los datos abiertos cerca del camino); si vale que el
  PDF salga del navegador; cuántas guías se pueden pedir de un viaje; y lanzar la primera guía con IA de verdad.

Lo que deja la obra del 24-nov, a decisión del PM:

- **Los números del buscador de webs**: 8 búsquedas, 12 páginas y 6 vueltas por asiento, de partida. Y si el lector
  se cierra por dominios en algún asiento (los oficiales, en el de los papeles).
- **Los números de los frenos de la puerta** (`agent/data/frenos.ts`): cinco fallos por correo y sitio, treinta por
  correo y veinte por sitio, en un cuarto de hora; treinta intentos por sitio y seiscientos en la casa; cinco
  registros por sitio y sesenta en la casa, por hora; cinco mil cuentas; cuatro contraseñas a la vez; veinte
  sesiones por cuenta; y los del primer vistazo, que cinco direcciones agotan (la sesión de obra propone cuatro
  por sitio y ciento veinte en la casa, y mirar el cupo de verdad de las fuentes).
- **«Volver a intentarlo»**: tres veces como mucho por investigación, de partida; y qué hace cuando se llegó al
  techo de gasto (hoy empieza otra vez, con todo su gasto; con la web de hoy, sin techo, no pasa).
- **Hasta dónde llega el conductor**: hoy, una vuelta de más y dentro del techo. Si algún día puede seguir sin una
  parte del viaje (y cuáles) o cambiar un tope. Si su frase se enseña al viajero tal cual, pasada su puerta de
  palabras, o solo las claves. Y si «Cambiar lo que pediste» debe reabrir las preguntas del mismo viaje.
- **La nota de los huéspedes, al que explica**: para que diga las dos, la nuestra y la suya.
- **Los números de los papeles y del calendario**: 16 búsquedas y 24 páginas para los papeles; 5 avisos, 2 ventanas
  y 21 días como mucho para el calendario. Y dos cosas de cómo se portan: que un fallo de los papeles pare el
  viaje y pregunte al viajero, y el paso de elegir otras fechas («Tú, las fechas»), que aún no está.
- **Lo que deja la revisión de la tanda 4, porque toca la hoja** (está entero en `revisiones/tanda-4.md`): el
  arranque, con un botón o con dos; si la frase del conductor se enseña (hoy, no); si un papel que ya es tarde para
  hacer para el viaje; si se lanza el de los papeles sin ningún dominio oficial, y cómo se dice una doble
  nacionalidad; cuándo no se buscan vuelos y si se admiten dos escalas; los destinos de varios países; en qué
  idiomas se sirve El Dorado; y los números del primer vistazo, de la habitación que se supone y de los topes de
  grupo y de noches.
- **Qué hace la casa cuando el filtro de seguridad del modelo marca el mensaje de un asiento** (pasó una vez en el
  ensayo, con una lista de sitios normal): hoy para y lo cuenta el conductor, como «un fallo técnico». Por decidir:
  si se le dice al viajero lo que fue, y si algún asiento debe tener un segundo modelo para cuando el primero no
  contesta, que se diría en el entorno. La sesión no rodea el filtro ni cambia de modelo por su cuenta.
- **Qué es un dominio oficial en cualquier país**: sigue pendiente. Hoy, de un país que no está en la lista nada
  sale «en regla». Hay una propuesta de la sesión de obra, sin construir.

Lo que deja la revisión de la tanda 3, a decisión del PM porque toca la hoja:

- **La segunda mirada a ciegas.** La hoja la nombra; la investigación mira cada alojamiento una vez, porque cada
  mirada son más de diez minutos. Va con el abaratado de la mirada (4.11).
Lo que deja la tanda 3, a decisión del PM:

- **Lo que solo vale en inglés y en español**: las palabras prohibidas que mira la puerta 7, los dos avisos de
  siempre y las quejas graves que se buscan por palabras en las opiniones. Con un viajero de otro idioma, la puerta
  mira menos. Hay que decidir en qué idiomas se vende, o que lo mire un asiento.
- **Los dominios oficiales de los papeles**: hoy, una semilla con dos países. Con el asiento de los papeles hay que
  decidir cómo se sabe qué es oficial en cualquier país.
- **Un viaje con varias bases** (una ruta por un país) todavía no se puede buscar: falta de dónde sacar los tiempos
  de un traslado. Hoy la investigación se para y lo dice.
- **Probarlo con destinos distintos**: hasta ahora, uno. Una gran ciudad de otro continente, un pueblo, un sitio de
  naturaleza y un país entero, antes de darlo por general.

- **Cómo se llama a la IA en el producto**: cada asiento tarda de once a quince minutos lanzado como una sesión
  entera. Para bajar a un minuto hace falta una llamada directa, con los seis pasos en una sola respuesta, y un
  método más corto. Es el 2.7, en la tanda 4, y toca el método común.
- **Guardar la ficha de cómo es de un alojamiento unos días**: mirar es lo que más gasta, y la ficha no depende del
  viajero. La hoja dice que no se guarda nada que no sea suyo: decide el PM.
- **A quién se mira**: lo sigue eligiendo la regla provisional. Falta que lo elijan las cribas, y con qué tope de
  gasto.
- **La fuente de rutas** (3.14, 24-nov): elegir entre las tres opciones de [fuentes.md](fuentes.md). Con ella, la
  zona de un alojamiento deja de saber solo lo que se anda: hoy, un hotel a diez minutos en metro del centro sale
  peor de lo que es.
- **La hora de llegada y de salida**: sin ella, el día de llegada y el de salida cuentan como los demás.

Lo que pide la versión 2, a decisión del PM:

- **El viaje de ejemplo de la portada** (23-nov): con datos de verdad de las fuentes, que hay que poder publicar, o
  inventado. Antes de publicar la portada.

- **Recuperar la contraseña y confirmar el correo** (24-nov): piden mandar correos, que es un servicio nuevo. Las
  cuentas en sí ya están decididas (24-nov).
- **Decir lo que va a costar antes de pulsar** (24-nov): la web no pregunta por un techo de gasto (lo decidió el PM
  ese día: cada uno limita su gasto en su cuenta de Claude), pero la hoja pide decir lo que va a costar antes de
  algo que gaste mucho, y aún no se dice junto al botón. Ya hay con qué: una investigación entera con la cuenta de
  la casa ronda los 7 dólares de equivalente. Va con el 11.4.
- **El precio de El Dorado** y cómo se cobra (23-nov). La IA va aparte, con la clave del viajero.
- **Dónde se reserva un precio de LiteAPI** (23-nov): no tiene página pública. Hoy se enlazaría a otra agencia cuando
  casa y, si no, a la web del hotel. Antes de la tanda 5.
- **Los dibujos de la guía** (23-nov): una colección propia o generados para cada viaje. Antes de la tanda 5.
- **Compartir un viaje** con quien viaja contigo (23-nov): lo propone la sesión.
- **La tarjeta de El Dorado en Cortex** (23-nov): se hace en `aurora-web`, que desde aquí solo se lee. Al final.

Lo que deja la tanda 1, a decisión del PM:

- **Encoger las fotos** (23-nov): pide meter una dependencia para funcionar en el agente, que hoy no lleva ninguna.
  El control de permisos de la sesión no deja instalarla sin un sí expreso del PM. Y llamar a la IA sin rodeos, con el
  2.7.
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
