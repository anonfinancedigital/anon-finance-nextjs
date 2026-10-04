#!/usr/bin/env sh
# Starts the local Postgres (port 5433) with databases "orcamento" and "orcamento_test".
# Idempotent: reuses the container if it already exists.
set -e

NAME=orcamento-pg

if docker container inspect "$NAME" >/dev/null 2>&1; then
  docker start "$NAME" >/dev/null
else
  docker run -d --name "$NAME" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=orcamento \
    -p 5433:5432 \
    postgres:17 >/dev/null
fi

until docker exec "$NAME" pg_isready -U postgres -h localhost >/dev/null 2>&1; do
  sleep 1
done

if [ -z "$(docker exec "$NAME" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'orcamento_test'")" ]; then
  docker exec "$NAME" createdb -U postgres orcamento_test
fi

echo "Postgres ready on localhost:5433 (orcamento, orcamento_test)"
