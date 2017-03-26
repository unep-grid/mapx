
#
# story map functions
#




#' Parse vimeo string 
#' @param text Story map text with @vimeo( id ; desc ) tag
#' @return html enabled version
#' @export
mxParseVimeo <- function(text){

  # remplacement string
  html <- tags$div(
  tags$iframe(
    src=sprintf("https://player.vimeo.com/video/%1$s?autoplay=0&color=ff0179",'\\1'),
    width="300",
    frameborder="0",
    webkitallowfullscreen="",
    mozallowfullscreen="",
    allowfullscreen=""
    ),
  span(style="font-size=10px",'\\2')
  )

  # regular expression
  expr <- "@vimeo\\(\\s*([ 0-9]+?)\\s+[;]+\\s*([ a-zA-Z0-9,._-]*?)\\s*\\)"

  # substitute
  gsub(
    expr,
    html,
    text
    )

}

#' Remove script tags from html string
#' @param text Text in which remove script tag
#' @return text
#' @export
mxParseRemoveScript <- function(text){
  # http://stackoverflow.com/questions/7130867/remove-script-tag-from-html-content
  gsub("<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>","",text,perl=T)
}

#' Parse view string
#' @param test Story map text with @view_start( name ; id ; extent ) ... @view_end tags
#' @return parsed html 
#' @export
mxParseView <- function(text){

  html <- tags$div(
    class="mx-story-section mx-story-dimmed",
    `mx-map-title`="\\1",
    `mx-map-id`="\\2",
    `mx-map-extent`="[\\3]",
    "\\4"
    )


 # regular expression
  expr <- "@view_start\\(\\s*([ a-zA-Z0-9,._-]*?)\\s*;+\\s*([ a-zA-Z0-9\\-]*?)\\s*[;]+\\s*([ 0-9,\\.\\-]+?)\\s*\\)(.*?)@view_end"
  
  # substitute
  gsub(
    "(lng):|(lat):|(zoom):",
    "",
    text
    ) %>%
  gsub(
    expr,
    html,
    .
    )
 
}

#' Parse story map : markdown, R, view and video
#' @param test Story map text
#' @return parsed html 
#' @export
mxParseStory <- function(txtorig){
  # txt <- knitr::knit2html(text=txtorig,quiet = TRUE, 
  #options=c(ifelse(toc,"toc",""),"base64_images","highlight_code","fragment_only")
  #) %>%
  # Parse knitr with options from markdownHTMLoptions()
  txt <-markdown::markdownToHTML(
    text=txtorig,
    options=c("base64_images","fragment_only","skip_style","safelink")
    )%>%
  mxParseView() %>%
  mxParseVimeo() %>%
  mxParseRemoveScript()
return(txt)

}


#' Get story map data
#' @param id Id of the story map to get
#' @return Story map content
#' @export
mxGetStoryMapData <- function(id){

  if(noDataCheck(id)) return()

  conf <- mxGetDefaultConfig()

  tblName <- conf[['pg']][['tables']][["stories"]]
  
  stopifnot(!is.null(tblName))

  res <- character(0)
  
  if(mxDbExistsTable(tblName)){
    q <- sprintf("SELECT content,target FROM %1$s WHERE \"id\"='%2$s'",
      tblName,
      id
      )

    storyData <- mxDbGetQuery(q)

    res <- list(
      content = jsonlite::fromJSON(storyData$content),
      target = jsonlite::fromJSON(storyData$target)
      )
  }

  return(res)
}
#' @export
mxGetStoryMapName <- function(){

  conf <- mxGetDefaultConfig()

  tblName <- conf[['pg']][['tables']][["stories"]]
  
  if(!mxDbExistsTable(tblName)) return(data.frame())
  q <- sprintf("SELECT name FROM %1$s WHERE \"archived\"='f'",tblName)
  res <- mxDbGetQuery(q) 
  return(res)
}



