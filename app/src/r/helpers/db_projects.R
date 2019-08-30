



#' Get the project id using old id (iso3 country code) 
#' @param id {character} Project id
#' @return id {character} new id
mxDbGetProjectIdByOldId <- function(id){
  out <-  mxDbGetQuery("select id from mx_projects where id_old ='"+ id +"'" )$id
  if(noDataCheck(out)) return(id)
  return(out)
}

#' Validate project alias 
#' @param alias {character} Project alias
#' @param id{character} Project id
#' @return id {character} new id
mxDbValidateProjectAlias <- function(alias,id){
  if(noDataCheck(alias)) return(TRUE)
  if(noDataCheck(id)) return(FALSE)
  isProjectAliasValid <- isTRUE(grepl("^[a-z0-9\\_\\-]*$",alias,perl=T))
  isLengthOk <- isTRUE(nchar(alias) >= 5 && nchar(alias) <= 30)
  out <-  isLengthOk && isProjectAliasValid && mxDbGetQuery("SELECT count(*) FROM mx_projects WHERE id !='" + id + "' AND alias ='"+ alias +"'" )$count == 0
  return(isTRUE(out))
}

#' Get project id by alias (or id);
#' @param alias {character} Project alias
#' @return id {character} new id
mxDbGetProjectIdByAlias <- function(alias){
  out <- mxDbGetQuery("SELECT id FROM mx_projects WHERE alias ='"+ tolower(alias) +"'" )$id
if(noDataCheck(out)) return(alias)
  return(out)
}


#' Get project views list states
#' 
#' @param idProject {Character} id of the project
#' @return states {List} list of views list states
mxDbGetProjectStateKeys <- function(idProject, language='en'){

  tableKeys <- mxDbGetQuery(sprintf("
      WITH 
      state_list as (
        SELECT jsonb_array_elements(states_views) as states
        FROM mx_projects
        WHERE id = '%2$s'
        ),
      keys as (
        SELECT
        states #>> '{\"id\"}' as id,
        states #>> '{\"label\",\"en\"}' as label_en,
        states #>> '{\"label\",\"%1$s\"}' as label_lang
        FROM state_list
        )

      SELECT 
      id, 
      CASE WHEN label_lang IS NULL
        THEN 
          CASE WHEN label_en IS NULL 
            THEN
              id 
            ELSE
              label_en
          END
        ELSE 
          label_lang
      END as label
      FROM keys"
      , language
      , idProject
      )
    )

  if(noDataCheck(tableKeys)){
    tableKeys <- data.frame(id='default',label='Default')
  }

  keys <- as.list(tableKeys$id)
  names(keys) <- tableKeys$label

  return(keys)
}

#' Get project views list states keys
#' 
#' @param idProject {Character} id of the project
#' @return states {List} list of views list states keys
mxDbGetProjectStates <- function(idProject){

  states <- mxDbGetQuery(sprintf("
      SELECT states_views as state 
      FROM  mx_projects
      WHERE id = '%s'
      ", idProject))$state

      states <- fromJSON(states,simplifyDataFrame=FALSE)

      if(noDataCheck(states)){
        states = list(
          list(
            id = 'default',
            label = list(
              en = 'Default',
              fr = 'Défaut'
              ),
            state = list()
            )
          )
      }

      return(states)
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
mxDbGetProjectListByUser <- function(
  id,
  whereUserRoleIs = "any",
  whereTitleMatch = NULL,
  language = "en",
  asNamedList = FALSE,
  asDataFrame = FALSE,
  idsAdditionalProjects = NULL
  ){

  if(noDataCheck(language)) language <-"en"

  filterTitleOperator <- ifelse(isTRUE(grepl("\\*$",whereTitleMatch)),' ~ ',' = ')
  cleanTitle <- tolower(subPunct(whereTitleMatch," "))
  filterTitle <- " lower(title_en) " + filterTitleOperator + "'" + cleanTitle + "'"
  filterRole <- whereUserRoleIs

  if( !isTRUE(filterRole %in% c("member","publisher","admin"))) filterRole = "public OR member OR publisher OR admin"

  #
  # NOTE: "filter" for filter role will be boolean in the request. So 'WHERE publisher AND (title_en = "to remove")' is expected
  #
  filter <- filterRole

  if(!noDataCheck(whereTitleMatch)){
    filter <- "(" + filterTitle + ") AND " +  "(" + filterRole + ")"
  }


  if(!noDataCheck(idsAdditionalProjects)){
    filter <- sprintf(" %1$s OR  id in ('%2$s')",filter, paste(idsAdditionalProjects,collapse="','"))
  }

  quer <- "WITH project_roles as (
  SELECT 
  id,
  title->>'" + language +"' as title_lang, 
  title->>'en' as title_en,
  description->>'" + language +"' as description_lang, 
  description->>'en' as description_en,
  public, 
  allow_join,
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
  allow_join,
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


mxDbGetProjectsViewsCount <- function(idUser){
  sql <- "WITH user_projects as(
  SELECT
  id,
  id_old,
  to_jsonb(id::text) as _id,
  public as _public,
  members @> '[" + idUser +"]' as _member,
  publishers @> '[" + idUser +"]' as _publisher,
  admins @> '[" + idUser +"]' as _admin,
  coalesce(views_external,'[]'::jsonb) as _views_external
  FROM mx_projects
  WHERE
  public OR
  members @> '[" + idUser +"]' OR
  publishers @> '[" + idUser +"]' OR
  admins @> '[" + idUser +"]'
),
views_prep AS (
  SELECT
  id,
  project,
  coalesce(data -> 'projects','[]')::jsonb as _projects,
  to_jsonb(id::text) as _id,
  editor,
  readers,
  editors
  FROM
  mx_views_latest v
),
view_by_project AS (
  SELECT v.id id_view, p.id id_project
  FROM views_prep v, user_projects p
  WHERE
  ( v.project = p.id )
  AND (
    ( v.editor = " + idUser + ") OR
    (  v.editors @> '[" + idUser +"]' ) OR
    (  p._public AND v.readers @> '\"public\"') OR
    (  p._member AND v.readers @> '\"members\"') OR
    (  p._publisher AND v.readers @> '\"publishers\"') OR
    (  p._admin AND v.readers @> '\"admins\"') OR
    (  p._publisher AND v.editors @> '\"publishers\"') OR
    (  p._admin AND v.editors @> '\"admins\"')
  )
),
view_by_projects AS (
  SELECT v.id id_view, p.id id_project
  FROM views_prep v, user_projects p
  WHERE v._projects @> p._id
),
view_by_external AS (
  SELECT jsonb_array_elements(_views_external)::text id_view, p.id id_project
  FROM  user_projects p
),
combined as (
  SELECT * FROM view_by_project UNION
  SELECT * FROM view_by_projects UNION
  SELECT * FROM view_by_external
),
counted as (
 SELECT count(id_project), id_project id
 FROM combined
 GROUP BY id_project
)

SELECT * from counted"
mxDbGetQuery(sql)
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
    contacts  @> '[" + idUser +"]'  as contact,
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

#' Check if email is already member
#' @param {String} email email to test
#' @param {String} idProject Id of the project
#' @return {Boolean} If the email is already linked to a member of the project, return TRUE
mxDbProjectCheckEmailMembership <-function(email,idProject){
  out <- FALSE
  idUser <- mxDbGetIdFromEmail(email)
  if(!noDataCheck(idUser)){
    roles <- mxDbGetProjectUserRoles(idUser,idProject)
    if(isTRUE(roles$member)){
      out <- TRUE
    }
  } 
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
     if( n %in% c("title","description","admins","members","publishers","contacts","map_position","countries","states_views")){
       projectData[[i]] <- fromJSON(p[[1]],simplifyDataFrame=FALSE)
     }
  }
  
  return(projectData)
}

mxDbSaveProjectData <- function(idProject,values = list(
    public = NULL,
    active = NULL,
    title = NULL,
    alias = NULL,
    description = NULL,
    admins = NULL,
    members = NULL,
    publishers = NULL,
    map_position = NULL,
    countries = NULL,
    creator = NULL,
    allow_join = NULL,
    states_views = NULL
    )
  ){

  hasChanged <- FALSE
  notNull <- function(x){
    out <- isTRUE(!is.null(x))
    if(out) hasChanged <- TRUE
    return(out)
  }

  for( key in c("title","description","admins","members","publishers","map_position","countries","states_views")){
    value <- values[[key]]
    toUpdate <- notNull(value)

    if(toUpdate){
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = idProject,
        column = key,
        value = as.list(value)
        )
    }
  }

  for( key in c("public","active","allow_join")){
    value <- values[[key]]
    if(notNull(value)){ 
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = idProject,
        column = key,
        value = isTRUE(value)
        )
    }
  }

  for( key in c("creator")){
    value <- values[[key]]
    if(notNull(value)){
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = idProject,
        column = key,
        value = as.integer(value)
        )
    }
  }

  for( key in c("alias")){
    value <- values[[key]]
    if(notNull(value)){
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = idProject,
        column = key,
        value = as.character(value)
        )
    }
  }

  if(hasChanged){
    mxDbUpdate(
      table = "mx_projects",
      idCol = 'id',
      id = idProject,
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
    'members', members || publishers || admins,
    'publishers', publishers || admins,
    'admins', admins,
    'contacts', contacts
    ) as members from mx_projects where id='" + idProject + "'")

  members <- fromJSON(members$members) 

  sapply(c("members","publishers","admins","contacts"),function(m){
    group <- unique(as.list(members[[m]]))
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
  languages <- .get(config,c("languages","codes"))
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













