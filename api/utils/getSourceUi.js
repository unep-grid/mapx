var sendMail = require('./mail.js').sendMail;
var spawn = require('child_process').spawn;
var settings = require.main.require('./settings');
var emailAdmin = settings.mail.config.emailAdmin;
var template = require('../templates');
var utils = require('./utils.js');

exports.get = function(req, res) {
  var id = req.query.id;
  var email = req.query.email;
  var token = req.query.token;
  var format = req.query.format;
  var clipCountryIso3 = req.query.iso3;
  var fileFormat = {
    GPKG: {
      ext: 'gpkg'
    },
    GML: {
      ext: 'gml'
    },
    KML: {
      ext: 'kml'
    },
    GPX: {
      ext: 'gpx'
    },
    GeoJSON: {
      ext: 'geojson'
    }
  };
  var formatDefault = 'GPKG';

  //var countryLayer = mx_country
  if (!id) {
    res.status(403).send('No id.');
    return;
  }
  if (!email) {
    res.status(403).send('No email.');
    return;
  }
  if (!token) {
    res.status(403).send('No token.');
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.write('<html>');
  res.write(
    '<head><style>html,body {padding:20px;font-family:sans-serif}</style></head>'
  );
  res.write('<body>');

  if (!format || !fileFormat[format]) {
    res.write(
      '<p> Format "' +
        format +
        '" not valid. Using default ( ' +
        formatDefault +
        ' ) \n <p>'
    );
    format = formatDefault;
  }

  var sql = 'SELECT * from ' + id;

  if (clipCountryIso3 && clipCountryIso3.length === 3) {
    sql = utils.parseTemplate(template.getLayerIntersectsCountry, {
      idLayer: id,
      idLayerCountry: 'mx_countries',
      idIso3: clipCountryIso3
    });
  }
  var ext = fileFormat[format].ext;
  var layername = id;
  var filename = '/tmp/' + id + '.' + ext;
  var args = [
    '-f',
    format,
    filename,
    settings.db.stringRead,
    '-lco',
    'GEOMETRY_NAME=geom',
    '-nln',
    layername,
    '-sql',
    sql,
    '-skipfailures',
    '-progress',
    '-overwrite'
  ];
  var cmd = 'ogr2ogr';
  var ogr = spawn(cmd, args);
  res.write('<p> Generating file for table ' + id + '\n' + '<p>');

  ogr.stdout.on('data', function(data) {
    res.write(data);
  });

  ogr.stderr.on('data',function(){});

  ogr.on('exit', function(code) {
    if (code !== 0) {
      res.write('<p> send mail... <p>');
      sendMail({
        to: [email, emailAdmin].join(','),
        text: 'hello, the export failed.  Please try again.',
        subject: 'mapx export issue'
      });
      res.write('Error, ogr process exited with code ' + code);
      res.end();
      return;
    }

    res.write('<p> send mail... <p>');
    sendMail({
      to: email,
      text: 'hello, here is the link for your download : ' + filename,
      subject: 'mapx download '
    });

    res.write(
      '<p>Download link:<a href="' + filename + '">' + filename + '</a></p>'
    );
    res.write('</body>');
    res.write('</html>');
    res.end();
  });
};
