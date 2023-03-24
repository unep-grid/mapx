

#' Clean query string : remove unwanted characters, like quote or parenthesis
#'
#' @param query {List} search query
#' @return cleaned string
cleanQueryString <- function(query) {
  fromJSON(toJSON(query, auto_unbox = T))
}

mxParseQuery <- function(urlSearch) {
  #
  # Retrieve query value. Used in project and fetch view server files.
  #
  query <- cleanQueryString(urlSearch)

  #
  # Parse role for project list modal
  #
  query$showProjectsListByRole <- mxQueryRoleParser(query$showProjectsListByRole)

  #
  # Parse project title for project list modal
  #
  query$showProjectsListByTitle <- mxQueryTitleParser(query$showProjectsListByTitle)

  #
  # Forced map position
  #
  query$lat <- as.numeric(query$lat)
  query$lng <- as.numeric(query$lng)
  if (isNotEmpty(query[["zoom"]])) {
    query$zoom <- as.numeric(query[["zoom"]])
  } else {
    query$zoom <- as.numeric(query[["z"]])
  }

  #
  # Query action
  #
  if (isNotEmpty(query$action)) {
    query$action <- mxDbDecrypt(query$action)
  }

  #
  # Set the project
  #
  if (isNotEmpty(query$project)) {
    query$project <- toupper(query$project)
  }

  #
  # Validate language
  #
  if (isNotEmpty(query$language)) {
    languages <- .get(config, c("languages", "codes"))
    if (!query$language %in% languages) {
      query$language <- NULL
    }
  }

  #
  # BOOLEAN : if "false", an empty list() is returned by Shiny.
  # -> use is.null instead of isNotEmpty
  #

  #
  # Lock project : user will not be able to change project is set to true
  #
  if (!is.null(query$lockProject)) {
    query$lockProject <- isTRUE(query$lockProject)
  }

  #
  # Story map auto start
  #
  if (!is.null(query$storyMapAutoStart)) {
    query$storyAutoStart <- isTRUE(query$storyAutoStart)
  }

  #
  # Use bounds as max bounds
  #
  if (!is.null(query$useMaxBounds)) {
    query$useMaxBounds <- isTRUE(query$useMaxBounds)
  }


  return(query)
}
