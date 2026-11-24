# La casa de El Dorado en tu servidor: paso a paso

La casa es la parte de El Dorado que investiga. Va en tu servidor de Contabo, al lado del ensamblador, en Docker, y
piensa con tu cuenta de Claude. La web se queda en Vercel y le habla a la casa por una dirección con candado: solo
entra quien lleva la llave de la web.

Hay dos maneras de que Vercel llegue a la casa. Las dos están hechas; eliges una en el `.env`:

- **La puerta** (la de partida). Una dirección gratuita con HTTPS (del tipo `1-2-3-4.sslip.io`, con la IP de tu
  servidor) o un dominio tuyo. Abre en el servidor el 443 y el 80, y nada más. No pide ninguna cuenta más.
- **El túnel** de ngrok, como el del ensamblador. No abre nada en el servidor, pero pide su propia dirección fija
  de ngrok, distinta de la del ensamblador.

Cada paso es una orden que copias y pegas. Debajo, lo que tienes que ver si ha ido bien.

## Lo que necesitas a mano

- Entrar a tu servidor por SSH, como siempre.
- Tu token de Claude: en tu ordenador, con Claude Code instalado, `claude setup-token`. Copia lo que te da.
- Los correos que van a pensar con tu cuenta (el tuyo, y los que quieras), separados por comas.
- El modelo con el que se piensa. No se escribe en el repositorio: te lo dice quien orquesta la obra.
- Las claves de las fuentes: LiteAPI, Travelpayouts (Aviasales), Parallel y, si la tienes, Geoapify.
- Un correo para el certificado de la puerta (te avisan si algo va mal con él).
- Solo si eliges el túnel: tu llave de ngrok y una dirección fija nueva de ngrok para El Dorado.

## 1. Entra en el servidor y baja el repositorio

```bash
ssh root@<la IP de tu servidor>
git clone https://github.com/varolor007/el-dorado.git /opt/el-dorado
```

Tienes que ver que baja (`Cloning into '/opt/el-dorado'`) y acaba sin errores. Si entras con otro usuario y no con
root, pon `sudo` delante de las órdenes de los pasos siguientes.

## 2. Rellena el .env

```bash
cd /opt/el-dorado/agent/arranque
cp .env.ejemplo .env
chmod 600 .env
nano .env
```

Rellena cada línea después del `=`, sin comillas y sin espacios:

| Línea | Qué va |
|---|---|
| `ELDORADO_LLEGADA` | `puerta` (la de partida) o `tunel` |
| `ELDORADO_TOKEN_DE_CLAUDE` | el token de `claude setup-token` |
| `ELDORADO_CORREOS_DE_LA_CASA` | tus correos, separados por comas |
| `ELDORADO_MODELO` | el modelo |
| `LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN`, `PARALLEL_API_KEY`, `GEOAPIFY_KEY` | las claves de las fuentes |
| `ELDORADO_CORREO_DEL_CERTIFICADO` | con la puerta: un correo tuyo |
| `ELDORADO_DOMINIO` | con la puerta: en blanco para la dirección gratuita, o tu dominio (sin `https://`) |
| `NGROK_AUTHTOKEN`, `NGROK_DOMAIN` | con el túnel: tu llave de ngrok y la dirección (sin `https://`) |

Lo demás puede quedarse en blanco o como viene. El tope de la casa viene puesto en **3 GB de memoria y 2 núcleos**
(`ELDORADO_MEMORIA` y `ELDORADO_NUCLEOS`): de los 12 GB y 6 núcleos del servidor, deja de sobra para el
ensamblador. Si un día ves que la casa se queda corta, se sube ahí y se vuelve a correr el paso 3.

Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`. Este archivo no sale nunca del servidor.

Si usas un dominio tuyo: antes, en tu proveedor del dominio, haz que apunte a la IP del servidor (un registro A).

## 3. Arranca la casa

```bash
sudo /opt/el-dorado/agent/arranque/casa.sh instalar
```

Si no hay Docker, lo instala; mira que el `.env` lo tenga todo, pone el tope de la casa, abre el cortafuegos solo
si elegiste la puerta (el 443 y el 80; con el túnel, nada) y te lo dice, construye la casa (unos minutos la primera
vez), la arranca y comprueba que responde por dentro y desde fuera. Tienes que ver, al final:

```
OK: La casa responde por dentro.
OK: Se llega a la casa desde fuera.
OK: Sin la llave de la web, la casa no deja pasar.
OK: Con la llave de la web, la casa contesta.
OK: Lo que no es de la casa está cerrado.

Lo que va en Vercel (tu proyecto, Settings, Environment Variables), y después un Redeploy:
  ELDORADO_CASA_URL = https://...
  ELDORADO_LLAVE    = ...
```

(Con el túnel no sale la línea de «lo que no es de la casa».) Si algo falla, para con una línea que empieza por
`PARADO:` y dice qué falta. Lo arreglas y vuelves a correr la misma orden: no rompe nada.

Si tu Contabo tiene además el cortafuegos del panel, y elegiste la puerta, abre ahí también el 443 y el 80 (TCP).

## 4. Pon las dos variables en Vercel

En Vercel, tu proyecto de El Dorado, **Settings**, **Environment Variables**: añade `ELDORADO_CASA_URL` y
`ELDORADO_LLAVE` con lo que te dio el paso 3. Después, en **Deployments**, el último, **Redeploy**.

Si los pierdes de vista, te los vuelve a dar:

```bash
sudo /opt/el-dorado/agent/arranque/casa.sh vercel
```

## 5. Regístrate antes de dar la dirección a nadie

Entra en la web, ve a tu cuenta y regístrate con **cada** correo de `ELDORADO_CORREOS_DE_LA_CASA`. El correo no se
confirma: quien se registrara antes con uno de ellos pensaría con tu cuenta. Mientras no lo hagas, el registro de la
casa te lo recuerda al arrancar (`Ojo: estos correos de la casa aún no tienen cuenta`).

Al acabar, en la web tienes que ver tu cuenta, sin que te pida una clave de IA.

## Para el día a día

| Para | La orden |
|---|---|
| Ponerla al día con lo último del repositorio | `sudo /opt/el-dorado/agent/arranque/casa.sh actualizar` |
| Ver cómo están los servicios | `sudo /opt/el-dorado/agent/arranque/casa.sh estado` |
| Ver lo que va diciendo (sales con `Ctrl+C`) | `sudo /opt/el-dorado/agent/arranque/casa.sh registro` |
| Pararla | `sudo /opt/el-dorado/agent/arranque/casa.sh parar` |
| Cambiar algo del `.env` | edítalo y `sudo /opt/el-dorado/agent/arranque/casa.sh instalar` |

**Ponerse al día no corta una investigación.** Construye la casa nueva mientras la vieja sigue funcionando, y al
cambiar, la vieja deja acabar lo que esté investigando antes de apagarse (hasta una hora, `ELDORADO_ESPERA_AL_APAGAR`);
la orden espera con ella. Lo que sí la corta: reiniciar el servidor o apagar Docker.

**Lo que guarda la casa** (los viajes, las cuentas y sus dos llaves) está en un volumen de Docker, `eldorado_datos`.
Sobrevive a ponerse al día y a reiniciar. No lo borres: sin su secreto, las claves de IA guardadas de cada cuenta ya
no se pueden leer. Su copia a otro sitio está por hacer.
