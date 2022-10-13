/**
 * Table data object returned from api.
 * @typedef {Object} EditTableData 
 * @property {boolean} hasGeom - Stored in DB as a spatial layer 
 * @property {EditTableValidation} validation - validation object 
 * @property {string} title - Table title in requested language 
 * @property {boolean} locked - The table is 'locked' ( someone is editing it )
 * @property {Number} part - Chunked table, part number 
 * @property {Number) nParts - Chunked table, total number of chunks
 * @property {Boolean) start - First initial data 
 * @property {Boolean) end - Last data part;
 */
