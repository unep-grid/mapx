library(geojsonio)
library(maptools)
setwd("~/Documents/unep_grid/map-x/scripts")


province <- readShapePoly("~/ownCloud/MAPX owncloud/InputData/Platform-Data/COD/DEVELOPMENT/cod__development__2010__a.shp")

province_meta <- read.csv("../../data/cod/cod__soc__meta_province.csv")
province_data <- read.csv("../../data/cod/cod__soc__variable_province.csv")


province$code <- sapply(province$Province,function(x){ province_meta$province[province_meta$fre == x] })

province$province <- province$Province

# remove orignal data
province$Province <- NULL
province$UNEMPLO_R <- NULL
province$POVERTY_R <- NULL


# standard mapx for join numeric data set ?

# id { string 20 } joining id
# date { string 10} date string. YYYY or YYYY-MM or YYYY-MM-DD
# country { string 3 } iso3 country code using ISO_3166-1_alpha-3
# class {string 10} class : soc, pol, env, nrg, ...
# variable { string 10 } variable id  idx_eco, idx_unemp, ...
# value { numeric 20 } numeric value : 12, 10.2, 12, 12

# view or table "interval enabled"

# geom { geometry }
# mx_d_min { string 10 } date string YYYY or YYYY-MM or YYYY-MM-DD
# mx_d_max { string 10 } date string YYYY or YYYY-MM or YYYY-MM-DD
# val { char|num }


# view or table "date enabled"

# geom { geometry }
# mx_d_all {string 10} date string YYYY or YYYY-MM or YYYY-MM-DD
# val { char | num }



#
# Example, extract all year for "cod__soc__idx_eco_abo_reg" (abonnement à la régie des eaux)
#
v <- "cod__soc__idx_eco_abo_reg"
p <- province
d <- province_data[province_data$variable==v,]

for( i in 1:length(years) ){
  y <- years[i]
  tmp <- p
  
  sub <- d[d$year == y,c("province","value")]
  res <- merge(tmp@data,sub,by.x="code",by.y="province")
  row.names(res) = row.names(tmp@data)
  tmp@data <-res
  tmp@data["mx_t0"] <- as.integer(as.POSIXct(sprintf("%s-01-01",y),tz="GMT"))
  tmp@data["mx_t1"] <- as.integer(as.POSIXct(sprintf("%s-12-31",y),tz="GMT"))

  if(i==1){
    out <- tmp 
  }else{ 
    out <- rbind(out,tmp, makeUniqueIDs = TRUE)
  }
}

mxDbWriteSpatial(spatial.df=out,tablename=v)


timeNow = Sys.time()

tbl <- list(
  country = "COD",
  layer = "cod__soc__idx_eco_abo_reg",
  class = "soc",
  tags = "idx_eco_abo_reg",
  editor = 2,
  reviewer = 2,
  revision = 0,
  validated = TRUE,
  archived = FALSE,
  date_created = timeNow,
  date_archived = as.POSIXct(as.Date(0,origin="1970/01/01")),
  date_modified = timeNow,
  date_validated = timeNow,
  meta = mxToJsonForDb(list(year="1996-2012",source="Annaire Statistique 2014, République Démocratique du Congo, Ministère du Plan et Révolution de la Modernité, Institut National de la Statistique, juillet 2015")),
  target = mxToJsonForDb(list("self"))
  )

mxDbAddRow(tbl,"mx_layers")

#geojson_write(out,file="~/Downloads/test_out.geojson")
