#!/usr/bin/env bash
set -Eeuo pipefail
# Only identifies legacy standalone entry pages. No permanent deletion, no source-directory moves.
ROOT="${RUVOS_ROOT:-$HOME/ruvos}"
WEB="$ROOT/apps/web"
ACTION="${1:---list}"
case "$ACTION" in --list|--archive) ;; *) echo 'USAGE: --list or --archive';exit 2;; esac
[[ -d "$WEB" ]] || { echo "RUVOS_NOT_FOUND=$WEB";exit 0; }
mapfile -d '' PAGES < <(find "$WEB" -maxdepth 1 -type f -regextype posix-extended -regex '.*/cityos-v[0-9]+\.html' -print0)
[[ ${#PAGES[@]} -gt 0 ]] || { echo 'LEGACY_ENTRY_PAGES=NONE';exit 0; }
ARCHIVE="$HOME/rhf-cityos-legacy-archive/$(date -u +%Y%m%dT%H%M%SZ)"
for p in "${PAGES[@]}"; do
  name="$(basename "$p")"
  # Conservative: if referenced by web source/config, do not move it.
  if find "$WEB" -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.html' \) ! -path "$p" -not -path '*/node_modules/*' -print0 | xargs -0 -r grep -Flq -- "$name"; then
    echo "KEEP_REFERENCED=$p";continue
  fi
  if [[ "$ACTION" == --list ]]; then echo "CANDIDATE=$p";continue;fi
  mkdir -p "$ARCHIVE";mv -- "$p" "$ARCHIVE/";echo "ARCHIVED=$p"
done
[[ "$ACTION" == --list ]] && echo 'READ_ONLY=YES' || echo "ARCHIVE_DIR=$ARCHIVE"
