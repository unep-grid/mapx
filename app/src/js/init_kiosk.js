
document.addEventListener("DOMContentLoaded", function() {

  console.log("KIOSK MODE");

  var h = mx.helpers;
  var q = h.searchToObject().k;
  var hasLatLng = h.isNumeric(q.lng) && h.isNumeric(q.lat);
  var idMap = mx.settings.map.id;
  mx.maps[idMap] = {};

  h.updateSettings({
    modeKiosk : true,
    apiHost : 'api.mapx.localhost',
    apiPort : '8880',
    mapboxToken : 'pk.eyJ1IjoiaGVsc2lua2kiLCJhIjoia1lFZVlNZyJ9.dVxyXwMZWRmnrXnmOuWAMQ',
  });

  if( !q || !q.views || q.views.length === 0 ){
    h.modal({
      title : "Error",
      content : "No views to query found, empty map"
    });
  }

  h.getViewsRemote(q.views)
    .then(function(views){
      mx.maps[idMap].views = views;
      /* Get bounds */
      return h.getViewsBounds(views);
    })
    .then(function(bounds){
      mx.settings.bounds = bounds;
      /*
       * Init map
       */
      return h.initMapx({
        id : idMap,
        mapPosition: {
          lat : q.lat,
          lng : q.lng,
          zoom : q.zoom,
          bounds : bounds
        }
      });
    })
    .then(function(map){
      map.once('load',function(){
        /**
         * Add views
         */
        mx.maps[idMap].views.forEach( v => {
          h.viewLayersAdd({viewData:v});
        });
        /*
         * secondary centering method this should be done at init, but see https://github.com/mapbox/mapbox-gl-js/issues/1970
         */
        if( !hasLatLng ){
          map.fitBounds( mx.settings.bounds );
        }
        /**
         * Add country highlight
         */
        if( q.country ){
          map.setFilter('country-code',['any',
            [ '!in', 'iso3code', q.country ] ,
            [ '!has','iso3code' ]
          ]);

        }
      });
    });
});

