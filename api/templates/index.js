const {readTxt} = require('./../utils/utils.js');
exports.getGeojsonTile = readTxt('./templates/sql/getGeojsonTile.sql');
exports.getGeojsonTileOverlap = readTxt(
  './templates/sql/getGeojsonTileOverlap.sql'
);
exports.getUserValidation = readTxt('./templates/sql/getUserValidation.sql');
exports.getViewFull = readTxt('./templates/sql/getViewFull.sql');
exports.getViewRowsId = readTxt('./templates/sql/getViewRowsId.sql');
exports.getLayerIntersectsCountry = readTxt(
  './templates/sql/getIntersectsCountry.sql'
);
exports.getLayerIntersectionCountry = readTxt(
  './templates/sql/getIntersectionCountry.sql'
);
exports.getSourceMetadata = readTxt('./templates/sql/getSourceMetadata.sql');
exports.getSourceSummary_base = readTxt(
  './templates/sql/getSourceSummary_base.sql'
);
exports.getSourceSummary_ext_sp = readTxt(
  './templates/sql/getSourceSummary_ext_sp.sql'
);
exports.getSourceSummary_ext_time = readTxt(
  './templates/sql/getSourceSummary_ext_time.sql'
);
exports.getSourceSummary_attr_continuous = readTxt(
  './templates/sql/getSourceSummary_attr_continuous.sql'
);
exports.getSourceSummary_attr_categorical = readTxt(
  './templates/sql/getSourceSummary_attr_categorical.sql'
);
exports.getViewMetadata = readTxt('./templates/sql/getViewMetadata.sql');
exports.getViewsByProject = readTxt('./templates/sql/getViewsByProject.sql');
exports.getViewsPublic = readTxt('./templates/sql/getViewsPublic.sql');
exports.getProjectViewsStates = readTxt(
  './templates/sql/getProjectViewsStates.sql'
);
exports.getViewSourceAndAttributes = readTxt(
  './templates/sql/getViewSourceAndAttributes.sql'
);
