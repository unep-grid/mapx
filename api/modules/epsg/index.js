import { sendJSON, readJSON } from "#mapx/helpers";
const epsgCode = await readJSON("./codes.json", import.meta.url);

/**
* Send the full list. 
* TODO: If the list gets longer, maybe create a simple search tool. 
*/  
export function mwGetEpsgCodesFull(_,res){
   return sendJSON(res,epsgCode,{end:true});
}


