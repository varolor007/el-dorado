# La imagen de la casa de El Dorado: Node, Claude Code en una versión fijada, ngrok para el túnel y solo lo que la
# casa necesita para funcionar (agent/ y sus dependencias de producción). Sin pruebas, sin la web, sin docs y sin
# ninguna llave: las llaves llegan por el entorno o se crean en su volumen al arrancar.
#
# Se construye desde la raíz del repositorio (lo hace compose.yaml); lo que entra lo dice Dockerfile.dockerignore.

FROM node:22.22.0-bookworm-slim

# Claude Code, fijado: se cambia aquí, a mano, y se reconstruye. Nunca se pone al día solo.
ARG CLAUDE_CODE=2.1.325
ARG TARGETARCH

ENV DISABLE_AUTOUPDATER=1 \
    NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE}" \
 && npm cache clean --force \
 && claude --version

# ngrok, para la arquitectura de la máquina: solo lo usa el servicio del túnel.
RUN arq="${TARGETARCH:-$(dpkg --print-architecture)}" \
 && case "$arq" in amd64|arm64) ;; *) echo "arquitectura sin ngrok: $arq" >&2; exit 1 ;; esac \
 && curl -fsSL "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-${arq}.tgz" \
    | tar -xz -C /usr/local/bin ngrok \
 && ngrok version

# Un usuario sin privilegios, con su carpeta de datos (la mesa y las llaves van ahí, en un volumen).
RUN useradd --uid 10001 --create-home --home-dir /home/casa --shell /usr/sbin/nologin casa \
 && mkdir -p /datos \
 && chown casa:casa /datos

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force
COPY agent ./agent
RUN chmod 0555 agent/arranque/entrada.sh agent/arranque/tunel.sh agent/arranque/vigia.sh

USER casa
ENTRYPOINT ["/app/agent/arranque/entrada.sh"]
CMD ["node", "agent/launcher/arrancar.ts"]
