#
# Set value from env
# NOTE: if used with docker, this could be rewritten with start_mapx.sh.
config[["db_log"]][["levels"]] <- jsonlite::fromJSON(Sys.getenv("MAPX_DB_LOG_LEVELS"))
config[["api"]][["port"]] <- Sys.getenv("API_PORT")
config[["api"]][["host"]] <- Sys.getenv("API_HOST")
config[["resources"]][["userdata"]] <- Sys.getenv("MAPX_PATH_USERDATA")
config[["resources"]][["download"]] <- Sys.getenv("MAPX_PATH_DOWNLOAD")
config[["pg"]][["encryptKey"]] <- Sys.getenv("POSTGRES_KEY_ENCRYPT")
config[["pg"]][["user"]] <- Sys.getenv("POSTGRES_USER_WRITE")
config[["pg"]][["password"]] <- Sys.getenv("POSTGRES_USER_WRITE_PASSWORD")
config[["pg"]][["host"]] <- Sys.getenv("POSTGRES_HOST")
config[['pg']][["read"]][['user']] <- Sys.getenv('POSTGRES_USER_READ')
config[['pg']][["read"]][['password']] <- Sys.getenv('POSTGRES_USER_READ_PASSWORD')
config[["project"]][["default"]] <- Sys.getenv("MAPX_PROJECT_DEFAULT")
config[["project"]][["creation"]][["usersAllowed"]] <- jsonlite::fromJSON(Sys.getenv("MAPX_PROJECT_CREATORS"))
config[["map"]][["token"]] <- Sys.getenv("MAPX_MAPBOX_TOKEN")
config[['geoserver']][['url']] <- Sys.getenv('GEOSERVER_URL')
config[['geoserver']][['urlPublic']] <- Sys.getenv('GEOSERVER_URL_PUBLIC')
config[['geoserver']][['user']] <- Sys.getenv('GEOSERVER_ADMIN_USERNAME')
config[['geoserver']][['password']] <- Sys.getenv('GEOSERVER_ADMIN_PASSWORD')
config[['geoserver']][['dataDir']] <- Sys.getenv('GEOSERVER_DATA_DIR')

## NOTE: see mx_helper_map_view_validation.js
#config[["validation"]][["view"]][["rules"]] <- Sys.getenv("MAPX_VIEW_VALIDATION_RULES")
