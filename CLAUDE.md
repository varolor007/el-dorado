# El Dorado: lo que tiene que saber cada sesión

Este repositorio (`varolor007/el-dorado`) es el taller de El Dorado, el agente de viajes de Cortex: planifica un viaje
entero al mejor precio y lo dibuja en un mapa, día a día. Tiene su propia web, como DaVi (la portada, el panel y el
mapa), y su sitio entre los agentes de Cortex, la plataforma de la web de Cognitive, que vive en
`varolor007/aurora-web`. Nada de aquí está publicado.

Antes de nada, lee [docs/memoria.md](docs/memoria.md): qué es, dónde vive cada cosa y cómo se retoma. Mandan las dos
biblias: la hoja ([docs/hoja.md](docs/hoja.md)) dice qué es El Dorado, momento a momento, y el plan
([docs/plan.md](docs/plan.md)), cómo se construye y por dónde vamos, en su «Estamos aquí». Cada decisión, con su fecha,
en [docs/decisiones.md](docs/decisiones.md).

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

1. **La hoja y el plan mandan.** Son el plan y la biblia para no desviarse nunca del diseño del agente, y de la hoja
   nace siempre el plan (el PM, 23-nov). Lo que se construye tiene que caber en ellos; si algo no cabe, se para y se
   pregunta al PM. Si cambian, cambian en el mismo commit, y la decisión va al registro con su fecha.
2. **Un commit por punto del plan**, con su número delante («4.2: ...»). Lo de antes del plan lleva «Etapa N: ...» o
   «Bases: ...».
3. **El plan, la memoria y el registro, al día en el mismo commit** que cambia el estado. La hoja y el plan no se
   editan a mano: se cambian sus datos (`docs/paginas/hoja.datos.mjs` y `plan.datos.mjs`), se pintan con
   `node docs/paginas/pinta.mjs` y se publican sus páginas en su misma dirección. La batería avisa si se quedan atrás
   o si una caja de la hoja no tiene su punto en el plan.
4. **Se trabaja por tandas.** Lo que no necesita al PM va seguido; solo se para para su firma, una decisión suya o un
   gasto. Cada tanda acaba en algo que el PM puede mirar, con su punto de situación en la memoria, y la siguiente no
   empieza sin su visto bueno (el PM, 23-nov: «me vas pidiendo confirmación, y vamos haciendo sign-offs»).
5. **Nada que gaste sin el visto bueno explícito del PM**: ni una sesión del agente, ni un run, ni una prueba con un
   modelo, ni una API de pago. Lanzar es siempre una decisión suya. Lo que gasta la propia sesión de trabajo, y las
   pruebas con las tres fuentes que ya aprobó (LiteAPI, Aviasales y Parallel), no esperan su visto bueno cada vez (el
   PM, 22 y 23-nov).
6. **Lo medible lo mide el código**, y lo demás lo revisa alguien que no lo hizo: nadie se pone nota a sí mismo. Al
   cerrar cada bloque del plan, tres adversarios que no lo hicieron, cada uno en su copia: la mecánica (lo que se
   rompe), la seguridad (lo que deja pasar lo que no debe) y las biblias (si es lo que dicen la hoja y el plan).
7. **Primero se construye y después se prueba**: cada pieza, con datos inventados; los casos reales, al final.
8. **Ningún dato de un viajero ni de un cliente en el repositorio**, ni lo que devuelve una fuente, ni una clave: lo
   que saca una búsqueda va a la mesa, fuera, y las pruebas usan el caso inventado.
9. **Ningún identificador de modelo en el repositorio**: ni en el código, ni en los documentos, ni en los commits.
   Con qué modelo piensa cada asiento se dice en el entorno, no aquí.
10. **La web se mira antes de enseñarla** (el PM, 23-nov): cada pantalla y cada animación, con capturas, en ancho y en
    móvil, en claro y en oscuro. Lo que no cuadra se arregla antes.

## Cómo se trabaja

- Al abrir: `npm install` (una vez), la batería (`node tests/bateria.mjs`, segundos, sin internet y sin gastar) y el
  «Estamos aquí» del plan.
- Antes de cada commit: la batería, en verde. GitHub la vuelve a pasar en cada subida.
- Dónde va cada cosa: [MAP.md](MAP.md). Cada carpeta nueva del agente o de las pruebas entra ahí; la prueba del
  repositorio lo comprueba.
- Es un MVP sin uso comercial (el PM, 23-nov): lo legal de cada fuente, en `docs/condiciones.md`, se cierra antes de
  vender.

## Cómo se escribe

- El código, en TypeScript sobre Node 22 (Node ejecuta los `.ts` sin compilar), a 120 caracteres por línea, con
  `npx prettier --write` para el formato. El agente (`agent/`), sin dependencias para funcionar: solo las de
  desarrollo. La web (`web/`) lleva las suyas, en su propia carpeta.
- Los contratos de los asientos, en inglés; lo que ve el cliente en la web, en inglés, como la web de Cortex; el agente
  responde al viajero en su idioma. Todo lo demás, en español.
- En ningún texto, tampoco en el chat, rayas largas, puntos medios ni el carácter de puntos suspensivos.
- Al PM, en corto, con palabras sencillas y, si se habla de algo de la hoja, por su momento y su fila.
