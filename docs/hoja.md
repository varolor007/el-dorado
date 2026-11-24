# El Dorado, el agente de viajes, de una tirada y por momentos

> La primera biblia: qué es El Dorado. Se genera de sus datos, [paginas/hoja.datos.mjs](paginas/hoja.datos.mjs), con `node docs/paginas/pinta.mjs`, igual que su página, [paginas/hoja.html](paginas/hoja.html), publicada en https://claude.ai/artifact/D67ow4BecJge9aiZYCSS73. No se edita a mano.

Hoja de El Dorado, versión 2, firmada el 23 de noviembre de 2026.

**Buscas a dónde quieres ir en un mapa del mundo, pulsas un botón y ves cómo se investiga tu viaje en vivo, hasta que queda dibujado en el mapa, día a día y al mejor precio.** La primera vez corre de una tirada. Después lo usas a ratos: vuelves al alojamiento, al transporte o a un día y lo cambias, lo cierras con sus enlaces de reserva y te llevas tu guía. Cada momento despierta solo a los asientos que necesita; la IA no recuerda nada de una vez a otra, y la casa le da cada vez lo suyo de lo guardado. **Para el viajero es uno solo: El Dorado.** Por dentro trabajan los asientos, y esta hoja, que es nuestra, los llama por su nombre. En violeta, lo que está por decidir o por diseñar. Lo marcado como hecho ya está construido; lo demás está diseñado y sale de lo que decidiste. Pulsa un paso para ver su detalle.

## Qué cambia en la versión 2

- **Entra la web, entera**, como la contaste el 23-nov: el mapa del mundo con su buscador, la investigación en vivo, tu viaje en el mapa con una capa por día, los enlaces de reserva y tu guía.
- **Nueve momentos.** Dos nuevos: la portada con tu panel (tu cuenta, tu clave de IA y tus viajes) y la guía. «Al volver» pasa a ser tu panel, y «Elegir y reservar», cerrar el viaje.
- **El día a día, diseñado**: un asiento dice qué merece tu tiempo y qué no; el código lo reparte por días, a tu ritmo. Puerta 9.
- **Ya no son tres viajes: es tu viaje, con tres maneras de hacerlo.** Los días son los mismos; cambia dónde duermes y cómo llegas. Y las palancas: lo que ahorras con un día antes, otro hotel u otra zona, aunque tus fechas sean fijas.
- **Menos pasos.** Dónde y cuándo, un botón, y las preguntas mientras ya busca. Desaparece el segundo botón, «Buscar mi viaje».
- **La IA es Claude, con la clave de cada viajero**, como en DaVi. Lo que no gasta IA (el primer vistazo y el viaje de ejemplo) se ve sin cuenta y sin clave.
- **Una web propia**, como la de DaVi, en este repositorio. Cortex no tiene todavía ni cuentas ni páginas por agente.
- **Lo ya construido sigue valiendo**: el recolector, la búsqueda de alojamiento, el que mira el alojamiento y sus puertas.

## Por decidir

- **Recuperar la contraseña y confirmar el correo:** piden mandar correos, que es un servicio nuevo. Las cuentas ya no están por decidir: registro con correo y contraseña, guardado por la casa. *(por decidir)*
- **El precio** de El Dorado y cómo se cobra. La IA va aparte, con la clave del viajero. *(por decidir)*
- **Dónde se reserva un precio de LiteAPI:** no tiene página pública. Hoy se enlaza a otra agencia cuando casa y, si no, a la web del hotel. *(por decidir)*
- **Los vuelos en vivo:** hoy solo hay precios guardados de hace días, y a veces ninguno para las fechas exactas. *(por decidir)*
- **Abaratar la mirada:** un alojamiento tardaba catorce minutos; el objetivo es menos de uno. Ya van menos fotos, mejor elegidas y encogidas antes de mirarlas (tu sí del 24-nov a esa pieza de fuera). Llamar a la IA sin rodeos está decidido y construido (24-nov): una llamada directa por asiento, con la librería oficial de Anthropic. Falta la primera llamada de verdad y medir lo que baja. *(por decidir)*
- **La fuente de rutas:** de dónde salen el tiempo de verdad de un trayecto y si esa manera de ir existe allí. Geoapify, probada el 24-nov, vale para andar y para el coche (sin tráfico) y se queda corta en transporte público. Tu decisión de ese día: de momento, lo que se pueda, con el enlace a Google Maps de cada trayecto; Google en vivo no se contrata ahora. Lo que cuesta cada manera lo enseña Google en el enlace de cada trayecto: ninguna fuente abierta lo da en todo el mundo. *(por decidir)*
- **Los dibujos de la guía:** una colección propia o generados para cada viaje. *(por decidir)*
- **Las fotos de los hoteles en la web** y las de viajeros: con qué derechos se enseñan. *(por decidir)*
- **Los pesos, los mínimos y los topes:** son de partida, y se ajustan con casos reales. *(por decidir)*
- **Un revisor del viaje entero**, **el banco** con el que se mide si un asiento acierta, y **vigilar el precio** sin que entres. *(por decidir)*
- **Antes de vender:** las condiciones de las fuentes, con el abogado, y la clave de producción, con precios de verdad.

## Un viaje en el tiempo

Un ejemplo: cuatro días en Lisboa para dos, en febrero, hecho a ratos durante dos semanas. Cada tarjeta es un rato tuyo; debajo, el momento que abres.

- **Lunes, 21:00. Llegas.** En la portada, un viaje de ejemplo se dibuja solo. Lo tocas, te gusta, y entras con tu cuenta. Tu clave de IA ya la pusiste el primer día. *(La portada y tu panel)*
- **Lunes, 21:02. Dónde y cuándo.** En el mapa del mundo escribes «Lisboa» y tus fechas. El mapa vuela hasta allí y, en segundos, ves sus barrios, cuántos alojamientos pasan los mínimos y desde cuánto. Pulsas «Empezar la investigación». *(Empezar)*
- **Lunes, 21:03. Lo que he entendido.** Mientras el mapa ya se mueve, contestas cinco toques: sales de Madrid, sois dos, puedes mover las fechas, gasto medio, comer bien y ver lo imprescindible. En la caja libre: «con un gimnasio de verdad». Confirmas con un toque. Dos avisos: llueve a menudo, y los papeles, en regla. *(Empezar)*
- **Lunes, 21:04. La investigación.** Pulsos sobre la Baixa y Alfama; «216 alojamientos pasan tus mínimos»; cinco finalistas se encienden; aparecen los sitios que ver, uno a uno. Te vas a cenar: sigue sola. *(La investigación)*
- **Lunes, 21:10. Tu viaje, en el mapa.** Cuatro capas, una por día, con sus paradas numeradas y sus fotos. Tres maneras de dormir y de llegar. Y dos palancas: saliendo un día antes ahorras 60 euros; el hotel del medio te deja a diez minutos andando de lo del segundo día. *(La investigación)*
- **Martes. Más tranquilo, y otro hotel.** Pasas el ritmo a tranquilo y cada día se queda en tres paradas, al instante. El hotel del medio tiene un gimnasio «simbólico»: dos máquinas en un cuarto. Lo marcas como imprescindible, ves otros dos con su ficha y eliges uno. *(El día a día, El alojamiento)*
- **Viernes. Cierras el viaje.** «Me quedo con este.» Vuelve a pedir cada precio: el hotel ha subido un poco, y te lo dice. Te deja el orden y los enlaces: primero el vuelo, después el hotel, que se puede cancelar. *(Cerrar el viaje)*
- **Sábado. Tu guía.** Pides tu guía y te llevas un cuaderno con tus cuatro días: qué ves andando de una parada a otra, dónde parar y qué llevar hecho. *(La guía)*
- **Dos semanas después. Vuelves.** Sois tres: se apunta tu hermana. La casa te dice qué deja de valer (la habitación y los precios) y qué no (los días y los avisos), y lo rehace con tu adelante. *(La portada y tu panel, Cambios)*

## Los momentos

Cada columna es un momento. Las flechas marcan lo que tiene un orden: no hay investigación sin empezar, y nada de lo demás sin la investigación. Lo demás se abre cuando quieres. En verde, lo que el momento necesita de la plataforma. Para el viajero, quien responde es siempre El Dorado; aquí, el asiento que lo hace por dentro.

### 1. La portada y tu panel

quién es El Dorado, tu cuenta y tus viajes. Se abre: al llegar y cada vez que vuelves.

**Lo pone en marcha**

- llegas a la portada, sin cuenta
- entras con tu cuenta, desde cualquier equipo

**Necesita antes**

- nada para mirar la portada y el viaje de ejemplo
- para investigar: tu cuenta y tu clave de IA

**Dónde estás** (la portada y tu panel)

- nadie: es código
- el viaje de ejemplo está grabado: no gasta

**Flujo**

1. **Tú llegas** (tú). La portada presenta a El Dorado en una pantalla: qué hace, un viaje de ejemplo que se dibuja solo en el mapa, cómo funciona en tres pasos, qué cuida (nada inventado, cada precio con su enlace y su fecha) y qué cuesta. Como la de DaVi, tiene su propia web.
2. **El viaje de ejemplo** (código de la casa). Un viaje hecho de verdad y guardado: su investigación se puede volver a ver, y su mapa por días se toca como el tuyo. No gasta, porque no busca ni piensa nada: enseña lo que salió. Es lo que quita el miedo a registrarse sin haber visto nada.
3. **Tú, tu cuenta** (tú) *(por decidir)*. Registro e inicio de sesión. Con tu cuenta, tus viajes quedan guardados y los abres desde cualquier equipo.
4. **Tú, tu clave de IA** (tú). La IA la pagas tú, por lo que uses, con tu propia clave de Claude, como en DaVi. La pegas una vez; se guarda cifrada, se usa solo para tus viajes, no se enseña entera nunca más y la borras cuando quieras. Sin clave puedes mirar, pero no investigar.
5. **Tu panel: donde lo dejaste** (código de la casa). Ves tus viajes, en qué quedó cada uno y lo que te espera: una confirmación, una elección, un papel con plazo. Desde aquí empiezas uno nuevo.
6. **Los precios de hoy** (código de la casa) *(por decidir)*. Al abrir un viaje, vuelve a pedir sus precios y te dice qué ha cambiado.
7. **El gasto de tu clave** (código de la casa). Cada turno de IA apunta lo que gastó. En tu panel ves lo que ha costado cada viaje, y antes de algo que gaste mucho, lo que va a costar más o menos.
8. **Retomas** (tú). Sigues por donde quieras: el alojamiento, el transporte, un día, o cerrar el viaje.

**Te espera**

- tu registro o tu inicio de sesión
- tu clave de IA, una vez
- lo que quedó pendiente en cada viaje

**Corre por detrás**

- los precios de hoy de un viaje, al abrirlo

**Qué ve la IA**

- ninguna: aquí no trabaja ningún asiento

**Deja guardado**

- tu cuenta
- tu clave de IA, cifrada
- lo que ha gastado cada viaje

**Puede afectar a**

- nada

**Red**

- el código, a las fuentes, por los precios de hoy

**Turnos de IA**

- ninguno

### 2. Empezar

el mapa del mundo: dónde y cuándo. Se abre: cada vez que empiezas un viaje.

**Lo pone en marcha**

- buscas un destino en la barra, o lo tocas en el mapa del mundo, y das tus fechas
- pulsas «Empezar la investigación»

**Necesita antes**

- el destino y las fechas
- para el primer vistazo, nada más
- para pulsar el botón, tu cuenta y tu clave de IA

**Dónde estás** (el mapa del mundo)

- mientras buscas y tocas, nadie: es código
- la caja libre la lee el que escucha
- los avisos, el del calendario y el de los papeles

**Flujo**

1. **Tú, el mapa del mundo** (tú). Te recibe el mapa del mundo, en plano, con una barra arriba, como la de un buscador de hoteles: dónde quieres ir y en qué fechas. También puedes tocar el destino en el mapa. Son los dos únicos datos que hacen falta para empezar.
2. **El buscador de lugares** (código de la casa). Mientras escribes, propone ciudades, regiones y países. Al elegir, el mapa vuela hasta el destino y lo encuadra: la ciudad, si es una ciudad; el país entero, si es un país.
3. **El primer vistazo** (código de la casa) *(por decidir)*. Sin IA y sin gastar: en segundos, sobre el mapa, cuántos alojamientos pasan unos mínimos de partida y desde qué precio para tus noches, por zonas, y los días baratos para volar ese mes. Es lo que ves antes de decidir si investigas, y no pide cuenta: quita fricción y no gasta IA, solo consultas a las fuentes.
4. **Tú, «Empezar la investigación»** (tú). Un solo botón. Dice lo que va a hacer y que usa tu clave de IA. Nada que gaste arranca sin él. Desde que lo pulsas, el mapa ya está vivo: las búsquedas de código corren mientras contestas.
5. **Tú, cinco toques** (tú). Las preguntas base, con toques y sin escribir, en una hoja al lado del mapa: de dónde sales (propuesto por tu ubicación), quiénes vais (con la edad de los niños, el pasaporte de cada uno y en cuántas habitaciones dormís), si tus fechas son fijas, cuánto quieres gastar y qué buscas. En un país o una región, además: si quieres ver más de una ciudad, si te vale salir del país y cuánto quieres moverte. Y una casilla, «Ya tengo algo reservado». Son una base, no una lista cerrada. Mientras contestas, el código ya busca con lo más probable y corrige si cambias algo.
6. **Tú, la caja libre** (tú) *(solo si hace falta)*. Lo que quieras añadir con tus palabras: «quiero vistas al mar», «no vuelo de noche», «voy con mi madre, que anda poco». De aquí salen tus gustos y tus límites.
7. **El que escucha** (asiento de ia). Separa lo que dijiste en límites (lo que no puede pasar), gustos (lo que prefieres) y datos (lo que ya tienes reservado). Pone cada gusto en su sitio: imprescindible, me gusta o me da igual; imprescindible, solo si no dejaste duda. Busca lo que choca (un gasto ajustado con un hotel de lujo, tres días con cuatro ciudades) y te lo pregunta. No añade nada que no dijeras: cada gusto cita tus palabras. Hasta tres preguntas más, y solo si la respuesta cambia el viaje.
8. **Puerta 1: ¿el viaje, claro?** (puerta). Los campos base, completos; cada gusto y cada límite, con una cita que está de verdad, letra a letra, en lo que escribiste; tres preguntas de más como mucho; y lo que choca, dicho, aunque sea «nada».
9. **Tu confirmación** (tu aprobación). Ves en corto lo que he entendido de tu viaje y de tus gustos, y lo confirmas o lo corriges. Es lo que cubre lo que el código no puede medir: si un gusto se entendió bien.
   *a la vez, mientras confirmas*
11. **El del calendario** (asiento de ia) *(en parte)*. Con tus fechas, busca lo de esas semanas y de ese año: el tiempo habitual, la temporada, las fiestas y los eventos de allí, los festivos de donde sales, lo que cierra y lo que se agota con meses. Pone cada hallazgo en su clase: bloquea, encarece, molesta o favorece. Compara tus días con los que pide el destino. Si puedes mover las fechas, propone otras y dice qué mejora y qué se pierde. Cinco avisos como mucho. No dice «más barato» sin un precio. Lo que falta: hecho y sin estrenar con una IA de verdad. Sus otras fechas se ven, pero aún no se pueden elegir.
12. **El de los papeles** (asiento de ia) *(en parte)*. Monta una tabla, cada viajero por cada país, y recorre en cada casilla la lista fija de preguntas: visado, vigencia del pasaporte, billete de salida, prueba de dinero, tarjeta de llegada, vacunas, seguro, menores, tránsito, aviso del ministerio y carné de conducir. Busca cada respuesta en el gobierno del destino y en el ministerio de tu país. Si coinciden, vale; si chocan, es dudoso y enseña las dos. Las cuentas de plazos las hace el código. Nunca dice «puedes entrar»: dice lo que piden las fuentes, y con qué fecha. Lo que falta: hecho y sin estrenar con una IA de verdad. Hoy mira solo el país del destino: las escalas esperan al transporte. De un país sin dominio oficial en nuestra lista, nada sale en regla.
13. **Puerta 2: ¿algún papel bloquea?** (puerta) *(en parte)*. La tabla, completa; cada respuesta, de un dominio oficial de nuestra lista y con su fecha; «en regla» pide dos fuentes, o una del gobierno del destino; lo dudoso sale como aviso. Si algo bloquea, el viaje se para aquí y te lo digo, antes de gastar en buscar. Lo que falta: hecha aquí, al empezar. Si los papeles no se pudieron mirar, también se para y decides tú. Falta en el transporte y en los cambios.
14. **Tú, las fechas** (tú) *(solo si hace falta)*. Si dijiste que puedes mover las fechas y hay una ventana mejor (menos lluvia, sin la feria que lo encarece todo), eliges: las tuyas o las nuevas.

**Te espera**

- tu «Empezar la investigación»
- tu confirmación de lo que he entendido
- hasta tres preguntas más, si hacen falta
- si un papel bloquea, tu decisión
- si hay fechas mejores, tu elección

**Corre por detrás**

- el primer vistazo: segundos y sin IA
- el calendario y los papeles, mientras contestas

**Qué ve la IA**

- el que escucha: lo que escribiste y tus toques
- el del calendario: el destino, las fechas y qué buscas
- el de los papeles: los pasaportes, las edades, el destino y los días
- ninguno: tu nombre, tu correo ni tu clave

**Deja guardado**

- lo que he entendido, con cada gusto y su cita
- los avisos de las fechas
- la tabla de los papeles, con sus fuentes y su fecha

**Puede afectar a**

- todo lo demás: de aquí sale

**Red**

- el código: al buscador de lugares y al mapa
- el del calendario y el de los papeles: a las webs oficiales y al buscador
- el que escucha, no

**Turnos de IA**

- el que escucha, una pasada
- el del calendario y el de los papeles, una cada uno, con sus búsquedas

### 3. La investigación

en vivo y de una tirada, hasta tu viaje en el mapa. Se abre: una vez, unos minutos.

**Lo pone en marcha**

- tu confirmación de lo que he entendido

**Necesita antes**

- lo que he entendido, confirmado por ti (puerta 1)
- ningún papel que bloquee (puerta 2), o tu decisión de seguir
- las fuentes de datos, encendidas, y tu clave de IA, válida

**Dónde estás** (el mapa de tu destino, en vivo)

- lo que se mueve y lo que se cuenta lo dice el código, con lo que de verdad pasa
- lo que lees al final lo escribe el que explica

**Flujo**

1. **La investigación, en vivo** (código de la casa). La casa cuenta cada cosa que hace mientras la hace: qué zona busca, cuántos alojamientos trae, cuántos pasan, qué finalista mira, qué sitios encuentra. La web lo pinta donde pasa: un pulso sobre la zona que se busca, un punto por cada alojamiento que entra, una tarjeta por cada hallazgo. Las frases las escribe el código con los datos, sin IA: «216 alojamientos pasan tus mínimos». Nada se mueve en el mapa que no esté pasando de verdad. Queda guardado, y se puede volver a ver.
2. **El de la ruta** (asiento de ia) *(en parte)*. Decide la forma del viaje: una base, una base con excursiones o una ruta. Lista los sitios por lo que buscas, con las noches que merece cada uno, y los encaja en tus días; si no caben, quita sitios, no aprieta. Los ordena para no volver atrás y propone por dónde entrar y por dónde salir. En cada base marca de una a tres zonas donde buscar alojamiento, con su centro, su radio y su porqué, en minutos y no en adjetivos. Sin precios ni hoteles. Lo que falta: hoy solo llega al final un viaje de una sola base. Si el viaje pide varias, o lo elegido queda a más de un día de donde se duerme, la casa para tras la ruta o tras elegir los sitios y lo dice, porque todavía no sabe medir los traslados ni buscar alojamiento en más de una. Tampoco trae sitios de fuera de la caja del destino para una base con excursiones.
3. **Puerta 3: ¿las noches suman?** (puerta) *(hecho)*. Las noches de las bases suman las del viaje; cada traslado tiene su duración y su fuente; dos noches por base como mínimo; lo imprescindible para ti está dentro, o dice por qué no; y cada zona tiene su centro y su radio.
   *en código, a la vez*
5. **La búsqueda de alojamiento** (código de la casa) *(hecho)*. Sin IA. Trae de la fuente todos los alojamientos de cada zona para esas noches y ese grupo; quita los que no llegan a los mínimos, comprobándolos uno a uno aunque la fuente ya filtre; pone a cada uno el precio de esas noches; elige los finalistas por regla y deja la ficha de datos de cada uno: la habitación de ese precio, con sus metros y sus fotos, las opiniones por temas y lo que piden otros vendedores. La misma entrada da siempre la misma lista. Si el viajero marcó como imprescindible algo que la fuente declara (el gimnasio, la piscina), lo que no lo declara se descarta antes de elegir a quién mirar. El grupo duerme en las habitaciones que diga el viajero: se pide el precio de todas juntas, y si para ese grupo y esas habitaciones nada tiene precio, se dice. Las estrellas se le piden a quien las lleva: una casa o un piso que no las lleva se juzga por su nota y sus opiniones. Y los mínimos van en escalera: si con los de partida no quedan bastantes con precio, como pasa en un pueblo, se baja un escalón, y se dice. Si ni así hay con qué elegir, la zona se ensancha, hasta un tope, y también se dice. Construida el 23-nov: una ciudad, en unos veinte segundos.
6. **La búsqueda de transporte** (código de la casa) *(por decidir)*. Sin IA. Los aeropuertos de salida y de llegada, los días de alrededor si puedes moverlos, y el tipo: directo, con una escala o tren. Cada opción, con su precio, su enlace y el día en que se vio. Hecha para los vuelos: los aeropuertos salen solos de donde sales y a donde vas, y se miran pocos pares, tus fechas y dos días a cada lado si las puedes mover. El tren no lo da la fuente. Hoy solo hay precios guardados de hace días (Aviasales), y para unas fechas exactas casi nunca hay ninguno: entonces el viaje sale sin transporte, y lo dice.
7. **Los sitios que ver** (código de la casa). Sin IA. Trae de datos abiertos (Wikidata, Wikipedia y OpenStreetMap) lo que hay que ver en cada zona de la ruta: su nombre, dónde está, qué es y cuánto se habla de él; y de Wikimedia Commons, una foto con su autor y su licencia. Si el destino es pequeño y no salen bastantes sitios, pide cada vez menos fama, hasta lo que tenga un solo artículo. No guarda una base propia: lo pide en el momento, como todo.
8. **Puerta 4: ¿la búsqueda es de fiar?** (puerta) *(en parte)*. Todo lo que sigue cumple los mínimos; cada precio es de esas fechas, de ese grupo y en la moneda pedida; cada dato dice de qué fuente sale y cuándo se vio; cada descarte lleva su motivo; ningún finalista sale dos veces; y la habitación que se enseña es la de ese precio, no la suite. Construida para el alojamiento, con dieciocho trampas que tiene que cazar. Lo que falta: las fechas de cada precio las copia hoy el enchufe de lo que se pidió: hasta que se lean de la respuesta de la fuente, esa parte de la puerta no puede fallar. Los adultos y las habitaciones ya se leen de la respuesta.
9. **Las tres cribas** (código de la casa) *(hecho, por decidir)*. Primera: lo que no vale se descarta, con su motivo (una escala demasiado corta, billetes separados sin margen, un alojamiento donde no cabe el grupo o al que le falta algo imprescindible para ti). Segunda: todo lo que tiene precio se suma al precio (la maleta, el asiento, llegar al aeropuerto, la tasa turística, la limpieza). Tercera: lo que no tiene precio recibe una nota de 0 a 10, con pesos que se mueven con el viajero. Hechas para el alojamiento: lo imprescindible descarta, y también una queja grave (bichos, moho, un robo, un engaño, no sentirse seguro) si la confirma el que mira en más de una opinión: el código la señala por palabras, pero no descarta por ellas; el total lleva lo que se paga aparte, y la nota sale de la zona, de cómo es, de las opiniones corregidas y de las condiciones. Lo que no tiene dato no cuenta y se dice «sin confirmar». A quién se mira de cerca lo sigue eligiendo una regla provisional (el más barato de cada zona, los más baratos y los de mejor nota por lo que cuestan), a la que ya no llega quien no declara un imprescindible: falta que lo elijan las cribas. Las del vuelo esperan a la búsqueda de transporte.
10. **El que mira el alojamiento** (asiento de ia) *(en parte)*. De cada finalista: primero mira y después juzga. Hace el inventario de las fotos, mira por lista y sin opinar (el suelo, los muebles, el baño, la ventana, el sitio junto a la cama; en el gimnasio, cuántas máquinas y de qué tipo), lee las opiniones por temas y pone a cada campo su nivel, de los escritos, con la foto o la opinión que lo prueba. Cómo se ve sale de las fotos de la habitación, y cómo lo mantienen, de lo que cuentan los viajeros: son dos campos, y los dos se juzgan; el estilo solo se nombra. No ve el precio ni la nota, para no sesgarse. Y contrasta con otras webs lo que el dato tapa: una nota distinta en otra agencia, una piscina que en tus fechas está cerrada. Lo que falta: no contrasta con otras webs: trabaja solo con lo que le da la casa. Y mira cada alojamiento una vez, no dos a ciegas.
11. **Puerta 5: ¿cada nivel, con su prueba?** (puerta) *(hecho)*. Cada nivel es de su lista; su prueba existe entre lo que recibió el asiento y es de la habitación de ese precio; sin prueba, «no se sabe», nunca un nivel medio; y lo que choca entre las fotos y las opiniones va marcado.
12. **El del día a día** (asiento de ia) *(en parte)*. De los sitios de cada zona elige los que encajan con lo que buscas y dice cuáles no merecen tu tiempo, con su porqué. Los ordena por importancia y dice cuánto lleva cada uno, a qué hora conviene y lo que hay que reservar con tiempo. Añade lo que los datos no traen: un mercado, un barrio para pasear, una excursión de un día. No inventa sitios: cada uno existe en los datos o en una fuente que cita. No reparte por días: eso lo hace el código. Lo que falta: lo que echa en falta se apunta, pero todavía no se busca en otras fuentes; lo que descarta, con su porqué, aún no llega a la web; y los sitios se le dan del destino entero, no por zonas.
13. **El ritmo** (código de la casa) *(en parte)*. Sin IA. Reparte las paradas en tus días: junta en el mismo día lo que está cerca, respeta el orden de importancia y lo que cierra cada día, y pone tantas paradas como pida tu ritmo: tranquilo, normal o intenso. Ordena cada día para no cruzar la ciudad dos veces y dice lo que hay de camino entre parada y parada, con las maneras de ir que tienen sentido: a pie lo que se anda; en transporte o en coche lo que no, con un tiempo aproximado. Lo que no cabe en un día, o queda a más de un día de donde duermes, se queda fuera y dice por qué. La misma entrada da siempre los mismos días. Lo que falta: no mira todavía lo que cierra cada día. Y de un trayecto que no se anda solo sabe la distancia y un tiempo aproximado: lo que cuesta cada manera de ir y si la hay donde viajas lo dirá una fuente de rutas, que está por decidir.
14. **Puerta 9: ¿cada día cabe?** (puerta) *(hecho)*. Cada parada existe en los datos, con su sitio en el mapa y su fuente; ninguna sale dos veces; lo imprescindible para ti está dentro, o dice por qué no; las horas de cada día caben en el día; ningún salto entre dos paradas seguidas pasa del tope; y lo que se sabe que cierra ese día no está en ese día.
15. **El cruce** (código de la casa) *(hecho)*. Sabe que dos fuentes hablan del mismo alojamiento por lo cerca que están y por lo que se parecen sus nombres, monta el viaje completo y lo suma en una tabla. Y pide las palancas: el precio de las mismas noches movidas de uno a tres días (tu decisión del 24-nov: siempre se ofrecen tres días a cada lado, aunque tus fechas sean fijas), el de los otros finalistas y el de otra zona, con lo que anda de más o de menos cada uno hasta lo que vas a ver. Saca el más barato y el mejor por lo que cuesta. Construido para el alojamiento, con el transporte que haya: la tabla, las restas de cada palanca, la más barata y la mejor por lo que cuesta.
16. **El que cruza** (asiento de ia) *(en parte)*. Lee la tabla y mira dónde está el dinero y dónde se mueve. Recorre una lista fija de palancas: mover el día, otro aeropuerto, entrar por una ciudad y salir por otra, cambiar el orden de la ruta, una noche más o menos, otra zona, el tren por el vuelo. Pide solo las búsquedas que valen la pena, dos rondas como mucho, y para por regla. Mira lo que la tabla no ve: si la llegada cuadra con el hotel, si un vuelo en otro día cambia las noches. Cierra las tres maneras de hacer el viaje, elige las palancas que merece la pena contarte y dice qué cambiaría el resultado. No hace cuentas: cada número sale de la tabla. Lo que falta: no puede mirar si la llegada cuadra con el alojamiento, porque todavía no se le dan las horas, y no dice qué cambiaría el resultado.
17. **Puerta 6: ¿cada número sale de la tabla?** (puerta) *(en parte)*. Cada número es igual al de la tabla del código; las piezas de cada viaje son de las mismas fechas y del mismo grupo; cada palanca está probada o descartada con su motivo; dos rondas como mucho; cada país nuevo tiene sus papeles; el más barato pasa de la nota mínima, y el distinto lleva su palanca. Lo que falta: que cada país nuevo tenga sus papeles lo pide el contrato, pero no lo comprueba el código.
18. **El que explica** (asiento de ia) *(en parte)*. Escribe, en tu idioma, por qué es cada manera de hacer el viaje y qué se gana y qué se pierde frente a la más barata: «60 euros más, cinco horas menos y llegas de día». Dice lo que hay que hacer y para cuándo, y lo que no se sabe, en el mismo sitio. Cada número, copiado de la tabla; ningún adjetivo sin su hecho; ninguna promesa. Lo que falta: todavía no dice lo que hay que hacer y para cuándo.
19. **Puerta 7: ¿sin promesas y con su aviso?** (puerta) *(hecho)*. Cada número del texto está en la tabla; ninguna palabra de la lista prohibida (las promesas y las de dentro); cada manera tiene su línea de lo que gana y lo que pierde; lo que no se sabe está dicho; y lleva el aviso de IA y el de los precios orientativos.
20. **El viaje, en el mapa** (código de la casa) *(hecho)*. Deja el viaje listo para la web: cada día en su capa, con sus paradas numeradas, su foto redonda y la flecha de una a otra; dónde duermes y sus alternativas; por dónde llegas y te vas; las tres maneras de hacerlo y las palancas, cada una con lo que ahorra.
21. **Sale tu viaje, en el mapa** (lo que sale). Un viaje completo: el día a día en el mapa, y tres maneras de dormir y de llegar (la más barata, la mejor por lo que cuesta y una distinta), nunca diez, cada una con su precio total, y cada precio con su enlace y su fecha. Y las palancas: «si sales un día antes ahorras 60 euros», «este hotel te deja a diez minutos andando de lo del segundo día».

**Te espera**

- nada: corre sola hasta el final; puedes mirar, tocar el mapa o irte

**Corre por detrás**

- todo: puedes cerrar la página y volver
- la búsqueda de alojamiento, unos veinte segundos, sin IA (medido el 23-nov)
- mirar un alojamiento: catorce minutos hoy (medido el 23-nov); el objetivo, menos de uno *(por decidir)*
- la investigación entera: el objetivo, tres minutos; por medir en el ensayo *(por decidir)*

**Qué ve la IA**

- el de la ruta: lo que he entendido y los avisos
- el que mira: las fotos y las opiniones de cada finalista, y cuál es la habitación de ese precio; nunca el precio ni la nota
- el del día a día: la ruta, lo que buscas y los sitios de cada zona, con su fuente; nunca los precios
- el que cruza: la tabla que hace el código
- el que explica: el viaje con sus números; nunca la web

**Deja guardado**

- la ruta
- los candidatos, con su precio y su fecha, y los descartes, con su motivo
- la ficha de cómo es cada finalista
- los sitios de cada zona, con su fuente y su foto
- cada día, con sus paradas y su orden
- las tres maneras de hacerlo y las palancas, con lo que ahorra cada una
- lo que pasó en la investigación, paso a paso

**Puede afectar a**

- los momentos de después

**Red**

- el código: a las fuentes de datos (LiteAPI, Aviasales y Parallel) y a los datos abiertos de sitios y sus fotos
- el de la ruta y el del día a día: al buscador
- el que mira, el que cruza y el que explica, no

**Turnos de IA**

- la ruta, una pasada
- mirar, una por finalista, con sus fotos: lo que más gasta
- el día a día, una
- cruzar, hasta dos rondas
- explicar, una
- todo, por medir en el ensayo; lo ves en tu panel *(por decidir)*

### 4. El alojamiento

otra zona, otros mínimos o mirar otro. Se abre: cuando quieras.

**Lo pone en marcha**

- abres el alojamiento de tu viaje
- un mensaje tuyo: «más cerca del centro», «con un gimnasio de verdad»
- marcas un gusto como imprescindible

**Necesita antes**

- la investigación, hecha

**Dónde estás** (la ficha de un alojamiento)

- si preguntas cómo es, el que mira el alojamiento
- otra zona u otros mínimos: código
- si cambia el total, el que cruza

**Flujo**

1. **Tú abres el alojamiento** (tú). Tocas en el mapa dónde duermes, o una de sus alternativas, y se abre su ficha: sus fotos, cómo es de verdad con su prueba, lo que se dice de él, su precio con su fecha y lo que te deja cerca.
2. **Tú, tus gustos** (tú) *(solo si hace falta, por decidir)*. De cada cosa (las vistas, el diseño, el gimnasio, la piscina, el tamaño, la tranquilidad) dices si es imprescindible, si te gusta o si te da igual. Lo imprescindible descarta; lo que te gusta sube la nota. El estilo se elige tocando fotos de ejemplo, no con palabras.
3. **La búsqueda de alojamiento, otra vez** (código de la casa) *(hecho)*. La misma búsqueda, con otra zona, otros mínimos u otro tope de gasto. Segundos, y sin gastar IA.
4. **Los gustos** (código de la casa) *(hecho)*. Cruza la ficha de cómo es cada alojamiento con lo que marcaste: lo imprescindible descarta, y lo que te gusta sube la nota. El asiento describe; quien decide si te gusta eres tú.
5. **El que mira el alojamiento** (asiento de ia). Mira un candidato nuevo con la misma lista y los mismos niveles, o contesta lo que preguntes de uno («¿el gimnasio tiene pesas?») con su prueba.
6. **El que cruza** (asiento de ia) *(solo si hace falta)*. Si el alojamiento nuevo cambia el total, o la zona cambia cómo se llega, rehace las cuentas del viaje con la tabla del código.
7. **Las puertas 4 y 5, otra vez** (puerta). Lo que entra nuevo pasa por las mismas puertas: la de la búsqueda y la de cómo es.
8. **Tu elección** (tu aprobación). Eliges el alojamiento de ese viaje. Lo de antes no se pisa: queda en su versión.

**Te espera**

- tus gustos, si no los diste
- tu elección

**Corre por detrás**

- la búsqueda, segundos
- mirar un alojamiento nuevo, por medir *(por decidir)*

**Qué ve la IA**

- el que mira: lo mismo, del candidato nuevo

**Deja guardado**

- tus gustos
- la ficha del nuevo
- tu elección
- la versión de antes, sin pisar

**Puede afectar a**

- el total del viaje
- el día a día: otra zona, otros paseos

**Red**

- el código, a las fuentes
- el que mira, a otras webs: el lector de webs ya está; falta dárselo en su contrato *(por decidir)*

**Turnos de IA**

- una pasada del que mira por cada candidato nuevo

### 5. El transporte

otro día, otro aeropuerto u otro horario. Se abre: cuando quieras.

**Lo pone en marcha**

- abres el transporte de tu viaje
- un mensaje tuyo: «sin madrugar», «prefiero directo»

**Necesita antes**

- la investigación, hecha

**Dónde estás** (el transporte de tu viaje)

- el que cruza
- la búsqueda, código

**Flujo**

1. **Tú abres el transporte** (tú). Entras en los vuelos o los trenes de tu viaje: horas, escalas, lo que incluye y su precio con su fecha.
2. **La búsqueda de transporte, otra vez** (código de la casa) *(por decidir)*. La misma parrilla, movida a donde pides.
3. **El que cruza** (asiento de ia). Un vuelo en otro día cambia las noches, y con ellas el precio del alojamiento: nunca se mezclan precios de fechas distintas, se busca otra vez. Dice lo que ahorras y lo que pierdes.
4. **El de los papeles** (asiento de ia) *(solo si hace falta)*. Una escala en otro país puede pedir permiso de tránsito: su tabla se rehace para esa escala.
5. **Las puertas 2 y 6, otra vez** (puerta). La de los papeles, si hay un país nuevo, y la de los números del cruce.
6. **Tu elección** (tu aprobación). Eliges el transporte de ese viaje.

**Te espera**

- tu elección

**Corre por detrás**

- la búsqueda, segundos

**Qué ve la IA**

- el que cruza: la tabla nueva

**Deja guardado**

- la opción nueva y lo que cambia
- tu elección

**Puede afectar a**

- las noches, si cambia el día
- el alojamiento
- los papeles, si hay otra escala

**Red**

- el código, a las fuentes
- el de los papeles, a las webs oficiales

**Turnos de IA**

- una del que cruza

### 6. El día a día

cada día, una capa del mapa. Se abre: cuando quieras.

**Lo pone en marcha**

- abres un día en el mapa
- mueves el ritmo: tranquilo, normal o intenso
- un mensaje tuyo: «menos museos», «un día de playa»

**Necesita antes**

- la investigación, hecha: la ruta y los sitios de cada zona

**Dónde estás** (un día, en su capa)

- el ritmo y mover una parada: código
- un mensaje tuyo: el del día a día

**Flujo**

1. **Tú abres un día** (tú). El mapa de tu destino tiene una capa por día, y otra con todos. Al abrir un día ves sus paradas numeradas, cada una con su foto en un círculo y una flecha a la siguiente, y al lado, la misma lista en tarjetas: tocar una enciende la otra. No es una ruta de navegador: dice el orden y lo que se anda. Cada parada lleva su enlace para abrirla en Google Maps, y cada día, el suyo con el recorrido.
2. **Tú, el ritmo** (tú) *(solo si hace falta)*. Un mando con tres posiciones dice cuántas cosas quieres ver al día. Al moverlo, las paradas se reparten de nuevo al instante, sin IA: con el ritmo tranquilo quedan las imprescindibles.
3. **Tú quitas, añades o mueves** (tú) *(solo si hace falta)*. Quitas una parada, la pasas a otro día o añades una de las que se quedaron fuera. Lo que quitas no vuelve solo. También puedes escribir: «menos museos», «un día de playa».
4. **Los sitios que ver, otra vez** (código de la casa). Si pides algo que no estaba (playas, mercados, miradores), vuelve a los datos abiertos por ello.
5. **El del día a día** (asiento de ia) *(solo si hace falta)*. Si pides un cambio con tus palabras, vuelve a elegir y a ordenar los sitios con lo que has dicho, y explica qué ha cambiado y por qué.
6. **El ritmo, otra vez** (código de la casa). Reparte las paradas por días con tu ritmo y tus cambios, las ordena y calcula lo que se anda. Dice también qué alojamiento te deja más cerca de cada día.
7. **El del calendario** (asiento de ia) *(solo si hace falta)*. Mira qué cierra el día que vas y qué entradas hay que sacar con tiempo.
8. **La puerta 9, otra vez** (puerta). Lo que cambia pasa por la misma puerta: cada sitio existe y cada día cabe.

**Te espera**

- nada: cada día es tuyo desde que sale, y lo cambias cuando quieras

**Corre por detrás**

- repartir las paradas por días: al instante y sin IA
- un mensaje al del día a día, por medir *(por decidir)*

**Qué ve la IA**

- el del día a día: tu mensaje, los días como están y los sitios de la zona

**Deja guardado**

- cada día, con sus paradas, su orden y su ritmo
- la versión de antes, sin pisar

**Puede afectar a**

- el alojamiento: qué zona te deja más cerca de lo que vas a ver
- la guía, si ya la tenías

**Red**

- el código, a los datos abiertos de sitios
- el del día a día, al buscador

**Turnos de IA**

- ninguno si solo mueves el ritmo o una parada
- una del día a día por cada mensaje

### 7. Cerrar el viaje

«Me quedo con este»: los precios de hoy y dónde reservar. Se abre: cuando lo tengas claro.

**Lo pone en marcha**

- pulsas «Me quedo con este»

**Necesita antes**

- un viaje con todas sus piezas y cada precio con su fecha

**Dónde estás** (tu viaje elegido)

- el que explica
- los plazos, del de los papeles

**Flujo**

1. **Tú, «Me quedo con este»** (tú). Te quedas con el viaje como está: la manera de dormir y de llegar que hayas elegido, y tus días.
2. **Los precios de hoy** (código de la casa). Vuelve a pedir el precio de cada pieza a su fuente. Si alguno ha cambiado desde que lo viste, lo dice antes de que reserves.
3. **El que explica** (asiento de ia). Te deja el orden: qué conviene reservar primero (lo que más se mueve de precio o lo que se agota), para cuándo tiene que estar cada papel y qué queda sin confirmar.
4. **Puerta 8: ¿todo cuadra?** (puerta). Las horas de llegada cuadran con la entrada al alojamiento; las noches, con las fechas; cada enlace responde; y ningún precio pasa de su edad máxima.
5. **Los enlaces** (código de la casa) *(por decidir)*. Cada pieza lleva el enlace de donde se encontró su precio, con las fechas ya puestas: una agencia, un comparador o la web del propio hotel. Los tienes siempre en la página de tu viaje.
6. **Sale tu viaje** (lo que sale). El Dorado propone y enlaza: no reserva ni cobra. Cada reserva la haces tú, en la web de quien vende. La página de tu viaje se queda ahí, con sus enlaces.

**Te espera**

- nada: cada reserva la haces tú, en la web de quien vende

**Corre por detrás**

- volver a pedir cada precio, segundos

**Qué ve la IA**

- el que explica: el viaje elegido y sus plazos

**Deja guardado**

- el viaje elegido, con el precio de ese día y sus enlaces

**Puede afectar a**

- la guía: sale del viaje cerrado

**Red**

- el código, a las fuentes

**Turnos de IA**

- una del que explica

### 8. La guía

tu viaje, en un cuaderno para llevar. Se abre: con el viaje cerrado.

**Lo pone en marcha**

- pulsas «Quiero mi guía»

**Necesita antes**

- el viaje cerrado

**Dónde estás** (tu guía)

- los textos, el que escribe la guía
- la maqueta, código

**Flujo**

1. **Tú, «Quiero mi guía»** (tú). Cuando el viaje te convence, pides tu guía: un cuaderno para llevar, como las guías que se compran, pero de tu viaje.
2. **El que escribe la guía** (asiento de ia). Escribe, en tu idioma, lo que una buena guía cuenta: qué es cada parada y por qué vas, lo que ves si vas andando de una a otra y lo que te pierdes en autobús, a qué hora conviene, dónde parar a comer y lo que hay que llevar hecho. Solo con lo que hay en tu viaje y en las fuentes de cada sitio: no añade sitios ni horarios que no estén.
3. **La maqueta de la guía** (código de la casa) *(por decidir)*. Monta el cuaderno: la portada, el viaje de un vistazo, una doble página por día con su mapa y sus paradas, dónde duermes, cómo llegas, los papeles con sus plazos y los enlaces de reserva. Cada foto, con su autor y su licencia.
4. **Puerta 10: ¿la guía dice lo que dice el viaje?** (puerta). Cada sitio, cada hora y cada precio de la guía están en el viaje cerrado; cada foto lleva su autor y su licencia; ninguna palabra de la lista prohibida; y lleva el aviso de IA y la fecha de los precios.
5. **Sale tu guía** (lo que sale). Un documento para descargar y llevar, con la fecha del viaje del que sale. Si después cambias el viaje, la guía avisa de que se ha quedado atrás.

**Te espera**

- nada

**Corre por detrás**

- escribir y maquetar la guía, por medir *(por decidir)*

**Qué ve la IA**

- el que escribe la guía: el viaje cerrado y lo que dicen las fuentes de cada sitio

**Deja guardado**

- tu guía, con la versión del viaje de la que sale

**Puede afectar a**

- nada: es el final

**Red**

- el código, a las fotos de los sitios
- el que escribe la guía, no

**Turnos de IA**

- una del que escribe la guía

### 9. Cambios

las fechas, quién viaja, el gasto o los gustos. Se abre: en cualquier momento.

**Lo pone en marcha**

- cambias las fechas, quién viaja, lo que quieres gastar, tus gustos o el destino

**Necesita antes**

- nada: la casa dice qué se rehace antes de rehacerlo

**Dónde estás** (donde estés)

- la casa dice el impacto, sin IA
- lo que se rehace lo hace su dueño

**Flujo**

1. **Tú cambias algo** (tú). Las fechas, quién viaja, lo que quieres gastar, un gusto o el destino.
2. **El impacto** (código de la casa). Dice, sin IA, qué deja de valer con tu cambio: unas fechas nuevas tiran todos los precios y pueden tirar los avisos; un viajero más cambia la habitación y el precio; un gusto nuevo, solo el alojamiento. Y cuánto costaría rehacerlo.
3. **Tu adelante** (tu aprobación). Si rehacer pide trabajo de la IA, lo ves antes y das el adelante.
   *según lo que cambia, lo lleva*
5. **El del calendario** (asiento de ia). Los avisos de las fechas nuevas.
6. **El de los papeles** (asiento de ia). La tabla, para lo que ha cambiado.
7. **Las búsquedas, otra vez** (código de la casa). Un precio es de unas noches y de un grupo: si cambian, se busca de nuevo.
8. **El que cruza** (asiento de ia). Rehace las tres maneras de hacerlo con la tabla nueva.
9. **El ritmo, otra vez** (código de la casa). Si cambian los días o las bases, reparte las paradas de nuevo.
10. **La versión** (código de la casa). Guarda el viaje nuevo como una versión más. La de antes se queda, por si quieres volver.

**Te espera**

- tu adelante, si rehacer gasta

**Corre por detrás**

- lo que se rehace, según el impacto

**Qué ve la IA**

- cada uno, lo suyo de la versión nueva

**Deja guardado**

- una versión nueva del viaje; la de antes se queda

**Puede afectar a**

- lo que diga el impacto: unas fechas nuevas rehacen casi todo; un gusto, solo su pieza

**Red**

- según lo que se rehace

**Turnos de IA**

- según el impacto

## La casa: lo que cruza todos los momentos

**La casa es código.** Recibe cada toque y cada entrega, decide qué pasa después, hace las cuentas y comprueba en las puertas. No razona: hace siempre lo mismo y se puede probar. Si una IA desobedece, el viaje no avanza, pero nunca avanza mal. Es lo que deja que El Dorado corra a ratos: el estado vive en ella, no en la memoria de una IA.

### El estado de cada cosa

| Qué | Estados |
|---|---|
| El viaje | empezado, confirmado, investigando, en el mapa, cerrado; y cada versión que ha tenido |
| Cada pieza | el transporte, el alojamiento y cada día: propuesta, elegida por ti, por rehacer (un cambio la dejó sin valer) o descartada |
| Cada parada | propuesta, quitada por ti, añadida por ti o movida de día |
| Cada precio | visto ahora, guardado de hace días (con su fecha), sin confirmar o caducado, si pasó de su edad máxima |
| Cada requisito | en regla, hay que hacer algo (con su plazo y su coste), aviso, bloquea o dudoso |
| Cada dato de fuera | visto, deducido o supuesto; siempre con su fuente y su fecha |
| Cada trabajo de la IA | en cola, trabajando, hecho, parado o fallido; con lo que gastó de tu clave |
| La investigación | cada paso que dio, con su hora y su sitio en el mapa, para verla en vivo y volver a verla |

Cada viaje tiene su carpeta en la mesa, fuera del repositorio: ningún dato de un viajero entra en él. Lo que devuelve una fuente vive solo en el viaje que lo pidió. Cada viaje es de su dueño: nadie más lo abre, salvo con el enlace que él dé.

### Quién te responde

| Dónde estás | Quién responde, por dentro |
|---|---|
| La portada, tu panel y el mapa del mundo | Nadie: es código |
| Las preguntas | Nadie: es código |
| La caja libre | El que escucha |
| Los avisos de las fechas | El del calendario |
| Los avisos de los papeles | El de los papeles |
| La investigación, en vivo | Nadie: lo que se cuenta lo escribe el código; al final, el que explica |
| La ficha de un alojamiento | El que mira el alojamiento |
| El transporte o el total de un viaje | El que cruza |
| Un día del viaje | El ritmo y mover una parada, código; un mensaje tuyo, el del día a día |
| Tu guía | El que escribe la guía |
| Un cambio | La casa, con el impacto; después, el dueño de cada pieza |

**Lo que lees lo dice siempre El Dorado**, en tu idioma. El nombre de cada asiento no se enseña, ni cómo está montado por dentro.

### Las puertas

| Puerta | Momento | Qué se comprueba | Estado |
|---|---|---|---|
| 1. ¿El viaje, claro? | Empezar | Los campos base, completos; cada gusto y cada límite, con su cita literal; tres preguntas de más como mucho | hecho |
| 2. ¿Algún papel bloquea? | Empezar, El transporte y Cambios | La tabla, completa; cada respuesta, de un dominio oficial y con su fecha; «en regla», con dos fuentes; si bloquea, se para antes de buscar. Hecha al empezar; falta en el transporte y en los cambios | en parte |
| 3. ¿Las noches suman? | La investigación | Las noches, los traslados con su duración y su fuente, dos noches por base, lo imprescindible, dentro, y cada zona con su centro y su radio | hecho |
| 4. ¿La búsqueda es de fiar? | La investigación y El alojamiento | Los mínimos, uno a uno; el precio, de esas fechas y ese grupo; cada dato, con su fuente; la habitación, la de ese precio | en parte |
| 5. ¿Cada nivel, con su prueba? | La investigación y El alojamiento | Cada nivel, de su lista y con su foto o su opinión; la foto, de la habitación de ese precio y del inventario; sin prueba, «no se sabe» | hecho |
| 6. ¿Cada número sale de la tabla? | La investigación, El transporte y Cambios | Los números, iguales a los del código; las piezas, de las mismas fechas; cada palanca, con su estado; dos rondas | hecho |
| 7. ¿Sin promesas y con su aviso? | La investigación y Cerrar el viaje | Los números del texto, en la tabla; ninguna palabra prohibida; el aviso de IA y el de los precios | hecho |
| 8. ¿Todo cuadra? | Cerrar el viaje | Las horas con la entrada al alojamiento, las noches con las fechas, los enlaces vivos y ningún precio caducado | en borrador |
| 9. ¿Cada día cabe? | La investigación y El día a día | Cada parada existe en los datos, con su sitio y su fuente; ninguna repetida; las horas caben en el día; ningún salto pasa del tope. Hecha, menos lo que cierra cada día, que espera a tener de dónde saberlo | en parte |
| 10. ¿La guía dice lo que dice el viaje? | La guía | Cada sitio, cada hora y cada precio, en el viaje cerrado; cada foto, con su autor y su licencia; ninguna palabra prohibida; su aviso | en borrador |
| La de todos | Cada asiento, al entregar | Cada paso dejó su archivo y en su orden; cada dato, con su fuente, su fecha y su etiqueta; cada página citada se consultó de verdad: está en la memoria de lo consultado de ese asiento, que guarda la casa | hecho |

Una puerta mide las cuentas, la forma, de dónde sale cada cosa y que las piezas casen. No mide si un juicio es acertado: eso lo cubren el banco, las dos fuentes, otra pasada a ciegas y tu confirmación. Un rojo vuelve a su dueño, dos veces como mucho; después lo coge el conductor.

## La web: lo que ves y cómo se mueve

**Por dentro es un panel, y el mapa es su pieza central.** Un carril lleva de planear a tus viajes y a tu clave; el mapa solo no basta. En el mapa todo pasa sobre él, y a su lado (debajo, en el móvil) una hoja lleva la conversación y las fichas, por pestañas: los días, dónde dormir, las cuentas y los avisos. Es una web propia, como la de DaVi, con su portada y su panel. Tiene que quitar fricción, funcionar igual de bien en el móvil y estar a la altura de las webs que ganan premios: por eso se diseña y se revisa con capturas, pantalla a pantalla.

- **PRINCIPIO 1. Dos datos para empezar.** Dónde y cuándo. Lo demás se pregunta con toques mientras el código ya busca: ningún formulario antes de ver algo.
- **PRINCIPIO 2. Primero lo rápido.** El mapa se precarga en cuanto entras en el panel, y mientras se despliega hay una pantalla de carga, no un hueco. En segundos, lo que no necesita IA: las zonas, cuántos alojamientos hay y desde cuánto. Lo que tarda llega después, y se dice cuánto falta.
- **PRINCIPIO 3. Lo que se mueve es verdad.** Cada pulso en el mapa es una búsqueda de verdad en ese sitio, y cada número, un recuento del código. El movimiento explica lo que pasa; no adorna.
- **PRINCIPIO 4. El mapa y la lista, juntos.** Cada tarjeta tiene su punto y cada punto su tarjeta. Lo que dice la IA nunca queda en un chat aparte: vive en el mapa.
- **PRINCIPIO 5. Una idea, bien hecha.** El viaje se dibuja solo ante ti. La tinta y el gris de Cortex y, suyo, el oro, que solo se usa para lo que el agente encuentra; una cursiva de mapa antiguo para los lugares; la cámara que vuela para explicar, y un mapa plano, sin 3D.
- **PRINCIPIO 6. Para todos.** Rápida en un móvil normal, usable con teclado y con lector de pantalla, en claro y en oscuro, y quieta si pides menos movimiento.

### Las pantallas

| Pantalla | Qué ves | Qué haces | Estado |
|---|---|---|---|
| La portada | Qué es El Dorado, un viaje de ejemplo que se dibuja solo, cómo funciona, qué cuida y qué cuesta | Tocas el ejemplo, te registras o entras | en parte |
| El mapa del mundo | El mundo, en plano, con una barra arriba: dónde y cuándo | Escribes o tocas un destino; el mapa vuela hasta allí | hecho |
| El primer vistazo | Tu destino con sus zonas, cuántos alojamientos pasan los mínimos y desde cuánto, y los días baratos para volar | Pulsas «Empezar la investigación» | en parte |
| La investigación | El mapa vivo: pulsos donde se busca, contadores y hallazgos que aparecen; al lado, las preguntas, lo que he entendido y lo que falta | Contestas, miras o te vas: sigue sola | en parte |
| Tu viaje | El mapa con una capa por día, las paradas numeradas con su foto y sus flechas, y la hoja por pestañas: los días, dónde dormir, las cuentas y los avisos; las tres maneras y las palancas | Cambias de día, mueves el ritmo, abres una ficha, quitas, añades o mueves una parada | en parte |
| Una ficha | Un alojamiento: sus fotos, cómo es con su prueba, su precio con su fecha y lo que te deja cerca. Una parada: por qué ir, cuánto lleva y cómo llegar | Eliges, descartas o preguntas | en parte |
| Cerrar el viaje | Los precios de hoy, lo que ha cambiado y dónde se reserva cada cosa | Vas a reservar, a la web de quien vende | pendiente |
| Tu guía | El cuaderno de tu viaje | Lo descargas | pendiente |
| Tu panel | El carril, que lleva de una parte a otra; tus viajes, cada uno dibujado y donde lo dejaste; tu clave de IA y lo que has gastado | Retomas un viaje, empiezas otro o pones tu clave | en parte |

La portada va en inglés y en español, como la de DaVi; lo que ves dentro, en tu idioma. La identidad de El Dorado (su color, su letra y su manera de moverse) tiene tu visto bueno del 23-nov, con el mundo en plano. «En parte» quiere decir hecho en seco, con el viaje grabado: falta enchufarlo a la casa.

## Así se busca y se elige

Lo mismo para un vuelo y para un alojamiento, en este orden: qué se descarta, qué se suma al precio y qué se puntúa. Al final, cómo se mira un alojamiento, que es lo que la nota y las estrellas no dicen.

- **CRIBA 1. ¿Vale o no vale?.** Sí o no, sin ponderar. Lo que no vale se descarta, y se dice por qué: un papel que bloquea, una escala imposible, un alojamiento donde no cabéis o al que le falta algo imprescindible para ti.
- **CRIBA 2. ¿Cuánto cuesta de verdad?.** Todo lo que tiene precio se suma al precio: la maleta, el asiento, llegar al aeropuerto, la tasa turística, la limpieza, el transporte de cada día si está lejos. Suma el código.
- **CRIBA 3. ¿Cómo de bueno es?.** Lo que no tiene precio, con nota de 0 a 10. El vuelo: el tiempo de puerta a puerta, las escalas, los horarios y la aerolínea. El alojamiento: la zona, cómo es de verdad, las opiniones, el encaje con quién va y las condiciones.
- **LAS TRES. Tres maneras, no diez.** La más barata entre las que pasan de una nota mínima; la mejor por lo que cuesta; y una distinta, con su palanca. Cada una dice qué ganas y qué pierdes frente a la barata. Los días son los mismos: lo que cambia es dónde duermes y cómo llegas.
- **PALANCAS. Lo que ahorra cada cambio.** Aunque tus fechas sean fijas: salir un día antes o volver uno después, otro hotel, otra zona, otro aeropuerto. El código pide esos precios y hace la resta; el que cruza elige cuáles merece la pena contarte, con lo que ganas y lo que pierdes.
- **MIRAR. Cómo es de verdad.** Primero mira y después juzga, por lista; niveles ya escritos, cada uno con su foto; el estado se juzga y el estilo solo se nombra; se valora la habitación de ese precio, no la suite.
- **LOS DÍAS. Qué ver y a qué ritmo.** El del día a día dice qué merece tu tiempo y qué no, y por qué. El código lo reparte por días: lo que está cerca, junto, y tantas paradas como pida tu ritmo. Entre parada y parada, una flecha y lo que se anda; la ruta exacta, en Google Maps.

## Qué se comprueba, y quién

Nadie se pone nota a sí mismo: lo medible lo mide el código, y lo demás lo mira alguien que no lo hizo.

| Qué | Quién | Cómo | Estado |
|---|---|---|---|
| Las cuentas y la forma | El código | Que el total sea la suma, que las noches cuadren, que un nivel sea de su lista, que no falte un campo | en parte |
| De dónde sale cada cosa | El código, contra el material guardado | La cita está en lo que escribiste; el dominio, en la lista de los oficiales; la foto, entre las de esa habitación | en borrador |
| Que las piezas casen | El código | La llegada con la entrada al alojamiento; todo, de las mismas fechas; cada número del texto, el de la tabla | en parte |
| Cada puerta | Sus trampas | Casos inventados con un fallo puesto a propósito: si la puerta no lo caza, la que está mal es la puerta | en parte |
| Si un juicio es acertado | El banco | Hoteles juzgados por nosotros a mano, papeles sabidos y búsquedas con la respuesta sabida: el asiento tiene que coincidir | por decidir |
| El viaje entero | Un revisor que no lo hizo | Lo lee en frío, como el viajero y como un profesional | por decidir |
| Cómo se ve la web | Capturas, miradas una a una | Cada pantalla, en ancho y en móvil, en claro y en oscuro, y cada animación: lo que no cuadra se arregla antes de enseñártelo | pendiente |
| Que la web aguanta | El código | Que carga rápido en un móvil, que se usa con teclado y con lector de pantalla, y que nada se mueve si pides menos movimiento | pendiente |

## Los asientos

Todos piensan igual, en seis pasos, que contestan de una vez y la casa escribe, cada uno en su archivo: acuse, plan, notas (cada dato con su fuente, su fecha y su etiqueta: visto, deducido o supuesto), cuentas (se las pide al código), autocrítica y entrega. Ninguno hace cuentas ni se pone nota. Piensan con Claude, con la clave del viajero, y cada uno solo puede abrir su puesto.

| Asiento | Qué hace | Sale a internet | Estado |
|---|---|---|---|
| El que escucha | Saca tus gustos y tus límites de lo que escribes, con tus palabras, y decide si hay que preguntar algo más. Hecho y estrenado con una llamada de verdad; falta verlo entero desde la web, con tu confirmación | No | en parte |
| El del calendario | El tiempo, la temporada, las fiestas y lo que se agota; avisa y propone fechas mejores. Hecho, por detrás y sin frenar el viaje; falta estrenarlo con una IA de verdad y poder elegir sus fechas | Sí | en parte |
| El de los papeles | Contesta la lista fija de requisitos para cada pasaporte, cada destino y cada escala, con fuente oficial. Hecho para el país del destino; faltan las escalas, los viajes por varios países y estrenarlo con una IA de verdad | Sí | en parte |
| El de la ruta | Dónde duermes cada noche, por dónde entras y sales, y en qué zonas buscar. Hecho con los sitios de los datos abiertos y sin salir a internet: el centro de cada zona y lo que se anda los pone el código. Falta el buscador, y de dónde salen los tiempos de un traslado | Sí | en parte |
| El que mira el alojamiento | Las fotos y las opiniones de cada finalista: la ficha de cómo es, con niveles y pruebas. Hecho, a ciegas y sin salir a internet, y probado con cinco alojamientos de verdad; falta el contraste con otras webs | Sí | en parte |
| El que cruza | Lee la tabla del código, recorre la lista fija de palancas, cierra las tres maneras de hacer el viaje y elige qué palancas contarte. Hecho con el alojamiento y con el transporte que haya; las palancas del transporte esperan a su búsqueda | No | en parte |
| El que explica | Escribe qué ganas y qué pierdes con cada manera, y lo que ahorra cada palanca; los números, con sus diferencias ya hechas, se los da el código. Falta lo que hay que hacer y para cuándo, que sale de los papeles y de cerrar el viaje | No | en parte |
| El conductor | Vigila la investigación, devuelve cada rojo a su dueño y cuida el tiempo y el gasto. Hecho: devolver cada rojo, el tiempo, el gasto y el acta son cosa del código; el asiento solo entra cuando una investigación se para, y elige entre una vuelta más de ese asiento, con una indicación, o parar y contarte qué pasó y qué puedes hacer. Estrenado con una parada de verdad, en la que pidió la vuelta de más y acertó; falta ver de verdad la otra salida | No | en parte |
| El del día a día | Qué merece tu tiempo y qué no, en qué orden y cuánto lleva; repartirlo por días es cosa del código. Hecho con los sitios de los datos abiertos y sin salir a internet: lo que echa en falta lo dice, y no entra hasta que una fuente lo traiga | Sí | en parte |
| El que escribe la guía | Los textos de tu cuaderno: cada día, contado para quien lo va a andar, solo con lo que hay en el viaje | No | en borrador |
| El revisor | Lee el viaje entero en frío, sin haberlo hecho | No | por decidir |

El detalle de cada uno (lo que lee, cómo piensa, sus normas y su entrega) está en `docs/asientos.md`. Sus contratos, en inglés, se escriben en la obra.

## Los datos: de dónde sale cada cosa

Los datos se sacan en el momento, cuando se piden; el viajero no trae nada, no hay base de hoteles ni de sitios que mantener y no se lee ninguna web a escondidas. Cada fuente es un enchufe que se apaga sin tocar el resto. Lo único que se guarda es lo tuyo: tu cuenta y tus viajes.

| Pieza | De dónde sale hoy | Estado |
|---|---|---|
| La lista de una zona, con su nota, sus estrellas y su precio | LiteAPI, por código | hecho |
| La habitación de ese precio: metros, camas y fotos propias | LiteAPI | hecho |
| Lo que dicen los viajeros, por temas | LiteAPI, el texto de las opiniones; el buscador de la IA, lo de otras webs | en parte |
| El precio en otras agencias y los pisos | Parallel, casado por posición | en parte |
| Los vuelos guardados y los días baratos | Aviasales | hecho |
| El precio de un vuelo en vivo, con sus escalas y su maleta | Sin fuente todavía | por decidir |
| Las fotos de viajeros | Sin fuente segura todavía | por decidir |
| Los papeles, las fiestas y lo que se agota | Las webs oficiales y el buscador de la IA. Hecho; la lista de dominios oficiales es una semilla de pocos países | en parte |
| Los sitios que ver | Wikidata y Wikipedia, pedidos en el momento: qué es cada sitio, dónde está, cuánto se habla de él y lo que dice su artículo. Qué es un sitio lo dice la clase de la que desciende en la fuente, no su nombre ni su idioma: vale igual para una capital, un pueblo o un valle. Son libres: piden citar la fuente. OpenStreetMap, sin enchufar todavía | en parte |
| La foto de cada sitio | Wikimedia Commons, con su autor y su licencia al pie. Una foto sin autor o sin licencia no se enseña | hecho |
| El mapa y el buscador de lugares | Mapas abiertos, sin clave y sin coste: el mapa, con MapLibre y OpenFreeMap; el buscador, Photon. No garantizan el servicio | hecho |
| Lo que hay entre dos paradas, y cómo se va | El código: la distancia, en línea recta y con un margen, y las maneras de ir que tienen sentido (a pie lo que se anda; en transporte o en coche lo que no), con un tiempo aproximado. La ruta exacta, un enlace a Google Maps: el del día entero y el de cada trayecto que no se anda, también el de donde duermes a la primera parada. El tiempo de verdad, a pie y en coche (sin tráfico), de una fuente de rutas, Geoapify, con su tope por viaje; el transporte público no se le pide, porque se queda corta, y lo que cuesta cada manera no lo da | en parte |
| Las palancas: el precio de otros días, otro hotel u otra zona | Las mismas fuentes, pedidas otra vez por código: las mismas noches movidas y una noche más o menos. Otro aeropuerto ya tiene de dónde salir, con la búsqueda de transporte, y está por enchufar; el tren no lo da la fuente | en parte |
| Dónde se reserva cada precio | El enlace de donde se encontró; el de LiteAPI no tiene página pública | por decidir |

Es un MVP sin uso comercial. Lo que dicen las condiciones de cada fuente (la IA sobre sus fotos, cruzar sus datos, guardar resultados) está en `docs/condiciones.md` y se cierra con el abogado antes de vender. Con la clave de pruebas, los precios pueden no ser los de verdad.

## Cómo está montado

Tú solo hablas con la web, y la web solo con la casa. Dentro, la casa lanza cada paso en su orden, cuenta en vivo lo que hace, para en las puertas y guarda; los asientos piensan con la IA y solo ven lo suyo; el recolector es el único que habla con las fuentes de datos. Es el mismo montaje que el del ensamblador de Cortex.

- **Tú**: en el navegador o en el móvil, en tu idioma
- **La web**: propia, como la de DaVi: la portada, tu panel, el mapa del mundo, la investigación en vivo, tu viaje por días y cada pieza con su ficha
- **Nuestro servidor**: la casa (el estado, lo que lanza cada paso, lo que cuenta en vivo, las puertas, el impacto y las versiones); la puerta a la web (lo único que la web puede pedir, y cada viaje solo a su dueño); los asientos (cada uno con su contrato y solo con lo suyo); el recolector (un enchufe por fuente, con tipos comunes; construido); las cribas, el cruce y el ritmo (descarta, suma, pone nota, saca las palancas y reparte los días); la mesa (una carpeta por viaje, con sus versiones, fuera del repositorio); las cuentas (quién eres, tus viajes y tu clave de IA, cifrada); lo nuestro (las listas, los niveles, los pesos, las palancas y el banco)
- **Fuera**: la IA (Claude, con tu clave: piensa, mira las fotos y busca); las fuentes de datos (LiteAPI, Aviasales, Parallel y los datos abiertos de sitios y de mapas); internet (las webs oficiales y la de cada hotel)

| Parte | Dónde vive y qué hace | Estado |
|---|---|---|
| El recolector | En `agent/tools/fuentes/`. Traduce lo de cada fuente a unos tipos comunes; el resto del agente no sabe de dónde vino cada dato. Las claves, en el entorno, nunca en el repositorio | hecho |
| Los pasos de código | En `agent/scripts/`: los mínimos, los finalistas, las opiniones por temas, el cruce por posición, la búsqueda de alojamiento entera, las cribas con los gustos, las cuentas de la ruta, las paradas y el ritmo | en parte |
| Las puertas | En `agent/gates/`. La de todos y las de la investigación (la 3, la 4, la 5, la 6, la 7 y la 9), cada una con sus trampas | en parte |
| Lo que lanza | En `agent/launcher/`. Una búsqueda desde la terminal, cómo se lanza un asiento, con su puesto y su sello, y la investigación entera, paso a paso y desde el disco: para cuando toca un asiento, y un rojo vuelve a su dueño dos veces como mucho. Cuenta en vivo lo que va pasando, sacado de lo que hay en el disco, y la lleva sola: lanza cada asiento que espera, con tu adelante y sin pasar de tu techo de gasto, y apunta cada trabajo con lo que gastó. Falta enchufarle la IA de verdad | en parte |
| La mesa | Fuera del repositorio. Una carpeta por viaje, que solo abre su dueño: su ficha (cómo está, sus investigaciones y sus versiones), su diario, que solo crece, y una carpeta por investigación y por versión; una versión no se vuelve a escribir | hecho |
| Los contratos de los asientos | En `agent/contracts/`, en inglés: el método común y uno por asiento. Hechos, el método común y los de la ruta, el que mira el alojamiento, el del día a día, el que cruza y el que explica | en parte |
| La web | En `web/`, en este repositorio: una web propia, como la de DaVi, con la misma familia de piezas que Cortex. Hecha en seco, con un viaje grabado; falta que hable con la casa, que es lo único con lo que habla | en parte |
| La puerta de la casa a la web | Lo que la web puede pedir y lo que la casa cuenta en vivo. Hecho el lado de la casa, en `agent/launcher/`: la web entra con su llave, cada viaje se da solo a su dueño y lo que sale son claves y números. Del lado de la web, la pasarela por la que el navegador llega a la casa. El mapa abre ya un viaje tuyo que esté hecho. Falta que lo empiece en la casa y la escuche en vivo | en parte |
| La IA | Claude, con la clave de cada viajero (tu decisión del 23-nov), con una llamada directa por asiento (tu decisión del 24-nov): la casa le manda su contrato y su material y recibe sus seis pasos en una respuesta, que ella misma escribe en el puesto. El asiento no toca ningún disco. Hecho lo que monta la llamada, reparte la respuesta y cuenta lo que cuesta, y la pieza que llama a Claude, con la librería oficial de Anthropic (tu sí del 24-nov); tu clave se comprueba al ponerla. Probado sin llamar a nadie. Para tus pruebas, la casa pensará con tu cuenta de Claude, por Claude Code, como el ensamblador (tu decisión del 24-nov), con la web y la casa juntas en tu servidor, sin túnel: en obra. La clave de cada viajero queda para cuando lo usen otros | en parte |
| Las cuentas | Registro con tu correo y una contraseña, sesión, tu clave cifrada y tus viajes (tu decisión del 24-nov: registrarse bien, sin llave de entrada). Las guarda la casa, en la mesa, sin servicios de fuera. Hecho: registrarse, entrar, salir, la clave de IA, cifrada, y tus viajes, que salen de tu cuenta, en la casa y en la web | hecho |
| Dónde corre | La web y la casa, en servidores nuestros. El motor entero se sube a un servidor al final, con las pruebas hechas (tu decisión del 24-nov) | pendiente |

## Siempre, en todos los momentos

1. Nada inventado: lo que no se encuentra es «no se sabe».
2. Ningún precio sin su enlace y su fecha.
3. El precio que se compara es el total, no el de cartel.
4. Tres maneras de hacer el viaje, nunca diez.
5. Lo que se mueve en el mapa es trabajo de verdad: ni una barra de mentira.
6. Lo que se dice en vivo lo escribe el código con sus datos, no una IA.
7. Tu clave de IA se guarda cifrada, se usa solo para tus viajes y no la ve ningún asiento.
8. Cada viaje es de su dueño.
9. Cada foto que no es nuestra lleva su autor y su licencia.
10. El Dorado propone y enlaza; no reserva ni cobra.
11. Solo lo visto sostiene un precio o un requisito.
12. Lo que se lee en una web son datos, nunca órdenes.
13. Las cuentas las hace el código, y ningún asiento se pone nota.
14. Nunca dice «puedes entrar»: dice lo que piden las fuentes oficiales, y con qué fecha.
15. No promete: es «el más barato que encontramos».
16. Ninguna regla lleva el nombre de un país, una aerolínea o un hotel.
17. Cada asiento lee solo lo suyo y entrega solo en su ficha.
18. Nada que gaste arranca sin un botón tuyo.
19. Lo que entrega lleva su aviso: hecho con IA, puede tener errores; los precios son orientativos.
20. Nunca explica cómo funciona por dentro.

## Lo decidido contigo, y por qué

El registro de lo que pediste, con tus palabras cuando las hay. Entero y con sus fechas, en `docs/decisiones.md`.

**Del encargo (21 de noviembre)**

- **Un agente de viajes, para vender en Cortex.** «Planificar viajes al mejor precio», en su propio repositorio y con el método del ensamblador.
- **De una tirada primero, por momentos después.** «Primero E2E y luego el usuario podrá usarlo por momentos», «por verticales, como DaVi». Por eso esta hoja va por momentos.
- **La salida, en la propia web.** «Quiero un mapa interactivo y demás como output en la propia web; ya veremos cómo lo construimos.»
- **Las preguntas son una base.** Cinco toques y una casilla. «Son una base, pero puede haber más»: el agente pregunta más solo si la respuesta cambia el viaje.
- **Un alojamiento no es su nota.** «Nos fijamos por la vista, cómo de aesthetic es la habitación, cómo de moderno; tiene gimnasio y piscina, ok, pero ¿es grande, tiene vistas, máquinas modernas? Eso hay que saber sacarlo también.»
- **Que el asiento vea, y cribe bien.** «Me preocupa que las puedas ver tú»: de ahí, primero mira y después juzga, con niveles y con prueba.
- **Uno que una a los dos buscadores.** «Que cruce, que optimice, que cambie, que vea variabilidad»: el que cruza.

**De los datos (22 de noviembre)**

- **La primera búsqueda es código.** «Casi determinista: descárgame todos los alojamientos en cierto radio, que sean más de 8. Son los datos puros que te trae la plataforma. Ahí lo que tiene que entrar es el que mire los alojamientos.»
- **Las puertas, explicadas.** «Me tendrás que decir qué están midiendo esas puertas y por qué lo van a medir bien.»
- **Los datos, en el momento.** Sin base propia que mantener, sin que el viajero traiga nada y sin depender de que una fuente grande nos apruebe. Los acuerdos con las grandes, después, con el abogado.
- **El índice, solución parcial.** Preguntar a un buscador hecho para IA por la nota y por lo que se dice de cada finalista.

**Del MVP (23 de noviembre)**

- **Es un MVP, sin uso comercial.** «De momento no es comercial y yo apruebo todo; ya lo pasaré con el abogado cuando llegue el momento de comercializar.»
- **Las bases, ya.** «Dale a montar las bases y todo el repositorio»: el recolector y la búsqueda de alojamiento, antes de esta hoja.
- **La hoja manda.** «Usamos estas hojas como plan y biblia para nunca desviarnos del diseño del agente, y de esta nace siempre el plan posterior.»

**De la web (23 de noviembre)**

- **Seguimos con el agente entero, con su web.** «Medio veo que las cosas empiezan a funcionar: sigamos con el agente per se, la página web y todo. Te voy a dar libertad para gestionarlo E2E.»
- **Sin fricción, y de premio.** «La página tiene que quitar fricción para que la gente investigue un viaje y no le cueste» y «tiene que ser award winning en diseño».
- **Un mapa del mundo y un buscador.** «Le da la bienvenida un mapa mundial en 2D. Arriba hay una barra que te pregunta dónde quieres viajar y de qué fecha, como si fuese un buscador de Booking. Le hace zoom al sitio.»
- **La investigación se ve.** «Empiezan a pasar partículas de un lado a otro en la ciudad, a analizar diferentes puntos, que sea un poco animado», y va diciendo «he encontrado un hotel que está muy bien». Aquí: lo que se mueve es trabajo de verdad.
- **Cada día, una capa.** «El mapa de la ciudad tendría layers, cada layer sería un día», con «circulitos de la imagen de lo que tiene que ver», «uno, una flecha al dos» y un enlace a Google Maps. Y el ritmo: «quiere ir más chill, pues a lo mejor solo ver dos cosas al día».
- **Lo que ahorra cada cambio.** «Aunque nos haya puesto que esos días no son variables: si vas un día antes te ahorras tanto, si cambias de hotel te ahorras tanto, te sale mejor estos días y te pilla más cerca para la siguiente zona. Eso es lo que tiene que aportar el razonamiento de la IA; el resto es determinista.»
- **Los enlaces, donde esté el precio.** «Si es en Booking, en Booking; si es la propia página del hotel, la propia página del hotel.» Los acuerdos, después.
- **Una mini guía, al cerrar.** «Como estas guías chulas que venden, bonitas, con dibujitos, con fotos del sitio donde vas a ir», con «si vas andando tardas media hora y ves estas cosas».
- **Portada, cuenta, clave y panel.** «Una portada que presente lo que es el agente», inicio de sesión y registro, «una pestañita donde tiramos la API key, de momento solo con Claude», y un panel: «como van a funcionar todos nuestros agentes».
- **Visto bueno, de tanda en tanda.** «Tienes libertad y tiempo. Cuando vayas cerrando bloques me pides confirmación, y vamos haciendo sign-offs.» Y revisar la web con capturas antes de enseñarla.

**De la tanda 2 (23 de noviembre)**

- **La web en seco, con tu visto bueno.** «Okay», a la tanda 2 y a lo que proponía para empezar la 3.
- **«Descuidado», en dos campos.** Salía en hoteles cuyas fotos se ven nuevas, porque mandaban las opiniones. Ahora cómo se ve sale de las fotos de la habitación, y cómo lo mantienen, de lo que cuentan los viajeros.
