const s = require("./../settings");
const { Pool, types } = require("pg");
const redis = require("redis");

/*
* custom type parsing
*/
types.setTypeParser(1700, // numeric
  function(val) {
  return parseFloat(val);
});


exports.pgWrite = new Pool({
  host : s.db.host,
  user : s.db.write.user,
  database : s.db.name,
  password : s.db.write.password,
  port : s.db.port 
});

exports.pgRead = new Pool({
  host : s.db.host,
  user : s.db.read.user,
  database : s.db.name,
  password : s.db.read.password,
  port : s.db.port,
  statement_timeout: 30 * 1000
});

exports.redis = redis.createClient({
  url: "redis://"+ s.redis.host + ":" + s.redis.port
});
