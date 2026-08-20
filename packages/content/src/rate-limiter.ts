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

  content: {
    problemStatement: `
Without rate limiting, a single misbehaving client — or a sudden traffic spike — can take down your entire service. API endpoints that are unprotected can be:

- **Scraped** — bots making thousands of requests per second
- **Brute-forced** — attackers trying millions of password combinations
- **Accidentally overwhelmed** — a client bug causing a retry storm
- **DDoS'd** — deliberate flooding to exhaust resources

Rate limiting enforces a contract: each client gets a fair share of capacity, and no single client can starve others.
    `.trim(),

    howItWorks: `
Several algorithms implement rate limiting. The most important ones:

**1. Token Bucket**
A bucket holds up to N tokens. Tokens are added at a steady rate (R per second). Each request consumes one token. If the bucket is empty, the request is rejected or queued. Allows bursting up to N requests at once, then throttles to R/s.

**2. Fixed Window Counter**
Count requests in fixed time windows (e.g., per minute). Reset the counter at the window boundary. Simple but vulnerable to boundary bursts: a client can make N requests at the end of one window and N more at the start of the next — 2N requests in 2 seconds.

**3. Sliding Window Log**
Store a timestamp for each request. On each new request, remove old timestamps outside the window, count remaining — if below limit, allow. Accurate but memory-intensive.

**4. Sliding Window Counter**
A hybrid: track counts in the current and previous fixed windows, weighted by how far into the current window you are. Accurate and memory-efficient — the best balance for most systems.

**5. Leaky Bucket**
Requests enter a queue (the bucket). They are processed at a fixed rate. Overflow is rejected. Produces perfectly smooth output but doesn't allow bursting.
    `.trim(),

    visualExplanation: `
Token Bucket (capacity=5, refill=2/sec):

t=0s:  [●●●●●]  5 tokens
       3 requests arrive → consume 3 tokens
       [●●  ]   2 tokens remaining

t=0.5s: +1 token (2/s rate)
       [●●● ]   3 tokens

t=1s:  +1 token
       [●●●●]   4 tokens
       5 requests arrive → consume 4, 1 rejected (bucket empty)

Fixed Window (limit=5/min):

00:00–01:00: [req1, req2, req3, req4, req5] → full
00:59: client sends req6 → rejected
01:00: window resets → counter=0
01:00: client sends req7, req8, ..., req12 → allowed (new window)
⚠️ Boundary burst: 10 requests in 2 seconds (00:59 → 01:01)
    `.trim(),

    complexity: [
      { operation: "Token Bucket check", time: "O(1)", space: "O(1) per client" },
      { operation: "Fixed Window check", time: "O(1)", space: "O(1) per client per window" },
      { operation: "Sliding Window Log check", time: "O(log N)", space: "O(N) per client", note: "N = requests in window" },
      { operation: "Sliding Window Counter", time: "O(1)", space: "O(1) per client" },
    ],

    tradeoffs: {
      pros: [
        "Protects downstream services from overload — prevents cascade failures",
        "Enforces fair usage — no single client can monopolize capacity",
        "Provides DoS/DDoS mitigation at the application layer",
        "Token Bucket allows controlled bursting — better UX for well-behaved clients",
        "Sliding Window is accurate without the memory cost of the log approach",
      ],
      cons: [
        "Adds latency on the hot path (especially if using distributed Redis-based limiting)",
        "Distributed rate limiting requires coordination — local limiters per node are inconsistent",
        "Choosing the right algorithm and parameters requires understanding your traffic patterns",
        "Rate limit bypasses are possible with distributed clients sharing state poorly",
        "Aggressive limits hurt legitimate users; loose limits don't protect effectively",
      ],
    },

    whenToUse: [
      "Public APIs exposed to external clients where abuse is possible",
      "Authentication endpoints to prevent brute-force attacks",
      "Expensive operations (AI inference, file processing) where you need to control costs",
      "Multi-tenant systems where one tenant must not starve others",
      "Webhooks and callbacks that could create retry storms",
    ],

    whenNotToUse: [
      "Internal service-to-service calls within a trusted network — add circuit breakers instead",
      "When you don't know your load patterns yet — measure first, then tune limits",
      "When the bottleneck is not request rate but computation time — use queuing instead",
    ],

    realWorldExamples: [
      "**GitHub API** — 5,000 requests/hour for authenticated users, 60/hour for unauthenticated",
      "**Stripe API** — rate limits per API key, returns 429 with Retry-After header",
      "**AWS API Gateway** — token bucket algorithm with configurable burst and steady-state limits",
      "**Cloudflare** — rate limiting rules at the edge, before traffic reaches origin servers",
      "**Redis + Lua scripts** — atomic sliding window counter implementation used by many companies",
      "**Nginx limit_req** — leaky bucket rate limiting built into Nginx",
    ],
  },

  implementations: {
    typescript: `class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,      // max burst size
    private readonly refillRate: number     // tokens per second
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
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Per-client rate limiter using a Map
class RateLimiterService {
  private limiters = new Map<string, TokenBucketRateLimiter>();

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number
  ) {}

  isAllowed(clientId: string): boolean {
    if (!this.limiters.has(clientId)) {
      this.limiters.set(
        clientId,
        new TokenBucketRateLimiter(this.capacity, this.refillRate)
      );
    }
    return this.limiters.get(clientId)!.allow();
  }
}

// Usage: 10 requests burst, 2 requests/sec steady
const limiter = new RateLimiterService(10, 2);
console.log(limiter.isAllowed("user-123")); // true
console.log(limiter.isAllowed("user-123")); // true (until bucket empty)`,

    python: `import time
from collections import defaultdict


class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        """
        capacity: max burst size (tokens)
        refill_rate: tokens added per second
        """
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
        return self._buckets[client_id].allow()


# Usage: 10 requests burst, 2 requests/sec steady state
limiter = RateLimiterService(capacity=10, refill_rate=2)
print(limiter.is_allowed("user-123"))  # True
print(limiter.is_allowed("user-123"))  # True (until bucket empty)`,

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
            this.capacity = capacity;
            this.refillRate = refillRate;
            this.tokens = capacity;
            this.lastRefill = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            refill();
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastRefill) / 1000.0;
            tokens = Math.min(capacity, tokens + elapsed * refillRate);
            lastRefill = now;
        }
    }
}`,
  },

  challenges: [
    {
      type: "multiple-choice",
      id: "rate-limiter-conceptual",
      question:
        "A fixed window rate limiter allows 100 requests per minute. At 11:59:55, a client sends 100 requests (all allowed). At 12:00:01, the window resets and they send 100 more (all allowed). What is the effective request rate in that 6-second window?",
      options: [
        { id: "a", text: "100 requests — the rate limiter is working correctly" },
        { id: "b", text: "200 requests in 6 seconds — the boundary burst problem" },
        { id: "c", text: "50 requests — the limiter pro-rates across windows" },
        { id: "d", text: "The requests at 11:59:55 are queued, not processed immediately" },
      ],
      correctOptionId: "b",
      explanation:
        "This is the 'boundary burst' problem with fixed windows. Both batches are allowed because each falls in a separate window. The client effectively sends 200 requests in ~6 seconds — double the intended rate. Sliding window algorithms solve this by considering a rolling time window instead of fixed reset points.",
    },
    {
      type: "implementation",
      id: "rate-limiter-implementation",
      title: "Implement a Sliding Window Counter",
      description: `Implement a sliding window rate limiter that:

- Tracks request counts for each client
- Uses a **sliding window** (not fixed window) to avoid boundary bursts
- Returns true if the request is allowed, false if the client is over the limit

For simplicity, implement it as a **fixed window with two windows** (current + previous), weighted by how far into the current window you are. This approximates a true sliding window with O(1) memory.

Formula:
\`\`\`
count = prev_count × (1 - elapsed/window_size) + curr_count
\`\`\``,
      starterCode: {
        typescript: `class SlidingWindowRateLimiter {
  private windowMs: number;
  private limit: number;
  private clients = new Map<string, {
    prevCount: number;
    currCount: number;
    windowStart: number;
  }>();

  constructor(windowMs: number, limit: number) {
    this.windowMs = windowMs;
    this.limit = limit;
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    // TODO: implement sliding window counter
    return true;
  }
}`,
        python: `import time


class SlidingWindowRateLimiter:
    def __init__(self, window_ms: int, limit: int):
        self.window_ms = window_ms
        self.limit = limit
        self._clients: dict[str, dict] = {}

    def is_allowed(self, client_id: str) -> bool:
        now_ms = int(time.monotonic() * 1000)
        # TODO: implement sliding window counter
        return True`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SlidingWindowRateLimiter {
    private final long windowMs;
    private final int limit;
    private final Map<String, long[]> clients = new ConcurrentHashMap<>();
    // long[0] = prevCount, long[1] = currCount, long[2] = windowStart

    public SlidingWindowRateLimiter(long windowMs, int limit) {
        this.windowMs = windowMs;
        this.limit = limit;
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
        "If now > windowStart + windowMs: roll over (prev = curr, curr = 0, windowStart = now)",
        "Weighted count = prevCount × (1 - elapsed/windowMs) + currCount",
        "If weighted count >= limit, reject. Otherwise increment currCount and allow.",
      ],
      testCases: [
        {
          id: "rl-tc-1",
          description: "First request within limit is allowed",
          code: `const limiter = new SlidingWindowRateLimiter(5, 1000);
return limiter.isAllowed("user-1");`,
          expected: true,
        },
        {
          id: "rl-tc-2",
          description: "Request is rejected after exceeding the limit",
          code: `const limiter = new SlidingWindowRateLimiter(3, 1000);
limiter.isAllowed("user-1");
limiter.isAllowed("user-1");
limiter.isAllowed("user-1");
return limiter.isAllowed("user-1");`,
          expected: false,
        },
        {
          id: "rl-tc-3",
          description: "Different clients have independent counters",
          code: `const limiter = new SlidingWindowRateLimiter(1, 1000);
limiter.isAllowed("user-1");
return limiter.isAllowed("user-2");`,
          expected: true,
        },
      ],
      solution: {
        typescript: `class SlidingWindowRateLimiter {
  private windowMs: number;
  private limit: number;
  private clients = new Map<string, {
    prevCount: number;
    currCount: number;
    windowStart: number;
  }>();

  constructor(windowMs: number, limit: number) {
    this.windowMs = windowMs;
    this.limit = limit;
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { prevCount: 0, currCount: 0, windowStart: now });
    }
    const state = this.clients.get(clientId)!;
    const elapsed = now - state.windowStart;

    if (elapsed >= this.windowMs) {
      // Roll window
      state.prevCount = elapsed < 2 * this.windowMs ? state.currCount : 0;
      state.currCount = 0;
      state.windowStart = now;
    }

    const weight = 1 - (now - state.windowStart) / this.windowMs;
    const estimate = state.prevCount * weight + state.currCount;

    if (estimate >= this.limit) return false;
    state.currCount++;
    return true;
  }
}`,
        python: `import time

class SlidingWindowRateLimiter:
    def __init__(self, window_ms: int, limit: int):
        self.window_ms = window_ms
        self.limit = limit
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
    private final long windowMs;
    private final int limit;
    // [prevCount, currCount, windowStart]
    private final Map<String, long[]> clients = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter(long windowMs, int limit) {
        this.windowMs = windowMs;
        this.limit = limit;
    }

    public synchronized boolean isAllowed(String clientId) {
        long now = System.currentTimeMillis();
        clients.putIfAbsent(clientId, new long[]{0, 0, now});
        long[] s = clients.get(clientId);
        long elapsed = now - s[2];
        if (elapsed >= windowMs) {
            s[0] = elapsed < 2 * windowMs ? s[1] : 0;
            s[1] = 0;
            s[2] = now;
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
      title: "Distributed Rate Limiting for a Public API",
      scenario: `You run a REST API used by 10,000 developers. Your rate limits are 1,000 requests/minute per API key.

Your API is deployed across 5 servers behind a load balancer. Currently, each server tracks rate limits locally in memory.

**The problem:** A developer discovers they can bypass the limit by distributing their requests across multiple servers. Because each server has its own counter, a client can make 5,000 requests/minute (1,000 per server) instead of 1,000.

Design a distributed rate limiting system that enforces limits globally across all servers.`,
      hints: [
        "A shared Redis instance can store counters that all servers read and write atomically",
        "Redis's INCR + EXPIRE combo or a Lua script can implement atomic sliding window counting",
        "What's the latency cost of a Redis call on every request? Is there a way to batch?",
        "Consider: what happens if Redis goes down? Should you fail open (allow all) or fail closed (deny all)?",
        "For very high throughput, consider approximate distributed rate limiting: each server gets a share of the quota and syncs periodically",
      ],
      discussionPoints: [
        "**Centralized Redis:** Use Redis INCR + EXPIRE (fixed window) or a Lua script for atomic sliding window. All servers share one counter per API key. Adds ~1ms RTT per request for the Redis call.",
        "**Lua atomicity:** A single Lua script in Redis executes atomically — no race conditions between read and increment. Script: check TTL, increment counter, set expiry if new key.",
        "**Fail-open vs. fail-closed:** If Redis is unavailable, fail-open (allow requests) to preserve availability, but log for post-hoc enforcement. Fail-closed (deny all) prevents abuse but breaks your service for all users.",
        "**Token sharing:** Each server pre-allocates a batch of tokens (e.g., 100 tokens per server from a Redis pool). Requests consume local tokens. Servers sync with Redis every 100ms. This reduces Redis calls by 100× but introduces up to 100ms of burst tolerance beyond the limit.",
        "**Rate limit headers:** Return X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers so clients can self-throttle. Return 429 Too Many Requests with Retry-After when limited.",
        "**Rate limit tiers:** Consider per-endpoint limits (expensive endpoints get lower limits) and per-plan limits (free vs. paid tiers). Store limits in Redis alongside counters.",
        "**Geo-distributed deployments:** Across regions, a global Redis adds significant latency. Options: (1) per-region limits (1,000/min in US, 1,000/min in EU), (2) async sync between region Redis instances, (3) accept slightly loose enforcement across regions.",
      ],
    },
  ],
};
