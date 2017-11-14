


#' Experimental db conection pool
#' 
#' @export
mxDbAutoCon <- function(){

  # get configuration file
  conf <- mxGetDefaultConfig()
  # db info
  d <- conf[["pg"]]
  # will list the resulting con
  res <- NULL
  # will list previous con
  oldCon <- list()
  # by default, create a new con
  createNew <- TRUE

  # try to connect
  tryCon <- try(silent=T,{

    # extract number of connection in the pool. Should be < than n cpu.
    maxCon <- d[["conPool"]]

    # get list of existing connection
    drv <- dbDriver("PostgreSQL")
    oldCon <- dbListConnections(drv)
    oldConLength <- length(oldCon)

    if(oldConLength >= maxCon){
      # select randomly one connection NOTE: What if there is pending rows on this connection ?
      res <- sample(oldCon,1)[[1]]
      #
      if(!isPostgresqlIdCurrent(res)){
        postgresqlCloseConnection(res)
        createNew = TRUE
      }else{
        createNew = FALSE
      }
    }

    if(createNew){
      # extract and control dbInfo list 
      allParam <- all(c("dbname","host","port","user","password") %in% names(d))
      allFilled <- all(!sapply(d,noDataCheck))
      stopifnot(all(allParam,allFilled))
      # create a new connection
      res <- dbConnect(drv, dbname=d$dbname, host=d$host, port=d$port,user=d$user, password=d$password)
      if(is.null(res)) stop()
    }
})

  if("try-error" %in% class(tryCon)){
    mxDebugMsg(tryCon)
    stop("mxDbAutoCon can't connect to the database")
  }

  return(res)
}



#' Get query result from postgresql
#'
#' Wrapper to execute a query 
#'
#' @param query SQL query
#' @export
mxDbGetQuery <- function(query,stringAsFactors=FALSE,con=NULL,onError=function(x){stop(x)}){
  res <- NULL
  data <- data.frame()
  if(noDataCheck(con)){
    con <- mxDbAutoCon()
  }

  tryCatch({    
    suppressWarnings({
      res <- postgresqlExecStatement(con, gsub("\n","",query))

      if(dbGetInfo(res)$isSelect!=0){
        temp <- postgresqlFetch(res,n=100000)
        if( dbGetRowCount(res) > 0 ){ 
          data <- temp
        }
      }
    })
  },
  error = onError
  )

  on.exit({ 
    if(exists("res")){
      postgresqlCloseResult(res)
    }
  })

  return(data)

}

#' Get number of view by country
#' @export
mxDbGetViewsByCountry <- function(idUser,read){
  
  read <- read[read != "self"]
  read <- paste(paste0("'",read,"'"),collapse=",")

 q = sprintf("
   SELECT count(t.id) n, t.country 
   FROM (
     SELECT distinct id, country 
     FROM mx_views
     WHERE target ?| array[%1$s] OR (editor = '%2$s' AND target ?| array['self'])
     ) t 
   GROUP BY t.country
   "
   , read
   , idUser
   )
 
 mxDbGetQuery(q)

}




#' @rdname mxDbGetDistinctCollectionsTags
#' @param {character} table Table name
mxDbGetDistinctCollectionsTags <- function(table){

  sql = sprintf("
    SELECT jsonb_build_array(dist.tags) ->> 0 as res from (
    SELECT DISTINCT tags  FROM
    ( SELECT
      case
      when jsonb_typeof(data->'collections') = 'string' then jsonb_array_elements(jsonb_build_array(data->'collections'))
    else (JSONB_ARRAY_ELEMENTS(data->'collections'))
    end AS tags
    FROM %1$s as a
    WHERE 
    data->'collections' IS NOT NULL
    AND date_modified = (
      SELECT MAX(date_modified)
      FROM mx_views b
      WHERE b.id = a.id
      )
    ) as foo ) dist",table)

    tags <- mxDbGetQuery(sql)$res;

    return(tags)
}




#' @rdname mxDbGetViews
#' @param views {list|vector} Views id to fetch. Optional, replace any other logic
#' @param collections {list|vector} Collection(s) to fetch. Optional, add to selected views and replace any other logic
#' @param project {character} Iso 3 country code
#' @param read {vector} Name of the groups the user can read
#' @param edit {vector} Name of the group the user can edit
#' @param userId {integer} User id
#' @param id {character} Unique view id to fetch
#' @param from {integer} Position of the row to start with
#' @param to {integer} Position of the row to end with
#' @param idOnly {boolean} Return only list of id instead of full view record.
#' @export 
mxDbGetViews <- function(views=NULL, collections=NULL, project="WLD", read=c("public"), edit=c(), userId=1, id=NULL, from=0, to=5,idOnly=FALSE){

  #  temp table name
  tableTempName= randomString("MX_SUB_VIEW")

  #
  # Keep the same con for all request
  #
  con <- mxDbAutoCon()

  #
  # Catch and clean
  #
  tryCatch({

    out <- list()
    conf <- mxGetDefaultConfig()
    tableName <- .get(conf,c("pg","tables","views"))

    # paste read for psql array
    read <- read[read != "self"]
    read <- paste(paste0("'",read,"'"),collapse=",")

    # paste edit for psql array 
    edit <- edit[edit != "self"]
    edit <- paste(paste0("'",edit,"'"),collapse=",")

    if(!noDataCheck(collections)){
      collections <- paste(collections,collapse="','")
    }

    # filter view id
    filter <- ""
    if(!is.null(id)){
      filter <- sprintf("AND t1.id='%s'",id)
    }


    queryMain = sprintf("CREATE TEMPORARY TABLE %1$s AS (
      WITH a AS (
        SELECT id as id_a, MAX(date_modified) AS latest_date
        FROM %2$s
        GROUP BY id_a
        ),
      c as (
        SELECT *, b.data ->'countries' as countries, b.data -> 'collections' as collections
        FROM %2$s b
        JOIN a ON a.id_a = b.id AND a.latest_date = b.date_modified
        WHERE
        ( 
          ( target ?| array[%3$s] ) OR
          ( editor = '%4$s' AND b.target ?| array['self']) 
          )
        ),
      d as (
      SELECT *
      FROM c
      WHERE
      (
        (country ='%5$s') OR
        (countries ?& array['%5$s']) OR
        (countries ?& array['GLB'])
        )
      )
      
      SELECT *, 
      exists(
        SELECT id 
        FROM d 
        WHERE d.target ?| array[%6$s] 
        OR (
          d.editor = '%4$s' 
          AND d.target ?| array['self']
          )
        ) as _edit
      FROM d
      )"
    , tableTempName
    , tableName
    , read
    , userId
    , project
    , edit
    )

  mxDbGetQuery(queryMain,con=con)

  if(!noDataCheck(collections)){

    sql =  sprintf("
      SELECT DISTINCT id 
      FROM %1$s a
      WHERE data->'collections' ?| array['%2$s']
      ",
      tableTempName,
      collections
      )

    views = c(
      views,
      mxDbGetQuery(sql,con=con)$id
      )
  }

  if(!noDataCheck(views)){
    
    #
    # Filtered list of record
    #
    if(idOnly){
      return(views)
    }else{
      views <- paste(paste0("'",views,"'"),collapse=",")
      q <- sprintf("
        SELECT json_agg(row_to_json(a)) res from %1$s as a
        WHERE  a.id in (%2$s)"
        , tableTempName
        , views
        )
    }

  } else {

    #
    # Full list of records
    #
    if(idOnly){
      q <- sprintf("
        SELECT id from %1$"
        , tableTempName
        ) 
      return(mxDbGetQuery(q)$id,con=con)
    }else{
      q <- sprintf("
        SELECT json_agg(row_to_json(a)) res from %1$s as a"
        , tableTempName
        )
    }
  }

  time <- mxTimeDiff("Get view : query")
  res <- na.omit(mxDbGetQuery(q,con=con))
  mxTimeDiff(time)

  time <- mxTimeDiff("Get view : json to list")
  out <- mxJsonToList(res$res)
  mxTimeDiff(time)

  return(out)

  },finally = {
    mxDbGetQuery(sprintf("DROP TABLE %1$s",tableTempName),con=con)
  })
}


#' Update a single value of a table
#' @param table Table to update
#' @param column Column to update
#' @param idCol Column of identification
#' @param id Identification value
#' @param value Replacement value
#' @param expectedRowsAffected Number of row expected to be affected. If the update change a different number of row than expected, the function will rollback
#' @param createMissing If path is given, should the function create missing path in record ?
#' @return Boolean worked or not
#' @export
mxDbUpdate <- function(table,column,idCol="id",id,value,path=NULL,expectedRowsAffected=1,createMissing=TRUE){   

  # explicit check
  stopifnot(mxDbExistsTable(table))

  stopifnot(tolower(column) %in% tolower(mxDbGetLayerColumnsNames(table)))
  # implicit check
  stopifnot(!noDataCheck(id))
  stopifnot(!noDataCheck(idCol))
  # final query
  query <- NULL

  # get connection object
  con <- mxDbAutoCon()

  if(!is.null(path)){
    # if value has no json class, convert it (single value update)
    valueIsJson <- isTRUE("json" %in% class(value))
    if( valueIsJson ){
      valueJson <- value
    }else{
      valueJson <- mxToJsonForDb(value)
    }
    #
    # json update
    #
    pathIsJson <- isTRUE("json" %in% class(path))
    if( pathIsJson ){
      pathJson <- path 
    }else{ 
      pathJson <- paste0("{",paste0(paste0("\"",path,"\""),collapse=","),"}")
    }

    #
    # test if the whole path exists and if value is there 
    #
    isMissing <- sprintf("
      SELECT NOT EXISTS(
        SELECT \"%1$s\" from %2$s
        WHERE \"%3$s\"='%4$s' 
        AND \"%1$s\"#>>'%5$s' IS NOT NULL
        ) AS missing
      "
      ,column
      ,table
      ,idCol
      ,id 
      ,pathJson
      ) %>%
    mxDbGetQuery(.) %>%
    `[[`("missing") 
  #
  # create missing if needed
  #
  if(isMissing){
    data <- sprintf("
      SELECT \"%1$s\" 
      FROM %2$s
      WHERE \"%3$s\"='%4$s'
      "
      , column
      , table
      , idCol
      , id
      ) %>%
    mxDbGetQuery() %>%
    `[[`(column) %>%
    jsonlite::fromJSON(.,simplifyDataFrame=FALSE)

  value  <- mxSetListValue(data,path,value)

  }else{

    query <- sprintf("
      UPDATE %1$s
      SET \"%2$s\"= (
      SELECT jsonb_set(
        (
          SELECT \"%2$s\" 
          FROM %1$s
          WHERE \"%4$s\"='%5$s'
          ) ,
        '%6$s',
        '%3$s'
        )
      ) 
    WHERE \"%4$s\"='%5$s'"
    ,table
    ,column
    ,valueJson
    ,idCol
    ,id
    ,pathJson
    )
  }

  }
  if(is.null(query)){
    # if it's a list, convert to json
    if(is.list(value)) value <- mxToJsonForDb(value)
    # standard update
    query <- sprintf("
      UPDATE %1$s
      SET \"%2$s\"='%3$s'
      WHERE \"%4$s\"='%5$s'"
      ,table
      ,column
      ,value
      ,idCol
      ,id
      )
  }
 
  dbGetQuery(con, "BEGIN TRANSACTION")
  rs <- dbSendQuery(con,gsub("\\n| +"," ",query))   
  ra <- dbGetInfo(rs,what="rowsAffected")[[1]]
  isAsExpected <- isTRUE( ra == expectedRowsAffected )

  if( ! isAsExpected ){  
    dbRollback(con)
    warning(
      sprintf(
        "Warning, number of rows affected does not match expected rows affected %s vs %s. Rollback requested",
        ra,
        expectedRowsAffected
        )
      )
  }else{
    dbCommit(con)
  }

  return(isAsExpected)
}






#' Transfert postgis feature by sql query to sp object
#' @param query PostGIS spatial sql querry.
#' @return spatial object.
#' @export
mxDbGetSp <- function(query) {

  conf <- mxGetDefaultConfig()

  d<- config[["pg"]]

  tmpTbl <- sprintf('tmp_table_%s',round(runif(1)*1e5))

  dsn <- sprintf("PG:dbname='%s' host='%s' port='%s' user='%s' password='%s'",
    d$dbname,d$host,d$port,d$user,d$password
    )

  con <- mxDbAutoCon()

  tryCatch({

    sql <- sprintf("CREATE UNLOGGED TABLE %s AS %s",tmpTbl,query)

    res <- dbSendQuery(con,sql)

    nr <- dbGetInfo(res)$rowsAffected

    if(nr<1){

      warning('There is no feature returned.'); 

      return()

    }

    sql <- sprintf("SELECT f_geometry_column from geometry_columns WHERE f_table_name='%s'",tmpTbl) 

    geo <- dbGetQuery(con,sql)

    if(length(geo)>1){
      tname <- sprintf("%s(%s)",tmpTbl,geo$f_geometry_column[1])
    }else{
      tname <- tmpTbl;
    }
    out <- readOGR(dsn,tname)

    on.exit({
      if(exists("con")){
        sql <- sprintf("DROP TABLE %s",tmpTbl)
        dbSendQuery(con,sql)
        mxDbClearResult(con)
      }
    })

    return(out)
  })

}


#' Geojson from postGIS base
#' @param query PostGIS spatial sql querry.
#' @return geojson list
#' @export
mxDbGetGeoJSON<-function(query,fromSrid="4326",toSrid="4326",asList=FALSE){

  # NOTE: check package geojsonio for topojson and geojson handling.
  # https://github.com/ropensci/geojsonio/issues/61
  conf <- mxGetDefaultConfig()
  d <- config[['pg']]
  dsn <-gsub("\n|\\s+"," ",sprintf(
      "dbname='%1$s'
      host='%2$s'
      port='%3$s'
      user='%4$s'
      password='%5$s'",
      d$dbname,
      d$host,
      d$port,
      d$user,
      d$password
      ))

  tmp <- paste0(tempfile(),".geojson")

  cmd <-gsub("\n|\\s+"," ",sprintf(
      "ogr2ogr -f GeoJSON
      %2$s
      PG:\"%1$s\"
      -sql '%3$s'
      -s_srs 'EPSG:%4$s'
      -t_srs 'EPSG:%5$s'",
      dsn,
      tmp,
      query,
      fromSrid,
      toSrid
      )
    )

  system(cmd)

  if(asList){
    return(jsonlite::fromJSON(tmp))
  }else{
    return(tmp)
  }
}
#' Get layer extent
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetLayerExtent<-function(table=NULL,geomColumn='geom'){

  if(is.null(table)) stop('Missing table name')


  if(mxDbExistsTable(table)){

    q <- sprintf("
      SELECT 
      ST_AsGeoJSON(
        ST_Extent(
          ST_Buffer( %1$s::geography , 2 )::geometry
        )) AS ext 
      FROM %2$s"
      , geomColumn
      , table
      )
    #
    # Get extent
    #
    ext =  mxDbGetQuery(q)
    

    #
    # Extract coordinates from json
    #
    res <- .get(
      jsonlite::fromJSON(
        mxDbGetQuery(q)$ext,  
        simplifyVector=F 
        ),c("coordinates")
      )[[1]]

    #
    # Geojson coordinate order is : longitude, latitude
    #

    if(is.null(res)){
      out <- list()
    }else{
      out <- list(
        "lng1" = res[[1]][[1]],
        "lng2" = res[[3]][[1]],
        "lat1" = res[[1]][[2]],
        "lat2" = res[[3]][[2]]
        )
    }

    return(out)

  }
}



#' Extract table of layer for one country, for given role or userid
#' @param project Project or iso3 country code
#' @param target Groupe/role set as target
#' @param userId Integer user id
#' @param language language for layer name. Default is english.
#' @export
mxDbGetLayerTable <- function(project, projects, userId, target="public",language="en"){

  target <- paste(paste0("'",target,"'"),collapse=",")

  type <- "vector" 

  dat <- mxDbGetQuery(sprintf(
      "SELECT id, 
      data#>>'{\"meta\",\"text\",\"title\",\"%1$s\"}' title_%1$s,
      data#>>'{\"meta\",\"text\",\"title\",\"en\"}' title_en,
      date_modified
      FROM mx_sources
      WHERE ( country='%2$s' ) AND
      type='%3$s' AND
      ( target ?| array[%4$s] OR editor = '%5$s' )",
      language,
      project,
      type,
      target,
      userId
      ))

  #
  # Return 
  #

  return(dat)

}


#' Get list of table/layer not refered in mx_source
#' @param tableSource Default to mx_sources
#' @param exludes Default to mx_sources, mx_users, mx_views
#' 
mxDbGetUnregisteredTable <- function(tableSource="mx_sources",excludes=c("mx_users","mx_sources","mx_views","spatial_ref_sys")){

  tbls <- c()

  tryCatch({
  ids <- mxDbGetQuery(sprintf("SELECT distinct id FROM %1$s",tableSource))$id
  tbls <- mxDbListTable()
  tbls <- tbls[ !tbls %in% excludes ]
  tbls <- tbls[ !tbls %in% ids ]
  },error=function(err){})

  return(tbls)

}



#' Json string to list 
#' @param {character} res json string  
mxJsonToList <- function(res){
  out =  list()
  if(!noDataCheck(res)){
    out <- jsonlite::fromJSON(res,simplifyDataFrame=FALSE)
  }
  return(out)
}

mxJsonToList <- memoise(mxJsonToList)


#' Build encrypted query for a vt view
#' @param sourceData {list} Source settings
#' @param sourceDataMask {list} Source settings
#' @param idView View id (view$id)
#' @export
#mxViewMakeQuery <- function( def = NULL, defMask = NULL, idView = NULL){

  #out <-  list()

  #if(!noDataCheck(def)){

    #variableName = def[["variableName"]]
    #variablesNamesAdd = def[["variableNameAdd"]]
    #layerName = def[["layerName"]]
    #layerNameMask = defMask[["layerMaskName"]]

    ##templateOverLap = config[[c("templates","pgViewOverlap")]]
    ##templateSimple = config[[c("templates","pgViewSimple")]]

    #geomCol = config[[c("pg","geomCol")]]

    #hasVariable = !noDataCheck(variableName)
    #hasLayer = !noDataCheck(layerName)
    #hasLayerMask = !noDataCheck(layerNameMask)

    #if( hasLayer && hasVariable){

      ##
      ## Check if time is available
      ##
      #timeVars <- def[["timeVariables"]]

      #if(!noDataCheck(timeVars)){
        #variablesNamesAdd <- c(
          #timeVars,
          #variablesNamesAdd
          #)
      #}

      #if( hasLayerMask ){
        ## 
        ## Use overlap template
        ##
        #query <- infuse(
          #file_or_string = templateOverLap,
          #geom = geomCol,
          #variableName = c( variableName, variablesNamesAdd ),
          #layerName = layerName,
          #layerMaskName = layerNameMask
          #)
       
      #}else{
        ##
        ## Use simple template
        ##
        #query <- infuse(
          #file_or_string = templateSimple,
          #geom = geomCol,
          #variableName = c(variableName, variablesNamesAdd),
          #layerName = layerName
          #) 
      #}

      #out = mxDbEncrypt(query)
    #}
  #}
  #return(out)

#}




#' @export
mxDbGetValByCoord <- function(table=NULL,column=NULL,lat=NULL,lng=NULL,geomColumn="geom",srid="4326",distKm=1){
  if(
    noDataCheck(table) || 
      noDataCheck(column) || 
      noDataCheck(lat) ||
      noDataCheck(lng) ||
      isTRUE(column=='gid')
    ){
    return()
  }else{

    timing<-system.time({

      sqlPoint <- sprintf("'SRID=%s;POINT(%s %s)'",srid,lng,lat)
      sqlWhere <- sprintf(
        paste(
          "with index_query as (select st_distance(%s, %s) as distance, %s from %s order by %s <#> %s limit 10)",
          "select %s from index_query where distance < 0.1 order by distance limit 1;"
          ),
        geomColumn,sqlPoint,column,table,geomColumn,sqlPoint,column
        )
      suppressWarnings({
        res <- mxDbGetQuery(sqlWhere)
      })

    })
    return(
      list(
        result=res,
        latitude=lat,
        longitude=lng,
        timing=timing
        )
      ) 
  }
}


#' Get variable summary
#'
#' @param table Table/layer from which extract extent
#' @param column Column/Variable on wich extract summary
#' @export
mxDbGetColumnInfo<-function(table=NULL,column=NULL){

  if(noDataCheck(table) || noDataCheck(column) || isTRUE(column=='gid'))return() 


  stopifnot(tolower(column) %in% tolower(mxDbGetLayerColumnsNames(table)))
  timing<-system.time({

    q <- sprintf(
      "SELECT attname 
      FROM pg_attribute 
      WHERE attrelid = 
        (SELECT oid 
          FROM pg_class 
          WHERE relname = '%s'
          ) 
      AND attname = '%s';"
      ,table,
      column
      )

    columnExists <- nrow( mxDbGetQuery(q) ) > 0 

    if(!columnExists){
      message(paste("column",column," does not exist in ",table))
      return()
    }

    # number of row
    nR <- mxDbGetQuery(sprintf(
        "SELECT count(*) 
        FROM %s 
        WHERE %s IS NOT NULL"
        ,table
        ,column
        )
      )[[1]]

    # number of null
    nN <- mxDbGetQuery(sprintf(
        "SELECT count(*) 
        FROM %s 
        WHERE %s IS NULL"
        ,table
        ,column
        )
      )[[1]]

    # number of distinct
    nD <- mxDbGetQuery(sprintf(
        "SELECT COUNT(DISTINCT(%s)) 
        FROM %s 
        WHERE %s IS NOT NULL"
        ,column
        ,table
        ,column
        )
      )[[1]]

    val <- mxDbGetQuery(sprintf("
        SELECT DISTINCT(%s) 
        FROM %s 
        WHERE %s IS NOT NULL"
        ,column
        ,table
        ,column
        ),stringAsFactors=T)[[1]]
  })


  scaleType <- ifelse(is.factor(val) || is.character(val),'discrete','continuous')

  return(
    list(
      'table' = table,
      'column' = column,
      'nDistinct'=nD,
      'nRow'=nR,
      'nNa'=nN,
      'scaleType'=scaleType,
      'dValues'=val,
      'timing'=timing
      )
    ) 
}


#' Get layer center
#' 
#' Compute the union of all geometry in a given layer and return the coordinate of the centroid.
#' 
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetLayerCentroid<-function(table=NULL,geomColumn='geom'){
  if(is.null(table)) stop('Missing arguments')

  if(mxDbExistsTable(table)){

    query <- sprintf(
      "SELECT ST_AsGeoJSON(
      ST_centroid(
        ST_Collect(
          %1$s
          )
        )
      ) AS t
    FROM %2$s" 
    , geomColumn
    , table
    )

    res <- mxDbGetQuery(query)$t %>% jsonlite::fromJSON()

    res <- as.list(res$coordinates)
    
    names(res)<-c("lng","lat")

    return(res)
  }

}

#' Get query extent, based on a pattern matching (character)
#' 
#' Search for a value in a  column (character data type) and return the extent if something is found.
#'
#' @param table Table/layer from which extract extent
#' @param geomColumn set geometry column
#' @return extent
#' @export
mxDbGetFilterCenter<-function(table=NULL,column=NULL,value=NULL,geomColumn='geom',operator="="){

  if(mxDbExistsTable(table)){
    valueOrig <- gsub("'","''",value)
    valueEscape <- paste0("(E",paste0("\'",valueOrig,"\'",collapse=","),")")
    if(length(value)>1){
      operator <- "in"
    }

    q = sprintf("
      SELECT ST_Extent(ST_MakeValid(%1$s))::text as data_extent 
      FROM (SELECT %1$s FROM %2$s WHERE %3$s %5$s %4$s ) t
      WHERE ST_isValid(%1$s)",
      geomColumn,
      table,
      column,
      valueEscape,
      operator
      )

    ext <- mxDbGetQuery(q)$data_extent

    if(noDataCheck(ext))return(NULL)


    res <- ext %>%
      gsub(" ",",",.) %>%
      gsub("[a-zA-Z]|\\(|\\)","",.)%>%
      strsplit(.,",")%>%
      unlist()%>%
      as.numeric()%>%
      as.list()

    names(res)<-c('lng1', 'lat1', 'lng2', 'lat2')

    return(res)
  }

}



#' Add geojson list or file to db postgis
#' @param geojsonList list containing the geojson data
#' @param geojsonPath path to the geojson
#' @param tableName Name of the postgis layer / table 
mxDbAddGeoJSON  <-  function(geojsonList=NULL,geojsonPath=NULL,tableName=NULL,archiveIfExists=T,archivePrefix="mx_archives",onProgress=function(x){}){

  conf <- mxGetDefaultConfig()
  d <-config[['pg']]


  # NOTE : no standard method worked.
  # rgdal::writeOGR (require loading in r AND did not provide options AND did not allow mixed geometry) or gdalUtils::ogr2ogr failed (did not set -f option!).

  gL <- geojsonList
  gP <- geojsonPath
  tN <- tableName
  timestamp <- format(Sys.time(),"%Y_%m_%d_%H_%M_%S")
  aN <- paste0(archivePrefix,"_",tN,"_",timestamp)
  tE <- mxDbExistsTable(tN)
  aE <- mxDbExistsTable(aN)


  if(!is.null(gL) && typeof(gL) == "list"){
    gP <- tempfile(fileext=".GeoJSON")
    gJ <- jsonlite::toJSON(gL,auto_unbox=T)
    write(gJ,gP)
  }

  #
  # Stop if file does not exists
  #
  stopifnot(file.exists(gP))
  #
  # overwrite handling
  #
  if(tE && isTRUE(archiveIfExists) && aE){

    aNameTable <- aN
    aNameSeq <- paste0(aN,"_seq")
    aNameIdx <- paste0(aN,"_idx")
    aNamePkey <- paste0(aN,"_pkey")

    qdb <- sprintf("
      ALTER TABLE IF EXISTS %1$s 
      RENAME TO %2$s;
      ALTER SEQUENCE IF EXISTS %1$s_gid_seq 
      RENAME TO %3$ ;
      ALTER INDEX IF EXISTS %1$s_geom_geom_idx
      RENAME TO %4$ ;
      ALTER INDEX IF EXISTS %1$s_pkey
      RENAME TO %5$s ;
      ",
      tN,
      aNameTable,
      aNameIdx,
      aNameSeq,
      aNamePkey
      )

    mxDbGetQuery(qdb) 
  }
  if(aE){
    stop("Archive requested but already existing ! ArchiveName =  %a",aN)
  }else{

    #
    # Import into db
    #


    nFeatures <- mxDbGeojsonCountFeatures(gP) 

    if(nFeatures==0){
      stop("Can't get the number of features :( ")
    }

    tD <- sprintf("PG:dbname=%s host=%s port=%s user=%s password=%s",
      d$dbname,d$host,d$port,d$user,d$password
      )

    cmd = sprintf(
      "ogr2ogr \\
      -gt 1001 \\
      -t_srs \"EPSG:4326\" \\
      -s_srs \"EPSG:4326\" \\
      -geomfield \"geom\" \\
      -lco FID=\"gid\" \\
      -lco GEOMETRY_NAME=\"geom\" \\
      -lco SCHEMA=\"public\" \\
      -f \"PostgreSQL\" \\
      -overwrite \\
      -nln \"%1$s\" \\
      -nlt \"PROMOTE_TO_MULTI\" \\
      \'%2$s\' \\
      \'%3$s\' \\
      \"OGRGeoJSON\""
      , tN
      , tD
      , gP
      )

    system(cmd,wait=F)

  }

}


mxDbGeojsonCountFeatures <- function(path){
  nFeatures <- 0

  try(silent=T,{
    if(file.exists(path)){
      cmdCount <- sprintf("grep -o '\"Feature\"'  %1$s | wc -l",path)
      nFeatures <- system(cmdCount, intern=T)
      
      if(!noDataCheck(nFeatures)){
        nFeatures = as.numeric(nFeatures) 
    }}
  })

  nFeatures
}



#' List existing table from postgresql
#'
#' Shortcut to create a connection, get the list of table and close the connection, using a dbInfo list. 
#'
#' @param dbInfo Named list with dbName,host,port,user and password
#' @export
mxDbListTable<- function(){
  res <- dbListTables(mxDbAutoCon())
  on.exit({
    if(exists("con")) mxDbClearResult(con)
  })
  return(res)
}

#' Check if table exists in postgresql
#'
#' Shortcut to create a connection, and check if table exists. 
#'
#' @param table Name of the table to check
#' @export
mxDbExistsTable<- function(table){

  if(is.null(table)) return(FALSE)
  
  res <- dbExistsTable(mxDbAutoCon(),table)

  on.exit({
    if(exists("con")) mxDbClearResult(con)
  })

  return(res)
}


#' Check if mx view name exists in postgresql
#'
#' Shortcut to create a connection, and check if table exists. 
#'
#' @param viewName view name to check
#' @export
mxDbExistsViewTitle <- function(title,country,languages=NULL){

  if(noDataCheck(title)) return(FALSE)

  viewsTable <- config[["pg"]][["tables"]][["views"]]


  if(is.null(languages)){
   languages = config[["languages"]][["list"]]
  }

  language <- paste(sprintf("data@>'{\"title\":{\"%1$s\":\"%2$s\"}}' IS TRUE",languages,title),collapse=" OR ")

  sql <- sprintf("
    SELECT EXISTS(
      SELECT id FROM \"%1$s\" t1 
      WHERE (%2$s) 
      AND country = '%4$s'
      AND date_modified = (
          SELECT MAX(date_modified)
          FROM %1$s t2
          WHERE t2.id = t1.id
          )
      );",
    viewsTable,
    language,
    title,
    country
    )
 
  res <- mxDbGetQuery(sql)

  return(isTRUE(res$exists))
}


#' List existing column from postgresql table
#'
#' Shortcut to get column name for a table
#'
#' @param table {character} table name
#' @param avoid {vector} notIn names to remove
#' @export
mxDbGetLayerColumnsNames <- function(table,notIn=NULL){
  query <- sprintf("select column_name as res from information_schema.columns where table_schema='public' and table_name='%s'",
    table
    )
  res <- mxDbGetQuery(query)$res
  
  if(!is.null(notIn)){
    res <- res[!res %in% notIn]  
  }


  return(res)
}

#' List existing column type from postgresql table
#'
#' Shortcut to get column type for a table
#'
#' @param table Name of the table to evaluate
#' @export
mxDbGetColumnsTypes <- function(table){
  query <- sprintf("select data_type as res from information_schema.columns where table_schema='public' and table_name='%s'",
    table
    )
  res <- mxDbGetQuery(query)$res

  return(res)
}




#' Add data to db
#'
#' 
#'
mxDbAddData <- function(data,table){

  stopifnot(class(data)=="data.frame")
  stopifnot(class(table)=="character")

  con <- mxDbAutoCon()

  tAppend <- FALSE
  tExists <- FALSE

  tExists <- mxDbExistsTable(table)

  if(tExists){
    tNam <- sort(tolower(names(data)))
    rNam <- sort(tolower(mxDbGetLayerColumnsNames(table)))
    if(!isTRUE(identical(tNam,rNam))){
      wText <- sprintf("mxDbAddData: append to %1$s. Name(s) not in remote table: '%2$s', remote name not in local table '%3$s'",
        table,
        paste(tNam[!tNam %in% rNam],collapse="; "),
        paste(rNam[!rNam %in% tNam],collapse="; ")
        )
      stop(wText)
    }else{
      tAppend = TRUE
    }
  }
  dbWriteTable(con, name=table, value=data,append=tAppend, row.names=F )
  on.exit({
    if(exists("con")) mxDbClearResult(con)
  })
}



mxDbTimeStampFormater <- function(ts){
  if(!isTRUE("POSIXct" %in% class(ts))) stop("need a POSIXct object")
  ts <- format(ts,"%d-%m-%Y %H:%M:%S")
  sprintf("to_timestamp('%1$s','dd-mm-yyyy hh24:mi:ss')",ts)
}


mxDbAddRow <- function(data,table){

  tExists <- mxDbExistsTable(table)
  if(!tExists) stop(sprintf("mxDbAddRow : table %s does not exists",table))

  if(!is.list(data)) data <- as.list(data)

  data <- data[!names(data) == 'pid']
  tName <- names(data)
  tClass <- sapply(data,class)
  rName <- mxDbGetLayerColumnsNames(table)

  if(!all(tName %in% rName)){
    wText <- sprintf("mxDbAddData: append to %1$s. Name(s) not in remote table: '%2$s', remote name not in local table '%3$s'",
      table,
      paste(tName[!tName %in% rName],collapse="; "),
      paste(rName[!rName %in% tName],collapse="; ")
      )
    stop(wText)


  }  # handle date
  dataProc <- lapply(data,function(x){
    
    switch(class(x)[[1]],
      "list"={
        sprintf("'%s'",mxToJsonForDb(x))
      },
      "character"={
        sprintf("'%1$s'",gsub("'","''",x))
      },
      "POSIXct"={
        mxDbTimeStampFormater(x)
      },
      "logical"={
        tolower(x)
      },
      "numeric"={
        sprintf("%i::numeric",x)
      },
      "integer"={
        sprintf("%i::integer",x)
      },
      sprintf("'%1$s'",x)
      )
      })


  q <- sprintf(
    "INSERT INTO %1$s (%2$s) VALUES (%3$s)",
    table,
    paste(paste0("\"",tName,"\""),collapse=","),
    paste(dataProc,collapse=",")
    )

  mxDbGetQuery(q)


}

mxDbAddRowBatch <- function(df,table){

  stopifnot(is.data.frame(df))
  stopifnot(mxDbExistsTable(table))

  for(i in 1:nrow(df)){
    dat <- df[i,]
    mxDbAddRow(dat,table)
  }

}


mxDbClearResult <- function(con=NULL,allCon=FALSE){

  conAll <- list()

  if(allCon){
    conAll <- dbListConnections(PostgreSQL())
  }

  if(!is.null(con)){
    conAll <- c( con, conAll ) 
  }


  if(noDataCheck(conAll)) return()


  suppressWarnings({

    results <- unlist(sapply(conAll,dbListResults,simplify=F))

    mxDebugMsg(sprintf("mxDbClearResult, number of result found= %s",length(results)))

    if(length(results)>0){
      closed <- sapply(results,dbClearResult)
    }

  })

}


#' Write spatial data frame to postgis
#'
#' Convert spatial data.frame to postgis table. Taken from https://philipphunziker.wordpress.com/2014/07/20/transferring-vector-data-between-postgis-and-r/
#'
#' @param spatial.df  Spatial  data frame object
#' @param schemaname Target schema table
#' @param tablename Target table name
#' @param overwrite Overwrite if exists
#' @param keyCol Set new primary key
#' @param srid Set the epsg code / SRID
#' @param geomCol Set the name of the geometry column
mxDbWriteSpatial <- function(spatial.df=NULL, schemaname="public", tablename, overwrite=FALSE, keyCol="gid", srid=4326, geomCol="geom") {


  mxDbDropLayer(tablename)

  con <- mxDbAutoCon()
  # Create well known text and add to spatial DF
  spatialwkt <- writeWKT(spatial.df, byid=TRUE)
  spatial.df$wkt <- spatialwkt

  # Add temporary unique ID to spatial DF
  spatial.df$spatial_id <- 1:nrow(spatial.df)

  # Set column names to lower case
  names(spatial.df) <- tolower(names(spatial.df))

  # Upload DF to DB
  data.df <- spatial.df@data
  rv <- dbWriteTable(con, c(schemaname, tablename), data.df, overwrite=overwrite, row.names=FALSE)


  # Create geometry column and clean up table
  schema.table <- paste(schemaname, ".", tablename, sep="")
  query1 <- sprintf("ALTER TABLE %s ADD COLUMN %s GEOMETRY;", schema.table, geomCol)
  query2 <- sprintf("UPDATE %s SET %s = ST_GEOMETRYFROMTEXT(t.wkt) FROM %s t  WHERE t.spatial_id = %s.spatial_id;",
    schema.table, geomCol, schema.table, schema.table)
  query3 <- sprintf("ALTER TABLE %s DROP COLUMN spatial_id;",schema.table)
  query4 <- sprintf("ALTER TABLE %s DROP COLUMN wkt;",schema.table)
  query5 <- sprintf("SELECT UpdateGeometrySRID('%s','%s','%s',%s);",schemaname,tablename,geomCol,srid)


  er <- dbGetQuery(con, statement=query1)
  er <- dbGetQuery(con, statement=query2)
  er <- dbGetQuery(con, statement=query3)
  er <- dbGetQuery(con, statement=query4)
  er <- dbGetQuery(con, statement=query5)




  if(!is.null(keyCol)){
    query6 <- sprintf("ALTER TABLE %s ADD COLUMN %s SERIAL PRIMARY KEY;", schema.table, keyCol)
    er <- dbGetQuery(con, statement=query6)
  }

  on.exit({
    if(exists("con"))  mxDbClearResult(con)
  })
}
#' Get user info
#' @param email user email
#' @param userTable DB users table
#' @return list containing id, email and data from the user
#' @export 
mxDbGetUserInfoList <- function(id=NULL,email=NULL,userTable="mx_users"){

  emailIsGiven <- !is.null(email)
  idIsGiven <- !is.null(id)
  col <- "id"

  if(
    (emailIsGiven && idIsGiven) ||
      (!emailIsGiven && !idIsGiven) 
    ) stop("Get user details : one of id or email should be provided.")

  if(emailIsGiven) {
    col <- "email"
    id <- paste0("'",email,"'")
  }

  quer <- sprintf(
    "SELECT id,email,data::text as data 
    FROM %1$s
    WHERE %2$s = %3$s
    LIMIT 1 
    ",
    userTable,
    col,
    id
    )

  res <- as.list(mxDbGetQuery(quer))
  if(length(res)<1){
    res <- list()
  }else{
    res$data <- jsonlite::fromJSON(res$data,simplifyVector=FALSE)
  }
  class(res) <- c(class(res),"mxUserInfoList")
  return(res)
}



#WHERE s.role#>>'{\"role\"}' in %2$s 
mxDbGetUserByRoles <- function(roles="user", userTable="mx_users"){
  roles <- paste0("(",paste0("'",roles,"'",collapse=","),")")
  quer <- sprintf("
    SELECT * FROM 
    (  
      SELECT id,email,a.role#>>'{\"project\"}' as project,a.role#>>'{\"role\"}' as role
      FROM (
        SELECT id,email,jsonb_array_elements(data#>'{\"admin\",\"roles\"}') AS role 
        FROM %1$s 
        WHERE jsonb_typeof(data#>'{\"admin\",\"roles\"}') = 'array'
        ) a 
      UNION
      SELECT id,email,key as project, value as role FROM 
      (
        SELECT id,email,(jsonb_each_text(data#>'{\"admin\",\"roles\"}')).* 
          FROM %1$s
        WHERE jsonb_typeof( data#>'{\"admin\",\"roles\"}') = 'object'
        ) b 
      ) c 
    WHERE role  in %2$s 
    "
    , userTable
    , roles
    )
  mxDbGetQuery(quer)
}


#' Add 
mxDbCreateUser <- function(
  email=NULL,
  timeStamp=Sys.time()
  ){

  conf <- mxGetDefaultConfig()

  dataUserDefault = conf[["users"]][["data"]][["public"]]
  dataUserSuperuser = conf[["users"]][["data"]][["superUser"]]
  userTable = conf[["pg"]][["tables"]][["users"]]
  userNameDefault = conf[["users"]][["defaultName"]]

  stopifnot("POSIXct" %in% class(timeStamp))
  stopifnot(mxEmailIsValid(email))
  stopifnot(mxDbExistsTable(userTable))


  # check if the db does not hold any user
  # empty db means : first time we launch it.
  # first user is always a superuser
  emptyDb <- isTRUE(
    0 == mxDbGetQuery(
      sprintf(
        "SELECT count(id) FROM %s"
        , userTable
        )
      )
    )

  if(emptyDb){
    # first is superuser
    dat <- dataUserSuperuser
  }else{
    # .. then default
    dat <- dataUserDefault
  }

  stopifnot(length(dat)>0)

  #
  # Set username based on the user table sequence.
  #
  getCurId <- sprintf(
    "SELECT last_value as id FROM public.%s_id_seq"
    , userTable
    )
  nextId <- mxDbGetQuery(getCurId,onError=function(x){stop(x)})

  # quick check on what we get is what we expect
  if( nrow(nextId) > 0 && 'id' %in% names(nextId) ){
    nextId <- nextId$id + 1
  }else{
    stop("Error in mxDbCreateUser")
  }
  # create default name 
  userName <- sprintf(
    "%s_%s"
    , userNameDefault
    , nextId
    ) 

  newUser = list(
    username        = userName,
    email           = email,
    key             = randomString(),
    validated       = TRUE,
    hidden          = FALSE,
    date_validated  = timeStamp,
    date_last_visit = timeStamp,
    data            = mxToJsonForDb(dat)
    )

  mxDbAddRow(newUser,userTable)

}


mxDbSaveView <- function(id=NULL,type=c("vt","wms","geojson"), country=NULL, editor=NULL, target="public", date=NULL, data=NULL){
}


#' Create pg compatible version of json, from a R list
#' @param {list} listInput List to send in a pg table
#' @export
mxToJsonForDb<- function(listInput){
  jsonlite::toJSON(listInput,auto_unbox=TRUE,simplifyVector = FALSE) %>%
    gsub("[\x09\x01-\x08\x0b\x0c\x0e-\x1f\x7f]"," ",.)%>%
    gsub("'","''",.)%>%
    as.character()
}


#' Drop layer and associated views
#' @param layerName Layer to remove
#' @export
mxDbDropLayer <- function(layerName){

  idSource <- mxDbGetQuery(sprintf("
    SELECT id 
    FROM mx_sources 
    WHERE id='%1$s'"
  , layerName
  ))$id

  idView <- mxDbGetQuery(sprintf("
    SELECT id
    FROM mx_views
    WHERE data#>>'{\"source\",\"layerInfo\",\"name\"}' = '%1$s'"
  , layerName))$id


  existsTable <- isTRUE(mxDbExistsTable(layerName))
  existsEntry <- !noDataCheck(idSource)
  existsViews <- !noDataCheck(idView)


  if(existsTable){
    mxDbGetQuery(sprintf("DROP table %1$s",layerName))
  }

  if(existsEntry){ 
    for(i in idSource){ 
      mxDbGetQuery(sprintf("DELETE FROM mx_sources WHERE id='%1$s'",i))
    }
  }

  if(existsViews){ 
    for(i in idView){ 
      mxDbGetQuery(sprintf("DELETE FROM mx_views WHERE id='%1$s'",i))
    }
  }

  return(
    list(
      idSources = idSource,
      idView = idView  
      )
    )

}

#' Helper to update a value in a data jsonb column in db and reactUser$data, given a path
#' @param reactUser  mapx reactives user values, containing 'data' item
#' @param value Value to update, at a given path
#' @param path Path to reach the value to update, in both db mx_users->data and reactUser$data$data
#' @export
mxDbUpdateUserData <- function(reactUser,path,value){

  stopifnot(!noDataCheck(path))
  stopifnot(!noDataCheck(value))
  stopifnot(is.reactivevalues(reactUser))

  conf <- mxGetDefaultConfig()

  userTableName <- conf[["pg"]][["tables"]][["users"]]
  #
  # Check last value
  #
  valueOld <- .get(
    li = reactUser$data$data,
    path = path
    ) 
  #
  # Check if this is different than the current country
  #

  isDiff <- isTRUE(!identical(valueOld[names(value)],value))

  if( isDiff ){
    #
    # Save
    #
    mxDbUpdate(
      table=userTableName,
      idCol='id',
      id=reactUser$data$id,
      column='data',
      path = path,
      value = value
      )
  }
}


#' Get layer geom types
#' @param table {character} Layer name
#' @param geomColumn {character} Geometry column name
#' @export
mxDbGetLayerGeomTypes <- function(table=NULL,geomColumn="geom"){

  if(is.null(table)) stop('Missing table name')

  if(mxDbExistsTable(table)){

    q <- sprintf("
      SELECT count(*) AS count, ST_GeometryType(%1$s)::text as geom_type 
      FROM %2$s
      GROUP BY  ST_GeometryType(%1$s)"
      , geomColumn
      , table
      )

    res <- mxDbGetQuery(q)

    res$geom_type = gsub(".*[pP]oint.*","point",res$geom_type)
    res$geom_type = gsub(".*[lL]ine.*","line",res$geom_type)
    res$geom_type = gsub(".*[pP]olygon.*","polygon",res$geom_type)
  
    res <- aggregate(count~geom_type, sum, data=res)
    
    return(res)
  
  }

}

#' Get column summary
#' @param table {character} Layer name
#' @param column {character} Variable name
mxDbGetColumnSummary <- function( table, column, geomColumn="geom", geomType=NULL ){

  if(!tolower(column) %in% tolower(mxDbGetLayerColumnsNames(table))) return(list())

  filter <- ""

  if(!noDataCheck(geomType)){
  filter = sprintf("WHERE ST_GeometryType(\"%1$s\") ~* '.*%2$s.*'",geomColumn,geomType)
  }



  qTable <- sprintf(
    "SELECT count(\"%1$s\") AS count,\"%1$s\" AS values
    FROM \"%2$s\"
    %3$s
    GROUP BY \"%1$s\"
    "
    , column
    , table
    , filter
    )


  # number of row
  qCountRows <- sprintf(
        "SELECT count(*) AS count
        FROM %1$s 
        %3$s"
        , table
        , column
        , filter
        )
      
    # number of distinct
   qCountDistinct <- sprintf(
        "SELECT COUNT(DISTINCT(%2$s)) as count
        FROM %1$s 
        %3$s"
        , table
        , column
        , filter
        )

    # number of null
    qCountNull <-sprintf(
        "SELECT count(*) as count 
        FROM (SELECT * FROM %1$s WHERE %2$s IS NULL ) t2
        %3$s"
        , table
        , column
        , filter
        )
 
  out <- list()
  out$table <- mxDbGetQuery(qTable,stringAsFactors=T)
  out$numberOfRow <- mxDbGetQuery(qCountRows)$count
  out$numberOfNull <- mxDbGetQuery(qCountNull)$count 
  out$numberOfDistinct <- mxDbGetQuery(qCountDistinct)$count
  out$type <- ifelse(is.numeric(out$table$values),"number","string")

 return(out)

}


#' Get layer time column
#' @param layer Layer name to analyze
#' @export 
mxDbGetLayerTimeVariables <- function(layer){

  out = list()

  varLayer = mxDbGetLayerColumnsNames(
    table=layer
    )

  varTime <- config[[c("variables","time")]]

  varTime <- varTime[ varTime %in% varLayer ]

  return(varTime)

}

#' Get layer time extent using map-x time column
#' @param layer Layer name to analyze
#' @export 
mxDbGetLayerTimeExtent <- function(layer){

  out = list()

  varTime <- mxDbGetLayerTimeVariables(layer)

  if(length(varTime) > 0 ){
 
    if(length(varTime)==2){
      t0 <- varTime[[1]]
      t1 <- varTime[[2]]
    }else{
      t0 <-varTime[[1]]
      t1 <-varTime[[1]]
    }

    q <- sprintf("
      SELECT 
      MIN(%1$s) as min,
      MAX(%2$s) as max
      FROM %3$s
      WHERE %1$s > -9e10 AND %2$s > -9e10
      "
      , t0
      , t1
      , layer
      )

    res <- mxDbGetQuery(q)
    out <- as.list(mxDbGetQuery(q))

  }

  return(out)
}

#' Get object count over time using map-x time column
#' @param layer Layer name to analyze
#' @export 
mxDbGetLayerTimeDensity <- function(layer){

  out = list()

  varTime <- mxDbGetLayerTimeVariables(layer)

  if(length(varTime) > 0 ){

    q <- sprintf("
      SELECT 
      extract(year from to_timestamp(%2$s)) as year, count(*) as n 
      FROM %1$s 
      WHERE extract(year from to_timestamp(mx_t0)) IS NOT NULL AND mx_t0 > -9e10
      GROUP by extract(year from to_timestamp(mx_t0)) 
      ORDER BY extract(year from to_timestamp(mx_t0)) DESC
      "
      , layer
      , varTime[[1]]
      )

    res <- mxDbGetQuery(q)
    out <- as.list(mxDbGetQuery(q))

  }

  return(out)

}



#' Get source summary data
#' @param layer {string} Table to query
#' @param variable {string} Column of interest
#' @param variables {string} Other columns names
#' @param geomType {string} Geometry type
#' @export
mxDbGetLayerSummary <- function(layer=NULL,variable=NULL, geomType=NULL,language="en"){

  if(is.null(geomType)){
    geomType = mxDbGetLayerGeomTypes(layer)[1,"geom_type"]
  }

  summary  <- mxDbGetColumnSummary(
    table = layer,
    column = variable,
    geomColumn = "geom",
    geomType = geomType
    )


  summary$timeVariables <- mxDbGetLayerTimeVariables(layer)
  summary$timeExtent <- mxDbGetLayerTimeExtent(layer)
  summary$timeDensity <- mxDbGetLayerTimeDensity(layer)
  summary$extent <- mxDbGetLayerExtent(layer)
  summary$centroid <- mxDbGetLayerCentroid(layer)
  summary$layerMeta <- mxDbGetLayerMeta(layer)
  summary$layerName <- layer 
  summary$variableName <- variable
  #summary$variableNames <- variables
  summary$geomType <- geomType
  summary$sampleData <- head(summary$table$values,10)

  class(summary) <- c(class(summary),"mxSourceSummary")

  #
  # ui
  #
  ui = list()

  summaryHtml <- listToHtmlSimple(
    list(
      "source_sum_sample"=paste(summary$sampleData,collapse="; "),
      "source_sum_n_distinct"=summary$numberOfDistinct,
      "source_sum_n_row"=summary$numberOfRow,
      "source_sum_n_null"=summary$numberOfNull,
      "source_sum_variable_type"=summary$type,
      "source_sum_geom_type"=d(summary$geomType,language,web=F),
      "source_time_range"=summary$timeExtent,
      "source_meta"=summary$layerMeta
      ),
    lang=language,
    dict=.get(config,c("dictionaries","schemaMetadata"))
    )

  list(
    `list` = summary,
    `html` = summaryHtml
    )

}


#' Get layer meta stored in default layer table
#' @param layer Postgis layer stored in layer table. Should have a meta field.
#' @export
mxDbGetLayerMeta <- function(layer){
 
  layerTable <- .get(config,c("pg","tables","sources"))

  if(!mxDbExistsTable(layerTable)){
    mxDebugMsg("mxGetMeta requested, but no layer table available")
    return()
  }
  if(!mxDbExistsTable(layer)){
    mxDebugMsg("mxGetMeta requested, but no layer available")
    return()
  }
  # query
  query <- sprintf(
    "SELECT data#>'{\"meta\"}' meta FROM %1$s WHERE \"id\"='%2$s'",
    layerTable,
    layer
    )

  res <- mxDbGetQuery(query)$meta
  res <- res[length(res)]

  if(isTRUE(nchar(res)>0)){
    res <- jsonlite::fromJSON(res,simplifyVector=F, simplifyDataFrame=F)
  }else{
    res <- list()
  }
  return(res)
}

##' Get view data as list
##' @param idView Vector of view id(s) for which to retrieve data
##' @export
#mxDbGetViewData <- function(idView){

  #if(is.null(idView)) return()

  #dat <- list()
  #conf <- mxGetDefaultConfig()
  #tableName <- conf[["pg"]][["tables"]][["views"]]

  ## test if style is requested

  ## search for most version of the view only, filter by country, target and id.
  #q <- gsub("\n|\\s\\s+"," ",sprintf("
      #SELECT json_agg(row_to_json(t)) res from (
        #SELECT 
        #t1.id, 
        #t1.country, 
        #t1.editor,
        #t1.type, 
        #t1.target, 
        #t1.date_modified, 
        #t1.data
        #FROM %1$s t1 
        #WHERE date_modified = (
          #SELECT MAX(date_modified)
          #FROM %1$s t2
          #WHERE t2.id = t1.id
          #)
        #AND t1.id ='%2$s' 
        #limit 1
        #) t
      #"
      #, tableName
      #, idView
      #)
    #)

  #res <- na.omit(mxDbGetQuery(q)$res)

  #if(length(res)>0){ 
    #dat <- fromJSON(res,simplifyDataFrame=F)[[1]]
  #}

  #return(dat)
#}

#' Encrypt or decrypt data using postgres pg_sym_encrypt
#' 
#' 
#'
#' @param data vector, list or data.frame to encrypt or decrypt
#' @param ungroup boolean : ungroup the data and apply the encryption on individual item.
#' @param key Encryption key
#' @return encrypted data as list
#' @export
mxDbEncrypt <- function(data,ungroup=FALSE,key=NULL){


  if(is.null(key)){ 
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  if(any(c("list","json") %in% class(data))){
    if(ungroup){
      data <- sapply(data, mxToJsonForDb)
    }else{
      data <- mxToJsonForDb(data)
    }
  }

    q <- sprintf(
      "(SELECT mx_encrypt('%1$s','%2$s') as res)",
      data,
      key
      )
    if(length(q)>1) q <- paste(q,collapse=" UNION ALL ")

    # Execute querry
    res <- as.list(mxDbGetQuery(q))$res

    return(res)
}
#' @rdname mxDbEncrypt
mxDbDecrypt <- function(data=NULL,key=NULL){

  if(is.null(key)){ 
    conf <- mxGetDefaultConfig()
    key <- conf$pg$encryptKey
  }

  out <- try({
    # if vector containing encrypted data is empty (or not a vector.. see noDataCheck) OR
    # if nchar is not even (should be hex data)
    if(
      is.null( data ) ||
      !all( sapply( data, length ) > 0) ||  
      !all( sapply( data, is.character )) ||
      !all( sapply( data, nchar )%%2 == 0)
    ) return()

    query <- sprintf("SELECT mx_decrypt('%1$s','%2$s') as res",
      data,
      key
      )
    if(length(query)>1) query <- paste(query,collapse=" UNION ALL ")

    res <- mxDbGetQuery(query)$res

    if(!is.null(res) && !is.na(res)) {
      # if we convert r object as json with mxDbEncrypt, we may want 
      # retrieve decrypt no json based text.
      isJSON <- all(sapply(res,jsonlite::validate))

      if(isJSON){
      if(length(res)>1) {
        out <- lapply(res,jsonlite::fromJSON,simplifyVector=T)
      }else{ 
        out <- jsonlite::fromJSON(res,simplifyVector=T)
      }
      }else{
       out <- res
      }
    }

  },silent=T)
  return(out)
}

#' Get group table for users
#' @param idFilter optional filter of vector containing ids
mxDbGetUsersGroups<-function(idFilter=NULL){
  filter = ""
  if(!is.null(idFilter)) filter = paste(sprintf("WHERE id=%s",idFilter),collapse="OR")
q = sprintf(
    "SELECT id, grp 
    FROM ( 
      SELECT id, jsonb_array_elements_text(data_admin->'group') as grp 
      FROM mx_users
      %1$s 
      ) t",
    filter
    )
res = mxDbGetQuery(q)
return(res)
}


#' Overlaps analysis 
#' 
#' Use a mask to get overlaps over a layer
#' @export
mxDbAnalysisOverlaps <- function(inputBaseLayer,inputMaskLayer,outName,dataOwner="mapxw",sridOut=4326,varToKeep="gid"){

  msg <- character(0)

  if(!mxDbExistsTable(outName)){

    # get geometry type. 
    # NOTE: qgis seems confused if the geom type is not updated.
    geomType <- mxDbGetQuery(
      sprintf("select GeometryType(geom) as gt FROM %s limit 1",
        inputBaseLayer
        )
      )$gt

    varBase <- paste0(sprintf("a.%s",varToKeep[!varToKeep %in% "geom"]),collapse=",")

        #ALTER TABLE %1$s
        #ALTER COLUMN geom TYPE geometry(%7$s, %5$i) 
        #USING ST_SetSRID(geom,%5$i);
    createTable <- gsub("\n|\\s+"," ", sprintf("
        CREATE TABLE %1$s AS
        SELECT
        %2$s,
        b.gid AS mask_gid,
        CASE 
        WHEN ST_Within(a.geom,b.geom) 
        THEN a.geom
        ELSE ST_Multi(ST_Intersection(a.geom,b.geom)) 
        END AS geom
        FROM %3$s a
        JOIN %4$s b
        ON ST_Intersects(a.geom, b.geom);

        ALTER TABLE %1$s OWNER TO %6$s;
        DO
        $$
        BEGIN
        IF not EXISTS (
          SELECT attname 
          FROM pg_attribute 
          WHERE attrelid = (
            SELECT oid 
            FROM pg_class 
            WHERE relname = '%1$s'
            ) AND attname = 'gid') THEN
        ALTER TABLE %1$s ADD COLUMN gid BIGSERIAL PRIMARY KEY;
        ELSE
        raise NOTICE 'gid already exists';
        END IF;
        END
        $$
        "
        ,outName
        ,varBase
        ,inputBaseLayer
        ,inputMaskLayer
        ,sridOut
        ,dataOwner
        ,geomType
        )
      )
    mxDbGetQuery(createTable) 
  }
}


#' Get number of overlapping features
mxDbGetOverlapsCount <- function(layerA,layerB,geom="geom"){

  sql <- mxCleanString(sprintf("
    SELECT count(*) 
    FROM 
    (
    SELECT a.gid from
    %1$s a 
    JOIN  %2$s b  
    ON ST_Intersects(a.%3$s, b.%3$s)
    WHERE a.%3$s && b.%3$s
    GROUP BY a.gid
    ) temp
    "
    , layerA
    , layerB
    , geom
    ))

  return(mxDbGetQuery(sql)$count)

}




#' Get session duration for given id
#' @param id Integer id of the user
#' @return list with H,M,S since last visit
#' @export
mxDbGetSessionDurationHMS <- function(id=NULL){
  if(is.null(id)) return()
  res <- list(H=0,M=0,S=0)

  sessionStart <- mxDbGetQuery(sprintf(
      "SELECT date_last_visit as start FROM mx_users WHERE id = %1$s"
      , id
      )
    )$start

  if(noDataCheck(sessionStart)) return()

  sessionDurSec <- difftime(Sys.time(),sessionStart,units="secs")
  sessionPosix <- .POSIXct(sessionDurSec,tz="GMT")
  res$H <- format(.POSIXct(sessionPosix,tz="GMT"),"%H")
  res$M <- format(.POSIXct(sessionPosix,tz="GMT"),"%M")
  res$S <- format(.POSIXct(sessionPosix,tz="GMT"),"%S")

  return(res)

}

#' Check if an email is known and active
#'
#' Check in a standard mapx database if an email/user exists
#'
#' @param email map-x user email
#' @param userTable name of the table
#' @return boolean exists
#' @export
mxDbEmailIsKnown <- function(email=NULL,userTable="mx_users",active=TRUE,validated=TRUE){

  if(is.null(email)) return()
  email <- as.character(email)
  q <- sprintf(
    "SELECT count(\"id\")
    FROM %1$s 
    WHERE email='%2$s'
    AND validated='%3$s'
    AND hidden='%4$s' ",
    userTable,
    email,
    ifelse(validated,"true","false"),
    ifelse(!active,"true","false")
    )
  res <- mxDbGetQuery(q)
  return(isTRUE(nrow(res)>0 && res$count > 0))
}


mxDbGetEmailFromId <- function(id,userTable="mx_users"){
  mxDbGetQuery(sprintf("SELECT email from mx_users where id = 2",id))$email
}





