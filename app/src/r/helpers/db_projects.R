



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
  isLengthOk <- isTRUE(nchar(alias) > 0 && nchar(alias) <= 30)
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
  idsAdditionalProjects = NULL,
  token = NULL
  ){

  route <- .get(config,c('api','routes','getProjectsListByUser'))

  res <- mxApiFetch(route,
    list(
      role = whereUserRoleIs,
      title = whereTitleMatch,
      idUser = id,
      token = token,
      language = language
      ),
    asDataFrame = asDataFrame
  )

  if(isTRUE(asNamedList)){
    out <- unlist(lapply(res,`[[`, 'id'))
    names(out) <- unlist(lapply(res,`[[`, 'title'))
    res <- out
  }

  return(res)

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
  
  if(noDataCheck(res)){
    return(out)
  }

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

  if(noDataCheck(projectData)) {
    return(list())
  }

  for(i in 1:length(projectData)){
     p <- projectData[i]
     n <- names(p)
     if( n %in% c("title","description","admins","members","publishers","contacts","map_position","countries","states_views")){
       val = p[[1]]
       if(!noDataCheck(val)){
         projectData[[i]] <- fromJSON(val,simplifyDataFrame=FALSE)
       }
     }
  }
  
  return(projectData)
}

#' Get contact email of a project, with fallback to admin email
#'
#' @param project {Character} Id of the project
#' @return {Character} email of contact with admin fallback 
mxDbGetProjectEmailContact <- function(idProject){
    projectData <- mxDbGetProjectData(idProject)
    projectAdmin <- projectData$admins
    projectContact <- projectData$contacts
    emailContact <- NULL
    if( !noDataCheck(projectContact) ){
      nContacts <- length(projectContact)
      if( nContacts > 1 ) projectContact <- projectContact[ceiling(runif(1)*nContacts)]
      emailContact <- mxDbGetEmailListFromId(projectContact)
    }else{
      nAdmins <- length(projectAdmin)
      if( nAdmins>1 ) projectAdmin <- projectAdmin[ceiling(runif(1)*nAdmins)]
      emailContact <- mxDbGetEmailListFromId(projectAdmin)
    }
  return(emailContact)
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
    isNotNull <- isTRUE(!is.null(x))
    if(!isNotNull){
      hasChanged <<- TRUE
    }
    return(isNotNull)
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
    toUpdate <- notNull(value)
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
    toUpdate <- notNull(value) 
    if(toUpdate){
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
    toUpdate <- notNull(value)
    if(toUpdate){
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

  title <- gsub("'","''",title)
  title <- gsub("\"","\\\"",title)
  title <- gsub(";","\\;",title)

  projectsTable <- .get(config,c("pg","tables","projects"))
  languages <- .get(config,c("languages","codes"))
  language <- paste(
    sprintf(
      "lower(title #>> '{%1$s}') = lower('%2$s')",
      languages,
      title
      ),collapse=" OR "
  )

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

  idExists <- isTRUE(mxDbGetQuery(sprintf("select count(*) from mx_projects where id='%1$s'",idProject))$count == 1)
  
  if(idExists){
    return(idProject)
  }else{
    return(idDefault)
  }

}



mxProjectSendEmailsRolesChange <- function(admins, res, project, lang){
  # res = 
  #$new_contacts
  #[1] "frederic.moser@unepgrid.ch"

  #$rem_admins
  #[1] "antonio.benvenuti@unepgrid.ch"

  #$rem_contacts
  #[1] "antonio.benvenuti@unepgrid.ch"

  dfStacked <- stack(res)
  listSplited <- split(dfStacked$ind,dfStacked$values)
  urlProject <- mxGetProjectUrl(project) 
  idGroupNotify <- randomString('role_change')
  #
  # For each users email, compile changes
  #
  for(email in names(listSplited)){
    languageUser <- mxDbGetUserLanguage(email)
    projectTitle <- mxDbGetProjectTitle(project,languageUser)
    changes <- as.character(listSplited[[email]])
    changesList <- mxProjectRoleChangesToList(changes,languageUser)
    #
    # Changes notice template
    #
    notice <- mxParseTemplateDict(
      'roles_updated_mail_content',
      languageUser,
      config = list(
        txtRoleChange = changesList,
        projectLink = tags$a(href=urlProject,projectTitle)
      )
    )
    #
    # If the notice content is not empty nd
    # email is valid, compose the message
    #
    isValid = !noDataCheck(notice) && mxEmailIsValid(email)
    if(isValid){
      title <-  d('roles_updated_mail_title', lang)
      subject <- mxParseTemplateDict(
        'roles_updated_mail_subject',
        languageUser,
        list(
          nameProject = projectTitle 
        )
      )

      mxSendMail(
        to = email,
        content = notice,
        title = title,
        subject = subject,
        subtitle = subject,
        language = lang,
        idGroupNotify = idGroupNotify
      )

    }
  }
  #
  # Summary for all admins
  #
  listChangesSummary <- listToHtmlSimple(lapply(res,listToHtmlSimple))
  emailAdmins <- unique(mxDbGetEmailListFromId(admins));

  for(email in emailAdmins){
    
    languageAdmin <- mxDbGetUserLanguage(email)
    projectTitle <- mxDbGetProjectTitle(project,languageAdmin)
    title <-  d('roles_updated_mail_title', lang)
    subject <- mxParseTemplateDict(
      'roles_updated_mail_subject',
      languageUser,
      list(
        nameProject = projectTitle 
      )
    )
    notice <- mxParseTemplateDict(
      'roles_updated_mail_content_admin_summary',
      languageAdmin,
      config = list(
        changes = listChangesSummary,
        projectLink = tags$a(href=urlProject,projectTitle)
      )
    )

    mxSendMail(
      to = email,
      content = notice,
      title = title,
      subject = subject,
      subtitle = subject,
      language = languageAdmin,
      idGroupNotify = idGroupNotify
    )

      mailSent <- TRUE
  }
}

#' Add user to a project
#'
#' @param idProject {Character} Project id
#' @param idProject {Character} User id
#' @param roles {Character} Role group name : members, admins, publishers
#' @param useNotify {Logical} Report in notification center
#' @return done
mxDbProjectAddUser <- function(idProject,idUser, roles=c('members'), useNotify=TRUE){
  projectData <- mxDbGetProjectData(idProject)
 
  emailUser <- mxDbGetEmailFromId(idUser)
  isKnown <- mxDbEmailIsKnown(emailUser)
  idGroupNotify <- "added_user"
  added <- FALSE
  urlProject <- mxGetProjectUrl(idProject) 
  if(noDataCheck(projectData)){
    stop("Can't add user to project : no project data")
  }

  if(!isKnown){
    stop("Can't add to project : user not known")
  }

  #
  # Update roles in DB
  #
  for(role in roles){
    hasRole = idUser %in% projectData[[role]]
    if(!hasRole){
      members <- unique(c(projectData[[role]],idUser))
      added <- TRUE
      mxDbUpdate(
        table = "mx_projects",
        idCol = 'id',
        id = idProject,
        column = role,
        value = as.list(members) 
      )
    }
  }

  if(added){
    #
    # Inform user
    #
    languageUser <- mxDbGetUserLanguage(emailUser)
    projectTitle <- mxDbGetProjectTitle(idProject,languageUser)
    subjectEmail <- mxParseTemplateDict("project_user_added_email_user_subject",languageUser,list(
        project = projectTitle
        ))
    txtEmailUser <- mxParseTemplateDict('project_user_added_email_user',languageUser,list(
        project = tags$a(href=urlProject,projectTitle),
        roles = paste(roles,collapse=", ")
        ))
    mxSendMail(
      to = emailUser,
      content = txtEmailUser,
      subject = subjectEmail,
      language = languageUser,
      useNotify = useNotify,
      idGroup = idGroupNotify
    )
    #
    # Inform admins
    #
    admins <- projectData$admins
    for(idAdmin in admins){
      emailAdmin <- mxDbGetEmailFromId(idAdmin)
      languageAdmin <- mxDbGetUserLanguage(emailAdmin)
      projectTitle <- mxDbGetProjectTitle(idProject,languageAdmin)
      subjectEmail <- mxParseTemplateDict("project_user_added_email_admin_subject",
        lang = languageAdmin,   
        config = list(
          project = projectTitle
          ))
      txtEmailAdmin <- mxParseTemplateDict('project_user_added_email_admin',
        lang = languageAdmin,
        config = list(
          project = tags$a(href=urlProject,projectTitle),
          emailUser = emailUser,
          roles = paste(roles,collapse=", ")
          ))
      mxSendMail(
        to = emailAdmin,
        content = txtEmailAdmin,
        subject = subjectEmail,
        language = languageAdmin,
        useNotify = useNotify,
        idGroup = idGroupNotify
      )
    }

  }

  return(added)
}


#' Convert key_value role change (new_publishers, new_contact, ...) to notice role text "Addd to 'publishers'"
#' @param changes {Character} key as new_publishers, ...
#' @param lang {Character} Language
#' @param asHTML {Logical} Output an html list
#' @return notice role as text
mxProjectRoleChangesToList <- function(changes,lang,asHTML=TRUE){
  removed <- c()
  added <- c()
  out <- c()

  for( key in changes ){
    splited <- strsplit(key,'_')[[1]]
    if(splited[[1]]=="rem"){
      removed <- c(removed,d(splited[[2]],lang))
    }
    if(splited[[1]]=="new"){
      added <- c(added,d(splited[[2]],lang))
    }
  }

  if(length(removed)>0){
    #
    # `removed from groups : g1, g2`
    #
    out <- c(out, mxParseTemplateDict(
        'removed_from_group',
        lang,
        list(
          group = paste(removed,collapse=", ")
        )
      )
    )
  }
  if(length(added)>0){
    #
    # `added to groups : g1, g2`
    #
    out <- c(out, mxParseTemplateDict(
        'added_to_group',
        lang,
        list(
          group = paste(added,collapse=", ")
        )
    )
    )
  }
  #
  # Build HTML list if needed
  #
  if(asHTML){
    out <- tags$ul(
      sapply(out,tags$li,simplify=F)
    )
  }

  return(out)
}



