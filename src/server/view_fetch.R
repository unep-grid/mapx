

#
# Reactive views. Used in fetch and edit
#
#reactViews <- reactive({

  #timer <- mxTimeDiff("Fetching view")
  
  ##
  ## Ivalidated by :
  ##
  #update <- reactData$updateViewList
  #updateFetchOnly <- reactData$updateViewListFetchOnly
  #userData <- reactUser$data
  #country <- reactData$country
  #language <- reactData$language

  ##
  ## Get user role
  ##
  #userRole <- getUserRole()

  ##
  ## Value from request
  ##
  #viewsId <- query$views
  #collections <- query$collections

  ##
  ## don't use requested views twice
  ##
  #query$views <<- NULL
  
  ##
  ## Set logic
  ##
  #hasRole <- !noDataCheck(userRole)

  #if( !hasRole ) return()

  #out <-  mxDbGetViews(
    #views = viewsId, 
    #collections = collections,
    #project = country,
    #read = userRole$read,
    #edit = userRole$edit,
    #userId = userData$id,
    #from = 0,
    #to = 1000
    #)

  #out <-  mxDbGetViews(
    #views = viewsId, 
    #collections = collections,
    #project = country,
    #read = userRole$read,
    #edit = userRole$edit,
    #userId = userData$id,
    #language = language,
    #keys = c("id","country","_edit","_title"),
    #allCountry = TRUE
    #)

  #mxTimeDiff(timer)
  #return(out)
#})

reactViewsCompact <- reactive({

  timer <- mxTimeDiff("Fetching view")
  
  #
  # Ivalidated by :
  #
  update <- reactData$updateViewList
  updateFetchOnly <- reactData$updateViewListFetchOnly
  userData <- reactUser$data
  country <- reactData$country
  language <- reactData$language

  #
  # Get user role
  #
  userRole <- getUserRole()

  #
  # Value from request
  #
  viewsId <- query$views
  collections <- query$collections

  #
  # don't use requested views twice
  #
  query$views <<- NULL
  
  #
  # Set logic
  #
  hasRole <- !noDataCheck(userRole)

  if( !hasRole ) return()

  out <-  mxDbGetViews(
    views = viewsId, 
    collections = collections,
    project = country,
    read = userRole$read,
    edit = userRole$edit,
    userId = userData$id,
    language = language,
    keys = c("id","country","_edit","_title")
    )

  mxTimeDiff(timer)
  return(out)
})
#
# After country change, send new set of views (initial set of views send when map init)
#
observe({

  country <- reactData$country
  userData <- reactUser$data

  isolate({

    mapIsReady <- isMapReady()
    role <- getUserRole()

    if(!mapIsReady) return()
    if(noDataCheck(role)) return()
    if(noDataCheck(country)) return()

    timer <- mxTimeDiff("Sending view")

    mglSetSourcesFromViews(
      id = .get(config,c("map","id")),
      viewsList = reactViewsCompact(),
      compact = TRUE,
      render = FALSE,
      country = country,
      )

    mxTimeDiff(timer)
  })
})



