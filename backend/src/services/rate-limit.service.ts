import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

function hourWindow(now: Date): { key: string; expiresAtMs: number } {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { key: start.toISOString().slice(0, 13), expiresAtMs: end.getTime() };
}

/** Atomically takes one quota slot for a sender in the current UTC hour. */
export async function reserveHourlyQuota(senderId: string, configuredLimit: number) {
  const now = new Date();
  const window = hourWindow(now);
  const limit = Math.min(configuredLimit, env.maxEmailsPerHour);
  const key = `email-rate:${window.key}:${senderId}`;
  const result = (await redis.eval(
    `
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      local limit = tonumber(ARGV[1])
      if current >= limit then return {0, tonumber(ARGV[2])} end
      local next = redis.call('INCR', KEYS[1])
      if next == 1 then redis.call('PEXPIREAT', KEYS[1], ARGV[3]) end
      return {1, 0}
    `,
    1,
    key,
    limit,
    Math.max(1, window.expiresAtMs - now.getTime()),
    window.expiresAtMs
  )) as [number, number];

  return { granted: Number(result[0]) === 1, retryAfterMs: Number(result[1]), windowKey: window.key };
}

/**
 * Reserves a sender-specific time slot using Redis so concurrent workers cannot
 * send two messages from the same sender closer than the configured minimum.
 */
export async function reserveMinimumDelay(senderId: string): Promise<number> {
  const now = Date.now();
  const key = `email-next-slot:${senderId}`;
  const delay = env.minEmailDelayMs;
  const wait = (await redis.eval(
    `
      local now = tonumber(ARGV[1])
      local minDelay = tonumber(ARGV[2])
      local nextSlot = tonumber(redis.call('GET', KEYS[1]) or '0')
      local slot = math.max(now, nextSlot)
      redis.call('SET', KEYS[1], slot + minDelay, 'PX', math.max(minDelay * 2, 60000))
      return slot - now
    `,
    1,
    key,
    now,
    delay
  )) as number;
  return Number(wait);
}

/** Returns true only once per sender/hour, avoiding a Slack alert storm. */
export async function shouldNotifyRateLimit(senderId: string, windowKey: string, ttlMs: number): Promise<boolean> {
  const key = `email-rate-notified:${windowKey}:${senderId}`;
  const reply = await redis.set(key, "1", "PX", Math.max(1, ttlMs), "NX");
  return reply === "OK";
}
