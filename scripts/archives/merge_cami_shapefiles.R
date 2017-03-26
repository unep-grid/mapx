library(maptools)
library(rio)


#
# Set opt 
#
opt = list(
  shapeParentDir = "/Users/fxi/ownCloud/MAPX owncloud/InputData/CAMI/SHAPEFILES_DECEMBRE_2014/", 
  shapeOutDir = "/Users/fxi/ownCloud/MAPX owncloud/InputData/CAMI/2014_merged/2014_merged",
  geojsonOutFile = "/Users/fxi/ownCloud/MAPX owncloud/InputData/CAMI/2014_merged/2014_merged.geojson",
  excelFile = "/Users/fxi/ownCloud/MAPX owncloud/InputData/CAMI/DROITS VALIDES_NIF_2015_ITIE.xlsx",
  shapeCompanyName = "Parties",
  excelCompanyName = "TITULAIRES",
  nifColumn = "NIF"
  )

#' Substitute ponctiation and non-ascii character
#'
#' Take a string and convert to ascii string with optional transliteration ponctuation convertion. 
#'
#' @param str String to evaluate
#' @param sep Replace separator
#' @param rmTrailingSep Logical argument : no trailing separator returned
#' @param rmLeadingSep Logical argument : no leading separator returned
#' @param rmDuplicateSep Logical argument : no consecutive separator returned
#' @export
subPunct<-function(str,sep='_',rmTrailingSep=T,rmLeadingSep=T,rmDuplicateSep=T,rmNumber=T,useTransliteration=T){
  if(useTransliteration){
    str<-gsub("'|`",'',iconv(str, to='ASCII//TRANSLIT'))
  }
  if(rmNumber){
    gsubPattern = "[[:punct:]]+|[[:blank:]]+|[0-9]+"
  }else{
    gsubPattern = "[[:punct:]]+|[[:blank:]]"
  }
  res<-gsub(gsubPattern,sep,str)#replace punctuation by sep
  res<-gsub("\n","",res)
  if(rmDuplicateSep){
    if(nchar(sep)>0){
      res<-gsub(paste0("(\\",sep,")+"),sep,res)# avoid duplicate
    }
  }
  if(rmLeadingSep){
    if(nchar(sep)>0){
      res<-gsub(paste0("^",sep),"",res)# remove trailing sep.
    }
  }
  if(rmTrailingSep){
    if(nchar(sep)>0){
      res<-gsub(paste0(sep,"$"),"",res)# remove trailing sep.
    }
  }
  res
}


#
# Merge
#

allShapeDir = list.dirs(opt$shapeParentDir)
i = 0
res = list()

for (d in allShapeDir) {
  shp = list.files(d,pattern = ".shp$")
  if( isTRUE(nchar(shp)>0) ){
  shpSp = readShapePoly(file.path(d,shp))
  if (i > 0) {
    res = sp::rbind.SpatialPolygonsDataFrame(res,shpSp,makeUniqueIDs = T)
  }else{
    res = shpSp
  }
  i = i + 1;
  }
}

#
# Merge with excel file containing NIF
#

# import data
nifData <-  import(opt$excelFile)

# merge based on licence number
resNif <- merge(res,nifData,by.x="Code",by.y="N° PERMIS")

# get a parties names 
resNif$mx_holder <- as.factor(apply(
  resNif[,c("Parties","TITULAIRES")]@data
  , 1
  , function(x){
    res = character(0)
    if(!is.na(x[1])){
      res = x[1]
    }else{
      res = x[2]
    }
    toupper(subPunct(res," "))
  }
))
# get only useful columns
resNif <- resNif[,c("NIF","mx_holder","Code","Licence_","Commodit","Status","DATE D'OCTROI","DATE D'EXPIRATION")]

# Set standardised names
names(resNif) <- c("mx_nif","mx_holder","mx_licence","mx_type","mx_commodity","mx_status","mx_date_start","mx_date_end")
resNif$mx_date_start <- as.numeric(resNif$mx_date_start)
resNif$mx_date_end <- as.numeric(resNif$mx_date_end)

# Write shapefile
#writeSpatialShape(resNif,opt$shapeOutDir)

# Export geojson
write(geojsonio::geojson_json(resNif),opt$geojsonOutFile)





