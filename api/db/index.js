const s = require('./../settings');
const {Pool, types} = require('pg');
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

var pgWrite = new Pool({
  host: s.db.host,
  user: s.db.write.user,
  database: s.db.name,
  password: s.db.write.password,
  port: s.db.port,
  max: 1
});
exports.pgWrite = pgWrite;

pgWrite.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});


var pgRead = new Pool({
  host: s.db.host,
  user: s.db.read.user,
  database: s.db.name,
  password: s.db.read.password,
  port: s.db.port,
  statement_timeout: 30 * 1000,
  max: 1
});
exports.pgRead = pgRead;

pgRead.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

exports.redis = redis.createClient({
  url: 'redis://' + s.redis.host + ':' + s.redis.port
});
