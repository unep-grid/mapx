#!/bin/sh

# 1. Workaround for MapX local settings 
# 2. Shiny Server config.
#
# NOTE: Shiny-server does remove all environmental variable. We need them. 
# Workaround : we overwrite settings-local.R before lauching shiny-server.
#

MAPX_PATH_APP="/srv/shiny-server/mapx"
MAPX_PATH_LOG="/shared/logs/mapx"
MAPX_CONFIG=$MAPX_PATH_APP"/settings/settings-local.R"

mkdir -p $MAPX_PATH_LOG
chown shiny:shiny $MAPX_PATH_LOG

CONF_MAPX="\
  config[['mail']][['admin']] <- '$MAIL_ADMIN' \n\
  config[['mail']][['bot']] <- '$MAIL_BOT' \n\
  config[['mail']][['guest']] <- '$MAIL_GUEST' \n\
  config[['mode']] <- jsonlite::fromJSON('$MAPX_MODE') \n\
  config[['api']][['port']] <- '$API_PORT' \n\
  config[['api']][['host']] <- '$API_HOST' \n\
  config[['api']][['port_public']] <- '$API_PORT_PUBLIC' \n\
  config[['api']][['host_public']] <- '$API_HOST_PUBLIC' \n\
  config[['resources']][['userdata']] <- '$MAPX_PATH_USERDATA'\n\
  config[['resources']][['download']] <- '$MAPX_PATH_DOWNLOAD'\n\
  config[['pg']][['encryptKey']] <- '$POSTGRES_KEY_ENCRYPT'\n\
  config[['pg']][['user']] <- '$POSTGRES_USER_WRITE'\n\
  config[['pg']][['password']] <- '$POSTGRES_USER_WRITE_PASSWORD'\n\
  config[['pg']][['read']][['user']] <- '$POSTGRES_USER_READ'\n\
  config[['pg']][['read']][['password']] <- '$POSTGRES_USER_READ_PASSWORD'\n\
  config[['pg']][['host']] <- '$POSTGRES_HOST'\n\
  config[['pg']][['port']] <- '$POSTGRES_PORT'\n\
  config[['pg']][['hostMaster']] <- '$POSTGRES_HOST_MASTER'\n\
  config[['pg']][['portMaster']] <- '$POSTGRES_PORT_MASTER'\n\
  config[['pg']][['poolMin']] <- '$POSTGRES_POOL_MIN'\n\
  config[['pg']][['poolMax']] <- '$POSTGRES_POOL_MAX'\n\
  config[['project']][['default']] <- '$MAPX_PROJECT_DEFAULT'\n\
  config[['project']][['creation']][['usersAllowed']] <- jsonlite::fromJSON('$MAPX_PROJECT_CREATORS')\n\
  config[['root_mode']][['members']] <- jsonlite::fromJSON('$MAPX_ROOT_MODE_MEMBERS')\n\
  config[['map']][['token']] <- '$MAPX_MAPBOX_TOKEN'\n\
  config[['geoserver']][['url']] <- '$GEOSERVER_URL'\n\
  config[['geoserver']][['urlPublic']] <- '$GEOSERVER_URL_PUBLIC'\n\
  config[['geoserver']][['user']] <- '$GEOSERVER_ADMIN_USERNAME'\n\
  config[['geoserver']][['password']] <- '$GEOSERVER_ADMIN_PASSWORD'\n\
  config[['geoserver']][['dataDir']] <- '$GEOSERVER_DATA_DIR' " 

#config[['validation']][['view']][['rules']] <- jsonlite::fromJSON('$MAPX_VIEW_VALIDATION_RULES')"

CONF_SHINY_SERVER="\
  run_as shiny; \n\
  server { \n\
  listen '$SHINY_PORT';\n\
  location / { \n\
  app_dir '$MAPX_PATH_APP'; \n\
  log_dir '$MAPX_PATH_LOG'; \n\
  }}"


echo $CONF_MAPX > $MAPX_CONFIG
echo $CONF_SHINY_SERVER > "/etc/shiny-server/shiny-server.conf"

exec shiny-server 2>&1 &
exec xtail $MAPX_PATH_LOG
