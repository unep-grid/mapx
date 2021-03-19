#
# Set value from env
# NOTE: if used with docker, this could be rewritten with start_mapx.sh.
config[['mail']][['admin']] <- Sys.getenv('MAIL_ADMIN')
config[['mail']][['bot']] <- Sys.getenv('MAIL_BOT')
config[['mail']][['guest']] <- Sys.getenv('MAIL_GUEST')
config[["api"]][["port"]] <- Sys.getenv("API_PORT_DEV")

if(noDataCheck(config[["api"]][["port"]])){
  config[["api"]][["port"]] <- Sys.getenv("API_PORT")
}

config[["api"]][["port_public"]] <- Sys.getenv("API_PORT_PUBLIC")
config[["api"]][["host"]] <- Sys.getenv("API_HOST")
config[["api"]][["host_public"]] <- Sys.getenv("API_HOST_PUBLIC_DEV")

if(noDataCheck(config[["api"]][["host_public"]])){
  config[["api"]][["host_public"]] <- Sys.getenv("API_HOST_PUBLIC")
}


config[["search"]][["port"]] <- Sys.getenv("MEILI_PORT")
config[["search"]][["port_public"]] <- Sys.getenv("MEILI_PORT_PUBLIC")
config[["search"]][["host"]] <- Sys.getenv("MEILI_HOST")
config[["search"]][["host_public"]] <- Sys.getenv("MEILI_HOST_PUBLIC")


config[["resources"]][["userdata"]] <- Sys.getenv("MAPX_PATH_USERDATA")
config[["resources"]][["download"]] <- Sys.getenv("MAPX_PATH_DOWNLOAD")
config[["pg"]][["encryptKey"]] <- Sys.getenv("POSTGRES_KEY_ENCRYPT")
config[["pg"]][["user"]] <- Sys.getenv("POSTGRES_USER_WRITE")
config[["pg"]][["password"]] <- Sys.getenv("POSTGRES_USER_WRITE_PASSWORD")
config[["pg"]][["host"]] <- Sys.getenv("POSTGRES_HOST")
config[["pg"]][["dbname"]] <- Sys.getenv("POSTGRES_DB")
config[["pg"]][["port"]] <- Sys.getenv("POSTGRES_PORT")
config[['pg']][["read"]][['user']] <- Sys.getenv('POSTGRES_USER_READ')
config[['pg']][["read"]][['password']] <- Sys.getenv('POSTGRES_USER_READ_PASSWORD')
config[['pg']][["poolMin"]] <- Sys.getenv('POSTGRES_POOL_MIN')
config[['pg']][["poolMax"]] <- Sys.getenv('POSTGRES_POOL_MAX')
config[["project"]][["default"]] <- Sys.getenv("MAPX_PROJECT_DEFAULT")
config[["project"]][["creation"]][["usersAllowed"]] <- jsonlite::fromJSON(Sys.getenv("MAPX_PROJECT_CREATORS"))
config[["root_mode"]][["members"]] <- jsonlite::fromJSON(Sys.getenv("MAPX_ROOT_MODE_MEMBERS"))
config[["map"]][["token"]] <- Sys.getenv("MAPX_MAPBOX_TOKEN")
config[['geoserver']][['url']] <- Sys.getenv('GEOSERVER_URL')
config[['geoserver']][['urlPublic']] <- Sys.getenv('GEOSERVER_URL_PUBLIC')
config[['geoserver']][['user']] <- Sys.getenv('GEOSERVER_ADMIN_USERNAME')
config[['geoserver']][['password']] <- Sys.getenv('GEOSERVER_ADMIN_PASSWORD')
config[['geoserver']][['dataDir']] <- Sys.getenv('GEOSERVER_DATA_DIR')

## NOTE: see mx_helper_map_view_validation.js
#config[["validation"]][["view"]][["rules"]] <- Sys.getenv("MAPX_VIEW_VALIDATION_RULES")
