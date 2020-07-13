export async function getSourceSummary(opt) {
  const h = mx.helpers;
  opt = Object.assign(
    {},
    {idView: null, idSource: null, idAttr: null, noCache: false},
    opt
  );
  
  if(!h.isSourceId(opt.idSource) && !h.isViewId(opt.idView)){
     throw new Error('Missing id of a view or a source');
  }
  
  const urlSourceSummary = h.getApiUrl('getSourceSummary');
  const query = h.objToParams(opt);
  const url = `${urlSourceSummary}?${query}`;

  const resp = await fetch(url);
  const summary = await resp.json();

  if(h.isObject(summary) && summary.type === "error"){
    throw new Error(summary.msg);
  }

  return summary;

}
