
#' Map-x helper functions
#'
#' Map-x core functions
#'
#'
#' @docType package
#' @name mapxhelper 


#' Add or update views from story steps to view dependencies
#' @param {List} story list
#' @param {List} view list
#' @param {List} views compact list
updateStoryViews <- function(story,view,allViews){

  #
  # Retrieve and store data for all views used in story.
  #
  views = list()

  #
  # All views id extracted from the story
  #
  viewsStory = lapply(story$steps,function(s){
    lapply(s$views,function(v){v})
 })

  # Final view list
  viewsId = unique(unlist(viewsStory))
  viewsId = as.list(viewsId)

  # If there is at least on views used, get views object.
  if(!noDataCheck(viewsId)){
    views = allViews[sapply(allViews,function(v){v$id %in% viewsId })]
  }

  #
  # Save local views from story, if any
  #
  view <- .set(view,c("data","views"),views)
  return(view)

}



#' Load external ui file value in shiny app
#'
#' Shortcut to load external shiny ui file
#'
#' @param files Path to the file(s)
#' @param base Path enclosing folder path. Default = "./"
#' @export
mxSource <- function(files="",base=".",env=.GlobalEnv){

  if(length(files)>1){
   for(f in files){
    file = normalizePath(file.path(base,f))
    source(file, local=env)$value
  }
  }else{
    file = normalizePath(file.path(base,files))
    source(file,local=env)$value
  }

}


##' Source additional server files
##' @param files Vector of files to source
##' @export
#mxSourceSrv <- function(files=NULL){

   #conf <- mxGetDefaultConfig()
  #if(noDataCheck(files)) return;

  #for(f in files){
    #source(file.path(conf[["srvPath"]],f), local=parent.frame())
  #}

#}




#' Get md5 of a file or R object
#' @param f File or Object 
#' @return md5 sum
#' @export
mxMd5 <- function(f){
  fileOk = ! "try-error" %in% class(try(file.exists(f),silent=T))
  if(fileOk) fileOk = file.exists(f) 
  digest::digest(f,serialize=TRUE,file=fileOk)
}

#' Deparse a list from a json file path
#' @param path {string} Path to the json file
#' @export
mxJsonToListSource <- function(path){
  paste(deparse(mxJsonToList(path),control=NULL),collapse="\n")
}



#' Simple counter
#' @param id Id of the counter
#' @param reset Boolean Should the function reset the counter ?
mxCounter =  function(id,reset=F){
    if(!exists("mxCounters") || reset ){
      mxCounters <<- list()
    }
    if(!reset){
      if(noDataCheck(mxCounters[[id]])){
        mxCounters[[id]] <<- 1
      }else{
        mxCounters[[id]] <<- mxCounters[[id]] + 1
      }
      mxCounters[[id]]
    }
  }


#' Create multilingual object of input in json schema
#' @param format {Character} Schema input format
#' @param default {List} Default list
#' @param keyTitle {Character} Translation key of the title
#' @param titlePrefix {Character} 
#' @param keyCounter {Character|Numeric} Id of the counter to set
#' @param type {Character} Input type
#' @param collapsed {Boolean} Collapse state of the object
#' @param language {Character} Two letter code of language for labels
#' @param languages {Character} Vector of languages code
#' @param languagesRequired {Character} Vector of languages code where value isrequired
#' @param languagesHidden {Character} Vector of languages code where editor is hidden
#' @param languagesReadOnly {Character} Vector of languages code where editor is visible, but not editable
#' @param dict {Data.frame} Dictionarry to use
#' @param options {List} List of option given to the json editor client side
mxSchemaMultiLingualInput = function(
  format = NULL,
  default = list(),
  keyTitle = "",
  titlePrefix = "",
  keyCounter = "b",
  type = "string",
  collapsed = TRUE,
  language = "en",
  languages = unlist(config[["languages"]]),
  languagesRequired = c("en"),
  languagesHidden = c(),
  languagesReadOnly = c(),
  dict = NULL,
  options = list()
  ){

  if(noDataCheck(language)){
    language = get("language",envir=parent.frame())
  }

  if(noDataCheck(dict)){
    dict = dynGet("dict",ifnotfound=config$dict)
  }

  if(noDataCheck(dict)){
    dict = config$dict
  }

  if(nchar(titlePrefix)>0){
    titlePrefix = paste(toupper(titlePrefix),":")
  }

  prop = lapply(languages,function(x){

    opt = options
    #
    # Required ?
    #
    minLength = 0 
    if( x %in% languagesRequired ){
     minLength = 1
    }

    #
    # Hidden ?
    #
    opt$readOnly = isTRUE( x %in% languagesReadOnly )
    opt$hidden = isTRUE( x %in% languagesHidden && !x %in% languagesRequired )

    #
    # Output entry
    #
    list(
      title = sprintf("%1$s (%2$s%3$s)",
        d(keyTitle,lang=x,dict=dict,web=F),
        d(x,lang=language,dict=dict,web=F),
        ifelse(opt$readOnly,", read only","")
        ),
      type = type,
      format = format,
      options = opt,
      minLength = minLength,
      default = .get(default,c(x),default="")
      )
  
  })
  names(prop) <- languages
  list(
    propertyOrder = mxCounter(keyCounter),
    title = paste(titlePrefix,d(keyTitle,lang=language,dict=dict,web=F)),
    type = "object",
    options = list(collapsed = collapsed),
    properties = prop
    )
}

#' Create object for data integrity framework
#' @param keyTitle {Character} Translation key of the title
#' @param language {Character} Language code to use
mxSchemaDataIntegrityQuestion = function(keyTitle,language=NULL,dict=NULL){ 

  if(noDataCheck(language)){
    language = get("language",envir=parent.frame())
  }
  if(noDataCheck(dict)){
    dict = .get(config,c("dictionaries","schemaMetadata"))
  }

  list(
    title = d(keyTitle,lang=language,dict=dict,web=F),
    description = d(paste0(keyTitle,"_desc"),lang=language,dict=dict,web=F),
    type = "string",
    propertyOrder = mxCounter("dataIntegrity"),
    minlength = 1,
    default = "0",
    enum = c("0",
      "1",
      "2",
      "3"),
    options = list(
      enum_titles = names(d(
          c(
            "dont_know",
            "no",
            "partial",
            "yes"),
          lang = language,
          dict = dict,
          web=F
          )
        )
      )
    )
}


#' Create attribute description object based on multilingual input
#' @param format {Character} Schema input format
#' @param keyTitle {Character} Translation key of the title
#' @param keyCounter {Character|Numeric} Id of the counter to set
#' @param type {Character} Input type
#' @param collapsed {Boolean} Collapse state of the object
#' @param attributes {Character} Vector of attributes names
#' @param dict {List} Dictionnary object. Default is "config$dictionaries$main"
mxSchemaAttributeInput = function(
    format=NULL,
    keyTitle="",
    keyCounter="attr",
    type="string",
    collapsed=TRUE,
    attributes=c(),
    dict
    ){

    prop = lapply(attributes,function(x){
         mxSchemaMultiLingualInput(
          keyTitle = keyTitle,
          titlePrefix = x,
          keyCounter = keyCounter,
          type=type,
          format=format,
          default = list('en'='-'),
          dict = dict
          )
    })
    
    names(prop) <- attributes
    return(prop)
  }



#' Use system grep to return list of file matching grep exp
#' @param exp {character} Regex expression
#' @param fixed {boolean} search for fixed string
#' @param ext {string} search for file with this extension
#' @export
whereIs <- function(exp,fixed=TRUE,ext=NULL,excludeDir="node_modules"){

  cmd <- ifelse(fixed,"grep -RFl","grep -REL")
  if(!is.null(ext)){
    cmd <- sprintf("%1$s %2$s",cmd,paste(sprintf("--include \\*.%1$s",ext),collapse=""))
  }
if(!is.null(excludeDir)){
    cmd <- sprintf("%1$s --exclude-dir=%2$s",cmd,excludeDir)
  }
  cmd <- sprintf("%1$s '%2$s' .",cmd,exp)
  mxDebugMsg(cmd)
  system(cmd)
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




#' Set web ressource path
mxSetResourcePath <- function(resources){
  if(is.null(resources)){
    res <- .get(config,"resources")
  }else{
    res =  resources
  }
  for(i in names(res)){
    shiny::addResourcePath(i,res[[i]])
  }
}


#' Get dictionnary entry by key for a given language (translate)
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
mxDictTranslate <- function(id=NULL,lang=NULL,langDefault="en",namedVector=FALSE,dict=NULL,web=T,asChar=F){
  out <- NULL

  # if no dictionary provided, search for one in parent env
  if(noDataCheck(dict)){
    dict=dynGet("dict",inherits=T)
  }

  # if no dict found, get the default. Else, append default and provided
  if(noDataCheck(dict)){ 
    dict = .get(config,"dict")
  }else{
    dict = rbind(dict,.get(config,"dict"))
  }

  d <- dict

  # if no language, get the default or the first of the language available
  if(noDataCheck(lang)){
    lang=dynGet("lang",inherits=T)
    if(noDataCheck(lang)){
      lang <- langDefault
      if(noDataCheck(lang)){
        lang <- config[["languages"]][["list"]][[1]]
      }
    }
  }

  # test for missing language
  langExists = c(lang,langDefault) %in% names(d)
  if(!all(langExists)) stop(sprintf("Language %s not found",c(lang, langDefault)[!langExists]))

  #
  # Start search
  # 
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
          r = d[d$id == as.character(x), c(lang,langDefault)]
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
      if(web) out <- tags$div(out,`data-lang_key`=id)
      if(asChar) out <- as.character(out)
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
  titleDefault <- layerTable[,"title_default"]

  for(i in 1:length(titleDefault)){
     if(noDataCheck(titleLang[i])) titleLang[i] <- titleDefault[i]
  }

  date <- layerTable$date_modified
 
  namesTitle <- sprintf("%1$s ( %2$s )",titleLang,format(date,"%Y-%m-%d"))

  names(out) <- namesTitle

  return(as.list(out))

}


#' Get title of source using its id
#' @param id {String} Source id
#' @param language {String} Two letter language code
#' @return title string
mxGetTitleFromSourceID <- function(id,language="en"){

  sql = "
  SELECT 
  data#>>'{\"meta\",\"text\",\"title\",\"" + language + "\"}' as " + language + ", 
  data#>>'{\"meta\",\"text\",\"title\",\"en\"}' as en
  FROM mx_sources 
  WHERE id ='"+ id+"' "

  df <- mxDbGetQuery(sql)
  out <- df[,"en"]
  hasLanguage <- !noDataCheck(df[,language])

  if(hasLanguage){
    out <- df[,language]
  }

  return(out)

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
mxSetTemplates <- function(listTemplates,session=shiny:::getDefaultReactiveDomain()) {
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
  if(noDataCheck(file)) return("")
 file <- basename(file)
 sub("([^.]*)\\.([[:alnum:]]+$)", "\\1",file)
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


mxTimeDiff <- function(titleOrTimer="test"){

  dat <- titleOrTimer 
  now <- Sys.time()

  if("mx_timer" %in% class(dat)){

    diff <- paste(round(difftime(now,dat$start,units="secs"),3))
    mxDebugMsg(paste(dat$title,diff,"s"))

  }else{
    out = list(
      start = Sys.time(),
      title = dat
      )

    class(out) <- c(class(out),"mx_timer")

    return(out) 

  }

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
  if(!noDataCheck(session)){
  res <-   session$sendCustomMessage(
    type = "mxDebugMsg",
    message = jsonlite::toJSON(text)
    )
  }else{
  mxDebugMsg(text)
  }
}


mxCatchHandler <- function(type="error",message="",session=shiny::getDefaultReactiveDomain()){

  sysStack <- paste(shiny:::formatStackTrace(sys.calls()),collapse="\n")

  if(!exists("cdata") || noDataCheck(cdata)){
    cdata = "<unkown>"
  }

  if(noDataCheck(type)){
    type = "<unknown>"
  }
if(noDataCheck(message)){
    message = "<no message>"
  }

  err <- list(
    type = type,
    stack = sysStack,
    message = message,
    time = as.character(Sys.time()),
    cdata = as.character(cdata)
    )

  if(type == "error"){
    #
    # outut message
    #
    if(!noDataCheck(session)){   
      mxModal(
        id=randomString(),
        title="Unexpected issue",
        content=tagList(
          tags$b("You discovered a bug !"),
          tags$p("Well done. An anonymous report has been sent to our developer. Probably me. Until he solves this issue, what you are trying to do will certainly to work as expected. Sorry. ")
          )
        )
    }

  }

  text <- .get(config,c("templates","text","email_error"))
  text <- gsub("\\{\\{TYPE\\}\\}",err$type,text)
  text <- gsub("\\{\\{DATE\\}\\}",err$time,text)
  text <- gsub("\\{\\{CDATA\\}\\}",err$cdata,text)
  text <- gsub("\\{\\{MESSAGE\\}\\}",err$message,text)
  text <- gsub("\\{\\{CALL\\}\\}",err$stack,text)

  if(noDataCheck(text)) text = "<no text>"
  #
  # else send an email
  #
  subject =  paste0("[ mx-issue-",type," ]")

  mxSendMail(
    from = .get(config,c("mail","bot")),
    to = .get(config,c("mail","admin")),
    subject = subject,
    body = text
    )

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
  onError = function(){},
  onWarning = function(){},
  onMessage = function(){}
  ){
  res = NULL;
  #
  # try this and catch errors !
  # 

  tryCatch({
    expression
  },error = function(e){


    mxCatchHandler(
      type = "error",
      message = as.character(e$message)
      )

    onError()

  },warning = function(e){

    mxCatchHandler(
      type = "warning",
      message = as.character(e$message)
      )

    onWarning()

  },message = function(e){

    if(debug){
      mxCatchHandler(
        type = "message",
        message = as.character(e$message)
        )
    }

    onMessage()
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
  library("magrittr")
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
subPunct <- function(str,sep='_',rmTrailingSep=T,rmLeadingSep=T,rmDuplicateSep=T,useTransliteration=T){
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

#' Convert list to html, client side
#'
#' Search for given id and update value. 
#' 
#' @param session Shiny session
#' @param id Id of the element
#' @param  data List to convert
#' @export
mxJsonToHtml <- function(id,data,session=shiny:::getDefaultReactiveDomain()){
  if(is.null(data) || is.null(id)){
    return()
  }else{
    session$sendCustomMessage(
      type="mxJsonToHtml",
      list(
        id = id,
        data = jsonlite::toJSON(data,auto_unbox=T)
        )
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

  template <- .get(config,c("templates","html","email"))
  template <- gsub("\\{\\{content\\}\\}",content,template)
  template <- gsub("\\{\\{subject\\}\\}",subject,template)
  template <- gsub("\\{\\{title\\}\\}",title,template)
  
  return(template)

}



#' Send an email using local or remote 'mail' command
#' @param from String. Valid email for  sender
#' @param to String. Valid email for Recipient
#' @param body String. Text of the body
#' @param filePath String. Path to file to send as body. Overwrite body.
#' @param type String. "text" or "html"
#' @param subject. String. Test for the subject 
#' @export
mxSendMail <- function( from=NULL, to=NULL, replyTo=NULL, type="text", body=NULL, filePath=NULL, subject=NULL, wait=FALSE, getCommandOnly=FALSE ){


  isLocal = Sys.info()[["user"]] != "shiny"
  hasFilePath = !noDataCheck(filePath)

  if(noDataCheck(from)){
    from <- .get(config,c("mail","bot"))
  }

  if(noDataCheck(replyTo)){
    replyTo <- .get(config,c("mail","admin"))
  }

  if(noDataCheck(subject)){
    subject = "map-x"
  }

  if(noDataCheck(body)){
    body = "empty"
  }

  contentType = ifelse(isTRUE(type== "html"),
    "text/html",
    "text/plain"
    )

  if( ! mxEmailIsValid(from) | ! mxEmailIsValid(to)) stop(paste("mxSendMail : email not valid. From: ", from, " To: ", to))

  if( !hasFilePath ){
    filePath <- tempfile()

    if(isTRUE(type == "html")){
      body <- mxHtmlMailTemplate(
        title = subject, 
        subject = subject,
        content = body 
        )
    }

    write(body,filePath)

  }


  if( isLocal ){
    localDir <- getwd()

    command <- 
      "cat " + filePath +
      " >>  " + file.path( localDir, "_mail.txt" )

  }else{
    command <- sprintf("cat %1$s | mail -s '%2$s' -a 'From: %3$s' -a 'Content-Type: %4$s' %5$s"
      , filePath
      , subject
      , from
      , contentType
      , to
      ) 

  }

  if( getCommandOnly ){

    return( command )

  }

  system(command,wait=wait)

}

#' Extract value from a list given a path
#' @param listInput Input named list
#' @param path Path inside the list
#' @param flattenList Conversion of the result to vector
#' @param default If nothing found, value returning
#' @return value extracted or NULL
#' @export
mxGetListValue <- function(listInput,path,flattenList=FALSE,default=NULL){
  tryCatch({
  out <- default
  if( "reactivevalues" %in% class(listInput)){
    listInput <- reactiveValuesToList(listInput)
  }
  if(!is.list(listInput) || length(listInput) == 0) return(out)
  out <- listInput[[path]]
  if(flattenList && !noDataCheck(out) && is.list(out)){ 
    out <- as.list(unlist(out,use.names=F))
  }
  if(noDataCheck(out)){
    out <- default
  }
  },error=function(e){
    # remove error like "no such index at level"
   out <- default
  })
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
  roles <- .get(config,c("users","roles"))

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

  if( !hasRoleInWorld && !hasRoleInProject ){
    hasRoleInWorld = TRUE
    roleInWorld = "user"
  }


  if(!hasRoleInWorld && !hasRoleInProject) stop("No role found!")

  if(hasRoleInProject){
    levelProject <- mxRecursiveSearch(
      li=roles,"name","==",roleInProject
      )[[1]]$level
  }

  if(hasRoleInWorld){
    levelWorld <- mxRecursiveSearch(
      li=roles,"name","==",roleInWorld
      )[[1]]$level
  }

  levelUser <- min(c(levelWorld,levelProject))

  out  <- mxRecursiveSearch(.get(config,c("users","roles")),"level","==",levelUser)[[1]]

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
#' @param {character} rep replacement char
mxCleanString <- function(str,rep=" "){
    gsub("\\s+",rep,str)
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
#' @param {list} additionalAttributes List of additional attributes
#' @return view list updated
#' @export 
mxUpdateDefViewVt <- function(view,sourceData=NULL,sourceDataMask=NULL,additionalAttributes=NULL){
  #
  # update meta data
  #
  viewData <- .get(view,c("data"))
  layerName <- .get(sourceData,c("layerName"))
  meta <- mxDbGetLayerMeta(layerName)

  viewData <- .set(viewData,c("geometry"),list(
      type = .get(sourceData,c("geomType")),
      centroid = .get(sourceData,c("centroid")),
      extent = .get(sourceData,c("extent"))
      ))

  viewTable <- .get(sourceData,c("table"))

  attributes <- list(
    name = .get(sourceData,c("variableName")),
    names = unique(c(
        .get(sourceData,c("timeVariables")),
        .get(sourceData,c("variableName")),
        additionalAttributes
        )),
    type = .get(sourceData,c("type")),
    table = .get(sourceData,c("table")),
    sample = sourceData[[c("sampleData")]],
    min = min(viewTable$value,na.rm=T),
    max = max(viewTable$value,na.rm=T),
    rows = .get(sourceData,c("numberOfRow")),
    nulls =  .get(sourceData,c("numberOfNull")),
    distincts = .get(sourceData,c("numberOfDistinct"))
    )

  viewData <- .set(viewData, c("attribute"), attributes )

  viewData <- .set(viewData,c("period"),list(
      extent = .get(sourceData,c("timeExtent")),
      density = .get(sourceData,c("timeDensity")) 
      ))

  viewData <- .set(viewData,c("source"),list(
      type = "vector",
      allowDownload = .get(meta,c("license","allowDownload")),
      attribution = as.character(tags$a(href=meta[[c("origin","homepage","url")]])),
      layerInfo = list(
        name =  .get(sourceData,c("layerName")),
        maskName = .get(sourceDataMask,c("layerMaskName"))
        )
      ))

  #
  #set style default
  #
  geomType <- .get(sourceData,c("geomType"))
  style <- .get(viewData,c("style"))

  if(noDataCheck(style)){
    viewData[["style"]] =  list()
  }

  #for now, data driven style for lines is not working
  if( geomType == "lines" ){

    viewData <- .set(viewData,c("style"),list(
        spriteEnable = FALSE,
        rules = .get(viewData,c("style","rules"))
        ))

  }else{

    isNumeric <- isTRUE(.get(sourceData,c("type")) == "number")

    viewData <- .set(viewData,c("style"),list(
        rules = .get(viewData,c("style","rules")),
        spriteEnable = TRUE
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



#' Get wms layers
#' @param service Service to query
mxGetWmsLayers <- function(service,useCache=T){
  
  if(!exists("config")) config <- list()
  if(noDataCheck(config$.wms_layers)) config$.wms_layers <- list()
  layers <- config$.wms_layers[[service]]

  if(!useCache || noDataCheck(layers)){
   
    req <- sprintf("%1$s?%2$s",service,"service=WMS&request=GetCapabilities")

      res <- xml2::read_xml(req, options="NOCDATA")
      resList <- xml2::as_list(res)
      layers <- mxGetWmsLayersFromCapabilities(resList)
      config$.wms_layers[[service]] <<- layers

  }

  return(layers)
}



#' Get list of available layers and name.
#' @param getCapabilitiesList List that contains a list of a parsed GetCapabilities on a wms server (esri or ogc should work)
mxGetWmsLayersFromCapabilities <- function(getCapabilitiesList){

  # TODO: check if the structure could be :
  # At each level, if a name and a title are provided, take every nested layers as first layer's component.
  # for now, this works for a 1,2 or 3 levels, but this is empiric.

  dat <- getCapabilitiesList
  if(class(dat) != "list"){
    stop("mxGetWmsLayers failed to analyse the response. Probable cause : A structured document expected of class'list' expected")
  }
  layers <- dat[['Capability']][['Layer']]
  
  layersNested <- layers[names(layers)=="Layer"]


  # if there is only one level of layers, but the layer in a list.
  if(length(layersNested)>0){
    layers <- layersNested 
  }else{
    layers <- list(Layer=layers)
  
  }

  nLayer <- length(layers)
  res <- list()
  for(i in 1:nLayer){
    j <- layers[[i]]
    k <- j[names(j) == "Layer"]
    n <- length(k)
    ln <- j[['Name']]
    lt <- na.omit(j[['Title']][[1]])
    if(n>0){
      for(l in 1:n){
        kn <- k[[l]][['Name']]
        if(!is.null(kn)){
          ln<-c(ln,kn)
        }
      }
    }
    ln<-paste(ln,collapse=",")
    if(!isTRUE(nchar(lt)>0)){
      ln <-paste("[ no title ", randomString()," ]",sep="")
    }
    if(isTRUE(nchar(ln)>0)){
      res[[i]]<-list("label"=lt,"value"=ln)
    }
  }
  return(res)
}


#' Update selectize input
#' @param {character} id of the input
#' @param {list} List of items. Keys should be the same as the input. eg "list(list('label'='label','value'='test'))"
mxUpdateSelectizeItems <- function(id,items,session=shiny:::getDefaultReactiveDomain()){
  session$sendCustomMessage("mxUpdateSelectizeItems",list(
      id=id,
      items=items
      ))
}




mxButton <- function (inputId, labelId = NULL, class = NULL )
{
  class <- paste0(class, collapse=" ")
  tags$button(
    id = inputId,
    type = "button",
    class = sprintf("btn btn-default action-button %s",class),
    `data-lang_key` = labelId
    )
}




#' Create a modal window
#' @param id {string} Id of the modal
#' @param close {logical} Ask to close an existing modal
#' @param replace {logical} Ask to replace an existing modal
#' @param title {character|shiny.tag} Optional title 
#' @param subtitle {character|shiny.tag} Optional subtitle
#' @param content {character|shiny.tag} Optional content
#' @param buttons {list} Optional ActionButton list
#' @param minHeight {String} Optional min height of the modal window. String. Eg. "500px"
#' @param addBackground {logical} Add a background
#' @param removeCloseButton {logical} Remove close button
#' @param textCloseButton {character|shiny.tag} Text of the default close button
#' @param session {shiny.session} Default session object
mxModal = function(id=NULL,close=F,replace=T,title=NULL,subtitle=NULL,content=NULL,buttons=NULL,minHeight=NULL,addBackground=T,removeCloseButton=F,textCloseButton="ok",session=shiny::getDefaultReactiveDomain()){

  stopifnot(!noDataCheck(id))

  if(!noDataCheck(buttons) && is.list(buttons)){
    buttons <- lapply(buttons,function(b){as.character(b)})
  }

  session$sendCustomMessage(
    type="mxModal",
    list(
      id=id,
      replace=as.logical(replace),
      title=as.character(title),
      subtitle=as.character(subtitle),
      textCloseButton=as.character(textCloseButton),
      buttons=buttons,
      minHeight=minHeight,
      content=as.character(content),
      addBackground=as.logical(addBackground),
      removeCloseButton=as.logical(removeCloseButton),
      close=as.logical(close)
      )
    )
}
#' Create a modal panel
#'
#' Create a modal panel with some options as custom button, close button, html content. 
#'
#' @param id Panel id
#' @param title Panel title
#' @param subtitle Panel subtitle
#' @param html HTML content of the panel, main text
#' @param zIndex base zIndex for the panel and background
#' @param listActionButton If FALSE, hide buttons. If NULL, display default close panel button, with text given in defaultButtonText. If list of buttons, list of button.
#' @param defaultButtonText Text of the default button if listActionButton is NULL and not FALSE
#' @param style Additional CSS style for the panel 
#' @param class Additional class for the panel
#' @param hideCloseButton Boolean. Hide the close panel button
#' @param draggable Boolean. Set the panel as draggable
#' @export
mxPanel<- function(
  id="default",
  title=NULL,
  headIcon=NULL,
  subtitle=NULL,
  html=NULL,
  zIndex=500,
  listActionButton=NULL,
  background=TRUE,
  addCloseButton=FALSE,
  addOnClickClose=TRUE,
  closeButtonText="OK",
  style=NULL,
  class=NULL,
  hideHeadButtonClose=TRUE,
  draggable=TRUE,
  fixed=TRUE,
  defaultTextHeight=150
  ){ 

  rand <- randomString(splitIn=1,addLetters=T)

  idBack <- paste("mx_modal_background",id,rand,sep="_")
  idContent <- paste("mx_modal_content",id,rand,sep="_")
  jsHide <- sprintf("mx.util.hide({id:'%1$s'}); mx.util.hide({id:'%2$s'})"
    , idContent
    , idBack
    )

  #
  # Handle on click close for all buttons
  #
  if(!is.null(listActionButton) && isTRUE(addOnClickClose)){
    listActionButton <- lapply(
      listActionButton,
      function(x){
        x$attribs$onclick<-jsHide
        return(x)
      }
      )
  }  

  #
  # Handle default close button
  #
  if(addCloseButton || is.null(listActionButton)){
    listActionButton <- tagList(
      listActionButton,
      tags$button(onclick=jsHide,closeButtonText,class="btn btn-modal")
      )
  }

  #
  # Remove buttons if logical false
  #
  if(isTRUE(is.logical(listActionButton) && !isTRUE(listActionButton))) listActionButton=NULL

  #
  # handling close button in top
  #
  if(hideHeadButtonClose){
    closeButton=NULL
  }else{
    closeButton=tags$button(href="#",class="btn btn-default", onclick=jsHide,icon('times'))
  }

  #
  # Handle background removal
  #
  if(background){
    backg <- div(id=idBack,class=paste("mx-modal-background"),style=sprintf("z-index:%s",zIndex))
  }else{
    backg <- character(0)
  }


  #
  # handle draggable
  #
  if(draggable){
    scr <- tags$script(sprintf('
        mx.util.draggable({
          id:"%1$s",
          disable:[]
        })'
        , idContent
        )
      )
    
    #dragButton = tags$span(class="mx-modal-drag-button btn btn-default",icon('arrows'),style="cursor:move")

    dragButton = ""
  }else{
    scr = ""
    dragButton = ""
  }

  #
  # Handle title 
  #
  title = div(
    class="",
    tags$span(
      icon( headIcon ),
      style = "font-size:30px"
      ),
    div(
      class="",
      title
      ),
    div(
      class="",
      subtitle
      )
    )


  #
  # Info text
  #
  infoText = tags$div(
    class="mx-modal-info-text",
    p(
      id=sprintf("%s_infoText",id)
      )
    )

  #
  # Final object
  #
  out <- tagList(
    backg,
    div(
      id=idContent,
      style=sprintf("z-index:%s",zIndex+1),
      class="mx-modal-container",
      div(
        class="mx-modal-top mx-modal-drag-enable",
        closeButton,
        dragButton
        ),
      div(
     class="mx-modal-head",
     title
        ),
      div(
        class="mx-modal-body",
          html
        ),
      div(
        class="mx-modal-foot",
        infoText,
        listActionButton
        )
      ),
    scr
    )


  return(out)
}
#' Alert panel
#'
#' Create an alert panel. This panel could be send to an output object from a reactive context. 
#'
#' @param title Title of the alert. Should be "error", "warning" or "message"
#' @param subtitle Subtitle of the alert
#' @param message html or text message for the alert
#' @param listActionButtons List of action button for the panel
#' @export
mxPanelAlert <- function(title=c("error","warning","message"),subtitle=NULL,message=NULL,listActionButton=NULL,...){ 
  title = match.arg(title)
  switch(title,
    'error'={title=h2(icon("frown-o"))},
    'warning'={title=h2(icon("frown-o"))},
    'message'={title=h2(icon("info-circle"))} 
    )
  mxPanel(class="panel-overall panel-fixed",title=title,subtitle=subtitle,html=message,listActionButton=listActionButton,style="position:fixed;top:100px",...)
}
#' Password input
#'
#' Create a password input.
#' 
#' @param inputId Input id
#' @param label Label to display
#' @export
mxInputPassword <- function(inputId, label) {
  tagList(
    tags$input(id = inputId,placeholder=label,class="mx-login-input",type="password", value="")
    )
}

#' User name input
#' 
#' Create a username input
#' 
#' @param inputId Input id
#' @param label Label to display
#' @export
mxInputUser <- function(inputId, label,class="form-control") {
  tags$input(
    id = inputId, 
    placeholder=label,
    class=paste("mx-login-input",class),
    value="",
    autocomplete="off",
    autocorrect="off", 
    autocapitalize="off",
    spellcheck="false"
    )
}





#' Create a bootstrap accordion 
#'
#' Create a bootstrap accordion element, based on a named list.
#'
#' @param id Accordion group ID
#' @param style Additional style. 
#' @param show Vector of item number. Collapse all item except those in this list. E.g. c(1,5) will open items 1 and 5 by default. 
#' @param itemList Nested named list of items, containing title and content items. E.g. list("foo"=list("title"="foo","content"="bar"))
#' @examples 
#' mxAccordionGroup(id='superTest',
#'  itemList=list(
#'    'a'=list('title'='superTitle',content='acontent'),
#'    'b'=list('title'='bTitle',content='bContent'))
#'  )
#' @export
mxAccordionGroup <- function(id,style=NULL,show=NULL,itemList){
  if(is.null(style)) style <- ""
  cnt=0
  contentList<-lapply(itemList,function(x){
    cnt<<-cnt+1
    ref<-paste0(subPunct(id,'_'),cnt)
    showItem<-ifelse(cnt %in% show,'collapse.in','collapse')
    stopifnot(is.list(x) || !noDataCheck(x$title) || !noDataCheck(x$content))

    onShow <- ifelse(noDataCheck(x$onShow),"",x$onShow)
    onHide <- ifelse(noDataCheck(x$onHide),"",x$onHide)

    if(is.null(x$condition)) x$condition="true"
    div(
      style=style,
      class=paste("mx-accordion-item",x$class),
      `data-display-if`=x$condition,
      div(
        class="mx-accordion-header",
        tags$span(
          class="mx-accordion-title",
          tags$a('data-toggle'="collapse", 
            'data-parent'=paste0('#',id),
            href=paste0("#",ref),x$title
            )
          )
        ),
      div(
        id=ref,
        class=paste("mx-accordion-collapse",showItem
          ),
        div(
          class="mx-accordion-content",
          x$content
          ),
        tags$script(
          sprintf('
            $("#%1$s").on("show.bs.collapse", function () {
              %2$s
}).on("hide.bs.collapse", function () {
%3$s
    }); 
            '
            , ref
            , onShow
            , onHide
            )
          )
        )
      )
})

  return(div(class="mx-accordion-group",id=id,
      contentList
      )
    )
}
#' Custom file input 
#'
#' Default shiny fileInput has no option for customisation. This function allows to fully customize file input using the label tag.
#'
#' @param inputId id of the file input
#' @param label Label for the input
#' @param fileAccept List of accepted file type. Could be extension.
#' @param multiple  Boolean. Allow multiple file to be choosen. Doesn't work on all client.
#' @export
mxFileInput<-function (inputId, label, fileAccept=NULL, multiple=FALSE){
  inputTag<-tags$input(
    type='file',
    class='upload',
    accept=paste(fileAccept,collapse=','),
    id=inputId,
    name=inputId)
  if(multiple) inputTag$attribs$multiple='multiple'
  spanTag <- tags$span(label)
  inputClass <- tags$label(
    class=c('btn-browse btn btn-default'),
    id=inputId,
    spanTag,
    inputTag
    )
  tagList(inputClass,
    tags$div(id = paste(inputId,"_progress", sep = ""), 
      class = "progress progress-striped active shiny-file-input-progress",
      tags$div(class = "progress-bar"), tags$label()))
}

#' Custom select input
#'
#' Custom empty select input, updated later.
#'
#' @param inputId Element id
#' @param labelId Id of label

mxSelect <- function(inputId,class="",values=NULL,valuesLabels=NULL,optionAttr=NULL,optionAttrValues=NULL){


  attr <- character(1)
  opt <- character(1)
  val <- character(1)

  hasValues <- length(values) > 0
  hasValueLabels <- !is.null(valuesLabels) && length(valuesLabels) == length(values)
  hasAttr <- !is.null(optionAttr)
  hasAttrOpt <- !is.null(optionAttrValues) && length(optionAttrValues) == length(values)

  if(!hasValueLabels) valuesLabels <- values

  if(hasAttr && hasAttrOpt) attr <- sprintf("%1$s=\"%2$s\"",optionAttr,optionAttrValues)

  if(hasValues) val <- sprintf("value=\"%1$s\"",values)

  if(length(valuesLabels)>0){
    opt <- sprintf("<option %1$s %2$s >%3$s</option>\n",attr,val,valuesLabels)
  }

  #tags$div(
    #class = sprintf("form-group shiny-input-container %s",paste(class,collapse=" ")),
    #class = sprintf(" %s",paste(class,collapse=" ")),
    tags$select(
      id=inputId,
      #class="selectpicker",
      HTML(opt)
      )
    #)
}







#' Create button to change ui color
#' @param {string} id Id of the generated button
#' @export
mxUiColorSwitch <- function(id,class1="white",class2="black",...){
  tags$div(
    class="switchui-button",
    tags$input(type="checkbox",name="switchui-color",class="hidden",id=id,"checked"=FALSE,...),
    tags$label(class="btn btn-circle",`for`=id,icon("adjust")),
    tags$script(sprintf(
        "switchUiEnable('%1$s','%2$s','%3$s')"
        ,id
        ,class1
        ,class2
        )
      )
    )
}


#' Create a container without scroolbar
#' @param content html content
#' @export
mxUiNoScroll <-  function(content){
  div(class="no-scrollbar-container no-scrollbar-container-border",
    div(class="no-scrollbar-content",
      content
      )
    )
}

#' Fill with p tags
#' @param n integer number of row
#' @export
fill <- function(n=1000){
  lapply(1:n,function(x){tags$p(x)})
}


#' Enable fancy scroll inside a mx-grid-container
#' @param HTML content
#' @export
mxScroll <- function(content){
  tags$ul(class="scrollY mx-grid-row-fill",
    tags$div(class="scrollbarY",
      tags$div(class="thumb")
      ),
    tags$div(class="viewport",
      tags$div(class="content",
        content
        )
      )
    )
}

#' Fold content
#' 
#' Checkbox to fold / toggle visibility of an element. CSS only.
#'
#' @param content {ui} 
#' @param labelDictKey {character} label key
#' @param labelText {character} label text
#' @param open {boolean} fold open
#' @param classContainer {character} Name of the class for the fold container
#' @param classContent {character} Name of the class for the fold content
#' @param classLabel {character} Name of the class for the label
#' @export
#mxFold <- function(content,id=NULL,labelDictKey=NULL,labelText=NULL, open=FALSE, classContainer="fold-container",classContent="fold-content",classLabel="fold-label"){
mxFold <- function(content,id=NULL,labelDictKey=NULL,labelText=NULL,labelUi=NULL, open=FALSE, classContainer="fold-container form-group shiny-input-container",classContent="fold-content",classLabel="fold-label",classScroll="mx-scroll-styled"){
  if(noDataCheck(id)) id <- randomString()

  elInput = tags$input(type="checkbox",id=id,class="fold-switch")

  if(open){
    elInput$attribs$checked=T
  }

  if(noDataCheck(labelUi)){
     label = tags$label(class=classLabel,`for`=id,`data-lang_key`= labelDictKey,labelText)
  }else{
     label = tags$label(labelUi,class=classLabel,`for`=id)
  }

  tags$div(class=classContainer,
    elInput,
    label,
    tags$div(class= paste(classContent,classScroll),
      content
      )
    )
}


#' R list to html list
#'
#' Create a html list and apply a class for <ul> and <li>
#'
#' @param listInput list in input
listToHtmlSimple <- function(listInput,lang="en",dict=config$dict,useFold=TRUE,numberArray=FALSE,maxFold=2,unboxText=TRUE){

  r = 0

  makeUL <- function(li){
    r <<- r + 1
    nL <- names(li)
    lL <- length(li)
    content <- tagList()
    for( i in 1:lL){ 
      n <-  nL[[i]]
      if(noDataCheck(n)){ n <- ifelse(numberArray,i,"") }
      content <- tagList(content, makeLi(li[[i]],n))
    }
    r <<- r - 1
    tags$ul(content,class="list-group")
  }

  makeLi <- function(it,ti){
    ti <- d(ti,lang=lang,dict=dict);
    if (is.list(it) && length(it)>0){
      
      classList <- "list-group-item"

      if ( useFold && r <= maxFold ){
        content <- mxFold(
          content = makeUL(it),
          labelUi = ti
          )
      }else{
        content <- tags$div(
          tags$b(class="list-group-title-big",ti),
          tags$div(makeUL(it))
          )
      }

      return(
        tags$li(
          class = classList,
          content
          )
        )

    }else{

      if(unboxText){
      return(
        tags$div(
          tags$span(class="list-group-title-small",ti),
          tags$span(it)
          )
        )}else{
       return(
        tags$li(
          class = "list-group-item",
          tags$span(class="list-group-title-small",ti),
          tags$span(it)
          )
        )

      }
    }

  }

  makeUL(listInput)         

}




#' Checkbox with custom ui
#'
#' Checkbox with custom ui
#'
#' @param inputId {character} Id of the checkbox
#' @param title {character} Title/Tooltip value
#' @param contentChecked {character} Pseudo element content if checked
#' @param contentUnchecked {character} Pseudo element content if not checked
#' @param class {character} Additional classes
#' @param .. additional tags
#' @export
mxCheckbox <- function(inputId=NULL,...,onClick=NULL,title="Toggle",contentChecked="\\f06e",contentUnchecked="\\f070",class="btn btn-default"){

  name <- sprintf(
    "check_%1$s"
    , inputId
    )

  classLabel <- sprintf(
    "mx-check-%1$s"
    , inputId
    )

tags$div(
  title=title,
  tags$input(
    onClick=onClick,
    type="checkbox",
    style="display:none",
    name=name,
    id=inputId,
    value="attributes"
    ),
  tags$label(
    class=paste(paste(class,collapse=" "),classLabel),
    `for`=inputId
  ),
  tags$style(
    sprintf(
      "#%1$s ~ .%2$s:before
      {
      font-family:fontawesome;
      content:\"%3$s\";
      }
      #%1$s:checked ~.%2$s:before
      {
      font-family:fontawesome;
      content:\"%4$s\";
      }"
      , inputId
      , classLabel
      , contentChecked
      , contentUnchecked
      )
    ),
  tags$div(
    ...
    )
  )


}

 

##' R list to html
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @export
#listToHtml<-function(listInput,htL='',h=2, exclude=NULL){

  #hS<-paste0('<H',h,'><u>',collapse='') #start 
  #hE<-paste0('</u></H',h,'>',collapse='') #end
  #h=h+1 #next
  #if(is.list(listInput)){
    #nL<-names(listInput)
    #nL <- nL[!nL %in% exclude]
    #htL<-append(htL,'<ul>')
    #for(n in nL){
      #htL<-append(htL,c(hS,n,hE))
      #subL<-listInput[[n]]
      #htL<-listToHtml(subL,htL=htL,h=h,exclude=exclude)
    #}
    #htL<-append(htL,'</ul>')
  #}else if(is.character(listInput) || is.numeric(listInput)){
    #htL<-append(htL,c('<li>',paste(listInput,collapse=','),'</li>'))
  #}
  #return(paste(htL,collapse=''))
#}






##' R list to html list
##'
##' Create a html list and apply a class for <ul> and <li>
##'
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @param optional dictionary table for titles
##' @param language to use from dict
##' @return HTML list 
##' @export
#listToHtmlClass <- function(listInput, exclude=NULL,titleMain="",title=NULL,c=0, htL="",classUl="list-group",classLi="list-group-item",dict=NULL,language="en"){

  #c <- c+1 #next

  #if(is.null(listInput)) listInput = character(1);


  #if(is.list(listInput) ){

    #id <- randomString()
    #nL <- names(listInput)
    #if( c == 1 && nchar(titleMain)>0 ) title=titleMain
    #htL <- append(
      #htL,
      #paste(
        #"<div class='fold-container'>",
        #"<input type='checkbox' id='",id,"' class='fold-switch'/>",
        #"<label class='fold-label' for='",id,"'>",toupper(title),"</label>",
        #"<div class='fold-content'>",
        #"<ul class='list-group'>"
        #)
      #) # open

    #if(length(listInput)>0){
      #for(i in 1:length(listInput)){

        #subL <- listInput[[i]]

        #htL<-append(
          #htL,
          #c(
            #paste(
              #'<li class="',
              #paste(classLi,collapse=","),
              #'">'
              #)
            #)
          #)
        #htL <- listToHtmlClass(
          #subL, 
          #exclude=exclude,
          #title=nL[[i]],
          #htL=htL,
          #c=c,
          #classUl=classUl,
          #classLi=classLi,
          #dict = dict,
          #language = language
          #)
      #}
    #}
    #htL<-append(htL,'</li></ul></div></div>') # close

  #}else if(is.character(listInput) || is.numeric(listInput)){
    #if(!is.null(dict)){
      #title <- d(title,dict=dict,lang=language)
      #if(noDataCheck(title)) title <- title
    #}
    #htL<-append(
      #htL,
      #sprintf(
        #"
        #<span class='mx-list-title'>%1$s: </span>
        #<span class='mx-list-content'>%2$s</span>
        #"
        #, title
        #, listInput
        #)
      #)

  #}
  #return(HTML(paste(htL,collapse='')))
#} 



##' R list to html list
##'
##' Create a html list and apply a class for <ul> and <li>
##'
##' @param listInput list in inptu
##' @param htL List to append to
##' @param h Value of the first level of html header
##' @param exclude list named item to exclude
##' @return HTML list 
##' @export
#listToHtmlClassOld <- function(listInput, exclude=NULL,title=NULL,c=0, htL="",classUl="list-group",classLi="list-group-item"){

  #c = c+1 #next

  #if(is.null(listInput)) listInput = character(1);

  #if(is.list(listInput) ){
    #nL <- names(listInput)
    #htL <- append(
      #htL,
      #paste(
        #'<b class="mx-list-title">',toupper(title),'</b>',
        #'<ul class="',
        #paste(
          #classUl,
          #collapse=","
          #),
        #'">'
        #)
      #) # open

    #if(length(listInput)>0){
      #for(i in 1:length(listInput)){

        #subL <- listInput[[i]]

        #htL<-append(
          #htL,
          #c(
            #paste(
              #'<li class="',
              #paste(classLi,collapse=","),
              #'">'
              #)
            #)
          #)
        #htL <- listToHtmlClass(
          #subL, 
          #exclude=exclude,
          #title=nL[[i]],
          #htL=htL,
          #c=c,
          #classUl=classUl,
          #classLi=classLi
          #)
      #}
    #}
    #htL<-append(htL,'</li></ul>') # close

  #}else if(is.character(listInput) || is.numeric(listInput)){
    #htL<-append(
      #htL,
      #sprintf(
        #"
        #<span class='mx-list-title'>%1$s: </span>
        #<span class='mx-list-content'>%2$s</span>
        #"
        #, title
        #, listInput
        #)
      #)

  #}
  #return(HTML(paste(htL,collapse='')))
#} 
 

