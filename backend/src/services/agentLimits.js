import redis from "../config/redis.js";

const INPUT_PRICE_PER_1M = parseFloat(process.env.AGENT_INPUT_PRICE_PER_1M || "0.10");
const OUTPUT_PRICE_PER_1M = parseFloat(process.env.AGENT_OUTPUT_PRICE_PER_1M || "0.40");

const memoryCounters = new Map();

function logRedisFallback(err) {
  if (process.env.NODE_ENV === "test") return;
  console.debug("Redis fallback:", err.message);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function keysFor(userId) {
  const day = todayKey();
  const month = monthKey();
  return {
    spendDay: `agent:spend:day:${day}`,
    spendMonth: `agent:spend:month:${month}`,
    requestsDay: `agent:requests:day:${day}`,
    userRequestsDay: `agent:user:${userId}:requests:day:${day}`
  };
}

function memoryGet(key) {
  return memoryCounters.get(key) || 0;
}

function memoryAdd(key, delta) {
  memoryCounters.set(key, memoryGet(key) + delta);
}

async function redisGetFloat(key) {
  try {
    const value = await redis.get(key);
    return value ? parseFloat(value) : 0;
  } catch (err) {
    logRedisFallback(err);
    return memoryGet(key);
  }
}

async function redisIncrFloat(key, delta) {
  try {
    const next = await redis.incrbyfloat(key, delta);
    await redis.expire(key, 60 * 60 * 24 * 40);
    return next;
  } catch (err) {
    logRedisFallback(err);
    memoryAdd(key, delta);
    return memoryGet(key);
  }
}

async function redisIncr(key) {
  try {
    const next = await redis.incr(key);
    await redis.expire(key, 60 * 60 * 24 * 40);
    return next;
  } catch (err) {
    logRedisFallback(err);
    memoryAdd(key, 1);
    return memoryGet(key);
  }
}

export function estimateUsageCostUsd(usage = {}) {
  const inputTokens = Number(usage.prompt_tokens) || 0;
  const outputTokens = Number(usage.completion_tokens) || 0;

  const inputCost = (inputTokens * INPUT_PRICE_PER_1M) / 1_000_000;
  const outputCost = (outputTokens * OUTPUT_PRICE_PER_1M) / 1_000_000;

  return inputCost + outputCost;
}

export async function getAgentLimitStatus(userId) {
  const { spendDay, spendMonth, requestsDay, userRequestsDay } = keysFor(userId);

  const [dailySpendUsd, monthlySpendUsd, dailyRequests, userRequestsToday] = await Promise.all([
    redisGetFloat(spendDay),
    redisGetFloat(spendMonth),
    redisGetFloat(requestsDay),
    redisGetFloat(userRequestsDay)
  ]);

  return {
    limits: {
      unlimited: true
    },
    usage: {
      dailySpendUsd: roundUsd(dailySpendUsd),
      monthlySpendUsd: roundUsd(monthlySpendUsd),
      dailyRequests: Math.floor(dailyRequests),
      userRequestsToday: Math.floor(userRequestsToday)
    }
  };
}

export async function assertAgentWithinLimits() {
  // Unlimited questions for all users — no daily caps or per-user limits.
}

export async function recordAgentUsage(userId, usage) {
  const costUsd = estimateUsageCostUsd(usage);
  const { spendDay, spendMonth, requestsDay, userRequestsDay } = keysFor(userId);

  await Promise.all([
    redisIncrFloat(spendDay, costUsd),
    redisIncrFloat(spendMonth, costUsd),
    redisIncr(requestsDay),
    redisIncr(userRequestsDay)
  ]);

  return { costUsd: roundUsd(costUsd) };
}

function roundUsd(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function resetAgentLimitMemoryForTests() {
  memoryCounters.clear();
}
