
#' Get db connection
#' @param {Function} cb Function with single param 'con'. The con will be returned to the pool
#' @export
mxDbWithUniqueCon <- function(cb){
  pool <- mxDbGetPool()
  con <- poolCheckout(pool)
  on.exit(poolReturn(con))
  cb(con)
}

#' Get db pg pool
#' @return {PostgresqlConnection}
mxDbGetPool <- function(){
 .get(db,c('pg','conPool'))
}

#' Get db pg con
#' ⚠️  Do not forget to return OR use mxDbWithUniqueCon instead
#' @return {PostgresqlConnection}
mxDbGetCon <- function(){
  pool <- mxDbGetPool()
  poolCheckout(pool)
}

#' Return con to pool
#' @param {PostgresqlConnection} con 
mxDbReturnCon <- function(con){
  poolReturn(con)
}

#' Close db connection
#' 
#' @export
mxDbPoolClose <- function(){
  dbPool <- mxDbGetPool()
  if(mxDbPoolIsValid(dbPool)){
    message("Close pool")
    poolClose(dbPool)
  }
}

#' Check if pool is still valid
#' @param {Pool} pool Pool
#' @export
mxDbPoolIsValid <- function(pool){
  !noDataCheck(pool) && 
    isTRUE("Pool" %in% class(pool)) && 
    isTRUE(pool$valid)
}

#' Init pool 
#' 
#' ⚠️  Executed in .GlobalEnv !
#'
#' @export
mxDbPoolInit <- function(){
  #
  # Close pool if needed
  #
  mxDbPoolClose()

  init <- quote({

    pg <- .get(config,c("pg"))
    pMax <- as.integer(pg$poolMax)
    pMin <- as.integer(pg$poolMin)
    pMax <- ifelse(noDataCheck(pMax),1,pMax)
    pMin <- ifelse(noDataCheck(pMin),1,pMin)

    db <- list(
      pg = pg
      )

    #
    # Connection pool
    #
    db <- .set(db,
        c('pg','conPool'),
        dbPool(
          drv = dbDriver("PostgreSQL"),
          dbname = pg$dbname,
          host = pg$host,
          port = pg$port,
          user = pg$user,
          password = pg$password,
          minSize = pMin,
          maxSize = pMax,
          options = "-c application_name=mx_app"
        )
      )

  })

  eval(init,env=.GlobalEnv)
}


