import { mkdir } from "fs/promises";
import { settings_global } from "./settings-global.js";
const env = process.env;

try {
  await mkdir(env.MAPX_PATH_DOWNLOAD, { recursive: true });
  await mkdir(env.MAPX_PATH_USERDATA, { recursive: true });
} catch (e) {
  throw new Error(`Could not create user/download directory`);
}

const settings = Object.assign({}, settings_global, {
  mapx: {
    users: {
      root: env.MAPX_ROOT_MODE_MEMBERS,
      dev: env.MAPX_DEV_MEMBERS,
      project_creator: env.MAPX_PROJECT_CREATORS,
    },
  },
  api: {
    host: env.API_HOST,
    port: env.API_PORT,
    host_public: env.API_HOST_PUBLIC,
    port_public: env.API_PORT_PUBLIC,
  },
  session: {
    secret: env.API_SESSION_SECRET,
  },
  map: {
    token: env.MAPX_MAPBOX_TOKEN,
  },
  mirror: {
    rateLimit: env.MAPX_MIRROR_RATE_LIMIT,
    rateWindowMinutes: env.MAPX_MIRROR_RATE_WINDOW_MINUTES,
  },
  redis: {
    user: env.REDIS_USER,
    port: env.REDIS_PORT,
    host: env.REDIS_HOST,
  },
  geoip: {
    url_download: env.MAXMIND_URL_DOWNLOAD,
  },
  meili: {
    master_key: env.MEILI_MASTER_KEY,
    port: env.MEILI_PORT,
    host: env.MEILI_HOST,
    protocol: env.MEILI_PROTOCOL,
  },
  geoserver: {
    password: env.GEOSERVER_ADMIN_PASSWORD,
    user: env.GEOSERVER_ADMIN_USERNAME,
    url: env.GEOSERVER_URL,
  },
  geoserver_public: {
    url: env.GEOSERVER_URL_PUBLIC,
  },
  db: {
    name: env.POSTGRES_DB,
    port: env.POSTGRES_PORT,
    host: env.POSTGRES_HOST,
    schema: env.POSTGRES_SCHEMA_MAIN,
    timeoutLong: 1000 * 60 * 5, // 5 minutes
    timeoutShort: 1000 * 20, // 20 seconds
    poolMin: env.POSTGRES_POOL_MIN,
    poolMax: env.POSTGRES_POOL_MAX,
    admin: {
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
    },
    write: {
      user: env.POSTGRES_USER_WRITE,
      password: env.POSTGRES_USER_WRITE_PASSWORD,
    },
    read: {
      user: env.POSTGRES_USER_READ,
      password: env.POSTGRES_USER_READ_PASSWORD,
    },
    custom: {
      user: env.POSTGRES_USER_CUSTOM,
      password: env.POSTGRES_USER_CUSTOM_PASSWORD,
    },
    crypto: {
      key: env.POSTGRES_KEY_ENCRYPT,
    },
    stringWrite:
      "PG:host=" +
      env.POSTGRES_HOST +
      " port=" +
      env.POSTGRES_PORT +
      " user=" +
      env.POSTGRES_USER_WRITE +
      " dbname=" +
      env.POSTGRES_DB +
      " password=" +
      env.POSTGRES_USER_WRITE_PASSWORD,
    stringRead:
      "PG:host=" +
      env.POSTGRES_HOST +
      " port=" +
      env.POSTGRES_PORT +
      " user=" +
      env.POSTGRES_USER_READ +
      " dbname=" +
      env.POSTGRES_DB +
      " password=" +
      env.POSTGRES_USER_READ_PASSWORD,
    stringCustom:
      "PG:host=" +
      env.POSTGRES_HOST +
      " port=" +
      env.POSTGRES_PORT +
      " user=" +
      env.POSTGRES_USER_CUSTOM +
      " dbname=" +
      env.POSTGRES_DB +
      " password=" +
      env.POSTGRES_USER_CUSTOM_PASSWORD,
  },
  image: {
    path: {
      permanent: env.MAPX_PATH_USERDATA,
      temporary: "/tmp/",
      url: env.MAPX_PATH_USERDATA_URL,
    },
  },
  vector: {
    path: {
      temporary: "/tmp",
      download: env.MAPX_PATH_DOWNLOAD,
      download_url: env.MAPX_PATH_DOWNLOAD_URL,
    },
  },
  mail: {
    config: {
      emailAdmin: env.MAIL_ADMIN,
      host: env.MAIL_HOST,
      port: env.MAIL_PORT * 1,
      secure: false,
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASSWORD,
      },
    },
    options: {
      from: env.MAIL_FROM,
      to: env.MAIL_ADMIN,
      subject: "info",
      text: "info",
      html: "<b>info</b>",
      // sendAuto
      title: "MapX",
      subtitle: null,
      content: "<b>Info</b>",
      subjectPrefix: "[ MapX ]",
    },
  },
  project: {
    name: {
      min: 3,
      max: 50,
    },
  },
});

export { settings };
