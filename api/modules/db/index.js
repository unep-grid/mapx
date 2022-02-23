import {settings as s}  from '#root/settings' ;
import pg from 'pg';
import redis from 'redis';
import {MeiliSearch} from 'meilisearch';
import GeoServerRestClient from 'geoserver-node-client';

const {Pool, types} = pg;


let redisGet;
let redisSet;
let pgCustom;
let pgRead;
let pgWrite;
let pgAdmin;
let meili;
let geoserver;

try {
  /*
   * custom type parsing
   */
  types.setTypeParser(1700, (val) => parseFloat(val));
  types.setTypeParser(20, (value) => parseInt(value));

  /**
   * Set write pool
   */
  pgWrite = new Pool({
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
  pgRead = new Pool({
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

  /**
   * Set custom pool
   */

  pgCustom = new Pool({
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

  /**
   * Set master pool
   */
  pgAdmin = new Pool({
    host: s.db.host,
    user: s.db.admin.user,
    database: s.db.name,
    password: s.db.admin.password,
    port: s.db.port,
    statement_timeout: s.db.timeout,
    max: s.db.poolMax,
    application_name: 'mx_api_admin'
  });

  pgAdmin.on('error', (err) => {
    console.error('Unexpected error on postgres client admin', err);
    process.exit(-1);
  });

  /**
   * Redis
   */
  const clientRedis = redis.createClient({
    url: 'redis://' + s.redis.host + ':' + s.redis.port
  });
  clientRedis.connect().catch((e) => {
    console.log('Unable to connect', e);
    process.exit(-1);
  });
  clientRedis.on('error', (err) => {
    console.error('Unexpected error on redis client', err);
    process.exit(-1);
  });

  redisGet = clientRedis.get.bind(clientRedis);
  redisSet = clientRedis.set.bind(clientRedis);

  /**
   * MeiliSearch
   */
  meili = new MeiliSearch({
    host: `http://${s.meili.host}:${s.meili.port}`,
    apiKey: s.meili.master_key || null
  });

  /**
   * GeoServer
   */
  geoserver = new GeoServerRestClient(
    s.geoserver.url,
    s.geoserver.user,
    s.geoserver.password
  );
} catch (e) {
  console.error('Unexpected error during clients init', e);
  process.exit(-1);
}

export {
  redisGet,
  redisSet,
  pgCustom,
  pgRead,
  pgWrite,
  pgAdmin,
  meili,
  geoserver
};
