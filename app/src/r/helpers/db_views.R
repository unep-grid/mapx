#' Check if mx view name exists in postgresql
#'
#' @param viewName view name to check
#' @export
mxDbViewTitleExists <- function(title, project, languages = NULL) {
  if (isEmpty(title)) {
    return(FALSE)
  }

  viewsTable <- .get(config, c("pg", "tables", "views_latest"))

  if (is.null(languages)) {
    languages <- config[["languages"]][["list"]]
  }

  language <- paste(
    sprintf(
      "data@>'{\"title\":{\"%1$s\":\"%2$s\"}}' IS TRUE",
      languages,
      title
    ),
    collapse = " OR "
  )

  sql <- sprintf(
    "
    SELECT EXISTS(
      SELECT id FROM \"%1$s\" t1
      WHERE (%2$s)
      AND project = '%3$s'
      );",
    viewsTable,
    language,
    project
  )

  res <- mxDbGetQuery(sql)

  return(isTRUE(res$exists))
}



#' Retrieve View Table Entries by Source ID
#'
#' This function fetches entries from the views table based on the provided
#' source ID, including PG views (join).
#'
#' @param idSource The source ID used to filter views.
#' @param language The language preference for the title (default is "en").
#'
#' @return A dataframe including view and project titles, editor details,
#'
mxDbGetViewsTableBySourceId <- function(
  idSource,
  language = "en"
) {
  dependencyTable <- mxDbGetTableDependencies(idSource)

  idSources <- c(dependencyTable$id, idSource)
  do.call(
    rbind,
    lapply(
      idSources, mxDbGetViewsTableBySourceIdNoDep,
      language
    )
  )
}

mxDbGetViewsTableBySourceIdNoDep <- function(
  idSource,
  language = "en"
) {
  sql <- sprintf(
    "
  SELECT
  u.email AS email_editor,
  u.id  AS id_editor,
  v.data#>>'{attribute,name}' AS variable,
  v.pid,
  v.readers ? 'public' as is_public,
  v.id AS id,
  COALESCE(
     NULLIF(v.data#>>'{title,%1$s}',''),
     NULLIF(v.data#>>'{title,en}',''),
     v.id
  ) AS title,
 v.project project,
 COALESCE(
     NULLIF(p.title#>>'{%1$s}',''),
     NULLIF(p.title#>>'{en}',''),
     p.id
  ) AS title_project
  FROM mx_views_latest v
  JOIN mx_projects p ON p.id = v.project
  JOIN mx_users u ON v.editor = u.id
  WHERE
  v.data #>> '{source,layerInfo,name}' = '%2$s'
  OR
  v.data#>>'{source,layerInfo,maskName}'= '%2$s'
",
    language, idSource
  )

  out <- mxDbGetQuery(sql)
  return(out)
}





#' Get a view's project
#'
#' @param idView {Character} id of the view
#'
mxDbGetViewProject <- function(idView) {
  mxDbGetQuery("
    SELECT project
    FROM mx_views_latest
    WHERE id='" + idView + "'")$project
}

#' Get a view's source
#'
#' @param idView {Character} id of the view
#'
mxDbGetViewMainSource <- function(idView) {
  mxDbGetQuery("
    SELECT data#>>'{\"source\",\"layerInfo\",\"name\"}' id
    FROM mx_views_latest
    WHERE id='" + idView + "'")$id
}

#' Get a list of views title from set of views id
#'
#' @param idsViews Source (layer) id
#'
mxDbGetViewsTitle <- function(idsViews, asNamedList = TRUE, language = "en", prefix = "") {
  tableName <- "mx_views_latest"

  if (isEmpty(idsViews)) {
    return("")
  }

  sql <- "
  SELECT
  id,
  CASE
  WHEN data#>>'{\"title\",\"" + language + "\"}' != ''
  THEN data#>>'{\"title\",\"" + language + "\"}'
  ELSE data#>>'{\"title\",\"en\"}'
  END AS title
  FROM mx_views_latest
  WHERE id IN ('" + paste(idsViews, collapse = "','") + "')
  ORDER BY title asc"

  out <- mxDbGetQuery(sql)
  if (isNotEmpty(prefix)) {
    out$title <- paste(prefix, out$title)
  }

  if (asNamedList) {
    titles <- out$title
    out <- as.list(out$id)
    names(out) <- titles
  }

  return(out)
}


#' Prepare view object for database storage
#'
#' This function ensures proper list conversion to prevent R's vector->string
#' serialization issue when saving to the database. It centralizes all the
#' repetitive conversion logic found across view edit files.
#'
#' @param view The view object to prepare
#' @param editor Editor ID
#' @param time Timestamp (optional, defaults to current time)
#' @param additionalData Named list of additional data to set (optional)
#'   Keys should use dot notation for nested paths (e.g., "data.dashboard")
#' @return Prepared view object ready for mxDbAddRow
#' @export
mxPrepareViewForDb <- function(view, editor, time = Sys.time(), additionalData = NULL) {
  # Remove edit flag
  view[["_edit"]] <- NULL

  # Set timestamp
  view <- .set(view, c("date_modified"), time)

  # Convert critical fields to lists to prevent vector->string conversion
  # These fields are commonly arrays in the JSON schema but R tends to
  # convert single-element lists to vectors
  view <- .set(view, c("target"), as.list(.get(view, c("target"))))
  view <- .set(view, c("readers"), as.list(.get(view, c("readers"))))
  view <- .set(view, c("editors"), as.list(.get(view, c("editors"))))

  # Set editor
  view <- .set(view, c("editor"), editor)

  # Handle additional data (dashboard, story, style, custom code, etc.)
  if (!is.null(additionalData)) {
    for (pathKey in names(additionalData)) {
      # Convert dot notation to path vector (e.g., "data.dashboard" -> c("data", "dashboard"))
      pathVector <- if (is.character(pathKey)) {
        strsplit(pathKey, "\\.")[[1]]
      } else {
        pathKey
      }
      view <- .set(view, pathVector, additionalData[[pathKey]])
    }
  }

  # Ensure data is a list (critical for JSON serialization)
  # This must be done AFTER setting additional data to ensure nested data is preserved
  view <- .set(view, c("data"), as.list(.get(view, "data")))

  return(view)
}
