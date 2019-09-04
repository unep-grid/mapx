const s = require('./../settings');
const {Client, types} = require('pg');
const redis = require('redis');

/*
 * custom type parsing
 */
types.setTypeParser(
  1700, // numeric
  function(val) {
    return parseFloat(val);
  }
);

var pgWrite = new Client({
  host: s.db.host,
  user: s.db.write.user,
  database: s.db.name,
  password: s.db.write.password,
  port: s.db.port
});
pgWrite.connect();
exports.pgWrite = pgWrite;

var pgRead = new Client({
  host: s.db.host,
  user: s.db.read.user,
  database: s.db.name,
  password: s.db.read.password,
  port: s.db.port,
  statement_timeout: 30 * 1000
});

pgRead.connect();
exports.pgRead = pgRead;

exports.redis = redis.createClient({
  url: 'redis://' + s.redis.host + ':' + s.redis.port
});
