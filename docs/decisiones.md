# Las decisiones de El Dorado

Cada decisión, con su fecha y quién la tomó; lo viejo, tachado; lo pendiente, aparte, al final.

## 21-nov-2026

- **El agente.** Un agente de viajes, para planificar viajes al mejor precio, construido en este repositorio. El método,
  el del ensamblador de Cortex, que se lee en `varolor007/aurora-web` (el PM).
- **Para quién.** Para vender en Cortex, a cualquier viajero (el PM).
- **Los precios.** Web primero, API después: la primera versión, sin conectores, busca en la web y da cada precio con
  su enlace y su fecha, que se confirma al reservar; queda preparada para conectar una API de vuelos y hoteles (el PM).
- **La salida.** En la propia web: «quiero un mapa interactivo y demás como output en la propia web; ya veremos cómo lo
  construimos» (el PM). Cómo, pendiente.
- **El tipo.** Los dos: primero, de una tirada, de punta a punta; después, el viajero lo usa por momentos, «por
  verticales, como DaVi» (el PM).
- **Lo que decide la sesión y cuenta** (en el encargo): el precio que se compara es el total; dos o tres opciones; el
  agente propone y enlaza, no reserva ni paga; ningún precio sin su enlace y su fecha, y nada inventado.
- **Cómo se escribe** (la sesión, como en el ensamblador): el código, en TypeScript sobre Node 22; los contratos, en
  inglés; lo que ve el cliente en la web, en inglés; lo demás, en español.
- **Las preguntas al viajero.** Con el destino y las fechas, cinco preguntas con toques (de dónde sale, quiénes van,
  si las fechas son fijas, cuánto quiere gastar y qué busca) y una casilla, «Ya tengo algo reservado». Lo demás se
  supone, se dice y se cambia en su vertical (el PM: «me parece bien»). En el encargo. Son una base, no una lista
  cerrada: «puede haber más» (el PM); el agente pregunta más solo si la respuesta cambia el viaje, y hay una caja libre.
- **Cómo se valora, en tres cribas** (la sesión; el PM: «not bad, vamos mejorando»): qué se descarta, qué se suma al
  precio y qué se puntúa, con pesos de partida que se ajustan en el ensayo. Los requisitos de entrada no se guardan
  por país: se guarda la lista de preguntas y cada respuesta se busca en su fuente oficial. En `oficio.md`, borrador.
- **Un alojamiento no es su nota** (el PM): «aparte de por la puntuación de Booking o las estrellas, nos fijamos por la
  vista, cómo de aesthetic es la habitación, cómo de moderno; tiene gimnasio y piscina, ok, pero ¿es grande, tiene
  vistas, máquinas modernas? Eso hay que saber sacarlo también». Cómo se saca, en `oficio.md`.
- **El proceso se rehace paso a paso con el PM**: «hay mucho más de lo que me has propuesto». Las siete cajas de la
  versión 1 quedan en revisión.
- **Un asiento que une a los dos buscadores** (el PM): «tienen que tener uno que los una, que cruce, que optimice, que
  cambie, que vea variabilidad». Es el que cruza; las cuentas siguen siendo del código.
- **Antes de seguir con el resto del viaje, la base** (el PM): el proceso de cada asiento, con normas claras y puertas.
  En `asientos.md`, borrador, a su revisión.

## Pendientes

- **La salida en la web**: dónde vive (la web de Cortex o una propia) y con qué se pinta el mapa. En su etapa, antes
  de construirla.
- **Los momentos**: qué verticales exactamente, qué se guarda de un viaje y quién trabaja en cada una. Al diseñar el
  tipo por momentos, tras la primera versión.
- **La API de precios**: cuál, y si es de pago. Después de la primera versión.
- **Un revisor del viaje entero**, que no lo hizo: lo propone la sesión; por hablar.
- **Las fotos de los alojamientos**: de dónde se leen en la primera versión (las de viajeros piden casi siempre una
  API) y con qué derechos se enseñan en una web que se vende. Antes de construir la salida.
- **Dónde corre el agente y quién paga su IA**: en el servidor del motor de Cortex o aparte, y si la paga el cliente
  con su cuenta, como al crear un agente. Antes del ensayo.
