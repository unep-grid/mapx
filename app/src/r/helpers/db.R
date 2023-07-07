#' Get a view object as list
#'
#' @param idView {Character} id of the view
#'
mxDbGetView <- function(idView) {
  v <- mxDbGetQuery("
    WITH view as (
    SELECT * FROM mx_views_latest
    WHERE id = '" + idView + "'
    )
    SELECT json_agg(view) as json from view;
    ")$json
  jsonlite::fromJSON(v, simplifyDataFrame = F)
}


#' Get query result from postgresql
#'
#' Wrapper to execute a query
#'
#' @param query SQL query
#' @param {RPostgreSQL} con Connexion object
#' @export
mxDbGetQuery <- function(
  query,
  stringAsFactors = FALSE,
  con = NULL,
  onError = function(r) {
    r
  }) {
  res <- NULL
  hasCon <- !noDataCheck(con)
  #
  # Get a connection
  #
  if (!hasCon) {
    con <- mxDbGetCon()
    on.exit(mxDbReturnCon(con))
  }

  #
  #  Timing flag
  #
  timing <- FALSE

  tryCatch(
    {
      #
      # ⚠️  RPostgreSQL complain about jsonb..
      # TODO: Check if this has been fixed and remove suppressWarnings
      # ⚠️  Impossible to produce parametrized requests. Does not work in RPostgreSQL_0.6-2
      #
      if (timing) {
        timer <- mxTimeDiff("request")
      }
      suppressWarnings({
        res <- dbSendQuery(con, query)
        if (!dbHasCompleted(res)) {
          res <- dbFetch(res)
        }
      })

      if (class(res) == "data.frame" && noDataCheck(res)) {
        res <- NULL
      }

      if (timing) {
        diff <- mxTimeDiff(timer)
        if (diff > 0.1) {
          mxDebugMsg("SLOW REQUEST")
          mxDebugMsg(sql)
        }
      }
    },
    error = function(e) {
      mxDebugMsg("There was an error in the mxDbGetQuery. The session will be terminated.")

      #
      # If available, clean DB pool
      #
      if (exists("mxDbPoolClose")) {
        mxDbPoolClose()
      }

      quit(
        save = "no",
        status = 1,
      )
    },
    finally = {
      mxDbClearResult(con)
    }
  )
  return(res)
}


#' @rdname mxDbGetDistinctCollectionsTags
#' @param {character} Project name
mxDbGetDistinctCollectionsTags <- function(project = NULL) {
  if (noDataCheck(project)) stop("mxDbGetDistinctCollectionsTags need a project")

  sql <- "
  WITH collections as (
    SELECT DISTINCT(data->'collections') as tags
    FROM mx_views_latest
    WHERE project = '" + project + "'
    ),
  tags as (
    SELECT tags, jsonb_typeof(tags) as tagstype FROM collections
    ),
  arrays as (
    SELECT
    CASE
    WHEN tagstype = 'string'
    THEN jsonb_build_array(tags)
    ELSE tags
    END as tags
    FROM tags
    )

  SELECT DISTINCT(JSONB_ARRAY_ELEMENTS(tags)) ->> 0 res FROM arrays;
  "

  tags <- mxDbGetQuery(sql)$res

  return(tags)
}


#' Remove old views in views table
#'
#'
mxDbSlimViews <- function(max = 10, daysback = 60) {
  sql <- "
  WITH ranked as (
    SELECT pid, date_modified, rank() OVER (
      PARTITION BY id
      ORDER BY date_modified DESC
      ) r
    FROM mx_views
    ),
  older as (
    SELECT pid
    FROM ranked
    WHERE r > " + max + "
    AND date_modified < now() - interval '" + daysback + " days'
    )

  delete
  FROM mx_views v, older o
  WHERE v.pid = o.pid
  "

  mxDbGetQuery(sql)
}




#' Update a single value of a table
#' @param table Table to update
#' @param column Column to update
#' @param idCol Column of identification
#' @param id Identification value
#' @param value Replacement value
#' @param expectedRowsAffected Number of row expected to be affected. If the update change a different number of row than expected, the function will rollback
#' @return Boolean worked or not
#' @export
mxDbUpdate <- function(table, column, idCol = "id", id, value, path = NULL, expectedRowsAffected = 1) {
  # explicit check
  stopifnot(mxDbExistsTable(table))

  stopifnot(tolower(column) %in% tolower(mxDbGetTableColumnsNames(table)))
  # implicit check
  stopifnot(!noDataCheck(id))
  stopifnot(!noDataCheck(idCol))

  # Use single connection for all
  mxDbWithUniqueCon(function(con) {
    # final query
    query <- NULL

    if (!is.null(path)) {
      # if value has no json class, convert it (single value update)
      valueIsJson <- isTRUE("json" %in% class(value))
      if (valueIsJson) {
        valueJson <- value
      } else {
        valueJson <- mxToJsonForDb(value)
      }

      #
      # json update
      #
      pathIsJson <- isTRUE("json" %in% class(path))
      if (pathIsJson) {
        pathJson <- path
      } else {
        pathJson <- paste0("{", paste0(paste0("\"", path, "\""), collapse = ","), "}")
      }

      #
      # test if the whole path exists and if value is there
      #
      isMissing <- sprintf(
        "
        SELECT NOT EXISTS(
          SELECT \"%1$s\" from %2$s
          WHERE \"%3$s\"='%4$s'
          AND \"%1$s\"#>>'%5$s' IS NOT NULL
          ) AS missing
        ",
        column,
        table,
        idCol,
        id,
        pathJson
      ) %>%
        mxDbGetQuery(., con = con) %>%
        `[[`("missing")
      #
      # create missing if needed
      #
      if (isMissing) {
        data <- sprintf(
          "
        SELECT \"%1$s\"
        FROM %2$s
        WHERE \"%3$s\"='%4$s'
        ",
          column,
          table,
          idCol,
          id
        ) %>%
          mxDbGetQuery(., con = con) %>%
          `[[`(column) %>%
          jsonlite::fromJSON(., simplifyDataFrame = FALSE)

        value <- mxSetListValue(data, path, value)
      } else {
        query <- sprintf(
          "
        UPDATE %1$s
        SET \"%2$s\"= (
        SELECT jsonb_set(
          (
            SELECT \"%2$s\"
            FROM %1$s
            WHERE \"%4$s\"='%5$s'
            ) ,
          '%6$s',
          '%3$s'
        )
      )
      WHERE \"%4$s\"='%5$s'",
          table,
          column,
          valueJson,
          idCol,
          id,
          pathJson
        )
      }
    }
    # End path


    # default update
    if (is.null(query)) {
      # if it's a list, convert to json
      if (is.list(value)) value <- mxToJsonForDb(value)
      # standard update
      query <- sprintf(
        "
        UPDATE %1$s
        SET \"%2$s\"='%3$s'
        WHERE \"%4$s\"='%5$s'",
        table,
        column,
        value,
        idCol,
        id
      )
    }

    isAsExpeced <- TRUE

    tryCatch({
      dbWithTransaction(con, {
        rs <- dbSendStatement(con, query)
        ra <- dbGetRowsAffected(rs)

        isAsExpected <- isTRUE(ra == expectedRowsAffected)
        if (!isAsExpected) {
          dbBreak()
          warning(sprintf(
            "Warning, number of rows affected does not match expected rows affected %s vs %s. Rollback requested",
            ra,
            expectedRowsAffected
          ))
        }
      })
    })
    return(isAsExpected)
  })
}

#' Get layer extent
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetLayerExtent <- function(table = NULL, geomColumn = "geom") {
  if (is.null(table)) stop("Missing table name")


  if (mxDbExistsTable(table)) {
    #
    # Get extent
    #
    ext <- mxDbGetQuery("
      SELECT
      ST_AsGeoJSON(
        ST_Extent(
          ST_buffer(
            ST_Envelope(" + geomColumn + ")::geography
            , 1 )::geometry
          )
        ) as ext FROM " + table + "")

    #
    # Extract coordinates from json
    #
    res <- .get(
      jsonlite::fromJSON(
        ext$ext,
        simplifyVector = F
      ), c("coordinates")
    )[[1]]

    #
    # GeoJSON coordinate order is : longitude, latitude
    #

    if (is.null(res)) {
      out <- list()
    } else {
      out <- list(
        "lng1" = res[[1]][[1]],
        "lng2" = res[[3]][[1]],
        "lat1" = res[[1]][[2]],
        "lat2" = res[[3]][[2]]
      )
    }

    return(out)
  }
}


#' Extract table of layer for one project, for given role or userid
#' @param {Vector} Id view that is linked to a layer
#' @return {List} List of layer ids
#' @export
mxDbGetLayerListByViews <- function(idViews = c()) {
  viewsIdsString <- paste(paste0("'", idViews, "'"), collapse = ",")

  sql <- "
  WITH a AS (
    SELECT id as _id, MAX(date_modified) AS _date
    FROM mx_views
    WHERE id in (" + viewsIdsString + ")
    GROUP BY id
    )
  SELECT distinct(data#>>'{\"source\",\"layerInfo\",\"name\"}') as idsource
  FROM mx_views b
  JOIN a
  ON a._id = b.id
  AND a._date = b.date_modified"

  additionalLayers <- mxDbGetQuery(sql)$idsource
  additionalLayers <- additionalLayers[!is.na(additionalLayers)]

  return(additionalLayers)
}


#' Extract table of layer for one project, for given role or userid
#' @param project Project code
#' @param projects Projects code
#' @param idUser Integer user id
#' @param roleInProject Role
#' @param type Type : vector, raster, tabular
#' @param language language for layer name. Default is en.
#' @param additionalSourcesIds Additional id to add in the list
#' @param editableOnly Only editable
#' @export
mxDbGetSourceTable <- function(
  project,
  projects,
  idUser,
  roleInProject,
  types = c("vector", "raster", "tabular"),
  language = "en",
  additionalSourcesIds = c(),
  editableOnly = FALSE
) {
  sourceIds <- paste(paste0("'", additionalSourcesIds, "'"), collapse = ",")
  types <- paste(paste0("'", types, "'"), collapse = ",")

  role <- roleInProject
  filterRead <- "false"
  filterEdit <- "false"
  filter <- "false"

  if (role$member) {
    filterRead <- "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members'] OR readers @> '[" + idUser + "]'"
  }

  if (role$publisher) {
    filterRead <- "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members','publishers'] OR readers @> '[" + idUser + "]'"
    filterEdit <- "editors ?| array['publishers'] OR editor = " + idUser + " OR editors @> '[" + idUser + "]'"
  }

  if (role$admin) {
    filterRead <- "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members','publishers','admins'] OR readers @> '[" + idUser + "]'"
    filterEdit <- "editors ?| array['publishers','admins'] OR editor = " + idUser + " OR editors @> '[" + idUser + "]'"
  }

  if (editableOnly) {
    filter <- filterEdit
  } else {
    filter <- filterRead
  }

  sql <- "
  SELECT id, type,
  CASE
    WHEN
      coalesce(data #>> '{\"meta\",\"text\",\"title\",\"" + language + "\"}','') = ''
  THEN
    data #>> '{\"meta\",\"text\",\"title\",\"en\"}'
  ELSE
    data #>> '{\"meta\",\"text\",\"title\",\"" + language + "\"}'
  END as title, date_modified
  FROM mx_sources
  WHERE
    project = '" + project + "'
  AND
    type in (" + types + ")
  AND
    (
      id in (" + sourceIds + ")
      OR
      (" + filter + ")
    )"

  dat <- mxDbGetQuery(sql)

  #
  # Return
  #

  return(dat)
}


#' Get list of table/layer not refered in mx_source
#' @param tableSource Default to mx_sources
#' @param exludes Default to mx_sources, mx_users, mx_views
#'
mxDbGetUnregisteredTable <- function(tableSource = "mx_sources", excludes = c("mx_users", "mx_sources", "mx_views", "spatial_ref_sys")) {
  tbls <- c()

  tryCatch(
    {
      ids <- mxDbGetQuery(sprintf("SELECT distinct id FROM %1$s", tableSource))$id
      tbls <- mxDbListTable()
      tbls <- tbls[!tbls %in% excludes]
      tbls <- tbls[!tbls %in% ids]
    },
    error = function(err) {}
  )

  return(tbls)
}



#' Json string to list
#' @param {character} res json string
mxJsonToList <- function(res) {
  out <- list()
  if (!noDataCheck(res)) {
    out <- jsonlite::fromJSON(res, simplifyDataFrame = FALSE)
  }
  return(out)
}

mxJsonToList <- memoise(mxJsonToList)



#' @export
mxDbGetValByCoord <- function(table = NULL, column = NULL, lat = NULL, lng = NULL, geomColumn = "geom", srid = "4326", distKm = 1) {
  if (
    noDataCheck(table) ||
      noDataCheck(column) ||
      noDataCheck(lat) ||
      noDataCheck(lng) ||
      isTRUE(column == "gid")
  ) {
    return()
  } else {
    timing <- system.time({
      sqlPoint <- sprintf("'SRID=%s;POINT(%s %s)'", srid, lng, lat)
      sqlWhere <- sprintf(
        paste(
          "with index_query as (select st_distance(%s, %s) as distance, %s from %s order by %s <#> %s limit 10)",
          "select %s from index_query where distance < 0.1 order by distance limit 1;"
        ),
        geomColumn, sqlPoint, column, table, geomColumn, sqlPoint, column
      )
      suppressWarnings({
        res <- mxDbGetQuery(sqlWhere)
      })
    })
    return(
      list(
        result = res,
        latitude = lat,
        longitude = lng,
        timing = timing
      )
    )
  }
}


#' Get variable summary
#'
#' @param table Table/layer from which extract extent
#' @param column Column/Variable on wich extract summary
#' @export
mxDbGetColumnInfo <- function(table = NULL, column = NULL) {
  if (noDataCheck(table) || noDataCheck(column) || isTRUE(column == "gid")) {
    return()
  }


  stopifnot(tolower(column) %in% tolower(mxDbGetTableColumnsNames(table)))
  timing <- system.time({
    q <- sprintf(
      "SELECT attname
      FROM pg_attribute
      WHERE attrelid =
        (SELECT oid
          FROM pg_class
          WHERE relname = '%s'
          )
      AND attname = '%s';",
      table,
      column
    )

    columnExists <- nrow(mxDbGetQuery(q)) > 0

    if (!columnExists) {
      message(paste("column", column, " does not exist in ", table))
      return()
    }

    # number of row
    nR <- mxDbGetQuery(sprintf(
      "SELECT count(*)
        FROM %s
        WHERE %s IS NOT NULL",
      table,
      column
    ))[[1]]

    # number of null
    nN <- mxDbGetQuery(sprintf(
      "SELECT count(*)
        FROM %s
        WHERE %s IS NULL",
      table,
      column
    ))[[1]]

    # number of distinct
    nD <- mxDbGetQuery(sprintf(
      "SELECT COUNT(DISTINCT(%s))
        FROM %s
        WHERE %s IS NOT NULL",
      column,
      table,
      column
    ))[[1]]

    val <- mxDbGetQuery(sprintf(
      "
        SELECT DISTINCT(%s)
        FROM %s
        WHERE %s IS NOT NULL",
      column,
      table,
      column
    ), stringAsFactors = T)[[1]]
  })


  scaleType <- ifelse(is.factor(val) || is.character(val), "discrete", "continuous")

  return(
    list(
      "table" = table,
      "column" = column,
      "nDistinct" = nD,
      "nRow" = nR,
      "nNa" = nN,
      "scaleType" = scaleType,
      "dValues" = val,
      "timing" = timing
    )
  )
}


#' Get layer center
#'
#' Compute the union of all geometry in a given layer and return the coordinate of the centroid.
#'
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetLayerCentroid <- function(table = NULL, geomColumn = "geom") {
  if (is.null(table)) stop("Missing arguments")

  if (mxDbExistsTable(table)) {
    query <- sprintf(
      "SELECT ST_AsGeoJSON(
      ST_centroid(
        ST_Collect(
          %1$s
          )
        )
      ) AS t
    FROM %2$s",
      geomColumn,
      table
    )

    res <- mxDbGetQuery(query)$t %>% jsonlite::fromJSON()

    res <- as.list(res$coordinates)

    names(res) <- c("lng", "lat")

    return(res)
  }
}

#' Get query extent, based on a pattern matching (character)
#'
#' Search for a value in a  column (character data type) and return the extent if something is found.
#'
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetFilterCenter <- function(table = NULL, column = NULL, value = NULL, geomColumn = "geom", operator = "=") {
  if (mxDbExistsTable(table)) {
    valueOrig <- gsub("'", "''", value)
    valueEscape <- paste0("(E", paste0("\'", valueOrig, "\'", collapse = ","), ")")
    if (length(value) > 1) {
      operator <- "in"
    }

    q <- sprintf(
      "
      SELECT ST_Extent(ST_MakeValid(%1$s))::text as data_extent
      FROM (SELECT %1$s FROM %2$s WHERE %3$s %5$s %4$s ) t
      WHERE ST_isValid(%1$s)",
      geomColumn,
      table,
      column,
      valueEscape,
      operator
    )

    ext <- mxDbGetQuery(q)$data_extent

    if (noDataCheck(ext)) {
      return(NULL)
    }


    res <- ext %>%
      gsub(" ", ",", .) %>%
      gsub("[a-zA-Z]|\\(|\\)", "", .) %>%
      strsplit(., ",") %>%
      unlist() %>%
      as.numeric() %>%
      as.list()

    names(res) <- c("lng1", "lat1", "lng2", "lat2")

    return(res)
  }
}

#' List existing table from postgresql
#'
#' Shortcut to create a connection, get the list of table and close the connection, using a dbInfo list.
#'
#' @param dbInfo Named list with dbName,host,port,user and password
#' @export
mxDbListTable <- function() {
  pool <- mxDbGetPool()
  res <- dbListTables(pool)
  return(res)
}

#' Check if table exists in postgresql
#'
#' Shortcut to create a connection, and check if table exists.
#'
#' @param table Name of the table to check
#' @export
mxDbExistsTable <- function(table) {
  if (is.null(table)) {
    return(FALSE)
  }
  pool <- mxDbGetPool()
  res <- dbExistsTable(pool, table)
  return(res)
}


#' Convert list of columns namme no sql colulmns array
#'
#'
mxToPgColumn <- function(cols = NULL) {
  strIn <- paste0(cols, collapse = '","')
  strOut <- sprintf('("%s")', strIn)
  return(strOut)
}

mxToPgArray <- function(items = NULL) {
  strIn <- paste0(items, collapse = "','")
  strOut <- sprintf("('%s')", strIn)
  return(strOut)
}


#' List existing column from postgresql table
#'
#' Shortcut to get column name for a table
#'
#' @param table {character} table name
#' @param avoid {vector} notIn names to remove
#' @param avoid {vector} notTypes names to remove
#' @return {character} List  of columns name
#' @export
mxDbGetTableColumnsNames <- function(table, notIn = NULL, notType = NULL) {
  qNotIn <- ""
  qNotType <- ""

  if (isNotEmpty(notIn)) {
    qNotIn <- sprintf(
      "AND column_name NOT IN %s",
      mxToPgArray(notIn)
    )
  }

  if (isNotEmpty(notType)) {
    qNotType <- sprintf(
      "AND data_type NOT IN %s",
      mxToPgArray(notType)
    )
  }

  query <- sprintf("
    SELECT  column_name as res
    FROM information_schema.columns
    WHERE table_schema='public'
    AND table_name='%1$s'
    %2$s %3$s
    ", table, qNotIn, qNotType)

  res <- mxDbGetQuery(query)$res

  return(res)
}

#' Get layer source last edit
#'
#' Shortcut to get column name for a table
#'
#' @param idSource {character} id source / layer
#' @export
mxDbGetSourceLastDateModified <- function(idSource) {
  timeSourceDb <- mxDbGetQuery("
    SELECT date_modified as date
    FROM mx_sources
    WHERE id = '" + idSource + "'
    LIMIT 1")$date

  return(timeSourceDb)
}

#' List existing column type from postgresql table
#'
#' Shortcut to get column type for a table
#'
#' @param table Name of the table to evaluate
#' @export
mxDbGetColumnsTypes <- function(table) {
  query <- sprintf(
    "select data_type as res from information_schema.columns where table_schema='public' and table_name='%s'",
    table
  )
  res <- mxDbGetQuery(query)$res

  return(res)
}


#' Format posix to timestamp template for postgres
#' @param {Character} ts POSIXct object
#' @return {Character} Timestamp postgres function
mxDbTimeStampFormater <- function(ts) {
  if (!isTRUE("POSIXct" %in% class(ts))) stop("need a POSIXct object")
  ts <- format(ts, "%d-%m-%Y %H:%M:%S")
  sprintf("to_timestamp('%1$s','dd-mm-yyyy hh24:mi:ss')", ts)
}


#' Automatic add row to a table
#' @param {Any} data
#' @param {Character}
mxDbAddRow <- function(data, table) {
  tExists <- mxDbExistsTable(table)
  if (!tExists) stop(sprintf("mxDbAddRow : table %s does not exists", table))

  if (!is.list(data)) data <- as.list(data)

  data <- data[!names(data) == "pid"]
  tClass <- sapply(data, class)

  #
  # Compare names in table vs names in db table
  #
  tName <- names(data)
  rName <- mxDbGetTableColumnsNames(table)
  # Subset only existing
  data <- data[tName %in% rName]
  fName <- names(data)

  dataProc <- lapply(data, function(x) {
    if (length(x) > 1) {
      x <- as.list(x)
    }

    switch(class(x)[[1]],
      "list" = {
        sprintf("'%s'", mxToJsonForDb(x))
      },
      "character" = {
        sprintf("'%1$s'", gsub("'", "''", x))
      },
      "POSIXct" = {
        mxDbTimeStampFormater(x)
      },
      "logical" = {
        tolower(x)
      },
      "numeric" = {
        sprintf("%i::numeric", x)
      },
      "integer" = {
        sprintf("%i::integer", x)
      },
      sprintf("'%1$s'", x)
    )
  })


  q <- sprintf(
    "INSERT INTO %1$s (%2$s) VALUES (%3$s)",
    table,
    paste(paste0("\"", fName, "\""), collapse = ","),
    paste(dataProc, collapse = ",")
  )

  pool <- mxDbGetPool()
  res <- list()

  #'
  #' ⚠️ This should be set into a transaction and validated
  #'
  dbExecute(pool, q)
}

mxDbAddRowBatch <- function(df, table) {
  stopifnot(is.data.frame(df))
  stopifnot(mxDbExistsTable(table))

  for (i in 1:nrow(df)) {
    dat <- df[i, ]
    mxDbAddRow(dat, table)
  }
}


#' Clear db results
#'
#' @param {Connection} con Postgres connection
mxDbClearResult <- function(con) {
  lRes <- dbListResults(con)
  if (length(lRes) > 0) {
    for (r in lRes) {
      dbClearResult(r)
    }
  }
}

#' Get user info
#'
#' @param email user email
#' @param userTable DB users table
#' @return list containing id, email and data from the user
#' @export
mxDbGetUserInfoList <- function(id = NULL, email = NULL, userTable = "mx_users") {
  emailIsGiven <- !is.null(email)
  idIsGiven <- !is.null(id)
  col <- "id"

  if (
    (emailIsGiven && idIsGiven) ||
      (!emailIsGiven && !idIsGiven)
  ) {
    stop("Get user details : one of id or email should be provided.")
  }

  if (emailIsGiven) {
    col <- "email"
    id <- paste0("'", email, "'")
  }

  quer <- sprintf(
    "SELECT id,key,email,data::text as data
    FROM %1$s
    WHERE %2$s = %3$s
    LIMIT 1
    ",
    userTable,
    col,
    id
  )

  res <- as.list(mxDbGetQuery(quer))
  if (length(res) < 1) {
    res <- list()
  } else {
    res$data <- jsonlite::fromJSON(res$data, simplifyVector = FALSE)
  }
  class(res) <- c(class(res), "mxUserInfoList")
  return(res)
}

#' Get user last used language
#'
#' @param email {Character} User email
#' @param id {Integer} Id user
#' @param default {Character} Default language
#' @return {Character} two letters language code
mxDbGetUserLanguage <- function(email = NULL, id = NULL, default = "en") {
  userInfo <- mxDbGetUserInfoList(email = email, id = id)
  .get(userInfo, c("data", "user", "cache", "last_language"), default)
}

#' Get matching language or default for two user
#'
#' @param a {Character} User language or email a
#' @param b {Character} User language or email b
#' @param default {Character} Default language
#' @return {Character} two letters language code
mxDbGetUsersLanguageMatch <- function(a = NULL, b = NULL, default = "en") {
  languageA <- ifelse(mxEmailIsValid(a), mxDbGetUserLanguage(a), a)
  languageB <- ifelse(mxEmailIsValid(b), mxDbGetUserLanguage(b), b)
  ifelse(languageA == languageB, languageA, default)
}

# WHERE s.role#>>'{\"role\"}' in %2$s
mxDbGetUserByRoles <- function(roles = "user", userTable = "mx_users") {
  roles <- paste0("(", paste0("'", roles, "'", collapse = ","), ")")
  quer <- sprintf(
    "
    SELECT * FROM
    (
      SELECT id,email,a.role#>>'{\"project\"}' as project,a.role#>>'{\"role\"}' as role
      FROM (
        SELECT id,email,jsonb_array_elements(data#>'{\"admin\",\"roles\"}') AS role
        FROM %1$s
        WHERE jsonb_typeof(data#>'{\"admin\",\"roles\"}') = 'array'
        ) a
      UNION
      SELECT id,email,key as project, value as role FROM
      (
        SELECT id,email,(jsonb_each_text(data#>'{\"admin\",\"roles\"}')).*
          FROM %1$s
        WHERE jsonb_typeof( data#>'{\"admin\",\"roles\"}') = 'object'
        ) b
      ) c
    WHERE role  in %2$s
    ",
    userTable,
    roles
  )
  mxDbGetQuery(quer)
}


#' Get roles list for user
#' @param id  User id
#' @param userTable User table
mxDbGetUserRoles <- function(id = 1, userTable = "mx_users") {
  roles <- mxDbGetQuery("SELECT data#>>'{\"admin\",\"roles\"}' as roles from mx_users where id=" + id)
  roles <- jsonlite::fromJSON(roles$roles, simplifyDataFrame = F)

  return(roles)
}



#' Add new user using email
#'
#' @param email {Character} User email to register
#' @param timeStamp {POSIXct} Timestamp
#' @param language {Character} two letters language code
#' @return
mxDbCreateUser <- function(
  email = NULL,
  timeStamp = Sys.time(),
  language = "en"
) {
  conf <- mxGetDefaultConfig()

  dataUserDefault <- .get(conf, c("users", "data", "public"))
  dataUserSuperuser <- .get(conf, c("users", "data", "superUser"))
  userTable <- .get(conf, c("pg", "tables", "users"))
  userNameDefault <- .get(conf, c("users", "defaultName"))

  stopifnot("POSIXct" %in% class(timeStamp))
  stopifnot(mxEmailIsValid(email))
  stopifnot(mxDbExistsTable(userTable))
  stopifnot(!mxDbEmailIsKnown(email))

  # check if the db does not hold any user
  # empty db means : first time we launch it.
  # first user is always a superuser
  emptyDb <- isTRUE(
    0 == mxDbGetQuery(
      sprintf(
        "SELECT count(id) FROM %s",
        userTable
      )
    )
  )

  if (emptyDb) {
    # first is superuser
    dat <- dataUserSuperuser
  } else {
    # .. then default
    dat <- dataUserDefault
  }

  stopifnot(length(dat) > 0)

  #
  # Set username based on the user table sequence.
  #
  getCurId <- sprintf(
    "SELECT last_value as id FROM public.%s_id_seq",
    userTable
  )
  nextId <- mxDbGetQuery(getCurId, onError = function(x) {
    stop(x)
  })

  # quick check on what we get is what we expect
  if (nrow(nextId) > 0 && "id" %in% names(nextId)) {
    nextId <- nextId$id + 1
  } else {
    stop("Error in mxDbCreateUser")
  }
  # create default name
  userName <- sprintf(
    "%s_%s",
    userNameDefault,
    nextId
  )

  newUser <- list(
    username        = userName,
    email           = email,
    key             = randomString(),
    validated       = TRUE,
    hidden          = FALSE,
    date_validated  = timeStamp,
    date_last_visit = timeStamp,
    data            = mxToJsonForDb(dat)
  )

  mxDbAddRow(newUser, userTable)


  #
  # Send welcome Email
  #
  subject <- mxParseTemplateDict("login_email_new_account_welcome_subject", language)

  msgWelcome <- mxParseTemplateDict("login_email_new_account_welcome", language, list(
    linkKnowledgeBase = .get(config, c("links", "appKnowlegdeBase")),
    linkIssue = .get(config, c("links", "repositoryIssues"))
  ))

  mxSendMail(
    to = email,
    content = msgWelcome,
    subject = subject
  )
}

#' Create pg compatible version of json, from a R list
#' @param {list} listInput List to send in a pg table
#' @export
mxToJsonForDb <- function(listInput) {
  if (noDataCheck(names(listInput))) {
    #
    # Force names = null to avoid names = character(0),
    # which translate in '{}' with toJSON
    #
    names(listInput) <- NULL
  }
  jsonlite::toJSON(listInput, auto_unbox = TRUE, simplifyVector = FALSE) %>%
    gsub("[\x09\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", .) %>%
    gsub("'", "''", .) %>%
    as.character()
}



#' Drop layer and associated views
#' @param layerName Layer to remove
#' @export
mxDbDropLayer <- function(layerName) {
  idSource <- mxDbGetQuery(sprintf(
    "
    SELECT id
    FROM mx_sources
    WHERE id='%1$s'",
    layerName
  ))$id

  viewsTable <- mxDbGetViewsIdBySourceId(layerName)
  existsTable <- isTRUE(mxDbExistsTable(layerName))
  existsEntry <- !noDataCheck(idSource)
  existViews <- !noDataCheck(viewsTable)

  if (existViews) {
    stop("Attempt to remove source layer with active view depending on it")
  }

  if (existsTable) {
    mxDbGetQuery(sprintf("DROP table %1$s", layerName))
  }

  if (existsEntry) {
    for (i in idSource) {
      mxDbGetQuery(sprintf("DELETE FROM mx_sources WHERE id='%1$s'", i))
    }
  }


  return()
}

#' Helper to update a value in a data jsonb column in db and reactUser$data, given a path
#' @param reactUser  mapx reactives user values, containing 'data' item
#' @param value Value to update, at a given path
#' @param path Path to reach the value to update, in both db mx_users->data and reactUser$data$data
#' @export
mxDbUpdateUserData <- function(reactUser, path, value) {
  stopifnot(!noDataCheck(path))
  stopifnot(!noDataCheck(value))
  stopifnot(is.reactivevalues(reactUser))

  conf <- mxGetDefaultConfig()

  userTableName <- .get(conf, c("pg", "tables", "users"))
  #
  # Check last value
  #
  valueOld <- .get(
    li = reactUser$data$data,
    path = path
  )
  #
  # Check if this is different than the current project
  #

  isDiff <- isTRUE(!identical(valueOld[names(value)], value))

  if (isDiff) {
    #
    # Save
    #
    mxDbUpdate(
      table = userTableName,
      idCol = "id",
      id = reactUser$data$id,
      column = "data",
      path = path,
      value = value
    )
  }
}


#' Get or set key value data in given key-value table
#'
#' Table should have columns :
#' pid: serial PRIMARY KE
#' key: citext unique
#' data: jsonb
#' date_modified timestamp with time zone default current_timestamp
#'
#' @param value {List} Value to set
#' @param key {String} Key of the value
#' @param action {String} "set" or "get" value
#' @export
mxDbKeyValue <- function(key, value, action = c("set", "get"), table = "mx_config") {
  action <- match.arg(action)
  tableName <- ifelse(mxDbExistsTable(table), .get(config, c("pg", "tables", "config")), table)

  keyExists <- mxDbGetQuery("SELECT count(*) FROM " + tableName + " WHERE key = '" + key + "'")$count > 0

  if (action == "get") {
    data <- mxDbGetQuery("SELECT data from " + tableName + " WHERE key = '" + key + "'")$data
    if (!noDataCheck(data)) {
      return(jsonlite::fromJSON(data, simplifyVector = F, simplifyDataFrame = F))
    }
    return(NULL)
  }

  if (keyExists) {
    mxDbUpdate(
      table = tableName,
      idCol = "key",
      id = key,
      column = "data",
      value = value
    )
    mxDbUpdate(
      table = tableName,
      idCol = "key",
      id = key,
      column = "date_modified",
      value = Sys.time()
    )
  } else {
    mxDbAddRow(list(
      key = key,
      value = value,
      date_modified = Sys.time()
    ), tableName)
  }
}
mxDbKeyValueGet <- function(key, table) {
  return(mxDbKeyValue(key, NULL, "get", table))
}
mxDbKeyValueSet <- function(key, value, table) {
  return(mxDbKeyValue(key, value, "set", table))
}
mxDbConfigGet <- function(key) {
  return(mxDbKeyValue(key, NULL, "get", .get(config, c("pg", "tables", "config"))))
}
mxDbConfigSet <- function(key, value) {
  return(mxDbKeyValue(key, value, "set", .get(config, c("pg", "tables", "config"))))
}


# TODO: replace this with api source summary 'geom'.
#' Get layer geom types
#' @param table {character} Layer name
#' @param geomColumn {character} Geometry column name
#' @export
mxDbGetLayerGeomTypes <- function(table = NULL, geomColumn = "geom") {
  if (is.null(table)) stop("Missing table name")

  if (mxDbExistsTable(table)) {
    q <- sprintf(
      "
      SELECT count(*) AS count, ST_GeometryType(%1$s)::text as geom_type
      FROM %2$s
      GROUP BY  ST_GeometryType(%1$s)",
      geomColumn,
      table
    )

    res <- mxDbGetQuery(q)

    res$geom_type <- gsub(".*[pP]oint.*", "point", res$geom_type)
    res$geom_type <- gsub(".*[lL]ine.*", "line", res$geom_type)
    res$geom_type <- gsub(".*[pP]olygon.*", "polygon", res$geom_type)

    res <- aggregate(count ~ geom_type, sum, data = res)

    return(res)
  }
}

#' Get layer attribute type
#' @param table {character} Layer name
#' @param attribute {character} Attribute name
#' @export
mxDbGetTableAttributeJsonType <- function(table = NULL, attribute = NULL) {
  q <- sprintf(
    '
    SELECT
    JSON_typeof(to_json("%1$s")) as type
    FROM %2$s limit 1
    ',
    attribute,
    table
  )

  res <- mxDbGetQuery(q)

  return(res[[1]])
}

#' Get source summary data
#'
#' ⚠️  NOTE: Layer summary is done on demand, from the api. This
#' method exist for historical reason and return only partial summary
#'
#' @param layer {Character} Table to query
#' @param variable {Character} Column
#' @export
mxDbGetLayerSummary <- function(layer = NULL, variable = NULL) {
  summary <- list(
    layerName = layer,
    variableName = variable,
    variableType = mxDbGetTableAttributeJsonType(layer, variable),
    geomType = mxDbGetLayerGeomTypes(layer)[1, "geom_type"]
  )
  return(summary)
}


#' Get layer meta stored in default layer table
#' @param layer Postgis layer stored in layer table. Should have a meta field.
#' @export
mxDbGetSourceMeta <- function(layer) {
  layerTable <- .get(config, c("pg", "tables", "sources"))

  if (!mxDbExistsTable(layerTable)) {
    mxDebugMsg("mxGetMeta requested, but no layer table available")
    return()
  }
  if (!mxDbExistsTable(layer)) {
    mxDebugMsg("mxGetMeta requested, but no layer available")
    return()
  }
  # query
  query <- sprintf(
    "SELECT data#>'{\"meta\"}' meta FROM %1$s WHERE \"id\"='%2$s'",
    layerTable,
    layer
  )


  res <- mxDbGetQuery(query)$meta
  res <- res[length(res)]

  if (isTRUE(nchar(res) > 0)) {
    res <- jsonlite::fromJSON(res, simplifyVector = F, simplifyDataFrame = F)
  } else {
    res <- list()
  }
  return(res)
}

#' Get layer services in default layer table
#' @param layer Postgis layer stored in layer table.
#' @export
mxDbGetSourceServices <- function(idSource) {
  isDownloadableOld <- isTRUE(mxDbGetQuery("
      SELECT data#>>'{\"meta\",\"license\",\"allowDownload\"}' as allow_download
      FROM mx_sources
      WHERE id ='" + idSource + "'")$allow_download == "true")

  services <- as.character(mxFromJSON(mxDbGetQuery("
        SELECT services
        FROM mx_sources
        WHERE id ='" + idSource + "'")$services))

  if (isDownloadableOld && (!"mx_download" %in% services)) {
    services <- c("mx_download", services)
  }

  return(as.list(services))
}

#' Get layer title
#' @param layer Postgis layer stored in layer table.
#' @export
mxDbGetSourceTitle <- function(layer, asNamedList = TRUE, language = "en") {
  layer <- paste(paste0("'", layer, "'"), collapse = ",")

  # query
  sql <- "
  SELECT id,
  CASE
  WHEN
  coalesce(data #>> '{\"meta\",\"text\",\"title\",\"" + language + "\"}','') = ''
  THEN
  data #>> '{\"meta\",\"text\",\"title\",\"en\"}'
  ELSE
  data #>> '{\"meta\",\"text\",\"title\",\"" + language + "\"}'
  END as title
  FROM mx_sources
  WHERE id in (" + layer + ")"

  out <- mxDbGetQuery(sql)

  if (asNamedList) {
    idLayer <- as.list(out$id)
    names(idLayer) <- out$title
    out <- idLayer
  } else {
    out <- out$title
  }

  return(out)
}


#' Get layer project id
#' @param layer Postgis layer stored in layer table.
#' @export
mxDbGetSourceProject <- function(layer) {
  mxDbGetQuery("SELECT project FROM mx_sources where id = '" + tolower(layer) + "'")$project
}


#' Encrypt or decrypt data using postgres pg_sym_encrypt
#'
#'
#'
#' @param data vector, list or data.frame to encrypt or decrypt
#' @param ungroup boolean : ungroup the data and apply the encryption on individual item.
#' @param key Encryption key
#' @return encrypted data as list
#' @export
mxDbEncrypt <- function(data, ungroup = FALSE, key = NULL) {
  if (is.null(key)) {
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  if (any(c("list", "json") %in% class(data))) {
    if (ungroup) {
      data <- sapply(data, mxToJsonForDb)
    } else {
      data <- mxToJsonForDb(data)
    }
  }

  q <- sprintf(
    "(SELECT mx_encrypt('%1$s','%2$s') as res)",
    data,
    key
  )
  if (length(q) > 1) q <- paste(q, collapse = " UNION ALL ")

  # Execute querry
  res <- as.list(mxDbGetQuery(q))$res

  return(res)
}
#' @rdname mxDbEncrypt
mxDbDecrypt <- function(data = NULL, key = NULL) {
  if (is.null(key)) {
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  out <- try(
    {
      # if vector containing encrypted data is empty (or not a vector.. see noDataCheck) OR
      # if nchar is not even (should be hex data)
      if (
        is.null(data) ||
          !all(sapply(data, length) > 0) ||
          !all(sapply(data, is.character)) ||
          !all(sapply(data, nchar) %% 2 == 0)
      ) {
        return()
      }

      query <- sprintf(
        "SELECT mx_decrypt('%1$s','%2$s') as res",
        data,
        key
      )
      if (length(query) > 1) query <- paste(query, collapse = " UNION ALL ")

      res <- mxDbGetQuery(query)$res

      if (!is.null(res) && !is.na(res)) {
        # if we convert r object as json with mxDbEncrypt, we may want
        # retrieve decrypt no json based text.
        isJSON <- all(sapply(res, jsonlite::validate))

        if (isJSON) {
          if (length(res) > 1) {
            out <- lapply(res, jsonlite::fromJSON, simplifyVector = T)
          } else {
            out <- jsonlite::fromJSON(res, simplifyVector = T)
          }
        } else {
          out <- res
        }
      }
    },
    silent = T
  )
  return(out)
}


#' Get group table for users
#' @param idFilter optional filter of vector containing ids
mxDbGetUsersGroups <- function(idFilter = NULL) {
  filter <- ""
  if (!is.null(idFilter)) filter <- paste(sprintf("WHERE id=%s", idFilter), collapse = "OR")
  q <- sprintf(
    "SELECT id, grp
    FROM (
      SELECT id, jsonb_array_elements_text(data_admin->'group') as grp
      FROM mx_users
      %1$s
      ) t",
    filter
  )
  res <- mxDbGetQuery(q)
  return(res)
}


#' Overlaps analysis
#'
#' Use a mask to get overlaps over a layer
#' @export
mxDbAnalysisOverlaps <- function(inputBaseLayer, inputMaskLayer, outName, dataOwner = "mapxw", sridOut = 4326, varToKeep = "gid") {
  msg <- character(0)

  if (!mxDbExistsTable(outName)) {
    # get geometry type.
    # NOTE: qgis seems confused if the geom type is not updated.
    geomType <- mxDbGetQuery(
      sprintf(
        "select GeometryType(geom) as gt FROM %s limit 1",
        inputBaseLayer
      )
    )$gt

    varBase <- paste0(sprintf("a.%s", varToKeep[!varToKeep %in% "geom"]), collapse = ",")

    # ALTER TABLE %1$s
    # ALTER COLUMN geom TYPE geometry(%7$s, %5$i)
    # USING ST_SetSRID(geom,%5$i);
    createTable <- gsub("\n|\\s+", " ", sprintf(
      "
        CREATE TABLE %1$s AS
        SELECT
        %2$s,
        b.gid AS mask_gid,
        CASE
        WHEN ST_Within(a.geom,b.geom)
        THEN a.geom
        ELSE ST_Multi(ST_Intersection(a.geom,b.geom))
        END AS geom
        FROM %3$s a
        JOIN %4$s b
        ON ST_Intersects(a.geom, b.geom);

        ALTER TABLE %1$s OWNER TO %6$s;
        DO
        $$
        BEGIN
        IF not EXISTS (
          SELECT attname
          FROM pg_attribute
          WHERE attrelid = (
            SELECT oid
            FROM pg_class
            WHERE relname = '%1$s'
            ) AND attname = 'gid') THEN
        ALTER TABLE %1$s ADD COLUMN gid BIGSERIAL PRIMARY KEY;
        ELSE
        raise NOTICE 'gid already exists';
        END IF;
        END
        $$
        ",
      outName,
      varBase,
      inputBaseLayer,
      inputMaskLayer,
      sridOut,
      dataOwner,
      geomType
    ))
    mxDbGetQuery(createTable)
  }
}


#' Get number of overlapping features
mxDbGetOverlapsCount <- function(layerA, layerB, geom = "geom") {
  sql <- mxCleanString(sprintf(
    "
    SELECT count(*)
    FROM
    (
    SELECT a.gid from
    %1$s a
    JOIN  %2$s b
    ON ST_Intersects(a.%3$s, b.%3$s)
    WHERE a.%3$s && b.%3$s
    GROUP BY a.gid
    ) temp
    ",
    layerA,
    layerB,
    geom
  ))

  return(mxDbGetQuery(sql)$count)
}

#' Get layer dimensions
#'
mxDbGetLayerDimensions <- function(idLayer) {
  nrow <- mxDbGetQuery(sprintf(
    "
    SELECT count(*)
    FROM %1$s",
    idLayer
  ))$count
  colNames <- mxDbGetTableColumnsNames(idLayer)
  return(list(
    ncol = length(colNames),
    nrow = nrow
  ))
}

mxDbGetLayerDimensionsCached <- memoise(mxDbGetLayerDimensions)


#' Get session duration for given id
#' @param id Integer id of the user
#' @return list with H,M,S since last visit
#' @export
mxDbGetSessionDurationHMS <- function(id = NULL) {
  if (is.null(id)) {
    return()
  }
  res <- list(H = 0, M = 0, S = 0)

  sessionStart <- mxDbGetQuery(sprintf(
    "SELECT date_last_visit as start FROM mx_users WHERE id = %1$s",
    id
  ))$start

  if (noDataCheck(sessionStart)) {
    return()
  }

  sessionDurSec <- difftime(Sys.time(), sessionStart, units = "secs")
  sessionPosix <- .POSIXct(sessionDurSec, tz = "GMT")
  res$H <- format(.POSIXct(sessionPosix, tz = "GMT"), "%H")
  res$M <- format(.POSIXct(sessionPosix, tz = "GMT"), "%M")
  res$S <- format(.POSIXct(sessionPosix, tz = "GMT"), "%S")

  return(res)
}

#' Check if an email is known and active
#'
#' Check in a standard mapx database if an email/user exists
#'
#' @param email MapX user email
#' @param userTable name of the table
#' @return boolean exists
#' @export
mxDbEmailIsKnown <- function(email = NULL, userTable = "mx_users", active = TRUE, validated = TRUE) {
  if (noDataCheck(email)) {
    return(FALSE)
  }
  if (!mxEmailIsValid(email)) {
    return(FALSE)
  }

  email <- trimws(tolower(email))
  filterHidden <- isTRUE(!active)
  filterValidated <- isTRUE(validated)

  q <- "
  SELECT exists(
    SELECT id
    FROM " + userTable + "
    WHERE email = '" + email + "'::text
    AND validated = " + filterValidated + "
    AND hidden = " + filterHidden +
    ") ok"

  res <- mxDbGetQuery(q)
  return(res$ok)
}

mxDbGetEmailFromId <- function(id, userTable = "mx_users") {
  email <- mxDbGetQuery(sprintf("SELECT email from mx_users where id = '%1$s'", id))$email
  if (noDataCheck(email)) email <- id
  return(tolower(email))
}

mxDbGetIdFromEmail <- function(email, userTable = "mx_users") {
  email <- trimws(tolower(email))
  id <- mxDbGetQuery(sprintf("SELECT id from mx_users where email = '%1$s'::text", email))$id
  return(id)
}

mxDbGetEmailListFromId <- function(id = list(), userTable = "mx_users", asNamedList = FALSE, munged = FALSE) {
  if (noDataCheck(id)) {
    return(id)
  }
  id <- id[!vapply(id, noDataCheck, TRUE)]
  id <- vapply(id, as.integer, 1L)
  if (noDataCheck(id)) {
    return(id)
  }
  idString <- paste("(", paste(id, collapse = ","), ")")
  tblEmail <- mxDbGetQuery(sprintf("SELECT email,id from mx_users where id in %1$s", idString))

  if (isTRUE(munged)) {
    tblEmail$email <- mxEmailMunger(tblEmail$email)
  }

  if (isTRUE(asNamedList)) {
    ids <- tblEmail$id
    emails <- tolower(tblEmail$email)
    names(ids) <- emails
    return(ids)
  } else {
    emails <- merge(tblEmail, data.frame(id = id), by = "id")$email
    return(tolower(emails))
  }
}

#' Get email list
#' @return {list} Named email list
mxDbGetEmailList <- function(munged = F) {
  res <- mxDbGetQuery("SELECT email,id from mx_users where email != '" + .get(config, c("mail", "guest")) + "' order by email asc")
  eList <- res$id
  if (munged) res$email <- mxEmailMunger(res$email)
  names(eList) <- res$email
  return(eList)
}


#' Return alist of of table names present in the sql query
#'
#' NOTE: only used in the "query maker" tool, but interesting approach.
#'
#' @param {String} sql string
#' @return {Character} list of tables or empty in case of errors
mxDbGetDistinctTableFromSql <- function(sql) {
  def <- character(0)
  out <- def

  tryCatch(
    {
      res <- mxDbGetQuery("EXPLAIN (format JSON) (" + sql + ")")$`QUERY PLAN`
      if (!noDataCheck(res)) {
        res <- fromJSON(res, simplifyDataFrame = F)
      }
      if (isTRUE("list" %in% class(res))) {
        res <- unlist(res)
        out <- res[grepl("Relation Name", names(res))]
      }
    },
    error = function(e) {
      out <- def
    },
    finally = {
      if (!noDataCheck(names(out))) {
        names(out) <- NULL
      }
    }
  )

  return(out)
}
