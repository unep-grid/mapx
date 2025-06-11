#' Update a single value in a database table
#' @export
mxDbUpdate <- function(
  table,
  column,
  idCol = "id",
  id,
  value,
  path = NULL,
  expectedRowsAffected = 1
) {
  stopifnot(mxDbExistsTable(table))
  stopifnot(mxDbExistsColumns(table, column))
  stopifnot(!isEmpty(id))
  stopifnot(!isEmpty(idCol))

  pool <- mxDbGetPool()

  tryCatch(
    {
      poolWithTransaction(
        pool,
        function(con) {
          result <- if (!is.null(path)) {
            mxUpdateJsonPath(
              con,
              table,
              column,
              idCol,
              id,
              value,
              path,
              expectedRowsAffected
            )
          } else {
            mxUpdateStandard(
              con,
              table,
              column,
              idCol,
              id,
              value,
              expectedRowsAffected
            )
          }

          if (!isTRUE(result$success)) {
            stop(result$error %||% "Update failed")
          }

          return(result)
        }
      )
    },
    error = function(e) {
      return(list(success = FALSE, error = e$message))
    }
  )
}

mxUpdateStandard <- function(
  con,
  table,
  column,
  idCol,
  id,
  value,
  expectedRowsAffected
) {
  if (is.list(value)) {
    value <- mxToJsonForDbParam(value)
  }
  if(inherits(value,"POSIXt")){
    value <- mxDbTimeStampFormater(value)
  }

  query <- sprintf(
    "UPDATE %s SET \"%s\" = $1 WHERE \"%s\" = $2",
    dbQuoteIdentifier(con, table),
    column,
    idCol
  )

  rs <- dbSendStatement(con, query, params = list(value, id))
  on.exit(dbClearResult(rs), add = TRUE)
  rows <- dbGetRowsAffected(rs)

  if (rows != expectedRowsAffected) {
    return(list(
      success = FALSE,
      error = sprintf(
        "Expected %d rows affected, got %d",
        expectedRowsAffected,
        rows
      )
    ))
  }
  return(list(success = TRUE, rows_affected = rows))
}

mxUpdateJsonPath <- function(
  con,
  table,
  column,
  idCol,
  id,
  value,
  path,
  expectedRowsAffected
) {
  valueJson <- if ("json" %in% class(value)) value else mxToJsonForDbParam(value)
  pathJson <- if ("json" %in% class(path)) {
    path
  } else {
    paste0("{", paste0(paste0("\"", path, "\""), collapse = ","), "}")
  }

  if (mxJsonPathExists(con, table, column, idCol, id, pathJson)) {
    return(mxUpdateExistingJsonPath(
      con,
      table,
      column,
      idCol,
      id,
      valueJson,
      pathJson,
      expectedRowsAffected
    ))
  } else {
    return(mxCreateJsonPath(
      con,
      table,
      column,
      idCol,
      id,
      value,
      path,
      expectedRowsAffected
    ))
  }
}

mxJsonPathExists <- function(
  con,
  table,
  column,
  idCol,
  id,
  pathJson
) {
  query <- sprintf(
    "SELECT EXISTS(SELECT 1 FROM %s WHERE \"%s\" = $1 AND \"%s\" #>> $2 IS NOT NULL) AS exists",
    dbQuoteIdentifier(con, table),
    idCol,
    column
  )
  res <- dbGetQuery(con, query, params = list(id, pathJson))
  return(isTRUE(res$exists[1]))
}

mxUpdateExistingJsonPath <- function(
  con,
  table,
  column,
  idCol,
  id,
  valueJson,
  pathJson,
  expectedRowsAffected
) {
  query <- sprintf(
    "UPDATE %s SET \"%s\" = jsonb_set(\"%s\", $1, $2) WHERE \"%s\" = $3",
    dbQuoteIdentifier(con, table),
    column,
    column,
    idCol
  )
  rs <- dbSendStatement(con, query, params = list(pathJson, valueJson, id))
  on.exit(dbClearResult(rs), add = TRUE)
  rows <- dbGetRowsAffected(rs)

  if (rows != expectedRowsAffected) {
    return(list(
      success = FALSE,
      error = sprintf(
        "Expected %d rows affected, got %d",
        expectedRowsAffected,
        rows
      )
    ))
  }
  return(list(success = TRUE, rows_affected = rows))
}

mxCreateJsonPath <- function(
  con,
  table,
  column,
  idCol,
  id,
  value,
  path,
  expectedRowsAffected
) {
  query <- sprintf(
    "SELECT \"%s\" FROM %s WHERE \"%s\" = $1",
    column,
    dbQuoteIdentifier(con, table),
    idCol
  )
  current <- dbGetQuery(con, query, params = list(id))
  if (nrow(current) == 0) {
    return(list(success = FALSE, error = "No record found with given ID"))
  }

  current_data <- jsonlite::fromJSON(
    current[[1]],
    simplifyDataFrame = FALSE
  )
  updated <- mxSetListValue(current_data, path, value)
  updated_json <- mxToJsonForDbParam(updated)

  update_query <- sprintf(
    "UPDATE %s SET \"%s\" = $1 WHERE \"%s\" = $2",
    dbQuoteIdentifier(con, table),
    column,
    idCol
  )
  rs <- dbSendStatement(con, update_query, params = list(updated_json, id))
  on.exit(dbClearResult(rs), add = TRUE)
  rows <- dbGetRowsAffected(rs)

  if (rows != expectedRowsAffected) {
    return(list(
      success = FALSE,
      error = sprintf(
        "Expected %d rows affected, got %d",
        expectedRowsAffected,
        rows
      )
    ))
  }
  return(list(success = TRUE, rows_affected = rows))
}
