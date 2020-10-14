module.exports = {
  api: {
    host: 'api',
    port: '8080',
    host_public: 'app.mapx.localhost',
    port_public: '8880'
  },
  map: {
    token: ''
  },
  redis: {
    user: 'redis',
    port: 6379,
    host: 'localhost'
  },
  db: {
    name: 'postgres',
    port: 5432,
    host: 'localhost',
    timeout : 1000 * 60 * 5, // 5 minutes
    poolMin: 1,
    poolMax: 1,
    admin : {
      user: 'postgres',
      password : '1234'
    },
    write: {
      user: 'postgres',
      password: '1234'
    },
    read: {
      user: 'postgres',
      password: '1234'
    },
    crypto: {
      key: '1234'
    },
    stringRead:
      'PG:host=localhost port=5432 user=postgres dbname=mydb password=pgpass',
    stringWrite:
      'PG:host=localhost port=5432 user=postgres dbname=mydb password=pgpass'
  },
  image: {
    path: {
      permanent: '/tmp/',
      temporary: '/tmp/',
      url: '/userdata/'
    }
  },
  vector: {
    path: {
      temporary: '/tmp/',
      download: '/shared/download',
      download_url: 'download'
    }
  },
  mail: {
    config: {
      emailAdmin: '',
      host: 'mail.mapx.org',
      port: 587,
      secure: false,
      auth: {
        user: 'example@mapx.org',
        pass: '1234'
      }
    },
    options: {
      from: 'bot@mapx.org',
      subject: 'test',
      text: 'yoply',
      html: '<b>yopla</b>'
    }
  },
  validation_defaults: {
    db : {
      array_operators : {
        ALL: '?&',
        ANY: '?|',
        OR: '?|',
        AND: '?&'
      }
    },
    users: {
      roles: ['admin','publisher','member','public'],
      id_public: 96,
      id_admin: 1
    },
    tables : {
     attr_not_queryable : [
      "geom",
       "gid",
       "pid"
     ],
     name_not_queryable : [
       'mx_users',
       'mx_sources',
       'mx_views',
       'mx_views_latest',
       'mx_config',
       'mx_logs'
     ]
    },
    views: {
      types: ['vt', 'rt', 'sm', 'cc'],
      keys_out: [
        '*',
        'id',
        'editor',
        'date_modified',
        'data',
        'type',
        'pid',
        'project',
        'readers',
        'editors',
        '_edit',
        '_title',
        '_title_project',
        '_source',
        '_meta'
      ],
      keys_out_public: [
        '*',
        'id',
        'editor',
        'date_modified',
        'data',
        'type',
        'pid',
        'project',
        'readers',
        'editors',
        '_title',
        '_title_project',
        '_meta'
      ]
    }
  }
};
