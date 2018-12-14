
/**
 * Get view's source metadata
 * @param {String} id Name/Id of the source layer
 */
export function getSourceMetadata(id,force){

  if( !id ) return Promise.resolve({});

  force = force || false;

  var urlSourceMeta = mx.helpers.getApiUrl('sourceMetadata');

  if( !id || !urlSourceMeta) return Promise.reject('Missing id or fetch URL');

  /* get view object from storage or network */
  var url = urlSourceMeta + id + ( force ? '?date=' + performance.now() : '');

  return fetch( url )
    .then( meta=> meta.json())
    .then( meta => {
      return meta;
    });

}

/**
 * Add source meta object to given view
 * @param {Obejct} view object 
 * @param {Boolean} force force / replace meta object
 */
export function addSourceMetadataToView(opt){
  opt = opt || {};
  var view = opt.view || {}; 
  var force = opt.forceUpdateMeta || false;
  var idSourceLayer = mx.helpers.path(view,"data.source.layerInfo.name","");
  var empty = {};

  if( ! idSourceLayer ) return Promise.resolve(empty);
  if( view._meta && !force ) return Promise.resolve(view._meta);

  return mx.helpers.getSourceMetadata(idSourceLayer,force)
    .then(meta => {
      if(meta && meta.text){
        view._meta = meta; 
        return meta;
      }else{
        return empty;
      }
    });

}

