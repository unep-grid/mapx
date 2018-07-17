#
# Build dicts for the client
#

library("jsonlite")

pathDest <- "src/built"


r = function(path){
  read.csv(path,stringsAsFactors=FALSE)
}


dicts <- rbind(
  r("src/data/dict_main.csv"),
  r("src/data/dict_languages.csv")
  #r("src/data/dict_countries.csv"),
  )

langs <- names(dicts)
langs <- langs[!langs  %in% "id"]

for(l in langs){
  j = jsonlite::toJSON(dicts[,c('id','en',l)])
  write(j,sprintf("%1$s/dict_%2$s.json",pathDest,l))
}
