# PostgreSQL passwords update

Procedure to follow if PostgreSQL passwords need to be updated for security reason (or any other reasons).

1. Launch MapX stack with Docker Compose:

    ```sh
    docker-compose up
    ```

2. Once your stack is up, update PostgreSQL passwords in the environment file:

    - `POSTGRES_PASSWORD`
    - `POSTGRES_USER_WRITE_PASSWORD`
    - `POSTGRES_USER_READ_PASSWORD`

3. Connect to PostgreSQL using psql:

    ```sh
    docker-compose exec pg psql -U {POSTGRES_USER}
    ```

4. Queries to run in psql to update the passwords. Be careful to respect the order in which the queries are run.

    ```sql
    ALTER ROLE {POSTGRES_USER_READ} WITH PASSWORD '{POSTGRES_USER_READ_PASSWORD}';
    ALTER ROLE {POSTGRES_USER_WRITE} WITH PASSWORD '{POSTGRES_USER_WRITE_PASSWORD}';
    ALTER ROLE {POSTGRES_USER} WITH PASSWORD '{POSTGRES_PASSWORD}';
    \q
    ```

5. Force Compose to stop and recreate all containers to avoid any problems related to passwords update:

    ```sh
    docker-compose up -d --force-recreate
    ```
