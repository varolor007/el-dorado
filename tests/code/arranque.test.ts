// El arranque de la casa en el servidor (agent/arranque/), mirado sin Docker de verdad: lo que dicen el compose, el
// .env de ejemplo, la imagen, la puerta (Caddy) y el túnel, y lo que hace el guion con un docker, un cortafuegos y un
// curl de mentira. Y lo que cambió en la pasarela de la web para hablar con la casa por fuera.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { PESO_DE_UNA_PETICION } from "../../agent/launcher/puerta_a_la_web.ts";
import { aLaCasa, porNgrok, type DeLaWeb } from "../../web/src/lib/casa.ts";

const RAIZ = resolve(import.meta.dirname, "..", "..");
const AQUI = join(RAIZ, "agent", "arranque");
const lee = (nombre: string): string => readFileSync(join(AQUI, nombre), "utf8");

const COMPOSE = lee("compose.yaml");
const PUERTA = lee("compose.puerta.yaml");
const EJEMPLO = lee(".env.ejemplo");
const DOCKERFILE = lee("Dockerfile");
const CADDY = lee("Caddyfile");
const GUION = lee("casa.sh");

/** Las líneas `NOMBRE=valor` del .env de ejemplo. */
const DEL_EJEMPLO = new Map(
  EJEMPLO.split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)] as const),
);

/** Lo que el compose saca del .env: cada `${NOMBRE...}`. */
const deLosCompose = (texto: string): Set<string> => new Set([...texto.matchAll(/\$\{([A-Z_]+)/g)].map((m) => m[1]));

/** El bloque de un servicio, de su nombre al siguiente servicio o al final. */
function servicio(texto: string, nombre: string): string {
  const desde = texto.indexOf(`\n  ${nombre}:\n`);
  assert.ok(desde >= 0, `falta el servicio ${nombre}`);
  const resto = texto.slice(desde + 1);
  const fin = resto.slice(1).search(/\n {2}[a-z][a-z-]*:\n|\n[a-z]/);
  return fin < 0 ? resto : resto.slice(0, fin + 1);
}

/** Los nombres del `environment:` de un servicio. */
function entornoDe(bloque: string): string[] {
  const desde = bloque.indexOf("    environment:\n");
  if (desde < 0) return [];
  const nombres: string[] = [];
  for (const linea of bloque.slice(desde).split("\n").slice(1)) {
    const m = /^ {6}([A-Z_]+):/.exec(linea);
    if (m === null) break;
    nombres.push(m[1]);
  }
  return nombres;
}

const SECRETOS = [
  "ELDORADO_TOKEN_DE_CLAUDE",
  "LITEAPI_KEY",
  "TRAVELPAYOUTS_TOKEN",
  "PARALLEL_API_KEY",
  "GEOAPIFY_KEY",
  "NGROK_AUTHTOKEN",
];

test("el compose y el .env de ejemplo dicen lo mismo", () => {
  const usados = new Set([...deLosCompose(COMPOSE), ...deLosCompose(PUERTA)]);
  // Lo que solo lee el guion, para elegir la manera de llegar.
  const delGuion = new Set(["ELDORADO_LLEGADA"]);
  assert.deepEqual(
    [...usados].filter((n) => !DEL_EJEMPLO.has(n)),
    [],
    "el compose pide algo que el ejemplo no trae",
  );
  assert.deepEqual(
    [...DEL_EJEMPLO.keys()].filter((n) => !usados.has(n) && !delGuion.has(n)),
    [],
    "el ejemplo trae algo que nadie usa",
  );
  for (const n of delGuion) assert.ok(GUION.includes(n));
});

test("ninguna llave en el ejemplo, en la imagen ni en el compose; las de la casa salen de su volumen", () => {
  for (const s of [...SECRETOS, "ELDORADO_CORREOS_DE_LA_CASA", "NGROK_DOMAIN", "ELDORADO_DOMINIO"])
    assert.equal(DEL_EJEMPLO.get(s), "", `${s} tiene que ir en blanco en el ejemplo`);
  // La llave de la web y el secreto no los pone nadie: los crea la casa la primera vez.
  for (const texto of [EJEMPLO, COMPOSE, PUERTA, DOCKERFILE]) {
    assert.ok(!/ELDORADO_LLAVE\b/.test(texto));
    assert.ok(!/ELDORADO_SECRETO\b/.test(texto));
  }
  // La imagen no lleva nada del entorno que sea una llave.
  for (const linea of DOCKERFILE.split("\n").filter((l) => /^\s*(ENV|ARG)\b/.test(l)))
    assert.ok(!/KEY|TOKEN|SECRET|LLAVE/i.test(linea), linea);
  // Y el .env de verdad no se sube: .gitignore lo deja fuera, menos el de ejemplo.
  const ignorado = spawnSync("git", ["check-ignore", "-q", "agent/arranque/.env"], { cwd: RAIZ });
  assert.equal(ignorado.status, 0, "agent/arranque/.env tiene que estar en .gitignore");
  const ejemplo = spawnSync("git", ["check-ignore", "-q", "agent/arranque/.env.ejemplo"], { cwd: RAIZ });
  assert.equal(ejemplo.status, 1, "el .env de ejemplo sí se sube");
});

test("cada servicio recibe solo sus llaves", () => {
  const casa = entornoDe(servicio(COMPOSE, "casa"));
  const tunel = entornoDe(servicio(COMPOSE, "tunel"));
  const puerta = entornoDe(servicio(PUERTA, "puerta"));
  assert.ok(casa.includes("ELDORADO_TOKEN_DE_CLAUDE") && casa.includes("LITEAPI_KEY"));
  assert.ok(!casa.includes("NGROK_AUTHTOKEN"));
  assert.deepEqual(tunel.sort(), ["ELDORADO_PUERTO", "HOME", "NGROK_AUTHTOKEN", "NGROK_DOMAIN"]);
  assert.deepEqual(puerta.sort(), ["ELDORADO_CORREO_DEL_CERTIFICADO", "ELDORADO_DOMINIO"]);
  // A la casa, con la puerta, solo se le cambia la dirección que dice para Vercel.
  assert.deepEqual(entornoDe(servicio(PUERTA, "casa")), ["ELDORADO_DIRECCION_PUBLICA"]);
});

test("ningún puerto abierto sin la puerta, y con ella solo el 443 y el 80; la casa sigue escuchando dentro", () => {
  assert.ok(!/^\s*ports:/m.test(COMPOSE), "compose.yaml no abre nada");
  assert.ok(!/^\s*expose:/m.test(COMPOSE + PUERTA));
  const puertos = [...PUERTA.matchAll(/^\s+- "([^"]+)"$/gm)].map((m) => m[1]).filter((p) => /^\d/.test(p));
  assert.deepEqual(puertos.sort(), ["443:443/tcp", "80:80/tcp"]);
  // Los que la sacan fuera comparten su red; la casa escucha en 127.0.0.1 (arrancar.ts).
  assert.match(servicio(COMPOSE, "tunel"), /network_mode: service:casa/);
  assert.match(servicio(PUERTA, "puerta"), /network_mode: service:casa/);
  assert.match(readFileSync(join(RAIZ, "agent", "launcher", "arrancar.ts"), "utf8"), /listen\(puerto, "127\.0\.0\.1"/);
  assert.ok(!/network_mode: host/.test(COMPOSE + PUERTA));
});

test("cada servicio con su reinicio, su tope y sin privilegios; la casa espera a lo que investiga al apagarse", () => {
  for (const [texto, nombre] of [
    [COMPOSE, "casa"],
    [COMPOSE, "tunel"],
    [PUERTA, "puerta"],
  ] as const) {
    const b = servicio(texto, nombre);
    const conComun = b.includes("<<: *comun");
    for (const regla of ["restart: unless-stopped", "read_only: true", "cap_drop: [ALL]", "no-new-privileges:true"])
      assert.ok(conComun || b.includes(regla), `${nombre}: falta ${regla}`);
    assert.match(b, /mem_limit: /, `${nombre}: sin tope de memoria`);
    assert.match(b, /cpus: /, `${nombre}: sin tope de núcleos`);
  }
  const comun = COMPOSE.slice(COMPOSE.indexOf("x-comun"), COMPOSE.indexOf("services:"));
  for (const regla of ["restart: unless-stopped", "init: true", "read_only: true", "cap_drop: [ALL]"])
    assert.ok(comun.includes(regla), regla);
  const casa = servicio(COMPOSE, "casa");
  assert.match(casa, /mem_limit: \$\{ELDORADO_MEMORIA:-3g\}/);
  assert.match(casa, /cpus: \$\{ELDORADO_NUCLEOS:-2\}/);
  assert.match(casa, /stop_grace_period: \$\{ELDORADO_ESPERA_AL_APAGAR:-60m\}/);
  assert.equal(DEL_EJEMPLO.get("ELDORADO_MEMORIA"), "3g");
  assert.equal(DEL_EJEMPLO.get("ELDORADO_NUCLEOS"), "2");
  // La puerta solo puede abrir puertos bajos; nada más.
  assert.match(servicio(PUERTA, "puerta"), /cap_add: \[NET_BIND_SERVICE\]/);
  assert.match(COMPOSE, /^volumes:\n(.*\n)*\s+datos:/m);
});

test("la imagen: Node fijado, Claude Code fijado y sin ponerse al día, sin privilegios, y solo el agente", () => {
  assert.match(DOCKERFILE, /^FROM node:22\.22\.0-bookworm-slim$/m);
  assert.match(DOCKERFILE, /^ARG CLAUDE_CODE=\d+\.\d+\.\d+$/m);
  assert.match(DOCKERFILE, /@anthropic-ai\/claude-code@\$\{CLAUDE_CODE\}/);
  assert.match(DOCKERFILE, /DISABLE_AUTOUPDATER=1/);
  assert.match(DOCKERFILE, /useradd --uid 10001/);
  assert.match(DOCKERFILE, /^USER casa$/m);
  assert.match(DOCKERFILE, /npm ci --omit=dev/);
  const copias = DOCKERFILE.split("\n").filter((l) => l.startsWith("COPY"));
  assert.deepEqual(copias, ["COPY package.json package-lock.json ./", "COPY agent ./agent"]);
  assert.match(PUERTA, /image: caddy:\d+\.\d+\.\d+-alpine/);
});

/** Lo que deja entrar Dockerfile.dockerignore: el último patrón que casa manda, como en Docker. */
function entraEnLaImagen(ruta: string): boolean {
  const patrones = lee("Dockerfile.dockerignore")
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.startsWith("#"));
  let dentro = true;
  for (const p of patrones) {
    const niega = p.startsWith("!");
    const forma = niega ? p.slice(1) : p;
    const casa = forma === "*" || ruta === forma || ruta.startsWith(forma + "/");
    if (casa) dentro = niega;
  }
  return dentro;
}

test("en la imagen entra el agente y nada de pruebas, web, docs, ni el .env", () => {
  for (const r of [
    "package.json",
    "package-lock.json",
    "agent/launcher/arrancar.ts",
    "agent/arranque/entrada.sh",
    "agent/arranque/vigia.sh",
  ])
    assert.ok(entraEnLaImagen(r), r);
  for (const r of [
    "agent/arranque/.env",
    "agent/arranque/.env.ejemplo",
    "agent/arranque/casa.sh",
    "tests/code/arranque.test.ts",
    "web/package.json",
    "docs/plan.md",
    "node_modules/sharp/package.json",
    ".git/config",
  ])
    assert.ok(!entraEnLaImagen(r), r);
});

test("la puerta: solo las rutas y los métodos de la casa, con el tope de tamaño y sin apuntar las peticiones", () => {
  assert.match(CADDY, /admin off/);
  assert.ok(!/^\s*log\b/m.test(CADDY), "sin registro de cada petición: apuntaría la sesión del viajero");
  assert.match(CADDY, /protocols h1 h2/);
  assert.match(CADDY, /read_header \d+s/);
  assert.match(CADDY, /read_body \d+s/);
  assert.ok(!/\bwrite\s+\d/.test(CADDY), "sin tiempo de escritura: lo que pasa en vivo es una conexión larga");
  assert.equal(Number(/max_size (\d+)KB/.exec(CADDY)?.[1]) * 1024, PESO_DE_UNA_PETICION);
  assert.match(CADDY, /method GET POST PUT DELETE\n/);
  assert.match(CADDY, /reverse_proxy 127\.0\.0\.1:4320 \{\n\s+flush_interval -1/);
  assert.match(CADDY, /handle \{\n\s+respond 404\n\s+\}/);
  // Las rutas que pasan son las de la puerta de la casa, ni una más.
  const rutas = /path ([^\n]+)\n/.exec(CADDY)![1].split(" ");
  assert.deepEqual(rutas, [
    "/salud",
    "/vistazo",
    "/cuentas",
    "/sesiones",
    "/cuenta",
    "/cuenta/clave",
    "/cuenta/gasto",
    "/viajes",
    "/viajes/*",
  ]);
  const puerta = readFileSync(join(RAIZ, "agent", "launcher", "puerta_a_la_web.ts"), "utf8");
  const deLaCasa = new Set([...puerta.matchAll(/^\/\/ {3}[A-Z]+ +(\/[a-z]+(?:\/[a-z]+)?)/gm)].map((m) => m[1]));
  for (const r of deLaCasa) assert.ok(rutas.includes(r) || r.startsWith("/viajes"), r);
});

test("el túnel: con la misma imagen, sin inspección, y quieto si le falta su llave o su dirección", () => {
  const tunel = lee("tunel.sh");
  assert.match(tunel, /ngrok http "127\.0\.0\.1:\$\{ELDORADO_PUERTO:-4320\}" --url "https:\/\/\$\{NGROK_DOMAIN\}"/);
  assert.match(tunel, /--log stdout --inspect=false/);
  assert.match(tunel, /exec \/app\/agent\/arranque\/vigia\.sh \\\n\s+ngrok http/);
  const r = spawnSync("sh", [join(AQUI, "tunel.sh")], {
    env: { PATH: conFalsos({ sleep: 'echo "durmiendo $*"' }), NGROK_AUTHTOKEN: "" },
    encoding: "utf8",
  });
  assert.match(r.stdout, /faltan NGROK_AUTHTOKEN o NGROK_DOMAIN/);
  assert.match(r.stdout, /durmiendo infinity/);
});

test("el vigía: mientras la casa contesta, deja en paz a quien la saca fuera; si deja de contestar, sale", () => {
  const corre = (curl: string): ReturnType<typeof spawnSync> =>
    spawnSync("sh", [join(AQUI, "vigia.sh"), "sleep", "30"], {
      env: {
        PATH: conFalsos({ curl, sleep: 'exec /bin/sleep "$@"' }),
        ELDORADO_VIGIA_CADA: "0.1",
        ELDORADO_VIGIA_VECES: "3",
      },
      encoding: "utf8",
      timeout: 2_000,
    });
  const caida = corre("exit 7");
  assert.equal(caida.status, 1);
  assert.match(String(caida.stdout), /La casa no contesta/);
  // Con la casa contestando, sigue ahí hasta que se le corta.
  const viva = corre("exit 0");
  // Lo corta el tope de la prueba, no sale sola. Al cortarla, apaga con orden a quien llevaba delante.
  assert.equal((viva.error as NodeJS.ErrnoException | undefined)?.code, "ETIMEDOUT", "no tenía que salir sola");
  assert.doesNotMatch(String(viva.stdout), /La casa no contesta/);
  // Y los dos que comparten la red de la casa van con él, y arrancan cuando la casa ya contesta.
  assert.match(servicio(PUERTA, "puerta"), /entrypoint: \["\/bin\/sh", "\/vigia\.sh"\]/);
  assert.match(servicio(PUERTA, "puerta"), /- \.\/vigia\.sh:\/vigia\.sh:ro/);
  for (const b of [servicio(PUERTA, "puerta"), servicio(COMPOSE, "tunel")])
    assert.match(b, /casa: \{ condition: service_healthy \}/);
});

test("lo que arranca crea sus llaves la primera vez, las guarda y dice lo que va en Vercel sin el secreto", () => {
  const datos = mkdtempSync(join(tmpdir(), "arranque-"));
  const corre = (): ReturnType<typeof spawnSync> =>
    spawnSync(
      "sh",
      [join(AQUI, "entrada.sh"), "sh", "-c", 'echo "llave=$ELDORADO_LLAVE secreto=${#ELDORADO_SECRETO}"'],
      {
        env: {
          PATH: process.env.PATH,
          ELDORADO_LLAVES: join(datos, "llaves"),
          ELDORADO_MESA: join(datos, "mesa"),
          ELDORADO_DIRECCION_PUBLICA: "1-2-3-4.sslip.io",
        },
        encoding: "utf8",
      },
    );
  const primera = corre();
  assert.equal(primera.status, 0, String(primera.stderr));
  const llave = readFileSync(join(datos, "llaves", "llave"), "utf8");
  const secreto = readFileSync(join(datos, "llaves", "secreto"), "utf8");
  assert.match(llave, /^[0-9a-f]{64}$/);
  assert.match(secreto, /^[0-9a-f]{64}$/);
  assert.notEqual(llave, secreto);
  const dicho = String(primera.stdout);
  assert.match(dicho, /ELDORADO_CASA_URL = https:\/\/1-2-3-4\.sslip\.io/);
  assert.ok(dicho.includes(`ELDORADO_LLAVE    = ${llave}`));
  assert.ok(!dicho.includes(secreto), "el secreto no se enseña");
  // La casa recibe las dos, el secreto de 32 bytes.
  assert.ok(dicho.includes(`llave=${llave} secreto=64`));
  // La segunda vez, las mismas.
  const segunda = corre();
  assert.ok(String(segunda.stdout).includes(`ELDORADO_LLAVE    = ${llave}`));
  assert.ok(!String(segunda.stdout).includes("Primera vez"));
  assert.equal(readFileSync(join(datos, "llaves", "secreto"), "utf8"), secreto);
  // Solo las lee su dueño.
  const permisos = spawnSync("stat", ["-c", "%a", join(datos, "llaves", "secreto"), join(datos, "llaves")], {
    encoding: "utf8",
  });
  assert.deepEqual(permisos.stdout.trim().split("\n"), ["600", "700"]);
});

// El guion, con todo de mentira: cada orden apunta lo que se le pide y contesta lo que contestaría.
const LLAVE = "a".repeat(64);
const FALSOS: Record<string, string> = {
  id: 'echo "${FALSO_UID:-0}"',
  ip: 'echo "1.1.1.1 via 5.6.7.1 dev eth0 src ${FALSA_IP:-5.6.7.8} uid 0"',
  sleep: "true",
  "apt-get": "true",
  systemctl: "true",
  git: "true",
  ufw: 'if [ "$1" = status ]; then echo "Status: ${FALSO_UFW:-active}"; fi',
  docker: ['case "$*" in', `  *"exec -T casa cat /datos/llaves/llave"*) echo "${LLAVE}" ;;`, "esac"].join("\n"),
  curl: [
    'auth=no; for a in "$@"; do case "$a" in Authorization*) auth=si ;; https://*) url="$a" ;; esac; done',
    'case "$url" in',
    "  */salud) printf '%s\\n%s' '{\"ok\":true}' 200 ;;",
    "  */cuenta) if [ $auth = si ]; then printf '%s\\n%s' '{\"error\":\"no_session\"}' 401;",
    "    else printf '%s\\n%s' '{\"error\":\"unauthorized\"}' 401; fi ;;",
    "  *) printf '%s\\n%s' 'Not Found' 404 ;;",
    "esac",
  ].join("\n"),
};

function conFalsos(otros: Record<string, string> = {}): string {
  const carpeta = mkdtempSync(join(tmpdir(), "falsos-"));
  const registro = join(carpeta, "llamadas.log");
  for (const [orden, cuerpo] of Object.entries({ ...FALSOS, ...otros })) {
    const ruta = join(carpeta, orden);
    writeFileSync(ruta, `#!/bin/sh\necho "${orden} $*" >> "${registro}"\n${cuerpo}\n`);
    chmodSync(ruta, 0o755);
  }
  return `${carpeta}:${process.env.PATH}`;
}

const LLENO: Record<string, string> = {
  ELDORADO_TOKEN_DE_CLAUDE: "token-de-mentira",
  ELDORADO_CORREOS_DE_LA_CASA: "yo@ejemplo.com, otra@ejemplo.com",
  ELDORADO_MODELO: "un-modelo",
  LITEAPI_KEY: "x",
  TRAVELPAYOUTS_TOKEN: "x",
  PARALLEL_API_KEY: "x",
  ELDORADO_CORREO_DEL_CERTIFICADO: "yo@ejemplo.com",
};

/** Una copia del repositorio con el arranque y su .env, y el guion corrido en ella con los falsos. */
function guion(
  orden: string,
  env: Record<string, string> | null,
  mas: Record<string, string> = {},
): { status: number | null; salida: string; llamadas: string[]; env: string } {
  const raiz = mkdtempSync(join(tmpdir(), "servidor-"));
  const aqui = join(raiz, "agent", "arranque");
  mkdirSync(aqui, { recursive: true });
  cpSync(AQUI, aqui, { recursive: true, filter: (f) => !f.endsWith("/.env") });
  if (env !== null)
    writeFileSync(
      join(aqui, ".env"),
      EJEMPLO.split("\n")
        .map((l) => {
          const n = l.split("=")[0];
          return n in env ? `${n}=${env[n]}` : l;
        })
        .join("\n"),
    );
  const path = conFalsos();
  const r = spawnSync("bash", [join(aqui, "casa.sh"), orden], {
    env: { PATH: path, HOME: raiz, ...mas },
    encoding: "utf8",
  });
  const log = join(path.split(":")[0], "llamadas.log");
  return {
    status: r.status,
    salida: `${r.stdout}${r.stderr}`,
    llamadas: existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [],
    env: existsSync(join(aqui, ".env")) ? readFileSync(join(aqui, ".env"), "utf8") : "",
  };
}

test("instalar con la puerta: abre el 443 y el 80, pone la dirección gratuita, arranca y comprueba", () => {
  const r = guion("instalar", LLENO);
  assert.equal(r.status, 0, r.salida);
  assert.match(r.env, /^ELDORADO_DOMINIO=5-6-7-8\.sslip\.io$/m);
  const ufw = r.llamadas.filter((l) => l.startsWith("ufw allow"));
  assert.deepEqual(
    ufw.map((l) => l.split(" ")[2]),
    ["443/tcp", "80/tcp"],
  );
  const compose = r.llamadas.filter((l) => l.startsWith("docker compose") && !l.includes("compose version"));
  assert.ok(compose.length > 0 && compose.every((l) => l.includes("compose.puerta.yaml") && !l.includes("--profile")));
  assert.ok(compose.some((l) => l.endsWith("build")));
  assert.ok(compose.some((l) => l.endsWith("up -d --remove-orphans")));
  for (const ok of ["por dentro", "desde fuera", "no deja pasar", "la casa contesta", "está cerrado"])
    assert.ok(r.salida.includes(ok), ok);
  assert.match(r.salida, /ELDORADO_CASA_URL = https:\/\/5-6-7-8\.sslip\.io/);
  assert.ok(r.salida.includes(`ELDORADO_LLAVE    = ${LLAVE}`));
  assert.match(r.salida, /regístrate/);
  // Ningún secreto del .env sale en lo que dice.
  assert.ok(!r.salida.includes("token-de-mentira"));
});

test("instalar con el túnel: no abre nada, usa su perfil y no comprueba lo que solo es de la puerta", () => {
  const r = guion("instalar", {
    ...LLENO,
    ELDORADO_LLEGADA: "tunel",
    NGROK_AUTHTOKEN: "ngrok-de-mentira",
    NGROK_DOMAIN: "casa-eldorado.ngrok-free.app",
  });
  assert.equal(r.status, 0, r.salida);
  assert.ok(!r.llamadas.some((l) => l.startsWith("ufw allow")), "con el túnel no se abre nada");
  const compose = r.llamadas.filter((l) => l.startsWith("docker compose") && !l.includes("compose version"));
  assert.ok(compose.every((l) => l.includes("--profile tunel") && !l.includes("compose.puerta.yaml")));
  assert.ok(r.llamadas.some((l) => l.startsWith("curl") && l.includes("ngrok-skip-browser-warning")));
  assert.match(r.salida, /ELDORADO_CASA_URL = https:\/\/casa-eldorado\.ngrok-free\.app/);
  assert.match(r.env, /^ELDORADO_DOMINIO=$/m, "con el túnel no se pone la dirección gratuita");
  assert.ok(!r.salida.includes("ngrok-de-mentira"));
});

test("el guion para antes de tocar nada si falta algo, si no es root, o si no hay .env", () => {
  const sinToken = guion("instalar", { ...LLENO, ELDORADO_TOKEN_DE_CLAUDE: "" });
  assert.notEqual(sinToken.status, 0);
  assert.match(sinToken.salida, /faltan en el \.env: ELDORADO_TOKEN_DE_CLAUDE/);
  const tocan = (r: { llamadas: string[] }): string[] =>
    r.llamadas.filter((l) => l.startsWith("ufw allow") || /docker compose .*(build|up)/.test(l));
  assert.deepEqual(tocan(sinToken), []);

  const tunelSinDireccion = guion("instalar", { ...LLENO, ELDORADO_LLEGADA: "tunel", NGROK_AUTHTOKEN: "x" });
  assert.match(tunelSinDireccion.salida, /faltan en el \.env: NGROK_DOMAIN/);
  assert.deepEqual(tocan(tunelSinDireccion), []);

  const conHttps = guion("instalar", {
    ...LLENO,
    ELDORADO_LLEGADA: "tunel",
    NGROK_AUTHTOKEN: "x",
    NGROK_DOMAIN: "https://algo.ngrok-free.app",
  });
  assert.match(conHttps.salida, /NGROK_DOMAIN va sin https/);

  const otraManera = guion("instalar", { ...LLENO, ELDORADO_LLEGADA: "abierta" });
  assert.match(otraManera.salida, /tiene que ser puerta o tunel/);

  const malCorreo = guion("instalar", { ...LLENO, ELDORADO_CORREOS_DE_LA_CASA: "yo" });
  assert.match(malCorreo.salida, /no parece un correo/);

  const ipPrivada = guion("instalar", LLENO, { FALSA_IP: "10.0.0.5" });
  assert.match(ipPrivada.salida, /no es pública/);
  assert.deepEqual(tocan(ipPrivada), []);

  const sinRoot = guion("instalar", LLENO, { FALSO_UID: "1000" });
  assert.match(sinRoot.salida, /como root/);
  assert.deepEqual(
    sinRoot.llamadas.filter((l) => !l.startsWith("id")),
    [],
  );

  const sinEnv = guion("instalar", null);
  assert.notEqual(sinEnv.status, 0);
  assert.match(sinEnv.salida, /se ha copiado el de ejemplo/);
  assert.equal(sinEnv.env, EJEMPLO);
  assert.deepEqual(tocan(sinEnv), []);
});

test("sin ufw activo, el guion no abre nada por su cuenta y dice qué abrir", () => {
  const r = guion("instalar", LLENO, { FALSO_UFW: "inactive" });
  assert.equal(r.status, 0, r.salida);
  assert.ok(!r.llamadas.some((l) => l.startsWith("ufw allow")));
  assert.match(r.salida, /abre en él el 443 y el 80/);
});

test("ponerse al día: baja lo nuevo, construye con la casa en marcha y cambia sin cortarla", () => {
  const r = guion("actualizar", { ...LLENO, ELDORADO_DOMINIO: "casa.ejemplo.com" });
  assert.equal(r.status, 0, r.salida);
  const pasos = r.llamadas
    .filter((l) => l.startsWith("git") || /docker compose .*(build|up -d)/.test(l))
    .map((l) => (l.startsWith("git") ? "git" : l.endsWith("build") ? "build" : "up"));
  assert.deepEqual(pasos, ["git", "build", "up"]);
  assert.ok(r.llamadas.some((l) => l.includes("pull --ff-only")));
  // Ni se para antes, ni se baja nada: la vieja deja acabar lo que investiga (stop_grace_period).
  assert.ok(!r.llamadas.some((l) => /docker compose .* (down|stop|kill|rm)\b/.test(l)));
  assert.ok(!r.llamadas.some((l) => l.startsWith("ufw allow")), "ponerse al día no abre nada");
  assert.match(r.salida, /deja acabar/);
});

test("lo nuevo del arranque no lleva rayas largas, puntos medios ni puntos suspensivos, ni identificadores", () => {
  const prohibidos = new RegExp(
    "[" + [0x2014, 0x2013, 0xb7, 0x2026].map((c) => String.fromCodePoint(c)).join("") + "]",
  );
  for (const nombre of ["Dockerfile", "Dockerfile.dockerignore", "Caddyfile", ".env.ejemplo", "casa.sh", "entrada.sh"])
    assert.ok(!prohibidos.test(lee(nombre)), nombre);
  for (const nombre of ["casa.sh", "entrada.sh", "tunel.sh", "vigia.sh"]) {
    assert.equal(spawnSync("bash", ["-n", join(AQUI, nombre)]).status, 0, `${nombre} no se lee`);
    for (const [i, linea] of lee(nombre).split("\n").entries()) assert.ok(linea.length <= 120, `${nombre}:${i + 1}`);
  }
});

// La web, hablando con la casa por fuera.
const PETICION: DeLaWeb = {
  metodo: "GET",
  partes: ["cuenta"],
  consulta: "",
  cabeceras: { origen: null, sitio: null, tipo: null, cookie: null },
  cuerpo: null,
};

test("con la casa detrás de ngrok, la web le pide que no ponga su aviso; con la puerta, no", async () => {
  assert.ok(porNgrok("https://casa-eldorado.ngrok-free.app"));
  assert.ok(porNgrok("https://algo.ngrok.dev"));
  assert.ok(!porNgrok("https://5-6-7-8.sslip.io"));
  assert.ok(!porNgrok("https://ngrok-free.app.otro.com"));
  assert.ok(!porNgrok("no es una dirección"));
  const vistas: Record<string, string>[] = [];
  const pedir = (async (_url: string, o: RequestInit) => {
    vistas.push(o.headers as Record<string, string>);
    assert.ok(o.signal instanceof AbortSignal, "lo que no es en vivo tiene su tiempo");
    return new Response('{"error":"no_session"}', { status: 401 });
  }) as unknown as typeof fetch;
  const llave = "k".repeat(32);
  await aLaCasa(PETICION, { ELDORADO_CASA_URL: "https://casa-eldorado.ngrok-free.app", ELDORADO_LLAVE: llave }, pedir);
  await aLaCasa(PETICION, { ELDORADO_CASA_URL: "https://5-6-7-8.sslip.io", ELDORADO_LLAVE: llave }, pedir);
  assert.equal(vistas[0]["ngrok-skip-browser-warning"], "1");
  assert.ok(!("ngrok-skip-browser-warning" in vistas[1]));
});

test("si la casa no contesta a tiempo, o ngrok contesta con su página, la web lo dice como hoy", async () => {
  const llave = "k".repeat(32);
  const entorno = { ELDORADO_CASA_URL: "https://casa-eldorado.ngrok-free.app", ELDORADO_LLAVE: llave };
  const tarde = (async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  }) as unknown as typeof fetch;
  assert.equal((await aLaCasa(PETICION, entorno, tarde)).cuerpo, '{"error":"house_down"}');
  const pagina = (async () => new Response("<html>ERR_NGROK_3200</html>", { status: 404 })) as unknown as typeof fetch;
  assert.equal((await aLaCasa(PETICION, entorno, pagina)).cuerpo, '{"error":"house_down"}');
  // Y la pasarela tiene en Vercel el tiempo largo de lo que pasa en vivo.
  const ruta = readFileSync(join(RAIZ, "web", "src", "app", "api", "house", "[...path]", "route.ts"), "utf8");
  assert.match(ruta, /export const maxDuration = 300;/);
});
