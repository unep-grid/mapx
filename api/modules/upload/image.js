import {
  validateTokenHandler,
  validateRoleHandlerFor
} from '#mapx/authentication';
import {settings} from '#root/settings';

import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import md5File from 'md5-file';
const storage = multer.diskStorage({
  destination: function(_, __, cb) {
    const pathTemp = settings.image.path.temporary;
    cb(null, pathTemp);
  },
  filename: function(_, __, cb) {
    const fileHash = crypto
      .createHash('md5')
      .update(Date.now() + '')
      .digest('hex');

    cb(null, fileHash);
  }
});

const upload = multer({storage: storage}).single('image');

export const mwUpload = [
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

async function moveFilesHandler(req, _, next) {
  const userFolder = req.body.idUser;
  const oldPath = req.file.path;
  const imgFolder = settings.image.path.permanent;
  const imgUrl = settings.image.path.url;
  const dir = path.resolve(imgFolder, userFolder);

  try {
    const fileHash = await md5File(oldPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const newPath = path.resolve(dir, fileHash);
    const url = path.resolve(imgUrl, userFolder, fileHash);
    await copyFile(oldPath, newPath);

    req.file.url = url;
    next();
  } catch (e) {
    throw new Error(e);
  }
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
