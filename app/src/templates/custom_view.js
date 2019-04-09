
/**
* Custom method for custom view in MapX
* Parameters for onInit and onClose function ;
* @param {Object} o Options
* @param {Object} o.view Map-x view object
* @param {Object} o.map mapbox-gl map object
* @param {String} o.idView If of the view
* @param {String} o.idSource Id of the source
* @param {Element} o.elLegend Element containing the legend
*
*/

return {
  onClose : function(o){ 
    console.log("Custom view closed");
    /**
     * Remove source
     */
    if( o.map.getSource( o.idSource ) ){
      o.map.removeSource( o.idSource );
    }

  },
  onInit : function(o){ 
    console.log("Custom view added");
    /**
     * Set custom source
     */
    o.source = {
      "type": "geojson",
      "data": {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [ 6.111354, 46.213232 ]
        },
        "properties": {
          "title": "Map-x Home"
        }
      }
    };

    /**
     * Set custom layer
     */
    o.layer = {
      "id": o.idView,
      "type": "circle",
      "source": o.idSource,
      "paint": {
        "circle-radius": 6,
        "circle-color": "#B42222"
      },
      "filter": ["==", "$type", "Point"],
    };

    /**
     * Set custom legend
     */
    o.elLegend.innerText = "hello mapx";  

    /**
    * Set layer and source
    */
    o.map.addSource(o.idSource,o.source);
    o.map.addLayer(o.layer,mx.settings.layerBefore);
  }
};
