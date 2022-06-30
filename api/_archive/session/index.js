import session from "express-session";
//import connectRedis from "connect-redis";
import { connectRedis } from "./redis.js";
import { settings } from "#root/settings";
import { clientRedis } from "#mapx/db";

const RedisStore = connectRedis(session);

export const mwSession = session({
  store: new RedisStore({ client: clientRedis, prefix: "api_session::" }),
  saveUninitialized: false,
  secret: settings.session.secret,
  resave: false,
  cookie: {
    sameSite: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000,
    httpOnly: true,
  },
});
