
#' Get db connection
#' @param {Boolean} useMaster : force to use master node
#' @export
mxDbGetCon <- function(useMaster=FALSE){ 
  useMaster = isTRUE(useMaster)
  pool <- mxDbGetPool(useMaster=useMaster)
  con <- poolCheckout(pool)
  mxDbAutoReturnCon(con)
  return(con)
}

#' Get db pg pool
#' @param {PostgresqlConnection} conReturn Connection to return
mxDbAutoReturnCon <- function(conReturn,env=parent.frame(n=2)){ 
  eval(
    quote({
      on.exit({
        poolReturn(conReturn)
      })
    }),
  env = list(conReturn=conReturn,env=env),
  enclos = env
  )
}


#' Get db pg pool
#' @param {Logical} useMaster Use connection to master
#' @return {PostgresqlConnection}
mxDbGetPool <- function(useMaster=FALSE){
  if(useMaster){
    pool <- .get(db,c('pg','conPoolMaster'))
  }else{
    pool <- .get(db,c('pg','conPool'))
  }
  return(pool)
}

#' Close db connection
#' 
#' @export
mxDbPoolCloseAll <- function(){
  tryCatch({
    dbPool <- mxDbGetPool()
    dbPoolMaster <- mxDbGetPool(TRUE)  
    if(mxDbPoolIsValid(dbPool)){
      message("Close pool")
      poolClose(dbPool)
    }
    if(mxDbPoolIsValid(dbPoolMaster)){
      message("Close master pool")
      poolClose(dbPoolMaster)
    }
  },
  error = function(e){
    warning(e)
  })
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
#' @export
mxDbPoolInit <- function(){
  #
  # Close pool if needed
  #
  mxDbPoolCloseAll()

  init <- quote({

    pg <- .get(config,c("pg"))

    db <- list(
      pg = pg
      )

    #
    # on exit, disconnect pg connection 
    #
    .Last <- function(){
      mxDbPoolCloseAll()
    }

    #
    # Connection pool
    #
    db <- .set(db,c('pg','conPool'),dbPool(
        drv = dbDriver("PostgreSQL"),
        dbname = pg$dbname,
        host = pg$host,
        port = pg$port,
        user = pg$user,
        password = pg$password,
        minSize = pg$poolMin,
        maxSize = pg$poolMax
        )
      )
    #
    # Connection master
    #
    db <- .set(db,c('pg','conPoolMaster'),dbPool(
        drv = dbDriver("PostgreSQL"),
        dbname = pg$dbname,
        host = pg$hostMaster,
        port = pg$portMaster,
        user = pg$user,
        password = pg$password,
        minSize = pg$poolMin,
        maxSize = pg$poolMax
        )
      )
  })

  eval(init,env=.GlobalEnv)
}


