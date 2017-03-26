library(RPostgreSQL)
library(base64enc)
library(jsonlite)
library(magrittr)

#' Authentication info
dbInfo=list(
  host='',
  dbname='',
  port='',
  user='',
  password=''
  )

#' get/set a query
mxDbGetQuery <- function(dbInfo,query,stringAsFactors=F){
  tryCatch({
    d <- dbInfo
    drv <- dbDriver("PostgreSQL")
    con <- dbConnect(drv, dbname=d$dbname, host=d$host, port=d$port,user=d$user, password=d$password)
    suppressWarnings({
      res <- dbGetQuery(con,query,stringAsFactors=stringAsFactors)
    })

    dbDisconnect(con)
    on.exit({ 
      dbDisconnect(con)
      mxDbClearAll(dbInfo)
    })
    # return
    return(res)
  },
  finally={})
}
#' check if layer exists

mxDbExistsTable<- function(dbInfo,table){
  tryCatch({
    d <- dbInfo
    drv <- dbDriver("PostgreSQL")
    con <- dbConnect(drv, dbname=d$dbname, host=d$host, port=d$port,user=d$user, password=d$password)
    res <- dbExistsTable(con,table)
    dbDisconnect(con)
    return(res)
  },finally=if(exists('con'))dbDisconnect(con)
  )
}

#' update a value
mxDbUpdate <- function(dbInfo,table,column,idCol="id",id,value){

  query <- sprintf("
    UPDATE %1$s
    SET \"%2$s\"='%3$s'
    WHERE \"%4$s\"='%5$s'",
    table,
    column,
    value,
    idCol,
    id
    )
  res <- mxDbGetQuery(dbInfo,query)

  return(res)
}
# clear result for psql driver (this should not be done..)
mxDbClearAll <- function(dbInfo){
  d <- dbInfo
  drv <- dbDriver("PostgreSQL")
  cons <- dbListConnections(drv)
  if(length(cons)>0){
    lapply(cons,function(x){
      nR <- dbListResults(x)
      if(length(nR)>0){
        lapply(nR,dbClearResult)
      }
      dbDisconnect(x)
    })
  }
}


#' encode in base64
mxEncode <- function(text){
  base64enc::base64encode(charToRaw(as.character(text)))
}

mxDecode <- function(base64text){
  rawToChar(base64enc::base64decode(base64text))
}


#
# get meta
#

mxGetLayerMeta <- function(dbInfo,layer){
  mxDbGetQuery(
    dbInfo,
    sprintf("select meta from mx_layers where \"layer\"='%s'",layer)
    )$meta%>%
  mxDecode() %>%
  jsonlite::fromJSON()
}

#
# set layer meta
#

mxSetLayerMeta <- function(dbInfo,layer,meta=list()){
  if(
    isTRUE(!is.list(meta)) || 
    isTRUE(length(meta) == 0) 
    ) stop("meta list : wrong format")

  if(
    isTRUE(!mxDbExistsTable(dbInfo,layer))
    ) stop(sprintf("layer %s does not exists",layer))

  jsonlite::toJSON(meta) %>% 
  mxEncode() %>%
  mxDbUpdate(
    dbInfo,
    "mx_layers",
    idCol="layer",
    id=layer,
    column="meta",
    .
    )
}


mxDbRemoveLayer <- function(dbInfo,layer){
  if(!mxDbExistsTable(dbInfo,layer)) stop(sprintf("Layer %s does not exist",layer))
  # remove layer entry in mx_layers
  q1 <- sprintf("DELETE FROM %s WHERE \"layer\"='%s'",layer)
  # remove table
  q2 <- sprintf("DROP TABLE %s",layer);
  # query
  mxDbGetQuery(dbInfo,q1)
  mxDbGetQuery(dbInfo,q2)
}


#
#  EXAMPLE
#

meta = list(
  title = " White salts High concentrations of zinc salts at effluent discharge point ; pink salts: High concentrations of heavy metals along river bed, (for tailings) A tailing in Kolwezi area.",
  author = "UNEP/Post-Conflict and Disaster Management Branch, as part of the Post-conflict environmental assessment in DRC", 
  organisation ="UNEP/PCDMB", 
  address =" UNEP/PCDMB, International Environment house, 11-15 Chemin des Anemones, 1219 Chatelaine, Geneva", 
  year ="2010",
  url = "pink salts: https://www.flickr.com/photos/unep_dc/8568383181/in/album-72157632949418956/ ;
  DRC assessment report: http://postconflict.unep.ch/publications/UNEP_DRC_PCEA_EN.pdf"
  )


mxSetLayerMeta(dbInfo,"cod__env__katanga_sampling_campaign_img",meta)


