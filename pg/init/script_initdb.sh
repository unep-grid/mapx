#!/bin/bash

# Immediately exits if any error occurs during the script execution.
# If not set, an error could occur and the script would continue its execution.
set -e

# Creating an array that defines the environment variables that must be set.
# This can be consumed later via array variable expansion ${REQUIRED_ENV_VARS[@]}.
readonly REQUIRED_ENV_VARS=(
  "POSTGRES_USER"
  "POSTGRES_DB"
  "POSTGRES_PASSWORD"
  "POSTGRES_USER_WRITE_PASSWORD"
  "POSTGRES_USER_READ_PASSWORD"
  "POSTGRES_USER_CUSTOM_PASSWORD"
  "MAIL_ADMIN"
  "MAIL_GUEST")

# Main execution:
# - verifies if all environment variables are set
# - runs the SQL files to initialize MapX database
main() {
  check_env_vars_set
  init_db_mapx
}

# Checks if all of the required environment variables are set.
# If one of them isn't, echoes a text explaining which one isn't
# and the name of the ones that need to be.
check_env_vars_set() {
  for required_env_var in ${REQUIRED_ENV_VARS[@]}; do
    if [[ -z "${!required_env_var}" ]]; then
      echo "Error:
    Environment variable '$required_env_var' not set.
    Make sure you have the following environment variables set:
      ${REQUIRED_ENV_VARS[@]}
Aborting."
      exit 1
    fi
  done
}

# Initializes MapX database in the already-started PostgreSQL.
init_db_mapx() {
  echo "Add base data"
  cat /docker-entrypoint-initdb.d/sql_files/*.sql | psql \
    -v ON_ERROR_STOP=1 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f - 
   echo "Duplicate db as template for tests"
   createdb -T "$POSTGRES_DB" "$POSTGRES_DB_TEST"
}

# Executes the main routine.
main
