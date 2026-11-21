# El Dorado: lo que tiene que saber cada sesión

Este repositorio (`varolor007/el-dorado`) es el taller de El Dorado, el agente de viajes de Cortex: planifica un viaje
entero al mejor precio. Se vende en Cortex, la plataforma de agentes de la web de Cognitive, que vive en
`varolor007/aurora-web`. Nada de aquí está publicado.

Antes de nada, lee [docs/memoria.md](docs/memoria.md): qué es, dónde vive cada cosa, por dónde vamos, en su «Estamos
aquí», y cómo se retoma. Cada decisión, con su fecha, en [docs/decisiones.md](docs/decisiones.md).

## Cómo se construye

Con el método del ensamblador de Cortex, a mano y etapa a etapa: 1 Encargo, 2 Investigar el oficio, 3 Proponer la
hoja, 4 Cerrar la hoja, 5 Planificar la obra, 6 Construir, 7 Ensayar y 8 Entregar. El método está en `aurora-web`
(`docs/ensamblador/hoja.md`, sobre todo «Los dos tipos de agente», «El ensamblador, como un programa» y «Cómo sale el
plan de obra»; y la carpeta que entrega, en `docs/ensamblador/planos/carpeta.md`). Ese repositorio, desde aquí, solo se
lee.

Un agente es un programa: su casa (el código que lanza cada paso, para en las puertas, guarda, comprueba y pinta; no
razona), su conductor (el LLM que vigila el run), sus asientos (cada paso de IA, con su contrato), sus puertas (lo que
comprueba el código), sus herramientas, su arquitectura y su frontend.

## Las reglas de la obra

1. **La hoja y el plan mandan**, en cuanto existan (etapas 3 a 5). Lo que se construye tiene que caber en ellos; si
   algo no cabe, se para y se pregunta al PM. Si cambian, cambian en el mismo commit, y la decisión va al registro con
   su fecha.
2. **Un commit por paso**, con su etapa delante mientras se diseña («Etapa 1: ...») y, desde el plan, con el número de
   su punto («2.3: ...»).
3. **La memoria y el registro, al día en el mismo commit** que cambia el estado.
4. **Se trabaja por tandas.** Lo que no necesita al PM va seguido; solo se para para su firma, una decisión suya o un
   gasto. Cada tanda acaba con su punto de situación, en la memoria y al PM.
5. **Nada que gaste sin el visto bueno explícito del PM**: ni una sesión del agente, ni un run, ni una prueba con un
   modelo, ni una API de pago. Lanzar es siempre una decisión suya.
6. **Lo medible lo mide el código**, y lo demás lo revisa alguien que no lo hizo: nadie se pone nota a sí mismo. Al
   cerrar cada bloque del plan, tres adversarios que no lo hicieron, cada uno en su copia: la mecánica (lo que se
   rompe), la seguridad (lo que deja pasar lo que no debe) y las biblias (si es lo que dicen la hoja y el plan).
7. **Primero se construye y después se prueba**: cada pieza, con datos inventados; los casos reales, al final.
8. **Ningún dato de un viajero ni de un cliente en el repositorio.**
9. **Ningún identificador de modelo en el repositorio**: ni en el código, ni en los documentos, ni en los commits.

## Cómo se escribe

- El código, en TypeScript sobre Node 22, a 120 caracteres por línea y sin dependencias mientras no hagan falta.
- Los contratos de los asientos, en inglés; lo que ve el cliente en la web, en inglés, como la web de Cortex; el agente
  responde al viajero en su idioma. Todo lo demás, en español.
- En ningún texto, tampoco en el chat, rayas largas, puntos medios ni el carácter de puntos suspensivos.
- Al PM, en corto, con palabras sencillas y, cuando haya hoja, por su etapa y su fila.
