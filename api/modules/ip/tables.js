import { Sql } from "sql-ts";
const sql = new Sql("postgres");

const confCode = {
  filesRegex: [
    /^.*GeoLite2-Country-Blocks-IPv6.csv$/,
    /^.*GeoLite2-Country-Blocks-IPv4.csv$/,
  ],
  table: {
    name: "_tmp_ip_code",
    columns: [
      { name: "network", dataType: "INET" },
      { name: "geoname_id", dataType: "INT" },
      { name: "registered_country_geoname_id", dataType: "INT" },
      { name: "represented_country_geoname_id", dataType: "INT" },
      { name: "is_anonymous_proxy", dataType: "INT" },
      { name: "is_satellite_provider", dataType: "INT" },
      { name: "is_anycast", dataType: "INT" },
    ],
  },
};

const confName = {
  filesRegex: [/^.*GeoLite2-Country-Locations-en.csv$/],
  table: {
    name: "_tmp_ip_name",
    columns: [
      { name: "geoname_id", dataType: "INT" },
      { name: "locale_code", dataType: "varchar(2)" },
      { name: "continent_code", dataType: "varchar(2)" },
      { name: "continent_name", dataType: "TEXT" },
      { name: "country_iso_code", dataType: "varchar(2)" },
      { name: "country_name", dataType: "TEXT" },
      { name: "is_in_european_union", dataType: "INT" },
    ],
  },
};
const confFinal = {
  table: {
    name: "mx_ip",
    columns: [
      { name: "country_iso_code", dataType: "varchar(2)" },
      { name: "country_name", dataType: "TEXT" },
      { name: "network", dataType: "INET" },
    ],
  },
};

confCode.sqlTbl = sql.define(confCode.table);
confName.sqlTbl = sql.define(confName.table);
confFinal.sqlTbl = sql.define(confFinal.table);
const tblIp = confFinal.sqlTbl;

export { tblIp, confFinal, confName, confCode };
