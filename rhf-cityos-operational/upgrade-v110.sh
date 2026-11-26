#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEST="${RHF_CITYOS_HOME:-$HOME/rhf-cityos-operational}"
CMD="${1:-upgrade}"
compose(){ (cd "$DEST" && docker compose --env-file .env "$@"); }
check(){
  [[ -f "$DEST/.env" && -f "$DEST/compose.yaml" && -f "$DEST/api/server.mjs" ]] || { echo 'ERROR=V10_INSTALLATION_MISSING';exit 1; }
  for program in docker node curl python3 tar;do command -v "$program" >/dev/null || { echo "ERROR=${program}_MISSING";exit 1; };done
  docker compose version >/dev/null
  docker info >/dev/null || { echo 'ERROR=DOCKER_UNAVAILABLE';exit 1; }
  # No .env or passwords printed.
  [[ "$(basename "$(pwd -P)")" != '.env' ]] || exit 1
}
verify_source(){
  node --check "$HERE/api/server.mjs"
  node --check "$HERE/api/domain.mjs"
  node --test "$HERE/tests/domain.test.mjs" "$HERE/tests/service-quality.test.mjs"
  [[ -f "$HERE/db/migrations/20261030_v110_service_quality.sql" ]] || { echo 'ERROR=MIGRATION_MISSING';exit 1; }
  python3 - "$HERE" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=(p/'api/server.mjs').read_text();m=(p/'db/migrations/20261030_v110_service_quality.sql').read_text()
for string in ('part===\'services\'','part===\'inspections\'','part===\'quality\'','withScope','last.result!==\'PASS\''):
 assert string in s,string
for string in ('ENABLE ROW LEVEL SECURITY','FORCE ROW LEVEL SECURITY','service_definitions','service_inspections','cityos_runtime'):
 assert string in m,string
print('V110_SOURCE_STATIC=PASS')
PY
}
case "$CMD" in
 test) verify_source; echo 'V110_SOURCE_TESTS=PASS';;
 status) check; compose ps;;
 upgrade)
  verify_source
  check
  [[ "$HERE" != "$DEST" ]] || { echo 'ERROR=USE_EXTRACTED_UPGRADE_SOURCE'; exit 1; }
  # Prevent concurrent upgrade attempts without touching the running system.
  LOCK="$HOME/.rhf-cityos-v11-upgrade.lock"
  mkdir "$LOCK" 2>/dev/null || { echo 'ERROR=UPGRADE_ALREADY_RUNNING_OR_STALE_LOCK';exit 1; }
  trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  BACKUP="$HOME/rhf-cityos-backups/v110-$stamp"
  mkdir -p "$BACKUP"
  chmod 700 "$BACKUP"
  echo '=== 1. BACKUP EXISTING DATABASE (BEFORE CHANGES) ==='
  compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' > "$BACKUP/database-before.sql"
  [[ -s "$BACKUP/database-before.sql" ]] || { echo 'ERROR=EMPTY_DATABASE_BACKUP';exit 1; }
  chmod 600 "$BACKUP/database-before.sql"
  echo '=== 2. BACKUP EXISTING SOURCE ==='
  tar -C "$DEST" -czf "$BACKUP/source-before.tar.gz" api web db Dockerfile compose.yaml install.sh
  [[ -s "$BACKUP/source-before.tar.gz" ]] || { echo 'ERROR=EMPTY_SOURCE_BACKUP';exit 1; }
  echo "BACKUP_CREATED=$BACKUP"
  previous=0
  rollback(){
     code=$?
     trap - ERR
     if [[ "$previous" == 1 && "$code" -ne 0 ]];then
       echo 'UPGRADE_FAILED=YES; RESTORING_PRIOR_SOURCE'
       tar -xzf "$BACKUP/source-before.tar.gz" -C "$DEST" || true
       compose up -d --build app || true
       echo 'SOURCE_ROLLBACK_ATTEMPTED=YES'
       echo 'DATABASE_MIGRATION_IS_ADDITIVE=YES'
     fi
  }
  trap rollback ERR
  previous=1
  echo '=== 3. COPY ONLY REQUIRED NEW SOURCE FILES ==='
  cp -p "$HERE/api/server.mjs" "$HERE/api/domain.mjs" "$DEST/api/"
  cp -p "$HERE/web/src/main.jsx" "$HERE/web/src/style.css" "$DEST/web/src/"
  mkdir -p "$DEST/db/migrations" "$DEST/tests"
  cp -p "$HERE/db/migrations/20261030_v110_service_quality.sql" "$DEST/db/migrations/"
  cp -p "$HERE/tests/service-quality.test.mjs" "$DEST/tests/"
  cp -p "$HERE/upgrade.sh" "$DEST/upgrade-v110.sh"
  echo '=== 4. APPLY ADDITIVE SQL IN ONE TRANSACTION ==='
  compose exec -T db sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction --file=-' < "$DEST/db/migrations/20261030_v110_service_quality.sql"
  echo '=== 5. BUILD AND RESTART ONLY CITYOS APP ==='
  compose up -d --build app
  echo '=== 6. HEALTH CHECK ==='
  PORT="$(sed -n 's/^CITYOS_PORT=//p' "$DEST/.env" | head -n 1)"; PORT="${PORT:-5189}"
  ok=0
  for i in $(seq 1 40);do
    if curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/healthz" 2>/dev/null | grep -Fq '"version":"1.1.0"';then ok=1;break;fi
    sleep 2
  done
  if [[ "$ok" != 1 ]];then echo 'ERROR=V110_HEALTH_NOT_READY'; exit 1;fi
  compose exec -T db sh -c 'exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -c "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('\''service_definitions'\'','\''service_inspections'\'') ORDER BY relname;"' 
  echo "RHF_CITYOS_V110_READY=http://localhost:$PORT"
  echo 'RUVOS_ORIGINAL_CHANGED=NO'
  echo 'PREVIOUS_CITYOS_DATA_PRESERVED=YES'
  echo "ROLLBACK_SOURCE_ARCHIVE=$BACKUP/source-before.tar.gz"
  ;;
 *) echo 'USAGE: bash upgrade.sh [test|upgrade|status]';exit 2;;
esac
