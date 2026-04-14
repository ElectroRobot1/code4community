const globalStore = globalThis.__rateLimitStore || new Map();
globalThis.__rateLimitStore = globalStore;

function nowMs() {
  return Date.now();
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  return firstForwarded || request.headers.get("x-real-ip") || "unknown";
}

function getRateLimitBucket(key) {
  if (!globalStore.has(key)) {
    globalStore.set(key, []);
  }
  return globalStore.get(key);
}

export function checkSlidingWindowRateLimit({
  key,
  maxRequests,
  windowMs,
  now = nowMs(),
}) {
  const bucket = getRateLimitBucket(key);
  const validRequests = bucket.filter((timestamp) => timestamp > now - windowMs);

  if (validRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
    };
  }

  validRequests.push(now);
  globalStore.set(key, validRequests);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetAt: now + windowMs,
  };
}

export function avatarRouteRateLimit(request) {
  const ip = getClientIp(request);
  return checkSlidingWindowRateLimit({
    key: `avatar:${ip}`,
    maxRequests: 30,
    windowMs: 60 * 1000,
  });
}

