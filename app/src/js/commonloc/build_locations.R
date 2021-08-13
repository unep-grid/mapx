#
# Build map of bounding box for all known iso3 code and  m49 from dictionnary.
# - require a working api service
# - to be run from within a interactive session of an app service with code accessible with write access 
# - only work from the root of the project
library(jsonlite)
exists <- file.exists('src/js/commonloc/locations.json');

if(exists){
  stop('Common location file already exists');
}

cntry <- lapply(read_json('src/data/dict/dict_countries.json'),`[[`,'id')
m49_files <- list.files('src/data/dict/','dict_m49*',full.names=T)
m49 <- unlist(rlang::flatten(lapply(m49_files,function(f){a<-read_json(f);return(lapply(a,`[[`,'id'))})))
m49 <- m49[grepl('^m49',m49)]
codes <- c(cntry,m49)
res <- lapply(codes,function(c){
  q <- sprintf('http://api:3030/get/bbox?code=%s',c)
  dat <- NA
  tryCatch({
    dat <- fromJSON(q)
  },error=function(e){
    warning(sprintf('Invalid code %s ',c))
  })
  return(dat)
})
names(res) <- codes 

res <- na.omit(res)

write_json(res,'src/js/commonloc/locations.json')


