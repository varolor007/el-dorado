#!/usr/bin/env bash
# La casa de El Dorado en el servidor: una orden para cada cosa. Se corre como root, desde donde sea.
#
#   sudo ./casa.sh instalar     la primera vez (y cada vez que cambies el .env): prepara, arranca y comprueba
#   sudo ./casa.sh actualizar   baja lo nuevo del repositorio y reconstruye, sin cortar lo que se investiga
#   sudo ./casa.sh vercel       lo que va en Vercel
#   sudo ./casa.sh estado       cómo están los servicios
#   sudo ./casa.sh registro     lo que va diciendo la casa (Ctrl+C para salir)
#   sudo ./casa.sh parar        la para (también espera a lo que se investiga)
#
# La manera de llegar la dice ELDORADO_LLEGADA en el .env: «puerta» (Caddy, con el 443 y el 80 abiertos) o «tunel»
# (ngrok, sin abrir nada). El .env se lee como texto: no se ejecuta.

set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
ENV="$AQUI/.env"
PUERTO=4320

di() { printf '%s\n' "$*"; }
bien() { printf 'OK: %s\n' "$*"; }
para() {
  printf 'PARADO: %s\n' "$*" >&2
  exit 1
}

# El valor de una línea del .env, sin comillas alrededor. Vacío si no está.
leer() {
  local linea
  linea="$(grep -E "^$1=" "$ENV" 2>/dev/null | tail -n 1 || true)"
  linea="${linea#*=}"
  linea="${linea%$'\r'}"
  linea="${linea#\"}"
  linea="${linea%\"}"
  linea="${linea#\'}"
  linea="${linea%\'}"
  printf '%s' "$linea"
}

# Pone (o cambia) una línea del .env.
poner() {
  if grep -qE "^$1=" "$ENV"; then
    sed -i "s|^$1=.*|$1=$2|" "$ENV"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV"
  fi
}

llegada() {
  local l
  l="$(leer ELDORADO_LLEGADA)"
  printf '%s' "${l:-puerta}"
}

# docker compose, con los archivos de la manera elegida.
dc() {
  local args=(compose --project-directory "$AQUI" --env-file "$ENV" -f "$AQUI/compose.yaml")
  if [ "$(llegada)" = "puerta" ]; then
    args+=(-f "$AQUI/compose.puerta.yaml")
  else
    args+=(--profile tunel)
  fi
  docker "${args[@]}" "$@"
}

direccion() {
  if [ "$(llegada)" = "puerta" ]; then leer ELDORADO_DOMINIO; else leer NGROK_DOMAIN; fi
}

llave() {
  dc exec -T casa cat /datos/llaves/llave
}

# Pide algo a la casa desde fuera, como lo haría Vercel. Deja el código en $CODIGO y lo que contesta en $CUERPO.
CODIGO=""
CUERPO=""
desde_fuera() {
  local ruta="$1" autorizacion="${2:-}" salida
  local cabeceras=(-H "ngrok-skip-browser-warning: 1")
  [ -n "$autorizacion" ] && cabeceras+=(-H "Authorization: Bearer $autorizacion")
  salida="$(curl -sS --max-time 15 "${cabeceras[@]}" -w '\n%{http_code}' "https://$(direccion)$ruta" 2>/dev/null ||
    true)"
  CODIGO="${salida##*$'\n'}"
  CUERPO="${salida%$'\n'*}"
}

como_root() {
  [ "$(id -u)" = "0" ] || para "hay que correrlo como root: sudo $0 $*"
}

preparar_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    di "No hay Docker: se instala (docker.io y docker-compose-v2, de Ubuntu)."
    apt-get update
    apt-get install -y docker.io docker-compose-v2
    systemctl enable --now docker
  elif ! docker compose version >/dev/null 2>&1; then
    di "Docker está, pero sin compose: se instala docker-compose-v2."
    apt-get update
    apt-get install -y docker-compose-v2
  fi
  docker compose version >/dev/null 2>&1 || para "docker compose no responde"
  bien "Docker y compose, listos."
}

# Que el .env lo tenga todo. No enseña ningún valor secreto.
mirar_el_env() {
  if [ ! -f "$ENV" ]; then
    cp "$AQUI/.env.ejemplo" "$ENV"
    chmod 600 "$ENV"
    para "no había .env: se ha copiado el de ejemplo en $ENV. Rellénalo (nano $ENV) y vuelve a correr esto."
  fi
  chmod 600 "$ENV"
  local faltan=() v
  for v in ELDORADO_TOKEN_DE_CLAUDE ELDORADO_CORREOS_DE_LA_CASA ELDORADO_MODELO LITEAPI_KEY TRAVELPAYOUTS_TOKEN \
    PARALLEL_API_KEY; do
    [ -n "$(leer "$v")" ] || faltan+=("$v")
  done
  case "$(llegada)" in
    puerta)
      [ -n "$(leer ELDORADO_CORREO_DEL_CERTIFICADO)" ] || faltan+=(ELDORADO_CORREO_DEL_CERTIFICADO)
      ;;
    tunel)
      [ -n "$(leer NGROK_AUTHTOKEN)" ] || faltan+=(NGROK_AUTHTOKEN)
      [ -n "$(leer NGROK_DOMAIN)" ] || faltan+=(NGROK_DOMAIN)
      ;;
    *) para "ELDORADO_LLEGADA tiene que ser puerta o tunel" ;;
  esac
  [ ${#faltan[@]} -eq 0 ] || para "faltan en el .env: ${faltan[*]}"
  local correo
  IFS=',' read -ra correos <<<"$(leer ELDORADO_CORREOS_DE_LA_CASA)"
  for correo in "${correos[@]}"; do
    correo="${correo// /}"
    [[ "$correo" == *@*.* ]] || para "ELDORADO_CORREOS_DE_LA_CASA: «$correo» no parece un correo"
  done
  [ -n "$(leer GEOAPIFY_KEY)" ] || di "Aviso: sin GEOAPIFY_KEY, lo de andar y el coche no tendrá su fuente de rutas."
  local nombre='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  if [ "$(llegada)" = "tunel" ] && ! [[ "$(leer NGROK_DOMAIN)" =~ $nombre ]]; then
    para "NGROK_DOMAIN va sin https:// ni barras: algo como tu-nombre.ngrok-free.app"
  fi
  if [ "$(llegada)" = "puerta" ] && [ -n "$(leer ELDORADO_DOMINIO)" ] && ! [[ "$(leer ELDORADO_DOMINIO)" =~ $nombre ]]
  then
    para "ELDORADO_DOMINIO va sin https:// ni barras: algo como casa.tudominio.com"
  fi
  local memoria nucleos espera
  memoria="$(leer ELDORADO_MEMORIA)"
  nucleos="$(leer ELDORADO_NUCLEOS)"
  espera="$(leer ELDORADO_ESPERA_AL_APAGAR)"
  [[ -z "$memoria" || "$memoria" =~ ^[0-9]+[mg]$ ]] || para "ELDORADO_MEMORIA va como 3g o 2048m"
  [[ -z "$nucleos" || "$nucleos" =~ ^[0-9]+(\.[0-9]+)?$ ]] || para "ELDORADO_NUCLEOS va como 2 o 1.5"
  [[ -z "$espera" || "$espera" =~ ^[0-9]+[smh]$ ]] || para "ELDORADO_ESPERA_AL_APAGAR va como 60m"
  bien "El .env tiene lo que hace falta para la manera «$(llegada)»."
}

# La dirección gratuita: la IP del servidor con guiones, en sslip.io (1.2.3.4 da 1-2-3-4.sslip.io).
poner_la_direccion() {
  [ "$(llegada)" = "puerta" ] || return 0
  if [ -z "$(leer ELDORADO_DOMINIO)" ]; then
    local ip
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')"
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
      para "no se sabe la IP del servidor: pon tu dirección en ELDORADO_DOMINIO"
    case "$ip" in
      10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[01].* | 127.*)
        para "la IP de este servidor ($ip) no es pública: pon tu dirección en ELDORADO_DOMINIO"
        ;;
    esac
    poner ELDORADO_DOMINIO "${ip//./-}.sslip.io"
    di "La dirección gratuita: $(leer ELDORADO_DOMINIO) (guardada en el .env)."
  fi
  bien "La dirección de la casa: https://$(direccion)"
}

# El cortafuegos: con la puerta se abren el 443 y el 80; con el túnel, nada.
cortafuegos() {
  if [ "$(llegada)" = "tunel" ]; then
    di "Con el túnel no se abre ningún puerto: el cortafuegos se queda como está."
    if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qE '^(80|443)/tcp.*ALLOW'; then
      di "Aviso: el cortafuegos tiene abiertos el 443 o el 80 de antes. Si eran de la puerta, ciérralos:"
      di "  ufw delete allow 443/tcp && ufw delete allow 80/tcp"
    fi
    return 0
  fi
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
    ufw allow 443/tcp comment 'El Dorado: la puerta'
    ufw allow 80/tcp comment 'El Dorado: el certificado'
    bien "Abiertos en el cortafuegos (ufw) el 443 y el 80, para la puerta. Nada más."
  else
    di "No hay ufw activo en este servidor. Si tu cortafuegos es otro (el del panel de Contabo, por ejemplo),"
    di "abre en él el 443 y el 80 (TCP), y nada más."
  fi
}

esperar_dentro() {
  local i
  for i in $(seq 1 30); do
    if dc exec -T casa curl -fsS -o /dev/null "http://127.0.0.1:$PUERTO/salud" 2>/dev/null; then
      bien "La casa responde por dentro."
      return 0
    fi
    sleep 2
  done
  dc logs --tail 40 casa || true
  para "la casa no responde por dentro (arriba, lo último que ha dicho)"
}

comprobar_fuera() {
  local i
  di "Comprobando desde fuera, por https://$(direccion) (la primera vez, el certificado tarda hasta un par de minutos)."
  for i in $(seq 1 36); do
    desde_fuera /salud
    [ "$CODIGO" = "200" ] && break
    sleep 5
  done
  [ "$CODIGO" = "200" ] || {
    dc logs --tail 40 || true
    para "no se llega a la casa desde fuera (código ${CODIGO:-ninguno})"
  }
  bien "Se llega a la casa desde fuera."
  desde_fuera /cuenta
  [[ "$CODIGO" = "401" && "$CUERPO" == *unauthorized* ]] ||
    para "sin la llave, la casa tendría que decir que no (dijo $CODIGO)"
  bien "Sin la llave de la web, la casa no deja pasar."
  desde_fuera /cuenta "$(llave)"
  [[ "$CODIGO" = "401" && "$CUERPO" == *no_session* ]] ||
    para "con la llave, la casa tendría que pedir la sesión (dijo $CODIGO)"
  bien "Con la llave de la web, la casa contesta."
  if [ "$(llegada)" = "puerta" ]; then
    desde_fuera /otra-cosa
    [ "$CODIGO" = "404" ] || para "lo que no es de la casa tendría que estar cerrado (dijo $CODIGO)"
    bien "Lo que no es de la casa está cerrado."
  fi
}

vercel() {
  di ""
  di "Lo que va en Vercel (tu proyecto, Settings, Environment Variables), y después un Redeploy:"
  di "  ELDORADO_CASA_URL = https://$(direccion)"
  di "  ELDORADO_LLAVE    = $(llave)"
  di ""
  di "Antes de dar la dirección a nadie, regístrate en la web con cada correo de ELDORADO_CORREOS_DE_LA_CASA."
}

instalar() {
  como_root instalar
  preparar_docker
  mirar_el_env
  poner_la_direccion
  local memoria nucleos
  memoria="$(leer ELDORADO_MEMORIA)"
  nucleos="$(leer ELDORADO_NUCLEOS)"
  di "El tope de la casa: ${memoria:-3g} de memoria y ${nucleos:-2} núcleos."
  cortafuegos
  di "Construyendo la imagen (unos minutos la primera vez)."
  dc build
  dc up -d --remove-orphans
  esperar_dentro
  comprobar_fuera
  vercel
}

actualizar() {
  como_root actualizar
  mirar_el_env
  di "Bajando lo nuevo del repositorio."
  git -C "$RAIZ" pull --ff-only
  di "Construyendo la imagen nueva (la casa sigue funcionando mientras)."
  dc build
  di "Cambiando a la nueva. Si hay algo investigando, la casa lo deja acabar antes de apagarse"
  di "(hasta $(leer ELDORADO_ESPERA_AL_APAGAR)): esta orden espera con ella."
  dc up -d --remove-orphans
  esperar_dentro
  comprobar_fuera
  bien "Al día."
}

orden="${1:-}"
case "$orden" in
  instalar) instalar ;;
  actualizar) actualizar ;;
  vercel)
    como_root vercel
    vercel
    ;;
  estado)
    como_root estado
    dc ps
    ;;
  registro)
    como_root registro
    dc logs -f --tail 200
    ;;
  parar)
    como_root parar
    dc stop
    ;;
  *)
    di "Uso: sudo $0 instalar | actualizar | vercel | estado | registro | parar"
    exit 2
    ;;
esac
