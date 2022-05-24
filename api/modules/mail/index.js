import bodyParser from 'body-parser';
import {htmlToText} from 'html-to-text';
import nodemailer from 'nodemailer';
import {templates} from '#mapx/template';
import {settings} from '#root/settings';
import {paramsValidator} from '#mapx/route_validation';
import {parseTemplate} from '#mapx/helpers';
import {decrypt} from '#mapx/db-utils';

const isString = (a) => typeof a === 'string';

export const mwSend = [
  bodyParser.urlencoded({extended: false}),
  bodyParser.json(),
  sendMailApi
];

export default {mwSend};

/**
 * helpers
 *
 */

export async function sendMailApi(req, res) {
  try {
    const dat = req.body;
    /*
     * Decrypt the message if needed
     */
    let conf = {};
    if (dat.encrypted) {
      conf = await decrypt(dat.msg);
    } else {
      if (isString(dat.msg)) {
        conf = JSON.parse(dat.msg);
      } else {
        conf = dat.msg;
      }
    }
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
        'subjectPrefix',
        'encrypt'
      ],
      required: ['from', 'to', 'subject', 'content', 'validUntil']
    });

    if (!validation.ok) {
      throw Error(JSON.stringify(validation));
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
      console.error('Error during sendMail:',e.message);
    }
  } catch (e) {
    return res.status(403).send(e);
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
export function sendMail(opt) {
  return new Promise(function(resolve, reject) {
    var transporter = nodemailer.createTransport(settings.mail.config);
    var def = settings.mail.options;
    const options = {
      ...def,
      ...opt
    };
    if (!options.to || !options.from || !options.subject) {
      throw Error('sendMail: invalid configuration ');
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
export async function sendMailAuto(config) {
  const c = {
    ...settings.mail.options,
    ...config
  };
  if (!c.subtitle) {
    c.subtitle = c.subject;
  }
  const html = templates.email_base;
  c.footer = templates.email_footer;
  const body = parseTemplate(html, c);
  c.html = body;
  c.text = htmlToText(body);
  const res = await sendMail(c);
  return res
}
