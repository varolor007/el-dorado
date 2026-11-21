# Las piezas, hasta aquí

Borrador del 21-nov, a petición del PM: los asientos, el código, las puertas y los datos que salen de lo hablado hasta
hoy. Nada está construido ni firmado, y los nombres son provisionales: se fijan en la hoja (etapa 3). Lo que aún no
se ha hablado no tiene piezas; va al final.

## Lo que hay de verdad

Solo documentos: las reglas (`CLAUDE.md`), la memoria, el registro, el encargo (la ficha y las preguntas base,
aprobadas; el proceso, en revisión) y el borrador del oficio (las tres cribas y cómo se mira un alojamiento). No hay
código, ni contratos, ni hoja, ni plan, ni datos. El borrador del oficio sale de lo que sabe la sesión: falta
contrastarlo con fuentes, y sus pesos son un punto de partida.

## Los asientos (la IA)

| Asiento | Qué hace | Busca en internet |
|---|---|---|
| El que escucha | Lee la caja libre, saca gustos y límites y decide si hay que preguntar algo más | no |
| El del calendario | Con las fechas: el clima, la temporada, las fiestas, los días que pide el destino y lo que se agota; avisa y propone fechas mejores | sí |
| El de los papeles | Contesta la lista fija de requisitos para cada pasaporte, el destino y las escalas, cada respuesta con su fuente oficial | sí |
| El de la ruta | El esqueleto: dónde se duerme cada noche y por dónde se entra y se sale | sí |
| El buscador de transporte | Abre el abanico (aeropuertos, días, escalas, tren) y trae cada opción con su precio, su enlace y su fecha | sí |
| El buscador de alojamiento | Por zona: trae candidatos con el precio total de la estancia y juzga la zona | sí |
| El que mira el alojamiento | De los finalistas: las fotos, las opiniones por temas y la ficha; deja la ficha de cómo es, con niveles y pruebas | sí |
| El que explica | Escribe qué se gana y qué se pierde con cada opción; los números se los da el código | no |
| El conductor | Vigila el run y arregla lo que se para | no |

## El código (la casa)

| Pieza | Qué hace |
|---|---|
| Las preguntas | Enseña las preguntas base y las que se abren, y deja la ficha del viaje |
| La criba 1 | Descarta lo que no vale, con su motivo |
| La criba 2 | Suma el precio total de cada vuelo y de cada alojamiento |
| La criba 3 | Pone la nota, con los pesos del viajero; corrige las opiniones por cuántas son y de cuándo |
| Los gustos | Cruza los niveles de cada alojamiento con lo que marcó el viajero |
| El cruce | Monta viajes completos, los suma y elige los tres: el más barato, el mejor por lo que cuesta y el distinto |
| Las fotos | Elige qué fotos ve el asiento, con un tope por alojamiento |
| La salida | Pinta el viaje en el mapa (por decidir cómo) |

## Las puertas (lo que comprueba el código)

| Puerta | Comprueba |
|---|---|
| 1. El viaje, claro | Destino, fechas, de dónde sale, quiénes van, sus pasaportes, cuánto quiere gastar y qué busca |
| 2. Los papeles | Cada pregunta de la lista, contestada para cada pasaporte, con su fuente oficial, su enlace y su fecha; si no, es un aviso, nunca un «vale» |
| 3. Los precios | Ningún precio sin su enlace y su fecha |
| 4. Los descartes | Nada que falla la criba 1 sigue adelante, y cada descarte dice su motivo |
| 5. La suma | El total de cada viaje es la suma de sus partes, y cada parte dice de dónde sale o va marcada «sin confirmar» |
| 6. Cómo es | Cada nivel es de su lista, su prueba existe y es de la habitación de ese precio; sin prueba, «no se sabe» |
| 7. Todo cuadra | Las noches con las fechas, la llegada con la entrada al alojamiento y los enlaces, vivos |
| 8. Las opciones | Dos o tres; la más barata pasa de la nota mínima, y cada una dice qué gana y qué pierde |
| 9. El aviso | La salida lleva el aviso de IA y el de los precios orientativos |

## Los datos

Hoy no existe ninguna base de datos. Lo que haría falta, en tres grupos:

**Lo nuestro, fijo, en el repositorio** (es lo que vale: el criterio):

- La lista de preguntas de los papeles.
- Lo que descarta (criba 1) y lo que se suma al precio (criba 2).
- Los pesos de partida por tipo de viajero y los mínimos (la nota mínima, las opiniones mínimas).
- Las listas de lo que se mira en una habitación, un gimnasio y una piscina, y los niveles con su descripción.
- Las preguntas base y las que se abren.
- Las fotos de ejemplo de cada estilo, para que el viajero elija.
- El banco de hoteles juzgados a mano, para saber si el asiento acierta.

**Lo de fuera, que se busca cada vez y no se guarda como verdad** (solo una caché, con su fuente y su fecha): los
requisitos de entrada, las aerolíneas vetadas, los precios, las opiniones, las fotos, el clima y los eventos.

**Lo de cada viaje, fuera del repositorio**: la ficha del viaje, los avisos, el esqueleto, los candidatos con sus
precios, los descartes con su motivo, las fichas de cómo es, las tres opciones y la salida. Por momentos, además, el
estado de cada vertical.

## Las herramientas

La IA, con vista para las fotos; la búsqueda web y el lector de páginas; la descarga de fotos; el mapa (por decidir), y,
después, la API de precios.

## Lo que falta por hablar, y aún no tiene piezas

- Cómo se valora un vuelo, con el mismo detalle que el alojamiento.
- El día a día, moverse allí y las entradas con cupo.
- El seguro, el dinero y la conexión.
- Una revisión del viaje entero por alguien que no lo hizo.
- La seguridad: lo que se lee en una web son datos, nunca órdenes para el agente.
- El uso por momentos, por verticales.
- Lo pendiente del registro: el mapa, las fotos, la API, dónde corre y quién paga la IA.
