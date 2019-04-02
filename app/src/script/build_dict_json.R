#
# Build dicts for the client
#

library("jsonlite")

pathDest <- "src/built"
dir.create(pathDest,showWarnings=F)

r = function(path){
  jsonlite::fromJSON(path)
}

message("Read dictionaries")

dicts <- rbind(
  r("src/data/dict_main.json"),
  r("src/data/dict_languages.json")
  )

langs <- names(dicts)
langs <- langs[!langs  %in% "id"]
langDefault <- "en"

for(l in langs){
  if( l == langDefault ){
    j = jsonlite::toJSON(dicts[,c('id',langDefault)])
  }else{
    j = jsonlite::toJSON(dicts[,c('id',langDefault,l)])
  }
  message(paste("Write dict for ",l))
  write(j,sprintf("%1$s/dict_%2$s.json",pathDest,l))
}

message("Dictionaries written")
