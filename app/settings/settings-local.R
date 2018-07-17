#
# Set value from env.
#
config$api$port <- Sys.getenv("API_PORT")
config$api$host <- Sys.getenv("API_HOST")
config$resources$userdata <- Sys.getenv("MAPX_PATH_USERDATA")
config$resources$download <- Sys.getenv("MAPX_PATH_DOWNLOAD")
config$pg$encryptKey <- Sys.getenv("POSTGRES_KEY_ENCRYPT")
config$pg$user <- Sys.getenv("POSTGRES_USER_WRITE")
config$pg$password <- Sys.getenv("POSTGRES_USER_WRITE_PASSWORD")
config$pg$host <- Sys.getenv("POSTGRES_HOST")
config$pg$host <- Sys.getenv("POSTGRES_HOST")
config$project$default <- Sys.getenv("MAPX_PROJECT_DEFAULT")



