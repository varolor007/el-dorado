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

## Pendientes

- **La salida en la web**: dónde vive (la web de Cortex o una propia) y con qué se pinta el mapa. En su etapa, antes
  de construirla.
- **Los momentos**: qué verticales exactamente, qué se guarda de un viaje y quién trabaja en cada una. Al diseñar el
  tipo por momentos, tras la primera versión.
- **La API de precios**: cuál, y si es de pago. Después de la primera versión.
- **Dónde corre el agente y quién paga su IA**: en el servidor del motor de Cortex o aparte, y si la paga el cliente
  con su cuenta, como al crear un agente. Antes del ensayo.
