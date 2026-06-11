import Redis from "ioredis";

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  }
};

const redis = new Redis(redisOptions);

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

export async function initRedis() {
  try {
    await redis.ping();
    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connection failed:", err.message);
    console.warn("Continuing without Redis — will retry on queries");
  }
}

export default redis;
