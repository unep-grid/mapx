# [MapX](https://www.mapx.org/)

[MapX](https://www.mapx.org/) is a spatial data infrastructure that aims to support the sustainable use of natural resources and the environment by increasing access to the best available geospatial information and related monitoring technologies. MapX is supported by an online platform that provides authoritative spatial data at local, national and global scales, an authentication data integrity framework using a scorecard and a set of on-line tools to visualize, analyse and access geospatial data. Originally created for stakeholders involved in the extractives sector, MapX has expanded in 2017 to other fields where spatial data can help inform stakeholder dialogue, prioritization of investments and impact monitoring such as disaster risk reduction, chemicals management, biodiversity planning, renewable energy and environmental security.

![mapx preview](app/src/png/mapx-preview.png "MapX")

## Development environment

The included `docker-compose.yml` allows to setup a development environment.

Trigger the following script which init some required directories and copy the default environment variable to `./mapx.dev.env` (if missing):

```sh
./docker-compose.init.sh
```

Finally, launch the mapx stack:

```sh
docker-compose pull
docker-compose up
```

The application should be available at <http://app.mapx.localhost:8880/> (curl -H Host:app.mapx.localhost <http://127.0.0.1:8880/).>

An admin user is available as `admin@localhost` which can be used to login; get the password by browsing the web mail at <http://mail.mapx.localhost:8880/.>

### Known issues

Postgis: `OperationalError: could not access file "$libdir/postgis-X.X` _Solution:_ run `docker-compose exec pg update-postgis.sh`

## Development session for the `app` service

Install all modules listed as dependencies in `package.json` for the `app` service and the `sdk`:

```sh
cd ./app
npm install
cd ./app/src/js/sdk/
npm install
```

Start a development session for the `app` service:

```sh
$ cd ./app
$ npm run dev
$ cd ../
$ docker-compose up -d
$ docker-compose exec app sh
$ cd /srv/shiny-server/dev/
$ R
> source("run.R")
```

Then an instance of mapx should be available at <http://dev.mapx.localhost:8880/> for which the source code from `./app/` is mounted as `/srv/shiny-server/dev/` in the container.

## Development session for the `api` service

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

**Note:** You might need to add the different hosts `*.mapx.localhost` to your system `hosts` file.

### `api` tests

Run tests within the development container:

```sh
docker-compose exec api sh
cd /apidev
npm run
```
