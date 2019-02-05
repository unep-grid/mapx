
#' idGroup = Id of the group of services. 
#' idService = Id of the service in services.name 
#' idSource= Id of the source
#' idView = id of the view


#' Get a list of service group config
#'
#' @return {List} List of group by services
mxGetGeoServerServices <- function(){
  .get(config,c("geoserver","services"))
}


#' Try to connect to geoerver
#' @param {GSManager} Geosapi object
#' @return {Logical} success
mxGetGeoServerTryConnect <- function(gMan){
  out <- TRUE;
  tryCatch(gMan$connect(),
    error = function(err){
      out <- FALSE
    })
  return(out)
}

#' Get default geoserver manager object
#'
#' @return geosapi geoserver manager
mxGetGeoServerManager = function(){

  gMan <- .get(config,c("geoserver","manager"))

  if( noDataCheck(gMan) || ! mxGetGeoServerTryConnect(gMan) ){
    gC <- config$geoserver

    gMan <- GSManager$new(
      url = gC$url,
      user = gC$user, 
      pwd = gC$password,
      logger = NULL 
      )

    config[["geoserver"]][["manager"]] <<- gMan

  }

  return(gMan)
}

#' Get workspace(s) of the given source
#'
#' @param {Chracter} idSource Id of the source
#' @param {Chracter} idGroup Group of services
#' @return Names of the workspaces 
mxGetGeoServerSourceWorkspaceNames <- function(idSource,idGroup=NULL){

  idProject <- mxDbGetLayerProject(idSource) 
  if(noDataCheck(idGroup)) idGroup <- mxDbGetLayerServices(idSource)
  groups <- names(mxGetGeoServerServices()$groups)
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
  groupSep <- mxGetGeoServerServices()$groupSep
  idWorkspace <- idProject + groupSep + idGroup 
  return(idWorkspace)
}


#' Get workspaces group name(s) of the given source
#'
#' @param {Chracter} idSource Id of the source
#' @return Names of source groups
mxGetGeoServerSourceGroupNames <- function(idSource){
  services <- mxDbGetLayerServices(idSource)
  idGroup <- names(mxGetGeoServerServices()$groups)
  idGroup <- idGroup[idGroup %in% services]
  return(idGroups)
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
  # Each MapX project = 2 workspace. <id_project>@gs_ws_a and <id_project>@gs_ws_b
  #
  services <- mxGetGeoServerServices()
  idServicesAll <- services$names
  groups <- services$groups

  ok <- sapply(names(groups),function(idGroup){

    #
    # Get services associated with the group : wms, wfs, etc.
    #
    idServicesGroup <- groups[[idGroup]]

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

    updated <- sapply(idServicesAll,function(idS){

      updated <- FALSE
      enableService <- idS %in% idServicesGroup

      if( enableService ){
        #
        # Update options
        #
        sSet <- GSServiceSettings$new( service = idS )
        sSet$setTitle(mxDbGetProjectTitle(idProject,"en") + ": "+ idS)
        updated <- gMan$updateServiceSettings(sSet, service = idS, ws = idWorkspace)

        #
        # Enable services
        #
        gMan[['enable'+toupper(idS)]]( idWorkspace )
      }else{
        #
        # Disable
        #
        gMan[['disable'+toupper(idS)]]( idWorkspace )
      }

      return(updated)
})

    return(all(updated))

      })

  return(all(ok))
}


#' Save geoserver datastore for a workspace
#'
#' @param {Chracter} idWorkspace Id of the workspace
#' @return {Logical} success
mxSaveGeoServerPostgisDatastore = function(idWorkspace){
  mxDebugMsg("mx gs save geoserver postgis datasource in " + idWorkspace)
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

  res <- gMan$updateDataStore(idWorkspace, ds)
  mxDebugMsg("mx gs end save geoserver postgis datasource in " + idWorkspace)
  return(res)
}

#' Format a datastore name based in idWorkspace and type
#'
#' @param {Character} idWorkspace Id of the workspace
#' @return {Character} name of the datastore
mxGetGeoServerDatastoreName <- function(idWorkspace,type='pg'){
  sep <- .get(config,c("geoserver","dataStore","sep"))
  idWorkspace + sep + type
}

#' Delete a geoserver workspace
#'
#' @param {Character} idWorkspace Id of the workspace
#' @return {Logical} success
mxDeleteGeoServerWorkspace <- function(idWorkspace){
  gMan <- mxGetGeoServerManager()
  workspaces <- gMan$getWorkspaceNames()
  res <- sapply(idWorkspace,function(idW){
    res <- TRUE
    if( idW %in% workspaces ){
      res <- gMan$deleteWorkspace(idW,recurse=TRUE)
    }
    return(res)
      })
  return(all(res))
}

#' Publish or Unpublish a single view
#'
#' @param {Character} idView Id of the view to publish
#' @param {Character} idSource Id of the view's source
#' @param {logical} publish Boolean should the view be published ?
#' @return {Logical} success
mxPublishGeoServerViewAuto <- function(idView,idSource=NULL,publish=FALSE){
  updated <- FALSE
  if(noDataCheck(idView)) return(updated)
  if(noDataCheck(idSource)) idSource <- mxDbGetViewMainSource(idView)
  if(noDataCheck(idSource)) return(updated)
  if(noDataCheck(publish)) return(updated)

  idGroupsServices <- mxDbGetLayerServices(idSource)
  idGroupsAll <- names(mxGetGeoServerServices()$groups)
  hasServices <- any(idGroupsServices %in% idGroupsAll)
  
  if(hasServices){
    if( publish ){
      updated <- mxPublishGeoServerView(idView)
    }else{
      updated <- mxUnpublishGeoServerView(idView)
    }
  }
  return(updated)
}


#' Publish a single view in a group of workspace
#'
#' @param {Character} idView Id of the view to publish
#' @param {Character} idWorkspace id of the workspace. Default = all source workspaces. Multiple allowed.
#' @return {Logical} success
mxPublishGeoServerView <- function(idView,idWorkspace=NULL){

  gMan <- mxGetGeoServerManager()
  idProject <- mxDbGetViewProject(idView)
  idSource <- mxDbGetViewMainSource(idView)

  #if(noDataCheck(idSource)) return(FALSE)
  if(noDataCheck(idSource)) {
    mxDebugMsg("mxUpdateGeoserverSourcePublishing no source")
    return(FALSE)
  }


  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  viewTitle <- mxDbGetViewsTitle(idView,asNamedList=F)$title
  bbox <- mxDbGetLayerExtent(idSource)

  mxDebugMsg("Publish view " + idView + " in workspaces " + paste(idWorkspace,collapse=","))
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
mxUnpublishGeoServerView <- function(idView,idWorkspace=NULL){

  gMan <- mxGetGeoServerManager()
  idSource <- mxDbGetViewMainSource(idView)

  #if(noDataCheck(idSource)) return(FALSE)
  if(noDataCheck(idSource)) {
    mxDebugMsg("mxUpdateGeoserverSourcePublishing no source")
    return(FALSE)
  }

  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  unpublished <- sapply(idWorkspace,function(idW){


    layerRemoved <- FALSE
    featureTypeRemoved <- FALSE
    idDataSource <- mxGetGeoServerDatastoreName(idW,'pg')
    dsNames <- gMan$getFeatureTypeNames(idW,idDataSource)
    layerName <- idW + ":" + idView 
    layerNames <- gMan$getLayerNames()
    res <- TRUE
    rmLayer <- layerName %in% layerNames
    rmFeatureType <- idView %in% dsNames

    #
    # NOTE: unpublishLayer does not 
    #
    if( rmLayer ){
      layerRemoved <- gMan$deleteLayer(layerName)
    }

    if( rmFeatureType ){
      featureTypeRemoved <- gMan$deleteFeatureType(idW,idDataSource,idView)
    }

    res <- layerRemoved && featureTypeRemoved 

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

  #if(noDataCheck(idSource)) stop("mxPublishGeoServerAllViewBySource: no source")
  if(noDataCheck(idSource)) {
    mxDebugMsg("mxPublishGeoServerAllViewsBySource no source")
    return(FALSE)
  }

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
mxUnpublishGeoServerAllViewsBySource <- function(idSource,idWorkspace=NULL){

  if(noDataCheck(idSource)) {
    mxDebugMsg("mxUnpublishGeoServerAllViewsBySource no source")
    return(FALSE)
  }
  if(noDataCheck(idWorkspace)) idWorkspace <- mxGetGeoServerSourceWorkspaceNames(idSource)
  if(noDataCheck(idWorkspace)) return(FALSE)

  idViews <- mxDbGetViewsIdBySourceId(idSource)
  idViews <- idViews[idViews$is_public,c('id')]

  res <- sapply(idViews,function(id){
    published <- mxUnpublishGeoServerView(id,idWorkspace) 
    return(published)
      })

  return(all(res))

}

#' Update automatic publishing of all public views
#' 
#' @param {Character} idSource Id of the source
#' @param {Character} idProject Id of the project
#' @param {Character} idGroups Groups of service e.g. gs_ws_a
#' @param {Character} idGroupsOld Groups of service e.g. gs_ws_a
#' @return {Logical} success
mxUpdateGeoserverSourcePublishing <- function(idSource,idProject=NULL,idGroups=list(),idGroupsOld=list()){

  if(noDataCheck(idProject)) idProject <- mxDbGetLayerProject(idSource)
  if(noDataCheck(idSource)) {
    mxDebugMsg("mxUpdateGeoserverSourcePublishing no source")
    return(FALSE)
  }

  mxSaveGeoServerWorkspace(idProject)

  idGroupsAll <- names(mxGetGeoServerServices()$groups)

  idWorkspaceWhereRemoveViews <- mxGetGeoServerSourceWorkspaceNames(idSource,idGroupsAll)
  idWorkspaceWhereAddViews <- mxGetGeoServerSourceWorkspaceNames(idSource,idGroups)

  mxUnpublishGeoServerAllViewsBySource(idSource,idWorkspaceWhereRemoveViews)
  mxPublishGeoServerAllViewsBySource(idSource,idWorkspaceWhereAddViews)

  return(TRUE)
}

#' Delete automatically all workspace of a project.
#' 
#' @param {Character} idProject Id of the project
#
mxDeleteGeoServerAllProjectWorkspace <- function(idProject){

  idGroupsAll <- names(mxGetGeoServerServices()$groups)

  res <- sapply(idGroupsAll,function(idGroup){
    idWorkspace <- mxGetGeoServerWorkspaceName(idProject,idGroup) 
    mxDeleteGeoServerWorkspace(idWorkspace)
      })

  return(all(res))
}




