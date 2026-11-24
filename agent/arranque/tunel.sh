#!/bin/sh
# El túnel de ngrok, si se eligió el túnel (perfil «tunel»). Comparte la red de la casa, así que llega a ella por
# 127.0.0.1 sin abrir nada en la máquina. Sin su llave o su dirección, lo dice y se queda quieto.
set -u

if [ -z "${NGROK_AUTHTOKEN:-}" ] || [ -z "${NGROK_DOMAIN:-}" ]; then
  echo "El túnel no arranca: faltan NGROK_AUTHTOKEN o NGROK_DOMAIN en el .env. Se queda quieto."
  exec sleep infinity
fi

# Sin la inspección de ngrok: guardaría lo que pasa por el túnel, contraseñas incluidas.
# Con su vigía: si la casa se reinicia, el túnel vuelve a arrancar en su red nueva.
exec /app/agent/arranque/vigia.sh \
  ngrok http "127.0.0.1:${ELDORADO_PUERTO:-4320}" --url "https://${NGROK_DOMAIN}" --log stdout --inspect=false
