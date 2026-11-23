# El mapa: dónde va cada cosa

El repositorio lleva la forma de la carpeta que entrega el ensamblador de Cortex: lo que lee y usa el agente, en
`agent/`; lo que comprueba que funciona, en `tests/`, y lo que lee quien lo construye, en `docs/`. Los nombres de las
carpetas, en inglés; lo de dentro, en español. Cada carpeta nueva entra aquí: la prueba del repositorio lo comprueba.

| Carpeta | Qué va | Estado |
|---|---|---|
| `agent/tools/fuentes/` | El recolector: la salida a internet, los tipos comunes y un enchufe por fuente de datos (LiteAPI, Aviasales y Parallel). Cada enchufe se apaga sin tocar lo demás | Las bases, del 23-nov |
| `agent/scripts/` | Los pasos que hace el código, sin IA: los mínimos, los finalistas, las opiniones por temas, el cruce entre fuentes y la búsqueda de alojamiento entera | Las bases, del 23-nov |
| `agent/gates/` | Las puertas: lo que el código comprueba desde fuera. La primera, la de la búsqueda de alojamiento | Las bases, del 23-nov |
| `agent/launcher/` | Lo que lanza el agente: hoy, una búsqueda desde la terminal, y la mesa, donde queda lo que saca | Las bases, del 23-nov |
| `tests/cases/inventado/` | El caso inventado: una ciudad y unos alojamientos que no existen, para probar sin internet y sin gastar | Las bases, del 23-nov |
| `tests/code/` | Las pruebas del código, con el caso inventado, y la prueba del repositorio | Las bases, del 23-nov |
| `docs/` | La memoria, el registro de decisiones, el encargo, el mapa de los datos, las fuentes y sus condiciones | Al día |
| `docs/paginas/` | Las dos biblias: los datos de la hoja y del plan (`hoja.datos.mjs` y `plan.datos.mjs`), el formato de las hojas de Cortex, el pintor (`pinta.mjs`) y las páginas que salen de ahí y se publican | La hoja y el plan, versión 1, a la firma del PM |

## Lo que aún no existe

`agent/contracts/` (los contratos de los asientos), `agent/output/` (la salida: el mapa) y `tests/runs/` llegan con su
punto del plan.

## Lo que no va aquí

- **Los datos de un viaje**: lo que saca cada búsqueda queda en la mesa, fuera del repositorio (`ELDORADO_MESA` o, si
  no dice nada, la carpeta temporal de la máquina).
- **Las claves de las fuentes**: en el entorno (`LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN` y `PARALLEL_API_KEY`) o, en las
  sesiones de la nube, puestas por su proxy. Nunca en un archivo del repositorio.
