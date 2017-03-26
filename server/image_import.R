

observeEvent(input$imageUpload,{
  library(base64)
  library(digest)

  idUser <- reactUser$data$id
  dirWeb <- file.path("images",idUser)

  dir <- config[[c("resources","images")]]
  dir <- file.path(dir,idUser)

  if(!dir.exists(dir)){
    dir.create(dir)
  }

  data <- input$imageUpload

  #
  # Temp image, copy to user dir in images
  #
  img <- unlist(strsplit(data$img,","))[2]
  tf <-  tempfile()
  write(img,tf)
  df <- base64::decode(tf)
  idMd5 <- digest(img)

  imgSize <- list(
    "@sm" = 400,
    "@md" = 800,
    "@lg" = 1200
    )

  srcSet = ""

  src  = sprintf("%1$s%2$s"
    , file.path(dirWeb,idMd5)
    , names(imgSize)[2]
    )

  for(a in names(imgSize)){  

    tryCatch({

      size <- imgSize[[a]]

      fileName <- sprintf("%1$s%2$s.jpg"
        , idMd5
        , a
        )

      resize <- sprintf("convert %1$s -strip -quality 86 -resize '%2$s>' %3$s"
        , df
        , size
        , file.path(dir,fileName)
        )

      system(resize)

      srcSet <- sprintf("%1$s %2$s %3$sw,"
        , srcSet
        , file.path(dirWeb,fileName)
        , size
        )

    },error = function(cond){
      print(cond)
    })

  }

  session$sendCustomMessage("mxSetImageAttributes",list(
      id = data$id,
      atr = list(
        src = src,
        srcset= srcSet
        )
      ))
})
