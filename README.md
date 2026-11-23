# El Dorado

El agente de viajes de Cortex: planifica un viaje entero al mejor precio. Buscas a dónde quieres ir en un mapa del
mundo, das tus fechas y ves cómo se investiga tu viaje en vivo, hasta que queda dibujado en el mapa, día a día, con
dónde duermes, cómo llegas y lo que ahorras con cada cambio.

Es un MVP, sin uso comercial todavía. Qué es, en la hoja ([docs/hoja.md](docs/hoja.md)); cómo se construye y por dónde
vamos, en el plan ([docs/plan.md](docs/plan.md)); dónde va cada cosa, en [MAP.md](MAP.md).

## Lo que ya funciona

Las bases del recolector: la búsqueda de alojamiento de una zona, de punta a punta y sin IA. Trae la lista de una
fuente, comprueba los mínimos, pone el precio de esas noches, elige los finalistas por regla y deja la ficha de datos
de cada uno (la habitación de ese precio con sus metros y sus fotos, las opiniones por temas y lo que piden otros
vendedores), con su puerta en verde o en rojo. Y los vuelos guardados para esas fechas y los días baratos del mes.

Y el primer asiento de IA, el que mira el alojamiento: su contrato, en inglés; su puesto, a ciegas (sin el nombre, el
precio, la nota ni las estrellas), con las fotos de la habitación de ese precio y las opiniones; y sus dos puertas, la
de todos y la 5, que comprueban desde fuera que cada nivel de su ficha es de su lista y tiene su prueba.

Y la investigación entera, de lo que se entiende de un viaje al viaje en el mapa: la ruta, la búsqueda por zonas,
mirar cada finalista, elegir los sitios, repartir los días, cruzar y explicar, con cada puerta en su sitio. La lleva
el código paso a paso y desde el disco; los asientos de IA los lanza todavía quien lleva el run. Lo que aún no sabe
hacer (un viaje de varias bases, uno que no se anda, un grupo que no cabe en una habitación), lo para y lo dice.

## Cómo se usa

```bash
npm install                 # una vez: solo trae el comprobador de tipos y el formateador
node tests/bateria.mjs      # la batería: las pruebas y los tipos, en segundos, sin internet y sin gastar

node agent/launcher/buscar.ts --pais <país> --lat <latitud> --lon <longitud> \
  --entrada AAAA-MM-DD --salida AAAA-MM-DD --moneda <tres letras> --nacionalidad <país del pasaporte>
```

Para llevar una investigación entera, con lo entendido de un viaje escrito en un archivo:

```bash
node agent/launcher/investigar.ts empezar <entendido.json>   # abre el run en la mesa y dice su carpeta
node agent/launcher/investigar.ts sigue <carpeta del run>    # da los pasos que puede, y dice a quién espera
```

Cada vez que `sigue` espera a un asiento, alguien lo lanza con la orden que queda en `ordenes/`, y se vuelve a
llamar. Si una puerta lo para, dice dónde y por qué, y el run sigue parado hasta que se quita su `parado.json`.

Para mirar los finalistas de una búsqueda ya guardada:

```bash
node agent/launcher/mirar.ts preparar <busqueda.json> --pasadas 2   # baja las fotos y monta los puestos, a ciegas
node agent/launcher/mirar.ts recoger <carpeta del run>              # pasa las puertas y compara las pasadas
```

Entre una orden y otra alguien lanza a los asientos, con la orden que queda en `ordenes/`: ese código no llama a
ninguna IA y no gasta.

Para ver la web, en seco, con el viaje grabado:

```bash
node agent/launcher/grabar.ts <carpeta del run> <muestra.json> --palancas   # deja el viaje en la mesa
cd web && npm install                                                       # una vez
ELDORADO_MESA=<la mesa> npm run dev                                         # y abrir /plan
```

La búsqueda necesita las claves de las fuentes en el entorno (`LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN` y
`PARALLEL_API_KEY`); en las sesiones de la nube las pone su proxy, y entonces se lanza con `NODE_USE_ENV_PROXY=1`
delante. Lo que saca queda en la mesa, fuera del repositorio (`ELDORADO_MESA`). Una fuente se apaga con
`ELDORADO_APAGAR=parallel`. Más opciones: `--radio`, `--adultos`, `--ninos 4,9`, `--nota`, `--opiniones`,
`--estrellas`, `--finalistas`, `--moneda`, `--nacionalidad` y `--mercado`.

## Los documentos

| Documento | Qué es |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Las reglas de la obra |
| [MAP.md](MAP.md) | Dónde va cada cosa |
| [docs/memoria.md](docs/memoria.md) | Qué es, dónde vive cada cosa, por dónde vamos y cómo se retoma |
| [docs/decisiones.md](docs/decisiones.md) | Cada decisión, con su fecha; lo pendiente, aparte |
| [docs/hoja.md](docs/hoja.md) | **La hoja**, la primera biblia: qué es El Dorado, momento a momento. Su página, en https://claude.ai/artifact/D67ow4BecJge9aiZYCSS73 |
| [docs/plan.md](docs/plan.md) | **El plan**, la segunda biblia: cómo se construye y por dónde vamos. Su página, en https://claude.ai/artifact/UKjEhSMnxTU5bj9Eeddy6t |
| [docs/encargo.md](docs/encargo.md) | Etapa 1: la ficha del encargo, las preguntas al viajero y el proceso |
| [docs/oficio.md](docs/oficio.md) | Borrador: cómo se valora un vuelo y un alojamiento |
| [docs/asientos.md](docs/asientos.md) | Borrador: cómo piensa cada asiento, sus normas y su puerta |
| [docs/puertas.md](docs/puertas.md) | Borrador: qué mide cada puerta, cómo, y lo que no puede ver |
| [docs/piezas.md](docs/piezas.md) | Borrador: los asientos, el código, las puertas y los datos que salen de lo hablado |
| [docs/datos.md](docs/datos.md) | El mapa de los datos: cada pieza de información y de dónde sale, con lo comprobado |
| [docs/fuentes.md](docs/fuentes.md) | Las fuentes de datos miradas, y las formas de sacar la información |
| [docs/condiciones.md](docs/condiciones.md) | Las condiciones de las tres fuentes: lo que dejan y lo que hay que cerrar para vender |
| [docs/paginas/](docs/paginas/) | Los datos de las dos biblias, su formato y el pintor: `node docs/paginas/pinta.mjs` |
