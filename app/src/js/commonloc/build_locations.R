#
# Build map of bounding box for all known iso3 code and  m49 from dictionnary.
# - require a working api service
# - to be run from within a interactive session of an app service with code accessible with write access 
# - only work from the root of the project
library(jsonlite)
fileOut <- 'src/js/commonloc/locations.json'; 
fileCountries <- 'src/data/dict/dict_countries.json';
folderDict <- 'src/data/dict/'

exists <- file.exists(fileOut);

if(exists){
  #stop('Common location file already exists');
}

cntry <- lapply(read_json(fileCountries),`[[`,'id')
m49_files <- list.files(folderDict,'dict_m49*',full.names=T)
m49 <- unlist(rlang::flatten(lapply(m49_files,function(f){a<-read_json(f);return(lapply(a,`[[`,'id'))})))
m49 <- m49[grepl('^m49',m49)]
codes <- c(cntry,m49)
res <- lapply(codes,function(c){
  q <- sprintf('http://api:3030/get/bbox?code=%s',c)
  dat <- NULL
  tryCatch({
    dat <- fromJSON(q)
  },error=function(e){
    warning(sprintf('Invalid code %s ',c))
  })
  return(dat)
})

names(res) <- codes 

# Remove nulls and invalid (custom region, non country iso3 code..)
res <- res[sapply(res, function(r){!is.null(r) && length(r)==4})]

write_json(res,fileOut, pretty=TRUE);


