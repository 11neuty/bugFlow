type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const nextBucket = {
      count: 1,
      resetAt: now + windowMs,
    };

    buckets.set(key, nextBucket);

    return {
      allowed: true,
      retryAfter: 0,
      remaining: limit - 1,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: true,
    retryAfter: 0,
    remaining: limit - bucket.count,
  };
}
