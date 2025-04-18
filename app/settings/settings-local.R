#
# Set value from env
# NOTE: if used with docker, this could be rewritten with start_mapx.sh.
config[["mail"]][["admin"]] <- Sys.getenv("MAIL_ADMIN")
config[["mail"]][["bot"]] <- Sys.getenv("MAIL_BOT")
config[["mail"]][["guest"]] <- Sys.getenv("MAIL_GUEST")
config[["api"]][["port"]] <- Sys.getenv("API_PORT")
config[["api"]][["port_public"]] <- Sys.getenv("API_PORT_PUBLIC")
config[["api"]][["host"]] <- Sys.getenv("API_HOST")
config[["api"]][["host_public"]] <- Sys.getenv("API_HOST_PUBLIC")

config[["search"]][["protocol"]] <- Sys.getenv("MEILI_PROTOCOL_PUBLIC")
config[["search"]][["host"]] <- Sys.getenv("MEILI_HOST_PUBLIC")
config[["search"]][["port"]] <- Sys.getenv("MEILI_PORT_PUBLIC")


config[["resources"]][["userdata"]] <- Sys.getenv("MAPX_PATH_USERDATA")
config[["resources"]][["download"]] <- Sys.getenv("MAPX_PATH_DOWNLOAD")
config[["pg"]][["encryptKey"]] <- Sys.getenv("POSTGRES_KEY_ENCRYPT")
config[["pg"]][["user"]] <- Sys.getenv("POSTGRES_USER_WRITE")
config[["pg"]][["password"]] <- Sys.getenv("POSTGRES_USER_WRITE_PASSWORD")
config[["pg"]][["host"]] <- Sys.getenv("POSTGRES_HOST")
config[["pg"]][["dbname"]] <- Sys.getenv("POSTGRES_DB")
config[["pg"]][["port"]] <- Sys.getenv("POSTGRES_PORT")
config[["pg"]][["read"]][["user"]] <- Sys.getenv("POSTGRES_USER_READ")
config[["pg"]][["read"]][["password"]] <- Sys.getenv("POSTGRES_USER_READ_PASSWORD")
config[["pg"]][["poolMin"]] <- Sys.getenv("POSTGRES_POOL_MIN")
config[["pg"]][["poolMax"]] <- Sys.getenv("POSTGRES_POOL_MAX")
config[["project"]][["default"]] <- Sys.getenv("MAPX_PROJECT_DEFAULT")

usersRoot <- jsonlite::fromJSON(Sys.getenv("MAPX_ROOT_MODE_MEMBERS"))
usersDev <- jsonlite::fromJSON(Sys.getenv("MAPX_DEV_MEMBERS"))
usersCreateProject <- jsonlite::fromJSON(Sys.getenv("MAPX_PROJECT_CREATORS"))

config[["project"]][["creation"]][["usersAllowed"]] <- usersCreateProject
config[["root_mode"]][["members"]] <- usersRoot
config[["dev"]][["members"]] <- usersDev

config[["services"]][["maptiler"]][["token"]] <- Sys.getenv("MAPTILER_TOKEN") 
config[["services"]][["mapbox"]][["token"]] <- Sys.getenv("MAPX_MAPBOX_TOKEN")

config[["mode"]] <- Sys.getenv("MAPX_MODE")



## NOTE: see mx_helper_map_view_validation.js
# config[["validation"]][["view"]][["rules"]] <- Sys.getenv("MAPX_VIEW_VALIDATION_RULES")
