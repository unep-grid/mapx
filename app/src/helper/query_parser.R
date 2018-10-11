

#' Clean query string : remove unwanted characters, like quote or parenthesis
#' 
#' @param query {Character} query string
#' @return cleaned string
cleanQueryString <- function(query){
  out <- ""
  tryCatch({
    query <- httpuv:::decodeURIComponent(query)
    out <- gsub('[^a-zA-Z0-9\\-_&*?,=+/\\. ]*',"",query,perl=T)
  },error=function(cond){warning(cond)})
  return(out)
}

mxParseQuery <- function(urlSearch){
  #
  # Retrieve query value. Used in project and fetch view server files.
  #
  query <- parseQueryString(cleanQueryString(urlSearch))

  #
  # Parse role for project list modal
  #
  query$showProjectsListByRole <-  mxQueryRoleParser(query$showProjectsListByRole)
  if(!noDataCheck(query$showProjectsListByRole)){
    mxUpdateUrlParams(list(showProjectsListByRole=""))
  }

  #
  # Parse project title for project list modal
  #
  query$showProjectsListByTitle <-  mxQueryTitleParser(query$showProjectsListByTitle)
  if(!noDataCheck(query$showProjectsListByTitle)){
    mxUpdateUrlParams(list(showProjectsListByTitle=""))
  }


  #
  # Forced map position
  #
  query$lat  = as.numeric(query$lat)
  query$lng = as.numeric(query$lng)
  query$zoom = as.numeric(query$zoom)


  #
  # Query action
  #
  if(!noDataCheck(query$action)){
    query$action <- mxDbDecrypt(query$action)
    mxUpdateUrlParams(list(action=""))
  }

  #
  # maxRole 
  #
  if(!noDataCheck(query$filterViewsByRoleMax)){
    query$filterViewsByRoleMax <- mxQueryRoleParser(query$filterViewsByRoleMax)
    mxUpdateUrlParams(list(filterViewsByRoleMax=""))
  }

  #
  # Lock project : user will not be able to change project is set to true
  #
  if(!noDataCheck(query$lockProject)){
    query$lockProject <- isTRUE(tolower(query$lockProject) == "true")
  }

  if(!noDataCheck(query$noViews)){
     query$noViews <- isTRUE(tolower(query$noViews) == "true")
  }else{
    query$noViews <- FALSE
  }

  #
  # Set the project
  #
  if(!noDataCheck(query$project)){
    query$project <- mxDbProjectCheck(query$project)
    mxUpdateUrlParams(list(project=""))
  }

  #
  # Fetch only those views
  #
  if(!noDataCheck(query$views)){
    query$views <- unlist(strsplit(query$views,","))
    mxUpdateUrlParams(list(views=""))
  }

  #
  # Validate language
  #

  if(!noDataCheck(query$language)){
  
    languages <- .get(config,c('languages','list'))
    if( ! query$language %in% languages ){
       query$language <- NULL
    }
  
  }

  #
  # Collections selection
  #
  if(!noDataCheck(query$collections)){
    query$collections <- unlist(strsplit(query$collections,","))
    mxUpdateUrlParams(list(collections=""))
    #
    # Select method : ANY or ALL
    #
    query$collectionsSelectOperator <- query$collectionsSelectOperator
  }

  #
  # Use this style instead of the dafault style
  #
  if(!noDataCheck(query$style)){
    mxUpdateUrlParams(list(style=""))
    query$style <- jsonlite::fromJSON(mxDecode(query$style+"="))
  }else{
    query$style <- .get(config,c("ui","colors","default"))
  }

  #
  # Story map auto start
  #
  if(!noDataCheck(query$views) && length(query$views) == 1 && isTRUE(tolower(query$storyAutoStart) == "true")){
    query$kioskMode <- mxStoryAutoStart(
      idView = query$views,
      style = query$style,
      language = query$language 
      )
  }

  return(query)
}
