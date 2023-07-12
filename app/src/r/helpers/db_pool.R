#' Get db connection
#' @param {Function} cb Function with single param 'con'. The con will be returned to the pool
#' @export
mxDbWithUniqueCon <- function(cb) {
  pool <- mxDbGetPool()
  con <- poolCheckout(pool)
  on.exit(poolReturn(con))
  cb(con)
}

#' Get db pg pool
#' @return {PostgresqlConnection}
mxDbGetPool <- function(failIfNotValid = TRUE) {
  pool <- .get(db, c("pg", "conPool"))
  return(pool)
}

#' Get db pg con
#' ⚠️  Do not forget to return OR use mxDbWithUniqueCon instead
#' @return {PostgresqlConnection}
mxDbGetCon <- function() {
  pool <- mxDbGetPool()
  poolCheckout(pool)
}

#' Return con to pool
#' @param {PostgresqlConnection} con
mxDbReturnCon <- function(con) {
  poolReturn(con)
}

#' Close db connection
#'
#' @export
mxDbPoolClose <- function() {
  dbPool <- mxDbGetPool(FALSE)
  if (mxDbPoolIsValid(dbPool)) {
    message("Close pool")
    poolClose(dbPool)
  }
}

#' Check if pool is still valid
#' @param {Pool} pool Pool
#' @export
mxDbPoolIsValid <- function(pool = NULL) {
  if (isEmpty(pool)) {
    pool <- mxDbGetPool()
  }
  isNotEmpty(pool) &&
    isTRUE("Pool" %in% class(pool)) &&
    isTRUE(pool$valid) &&
    isTRUE(mxDbTest("pool_valid_check"))
}


#' Init pool
#'
#' ⚠️  Executed in .GlobalEnv !
#'
#' @export
mxDbPoolInit <- function() {
  #
  # Close pool if needed
  #
  mxDbPoolClose()

  init <- quote({
    pg <- .get(config, c("pg"))
    pMax <- as.integer(pg$poolMax)
    pMin <- as.integer(pg$poolMin)
    pMax <- ifelse(isEmpty(pMax), 1, pMax)
    pMin <- ifelse(isEmpty(pMin), 1, pMin)
    drv <- dbDriver("PostgreSQL")

    #
    # Pre test if connection is working,
    # before pool;
    #
    tryCatch(
      {
        con <- dbConnect(drv,
          user = pg$user,
          password = pg$password,
          host = pg$host,
          port = pg$port,
          dbname = pg$dbname
        )
      },
      error = function(e) {
        cat("TEST CONNECT issue", as.character(e))
        stop(sprintf(
          "Init db failed for postgresql://%1$s:<password>@%2$s:%3$s/%4$s",
          pg$user,
          pg$host,
          pg$port,
          pg$dbname
        ))
      }
    )


    #
    # Connection pool
    #
    db <- list(
      pg = pg
    )

    db <- .set(
      db,
      c("pg", "conPool"),
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

    #
    # Testing pool
    #
    tryCatch(
      {
        ok <- mxDbTest("pool_init_check")
        if (!ok) {
          stop("failed")
        }
      },
      error = function(cond) {
        dbDisconnect(con)
        mxKillProcess(
          "There was an error in the pool init. The session will be terminated."
        )
      },
      finally = {
        dbDisconnect(con)
      }
    )
  })

  eval(init, env = .GlobalEnv)
}
