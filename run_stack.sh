#!/usr/bin/env bash

# this script manages compose configurations for different environments
# and ensures the necessary environment variables are set up correctly.

# invoke it like so:
#
# ./run_stack.sh [dev|prod] [docker-compose command options]
#
# - the first argument is the environment (default: dev) if the first arg isn't
#   provided or doesn't match 'dev' or 'prod', it defaults to 'dev'.
# - the remainder of the arguments are passed to the `docker compose` command.
#   if no arguments are provided, it defaults to an environment-specific
#   command, e.g. `docker compose up --build` for dev or `docker compose up
#   --build -d` for prod.

# ------------------------------------
# --- preamble: .env file validation, sourcing
# ------------------------------------

# check if `.env` is present, and if not copy it from `.env.TEMPLATE`
# and fill in passwords with random values
if [ ! -f .env ]; then
  echo ".env file not found, copying from .env.TEMPLATE"
  cp .env.TEMPLATE .env
fi

# ensure a value for the postgres db's password exists, and if not, generate a random one
RANDOM_PG_PASSWORD=$(openssl rand -base64 32 | tr -d '/=')
perl -i -pe"s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=\"${RANDOM_PG_PASSWORD}\"/g" .env

# source the .env file and export its contents to the environment
set -a
source .env
set +a

# ------------------------------------
# --- environment resolution
# ------------------------------------

# sets the default environment to 'dev' if not specified via DEFAULT_ENV
DEFAULT_ENV=${DEFAULT_ENV:-dev}
# defaults to a no-op command to run after docker compose
POST_COMMAND=":"

if [ -z "$1" ] || [[ ! "$1" =~ ^(dev|prod)$ ]]; then
  echo "No environment specified, using default: $DEFAULT_ENV"
  export ENV=$DEFAULT_ENV
else
  # use the first argument as the environment
  export ENV="$1"; shift
  echo "Using specified environment: $ENV"
fi

# set up compose files and commands based on the environment
case $ENV in
  dev)
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.override.yml"
    COMPOSE_CMD="up --build"
    ;;
  prod)
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.with-pg.yml -f docker-compose.prod.yml"
    COMPOSE_CMD="up --build -d"
    # tail all container logs in production
    POST_COMMAND="docker compose ${COMPOSE_FILES} logs -f"
    ;;
  *)
    echo "Unknown environment: $ENV, aborting"
    exit 1
    ;;
esac


# ------------------------------------
# --- execute docker compose command
# ------------------------------------

# if we have any remaining arguments, override the compose command with them
if [ $# -gt 0 ]; then
  echo "Overriding compose command with: $@"
  COMPOSE_CMD="$@"
fi

docker compose ${COMPOSE_FILES} ${COMPOSE_CMD} && \
${POST_COMMAND}
