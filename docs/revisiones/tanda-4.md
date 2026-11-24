# La revisión de la tanda 4: la casa en vivo y tu cuenta

Al acabar la obra de la tanda, el 24-nov-2026, la revisaron tres adversarios que no la hicieron, cada uno en su copia
del repositorio y sin tocar nada: solo informar. Miraron todo lo que hay desde el cierre de la tanda 3. Cada hallazgo
se comprobó leyendo el código o con una prueba suelta, y lo que se arregló lleva su prueba en la batería, que pasó de
662 pruebas a 681. Aquí queda cada hallazgo con lo que se hizo. Lo que toca a la hoja, y por tanto es del PM, va al
final. Los frenos de la puerta, que son un trozo de obra, los hace una sesión aparte: cuando se junten, se apunta aquí.

Ninguno de los tres encontró una clave, un dato de un viajero, lo que devuelve una fuente ni un identificador de modelo
en el repositorio o en sus commits.

## La mecánica: lo que se rompe

Sin bloqueantes.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | Si la casa se corta con un asiento trabajando y el run tiene techo, al retomar no se sabe lo que gastó ese asiento y el run para en «el gasto» | No se cambia: no seguir a ciegas es lo prudente. Se retoma sin techo desde la terminal, y la web no pone techo. Queda dicho |
| I2 | Una nota que dice que lo vio, con una página que se intentó abrir y no se abrió como única fuente, pasa | Se deja, y por qué: es lo que escribe un asiento honrado para decir que una web no se abría, y así lo pide su contrato. Una página que no se abrió nunca vale como fuente de un dato de la entrega, que es lo que llega a alguna parte |
| I3 | «En regla» valía con una sola página de un dominio común de la Unión, y dos páginas del mismo sitio contaban como dos fuentes | Dos fuentes son dos sitios distintos, y el gobierno del destino es un dominio propio de ese país; el asiento sabe cuáles son comunes (5.4) |
| I4 | Un plazo que ya no se llega a cumplir (un visado que se pide con treinta días, a siete del viaje) no para nada | Del PM: está al final |
| I5 | Con más pasaportes que viajeros, los que sobran se perdían sin avisar | La puerta 1 da rojo (5.2). Cómo se dice una doble nacionalidad, del PM |
| I6 | Una cita de una sola letra pasaba por estar «letra a letra» en casi todo | Una cita son palabras enteras, con dos letras al menos, en cualquier escritura (5.2) |
| M1 | Una dirección puesta como nombre de un campo de la entrega, o escrita con `www` y sin esquema, no se miraba | Se miran las dos (2.4 y 3.5) |
| M2 | «Todo el material» (`in/`) valía como fuente de una nota; y una lista colgada de una nota no lleva etiqueta propia | La raíz del material o del contrato ya no vale (2.4). Lo que cuelga de una nota es la misma nota: es lo que se decidió tras la primera investigación de verdad, y se queda |
| M3 | De una nota larga, al asiento devuelto se le enseñaba solo el principio | Se le enseñan el principio y el final (2.4) |
| M4 | Dos casas llevando el mismo run desde dos procesos se pisarían | Queda dicho. La puerta de la web lo evita; la orden de la terminal es de quien la lanza a mano. Un candado en el run, pendiente |

## La seguridad: lo que deja pasar lo que no debe

Sin bloqueantes comprobados.

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| I1 | El freno de entrar se saltaba escribiendo el correo con letras de otro ancho, y se vaciaba entero con muchos correos fallados | En obra, con los frenos de la puerta |
| I2 | La llave de la web se escribía en el registro del contenedor en cada arranque, y los correos de la casa también | La llave ya no se escribe al arrancar: la dice `casa.sh vercel` a quien la pide en el servidor. De los correos sin cuenta se dice cuántos, no cuáles (2.9) |
| I3 | En una casilla dudosa de los papeles podía ir una página de cualquier sitio, y llegaba a la pantalla como un enlace junto a «visado» | Al viaje y a la pantalla solo llegan las fuentes oficiales de nuestra lista (5.4) |
| I4 | Registrarse no tenía freno, y cada registro cuesta un cálculo caro: se podía retrasar la casa o llenar su disco | En obra, con los frenos de la puerta |
| I5, sospecha | El lector de webs de Claude Code corre en la máquina de la casa: una página podría pedirle a un asiento que abra direcciones de dentro de su red | La casa corta al asiento que pide abrir algo que no sea una página https de fuera, con su nombre y sin puerto, y el contrato lo dice (3.5). Falta cerrar en el servidor la salida del contenedor a redes privadas: va con la instalación |
| M1 | El nombre de un aviso de fechas, que llega a la pantalla, podía traer una dirección sin su esquema o un teléfono | Ya no (4.7) |
| M2 | Solo se reconocían trece terminaciones de dirección en los textos para el viajero | Se reconoce cualquier terminación general o de país (4.7) |
| M3 | Al dueño se le daba el acta casi entera: nombres de asientos y puestos, el porqué de cada rojo y lo que el conductor escribe para la casa | Solo claves y números (2.5) |
| M4 | La web no mandaba cabeceras de seguridad: otra página podía meterla en un marco | Las manda (2.9) |
| M5 | El tope del primer vistazo en toda la casa se agota con cinco direcciones | Los números son del PM: está al final |
| M6 a M9 | Registrarse dice si un correo ya existe, y cinco fallos dejan fuera a su dueño; los oyentes en vivo, la comprobación de claves y el buscador de lugares no tenían freno propio | En obra, con los frenos de la puerta |

Visto y sin pegas: la llave se compara en tiempo constante; las sesiones se guardan como huella; la clave de IA va
cifrada y atada a su cuenta; los identificadores se validan; la web solo deja pasar sus rutas; la imagen corre sin
root y de solo lectura; y Claude Code recibe un entorno por lista, y su token se tapa en los errores.

## Las biblias: si es lo que dicen la hoja y el plan, y si es general

| Hallazgo | Qué pasaba | Qué se hizo |
|---|---|---|
| B1, bloqueante | El arranque no es del todo el de la hoja: hay un botón que abre las preguntas y otro que confirma y lanza, y nada de la investigación buscaba hasta confirmar y acabar los papeles | Una parte se arregló ese mismo día por decisión del PM: los papeles ya no frenan la búsqueda. Si es un botón o dos, del PM: está al final |
| I1 | La hoja y el plan seguían diciendo que faltaba lo que ya se había estrenado y ensayado | Puestos al día, y la batería mira ahora que el estado de un bloque sale de sus puntos (0.4) |
| I2 | La hoja se contradecía con lo decidido: dos días a cada lado, las cuentas «por decidir», «en regla» con dos fuentes | Corregido (0.4) |
| I3 | La frase del conductor ya llegaba a la pantalla, y eso estaba entre lo que tiene que decidir el PM | No se enseña hasta que lo firme: la web lo dice por claves (2.5) |
| I4 | El nombre de una fiesta o de un evento se enseña tal cual | No puede traer direcciones, correos ni teléfonos (4.7), y cada aviso lleva ahora la frase del que explica, que pasa la puerta 7 (5.3) |
| I5 | Los dominios oficiales son los de dos países, justo los del caso probado; fuera de ellos el asiento gasta para no poder decir nada en regla | Lo de los dos sitios distintos, hecho (5.4). No lanzarlo sin dominios de ningún lado, y qué es oficial en cualquier país, del PM |
| I6 | La pregunta del que escucha tenía que llevar el signo de interrogación de siempre | Vale el de cualquier escritura (5.2). En qué idiomas se sirve El Dorado, del PM |
| I7 | El transporte supone que se vuela: no hay distancia por debajo de la cual no se busquen vuelos, y solo se admite una escala | Del PM |
| I8 | Un destino sin un país (una región de varios) no puede empezar | Del PM |
| M1 | Los contratos decían doscientas letras y las puertas dejaban trescientas | Coinciden (5.2) |
| M2, M3 | Una frase vieja en el plan, y un pendiente sobre el techo de gasto que ya no era ese | Corregidos (0.4) |
| M4 | Dos commits de la tanda sin número de punto | Queda dicho; los de estado llevan su número |
| M5 | El ensayo se miró en dos de las cuatro combinaciones de ancho y de tema | Se completa en la página de la revisión |
| M6 | Se supone una habitación para cualquier grupo, y los topes de grupo y de noches | Del PM |

## Lo que toca a la hoja: decide el PM

1. **El arranque.** Hoy, un botón abre las preguntas, el mapa enseña el primer vistazo mientras contestas, y un toque
   confirma y lanza la IA. La hoja dice «un botón, y las preguntas mientras ya busca». Hay que decir si vale así o si
   el primer botón tiene que lanzar ya los pasos de código de la investigación.
2. **La frase del conductor.** Si se le enseña al viajero, pasada su puerta de palabras, o solo lo que dice la web por
   claves. Hoy no se enseña.
3. **Un plazo que ya no se cumple.** Si un papel que hay que hacer, y ya es tarde para hacerlo, para el viaje como lo
   que bloquea.
4. **Los papeles sin fuente oficial.** Si se lanza el asiento cuando no tenemos dominios de ninguno de los dos lados,
   y cómo se sabe qué es oficial en cualquier país. Y cómo se dice una doble nacionalidad.
5. **Cuándo no se buscan vuelos**, y si se admiten dos escalas.
6. **Los destinos de varios países.**
7. **En qué idiomas se sirve El Dorado.**
8. **Los números**: el tope del primer vistazo en toda la casa, la habitación que se supone para un grupo, y los topes
   de grupo y de noches.
