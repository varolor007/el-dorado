# Memoria de El Dorado

Al día el 23-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí: las bases, montadas (23-nov), y el encargo, abierto.** El PM decidió ese día que es un MVP sin uso
comercial, que lo aprueba todo y que lo legal de las fuentes lo verá con su abogado antes de vender; y que se montaran
ya las bases, antes de la hoja. Hecho: el recolector, en `agent/` (un enchufe por fuente: LiteAPI, Aviasales y
Parallel; los pasos de la búsqueda de alojamiento, su puerta, el arranque desde la terminal y la mesa fuera del
repositorio), y sus pruebas con el caso inventado, en `tests/`, con la batería en verde (`node tests/bateria.mjs`). La
búsqueda de Lisboa corre de punta a punta, sin IA, en unos veinte segundos. Lo que enseñó la primera prueba y lo que
trae cada fuente, en [datos.md](datos.md); sus condiciones, en [condiciones.md](condiciones.md). Del diseño: la ficha
y las preguntas al viajero, aprobadas ([encargo.md](encargo.md)); el proceso, los asientos, las puertas y cómo se
valora, en borrador, a revisión del PM ([asientos.md](asientos.md), [puertas.md](puertas.md), [oficio.md](oficio.md),
[piezas.md](piezas.md)); el dibujo del run (`paginas/run.html`) es del 21-nov y está por rehacer: aún lleva los dos
buscadores como asientos, y ya son código. Lo siguiente, a decisión del PM: el primer asiento de IA sobre estas bases
(el que mira el alojamiento, con las fotos de la habitación de ese precio y las opiniones), contrastar la nota con el
índice, las cribas con sus pesos, y lo que falta por hablar del viaje (el día a día, los papeles y el calendario ya
tienen su diseño en borrador; los vuelos en vivo no tienen fuente). Y la hoja, que sigue sin hacerse.

## 1. Qué es

El Dorado es el agente de viajes de Cortex, para venderlo a cualquier viajero. Le cuentas a dónde quieres ir, cuándo,
con quién y cuánto quieres gastar, y te propone dos o tres viajes completos, ordenados por su precio total: el
transporte, el alojamiento y el día a día, en un mapa interactivo en la web. Cada precio, con su enlace y su fecha; no
reserva ni paga.

Primero corre de una tirada, de punta a punta. Después, el viajero vuelve por momentos a cada vertical (el transporte,
el alojamiento, el día a día) y la cambia, como en DaVi.

## 2. Cómo se construye

Con el método del ensamblador de Cortex, a mano: las mismas ocho etapas que sigue el ensamblador con cada agente que
crea. Lo que deja cada una aquí:

| Etapa | Qué deja | Dónde |
|---|---|---|
| 1 Encargo | La ficha del encargo y el proceso del PM, en cajas, firmado | [encargo.md](encargo.md) |
| 2 Investigar el oficio | Cómo lo hace un profesional con oficio: dónde busca, qué compara y qué trucos ahorran, cada cosa con su fuente | [oficio.md](oficio.md), en borrador |
| 3 Proponer la hoja | La hoja de El Dorado, el one-pager: sus etapas en columnas, su flujo (asientos, scripts y puertas) y sus filas | `docs/paginas/hoja.html`, publicada |
| 4 Cerrar la hoja | La firma del PM | en el registro |
| 5 Planificar la obra | El plan por bloques: lo común por capas y cada etapa, entera | `docs/plan.md` |
| 6 Construir | La casa, los contratos, las herramientas y la salida, con la forma de la carpeta del ensamblador | `agent/` |
| 7 Ensayar | En seco, sin IA y con un viaje inventado; después, con casos reales y el visto bueno del PM | `tests/` |
| 8 Entregar | La carpeta comprobada y cómo conectarla | la raíz |

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
