import bodyParser from "body-parser";
import { htmlToText } from "html-to-text";
import nodemailer from "nodemailer";
import { templates } from "#mapx/template";
import { settings } from "#root/settings";
import { paramsValidator } from "#mapx/route_validation";
import { parseTemplate } from "#mapx/helpers";
import { decrypt } from "#mapx/db-utils";
import { isEmail, isString, isArrayOf } from "@fxi/mx_valid";
const { emailAdmin } = settings.mail.config;

export const mwSend = [
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  mwSendMail,
];

export default { mwSend };

/**
 * helpers
 *
 */

export async function mwSendMail(req, res) {
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
        "from",
        "to",
        "subject",
        "title",
        "subtitle",
        "content",
        "validUntil",
        "subjectPrefix",
        "encrypt",
      ],
      required: ["from", "to", "subject", "content", "validUntil"],
    });

    if (!validation.ok) {
      throw new Error(JSON.stringify(validation));
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
export async function sendMail(opt) {
  try {
    const transporter = nodemailer.createTransport(settings.mail.config);
    const def = settings.mail.options;
    const mail = {
      ...def,
      ...opt,
    };

    /**
     * Set envelope if sender is not the same as the
     * SMTP config email
     */
    if (mail.from != def.from) {
      mail.envelope = {
        from: mail.from,
        to: mail.to,
      };
      mail.from = def.from;
    }

    const validTo = isEmail(mail.to) || isArrayOf(mail.to, isEmail);
    const validFrom = isEmail(mail.from);
    const validSubject = isString(mail.subject);

    const valid = validTo && validFrom && validSubject;

    if (!valid) {
      throw new Error("sendMail: invalid configuration ");
    }

    const info = await transporter.sendMail(mail);

    return info;
  } catch (err) {
    console.error({
      title: "Error during sendMail",
      config: opt,
      message: err.message,
      date: new Date(),
    });
    return err;
  }
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
    ...config,
  };
  if (!c.subtitle) {
    c.subtitle = c.subject;
  }
  const html = templates.email_base;
  c.footer = templates.email_footer;
  const body = parseTemplate(html, c);
  c.html = body;
  c.text = htmlToText(body);
  return sendMail(c);
}
