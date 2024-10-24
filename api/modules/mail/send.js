import express from "express";
import { htmlToText } from "html-to-text";
import nodemailer from "nodemailer";
import { templates } from "#mapx/template";
import { settings } from "#root/settings";
import { parseTemplate } from "#mapx/helpers";
import { decrypt } from "#mapx/db_utils";
import { isEmail, isString, isArrayOf } from "@fxi/mx_valid";
import { mailValidate } from "./validate.js";
import { RateLimiter } from "#mapx/rate_limiter";

/**
 * 10 per hour
 */
const rateLimiter = new RateLimiter({
  limit: 50,
  interval: 60 * 60 * 1e3,
});

export const mwSendMail = [
  express.json(),
  express.urlencoded({ extended: false }),
  mwSend,
];

/**
 * Mail middleware
 */
async function mwSend(req, res) {
  try {
    const dat = req.body;
    /*
     * Always exect encrypted email
     */
    if (!dat.encrypted) {
      return;
    }

    const conf = await decrypt(dat.msg);

    /**
     * Validate
     */
    const validation = mailValidate(conf, ["validUntil"]);

    if (!validation.ok) {
      throw new Error(JSON.stringify(validation));
    }

    /**
     * Limit send message to a recipent
     */
    try {
      const id_rate = `wm_rate_send_to_${JSON.stringify(conf.to)}`;
      await rateLimiter.check(id_rate);
    } catch (e) {
      return res.status(429).json({
        message: e.message,
      });
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
    return res.status(403).json(e);
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
  c.footer = parseTemplate(templates.email_footer, {
    host: settings.api.host_public,
    email: settings.contact.email_info,
  });
  const body = parseTemplate(html, c);
  c.html = body;
  c.text = htmlToText(body);
  return sendMail(c);
}
