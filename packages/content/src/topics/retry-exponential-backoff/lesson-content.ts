import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Network calls fail — a packet drops, a service briefly can't keep up, a load balancer restarts. Most of these failures are transient: the same call would succeed a moment later. The obvious fix is to retry. The naive version of that fix is dangerous.",
      },
      {
        type: "p",
        text: "If a client retries immediately after every failure, and a service is failing because it's overloaded, immediate retries add load to an already-overloaded service — making the outage worse, not better. And if the failure affects many clients at once (a deploy, a restart, a network blip), they all retry at roughly the same moment, in near-perfect synchronization. That synchronized wave of retries — a **retry storm** or **thundering herd** — can turn a brief blip into a sustained outage, because the recovering service gets hit with a spike of traffic right as it's coming back up.",
      },
      {
        type: "p",
        text: "**Exponential backoff with jitter** fixes both problems: each retry waits longer than the last (reducing sustained load on a struggling service), and the wait time is randomized (spreading retries out over time instead of letting clients retry in lockstep).",
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      { type: "heading", level: 3, text: "Exponential backoff" },
      {
        type: "p",
        text: "After each failed attempt, the client waits before retrying — and that wait doubles (or otherwise grows exponentially) with each subsequent failure: attempt 1 waits ~100ms, attempt 2 waits ~200ms, attempt 3 waits ~400ms, and so on, usually capped at some maximum delay so a client doesn't end up waiting minutes between attempts.",
      },
      {
        type: "p",
        text: "This alone helps: a struggling service sees retry traffic taper off over time instead of arriving at a constant rate. But it doesn't solve the synchronization problem — if every client backs off using the exact same formula, they all retry at the exact same moments, just further apart.",
      },
      { type: "heading", level: 3, text: "Jitter" },
      {
        type: "p",
        text: "Jitter adds randomness to the delay so retries from different clients spread out instead of arriving in synchronized waves. The most effective version — **full jitter** — doesn't add a small random offset to the backoff delay, it replaces the delay with a random value between zero and the exponential cap: pick a number between 0 and min(maxDelay, base × 2^attempt) every time. This is counterintuitive (the wait can be very short even on a late attempt) but empirically it does the best job of spreading load — AWS's own testing found it outperforms the more conservative 'equal jitter' approach (half fixed, half random) at reducing total work done by the system under contention.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Without jitter — every client backs off identically, retries stay synchronized:

Client A: attempt──X   wait 100ms   attempt──X   wait 200ms   attempt──X
Client B: attempt──X   wait 100ms   attempt──X   wait 200ms   attempt──X
Client C: attempt──X   wait 100ms   attempt──X   wait 200ms   attempt──X
                    ▲                          ▲                          ▲
              all retry together        all retry together        all retry together
              (a fresh spike of load hits the service each time)


With full jitter — same exponential cap, randomized within it:

Client A: attempt──X  wait 43ms ─attempt──X    wait 187ms ──────attempt──X
Client B: attempt──X  wait 91ms ────attempt──X wait 12ms  attempt──X
Client C: attempt──X  wait 8ms attempt──X       wait 340ms ──────────────attempt──X
                    ▲                          ▲
           retries arrive spread out over time, not as synchronized spikes`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Per-attempt decision", time: "O(1)", note: "Compute the delay, sleep, retry" },
      {
        operation: "State per in-flight call",
        time: "—",
        space: "O(1)",
        note: "Just the current attempt count",
      },
      {
        operation: "Worst-case total wait (N retries, cap C)",
        time: "O(N) attempts, bounded by N × C",
        note: "The delay cap keeps total wait time bounded even with many retries",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Reduces load on a struggling dependency instead of adding to it",
      "Jitter prevents synchronized retry storms across many clients",
      "Simple to implement — no shared state or coordination between clients required",
      "Composes well with other resilience patterns (a circuit breaker, an idempotency key)",
    ],
    cons: [
      "Adds latency to the failing request's eventual success — by design, but still a real cost for the caller",
      "Retrying a call that mutates state is only safe if that call is idempotent — otherwise a retry can duplicate the effect (double-charge, double-send)",
      "A capped exponential delay still means the total worst-case wait across all retries can be long; callers need their own overall timeout",
      "Doesn't help at all if the failure isn't transient — retrying a permanently broken request just wastes time before eventually giving up",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Calls to remote services where failures are often transient (network blips, brief overload, rolling deploys)",
      "Any client library or SDK that talks to an external API — most production HTTP clients should have this built in",
      "Combined with idempotency keys for mutating requests, so retries are safe to make",
    ],
    whenNotToUse: [
      "Non-idempotent operations without an idempotency mechanism — retrying can duplicate side effects",
      "Client-facing errors that indicate the request itself is wrong (4xx validation errors) — retrying an invalid request just fails the same way again",
      "When a circuit breaker has already tripped open — retrying into an open circuit wastes the backoff delay for nothing; check the breaker first",
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
          "**AWS** popularized full jitter as the recommended default — their own load tests showed it and decorrelated jitter substantially outperform naive exponential backoff and even 'equal jitter' at reducing total system work under contention.",
          "**Google Cloud Storage** client libraries default to exponential backoff for retryable errors (408, 429, 5xx) — parameters vary by SDK, e.g. the Python client library defaults to a 1-second initial delay, doubling up to a 60-second cap.",
          "**Stripe** combines this pattern with idempotency keys: client libraries retry on network errors and `Stripe-Should-Retry: true` responses using exponential backoff, safe to do because every retried `POST` carries the same idempotency key as the original attempt.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "AWS Architecture Blog — Exponential Backoff and Jitter",
            url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
            verified: "2026-09-16",
            note: "Introduces and benchmarks full/equal/decorrelated jitter",
          },
          {
            name: "Google Cloud Storage — Retry strategy",
            url: "https://docs.cloud.google.com/storage/docs/retry-strategy",
            verified: "2026-09-16",
          },
          {
            name: "Stripe Docs — Advanced error handling (idempotency and retries)",
            url: "https://docs.stripe.com/error-low-level",
            verified: "2026-09-16",
            note: "The Stripe-Should-Retry response header and idempotency-key-plus-backoff combination",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { maxRetries = 5, baseDelayMs = 100, maxDelayMs = 10_000 }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delay = Math.random() * cap; // full jitter
      await sleep(delay);
    }
  }
}

// Usage
const user = await retryWithBackoff(
  () => fetch("https://api.example.com/users/42").then((r) => {
    if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
    return r.json();
  }),
  { maxRetries: 4, baseDelayMs: 100 }
);`,

  python: `import random
import time
from typing import Callable, TypeVar

T = TypeVar("T")


def retry_with_backoff(
    fn: Callable[[], T],
    max_retries: int = 5,
    base_delay_s: float = 0.1,
    max_delay_s: float = 10,
) -> T:
    attempt = 0
    while True:
        try:
            return fn()
        except Exception:
            attempt += 1
            if attempt > max_retries:
                raise
            cap = min(max_delay_s, base_delay_s * 2**attempt)
            delay = random.uniform(0, cap)  # full jitter
            time.sleep(delay)


# Usage
user = retry_with_backoff(
    lambda: requests.get("https://api.example.com/users/42").json(),
    max_retries=4,
    base_delay_s=0.1,
)`,

  java: `import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;

public class RetryWithBackoff {

    public static <T> T call(Callable<T> fn, int maxRetries, long baseDelayMs, long maxDelayMs)
            throws Exception {
        int attempt = 0;
        while (true) {
            try {
                return fn.call();
            } catch (Exception e) {
                attempt++;
                if (attempt > maxRetries) throw e;
                long cap = Math.min(maxDelayMs, baseDelayMs * (1L << attempt));
                long delay = ThreadLocalRandom.current().nextLong(cap + 1); // full jitter
                Thread.sleep(delay);
            }
        }
    }
}

// Usage
String user = RetryWithBackoff.call(
    () -> httpClient.get("https://api.example.com/users/42"),
    4, 100, 10_000
);`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "retry-backoff-conceptual",
    required: true,
    question:
      "What specific problem does adding jitter solve that plain exponential backoff alone doesn't?",
    options: [
      {
        id: "a",
        text: "It makes each individual retry wait longer, giving the service more time to recover",
      },
      {
        id: "b",
        text: "It reduces the total number of retries a client will attempt before giving up",
      },
      {
        id: "c",
        text: "It prevents many clients that failed at the same time from retrying in synchronized waves",
      },
      { id: "d", text: "It guarantees the retried request will succeed" },
    ],
    correctOptionId: "c",
    explanation:
      "Plain exponential backoff still leaves clients synchronized — if they all failed at the same moment and use the same formula, they all retry at the same moments too, just further apart each time. Jitter randomizes the delay so retries from different clients spread out over time instead of arriving as synchronized spikes ('thundering herd'). It doesn't inherently make waits longer, reduce retry counts, or guarantee success — none of that is what jitter is for.",
  },
  {
    type: "implementation",
    id: "retry-backoff-implementation",
    required: true,
    title: "Implement Retry with Exponential Backoff and Full Jitter",
    description: `Implement a retry helper:

- **retryWithBackoff(fn, maxRetries, baseDelay)** — calls \`fn\`. On failure, waits a random delay between 0 and \`min(cap, baseDelay * 2^attempt)\` (full jitter), then retries. After \`maxRetries\` failed attempts, re-throws the last error instead of retrying again.

Use a delay cap of 10 seconds.`,
    starterCode: {
      typescript: `function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number
): Promise<T> {
  // TODO: retry fn on failure with full-jitter exponential backoff,
  // capped at 10_000ms, giving up after maxRetries failed attempts
  return fn();
}`,
      python: `import random
import time
from typing import Callable, TypeVar

T = TypeVar("T")


def retry_with_backoff(fn: Callable[[], T], max_retries: int, base_delay_s: float) -> T:
    # TODO: retry fn on failure with full-jitter exponential backoff,
    # capped at 10 seconds, giving up after max_retries failed attempts
    return fn()`,
      java: `import java.util.concurrent.Callable;

public class RetryWithBackoff {
    public static <T> T call(Callable<T> fn, int maxRetries, long baseDelayMs) throws Exception {
        // TODO: retry fn on failure with full-jitter exponential backoff,
        // capped at 10_000ms, giving up after maxRetries failed attempts
        return fn.call();
    }
}`,
    },
    hints: [
      "Track the attempt number, starting at 0 (or 1) and incrementing on each failure",
      "The cap for attempt N is min(maxDelayMs, baseDelayMs * 2^N) — compute it fresh each time",
      "Full jitter means picking a random value between 0 and the cap, not adding randomness on top of a fixed delay",
      "Once attempt exceeds maxRetries, re-throw the error instead of sleeping and trying again",
    ],
    solution: {
      typescript: `function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number
): Promise<T> {
  const maxDelayMs = 10_000;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(Math.random() * cap);
    }
  }
}`,
      python: `import random
import time
from typing import Callable, TypeVar

T = TypeVar("T")


def retry_with_backoff(fn: Callable[[], T], max_retries: int, base_delay_s: float) -> T:
    max_delay_s = 10
    attempt = 0
    while True:
        try:
            return fn()
        except Exception:
            attempt += 1
            if attempt > max_retries:
                raise
            cap = min(max_delay_s, base_delay_s * 2**attempt)
            time.sleep(random.uniform(0, cap))`,
      java: `import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;

public class RetryWithBackoff {
    public static <T> T call(Callable<T> fn, int maxRetries, long baseDelayMs) throws Exception {
        long maxDelayMs = 10_000;
        int attempt = 0;
        while (true) {
            try {
                return fn.call();
            } catch (Exception e) {
                attempt++;
                if (attempt > maxRetries) throw e;
                long cap = Math.min(maxDelayMs, baseDelayMs * (1L << attempt));
                Thread.sleep(ThreadLocalRandom.current().nextLong(cap + 1));
            }
        }
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "retry-backoff-system-design",
    required: false,
    title: "Recovering from a Regional Outage Without a Retry Storm",
    scenario: `Your mobile app has 2 million daily active users, all polling a single backend API every 30 seconds for notifications. The backend region goes down for 90 seconds during a failover event.

Every client's poll request fails during that window. All 2 million clients are configured to retry immediately on failure, once, before giving up until their next scheduled poll.

When the region comes back up, your monitoring shows the backend receiving a synchronized spike of roughly 2 million requests in the first 2 seconds after recovery — enough to trip its own overload protection and cause a second, self-inflicted outage right after the first one ends.

Redesign the client's retry behavior to avoid this. What would you change, and what would you still want even after fixing the retry logic?`,
    hints: [
      "The clients aren't failing to retry — they're retrying too predictably. What's synchronized about their current behavior, and why?",
      "What does exponential backoff alone fix here versus what does jitter fix?",
      "The 30-second poll interval is itself a source of synchronization if many clients started polling around the same time (e.g. after an app update forced everyone to reconnect) — does backoff need to interact with that?",
      "Is there a role for a circuit breaker on the client side here, separate from retry/backoff?",
      "What would you want the backend itself to do, independent of how well-behaved the clients are?",
    ],
    discussionPoints: [
      "**Add jitter to the retry itself:** Replace 'retry immediately once' with a full-jitter backoff (e.g. random delay up to a few seconds) before the retry. This alone spreads the 2 million retries across a window instead of a 2-second spike.",
      "**Jitter the steady-state poll interval too:** If clients all poll every exactly 30 seconds and many of them started at nearly the same time (e.g. right after an app update), the polling itself is synchronized independent of any outage. Adding jitter to the poll interval (e.g. 30s ± up to 5s) prevents this from ever aligning in the first place.",
      "**Client-side circuit breaker:** After a handful of consecutive failures, a client could stop polling on its normal schedule and back off more aggressively — reducing load further during a sustained outage, at the cost of slightly staler notifications for that client.",
      "**Backend-side protection regardless:** Even well-behaved clients don't eliminate the need for the backend to protect itself — rate limiting, load shedding, or a queue that admits requests at a controlled rate during recovery. Client-side jitter reduces the size of the spike; it shouldn't be the only line of defense against one.",
      "**Staggered rollout of fixed clients:** Since this is a mobile app, the fix itself takes time to roll out — until most clients have the jittered version, the old synchronized-retry behavior is still a real risk during the rollout window.",
    ],
  },
];
