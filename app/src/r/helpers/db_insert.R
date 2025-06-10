#' Automatic add row to a table (Secure Version)
#' @param data Any - data to insert
#' @param table Character - table name
#' @param pool Pool/Connection - database pool or connection object (optional)
mxDbAddRow <- function(data, table, pool = NULL) {
  if (isEmpty(pool)) {
    pool <- mxDbGetPool()
  }

  tExists <- mxDbExistsTable(table)
  if (!tExists) {
    stop(sprintf("mxDbAddRow: table %s does not exist", table))
  }

  if (!is.list(data)) {
    data <- as.list(data)
  }

  # Remove pid column
  data <- data[!names(data) == "pid"]

  # Validate column names against database schema
  tName <- names(data)
  rName <- mxDbGetTableColumnsNames(table)

  # Only keep columns that exist in the table
  data <- data[tName %in% rName]

  if (length(data) == 0) {
    stop("mxDbAddRow: no valid columns found for insertion")
  }

  fName <- names(data)

  # Get column types from database for proper type handling
  colTypes <- mxDbGetColumnsTypes(table)

  # Process data according to database column types
  dataProc <- lapply(names(data), function(colName) {
    x <- data[[colName]]
    dbType <- colTypes[[colName]]

    # Handle multiple values
    if (length(x) > 1) {
      x <- as.list(x)
    }

    # Type conversion based on database schema rather than R class
    mxDbCoerceValue(x, dbType)
  })

  names(dataProc) <- fName

  # Build parameterized query - column names validated against schema
  # Values are passed as parameters to prevent injection
  placeholders <- paste(rep("$", length(fName)), 1:length(fName), sep = "", collapse = ",")
  quotedColumns <- paste(paste0('"', fName, '"'), collapse = ",")

  q <- sprintf(
    "INSERT INTO %s (%s) VALUES (%s)",
    table, # Table name should be validated by caller if needed
    quotedColumns, # Column names validated against schema
    placeholders # Parameterized values ($1, $2, etc.)
  )

  tryCatch(
    {
      # Use parameterized query execution with PostgreSQL-style parameters
      dbExecute(pool, q, params = unlist(dataProc))
    },
    error = function(e) {
      stop(sprintf("mxDbAddRow: Database error - %s", e$message))
    }
  )
}

#' Batch insert with transaction support (Secure Version)
#' @param df data.frame - data to insert
#' @param table Character - table name
mxDbAddRowBatch <- function(df, table) {
  stopifnot(is.data.frame(df))
  stopifnot(mxDbExistsTable(table))

  if (nrow(df) == 0) {
    return(invisible(NULL))
  }

  pool <- mxDbGetPool()

  tryCatch(
    {
      poolWithTransaction(pool, function(con) {
        for (i in 1:nrow(df)) {
          dat <- df[i, ]
          # Pass the connection from the transaction
          mxDbAddRow(dat, table, con)
        }
      })
    },
    error = function(e) {
      stop(sprintf("mxDbAddRowBatch: Transaction failed - %s", e$message))
    }
  )
}

#' Coerce R value to appropriate type for database
#' @param x Any - value to coerce
#' @param dbType Character - database column type
#' @return Coerced value
mxDbCoerceValue <- function(x, dbType) {
  # Handle NULL/NA values
  if (is.null(x) || (length(x) == 1 && is.na(x))) {
    return(NA)
  }

  # Convert based on database type
  switch(tolower(dbType),
    "json" = ,
    "jsonb" = {
      if (is.list(x)) {
        mxToJsonForDb(x)
      } else {
        as.character(x)
      }
    },
    "text" = ,
    "varchar" = ,
    "character varying" = {
      as.character(x)
    },
    "timestamp" = ,
    "timestamp with time zone" = ,
    "timestamptz" = {
      if (inherits(x, "POSIXct")) {
        mxDbTimeStampFormater(x)
      } else {
        mxDbTimeStampFormater(as.POSIXct(x))
      }
    },
    "boolean" = {
      as.logical(x)
    },
    "numeric" = ,
    "decimal" = ,
    "real" = ,
    "double precision" = {
      as.numeric(x)
    },
    "integer" = ,
    "bigint" = ,
    "smallint" = {
      as.integer(x)
    },
    {
      # Default: convert to character
      as.character(x)
    }
  )
}
