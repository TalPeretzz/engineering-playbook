import type { Topic } from "@engineering-playbook/content-schema";

export const idempotency: Topic = {
  slug: "idempotency",
  title: "Idempotency",
  description:
    "The property where performing the same operation multiple times produces the same result as performing it once — essential for safe retries in distributed systems.",
  category: "backend-patterns",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  nextTopics: ["outbox-pattern", "saga-pattern", "rate-limiter"],

  implementations: {
    typescript: `import crypto from "crypto";

// Simulated store — use Redis with TTL in production
const store = new Map<string, { result: unknown; createdAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

type PaymentResult = { transactionId: string; amount: number; status: string };

async function processPayment(
  idempotencyKey: string,
  amount: number,
  userId: string
): Promise<PaymentResult> {
  const existing = store.get(idempotencyKey);
  if (existing && Date.now() - existing.createdAt < TTL_MS) {
    return existing.result as PaymentResult; // return cached — no double charge
  }
  if (existing) store.delete(idempotencyKey); // expired — treat as new

  const result: PaymentResult = {
    transactionId: crypto.randomUUID(),
    amount,
    status: "success",
  };
  store.set(idempotencyKey, { result, createdAt: Date.now() });
  return result;
}

// Client usage
const key = crypto.randomUUID(); // generated once per logical operation

const r1 = await processPayment(key, 99.99, "user-123");
const r2 = await processPayment(key, 99.99, "user-123"); // retry
console.log(r1.transactionId === r2.transactionId); // true — same result`,

    python: `import uuid
import time
from typing import Any

_store: dict[str, dict[str, Any]] = {}
TTL_SECONDS = 24 * 3600


def process_payment(idempotency_key: str, amount: float, user_id: str) -> dict:
    existing = _store.get(idempotency_key)
    if existing and time.time() - existing["created_at"] < TTL_SECONDS:
        return existing["result"]  # cached — no double charge
    if existing:
        del _store[idempotency_key]  # expired — treat as new

    result = {"transaction_id": str(uuid.uuid4()), "amount": amount, "status": "success"}
    _store[idempotency_key] = {"result": result, "created_at": time.time()}
    return result


key = str(uuid.uuid4())
r1 = process_payment(key, 99.99, "user-123")
r2 = process_payment(key, 99.99, "user-123")  # retry
print(r1["transaction_id"] == r2["transaction_id"])  # True`,

    java: `import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class IdempotentPaymentService {
    private static final long TTL_MS = 24L * 3_600_000;
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public PaymentResult processPayment(String key, double amount, String userId) {
        Entry existing = store.get(key);
        if (existing != null && System.currentTimeMillis() - existing.createdAt < TTL_MS) {
            return existing.result; // cached — no double charge
        }
        if (existing != null) store.remove(key); // expired

        PaymentResult result = new PaymentResult(UUID.randomUUID().toString(), amount, "success");
        store.put(key, new Entry(result, System.currentTimeMillis()));
        return result;
    }

    record PaymentResult(String transactionId, double amount, String status) {}
    private record Entry(PaymentResult result, long createdAt) {}
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
          text: "Networks fail. Timeouts happen. Clients retry. In a distributed system the question is never 'will requests be duplicated?' — it's 'when they are, what happens?'",
        },
        {
          type: "p",
          text: "Imagine a payment API. A client sends a charge request. The server processes the charge successfully but the response is lost in transit. The client, seeing a timeout, retries. Without idempotency, the customer is charged twice.",
        },
        {
          type: "p",
          text: "**Idempotency** ensures that retrying a safe operation produces the same outcome as executing it once. It is the difference between a system that handles failures gracefully and one that silently corrupts data.",
        },
      ],
    },
    {
      type: "text",
      id: "how-it-works",
      heading: "How does it work?",
      body: [
        {
          type: "heading",
          level: 3,
          text: "Idempotency keys",
        },
        {
          type: "p",
          text: "The most common pattern. The client generates a unique ID (UUID) for each logical operation and sends it with every request — typically in an HTTP header like `Idempotency-Key: <uuid>`.",
        },
        {
          type: "list",
          items: [
            "Server checks if it has seen this key before.",
            "If yes: return the stored response — do not re-execute.",
            "If no: execute the operation, store the result keyed by the idempotency key, return the result.",
          ],
        },
        {
          type: "p",
          text: "The result store is typically Redis with a TTL (e.g., 24 hours). After expiry, a duplicate is treated as a new request.",
        },
        {
          type: "heading",
          level: 3,
          text: "Natural idempotency",
        },
        {
          type: "p",
          text: "Some operations are inherently idempotent without keys:",
        },
        {
          type: "list",
          items: [
            "Setting a value: SET user.name = 'Alice' (same result every time)",
            "Conditional updates: UPDATE ... WHERE version = N (only succeeds once)",
            "Upserts: INSERT OR REPLACE / INSERT ... ON CONFLICT DO UPDATE",
            "HTTP GET, PUT, DELETE — idempotent by HTTP specification",
          ],
        },
        {
          type: "heading",
          level: 3,
          text: "Operations that require keys",
        },
        {
          type: "list",
          items: [
            "Processing a payment or creating an order",
            "Sending an email or SMS",
            "Appending to a list",
            "HTTP POST — not idempotent by spec; must be made idempotent at the application layer",
          ],
        },
      ],
    },
    {
      type: "visual",
      id: "visual",
      heading: "Step-by-step visual",
      content: `Client                   Server                   DB / Store
  |                         |                          |
  |── POST /payments ──────▶|                          |
  |   Idempotency-Key: k1   |── check key k1 ────────▶|
  |                         |◀─ not found              |
  |                         |── charge $50 ───────────▶|
  |                         |── store k1: {ok} ────────▶|
  |◀─ 200 {charged: $50} ───|                          |

Network failure — client retries:

  |── POST /payments ──────▶|                          |
  |   Idempotency-Key: k1   |── check key k1 ────────▶|
  |                         |◀─ found: {ok}            |
  |◀─ 200 {charged: $50} ───|  (no double charge)      |`,
    },
    {
      type: "complexity",
      id: "complexity",
      heading: "Complexity",
      entries: [
        { operation: "Key lookup (Redis)", time: "O(1)", space: "O(1) per key" },
        { operation: "Key storage", time: "O(1)", space: "O(1) per key" },
        { operation: "Total storage", time: "—", space: "O(K)", note: "K = unique requests within the TTL window" },
      ],
    },
    {
      type: "tradeoffs",
      id: "tradeoffs",
      heading: "Tradeoffs",
      pros: [
        "Safe retries — clients can retry on timeout without risk of duplicate processing",
        "Enables at-least-once delivery with exactly-once semantics at the application layer",
        "Simple client contract — generate one UUID per logical operation and reuse it on retry",
        "Works across network boundaries, message queues, and async processing",
      ],
      cons: [
        "Storage overhead — must store results for the TTL duration",
        "TTL choice is tricky — too short allows duplicates after expiry; too long wastes storage",
        "Concurrent requests with the same key require locking to prevent race conditions",
        "Does not help if the client generates a new key on retry — the client must reuse the same key",
        "Adds a key-lookup round trip on every mutating request",
      ],
    },
    {
      type: "use-cases",
      id: "use-cases",
      heading: "When to use / when not to use",
      whenToUse: [
        "Any API endpoint that processes payments, creates orders, or sends communications",
        "Message consumers in async systems where messages may be delivered more than once",
        "Mutating operations exposed to clients that will retry on timeout",
        "Webhook delivery systems where the receiver may process the same event twice",
      ],
      whenNotToUse: [
        "Read-only operations — GET requests are naturally idempotent",
        "Operations that must record every invocation for audit purposes",
        "Low-stakes non-financial operations where the overhead outweighs the risk of duplicates",
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
            "**Stripe API** — requires an Idempotency-Key header for payment creation; returns the same response for duplicates for up to 24 hours",
            "**Kafka consumer groups** — at-least-once delivery means consumers must handle duplicate messages idempotently",
            "**Twilio** — uses idempotency keys for SMS sending to prevent duplicates on retry",
            "**AWS S3 PUT** — naturally idempotent; uploading the same object twice overwrites with identical content",
            "**Database UPSERT** — INSERT ... ON CONFLICT DO UPDATE is a natural idempotent write pattern",
          ],
        },
      ],
    },
  ],

  challenges: [
    {
      type: "multiple-choice",
      id: "idempotency-conceptual",
      required: true,
      question: "Which of the following operations is NOT naturally idempotent?",
      options: [
        { id: "a", text: "HTTP GET /users/123" },
        { id: "b", text: "HTTP PUT /users/123 with {name: 'Alice'}" },
        { id: "c", text: "SQL: UPDATE users SET balance = balance - 50 WHERE id = 123" },
        { id: "d", text: "SQL: UPDATE users SET name = 'Alice' WHERE id = 123" },
      ],
      correctOptionId: "c",
      explanation:
        "UPDATE balance = balance - 50 is not idempotent — running it multiple times deducts 50 each time. The others are idempotent: GET has no side effects, PUT with the same data always produces the same state, and SET name = 'Alice' always results in the same state regardless of how many times it runs.",
    },
    {
      type: "implementation",
      id: "idempotency-implementation",
      required: true,
      title: "Implement an Idempotency Service",
      description: `Implement an idempotency wrapper for a payment processor:

- **execute(idempotencyKey, operation)** — runs the operation and caches its result. On subsequent calls with the same key (within TTL), returns the cached result without re-executing.

The goal: retrying with the same key always returns the same result without running the operation again.`,
      starterCode: {
        typescript: `type Result = { id: string; status: string; amount: number };

class IdempotencyService {
  private store = new Map<string, { result: Result; timestamp: number }>();

  constructor(private ttlMs = 86_400_000) {}

  execute(idempotencyKey: string, operation: () => Result): Result {
    // TODO: check store, return cached or execute + store
    return operation();
  }
}`,
        python: `import time
from typing import TypedDict, Callable


class Result(TypedDict):
    id: str
    status: str
    amount: float


class IdempotencyService:
    def __init__(self, ttl_seconds: float = 86400):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, dict] = {}

    def execute(self, idempotency_key: str, operation: Callable[[], Result]) -> Result:
        # TODO: check store, return cached or execute + store
        return operation()`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class IdempotencyService {
    record Result(String id, String status, double amount) {}
    private record Entry(Result result, long timestamp) {}

    private final long ttlMs;
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public IdempotencyService(long ttlMs) { this.ttlMs = ttlMs; }

    public Result execute(String idempotencyKey, Supplier<Result> operation) {
        // TODO: check store, return cached or execute + store
        return operation.get();
    }
}`,
      },
      hints: [
        "Store the result and the timestamp when you first execute the operation",
        "On each call, check if the key exists AND the timestamp is within TTL",
        "If expired, remove the old entry and treat it as a new request",
        "Only call operation() when you don't have a valid cached result",
        "In production, this store would be Redis — TTL managed by Redis EXPIRE",
      ],
      solution: {
        typescript: `type Result = { id: string; status: string; amount: number };

class IdempotencyService {
  private store = new Map<string, { result: Result; timestamp: number }>();

  constructor(private ttlMs = 86_400_000) {}

  execute(idempotencyKey: string, operation: () => Result): Result {
    const existing = this.store.get(idempotencyKey);
    if (existing && Date.now() - existing.timestamp < this.ttlMs) {
      return existing.result;
    }
    const result = operation();
    this.store.set(idempotencyKey, { result, timestamp: Date.now() });
    return result;
  }
}`,
        python: `import time
from typing import TypedDict, Callable

class Result(TypedDict):
    id: str
    status: str
    amount: float

class IdempotencyService:
    def __init__(self, ttl_seconds: float = 86400):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, dict] = {}

    def execute(self, idempotency_key: str, operation: Callable[[], Result]) -> Result:
        existing = self._store.get(idempotency_key)
        if existing and time.time() - existing["ts"] < self.ttl_seconds:
            return existing["result"]
        result = operation()
        self._store[idempotency_key] = {"result": result, "ts": time.time()}
        return result`,
        java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class IdempotencyService {
    record Result(String id, String status, double amount) {}
    private record Entry(Result result, long timestamp) {}

    private final long ttlMs;
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    public IdempotencyService(long ttlMs) { this.ttlMs = ttlMs; }

    public Result execute(String idempotencyKey, Supplier<Result> operation) {
        Entry existing = store.get(idempotencyKey);
        if (existing != null && System.currentTimeMillis() - existing.timestamp() < ttlMs) {
            return existing.result();
        }
        Result result = operation.get();
        store.put(idempotencyKey, new Entry(result, System.currentTimeMillis()));
        return result;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "idempotency-system-design",
      required: false,
      title: "Idempotent Payment Processing at Scale",
      scenario: `You're building a payments service for an e-commerce platform processing 50,000 orders per day. Each order triggers a charge via a third-party processor (like Stripe).

The problem: due to network timeouts your service retries failed charges. Customers have been charged twice because:
1. The charge succeeded at Stripe but the response was lost in transit
2. Your service retried, charging again

Your service runs on 10 instances behind a load balancer. A retry may hit a different instance than the original request.

Design a robust idempotent payment system.`,
      hints: [
        "Use order_id (not a random UUID) as the idempotency key — any instance can detect a duplicate without shared session state",
        "The idempotency store must be shared across all instances — local in-memory storage doesn't work",
        "What if two concurrent retries both see 'key not found'? You need an atomic claim step.",
        "Consider a 'pending' state: atomically claim the key before calling Stripe, then update with the final result",
        "Forward the same idempotency key to Stripe — Stripe deduplicates on their end too",
      ],
      discussionPoints: [
        "**Deterministic key generation:** Use order_id as the idempotency key, not a random UUID. Any instance can detect a duplicate without shared session state.",
        "**Shared Redis store:** All 10 instances read/write the same Redis store. Key = idempotency key, Value = {status: pending|success|failed, result, created_at}. TTL = 24h.",
        "**Atomic claim with SET NX:** Use Redis SET NX (set-if-not-exists) to atomically claim a key. If claim succeeds, proceed with the Stripe call. If NX fails, poll until the other instance resolves it.",
        "**Forward to Stripe:** Pass your order-based key to Stripe's Idempotency-Key header too. Stripe charges once even if you call them twice with the same key.",
        "**Failure recovery:** If your service crashes after Stripe charges but before storing the result, use Stripe's API to look up the charge by key and backfill your store on recovery.",
        "**Database audit trail:** Write a payment_attempts row to your database independently of Redis. The DB is the source of truth for accounting; Redis is the fast deduplication layer.",
      ],
    },
  ],
};
