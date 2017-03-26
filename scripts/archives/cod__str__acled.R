library(geojsonio)

gpath = "/Users/fxi/ownCloud/MAPX\ owncloud/InputData/Platform-Data/COD/STRESSES/ACLED_data-scripts-and-maps_Thomas/Scripts/Exemple/ACLED_RDC_2015-09-11_to_2016-09-10.geojson"

mxDbAddGeoJSON(geojsonPath=gpath,tableName="cod__str__acled_events")


timeNow = Sys.time()

tbl <- list(
  country = "COD",
  layer = "cod__str__acled_events",
  class = "str",
  tags = "acled_events",
  editor = 2,
  reviewer = 2,
  revision = 0,
  validated = TRUE,
  archived = FALSE,
  date_created = timeNow,
  date_archived = as.POSIXct(as.Date(0,origin="1970/01/01")),
  date_modified = timeNow,
  date_validated = timeNow,
  meta = mxToJsonForDb(list(year="2015-2016",source="")),
  target = mxToJsonForDb(list("self"))
  )

mxDbAddRow(tbl,"mx_layers")

#geojson_write(out,file="~/Downloads/test_out.geojson")
