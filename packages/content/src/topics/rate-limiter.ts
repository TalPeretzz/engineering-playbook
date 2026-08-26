import type { Topic } from "@engineering-playbook/content-schema";

export const rateLimiter: Topic = {
  slug: "rate-limiter",
  title: "Rate Limiter",
  description:
    "A mechanism that controls the rate at which clients can call an API or consume a resource — protecting services from abuse, overload, and ensuring fair usage.",
  category: "backend-patterns",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  nextTopics: ["idempotency", "circuit-breaker"],

  implementations: {
    typescript: `class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,   // max burst size
    private readonly refillRate: number  // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  allow(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

class RateLimiterService {
  private limiters = new Map<string, TokenBucketRateLimiter>();

  constructor(private readonly capacity: number, private readonly refillRate: number) {}

  isAllowed(clientId: string): boolean {
    if (!this.limiters.has(clientId)) {
      this.limiters.set(clientId, new TokenBucketRateLimiter(this.capacity, this.refillRate));
    }
    return this.limiters.get(clientId)!.allow();
  }
}

const limiter = new RateLimiterService(10, 2); // 10 burst, 2 req/s steady
console.log(limiter.isAllowed("user-123")); // true`,

    python: `import time


class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()

    def allow(self) -> bool:
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now


class RateLimiterService:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._buckets: dict[str, TokenBucket] = {}

    def is_allowed(self, client_id: str) -> bool:
        if client_id not in self._buckets:
            self._buckets[client_id] = TokenBucket(self.capacity, self.refill_rate)
        return self._buckets[client_id].allow()`,

    java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiterService {
    private final int capacity;
    private final double refillRate;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    public RateLimiterService(int capacity, double refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
    }

    public boolean isAllowed(String clientId) {
        buckets.putIfAbsent(clientId, new TokenBucket(capacity, refillRate));
        return buckets.get(clientId).allow();
    }

    static class TokenBucket {
        private final int capacity;
        private final double refillRate;
        private double tokens;
        private long lastRefill;

        TokenBucket(int capacity, double refillRate) {
            this.capacity = capacity; this.refillRate = refillRate;
            this.tokens = capacity; this.lastRefill = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastRefill) / 1000.0;
            tokens = Math.min(capacity, tokens + elapsed * refillRate);
            lastRefill = now;
            if (tokens >= 1) { tokens -= 1; return true; }
            return false;
        }
    }
}`,
  },

  sections: [
    {
      type: "text",
      id: "problem",
      heading: "What problem does it solve?",
      body: [
        {
          type: "p",
          text: "Without rate limiting, a single misbehaving client — or a sudden traffic spike — can take down your entire service. Unprotected API endpoints can be scraped, brute-forced, accidentally overwhelmed by a client bug, or deliberately flooded.",
        },
        {
          type: "p",
          text: "Rate limiting enforces a contract: each client gets a fair share of capacity, and no single client can starve others.",
        },
      ],
    },
    {
      type: "text",
      id: "how-it-works",
      heading: "Common algorithms",
      body: [
        {
          type: "heading",
          level: 3,
          text: "Token Bucket",
        },
        {
          type: "p",
          text: "A bucket holds up to N tokens. Tokens are added at a steady rate (R per second). Each request consumes one token. If the bucket is empty, the request is rejected. Allows bursting up to N requests at once, then throttles to R/s.",
        },
        {
          type: "heading",
          level: 3,
          text: "Fixed Window Counter",
        },
        {
          type: "p",
          text: "Count requests in fixed time windows (e.g., per minute). Reset the counter at the window boundary. Simple but vulnerable to boundary bursts: a client can make N requests at the end of one window and N more at the start of the next — 2N requests in 2 seconds.",
        },
        {
          type: "heading",
          level: 3,
          text: "Sliding Window Counter",
        },
        {
          type: "p",
          text: "A hybrid: track counts in the current and previous fixed windows, weighted by how far into the current window you are. Accurate and memory-efficient — the best balance for most systems.",
        },
        {
          type: "heading",
          level: 3,
          text: "Leaky Bucket",
        },
        {
          type: "p",
          text: "Requests enter a queue. They are processed at a fixed rate. Overflow is rejected. Produces perfectly smooth output but does not allow any bursting.",
        },
      ],
    },
    {
      type: "visual",
      id: "visual",
      heading: "Token Bucket visual",
      content: `Token Bucket (capacity=5, refill=2 tokens/sec):

t=0s:   [●●●●●]  5 tokens
        3 requests arrive → consume 3
        [●●   ]  2 tokens remaining

t=0.5s: +1 token
        [●●●  ]  3 tokens

t=1s:   +1 token → 4 tokens
        5 requests arrive → consume 4, 1 rejected

Fixed Window (limit=5/min) — boundary burst:

00:59:  [req1 req2 req3 req4 req5] → all allowed
00:59+: req6 → rejected (window full)
01:00:  window resets
01:00:  [req7 req8 req9 req10 req11] → all allowed
⚠ 10 requests in ~2 seconds — double the intended rate`,
    },
    {
      type: "complexity",
      id: "complexity",
      heading: "Complexity",
      entries: [
        { operation: "Token Bucket check", time: "O(1)", space: "O(1) per client" },
        { operation: "Fixed Window check", time: "O(1)", space: "O(1) per client" },
        { operation: "Sliding Window Counter", time: "O(1)", space: "O(1) per client" },
        { operation: "Sliding Window Log", time: "O(log N)", space: "O(N) per client", note: "N = requests in window" },
      ],
    },
    {
      type: "tradeoffs",
      id: "tradeoffs",
      heading: "Tradeoffs",
      pros: [
        "Protects downstream services from overload and prevents cascade failures",
        "Enforces fair usage — no single client can monopolize capacity",
        "Token Bucket allows controlled bursting — better UX for well-behaved clients",
        "Sliding Window is accurate without the memory cost of the log approach",
      ],
      cons: [
        "Adds latency on the hot path (especially if using distributed Redis-based limiting)",
        "Distributed rate limiting requires coordination — per-node local limiters are inconsistent",
        "Choosing the right algorithm and parameters requires understanding your traffic patterns",
        "Aggressive limits hurt legitimate users; loose limits don't protect effectively",
      ],
    },
    {
      type: "use-cases",
      id: "use-cases",
      heading: "When to use / when not to use",
      whenToUse: [
        "Public APIs exposed to external clients where abuse is possible",
        "Authentication endpoints to prevent brute-force attacks",
        "Expensive operations (AI inference, file processing) where cost control matters",
        "Multi-tenant systems where one tenant must not starve others",
      ],
      whenNotToUse: [
        "Internal service-to-service calls within a trusted network — use circuit breakers instead",
        "When you don't know your load patterns yet — measure first, then tune limits",
        "When the bottleneck is computation time, not request rate — use queuing instead",
      ],
    },
    {
      type: "text",
      id: "real-world",
      heading: "Real-world usage",
      body: [
        {
          type: "list",
          items: [
            "**GitHub API** — 5,000 requests/hour for authenticated users, 60/hour for unauthenticated",
            "**Stripe API** — rate limits per API key, returns 429 with Retry-After header",
            "**AWS API Gateway** — token bucket algorithm with configurable burst and steady-state limits",
            "**Cloudflare** — rate limiting at the edge, before traffic reaches origin servers",
            "**Nginx limit_req** — leaky bucket rate limiting built into Nginx",
          ],
        },
      ],
    },
  ],

  challenges: [
    {
      type: "multiple-choice",
      id: "rate-limiter-conceptual",
      required: true,
      question:
        "A fixed window rate limiter allows 100 requests per minute. At 11:59:55 a client sends 100 requests (all allowed). At 12:00:01 the window resets and they send 100 more (all allowed). What is the effective request rate in that 6-second window?",
      options: [
        { id: "a", text: "100 requests — the rate limiter is working correctly" },
        { id: "b", text: "200 requests in 6 seconds — the boundary burst problem" },
        { id: "c", text: "50 requests — the limiter pro-rates across windows" },
        { id: "d", text: "The requests at 11:59:55 are queued, not processed immediately" },
      ],
      correctOptionId: "b",
      explanation:
        "This is the 'boundary burst' problem. Both batches are allowed because each falls in a separate window. The client effectively sends 200 requests in ~6 seconds — double the intended rate. Sliding window algorithms solve this by considering a rolling time window instead of fixed reset points.",
    },
    {
      type: "implementation",
      id: "rate-limiter-implementation",
      required: true,
      title: "Implement a Sliding Window Counter",
      description: `Implement a per-client sliding window rate limiter:

- **isAllowed(clientId)** — returns true if the request is within the limit, false otherwise

Use the **sliding window counter** approach: track two fixed windows (current + previous), weighted by how far into the current window you are.

Formula: \`weighted_count = prev_count × (1 − elapsed/window_ms) + curr_count\`

If \`weighted_count >= limit\`, reject. Otherwise increment \`curr_count\` and allow.`,
      starterCode: {
        typescript: `class SlidingWindowRateLimiter {
  private clients = new Map<string, {
    prevCount: number;
    currCount: number;
    windowStart: number;
  }>();

  constructor(private limit: number, private windowMs: number) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    // TODO: implement sliding window counter
    return true;
  }
}`,
        python: `import time


class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window_ms: int):
        self.limit = limit
        self.window_ms = window_ms
        self._clients: dict[str, dict] = {}

    def is_allowed(self, client_id: str) -> bool:
        now_ms = int(time.monotonic() * 1000)
        # TODO: implement sliding window counter
        return True`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowRateLimiter {
    private final int limit;
    private final long windowMs;
    // [prevCount, currCount, windowStart]
    private final Map<String, long[]> clients = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter(int limit, long windowMs) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    public boolean isAllowed(String clientId) {
        long now = System.currentTimeMillis();
        // TODO: implement sliding window counter
        return true;
    }
}`,
      },
      hints: [
        "Track two counters per client: prevCount (previous window) and currCount (current window)",
        "Track windowStart — when the current window began",
        "If now > windowStart + windowMs: roll over (prevCount = currCount, currCount = 0, windowStart = now)",
        "Weighted count = prevCount × (1 − elapsed/windowMs) + currCount",
        "If weighted count >= limit, reject. Otherwise increment currCount and allow.",
      ],
      solution: {
        typescript: `class SlidingWindowRateLimiter {
  private clients = new Map<string, {
    prevCount: number; currCount: number; windowStart: number;
  }>();

  constructor(private limit: number, private windowMs: number) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { prevCount: 0, currCount: 0, windowStart: now });
    }
    const s = this.clients.get(clientId)!;
    const elapsed = now - s.windowStart;

    if (elapsed >= this.windowMs) {
      s.prevCount = elapsed < 2 * this.windowMs ? s.currCount : 0;
      s.currCount = 0;
      s.windowStart = now;
    }

    const weight = 1 - (now - s.windowStart) / this.windowMs;
    const estimate = s.prevCount * weight + s.currCount;
    if (estimate >= this.limit) return false;
    s.currCount++;
    return true;
  }
}`,
        python: `import time

class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window_ms: int):
        self.limit = limit
        self.window_ms = window_ms
        self._clients: dict[str, dict] = {}

    def is_allowed(self, client_id: str) -> bool:
        now = int(time.monotonic() * 1000)
        if client_id not in self._clients:
            self._clients[client_id] = {"prev": 0, "curr": 0, "start": now}
        s = self._clients[client_id]
        elapsed = now - s["start"]
        if elapsed >= self.window_ms:
            s["prev"] = s["curr"] if elapsed < 2 * self.window_ms else 0
            s["curr"] = 0
            s["start"] = now
        weight = 1 - (now - s["start"]) / self.window_ms
        estimate = s["prev"] * weight + s["curr"]
        if estimate >= self.limit:
            return False
        s["curr"] += 1
        return True`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowRateLimiter {
    private final int limit;
    private final long windowMs;
    private final Map<String, long[]> clients = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter(int limit, long windowMs) {
        this.limit = limit; this.windowMs = windowMs;
    }

    public synchronized boolean isAllowed(String clientId) {
        long now = System.currentTimeMillis();
        clients.putIfAbsent(clientId, new long[]{0, 0, now});
        long[] s = clients.get(clientId);
        long elapsed = now - s[2];
        if (elapsed >= windowMs) {
            s[0] = elapsed < 2 * windowMs ? s[1] : 0;
            s[1] = 0; s[2] = now;
        }
        double weight = 1.0 - (double)(now - s[2]) / windowMs;
        double estimate = s[0] * weight + s[1];
        if (estimate >= limit) return false;
        s[1]++;
        return true;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "rate-limiter-system-design",
      required: false,
      title: "Distributed Rate Limiting for a Public API",
      scenario: `You run a REST API used by 10,000 developers. Rate limits are 1,000 requests/minute per API key.

Your API runs on 5 servers behind a load balancer. Each server tracks limits locally in memory.

The problem: a developer discovers they can bypass the limit by distributing requests across servers. Because each server has its own counter, a client can make 5,000 requests/minute (1,000 per server) instead of 1,000.

Design a distributed rate limiting system that enforces limits globally across all servers.`,
      hints: [
        "A shared Redis instance can store counters that all servers read and write atomically",
        "Redis INCR + EXPIRE or a Lua script can implement atomic sliding window counting",
        "What is the latency cost of a Redis call on every request? Can you batch?",
        "If Redis goes down, should you fail-open (allow all) or fail-closed (deny all)?",
        "For high throughput: each server pre-allocates a token quota and syncs periodically",
      ],
      discussionPoints: [
        "**Centralized Redis:** Use Redis INCR + EXPIRE (fixed window) or a Lua script for atomic sliding window. All servers share one counter per API key. Adds ~1ms RTT per request.",
        "**Lua atomicity:** A Lua script in Redis executes atomically — no race conditions between read and increment.",
        "**Fail-open vs. fail-closed:** If Redis is unavailable, fail-open preserves availability but exposes you to abuse. Fail-closed protects but breaks the service for all users. Most choose fail-open with logging.",
        "**Token pre-allocation:** Each server pre-fetches a batch of tokens (e.g., 100). Requests consume local tokens; servers sync with Redis every 100ms. Reduces Redis calls 100× but introduces up to 100ms of burst tolerance.",
        "**Rate limit headers:** Return X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset so clients can self-throttle. Return 429 with Retry-After when limited.",
      ],
    },
  ],
};
