const s = require('@root/settings');
const fs = require('fs');
const path = require('path');
const {Pool, Client, types} = require('pg');
const redis = require('redis');
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
/*
 * custom type parsing
 */
types.setTypeParser(1700, (val) => {
  return parseFloat(val);
});
types.setTypeParser(20, (value) => {
  return parseInt(value);
});

/**
 * Init sql fun
 */
const start = Date.now();
initSqlFun().then((r) => {
  console.log(
    `${r.length} SQL function(s) imported in ${Date.now() - start} ms`
  );
});

/**
 * Set write pool
 */
const pgWrite = new Pool({
  host: s.db.host,
  user: s.db.write.user,
  database: s.db.name,
  password: s.db.write.password,
  port: s.db.port,
  max: s.db.poolMax,
  application_name: 'mx_api_write'
});

pgWrite.on('error', (err) => {
  console.error('Unexpected error on postgres client write', err);
  process.exit(-1);
});

/**
 * Set read pool
 */
const pgRead = new Pool({
  host: s.db.host,
  user: s.db.read.user,
  database: s.db.name,
  password: s.db.read.password,
  port: s.db.port,
  statement_timeout: s.db.timeout,
  max: s.db.poolMax,
  application_name: 'mx_api_read'
});

pgRead.on('error', (err) => {
  console.error('Unexpected error on postgres client read', err);
  process.exit(-1);
});

const pgCustom = new Pool({
  host: s.db.host,
  user: s.db.custom.user,
  database: s.db.name,
  password: s.db.custom.password,
  port: s.db.port,
  statement_timeout: s.db.timeout,
  max: s.db.poolMax,
  application_name: 'mx_api_custom'
});

pgCustom.on('error', (err) => {
  console.error('Unexpected error on postgres client custom', err);
  process.exit(-1);
});

const clientRedis = redis.createClient({
  url: 'redis://' + s.redis.host + ':' + s.redis.port
});

clientRedis.on('error', (err) => {
  console.error('Unexpected error on redis client', err);
  process.exit(-1);
});

const redisGet = promisify(clientRedis.get).bind(clientRedis);
const redisSet = promisify(clientRedis.set).bind(clientRedis);

module.exports = {
  redisGet,
  redisSet,
  clientRedis,
  pgCustom,
  pgRead,
  pgWrite
};

/**
 * Import/refresh SQL function at init
 */
async function initSqlFun() {
  const pgAdmin = new Client({
    host: s.db.host,
    user: s.db.admin.user,
    database: s.db.name,
    password: s.db.admin.password,
    port: s.db.port
  });

  pgAdmin.connect();

  pgAdmin.on('error', (err) => {
    console.error('Unexpected error on postgres client admin', err);
    process.exit(-1);
  });

  /**
   * Import plpsql functions
   */
  try {
    const sqlFileDir = path.join(__dirname, 'sql');
    /**
     * Get files
     */
    const filesAll = await readDir(sqlFileDir, {encoding: 'utf8'});
    const files = filesAll.reduce((a, f) => {
      if (!!f.match(/\.sql$/)) {
        a.push(f);
      }
      return a;
    }, []);

    /**
     * Import
     */
    const queries = files.map(async (file) => {
      const filePath = path.join(sqlFileDir, file);
      const sql = await readFile(filePath, (endoding = 'UTF-8'));
      return pgAdmin.query(sql);
    });
    const results = await Promise.all(queries);
    pgAdmin.end();
    return results;
  } catch (e) {
    pgAdmin.end();
    console.error('Unexpected error when reading pg functions', e);
    process.exit(-1);
  }
}
