#!/bin/sh
# Lo primero que corre en la casa, dentro de su contenedor. Saca sus dos llaves del volumen (o las crea la primera
# vez), dice en el registro lo que va en Vercel y arranca la casa.
#
#   - La llave de la web (ELDORADO_LLAVE): la misma va en Vercel.
#   - El secreto de la casa (ELDORADO_SECRETO): cifra la clave de IA de cada cuenta. No sale nunca de aquí ni se
#     enseña: si se pierde el volumen, esas claves ya no se pueden descifrar.
#
# Las dos son 32 bytes al azar, en hexadecimal, en archivos que solo lee el usuario de la casa.
set -eu

llaves="${ELDORADO_LLAVES:-/datos/llaves}"
umask 077
mkdir -p "$llaves" "${ELDORADO_MESA:-/datos/mesa}"

nueva() {
  head -c 32 /dev/urandom | od -An -v -tx1 | tr -d ' \n'
}

if [ ! -s "$llaves/llave" ]; then
  nueva > "$llaves/llave"
  echo "Primera vez: se ha creado la llave de la web."
fi
if [ ! -s "$llaves/secreto" ]; then
  nueva > "$llaves/secreto"
  echo "Primera vez: se ha creado el secreto de la casa (no se enseña)."
fi

ELDORADO_LLAVE="$(cat "$llaves/llave")"
ELDORADO_SECRETO="$(cat "$llaves/secreto")"
export ELDORADO_LLAVE ELDORADO_SECRETO

echo "Lo que va en Vercel (Settings, Environment Variables):"
if [ -n "${ELDORADO_DIRECCION_PUBLICA:-}" ]; then
  echo "  ELDORADO_CASA_URL = https://${ELDORADO_DIRECCION_PUBLICA}"
else
  echo "  ELDORADO_CASA_URL = (falta la dirección: mira ELDORADO_DOMINIO o NGROK_DOMAIN en el .env)"
fi
echo "  ELDORADO_LLAVE    = ${ELDORADO_LLAVE}"

exec "$@"
