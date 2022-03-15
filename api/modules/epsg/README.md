


Data provider : https://epsg.org/


How to reproduce ? Many solutions, but here is one using psql interactive session.

- Requirement
 - `docker-compose` ( or podman-compose )
 - `psql`

- Download `PostgreSQL` files from `https://epsg.org/download-dataset.html`
- Extract sql files to a directory of your choice, e.g. `/tmp/epsg_db`
  -`PostgreSQL_Table_Script.sql`
  -`PostgreSQL_Data_Script.sql`
  -`PostgreSQL_FKey_Script.sql`
- From this README directory, launch docker postgres : `docker-compose up -d`
- Start a `psql` session : `psql -h localhost -U postgres -p 54321` (port is defined in compse file)
- For each table, import table, data, keys : `\i /tmp/epsg_db/<NameOfTheFile>.sql`
- Set output mode to file :  `\o epsg_data.json`
- Enable tupple only: `\t` (should read 'Tuples only is on.')
- Execute query : `\i epsg_request.sql`
- `\q` to quit
- A file named `epsg_data.json` should be available
- `docker-compose down`




