const redis = require("../config/redis.config.js");

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute sliding window
const MAX_REQUESTS = 10; // 10 submissions per user per minute

/**
 * Redis-based sliding window rate limiter.
 * Uses authenticated user ID from JWT (set by authMiddleware).
 */
async function rateLimiter(request, reply) {
  // Use authenticated user ID from JWT token (authMiddleware runs first)
  const userId = request.user?.userId || request.body?.userId;

  if (!userId) {
    return reply.code(400).send({
      success: false,
      message: "userId is required",
      error: "Missing userId",
      data: {},
    });
  }

  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(WINDOW_SIZE_MS / 1000));

    const results = await pipeline.exec();
    const requestCount = results[2][1];

    if (requestCount > MAX_REQUESTS) {
      return reply.code(429).send({
        success: false,
        message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} submissions per minute.`,
        error: "Too many requests",
        data: { retryAfterMs: WINDOW_SIZE_MS },
      });
    }
  } catch (error) {
    // Fail open — allow request if Redis is down
    console.error("Rate limiter error:", error);
  }
}

module.exports = rateLimiter;
