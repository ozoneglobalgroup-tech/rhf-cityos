#!/bin/sh
set -eu
# Runs only on FIRST creation of the dedicated Postgres data volume.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v pass="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE cityos_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD %L', :'pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cityos_runtime') \gexec
SQL
