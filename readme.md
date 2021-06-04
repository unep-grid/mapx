# [MapX](https://app.mapx.org/)

[MapX](https://app.mapx.org/) is a an online platform for managing geospatial data on natural resources, developed by [UNEP/GRID-Geneva](https://unepgrid.ch/en) and [UN Environment](https://www.unep.org/).

Field applications of MapX are varied and include chemical management, disaster risk reduction, biodiversity planning, land-use planning, extractive industry, renewable energy and environmental security. 

MapX targets a wide community of users that are primarily UN Environment and partners, the Secretariats of Multilateral Environmental Agreements (MEAs) and other UN agencies mandated to collect and use geospatial data in environmental decision-making. Civil society groups, non-governmental organizations, academia and citizens complement this set of users. 

MapX was designed in 2014 and since then continuously improved with wide international stakeholder consultations. 

MapX is fully integrated into the World Environment Situation Room, which is the UNEP data and knowledge platform.

![mapx preview](app/src/png/mapx-preview.png "MapX")


## Development 

Development servers are launched from within Docker containers, to match as closely as possible the environment found in production. Some commands, tools and config are still currently needed on your local computer.

### Requirement

- `docker` v20.10+, with docker-compose
- `node` v14.15+
- `g++`

### Hosts

Some browsers require to modify your hosts file to link custom MapX local "subdomains". It could be as simple as adding those lines to `/etc/hosts/` and restarting your browser, if needed: 

```sh
127.0.0.1 app.mapx.localhost 
127.0.0.1 api.mapx.localhost
127.0.0.1 search.mapx.localhost
127.0.0.1 wsecho.mapx.localhost
127.0.0.1 probe.mapx.localhost
127.0.0.1 apidev.mapx.localhost
127.0.0.1 dev.mapx.localhost
127.0.0.1 geoserver.mapx.localhost
```

### Docker

The included `docker-compose.yml` allows to setup a development environment.

Trigger the following script which init some required directories and copy the default environment variable to `./mapx.dev.env` (if missing):

```sh
./docker-compose.init.sh
```

Finally, launch the mapx stack:

```sh
# Pull the latest builds
docker-compose pull
# Launch postgres first : in case of first launch, some tables and roles must be created
docker-compose up pg
# Launch other services
docker-compose up
```

The application should be available at <http://app.mapx.localhost:8880/> (curl -H Host:app.mapx.localhost <http://127.0.0.1:8880/).>

An admin user is available as `admin@localhost` which can be used to login; get the password by browsing the web mail at <http://mail.mapx.localhost:8880/.>

#### Known issues

Postgis: `OperationalError: could not access file "$libdir/postgis-X.X` _Solution:_ run `docker-compose exec pg update-postgis.sh`




### Development session for the `app` service

Install all modules listed as dependencies in `package.json` for the `app` service, the `sdk` and the websocket handler `ws_handler` :

```sh
cd ./app
npm install
cd ./app/src/js/sdk/
npm install
cd ./app/src/js/ws_handler/
npm install
```

Optionally, if you want to develop submodules as `el`, `mx_valid` or rebuilding `glyphs`: 

```sh 
cd ./app/src/js/el/
npm install
cd ./app/src/js/is_test/
npm install
cd ./app/glyphs/
npm install 
```

Start a development session for the `app` service:

- Automatically build all client side dependencies, included dictionaries and translation ( which needs some config, see below )

```sh
$ cd ./app
$ npm run dev
```

- Launch the server from within the running `app` container. In another terminal window, launch the dev server :

```sh
docker-compose exec app /bin/bash
$ cd /appdev
$ R
> source('run.R') 
# OR, as a single line :
docker-compose exec app R -e 'setwd("/appdev");source("run.R")'
```

Then, an instance of mapx should be available at <http://dev.mapx.localhost:8880/> for which the source code from `./app/` is mounted as `/appdev/` in the container.

__Note for auto-translation__:
Automatic translation requires a valid Google cloud config file, which path should be refered in the host – not inside the docker container – as an environment variable named `GOOGLE_APPLICATION_CREDENTIALS`, accessible from your local node. You can test this with :

```sh
$ node -e 'console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)'
# Should return, as an example :
# > /home/<your name>/.google_cloud_<your service>.json
```



### Development session for the `api` service

Setup the environmental variables for the `api` service in `mapx.dev.env` as follows:

```sh
API_HOST=api
API_PORT=3030
API_PORT_DEV=3333
API_PORT_PUBLIC=8880
API_HOST_PUBLIC=api.mapx.localhost
API_HOST_PUBLIC_DEV=apidev.mapx.localhost
```

Start the `Express.js` development server:

```sh
$ docker-compose up -d
$ docker-compose exec api node inspect /apidev/index.js port=3333
debug> c
```

The instance now should use the api service at <http://apidev.mapx.localhost:8880/> for which the source from `./api/` is mounted as `/apidev/` in the container.

If you want to use the prod version of the `api` service, setup the environmental variables in `mapx.dev.env`as follows:

```sh
API_HOST=api
API_PORT=3030
API_PORT_DEV=3030
API_PORT_PUBLIC=8880
API_HOST_PUBLIC=api.mapx.localhost
API_HOST_PUBLIC_DEV=api.mapx.localhost
```

#### `api` tests

Run tests within the development container:

```sh
docker-compose exec api sh
cd /apidev
npm run
```

### 


# Countries boundaries layer

A sample dataset of countries boundaries (  polygons ) is included in this code repo, and will add a table named `mx_countries` in the database. The main purpose of this layer is croping dataset during exportation. 

## Citation

Administrative boundaries generalized by UNEP/GRID-Geneva (2019) based on the Global Administrative Unit Layers (GAUL) dataset (G2015_2014), implemented by FAO within the CountrySTAT and Agricultural Market Information System (AMIS) projects (2015).

## Generalization >= mapx 1.8.26 

Starting with version 1.8.26, a lightweight version of `mx_countries` is included.

It was generated with [mapshaper](https://mapshaper.org/) using the following parameters:

- import:
  - detect line intersections = true
  - snap vertices = true
- simplification:
  - prevent shape removal = true
  - method: Visvalingam / weighted area
  - percentage of removable points to retain: 3%

Once the simplification was done, the data was repaired in `mapshaper` and then in `QGIS 3.18` using the `Fix geometries` tool. All geometries are valid according to GEOS rules.


## Generalization < mapx 1.8.26 

The generalization was made using Feature Manipulation Engine (FME) with the following settings:

- Algorithm: Douglas (generalize)
- Generalization Tolerance: 0.02
- Preserve Shared Boundaries: Yes
- Shared Boundaries Tolerance: None
- Preserve Path Segment: No

Geometries obtained from FME have been repaired in PostGIS using ST_MakeValid() function.


## Restrictions

You are free to modify and/or adapt any Data provided for your own use, reproduction as well as unlimited use within your organization. The Data is licensed and distributed by UNEP/GRID-Geneva. Redistribution to a Third party or reseller is formerly prohibited at any stage whatsoever by UNEP/GRID-Geneva.

## Disclaimer

Due to the generalization process, the administrative boundaries of the countries have been modified. Therefore, this dataset can only be used for unofficial cartographic purposes for global mapping using a scale not higher than 1:25 million. It should not be used in any way as a reference for national boundaries. Territorial information from this dataset do not imply the expression of any opinion whatsoever on the part of the UNEP/GRID-Geneva concerning the legal status of any country, territory, city or area, or of its authorities, or concerning the delimitation of its frontiers or boundaries. The Data is being delivered to you “AS IS” and UNEP/GRID-Geneva makes no warranty as to its use or performance.

UNEP/GRID-Geneva cannot be held responsible for a misuse of this file and its consequences.

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
    - `POSTGRES_USER_CUSTOM_PASSWORD`

3. Connect to PostgreSQL using psql:

    ```sh
    docker-compose exec pg psql -U {POSTGRES_USER}
    ```

4. Queries to run in psql to update the passwords. Be careful to respect the order in which the queries are run.

    ```sql
    ALTER ROLE {POSTGRES_USER_READ} WITH PASSWORD '{POSTGRES_USER_READ_PASSWORD}';
    ALTER ROLE {POSTGRES_USER_WRITE} WITH PASSWORD '{POSTGRES_USER_WRITE_PASSWORD}';
    ALTER ROLE {POSTGRES_USER_CUSTOM} WITH PASSWORD '{POSTGRES_USER_CUSTOM_PASSWORD}';
    ALTER ROLE {POSTGRES_USER} WITH PASSWORD '{POSTGRES_PASSWORD}';
    \q
    ```

5. Force Compose to stop and recreate all containers to avoid any problems related to passwords update:

    ```sh
    docker-compose up -d --force-recreate
    ```
