const sql = require('node-sql-2');
sql.setDialect('postgres');

const confCode = {
  filesRegex: [
    new RegExp('^.*GeoLite2-Country-Blocks-IPv6.csv$'),
    new RegExp('^.*GeoLite2-Country-Blocks-IPv4.csv$')
  ],
  table: {
    name: '_tmp_ip_code',
    columns: [
      {name: 'network', dataType: 'INET'},
      {name: 'geoname_id', dataType: 'INT'},
      {name: 'registered_country_geoname_id', dataType: 'INT'},
      {name: 'represented_country_geoname_id', dataType: 'INT'},
      {name: 'is_anonymous_proxy', dataType: 'INT'},
      {name: 'is_satellite_provider', dataType: 'INT'}
    ]
  }
};

const confName = {
  filesRegex: [new RegExp('^.*GeoLite2-Country-Locations-en.csv$')],
  table: {
    name: '_tmp_ip_name',
    columns: [
      {name: 'geoname_id', dataType: 'INT'},
      {name: 'locale_code', dataType: 'varchar(2)'},
      {name: 'continent_code', dataType: 'varchar(2)'},
      {name: 'continent_name', dataType: 'TEXT'},
      {name: 'country_iso_code', dataType: 'varchar(2)'},
      {name: 'country_name', dataType: 'TEXT'},
      {name: 'is_in_european_union', dataType: 'INT'}
    ]
  }
};
const confFinal = {
  table: {
    name: 'mx_ip',
    columns: [
      {name: 'country_iso_code', dataType: 'varchar(2)'},
      {name: 'country_name', dataType: 'TEXT'},
      {name: 'network', dataType: 'INET'}
    ]
  }
};

confCode.sqlTbl = sql.define(confCode.table);
confName.sqlTbl = sql.define(confName.table);
confFinal.sqlTbl = sql.define(confFinal.table);

exports.confCode = confCode;
exports.confName = confName;
exports.confFinal = confFinal;
exports.tblIp = confFinal.sqlTbl;

