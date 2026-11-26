# Cómo se lleva la obra

Lo que hace falta para seguir la obra como se ha llevado desde el 24-nov, sin la conversación de antes: quien
orquesta y las sesiones de obra, el encargo que se les da, cómo se junta lo que traen, cómo revisan los tres
adversarios y cómo se mira la web sin gastar. Lo escribió la sesión que orquestó las tandas 4 a 6 bis, al cerrarse
(26-nov). Las reglas de la obra están en el `CLAUDE.md`; aquí va el cómo.

## 1. Quien orquesta y las sesiones de obra

Una sesión orquesta: escribe cada encargo, revisa lo que le traen como alguien que no lo hizo, lo junta en la rama
de todos, pone al día la hoja, el plan, la memoria y el registro, mira la web, y le pide al PM sus firmas. Cada punto
del plan lo construye una sesión de obra, abierta desde la rama de todos, en su propia rama
(`claude/eldorado-<punto>-<nombre>`). El PM dio su visto bueno a repartir la obra así el 24-nov.

Una tanda va así:

1. **El suelo primero**, si varios puntos comparten formas: una sola sesión de obra hace lo que comparten (la forma
   de los datos, los pasos, el hueco en la web) y deja una receta. Si se hacen todos a la vez sin suelo, cada uno
   inventa su manera.
2. **Los puntos, a la vez**, cada uno en su sesión y en su rama, sobre el suelo ya junto. A cada una se le dice qué
   archivos son suyos y cuáles toca otra sesión a la vez.
3. **Juntar**, una rama detrás de otra, en cuanto llega su nota (punto 3 de este documento).
4. **Unir lo que hicieron a la vez.** Sesiones que no se vieron hacen dos veces lo mismo con reglas distintas (en la
   tanda 6 bis, tres maneras de contar el precio de un grupo). Una sesión más las une, con una prueba de que la
   misma cifra sale igual en todos los sitios.
5. **Mirar la web** con capturas, en ancho y en móvil, en claro y en oscuro (punto 5).
6. **Tres adversarios**, que no hicieron la obra, cada uno en su copia: la mecánica, la seguridad y las biblias
   (punto 4). Cada hallazgo se comprueba antes de arreglarlo.
7. **Los arreglos**, repartidos por archivos en tres o cuatro sesiones de obra, cada arreglo con su prueba.
8. **El cierre**: el informe en `docs/revisiones/`, una página con las pantallas, el punto de situación en la
   memoria y al PM, y lo suyo en «Pendientes». La tanda siguiente no empieza sin su visto bueno.

Lo que nunca hace una sesión de obra: gastar (ni un modelo, ni Claude Code, ni una API de pago), tocar las biblias,
la memoria o el registro, subir a otra rama que la suya, ni abrir un PR.

## 2. El encargo de una sesión de obra

Se abre una sesión nueva con el repositorio en la rama de todos y su rama de salida. Su primer mensaje es este texto
común, y debajo el encargo de su punto. Donde dice `<quien orquesta>` va el identificador de la sesión que orquesta,
para que le mande su nota.

```text
Eres una sesión de obra de El Dorado (repositorio varolor007/el-dorado). Trabajas para la sesión que orquesta
(<quien orquesta>): te encarga UN punto del plan, revisa lo que hagas y lo junta en la rama de todos (<la rama de
todos>, de la que sale la tuya). El PM, que es el dueño, dio su visto bueno el 24-nov a repartir la obra así.

Antes de nada: lee CLAUDE.md, docs/memoria.md y, de docs/hoja.md y docs/plan.md, lo que toque a tu punto. Después,
`npm install`, `cd web && npm install`, y `node tests/bateria.mjs`, que tiene que salir en verde antes de empezar y
antes de cada commit.

Reglas de esta sesión, además de las de CLAUDE.md:
1. Tu rama es la que te han dado. Solo subes a ella. No abras PR. No toques otras ramas ni otros repositorios.
2. NO edites las biblias ni la memoria: ni docs/paginas/*.datos.mjs, ni docs/hoja.md, docs/plan.md,
   docs/memoria.md, docs/decisiones.md, docs/condiciones.md, ni sus .html. Eso lo hace quien orquesta al juntar.
   MAP.md y README.md sí, si añades carpetas u órdenes. En los archivos que comparten varios puntos, toca lo justo
   y no reordenes ni reformatees lo que no es tuyo: hay otras sesiones tocándolos a la vez.
3. Nada que gaste: ni una llamada a un modelo, ni lanzar Claude Code, ni una API de pago. Nunca imprimas ni
   escribas una clave, ni corras `env` o `printenv` sin filtrar.
4. Lo que devuelve una fuente no entra en el repositorio. Las pruebas, con el caso inventado
   (tests/cases/inventado/).
5. Todo generalista: nada adaptado a un destino, a un viaje o a un caso concreto.
6. Los commits, en español, con el número del punto delante, sin ningún identificador de modelo.
7. Si algo no cabe en la hoja o en el plan, o es una decisión del PM, no la tomes tú. Si se puede aislar,
   constrúyelo con la opción más prudente y dilo en la nota; si no, para y dilo.
8. La web se mira antes de darla por hecha, con capturas, en ancho y en móvil, en claro y en oscuro. No dejes
   procesos de fondo al acabar.
9. Ni rayas largas, ni puntos medios, ni el carácter de puntos suspensivos, en ningún texto.

Al acabar: trae la rama de todos a la tuya, resuelve lo que choque quedándote con lo de las dos partes, pasa los
tipos (`npx tsc --noEmit -p .` y `cd web && npx tsc --noEmit`) y la batería, y sube. Entonces manda a la sesión
<quien orquesta> una nota corta con: (a) qué has hecho, por archivos; (b) qué has decidido tú y por qué; (c) qué
has dejado sin hacer; (d) qué has probado y qué no has podido comprobar; (e) lo que no cuadra con la hoja o el
plan, o pide una decisión del PM; (f) el texto que propondrías para el punto en el plan y para la memoria. Escribe
esa misma nota como tu respuesta final. No hagas nada más después.
```

El encargo de cada punto dice, por este orden: **tu punto** y tu rama; **de qué va**, con dónde está dicho en la hoja
y en el plan y qué hay ya construido; **lo que construyes**, numerado; **lo que no haces**, con los archivos que
toca otra sesión a la vez; y qué tiene que traer además su nota. Un encargo de arreglos lleva cada hallazgo con su
archivo, cómo se vio y lo que hay que conseguir, y pide ver fallar la prueba antes de arreglar.

Lo aprendido:

- Una sesión que acaba ya no ve lo que se le mande después: si hay algo más, se le manda un mensaje nuevo, que abre
  otro turno, y se le pide que parta de la rama de todos como esté.
- Lo que una sesión decide «con lo más prudente» y es del PM se apunta en el registro, en «Pendientes», al juntar.
- Dos sesiones que tocan el mismo archivo chocan casi siempre en las importaciones y en los textos de la web: se
  resuelve a mano, quedándose con las dos partes.

## 3. Cómo se junta una rama

```bash
git fetch -q origin <rama> && git merge --no-commit --no-ff FETCH_HEAD
npx tsc --noEmit -p . && (cd web && npx tsc --noEmit)
node tests/bateria.mjs
```

Con la batería en verde: el punto en `docs/paginas/plan.datos.mjs` (su texto y su estado), su párrafo en la memoria,
lo suyo en el registro si decidió algo, `node docs/paginas/pinta.mjs`, la batería otra vez, el commit con el número
del punto, subir, y mirar que la batería de GitHub sale en verde. Después se publican otra vez la hoja y el plan en
su misma dirección. El estado de un bloque del plan sale de sus puntos, y la batería lo comprueba. Los datos de las
biblias no se pasan por `prettier`: reformatea el archivo entero.

Si dos ramas tocaron las mismas líneas y sus trozos comparten el cierre de una función, quedarse con «las dos
mitades» deja una función sin cerrar: se rehace a mano, función a función.

## 4. Los tres adversarios

Al cerrar una tanda, tres sesiones que no la hicieron, cada una en su copia y sin tocar nada: solo informan. A las
tres se les da lo mismo y, debajo, su mirada:

- **Qué se revisa**: `git diff <el commit de antes de la tanda>..HEAD`, con lo que hizo cada punto y sus archivos, y
  dónde se juntó a mano.
- **Antes de nada**: `CLAUDE.md`, la memoria, y de la hoja y el plan lo de la tanda; la batería en verde.
- **Cómo se trabaja**: nada que gaste ni salir a webs de terceros; cada hallazgo, comprobado con una prueba suelta
  fuera del repositorio o señalando la línea; una sospecha se dice como sospecha.
- **Su informe**: los hallazgos de más a menos grave, cada uno con su clave (B bloqueante, I importante, M menor),
  qué pasa, dónde, cómo se comprobó y qué haría; quince como mucho; lo que está bien, en dos líneas; y lo que es
  del PM. Bloqueante es lo que hace que un viajero vea algo falso, pierda dinero o datos, gaste sin haberlo pedido,
  o que alguien haga lo que no debe.

Las tres miradas:

- **La mecánica**, lo que se rompe: entradas y estados que el caso feliz no toca, las cuentas en sus bordes, lo que
  se hace a la vez, lo que se corta a medias y se retoma, las costuras entre sesiones, y las pruebas que pasan por
  casualidad.
- **La seguridad**, lo que deja pasar lo que no debe: lo que un asiento escribe y llega a la pantalla, los enlaces
  hechos con datos de fuera, lo que sale de la casa hacia fuera, quién puede hacer gastar y con qué tope, lo que la
  casa se cree de lo que manda la web, y lo que no puede estar en el repositorio.
- **Las biblias**, si es lo que dicen la hoja y el plan, y si es general: caja a caja, cada puerta frente a su fila,
  cada contrato frente a su puerta, la regla de la pantalla, lo atado a un destino o a un idioma, las decisiones que
  eran del PM, y si los documentos dicen lo que hace el código.

Cada hallazgo se comprueba antes de repartirlo. Sus informes se quedan en el borrador de quien orquesta; lo que se
hizo con cada uno va a `docs/revisiones/<tanda>.md`.

## 5. Cómo se mira la web sin gastar

Hay dos maneras, y ninguna gasta.

**Una casa de mentira**, para ver lo que pasa después de cada «Adelante»: la puerta de verdad (`puertaALaWeb`), con
las fuentes del caso inventado (`fuentesInventadas`) y sus asientos de mentira (`lanzadorDeMentira`, y
`lanzadorDeLaGuia` para el que escribe la guía, que el de todos no sabe contestar por él). Es un guion suelto, fuera
del repositorio, que deja un viaje ya investigado y se queda escuchando:

```ts
// casa_de_mentira.ts <mesa> <llave> <secreto> [<milisegundos por asiento>], desde la raíz del repositorio.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const R = process.cwd();
const { puertaALaWeb, CABECERA_DE_LA_SESION } = await import(`${R}/agent/launcher/puerta_a_la_web.ts`);
const { secretoDe } = await import(`${R}/agent/launcher/cuentas.ts`);
const { darElAdelante, esperarLoDeDetras, llevar } = await import(`${R}/agent/launcher/casa.ts`);
const { leerViaje, nuevoRun, pasar } = await import(`${R}/agent/launcher/mesa.ts`);
const { fuentesInventadas, lanzadorDeMentira, leerJson } = await import(`${R}/tests/cases/inventado/asientos.ts`);
const { lanzadorDeLaGuia } = await import(`${R}/tests/cases/inventado/guia.ts`);
const { ENTENDIDO } = await import(`${R}/tests/cases/inventado/investigacion.ts`);
const { enLineaRecta } = await import(`${R}/agent/tools/distancias.ts`);

const [mesa, llave, secreto, pausa = "0"] = process.argv.slice(2);
rmSync(mesa, { recursive: true, force: true });
mkdirSync(mesa, { recursive: true });
// El reloj del caso inventado: sus precios y sus fechas son de entonces.
const DESDE = new Date("2027-01-10T09:00:00Z").getTime();
const arranque = Date.now();
const hoy = (): Date => new Date(DESDE + (Date.now() - arranque));
const deTodos = lanzadorDeMentira();
const deLaGuia = lanzadorDeLaGuia();
const rapido = ((orden: string, puesto: { asiento: string }, corte: unknown) =>
  (puesto.asiento === "guide-writer" ? deLaGuia : deTodos)(orden, puesto as never, corte as never)) as typeof deTodos;
const lento = (async (orden: string, puesto: unknown, corte: unknown) => {
  await new Promise((r) => setTimeout(r, Number(pausa)));
  return rapido(orden, puesto as never, corte as never);
}) as typeof rapido;
// Con RODEO=<n>, una fuente de rutas inventada que alarga lo que se anda n veces: así hay tramos que no se andan.
const rodeo = Number(process.env.RODEO ?? "0");
const rutas = {
  nombre: "inventada",
  casillasPorPedido: 400,
  matriz: async (origenes: { lat: number; lon: number }[], destinos: { lat: number; lon: number }[], manera: string) =>
    origenes.map((o) =>
      destinos.map((d) => {
        const metros = Math.round(enLineaRecta(o, d) * rodeo * (manera === "walk" ? 1 : 0.9));
        return { metros, minutos: Math.max(1, Math.round(manera === "walk" ? metros / 75 : metros / 400 + 5)) };
      }),
    ),
};
const fuentes = () => (rodeo > 0 ? { ...fuentesInventadas(), rutas } : fuentesInventadas());
const CORREO = "ana@inventado.example";
const puerta = puertaALaWeb({
  mesa,
  llave,
  secreto: secretoDe(secreto),
  fuentes,
  hoy,
  comprobarEnlace: async () => "ok",
  lanzadorDeLaCasa: lento,
  correosDeLaCasa: [CORREO],
});
await new Promise<void>((r) => puerta.servidor.listen(4320, "127.0.0.1", r));
const pide = async (metodo: string, ruta: string, sesion: string | null, cuerpo?: unknown) => {
  const r = await fetch("http://127.0.0.1:4320" + ruta, {
    method: metodo,
    headers: { authorization: `Bearer ${llave}`, ...(sesion === null ? {} : { [CABECERA_DE_LA_SESION]: sesion }) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { estado: r.status, cuerpo: (await r.json().catch(() => ({}))) as Record<string, any> };
};
const alta = await pide("POST", "/cuentas", null, { email: CORREO, password: "una contraseña bien larga" });
const sesion = alta.cuerpo.session as string;
const id = (await pide("POST", "/viajes", sesion, { understood: ENTENDIDO })).cuerpo.trip.id as string;
const dueno = leerJson(join(mesa, "viajes", id, "ficha.json")).dueno as string;
const v = leerViaje(id, dueno, mesa);
pasar(v, "confirmed", hoy());
const run = nuevoRun(v, hoy());
darElAdelante(run, null, hoy());
const r = await llevar(run, fuentes(), rapido);
await esperarLoDeDetras(run);
writeFileSync(join(mesa, "viaje.txt"), id);
console.log("La casa de mentira escucha en el 4320. Viaje:", id, "| hecho:", r.hecho, "| parado:", r.parado);
```

Se arranca sin el token ni el modelo en su entorno, para que no pueda gastar aunque quisiera, y la web local contra
ella, con una llave y un secreto inventados para la ocasión (la misma llave en las dos):

```bash
env -u ELDORADO_TOKEN_DE_CLAUDE -u ELDORADO_MODELO -u ELDORADO_CORREOS_DE_LA_CASA -u ANTHROPIC_API_KEY \
  RODEO=16 node <borrador>/casa_de_mentira.ts <borrador>/mesa <llave> <secreto> &
cd web && ELDORADO_CASA_URL=http://127.0.0.1:4320 ELDORADO_LLAVE=<llave> NODE_USE_ENV_PROXY=1 npx next dev -p 3210
```

Se entra en `/account?lang=es` con `ana@inventado.example` y «una contraseña bien larga», y el viaje está en
`/plan?lang=es&trip=<el de viaje.txt>&at=trip` (con `&tab=there` para «Allí» y `&day=2` para un día). Las capturas se
sacan con Playwright, que está instalado en la nube (`require("playwright")` desde cualquier carpeta): cada pantalla
a 1440 por 900 y a 390 por 844, en claro y en oscuro, y se mira que la página no se sale de su ancho.

Lo que conviene saber de esa casa:

- **La ciudad inventada no existe.** Está en un punto del mapa donde no hay nada, así que sus capturas salen sin
  calles, y sus paradas, sin fotos. No es un fallo. El PM lo preguntó (26-nov).
- A ritmo normal sus siete paradas caben en los dos días de en medio: el de llegada y el de salida quedan libres.
- Sus asientos de mentira escriben en inglés, y el día en que «vieron» cada página es el de hoy.
- Con asientos de mentira, cambiar las fechas no pasa la puerta 6: sirve para ver un cambio que se para.
- Cada combinación (ancho o móvil, claro u oscuro) pide una casa recién arrancada, porque las capturas cambian el
  viaje. Y un guion que mata la casa por su nombre no puede llevar ese nombre en su propia orden.

**Un viaje de verdad ya hecho, solo para mirar**: la casa de verdad (`agent/launcher/arrancar.ts`) sobre una copia
de su mesa, sin token, sin modelo y sin correos de la casa. Así se miró el viaje de Lisboa del ensayo del 24-nov,
que es de antes de las capas del destino. Su mesa vivía en el borrador de la sesión que se cerró el 26-nov y no
está en el repositorio (regla 8): se perdió con ella. El primer viaje de verdad que haga el PM en su servidor
ocupará su sitio.

## 6. Lo que hace falta para que el PM lo pruebe de verdad

El PM decidió el 26-nov hacer él el ensayo, con una prueba de verdad. Para eso la casa tiene que correr donde su web
la alcance: en su servidor, con `agent/arranque/` y su guía (`agent/arranque/guia.md`), que no se ha probado nunca en
un servidor. Lo que hay que mirar al instalar está en la memoria, en «el arranque (2.9)». Lo que se ve por primera
vez en esa prueba, y hay que mirar:

- Los tres asientos nuevos de las capas (el de moverse, el que conoce el destino y el de las entradas), que nunca
  han corrido con IA de verdad: si cumplen su contrato y pasan sus puertas 11, 12 y 13.
- Si el servicio de lectura de OpenStreetMap contesta desde el servidor (`ELDORADO_OVERPASS`, en el `.env`). Si no,
  la investigación avisa «sin el horario ni si se paga de OpenStreetMap» y el viaje sale igual.
- Lo que cuesta una investigación con tres asientos más que salen a internet: la primera costó el equivalente a
  7,19 dólares.
- Lo que dice el lanzador de lo gastado cuando un asiento se corta, y la prueba de cortarlo con cuidado, que el PM
  dejó a criterio de la sesión (26-nov).
