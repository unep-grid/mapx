var s = require('./settings-global.js');
var env = process.env;

module.exports = {
  api : {
     host : env.API_HOST,
     port : env.API_PORT
  },
  redis : {
    user : env.REDIS_USER,
    port : env.REDIS_PORT,
    host : env.REDIS_HOST
  },
  db :{
    name : env.POSTGRES_DB,
    port : env.POSTGRES_PORT,
    host : env.POSTGRES_HOST,
    write : {
      user : env.POSTGRES_USER_WRITE,
      password : env.POSTGRES_USER_WRITE_PASSWORD
    },
    read : {
      user : env.POSTGRES_USER_READ,
      password : env.POSTGRES_USER_READ_PASSWORD
    },
    crypto : {
      key: env.POSTGRES_KEY_ENCRYPT
    },
    stringRead : 'PG:host=' + env.POSTGRES_HOST + 
    ' port=' + env.POSTGRES_PORT + 
    ' user=' + env.POSTGRES_USER_READ + 
    ' dbname=' + env.POSTGRES_DB +
    ' password=' + env.POSTGRES_USER_READ_PASSWORD,
    stringWrite : 'PG:host=' + env.POSTGRES_HOST + 
    ' port=' + env.POSTGRES_PORT + 
    ' user=' + env.POSTGRES_USER_WRITE + 
    ' dbname=' + env.POSTGRES_DB +
    ' password=' + env.POSTGRES_USER_WRITE_PASSWORD
  },
  image : {
    path : {
      permanent : env.MAPX_PATH_USERDATA,
      temporary : "/tmp/",
      url : env.MAPX_PATH_USERDATA_URL
    }
  },
  vector : {
    path : {
      temporary : "/tmp/",
      download : env.MAPX_PATH_DOWNLOAD,
      download_url : env.MAPX_PATH_DOWNLOAD_URL
    }
  },
  mail : {
    config : {
      emailAdmin : env.MAIL_ADMIN,
      host : env.MAIL_HOST,
      port : env.MAIL_PORT*1,
      secure : false,
      auth : {
        user: env.MAIL_USER,
        pass: env.MAIL_PASSWORD
      }
    },
    options :{
      from : env.MAIL_FROM,
      subject : "info",
      text : "info",
      html : "<b>info</b>"
    }
  }
};



