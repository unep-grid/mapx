# 
config[["ssh"]] <- list( 
  HostName="localhost",
  User="vagrant",
  Port=2222,
  UserKnownHostsFile="/dev/null",
  StrictHostKeyChecking="no",
  PasswordAuthentication="no",
  IdentityFile="/Users/fxi/Documents/unep_grid/map-x/git/vagrant-map-x-full/.vagrant/machines/map-x-full/virtualbox/private_key",
  IdentitiesOnly="yes",
  LogLevel="FATAL"
  )

#
# postgres configuration
#
config[["pg"]] = list(
    host ='127.0.0.1',
    dbname = 'mapx',
    port = '5432',
    user = 'mapxw',
    encryptKey = readLines("../vagrant-map-x-full/passwords/generated/psql_crypto"),
    password= readLines("../vagrant-map-x-full/passwords/generated/psql_mapx_write"),
    conPool = 5,
    geomCol = "geom",
    tables = list(
      "users"="mx_users",
      "views"="mx_views",
      "sources"="mx_sources"
      )
  )

#
# remote server configuration
#
config[["remote"]] <- list(
  hostname="map-x-full",
  host="127.0.0.1",
  user="vagrant",
  port=2222
  )



