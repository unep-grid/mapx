
#
# Define country.
#
observe({
  country_def <- config[[c("countries","default","first")]]

  country_ui <- input$selectCountry
  
  country_db <- .get(reactUser$data,c("data","user","cache","last_project"))

  isolate({

    country_react <- reactData$country
    isGuest <- isTRUE(reactUser$role[["role"]] == "guest")

    if( isGuest ){
      country_db <- country_def
    }

    if(noDataCheck(country_react) && !noDataCheck(country_db)){
      country_out <- country_db
    }else if(!noDataCheck(country_ui)){
      country_out <- country_ui
    }else{
      return()
    }
    
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

  if(hasMap && hasCountry){

    tbl <- config[[c("countries","table")]]
    bnd <- tbl[tbl$iso3 == country,c("lat","lng","zoom")][1,]

    mglSetFilter(
      id=config[["map"]][["id"]],
      layer="country-code",
      filter=list(
        "any",
        list("!in","iso3code",country),
        list("!has","iso3code")
        )
      )

    mglFlyTo(
      id = config[["map"]][["id"]],
      lat = bnd[["lat"]],
      lng = bnd[["lng"]],
      zoom = bnd[["zoom"]]
      )

    # update reactive value and db if needed
    mxDbUpdateUserData(reactUser,
      path = c("user","cache","last_project"),
      value = country
      )

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
