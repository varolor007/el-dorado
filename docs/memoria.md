# Memoria de El Dorado

Al día el 24-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí: la tanda 4, empezada por sus cimientos (24-nov); las fuentes de rutas, a decisión del PM** (el
estado, punto a punto, en [plan.md](plan.md)). El 23-nov el PM dio el visto bueno a la tanda 2 («okay») y con él
empezó la 3, **el agente hace el viaje**. A media tanda dejó dicho lo que manda sobre todo lo demás: «esto se hace de forma generalista; no adaptes
absolutamente nada para el caso concreto; tiene que servir para cualquier tipo de viaje».

**El punto de situación de la tanda 3** (23-nov). La investigación corre entera, de lo entendido al viaje en el mapa,
y se llevó de punta a punta con un viaje de verdad; ese viaje es el que enseña la web. La lleva
`agent/launcher/investigar.ts`, paso a paso y desde el disco: `empezar <entendido.json>` abre el viaje y su run en la mesa y
`sigue <run>` da los pasos de código que puede hasta que toca esperar a un asiento, para una puerta o está hecho. Los
asientos los lanza a mano quien lleva el run, con la orden de `ordenes/<puesto>.txt`, hasta que exista el lanzador
(2.7). Lo que deja en el run: `sitios.json`, `ruta.json`, `busqueda.json`, `mirar.json` y `como_es.json`, `dias.json`,
`tabla-N.json`, `cruce-N.json`, `explica.json` y, al final, `viaje.json` y `sucesos.json`. Si se para, `parado.json`
dice dónde y por qué, y el run sigue parado hasta que se quita ese archivo.

La página de la revisión, con sus capturas: https://claude.ai/artifact/MUuPbQ6TDhxMkibR8NeViZ.

Al cerrarla, la revisaron tres adversarios que no la hicieron: su informe, hallazgo a hallazgo y con lo que se hizo,
en [revisiones/tanda-3.md](revisiones/tanda-3.md). La batería pasó de 297 pruebas a 394 y, con lo del 24-nov, a 407.
Lo que hay que saber de cómo quedó:

- **Lo que lee el viajero lo dice la web por claves, o lo escribe el que explica y pasa la puerta 7.** Ninguna frase
  de otro asiento llega a la pantalla: ni la ficha de un alojamiento, ni un aviso de la casa.
- **Un run que se retoma no vuelve a juzgar lo que ya juzgó**: lee del disco lo que recogió, con su veredicto.
- **Un viaje no lo sabe hacer todavía, y para y lo dice**: el que pide dormir en más de un sitio (varias bases, o
  sitios a más de un día de donde se duerme).
- **La web desplegada** enseña el viaje grabado que se le dé; uno con una forma de antes no lo enseña (dice que no
  hay viaje). Tras cada cambio de la forma del viaje hay que darle al PM el archivo nuevo.

**Lo que contestó el PM el 24-nov**, y ya está hecho (cada cosa, con sus palabras, en el registro):

- **Cómo se mueve el viajero**: no lo dice él de antemano. De cada trayecto se dicen la distancia y las maneras de
  ir que tienen sentido (`agent/data/moverse.ts`): a pie lo que se anda, y en transporte o en coche lo que no, con
  un tiempo aproximado. Un viaje que no se anda se hace igual. Lo que cuesta cada manera y si la hay pide una fuente
  de rutas, que está por decidir (3.14).
- **Las habitaciones las dice el viajero** (`travellers.rooms` en lo entendido): se pide una ocupación por
  habitación y el precio es el de todas.
- **Lo que no lleva estrellas** se juzga por su nota y sus opiniones.
- **Las quejas graves** las señala el código en las opiniones y las confirma el que mira (`serious` en su entrega).
- **Las fotos se encogen** antes de mirarlas, con `sharp`: una de las dos piezas de fuera que lleva el agente (la
  otra, la librería oficial de Anthropic, que llama a la IA).
- **El 3.5**, el buscador y el lector de webs, va en la tanda 4.

**Lo que no se ha comprobado con un viaje de verdad**, y así se le dijo al PM: un trayecto que no se anda (el viaje
de prueba se anda entero; lo cubren las pruebas y una copia de prueba del viaje), un viaje entero con más de una
habitación (una llamada de verdad a la fuente confirmó cómo responde: una tarifa por habitación, que se suman) y que
el precio del vuelo guardado sea por persona (sale de cómo se pide, no de una llamada hecha ese día).

**El PM dio el visto bueno a la tanda 3 el 24-nov** («ok»), y pidió una cosa antes de la 4 («ok, primero esto»):
mirar qué fuentes hay para las rutas y lo que cuestan, sin contratar nada, y traerle dos o tres opciones (3.14). Está
mirado, solo leyendo (ni un registro ni una llamada), y escrito en [fuentes.md](fuentes.md), con tres opciones: la
que recomienda la sesión es Geoapify (lo que se tarda y si se puede ir, a pie, en coche y en transporte público;
deja guardar; gratis a este tamaño). Lo que cuesta cada manera no lo da ninguna fuente abierta en todo el mundo. **La
elección es del PM, y se le ha pedido.** Antes de construir sobre la que elija hay que probarla con una clave gratis,
que da él por el formulario seguro, en destinos de clases distintas.

**La tanda 4, la casa en vivo y tu cuenta, ha empezado** (24-nov), por lo que no necesita al PM. Hecho: la carpeta
de cada viaje en la mesa, con su estado y sus versiones (1.2, en parte, y 2.1), y lo que la casa cuenta en vivo
(2.6: `agent/launcher/vivo.ts` deja en el run `vivo.jsonl`, sacado de lo que hay en su carpeta, con la hora de
verdad; `sucesos.json` sigue siendo la versión comprimida para volver a verla). Y lo que la lleva sola (2.2:
`agent/launcher/casa.ts`, `llevar(run, fuentes, lanzador)`): lanza cada asiento que espera, apunta cada trabajo en
`trabajos.json` con cómo está y lo que gastó, y no lanza nada sin `adelante.json` (el botón del viajero, con su
techo de gasto) ni por encima de ese techo. Quién piensa en el asiento es el `Lanzador` que se le pasa: en las
pruebas, uno de mentira (`tests/cases/inventado/asientos.ts`). Y la puerta de la casa a la web, por el lado de la casa (2.8:
`agent/launcher/puerta_a_la_web.ts`, `puertaALaWeb(opciones)`): un servidor sin dependencias, con la llave de la
web (`Authorization: Bearer`), la sesión del viajero en la cabecera `x-eldorado-session` y lo que pasa en vivo
por sucesos del servidor (`/viajes/<id>/eventos`). Y las cuentas, por el lado de la casa (11.1 y 11.2:
`agent/launcher/cuentas.ts`): registro con correo y contraseña, sesión y la clave de IA de cada cuenta, cifrada con
el secreto de la casa, que se le pasa a la puerta (`secreto`, 32 bytes; en el entorno, `ELDORADO_SECRETO`). La
casa se arranca con `agent/launcher/arrancar.ts` (`ELDORADO_LLAVE`, `ELDORADO_SECRETO`, `ELDORADO_PUERTO`). En la
web: la pasarela `web/src/app/api/house/` (lo que admite, en `web/src/lib/casa.ts`; pide `ELDORADO_CASA_URL` y la
misma `ELDORADO_LLAVE`), la pantalla de la cuenta (`/account`) y la de la clave (`/key`), ya enchufadas. Sin casa,
la web lo dice y sigue enseñando el viaje grabado. Tus viajes (`/trips`) salen ya de tu cuenta, y el mapa abre uno
tuyo ya hecho con `/plan?trip=<id>`. **Falta en la web**: que el mapa empiece el viaje en la casa (lo entendido sale
de las preguntas de empezar, bloque 5), pulse el botón y escuche en vivo. Para mirar pantallas con un viaje en la
casa local hay un guion en el borrador de la sesión que copia el de prueba a una cuenta inventada.

**Las rutas (3.14): Geoapify, probada** (el PM la eligió para probar primero, 24-nov). Hecho: su enchufe
(`agent/tools/fuentes/geoapify.ts`: `caminoEntre` y `matrizDeCaminos`) y la orden para probarlo
(`agent/launcher/rutas.ts`). Su clave va en la dirección de cada pedido, no en una cabecera: la red de la sesión no
puede ponerla, así que tiene que estar en el entorno como `GEOAPIFY_KEY`; el enchufe cuida de que no salga en
ningún mensaje de fallo. El PM la guardó el 24-nov en los ajustes del entorno de las sesiones con el nombre
`GEOAPIFY`: una sesión se la pasa al enchufe poniendo `GEOAPIFY_KEY="$GEOAPIFY"` delante de la orden, sin
enseñarla. Las variables entran al empezar una sesión, no en la que ya está abierta: la sesión del 24-nov no la
veía, y corrió la prueba desde una sesión auxiliar abierta para eso, que sí la ve y solo devuelve lo que imprime
la orden. **La prueba (24-nov), en once trayectos de clases distintas**: a pie va bien y cuenta con las cuestas; en
coche, la distancia bien y el tiempo sin tráfico; en transporte público se queda corta (horarios de verdad solo en
algunas ciudades, nada del tren entre ciudades, y lo aproximado no es de fiar). Sus conclusiones, en
[fuentes.md](fuentes.md); lo que devolvió, fuera del repositorio. El PM decidió ese día: de momento, lo que se
pueda (Geoapify para andar y para el coche, y el enlace de cada trayecto; Google en vivo no se contrata). **Falta**
que la casa use Geoapify, para andar y para el coche, en las cribas, en el ritmo y en la tabla.

**Las preguntas de empezar (5.1), por el lado del código.** `agent/scripts/empezar.ts`, sin nada de Node para que lo
use también la web: `respuestasDe` (lo que ha dicho quien solo eligió dónde y cuándo) y `entendidoDe(respuestas)`,
que da lo entendido, lo que se supuso con lo más probable (`supuesto`, para enseñárselo al confirmar) y lo que no se
puede suponer y hay que pedir (`falta`: la moneda, la edad de un niño, de qué país es). La moneda se propone por el
país (`agent/data/monedas.ts`). Lo de moverse por un país o una región va en lo entendido (`moving`), lo mira la
puerta 1 y lo lee el que hace la ruta. La caja libre va tal cual a `looking_for` hasta que llegue el que escucha
(5.2). **Y la web (24-nov)**: con la casa conectada, buscar un sitio empieza un viaje de verdad
(`web/src/piezas/Empezar.tsx`: el botón, las preguntas y lo que he entendido; sin techo de gasto, que el PM quitó el
24-nov: cada uno limita su gasto en su cuenta de Claude). El viaje se abre en la casa en cuanto lo entendido está completo y se va guardando; su dirección pasa a
ser `/plan?trip=<id>`, y al volver a ella se retoma (la puerta devuelve lo entendido a su dueño). Al confirmar, la
web va a esa dirección y escucha a la casa en vivo (`web/src/lib/viajeVivo.ts` y `web/src/piezas/EnCasa.tsx`): por
dónde va, lo que se cuenta, lo gastado y, si se para, por qué paso, con su botón de reintentar. El buscador trae el
país del sitio, y «donde estoy ahora» pregunta al buscador abierto con el punto redondeado a dos decimales. **Falta**:
verlo con una investigación de verdad (la casa local no tiene IA y contesta que no la hay); que el código busque
mientras se contesta (5.5); y el visto bueno del PM a las preguntas.

**Para mirar la web en una sesión**: la casa local se arranca de fondo, y la web, solo mientras dura un repaso (un
guion del borrador la levanta, corre las capturas y la cierra). El buscador abierto de lugares falla a ratos: la web
lo intenta dos veces. Y un arreglo del mapa (24-nov): el hueco de la hoja se le da al vuelo como desplazamiento y no
como margen, porque el margen se quedaba puesto y, en el móvil, un país entero ya no cabía y el mapa no se movía.

**La llamada directa (2.7), hecha y sin estrenar.** `agent/launcher/ia.ts` monta lo que se le manda a un asiento
(`peticionDe`), reparte su respuesta en los seis archivos (`escribirSalida`) y cuenta lo que cuesta, con el precio
del entorno (`ELDORADO_PRECIO_ENTRADA` y `ELDORADO_PRECIO_SALIDA`, en dólares por millón);
`lanzadorDirecto(pensar, precio)` es el `Lanzador` de la casa. El método común ya dice contestar de una vez, con cada
paso bajo su marca (`=== 1-acknowledgement.md ===`). Quien piensa de verdad es `agent/launcher/ia_de_verdad.ts`
(`pensarConClaude`), con la librería oficial de Anthropic, la segunda pieza de fuera del agente (el PM, 24-nov: «si
obvio esto metelo»): una llamada por asiento, sin herramientas, con el contrato como instrucciones y el material en
un mensaje. El modelo lo dice el entorno (`ELDORADO_MODELO`), nunca el repositorio, y cuánto se esfuerza, si se
quiere (`ELDORADO_ESFUERZO`). `arrancar.ts` la enchufa si el entorno dice el modelo (`iaDe`), y entonces pide el
precio; sin modelo, la casa arranca sin IA y el botón lo dice. La puerta comprueba cada clave contra la IA antes de
guardarla (`claveQueFunciona`, que pregunta por el modelo y no gasta): `key_rejected` si no sirve, `ai_unreachable`
si no se llega. Si la IA no quiere contestar, la casa para y lo dice; no se cambia sola a otro modelo. **Nada de
esto ha llamado todavía a nadie**: las pruebas usan una librería de mentira. **Falta la primera llamada de verdad**,
que pide dos cosas del PM: la clave de Claude en el entorno, como `ELDORADO_CLAVE_DE_CLAUDE` (no puede ir por el
formulario seguro: la red de la sesión no pone claves en los pedidos a Anthropic), y su adelante, que dijo que da
cuando meta la clave de Geoapify. Se propuso un techo de 5 dólares.

**Cómo se trabaja desde el 24-nov: quien orquesta y las sesiones de obra.** El PM pidió repartir la obra («dale
con esto»): la sesión de siempre orquesta, y cada punto lo construye una sesión de obra, abierta con `create_session`
desde la rama de todos, en su propia rama (`claude/eldorado-<punto>-<nombre>`), con un modelo más barato. Las reglas
de una sesión de obra, además de las de `CLAUDE.md`: solo sube a su rama; no toca la hoja, el plan, la memoria ni
las decisiones (los lleva quien orquesta, para que no choquen); toca lo justo en los archivos que comparten varios
puntos; no gasta nada; todo generalista; mira la web con capturas; y al acabar manda a quien orquesta una nota con
lo hecho, lo decidido, lo que falta, lo probado y lo que no, lo que pide una decisión del PM y el texto que propone
para el plan y la memoria. Quien orquesta: escribe el encargo (dónde está dicho en la hoja y el plan, qué hay ya,
qué hay que hacer y qué queda fuera), revisa lo que traen como alguien que no lo hizo, lo junta
(`git fetch origin <rama> && git merge`), pasa la batería, pone al día las biblias y la memoria en ese commit, y al
PM le pide sus firmas. **Las tres primeras, ya juntas (24-nov)**: la cuenta de la casa (2.9, primera parte,
`claude/eldorado-2-9-cuenta-de-la-casa`), la búsqueda de transporte (4.4, `claude/eldorado-4-4-transporte`) y el
primer vistazo (5.5, `claude/eldorado-5-5-vistazo`). **La segunda tanda (24-nov)**, junta entera: los días baratos del vistazo con los aeropuertos de la búsqueda de transporte
(5.5, `claude/eldorado-5-5-dias-baratos`), que lleva después los tres días a cada lado. Ya junto: el gasto de cada
viaje (11.4, `claude/eldorado-11-4-gasto`): sale de `agent/launcher/gasto.ts` por `GET /cuenta/gasto`, solo a su
dueño; lo enseñan la tarjeta de la pestaña de la clave y una pastilla en Tus viajes. Lo siguiente es la media de
las investigaciones enteras de la cuenta, o no se dice. Para la cuenta de la casa es lo que habría costado con una
clave. Falta decirlo junto al botón de empezar (`useGasto().next`) y verlo con gasto de verdad. Y ya junto también
**el arranque (2.9, segunda parte, `claude/eldorado-2-9-arranque`), sin probar en el servidor**: `agent/arranque/`
(la imagen, `compose.yaml` con el túnel como perfil, `compose.puerta.yaml` con Caddy, `.env.ejemplo`, `casa.sh` con
instalar, actualizar, vercel, estado, registro y parar, y `guia.md` para el PM). La casa sigue escuchando en
127.0.0.1; quien la saca fuera comparte su red, con un vigía que lo vuelve a arrancar si la casa se reinicia. Las
llaves de la casa viven en el volumen `eldorado_datos` y salen en su registro; el secreto, nunca. La puerta solo
deja pasar las rutas de la casa: **una ruta nueva de la puerta hay que añadirla también en el `Caddyfile`** (lo
vigila `tests/code/arranque.test.ts`). En la web, la cabecera de ngrok, `maxDuration` de 300 segundos y 120 para lo
que no es en vivo. El repositorio no tiene `main`: su rama de partida es la de la sesión, y es la que baja el
servidor y la que despliega Vercel. El PM eligió la puerta, por el momento (24-nov). **Pendiente**: que instale con
la guía; lo que hay
que mirar al instalar (que la imagen se construye, que Claude Code piensa con el disco de solo lectura, que Caddy
saca su certificado, que lo de en vivo pasa sin cortes, y si el servidor tiene además el cortafuegos del panel de
Contabo); la copia de la mesa a otro sitio; y que la dirección gratuita (sslip.io) comparte el cupo semanal de
certificados con todo el que la usa: con un subdominio del PM no pasa. **La tercera tanda, en marcha desde el
24-nov**, con su diseño escrito en el encargo: los caminos de verdad en la casa (3.14,
`claude/eldorado-3-14-caminos`: una tabla de caminos por viaje, a pie y en coche, con tope de casillas, que usan las
cribas, el reparto de los días y la web, y que cae a la cuenta de la casa si la fuente falta) y el que escucha (5.2,
`claude/eldorado-5-2-el-que-escucha`: las palabras del viajero aparte, su contrato, la mitad de IA de la puerta 1 y
la investigación esperando su confirmación). **Lo que queda por repartir y pide antes un diseño**: el conductor
(2.5), que coge un rojo cuando su asiento ya lo intentó dos veces; y el buscador y el lector de webs (3.5), con el
del calendario (5.3) y el de los papeles (5.4), que sin herramientas piden que busque la casa.

**La primera llamada con la cuenta del PM, sin hacer todavía (24-nov).** Su token está en el entorno de las
sesiones, y se abrió una sesión auxiliar (session_016R3jET1bkeCb7Q5twPbPWS) con el guion de dos llamadas mínimas,
pero no las lanzó: el sistema de permisos pide que el sí al gasto lo dé el PM en esa misma sesión, y no vale que lo
diga quien orquesta. No se rodeó. Se le ha pedido al PM que la abra y le diga que sí; lo mismo hará falta para la
primera investigación entera, que se lanza con `de_verdad.ts` y el viaje de Madrid a Lisboa.

**El primer vistazo (5.5), hecho a falta de los vuelos** (una sesión de obra, revisada y junta el 24-nov):
`agent/scripts/vistazo.ts` (`primerVistazo`, `paraElVistazo`), su freno en `agent/launcher/freno.ts` y sus números
en `agent/data/vistazo.ts`. La puerta lo da en `POST /vistazo`, sin sesión y con la llave de la web, por la puerta 1
y sin tocar la mesa. En la web, `web/src/lib/vistazo.ts` y `web/src/piezas/PrimerVistazo.tsx`, antes del botón de
un viaje nuevo; el mapa pinta los puntos y un rótulo por zona. La pasarela le dice a la casa quién pide con un
resumen de su dirección, nunca la dirección. Medido con LiteAPI: de 2 a 14 segundos; el primer pedido a un sitio es
el lento, y entonces va a medias y lo dice. Los días baratos, hechos después por otra sesión de obra:
`FuenteTransporte.diasBaratos`, y en `transporte.ts`, `lugaresDelViaje` y `parPrincipal`, que usan la parrilla y el
vistazo; `Fuentes.diasBaratos` ya no existe, y la clave del freno lleva de dónde se sale. **Falta**: que el PM
diga si le valen los números del freno y que el vistazo se vuelva a pedir mientras se contesta; y comprobar en
Vercel que la dirección del visitante es de fiar. Las zonas son trozos de la caja del destino, sin nombre.

**La búsqueda de transporte (4.4), hecha** (una sesión de obra, revisada y junta el 24-nov):
`agent/scripts/transporte.ts` y la fuente `aviasales(carpeta)`, que trae también sus lugares (aeropuertos, ciudades y
rutas, bajados una vez al día a `<mesa>/fuentes/`) y la semana de alrededor. Los topes, en
`agent/data/transporte.ts`. `Fuentes.vuelos` pasó a `Fuentes.transporte`. Lo entendido lleva, si se sabe, el punto
de donde se sale (`origin.centre`, a una décima de grado; la puerta 1 rechaza uno más fino). En `busqueda.json`,
`transporte` es la parrilla entera y `vuelos`, lo de las fechas del viaje. **Con fechas fijas casi nunca hay precio
guardado**, y el viaje sale sin transporte. El PM decidió el 24-nov que siempre se ofrezcan tres días a cada lado,
aunque las fechas sean fijas («puede ser clave»), y está hecho y junto: la semana de alrededor se pide siempre
(`DIAS_ALREDEDOR` es 3; la fuente los da con una petición por par), la palanca de mover los días va de tres antes a
tres después, y sin precio para las fechas el viaje ofrece el de un día de al lado (`transporteAlLado`), sin
sumarlo a nada. `dates.flexible` ya no decide nada en el código: se sigue preguntando porque lo usará el del
calendario (5.3), que propone otras fechas solo a quien puede moverlas. De dónde sale el precio en vivo (3.7) sigue
por decidir. Sin hacer: el tren (la fuente no lo da), las cribas del
vuelo, las palancas «otro aeropuerto» y «entrar por un sitio y salir por otro» (la parrilla ya tiene lo que
necesitan) y la ficha del transporte en la web. Al retomar: mirar con `list_sessions` (las hijas) cómo van, y leer sus
notas.

**La cuenta de la casa (2.9, primera parte), hecha y sin estrenar** (una sesión de obra, revisada y junta el
24-nov). `pensarConClaudeCode({ con, token, binario?, entorno? })`, en `agent/launcher/ia_de_claude_code.ts`, lanza
`claude -p` con la entrada y la salida en `stream-json`, `--verbose`, `--system-prompt-file` (el contrato),
`--model`, `--effort` si se dice, `--tools ""`, `--no-session-persistence`, `--safe-mode`, `--strict-mcp-config`,
`--restricted` y `--disable-slash-commands`, en una carpeta vacía y con un HOME propio y vacío. De la máquina solo le
pasan PATH, lo de la red (proxy y certificados) y el token, que la casa lee como `ELDORADO_TOKEN_DE_CLAUDE` y le da
como `CLAUDE_CODE_OAUTH_TOKEN`. El gasto es el `total_cost_usd` que dice Claude Code: con la cuenta de la casa no
hace falta precio. `iaDe` (en `arrancar.ts`): con `ELDORADO_CORREOS_DE_LA_CASA` hace falta ese token (y
`ELDORADO_CLAUDE` si el programa no se llama `claude`); las claves de viajeros, solo si el entorno dice el precio.
La puerta dice con qué piensa cada cuenta (`account.thinks_with`: `house`, `key` o nada) y `/empezar` no pide clave
a una cuenta de la casa. `de_verdad.ts` piensa con la cuenta si está el token y, si no, con una clave; su techo es
opcional. **Sin comprobar hasta la primera llamada de verdad**: la forma exacta de la entrada con fotos y de la
salida, el texto que da cuando se acaba el límite o el token no vale, y que Claude Code funcione con un HOME vacío.
**La llamada mínima de prueba**, cuando haya token (gasta de la cuenta del PM, que ya dio su sí), desde la raíz:
`ELDORADO_TOKEN_DE_CLAUDE=<token> ELDORADO_MODELO=<modelo> node -e '...'` importando `pensarConClaudeCode` y
pidiéndole una palabra, primero solo con texto y después con una foto pequeña. Lo que el PM tiene por decidir de
esta pieza: si la casa admite a la vez claves de otros (hoy, solo si se le da precio) y qué pasa con un viaje suyo
cuando su cuenta agota el límite (hoy para y lo dice).

**El PM no va a meter su clave: quiere usar su cuenta de Claude, y todo en su servidor (24-nov, 2.9, en obra).** El
túnel de abajo ya no hace falta: dijo «todo en el servidor directamente», así que la web y la casa van juntas en
Docker y se hablan por dentro, y de fuera solo se llega a la web, con su dirección y su candado. Después precisó:
el servidor es el del ensamblador, y la web se queda en Vercel («¿no vale con Vercel?»). Con eso la casa va sola en
el servidor, y falta su decisión de cómo llega Vercel a ella: una puerta con candado (dirección gratuita con HTTPS y
el puerto 443 abierto, solo para la llave de la web; es lo que recomienda la sesión) o un túnel como el del
ensamblador (pide otra dirección de ngrok). **Las pruebas con su cuenta tienen su sí** («en cuanto tires de mi
cuenta, no de mi API, puedes empezar a hacer pruebas»): hace falta su token (`claude setup-token`), que la casa lee
como `ELDORADO_TOKEN_DE_CLAUDE` y pasa a Claude Code como `CLAUDE_CODE_OAUTH_TOKEN`; para empezar antes de tener el
servidor, puede ponerlo él en el entorno de las sesiones con ese nombre, y se prueba desde una sesión auxiliar. El
acceso de la propia sesión en la nube NO se usa para el agente, y a Claude Code se le pasa un entorno limpio (en la
nube, las variables de la sesión lo engancharían a ella). Lo de si DaVi usa ngrok no se pudo confirmar. Como
el ensamblador (`aurora-web/ensamblador/arranque/`: su `README.md`, `Dockerfile` y `compose.yaml` son la guía): la
casa en Docker, en su ordenador o en su servidor, con Claude Code y el token de su suscripción
(`CLAUDE_CODE_OAUTH_TOKEN`, de `claude setup-token`) en un `.env` que no sale de su máquina; el túnel, otro servicio
con la misma imagen y la red de la casa (`ngrok http 127.0.0.1:4320 --url <su dirección fija>`); y en Vercel,
`ELDORADO_CASA_URL` con esa dirección y `ELDORADO_LLAVE`. Lo que falta construir: (1) quien piensa con Claude Code:
otro `Pensar` al lado de `pensarConClaude`, que lanza `claude -p` de una vuelta y sin herramientas (`--tools ""`,
`--max-turns 1`, `--system-prompt` con el contrato, `--output-format json` o `stream-json`, `--model`, `--effort`,
`--safe-mode`, `--strict-mcp-config`, `--restricted`; las fotos piden la entrada en `stream-json`) y lee su
respuesta, cómo acabó y lo que dice que costó; el ensamblador lo lanza en `ensamblador/herramientas/conexion.ts`,
con herramientas de archivos, y aquí no hacen falta. (2) Que la puerta sepa con qué cuenta piensa cada viaje: la de
la casa, solo para los correos que diga su entorno, o la clave del viajero; y que la web no pida clave a quien usa
la de la casa. (3) `agent/arranque/` o parecido: la imagen, los dos servicios, el `.env` de ejemplo y la guía paso a
paso para el PM. (4) En la pasarela de la web, la cabecera que salta el aviso de ngrok y el tiempo largo del
directo en Vercel. Del PM: Docker, una cuenta gratuita de ngrok con su dirección fija, y su token. **El PM preguntó
también si lo que queda lo puede hacer ya un modelo más barato, o si esta sesión reparte el trabajo entre sesiones
de ese modelo**: se le contestó, y está por decidir.

**Cómo se lanza una investigación de verdad con una clave**, si alguna vez hace falta: con la orden
`agent/launcher/de_verdad.ts <entendido.json> <techo>`, que lleva el run de una vez con la llamada directa, cuenta lo
que pasa y acaba diciendo lo que tardó y lo que gastó cada asiento. Delante van `ELDORADO_CLAVE_DE_CLAUDE`,
`ELDORADO_MODELO`, `ELDORADO_PRECIO_ENTRADA`, `ELDORADO_PRECIO_SALIDA`, `ELDORADO_MESA` y `NODE_USE_ENV_PROXY=1`. El
modelo y sus precios se le preguntan al PM y se dicen en la orden, nunca en el repositorio. Lo entendido de la
prueba es un archivo fuera del repositorio (el del viaje de la tanda 3 se perdió con su sesión si esta es otra: se
vuelve a escribir, o se saca de la web con las preguntas de empezar). Tiene que correr en una sesión que vea la
clave: una nueva, o una auxiliar abierta para eso, como la de la prueba de Geoapify. El viaje que salga se graba
para la web con `grabar.ts`.

**Lo que decidió el PM el 24-nov, después**: la IA se llama con una llamada directa por asiento («lo de la llamada
directa me parece bien»); uno se registra bien, con su cuenta, sin llave de entrada («pon que se pueda registrar
bien ya de la que estás y listo»); y el motor se sube a un servidor al final, con las pruebas hechas. Para el
montaje sirve de guía la casa del ensamblador, en `aurora-web/ensamblador/` (se leyó el 24-nov): su motor corre en
Docker en un servidor y la web en Vercel le habla por un túnel con una llave. Nada gasta de una clave sin el adelante
del PM. Lo que la revisión de seguridad dejó en el 2.7 queda cerrado con la llamada directa: el asiento no toca
ningún disco, solo contesta. Lo siguiente: la prueba de Geoapify, la primera investigación de verdad, el mapa
empezando el viaje en la casa (bloque 5) y el conductor (2.5).

El 23-nov, antes, con la tanda 1 hecha, el PM pidió seguir con el agente entero y su web, y contó cómo se imagina el
viaje del usuario; dio libertad para llevarlo de punta a punta, con su visto bueno al final de cada tanda. Con eso se
rehicieron las dos biblias, y las firmó ese mismo día («okay»):

- **La hoja, versión 2**: nueve momentos (la portada y tu panel, empezar, la investigación, el alojamiento, el
  transporte, el día a día, cerrar el viaje, la guía y cambios), una sección nueva con la web (sus principios y sus
  pantallas), el día a día diseñado y la guía.
- **El plan, versión 2**: cuatro bloques nuevos (10, la web; 11, la cuenta y tu panel; 12, la guía; 13, enseñarlo) y
  ocho tandas.

**El punto de situación de la tanda 2** (23-nov). La web, en seco, está hecha y desplegada por el PM en Vercel. Dio
su visto bueno a la identidad, eligió el mundo en plano y pidió el mapa precargado, una pantalla de carga y que por
dentro sea un panel («el mapa solo no vale»). Hecho, con el viaje de Lisboa grabado: la forma del viaje (1.5), el
ritmo con lo que el viajero cambia a mano (4.10), el viaje grabado (10.3) y todo el bloque 10 menos la ficha del
transporte y el precio en la portada: el esqueleto, la identidad, el mapa con su pantalla de carga, la investigación
con sus preguntas, el viaje por pestañas, las fichas, la portada, el repaso del móvil y de la accesibilidad y la
revisión con capturas. Y, adelantado, el panel en seco: el carril, tus viajes (11.3) y la pantalla de la clave (11.2),
con su campo apagado. Las direcciones: `/` la portada, `/plan` el mapa, `/trips` tus viajes y `/key` la clave. La
página de la revisión, con su vídeo y sus capturas: https://claude.ai/artifact/12YETqmymoYMjmMVnWd41r.

Cómo se ve la web: el viaje grabado vive en la mesa (`<mesa>/grabado/viaje.json` y `sucesos.json`), fuera del
repositorio, porque lleva datos de una búsqueda de verdad; si la mesa se pierde, se vuelve a grabar con `grabar.ts`
(hace falta el run con su `como_es.json` y la muestra a mano, `muestra.json`). La web se arranca en `web/` con
`ELDORADO_MESA` puesta (y `NODE_USE_ENV_PROXY=1` en la nube) y se abre en `/plan`. Para mirar una pantalla suelta:
`?at=look`, `?at=live` o `?at=trip`, con `&day=2`, `&tab=stay`, `&stay=3` y `&lang=es`. Las fotos de fuera pasan por el
servidor de la web, que las encoge; Wikimedia corta si se le piden muchas seguidas, así que algunas tardan.

La web, desplegada (23-nov): el PM la pone en Vercel, en su equipo Aurora, desde la rama de la sesión y con `web` de
carpeta raíz; cada subida la vuelve a desplegar. Allí no hay mesa: el viaje grabado se le da en un archivo
(`grabado.json`, con el viaje y sus sucesos) que él sube a un sitio privado, y su dirección va en la variable
`ELDORADO_GRABADO_URL`. Sin ella, la web enseña solo el mapa del mundo y el buscador. En la sesión de la nube, compilar
para producción falla al bajar las letras de Google por el proxy; en Vercel no. Para comprobar aquí el resto de la
compilación se le da a Next una hoja de letras de prueba con `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`.

Lo que se miró antes de rehacerlas, para no repetirlo: `aurora-web` no tiene cuentas, ni pago, ni páginas por agente;
DaVi vive en su propia web (portada con precios y lista de espera, entrada aparte, y la IA con la clave de cada
uno); el ensamblador corre con una web que solo habla con su motor y lo escucha en vivo. El mapa abierto (MapLibre
con OpenFreeMap) y el buscador (Photon) no piden clave; los sitios salen de Wikidata, Wikipedia y OpenStreetMap, y
sus fotos, de Wikimedia Commons, con autor y licencia.

Las tandas hechas:

- **Tanda 1, el primer asiento de IA** (23-nov):
  - 2.4, el método común: su contrato, en inglés, en `agent/contracts/common/`, y la puerta de todos
    (`agent/gates/puerta_metodo.ts`).
  - 2.3, cómo se lanza un asiento: `agent/launcher/puesto.ts` y `asiento.ts`.
  - 3.6, las fotos: `agent/tools/fotos.ts`.
  - 4.2, el que mira el alojamiento: su contrato, en `agent/contracts/lodging-viewer/`; sus niveles, en
    `agent/data/niveles.ts`; la puerta 5, en `agent/gates/puerta_como_es.ts`, y lo que lo prepara y lo recoge,
    `agent/launcher/mirar.ts`.

**El punto de situación de la tanda 1.** Se probó con los cinco finalistas de Lisboa, dos pasadas a ciegas por
alojamiento, lanzadas a mano por la sesión: diez fichas, las dos puertas en verde en las diez, y las dos pasadas
coinciden en 38 de 40 campos. Cada asiento tardó unos catorce minutos. La página para que el PM lo compare con sus
ojos, en https://claude.ai/artifact/G2ATff6Kp9J9fq4hVn7xpE (sus fotos y sus fichas son datos de una búsqueda: viven en
la mesa y en esa página, no aquí). Lo que enseñó, en [datos.md](datos.md). Deja tres decisiones del PM, en el
registro: si «descuidado» se parte en dos campos (cómo se ve y cómo lo mantienen), cómo se abarata la mirada (encoger
las fotos) y con quién piensa cada asiento en el producto. Lo tercero ya está decidido: Claude, con la clave de cada
viajero. Las otras dos van en el punto 4.11, en la tanda 3.

Lo de antes: el 23-nov quedaron hechas las bases (el recolector, con un enchufe por fuente, y la búsqueda de
alojamiento, con su puerta y sus pruebas: Lisboa corre de punta a punta, sin IA, en unos veinte segundos) y las dos
biblias, versión 1. Lo que el PM decidió ese día: es un MVP sin uso comercial, lo aprueba todo y lo legal de las
fuentes lo verá con su abogado antes de vender. Los borradores de antes ([asientos.md](asientos.md),
[puertas.md](puertas.md), [oficio.md](oficio.md) y [piezas.md](piezas.md)) quedan como detalle: donde digan otra cosa,
manda la hoja. Lo que trae cada fuente y lo que enseñaron las pruebas, en [datos.md](datos.md); sus condiciones, en
[condiciones.md](condiciones.md).

## 1. Qué es

El Dorado es el agente de viajes de Cortex, para venderlo a cualquier viajero. Buscas a dónde quieres ir en un mapa
del mundo, das tus fechas, pulsas un botón y ves cómo se investiga tu viaje en vivo, hasta que queda dibujado en el
mapa: cada día en su capa, con sus paradas; dónde duermes y cómo llegas, de tres maneras, y lo que ahorras con cada
cambio. Cada precio, con su enlace y su fecha; no reserva ni paga. Al cerrarlo, te llevas sus enlaces de reserva y
una guía. Tiene su propia web, con su portada y su panel, y la IA la pone cada viajero, con su clave.

Primero corre de una tirada, de punta a punta. Después, el viajero vuelve por momentos a cada vertical (el transporte,
el alojamiento, el día a día) y la cambia, como en DaVi.

## 2. Las dos biblias

| Biblia | Qué dice | Página publicada | En el repositorio |
|---|---|---|---|
| La hoja | Qué es El Dorado: sus nueve momentos en columnas, las mismas filas en todos, el flujo con una caja por paso, la casa, las puertas, los asientos, los datos y lo decidido. En violeta, lo que está por decidir; marcado, lo ya hecho | https://claude.ai/artifact/D67ow4BecJge9aiZYCSS73 | [hoja.md](hoja.md), de `paginas/hoja.datos.mjs` |
| El plan | Cómo se construye: catorce bloques, cada punto con su estado, las ocho tandas (el orden y dónde va el visto bueno del PM) y cada caja de la hoja en su punto | https://claude.ai/artifact/UKjEhSMnxTU5bj9Eeddy6t | [plan.md](plan.md), de `paginas/plan.datos.mjs` |

Las dos se escriben en sus datos y se pintan con `node docs/paginas/pinta.mjs`: de ahí salen la página, que se publica
en su misma dirección, y el texto. No se editan a mano, y la batería avisa si se quedan atrás. El formato
(`paginas/formato.css` y `formato.js`) es el de las hojas de Cortex: el mismo de la hoja de DaVi y de la del
ensamblador, que el PM dio de referencia; de ellas se toma la forma, nada de su contenido.

El método es el del ensamblador de Cortex (encargo, oficio, hoja, firma, plan, obra, ensayo y entrega), a mano. Aquí
se adelantaron las bases a la hoja, por decisión del PM del 23-nov.

## 3. Dónde vive cada cosa

- **Este repositorio**: `varolor007/el-dorado`. Cada sesión trabaja en su rama (`claude/...`). Su mapa, en
  [MAP.md](../MAP.md): el agente, en `agent/`; sus pruebas, en `tests/`, y los documentos, aquí.
- **El recolector**: `agent/tools/fuentes/`, un enchufe por fuente, que traduce lo suyo a unos tipos comunes
  (`tipos.ts`); el resto del agente no sabe de dónde vino cada dato. Una fuente se apaga con `ELDORADO_APAGAR`.
- **Las claves de las fuentes**: nunca en el repositorio. En las sesiones de la nube están en el entorno del PM, que
  las dio por el formulario seguro, y su proxy las pone solo (por eso la búsqueda se lanza con `NODE_USE_ENV_PROXY=1`);
  en otra máquina, en las variables `LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN` y `PARALLEL_API_KEY`.
- **La mesa**: fuera del repositorio, en `ELDORADO_MESA` o en la carpeta temporal. En la nube se pierde al cerrar la
  sesión. Cada viaje tiene su carpeta, `viajes/<id>/`, y solo la abre su dueño (`agent/launcher/mesa.ts`):
  `ficha.json` (de quién es, cómo está, sus runs y sus versiones), `entendido.json`, `diario.jsonl` (solo crece),
  `runs/<n>/` (cada investigación, con lo que deja cada paso: `agent/data/pasos.ts`) y `versiones/<n>/` (cada
  versión, que no se vuelve a escribir). Por dónde va un run se lee de su carpeta: `agent/launcher/pasos.ts`. Los
  runs de antes del 24-nov son carpetas sueltas en la mesa, y siguen valiendo.
- **El puesto de un asiento**: una carpeta dentro del run, en la mesa, con `contract/` (el método común y el contrato
  de su asiento), `in/` (solo lo que puede leer) y `out/` (lo único que escribe). El sello de lo que se le dio queda
  fuera del puesto, en `sellos/`. Quién piensa en el asiento es un lanzador que se le pasa a la casa: en las pruebas,
  uno inventado; en la tanda 1, la sesión de trabajo, a mano; el del producto, cuando el PM decida con qué IA.
- **El método**: en `varolor007/aurora-web`, que desde aquí solo se lee. La hoja del ensamblador
  (`docs/ensamblador/hoja.md`) dice las etapas, las filas, los dos tipos de agente, sus partes como un programa y cómo
  sale el plan de obra; la carpeta que entrega, en `docs/ensamblador/planos/carpeta.md`. Cortex, en
  `cognitive/src/app/cortex/`.
- **Las páginas publicadas**: su fuente, en `docs/paginas/`. Se cambian ahí y se publican en su misma dirección. Son
  fragmentos sin `<!doctype>`: el publicador les pone el esqueleto. Sus colores y sus tipos, los de Cortex.
- **Los datos de los viajeros**: nunca en el repositorio.

## 4. Cómo se retoma

1. Leer el `CLAUDE.md` y esta memoria, por su «Estamos aquí».
2. Trabajar en la rama de la sesión; mirar antes si otra rama `claude/...` va por delante.
3. `npm install` y la batería (`node tests/bateria.mjs`): tiene que salir en verde antes de tocar nada.
4. Para ver una búsqueda de verdad: la orden del `README.md`, con `NODE_USE_ENV_PROXY=1` delante en la nube. Para
   mirar sus finalistas: `mirar.ts preparar`, lanzar cada asiento con su orden (un asiento por puesto, que lea su
   `contract/README.md` y escriba solo en su `out/`) y `mirar.ts recoger`.
5. Si hace falta el método, leer la hoja del ensamblador en `aurora-web`.
6. Antes de lanzar algo nuevo que gaste (otra fuente de pago, un run del agente), el visto bueno del PM.
