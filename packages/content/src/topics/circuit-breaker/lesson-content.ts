import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "In a distributed system, a service call to a downstream dependency can fail — or worse, hang. If you naively retry on timeout, every caller keeps waiting for the same slow, failing dependency, and those waiting requests hold onto threads, connections, and memory. Under load, this backs up through the whole call chain: one slow database can take down an entire service that depends on it, which takes down the services that depend on that one, and so on.",
      },
      {
        type: "p",
        text: 'The **Circuit Breaker** pattern stops this from happening. Once a dependency starts failing past a threshold, the breaker "trips" — subsequent calls fail immediately, without even attempting the network call, for a cooldown period. This frees up resources, gives the failing dependency room to recover instead of being hammered by retries, and lets the caller fail fast instead of hanging.',
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      {
        type: "p",
        text: "A circuit breaker wraps calls to a dependency and tracks recent failures. It behaves like a state machine with three states, named after an electrical circuit breaker.",
      },
      { type: "heading", level: 3, text: "Closed — normal operation" },
      {
        type: "p",
        text: "Calls pass through to the dependency as normal. The breaker counts consecutive failures. If a call succeeds, the count resets to zero. If failures reach a configured threshold, the breaker trips to **Open**.",
      },
      { type: "heading", level: 3, text: "Open — failing fast" },
      {
        type: "p",
        text: "Calls fail immediately with an error — the dependency is never actually contacted. A timer starts when the breaker opens. This is the whole point of the pattern: it protects both the caller (no more blocked threads waiting on a dead dependency) and the callee (no more traffic piling onto a service that's already struggling).",
      },
      { type: "heading", level: 3, text: "Half-Open — testing recovery" },
      {
        type: "p",
        text: "Once the timer expires, the breaker allows a single trial call through. Succeed, and the breaker assumes the dependency has recovered — it resets to **Closed**. Fail, and it goes straight back to **Open** and restarts the timer. This trial-call step matters: without it, a breaker would either stay open forever or flip back to fully-open traffic the instant the timer expires, potentially flooding a service that's only partially recovered.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `        failures >= threshold
   ┌─────────────────────────────┐
   │                             ▼
┌──────┐                    ┌──────┐
│CLOSED│                    │ OPEN │
└──────┘                    └──────┘
   ▲                             │
   │                    resetTimeout elapses
   │                             │
   │                             ▼
   │                       ┌──────────┐
   └───── trial succeeds ──┤HALF-OPEN │
                            └────┬─────┘
                                 │
                          trial fails
                                 │
                                 ▼
                              (OPEN)

Closed:    every call goes through; failures increment a counter
Open:      every call fails immediately; no network traffic sent
Half-Open: exactly one trial call decides Closed (success) or Open (failure)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Per-call state check",
        time: "O(1)",
        note: "A state read plus a counter increment",
      },
      { operation: "State storage", time: "—", space: "O(1) per breaker instance" },
      {
        operation: "Failure tracking (sliding window)",
        time: "O(1) amortized",
        space: "O(W)",
        note: "W = window size — production libraries like resilience4j track a rolling window of recent call outcomes rather than a simple consecutive-failure counter, trading a little memory for resistance to occasional blips",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Fails fast instead of blocking threads/connections on a dependency that's unlikely to respond",
      "Gives a struggling dependency breathing room to recover instead of being hammered by retries",
      "Stops local failures from cascading into system-wide outages",
      "Cheap to implement and reason about — a small state machine, not a distributed coordination problem",
    ],
    cons: [
      "Adds a failure mode: a misconfigured threshold can trip on transient blips and cause unnecessary outages",
      "The caller still needs a fallback — a circuit breaker turns 'slow failure' into 'fast failure', it doesn't make the underlying problem go away",
      "Per-instance breakers in a multi-instance deployment don't share state, so a failure one instance sees doesn't automatically protect the others (fixable, but adds a shared-state dependency of its own)",
      "Tuning is genuinely hard — too sensitive and it trips on noise; too lax and it doesn't protect anything",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Calls to remote services or shared resources that can fail or become slow (APIs, databases, third-party integrations)",
      "Systems where one dependency's failure could cascade into an outage of unrelated functionality",
      "Anywhere you'd otherwise retry-and-hope, especially under load",
    ],
    whenNotToUse: [
      "In-process calls to local, in-memory data structures — there's no network failure mode to protect against, only overhead",
      "As a substitute for proper exception handling in business logic",
      "When the dependency already has robust retry/backoff and your own retry logic would just add complexity without benefit",
      "Event-driven systems with a dead-letter queue — failed messages already have a built-in isolation and reprocessing mechanism",
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
          "**Azure Architecture Center** documents Circuit Breaker as a core cloud design pattern, including production considerations like per-resource breakers (so one failing database shard doesn't block traffic to healthy ones) and combining it with the Retry pattern.",
          "**resilience4j** (the standard Java resilience library, successor to Hystrix in most new projects) implements a richer state machine — CLOSED, OPEN, HALF_OPEN, plus DISABLED and FORCED_OPEN for manual/ops control — and counts failures over a configurable sliding window rather than a simple streak.",
          "**Netflix Hystrix** was the library that popularized this pattern for microservices, protecting Netflix's API layer from cascading failures across hundreds of backend dependencies.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Microsoft Azure Architecture Center — Circuit Breaker pattern",
            url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker",
            verified: "2026-09-16",
          },
          {
            name: "resilience4j — CircuitBreaker module documentation",
            url: "https://resilience4j.readme.io/docs/circuitbreaker",
            verified: "2026-09-16",
            note: "Sliding-window failure/slow-call rate tracking, plus DISABLED/FORCED_OPEN operational states",
          },
          {
            name: "Netflix Hystrix Wiki — How it Works",
            url: "https://github.com/Netflix/Hystrix/wiki/How-it-Works",
            verified: "2026-09-16",
            note: "Netflix put Hystrix into maintenance mode in 2018 in favor of adaptive concurrency limits, but it remains the pattern's most influential real-world implementation",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type CircuitState = "closed" | "open" | "half-open";

class CircuitOpenError extends Error {}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 30_000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new CircuitOpenError("Circuit is open — failing fast");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === "half-open" || this.failureCount >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const breaker = new CircuitBreaker(3, 10_000);

async function fetchUser(id: string) {
  return breaker.call(async () => {
    const res = await fetch(\`https://api.example.com/users/\${id}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return res.json();
  });
}`,

  python: `import time
from enum import Enum
from typing import Callable, TypeVar

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


class CircuitOpenError(Exception):
    pass


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout_s: float = 30):
        self.failure_threshold = failure_threshold
        self.reset_timeout_s = reset_timeout_s
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.opened_at = 0.0

    def call(self, fn: Callable[[], T]) -> T:
        if self.state == CircuitState.OPEN:
            if time.monotonic() - self.opened_at >= self.reset_timeout_s:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitOpenError("Circuit is open — failing fast")

        try:
            result = fn()
        except Exception:
            self._on_failure()
            raise
        else:
            self._on_success()
            return result

    def _on_success(self) -> None:
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self) -> None:
        self.failure_count += 1
        if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = time.monotonic()


# Usage
breaker = CircuitBreaker(failure_threshold=3, reset_timeout_s=10)


def fetch_user(user_id: str):
    return breaker.call(lambda: requests.get(f"https://api.example.com/users/{user_id}").json())`,

  java: `import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicInteger;

public class CircuitBreaker {
    public enum State { CLOSED, OPEN, HALF_OPEN }

    public static class CircuitOpenException extends RuntimeException {
        public CircuitOpenException(String message) { super(message); }
    }

    private final int failureThreshold;
    private final long resetTimeoutMs;
    private volatile State state = State.CLOSED;
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private volatile long openedAt = 0;

    public CircuitBreaker(int failureThreshold, long resetTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }

    public <T> T call(Callable<T> fn) throws Exception {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - openedAt >= resetTimeoutMs) {
                state = State.HALF_OPEN;
            } else {
                throw new CircuitOpenException("Circuit is open — failing fast");
            }
        }

        try {
            T result = fn.call();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            throw e;
        }
    }

    private void onSuccess() {
        failureCount.set(0);
        state = State.CLOSED;
    }

    private void onFailure() {
        int failures = failureCount.incrementAndGet();
        if (state == State.HALF_OPEN || failures >= failureThreshold) {
            state = State.OPEN;
            openedAt = System.currentTimeMillis();
        }
    }

    public State getState() {
        return state;
    }
}

// Usage
CircuitBreaker breaker = new CircuitBreaker(3, 10_000);
String user = breaker.call(() -> httpClient.get("https://api.example.com/users/" + id));`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "circuit-breaker-conceptual",
    required: true,
    question:
      "A circuit breaker has just tripped to Open after five consecutive failures. What happens to the very next call made through it?",
    options: [
      { id: "a", text: "It's sent to the dependency, same as normal — Open only affects logging" },
      { id: "b", text: "It fails immediately, without contacting the dependency at all" },
      { id: "c", text: "It's queued and retried automatically until the dependency recovers" },
      { id: "d", text: "It's sent to the dependency, but with a shorter timeout than usual" },
    ],
    correctOptionId: "b",
    explanation:
      "In the Open state, calls fail immediately — the breaker doesn't attempt the network call at all. That's the entire point: protect the caller from blocking on a dependency that's unlikely to respond, and protect the dependency from more traffic while it's already struggling. The breaker only allows a single trial call through once it transitions to Half-Open, after the reset timeout elapses.",
  },
  {
    type: "implementation",
    id: "circuit-breaker-implementation",
    required: true,
    title: "Implement a Circuit Breaker",
    description: `Implement a CircuitBreaker with three states — Closed, Open, Half-Open:

- **call(fn)** — runs \`fn\`. In Closed, runs normally and tracks consecutive failures. In Open, throws immediately without running \`fn\` unless the reset timeout has elapsed (then transitions to Half-Open and tries once). In Half-Open, a success closes the circuit; a failure reopens it.
- **getState()** — returns the current state.

Trip to Open once consecutive failures reach \`failureThreshold\`.`,
    starterCode: {
      typescript: `type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    private failureThreshold = 3,
    private resetTimeoutMs = 5000
  ) {}

  call<T>(fn: () => T): T {
    // TODO: check state; if open and timeout elapsed, try half-open;
    // if open and timeout not elapsed, throw; otherwise run fn and
    // update state based on success/failure
    return fn();
  }

  getState(): CircuitState {
    return this.state;
  }
}`,
      python: `import time
from enum import Enum
from typing import Callable, TypeVar

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, reset_timeout_s: float = 5):
        self.failure_threshold = failure_threshold
        self.reset_timeout_s = reset_timeout_s
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.opened_at = 0.0

    def call(self, fn: Callable[[], T]) -> T:
        # TODO: check state; if open and timeout elapsed, try half-open;
        # if open and timeout not elapsed, raise; otherwise run fn and
        # update state based on success/failure
        return fn()`,
      java: `public class CircuitBreaker {
    public enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long resetTimeoutMs;
    private State state = State.CLOSED;
    private int failureCount = 0;
    private long openedAt = 0;

    public CircuitBreaker(int failureThreshold, long resetTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }

    public <T> T call(java.util.concurrent.Callable<T> fn) throws Exception {
        // TODO: check state; if open and timeout elapsed, try half-open;
        // if open and timeout not elapsed, throw; otherwise run fn and
        // update state based on success/failure
        return fn.call();
    }

    public State getState() {
        return state;
    }
}`,
    },
    hints: [
      "Track state as an enum/union of three values, plus a failure counter and the timestamp the breaker last opened",
      "In Open, compare 'now - openedAt' against resetTimeoutMs — if it hasn't elapsed, throw before calling fn at all",
      "A single Half-Open failure should reopen the circuit immediately, not wait for failureThreshold again — the trial call is meant to be decisive",
      "Reset the failure counter to 0 on any success, whether from Closed or Half-Open",
    ],
    solution: {
      typescript: `type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private openedAt = 0;

  constructor(
    private failureThreshold = 3,
    private resetTimeoutMs = 5000
  ) {}

  call<T>(fn: () => T): T {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit is open");
      }
    }

    try {
      const result = fn();
      this.failureCount = 0;
      this.state = "closed";
      return result;
    } catch (err) {
      this.failureCount++;
      if (this.state === "half-open" || this.failureCount >= this.failureThreshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}`,
      python: `import time
from enum import Enum
from typing import Callable, TypeVar

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half-open"


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, reset_timeout_s: float = 5):
        self.failure_threshold = failure_threshold
        self.reset_timeout_s = reset_timeout_s
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.opened_at = 0.0

    def call(self, fn: Callable[[], T]) -> T:
        if self.state == CircuitState.OPEN:
            if time.monotonic() - self.opened_at >= self.reset_timeout_s:
                self.state = CircuitState.HALF_OPEN
            else:
                raise RuntimeError("Circuit is open")

        try:
            result = fn()
        except Exception:
            self.failure_count += 1
            if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.opened_at = time.monotonic()
            raise
        else:
            self.failure_count = 0
            self.state = CircuitState.CLOSED
            return result`,
      java: `public class CircuitBreaker {
    public enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long resetTimeoutMs;
    private State state = State.CLOSED;
    private int failureCount = 0;
    private long openedAt = 0;

    public CircuitBreaker(int failureThreshold, long resetTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }

    public <T> T call(java.util.concurrent.Callable<T> fn) throws Exception {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - openedAt >= resetTimeoutMs) {
                state = State.HALF_OPEN;
            } else {
                throw new RuntimeException("Circuit is open");
            }
        }

        try {
            T result = fn.call();
            failureCount = 0;
            state = State.CLOSED;
            return result;
        } catch (Exception e) {
            failureCount++;
            if (state == State.HALF_OPEN || failureCount >= failureThreshold) {
                state = State.OPEN;
                openedAt = System.currentTimeMillis();
            }
            throw e;
        }
    }

    public State getState() {
        return state;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "circuit-breaker-system-design",
    required: false,
    title: "Protecting a Payments Service from a Flaky Fraud-Check API",
    scenario: `Your checkout service calls a third-party fraud-detection API synchronously before approving any payment. It's usually fast (~100ms), but it has occasional outages where it either times out after 30 seconds or returns 5xx errors for several minutes at a time.

During the last outage, checkout requests queued up waiting for the 30-second timeout, exhausted your service's thread pool, and took down checkout entirely — including for the payment methods that don't even use fraud detection.

Design how you'd introduce a circuit breaker here, and think through what happens to a checkout request while the circuit is open.`,
    hints: [
      "What should happen to a checkout request when the circuit is open — reject the payment outright, or fall back to some other decision?",
      "Fraud detection is a risk-management tool, not a pure data lookup — what's the safer default when you can't check: allow-and-flag, or deny?",
      "How would you choose failureThreshold and resetTimeoutMs? What's the cost of tripping too eagerly vs. not eagerly enough here specifically?",
      "Should this circuit breaker be shared across all instances of the checkout service, or per-instance? What changes if the fraud API is degraded for only some of your instances (e.g. a regional outage)?",
      "How do you find out the circuit is tripping at all, before it becomes a customer-facing incident?",
    ],
    discussionPoints: [
      "**Fallback behavior:** Failing the payment outright when fraud-check is unavailable turns a third-party outage into a full checkout outage — the opposite of what a circuit breaker is for. A safer default is often to allow the payment but flag it for asynchronous review, accepting a temporarily higher fraud-review queue over blocking all revenue.",
      "**Threshold tuning:** A short timeout on the fraud-check call (a few seconds, not 30) combined with a moderate failure threshold (e.g. 5 consecutive failures) catches real outages without tripping on one-off blips. Too aggressive and a single retry-able 502 takes the whole path into fallback mode.",
      "**Shared vs. per-instance state:** A per-instance breaker means each instance independently discovers the outage — fine for a global outage, but slower to protect the whole fleet, and a fully healthy instance won't benefit from another instance's Open state. A shared breaker (e.g. state in Redis) reacts faster fleet-wide at the cost of a new dependency the breaker itself now relies on — ironic, but often still worth it if that dependency is more reliable than the one being protected against.",
      "**Regional/partial failures:** If the fraud API is only unhealthy for one region, a single global breaker either overreacts (trips everywhere) or underreacts (never trips because healthy regions dilute the failure rate). Sharding the breaker by region avoids both.",
      "**Observability:** Emit a metric/event on every state transition, not just on failures — a circuit stuck in Open for 20 minutes should page someone well before customers notice a fraud-review backlog.",
    ],
  },
];
