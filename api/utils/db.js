const pgRead = require.main.require("./db").pgRead;
const pgWrite = require.main.require("./db").pgWrite;
const settings = require.main.require("./settings");
const key =  settings.db.crypto.key;

exports.decrypt = function(txt){
  var sqlDecrypt = 'SELECT mx_decrypt(\'' + txt + '\',\'' + key + '\') query';

  return pgRead.query(sqlDecrypt)
    .then(function(sqlRes){
      if( sqlRes && sqlRes.rows instanceof Array && sqlRes.rows[0] ){
        data = JSON.parse(sqlRes.rows[0].query);
      }else{
        data = null;
      }
      return data;
    });
};

exports.registerSource = function(idSource,idUser,idProject,title){

  var options = {};

  if(typeof idSource == 'object'){
    options = idSource;
    idSource = options.idSource;
    idUser = options.idUser*1;
    idProject = options.idProject;
    title = options.sourceTitle || options.layerTitle || options.title;
  }

  var sqlAddSource = `INSERT INTO mx_sources (
     id, editor, readers, editors, date_modified, type, project, data
    ) VALUES (
     $1::text,
     $2::integer,
     '["publishers"]',
     '["publishers"]',
     now(),
     'vector',
     $3::text,
     '{"meta":{"text":{"title":{"en":"${ title }"}}}}' 
    )`;

  return  pgWrite.query(sqlAddSource,[idSource, idUser, idProject])
  .then(res => {
    return true;
  });

};

/**
* Get layer columns names
* @param {String} id of the layer
*/
exports.getColumnsNames = function(idLayer){
  var queryAttributes = {
    text: `SELECT column_name AS names 
    FROM information_schema.columns 
    WHERE table_name=$1`,
    values: [idLayer]
  };
  return pgRead.query(queryAttributes)
  .then(r => { 
    return r.rows.map(a => a.names);
  });
};

/**
* Get layer title
* @param {String} id of the layer
*/
function getLayerTitle(idLayer,language){
  language = language || 'en';
  var queryAttributes = {
    text: `SELECT data#>>'{"meta","text","title","${language}"}' AS title 
    FROM mx_sources
    WHERE id=$1`,
    values: [idLayer]
  };
  return pgRead.query(queryAttributes)
    .then(r => { 
      return r.rows[0].title;
    });
}
exports.getLayerTitle = getLayerTitle;
/**
* Check for layer geom validity
* @param {String} idLayer id of the layer to check
*/
function isLayerValid(idLayer){
  var title = "";
  var sqlIsValid =  `
  SELECT count(*) 
  FROM ` + idLayer + ` 
  WHERE ST_IsValid(geom) = false 
  LIMIT 1`;
  return getLayerTitle(idLayer)
    .then(t => {
      title = t;
      return pgRead.query(sqlIsValid);
    })
    .then(res => {

      return { 
        id : idLayer,
        valid : res.rows[0].count == 0,
        title : title
      };

    });

}

exports.isLayerValid = isLayerValid;

/**
* Check for multiple layer geom validity
* @param {Array} idsLayer Array of id of layer to check
*/
exports.areLayersValid = function(idsLayers){
  idsLayers = idsLayers instanceof Array ? idsLayers : [idsLayers];
  var queries = idsLayers.map(isLayerValid);
  return Promise.all(queries);
};
