const settings_global = {
  contact: {
    email_admin: "admin@host",
    email_info: "info@host",
    email_issues: "issues@host",
    email_guest: "guest@host",
    email_bot: "bot@host",
  },
  mapx: {
    users: {
      root: [1],
      project_creator: [1],
      dev: [1],
    },
  },
  ttl: {
    downloads: {
      hours: 48,
      prefix: "mx_dl*",
    },
  },
  api: {
    host: "api",
    port: "8080",
    host_public: "app.mapx.localhost",
    port_public: "8880",
  },
  socket_io: {
    maxHttpBufferSize: 1e6 * 10, // 10 MB
    pingTimeout: 1e3 * 60 * 2, // 2 min
    emitTimeout: 1e3 * 60, // 1min
    keys: {
      redis_main: "api_io::",
      redis_job: "api_io_job::",
    },
    cookie: {
      name: "mx_api_io",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      domain: "app.mapx.localhost",
    },
    cors: {
      methods: ["GET", "POST"],
      credentials: true,
      origin: [
        "http://dev.mapx.localhost:8880",
        "app.mapx.localhost",
        "app.mapx.org",
        "app.staging.mapx.org",
      ],
    },
  },
  services: {
    mapbox: { token: 1234 },
    maptiler: { token: 1234 },
  },
  links: {
    doc_base: "https://docs.mapx.org",
  },
  mirror: {
    rateLimit: 2000,
    rateWindowMinutes: 15,
  },
  redis: {
    user: "redis",
    port: 6379,
    host: "localhost",
  },
  geoip: {
    url_download: "http://localhost",
  },
  meili: {
    master_key: null,
    port: 7700,
    host: "meili",
    protocol: "http://",
  },
  geoserver: {
    password: "letmein",
    user: "admin",
    url: "http://localhost:8080",
    url_public: "http://localhost:8080",
  },
  db: {
    name: "postgres",
    port: 5432,
    host: "localhost",
    schema: "public",
    timeoutLong: 1000 * 60 * 5, // 5 minutes
    timeoutShort: 1000 * 20, // 20 seconds
    poolMin: 1,
    poolMax: 1,
    admin: {
      user: "postgres",
      password: "1234",
    },
    write: {
      user: "postgres",
      password: "1234",
    },
    read: {
      user: "postgres",
      password: "1234",
    },
    crypto: {
      key: "1234",
    },
    stringRead:
      "PG:host=localhost port=5432 user=postgres dbname=mydb password=pgpass",
    stringWrite:
      "PG:host=localhost port=5432 user=postgres dbname=mydb password=pgpass",
  },
  image: {
    path: {
      permanent: "/tmp/",
      temporary: "/tmp/",
      url: "/userdata/",
    },
  },
  vector: {
    path: {
      temporary: "/tmp/",
      download: "/shared/download",
      download_url: "download",
    },
  },
  mail: {
    config: {
      host: "mail.mapx.org",
      port: 587,
      secure: false,
      auth: {
        user: "example@mapx.org",
        pass: "1234",
      },
    },
    options: {
      from: "bot@mapx.org",
      to: null,
      subject: "test",
      text: "info",
      html: "<b>info</b>",
      // sendAuto
      title: "MapX",
      subtitle: null,
      content: "<b>info</b>",
      subjectPrefix: "[ MapX ]",
    },
  },
  validation_defaults: {
    db: {
      array_operators: {
        ALL: "?&",
        ANY: "?|",
        OR: "?|",
        AND: "?&",
      },
    },
    users: {
      roles: ["admin", "publisher", "member", "public"],
      id_public: 96,
      id_admin: 1,
    },
    languages: {
      codes: ["fr", "en", "es", "ar", "ru", "zh", "de", "bn", "fa", "ps"],
      default: "en",
    },
    tables: {
      layer_id_valid: "_mx_valid",
      layer_id_col: "gid",
      layer_id_geom: "geom",
      attr_not_queryable: ["geom", "gid", "pid"],
      name_not_queryable: [
        "mx_users",
        "mx_sources",
        "mx_views",
        "mx_views_latest",
        "mx_config",
        "mx_logs",
      ],
    },
    views: {
      types: ["vt", "rt", "sm", "cc"],
      keys_out: [
        "*",
        "id",
        "editor",
        "date_modified",
        "data",
        "type",
        "pid",
        "project",
        "readers",
        "editors",
        "_edit",
        "_title",
        "_title_project",
        "_source",
        "_meta",
      ],
      keys_out_public: [
        "*",
        "id",
        "editor",
        "date_modified",
        "data",
        "type",
        "pid",
        "project",
        "readers",
        "editors",
        "_title",
        "_title_project",
        "_meta",
      ],
    },
    search: {
      index: "views",
      indices: ["views", "projects", "sources"],
    },
  },
};

export { settings_global };
