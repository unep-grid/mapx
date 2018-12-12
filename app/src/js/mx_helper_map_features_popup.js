

/*
 * Get extract features values at given point, group by properties
 * @param {Object} o Options
 * @param {String} o.id Map id
 * @param {String} o.prefix Layer prefix Default = "MX-"
 * @param {Array} o.point Array of coordinates
 */
export function getVectorProperties(o){

  var props = {}; 
  var sep = mx.settings.separators.sublayer;
  var layers = mx.helpers.getLayerNamesByPrefix({
    id: o.map,
    prefix: o.prefix || "MX-"
  });
  var excludeProp = ['mx_t0','mx_t1','gid'];
  var map = mx.helpers.getMap(o.map);
  var features = map.queryRenderedFeatures(o.point,{layers:layers});

  features.forEach(function(f){
    var baseLayer = f.layer.id.split(sep)[0];
    if( !props[baseLayer] ){
      props[baseLayer] = {};
    }
    for(var p in f.properties){
      if( excludeProp.indexOf(p) == -1 ){
        var value = f.properties[p];
        var values = props[baseLayer][p] || [];
        values = values.concat(value);
        props[baseLayer][p] = mx.helpers.getArrayStat({
          stat:"distinct",
          arr: values
        });
      }
    }
  });

  return props;
}


/** 
 * Query WMS with getFeatureInfo
 * @param {Object} opt Options
 * @param {Object||String} opt.map Map object or id of the map
 * @param {Object} opt.point
 * @param 
 */
export function getRasterProperties(opt){

  var map = mx.helpers.getMap(opt.map);
  var layers = {};
  var items = {};

  mx.helpers.getLayerNamesByPrefix({map:map,base:true})
    .map( idView => mx.helpers.getView( idView ))
    .filter( view => view.type == "rt")
    .map( view => {
      var url = mx.helpers.path( view, 'data.source.tiles',[])[0].split('?');
      return {
        id : view.id, 
        title : mx.helpers.getViewTitle(view), 
        url : url[0],
        params : mx.helpers.paramsToObject(url[1])
      };
    })
    .map( item => {
      var params = item.params;
      var isWms = params && params.layers && params.service && params.service.toLowerCase() == "wms";
      var getProperties = () => { return Promise.resolve({});};

      if( isWms ){
        var z = map.getZoom();
        var point = opt.point;
        var xMax = point.x + 1;
        var xMin = point.x - 1;
        var yMax = point.y + 1;
        var yMin = point.y - 1;
        var sw = map.unproject([xMax,yMin]);
        var ne = map.unproject([xMin,yMax]);
        var minLat = Math.min(sw.lat,ne.lat);
        var minLng = Math.min(sw.lng,ne.lng);
        var maxLat = Math.max(sw.lat,ne.lat);
        var maxLng = Math.max(sw.lng,ne.lng);

        var paramsInfo = {
          service : 'WMS',
          request : 'GetFeatureInfo',
          format : 'image/png',
          transparent : true,
          query_layers : params.layers,
          layers : params.layers,
          info_format : 'application/json',
          exceptions : 'application/json',
          feature_count: 1,
          x : 5,
          y : 5,
          width : 9,
          height : 9,
          src : 'EPSG:4326',
          bbox : minLng + ',' + minLat + ',' + maxLng + ',' + maxLat
        };

        var request = item.url + '?' + mx.helpers.objToParams(paramsInfo);
        getProperties = function(){ 
          return fetch( request )
            .then( data => data.json())
            .then( featuresCollection => {
              var props = {};
              if(featuresCollection.exceptions){
                console.log(featuresCollection.exceptions);
                return props;
              }
              featuresCollection.features
                .forEach( feature => {
                  for(var p in feature.properties){
                    if(!props[p]) props[p] = [];
                    props[p].push(feature.properties[p]);
                  }
                });
              return props;
            });
        };
      }
      /**
       * In case of non wms layer, return an empty obj
       */
      items[item.id] = getProperties;
    });

  return(items);
}




/*
 * Convert result from getFeaturesValuesByLayers to HTML 
 * @param {Object} o Options
 * @param {String} o.id Map id
 * @param {Array} o.point Array of coordinates
 * @param {Object} o.popup Mapbox-gl popup object
 */
export function featuresToHtml(o){

  var classGroup = "list-group";
  var classGroupItem = "list-group-item";
  var classGroupItemMember = "list-group-item-member"; 
  var popup = o.popup;
  var langs = mx.helpers.objectToArray(mx.settings.languages) || ["en"];
  var lang = mx.settings.language || langs[0];
  var cEl = function(type){
    return document.createElement(type);
  };
  var map = mx.helpers.getMap(o.id);
  var filters = {};
  var layerVector = {};
  var layerRaster = {};
  var elContainer = cEl("div");
  var elNoData = cEl("div");
  var views = mx.helpers.getViews(o.id);
  elContainer.appendChild(elNoData);
  mx.helpers.getDictItem('noValue').then(txt => {
    elNoData.innerText =  txt;
    elNoData.dataset.lang_key = 'noValue';
  });


  /**
   * Reset filters
   */
  popup.on('close',resetFilter);

  /**
   * Update popup with yet empty content
   */
  popup.setDOMContent(elContainer);

  /*
   * get vector properties 
   */ 
  layerVector = mx.helpers.getVectorProperties({
    map : o.id,
    point : o.point
  });
  render(layerVector);

  /*
   * render raster properties
   */
  layerRaster = mx.helpers.getRasterProperties({
    map : map,
    point : o.point
  });
  render(layerRaster);

  /**
   * Helpers
   */
  function hasActivatedLayer(){
    return mx.helpers.getLayerNamesByPrefix().length > 0;
  }

  function updateReadMore(){
    mx.helpers.uiReadMore(".mx-prop-container",{
      maxHeightClosed : 100,
      selectorParent : elContainer,
      boxedContent : false
    });
  }

  function render(layers){
    var idViews = Object.keys(layers);
    idViews.forEach(id => renderItem(id,layers[id]));
  }

  function renderItem(idView,attributes){
    var view = mx.helpers.getView(idView);
    var language = mx.settings.language;
    var labels = mx.helpers.path(view,'_meta.text.attributes_alias');
    var isVector = view.type == "vt";
    var elLayer = cEl("div");
    var elProps = cEl("div");
    var elWait = cEl("div");
    var elSpinner = cEl("i");
    var elTitle = cEl("span");
    elTitle.classList.add("mx-prop-layer-title");
    elTitle.innerText = mx.helpers.getViewTitle(idView);

    elLayer.className = "mx-prop-group";
    elLayer.dataset.l = idView;
    elLayer.appendChild(elTitle);
    elContainer.appendChild(elLayer);
    elContainer.classList.add("mx-popup-container");
    elContainer.classList.add("mx-scroll-styled");

    elWait.className = "mx-inline-spinner-container";
    elSpinner.className = "fa fa-cog fa-spin";
    elLayer.appendChild(elWait);
    elWait.appendChild(elSpinner);

    elNoData.remove();
    /**
     * Asynchrone attibute request
     */
    var getAttributes = function(){
      return Promise.resolve(attributes);
    };

    if(attributes instanceof Function){
      getAttributes = attributes;
    }

    /**
     * Attributes to ui
     */
    getAttributes().then( attributes  =>{

      elWait.remove();

      var attrNames = Object.keys(attributes);

      if( attrNames.length == 0 ){
        var elNoDataAttr = elNoData.cloneNode(true);
        elLayer.appendChild(elNoDataAttr);
      }

      attrNames.forEach(function(attribute){

        var values = mx.helpers.getArrayStat({
          stat: "sortNatural",
          arr: attributes[attribute]
        });

        var hasValues =  values.length > 0;
        values = hasValues ? values : ["-"];

        var elValue;

        /* Container */
        var elPropContainer = cEl("div");
        elPropContainer.classList.add("mx-prop-container");

        /* Content */
        var elPropContent = cEl("div");
        elPropContent.classList.add("mx-prop-content");

        /* Wrapper */
        var elPropWrapper = cEl("div");

        /* Title */
        var elPropTitle = cEl("span");
        elPropTitle.classList.add('mx-prop-title');
        elPropTitle.setAttribute('title', attribute);

        var label = attribute;
        if( labels && labels[attribute]){
          label = labels[attribute][language] || labels[attribute].en || attribute ;
        }

        elPropTitle.innerText = label;

        /* Toggles */
        var elPropToggles = cEl("div");
        elPropToggles.classList.add("mx-prop-toggles");

        /*Add a toggle for each value */
        for(var i=0, iL=values.length; i<iL; i++){
          var value = values[i];

          if( hasValues && isVector ){
            elValue = mx.helpers.uiToggleBtn({
              label : value,
              onChange : filterValues,
              data : {
                l : idView,
                p : attribute,
                v : value
              },
              labelBoxed : true,
              checked : false
            });
          }else{
            elValue = cEl("span");
            elValue.innerText=value;
          }

          elPropToggles.appendChild(elValue);
        }

        /* Build  */
        elPropContent.appendChild(elPropTitle);
        elPropContent.appendChild(elPropToggles);    
        elPropWrapper.appendChild(elPropContent);
        elPropContainer.appendChild(elPropWrapper);
        elProps.appendChild(elPropContainer);  
        elLayer.appendChild(elProps);
        updateReadMore();
      });

      updateReadMore();
    });

  }


  function resetFilter(){
    for(var idV in filters){
      var view = views[idV];
      view._setFilter({
        filter : ['all'],
        type : "popup_filter"
      });
    }
  }



  function updatePopup(){
    popup._update();
  }

  function filterValues(e,el){

    var  elChecks = popup._content.querySelectorAll(".check-toggle input");
    filters = {}; // reset filter at each request

    mx.helpers.forEachEl({
      els : elChecks,
      callback : buildFilters
    });

    for(var idV in filters){
      var filter = filters[idV];
      var view = views[idV];

      view._setFilter({
        filter : filter,
        type : "popup_filter"
      });
    }

    function buildFilters(el){
      var v = el.dataset.v;
      var l = el.dataset.l;
      var p = el.dataset.p;
      var add = el.checked;
      var isNum = mx.helpers.isNumeric(v);
      var rule = [];

      if( !filters[l] ) filters[l]=['any'];
      if( add ){
        if(isNum){
          rule = ['any',["==",p,v],["==",p,v*1]];
        }else{
          rule = ["==",p,v];
        }
        filters[l].push(rule);
      }
    }
  }
}

