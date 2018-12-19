

#' Get a list of service group config
#'
#' @return {List} List of group by services
#
#
mxGetGeoServerServicesGroups <- function(){
  .get(config,c("geoserver","servicesGroups"))
}


#' Get default geoserver manager object
#'
#' @return geosapi geoserver manager
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

#' Get workspace(s) of the given source
#'
#' @param {Chracter} idSource Id of the source
#' @param {Chracter} idGroup Group of services
#' @return Names of the workspaces 
mxGetGeoServerSourceWorkspaceNames <- function(idSource,idGroup){

  idProject <- mxDbGetLayerProject(idSource) 
  if(noDataCheck(idGroup)) idGroup <- mxDbGetLayerServices(idSource)
  groups <- names(mxGetGeoServerServicesGroups()$groups)
  groups <- groups[groups %in% idGroup]

  workspaces <- sapply(groups,function(idGroup){
    mxGetGeoServerWorkspaceName(idProject,idGroup)
      })

  return(workspaces)
}

#' Get workspace name based on idProject and idGroup
#' 
#' @param {Character} idProject  Id of the project
#' @param {Character} idGroup  Id of the service group (gs_ws_a, gs_ws_b, etc. Group sets in settings-global)
#' @return {Character} workspace name
mxGetGeoServerWorkspaceName <- function(idProject,idGroup = "gs_ws_a"){
  groupSep <- mxGetGeoServerServicesGroups()$groupSep
  idWorkspace <- idProject + groupSep + idGroup
  return(idWorkspace)
}


#' Get workspaces group name(s) of the given source
#'
#' @param {Chracter} idSource Id of the source
#' @return Names of source groups
mxGetGeoServerSourceGroupNames <- function(idSource){

  services <- mxDbGetLayerServices(idSource)
  groups <- names(mxGetGeoServerServicesGroups()$groups)
  groups <- groups[groups %in% services]
  return(groups)
}

#' Save geoserver workspace for a project
#'
#' @param {Chracter} idProject Id of the project
#' @return {Logical} success
mxSaveGeoServerWorkspace = function(idProject){

  gMan <- mxGetGeoServerManager()
  if(noDataCheck(idProject)) return()
  res <- FALSE
  workspaces <- gMan$getWorkspaceNames()
  #
  # Each MapX project = 2 workspace. <id_project>_a and <id_project>_b
  #
  servicesGroups <- mxGetGeoServerServicesGroups()
  idServices <- servicesGroups$idServices
  groups <- servicesGroups$groups

  for(idGroup in names(groups)){

    #
    # Set the workspace name
    #
    idWorkspace <- mxGetGeoServerWorkspaceName(idProject,idGroup)

    #
    # Create and activate settings
    #
    if( !idWorkspace %in% workspaces ){
      res <- gMan$createWorkspace(idWorkspace)
      mxSaveGeoServerPostgisDatastore(idWorkspace)
      settings <- GSWorkspaceSettings$new()
      settings$setNumDecimals(5) #  At least one option seems be set to enable workspace  TODO: check this and/or find another option.
      created <- gMan$createWorkspaceSettings(idWorkspace, settings)
    }

    #
    # Set or update services
    #
    group <- groups[idGroup]
    for( idS in idServices ){
      sSet <- GSServiceSettings$new( service = idS )
      sSet$setTitle(mxDbGetProjectTitle(idProject,"en") + ":"+ s)
      sSet.setEnabled( idS %in% group )
      gMan$updateServiceSettings(sSet, service = idS, ws = idWorkspace)
    }

  }

  return(TRUE)
}


#' Save geoserver datastore for a workspace
#'
#' @param {Chracter} idWorkspace Id of the workspace
#' @return {Logical} success
mxSaveGeoServerPostgisDatastore = function(idWorkspace){
  gMan <- mxGetGeoServerManager()
  datastore <- mxGetGeoServerDatastoreName(idWorkspace,'pg')
  datastores <- gMan$getDataStoreNames(idWorkspace)
  
  ds <- NULL
  exists <- datastore %in% datastores

  if( !exists ){
    ds <- GSPostGISDataStore$new(
      dataStore=datastore, 
      description ='pg '+ idWorkspace,
      enabled = TRUE
      )
    created <- gMan$createDataStore(idWorkspace, ds)
  }else{
    ds <- gMan$getDataStore(idWorkspace, datastore)
  }
 
  ds$setConnectionParameter('host',.get(config,c('pg','host')))
  ds$setConnectionParameter('user',.get(config,c('pg','read','user')))
  ds$setConnectionParameter('passwd',.get(config,c('pg','read','password')))
  ds$setConnectionParameter('database',.get(config,c('pg','dbname')))
  ds$setConnectionParameter('port',.get(config,c('pg','port')))
  ds$setConnectionParameter('schema','public')
  ds$setConnectionParameter('dbtype','postgis')

  if(exists){
    res <- gMan$updateDataStore(idWorkspace, ds)
  }else{
    res <- gMan$createDataStore(idWorkspace, ds)
  }
  return(res)
}

#' Format a datastore name based in idWorkspace and type
#'
#' @param {Character} idWorkspace Id of the workspace
#' @return {Character} name of the datastore
mxGetGeoServerDatastoreName <- function(idWorkspace,type='pg'){
  sep <- .get(config,c("geoserver","dataStore","sep"))
  type + sep + idWorkspace
}

#' Delete a geoserver workspace
#'
#' @param {Character} idWorkspace Id of the workspace
#' @return {Logical} success
mxDeleteGeoServerWorkspace <- function(idWorkpace){
  gMan <- mxGetGeoServerManager()
  workspaces <- gMan$getWorkspaceNames()
  res <- FALSE
  if( idWorkspace %in% workspaces ){
    res <- gMan$deleteWorkspace(idWorkspace,recurse=TRUE)
  }
  return(res)
}

#' Publish a single view in a group of workspace
#'
#' @param {Character} idView Id of the view to publish
#' @param {Character} idWorkspace id of the workspace. Default = all source workspaces. Multiple allowed.
#' @return {Logical} success
mxPublishGeoServerView <- function(idView,idWorkspace){
  
  gMan <- mxGetGeoServerManager()
  idProject <- mxDbGetViewProject(idView)
  idSource <- mxDbGetViewMainSource(idView)
  
  if(noDataCheck(idSource)) stop("mxPublishGeoServerView : source not defined ")
  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  viewTitle <- mxDbGetViewsTitle(idView,asNamedList=F)$title
  bbox <- mxDbGetLayerExtent(idSource)

  published <- sapply(idWorkspace,function(idW){

    idDataSource <- mxGetGeoServerDatastoreName(idW,'pg')
    #
    # If needed, unpublish
    #
    mxUnpublishGeoServerView(idView,idW)

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
    #
    # TODO: import MapX style to sld, create file ?
    #
    layer$addStyle("generic")

    # try to publish the complete layer (featuretype + layer)
    published <- gMan$publishLayer(idW, idDataSource, featureType, layer)
      })
  return(all(published))
}

#' Unpublish a view
#' 
#' @param {Character} idView Id of the view
#' @param {Character} idWorkspace id of the workspace. Default = all source workspaces. Multiple allowed.
#' @return {Logical} success
mxUnpublishGeoServerView <- function(idView,idWorkspace){

  gMan <- mxGetGeoServerManager()
  idSource <- mxDbGetViewMainSource(idView)
  
  if(noDataCheck(idSource)) stop("mxUnublishGeoServerView : source not defined ")
  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  unpublished <- sapply(idWorkspace,function(idW){
    idDataSource <- mxGetGeoServerDatastoreName(idW,'pg')
    layerName <- idWorkspace + ":" + idView 
    layerNames <- gMan$getLayerNames()
    res <- TRUE
    if(layerName %in% layerNames){
      res <- gMan$unpublishLayer(idWorkspace,idDataSource,layerName)
    }
    return(res)
      })

  return(all(unpublished))
}


#' Publish all public view of a source
#' 
#' @param {Character} idSource Id of the source
#' @param {Character} idWorkspace id of the workspace. Default = all source workspaces. Multiple allowed.
#' @return {Logical} success
mxPublishGeoServerAllViewsBySource <- function(idSource,idWorkspace){

  if(noDataCheck(idSource)) stop("mxPublishGeoServerAllViewBySource: no source")
  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  idViews <- mxDbGetViewsIdBySourceId(idSource)
  idViews <- idViews[idViews$is_public,c('id')]

  res <- sapply(idViews,function(id){
    published <- mxPublishGeoServerView(id,idWorkspace)
    return(published)
      })

  return(all(res))

}

#' Unpublish all public views of a source
#' 
#' @param {Character} idSource Id of the source
#' @param {Character} idWorkspace id of the workspace. Default = all source workspaces. Multiple allowed.
#' @return {Logical} success
mxUnpublishGeoServerAllViewsBySource <- function(idSource,idWorkspace){

  if(noDataCheck(idSource)) stop("mxUnpublishGeoServerAllViewBySource: no source")
  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  idViews <- mxDbGetViewsIdBySourceId(idSource)
  idViews <- idViews[idViews$is_public,c('id')]

  res <- sapply(idViews,function(id){
    published <- mxUnpublishGeoServerAllViewsBySource(id,idWorkspace) 
    return(published)
      })

  return(all(res))

}

#' Update automatic publishing of all public views
#' 
#' @param {Character} idSource Id of the source
#' @param {Character} oldServices previous services
#' @param {Character} newServices new services
#' @return {Logical} success
mxUpdateGeoserverSourcePublishing <- function(idSource,oldServices,newServices){


  serviceRemoved <- oldServices[!oldServices %in% newServices] 
  serviceAdded <- newServices[!newServices %in% oldServices]


  idWorkspaceWhereAddViews <- mxGetGeoServerSourceWorkspaceNames(idSource,serviceAdded)
  idWorkspaceWhereRemoveViews <- mxGetGeoServerSourceWorkspaceNames(idSource,serviceAdded)

  browser()
  if(!noDataCheck(serviceRemoved)) mxUnpublishGeoServerAllViewsBySource(idSource,idWorkspaceWhereRemoveViews)
  if(!noDataCheck(serviceAdded)) mxPublishGeoServerAllViewsBySource(idSource,idWorkspaceWhereAddViews)

  return(TRUE)
}



