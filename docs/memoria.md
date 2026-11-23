# Memoria de El Dorado

Al día el 23-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí: la tanda 2, la web en seco** (el estado, punto a punto, en [plan.md](plan.md)). El 23-nov, con la
tanda 1 hecha, el PM pidió seguir con el agente entero y su web, y contó cómo se imagina el viaje del usuario; dio
libertad para llevarlo de punta a punta, con su visto bueno al final de cada tanda. Con eso se rehicieron las dos
biblias, y las firmó ese mismo día («okay»):

- **La hoja, versión 2**: nueve momentos (la portada y tu panel, empezar, la investigación, el alojamiento, el
  transporte, el día a día, cerrar el viaje, la guía y cambios), una sección nueva con la web (sus principios y sus
  pantallas), el día a día diseñado y la guía.
- **El plan, versión 2**: cuatro bloques nuevos (10, la web; 11, la cuenta y tu panel; 12, la guía; 13, enseñarlo) y
  ocho tandas. En curso, **la tanda 2: la web, en seco** (el 1.5 y el bloque 10), con un viaje de Lisboa ya grabado.
  Lo primero que se le enseña es la identidad de El Dorado, y no se sigue sin su visto bueno a ella.

**Por dónde va la tanda 2** (23-nov). Hechos: la forma del viaje para la web (1.5, `agent/output/viaje.ts`), el
ritmo (4.10, `agent/scripts/ritmo.ts`, adelantado porque la web lo usa), el viaje grabado de Lisboa (10.3,
`agent/scripts/monta_viaje.ts` y `agent/launcher/grabar.ts`), el esqueleto de la web (10.1) y su identidad (10.2),
puesta en las primeras pantallas de `/plan`: el mapa del mundo, el primer vistazo, la investigación en vivo, el viaje
por días y la ficha de un alojamiento. **Está parada en el visto bueno del PM a la identidad**, con un vídeo y doce
capturas en una página suya. Falta de la tanda: las preguntas dentro de la investigación, quitar, añadir y mover
paradas, las fichas de una parada y del transporte, la portada (10.8), el repaso del móvil y de la accesibilidad
(10.9) y la revisión final con capturas (10.10).

Cómo se ve la web: el viaje grabado vive en la mesa (`<mesa>/grabado/viaje.json` y `sucesos.json`), fuera del
repositorio, porque lleva datos de una búsqueda de verdad; si la mesa se pierde, se vuelve a grabar con `grabar.ts`
(hace falta el run con su `como_es.json` y la muestra a mano, `muestra.json`). La web se arranca en `web/` con
`ELDORADO_MESA` puesta (y `NODE_USE_ENV_PROXY=1` en la nube) y se abre en `/plan`. Para mirar una pantalla suelta:
`?at=look`, `?at=live` o `?at=trip`, con `&day=2`, `&stay=3`, `&lang=es` y `&globe=1`. Las fotos de fuera pasan por el
servidor de la web, que las encoge; Wikimedia corta si se le piden muchas seguidas, así que algunas tardan.

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
    `agent/scripts/niveles.ts`; la puerta 5, en `agent/gates/puerta_como_es.ts`, y lo que lo prepara y lo recoge,
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
- **La mesa**: lo que saca cada búsqueda, fuera del repositorio, en `ELDORADO_MESA` o en la carpeta temporal. En la
  nube se pierde al cerrar la sesión.
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
