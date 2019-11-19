
#' Check if mx view name exists in postgresql
#'
#' @param viewName view name to check
#' @export
mxDbViewTitleExists <- function(title,project,languages=NULL){

  if(noDataCheck(title)) return(FALSE)

  viewsTable <- .get(config,c("pg","tables","views_latest"))

  if(is.null(languages)){
    languages = config[["languages"]][["list"]]
  }

  language <- paste(sprintf("data@>'{\"title\":{\"%1$s\":\"%2$s\"}}' IS TRUE",languages,title),collapse=" OR ")

  sql <- sprintf("
    SELECT EXISTS(
      SELECT id FROM \"%1$s\" t1 
      WHERE (%2$s) 
      AND project = '%4$s'
      );",
    viewsTable,
    language,
    title,
    project
    )

  res <- mxDbGetQuery(sql)

  return(isTRUE(res$exists))
}



#' Get a list of view id currently associated with a source
#'
#' @param idSource Source (layer) id
#'
mxDbGetViewsIdBySourceId <- function(idSource,selectAlsoByMask=TRUE,language="en"){

  tableName <- "mx_views_latest"
  strMask = ifelse(
    isTRUE(selectAlsoByMask),
    "OR data#>>'{\"source\",\"layerInfo\",\"maskName\"}' = '" + idSource + "'",
    ""
    )

  sql <- "
  WITH views_table AS (
    SELECT 
    " + tableName + ".editor,
    " + tableName + ".id, 
    " + tableName + ".data#>>'{\"attribute\",\"name\"}' as variable, 
    " + tableName + ".pid,
    " + tableName + ".project,
    " + tableName + ".readers@>'\"public\"' as is_public,
    CASE
    WHEN data#>>'{\"title\",\"" + language + "\"}' != ''
    THEN data#>>'{\"title\",\"" + language + "\"}'
    ELSE data#>>'{\"title\",\"en\"}'
    END AS title
    FROM mx_views_latest
    WHERE 
    data #>> '{\"source\",\"layerInfo\",\"name\"}' = '" + idSource +"'
    " + strMask + ")

  SELECT views_table.*, mx_users.email
  FROM views_table
  JOIN mx_users 
  ON views_table.editor = mx_users.id"

  out <- mxDbGetQuery(sql)

  return(out)

}

#' Get a view's project
#'
#' @param idView {Character} id of the view
#'
mxDbGetViewProject <- function(idView){
  mxDbGetQuery("
    SELECT project 
    FROM mx_views_latest 
    WHERE id='" + idView + "'")$project
}

#' Get a view's source
#'
#' @param idView {Character} id of the view
#'
mxDbGetViewMainSource <- function(idView){
  mxDbGetQuery("
    SELECT data#>>'{\"source\",\"layerInfo\",\"name\"}' id 
    FROM mx_views_latest 
    WHERE id='" + idView + "'")$id
}

#' Get a list of views title from set of views id
#'
#' @param idsViews Source (layer) id
#'
mxDbGetViewsTitle <- function(idsViews,asNamedList=TRUE,language="en", prefix=""){

  tableName <- "mx_views_latest"

  if(noDataCheck(idsViews)) return("")

  sql <- "
  SELECT 
  id,
  CASE
  WHEN data#>>'{\"title\",\"" + language + "\"}' != ''
  THEN data#>>'{\"title\",\"" + language + "\"}'
  ELSE data#>>'{\"title\",\"en\"}'
  END AS title
  FROM mx_views_latest
  WHERE id IN ('" + paste(idsViews,collapse="','") + "')
  ORDER BY title asc"

  out <- mxDbGetQuery(sql)
  if(!noDataCheck(prefix)){
     out$title = paste(prefix, out$title)
  }

  if(asNamedList){
    titles <- out$title
    out <- as.list(out$id)
    names(out)<-titles
  }

  return(out)

}

