library(sp)
library(maptools)
library(rio)


dat = data.frame()

cntry <- readShapePoly("/Users/fxi/Documents/unep_grid/map-x/archives/data/world/countriesUN/2012_UNGIWG_cnt_ply_01.shp")
cntryEiti <- import("web/data/eiti/countries_eiti.csv") 


for(i in 1:length(cntry)){
  dat[i,"iso3"] = cntry@data[i,"iso3code"]
  dat[i,"lng"] = cntry@polygons[[i]]@labpt[1] 
  dat[i,"lat"] = cntry@polygons[[i]]@labpt[2]
}


dat <- na.omit(dat);

pending <- c("COD","COL","AFG","NGA")

dat$pending <- FALSE

dat[dat$iso3 %in% pending,"pending"] <- TRUE

dat$zoom = mean(cntryEiti$zoom)

dat[dat$iso3 %in% pending,"pending"] <- TRUE

for(i in 1:nrow(cntryEiti)){
  code =  cntryEiti[i,"code_iso_3"]
  zoom =  cntryEiti[i,"zoom"]

  print(code)
  print(zoom)

  dat[dat$iso3 == code ,"zoom"] <- cntryEiti[i,"zoom"]
}


write.csv(dat,"web/data/countries/countries.csv",row.names=F)
