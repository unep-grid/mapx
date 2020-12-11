const bodyParser = require('body-parser');
const htmlToText = require('html-to-text');
const nodemailer = require('nodemailer');
const template = require('@mapx/template');
const settings = require('@root/settings');
const {paramsValidator} = require('@mapx/route_validation');
const {parseTemplate} = require('@mapx/helpers');
const {decrypt} = require('@mapx/db-utils');

module.exports.mwSend = [
  bodyParser.urlencoded({extended: false}),
  bodyParser.json(),
  sendMailApi
];

module.exports.sendMail = sendMail;
module.exports.sendMailAuto = sendMailAuto;
/**
 * helpers
 *
 */

async function sendMailApi(req, res) {
  try {
    const dat = req.body;
    /*
     * Decrypt the message
     */
    const conf = await decrypt(dat.msg);
    /**
     * Validate
     */
    const validation = paramsValidator(conf, {
      expected: [
        'from',
        'to',
        'subject',
        'title',
        'subtitle',
        'content',
        'validUntil',
        'subjectPrefix'
      ],
      required: ['from', 'to', 'subject', 'content', 'validUntil']
    });

    if (!validation.ok) {
      throw new Error(validation);
    }

    try {
      /**
       * Send mail
       */
      const msg = await sendMailAuto(conf);
      /**
       * Sample accepted 
       * {
       *   "accepted": [
       *     "email@test.com"
       *   ],
       *     "rejected": [],
       *     "envelopeTime": 76,
       *     "messageTime": 329,
       *     "messageSize": 60948,
       *     "response": "251 Ok:";
       *   "envelope": {
       *     "from": "sender@test.com",
       *     "to": [
       *       "email@test.com"
       *     ]
       *   },
       *     "messageId": "<e47e7e34-78a3-7842-b92a-06773d54bf97@mapx.org>"
       * }
       */
      res.send(msg);
    } catch (e) {
      /**
      * Sample error
      * {
      *   stack: 'ReferenceError: ...',
      *   message: 'option is not defined'
      * };
      */
      res.status(503).send(e);
    }
  } catch (e) {
    return res.status(403).send('Bad request ' + e);
  }
}

/**
 * Send a mail
 * @param {Object} opt options
 * @param {String} opt.from Sender message email
 * @param {String} opt.to Recipient message email
 * @param {String} opt.subject Subject
 * @param {String} opt.text Email text version
 * @param {String} opt.html Email body html version
 */
function sendMail(opt) {
  return new Promise(function(resolve, reject) {
    var transporter = nodemailer.createTransport(settings.mail.config);
    var def = settings.mail.options;
    const options = Object.assign({}, def, opt);
    if (!options.to || !options.from || !options.subject) {
      throw new Error('sendMail: invalid configuration ');
    }
    transporter.sendMail(options, function(error, info) {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
}
/**
 * Send a mail
 * @param {Object} opt options
 * @param {String} opt.from Sender message email
 * @param {String} opt.to Recipient message email
 * @param {String} opt.subject Subject
 * @param {String} opt.title,
 * @param {String} opt.subtitle,
 * @param {String} opt.content,
 * @param {String} opt.subjectPrefix Subject prefix
 */
function sendMailAuto(config) {
  const c = Object.assign({}, settings.mail.options, config);
  if (!c.subtitle) {
    c.subtitle = c.subject;
  }
  const html = template.email_base;
  c.footer = template.email_footer;
  const body = parseTemplate(html, c);
  c.html = body;
  c.text = htmlToText.fromString(body);
  return sendMail(c);
}
