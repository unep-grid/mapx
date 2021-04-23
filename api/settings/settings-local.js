const s = require('./settings-global.js');
const env = process.env;

module.exports = Object.assign(s, {
  api: {
    host: env.API_HOST,
    port: env.API_PORT,
    host_public: env.API_HOST_PUBLIC,
    port_public: env.API_PORT_PUBLIC
  },
  map: {
    token: env.MAPX_MAPBOX_TOKEN
  },
  redis: {
    user: env.REDIS_USER,
    port: env.REDIS_PORT,
    host: env.REDIS_HOST
  },
  meili: {
    master_key: env.MEILI_KEY_MASTER,
    port: env.MEILI_PORT,
    host: env.MEILI_HOST,
    protocol : env.MEILI_PROTOCOL
  },
  db: {
    name: env.POSTGRES_DB,
    port: env.POSTGRES_PORT,
    host: env.POSTGRES_HOST,
    timeout: 1000 * 60 * 5, // 5 minutes
    poolMin: env.POSTGRES_POOL_MIN,
    poolMax: env.POSTGRES_POOL_MAX,
    admin: {
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD
    },
    write: {
      user: env.POSTGRES_USER_WRITE,
      password: env.POSTGRES_USER_WRITE_PASSWORD
    },
    read: {
      user: env.POSTGRES_USER_READ,
      password: env.POSTGRES_USER_READ_PASSWORD
    },
    custom: {
      user: env.POSTGRES_USER_CUSTOM,
      password: env.POSTGRES_USER_CUSTOM_PASSWORD
    },
    crypto: {
      key: env.POSTGRES_KEY_ENCRYPT
    },
    stringWrite:
      'PG:host=' +
      env.POSTGRES_HOST +
      ' port=' +
      env.POSTGRES_PORT +
      ' user=' +
      env.POSTGRES_USER_WRITE +
      ' dbname=' +
      env.POSTGRES_DB +
      ' password=' +
      env.POSTGRES_USER_WRITE_PASSWORD,
    stringRead:
      'PG:host=' +
      env.POSTGRES_HOST +
      ' port=' +
      env.POSTGRES_PORT +
      ' user=' +
      env.POSTGRES_USER_READ +
      ' dbname=' +
      env.POSTGRES_DB +
      ' password=' +
      env.POSTGRES_USER_READ_PASSWORD,
    stringCustom:
      'PG:host=' +
      env.POSTGRES_HOST +
      ' port=' +
      env.POSTGRES_PORT +
      ' user=' +
      env.POSTGRES_USER_CUSTOM +
      ' dbname=' +
      env.POSTGRES_DB +
      ' password=' +
      env.POSTGRES_USER_CUSTOM_PASSWORD
  },
  image: {
    path: {
      permanent: env.MAPX_PATH_USERDATA,
      temporary: '/tmp/',
      url: env.MAPX_PATH_USERDATA_URL
    }
  },
  vector: {
    path: {
      temporary: '/tmp',
      download: env.MAPX_PATH_DOWNLOAD,
      download_url: env.MAPX_PATH_DOWNLOAD_URL
    }
  },
  mail: {
    config: {
      emailAdmin: env.MAIL_ADMIN,
      host: env.MAIL_HOST,
      port: env.MAIL_PORT * 1,
      secure: false,
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASSWORD
      }
    },
    options: {
      from: env.MAIL_FROM,
      to: env.MAIL_ADMIN,
      subject: 'info',
      text: 'info',
      html: '<b>info</b>',
      // sendAuto
      title: 'MapX',
      subtitle: null,
      content: '<b>Info</b>',
      subjectPrefix: '[ MapX ]'
    }
  }
});
