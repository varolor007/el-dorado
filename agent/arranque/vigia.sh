#!/bin/sh
# El vigía de quien saca la casa fuera (la puerta o el túnel), que comparte su red. Si la casa se reinicia, su red
# es otra y quien la compartía se queda sin ella: el vigía lo nota (la casa deja de contestar en 127.0.0.1) y sale,
# y Docker lo vuelve a arrancar ya en la red nueva.
#
#   vigia.sh <la orden que saca la casa fuera>
set -u

puerto="${ELDORADO_PUERTO:-4320}"
cada="${ELDORADO_VIGIA_CADA:-30}"
veces="${ELDORADO_VIGIA_VECES:-3}"

responde() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:${puerto}/salud"
  else
    wget -q -O /dev/null -T 5 "http://127.0.0.1:${puerto}/salud"
  fi
}

"$@" &
hijo=$!
trap 'kill -TERM "$hijo" 2>/dev/null; wait "$hijo"; exit 0' TERM INT

fallos=0
while kill -0 "$hijo" 2>/dev/null; do
  sleep "$cada" &
  wait $!
  if responde 2>/dev/null; then
    fallos=0
  else
    fallos=$((fallos + 1))
    if [ "$fallos" -ge "$veces" ]; then
      echo "La casa no contesta: se sale para volver a arrancar en su red."
      kill -TERM "$hijo" 2>/dev/null
      wait "$hijo"
      exit 1
    fi
  fi
done
wait "$hijo"
exit $?
