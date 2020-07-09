export async function getSourceStat(opt) {
  const h = mx.helpers;
  opt = Object.assign(
    {},
    {idView: null, idSource: null, idAttr: null, noCache: false},
    opt
  );
  
  if(!h.isSourceId(opt.idSource) && !h.isViewId(opt.idView)){
     throw new Error('Missing id of a view or a source');
  }
  
  const urlSourceStat = h.getApiUrl('getSourceStat');
  const query = h.objToParams(opt);
  const url = `${urlSourceStat}?${query}`;

  const resp = await fetch(url);
  const stat = await resp.json();

  if(h.isObject(stat) && stat.type === "error"){
    throw new Error(stat.msg);
  }

  return stat;

}
