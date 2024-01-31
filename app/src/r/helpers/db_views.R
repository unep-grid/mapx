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
