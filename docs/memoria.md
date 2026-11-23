# Memoria de El Dorado

Al día el 23-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí: la tanda 1, el primer asiento de IA** (el estado, punto a punto, en [plan.md](plan.md)). La hoja y el
plan, firmados por el PM el 23-nov. El
23-nov quedaron hechas las bases (el recolector, con un enchufe por fuente, y la búsqueda de alojamiento, con su
puerta y sus pruebas: Lisboa corre de punta a punta, sin IA, en unos veinte segundos) y las dos biblias, versión 1: la
hoja ([hoja.md](hoja.md)), con el formato de las hojas de Cortex, por momentos, y el plan ([plan.md](plan.md)), que
sale de ella. Con su firma empieza la primera tanda: el primer asiento de IA, el que mira el alojamiento (2.3, 2.4,
3.6 y 4.2), probado con los finalistas de Lisboa. Lo que el PM decidió ese día: es un MVP sin uso comercial, lo
aprueba todo y lo legal de las fuentes lo verá con su abogado antes de vender. Los borradores de antes
([asientos.md](asientos.md), [puertas.md](puertas.md), [oficio.md](oficio.md) y [piezas.md](piezas.md)) quedan como
detalle: donde digan otra cosa, manda la hoja. Lo que trae cada fuente y lo que enseñó la primera prueba, en
[datos.md](datos.md); sus condiciones, en [condiciones.md](condiciones.md).

## 1. Qué es

El Dorado es el agente de viajes de Cortex, para venderlo a cualquier viajero. Le cuentas a dónde quieres ir, cuándo,
con quién y cuánto quieres gastar, y te propone dos o tres viajes completos, ordenados por su precio total: el
transporte, el alojamiento y el día a día, en un mapa interactivo en la web. Cada precio, con su enlace y su fecha; no
reserva ni paga.

Primero corre de una tirada, de punta a punta. Después, el viajero vuelve por momentos a cada vertical (el transporte,
el alojamiento, el día a día) y la cambia, como en DaVi.

## 2. Las dos biblias

| Biblia | Qué dice | Página publicada | En el repositorio |
|---|---|---|---|
| La hoja | Qué es El Dorado: sus ocho momentos en columnas, las mismas filas en todos, el flujo con una caja por paso, la casa, las puertas, los asientos, los datos y lo decidido. En violeta, lo que está por decidir; marcado, lo ya hecho | https://claude.ai/artifact/D67ow4BecJge9aiZYCSS73 | [hoja.md](hoja.md), de `paginas/hoja.datos.mjs` |
| El plan | Cómo se construye: diez bloques en orden, cada punto con su estado, las tandas y cada caja de la hoja en su punto | https://claude.ai/artifact/UKjEhSMnxTU5bj9Eeddy6t | [plan.md](plan.md), de `paginas/plan.datos.mjs` |

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
4. Para ver una búsqueda de verdad: la orden del `README.md`, con `NODE_USE_ENV_PROXY=1` delante en la nube.
5. Si hace falta el método, leer la hoja del ensamblador en `aurora-web`.
6. Antes de lanzar algo nuevo que gaste (otra fuente de pago, un run del agente), el visto bueno del PM.
