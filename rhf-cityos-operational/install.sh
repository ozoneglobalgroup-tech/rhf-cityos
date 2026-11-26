#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEST="${RHF_CITYOS_HOME:-$HOME/rhf-cityos-operational}"
CMD="${1:-install}"
compose(){ (cd "$DEST" && docker compose --env-file .env "$@"); }
require_docker(){ command -v docker >/dev/null || { echo 'ERROR=DOCKER_MISSING';exit 1; };docker compose version >/dev/null || { echo 'ERROR=DOCKER_COMPOSE_MISSING';exit 1; };docker info >/dev/null || { echo 'ERROR=DOCKER_DAEMON_UNAVAILABLE';exit 1; }; }
case "$CMD" in
 install|start)
   if [[ "$HERE" != "$DEST" && -f "$DEST/.env" ]];then echo 'ERROR=EXISTING_INSTALL_USE_UPGRADE_SH';exit 2;fi
   require_docker
   command -v python3 >/dev/null || { echo 'ERROR=PYTHON3_MISSING';exit 1; }
   command -v curl >/dev/null || { echo 'ERROR=CURL_MISSING';exit 1; }
   if [[ "$HERE" != "$DEST" ]]; then
     [[ ! -e "$DEST" || -d "$DEST" ]] || { echo "ERROR=DEST_IS_NOT_DIRECTORY";exit 1; }
     mkdir -p "$DEST"
     python3 - "$HERE" "$DEST" <<'PY'
from pathlib import Path
import shutil,sys
src,dest=map(Path,sys.argv[1:])
for name in ['Dockerfile','compose.yaml','api','web','db','tests','tools','docs','README_FA.md']:
 p=src/name
 if not p.exists():continue
 target=dest/name
 if p.is_dir():shutil.copytree(p,target,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','dist','.env','credentials.txt'))
 else:shutil.copy2(p,target)
PY
   fi
   if [[ ! -f "$DEST/.env" ]];then
     python3 - "$DEST" <<'PY'
from pathlib import Path
import secrets,sys
p=Path(sys.argv[1]);admin=secrets.token_urlsafe(26)
content=(f'DB_OWNER_PASSWORD={secrets.token_hex(32)}\nAPP_DB_PASSWORD={secrets.token_hex(32)}\nADMIN_USERNAME=admin\nADMIN_PASSWORD={admin}\nINITIAL_CITY=شهرداری شیراز\nCITYOS_PORT=5189\n')
(p/'.env').write_text(content)
(p/'credentials.txt').write_text(f'URL: http://localhost:5189\nUsername: admin\nPassword: {admin}\n')
(p/'.env').chmod(0o600);(p/'credentials.txt').chmod(0o600)
PY
   fi
   if [[ "$CMD" == install ]];then
     if [[ -f "$DEST/.env" ]] && [[ -z "${RHF_CITYOS_ALLOW_EXISTING:-}" ]] && [[ -d "$DEST/api" ]];then :;fi
   fi
   echo '=== RHF CITY OS: BUILD & START ==='
   compose up -d --build
   echo '=== HEALTH CHECK ==='
   PORT="$(sed -n 's/^CITYOS_PORT=//p' "$DEST/.env" | head -n 1)"; PORT="${PORT:-5189}"
   ok=0
   for i in $(seq 1 45);do
     if curl --silent --fail --max-time 2 "http://127.0.0.1:${PORT}/healthz" >/dev/null;then ok=1;break;fi
     sleep 2
   done
   if [[ "$ok" != 1 ]];then echo 'ERROR=SERVICE_NOT_HEALTHY';compose ps;compose logs --tail=35 app;exit 1;fi
   echo "RHF_CITYOS_READY=http://localhost:$PORT"
   echo "CREDENTIALS_FILE=$DEST/credentials.txt"
   echo 'RUVOS_ORIGINAL_SOURCE_CHANGED=NO'
   echo 'RUVOS_ORIGINAL_DATABASE_CHANGED=NO'
   ;;
 status)
   require_docker;[[ -f "$DEST/.env" ]] || { echo 'NOT_INSTALLED';exit 1; };compose ps;;
 stop)
   require_docker;compose stop;;
 logs)
   require_docker;compose logs --tail=100 app;;
 backup)
   require_docker;[[ -f "$DEST/.env" ]] || { echo 'NOT_INSTALLED';exit 1; }
   mkdir -p "$HOME/rhf-cityos-backups"
   FILE="$HOME/rhf-cityos-backups/cityos-$(date -u +%Y%m%dT%H%M%SZ).sql"
   compose exec -T db sh -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --no-owner --no-acl' > "$FILE"
   chmod 600 "$FILE";echo "BACKUP_CREATED=$FILE";;
 cleanup-list)
   bash "$DEST/tools/archive-legacy.sh" --list;;
 cleanup-archive)
   bash "$DEST/tools/archive-legacy.sh" --archive;;
 test)
   node --test "$HERE"/tests/*.test.mjs
   node --check "$HERE/api/server.mjs"
   node --check "$HERE/api/domain.mjs";;
 *) echo 'USAGE: bash install.sh [install|start|status|stop|logs|backup|cleanup-list|cleanup-archive|test]';exit 2;;
esac
