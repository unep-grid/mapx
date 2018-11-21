#
# Map-x (c) unepgrid 2017-present
#

#
# Headers
#

tagList(
  tags$title("MapX"),
  tags$meta(
    name="viewport",
    content="width=device-width, initial-scale=1, maximum-scale=1"
    ),
  tags$meta(
    `http-equiv`="X-UA-Compatible", 
    content="IE=edge"
    ),
  tags$meta(
    name="description",
    content="map-x"
    ),
  tags$meta(
    name="author",
    content="Unep sience division; Fred Moser"
    ),
  tags$meta(
    name="google",
    content="notranslate"
    ),
  tags$meta(
    #
    # Chache handled using service worker
    #
    `http-equiv`="Cache-control",
    content="no-cache"
    ),
  tags$meta(
    name="theme-color",
    content='#15b0f8'
    ),
  tags$link(
    rel="manifest",
    href="/manifest.json"
    ),
#  tags$link(
    #rel="shortcut icon",
    #href ="/sprites/favicon.ico"
    #)m
  HTML(
    # https://realfavicongenerator.net/
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#ffffff">'
    )
  )
