import { pgRead, redisSet, redisGet } from "#mapx/db";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

export const mwHealth = [limiter, health];

async function health(_, res) {
  try {
    // Set a temporary key in Redis
    await redisSet("health_check", "ok", "EX", 5); // Set to expire after 5 seconds

    // Retrieve the temporary key
    const redisValue = await redisGet("health_check");

    if (redisValue !== "ok") {
      throw new Error("Redis health check failed");
    }

    // Postgres health check
    try {
      await pgRead.query("SELECT NOW()");
    } catch (error) {
      console.error(`Postgres check failed: ${error}`);
      throw new Error("Postgres health check failed");
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error(`Health check failed: ${error}`);
    res.status(500).json({ status: "fail", error: error.message });
  }
}
