

#' Clean query string : remove unwanted characters, like quote or parenthesis
#' 
#' @param query {Character} query string
#' @return cleaned string
cleanQueryString <- function(query){
  out <- ""
  tryCatch({
    query <- httpuv:::decodeURIComponent(query)
    out <- gsub('[^a-zA-Z0-9\\-_&*?,=+/ ]*',"",query,perl=T)
  },error=function(cond){warning(cond)})
  return(out)
}

mxParseQuery <- function(urlSearch){
  #
  # Retrieve query value. Used in project and fetch view server files.
  #
  query <- parseQueryString(cleanQueryString(urlSearch))


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

  if(!noDataCheck(query$noViews)){
     query$noViews <- isTRUE(tolower(query$noViews) == "true")
  }else{
    query$noViews <- FALSE
  }

  #
  # Fetch only those views
  #
  if(!noDataCheck(query$views)){
    query$views <- unlist(strsplit(query$views,","))
  }

  #
  # Collections selection
  #
  if(!noDataCheck(query$collections)){
    query$collections <- unlist(strsplit(query$collections,","))
    #
    # Select method : ANY or ALL
    #
    query$collectionsSelectOperator <- query$collectionsSelectOperator
  }

  #
  # Use this style instead of the dafault style
  #
  if(!noDataCheck(query$style)){
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
