#
# Simple maintenance panel
#

language = query$language
if( noDataCheck(language) ){
  language <- browserData$language
  if(noDataCheck(language)){
    language <- 'en'
  }
}

mxModal(
  id ="mx-modal-maintenance",
  title = d('app_maintenance_title',language),
  content = tagList(
    h3(d('app_maintenance_title',language)),
    p(HTML(d('app_maintenance_text',language)))
    )
  )

