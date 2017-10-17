#
# Script to test if translation for a given key and language
# in the dictionary exists and set it if needed.
#
# Run interactively
if(!interactive()) stop("not meant to be run non-interactively")

#
# Import a, old file, b, new file
#
a <- read.csv("src/data/dict_schema_source.csv",stringsAsFactors=F)
b <- read.csv("src/data/dict_schema_source_mod.csv",stringsAsFactors=F)

#
# Check for emptyness
#
isEmpty <- function(val=NA){
  return(isTRUE(is.null(val))||isTRUE(is.na(val))||!isTRUE(is.character(val))||isTRUE(nchar(val)<1))
}

#
# for a given language, loop current ids in a and update value if b as something
#
lang =  "es"

for(i in b$id){
  valB = b[b$id==i,lang]
  valA = a[a$id==i,lang]

  print(valB)
  print(valA)
  if(isEmpty(valA) && !isEmpty(valB)){
    a[a$id==i,lang] <- valB
  }
}


write.csv(a,"src/data/dict_schema_source.csv",row.names=F)
