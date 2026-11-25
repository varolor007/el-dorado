# La revisión de la tanda 6 bis: las capas del destino

Al juntar la obra de la tanda, el 25-nov-2026, la revisaron tres adversarios que no la hicieron, cada uno en su copia
del repositorio y sin tocar nada: solo informar. Miraron todo lo que hay desde que el PM firmó las capas: su suelo
(14.1), el de moverse (14.2), el que conoce el destino (14.3), el de las entradas (14.4), el presupuesto entero
(14.5), su web y su guía (14.6) y los demás momentos (14.7), hechos por once sesiones de obra, casi todas a la vez y
sin verse, y juntados después por quien orquesta. Cada hallazgo se comprobó leyendo el código o con una prueba
suelta, y lo que se arregló lleva su prueba en la batería, que pasó de 971 pruebas a 1.035. Los arreglos
los hicieron cuatro sesiones de obra, cada una en su rama: cada una vio fallar su prueba antes de arreglar. Aquí
queda cada hallazgo con lo que se hizo. Lo que toca a la hoja, y por tanto es del PM, va al final.

Nada de la tanda se ha visto con IA de verdad: es un gasto, y espera el sí del PM. De las fuentes de verdad solo
contestó bien Wikidata; el servicio de lectura de OpenStreetMap casi nunca contestó desde la nube donde se trabaja.
Se ha mirado en la web con una casa de mentira (la puerta de verdad, el caso inventado y asientos que no piensan), con
una fuente de rutas inventada que alarga lo que se anda, para que haya tramos que no se andan, y con el viaje de
verdad del ensayo, que es de antes de las capas y lo dice. Sus pantallas, en ancho y en móvil, en claro y en oscuro,
van en la página de la revisión, que se publica al cerrarla.

Antes de los adversarios, al juntar las ramas y mirarlas en la web, quien orquesta encontró esto:

| Qué pasaba | Qué se hizo |
|---|---|
| En una vuelta de más, la entrega que se le devuelve a un asiento contaba como su material: una página que había escrito sin abrirla pasaba la puerta de todos. Lo vieron dos sesiones de las capas | Lo devuelto no cuenta como material, y sí lo que el asiento abrió en sus vueltas de antes, con su prueba (3.5). Tocaba a todo asiento con internet |
| El presupuesto y el de moverse se hicieron a la vez y sin verse: «moverte allí» salía siempre «no se sabe», porque nadie había enchufado la cuenta de sueltos y abonos | Enchufada al juntar, con su prueba |
| La web, la guía y el presupuesto contaban cada una por su lado el precio del grupo y los trayectos que no se andan: siete cifras podían salir distintas en dos sitios | Una sesión de obra las unió (14.6): una sola cuenta, la del presupuesto, y la tarjeta, la ficha, cada tramo, «Allí», las cuentas y la guía dicen lo mismo |
| El de las entradas leía OpenStreetMap por su API, que es la de editar y no admite usos de solo lectura, y buscaba por nombre en su buscador, que prohíbe las consultas sistemáticas. Se vio al leer sus condiciones | Se lee por Overpass, su servicio de lectura, con una consulta por tanda y solo etiquetas (14.4). Las condiciones, en `condiciones.md` |
| El techo de gasto: una capa cortada sin decir lo que gastó paraba un viaje que podía salir sin ella. El PM lo señaló | El lanzador dice lo gastado al cortarse (14.7). Con la clave de un viajero el viaje sigue y el techo se mira con lo gastado más una cota pequeña; con la cuenta de Claude de la casa, que cortada no dice lo que costó, sigue como antes |
| «Quién te responde» no tenía fila para «Allí», y la prueba dejaba fuera a los asientos de las capas | Tres filas nuevas, donde se lee y no se escribe, como dice la fila de «Allí» de la web |
| La guía de un viaje con un día sin paradas no salía: el contrato del que escribe no decía qué hacer con un día libre, su título llegaba en blanco y la puerta 10 lo paraba tres veces | El material marca el día libre, el contrato dice qué se escribe (GW10), la puerta 10 no le deja meter paradas y el cuaderno lo pinta sin croquis, con su prueba (12.1) |
| En el móvil, con el viaje cerrado, las seis pestañas no cabían y la última se veía cortada | Caben a 390 de ancho; en uno más estrecho la fila se desliza y su borde se desvanece mientras quede algo por ver (14.6) |
| Al cerrar, el aviso de una parada que cierra enseñaba la fecha en crudo («2027-03-06»), y un tramo que solo se hace en coche decía «en coche; en coche» | La fecha, dicha como las demás; el tramo, sin repetir (14.6) |
| Un tramo que solo se hace en coche contaba un billete de transporte en «moverte allí» | Solo lleva billete el tramo que tiene transporte entre sus maneras; el de solo coche falta en la cuenta, sin inventar lo que cuesta, y lo dicen igual el presupuesto, «Allí», cada tramo y la guía (14.5) |
| En el cuaderno de la guía: un día titulado «unknown», una línea repetida en «Cómo moverte», un título montado sobre una lista, y la web de un sitio sin decir que es la de los datos abiertos | Ningún día se titula «unknown», y la puerta 10 da rojo a un título así; llegar a donde duermes enseña solo las maneras que van a tu zona, o cada una con la suya; las fuentes de allí van en su bloque; y la web de un sitio dice si es la de los datos abiertos, con la puerta 10 mirándolo (12.1 y 12.2) |

## La mecánica: lo que se rompe

Dos bloqueantes, arreglados.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1 | Un adulto cogía un precio que solo vale para unas edades. La cuenta le ponía a un adulto cualquier precio «de adulto» o «de cualquiera», sin mirar si decía edades, y elegía antes lo gratis: con «adulto, 20» y «de 0 a 5, gratis», dos adultos entraban gratis. Era la cuenta única: lo enseñaban el presupuesto, la tarjeta y la ficha de una parada, «Allí» y la guía. Lo vio también el adversario de las biblias | A un adulto, del que no se sabe la edad, solo los precios que no dicen edades; si todos las dicen, no se sabe, y se dice. Una sola regla, `preciosParaUno`, para las entradas, llegar y los billetes (14.5), con las tres trampas en su prueba |
| B2 | El taxi salía distinto en «Allí» y en las cuentas: la lista de llegar lo ponía por persona y el presupuesto por coche. Un taxi de 50 para cuatro: 200 en un sitio y 50 en el otro | Una sola cuenta de cada manera de llegar, `loQueCuestaLlegar`, que usan el presupuesto y «Allí»: lo que se paga por coche se dice por coche, y cuántos hacen falta (14.6) |
| I1 | Llegar a donde se duerme contaba un trayecto a otra zona como si fuera la tuya: si ninguna manera iba a tu zona pero todas iban a una misma, valían todas | Eso solo vale si el alojamiento no dice su zona; si la dice y ninguna va a ella, no se sabe (14.5). El caso inventado escondía el fallo, y ahora trae una manera de llegar a cada zona |
| I2 | Una capa que la casa cerraba por cortada al volver no llevaba su cota, y con techo paraba la investigación | La misma regla en los dos caminos, `cotaDelTrabajo` (14.7) |
| I3 | El techo se podía pasar con lo que corre a la vez: lo que estaba trabajando contaba cero hasta acabar | Lo que trabaja cuenta según lo va diciendo su lanzador, con la cota de su vuelta en marcha; si se llega al techo, las capas en marcha se cortan y no se lanza más (14.7). Con Claude Code, que no dice nada por el camino, sigue como antes |
| I4 | Dos reglas para el precio de un niño: en las entradas, sin precio suyo pagaba el de adulto; en moverse quedaba sin saber, y «moverte allí» de cualquier familia salía «no se sabe» | Una sola regla, la del presupuesto (14.5). Cuál se coge si valen varios no cambia y queda en un solo sitio, `SI_VALEN_VARIOS`: es del PM |
| M1 | El lector de horarios aceptaba horas imposibles, de 24:01 a 24:59 | Solo «24:00» vale como las 24 (14.4) |
| M2 | Dos formas muy corrientes de OpenStreetMap daban «no se sabe»: «Su,PH off» y dos tramos de horas con espacio tras la coma | Las lee, sin adivinar nada de lo que antes dejaba sin saber (14.4) |
| M3 | Un fallo pasajero de los datos abiertos quedaba guardado para toda la investigación, y Wikidata podía tardar cinco minutos antes de lanzar al asiento | Un fallo entero no se guarda como respuesta y se vuelve a pedir; Wikidata, dentro del tope: dos minutos en total (14.4) |
| M4 | Una capa que entregaba sin decir lo que gastó bloqueaba el techo igual | Misma regla que la cortada (14.7) |

Lo que miró y está bien: la cuenta de moverse (sueltos, abonos de varios días con días salteados, bonos, mezclas, cambio
de año), que da siempre lo mismo; que la casa, el cierre y la web reparten los días con lo mismo que cierra; lo
abierto en otras vueltas; las entradas de antes, que solo se conservan con el mismo destino y las mismas fechas; y
Overpass, que deja lo cortado a medias y no cruza objetos de otro sitio.

## La seguridad: lo que deja pasar lo que no debe

Un bloqueante, arreglado.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1 | Una página que el asiento nunca abrió podía llegar al viajero como fuente, como «dónde reservar» o como web oficial. La puerta de todos solo encontraba direcciones con su forma corriente, y las puertas de las capas daban por buena cualquiera que un navegador sabe abrir: una dirección escrita sin sus dos barras, con una sola, o partida por un salto de línea, pasaba sin haberse abierto, y la web la ponía en un enlace. Le bastaba a una página con órdenes escondidas. Además, dónde reservar y la web oficial no se comparaban con lo abierto | Un enlace de fuera solo vale escrito en su forma normal, y se guarda y se pinta esa; la puerta de todos mira cualquier cosa que un navegador abriría como una dirección, en cada texto de la entrega y en cada renglón de las notas; y en la puerta 13, dónde reservar y la web oficial tienen que ser una página que el asiento abrió o la que dicen los datos abiertos de ese sitio (3.5 y 14.4), con cada trampa en su prueba |
| I1 | La regla del presupuesto entero de las puertas 6 y 7 se esquivaba con otras palabras («all told, the trip costs you», «el viaje te sale por») | Más maneras de decirlo en los dos idiomas que tiene, sin romper las frases del total de una manera (14.5). En otros idiomas sigue sin mirar: está apuntado para el PM |
| I2 | El botón de las entradas rehacía el presupuesto pero no lo que ya se había dicho de él: una frase con la cifra de antes podía salir junto a una cuenta nueva | Lo ya dicho se vuelve a pasar por su puerta con la cuenta nueva, y el que no pasa se rehace; el impacto lo dice y lo cuenta antes de gastar (14.7) |
| I3 | El techo no contaba lo que gastan las capas mientras trabajan | Es el I3 de la mecánica, arreglado con él |
| I4 | La web que dicen los datos abiertos de un sitio se enseñaba como «su web oficial» y podía ser el enlace a las entradas al cerrar; OpenStreetMap y Wikidata los edita cualquiera | El viaje dice si la web es la de los datos abiertos; se enseña como tal, y al cerrar solo vale la que el asiento abrió (14.4) |
| M1 | La dirección del servicio de lectura de OpenStreetMap admitía la propia máquina o una red de dentro, y las llamadas seguían redirecciones | Solo direcciones de fuera, mirando a dónde lleva su nombre, y sin seguir redirecciones, tampoco en Wikidata (14.4) |
| M2 | La puerta 12 dejaba pasar, fuera de lo de comer, nombres de negocios y canales («reserva con los taxis de Juan», «escribe por WhatsApp», un teléfono dicho con palabras) | Sin canales ni direcciones dichas con palabras en ninguna clase, y sin negocios con nombre tampoco en «evitar» y en «lo práctico» (14.3). Lo de los negocios es una regla nueva, puesta con lo más prudente: es del PM |
| M3 | La puerta 13 solo miraba las páginas de la vuelta actual, y la de todos, las de todas: corregir citando una página de la primera vuelta gastaba otra | Miran lo mismo (14.4) |
| De paso | Lo que busca el viajero, con sus palabras, llegaba a dos asientos con internet: el que conoce el destino y el del calendario | Solo les llega lo que sea de la lista fija de lo que se puede buscar, nunca sus palabras (14.7) |

Lo que miró y está bien: a Wikidata y a Overpass solo van identificadores, números y puntos de los sitios, todos
validados, y nada del viajero; de OpenStreetMap solo se guardan etiquetas; las capas reciben el destino, las fechas,
el idioma y la moneda, sin nombres ni correos; el cuaderno lo escapa todo; la web pinta los textos como texto y sus
enlaces no dan al otro sitio el control de la pestaña; el botón de las entradas es solo de su dueño, con su adelante,
su tope y su impacto antes de gastar; y en lo añadido no hay ninguna clave, ningún identificador de modelo ni datos
de verdad de ninguna fuente.

## Las biblias: si es lo que dicen la hoja y el plan, y si es general

Un bloqueante, el mismo B1 de la mecánica, arreglado.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | Las comidas no decían que son por persona ni que son una cuenta: un grupo de cuatro leía lo de uno como lo del grupo, con la fuente al lado como si fuera un precio de la página | «Al día por persona», dicho como cuenta (cuántas comidas y de qué precio sale) y, para el grupo, dicho como tal (14.6) |
| I2 | El que cruza esperaba a las capas para tener el presupuesto delante, y la hoja firmada dice que van por detrás y sin frenar el viaje | No espera a nadie: si las capas ya acabaron lleva el presupuesto, y si no va sin él y no puede decir ninguna cifra del total (14.7) |
| I3 | Las listas de palabras de las puertas 11 y 12 solo están en inglés y en español, y los asientos escriben en el idioma del viajero: una frase en alemán con un restaurante con nombre y una garantía llegaba a «Allí» y a la guía | En un idioma sin sus listas, las frases del que conoce el destino no llegan a la pantalla ni a la guía; los datos sí, y la web dice que esa explicación todavía no está en ese idioma, como se decidió para la guía (14.3) |
| I4 | La hoja daba por probados los datos abiertos con su fuente de verdad, y el servicio de lectura de OpenStreetMap casi nunca contestó | La hoja dice lo que es: Wikidata, sí; OpenStreetMap, casi nunca desde la nube donde se trabaja |
| I5 | El plan y la hoja iban atrasados en seis sitios: el «Estamos aquí», lo que faltaba del 14.5 y del 14.6, la fila de «Allí», la de la puerta 13 y las cajas del de las entradas en el día a día y en los cambios | Al día, en su commit |
| M1 | «Pendientes» preguntaba si otro idioma vuelve a lanzar al que conoce el destino, y la casa rechaza cambiar de idioma | Quitado de «Pendientes» y dicho en el código (14.7) |
| M2 | Faltaban en «Pendientes» cuatro decisiones de las sesiones que eran del PM | Apuntadas |
| M3 | El día en que se vio una página no se medía igual en las tres puertas: en la 12 y la 13 pasaba un precio «visto» hace años | En la 13, hoy con un día de holgura, como en la 11 (14.4). En la 12 se queda: su contrato deja poner la fecha que da la página, y cambiarlo es del PM |
| M4 | Cabos sueltos: dos archivos sin nombrar en el mapa, la memoria que se contradecía con el aviso de Overpass, la receta de una capa que olvidaba dos archivos del contrato, y una función sin uso | Arreglados; la función, quitada (14.5) |

Lo que miró y está bien: cada commit lleva su número; no hay identificadores de modelo ni caracteres prohibidos en lo
añadido, ni dependencias nuevas; los tres contratos tienen sus cinco archivos y sus reglas casan con su puerta, y
también las normas nuevas de los que ya había (CR10, EX10, GW3 y GW9); y las condiciones de OpenStreetMap, Overpass y
Wikidata están en `condiciones.md`.

## Lo que se sabe y sigue sin arreglar

- Con la cuenta de Claude de la casa, el techo de gasto se trata como antes: un asiento cortado no dice lo que costó,
  y lo que corre a la vez no se ve hasta que acaba. La web no pone techo, así que hoy no para ningún viaje.
- Desde la nube donde se trabaja, ninguna instancia pública de Overpass contestó bien de forma fiable. Sin él, el
  horario de los datos abiertos no se sabe, se dice, y el asiento lo lee de la web del sitio.
- Quitar o mover una parada cambia la cuenta sin rehacer a nadie, y el porqué de cada manera sigue dicho con la
  cuenta de antes.
- En la puerta 12, lo visto solo tiene que no ser después de hoy.
- La regla de los negocios con nombre de la puerta 12 puede dar algún rojo falso, que gasta una vuelta.
- La regla del presupuesto entero y las listas de palabras de las puertas solo miran inglés y español.
- El viaje no distingue en cada sitio si no se miró por el tope o por un fallo de su tanda cuando hay otras que sí
  entregaron: lo dice el aviso de la investigación.
- Por dónde se llega sale de lo que pidió el viajero, no del transporte elegido; y cómo se va de una base a otra se
  guarda, pero aún no se enseña.
- Lo que te pierdes en autobús, que la hoja nombra para la guía, sigue sin hacer.

## Lo que queda a decisión del PM

Entero, en `decisiones.md`, en «Pendientes». Lo que más pesa de esta tanda:

- **Qué instancias de Overpass se usan** para leer OpenStreetMap: la principal pide que lo comercial vaya a una
  propia o de pago, y desde esta nube no contesta; hay otras dos públicas de alcance mundial y varias con clave.
- **Si en el ensayo se prueba a cortar a Claude con cuidado** para que diga lo gastado: es lo que haría valer el
  techo con la cuenta de la casa, no está documentado y no se puede probar sin gastar.
- **Qué precio se coge si valen varios**: hoy, el más barato en las entradas y en llegar, y el más caro en los
  billetes. Y que un niño sin precio suyo pague el de adulto también en los billetes.
- **Los números de partida**: los topes de cada capa, dos comidas de pago al día, un taxi para cuatro, 1.200 metros
  y tres sitios por día para comer, y el botón de las entradas (ocho sitios, tres veces al día).
- **Que en «evitar» y en «lo práctico» no se nombre ningún negocio**, y si en la puerta 12 lo visto tiene que ser
  de hoy.
- **Si un blog o un agregador vale como fuente de un precio**, y si «dónde reservar» puede ser un revendedor.
- **Que el que escribe la guía vea los precios de allí**, cuando la hoja decía que no veía precios; y si en «Allí»
  se puede escribir un mensaje: hoy solo se lee.
- **Si se recomiendan sitios concretos donde comer**, que pide una fuente de opiniones.
- **Verlo con IA de verdad**: es el ensayo de la tanda 7, que gasta y espera su adelante.
