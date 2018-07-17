
module.exports = {
 api : {
   host : "api",
   port : "8080"
 },
 redis : {
    user : "redis",
    port : 6379,
    host : "localhost"
  },
  db :{
    name : 'postgres',
    port : 5432,
    host : 'localhost',
    write : {
      user : "postgres",
      password : "1234"
    },
    read : {
      user : "postgres",
      password : "1234"
    },
    crypto : {
      key: "1234"
    },
    stringRead : 'PG:host=localhost port=5432 user=pguser dbname=mydb password=pgpass',
    stringWrite : 'PG:host=localhost port=5432 user=pguser dbname=mydb password=pgpass'
  },
  image : {
    path : {
      permanent : "/tmp/",
      temporary : "/tmp/",
      url : "/userdata/"
    }
  },
  vector : {
    path : {
      temporary : "/tmp/",
      download : "/shared/download",
      download_url : "download"
    }
  },
  mail : {
    config : {
      emailAdmin : "",
      host : "mail.mapx.org",
      port : 587,
      secure : false,
      auth : {
        user:"example@mapx.org",
        pass:"1234"
      }
    },
    options :{
      from : "bot@mapx.org",
      subject : "test",
      text : "yoply",
      html : "<b>yopla</b>"
    }
  }
};


