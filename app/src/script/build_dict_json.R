#
# Build dicts for the client
#

library("jsonlite")

pathDest <- "src/built"
dir.create(pathDest,showWarnings=F)

r = function(path){
  jsonlite::fromJSON(path)
}


dicts <- rbind(
  r("src/data/dict_main.json"),
  r("src/data/dict_languages.json")
  )

langs <- names(dicts)
langs <- langs[!langs  %in% "id"]

for(l in langs){
  j = jsonlite::toJSON(dicts[,c('id','en',l)])
  write(j,sprintf("%1$s/dict_%2$s.json",pathDest,l))
}
