

mxGetGeoServerManager = function(){

  gMan <- .get(config,c("geoserver","manager"))

  if(noDataCheck(gMan)){
    gC <- config$geoserver

    gMan <- GSManager$new(
      url = gC$url,
      user = gC$user, 
      pwd = gC$password,
      logger = NULL 
      )

   .set(config, c("geoserver","manager"),gMan)

  }

return(gMan)
}


mxSaveGeoServerWorkspace = function(idProject){
  gMan <- mxGetGeoServerManager()
  if(noDataCheck(idProject)) return()
  res <- FALSE
  workspaces <- gMan$getWorkspaceNames()
  if( !idProject %in% workspaces ){
    res <- gMan$createWorkspace(idProject)
  }

  mxSaveGeoServerPostgisDatastore(idProject)
  return(res)
}


mxSaveGeoServerPostgisDatastore = function(idProject){
  gMan <- mxGetGeoServerManager()
  datastore <- mxGetGeoServerDatastoreName(idProject,'pg')
  datastores <- gMan$getDataStoreNames(idProject)
  
  ds <- NULL
  exists <- datastore %in% datastores

  if( !exists ){
    ds <- GSPostGISDataStore$new(
      dataStore=datastore, 
      description ='pg '+ idProject,
      enabled = TRUE
      )
    created <- gMan$createDataStore(idProject, ds)
  }else{
    ds <- gMan$getDataStore(idProject, datastore)
  }
 
  ds$setConnectionParameter('host',.get(config,c('pg','host')))
  ds$setConnectionParameter('user',.get(config,c('pg','read','user')))
  ds$setConnectionParameter('passwd',.get(config,c('pg','read','password')))
  ds$setConnectionParameter('database',.get(config,c('pg','dbname')))
  ds$setConnectionParameter('port',.get(config,c('pg','port')))
  ds$setConnectionParameter('schema','public')
  ds$setConnectionParameter('dbtype','postgis')

  if(exists){
    res <- gMan$updateDataStore(idProject, ds)
  }else{
    res <- gMan$createDataStore(idProject, ds)
  }
  return(res)
}

#' Default datastore name
#'
#'
mxGetGeoServerDatastoreName <- function(idProject,type='pg'){
     paste0(type,"-",idProject)
}

mxDeleteGeoServerWorkspace <- function(idProject){
  gMan <- mxGetGeoServerManager()
  workspaces <- gMan$getWorkspaceNames()
  res <- FALSE
  if( idProject %in% workspaces ){
    res <- gMan$deleteWorkspace(idProject,recurse=TRUE)
  }
  return(res)
}

mxPublishGeoServerView <- function(idView){
  gMan <- mxGetGeoServerManager()
  idProject <- mxDbGetViewProject(idView)
  idSource <- mxDbGetViewMainSource(idView)
  if(noDataCheck(idProject) || noDataCheck(idSource)) stop("mxPublishGeoServerView : source or project not found")
  dsName <- mxGetGeoServerDatastoreName(idProject,'pg')
  wsName <- idProject
  viewTitle <- mxDbGetViewsTitle(idView,asNamedList=F)$title
  bbox <- mxDbGetLayerExtent(idSource)

  #
  # If needed, unpublish
  #
  mxUnpublishGeoServerView(idView,idProject)

  #
  # Build feature type, whatever it is.
  #
  featureType <- GSFeatureType$new()
  featureType$setName(idView)
  featureType$setNativeName(idSource)
  featureType$setAbstract("abstract")
  featureType$setTitle(viewTitle)
  featureType$setSrs("EPSG:4326")
  featureType$setNativeCRS("EPSG:4326")
  featureType$setEnabled(TRUE)
  featureType$setProjectionPolicy("REPROJECT_TO_DECLARED")
  featureType$setLatLonBoundingBox(bbox$lng1,bbox$lat1,bbox$lng2,bbox$lat2, crs = "EPSG:4326")
  featureType$setNativeBoundingBox(bbox$lng1,bbox$lat1,bbox$lng2,bbox$lat2, crs = "EPSG:4326")

  md1 <- GSMetadataLink$new(
    type = "text/json",
    metadataType = "other",
    content = "/get/source/metadata/"+idSource 
    )

  featureType$addMetadataLink(md1)

  #create layer
  layer <- GSLayer$new()
  layer$setName(idView)
  layer$setDefaultStyle("generic")
  layer$addStyle("generic")

  #try to publish the complete layer (featuretype + layer)
  published <- gMan$publishLayer(wsName, dsName, featureType, layer)
  return(published)
}


mxUnpublishGeoServerView <- function(idView,idProject){
  gMan <- mxGetGeoServerManager()
  wsName <- idProject
  dsName <- 'pg-' + idProject
  layerName <- idProject + ":" + idView 
  layerNames <- gMan$getLayerNames()
  res <- FALSE
  if(layerName %in% layerNames){
    res <- gMan$unpublishLayer(wsName,dsName,layerName)
  }
  return(res)
}


mxPublishGeoServerAllViewBySource <- function(idSource){
  if(noDataCheck(idSource)) stop("mxPublishGeoServerAllViewBySource: no source")
  idViews <- mxDbGetViewsIdBySourceId(idSource)

  idViews <- idViews[idViews$is_public,c('id')]

  res <- sapply(idViews,function(id){
    published <- mxPublishGeoServerView(id)    
    mxDebugMsg("published view " + id + " = " + published)
    return(published)
    })

  return(res)

}
