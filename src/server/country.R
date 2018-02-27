
#
# Define country.
#
observe({

  country_db <- .get(reactUser$data,c("data","user","cache","last_project"))
  country_def <- config[[c("countries","default","first")]]
  country_query <- query$country
  country_ui <- input$selectCountry 

  # user info
  userRole <- getUserRole()
  isGuest <- isGuestUser()

  # If this is guest, over ride db country
  if( isGuest ){
    country_db <- country_def
  }

  isolate({

    # check current country
    country_react <- reactData$country

    if(!noDataCheck(country_ui) && (country_ui != country_react)){
      country_query = NULL
    }

    if(!noDataCheck(country_query)){
      # priority to query
      country_out <- country_query
    }else{

      # if there is no already defined country but there is something grom the db, use the later
      if(noDataCheck(country_react) && !noDataCheck(country_db)){
        country_out <- country_db

        # if the change comes from the ui, apply
      }else if(!noDataCheck(country_ui)){

        country_out <- country_ui
      }else{
        # nothing to do
        return()
      }
    }

    query$country <<- NULL
    reactData$country <- country_out

  })
})


#
# Update country related stuff
#
observe({

  # data
  country <- reactData$country

  hasCountry <- !noDataCheck(country)
  hasMap <- !noDataCheck(input[[ sprintf("mglEvent_%s_ready",config[[c("map","id")]]) ]])
  isGuest <- isGuestUser()

  if(hasMap && hasCountry){

    
    mxDebugMsg("Fly to " + country )


    tbl <- config[[c("countries","table")]]
    bnd <- tbl[tbl$iso3 == country,c("lat","lng","zoom")][1,]

    if(country=="WLD"){
      filter = list(
        "all", 
        list("in","iso3code",country)
        ) 
    }else{
      filter = list(
        "any",
        list("!in","iso3code",country),
        list("!has","iso3code")
        )
    }

    mglSetFilter(
      id=config[["map"]][["id"]],
      layer="country-code",
      filter=filter
      )

    lat = bnd[['lat']]
    lng = bnd[['lng']]
    zoom = bnd[['zoom']]

    if(!noDataCheck(query$lat) && !noDataCheck(query$lng) && !noDataCheck(query$zoom)){
      lat  = as.numeric(query$lat)
      lng = as.numeric(query$lng)
      zoom = as.numeric(query$zoom)
     
      query$lat <<- NULL
      query$lng <<- NULL
      query$zoom <<- NULL
    }

    mglFlyTo(
      id = config[["map"]][["id"]],
      lat = lat,
      lng = lng,
      zoom = zoom
      )

    if(!isGuest){
      # update reactive value and db if needed
      mxDbUpdateUserData(reactUser,
        path = c("user","cache","last_project"),
        value = country
        )


    }
  }
})



#
# 
# Reset country position 
#
#
if(FALSE){
  observe({

    bound <- input[[sprintf("mglEvent_%s_moveend",config[["map"]][["id"]])]]

    isolate({

      hasData <- !noDataCheck(bound);

      if(hasData){

        country <- input$selectCountry
        tbl <- config[[c("countries","table")]]

        tbl[tbl$iso3==country,c("lat","lng","zoom")] <- bound[c("lat","lng","z")]


        config[[c("countries","table")]] <<- tbl

        write.csv(tbl,
          file.path(
            config[[c("ressources","countries")]],"countries_eiti.csv"
            ),
          row.name=FALSE
          )
      }

    })
  })
}
