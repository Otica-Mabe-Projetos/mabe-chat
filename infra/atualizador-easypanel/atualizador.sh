#!/usr/bin/env bash
# =============================================================================
# Agente de atualização do Mabe Chat (DeskcommCRM) — instalação no EasyPanel
# -----------------------------------------------------------------------------
# Faz aqui o papel do hostgator-setup-kit/agent.sh + update.sh oficiais, que
# não servem nesta instalação (supõem o kit da HostGator: git checkout de tag,
# Caddy, APP_IMAGE no .env). Fala o MESMO protocolo com o app — POST
# /api/v1/system/agent com Bearer INTERNAL_CRON_SECRET/INTERNAL_SECRET — então
# o botão nativo "Configurações › Atualização › Atualizar agora" funciona.
#
# Versão instalada = tag LOCAL mabe-chat/{app,worker,scheduler}:atual (o
# docker-compose.easypanel.yml usa essas tags com pull_policy: never).
# Atualizar = baixar a versão nova do ghcr e mover a tag; a de antes fica em
# :anterior (rollback). Assim um "Implantar" do EasyPanel, que refaz o git,
# nunca troca a versão sem querer.
#
# Dados: nada aqui apaga dado. Toda atualização começa com backup completo
# (banco + arquivos do Storage + sessões do WhatsApp) e só segue se o backup
# for legível. O banco é atualizado pelo supabase/baseline.sql da versão nova,
# do mesmo jeito do update.sh oficial (idempotente, sem ON_ERROR_STOP, com
# repetição em disputa e conferência das regras de isolamento). Se a versão
# nova não subir saudável, volta sozinho pra anterior.
#
# Comandos: loop (padrão) | heartbeat | backup [motivo] | atualizar vX.Y.Z
# Detalhes e restauração: docs/ATUALIZACAO-MABE-CHAT.md
# =============================================================================
set -uo pipefail

PROJETO="${ATUALIZADOR_PROJETO:-infraestrutua_mabe-chat-app}"
DIR_APP="${ATUALIZADOR_DIR_APP:-/etc/easypanel/projects/infraestrutua/mabe-chat-app/code}"
DB="${ATUALIZADOR_DB:-supabase-db}"
# Mesmos contêineres que o pausar_o_que_fala_com_o_banco() oficial para: com
# eles de pé o baseline disputa lock (medido lá: 113 travamentos contra 0).
PAUSAR_SUPABASE="${ATUALIZADOR_PAUSAR_SUPABASE:-supabase-rest supabase-studio realtime-dev.supabase-realtime}"
APP_URL="${ATUALIZADOR_APP_URL:-http://app:3000}"
REPO="${ATUALIZADOR_REPO:-melgarafael/DeskcommCRM}"
BACKUPS="${ATUALIZADOR_BACKUPS:-/backups}"
FONTES="${ATUALIZADOR_FONTES:-/fontes}"
RETER="${ATUALIZADOR_RETER:-14}"
HORA_BACKUP="${ATUALIZADOR_HORA_BACKUP:-3}"
INTERVALO="${ATUALIZADOR_INTERVALO_S:-300}"
SECRET="${INTERNAL_CRON_SECRET:-${INTERNAL_SECRET:-}}"
# "nome local=repositório no ghcr"
IMAGENS="app=ghcr.io/melgarafael/deskcommcrm worker=ghcr.io/melgarafael/deskcomm-worker scheduler=ghcr.io/melgarafael/deskcomm-scheduler"
# Mesmas listas de hostgator-setup-kit/_common.sh (BASELINE_ERROS_*).
BENIGNOS='already exists|multiple primary keys|multiple default values|is already a member|already a partition'
DISPUTA='deadlock detected|could not serialize access|lock timeout|could not obtain lock|terminating connection|server closed the connection|connection to server was lost|remaining connection slots|too many clients|the database system is (starting up|shutting down|in recovery mode|not yet accepting connections)|Connection refused|Connection timed out'

LOG_RUN=""   # log da atualização em andamento (a cauda vai no run_result)
RUN_ID=""
PAUSADOS=""

# Logs vão pro stderr: várias funções devolvem valor pelo stdout.
log() {
  local l; l="$(date '+%F %T') $*"
  echo "$l" >&2
  if [ -n "$LOG_RUN" ]; then echo "$l" >> "$LOG_RUN"; fi
}

dc() {
  docker compose -p "$PROJETO" -f "$DIR_APP/docker-compose.easypanel.yml" \
    -f "$DIR_APP/docker-compose.override.yml" "$@"
}

post() {  # post <json> -> corpo da resposta em 2xx; vazio (e log) em falha
  local out code
  out="$(curl -sS -X POST "$APP_URL/api/v1/system/agent" \
    -H "Authorization: Bearer $SECRET" -H 'Content-Type: application/json' \
    --max-time 20 --data-binary @- -w $'\n%{http_code}' <<<"$1" 2>&1)" || true
  code="${out##*$'\n'}"
  if [[ "$code" == 2?? ]]; then printf '%s' "${out%$'\n'*}"; else log "POST /system/agent falhou: ${out:0:300}"; fi
}

# ---------------------------------------------------------------- versões ---

versao_instalada() {  # "v1.63.3" — label gravada no build da imagem oficial
  local v
  v="$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.version"}}' mabe-chat/app:atual 2>/dev/null)"
  if [ -n "$v" ]; then echo "v${v#v}"; fi
}

sha_instalado() {
  docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' mabe-chat/app:atual 2>/dev/null | cut -c1-7
}

ultima_release() {  # última release estável do GitHub, com cache de 30 min (sem token: 60 req/h)
  local cache=/tmp/ultima-release tag
  if [ -s "$cache" ] && [ $(( $(date +%s) - $(stat -c %Y "$cache") )) -lt 1800 ]; then cat "$cache"; return 0; fi
  tag="$(curl -fsS --max-time 20 "https://api.github.com/repos/$REPO/releases/latest" \
    | jq -r 'select(.draft == false and .prerelease == false) | .tag_name // empty')" || return 1
  [ -n "$tag" ] || return 1
  echo "$tag" > "$cache"
  echo "$tag"
}

imagem_existe() {  # imagem_existe <repositório ghcr sem o host> <tag>
  local token
  token="$(curl -fsS --max-time 20 "https://ghcr.io/token?scope=repository:$1:pull" | jq -r '.token // empty')" || return 1
  [ -n "$token" ] || return 1
  curl -fsSI --max-time 20 -H "Authorization: Bearer $token" \
    -H 'Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json' \
    "https://ghcr.io/v2/$1/manifests/$2" >/dev/null 2>&1
}

todas_imagens_existem() {  # a release só é anunciada quando as 3 imagens já foram publicadas
  local par ver="${1#v}"
  for par in $IMAGENS; do
    imagem_existe "${par#*=ghcr.io/}" "$ver" || return 1
  done
}

changelog() {  # changelog <tag nova> <tag instalada> -> trecho da nova até a instalada
  curl -fsS --max-time 30 "https://raw.githubusercontent.com/$REPO/$1/CHANGELOG.md" 2>/dev/null \
    | awk -v cur="## [${2#v}]" 'index($0, cur) == 1 { exit } { print }' | head -c 60000
}

heartbeat() {  # anuncia a versão; imprime o run_id se alguém clicou em "Atualizar agora"
  local atual sha ultima="" cmp=false conhecida=false texto="" corpo resp
  atual="$(versao_instalada)"
  sha="$(sha_instalado)"
  if [ -z "$atual" ]; then log "sem a tag local mabe-chat/app:atual — nada a anunciar"; return 1; fi
  if ultima="$(ultima_release)"; then
    conhecida=true
    if [ "$ultima" = "$atual" ]; then
      ultima=""   # igual ao agent.sh oficial: em dia = não anuncia versão
    elif todas_imagens_existem "$ultima"; then
      texto="$(changelog "$ultima" "$atual")"
    else
      log "release $ultima ainda sem as 3 imagens publicadas — espero"
      ultima=""
    fi
  else
    ultima=""
    cmp=true
  fi
  corpo="$(jq -nc --arg cv "$atual" --arg sha "${sha:-?}" --arg lv "$ultima" --arg ch "$texto" \
    --argjson cmp "$cmp" --argjson kn "$conhecida" \
    '{kind:"heartbeat",current_version:$cv,current_sha:$sha,off_release:false,latest_version:$lv,compare_failed:$cmp,has_known_release:$kn,changelog:$ch}')"
  resp="$(post "$corpo")"
  [ -n "$resp" ] || return 1
  if [ "$(jq -r '(.data // .).update_requested // false' <<<"$resp" 2>/dev/null)" = "true" ]; then
    jq -r '(.data // .).run_id // empty' <<<"$resp"
  fi
}

report() {  # report <backup|codigo|banco>
  if [ -n "$RUN_ID" ]; then
    post "$(jq -nc --arg id "$RUN_ID" --arg s "$1" '{kind:"run_progress",run_id:$id,step:$s}')" >/dev/null
  fi
}

resultado() {  # resultado <success|failed|failed_rolled_back>
  [ -n "$RUN_ID" ] || return 0
  local corpo i cauda=""
  if [ -n "$LOG_RUN" ]; then cauda="$(tail -n 80 "$LOG_RUN" 2>/dev/null | tail -c 15000)"; fi
  corpo="$(jq -nc --arg id "$RUN_ID" --arg st "$1" --arg tail "$cauda" \
    '{kind:"run_result",run_id:$id,status:$st,log_tail:$tail}')"
  for i in 1 2 3 4 5 6; do
    if [ -n "$(post "$corpo")" ]; then return 0; fi
    sleep 10
  done
}

# ---------------------------------------------------------------- backup ---

backup() {  # backup <motivo> -> imprime a pasta criada
  local dir objetos
  dir="$BACKUPS/$(date +%Y%m%d-%H%M%S)-${1:-manual}"
  mkdir -p "$dir" || return 1
  log "backup: banco (pg_dump)…"
  if ! docker exec "$DB" pg_dump -U postgres -d postgres -Fc > "$dir/banco.dump"; then
    log "backup: pg_dump falhou"; return 1
  fi
  # O dump só vale se der pra ler de volta.
  objetos="$(docker exec -i "$DB" pg_restore -l < "$dir/banco.dump" 2>/dev/null | grep -c ';' || true)"
  if [ "${objetos:-0}" -lt 100 ]; then log "backup: dump ilegível ou vazio (${objetos:-0} objetos)"; return 1; fi
  log "backup: arquivos (Storage) e sessões do WhatsApp…"
  tar -czf "$dir/storage.tgz" -C "$FONTES" storage || { log "backup: storage falhou"; return 1; }
  tar -czf "$dir/whatsapp-sessoes.tgz" -C "$FONTES" waha-data || { log "backup: sessões do WhatsApp falhou"; return 1; }
  (cd "$dir" && sha256sum banco.dump storage.tgz whatsapp-sessoes.tgz > SHA256SUMS)
  printf 'versao=%s\nmotivo=%s\nobjetos_no_banco=%s\n' "$(versao_instalada)" "${1:-manual}" "$objetos" > "$dir/INFO"
  # Retenção: os $RETER backups mais novos (diários + os de antes de atualizar).
  ls -1d "$BACKUPS"/2*/ 2>/dev/null | sort | head -n -"$RETER" | xargs -r rm -rf
  log "backup ok: $dir ($(du -sh "$dir" | cut -f1), $objetos objetos no banco)"
  echo "$dir"
}

backup_diario() {
  local marca
  marca="$BACKUPS/.backup-diario-$(date +%F)"
  if [ "$(date +%-H)" -lt "$HORA_BACKUP" ] || [ -e "$marca" ]; then return 0; fi
  backup diario >/dev/null && touch "$marca"
  find "$BACKUPS" -maxdepth 1 -name '.backup-diario-*' -mtime +3 -delete 2>/dev/null || true
}

# ----------------------------------------------------------------- banco ---

pausar() {
  log "pausando app, worker, scheduler e as partes do Supabase que disputam o banco…"
  dc stop app worker scheduler >/dev/null 2>&1 || true
  local c
  PAUSADOS=""
  for c in $PAUSAR_SUPABASE; do
    if docker ps --format '{{.Names}}' | grep -qx "$c"; then PAUSADOS="$PAUSADOS $c"; fi
  done
  if [ -n "$PAUSADOS" ]; then docker stop $PAUSADOS >/dev/null 2>&1 || true; fi
}

religar_supabase() {
  if [ -n "$PAUSADOS" ]; then docker start $PAUSADOS >/dev/null 2>&1 || true; fi
  PAUSADOS=""
}

aplicar_baseline() {  # aplicar_baseline <arquivo> — mesmo contrato do reaplicar_baseline oficial
  local passada=1 saida rc inesperado
  docker exec "$DB" psql -U postgres -d postgres -qc \
    "create extension if not exists vector with schema public; create extension if not exists citext with schema public; create extension if not exists pg_trgm with schema public;" \
    >/dev/null 2>&1 || true
  while :; do
    rc=0
    saida="$(docker exec -i "$DB" psql -U postgres -d postgres -q -f - < "$1" 2>&1)" || rc=$?
    if [ -n "$LOG_RUN" ]; then printf '%s\n' "$saida" > "$LOG_RUN.banco-passada$passada"; fi
    inesperado="$(printf '%s\n' "$saida" | grep -iE 'ERROR|FATAL' | grep -viE "$BENIGNOS" || true)"
    if [ "$rc" -ne 0 ]; then inesperado="$inesperado"$'\n'"o psql saiu com código $rc"; fi
    inesperado="$(sed '/^$/d' <<<"$inesperado")"
    if [ -z "$inesperado" ]; then log "banco: baseline aplicado (passada $passada)"; return 0; fi
    if [ "$passada" -ge 3 ] || ! grep -qiE "$DISPUTA" <<<"$inesperado"; then
      log "banco: erros que não são os esperados:"
      head -n 20 <<<"$inesperado" | while IFS= read -r l; do log "  $l"; done
      return 1
    fi
    log "banco: disputa ou conexão na passada $passada — aplicando de novo (é seguro)"
    sleep $((10 * passada))
    passada=$((passada + 1))
  done
}

regras_existentes() {
  docker exec "$DB" psql -U postgres -d postgres -tA -F'|' -c \
    "select p.polname, c.relname from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'" \
    | LC_ALL=C sort -u
}

conferir_regras() {  # conferir_regras <baseline> — porta da conferência do update.sh oficial
  local esperadas tabelas faltando recria
  esperadas="$(gawk '
    match($0, /drop policy if exists "?[a-zA-Z0-9_]+"? on public\.[a-zA-Z0-9_]+/) { l = substr($0, RSTART, RLENGTH); a = "drop" }
    match($0, /create policy "?[a-zA-Z0-9_]+"? on public\.[a-zA-Z0-9_]+/) { l = substr($0, RSTART, RLENGTH); a = "create" }
    a != "" { gsub(/.*policy (if exists )?"?/, "", l); gsub(/"? on public\./, "|", l); e[l] = a; a = "" }
    END { for (k in e) if (e[k] == "create") print k }' "$1" | LC_ALL=C sort -u)"
  tabelas="$(docker exec "$DB" psql -U postgres -d postgres -tAc \
    "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'" | LC_ALL=C sort -u)"
  esperadas="$(gawk 'NR == FNR { t[$0] = 1; next } { split($0, p, "|"); if (t[p[2]]) print }' \
    <(printf '%s\n' "$tabelas") <(printf '%s\n' "$esperadas") | LC_ALL=C sort -u)"
  faltando="$(LC_ALL=C comm -23 <(printf '%s\n' "$esperadas") <(regras_existentes))"
  if [ -n "$faltando" ]; then
    log "banco: faltaram $(grep -c . <<<"$faltando") regras de isolamento — recriando só essas"
    recria="$(gawk '
      NR == FNR { sub(/[ \t\r]+$/, "", $0); if ($0 != "") q[$0] = 1; next }
      /create policy|drop policy if exists/ { b = ""; c = 1 }
      c { b = b $0 "\n" }
      c && /;[ \t]*$/ {
        c = 0
        if (match(b, /drop policy if exists "?[a-zA-Z0-9_]+"? on public\.[a-zA-Z0-9_]+/)) { k = substr(b, RSTART, RLENGTH); a = "drop" }
        else if (match(b, /create policy "?[a-zA-Z0-9_]+"? on public\.[a-zA-Z0-9_]+/)) { k = substr(b, RSTART, RLENGTH); a = "create" }
        else next
        gsub(/.*policy (if exists )?"?/, "", k); gsub(/"? on public\./, "|", k)
        e[k] = a; if (a == "create") t[k] = b
      }
      END { for (k in q) if (e[k] == "create") printf "%s", t[k] }' <(printf '%s\n' "$faltando") "$1")"
    if [ -n "$recria" ]; then
      docker exec -i "$DB" psql -U postgres -d postgres <<<"$recria" >> "${LOG_RUN:-/dev/null}.banco-regras" 2>&1 || true
    fi
    faltando="$(LC_ALL=C comm -23 <(printf '%s\n' "$esperadas") <(regras_existentes))"
  fi
  if [ -n "$faltando" ]; then
    log "banco: ⛔ regras de isolamento ausentes:"
    head -n 20 <<<"$faltando" | while IFS= read -r l; do log "  $l"; done
    return 1
  fi
  log "banco: regras de isolamento conferidas ($(grep -c . <<<"$esperadas") declaradas, todas no lugar)"
}

# --------------------------------------------------------------- imagens ---

puxar_imagens() {  # baixa as 3 imagens ANTES de parar qualquer coisa
  local par ver="${1#v}"
  for par in $IMAGENS; do
    log "código: baixando ${par#*=}:$ver"
    docker pull -q "${par#*=}:$ver" >/dev/null || return 1
  done
}

trocar_para() {  # a instalada vira :anterior, a nova vira :atual
  local par nome ver="${1#v}"
  for par in $IMAGENS; do
    nome="mabe-chat/${par%%=*}"
    if docker image inspect "$nome:atual" >/dev/null 2>&1; then docker tag "$nome:atual" "$nome:anterior"; fi
    docker tag "${par#*=}:$ver" "$nome:atual" || return 1
  done
}

voltar_anterior() {
  local par nome
  for par in $IMAGENS; do
    nome="mabe-chat/${par%%=*}"
    if docker image inspect "$nome:anterior" >/dev/null 2>&1; then docker tag "$nome:anterior" "$nome:atual"; fi
  done
}

subir() {  # só app/worker/scheduler: WAHA (sessões do WhatsApp), redis e srh nem piscam
  dc up -d --force-recreate --no-deps app worker scheduler >/dev/null 2>&1
}

saudavel() {  # até ~3 min: /api/v1/health = healthy ou degraded
  local i st
  if [ "${ATUALIZADOR_TESTE_FALHAR_SAUDE:-0}" = "1" ]; then
    ATUALIZADOR_TESTE_FALHAR_SAUDE=0
    log "saúde: (teste) falha simulada"; return 1
  fi
  for i in $(seq 1 36); do
    st="$(curl -fsS --max-time 5 "$APP_URL/api/v1/health" 2>/dev/null | jq -r '.data.status // empty' 2>/dev/null)"
    if [ "$st" = "healthy" ] || [ "$st" = "degraded" ]; then log "saúde: $st"; return 0; fi
    sleep 5
  done
  log "saúde: o app não respondeu healthy/degraded em 3 minutos"
  return 1
}

# ------------------------------------------------------------ atualização ---

atualizar() {  # atualizar <vX.Y.Z> [run_id]
  local alvo="$1" de base
  RUN_ID="${2:-}"
  de="$(versao_instalada)"
  exec 9>"$BACKUPS/.atualizando.lock"
  if ! flock -n 9; then log "já existe uma atualização em andamento"; return 1; fi
  LOG_RUN="$BACKUPS/atualizacao-$(date +%Y%m%d-%H%M%S)-$alvo.log"
  log "=== atualização $de -> $alvo (pedido ${RUN_ID:-manual}) ==="
  base="/tmp/baseline-$alvo.sql"

  report backup
  if ! backup "antes-de-$alvo" >/dev/null; then
    log "sem backup legível não há atualização — nada foi alterado"; resultado failed; return 1
  fi

  report codigo
  if ! puxar_imagens "$alvo"; then
    log "código: não consegui baixar as imagens de $alvo — nada foi alterado"; resultado failed; return 1
  fi
  if ! curl -fsS --max-time 180 "https://raw.githubusercontent.com/$REPO/$alvo/supabase/baseline.sql" -o "$base" \
     || [ "$(wc -c < "$base")" -lt 100000 ]; then
    log "banco: não consegui baixar o baseline.sql de $alvo — nada foi alterado"; resultado failed; return 1
  fi

  report banco
  # Se este processo morrer daqui em diante, não deixa o CRM parado.
  trap 'religar_supabase; subir' EXIT
  pausar
  if ! aplicar_baseline "$base" || ! conferir_regras "$base"; then
    religar_supabase; subir; trap - EXIT
    log "o banco não terminou limpo — o sistema segue na versão $de; o backup de antes está guardado"
    resultado failed_rolled_back
    return 1
  fi
  religar_supabase

  if trocar_para "$alvo" && subir && saudavel; then
    trap - EXIT
    log "=== atualizado: $de -> $(versao_instalada) ==="
    resultado success
    return 0
  fi
  log "a versão $alvo não subiu saudável — voltando para $de"
  voltar_anterior
  subir
  trap - EXIT
  if saudavel; then resultado failed_rolled_back; else resultado failed; fi
  return 1
}

loop() {
  if [ -z "$SECRET" ]; then log "INTERNAL_SECRET ausente — sem como falar com o app"; sleep 3600; exit 1; fi
  log "agente de atualização no ar: a cada ${INTERVALO}s; backup diário às ${HORA_BACKUP}h (retém $RETER)"
  local run alvo
  while :; do
    run="$(heartbeat)" || run=""
    if [ -n "$run" ]; then
      alvo="$(ultima_release)" || alvo=""
      if [ -n "$alvo" ] && [ "$alvo" != "$(versao_instalada)" ]; then
        atualizar "$alvo" "$run"
      else
        RUN_ID="$run"; log "pedido de atualização sem versão nova disponível"; resultado failed
      fi
      LOG_RUN=""; RUN_ID=""
      # guarda os logs das 20 últimas atualizações (cada uma gera ~5 arquivos)
      ls -1 "$BACKUPS"/atualizacao-* 2>/dev/null | sort | head -n -100 | xargs -r rm -f
    fi
    backup_diario
    sleep "$INTERVALO"
  done
}

case "${1:-loop}" in
  loop) loop ;;
  heartbeat) heartbeat ;;
  backup) backup "${2:-manual}" ;;
  atualizar)
    if [ -z "${2:-}" ]; then echo "uso: atualizar vX.Y.Z" >&2; exit 2; fi
    atualizar "$2" "${3:-}" ;;
  *) echo "uso: $0 [loop|heartbeat|backup [motivo]|atualizar vX.Y.Z]" >&2; exit 2 ;;
esac
