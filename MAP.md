# El mapa: dónde va cada cosa

El repositorio lleva la forma de la carpeta que entrega el ensamblador de Cortex: lo que lee y usa el agente, en
`agent/`; lo que comprueba que funciona, en `tests/`, y lo que lee quien lo construye, en `docs/`. Los nombres de las
carpetas, en inglés; lo de dentro, en español. Cada carpeta nueva entra aquí: la prueba del repositorio lo comprueba.

| Carpeta | Qué va | Estado |
|---|---|---|
| `agent/tools/fuentes/` | El recolector: la salida a internet, los tipos comunes y un enchufe por fuente de datos (LiteAPI, Aviasales y Parallel). Cada enchufe se apaga sin tocar lo demás | Las bases, del 23-nov |
| `agent/tools/` | Las herramientas que no son una fuente. Las fotos (`fotos.ts`): cuáles se le pasan al asiento que mira, con su tope, y cómo se bajan. Las distancias (`distancias.ts`): lo que se anda entre dos sitios y los minutos que lleva. Los sitios que ver (`sitios.ts`): lo que hay en una caja del mapa, de datos abiertos, con su foto, su autor y su licencia | Los sitios, con el punto 3.10 |
| `agent/scripts/` | Los pasos que hace el código, sin IA: los mínimos, los finalistas, las opiniones por temas, el cruce entre fuentes y la búsqueda de alojamiento entera. Y lo del que mira: el material que se le da a ciegas (`para_mirar.ts`) y la comparación de dos pasadas (`acuerdo.ts`). Y lo del viaje: la forma de lo que deja cada paso (`formas.ts`), las cuentas de la ruta (`ruta.ts`: los días, el centro de cada zona y lo que se anda), las paradas que salen de lo que elige el del día a día (`dias.ts`), el ritmo, que reparte las paradas por días (`ritmo.ts`), y lo que monta el viaje para la web (`monta_viaje.ts`) | El ritmo y el viaje, con la tanda 2 |
| `agent/data/` | Lo nuestro, en datos: los niveles de la ficha de cómo es (`niveles.ts`), los gustos y qué niveles los cumplen (`gustos.ts`), las cribas con sus pesos de partida (`cribas.ts`), lo que puede medir una zona de la ruta (`ruta.ts`), los topes de un día (`dias.ts`), la lista fija de palancas (`palancas.ts`), las palabras prohibidas y los avisos de siempre (`palabras.ts`) y las preguntas de los papeles con sus dominios oficiales (`papeles.ts`). Son de partida: se ajustan con casos reales | Con el punto 1.4 |
| `agent/contracts/common/` | El método común de los asientos, en inglés: el orden de lectura, los seis pasos, las diez normas de todos, cómo se entrega y la orden que abre un asiento | Hecho, con el punto 2.4 |
| `agent/contracts/lodging-viewer/` | El contrato del que mira el alojamiento, en inglés: qué recibe y qué no ve, su guía paso a paso, sus seis normas y su entrega, campo a campo y nivel a nivel | Hecho, con el punto 4.2 |
| `agent/contracts/route-planner/` | El contrato del asiento de la ruta, en inglés: qué recibe y qué no ve, su guía paso a paso, sus siete normas y su entrega | Hecho, con el punto 4.5 |
| `agent/contracts/sights-picker/` | El contrato del asiento del día a día, que elige los sitios, en inglés: qué recibe y qué no ve, su guía, sus siete normas y su entrega | Hecho, con el punto 4.9 |
| `agent/gates/` | Las puertas: lo que el código comprueba desde fuera. La de la búsqueda de alojamiento (la 4), la de todos, que mira el método de cualquier asiento, la de cómo es (la 5), que mira que cada nivel tenga su prueba, la de la ruta (la 3), que mira que las noches sumen y que cada zona tenga su centro, y la del día a día (la 9), que mira lo que elige su asiento y los días que reparte el código. Y lo que se comprueba de un texto para el viajero (`textos.ts`): que no prometa y qué números dice | La 9, con el punto 4.9 |
| `agent/launcher/` | Lo que lanza el agente: una búsqueda desde la terminal (`buscar.ts`); la mesa, donde queda lo que saca; cómo se lanza un asiento (su puesto, su sello, la orden que lo abre, su tope y la recogida), y lo que prepara y recoge al que mira el alojamiento (`mirar.ts`) | `mirar.ts`, con el punto 4.2 |
| `agent/output/` | La salida: la forma del viaje para la web (`viaje.ts`), que es el contrato entre la casa y la web, con lo que el código comprueba de él | La forma, con el punto 1.5 |
| `tests/cases/inventado/` | El caso inventado: una ciudad, unos alojamientos y unos sitios que no existen, lo que pidió un viajero inventado y lo que entregaría cada asiento, para probar toda la cadena sin internet y sin gastar | La investigación inventada, con la tanda 3 |
| `tests/code/` | Las pruebas del código, con el caso inventado, y la prueba del repositorio | Las bases, del 23-nov |
| `web/` | La web de El Dorado, con su propio paquete y sus dependencias: la identidad (`src/app/globals.css`); la portada (`src/app/page.tsx`); el panel (`src/app/(panel)/`), con el mapa (`plan/`), tus viajes (`trips/`) y tu clave (`key/`); las piezas (`src/piezas/`: el mapa, el carril, el buscador, la hoja, las pantallas y la de carga), y lo que le pide a la casa (`src/app/api/`). Sus textos, en inglés y en español, en `src/lib/textos.ts` | En seco, con el viaje grabado |
| `docs/` | La memoria, el registro de decisiones, el encargo, el mapa de los datos, las fuentes y sus condiciones | Al día |
| `docs/paginas/` | Las dos biblias: los datos de la hoja y del plan (`hoja.datos.mjs` y `plan.datos.mjs`), el formato de las hojas de Cortex, el pintor (`pinta.mjs`) y las páginas que salen de ahí y se publican | La hoja y el plan, versión 1, a la firma del PM |

## Lo que aún no existe

El contrato de cada asiento (en `agent/contracts/`, junto al método común) y `tests/runs/` llegan con su punto del
plan.

## Lo que no va aquí

- **Los datos de un viaje**: lo que saca cada búsqueda queda en la mesa, fuera del repositorio (`ELDORADO_MESA` o, si
  no dice nada, la carpeta temporal de la máquina).
- **Las claves de las fuentes**: en el entorno (`LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN` y `PARALLEL_API_KEY`) o, en las
  sesiones de la nube, puestas por su proxy. Nunca en un archivo del repositorio.
