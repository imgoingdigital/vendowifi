import Redis from 'ioredis';

const buckets = new Map<string, { count: number; reset: number }>(); // fallback

interface RateOptions { windowMs: number; max: number; prefix?: string; }

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  return redis;
}

export async function rateLimit(key: string, opts: RateOptions) {
  const r = getRedis();
  const now = Date.now();
  const windowKey = `${opts.prefix || 'rl'}:${key}`;
  if (r) {
    const ttl = Math.ceil(opts.windowMs / 1000);
    const lua = `local c = redis.call('INCR', KEYS[1])\nif tonumber(c) == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\nreturn c`;
    try {
      const count = Number(await r.eval(lua, 1, windowKey, ttl));
      if (count > opts.max) {
        const pttl = await r.pttl(windowKey);
        return { allowed: false, remaining: 0, reset: now + (pttl > 0 ? pttl : opts.windowMs) };
      }
      const pttl = await r.pttl(windowKey);
      return { allowed: true, remaining: Math.max(0, opts.max - count), reset: now + (pttl > 0 ? pttl : opts.windowMs) };
    } catch (e) {
      // fall through to in-memory if Redis issue
    }
  }
  const bucket = buckets.get(windowKey);
  if (!bucket || bucket.reset < now) {
    buckets.set(windowKey, { count: 1, reset: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1, reset: now + opts.windowMs };
  }
  if (bucket.count >= opts.max) return { allowed: false, remaining: 0, reset: bucket.reset };
  bucket.count += 1;
  return { allowed: true, remaining: opts.max - bucket.count, reset: bucket.reset };
}

// Simple helper for consistent key composition
export function rlKey(parts: (string | number | undefined | null)[]) {
  return parts.filter(Boolean).join(':');
}
