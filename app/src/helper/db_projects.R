



#' Get the project id using old id (iso3 country code) 
#' @param id {character} Project id
#' @return id {character} new id
mxDbGetProjectIdByOldId <- function(id){
  out <-  mxDbGetQuery("select id from mx_projects where id_old ='"+ id +"'" )$id
  if(noDataCheck(out)) return(id)
  return(out)
}




#' Get project title using id and language
#' @param id {Character} project id
#' @param language {Character} language default="en"
#' @return {Character} title
mxDbGetProjectTitle <- function(id,language="en"){
  quer <- "WITH 
  project_title as (
    SELECT 
      title->>'" + language +"' as title_lang, 
      title->>'en' as title_en
    FROM mx_projects
    WHERE id = '" + id + "'
    )

  SELECT 
  CASE 
  WHEN coalesce(TRIM(title_lang), '') = ''
  THEN
    title_en
  ELSE
    title_lang
  END as title
  FROM project_title"

  title <- mxDbGetQuery(quer)$title

  if(noDataCheck(title)) title <- id

  return(title)

}


#' Get external views shared  in the project
#' @param {Character} idProject Id of the project
#' @return {List} List of views id
mxDbProjectGetViewsExternal <- function(idProject){
  out <- list()

  views <- mxDbGetQuery("
    SELECT views_external v
    FROM mx_projects
    WHERE id = '" + idProject + "'"
    )$v

  if(!noDataCheck(views)) out <- as.list(fromJSON(views))

  return(out)

}

#' Does the view exists in project ?
#' @param {Character} idView Id of the view
#' @param {Character} idProject Id of the project
#' @return {Boolean} Does the view exits
mxDbGetProjectExistsExternalView <- function(idView,idProject){
  mxDbGetQuery("
    SELECT EXISTS ( 
      SELECT id 
      FROM mx_views_latest
      WHERE 
      (
        id = '" + idView + "'
        AND project = '" + idProject + "'
      ) OR (
        id = '" + idView + "'
        AND data #>'{\"projects\"}' @> '\"" + idProject + "\"'
      )) e"
    )$e
}


#' Add or remove an external view to a project
#' @param {Character} idProject Id of the project
#' @param {Character} idView Id of the view
#' @return NULL 
mxDbProjectSetViewExternal <- function(idProject,idView,action="add"){

  idView <- as.character(idView)
  idProject <- as.character(idProject)
  
  viewsImported <- mxDbProjectGetViewsExternal(idProject)
  viewExistsInProject <- mxDbGetProjectExistsExternalView(idView,idProject)

  hasView <- isTRUE(idView %in% viewsImported) || isTRUE(viewExistsInProject)

  if( action == "add" && hasView ) return()
  if( action == "remove" && !hasView ) return()

  if( action == "add" ){ 
    viewsImported <- c(viewsImported,idView)
  }else{
    viewsImported[viewsImported %in% idView] <- NULL
  }

  mxDbUpdate(
    table = "mx_projects",
    idCol = "id",
    id = idProject,
    column = "views_external",
    value = as.list(viewsImported),
    expectedRowsAffected = 1 
    )

}


#' Return a table of project by user id
#' @param {Integer} id User id
#' @param {Character} language Language code
#' @return {List} List with items: 
#' id, 
#' title,
#' description
mxDbGetProjectListByUser <- function(id,whereUserRoleIs="any",whereTitleMatch=NULL,language="en",asNamedList=FALSE,asDataFrame=FALSE){

  if(noDataCheck(language)) language <-"en"

  filterTitleOperator <- ifelse(isTRUE(grepl("\\*$",whereTitleMatch)),' ~ ',' = ')
  cleanTitle <- tolower(subPunct(whereTitleMatch," "))
  filterTitle <- " lower(title_en) " + filterTitleOperator + "'" + cleanTitle + "'"
  filterRole <- whereUserRoleIs

  if( !isTRUE(filterRole %in% c("member","publisher","admin"))) filterRole = "public OR member OR publisher OR admin"

  filter <- filterRole

  if(!noDataCheck(whereTitleMatch)){
    filter <- "(" + filterTitle + ") AND " +  "(" + filterRole + ")"
  }
 
  quer <- "WITH project_roles as (
  SELECT 
  id,
  title->>'" + language +"' as title_lang, 
  title->>'en' as title_en,
  description->>'" + language +"' as description_lang, 
  description->>'en' as description_en,
  public, 
  members @> '[" + id +"]' as _member,
  publishers @> '[" + id +"]' as _publisher,
  admins @> '[" + id +"]' as _admin from mx_projects
  ),
project_cleaned as (
  SELECT 
  id,
  CASE 
  WHEN coalesce(TRIM(title_lang), '') = ''
  THEN
  title_en
  ELSE
  title_lang
  END as title,
  title_en,
  CASE 
  WHEN coalesce(TRIM(description_lang), '') = ''
  THEN
  description_en
  ELSE
  description_lang
  END as description,
  public,
  _member OR _publisher OR _admin AS member,
  _publisher OR _admin AS publisher,
  _admin AS admin
  FROM project_roles
  ORDER BY admin DESC,publisher DESC,member DESC, title ASC
  )

SELECT * from project_cleaned WHERE " + filter

res <- mxDbGetQuery(quer)

if(isTRUE(asDataFrame)){
  out <- res
}else if(isTRUE(asNamedList)){
  out <- as.list(res$id)
  names(out) <- res$title
}else{
  out <- as.list(res)
}

return(out)

}

#' Check user right on a project
#' @param {Integer} id User id
#' @return {list} member {Boolean}, read {Boolean}, publisher {Booelan}, admin {Boolean}
mxDbGetProjectUserRoles <- function(idUser,idProject){

  out = list(
    read = FALSE,
    publish = FALSE,
    admin = FALSE,
    groups = list()
    )

  quer = "
  WITH ROLES AS (
    SELECT
    members @> '[" + idUser +"]' as member,
    publishers @> '[" + idUser +"]' as publisher,
    admins  @> '[" + idUser +"]'  as admin,
    public
    FROM mx_projects
    WHERE id='" + idProject + "' OR id_old='"+ idProject +"'
    )
  SELECT 
  public OR member OR publisher OR admin as public,
  member OR publisher OR admin as member,
  publisher OR admin as publisher,
  admin as admin
  FROM ROLES;
  "

  res <- mxDbGetQuery(quer)
  #
  # If no records, return default
  #
  if(nrow(res) == 0) return(out)

  #
  # Build groups names
  #
  out <- as.list(res[1,])
  groups = list()

  if(isTRUE(res$public)) groups = c(groups,"public")
  if(isTRUE(res$member)) groups = c(groups,"members")
  if(isTRUE(res$publisher)) groups = c(groups,"publishers")
  if(isTRUE(res$admin)) groups = c(groups,"admins")

  out$groups <- groups

  return(out)

}



#' Retrieve project data
#' @param {String} project Project id
#' @return raw list of data
mxDbGetProjectData <- function(idProject){
  projectData <- as.list(mxDbGetQuery("SELECT * from mx_projects where id='" + idProject + "' OR id_old='"+ idProject +"'")[1,])

  if(noDataCheck(projectData)) stop("Project not found")

  for(i in 1:length(projectData)){
     p <- projectData[i]
     n <- names(p)
     if( n %in% c("title","description","admins","members","publishers","map_position","countries")){
       projectData[[i]] <- fromJSON(p[[1]],simplifyDataFrame=FALSE)
     }
  }
  
  return(projectData)
}

mxDbSaveProjectData <- function(project,values = list(
    public = NULL,
    active = NULL,
    title = NULL,
    description = NULL,
    admins = NULL,
    members = NULL,
    publishers = NULL,
    map_position = NULL,
    countries = NULL,
    creator = NULL
    )
  ){

  hasChanged <- FALSE
  notNull <- function(x){
    out <- isTRUE(!is.null(x))
    if(out) hasChanged <- TRUE
    return(out)
  }

  for( n in c("title","description","admins","members","publishers","map_position","countries")){
    v <- values[[n]]
    if(notNull(v)){
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = n,
        value = as.list(v)
        )
    }
  }

  for( n in c("public","active")){
    v <- values[[n]]
    if(notNull(v)){ 
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = n,
        value = isTRUE(v)
        )
    }
  }

  for( n in c("creator")){
    v <- values[[n]]
    if(notNull(v)){
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = project,
        column = n,
        value = as.integer(v)
        )
    }
  }

  if(hasChanged){
    mxDbUpdate(
      table = "mx_projects",
      idCol = 'id',
      id = project,
      column = "date_modified",
      value = Sys.time()
      )
  }else{
    mxDebugMsg("The project values have not been updated")
  }
}


#' Get members id and email from project
#' @param idProject {Character} Id of the project
#' @param idSkip {Vector} Ids to ignore
#' @return {list} named list of groups (members,publishers and admins) containing named list (email) of users ids.
mxDbGetProjectMembers <- function(idProject){

  members <- mxDbGetQuery("SELECT json_build_object(
    'members', members,
    'publishers', publishers,
    'admins', admins
    ) as members from mx_projects where id='" + idProject + "'")

  members <- fromJSON(members$members) 


  sapply(c("members","publishers","admins"),function(m){
    group <- as.list(members[[m]])
    if(!noDataCheck(group)){
      group[sapply(group,is.character)] <- NULL 
      names(group) <- sapply(group,mxDbGetEmailFromId)
      group <- group[order(names(group))]
    }
    members[[m]] <<- group
  })

  return(members)

}

#' Get project public status
#' @param idProject {Character} Id of the project
#' @return {Boolean} project public status.
mxDbGetProjectIsPublic <- function(idProject){
  isTRUE(mxDbGetQuery("SELECT public FROM mx_projects where id='" + idProject + "'")$public)
}

#' Check if project title exists
#' @param {Character} title Project title to check
#' @export
mxDbProjectTitleExists <- function(title,ignore=NULL,languages=NULL){

  if(noDataCheck(title)) return(FALSE)
  if(noDataCheck(ignore)) ignore = ""
  projectsTable <- .get(config,c("pg","tables","projects"))
  languages <- .get(config,c("languages","list"))
  language <- paste(sprintf("title@>'{\"%1$s\":\"%2$s\"}' IS TRUE",languages,title),collapse=" OR ")

  sql <- sprintf("
    SELECT EXISTS(
      SELECT id FROM \"%1$s\" t1 
      WHERE (%2$s) 
      AND id != '%3$s'
      );",
    projectsTable,
    language,
    ignore
    )

  res <- mxDbGetQuery(sql)

  return(isTRUE(res$exists))
}

#' Test id project id exists, else take the default
#' @param idProject {Character} Id of the project
#' @return {Character} Id of the project or default
mxDbProjectCheck <- function(idProject,idDefault=config[[c("project","default")]]){

  idExists <- isTRUE(mxDbGetQuery("select count(id) from mx_projects where id='"+idProject+ "'")$count == 1)
  if(idExists) return(idProject)

  return(idDefault)
}



#mxDbGetUserProjectsTableHtmlJoin <- function(idUser,role="any",language="en"){

  #tbl <- mxDbGetProjectListByUser(idUser,role,asDataFrame=TRUE,language=language)

  #badge = function(role){
    #label <- substr(d(role,language),1,1)
  #"<span class='mx-badge-role hint--bottom-right' aria-label='"+role+"'>"+label+"</span>"
  #}

  #joinLink <- function(id){
    #return("<a href='#' onclick=mx.helpers.triggerJoinProject('" + id + "')>"+d("btn_join_project",language)+"</a>")
  #}

  #tbl$roles <- ""
  #tbl[tbl$member,c("roles")] <- tbl[tbl$member,c("roles")] + badge("member")
  #tbl[tbl$publisher,c("roles")] <- tbl[tbl$publisher,c("roles")] + badge("publisher")
  #tbl[tbl$admin,c("roles")] <- tbl[tbl$admin,c("roles")] + badge("admin")

  #noRoles <- !(tbl$member | tbl$admin | tbl$publisher)
 
  #tbl$join <- ""

  #if(any(noRoles)){
    #tbl[noRoles,'join'] <- sprintf("%s %s",tbl[noRoles,c("join")],vapply(tbl[noRoles,]$id,joinLink,""))
  #}
  
  #tbl$title <- sprintf("<h5>
    #<a href='#' onclick=mx.helpers.setProject('%1$s',true)>%2$s</a>
    #</h5>
    #<p class='mx-project-description'>%3$s</p>"
    #,tbl$id
    #,tbl$title
    #,tbl$description
    #)

  #tbl <- tbl[,c("title","roles","join")]

  #names(tbl) <- c(d("title",language),d("roles",language),d("join_project",language))

  #mxTableToHtml(tbl,class="mx-table-roles",classContainer="mx-table-roles-container")
#}













