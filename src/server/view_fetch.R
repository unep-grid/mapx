

#
# Reactive views. Used in fetch and edit
#
reactViews <- reactive({

  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userRole <- reactUser$role
  userData <- reactUser$data
  country <- reactData$country

  hasRole <- !noDataCheck(userRole)
  hasData <- !noDataCheck(userData)
  hasCountry <- !noDataCheck(country)

  viewsId <- query$views
  collections <- query$collections
  
  if( !hasRole || !hasData || !hasCountry ) return()

  query$views <<- NULL
  #query$collections <<- NULL

  out <-  mxDbGetViews(
    views = viewsId, 
    collections = collections,
    project = country,
    read = userRole$read,
    edit = userRole$edit,
    userId = userData$id,
    from = 0,
    to = 1000
    )

  return(out)
})

#
# After role, data or country update, send updated views list
#
observe({
  userRole <- reactUser$role
  userData <- reactUser$data
  country <- reactData$country

  hasRole <- !noDataCheck(userRole)
  hasData <- !noDataCheck(userData)
  hasCountry <- !noDataCheck(country)
  
  update <- reactData$updateViewList

  hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[["map"]][["id"]]) ]])

  isolate({

    
    views <- reactViews()

  if( !hasRole || !hasData || !hasCountry || !hasMap ) return()
  
  mxDebugMsg("Send and render views list")

  mglSetSourcesFromViews(
      id = config[["map"]][["id"]],
      viewsList = views,
      render = FALSE,
      country = country
      )
  })
  
})



