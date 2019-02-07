
##' Get wms layers
##' @param service Service to query
#mxGetWmsLayers <- function(service,useCache=T){
  
  #if(!exists("config")) config <- list()
  #if(noDataCheck(config$.wms_layers)) config$.wms_layers <- list()
  #layers <- config$.wms_layers[[service]]

  #browser()
  #if(!useCache || noDataCheck(layers)){
  
    #req <- sprintf("%1$s?%2$s",service,"service=WMS&request=GetCapabilities")
    ##con <- curl(req)
    
      #res <- xml2::read_xml(req, options="NOCDATA")
      #resList <- xml2::as_list(res)
      #layers <- mxGetWmsLayersFromCapabilities(resList)
      #config$.wms_layers[[service]] <<- layers

  #}

  #return(layers)
#}



##' Get list of available layers and name.
##' @param getCapabilitiesList List that contains a list of a parsed GetCapabilities on a wms server (esri or ogc should work)
#mxGetWmsLayersFromCapabilities <- function(getCapabilitiesList){

  ## TODO: check if the structure could be :
  ## At each level, if a name and a title are provided, take every nested layers as first layer's component.
  ## for now, this works for a 1,2 or 3 levels, but this is empiric.

  #dat <- getCapabilitiesList
  #if(class(dat) != "list"){
    #stop("mxGetWmsLayers failed to analyse the response. Probable cause : A structured document expected of class'list' expected")
  #}
  #layers <- dat[['Capability']][['Layer']]
  
  #layersNested <- layers[names(layers)=="Layer"]


  ## if there is only one level of layers, but the layer in a list.
  #if(length(layersNested)>0){
    #layers <- layersNested 
  #}else{
    #layers <- list(Layer=layers)
  
  #}

  #nLayer <- length(layers)
  #res <- list()
  #for(i in 1:nLayer){
    #j <- layers[[i]]
    #k <- j[names(j) == "Layer"]
    #n <- length(k)
    #ln <- j[['Name']]
    #lt <- na.omit(j[['Title']][[1]])
    #if(n>0){
      #for(l in 1:n){
        #kn <- k[[l]][['Name']]
        #if(!is.null(kn)){
          #ln<-c(ln,kn)
        #}
      #}
    #}
    #ln<-paste(ln,collapse=",")
    #if(!isTRUE(nchar(lt)>0)){
      #ln <-paste("[ no title ", randomString()," ]",sep="")
    #}
    #if(isTRUE(nchar(ln)>0)){
      #res[[i]]<-list("label"=lt,"value"=ln)
    #}
  #}
  #return(res)
#}


