# Memoria de El Dorado

Al día el 26-nov-2026. Lo que hace falta para seguir sin la conversación de antes. Cada decisión, con su fecha, en
[decisiones.md](decisiones.md).

**Estamos aquí (26-nov): las capas del destino (bloque 14) están construidas, revisadas y arregladas, en la tanda 6
bis, con 1.035 pruebas en verde aquí y en GitHub. Lo siguiente es el ensayo (tanda 7), y el PM ha decidido hacerlo
él, con una prueba de verdad. La sesión que orquestó las tandas 4 a 6 bis se cerró ese día: se sigue en otra, con
esta memoria** (el estado, punto a punto, en [plan.md](plan.md)).

**Lo siguiente, para la sesión que siga:**

1. **Leer** el `CLAUDE.md`, este principio de la memoria hasta «Lo de las capas, punto a punto», y
   [obra.md](obra.md), que dice cómo se lleva la obra: las sesiones de obra y su encargo, cómo se junta, los tres
   adversarios y cómo se mira la web sin gastar. Después, la batería.
2. **El ensayo es del PM** (26-nov: «el ensayo es mejor que lo haga yo haciendo una prueba real»). Ninguna sesión
   lo lanza por él. Para que pueda, la casa tiene que correr donde su web la alcance: en su servidor, con
   `agent/arranque/` y su guía (`agent/arranque/guia.md`), que no se ha probado nunca en un servidor. Lo natural es
   acompañarle en esa instalación, paso a paso, y mirar con él lo que salga. Lo que se ve por primera vez en esa
   prueba, en `obra.md`, punto 6. Le falta saber el modelo con el que se piensa, que no se escribe en el
   repositorio: se le dice en la conversación.
3. **Falta su visto bueno a la tanda 6 bis.** No lo ha dado con esas palabras: preguntó por las capturas y decidió
   hacer él el ensayo. Su página, en https://claude.ai/artifact/JnxABFxPan41bg2yWJHGhY.
4. **Lo suyo, sin contestar**, en [decisiones.md](decisiones.md), «Pendientes». Lo que más pesa: qué instancias de
   Overpass se usan, qué precio se coge si valen varios, los números de partida de las capas, y lo que viene de
   las tandas 4, 5 y 6.
5. **Con lo que salga de su prueba**, la tanda 7 del plan: medir cada asiento, ajustar pesos y topes (7.3), y lo que
   su prueba enseñe que hay que arreglar. Y del registro, lo que el PM vaya contestando.

**El ensayo del PM, en marcha (26-nov).** La casa está instalada en su servidor, el mismo del ensamblador, con la
guía de `agent/arranque/` y la puerta (la dirección gratuita de sslip.io); su IP, fuera del repositorio, en la variable
`ELDORADO_SERVIDOR` del entorno de las sesiones. No choca con el ensamblador: cada uno en su grupo de Docker
(`eldorado` y `ensamblador`), con sus volúmenes y su red; el ensamblador no abre puertos y la casa abre el 443 y el
80; su puesta al día solo limpia imágenes sin nombre. Comparten la memoria (el ensamblador, hasta 8 GB de 12; la
casa, 3) y la cuenta de Claude: el token de la casa es el mismo del ensamblador, copiado de su `.env`. LiteAPI, con
la clave de pruebas. Lo que salió al instalar: la página de tu cuenta pedía una clave a quien piensa con la cuenta de
la casa (arreglado, 11.2, con `tuIa` en `web/src/lib/tuIa.ts`). El PM enseñó sus claves en una captura: hay que
cambiarlas al acabar el ensayo (el token, en los dos `.env`).

**Lo que no hay que rehacer.** Todas las ramas `claude/eldorado-...` del remoto están juntas en la de todos
(`claude/intelligent-cerf-76wwli`, que es también la de partida: el repositorio no tiene `main`). Las páginas de la
hoja, del plan y de cada revisión están publicadas, y sus direcciones, más abajo. Lo que vivía solo en el borrador
de la sesión que se cerró se ha perdido con ella: sus guiones de capturas (lo que importa de ellos está en
`obra.md`), los informes sueltos de los adversarios (lo que se hizo con cada hallazgo está en `revisiones/`) y la
mesa del viaje de Lisboa del ensayo del 24-nov, que por la regla 8 no podía estar en el repositorio.

**Lo de las capas, punto a punto**, sigue aquí debajo: cada punto del bloque 14 con sus archivos, y lo que se sabe
que falta.

**La revisión de la tanda 6 bis** (25-nov; entera en [revisiones/tanda-6-bis.md](revisiones/tanda-6-bis.md); sus
pantallas, en https://claude.ai/artifact/JnxABFxPan41bg2yWJHGhY). Tres
adversarios en su copia, y cuatro sesiones de arreglos. Tres bloqueantes, arreglados: un adulto con un precio de
otras edades, el taxi distinto en «Allí» y en las cuentas, y una dirección que pasaba las puertas sin haberse
abierto. Lo que queda sabido y sin arreglar, y lo que es del PM, en ese informe y en «Pendientes». Para el ensayo
hay tres cosas que mirar de verdad: que los tres asientos nuevos cumplan su contrato, que Overpass conteste desde
donde corra la casa (`ELDORADO_OVERPASS`), y lo que dice el lanzador de lo gastado. El PM dejó a criterio de la sesión
(26-nov) probar una vez a cortar a Claude con cuidado para que diga lo gastado: queda para cuando la casa corra en
su servidor, porque el ensayo lo hace él.

**Cómo se mira la web de las capas sin gastar** (entero, con su guion, en [obra.md](obra.md), punto 5): una casa
de mentira con la puerta de verdad (`puertaALaWeb`, `fuentesInventadas` y `lanzadorDeMentira`), y con una fuente de
rutas inventada que alarga lo que se anda, para que haya tramos que no se andan y se vea su coste y lo que conviene
para moverse. El viaje del ensayo, que es de antes de las capas, dice «Todavía no se sabe» en «Allí» y en el
presupuesto, sin romper nada.

**El suelo de las capas (14.1), junto** (25-nov). Quien toque una capa, que lea esto. Las formas, en
`agent/output/capas.ts` (el viaje lleva `moverse`, `saber`, `entradas` y `presupuesto`, cada uno opcional; lo que no
se sabe es `null`; cada dato lleva su `fuente`, con la página y el día; una capa puede faltar entera, con su porqué:
`no_contract`, `failed`, `rejected` o `late`). Lo común, en `agent/data/capas.ts`, `agent/scripts/capas.ts` (sin
Node: `abreElDia`, `diasQueCierra`, `entradaDe`) y `agent/launcher/capas.ts`. Cada capa, en sus archivos:
`agent/data/capa_<x>.ts`, `agent/scripts/capa_<x>.ts`, `agent/launcher/capa_<x>.ts` y
`tests/cases/inventado/<x>.ts`, con `<x>` moverse, destino o entradas; el presupuesto, en `agent/data/`,
`agent/scripts/` y `agent/launcher/presupuesto.ts`. La casa las lleva todas con `deUnaCapa`, en `investigar.ts`:
`getting_around` y `local_knowledge` por detrás desde la ruta (`capasDeDetras`), `tickets` cuando entrega el que
elige los sitios, con los días esperándolo hasta su tope (600 segundos), y `budget`, de código, antes de montar el
viaje. Sin contrato en `agent/contracts/<asiento>/` (`getting-around`, `local-knowledge`, `tickets`) una capa no se
lanza; los tres contratos ya están, y los de prueba del suelo se quitaron al juntarlos (25-nov).
**Cómo se enchufa una capa**: escribir su contrato (`README.md`, `GUIDE.md`, `RULES.md`, `DELIVERY.md` e
`INTERNET.md`); afinar su
entrega y `paraEnsenar...` en `agent/scripts/capa_<x>.ts`, sin cambiar la forma del viaje; poner su puerta en
`agent/gates/` y cambiarla en una línea de `agent/launcher/capa_<x>.ts`; afinar su asiento de mentira; y sus pruebas
en su archivo. No se tocan los archivos comunes ni `investigar.ts`. El impacto de cada cambio, en
`agent/data/momentos.ts`: otras fechas rehacen las entradas; otra ruta, todo; un viajero más, solo el presupuesto;
otro idioma o lo que buscas, al que conoce el destino; otro alojamiento u otro vuelo conservan las capas. En la web,
`web/src/piezas/Alli.tsx` y la pestaña «Allí». Sus topes de partida, del PM, en `agent/data/internet.ts` y en los
datos de cada capa. Sabido: una prueba de antes, «cada viaje, solo para su dueño», falla alguna vez si el
identificador del viaje sale sin letras.

**Las capas del destino, firmadas y en obra** (25-nov; bloque 14, tanda 6 bis). Al repasar lo que falta para que
el agente sea funcional, el PM vio que faltan capas: el viaje no sabe lo que cuesta cada entrada ni cuándo abre,
cómo se mueve uno allí y lo que cuesta, ni lo que conviene saber del destino, y su total solo suma dormir y llegar.
Pidió la propuesta en la hoja y la firmó ese día: «integra las capas, y cuando estén le damos el try del 7». Son
tres asientos nuevos, el de moverse (puerta 11), el que conoce el destino (puerta 12) y el de las entradas (puerta
13), que trabajan como el del calendario y el de los papeles, y un paso de código, el presupuesto entero. Se
construyen como la tanda 6: primero su suelo (14.1), con una sola sesión de obra, y después las capas (14.2 a
14.7), a la vez, sobre él; al acabar, los tres adversarios y sus pantallas. **El ensayo, que es lo que el PM llama
el 7, no se lanza sin su adelante**: su mensaje no es el sí a gastar.

**La revisión de la tanda 6** (25-nov). Tres adversarios, cada uno en su copia; su informe, hallazgo a hallazgo y
con lo que se hizo, en [revisiones/tanda-6.md](revisiones/tanda-6.md), y sus pantallas en la página de la revisión
(https://claude.ai/artifact/KMBqFEhTmYD1HNH787LHqb). Un bloqueante, de la mecánica, arreglado: un cambio que se paraba dejaba el
viaje atascado y escondido. Los arreglos los hicieron tres sesiones de obra (el cimiento y los cambios; el
alojamiento y el transporte; el día a día), cada uno con su prueba: la batería pasó de 839 a 860. **Cómo se miró en
la web sin gastar**: con el viaje del ensayo, hasta cada «Adelante» y sin pulsarlo (ese viaje no lleva vuelo, y la
fuente no dio ninguno: las opciones de vuelo solo se han visto con datos inventados); y con una casa de mentira,
para ver lo de después: la puerta de verdad (`puertaALaWeb`) con `fuentesInventadas` y `lanzadorDeMentira` del caso
inventado, como hacen las pruebas, escuchando donde la web espera a la casa. Con ella se vieron el vuelo elegido con
su antes y ahora, la respuesta a una pregunta, el mensaje para un día, las cuatro versiones y el cambio parado. No
está en el repositorio: cada sesión se hizo la suya en su borrador, y valdría la pena dejar una. Con los asientos de
mentira, un cambio de fechas no pasa la puerta del que cruza (el caso inventado no lo cubre): sirve para ver un
cambio parado. **Sin arreglar, y sabido**: lo que se lista al final del informe. **Nada de la tanda se ha visto con
IA de verdad.**

**El alojamiento, a ratos (8.2), junto** (25-nov). Desde la ficha (`web/src/piezas/Alojamiento.tsx`). Elegir otro
de los que ya hay es una elección (`lodging`), y el total lo rehace el código (`conTuAlojamiento`, en
`agent/scripts/alojamiento.ts`); el cierre cierra con él (`Elegido.alojamiento`). Tus gustos, al instante:
`conTusGustos`, con las mismas cribas de la tabla, sobre la investigación de la versión que se enseña
(`POST /viajes/<id>/gustos`). Buscar otra vez (`POST /viajes/<id>/alojamiento`, y su impacto en
`/alojamiento/impacto`): lo pedido va en `rehecho.json`, en `pedido.lodging` (`zone`, `minimums`, `max_price`,
`tastes`), mirado con `comprobarPedido`; la búsqueda lo lee con `buscarConLoPedido` (la zona pedida no se ensancha
ni se bajan los mínimos: lo dijo el viajero), y mirar, con `reutilizarMiradas`: se copia el puesto de quien ya se
miró, con su entrega y su hora, y vuelve a pasar sus puertas; de los nuevos se mira a `NUEVOS_QUE_SE_MIRAN`, dos.
La pregunta por un alojamiento ya mirado (`GET` y `POST /viajes/<id>/alojamiento/pregunta`): el que mira, en un
modo más de su contrato (MI7 y MI8), con el material de su puesto, en `viajes/<id>/preguntas/<n>/`; su respuesta
pasa `agent/gates/puerta_respuesta.ts` antes de llegar a la pantalla. Los números de partida, del PM, en
`agent/data/alojamiento.ts`. Sin ver con IA ni con fuentes de verdad.

**El día a día, a ratos (8.6), junto** (25-nov). `POST` y `GET /viajes/<id>/dia` (`agent/launcher/dia_a_dia.ts`; las
cuentas sin Node, en `agent/scripts/dia_a_dia.ts`; los números, en `agent/data/dia_a_dia.ts`). Sin `go`, el impacto
(`impactoDeUnDia`) y lo que se buscaría (`look_for`), sin cambiar nada; con `go: true`, `rehacer` con la clase `day`.
Lo que pides va en `pedido` (`kind: day_message`: tus palabras, el día abierto, tus días como estaban, lo quitado,
tus elecciones y lo que no estaba). `sitios.json` lleva lo que se buscó (`buscados`, `buscadosEn`, `anadidos`), con
`Fuentes.sitiosDeClases`, y `sitiosQueSeDan` lo da a elegir detrás del corte. El del día a día tiene un modo con
mensaje (`in/message.json`, `changed`, DI9), y la puerta 9 mira `changed` y que lo quitado no vuelva.
`conservarElCruce` y `conservarLaExplicacion`: en un run que sale solo de un día, si la tabla decide lo mismo y la
entrega de antes pasa su puerta con lo de ahora, se copian sus puestos y no se lanzan. `leerElecciones` hereda
`pedido.choices` en una versión nueva sin elecciones (vale para cualquier momento que las pase). En la web,
`web/src/piezas/DiaADia.tsx`, al pie de tus días. Vuelve a los datos abiertos solo por palabras de una lista, en
inglés y en español. Sin hacer: el del calendario con un mensaje (el de antes se conserva). Sin ver con IA ni con
fuentes de verdad. Al juntarlo con el 8.2, la puerta de la web y la hoja de estilos chocaban en trozos que
compartían líneas: se rehicieron a mano, función a función. **Tras la revisión** (25-nov): `Impacto.most` es lo más
que puede costar con lo de `maybe` (`costesDe`, en `agent/scripts/impacto.ts`, para cualquier impacto), y la pieza
del impacto lo dice debajo de lo seguro. La ruta `dia` acepta `ceiling`. `sitios.json` lleva `anadidosEn` (lo de
ese mensaje); `found` y `new_sights` cuentan solo eso. `conservarElCruce` y `conservarLaExplicacion` piden además
el mismo material, pieza a pieza (`mismoMaterial`): un mensaje que cambia paradas mueve los minutos de la tabla, y
vuelven los dos. La puerta 9 cuenta cada día con `cuentasDeUnDia`, y la web y el cierre la usan con tus días
(`noCabenTusDias`; `day_does_not_fit` entre lo sin confirmar): se avisa y no se impide. Y el aviso de que tus días
han cambiado solo sale en la versión de la que salió el mensaje, si dejó una más nueva (`loQueSeEnsena`, en
`web/src/lib/diaADia.ts`).

**El transporte, a ratos (8.3), junto** (25-nov). La búsqueda otra vez es código (`agent/scripts/otro_transporte.ts`
y `agent/launcher/otro_transporte.ts`; los números, en `agent/data/transporte.ts`), guardada en
`viajes/<id>/transporte/<n>.json` con su versión: `GET` y `POST /viajes/<id>/transporte` (`{move}`) y
`POST /viajes/<id>/transporte/elegir` (`{search, option, ceiling?}`), que solo vale con la búsqueda de la versión que
se ve (`old_search` si no). Dos clases nuevas en `agent/data/momentos.ts`: `flight` (otro vuelo los mismos días: la
tabla, el que cruza y el que explica; la que había, `transport`, queda sin usar porque rehacía también las miradas)
y `new_country` (los papeles, con el país de un aeropuerto nuevo); otro día va por `dates`, con lo entendido nuevo.
El pedido del run lleva el vuelo y los países (`pedidoDelTransporte`), y lo leen `transporteDe` y los papeles en
`investigar.ts`; los papeles y la puerta 2 aceptan países de más. Cerrar usa la elección `transport`
(`Elegido.transporte` y `conTuTransporte`; 400 `bad_transport` si no es del viaje). En la web,
`web/src/piezas/ElTransporte.tsx`, desde las cuentas o suelta con `?at=transport`. Sabido y sin arreglar: si otra
investigación rehace los papeles por otro cambio, los países de más del transporte no se recuerdan (van en el pedido
de su run); la fuente no dice dónde se hace escala; el impacto de `flight` dice que deja de valer «dónde duermes»
(lo trae `PIEZAS_DE_UN_PASO.table`). Al juntarlo con el 8.2, cerrar lleva los dos: la manera, con el alojamiento
y el transporte elegidos, cada uno en su parte del total (`delElegido`, con su prueba en `cierre.test.ts`); y en la
puerta, el pedido que no vale del transporte entra con otro nombre, porque el del alojamiento se llama igual. Mirado
en la web con el viaje del ensayo, que no lleva vuelo: dice por qué, y al buscar otra vez la fuente no dio nada para
esas fechas, y se dice. Sus opciones no se han visto con datos de verdad, ni nada de esto con IA.

**Cambios (8.5), junto** (25-nov). `agent/scripts/cambios.ts` arma lo entendido de después con las preguntas de
empezar ya contestadas (`conElCambio`), sin tocar lo que sacó el que escucha, y dice lo que trae (`queTrae`: las
clases, y si es un viaje nuevo). `GET` y `POST /viajes/<id>/cambiar` (`{understood, go_ahead, ceiling}`) siguen la
receta del 8.1: si gasta y no hay `go_ahead`, 409 `go_ahead_needed` con el impacto; sin gasto se rehace sin adelante;
otro destino, 409 `new_trip`; nada cambiado, 409 `nothing_changed`. Con un cambio que se paró se parte de la versión
que se enseña, y una primera investigación parada empieza otra vez con lo cambiado. `passports` sale de las filas de
la tabla de los papeles (`filasDeLosPapeles`, en `agent/scripts/impacto.ts`), `CAMBIOS.travellers` pasa a `search`,
y los papeles conservados se recuentan en `investigar.ts` (`recontarLosViajeros`). El tope de partida, en
`TOPE_DE_CAMBIOS` (`agent/data/momentos.ts`). Un gusto que se toca lleva como cita su toque, sumado a `said.wants`,
para que la puerta 1 lo encuentre. En la web, `web/src/piezas/Cambios.tsx` (y `QuienesViajan`, sacado de
`Empezar.tsx`), `?at=change` y los avisos de lo que quedó atrás. Sin hacer: un viajero más vuelve a mirar a todos
los finalistas. Mirado en la web con el viaje del ensayo, sin dar el adelante: el botón en tu viaje, tus respuestas
ya contestadas y, al añadir una cosa a lo que buscas, lo que cambiaría (rehace la ruta, la búsqueda y las miradas:
unos cinco dólares de equivalente, por lo que gastó ese viaje). Sin ver con IA de verdad.

**El que conoce el destino (14.3), junto** (25-nov). Contrato en `agent/contracts/local-knowledge/` (RL1 a RL8); puerta 12
en `agent/gates/puerta_destino.ts` (`puertaDestino`, con las zonas y hoy), llamada desde `puertaDelDestino`. La entrega
lleva `figures` (números u horas HH:MM), que no pasa al viaje: cada número de una frase tiene que estar ahí o en
`costs`. `meal_cost` es una comida para una persona, siempre con su horquilla. Lo de comer: la puerta mira palabras de
restaurante y de opinión (inglés, español y comunes); un nombre propio a secas queda al contrato. La prueba de quién
responde deja fuera a las capas hasta que la pestaña «Allí» tenga su fila en la hoja. Sin ver con IA.

**El de moverse (14.2), junto** (25-nov). Contrato en `agent/contracts/getting-around/` (RM1 a RM9); puerta 11 en
`agent/gates/puerta_moverse.ts` (`seen` es hoy, con un día de holgura; sin aproximar; lo que no se sabe, en
`unknowns`; ninguna palabra de lo mejor; los números de una frase, de sus datos); lo que ve, en `piezasDeMoverse`; la
cuenta, en `agent/scripts/capa_moverse.ts` (`cuentaDeMoverse`, `cuentaDelGrupo`, `viajesDeLosDias`), sin Node, para
el presupuesto y la web. `between_bases` se guarda en la entrega y no llega al
viaje, y por dónde se llega sale de lo entendido, no del vuelo elegido. Sin ver con IA.

**El presupuesto entero (14.5), junto** (25-nov). La cuenta, en `agent/scripts/presupuesto.ts`, sin Node:
`lasEntradas`, `moverseAlli`, `llegarADormir` y `comidasDe`; `presupuestoDe(v, capas, {zonas, moverse})`; y
`conOtrosDias` para la web, que rehace las entradas y moverse allí y conserva llegar. Moverse allí usa por defecto la
cuenta del de moverse (`LA_CUENTA_DE_MOVERSE`, que llama a `cuentaDelGrupo` de 14.2; se enchufó al juntar, con su
prueba), y un trayecto que no se anda es el que pasa de 3.500 metros, lo mismo que anda la casa. Las zonas, de
`ruta.json` (`zonasDelRun`). Los números de partida, en `agent/data/presupuesto.ts`. Las puertas 6 y 7 miran las
frases del presupuesto entero con `agent/gates/cifras_del_presupuesto.ts`, y sus materiales aceptan `presupuesto`, que
hoy nadie les pasa: sin él, una cifra en una frase del presupuesto entero sale roja. Al viaje le falta el id de la
zona de cada alojamiento. Sin ver con IA ni con fuentes de verdad.

**El de las entradas (14.4), junto** (25-nov). Datos abiertos en `agent/tools/abiertos.ts`: Wikidata para la web y
el objeto de OpenStreetMap, y Overpass, el servicio de lectura de OpenStreetMap, para sus etiquetas (una consulta
por tanda de hasta 30 sitios: por el número que dice Wikidata y por el identificador del sitio a 500 metros de su
punto; solo etiquetas). Sus instancias, en `ELDORADO_OVERPASS` (https, separadas por comas, cuatro como mucho; sin
ella, la principal), en orden, con 40 segundos por instancia y 90 en total; si ninguna contesta, se avisa y el
horario no se sabe. Antes se leía por la API de editar y por el buscador, que sus condiciones no dejan
(`condiciones.md`). Desde esta nube ninguna instancia pública contestó bien (la principal, 503; la de VK Maps, 504
casi siempre; la de Private.coffee, nada): el camino bueno solo se ha visto con una consulta suelta. El horario se
lee en `agent/tools/horarios.ts`. Contrato en
`agent/contracts/tickets/` (TK1 a TK8); puerta 13 en `agent/gates/puerta_entradas.ts`, con las páginas abiertas del
puesto (`capaDeLasEntradasDe(run)`). Al viaje, manda el asiento; su «unknown» y lo no mirado, con los datos abiertos.
Lo que cierra cada día: `cierraEnElRun` y `cierraEnElViaje`; el ritmo lo recibe como séptimo parámetro, con el motivo
«closed», y la puerta 9 lo mira con `cierra`. Lo usan la casa, el montaje del viaje, `diasElegidos` y la web. Si pasan
del tope, `ordenParaMirar`: primero los imprescindibles y los que tienen puerta; el aviso, con los del run. Sabido: el
viaje no distingue un sitio sin mirar por el tope de uno cuya tanda falló; «closed» sale en la web con lo que no cabe
a ese ritmo; y qué instancias de Overpass se usan es del PM. Sin pantalla nueva ni capturas, y sin ver con IA.

**La web de las capas (14.6), junta** (25-nov). `web/src/piezas/Alli.tsx` (`Alli`, `EntradaDeLaParada`,
`FichaDeLaEntrada`, `CosteDelTrayecto`, `ElPresupuesto`) y sus cuentas en `web/src/lib/alli.ts` (`paraTuGrupo`,
`abreTusDias`, `billeteSuelto`, `presupuestoQueSeEnsena`). Lo vivo: `ways_around`, `good_to_know` y `tickets_known`
(`sucesosDeLasCapas`, en `monta_viaje.ts`, la misma cuenta en vivo y grabada). Lo que quedó suelto (el nombre de las
zonas, las dos cuentas del grupo, el aviso viejo del transporte y el coste de un trayecto sin ver) se cerró al
unirlas: ver «Las capas, unidas».

**La guía con las capas (14.6), junta** (25-nov). Material: `ticket`, `eat`, `around` y `know` en
`agent/scripts/guia.ts`, solo si la capa vale (`capaQueVale`); dónde comer por cercanía a las paradas
(`comerPorDias`, `PARA_COMER` en `agent/data/guia.ts`: 1.200 metros y tres por día, de partida). Cuaderno: secciones
nuevas y `fuentesDeAlli` en `agent/scripts/cuaderno.ts`. Puerta 10: importes y horas del material, `eat` por día,
transportes del viaje (`MODOS_EN_UN_TEXTO`) y `rojosDeLoDeAlli`. Contrato: GW3 cambiada (el que escribe puede decir
un precio o una hora de allí, solo de su material; antes no veía precios) y GW9 nueva. Pruebas en
`tests/code/guia_alli.test.ts`; el viaje con capas, `viajeParaLaGuia({ capas: true })`. Sabido: la guía enseña los
billetes, no cuál conviene; «metro» en español es también la unidad y puede dar un rojo falso; lo que te pierdes en
autobús sigue sin hacer. Sin ver con IA.

**Las capas, unidas en la web y en la guía (14.6)** (25-nov, una tercera sesión de obra, tras juntar las otras). Una
sola cuenta: la web no tiene reglas suyas (`web/src/lib/alli.ts` llama a `cadaUnoDelGrupo`, `trayectosQueNoSeAndan`,
`cuentaDeMoverseDelViaje` y `presupuestoDe`, de `agent/scripts/presupuesto.ts`, y a `sueltoDelGrupo`, de
`capa_moverse.ts`). Los trayectos que no se andan son los de los caminos (`viajesDeLosDias`), con la ida y la vuelta
a donde duerme cada manera: moverte allí puede cambiar de una manera a otra. El viaje trae `zonasDeLaRuta`
(`montarViajeHecho` y `conLasCapas`); con ellas la web nombra las zonas y rehace también llegar a donde duermes; sin
ellas (un viaje de antes) esa parte queda la de antes y se dice. Las cuentas enseñan el presupuesto de lo que tienes
delante (`presupuestoQueSeEnsena(viaje, dias, cambios)`). «Allí» dice lo que te conviene para moverte
(`loQueTeConviene`), y la guía lo pone en «Cómo moverte» (`convieneDelCuaderno`), con la puerta 10 rehaciendo la
cuenta. `noSeAnda` dice ya los transportes que hay. Mirado con una casa de mentira y una fuente de rutas con rodeo,
para que haya tramos que no se andan. Sabido: el que escribe la guía no recibe lo que conviene, y sus tramos no
tienen la vuelta a donde duermes; un viaje cerrado enseña en las cuentas el presupuesto con los precios de la
investigación, no los del cierre; sin niños en pantalla; sin IA.

**Las capas en los demás momentos (14.7), junto** (25-nov). Entradas: `sinMirar` (`over_limit`, `failed`, `added`) en
la forma; al rehacer con el mismo destino y las mismas fechas se quedan las de antes (`entradasDeAntes`,
`repartirLasEntradas`, `conLasDeAntes`), y el paso `tickets` del impacto es código salvo con `destination`, `dates`
u `other` (`MIRAN_TODAS_LAS_ENTRADAS`); la clase `tickets` y `POST /viajes/<id>/entradas` para tu botón
(`prepararLasEntradas`, `pedirLasEntradas`; la pieza `web/src/piezas/LasEntradas.tsx`), con el tope de los mensajes,
contado aparte. Lo que cierra en tus días: `cierranTusDias`, `stop_closed` al cerrar y el rótulo `fueraCierra`. El
presupuesto delante: `agent/launcher/presupuesto_delante.ts`, con `budget.json` para el que cruza (por fila), para el
que explica y para el orden al cerrar; CR10 y EX10 en sus contratos; el que cruza espera ahora a moverse y al
destino. Cerrar: `Reserva.enlace` y `enlaceDeLaEntrada`, mirados por la puerta 8. El techo: `Trabajo.cota`,
`gastoParaElTecho` y `AlLlevar.cota` (`agent/launcher/trabajos.ts` y `casa.ts`); ver «El techo con las capas». Al
juntar: la
cuenta que ven el que cruza, el que explica y el cierre usa las zonas que trae el viaje, como la del viaje; y lo que
avisan los datos abiertos (que Overpass no contesta) queda en los avisos del run (`abiertos.json`) y la
investigación lo dice con sus demás avisos (`avisosDeLosAbiertos`). Pruebas:
`techo_de_las_capas`, `presupuesto_delante`, `cambios_con_capas`, `cierre` y `entradas`. Mirado en la web con una casa
de mentira; el cierre con su enlace y el adelante del botón, solo en pruebas. Sabido: el primer mensaje para un día
sobre un viaje de antes vuelve a lanzar una vez al que cruza y al que explica, porque su material cambia; y cambiar
lo que buscas vuelve a lanzar al que conoce el destino, que no lo lee. Sin ver con IA.

**El techo con las capas (14.7), junto** (25-nov, otra sesión de obra). El lanzador cortado acaba con
`errorDeUnCortado` (`agent/launcher/asiento.ts`): `gasto.cortado` y `cota`, lo más que quedó sin contar;
`lanzarAsiento` espera `GRACIA_AL_CORTAR` (8 segundos) y, tras el corte, solo cree un error marcado como de cortado.
La llamada directa cuenta por el flujo (`apuntarSuceso` y `parcialDeLaCuenta`, en `ia_de_verdad.ts`) y
`lanzadorDirecto` lo pasa a dólares (`parcialDe`, `cotaDeLoSinContar`, en `ia.ts`): la cota es lo que la vuelta en
marcha aún podía escribir; si esa vuelta ya había empezado una búsqueda, o no había dicho lo que leyó, no hay cota.
Claude Code solo da dólares si llega su resultado, que cortado no llega (`parcialDeClaudeCode`), y va sin precio:
**con la cuenta de la casa, el techo se trata como antes**. `gastoParaElTecho` suma gasto y cota de un cortado (sin
cota, null: no se sigue a ciegas), y `gastoDe` lleva `deCortados` y deja `sabido` en falso. El acta lleva `cortado` y
`total.de_cortados`; `/cuenta/gasto`, `cut_usd`, que la web aún no enseña. Sin comprobar, para el ensayo: que el
flujo de verdad diga lo que la documentación dice, que cortar deje de cobrar donde se deja de recibir, y si Claude
Code da un resultado al cortarlo con cuidado. De la revisión, arreglado: `cerrarLosCortados` y la capa que entrega
sin decir su gasto llevan la misma regla (`cotaDelTrabajo`); y lo que trabaja cuenta según lo va diciendo: el
lanzador tiene un cuarto argumento, `alContar(gasto, cota)`, `lanzarAsiento` acepta `{ corte, alContar }` (con
`cortadoDeFuera`), la casa lleva en memoria lo que trabaja (`vivos`) y `gastoParaElTecho(run, enMarcha)` lo suma; si
se llega al techo, las capas en marcha se cortan y no se lanza más (lo que no es capa acaba, y después se para).
Sabido: con Claude Code no se dice nada por el camino, y ahí el techo se puede pasar con lo que corre a la vez, como
antes; con la llamada directa queda un rato sin contar, entre que se manda una vuelta y dice lo que leyó; y
`lanzarPorDetras` sigue sin el tope de asientos a la vez.

**Las cuentas, tras la revisión (14.5 y 14.6)** (25-nov, una sesión de arreglos). Una sola regla de quién paga
qué, `preciosParaUno`, en `agent/scripts/capas.ts`, para las entradas, llegar y los billetes de moverse: un adulto,
del que no se sabe la edad, solo coge precios que no dicen edades (si todos las dicen, no se sabe); un niño sin
precio suyo paga el de adulto, también en moverse. Cuál se coge si valen varios, en un solo sitio:
`SI_VALEN_VARIOS` (`agent/data/presupuesto.ts`: el más barato en las entradas y en llegar, el más caro en los
billetes), que lee `elQueSeCoge`. Llegar a donde duermes solo cuenta las maneras que van a tu zona si el alojamiento
la dice. `loQueCuestaLlegar` es la cuenta de cada manera de llegar, por coche o por persona, y la usan el presupuesto
y «Allí» (`paraLlegar`): un taxi se dice por coche. Las comidas, por persona y como cuenta
(`comidasQueSeEnsenan`), y para el grupo dicho como tal. Al cerrar, los días no confirmados se dicen como fechas
(`refDeUnaDuda`, en `web/src/lib/formato.ts`). Las pestañas del viaje caben a 390 de ancho, también las seis del
viaje cerrado; en uno más estrecho la fila se desliza y su borde se desvanece mientras quede algo por ver. El caso
inventado trae llegar a cada zona de la ruta. Un tramo
que no se anda solo lleva billete si el transporte está entre sus maneras (`conBillete`, en `capa_moverse.ts`); uno
que solo se hace en coche no suma un billete y falta en «moverte allí», sin inventar lo que cuesta el coche, y lo
dicen igual el presupuesto, «Allí», cada tramo y la guía (`soloEnCoche`).

**La casa y la guía, tras la revisión del bloque 14** (25-nov, una sesión de arreglos). La guía de un viaje con días
libres sale: el material marca `free`, el contrato dice qué se escribe (GW10: un día libre se queda libre), la puerta
10 no le deja meter paradas ni nombrar las de otro día, y el cuaderno lo pinta sin croquis, en su hoja. El que cruza
ya no espera a las capas: si ya acabaron lleva `budget.json`, y si no va sin él y no puede decir ninguna cifra del
total (CR10); el que explica las sigue esperando. Lo que dijeron del presupuesto el que cruza y el que explica, si se
conserva en un cambio que rehace la cuenta (tu botón de las entradas, otro ritmo), se vuelve a juzgar con la nueva y
el que no pasa se rehace entero (`juzgarLoDicho`, en `investigar.ts`; `tirarLoConservado`, en `rehacer.ts`); el
impacto lo pone en lo que quizá cambie y lo cuenta (`DICEN_EL_PRESUPUESTO`, en `agent/data/momentos.ts`). A un
asiento con internet solo le llega lo que se busca de la lista fija (`agent/data/buscar.ts`, `loQueSeBusca`), nunca
las palabras del viajero: tocaba al que conoce el destino y al del calendario. Cambiar lo que buscas rehace también
el calendario; otro idioma no se alcanza y, si se ofreciera, se rehace entero. Pruebas: `guia_dias_libres`,
`cruce_sin_esperar`, `lo_dicho_del_presupuesto` y `lo_que_se_busca`. Sabido: quitar o mover una parada cambia la
cuenta sin rehacer a nadie, y el porqué de cada manera sigue dicho con la cuenta de antes. Sin IA.

**Tres retoques del cuaderno tras mirarlo** (25-nov, la misma sesión). Ningún día se titula «unknown»: al cerrar con
otros días, el que cambia de paradas toma el título de su parada más importante (`tituloDelDia`, en
`agent/scripts/ritmo.ts`, que usa `conTusDias`), y la puerta 10 da rojo a un título así. «De donde llegas a donde
duermes» enseña solo las maneras que van a tu zona, si se sabe, y si no cada una con la suya (`llegarDelCuaderno`).
En la última hoja, las fuentes de allí van en su bloque y ya no se montan, y un aviso de las fechas sin nombre
lleva su tema de rótulo, como en la web (`temaDeFechas`). Y la web de un sitio dice de dónde sale: la de los datos
abiertos, como «Su web, según los datos abiertos», y la puerta 10 no deja darla por la oficial ni ponerla donde
reservar. Pruebas en `guia_dias_libres`.

**Las puertas de las capas y los enlaces, tras la revisión (3.5, 14.3, 14.4 y 14.5)** (25-nov, una sesión de
arreglos). Un enlace de fuera vale solo escrito en su forma normal (`formaNormal` y `enlaceQueVale`, en
`agent/tools/enlaces.ts`: https, sin usuario ni clave), y se guarda y se pinta esa; la puerta de todos mira cualquier
cosa que un navegador abriría como una dirección, en cada texto de la entrega y en cada renglón de las notas
(`paginasEn`, `aDondeLleva` y `enlaceDeFuera`, en `agent/launcher/consultado.ts`). En la puerta 13, dónde reservar y
la web oficial tienen que ser una página que el asiento abrió, en cualquiera de sus vueltas, o la que dicen los datos
abiertos de ese sitio; lo visto, hoy con un día de holgura, como en la 11. El viaje dice si la web de un sitio es la
de los datos abiertos (`webDeLosAbiertos`): la web la enseña como «su web, según los datos abiertos», y al cerrar
solo vale como enlace a las entradas la que el asiento abrió. En un idioma sin las listas de palabras de las puertas
11 y 12 (`IDIOMAS_CON_SUS_LISTAS`: inglés y español), las frases del que conoce el destino no llegan a la pantalla
ni a la guía (`sinFrase`); los datos sí, y la web dice que esa explicación todavía no está en ese idioma. La 12 no
deja pasar canales (mensajería, llamar a alguien), direcciones dichas con palabras ni negocios con nombre, tampoco
en «evitar» y en «lo práctico». El presupuesto entero, con más maneras de decirlo. Los datos abiertos: instancias
solo de fuera y sin redirecciones, Wikidata dentro del tope (dos minutos en total), y un fallo entero no se guarda
como respuesta. El horario: solo «24:00» vale como las 24, y lee «Su,PH off» y «10:00-12:00, 14:00-18:00». Sabido: la
12 sigue pidiendo solo que lo visto no sea después de hoy, porque su contrato deja poner la fecha que da la página;
y la regla de los negocios puede dar algún rojo falso. Sin ver con IA.

**El visto bueno a las tandas 4 y 5** (25-nov). El PM, a su punto de situación: «lo único, lo del idioma, que no es
que se niegue, simplemente di que todavía no están soportados. Y por lo demás, nada, yo creo que ok, seguimos para
lo siguiente». Hecho lo del idioma: la web dice que la guía todavía no está disponible en ese idioma. La sesión lee
el resto como su visto bueno a las dos tandas y como el sí para empezar la 6, y se lo dice así. De lo que quedaba a
su decisión no contestó nada en concreto: se queda como está construido y sigue en «Pendientes». Y no es un sí a
gastar: ni otro ensayo, ni el cierre o la guía con IA de verdad.

**La tanda 6, por momentos** (25-nov). El resto del bloque 8: usar el viaje a ratos. En dos pasos, porque todo lo
demás se apoya en el primero. Primero, una sesión de obra con su cimiento (8.1, `claude/eldorado-8-1-por-momentos`):
lo que el viajero elige, guardado en la casa; el estado de cada pieza, sacado del disco; el impacto de un cambio,
por claves y sin IA; rehacer solo lo que dejó de valer, en una investigación que parte de la anterior; y las
versiones, con volver a la de antes. Después, sobre él y a la vez: el alojamiento (8.2), el transporte (8.3), el día
a día (8.6) y los cambios (8.5). Vigilar el precio (8.7) es del PM.

**Los arreglos del alojamiento y del transporte, tras la revisión de la tanda 6** (25-nov; 8.2 y 8.3). La
respuesta del que mira lleva `about` (`room` o `lodging`); su puerta (`agent/gates/puerta_respuesta.ts`) no deja
hablar de dinero, cruza sus números con la ficha y las opiniones que se le dieron (los de la pregunta del viajero no
cuentan, para que una orden escondida en ella no tenga camino) y aplica MI4: una foto que no es de la habitación no
prueba una respuesta sobre ella. Las palabras de dinero y de la habitación, en `agent/data/alojamiento.ts`, solo en
inglés y en español; en otro idioma manda el `about` que diga el asiento. `clasesDelPedido`
(`agent/launcher/alojamiento.ts`): poner o quitar un imprescindible que tiene campo en `INSTALACIONES` es un cambio
`lodging`, y se busca otra vez. `reutilizarMiradas` copia solo si `miraLoMismo` (la habitación y sus fotos), y las
direcciones de las fotos de prueba salen de `run/fotos/<clave>/direcciones.json`, que se copia con la mirada.
`gastoDeLaCuenta` suma `preguntas/`. Cerrar mira el alojamiento antes de `nuevoCierre` (400 `bad_lodging`), y
`comprobarElecciones` no guarda uno de otra moneda que su manera. `ELECCIONES_DE_TRANSPORTE` (seis cada 24 horas,
de partida; apunte `transport_choice`, 429 `too_many_choices`). Una búsqueda de transporte que falla también se
apunta. `transporteDeCara` dice del tuyo `new_countries` y `country_unknown`, y `ElTransporte.tsx` lo avisa: no
cambia qué aeropuertos se ofrecen ni relanza los papeles, que es del PM. `conLoTuyo` (`web/src/piezas/Pantallas.tsx`)
pinta la manera elegida con tu alojamiento, tu transporte y su total, en dormir, en las cuentas y en la cifra de
arriba. Al juntarlo con lo del cimiento, guardar el transporte elegido manda la versión de la que se leyeron las
elecciones. Sabido y sin tocar: pulsar la manera que ya está elegida borra el alojamiento que elegiste.

**Los arreglos del cimiento y de los cambios, tras la revisión de la tanda 6** (25-nov; 8.1 y 8.5). **Un cambio
que se para ya no atasca el viaje**: `quedarseComoSuVersion` (`agent/launcher/mesa.ts`) lo devuelve a `on_map` o
`closed`, y `soltarElCambio` (`agent/launcher/rehacer.ts`) lo hace cuando el último run rehace la versión que se
enseña y está parado; a uno a medias sin nadie que lo lleve, primero lo para (salvo que espere tu turno de los
papeles, que sigue escondiendo el viaje: sin arreglar). La puerta lo mira al primer acceso (`alDia`, en `suViaje`,
al listar y en el oyente en vivo), sin barrido al arrancar, y `marchar` lo suelta al acabar. El estado del viaje
lleva `research.change` (`from`, `run`, `changes`), la web lo pinta encima del viaje (`TuCambioParado`, en
`web/src/piezas/Momentos.tsx`), y `reintentar` vale con el viaje en el mapa o cerrado solo para ese run
(`cambioParado`). «Dejarlo» solo lo quita de la vista en ese navegador. **Lo entendido del viaje es siempre el de la
versión que se enseña** (`entendidoDeLaVersion`): rehacer lo escribe solo en su run. **Tus elecciones pasan siempre a
la versión nueva** (`heredadas`, en `agent/launcher/momentos.ts`, parte de la versión de la que sale; si el momento
pasa `choices`, mandan esas). **Lo pedido dura por la cadena**: `Rehecho.heredado` y `loPedidoDe(run, pieza)`, con
las piezas `transport` y `lodging`; lo leen `transporteDe`, los países de más de los papeles,
`pedidoDeAlojamientoDe` y `vueloDe`. Otra búsqueda de alojamiento pisa entera a la heredada; el vuelo heredado se
cae si no es de las fechas o de la moneda, y con él sus países; el tope del alojamiento se cae con otras fechas,
otro grupo u otra moneda; los gustos marcados, con un gusto nuevo; la zona y los mínimos duran. El pedido del día a
día no se hereda. Su prueba, la cadena de ocho versiones, en `tests/code/lo_pedido.test.ts`. **Guardar elecciones
lleva su versión** (`PUT`, con `version`: 409 `not_shown` si no es la que se enseña; opcional, porque
`ElTransporte.tsx` aún no la manda). **`cambiar`** rechaza otro idioma (409 `language_change`), los campos de más y
tus palabras tocadas fuera de las citas (400 `bad_change`; `cambioQueNoVale`, en `agent/scripts/cambios.ts`), y
empezar otra vez mira el tope de investigaciones. `Object.hasOwn` en lo que llega de fuera. Y las piezas que dejan
de valer salen también de la clase del cambio (`PIEZAS_DE_UNA_CLASE`, en `agent/data/momentos.ts`).

**La casa por momentos (8.1), junta** (25-nov). Es el suelo de los otros cuatro puntos: quien toque uno, que la lea.
- **Elecciones**: lo que el viajero escoge entre lo que ya trae la versión que ve (la manera, un alojamiento o un
  transporte de los suyos, el ritmo, lo que quita, añade o mueve, y sus gustos, marcados sin aplicar). En
  `viajes/<id>/elecciones/<n>.json`, por versión, encima y sin versión nueva (`GET` y `PUT /viajes/<id>/elecciones`,
  solo su dueño y solo en el mapa). Los días no se guardan: se calculan con el mismo repartir que la web
  (`agent/scripts/elecciones.ts`: `comprobarElecciones`, `diasElegidos`, `alojamientoDe`, `transporteDe`,
  `paraElCierre`; en la casa, `leerElecciones` y `guardarElecciones`, en `agent/launcher/momentos.ts`). El cierre
  parte de lo guardado si la web no manda sus días.
- **Estado**: el de cada pieza, cada parada y cada precio, calculado y por claves (`agent/scripts/estado.ts`,
  `GET /viajes/<id>/piezas`).
- **Impacto**: qué deja de valer con un cambio, qué pasos se rehacen y con qué, qué se queda, y lo que costaría,
  sin IA (`agent/data/momentos.ts`: `CAMBIOS`, `LEE`, `LO_QUE_DEJA`; `agent/scripts/impacto.ts`: `clasesDelCambio`,
  `impactoDe`; `POST /viajes/<id>/impacto`, que no cambia nada). El coste sale de lo que gastó cada asiento en las
  investigaciones de esa cuenta (`gastoPorAsiento`); si de alguna no se sabe todo, dice que no se sabe.
- **Rehacer**: `rehacer(v, {clases, entendido?, pedido?})`, en `agent/launcher/rehacer.ts`, abre una investigación
  que parte de la de la versión que se enseña: copia, con sus horas (la puerta de todos mira el orden de los pasos
  de un asiento por la hora de sus archivos), lo que deja cada paso que no lee nada de lo que cambió, con sus
  puestos y sus veredictos, y deja `rehecho.json` (de cuál viene, con qué cambio, y lo que pide el momento, en
  `pedido`). No copia ni los trabajos ni el adelante: la investigación nueva solo cuenta lo que lanza. La lleva
  `llevar`, como a cualquiera, y al acabar su versión lleva `de` y `cambio`.
- **Versiones**: `GET /viajes/<id>/versiones` y `POST /viajes/<id>/volver` (`versionesDe`, `volverA`); al volver a
  una de antes vuelven sus elecciones, y de un viaje cerrado se puede volver a una abierta.
- **Quién responde**: `agent/data/responde.ts` (`quienResponde(sitio)`), la tabla de la hoja.
- **Web**: `web/src/lib/elecciones.ts` (`useTusElecciones`, `useVersiones`) y `web/src/piezas/Momentos.tsx`
  (`TusVersiones` y `ElImpacto`, que se ve suelta con `?at=impact&change=<clase>`).
- **Cómo lo usa un momento** (la receta para 8.2, 8.3, 8.6 y 8.5). Lo que pide el viajero (otra zona, otro
  horario, su mensaje) va en `pedido`, que queda tal cual en `<run>/rehecho.json`: el paso que lo necesite lo lee
  con `rehechoDe(run)?.pedido`. En la puerta, igual que `empezar`: comprobar que no hay nada en marcha (los mapas
  `marchas` y `guias`); `conQuePiensa` y `claveDe` para el lanzador; `abandonarElCierre(v)` si un cierre esperaba el
  sí; `rehacer(v, {clases, entendido?, pedido?})`; `darElAdelante(run, techo, hoy())` tras el botón del viajero si
  `impacto.spends`; `apuntar(v, "button", {...})`; y `marchar(id, run, lanzador)`. La lleva `llevar`, por las mismas
  puertas y con su techo, y si se corta se retoma desde el disco. Los asientos conservados no se lanzan. La versión
  no se guarda a mano: al acabar la guarda `investigar.ts`. En la web, el impacto se enseña y el adelante se pide
  con `<ElImpacto t idioma impacto alAdelante alAhoraNo mandando />`, con lo que devuelve `POST /impacto`
  (`{changes: [clases]}` para una pieza, o `{understood}` para un cambio de lo entendido). Una clase de cambio
  nueva va en `CLASES_DE_CAMBIO` y `CAMBIOS`, y en `t.momentos.cambios`, en los dos idiomas. Y si un momento deja
  elegir otra pieza que la de la manera, cerrar tiene que usarla: va en `elegir` y `piezasDe`, con `paraElCierre`
  como modelo. `rehacer.ts` y `mesa.ts` son el cimiento de los cuatro: no se tocan sin hablarlo.
- **Topes de partida**, del PM: veinte versiones y treinta investigaciones por viaje. No se borra nada.
- **Lo que no cuadra todavía con la hoja**, para el PM: un mensaje para un día rehace también al que cruza y al
  que explica (tres turnos, y la hoja dice uno); otro alojamiento rehace la búsqueda y mira a todos los finalistas
  que salgan, no solo al nuevo; y un viajero más rehace también los papeles y las miradas.

**La revisión de la tanda 5** (25-nov): tres adversarios en su copia; su informe, hallazgo a hallazgo, en
[revisiones/tanda-5.md](revisiones/tanda-5.md), y sus pantallas, con el viaje del ensayo cerrado de verdad, en
https://claude.ai/artifact/7Hi7Rv6reMNjkJH8rmGNfb. La seguridad, sin bloqueantes; la mecánica y las biblias, con uno
cada una, arreglados por dos sesiones de obra (`claude/eldorado-5r-cierre` y `claude/eldorado-5r-guia`) y juntos. La
batería pasó de 706 pruebas a 779. Lo que hay que saber de cómo quedó:

- **Un cierre es de una versión.** `guardarCierre` cierra la que dice su `elegido.json` y se niega si ya no es la que
  se enseña; seguir pide lo mismo; no se investiga con un cierre o una guía en marcha, y al empezar otra
  investigación el cierre que esperaba queda abandonado. Un cierre que no corre y no está acabado cuenta como
  parado (`etapaViva`), y se puede volver a cerrar.
- **La edad de un precio se mide al cerrar de verdad** (`Cierre.cuando`), y si al seguir ya caducó se vuelve a
  pedir, una vez por cada sí.
- **La guía sale del cierre**: el precio de hoy de cada pieza y los enlaces que respondieron (`PrecioDelCuaderno`,
  `EnlaceDelCuaderno`), y la puerta 10 lo compara contra `viaje.cierre` con sus propias cuentas. Lleva la versión
  de la mesa, no el número que el viaje lleva dentro.
- **Lo que gasta tiene tope** (`agent/data/frenos.ts`): de un viaje, tres guías y seis intentos de cierre al día,
  contados de su diario. Y el gasto de las guías cuenta en la cuenta (`deLasCarpetas`, en `gasto.ts`).
- **Comprobar un enlace no sale a la red de la casa**: solo páginas de fuera, y antes de llamar se mira a qué
  dirección lleva el nombre (`direccionDeDentro`), en cada salto. Cerrar del todo esa salida es del servidor.
- **Una palabra con mayúscula que no está en el viaje ya no es un rojo de la puerta 10**: queda como aviso en el
  `.puertas.json` del puesto. El código no distingue un sitio inventado de «Gótico»: eso es del revisor, por decidir.
- **La guía solo sale en inglés y en español** (`IDIOMAS_DE_LA_GUIA`), que son los idiomas con rótulos y palabras
  prohibidas; en otro, dice que todavía no está disponible en ese idioma, sin lanzar a nadie.
- **Lo que queda del PM**, entero, al final de ese informe: la puerta 8 frente a su fila de la hoja, qué precio
  manda, la marca de afiliado, los idiomas, lo de la guía y los números.

**La tanda 5** (25-nov). El PM dijo «Seguimos? Luego entro a la página a revisar», y la sesión lo leyó como el sí
para empezarla mientras él mira la 4, y se lo dijo así. Van dos sesiones de obra a la vez, cada una en su rama:
cerrar el viaje con sus enlaces (8.4 y 3.13, `claude/eldorado-8-4-cerrar-el-viaje`) y la guía (12.1 y 12.2,
`claude/eldorado-12-la-guia`), que parte de un viaje cerrado. Sus encargos dejan fuera lo que es del PM: la marca
de afiliado (3.9), la edad máxima de un precio, los dibujos de la guía (12.3) y cualquier dependencia nueva. Al
juntarlas: los tipos, la batería, las biblias, las capturas y los tres adversarios.

**Cerrar el viaje (8.4 y 3.13), junto** (25-nov). `POST /viajes/<id>/cerrar` (`{way, days, pace}`, o
`{prices: "go_on"}` para seguir cuando un precio subió mucho) y `GET /viajes/<id>/cierre`. Lo lleva
`agent/launcher/cerrar.ts`, por etapas que se retoman desde el disco, en `viajes/<id>/cierres/<k>/`: lo elegido (la
manera, y los días que tiene delante el viajero, que la web reparte con su ritmo y `conTusDias` comprueba que son del
viaje), los precios de hoy (el alojamiento, a su fuente; el vuelo, el mismo, a la suya), el sí del viajero si hace
falta, los enlaces, el orden y la puerta 8. Las cuentas, sin Node, en `agent/scripts/cierre.ts`; los números de
partida, en `agent/data/cierre.ts`; la puerta 8, en `agent/gates/puerta_cierre.ts`, que lo vuelve a contar todo desde
lo que dio cada fuente; la puerta 7 del orden, `puertaDelOrden`, en `puerta_explica.ts` (el contrato del que explica
tiene un modo de cerrar, con `in/closing.json` y la norma EX9); los enlaces, en `agent/tools/enlaces.ts`. El viaje
cerrado es una versión más (`Version.cierre`, motivo `closed`), con la ficha en `closed` y `viaje.cierre` (tipo
`Cierre`, en `agent/output/viaje.ts`): la manera, los precios de hoy con lo que cambió, el total, los enlaces con lo
que respondieron, los de Google Maps, el orden, los plazos de los papeles y lo que queda sin confirmar. En la web,
`web/src/piezas/Cerrar.tsx`: el botón en la manera elegida, la pregunta si un precio sube, y la pestaña «Reservar».
Sin IA se cierra igual, con el orden del código y sin frases. Al juntarlo se cerró el viaje del ensayo con su fuente
de verdad, sin IA: el precio de hoy llegó y el enlace respondió. De ahí: toda hora de una fuente se pasa a
veinticuatro horas (`agent/tools/horas.ts`; la de entrada llegaba como «03:00 PM» y se leía como las tres de la
madrugada); comprobar un enlace solo llama a páginas de fuera (`paginaDeFuera`), también tras una redirección; y el
enlace de otro vendedor se dice como tal (`other_seller`), con su precio del día que se buscó. La guía toma del
cierre la manera y los días. El precio de hoy es lo más barato que tiene la fuente, que puede ser de otra
habitación: `habitacionDeHoy` la compara por su nombre con la que se miró y, si es otra, queda sin confirmar
(`other_room`). En tres cierres seguidos del viaje del ensayo, la misma habitación fue de 261 a 281 euros: el precio
de la fuente se mueve de una llamada a otra, y eso hay que medirlo en el ensayo de la tanda 7. **Falta**: las frases
del que explica con IA de verdad; un viaje con vuelo; un freno a cerrar muchas veces; y lo que pasa en vivo, que la
web pregunta cada segundo.

**Lo que enseñó juntar dos ramas a la vez** (25-nov): las dos añadían al final de la hoja de estilos, y al juntarlas
una regla se quedó sin cerrar; la web dejó de pintarse con los tipos y la batería en verde. La batería cuenta ahora
las llaves de la hoja (`tests/code/web.test.ts`). Y `MAP.md`, donde las dos alargan el mismo renglón, se junta
palabra a palabra.

**La guía (12.1 y 12.2), junta** (25-nov). Con el viaje cerrado, `POST /viajes/<id>/guia` (`{way}`, y un techo si
se quiere) lanza al que escribe la guía: `agent/contracts/guide-writer/`, sin internet, con su material en
`agent/scripts/guia.ts` (el viaje, sus días con lo que dicen de cada parada sus fuentes abiertas, sacado del
`sitios.json` del run de esa versión, los tramos medidos como en la web, y lo que hay que llevar hecho; ningún
precio). La lleva `agent/launcher/guia.ts` (`pedirGuia`, `sigueLaGuia`, `llevarLaGuia`), con el adelante del viajero,
dos devoluciones como mucho y su gasto en sus `trabajos.json`. La puerta 10 (`agent/gates/puerta_guia.ts`) tiene dos
mitades: `puertaGuia`, sobre lo escrito (cada sitio, número y hora, del viaje; nombrar un sitio conocido que no es
del viaje, rojo; el dinero, rojo), y `puertaCuaderno`, sobre el cuaderno montado (cada foto con autor y licencia,
cada precio del viaje y con su fecha, enlaces https, y sus avisos). El cuaderno lo monta y lo pinta
`agent/scripts/cuaderno.ts`: una página que se basta sola, sin programas y sin letras de fuera, con las fotos
dentro, que se imprime en A5. Todo queda en `viajes/<id>/guias/<n>/` (`pedida.json`, `escrita.json`, `guia.json`,
`guia.html`), con la versión del viaje; si el viaje cambia, dice que se ha quedado atrás. La web: `/guide?trip=<id>`
(`web/src/app/(panel)/guide/page.tsx`), con el documento en un marco sin programas, «Imprimir o guardar como PDF» y
«Descargar»; y el paso a la guía desde el viaje cerrado (`web/src/piezas/TuGuia.tsx`). Al juntarla, quien orquesta
la miró en pantalla y como quedaría impresa, y retocó dos cosas: cada cosa de «lo que hay que llevar hecho» dice de
qué va con los datos del viaje (la parada, el papel), y no solo con la frase del asiento; y al imprimir, los dos
lados de cada doble página corren seguidos (de once hojas con varias casi en blanco, a ocho). Se probó también sobre
el viaje del ensayo, con el asiento de mentira: sale con sus catorce paradas y sus fotos de verdad dentro. **Falta**:
su primera guía con IA de verdad (un gasto: espera al PM); que el gasto de
las guías cuente en la cuenta (`gasto.ts` solo suma los runs); y un tope de guías por viaje. Al mirarla salió
también el autor de algunas fotos, que Commons da como una frase suya («No machine-readable author provided. Fulano
assumed»): desde el 25-nov el autor es el nombre de dentro, y sin nombre no hay autor (3.10, `agent/tools/sitios.ts`).

**Para cerrar la tanda 4 faltan tres cosas del PM**: el arranque (un botón o dos), si la frase del conductor se
enseña al viajero, y su visto bueno. La página de su revisión, con el ensayo pantalla a pantalla y esas dos
decisiones a la vista: https://claude.ai/artifact/XhWTz37RrGYU4gYHejZ77H. Sus capturas se sacaron sin gastar,
abriendo la mesa guardada del ensayo con una casa sin modelo ni cuenta, en ancho y en móvil, en claro y en oscuro.
Al mirarlas salieron dos fallos pequeños, arreglados (10.5 y 11.1): el reloj de cada suceso de la investigación, que en
segundos sueltos se partía en dos líneas (ahora «38 s» y, desde el minuto, «4:03»; `reloj` en
`web/src/lib/formato.ts`), y un correo largo, que se salía de su tarjeta en el móvil. Lo construido después del
ensayo («Volver a intentarlo», las fechas contadas, los papeles mientras se busca y los frenos) está probado con
asientos de mentira y no con IA de verdad: otro ensayo entero lo comprobaría, y espera el sí del PM.

Lo de antes, por orden: El 23-nov el PM dio el visto bueno a la tanda 2 («okay») y con él
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
pueda (Geoapify para andar y para el coche, y el enlace de cada trayecto; Google en vivo no se contrata). **Hecho
(3.14, una sesión de obra, revisada y junta el 24-nov)**: la tabla de caminos de cada viaje
(`agent/scripts/caminos.ts`, que deja `caminos.json` en el run; la cuenta de un trayecto con ella, en
`agent/tools/caminos.ts`, sin nada de Node). Viaja en `viaje.caminos`, y la usan las cribas, el ritmo y su puerta,
la puerta 9 y la web. Su tope es de 600 casillas por viaje (`CASILLAS_POR_VIAJE`, en `agent/data/moverse.ts`), que
da para unos cinco a nueve viajes al día con el plan gratuito; no se lleva la cuenta del cupo del día entre viajes:
si se acaba, la fuente falla y se sigue con la cuenta de la casa. `Fuentes.rutas` se enchufa en
`fuentes_de_verdad.ts` si la fuente está encendida y `GEOAPIFY_KEY` está en el entorno. Falta verlo en un viaje
entero de verdad.

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
certificados con todo el que la usa: con un subdominio del PM no pasa. **La tercera tanda (24-nov)**, con su
diseño escrito en el encargo, junta entera. Fueron: los caminos de verdad en la casa (3.14,
`claude/eldorado-3-14-caminos`: una tabla de caminos por viaje, a pie y en coche, con tope de casillas, que usan las
cribas, el reparto de los días y la web, y que cae a la cuenta de la casa si la fuente falta) y el que escucha (5.2,
`claude/eldorado-5-2-el-que-escucha`: las palabras del viajero aparte, su contrato, la mitad de IA de la puerta 1 y
la investigación esperando su confirmación). Y el buscador y el lector de webs (3.5,
`claude/eldorado-3-5-buscador`): un asiento dice en su contrato si sale a internet; busca y lee con las herramientas
de la propia IA (las de la API en la llamada directa; WebSearch y WebFetch en Claude Code); la casa guarda la
memoria de lo que se buscó y se abrió, y la puerta de todos da rojo a lo que cite una página que no se abrió. **La
cuarta tanda (24-nov)**: el conductor (2.5, `claude/eldorado-2-5-conductor`), ya junto, y el del calendario con el
de los papeles (5.3 y 5.4, en una sola sesión porque tocan lo mismo, `claude/eldorado-5-3-y-5-4-avisos`), ya
juntos también. Del conductor, la idea era que el acta del run la escriba el código y que el asiento
solo coja un rojo que su dueño ya intentó dos veces, para decirle al viajero en claro qué pasó y qué puede hacer.

**La cuenta del PM, estrenada (24-nov).** Su token está en el entorno de las sesiones. Una sesión auxiliar no pudo
lanzar las llamadas de prueba: el sistema de permisos pide que el sí al gasto lo haya dado el PM en la sesión que lo
gasta, y no vale que lo diga quien orquesta; no se rodeó. Al reiniciarse la sesión de siempre, que es donde el PM
dio su sí, ya veía el token, y las hizo ella: dos llamadas mínimas por Claude Code, una de texto (6 segundos) y otra
con una foto (la vio bien), a menos de un céntimo cada una según Claude Code. Queda comprobado que acepta las fotos
en una sola llamada sin herramientas, que la casa lee bien su respuesta y que funciona con un HOME vacío. **La
primera investigación entera con su cuenta** se lanzó ese día con `de_verdad.ts`, el viaje de Madrid a Lisboa del
12 al 15 de febrero y una guarda de 25 dólares, desde una copia limpia del código (`git worktree`) y con su mesa
fuera del repositorio. **Paró a los 10 minutos, en el que elige los sitios (puerta 9), tras sus tres intentos**, con
10 llamadas y el equivalente a 5,88 dólares: el de la ruta, 45 y 58 segundos y unos 0,25 cada intento; cada uno de
los cinco que miran alojamientos, unos 3 minutos y 0,75; el que elige los sitios, unos 2 minutos y 0,55 cada
intento. Trabajaron seis asientos a la vez sin problema. **Por qué paró: la forma de las notas, no lo que decían.**
La IA parte una nota en varias líneas (una lista colgando de ella, con la fuente y la etiqueta en la primera línea
o al final de todo), y la puerta de todos pedía una línea por nota: con esa lectura habrían dado rojo también los
cinco que miran. Además, el asiento devuelto no veía la línea que señalaba cada rojo, y al arreglar una cosa volvía
a caer en la otra. **Arreglado de forma general (2.4)**: la puerta lee la nota entera con lo que cuelga de ella
(`notasDe` en `agent/gates/puerta_metodo.ts`), y cada renglón de dentro que lleve su propia fuente se mira igual;
el contrato común lo dice más claro y pide el archivo con su extensión; y lo devuelto lleva la línea de cada rojo
(`conSuLinea` en `agent/launcher/investigar.ts`). Con la puerta nueva, de los diez puestos de ese run solo queda
en rojo el que lo estaba de verdad (citaba un archivo sin su extensión). **Se retomó donde paró, con el código de
ahora, y acabó con su viaje** (`de_verdad.ts sigue <run>`, tras quitar `parado.json`): 4 minutos y 41 segundos más,
con los caminos de verdad de Geoapify (298 casillas en 13 pedidos), dos rondas del que cruza, a la primera, y el
que explica, a la segunda (la puerta 7 le devolvió un «el más barato» a secas). **En total: 14 llamadas, unos 15
minutos y el equivalente a 6,86 dólares**; sin las tres vueltas que sobraban, unos 5,5 y unos 10 minutos. Más de
la mitad del gasto son los cinco que miran alojamientos (unos 0,75 cada uno). El viaje: cuatro días y quince
paradas, cinco alojamientos mirados (dos descartados por quejas de moho confirmadas), tres maneras entre 257 y
264 euros por las tres noches, tres palancas con su ahorro y ocho avisos. **Sin vuelos**: Aviasales no tiene
precios guardados para esas fechas, y el viaje dice que el precio es solo del alojamiento (3.7, del PM). **Lo que
enseñó además**: el que explica llamaba «puntuación» a la nota de la casa, y se leía como la de los huéspedes
(arreglado en su contrato, 4.7); y de ningún alojamiento se pudo confirmar si la habitación encaja con el grupo.
Un run empezado con el código de antes se retomó sin problema con el de ahora. La mesa de esa investigación está
en el borrador de la sesión, fuera del repositorio, y la web la enseña en seco con `ELDORADO_MESA` apuntando a
ella (su `grabado/` lleva el `viaje.json` y el `sucesos.json` del run); las capturas, en
`revision/capturas-11` del borrador.

**El ensayo entero desde la web, con la cuenta del PM (24-nov).** La casa local (del código de ese momento, en
una copia limpia), con su mesa aparte y el correo del ensayo en la lista de la casa; la web local contra ella; y un
guion que entra, busca Lisboa del 12 al 15 de febrero, contesta (sale de Madrid, puede mover las fechas, comer bien
y cultura, y escribe «con un gimnasio de verdad y que no sea ruidoso»), confirma y sigue la investigación en vivo.
Lo que pasó, con sus tiempos: el que escucha entregó en 30 segundos y la pantalla de confirmar enseñó sus dos
gustos con las citas, que nada chocaba y tres preguntas; se confirmó sin contestar. Los papeles (198 segundos) y el
calendario (138, y otra vuelta de 192 por citar una página que no abrió) trabajaron por detrás; nada bloqueó. La
ruta, a la primera; los cinco que miran, unos 3 minutos. **Se paró en el que elige los sitios, que no llegó a
contestar: el filtro de seguridad del propio modelo marcó su mensaje** (el aviso dice que a veces pasa con
conversaciones normales). El conductor salió por su otra salida, parar y contarlo, y la pantalla lo dijo: dónde
paró, que ese paso no acabó, su frase («por un fallo técnico») y los dos botones. Para seguir, quien orquesta
repitió ese asiento una sola vez y sin cambiar nada (quitó a mano la marca de parado y el apunte del trabajo
fallido, y siguió con `de_verdad.ts sigue`): pasó, y la investigación acabó con su viaje; el que cruza y el que
explica, a la primera. **En total: 15 trabajos, unos 18 minutos de trabajo y el equivalente a 7,19 dólares**; en
vueltas repetidas, solo 0,65. El viaje: cuatro días y 23 paradas, cinco alojamientos, tres maneras entre 227 y 262
euros, cuatro palancas, diez avisos, tres avisos de fechas con una ventana propuesta, y la tabla de los papeles
(dos en regla, dos avisos, una cosa que hacer y cuatro dudosas; nada bloquea). Mirado con capturas, en ancho y
claro y en móvil y oscuro (`revision/capturas-12` del borrador). **Lo que enseñó, por arreglar o por decidir**:
«Volver a intentarlo» empieza la investigación entera de cero y vuelve a gastarlo todo, cuando solo falló un
asiento: debería retomar donde paró. Los avisos de las fechas se ven solo como datos (la clase, el nombre, las
fechas y el enlace), sin la frase del asiento, y un evento que el viajero no conoce se queda sin explicar. Durante
los tres minutos de los papeles la pantalla en vivo está casi vacía. «Lo que ha gastado aún no se sabe» sale
mientras trabaja un asiento. En los papeles, lo dudoso va arriba aunque no importe (un español a Portugal). Un
viaje ya en el mapa, abierto sin `at=trip` en su dirección, enseña el mapa del mundo (el enlace de «Tus viajes» sí
lo lleva). La casa y la web locales quedaron paradas al acabar. **Lo que siguió (24-nov)**: tres adversarios
revisaron la tanda, cada uno en su copia y sin tocar nada (la mecánica, la seguridad y las biblias): su informe,
hallazgo a hallazgo y con lo que se hizo, en [revisiones/tanda-4.md](revisiones/tanda-4.md). Un bloqueante, de las
biblias (el arranque no es del todo el de la hoja: un botón o dos), que es del PM; lo demás, diecinueve importantes
y veinte menores, comprobado y arreglado con su prueba o dejado a su decisión. La batería pasó de 662 a 681. Lo
que cambió por la revisión: «en regla» pide dos sitios distintos o un dominio propio del gobierno del destino, y a
la pantalla solo llegan fuentes oficiales; una cita son palabras enteras; no puede haber más pasaportes que
viajeros; un asiento no abre direcciones de dentro de la red; un texto para el viajero no lleva direcciones sin su
esquema; el acta que se da al dueño son claves y números; la llave de la web no se escribe en el registro; la web
manda sus cabeceras; la frase del conductor no se enseña hasta que la firme el PM; y la batería mira que el estado
de un bloque del plan sale de sus puntos. Y con lo que contestó el PM, dos sesiones de obra más: que «Volver a intentarlo»
repita solo el asiento que falló (`claude/eldorado-2-5-reintentar`) y que los avisos de las fechas los cuente el
que explica, con una frase que pasa la puerta 7 (`claude/eldorado-5-3-avisos-contados`, ya junta). Y una tercera,
por la revisión de seguridad: los frenos de la puerta, de entrar y de registrarse (`claude/eldorado-2-8-frenos`).

**Los avisos de las fechas y los papeles (5.3 y 5.4), juntos** (una sesión de obra, revisada el 24-nov). Son los
dos primeros asientos con `INTERNET.md`: `agent/contracts/calendar/` y `agent/contracts/papers/`, con sus números
en `agent/data/calendario.ts` y `agent/data/papeles.ts`, sus comprobaciones en `agent/gates/puerta_calendario.ts`
(sin número en la hoja) y `agent/gates/puerta_papeles.ts` (la puerta 2), y lo suyo del run en
`agent/launcher/calendario.ts` y `agent/launcher/papeles.ts`. **La casa los lanza por detrás desde el principio y
no los espera**: `casa.ts` tiene `lanzarPorDetras`, `enSuTurno` (los pasos de un run se dan de uno en uno) y
`esperarLoDeDetras` (para las pruebas), e `investigar.ts` devuelve `porDetras`; lo de detrás no cuenta en los
asientos a la vez. A los papeles se les espera por su puerta 2 tras la búsqueda y antes de lo caro, que es mirar
cada finalista y elegir los sitios (el PM, 24-nov: antes era tras lo entendido, y la pantalla en vivo se quedaba
tres minutos quieta; el paso `papers` va ahora después de `search`):
si algo bloquea, o fallaron, o no pasaron su puerta tras sus vueltas, es el turno del viajero (el paso `papers` en
`yours`, sin gastar), que sigue con `POST /viajes/<id>/confirmar` y `{ "papers": "go_on" }` (`papeles-sigue.json`).
Al calendario se le espera solo al montar el viaje; si falta, el viaje se hace igual y lleva `falta`. En el run,
`calendario.json` y `papeles.json`; en el viaje, `calendario` y `papeles`, como datos: ninguna frase de estos
asientos llega a la pantalla, la pone la web por claves (`TusFechas` y `TusPapeles` en `Pantallas.tsx`, y los
papeles también en vivo, en `EnCasa.tsx`, con «Seguir igual»). Lo que ven: el destino, las fechas, el país de
salida y lo que se busca; los pasaportes y las edades; nunca quién viaja. Los países del viaje son hoy solo el
del destino; la escala no se pregunta hasta que haya transporte, y lo de menores solo por un menor. Los dominios
comunes de la Unión valen solo para sus países. **Al juntarlo se añadió**: a quien viaja por el país de su propio
pasaporte no se le pregunta nada (`esSuPais`), y si son todos, la tabla queda vacía y no se lanza a nadie. Los
dos chocaban con el conductor en `casa.ts` y en cuatro archivos de pruebas, y se resolvió a mano: el conductor se
llama antes de mirar lo de detrás, y las pruebas del conductor dejan fuera a los dos asientos de detrás. Y la
orden de la terminal (`de_verdad.ts`) espera a lo de detrás antes de acabar: si no, al salir cortaba al que aún
trabajaba y se perdía lo que había gastado. Un fallo
del calendario o de los papeles no para el run ni llama al conductor. Sin hacer: elegir otras fechas (el paso 14,
«Tú, las fechas»), enseñar los avisos de las fechas mientras se confirma, que el que explica lea los papeles, la
puerta 2 en el transporte y en los cambios, y cerrar el lector por dominios. Sin comprobar: nada con una IA ni
una búsqueda de verdad, ni lo que tardan por detrás; y dos casas sobre la misma mesa se pisarían, como antes. El
pie del commit del 5.4 de la sesión de obra lleva por error la dirección de la sesión que orquesta. Pendiente del
PM: los topes de los papeles (16 búsquedas y 24 páginas) y los números del calendario (5 avisos, 2 ventanas, 21
días); que un fallo de los papeles pare y le pregunte; el paso 14; y cómo saber qué dominio es oficial en
cualquier país (la sesión de obra propone, sin construirlo: dar por oficial el dominio del destino al que enlaza
la página de consejos de viaje del ministerio del viajero, y patrones de dominio de gobierno, revisados por una
persona). **Estrenados los dos, solos, con la cuenta del PM (24-nov)**, desde la terminal y con un techo de 30
céntimos para que no arrancara nada más (mesa aparte, fuera del repositorio): el del calendario, 7 búsquedas y 8
páginas en 134 segundos y unos 0,48 dólares de equivalente; el de los papeles (dos pasaportes españoles a
Portugal), 9 búsquedas y 7 páginas en 174 segundos y unos 0,64. Trabajaron bien y los dos dieron un rojo de forma,
ya arreglado de manera general. El de los papeles dijo en una nota que una web oficial no se abría, con su
dirección, como pide su contrato, y la puerta de todos lo tomó por citar una página sin abrir: desde entonces una
nota puede nombrar una página que se intentó abrir sin éxito (la casa lo sabe por la memoria de lo consultado), y
ningún dato de la entrega puede citarla (3.5). El del calendario puso una dirección de la web dentro de una frase
de lo que no sabe, y su puerta solo decía «no es una lista corta de frases»: ahora las tres puertas que miran
esas listas (calendario, papeles y el que escucha) dicen qué frase falla y por qué (`pegasDeFrases` en
`agent/gates/textos.ts`), y los tres contratos dicen lo que mide cada frase y que no lleva direcciones. Con las
puertas de ahora, la tabla de los papeles de esa prueba pasa entera (sin visado, en regla con dos fuentes; el DNI
o el pasaporte en vigor; la tarjeta sanitaria, como aviso; lo demás, dudoso por no encontrarlo en una web
oficial; nada bloquea) y al calendario solo le queda esa frase. Cada investigación entera gasta, por estos dos
asientos, alrededor de 1,1 dólares de equivalente más, y los papeles se esperan unos 3 minutos antes de buscar.

**Los avisos de las fechas, contados (5.3)** (una sesión de obra, revisada y junta el 24-nov; el PM dejó elegir la
manera: «lo que consideres»). Al que explica se le da `dates.json` (`fechasParaExplicar` en
`agent/scripts/explica.ts`: cada hallazgo con sus datos y el `what` del asiento, que para él es un dato y no una
orden, y cada ventana con lo que evita y alcanza), y al calendario se le espera antes de lanzarlo; si falta,
explica como siempre. Escribe `dates` en su entrega (su norma EX8); la puerta 7 (`pegasDeLasFechas`) cuenta una
frase por aviso y por ventana, mira sus números frase a frase, el nombre propio (lo que trae el `what` con
mayúscula, lo entrecomillado, el nombre de otro aviso) y que no abarate sin precio (`DE_ABARATAR` en
`agent/data/palabras.ts`). El viaje lleva `frase`, opcional, en cada aviso y cada ventana (`conSusFrases`), todas
o ninguna, y la web la enseña debajo del nombre. El `what` del calendario nunca llega a la pantalla. Un nombre que
el modelo invente de la nada, sin comillas, no lo caza el código: lo cubre quien revisa. Sin comprobar con una IA
de verdad: cuánto se equivoca, y cuántas vueltas le cuesta la EX8.

**El conductor (2.5), junto** (una sesión de obra, revisada el 24-nov). El acta del run (`agent/launcher/acta.ts`,
`acta.json` en el run) la rehace el código del disco: pasos, trabajos con su vuelta, tiempo y gasto, cada vuelta en
rojo, la parada con su clase, el total y lo repetido. La dejan `llevar` y `de_verdad.ts`, y la puerta la da a su
dueño (`GET /viajes/<id>/acta`) sin el porqué de los fallos. El conductor (`agent/contracts/conductor/`,
`agent/gates/puerta_conductor.ts`, `agent/launcher/conductor.ts`, sus listas cerradas en
`agent/data/conductor.ts`) se lanza una vez por run, con el adelante y bajo el techo, cuando un asiento para el run
en rojo tras sus vueltas o sin entregar. Ve el acta, cada vuelta con sus rojos y sus líneas, y el contrato de ese
asiento; del viajero, solo el idioma. Elige otra vuelta (la casa monta `<base>-v(N+1)` con el mismo material y su
indicación en `returned.json`, en `from_the_conductor`, y la vuelta pasa las mismas puertas; si vuelve a salir en
rojo, el run se para y ya no se le llama) o parar y contarlo (clase y salidas por claves, y su frase solo si pasa
la puerta de palabras y sin números). Si falla o desobedece, el run sigue parado. `llevar` lo llama solo; con
`conductor: false` no. La web lo dice en la pantalla del run parado (`EnCasa.tsx`): lo que pasó, «Volver a
intentarlo» y «Cambiar lo que pediste», que lleva a una búsqueda nueva. Sin hacer: «seguir sin esa parte» está en
la lista y no se ofrece nunca (ningún paso se puede saltar); la web no enseña el acta, solo se puede pedir; en el
móvil hay que desplazar la hoja para llegar a los botones. Que lo mire el adversario: la indicación del conductor
es texto de una IA que entra en el material de otro asiento (una línea, 400 letras). Pendiente del PM: si puede
hacer más (seguir sin una parte, cambiar un tope) y cuánto gasta; si su frase se enseña tal cual o solo las claves;
y si «Cambiar lo que pediste» debe reabrir las preguntas del mismo viaje. **Estrenado con la cuenta del PM
(24-nov), sobre una copia de la parada real de Lisboa** (la mesa de antes de retomarla): en 33 segundos y unos 19
céntimos de equivalente vio que los rojos de los tres intentos eran de forma, eligió la vuelta de más y escribió
una indicación precisa; con ella el que elige los sitios entregó bien a la primera (`sitios-v4`) y la investigación
siguió sola hasta su viaje. Por el camino, su propia entrega dio rojo en la puerta de todos por citar el método
común como fuente: desde entonces una nota puede citar un archivo de su contrato (2.4), y para volver a mirar su
entrega se puso a mano su `conductor.json` en `working`. El acta de ese run dice lo que se fue en vueltas
repetidas: 5 trabajos, 437 segundos y 2,09 de 7,64 dólares. Falta ver de verdad la otra salida (parar y
contarlo) y su pantalla en la web con un run de verdad. En esa investigación el que explica ya dijo la nota de la
casa como nuestra («le damos 6,9 sobre 10 para lo que pedís»), y volvió a caer en «el más barato» a secas, que le
cuesta una vuelta: su norma EX3 dice ahora que vale cada vez que la nombra.

**Los frenos de la puerta (2.8 y 11.1)** (una sesión de obra, revisada y junta el 24-nov; salen de la revisión de
seguridad de la tanda 4). Los números, en `agent/data/frenos.ts`, de partida y a firma del PM; las piezas, en
`agent/launcher/frenos.ts`: contar por ventanas sin vaciar la memoria de golpe, dejar pasar unas pocas
contraseñas a la vez y recordar desde qué clientes entró bien cada correo. La casa cuenta por cliente (el resumen
de su dirección que le manda la web, nunca la dirección), por cuenta y en toda la casa. El freno de entrar cuenta
el correo ya normalizado, el mismo con el que se entra, y va por correo y cliente: quien prueba desde un sitio
espera, y el dueño, desde el suyo, entra. Registrarse tiene freno y la casa, un tope de cuentas; las sesiones de
una cuenta, tope (al pasar, se cierra la más vieja); los viajes, tope en toda la casa; los oyentes, por viaje, por
cuenta y en la casa; y comprobar una clave, por cuenta. El buscador de lugares de la web lleva el suyo
(`web/src/lib/freno.ts`). Lo que no cubren: viven en memoria (al reiniciar, a cero); los topes de toda la casa los
puede agotar cualquiera, y entonces nadie entra un rato; registrarse con un correo que ya existe lo sigue
diciendo, mientras no se confirme el correo; y en Vercel el freno de lugares cuenta por cada copia del servidor.
Sin ver con la web contra la casa ni en el servidor.

**Volver a intentarlo retoma donde paró (2.5)** (una sesión de obra, revisada y junta el 24-nov; el PM, a la
propuesta: «si es un asiento, sin problema»). `agent/launcher/reintentar.ts`: `reintentar` apunta la pulsación en
`reintentos.json` y monta la vuelta siguiente del puesto que paró el run, con el run aún parado (el mismo
material; con lo devuelto, si entregó en rojo); `aplicarReintento`, que llama `llevar`, quita la parada mientras
esa vuelta no ha empezado. Así un corte en medio no deja nada a medias. La ruta es `POST /viajes/<id>/reintentar`:
solo su dueño, nunca en marcha, con la misma cuenta o clave. La casa dice `resumes` en la parada, y la web elige
con eso entre retomar y empezar otra vez. Tope: `REINTENTOS_POR_RUN = 3`; en el tope queda cambiar lo pedido. Tras
un reintento del viajero no se llama al conductor. Si la paró la casa, sigue donde se cortó. En vivo, el suceso
`retry`; en el acta, cada pulsación y lo que costó. No se rodea el filtro del modelo: se repite tal cual, y solo
cuando lo pide el viajero. Sin hacer: en el techo de gasto empieza otra vez (del PM); «nada que elegir» y «un
viaje que aún no se sabe hacer» no ofrecen repetir. Visto de paso por la sesión de obra, sin arreglar: la web
avisa de una clave repetida en los pines cuando dos maneras duermen en el mismo sitio, y con muchas pestañas sobre
un viaje la escucha en vivo se queda quieta sin decirlo.

**El buscador y el lector de webs (3.5), juntos y estrenados** (una sesión de obra, revisada el 24-nov). Un
asiento sale a internet si la carpeta de su contrato lleva `INTERNET.md`: solo entonces recibe `common/WEB.md`
(W1 a W7), sus topes (`agent/data/internet.ts`: 8 búsquedas y 12 páginas de partida, que se pueden cambiar asiento
a asiento) y las dos herramientas de la propia IA: en la llamada directa, el buscador y el lector de la API con su
tope por llamada, siguiendo tras cada pausa hasta 6 vueltas; con Claude Code, WebSearch y WebFetch, y la casa
cuenta lo que pide según llega y lo corta al pasar de su tope. Lo que buscó y lo que abrió lo saca la casa de lo
que devuelve quien piensa y lo guarda en `consultado/<puesto>.json` del run, sin lo que decían las páginas
(`agent/launcher/consultado.ts`). La puerta de todos da rojo a la nota que cite una página que no se abrió, y al
dato de la entrega que lleve una dirección que ni se abrió ni venía en su material; un resultado del buscador no
es una fuente. En una vuelta de más (25-nov), lo que se le devuelve (`in/returned.json`) no cuenta como su
material, y sí lo que abrió en sus vueltas de antes (`leerConsultadoEnSusVueltas`): corregir no obliga a abrir otra
vez la misma página, y una que escribió sin abrirla sigue en rojo. Un asiento sin internet que sale, o uno que pasa
de sus topes, no entrega. A un asiento con internet
no se le manda un material con un correo o una clave; que no salga un nombre propio depende de su material, y lo
tiene que mirar el adversario. Las búsquedas cuentan en el gasto (0,01 dólares cada una en la llamada directa).
Estrenado con la cuenta del PM (una búsqueda y una página, 23 segundos, unos 5 céntimos de equivalente): lo que
devuelve Claude Code tiene la forma que se esperaba. Sin comprobar: la llamada directa con internet; que el corte
llegue antes de que se haga lo que pasa del tope (es una carrera); y, si se corta, lo gastado no se sabe. Con
Claude Code, el lector no devuelve la página entera sino lo que otro modelo saca de ella, y abre cualquier
dirección; se puede cerrar por dominios si el PM quiere. Los números los firma el PM.

**El que escucha (5.2), junto** (una sesión de obra, revisada el 24-nov). Lo que escribe el viajero va en `said` de
lo entendido; `agent/launcher/escuchar.ts` lleva el primer paso: sin palabras no se lanza; con ellas, el que escucha
(`agent/contracts/listener/`) entrega y pasa la puerta 1 (`agent/gates/puerta_escucha.ts`), y el run espera al
viajero (paso `yours`, `waiting_for_you` y `heard` en lo que cuenta la puerta) sin gastar.
`POST /viajes/<id>/confirmar` confirma, corrige o contesta, y la casa sigue sola. Lo confirmado queda en
`escuchado.json` y pasa a lo entendido del run y del viaje. Los demás asientos no ven `said`. En la web,
`web/src/piezas/Confirmacion.tsx`, dentro de la pantalla en vivo. **Estrenado con la cuenta del PM y unas palabras
inventadas (24-nov)**, desde la terminal: entregó a la primera en 56 segundos (unos 16 céntimos de equivalente) y
pasó la puerta 1, con dos límites, tres gustos, lo reservado, un choque (vuelos ya comprados con fechas que se
pueden mover) y dos preguntas; el run quedó en el turno del viajero sin gastar más. La orden de la terminal dice
entonces que es el turno del viajero (arreglado al juntar el 2.5; antes decía «Sin acabar. Esperan: nadie»).
Pendiente: verlo entero desde la web, con la confirmación, y la firma del PM a enseñar la
pregunta del asiento tal cual la escribe.

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

1. Leer el `CLAUDE.md`, esta memoria por su «Estamos aquí» y su «Lo siguiente», y [obra.md](obra.md).
2. Trabajar en la rama de la sesión; mirar antes si otra rama `claude/...` va por delante (el 26-nov, ninguna:
   todas están juntas en la de todos).
3. `npm install` y la batería (`node tests/bateria.mjs`): tiene que salir en verde antes de tocar nada.
4. Para ver una búsqueda de verdad: la orden del `README.md`, con `NODE_USE_ENV_PROXY=1` delante en la nube. Para
   mirar sus finalistas: `mirar.ts preparar`, lanzar cada asiento con su orden (un asiento por puesto, que lea su
   `contract/README.md` y escriba solo en su `out/`) y `mirar.ts recoger`.
5. Si hace falta el método, leer la hoja del ensamblador en `aurora-web`.
6. Antes de lanzar algo nuevo que gaste (otra fuente de pago, un run del agente), el visto bueno del PM.
7. Después de cada subida, mirar que la batería de GitHub sale en verde, y no fiarse solo de la de aquí: en la nube
   se trabaja como administrador, y lo que escribe fuera de su carpeta pasa aquí y falla allí. Pasó el 24-nov: una
   prueba del lanzador montaba un puesto suelto y la casa guardaba su respuesta dos carpetas más arriba, en la raíz
   de la máquina; la batería de GitHub estuvo en rojo 63 subidas sin que nadie la mirase. Desde el 25-nov, lo que la
   casa guarda de un asiento fuera de su puesto solo va al run del que cuelga (`runDe`, en
   `agent/launcher/puesto.ts`), y de un puesto suelto no se guarda nada.
