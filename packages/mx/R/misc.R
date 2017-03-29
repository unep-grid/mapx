
#' Map-x helper functions
#'
#' Map-x core functions
#'
#'
#' @docType package
#' @name mapxhelper 



#' Load external ui file value in shiny app
#'
#' Shortcut to load external shiny ui file
#'
#' @param path Path to the file
#' @export
mxSource <- function(path){
  source(path,local=TRUE)$value
}


#' Deparse a list from a json file path
#' @param path {string} Path to the json file
#' @export
mxJsonToListSource <- function(path){
  paste(deparse(mxJsonToList(path),control=NULL),collapse="\n")
}





#' Use system grep to return list of file matching grep exp
#' @param exp {character} Regex expression
#' @param fixed {boolean} search for fixed string
#' @param ext {string} search for file with this extension
#' @export
whereIs <- function(exp,fixed=TRUE,ext=NULL){
  cmd <- ifelse(fixed,"grep -RFl","grep -REL")
  if(!is.null(ext)){
    cmd <- sprintf("%1$s %2$s",cmd,paste(sprintf("--include \\*.%1$s",ext),collapse=""))
  }
  system(sprintf("%1$s '%2$s' .",cmd,exp))
}

#' Check for "empty" value
#' 
#' Empty values = NULL or, depending of storage mode
#' - data.frame : empty is 0 row
#' - list : empty is length of 0 at first level or second level
#' - vector (without list) : empty is length of 0 OR first value in "config$defaultNoDatas" OR first value is NA or first value as character length of 0
#'
#' @param val object to check : data.frame, list or vector (non list). 
#' @param debug Boolean : Should the function return timing ?. 
#' @return Boolean TRUE if empty
#' @export
noDataCheck <- function( val = NULL, debug = FALSE ){
  
  if(debug) mxTimer("start","noDataCheck")
  

  noDatas <- config$noData;

  res = isTRUE(
    is.null(val)
    ) ||
  isTRUE(
    isTRUE( is.data.frame(val) && nrow(val) == 0 ) ||
    isTRUE( is.list(val) && (
      ( length(val) == 0 ) || 
      ( all(sapply(val, noDataCheck )))
    )
    ) ||
    isTRUE( !is.list(val) && is.vector(val) && (
        length(val) == 0 || 
          val[[1]] %in% noDatas || 
          is.na(val[[1]]) || 
          nchar(val[[1]]) == 0 )
      )
    )
  if(debug)  mxTimer("stop")

  return 
  res
}

#' Concatenate text
#' @param x {string} left string or number
#' @param y {string} right string or number
#' @export
"+" = function(x,y) {
    if(is.character(x) || is.character(y)) {
        return(paste(x , y, sep=""))
    } else {
        .Primitive("+")(x,y)
    }
}

#' Get default config from global env
#' @export
mxGetDefaultConfig <- function(){
  get("config",envir=.GlobalEnv)
}

#' Source additional server files
#' @param files Vector of files to source
#' @export
mxSourceSrv <- function(files=NULL){

   conf <- mxGetDefaultConfig()
  if(noDataCheck(files)) return;

  for(f in files){
    source(file.path(conf[["srvPath"]],f), local=parent.frame())
  }

}


#' Set web ressource path
mxSetResourcePath <- function(resources){
  if(is.null(resources)){
    conf <- mxGetDefaultConfig()
    res <- conf[["resources"]]
  }else{
    res =  resources
  }
  for(i in names(res)){
    shiny::addResourcePath(i,res[[i]])
  }
}


#' Extract label and template from dictionnary
#' @param id {string} Id of element to extract
#' @param lang {string} Two letters code for given language
#' @return Translated value
#' @note
#'    memoisiation test
#'    10 search  on 172'000 entries
#'    for(i in 1:12){config[['dict']]=rbind(config[['dict']],config[['dict']])}
#'    system.time({test = sapply(rep("hello_world",10),function(x){d(x,"fr")})})
#'    before :  0.012 [s]
#'    after : 0.001 [s]
#' @export
mxDictTranslate <- function(id=NULL,lang=NULL,langDefault="en",namedVector=FALSE,dict=NULL){
  out <- NULL
 
  if(is.null(dict)){
    dict = .get(config,"dict")
  }else{
    dict = rbind(dict,.get(config,"dict"))
  }

  d <- dict

  if(is.null(lang)){
    lang <- config[["languages"]][["list"]][[1]]
    if(is.null(lang)) lang <- langDefault
  }

  # test for missing language
  langExists = c(lang,langDefault) %in% names(d)
  if(!all(langExists)) stop(sprintf("Language %s not found",c(lang, langDefault)[!langExists]))

  if(is.null(id)){
    #
    # All id 
    #
    if(lang!=langDefault){
      #
      # Output all items for both default and selected language
      #
      out <- d[,c("id",c(langDefault,lang))]
    }else{
      #
      # Output all items for selected language
      #
      out <- d[,c("id",c(lang))]
    }
  }else{ 
    if( length(id)>1 || namedVector ){
      #
      # Multiple id
      # 
      if( length(lang) !=1 ) stop("if id > 1, language should be 1")

      sub <- d[d$id %in% id, c("id",lang,langDefault)]
      
      out = id
      dat = vapply(id,
        function(x){

          r = d[d$id == x, c(lang,langDefault)]
          o = r[,lang]
          if(noDataCheck(o)) o = r[,langDefault]
          if(noDataCheck(o)) o = x
          return(paste(o,collapse="/"))
        },
        "")
      names(out) = dat 

    }else{
      #
      # Single id
      #
      out <- d[d$id == id,lang][1]
      if(noDataCheck(out)) out <- d[d$id == id,langDefault][1]
      if(noDataCheck(out)) out <- id
    }
  }
  return(out)
}
# shortcut
d <- mxDictTranslate

#' Create layer named list from layer table
#' @param layerTable {table} table with columns "id", "title_{language}", "title_en" 
#' @param language {character} Language code
mxGetLayerNamedList <- function( layerTable, language ){

  language <- ifelse(noDataCheck(language),"en",language)

  out <- as.list(layerTable$id)

  titleLang <- layerTable[,sprintf("title_%s",language)]
  titleEn <- layerTable[,"title_en"]

  for(i in 1:length(titleLang)){
     if(noDataCheck(titleLang)) titleLang[i] <- titleEn[i]
  }

  date <- layerTable$date_modified
 
  namesTitle <- sprintf("%1$s ( %2$s )",titleLang,format(date,"%Y-%m-%d"))

  names(out) <- namesTitle

  return(as.list(out))

}

#' Translate geom type name
#' @param {data.frame} geomTypes Geometry type data.frame as returned by mxDbGetLayerGeomTypes
#' @param {character} language Language code
mxSetNameGeomType <- function(geomTypeDf,language){

  geomType <- geomTypeDf$geom_type
  geomCount <- geomTypeDf$count

  geomType <- d(geomType,language,namedVector=TRUE)

  names(geomType) <- sprintf("%1$s ( n= %2$s )",names(geomType),geomCount) 

  return(as.list(geomType))

}


#' Get style list
#' @param directory containgin stles
#' @export
mxGetViewList <- function(){
  conf <- mxGetDefaultConfig()
  stylePath <- file.path(conf[["ressources"]][["views"]])
  if( ! dir.exists(stylePath )) stop(sprintf("Directory %s not found",stylePath))
  list.files(stylePath,"(^poly|^poin|^lines|^concess).*\\.json$")
}


#' Toggle disabling of given button, based on its id.
#'
#' Action or other button can be disabled using the attribute "disabled". This function can update a button state using this method.
#'
#' @param id Id of the button. 
#' @param session Shiny session object.
#' @param disable State of the button
#' @export
mxToggleButton <- function(id,disable=TRUE,warning=FALSE,session=shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    disable = disable,
    warning = warning
    )
  session$sendCustomMessage(
    type="mxButtonToggle",
    res
    )
}

#' Send and compile templates.
#'
#' @param listTemplates {list} named list containing html. list("id"="HTML")
#' @param session Shiny session object.
#' @export
sendTemplates <- function(listTemplates,session=shiny:::getDefaultReactiveDomain()) {
  mxDebugMsg("Send templates to client")
  session$sendCustomMessage(
    type="mxSetTemplates",
    listTemplates
    )
}

#' Recursive search and filter on named list
#' @param li List to evaluate
#' @param column Named field to search on (unique)
#' @param operator Search operator (">","<","==",">=","<=","!=","%in%")
#' @param search Value to search
#' @param filter Named field to keep
#' @return list or named vector if filter is given
#' @export
mxRecursiveSearch <- function(li,column="",operator="==",search="",filter=""){
  res <- NULL
  stopifnot(operator %in% c('>','<','==','>=','<=','!=','%in%'))
  expr <- paste("li[[column]]",operator,'search')
  if( is.list(li)  && length(li) > 0 ){ 
    if( column %in% names(li) &&  eval(parse(text=expr)) ){
      return(li)
    }else{     
      val <- lapply(li,function(x) mxRecursiveSearch(
          li=x,
          search=search,
          operator=operator,
          column=column,
          filter=filter
          )
        )
      val <- val[sapply(val,function(x) !is.null(x))]
      if(length(val)>0){
        if(is.null(filter) || nchar(filter)==0){
          res <- val
        }else{
          res <- unlist(val)
          res <- res[grepl(paste0(filter,collapse='|'),names(res))]
        }
        return(res)
      }
    }
  }
}


#' Remove extension
#' @param file {string} File name
#' @return file without extension
#' @export
removeExtension <- function(file){
 file <- basename(file)
 sub("([^.]+)\\.([[:alnum:]]+$)", "\\1",file)
}


#' Print debug message
#'
#' Print a defaut debug message with date as prefix. NOTE: this function should take a global parameter "debug" and a log file.
#'
#' @param m Message to be printed
#' @return NULL
#' @export
mxDebugMsg <- function(text=""){ 
  options(digits.secs=4)
  cat(sprintf("{ %1$s } %2$s \n",Sys.time(), text))
}


#' Time interval evaluation
#' @param action "start" or "stop" the timer
#' @param timerTitle Title to be displayed in debug message
#' @return
mxTimer <- function(action=c("stop","start"),timerTitle="Mapx timer"){
  now <- Sys.time()
  action <- match.arg(action)
  if(isTRUE(!is.null(action) && action=="start")){
    .mxTimer <<- list(time=now,title=timerTitle)
  }else{
    if(exists(".mxTimer")){
      diff <- paste(round(difftime(now,.mxTimer$time,units="secs"),3))
      mxDebugMsg(paste(.mxTimer$title,diff,"s"))
    }
  }
  return(now)
}


#' Test for internet connection. 
#' The idea is to reach google with a ping and determine if there is a full packet response without loss
#' 
#' @param host String. Host name to ping
#' @export
mxCanReach <- function(server="google.com",port=80){

  req <- sprintf(
    "if nc -z %1$s %2$s; then echo '1'; else echo '0';fi;",
    server,
    port
    )

  any( system(req,intern=T) == "1")

}



#' Create a chartRadar in a canvas element.
#'
#' Search the dom for an id a get drawing context, create a new chart object and config it with data.
#'
#' @param session Shiny reactive session
#' @param main Main label
#' @param compMain Comparative value label
#' @param id Id of the canvas
#' @param idLegend Id of the legend
#' @param labels Labels for value and comparative values
#' @param value Values
#' @param compValues Comparative values
#' @export
mxUpdateChartRadar <- function(
  session=shiny::getDefaultReactiveDomain(),
  main,
  compMain,
  id,
  idLegend,
  labels,
  values,
  compValues
  ){
  stopifnot(is.vector(values) || is.vector(label))

  colorMain = 'rgba(119,119, 119, 0.3)'
  colorMainBorder = 'rgba(119,119, 119, 0.5)'
  colorComp = 'rgba(255, 164, 0, 0.3)'
  colorCompBorder = 'rgba(255, 164, 0, 0.5)'



  res <- list()
  res$id <- id
  res$labels <- labels
  res$idLegend <- idLegend
  res$dataMain <-  list(
    label = main,
    backgroundColor = colorMain,
    borderColor = colorMainBorder,
    pointBackgroundColor = colorMain,
    pointBorderColor = colorMainBorder,
    pointHoverBackgroundColor =colorMain,
    pointHoverBorderColor = colorMainBorder,
    data = values
    )
  res$dataComp <- list(
    label = compMain,
    backgroundColor = colorComp,
    borderColor = colorCompBorder,
    pointBackgroundColor = colorComp,
    pointBorderColor = colorCompBorder,
    pointHoverBackgroundColor =colorComp,
    pointHoverBorderColor = colorCompBorder,
    data = compValues
    )

  session$sendCustomMessage(
    type="updateChart",
    res
    )
}

#' Display a header message in console
#' @param {character} text Text to display
#' @export
mxConsoleText <- function(text=""){
  nc <- nchar(text)
  lc <- 79-nc
  mc <- lc %/% 2
  bar <- paste(rep("-",mc),collapse="")
  out <- paste0(bar,text,bar,"\n",sep="")
  cat(out)
}


#' Send a message to js console
#' @param {character} text Text to send
#' @session {reactive} Shiny reactive object
#' @export
mxDebugToJs<-function(text,session=getDefaultReactiveDomain()){
  res <-   session$sendCustomMessage(
    type = "mxDebugMsg",
    message = jsonlite::toJSON(text)
    )
}


#
#' Update existing panel
#'
#' Use output object to update the panel with a known id. E.g. for updating uiOutput("panelTest"), use mxUpdatePanel with panelId "panelTest"
#'
#' @param panelId Id of the existing panel
#' @param session Shiny reactive object of the session
#' @param ... Other mxPanel options
#' @export
mxUpdatePanel <- function(panelId=NULL,session=shiny:::getDefaultReactiveDomain(),...){
  session$output[[panelId]] <- renderUI(mxPanel(id=panelId,...))
}





mxCatchHandler <- function(type="error",message="",session=shiny::getDefaultReactiveDomain()){

  isLocal = Sys.info()[["user"]] != "shiny"

  if(!exists("cdata")){
    cdata = list()
  }

  errorSummary <- list(
    type = type,
    message = message,
    date = Sys.time(),
    cdata = cdata
    )

  if(type == "error"){
  #
  # outut message
  #
  session$output$panelAlert <-renderUI({
    mxPanelAlert(
      "error",
      title,
      message=tagList(p("Something went wrong, sorry!"))
      )
  })
  }


  if( isLocal ){

    #
    # If is local, send to js console
    #
    mxDebugToJs(errorSummary)

  }else{

    #
    # else send an email
    #
    title =  paste("[ mx-issue-",type," ]")

    mxSendMail(
      from = .get(config,c("mail","bot"),
        to = .get(config,c("mail","admin")),
        subject = title,
        body =  mxHtmlMailTemplate(
          title = title,
          content =  listToHtmlClass(
            errorSummary
            )
          )
        )
      )
  }
}




#' Catch errors
#'
#' Catch errors and return alert panel in an existing div id.
#'
#' @param title Title of the alert
#' @param session Shiny session object
#' @param debug Boolean. Return also message as alert.
#' @param panelId Id of the output element
#' @export
mxCatch <- function(
  title,
  expression,
  session=shiny:::getDefaultReactiveDomain(),
  debug = TRUE,
  logToJs = TRUE
  ){
  #
  # try this and catch errors !
  # 
  tryCatch({
    expression
  },error = function(e){

    emsg <- as.character(e)

    mxCatchHandler(
      type = "error",
      message = list(
        message = emsg
        )
      )


  },warning = function(e){
    emsg <- as.character(e)

    mxCatchHandler(
      type = "warning",
      message = list(
        message = emsg
        )
      )

  },message = function(m){
    if(debug){
      mxCatchHandler(
        type = "message",
        message = m
        )
    }
  })

}



#' Random string generator
#' 
#' Create a random string with optional settings.
#' 
#' @param prefix Prefix. Default = NULL
#' @param suffix Suffix. Default = NULL
#' @param n Number of character to include in the random string
#' @param sep Separator for prefix or suffix
#' @param addSymbols Add random symbols
#' @param addLetters Add random letters (upper and lowercase)
#' @param splitIn Split string into chunk, with separator as defined in splitSep
#' @param splitSep Split symbos if splitIn > 1
#' @return  Random string of letters, with prefix and suffix
#' @export
randomString <- function(prefix=NULL,suffix=NULL,n=15,sep="_",addSymbols=F,addLetters=T,addLETTERS=F,splitIn=1,splitSep="_"){
  prefix <- subPunct(prefix,sep)
  suffix <- subPunct(suffix,sep)
  src <- 0:9

  if(splitIn<1) splitIn=1
  if(isTRUE(addSymbols)) src <- c(src,"$","?","=",")","(","/","&","%","*","+")
  if(isTRUE(addLetters)) src <- c(letters,src)
  if(isTRUE(addLETTERS)) src <- c(LETTERS,src)

  grp <- sort(1:n%%splitIn)

  rStr <- src %>% 
     sample(size=n,replace=T) %>%
      split(grp) %>%
      sapply(paste,collapse="") %>%
      paste(collapse=splitSep)

  c(prefix,rStr,suffix) %>%
  paste(collapse=sep)
}

#' Substitute ponctiation and non-ascii character
#'
#' Take a string and convert to ascii string with optional transliteration ponctuation convertion. 
#'
#' @param str String to evaluate
#' @param sep Replace separator
#' @param rmTrailingSep Logical argument : no trailing separator returned
#' @param rmLeadingSep Logical argument : no leading separator returned
#' @param rmDuplicateSep Logical argument : no consecutive separator returned
#' @export
subPunct<-function(str,sep='_',rmTrailingSep=T,rmLeadingSep=T,rmDuplicateSep=T,useTransliteration=T){
  if(useTransliteration){
    str<-gsub("'",'',iconv(str, to='ASCII//TRANSLIT'))
  }
  res<-gsub("[[:punct:]]+|[[:blank:]]+",sep,str)#replace punctuation by sep
  res<-gsub("\n","",res)
  if(rmDuplicateSep){
    if(nchar(sep)>0){
      res<-gsub(paste0("(\\",sep,")+"),sep,res)# avoid duplicate
    }
  }
  if(rmLeadingSep){
    if(nchar(sep)>0){
      res<-gsub(paste0("^",sep),"",res)# remove trailing sep.
    }
  }
  if(rmTrailingSep){
    if(nchar(sep)>0){
      res<-gsub(paste0(sep,"$"),"",res)# remove trailing sep.
    }
  }
  res
}


#' Toggle disabling of given button, based on its id.
#'
#' Action or other button can be disabled using the attribute "disabled". This function can update a button state using this method.
#'
#' @param id Id of the button. 
#' @param session Shiny session object.
#' @param disable State of the button
#' @export
mxActionButtonState <- function(id,disable=FALSE,warning=FALSE,session=shiny:::getDefaultReactiveDomain()) {
  res <- list(
    id = id,
    disable = disable,
    warning = warning
    )
  session$sendCustomMessage(
    type="mxSetButonState",
    res
    )
}


#' Send command on remote server through ssh
#'
#' Allow sending command on a remote server, e.g. Vagrant machine, using ssh. 
#'
#' @param cmd Command to send
#' @export
remoteCmd <- function(cmd){

  res <- NULL
  opt <- character(1)
  ssh <- mxGetDefaultConfig()[["ssh"]]

  # pars ssh option
  for(i in 1:length(ssh)){
    o <- ssh[i]
    opt <-  sprintf("%1$s -o '%2$s %3$s'",opt,names(o),o) 
  }

  cmdRemote <- sprintf("ssh %1$s %2$s %3$s",opt,ssh[["HostName"]],cmd)

  if(!noDataCheck(cmd) && !noDataCheck(cmdRemote)) res <- system(cmdRemote,intern=T)
  
  return(res)
}
#' Control ui access
#'  
#' UI  manager based on login info
#'
#' @param logged Boolean. Is the user logged in ?
#' @param roleNum Numeric. Role in numeric format
#' @param roleLowerLimit Numeric. Minumum role requirement
#' @param uiDefault TagList. Default ui.
#' @param uiRestricted TagList. Restricted ui.
#' @export
mxUiAccess <- function(logged,roleNum,roleLowerLimit,uiDefault,uiRestricted){
  uiOut <- uiDefault
  if(isTRUE(logged) && is.numeric(roleNum)){
    if(noDataCheck(roleLowerLimit))roleLowerLimit=0
    if(roleNum>=roleLowerLimit){
      uiOut<-uiRestricted
    }
  }
  return(uiOut)
}

#' Control visbility of elements
#' 
#' Display or hide element by id, without removing element AND without having element's space empty in UI. This function add or remove mx-hide class to the element.
#'
#' @param session Shiny session
#' @param id Id of element to enable/disable 
#' @param enable Boolean. Enable or not.
#' @export
mxUiHide <- function(id=NULL,class=NULL,disable=TRUE,hide=TRUE,hideClass="mx-hide",session=shiny:::getDefaultReactiveDomain()){



  out = jsonlite::toJSON(list(
      id = id,
      class = class,
      hide = hide,
      disable = disable,
      hideClass = hideClass
      ),auto_unbox=T)


  session$sendCustomMessage(
    type = "mxUiHide",
    out
    )

}

#' remove element by class or id
#' @param session default shiny session
#' @param class class name to remove
#' @param id id to remove
#' @export
mxRemoveEl <- function(session=getDefaultReactiveDomain(),class=NULL,id=NULL){

  if(is.null(class) && is.null(id)) return()

  sel <- ifelse(
    is.null(class),
    paste0('#',id),
    paste0('.',class)
    )

  res <- list(
    element = sel
    )

  session$sendCustomMessage(
    type="mxRemoveEl",
    res
    )

}

#' Control ui access
#' 
#' Use config$roleVal list to check if the curent user's role name can access to the given numeric role.
#' 
#' @param logged Boolean. Is the user logged in ?
#' @param roleName Character. Role in numeric format
#' @param roleLowerLimit Numeric. Minumum role requirement
#' @export
mxAllow <- function(logged,roleName,roleLowerLimit){
  conf <- mxGetDefaultConfig()
  allow <- FALSE
  if(noDataCheck(roleName))return(FALSE)
  roleNum = conf$rolesVal[[roleName]]
  if(isTRUE(logged) && is.numeric(roleNum)){
    if(noDataCheck(roleLowerLimit))roleLowerLimit=0
    if(roleNum>=roleLowerLimit){
      allow <- TRUE
    }
  }
  return(allow)
}



#' Set a checkbox button with custom icon.
#' 
#' Create a checkbox input with a select icon.
#'
#' @param id Id of the element
#' @param icon Name of the fontawesome icon. E.g. cog, times, wrench
#' @export
mxCheckboxIcon <- function(id,idLabel,icon,display=TRUE){
  visible <- "display:inline-block"
  if(!display)visible <- "display:none"
  tagList(
    div(id=idLabel,class="checkbox",style=paste(visible,';float:right;'),
      tags$label(
        tags$input(type="checkbox",class="vis-hidden",id=id),
        tags$span(icon(icon))
        )
      )
    )
}


#' encode in base64
#' @param text character string to encode
#' @export
mxEncode <- function(text){
  base64enc::base64encode(charToRaw(as.character(text)))
}
#' decode base64 string
#' @param base64text base64string encoded 
#' @export
mxDecode <- function(base64text){
  rawToChar(base64enc::base64decode(base64text))
}



#' Update text by id
#'
#' Search for given id and update content. 
#' 
#' @param session Shiny session
#' @param id Id of the element
#' @param text New text
#' @export
mxUpdateText<-function(id,text=NULL,ui=NULL,addId=FALSE,session=shiny:::getDefaultReactiveDomain()){
  if(is.null(text) && is.null(ui)){
    return(NULL)
  }else{
    if(is.null(ui)){
      textb64 <- mxEncode(text)
      val=list(
        id = id,
        txt = textb64,
        addId = addId
        )
      session$sendCustomMessage(
        type="mxUpdateText",
        val
        )
    }else{
      session$output[[id]] <- renderUI(ui)
    }
  }
}


#' Update value by id
#'
#' Search for given id and update value. 
#' 
#' @param session Shiny session
#' @param id Id of the element
#' @param  value New text value
#' @export
mxUpdateValue <- function(id,value,session=shiny:::getDefaultReactiveDomain()){
  if(is.null(value) || is.null(id)){
    return()
  }else{
    res <- list(
      id=id,
      val=value
      )
    session$sendCustomMessage(
      type="mxUpdateValue",
      res
      )
  }
}





#' Parse key value pair from text
#' @param txt unformated text with key value pair. eg. myKey = myValue
#' @return list of value
#' @export
mxParseListFromText <- function(txt){
  txt2 = txt %>%
    strsplit(.,"(\n\\s*)",perl=T) %>%
    unlist(.) %>%
    gsub("^\\s*([a-z]+?)\\s*=\\s+(.+?)$","\\1 = \"\\2\"",.) %>%
    paste(.,collapse=",")%>%
    paste("list(",.,")")%>%
    parse(text=.)%>%
    eval(.)
  return(txt2)
}


#' Create random secret
#'
#' Get a random string .
#'
#' @param n Number of character
#' @export
mxCreateSecret =  function(n=20){
  randomString(20)
}


#' Check if given email is valid
#' @param email String email address to verify
#' @return named logic vector
#' @export
mxEmailIsValid <- function(email=NULL){

  res = FALSE
  if(!noDataCheck(email)){
    email <- as.character(email)
    tryCatch({
      # regex expression
      # see http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address
      regex <- "([-!#-'*+/-9=?A-Z^-~]+(\\.[-!#-'*+/-9=?A-Z^-~]+)*|\"([]!#-[^-~ \\t]|(\\\\[\\t -~]))+\")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+"
      # if there is a match, return TRUE
      res <- sapply(email,function(e){
        isTRUE(grep(regex,x=e,perl=T)==1)
    })},error=function(x){
        return()
    })
  }
  return(res)
}



#' Save named list of value into cookie
#'
#' Note : don't use this for storing sensitive data, unless you have a trusted network.
#'
#' @param session Shiny session object. By default: default reactive domain.
#' @param cookie Named list holding paired cookie value. e.g. (list(whoAteTheCat="Alf"))
#' @param expireDays Integer of days for the cookie expiration
#' @param read Boolean. Read written cookie
#' @return NULL
#' @export
mxSetCookie <- function(
  cookie=NULL,
  expireDays=NULL,
  deleteAll=FALSE,
  reloadPage=FALSE,
  session=getDefaultReactiveDomain()
  ){

  cmd = list()
  cmd$domain <- session$url_hostname
  cmd$path <- session$url_pathname
  cmd$deleteAll <- deleteAll
  cmd$cookie <- cookie
  cmd$reload <- reloadPage

  cmd$expiresInSec <- expireDays * 86400

  session$sendCustomMessage(
    type="mxSetCookie",
    cmd
    )
}






##' Create a formated list of available palettes
##' @export
#mxCreatePaletteList <- function(){
  #pals <- RColorBrewer::brewer.pal.info
  ## Get palettes names
  #colsPals <- row.names(pals)
  ## create UI visible names 
  #palsName <- paste(
    #colsPals,
    #" (n=",pals$maxcolors,
    #"; cat=",pals$category,
    #"; ", ifelse(pals$colorblind,"cb=ok","cb=warning"),
    #")",sep="")
  ## put then together
  #names(colsPals) <- palsName
  ## return
  #return(colsPals)

#}


##' Create a formated list of country center from eiti countries table
##' @export
#mxEitiGetCountryCenter <- function(eitiCountryTable){
  ## Country default coordinates and zoom
  #iso3codes <- eitiCountryTable$code_iso_3
  ## Extract country center
  #countryCenter <- lapply(
    #iso3codes,function(x){
      #res=eitiCountryTable[iso3codes==x,c('lat','lng','zoom')]
      #res
    #}
    #)
  ## set names
  #names(countryCenter) <- iso3codes
  ## return
  #return(countryCenter)
#}


##' Create a formated list for selectize input from eiti countries table
##' @export
#mxEitiGetCountrySelectizeList <- function(eitiCountryTable){
  #eitiCountryTable$map_x_pending <- as.logical(eitiCountryTable$map_x_pending)
  #eitiCountryTable$name_ui <- paste(eitiCountryTable$name_un,'(',eitiCountryTable$name_official,')')
  #countryList <- list(
    #"completed" = NULL,
    #"pending"= as.list(eitiCountryTable[eitiCountryTable$map_x_pending,"code_iso_3"])  ,
    #"potential"= as.list(eitiCountryTable[!eitiCountryTable$map_x_pending,"code_iso_3"])
    #)
  #names(countryList$pending) = eitiCountryTable[eitiCountryTable$map_x_pending,"name_ui"]
  #names(countryList$potential) = eitiCountryTable[!eitiCountryTable$map_x_pending,"name_ui"]

  #return(countryList)
#}

#' Create WDI indicators list
#' @export
mxGetWdiIndicators <- function(){
  wdiIndicators <- WDIsearch()[,'indicator']
  names(wdiIndicators) <- WDIsearch()[,'name']
  wdiIndicators
}


#' String validation
#' 
#' Check if a string exists in a vector of string, if there is a duplicate, if contains at least n character, etc.. and update an existing div with a html summary. Return if the string is valid or not.
#' 
#' @param textTotest text to test against rules
#' @param existingTexts  Vector of existing text
#' @param idTextValidation Id of the ui element to update (id=example -> uiOutput("example"))
#' @param minChar Minimum character length
#' @param testForDuplicate Boolean test for duplicate.
#' @param testForMinChar Boolean test for minimum number of character
#' @param displayNameInValidation Boolean add text in validation text
#' @return boolean : valid or not
#' @export
mxTextValidation <- function(textToTest,existingTexts,idTextValidation,minChar=5,testForDuplicate=TRUE,testForMinChar=TRUE,displayNameInValidation=TRUE,existsText="taken",errorColor="#FF0000"){

  if(isTRUE(length(textToTest)>1)){
    stop("mxTextValidation only validate one input item")
  }

  isValid <- FALSE
  isDuplicate <- FALSE
  isTooShort  <- FALSE
  err <- character(0)

  if(testForDuplicate){
    itemExists <- isTRUE(tolower(textToTest) %in% tolower(unlist(existingTexts)))
  }
  if(testForMinChar){
    itemTooShort <- isTRUE(nchar(textToTest)<minChar)
  }


  err <- ifelse(itemExists,existsText,character(0))
  err <- c(err,ifelse(itemTooShort,sprintf("too short. Min %s letters",minChar),character(0)))
  err <- na.omit(err)

  if(!displayNameInValidation){
    textToTest = ""
  }

  if(length(err)>0){
    outTxt = (sprintf("<b style=\"color:%1$s\">(%2$s)</b> %3$s",errorColor,err,textToTest))
    isValid = FALSE
  }else{
    outTxt = (sprintf("<b style=\"color:#00CC00\">(ok)</b> %s",textToTest))
    isValid = TRUE
  }

  mxUpdateText(id=idTextValidation,text=HTML(outTxt))

  return(isValid)

}

mxErrorsToUi <- function(errors=logical(0),warning=logical(0),language="en"){
  stopifnot(is.logical(errors))
  stopifnot(is.logical(warning))

  errors <- errors[errors]
  warning <- warning[warning]

  errorCode <- names(errors)
  warningCode <- names(warning)

  errorList <- lapply(errorCode,function(e){
    tags$li(class="list-group-item mx-error-item",d(e,language))
    })
  warningList <- lapply(warningCode,function(w){
    tags$li(class="list-group-item mx-warning-item",d(w,language))
    })

  tags$ul(class="list-group mx-error-list-container",
    errorList,
    warningList
    )

}




#' function to read json and save as an object
mxSendJson <- function(pathToJson,objName,session=getDefaultReactiveDomain()){
  stopifnot(!is.null(pathToJson))
  stopifnot(!is.null(objName))
  if(file.exists(pathToJson)){
    res <- list()
    json <- readChar(pathToJson, file.info(pathToJson)$size)
    res$json <- json
    res$name <- objName
    session$sendCustomMessage(
      type="mxJsonToObj",
      message=res
      )
  }
}



#' mxHtmlMailTemplate 
#' 
mxHtmlMailTemplate <- function(title = NULL,subject=NULL,content=NULL ){


  if(is.null(title)) title = "mapx"
  if(is.null(subject)) subject = title
  if(is.null(content)) return("")

  template <- .get(config,c("templates","email","simple"))
  template <- gsub("\\{\\{content\\}\\}",content,template)
  template <- gsub("\\{\\{subject\\}\\}",subject,template)
  template <- gsub("\\{\\{title\\}\\}",title,template)
  
  return(template)

}



#' Send an email using local or remote 'mail' command
#' @param from String. Valid email for  sender
#' @param to String. Valid email for Recipient
#' @param body String. Text of the body
#' @param subject. String. Test for the subject 
#' @export
mxSendMail <- function( from=NULL, to=NULL, body="", subject="", wait=FALSE ){


  isLocal = Sys.info()[["user"]] != "shiny"
  
  if(is.null(from)){
    from <- .get(config,c("mail","bot"))
  }

  if(!all(
      c(mxEmailIsValid(from),
        mxEmailIsValid(to),
        isTRUE(is.character(body)),
        isTRUE(is.character(subject)),
        isTRUE(nchar(body)>0),
        isTRUE(nchar(subject)>0)
      )
    )) stop("mxSendMail : bad input")

  tempFile <- tempfile()

  body <- mxHtmlMailTemplate(
    title = subject, 
    subject = subject,
    content = body 
    )

  mailToSend = sprintf(
    paste("From: %1$s",
    "To: %2$s",
    "Subject: %3$s",
    "Content-Type: text/html",
    "MIME-Version: 1.0",
    "",
    "%4$s",sep="\n")
    , from
    , to
    , subject
    , body
    )
  
  write(mailToSend,tempFile)

  if( isLocal ){

    mxDebugMsg(mailToSend)

  }else{

  system(sprintf("cat %1$s | /usr/sbin/sendmail -t", tempFile),wait=wait)
  
  }

}

#' Extract value from a list given a path
#' @param listInput Input named list
#' @param path Path inside the list
#' @param keepNames Keep list names 
#' @return value extracted or NULL
#' @export
mxGetListValue <- function(listInput,path,flattenList=F){
  if(!is.list(listInput) || length(listInput) == 0) return()
  out = NULL
  res <- try(silent=T,{
    out <- listInput[[path]]
  })
  if(flattenList && !noDataCheck(out) && is.list(out)){
  
    out <- as.list(unlist(out,use.names=F))
  }
  return(out)
}
.get <- mxGetListValue

#' Set a value of a list element, given a path
#'
#' This function will update a value in a list given a path. If the path does not exist, it will be created. 
#' If the function find a non list element before reaching destination, it will stop.
#'
#' @param path vector with name of path element. e.g. `c("a","b","c")`
#' @param value value to update or create
#' @param level starting path level, default is 0
#' @param export
mxSetListValue <- function(listInput,path,value,level=0){
  level <- level+1 
  p <- path[c(0:level)]
  #
  # Create parsable expression to acces non existing list element
  #
  liEv = paste0("listInput",paste0(paste0("[[\"",p,"\"]]",sep=""),collapse=""))

  if(is.null(eval(parse(text=liEv)))){
    #
    # If the element does not exist, it's a list
    # 
    liSet = paste0(liEv,"<-list()")
    eval(parse(text=liSet))
  }
  if(level == length(path)){
    #
    # We reached destination, set value
    #
    listInput[[p]] <- value
  }else{
    #
    # If we encouter non-list value, stop, it's not expected.
    #
    if(!is.list(listInput[[p]])) stop(sprintf("Not a list at %s",paste(p,collapse=",")))
    listInput <- mxSetListValue(listInput,path,value,level)
  }
  return(listInput)
} 
.set <- mxSetListValue 

#' Return the highest role for a given user
#' @param project Project to look for
#' @param userInfo object of class mxUserInfoList produced with mxDbGetUserInfoList 
#' @export
mxGetMaxRole <- function(project,userInfo){

  stopifnot(isTRUE("mxUserInfoList" %in% class(userInfo)))

  levelProject <- 10
  levelWorld <- 10

  userRoles <- .get(userInfo,c("data","admin","roles"))
  conf <- mxGetDefaultConfig()
  roles <- conf[[c("users","roles")]]

  # NOTE: Backward compatibility with previous version.
  if("world" %in% names(userRoles)) {
  userRoles <- list(userRoles,list(
    project = "world",
    role = userRoles[["world"]]
    ))
  }
  if("AFG" %in% names(userRoles) ) {
  userRoles <- list(userRoles,list(
    project = "AFG",
    role = userRoles[["AFG"]]
    ))
  }
  if("COD" %in% names(userRoles) ) {
  userRoles <-list(userRoles,list(
    project = "COD",
    role = userRoles[["COD"]]
    ))
  }


  # get role for project
  roleInProject <- mxRecursiveSearch(
    li=userRoles,"project","==",project
    )[[1]]$role
  # Get role for world

  roleInWorld <- mxRecursiveSearch(
    li=userRoles,"project","==","world"
    )[[1]]$role
  
  hasRoleInProject <- !noDataCheck(roleInProject)
  hasRoleInWorld <- !noDataCheck(roleInWorld)

  if(!hasRoleInWorld && !hasRoleInWorld) stop("No role found!")

  if(hasRoleInProject){
    levelProject <- mxRecursiveSearch(
      li=roles,"role","==",roleInProject
      )[[1]]$level
  }

  if(hasRoleInWorld){
    levelWorld <- mxRecursiveSearch(
      li=roles,"role","==",roleInWorld
      )[[1]]$level
  }

  levelUser <- min(c(levelWorld,levelProject))


  out  <- mxRecursiveSearch(conf[[c("users","roles")]],"level","==",levelUser)[[1]]

  return(out)
}


#' Trim string at given position minus and put ellipsis if needed
#' @param str String to trim if needed
#' @param n Maximum allowed position. If number of character exceed this, a trim will be done
#' @return Trimed string
#' @export
mxShort <- function(str="",n=10){
  stopifnot(n>=4)
  if(nchar(str)>n){
    sprintf("%s...",strtrim(str,n-3))
  }else{
    return(str)
  }
}


#' Remove multiple space or new line char
#' @param {character} string go clean
mxCleanString <- function(str){
    gsub("\\s+"," ",str)
}


#' Fast test file reading
#' @param {character} fileName Name of the text file to read
#' @param {boolean} clean Should the function remove end-of-line char and more-than-one space ?
mxReadText <- function(fileName,clean=FALSE){
  out <- readChar(fileName, file.info(fileName)$size)

  if(clean){
    out <- mxCleanString(out)
  }

  return(out)

}

#' update vt view definition
#' @param {list} view View list
#' @param {list} sourceData List from reactLayerSummary reactive object
#' @param {list} sourceDataMask List from sourceMaskData reactive object
#' @return view list updated
#' @export 
mxUpdateDefViewVt <- function(view,sourceData=NULL,sourceDataMask=NULL){
  #
  # update meta data
  #

  viewData <- .get(view,c("data"))
  meta <- mxDbGetLayerMeta(.get(sourceData,c("layerName")))

  viewData <- .set(viewData,c("geometry"),list(
      type = .get(sourceData,c("geomType")),
      centroid = .get(sourceData,c("centroid")),
      extent = .get(sourceData,c("extent"))
      ))


  viewData <- .set(viewData,c("attribute"),list(
      name = .get(sourceData,c("variableName")),
      type = .get(sourceData,c("type")),
      table = .get(sourceData,c("table")),
      sample = .get(sourceData,c("sampleData")),
      numberRow = .get(sourceData,c("numberOfRow")),
      numberNull =  .get(sourceData,c("numberOfNull")),
      numberDistinct = .get(sourceData,c("numberOfDistinct"))
      ))

  viewData <- .set(viewData,c("period"),list(
      extent = .get(sourceData,c("timeExtent")),
      density = .get(sourceData,c("timeDensty")), 
      variables = .get(sourceData,c("timeVariables"))
      ))

  viewData <- .set(viewData,c("source"),list(
      type = "vector",
      attribution = as.character(tags$a(href=.get(meta,c("oigin","homepage","url")))),
      query = mxViewMakeQuery(sourceData, sourceDataMask, .get(view,c("id"))),
      layerInfo = list(
        name =  .get(sourceData,c("layerName")),
        maskName = .get(sourceDataMask,c("layerMaskName")),
        meta = .get(sourceData,c("layerMeta"))
        )      
      ))


  #
  #set style default
  #
  geomType <- .get(sourceData,c("geomType"))
  style <- .get(viewData,c("style"))

  if(noDataCheck(style)){
    def[["style"]] =  list()
  }

  #for now, data driven style for lines is not working
  if( geomType == "lines" ){

    viewData <- .set(viewData,c("style"),list(
       spriteEnable = FALSE,
      dataDrivenEnable = FALSE,
      dataDrivenChoice = "none",
      rules = .get(viewData,c("style","rules")),
      dataDrivenMethod = .get(viewData,c("style","dataDrivenMethod"))
        ))

  }else{

    isNumeric <- isTRUE(.get(sourceData,c("type")) == "number")
    # set data type choic      
    if( isNumeric ){
      dataDrivenChoice <- list("categorical","exponential","interval")
    }else{
      dataDrivenChoice <- list("categorical")
    }

    viewData <- .set(viewData,c("style"),list(
      rules = .get(viewData,c("style","rules")),
      dataDrivenMethod = .get(viewData,c("style","dataDrivenMethod")),
      spriteEnable = TRUE,
      dataDrivenEnable = TRUE,
      dataDrivenChoice = dataDrivenChoice
      ))

  }

  view <- .set(view,c("data"),viewData)


  return(view)

}

#' Progress bar controller
#' @param id id of the bar
#' @param percent Integer progress percent
#' @param enable Boolean progress bar enable
#' @param text Character Text of the progress bar
#' @param session Shiny session object
#' @export
mxProgress = function(id="default",text="",percent=1,enable=TRUE,session=shiny:::getDefaultReactiveDomain()){
  res <- list(
    id = id,
    enable = enable,
    text = text,
    percent = percent
    )

  session$sendCustomMessage(
    type="mxProgress",
    res
    )
}

