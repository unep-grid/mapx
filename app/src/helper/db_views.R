
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
mxDbGetViewsIdBySourceId <- function(idSource,language="en"){
 
  tableName <- "mx_views_latest"

  sql <- "
  WITH views_table AS (
    SELECT 
    " + tableName + ".editor,
    " + tableName + ".id, 
    " + tableName + ".data#>>'{\"attribute\",\"name\"}' as variable, 
    " + tableName + ".pid,
    " + tableName + ".project, 
    CASE
    WHEN data#>>'{\"title\",\"" + language + "\"}' != ''
    THEN data#>>'{\"title\",\"" + language + "\"}'
    ELSE data#>>'{\"title\",\"en\"}'
    END AS title
    FROM mx_views_latest
    WHERE 
      data#>>'{\"source\",\"layerInfo\",\"name\"}' = '" + idSource +"' OR
      data#>>'{\"source\",\"layerInfo\",\"maskName\"}' = '" + idSource +"'
    )

  SELECT views_table.*, mx_users.email
    FROM views_table
    JOIN mx_users 
    ON views_table.editor = mx_users.id"

  out <- mxDbGetQuery(sql)

  return(out)

}



#' @rdname mxDbGetViews
#' @param views {list|vector} Views id to fetch. Optional, replace any other logic
#' @param collections {list|vector} Collection(s) to fetch. Optional, add to selected views and replace any other logic
#' @param project {character} project code
#' @param allProjects {boolean} return data for all projects
#' @param rolesInProjects {list} Roles in project. Default = list(public=T,member=F,publisher=F,admin=F)
#' @param userId {integer} User id
#' @param id {character} Unique view id to fetch
#' @param from {integer} Position of the row to start with
#' @param to {integer} Position of the row to end with
#' @param keys {NULL|vector} Subset returned keys. If NULL, full dataset.
#' @param language {character} Default language for data #> '{"title",<language>}'
#' @param editMode {boolean} Avoid readOnly evaluation (when views is provided without collection, the readOnly mode is set). When TRUE, editability is evaluated according to `edit` targets parameter
#' @param countByProject {boolean} return count of view by project
#' @export 
mxDbGetViews <- function(
  views = NULL, 
  collections = NULL, 
  collectionsSelectOperator = "ANY",
  keys = NULL,
  project = .get(config,c("project","default")),
  allProjects = FALSE,
  allReaders = FALSE,
  rolesInProject = list( public = T, member = F,publisher = F, admin = F), 
  idUser = 96, 
  id = NULL, 
  from = 0, 
  to = 5, 
  language = "en", 
  editMode = FALSE,
  countByProject = FALSE
  ){

  # set role
  role = rolesInProject
  #  temp table name
  tableTempName= randomString("mx_query_views_")
  tableName = "mx_views_latest"
  #
  # Keep the same con for all request
  #
  pool <- mxDbAutoCon()
  con <- poolCheckout(pool)
  #
  #
  hasCollections <- !noDataCheck(collections)
  #
  # If views is provided, readonly is set
  #
  readOnly = ( !noDataCheck(views) && length(views) > 0 && hasCollections )

  filterRead ="false"
  filterEdit = "false"
  
  if(isTRUE(allReaders)){
   filterRead ="true"
   filterEdit = "false"
  }else{

    if(role$public){
      filterRead = " readers ?| array['public'] OR readers @> '[" + idUser + "]' "
      filterEdit = "(editors @> '[\"" + idUser +"\"]')"
    }

    if(role$member){
      filterRead = "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members'] OR readers @> '[\"" + idUser + "\"]'"
      filterEdit = "(editors @> '[\"" + idUser +"\"]')"
    }

    if(role$publisher){
      filterEdit = "(editor = " + idUser + " OR editors ?| array['publishers'] OR editors @> '[\"" + idUser +"\"]')"
      filterRead = "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members','publishers'] OR readers @> '[\"" + idUser +"\"]'"
    }

    if(role$admin){
      filterEdit = "(editor = " + idUser + " OR editors ?| array['publishers','admins'] OR editors @> '[\"" + idUser + "\"]')"
      filterRead = "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members','publishers','admins'] OR readers @> '[\"" + idUser + "\"]'"
    }
  }

  #
  # Catch and clean
  #
  tryCatch({

    if(hasCollections){
      collections <- paste(collections,collapse="','")
    }

    if(!noDataCheck(keys)){
      keys <- unique(c("id",keys))
      keys <- sprintf("\"%1$s\"",paste(keys,collapse="\",\""))
    }else{
      keys <- "*" 
    }


    queryMain = "
    CREATE TEMPORARY TABLE " + tableTempName + " AS (
      WITH filteredByRole as (
        SELECT *, views.data -> 'projects' as _projects, views.data -> 'collections' as _collections
        FROM " + tableName + " views
        WHERE "+ filterRead +"
        ),
      filteredByProject as (
        SELECT *
          FROM filteredByRole
        WHERE (
          ( " + allProjects +" ) OR
          ( project ='" + project + "' ) OR
          ( _projects ?| array['" + project + "'] )
          )
        )

      SELECT *, 
      CASE 
      WHEN 
      coalesce(data #>> '{\"title\",\"" + language + "\"}','') = ''
      THEN
        (
          CASE 
          WHEN 
           coalesce(data #>> '{\"title\",\"en\"}','') = ''
          THEN id
          ELSE
           data #>> '{\"title\",\"en\"}'
          END
        )
      ELSE
      data #>> '{\"title\",\"" + language + "\"}'
      END as _title,     
      ( 
        CASE WHEN
        (
          (
            NOT " + readOnly + "
            OR " + editMode + "
            )
          AND
          (
            project = '" + project + "' 
            )
          AND
          " + filterEdit + "
          ) THEN true 
        ELSE false
        END
        ) as _edit
      FROM filteredByProject
      )"

    mxDbGetQuery(queryMain,con=con)

    if(countByProject){

      querViews <- "
      SELECT count(*) count, project
      FROM " + tableTempName +" 
      GROUP BY project"

      resViews <- na.omit(mxDbGetQuery(querViews,con=con))

      return(list(
          countByProject = resViews
          #countGlobal = resGlobals
          ))

    }else{
      if(hasCollections){
      
        #
        # Set the operator for collection selection : ANY or ALL
        #
        op <- "?|"

        if( isTRUE(collectionsSelectOperator == "ALL") ){
          op <- "?&"
        }

        sql = "
        SELECT DISTINCT id 
        FROM " + tableTempName +" a
        WHERE _collections " + op + " array['" + collections + "']
        "

        views = c(
          views,
          mxDbGetQuery(sql,con=con)$id
          )
      }
      if(!noDataCheck(views) || hasCollections){

        views <- paste(paste0("'",views,"'"),collapse=",")
        #
        # Filtered list of record
        #
        q <- "
        SELECT json_agg(row_to_json(a)) res from 
        (
          SELECT " + keys + "
          FROM " + tableTempName + "
          ) a
        WHERE  a.id in ("+ views +")"

      } else {

        #
        # Full list of records
        #
        q <- "
        SELECT json_agg(row_to_json(a)) res from
        (
          SELECT " + keys + "
          FROM " + tableTempName + "
          ) a "
      }

      #time <- mxTimeDiff("Get view : query")
      res <- na.omit(mxDbGetQuery(q,con=con))
      
      #mxTimeDiff(time)
      #time <- mxTimeDiff("Get view : json to list")
      out <- mxJsonToList(res$res)
      #mxTimeDiff(time)

      return(out)
    }
  },finally = {
    mxDbGetQuery(sprintf("DROP TABLE %1$s",tableTempName),con=con)
    poolReturn(con)
  })
}


