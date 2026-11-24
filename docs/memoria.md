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
- **Las fotos se encogen** antes de mirarlas, con `sharp`: la única pieza de fuera que lleva el agente.
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
verdad; `sucesos.json` sigue siendo la versión comprimida para volver a verla). Lo siguiente, en este orden y con
una IA de mentira: el conductor (2.5), lo que lanza los asientos sola (2.2) y el lanzador de la IA de verdad (2.7),
sin lanzarlo. Antes de enchufar la IA de verdad y las cuentas hacen falta dos
decisiones del PM: cómo se llama a la IA (una sesión entera, como hoy, o una llamada directa, que toca el método
común) y con qué se guardan las cuentas y dónde corren la web y la casa (11.1). Lo que hay para decidirlas: la casa
del ensamblador, en `aurora-web/ensamblador/` (se leyó el 24-nov): su motor corre en Docker en un servidor, la web
en Vercel le habla por un túnel con una llave, cuenta lo que pasa en vivo por sucesos del servidor, lanza cada
asiento como una sesión de Claude Code confinada a su puesto, la clave del cliente vive solo en la memoria del
motor, y todavía no tiene cuentas. Nada gasta de una clave sin el adelante del PM, y antes de lanzar un asiento con
una clave hay que cerrar lo que la revisión de seguridad dejó en el 2.7: el asiento, confinado a su salida.

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
