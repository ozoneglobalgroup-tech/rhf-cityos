#!/bin/sh
set -eu

case "${1:-}" in
  server|gateway)
    set -- minio "$@"
    ;;
  -*)
    set -- minio "$@"
    ;;
esac

if [ "$(id -u)" = '0' ]; then
  chown -R minio:minio /data
  exec gosu minio "$@"
fi

exec "$@"
