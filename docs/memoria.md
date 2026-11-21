# Memoria de El Dorado

Al día el 21-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí: etapa 1, el encargo.** La ficha, hecha con las respuestas del PM del 21-nov, y su proceso, en siete
cajas, a su firma ([encargo.md](encargo.md)). Lo siguiente, con su firma: la etapa 2, investigar el oficio.

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
| 2 Investigar el oficio | Cómo lo hace un profesional con oficio: dónde busca, qué compara y qué trucos ahorran, cada cosa con su fuente | `docs/oficio.md` |
| 3 Proponer la hoja | La hoja de El Dorado, el one-pager: sus etapas en columnas, su flujo (asientos, scripts y puertas) y sus filas | `docs/paginas/hoja.html`, publicada |
| 4 Cerrar la hoja | La firma del PM | en el registro |
| 5 Planificar la obra | El plan por bloques: lo común por capas y cada etapa, entera | `docs/plan.md` |
| 6 Construir | La casa, los contratos, las herramientas y la salida, con la forma de la carpeta del ensamblador | `agent/` |
| 7 Ensayar | En seco, sin IA y con un viaje inventado; después, con casos reales y el visto bueno del PM | `tests/` |
| 8 Entregar | La carpeta comprobada y cómo conectarla | la raíz |

## 3. Dónde vive cada cosa

- **Este repositorio**: `varolor007/el-dorado`. Cada sesión trabaja en su rama (`claude/...`).
- **El método**: en `varolor007/aurora-web`, que desde aquí solo se lee. La hoja del ensamblador
  (`docs/ensamblador/hoja.md`) dice las etapas, las filas, los dos tipos de agente, sus partes como un programa y cómo
  sale el plan de obra; la carpeta que entrega, en `docs/ensamblador/planos/carpeta.md`. Cortex, en
  `cognitive/src/app/cortex/`.
- **Los datos de los viajeros**: nunca en el repositorio.

## 4. Cómo se retoma

1. Leer el `CLAUDE.md` y esta memoria, por su «Estamos aquí».
2. Trabajar en la rama de la sesión; mirar antes si otra rama `claude/...` va por delante.
3. Si hace falta el método, leer la hoja del ensamblador en `aurora-web`.
4. Antes de lanzar nada que gaste, el visto bueno del PM.
