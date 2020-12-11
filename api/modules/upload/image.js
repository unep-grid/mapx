const {
  validateTokenHandler,
  validateRoleHandlerFor
} = require('@mapx/authentication');
const s = require('@root/settings');

const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const md5File = require('md5-file');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const pathTemp = s.image.path.temporary;
    cb(null, pathTemp);
  },
  filename: function(req, file, cb) {
    const fileHash = crypto
      .createHash('md5')
      .update(Date.now() + '')
      .digest('hex');

    cb(null, fileHash);
  }
});

const upload = multer({storage: storage}).single('image');

module.exports.mwUpload = [
  uploadHandler,
  validateTokenHandler,
  validateRoleHandlerFor('member'),
  moveFilesHandler,
  sendHandler
];

function uploadHandler(req, res, next) {
  upload(req, res, function() {
    next();
  });
}

function moveFilesHandler(req, res, next) {
  const userFolder = req.body.idUser;
  const oldPath = req.file.path;
  const imgFolder = s.image.path.permanent;
  const imgUrl = s.image.path.url;
  const dir = path.resolve(imgFolder, userFolder);

  md5File(oldPath, function(err, fileHash) {
    if (err) {
      throw err;
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const newPath = path.resolve(dir, fileHash);

    const url = path.resolve(imgUrl, userFolder, fileHash);

    copyFile(oldPath, newPath).then(function() {
      req.file.url = url;
      next();
    });
  });
}

function copyFile(source, target) {
  const rd = fs.createReadStream(source);
  const wr = fs.createWriteStream(target);
  return new Promise(function(resolve, reject) {
    rd.on('error', reject);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  }).catch(function(error) {
    rd.destroy();
    wr.end();
    throw error;
  });
}

function sendHandler(req, res, next) {
  const data = {
    url: req.file.url,
    size: [req.body.width, req.body.height]
  };
  res.write(JSON.stringify({type: 'message', msg: data}) + '\t\n');
  res.status(200).end();
  next();
}
