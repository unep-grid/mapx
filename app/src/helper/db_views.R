
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
    " + tableName + ".readers@>'\"public\"' as is_public,
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
mxDbGetViewsTitle <- function(idsViews,asNamedList=TRUE,language="en"){

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

  if(asNamedList){
    titles <- out$title
    out <- as.list(out$id)
    names(out)<-titles
  }

  return(out)

}


mxDbGetViewsAllPublicProject <- function( idProject, includeType = c('vt','cc','rt') ){


  types = "('" + paste(includeType,collapse="','") + "')"


  idViewsProjects <- mxDbGetQuery("WITH

    views_external_project as (
      SELECT jsonb_array_elements_text(views_external) id_view
      FROM mx_projects
      WHERE id != '" + idProject +"' AND public = true
      ),

    views_external  as (
      SELECT id id_view 
      FROM mx_views_latest v, views_external_project ve
      WHERE type IN " + types +"
      AND v.id = ve.id_view
      ),

    projects_public  as ( 
      SELECT id id_project
      FROM mx_projects
      WHERE public = true
      AND id != '" + idProject +"' AND public = true
      ),

    views_projects as (
      SELECT id id_view, type, jsonb_array_elements_text(data #> '{\"projects\"}') id_project
      FROM mx_views_latest
      WHERE jsonb_typeof(data #> '{\"projects\"}') = 'array' 
      ),

    views_shared_public as (
      SELECT distinct v.id_view id_view
      FROM projects_public p, views_projects v
      WHERE v.id_project = p.id_project
      AND v.type IN " + types +"
      ),

    views_public as (
      SELECT distinct v.id id_view
      FROM projects_public p, mx_views_latest v 
      WHERE v.project = p.id_project
      AND v.type IN " + types +"
      AND v.readers @> '[\"public\"]'
      )


    select distinct id_view from views_public
    UNION
    select distinct id_view from views_shared_public
    UNION
    select distinct id_view from views_external
    ")

    return(idViewsProjects)

}





#' @rdname mxDbGetViews
#' @param views {list|vector} Views id to fetch. Optional, replace any other logic
#' @param collections {list|vector} Collection(s) to fetch. Optional, add to selected views and replace any other logic
#' @param project {character} project code
#' @param allProjects {boolean} return data for all projects
#' @param rolesInProjects {list} Roles in project. Default = list(public=T,member=F,publisher=F,admin=F)
#' @param filterViewsByRoleMax {character} Max role in project.
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
  filterViewsByRoleMax = "admin",
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
  # Views shared in the project
  #
  viewsExternal<- mxDbProjectGetViewsExternal(project)  
  hasViewsExternal <- !noDataCheck(viewsExternal)
  
  if(noDataCheck(filterViewsByRoleMax) || !isTRUE(typeof(filterViewsByRoleMax) == "character")){
    filterViewsByRoleMax <- "admin"
  }
  
  roleMax <- switch(filterViewsByRoleMax,
    "admin" = {
      list(
        "public"=TRUE,
        "member"=TRUE,
        "publisher"=TRUE,
        "admin"=TRUE 
        )
    },
    "publisher" = {
      list(
        "public"=TRUE,
        "member"=TRUE,
        "publisher"=TRUE,
        "admin"=FALSE 
        )
    },
    "member" = {
      list(
        "public"=TRUE,
        "member"=TRUE,
        "publisher"=FALSE,
        "admin"=FALSE
        )
    },
    "public" = {
      list(
        "public"=TRUE,
        "member"=FALSE,
        "publisher"=FALSE,
        "admin"=FALSE
        )
    },
    list(
      "public"=TRUE,
      "member"=TRUE,
      "publisher"=TRUE,
      "admin"=TRUE
      )
    )

  # If views is provided, readonly is set
  #
  readOnly = ( !noDataCheck(views) && length(views) > 0 && hasCollections )

  filterRead ="false"
  filterEdit = "false"
  
  if(isTRUE(allReaders)){
   filterRead ="true"
   filterEdit = "false"
  }else{

    if(roleMax$public && role$public){
      filterRead = " readers ?| array['public'] OR readers @> '[" + idUser + "]' "
      filterEdit = "(editors @> '[\"" + idUser +"\"]')"
    }

    if(roleMax$member && role$member){
      filterRead = "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members'] OR readers @> '[\"" + idUser + "\"]'"
      filterEdit = "(editors @> '[\"" + idUser +"\"]')"
    }

    if(roleMax$publisher && role$publisher){
      filterEdit = "(editor = " + idUser + " OR editors ?| array['publishers'] OR editors @> '[\"" + idUser +"\"]')"
      filterRead = "readers ?| array['public'] OR editor = " + idUser + " OR readers ?| array['members','publishers'] OR readers @> '[\"" + idUser +"\"]'"
    }

    if(roleMax$admin && role$admin){
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

    if(hasViewsExternal){
      filterViewsProject <- "OR id IN ('" + paste(viewsExternal,collapse="','") + "')"
    }else{
      filterViewsProject <- ""
    }

    if(!noDataCheck(keys)){
      keys <- unique(c("id",keys))
      keys <- sprintf("\"%1$s\"",paste(keys,collapse="\",\""))
    }else{
      keys <- "*" 
    }

    queryMain = "
    CREATE TEMPORARY TABLE " + tableTempName + " AS (
      /**
      * Filter By role
      */
      WITH filteredByRole as (
        SELECT *, views.data -> 'projects' as _projects, views.data -> 'collections' as _collections
        FROM " + tableName + " views
        WHERE (" + filterRead + ") OR  
        ( views.data -> 'projects' ?| array['" + project + "'] ) 
        " + filterViewsProject +"
        ),
      /**
      * Filter By project or all project
      */
      filteredByProject as (
        SELECT *
          FROM filteredByRole
        WHERE (
          ( " + allProjects +" ) OR
          ( project ='" + project + "' ) OR
          ( _projects ?| array['" + project + "'] )
          " + filterViewsProject + " 
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













