#
# Context specific reactive values
#

reactUser <- reactiveValues()
reactData <- reactiveValues()


#
# Retrieve query value. Used in country and fetch view server files.
#
query <- parseQueryString(session$clientData$url_search)

if(!noDataCheck(query$views)){
  query$views <- unlist(strsplit(query$views,","))
}

if(!noDataCheck(query$collections)){
  query$collections <- unlist(strsplit(query$collections,","))
}
if(!noDataCheck(query$style)){
  query$style <- jsonlite::fromJSON(mxDecode(query$style))
}else{
  query$style <- .get(config,c("ui","colors","default"))
}


#
# Send templates
#
#mxSetTemplates(config[[c("templates","dot")]])

#
# Add ressource path for jed
#
#shiny::addResourcePath("jed",system.file("www", package="jed"))

#
# Set ressource path
#
mxSetResourcePath(.get(config,c("resources")))
