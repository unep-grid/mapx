#
# Init config
#
config <- list()

#
# Libary manager
#
library(checkpoint)

dir.create("~/.mapx/.checkpoint",showWarnings=F,recursive=T)

checkpoint(
  snapshotDate = "2016-11-30",
  checkpointLocation = normalizePath("~/.mapx/",mustWork=F)
  )



