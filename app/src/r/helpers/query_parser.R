

#' Clean query string : remove unwanted characters, like quote or parenthesis
#' 
#' @param query {Character} query string
#' @return cleaned string
cleanQueryString <- function(query){
    lapply(query,unlist)
}

mxParseQuery <- function(urlSearch){
  #
  # Retrieve query value. Used in project and fetch view server files.
  #
  query <- cleanQueryString(urlSearch)

  #
  # Parse role for project list modal
  #
  query$showProjectsListByRole <-  mxQueryRoleParser(query$showProjectsListByRole)

  #
  # Parse project title for project list modal
  #
  query$showProjectsListByTitle <-  mxQueryTitleParser(query$showProjectsListByTitle)

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
  } 

  #
  # Lock project : user will not be able to change project is set to true
  #
  if(!noDataCheck(query$lockProject)){
    query$lockProject <- isTRUE(tolower(query$lockProject) == "true")
  }

  #
  # Set the project
  #
  if(!noDataCheck(query$project)){
    query$project <- toupper(query$project)
  }

  #
  # Validate language
  #

  if(!noDataCheck(query$language)){
    languages <- .get(config,c('languages','codes'))
    if( ! query$language %in% languages ){
       query$language <- NULL
    }
  }

  #
  # Use this style instead of the dafault style
  #
  if(!noDataCheck(query$style)){
    lStyle <- nchar(query$style)
    lastTwo <- substr(query$style,lStyle-1,lStyle) == "=="
    eqAdd <- ifelse(lastTwo,'','==')
    query$style <- jsonlite::fromJSON(mxDecode(query$style+eqAdd))
  }else{
    query$style <- .get(config,c("ui","colors","default"))
  }

  #
  # Story map auto start
  #
  query$storyAutoStart = isTRUE(tolower(query$storyAutoStart) == "true")

  return(query)
}
